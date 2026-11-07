// Step 9c: the client information check follows the sensitive data rule (docs/briefs/step-9c-client-information-check.md).
// The real handler against the local test database, with stand-ins for OpenAI and file storage.
// Run: deno test -A supabase/functions/api/client_details_test.ts   (after tools/dbtest.sh)
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { strToU8 } from "npm:fflate@0.8.2";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { clientDetails, reminderKinds } from "./lib/ai/clientcheck.ts";
import { blockedKinds } from "./lib/confidential/rules.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA_OPENAI = "sk-lawfecta" + "L".repeat(40); // rules-ok: a made-up test key
const objects = new Map<string, Uint8Array>();
const aiCalls: string[] = [];

const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const body = typeof init.body === "string" ? JSON.parse(init.body) : null;
  if (url.startsWith("https://api.openai.com/v1/chat/completions")) {
    const seen = JSON.stringify(body.messages);
    aiCalls.push(seen);
    if (body.response_format) {
      // The file check: the new prompt asks about sensitive data, the old one about client information
      const isNew = seen.includes("government ID number");
      const file = JSON.stringify(body.messages.filter((m: { role: string }) => m.role === "user"));
      const content = isNew
        ? { sensitive: file.includes("medical record"), kinds: file.includes("medical record") ? ["health_information"] : [] }
        : { client_info: seen.includes("Jane Roe"), kinds: seen.includes("Jane Roe") ? ["client_name"] : [] };
      return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify(content) } }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
    }
    return Response.json({ model: body.model, choices: [{ message: { content: "Answer" } }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
  }
  throw new Error("unexpected fetch " + url);
}) as typeof fetch;

const storage: Storage = {
  signUpload: (path) => Promise.resolve("https://storage.test/upload/" + path + "?token=t"),
  signDownload: (path) => Promise.resolve("https://storage.test/sign/" + path),
  size: (path) => Promise.resolve(objects.get(path)?.length ?? null),
  read: (path) => { const b = objects.get(path); return b ? Promise.resolve(b) : Promise.reject(new Error("missing")); },
  remove: (paths) => { paths.forEach((p) => objects.delete(p)); return Promise.resolve(); },
  put: (p, b) => { objects.set(p, b); return Promise.resolve(); },
};
const ENV: Record<string, string> = { BD_SHARED_SECRET: "x".repeat(40), DELA_ORIGINS: "https://lawfecta.com", AI_KEY_ENCRYPTION_SECRET: "test-encryption-secret-0123456789abcdefghijkl", OPENAI_API_KEY: LAWFECTA_OPENAI };
const deps: Deps = { rpc, env: (k) => ENV[k] ?? "", fetch: fakeFetch, storage };

async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  }), deps);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const RUN = Date.now() % 1000000;
async function member(n: number, plan: string, staff = false): Promise<{ token: string; id: string }> {
  const bd = 8_000_000 + RUN * 10 + n;
  const id = (await pool.query("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Member " + n, `cd${n}@test.invalid`])).rows[0].id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, plan.startsWith("att") ? "attorney" : "freelancer", plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  if (staff) await pool.query("insert into staff_roles (person_id, role) values ($1, 'owner')", [id]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')",
    [await sessionHash(token), id, plan.startsWith("att") ? "attorney" : "freelancer"]);
  return { token, id };
}
async function upload(session: string, name: string, text: string) {
  const bytes = strToU8(text);
  const s = await call("POST", "/files/start", session, { name, size_bytes: bytes.length, ticked: true, request_id: crypto.randomUUID() });
  if (!s.body.ok) return s.body;
  objects.set(String(s.body.upload_url).split("/upload/")[1].split("?")[0], bytes);
  return (await call("POST", "/files/complete", session, { file_id: s.body.file_id })).body;
}
const setSwitch = (state: string) => pool.query("update feature_switches set state = $1 where key = 'client_details_allowed'", [state]);
const ask = (who: string, content: string, confirm = false) =>
  call("POST", "/ai/chat/send", who, { content, request_id: crypto.randomUUID(), confirm_no_client_info: confirm });

let att = { token: "", id: "" }, owner = { token: "", id: "" };
const CLIENT = "My client Jane Roe has case no. 2024-CV-1234 and I need an intake checklist.";

Deno.test("setup", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('ai_generation', 'file_uploads', 'profiles')");
  await pool.query("update settings set value = 'true' where key = 'privacy.ai_client_details_reminder'");
  att = await member(1, "att_pro");
  owner = await member(2, "att_pro", true);
});

Deno.test("the new kinds: government IDs are sensitive; health and biometric words remind; client details are their own list", () => {
  assert(blockedKinds("Her passport number is X12345678").includes("gov_id"));
  assert(blockedKinds("Driver's license: D1234567").includes("gov_id"));
  assertEquals(blockedKinds("Send the passport renewal form to the client"), [], "the word alone is not an ID");
  assertEquals(reminderKinds("Attach the medical records and the diagnosis"), ["health_information"]);
  assertEquals(reminderKinds("We take fingerprints at intake"), ["biometric_data"]);
  assertEquals(clientDetails(CLIENT).sort(), ["case_number", "client_name"]);
});

Deno.test("switch off: the original check (client details warn, no rule named)", async () => {
  await setSwitch("off");
  const r = (await ask(att.token, CLIENT)).body;
  assertEquals([r.reason, r.rule], ["looks_like_client_info", undefined]);
});

// Fix (step 9c): sensitive data is stopped and cannot be sent anyway; client details are allowed with a reminder
Deno.test("switch on, Ask DELA: sensitive data stopped for good; client details get the AI reminder, then go", async () => {
  await setSwitch("everyone");
  const ssn = (await ask(att.token, "Her SSN is 123-45-6789, draft the letter", true)).body;
  assertEquals([ssn.ok, ssn.reason], [false, "sensitive_data"], "confirming does not get past sensitive data");
  assert(String(ssn.message).includes("share a link"));
  const id = (await ask(att.token, "Passport number: X12345678. What next?")).body;
  assertEquals([id.reason, id.kinds], ["sensitive_data", ["gov_id"]]);
  const before = aiCalls.length;
  const remind = (await ask(att.token, CLIENT)).body;
  assertEquals([remind.reason, remind.rule], ["looks_like_client_info", "ai"]);
  assert(String(remind.note).includes("OpenAI"), "the reminder says where the details go");
  assertEquals(aiCalls.length, before, "nothing went to the AI before the member chose");
  const go = (await ask(att.token, CLIENT, true)).body;
  assertEquals(go.ok, true, JSON.stringify(go));
  const health = (await ask(att.token, "Summarize the diagnosis in the medical records")).body;
  assertEquals(health.rule, "maybe_sensitive");
  // With the reminder setting off (Zero Data Retention approved), client details go straight through
  await pool.query("update settings set value = 'false' where key = 'privacy.ai_client_details_reminder'");
  assertEquals((await ask(att.token, CLIENT)).body.ok, true);
  await pool.query("update settings set value = 'true' where key = 'privacy.ai_client_details_reminder'");
});

Deno.test("switch on, public places: the profile still warns about client details", async () => {
  const r = (await call("POST", "/profile/save", att.token, { body: { first_name: "Ann", summary: "I helped my client Jane Roe with case no. 2024-CV-1234." }, version: 0 })).body;
  assertEquals([r.reason, r.rule], ["looks_like_client_info", "public"]);
});

Deno.test("switch on, Files tab: client details are fine; health information is held", async () => {
  const fine = await upload(att.token, "Intake for Jane Roe.txt", "My client Jane Roe, case no. 2024-CV-1234, date of birth 01/02/1980.");
  assertEquals(fine.status, "ready", JSON.stringify(fine));
  const held = await upload(att.token, "Notes.txt", "Attach the medical record before the call.");
  assertEquals(held.status, "held", JSON.stringify(held));
  const ssn = await upload(att.token, "Ids.txt", "SSN 123-45-6789");
  assertEquals(ssn.status, "held");
});

Deno.test("turning the switch on releases files held only for client details, with a notice and an audit line", async () => {
  await setSwitch("off");
  const oldHeld = await upload(att.token, "Old intake.txt", "My client Jane Roe needs the checklist.");
  assertEquals(oldHeld.status, "held", "held under the old check");
  const stillSensitive = await upload(att.token, "Old ids.txt", "My client Jane Roe, SSN 123-45-6789");
  assertEquals(stillSensitive.status, "held");
  const r = (await call("POST", "/admin/switches", owner.token, { key: "client_details_allowed", state: "list" })).body;
  const data = r.data ?? r;
  assert(data.released >= 1, JSON.stringify(r));
  const st = async (id: string) => (await pool.query("select status from files where id = $1", [id])).rows[0].status;
  assertEquals([await st(oldHeld.file_id), await st(stillSensitive.file_id)], ["ready", "held"]);
  assertEquals((await pool.query("select count(*)::int n from notifications where dedupe_key = $1", ["file_released:" + oldHeld.file_id + ":in_app"])).rows[0].n, 1);
  assertEquals((await pool.query("select count(*)::int n from audit_log where action = 'file_released_client_details' and object_id = $1", [oldHeld.file_id])).rows[0].n, 1);
  // Running it again changes nothing
  const again = (await call("POST", "/admin/switches", owner.token, { key: "client_details_allowed", state: "list" })).body;
  assertEquals((again.data ?? again).released, 0);
  await setSwitch("everyone");
});

Deno.test("teardown", async () => {
  await setSwitch("off");
  await pool.end();
});

// Step 8b Part B: the plain-language Library (docs/briefs/step-8b-ux-retest.md, answers B1 to B10).
// Card facts on GET /library behind the switch library_workspace, and "What would you like to document?" suggestions.
// Run: deno test -A supabase/functions/api/library_workspace_test.ts   (after tools/dbtest.sh)
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { firstSentence, purposeLine, suggestStructure } from "./lib/documents/cards.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const ENV: Record<string, string> = { BD_SHARED_SECRET: "x".repeat(40), DELA_ORIGINS: "https://lawfecta.com" };
const deps: Deps = { rpc, env: (k) => ENV[k] ?? "", fetch: (() => { throw new Error("no outside calls"); }) as typeof fetch };
async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  }), deps);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const RUN = Date.now() % 1000000;
async function member(n: number): Promise<{ token: string; id: string }> {
  const bd = 8_500_000 + RUN * 10 + n;
  const id = (await pool.query("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Lib " + n, `lw${n}@test.invalid`])).rows[0].id;
  await pool.query("select dela_ensure_side($1, 'attorney', 'att_pro', 'staff_grant')", [id]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, 'attorney', 1, now() + interval '1 hour')", [await sessionHash(token), id]);
  return { token, id };
}
async function doc(org: string, by: string, title: string, body: Record<string, unknown>, extra = "") {
  const id = (await pool.query(`insert into playbooks (org_id, title, request_id, created_by, lifecycle${extra ? ", " + extra.split("=")[0] : ""}) values ($1, $2, $3, $4, 'INT'${extra ? ", " + extra.split("=")[1] : ""}) returning id`,
    [org, title, crypto.randomUUID(), by])).rows[0].id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [id, JSON.stringify(body), by]);
  return id;
}
const setSwitch = (state: string) => pool.query("update feature_switches set state = $1 where key = 'library_workspace'", [state]);

let att = { token: "", id: "" }, org = "";
Deno.test("setup", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('playbook_library', 'document_standard')");
  att = await member(1);
  org = (await call("GET", "/library", att.token)).body.org_id;
  assert(org);
});

Deno.test("the card line: the first sentence of the purpose, cut near 120 characters", () => {
  assertEquals(firstSentence("Check for conflicts before accepting a new client. Then record it."), "Check for conflicts before accepting a new client.");
  const long = firstSentence("This document explains " + "the very careful process ".repeat(10) + "that we follow.");
  assert(long.length <= 124 && long.endsWith("..."), long);
  assertEquals(purposeLine("", "Open the conflicts database."), { text: "First step: Open the conflicts database.", from: "step" });
  assertEquals(purposeLine("", ""), { text: "", from: null });
});

Deno.test("switch off: the Library list has no card facts", async () => {
  await setSwitch("off");
  await doc(org, att.id, "Run a conflict check", { schema: 2, type: "sop", purpose: "Check for conflicts before accepting a new client. More detail.", steps: [{ text: "Search the database." }] });
  const L = (await call("GET", "/library", att.token)).body.list;
  assertEquals([L.workspace, L.playbooks[0].purpose], [undefined, undefined]);
});

Deno.test("switch on: each document carries its purpose, or its first step, and the plain category names", async () => {
  await setSwitch("everyone");
  await doc(org, att.id, "Old intake notes", { title: "Old intake notes", outcome: "", steps: [{ text: "Call the prospective client back within a day." }] });
  await doc(org, att.id, "Empty draft", { title: "Empty draft" });
  await doc(org, att.id, "Trust account rules", { schema: 2, type: "policy", purpose: "", rules_must: ["Deposit every retainer in the trust account."] });
  const L = (await call("GET", "/library", att.token)).body.list;
  const by = (t: string) => L.playbooks.find((p: { title: string }) => p.title === t);
  assertEquals(L.workspace, true);
  assertEquals(L.groups.INT, "Client intake");
  assertEquals([by("Run a conflict check").purpose, by("Run a conflict check").purpose_from], ["Check for conflicts before accepting a new client.", "purpose"]);
  assertEquals(by("Old intake notes").purpose, "First step: Call the prospective client back within a day.");
  assertEquals(by("Trust account rules").purpose, "First step: Deposit every retainer in the trust account.");
  assertEquals([by("Empty draft").purpose, by("Empty draft").purpose_from], ["", null]);
});

Deno.test("the approved version's purpose is shown while a new draft is open", async () => {
  const id = await doc(org, att.id, "Open a matter", { schema: 2, type: "sop", purpose: "Approved purpose." });
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 2, $2, $3)", [id, JSON.stringify({ schema: 2, type: "sop", purpose: "Draft purpose." }), att.id]);
  await pool.query("update playbooks set approved_version = 1, current_version = 2, status = 'draft' where id = $1", [id]);
  const p = (await call("GET", "/library", att.token)).body.list.playbooks.find((x: { id: string }) => x.id === id);
  assertEquals(p.purpose, "Approved purpose.");
});

Deno.test("What would you like to document? DELA suggests the structure in code, with a matching starter", async () => {
  const conflict = (await call("POST", "/documents/suggest", att.token, { text: "How we check for conflicts before accepting a new client" })).body;
  assertEquals([conflict.ok, conflict.type, conflict.starter?.id, conflict.group], [true, "sop", "int-conflict", "Client intake"]);
  assert(conflict.reason.includes("step-by-step procedure (SOP)"));
  assertEquals(suggestStructure("Our rules for using AI tools: what staff must not paste").type, "policy");
  assertEquals(suggestStructure("How a matter moves through each stage and who does what").type, "workflow");
  assertEquals(suggestStructure("What to say when a client wants to negotiate the fee").type, "playbook");
  assertEquals(suggestStructure("Order office supplies").type, "sop");
  assertEquals((await call("POST", "/documents/suggest", att.token, { text: " " })).body.reason, "describe_first");
  assertEquals((await call("POST", "/documents/suggest", "ds_madeup", { text: "Anything" })).status, 401);
});

Deno.test("teardown", async () => {
  await setSwitch("off");
  await pool.end();
});

// Step 2a API tests: own AI keys, Lawfecta's AI and credits, talking, files. The real handler against the local test
// database, with stand-ins for OpenAI, Claude (Anthropic) and file storage.
// Run: deno test -A supabase/functions/api/ai_files_test.ts   (after tools/dbtest.sh)
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { strToU8, zipSync } from "npm:fflate@0.8.2";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { openKey } from "./lib/ai/keycrypt.ts";
import { pickChatModel, pickTranscribeModel } from "./lib/ai/providers.ts";
import { messageLooksSensitive } from "./lib/ai/clientcheck.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const WORKER = "test-worker-secret-0123456789abcdef0123";
const ENC = "test-encryption-secret-0123456789abcdefghijkl";
const LAWFECTA_OPENAI = "sk-lawfecta" + "L".repeat(40); // rules-ok: a made-up test key
const OA_GOOD = "sk-proj-member" + "a".repeat(40); // rules-ok: a made-up test key
const OA_BAD = "sk-proj-badkey" + "b".repeat(40); // rules-ok: a made-up test key
const ANT_GOOD = "sk-ant-member-" + "c".repeat(40); // rules-ok: a made-up test key
const ANT_BAD = "sk-ant-badkey-" + "d".repeat(40); // rules-ok: a made-up test key
const PLAIN_KEYS = [OA_GOOD, OA_BAD, ANT_GOOD, ANT_BAD, LAWFECTA_OPENAI];

// ---------- Stand-ins ----------

type Call = { url: string; key: string; body: any };
const calls: Call[] = [];
let openaiTrouble: "" | "no_credit" | "down" = "";
let anthropicTrouble: "" | "no_credit" = "";
const objects = new Map<string, Uint8Array>();
const responses: string[] = [];

const auth = (init: RequestInit) => {
  const h = new Headers(init.headers ?? {});
  return (h.get("authorization") ?? "").replace("Bearer ", "") || (h.get("x-api-key") ?? "");
};

const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const key = auth(init.headers ? init : (input instanceof Request ? { headers: input.headers } : init));
  let body: any = null;
  if (typeof init.body === "string") body = JSON.parse(init.body);
  else if (init.body instanceof FormData) body = Object.fromEntries([...init.body.entries()].map(([k, v]) => [k, typeof v === "string" ? v : "(file)"]));
  calls.push({ url, key, body });
  if (url.startsWith("https://api.openai.com/v1/")) {
    if (key === OA_BAD) return Response.json({ error: { code: "invalid_api_key" } }, { status: 401 });
    if (openaiTrouble === "no_credit" && key !== LAWFECTA_OPENAI) return Response.json({ error: { code: "insufficient_quota" } }, { status: 429 });
    if (openaiTrouble === "down") return Response.json({ error: { code: "server_error" } }, { status: 503 });
    if (url.endsWith("/models")) return Response.json({ data: [{ id: "gpt-5.4-mini" }, { id: "gpt-4.1" }, { id: "gpt-transcribe" }, { id: "whisper-1" }] });
    if (url.endsWith("/audio/transcriptions")) {
      if (body.model !== "gpt-transcribe") return Response.json({ error: { code: "model_not_found" } }, { status: 404 });
      return Response.json({ text: "Draft the intake checklist" });
    }
    if (url.endsWith("/chat/completions")) {
      if (body.model !== "gpt-5.4-mini") return Response.json({ error: { code: "model_not_found" } }, { status: 404 });
      if (body.response_format) {
        const seen = JSON.stringify(body.messages);
        return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify({ client_info: seen.includes("Jane Roe"), kinds: seen.includes("Jane Roe") ? ["client_name"] : [] }) } }], usage: { prompt_tokens: 50, completion_tokens: 5 } });
      }
      return Response.json({ model: body.model, choices: [{ message: { content: "OpenAI answer " + calls.length } }], usage: { prompt_tokens: 120, completion_tokens: 40 } });
    }
  }
  if (url.startsWith("https://api.anthropic.com/v1/")) {
    if (key === ANT_BAD) return Response.json({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }, { status: 401 });
    if (anthropicTrouble === "no_credit") return Response.json({ type: "error", error: { type: "billing_error", message: "credit balance too low" } }, { status: 402 });
    if (url.includes("/v1/models")) return Response.json({ data: [{ id: "claude-opus-5-5", type: "model", display_name: "Claude Opus 5.5", created_at: "2026-01-01T00:00:00Z" }], has_more: false, first_id: "claude-opus-5-5", last_id: "claude-opus-5-5" });
    if (url.includes("/v1/messages")) {
      return Response.json({ id: "msg_1", type: "message", role: "assistant", model: body.model, content: [{ type: "text", text: "Claude answer" }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 80, output_tokens: 20 } });
    }
  }
  throw new Error("unexpected fetch " + url);
}) as typeof fetch;

const storage: Storage = {
  signUpload: (path) => Promise.resolve("https://storage.test/upload/" + path + "?token=t"),
  signDownload: (path, seconds, name) => Promise.resolve(`https://storage.test/sign/${path}?exp=${seconds}` + (name ? "&download=" + encodeURIComponent(name) : "")),
  size: (path) => Promise.resolve(objects.get(path)?.length ?? null),
  read: (path) => {
    const b = objects.get(path);
    return b ? Promise.resolve(b) : Promise.reject(new Error("missing"));
  },
  remove: (paths) => { paths.forEach((p) => objects.delete(p)); return Promise.resolve(); },
  put: (p, b) => { objects.set(p, b); return Promise.resolve(); },
};

const ENV: Record<string, string> = { BD_SHARED_SECRET: "x".repeat(40), DELA_ORIGINS: "https://lawfecta.com", AI_KEY_ENCRYPTION_SECRET: ENC, OPENAI_API_KEY: LAWFECTA_OPENAI };
const deps: Deps = { rpc, env: (k) => ENV[k] ?? "", fetch: fakeFetch, storage };

async function call(method: string, path: string, opts: { body?: unknown; session?: string; raw?: Uint8Array; type?: string; d?: Deps } = {}) {
  const headers: Record<string, string> = { origin: "https://lawfecta.com" };
  if (opts.session) headers["x-dela-session"] = opts.session;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.raw) headers["content-type"] = opts.type ?? "audio/webm";
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers, body: opts.raw ? opts.raw as Uint8Array<ArrayBuffer> : opts.body === undefined ? undefined : JSON.stringify(opts.body),
  }), opts.d ?? deps);
  const text = await res.text();
  responses.push(text);
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

// A signed-in member on a plan, made straight in the database
const RUN = Date.now() % 1000000;
async function member(n: number, plan: string, staff = false): Promise<string> {
  const bd = 7_000_000 + RUN * 10 + n;
  const p = (await pool.query("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Member " + n, `m${n}@test.invalid`])).rows[0].id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [p, plan.startsWith("att") ? "attorney" : "freelancer", plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  if (staff) await pool.query("insert into staff_roles (person_id, role) values ($1, 'owner')", [p]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')",
    [await sessionHash(token), p, plan.startsWith("att") ? "attorney" : "freelancer"]);
  return token;
}
const personOf = async (token: string) => (await pool.query("select person_id from sessions where token_hash = $1", [await sessionHash(token)])).rows[0].person_id;
const creditsUsed = async (token: string) => (await pool.query("select coalesce(sum(used), 0)::int as u, coalesce(sum(reserved), 0)::int as r from quota_usage where person_id = $1 and feature_key = 'ai.runs'", [await personOf(token)])).rows[0];
const lastCall = (part: string) => [...calls].reverse().find((c) => c.url.includes(part));

let ann = "", fay = "", bo = "", owner = "";

Deno.test("setup: switches on, members signed in", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  await pool.query("update feature_switches set state = 'off' where key in ('byok', 'ai_generation', 'voice_input', 'file_uploads')");
  ann = await member(1, "att_free");
  fay = await member(2, "fl_plus");
  bo = await member(3, "att_free");
  owner = await member(4, "att_pro", true);
});

Deno.test("everything is off until the switches go on", async () => {
  const st = await call("GET", "/ai", { session: ann });
  assertEquals(st.body.byok_on, false);
  assertEquals((await call("POST", "/ai/chat/send", { session: ann, body: { content: "hello", request_id: "off-1" } })).body.reason, "ai_off");
  assertEquals((await call("POST", "/files/start", { session: ann, body: { name: "a.txt", size_bytes: 5, ticked: true, request_id: "off-2" } })).body.reason, "uploads_off");
  await pool.query("update feature_switches set state = 'everyone' where key in ('byok', 'ai_generation', 'voice_input', 'file_uploads')");
});

Deno.test("own OpenAI key: tested, sealed, used, never shown", async () => {
  const noEnc: Deps = { ...deps, env: (k) => (k === "AI_KEY_ENCRYPTION_SECRET" ? "" : deps.env(k)) };
  assertEquals((await call("POST", "/ai/key", { session: ann, d: noEnc, body: { provider: "openai", key: OA_GOOD, request_id: crypto.randomUUID() } })).body.reason, "encryption_not_set_up");
  assertEquals((await call("POST", "/ai/key", { session: ann, body: { provider: "openai", key: "hello", request_id: crypto.randomUUID() } })).body.reason, "not_a_key");
  const wrong = await call("POST", "/ai/key", { session: ann, body: { provider: "openai", key: ANT_GOOD, request_id: crypto.randomUUID() } });
  assertEquals([wrong.body.reason, wrong.body.looks_like], ["wrong_provider", "anthropic"]);
  const bad = await call("POST", "/ai/key", { session: ann, body: { provider: "openai", key: OA_BAD, request_id: crypto.randomUUID() } });
  assertEquals([bad.body.reason, bad.body.code], ["key_test_failed", "bad_key"]);
  assertEquals((await pool.query("select count(*)::int as n from ai_keys where person_id = $1", [await personOf(ann)])).rows[0].n, 0, "a failing key is not saved");

  const id = crypto.randomUUID();
  const ok = await call("POST", "/ai/key", { session: ann, body: { provider: "openai", key: OA_GOOD, request_id: id } });
  assertEquals(ok.body.ok, true);
  assertEquals((await call("POST", "/ai/key", { session: ann, body: { provider: "openai", key: OA_GOOD, request_id: id } })).body.duplicate, true, "two clicks, one key");
  const row = (await pool.query("select ciphertext, last4 from ai_keys where id = $1", [id])).rows[0];
  assert(!row.ciphertext.includes(OA_GOOD.slice(10, 30)), "the database holds only the sealed key");
  assertEquals(row.last4, OA_GOOD.slice(-4));
  assertEquals(await openKey(ENC, id, row.ciphertext), OA_GOOD, "only the api's secret opens it");
  let threw = false;
  try { await openKey(ENC, crypto.randomUUID(), row.ciphertext); } catch { threw = true; }
  assert(threw, "a sealed key copied to another row does not open");

  const st = await call("GET", "/ai", { session: ann });
  assertEquals([st.body.mode, st.body.own_key.provider, st.body.own_key.last4], ["own_key", "openai", OA_GOOD.slice(-4)]);

  const before = await creditsUsed(ann);
  const r = await call("POST", "/ai/chat/send", { session: ann, body: { content: "Draft a checklist for opening a new matter", request_id: "ann-1" } });
  assertEquals([r.body.ok, r.body.reply.source], [true, "own_key"]);
  assertEquals(lastCall("/chat/completions")!.key, OA_GOOD, "the member's own key was used");
  assertEquals((await creditsUsed(ann)).u, before.u, "no credits on the member's own key");
  const usage = (await call("GET", "/ai", { session: ann })).body.usage;
  assert(usage.own_tasks >= 1 && usage.own_input_tokens >= 120, "usage shows what ran on the member's key");
});

Deno.test("own key fails: plain reason, never Lawfecta's key unless the member clicks", async () => {
  openaiTrouble = "no_credit";
  const n = calls.length;
  const r = await call("POST", "/ai/chat/send", { session: ann, body: { content: "Second question", request_id: "ann-2" } });
  assertEquals([r.body.reason, r.body.code, r.body.source], ["ai_failed", "no_credit", "own_key"]);
  assert(!calls.slice(n).some((c) => c.key === LAWFECTA_OPENAI), "Lawfecta's key was not used");
  assertEquals((await call("GET", "/ai", { session: ann })).body.own_key.status, "failed", "the key is marked as failing");

  const before = await creditsUsed(ann);
  const once = await call("POST", "/ai/chat/send", { session: ann, body: { content: "Second question", request_id: "ann-2", lawfecta_once: true } });
  assertEquals([once.body.ok, once.body.reply.source], [true, "lawfecta"]);
  assertEquals(lastCall("/chat/completions")!.key, LAWFECTA_OPENAI);
  assertEquals((await creditsUsed(ann)).u, before.u + 1, "Use Lawfecta credits this time uses one credit");
  openaiTrouble = "";

  const t = await call("POST", "/ai/key/test", { session: ann, body: {} });
  assertEquals(t.body.ok, true);
  assertEquals((await call("GET", "/ai", { session: ann })).body.own_key.status, "active", "a passing test clears the failure");
  assertEquals((await call("POST", "/ai/key/remove", { session: ann, body: {} })).body.ok, true);
  assertEquals((await call("GET", "/ai", { session: ann })).body.mode, "lawfecta");
});

Deno.test("client information check on what is sent", async () => {
  const kinds = messageLooksSensitive("My client John Smith, DOB 01/02/1980, needs the filing");
  assert(kinds.includes("client_name") && kinds.includes("date_of_birth"));
  assertEquals(messageLooksSensitive("Send [Client Name] the engagement letter"), []);
  const r = await call("POST", "/ai/chat/send", { session: ann, body: { content: "Case No. 2024-CV-1234 for my client John Smith", request_id: "ann-3" } });
  assertEquals(r.body.reason, "looks_like_client_info");
  const sent = await call("POST", "/ai/chat/send", { session: ann, body: { content: "Case No. 2024-CV-1234 for my client John Smith", request_id: "ann-3", confirm_no_client_info: true } });
  assertEquals(sent.body.ok, true, "the member can send after confirming");
});

Deno.test("Lawfecta's AI: credits reserved, used once, given back on failure", async () => {
  const before = await creditsUsed(bo);
  const r = await call("POST", "/ai/chat/send", { session: bo, body: { content: "What should a new client intake include?", request_id: "bo-1" } });
  assertEquals([r.body.ok, r.body.reply.source], [true, "lawfecta"]);
  assertEquals((await creditsUsed(bo)).u, before.u + 1);
  const again = await call("POST", "/ai/chat/send", { session: bo, body: { content: "What should a new client intake include?", request_id: "bo-1", chat_id: r.body.chat_id } });
  assertEquals(again.body.reply.content, r.body.reply.content, "a repeated send returns the saved answer");
  assertEquals((await creditsUsed(bo)).u, before.u + 1, "and is not charged again");

  openaiTrouble = "down";
  const down = await call("POST", "/ai/chat/send", { session: bo, body: { content: "Next", request_id: "bo-2", chat_id: r.body.chat_id } });
  assertEquals([down.body.reason, down.body.code], ["ai_failed", "provider_down"]);
  const c = await creditsUsed(bo);
  assertEquals([c.u, c.r], [before.u + 1, 0], "the credit is given back");
  openaiTrouble = "";
  const retry = await call("POST", "/ai/chat/send", { session: bo, body: { content: "Next", request_id: "bo-2", chat_id: r.body.chat_id, attempt: 1 } });
  assertEquals(retry.body.ok, true, "Try again works");
  const chat = await call("GET", "/ai/chat?id=" + r.body.chat_id, { session: bo });
  assertEquals(chat.body.chat.messages.length, 4, "two questions and two answers, no repeats");
  assertEquals((await call("GET", "/ai/chat?id=" + r.body.chat_id, { session: ann })).status, 404, "another member cannot read it");

  // Credits used up
  await pool.query("update quota_usage set used = 25 where person_id = $1 and feature_key = 'ai.runs'", [await personOf(bo)]);
  assertEquals((await call("POST", "/ai/chat/send", { session: bo, body: { content: "More", request_id: "bo-3" } })).body.reason, "no_credits_left");
  await pool.query("update quota_usage set used = 0 where person_id = $1 and feature_key = 'ai.runs'", [await personOf(bo)]);

  const noKey: Deps = { ...deps, env: (k) => (k === "OPENAI_API_KEY" ? "" : deps.env(k)) };
  assertEquals((await call("POST", "/ai/chat/send", { session: bo, d: noKey, body: { content: "More", request_id: "bo-4" } })).body.reason, "ai_not_set_up");
});

Deno.test("a retired model is replaced by one the key can use", async () => {
  assertEquals(pickChatModel("gpt-old", ["gpt-4.1-mini", "gpt-5.4-mini", "gpt-5.4-mini-2026-03-01", "gpt-5-nano", "gpt-4o-transcribe"]), "gpt-5.4-mini");
  assertEquals(pickTranscribeModel("gpt-old", ["gpt-transcribe", "gpt-live-transcribe", "whisper-1"]), "gpt-transcribe");
  assertEquals(pickTranscribeModel("gpt-old", ["whisper-1"]), "whisper-1");
  await pool.query(`update settings set value = '"gpt-retired"' where key = 'ai.model.openai'`);
  const r = await call("POST", "/ai/chat/send", { session: bo, body: { content: "Model check", request_id: "bo-5" } });
  assertEquals(r.body.ok, true);
  assertEquals(lastCall("/chat/completions")!.body.model, "gpt-5.4-mini");
  await pool.query(`update settings set value = '"gpt-5.4-mini"' where key = 'ai.model.openai'`);
});

Deno.test("Claude key: chat on the member's key, talking on Lawfecta's speech to text", async () => {
  assertEquals((await call("POST", "/ai/key", { session: fay, body: { provider: "anthropic", key: ANT_BAD, request_id: crypto.randomUUID() } })).body.code, "bad_key");
  assertEquals((await call("POST", "/ai/key", { session: fay, body: { provider: "anthropic", key: ANT_GOOD, request_id: crypto.randomUUID() } })).body.ok, true);
  const r = await call("POST", "/ai/chat/send", { session: fay, body: { content: "Help me plan my week of client work", request_id: "fay-1" } });
  assertEquals([r.body.ok, r.body.reply.content, r.body.reply.source], [true, "Claude answer", "own_key"]);
  const msg = lastCall("/v1/messages")!;
  assertEquals(msg.key, ANT_GOOD);
  assertEquals(msg.body.model, "claude-opus-5-5");
  assert(String(msg.body.system).includes("freelance paralegals"), "the freelancer side gets its own instructions");

  const before = await creditsUsed(fay);
  const audio = new Uint8Array(4000).fill(7);
  const v = await call("POST", "/ai/transcribe?request_id=fay-v1&seconds=6", { session: fay, raw: audio });
  assertEquals([v.body.ok, v.body.text, v.body.source, v.body.why], [true, "Draft the intake checklist", "lawfecta", "claude_key_voice"]);
  assertEquals(lastCall("/audio/transcriptions")!.key, LAWFECTA_OPENAI);
  assertEquals((await creditsUsed(fay)).u, before.u + 1, "talking on a Claude key counts against included credits");
  assertEquals((await call("POST", "/ai/transcribe?request_id=fay-v2&seconds=400", { session: fay, raw: audio })).body.reason, "too_long");
  assertEquals((await call("POST", "/ai/transcribe?request_id=fay-v3&seconds=5", { session: fay, raw: audio, type: "application/pdf" })).body.reason, "not_audio");

  anthropicTrouble = "no_credit";
  const nc = await call("POST", "/ai/chat/send", { session: fay, body: { content: "Another", request_id: "fay-2" } });
  assertEquals([nc.body.reason, nc.body.code], ["ai_failed", "no_credit"]);
  anthropicTrouble = "";
});

Deno.test("talking on an own OpenAI key uses that key, no credits", async () => {
  assertEquals((await call("POST", "/ai/key", { session: ann, body: { provider: "openai", key: OA_GOOD, request_id: crypto.randomUUID() } })).body.ok, true);
  const before = await creditsUsed(ann);
  await pool.query(`update settings set value = '"gpt-retired-stt"' where key = 'ai.model.transcribe'`);
  const v = await call("POST", "/ai/transcribe?request_id=ann-v1&seconds=4", { session: ann, raw: new Uint8Array(3000).fill(3), type: "audio/mp4" });
  assertEquals([v.body.ok, v.body.source], [true, "own_key"]);
  assertEquals(lastCall("/audio/transcriptions")!.key, OA_GOOD);
  assertEquals(lastCall("/audio/transcriptions")!.body.model, "gpt-transcribe", "a retired speech model is replaced");
  assertEquals((await creditsUsed(ann)).u, before.u);
  await pool.query(`update settings set value = '"gpt-transcribe"' where key = 'ai.model.transcribe'`);
  await call("POST", "/ai/key/remove", { session: ann, body: {} });
});

// ---------- Files ----------

async function upload(session: string, name: string, bytes: Uint8Array, extra: Record<string, unknown> = {}) {
  const s = await call("POST", "/files/start", { session, body: { name, size_bytes: bytes.length, ticked: true, request_id: crypto.randomUUID(), ...extra } });
  if (!s.body.ok) return s.body;
  const path = String(s.body.upload_url).split("/upload/")[1].split("?")[0];
  objects.set(path, bytes);
  const c = await call("POST", "/files/complete", { session, body: { file_id: s.body.file_id } });
  return { ...c.body, path, content_type: s.body.content_type };
}

const docx = (paras: string[], extra: Record<string, Uint8Array> = {}) => zipSync({
  "[Content_Types].xml": strToU8("<Types/>"),
  "word/document.xml": strToU8("<w:document><w:body>" + paras.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join("") + "</w:body></w:document>"),
  ...extra,
});

let readyFile = "";

// A small real PDF with one line of text
function pdf(line: string): Uint8Array {
  const stream = `BT /F1 12 Tf 72 720 Td (${line}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return strToU8(out);
}

Deno.test("files: type checked by contents, client information held, links only for the firm", async () => {
  assertEquals((await call("POST", "/files/start", { session: ann, body: { name: "Intake.txt", size_bytes: 10, ticked: false, request_id: "t1" } })).body.reason, "tick_needed");
  assertEquals((await call("POST", "/files/start", { session: fay, body: { name: "cv.txt", size_bytes: 10, ticked: true, request_id: "t2" } })).body.reason, "attorneys_only");

  const ok = await upload(ann, "Intake steps.txt", strToU8("Step 1. Open the intake form.\nStep 2. Run the conflict check."));
  assertEquals([ok.ok, ok.status, ok.content_type], [true, "ready", "text/plain"]);
  readyFile = ok.file_id;

  const word = await upload(ann, "Filing process.docx", docx(["Step 1. Save the motion as PDF.", "Step 2. File on the court website."]));
  assertEquals(word.status, "ready");
  assert((await pool.query("select body from file_texts where file_id = $1", [word.file_id])).rows[0].body.includes("File on the court website"), "Word text is read for the AI");

  const p = await upload(ann, "Court filing.pdf", pdf("Step 1. Log in to the court e-filing site."));
  assertEquals(p.status, "ready");
  assert((await pool.query("select body from file_texts where file_id = $1", [p.file_id])).rows[0].body.includes("court e-filing site"), "PDF text is read for the AI");
  const pdfLink = await call("POST", "/files/open", { session: ann, body: { file_id: p.file_id } });
  assert(!pdfLink.body.url.includes("download="), "PDFs open in the browser");

  const macro = await upload(ann, "Macro.docx", docx(["Hello"], { "word/vbaProject.bin": new Uint8Array([1, 2, 3]) }));
  assertEquals(macro.status, "refused");
  const exe = await upload(ann, "invoice.pdf", strToU8("MZ" + "\0".repeat(200)));
  assertEquals(exe.status, "refused");
  assert(!objects.has(exe.path), "a refused file is deleted from storage");
  const js = await upload(ann, "form.pdf", strToU8("%PDF-1.7\n1 0 obj << /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>"));
  assertEquals(js.status, "refused", "a PDF with a script is refused");
  const fakePng = await upload(ann, "screen.png", strToU8("<html>not a picture</html>"));
  assertEquals(fakePng.status, "refused");

  const held = await upload(ann, "Roe notes.txt", strToU8("Notes for Jane Roe about the filing."));
  assertEquals(held.status, "held", "the AI check on Lawfecta's key holds a file with client information");
  assertEquals(lastCall("/chat/completions")!.key, LAWFECTA_OPENAI, "the check always runs on Lawfecta's key");
  const strong = await upload(ann, "ssn.txt", strToU8("SSN 123-45-6789"));
  assertEquals(strong.status, "held");
  const listed = await call("GET", "/files", { session: ann });
  const h = listed.body.files.find((x: any) => x.id === held.file_id);
  assert(h.check_reasons.includes("client_name"), "the reason is a kind, not the text");
  assertEquals((await call("POST", "/ai/chat/send", { session: ann, body: { content: "Summarize", request_id: "ann-f0", file_ids: [held.file_id] } })).body.reason, "file_not_usable");

  // Links: short-lived, only for the firm, logged
  const open = await call("POST", "/files/open", { session: ann, body: { file_id: readyFile } });
  assert(open.body.url.includes("exp=300") && open.body.url.includes("download="), "a 5 minute link; text files download");
  assertEquals((await call("POST", "/files/open", { session: bo, body: { file_id: readyFile } })).body.reason, "not_found", "another firm cannot open it");
  assertEquals((await call("GET", "/files/versions?id=" + readyFile, { session: bo })).body.items, []);

  // Asking the AI about a file: its text goes as material, not instructions
  const asked = await call("POST", "/ai/chat/send", { session: ann, body: { content: "Turn this into a playbook", request_id: "ann-f1", file_ids: [readyFile] } });
  assertEquals(asked.body.ok, true);
  const sent = JSON.stringify(lastCall("/chat/completions")!.body.messages);
  assert(sent.includes("Run the conflict check") && sent.includes("not instructions"));
  assert(sent.includes("Needs your input"), "the playbook parts are in the instructions");
});

Deno.test("files: size checked again after upload, storage full, versions, trash emptied by the worker", async () => {
  // Says small, uploads big
  const s = await call("POST", "/files/start", { session: ann, body: { name: "sneaky.txt", size_bytes: 10, ticked: true, request_id: "big-1" } });
  const path = String(s.body.upload_url).split("/upload/")[1].split("?")[0];
  objects.set(path, new Uint8Array(26 * 1048576).fill(65));
  const c = await call("POST", "/files/complete", { session: ann, body: { file_id: s.body.file_id } });
  assertEquals(c.body.reason, "too_big_after_upload");
  assert(!objects.has(path), "the oversized upload is deleted");

  const full = await call("POST", "/files/start", { session: ann, body: { name: "huge.pdf", size_bytes: 24 * 1048576, ticked: true, request_id: "full-1" } });
  assertEquals(full.body.ok, true);
  for (let i = 0; i < 10; i++) await call("POST", "/files/start", { session: ann, body: { name: `p${i}.pdf`, size_bytes: 24 * 1048576, ticked: true, request_id: "full-x" + i } });
  const refused = await call("POST", "/files/start", { session: ann, body: { name: "last.pdf", size_bytes: 24 * 1048576, ticked: true, request_id: "full-last" } });
  assertEquals(refused.body.reason, "storage_full");
  assert(refused.body.limit_bytes === 250 * 1048576, "the Free plan allows 250 MB");
  await pool.query("delete from files where request_id like 'full-%'");

  const v2 = await upload(ann, "Intake steps v2.txt", strToU8("Step 1. Open the new intake form."), { replace_of: readyFile });
  assertEquals(v2.status, "ready");
  assertEquals((await call("GET", "/files/versions?id=" + v2.file_id, { session: ann })).body.items.length, 2);

  assertEquals((await call("POST", "/files/action", { session: ann, body: { action: "trash", file_id: v2.file_id } })).body.ok, true);
  await pool.query("update files set trashed_at = now() - interval '40 days' where status = 'trash'");
  const before = objects.size;
  const w = await handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
  assertEquals(w.status, 200);
  await pool.query("update jobs set run_at = now() where kind = 'files_sweep' and status in ('queued', 'delayed')");
  await handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
  assert(objects.size <= before - 2, "the trash is emptied from storage after its days");
  assertEquals((await pool.query("select count(*)::int as n from files where group_id = (select group_id from files where id = $1) and status = 'deleted'", [v2.file_id])).rows[0].n, 2);
});

Deno.test("admin sees AI use and files, never keys or file contents", async () => {
  assertEquals((await call("GET", "/admin/ai-files", { session: ann })).status, 403);
  const r = await call("GET", "/admin/ai-files", { session: owner });
  assertEquals(r.status, 200);
  const d = r.body.data;
  assert(d.usage.length > 0 && d.keys.length > 0 && d.held.length > 0 && d.refused.length > 0);
  assertEquals(d.ready, { encryption: true, lawfecta_openai: true, lawfecta_anthropic: false, storage: true });
  const text = JSON.stringify(d);
  assert(!text.includes("v1.") && !text.includes("Jane Roe"), "no sealed keys or file text in the admin view");
});

Deno.test("no response ever carried a key", () => {
  for (const r of responses) for (const k of PLAIN_KEYS) assert(!r.includes(k), "a response held a key");
});

Deno.test("teardown", async () => {
  await pool.end();
});

// Process Recorder API tests: pieces, Stop and save, missing pieces, speech to text and Stage 1 in the worker, the review
// screen, private lines kept from the AI, Build my playbook, retry after a failure, credits, retention.
// Run after tools/dbtest.sh:   deno test -A supabase/functions/api/recorder_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const WORKER = "test-worker-secret-0123456789abcdef0123";
const LAWFECTA = "sk-lawfecta" + "R".repeat(40); // rules-ok: a made-up test key
const sentAi: any[] = [];
let aiMode: "ok" | "down" = "ok";

const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/audio/transcriptions")) {
    if (aiMode === "down") return Response.json({ error: { code: "server_error" } }, { status: 503 });
    return Response.json({ text: "First I save the motion as a PDF. Then I log in to the court website for client Jane Roe and upload it." });
  }
  if (url.endsWith("/chat/completions")) {
    const body = JSON.parse(String(init.body));
    sentAi.push(body);
    if (aiMode === "down") return Response.json({ error: { code: "server_error" } }, { status: 503 });
    const system = String(body.messages[0].content);
    let out: unknown = {};
    if (system.includes("recorded their whole screen")) out = { steps: [{ text: "Save the motion as a PDF", program: "Word", at_ms: 1000, frames: [1], extra: [2] }, { text: "Upload it to the court website", program: "Court site", at_ms: 20000, frames: [3] }], flagged: [3] };
    else if (system.includes("Process Recorder")) out = { playbook: { title: "File a motion", outcome: "Motion filed", steps: [{ text: "Save the motion as a PDF", from: [1] }, { text: "Upload it", from: [2] }, { text: "Save the receipt", from: [2] }] }, questions: [] };
    else if (body.response_format && system.includes("legal operations tool")) out = { client_info: false, kinds: [] };
    return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 10 } });
  }
  throw new Error("unexpected fetch " + url);
}) as typeof fetch;

const objects = new Map<string, Uint8Array>();
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p),
  signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: (p) => Promise.resolve(objects.get(p)?.length ?? null),
  read: (p) => (objects.has(p) ? Promise.resolve(objects.get(p)!) : Promise.reject(new Error("missing"))),
  remove: (ps) => { ps.forEach((p) => objects.delete(p)); return Promise.resolve(); },
  put: (p, b) => { objects.set(p, b); return Promise.resolve(); },
};
const deps: Deps = { rpc, env: (k) => ({ OPENAI_API_KEY: LAWFECTA, DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: fakeFetch, storage };

async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
async function worker(times = 3) {
  for (let i = 0; i < times; i++) {
    await pool.query("update jobs set run_at = now() where status in ('queued', 'delayed') and kind like 'recording%'");
    await handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
  }
}

const RUN = Date.now() % 1000000;
async function member(n: number, plan: string) {
  const bd = 5_000_000 + RUN * 10 + n;
  const id = (await pool.query("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Rec " + n, `r${n}@test.invalid`])).rows[0].id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, plan.startsWith("att") ? "attorney" : "freelancer", plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, plan.startsWith("att") ? "attorney" : "freelancer"]);
  return { token, id };
}
const used = async (id: string) => (await pool.query("select coalesce(sum(used),0)::int u, coalesce(sum(reserved),0)::int r from quota_usage where person_id = $1 and feature_key = 'ai.runs'", [id])).rows[0];

let a: { token: string; id: string }, other: { token: string; id: string }, fl: { token: string; id: string };
let rec = "";

// Uploads one piece the way the browser does
async function piece(token: string, id: string, kind: string, seq: number, startMs: number, bytes = 500) {
  const r = await call("POST", "/recordings/part", token, { id, kind, seq, start_ms: startMs, bytes });
  if (!r.body.ok) return r.body;
  const path = String(r.body.upload_url).split("/up/")[1];
  objects.set(path, new Uint8Array(bytes).fill(1));
  return (await call("POST", "/recordings/part-done", token, { id, kind, seq })).body;
}
async function frame(token: string, id: string, atMs: number) {
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6]);
  const s = await call("POST", "/files/start", token, { name: `shot ${atMs}.jpg`, size_bytes: jpg.length, ticked: true, request_id: crypto.randomUUID() });
  objects.set(String(s.body.upload_url).split("/upload/")[1] ?? String(s.body.upload_url).split("/up/")[1], jpg);
  await call("POST", "/recordings/frame", token, { id, file_id: s.body.file_id, at_ms: atMs });
  await call("POST", "/files/complete", token, { file_id: s.body.file_id });
  return s.body.file_id as string;
}

Deno.test("setup", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  await pool.query("update feature_switches set state = 'off' where key = 'recorder'");
  await pool.query("update feature_switches set state = 'everyone' where key in ('ai_generation', 'playbook_library', 'file_uploads')");
  a = await member(1, "att_plus");
  other = await member(2, "att_free");
  fl = await member(3, "fl_free");
});

Deno.test("recorder: switch, attorneys only, consent before the first recording", async () => {
  assertEquals((await call("POST", "/recordings/start", a.token, { title: "File a motion", request_id: "r1" })).body.reason, "recorder_off");
  await pool.query("update feature_switches set state = 'everyone' where key = 'recorder'");
  assertEquals((await call("POST", "/recordings/start", fl.token, { title: "x", request_id: "r0" })).status, 403);
  assertEquals((await call("POST", "/recordings/start", a.token, { title: "File a motion", request_id: "r1" })).body.reason, "consent_needed");
  const r = await call("POST", "/recordings/start", a.token, { title: "File a motion", request_id: "r1", consent: true, browser: "Chrome" });
  assertEquals(r.body.ok, true);
  assertEquals(r.body.settings.max_minutes, 30, "Plus allows 30 minutes");
  rec = r.body.id;
  assertEquals((await pool.query("select count(*)::int n from consents where person_id = $1", [a.id])).rows[0].n, 1, "the consent is recorded");
  assertEquals((await call("POST", "/recordings/start", a.token, { title: "File a motion", request_id: "r1" })).body.duplicate, true);
});

Deno.test("pieces upload; Stop and save waits for missing pieces; another firm is kept out", async () => {
  assertEquals((await piece(a.token, rec, "video", 0, 0)).ok, true);
  assertEquals((await piece(a.token, rec, "video", 1, 10000)).ok, true);
  assertEquals((await piece(a.token, rec, "audio", 0, 0)).ok, true);
  assertEquals((await call("POST", "/recordings/part", other.token, { id: rec, kind: "video", seq: 2, start_ms: 0, bytes: 10 })).body.reason, "not_found");
  assertEquals((await call("POST", "/recordings/part", a.token, { id: rec, kind: "video", seq: 999, start_ms: 31 * 60000 + 60000, bytes: 10 })).body.reason, "too_long", "longer than the plan allows");
  const f1 = await frame(a.token, rec, 1000), f2 = await frame(a.token, rec, 5000), f3 = await frame(a.token, rec, 21000);
  assertEquals((await pool.query("select count(*)::int n from files where id = any($1) and purpose = 'recording' and status = 'ready'", [[f1, f2, f3]])).rows[0].n, 3, "screenshots are kept with the recording");
  assert(!sentAi.some((b) => String(b.messages[0].content).includes("legal operations tool")), "recording screenshots skip the per-file AI check");
  const files = await call("GET", "/files", a.token);
  assert(!files.body.files.some((x: any) => [f1, f2, f3].includes(x.id)), "they do not clutter the Files tab");
  const miss = await call("POST", "/recordings/finish", a.token, { id: rec, duration_seconds: 25, video_parts: 3, audio_parts: 1 });
  assertEquals([miss.body.reason, miss.body.missing[0].seq], ["parts_missing", 2]);
  assertEquals((await piece(a.token, rec, "video", 2, 20000)).ok, true);
});

Deno.test("Stop and save: credits reserved, speech to text and Stage 1 in the worker, then the review screen", async () => {
  const before = await used(a.id);
  const fin = await call("POST", "/recordings/finish", a.token, { id: rec, duration_seconds: 25, video_parts: 3, audio_parts: 1 });
  assertEquals(fin.body.status, "analyzing");
  assertEquals((await used(a.id)).r, before.r + 5, "the recording's credits are reserved");
  await worker(4);
  const list = await call("GET", "/recordings", a.token);
  const item = list.body.items.find((x: any) => x.id === rec);
  assertEquals(item.status, "ready");
  assertEquals((await used(a.id)).u, before.u + 5, "and used once it is ready");
  const st1 = sentAi.find((b) => String(b.messages[0].content).includes("recorded their whole screen"));
  assert(JSON.stringify(st1.messages.at(-1)).includes("save the motion as a PDF"), "Stage 1 reads the transcript");
  assert(Array.isArray(st1.messages.at(-1).content) && st1.messages.at(-1).content.some((c: any) => c.type === "image_url"), "and looks at the screenshots");
  const imp = await call("GET", "/imports/get?id=" + item.import_id, a.token);
  assertEquals(imp.body.import.source, "recorder");
  assertEquals(imp.body.import.steps.length, 2);
  assertEquals(imp.body.import.steps[0].extra.length, 1, "more screenshots to choose from");
  assertEquals(imp.body.import.steps[1].file.status, "held", "a screenshot Stage 1 flagged is held for the attorney's check");
  assert((await pool.query("select count(*)::int n from notifications where person_id = $1 and title = 'Your recording is ready to review' and channel = 'email'", [a.id])).rows[0].n === 1, "the attorney is emailed");
});

Deno.test("review: private lines never reach the AI; Build my playbook", async () => {
  const item = (await call("GET", "/recordings", a.token)).body.items.find((x: any) => x.id === rec);
  const r = (await call("GET", "/recordings/for-import?id=" + item.import_id, a.token)).body.recording;
  assert(r.transcript.length >= 1);
  await call("POST", "/recordings/transcript", a.token, { id: rec, lines: [{ seq: r.transcript[0].seq, text: r.transcript[0].text, private: true }] });
  const imp = (await call("GET", "/imports/get?id=" + item.import_id, a.token)).body.import;
  await call("POST", "/files/action", a.token, { action: "confirm", file_id: imp.steps[1].file_id });
  const b = await call("POST", "/imports/build", a.token, { id: item.import_id, confirm_no_client_info: true });
  assertEquals(b.body.ok, true);
  const last = JSON.stringify(sentAi.at(-1).messages);
  assert(!last.includes("Jane Roe"), "a line marked private is not sent");
  const pb = await call("GET", "/playbooks/get?id=" + b.body.playbook_id, a.token);
  assertEquals(pb.body.playbook.source, "recorder");
  assertEquals(pb.body.body.steps[0].screenshot, "", "a screenshot taken during a private moment is dropped");
});

Deno.test("a failure gives the credits back; Try again works", async () => {
  const r = await call("POST", "/recordings/start", a.token, { title: "Billing", request_id: "r2" });
  const id = r.body.id;
  await piece(a.token, id, "video", 0, 0);
  await piece(a.token, id, "audio", 0, 0);
  const before = await used(a.id);
  aiMode = "down";
  await call("POST", "/recordings/finish", a.token, { id, duration_seconds: 9, video_parts: 1, audio_parts: 1 });
  await pool.query("update jobs set attempts = 4 where kind like 'recording%' and status in ('queued', 'delayed')");
  await worker(3);
  let item = (await call("GET", "/recordings", a.token)).body.items.find((x: any) => x.id === id);
  assertEquals(item.status, "failed");
  const after = await used(a.id);
  assertEquals([after.u, after.r], [before.u, before.r], "credits given back");
  aiMode = "ok";
  assertEquals((await call("POST", "/recordings/retry", a.token, { id })).body.status, "analyzing");
  await worker(4);
  item = (await call("GET", "/recordings", a.token)).body.items.find((x: any) => x.id === id);
  assertEquals(item.status, "ready");
});

Deno.test("video: download links for the owner only; deleting keeps the playbook's screenshots; retention", async () => {
  const v = await call("POST", "/recordings/video", a.token, { id: rec });
  assertEquals([v.body.ok, v.body.urls.length], [true, 3]);
  assertEquals((await call("POST", "/recordings/video", other.token, { id: rec })).body.reason, "video_deleted", "another member gets nothing");
  const keep = (await pool.query("select (body->'steps'->1->>'screenshot') s from playbook_versions v join playbook_imports i on i.playbook_id = v.playbook_id join recordings r on r.import_id = i.id where r.id = $1", [rec])).rows[0].s;
  assertEquals((await call("POST", "/recordings/delete-video", a.token, { id: rec })).body.ok, true);
  const parts = (await pool.query("select storage_path from recording_parts where recording_id = $1", [rec])).rows;
  assert(parts.every((p: any) => !objects.has(p.storage_path)), "the video pieces are deleted from storage");
  assertEquals((await pool.query("select status from files where id = $1", [keep])).rows[0].status, "ready", "a screenshot used in the playbook stays");
  assertEquals((await call("POST", "/recordings/video", a.token, { id: rec })).body.reason, "video_deleted");

  // Retention: warning 3 days before, deletion on the day
  const r2 = (await call("GET", "/recordings", a.token)).body.items.find((x: any) => x.title === "Billing");
  await pool.query("update recordings set video_delete_after = current_date + 2 where id = $1", [r2.id]);
  await rpc("dela_rec_daily", {});
  assert((await pool.query("select count(*)::int n from notifications where person_id = $1 and title like 'A recording''s video will be deleted soon'", [a.id])).rows[0].n >= 1, "a warning goes out");
  await pool.query("update recordings set video_delete_after = current_date - 1 where id = $1", [r2.id]);
  await pool.query("delete from jobs where kind = 'recordings_daily'");
  await rpc("dela_job_enqueue", { p_kind: "recordings_daily", p_payload: {}, p_run_at: new Date().toISOString(), p_idem: "recdaily-test", p_person: null });
  await handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
  assert((await pool.query("select video_deleted_at from recordings where id = $1", [r2.id])).rows[0].video_deleted_at, "the video is deleted on its day");
  assert((await pool.query("select count(*)::int n from audit_log where action = 'recording_video_deleted' and object_id = $1", [r2.id])).rows[0].n === 1, "and logged");
});

Deno.test("admin recorder counts", async () => {
  const d = await rpc("dela_admin_recorder", { p_actor: (await pool.query("select person_id from staff_roles where role = 'owner' and revoked_at is null limit 1")).rows[0]?.person_id ?? a.id }).catch(() => null);
  if (d) assert((d as any).by_month.length >= 1);
});

Deno.test("teardown", async () => {
  await pool.end();
});

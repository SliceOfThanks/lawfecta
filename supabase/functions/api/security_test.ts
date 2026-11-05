// The security and sensitive data rules through the real api and database (docs/briefs/step-6d-security-sensitive-data.md,
// Stacey's answers 2026-11-05): gig shares expire for the freelancer (7, 14 or 30 days, Extend 14 days, and the job
// ending) while the attorney's Files tab copy stays; message attachments follow the default days; the attorney sees
// every view and download; a sensitive job refuses new shares; deliverables never go to the AI, sensitive ones are
// refused, and "Save to library" makes a copy Ask DELA cannot read; the milestone check never sees files; the 90-day
// rule with its notice and "Save to library"; immediate deletes (chats, drafts, Delete forever); the /security page's
// facts and contact form (trap field, 5 an hour).
//   deno test -A supabase/functions/api/security_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps, checkLink } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "D".repeat(40); // rules-ok: a made-up test key
const WORKER = "test-worker-secret-security-0123";
const prompts: string[] = [];
let aiCalls = 0;
const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/chat/completions")) {
    aiCalls++;
    const body = JSON.parse(String(init.body));
    prompts.push(JSON.stringify(body.messages));
    return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify({ client_info: false, kinds: [], findings: [{ id: "c1", met: "yes", evidence: "statement" }] }) } }], usage: { prompt_tokens: 1, completion_tokens: 1 } });
  }
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const blobs = new Map<string, Uint8Array>();
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: (p) => Promise.resolve(blobs.get(p)?.length ?? 0), read: (p) => blobs.has(p) ? Promise.resolve(blobs.get(p)!) : Promise.reject(new Error("missing")),
  remove: (ps) => { ps.forEach((p) => blobs.delete(p)); return Promise.resolve(); }, put: (p, b) => { blobs.set(p, b); return Promise.resolve(); },
};
let ip = "203.0.113.7";
const deps: Deps = { rpc, env: (k) => ({ OPENAI_API_KEY: LAWFECTA, DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: fakeFetch, storage };
async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-forwarded-for": ip, ...(session ? { "x-dela-session": session } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
const worker = () => handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
const runJob = async (kind: string) => { await pool.query("select dela_job_enqueue($1, '{}', now(), $1 || ':' || gen_random_uuid()::text)", [kind]); await worker(); };
const days = (iso: string) => (new Date(iso).getTime() - Date.now()) / 86400000;
const txt = (t: string) => new TextEncoder().encode(t);
const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(k: number, plan: string): Promise<M> {
  const bd = 8_300_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Sec " + k, `sec${bd}@test.invalid`])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
let att: M, fl: M, team: M;
let org = "", gig = "", pb = "", fileId = "", ag = "", ms = "";
async function libraryFile(name: string): Promise<string> {
  const path = org + "/" + crypto.randomUUID() + ".txt";
  blobs.set(path, txt("Template " + name));
  return (await one(`insert into files (org_id, group_id, version, is_current, name, ext, size_bytes, storage_path, status, check_state, uploaded_by, side, request_id, no_client_info_ticked_at)
    values ($1, gen_random_uuid(), 1, true, $2, 'txt', 20, $3, 'ready', 'clear', $4, 'attorney', gen_random_uuid()::text, now()) returning id`, [org, name, path, att.id])).id;
}

Deno.test("setup", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  await pool.query("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'gig_chat', 'engagements', 'milestone_check', 'ai_generation', 'worker', 'file_uploads', 'profiles', 'playbook_library')");
  att = await member(1, "att_pro"); fl = await member(2, "fl_plus"); team = await member(3, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'support')", [team.id]);
  org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  pb = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ($1, 'Intake', 'approved', 1, 1, 100, 's1', $2) returning id`, [org, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb, { title: "Intake", steps: [{ text: "a" }] }, att.id]);
  gig = (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id)
    values ($1, $2, $3, 1, 'Welcome packet', '{"task":"Intake"}', 30000, 60000, 'open', now(), now() + interval '14 days', 'sg1') returning id`, [org, att.id, pb])).id;
  await pool.query("insert into gig_invitations (gig_id, freelancer_id, invited_by) values ($1, $2, $3)", [gig, fl.id, att.id]);
  fileId = await libraryFile("Welcome template.txt");
});

Deno.test("gig shares: the attorney picks the days, the freelancer loses the share at expiry, Extend 14 days, the Files tab copy stays", async () => {
  const sh = (await call("POST", "/gigs/files", att.token, { gig_id: gig, file_id: fileId, expiry_days: 7 })).body;
  assert(sh.ok && Math.abs(days(sh.expires_at) - 7) < 0.1, JSON.stringify(sh));
  const fv = (await call("GET", "/gigs/get?id=" + gig, fl.token)).body;
  assertEquals(fv.files?.length, 1, JSON.stringify(fv.files));
  assertEquals((await call("GET", `/gigs/file?gig=${gig}&file=${fileId}`, fl.token)).body.url.includes("exp=300"), true, "5-minute links");
  await pool.query("update gig_files set expires_at = now() - interval '1 minute' where gig_id = $1", [gig]);
  assertEquals((await call("GET", "/gigs/get?id=" + gig, fl.token)).body.files.length, 0, "hidden from the freelancer at expiry");
  assertEquals((await call("GET", `/gigs/file?gig=${gig}&file=${fileId}`, fl.token)).body.reason, "share_expired");
  const av = (await call("GET", "/gigs/get?id=" + gig, att.token)).body;
  assertEquals([av.files[0].expired, av.sharing_choices.choices], [true, [7, 14, 30]], "the attorney sees it marked expired");
  assertEquals((await one("select status from files where id = $1", [fileId])).status, "ready", "the Files tab copy is untouched");
  const ex = (await call("POST", "/gigs/files/extend", att.token, { gig_id: gig, file_id: fileId })).body;
  assert(ex.ok && Math.abs(days(ex.expires_at) - 14) < 0.1);
  assertEquals((await call("GET", "/gigs/get?id=" + gig, fl.token)).body.files.length, 1, "extended: back for the freelancer");
  assertEquals((await call("POST", "/gigs/files/extend", fl.token, { gig_id: gig, file_id: fileId })).status, 403);
  // The older signature (an older api version) follows the same rules
  const other = await libraryFile("Checklist.txt");
  await pool.query("select dela_gig_file_share($1, $2, $3, true)", [att.id, gig, other]);
  assert(Math.abs(days((await one("select expires_at from gig_files where file_id = $1", [other])).expires_at) - 14) < 0.1);
});

Deno.test("a sensitive job refuses new shares", async () => {
  const on = (await call("POST", "/gigs/sensitive", att.token, { gig_id: gig, on: true })).body;
  assertEquals([on.ok, on.shared_files], [true, 2]);
  assertEquals((await call("GET", "/gigs/get?id=" + gig, att.token)).body.sensitive, true);
  const third = await libraryFile("Third.txt");
  assertEquals((await call("POST", "/gigs/files", att.token, { gig_id: gig, file_id: third })).body.reason, "sensitive_job");
  const del = (await call("POST", "/gigs/sensitive/delete-files", att.token, { gig_id: gig })).body;
  assertEquals([del.ok, del.unshared], [true, 2]);
  assertEquals((await one("select count(*)::int n from files where id = $1 and status = 'ready'", [fileId])).n, 1, "Delete now removes the share, not the attorney's copy");
  await call("POST", "/gigs/sensitive", att.token, { gig_id: gig, on: false });
  await call("POST", "/gigs/files", att.token, { gig_id: gig, file_id: fileId });
});

Deno.test("message attachments: the freelancer can open them for the default days; the attorney sees every download", async () => {
  const t = (await call("POST", "/threads/open", att.token, { gig_id: gig, freelancer: fl.id })).body;
  const m = (await call("POST", "/threads/send", att.token, { thread_id: t.id, body: "Here is the template.", attachments: [fileId], request_id: "a1" })).body;
  assertEquals(m.ok, true, JSON.stringify(m));
  assertEquals((await call("GET", `/threads/file?thread=${t.id}&file=${fileId}`, fl.token)).body.ok, true);
  await pool.query("update messages set created_at = now() - interval '15 days' where thread_id = $1", [t.id]);
  assertEquals((await call("GET", `/threads/file?thread=${t.id}&file=${fileId}`, fl.token)).body.reason, "share_expired");
  assertEquals((await call("GET", `/threads/file?thread=${t.id}&file=${fileId}`, att.token)).body.ok, true, "the attorney keeps it");
  const act = (await call("GET", "/gigs/activity?gig=" + gig, att.token)).body;
  assert(act.ok && act.items.some((x: any) => x.who === "Sec 2" && x.where === "Messages") && act.items.some((x: any) => x.who === "Sec 2" && x.where === "Shared files"), JSON.stringify(act));
  assertEquals((await call("GET", "/gigs/activity?gig=" + gig, fl.token)).status, 403, "the log is the attorney's");
});

Deno.test("deliverables: never sent to the AI, sensitive ones refused; the milestone check never sees files; Save to library", async () => {
  const prop = (await one("insert into proposals (gig_id, freelancer_id, status, price_cents) values ($1, $2, 'selected', 45000) returning id", [gig, fl.id])).id;
  ag = (await one("insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status, signed_at) values ($1, $2, $3, $4, $5, 45000, 'active', now()) returning id", [gig, prop, org, att.id, fl.id])).id;
  await pool.query(`insert into agreement_versions (agreement_id, version, body, body_hash, proposed_by) values ($1, 1, '{"rubric_all": [{"id": "c1", "text": "Packet complete", "weight": 100}]}', 'h1', $2)`, [ag, att.id]);
  ms = (await one("insert into milestones (agreement_id, seq, title, amount_cents, from_version, status, funded_at, started_at) values ($1, 1, 'Draft', 45000, 1, 'in_progress', now(), now()) returning id", [ag])).id;
  const up = async (name: string, body: string) => {
    const st = (await call("POST", "/milestones/upload/start", fl.token, { name, size_bytes: body.length, request_id: crypto.randomUUID(), ticked: true })).body;
    assertEquals(st.ok, true, JSON.stringify(st));
    blobs.set(st.upload_url.replace("https://storage.test/up/", ""), txt(body));
    return { id: st.file_id, done: (await call("POST", "/files/complete", fl.token, { file_id: st.file_id })).body };
  };
  const before = aiCalls;
  const bad = await up("ids.txt", "Client SSN 123-45-6789");
  assertEquals([bad.done.ok, bad.done.reason, bad.done.message], [false, "blocked_data", "This file appears to contain sensitive data like a Social Security or card number. Please share it using a secure link instead."]);
  const good = await up("Welcome packet.txt", "Welcome packet for Jane Roe, case 2026-CV-0042, with the SECRET-PHRASE-XYZ");
  assertEquals(good.done.status, "ready", JSON.stringify(good.done));
  assertEquals(aiCalls, before, "deliverables are never sent to the AI");
  assertEquals((await one("select count(*)::int n from file_texts where file_id = $1", [good.id])).n, 0, "no text is kept");
  // The milestone check reads the notes, never the files
  const sub = (await call("POST", "/milestones/submit", fl.token, { milestone_id: ms, statement: "The packet is complete and checked against the list.", files: [good.id], request_id: "sub1" })).body;
  assertEquals(sub.ok, true, JSON.stringify(sub));
  assert(!prompts.at(-1)!.includes("SECRET-PHRASE-XYZ") && !prompts.at(-1)!.includes("Welcome packet.txt"), "no file name or text in the AI prompt");
  // Ask DELA never takes a file shared on a job
  const asked = (await rpc("dela_ai_chat_prepare", { p: { person_id: fl.id, side: "freelancer", content: "Summarize", request_id: "q1", file_ids: [good.id] } })) as Record<string, any> | null;
  assertEquals(asked?.reason, "file_not_usable");
  // Save to library: a copy on the firm's Files tab, still kept away from Ask DELA
  assertEquals((await call("POST", "/deliverables/save", fl.token, { submission_id: sub.id, file_id: good.id })).body.reason, "not_found");
  const saved = (await call("POST", "/deliverables/save", att.token, { submission_id: sub.id, file_id: good.id })).body;
  assertEquals(saved.ok, true, JSON.stringify(saved));
  const copy = await one("select org_id, purpose, status, from_job, storage_path from files where id = $1", [saved.file_id]);
  assertEquals([copy.org_id, copy.purpose, copy.status, copy.from_job, blobs.has(copy.storage_path)], [org, "member", "ready", true, true]);
  const asked2 = (await rpc("dela_ai_chat_prepare", { p: { person_id: att.id, side: "attorney", content: "Summarize", request_id: "q2", file_ids: [saved.file_id] } })) as Record<string, any> | null;
  assertEquals(asked2?.reason, "file_not_usable", "the saved copy is still a job file");
  assertEquals((await call("POST", "/deliverables/save", att.token, { submission_id: sub.id, file_id: good.id })).body.duplicate, true);
  // The 90-day rule spares a saved deliverable and deletes an unsaved one
  const other = await up("Other.txt", "Other deliverable");
  await pool.query("update files set created_at = now() - interval '91 days' where id in ($1, $2)", [good.id, other.id]);
  const otherPath = (await one("select storage_path from files where id = $1", [other.id])).storage_path;
  await runJob("retention_daily");
  assertEquals((await one("select status from files where id = $1", [good.id])).status, "ready", "saved: kept");
  assertEquals((await one("select status from files where id = $1", [other.id])).status, "deleted");
  assert(!blobs.has(otherPath), "the stored file is gone");
});

Deno.test("the 90-day rule for chats and drafts: a notice 7 days before, Save to library, immediate deletes", async () => {
  const chat = async (title: string, ago: number) => (await one("insert into ai_chats (person_id, side, title, updated_at) values ($1, 'attorney', $2, now() - make_interval(days => $3)) returning id", [att.id, title, ago])).id;
  const old = await chat("Old chat", 91), soon = await chat("Soon chat", 85), keep = await chat("Kept chat", 120);
  await pool.query("insert into ai_messages (chat_id, role, content, request_id) values ($1, 'user', 'hello', 'r1')", [old]);
  assertEquals((await call("POST", "/ai/chat/save", att.token, { id: keep })).body.ok, true);
  const list = (await call("GET", "/ai/chats", att.token)).body;
  const soonRow = list.items.find((c: any) => c.id === soon);
  assert(soonRow && Math.abs(days(soonRow.delete_at) - 5) < 0.1, "the list says when: " + JSON.stringify(soonRow));
  const draft = (await one(`insert into playbooks (org_id, title, status, current_version, request_id, created_by, updated_at) values ($1, 'Old draft', 'draft', 1, 'd1', $2, now() - interval '91 days') returning id`, [org, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, '{\"title\":\"Old draft\"}', $2)", [draft, att.id]);
  await pool.query("insert into playbook_activity (playbook_id, person_id, action) values ($1, $2, 'created')", [draft, att.id]).catch(() => {});
  const soonDraft = (await one(`insert into playbooks (org_id, title, status, current_version, request_id, created_by, updated_at) values ($1, 'Soon draft', 'draft', 1, 'd2', $2, now() - interval '86 days') returning id`, [org, att.id])).id;
  await runJob("retention_daily");
  assertEquals((await one("select count(*)::int n from ai_chats where id = $1", [old])).n, 0, "an unsaved chat is deleted after 90 days");
  assertEquals((await one("select count(*)::int n from ai_messages where chat_id = $1", [old])).n, 0);
  assertEquals((await one("select count(*)::int n from ai_chats where id in ($1, $2)", [soon, keep])).n, 2);
  assertEquals((await one("select count(*)::int n from playbooks where id = $1", [draft])).n, 0, "a never-approved draft is deleted after 90 days");
  assertEquals((await one("select count(*)::int n from playbook_versions where playbook_id = $1", [draft])).n, 0, "with its versions");
  assertEquals((await one("select count(*)::int n from playbooks where id = $1", [pb])).n, 1, "approved documents are never touched");
  assert(await one("select 1 from notifications where person_id = $1 and title like '1 Ask DELA chat will be deleted on %' and channel = 'in_app'", [att.id]), "the chat notice 7 days before");
  assert(await one("select 1 from notifications where person_id = $1 and title like '1 draft will be deleted on %'", [att.id]), "the draft notice 7 days before");
  // Save to library keeps a draft; Delete removes one at once
  assertEquals((await call("POST", "/playbooks/save-draft", att.token, { id: soonDraft })).body.ok, true);
  assertEquals((await call("GET", "/playbooks/drafts-due", att.token)).body.drafts.length, 0);
  assertEquals((await call("POST", "/playbooks/delete-draft", att.token, { id: pb })).body.reason, "not_a_draft", "approved documents use Trash");
  assertEquals((await call("POST", "/playbooks/delete-draft", att.token, { id: soonDraft })).body.ok, true);
  assertEquals((await one("select count(*)::int n from playbooks where id = $1", [soonDraft])).n, 0);
  let threw = false;
  try { await pool.query("delete from playbook_versions where playbook_id = $1", [pb]); } catch { threw = true; }
  assert(threw, "versions stay append-only outside the purge");
  assertEquals((await call("POST", "/ai/chat/delete", att.token, { id: soon })).body.ok, true);
  assertEquals((await one("select count(*)::int n from ai_chats where id = $1", [soon])).n, 0, "a chat is deleted at once");
  assertEquals((await call("POST", "/ai/chat/delete", fl.token, { id: keep })).body.duplicate, true, "nobody deletes someone else's chat");
  assertEquals((await one("select count(*)::int n from ai_chats where id = $1", [keep])).n, 1);
});

Deno.test("Trash: Delete forever is immediate", async () => {
  const f = await libraryFile("Old memo.txt");
  const path = (await one("select storage_path from files where id = $1", [f])).storage_path;
  assertEquals((await call("POST", "/files/action", att.token, { action: "delete_forever", file_id: f })).body.reason, "not_in_trash");
  assertEquals((await call("POST", "/files/action", att.token, { action: "trash", file_id: f })).body.ok, true);
  assertEquals((await call("POST", "/files/action", att.token, { action: "delete_forever", file_id: f })).body.ok, true);
  assertEquals((await one("select status from files where id = $1", [f])).status, "deleted");
  assert(!blobs.has(path), "the stored file is gone at once");
});

Deno.test("links are checked before they are kept", () => {
  assertEquals(checkLink("https://www.dropbox.com/scl/fo/abc").ok, true);
  assertEquals((checkLink("https://drive.google.com/x") as any).host, "drive.google.com");
  for (const bad of ["http://drive.google.com/x", "ftp://x.com/a", "javascript:alert(1)", "https://localhost/a", "https://10.0.0.1/a", "https://u:p@box.com/a", "not a link", "https://" + "a".repeat(2001) + ".com"]) {
    assertEquals(checkLink(bad).ok, false, bad);
  }
});

Deno.test("the /security page: facts from settings, and the contact form (trap field, 5 an hour, to the team)", async () => {
  const facts = (await call("GET", "/public/security", "")).body.facts;
  assertEquals([facts.expiry_default, facts.grace_days, facts.link_minutes, facts.drafts_days, facts.openai_zdr], [14, 7, 5, 90, false]);
  assert(facts.data_location.includes("United States"));
  assertEquals((await call("POST", "/public/security/contact", "", { email: "a@b", message: "Hello there" })).body.reason, "bad_email");
  const robot = (await call("POST", "/public/security/contact", "", { email: "bot@example.com", message: "Buy now", website: "spam.example" })).body;
  assertEquals(robot.ok, true, "the trap answers like a success");
  assertEquals((await one("select count(*)::int n from security_messages where email = 'bot@example.com'")).n, 0, "and keeps nothing");
  ip = "198.51.100." + (RUN % 250);
  for (let i = 0; i < 5; i++) assertEquals((await call("POST", "/public/security/contact", "", { name: "Pat", email: "pat@example.com", topic: "Encryption", message: "Question number " + i })).body.ok, true);
  assertEquals((await call("POST", "/public/security/contact", "", { email: "pat@example.com", message: "Sixth question" })).body.reason, "too_many_messages");
  ip = "198.51.101." + (RUN % 250);
  assertEquals((await call("POST", "/public/security/contact", "", { email: "lee@example.com", message: "Another address is fine" })).body.ok, true);
  assertEquals((await one("select count(*)::int n from security_messages where ip_hash like '%198.51%'")).n, 0, "addresses are kept only as a hash");
  const adm = (await call("GET", "/admin/security", team.token)).body.data;
  assert(adm.messages.some((m: any) => m.message === "Question number 0") && adm.open >= 6, JSON.stringify(adm).slice(0, 200));
  assertEquals((await call("GET", "/admin/security", fl.token)).status, 403);
});

Deno.test("teardown", async () => { await pool.end(); });

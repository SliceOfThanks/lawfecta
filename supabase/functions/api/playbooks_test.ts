// Step 2 API tests: build a playbook with the AI, fill it in, chat changes as suggestions, comments, exports, team, Scribe import.
// The real handler and the local test database, with an OpenAI stand-in. Run after tools/dbtest.sh:
//   deno test -A supabase/functions/api/playbooks_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { completeness, dayIn, normalize, removesReview, toCsv } from "./lib/playbooks/model.ts";
import { readJson } from "./lib/playbooks/ai.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "P".repeat(40); // rules-ok: a made-up test key
const FULL = {
  title: "New client intake", outcome: "A signed engagement letter and an opened file", practice_area: "Family law", jurisdiction: "California",
  when_to_use: "A new client signs", roles: "Attorney: engagement letter\nParalegal: opens the file", needs: ["Intake form"],
  steps: [{ text: "Run the conflict check", who: "paralegal", tag: "delegate", minutes: 10 }, { text: "Approve the engagement letter", who: "attorney", tag: "keep" }, { text: "Open the file in Clio", who: "paralegal", tool: "Clio", tag: "delegate" }],
  checks: ["Letter signed"], review_points: ["Attorney approves the engagement letter"], deliverables: "Opened file",
};
const sent: any[] = [];
let aiDown = false;

const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const body = typeof init.body === "string" ? JSON.parse(init.body) : null;
  if (url.startsWith("https://api.openai.com/v1/chat/completions")) {
    sent.push(body);
    if (aiDown) return Response.json({ error: { code: "server_error" } }, { status: 503 });
    const system = String(body.messages[0].content);
    const user = String(body.messages.at(-1).content);
    let out: unknown = {};
    if (system.includes("write down one repeatable process")) out = { playbook: { title: "New client intake", outcome: "An opened file", steps: [{ text: "Run the conflict check" }] }, questions: ["Who signs the engagement letter?", "Which state?"] };
    else if (system.includes("improving a playbook draft")) out = { playbook: FULL, questions: [] };
    else if (system.includes("answering questions about one of the firm's playbooks")) {
      out = user.includes("remove the attorney review") ? { reply: "I removed the review point.", change: { ...FULL, review_points: [] }, note: "Remove review" }
        : user.includes("add") ? { reply: "I added a welcome email step.", change: { ...FULL, steps: [...FULL.steps, { text: "Send the welcome email", tag: "automate" }] }, note: "Welcome email" }
        : { reply: "The paralegal runs the conflict check.", change: null };
    } else if (system.includes("recorded in another tool")) out = { playbook: { ...FULL, title: "File a motion", steps: [{ text: "Save the motion as PDF", from: [1, 2] }, { text: "Upload it to the court site", from: [3] }, { text: "Upload the filed copy to Clio", from: [4] }] }, questions: [] };
    else if (system.includes("Suggest up to 8")) out = { suggestions: [{ title: "Conflict check", why: "Every firm needs one." }] };
    else if (body.response_format) out = { client_info: false, kinds: [] };
    return Response.json({ model: body.model, choices: [{ message: { content: "Here you go:\n" + JSON.stringify(out) } }], usage: { prompt_tokens: 100, completion_tokens: 50 } });
  }
  if (url.startsWith("https://images.scribehow.com/")) {
    return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]), { headers: { "content-type": "image/png" } });
  }
  throw new Error("unexpected fetch " + url);
}) as typeof fetch;

const objects = new Map<string, Uint8Array>();
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/upload/" + p),
  signDownload: (p, s) => Promise.resolve(`https://storage.test/sign/${p}?exp=${s}`),
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

const RUN = Date.now() % 1000000;
async function member(n: number, plan: string): Promise<{ token: string; bd: number; id: string }> {
  const bd = 6_000_000 + RUN * 10 + n;
  const id = (await pool.query("insert into people (bd_member_id, display_name) values ($1, $2) returning id", [bd, "Person " + n])).rows[0].id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, plan.startsWith("att") ? "attorney" : "freelancer", plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, plan.startsWith("att") ? "attorney" : "freelancer"]);
  return { token, bd, id };
}

let owner: Awaited<ReturnType<typeof member>>, editor: Awaited<ReturnType<typeof member>>, outsider: Awaited<ReturnType<typeof member>>, fl: Awaited<ReturnType<typeof member>>;
let org = "", pb = "";

Deno.test("setup", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('ai_generation', 'playbook_library', 'scribe_import', 'file_uploads')");
  owner = await member(1, "att_business");
  editor = await member(2, "att_free");
  outsider = await member(3, "att_free");
  fl = await member(4, "fl_free");
});

Deno.test("the playbook model: completeness, review points, CSV", () => {
  const empty = completeness(normalize({ title: "x" }));
  assert(empty.score < 20 && empty.missing.includes("Steps (at least 3)"));
  assertEquals(completeness(normalize(FULL)), { score: 100, missing: [] });
  assertEquals(completeness(normalize({ ...FULL, has_deadlines: true })).missing, ["Deadlines and timing"], "a process with deadlines needs them written");
  assert(removesReview(normalize(FULL), normalize({ ...FULL, review_points: [] })));
  assert(!removesReview(normalize(FULL), normalize({ ...FULL, review_points: [...FULL.review_points, "More"] })));
  const csv = toCsv(normalize(FULL));
  assert(csv.startsWith("﻿\"Step\",\"What to do\"") && csv.includes("\"Delegate\""));
  assertEquals(readJson("Sure!\n```json\n{\"a\":1}\n```"), { a: 1 });
  assertEquals(normalize({ steps: [{ text: "x", tag: "fly", screenshot: "../../etc" }] }).steps[0], { text: "x", who: "", tool: "", minutes: null, decision: "", tag: "", screenshot: "" });
});

Deno.test("library: freelancers and other firms are kept out", async () => {
  assertEquals((await call("GET", "/library", fl.token)).status, 403);
  const lib = await call("GET", "/library", owner.token);
  assertEquals([lib.body.ok, lib.body.list.role, lib.body.list.count], [true, "administrator", 0]);
  org = lib.body.org_id;
  assertEquals((await call("GET", "/library?org=" + org, outsider.token)).body.org_id !== org, true, "another firm gets its own library, not this one");
});

Deno.test("build with the AI, answer its questions, approve", async () => {
  const warn = await call("POST", "/playbooks/create", owner.token, { org_id: org, request_id: "c1", description: "Intake for my client John Smith, DOB 01/02/1980" });
  assertEquals(warn.body.reason, "looks_like_client_info");
  const before = (await pool.query("select coalesce(sum(used),0)::int u from quota_usage where person_id = $1 and feature_key = 'ai.runs'", [owner.id])).rows[0].u;
  const r = await call("POST", "/playbooks/create", owner.token, { org_id: org, request_id: "c1", description: "How we open a new family law matter" });
  assertEquals(r.body.ok, true);
  assertEquals(r.body.questions.length, 2, "the AI asks for what is missing");
  pb = r.body.id;
  const after = (await pool.query("select coalesce(sum(used),0)::int u from quota_usage where person_id = $1 and feature_key = 'ai.runs'", [owner.id])).rows[0].u;
  assertEquals(after - before, 3, "a draft uses the playbook credits");
  assert(String(sent.at(-1).messages[0].content).includes("Check this:"), "the AI is told never to invent rules");

  let got = await call("GET", "/playbooks/get?id=" + pb, owner.token);
  assert(got.body.playbook.completeness < 100);
  assertEquals((await call("POST", "/playbooks/status", owner.token, { id: pb, action: "approve" })).body.reason, "not_complete");

  const fill = await call("POST", "/playbooks/fill", owner.token, { id: pb, answers: "The attorney signs; California; paralegal opens the file in Clio" });
  assertEquals([fill.body.ok, fill.body.version, fill.body.questions.length], [true, 2, 0]);
  got = await call("GET", "/playbooks/get?id=" + pb, owner.token);
  assertEquals(got.body.playbook.completeness, 100);
  assertEquals((await call("POST", "/playbooks/status", owner.token, { id: pb, action: "approve" })).body.ok, true);
  assertEquals((await call("GET", "/playbooks/get?id=" + pb, outsider.token)).body.reason, "not_found");
});

Deno.test("AI is down: nothing saved, credits given back", async () => {
  aiDown = true;
  const r = await call("POST", "/playbooks/create", owner.token, { org_id: org, request_id: "c-down", description: "Billing at month end" });
  assertEquals([r.body.reason, r.body.code], ["ai_failed", "provider_down"]);
  assertEquals((await pool.query("select count(*)::int n from playbooks where request_id = 'c-down'")).rows[0].n, 0);
  const res = (await pool.query("select coalesce(sum(reserved),0)::int r from quota_usage where person_id = $1", [owner.id])).rows[0].r;
  assertEquals(res, 0);
  aiDown = false;
});

Deno.test("chat: questions answered, changes become suggestions, review points protected", async () => {
  const q = await call("POST", "/playbooks/chat", owner.token, { id: pb, message: "Who runs the conflict check?", request_id: "q1" });
  assertEquals([q.body.ok, q.body.suggestion_id], [true, null]);
  const add = await call("POST", "/playbooks/chat", owner.token, { id: pb, message: "Please add a welcome email step", request_id: "q2" });
  assert(add.body.suggestion_id, "a change is a suggestion");
  let got = await call("GET", "/playbooks/get?id=" + pb, owner.token);
  assertEquals(got.body.body.steps.length, 3, "nothing changes until someone accepts");
  const ok = await call("POST", "/playbooks/decide", owner.token, { suggestion_id: add.body.suggestion_id, accept: true });
  assertEquals(ok.body.ok, true);
  got = await call("GET", "/playbooks/get?id=" + pb, owner.token);
  assertEquals([got.body.body.steps.length, got.body.playbook.status, got.body.playbook.approved_version], [4, "draft", 2], "a new version, waiting for approval again");

  // Team: the owner (Business) adds an editor
  assertEquals((await call("POST", "/playbooks/team", owner.token, { org_id: org, bd_member_id: editor.bd, role: "editor" })).body.ok, true);
  const rm = await call("POST", "/playbooks/chat", editor.token, { id: pb, message: "Please remove the attorney review step", request_id: "q3" });
  assertEquals(rm.body.removes_review, true);
  assertEquals((await call("POST", "/playbooks/decide", editor.token, { suggestion_id: rm.body.suggestion_id, accept: true })).body.reason, "administrator_only");
  assertEquals((await call("POST", "/playbooks/decide", owner.token, { suggestion_id: rm.body.suggestion_id, accept: false, note: "Keep it" })).body.status, "rejected");
});

Deno.test("comments with a suggested change, decided by the administrator", async () => {
  const c = await call("POST", "/playbooks/comment", editor.token, { id: pb, part: "outcome", body: "Mention the retainer", suggested_text: "A signed engagement letter, the retainer paid, and an opened file" });
  assertEquals(c.body.ok, true);
  assertEquals((await call("POST", "/playbooks/comment", editor.token, { id: pb, part: "secrets", body: "x" })).status, 400, "only real parts");
  assertEquals((await call("POST", "/playbooks/decide", owner.token, { suggestion_id: c.body.suggestion_id, accept: true })).body.ok, true);
  const got = await call("GET", "/playbooks/get?id=" + pb, owner.token);
  assertEquals(got.body.body.outcome, "A signed engagement letter, the retainer paid, and an opened file");
  const actions = got.body.activity.map((a: any) => a.action);
  for (const a of ["created_ai", "ai_filled", "approved", "suggestion_made", "suggestion_accepted", "suggestion_rejected"]) assert(actions.includes(a), "activity log has " + a);
});

Deno.test("a file alone is enough for DELA to draft a playbook (Stacey's test 2026-11-05)", async () => {
  const f = (await pool.query(`insert into files (org_id, group_id, version, is_current, name, ext, size_bytes, storage_path, status, check_state, text_chars, uploaded_by, side, request_id, no_client_info_ticked_at)
    values ($1, gen_random_uuid(), 1, true, 'intake-process.docx', 'docx', 100, 'test/' || gen_random_uuid(), 'ready', 'clear', 40, $2, 'attorney', 'f-only', now()) returning id`, [org, owner.id])).rows[0].id;
  await pool.query("insert into file_texts (file_id, body) values ($1, 'Step 1: run the conflict check. Step 2: send the letter.')", [f]);
  const r = await call("POST", "/playbooks/create", owner.token, { org_id: org, request_id: "c-file-only", description: "", file_ids: [f] });
  assertEquals(r.body.ok, true);
  assertEquals(r.body.questions.length, 2, "DELA drafted it and asks its questions");
  const prompt = String(sent.at(-1).messages.at(-1).content);
  assert(prompt.includes("run the conflict check") && prompt.includes("no description"), "the AI got the file");
  const got = await call("GET", "/playbooks/get?id=" + r.body.id, owner.token);
  assertEquals(got.body.playbook.source, "file");
});

Deno.test("Home counts the draft playbooks (Stacey's test 2026-11-05: Home showed 0)", async () => {
  const drafts = (await pool.query("select count(*)::int n from playbooks where org_id = $1 and status in ('draft', 'in_review')", [org])).rows[0].n;
  assert(drafts > 0);
  assertEquals((await call("GET", "/me", owner.token)).body.me.playbooks_draft, drafts);
  assertEquals((await call("GET", "/me", outsider.token)).body.me.playbooks_draft, 0, "another firm's drafts are not counted");
});

Deno.test("the AI takes a process's practice area and state from the process, not the profile", async () => {
  const { aiContext } = await import("./lib/profiles/model.ts");
  const c = aiContext("attorney", { practice_areas: ["Family law"], state: "TX" });
  assert(c.includes("never from this profile"));
});

Deno.test("export dates use Lawfecta's time zone, not UTC (Stacey's test 2026-11-05)", () => {
  const evening = new Date("2026-11-05T02:52:00Z"); // 6:52 PM on Nov 4 in California
  assertEquals(dayIn("America/Los_Angeles", evening), "2026-11-04");
  assertEquals(dayIn("UTC", evening), "2026-11-05");
  assertEquals(dayIn("Not/AZone", evening), "2026-11-05", "a bad setting falls back to UTC instead of failing");
});

Deno.test("exports: Word, Markdown, CSV, HTML and PDF, with version and date", async () => {
  const w = await call("POST", "/playbooks/export", owner.token, { id: pb, format: "docx", request_id: "x1" });
  assert(w.body.name.startsWith("DELA - New client intake - v"), "file name has the title and version");
  const files = unzipSync(Uint8Array.from(atob(w.body.b64), (ch) => ch.charCodeAt(0)));
  const doc = strFromU8(files["word/document.xml"]);
  assert(doc.includes("New client intake") && doc.includes("Run the conflict check"), "the Word file holds the playbook");
  assert(strFromU8(files["word/footer1.xml"]).includes("Exported"), "the footer has the version and date");
  const md = await call("POST", "/playbooks/export", owner.token, { id: pb, format: "md" });
  assert(md.body.text.startsWith("# New client intake") && md.body.text.includes("1. Run the conflict check"));
  const csv = await call("POST", "/playbooks/export", owner.token, { id: pb, format: "csv" });
  assert(csv.body.text.includes("\"Send the welcome email\""));
  const pdf = await call("POST", "/playbooks/export", owner.token, { id: pb, format: "pdf" });
  assertEquals(pdf.body.print, true);
  assert(pdf.body.text.includes("<footer>") && !pdf.body.text.includes("<script"), "printable HTML without scripts");
});

Deno.test("Import from Scribe: screenshots only from allowed hosts, then Build my playbook", async () => {
  const bad = await call("POST", "/imports/image", owner.token, { url: "https://evil.example.com/x.png", request_id: "im0", ticked: true });
  assertEquals(bad.body.reason, "image_host_not_allowed");
  assertEquals((await call("POST", "/imports/image", owner.token, { url: "http://images.scribehow.com/x.png", request_id: "im0b", ticked: true })).body.reason, "image_host_not_allowed", "https only");
  const img = await call("POST", "/imports/image", owner.token, { url: "https://images.scribehow.com/step1.png", request_id: "im1", name: "Step 1", ticked: true });
  assertEquals([img.body.ok, img.body.status], [true, "ready"]);
  const save = await call("POST", "/imports/save", owner.token, { org_id: org, request_id: "imp1", title: "File a motion", steps: [
    { text: "Click File, Save as PDF", file_id: img.body.file_id }, { text: "Choose the folder", note: "Always the matter folder" }, { text: "Upload to the court website" }, { text: "Upload the filed copy to Clio" },
  ] });
  assertEquals(save.body.ok, true);
  const build = await call("POST", "/imports/build", owner.token, { id: save.body.id });
  assertEquals(build.body.ok, true);
  const got = await call("GET", "/playbooks/get?id=" + build.body.playbook_id, owner.token);
  assertEquals(got.body.playbook.source, "scribe");
  assertEquals(got.body.body.steps[0].screenshot, img.body.file_id, "the screenshot follows its step");
  assert(String(sent.at(-1).messages.at(-1).content).includes("Always the matter folder"), "the attorney's notes go to the AI");
  assertEquals((await call("POST", "/imports/build", owner.token, { id: save.body.id })).body.duplicate, true, "building twice makes one playbook");
});

Deno.test("missing playbook suggestions", async () => {
  const r = await call("POST", "/playbooks/missing", owner.token, { org_id: org, request_id: "m1" });
  assertEquals(r.body.suggestions[0].title, "Conflict check");
});

Deno.test("teardown", async () => {
  await pool.end();
});

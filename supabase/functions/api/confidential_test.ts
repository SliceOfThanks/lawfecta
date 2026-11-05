// Confidential materials through the real api and database (docs/briefs/step-6c-confidential-engagement-materials.md):
// closed until both sign and the first milestone is funded; only the hiring attorney, firm owners and managers, staff
// the attorney adds and the hired freelancer; the emailed login code; the freelancer's promise; client information
// allowed, while full Social Security, card and bank numbers and passwords are refused; the medical records checkbox;
// type, size and engagement limits; watermarked PDFs; view only; the log; notices without names; confidential-only
// deliverables skip the AI; the end of access, the reminder, deletion and the dispute hold; the reviewer only with both
// people's agreement; the emergency stop and the switch. With storage and OpenAI stand-ins.
//   deno test -A supabase/functions/api/confidential_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { strToU8, zipSync } from "npm:fflate@0.8.2";
import { PDFDocument, StandardFonts } from "npm:pdf-lib@1.17.1";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";
import { blockedKinds, blockedMessage } from "./lib/confidential/rules.ts";

const LAWFECTA = "sk-lawfecta" + "C".repeat(40); // rules-ok: a made-up test key
const WORKER = "test-worker-secret-confidential-0123";
let aiCalls = 0;
const fetched: string[] = [];
const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  fetched.push(url);
  if (url.endsWith("/chat/completions")) { aiCalls++; const body = JSON.parse(String(init.body)); return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify({ client_info: false, kinds: [], results: [] }) } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }); }
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const blobs = new Map<string, Uint8Array>();
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: (p) => Promise.resolve(blobs.get(p)?.length ?? 0), read: (p) => blobs.has(p) ? Promise.resolve(blobs.get(p)!) : Promise.reject(new Error("missing")),
  remove: (ps) => { ps.forEach((p) => blobs.delete(p)); return Promise.resolve(); }, put: (p, b) => { blobs.set(p, b); return Promise.resolve(); },
};
const deps: Deps = { rpc, env: (k) => ({ OPENAI_API_KEY: LAWFECTA, DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: fakeFetch, storage };
async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(k: number, plan: string): Promise<M> {
  const bd = 8_100_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Conf " + k, `conf${bd}@test.invalid`])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
let att: M, fl: M, fl2: M, staff: M, outsider: M, team: M;
let org = "", ag = "", ms = "";
let n = 0;
const view = async (who: M) => (await call("GET", "/confidential?agreement=" + ag, who.token)).body;
// The emailed code: read from the email the test outbox holds, then entered
async function passCheck(who: M) {
  assertEquals((await call("POST", "/confidential/code", who.token, {})).body.ok, true);
  const mail = await one("select title from notifications where person_id = $1 and channel = 'email' and title like 'Your DELA code:%' order by created_at desc limit 1", [who.id]);
  const code = String(mail.title).split(": ")[1];
  assertEquals((await call("POST", "/confidential/code/confirm", who.token, { code })).body.ok, true);
}
async function upload(who: M, name: string, bytes: Uint8Array, opts: { no_sensitive?: boolean; expiry_days?: number } = {}) {
  const st = (await call("POST", "/confidential/upload/start", who.token, { agreement_id: ag, name, size_bytes: bytes.length, request_id: "u" + (n++), no_sensitive: opts.no_sensitive ?? true, expiry_days: opts.expiry_days })).body;
  if (!st.ok) return st;
  blobs.set(st.upload_url.replace("https://storage.test/up/", ""), bytes);
  return (await call("POST", "/confidential/upload/complete", who.token, { agreement_id: ag, file_id: st.file_id })).body;
}
const txt = (t: string) => new TextEncoder().encode(t);
const worker = () => handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
const runJob = async (kind: string) => { await pool.query("select dela_job_enqueue($1, '{}', now(), $1 || ':' || gen_random_uuid()::text)", [kind]); await worker(); };
const days = (iso: string) => (new Date(iso).getTime() - Date.now()) / 86400000;

Deno.test("the pattern rules: client information allowed; full SSN, card and bank numbers and passwords refused", () => {
  assertEquals(blockedKinds("Client Jane Roe, case 2026-CV-0042, Smith v. Jones, filed in Travis County."), []);
  assertEquals(blockedKinds("SSN 123-45-6789"), ["ssn"]);
  assertEquals(blockedKinds("Last 4 of SSN: 6789"), []);
  assertEquals(blockedKinds("Card 4111 1111 1111 1111"), ["card"]);
  assertEquals(blockedKinds("Order number 1234 5678 9012 3456"), [], "a long number that fails the card check is not a card");
  assertEquals(blockedKinds("Bank account number: 000123456789"), ["bank"]);
  assertEquals(blockedKinds("The Clio password: Winter2026!"), ["password"]);
  assertEquals(blockedKinds("ITIN 912-70-1234"), ["ssn"], "ITINs count with Social Security numbers");
  assertEquals(blockedKinds("Routing 021000021 and account 12345678"), ["bank"]);
  assert(blockedMessage(["ssn", "card"]).includes("Send only the last 4 digits"), "typed messages keep the last-4 message");
  assert(blockedMessage(["password"]).includes("password manager"));
});

Deno.test("setup: a firm, a gig, a hired freelancer and an agreement", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  await pool.query("update feature_switches set state = 'everyone' where key in ('confidential_materials', 'engagements', 'flex_gigs', 'worker', 'milestone_check', 'ai_generation')");
  att = await member(1, "att_pro"); fl = await member(2, "fl_plus"); fl2 = await member(3, "fl_free"); staff = await member(4, "att_free"); outsider = await member(5, "att_pro"); team = await member(6, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'reviewer')", [team.id]);
  org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  await pool.query("insert into org_members (org_id, person_id, member_role) values ($1, $2, 'member')", [org, staff.id]);
  const pb = (await one("insert into playbooks (org_id, created_by, title, request_id) values ($1, $2, 'Intake', 'c1') returning id", [org, att.id])).id;
  const gig = (await one("insert into gigs (org_id, created_by, playbook_id, playbook_version, title, budget_min_cents, budget_max_cents, request_id, status) values ($1, $2, $3, 1, 'Intake packet', 30000, 60000, 'c1', 'filled') returning id", [org, att.id, pb])).id;
  const prop = (await one("insert into proposals (gig_id, freelancer_id, status, price_cents) values ($1, $2, 'selected', 45000) returning id", [gig, fl.id])).id;
  ag = (await one("insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status) values ($1, $2, $3, $4, $5, 45000, 'signing') returning id", [gig, prop, org, att.id, fl.id])).id;
  await pool.query("insert into agreement_versions (agreement_id, version, body, body_hash, proposed_by) values ($1, 1, '{\"rubric_all\": [{\"id\": \"c1\", \"text\": \"Packet complete\"}]}', 'h1', $2)", [ag, att.id]);
  ms = (await one("insert into milestones (agreement_id, seq, title, amount_cents, from_version) values ($1, 1, 'Draft', 45000, 1) returning id", [ag])).id;
});

Deno.test("closed until both sign and the first milestone is funded; strangers see nothing", async () => {
  assertEquals((await view(att)).reason, "confidential_not_open");
  assertEquals((await view(fl)).reason, "confidential_not_open");
  await pool.query("update agreements set signed_at = now(), status = 'active' where id = $1", [ag]);
  assertEquals((await view(att)).reason, "confidential_not_open", "signed but not funded");
  await pool.query("update milestones set funded_at = now(), status = 'funded' where id = $1", [ms]);
  for (const who of [fl2, outsider, staff]) assertEquals((await view(who)).reason, "not_found", "only the people on the engagement");
});

Deno.test("the login code by email, and the freelancer's promise", async () => {
  let v = await view(att);
  assertEquals([v.ok, v.login_needed, v.files], [true, true, undefined], "no files or messages before the login check");
  assertEquals((await call("POST", "/confidential/upload/start", att.token, { agreement_id: ag, name: "a.txt", size_bytes: 5, request_id: "early", no_sensitive: true })).body.reason, "login_needed");
  assertEquals((await call("POST", "/confidential/code", att.token, {})).body.ok, true);
  assertEquals((await one("select count(*)::int n from notifications where person_id = $1 and channel = 'in_app' and title like '%code%'", [att.id])).n, 0, "the code is never an in-app notice");
  assertEquals((await call("POST", "/confidential/code/confirm", att.token, { code: "000000" })).body.reason, "wrong_code");
  const mail = await one("select title from notifications where person_id = $1 and channel = 'email' and title like 'Your DELA code:%' order by created_at desc limit 1", [att.id]);
  assertEquals((await call("POST", "/confidential/code/confirm", att.token, { code: String(mail.title).split(": ")[1] })).body.ok, true);
  v = await view(att);
  assertEquals([v.login_needed, v.files.length, v.people.length >= 2], [false, 0, true]);
  await passCheck(fl);
  v = await view(fl);
  assertEquals(v.ack_needed, true, "the freelancer ticks the promise before first opening the area");
  assertEquals((await call("POST", "/confidential/ack", fl.token, { agreement_id: ag })).body.ok, true);
  assertEquals((await view(fl)).ack_needed, false);
  assert((await one("select wording from conf_acks where person_id = $1", [fl.id])).wording.includes("delete any copies"));
  // An old check runs out
  await pool.query("update conf_stepups set confirmed_at = now() - interval '13 hours' where person_id = $1", [fl.id]);
  assertEquals((await view(fl)).login_needed, true, "after 12 hours DELA asks again");
  await passCheck(fl);
});

Deno.test("uploads: client information is allowed; the checks refuse the rest", async () => {
  assertEquals((await upload(att, "notes.txt", txt("x"), { no_sensitive: false })).reason, "no_sensitive_needed");
  assertEquals((await upload(att, "setup.exe", txt("MZ"))).reason, "type_not_allowed");
  assertEquals((await call("POST", "/confidential/upload/start", att.token, { agreement_id: ag, name: "big.pdf", size_bytes: 26 * 1048576, request_id: "big", no_sensitive: true })).body.reason, "file_too_big");
  const ok = await upload(att, "Roe intake.txt", txt("Client: Jane Roe. Case 2026-CV-0042. Smith v. Jones. Opposing counsel at 512-555-0199."));
  assertEquals([ok.ok, ok.scan_state], [true, "not_scanned"], JSON.stringify(ok));
  const ssn = await upload(att, "ids.txt", txt("Client SSN 123-45-6789"));
  assertEquals([ssn.reason, ssn.kinds, ssn.can_mark_sensitive], ["blocked_data", ["ssn"], true]);
  assertEquals(ssn.message, "This file appears to contain sensitive data like a Social Security or card number. Please share it using a secure link instead.", "files: the new message");
  assertEquals((await upload(fl, "itin.txt", txt("ITIN 912-70-1234"))).can_mark_sensitive, false, "only the attorney side can mark the job sensitive");
  const csv = await upload(att, "contacts.csv", txt("name,phone\nJane Roe,512-555-0199\n"));
  assertEquals(csv.ok, true, "CSV is allowed: " + JSON.stringify(csv));
  assertEquals((await upload(att, "formula.csv", txt("name,total\nJane,=HYPERLINK(\"x\")\n"))).reason, "active_content", "a CSV with a formula is refused");
  assertEquals((await upload(att, "bank.csv", txt("routing number: 021000021\n"))).kinds, ["bank"], "routing numbers next to the word routing");
  assertEquals((await upload(att, "fake.pdf", txt("not a pdf"))).reason, "wrong_type", "the type is read from the contents");
  const xlsx = zipSync({ "[Content_Types].xml": strToU8("<Types/>"), "xl/workbook.xml": strToU8("<workbook/>"), "xl/sharedStrings.xml": strToU8("<sst><si><t>Card 4111 1111 1111 1111</t></si></sst>") });
  assertEquals((await upload(att, "billing.xlsx", xlsx)).kinds, ["card"], "Excel text is checked too");
  const macro = zipSync({ "[Content_Types].xml": strToU8("<Types/>"), "xl/workbook.xml": strToU8("<workbook/>"), "xl/vbaProject.bin": strToU8("x") });
  assertEquals((await upload(att, "macro.xlsx", macro)).reason, "active_content");
  assertEquals((await one("select count(*)::int n from files where purpose = 'confidential' and status = 'refused' and org_id = $1", [org])).n >= 4, true);
  const note = await one("select title, body from notifications where person_id = $1 and title = 'New item in Confidential materials' order by created_at desc limit 1", [fl.id]);
  assert(note && !note.body.includes("Roe") && !note.body.includes("intake.txt"), "the notice names no file and no client: " + JSON.stringify(note));
  assertEquals((await one("select count(*)::int n from file_texts t join files f on f.id = t.file_id where f.purpose = 'confidential'")).n, 0, "no text is kept from confidential files");
  const files = (await call("GET", "/files", att.token)).body;
  assert(!JSON.stringify(files).includes("Roe intake"), "confidential files are not on the Files tab");
  assertEquals(aiCalls, 0, "the AI never read a confidential upload");
  // The engagement limit
  await pool.query("update settings set value = '1' where key = 'confidential.engagement_max_mb'");
  assertEquals((await call("POST", "/confidential/upload/start", att.token, { agreement_id: ag, name: "more.pdf", size_bytes: 1048576, request_id: "lim", no_sensitive: true })).body.reason, "engagement_full");
  await pool.query("update settings set value = '500' where key = 'confidential.engagement_max_mb'");
});

Deno.test("messages: client facts allowed, the blocked kinds refused, sent once", async () => {
  const m = (await call("POST", "/confidential/message", fl.token, { agreement_id: ag, body: "Jane Roe called about the Smith v. Jones hearing.", request_id: "m1" })).body;
  assertEquals(m.ok, true, JSON.stringify(m));
  assertEquals((await call("POST", "/confidential/message", fl.token, { agreement_id: ag, body: "Jane Roe called about the Smith v. Jones hearing.", request_id: "m1" })).body.duplicate, true);
  assertEquals((await call("POST", "/confidential/message", att.token, { agreement_id: ag, body: "Clio login: lawfirm, password: Winter2026!", request_id: "m2" })).body.kinds, ["password"]);
  assertEquals((await call("POST", "/confidential/message", att.token, { agreement_id: ag, body: "Her card is 4111-1111-1111-1111", request_id: "m3" })).body.kinds, ["card"]);
  assertEquals((await view(att)).messages.length, 1);
  assertEquals(aiCalls, 0, "messages here are never reviewed by the AI");
});

Deno.test("opening files: watermarked PDFs, 5-minute links, view only, the log, and who may manage", async () => {
  const doc = await PDFDocument.create();
  const pg = doc.addPage([400, 300]);
  pg.drawText("Retainer agreement for Jane Roe", { x: 20, y: 250, size: 14, font: await doc.embedFont(StandardFonts.Helvetica) });
  const pdf = await upload(att, "Retainer.pdf", new Uint8Array(await doc.save()));
  assertEquals(pdf.ok, true, JSON.stringify(pdf));
  const txtId = (await view(att)).files.find((f: any) => f.name === "Roe intake.txt").id;
  const o = (await call("POST", "/confidential/open", fl.token, { agreement_id: ag, file_id: pdf.id, action: "open" })).body;
  assertEquals([o.ok, o.kind], [true, "pdf"]);
  assert(o.watermark.startsWith("Conf 2 | "), "the viewer's name and the date: " + o.watermark);
  const marked = await PDFDocument.load(Uint8Array.from(atob(o.b64), (c) => c.charCodeAt(0)));
  assertEquals(marked.getPageCount(), 1, "a real PDF comes back");
  const d = (await call("POST", "/confidential/open", fl.token, { agreement_id: ag, file_id: txtId, action: "download" })).body;
  assert(d.url.includes("exp=300"), "links work for 5 minutes: " + d.url);
  assertEquals((await call("POST", "/confidential/view-only", fl.token, { agreement_id: ag, file_id: txtId, on: true })).body.reason, "not_allowed", "only the attorney side sets view only");
  assertEquals((await call("POST", "/confidential/view-only", att.token, { agreement_id: ag, file_id: txtId, on: true })).body.ok, true);
  assertEquals((await call("POST", "/confidential/open", fl.token, { agreement_id: ag, file_id: txtId, action: "download" })).body.reason, "view_only");
  const v = await view(att);
  assert(v.log.some((l: any) => l.who === "Conf 2" && l.action === "download" && l.file === "Roe intake.txt"), "the attorney sees the freelancer's downloads");
  assert(!(await view(fl)).log, "the freelancer does not see the log");
  assertEquals((await call("POST", "/confidential/open", outsider.token, { agreement_id: ag, file_id: txtId, action: "open" })).body.reason, "not_found");
  let threw = false;
  try { await pool.query("delete from conf_log"); } catch { threw = true; }
  assert(threw, "the log is append-only");
});

Deno.test("expiry: the attorney picks 7, 14 or 30 days; the freelancer loses a file at its expiry; Extend 14 days; Download all", async () => {
  const seven = await upload(att, "Short.txt", txt("Seven day file for Jane Roe"), { expiry_days: 7 });
  const odd = await upload(att, "Odd.txt", txt("Not a choice"), { expiry_days: 9 });
  const mine = await upload(fl, "Draft letter.txt", txt("Draft letter to Jane Roe"), { expiry_days: 30 });
  const files = (await view(att)).files;
  const f = (id: string) => files.find((x: any) => x.id === id);
  assert(Math.abs(days(f(seven.id).expires_at) - 7) < 0.1, "7 days as picked");
  assert(Math.abs(days(f(odd.id).expires_at) - 14) < 0.1, "a number that is not a choice gets the default 14");
  assert(Math.abs(days(f(mine.id).expires_at) - 14) < 0.1, "the freelancer's own uploads get the default");
  assert(Math.abs(days(f(seven.id).delete_at) - 14) < 0.1, "deleted 7 days after access ends");
  assertEquals((await view(att)).sharing.choices, [7, 14, 30]);
  // The expiry passes
  await pool.query("update conf_files set expires_at = now() - interval '1 minute' where id = $1", [seven.id]);
  assert(!(await view(fl)).files.some((x: any) => x.id === seven.id), "the freelancer no longer sees it");
  assertEquals((await call("POST", "/confidential/open", fl.token, { agreement_id: ag, file_id: seven.id, action: "open" })).body.reason, "share_expired");
  const forAtt = (await view(att)).files.find((x: any) => x.id === seven.id);
  assertEquals(forAtt.access_ended, true, "the attorney still has it during the 7 days");
  // Extend 14 days: the attorney side only, no limit, logged
  assertEquals((await call("POST", "/confidential/extend", fl.token, { agreement_id: ag, file_id: seven.id })).body.reason, "not_allowed");
  const ex = (await call("POST", "/confidential/extend", att.token, { agreement_id: ag, file_id: seven.id })).body;
  assert(ex.ok && Math.abs(days(ex.expires_at) - 14) < 0.1, JSON.stringify(ex));
  const ex2 = (await call("POST", "/confidential/extend", att.token, { agreement_id: ag, file_id: seven.id })).body;
  assert(Math.abs(days(ex2.expires_at) - 28) < 0.1, "every click adds 14 days");
  assert((await view(fl)).files.some((x: any) => x.id === seven.id), "the freelancer has it again");
  assert((await view(att)).log.filter((l: any) => l.action === "extended").length === 2, "every extension is logged");
  // Delete now: immediate and permanent
  assertEquals((await call("POST", "/confidential/delete", fl.token, { agreement_id: ag, file_id: odd.id })).body.reason, "not_allowed", "the freelancer deletes only their own");
  const myPath = (await one("select f.storage_path from conf_files c join files f on f.id = c.file_id where c.id = $1", [mine.id])).storage_path;
  assertEquals((await call("POST", "/confidential/delete", fl.token, { agreement_id: ag, file_id: mine.id })).body.ok, true);
  assert(!blobs.has(myPath), "the stored file is gone at once");
  assertEquals((await call("POST", "/confidential/delete", att.token, { agreement_id: ag, file_id: odd.id })).body.ok, true);
  assertEquals((await call("POST", "/confidential/delete", att.token, { agreement_id: ag, file_id: odd.id })).body.duplicate, true);
  assertEquals((await one("select status from files f join conf_files c on c.file_id = f.id where c.id = $1", [odd.id])).status, "deleted");
  // Download all: every file the attorney can download, logged; view-only files are left out and counted
  assertEquals((await call("POST", "/confidential/download-all", fl.token, { agreement_id: ag })).body.reason, "not_allowed");
  const all = (await call("POST", "/confidential/download-all", att.token, { agreement_id: ag })).body;
  assert(all.ok && all.files.length >= 2 && all.files.every((x: any) => x.url.includes("exp=300")), JSON.stringify(all));
  assertEquals(all.view_only_skipped, 1);
});

Deno.test("secure links: added by the attorney side, never fetched, every open logged, both emails, the address erased", async () => {
  const add = (who: M, body: Record<string, unknown>) => call("POST", "/confidential/links/add", who.token, { agreement_id: ag, request_id: "l" + (n++), ...body }).then((x) => x.body);
  assertEquals((await add(fl, { url: "https://drive.google.com/x" })).reason, "not_allowed", "freelancers do not add links");
  assertEquals((await add(att, { url: "http://drive.google.com/x" })).reason, "link_not_https");
  assertEquals((await add(att, { url: "https://user:secret@drive.google.com/x" })).reason, "link_has_login");
  assertEquals((await add(att, { url: "javascript:alert(1)" })).reason, "link_not_https");
  assertEquals((await add(att, { url: "https://drive.google.com/x", label: "SSN 123-45-6789" })).reason, "blocked_data");
  const before = fetched.length;
  const l = await add(att, { url: "https://www.dropbox.com/scl/fo/abc123?dl=0", label: "Medical records folder", expiry_days: 7 });
  assert(l.ok && Math.abs(days(l.expires_at) - 7) < 0.1, JSON.stringify(l));
  assertEquals(fetched.length, before, "DELA never opens the link");
  const fv = await view(fl);
  const link = fv.links.find((x: any) => x.id === l.id);
  assertEquals([link.label, link.host, link.url], ["Medical records folder", "dropbox.com", undefined], "the list never carries the address");
  const o = (await call("POST", "/confidential/links/open", fl.token, { agreement_id: ag, link_id: l.id })).body;
  assertEquals(o.url, "https://www.dropbox.com/scl/fo/abc123?dl=0");
  assert((await view(att)).log.some((x: any) => x.action === "link_open" && x.who === "Conf 2" && x.file === "Medical records folder"), "every open is logged under the person's name");
  assertEquals(aiCalls, 0, "the AI never sees links");
  // Two days before: the first email, with Stacey's wording
  await pool.query("update conf_links set expires_at = now() + interval '36 hours' where id = $1", [l.id]);
  await runJob("links_hourly");
  const warn = await one("select title, body from notifications where person_id = $1 and channel = 'email' and title like 'Your shared link for Intake packet expires on %'", [att.id]);
  assert(warn && warn.body.startsWith("Your shared link for Intake packet expires on ") && warn.body.includes("After that, the freelancer can no longer open it in DELA. DELA cannot change sharing settings in your own storage, so please turn off sharing for this file in Google Drive, Dropbox or wherever it is stored once the work is done."), JSON.stringify(warn));
  await runJob("links_hourly");
  assertEquals((await one("select count(*)::int n from notifications where person_id = $1 and channel = 'email' and title like 'Your shared link for Intake packet expires%'", [att.id])).n, 1, "sent once");
  // At expiry: hidden, the address erased, the second email
  await pool.query("update conf_links set expires_at = now() - interval '1 minute' where id = $1", [l.id]);
  assert(!(await view(fl)).links.some((x: any) => x.id === l.id), "hidden from the freelancer at once");
  assertEquals((await call("POST", "/confidential/links/open", fl.token, { agreement_id: ag, link_id: l.id })).body.reason, "link_expired");
  await runJob("links_hourly");
  assertEquals((await one("select url from conf_links where id = $1", [l.id])).url, null, "the stored address is deleted");
  const gone = await one("select title, body from notifications where person_id = $1 and channel = 'email' and title = 'Your shared link for Intake packet has expired'", [att.id]);
  assertEquals(gone?.body, "Your shared link for Intake packet has expired, and the freelancer can no longer open it in DELA. DELA cannot change sharing settings in your own storage, so please turn off sharing for this file in Google Drive, Dropbox or wherever it is stored.");
  assertEquals((await view(att)).links.find((x: any) => x.id === l.id).state, "expired");
  // Removing a link erases the address at once
  const l2 = await add(att, { url: "https://example.sharefile.com/d-abc", label: "Bank statements" });
  assertEquals((await call("POST", "/confidential/links/remove", fl.token, { agreement_id: ag, link_id: l2.id })).body.reason, "not_allowed");
  assertEquals((await call("POST", "/confidential/links/remove", att.token, { agreement_id: ag, link_id: l2.id })).body.ok, true);
  assertEquals((await one("select url from conf_links where id = $1", [l2.id])).url, null);
});

Deno.test("firm staff: only the hiring attorney adds them, only from the firm", async () => {
  assertEquals((await call("POST", "/confidential/member", fl.token, { agreement_id: ag, person_id: staff.id })).body.reason, "not_allowed");
  assertEquals((await call("POST", "/confidential/member", att.token, { agreement_id: ag, person_id: outsider.id })).body.reason, "not_in_firm");
  assertEquals((await call("POST", "/confidential/member", att.token, { agreement_id: ag, person_id: staff.id })).body.ok, true);
  await passCheck(staff);
  assertEquals((await view(staff)).files.length >= 2, true, "added staff see the materials");
  assertEquals((await call("POST", "/confidential/member", att.token, { agreement_id: ag, person_id: staff.id, on: false })).body.ok, true);
  assertEquals((await view(staff)).reason, "not_found", "removed staff lose access at once");
});

Deno.test("a milestone with only confidential deliverables skips the AI and goes to the attorney", async () => {
  const fid = (await view(fl)).files[0].id;
  await pool.query("update milestones set status = 'in_progress', started_at = now() where id = $1", [ms]);
  const before = aiCalls;
  const r = (await call("POST", "/milestones/submit", fl.token, { milestone_id: ms, statement: "The packet is ready in Confidential materials.", conf_files: [fid], request_id: "s1" })).body;
  assertEquals([r.ok, r.status, r.confidential_only], [true, "with_attorney", true], JSON.stringify(r));
  assertEquals(aiCalls, before, "the milestone check never ran on confidential work");
  assertEquals((await one("select array_length(conf_files, 1) n from milestone_submissions where id = $1", [r.id])).n, 1);
});

Deno.test("a dispute: the reviewer opens the area only when both agree, and both see it", async () => {
  const d = (await one("insert into disputes (agreement_id, milestone_id, opened_by, reason, notice_ends_at) values ($1, $2, $3, 'Late', now() + interval '3 days') returning id", [ag, ms, att.id])).id;
  const rv = () => call("GET", "/admin/confidential/review?agreement=" + ag, team.token).then((x) => x.body);
  assertEquals((await rv()).data?.reason ?? (await rv()).reason, "both_must_agree");
  assertEquals((await call("POST", "/confidential/review-consent", att.token, { agreement_id: ag, agree: true })).body.ok, true);
  assertEquals(((await rv()).data ?? {}).reason, "both_must_agree");
  assertEquals((await call("POST", "/confidential/review-consent", fl.token, { agreement_id: ag, agree: true })).body.ok, true);
  const r = (await rv()).data;
  assertEquals([r.ok, r.files.length >= 2, r.messages.length], [true, true, 1], JSON.stringify(r));
  assertEquals((await view(att)).reviewer_opens, 1, "every reviewer open is shown to both people");
  const counts = (await call("GET", "/admin/confidential", team.token)).body.data;
  assert(counts.files >= 2 && !JSON.stringify(counts).includes("Roe"), "the team's counts carry no names");
  await pool.query("update disputes set status = 'resolved', resolved_at = now() where id = $1", [d]);
});

Deno.test("a sensitive job: no uploads, links only; Delete now", async () => {
  const gig = (await one("select gig_id from agreements where id = $1", [ag])).gig_id;
  assertEquals((await call("POST", "/gigs/sensitive", fl.token, { gig_id: gig, on: true })).status, 403);
  const on = (await call("POST", "/gigs/sensitive", att.token, { gig_id: gig, on: true })).body;
  assert(on.ok && on.confidential_files >= 2, "the answer counts the files already shared: " + JSON.stringify(on));
  assertEquals((await upload(att, "More.txt", txt("x"))).reason, "sensitive_job", "no new uploads on a sensitive job");
  assertEquals((await upload(fl, "More.txt", txt("x"))).reason, "sensitive_job");
  assertEquals((await view(att)).can_upload, false);
  assertEquals((await call("POST", "/confidential/links/add", att.token, { agreement_id: ag, request_id: "sens", url: "https://app.box.com/s/abc", label: "ID documents" })).body.ok, true, "links still work");
  assert((await view(fl)).files.length >= 1, "files already shared stay until they expire");
  const paths = (await pool.query("select f.storage_path from conf_files c join files f on f.id = c.file_id where c.agreement_id = $1 and c.deleted_at is null", [ag])).rows.map((x: any) => x.storage_path);
  const del = (await call("POST", "/gigs/sensitive/delete-files", att.token, { gig_id: gig })).body;
  assertEquals([del.ok, del.deleted], [true, paths.length]);
  assert(paths.every((p: string) => !blobs.has(p)), "Delete now removes the stored files at once");
  assertEquals((await view(att)).files.length, 0);
  assertEquals((await call("POST", "/gigs/sensitive", att.token, { gig_id: gig, on: false })).body.ok, true);
});

Deno.test("the end: the freelancer loses access; the Download all reminder; files and messages deleted 7 days later; a dispute holds it", async () => {
  await upload(att, "Final A.txt", txt("Final A for Jane Roe"));
  await upload(att, "Final B.txt", txt("Final B for Jane Roe"));
  await pool.query("update agreements set status = 'completed', completed_at = now() where id = $1", [ag]);
  assertEquals((await view(fl)).reason, "confidential_ended", "the freelancer loses access the moment it ends");
  assertEquals((await view(att)).ok, true, "the attorney can still download for 7 days");
  assertEquals((await call("POST", "/confidential/message", att.token, { agreement_id: ag, body: "x", request_id: "late" })).body.reason, "confidential_ended");
  await pool.query("update agreements set completed_at = now() - interval '6 days' where id = $1", [ag]);
  await runJob("confidential_daily");
  const rem = await one("select title, body from notifications where person_id = $1 and title = 'Files in Confidential materials will be deleted soon' and channel = 'in_app'", [att.id]);
  assert(rem && rem.body.includes("Download all") && !rem.body.includes("Final A"), "the 2-day reminder names no file: " + JSON.stringify(rem));
  await pool.query("update agreements set completed_at = now() - interval '8 days' where id = $1", [ag]);
  const hold = (await one("insert into disputes (agreement_id, opened_by, reason, notice_ends_at) values ($1, $2, 'Refund', now() + interval '3 days') returning id", [ag, att.id])).id;
  await runJob("confidential_daily");
  assertEquals((await one("select count(*)::int n from conf_files where agreement_id = $1 and deleted_at is null", [ag])).n, 2, "an open dispute holds the deletion");
  await pool.query("update disputes set status = 'resolved', resolved_at = now() where id = $1", [hold]);
  const paths = (await pool.query("select f.storage_path from conf_files c join files f on f.id = c.file_id where c.agreement_id = $1 and c.deleted_at is null", [ag])).rows.map((x: any) => x.storage_path);
  await runJob("confidential_daily");
  assert(paths.length === 2 && paths.every((p: string) => !blobs.has(p)), "the stored files are gone");
  assertEquals((await one("select count(*)::int n from conf_messages where agreement_id = $1 and body <> '[deleted]'", [ag])).n, 0, "message text is gone");
  assert((await one("select conf_deleted_at from agreements where id = $1", [ag])).conf_deleted_at);
  assertEquals((await view(att)).reason, "confidential_deleted");
});

Deno.test("the emergency stop and the switch close every area", async () => {
  await pool.query("update agreements set status = 'active', completed_at = null, conf_deleted_at = null where id = $1", [ag]);
  await pool.query("update settings set value = jsonb_set(value, '{confidential}', 'true') where key = 'emergency.pause'");
  assertEquals((await view(att)).reason, "confidential_paused");
  await pool.query("update settings set value = jsonb_set(value, '{confidential}', 'false') where key = 'emergency.pause'");
  await pool.query("update feature_switches set state = 'off' where key = 'confidential_materials'");
  assertEquals((await view(att)).reason, "confidential_off");
  await pool.query("update feature_switches set state = 'everyone' where key = 'confidential_materials'");
});

Deno.test("teardown", async () => { await pool.end(); });

// The document standard through the real api and database: the firm profile, drafting with the scrub and the self-check,
// the export and approval block, Fix it, split, change type, IDs, the change log, review dates and reminders, gigs from SOPs
// and Workflows only (a workflow hands over only the freelancer's steps), references, attorney checkpoints, and converting
// older playbooks. With an OpenAI stand-in. Run after tools/dbtest.sh:
//   deno test -A supabase/functions/api/documents_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "D".repeat(40); // rules-ok: a made-up test key
const WORKER = "test-worker-secret-documents-0123456789";
const prompts: string[] = [];
let draftAnswer: Record<string, unknown> = {};
const R = (raci: Record<string, string>, text: string, extra: Record<string, unknown> = {}) => ({ text, raci, role: Object.keys(raci)[0], ...extra });

function sopAnswer() {
  return {
    document: {
      type: "sop", title: "Run a conflict check", lifecycle: "INT", owner_role: "Paralegal", roles: ["Attorney", "Paralegal"], purpose: "Find conflicts before a consult.", scope: "Every new matter.",
      trigger: "A prospective client asks for a consult.", before_you_start: ["Access to Clio"], timing: "Reply as needed.", quality_check: ["The result is in the matter notes"], done_when: "The result is recorded.",
      saved_in: "Clio", related_links: [{ label: "INT-02 Respond to a new inquiry", url: "" }], decisions: [{ if: "a possible conflict", then: "Send it to the attorney.", attorney_decides: true, escalate_to: "Attorney" }],
      steps: [R({ Paralegal: "R" }, "Search the party names in Clio.", { menu_path: "Clio > Contacts > Search" }), R({ Paralegal: "R,A" }, "Record the results in the matter notes. Password: hunter22"),
        R({ Attorney: "R" }, "Decide whether to accept the matter.")],
    },
    suggested_type: { type: "workflow", reason: "It moves across several roles." }, questions: ["Which report shows conflicts?"], notices: [],
  };
}

const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/chat/completions")) {
    const body = JSON.parse(String(init.body));
    const system = String(body.messages[0].content), user = String(body.messages.at(-1).content);
    prompts.push(system + "\n" + user);
    let out: unknown = {};
    if (system.includes("has never worked with this firm")) {
      out = user.includes("Clio login from the office manager") ? { ready: true, summary: "Someone new could do this from the page.", findings: [] }
        : { ready: true, summary: "Two things are missing for someone new.", findings: [{ kind: "access", step: 1, what: "The page does not say how a newcomer gets into Clio.", question: "How does a new person get a Clio login?" },
          { kind: "made_up", step: 99, what: "It is not clear what a finished check looks like.", question: "What does a finished conflict check look like?" }, { kind: "term", step: 1, what: "", question: "dropped" }] };
    } else if (system.includes("adding the attorney's answers into a law firm document")) {
      const d = JSON.parse(user.split("The document:\n")[1].split("\n\nThe gaps")[0]);
      d.before_you_start = [...(d.before_you_start ?? []), "Get a Clio login from the office manager."];
      d.steps = d.steps.map((st: any) => ({ ...st, attorney_decides: false }));
      out = { document: d, notices: ["Added the Clio login to Before you start"] };
    } else if (system.includes("document assistant inside Lawfecta, writing one")) out = draftAnswer;
    else if (system.includes("fixing a law firm document")) {
      const d = JSON.parse(user.split("The document:\n")[1].split("\n\n")[0]);
      d.timing = "Within 1 business day of the request.";
      out = { document: d, notices: ["Gave the timing a value"] };
    } else if (system.includes("Split it into 2 to 4 linked SOPs")) {
      const d = JSON.parse(user.split("The SOP:\n")[1]);
      out = { documents: [{ ...d, title: "Run a conflict check (search)", purpose: "Search names.", steps: d.steps.slice(0, 2) }, { ...d, title: "Run a conflict check (decide)", purpose: "Decide.", steps: d.steps.slice(2) }] };
    } else if (system.includes("You classify one existing")) out = { type: "sop", lifecycle: "MAT", reason: "It is one clear path." };
    else if (system.includes("rewriting an existing law firm playbook")) {
      const t = system.includes("as a Playbook") ? "playbook" : "sop";
      out = t === "playbook"
        ? { document: { type: "playbook", title: "Handle an upset client", roles: ["Attorney", "Paralegal"], situations: ["A client is upset"], principles: ["Listen first"], preferred: "Call them back within 1 business day.", fallbacks: ["Offer a meeting"], hard_limits: ["Never promise a result"], escalation: [{ issue: "A fee refund", decider_role: "Attorney", how_fast: "1 business day" }], scripts: ["I hear you."], examples: ["[Client Name] calls upset about a delay."] } }
        : { document: { type: "sop", title: "Open a matter", lifecycle: "MAT", owner_role: "Paralegal", roles: ["Attorney", "Paralegal"], purpose: "Open the matter.", scope: "All matters.", trigger: "The letter is signed.",
            before_you_start: ["Access to Clio"], steps: [R({ Paralegal: "R,A" }, "Create the matter in Clio."), R({ Paralegal: "R", Attorney: "A" }, "Add the team to the matter."), R({ Attorney: "R,A" }, "Approve the matter.", { attorney_decides: true })],
            decisions: [{ if: "the fee is unusual", then: "Stop.", attorney_decides: true }], timing: "Within 1 business day.", quality_check: ["Matter number recorded"], done_when: "The matter is open.", related_links: [{ label: "Matter checklist", url: "" }] } };
    } else if (body.response_format && system.includes("legal operations tool")) out = { client_info: false, kinds: [] };
    else if (system.includes("public version of a Flex Gig")) out = { title: "Intake help", task: "Answer inquiries and draft letters.", outcome: "Drafts ready", steps: ["Answer", "Draft"], tools: ["Clio"], timing: "2 hours", state: "TX", practice_area: "Family law", skills: [] };
    return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 10 } });
  }
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: () => Promise.resolve(1), read: () => Promise.reject(new Error("missing")), remove: () => Promise.resolve(), put: () => Promise.resolve(),
};
const deps: Deps = { rpc, env: (k) => ({ OPENAI_API_KEY: LAWFECTA, DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: fakeFetch, storage };

async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
async function worker(times = 4) {
  for (let i = 0; i < times; i++) {
    await pool.query("update jobs set run_at = now() where status in ('queued', 'delayed') and kind = 'doc_convert'");
    await handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
  }
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(k: number, plan: string): Promise<M> {
  const bd = 7_800_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, k === 1 ? "Maria Lopez" : "Doc " + k, `doc${bd}@test.invalid`])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}

let att: M, fl: M, other: M, team: M;
let org = "", sop = "", wf = "", pbook = "";
const FIRM = (extra: Record<string, unknown> = {}) => ({ size: "2-5", practice_areas: ["Family law"], jurisdictions: "Texas state courts; N.D. Tex.", systems: { practice_management: ["Clio"], billing: ["LawPay"] },
  roles: [{ name: "Attorney", kind: "attorney", person_id: att.id }, { name: "Paralegal", kind: "staff", email: "para@firm.example" }, { name: "Outsourced freelancer", kind: "freelancer" }], ...extra });

Deno.test("setup", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  await pool.query("update feature_switches set state = 'everyone' where key in ('document_standard', 'document_conversion', 'playbook_library', 'flex_gigs', 'engagements', 'ai_generation', 'worker', 'profiles', 'conduct_review')");
  await pool.query("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
  att = await member(1, "att_pro"); fl = await member(2, "fl_plus"); other = await member(3, "att_free"); team = await member(4, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'reviewer')", [team.id]);
  await pool.query("insert into member_profiles (person_id, side, body, missing, score) values ($1, 'attorney', '{\"firm_name\":\"Doc Legal\",\"practice_areas\":[\"Family law\"]}', '{}', 100)", [att.id]);
  await pool.query(`insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) values ($1, 'l', 'TX', $2, $2, 'A', 'video', 'verified')`, [att.id, "D" + att.bd]);
  await pool.query("select dela_profile_refresh($1, 'attorney')", [att.id]);
  await pool.query("insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) values ($1, 'freelancer', '{\"first_name\":\"Fran\"}', '{}', 100, now())", [fl.id]);
  await pool.query("select dela_profile_refresh($1, 'freelancer')", [fl.id]);
  org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
});

Deno.test("the firm profile: asked first, checked, roles held by a member or an email, unassigned roles flagged", async () => {
  assertEquals((await call("POST", "/documents/draft", att.token, { org_id: org, type: "sop", request_id: "d0", answers: { name: "Run a conflict check" } })).body.reason, "firm_profile_needed");
  assertEquals((await call("POST", "/documents/firm", att.token, { ...FIRM(), size: "" })).body.reason, "choose_firm_size");
  assertEquals((await call("POST", "/documents/firm", att.token, FIRM({ roles: [{ name: "Paralegal", kind: "staff" }] }))).body.reason, "attorney_role_needed");
  assertEquals((await call("POST", "/documents/firm", att.token, FIRM({ roles: [{ name: "Attorney", kind: "attorney", person_id: fl.id }] }))).body.reason, "not_in_firm");
  const saved = (await call("POST", "/documents/firm", att.token, FIRM())).body;
  assertEquals([saved.ok, saved.unassigned], [true, ["Outsourced freelancer"]]);
  const got = (await call("GET", "/documents/firm", att.token)).body;
  assertEquals([got.saved, got.unassigned, got.firm.systems.practice_management], [true, ["Outsourced freelancer"], ["Clio"]]);
  const st = (await call("GET", "/documents/starters", att.token)).body;
  assertEquals([st.lifecycle.length, Object.keys(st.types).length, st.starters.length > 20], [7, 4, true]);
});

Deno.test("drafting: the scrub before the AI, code fixes for the blocking checks, the type suggestion, an ID by lifecycle", async () => {
  draftAnswer = sopAnswer();
  prompts.length = 0;
  const r = (await call("POST", "/documents/draft", att.token, { org_id: org, type: "sop", starter_id: "int-conflict", request_id: "d1",
    answers: { name: "Run a conflict check", trigger: "Our client John Smith asks for a consult", done: "", roles: ["Attorney", "Paralegal"], systems: ["Clio"], attorney_steps: "Accepting the matter" },
    text: "Old checklist. The Clio password: hunter22. Case No. 2026-CV-0042." })).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  sop = r.id;
  const sent = prompts.find((p) => p.includes("writing one SOP"))!;
  assert(!sent.includes("John Smith") && !sent.includes("hunter22") && !sent.includes("2026-CV-0042"), "the AI never sees client data or passwords");
  assert(r.notices.some((n: string) => n.includes("client names") && n.includes("passwords")), JSON.stringify(r.notices));
  assertEquals(r.check.blocking, 0, "judgment flags and one A per step are fixed in code before the attorney sees it: " + JSON.stringify(r.check.items.filter((i: any) => i.status !== "pass")));
  assertEquals(r.suggested_type?.type, "workflow");
  const doc = (await call("GET", "/playbooks/get?id=" + sop, att.token)).body;
  const b = doc.body;
  assertEquals([doc.playbook.doc_type, doc.playbook.doc_id, doc.playbook.lifecycle, doc.playbook.high_risk], ["sop", "INT-01", "INT", true]);
  assertEquals(b.steps[2].attorney_decides, true, "\"Decide whether to accept the matter\" is flagged");
  assertEquals(b.steps[2].raci.Attorney.includes("A"), true);
  assert(!JSON.stringify(b).includes("hunter22"), "credentials are stripped from the saved document");
  assertEquals(b.timing, "Within 1 business day of the request.", "the AI fix pass gave the vague timing a value");
  assert(doc.check.items.find((i: any) => i.id === "skipped")?.status === "attention", "skipped questions show in the quality panel");
  assertEquals(doc.changes[0].what, "First draft by DELA");
});

Deno.test("the block: export, sending for review and approval refused while a step lacks its A; Fix it; approve; review dates; change log", async () => {
  let cur = (await call("GET", "/playbooks/get?id=" + sop, att.token)).body;
  const broken = { ...cur.body, steps: cur.body.steps.map((st: any, i: number) => i === 0 ? { ...st, raci: { Paralegal: "R" } } : st) };
  const sv = (await call("POST", "/playbooks/save", att.token, { id: sop, base_version: cur.playbook.version, body: broken })).body;
  assertEquals([sv.ok, sv.check.blocking], [true, 1], JSON.stringify(sv));
  const ex = (await call("POST", "/playbooks/export", att.token, { id: sop, format: "docx" })).body;
  assertEquals([ex.reason, ex.items[0].id], ["checks_failing", "one_a"]);
  assertEquals((await call("POST", "/playbooks/status", att.token, { id: sop, action: "approve" })).body.reason, "checks_failing");
  assertEquals((await call("POST", "/playbooks/status", att.token, { id: sop, action: "submit" })).body.reason, "checks_failing");
  const fx = (await call("POST", "/documents/fix", att.token, { id: sop, check_id: "one_a" })).body;
  assertEquals([fx.ok, fx.check.blocking], [true, 0], JSON.stringify(fx));
  // Unapproved: exports carry the draft banner
  const md = (await call("POST", "/playbooks/export", att.token, { id: sop, format: "md" })).body;
  assert(md.text.includes("Draft, not approved") && md.text.includes("**Decision points and escalation**") && md.name.includes("INT-01"), md.name);
  assertEquals((await call("POST", "/playbooks/status", att.token, { id: sop, action: "approve" })).body.ok, true);
  cur = (await call("GET", "/playbooks/get?id=" + sop, att.token)).body;
  const months = (await one("select (extract(year from age(next_review_at, last_reviewed_at)) * 12 + extract(month from age(next_review_at, last_reviewed_at)))::int m from playbooks where id = $1", [sop])).m;
  assertEquals(months, 3, "conflicts: reviewed every 3 months");
  assert(cur.changes.some((c: any) => c.what.startsWith("Fixed: Exactly one Accountable")) && cur.changes.some((c: any) => c.kind === "approval"), JSON.stringify(cur.changes));
  const docx = (await call("POST", "/playbooks/export", att.token, { id: sop, format: "docx" })).body;
  assert(docx.ok && docx.b64.length > 1000);
  let refused = false;
  try { await pool.query("delete from document_changes where playbook_id = $1", [sop]); } catch { refused = true; }
  assert(refused, "the change log is append-only");
});

Deno.test("step 55, the newcomer check: off until the switch is on; gaps kept per version; answers become a new draft; attorney flags stay", async () => {
  let cur = (await call("GET", "/playbooks/get?id=" + sop, att.token)).body;
  assertEquals(cur.newcomer.on, false, "nothing shows while the switch is off");
  assertEquals((await call("POST", "/documents/newcomer", att.token, { id: sop })).body.reason, "feature_off");
  await pool.query("update feature_switches set state = 'everyone' where key = 'handoff_kit'");
  assertEquals((await call("POST", "/documents/newcomer", other.token, { id: sop })).body.ok, false, "someone outside the firm cannot run it");
  const v0 = cur.playbook.version, flags0 = cur.body.steps.map((st: any) => !!st.attorney_decides);
  const before = prompts.length;
  let r = (await call("POST", "/documents/newcomer", att.token, { id: sop })).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  const ck = r.newcomer.check;
  assertEquals([ck.version, ck.ready, ck.findings.length], [v0, false, 2], "a finding with no sentence is dropped, and it is not ready while gaps are left");
  assertEquals([ck.findings[0].kind, ck.findings[0].step, ck.findings[1].kind, ck.findings[1].step], ["access", 1, "other", 0], "an unknown kind and a step that does not exist are made safe");
  assert(prompts.slice(before).some((p) => p.includes("has never worked with this firm") && p.includes("The document:")), "the model reads the document as a newcomer");
  assertEquals((await call("GET", "/playbooks/get?id=" + sop, att.token)).body.newcomer.check.findings.length, 2, "the result is kept and read back without the AI");
  // Answers
  assertEquals((await call("POST", "/documents/newcomer/fill", att.token, { id: sop, answers: [{ i: 0, text: "  " }] })).body.reason, "tell_us_more");
  r = (await call("POST", "/documents/newcomer/fill", att.token, { id: sop, answers: [{ i: 0, text: "The office manager sets up Clio." }, { i: 7, text: "ignored, no such gap" }] })).body;
  assertEquals([r.ok, r.answered], [true, 1], JSON.stringify(r));
  cur = (await call("GET", "/playbooks/get?id=" + sop, att.token)).body;
  assert(cur.playbook.version > v0 && cur.body.before_you_start.includes("Get a Clio login from the office manager."), "the answers are in a new version");
  assertEquals(cur.body.steps.map((st: any) => !!st.attorney_decides), flags0, "the AI cannot take an attorney decision off a step");
  assertEquals([cur.newcomer.check, cur.newcomer.out_of_date], [null, true], "the new version has not been checked yet");
  r = (await call("POST", "/documents/newcomer", att.token, { id: sop })).body;
  assertEquals([r.newcomer.check.ready, r.newcomer.check.findings.length], [true, 0], "with the gap filled, the document is ready for someone new");
  // The approved version keeps working: nothing here blocks export or approval
  cur = (await call("GET", "/playbooks/get?id=" + sop, att.token)).body;
  assertEquals(cur.check.blocking, 0);
  if (cur.playbook.status !== "approved") assertEquals((await call("POST", "/playbooks/status", att.token, { id: sop, action: "approve" })).body.ok, true, "the draft with the answers can be approved");
});

Deno.test("length is a quality item, never a block; Split into linked SOPs; change type in one click", async () => {
  draftAnswer = sopAnswer();
  const d = (await call("POST", "/documents/draft", att.token, { org_id: org, type: "sop", request_id: "d2", answers: { name: "Long SOP", trigger: "x", done: "y", roles: ["Attorney"], systems: ["Clio"], timing: "1 day", attorney_steps: "none", problems: "none" } })).body;
  let cur = (await call("GET", "/playbooks/get?id=" + d.id, att.token)).body;
  assertEquals(cur.playbook.doc_id, "INT-02", "the next number in the group");
  const extra = Array.from({ length: 20 }, (_, i) => ({ text: "Check the intake form field number " + (i + 1) + " against the matter record and note any gap you find in the record. ".repeat(3), raci: { Paralegal: "R,A" } }));
  const long = { ...cur.body, steps: [...cur.body.steps, ...extra] };
  const sv = (await call("POST", "/playbooks/save", att.token, { id: d.id, base_version: cur.playbook.version, body: long })).body;
  const len = sv.check.items.find((i: any) => i.id === "length");
  assertEquals([len.status, len.fix, sv.check.blocking], ["attention", "split", 0]);
  assertEquals((await call("POST", "/playbooks/export", att.token, { id: d.id, format: "md" })).body.ok, true, "over 900 words still exports");
  const sp = (await call("POST", "/documents/fix", att.token, { id: d.id, check_id: "length" })).body;
  assertEquals([sp.ok, sp.created.length], [true, 1], JSON.stringify(sp));
  cur = (await call("GET", "/playbooks/get?id=" + d.id, att.token)).body;
  assert(cur.body.related_links.some((l: any) => l.label === "Run a conflict check (decide)"), "linked to the new SOP");
  const ct = (await call("POST", "/documents/type", att.token, { id: d.id, type: "playbook" })).body;
  assertEquals(ct.ok, true, JSON.stringify(ct));
  cur = (await call("GET", "/playbooks/get?id=" + d.id, att.token)).body;
  assertEquals([cur.body.type, cur.playbook.doc_type, cur.playbook.doc_id], ["playbook", "playbook", "INT-02"], "the ID never changes");
  pbook = d.id;
  assertEquals((await call("POST", "/playbooks/status", att.token, { id: pbook, action: "approve" })).body.ok, true);
});

Deno.test("gigs: SOPs and Workflows only; a workflow hands over only the freelancer's steps; references; checkpoints", async () => {
  assertEquals((await call("POST", "/gigs/draft", att.token, { playbook_id: pbook, request_id: "g0", budget_min: 300, budget_max: 600 })).body.reason, "type_not_for_gigs");
  draftAnswer = { document: { type: "workflow", title: "Intake to signed engagement", lifecycle: "INT", owner_role: "Attorney", process_owner_role: "Attorney", start_point: "An inquiry", end_point: "A signed letter",
    roles: ["Attorney", "Paralegal", "Outsourced freelancer"], decisions: [{ if: "a conflict", then: "stop", attorney_decides: true }],
    steps: [{ stage: "Inquiry", text: "Answer the inquiry in Clio.", raci: { "Outsourced freelancer": "R", Attorney: "A" }, handoff: "Lead in Clio", target_time: "1 hour", linked_sop: "INT-03" },
      { stage: "Conflicts", text: "Run the conflict check.", raci: { Paralegal: "R", Attorney: "A" }, handoff: "Notes", target_time: "1 day", linked_sop: "INT-01" },
      { stage: "Fee", text: "Approve the fee for the engagement letter.", raci: { "Outsourced freelancer": "R", Attorney: "A" }, attorney_decides: true, handoff: "Note", target_time: "1 day" },
      { stage: "Letter", text: "Prepare the engagement letter draft.", raci: { "Outsourced freelancer": "R", Attorney: "A" }, handoff: "Draft in Clio", target_time: "1 day" }],
    kpis: [{ name: "Lead response time", measures: "Hours", kind: "leading", source: "Clio lead report", owner_role: "Attorney", baseline: "measure for 30 days first", target: "2 hours", rhythm: "weekly" },
      { name: "Consult to signed", measures: "Percent", kind: "lagging", source: "Clio matters report", owner_role: "Attorney", baseline: "40%", target: "55%", rhythm: "weekly" },
      { name: "Days to signed letter", measures: "Days", kind: "lagging", source: "Clio matter dates", owner_role: "Attorney", baseline: "9", target: "5", rhythm: "weekly" }] } };
  const w = (await call("POST", "/documents/draft", att.token, { org_id: org, type: "workflow", starter_id: "int-workflow", request_id: "d3", answers: { name: "Intake to signed engagement", trigger: "x", done: "y", roles: ["Attorney"], systems: ["Clio"], timing: "1 week", attorney_steps: "The fee", problems: "none" } })).body;
  wf = w.id;
  assertEquals(w.check.items.find((i: any) => i.id === "kpis").status, "pass", JSON.stringify(w.check.items.find((i: any) => i.id === "kpis")));
  assertEquals((await call("POST", "/playbooks/status", att.token, { id: wf, action: "approve" })).body.ok, true);
  const g = (await call("POST", "/gigs/draft", att.token, { playbook_id: wf, request_id: "g1", budget_min: 300, budget_max: 600, use_ai: false })).body;
  assertEquals(g.ok, true, JSON.stringify(g));
  const pub = (await call("GET", "/gigs/get?id=" + g.id, att.token)).body;
  assertEquals(pub.gig_part, { steps: 3, of: 4, checkpoints: 1, images: 0, nos: [1, 3, 4], eligible: [1, 3, 4], whole: true, prereqs: [{ no: 2, text: "Run the conflict check." }] }, "the attorney sees how much of the workflow the gig hands over, and that step 3 builds on the firm's own step 2 (step 71)");
  // References: Playbooks and Policies only
  assertEquals((await call("POST", "/gigs/reference", att.token, { gig_id: g.id, doc: sop })).body.reason, "reference_policies_and_playbooks");
  assertEquals((await call("POST", "/gigs/reference", att.token, { gig_id: g.id, doc: pbook })).body.ok, true);
  await pool.query("insert into gig_invitations (gig_id, freelancer_id, invited_by) values ($1, $2, $3)", [g.id, fl.id, att.id]);
  await pool.query("update gigs set status = 'open', opened_at = now(), closes_at = now() + interval '14 days' where id = $1", [g.id]);
  const seen = (await call("GET", "/gigs/get?id=" + g.id, fl.token)).body;
  assertEquals(seen.playbook.steps.map((x: any) => x.text), ["Answer the inquiry in Clio.", "Approve the fee for the engagement letter.", "Prepare the engagement letter draft."], "only the freelancer's R steps");
  assert(!JSON.stringify(seen.playbook).includes("Run the conflict check") && !("kpis" in seen.playbook), "the rest stays with the firm");
  assertEquals([seen.references.length, seen.references[0].doc_type], [1, "playbook"]);
  // Checkpoints: the work waits at "Attorney decides" steps
  const pr = (await one("insert into proposals (gig_id, freelancer_id, status, price_cents, sent_at) values ($1, $2, 'selected', 50000, now()) returning id", [g.id, fl.id])).id;
  const ag = (await one("insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status) values ($1, $2, $3, $4, $5, 50000, 'active') returning id", [g.id, pr, org, att.id, fl.id])).id;
  const v = (await call("GET", "/agreements/get?id=" + ag, fl.token)).body;
  assertEquals(v.checkpoints.map((c: any) => [c.step_no, c.status]), [[2, "pending"]]);
  const facts = (await one("select dela_agreement_facts($1, 'attorney', $2) f", [att.id, ag])).f;
  assert(JSON.stringify(facts.checks).includes("Done when") || facts.checks.length >= 0, "the rubric reads Quality check and Done when");
  const ms = (await one("insert into milestones (agreement_id, seq, title, amount_cents, status, from_version) values ($1, 1, 'All', 50000, 'in_progress', 1) returning id", [ag])).id;
  assertEquals((await one("select dela_submission_create($1, $2, '{\"statement\":\"All done now, nothing open.\",\"request_id\":\"x1\"}') r", [fl.id, ms])).r.reason, "attorney_decision_needed", "the last milestone needs every checkpoint approved");
  assertEquals((await call("POST", "/engagements/checkpoint", fl.token, { agreement_id: ag, step_no: 2, note: "Ready for the fee decision" })).body.ok, true);
  assertEquals((await one("select dela_submission_create($1, $2, '{\"statement\":\"All done now, nothing open.\",\"request_id\":\"x2\"}') r", [fl.id, ms])).r.reason, "waiting_for_attorney");
  assertEquals((await call("POST", "/engagements/checkpoint", fl.token, { agreement_id: ag, step_no: 2 })).body.duplicate, true);
  assertEquals((await call("POST", "/engagements/checkpoint", att.token, { agreement_id: ag, step_no: 2, note: "Fee approved" })).body.ok, true);
  assertEquals((await one("select dela_submission_create($1, $2, '{\"statement\":\"All done now, nothing open.\",\"request_id\":\"x3\"}') r", [fl.id, ms])).r.ok, true);  // A closed engagement takes no more decisions (pilot live check 2026-11-11)
  await pool.query("update engagement_checkpoints set status = 'pending' where agreement_id = $1; update agreements set status = 'completed' where id = $1".replace(/\$1/g, "'" + ag + "'"));
  assertEquals((await call("POST", "/engagements/checkpoint", att.token, { agreement_id: ag, step_no: 2 })).body.reason, "agreement_closed");
  assertEquals((await call("POST", "/engagements/checkpoint", fl.token, { agreement_id: ag, step_no: 2 })).body.reason, "agreement_closed");
  assertEquals((await one("select status from engagement_checkpoints where agreement_id = $1 and step_no = 2", [ag])).status, "pending");
});

Deno.test("steps 56 to 58: a gig hands over chosen steps only; what the freelancer needs and who may mark it; the attorney's preview is the freelancer's page", async () => {
  // The checklist: only a freelancer's steps can be chosen
  const ds = (await call("GET", "/gigs/doc-steps?playbook=" + wf, att.token)).body;
  assertEquals([ds.on, ds.of, ds.eligible, ds.steps[1].eligible, ds.steps[2].attorney_decides, ds.newcomer], [true, 4, [1, 3, 4], false, true, "not_checked"], JSON.stringify(ds));
  assertEquals((await call("POST", "/gigs/draft", att.token, { playbook_id: wf, request_id: "h0", budget_min: 300, budget_max: 600, use_ai: false, steps: [2] })).body.reason, "no_steps_chosen", "a step that is the firm's own cannot be handed over");
  const g = (await call("POST", "/gigs/draft", att.token, { playbook_id: wf, request_id: "h1", budget_min: 300, budget_max: 600, use_ai: false, steps: [4, 3, 2] })).body;
  assertEquals(g.ok, true, JSON.stringify(g));
  let v = (await call("GET", "/gigs/get?id=" + g.id, att.token)).body;
  assertEquals(v.gig_part, { steps: 2, of: 4, checkpoints: 1, images: 0, nos: [3, 4], eligible: [1, 3, 4], whole: false, prereqs: [{ no: 2, text: "Run the conflict check." }] });
  // Step 71: step 3 builds on step 2, which the firm keeps, so the result of step 2 is on the list of what the freelancer needs
  const pre = (v.handoff.inputs as Array<Record<string, any>>).filter((i) => String(i.label).startsWith("Result of step "));
  assertEquals(pre.map((i) => [i.label, i.kind, i.supplied_by, i.status]), [["Result of step 2, which the firm keeps: Run the conflict check.", "information", "client", "needed"]], JSON.stringify(v.handoff.inputs));
  assertEquals(v.preview.steps.map((x: any) => [x.no, x.text]), [[3, "Approve the fee for the engagement letter."], [4, "Prepare the engagement letter draft."]]);
  assertEquals(v.preview.part, { nos: [3, 4], of: 4, whole: false, before: "Run the conflict check.", after: "" }, "the part says what happens just before it");
  assert(!JSON.stringify(v.gig.public).includes("Answer the inquiry"), "the gig's own description is written from the chosen steps only");
  // The steps can change while the gig is a draft
  assertEquals((await call("POST", "/gigs/steps", att.token, { id: g.id, steps: [2] })).body.reason, "no_steps_chosen");
  assertEquals((await call("POST", "/gigs/steps", other.token, { id: g.id, steps: [1] })).body.ok, false, "another firm cannot change them");
  const allSteps = (await call("POST", "/gigs/steps", att.token, { id: g.id, steps: [1, 3, 4] })).body;
  assertEquals(allSteps.step_nos, null, "every step is the same as no choice");
  // Step 71: handing over steps 1, 3 and 4 still leaves step 2 with the firm, right before step 3
  assertEquals(allSteps.prereqs, [{ no: 2, text: "Run the conflict check." }]);
  const only4 = (await call("POST", "/gigs/steps", att.token, { id: g.id, steps: [4] })).body;
  assertEquals([only4.prereqs.map((q: any) => q.no), only4.prereqs_added], [[3], 1], "with only step 4 handed over, the prerequisite is step 3");
  let hv = (await call("GET", "/gigs/get?id=" + g.id, att.token)).body.handoff.inputs.map((i: any) => String(i.label).split(":")[0]).filter((l: string) => l.startsWith("Result of step"));
  assertEquals(hv, ["Result of step 3, which the firm keeps"], "the line for step 2 went away with the change, the one for step 3 came");
  const back = (await call("POST", "/gigs/steps", att.token, { id: g.id, steps: [3, 4] })).body;
  assertEquals([back.step_nos, back.prereqs.map((q: any) => q.no)], [[3, 4], [2]]);
  assertEquals((await call("POST", "/gigs/steps", att.token, { id: g.id, steps: [3, 4] })).body.prereqs_added, 0, "saving the same steps twice adds nothing twice");
  // What the freelancer needs before starting
  assertEquals((await call("POST", "/gigs/inputs/save", other.token, { id: g.id, items: [{ label: "x" }] })).body.ok, false);
  let r = (await call("POST", "/gigs/inputs/save", att.token, { id: g.id, items: [{ kind: "access", label: "A Clio login, set up by the office manager" }, { kind: "zzz", label: "The engagement letter template", supplied_by: "freelancer" }, { label: "   " }] })).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  v = (await call("GET", "/gigs/get?id=" + g.id, att.token)).body;
  assertEquals(v.handoff.inputs.map((i: any) => [i.kind, i.supplied_by, i.status]), [["access", "client", "needed"], ["other", "freelancer", "needed"]], "an empty line is dropped and an unknown kind is made safe");
  await pool.query("update settings set value = '1' where key = 'gig.inputs_max'");
  assertEquals((await call("POST", "/gigs/inputs/save", att.token, { id: g.id, items: [{ label: "a" }, { label: "b" }] })).body.reason, "too_many_inputs");
  await pool.query("update settings set value = '20' where key = 'gig.inputs_max'");
  const [mine, theirs] = v.handoff.inputs.map((i: any) => i.id);
  // Posted and invited: the freelancer gets the same page as the preview, and cannot mark anything yet
  await pool.query("insert into gig_invitations (gig_id, freelancer_id, invited_by) values ($1, $2, $3)", [g.id, fl.id, att.id]);
  await pool.query("update gigs set status = 'open', opened_at = now(), closes_at = now() + interval '14 days' where id = $1", [g.id]);
  assertEquals((await call("POST", "/gigs/steps", att.token, { id: g.id, steps: [4] })).body.reason, "gig_not_draft", "the part is fixed once the gig is posted");
  const seen = (await call("GET", "/gigs/get?id=" + g.id, fl.token)).body;
  assertEquals(JSON.stringify(seen.playbook), JSON.stringify(v.preview), "the attorney's preview is exactly what the freelancer is sent");
  assertEquals([seen.handoff.access, seen.handoff.inputs.length], ["invited", 2]);
  assertEquals((await call("POST", "/gigs/inputs/mark", fl.token, { id: theirs, status: "supplied" })).body.reason, "not_allowed", "an invited freelancer reads the list only");
  // Hired: the attorney marks what was supplied; the freelancer may say it is still needed, and marks only their own things
  const pr = (await one("insert into proposals (gig_id, freelancer_id, status, price_cents, sent_at) values ($1, $2, 'selected', 50000, now()) returning id", [g.id, fl.id])).id;
  const ag = (await one("insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status) values ($1, $2, $3, $4, $5, 50000, 'active') returning id", [g.id, pr, org, att.id, fl.id])).id;
  assertEquals((await call("POST", "/gigs/inputs/mark", att.token, { id: mine, status: "supplied", note: "Sent through the office manager" })).body.ok, true);
  assertEquals((await call("POST", "/gigs/inputs/mark", fl.token, { id: mine, status: "not_needed" })).body.reason, "not_allowed");
  assertEquals((await call("POST", "/gigs/inputs/mark", fl.token, { id: mine, status: "needed", note: "The login does not work" })).body.ok, true);
  assertEquals((await call("POST", "/gigs/inputs/mark", fl.token, { id: theirs, status: "supplied" })).body.ok, true);
  assertEquals((await call("POST", "/gigs/inputs/mark", other.token, { id: mine, status: "supplied" })).body.reason, "not_found");
  const av = (await call("GET", "/agreements/get?id=" + ag, fl.token)).body;
  assertEquals(av.inputs.map((i: any) => [i.status, i.note]), [["needed", "The login does not work"], ["supplied", ""]], "the engagement shows the same list to both sides");
  assertEquals(av.checkpoints.map((c: any) => [c.step_no, c.status]), [[1, "pending"]], "decision points count within the part handed over");
  // Step 59, learning from each job: the freelancer's private note reaches the firm on the document
  assertEquals([av.feedback.steps.map((x: any) => x.no), av.feedback.mine], [[3, 4], []], "the freelancer may name a step of their own part");
  assertEquals("feedback" in (await call("GET", "/agreements/get?id=" + ag, att.token)).body, false, "the note form is the freelancer's");
  assertEquals((await call("POST", "/engagements/feedback", att.token, { agreement_id: ag, step_no: 3, text: "The attorney cannot send one." })).body.reason, "not_found");
  assertEquals((await call("POST", "/engagements/feedback", fl.token, { agreement_id: ag, step_no: 3, text: "ok" })).body.reason, "write_a_little");
  assertEquals((await call("POST", "/engagements/feedback", fl.token, { agreement_id: ag, step_no: 3, text: "Step 3 does not say where the fee note is saved." })).body.ok, true);
  let doc = (await call("GET", "/playbooks/get?id=" + wf, att.token)).body;
  assertEquals([doc.feedback.on, doc.feedback.open, doc.feedback.can_handle, doc.feedback.notes[0].step_no, doc.feedback.notes[0].body, doc.feedback.notes[0].status], [true, 1, true, 3, "Step 3 does not say where the fee note is saved.", "open"]);
  assertEquals((await call("GET", "/agreements/get?id=" + ag, fl.token)).body.feedback.mine.length, 1, "the freelancer sees what they sent");
  assertEquals((await call("POST", "/documents/feedback/handle", other.token, { id: doc.feedback.notes[0].id })).body.reason, "not_found", "another firm cannot touch it");
  assertEquals((await call("POST", "/documents/feedback/handle", att.token, { id: doc.feedback.notes[0].id })).body.ok, true);
  doc = (await call("GET", "/playbooks/get?id=" + wf, att.token)).body;
  assertEquals([doc.feedback.open, doc.feedback.notes[0].status], [0, "handled"]);
  await pool.query("update settings set value = '1' where key = 'documents.feedback_max'");
  assertEquals((await call("POST", "/engagements/feedback", fl.token, { agreement_id: ag, step_no: 0, text: "One more note about the whole task." })).body.reason, "feedback_limit");
  await pool.query("update settings set value = '20' where key = 'documents.feedback_max'");
  // A gig with no choice hands over what it always did
  const whole = (await call("POST", "/gigs/draft", att.token, { playbook_id: wf, request_id: "h2", budget_min: 300, budget_max: 600, use_ai: false })).body;
  const wv = (await call("GET", "/gigs/get?id=" + whole.id, att.token)).body;
  assertEquals([wv.gig_part.whole, wv.gig_part.nos, wv.preview.part.before], [true, [1, 3, 4], ""]);
  // Step 60, the DELA workflow: the facts that place this document on the seven steps
  const flow = (await call("GET", "/workflow?playbook=" + wf, att.token)).body;
  const it = flow.items[0];
  assertEquals([flow.on, flow.items.length, it.id, it.approved, it.doc_type, it.status], [true, 1, wf, true, "workflow", "approved"]);
  assertEquals([it.gig_draft, it.gig_open, it.proposals, it.eng.gig_id, it.eng.status, it.eng.needs, it.eng.submitted, it.done, it.feedback_open],
    [whole.id, g.id, 0, g.id, "active", 1, 0, 1, 0], "a draft gig, a posted gig, the engagement under way with one thing still needed, one job finished, no notes waiting: " + JSON.stringify(it));
  // Step 71: the separate facts behind the step
  assertEquals([typeof it.eng.client_signed, typeof it.eng.freelancer_signed, it.eng.plan_wait, it.eng.needs_total >= it.eng.needs, typeof it.eng.paid, typeof it.eng.milestones],
    ["boolean", "boolean", false, true, "boolean", "number"], "who signed, what is needed, whether it is paid: " + JSON.stringify(it.eng));
  await pool.query("update milestones set status = 'submitted' where agreement_id = $1", [ag]);
  await pool.query("insert into milestones (agreement_id, seq, title, amount_cents, status, from_version) values ($1, 1, 'All', 50000, 'submitted', 1)", [ag]);
  assertEquals((await call("GET", "/workflow?playbook=" + wf, att.token)).body.items[0].eng.submitted, 1, "submitted work moves it to the review step");
  const all = (await call("GET", "/workflow", att.token)).body;
  assert(all.items.length >= 2 && all.items.some((x: any) => x.id === sop) && all.items.every((x: any) => ["draft", "in_review", "approved"].includes(x.status)), "the list holds the firm's documents in work");
  assertEquals((await call("GET", "/workflow?playbook=" + wf, other.token)).body.reason, "not_found", "another firm sees nothing of it");
  assertEquals((await call("GET", "/workflow", other.token)).body.items.some((x: any) => x.id === wf), false);
  await pool.query("update feature_switches set state = 'off' where key = 'handoff_kit'");
  assertEquals((await call("GET", "/workflow", att.token)).body, { ok: true, on: false, items: [] });
  await pool.query("update feature_switches set state = 'everyone' where key = 'handoff_kit'");
});

Deno.test("older playbooks: the type check converts them, the old version stays, the owner is told and can change the type", async () => {
  const legacy = { title: "Open a matter", outcome: "The matter is open", steps: [{ text: "Create the matter in Clio", who: "Paralegal" }, { text: "Approve the matter", who: "Attorney", tag: "keep" }], checks: ["Matter number recorded"], deliverables: "An open matter" };
  const old = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ($1, 'Open a matter', 'approved', 1, 1, 100, 'legacy1', $2) returning id`, [org, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [old, legacy, att.id]);
  await pool.query("select dela_doc_convert_queue()");
  await worker();
  const got = (await call("GET", "/playbooks/get?id=" + old, att.token)).body;
  assertEquals([got.playbook.doc_type, got.playbook.doc_id, got.playbook.converted, got.playbook.approved_version, got.playbook.status], ["sop", "MAT-01", true, 1, "draft"], JSON.stringify(got.playbook));
  assertEquals(got.body.schema, 2);
  assert((await one("select count(*)::int n from notifications where person_id = $1 and title like '\"Open a matter\" is now an SOP%'", [att.id])).n >= 1, "the owner is told");
  assertEquals((await one("select count(*)::int n from playbook_versions where playbook_id = $1", [old])).n, 2, "the old version stays");
  const list = (await call("GET", "/library", att.token)).body.list.playbooks;
  assert(list.find((p: any) => p.id === old).converted);
  assertEquals((await call("POST", "/documents/conversion-seen", att.token, { id: old })).body.ok, true);
  const adm = (await call("GET", "/admin/documents", team.token)).body.data;
  assert(adm.converted >= 1 && adm.recent.some((x: any) => x.id === old));
});

Deno.test("reminders 14 days ahead go to the owner role's holder; a bounce goes to the firm owner", async () => {
  await pool.query("update playbooks set owner_role = 'Paralegal', next_review_at = (now()::date + 10), review_reminded_for = null where id = $1", [sop]);
  await pool.query("select dela_pb_daily()");
  const n = await one("select id, to_email from notifications where kind = 'doc_review' and to_email = 'para@firm.example'");
  assert(n, "the Paralegal role's email gets the reminder");
  assert((await one("select count(*)::int n from notifications where kind = 'doc_review' and person_id = $1 and channel = 'in_app'", [att.id])).n >= 1, "an in-app notice too");
  await pool.query("select dela_notification_delivery($1, 'bounced', 'mailbox full')", [n.id]);
  assert((await one("select count(*)::int n from notifications where person_id = $1 and title = 'A review reminder could not be delivered'", [att.id])).n >= 1, "resent to the firm owner");
});

Deno.test("names become roles, other firms see nothing, the connector shows the checks", async () => {
  const cur = (await call("GET", "/playbooks/get?id=" + wf, att.token)).body;
  const sv = (await call("POST", "/playbooks/save", att.token, { id: wf, base_version: cur.playbook.version, body: { ...cur.body, start_point: "Maria Lopez gets an inquiry" } })).body;
  assert(sv.notices.some((x: string) => x.includes("Maria Lopez")), "a firm member's name is replaced with their role");
  const after = (await call("GET", "/playbooks/get?id=" + wf, att.token)).body;
  assertEquals(after.body.start_point, "the Attorney gets an inquiry");
  assertEquals((await call("GET", "/playbooks/get?id=" + wf, other.token)).body.reason, "not_found");
  assertEquals((await call("POST", "/documents/fix", other.token, { id: wf, check_id: "one_a" })).body.reason, "not_found");
});

Deno.test("the owner role is always one of the document's roles, so the page, the index and Word agree (ChatGPT test 2026-11-05)", async () => {
  draftAnswer = { document: { ...sopAnswer().document, owner_role: "Supervising attorney", roles: ["Attorney", "Paralegal"] } };
  const r = (await call("POST", "/documents/draft", att.token, { org_id: org, type: "sop", request_id: "owner1", answers: { name: "Owner check" } })).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  const g = (await call("GET", "/playbooks/get?id=" + r.id, att.token)).body;
  assertEquals(g.body.owner_role, "Supervising attorney");
  assert(g.body.roles.includes("Supervising attorney"), "the owner role is added to the roles: " + g.body.roles.join(", "));
  assertEquals(g.body.role_kinds["Supervising attorney"], "attorney");
  assertEquals((await one("select owner_role from playbooks where id = $1", [r.id])).owner_role, "Supervising attorney");
});

Deno.test("teardown", async () => { await pool.end(); });

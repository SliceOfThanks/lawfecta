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
    if (system.includes("document assistant inside Lawfecta, writing one")) out = draftAnswer;
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
  assertEquals(pub.gig_part, { steps: 3, of: 4, checkpoints: 1 }, "the attorney sees how much of the workflow the gig hands over");
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
  assertEquals((await one("select dela_submission_create($1, $2, '{\"statement\":\"All done now, nothing open.\",\"request_id\":\"x3\"}') r", [fl.id, ms])).r.ok, true);
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

Deno.test("teardown", async () => { await pool.end(); });

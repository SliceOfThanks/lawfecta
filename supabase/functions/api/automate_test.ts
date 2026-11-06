// Step 4d, part C: "✦ Automate or delegate" through the real api and database, with an OpenAI stand-in that also tries to
// break the rules: it never delegates an attorney decision or a judgment step, never the whole document, never names a tool
// outside the firm's systems (the catalog is off), ranks only by time saved, one review per approved version (no second
// charge), time saved from the attorney's answers or DELA's estimate, the delegate path saved step by step (steps, the SOP
// for just those steps with the attorney as A, KPIs as its quality check, approval and the gig by an attorney only, the
// suggested budget with the client fee), "Hire a freelancer to set it up" with the tool on the gig, "Add this tool to the
// steps", and a review going out of date when a new version is approved.
//   deno test -A supabase/functions/api/automate_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { hoursSaved, readRecommendations, suggestBudget } from "./lib/automate/model.ts";
import { normalizeDoc } from "./lib/documents/model.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "E".repeat(40); // rules-ok: a made-up test key
const prompts: string[] = [];
let aiCalls = 0;
const REVIEW = {
  estimate: { frequency: "weekly", minutes: 90 },
  recommendations: [
    { kind: "delegate", title: "Collect and log intake forms", steps: [1, 2, 3], why: "Repeatable with clear inputs.", share: 0.4, skills: ["Intake"], hours_each: 1.5 },
    { kind: "delegate", title: "Draft and decide", steps: [4, 5], why: "Includes a decision.", share: 0.3 },
    { kind: "automate", title: "Send reminders", steps: [2], why: "A tool can send them.", share: 0.1, tool: "Zapier", what_it_does: "Sends reminders" },
    { kind: "automate", title: "Log the forms in Clio", steps: [3], why: "Clio can log them.", share: 0.2, tool: "clio", what_it_does: "Logs each form" },
    { kind: "delegate", title: "Everything", steps: [1, 2, 3, 4, 5, 6], why: "All of it.", share: 1 },
    { kind: "delegate", title: "Advise the client", steps: [6], why: "Talk to the client.", share: 0.2 },
  ],
};
const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/chat/completions")) {
    const body = JSON.parse(String(init.body));
    const system = String(body.messages[0].content), user = String(body.messages.at(-1).content);
    prompts.push(system + "\n" + user);
    let out: unknown = {};
    if (system.includes("find specific groups of steps that could be automated")) { aiCalls++; out = REVIEW; }
    else if (body.response_format && system.includes("legal operations tool")) out = { client_info: false, kinds: [] };
    else if (system.includes("public version of a Flex Gig")) out = { title: "Intake help", task: "Collect and log intake forms.", outcome: "Forms logged", steps: ["Collect", "Log"], tools: [], timing: "2 hours", state: "TX", practice_area: "Family law", skills: [] };
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
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(k: number, plan: string, name: string): Promise<M> {
  const bd = 8_900_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, name, `au${bd}@test.invalid`])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
const STEP = (text: string, extra: Record<string, unknown> = {}) => ({ text, role: "Paralegal", raci: { Paralegal: "R", Attorney: "A" }, ...extra });
const PARENT = {
  schema: 2, type: "sop", title: "New client intake", lifecycle: "INT", owner_role: "Attorney", roles: ["Attorney", "Paralegal"], role_kinds: { Attorney: "attorney", Paralegal: "staff" },
  purpose: "Bring a new client in the same way every time.", scope: "Every new client.", trigger: "A client signs the engagement letter.", before_you_start: ["Access to Clio"],
  steps: [STEP("Send the intake questionnaire."), STEP("Send a reminder if it is not back in 2 days."), STEP("Log the returned form in the matter."), STEP("Draft the intake summary."),
    STEP("Decide whether the matter needs a second attorney.", { attorney_decides: true, role: "Attorney", raci: { Attorney: "R,A" } }), STEP("Advise the client on next steps.", { attorney_decides: true, role: "Attorney", raci: { Attorney: "R,A" } })],
  quality_check: ["The form is logged"], done_when: "The summary is in the matter.", kpis: [{ name: "Days to intake", measures: "Days", kind: "lagging", source: "Clio", owner_role: "Attorney", baseline: "", target: "2", rhythm: "Monthly" },
    { name: "Forms returned", measures: "Share", kind: "lagging", source: "Clio", owner_role: "Attorney", baseline: "", target: "90%", rhythm: "Monthly" }, { name: "Rework", measures: "Count", kind: "lagging", source: "Clio", owner_role: "Attorney", baseline: "", target: "0", rhythm: "Monthly" }],
};
let att: M, mgr: M, fl: M;
let org = "", pb = "", review = "", del = "", setup = "";

Deno.test("the rules in code: drop attorney decisions, judgment steps, the whole document, unknown tools; rank by time saved", () => {
  const body = normalizeDoc(PARENT);
  const r = readRecommendations(REVIEW, body, [{ name: "Clio", description: "Already in your firm profile.", partner: false, in_firm: true, tool_id: "" }], 5);
  assertEquals(r.recommendations.map((x) => [x.id, x.kind, x.steps, x.tool ?? ""]), [["r1", "delegate", [1, 2, 3], ""], ["r2", "automate", [3], "Clio"], ["r3", "delegate", [4], ""]]);
  assertEquals(r.recommendations[1].tool_description, "Already in your firm profile.", "the description comes from the list, never the AI");
  assertEquals(hoursSaved(0.4, "weekly", 90), 2.5);
  assertEquals(hoursSaved(0.4, "", null), 0);
  const b = suggestBudget(1.5, 4000, 7500, 25000, 500, 1000);
  assertEquals([b.low_cents, b.high_cents, b.fee_low_cents], [25000, 25000, 1250], "never below the smallest gig budget");
  assertEquals(suggestBudget(10, 4000, 7500, 25000, 500, 1000).high_cents, 75000);
});

Deno.test("setup: a verified attorney, a manager (library editor), a freelancer, an approved SOP", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('document_standard', 'playbook_library', 'flex_gigs', 'ai_generation', 'profiles')");
  await pool.query("update feature_switches set state = 'off' where key in ('automate_delegate', 'guided_setup', 'tech_catalog')");
  att = await member(1, "att_business", "Ann Attorney"); mgr = await member(2, "att_plus", "Max Manager"); fl = await member(3, "fl_plus", "Fran Free");
  await pool.query("insert into member_profiles (person_id, side, body, missing, score) values ($1, 'attorney', '{\"firm_name\":\"Auto Legal\",\"practice_areas\":[\"Family law\"]}', '{}', 100)", [att.id]);
  await pool.query(`insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) values ($1, 'l', 'TX', $2, $2, 'A', 'video', 'verified')`, [att.id, "AU" + att.bd]);
  await pool.query("select dela_profile_refresh($1, 'attorney')", [att.id]);
  org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  const fs = (await call("POST", "/documents/firm", att.token, { size: "2-5", practice_areas: ["Family law"], jurisdictions: "Texas", systems: { practice_management: ["Clio"] },
    roles: [{ name: "Attorney", kind: "attorney", person_id: att.id }, { name: "Paralegal", kind: "staff" }, { name: "Outsourced freelancer", kind: "freelancer" }] })).body;
  assert(fs.ok, JSON.stringify(fs));
  const tm = (await call("POST", "/playbooks/team", att.token, { org_id: org, bd_member_id: mgr.bd, role: "editor" })).body;
  assert(tm.ok !== false, JSON.stringify(tm));
  pb = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by, doc_type, lifecycle) values ($1, 'New client intake', 'approved', 1, 1, 100, $2, $3, 'sop', 'INT') returning id`, [org, "au-pb" + RUN, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb, PARENT, att.id]);
});

Deno.test("the switch off: nothing shows and no review runs", async () => {
  assertEquals((await call("GET", "/automate?playbook=" + pb, att.token)).body.on, false);
  assertEquals((await call("POST", "/automate/review", att.token, { playbook_id: pb })).body.reason, "automate_off");
  await pool.query("update feature_switches set state = 'everyone' where key = 'automate_delegate'");
});

Deno.test("the review: only when clicked, checked in code, one per approved version, time saved from the answers or the estimate", async () => {
  const st = (await call("GET", "/automate?playbook=" + pb, mgr.token)).body;
  assertEquals([st.on, st.can_run, st.review, st.dismissed, st.can_approve], [true, true, null, false, false], "a manager can run it but not approve");
  assertEquals(aiCalls, 0, "nothing runs on its own");
  assertEquals((await call("POST", "/automate/review", fl.token, { playbook_id: pb })).status, 403);
  assertEquals((await call("POST", "/automate/review", att.token, { playbook_id: pb, minutes: 0 })).body.reason, "bad_minutes");
  const r = (await call("POST", "/automate/review", mgr.token, { playbook_id: pb, frequency: "weekly", minutes: 120 })).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  review = r.review.id;
  const sent = prompts.find((p) => p.includes("find specific groups of steps"))!;
  assert(sent.includes("5. Decide whether the matter needs a second attorney. [attorney_decides]") && sent.includes("- Clio (the firm already uses it)") && !sent.includes("Zapier"), "the tools DELA may name");
  const recs = r.review.recommendations;
  assertEquals(recs.map((x: any) => [x.id, x.kind, x.steps, x.hours_month]), [["r1", "delegate", [1, 2, 3], 3.5], ["r2", "automate", [3], 1.5], ["r3", "delegate", [4], 1.5]]);
  assertEquals([r.review.time.estimated, recs[1].tool, recs[1].in_firm, recs[1].partner], [false, "Clio", true, false]);
  assertEquals((await call("POST", "/automate/review", att.token, { playbook_id: pb })).body.duplicate, true);
  assertEquals(aiCalls, 1, "one review per approved version, never charged twice");
  const est = (await call("POST", "/automate/review", att.token, { playbook_id: pb, frequency: "", minutes: null })).body;
  assertEquals([est.review.time.estimated, est.review.time.frequency, est.review.time.minutes, est.review.recommendations[0].hours_month], [true, "weekly", 90, 2.5], "empty boxes: DELA's estimate");
  assertEquals((await call("POST", "/automate/dismiss", att.token, { playbook_id: pb })).body.ok, true);
  assertEquals((await call("GET", "/automate?playbook=" + pb, att.token)).body.dismissed, true);
  assertEquals((await call("GET", "/automate?playbook=" + pb, mgr.token)).body.dismissed, false, "dismissing is per person");
});

Deno.test("delegate: the steps, the SOP for just those steps, KPIs as its quality check; an attorney approves and drafts the gig", async () => {
  const s = (await call("POST", "/automate/delegate", mgr.token, { review_id: review, rec_id: "r1" })).body;
  assertEquals(s.ok, true, JSON.stringify(s));
  del = s.delegation.id;
  assertEquals([s.delegation.stage, s.delegation.steps, s.parent_steps[4].attorney_decides, s.hours], [1, [1, 2, 3], true, 1.5]);
  assertEquals([s.budget.low_cents >= 25000, s.budget.fee_low_cents > 0], [true, true]);
  assertEquals((await call("POST", "/automate/delegate", mgr.token, { review_id: review, rec_id: "r2" })).body.reason, "not_found", "an automate suggestion is not delegated directly");
  assertEquals((await call("POST", "/automate/delegation", mgr.token, { id: del, steps: [1, 5] })).body.reason, "steps_not_delegable", "never an attorney decision");
  assertEquals((await call("POST", "/automate/delegation", mgr.token, { id: del, steps: [1, 6] })).body.reason, "steps_not_delegable", "never an attorney step");
  assertEquals((await call("POST", "/automate/delegation", mgr.token, { id: del, steps: [1, 2, 3, 4, 5, 6] })).body.reason, "steps_not_delegable");
  const k = (await call("POST", "/automate/delegation", mgr.token, { id: del, steps: [1, 2, 3], stage: 3, kpis: { turnaround_days: 3, accuracy_pct: 98, checklist: ["Every form is logged", "The reminder log is up to date"], done: "All forms logged in the matter." } })).body;
  assertEquals([k.delegation.stage, k.kpis.turnaround_days, k.kpis.checklist.length], [3, 3, 2]);
  const sop = (await call("POST", "/automate/delegation/sop", mgr.token, { id: del })).body;
  assertEquals([sop.ok, sop.check.blocking, sop.sop.status, sop.delegation.stage], [true, 0, "draft", 4], JSON.stringify(sop.check ?? sop));
  const doc = (await call("GET", "/playbooks/get?id=" + sop.sop.id, att.token)).body;
  const b = doc.body;
  assertEquals(b.steps.map((x: any) => x.text), ["Send the intake questionnaire.", "Send a reminder if it is not back in 2 days.", "Log the returned form in the matter."]);
  assert(b.steps.every((x: any) => x.raci.Attorney === "A" && x.raci["Outsourced freelancer"] === "R"), "the attorney stays A on every step");
  assertEquals([b.quality_check, b.done_when, b.kpis.map((x: any) => x.name)], [["Every form is logged", "The reminder log is up to date"], "All forms logged in the matter.", ["Turnaround time", "Accuracy", "First-pass approval"]]);
  assert(b.scope.startsWith("Steps 1 to 3 of") && b.related_links[0].label.startsWith("Delegated from"));
  assertEquals((await call("POST", "/automate/delegation/approve", mgr.token, { id: del })).body.reason, "attorney_approves");
  assertEquals((await call("POST", "/automate/delegation/gig", att.token, { id: del })).body.reason, "sop_not_approved");
  const ap = (await call("POST", "/automate/delegation/approve", att.token, { id: del })).body;
  assertEquals([ap.ok, ap.sop.status, ap.delegation.stage], [true, "approved", 5], JSON.stringify(ap));
  assertEquals((await call("POST", "/automate/delegation", mgr.token, { id: del, steps: [1, 2] })).body.reason, "sop_approved");
  assertEquals((await call("POST", "/automate/delegation/gig", mgr.token, { id: del, budget_min: 300, budget_max: 500 })).body.reason, "attorney_approves");
  const g = (await call("POST", "/automate/delegation/gig", att.token, { id: del, budget_min: 300, budget_max: 500 })).body;
  assertEquals([g.ok, !!g.gig_id], [true, true], JSON.stringify(g));
  const gig = await one("select playbook_id, status, budget_min_cents from gigs where id = $1", [g.gig_id]);
  assertEquals([gig.playbook_id, gig.status, gig.budget_min_cents], [sop.sop.id, "draft", 30000]);
  assertEquals((await call("POST", "/automate/delegation/gig", att.token, { id: del })).body.duplicate, true);
  const st = (await call("GET", "/automate?playbook=" + pb, att.token)).body;
  assertEquals(st.delegations.map((x: any) => [x.title, x.steps, x.sop_status]), [["Collect and log intake forms", [1, 2, 3], "approved"]], "the parent shows what was delegated");
});

Deno.test("automate: hire a freelancer to set it up (the tool on the gig), and add the tool to the steps", async () => {
  const s = (await call("POST", "/automate/delegate", att.token, { review_id: review, rec_id: "r2", kind: "setup" })).body;
  assertEquals([s.ok, s.delegation.kind, s.delegation.tool, s.delegation.title], [true, "setup", "Clio", "Set up Clio: Log the forms in Clio"], JSON.stringify(s));
  setup = s.delegation.id;
  const sop = (await call("POST", "/automate/delegation/sop", att.token, { id: setup })).body;
  assertEquals([sop.ok, sop.check.blocking], [true, 0], JSON.stringify(sop.check ?? sop));
  const b = (await call("GET", "/playbooks/get?id=" + sop.sop.id, att.token)).body.body;
  assert(b.steps.length === 4 && b.steps[1].text.includes("Set up Clio") && b.scope.startsWith("Setting up Clio for steps 3"));
  assert((await call("POST", "/automate/delegation/approve", att.token, { id: setup })).body.ok);
  const g = (await call("POST", "/automate/delegation/gig", att.token, { id: setup, budget_min: 300, budget_max: 600 })).body;
  assertEquals((await one("select public->'tools' t from gigs where id = $1", [g.gig_id])).t.includes("Clio"), true, "freelancers who list the tool match first");
  const a = (await call("POST", "/automate/apply-tool", mgr.token, { playbook_id: pb, rec_id: "r2" })).body;
  assertEquals([a.ok, a.tool, a.steps], [true, "Clio", [3]], JSON.stringify(a));
  const cur = (await call("GET", "/playbooks/get?id=" + pb, att.token)).body;
  assertEquals([cur.playbook.status, cur.body.steps[2].system], ["draft", "Clio"], "a change needs approving again");
  assertEquals((await call("POST", "/automate/apply-tool", mgr.token, { playbook_id: pb, rec_id: "r2" })).body.reason, "draft_waiting");
});

Deno.test("out of date: a new approved version needs a new review; the old one cannot start a delegation", async () => {
  const apv = (await call("POST", "/playbooks/status", att.token, { id: pb, action: "approve" })).body;
  assert(apv.ok, JSON.stringify(apv));
  const st = (await call("GET", "/automate?playbook=" + pb, att.token)).body;
  assertEquals([st.review, st.out_of_date, st.approved_version], [null, true, 2]);
  assertEquals((await call("POST", "/automate/delegate", att.token, { review_id: review, rec_id: "r3" })).body.reason, "review_out_of_date");
  assertEquals((await call("POST", "/automate/review", att.token, { playbook_id: pb })).body.review.version, 2);
  assertEquals(aiCalls, 2);
});

Deno.test("Get set up: six steps worked out from what the attorney did, Skip for now, the Home card dismissed", async () => {
  assertEquals((await call("GET", "/setup", att.token)).body.on, false);
  await pool.query("update feature_switches set state = 'everyone' where key = 'guided_setup'");
  const st = (await call("GET", "/setup", att.token)).body;
  assertEquals(st.steps.map((x: any) => [x.key, x.done]), [["profile", true], ["firm", true], ["playbook", true], ["automate", true], ["gig", false], ["invite", false]]);
  assertEquals([st.done, st.total, st.finished, st.dismissed], [4, 6, false, false]);
  assertEquals((await call("GET", "/setup", fl.token)).body.reason, "attorneys_only");
  assertEquals((await call("POST", "/setup", att.token, { step: "nope", skip: true })).body.reason, "bad_step");
  const sk = (await call("POST", "/setup", att.token, { step: "invite", skip: true })).body;
  assertEquals([sk.done, sk.skipped], [5, ["invite"]], "a skipped step counts as handled");
  assertEquals((await call("POST", "/setup", att.token, { step: "invite", skip: false })).body.done, 4, "and can be picked up again");
  assertEquals((await call("POST", "/setup", att.token, { dismissed: true })).body.dismissed, true);
  const fresh = (await call("GET", "/setup", mgr.token)).body;
  assertEquals([fresh.done, fresh.dismissed], [0, false], "a new attorney starts at 0 of 6");
});

Deno.test("teardown", async () => { await pool.end(); });

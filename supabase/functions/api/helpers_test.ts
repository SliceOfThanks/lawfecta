// UX review Phase 4 part B (docs/briefs/step-8a-phase-4.md): the checks before a commitment through the real api and
// database, with an AI stand-in that tries to break the rules. Off: nothing runs. On: each check re-checks who may see the
// gig, proposals or agreement; code keeps only known fields, at most 8 findings, drops sentences that rank people or call
// something legally correct, lists every proposal with the same fields (names never sent to the AI), and keeps the
// suggested deliverables to the agreement's own milestones. Typed text goes through the client information check first.
// Nothing is saved: the gig, proposals and agreement are unchanged afterwards.
//   deno test -A supabase/functions/api/helpers_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { clean, readCompare, readFindings } from "./lib/helpers/model.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "H".repeat(40); // rules-ok: a made-up test key
const prompts: string[] = [];
let aiCalls = 0;
const many = (n: number) => Array.from({ length: n }, (_, i) => ({ field: "task", problem: "Problem " + (i + 1) + ".", suggestion: "Better task " + (i + 1) }));
const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.endsWith("/chat/completions")) return new Response("{}", { status: 404 });
  const body = JSON.parse(String(init.body));
  const system = String(body.messages[0].content), user = String(body.messages.at(-1).content);
  prompts.push(system + "\n" + user);
  aiCalls++;
  let out: unknown = {};
  if (system.includes("Check a gig draft")) out = { findings: [{ field: "salary", problem: "Pay is low.", suggestion: "Pay more" }, { field: "outcome", problem: "Done is vague. This gig is legally sound.", suggestion: "The intake summary is saved in the matter." }, ...many(9)] };
  else if (system.includes("Compare proposals")) {
    const ids = [...user.matchAll(/id: ([0-9a-f-]{36})/g)].map((m) => m[1]);
    out = { proposals: [{ id: ids[1], covers: "Covers calls and checks. This is the best choice.", missing: ["No exclusions"], ask: ["Who makes the calls?"] }, { id: "made-up", covers: "x" }] };
  } else if (system.includes("Compare an agreement")) out = { findings: [{ field: "milestones", problem: "Milestone 1 has no clear deliverable.", suggestion: "" }] };
  else if (system.includes("observable deliverables")) out = { milestones: [{ seq: 1, deliverables: "A call log for every new client, saved in Clio.", why: "Observable." }, { seq: 9, deliverables: "Extra work" }] };
  else if (system.includes("monthly engagement")) out = { findings: [{ row: 1, field: "turnaround", problem: "No turnaround.", suggestion: "1 business day" }, { row: 7, field: "task", problem: "Row 7.", suggestion: "x" }] };
  else if (system.includes("freelancer's proposal")) out = { findings: [{ field: "excluded", problem: "Say what is not included.", suggestion: "Court filings are not included." }] };
  else if (system.includes("Check the steps of a law firm procedure")) out = { findings: [{ row: 1, field: "step", problem: "Not one clear action.", suggestion: "Call the new client within one business day." }, { row: 9, field: "step", problem: "No such step.", suggestion: "x" }] };
  else if (system.includes("Improve the Purpose and Scope")) out = { findings: [{ field: "purpose", problem: "Too vague.", suggestion: "Bring every new client in the same way." }, { field: "price", problem: "Odd.", suggestion: "y" }] };
  else if (system.includes("Explain, in plain words")) { const id = (user.match(/id: (\S+)/) ?? [])[1]; out = { items: [{ id, explain: "Each step needs exactly one A. The document is approved." }, { id: "made-up", explain: "x" }] }; }
  else if (system.includes("From a short description a lawyer wrote")) out = { size: "huge", practice_areas: ["Family law"], jurisdictions: "Texas state courts", systems: { practice_management: ["Clio", "MyCase"] } };
  else if (system.includes("unsent request")) out = { suggestion: "Draft a welcome email for new family law clients. Inputs: the intake form. Output: one email.", missing: ["A deadline"] };
  else if (system.includes("search filters for finding a freelancer")) out = { practice_area: "Family law", skill: "E-filing", tool: "Clio", state: "ZZ", why: "From the task. Fran is the best choice." };
  else if (system.includes("three short discussion points")) out = { points: ["Scope", "Timing", "Tools", "A fourth"] };
  else if (system.includes("own star ratings and notes")) out = { review: "Calls were made on time and logged in Clio." };
  return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 10 } });
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
  const bd = 8_960_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, name, `hp${bd}@test.invalid`])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
let att: M, fl: M, fl2: M, other: M;
let org = "", pb = "", draftGig = "", gig = "", ag = "", agM = "", p1 = "", p2 = "";
const run = async (who: M, body: Record<string, unknown>) => (await call("POST", "/helpers/run", who.token, body));

Deno.test("the rules in code: known fields, at most 8, no ranking or legal-correctness sentences, the same fields for every proposal", () => {
  assertEquals(clean("Covers the work. Fran is the best choice. Ask about filings."), "Covers the work. Ask about filings.");
  assertEquals(clean("The agreement is legally sound."), "");
  assertEquals(clean("Fix the A on step 2. The document is approved."), "Fix the A on step 2.", "DELA never says something is approved");
  const f = readFindings("check_scope", { findings: [{ field: "salary", problem: "Low.", suggestion: "More" }, ...many(10)] });
  assertEquals([f.length, f[0].field, f[0].suggestion], [8, "other", ""]);
  assertEquals(readFindings("monthly_scope", { findings: [{ row: 3, field: "task", problem: "P", suggestion: "S" }] }, 2)[0].suggestion, "", "a row that does not exist gets no suggestion");
  const c = readCompare({ proposals: [{ id: "b", covers: "B covers it." }, { id: "z", covers: "Made up" }] }, ["a", "b"]);
  assertEquals(c.map((x) => x.id), ["a", "b"], "every proposal, in order, nothing made up");
});

Deno.test("setup: an attorney, two freelancers who proposed, another attorney, a gig draft, a one-off and a monthly agreement", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'engagements', 'profiles', 'ai_generation', 'recurring_engagements')");
  await pool.query("update feature_switches set state = 'off' where key in ('ai_helpers', 'live_payments', 'tech_catalog')");
  att = await member(1, "att_pro", "Ann Attorney"); fl = await member(2, "fl_plus", "Fran Lance"); fl2 = await member(3, "fl_plus", "Gus Gig"); other = await member(4, "att_pro", "Otto Other");
  org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  await pool.query("insert into firm_profiles (org_id, body) values ($1, $2) on conflict (org_id) do update set body = excluded.body", [org, { signatory_name: "Ann Attorney", billing_address: "1 Main St", service_email: "n@example.com" }]);
  pb = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ($1, 'Intake', 'approved', 1, 1, 100, $2, $3) returning id`, [org, "hp-pb" + RUN, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb, { title: "Intake", steps: [{ text: "Call the new client" }] }, att.id]);
  const mk = async (status: string, tag: string, kind = "one_off") => (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id, kind)
    values ($1, $2, $3, 1, $4, '{"task":"Call new clients","outcome":"Every client called","steps":["Call","Log"]}', 30000, 60000, $5, now(), now() + interval '14 days', $6, $7) returning id`, [org, att.id, pb, "Intake calls " + tag, status, "hp" + tag + RUN, kind])).id;
  draftGig = await mk("draft", "d"); gig = await mk("filled", "g");
  p1 = (await one(`insert into proposals (gig_id, freelancer_id, status, price_cents, included, schedule, days_to_deliver, qualifications, sent_at) values ($1, $2, 'selected', 40000, 'Intake calls; conflict checks', 'Within a week', 7, 'Five years of intake', now()) returning id`, [gig, fl.id])).id;
  p2 = (await one(`insert into proposals (gig_id, freelancer_id, status, price_cents, included, schedule, days_to_deliver, qualifications, sent_at) values ($1, $2, 'sent', 35000, 'Intake calls', 'Two weeks', 14, 'Paralegal', now()) returning id`, [gig, fl2.id])).id;
  ag = (await one("insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents) values ($1, $2, $3, $4, $5, 40000) returning id", [gig, p1, org, att.id, fl.id])).id;
  assert((await call("GET", "/agreements/get?id=" + ag, att.token)).body.ok, "version 1 of the agreement");
  const mg = await mk("filled", "m", "monthly");
  const mp = (await one(`insert into proposals (gig_id, freelancer_id, status, price_cents, included, schedule, days_to_deliver, sent_at) values ($1, $2, 'selected', 100000, 'Intake calls', 'Monthly', 30, now()) returning id`, [mg, fl.id])).id;
  agM = (await one("insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents) values ($1, $2, $3, $4, $5, 100000) returning id", [mg, mp, org, att.id, fl.id])).id;
  assert((await call("GET", "/agreements/get?id=" + agM, att.token)).body.ok, "version 1 of the monthly agreement");
});

Deno.test("the switch off: no helpers, and nothing runs", async () => {
  assertEquals((await call("GET", "/helpers", att.token)).body.on, false);
  assertEquals((await run(att, { helper: "check_scope", gig_id: draftGig, draft: { task: "Call clients" } })).body.reason, "helpers_off");
  assertEquals(aiCalls, 0);
  await pool.query("update feature_switches set state = 'everyone' where key = 'ai_helpers'");
  const h = (await call("GET", "/helpers", att.token)).body;
  assertEquals([h.on, h.credits.check_scope, h.credits.compare_proposals, h.credits.agreement_check], [true, 1, 2, 2], "the DELA actions come from settings");
});

Deno.test("Check the scope: only the gig's owner, code-checked findings, and the gig is not changed", async () => {
  const before = (await one("select public, version from gigs where id = $1", [draftGig]));
  assertEquals((await run(other, { helper: "check_scope", gig_id: draftGig, draft: { task: "x" } })).body.reason, "not_found", "another firm's gig");
  assertEquals((await run(fl, { helper: "check_scope", gig_id: draftGig, draft: { task: "x" } })).status, 403, "a freelancer");
  assertEquals((await run(att, { helper: "check_scope", gig_id: draftGig, draft: { task: "Call client SSN 123-45-6789" } })).body.reason, "looks_like_client_info", "typed text is checked first");
  const r = (await run(att, { helper: "check_scope", gig_id: draftGig, draft: { title: "Intake", task: "Call new clients", outcome: "Done", steps: ["Call"], budget_min: 300, budget_max: 600 } })).body;
  assertEquals([r.ok, r.findings.length, r.findings[0].field, r.findings[0].suggestion, r.credits], [true, 8, "other", "", 1], JSON.stringify(r).slice(0, 300));
  assertEquals(r.findings[1].problem, "Done is vague.", "the legal-correctness sentence is gone");
  assert(r.note.includes("do not confirm legal correctness"));
  const after = (await one("select public, version from gigs where id = $1", [draftGig]));
  assertEquals(after, before, "nothing saved");
});

Deno.test("Compare these proposals: the same fields for every proposal, no ranking, names never sent to the AI", async () => {
  assertEquals((await run(other, { helper: "compare_proposals", gig_id: gig })).body.ok === true, false, "another firm");
  const r = (await run(att, { helper: "compare_proposals", gig_id: gig })).body;
  assertEquals(r.ok, true, JSON.stringify(r).slice(0, 200));
  assertEquals(r.proposals.map((x: any) => x.id).sort(), [p1, p2].sort());
  const second = r.proposals.find((x: any) => x.covers.startsWith("Covers calls"));
  assertEquals(second.covers, "Covers calls and checks.", "the ranking sentence is removed");
  assert(r.proposals.some((x: any) => x.covers.startsWith("DELA could not summarize")), "a proposal the AI skipped still gets its row");
  assert(r.note.includes("does not rank them"));
  const sent = prompts.find((p) => p.includes("Compare proposals"))!;
  assert(!sent.includes("Fran Lance") && !sent.includes("Gus Gig"), "names stay out of the prompt");
  assertEquals(r.credits, 2);
});

Deno.test("Check this for me: both people on the agreement, nobody else; acceptance criteria for the attorney, own milestones only", async () => {
  const a = (await run(att, { helper: "agreement_check", agreement_id: ag })).body;
  const f = (await run(fl, { helper: "agreement_check", agreement_id: ag })).body;
  assertEquals([a.ok, f.ok, a.findings[0].field], [true, true, "milestones"]);
  assertEquals((await run(fl2, { helper: "agreement_check", agreement_id: ag })).body.reason, "not_found", "a freelancer who was not hired");
  assertEquals((await run(fl, { helper: "acceptance_criteria", agreement_id: ag })).status, 403, "the freelancer cannot run it");
  const c = (await run(att, { helper: "acceptance_criteria", agreement_id: ag })).body;
  assertEquals(c.milestones.map((m: any) => m.seq), [1], "milestone 9 does not exist, so it is dropped");
  const v = (await call("GET", "/agreements/get?id=" + ag, att.token)).body;
  assertEquals(v.agreement.version, 1, "no new version: the suggestion only fills the change editor");
});

Deno.test("Check monthly scope and Check my proposal", async () => {
  assertEquals((await run(att, { helper: "monthly_scope", agreement_id: ag, tasks: [{ task: "Calls" }] })).body.reason, "not_monthly");
  const m = (await run(att, { helper: "monthly_scope", agreement_id: agM, tasks: [{ task: "Intake calls", frequency: "weekly", quantity: 10, turnaround: "", exclusions: "" }] })).body;
  assertEquals([m.ok, m.findings.length, m.findings[0].row, m.findings[0].suggestion, m.findings[1].suggestion], [true, 2, 1, "1 business day", ""]);
  assertEquals((await run(att, { helper: "proposal_check", gig_id: gig, proposal: { included: "Calls" } })).status, 403, "attorneys do not check proposals");
  const p = (await run(fl, { helper: "proposal_check", gig_id: gig, proposal: { price: 400, days: 7, included: "Intake calls", excluded: "", schedule: "A week", qualifications: "Five years" } })).body;
  assertEquals([p.ok, p.findings[0].field, p.findings[0].suggestion], [true, "excluded", "Court filings are not included."]);
});

Deno.test("The other eight: documents, firm profile, Ask DELA, Talent, agenda and review, each code-checked", async () => {
  const DOC = { schema: 2, type: "sop", title: "Intake", roles: ["Attorney", "Paralegal"], role_kinds: { Attorney: "attorney", Paralegal: "staff" }, owner_role: "Attorney", purpose: "", scope: "",
    steps: [{ text: "Call", role: "Paralegal", raci: { Attorney: "R" } }] };
  const dpb = (await one(`insert into playbooks (org_id, title, status, current_version, completeness, request_id, created_by, doc_type) values ($1, 'Intake doc', 'draft', 1, 50, $2, $3, 'sop') returning id`, [org, "hp-doc" + RUN, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [dpb, DOC, att.id]);
  assertEquals((await run(fl, { helper: "check_steps", playbook_id: dpb, steps: [{ text: "Call" }] })).status, 403, "freelancers do not check a firm's steps");
  assertEquals((await run(other, { helper: "check_steps", playbook_id: dpb, steps: [{ text: "Call" }] })).body.reason, "not_found", "another firm's document");
  const st = (await run(att, { helper: "check_steps", playbook_id: dpb, steps: [{ text: "Call", role: "Paralegal" }] })).body;
  assertEquals([st.ok, st.findings[0].row, st.findings[0].suggestion, st.findings[1].row, st.findings[1].suggestion], [true, 1, "Call the new client within one business day.", undefined, ""], "a step that does not exist gets no suggestion");
  const sec = (await run(att, { helper: "improve_section", playbook_id: dpb, purpose: "", scope: "" })).body;
  assertEquals([sec.findings[0].field, sec.findings[1].field, sec.findings[1].suggestion], ["purpose", "other", ""]);
  const ex = (await run(att, { helper: "explain_findings", playbook_id: dpb })).body;
  assertEquals([ex.ok, ex.items.length, ex.items[0].explain], [true, 1, "Each step needs exactly one A."], "only real findings, and no claim that it is approved");
  const firm = (await run(att, { helper: "describe_firm", text: "Three attorneys in family law in Texas; we use Clio." })).body;
  assertEquals(firm.findings.map((f: any) => [f.field, f.suggestion]), [["practice_areas", "Family law"], ["jurisdictions", "Texas state courts"], ["sys:practice_management", "Clio"]], "an unknown size and a system they never named are dropped");
  const rq = (await run(fl, { helper: "improve_request", text: "write welcome email" })).body;
  assertEquals([rq.ok, rq.findings[0].field, rq.findings[1].problem], [true, "request", "Missing: A deadline"], "freelancers can improve their request too");
  assertEquals((await run(fl, { helper: "find_fit", text: "e-filing" })).status, 403);
  const fit = (await run(att, { helper: "find_fit", text: "E-filing family law motions with Clio" })).body;
  assertEquals(fit.findings.map((f: any) => f.field), ["practice_area", "skill", "tool"], "a made-up state is dropped");
  assertEquals(fit.findings[0].problem, "From the task.", "never picks a person");
  assertEquals((await run(other, { helper: "agenda", gig_id: gig })).body.reason, "not_found");
  const ag2 = (await run(fl, { helper: "agenda", gig_id: gig })).body;
  assertEquals(ag2.findings[0].suggestion, "Agenda for our meeting:\n1. Scope\n2. Timing\n3. Tools", "three points at most");
  assertEquals((await run(att, { helper: "review_draft", agreement_id: ag, ratings: { quality: 1, communication: 2 }, notes: "" })).body.reason, "notes_first", "a low rating needs the member's own notes");
  assertEquals((await run(att, { helper: "review_draft", agreement_id: ag, ratings: { quality: 5 }, notes: "" })).body.reason, "notes_needed");
  assertEquals((await run(fl2, { helper: "review_draft", agreement_id: ag, ratings: { quality: 5 }, notes: "Good" })).body.reason, "not_found", "only the people on the agreement");
  const rv = (await run(att, { helper: "review_draft", agreement_id: ag, ratings: { quality: 5 }, would_again: true, notes: "calls on time, logged in clio" })).body;
  assertEquals([rv.ok, rv.findings[0].field, rv.findings[0].suggestion], [true, "body", "Calls were made on time and logged in Clio."]);
  assertEquals((await one("select count(*)::int n from reviews where agreement_id = $1", [ag])).n, 0, "nothing posted");
});

Deno.test("teardown", async () => {
  await pool.query("update feature_switches set state = 'off' where key = 'ai_helpers'");
  await pool.end();
});

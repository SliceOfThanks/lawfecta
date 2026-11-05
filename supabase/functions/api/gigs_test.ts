// Step 4 API tests: the whole Flex Gig journey on both sides, mistakes and misuse included.
// The real handler and the local test database, with an OpenAI stand-in. Run after tools/dbtest.sh:
//   deno test -A supabase/functions/api/gigs_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { conductRules, normalizePublic, publicFromPlaybook, toCents } from "./lib/gigs/model.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "G".repeat(40); // rules-ok: a made-up test key
const WORKER = "test-worker-secret-gigs-0123456789abcdef";
const PLAYBOOK = {
  title: "Prepare a small claims filing packet", outcome: "A filing-ready packet for attorney review", practice_area: "Family law", jurisdiction: "Texas (TX)",
  when_to_use: "A new small claims matter", roles: "Paralegal: drafts\nAttorney: reviews", needs: ["Intake form"],
  steps: [{ text: "Draft the petition from the intake form", who: "paralegal", tool: "Clio", tag: "delegate" }, { text: "Assemble the exhibits", tool: "Adobe Acrobat" }, { text: "Attorney reviews and signs", who: "attorney", tag: "keep" }],
  checks: ["Every exhibit is labeled"], review_points: ["Attorney signs"], deliverables: "Draft packet and PDFs",
};
const systems: string[] = [];

const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/chat/completions")) {
    const body = JSON.parse(String(init.body));
    const system = String(body.messages[0].content), user = String(body.messages.at(-1).content);
    systems.push(system);
    let out: unknown = {};
    if (body.response_format && system.includes("legal operations tool")) out = { client_info: false, kinds: [] };
    else if (system.includes("public version of a Flex Gig")) out = { title: "Small claims filing packet (Texas)", task: "Draft the petition and assemble exhibits from our intake form.", outcome: "A filing-ready packet",
      steps: ["Draft the petition", "Assemble exhibits", "Send for attorney review"], tools: ["Clio", "Adobe Acrobat"], timing: "About 3 hours", state: "TX", practice_area: "Family law", skills: ["E-filing", "Drafting"] };
    else if (system.includes("You review messages members send")) out = /venmo|call me/i.test(user) ? { off_platform: true, kinds: ["payment_outside"], insights: [] } : { off_platform: false, kinds: [], insights: ["Prefers fixed-price work"] };
    else if (system.includes("qualifications part of a proposal")) out = { qualifications: "Eight years of family law support, mostly in Clio.", included: "Petition draft; exhibits", questions: [] };
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
async function member(n: number, plan: string): Promise<M> {
  const bd = 7_300_000 + RUN * 10 + n;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name) values ($1, $2) returning id", [bd, "Gig " + n])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
async function verifiedAttorney(m: M) {
  await pool.query("insert into member_profiles (person_id, side, body, missing, score) values ($1, 'attorney', $2, '{}', 100)", [m.id, { first_name: "Ann", last_name: "Attorney", firm_name: "Example Legal" }]);
  await pool.query(`insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) values ($1, 'l1', 'TX', $2, $2, 'Ann Attorney', 'video', 'verified')`, [m.id, "B" + m.bd]);
  await pool.query("select dela_profile_refresh($1, 'attorney')", [m.id]);
}
async function readyFreelancer(m: M, body: Record<string, unknown>) {
  await pool.query("insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) values ($1, 'freelancer', $2, '{}', 100, now())", [m.id, { first_name: "F", last_name: String(m.bd), ...body }]);
  await pool.query("select dela_profile_refresh($1, 'freelancer')", [m.id]);
}

let att: M, att2: M, f1: M, f2: M, f3: M, f4: M, f5: M, team: M;
let pb = "", gig = "", fileId = "";

Deno.test("the off-platform rules and the public version helpers", () => {
  assertEquals(conductRules("Happy to help, I can start Monday."), []);
  assertEquals(conductRules("Email me at fran@example.com and pay me on Venmo").sort(), ["contact_details", "payment_outside"]);
  assertEquals(conductRules("Let's work directly with you outside of Lawfecta"), ["off_platform"]);
  assertEquals(conductRules("Call 512-555-0199 tomorrow"), ["contact_details"]);
  assertEquals(toCents("$1,250.50"), 125050);
  assertEquals(normalizePublic({ state: "texas", steps: "a, b" }).state, "", "a state is two letters or empty");
  const p = publicFromPlaybook(PLAYBOOK as never);
  assertEquals([p.state, p.practice_area, p.tools.includes("Clio")], ["TX", "Family law", true]);
});

Deno.test("setup", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  await pool.query("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'talent_search', 'conduct_review', 'member_insights', 'ai_generation', 'playbook_library', 'profiles', 'file_uploads')");
  await pool.query("update feature_switches set state = 'off' where key in ('public_gigs', 'multiple_hires')");
  await pool.query("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
  att = await member(1, "att_free"); att2 = await member(2, "att_pro");
  f1 = await member(3, "fl_free"); f2 = await member(4, "fl_plus"); f3 = await member(5, "fl_free"); f4 = await member(6, "fl_free"); f5 = await member(7, "fl_pro");
  team = await member(8, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'reviewer')", [team.id]);
  await verifiedAttorney(att);
  await readyFreelancer(f1, { practice_areas: ["Family law"], software: ["Clio", "Adobe Acrobat"], skills: ["E-filing"], capacity_hours_week: 20, states_excluded: [] });
  await readyFreelancer(f2, { practice_areas: ["Family law"], software: [], skills: [], capacity_hours_week: 5, states_excluded: [] });
  await readyFreelancer(f3, { practice_areas: ["Immigration"], software: ["Clio"], skills: [], capacity_hours_week: 30, states_excluded: [] });
  await readyFreelancer(f4, { practice_areas: ["Family law"], software: ["Clio"], skills: ["E-filing"], capacity_hours_week: 30, states_excluded: ["TX"] });
  await readyFreelancer(f5, { practice_areas: ["Family law"], software: ["Clio"], skills: [], capacity_hours_week: 10, states_excluded: [] });
  await pool.query("update member_profiles set availability_confirmed_at = now() - interval '20 days' where person_id = $1", [f5.id]);
  await pool.query("select dela_profile_refresh($1, 'freelancer')", [f5.id]);
  const org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  pb = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, practice_area, request_id, created_by) values ($1, $2, 'approved', 1, 1, 100, 'Family law', 'g1', $3) returning id`, [org, PLAYBOOK.title, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb, PLAYBOOK, att.id]);
  fileId = (await one(`insert into files (org_id, group_id, version, is_current, name, ext, size_bytes, storage_path, status, check_state, uploaded_by, side, request_id, no_client_info_ticked_at)
    values ($1, gen_random_uuid(), 1, true, 'Intake template.docx', 'docx', 100, 'test/' || gen_random_uuid(), 'ready', 'clear', $2, 'attorney', 'gf1', now()) returning id`, [org, att.id])).id;
});

Deno.test("attorney: draft from an approved playbook, minimum budget, only verified attorneys post, open-gig allowance", async () => {
  assertEquals((await call("GET", "/gigs", f1.token)).status, 403, "freelancers have no Projects");
  const list = (await call("GET", "/gigs", att.token)).body;
  assertEquals([list.ok, list.eligibility.can_post, list.playbooks.length], [true, true, 1], "the Projects list, with approved playbooks to post from");
  const d = (await call("POST", "/gigs/draft", att.token, { playbook_id: pb, request_id: "d1", budget_min: 100, budget_max: 200 })).body;
  assertEquals([d.ok, d.source], [true, "ai"], JSON.stringify(d));
  gig = d.id;
  assertEquals((await call("POST", "/gigs/draft", att.token, { playbook_id: pb, request_id: "d1" })).body.id, gig, "the same request makes one draft");
  const g = (await call("GET", "/gigs/get?id=" + gig, att.token)).body;
  assertEquals([g.gig.title, g.gig.public.state, g.gig.status], ["Small claims filing packet (Texas)", "TX", "draft"]);
  assertEquals((await call("POST", "/gigs/publish", att.token, { id: gig })).body.reason, "budget_too_low", "the $250 minimum");
  const saved = (await call("POST", "/gigs/save", att.token, { id: gig, public: g.gig.public, budget_min: 300, budget_max: 600, deadline: "2099-01-31",
    milestones: [{ title: "Draft", share_pct: 50 }, { title: "Final", share_pct: 50 }], version: g.gig.version })).body;
  assertEquals(saved.ok, true, JSON.stringify(saved));
  assertEquals((await call("POST", "/gigs/save", att.token, { id: gig, public: { ...g.gig.public, task: "Client John Smith SSN 123-45-6789" }, version: saved.version })).body.reason, "looks_like_client_info");
  // An unverified attorney cannot post
  const org2 = (await one("select dela_side_org($1, 'attorney') o", [att2.id])).o;
  const pb2 = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ($1, 'X', 'approved', 1, 1, 100, 'x', $2) returning id`, [org2, att2.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb2, PLAYBOOK, att2.id]);
  const d2 = (await call("POST", "/gigs/draft", att2.token, { playbook_id: pb2, request_id: "u1", budget_min: 300, budget_max: 400, use_ai: false })).body;
  assertEquals((await call("POST", "/gigs/publish", att2.token, { id: d2.id })).body.reason, "not_verified");
  assertEquals((await call("GET", "/gigs/get?id=" + gig, att2.token)).body.reason, "not_found", "another firm cannot see the gig");
  const draftPb = (await one(`insert into playbooks (org_id, title, status, current_version, completeness, request_id, created_by) select org_id, 'Draft one', 'draft', 1, 50, 'dr', created_by from playbooks where id = $1 returning id`, [pb])).id;
  assertEquals((await call("POST", "/gigs/draft", att.token, { playbook_id: draftPb, request_id: "d2" })).body.reason, "playbook_not_approved");
  const pub = (await call("POST", "/gigs/publish", att.token, { id: gig })).body;
  assertEquals(pub.ok, true, JSON.stringify(pub));
  assertEquals((await call("POST", "/gigs/publish", att.token, { id: gig })).body.duplicate, true, "publishing twice is safe");
  // Attorney Free: one open gig at a time
  const d3 = (await call("POST", "/gigs/draft", att.token, { playbook_id: pb, request_id: "d3", budget_min: 300, budget_max: 400, use_ai: false })).body;
  assertEquals((await call("POST", "/gigs/publish", att.token, { id: d3.id })).body.reason, "limit_reached");
  const jobs = (await one("select count(*)::int n from jobs where kind = 'gig_tick' and payload->>'gig_id' = $1", [gig])).n;
  assertEquals(jobs, 3, "reminders on days 10 and 13 and the closing");
});

Deno.test("matches: eligible first, plain reasons, no stale, excluded or wrong-area freelancers", async () => {
  const m = (await call("GET", "/gigs/matches?id=" + gig, att.token)).body.matches as Array<Record<string, any>>;
  const ids = m.map((x) => x.person_id);
  assert(ids.includes(f1.id) && ids.includes(f2.id), JSON.stringify(m));
  assert(!ids.includes(f3.id), "another practice area is not matched");
  assert(!ids.includes(f4.id), "a freelancer who excludes Texas is not matched");
  assert(!ids.includes(f5.id), "availability older than 14 days is not matched");
  // Other test files make freelancers too, so compare only this file's own
  const mine = m.filter((x) => [f1.id, f2.id].includes(x.person_id));
  assertEquals(mine[0].person_id, f1.id, "the best fit comes first");
  assert(mine[0].reasons.includes("Family law") && mine[0].reasons.some((r: string) => r.startsWith("Uses Clio")), JSON.stringify(m[0].reasons));
  assert(!JSON.stringify(m).includes("fit_score") && !/%/.test(JSON.stringify(m)), "no fit percentage");
  // The plan boost orders only within the same fit group: a Business plan never lifts a fair fit above a good fit
  await pool.query("update side_profiles set plan_code = 'fl_business' where person_id = $1 and side = 'freelancer'", [f2.id]);
  const m2 = (await call("GET", "/gigs/matches?id=" + gig + "&refresh=1", att.token)).body.matches as Array<Record<string, any>>;
  assertEquals(m2.filter((x) => [f1.id, f2.id].includes(x.person_id))[0].person_id, f1.id);
});

Deno.test("freelancers: matched sees the gig without milestones or playbook; invited sees the watermarked playbook", async () => {
  const v1 = (await call("GET", "/gigs/get?id=" + gig, f1.token)).body;
  assertEquals([v1.access, v1.gig.milestones, v1.playbook, v1.watermark], ["match", null, null, null]);
  assertEquals((await call("GET", "/gigs/get?id=" + gig, f3.token)).body.reason, "not_found", "not matched and public gigs off: nothing");
  assertEquals((await call("POST", "/gigs/invite", att.token, { gig_id: gig, person_id: f4.id })).body.why, "excludes_state", "checked again when invited");
  const inv = (await call("POST", "/gigs/invite", att.token, { gig_id: gig, person_id: f2.id, message: "Your profile looks like a good fit." })).body;
  assertEquals(inv.ok, true, JSON.stringify(inv));
  const v2 = (await call("GET", "/gigs/get?id=" + gig, f2.token)).body;
  assertEquals(v2.access, "invited");
  assert(v2.playbook && v2.watermark.includes("Gig "), "the full playbook, with the freelancer's name as a watermark");
  assertEquals(v2.gig.milestones, null, "milestones only after hiring");
  const work = (await call("GET", "/work", f2.token)).body;
  assertEquals(work.invitations.length, 1);
  const n = (await one("select count(*)::int n from notifications where person_id = $1 and kind = 'gig_invitation' and channel = 'in_app'", [f2.id])).n;
  assertEquals(n, 1, "the invited freelancer is told");
});

Deno.test("questions: answered publicly; off-platform plans are held for the team", async () => {
  const q = (await call("POST", "/gigs/questions/ask", f1.token, { gig_id: gig, question: "Which court forms do you use?", request_id: "q1" })).body;
  assertEquals([q.ok, q.held], [true, false]);
  const held = (await call("POST", "/gigs/questions/ask", f1.token, { gig_id: gig, question: "Can you call me and pay me on Venmo instead?", request_id: "q2" })).body;
  assertEquals(held.held, true, JSON.stringify(held));
  const a = (await call("POST", "/gigs/questions/answer", att.token, { id: q.id, answer: "The Texas JP court forms." })).body;
  assertEquals(a.ok, true);
  const seen = (await call("GET", "/gigs/get?id=" + gig, f2.token)).body.questions as Array<Record<string, any>>;
  assertEquals(seen.map((x) => x.answer), ["The Texas JP court forms."], "every applicant sees the answer; the held question is not shown");
  const attSees = (await call("GET", "/gigs/get?id=" + gig, att.token)).body.questions as Array<Record<string, any>>;
  assert(!attSees.some((x) => x.question.includes("Venmo")), "the attorney does not see the held question");
  const flags = (await call("GET", "/admin/gigs", team.token)).body.data.flags;
  assert(flags.some((f: any) => f.object_type === "question" && f.kinds.includes("payment_outside")));
  assertEquals((await call("GET", "/admin/gigs", f1.token)).status, 403);
});

Deno.test("proposals: the allowance counts once, invited proposals are free, two clicks send once, limits explained", async () => {
  const before = (await call("GET", "/work", f1.token)).body.allowance.remaining;
  assertEquals((await call("POST", "/proposals/send", f1.token, { gig_id: gig, price: 0, included: "x" })).body.reason, "proposal_needs_price");
  const body = { gig_id: gig, price: 450, included: "Petition draft; exhibits", excluded: "Filing fees", schedule: "Within 5 days", qualifications: "Eight years in family law", request_id: "p1" };
  const [a, b] = await Promise.all([call("POST", "/proposals/send", f1.token, body), call("POST", "/proposals/send", f1.token, body)]);
  assert(a.body.ok && b.body.ok, JSON.stringify([a.body, b.body]));
  assertEquals((await call("GET", "/work", f1.token)).body.allowance.remaining, before - 1, "two clicks: one proposal, counted once");
  assertEquals((await one("select count(*)::int n from proposals where gig_id = $1 and freelancer_id = $2", [gig, f1.id])).n, 1);
  const inv = (await call("POST", "/proposals/send", f2.token, { ...body, price: 700, included: "Petition draft", request_id: "p2" })).body;
  assertEquals([inv.ok, inv.counted], [true, false], "an invited proposal does not use the allowance");
  const insights = (await call("GET", "/insights", f1.token)).body.items as Array<Record<string, any>>;
  assert(insights.some((i) => i.text === "Prefers fixed-price work"), "DELA learns about the member");
  assertEquals((await call("POST", "/insights/remove", f1.token, { id: insights[0].id })).body.ok, true);
  assertEquals((await call("GET", "/insights", f1.token)).body.items.length, insights.length - 1, "and the member can remove it");
  // No allowance left: matches stay visible and sending explains the limit
  await pool.query("update side_profiles set plan_code = 'fl_free' where person_id = $1 and side = 'freelancer'", [f2.id]);
  await pool.query("update member_profiles set body = body || '{\"practice_areas\": [\"Family law\", \"Immigration\"]}' where person_id = $1", [f3.id]);
  await pool.query("insert into quota_usage (person_id, side, feature_key, period_start, used) values ($1, 'freelancer', 'fl.proposals', dela_period_start('month'), 5) on conflict (person_id, side, feature_key, period_start) do update set used = 5", [f3.id]);
  await call("GET", "/gigs/matches?id=" + gig + "&refresh=1", att.token);
  const w3 = (await call("GET", "/work", f3.token)).body;
  assert(w3.matches.some((g: any) => g.id === gig) && w3.allowance.remaining === 0, "matches stay visible with no allowance left");
  assertEquals((await call("POST", "/proposals/send", f3.token, { ...body, request_id: "p3" })).body.reason, "limit_reached");
});

Deno.test("held proposals stay hidden until the team clears them; comparison labels prices outside the range", async () => {
  await pool.query("update quota_usage set used = 0 where person_id = $1 and feature_key = 'fl.proposals'", [f3.id]);
  const h = (await call("POST", "/proposals/send", f3.token, { gig_id: gig, price: 200, included: "Petition draft", schedule: "3 days", message: "Email me at f3@example.com", request_id: "p4" })).body;
  assertEquals([h.ok, h.status], [true, "held"], JSON.stringify(h));
  let c = (await call("GET", "/gigs/proposals?id=" + gig, att.token)).body.proposals as Array<Record<string, any>>;
  assertEquals(c.length, 2, "the held proposal is not shown");
  const flag = (await call("GET", "/admin/gigs", team.token)).body.data.flags.find((f: any) => f.object_type === "proposal");
  assertEquals((await call("POST", "/admin/conduct/decide", team.token, { id: flag.id, clear: true })).body.data.ok, true);
  c = (await call("GET", "/gigs/proposals?id=" + gig, att.token)).body.proposals;
  assertEquals(c.map((p) => p.price_label).sort(), ["above", "below", "within"], "outside the range is labeled, never hidden");
  assert(!JSON.stringify((await call("GET", "/gigs/get?id=" + gig, f1.token)).body).includes("f3@example.com"), "an applicant never sees another's proposal");
  // Withdrawn: the allowance never comes back
  const used = (await one("select used from quota_usage where person_id = $1 and feature_key = 'fl.proposals' and period_start = dela_period_start('month')", [f3.id])).used;
  assertEquals((await call("POST", "/proposals/withdraw", f3.token, { gig_id: gig })).body.allowance_returned, false);
  assertEquals((await one("select used from quota_usage where person_id = $1 and feature_key = 'fl.proposals' and period_start = dela_period_start('month')", [f3.id])).used, used);
});

Deno.test("files: read only, invited only, every download logged", async () => {
  assertEquals((await call("POST", "/gigs/files", att.token, { gig_id: gig, file_id: fileId })).body.ok, true);
  const got = (await call("GET", `/gigs/file?gig=${gig}&file=${fileId}`, f2.token)).body;
  assert(got.ok && got.url.includes("exp=300"), "the invited freelancer gets a short link");
  assertEquals((await call("GET", `/gigs/file?gig=${gig}&file=${fileId}`, f1.token)).body.reason, "not_found", "a matched, not invited, freelancer cannot");
  assertEquals((await one("select count(*)::int n from gig_file_downloads where gig_id = $1", [gig])).n, 1);
});

Deno.test("a big change asks applicants to confirm; selecting starts a draft agreement and closes the gig", async () => {
  const g = (await call("GET", "/gigs/get?id=" + gig, att.token)).body.gig;
  const ch = (await call("POST", "/gigs/save", att.token, { id: gig, public: g.public, budget_min: 300, budget_max: 900, version: g.version })).body;
  assertEquals(ch.big_change, true);
  const p1 = ((await call("GET", "/gigs/proposals?id=" + gig, att.token)).body.proposals as Array<Record<string, any>>).find((p) => p.person_id === f1.id)!;
  assertEquals(p1.needs_reconfirm, true);
  assertEquals((await call("POST", "/proposals/select", att.token, { id: p1.id })).body.reason, "needs_reconfirm");
  assertEquals((await call("POST", "/proposals/ask-reconfirm", att.token, { id: p1.id })).body.ok, true);
  assertEquals((await call("POST", "/proposals/reconfirm", f1.token, { gig_id: gig })).body.ok, true);
  const sel = (await call("POST", "/proposals/select", att.token, { id: p1.id })).body;
  assertEquals(sel.ok, true, JSON.stringify(sel));
  assertEquals((await call("POST", "/proposals/select", att.token, { id: p1.id })).body.duplicate, true);
  assertEquals((await one("select status from gigs where id = $1", [gig])).status, "filled");
  assertEquals((await one("select status, total_cents from agreements where id = $1", [sel.agreement_id])).total_cents, 45000);
  const other = (await one("select title, body from notifications where person_id = $1 and kind = 'gig_closed' and channel = 'in_app'", [f2.id]));
  assert(other.title.includes("chose another") && !other.body.includes("$") && !other.body.includes("Gig 3"), "a polite notice with no details about the chosen proposal");
  assert((await one("select count(*)::int n from notifications where person_id = $1 and kind = 'gig_selected'", [f1.id])).n >= 1, "the chosen freelancer is told");
  const hired = (await call("GET", "/gigs/get?id=" + gig, f1.token)).body;
  assertEquals(hired.access, "hired");
  assertEquals(hired.gig.milestones.length, 2, "milestones show after hiring");
  assertEquals((await call("GET", `/gigs/file?gig=${gig}&file=${fileId}`, f2.token)).body.reason, "not_found", "file access ends for those not hired");
  assert((await call("GET", `/gigs/file?gig=${gig}&file=${fileId}`, f1.token)).body.ok, "the hired freelancer keeps access");
  assertEquals((await call("POST", "/proposals/send", f4.token, { gig_id: gig, price: 400, included: "x", schedule: "y" })).body.reason, "gig_not_open", "a closed gig refuses a new proposal");
  assertEquals((await call("POST", "/gigs/questions/ask", f1.token, { gig_id: gig, question: "One more?", request_id: "q9" })).body.reason, "gig_not_open", "a closed gig refuses new questions");
  const used = (await one("select used from quota_usage where person_id = $1 and feature_key = 'att.gigs_active'", [att.id])).used;
  assertEquals(used, 0, "the open-gig allowance came back when the gig was filled");
});

Deno.test("time runs out on the server; the team can pause a gig; Talent search", async () => {
  const d = (await call("POST", "/gigs/draft", att.token, { playbook_id: pb, request_id: "t1", budget_min: 300, budget_max: 400, use_ai: false })).body;
  assertEquals((await call("POST", "/gigs/publish", att.token, { id: d.id })).body.ok, true);
  await call("GET", "/gigs/matches?id=" + d.id + "&refresh=1", att.token);
  assertEquals((await call("POST", "/admin/gigs/pause", team.token, { id: d.id, pause: true, reason: "Checking the wording" })).body.data.ok, true);
  assertEquals((await call("POST", "/proposals/send", f1.token, { gig_id: d.id, price: 350, included: "x", schedule: "y" })).body.reason, "gig_not_open");
  await call("POST", "/admin/gigs/pause", team.token, { id: d.id, pause: false });
  await pool.query("update gigs set closes_at = now() - interval '1 minute' where id = $1", [d.id]);
  assertEquals((await call("POST", "/proposals/send", f1.token, { gig_id: d.id, price: 350, included: "x", schedule: "y" })).body.reason, "gig_not_open", "even from an old page");
  assertEquals((await one("select status from gigs where id = $1", [d.id])).status, "closed");
  const t = (await call("GET", "/talent?tool=clio&practice_area=Family%20law", att.token)).body.people as Array<Record<string, any>>;
  assert(t.some((p) => p.person_id === f1.id) && !t.some((p) => p.person_id === f5.id), "match-ready freelancers only");
  assert(!JSON.stringify(t).includes("email"), "no contact details");
  assertEquals((await call("GET", "/talent", f1.token)).status, 403);
});

Deno.test("teardown", async () => { await pool.end(); });

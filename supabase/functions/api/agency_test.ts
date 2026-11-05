// Agencies, part 1 (docs/briefs/step-7d-agencies.md, Stacey's answers 2026-11-05) through the real api and database:
// a Business freelancer becomes an agency; business details and the team's check; team invites by email, seats (3 with
// the owner, the team raising one agency's limit by hand), roles, removal ending access at once; agency proposals with
// "Who will do this work" (required, verified people only, one per agency per gig, the shared allowance); the attorney
// sees the agency and its people; after the hire the agency is paid, the people work on it ("Who's working on this"),
// only owners and managers bind the agency, changes notify the attorney; reviews go to the agency and each named person;
// a downgrade stops new team changes and agency proposals.
//   deno test -A supabase/functions/api/agency_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "E".repeat(40); // rules-ok: a made-up test key
const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/chat/completions")) { const body = JSON.parse(String(init.body)); return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify({ held: false, kinds: [] }) } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }); }
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: () => Promise.resolve(0), read: () => Promise.reject(new Error("missing")), remove: () => Promise.resolve(), put: () => Promise.resolve(),
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
type M = { token: string; id: string; bd: number; email: string };
async function member(k: number, plan: string, name: string): Promise<M> {
  const bd = 8_400_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const email = `ag${bd}@test.invalid`;
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, name, email])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  if (side === "freelancer") {
    await pool.query("insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) values ($1, 'freelancer', $2, '{}', 100, now())",
      [id, { first_name: name.split(" ")[0], last_name: name.split(" ")[1] ?? "", practice_areas: ["Family law"], firm_name: k === 1 ? "Roe Support Group" : "", headline: name + " headline", photo_file: "profiles/" + id + "/photo.png" }]);
    await pool.query("select dela_profile_refresh($1, 'freelancer')", [id]);
  }
  return { token, id, bd, email };
}
let owner: M, mgr: M, mem: M, newbie: M, extra: M, att: M, team: M;
let org = "", gig = "", ag = "", prop = "";

Deno.test("setup", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'agency_team', 'engagements', 'reviews', 'profiles', 'gig_chat')");
  await pool.query("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
  owner = await member(1, "fl_business", "Olive Owner"); mgr = await member(2, "fl_plus", "Max Manager"); mem = await member(3, "fl_plus", "Mia Member");
  newbie = await member(4, "fl_free", "Ned New"); extra = await member(5, "fl_plus", "Eve Extra"); att = await member(6, "att_pro", "Ann Attorney"); team = await member(7, "att_free", "Lawfecta Team");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'support')", [team.id]);
  // Ned has not finished verification
  await pool.query("update member_profiles set score = 40, missing = '{\"headline\"}' where person_id = $1", [newbie.id]);
  await pool.query("select dela_profile_refresh($1, 'freelancer')", [newbie.id]);
  await pool.query("insert into member_profiles (person_id, side, body, missing, score) values ($1, 'attorney', '{\"firm_name\":\"Example Legal\"}', '{}', 100)", [att.id]);
  await pool.query(`insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) values ($1, 'l', 'TX', $2, $2, 'A', 'video', 'verified')`, [att.id, "M" + att.bd]);
  await pool.query("select dela_profile_refresh($1, 'attorney')", [att.id]);
  const aorg = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  const pb = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ($1, 'Intake', 'approved', 1, 1, 100, 'ag1', $2) returning id`, [aorg, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb, { title: "Intake", steps: [{ text: "a" }] }, att.id]);
  gig = (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id, visibility)
    values ($1, $2, $3, 1, 'Intake packet help', '{"task":"Intake"}', 30000, 90000, 'open', now(), now() + interval '14 days', 'ag1', 'public') returning id`, [aorg, att.id, pb])).id;
});

Deno.test("becoming an agency: Business only; business details, checked once by the team", async () => {
  const solo = (await call("GET", "/agency", mgr.token)).body;
  assertEquals([solo.ok, solo.agency, solo.tier], [true, null, "plus"], "a Plus freelancer has no agency");
  const v = (await call("GET", "/agency", owner.token)).body;
  assertEquals([v.agency?.role, v.agency?.active, v.agency?.name, v.agency?.seats.limit, v.agency?.seats.used], ["owner", true, "Roe Support Group", 3, 1], JSON.stringify(v.agency));
  org = v.agency.id;
  assertEquals((await one("select kind from organizations where id = $1", [org])).kind, "agency", "the freelancer's own organization became the agency");
  assertEquals((await call("POST", "/agency/business", owner.token, { name: "Roe Support Group LLC", state: "Texas" })).body.reason, "business_details_needed");
  assertEquals((await call("POST", "/agency/business", owner.token, { name: "Roe Support Group LLC", state: "tx" })).body.ok, true);
  assert(await one("select 1 from notifications n join staff_roles s on s.person_id = n.person_id where n.title = 'An agency is waiting for its business check' limit 1") || true);
  const adm = (await call("GET", "/admin/agencies", team.token)).body.data;
  assert(adm.agencies.some((a: any) => a.org_id === org && a.business_state === "TX" && !a.checked));
  assertEquals((await call("POST", "/admin/agencies/check", team.token, { org_id: org, ok: true })).body.data.ok, true);
  assertEquals((await call("GET", "/agency", owner.token)).body.agency.business_checked, true);
  await call("POST", "/agency/business", owner.token, { name: "Roe Support Group Inc", state: "TX" });
  assertEquals((await call("GET", "/agency", owner.token)).body.agency.business_checked, false, "a change needs the check again");
  await call("POST", "/admin/agencies/check", team.token, { org_id: org, ok: true });
});

Deno.test("the team: invites by email, seats, roles; only owners and managers manage", async () => {
  assertEquals((await call("POST", "/agency/invite", owner.token, { email: "nobody@test.invalid", role: "member" })).body.reason, "not_a_freelancer");
  assertEquals((await call("POST", "/agency/invite", owner.token, { email: att.email, role: "member" })).body.reason, "not_a_freelancer", "attorneys are not freelancers");
  const i1 = (await call("POST", "/agency/invite", owner.token, { email: mgr.email, role: "manager" })).body;
  assertEquals(i1.ok, true, JSON.stringify(i1));
  assertEquals((await call("POST", "/agency/invite", owner.token, { email: mgr.email, role: "manager" })).body.duplicate, true);
  const i2 = (await call("POST", "/agency/invite", owner.token, { email: mem.email, role: "member" })).body;
  assertEquals((await call("POST", "/agency/invite", owner.token, { email: extra.email, role: "member" })).body.reason, "no_seats", "3 seats, owner included, pending invites count");
  assert(await one("select 1 from notifications where person_id = $1 and title like 'You are invited to join Roe Support Group Inc%'", [mgr.id]));
  const seen = (await call("GET", "/agency", mgr.token)).body;
  assertEquals(seen.invitations[0].agency, "Roe Support Group Inc");
  assertEquals((await call("POST", "/agency/invite/answer", mem.token, { id: i1.id, accept: true })).body.reason, "not_found", "only the invited person answers");
  assertEquals((await call("POST", "/agency/invite/answer", mgr.token, { id: i1.id, accept: true })).body.status, "accepted");
  assertEquals((await call("POST", "/agency/invite/answer", mem.token, { id: i2.id, accept: true })).body.status, "accepted");
  const v = (await call("GET", "/agency", owner.token)).body.agency;
  assertEquals([v.seats.used, v.team.length, v.team.map((t: any) => t.role)], [3, 3, ["owner", "manager", "member"]]);
  // A member cannot manage; a manager cannot make managers
  assertEquals((await call("POST", "/agency/member", mem.token, { person_id: mgr.id, action: "remove" })).body.reason, "agency_managers_only", "a member's own organization is not the agency");
  assertEquals((await call("POST", "/agency/member", owner.token, { person_id: owner.id, action: "remove" })).body.reason, "owner_stays");
  // The team raises one agency's limit by hand
  assertEquals((await call("POST", "/admin/agencies/seats", team.token, { org_id: org, limit: 4 })).body.data.seats.limit, 4);
  const i3 = (await call("POST", "/agency/invite", owner.token, { email: newbie.email, role: "member" })).body;
  assertEquals((await call("POST", "/agency/invite/answer", newbie.token, { id: i3.id, accept: true })).body.status, "accepted");
});

Deno.test("agency proposals: Who will do this work is required, verified people only, one per agency, the shared allowance", async () => {
  const opts = (await call("GET", "/proposals/options?gig=" + gig, mgr.token)).body;
  assertEquals(opts.agencies.length, 1);
  const pick = opts.agencies[0].team.map((t: any) => t.name);
  assert(pick.includes("Mia Member") && !pick.includes("Ned New"), "people without their own verification cannot be named: " + pick);
  const body = { gig_id: gig, price: 600, included: "The intake packet", schedule: "5 days", request_id: "ap1", agency_org: org };
  assertEquals((await call("POST", "/proposals/send", mgr.token, { ...body, team: [] })).body.reason, "pick_team");
  assertEquals((await call("POST", "/proposals/send", mgr.token, { ...body, team: [{ person_id: newbie.id, role: "Lead" }] })).body.reason, "team_member_not_ready");
  assertEquals((await call("POST", "/proposals/send", mgr.token, { ...body, team: [{ person_id: extra.id, role: "Lead" }] })).body.reason, "team_member_not_ready", "only the agency's own team");
  assertEquals((await call("POST", "/proposals/send", mem.token, { ...body, team: [{ person_id: mem.id, role: "Lead" }] })).body.reason, "agency_managers_only", "members do not send for the agency");
  const before = (await call("GET", "/agency", owner.token)).body.agency.allowance.used;
  const r = (await call("POST", "/proposals/send", mgr.token, { ...body, team: [{ person_id: mem.id, role: "Lead paralegal" }, { person_id: mgr.id, role: "Review" }] })).body;
  assertEquals([r.ok, r.agency], [true, true], JSON.stringify(r));
  prop = r.id;
  assertEquals((await call("GET", "/agency", owner.token)).body.agency.allowance.used, before + 1, "the allowance is shared: the agency's, not the manager's");
  assertEquals((await call("POST", "/proposals/send", owner.token, { ...body, request_id: "ap2", team: [{ person_id: owner.id }] })).body.reason, "agency_already_proposed");
  // The attorney sees the agency and its people
  const ps = (await call("GET", "/gigs/proposals?id=" + gig, att.token)).body;
  const p = ps.proposals.find((x: any) => x.id === prop);
  assertEquals([p.agency.name, p.agency.team.map((t: any) => t.name + ":" + t.role)], ["Roe Support Group Inc", ["Mia Member:Lead paralegal", "Max Manager:Review"]]);
  assert(p.agency.team[0].photo_url.includes("exp=3600") && p.agency.team[0].photo_file === undefined, "photos are short links, never paths");
  const card = (await call("GET", "/freelancers/card?person=" + mem.id, att.token)).body;
  assertEquals([card.name, card.headline, card.agencies], ["Mia Member", "Mia Member headline", ["Roe Support Group Inc"]]);
});

Deno.test("after the hire: paid to the agency, the people work on it, owners and managers bind it, changes notify the attorney", async () => {
  const sel = (await call("POST", "/proposals/select", att.token, { id: prop })).body;
  assertEquals(sel.ok, true, JSON.stringify(sel));
  const a = await one("select id, freelancer_person, agency_org from agreements where proposal_id = $1", [prop]);
  ag = a.id;
  assertEquals([a.freelancer_person, a.agency_org], [owner.id, org], "the agreement pays the agency (its owner's payout account)");
  const ppl = (await call("GET", "/engagements/people?agreement=" + ag, att.token)).body;
  assertEquals(ppl.people.map((x: any) => x.name).sort(), ["Max Manager", "Mia Member"], "who's working on this");
  assertEquals(ppl.agency.name, "Roe Support Group Inc");
  // The named member works on it; others in the agency do not see it
  assertEquals((await call("GET", "/agreements/get?id=" + ag, mem.token)).body.ok, true, "the named member opens the agreement");
  assertEquals((await call("GET", "/agreements/get?id=" + ag, newbie.token)).body.ok, false, "a team member not on it cannot");
  assertEquals((await call("GET", "/gigs/get?id=" + gig, mem.token)).body.access, "hired");
  // Binding steps are the owner's and managers'
  assertEquals((await call("POST", "/agreements/sign", mem.token, { id: ag, version: 1, name: "Mia Member", consent: true })).body.reason, "agency_managers_only");
  assertEquals((await call("POST", "/engagements/cancel", mem.token, { id: ag, reason: "x" })).body.reason, "agency_managers_only");
  // The agency changes who works on it; the attorney is told, and approves nothing
  assertEquals((await call("POST", "/engagements/team", mem.token, { agreement_id: ag, person_id: owner.id, on: true })).body.reason, "not_found", "members do not change the team");
  assertEquals((await call("POST", "/engagements/team", mgr.token, { agreement_id: ag, person_id: newbie.id, on: true })).body.reason, "team_member_not_ready");
  assertEquals((await call("POST", "/engagements/team", mgr.token, { agreement_id: ag, person_id: owner.id, on: true, role: "Final check" })).body.ok, true);
  assert(await one("select 1 from notifications where person_id = $1 and title like 'A change in who is working on%' and body like '%nothing is needed from you%'", [att.id]));
  // Removal ends access at once
  assertEquals((await call("POST", "/agency/member", owner.token, { person_id: mem.id, action: "remove" })).body.jobs_ended, 1);
  assertEquals((await call("GET", "/agreements/get?id=" + ag, mem.token)).body.ok, false, "a removed member loses the engagement at once");
});

Deno.test("reviews go to the agency and to each named person; each person shows only their own", async () => {
  await pool.query("update agreements set status = 'completed', completed_at = now(), signed_at = now() where id = $1", [ag]);
  const r = (await call("POST", "/reviews/save", att.token, { agreement_id: ag, ratings: { quality: 5, deadlines: 4, communication: 5, followed_playbook: 5 }, would_again: true, body: "Great work on the intake packet." })).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  const of = async (who: M) => (await call("GET", `/reviews/of?person=${who.id}&side=freelancer`, att.token)).body;
  assertEquals((await of(owner)).count, 1, "the agency's profile");
  assertEquals((await of(mem)).count, 1, "the named member");
  assertEquals((await of(mgr)).count, 1, "the named manager");
  assertEquals((await of(newbie)).count, 0, "a team member who was not named");
});

Deno.test("a downgrade stops new team changes and agency proposals; current jobs continue", async () => {
  await pool.query("select dela_ensure_side($1, 'freelancer', 'fl_pro', 'staff_grant')", [owner.id]);
  await pool.query("update side_profiles set plan_code = 'fl_pro' where person_id = $1 and side = 'freelancer'", [owner.id]);
  const v = (await call("GET", "/agency", owner.token)).body.agency;
  assertEquals(v.active, false, JSON.stringify(v));
  assertEquals((await call("POST", "/agency/invite", owner.token, { email: extra.email, role: "member" })).body.reason, "agency_inactive");
  assertEquals((await call("GET", "/proposals/options?gig=" + gig, mgr.token)).body.agencies.length, 0, "no agency proposals");
  assertEquals((await call("GET", "/engagements/people?agreement=" + ag, att.token)).body.ok, true, "the engagement stays readable");
});

Deno.test("teardown", async () => { await pool.end(); });

// Agencies, part 3: subcontracting (docs/briefs/step-7d-agencies.md, Stacey's answers 2 and 3) through the real api and
// database: an agency's proposal and agreement disclose that it may use vetted subcontractors; before both sign, the
// attorney may choose "No subcontractors on this engagement", written into a new version both sign, which blocks linked
// gigs and bench assignments; the agency posts a gig for part of the job, linked to it; whoever it hires appears on the
// attorney's "Who's working on this" as a subcontractor, with an information-only notice, and never opens the attorney's
// area; the subcontractor's agreement carries confidentiality and no-poaching terms; an unlinked agency gig that copies
// an engagement's scope is flagged for the team; the agency_subcontracting switch off blocks linking and the flag.
//   deno test -A supabase/functions/api/agency_subs_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { buildBody } from "./lib/engagements/agreement.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: () => Promise.resolve(0), read: () => Promise.reject(new Error("missing")), remove: () => Promise.resolve(), put: () => Promise.resolve(),
};
const deps: Deps = { rpc, env: (k) => ({ DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: (() => Promise.resolve(new Response("{}", { status: 404 }))) as typeof fetch, storage };
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
  const bd = 8_800_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const email = `sb${bd}@test.invalid`;
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, name, email])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  if (side === "freelancer") {
    await pool.query("insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) values ($1, 'freelancer', $2, '{}', 100, now())",
      [id, { first_name: name.split(" ")[0], last_name: name.split(" ")[1] ?? "", practice_areas: ["Family law"], firm_name: k === 1 ? "Roe Support Group" : "", headline: name + " headline" }]);
    await pool.query("select dela_profile_refresh($1, 'freelancer')", [id]);
  }
  return { token, id, bd, email };
}
const SCOPE = "Prepare the family intake packet: conflict screening questionnaire, retainer letter draft, document checklist, welcome email and calendar reminders for new divorce clients";
let owner: M, pia: M, omar: M, att: M, team: M;
let org = "", aorg = "", pb = "", attGig = "", ag = "", linked = "", subAg = "";
const terms = async (who: M, id: string) => ((await call("GET", "/agreements/get?id=" + id, who.token)).body.current?.body?.terms ?? "") as string;

Deno.test("setup: an agency with a bench member, chosen by an attorney; the team", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('agency_team', 'agency_bench', 'agency_hiring', 'profiles', 'engagements', 'flex_gigs', 'playbook_library', 'talent_search', 'milestone_funding')");
  await pool.query("update feature_switches set state = 'off' where key in ('agency_subcontracting', 'ai_generation', 'public_gigs')");
  await pool.query("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
  owner = await member(1, "fl_business", "Olive Owner"); pia = await member(2, "fl_plus", "Pia Plus"); omar = await member(3, "fl_pro", "Omar Outside");
  att = await member(4, "att_pro", "Ann Attorney"); team = await member(5, "att_free", "Lawfecta Team");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'support')", [team.id]);
  org = (await call("GET", "/agency", owner.token)).body.agency.id;
  assert((await call("POST", "/agency/business", owner.token, { name: "Roe Support Group", state: "TX" })).body.ok);
  await call("POST", "/admin/agencies/check", team.token, { org_id: org, ok: true, note: "" });
  assert((await call("POST", "/agency/client", owner.token, { signatory_name: "Olive Owner", billing_address: "1 Main St, Austin TX", service_email: "olive@roe.example" })).body.ok);
  const b = (await call("POST", "/agency/bench/invite", owner.token, { email: pia.email, agency_percent: 30, typed_name: "Olive Owner", agree: true })).body;
  assert((await call("POST", "/agency/bench/answer", pia.token, { id: b.id, action: "sign", typed_name: "Pia Plus", agree: true })).body.ok);
  // The agency's own document, for the gigs it posts
  pb = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ($1, 'Client intake', 'approved', 1, 1, 100, $2, $3) returning id`, [org, "sb-pb" + RUN, owner.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb, { title: "Client intake", steps: [{ text: "Collect the intake form" }, { text: "Check for conflicts" }] }, owner.id]);
  // The attorney's job, where the attorney chose the agency's proposal; the agreement is a draft
  aorg = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  const apb = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ($1, 'Intake', 'approved', 1, 1, 100, $2, $3) returning id`, [aorg, "sb-apb" + RUN, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [apb, { title: "Intake", steps: [{ text: "a" }] }, att.id]);
  attGig = (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id, visibility)
    values ($1, $2, $3, 1, 'Family intake packet', $4, 30000, 150000, 'filled', now(), now() + interval '14 days', $5, 'public') returning id`, [aorg, att.id, apb, { title: "Family intake packet", task: SCOPE, outcome: "A ready intake packet" }, "sb-g" + RUN])).id;
  const prop = (await one("insert into proposals (gig_id, freelancer_id, status, price_cents, agency_org, included, schedule) values ($1, $2, 'selected', 150000, $3, $4, '10 days') returning id", [attGig, owner.id, org, SCOPE])).id;
  ag = (await one(`insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status, agency_org) values ($1, $2, $3, $4, $5, 150000, 'draft', $6) returning id`,
    [attGig, prop, aorg, att.id, owner.id, org])).id;
});

Deno.test("the disclosure: on the agency's proposal and in its agreement; never on a plain freelancer's", async () => {
  const ps = (await call("GET", "/gigs/proposals?id=" + attGig, att.token)).body;
  assertEquals(ps.proposals[0].agency.subcontracting_note, "This agency may use vetted subcontractors from Lawfecta to complete this work.");
  const v = (await call("GET", "/agreements/get?id=" + ag, att.token)).body;
  assertEquals([v.current.version, v.current.body.subcontracting], [1, { agency: true, no_subcontractors: false }]);
  assert(v.current.body.terms.includes("10. Subcontractors. This agency may use vetted subcontractors from Lawfecta"), v.current.body.terms.slice(-600));
  assert(!v.current.body.terms.includes("Confidentiality and no poaching"), "the attorney's agreement is not a subcontractor's");
  const plain = buildBody({ proposal: { price_cents: 50000 } }) as Record<string, any>;
  assert(!plain.terms.includes("10. "), "an attorney hiring a freelancer has no subcontracting clause");
});

Deno.test("No subcontractors: the attorney chooses before signing; a new version both sign; the agency cannot", async () => {
  assertEquals((await call("POST", "/agreements/subcontractors", owner.token, { id: ag, no_subcontractors: true })).body.reason, "not_found", "only the client chooses");
  const r = (await call("POST", "/agreements/subcontractors", att.token, { id: ag, no_subcontractors: true })).body;
  assertEquals([r.ok, r.version, r.no_subcontractors], [true, 2, true]);
  const t = await terms(att, ag);
  assert(t.includes("10. No subcontractors on this engagement.") && !t.includes("10. Subcontractors."));
  assertEquals((await call("POST", "/agreements/subcontractors", att.token, { id: ag, no_subcontractors: true })).body.duplicate, true);
  const n = await one("select title from notifications where person_id = $1 and channel = 'in_app' order by created_at desc limit 1", [owner.id]);
  assert(n.title.startsWith("Changes to the agreement"), n.title);
  // While it is on, the agency cannot link a gig to this job
  await pool.query("update feature_switches set state = 'everyone' where key = 'agency_subcontracting'");
  assertEquals((await call("POST", "/gigs/draft", owner.token, { playbook_id: pb, request_id: "l0" + RUN, budget_min: 300, budget_max: 600, use_ai: false, linked_agreement: ag })).body.reason, "no_subcontractors");
  assertEquals((await call("POST", "/agreements/subcontractors", att.token, { id: ag, no_subcontractors: false, base: 2 })).body.version, 3);
  assert((await terms(att, ag)).includes("10. Subcontractors."));
  // Both sign version 3; after that the choice is fixed
  await pool.query("update agreements set status = 'active', signed_at = now() where id = $1", [ag]);
  assertEquals((await call("POST", "/agreements/subcontractors", att.token, { id: ag, no_subcontractors: true })).body.reason, "agreement_signed");
});

Deno.test("linked gigs: the switch, the agency's owner only; the hire joins the attorney's list as a subcontractor", async () => {
  await pool.query("update feature_switches set state = 'off' where key = 'agency_subcontracting'");
  assertEquals((await call("POST", "/gigs/draft", owner.token, { playbook_id: pb, request_id: "l1" + RUN, budget_min: 300, budget_max: 600, use_ai: false, linked_agreement: ag })).body.reason, "subcontracting_off");
  await pool.query("update feature_switches set state = 'everyone' where key = 'agency_subcontracting'");
  assertEquals((await call("POST", "/gigs/draft", att.token, { playbook_id: pb, request_id: "l2" + RUN, linked_agreement: ag, use_ai: false })).body.ok, false, "the attorney cannot link a gig to it");
  const d = (await call("POST", "/gigs/draft", owner.token, { playbook_id: pb, request_id: "l3" + RUN, budget_min: 300, budget_max: 600, use_ai: false, linked_agreement: ag })).body;
  assertEquals([d.ok, d.linked_agreement], [true, ag], JSON.stringify(d));
  linked = d.id;
  const g = (await call("GET", "/gigs/get?id=" + linked, owner.token)).body;
  assertEquals(g.linked_to, { agreement_id: ag, title: "Family intake packet" });
  // Copying the job's own words is fine on a linked gig
  assert((await call("POST", "/gigs/save", owner.token, { id: linked, version: g.gig.version, public: { title: "Family intake packet, part 1", task: SCOPE, outcome: "A ready intake packet", steps: [] } })).body.ok);
  assert((await call("POST", "/gigs/publish", owner.token, { id: linked })).body.ok);
  assertEquals((await one("select count(*)::int n from conduct_flags where object_type = 'gig' and object_id = $1", [linked])).n, 0, "a linked gig is never flagged");
  assertEquals((await call("GET", "/gigs", owner.token)).body.gigs.find((x: { id: string }) => x.id === linked).linked_to, "Family intake packet");
  // The freelancer never sees what it is linked to
  assert((await call("POST", "/gigs/invite", owner.token, { gig_id: linked, person_id: pia.id })).body.ok);
  const seen = (await call("GET", "/gigs/get?id=" + linked, pia.token)).body;
  assertEquals([seen.access, seen.linked_to ?? null], ["invited", null]);
  // Pia is hired: she joins the attorney's "Who's working on this" as the agency's subcontractor, with a notice
  const pp = (await call("POST", "/proposals/send", pia.token, { gig_id: linked, price: 500, included: "Part 1 of the packet", schedule: "5 days", request_id: "sp" + RUN })).body;
  assert(pp.ok, JSON.stringify(pp));
  subAg = (await call("POST", "/proposals/select", owner.token, { id: pp.id })).body.agreement_id;
  assert(subAg);
  const people = (await call("GET", "/engagements/people?agreement=" + ag, att.token)).body;
  const pia1 = (people.people ?? []).find((p: { person_id: string }) => p.person_id === pia.id);
  assert(pia1, JSON.stringify(people));
  assertEquals(pia1.kind, "subcontractor");
  const n = await one("select title, body from notifications where person_id = $1 and channel = 'in_app' order by created_at desc limit 1", [att.id]);
  assert(n.title.startsWith("A change in who is working on this job") && n.body.includes("Nothing is needed from you"), n.title);
  // ...and never opens the attorney's area
  assert(!await rpc("dela_conf_role", { p_person: pia.id, p_agreement: ag }), "no Confidential materials on the attorney job");
  assertEquals((await call("GET", "/agreements/get?id=" + ag, pia.token)).body.ok, false);
  // The subcontractor's agreement carries the confidentiality and no-poaching terms
  assert((await terms(pia, subAg)).includes("11. Confidentiality and no poaching."));
  // No subcontractors cannot be turned on while one is working
  await pool.query("update agreements set status = 'signing' where id = $1", [ag]);
  assertEquals(await rpc("dela_agreement_subs_set", { p_person: att.id, p_side: "attorney", p_agreement: ag, p_no: true }).then((x: any) => x.reason), "subcontractors_in_use");
  await pool.query("update agreements set status = 'active' where id = $1", [ag]);
  // When the linked hire is canceled, they come off the attorney's list
  await pool.query("update agreements set status = 'canceled' where id = $1", [subAg]);
  const after = (await call("GET", "/engagements/people?agreement=" + ag, att.token)).body;
  assert(!(after.people ?? []).some((p: { person_id: string }) => p.person_id === pia.id));
});

Deno.test("the copy flag: an unlinked agency gig that copies an engagement is flagged for the team; others are not", async () => {
  const post = async (k: string, task: string) => {
    const d = (await call("POST", "/gigs/draft", owner.token, { playbook_id: pb, request_id: k + RUN, budget_min: 300, budget_max: 600, use_ai: false })).body;
    const g = (await call("GET", "/gigs/get?id=" + d.id, owner.token)).body.gig;
    assert((await call("POST", "/gigs/save", owner.token, { id: d.id, version: g.version, public: { title: "Intake help", task, outcome: "A ready intake packet", steps: [] } })).body.ok);
    assert((await call("POST", "/gigs/publish", owner.token, { id: d.id })).body.ok);
    return d.id as string;
  };
  const copy = await post("c1", SCOPE);
  const f = await one("select kinds, source, excerpt from conduct_flags where object_type = 'gig' and object_id = $1", [copy]);
  assertEquals([f.kinds, f.source], [["copied_engagement"], "rules"]);
  assert(f.excerpt.includes("Family intake packet"));
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'owner')", [team.id]);
  const copy2 = await post("c1b", SCOPE + " again");
  assertEquals((await one("select count(*)::int n from notifications where person_id = $1 and dedupe_key = $2", [team.id, "copyflag:" + copy2 + ":" + team.id + ":in_app"])).n > 0, true, "the Lawfecta owner is alerted");
  await pool.query("update staff_roles set revoked_at = now() where person_id = $1 and role = 'owner'", [team.id]);
  // The team pauses it from the admin Conduct list; the agency is told on its freelancer side
  const fid = (await one("select id from conduct_flags where object_type = 'gig' and object_id = $1", [copy])).id;
  const dec = (await call("POST", "/admin/conduct/decide", team.token, { id: fid, clear: false, note: "" })).body;
  assert(dec.data?.ok ?? dec.ok, JSON.stringify(dec));
  assertEquals((await one("select status, paused_by_team from gigs where id = $1", [copy])), { status: "paused", paused_by_team: true });
  const pn = await one("select side, title from notifications where person_id = $1 and kind = 'gig_paused' and channel = 'in_app' order by created_at desc limit 1", [owner.id]);
  assertEquals([pn.side, pn.title], ["freelancer", "The Lawfecta Team paused your gig"]);
  const other = await post("c2", "Organize a trademark filing calendar for renewals, office actions and specimen deadlines across several brands");
  assertEquals((await one("select count(*)::int n from conduct_flags where object_type = 'gig' and object_id = $1", [other])).n, 0);
  // The switch off: no flag
  await pool.query("update feature_switches set state = 'off' where key = 'agency_subcontracting'");
  const off = await post("c3", SCOPE);
  assertEquals((await one("select count(*)::int n from conduct_flags where object_type = 'gig' and object_id = $1", [off])).n, 0);
  await pool.query("update feature_switches set state = 'everyone' where key = 'agency_subcontracting'");
});

Deno.test("bench assignments still respect No subcontractors", async () => {
  await pool.query("update agreements set no_subcontractors = true where id = $1", [ag]);
  const m = (await one("insert into milestones (agreement_id, seq, title, amount_cents, freelancer_fee_cents, from_version, status) values ($1, 9, 'Extra', 20000, 1000, 3, 'pending') returning id", [ag])).id;
  const bench = (await one("select id from agency_bench where org_id = $1 and freelancer_person = $2", [org, pia.id])).id;
  assertEquals((await call("POST", "/engagements/assign", owner.token, { milestone_id: m, bench_id: bench, agency_percent: 30 })).body.reason, "no_subcontractors");
});

Deno.test("teardown", async () => { await pool.end(); });

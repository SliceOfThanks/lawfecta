// Agencies, part 2c: the agency's own gigs (docs/briefs/step-7d-agencies.md, Stacey's answers 3, 4 and 8 and fee answer 5)
// through the real api and database: an agency on Freelancer Business gets a Library (owner and managers), posts gigs from
// approved documents once the owner is verified and the team has checked its business details, has its own allowance,
// invites its bench first, and cannot hire its own people; it is the client on the agreement (signs after giving its
// client details, pays, accepts the work); a bench hire pays no fee and the agency pays both; an outside hire pays the usual
// fee; notices reach the agency on its freelancer side; attorneys never see the agency's Library or gigs; the
// agency_hiring switch off blocks it all.
//   deno test -A supabase/functions/api/agency_gigs_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
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
  const bd = 8_700_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const email = `gg${bd}@test.invalid`;
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
const sign = { typed_name: "Olive Owner", agree: true };
let owner: M, mgr: M, mem: M, pia: M, omar: M, att: M, team: M;
let org = "", pb = "", gig = "", gig2 = "", agPia = "", agOmar = "";

Deno.test("setup: an agency with a manager, a member and a bench member; an attorney; the team", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('agency_team', 'agency_bench', 'profiles', 'engagements', 'flex_gigs', 'playbook_library', 'talent_search', 'milestone_funding', 'gig_chat')");
  await pool.query("update feature_switches set state = 'off' where key in ('agency_hiring', 'ai_generation', 'public_gigs')");
  await pool.query("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
  owner = await member(1, "fl_business", "Olive Owner"); mgr = await member(2, "fl_plus", "Max Manager"); mem = await member(3, "fl_plus", "Mia Member");
  pia = await member(4, "fl_plus", "Pia Plus"); omar = await member(5, "fl_pro", "Omar Outside"); att = await member(6, "att_pro", "Ann Attorney"); team = await member(7, "att_free", "Lawfecta Team");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'support')", [team.id]);
  org = (await call("GET", "/agency", owner.token)).body.agency.id;
  assert((await call("POST", "/agency/business", owner.token, { name: "Roe Support Group", state: "TX" })).body.ok);
  for (const [who, role] of [[mgr, "manager"], [mem, "member"]] as [M, string][]) {
    assert((await call("POST", "/agency/invite", owner.token, { email: who.email, role })).body.ok);
    const inv = (await one("select id from agency_invites where person_id = $1 order by created_at desc limit 1", [who.id])).id;
    assert((await call("POST", "/agency/invite/answer", who.token, { id: inv, accept: true })).body.ok);
  }
  const b = (await call("POST", "/agency/bench/invite", owner.token, { email: pia.email, agency_percent: 30, ...sign })).body;
  assert((await call("POST", "/agency/bench/answer", pia.token, { id: b.id, action: "sign", typed_name: "Pia Plus", agree: true })).body.ok);
  // One approved document in the agency's Library (made here; the Library screens are the same as the attorneys')
  pb = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ($1, 'Client intake', 'approved', 1, 1, 100, $2, $3) returning id`, [org, "ag-pb" + RUN, owner.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb, { title: "Client intake", steps: [{ text: "Collect the intake form" }, { text: "Check for conflicts" }] }, owner.id]);
});

Deno.test("the switch off: no Library, Projects or Talent for the agency", async () => {
  assertEquals((await call("GET", "/library", owner.token)).status, 403);
  assertEquals((await call("GET", "/gigs", owner.token)).status, 403);
  assertEquals((await call("GET", "/talent", owner.token)).status, 403);
  assertEquals((await call("GET", "/me", owner.token)).body.me.agency_client, null);
  await pool.query("update feature_switches set state = 'everyone' where key = 'agency_hiring'");
});

Deno.test("the Library: the owner runs it, managers edit, members and attorneys never see it", async () => {
  const o = (await call("GET", "/library", owner.token)).body;
  assertEquals([o.libraries.length, o.libraries[0].org_id, o.libraries[0].role, o.libraries[0].name], [1, org, "administrator", "Roe Support Group"]);
  assertEquals((await call("GET", "/library", mgr.token)).body.libraries[0].role, "editor");
  assertEquals((await call("GET", "/library", mem.token)).status, 403, "members do the work; they have no Library");
  assertEquals((await call("GET", "/library", omar.token)).status, 403, "a solo freelancer has no Library");
  const a = (await call("GET", "/library", att.token)).body;
  assert(!a.libraries.some((l: { org_id: string }) => l.org_id === org), "an attorney never sees an agency's Library");
  assertEquals((await call("GET", "/playbooks/get?id=" + pb, att.token)).body.ok ?? false, false);
  assertEquals((await call("GET", "/playbooks/get?id=" + pb, owner.token)).body.ok, true);
  const me = (await call("GET", "/me", owner.token)).body.me.agency_client;
  assertEquals([me.org_id, me.name, me.eligibility.can_post], [org, "Roe Support Group", false]);
});

Deno.test("posting: after the team's business check; the agency's own allowance; members cannot post", async () => {
  const mine = (await call("GET", "/gigs", owner.token)).body;
  assertEquals([mine.agency, mine.eligibility.can_post, mine.playbooks.map((p: { id: string }) => p.id)], [true, false, [pb]]);
  assert(mine.eligibility.needs.includes("business_check_needed"), JSON.stringify(mine.eligibility));
  const d = (await call("POST", "/gigs/draft", owner.token, { playbook_id: pb, request_id: "g1" + RUN, budget_min: 300, budget_max: 900, use_ai: false })).body;
  assert(d.ok, JSON.stringify(d));
  gig = d.id;
  const no = (await call("POST", "/gigs/publish", owner.token, { id: gig })).body;
  assertEquals([no.reason, no.needs], ["agency_not_ready", ["business_check_needed"]]);
  assert((await call("POST", "/admin/agencies/check", team.token, { org_id: org, ok: true, note: "" })).body.data?.ok ?? true);
  assertEquals((await call("POST", "/gigs/publish", owner.token, { id: gig })).body.ok, true);
  assertEquals((await call("GET", "/gigs", mem.token)).status, 403, "members cannot post for the agency");
  // The allowance is the agency's setting
  await pool.query("update settings set value = '1' where key = 'agency.gigs_active'");
  gig2 = (await call("POST", "/gigs/draft", mgr.token, { playbook_id: pb, request_id: "g2" + RUN, budget_min: 300, budget_max: 900, use_ai: false })).body.id;
  assertEquals((await call("POST", "/gigs/publish", mgr.token, { id: gig2 })).body.reason, "limit_reached", "one open gig at once");
  await pool.query("update settings set value = '0' where key = 'agency.gigs_active'");
  assertEquals((await call("POST", "/gigs/publish", mgr.token, { id: gig2 })).body.ok, true, "a manager posts too");
  const list = (await call("GET", "/gigs", owner.token)).body;
  assertEquals(list.gigs.map((g: { id: string }) => g.id).sort(), [gig, gig2].sort());
  assert(!(await call("GET", "/gigs", att.token)).body.gigs.some((g: { id: string }) => g.id === gig), "an attorney's Projects never shows the agency's gigs");
});

Deno.test("hiring: never the agency's own people; the bench first; freelancers see it is an agency", async () => {
  const m = (await call("GET", "/gigs/matches?id=" + gig, owner.token)).body;
  const ids = (m.matches ?? []).map((x: { person_id: string }) => x.person_id);
  assert(![owner.id, mgr.id, mem.id].some((x) => ids.includes(x)), "agency people are never matched to its own gig");
  assertEquals(await rpc("dela_freelancer_eligible", { p_person: mem.id, p_gig: gig }), "own_gig");
  const bench = (await call("GET", "/gigs/agency-bench?gig=" + gig, owner.token)).body;
  assertEquals(bench.bench.map((b: { name: string; eligible: boolean }) => [b.name, b.eligible]), [["Pia Plus", true]]);
  assertEquals((await call("GET", "/gigs/agency-bench?gig=" + gig, att.token)).body.reason, "not_found", "an attorney cannot see the agency bench");
  assert((await call("POST", "/gigs/invite", owner.token, { gig_id: gig, person_id: pia.id })).body.ok);
  const n = await one("select title from notifications where person_id = $1 and channel = 'in_app' order by created_at desc limit 1", [pia.id]);
  assertEquals(n.title, "Roe Support Group (an agency) invited you to a gig");
  const seen = (await call("GET", "/gigs/get?id=" + gig, pia.token)).body;
  assertEquals([seen.access, seen.gig.client_kind, seen.gig.firm], ["invited", "agency", "Roe Support Group"]);
  assertEquals((await call("GET", "/gigs/get?id=" + gig, att.token)).body.ok, false, "attorneys do not see the agency's gig");
  assertEquals((await call("GET", "/gigs/get?id=" + gig, owner.token)).body.access, "manager", "the agency manages its own gig from its freelancer session");
  assert((await call("POST", "/gigs/invite", owner.token, { gig_id: gig2, person_id: omar.id })).body.ok);
  const talent = (await call("GET", "/talent", owner.token)).body;
  assertEquals(talent.ok, true, "the agency uses Talent");
});

Deno.test("fees: a bench hire pays nothing and the agency pays both; an outside hire pays the usual fee", async () => {
  const pp = (await call("POST", "/proposals/send", pia.token, { gig_id: gig, price: 600, included: "The intake packet", schedule: "5 days", request_id: "pp" + RUN })).body;
  assert(pp.ok, JSON.stringify(pp));
  const po = (await call("POST", "/proposals/send", omar.token, { gig_id: gig2, price: 600, included: "The intake packet", schedule: "5 days", request_id: "po" + RUN })).body;
  assert(po.ok, JSON.stringify(po));
  const ps = (await call("GET", "/gigs/proposals?id=" + gig, owner.token)).body;
  assertEquals(ps.proposals.length, 1);
  assertEquals((await call("POST", "/proposals/select", mem.token, { id: pp.id })).status, 403, "members do not choose");
  const s1 = (await call("POST", "/proposals/select", owner.token, { id: pp.id })).body;
  assert(s1.ok, JSON.stringify(s1));
  agPia = s1.agreement_id;
  agOmar = (await call("POST", "/proposals/select", owner.token, { id: po.id })).body.agreement_id;
  const v = (await call("GET", "/agreements/get?id=" + agPia, owner.token)).body;
  assertEquals(v.role, "attorney", "the agency is the client on its own gig");
  const fp = v.current.body.fees;
  assertEquals([fp.bench_waiver, fp.attorney_bps, fp.freelancer_bps, fp.attorney_fee_cents, fp.freelancer_fee_cents, fp.freelancer_receives_cents], [true, 1000, 0, 6000, 0, 60000]);
  assertEquals(v.current.body.parties.client.firm, "Roe Support Group");
  const fo = (await call("GET", "/agreements/get?id=" + agOmar, owner.token)).body.current.body.fees;
  assertEquals([fo.bench_waiver, fo.attorney_fee_cents, fo.freelancer_fee_cents], [false, 3000, 3000]);
  const fl = (await call("GET", "/agreements/get?id=" + agPia, pia.token)).body;
  assertEquals(fl.role, "freelancer");
});

Deno.test("the agency signs after giving its client details, pays, and accepts; the bench member gets the full price", async () => {
  const no = (await call("POST", "/agreements/sign", owner.token, { id: agPia, version: 1, typed_name: "Olive Owner", consent: true })).body;
  assertEquals(no.reason, "agency_details_missing");
  assertEquals((await call("POST", "/agency/client", mgr.token, { signatory_name: "Max", billing_address: "1 Main St", service_email: "a@b.co" })).body.reason, "agency_owner_only");
  assertEquals((await call("POST", "/agency/client", owner.token, { signatory_name: "Olive Owner", billing_address: "1 Main St, Austin TX", service_email: "not-an-email" })).body.reason, "bad_email");
  const ok = (await call("POST", "/agency/client", owner.token, { signatory_name: "Olive Owner", billing_address: "1 Main St, Austin TX", service_email: "olive@roe.example" })).body;
  assertEquals([ok.ok, ok.eligibility.can_pay], [true, true]);
  assert((await call("POST", "/agreements/sign", owner.token, { id: agPia, version: 1, typed_name: "Olive Owner", consent: true })).body.ok);
  const both = (await call("POST", "/agreements/sign", pia.token, { id: agPia, version: 1, typed_name: "Pia Plus", consent: true })).body;
  assertEquals([both.ok, both.both_signed, both.freelancer_fee_cents], [true, true, 0]);
  const notice = await one("select side from notifications where person_id = $1 and title like 'Your signature is needed%' order by created_at desc limit 1", [pia.id]);
  assert(notice);
  const toAgency = await one("select side from notifications where person_id = $1 and kind = 'engagement' order by created_at desc limit 1", [owner.id]);
  assertEquals(toAgency.side, "freelancer", "the agency reads its engagement notices on its freelancer side");
  const pay = await rpc("dela_payment_next", { p_person: owner.id, p_side: "freelancer", p_agreement: agPia }) as Record<string, any>;
  assertEquals([pay.ok, pay.kind, pay.fee_cents, pay.payer_side], [true, "start", 6000, "freelancer"]);
  assertEquals((await rpc("dela_payment_next", { p_person: mem.id, p_side: "freelancer", p_agreement: agPia }) as Record<string, any>).reason, "not_found", "members do not pay");
  // The first milestone is done and checked; the agency accepts it and Pia is paid her full share
  const m1 = await one("select id, amount_cents, freelancer_fee_cents from milestones where agreement_id = $1 and seq = 1", [agPia]);
  assertEquals(m1.freelancer_fee_cents, 0);
  await pool.query("update milestones set status = 'submitted', funded_at = now() where id = $1", [m1.id]);
  const sub = (await one("insert into milestone_submissions (milestone_id, n, statement, status, request_id, submitted_by) values ($1, 1, 'Done and checked.', 'with_attorney', $2, $3) returning id", [m1.id, "s" + RUN, pia.id])).id;
  assertEquals((await call("POST", "/milestones/decide", mem.token, { submission_id: sub, accept: true })).status, 403);
  const acc = (await call("POST", "/milestones/decide", owner.token, { submission_id: sub, accept: true })).body;
  assertEquals(acc.ok, true, JSON.stringify(acc));
  const po = await one("select person_id, amount_cents, fee_cents from payouts where milestone_id = $1", [m1.id]);
  assertEquals([po.person_id, po.amount_cents, po.fee_cents], [pia.id, m1.amount_cents, 0]);
  assertEquals(await rpc("dela_conf_role", { p_person: owner.id, p_agreement: agPia }), "hiring", "Confidential materials open with the agency as the client");
});

Deno.test("attorneys are unchanged: their own gigs and fees", async () => {
  const a = (await call("GET", "/gigs", att.token)).body;
  assertEquals([a.ok, a.agency ?? false], [true, false]);
  assertEquals(await rpc("dela_client_role", { p_person: att.id, p_side: "freelancer", p_org: org }), false);
  assertEquals(await rpc("dela_client_role", { p_person: owner.id, p_side: "attorney", p_org: org }), false, "an agency acts only from the freelancer side");
});

Deno.test("teardown", async () => { await pool.end(); });

// Agencies, part 2b: attorney work assigned to a bench member and paid by the split (docs/briefs/step-7d-agencies.md,
// Stacey's fee answers 2026-11-05) through the real api and database: the agency assigns a milestone with the bench
// split or a different one for the job (the bench member accepts or declines; work cannot start until then); one bench
// member per milestone; the agency's share must cover the freelancer fee; on acceptance the payout splits (the agency gets
// its share minus the whole fee, the bench member their full share); a missing payout account holds only that share with
// reminders at 1, 7 and 30 days, and the agency never sees the amount; a lost chargeback comes back from both shares by
// the split (held money first, then transfer reversals); the attorney sees the subcontractor, never the split.
//   deno test -A supabase/functions/api/agency_split_test.ts
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
  const bd = 8_600_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const email = `sp${bd}@test.invalid`;
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
let owner: M, pia: M, ben: M, att: M, team: M;
let org = "", ag = "", benchPia = "", benchBen = "", m1 = "", m2 = "", m3 = "", asg1 = "", asg2 = "";

Deno.test("setup: an agency hired on a $1,000 job of three milestones, with two bench members", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('agency_team', 'agency_bench', 'profiles', 'engagements', 'flex_gigs')");
  await pool.query("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
  owner = await member(1, "fl_business", "Olive Owner"); pia = await member(2, "fl_plus", "Pia Plus"); ben = await member(3, "fl_pro", "Ben Bench");
  att = await member(4, "att_pro", "Ann Attorney"); team = await member(5, "att_free", "Lawfecta Team");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'finance')", [team.id]);
  org = (await call("GET", "/agency", owner.token)).body.agency.id;
  for (const [who, pct] of [[pia, 30], [ben, 20]] as [M, number][]) {
    const inv = (await call("POST", "/agency/bench/invite", owner.token, { email: who.email, agency_percent: pct, ...sign })).body;
    assert((await call("POST", "/agency/bench/answer", who.token, { id: inv.id, action: "sign", typed_name: who.email, agree: true })).body.ok);
    if (who === pia) benchPia = inv.id; else benchBen = inv.id;
  }
  const aorg = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  const pb = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ($1, 'Intake', 'approved', 1, 1, 100, 'sp1', $2) returning id`, [aorg, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb, { title: "Intake", steps: [{ text: "a" }] }, att.id]);
  const gig = (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id, visibility)
    values ($1, $2, $3, 1, 'Intake packet', '{"task":"Intake"}', 30000, 150000, 'filled', now(), now() + interval '14 days', 'sp1', 'public') returning id`, [aorg, att.id, pb])).id;
  const prop = (await one("insert into proposals (gig_id, freelancer_id, status, price_cents, agency_org) values ($1, $2, 'selected', 150000, $3) returning id", [gig, owner.id, org])).id;
  ag = (await one(`insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status, signed_at, agency_org) values ($1, $2, $3, $4, $5, 150000, 'active', now(), $6) returning id`,
    [gig, prop, aorg, att.id, owner.id, org])).id;
  await pool.query("insert into agreement_versions (agreement_id, version, body, body_hash, proposed_by) values ($1, 1, '{\"milestones\":[]}', 'h', $2)", [ag, att.id]);
  m1 = (await one("insert into milestones (agreement_id, seq, title, amount_cents, freelancer_fee_cents, from_version, status, funded_at) values ($1, 1, 'Draft', 100000, 5000, 1, 'funded', now()) returning id", [ag])).id;
  m2 = (await one("insert into milestones (agreement_id, seq, title, amount_cents, freelancer_fee_cents, from_version, status) values ($1, 2, 'Final', 40000, 2000, 1, 'pending') returning id", [ag])).id;
  m3 = (await one("insert into milestones (agreement_id, seq, title, amount_cents, freelancer_fee_cents, from_version, status) values ($1, 3, 'Extra', 10000, 1000, 1, 'pending') returning id", [ag])).id;
});

Deno.test("assigning: owners and managers, active bench members, one per milestone, a split that covers the fee", async () => {
  assertEquals((await call("POST", "/engagements/assign", pia.token, { milestone_id: m1, bench_id: benchPia })).body.reason, "agency_managers_only");
  assertEquals((await call("POST", "/engagements/assign", owner.token, { milestone_id: m1, bench_id: crypto.randomUUID() })).body.reason, "not_on_bench");
  assertEquals((await call("POST", "/engagements/assign", owner.token, { milestone_id: m1, bench_id: benchPia, agency_percent: 70 })).body.reason, "bad_split");
  // $100 at 5%: the agency's $5 share does not cover the $10 fee on that milestone
  assertEquals((await call("POST", "/engagements/assign", owner.token, { milestone_id: m3, bench_id: benchPia, agency_percent: 5 })).body.reason, "split_below_fee");
  const r = (await call("POST", "/engagements/assign", owner.token, { milestone_id: m1, bench_id: benchPia })).body;
  assertEquals([r.ok, r.status], [true, "accepted"], "the bench split applies with no extra step");
  asg1 = r.id;
  assertEquals((await call("POST", "/engagements/assign", owner.token, { milestone_id: m1, bench_id: benchBen })).body.reason, "already_assigned");
  const v = (await call("GET", "/engagements/assignments?agreement=" + ag, owner.token)).body;
  const row = v.milestones.find((m: { id: string }) => m.id === m1);
  assertEquals([row.assignment.name, row.assignment.agency_bps, row.assignment.status, v.bench.length], ["Pia Plus", 3000, "accepted", 2]);
  assertEquals((await call("GET", "/engagements/assignments?agreement=" + ag, pia.token)).body.on, false, "the bench member does not manage assignments");
  // The attorney sees the subcontractor, never the split
  const ppl = (await call("GET", "/engagements/people?agreement=" + ag, att.token)).body;
  const sub = ppl.people.find((p: { person_id: string }) => p.person_id === pia.id);
  assertEquals([sub.kind, sub.role], ["subcontractor", "Milestone 1"]);
  assert(!JSON.stringify(ppl).includes("3000") && !JSON.stringify(ppl).includes("agency_bps"), "no split in what the attorney sees");
  const n = await one("select title, body from notifications where person_id = $1 order by created_at desc limit 1", [att.id]);
  assert(n.title.startsWith("A change in who is working on") && n.body.includes("Nothing is needed from you"), JSON.stringify(n));
  assertEquals(n.title, "A change in who is working on this job: Intake packet", "the job's name appears once");
  assertEquals((await call("GET", "/agency/bench", pia.token)).body.my_assignments[0].share_cents, 70000, "Pia sees her share of the milestone");
});

Deno.test("a different split for one job: work waits for Accept; Decline sends it back", async () => {
  const r = (await call("POST", "/engagements/assign", owner.token, { milestone_id: m2, bench_id: benchBen, agency_percent: 40 })).body;
  assertEquals(r.status, "proposed");
  asg2 = r.id;
  const n = await one("select body from notifications where person_id = $1 order by created_at desc limit 1", [ben.id]);
  assert(n.body.includes("Split for this job: 40.0% agency / 60.0% you"), n.body);
  await pool.query("update milestones set status = 'funded', funded_at = now() where id = $1", [m2]);
  assertEquals((await rpc("dela_milestone_start", { p_person: owner.id, p_milestone: m2 }) as Record<string, unknown>).reason, "split_not_accepted", "work cannot start until Ben accepts");
  assertEquals((await call("POST", "/agency/assignment/answer", pia.token, { id: asg2, accept: true, agree: true })).body.reason, "not_found");
  assertEquals((await call("POST", "/agency/assignment/answer", ben.token, { id: asg2, accept: false })).body.status, "declined");
  assertEquals((await call("GET", "/engagements/assignments?agreement=" + ag, owner.token)).body.milestones.find((m: { id: string }) => m.id === m2).assignment, null, "back to unassigned");
  asg2 = (await call("POST", "/engagements/assign", owner.token, { milestone_id: m2, bench_id: benchBen, agency_percent: 40 })).body.id;
  assertEquals((await call("POST", "/agency/assignment/answer", ben.token, { id: asg2, accept: true, agree: false })).body.reason, "tick_to_accept");
  assertEquals((await call("POST", "/agency/assignment/answer", ben.token, { id: asg2, accept: true, typed_name: "Ben Bench", agree: true })).body.status, "accepted");
  assertEquals((await rpc("dela_milestone_start", { p_person: owner.id, p_milestone: m2 }) as Record<string, unknown>).ok, true);
});

async function accept(m: string) {
  const sub = (await one("insert into milestone_submissions (milestone_id, n, statement, status, request_id, submitted_by) values ($1, 1, 'Done and checked.', 'with_attorney', $2, $3) returning id", [m, "s" + m, owner.id])).id;
  await pool.query("update milestones set status = 'submitted' where id = $1", [m]);
  return await rpc("dela_milestone_decide", { p_person: att.id, p_submission: sub, p_accept: true, p_note: "" }) as Record<string, unknown>;
}

Deno.test("paying out: the agency gets its share minus the whole fee, the bench member their full share", async () => {
  await pool.query("insert into payout_accounts (person_id, account_ref, status) values ($1, 'acct_owner', 'ready')", [owner.id]);
  const r = await accept(m1);
  assert(r.ok, JSON.stringify(r));
  const rows = (await pool.query("select person_id, amount_cents, fee_cents, status, share_kind, share_bps from payouts where milestone_id = $1 order by share_kind", [m1])).rows;
  // $1,000 at 30/70: the agency $300 minus the $50 fee = $250; Pia $700, no fee
  assertEquals(rows.map((x: Record<string, unknown>) => [x.person_id, x.amount_cents, x.fee_cents, x.status, x.share_kind, x.share_bps]),
    [[owner.id, 25000, 5000, "pending", "agency_share", 3000], [pia.id, 70000, 0, "held", "bench_share", 7000]]);
  const own = await one("select body from notifications where person_id = $1 and title like 'Milestone 1 accepted%' order by created_at desc limit 1", [owner.id]);
  assert(own.body.includes("$250"), "the agency's notice names its own payout: " + own.body);
  const pn = await one("select title, body from notifications where person_id = $1 order by created_at desc limit 1", [pia.id]);
  assert(pn.title === "Your share of milestone 1 is waiting for your payout setup" && pn.body.includes("$700"), JSON.stringify(pn));
  // Only the agency's share is due; Pia's waits for her payout setup, and the agency sees that, never the amount
  const due = await rpc("dela_payouts_due", {}) as Array<{ amount_cents: number }>;
  assert(due.some((d) => d.amount_cents === 25000) && !due.some((d) => d.amount_cents === 70000));
  const v = (await call("GET", "/engagements/assignments?agreement=" + ag, owner.token)).body;
  const a1 = v.milestones.find((m: { id: string }) => m.id === m1).assignment;
  assertEquals(a1.waiting_payout, true);
  assert(!JSON.stringify(v).includes("70000"), "the agency never sees the held amount");
  // Reminders at 1, 7 and 30 days
  await pool.query("update payouts set created_at = now() - interval '7 days 1 hour' where milestone_id = $1 and share_kind = 'bench_share'", [m1]);
  assertEquals(((await rpc("dela_split_daily", {})) as Record<string, number>).reminders >= 1, true);
  assertEquals((await one("select count(*)::int n from notifications where person_id = $1 and channel = 'in_app' and title = 'Your share is waiting for your payout setup'", [pia.id])).n, 1);
  await rpc("dela_split_daily", {});
  assertEquals((await one("select count(*)::int n from notifications where person_id = $1 and channel = 'in_app' and title = 'Your share is waiting for your payout setup'", [pia.id])).n, 1, "one reminder per step");
  // Pia's payout can no longer be taken back off the job: the assignment stays
  assertEquals((await call("POST", "/agency/assignment/remove", owner.token, { id: asg1 })).body.reason, "milestone_started");
});

Deno.test("a lost chargeback comes back from both shares by the split: held money first, then transfer reversals", async () => {
  // The agency's share was sent; Pia's is still held
  const ao = await one("select id from payouts where milestone_id = $1 and share_kind = 'agency_share'", [m1]);
  await rpc("dela_payout_result", { p_payout: ao.id, p_status: "sent", p_ref: `tr_ag${RUN}`, p_reason: "" });
  const pay = (await one("insert into payments (agreement_id, milestone_id, kind, amount_cents, status, provider_ref, idem_key) values ($1, $2, 'milestone', 100000, 'succeeded', $4, $3) returning id", [ag, m1, "pay" + m1, `pi_sp${RUN}`])).id;
  assert(pay);
  await rpc("dela_chargeback_event", { p_ref: `dp_sp${RUN}`, p_payment_ref: `pi_sp${RUN}`, p_status: "open", p_amount: 100000, p_reason: "fraudulent" });
  await rpc("dela_chargeback_event", { p_ref: `dp_sp${RUN}`, p_payment_ref: `pi_sp${RUN}`, p_status: "lost", p_amount: 100000, p_reason: "fraudulent" });
  const revs = (await pool.query("select person_id, amount_cents, from_held, status from payout_reversals where milestone_id = $1 order by from_held", [m1])).rows;
  // $1,000 at 30/70: $300 from the agency (only $250 was paid, so $250 reversed), $700 from Pia's held share
  assertEquals(revs.map((x: Record<string, unknown>) => [x.person_id, x.amount_cents, x.from_held, x.status]), [[owner.id, 25000, false, "pending"], [pia.id, 70000, true, "succeeded"]]);
  const short = await one("select amount_cents from ledger_entries where milestone_id = $1 and kind = 'shortfall'", [m1]);
  assertEquals(short.amount_cents, 5000, "the $50 fee part Lawfecta kept is recorded, not taken from Pia");
  const due = await rpc("dela_reversals_due", {}) as Array<{ transfer_ref: string; amount_cents: number; id: string }>;
  const mine = due.find((d) => d.transfer_ref === `tr_ag${RUN}`);
  assertEquals(mine?.amount_cents, 25000);
  await rpc("dela_reversal_result", { p_reversal: mine!.id, p_status: "succeeded", p_ref: "trr_1" });
  assertEquals((await one("select count(*)::int n from ledger_entries where milestone_id = $1 and kind = 'transfer_reversal'", [m1])).n, 2, "each reversal recorded on its own");
  // Pia's held share is now nothing, so nothing is paid out to her once she sets up payouts
  await pool.query("insert into payout_accounts (person_id, account_ref, status) values ($1, 'acct_pia', 'ready')", [pia.id]);
  await pool.query("update payouts set status = 'pending', held_reason = '' where milestone_id = $1 and person_id = $2", [m1, pia.id]);
  const due2 = await rpc("dela_payouts_due", {}) as Array<{ account_ref: string }>;
  assert(!due2.some((d) => d.account_ref === "acct_pia"), "nothing left to pay Pia from that milestone");
  // Idempotent: the same event again takes nothing more
  await rpc("dela_chargeback_event", { p_ref: `dp_sp${RUN}`, p_payment_ref: `pi_sp${RUN}`, p_status: "lost", p_amount: 100000, p_reason: "fraudulent" });
  assertEquals((await one("select count(*)::int n from payout_reversals where milestone_id = $1", [m1])).n, 2);
});

Deno.test("the team sees every assignment and split; switches and No subcontractors block new ones", async () => {
  // The chargeback paused the engagement; the team lifts the pause for the rest of this test
  await pool.query("update agreements set status = 'active' where id = $1", [ag]);
  const adm = (await call("GET", "/admin/agencies/assignments", team.token)).body;
  const d = adm.data ?? adm;
  assert(d.assignments.some((x: { name: string; agency_bps: number }) => x.name === "Ben Bench" && x.agency_bps === 4000));
  await pool.query("update agreements set no_subcontractors = true where id = $1", [ag]);
  assertEquals((await call("POST", "/engagements/assign", owner.token, { milestone_id: m3, bench_id: benchPia, agency_percent: 30 })).body.reason, "no_subcontractors");
  await pool.query("update agreements set no_subcontractors = false where id = $1", [ag]);
  // A bench member on Free gets no new assignments
  await pool.query("select dela_ensure_side($1, 'freelancer', 'fl_free', 'staff_grant')", [pia.id]);
  assertEquals((await call("POST", "/engagements/assign", owner.token, { milestone_id: m3, bench_id: benchPia, agency_percent: 30 })).body.reason, "bench_member_inactive");
  await pool.query("select dela_ensure_side($1, 'freelancer', 'fl_plus', 'staff_grant')", [pia.id]);
  // Removing an assignment before work is accepted takes them off the job
  const r = (await call("POST", "/engagements/assign", owner.token, { milestone_id: m3, bench_id: benchPia, agency_percent: 30 })).body;
  assertEquals((await call("POST", "/agency/assignment/remove", owner.token, { id: r.id })).body.status, "removed");
  assertEquals((await call("POST", "/agency/assignment/remove", owner.token, { id: r.id })).body.duplicate, true);
});

Deno.test("teardown", async () => { await pool.end(); });

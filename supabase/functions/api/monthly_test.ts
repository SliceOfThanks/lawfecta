// Step 7c part 1: monthly recurring engagements through the real api and database, with a Stripe stand-in that remembers
// idempotency keys. Tasks with quantities and never "unlimited"; Weekly units add up to the price; the client's permission
// to charge each month; month 1 sets the billing day; the 3-day reminder drafts the next month; the renewal charges the
// saved card and opens the month only when paid; a declined card pauses work, retries on day 2 and day 5, and ends after
// 14 days; changes start next month only if approved in time; cancel at the end of the paid month, with no charge after
// it even when the cancel lands during the renewal (T13); undoing needs the other side; ending early refunds unstarted
// units; Make this monthly; the emergency stop; dates on business days.
//   deno test -A supabase/functions/api/monthly_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { stripeSignatureHeader } from "./lib/payments/stripe.ts";
import { feeLines, monthlyUnits, readTasks } from "./lib/engagements/agreement.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const STRIPE_TEST = "sk_test_" + "m".repeat(24); // rules-ok: a made-up test key
const WHSEC = "whsec_test_monthly"; // rules-ok: a made-up test secret
const env: Record<string, string> = { DELA_ORIGINS: "https://lawfecta.com", STRIPE_SECRET_KEY: STRIPE_TEST, STRIPE_WEBHOOK_SECRET: WHSEC };
const stripeCalls: Array<{ method: string; path: string; body: string; idem: string }> = [];
const stripeSeen = new Map<string, unknown>();
let decline = false;
let n = 0;
function stripeAnswer(method: string, path: string, body: URLSearchParams): [number, unknown] {
  if (method === "POST" && path === "/payment_intents") {
    if (decline) return [402, { error: { message: "Your card was declined.", code: "card_declined" } }];
    return [200, { id: "pi_m" + (++n), status: "succeeded", amount: Number(body.get("amount")), customer: body.get("customer"), payment_method: body.get("payment_method") }];
  }
  if (method === "POST" && path === "/checkout/sessions") return [200, { id: "cs_m" + (++n), url: "https://checkout.stripe.test/m/" + n }];
  if (method === "POST" && path === "/refunds") return [200, { id: "re_m" + (++n), amount: Number(body.get("amount")) }];
  if (method === "POST" && path === "/transfers") return [200, { id: "tr_m" + (++n) }];
  return [404, { error: { message: "no such route" } }];
}
const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("https://api.stripe.com/v1")) {
    const u = new URL(url);
    const path = u.pathname.slice(3), method = String(init.method ?? "GET");
    const idem = new Headers(init.headers).get("idempotency-key") ?? "";
    stripeCalls.push({ method, path, body: String(init.body ?? ""), idem });
    if (idem && stripeSeen.has(idem)) return Response.json(stripeSeen.get(idem));
    const [status, out] = stripeAnswer(method, path, new URLSearchParams(String(init.body ?? "")));
    if (idem && status === 200) stripeSeen.set(idem, out);
    return Response.json(out, { status });
  }
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: () => Promise.resolve(1), read: () => Promise.reject(new Error("missing")), remove: () => Promise.resolve(), put: () => Promise.resolve(),
};
const deps: Deps = { rpc, env: (k) => env[k] ?? "", fetch: fakeFetch, storage };
async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
async function hook(ev: Record<string, unknown>) {
  const payload = JSON.stringify(ev);
  const res = await handle(new Request("http://localhost/functions/v1/api/stripe/webhook", { method: "POST", headers: { "content-type": "application/json", "stripe-signature": await stripeSignatureHeader(payload, WHSEC) }, body: payload }), deps);
  return { status: res.status, body: await res.json() };
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(k: number, plan: string, name: string): Promise<M> {
  const bd = 9_100_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, name, `mo${bd}@test.invalid`])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
const TASKS = [{ task: "Intake calls and conflict checks", frequency: "weekly", quantity: 20, turnaround: "1 business day", exclusions: "Court filings" }];
let att: M, fl: M, team: M;
let org = "", pb = "", gigA = "", agA = "", agB = "";
const view = async (who: M, id: string) => (await call("GET", "/agreements/get?id=" + id, who.token)).body;
const today = async (id: string) => (await one("select dela_monthly_today($1) d", [id])).d as Date;
const iso = (d: Date) => new Date(d).toISOString().slice(0, 10);

async function monthlyAgreement(tag: string, price: number): Promise<string> {
  const gig = (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id, kind)
    values ($1, $2, $3, 1, $4, '{"task":"Intake support every month","outcome":"Every new client called"}', 30000, 200000, 'filled', now(), now() + interval '14 days', $5, 'monthly') returning id`, [org, att.id, pb, "Monthly intake " + tag, "mo" + tag + RUN])).id;
  const prop = (await one(`insert into proposals (gig_id, freelancer_id, status, price_cents, included, schedule, days_to_deliver, sent_at) values ($1, $2, 'selected', $3, 'Intake calls; conflict checks', 'Monthly', 30, now()) returning id`, [gig, fl.id, price])).id;
  if (tag === "a") gigA = gig;
  return (await one("insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents) values ($1, $2, $3, $4, $5, $6) returning id", [gig, prop, org, att.id, fl.id, price])).id;
}
async function signAndPay(id: string) {
  await call("GET", "/agreements/get?id=" + id, att.token);
  const t = (await call("POST", "/monthly/terms", att.token, { id, tasks: TASKS, unit_mode: "weekly" })).body;
  assert(t.ok, JSON.stringify(t));
  assert((await call("POST", "/agreements/sign", fl.token, { id, version: t.version, typed_name: "Fran Lance", consent: true })).body.ok);
  assert((await call("POST", "/agreements/sign", att.token, { id, version: t.version, typed_name: "Ann Attorney", consent: true, recurring_consent: true })).body.both_signed);
  const p = (await call("POST", "/engagements/pay", att.token, { id })).body;
  const pay = await one("select id from payments where agreement_id = $1 and kind = 'period' order by created_at desc limit 1", [id]);
  assertEquals(p.status, "requires_payment", JSON.stringify(p));
  assert((await hook({ id: "evt_" + crypto.randomUUID(), type: "payment_intent.succeeded", livemode: false, data: { object: { id: "pi_first_" + id.slice(0, 6), customer: "cus_m", payment_method: "pm_m", metadata: { payment_id: pay.id } } } })).body.ok);
}

Deno.test("the rules in code: tasks with quantities, never unlimited; weekly units add up; business days and the billing day", async () => {
  assertEquals(readTasks([]).reason, "monthly_tasks_needed");
  assertEquals(readTasks([{ task: "Calls", frequency: "weekly", quantity: 0 }]).reason, "monthly_task_needs_quantity");
  assertEquals(readTasks([{ task: "Unlimited calls", frequency: "weekly", quantity: 5 }]).reason, "no_unlimited");
  assertEquals(readTasks([{ task: "Calls", frequency: "hourly", quantity: 5 }]).reason, "monthly_task_needs_frequency");
  assertEquals(readTasks(TASKS).reason, undefined);
  assertEquals(monthlyUnits(100050, "weekly", 4).map((u) => u.amount_cents), [25000, 25000, 25000, 25050]);
  assertEquals(monthlyUnits(100000, "monthly", 4).map((u) => u.title), ["Month 1 delivery"]);
  const d = async (q: string) => iso((await one(q)).d);
  assertEquals(await d("select dela_bill_date('2026-01-31', 1, 31) d"), "2026-02-28", "a 31st bills on the last day of a shorter month");
  assertEquals(await d("select dela_bill_date('2026-01-31', 2, 31) d"), "2026-03-31");
  assertEquals(await d("select dela_business_day('2026-07-04') d"), "2026-07-06", "a Saturday holiday (observed Friday) moves to Monday");
  assertEquals(await d("select dela_business_day('2026-07-03') d"), "2026-07-06", "the observed holiday itself is not a business day");
  assertEquals(await d("select dela_business_day('2026-11-26') d"), "2026-11-27", "Thanksgiving");
  assertEquals(await d("select dela_business_day('2026-12-25') d"), "2026-12-28");
  assertEquals(feeLines({ kind: "monthly", fees: { total_cents: 100000, attorney_fee_cents: 5000, freelancer_fee_cents: 5000, freelancer_receives_cents: 95000 } })[0], "Monthly price: $1,000");
});

Deno.test("setup: a verified attorney, a freelancer, the Lawfecta owner", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'engagements', 'milestone_funding', 'profiles', 'recurring_engagements')");
  await pool.query("update feature_switches set state = 'off' where key in ('live_payments', 'ai_generation')");
  await pool.query("update settings set value = 'false' where key in ('verify.freelancer_linkedin', 'recurring.renewals_stopped')");
  att = await member(1, "att_pro", "Ann Attorney"); fl = await member(2, "fl_plus", "Fran Lance"); team = await member(3, "att_free", "Owen Owner");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'owner')", [team.id]);
  await pool.query("insert into member_profiles (person_id, side, body, missing, score) values ($1, 'attorney', '{\"firm_name\":\"Monthly Legal\"}', '{}', 100)", [att.id]);
  await pool.query(`insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) values ($1, 'l', 'TX', $2, $2, 'A', 'video', 'verified')`, [att.id, "M" + att.bd]);
  await pool.query("select dela_profile_refresh($1, 'attorney')", [att.id]);
  await pool.query("insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) values ($1, 'freelancer', '{\"first_name\":\"Fran\",\"last_name\":\"Lance\"}', '{}', 100, now())", [fl.id]);
  org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  await pool.query("insert into firm_profiles (org_id, body) values ($1, $2) on conflict (org_id) do update set body = excluded.body", [org, { signatory_name: "Ann Attorney", billing_address: "1 Main St, Austin TX", service_email: "notices@example.com" }]);
  pb = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ($1, 'Intake', 'approved', 1, 1, 100, $2, $3) returning id`, [org, "mo-pb" + RUN, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb, { title: "Intake", steps: [{ text: "Call the new client" }] }, att.id]);
  const d = (await call("POST", "/gigs/draft", att.token, { playbook_id: pb, request_id: "md" + RUN, budget_min: 800, budget_max: 1200, kind: "monthly", use_ai: false })).body;
  assertEquals((await one("select kind from gigs where id = $1", [d.id])).kind, "monthly", "a gig can be posted as Monthly");
  agA = await monthlyAgreement("a", 100000);
  agB = await monthlyAgreement("b", 60000);
});

Deno.test("signing: the terms list tasks with quantities; the client gives permission to charge each month", async () => {
  const v = await view(att, agA);
  assertEquals([v.current.body.kind, v.current.body.milestones.length, v.fee_lines[0]], ["monthly", 4, "Monthly price: $1,000"]);
  assertEquals(v.money_summary, v.role === "attorney" ? ["You pay $1,050 each month, including the $50 platform fee."] : ["You receive $950 each month, after your $50 platform fee."]);
  assert(v.current.body.terms.includes("12. Monthly engagement.") && v.current.body.terms.includes("charge the saved payment method each month"));
  assertEquals((await call("POST", "/agreements/sign", fl.token, { id: agA, version: 1, typed_name: "Fran Lance", consent: true })).body.reason, "monthly_tasks_needed", "no included quantity, no signature");
  assertEquals((await call("POST", "/monthly/terms", att.token, { id: agA, tasks: [{ task: "Unlimited intake calls", frequency: "weekly", quantity: 20 }] })).body.reason, "no_unlimited");
  assertEquals((await call("POST", "/agreements/propose", att.token, { id: agA, milestones: [] })).body.reason, "use_monthly_terms");
  const t = (await call("POST", "/monthly/terms", fl.token, { id: agA, tasks: TASKS, unit_mode: "weekly" })).body;
  assertEquals([t.ok, t.version], [true, 2], JSON.stringify(t));
  assert((await view(att, agA)).current.body.terms.includes("Intake calls and conflict checks: weekly, up to 20 included each month, each within 1 business day"));
  assert((await call("POST", "/agreements/sign", fl.token, { id: agA, version: 2, typed_name: "Fran Lance", consent: true })).body.ok);
  assertEquals((await call("POST", "/agreements/sign", att.token, { id: agA, version: 2, typed_name: "Ann Attorney", consent: true })).body.reason, "recurring_consent_needed");
  const s = (await call("POST", "/agreements/sign", att.token, { id: agA, version: 2, typed_name: "Ann Attorney", consent: true, recurring_consent: true })).body;
  assertEquals(s.both_signed, true);
  const p1 = await one("select n, status, price_cents, fee_cents from monthly_periods where agreement_id = $1", [agA]);
  assertEquals([p1.n, p1.status, p1.price_cents, p1.fee_cents], [1, "due", 100000, 5000]);
  assertEquals((await one("select count(*)::int c from milestones where agreement_id = $1 and period_id is not null", [agA])).c, 4);
});

Deno.test("month 1: paid once for the whole month, the billing day set, the units funded and due on business days", async () => {
  assertEquals((await call("POST", "/engagements/pay", fl.token, { id: agA })).status, 403);
  const p = (await call("POST", "/engagements/pay", att.token, { id: agA })).body;
  assertEquals(p.status, "requires_payment", JSON.stringify(p));
  const sess = stripeCalls.find((c) => c.path === "/checkout/sessions")!;
  assert(sess.body.includes("unit_amount%5D=105000") && sess.body.includes("month%201"), "the month and the fee together: " + sess.body);
  const pay = await one("select id from payments where agreement_id = $1 and kind = 'period'", [agA]);
  assert((await hook({ id: "evt_m1", type: "payment_intent.succeeded", livemode: false, data: { object: { id: "pi_m_first", customer: "cus_m", payment_method: "pm_m", metadata: { payment_id: pay.id } } } })).body.ok);
  const t = await today(agA);
  const pr = await one("select status, starts_on, bill_on from monthly_periods where agreement_id = $1 and n = 1", [agA]);
  assertEquals([pr.status, iso(pr.starts_on)], ["paid", iso(t)]);
  assertEquals((await one("select billing_day from monthly_terms where agreement_id = $1", [agA])).billing_day, new Date(t).getUTCDate());
  const units = (await pool.query("select status, due_date from milestones where agreement_id = $1 order by seq", [agA])).rows;
  assert(units.every((u: { status: string }) => u.status === "funded"), JSON.stringify(units));
  for (const u of units) assertEquals(iso((await one("select dela_business_day($1::date) d", [iso(u.due_date)])).d), iso(u.due_date), "due dates are business days");
  const led = await one("select sum(amount_cents) filter (where kind = 'charge') c, sum(amount_cents) filter (where kind = 'attorney_fee') f from ledger_entries where agreement_id = $1", [agA]);
  assertEquals([Number(led.c), Number(led.f)], [100000, 5000]);
  const mv = (await view(fl, agA)).monthly;
  assertEquals([mv.terms.status, mv.current.n, mv.current.units], ["active", 1, 4]);
});

// Fix (step 8b, retest R01): the signed dates stay when they fall inside the paid month, and no unit is due after the
// month ends (Dec 5 2026 is a Saturday: the last unit is due Friday Dec 4, not Monday Dec 7)
Deno.test("monthly dates: the signed dates govern, and every unit falls inside the paid month", async () => {
  assertEquals(iso((await one("select dela_business_day_within('2026-12-05'::date, '2026-12-05'::date) d")).d), "2026-12-04");
  assertEquals(iso((await one("select dela_business_day_within('2026-11-14'::date, '2026-12-05'::date) d")).d), "2026-11-16", "inside the month it still moves forward");
  const pr = await one("select starts_on, ends_on, paused_days from monthly_periods where agreement_id = $1 and n = 1", [agA]);
  const rows = (await pool.query(`select m.seq, m.due_date, m.planned_due_date, m.due_note,
      (select nullif(e->>'due_date', '')::date from agreement_versions v, jsonb_array_elements(v.body->'milestones') e where v.agreement_id = m.agreement_id and v.version = m.from_version and (e->>'seq')::int = m.seq) signed
    from milestones m where m.agreement_id = $1 order by m.seq`, [agA])).rows;
  for (const r of rows) {
    assert(iso(r.due_date) <= iso(pr.ends_on), "unit " + r.seq + " is due inside the month: " + JSON.stringify(r));
    const inside = r.signed && iso(r.signed) >= iso(pr.starts_on) && iso(r.signed) <= iso(pr.ends_on);
    if (inside && iso((await one("select dela_business_day($1::date) d", [iso(r.signed)])).d) === iso(r.signed)) assertEquals(iso(r.due_date), iso(r.signed), "the signed date stays");
    if (r.signed && iso(r.due_date) !== iso(r.signed)) assert(r.due_note.length > 0, "a moved date says why");
  }
  const v = (await view(att, agA)).milestones;
  assert(v.every((m: Record<string, unknown>) => "due_note" in m), "the screen gets the signed date and the reason");
});

Deno.test("a change for next month: either side proposes, the other approves; it applies only if approved in time", async () => {
  const c = (await call("POST", "/monthly/change", fl.token, { id: agA, tasks: TASKS, price: 1200, note: "More calls lately" })).body;
  assert(c.ok, JSON.stringify(c));
  // AI review 0.10.0 (payments 4, 5): the total each month with the platform fee, now and proposed, and the deadline
  const g = (await call("GET", "/agreements/get?id=" + agA, att.token)).body.monthly;
  const fee = async (p: number) => (await pool.query("select dela_monthly_fee_for($1, $2) f", [agA, p])).rows[0].f;
  assertEquals(g.totals, { now: g.terms.price_cents + await fee(g.terms.price_cents), proposed: 120000 + await fee(120000) });
  assert(g.totals.proposed > 120000, "the proposed total includes the fee");
  assertEquals(g.change_deadline_days, 1);
  assertEquals((await call("POST", "/monthly/change/decide", fl.token, { id: c.id, approve: true })).body.reason, "other_side_approves");
  assertEquals((await call("POST", "/monthly/change/decide", att.token, { id: c.id, approve: true })).body.status, "approved");
  // As if approved on the billing day itself: too late for month 2 (the deadline is 1 day before), so it starts in month 3
  await pool.query("update monthly_changes set decided_at = now() + interval '2 days' where id = $1", [c.id]);
});

Deno.test("the renewal: the reminder drafts month 2; the billing day charges the saved card once; no double charge", async () => {
  const t = await today(agA);
  // Month 1 started a month ago, less 2 days: the reminder (3 days before) is due, the billing day is not
  await pool.query("update monthly_periods set starts_on = ($2::date - interval '1 month' + interval '2 days')::date where agreement_id = $1 and n = 1", [agA, iso(t)]);
  await pool.query("update monthly_terms set billing_day = extract(day from (select starts_on from monthly_periods where agreement_id = $1 and n = 1))::int where agreement_id = $1", [agA]);
  const due = (await rpc("dela_monthly_tick", { p_only: agA })) as unknown[];
  assertEquals(due.length, 0, "no charge before the billing day");
  const p2 = await one("select status, price_cents, bill_on from monthly_periods where agreement_id = $1 and n = 2", [agA]);
  assertEquals([p2.status, p2.price_cents], ["draft", 100000], "the change approved too late waits a month");
  assertEquals((await one("select count(*)::int c from milestones m join monthly_periods p on p.id = m.period_id where p.agreement_id = $1 and p.n = 2 and m.status = 'pending'", [agA])).c, 4, "next month's tasks are drafted, not open");
  const rem = await one("select title from notifications where person_id = $1 and dedupe_key like 'eng:period_reminder:%' order by created_at desc limit 1", [fl.id]);
  assert(rem.title.startsWith("Your monthly engagement renews on"), rem.title);
  const before = stripeCalls.filter((c) => c.path === "/payment_intents").length;
  // The change was approved well before month 3's billing day
  await pool.query("update monthly_changes set decided_at = now() - interval '2 days' where agreement_id = $1 and status = 'approved'", [agA]);
  // Owner's "Run the renewal now" (test site only)
  const r = (await call("POST", "/admin/monthly/run-now", team.token, { agreement_id: agA })).body;
  assertEquals(r.data?.run?.succeeded ?? r.run?.succeeded, 1, JSON.stringify(r));
  const pi = stripeCalls.filter((c) => c.path === "/payment_intents").slice(before);
  assertEquals(pi.length, 1);
  assert(pi[0].body.includes("off_session=true") && pi[0].body.includes("customer=cus_m") && pi[0].idem.startsWith("period:"), pi[0].body);
  assertEquals((await one("select status from monthly_periods where agreement_id = $1 and n = 2", [agA])).status, "paid");
  assertEquals((await one("select count(*)::int c from milestones m join monthly_periods p on p.id = m.period_id where p.agreement_id = $1 and p.n = 2 and m.status = 'funded'", [agA])).c, 4, "month 2 opens once paid");
  await call("POST", "/admin/monthly/run-now", team.token, { agreement_id: agA });
  await rpc("dela_monthly_tick", { p_only: agA });
  const charges = (await one("select count(*)::int c from payments where agreement_id = $1 and kind = 'period' and status = 'succeeded'", [agA])).c;
  assertEquals(charges, 3, "month 3 drafted and charged by the second run-now; never two charges for one month");
  assertEquals((await one("select count(*)::int c from (select period_id from payments where agreement_id = $1 and status = 'succeeded' group by period_id having count(*) > 1) x", [agA])).c, 0);
  assertEquals((await one("select price_cents from monthly_periods where agreement_id = $1 and n = 3", [agA])).price_cents, 120000, "the approved change applies the month after");
});

Deno.test("a declined renewal: work pauses, retries on day 2 and day 5, the attorney pays now and work opens", async () => {
  decline = true;
  await call("POST", "/admin/monthly/run-now", team.token, { agreement_id: agA });
  const p4 = await one("select status, attempts, failed_on, next_retry_on from monthly_periods where agreement_id = $1 and n = 4", [agA]);
  assertEquals([p4.status, p4.attempts, (new Date(p4.next_retry_on).getTime() - new Date(p4.failed_on).getTime()) / 86400000], ["failed", 1, 2]);
  assertEquals((await one("select status from monthly_terms where agreement_id = $1", [agA])).status, "paused");
  const n1 = await one("select title, body from notifications where person_id = $1 and channel = 'in_app' order by created_at desc limit 1", [fl.id]);
  assert(n1.title.startsWith("The monthly payment did not go through") && n1.body.includes("Do not start month 4"), n1.title);
  assertEquals((await one("select count(*)::int c from milestones m join monthly_periods p on p.id = m.period_id where p.agreement_id = $1 and p.n = 4 and m.status = 'funded'", [agA])).c, 0, "a paused month's tasks stay closed");
  await call("POST", "/admin/monthly/run-now", team.token, { agreement_id: agA });
  const again = await one("select attempts, failed_on, next_retry_on from monthly_periods where agreement_id = $1 and n = 4", [agA]);
  assertEquals([again.attempts, (new Date(again.next_retry_on).getTime() - new Date(again.failed_on).getTime()) / 86400000], [2, 5], "the second retry is day 5");
  decline = false;
  const pay = (await call("POST", "/engagements/pay", att.token, { id: agA })).body;
  assertEquals(pay.status, "succeeded", JSON.stringify(pay));
  assertEquals((await one("select status from monthly_periods where agreement_id = $1 and n = 4", [agA])).status, "paid");
  assertEquals((await one("select status from monthly_terms where agreement_id = $1", [agA])).status, "active");
});

Deno.test("cancel: effective at the end of the paid month; no charge after it, even when it lands during the renewal (T13); undo needs the other side", async () => {
  // The renewal is due right now when the cancellation arrives
  await call("POST", "/admin/monthly/run-now", team.token, { agreement_id: agA }).catch(() => null);
  const paidBefore = (await one("select count(*)::int c from payments where agreement_id = $1 and status = 'succeeded'", [agA])).c;
  // The one-off cancel (milestone refunds) does not apply to a monthly engagement
  assertEquals((await call("POST", "/engagements/cancel", att.token, { id: agA, reason: "test" })).body.reason, "use_monthly_cancel");
  assertEquals((await one("select status from agreements where id = $1", [agA])).status, "active");
  const cur = await one("select n, ends_on from monthly_periods where agreement_id = $1 and status = 'paid' order by n desc limit 1", [agA]);
  const c = (await call("POST", "/monthly/cancel", att.token, { id: agA })).body;
  assert(c.ok && c.effective, JSON.stringify(c) + JSON.stringify(cur));
  assertEquals(iso(c.effective), iso(cur.ends_on));
  await pool.query("update monthly_periods set bill_on = dela_monthly_today(agreement_id) where agreement_id = $1 and n = $2", [agA, cur.n + 1]);
  const due = (await rpc("dela_monthly_tick", { p_only: agA })) as unknown[];
  assertEquals(due.length, 0);
  assertEquals((await one("select count(*)::int c from payments where agreement_id = $1 and status = 'succeeded'", [agA])).c, paidBefore, "no charge after a cancellation");
  assertEquals((await call("POST", "/monthly/undo", att.token, { id: agA })).body.requested, true);
  assertEquals((await call("POST", "/monthly/undo", att.token, { id: agA })).body.reason, "other_side_approves");
  assertEquals((await call("POST", "/monthly/undo", fl.token, { id: agA, approve: true })).body.undone, true);
  assertEquals((await one("select cancel_effective from monthly_terms where agreement_id = $1", [agA])).cancel_effective, null);
  // Canceled again, and the paid month ends: the engagement ends and its gig place comes back
  assert((await call("POST", "/monthly/cancel", fl.token, { id: agA })).body.ok);
  await pool.query("update monthly_terms set cancel_effective = dela_monthly_today(agreement_id) - 1 where agreement_id = $1", [agA]);
  await rpc("dela_monthly_tick", { p_only: agA });
  assertEquals((await one("select status, ended_reason from monthly_terms where agreement_id = $1", [agA])), { status: "ended", ended_reason: "canceled" });
});

Deno.test("an unpaid month ends the engagement after 14 days paused", async () => {
  await signAndPay(agB);
  decline = true;
  await call("POST", "/admin/monthly/run-now", team.token, { agreement_id: agB });
  decline = false;
  assertEquals((await one("select status from monthly_terms where agreement_id = $1", [agB])).status, "paused");
  await pool.query("update monthly_periods set failed_on = dela_monthly_today(agreement_id) - 14, next_retry_on = null where agreement_id = $1 and n = 2", [agB]);
  await rpc("dela_monthly_tick", { p_only: agB });
  const t = await one("select status, ended_reason from monthly_terms where agreement_id = $1", [agB]);
  assertEquals([t.status, t.ended_reason], ["ended", "unpaid"]);
  assertEquals((await one("select status from monthly_periods where agreement_id = $1 and n = 2", [agB])).status, "canceled");
});

Deno.test("ending early by agreement: unstarted weekly units are refunded; One monthly delivery goes to the dispute process", async () => {
  const agC = await monthlyAgreement("c", 80000);
  await signAndPay(agC);
  const m1 = await one("select id from milestones where agreement_id = $1 order by seq limit 1", [agC]);
  await pool.query("update milestones set status = 'accepted', accepted_at = now() where id = $1", [m1.id]);
  assertEquals((await call("POST", "/monthly/end-now", att.token, { id: agC })).body.requested, true);
  const e = (await call("POST", "/monthly/end-now", fl.token, { id: agC, approve: true })).body;
  assertEquals([e.ended, e.refunds], [true, 3], JSON.stringify(e));
  const rf = await one("select sum(amount_cents)::int s from refunds where agreement_id = $1", [agC]);
  assertEquals(rf.s, 60000, "the three unstarted weeks");
  await pool.query("update monthly_terms set unit_mode = 'monthly', status = 'active' where agreement_id = $1", [agB]);
  assertEquals((await call("POST", "/monthly/end-now", att.token, { id: agB })).body.reason, "monthly_delivery_use_dispute");
});

Deno.test("Make this monthly: from a completed one-off engagement, the same freelancer; the emergency stop", async () => {
  const gig = (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, request_id) values ($1, $2, $3, 1, 'One-off intake', '{"task":"Intake once"}', 30000, 90000, 'filled', $4) returning id`, [org, att.id, pb, "mo-one" + RUN])).id;
  const prop = (await one(`insert into proposals (gig_id, freelancer_id, status, price_cents, included, sent_at) values ($1, $2, 'selected', 50000, 'Intake calls', now()) returning id`, [gig, fl.id])).id;
  const done = (await one("insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status, completed_at, version) values ($1, $2, $3, $4, $5, 50000, 'completed', now(), 1) returning id", [gig, prop, org, att.id, fl.id])).id;
  await pool.query("insert into agreement_versions (agreement_id, version, body, body_hash, proposed_by) values ($1, 1, $2, 'h', $3)", [done, { scope: { task: "Intake once", included: "Intake calls" } }, att.id]);
  assertEquals((await call("POST", "/engagements/make-monthly", fl.token, { id: done })).status, 403);
  const r = (await call("POST", "/engagements/make-monthly", att.token, { id: done })).body;
  assert(r.ok, JSON.stringify(r));
  const t = await one("select t.tasks, a.kind, a.freelancer_person from monthly_terms t join agreements a on a.id = t.agreement_id where t.agreement_id = $1", [r.agreement_id]);
  assertEquals([t.kind, t.freelancer_person, t.tasks[0].task, t.tasks[0].quantity], ["monthly", fl.id, "Intake once", 1]);
  assertEquals((await call("POST", "/engagements/make-monthly", att.token, { id: done })).body.duplicate, true);
  // The emergency stop: drafting and reminders go on, nothing is charged
  assertEquals((await call("POST", "/admin/monthly/stop", team.token, { on: true })).body.data?.stopped ?? true, true);
  const adm = (await call("GET", "/admin/monthly", team.token)).body;
  const d = adm.data ?? adm;
  assertEquals(d.stopped, true);
  assert(d.engagements.some((x: { agreement_id: string; status: string }) => x.agreement_id === agA && x.status === "ended"));
  await call("POST", "/admin/monthly/stop", team.token, { on: false });
  assertEquals((await call("GET", "/admin/monthly", att.token)).status, 403);
  assertEquals((await call("POST", "/admin/monthly/run-now", att.token, { agreement_id: agB })).status, 403, "only the Lawfecta owner runs a renewal now");
});

Deno.test("teardown", async () => { await pool.end(); });

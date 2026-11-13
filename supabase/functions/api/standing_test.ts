// Step 7c part 2: standing arrangements (limited automatic repeat hiring) through the real api and database, with a Stripe
// stand-in that remembers idempotency keys. Off unless auto_repeat_hiring is on; paid attorney plans only; a spend cap is
// required; the freelancer accepts once; one click hires inside the limits and charges the saved card at once; a hire over the
// cap or past the open-jobs limit makes a draft, never a hire; a new approved document version stops hiring until both approve
// again (answer 20); holds stop hires at the moment they run (T17); the freelancer can decline a hire within 24 hours and the
// firm is refunded in full; new limits need both; ending waits for open jobs; the monthly statement; the admin list.
//   deno test -A supabase/functions/api/standing_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { stripeSignatureHeader } from "./lib/payments/stripe.ts";
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
  const bd = 9_500_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, name, `st${bd}@test.invalid`])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
let att: M, fl: M, freeAtt: M, team: M;
let org = "", pb = "", pb2 = "", sa = "";
const hire = async (doc: string, key: string, who: M = att) => (await call("POST", "/standing/hire", who.token, { id: sa, playbook_id: doc, request_id: key + RUN })).body;
const list = async (who: M) => (await call("GET", "/standing", who.token)).body;

Deno.test("setup: a verified attorney on Pro with a saved card, a verified freelancer, an approved SOP", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'engagements', 'milestone_funding', 'profiles')");
  await pool.query("update feature_switches set state = 'off' where key in ('live_payments', 'ai_generation', 'auto_repeat_hiring')");
  await pool.query("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
  att = await member(1, "att_pro", "Sam Standing"); fl = await member(2, "fl_plus", "Rita Repeat"); freeAtt = await member(3, "att_free", "Fay Free"); team = await member(4, "att_free", "Olly Owner");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'owner')", [team.id]);
  await pool.query("insert into member_profiles (person_id, side, body, missing, score) values ($1, 'attorney', '{\"firm_name\":\"Repeat Legal\"}', '{}', 100)", [att.id]);
  await pool.query(`insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) values ($1, 'l', 'TX', $2, $2, 'A', 'video', 'verified')`, [att.id, "S" + att.bd]);
  await pool.query("select dela_profile_refresh($1, 'attorney')", [att.id]);
  await pool.query("insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) values ($1, 'freelancer', '{\"first_name\":\"Rita\",\"last_name\":\"Repeat\"}', '{}', 100, now())", [fl.id]);
  await pool.query("update side_profiles set verification_state = 'verified', readiness_state = 'match_ready' where person_id = $1 and side = 'freelancer'", [fl.id]);
  org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  await pool.query("insert into firm_profiles (org_id, body) values ($1, $2) on conflict (org_id) do update set body = excluded.body", [org, { signatory_name: "Sam Standing", billing_address: "1 Main St, Austin TX", service_email: "notices@example.com" }]);
  for (const [t, k] of [["Send the welcome packet", "a"], ["Run a conflict check", "b"]]) {
    const id = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by, doc_type) values ($1, $2, 'approved', 1, 1, 100, $3, $4, 'sop') returning id`, [org, t, "st-pb" + k + RUN, att.id])).id;
    await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [id, { title: t, steps: [{ text: "Do the work" }] }, att.id]);
    if (k === "a") pb = id; else pb2 = id;
  }
  // A paid engagement before: the firm's saved card
  const g = (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, request_id) values ($1, $2, $3, 1, 'Earlier job', '{}', 30000, 30000, 'filled', $4) returning id`, [org, att.id, pb, "st-old" + RUN])).id;
  const pr = (await one("insert into proposals (gig_id, freelancer_id, status, price_cents, included, sent_at) values ($1, $2, 'selected', 30000, 'x', now()) returning id", [g, fl.id])).id;
  await pool.query("insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status, provider_customer, provider_payment_method) values ($1, $2, $3, $4, $5, 30000, 'completed', 'cus_saved', 'pm_saved')", [g, pr, org, att.id, fl.id]);
});

Deno.test("setting up: off by default; paid plans only; a spend cap is required; the limits are checked", async () => {
  const base = { freelancer_person: fl.id, docs: [pb, pb2], price: "300", cap: "700", max_open: 2, typed_name: "Sam Standing", consent: true };
  assertEquals((await call("POST", "/standing/create", att.token, { ...base, request_id: "s0" + RUN })).body.reason, "standing_off");
  await pool.query("update feature_switches set state = 'everyone' where key = 'auto_repeat_hiring'");
  assertEquals((await call("POST", "/standing/create", freeAtt.token, { ...base, request_id: "s1" + RUN })).body.reason, "standing_paid_plans_only", "not on Attorney Free (answer 25)");
  assertEquals((await call("POST", "/standing/create", att.token, { ...base, cap: "", request_id: "s2" + RUN })).body.reason, "cap_required", "DELA won't save one without a spend cap");
  assertEquals((await call("POST", "/standing/create", att.token, { ...base, price: "800", request_id: "s3" + RUN })).body.reason, "price_over_cap");
  assertEquals((await call("POST", "/standing/create", att.token, { ...base, price: "50", request_id: "s4" + RUN })).body.reason, "price_too_low");
  assertEquals((await call("POST", "/standing/create", att.token, { ...base, end_on: "2099-01-01", request_id: "s5" + RUN })).body.reason, "bad_end_date", "12 months at most");
  assertEquals((await call("POST", "/standing/create", att.token, { ...base, typed_name: "", request_id: "s6" + RUN })).body.reason, "sign_needs_name_and_consent");
  // Step 18: only after a completed engagement between the two. The earlier one stops counting while it is disputed.
  await pool.query("update agreements set status = 'disputed' where attorney_person = $1 and freelancer_person = $2", [att.id, fl.id]);
  assertEquals((await call("POST", "/standing/create", att.token, { ...base, request_id: "s6b" + RUN })).body.reason, "needs_completed_gig", "no completed engagement, no standing arrangement");
  assertEquals(((await list(att)).eligible as unknown[]).length, 0, "and the freelancer is not offered on the screen");
  await pool.query("update agreements set status = 'completed' where attorney_person = $1 and freelancer_person = $2", [att.id, fl.id]);
  assertEquals(((await list(att)).eligible as Array<Record<string, unknown>>)[0].person_id, fl.id);
  const r = (await call("POST", "/standing/create", att.token, { ...base, request_id: "s7" + RUN })).body;
  assert(r.ok, JSON.stringify(r));
  sa = r.id;
  assertEquals((await call("POST", "/standing/create", att.token, { ...base, request_id: "s7" + RUN })).body.duplicate, true, "two clicks make one");
  const mine = (await list(att)).arrangements.find((x: any) => x.id === sa);
  assertEquals([mine.status, mine.max_open, mine.saved_payment, mine.docs.length], ["proposed", 2, true, 2]);
  assertEquals((await one("select (end_on - (now() at time zone dela_tz())::date) between 180 and 186 ok from standing_arrangements where id = $1", [sa])).ok, true, "6 months by default");
});

Deno.test("the freelancer accepts once; then one click hires inside the limits and charges the saved card", async () => {
  assertEquals((await hire(pb, "h0")).reason, "standing_not_active", "nothing before the freelancer accepts");
  assertEquals((await call("POST", "/standing/accept", fl.token, { id: sa, accept: true, typed_name: "" })).body.reason, "sign_needs_name_and_consent");
  assert((await call("POST", "/standing/accept", fl.token, { id: sa, accept: true, typed_name: "Rita Repeat", consent: true })).body.ok);
  const h = await hire(pb, "h1");
  assertEquals([h.ok, h.status, h.cap_left_cents], [true, "active", 40000], JSON.stringify(h));
  const ag = await one("select status, total_cents, attorney_fee_cents from agreements where id = $1", [h.agreement_id]);
  assertEquals([ag.status, ag.total_cents], ["active", 30000], "signed under the arrangement and paid");
  assertEquals((await one("select count(*)::int c from agreement_signatures where agreement_id = $1", [h.agreement_id])).c, 2);
  assertEquals((await one("select count(*)::int c from payments where agreement_id = $1 and status = 'succeeded'", [h.agreement_id])).c, 1);
  assert(stripeCalls.some((c) => c.path === "/payment_intents" && c.body.includes("pm_saved")), "the saved card was charged");
  assertEquals((await hire(pb, "h1")).duplicate, true, "the same click twice hires once");
  const notes = (await one("select count(*)::int c from notifications where dedupe_key like $1 and channel = 'in_app'", ["standing:" + sa + ":hire:" + h.hire_id + "%"])).c;
  assertEquals(notes, 2, "both get a notice with the price and the cap left");
});

Deno.test("outside the limits: over the open-jobs limit or the monthly cap makes a draft, never a hire", async () => {
  assertEquals((await hire(pb2, "h2")).status, "active", "a second job fits (2 open at once)");
  await pool.query("update standing_arrangements set cap_cents = 500000 where id = $1", [sa]);
  const third = await hire(pb, "h3");
  assertEquals(third.reason, "too_many_open");
  await pool.query("update standing_arrangements set cap_cents = 70000 where id = $1", [sa]);
  assert(third.draft_gig_id, "a draft gig instead");
  assertEquals((await one("select status from gigs where id = $1", [third.draft_gig_id])).status, "draft");
  await pool.query("update standing_arrangements set max_open = 5 where id = $1", [sa]);
  const over = await hire(pb, "h4");
  assertEquals([over.reason, over.spend_cents, over.cap_cents], ["over_cap", 60000, 70000], "a third $300 job would pass the $700 cap");
  assertEquals((await one("select count(*)::int c from standing_hires where arrangement_id = $1", [sa])).c, 2, "no hire was made");
});

Deno.test("the freelancer declines one hire within 24 hours: refunded in full, and it no longer counts", async () => {
  const h = (await list(fl)).arrangements[0].hires.find((x: any) => x.title === "Run a conflict check");
  assert(h.can_decline);
  const r = (await call("POST", "/standing/decline-hire", fl.token, { hire_id: h.id })).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  const ag = (await one("select agreement_id from standing_hires where id = $1", [h.id])).agreement_id;
  const paid = (await one("select coalesce(sum(amount_cents), 0)::int s from payments where agreement_id = $1 and status = 'succeeded'", [ag])).s;
  const refund = (await one("select coalesce(sum(amount_cents), 0)::int s from refunds where agreement_id = $1", [ag])).s;
  assertEquals([refund, paid > 0], [paid, true], "everything paid is refunded, the platform fee included");
  assertEquals((await list(att)).arrangements[0].spend_cents, 30000);
  await pool.query("update standing_hires set decline_until = now() - interval '1 minute' where arrangement_id = $1 and status = 'active'", [sa]);
  const other = (await list(fl)).arrangements[0].hires.find((x: any) => x.status === "active");
  assertEquals((await call("POST", "/standing/decline-hire", fl.token, { hire_id: other.id })).body.reason, "decline_window_over");
});

Deno.test("material changes: a new approved version stops hiring until both approve again; holds stop a hire (T17)", async () => {
  await pool.query("update playbooks set approved_version = 2, current_version = 2 where id = $1", [pb2]);
  const r = await hire(pb2, "h5");
  assertEquals(r.reason, "needs_review", JSON.stringify(r));
  assertEquals((await hire(pb, "h6")).reason, "standing_not_active", "all automatic hiring is paused");
  assert((await call("POST", "/standing/review", att.token, { id: sa, approve: true, typed_name: "Sam Standing", consent: true })).body.waiting_for_other);
  assertEquals((await call("POST", "/standing/review", fl.token, { id: sa, approve: true, typed_name: "Rita Repeat", consent: true })).body.status, "active");
  const docs = (await list(att)).arrangements[0].docs;
  assertEquals(docs.find((d: any) => d.playbook_id === pb2).version, 2, "the arrangement now covers version 2");
  const hold = (await one("insert into holds (scope_type, scope_id, rule, reason) values ('person', $1, 'test', 'test') returning id", [fl.id])).id;
  assertEquals((await hire(pb2, "h7")).reason, "on_hold");
  await pool.query("delete from holds where id = $1", [hold]);
});

Deno.test("Fix: a firm without a saved card can still hire; the job waits for payment on Stripe's page", async () => {
  await pool.query("update standing_arrangements set provider_customer = '', provider_payment_method = '' where id = $1", [sa]);
  const r = await hire(pb2, "h10");
  assertEquals([r.ok, r.status, typeof r.pay_url], [true, "paying", "string"], JSON.stringify(r));
  await pool.query("update standing_arrangements set provider_customer = 'cus_saved', provider_payment_method = 'pm_saved' where id = $1", [sa]);
  // The freelancer can still decline a job that waits for payment; nothing was paid, so nothing is refunded
  const d = (await call("POST", "/standing/decline-hire", fl.token, { hire_id: r.hire_id })).body;
  assertEquals(d.ok, true, JSON.stringify(d));
  assertEquals((await one("select status from standing_hires where id = $1", [r.hire_id])).status, "declined");
});

Deno.test("new limits need both; ending waits for open jobs; the statement; the Lawfecta Team's list", async () => {
  assert((await call("POST", "/standing/change", att.token, { id: sa, price: "300", cap: "1200", max_open: 3, typed_name: "Sam Standing", consent: true })).body.ok);
  assertEquals((await hire(pb, "h8")).reason, "standing_not_active", "paused until the freelancer approves");
  assertEquals((await call("POST", "/standing/review", fl.token, { id: sa, approve: true, typed_name: "Rita Repeat", consent: true })).body.status, "active");
  assertEquals((await list(att)).arrangements[0].cap_cents, 120000);
  assertEquals((await call("POST", "/standing/end", fl.token, { id: sa })).body.status, "ending", "it ends once the open job finishes");
  assertEquals((await hire(pb, "h9")).reason, "standing_not_active");
  await pool.query("update agreements set status = 'completed', completed_at = now() where id in (select agreement_id from standing_hires where arrangement_id = $1)", [sa]);
  await rpc("dela_standing_tick", {});
  assertEquals((await one("select status from standing_arrangements where id = $1", [sa])).status, "ended");
  const adm = (await call("GET", "/admin/standing", team.token)).body;
  assert(adm.arrangements.some((x: any) => x.id === sa && x.declined === 2 && x.hires === 1), JSON.stringify(adm).slice(0, 300));
  assertEquals((await call("GET", "/admin/standing", att.token)).status, 403);
});

Deno.test("teardown", async () => {
  await pool.query("update feature_switches set state = 'off' where key = 'auto_repeat_hiring'");
  await pool.end();
});

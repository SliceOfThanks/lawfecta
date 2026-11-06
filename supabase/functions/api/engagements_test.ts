// Step 6 API tests: agreements, signing, milestone payments through a Stripe stand-in, DELA's check, the attorney's review,
// payouts, refunds, disputes and chargebacks. Both sides, mistakes and misuse included. Run after tools/dbtest.sh:
//   deno test -A supabase/functions/api/engagements_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { keyAllowed, stripeForm, stripeSignatureHeader, verifyStripeSignature, accountStatus } from "./lib/payments/stripe.ts";
import { buildBody, feeLines, proposeMilestones, rubricFor, scoreFindings, termsText } from "./lib/engagements/agreement.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "E".repeat(40); // rules-ok: a made-up test key
const STRIPE_TEST = "sk_test_" + "x".repeat(24); // rules-ok: a made-up test key
const STRIPE_LIVE = "sk_live_" + "x".repeat(24); // rules-ok: a made-up test key
const WHSEC = "whsec_test_secret"; // rules-ok: a made-up test secret
const env: Record<string, string> = { OPENAI_API_KEY: LAWFECTA, DELA_ORIGINS: "https://lawfecta.com", STRIPE_SECRET_KEY: STRIPE_TEST, STRIPE_WEBHOOK_SECRET: WHSEC };

// ---------- The Stripe stand-in: remembers idempotency keys like Stripe does ----------
const stripeCalls: Array<{ method: string; path: string; body: string; idem: string }> = [];
const stripeSeen = new Map<string, unknown>();
let decline = false;
let checkFindings: Record<string, string> = {};
let n = 0;
function stripeAnswer(method: string, path: string, body: URLSearchParams): [number, unknown] {
  if (method === "POST" && path === "/payment_intents") {
    if (decline) return [402, { error: { message: "Your card was declined.", code: "card_declined" } }];
    return [200, { id: "pi_" + (++n), status: "succeeded", amount: Number(body.get("amount")), customer: body.get("customer"), payment_method: body.get("payment_method") }];
  }
  if (method === "POST" && path === "/checkout/sessions") return [200, { id: "cs_" + (++n), url: "https://checkout.stripe.test/c/" + n }];
  if (method === "POST" && path === "/accounts") return [200, { id: "acct_" + (++n) }];
  if (method === "POST" && path === "/account_links") return [200, { url: "https://connect.stripe.test/setup/" + body.get("account") }];
  if (method === "GET" && path.startsWith("/accounts/")) return [200, { id: path.slice(10), payouts_enabled: true, charges_enabled: true, requirements: { currently_due: [], past_due: [] } }];
  if (method === "POST" && path === "/transfers") return [200, { id: "tr_" + (++n), amount: Number(body.get("amount")) }];
  if (method === "POST" && path === "/refunds") return [200, { id: "re_" + (++n), amount: Number(body.get("amount")) }];
  if (method === "GET" && path.startsWith("/payment_intents/")) return [200, { id: path.slice(17), status: "succeeded", amount: 0 }];
  return [404, { error: { message: "no such route" } }];
}
const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("https://api.stripe.com/v1")) {
    const u = new URL(url);
    const path = u.pathname.slice(3);
    const method = String(init.method ?? "GET");
    const headers = new Headers(init.headers);
    assert((headers.get("authorization") ?? "").startsWith("Bearer sk_test_"), "only a test key reaches Stripe");
    const idem = headers.get("idempotency-key") ?? "";
    stripeCalls.push({ method, path, body: String(init.body ?? u.search), idem });
    if (idem && stripeSeen.has(idem)) return Response.json(stripeSeen.get(idem));
    const [status, out] = stripeAnswer(method, path, new URLSearchParams(String(init.body ?? "")));
    if (idem && status === 200) stripeSeen.set(idem, out);
    return Response.json(out, { status });
  }
  if (url.endsWith("/chat/completions")) {
    const body = JSON.parse(String(init.body));
    const system = String(body.messages[0].content), user = String(body.messages.at(-1).content);
    let out: unknown = {};
    if (system.includes("checking one milestone")) {
      const ids = [...user.matchAll(/^- ([a-z]\d+)/gm)].map((m) => m[1]);
      out = { findings: ids.map((id) => ({ id, met: checkFindings[id] ?? "yes", evidence: "See the statement" })) };
    } else if (body.response_format && system.includes("legal operations tool")) out = { client_info: false, kinds: [] };
    return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 10 } });
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
async function hook(ev: Record<string, unknown>, sign = true) {
  const payload = JSON.stringify(ev);
  const res = await handle(new Request("http://localhost/functions/v1/api/stripe/webhook", {
    method: "POST", headers: { "content-type": "application/json", "stripe-signature": sign ? await stripeSignatureHeader(payload, WHSEC) : "t=1,v1=00" }, body: payload,
  }), deps);
  return { status: res.status, body: await res.json() };
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
const paid = (id: string, pi: string, pm = "pm_card_1") => hook({ id: "evt_" + crypto.randomUUID(), type: "payment_intent.succeeded", livemode: false, data: { object: { id: pi, customer: "cus_1", payment_method: pm, metadata: { payment_id: id } } } });

const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(k: number, plan: string): Promise<M> {
  const bd = 7_600_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name) values ($1, $2) returning id", [bd, "Eng " + k])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}

let att: M, fl: M, fl2: M, other: M, team: M;
let org = "", pb = "", ag = "", ag2 = "";
let ms: Array<Record<string, any>> = [];
async function hire(f: M, price: number, tag: string): Promise<string> {
  const gig = (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id)
    values ($1, $2, $3, 1, $4, '{"task":"Prepare the filing packet","outcome":"A filing-ready packet"}', 30000, 200000, 'filled', now(), now() + interval '14 days', $5) returning id`, [org, att.id, pb, "Filing packet " + tag, "eg" + tag + RUN])).id;
  const prop = (await one(`insert into proposals (gig_id, freelancer_id, status, price_cents, included, excluded, schedule, days_to_deliver, sent_at)
    values ($1, $2, 'selected', $3, 'Petition draft; Exhibit list', 'Filing with the court', 'Draft in a week', 10, now()) returning id`, [gig, f.id, price])).id;
  return (await one("insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents) values ($1, $2, $3, $4, $5, $6) returning id", [gig, prop, org, att.id, f.id, price])).id;
}

Deno.test("helpers: Stripe form encoding, signatures, live keys, the rubric and the score", async () => {
  assertEquals(stripeForm({ a: 1, b: { c: "x y" }, d: ["p", "q"], e: "" }), "a=1&b%5Bc%5D=x%20y&d%5B0%5D=p&d%5B1%5D=q");
  assertEquals([keyAllowed(STRIPE_TEST, false), keyAllowed(STRIPE_LIVE, false), keyAllowed(STRIPE_LIVE, true), keyAllowed("", true), keyAllowed("pk_test_x", false)], [true, false, true, false, false]);
  const h = await stripeSignatureHeader("{}", WHSEC);
  assertEquals(await verifyStripeSignature("{}", h, WHSEC), true);
  assertEquals(await verifyStripeSignature("{ }", h, WHSEC), false, "a changed body fails");
  assertEquals(await verifyStripeSignature("{}", h, "other"), false);
  assertEquals(await verifyStripeSignature("{}", await stripeSignatureHeader("{}", WHSEC, Math.floor(Date.now() / 1000) - 3600), WHSEC), false, "old events are refused");
  assertEquals(accountStatus({ payouts_enabled: true, requirements: { currently_due: [] } }).status, "ready");
  assertEquals(accountStatus({ payouts_enabled: false, requirements: { currently_due: ["external_account"] } }), { status: "pending", requirements: ["external_account"] });
  const split = proposeMilestones({ proposal: { price_cents: 100001, days_to_deliver: 10 }, gig: { milestones: [{ title: "Draft", share_pct: 30 }, { title: "Final" }] } }, new Date("2026-11-05T12:00:00Z"));
  assertEquals(split.map((m) => m.amount_cents), [30000, 70001], "whole dollars, the remainder on the last");
  assertEquals(split.map((m) => m.due_date), ["2026-11-10", "2026-11-15"]);
  const rub = rubricFor(split[1], ["Petition draft", "Exhibit list"], ["Every exhibit is labeled"], true);
  assertEquals(rub.reduce((a, c) => a + c.weight, 0), 100);
  assertEquals(rub.filter((c) => c.required).map((c) => c.id), ["c1", "c2"]);
  const crit = [{ id: "a", text: "", weight: 8999, required: false }, { id: "b", text: "", weight: 1001, required: false }];
  assertEquals(scoreFindings(crit, { findings: [{ id: "a", met: "yes" }] }, 90).passed, false, "89.99 fails a 90 threshold");
  assertEquals(scoreFindings(crit, { findings: [{ id: "a", met: "yes" }] }, 90).score, 89.99);
  const req = [{ id: "c1", text: "", weight: 50, required: true }, { id: "q", text: "", weight: 50, required: false }];
  assertEquals(scoreFindings(req, { findings: [{ id: "c1", met: "unknown" }, { id: "q", met: "yes" }] }, 10).passed, false, "unknown never counts as met, and a required item must be met");
  assertEquals(scoreFindings(req, "nonsense", 0).findings.map((f) => f.met), ["unknown", "unknown"]);
  assert(termsText({ pass_score: 85 }).includes("score of 85 or more"));
  const b = buildBody({ proposal: { price_cents: 50000 }, fees: { attorney_bps: 350, freelancer_bps: 400, floor_cents: 1000 } }) as any;
  assertEquals([b.fees.attorney_fee_cents, b.fees.freelancer_fee_cents, b.fees.attorney_pays_cents, b.fees.freelancer_receives_cents], [1750, 2000, 51750, 48000]);
  const small = buildBody({ proposal: { price_cents: 20000 }, fees: { attorney_bps: 300, freelancer_bps: 300, floor_cents: 1000 } }) as any;
  assertEquals([small.fees.attorney_fee_cents, small.fees.freelancer_fee_cents], [1000, 1000], "the floor per party");
});

Deno.test("setup", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'engagements', 'milestone_funding', 'milestone_check', 'engagement_export', 'ai_generation', 'worker', 'profiles')");
  await pool.query("update feature_switches set state = 'off' where key = 'live_payments'");
  await pool.query("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
  att = await member(1, "att_pro"); fl = await member(2, "fl_plus"); fl2 = await member(3, "fl_free"); other = await member(4, "fl_free"); team = await member(5, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'finance'), ($1, 'reviewer')", [team.id]);
  await pool.query("insert into member_profiles (person_id, side, body, missing, score) values ($1, 'attorney', '{\"firm_name\":\"Example Legal\"}', '{}', 100)", [att.id]);
  await pool.query(`insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) values ($1, 'l', 'TX', $2, $2, 'A', 'video', 'verified')`, [att.id, "E" + att.bd]);
  await pool.query("select dela_profile_refresh($1, 'attorney')", [att.id]);
  org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  for (const f of [fl, fl2]) {
    await pool.query("insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) values ($1, 'freelancer', '{\"first_name\":\"Fran\",\"last_name\":\"Lance\"}', '{}', 100, now())", [f.id]);
  }
  pb = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ($1, 'Filing', 'approved', 1, 1, 100, 'e1', $2) returning id`, [org, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb, { title: "Filing", steps: [{ text: "Draft the petition" }], checks: ["Every exhibit is labeled"] }, att.id]);
  ag = await hire(fl, 100000, "a");
  ag2 = await hire(fl2, 40000, "b");
});

Deno.test("agreement: DELA drafts version 1 from the facts; only the two parties see it; fees from settings (5% each side on every plan)", async () => {
  const r = (await call("GET", "/agreements/get?id=" + ag, fl.token)).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  assertEquals(r.current.version, 1);
  const body = r.current.body;
  assertEquals(body.milestones.map((m: any) => [m.title, m.amount_cents]), [["Draft", 50000], ["Final", 50000]]);
  assert(String(body.terms).startsWith("DRAFT FOR LAWFECTA'S LAWYER"), "the fixed template, marked as a draft for counsel");
  assertEquals(body.parties.client.firm, "Example Legal");
  assertEquals(body.parties.freelancer.name, "Fran Lance");
  assertEquals([body.fees.attorney_bps, body.fees.freelancer_bps], [500, 500], "5% each side, whatever the plan (Stacey 2026-11-05)");
  assertEquals([body.fees.attorney_fee_cents, body.fees.freelancer_fee_cents], [5000, 5000]);
  assert(r.fee_lines.some((l: string) => l.includes("$50")));
  // What each side pays or receives, from the same fees (UX review E01)
  assertEquals(r.money_summary, ["You receive $950 in total, after your $50 platform fee.", "Each milestone is paid out after the client accepts it."]);
  assertEquals((await call("GET", "/agreements/get?id=" + ag, att.token)).body.money_summary, ["Your total: $1,050", "First payment: $550 (milestone 1 and the platform fee)", "Then $500 for milestone 2",
    "The next milestone is charged automatically after you accept the previous milestone."]);
  assertEquals(r.stripe_ready, true);
  assert(body.rubric[0].criteria.some((c: any) => c.text.includes("Every exhibit is labeled")), "the playbook's quality checks are in the rubric");
  assertEquals((await call("GET", "/agreements/get?id=" + ag, att.token)).body.current.version, 1, "opening it twice makes one version");
  assertEquals((await call("GET", "/agreements/get?id=" + ag, other.token)).body.reason, "not_found", "another freelancer cannot see it");
  // A made-up id is refused everywhere (the party check is never empty)
  const fake = crypto.randomUUID();
  assertEquals((await call("GET", "/agreements/get?id=" + fake, att.token)).body.reason, "not_found");
  assertEquals((await call("POST", "/agreements/sign", att.token, { id: fake, version: 1, typed_name: "Ann", consent: true })).body.reason, "not_found");
  assertEquals((await call("POST", "/engagements/pay", att.token, { id: fake })).body.reason, "not_found");
  assertEquals((await call("POST", "/engagements/cancel", att.token, { id: fake, reason: "x" })).body.reason, "not_found");
  assertEquals((await call("POST", "/disputes/open", fl.token, { id: fake, reason: "x" })).body.reason, "not_found");
  assertEquals((await call("GET", "/engagements/export?id=" + fake, fl.token)).body.reason, "export_not_available");
  assertEquals((await call("GET", "/agreements/get?gig=" + r.agreement.gig_id, att.token)).body.agreement.id, ag, "found from the gig too");
  const list = (await call("GET", "/engagements", fl.token)).body;
  assertEquals(list.engagements.find((e: any) => e.id === ag).needs_me, "sign");
});

Deno.test("changes and signing: checked amounts, stale versions refused, both sign the same version, signatures never change", async () => {
  const base = { id: ag, base: 1, included: "Petition draft; Exhibit list", excluded: "Filing", schedule: "Two weeks" };
  const d = (k: number) => new Date(Date.now() + k * 86400000).toISOString().slice(0, 10);
  assertEquals((await call("POST", "/agreements/propose", fl.token, { ...base, milestones: [{ title: "Tiny", amount: "10", due_date: d(3) }, { title: "Rest", amount: "990", due_date: d(9) }] })).body.reason, "milestone_too_small");
  assertEquals((await call("POST", "/agreements/propose", fl.token, { ...base, milestones: Array.from({ length: 7 }, (_, i) => ({ title: "M" + i, amount: "150" })) })).body.reason, "milestone_count");
  assertEquals((await call("POST", "/agreements/propose", fl.token, { ...base, milestones: [{ title: "All", amount: "1000", due_date: d(200) }] })).body.reason, "too_long");
  assertEquals((await call("POST", "/agreements/propose", fl.token, { ...base, milestones: [{ title: "All", amount: "1000" }], note: "pay me on venmo instead" })).body.reason, "keep_on_lawfecta", "plans to pay off Lawfecta are refused");
  const three = [{ title: "Draft petition", amount: "300", due_date: d(4), deliverables: "Petition draft" }, { title: "Exhibits", amount: "300", due_date: d(7), deliverables: "Exhibit list" }, { title: "Final packet", amount: "400", due_date: d(10), deliverables: "The finished packet" }];
  const v2 = (await call("POST", "/agreements/propose", fl.token, { ...base, milestones: three, note: "Three steps" })).body;
  assertEquals([v2.ok, v2.version], [true, 2], JSON.stringify(v2));
  assertEquals((await call("POST", "/agreements/propose", att.token, { ...base, milestones: three })).body.reason, "changed_elsewhere", "a change based on an old version is refused");
  assertEquals((await call("POST", "/agreements/sign", att.token, { id: ag, version: 1, typed_name: "Ann Attorney", consent: true })).body.reason, "not_current_version");
  assertEquals((await call("POST", "/agreements/sign", att.token, { id: ag, version: 2, typed_name: "Ann Attorney", consent: false })).body.reason, "sign_needs_name_and_consent");
  assertEquals((await call("POST", "/agreements/sign", att.token, { id: ag, version: 2, typed_name: "Ann Attorney", consent: true })).body.reason, "firm_details_missing", "the firm's signatory, address and notice email come first");
  await pool.query("insert into firm_profiles (org_id, body) values ($1, $2) on conflict (org_id) do update set body = excluded.body", [org, { signatory_name: "Ann Attorney", billing_address: "1 Main St, Austin TX", service_email: "notices@example.com" }]);
  assertEquals((await call("POST", "/agreements/sign", att.token, { id: ag, version: 2, typed_name: "Ann Attorney", consent: true })).body.both_signed, false);
  assertEquals((await call("POST", "/agreements/sign", att.token, { id: ag, version: 2, typed_name: "Ann Attorney", consent: true })).body.both_signed, false, "signing twice adds nothing");
  assertEquals((await call("POST", "/engagements/pay", att.token, { id: ag })).body.reason, "not_signed", "no payment before both sign");
  const both = (await call("POST", "/agreements/sign", fl.token, { id: ag, version: 2, typed_name: "Fran Lance", consent: true })).body;
  assertEquals([both.both_signed, both.attorney_fee_cents, both.freelancer_fee_cents], [true, 5000, 5000]);
  const v = (await call("GET", "/agreements/get?id=" + ag, att.token)).body;
  ms = v.milestones;
  assertEquals(ms.map((m: any) => m.amount_cents), [30000, 30000, 40000]);
  assertEquals(ms.reduce((a: number, m: any) => a + m.freelancer_fee_cents, 0), 5000, "the freelancer fee is spread with nothing lost to rounding");
  assertEquals(v.agreement.status, "signed");
  assertEquals(v.signatures.length, 2);
  let refused = false;
  try { await pool.query("update agreement_signatures set typed_name = 'Someone else' where agreement_id = $1", [ag]); } catch { refused = true; }
  assert(refused, "signatures are append-only");
});

Deno.test("paying: Checkout once for two clicks; Stripe's events are signed, handled once, and fund the milestone", async () => {
  env.STRIPE_SECRET_KEY = STRIPE_LIVE;
  assertEquals((await call("POST", "/engagements/pay", att.token, { id: ag })).body.reason, "payments_not_set_up", "a live key is refused while live payments are off");
  env.STRIPE_SECRET_KEY = STRIPE_TEST;
  assertEquals((await call("POST", "/engagements/pay", fl.token, { id: ag })).status, 403, "only the attorney pays");
  const [a, b] = [await call("POST", "/engagements/pay", att.token, { id: ag }), await call("POST", "/engagements/pay", att.token, { id: ag })];
  assertEquals(a.body.status, "requires_payment", JSON.stringify(a.body));
  assertEquals(a.body.url, b.body.url, "the same Checkout page both times");
  assertEquals(stripeCalls.filter((c) => c.path === "/checkout/sessions").length, 1, "one Checkout session");
  const sess = stripeCalls.find((c) => c.path === "/checkout/sessions")!;
  assert(sess.body.includes("unit_amount%5D=35000"), "milestone 1 and the attorney's platform fee together: " + sess.body);
  assert(sess.body.includes("setup_future_usage%5D=off_session"));
  const pay = await one("select id, amount_cents, fee_cents from payments where agreement_id = $1", [ag]);
  assertEquals([pay.amount_cents, pay.fee_cents], [35000, 5000]);
  assertEquals((await hook({ id: "evt_bad", type: "payment_intent.succeeded", data: { object: { metadata: { payment_id: pay.id } } } }, false)).status, 400, "an unsigned event is refused");
  assertEquals((await hook({ id: "evt_live", type: "payment_intent.succeeded", livemode: true, data: { object: { metadata: { payment_id: pay.id } } } })).status, 400, "a live event while live payments are off");
  assertEquals((await one("select status from payments where id = $1", [pay.id])).status, "requires_payment");
  const ev = { id: "evt_paid_1", type: "payment_intent.succeeded", livemode: false, data: { object: { id: "pi_first", customer: "cus_1", payment_method: "pm_card_1", metadata: { payment_id: pay.id } } } };
  assertEquals((await hook(ev)).body.ok, true);
  assertEquals((await hook(ev)).body.duplicate, true, "the same event twice is handled once");
  const led = await one("select sum(amount_cents) filter (where kind = 'charge') c, sum(amount_cents) filter (where kind = 'attorney_fee') f, sum(amount_cents) filter (where kind = 'held') h from ledger_entries where agreement_id = $1", [ag]);
  assertEquals([Number(led.c), Number(led.f), Number(led.h)], [35000, 5000, 30000]);
  const v = (await call("GET", "/agreements/get?id=" + ag, att.token)).body;
  assertEquals([v.agreement.status, v.milestones[0].status, v.agreement.saved_payment], ["active", "funded", true]);
  assertEquals((await call("POST", "/engagements/pay", att.token, { id: ag })).body.reason, "previous_not_accepted", "the next milestone waits for this one");
  let refused = false;
  try { await pool.query("delete from ledger_entries where agreement_id = $1", [ag]); } catch { refused = true; }
  assert(refused, "the ledger is append-only");
});

Deno.test("delivery: start, submit, DELA's check scores in code, a failed check can go to a person", async () => {
  const m1 = ms[0].id;
  assertEquals((await call("POST", "/milestones/start", other.token, { id: m1 })).body.reason, "not_found");
  assertEquals((await call("POST", "/milestones/start", fl.token, { id: m1 })).body.ok, true);
  assertEquals((await call("POST", "/milestones/submit", fl.token, { milestone_id: m1, statement: "Done", request_id: "s0" })).body.reason, "statement_needed");
  checkFindings = { c1: "no" };
  const failed = (await call("POST", "/milestones/submit", fl.token, { milestone_id: m1, statement: "I drafted the petition from the intake form. Nothing is open.", request_id: "s1" })).body;
  assertEquals([failed.ok, failed.status], [true, "failed"], JSON.stringify(failed));
  assert(failed.score < 90);
  assertEquals((await call("POST", "/milestones/submit", fl.token, { milestone_id: m1, statement: "I drafted the petition from the intake form. Nothing is open.", request_id: "s1" })).body.duplicate, true, "two clicks submit once");
  assertEquals((await one("select count(*)::int n from ai_usage where task = 'milestone_check' and source = 'lawfecta'")).n >= 1, true, "the check uses Lawfecta's key");
  assertEquals((await call("POST", "/milestones/human", fl.token, { id: failed.id })).body.ok, true);
  const admin = (await call("GET", "/admin/payments", team.token)).body.data;
  assert(admin.human_reviews.some((h: any) => h.id === failed.id));
  assertEquals((await call("GET", "/admin/payments", fl.token)).status, 403);
  assertEquals((await call("POST", "/admin/submissions/decide", team.token, { id: failed.id, pass: true })).body.data.reason, "say_why");
  assertEquals((await call("POST", "/admin/submissions/decide", team.token, { id: failed.id, pass: true, note: "The petition is there; DELA missed it." })).body.data.ok, true);
  assertEquals((await one("select status from milestone_submissions where id = $1", [failed.id])).status, "with_attorney");
  ms[0].sub = failed.id;
});

Deno.test("review: changes need a note and stop at the included rounds; acceptance pays out once payouts are set up, and charges the next milestone", async () => {
  const sub = ms[0].sub;
  assertEquals((await call("POST", "/milestones/decide", att.token, { submission_id: sub, accept: false })).body.reason, "say_what_to_change");
  assertEquals((await call("POST", "/milestones/decide", fl.token, { submission_id: sub, accept: true })).status, 403);
  assertEquals((await call("POST", "/milestones/decide", att.token, { submission_id: sub, accept: false, note: "Please add the case caption." })).body.revisions_left, 1);
  checkFindings = {};
  let s = (await call("POST", "/milestones/submit", fl.token, { milestone_id: ms[0].id, statement: "Added the case caption as asked. Nothing is open.", request_id: "s2" })).body;
  assertEquals([s.status, s.score], ["with_attorney", 100], JSON.stringify(s));
  assertEquals((await call("POST", "/milestones/decide", att.token, { submission_id: s.id, accept: false, note: "And the county." })).body.revisions_left, 0);
  s = (await call("POST", "/milestones/submit", fl.token, { milestone_id: ms[0].id, statement: "Added the county too. Nothing is open.", request_id: "s3" })).body;
  assertEquals((await call("POST", "/milestones/decide", att.token, { submission_id: s.id, accept: false, note: "One more thing." })).body.reason, "revisions_used_up", "more rounds need a change order");
  const acc = (await call("POST", "/milestones/decide", att.token, { submission_id: s.id, accept: true, note: "Looks good." })).body;
  assertEquals(acc.ok, true, JSON.stringify(acc));
  assertEquals(acc.next_payment?.status, "succeeded", "milestone 2 is charged with the saved payment method");
  const pi = stripeCalls.filter((c) => c.path === "/payment_intents");
  assertEquals(pi.length, 1);
  assert(pi[0].body.includes("off_session=true") && pi[0].body.includes("amount=30000"), "no second platform fee: " + pi[0].body);
  assertEquals((await call("POST", "/milestones/decide", att.token, { submission_id: s.id, accept: true })).body.duplicate, true);
  let po = await one("select status, held_reason, amount_cents from payouts where milestone_id = $1", [ms[0].id]);
  assertEquals([po.status, po.held_reason, po.amount_cents], ["held", "payout_account", 30000 - ms[0].freelancer_fee_cents], "held until the freelancer sets up payouts");
  assertEquals((await call("POST", "/payouts/setup", att.token, {})).status, 403);
  const setup = (await call("POST", "/payouts/setup", fl.token, {})).body;
  assert(String(setup.url).startsWith("https://connect.stripe.test/setup/acct_"), JSON.stringify(setup));
  await call("POST", "/payouts/setup", fl.token, {});
  assertEquals(stripeCalls.filter((c) => c.path === "/accounts" && c.method === "POST").length, 1, "one Stripe account per freelancer");
  const ref = (await call("GET", "/payouts/refresh", fl.token)).body;
  assertEquals(ref.account.status, "ready");
  po = await one("select status, provider_ref from payouts where milestone_id = $1", [ms[0].id]);
  assertEquals(po.status, "sent");
  await call("GET", "/payouts/refresh", fl.token);
  assertEquals(stripeCalls.filter((c) => c.path === "/transfers").length, 1, "a payout is sent once");
  assertEquals(Number((await one("select sum(amount_cents) s from ledger_entries where agreement_id = $1 and kind = 'transfer'", [ag])).s), -(30000 - ms[0].freelancer_fee_cents));
  const v = (await call("GET", "/agreements/get?id=" + ag, fl.token)).body;
  assertEquals([v.milestones[0].status, v.milestones[1].status, v.export], ["accepted", "funded", true]);
  assertEquals(v.payments, null, "the freelancer does not see the attorney's payments");
  const ex = (await call("GET", "/engagements/export?id=" + ag, fl.token)).body;
  assertEquals(ex.ok, true, "the engagement playbook export unlocks after the first accepted milestone");
});

Deno.test("a declined card falls back to Stripe's Checkout page; the work waits", async () => {
  const m2 = ms[1].id;
  await call("POST", "/milestones/start", fl.token, { id: m2 });
  const s = (await call("POST", "/milestones/submit", fl.token, { milestone_id: m2, statement: "The exhibit list is done and labeled.", request_id: "m2a" })).body;
  decline = true;
  const acc = (await call("POST", "/milestones/decide", att.token, { submission_id: s.id, accept: true })).body;
  decline = false;
  assertEquals(acc.next_payment.status, "requires_payment", JSON.stringify(acc));
  assert(acc.next_payment.failed_first.includes("declined"));
  assert(String(acc.next_payment.url).startsWith("https://checkout.stripe.test/"));
  const m3 = await one("select status from milestones where id = $1", [ms[2].id]);
  assertEquals(m3.status, "awaiting_funding");
  const v = (await call("GET", "/agreements/get?id=" + ag, att.token)).body;
  assert(v.payments.some((p: any) => p.status === "failed" && p.failure.includes("declined")));
  const pay = await one("select id from payments where milestone_id = $1 and status = 'requires_payment'", [ms[2].id]);
  await paid(pay.id, "pi_third");
  assertEquals((await one("select status from milestones where id = $1", [ms[2].id])).status, "funded");
});

Deno.test("disputes: 14 days of notice first, then the team splits the held money; nobody is paid twice", async () => {
  const m3 = ms[2].id;
  assertEquals((await call("POST", "/disputes/open", att.token, { id: ag, milestone_id: m3, reason: "" })).body.reason, "say_why");
  const d = (await call("POST", "/disputes/open", att.token, { id: ag, milestone_id: m3, reason: "We disagree about what the final packet includes." })).body;
  assertEquals(d.ok, true, JSON.stringify(d));
  assertEquals((await call("POST", "/disputes/open", fl.token, { id: ag, milestone_id: m3, reason: "Also me" })).body.duplicate, true, "one open dispute at a time");
  assertEquals((await call("POST", "/engagements/cancel", att.token, { id: ag, reason: "Stop" })).body.reason, "in_dispute");
  const notice = await one("select extract(day from notice_ends_at - created_at)::int d from disputes where id = $1", [d.id]);
  assertEquals(notice.d, 14);
  assertEquals((await call("POST", "/admin/disputes/resolve", team.token, { id: d.id, release_cents: 20000, refund_cents: 20000, note: "Split" })).body.data.reason, "notice_not_over");
  await pool.query("update disputes set notice_ends_at = now() - interval '1 minute' where id = $1", [d.id]);
  await pool.query("select dela_engagement_tick($1)", [{ dispute_id: d.id, kind: "dispute_notice_end" }]);
  assertEquals((await one("select status from disputes where id = $1", [d.id])).status, "team_review");
  assertEquals((await call("POST", "/admin/disputes/resolve", team.token, { id: d.id, release_cents: 30000, refund_cents: 20000, note: "Split" })).body.data.reason, "split_must_equal");
  assertEquals((await call("POST", "/admin/disputes/resolve", team.token, { id: d.id, release_cents: 20000, refund_cents: 20000, note: "Half the packet was delivered." })).body.data.ok, true);
  assertEquals((await call("POST", "/admin/disputes/resolve", team.token, { id: d.id, release_cents: 20000, refund_cents: 20000, note: "Again" })).body.data.duplicate, true);
  const refund = stripeCalls.filter((c) => c.path === "/refunds");
  assertEquals(refund.length, 1);
  assert(refund[0].body.includes("payment_intent=pi_third") && refund[0].body.includes("amount=20000"));
  const po = await one("select status, amount_cents from payouts where idem_key = $1", ["payout:" + m3 + ":dispute"]);
  assertEquals(po.status, "sent");
  assertEquals((await one("select status from refunds where agreement_id = $1", [ag])).status, "succeeded");
});

Deno.test("canceling before work starts refunds everything, the attorney's fee included", async () => {
  await call("GET", "/agreements/get?id=" + ag2, att.token);
  await call("POST", "/agreements/sign", att.token, { id: ag2, version: 1, typed_name: "Ann Attorney", consent: true });
  assertEquals((await call("POST", "/agreements/sign", fl2.token, { id: ag2, version: 1, typed_name: "Fran Two", consent: true })).body.both_signed, true);
  const r = (await call("POST", "/engagements/pay", att.token, { id: ag2 })).body;
  assertEquals(r.status, "requires_payment", "a new agreement pays on Checkout");
  const pay = await one("select id, amount_cents, fee_cents from payments where agreement_id = $1", [ag2]);
  assertEquals([pay.amount_cents, pay.fee_cents], [20000 + 2000, 2000], "the first half and the 5% fee on the whole price");
  await paid(pay.id, "pi_cancel");
  assertEquals((await call("POST", "/engagements/cancel", other.token, { id: ag2, reason: "x" })).body.reason, "not_found");
  assertEquals((await call("POST", "/engagements/cancel", att.token, { id: ag2, reason: "" })).body.reason, "say_why");
  const c = (await call("POST", "/engagements/cancel", att.token, { id: ag2, reason: "The client settled." })).body;
  assertEquals([c.ok, c.refunds, c.fee_refunded], [true, 1, true], JSON.stringify(c));
  assertEquals((await call("POST", "/engagements/cancel", att.token, { id: ag2, reason: "Again" })).body.duplicate, true);
  const rf = stripeCalls.filter((x) => x.path === "/refunds" && x.body.includes("pi_cancel"));
  assertEquals(rf.length, 1);
  assert(rf[0].body.includes("amount=22000"), "the milestone and the fee: " + rf[0].body);
  assertEquals((await call("POST", "/agreements/propose", fl2.token, { id: ag2, milestones: [{ title: "A", amount: "300" }] })).body.reason, "agreement_closed");
});

Deno.test("chargebacks pause the engagement; a lost one puts the attorney on hold for review", async () => {
  const ev = (id: string, type: string, status = "") => hook({ id, type, livemode: false, data: { object: { id: "dp_1", payment_intent: "pi_first", amount: 35000, reason: "fraudulent", status } } });
  assertEquals((await ev("evt_cb1", "charge.dispute.created")).body.ok, true);
  assertEquals((await one("select status from agreements where id = $1", [ag])).status, "paused");
  assertEquals((await call("GET", "/admin/payments", team.token)).body.data.chargebacks.length >= 1, true);
  await ev("evt_cb2", "charge.dispute.closed", "lost");
  const h = await one("select rule from holds where scope_id = $1 and rule like '%chargeback%'", [att.id]);
  assertEquals(h.rule, "first_lost_chargeback");
  assertEquals((await call("POST", "/agreements/sign", att.token, { id: ag, version: 2, typed_name: "Ann", consent: true })).body.reason, "on_hold");
  await pool.query("delete from holds where scope_id = $1", [att.id]);
});

Deno.test("every day: agreements not signed in time close and the attorney can choose again", async () => {
  const ag3 = await hire(other, 30000, "c");
  await call("GET", "/agreements/get?id=" + ag3, other.token);
  assertEquals(await pool.query("update agreements set sign_by = now() - interval '1 minute' where id = $1", [ag3]).then(() => true), true);
  assertEquals((await call("POST", "/agreements/sign", other.token, { id: ag3, version: 1, typed_name: "Other", consent: true })).body.reason, "sign_time_over");
  await pool.query("select dela_engagements_daily()");
  const a = await one("select a.status, a.cancel_reason, p.status ps from agreements a join proposals p on p.id = a.proposal_id where a.id = $1", [ag3]);
  assertEquals([a.status, a.cancel_reason, a.ps], ["canceled", "not_signed_in_time", "sent"]);
});

Deno.test("teardown", async () => { await pool.end(); });

Deno.test("fees: an agreement with no fee amounts reads \"-\", never \"$NaN\" (ChatGPT re-test 2026-11-05)", () => {
  const lines = feeLines({ milestones: [{ seq: 1, title: "Draft", amount_cents: 45000 }] });
  assertEquals(lines.length, 4);
  for (const l of lines) assert(!l.includes("NaN"), l);
  assert(lines[0].endsWith(": -"), lines[0]);
  assert(feeLines({ fees: { total_cents: 60000, attorney_fee_cents: 3000, freelancer_fee_cents: 3000, freelancer_receives_cents: 57000 } })[3].endsWith("$570"));
});

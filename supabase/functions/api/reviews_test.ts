// Step 7 API tests: reviews after completed work (both sides, misuse included), reviews from past clients, the trusted bench and
// bench conversations, bench suggestions, and member webhooks (address safety, signing, retries, pausing, plan limits).
// The real handler and the local test database, with OpenAI, DNS and webhook-receiver stand-ins. Run after tools/dbtest.sh:
//   deno test -A supabase/functions/api/reviews_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { checkUrl, isPrivateIp, signatureHeader, verifySignature } from "./lib/webhooks/deliver.ts";
import { readRatings, readSafety } from "./lib/reviews/model.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "R".repeat(40); // rules-ok: a made-up test key
const ENC = "reviews-test-encryption-secret-0123456789abcdef"; // rules-ok: a made-up test secret
const WORKER = "test-worker-secret-reviews-0123456789abc";
const DNS: Record<string, string[]> = { "hooks.example.com": ["93.184.216.34"], "down.example.com": ["93.184.216.35"], "sneaky.example.com": ["10.0.0.5"], "redirect.example.com": ["93.184.216.36"] };
const received: Array<{ url: string; headers: Headers; body: string }> = [];

const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/chat/completions")) {
    const body = JSON.parse(String(init.body));
    const system = String(body.messages[0].content), user = String(body.messages.at(-1).content);
    let out: unknown = {};
    if (system.includes("You check one review")) out = /kill you|hurt you/i.test(user) ? { hold: true, kinds: ["threat"] } : { hold: false, kinds: [] };
    else if (body.response_format && system.includes("legal operations tool")) out = { client_info: false, kinds: [] };
    else if (system.includes("You review messages members send")) out = { off_platform: false, kinds: [], insights: [] };
    return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 10 } });
  }
  if (url.startsWith("https://hooks.example.com/")) { received.push({ url, headers: new Headers(init.headers), body: String(init.body) }); return new Response("ok", { status: 200 }); }
  if (url.startsWith("https://down.example.com/")) return new Response("no", { status: 500 });
  if (url.startsWith("https://redirect.example.com/")) { assertEquals(init.redirect, "manual", "redirects are never followed"); return new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }); }
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: () => Promise.resolve(1), read: () => Promise.reject(new Error("missing")), remove: () => Promise.resolve(), put: () => Promise.resolve(),
};
const env: Record<string, string> = { OPENAI_API_KEY: LAWFECTA, DELA_ORIGINS: "https://lawfecta.com", AI_KEY_ENCRYPTION_SECRET: ENC };
const deps: Deps = { rpc, env: (k) => env[k] ?? "", fetch: fakeFetch, storage, resolve: (h) => Promise.resolve(DNS[h] ?? []) };

async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", ...(session ? { "x-dela-session": session } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
async function worker(times = 6) {
  for (let i = 0; i < times; i++) {
    await pool.query("update jobs set run_at = now() where status in ('queued', 'delayed') and kind = 'webhook_send'");
    await handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
  }
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];

const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(k: number, plan: string): Promise<M> {
  const bd = 7_700_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Rev " + k, `rev${bd}@test.invalid`])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}

let att: M, att2: M, fl: M, fl2: M, team: M;
let org = "", pb = "", ag = "", agOpen = "", gig = "";
async function engagement(f: M, status: string, tag: string): Promise<{ ag: string; gig: string }> {
  const g = (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id)
    values ($1, $2, $3, 1, $4, '{"task":"Filing","practice_area":"Family law"}', 30000, 90000, 'filled', now(), now() + interval '14 days', $5) returning id`, [org, att.id, pb, "Review gig " + tag, "rg" + tag + RUN])).id;
  const pr = (await one("insert into proposals (gig_id, freelancer_id, status, price_cents, sent_at) values ($1, $2, 'selected', 50000, now()) returning id", [g, f.id])).id;
  const a = (await one(`insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status, completed_at)
    values ($1, $2, $3, $4, $5, 50000, $6, case when $6 = 'completed' then now() end) returning id`, [g, pr, org, att.id, f.id, status])).id;
  return { ag: a, gig: g };
}
const GOOD_F = { quality: 5, deadlines: 4, communication: 5, followed_playbook: 5 };
const GOOD_A = { instructions: 5, timely_review: 5, fair_changes: 4, communication: 5 };

Deno.test("helpers: private addresses, URL checks, signatures, the safety answer and ratings", async () => {
  for (const ip of ["10.1.2.3", "127.0.0.1", "169.254.169.254", "172.20.0.1", "192.168.1.1", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) assert(isPrivateIp(ip), ip);
  for (const ip of ["93.184.216.34", "8.8.8.8", "2606:4700::1111"]) assert(!isPrivateIp(ip), ip);
  // Launch review 2026-11-10, item 6: an internal address written another way got through
  for (const ip of ["::ffff:7f00:1", "::ffff:a9fe:a9fe", "0:0:0:0:0:ffff:127.0.0.1", "0:0:0:0:0:ffff:0a00:0001", "::0001", "0:0:0:0:0:0:0:1", "::7f00:1", "64:ff9b::a9fe:a9fe", "2002:7f00:1::", "[::ffff:c0a8:101]", "fe80::1%eth0", "not:an:address"]) assert(isPrivateIp(ip), ip);
  for (const ip of ["2606:4700:4700::1111", "::ffff:5db8:d822", "2a00:1450:4001:81b::200e"]) assert(!isPrivateIp(ip), ip);
  const r = (h: string) => Promise.resolve(DNS[h] ?? []);
  assertEquals((await checkUrl("http://hooks.example.com/x", r)).ok, false);
  assertEquals(await checkUrl("https://localhost/x", r), { ok: false, reason: "private_address" });
  assertEquals(await checkUrl("https://169.254.169.254/latest/meta-data", r), { ok: false, reason: "private_address" });
  assertEquals(await checkUrl("https://sneaky.example.com/x", r), { ok: false, reason: "private_address" }, "a name that points inside a network (test T15)");
  assertEquals(await checkUrl("https://nowhere.example.com/x", r), { ok: false, reason: "address_not_found" });
  assertEquals(await checkUrl("https://hooks.example.com:8443/x", r), { ok: false, reason: "port_not_allowed" });
  assertEquals((await checkUrl("https://hooks.example.com/x", r)).ok, true);
  const h = await signatureHeader("{}", ["whsec_a", "whsec_old"]);
  assert(await verifySignature("{}", h, "whsec_a") && await verifySignature("{}", h, "whsec_old"), "both secrets work during the change");
  assertEquals(await verifySignature("{ }", h, "whsec_a"), false);
  assertEquals(await verifySignature("{}", await signatureHeader("{}", ["whsec_a"], Math.floor(Date.now() / 1000) - 3600), "whsec_a"), false, "old notices fail the time window");
  assertEquals(readSafety('{"hold": true, "kinds": ["threat"]}'), { hold: true, kinds: ["threat"] });
  assertEquals(readSafety('{"hold": true, "kinds": ["negative"]}').hold, false, "being negative is not a reason to hold");
  assertEquals(readRatings("of_freelancer", GOOD_F), GOOD_F);
  assertEquals(readRatings("of_freelancer", { ...GOOD_F, quality: 6 }), null);
});

Deno.test("setup", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  await pool.query("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'engagements', 'reviews', 'past_client_reviews', 'bench', 'bench_suggestions', 'member_webhooks', 'gig_chat', 'conduct_review', 'worker', 'profiles', 'ai_generation')");
  await pool.query("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
  att = await member(1, "att_pro"); att2 = await member(2, "att_business"); fl = await member(3, "fl_free"); fl2 = await member(4, "fl_plus"); team = await member(5, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'reviewer')", [team.id]);
  await pool.query("insert into member_profiles (person_id, side, body, missing, score) values ($1, 'attorney', '{\"firm_name\":\"Review Legal\"}', '{}', 100)", [att.id]);
  for (const f of [fl, fl2]) {
    await pool.query("insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) values ($1, 'freelancer', $2, '{}', 100, now())", [f.id, { first_name: "Fran" + f.bd % 10, last_name: "R", practice_areas: ["Family law"] }]);
    await pool.query("select dela_profile_refresh($1, 'freelancer')", [f.id]);
  }
  org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  pb = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, practice_area, request_id, created_by) values ($1, 'Filing', 'approved', 1, 1, 100, 'Family law', 'rv1', $2) returning id`, [org, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb, { title: "Filing", steps: [{ text: "a" }] }, att.id]);
  const done = await engagement(fl, "completed", "a");
  ag = done.ag; gig = done.gig;
  agOpen = (await engagement(fl2, "active", "b")).ag;
});

Deno.test("reviews: only completed engagements; every question rated; client information stopped; negative reviews publish; threats held", async () => {
  assertEquals((await call("POST", "/reviews/save", att.token, { agreement_id: agOpen, ratings: GOOD_F, would_again: true, body: "Great work on the filing." })).body.reason, "not_completed", "only completed Lawfecta engagements count");
  assertEquals((await call("POST", "/reviews/save", fl2.token, { agreement_id: ag, ratings: GOOD_A, would_again: true, body: "Clear instructions." })).body.reason, "not_found", "not their engagement");
  assertEquals((await call("POST", "/reviews/save", att.token, { agreement_id: crypto.randomUUID(), ratings: GOOD_F, would_again: true, body: "Clear instructions." })).body.reason, "not_found");
  assertEquals((await call("POST", "/reviews/save", att.token, { agreement_id: ag, ratings: { quality: 5 }, would_again: true, body: "Great work on the filing." })).body.reason, "rate_every_question");
  assertEquals((await call("POST", "/reviews/save", att.token, { agreement_id: ag, ratings: GOOD_F, body: "Great work on the filing." })).body.reason, "say_would_again");
  assertEquals((await call("POST", "/reviews/save", att.token, { agreement_id: ag, ratings: GOOD_F, would_again: true, body: "Client John Smith SSN 123-45-6789 was happy." })).body.reason, "looks_like_client_info", "client information is sent back to remove");
  const st = (await call("GET", "/reviews/state?agreement=" + ag, att.token)).body;
  assertEquals([st.can_write, st.direction, st.questions.length], [true, "of_freelancer", 4]);
  // A harsh, negative review publishes straight away (test T18)
  const neg = (await call("POST", "/reviews/save", att.token, { agreement_id: ag, ratings: { quality: 1, deadlines: 1, communication: 2, followed_playbook: 1 }, would_again: false,
    body: "Missed every deadline and the draft needed a full rewrite. Would not hire again.", request_id: "r1" })).body;
  assertEquals([neg.ok, neg.status], [true, "published"], JSON.stringify(neg));
  assertEquals((await call("POST", "/reviews/save", att.token, { agreement_id: ag, ratings: GOOD_F, would_again: true, body: "Changed my mind.", request_id: "r1" })).body.duplicate, true, "two clicks save once");
  const n = (await one("select count(*)::int n from notifications where person_id = $1 and kind = 'review'", [fl.id])).n;
  assert(n >= 1, "the freelancer is told");
  // The freelancer's review of the attorney: a threat is held for the team
  const held = (await call("POST", "/reviews/save", fl.token, { agreement_id: ag, ratings: GOOD_A, would_again: false, body: "If you post that again I will hurt you.", request_id: "f1" })).body;
  assertEquals([held.ok, held.status], [true, "held"]);
  const venmo = (await call("POST", "/reviews/save", fl.token, { agreement_id: ag, ratings: GOOD_A, would_again: true, body: "Great attorney, next time just pay me on Venmo.", request_id: "f2" })).body;
  assertEquals(venmo.status, "held", "an edit with payment outside Lawfecta is held too");
});

Deno.test("edits, responses, reports and the team's decisions; history kept", async () => {
  const r = (await one("select id from reviews where agreement_id = $1 and direction = 'of_freelancer'", [ag])).id;
  const ed = (await call("POST", "/reviews/save", att.token, { agreement_id: ag, ratings: { quality: 2, deadlines: 1, communication: 2, followed_playbook: 2 }, would_again: false,
    body: "Missed every deadline. The draft improved after changes.", request_id: "r2" })).body;
  assertEquals([ed.ok, ed.edited], [true, true]);
  assertEquals((await one("select count(*)::int n from review_versions where review_id = $1", [r])).n, 1, "the earlier version is kept");
  let refused = false;
  try { await pool.query("delete from review_versions where review_id = $1", [r]); } catch { refused = true; }
  assert(refused, "review history is append-only");
  // The freelancer responds once, publicly
  assertEquals((await call("POST", "/reviews/respond", att.token, { review_id: r, body: "Not mine to answer" })).body.reason, "not_found", "only the person reviewed responds");
  assertEquals((await call("POST", "/reviews/respond", fl.token, { review_id: r, body: "Thank you. The deadlines moved twice after we started." })).body.ok, true);
  const of = (await call("GET", `/reviews/of?person=${fl.id}&side=freelancer`, att2.token)).body;
  assertEquals([of.count, of.averages, of.reviews[0].response, of.reviews[0].edited], [1, null, "Thank you. The deadlines moved twice after we started.", true], "averages wait for 3 reviews; the response shows");
  assertEquals(of.reviews[0].by, "Review Legal");
  assert(of.reviews[0].practice_area === "Family law" && !JSON.stringify(of).includes("Review gig"), "the month and practice area, never the matter");
  // A report: the team keeps a negative opinion up, with a reason
  assertEquals((await call("POST", "/reviews/report", fl.token, { review_id: r, reason: "" })).body.reason, "say_why");
  const rep = (await call("POST", "/reviews/report", fl.token, { review_id: r, reason: "It is unfair to me." })).body;
  assertEquals(rep.ok, true);
  assertEquals((await call("POST", "/reviews/report", att2.token, { review_id: r, reason: "x" })).body.reason, "not_found", "only the two people report");
  const adm = (await call("GET", "/admin/reviews", team.token)).body.data;
  assert(adm.reports.some((x: any) => x.id === rep.id) && adm.held.length >= 1);
  assertEquals((await call("GET", "/admin/reviews", fl.token)).status, 403);
  assertEquals((await call("POST", "/admin/reviews/decide", team.token, { kind: "report", id: rep.id, action: "keep", note: "" })).body.data.reason, "say_why");
  assertEquals((await call("POST", "/admin/reviews/decide", team.token, { kind: "report", id: rep.id, action: "keep", note: "An honest negative opinion stays up." })).body.data.ok, true);
  assertEquals((await one("select status from reviews where id = $1", [r])).status, "published");
  // The held review is removed with a reason; the writer appeals once; the team reverses or upholds
  const h = (await one("select id from reviews where agreement_id = $1 and direction = 'of_attorney'", [ag])).id;
  assertEquals((await call("POST", "/admin/reviews/decide", team.token, { kind: "held", id: h, action: "remove", note: "A threat and a plan to pay outside Lawfecta." })).body.data.ok, true);
  assertEquals((await call("POST", "/reviews/appeal", fl.token, { review_id: h, text: "I was upset; I meant it as a joke." })).body.ok, true);
  assertEquals((await call("POST", "/reviews/appeal", fl.token, { review_id: h, text: "Again" })).body.reason, "already_appealed");
  assertEquals((await call("POST", "/admin/reviews/decide", team.token, { kind: "appeal", id: h, action: "uphold", note: "Threats are never published." })).body.data.ok, true);
  assertEquals((await one("select count(*)::int n from review_moderation where review_id = $1", [h])).n >= 3, true, "every decision and its reason is kept");
  // Edits stop after the edit window
  await pool.query("update reviews set created_at = now() - interval '15 days' where id = $1", [r]);
  assertEquals((await call("POST", "/reviews/save", att.token, { agreement_id: ag, ratings: GOOD_F, would_again: true, body: "Changed my mind entirely.", request_id: "r3" })).body.reason, "edit_time_over");
});

Deno.test("past clients: limits, a separate section never in the averages, bar number checks, opting out", async () => {
  assertEquals((await call("POST", "/reviews/past/request", att.token, { name: "Pat", email: "pat@lawfirm.example" })).status, 403);
  assertEquals((await call("POST", "/reviews/past/request", fl.token, { name: "Pat", email: "not-an-email" })).body.reason, "bad_email");
  const first = (await call("POST", "/reviews/past/request", fl.token, { name: "Pat Past", email: "pat@lawfirm.example" })).body;
  assertEquals(first.ok, true, JSON.stringify(first));
  assertEquals((await call("POST", "/reviews/past/request", fl.token, { name: "Pat Past", email: "PAT@lawfirm.example" })).body.reason, "asked_recently");
  const mail = await one("select to_email, link, body from notifications where kind = 'past_review' and to_email = 'pat@lawfirm.example'");
  assert(mail.body.includes("There is no reward") && mail.link.startsWith("/dela?past_review="), "neutral wording, a link to the public page");
  const t = mail.link.split("=")[1];
  assertEquals((await call("GET", "/public/past-review?t=nope", "")).body.reason, "link_not_valid");
  const g = (await call("GET", "/public/past-review?t=" + t, "")).body;
  assertEquals([g.ok, g.your_name], [true, "Pat Past"], "no Lawfecta login needed");
  const base = { t, name: "Pat Past", state: "TX", bar_number: "24012345", ratings: GOOD_F, would_again: true, body: "Excellent paralegal work over two years.", confirm: true };
  assertEquals((await call("POST", "/public/past-review", "", { ...base, bar_number: "x" })).body.reason, "bad_bar_number");
  assertEquals((await call("POST", "/public/past-review", "", { ...base, state: "Texas" })).body.reason, "bad_state");
  assertEquals((await call("POST", "/public/past-review", "", { ...base, confirm: false })).body.reason, "confirm_needed");
  assertEquals((await call("POST", "/public/past-review", "", base)).body.ok, true);
  assertEquals((await call("POST", "/public/past-review", "", base)).body.duplicate, true, "submitted once");
  assertEquals((await call("GET", "/public/past-review?t=" + t, "")).body.reason, "already_reviewed");
  const of = (await call("GET", `/reviews/of?person=${fl.id}&side=freelancer`, att2.token)).body;
  assertEquals([of.count, of.past_clients.length, of.past_clients[0].by], [1, 1, "Pat Past"], "past-client reviews show separately and are not counted");
  // Opting out stops every request to that address
  await call("POST", "/reviews/past/request", fl.token, { name: "Opt Out", email: "optout@lawfirm.example" });
  const t2 = (await one("select link from notifications where to_email = 'optout@lawfirm.example'")).link.split("=")[1];
  assertEquals((await call("POST", "/public/past-review/optout", "", { t: t2 })).body.ok, true);
  assertEquals((await call("POST", "/reviews/past/request", fl2.token, { name: "Opt Out", email: "optout@lawfirm.example" })).body.reason, "opted_out", "no other freelancer can ask either");
  // The monthly limit
  for (let i = 0; i < 3; i++) assertEquals((await call("POST", "/reviews/past/request", fl.token, { name: "Client " + i, email: `c${i}@lawfirm.example` })).body.ok, true);
  assertEquals((await call("POST", "/reviews/past/request", fl.token, { name: "One more", email: "c9@lawfirm.example" })).body.reason, "limit_reached");
});

Deno.test("the bench: invite, accept, a conversation without files that outlives the project thread, leave; firm bench for Business only", async () => {
  assertEquals((await call("POST", "/bench/invite", att.token, { freelancer: fl.id, kind: "firm" })).body.reason, "firm_bench_business_only");
  assertEquals((await call("POST", "/bench/invite", att.token, { freelancer: fl.id, note: "Text me at 512-555-0199" })).body.reason, "keep_on_lawfecta");
  assertEquals((await call("POST", "/bench/invite", fl.token, { freelancer: fl2.id })).status, 403);
  const inv = (await call("POST", "/bench/invite", att.token, { freelancer: fl.id, note: "Thank you for the filing work." })).body;
  assertEquals(inv.ok, true, JSON.stringify(inv));
  assertEquals((await call("POST", "/bench/invite", att.token, { freelancer: fl.id })).body.duplicate, true);
  assertEquals((await call("POST", "/bench/answer", fl2.token, { id: inv.id, accept: true })).body.reason, "not_found");
  const acc = (await call("POST", "/bench/answer", fl.token, { id: inv.id, accept: true })).body;
  assert(acc.ok && acc.thread_id, JSON.stringify(acc));
  const bench = (await call("GET", "/bench", att.token)).body;
  const me = bench.items.find((x: any) => x.id === inv.id);
  assertEquals([me.status, me.available, me.reviews.count], ["active", true, 1], "availability and the review summary on the bench");
  // The bench conversation: messages yes, files no
  const sent = (await call("POST", "/threads/send", att.token, { thread_id: acc.thread_id, body: "A new filing may come up next week.", request_id: "b1" })).body;
  assertEquals(sent.ok, true, JSON.stringify(sent));
  assertEquals((await call("POST", "/threads/send", att.token, { thread_id: acc.thread_id, body: "Here is a file", attachments: [crypto.randomUUID()], request_id: "b2" })).body.reason, "bench_no_files");
  const inbox = (await call("GET", "/threads", fl.token)).body;
  assert(inbox.threads.some((x: any) => x.id === acc.thread_id && x.kind === "bench" && x.unread === 1), JSON.stringify(inbox.threads));
  // The project thread is read only after completion (test T09); the bench conversation stays open
  const pt = (await call("POST", "/threads/open", att.token, { gig_id: gig, freelancer: fl.id })).body;
  assertEquals((await call("POST", "/threads/send", att.token, { thread_id: pt.id, body: "One more thing on the old matter", request_id: "p1" })).body.reason, "project_closed");
  assertEquals((await call("POST", "/threads/send", fl.token, { thread_id: acc.thread_id, body: "Happy to help next week.", request_id: "b3" })).body.ok, true);
  assertEquals((await call("GET", "/threads/get?id=" + crypto.randomUUID(), att.token)).body.reason, "not_found", "a made-up thread is refused");
  // A bench suggestion when a fitting gig is posted, then snooze
  const g2 = (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, request_id)
    values ($1, $2, $3, 1, 'Another filing', '{"task":"Filing","practice_area":"Family law"}', 30000, 90000, 'draft', $4) returning id`, [org, att.id, pb, "rg2" + RUN])).id;
  await pool.query("update gigs set status = 'open', opened_at = now(), closes_at = now() + interval '14 days' where id = $1", [g2]);
  const sug = (await call("GET", "/bench", att.token)).body.suggestions;
  const s1 = sug.find((x: any) => x.gig_id === g2);
  assert(s1 && s1.reason.includes("works in Family law"), JSON.stringify(sug));
  const gb = (await call("GET", "/gigs/bench?id=" + g2, att.token)).body;
  assertEquals([gb.bench.length, gb.bench[0].why_not], [1, ""], "invite from the bench on the gig");
  assertEquals((await call("POST", "/bench/suggestion", att.token, { id: s1.id, action: "snooze" })).body.ok, true);
  assertEquals((await call("GET", "/bench", att.token)).body.suggestions.length, 0);
  // Leaving closes the conversation; paid records stay
  assertEquals((await call("POST", "/bench/end", att2.token, { id: inv.id })).body.reason, "not_found");
  assertEquals((await call("POST", "/bench/end", fl.token, { id: inv.id })).body.ok, true);
  assertEquals((await call("POST", "/threads/send", att.token, { thread_id: acc.thread_id, body: "Are you there?", request_id: "b4" })).body.reason, "bench_ended");
  assertEquals((await one("select status from agreements where id = $1", [ag])).status, "completed");
  // A Business firm has a firm bench; owners invite
  await pool.query("insert into member_profiles (person_id, side, body, missing, score) values ($1, 'attorney', '{\"firm_name\":\"Big Firm\"}', '{}', 100)", [att2.id]);
  // Step 18: a bench invitation needs a completed engagement between the two (att2 and fl2 have none; att's active one with fl2 does not count)
  assertEquals((await call("POST", "/bench/invite", att2.token, { freelancer: fl2.id, kind: "firm" })).body.reason, "needs_completed_gig");
  assertEquals((await call("POST", "/bench/invite", att.token, { freelancer: fl2.id })).body.reason, "needs_completed_gig", "an engagement still running does not unlock the bench");
  assertEquals(await rpc("dela_worked_together", { p_attorney: att.id, p_freelancer: fl.id }), true);
  // A refund on the completed engagement takes the right away again
  const dsp = (await one("insert into disputes (agreement_id, opened_by, reason, status, notice_ends_at, refund_cents) values ($1, $2, 'test', 'resolved', now(), 100) returning id", [ag, att.id])).id;
  assertEquals(await rpc("dela_worked_together", { p_attorney: att.id, p_freelancer: fl.id }), false, "a refunded engagement does not count");
  await pool.query("delete from disputes where id = $1", [dsp]);
  assertEquals(((await rpc("dela_worked_with", { p_person: att.id })) as Array<Record<string, unknown>>).map((x) => x.person_id), [fl.id], "the list of freelancers an attorney finished work with");
  // The rule is a setting: with it off, the earlier behavior
  await pool.query("update settings set value = 'false' where key = 'bench.require_completed'");
  assertEquals((await call("POST", "/bench/invite", att2.token, { freelancer: fl2.id, kind: "firm" })).body.ok, true);
  await pool.query("update settings set value = 'true' where key = 'bench.require_completed'");
});

Deno.test("webhooks: safe addresses only, the plan's limit, signed notices, retries, pausing, and events from DELA", async () => {
  assertEquals((await call("POST", "/webhooks/add", fl.token, { url: "http://hooks.example.com/dela", events: ["bench.invited"] })).body.reason, "https_only");
  assertEquals((await call("POST", "/webhooks/add", fl.token, { url: "https://sneaky.example.com/dela", events: ["bench.invited"] })).body.reason, "private_address", "test T15");
  assertEquals((await call("POST", "/webhooks/add", fl.token, { url: "https://hooks.example.com/dela", events: ["gig.posted"] })).body.reason, "choose_events", "attorney events are not on the freelancer side");
  const add = (await call("POST", "/webhooks/add", fl.token, { url: "https://hooks.example.com/dela", events: ["bench.invited", "review.received"], request_id: "w1" })).body;
  assert(add.ok && String(add.secret).startsWith("whsec_"), JSON.stringify(add));
  assertEquals((await call("POST", "/webhooks/add", fl.token, { url: "https://hooks.example.com/dela", events: ["bench.invited"], request_id: "w1" })).body.duplicate, true);
  assertEquals((await call("POST", "/webhooks/add", fl.token, { url: "https://hooks.example.com/two", events: ["bench.invited"], request_id: "w2" })).body.reason, "limit_reached", "Free plan: 1 endpoint");
  const list = (await call("GET", "/webhooks", fl.token)).body;
  assertEquals([list.limit, list.endpoints.length, list.endpoints[0].secret_last4], [1, 1, add.secret.slice(-4)]);
  assert(!JSON.stringify(list).includes(add.secret), "the secret is never shown again");
  // A test notice, signed with the secret
  const t = (await call("POST", "/webhooks/test", fl.token, { id: add.id })).body;
  assertEquals([t.sent, t.code], [true, 200], JSON.stringify(t));
  const got = received.at(-1)!;
  assert(await verifySignature(got.body, got.headers.get("dela-signature") ?? "", add.secret), "the member can check the signature");
  const ev = JSON.parse(got.body);
  assertEquals([ev.type, ev.schema_version, got.headers.get("dela-event-id")], ["test", 1, ev.id]);
  // An event from DELA: an attorney invites the freelancer to a bench; the worker sends it
  await call("POST", "/bench/invite", att.token, { freelancer: fl.id, note: "Welcome back" });
  await worker();
  const benchEv = received.map((x) => JSON.parse(x.body)).find((x) => x.type === "bench.invited");
  assert(benchEv && benchEv.data.link.includes("/dela?tab=work") && !JSON.stringify(benchEv).includes("Welcome back"), "small payload: no note text, a link back");
  // Changing the secret: the old one works for a while
  const rot = (await call("POST", "/webhooks/change", fl.token, { id: add.id, action: "rotate" })).body;
  await call("POST", "/webhooks/test", fl.token, { id: add.id });
  const last = received.at(-1)!;
  assert(await verifySignature(last.body, last.headers.get("dela-signature") ?? "", rot.secret) && await verifySignature(last.body, last.headers.get("dela-signature") ?? "", add.secret));
  // A Business attorney with an endpoint that is down: retries, then pauses after the set failures
  const bad = (await call("POST", "/webhooks/add", att2.token, { url: "https://down.example.com/dela", events: ["bench.accepted"], request_id: "w3" })).body;
  const t2 = (await call("POST", "/webhooks/test", att2.token, { id: bad.id })).body;
  assertEquals([t2.sent, t2.status], [false, "retry"]);
  const d = await one("select attempts, status from webhook_deliveries where endpoint_id = $1", [bad.id]);
  assertEquals([d.attempts, d.status], [1, "pending"]);
  await pool.query("update webhook_endpoints set failures = 18 where id = $1", [bad.id]);
  await worker(1);
  assertEquals((await one("select status, paused_reason from webhook_endpoints where id = $1", [bad.id])).status, "paused");
  assert((await one("select count(*)::int n from notifications where person_id = $1 and kind = 'webhook'", [att2.id])).n >= 1, "the member is told");
  assertEquals((await call("POST", "/webhooks/change", att2.token, { id: bad.id, action: "resume" })).body.ok, true);
  // Redirects are not followed
  const red = (await call("POST", "/webhooks/add", att2.token, { url: "https://redirect.example.com/dela", events: ["bench.accepted"], request_id: "w4" })).body;
  assertEquals((await call("POST", "/webhooks/test", att2.token, { id: red.id })).body.error, "redirects_not_followed");
  // A name that later points inside a network is refused at delivery too
  DNS["redirect.example.com"] = ["127.0.0.1"];
  assertEquals((await call("POST", "/webhooks/test", att2.token, { id: red.id })).body.error, "private_address");
  // Deleting stops pending notices; someone else's endpoint is refused
  assertEquals((await call("POST", "/webhooks/change", att.token, { id: add.id, action: "delete" })).body.reason, "not_found");
  assertEquals((await call("POST", "/webhooks/change", fl.token, { id: add.id, action: "delete" })).body.ok, true);
  assertEquals((await call("GET", "/webhooks", fl.token)).body.endpoints.length, 0);
});

Deno.test("the connector reads reviews and the bench", async () => {
  // Exercised through the same functions the connector uses
  const r = await rpc("dela_reviews_of", { p_viewer: fl.id, p_subject: fl.id, p_side: "freelancer" }) as Record<string, any>;
  assertEquals(r.count, 1);
  const b = await rpc("dela_bench", { p_person: att.id, p_side: "attorney" }) as Record<string, any>;
  assert(b.items.length >= 1);
});

Deno.test("teardown", async () => { await pool.end(); });

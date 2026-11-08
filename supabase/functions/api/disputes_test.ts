// Step 11 API tests: the dispute center (docs/briefs/step-11-disputes.md). Open with what went wrong and what the opener
// wants; the other side answers; settlement offers move the money at once; an unanswered dispute is granted at the end of
// the notice period; the team decides the rest with a drafted decision; the money tools; misuse. Run after tools/dbtest.sh:
//   deno test -A supabase/functions/api/disputes_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { casePrompt, readDraft, readSuggest, readSummary } from "./lib/disputes/ai.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "D".repeat(40); // rules-ok: a made-up test key
const STRIPE_TEST = "sk_test_" + "d".repeat(24); // rules-ok: a made-up test key
const env: Record<string, string> = { OPENAI_API_KEY: LAWFECTA, DELA_ORIGINS: "https://lawfecta.com", STRIPE_SECRET_KEY: STRIPE_TEST };
const stripeCalls: Array<{ path: string; body: string; idem: string }> = [];
let aiSeen = "";
let n = 0;
const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("https://api.stripe.com/v1")) {
    const path = new URL(url).pathname.slice(3);
    stripeCalls.push({ path, body: String(init.body ?? ""), idem: new Headers(init.headers).get("idempotency-key") ?? "" });
    if (path === "/refunds") return Response.json({ id: "re_" + (++n) });
    if (path === "/transfers") return Response.json({ id: "tr_" + (++n) });
    return Response.json({ error: { message: "no such route" } }, { status: 404 });
  }
  if (url.endsWith("/chat/completions")) {
    const body = JSON.parse(String(init.body));
    const system = String(body.messages[0].content);
    aiSeen = String(body.messages.at(-1).content);
    let out: unknown = {};
    if (system.includes("Summarize both sides")) out = { summary: "The attorney says the exhibit list is missing; the freelancer says it was sent.", agreed: ["The petition draft arrived"], open: ["The exhibit list"] };
    else if (system.includes("Suggest a fair settlement")) out = { release_cents: 20000, why: "The draft arrived; the exhibit list is open." };
    else if (system.includes("draft a decision")) out = { summary: "Half delivered.", terms: ["Deliverables: petition draft; exhibit list"], release_cents: 15000, why: "One of two deliverables.", note: "Half to each side." };
    else if (body.response_format) out = { client_info: false, kinds: [] };
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
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(k: number, plan: string): Promise<M> {
  const bd = 7_900_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name) values ($1, $2) returning id", [bd, "Disp " + k])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
let att: M, fl: M, other: M, team: M, financeLess: M;
let org = "", pb = "";
// A signed, paid engagement with two milestones of $300 each (freelancer fee $20 each), straight into the database
async function paidEngagement(tag: string): Promise<{ ag: string; m1: string; m2: string }> {
  const gig = (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id)
    values ($1, $2, $3, 1, $4, '{"task":"Prepare the filing packet"}', 30000, 90000, 'filled', now(), now() + interval '14 days', $5) returning id`, [org, att.id, pb, "Disputed packet " + tag, "dg" + tag + RUN])).id;
  const prop = (await one(`insert into proposals (gig_id, freelancer_id, status, price_cents, included, schedule, days_to_deliver, sent_at) values ($1, $2, 'selected', 60000, 'Petition draft; Exhibit list', 'A week', 7, now()) returning id`, [gig, fl.id])).id;
  const ag = (await one("insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status, signed_at) values ($1, $2, $3, $4, $5, 60000, 'active', now()) returning id", [gig, prop, org, att.id, fl.id])).id;
  const ids: string[] = [];
  for (const seq of [1, 2]) {
    const m = (await one(`insert into milestones (agreement_id, seq, title, amount_cents, freelancer_fee_cents, due_date, deliverables, status, funded_at, from_version)
      values ($1, $2, $3, 30000, 2000, current_date + 7, 'Petition draft; Exhibit list', 'funded', now(), 1) returning id`, [ag, seq, "Part " + seq])).id;
    await pool.query(`insert into payments (agreement_id, milestone_id, kind, amount_cents, fee_cents, status, provider_ref, idem_key) values ($1, $2, $3, 30000, $4, 'succeeded', $5, $6)`,
      [ag, m, seq === 1 ? "start" : "milestone", seq === 1 ? 1500 : 0, "pi_" + tag + seq + RUN, "pay:" + tag + seq + RUN]);
    ids.push(m);
  }
  return { ag, m1: ids[0], m2: ids[1] };
}
const caseOf = async (who: M, ag: string) => (await call("GET", "/disputes/case?agreement=" + ag, who.token)).body;
const tick = (d: string, kind: string) => rpc("dela_dispute_tick", { p: { dispute_id: d, kind } });

Deno.test("the AI readers: neutral words only, an offer inside the milestone amount, never a ruling", () => {
  assertEquals(readSuggest({ release_cents: 40000, why: "x" }, 30000), null, "more than the milestone is refused");
  assertEquals(readSuggest({ release_cents: -1 }, 30000), null);
  assertEquals(readSuggest({ release_cents: 12000, why: "Part delivered" }, 30000), { release_cents: 12000, refund_cents: 18000, why: "Part delivered" });
  assertEquals(readSuggest({ release_cents: 12000, why: "The freelancer is legally liable" }, 30000)!.why, "", "ruling words are dropped");
  assertEquals(readSummary({ summary: "" }), null);
  assertEquals(readDraft({ release_cents: 30000, summary: "s", terms: ["a", "b"], why: "w", note: "n" }, 30000)!.refund_cents, 0);
  const p = casePrompt({ category: "not_as_agreed", opened_by_role: "attorney", wants: "refund", wants_release_cents: 0, milestone: { title: "Part 1", amount_cents: 30000, deliverables: "Petition draft" },
    statements: [{ role: "attorney", kind: "opening", body: "Missing exhibits" }], evidence: [{ role: "freelancer", label: "Delivery email" }], offers: [] });
  assert(p.includes("Opened by the attorney") && p.includes("$300.00") && p.includes("Delivery email") && !p.includes("Disp "), "roles, money and links; never names");
});

Deno.test("setup: an attorney, a freelancer, another member and the Lawfecta Team; the switches on", async () => {
  att = await member(1, "att_pro"); fl = await member(2, "fl_pro"); other = await member(3, "fl_pro"); team = await member(4, "att_free"); financeLess = await member(5, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'owner'), ($1, 'finance'), ($2, 'support')", [team.id, financeLess.id]);
  org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  pb = (await one("insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ($1, 'Packet', 'approved', 1, 1, 100, $2, $3) returning id", [org, "dpb" + RUN, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, '{\"title\":\"Packet\",\"steps\":[{\"text\":\"Draft\"}]}', $2)", [pb, att.id]);
  await pool.query("update feature_switches set state = 'everyone' where key in ('dispute_center', 'ai_helpers', 'engagements', 'ai_generation')");
  await pool.query("insert into payout_accounts (person_id, provider, account_ref, status) values ($1, 'stripe', 'acct_d1', 'ready') on conflict (person_id) do update set status = 'ready', account_ref = 'acct_d1'", [fl.id]);
});

Deno.test("open: what went wrong and what the opener wants; only a paid milestone; one at a time; the answer timer starts", async () => {
  const e = await paidEngagement("a");
  const base = { id: e.ag, milestone_id: e.m1, reason: "The exhibit list was not delivered", category: "not_delivered", wants: "refund" };
  assertEquals((await call("POST", "/disputes/open", other.token, base)).body.reason, "not_found", "a stranger cannot open one");
  assertEquals((await call("POST", "/disputes/open", att.token, { ...base, category: "x" })).body.reason, "pick_category");
  assertEquals((await call("POST", "/disputes/open", att.token, { ...base, wants: "release" })).body.reason, "pick_wants", "an attorney does not ask to release");
  assertEquals((await call("POST", "/disputes/open", att.token, { ...base, wants: "split", release_cents: 30000 })).body.reason, "split_amount");
  await pool.query("update milestones set status = 'pending' where id = $1", [e.m2]);
  assertEquals((await call("POST", "/disputes/open", att.token, { ...base, milestone_id: e.m2 })).body.reason, "milestone_not_paid");
  await pool.query("update milestones set status = 'funded' where id = $1", [e.m2]);
  const o = (await call("POST", "/disputes/open", att.token, base)).body;
  assert(o.ok, JSON.stringify(o));
  assertEquals((await call("POST", "/disputes/open", fl.token, { ...base, wants: "release" })).body.duplicate, true, "one open dispute per engagement");
  const d = await one("select status, category, wants, wants_release_cents, answer_due_at > now() + interval '4 days' due from disputes where id = $1", [o.id]);
  assertEquals([d.status, d.category, d.wants, d.wants_release_cents, d.due], ["notice", "not_delivered", "refund", 0, true]);
  assertEquals((await one("select status from milestones where id = $1", [e.m1])).status, "disputed");
  assertEquals(Number((await one("select count(*) n from jobs where kind = 'dispute_tick' and payload->>'dispute_id' = $1", [o.id])).n), 4, "answer due, two reminders, notice end");
  assert((await one("select 1 x from audit_log where action = 'dispute_opened' and object_id = $1", [o.id])), "opening is in the audit log");
  const c = await caseOf(fl, e.ag);
  assertEquals([c.role, c.disputes[0].opened_by_role, c.disputes[0].statements.length], ["freelancer", "attorney", 1]);
});

Deno.test("settle it yourselves: the other side answers and offers; the opener accepts; the money moves at once and the attorney's fee is kept", async () => {
  const e = await paidEngagement("b");
  const id = (await call("POST", "/disputes/open", att.token, { id: e.ag, milestone_id: e.m1, reason: "Only half was delivered", category: "not_as_agreed", wants: "split", release_cents: 10000 })).body.id;
  assertEquals((await call("POST", "/disputes/link", fl.token, { id, label: "Delivery email", url: "http://example.test/x" })).body.reason, "bad_link", "https only");
  assert((await call("POST", "/disputes/link", fl.token, { id, label: "Delivery email", url: "https://drive.example.test/file/1" })).body.ok);
  const say = (await call("POST", "/disputes/say", fl.token, { id, body: "I delivered the draft and most of the exhibits.", wants: "split", release_cents: 25000 })).body;
  assertEquals(say.kind, "answer");
  assertEquals((await call("POST", "/disputes/offer", fl.token, { id, release_cents: 40000 })).body.reason, "split_amount", "an offer never goes past the milestone");
  const o1 = (await call("POST", "/disputes/offer", fl.token, { id, release_cents: 25000, note: "Most of it was done" })).body.id;
  const o2 = (await call("POST", "/disputes/offer", fl.token, { id, release_cents: 20000 })).body.id;
  assertEquals((await one("select status from dispute_offers where id = $1", [o1])).status, "replaced", "a newer offer replaces the sender's older one");
  assertEquals((await call("POST", "/disputes/offer/accept", fl.token, { id: o2 })).body.reason, "own_offer");
  assertEquals((await call("POST", "/disputes/offer/accept", att.token, { id: o1 })).body.reason, "offer_not_open");
  assertEquals((await call("POST", "/disputes/offer/accept", other.token, { id: o2 })).body.reason, "not_found");
  const acc = (await call("POST", "/disputes/offer/accept", att.token, { id: o2 })).body;
  assertEquals([acc.ok, acc.release_cents, acc.refund_cents], [true, 20000, 10000], JSON.stringify(acc));
  assertEquals((await call("POST", "/disputes/offer/accept", att.token, { id: o2 })).body.duplicate, true, "a second click changes nothing");
  const d = await one("select status, settled_by from disputes where id = $1", [id]);
  assertEquals([d.status, d.settled_by], ["resolved", "offer"]);
  const rf = await one("select amount_cents, status from refunds where milestone_id = $1", [e.m1]);
  assertEquals([rf.amount_cents, rf.status], [10000, "succeeded"], "the milestone part only, sent to Stripe at once");
  const po = await one("select amount_cents, fee_cents, status from payouts where milestone_id = $1", [e.m1]);
  assertEquals([po.amount_cents + po.fee_cents, po.fee_cents, po.status], [20000, 1333, "sent"], "the freelancer fee only on the part released");
  assertEquals(stripeCalls.filter((x) => x.path === "/refunds" && x.body.includes("pi_b1")).length, 1);
  assertEquals((await one("select status from milestones where id = $1", [e.m1])).status, "accepted");
  assertEquals((await call("POST", "/disputes/say", fl.token, { id, body: "One more thing" })).body.reason, "dispute_closed");
});

Deno.test("no answer: a warning on the answer day, then the request is granted at the end of notice; the old 14-day tick leaves it alone", async () => {
  const e = await paidEngagement("c");
  const id = (await call("POST", "/disputes/open", fl.token, { id: e.ag, milestone_id: e.m1, reason: "The work was delivered and not accepted", category: "not_accepted", wants: "release" })).body.id;
  await tick(id, "answer_due");
  assert((await one("select 1 x from notifications where dedupe_key like 'eng:dispwarn' || $1 || '%'", [id])), "the attorney is warned");
  await pool.query("update disputes set notice_ends_at = now() - interval '1 minute' where id = $1", [id]);
  await rpc("dela_engagement_tick", { p: { dispute_id: id, kind: "dispute_notice_end" } });
  assertEquals((await one("select status from disputes where id = $1", [id])).status, "notice", "the old tick does not send it to the team");
  const r = await tick(id, "notice_end") as Record<string, any>;
  assertEquals([r.ok, r.release_cents, r.refund_cents], [true, 30000, 0]);
  const d = await one("select status, settled_by from disputes where id = $1", [id]);
  assertEquals([d.status, d.settled_by], ["resolved", "auto"]);
  assertEquals((await one("select count(*)::int n from payouts where milestone_id = $1", [e.m1])).n, 1);
});

Deno.test("answered but not settled: the team reviews; questions pause the clock; the drafted decision; the team decides", async () => {
  const e = await paidEngagement("d");
  const id = (await call("POST", "/disputes/open", att.token, { id: e.ag, milestone_id: e.m1, reason: "The exhibit list is missing", category: "not_delivered", wants: "refund" })).body.id;
  assert((await call("POST", "/disputes/say", fl.token, { id, body: "It was sent with the draft." })).body.ok);
  await pool.query("update disputes set notice_ends_at = now() - interval '1 minute' where id = $1", [id]);
  await tick(id, "notice_end");
  const d = await one("select status, review_due_at > now() + interval '9 days' due from disputes where id = $1", [id]);
  assertEquals([d.status, d.due], ["team_review", true], "10 business days for the team");
  assertEquals((await call("GET", "/admin/disputes", fl.token)).status, 403, "members cannot see the queue");
  const q = (await call("GET", "/admin/disputes", team.token)).body.data;
  const row = q.disputes.find((x: { id: string }) => x.id === id);
  assertEquals([row.status, row.statements.length, row.milestone.amount_cents], ["team_review", 2, 30000]);
  assert((await call("POST", "/admin/disputes/ask", team.token, { id, to: "freelancer", body: "Please share the delivery email." })).body.data.ok);
  const fc = await caseOf(fl, e.ag), ac = await caseOf(att, e.ag);
  assert(fc.disputes[0].statements.some((s: { kind: string }) => s.kind === "question") && !ac.disputes[0].statements.some((s: { kind: string }) => s.kind === "question"), "only the person asked sees the question");
  assertEquals((await call("POST", "/disputes/say", fl.token, { id, body: "Here it is." })).body.kind, "reply");
  const draft = (await call("POST", "/admin/disputes/draft", team.token, { id })).body.data;
  assertEquals([draft.release_cents, draft.refund_cents], [15000, 15000], JSON.stringify(draft));
  assert(!aiSeen.includes("Disp "), "names never reach the AI");
  assertEquals((await call("POST", "/admin/disputes/resolve", team.token, { id, release_cents: 15000, refund_cents: 10000, note: "x" })).body.data.reason, "split_must_equal");
  const r = (await call("POST", "/admin/disputes/resolve", team.token, { id, release_cents: 15000, refund_cents: 15000, note: "Half was delivered." })).body.data;
  assert(r.ok, JSON.stringify(r));
  assertEquals((await one("select settled_by from disputes where id = $1", [id])).settled_by, "team");
});

Deno.test("members' AI help: summary and a suggested offer, labeled, inside the amount; off when the helpers switch is off", async () => {
  const e = await paidEngagement("e");
  const id = (await call("POST", "/disputes/open", att.token, { id: e.ag, milestone_id: e.m1, reason: "Exhibits missing", category: "not_delivered", wants: "refund" })).body.id;
  const s = (await call("POST", "/disputes/ai", fl.token, { id, agreement_id: e.ag, kind: "summary" })).body;
  assert(s.ok && s.summary.length > 0 && s.note.includes("not legal advice"), JSON.stringify(s));
  const g = (await call("POST", "/disputes/ai", att.token, { id, agreement_id: e.ag, kind: "suggest" })).body;
  assertEquals([g.release_cents, g.refund_cents], [20000, 10000]);
  assertEquals((await call("POST", "/disputes/ai", other.token, { id, agreement_id: e.ag, kind: "summary" })).body.reason, "not_found");
  await pool.query("update feature_switches set state = 'off' where key = 'ai_helpers'");
  assertEquals((await call("POST", "/disputes/ai", fl.token, { id, agreement_id: e.ag, kind: "summary" })).body.reason, "helpers_off");
  await pool.query("update feature_switches set state = 'everyone' where key = 'ai_helpers'");
});

Deno.test("only the disputed money is frozen: another milestone can be accepted and paid out while one is in dispute", async () => {
  const e = await paidEngagement("f");
  await call("POST", "/disputes/open", att.token, { id: e.ag, milestone_id: e.m1, reason: "Part one is wrong", category: "quality", wants: "refund" });
  const p2 = (await one("insert into payouts (milestone_id, agreement_id, person_id, amount_cents, fee_cents, status, idem_key) values ($1, $2, $3, 28000, 2000, 'pending', $4) returning id", [e.m2, e.ag, fl.id, "po:f2" + RUN])).id;
  const p1 = (await one("insert into payouts (milestone_id, agreement_id, person_id, amount_cents, fee_cents, status, idem_key) values ($1, $2, $3, 28000, 2000, 'pending', $4) returning id", [e.m1, e.ag, fl.id, "po:f1" + RUN])).id;
  const due = await rpc("dela_payouts_due", {}) as Array<Record<string, any>>;
  assert(due.some((x) => x.id === p2), "the other milestone's payout goes out");
  assert(!due.some((x) => x.id === p1), "the disputed milestone's payout waits");
  await pool.query("update payouts set status = 'held' where id in ($1, $2)", [p1, p2]);
});

Deno.test("money tools: finance retries a failed refund and lifts a pause; support cannot; failed money is retried daily then flagged", async () => {
  const e = await paidEngagement("g");
  const p = await one("select id from payments where milestone_id = $1", [e.m1]);
  const rf = (await one("insert into refunds (payment_id, agreement_id, milestone_id, amount_cents, status, idem_key) values ($1, $2, $3, 5000, 'failed', $4) returning id", [p.id, e.ag, e.m1, "rf:g" + RUN])).id;
  assertEquals((await call("POST", "/admin/money/retry", financeLess.token, { kind: "refund", id: rf })).status, 403, "support cannot move money");
  assert((await call("POST", "/admin/money/retry", team.token, { kind: "refund", id: rf })).body.data.ok);
  assertEquals((await one("select status, retries from refunds where id = $1", [rf])).status, "succeeded");
  await pool.query("update agreements set status = 'paused' where id = $1", [e.ag]);
  assertEquals((await call("POST", "/admin/engagements/unpause", team.token, { id: e.ag, note: "" })).body.data.reason, "say_why");
  assert((await call("POST", "/admin/engagements/unpause", team.token, { id: e.ag, note: "Bank review closed" })).body.data.ok);
  assertEquals((await one("select status from agreements where id = $1", [e.ag])).status, "active");
  const rf2 = (await one("insert into refunds (payment_id, agreement_id, milestone_id, amount_cents, status, idem_key, retries, updated_at) values ($1, $2, $3, 1000, 'failed', $4, 3, now() - interval '2 days') returning id", [p.id, e.ag, e.m1, "rf:g2" + RUN])).id;
  await rpc("dela_money_retry_failed", {});
  assertEquals((await one("select status from refunds where id = $1", [rf2])).status, "failed", "after 3 tries it stays failed");
  assert((await one("select 1 x from notifications where dedupe_key like $1", ["moneyfail:refund:" + rf2 + ":%"])), "and the team is told");
});

Deno.test("switch off: the old one-step dispute still works and the new routes say so", async () => {
  await pool.query("update feature_switches set state = 'off' where key = 'dispute_center'");
  const e = await paidEngagement("h");
  const o = (await call("POST", "/disputes/open", att.token, { id: e.ag, milestone_id: e.m1, reason: "Old style", category: "quality", wants: "refund" })).body;
  assert(o.ok);
  assertEquals((await one("select answer_due_at from disputes where id = $1", [o.id])).answer_due_at, null);
  assertEquals((await call("POST", "/disputes/say", fl.token, { id: o.id, body: "x" })).body.reason, "dispute_center_off");
  await pool.query("update feature_switches set state = 'everyone' where key = 'dispute_center'");
});

Deno.test("teardown", async () => { await pool.end(); });

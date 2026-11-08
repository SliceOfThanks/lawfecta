// Step 9: the Pro trial check (docs/briefs/step-9-pro-trial-downgrade.md, Stacey's answers 2026-11-07).
// The rules in code, then the real handler and database with an in-memory stand-in for BD that records every call.
// Run: deno test -A supabase/functions/api/trial_test.ts   (after tools/dbtest.sh)
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { decide, trialEmail, type TrialInvoice, type TrialSettings } from "./lib/trial/rules.ts";
import type { Res, TrialBd, TrialCandidate, TrialPost } from "./lib/trial/bd.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const DAY = 86400000;
const NOW = Date.parse("2026-11-20T10:00:00Z");
const PLANS = { pro: 8, free: 3, plus: 7, agency: 9, trial: [7, 8], never: [5, 10, 11, 12, 13, 14] };
const S: TrialSettings = { days: 7, reminderDays: 2, eligibleFrom: "", plans: PLANS };
const iso = (t: number) => new Date(t).toISOString();
const base = { user_id: 1, plan_id: 8, signup_at: iso(NOW - 8 * DAY), status: "active", ends_at: iso(NOW - DAY), reminded: true, invoices: [] as TrialInvoice[], hidden: 0 };

Deno.test("the rules: who is moved to Free, converted, reminded, tracked, and never touched", () => {
  assertEquals(decide(base, NOW, S).action, "downgrade");
  assertEquals(decide({ ...base, invoices: [{ id: "i1", plan_id: 8, paid: true, open: false }] }, NOW, S), { action: "convert", reason: "paid_pro" });
  // Answer 7: on Plus with the Plus invoice unpaid at the end of the trial: Free too; paid Plus converts
  assertEquals(decide({ ...base, plan_id: 7, invoices: [{ id: "i2", plan_id: 7, paid: false, open: true }] }, NOW, S).reason, "plus_unpaid_at_trial_end");
  assertEquals(decide({ ...base, plan_id: 7, invoices: [{ id: "i2", plan_id: 7, paid: true, open: false }] }, NOW, S).reason, "paid_plus");
  // A paid invoice for another plan does not convert (answer 7: the plan they are on)
  assertEquals(decide({ ...base, plan_id: 7, invoices: [{ id: "i3", plan_id: 8, paid: true, open: false }] }, NOW, S).action, "downgrade");
  assertEquals(decide({ ...base, plan_id: 9 }, NOW, S).reason, "upgraded_to_agency");
  // Answer 1, the hard guard: attorney plans and lifetime plans are never changed, even with trial data
  for (const plan of [5, 12, 13, 14, 10, 11]) assertEquals(decide({ ...base, plan_id: plan }, NOW, S), { action: "skip", reason: "never_changed_plan" });
  assertEquals(decide({ ...base, plan_id: 3 }, NOW, S).action, "skip");
  assertEquals(decide({ ...base, status: "converted" }, NOW, S).action, "skip");
  assertEquals(decide({ ...base, status: "downgraded" }, NOW, S).action, "skip");
  assertEquals(decide({ ...base, status: "downgraded", hidden: 2, plan_id: 3 }, NOW, S).action, "skip", "still on Free: nothing to bring back yet");
  assertEquals(decide({ ...base, status: "downgraded", hidden: 2, plan_id: 8 }, NOW, S).action, "restore");
  // The reminder goes once, within 2 days of the end
  assertEquals(decide({ ...base, ends_at: iso(NOW + DAY), reminded: false }, NOW, S).action, "remind");
  assertEquals(decide({ ...base, ends_at: iso(NOW + DAY), reminded: true }, NOW, S).action, "skip");
  assertEquals(decide({ ...base, ends_at: iso(NOW + 4 * DAY), reminded: false }, NOW, S).action, "skip");
  // A new Pro signup with no trial data starts being tracked; an old member never gets a trial after the fact
  assertEquals(decide({ ...base, status: "", ends_at: null, signup_at: iso(NOW - DAY) }, NOW, S), { action: "track", reason: "new_pro_signup", ends_at: iso(NOW + 6 * DAY) });
  assertEquals(decide({ ...base, status: "", ends_at: null, signup_at: iso(NOW - 40 * DAY) }, NOW, S).action, "skip");
  assertEquals(decide({ ...base, status: "", ends_at: null, signup_at: iso(NOW - DAY) }, NOW, { ...S, eligibleFrom: "2026-11-25" }).reason, "signed_up_before_trials");
  assertEquals(decide({ ...base, status: "", plan_id: 3, signup_at: iso(NOW - DAY) }, NOW, S).action, "skip", "Free signups have no trial");
});

Deno.test("the two emails use the developer notes' words and button", () => {
  const a = trialEmail("ending", "Rita", "https://www.hirelegalhelp.com/", "staging");
  assertEquals([a.subject, a.button, a.url], ["[Test site] Your Pro trial ends in 2 days", "Keep Pro", "https://www.hirelegalhelp.com/account/upgrade"]);
  assert(a.text.startsWith("Hi Rita, your free week of Lawfecta Pro ends in 2 days. Keep your stronger placement in DELA Member Match"));
  // Fix (AI review 0.10.0, payments 3): the reminder says the number of days the setting uses
  assertEquals(trialEmail("ending", "Rita", "https://www.lawfecta.com", "live", 3).subject, "Your Pro trial ends in 3 days");
  assertEquals(trialEmail("ending", "Rita", "https://www.lawfecta.com", "live", 1).subject, "Your Pro trial ends in 1 day");
  const b = trialEmail("ended", "Rita", "https://www.lawfecta.com", "live");
  assertEquals([b.subject, b.button], ["Your Pro trial has ended", "Upgrade to Pro"]);
  assert(b.text.includes("Your videos, promotions and extra areas of law are saved and come back as soon as you upgrade."));
});

// ---------- The real handler with a stand-in BD ----------
type Mem = TrialCandidate & { meta: Record<string, string>; invoices: TrialInvoice[]; posts: TrialPost[]; areas: string[]; active: boolean; subs: number[] };
const bdState = new Map<number, Mem>();
const calls: string[] = [];
let failOnce = "";
const ok = <T>(data: T): Res<T> => ({ ok: true, data });
const miss: Res<never> = { ok: false, error: "missing" };
const stub: TrialBd = {
  search: (plans, since) => Promise.resolve(ok([...bdState.values()].filter((m) => plans.includes(m.plan_id) && (m.signup_at ?? "") >= since).map(cand))),
  member: (id) => Promise.resolve(bdState.has(id) ? ok(cand(bdState.get(id)!)) : miss),
  meta: (id) => Promise.resolve(bdState.has(id) ? ok({ ...bdState.get(id)!.meta }) : miss),
  setMeta: (id, v) => { calls.push(`meta:${id}:${Object.keys(v).join(",")}`); Object.assign(bdState.get(id)!.meta, v); return Promise.resolve(ok(true as const)); },
  invoices: (id) => Promise.resolve(ok([...(bdState.get(id)?.invoices ?? [])])),
  changePlan: (id, plan) => { calls.push(`plan:${id}:${plan}`); bdState.get(id)!.plan_id = plan; return Promise.resolve(ok(true as const)); },
  cancelSubscription: (id, plan) => { calls.push(`sub:${id}:${plan}`); return Promise.resolve(ok(true as const)); },
  cancelInvoice: (invId) => {
    if (failOnce === "invoice") { failOnce = ""; return Promise.resolve({ ok: false, error: "bd 500" }); }
    calls.push(`invoice:${invId}`);
    for (const m of bdState.values()) for (const i of m.invoices) if (i.id === invId) i.open = false;
    return Promise.resolve(ok(true as const));
  },
  setActive: (id) => { calls.push(`active:${id}`); bdState.get(id)!.active = true; return Promise.resolve(ok(true as const)); },
  posts: (id) => Promise.resolve(ok((bdState.get(id)?.posts ?? []).map((p) => ({ ...p })))),
  setPublished: (pid, on) => { calls.push(`post:${pid}:${on}`); for (const m of bdState.values()) for (const p of m.posts) if (p.id === pid) p.published = on; return Promise.resolve(ok(true as const)); },
  areas: (id) => Promise.resolve(ok([...(bdState.get(id)?.areas ?? [])])),
  setAreas: (id, shown) => { calls.push(`areas:${id}:${shown.length}`); bdState.get(id)!.areas = [...shown]; return Promise.resolve(ok(true as const)); },
};
function cand(m: Mem): TrialCandidate { return { user_id: m.user_id, plan_id: m.plan_id, signup_at: m.signup_at, first_name: m.first_name, last_name: m.last_name, email: m.email }; }
function add(id: number, plan: number, meta: Record<string, string>, extra: Partial<Mem> = {}) {
  bdState.set(id, { user_id: id, plan_id: plan, signup_at: iso(NOW - 8 * DAY), first_name: "Fran" + id, last_name: "Trial", email: `t${id}@test.invalid`, meta, invoices: [], posts: [], areas: [], active: false, subs: [plan], ...extra });
}

const ENV: Record<string, string> = { BD_SHARED_SECRET: "x".repeat(40), DELA_ORIGINS: "https://lawfecta.com" };
const deps: Deps = { rpc, env: (k) => ENV[k] ?? "", now: () => NOW, trialBd: stub, fetch: (() => { throw new Error("no outside calls"); }) as typeof fetch };
const noBd: Deps = { ...deps, trialBd: undefined };
async function call(d: Deps, method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  }), d);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const RUN = Date.now() % 1000000;
async function person(n: number, staff: boolean, role = "owner") {
  const bd = 9_100_000 + RUN * 10 + n;
  const id = (await pool.query("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Team " + n, `tt${n}@test.invalid`])).rows[0].id;
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  await pool.query("select dela_ensure_side($1, 'attorney', 'att_pro', 'staff_grant')", [id]);
  if (staff) await pool.query("insert into staff_roles (person_id, role) values ($1, $2)", [id, role]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, 'attorney', 1, now() + interval '1 hour')", [await sessionHash(token), id]);
  return token;
}
const setMode = (m: string) => pool.query("update settings set value = to_jsonb($1::text) where key = 'trial.downgrade_mode'", [m]);
const setTrialSwitch = (st: string) => pool.query("update feature_switches set state = $1 where key = 'bd_trial_downgrade'", [st]);
const lastRun = async () => (await pool.query("select * from trial_runs order by started_at desc limit 1")).rows[0];
const runEvents = async (run: string): Promise<Array<Record<string, any>>> => (await pool.query("select bd_user_id, action, reason, done, error, mode from trial_events where run_id = $1 order by bd_user_id", [run])).rows;

let owner = "", member = "", support = "";
const U = 7_000_000 + RUN * 10; // BD user IDs for this run
Deno.test("setup", async () => {
  await pool.query("delete from trial_members where bd_user_id between $1 and $2", [U, U + 99]);
  owner = await person(1, true);
  member = await person(2, false);
  support = await person(3, true, "support");
  await setMode("dry_run");
  await setTrialSwitch("off");
  add(U + 1, 8, { dela_trial_status: "active", dela_trial_ends_at: iso(NOW - DAY) }, {
    invoices: [{ id: "inv-1", plan_id: 8, paid: false, open: true }],
    posts: [{ id: "v1", type: "video", published: true }, { id: "a1", type: "article", published: true }, { id: "e1", type: "event", published: true }],
    areas: ["Family law", "Probate", "Immigration", "Bankruptcy", "Tax"],
  });
  add(U + 2, 8, { dela_trial_status: "active", dela_trial_ends_at: iso(NOW - DAY) }, { invoices: [{ id: "inv-2", plan_id: 8, paid: true, open: false }] });
  add(U + 3, 12, { dela_trial_status: "active", dela_trial_ends_at: iso(NOW - DAY) }, { signup_at: iso(NOW - 8 * DAY) }); // an attorney plan with trial data
  add(U + 4, 7, { dela_trial_status: "active", dela_trial_ends_at: iso(NOW - DAY) }, { invoices: [{ id: "inv-4", plan_id: 7, paid: false, open: true }] });
  add(U + 5, 8, { dela_trial_status: "active", dela_trial_ends_at: iso(NOW + DAY) });
  add(U + 6, 8, {}, { signup_at: iso(NOW - DAY) });
});

Deno.test("only the team sees and runs it; until BD is connected a run says so and changes nothing", async () => {
  assertEquals((await call(deps, "GET", "/admin/trial", member)).status, 403);
  const r = (await call(noBd, "POST", "/admin/trial/run", owner, {})).body;
  const d = r.data ?? r;
  assert(String(d.error).includes("bd_trial_api_not_confirmed"), JSON.stringify(r));
  assertEquals((await lastRun()).error, "bd_trial_api_not_confirmed");
});

Deno.test("Dry run lists every member it would change, with the reason, and changes nothing", async () => {
  calls.length = 0;
  const d = (await call(deps, "POST", "/admin/trial/run", owner, {})).body;
  const out = d.data ?? d;
  assertEquals(out.mode, "dry_run");
  const ev = (await runEvents(out.run_id)).filter((e) => e.bd_user_id >= U && e.bd_user_id <= U + 9);
  const by = Object.fromEntries(ev.map((e) => [Number(e.bd_user_id) - U, e.action + "/" + e.reason]));
  assertEquals(by, { 1: "downgrade/trial_ended_unpaid", 2: "convert/paid_pro", 4: "downgrade/plus_unpaid_at_trial_end", 5: "remind/ends_soon", 6: "track/new_pro_signup" });
  assert(ev.every((e) => e.mode === "dry_run" && !e.done));
  assertEquals(calls, [], "nothing was changed in BD");
  assertEquals(bdState.get(U + 1)!.plan_id, 8);
  const admin = (await call(deps, "GET", "/admin/trial", owner)).body;
  const a = admin.data ?? admin;
  assertEquals(a.settings.mode, "dry_run");
  assert(a.events.some((e: { bd_user_id: number; invoice_status: string }) => Number(e.bd_user_id) === U + 1 && e.invoice_status === "unpaid"), "the list shows the invoice status");
  assertEquals((await lastRun()).summary_sent_at, null, "no summary email on a dry run");
});

Deno.test("Live: the downgrade runs in the notes' order, hides content without deleting it, and a stopped run finishes next time", async () => {
  // Fix (AI review 0.10.0, security 5): with the switch off, Live mode still only lists
  await setMode("live");
  calls.length = 0;
  const off = (await call(deps, "POST", "/admin/trial/run", owner, {})).body;
  assertEquals([(off.data ?? off).mode, calls.length], ["dry_run", 0]);
  await setTrialSwitch("everyone");
  // A run that changes BD is the owner's to start
  assertEquals((await call(deps, "POST", "/admin/trial/run", support, {})).status, 403);
  calls.length = 0;
  failOnce = "invoice";
  const first = ((await call(deps, "POST", "/admin/trial/run", owner, {})).body);
  const f = first.data ?? first;
  const ev1 = await runEvents(f.run_id);
  const m1 = ev1.find((e) => Number(e.bd_user_id) === U + 1)!;
  assertEquals([m1.action, m1.done], ["downgrade", false]);
  assert(m1.error.startsWith("invoices: bd 500"), m1.error);
  assertEquals(bdState.get(U + 1)!.plan_id, 3, "the plan step finished before the failure");
  // Fix (AI review 0.10.0, payments 1): the subscription on every trial plan is canceled, not only the current one
  assertEquals(calls.filter((c) => c.startsWith(`sub:${U + 1}:`)).sort(), [`sub:${U + 1}:7`, `sub:${U + 1}:8`]);
  // The next run finishes the missing steps without repeating the done ones
  calls.length = 0;
  const second = (await call(deps, "POST", "/admin/trial/run", owner, {})).body;
  const s2 = second.data ?? second;
  const m2 = (await runEvents(s2.run_id)).find((e) => Number(e.bd_user_id) === U + 1)!;
  assertEquals([m2.action, m2.reason, m2.done], ["downgrade", "finishing_downgrade", true]);
  const mine = calls.filter((c) => c.includes(String(U + 1)) || c.startsWith("invoice:inv-1") || c.startsWith("post:"));
  assertEquals(mine.filter((c) => c.startsWith("plan:")), [], "the plan is not changed twice");
  assertEquals(mine.filter((c) => !c.startsWith("post:")), [`invoice:inv-1`, `active:${U + 1}`, `areas:${U + 1}:3`, `meta:${U + 1}:dela_trial_status,dela_downgraded_at`]);
  const m = bdState.get(U + 1)!;
  assertEquals([m.plan_id, m.active, m.meta.dela_trial_status, m.invoices[0].open], [3, true, "downgraded", false]);
  assertEquals(m.posts.map((p) => p.id + ":" + p.published), ["v1:false", "a1:false", "e1:true"], "videos and articles hidden, other posts untouched, nothing deleted");
  assertEquals(m.areas, ["Family law", "Probate", "Immigration"]);
  // The paid Pro member converted; the attorney plan was never touched; Plus unpaid moved to Free; the new signup is tracked
  assertEquals(bdState.get(U + 2)!.meta.dela_trial_status, "converted");
  assertEquals([bdState.get(U + 3)!.plan_id, bdState.get(U + 3)!.meta.dela_trial_status], [12, "active"]);
  assertEquals([bdState.get(U + 4)!.plan_id, bdState.get(U + 4)!.meta.dela_trial_status], [3, "downgraded"]);
  assertEquals(bdState.get(U + 6)!.meta.dela_trial_status, "active");
  assertEquals(bdState.get(U + 6)!.meta.dela_trial_ends_at, iso(NOW + 6 * DAY));
  // The reminder went once
  assert((await pool.query("select reminded_at from trial_members where bd_user_id = $1", [U + 5])).rows[0].reminded_at);
});

Deno.test("one summary email per run with downgrades, none without; running again changes nothing", async () => {
  const runs = (await pool.query("select id, summary_sent_at, counts from trial_runs order by started_at desc limit 2")).rows;
  assert(runs[0].summary_sent_at, "the run that finished downgrades sent the summary");
  assert(runs[1].summary_sent_at, "the first live run moved the Plus member to Free, so it sent one too");
  calls.length = 0;
  const again = (await call(deps, "POST", "/admin/trial/run", owner, {})).body;
  const a = again.data ?? again;
  assertEquals(calls, [], "a third run changes nothing");
  assertEquals((await pool.query("select summary_sent_at from trial_runs where id = $1", [a.run_id])).rows[0].summary_sent_at, null);
});

Deno.test("after an upgrade, the hidden content comes back as far as the plan allows", async () => {
  bdState.get(U + 1)!.plan_id = 8;
  calls.length = 0;
  const r = (await call(deps, "POST", "/admin/trial/run", owner, {})).body;
  const ev = (await runEvents((r.data ?? r).run_id)).find((e) => Number(e.bd_user_id) === U + 1)!;
  assertEquals([ev.action, ev.done], ["restore", true]);
  const m = bdState.get(U + 1)!;
  assertEquals(m.posts.map((p) => p.id + ":" + p.published), ["v1:true", "a1:true", "e1:true"]);
  assertEquals(m.areas.length, 5);
  calls.length = 0;
  await call(deps, "POST", "/admin/trial/run", owner, {});
  assertEquals(calls, [], "nothing is restored twice");
});

// Fixes from the AI review of 0.10.0 (GitHub issue #11): the safety checks at the moment of change
Deno.test("the plan is read again right before it changes: a member who upgraded in between is not touched", async () => {
  add(U + 20, 8, { dela_trial_status: "active", dela_trial_ends_at: iso(NOW - DAY) }, { invoices: [{ id: "inv-20", plan_id: 8, paid: false, open: true }] });
  const orig = stub.member;
  let reads = 0;
  stub.member = (id) => { if (id === U + 20 && ++reads >= 1) bdState.get(U + 20)!.plan_id = 9; return orig(id); };
  calls.length = 0;
  const r = (await call(deps, "POST", "/admin/trial/run", owner, {})).body;
  stub.member = orig;
  const ev = (await runEvents((r.data ?? r).run_id)).find((e) => Number(e.bd_user_id) === U + 20)!;
  assertEquals([ev.action, ev.done, ev.error], ["downgrade", false, "plan: plan_changed_since_check"]);
  assertEquals(calls.filter((c) => c.includes(String(U + 20)) || c.includes("inv-20")), [], "nothing changed in BD");
  assertEquals(bdState.get(U + 20)!.plan_id, 9);
  bdState.delete(U + 20);
});

Deno.test("finishing a stopped downgrade stops if the member paid and went back to Pro in between", async () => {
  add(U + 21, 8, { dela_trial_status: "active", dela_trial_ends_at: iso(NOW - DAY) }, { invoices: [{ id: "inv-21", plan_id: 8, paid: false, open: true }] });
  failOnce = "invoice";
  await call(deps, "POST", "/admin/trial/run", owner, {});
  assertEquals(bdState.get(U + 21)!.plan_id, 3, "stopped after the plan step");
  // The member pays and BD puts them back on Pro before the next run
  bdState.get(U + 21)!.plan_id = 8;
  bdState.get(U + 21)!.invoices = [{ id: "inv-21", plan_id: 8, paid: true, open: false }];
  calls.length = 0;
  const r = (await call(deps, "POST", "/admin/trial/run", owner, {})).body;
  const ev = (await runEvents((r.data ?? r).run_id)).find((e) => Number(e.bd_user_id) === U + 21)!;
  assertEquals([ev.reason, ev.done, ev.error], ["finishing_downgrade", false, "changed_since_downgrade_started"]);
  assertEquals(calls.filter((c) => c.includes(String(U + 21)) || c.includes("inv-21")), [], "no more steps, no email");
  assertEquals(bdState.get(U + 21)!.meta.dela_trial_status, "active");
  bdState.delete(U + 21);
  await pool.query("delete from trial_members where bd_user_id = $1", [U + 21]);
});

Deno.test("a member who moved from Pro to Plus and paid nothing has both open bills canceled", async () => {
  add(U + 22, 7, { dela_trial_status: "active", dela_trial_ends_at: iso(NOW - DAY) }, {
    invoices: [{ id: "inv-22p", plan_id: 8, paid: false, open: true }, { id: "inv-22s", plan_id: 7, paid: false, open: true }] });
  calls.length = 0;
  await call(deps, "POST", "/admin/trial/run", owner, {});
  assertEquals(calls.filter((c) => c.startsWith("invoice:inv-22")).sort(), ["invoice:inv-22p", "invoice:inv-22s"]);
  assertEquals(bdState.get(U + 22)!.invoices.filter((i) => i.open).length, 0, "no unpaid bill is left");
  bdState.delete(U + 22);
});

Deno.test("an attorney plan is never changed, even when DELA holds trial data for it", async () => {
  add(U + 23, 12, { dela_trial_status: "downgraded" }, { posts: [{ id: "v23", type: "video", published: false }] });
  await pool.query("select dela_trial_member_save($1, $2)", [U + 23, { steps: { plan: "x" }, hidden: { posts: ["v23"], areas: [] }, from_plan: 8 }]);
  calls.length = 0;
  await call(deps, "POST", "/admin/trial/run", owner, {});
  assertEquals(calls.filter((c) => c.includes(String(U + 23)) || c.includes("v23")), [], "the member reached through the follow-up list is left alone");
  bdState.delete(U + 23);
  await pool.query("delete from trial_members where bd_user_id = $1", [U + 23]);
});

Deno.test("two checks at once: the second skips, so nothing happens twice", async () => {
  add(U + 24, 8, { dela_trial_status: "active", dela_trial_ends_at: iso(NOW - DAY) }, { invoices: [{ id: "inv-24", plan_id: 8, paid: false, open: true }] });
  calls.length = 0;
  const [a, b] = await Promise.all([call(deps, "POST", "/admin/trial/run", owner, {}), call(deps, "POST", "/admin/trial/run", owner, {})]);
  const errs = [a.body, b.body].map((x) => (x.data ?? x).error ?? "");
  assert(errs.includes("another_check_running"), JSON.stringify(errs));
  assertEquals(calls.filter((c) => c === `plan:${U + 24}:3`).length, 1, "the plan changed once");
  assertEquals(calls.filter((c) => c === "invoice:inv-24").length, 1, "the bill was canceled once");
  bdState.delete(U + 24);
});

Deno.test("one trial: DELA's allowances follow the BD plan only, whatever the old trials switch says", async () => {
  const id = (await pool.query("insert into people (bd_member_id, display_name, email, trial_ends_at) values ($1, 'Old trial', 'ot@test.invalid', now() + interval '3 days') returning id", [9_200_000 + RUN])).rows[0].id;
  await pool.query("select dela_ensure_side($1, 'freelancer', 'fl_free', 'staff_grant')", [id]);
  await pool.query("update feature_switches set state = 'everyone' where key = 'trials'");
  const v = (await pool.query("select pv.plan_code from plan_versions pv where pv.id = dela_effective_version($1, 'freelancer')", [id])).rows[0].plan_code;
  assertEquals(v, "fl_free");
  await pool.query("update feature_switches set state = 'off' where key = 'trials'");
});

Deno.test("teardown", async () => {
  await setMode("dry_run");
  await setTrialSwitch("off");
  await pool.end();
});

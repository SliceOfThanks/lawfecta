// Step 95 API tests (docs/briefs/step-95-test-members.md): test accounts that need nobody from the Lawfecta Team.
// A member on the list gets the listed plan and the Access list when their workspace is made; their license, their
// LinkedIn check and their agency's business details pass at once; they can never pay or open a payout account.
// Someone who is not on the list, an entry that ran out, and a second account using a listed email get none of it.
// Run after tools/dbtest.sh:   deno test -A supabase/functions/api/test_members_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const RUN = Date.now() % 1000000;
const deps: Deps = { rpc, env: (k) => ({ DELA_ORIGINS: "https://lawfecta.com", STRIPE_SECRET_KEY: "sk_test_" + "y".repeat(24) } as Record<string, string>)[k] ?? "", // rules-ok: a made-up key; Stripe must never be asked
  fetch: (() => { throw new Error("a test member must never reach an outside service"); }) as typeof fetch };
async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, { method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }), deps);
  const j = await res.json() as Record<string, any>;
  return { status: res.status, body: j };
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
const mail = (k: string) => `tm${RUN}+${k}@test.invalid`;
type M = { id: string; bd: number; token: string };
// A person arrives as at a first sign-in: the row, then the workspace on the website's (free) plan
async function arrive(k: number, email: string, side: "attorney" | "freelancer"): Promise<M> {
  const bd = 8_800_000 + RUN * 10 + k;
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Test Member " + k, email])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'bd')", [id, side, side === "attorney" ? "att_free" : "fl_free"]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { id, bd, token };
}
const plan = async (m: M, side: string) => await one("select plan_code, plan_source from side_profiles where person_id = $1 and side = $2", [m.id, side]);
const listed = async (m: M) => Number((await one("select count(*) n from access_list where bd_member_id = $1 and channel = 'access' and revoked_at is null", [m.bd])).n);
const license = async (m: M, n: string) => (await one("insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method) values ($1, $2, 'TX', $3, $3, 'Test Member', 'video') returning id", [m.id, "r" + n + RUN, "TEST" + n + RUN])).id;

Deno.test("a listed member gets the plan and the Access list the moment their workspace is made", async () => {
  assertEquals((await one("select dela_test_member_set($1, 'no_such_plan') r", [mail("x")])).r.reason, "bad_plan");
  assertEquals((await one("select dela_test_member_set($1, 'att_pro', 7, 'onboarding run') r", [mail("att").toUpperCase()])).r.ok, true, "the email is kept in small letters");
  await pool.query("select dela_test_member_set($1, 'fl_business')", [mail("agency")]);
  const att = await arrive(1, mail("att"), "attorney");
  assertEquals(await plan(att, "attorney"), { plan_code: "att_pro", plan_source: "staff_grant" });
  assertEquals(await listed(att), 1);
  assertEquals((await one("select dela_test_member($1) t", [att.id])).t, true);
  assertEquals((await one("select bd_member_id from test_members where email = $1", [mail("att")])).bd_member_id, String(att.bd), "the entry now belongs to this one website member");
  // Listed after they arrived: applied at once
  const late = await arrive(2, mail("late"), "freelancer");
  assertEquals((await plan(late, "freelancer")).plan_code, "fl_free");
  await pool.query("select dela_test_member_set($1, 'fl_pro')", [mail("late")]);
  assertEquals(await plan(late, "freelancer"), { plan_code: "fl_pro", plan_source: "staff_grant" });
  assertEquals(await listed(late), 1);
});

Deno.test("the three checks pass by themselves for a listed member, and wait for the Team for everyone else", async () => {
  const att = (await one("select id, bd_member_id bd from people where email = $1", [mail("att")])) as M;
  const lic = await license(att, "a");
  const l = await one("select status, identity, lookup_note, decided_by from licenses where id = $1", [lic]);
  assertEquals([l.status, l.identity, l.decided_by], ["verified", "video", null]);
  assert(l.lookup_note.includes("Test member"), "the record says nobody looked it up");
  assertEquals(Number((await one("select count(*) n from verification_events where subject = 'license' and subject_id = $1", [lic]).catch(() => ({ n: 1 }))).n) >= 1, true);
  const fl = await arrive(3, mail("fl"), "freelancer");
  await pool.query("select dela_test_member_set($1, 'fl_pro')", [mail("fl")]);
  const li = (await one("insert into linkedin_checks (person_id, url) values ($1, 'https://www.linkedin.com/in/test-member-dela') returning id", [fl.id])).id;
  const c = await one("select status, name_matches, badge_seen from linkedin_checks where id = $1", [li]);
  assertEquals([c.status, c.name_matches, c.badge_seen], ["verified", true, true]);
  // The agency's business details
  const ag = await arrive(4, mail("agency"), "freelancer");
  assertEquals((await plan(ag, "freelancer")).plan_code, "fl_business");
  const org = (await one("select org_id from side_profiles where person_id = $1 and side = 'freelancer'", [ag.id])).org_id;
  await pool.query("update organizations set kind = 'agency' where id = $1", [org]);
  await pool.query("update organizations set business_name = 'Test Agency LLC', business_state = 'TX', business_checked_at = null where id = $1", [org]);
  const o = await one("select business_checked_at, business_check_note from organizations where id = $1", [org]);
  assert(o.business_checked_at && o.business_check_note.includes("Test member"));
  // Someone who is not on the list waits for the Lawfecta Team, as before
  const plain = await arrive(5, mail("plain"), "attorney");
  assertEquals([(await plan(plain, "attorney")).plan_code, await listed(plain)], ["att_free", 0]);
  assertEquals((await one("select status from licenses where id = $1", [await license(plain, "p")])).status, "pending");
  assertEquals((await one("select dela_test_member($1) t", [plain.id])).t, false);
});

Deno.test("an entry that ran out does nothing, and a second account with a listed email is not a test member", async () => {
  await pool.query("select dela_test_member_set($1, 'att_pro')", [mail("old")]);
  await pool.query("update test_members set expires_at = now() - interval '1 minute' where email = $1", [mail("old")]);
  const old = await arrive(6, mail("old"), "attorney");
  assertEquals([(await plan(old, "attorney")).plan_code, await listed(old), (await one("select dela_test_member($1) t", [old.id])).t], ["att_free", 0, false]);
  assertEquals((await one("select status from licenses where id = $1", [await license(old, "o")])).status, "pending");
  // The entry for mail("att") is bound to the first account. Another account with the same email gets nothing.
  const copy = await arrive(7, mail("att"), "attorney");
  assertEquals([(await plan(copy, "attorney")).plan_code, (await one("select dela_test_member($1) t", [copy.id])).t], ["att_free", false]);
  // Never longer than thirty days
  const r = (await one("select dela_test_member_set($1, 'att_pro', 400) r", [mail("long")])).r;
  assert(new Date(r.until).getTime() - Date.now() < 31 * 86400000);
});

Deno.test("a test member can never pay or open a payout account; the server answers before Stripe is ever asked", async () => {
  const att = (await one("select id from people where email = $1 order by first_seen_at limit 1", [mail("att")])).id;
  const token = "ds_test_" + crypto.randomUUID();
  const bd = (await one("select bd_member_id from people where id = $1", [att])).bd_member_id;
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, 'attorney', 1, now() + interval '1 hour')", [await sessionHash(token), att]);
  assert(bd);
  const pay = await call("POST", "/engagements/pay", token, { id: crypto.randomUUID() });
  assertEquals([pay.body.ok, pay.body.reason], [false, "test_account"], pay.status + " " + JSON.stringify(pay.body));
  assertEquals((await one("select dela_payment_next($1, 'attorney', $2) r", [att, crypto.randomUUID()])).r, { ok: false, reason: "test_account" });
  const fl = (await one("select id from people where email = $1", [mail("fl")])).id;
  const ft = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, 'freelancer', 1, now() + interval '1 hour')", [await sessionHash(ft), fl]);
  const out = await call("POST", "/payouts/setup", ft, {});
  assertEquals([out.body.ok, out.body.reason], [false, "test_account"], out.status + " " + JSON.stringify(out.body));
  // Someone who is not a test member is not answered that way
  assert((await one("select dela_payment_next((select id from people where email = $1), 'attorney', $2) r", [mail("plain"), crypto.randomUUID()])).r.reason !== "test_account");
});

Deno.test("teardown", async () => {
  await pool.query("delete from test_members where email like $1", ["tm" + RUN + "+%"]);
  await pool.end();
});

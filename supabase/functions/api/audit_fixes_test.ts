// Step 93 API tests (docs/briefs/step-93-audit-fixes.md): what the audit of 2026-11-25 found, fixed.
// A member the move made gets no email before their first sign-in; being added to an attorney's Library does not show
// a freelancer's last name; an outside service that never answers is cut off; sensitive numbers are taken out of a
// document and refused in a comment; and the six-hour check finds a website that is down and tells the owner once a day.
// Run after tools/dbtest.sh:   deno test -A supabase/functions/api/audit_fixes_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { limited } from "./lib/http.ts";
import { keyMode } from "./lib/payments/stripe.ts";
import { scrubSensitive } from "./lib/documents/model.ts";
import { sessionHash } from "./lib/crypto.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const RUN = Date.now() % 1000000;
const WORKER = "test-worker-secret-audit-0123456789abcdef";
const STRIPE_KEY = "sk_test_" + "x".repeat(24); // rules-ok: a made-up key for the stand-in Stripe
let siteUp = true, stripeUp = true;
// Step 93c: how many times in a row the stand-in website answers "server error" before it answers well again
let siteHiccups = 0, siteAsked = 0;
const asked: string[] = [];
const fakeFetch = ((input: string | URL | Request, _init: RequestInit = {}) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  asked.push(url.hostname + url.pathname);
  if (url.hostname === "api.stripe.com") return Promise.resolve(stripeUp ? Response.json({ object: "balance" }) : Response.json({ error: { message: "Invalid API Key provided" } }, { status: 401 }));
  if (url.hostname === "bd.test") siteAsked++;
  if (url.hostname === "bd.test" && siteHiccups > 0) { siteHiccups--; return Promise.resolve(new Response("upstream error", { status: 500 })); }
  if (url.hostname === "bd.test") return Promise.resolve(siteUp ? Response.json({ status: "success", message: [{ user_id: "1" }] }) : Response.json({ status: "error", message: "not allowed" }, { status: 403 }));
  return Promise.resolve(new Response("{}", { status: 404 }));
}) as typeof fetch;
const deps: Deps = { rpc, env: (k) => ({ BD_API_KEY: "site-key", STRIPE_SECRET_KEY: STRIPE_KEY, DELA_WORKER_SECRET: WORKER, DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: fakeFetch };
async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, { method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }), deps);
  const j = await res.json() as Record<string, any>;
  return { status: res.status, body: (j && typeof j.data === "object" && j.data ? j.data : j) as Record<string, any> };
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
const denied = (status: number) => status === 401 || status === 403;
type M = { token: string; id: string; bd: number };
async function person(k: number, plan: string, name: string, signedIn = true): Promise<M> {
  const bd = 8_900_000 + RUN * 10 + k, side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, name, `au${bd}@test.invalid`])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  if (signedIn) await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
let owner: M, support: M, attorney: M, freelancer: M, moved: M;
let wasSite: unknown = null, wasHide = "off";

Deno.test("setup", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  wasSite = (await one("select value from settings where key = 'site.url'")).value;
  await pool.query("update settings set value = '\"https://bd.test\"' where key = 'site.url'");
  wasHide = (await one("select state from feature_switches where key = 'hide_last_names'")).state;
  await pool.query("update feature_switches set state = 'everyone' where key = 'hide_last_names'");
  owner = await person(1, "att_free", "Audit Owner"); support = await person(2, "att_free", "Audit Support");
  attorney = await person(3, "att_free", "Avery Attorney"); freelancer = await person(4, "fl_free", "Fiona Lake");
  moved = await person(5, "att_free", "Morgan Moved", false);
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'owner'), ($2, 'support')", [owner.id, support.id]);
});

Deno.test("an outside service that never answers is cut off, so the jobs behind it are not held up", async () => {
  // A stand-in service that answers only when the caller gives up
  const never = ((_u: string | URL | Request, init: RequestInit = {}) => new Promise<Response>((_res, rej) => {
    if (!init.signal) return; // no limit: this would wait for ever
    init.signal.addEventListener("abort", () => rej(new Error("gave up")));
  })) as typeof fetch;
  const t0 = Date.now();
  let gaveUp = false;
  try { await limited(never, 60)("https://slow.test/"); } catch { gaveUp = true; }
  assert(gaveUp && Date.now() - t0 < 5000, "the call ends at its limit");
  // A call that sets its own limit keeps it
  const own = AbortSignal.timeout(30);
  let seen: AbortSignal | null | undefined;
  await limited(((_u: string | URL | Request, init: RequestInit = {}) => { seen = init.signal; return Promise.resolve(new Response("ok")); }) as typeof fetch, 60000)("https://fast.test/", { signal: own });
  assert(seen === own, "its own limit is kept");
});

Deno.test("a document: Social Security numbers and government ID numbers are taken out; case numbers and phone numbers stay", () => {
  const r = scrubSensitive("Ask the client for SSN 123-45-6789 and driver's license number D1234567. Case 2:24-cv-01234. Call 512-555-0147.");
  assertEquals([r.removed, r.ids], [true, true]);
  assert(!r.text.includes("123-45-6789") && !r.text.includes("D1234567"), r.text);
  assert(r.text.includes("[removed: Social Security number]") && r.text.includes("[removed: government ID number]"), r.text);
  assert(r.text.includes("2:24-cv-01234") && r.text.includes("512-555-0147"), "ordinary numbers stay: " + r.text);
  const plain = scrubSensitive("Open the matter, send the engagement letter, calendar the deadline.");
  assertEquals([plain.removed, plain.ids, plain.text], [false, false, "Open the matter, send the engagement letter, calendar the deadline."]);
  assertEquals(scrubSensitive("password: hunter2!").ids, false, "a password is removed as before, with the older notice");
  assertEquals([keyMode(STRIPE_KEY), keyMode(""), keyMode("something")], ["test", "", ""]);
});

Deno.test("a comment on a document refuses sensitive data, as a message does", async () => {
  const r = await call("POST", "/playbooks/comment", attorney.token, { id: crypto.randomUUID(), part: "", body: "Her SSN is 123-45-6789" });
  assertEquals([r.body.ok, r.body.reason], [false, "sensitive_data"], r.status + " " + JSON.stringify(r.body));
  assert(String(r.body.message).length > 10);
});

Deno.test("a member the move made gets no email from DELA until they have signed in once; the notice waits for them", async () => {
  const old = 7_000_000 + RUN;
  await pool.query("insert into move_links (old_id, new_id, email_key, how, status) values ($1, $2, $3, 'created', 'done')", [old, moved.bd, "moved@test.invalid"]);
  assertEquals((await one("select dela_move_quiet($1) q", [moved.id])).q, true);
  assertEquals((await one("select dela_move_made($1) m", [moved.bd])).m, true, "and they never start a Pro trial");
  assertEquals((await one("select dela_move_made($1) m", [attorney.bd])).m, false);
  const n = (await one("select dela_notify($1::jsonb) r", [JSON.stringify({ person_id: moved.id, side: "attorney", kind: "guide_reminder", email: true, title: "Your first gig is a few minutes away", body: "x", dedupe_key: "audit-quiet:" + RUN })])).r;
  assertEquals([n.ok, n.email_id, !!n.in_app_id], [true, null, true], "no email, and the notice is there for the first sign-in");
  assertEquals(Number((await one("select count(*) n from jobs where kind = 'send_email' and person_id = $1", [moved.id])).n), 0);
  // The daily onboarding reminder (two days after the workspace was made) sends them nothing either
  await pool.query("update side_profiles set created_at = now() - interval '2 days 1 hour' where person_id = $1", [moved.id]);
  await pool.query("select dela_guide_daily()");
  assertEquals(Number((await one("select count(*) n from notifications where person_id = $1 and channel = 'email'", [moved.id])).n), 0, "no reminder email");
  // After the first sign-in they are a member like any other
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, 'attorney', 1, now() + interval '1 hour')", [await sessionHash("ds_test_" + crypto.randomUUID()), moved.id]);
  assertEquals((await one("select dela_move_quiet($1) q", [moved.id])).q, false);
  const after = (await one("select dela_notify($1::jsonb) r", [JSON.stringify({ person_id: moved.id, side: "attorney", kind: "general", email: true, title: "Hello", body: "x", dedupe_key: "audit-loud:" + RUN })])).r;
  assert(after.email_id, "emails start after the first sign-in");
  // Someone who was never moved is not affected
  assertEquals((await one("select dela_move_quiet($1) q", [attorney.id])).q, false);
  await pool.query("delete from move_links where old_id = $1", [old]);
});

Deno.test("a freelancer's last name: adding them to an attorney's Library does not show it, and the job's file activity follows the rule", async () => {
  const see = async () => (await one("select dela_sees_full_name($1, $2) s", [attorney.id, freelancer.id])).s;
  assertEquals(await see(), false, "not hired: the attorney sees Fiona L.");
  const org = (await one("select org_id from side_profiles where person_id = $1 and side = 'attorney'", [attorney.id])).org_id;
  const add = (await one("select dela_pb_team_set($1, $2, $3, 'viewer') r", [attorney.id, org, freelancer.bd])).r;
  assertEquals(add.ok, true, "the attorney can still add a viewer: " + JSON.stringify(add));
  assertEquals(await see(), false, "being added to the Library is not being hired");
  assertEquals((await one("select dela_name_seen($1, $2, 'Fiona Lake') n", [attorney.id, freelancer.id])).n, "Fiona L.");
  assertEquals((await one("select dela_name_seen($1, $1, 'Fiona Lake') n", [freelancer.id])).n, "Fiona Lake", "she reads her own name in full");
  assertEquals((await one("select dela_name_seen($1, $2, 'Avery Attorney') n", [freelancer.id, attorney.id])).n, "Avery Attorney", "an attorney's name is never shortened");
  const src = (await one("select pg_get_functiondef('dela_job_activity(uuid,text,uuid)'::regprocedure) d")).d as string;
  assert(!src.includes("'who', pe.display_name") && src.split("dela_name_seen(p_person, pe.id, pe.display_name)").length === 5, "every line of the file activity uses the rule");
  // The freelancer's own choice still counts: someone she put on her own team reads her name
  assertEquals((await one("select dela_sees_full_name($1, $1) s", [freelancer.id])).s, true);
});

async function work() {
  await pool.query("update jobs set run_at = now() where status in ('queued', 'delayed') and kind = 'health_check'");
  await handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
}
async function runCheck() {
  // The button lets one check through a minute; a test does not wait for the next minute
  await pool.query("update jobs set idempotency_key = idempotency_key || ':' || id::text where kind = 'health_check' and idempotency_key like 'health_manual:%' and idempotency_key not like '%-%'");
  const r = await call("POST", "/admin/health/run", owner.token, {});
  assertEquals(r.body.ok, true, JSON.stringify(r.body));
  await work();
  return (await call("GET", "/admin/health", owner.token)).body;
}

Deno.test("the six-hour check: the owner only; a website that does not answer is found, and the owner is told once a day", async () => {
  assert(denied((await call("GET", "/admin/health", attorney.token)).status), "a member is not let in");
  assert(denied((await call("GET", "/admin/health", support.token)).status), "a team member who is not the owner is not let in");
  assert(denied((await call("POST", "/admin/health/run", support.token, {})).status));
  const first = await runCheck();
  assertEquals(first.hours, 6);
  const last = first.runs[0];
  const by = (run: Record<string, any>, name: string) => (run.checks as Array<Record<string, any>>).find((c) => c.name === name);
  assertEquals([last.trigger, by(last, "Stripe")?.ok, by(last, "Website")?.ok], ["manual", true, true], JSON.stringify(last.checks));
  assert(by(last, "Database") && by(last, "Email service"), "every part is looked at");
  assert(asked.includes("api.stripe.com/v1/balance") && asked.includes("bd.test/api/v2/user/get"), "Stripe and the website were really asked");
  const codes = (run: Record<string, any>) => (run.issues as Array<Record<string, any>>).map((i) => i.code);
  assert(!codes(last).includes("site_down") && !codes(last).includes("stripe_down"));
  assert(!JSON.stringify(first).includes(STRIPE_KEY), "no key is ever shown");

  // The website's key stops working, and Stripe's key is revoked
  siteUp = false; stripeUp = false;
  const second = (await runCheck()).runs[0];
  assertEquals([second.ok, by(second, "Website")?.ok, by(second, "Stripe")?.ok], [false, false, false]);
  assert(codes(second).includes("site_down") && codes(second).includes("stripe_down"), JSON.stringify(second.issues));
  const mails = async (word: string) => Number((await one("select count(*) n from notifications where person_id = $1 and channel = 'email' and kind = 'health' and title like $2", [owner.id, "%" + word + "%"])).n);
  assertEquals([await mails("website refused"), await mails("Stripe refused")], [1, 1], "the owner gets one email for each problem, and it says the key was refused");
  const siteBox = (second.issues as Array<Record<string, any>>).find((i) => i.code === "site_down")!;
  assert(siteBox.body.includes("BD_API_KEY") && siteBox.body.includes("Tell Claude"), "a refused key names where the key lives: " + siteBox.body);
  // Six hours later it is still down: the same day brings no second email
  await runCheck();
  assertEquals(await mails("website refused"), 1, "one email a day for a problem that stays");

  // What the database itself shows
  const job = (await one("insert into jobs (kind, payload, status, attempts, last_error, idempotency_key) values ('audit_test', '{}', 'dead', 5, 'boom', $1) returning id", ["audit-dead:" + RUN])).id;
  const db = (await one("select dela_health_db() d")).d as Array<Record<string, any>>;
  assert(db.some((i) => i.code === "jobs_dead"), JSON.stringify(db));
  await pool.query("update jobs set status = 'canceled' where id = $1", [job]);
  siteUp = true; stripeUp = true;
  const back = (await runCheck()).runs[0];
  assertEquals([by(back, "Website")?.ok, by(back, "Stripe")?.ok], [true, true], "and it reads well again once they answer");

  // Step 93c (check 39: one "status 500" from Brevo raised an alert). One hiccup is asked again and is no problem
  siteHiccups = 1; siteAsked = 0;
  const hiccup = (await runCheck()).runs[0];
  assertEquals([by(hiccup, "Website")?.ok, siteAsked, codes(hiccup).includes("site_down")], [true, 2, false], "a server error once, then a good answer: no problem and no email");
  // Twice in a row is a problem, and its words say the service is down, not that a key changed
  siteHiccups = 2; siteAsked = 0;
  const down = (await runCheck()).runs[0];
  const box = (down.issues as Array<Record<string, any>>).find((i) => i.code === "site_down")!;
  assertEquals([by(down, "Website")?.ok, siteAsked], [false, 2]);
  assert(box.title === "The website did not answer" && box.body.includes("itself has a problem") && box.body.includes("Nothing for you to do now") && !box.body.includes("BD_API_KEY"), JSON.stringify(box));
  // A refused key is not asked twice
  siteUp = false; siteAsked = 0;
  await runCheck();
  assertEquals(siteAsked, 1, "a refused key is a problem at once");
  siteUp = true;
});

Deno.test("the timer queues a check only on the live site, one for each period", async () => {
  const count = async () => Number((await one("select count(*) n from jobs where kind = 'health_check' and idempotency_key like 'health_check:%'")).n);
  const before = await count();
  await pool.query("select dela_health_due()");
  assertEquals(await count(), before, "the test site does not run it on a timer");
  const env = (await one("select value from settings where key = 'environment'"))?.value ?? null;
  try {
    await pool.query("insert into settings (key, value) values ('environment', '\"live\"') on conflict (key) do update set value = excluded.value");
    await pool.query("select dela_health_due()"); await pool.query("select dela_health_due()");
    assertEquals(await count(), before + 1, "asked twice in one period, queued once");
  } finally {
    if (env === null) await pool.query("update settings set value = '\"staging\"' where key = 'environment'");
    else await pool.query("update settings set value = $1::jsonb where key = 'environment'", [JSON.stringify(env)]);
    await pool.query("update jobs set status = 'canceled' where kind = 'health_check' and status in ('queued', 'delayed')");
  }
});

Deno.test("teardown", async () => {
  await pool.query("update settings set value = $1::jsonb where key = 'site.url'", [JSON.stringify(wasSite)]);
  await pool.query("update feature_switches set state = $1 where key = 'hide_last_names'", [wasHide]);
  await pool.query("update staff_roles set revoked_at = now() where person_id in ($1, $2)", [owner.id, support.id]);
  await pool.end();
});

// End-to-end API tests: the real handler against a real local database (tools/dbtest.sh builds it first).
// Run: deno test -A supabase/functions/api/app_test.ts   (PGHOST, PGPORT, PGUSER as in tools/dbtest.sh)
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { b64url, hmacHex } from "./lib/crypto.ts";
import { verifyPass } from "./lib/pass.ts";
import { buildNotice, noticeLink } from "./lib/email.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const SECRET = "test-shared-secret-0123456789abcdefghij";
const WORKER = "test-worker-secret-0123456789abcdef0123";
const sent: string[] = [];
const CI = "ci-secret-0123456789abcdef0123456789abcdef";
const dispatched: any[] = [];
let githubStatus = 204;
const deps: Deps = {
  rpc,
  env: (k) => ({
    BD_SHARED_SECRET: SECRET, BD_SHARED_SECRET_NEXT: "next-shared-secret-0123456789abcdefghij", DELA_ORIGINS: "https://lawfecta.com,https://www.lawfecta.com", STAGING_API_URL: "https://staging.example.invalid/functions/v1/api",
    GITHUB_REPO: "SliceOfThanks/lawfecta-dela", GITHUB_DISPATCH_TOKEN: "gh-token", RELEASE_CI_SECRET: CI,
  } as Record<string, string>)[k] ?? "",
  fetch: (async (url: string, opts: RequestInit) => {
    dispatched.push({ url, body: JSON.parse(String(opts.body)), auth: (opts.headers as Record<string, string>).authorization });
    return new Response(null, { status: githubStatus });
  }) as typeof fetch,
};

async function makePass(p: Record<string, unknown>, secret = SECRET) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: "dela", sub: "", name: "Test", email: "t@test.invalid", jti: crypto.randomUUID(), iat: now, exp: now + 300, ...p };
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  return body + "." + await hmacHex(secret, body);
}

async function call(method: string, path: string, opts: { body?: unknown; session?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { origin: "https://lawfecta.com", ...(opts.headers ?? {}) };
  if (opts.session) headers["x-dela-session"] = opts.session;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) }), deps);
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
}


Deno.test("setup: test database", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  await pool.query("delete from access_list; delete from staff_roles");
});

Deno.test("pass checks", async () => {
  const good = await makePass({ uid: 5 });
  assert(await verifyPass(good, SECRET));
  assertEquals(await verifyPass(await makePass({ uid: 5 }, "another-secret-0123456789abcdefghijklmnop"), SECRET), null, "wrong secret");
  assertEquals(await verifyPass(await makePass({ uid: 5, aud: "sot" }), SECRET), null, "wrong audience");
  assertEquals(await verifyPass(await makePass({ uid: 5, exp: Math.floor(Date.now() / 1000) - 1 }), SECRET), null, "expired");
  assertEquals(await verifyPass(await makePass({ uid: 5, exp: Math.floor(Date.now() / 1000) + 3600 }), SECRET), null, "too far ahead");
  assertEquals(await verifyPass(await makePass({ uid: 5, jti: "short" }), SECRET), null, "jti too short");
  assertEquals(await verifyPass(await makePass({ uid: -1 }), SECRET), null, "bad member");
  assertEquals(await verifyPass(good, "short"), null, "secret not set");
  const [b, s] = good.split(".");
  assertEquals(await verifyPass(b + "x." + s, SECRET), null, "tampered body");
});

Deno.test("cors only allows Lawfecta", async () => {
  const r = await call("GET", "/health", { headers: { origin: "https://evil.invalid" } });
  assertEquals(r.headers.get("access-control-allow-origin"), "https://lawfecta.com");
  const r2 = await call("GET", "/health", { headers: { origin: "https://www.lawfecta.com" } });
  assertEquals(r2.headers.get("access-control-allow-origin"), "https://www.lawfecta.com");
  assertEquals(r.body.environment, "staging");
});

let ownerSession = "";
let attSession = "";

Deno.test("sign in, access list and admin", async () => {
  assertEquals((await call("POST", "/bootstrap", { body: {} })).body.route, "signed_out");
  assertEquals((await call("POST", "/bootstrap", { body: { pass: "junk.junk" } })).body.reason, "bad_pass");

  const p1 = await makePass({ uid: 9001, name: "Stacey" });
  const denied = await call("POST", "/bootstrap", { body: { pass: p1 } });
  assertEquals(denied.body.route, "denied");
  assertEquals(denied.body.reason, "no_access");
  assertEquals((await call("POST", "/bootstrap", { body: { pass: p1 } })).body.reason, "pass_used");

  // Setup step done by Claude: make Stacey the owner after her first sign in
  await pool.query("insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = 9001");
  const ok = await call("POST", "/bootstrap", { body: { pass: await makePass({ uid: 9001, name: "Stacey" }) } });
  assertEquals(ok.body.route, "here");
  assert(ok.body.session.startsWith("ds_"));
  assertEquals(ok.body.me.staff, ["owner"]);
  ownerSession = ok.body.session;

  assertEquals((await call("GET", "/admin/overview")).status, 401, "admin needs a session");
  const ov = await call("GET", "/admin/overview", { session: ownerSession });
  assertEquals(ov.status, 200);
  assertEquals(ov.body.data.environment, "staging");

  // Map plans and add a test attorney
  assertEquals((await call("POST", "/admin/plans/map", { session: ownerSession, body: { plan_code: "att_plus", bd_plan_id: "31" } })).body.data.ok, true);
  assertEquals((await call("POST", "/admin/access/grant", { session: ownerSession, body: { bd_member_id: 9100, channel: "access", note: "Test attorney" } })).body.data.ok, true);
  const att = await call("POST", "/bootstrap", { body: { pass: await makePass({ uid: 9100, sub: "31", name: "Test Attorney" }) } });
  assertEquals(att.body.me.side, "attorney");
  assertEquals(att.body.me.sides[0].plan_code, "att_plus");
  attSession = att.body.session;

  assertEquals((await call("GET", "/admin/overview", { session: attSession })).status, 403, "members cannot open admin");
  assertEquals((await call("GET", "/me", { session: attSession })).body.me.person.name, "Test Attorney");
  assertEquals((await call("GET", "/me", { session: "ds_madeup" })).status, 401);
});

Deno.test("admin changes settings, switches and plans", async () => {
  const bad = await call("POST", "/admin/settings", { session: ownerSession, body: { key: "gig.duration_days", value: "ten", status: "C" } });
  assertEquals(bad.body.data.reason, "wrong_type");
  const good = await call("POST", "/admin/settings", { session: ownerSession, body: { key: "gig.duration_days", value: 14, status: "C", reason: "Confirmed" } });
  assertEquals(good.body.data.ok, true);
  const sw = await call("POST", "/admin/switches", { session: ownerSession, body: { key: "ai_generation", state: "staff" } });
  assertEquals(sw.body.data.ok, true);
  const me = await call("GET", "/me", { session: ownerSession });
  assertEquals(me.body.me.switches.ai_generation, true);
  const attMe = await call("GET", "/me", { session: attSession });
  assertEquals(attMe.body.me.switches.ai_generation, false, "staff-only switch is off for members");

  assertEquals((await call("POST", "/admin/plans/draft", { session: ownerSession, body: { plan_code: "att_plus", monthly_cents: 19.5 } })).status, 400, "cents must be whole");
  const d = await call("POST", "/admin/plans/draft", { session: ownerSession, body: { plan_code: "att_plus", monthly_cents: 2900, features: { "att.gigs_active": { limit: 4 } } } });
  assertEquals(d.body.data.ok, true);
  assertEquals((await call("POST", "/admin/plans/approve", { session: ownerSession, body: { version_id: d.body.data.version_id } })).body.data.ok, true);
  const ent = (await call("GET", "/me", { session: attSession })).body.me.entitlements.find((e: any) => e.key === "att.gigs_active");
  assertEquals(ent.limit, 4, "attorney sees the new limit right away");
  const audit = await call("GET", "/admin/audit", { session: ownerSession });
  assert(audit.body.data.some((a: any) => a.action === "plan_approved"));
});

Deno.test("removing access signs the member out", async () => {
  const list = (await call("GET", "/admin/access", { session: ownerSession })).body.data;
  const row = list.find((a: any) => a.bd_member_id === 9100);
  await call("POST", "/admin/access/revoke", { session: ownerSession, body: { id: row.id } });
  assertEquals((await call("GET", "/me", { session: attSession })).status, 401);
});

Deno.test("notifications and the worker", async () => {
  const t = await call("POST", "/admin/test-notification", { session: ownerSession, body: { email: true } });
  assertEquals(t.body.data.ok, true);
  const items = (await call("GET", "/notifications", { session: ownerSession })).body.items;
  assert(items.length >= 1 && items[0].title === "DELA test notice");
  assertEquals((await call("POST", "/worker", { headers: { "x-dela-worker": "wrong" } })).status, 401);
  const w = await call("POST", "/worker", { headers: { "x-dela-worker": WORKER } });
  assertEquals(w.body.ok, true);
  assert(w.body.leased >= 1);
  const st = (await pool.query("select status, provider from notifications where channel = 'email' and kind = 'test' order by created_at desc limit 1")).rows[0];
  assertEquals(st, { status: "sent", provider: "log" });
  assertEquals((await call("POST", "/notifications/read", { session: ownerSession, body: { all: true } })).body.ok, true);
});

Deno.test("staging testers are handed to Staging by Live", async () => {
  await pool.query("update settings set value = '\"live\"' where key = 'environment'");
  await call("POST", "/admin/access/grant", { session: ownerSession, body: { bd_member_id: 9200, channel: "staging_tester" } });
  const r = await call("POST", "/bootstrap", { body: { pass: await makePass({ uid: 9200 }) } });
  assertEquals(r.body.route, "staging");
  assertEquals(r.body.api, "https://staging.example.invalid/functions/v1/api");
  assertEquals(r.body.session, undefined);
  await pool.query("update settings set value = '\"staging\"' where key = 'environment'");
});

Deno.test("release gate: password, push, GitHub claim and finish", async () => {
  await pool.query("delete from release_approvals; delete from releases; delete from release_password");
  const rel = (await pool.query("select dela_release_record('v0.9.0', repeat('d', 40), 'api-0.2.0', '{}', 'Test release for the API tests', 'https://github.com/SliceOfThanks/lawfecta-dela/actions/runs/1') as id")).rows[0].id;
  assertEquals((await call("POST", "/admin/releases/password", { session: ownerSession, body: { password: "Release-Pass-2026" } })).body.data.ok, true);
  assertEquals((await call("POST", "/admin/releases/push", { session: ownerSession, body: { release_id: rel, password: "Release-Pass-2026" } })).body.data.reason, "not_tested");
  await call("POST", "/admin/releases/tested", { session: ownerSession, body: { release_id: rel, tested: true } });
  assertEquals((await call("POST", "/admin/releases/push", { session: ownerSession, body: { release_id: rel, password: "wrong-password-x" } })).body.data.reason, "wrong_password");

  githubStatus = 500;
  const down = await call("POST", "/admin/releases/push", { session: ownerSession, body: { release_id: rel, password: "Release-Pass-2026" } });
  assertEquals(down.body.data.reason, "github_500");
  assertEquals((await pool.query("select status from releases where id = $1", [rel])).rows[0].status, "tested", "GitHub down: version goes back to tested");

  githubStatus = 204;
  dispatched.length = 0;
  const ok = await call("POST", "/admin/releases/push", { session: ownerSession, body: { release_id: rel, password: "Release-Pass-2026" } });
  assertEquals(ok.body.data.ok, true);
  assertEquals(JSON.stringify(ok.body).includes("nonce"), false, "the approval code never reaches the browser");
  assertEquals(dispatched[0].url, "https://api.github.com/repos/SliceOfThanks/lawfecta-dela/actions/workflows/promote.yml/dispatches");
  assertEquals(dispatched[0].auth, "Bearer gh-token");
  const nonce = dispatched[0].body.inputs.nonce;

  assertEquals((await call("POST", "/release/claim", { body: { release_id: rel, nonce } })).status, 401, "claim needs the CI secret");
  const claim = await call("POST", "/release/claim", { headers: { "x-dela-ci": CI }, body: { release_id: rel, nonce } });
  assertEquals(claim.body.commit, "d".repeat(40));
  assertEquals((await call("POST", "/release/claim", { headers: { "x-dela-ci": CI }, body: { release_id: rel, nonce } })).body.reason, "approval_not_valid");
  await call("POST", "/release/finish", { headers: { "x-dela-ci": CI }, body: { release_id: rel, ok: true, log: "done" } });
  const list = (await call("GET", "/admin/releases", { session: ownerSession })).body.data;
  assertEquals(list.live.version, "v0.9.0");
  assertEquals(list.password_set, true);
});

Deno.test("safety nets: new secret, health, pause, undo", async () => {
  // A pass signed with the new secret works while the secret is being changed
  await pool.query("insert into access_list (bd_member_id, channel) values (9300, 'access') on conflict do nothing");
  const viaNext = await call("POST", "/bootstrap", { body: { pass: await makePass({ uid: 9300 }, "next-shared-secret-0123456789abcdefghij") } });
  assertEquals(viaNext.body.route, "here");
  const memberSession = viaNext.body.session;

  // Health: 503 until the worker has run, 200 after
  await pool.query("update settings set value = '\"1970-01-01T00:00:00Z\"' where key = 'worker.last_run'");
  assertEquals((await call("GET", "/health")).status, 503);
  await call("POST", "/worker", { headers: { "x-dela-worker": WORKER } });
  const h = await call("GET", "/health");
  assertEquals(h.status, 200);
  assertEquals(h.body.worker_ok, true);

  // Pause everything: members see the pause, the owner keeps working
  const ownerPass = await call("POST", "/bootstrap", { body: { pass: await makePass({ uid: 9001, name: "Stacey" }) } });
  const owner = ownerPass.body.session;
  assertEquals((await call("POST", "/admin/pause", { session: owner, body: { area: "all", on: true, reason: "test" } })).body.data.ok, true);
  assertEquals((await call("GET", "/me", { session: memberSession })).status, 503);
  const paused = await call("POST", "/bootstrap", { body: { pass: await makePass({ uid: 9300 }) } });
  assertEquals(paused.body.route, "paused");
  assert(paused.body.message.includes("paused"));
  assertEquals((await call("GET", "/me", { session: owner })).status, 200, "owner still works");
  await call("POST", "/admin/pause", { session: owner, body: { area: "all", on: false, reason: "done" } });
  assertEquals((await call("GET", "/me", { session: memberSession })).status, 200);

  // Email paused: the worker holds emails without using up their tries
  await call("POST", "/admin/pause", { session: owner, body: { area: "email", on: true } });
  await call("POST", "/admin/test-notification", { session: owner, body: { email: true } });
  const w = await call("POST", "/worker", { headers: { "x-dela-worker": WORKER } });
  assert(w.body.done.postponed >= 1, "email held while paused");
  await call("POST", "/admin/pause", { session: owner, body: { area: "email", on: false } });

  // Undo a setting through the admin area
  await call("POST", "/admin/settings", { session: owner, body: { key: "gig.extension_days", value: 10, status: "C", reason: "try" } });
  const hist = (await call("GET", "/admin/settings/history?key=gig.extension_days", { session: owner })).body.data;
  assertEquals((await call("POST", "/admin/settings/undo", { session: owner, body: { history_id: hist[0].id } })).body.data.ok, true);
  assertEquals((await pool.query("select value from settings where key = 'gig.extension_days'")).rows[0].value, 14);

  // Reset Staging needs the typed confirmation
  assertEquals((await call("POST", "/admin/staging/reset", { session: owner, body: {} })).body.data.reason, "confirm_needed");
});

Deno.test("bad requests", async () => {
  assertEquals((await call("GET", "/nope")).status, 404);
  const big = await handle(new Request("http://localhost/api/bootstrap", { method: "POST", body: "x".repeat(70000) }), deps);
  assertEquals(big.status, 413);
  const badJson = await handle(new Request("http://localhost/api/bootstrap", { method: "POST", body: "{nope" }), deps);
  assertEquals(badJson.status, 400);
  assertEquals((await call("POST", "/sign-out", { session: ownerSession })).body.ok, true);
  assertEquals((await call("GET", "/me", { session: ownerSession })).status, 401, "signed out");
});

Deno.test("notice emails stay on the Lawfecta site", () => {
  const base = { title: "Hi <b>", body: "Line", siteUrl: "https://lawfecta.com/", appPath: "/dela", environment: "staging" };
  assertEquals(noticeLink({ ...base, link: "https://evil.invalid" }), "https://lawfecta.com/dela");
  assertEquals(noticeLink({ ...base, link: "//evil.invalid" }), "https://lawfecta.com/dela");
  assertEquals(noticeLink({ ...base, link: "/dela?x=1" }), "https://lawfecta.com/dela?x=1");
  const m = buildNotice({ ...base, link: "" });
  assert(m.subject.startsWith("[Staging]"));
  assert(m.html.includes("Hi &lt;b&gt;"));
});

Deno.test("teardown", async () => {
  await pool.end();
  assertEquals(sent.length, 0);
});

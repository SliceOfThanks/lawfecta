// Tests tools/promote.mjs with stand-ins for Staging, the Supabase management API, git and the Supabase CLI.
// node --test tests/promote_test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { promote } from "../tools/promote.mjs";

const COMMIT = "a".repeat(40);
const env = { GITHUB_REPOSITORY: "SliceOfThanks/lawfecta", GITHUB_TOKEN: "gt", OWNER_BD_MEMBER_ID: "42", STAGING_API_URL: "https://staging.test/functions/v1/api", RELEASE_CI_SECRET: "x".repeat(40), RELEASE_ID: "3", NONCE: "n".repeat(64), SUPABASE_ACCESS_TOKEN: "t", LIVE_PROJECT_REF: "liveref" };

function fake({ testsOk = true, claimOk = true, applied = [], health = { ok: true, environment: "live", version: "api-0.2.0" }, healthAfter = null, dbFailOn = null, watch = 0, action = "push", stopWatch = false } = {}) {
  const calls = { queries: [], finish: null, run: [], steps: [], ticks: [], watchEnd: null };
  let healthCalls = 0;
  const fetchFn = async (url, opts = {}) => {
    const body = opts.body ? JSON.parse(opts.body) : null;
    const res = (status, obj) => ({ ok: status < 300, status, json: async () => obj, text: async () => JSON.stringify(obj) });
    if (url.endsWith("/release/claim")) {
      assert.equal(opts.headers["x-dela-ci"], env.RELEASE_CI_SECRET);
      return res(200, claimOk ? { ok: true, action, version: "v0.2.0", commit: COMMIT, migrations: [], watch_minutes: watch } : { ok: false, reason: "approval_not_valid" });
    }
    if (url.endsWith("/release/finish")) { calls.finish = body; return res(200, { ok: true }); }
    if (url.endsWith("/release/step")) { calls.steps.push(body.key); return res(200, { ok: true }); }
    if (url.endsWith("/release/watch")) { calls.ticks.push(body.ok); return res(200, { ok: true, continue: !stopWatch }); }
    if (url.endsWith("/release/watch-end")) { calls.watchEnd = body; return res(200, { ok: true }); }
    if (url.includes("/database/query")) {
      calls.queries.push(body.query);
      if (dbFailOn && body.query.includes(dbFailOn)) return res(400, { message: "syntax error" });
      if (body.query.startsWith("select name from dela_schema_migrations")) return res(200, applied.map((name) => ({ name })));
      if (body.query.includes("as v from settings")) return res(200, [{ v: "b".repeat(40) }]);
      return res(200, []);
    }
    if (url.endsWith("/api/health")) { healthCalls++; return res(200, healthCalls > 1 && healthAfter ? healthAfter : health); }
    if (url.includes("/check-runs")) return res(200, { check_runs: testsOk ? [{ name: "tests", conclusion: "success" }] : [{ name: "tests", conclusion: "failure" }] });
    throw new Error("unexpected " + url);
  };
  const run = (cmd, args) => { calls.run.push([cmd, ...args].join(" ")); return ""; };
  return { calls, fetchFn, run };
}

test("refused approval changes nothing on Live", async () => {
  const f = fake({ claimOk: false });
  await assert.rejects(promote({ env, fetchFn: f.fetchFn, run: f.run }), /refused the approval/);
  assert.equal(f.calls.queries.length, 0);
  assert.equal(f.calls.run.length, 0);
});

test("applies only new migrations, deploys, switches code, reports live", async () => {
  const f = fake({ applied: ["0001_foundation_tables.sql", "0002_foundation_functions.sql"] });
  const r = await promote({ env, fetchFn: f.fetchFn, run: f.run });
  assert.equal(r.ok, true);
  const applied = f.calls.queries.filter((q) => q.includes("insert into dela_schema_migrations"));
  assert.ok(applied.every((q) => !q.includes("'0001_foundation_tables.sql'")), "old migrations are not run again");
  assert.ok(applied.some((q) => q.includes("'0007_release_gate.sql'")), "new migration applied");
  assert.ok(f.calls.queries.some((q) => q.includes("vault.create_secret")), "worker address set before the cron migration");
  assert.ok(f.calls.run[0].startsWith("git checkout --quiet " + COMMIT), "exact approved commit");
  assert.ok(f.calls.run.some((c) => c.includes("functions deploy api --project-ref liveref --no-verify-jwt")));
  assert.ok(f.calls.queries.some((q) => q.includes("key = 'code_version'") && q.includes(COMMIT)));
  assert.ok(f.calls.queries.some((q) => q.includes("bootstrap.owner_bd_member_id") && q.includes("'42'")), "first owner named on Live");
  assert.equal(f.calls.finish.ok, true);
});

test("a version without passing tests never touches Live", async () => {
  const f = fake({ testsOk: false });
  await assert.rejects(promote({ env, fetchFn: f.fetchFn, run: f.run }), /no passing automatic tests/);
  assert.equal(f.calls.queries.length, 0, "no database change on Live");
  assert.equal(f.calls.finish.ok, false);
});

test("a failing migration stops before deploy and reports failure", async () => {
  const f = fake({ dbFailOn: "0005_email" });
  await assert.rejects(promote({ env, fetchFn: f.fetchFn, run: f.run }), /database 400/);
  assert.ok(!f.calls.run.some((c) => c.includes("functions deploy")), "api not deployed");
  assert.ok(!f.calls.queries.some((q) => q.includes("key = 'code_version'")), "Live code not switched");
  assert.equal(f.calls.finish.ok, false);
});

test("failed health check puts Live back on the previous version and reports failure", async () => {
  const f = fake({ applied: [], health: { ok: false } });
  await assert.rejects(promote({ env, fetchFn: f.fetchFn, run: f.run }), /health check failed/);
  assert.ok(f.calls.run.some((c) => c === "git checkout --quiet " + "b".repeat(40)), "previous commit checked out");
  assert.equal(f.calls.run.filter((c) => c.includes("functions deploy")).length, 2, "previous api redeployed");
  assert.ok(f.calls.queries.at(-1).includes("b".repeat(40)), "previous code version restored");
  assert.equal(f.calls.finish.ok, false);
  assert.ok(f.calls.finish.log.includes("back on bbbbbbb"));
});

const quick = { sleep: async () => {}, watchEveryMs: 20000 };

test("each step is reported to the dashboard in order", async () => {
  const f = fake({ applied: [] });
  await promote({ env, fetchFn: f.fetchFn, run: f.run, ...quick });
  assert.deepEqual(f.calls.steps, ["approval", "tests", "database", "api", "switch", "health"]);
  assert.equal(f.calls.finish.live_ref, "liveref");
});

test("the watch after a push passes when Live stays healthy", async () => {
  const f = fake({ applied: [], watch: 1 });
  const r = await promote({ env, fetchFn: f.fetchFn, run: f.run, ...quick });
  assert.equal(r.ok, true);
  assert.equal(f.calls.ticks.length, 3, "1 minute at one check every 20 seconds");
  assert.equal(f.calls.watchEnd.result, "passed");
  assert.equal(f.calls.run.filter((c) => c.includes("functions deploy")).length, 1, "nothing redeployed");
});

test("Live unhealthy 3 times in a row during the watch goes back by itself", async () => {
  const f = fake({ applied: [], watch: 2, healthAfter: { ok: false, environment: "live" } });
  const r = await promote({ env, fetchFn: f.fetchFn, run: f.run, ...quick });
  assert.equal(r.ok, false, "the GitHub run shows a problem");
  assert.deepEqual(f.calls.ticks, [false, false, false], "stops checking once it goes back");
  assert.ok(f.calls.run.includes("git checkout --quiet " + "b".repeat(40)), "previous version checked out");
  assert.equal(f.calls.run.filter((c) => c.includes("functions deploy")).length, 2, "previous api deployed");
  assert.ok(f.calls.queries.at(-1).includes("b".repeat(40)), "previous screens restored");
  assert.equal(f.calls.watchEnd.result, "went_back");
  assert.equal(f.calls.finish.ok, true, "the push itself had finished");
});

test("the watch stops when the owner starts a go back", async () => {
  const f = fake({ applied: [], watch: 5, stopWatch: true });
  const r = await promote({ env, fetchFn: f.fetchFn, run: f.run, ...quick });
  assert.equal(r.ok, true);
  assert.equal(f.calls.ticks.length, 1);
  assert.equal(f.calls.watchEnd.result, "stopped");
});

test("going back to an earlier version is not watched", async () => {
  const f = fake({ applied: [], watch: 0, action: "rollback" });
  const r = await promote({ env, fetchFn: f.fetchFn, run: f.run, ...quick });
  assert.equal(r.ok, true);
  assert.equal(f.calls.ticks.length, 0);
  assert.equal(f.calls.watchEnd, null);
});

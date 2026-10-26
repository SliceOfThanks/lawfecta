// Tests tools/promote.mjs with stand-ins for Staging, the Supabase management API, git and the Supabase CLI.
// node --test tests/promote_test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { promote } from "../tools/promote.mjs";

const COMMIT = "a".repeat(40);
const env = { OWNER_BD_MEMBER_ID: "42", STAGING_API_URL: "https://staging.test/functions/v1/api", RELEASE_CI_SECRET: "x".repeat(40), RELEASE_ID: "3", NONCE: "n".repeat(64), SUPABASE_ACCESS_TOKEN: "t", LIVE_PROJECT_REF: "liveref" };

function fake({ claimOk = true, applied = [], health = { ok: true, environment: "live", version: "api-0.2.0" }, dbFailOn = null } = {}) {
  const calls = { queries: [], finish: null, run: [] };
  const fetchFn = async (url, opts = {}) => {
    const body = opts.body ? JSON.parse(opts.body) : null;
    const res = (status, obj) => ({ ok: status < 300, status, json: async () => obj, text: async () => JSON.stringify(obj) });
    if (url.endsWith("/release/claim")) {
      assert.equal(opts.headers["x-dela-ci"], env.RELEASE_CI_SECRET);
      return res(200, claimOk ? { ok: true, action: "push", version: "v0.2.0", commit: COMMIT, migrations: [] } : { ok: false, reason: "approval_not_valid" });
    }
    if (url.endsWith("/release/finish")) { calls.finish = body; return res(200, { ok: true }); }
    if (url.includes("/database/query")) {
      calls.queries.push(body.query);
      if (dbFailOn && body.query.includes(dbFailOn)) return res(400, { message: "syntax error" });
      if (body.query.startsWith("select name from dela_schema_migrations")) return res(200, applied.map((name) => ({ name })));
      if (body.query.includes("as v from settings")) return res(200, [{ v: "b".repeat(40) }]);
      return res(200, []);
    }
    if (url.endsWith("/api/health")) return res(200, health);
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

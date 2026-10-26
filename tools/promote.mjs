// Pushes one approved DELA version from Staging to Live. Runs only in GitHub Actions (.github/workflows/promote.yml).
// It does nothing on Live until Staging confirms Stacey's one-use, password-checked approval.
// Steps: claim approval -> check out the approved commit -> apply new database migrations to Live -> deploy the api
// function -> point Live at the approved code version -> health check -> report back to Staging.
// Database migrations are only ever added, so a rollback switches code and api back and keeps the data.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const need = (k) => { const v = process.env[k]; if (!v) throw new Error("missing " + k); return v; };

export async function promote({ env, fetchFn = fetch, run = (cmd, args) => execFileSync(cmd, args, { stdio: "pipe", env: process.env }).toString(), root = process.cwd() }) {
  const log = [];
  const say = (m) => { log.push(new Date().toISOString().slice(11, 19) + " " + m); console.log(m); };
  const staging = env.STAGING_API_URL.replace(/\/+$/, "");
  const ci = { "content-type": "application/json", "x-dela-ci": env.RELEASE_CI_SECRET };
  const releaseId = Number(env.RELEASE_ID);
  const ref = env.LIVE_PROJECT_REF;
  const mgmt = async (query) => {
    const r = await fetchFn(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST", headers: { authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify({ query }),
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`database ${r.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : [];
  };
  const sqlText = (s) => "'" + String(s).replaceAll("'", "''") + "'";

  const claimRes = await fetchFn(staging + "/release/claim", { method: "POST", headers: ci, body: JSON.stringify({ release_id: releaseId, nonce: env.NONCE }) });
  const claim = await claimRes.json().catch(() => ({}));
  if (!claim.ok) throw Object.assign(new Error("Staging refused the approval: " + (claim.reason || claimRes.status)), { claimed: false });
  say(`approved ${claim.action} of ${claim.version} (${claim.commit.slice(0, 7)})`);

  let previous = null;
  let deployed = false;
  try {
    if (!/^[0-9a-f]{40}$/.test(claim.commit)) throw new Error("bad commit");
    // Only a commit whose automatic tests passed may reach Live
    if (env.GITHUB_REPOSITORY) {
      const cr = await fetchFn(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/commits/${claim.commit}/check-runs?check_name=tests`, {
        headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
      });
      const runs = (await cr.json().catch(() => ({}))).check_runs ?? [];
      if (!runs.some((r) => r.conclusion === "success")) throw new Error("this version has no passing automatic tests");
      say("automatic tests passed for this version");
    }
    run("git", ["checkout", "--quiet", claim.commit]);
    say("checked out the approved commit");

    await mgmt(`create table if not exists dela_schema_migrations (name text primary key, applied_at timestamptz not null default now(), release text not null default '');
      alter table dela_schema_migrations enable row level security; revoke all on dela_schema_migrations from anon, authenticated;`);
    const done = new Set((await mgmt("select name from dela_schema_migrations")).map((r) => r.name));
    const files = readdirSync(join(root, "supabase/migrations")).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
    for (const f of files) {
      if (done.has(f)) continue;
      if (f.includes("cron")) {
        await mgmt(`select vault.create_secret(${sqlText(`https://${ref}.supabase.co`)}, 'dela_project_url', 'Live project address for the worker')
          where not exists (select 1 from vault.secrets where name = 'dela_project_url')`);
      }
      await mgmt(readFileSync(join(root, "supabase/migrations", f), "utf8") + `\ninsert into dela_schema_migrations (name, release) values (${sqlText(f)}, ${sqlText(claim.version)});`);
      say("applied " + f);
    }
    // This copy is Live; it never offers the push button
    await mgmt(`update settings set value = '"live"' where key = 'environment' and value <> '"live"'`);
    // First push only: name Stacey as the member who becomes owner at her first sign in (ignored once an owner exists)
    if (/^[0-9]+$/.test(env.OWNER_BD_MEMBER_ID || "")) {
      await mgmt(`update settings set value = '${env.OWNER_BD_MEMBER_ID}'::jsonb where key = 'bootstrap.owner_bd_member_id' and value = '0'::jsonb`);
    }

    const prev = await mgmt("select value #>> '{}' as v from settings where key = 'code_version'");
    previous = prev[0] && /^[0-9a-f]{40}$/.test(prev[0].v) ? prev[0].v : null;
    deployed = true;
    run("npx", ["--yes", "supabase@2.20.12", "functions", "deploy", "api", "--project-ref", ref, "--no-verify-jwt"]);
    say("deployed the api");

    await mgmt(`update settings set value = to_jsonb(${sqlText(claim.commit)}::text), version = version + 1, updated_at = now() where key = 'code_version'`);
    say("Live now loads " + claim.commit.slice(0, 7));

    const h = await (await fetchFn(`https://${ref}.supabase.co/functions/v1/api/health`)).json().catch(() => ({}));
    if (!h.ok || h.environment !== "live") throw new Error("health check failed: " + JSON.stringify(h).slice(0, 200));
    say("health check passed (" + h.version + ")");

    await fetchFn(staging + "/release/finish", { method: "POST", headers: ci, body: JSON.stringify({ release_id: releaseId, ok: true, log: log.join("\n") }) });
    return { ok: true, log };
  } catch (e) {
    say("stopped: " + String(e.message || e).slice(0, 500));
    // Put Live back on the version it had, so members never stay on a half-finished push
    if (deployed && previous) {
      try {
        run("git", ["checkout", "--quiet", previous]);
        run("npx", ["--yes", "supabase@2.20.12", "functions", "deploy", "api", "--project-ref", ref, "--no-verify-jwt"]);
        await mgmt(`update settings set value = to_jsonb(${sqlText(previous)}::text), version = version + 1, updated_at = now() where key = 'code_version'`);
        say("Live is back on " + previous.slice(0, 7));
      } catch (e2) {
        say("could not put Live back automatically: " + String(e2.message || e2).slice(0, 300));
      }
    }
    await fetchFn(staging + "/release/finish", { method: "POST", headers: ci, body: JSON.stringify({ release_id: releaseId, ok: false, log: log.join("\n") }) }).catch(() => {});
    throw e;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = {};
  for (const k of ["STAGING_API_URL", "RELEASE_CI_SECRET", "RELEASE_ID", "NONCE", "SUPABASE_ACCESS_TOKEN", "LIVE_PROJECT_REF"]) env[k] = need(k);
  env.OWNER_BD_MEMBER_ID = process.env.OWNER_BD_MEMBER_ID || "";
  env.GITHUB_REPOSITORY = need("GITHUB_REPOSITORY");
  env.GITHUB_TOKEN = need("GITHUB_TOKEN");
  promote({ env }).then(() => process.exit(0), (e) => { console.error(String(e.message || e)); process.exit(1); });
}

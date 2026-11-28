// Step 94 API tests (docs/briefs/step-94-code-store.md): DELA's own copy of each released version.
// A stand-in GitHub and a stand-in Supabase Storage. A version is copied file by file and checked against GitHub's
// fingerprint; only what a browser loads goes where a browser can read it; test files are never copied; the pages are
// told the new address only when the copy is complete and the setting says so; a version that was not copied cannot
// be released; a private repository without a key fails with a plain reason; the server's files are removed again.
// Run after tools/dbtest.sh:   deno test -A supabase/functions/api/code_store_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { gitSha, plan, typeOf } from "./lib/code/store.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const RUN = (Date.now() % 1000000).toString(16).padStart(6, "0");
const WORKER = "test-worker-secret-code-0123456789abcdef";
const SVC = "service-key-for-tests", SUPA = "https://proj.supabase.test";
const C1 = (RUN + "a".repeat(40)).slice(0, 40), C2 = (RUN + "b".repeat(40)).slice(0, 40), C3 = (RUN + "c".repeat(40)).slice(0, 40);
const bytes = (s: string) => new TextEncoder().encode(s);
// The files of the stand-in repository at every version
const REPO: Record<string, string> = {
  "shared/dela-core.js": "window.D = {};", "app/dela-app.js": "/* app */", "app/dela-security.js": "/* security */", "admin/dela-admin.js": "/* admin */",
  "brand/lawfecta-mark-192.png": "PNG", "docs/images/recovery/1-backups-list.jpg": "JPG",
  "supabase/functions/api/app.ts": "export const handle = 1;", "supabase/functions/api/lib/http.ts": "export const x = 1;",
  "supabase/functions/api/app_test.ts": "secret test", "tests/pw/move-test.js": "browser test", "docs/SESSION_HANDOFF.md": "notes", "CLAUDE.md": "rules",
  "supabase/migrations/0170_audit_fixes.sql": "select 1;", "supabase/migrations/0171_code_store.sql": "select 2;", "widgets/DELA-App.php": "<?php ?>",
};
let token = "", isPrivate = false, tamper = "", githubDown = false;
const stored = new Map<string, { type: string; body: string; cache: string }>();
const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const h = (init.headers ?? {}) as Record<string, string>;
  if (url.hostname === "api.github.com" || url.hostname === "raw.githubusercontent.com") {
    if (githubDown) return new Response("down", { status: 503 });
    const authed = h.authorization === "Bearer good-token";
    if (isPrivate && !authed) return new Response("{}", { status: 404 });
    if (url.pathname.includes("/git/trees/")) {
      const tree = await Promise.all(Object.entries(REPO).map(async ([path, body]) => ({ path, type: "blob", sha: await gitSha(bytes(body)) })));
      return Response.json({ tree: [...tree, { path: "app", type: "tree", sha: "x" }], truncated: false });
    }
    const path = url.hostname === "api.github.com" ? url.pathname.split("/contents/")[1] : url.pathname.split("/").slice(4).join("/");
    if (!(path in REPO)) return new Response("{}", { status: 404 });
    return new Response(path === tamper ? REPO[path] + " changed on the way" : REPO[path]);
  }
  if (url.origin === SUPA && url.pathname.startsWith("/storage/v1/object/dela-code")) {
    if (h.authorization !== "Bearer " + SVC) return new Response("{}", { status: 401 });
    if (init.method === "DELETE") { for (const p of (JSON.parse(String(init.body)).prefixes as string[])) stored.delete(p); return Response.json([]); }
    const to = decodeURIComponent(url.pathname.slice("/storage/v1/object/dela-code/".length));
    stored.set(to, { type: h["content-type"], body: new TextDecoder().decode(init.body as Uint8Array), cache: h["cache-control"] ?? "" });
    return Response.json({ Key: to });
  }
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const deps: Deps = { rpc, env: (k) => ({ DELA_WORKER_SECRET: WORKER, DELA_ORIGINS: "https://lawfecta.com", SUPABASE_URL: SUPA, SUPABASE_SERVICE_ROLE_KEY: SVC, GITHUB_CODE_TOKEN: token } as Record<string, string>)[k] ?? "", fetch: fakeFetch };
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
async function work(times = 3) {
  for (let i = 0; i < times; i++) {
    await pool.query("update jobs set run_at = now() where status in ('queued', 'delayed') and kind in ('code_pull', 'code_seal')");
    await handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
  }
}
const boot = async () => await (await handle(new Request("http://localhost/functions/v1/api/bootstrap", { method: "POST", headers: { origin: "https://lawfecta.com", "content-type": "application/json" }, body: JSON.stringify({ pass: "", why: "" }) }), deps)).json() as Record<string, any>;
const row = async (c: string) => (await one("select dela_code_row($1) r", [c])).r as Record<string, any>;
let was: Array<{ key: string; value: unknown }> = [];

Deno.test("setup", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  was = (await pool.query("select key, value from settings where key in ('code_version', 'code.source', 'code.repo')")).rows;
  await pool.query("update settings set value = '\"owner/repo\"' where key = 'code.repo'");
});

Deno.test("which files are copied: what a browser loads, the server's own files under a random name, never a test or a document", async () => {
  const tree = await Promise.all(Object.keys(REPO).map(async (path) => ({ path, type: "blob", sha: await gitSha(bytes(REPO[path])) })));
  const p = plan([...tree, { path: "app/../CLAUDE.md", type: "blob", sha: "x" }], C1, "k".repeat(32), ["0171_code_store.sql", "../../x.sql"]);
  const to = Object.fromEntries(p.map((x) => [x.path, x.to]));
  assertEquals(to["shared/dela-core.js"], C1 + "/shared/dela-core.js");
  assertEquals(to["supabase/functions/api/app.ts"], C1 + "/_s/" + "k".repeat(32) + "/supabase/functions/api/app.ts");
  assertEquals(to["supabase/migrations/0171_code_store.sql"], C1 + "/_s/" + "k".repeat(32) + "/supabase/migrations/0171_code_store.sql");
  for (const never of ["supabase/functions/api/app_test.ts", "tests/pw/move-test.js", "docs/SESSION_HANDOFF.md", "CLAUDE.md", "widgets/DELA-App.php", "supabase/migrations/0170_audit_fixes.sql", "app/../CLAUDE.md"]) assert(!(never in to), "never copied: " + never);
  assertEquals(p.filter((x) => !x.server).length, 6);
  assertEquals([typeOf("a.js"), typeOf("a.ts"), typeOf("a.png"), typeOf("a.md")], ["text/javascript", "application/typescript", "image/png", ""]);
  // Git's own fingerprint of an empty file
  assertEquals(await gitSha(new Uint8Array()), "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
});

Deno.test("a version is copied whole, and the pages are told the new address only when the setting says so", async () => {
  assertEquals((await one("select dela_code_pull('not-a-commit') r")).r.reason, "bad_commit");
  assertEquals((await one("select dela_code_pull($1, array['0171_code_store.sql']) r", [C1])).r.status, "pulling");
  await work();
  const r = await row(C1);
  assertEquals([r.status, r.files, r.problem], ["ready", 9, ""], JSON.stringify(r));
  const core = stored.get(C1 + "/shared/dela-core.js")!;
  assertEquals([core.type, core.body, core.cache], ["text/javascript", "window.D = {};", "max-age=31536000"]);
  assert(stored.has(C1 + "/_s/" + r.key + "/supabase/functions/api/app.ts") && stored.has(C1 + "/_s/" + r.key + "/supabase/migrations/0171_code_store.sql"), "the server's files sit under the random name");
  assert(![...stored.keys()].some((k) => k.includes("_test") || k.includes("CLAUDE") || k.includes("SESSION_HANDOFF") || k.includes("widgets/")), "no test, document or widget was copied");
  assertEquals([...stored.keys()].filter((k) => !k.includes("/_s/")).length, 6, "only the six browser files are where a browser can read them");
  // The setting still says jsdelivr: the pages are told nothing new
  await pool.query("update settings set value = to_jsonb($1::text) where key = 'code_version'", [C1]);
  await pool.query("update settings set value = '\"jsdelivr\"' where key = 'code.source'");
  const before = await boot();
  assertEquals([before.commit, before.base], [C1, undefined]);
  await pool.query("update settings set value = '\"storage\"' where key = 'code.source'");
  const after = await boot();
  assertEquals([after.commit, after.base], [C1, SUPA + "/storage/v1/object/public/dela-code/" + C1]);
  assert(!JSON.stringify(after).includes(r.key) && !JSON.stringify(after).includes(SVC), "neither the random name nor a key is ever sent to a browser");
  // Asking again for a version that is ready changes nothing
  assertEquals((await one("select dela_code_pull($1) r", [C1])).r.status, "ready");
});

Deno.test("with DELA's own copy in use, a version that was not copied cannot be released, and the pages keep the old address for it", async () => {
  assertEquals((await one("select dela_code_release($1) r", [C2])).r, { ok: false, reason: "not_copied" });
  assertEquals((await one("select value #>> '{}' v from settings where key = 'code_version'")).v, C1, "the live version did not move");
  await one("select dela_code_pull($1) r", [C2]);
  await work();
  assertEquals((await one("select dela_code_release($1) r", [C2])).r.ok, true);
  assertEquals((await boot()).base, SUPA + "/storage/v1/object/public/dela-code/" + C2);
});

Deno.test("a file that does not match GitHub's fingerprint stops the copy; GitHub being down is tried again", async () => {
  tamper = "app/dela-app.js";
  await one("select dela_code_pull($1) r", [C3]);
  await work();
  let r = await row(C3);
  assertEquals(r.status, "failed");
  assert(r.problem.includes("fingerprint") && r.problem.includes("app/dela-app.js"), r.problem);
  assertEquals((await one("select dela_code_release($1) r", [C3])).r.reason, "not_copied");
  tamper = "";
  githubDown = true;
  await one("select dela_code_pull($1) r", [C3]);
  await work(1);
  r = await row(C3);
  assertEquals(r.status, "pulling", "a server error at GitHub is not a failure");
  githubDown = false;
  await pool.query("update jobs set run_at = now(), status = 'queued' where kind = 'code_pull' and status in ('delayed', 'queued')");
  await work();
  assertEquals((await row(C3)).status, "ready");
});

Deno.test("a private repository: without the key the copy fails with a plain reason, with it the copy works", async () => {
  const C4 = (RUN + "d".repeat(40)).slice(0, 40);
  isPrivate = true; token = "";
  await one("select dela_code_pull($1) r", [C4]);
  await work();
  const r = await row(C4);
  assertEquals(r.status, "failed");
  assert(r.problem.includes("GITHUB_CODE_TOKEN") && r.problem.includes("private"), r.problem);
  token = "good-token";
  await one("select dela_code_pull($1) r", [C4]);
  await work();
  assertEquals((await row(C4)).status, "ready");
  isPrivate = false; token = "";
});

Deno.test("after the release the server's files are taken out of the store; the browser's stay", async () => {
  const key = (await row(C1)).key;
  assert(stored.has(C1 + "/_s/" + key + "/supabase/functions/api/app.ts"));
  assertEquals((await one("select dela_code_seal($1) r", [C1])).r.ok, true);
  await work();
  assert(![...stored.keys()].some((k) => k.startsWith(C1 + "/_s/")), "the server's files are gone");
  assert(stored.has(C1 + "/shared/dela-core.js"), "the pages' files stay");
  const r = await row(C1);
  assert(r.sealed_at && r.status === "ready");
});

Deno.test("teardown", async () => {
  for (const w of was) await pool.query("update settings set value = $1::jsonb where key = $2", [JSON.stringify(w.value), w.key]);
  await pool.query("update jobs set status = 'canceled' where kind in ('code_pull', 'code_seal') and status in ('queued', 'delayed')");
  await pool.end();
});

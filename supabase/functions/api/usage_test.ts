// Step 9b: attorney plan usage limits through the real api and database. The new numbers per plan; one shared AI
// counter for a Business firm; bonus credits from the Lawfecta Team (a note is required, the plan does not change);
// read-only documents over the limit after a downgrade, only while usage_limits_enforced is on; the Usage page; the
// admin usage list with AI cost; the BD plan sync (a plan set by hand is kept; a failed BD read changes nothing).
//   deno test -A supabase/functions/api/usage_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const env: Record<string, string> = { DELA_ORIGINS: "https://lawfecta.com", BD_API_KEY: "bd_test_key" }; // rules-ok: a made-up test key
const bdPlans = new Map<number, number>();
let bdDown = false;
const fakeFetch = (async (input: string | URL | Request) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const m = /\/api\/v2\/user\/get\/(\d+)$/.exec(url);
  if (m) {
    if (bdDown) return new Response("down", { status: 503 });
    const id = Number(m[1]);
    return Response.json({ status: "success", message: [{ user_id: id, subscription_id: String(bdPlans.get(id) ?? 0) }] });
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
async function member(k: number, plan: string, source = "staff_grant"): Promise<M> {
  const bd = 9_300_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Usage " + k, `us${bd}@test.invalid`])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, $4)", [id, side, plan, source]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
const reserve = async (who: M, n: number, key: string) => (await rpc("dela_quota_reserve", { p_person: who.id, p_side: "attorney", p_feature: "ai.runs", p_amount: n, p_idem: key, p_ref: "test" })) as Record<string, any>;
let free: M, owner: M, staffer: M, team: M, synced: M;
let siteUrl: unknown = null;

Deno.test("setup", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('playbook_library', 'ai_generation')");
  await pool.query("update feature_switches set state = 'off' where key = 'usage_limits_enforced'");
  siteUrl = (await one("select value from settings where key = 'site.url'"))?.value ?? null;
  await pool.query("update settings set value = '\"https://bd.test\"' where key = 'site.url'");
  free = await member(1, "att_free"); owner = await member(2, "att_business"); staffer = await member(3, "att_free"); team = await member(4, "att_free");
  synced = await member(5, "att_free", "bd");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'owner')", [team.id]);
  // Earlier database tests leave other numbers on Attorney Free; put back the step 9b numbers through the admin's own draft and approve
  const d = (await rpc("dela_admin_plan_draft", { p_actor: team.id, p_plan: "att_free", p: { features: { "att.playbooks_saved": { enabled: true, limit: 3 }, "ai.runs": { enabled: true, limit: 50 }, "storage.mb": { enabled: true, limit: 1024 } } } })) as Record<string, any>;
  assert((await rpc("dela_admin_plan_approve", { p_actor: team.id, p_version: d.version_id }) as Record<string, any>).ok);
  // The staffer works in the Business owner's firm workspace
  const firm = (await one("select dela_side_org($1, 'attorney') o", [owner.id])).o;
  await pool.query("insert into org_members (org_id, person_id, member_role) values ($1, $2, 'member')", [firm, staffer.id]);
  await pool.query("update side_profiles set org_id = $1 where person_id = $2 and side = 'attorney'", [firm, staffer.id]);
});

Deno.test("the Subscription page data: the member's plan, and the four plans of their workspace with price, fee and allowances (step 16)", async () => {
  const r = (await call("GET", "/subscription", free.token)).body;
  assertEquals([r.ok, r.side, r.plan_code, r.warn_pct, r.upgrade_url], [true, "attorney", "att_free", 80, "/account/upgrade"], JSON.stringify(r).slice(0, 300));
  assertEquals(r.plans.map((p: any) => p.code), ["att_free", "att_plus", "att_pro", "att_business"]);
  assertEquals(r.plans.filter((p: any) => p.current).map((p: any) => p.code), ["att_free"]);
  const plus = r.plans[1];
  assert(plus.rank === 1 && plus.monthly_cents > 0 && plus.fee_bps > 0 && plus.features.some((f: any) => f.key === "ai.runs" && f.enabled), JSON.stringify(plus).slice(0, 300));
  assertEquals((await call("GET", "/subscription", "")).status, 401);
});

Deno.test("the new numbers: Free 3 documents, 50 credits, 1 GB; Business unlimited documents, 2,500 credits, 200 GB", async () => {
  const u = (await call("GET", "/usage", free.token)).body;
  assertEquals([u.playbooks.limit, u.actions.limit, u.storage.limit_bytes], [3, 50, 1024 * 1048576], JSON.stringify(u));
  assertEquals([u.enforced, u.warn_pct, u.upgrade_url, u.next_plan], [false, 80, "/account/upgrade", "Attorney Plus"]);
  assertEquals(new Date(u.resets_on).getUTCDate(), 1, "credits reset on the 1st");
  const b = (await call("GET", "/usage", owner.token)).body;
  assertEquals([b.playbooks.limit, b.actions.limit, b.storage.limit_bytes], [null, 2500, 204800 * 1048576]);
  const plus = await one("select pf.quota_limit l from plan_features pf join plan_versions v on v.id = pf.plan_version_id where v.plan_code = 'att_plus' and v.status = 'approved' and pf.feature_key = 'ai.runs'");
  assertEquals(plus.l, 300);
  const fl = await one("select pf.quota_limit l from plan_features pf join plan_versions v on v.id = pf.plan_version_id where v.plan_code = 'fl_free' and v.status = 'approved' and pf.feature_key = 'ai.runs'");
  assertEquals(fl.l, 25, "freelancer limits are unchanged");
  // Stacey 2026-11-13: freelancer Pro and Business storage are whole GB (5,120 and 20,480 MB), so the page reads "5 GB" and "20 GB"
  const fs = await pool.query("select v.plan_code c, pf.quota_limit l from plan_features pf join plan_versions v on v.id = pf.plan_version_id where v.plan_code in ('fl_pro', 'fl_business') and v.status = 'approved' and pf.feature_key = 'storage.mb' order by 1");
  assertEquals(fs.rows.map((x: any) => [x.c, Number(x.l)]), [["fl_business", 20480], ["fl_pro", 5120]]);
});

Deno.test("a Business firm shares one counter; a Free attorney has their own; the limit stops at 100%", async () => {
  assert((await reserve(staffer, 10, "u-s1")).ok);
  const ownerUse = (await call("GET", "/usage", owner.token)).body.actions;
  assertEquals(ownerUse.used, 10, "the staffer's credits count against the firm");
  const st = (await call("GET", "/usage", staffer.token)).body.actions;
  assertEquals([st.used, st.limit, st.shared], [10, 2500, true]);
  assert((await reserve(free, 50, "u-f1")).ok);
  const r = await reserve(free, 1, "u-f2");
  assertEquals([r.ok, r.reason, r.remaining], [false, "limit_reached", 0]);
  assert(r.resets_on, "the refusal says when credits reset");
  assertEquals((await reserve(free, 50, "u-f1")).duplicate, true, "the same request twice counts once");
});

Deno.test("bonus credits: the Lawfecta Team only, a note required, this month only, the plan unchanged", async () => {
  assertEquals((await call("POST", "/admin/usage/bonus", free.token, { person_id: free.id, amount: 20, note: "x" })).status, 403);
  assertEquals((await call("POST", "/admin/usage/bonus", team.token, { person_id: free.id, amount: 20, note: " " })).body.reason, "note_required");
  assert((await call("POST", "/admin/usage/bonus", team.token, { person_id: free.id, amount: 20, note: "Launch week" })).body.ok);
  // Fix (AI review 0.9.0, payments 2): the same grant sent twice (a double click) adds the bonus once
  const extra = await member(9, "att_free");
  const before = Number((await pool.query("select coalesce(sum(amount), 0) n from usage_bonus where person_id = $1", [extra.id])).rows[0].n);
  const req = "bonus-" + crypto.randomUUID();
  const g1 = (await call("POST", "/admin/usage/bonus", team.token, { person_id: extra.id, amount: 7, note: "Double click", request_id: req })).body;
  const g2 = (await call("POST", "/admin/usage/bonus", team.token, { person_id: extra.id, amount: 7, note: "Double click", request_id: req })).body;
  assertEquals([g1.ok, g2.ok, g2.duplicate, g2.id === g1.id], [true, true, true, true]);
  const after = Number((await pool.query("select coalesce(sum(amount), 0) n from usage_bonus where person_id = $1", [extra.id])).rows[0].n);
  assertEquals(after - before, 7, "added once");
  assertEquals((await call("GET", "/usage", free.token)).body.actions.limit, 70);
  assert((await reserve(free, 20, "u-f3")).ok, "the bonus can be used");
  assertEquals((await one("select plan_code from side_profiles where person_id = $1 and side = 'attorney'", [free.id])).plan_code, "att_free");
  assertEquals((await one("select count(*)::int c from audit_log where action = 'usage_bonus_granted' and object_id = $1", [free.id])).c, 1);
});

Deno.test("read-only after a downgrade: the newest stay editable up to the limit, only while the switch is on", async () => {
  const org = (await one("select dela_side_org($1, 'attorney') o", [free.id])).o;
  const ids: string[] = [];
  for (let i = 0; i < 5; i++) {
    ids.push((await one(`insert into playbooks (org_id, title, status, current_version, completeness, request_id, created_by, updated_at) values ($1, $2, 'draft', 1, 50, $3, $4, now() - make_interval(days => $5)) returning id`,
      [org, "Doc " + i, "u-pb-" + RUN + i, free.id, i])).id);
  }
  assertEquals((await call("GET", "/usage", free.token)).body.locked_ids, [], "nothing is locked while the switch is off");
  assert((await call("POST", "/playbooks/save", free.token, { id: ids[4], body: {} })).body.reason !== "document_read_only");
  await pool.query("update feature_switches set state = 'everyone' where key = 'usage_limits_enforced'");
  const u = (await call("GET", "/usage", free.token)).body;
  assertEquals(new Set(u.locked_ids), new Set([ids[3], ids[4]]), "the two least recently edited are read-only");
  assertEquals((await call("POST", "/playbooks/save", free.token, { id: ids[4], body: {} })).body.reason, "document_read_only");
  assert((await call("POST", "/playbooks/save", free.token, { id: ids[0], body: {} })).body.reason !== "document_read_only", "the newest stays editable");
  const made = (await call("POST", "/playbooks/create", free.token, { org_id: org, request_id: "u-new-" + RUN, title: "Sixth", body: {} })).body;
  assertEquals(made.reason, "playbook_limit", JSON.stringify(made));
  // At the limit, a draft by DELA is refused before the AI runs, so no credits are spent on a document that cannot be saved
  const before = (await call("GET", "/usage", free.token)).body.actions.used;
  const drafted = (await call("POST", "/playbooks/create", free.token, { org_id: org, request_id: "u-ai-" + RUN, description: "Open a new matter and run the conflict check." })).body;
  assertEquals(drafted.reason, "playbook_limit", JSON.stringify(drafted));
  assertEquals((await call("GET", "/usage", free.token)).body.actions.used, before, "no credits used");
  // Archiving frees room: one fewer counted, so one more is editable
  await pool.query("update playbooks set status = 'archived' where id = $1", [ids[1]]);
  assertEquals((await call("GET", "/usage", free.token)).body.locked_ids, [ids[4]]);
  await pool.query("update feature_switches set state = 'off' where key = 'usage_limits_enforced'");
});

Deno.test("the admin list: plan, each count, AI cost this month and the $10 flag", async () => {
  await pool.query("insert into ai_usage (person_id, side, task, source, provider, model, input_tokens, output_tokens, ok) values ($1, 'attorney', 'chat', 'lawfecta', 'openai', 'gpt-4o', 2000000, 500000, true)", [free.id]);
  const a = (await call("GET", "/admin/usage", team.token)).body;
  assertEquals(a.flag_cents, 1000);
  const row = a.attorneys.find((x: any) => x.person_id === free.id);
  assertEquals([row.plan, row.playbooks_limit, row.actions_limit, row.bonus], ["Attorney Free", 3, 70, 20]);
  assertEquals(Number(row.ai_cost_cents), 1000, "2M input and 0.5M output tokens at $2.50 and $10 per million");
  assertEquals(a.attorneys.find((x: any) => x.person_id === staffer.id).shared_with, "Usage 2");
  assertEquals((await call("GET", "/admin/usage", free.token)).status, 403);
});

Deno.test("plan sync: BD's plan applies; a plan set by hand is kept; a failed BD read changes nothing", async () => {
  await pool.query("update plans set bd_plan_id = null where bd_plan_id = 913913");
  await pool.query("update plans set bd_plan_id = 913913 where code = 'att_plus'");
  bdPlans.set(synced.bd, 913913);
  const r = (await call("POST", "/admin/usage/resync", team.token, { person_id: synced.id })).body;
  assertEquals([r.ok, r.changed, r.to], [true, true, "att_plus"], JSON.stringify(r));
  bdPlans.set(free.bd, 913913);
  const kept = (await call("POST", "/admin/usage/resync", team.token, { person_id: free.id })).body;
  assertEquals(kept.changed, false, "a plan the Lawfecta Team set by hand stays");
  bdDown = true;
  const down = (await call("POST", "/admin/usage/resync", team.token, { person_id: synced.id })).body;
  assertEquals(down.ok, false);
  assertEquals((await one("select plan_code from side_profiles where person_id = $1 and side = 'attorney'", [synced.id])).plan_code, "att_plus", "BD down: the last known plan stays");
  bdDown = false;
  assert(((await rpc("dela_plan_sync_batch", { p_after: synced.bd - 1, p_limit: 5 })) as any[]).some((x) => x.person_id === synced.id));
  assertEquals((await call("POST", "/admin/usage/resync", free.token, { person_id: synced.id })).status, 403);
});

// Stacey 2026-11-08: BD plan 10 gives Freelancer Pro and plan 11 Freelancer Agency Business, next to plans 8 and 9.
// plans.bd_plan_id holds one number per DELA plan; setting bd.plan_aliases holds the others.
Deno.test("plan aliases: a second BD plan number gives the same DELA plan; the plan table's own number wins", async () => {
  const seeded = (await one("select value from settings where key = 'bd.plan_aliases'")).value;
  assertEquals(seeded, { "10": "fl_pro", "11": "fl_business" }, "Stacey's answer is in the seed");
  const before = seeded;
  await pool.query("update settings set value = $1 where key = 'bd.plan_aliases'", [JSON.stringify({ ...before, "913914": "fl_business", "913913": "fl_free" })]);
  try {
    assertEquals((await one("select (dela_plan_for_bd(913914)).code c")).c, "fl_business");
    assertEquals((await one("select (dela_plan_for_bd(913913)).code c")).c, "att_plus", "the plan table's own number wins over an alias");
    assertEquals((await one("select (dela_plan_for_bd(913915)).code c")).c, null, "an unknown number gives no plan");
    const r = await rpc("dela_plan_sync_apply", { p_person: synced.id, p_bd_plan: 913914 }) as Record<string, unknown>;
    assertEquals([r.ok, r.to], [true, "fl_business"]);
    assertEquals((await one("select plan_code from side_profiles where person_id = $1 and side = 'freelancer'", [synced.id])).plan_code, "fl_business");
  } finally {
    await pool.query("update settings set value = $1 where key = 'bd.plan_aliases'", [JSON.stringify(before)]);
  }
});

Deno.test("teardown", async () => {
  await pool.query("update plans set bd_plan_id = null where bd_plan_id = 913913");
  if (siteUrl !== null) await pool.query("update settings set value = $1 where key = 'site.url'", [JSON.stringify(siteUrl)]);
  await pool.end();
});

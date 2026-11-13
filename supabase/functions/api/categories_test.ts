// Step 17 API tests (docs/briefs/step-17-talent-categories.md): the copy of the website's categories, freelancers'
// categories on their profile, Talent search by category and by free words, website outages and admin rights.
// The real handler and the local test database, with a stand-in for the website's API. Run after tools/dbtest.sh:
//   deno test -A supabase/functions/api/categories_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { normalize } from "./lib/profiles/model.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const WORKER = "test-worker-secret-cats-0123456789abcdef";
// The website: two top categories; Paralegal Services has Family Law with two sub subs; one sub hangs under a top category that is gone
let site: "ok" | "refuse" | "empty" = "ok";
const calls: string[] = [];
const TOPS = [{ profession_id: "39", name: "Legal Nurse & Medical Records", filename: "legal-nurse" }, { profession_id: "40", name: "Paralegal Services", filename: "paralegal-services" }];
const SUBS = [
  { service_id: "267", profession_id: "39", master_id: "0", name: "Medical Malpractice Review" },
  { service_id: "275", profession_id: "39", master_id: "267", name: "Medical Chronology Creation" },
  { service_id: "308", profession_id: "40", master_id: "0", name: "Family Law" },
  { service_id: "327", profession_id: "40", master_id: "308", name: "Discovery Support" },
  { service_id: "331", profession_id: "40", master_id: "308", name: "Clio" },
  { service_id: "309", profession_id: "40", master_id: "0", name: "Civil Litigation" },
  { service_id: "70", profession_id: "32", master_id: "69", name: "Chapter 7" },
];
const fakeFetch = (async (input: string | URL | Request) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  calls.push(url.pathname + url.search);
  if (url.hostname !== "bd.test") return new Response("{}", { status: 404 });
  if (site === "refuse") return Response.json({ status: "error", message: "API Key does not have permission" }, { status: 403 });
  if (url.pathname === "/api/v2/list_professions/get") return Response.json({ status: "success", message: site === "empty" ? [] : TOPS });
  if (url.pathname === "/api/v2/list_services/get") {
    // Two pages, as BD sends them
    if (!url.searchParams.get("page")) return Response.json({ status: "success", message: SUBS.slice(0, 4), next_page: "MipfKjEwMA==" });
    return Response.json({ status: "success", message: SUBS.slice(4) });
  }
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: () => Promise.resolve(1), read: () => Promise.reject(new Error("missing")), remove: () => Promise.resolve(), put: () => Promise.resolve(),
};
const deps: Deps = { rpc, env: (k) => ({ BD_API_KEY: "bd-test-key", DELA_ORIGINS: "https://lawfecta.com", DELA_WORKER_SECRET: WORKER } as Record<string, string>)[k] ?? "", fetch: fakeFetch, storage };

async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];

const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(n: number, plan: string): Promise<M> {
  const bd = 7_700_000 + RUN * 10 + n;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name) values ($1, $2) returning id", [bd, "Cat " + n])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
async function verifiedAttorney(m: M) {
  await pool.query("insert into member_profiles (person_id, side, body, missing, score) values ($1, 'attorney', $2, '{}', 100)", [m.id, { first_name: "Ann", last_name: "Attorney", firm_name: "Example Legal" }]);
  await pool.query(`insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) values ($1, 'l1', 'TX', $2, $2, 'Ann Attorney', 'video', 'verified')`, [m.id, "C" + m.bd]);
  await pool.query("select dela_profile_refresh($1, 'attorney')", [m.id]);
}
async function readyFreelancer(m: M, body: Record<string, unknown>) {
  await pool.query("insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) values ($1, 'freelancer', $2, '{}', 100, now())", [m.id, { first_name: "F", last_name: String(m.bd), ...body }]);
  await pool.query("select dela_profile_refresh($1, 'freelancer')", [m.id]);
}
const ids = (r: { body: Record<string, any> }) => ((r.body.people ?? []) as Array<Record<string, any>>).map((p) => p.person_id);

let att: M, fNurse: M, fFamily: M, fNone: M, team: M;
let siteUrl: unknown = null;

Deno.test("the profile shape keeps only category keys, without repeats", () => {
  assertEquals(normalize({ categories: ["s331", "s331", "p40", "x", 7, "s12345678901", "s308"] }).categories, ["s331", "s308"]);
  assertEquals(normalize({}).categories, []);
});

Deno.test("setup", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  await pool.query("update feature_switches set state = 'everyone' where key in ('talent_search', 'profiles')");
  await pool.query("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
  siteUrl = (await one("select value from settings where key = 'site.url'"))?.value ?? null;
  await pool.query("update settings set value = '\"https://bd.test\"' where key = 'site.url'");
  await pool.query("delete from bd_categories"); await pool.query("delete from bd_category_syncs");
  att = await member(1, "att_free"); fNurse = await member(2, "fl_free"); fFamily = await member(3, "fl_plus"); fNone = await member(4, "fl_free");
  team = await member(5, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'reviewer')", [team.id]);
  await verifiedAttorney(att);
});

Deno.test("the first member to need the lists copies them from the website, every page, without orphans", async () => {
  const r = (await call("GET", "/categories", att.token)).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  assertEquals(r.tops, [["p39", "Legal Nurse & Medical Records"], ["p40", "Paralegal Services"]]);
  const subs = r.subs as Array<[string, string, string | null, string]>;
  assert(subs.some((x) => x[0] === "s331" && x[1] === "p40" && x[2] === "s308" && x[3] === "Clio"), "a sub sub keeps its parent");
  assert(subs.some((x) => x[0] === "s309" && x[2] === null), "a sub category sits under its top category");
  assert(!subs.some((x) => x[0] === "s70"), "a category under a top category that is gone is not offered");
  assert(calls.some((c) => c.includes("list_services/get?limit=100&page=")), "the second page was read");
  assertEquals([r.stale, r.empty, r.max], [false, false, 25]);
  // Freelancers see the lists too; signed-out visitors do not
  assertEquals((await call("GET", "/categories", fNone.token)).body.ok, true);
  assertEquals((await call("GET", "/categories", "ds_test_nobody")).status, 401);
});

Deno.test("freelancers save their categories: only real ones, in order, capped; attorneys have none", async () => {
  await readyFreelancer(fNone, { practice_areas: ["Family law"], software: ["Clio"], skills: [], capacity_hours_week: 10, states_excluded: [] });
  const cur = (await call("GET", "/profile", fNone.token)).body;
  const body = { ...cur.body, categories: ["s331", "s70", "s999", "p40", "s331", "s327"] };
  const r = (await call("POST", "/profile/save", fNone.token, { body, version: cur.version })).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  assertEquals((await one("select body->'categories' c from member_profiles where person_id = $1 and side = 'freelancer'", [fNone.id])).c, ["s331", "s327"]);
  await pool.query("update settings set value = '1' where key = 'profile.categories_max'");
  assertEquals((await rpc("dela_categories_clean", { p_keys: ["s327", "s331"] })), ["s327"], "the setting caps how many");
  await pool.query("update settings set value = '25' where key = 'profile.categories_max'");
  const a = (await call("GET", "/profile", att.token)).body;
  await call("POST", "/profile/save", att.token, { body: { ...a.body, categories: ["s331"] }, version: a.version });
  assertEquals((await one("select body->'categories' c from member_profiles where person_id = $1 and side = 'attorney'", [att.id])).c, [], "attorneys keep no categories");
  // Back to match-ready with no categories, for the search test (the bare test profile above is incomplete once saved)
  await pool.query("update member_profiles set body = body - 'categories', missing = '{}', score = 100 where person_id = $1 and side = 'freelancer'", [fNone.id]);
  await pool.query("select dela_profile_refresh($1, 'freelancer')", [fNone.id]);
});

Deno.test("Talent: a category finds everyone in it and below it; free words also match category names", async () => {
  await readyFreelancer(fNurse, { headline: "Nurse reviewer", practice_areas: [], software: [], skills: [], capacity_hours_week: 10, states_excluded: [], categories: ["s275"] });
  await readyFreelancer(fFamily, { headline: "Family paralegal", practice_areas: ["Family law"], software: [], skills: [], capacity_hours_week: 10, states_excluded: ["TX"], categories: ["s327"] });
  const t = (q: string) => call("GET", "/talent?" + q, att.token);
  const all = ids(await t(""));
  assert([fNurse.id, fFamily.id, fNone.id].every((x) => all.includes(x)), "no filter: everyone match-ready, with or without categories");
  assertEquals(ids(await t("category=p39")).filter((x) => [fNurse.id, fFamily.id, fNone.id].includes(x)), [fNurse.id], "a top category finds its sub subs");
  assertEquals(ids(await t("category=s267")).filter((x) => [fNurse.id, fFamily.id, fNone.id].includes(x)), [fNurse.id], "a sub category finds its sub subs");
  assertEquals(ids(await t("category=s275")).filter((x) => [fNurse.id, fFamily.id, fNone.id].includes(x)), [fNurse.id], "the sub sub itself");
  assertEquals(ids(await t("category=s308")).filter((x) => [fNurse.id, fFamily.id, fNone.id].includes(x)), [fFamily.id]);
  assertEquals(ids(await t("category=s331")).filter((x) => [fNurse.id, fFamily.id, fNone.id].includes(x)), [], "a sibling sub sub does not match");
  assertEquals(ids(await t("category=p40&state=TX")).filter((x) => [fNurse.id, fFamily.id, fNone.id].includes(x)), [], "the state filter still applies");
  assertEquals(ids(await t("q=chronology")).filter((x) => [fNurse.id, fFamily.id, fNone.id].includes(x)), [fNurse.id], "free words match the names of the categories picked");
  assertEquals(ids(await t("q=family%20paralegal")).filter((x) => [fNurse.id, fFamily.id, fNone.id].includes(x)), [fFamily.id], "and the profile's own words");
  const card = ((await t("category=p39")).body.people as Array<Record<string, any>>).find((p) => p.person_id === fNurse.id)!;
  assertEquals(card.categories, ["s275"], "results carry the freelancer's categories");
  // Step 18: what the result cards show; the photo path never leaves, contact details never do
  assertEquals([card.verification, card.availability, card.reviews.count, card.photo_url, "photo_file" in card], [(await one("select verification_state v from side_profiles where person_id = $1 and side = 'freelancer'", [fNurse.id])).v, "available", 0, "", false]);
  await pool.query(`update member_profiles set body = body || jsonb_build_object('photo_file', 'profiles/' || person_id || '/photo-' || gen_random_uuid() || '.png') where person_id = $1 and side = 'freelancer'`, [fNurse.id]);
  const withPic = ((await t("category=p39")).body.people as Array<Record<string, any>>).find((p) => p.person_id === fNurse.id)!;
  assert(String(withPic.photo_url).startsWith("https://storage.test/get/profiles/") && !("photo_file" in withPic), "a DELA photo comes as a signed link");
  assertEquals((await t("category=s99999")).body.reason, "category_gone", "a category that is not on the website is said so");
  assertEquals(ids(await t("category=drop%20table")).length, all.length, "a key that is not a category key is ignored");
  assertEquals((await call("GET", "/talent?category=p39", fNurse.token)).status, 403, "freelancers do not search Talent");
});

Deno.test("the website refuses or answers with nothing: the lists stay as they were", async () => {
  site = "refuse";
  const a = (await call("POST", "/admin/categories/refresh", team.token)).status;
  assertEquals(a, 403, "a reviewer cannot refresh; owners and support can");
  await pool.query("update staff_roles set role = 'support' where person_id = $1", [team.id]);
  const r = (await call("POST", "/admin/categories/refresh", team.token)).body.data;
  assertEquals([r.ok, r.reason, r.error], [false, "website_refused", "not_allowed"]);
  site = "empty";
  assertEquals((await call("POST", "/admin/categories/refresh", team.token)).body.data.reason, "no_top_categories");
  assertEquals(((await call("GET", "/categories", att.token)).body.tops as unknown[]).length, 2, "still the last good copy");
  const adm = (await call("GET", "/admin/categories", team.token)).body.data;
  assertEquals([adm.tops, adm.subs, adm.subsubs, adm.push], [2, 3, 3, false]);
  assertEquals([adm.syncs[0].ok, adm.syncs[0].error, adm.syncs[1].error], [false, "no_top_categories", "not_allowed"]);
  assertEquals((await call("GET", "/admin/categories", fNurse.token)).status, 403);
  assert(await one("select 1 x from audit_log where action = 'categories_refreshed' and actor_id = $1", [team.id]), "the team's refresh is in the audit log");
  site = "ok";
});

Deno.test("a category removed from the website stops counting; a stale copy queues a refresh", async () => {
  const keep = SUBS.splice(SUBS.findIndex((x) => x.service_id === "275"), 1);
  assertEquals((await call("POST", "/admin/categories/refresh", team.token)).body.data.ok, true);
  assertEquals((await call("GET", "/talent?category=s275", att.token)).body.reason, "category_gone");
  assert(!ids(await call("GET", "/talent?category=p39", att.token)).includes(fNurse.id), "the freelancer no longer shows under it");
  SUBS.push(...keep);
  await pool.query("update bd_category_syncs set at = at - interval '2 days'");
  await call("GET", "/categories", att.token);
  assert(await one("select 1 x from jobs where kind = 'categories_sync' and status in ('queued', 'delayed')"), "a refresh job waits");
  const job = (await one("select id from jobs where kind = 'categories_sync' and status in ('queued', 'delayed') order by created_at desc limit 1")).id;
  await pool.query("update jobs set run_at = now() - interval '1 second' where id = $1", [job]);
  const w = await handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
  assertEquals(w.status, 200);
  assertEquals((await call("GET", "/categories", att.token)).body.stale, false, "the job copied them again");
  assert(ids(await call("GET", "/talent?category=s275", att.token)).includes(fNurse.id), "back on the website, back in search");
});

Deno.test("the website listing gets categories only when the setting is on", async () => {
  assertEquals(await rpc("dela_categories_bd", { p_keys: ["s327", "s275"] }), { on: false, profession_id: "40", services: "327,275" });
  await pool.query("update settings set value = 'true' where key = 'bd.push_categories'");
  assertEquals(((await rpc("dela_categories_bd", { p_keys: ["s275"] })) as Record<string, unknown>).on, true);
  await pool.query("update settings set value = 'false' where key = 'bd.push_categories'");
});

Deno.test("teardown", async () => {
  if (siteUrl !== null) await pool.query("update settings set value = $1 where key = 'site.url'", [JSON.stringify(siteUrl)]);
  await pool.end();
});

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
// The website's bookmark table (users_favorite), as its API reference shows it: camelCase fields, values as text
const favs: Array<Record<string, string>> = [];
let favSeq = 910000, favs403 = false;
let billing: "none" | "some" | "refuse" = "none";
const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  calls.push(url.pathname + url.search);
  if (url.hostname !== "bd.test") return new Response("{}", { status: 404 });
  // The website's billing for one member (step 19): nothing on record, or a membership with invoices
  if (url.pathname === "/api/v2/user/transactions") {
    if (billing === "refuse") return Response.json({ status: "error", message: "API Key does not have permission" }, { status: 403 });
    if (billing === "none") return Response.json({ status: "error", message: "user_id or client_id is required" }, { status: 400 });
    const sub = { id: "9", userid: "1", packageid: "12", regdate: "2026-01-05", nextduedate: "2026-12-05", billingcycle: "Monthly", amount: "49.00", domainstatus: "Active", notes: "internal: gave a discount" };
    return Response.json({ status: "success", message: { total: 2, invoices: [
      { invoice_details: { id: "501", invoicenum: "", date: "2026-10-05", duedate: "2026-10-05", datepaid: "2026-10-05 10:00:00", total: "49.00", status: "Paid", notes: "admin only: card ending 4242", items: [{ description: "Attorney Pro (10/05/2026 - 11/04/2026)", amount: "49.00" }] }, subscription_details: sub },
      { invoice_details: { id: "502", invoicenum: "INV-502", date: "2026-11-05", duedate: "2026-11-05", datepaid: "0000-00-00 00:00:00", total: "49.00", status: "Unpaid", notes: "", items: [{ description: "Attorney Pro (11/05/2026 - 12/04/2026)", amount: "49.00" }] }, subscription_details: sub }] } });
  }
  if (url.pathname.startsWith("/api/v2/users_favorite/")) {
    if (favs403) return Response.json({ status: "error", message: "API Key does not have permission" }, { status: 403 });
    const form = new URLSearchParams(String(init.body ?? ""));
    if (url.pathname.endsWith("/get")) {
      const who = url.searchParams.get("property") === "userId" ? url.searchParams.get("property_value") : null;
      const rows = favs.filter((x) => !who || x.userId === who);
      return rows.length ? Response.json({ status: "success", message: rows.map((x) => ({ ...x, tablesExists: true })) }) : Response.json({ status: "error", message: "users_favorite not found" }, { status: 404 });
    }
    if (url.pathname.endsWith("/create") && init.method === "POST") {
      const row = { id: String(++favSeq), userId: form.get("userId") ?? "", ownerId: form.get("ownerId") ?? "", postId: form.get("postId") ?? "", dataType: form.get("dataType") ?? "", featureId: form.get("featureId") ?? "", checked: form.get("checked") ?? "" };
      favs.push(row);
      return Response.json({ status: "success", message: row });
    }
    if (url.pathname.endsWith("/delete") && init.method === "DELETE") {
      const i = favs.findIndex((x) => x.id === form.get("id"));
      if (i < 0) return Response.json({ status: "error", message: "not found" }, { status: 404 });
      favs.splice(i, 1);
      return Response.json({ status: "success", message: "users_favorite record was deleted" });
    }
  }
  // The website's posts of one member (step 18 part 2): a live promotion, an expired one, a draft, another post type, another member's
  if (url.pathname === "/api/v2/data_posts/get") {
    if (site === "refuse") return Response.json({ status: "error", message: "API Key does not have permission" }, { status: 403 });
    const uid = url.searchParams.get("property_value");
    return Response.json({ status: "success", message: [
      { post_id: "1", data_id: "7", user_id: uid, post_status: "1", post_title: "New client discount", post_content: "<p>10% off the first fixed-fee project.</p><p>Ask in your invitation&nbsp;note.</p><script>x()</script>", post_promo: "FIRST10", post_expire_date: "20991231" },
      { post_id: "2", data_id: "7", user_id: uid, post_status: "1", post_title: "Old offer", post_content: "", post_promo: "", post_expire_date: "20200101" },
      { post_id: "3", data_id: "7", user_id: uid, post_status: "0", post_title: "Draft offer", post_content: "", post_promo: "", post_expire_date: "" },
      { post_id: "4", data_id: "14", user_id: uid, post_status: "1", post_title: "A blog article", post_content: "", post_promo: "", post_expire_date: "" },
      { post_id: "5", data_id: "7", user_id: "999999", post_status: "1", post_title: "Someone else's offer", post_content: "", post_promo: "", post_expire_date: "" }] });
  }
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
  const t = (q: string) => call("GET", "/talent?limit=50&" + q, att.token);
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
  // Step 22 (Talent revision package): software is searched on its own, every typed word counts in any order,
  // and the page gets the software list and the real number of days behind "match-ready"
  await pool.query(`update member_profiles set body = body || '{"software":["Filevine"]}' where person_id = $1 and side = 'freelancer'`, [fFamily.id]);
  const mine = (r: { body: Record<string, any> }) => ids(r).filter((x) => [fNurse.id, fFamily.id, fNone.id].includes(x));
  assertEquals(mine(await t("q=filevine")), [fFamily.id], "typing a software name finds it, with no category chosen");
  assertEquals(mine(await t("tool=Filevine")), [fFamily.id], "the Software filter works on its own");
  assertEquals(mine(await t("q=paralegal%20filevine%20family")), [fFamily.id], "every word must appear, in any order");
  assertEquals(mine(await t("q=filevine%20nurse")), [], "a word that appears nowhere finds nobody");
  assertEquals(mine(await t("tool=Filevine&category=p39")), [], "filters narrow each other");
  const cats = (await call("GET", "/categories", att.token)).body;
  assert(Array.isArray(cats.software) && cats.software.includes("Clio") && cats.software.includes("Filevine"), "the Software filter offers the Profile page's list");
  assertEquals((await t("")).body.availability_days, Number((await one("select value v from settings where key = 'profile.availability_days'")).v), "the match-ready days come from Settings");
  await pool.query(`update member_profiles set body = body || '{"software":[]}' where person_id = $1 and side = 'freelancer'`, [fFamily.id]);
});

Deno.test("the full profile: what the page shows, never contact details; shown samples for members who hire; promotions from the website", async () => {
  await pool.query(`update member_profiles set body = body || $2::jsonb where person_id = $1 and side = 'freelancer'`, [fNurse.id, JSON.stringify({ summary: "I review records.", experience: "Nurse reviewer, 2019 to now", education: "RN",
    services: [{ title: "Medical chronology", for_whom: "PI firms", price_from_cents: 25000, price_to_cents: null, unit: "fixed" }], timezone: "Central", capacity_hours_week: 15,
    phone: "512-555-0100", website: "https://nurse.example.com", linkedin: "https://www.linkedin.com/in/nurse", booking_link: "https://cal.example.com/nurse" })]);
  const org = (await one("select dela_side_org($1, 'freelancer') o", [fNurse.id])).o;
  const mk = async (name: string, shown: boolean, status = "ready") => (await one(`insert into files (org_id, group_id, version, is_current, name, ext, size_bytes, storage_path, status, check_state, uploaded_by, side, request_id, no_client_info_ticked_at, purpose, shown)
    values ($1, gen_random_uuid(), 1, true, $2, 'pdf', 2048, 'profiles/docs/' || gen_random_uuid(), $4, 'clear', $3, 'freelancer', gen_random_uuid()::text, now(), 'profile', $5) returning id`, [org, name, fNurse.id, status, shown])).id;
  const shown = await mk("Sample chronology.pdf", true), hidden = await mk("Private resume.pdf", false);
  const r = (await call("GET", "/freelancers/profile?person=" + fNurse.id, att.token)).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  assertEquals([r.name.startsWith("F "), r.education, r.timezone, r.capacity_hours_week, r.services[0].price_from_cents, r.categories, r.reviews.count], [true, "RN", "Central", 15, 25000, ["s275"], 0]);
  const raw = JSON.stringify(r);
  assert(!/512-555|nurse\.example|linkedin|cal\.example|bd_member_id|photo_file|storage_path/.test(raw), "no phone, website, LinkedIn, booking link, website member number or storage path: " + raw.slice(0, 300));
  assertEquals([r.samples_allowed, r.samples.map((f: any) => f.name)], [true, ["Sample chronology.pdf"]], "only the documents marked as shown");
  assertEquals(r.promotions, [{ title: "New client discount", text: "10% off the first fixed-fee project.\nAsk in your invitation note.", code: "FIRST10", ends: "2099-12-31" }], "live, unexpired promotions of this member only, as plain text");
  assertEquals(r.promotions_ok, true);
  // Another freelancer sees the profile without the samples; the freelancer sees their own
  const other = (await call("GET", "/freelancers/profile?person=" + fNurse.id, fFamily.token)).body;
  assertEquals([other.ok, other.samples_allowed, other.samples], [true, false, []]);
  assertEquals((await call("GET", "/freelancers/profile?person=" + fNurse.id, fNurse.token)).body.samples.length, 1);
  // Opening a sample: shown ones only, for members who hire, with an audit line
  const d = (await call("GET", `/freelancers/doc?person=${fNurse.id}&file=${shown}`, att.token)).body;
  assert(d.ok && String(d.url).startsWith("https://storage.test/get/profiles/docs/"), JSON.stringify(d));
  assertEquals((await call("GET", `/freelancers/doc?person=${fNurse.id}&file=${hidden}`, att.token)).body.reason, "not_found", "a private document stays private");
  assertEquals((await call("GET", `/freelancers/doc?person=${fNurse.id}&file=${shown}`, fFamily.token)).body.reason, "not_found", "another freelancer cannot open it");
  assertEquals((await call("GET", `/freelancers/doc?person=${fFamily.id}&file=${shown}`, att.token)).body.reason, "not_found", "a file cannot be reached through someone else's profile");
  assert(await one("select 1 x from audit_log where action = 'profile_sample_opened' and actor_id = $1 and object_id = $2", [att.id, shown]), "opening a sample is in the audit log");
  // The website does not answer: the profile still opens, without promotions
  site = "refuse";
  const noBd = (await call("GET", "/freelancers/profile?person=" + fNurse.id, att.token)).body;
  assertEquals([noBd.ok, noBd.promotions, noBd.promotions_ok], [true, [], false]);
  site = "ok";
  assertEquals((await call("GET", "/freelancers/profile?person=" + att.id, att.token)).body.reason, "not_found", "an attorney has no freelancer profile");
  assertEquals((await call("GET", "/freelancers/profile?person=" + fNurse.id, "ds_test_nobody")).status, 401);
});

Deno.test("ready-made pictures: offered only from the list, an uploaded photo comes first, the same picture on Talent and the profile", async () => {
  const BASE = "https://www.lawfecta.co/images/Avatars/", PIC = "jimis-avatar-icons-collection-40.png";
  const got = (await call("GET", "/profile", fFamily.token)).body;
  assertEquals([got.avatars.base, got.avatars.files.length, got.avatars.files.includes(PIC)], [BASE, 48, true]);
  // With no folder address nothing is offered
  await pool.query(`update settings set value = jsonb_set(value, '{base}', '""') where key = 'profile.avatars'`);
  assertEquals((await call("GET", "/profile", fFamily.token)).body.avatars, { base: "", files: [] });
  await pool.query(`update settings set value = jsonb_set(value, '{base}', $1::jsonb) where key = 'profile.avatars'`, [JSON.stringify(BASE)]);
  const save = async (avatar: string) => { const c = (await call("GET", "/profile", fFamily.token)).body; return (await call("POST", "/profile/save", fFamily.token, { body: { ...c.body, avatar }, version: c.version })).body; };
  const av = async () => (await one("select body->>'avatar' a from member_profiles where person_id = $1 and side = 'freelancer'", [fFamily.id])).a;
  assertEquals((await save("../../evil.png")).ok, true); assertEquals(await av(), "", "a name that is not a plain file name is dropped");
  assertEquals((await save("9999---Not-In-The-List.png")).ok, true); assertEquals(await av(), "", "a picture that is not in the list is dropped");
  assertEquals((await save(PIC)).ok, true); assertEquals(await av(), PIC);
  // Saving a bare test profile marks it incomplete; put it back to match-ready for the search
  await pool.query("update member_profiles set missing = '{}', score = 100 where person_id = $1 and side = 'freelancer'", [fFamily.id]);
  await pool.query("select dela_profile_refresh($1, 'freelancer')", [fFamily.id]);
  const card = ((await call("GET", "/talent?category=s308", att.token)).body.people as Array<Record<string, any>>).find((p) => p.person_id === fFamily.id)!;
  assertEquals([card.photo_url, "avatar" in card], [BASE + PIC, false], "Talent shows the chosen picture");
  assertEquals((await call("GET", "/freelancers/profile?person=" + fFamily.id, att.token)).body.photo_url, BASE + PIC, "and so does the profile page");
  assertEquals((await call("GET", "/freelancers/card?person=" + fFamily.id, att.token)).body.photo_url, BASE + PIC, "and the small card");
  await pool.query(`update member_profiles set body = body || jsonb_build_object('photo_file', 'profiles/' || person_id || '/photo-' || gen_random_uuid() || '.png') where person_id = $1 and side = 'freelancer'`, [fFamily.id]);
  assert(String((await call("GET", "/freelancers/profile?person=" + fFamily.id, att.token)).body.photo_url).startsWith("https://storage.test/get/profiles/"), "the member's own photo comes first");
  await pool.query("update member_profiles set body = body - 'photo_file' - 'avatar' where person_id = $1 and side = 'freelancer'", [fFamily.id]);
  // The bookmarks check for the team: field names only; the website's refusal is said plainly
  await pool.query("update staff_roles set role = 'support' where person_id = $1", [team.id]);
  const bm = (await call("GET", "/admin/bd/bookmarks-check", team.token)).body.data;
  assertEquals([bm.ok, bm.status, bm.allowed], [false, 404, true], "no bookmarks on the website yet: said as such, not as a refusal");
  await pool.query("update staff_roles set role = 'reviewer' where person_id = $1", [team.id]);
  assertEquals((await call("GET", "/admin/bd/bookmarks-check", team.token)).status, 403, "owners and support only");
});

Deno.test("a conversation before a gig: who may start one, messages only, the usual checks, a daily limit", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key = 'gig_chat'");
  assertEquals((await call("POST", "/intro/open", fNurse.token, { freelancer: fFamily.id })).status, 403, "freelancers do not start one");
  assertEquals((await call("POST", "/intro/open", team.token, { freelancer: fNurse.id })).body.reason, "verify_first", "an attorney whose license is not verified cannot contact freelancers");
  assertEquals((await call("POST", "/intro/open", att.token, { freelancer: att.id })).body.reason, "not_found");
  await pool.query("update side_profiles set readiness_state = 'incomplete' where person_id = $1 and side = 'freelancer'", [fNone.id]);
  assertEquals((await call("POST", "/intro/open", att.token, { freelancer: fNone.id })).body.reason, "freelancer_not_available", "only match-ready freelancers");
  await pool.query("update side_profiles set readiness_state = 'match_ready' where person_id = $1 and side = 'freelancer'", [fNone.id]);
  const o = (await call("POST", "/intro/open", att.token, { freelancer: fNurse.id })).body;
  assert(o.ok && o.thread_id && !o.existing, JSON.stringify(o));
  const again = (await call("POST", "/intro/open", att.token, { freelancer: fNurse.id })).body;
  assertEquals([again.thread_id, again.existing], [o.thread_id, true], "one conversation per firm and freelancer");
  // Messages both ways; the freelancer sees it in the Inbox as an introduction
  const sent = (await call("POST", "/threads/send", att.token, { thread_id: o.thread_id, body: "Do you have time for medical chronologies next month?", request_id: "i1" })).body;
  assertEquals(sent.ok, true, JSON.stringify(sent));
  const inbox = ((await call("GET", "/threads", fNurse.token)).body.threads as Array<Record<string, any>>).find((x) => x.id === o.thread_id)!;
  assertEquals([inbox.kind, inbox.gig_id, inbox.unread], ["intro", null, 1]);
  const view = (await call("GET", "/threads/get?id=" + o.thread_id, fNurse.token)).body;
  assertEquals([view.ok, view.role, view.writable, view.thread.kind, String(view.thread.gig_title).startsWith("Introduction from ")], [true, "freelancer", true, "intro", true]);
  assertEquals((await call("POST", "/threads/send", fNurse.token, { thread_id: o.thread_id, body: "Yes, about 10 hours a week.", request_id: "i2" })).body.ok, true);
  assert(await one("select 1 x from notifications where person_id = $1 and kind = 'message' and link like '%' || $2", [fNurse.id, o.thread_id]), "the freelancer is told about the first message");
  // Messages only, and the same checks as any conversation
  assertEquals((await call("POST", "/threads/send", att.token, { thread_id: o.thread_id, body: "See the attached.", attachments: [crypto.randomUUID()], request_id: "i3" })).body.reason, "bench_no_files", "no files before a gig");
  await call("POST", "/threads/send", att.token, { thread_id: o.thread_id, body: "Email me at ann@example.com and we skip the fees", request_id: "i4" });
  assertEquals((await one("select status from messages where thread_id = $1 and request_id = 'i4'", [o.thread_id])).status, "held", "an off-platform message is held, as everywhere");
  // Nobody outside the conversation reads it
  assertEquals((await call("GET", "/threads/get?id=" + o.thread_id, fFamily.token)).body.reason, "not_found");
  assertEquals((await call("GET", "/threads/get?id=" + o.thread_id, team.token)).body.reason, "not_found");
  // The freelancer can block it; the daily limit stops bulk contact
  assertEquals((await call("POST", "/threads/block", fNurse.token, { thread_id: o.thread_id })).body.ok, true);
  assertEquals((await call("POST", "/threads/send", att.token, { thread_id: o.thread_id, body: "Hello again", request_id: "i5" })).body.reason, "blocked");
  await pool.query("update settings set value = '1' where key = 'intro.max_new_per_day'");
  assertEquals((await call("POST", "/intro/open", att.token, { freelancer: fFamily.id })).body.reason, "limit_reached");
  assertEquals((await call("POST", "/intro/open", att.token, { freelancer: fNurse.id })).body.existing, true, "a conversation already open does not count against the limit");
  await pool.query("update settings set value = '10' where key = 'intro.max_new_per_day'");
  await pool.query("update settings set value = 'false' where key = 'intro.chat_on'");
  assertEquals((await call("POST", "/intro/open", att.token, { freelancer: fFamily.id })).body.reason, "chat_off", "the setting turns it off");
  await pool.query("update settings set value = 'true' where key = 'intro.chat_on'");
});

// Step 23 (Stacey 2026-11-13): an introductory call before any gig, booked in the conversation before a gig
Deno.test("a call before a gig: booked by the attorney in the conversation, same times and room rules, hires nobody", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('gig_chat', 'meetings')");
  const o = (await call("POST", "/intro/open", att.token, { freelancer: fFamily.id })).body;
  assert(o.ok && o.thread_id, JSON.stringify(o));
  const th = o.thread_id as string;
  const slotsOf = (who: M, extra = "") => call("GET", `/meetings/slots?thread=${th}&length=30${extra}`, who.token);
  assertEquals((await slotsOf(att)).body.no_availability, true, "no availability set: nothing to book, and the page says so");
  await pool.query("insert into meeting_availability (person_id) values ($1) on conflict (person_id) do nothing", [fFamily.id]);
  const slots = (await slotsOf(att)).body.slots as string[];
  assert(slots.length > 3, "the freelancer's open times are offered with no gig");
  assertEquals((await slotsOf(fNurse)).body.reason, "not_found", "someone outside the conversation sees nothing");
  assertEquals((await call("GET", `/meetings/slots?thread=${crypto.randomUUID()}&length=30`, att.token)).body.reason, "not_found");
  // Only the attorney starts a call
  assertEquals((await call("POST", "/meetings/hold", fFamily.token, { thread_id: th, start_at: slots[0], length: 30, request_id: "ic-f" })).body.reason, "attorneys_only");
  // Off by one setting
  await pool.query("update settings set value = '\"false\"' where key = 'intro.calls_on'");
  assertEquals((await call("POST", "/meetings/hold", att.token, { thread_id: th, start_at: slots[0], length: 30, request_id: "ic-off" })).body.reason, "intro_calls_off");
  await pool.query("update settings set value = '\"true\"' where key = 'intro.calls_on'");
  const h = (await call("POST", "/meetings/hold", att.token, { thread_id: th, start_at: slots[0], length: 30, request_id: "ic-1" })).body;
  assertEquals([h.ok, h.status], [true, "held"], JSON.stringify(h));
  assertEquals((await call("POST", "/meetings/hold", att.token, { thread_id: th, start_at: slots[0], length: 30, request_id: "ic-1" })).body.duplicate, true, "two clicks hold once");
  const c = (await call("POST", "/meetings/confirm", att.token, { id: h.id })).body;
  assertEquals(c.ok, true, JSON.stringify(c));
  const row = await one("select gig_id, intro_thread, attorney_person, freelancer_person, status from meetings where id = $1", [h.id]);
  assertEquals([row.gig_id, row.intro_thread, row.attorney_person, row.freelancer_person, row.status], [null, th, att.id, fFamily.id, "confirmed"]);
  // Both people see it, named as an introductory call; both are told; no gig, agreement or invitation was made
  for (const who of [att, fFamily]) {
    const m = ((await call("GET", "/meetings?id=" + h.id, who.token)).body.meetings as Array<Record<string, any>>)[0];
    assertEquals([m?.gig_title, m?.intro_thread, m?.gig_id, m?.status], ["Introductory call", th, null, "confirmed"], "the list shows the call to " + who.id);
  }
  assertEquals((await one("select count(*)::int n from notifications where person_id = $1 and title = 'Meeting booked: Introductory call' and channel = 'in_app'", [fFamily.id])).n, 1, "the freelancer is told");
  assertEquals((await call("GET", "/meetings?id=" + h.id, fNurse.token)).body.meetings.length, 0, "nobody else sees it");
  // The room is made as for any meeting (the provider stand-in has no key here, so it waits for the provider)
  assertEquals((await one("select dela_meeting_for_job($1) j", [h.id])).j.gig_title, "Introductory call");
  // One upcoming call per conversation
  assertEquals((await call("POST", "/meetings/hold", att.token, { thread_id: th, start_at: slots[2], length: 30, request_id: "ic-2" })).body.reason, "intro_call_booked");
  // Consent works for both; the freelancer moves the call to another time
  assertEquals((await call("POST", "/meetings/consent", att.token, { id: h.id, consent: true })).body.ok, true);
  assertEquals((await call("POST", "/meetings/consent", fFamily.token, { id: h.id, consent: true })).body.ok, true);
  const free = (await slotsOf(fFamily, "&except=" + h.id)).body.slots as string[];
  const mv = (await call("POST", "/meetings/hold", fFamily.token, { reschedule_of: h.id, start_at: free[1], length: 30, request_id: "ic-mv" })).body;
  assertEquals(mv.ok, true, JSON.stringify(mv));
  assertEquals((await call("POST", "/meetings/confirm", fFamily.token, { id: mv.id })).body.ok, true);
  const moved = await one("select m.intro_thread, m.gig_id, m.replaces, m.status, (select status from meetings where id = $2) old from meetings m where m.id = $1", [mv.id, h.id]);
  assertEquals([moved.intro_thread, moved.gig_id, moved.replaces, moved.status, moved.old], [th, null, h.id, "confirmed", "rescheduled"], "a moved call stays with the conversation");
  // The attorney cancels; a gig meeting's rules for who may cancel still hold
  assertEquals((await call("POST", "/meetings/cancel", fNurse.token, { id: mv.id })).body.reason, "not_found");
  assertEquals((await call("POST", "/meetings/cancel", att.token, { id: mv.id, reason: "Plans changed" })).body.ok, true);
  assertEquals((await one("select count(*)::int n from notifications where person_id = $1 and title = 'Meeting canceled: Introductory call' and channel = 'in_app'", [fFamily.id])).n, 1);
  // Blocking the conversation cancels an upcoming call and stops new ones
  const h2 = (await call("POST", "/meetings/hold", att.token, { thread_id: th, start_at: slots[3], length: 30, request_id: "ic-3" })).body;
  assertEquals((await call("POST", "/meetings/confirm", att.token, { id: h2.id })).body.ok, true, JSON.stringify(h2));
  assertEquals((await call("POST", "/threads/block", fFamily.token, { thread_id: th, block: true })).body.ok, true);
  assertEquals((await one("select status, cancel_reason from meetings where id = $1", [h2.id])), { status: "canceled", cancel_reason: "blocked" });
  assertEquals((await slotsOf(att)).body.reason, "not_available");
  assertEquals((await one("select count(*)::int n from gigs where created_by = $1 and created_at > now() - interval '1 minute'", [att.id])).n, 0, "no gig was made");
});

Deno.test("the freelancers who fit a document: the firm's own documents only, scored with reasons", async () => {
  const org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  const body = { title: "Prepare discovery responses", practice_area: "Family law", jurisdiction: "Texas (TX)", steps: [{ text: "Open the matter", tool: "Clio" }, { text: "Draft responses" }] };
  const pb = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, practice_area, request_id, created_by) values ($1, $2, 'approved', 1, 1, 100, 'Family law', 'fit1', $3) returning id`, [org, body.title, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb, body, att.id]);
  await pool.query(`update member_profiles set body = body || '{"software":["Clio"],"states_excluded":[]}'::jsonb where person_id = $1 and side = 'freelancer'`, [fFamily.id]);
  const r = (await call("GET", "/playbooks/fits?id=" + pb, att.token)).body;
  assertEquals([r.ok, r.on, r.practice_area], [true, true, "Family law"], JSON.stringify(r).slice(0, 300));
  const fam = (r.people as Array<Record<string, any>>).find((p) => p.person_id === fFamily.id)!;
  assert(fam && fam.reasons.includes("Family law") && fam.reasons.includes("Uses Clio") && !("photo_file" in fam) && !("avatar" in fam), JSON.stringify(fam));
  assert(!(r.people as Array<Record<string, any>>).some((p) => p.person_id === fNurse.id), "a freelancer outside the practice area is not suggested");
  // An old or hand-made profile with odd shapes (hours as text, software not a list) must not break the suggestions for everyone
  await pool.query(`update member_profiles set body = body || '{"capacity_hours_week":"about 12.5","software":"Clio","states_excluded":null}'::jsonb where person_id = $1 and side = 'freelancer'`, [fNone.id]);
  const odd = (await call("GET", "/playbooks/fits?id=" + pb, att.token)).body;
  assertEquals(odd.ok, true, "an odd profile does not break the list: " + JSON.stringify(odd).slice(0, 200));
  assert((odd.people as Array<Record<string, any>>).some((p) => p.person_id === fFamily.id));
  await pool.query(`update member_profiles set body = body || '{"capacity_hours_week":10,"software":["Clio"],"states_excluded":[]}'::jsonb where person_id = $1 and side = 'freelancer'`, [fNone.id]);
  // A document in the document standard names a step's tool as "system"
  const body2 = { schema: 2, title: "Open a matter", practice_area: "Family law", jurisdiction: "Texas state courts", steps: [{ text: "Open the matter", system: "Clio" }] };
  const pb2 = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, practice_area, request_id, created_by) values ($1, $2, 'approved', 1, 1, 100, 'Family law', 'fit2', $3) returning id`, [org, body2.title, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb2, body2, att.id]);
  const fam2 = ((await call("GET", "/playbooks/fits?id=" + pb2, att.token)).body.people as Array<Record<string, any>>).find((p) => p.person_id === fFamily.id)!;
  assert(fam2 && fam2.reasons.includes("Uses Clio"), "the tool is read from a document-standard step: " + JSON.stringify(fam2));
  // A state the freelancer does not work in takes them out
  await pool.query(`update member_profiles set body = body || '{"states_excluded":["TX"]}'::jsonb where person_id = $1 and side = 'freelancer'`, [fFamily.id]);
  assert(!((await call("GET", "/playbooks/fits?id=" + pb, att.token)).body.people as Array<Record<string, any>>).some((p) => p.person_id === fFamily.id), "the document's state is respected");
  assertEquals((await call("GET", "/playbooks/fits?id=" + pb, team.token)).body.reason, "not_found", "another firm cannot ask about this document");
  assertEquals((await call("GET", "/playbooks/fits?id=" + pb, fNurse.token)).body.reason, "not_found");
});

Deno.test("bookmarks live in the website's own bookmark table: save, list, filter Talent, remove; nobody is told", async () => {
  const notes = async () => Number((await one("select count(*)::int n from notifications where person_id = $1", [fFamily.id])).n);
  const before = await notes();
  assertEquals((await call("GET", "/bookmarks", att.token)).body, { ok: true, on: true, people: [] }, "no bookmarks yet (the website answers 404 for none)");
  assertEquals((await call("POST", "/bookmarks/set", fNurse.token, { person: fFamily.id })).status, 403, "only members who hire bookmark freelancers");
  assertEquals((await call("POST", "/bookmarks/set", att.token, { person: att.id })).body.reason, "not_found", "only freelancers can be bookmarked");
  // A post the attorney liked on the website, and another member's bookmark: neither is a DELA bookmark of this attorney
  favs.push({ id: "1", userId: String(att.bd), ownerId: String(fNurse.bd), postId: "87", dataType: "20", featureId: "8", checked: "0" });
  favs.push({ id: "2", userId: "424242", ownerId: String(fNurse.bd), postId: "0", dataType: "10", featureId: "1", checked: "0" });
  const r = (await call("POST", "/bookmarks/set", att.token, { person: fFamily.id })).body;
  assertEquals([r.ok, r.bookmarked, r.duplicate], [true, true, undefined], JSON.stringify(r));
  const row = favs.find((x) => x.userId === String(att.bd) && x.postId === "0")!;
  assertEquals([row.ownerId, row.dataType, row.featureId, row.checked], [String(fFamily.bd), "10", "1", "1"], "written the way the website marks a bookmarked member");
  assertEquals((await call("POST", "/bookmarks/set", att.token, { person: fFamily.id })).body.duplicate, true, "asking twice makes one bookmark");
  assertEquals(favs.filter((x) => x.userId === String(att.bd) && x.postId === "0").length, 1);
  assertEquals((await call("GET", "/bookmarks", att.token)).body.people, [fFamily.id], "the liked post and the other member's bookmark are not in the list");
  assertEquals(await notes(), before, "the freelancer is not told");
  // Talent, bookmarked only
  const only = ((await call("GET", "/talent?bookmarked=1", att.token)).body.people as Array<Record<string, any>>).map((p) => p.person_id);
  assertEquals(only, [fFamily.id]);
  assertEquals(ids(await call("GET", "/talent?bookmarked=1&category=p39", att.token)), [], "with a category that does not fit, nobody");
  // The website refuses: said plainly, and "bookmarked only" shows nobody instead of everybody
  favs403 = true;
  assertEquals((await call("GET", "/bookmarks", att.token)).body.reason, "bookmarks_not_allowed");
  assertEquals((await call("POST", "/bookmarks/set", att.token, { person: fNurse.id })).body.reason, "bookmarks_not_allowed");
  const refused = (await call("GET", "/talent?bookmarked=1", att.token)).body;
  assertEquals([refused.ok, refused.reason, refused.people], [false, "bookmarks_not_allowed", undefined]);
  favs403 = false;
  // Remove
  assertEquals((await call("POST", "/bookmarks/set", att.token, { person: fFamily.id, on: false })).body.bookmarked, false);
  assertEquals([favs.length, (await call("GET", "/bookmarks", att.token)).body.people], [2, []], "only DELA's own bookmark row was deleted");
  assertEquals((await call("POST", "/bookmarks/set", att.token, { person: fFamily.id, on: false })).body.duplicate, true);
  await pool.query(`update settings set value = jsonb_set(value, '{on}', 'false') where key = 'bd.bookmarks'`);
  assertEquals([(await call("GET", "/bookmarks", att.token)).body.on, (await call("POST", "/bookmarks/set", att.token, { person: fFamily.id })).body.reason], [false, "bookmarks_off"], "the setting turns bookmarks off");
  await pool.query(`update settings set value = jsonb_set(value, '{on}', 'true') where key = 'bd.bookmarks'`);
});

Deno.test("subscription: what the member is billed comes from the website's records for that member only, and is never guessed", async () => {
  const sub = (await call("GET", "/subscription", att.token)).body;
  assertEquals([sub.ok, sub.exports_counted, sub.plan_source], [true, false, "staff_grant"], "exporting the member's own documents is not counted unless the setting says so");
  // Nothing on record: said as such, no dates or amounts
  assertEquals((await call("GET", "/subscription/billing", att.token)).body, { ok: true, has_account: false, membership: null, invoices: [] });
  billing = "some";
  const b = (await call("GET", "/subscription/billing", att.token)).body;
  assertEquals(b.membership, { status: "Active", cycle: "Monthly", amount_cents: 4900, next_due: "2026-12-05", started: "2026-01-05", plan_id: 12 });
  assertEquals(b.invoices.map((x: any) => [x.number, x.date, x.status, x.total_cents, x.paid, x.due]), [["INV-502", "2026-11-05", "Unpaid", 4900, "", "2026-11-05"], ["501", "2026-10-05", "Paid", 4900, "2026-10-05", "2026-10-05"]], "newest first; an unpaid invoice has no paid date");
  assert(!/admin only|4242|internal: gave|notes/.test(JSON.stringify(b)), "the website's admin notes never reach the member");
  // Asked with the member's own website number, never with a billing record number
  const asked = calls.filter((c) => c.startsWith("/api/v2/user/transactions"));
  assert(asked.length > 0);
  billing = "refuse";
  assertEquals((await call("GET", "/subscription/billing", att.token)).body, { ok: false, reason: "billing_not_allowed" });
  billing = "none";
  assertEquals((await call("GET", "/subscription/billing", "ds_test_nobody")).status, 401);
});

Deno.test("Talent comes a page at a time: the setting's size, the total, the next page, one order across pages", async () => {
  const get = async (q: string) => (await call("GET", "/talent?" + q, att.token)).body as Record<string, any>;
  const all = await get("limit=50");
  assert(all.total >= 3 && all.people.length === all.total, "with room for everyone, everyone comes: " + all.total);
  // The page size is a setting (10); nothing is cut off at 40 any more
  await pool.query("update settings set value = '2' where key = 'talent.page_size'");
  const p1 = await get(""), p2 = await get("offset=2");
  assertEquals([p1.people.length, p1.limit, p1.offset, p1.total, p2.offset], [2, 2, 0, all.total, 2]);
  assertEquals(p1.people.map((x: any) => x.person_id).concat(p2.people.map((x: any) => x.person_id)), all.people.slice(0, 2 + p2.people.length).map((x: any) => x.person_id), "the pages follow each other in the same order, with nobody twice");
  await pool.query("update settings set value = '10' where key = 'talent.page_size'");
  assertEquals((await get("")).limit, 10);
  // Sorting happens before the pages are cut, so page 2 continues page 1
  const byName = (await get("limit=50&sort=name")).people.map((x: any) => String(x.name).toLowerCase());
  assertEquals(byName, [...byName].sort(), "name order");
  const n1 = await get("limit=1&sort=name"), n2 = await get("limit=1&offset=1&sort=name");
  assertEquals([String(n1.people[0].name).toLowerCase(), String(n2.people[0].name).toLowerCase()], byName.slice(0, 2));
  assertEquals([(await get("limit=500")).limit, (await get("limit=0")).limit, (await get("offset=-5")).offset, (await get("sort=drop")).ok], [50, 1, 0, true], "limits are kept between 1 and 50, and an unknown order is ignored");
  assertEquals((await get("offset=100000")).people, [], "past the end: nobody, no error");
  // A filter narrows the total too
  const cat = await get("category=p39&limit=50");
  assert(cat.total === cat.people.length && cat.total < all.total);
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

// Step 83 API tests (docs/briefs/step-83-master-pages.md): the Services and Promotions pages for attorneys and the Blog
// for both sides. Whose content shows (the Talent search's rule), the copy of the website's posts and when it is
// refreshed, the topic list read from the website's post type, filters, order, pages, and who may open what.
// The real handler and the local test database, with a stand-in for the website's API. Run after tools/dbtest.sh:
//   deno test -A supabase/functions/api/master_pages_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const WORKER = "test-worker-secret-master-0123456789abcdef";
let site: "ok" | "refuse" = "ok", topicsRefused = false;
let posts: Array<Record<string, string>> = [];
let topicList = "Category 1, Family Law Tips, Practice Management";
let eventTopicList = "Category 1, Webinars, Meetups";
const calls: string[] = [];
const fakeFetch = (async (input: string | URL | Request) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  calls.push(url.pathname + url.search);
  if (url.hostname !== "bd.test") return new Response("{}", { status: 404 });
  if (site === "refuse") return Response.json({ status: "error", message: "API Key does not have permission" }, { status: 403 });
  if (url.pathname === "/api/v2/list_professions/get") return Response.json({ status: "success", message: [{ profession_id: "39", name: "Legal Nurse & Medical Records", filename: "legal-nurse" }, { profession_id: "40", name: "Paralegal Services", filename: "paralegal-services" }] });
  if (url.pathname === "/api/v2/list_services/get") return Response.json({ status: "success", message: [
    { service_id: "267", profession_id: "39", master_id: "0", name: "Medical Malpractice Review" }, { service_id: "275", profession_id: "39", master_id: "267", name: "Medical Chronology Creation" },
    { service_id: "308", profession_id: "40", master_id: "0", name: "Family Law" }, { service_id: "327", profession_id: "40", master_id: "308", name: "Discovery Support" }] });
  if (url.pathname === "/api/v2/data_posts/get" && url.searchParams.get("property") === "data_id") return Response.json({ status: "success", message: posts.filter((x) => x.data_id === url.searchParams.get("property_value")) });
  if (url.pathname === "/api/v2/data_categories/get/8") return Response.json({ status: "success", message: [{ data_id: "8", data_name: "Event", feature_categories: eventTopicList }] });
  if (url.pathname === "/api/v2/data_categories/get/15") {
    if (topicsRefused) return Response.json({ status: "error", message: "API Key does not have permission" }, { status: 403 });
    return Response.json({ status: "success", message: [{ data_id: "15", data_name: "Community Article", feature_categories: topicList }] });
  }
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: () => Promise.resolve(1), read: () => Promise.reject(new Error("missing")), remove: () => Promise.resolve(), put: () => Promise.resolve(),
};
const deps: Deps = { rpc, env: (k) => ({ BD_API_KEY: "bd-test-key", DELA_ORIGINS: "https://lawfecta.com", DELA_WORKER_SECRET: WORKER } as Record<string, string>)[k] ?? "", fetch: fakeFetch, storage };
async function get(path: string, m: M) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, { method: "GET", headers: { origin: "https://lawfecta.com", "x-dela-session": m.token } }), deps);
  return await res.json() as Record<string, any>;
}
const worker = () => handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];

const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(n: number, plan: string): Promise<M> {
  const bd = 8_300_000 + RUN * 10 + n;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name) values ($1, $2) returning id", [bd, "Master " + n])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
async function readyFreelancer(m: M, body: Record<string, unknown>) {
  await pool.query("insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) values ($1, 'freelancer', $2, '{}', 100, now())", [m.id, { first_name: "Fern", last_name: "Lastname" + m.bd, ...body }]);
  await pool.query("select dela_profile_refresh($1, 'freelancer')", [m.id]);
}
const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10).replaceAll("-", "");
const SW = ["talent_search", "profiles", "community", "master_pages", "hide_last_names"];
let was: Array<{ key: string; state: string }> = [], siteUrl: unknown = null;
let att: M, nurse: M, family: M, away: M, plain: M;
const CLAIM = 8_399_999_000 + RUN;
const mineOnly = (rows: Array<Record<string, any>>) => rows.filter((x) => [nurse.id, family.id, away.id, plain.id].includes(x.person_id));
const titles = (rows: Array<Record<string, any>>) => mineOnly(rows).map((x) => x.title);

Deno.test("setup", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  was = (await pool.query("select key, state from feature_switches where key = any($1)", [SW])).rows;
  await pool.query("update feature_switches set state = 'everyone' where key = any($1)", [SW]);
  await pool.query("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
  siteUrl = (await one("select value from settings where key = 'site.url'"))?.value ?? null;
  await pool.query("update settings set value = '\"https://bd.test\"' where key = 'site.url'");
  await pool.query("delete from bd_posts"); await pool.query("delete from bd_posts_state");
  att = await member(1, "att_free"); nurse = await member(2, "fl_free"); family = await member(3, "fl_plus"); away = await member(4, "fl_free"); plain = await member(5, "fl_free");
  await pool.query("insert into member_profiles (person_id, side, body, missing, score) values ($1, 'attorney', $2, '{}', 100)", [att.id, { first_name: "Ann", last_name: "Attorney", firm_name: "Example Legal" }]);
  // The categories copy, so a provider's categories count
  await get("/categories", att);
  const base = { practice_areas: [], software: [], skills: [], capacity_hours_week: 10, states_excluded: [] };
  await readyFreelancer(nurse, { ...base, headline: "Nurse reviewer", categories: ["s275"], services: [
    { title: "Medical chronology", for_whom: "Personal injury firms", price_from_cents: 30000, price_to_cents: 60000, unit: "fixed" },
    { title: "Record review", for_whom: "", price_from_cents: 9500, price_to_cents: null, unit: "hour" }] });
  await readyFreelancer(family, { ...base, headline: "Family paralegal", categories: ["s327"], services: [{ title: "Discovery drafting", for_whom: "Family law firms", price_from_cents: 15000, price_to_cents: null, unit: "fixed" }] });
  await readyFreelancer(away, { ...base, headline: "Not taking work", categories: ["s327"], services: [{ title: "Hidden service", for_whom: "", price_from_cents: 100, price_to_cents: null, unit: "fixed" }] });
  await pool.query("update member_profiles set availability = 'unavailable' where person_id = $1 and side = 'freelancer'", [away.id]);
  await readyFreelancer(plain, { ...base, headline: "No services listed", services: [] });
  const P = (id: string, m: number, o: Record<string, string>) => ({ post_id: String(RUN * 100 + Number(id)), data_id: "7", user_id: String(m), post_status: "1", post_category: "Category 1", post_content: "", ...o });
  const A = (id: string, m: number, o: Record<string, string>) => ({ post_id: String(RUN * 100 + Number(id)), data_id: "15", user_id: String(m), post_status: "1", post_content: "<p>Words.</p>", ...o });
  posts = [
    P("1", nurse.bd, { post_title: "Free rush upgrade", post_content: "<p>On your first chronology.</p><p>Call 512-555-0199 or write to nurse@example.com.</p><script>x()</script>", post_promo: "RUSH", post_expire_date: "20991231235900", post_live_date: "20261119090000" }),
    P("2", family.bd, { post_title: "15% off a custody package", post_promo: "", post_expire_date: day(1) + "235900", post_live_date: "20261117090000" }),
    P("3", nurse.bd, { post_title: "An offer that ended", post_expire_date: "20200101", post_live_date: "20261120090000" }),
    P("4", away.bd, { post_title: "From someone not taking work", post_expire_date: "20991231", post_live_date: "20261120090000" }),
    P("5", CLAIM, { post_title: "From a claim listing", post_expire_date: "20991231", post_live_date: "20261120090000" }),
    P("6", nurse.bd, { post_title: "A draft offer", post_status: "0", post_expire_date: "20991231" }),
    A("11", nurse.bd, { post_title: "What a chronology should include", post_category: "Category 1", post_live_date: "2026-11-18T09:00:00-08:00", post_content: "<p>Start with the intake notes.</p><p>See nursesite.com.</p>" }),
    A("12", family.bd, { post_title: "Five things before filing", post_category: "Family Law Tips", post_live_date: "2026-11-20T09:00:00-08:00" }),
    A("13", away.bd, { post_title: "Written by someone not taking work", post_category: "Family Law Tips", post_live_date: "2026-11-21T09:00:00-08:00" }),
    A("14", CLAIM, { post_title: "Written on a claim listing", post_category: "Family Law Tips", post_live_date: "2026-11-22T09:00:00-08:00" }),
    A("15", nurse.bd, { post_title: "An older article", post_category: "Old Topic", post_live_date: "2026-11-01T09:00:00-08:00" }),
    A("16", family.bd, { post_title: "An unpublished article", post_status: "0", post_category: "Family Law Tips", post_live_date: "2026-11-23T09:00:00-08:00" }),
  ];
});

Deno.test("Services: one card for each service of the freelancers Talent shows, with filters, three orders and pages; attorneys only", async () => {
  const r = await get("/master/services?limit=50", att);
  assertEquals(r.ok, true, JSON.stringify(r));
  assertEquals(titles(r.services).sort(), ["Discovery drafting", "Medical chronology", "Record review"], "every service of everyone shown, and nobody else's");
  // The same people as Talent search: nobody on a services card is missing from Talent, and the one Talent hides is hidden here
  const talent = ((await get("/talent?limit=50", att)).people as Array<Record<string, any>>).map((p) => p.person_id);
  assert(mineOnly(r.services).every((x) => talent.includes(x.person_id)) && !talent.includes(away.id) && talent.includes(plain.id), "the Talent search's rule decides who shows");
  const card = mineOnly(r.services).find((x) => x.title === "Medical chronology")!;
  assertEquals([card.for_whom, card.price_from_cents, card.price_to_cents, card.unit, card.headline, card.categories, card.photo_url, "photo_file" in card, card.no],
    ["Personal injury firms", 30000, 60000, "fixed", "Nurse reviewer", ["s275"], "", false, 1]);
  assert(!String(card.name).includes("Lastname") && String(card.name).startsWith("Fern"), "the provider's last name is not shown: " + card.name);
  const q = async (s: string) => titles((await get("/master/services?limit=50&" + s, att)).services);
  assertEquals((await q("category=p39")).sort(), ["Medical chronology", "Record review"], "a top category finds providers who picked anything under it");
  assertEquals(await q("category=s327"), ["Discovery drafting"], "the most specific level");
  assertEquals(await q("category=s267&unit=hour"), ["Record review"], "by the hour only");
  assertEquals(await q("max_cents=10000"), ["Record review"], "starts at or under an amount");
  assertEquals(await q("q=DISCOVERY"), ["Discovery drafting"], "words in the service");
  assertEquals(await q("sort=price_low"), ["Record review", "Discovery drafting", "Medical chronology"], "price, low to high");
  assertEquals(await q("sort=price_high"), ["Medical chronology", "Discovery drafting", "Record review"], "price, high to low");
  assertEquals((await get("/master/services?category=s99999", att)).reason, "category_gone");
  // Pages: one order across them, and the total stays
  const all = (await get("/master/services?sort=price_low&limit=50", att)).services as Array<Record<string, any>>;
  const p1 = await get("/master/services?sort=price_low&limit=2", att), p2 = await get("/master/services?sort=price_low&limit=2&offset=2", att);
  assertEquals([p1.total, p1.services.length, p2.services[0].title], [all.length, 2, all[2].title]);
  // A freelancer who stops taking work leaves the page at once; coming back puts them on it again
  await pool.query("update member_profiles set availability = 'unavailable' where person_id = $1 and side = 'freelancer'", [family.id]);
  assertEquals(await q("q=discovery"), [], "an unavailable freelancer's service is gone");
  await pool.query("update member_profiles set availability = 'available' where person_id = $1 and side = 'freelancer'", [family.id]);
  assertEquals(await q("q=discovery"), ["Discovery drafting"]);
  // Who may open it
  assertEquals((await get("/master/services", plain)).reason, "not_open", "a freelancer does not get the Services page");
  await pool.query("update feature_switches set state = 'off' where key = 'master_pages'");
  assertEquals((await get("/master/services", att)).reason, "not_open", "the switch off closes it");
  await pool.query("update feature_switches set state = 'everyone' where key = 'master_pages'");
});

Deno.test("Promotions: current offers only, from the same people; the copy is read once, refreshed by a job, and kept when the website fails", async () => {
  calls.length = 0;
  const r = await get("/master/promotions?limit=50", att);
  assertEquals(r.ok, true, JSON.stringify(r));
  assertEquals(titles(r.promotions), ["Free rush upgrade", "15% off a custody package"], "newest first; ended, unpublished, a claim listing's and an unavailable freelancer's are not shown");
  const first = mineOnly(r.promotions)[0];
  assertEquals([first.code, first.ends, first.posted], ["RUSH", "2099-12-31", "2026-11-19"], "the code and the dates come through");
  assert(!/512-555-0199|nurse@example\.com|script/.test(first.text) && first.text.startsWith("On your first chronology."), "markup and contact details are taken out: " + first.text);
  assert(!String(first.name).includes("Lastname") && r.fetched_at && r.website_ok === true);
  assertEquals(calls.filter((c) => c.includes("/data_posts/get")).length, 3, "the website was asked once for each kind (promotions, articles, events)");
  await get("/master/promotions", att);
  assertEquals(calls.filter((c) => c.includes("/data_posts/get")).length, 3, "a second visit reads DELA's copy, not the website");
  const q = async (s: string) => titles((await get("/master/promotions?limit=50&" + s, att)).promotions);
  assertEquals(await q("sort=ending"), ["15% off a custody package", "Free rush upgrade"], "ending soonest first");
  assertEquals(await q("category=p40"), ["15% off a custody package"], "filtered by the provider's category, any level");
  assertEquals(await q("category=s275"), ["Free rush upgrade"]);
  assertEquals(await q("q=custody"), ["15% off a custody package"]);
  assertEquals((await get("/master/promotions", plain)).reason, "not_open", "a freelancer does not get the Promotions page");
  // The copy is due: the page still answers from the copy, and a job refreshes it
  posts = posts.filter((x) => x.post_title !== "15% off a custody package");
  await pool.query("update bd_posts_state set tried_at = now() - interval '2 hours'");
  assertEquals(await q(""), ["Free rush upgrade", "15% off a custody package"], "the last copy is shown while it is refreshed");
  assert((await one("select count(*)::int n from jobs where kind = 'posts_sync' and status = 'queued'")).n >= 1, "a refresh job waits");
  await worker();
  assertEquals(await q(""), ["Free rush upgrade"], "a promotion taken down on the website leaves DELA with the next refresh");
  // The website refuses: nothing is lost, and the page says the copy may be out of date
  site = "refuse";
  await pool.query("update bd_posts_state set tried_at = now() - interval '2 hours'");
  await get("/master/promotions", att); await worker();
  const kept = await get("/master/promotions?limit=50", att);
  assertEquals([titles(kept.promotions), kept.website_ok], [["Free rush upgrade"], false], "the last good copy stays when the website does not answer");
  site = "ok";
  await pool.query("update bd_posts_state set tried_at = now() - interval '2 hours'");
  await get("/master/promotions", att); await worker();
  assertEquals((await get("/master/promotions", att)).website_ok, true);
});

Deno.test("Blog: in order of posting, topics from the website's own list, for both sides", async () => {
  for (const who of [att, plain]) {
    const r = await get("/master/blog?limit=50", who);
    assertEquals(r.ok, true, JSON.stringify(r));
    assertEquals(titles(r.articles), ["Five things before filing", "What a chronology should include", "An older article"], "newest first; a claim listing's, an unavailable author's and an unpublished one are not shown");
    assertEquals(r.topics, ["Family Law Tips", "Practice Management"], "the website's list, without the placeholders a new site comes with");
    assertEquals(mineOnly(r.articles).map((x) => x.topic), ["Family Law Tips", "", ""], "a placeholder or a topic that left the list is not shown as a topic");
    const a = mineOnly(r.articles)[1];
    assert(a.text.startsWith("Start with the intake notes.") && !a.text.includes("nursesite.com") && a.posted === "2026-11-18" && !String(a.name).includes("Lastname"), "text without contact details, the day it was posted, a short name");
  }
  assertEquals(titles((await get("/master/blog?topic=family%20law%20tips", plain)).articles), ["Five things before filing"], "one topic");
  const odd = await get("/master/blog?topic=Nope", att);
  assertEquals([odd.topic, titles(odd.articles).length], ["", 3], "a topic that is not on the list is ignored");
  // An author who is not shown in Talent still sees their own article, marked as theirs; nobody else does
  const own = await get("/master/blog?limit=50", away);
  assertEquals([titles(own.articles)[0], mineOnly(own.articles)[0].mine], ["Written by someone not taking work", true]);
  // Stacey renames the topics on the website: the next refresh brings her list
  topicList = "Family Law Tips,Trial Prep\nAutomation";
  await pool.query("update bd_posts_state set tried_at = now() - interval '2 hours'");
  await get("/master/blog", att); await worker();
  assertEquals((await get("/master/blog", att)).topics, ["Family Law Tips", "Trial Prep", "Automation"], "the topics follow the website's post type settings");
  // The key may not read post types: the last list stays
  topicsRefused = true;
  await pool.query("update bd_posts_state set tried_at = now() - interval '2 hours'");
  await get("/master/blog", att); await worker();
  const st = await one("select topics_ok, error from bd_posts_state where id = 1");
  assert(st.topics_ok === true && String(st.error).startsWith("topics"), "a refused topic list is noted and the last list is kept: " + st.error);
  // No list was ever read: the topics are the ones the shown articles carry
  await pool.query("update bd_posts_state set topics_ok = false, topics = '[]'");
  assertEquals((await get("/master/blog", att)).topics, ["Family Law Tips", "Old Topic"]);
  topicsRefused = false;
  // Community closed: no blog
  await pool.query("update feature_switches set state = 'off' where key = 'community'");
  assertEquals((await get("/master/blog", att)).reason, "not_open");
  await pool.query("update feature_switches set state = 'everyone' where key = 'community'");
});

Deno.test("Events: every member with Community sees what is coming up, soonest first, by the website's event categories", async () => {
  const E = (id: string, m: number | string, o: Record<string, string>) => ({ post_id: String(RUN * 100 + Number(id)), data_id: "8", user_id: String(m), post_status: "1", post_content: "<p>Details.</p>", post_category: "Category 1", ...o });
  const staff = await member(6, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'support')", [staff.id]);
  posts = posts.concat([
    E("21", nurse.bd, { post_title: "Records review workshop", post_start_date: day(5) + "183000", post_expire_date: day(5) + "200000", post_venue: "Online", post_location: "", post_promo: "Free", post_org_url: "https://events.example/workshop", post_image: "/uploads/news-pictures/workshop.webp",
      post_content: "<p>Bring one chart.</p><p>Questions: 512-555-0111 or nurse@example.com</p><script>x()</script>" }),
    E("22", CLAIM, { post_title: "Legal ops webinar", post_category: "Webinars", post_start_date: day(9) + "120000", post_expire_date: "", post_org_url: "http://plain.example/x", post_image: "https://evil.example/x.png" }),
    E("23", nurse.bd, { post_title: "Last week's meetup", post_category: "Meetups", post_start_date: day(-6) + "170000", post_expire_date: day(-6) + "190000" }),
    E("24", nurse.bd, { post_title: "A draft event", post_status: "0", post_start_date: day(3) + "100000" }),
    E("25", away.bd, { post_title: "Austin meetup", post_category: "Meetups", post_start_date: day(2) + "000000", post_expire_date: day(3) + "000000", post_venue: "The Library Bar", post_location: "100 Main St\nAustin, TX" }),
    E("26", nurse.bd, { post_title: "An event with no day", post_start_date: "" }),
    E("27", staff.bd, { post_title: "Lawfecta office hours", post_category: "Old Category", post_start_date: day(12) + "090000" }),
    E("28", "", { post_title: "Posted from the website's admin", post_category: "Webinars", post_start_date: day(20) + "150000" }),
  ]);
  await pool.query("update bd_posts_state set tried_at = now() - interval '2 hours'");
  await get("/master/events", att); await worker();
  const mine = (rows: Array<Record<string, any>>) => rows.filter((x) => Math.floor(Number(x.post_id) / 100) === RUN);
  for (const who of [att, plain, away]) {
    const r = await get("/master/events?limit=50", who);
    assertEquals(r.ok, true, JSON.stringify(r));
    assertEquals(mine(r.events).map((x) => x.title), ["Austin meetup", "Records review workshop", "Legal ops webinar", "Lawfecta office hours", "Posted from the website's admin"], "what is coming up, the soonest first; a draft, a past one and one with no day are not listed");
    assertEquals(r.topics, ["Webinars", "Meetups"], "the website's event categories, without the placeholders");
  }
  const r = await get("/master/events?limit=50", att);
  const by = (t: string) => mine(r.events).find((x) => x.title === t)!;
  const w = by("Records review workshop");
  assertEquals([w.start_time, w.end_time, w.venue, w.price, w.link, w.image_url, w.topic, w.gone, w.by_lawfecta], ["18:30", "20:00", "Online", "Free", "https://events.example/workshop", "https://bd.test/uploads/news-pictures/workshop.webp", "", false, false]);
  assert(w.text.startsWith("Bring one chart.") && !/512-555-0111|nurse@example\.com|script/.test(w.text) && String(w.name).startsWith("Fern") && !String(w.name).includes("Lastname"), "the text has no contact details; a freelancer organizer shows by a short name");
  const web = by("Legal ops webinar");
  assertEquals([web.link, web.image_url, web.person_id, web.name, web.topic, web.start_time], ["", "", undefined, undefined, "Webinars", "12:00"], "a link that is not https and a picture from another site are dropped; a poster who is not a shown freelancer is not named");
  const au = by("Austin meetup");
  assertEquals([au.start_time, au.location, au.person_id, au.ends !== au.starts], ["", "100 Main St, Austin, TX", undefined, true], "an all-day event over two days; the address is kept; a freelancer who is not shown is not named");
  assertEquals([by("Lawfecta office hours").by_lawfecta, by("Lawfecta office hours").topic, by("Posted from the website's admin").by_lawfecta], [true, "", false], "an event the Lawfecta Team posted says so; a category that left the list is not shown");
  // One category, and past events
  assertEquals(mine((await get("/master/events?topic=webinars", plain)).events).map((x) => x.title), ["Legal ops webinar", "Posted from the website's admin"]);
  const past = await get("/master/events?past=1", plain);
  assertEquals([mine(past.events).map((x) => x.title), mine(past.events)[0].gone, past.past], [["Last week's meetup"], true, true]);
  assert(r.past_count >= 1 && r.fetched_at);
  // Stacey renames the event categories on the website: the next refresh brings her list
  eventTopicList = "Webinars, In person";
  await pool.query("update bd_posts_state set tried_at = now() - interval '2 hours'");
  await get("/master/events", att); await worker();
  assertEquals((await get("/master/events", att)).topics, ["Webinars", "In person"]);
  // Community closed, or the page switched off: no events
  await pool.query("update feature_switches set state = 'off' where key = 'community'");
  assertEquals((await get("/master/events", att)).reason, "not_open");
  await pool.query("update feature_switches set state = 'everyone' where key = 'community'");
  await pool.query("update settings set value = '0' where key = 'bd.events_data_id'");
  assertEquals((await get("/master/events", att)).reason, "not_open");
  await pool.query("update settings set value = '8' where key = 'bd.events_data_id'");
});

Deno.test("teardown", async () => {
  for (const w of was) await pool.query("update feature_switches set state = $1 where key = $2", [w.state, w.key]);
  if (siteUrl !== null) await pool.query("update settings set value = $1 where key = 'site.url'", [JSON.stringify(siteUrl)]);
  await pool.query("delete from bd_posts"); await pool.query("delete from bd_posts_state");
  await pool.end();
});

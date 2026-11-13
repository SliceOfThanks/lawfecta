// Browser test of step 17 (docs/briefs/step-17-talent-categories.md): the website's categories on Talent and on the
// freelancer Profile page. Freelancer: find a category by typing (keyboard), browse category then specialty, pick, remove,
// save. Attorney: the search box suggests categories with their path, the three lists narrow each other, results show the
// freelancer's categories, free words search, Clear. Team: the "Website categories" card on the Tech catalog page.
// The website is the stand-in in tests/pw/server.ts (two categories, four specialties, three sub subs).
//   node tests/pw/categories-test.js   (with tests/pw/server.ts running)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://127.0.0.1:8787";
const ROOT = path.join(__dirname, "..", "..");
const SHOTS = process.env.SHOTS || path.join(ROOT, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
let passed = 0;
function ok(cond, msg) { if (!cond) throw new Error("FAILED: " + msg); passed++; console.log("ok", msg); }
async function sql(q) { const r = await fetch(BASE + "/test/sql", { method: "POST", body: JSON.stringify({ sql: q }) }); const j = await r.json(); if (j.error) throw new Error("sql: " + j.error); return j.rows; }
async function open(browser, widget, uid, query) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept());
  await page.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(ROOT, u.pathname.split("@")[1].split("/").slice(1).join("/")), contentType: "application/javascript" }); });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto(`${BASE}/page/${widget}?uid=${uid}&plan=${query || ""}`);
  await text(page);
  return { ctx, page };
}
async function text(page) {
  await page.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela").textContent.length > 20; });
  await page.waitForTimeout(150);
  return page.evaluate(() => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText);
}
const dela = (page) => page.locator(".dela-host");
async function waitFor(page, words, ms) {
  const end = Date.now() + (ms || 8000);
  let t = "";
  while (Date.now() < end) { t = await text(page); if (t.includes(words)) return t; await page.waitForTimeout(200); }
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(0, 3000));
}
async function waitGone(page, words, ms) {
  const end = Date.now() + (ms || 8000);
  let t = "";
  while (Date.now() < end) { t = await text(page); if (!t.includes(words)) return t; await page.waitForTimeout(200); }
  throw new Error("FAILED: still see \"" + words + "\"");
}
const click = (page, name) => dela(page).getByRole("button", { name, exact: true }).first().click();
const label = (page, name) => dela(page).getByLabel(name, { exact: true }).first();
const ATT = 4600, FL = 4601, FL2 = 4602, FL3 = 4603, TEAM = 4604;
const SEARCH = "Search roles, specialties, tasks and software";

(async () => {
  const browser = await chromium.launch();
  let s, p, t, before = null;
  try {
    // The suites after this one share the database: remember what this suite changes and put it back at the end
    before = (await sql("select (select jsonb_object_agg(key, state) from feature_switches where key in ('flex_gigs', 'profiles', 'talent_search', 'new_layout')) sw, (select value from settings where key = 'verify.freelancer_linkedin') li"))[0];
    await sql("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'profiles', 'talent_search', 'new_layout'); update settings set value = 'false' where key = 'verify.freelancer_linkedin'; select 1");
    await sql(`insert into people (bd_member_id, display_name, email) values (${ATT}, 'Cara Category', '${ATT}@test.invalid'), (${FL}, 'Nia Nurse', '${FL}@test.invalid'),
        (${FL2}, 'Fern Family', '${FL2}@test.invalid'), (${FL3}, 'Pat Picker', '${FL3}@test.invalid'), (${TEAM}, 'Theo Team', '${TEAM}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = ${ATT}), 'attorney', 'att_pro', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = x), 'freelancer', 'fl_plus', 'staff_grant') from unnest(array[${FL}, ${FL2}, ${FL3}]) x;
      insert into access_list (bd_member_id, channel) select x, 'access' from unnest(array[${ATT}, ${FL}, ${FL2}, ${FL3}]) x where not exists (select 1 from access_list where bd_member_id = x and channel = 'access' and revoked_at is null);
      insert into staff_roles (person_id, role) select id, 'support' from people where bd_member_id = ${TEAM} and not exists (select 1 from staff_roles s where s.person_id = people.id);
      insert into member_profiles (person_id, side, body, missing, score) select id, 'attorney', '{"firm_name":"Category Legal"}', '{}', 100 from people where bd_member_id = ${ATT} on conflict do nothing;
      insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) select id, 'l', 'TX', 'CT${ATT}', 'CT${ATT}', 'A', 'video', 'verified' from people where bd_member_id = ${ATT};
      select dela_profile_refresh((select id from people where bd_member_id = ${ATT}), 'attorney');
      insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"Nia","last_name":"Nurse","headline":"Nurse reviewer","categories":["s275"]}', '{}', 100, now() from people where bd_member_id = ${FL} on conflict do nothing;
      insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"Fern","last_name":"Family","headline":"Family paralegal","categories":["s327","s331"]}', '{}', 100, now() from people where bd_member_id = ${FL2} on conflict do nothing;
      update side_profiles set verification_state = 'verified', readiness_state = 'match_ready' where person_id in (select id from people where bd_member_id in (${FL}, ${FL2})) and side = 'freelancer'; select 1`);

    // ---------- Freelancer: pick categories on the Profile page ----------
    s = await open(browser, "DELA-App", FL3, "&tab=profile"); p = s.page;
    t = await waitFor(p, "Lawfecta categories", 15000);
    t = await waitFor(p, "None picked yet.", 10000);
    ok(t.includes("Attorneys search Talent by these categories."), "the Profile page explains what the categories are for");
    await label(p, "Find a category").fill("discov");
    await dela(p).locator(".cat-suggest li").first().waitFor({ timeout: 5000 });
    const opt = await dela(p).locator(".cat-suggest li").first().innerText();
    ok(opt.includes("Discovery Support") && opt.includes("Paralegal Services › Family Law"), "typing suggests a category with its place in the list: " + opt);
    await label(p, "Find a category").press("ArrowDown");
    ok(await label(p, "Find a category").getAttribute("aria-activedescendant") !== null, "the arrow keys move through the suggestions");
    await label(p, "Find a category").press("Enter");
    t = await waitFor(p, "Family Law › Discovery Support");
    ok(t.includes("Lawfecta categories (1 of 25 picked)"), "Enter picks it; the count shows the limit");
    await label(p, "Category to browse").selectOption({ label: "Legal Nurse & Medical Records" });
    await label(p, "Specialty to browse").selectOption({ label: "Medical Malpractice Review" });
    await click(p, "Medical Chronology Creation");
    t = await waitFor(p, "Medical Malpractice Review › Medical Chronology Creation");
    ok(await dela(p).getByRole("button", { name: "Medical Chronology Creation", exact: true }).getAttribute("aria-pressed") === "true", "browsing: category, then specialty, then a task button that shows it is picked");
    await click(p, "All of Medical Malpractice Review");
    await dela(p).getByRole("button", { name: "Remove Medical Malpractice Review", exact: true }).click();
    t = await waitGone(p, "Remove Medical Malpractice Review");
    ok(t.includes("2 of 25 picked"), "a picked category can be removed with its ×");
    await p.screenshot({ path: path.join(SHOTS, "categories-profile.png"), fullPage: true });
    // The button reads "Save", "Save to DELA only" or "Save and update my directory listing", by the listing tick
    await dela(p).getByRole("button", { name: /^Save( to DELA only| and update my directory listing)?$/ }).first().click();
    await waitFor(p, "Profile saved", 10000);
    const saved = (await sql(`select body->'categories' c from member_profiles where side = 'freelancer' and person_id = (select id from people where bd_member_id = ${FL3})`))[0];
    ok(saved && JSON.stringify(saved.c) === JSON.stringify(["s327", "s275"]), "Save keeps the picks in order: " + JSON.stringify(saved && saved.c));
    await s.ctx.close();

    // ---------- Attorney: Talent ----------
    s = await open(browser, "DELA-App", ATT, "&tab=talent"); p = s.page;
    t = await waitFor(p, "Find a freelancer", 15000);
    t = await waitFor(p, "Fern Family", 10000);
    ok(t.includes("Nia Nurse") && t.includes("Paralegal Services: Discovery Support, Clio"), "results list everyone match-ready, each with their categories grouped by category");
    ok(!t.includes("Practice area") && !t.includes("Tech tool"), "the old free-text boxes are gone");
    ok(await label(p, "Specialty").isDisabled() && await label(p, "Task, case type or software").isDisabled(), "the lower lists wait for the one above them");
    await label(p, SEARCH).fill("chron");
    await dela(p).locator(".cat-suggest li").first().waitFor({ timeout: 5000 });
    await dela(p).locator(".cat-suggest li").first().click();
    t = await waitGone(p, "Fern Family");
    ok(t.includes("Nia Nurse") && t.includes("1 freelancer fits this search."), "picking a suggestion searches that category");
    ok(await label(p, "Category").inputValue() === "p39" && await label(p, "Specialty").inputValue() === "s267" && await label(p, "Task, case type or software").inputValue() === "s275", "the three lists show where the picked category sits");
    await label(p, "Category").selectOption({ label: "Paralegal Services" });
    t = await waitFor(p, "Fern Family");
    ok(!t.includes("Nia Nurse"), "a category finds everyone in the categories below it");
    const subs = await label(p, "Specialty").locator("option").allInnerTexts();
    ok(subs.join("|") === "Any specialty|Civil Litigation|Family Law", "the specialties are the chosen category's only: " + subs.join("|"));
    await label(p, "Specialty").selectOption({ label: "Civil Litigation" });
    t = await waitGone(p, "Fern Family");
    ok(t.includes("No match-ready freelancers fit this search yet."), "an empty result says to try a broader category");
    await click(p, "Clear the search");
    t = await waitFor(p, "Nia Nurse");
    ok(t.includes("Fern Family"), "Clear the search shows everyone again");
    await label(p, SEARCH).fill("family paralegal");
    await label(p, SEARCH).press("Escape");
    ok(await label(p, SEARCH).inputValue() === "family paralegal", "Escape closes the suggestions and keeps the typed words");
    await label(p, SEARCH).press("Enter");
    t = await waitGone(p, "Nia Nurse");
    ok(t.includes("Fern Family"), "Enter searches the typed words");
    await p.screenshot({ path: path.join(SHOTS, "categories-talent.png"), fullPage: true });
    await s.ctx.close();

    // ---------- The Lawfecta Team: the Website categories card ----------
    s = await open(browser, "DELA-Admin", TEAM, "&tab=catalog"); p = s.page;
    t = await waitFor(p, "Website categories", 15000);
    t = await waitFor(p, "2 categories, 3 specialties, 4 tasks, case types and software.", 10000);
    // What started the first copy depends on what ran before this suite (first use, or the daily job), so only the result is checked
    ok(/[23] freelancers have picked categories\./.test(t) && t.includes("Copied: 2 categories, 7 below them"), "the card counts the copy and lists it: " + (t.split("Website categories")[1] || "").slice(0, 500));
    await click(p, "Refresh now");
    t = await waitFor(p, "Copied 2 categories and 7 below them.", 10000);
    const last = (await sql("select source, ok, subs from bd_category_syncs order by at desc limit 1"))[0];
    ok(last.source === "team" && last.ok && last.subs === 7 && t.includes("Copied: 2 categories, 7 below them"), "Refresh now copies the categories again and lists it");
    await s.ctx.close();

    console.log(`\n${passed} checks passed`);
  } finally {
    if (before) {
      for (const k of Object.keys(before.sw || {})) await sql(`update feature_switches set state = '${before.sw[k]}' where key = '${k}'; select 1`);
      await sql(`update settings set value = '${JSON.stringify(before.li)}'::jsonb where key = 'verify.freelancer_linkedin'; select 1`);
    }
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });

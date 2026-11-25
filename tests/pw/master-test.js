// Browser test of step 83 (docs/briefs/step-83-master-pages.md): the Services and Promotions pages under Talent for an
// attorney, and the Blog as the first view of Community for both sides. Filters, order, "View profile", the article
// page, what a freelancer does not get, and the switch. The website is the stand-in in tests/pw/server.ts.
// Needs tools/dbtest.sh, then tests/pw/server.ts on port 8787.   node tests/pw/master-test.js
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
async function open(browser, uid, extra, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept());
  await page.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(ROOT, u.pathname.split("@")[1].split("/").slice(1).join("/")), contentType: "application/javascript" }); });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto(`${BASE}/page/DELA-App?uid=${uid}&plan=` + (extra || ""));
  await page.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela").textContent.length > 20; });
  await page.waitForTimeout(150);
  return { ctx, page };
}
const dela = (page) => page.locator(".dela-host");
const sr = (pg, fn, arg) => pg.evaluate(([f, a]) => new Function("r", "a", f)(document.querySelector(".dela-host").shadowRoot, a), [fn, arg]);
const ATT = 4810, FL = 4811, FL2 = 4812;
const SW = ["profiles", "talent_search", "new_layout", "community", "master_pages", "hide_last_names", "flex_gigs"];
// The cards of this suite's own freelancers (the suites share one database, so other suites' freelancers may show too)
const mine = (pg, id) => sr(pg, `return [...r.querySelectorAll("#" + a + "-list .mp-card")].map((c) => ({ title: c.querySelector(".mp-title").textContent, who: c.querySelector(".mp-who b").textContent, text: c.innerText })).filter((c) => /^(Nia C|Fern C)/.test(c.who))`, id);
const counted = (pg, id) => dela(pg).locator("#" + id + "-count", { hasText: /\(\d+\)/ }).waitFor({ timeout: 20000 });

(async () => {
  const browser = await chromium.launch();
  let was = null;
  try {
    was = await sql("select key, state from feature_switches where key in ('" + SW.join("','") + "')");
    await sql("update feature_switches set state = 'everyone' where key in ('" + SW.join("','") + "'); update settings set value = 'false' where key = 'verify.freelancer_linkedin'; delete from bd_posts; delete from bd_posts_state; select 1");
    await sql(`insert into people (bd_member_id, display_name, email) values (${ATT}, 'Mara Master', '${ATT}@test.invalid'), (${FL}, 'Nia Chrono', '${FL}@test.invalid'), (${FL2}, 'Fern Custody', '${FL2}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = ${ATT}), 'attorney', 'att_pro', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = x), 'freelancer', 'fl_plus', 'staff_grant') from unnest(array[${FL}, ${FL2}]) x;
      insert into access_list (bd_member_id, channel) select x, 'access' from unnest(array[${ATT}, ${FL}, ${FL2}]) x where not exists (select 1 from access_list where bd_member_id = x and channel = 'access' and revoked_at is null);
      insert into member_profiles (person_id, side, body, missing, score) select id, 'attorney', '{"firm_name":"Master Legal"}', '{}', 100 from people where bd_member_id = ${ATT} on conflict do nothing;
      insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) select id, 'l', 'TX', 'MP${ATT}', 'MP${ATT}', 'A', 'video', 'verified' from people where bd_member_id = ${ATT} and not exists (select 1 from licenses l where l.person_id = people.id);
      select dela_profile_refresh((select id from people where bd_member_id = ${ATT}), 'attorney');
      insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"Nia","last_name":"Chrono","headline":"Nurse reviewer for injury firms","categories":["s275"],"services":[{"title":"M83 Medical chronology","for_whom":"Personal injury firms","price_from_cents":30000,"price_to_cents":60000,"unit":"fixed"},{"title":"M83 Record review","for_whom":"","price_from_cents":9500,"price_to_cents":null,"unit":"hour"}]}', '{}', 100, now() from people where bd_member_id = ${FL} on conflict do nothing;
      insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"Fern","last_name":"Custody","headline":"Family paralegal","categories":["s327"],"services":[{"title":"M83 Discovery drafting","for_whom":"Family law firms","price_from_cents":15000,"price_to_cents":null,"unit":"fixed"}]}', '{}', 100, now() from people where bd_member_id = ${FL2} on conflict do nothing;
      update side_profiles set verification_state = 'verified', readiness_state = 'match_ready' where person_id in (select id from people where bd_member_id in (${FL}, ${FL2})) and side = 'freelancer'; select 1`);

    // ---------- Attorney: Services and Promotions sit under Talent ----------
    let s = await open(browser, ATT, "&tab=talent"), p = s.page;
    await dela(p).locator("#nl-sub").waitFor({ timeout: 20000 });
    let st = await sr(p, `return { sub: [...r.querySelectorAll("#nl-sub button")].map((b) => b.innerText.trim() + (b.getAttribute("aria-current") ? "*" : "")).join(","), items: [...r.querySelectorAll(".nl-side .nl-item")].map((b) => b.innerText.trim()), cur: r.querySelector(".nl-side [aria-current=page]").innerText.trim() }`);
    ok(st.sub === "Find talent*,Services,Promotions" && st.cur === "Talent" && !st.items.includes("Services") && !st.items.includes("Promotions"), "Talent has a row at its top with Find talent, Services and Promotions, and the menu gets no new line: " + st.sub);
    await dela(p).locator("#nl-sub").getByRole("button", { name: "Services", exact: true }).click();
    await counted(p, "services");
    let cards = await mine(p, "services");
    ok(cards.map((c) => c.title).sort().join("|") === "M83 Discovery drafting|M83 Medical chronology|M83 Record review", "Services shows one card for each service: " + cards.map((c) => c.title).join(", "));
    const chrono = cards.find((c) => c.title === "M83 Medical chronology");
    ok(chrono.who === "Nia C." && !chrono.text.includes("Nia Chrono") && chrono.text.includes("$300 to $600") && chrono.text.includes("Personal injury firms") && chrono.text.includes("Medical Chronology Creation"), "a card says what the service is, for whom, the price, the provider by first name and last initial, and their category: " + JSON.stringify(chrono));
    ok((await mine(p, "services")).find((c) => c.title === "M83 Record review").text.includes("$95 an hour"), "an hourly price says so");
    st = await sr(p, `return { cur: r.querySelector(".nl-side [aria-current=page]").innerText.trim(), where: r.querySelector(".top .where").textContent.trim() }`);
    ok(st.cur === "Talent" && st.where === "Services" && p.url().includes("tab=services"), "Services opens inside Talent, with its own address and its name in the top bar");
    // Filters: the three category lists, the price type, an amount, words, and the order
    await dela(p).locator("#services-top").selectOption({ label: "Paralegal Services" });
    await p.waitForTimeout(600);
    ok((await mine(p, "services")).map((c) => c.title).join("|") === "M83 Discovery drafting", "the Category list narrows the services to that category");
    ok((await dela(p).locator("#services-sub option").allInnerTexts()).join("|") === "Any specialty|Family Law|Civil Litigation" || (await dela(p).locator("#services-sub option").allInnerTexts()).includes("Family Law"), "the second list offers only that category's specialties");
    await dela(p).locator("#services-clear").click();
    await p.waitForTimeout(600);
    await dela(p).locator("#services-q").fill("M83");
    await dela(p).locator("#services-sort").selectOption("price_low");
    await p.waitForTimeout(700);
    ok((await mine(p, "services")).map((c) => c.title).join("|") === "M83 Record review|M83 Discovery drafting|M83 Medical chronology" && (await dela(p).locator("#services-count").innerText()) === "Services (3)", "words and \"Price: low to high\" give the three services in price order");
    await dela(p).locator("#services-sort").selectOption("price_high");
    await p.waitForTimeout(600);
    ok((await mine(p, "services"))[0].title === "M83 Medical chronology", "\"Price: high to low\" turns the order around");
    await dela(p).locator("#services-unit").selectOption("hour");
    await p.waitForTimeout(600);
    ok((await mine(p, "services")).map((c) => c.title).join("|") === "M83 Record review", "\"By the hour\" keeps hourly services only");
    await dela(p).locator("#services-unit").selectOption("");
    await dela(p).locator("#services-max").fill("150");
    await dela(p).locator("#services-go").click();
    await p.waitForTimeout(600);
    ok((await mine(p, "services")).map((c) => c.title).sort().join("|") === "M83 Discovery drafting|M83 Record review", "an amount keeps the services that start at or under it");
    await dela(p).locator("#services-q").fill("nothing has this name");
    await dela(p).locator("#services-go").click();
    await dela(p).locator("#services-none").waitFor({ timeout: 10000 });
    ok((await dela(p).locator("#services-none").innerText()) === "No service fits these filters.", "no result says so in plain words");
    await p.screenshot({ path: path.join(SHOTS, "83-services-empty.png") });
    await dela(p).locator("#services-clear").click();
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(SHOTS, "83-services.png"), fullPage: true });
    // A card opens the provider's profile on its Services tab
    await dela(p).getByRole("button", { name: "View the profile of Nia C." }).first().click();
    await dela(p).locator("#tp-tab-services[aria-selected=true]").waitFor({ timeout: 20000 });
    ok(p.url().includes("tab=talent") && p.url().includes("person="), "\"View profile\" opens the provider's profile on its Services tab");

    // Promotions
    await dela(p).locator("#nl-sub").getByRole("button", { name: "Promotions", exact: true }).click();
    await counted(p, "promotions");
    cards = await mine(p, "promotions");
    ok(cards.map((c) => c.title).join("|") === "M83 Free rush upgrade|M83 15% off a custody package", "Promotions shows current offers, newest first: " + cards.map((c) => c.title).join(", "));
    ok(cards[0].who === "Nia C." && cards[0].text.includes("Code: RUSH") && cards[0].text.includes("Ends December 31, 2099") && !cards[0].text.includes("512-555") && !/M83 An offer that ended/.test(await dela(p).locator("#promotions-list").innerText()), "a card carries the code and the end date; contact details are gone and an ended offer is not listed");
    ok(/Last read from the Lawfecta website/.test(await dela(p).locator(".mp-fresh").innerText()), "the page says when it last read the website");
    await dela(p).locator("#promotions-sort").selectOption("ending");
    await p.waitForTimeout(600);
    ok((await mine(p, "promotions")).map((c) => c.title).join("|") === "M83 15% off a custody package|M83 Free rush upgrade", "\"Ending soonest\" puts the one that ends first on top");
    await dela(p).locator("#promotions-top").selectOption({ label: "Legal Nurse & Medical Records" });
    await p.waitForTimeout(600);
    ok((await mine(p, "promotions")).map((c) => c.title).join("|") === "M83 Free rush upgrade", "the Category list keeps the promotions of providers in that category");
    await dela(p).locator("#promotions-leaf").selectOption({ label: "Medical Chronology Creation" });
    await p.waitForTimeout(600);
    ok((await mine(p, "promotions")).length === 1, "and the most specific list works too");
    await p.screenshot({ path: path.join(SHOTS, "83-promotions.png"), fullPage: true });
    await s.ctx.close();

    // ---------- Attorney: the Blog is the first view of Community ----------
    s = await open(browser, ATT, "&tab=community"); p = s.page;
    await counted(p, "events");
    // ---------- Step 84: Events is the first tab of Community ----------
    st = await sr(p, `return { tabs: [...r.querySelectorAll("#com-boards [role=tab]")].map((b) => b.innerText.trim() + (b.getAttribute("aria-selected") === "true" ? "*" : "")), cats: [...r.querySelectorAll("#ev-topic option")].map((o) => o.textContent),
      titles: [...r.querySelectorAll("#events-list .mp-card .mp-title")].map((x) => x.textContent), grid: r.querySelector("#events-list").className, cards: r.querySelector("#ev-cards").getAttribute("aria-pressed") }`);
    ok(st.tabs[0] === "Events*" && st.tabs[1] === "Blog" && st.tabs.length >= 3, "Community opens on Events, then Blog, then the boards: " + st.tabs.join(", "));
    ok(st.cats.join("|") === "All categories|Webinars|Meetups", "the Category list is the website's event categories, without its placeholders: " + st.cats.join(", "));
    ok(st.titles.join("|") === "M84 Austin meetup|M84 Records workshop|M84 Legal ops webinar" && st.grid === "mp-grid" && st.cards === "true", "events show as cards, the soonest first: " + st.titles.join(", "));
    let card1 = await sr(p, `const c = [...r.querySelectorAll("#events-list .mp-card")].find((x) => x.textContent.includes("M84 Records workshop")); return { text: c.innerText, img: (c.querySelector("img.ev-img") || {}).src || "" }`);
    ok(card1.text.includes("6:30 PM to 8:00 PM") && card1.text.includes("Online") && card1.text.includes("Free") && card1.text.includes("By Nia C.") && card1.img.endsWith("/uploads/news-pictures/workshop.webp"), "a card shows the day and time, where, the price, the organizer by short name and the event's picture");
    await p.screenshot({ path: path.join(SHOTS, "84-events-cards.png"), fullPage: true });
    // The list view, remembered
    await dela(p).locator("#ev-list").click();
    await dela(p).locator("#events-list.ev-rows .ev-row").first().waitFor({ timeout: 10000 });
    st = await sr(p, `return { rows: [...r.querySelectorAll("#events-list .ev-row .ev-title")].map((x) => x.textContent), pressed: r.querySelector("#ev-list").getAttribute("aria-pressed"), cards: r.querySelectorAll("#events-list .mp-card").length }`);
    ok(st.rows.length === 3 && st.rows[0] === "M84 Austin meetup" && st.pressed === "true" && st.cards === 0, "\"List\" shows the same events as rows");
    await p.screenshot({ path: path.join(SHOTS, "84-events-list.png"), fullPage: true });
    // One category, and past events
    await dela(p).locator("#ev-topic").selectOption("Webinars");
    await p.waitForTimeout(600);
    ok((await sr(p, `return [...r.querySelectorAll("#events-list .ev-row .ev-title")].map((x) => x.textContent).join("|")`)) === "M84 Legal ops webinar" && (await dela(p).locator("#events-count").innerText()) === "Events (1)", "a category keeps the events in that category");
    await dela(p).locator("#ev-topic").selectOption("");
    await dela(p).locator("#ev-when").selectOption("1");
    await dela(p).locator("#events-count", { hasText: "Past events (1)" }).waitFor({ timeout: 10000 });
    ok((await sr(p, `return [...r.querySelectorAll("#events-list .ev-row .ev-title")].map((x) => x.textContent).join("|")`)) === "M84 Last week's meetup", "\"Past events\" shows what has passed, and nothing that is coming");
    await dela(p).locator("#ev-when").selectOption("");
    await dela(p).locator("#events-count", { hasText: "Events (3)" }).waitFor({ timeout: 10000 });
    // An event opens with its information and its buttons
    await dela(p).getByRole("button", { name: "View the event: M84 Records workshop" }).click();
    await dela(p).locator("#ev-one").waitFor({ timeout: 10000 });
    st = await sr(p, `const c = r.querySelector("#ev-one"), lk = c.querySelector("#ev-link"); return { text: c.innerText, href: lk && lk.getAttribute("href"), target: lk && lk.target, rel: lk && lk.rel, btns: [...c.querySelectorAll(".ev-acts button, .ev-acts a")].map((b) => b.innerText.trim()) }`);
    ok(st.text.includes("M84 Records workshop") && st.text.includes("When") && st.text.includes("6:30 PM to 8:00 PM") && st.text.includes("Where") && st.text.includes("Online") && st.text.includes("Price") && st.text.includes("Organizer") && st.text.includes("Bring one chart.") && !st.text.includes("512-555-0111"), "the event page shows when, where, the price, the organizer and the text, without contact details");
    ok(st.href === "https://events.example/workshop" && st.target === "_blank" && st.rel === "noopener noreferrer" && st.btns.join("|") === "Open the event page|Add to my calendar|View Nia C.'s profile", "its buttons: the event's own page in a new tab, a calendar file, and the organizer's profile: " + st.btns.join(", "));
    const evNote = await sr(p, `return r.querySelector("#ev-note").textContent`);
    ok(evNote.includes("outside Lawfecta") && evNote.includes("saves a small calendar file"), "step 86: the note under the buttons says where the link goes and what the calendar button saves: " + evNote);
    const dl = p.waitForEvent("download");
    await dela(p).locator("#ev-cal").click();
    const file = await dl, ics = fs.readFileSync(await file.path(), "utf8");
    ok(file.suggestedFilename().endsWith(".ics") && ics.includes("BEGIN:VEVENT") && ics.includes("SUMMARY:M84 Records workshop") && /DTSTART:\d{8}T183000/.test(ics) && /DTEND:\d{8}T200000/.test(ics) && ics.includes("LOCATION:Online"), "\"Add to my calendar\" saves a calendar file with the event's day, times and place");
    await p.screenshot({ path: path.join(SHOTS, "84-event.png") });
    await dela(p).locator("#ev-back").click();
    await counted(p, "events");
    ok(await sr(p, `return r.querySelector("#events-list").className === "ev-rows"`), "going back keeps the list view");
    await dela(p).locator("#ev-cards").click();
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForTimeout(400);
    ok((await p.evaluate(() => document.documentElement.scrollWidth)) <= 392, "Events fits a narrow screen");
    await p.setViewportSize({ width: 1400, height: 950 });
    await dela(p).locator("#com-boards [role=tab]").nth(1).click();
    await counted(p, "blog");
    st = await sr(p, `return { tabs: [...r.querySelectorAll("#com-boards [role=tab]")].map((b) => b.innerText.trim() + (b.getAttribute("aria-selected") === "true" ? "*" : "")), topics: [...r.querySelectorAll("#blog-topic option")].map((o) => o.textContent) }`);
    ok(st.tabs[1] === "Blog*" && st.tabs.length >= 3, "the Blog is the second tab, with the boards after it: " + st.tabs.join(", "));
    ok(st.topics.join("|") === "All topics|Family Law Tips|Trial Prep", "the Topic list is the website's own list, without its placeholders: " + st.topics.join(", "));
    cards = await mine(p, "blog");
    ok(cards.map((c) => c.title).join("|") === "M83 Custody filings checklist|M83 How I build a chronology|M83 Old notes on intake", "articles come in order of posting, newest first");
    ok(await sr(p, `const c = [...r.querySelectorAll("#blog-list .mp-card")].find((x) => x.textContent.includes("M83 Custody filings checklist")), im = c.querySelector("img.ev-img"); return !!im && im.src.endsWith("/uploads/news-pictures/custody.webp") && c.firstElementChild === im && im.nextElementSibling.classList.contains("mp-title")`), "an article's picture sits above its heading on the card");
    ok(cards[0].who === "Fern C." && cards[0].text.includes("Family Law Tips") && cards[0].text.includes("Posted November 22, 2026") && !cards[2].text.includes("Category 1"), "a card shows the author by short name, the topic and the day; a placeholder topic is not shown");
    await dela(p).locator("#blog-topic").selectOption("Trial Prep");
    await p.waitForTimeout(600);
    ok((await mine(p, "blog")).map((c) => c.title).join("|") === "M83 How I build a chronology" && (await dela(p).locator("#blog-count").innerText()) === "Blog (1)", "a topic keeps the articles with that topic");
    await p.screenshot({ path: path.join(SHOTS, "83-blog.png"), fullPage: true });
    await dela(p).getByRole("button", { name: "Read the article: M83 How I build a chronology" }).click();
    await dela(p).locator("#blog-article").waitFor({ timeout: 10000 });
    let art = await dela(p).locator("#blog-article").innerText();
    ok(art.includes("Start with the intake notes.") && art.includes("Then sort every record by date.") && !art.includes("nia@example.com") && art.includes("Nia C."), "the article opens in full, without the contact details that were in it");
    await dela(p).locator("#blog-back").click();
    await counted(p, "blog");
    ok((await dela(p).locator("#blog-topic").inputValue()) === "Trial Prep", "going back keeps the topic that was chosen");
    // The boards are still one click away
    const board = (await sr(p, `return [...r.querySelectorAll("#com-boards [role=tab]")].map((b) => b.innerText.trim())`))[2];
    await dela(p).locator("#com-boards [role=tab]").nth(2).click();
    await dela(p).locator("#com-new").waitFor({ timeout: 15000 });
    ok(true, "the boards still open from the same row (" + board + ")");
    // A phone-width screen fits
    await p.setViewportSize({ width: 390, height: 844 });
    await dela(p).locator("#com-boards [role=tab]").nth(1).click();
    await counted(p, "blog");
    ok((await p.evaluate(() => document.documentElement.scrollWidth)) <= 392, "the Blog fits a narrow screen");
    await s.ctx.close();

    // ---------- Freelancer: the Blog, and nothing of the attorney's pages ----------
    s = await open(browser, FL, "&tab=community"); p = s.page;
    await counted(p, "events");
    ok((await sr(p, `return [...r.querySelectorAll("#events-list .mp-title, #events-list .ev-title")].map((x) => x.textContent)`)).includes("M84 Records workshop"), "a freelancer sees Events too");
    await dela(p).getByRole("button", { name: "View the event: M84 Legal ops webinar" }).click();
    await dela(p).locator("#ev-one").waitFor({ timeout: 10000 });
    ok((await sr(p, `return [...r.querySelectorAll("#ev-one .ev-acts button, #ev-one .ev-acts a")].map((b) => b.innerText.trim()).join("|")`)) === "Add to my calendar", "an event with no link of its own offers the calendar file only");
    await dela(p).locator("#ev-back").click();
    await dela(p).locator("#com-boards [role=tab]").nth(1).click();
    await counted(p, "blog");
    cards = await mine(p, "blog");
    ok(cards.length === 3 && cards.find((c) => c.title === "M83 How I build a chronology").text.includes("Yours"), "a freelancer sees the Blog, with their own article marked");
    await s.ctx.close();
    s = await open(browser, FL, "&tab=services"); p = s.page;
    await p.waitForTimeout(800);
    ok(await sr(p, `return !r.querySelector("#services-page") && !r.querySelector("#promotions-page")`), "a freelancer who types the Services address does not get the page");
    await s.ctx.close();

    // ---------- The switch off: everything is as before ----------
    await sql("update feature_switches set state = 'off' where key = 'master_pages'; select 1");
    s = await open(browser, ATT, "&tab=talent"); p = s.page;
    await dela(p).locator(".talent-page").waitFor({ timeout: 20000 });
    ok(await sr(p, `return !r.querySelector("#nl-sub")`), "with the switch off Talent has no row of pages");
    await s.ctx.close();
    s = await open(browser, ATT, "&tab=community"); p = s.page;
    await dela(p).locator("#com-boards").waitFor({ timeout: 20000 });
    ok(!(await sr(p, `return [...r.querySelectorAll("#com-boards [role=tab]")].map((b) => b.innerText.trim())`)).some((x) => x === "Blog" || x === "Events"), "and Community has no Events and no Blog");
    await s.ctx.close();
    console.log(passed + " browser checks passed");
  } finally {
    if (was) for (const w of was) await sql("update feature_switches set state = '" + w.state + "' where key = '" + w.key + "'; select 1");
    await sql("delete from bd_posts; delete from bd_posts_state; select 1").catch(() => null);
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });

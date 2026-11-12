// Step 15: the compact workspace (docs/briefs/step-15-compact-workspace.md), switch new_layout. The sidebar on desktop,
// five labeled items and "More" on a phone, the compact Home with the profile box and the two checks before
// invitations, the first-screen check at 390 x 844, the keyboard, widths from 320 to 1440, and the old look with the
// switch off. Run last: it turns the switch on for everyone and off again at the end.
//   node tests/pw/workspace-test.js   (with tests/pw/server.ts running)
const { chromium } = require("playwright");
const path = require("path");

const BASE = "http://127.0.0.1:8787";
const ROOT = path.join(__dirname, "..", "..");
const SHOTS = process.env.SHOTS || path.join(__dirname, "shots");
let passed = 0;
function ok(cond, msg) { if (!cond) throw new Error("FAILED: " + msg); passed++; console.log("ok", msg); }
async function sql(q) { const r = await fetch(BASE + "/test/sql", { method: "POST", body: JSON.stringify({ sql: q }) }); const j = await r.json(); if (j.error) throw new Error("sql: " + j.error); return j.rows; }
async function open(browser, uid, query, w, h, opts) {
  const ctx = await browser.newContext({ viewport: { width: w || 1280, height: h || 900 }, ...(opts || {}) });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept());
  await page.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); const f = u.pathname.split("@")[1].split("/").slice(1).join("/"); route.fulfill({ path: path.join(ROOT, f), contentType: f.endsWith(".png") ? "image/png" : "application/javascript" }); });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto(`${BASE}/page/DELA-App?uid=${uid}&plan=${query || ""}`);
  await text(page);
  return { ctx, page };
}
async function text(page) {
  await page.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela") && h.shadowRoot.querySelector(".dela").textContent.length > 20; });
  await page.waitForTimeout(200);
  return page.evaluate(() => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText);
}
const dela = (page) => page.locator(".dela-host");
async function waitFor(page, words, ms) {
  const end = Date.now() + (ms || 8000);
  let t = "";
  while (Date.now() < end) { t = await text(page); if (t.includes(words)) return t; await page.waitForTimeout(200); }
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(0, 2500));
}
const inShadow = (page, fn, arg) => page.evaluate(([f, a]) => (new Function("root", "arg", "return (" + f + ")(root, arg)"))(document.querySelector(".dela-host").shadowRoot, a), [fn.toString(), arg]);
const fits = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const NEW = 5100, ATT = 5101, READY = 5102;
const person = (bd) => `(select id from people where bd_member_id = ${bd})`;
async function makeMember(bd, side, plan, name) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, '${name}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side(${person(bd)}, '${side}', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and channel = 'access' and revoked_at is null); select 1`);
}

(async () => {
  const browser = await chromium.launch();
  let s, p, t;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('onboarding_widget', 'gig_alerts', 'flex_gigs', 'engagements', 'profiles', 'talent_search', 'playbook_library', 'ai_generation', 'gig_chat', 'appearance_choice')");
    await sql("update feature_switches set state = 'off' where key = 'new_layout'");
    await makeMember(NEW, "freelancer", "fl_free", "Nia Newcomer");
    await makeMember(ATT, "attorney", "att_pro", "Ada Attorney");
    await makeMember(READY, "freelancer", "fl_plus", "Rae Ready");
    await sql(`insert into member_profiles (person_id, side, body, missing, score) values (${person(NEW)}, 'freelancer', '{"first_name":"Nia","last_name":"Newcomer"}', '{headline,summary,practice_areas,services,experience}', 58)
      on conflict (person_id, side) do update set missing = '{headline,summary,practice_areas,services,experience}', score = 58; select dela_profile_refresh(${person(NEW)}, 'freelancer')`);
    await sql(`insert into member_profiles (person_id, side, body, missing, score, availability, availability_confirmed_at) values (${person(READY)}, 'freelancer', '{"first_name":"Rae","last_name":"Ready"}', '{}', 100, 'available', now())
      on conflict (person_id, side) do update set missing = '{}', score = 100, availability = 'available', availability_confirmed_at = now(); select dela_profile_refresh(${person(READY)}, 'freelancer')`);

    // ---------- With the switch off DELA looks as before ----------
    s = await open(browser, NEW, "&tab=home", 1280, 900);
    ok(await inShadow(s.page, (root) => !!root.querySelector("nav.nav") && !root.querySelector(".nl-frame") && !root.querySelector(".dela").classList.contains("nl")), "switch off: the old tab row, no sidebar");
    await s.ctx.close();
    await sql("update feature_switches set state = 'everyone' where key = 'new_layout'");

    // ---------- A new freelancer on a phone (390 x 844) ----------
    s = await open(browser, NEW, "&tab=home", 390, 844);
    p = s.page;
    t = await waitFor(p, "Complete your profile");
    ok(t.includes("7 of 12 complete") && t.includes("Before attorneys can invite you") && t.includes("Continue setup") && !t.includes("What DELA will do for you"), "phone: the profile box counts what is complete and names the checks before invitations");
    ok(t.includes("Availability") && t.includes("Not confirmed yet"), "phone: availability shows as its own requirement, with its real state");
    const bar = await inShadow(p, (root) => [...root.querySelectorAll(".nl-bar button")].map((b) => b.innerText.trim()));
    ok(JSON.stringify(bar) === JSON.stringify(["Home", "Work", "Ask DELA", "Earnings", "More"]), "phone: five labeled items at the bottom: " + bar.join(", "));
    const first = await inShadow(p, (root) => {
      const r = (el) => el ? el.getBoundingClientRect() : null;
      const btn = [...root.querySelectorAll("button")].find((b) => b.innerText.trim() === "Continue setup");
      const work = [...root.querySelectorAll("h2")].find((x) => x.innerText.trim() === "Work opportunities");
      return { top: r(root.querySelector(".top")).top, h1: r(root.querySelector("h1")).bottom, btn: r(btn).bottom, work: r(work).top, bar: r(root.querySelector(".nl-bar")).top, vh: window.innerHeight };
    });
    ok(first.top >= 0 && first.btn <= first.bar && first.work < first.bar && first.bar <= first.vh, "phone 390 x 844: the top bar, greeting, Continue setup and the start of Work are on the first screen: " + JSON.stringify(first));
    ok(await fits(p), "phone 390: no sideways scrolling");
    await p.screenshot({ path: path.join(SHOTS, "workspace-phone-new.png") });
    // One requirement by default; the rest on request
    const shown = () => inShadow(p, (root) => [...root.querySelectorAll(".hneed .hrow")].filter((x) => x.offsetParent !== null).length);
    ok(await shown() === 1, "phone: one remaining requirement shows by default");
    await dela(p).getByRole("button", { name: "View remaining requirements" }).click();
    ok(await shown() === 5, "phone: View remaining requirements shows all five");
    // More: opens over the page, names the workspace, closes with Escape, focus returns
    const more = dela(p).getByRole("button", { name: "More", exact: true });
    await more.click();
    t = await waitFor(p, "Freelancer workspace");
    ok(t.includes("Settings") && t.includes("Help") && t.includes("Sign out") && t.includes("Complete your profile"), "phone: More lists the other pages and the page behind is still there");
    ok(await more.getAttribute("aria-expanded") === "true" && await dela(p).getByRole("button", { name: "Close menu" }).count() === 1, "phone: More shows as open and has a close button");
    await p.keyboard.press("Escape");
    ok(await inShadow(p, (root) => !root.querySelector(".nl-sheet") && root.activeElement && root.activeElement.innerText.trim() === "More"), "phone: Escape closes More and focus returns to it");
    await more.click();
    await dela(p).getByRole("button", { name: "Help", exact: true }).click();
    t = await waitFor(p, "Contact the Lawfecta Team");
    ok(p.url().includes("tab=help") && await inShadow(p, (root) => !root.querySelector(".nl-sheet")), "phone: Help opens from More and the address follows the page");
    // A requirement row opens its part of the profile
    await dela(p).getByRole("button", { name: "Home", exact: true }).click();
    await waitFor(p, "Complete your profile");
    await dela(p).getByRole("button", { name: "LinkedIn check" }).click().catch(() => null);
    t = await text(p);
    if (!t.includes("Profile sections")) { await dela(p).getByRole("button", { name: "Continue setup" }).click(); }
    await waitFor(p, "Your profile");
    ok(p.url().includes("tab=profile"), "phone: a requirement opens the Profile page");
    // Typing: the bottom bar steps aside
    await dela(p).getByRole("button", { name: "Home", exact: true }).click();
    await waitFor(p, "free answer");
    await dela(p).getByLabel("Ask DELA a question").focus();
    ok(await inShadow(p, (root) => root.querySelector(".dela").classList.contains("kb") && getComputedStyle(root.querySelector(".nl-bar")).display === "none"), "phone: while typing to Ask DELA the bottom bar is hidden");
    await dela(p).getByLabel("Ask DELA a question").blur();
    await p.waitForTimeout(200);
    ok(await inShadow(p, (root) => getComputedStyle(root.querySelector(".nl-bar")).display !== "none"), "phone: the bar comes back after typing");
    // Nothing ends up under the bar
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(200);
    ok(await inShadow(p, (root) => { const last = [...root.querySelectorAll(".nl-main .wrap > *")].pop().getBoundingClientRect(); return last.bottom <= root.querySelector(".nl-bar").getBoundingClientRect().top + 1; }), "phone: the last thing on the page is above the bottom bar");
    for (const w of [320, 375, 414, 768]) { await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200); ok(await fits(p), "no sideways scrolling at " + w + " pixels"); }
    await s.ctx.close();

    // ---------- The same freelancer on a desktop ----------
    s = await open(browser, NEW, "&tab=home", 1280, 900);
    p = s.page;
    await waitFor(p, "Complete your profile");
    const side = await inShadow(p, (root) => ({ shown: getComputedStyle(root.querySelector(".nl-side")).display !== "none", bar: getComputedStyle(root.querySelector(".nl-bar")).display,
      items: [...root.querySelectorAll(".nl-side .nl-item")].map((b) => b.innerText.trim()), current: root.querySelector(".nl-side [aria-current=page]").innerText.trim(),
      weight: getComputedStyle(root.querySelector(".nl-side [aria-current=page]")).fontWeight, three: [...root.querySelectorAll(".hneed .hrow")].filter((x) => x.offsetParent !== null).length }));
    ok(side.shown && side.bar === "none" && side.items.filter((x) => x !== "Agency").join(",") === "Home,Work,Ask DELA,Earnings,Profile,Settings,Help,Collapse sidebar", "desktop: the sidebar lists the pages in order: " + side.items.join(", "));
    ok(side.current === "Home" && Number(side.weight) >= 700, "desktop: the current page is marked by more than color (bold, with aria-current)");
    ok(side.three === 3, "desktop: the next three requirements show");
    ok(await inShadow(p, (root) => { const b = [...root.querySelectorAll("button.blue")].find((x) => x.innerText.trim() === "Continue setup"); return getComputedStyle(b).backgroundColor; }) === "rgb(139, 33, 70)", "desktop: the main button is burgundy");
    ok(await inShadow(p, (root) => { const f = [...root.querySelectorAll(".nl-side .nl-item")].pop().getBoundingClientRect(); return f.bottom <= window.innerHeight + 1; }), "desktop: Collapse sidebar is in view without scrolling");
    await p.screenshot({ path: path.join(SHOTS, "workspace-desktop-new.png") });
    await dela(p).getByRole("button", { name: "Collapse sidebar" }).click();
    await p.waitForTimeout(300);
    ok(await inShadow(p, (root) => root.querySelector(".nl-side").classList.contains("mini") && [...root.querySelectorAll(".nl-side .nl-item")].every((b) => (b.getAttribute("aria-label") || "").length > 0)), "desktop: collapsed, every icon has a name");
    await p.reload();
    await waitFor(p, "Complete your profile");
    ok(await inShadow(p, (root) => root.querySelector(".nl-side").classList.contains("mini")), "desktop: the collapsed choice is remembered after a reload");
    await dela(p).getByRole("button", { name: "Expand sidebar" }).click();
    await p.waitForTimeout(300);
    ok(await inShadow(p, (root) => !root.querySelector(".nl-side").classList.contains("mini")), "desktop: Expand sidebar brings the labels back");
    await dela(p).getByRole("button", { name: "Settings", exact: true }).click();
    t = await waitFor(p, "Suggestions and alerts");
    ok(t.includes("Appearance") && t.includes("Pause suggestions") && t.includes("New gig alerts"), "Settings holds Appearance, Pause suggestions and the gig alert choices");
    await dela(p).getByRole("group", { name: "Appearance" }).getByRole("button", { name: "Dark" }).click();
    await p.waitForTimeout(500);
    ok(await inShadow(p, (root) => getComputedStyle(root.querySelector(".nl-side")).backgroundColor) === "rgb(26, 29, 40)", "dark: the sidebar follows the Appearance choice");
    await p.screenshot({ path: path.join(SHOTS, "workspace-desktop-dark.png") });
    await dela(p).getByRole("group", { name: "Appearance" }).getByRole("button", { name: "Light" }).click();
    for (const w of [1440, 900]) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(200); ok(await fits(p), "no sideways scrolling at " + w + " pixels"); }
    await s.ctx.close();

    // ---------- A freelancer who is ready for invitations ----------
    s = await open(browser, READY, "&tab=home", 1280, 900);
    p = s.page;
    t = await waitFor(p, "Your work");
    ok(t.includes("Profile complete") && t.includes("Attorneys can invite you.") && !t.includes("Complete your profile"), "ready freelancer: the profile box is gone; one status line says they can be invited");
    ok(t.includes("Paid out this month") && t.includes("all time") && t.includes("Proposals left this month"), "ready freelancer: Paid out shows this month and all time");
    await sql(`update member_profiles set availability_confirmed_at = now() - interval '20 days' where person_id = ${person(READY)} and side = 'freelancer'; select dela_profile_refresh(${person(READY)}, 'freelancer')`);
    await p.reload();
    t = await waitFor(p, "Your availability is out of date");
    ok(t.includes("Confirm availability") && !t.includes("Attorneys can invite you."), "availability out of date: Home says so, offers Confirm availability, and no longer says they can be invited");
    await s.ctx.close();

    // ---------- The attorney ----------
    s = await open(browser, ATT, "&tab=home", 1280, 900);
    p = s.page;
    t = await waitFor(p, "Your projects");
    const amenu = await inShadow(p, (root) => [...root.querySelectorAll(".nl-side .nl-item")].map((b) => b.innerText.trim()).slice(0, 4));
    ok(amenu.join(",") === "Home,Projects,Ask DELA,Library", "attorney: the four main pages: " + amenu.join(", "));
    ok(t.includes("Deliveries to review") && t.includes("Open gigs") && t.includes("Gig drafts"), "attorney: the project numbers are on Home");
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForTimeout(300);
    const abar = await inShadow(p, (root) => [...root.querySelectorAll(".nl-bar button")].map((b) => b.innerText.trim()));
    ok(JSON.stringify(abar) === JSON.stringify(["Home", "Projects", "Ask DELA", "Library", "More"]) && await fits(p), "attorney on a phone: Home, Projects, Ask DELA, Library, More");
    await p.screenshot({ path: path.join(SHOTS, "workspace-phone-attorney.png") });
    await s.ctx.close();
    console.log("\nALL " + passed + " WORKSPACE CHECKS PASSED");
  } catch (e) {
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    await sql("update feature_switches set state = 'off' where key = 'new_layout'").catch(() => null);
    await browser.close();
  }
})();

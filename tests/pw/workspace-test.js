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
  let s, p, t, restore = null;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('onboarding_widget', 'gig_alerts', 'flex_gigs', 'engagements', 'profiles', 'talent_search', 'playbook_library', 'ai_generation', 'gig_chat', 'appearance_choice')");
    await sql("update feature_switches set state = 'off' where key = 'new_layout'");
    // The LinkedIn check is part of what this suite shows; an earlier suite may have turned the requirement off
    const liBefore = (await sql("select value::text v from settings where key = 'verify.freelancer_linkedin'"))[0].v;
    await sql("update settings set value = 'true'::jsonb where key = 'verify.freelancer_linkedin'");
    restore = () => sql("update settings set value = '" + liBefore + "'::jsonb where key = 'verify.freelancer_linkedin'");
    await makeMember(NEW, "freelancer", "fl_free", "Nia Newcomer");
    await makeMember(ATT, "attorney", "att_pro", "Ada Attorney");
    await makeMember(READY, "freelancer", "fl_plus", "Rae Ready");
    await sql(`insert into member_profiles (person_id, side, body, missing, score) values (${person(NEW)}, 'freelancer', '{"first_name":"Nia","last_name":"Newcomer"}', '{headline,summary,practice_areas,services,experience}', 58)
      on conflict (person_id, side) do update set missing = '{headline,summary,practice_areas,services,experience}', score = 58; select dela_profile_refresh(${person(NEW)}, 'freelancer')`);
    await sql(`insert into member_profiles (person_id, side, body, missing, score, availability, availability_confirmed_at) values (${person(READY)}, 'freelancer', '{"first_name":"Rae","last_name":"Ready"}', '{}', 100, 'available', now())
      on conflict (person_id, side) do update set missing = '{}', score = 100, availability = 'available', availability_confirmed_at = now();
      insert into linkedin_checks (person_id, url, status) select ${person(READY)}, 'https://www.linkedin.com/in/rae-ready', 'verified' where not exists (select 1 from linkedin_checks where person_id = ${person(READY)});
      select dela_profile_refresh(${person(READY)}, 'freelancer')`);

    // ---------- With the switch off DELA looks as before ----------
    s = await open(browser, NEW, "&tab=home", 1280, 900);
    ok(await inShadow(s.page, (root) => !!root.querySelector("nav.nav") && !root.querySelector(".nl-frame") && !root.querySelector(".dela").classList.contains("nl")), "switch off: the old tab row, no sidebar");
    await s.ctx.close();
    await sql(`insert into people (bd_member_id, display_name, email) values (5104, 'Tess Team', 'tess@test.invalid') on conflict (bd_member_id) do nothing;
      insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = 5104 and not exists (select 1 from staff_roles s where s.person_id = people.id); select 1`);
    {
      const c0 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const a0 = await c0.newPage();
      await a0.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); const f = u.pathname.split("@")[1].split("/").slice(1).join("/"); route.fulfill({ path: path.join(ROOT, f) }); });
      await a0.route("https://fonts.googleapis.com/**", (r) => r.abort());
      await a0.goto(`${BASE}/page/DELA-Admin?uid=5104&plan=`);
      await a0.locator(".dela-host").getByRole("tab", { name: "Payments" }).waitFor({ timeout: 15000 });
      ok(await a0.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; return r.querySelectorAll("[role=tab]").length === 25 && !r.querySelector(".nl-frame"); }), "switch off: the admin area keeps its row of 25 tabs");
      await a0.locator(".dela-host").getByRole("tab", { name: "Payments" }).click();
      await a0.waitForFunction(() => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText.includes("Needs attention ("));
      ok(await a0.evaluate(() => { const t = document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText; return t.indexOf("Needs attention (") < t.indexOf("Money on DELA"); }), "switch off: Needs attention is on the Payments tab in the old layout too");
      await c0.close();
    }
    await sql("update feature_switches set state = 'everyone' where key = 'new_layout'");

    // ---------- A new freelancer on a phone (390 x 844) ----------
    s = await open(browser, NEW, "&tab=home", 390, 844);
    p = s.page;
    t = await waitFor(p, "Complete your profile");
    ok(t.includes("7 of 12 details complete") && t.includes("Also needed before new invitations") && t.includes("Verification: LinkedIn check") && t.includes("Continue setup") && !t.includes("What DELA will do for you"), "phone: the profile box counts the details and keeps verification and availability apart");
    ok(t.includes("Not submitted") && t.includes("Submit LinkedIn profile"), "phone: the LinkedIn check shows its real state and the one action there is");
    ok(!t.includes("Pause suggestions") && !t.includes("Finish my profile") && !t.includes("not started yet"), "phone: Ask DELA on Home has no setup advice, no second profile button and no Pause link");
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
    await dela(p).getByRole("button", { name: "View all 5 remaining details" }).click();
    ok(await shown() === 5, "phone: View all 5 remaining details shows all five");
    // More: opens over the page, names the workspace, closes with Escape, focus returns
    const more = dela(p).getByRole("button", { name: "More", exact: true });
    await more.click();
    t = await waitFor(p, "Freelancer workspace");
    ok(t.includes("Settings") && t.includes("Help") && t.includes("Sign out") && t.includes("Complete your profile"), "phone: More lists the other pages and the page behind is still there");
    ok(await more.getAttribute("aria-expanded") === "true" && await dela(p).getByRole("button", { name: "Close menu" }).count() === 1, "phone: More shows as open and has a close button");
    // The sheet is a modal: the page behind cannot scroll or be used, More is the one marked item, the place is kept
    const modal = await inShadow(p, (root) => ({ lock: document.documentElement.style.overflow, inert: root.querySelector(".nl-main").hasAttribute("inert"),
      homeColor: getComputedStyle(root.querySelector(".nl-bar button[aria-current=page]")).color, moreColor: getComputedStyle(root.querySelector(".nl-bar button[aria-expanded=true]")).color,
      focus: root.activeElement && root.activeElement.innerText.trim(), sheetBottom: root.querySelector(".nl-sheet").getBoundingClientRect().bottom, barTop: root.querySelector(".nl-bar").getBoundingClientRect().top }));
    ok(modal.lock === "hidden" && modal.inert, "phone: with More open the page behind cannot scroll and cannot be used");
    ok(modal.homeColor !== modal.moreColor, "phone: with More open, More is the one marked item (Home goes quiet)");
    ok(modal.focus === "Freelancer workspace" && Math.abs(modal.sheetBottom - modal.barTop) <= 1, "phone: focus is on the sheet's heading and the sheet sits on the bar");
    await p.keyboard.press("Escape");
    ok(await inShadow(p, (root) => !root.querySelector(".nl-sheet") && root.activeElement && root.activeElement.innerText.trim() === "More"), "phone: Escape closes More and focus returns to it");
    ok(await inShadow(p, (root) => document.documentElement.style.overflow !== "hidden" && !root.querySelector(".nl-main").hasAttribute("inert")), "phone: after closing, the page scrolls and works again");
    await more.click();
    await dela(p).getByRole("button", { name: "Help", exact: true }).click();
    t = await waitFor(p, "Contact the Lawfecta Team");
    ok(p.url().includes("tab=help") && await inShadow(p, (root) => !root.querySelector(".nl-sheet")), "phone: Help opens from More and the address follows the page");
    // A requirement row opens its part of the profile
    await dela(p).getByRole("button", { name: "Home", exact: true }).click();
    await waitFor(p, "Complete your profile");
    await dela(p).getByRole("button", { name: "Submit LinkedIn profile" }).click();
    await waitFor(p, "Your profile");
    ok(p.url().includes("tab=profile"), "phone: a requirement opens the Profile page");
    await p.waitForTimeout(400);
    ok(await inShadow(p, (root) => getComputedStyle(root.querySelector(".nl-bar")).display !== "none"), "phone: opening a profile section does not hide the bar (no keyboard came up)");
    // Typing: the bottom bar steps aside
    await dela(p).getByRole("button", { name: "Home", exact: true }).click();
    await waitFor(p, "free answer");
    await dela(p).getByLabel("Ask DELA a question").click();
    ok(await inShadow(p, (root) => root.querySelector(".dela").classList.contains("kb") && getComputedStyle(root.querySelector(".nl-bar")).display === "none"), "phone: while typing to Ask DELA the bottom bar is hidden");
    await dela(p).getByLabel("Ask DELA a question").blur();
    await p.waitForTimeout(200);
    ok(await inShadow(p, (root) => getComputedStyle(root.querySelector(".nl-bar")).display !== "none"), "phone: the bar comes back after typing");
    // Nothing ends up under the bar
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(200);
    ok(await inShadow(p, (root) => { const last = [...root.querySelectorAll(".nl-main .wrap > *")].pop().getBoundingClientRect(); return last.bottom <= root.querySelector(".nl-bar").getBoundingClientRect().top + 1; }), "phone: the last thing on the page is above the bottom bar");
    for (const w of [320, 375, 414, 768]) { await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200); ok(await fits(p), "no sideways scrolling at " + w + " pixels"); }
    // Stacey 2026-11-12: the bar stays on the bottom edge of the window at every scroll position, on a long page, at
    // every phone width and in landscape; More keeps the place
    await dela(p).getByRole("button", { name: "More", exact: true }).click().catch(() => null);
    await p.keyboard.press("Escape");
    const barAt = () => inShadow(p, (root) => { const r = root.querySelector(".nl-bar").getBoundingClientRect(); return { bottom: Math.round(r.bottom), top: Math.round(r.top), vh: window.innerHeight, y: Math.round(window.scrollY), max: document.documentElement.scrollHeight - window.innerHeight }; });
    for (const size of [[320, 640], [375, 667], [390, 844], [414, 896], [844, 390]]) {
      await p.setViewportSize({ width: size[0], height: size[1] });
      await p.goto(`${BASE}/page/DELA-App?uid=${NEW}&plan=&tab=profile`);
      await waitFor(p, "Your profile");
      const seen = [];
      for (const part of [0, 0.5, 1]) {
        await p.evaluate((f) => window.scrollTo(0, Math.round((document.documentElement.scrollHeight - window.innerHeight) * f)), part);
        await p.waitForTimeout(150);
        seen.push(await barAt());
      }
      ok(seen[2].max > 300 && seen.every((b) => b.bottom === b.vh && b.top >= b.vh - 80), "the bar is on the bottom edge at the top, middle and end of a long page at " + size.join(" x ") + ": " + JSON.stringify(seen.map((b) => [b.y, b.bottom])));
      ok(await inShadow(p, (root) => { const last = [...root.querySelectorAll(".nl-main .wrap > *")].pop().getBoundingClientRect(); return last.bottom <= root.querySelector(".nl-bar").getBoundingClientRect().top + 1; }), "the end of the page is above the bar at " + size.join(" x "));
    }
    await p.setViewportSize({ width: 390, height: 844 });
    await p.evaluate(() => window.scrollTo(0, 500));
    await p.waitForTimeout(150);
    await dela(p).getByRole("button", { name: "More", exact: true }).click();
    await waitFor(p, "Freelancer workspace");
    await dela(p).getByRole("button", { name: "Close menu" }).click();
    ok(await p.evaluate(() => Math.round(window.scrollY)) === 500, "More opens and closes without losing the place on the page");
    await p.screenshot({ path: path.join(SHOTS, "workspace-phone-halfway.png") });
    // The site's own "back to top" square is hidden on a phone (it sat on More)
    ok(await p.evaluate(() => { const d = document.createElement("a"); d.className = "scrollup"; d.style.display = "block"; document.body.appendChild(d); const v = getComputedStyle(d).display; d.remove(); return v; }) === "none", "phone: the website's back to top square is hidden, so nothing sits on More");
    // Stacey 2026-11-12, on her phone: the bar was missing when the page first loaded and showed only after scrolling
    // to the end and back. A page that starts trapping the bar after DELA has drawn, with no scrolling at all, still
    // gets its bar back on the bottom edge.
    {
      const s2 = await open(browser, NEW, "&tab=profile", 390, 844);
      await waitFor(s2.page, "Your profile");
      await s2.page.waitForTimeout(1000);
      await s2.page.evaluate(() => { document.querySelector("#dela-app").style.transform = "translateZ(0)"; });
      await s2.page.waitForTimeout(2000);
      const late = await s2.page.evaluate(() => { const d = document.querySelector(".dela-dock"); if (!d) return null; const r = d.shadowRoot.querySelector(".nl-bar").getBoundingClientRect(); return { bottom: Math.round(r.bottom), vh: window.innerHeight, y: Math.round(window.scrollY) }; });
      ok(late && late.bottom === late.vh && late.y === 0, "a bar trapped after the page loaded is back on the bottom edge without any scrolling: " + JSON.stringify(late));
      await s2.ctx.close();
    }
    // A host page that traps "fixed" (a moved box around DELA): the bar is found off the edge and moves to DELA's own
    // holder on the page body, where it is on the bottom edge again, and More still works there
    await p.evaluate(() => { document.querySelector("#dela-app").style.transform = "translateZ(0)"; window.scrollTo(0, 0); });
    await p.evaluate(() => window.scrollTo(0, 300));
    await p.waitForTimeout(400);
    const docked = await p.evaluate(() => { const d = document.querySelector(".dela-dock"); if (!d) return null; const r = d.shadowRoot.querySelector(".nl-bar").getBoundingClientRect(); return { bottom: Math.round(r.bottom), vh: window.innerHeight, inPage: !!document.querySelector("#dela-app .dela-host").shadowRoot.querySelector(".nl-bar") }; });
    ok(docked && docked.bottom === docked.vh && !docked.inPage, "a trapped bar moves to its own holder and is on the bottom edge again: " + JSON.stringify(docked));
    await p.locator(".dela-dock").getByRole("button", { name: "More", exact: true }).click();
    ok(await p.locator(".dela-dock").getByRole("dialog", { name: "More" }).isVisible(), "trapped: More opens from the holder");
    await p.keyboard.press("Escape");
    ok(await p.locator(".dela-dock").getByRole("dialog", { name: "More" }).count() === 0, "trapped: Escape closes it");
    await p.locator(".dela-dock").getByRole("button", { name: "Earnings", exact: true }).click();
    await waitFor(p, "Earnings");
    ok(p.url().includes("tab=earnings") && await p.evaluate(() => document.querySelector(".dela-dock").shadowRoot.querySelectorAll(".nl-bar").length) === 1, "trapped: the bar still changes pages, and there is one bar");
    await s.ctx.close();

    // ---------- Account and security ----------
    s = await open(browser, NEW, "&tab=home", 390, 844);
    p = s.page;
    await waitFor(p, "Complete your profile");
    await dela(p).getByRole("button", { name: "Account menu" }).click();
    await dela(p).getByRole("menuitem", { name: "Account and security" }).click();
    t = await waitFor(p, "Sign-in email");
    ok(t.includes(NEW + "@test.invalid") && t.includes("DELA never sees or stores your password"), "account: the sign-in email shows, and the card says DELA holds no password");
    const links = await inShadow(p, (root) => [...root.querySelectorAll("#set-account a")].map((a) => a.innerText.trim() + " > " + a.getAttribute("href") + " > " + a.target));
    ok(links.join(" | ") === "Reset password by email > /login/retrieval > _blank | Google account security > https://myaccount.google.com/security > _blank" && t.includes("ask the Lawfecta Team"), "account: no link into the website's member dashboard; the password is reset by email and an email change goes through the team: " + links.join(" | "));
    ok(await inShadow(p, (root) => !root.querySelector("#set-account input")) && await fits(p), "account: no password or email box in DELA (the website holds them), and no sideways scrolling");
    await p.screenshot({ path: path.join(SHOTS, "workspace-account-phone.png") });
    await sql("update settings set value = '\"javascript:alert(1)\"'::jsonb where key = 'account.change_password_path'");
    await p.reload();
    await waitFor(p, "Sign-in email");
    ok(await inShadow(p, (root) => ![...root.querySelectorAll("#set-account a")].some((a) => a.innerText.trim() === "Change password")), "account: a page address that is not a path on this site is left out");
    await sql("update settings set value = '\"/account/password\"'::jsonb where key = 'account.change_password_path'");
    await p.reload();
    await waitFor(p, "Sign-in email");
    ok(await inShadow(p, (root) => [...root.querySelectorAll("#set-account a")].map((a) => a.innerText.trim()).join("|").startsWith("Change password|Forgot password")), "account: when the owner sets a password page, the card links to it again");
    await sql("update settings set value = '\"\"'::jsonb where key = 'account.change_password_path'");
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
    ok(t.indexOf("Account and security") >= 0 && t.indexOf("Account and security") < t.indexOf("Appearance"), "Settings starts with Account and security");
    // Emails: always on Settings (the gig chat switch is turned off here to prove it), the choice is kept, a failed save goes back
    await sql("update feature_switches set state = 'off' where key = 'gig_chat'");
    await p.reload();
    t = await waitFor(p, "Reminder and alert emails are on.");
    ok(t.indexOf("Suggestions and alerts") < t.indexOf("Emails\n") && !t.includes("Show \"Seen\""), "Settings has the Emails card after Suggestions and alerts, also with messages switched off");
    const emailBox = dela(p).getByLabel("Email me reminders and alerts, such as new gig alerts and next-step reminders.");
    await emailBox.uncheck();
    t = await waitFor(p, "Reminder and alert emails are off since");
    ok(t.includes("Reminder and alert emails are off, so gig alerts are not emailed."), "Emails off: the gig alert choices say that alerts are not emailed");
    await p.reload();
    await waitFor(p, "Reminder and alert emails are off since");
    ok(!(await dela(p).getByLabel("Email me reminders and alerts, such as new gig alerts and next-step reminders.").isChecked()), "Emails off is kept after a reload");
    await p.route("**/api/prefs", (route) => route.request().method() === "POST" ? route.abort() : route.continue());
    await dela(p).getByLabel("Email me reminders and alerts, such as new gig alerts and next-step reminders.").check().catch(() => null);
    await p.waitForTimeout(600);
    ok(!(await dela(p).getByLabel("Email me reminders and alerts, such as new gig alerts and next-step reminders.").isChecked()) && (await text(p)).includes("Reminder and alert emails are off since"), "a save that fails puts the box back");
    await p.unroute("**/api/prefs");
    await dela(p).getByLabel("Email me reminders and alerts, such as new gig alerts and next-step reminders.").check();
    t = await waitFor(p, "Reminder and alert emails are on.");
    ok(!t.includes("so gig alerts are not emailed"), "Emails on again: the note under the gig alert choices is gone");
    await sql("update feature_switches set state = 'everyone' where key = 'gig_chat'");
    await p.screenshot({ path: path.join(SHOTS, "workspace-account-desktop.png") });
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
    // A number opens the list it counts
    await dela(p).getByRole("button", { name: /Invitations/ }).first().click();
    await p.waitForFunction(() => { const r = document.querySelector(".dela-host").shadowRoot; return r.activeElement && r.activeElement.tagName === "H2" && r.activeElement.textContent.indexOf("Invitations") === 0; }, null, { timeout: 8000 });
    ok(p.url().includes("tab=work"), "ready freelancer: the Invitations number opens Work at the Invitations list");
    await dela(p).getByRole("button", { name: "Home", exact: true }).click();
    await waitFor(p, "Your work");
    await sql(`update member_profiles set availability_confirmed_at = now() - interval '20 days' where person_id = ${person(READY)} and side = 'freelancer'; select dela_profile_refresh(${person(READY)}, 'freelancer')`);
    await p.reload();
    t = await waitFor(p, "Your availability is out of date");
    ok(t.includes("Confirm availability") && !t.includes("Attorneys can invite you."), "availability out of date: Home says so, offers Confirm availability, and no longer says they can be invited");
    await s.ctx.close();

    // ---------- Work in hand and a profile never saved: commitments first, and the twelve details are named ----------
    await makeMember(5103, "freelancer", "fl_free", "Wes Working");
    s = await open(browser, 5103, "&tab=home", 1280, 900);
    p = s.page;
    t = await waitFor(p, "Complete your profile");
    ok(t.includes("0 of 12 details complete") && t.includes("View all 12 remaining details") && t.includes("First name"), "never-saved profile: 0 of 12, with the twelve details listed");
    ok(t.indexOf("Complete your profile") < t.indexOf("Work opportunities"), "no work in hand: the profile card leads");
    await s.ctx.close();
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    p = await ctx2.newPage();
    await p.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); const f = u.pathname.split("@")[1].split("/").slice(1).join("/"); route.fulfill({ path: path.join(ROOT, f) }); });
    await p.route("https://fonts.googleapis.com/**", (r) => r.abort());
    // The same member with an agreement to sign and a milestone due sooner (the server's own shapes, added to its answer)
    await p.route("**/api/**", async (route) => {
      const res = await route.fetch();
      let j; try { j = await res.json(); } catch (e) { return route.fulfill({ response: res }); }
      if (j && j.me && j.me.home) {
        j.me.home.active_projects = 2;
        j.me.home.attention = [{ kind: "sign", gig_id: "00000000-0000-0000-0000-000000000001", gig_title: "Prepared job", sign_by: "2026-12-20T00:00:00Z" },
          { kind: "milestone", gig_id: "00000000-0000-0000-0000-000000000002", gig_title: "Sooner job", seq: 1, title: "Draft", due_date: "2026-12-01", amount_cents: 15000, status: "funded" }];
        j.me.home.projects = [{ gig_id: "00000000-0000-0000-0000-000000000001", gig_title: "Prepared job", status: "signing", other_name: "Example Legal" }];
      }
      return route.fulfill({ response: res, json: j });
    });
    await p.goto(`${BASE}/page/DELA-App?uid=5103&plan=&tab=home`);
    t = await waitFor(p, "Needs your attention");
    ok(t.indexOf("Needs your attention") < t.indexOf("Your work") && t.indexOf("Your work") < t.indexOf("Complete your profile"), "work in hand: Needs your attention, then Your work, then the profile card");
    ok(t.indexOf("Milestone 1: Draft") < t.indexOf("Agreement to sign") && t.includes("Review and sign") && t.includes("View milestone"), "attention is ranked by the nearest deadline, with specific actions");
    // A page address DELA does not know lands on the new Home, never on the old one (found in the prompt check, 2026-11-13)
    await p.goto(`${BASE}/page/DELA-App?uid=5103&plan=&tab=nosuchpage`);
    t = await waitFor(p, "Needs your attention");
    ok(await p.evaluate(() => document.querySelector(".dela-host").shadowRoot.querySelectorAll(".hero").length) === 0 && t.includes("Your work"), "an unknown page address shows the new Home, not the old one");
    ok(t.includes("Work you already have is not affected.") && !t.includes("Invitations start when"), "work in hand with an incomplete profile: no contradicting message");
    await p.screenshot({ path: path.join(SHOTS, "workspace-desktop-work-first.png") });
    await ctx2.close();

    // ---------- The Lawfecta Team: My account in the admin area ----------
    await sql(`insert into people (bd_member_id, display_name, email) values (5104, 'Tess Team', 'tess@test.invalid') on conflict (bd_member_id) do nothing;
      insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = 5104 and not exists (select 1 from staff_roles s where s.person_id = people.id); select 1`);
    {
      const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const ap = await ctx3.newPage();
      await ap.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); const f = u.pathname.split("@")[1].split("/").slice(1).join("/"); route.fulfill({ path: path.join(ROOT, f) }); });
      await ap.route("https://fonts.googleapis.com/**", (r) => r.abort());
      await ap.goto(`${BASE}/page/DELA-Admin?uid=5104&plan=`);
      const ah = ap.locator(".dela-host");
      const atext = () => ap.evaluate(() => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText);
      const ain = (fn) => ap.evaluate((f) => (new Function("root", "return (" + f + ")(root)"))(document.querySelector(".dela-host").shadowRoot), fn.toString());
      await ah.getByRole("button", { name: "Release Control" }).waitFor({ timeout: 15000 });
      // The sidebar: two pages on top, five groups that open and close, the current page marked
      const groups = await ain((root) => [...root.querySelectorAll(".nl-side .nl-group")].map((b) => b.innerText.trim().toUpperCase() + ":" + b.getAttribute("aria-expanded")));
      ok(groups.join(",") === "MEMBERS:false,PLANS AND SETTINGS:false,MARKETPLACE:false,PAYMENTS:false,SAFETY:false", "admin: the sidebar has the five groups, closed at first: " + groups.join(","));
      ok(await ain((root) => root.querySelector(".nl-side [aria-current=page]").innerText.trim()) === "Release Control" && await ain((root) => !root.querySelector("[role=tab]")), "admin: Release Control is the current page and the old tab row is gone");
      await ah.getByRole("button", { name: "Payments", exact: true }).click();
      await ah.getByRole("button", { name: "Safety", exact: true }).click();
      ok(await ain((root) => [...root.querySelectorAll(".nl-side .nl-group[aria-expanded=true]")].length) === 2, "admin: more than one group can be open");
      await ah.locator(".nl-side .nl-items:not([hidden])").getByRole("button", { name: "Payments", exact: true }).click();
      await ap.waitForFunction(() => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText.includes("Payment overview"));
      let pt = await atext();
      ok(ap.url().includes("tab=pay") && pt.includes("All time") && pt.includes("Current balance") && pt.includes("Engagements: on for everyone") && !pt.includes("milestone_funding"), "admin: Payments is Payment overview, with All time, Current balance and plain words for the switches");
      ok(pt.includes("Needs attention (") && pt.indexOf("Needs attention (") < pt.indexOf("Payment overview"), "admin: Needs attention is the first card on Payments");
      // Needs attention, with the server's answers set for the test: nothing waiting, then one of each kind
      let waiting = null;
      await ap.route("**/api/admin/**", async (route) => {
        const res = await route.fetch();
        if (!waiting) return route.fulfill({ response: res });
        let j; try { j = await res.json(); } catch (e) { return route.fulfill({ response: res }); }
        const u = route.request().url();
        if (u.includes("/admin/payments") && j.data) Object.assign(j.data, waiting.pay, { totals: Object.assign({}, j.data.totals, waiting.totals || {}) });
        if (u.includes("/admin/disputes") && j.data) Object.assign(j.data, waiting.disp);
        return route.fulfill({ response: res, json: j });
      });
      const none = { payouts_held: [], disputes: [], chargebacks: [], human_reviews: [], overdue_reviews: [], stripe_account: { payout_interval: "manual", available_cents: 50000 } };
      waiting = { pay: none, totals: { held_now: 0 }, disp: { payouts_waiting: [], refunds_failed: [], paused: [] } };
      await ap.reload();
      await ap.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela") && h.shadowRoot.querySelector(".dela").innerText.includes("Needs attention (0)"); });
      ok((await atext()).includes("Nothing needs you right now."), "admin: with nothing waiting, Needs attention says so");
      waiting = { pay: Object.assign({}, none, { stripe_account: { payout_interval: "daily", available_cents: -10987 }, disputes: [{ id: "d1", gig_title: "Sample dispute job", status: "team_review", milestone: "Draft", milestone_amount_cents: 15000 }, { id: "d2", gig_title: "Still talking", status: "notice" }],
        human_reviews: [{ id: "h1", gig_title: "A", milestone: "One", seq: 1, score: 50, findings: [], statement: "", created_at: "2026-11-12T00:00:00Z" }] }), totals: { held_now: 45000 },
        disp: { payouts_waiting: [{ id: "p1", status: "failed", amount_cents: 4750, freelancer: "DELA Test Freelancer", gig_title: "Fee test: Run a Conflict Check", reason: "You have insufficient available funds in your Stripe account." }], refunds_failed: [{ id: "r1", amount_cents: 10000, gig_title: "Sample refund job", retries: 3 }], paused: [] } };
      await ap.reload();
      await ap.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela") && h.shadowRoot.querySelector(".dela").innerText.includes("Needs attention (6)"); });
      const arows = await ain((root) => [...root.querySelectorAll("#pay-attention .hrow")].map((b) => b.querySelector("b").innerText.trim() + " > " + b.querySelector(".act").innerText.trim()));
      ok(arows.join(" | ") === ["Stripe pays Lawfecta's balance to the bank by itself > See the notice", "Stripe holds less than DELA owes > See the notice", "Payout failed: $47.50 to DELA Test Freelancer, Fee test: Run a Conflict Check > View held payout",
        "Refund failed: $100, Sample refund job > View failed refund", "Dispute waiting for the Lawfecta Team: Sample dispute job > Review dispute", "1 milestone waiting for a human review > Review milestones"].join(" | "), "admin: Needs attention lists what waits, most urgent first, each with its action: " + arows.join(" | "));
      ok((await atext()).includes("Stripe said: You have insufficient available funds in your Stripe account."), "admin: a failed payout shows Stripe's reason");
      await ap.screenshot({ path: path.join(SHOTS, "workspace-admin-attention.png") });
      await ah.getByRole("button", { name: /Payout failed/ }).click();
      await ap.waitForFunction(() => { const r = document.querySelector(".dela-host").shadowRoot; return r.activeElement && r.activeElement.tagName === "H2" && r.activeElement.textContent.indexOf("Money tools") === 0; }, null, { timeout: 8000 });
      ok(ap.url().includes("tab=disputes") && (await atext()).includes("Payout failed: $47.50 to DELA Test Freelancer"), "admin: View held payout opens Disputes at Money tools, where Retry is");
      waiting = null;
      await ap.unroute("**/api/admin/**");
      await ah.locator(".nl-side .nl-items:not([hidden])").getByRole("button", { name: "Payments", exact: true }).click();
      await ap.waitForFunction(() => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText.includes("Payment overview"));
      await ap.reload();
      await ap.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela") && h.shadowRoot.querySelector(".dela").innerText.includes("Payment overview"); });
      ok(await ain((root) => root.querySelector(".nl-side [aria-current=page]").innerText.trim()) === "Payments" && await ain((root) => [...root.querySelectorAll(".nl-side .nl-group[aria-expanded=true]")].map((b) => b.innerText.trim().toUpperCase()).join(",")) === "PAYMENTS,SAFETY", "admin: after a reload the page, and the open groups, are as they were");
      ok(await ap.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "admin: no sideways scrolling at 1280");
      await ap.screenshot({ path: path.join(SHOTS, "workspace-admin-desktop.png") });
      // One account button: My account, Appearance, Member view, Sign out; Escape closes it and focus returns
      await ah.locator(".acctbtn").click();
      const items = await ain((root) => [...root.querySelectorAll(".menu [role^=menuitem]")].map((b) => b.innerText.replace("\u2713", "").trim()));
      ok(items.join(",") === "My account,Match my device,Light,Dark,Member view,Sign out", "admin: the account button holds My account, Appearance, Member view and Sign out: " + items.join(","));
      await ap.keyboard.press("Escape");
      ok(await ain((root) => !root.querySelector(".menu") && root.activeElement.classList.contains("acctbtn")), "admin: Escape closes the account menu and focus returns to its button");
      // A phone: the Menu button opens the same list
      await ap.setViewportSize({ width: 390, height: 844 });
      await ap.waitForTimeout(300);
      ok(await ap.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1) && await ain((root) => getComputedStyle(root.querySelector(".aside-slot")).display === "none"), "admin on a phone: no sideways scrolling, the sidebar is put away");
      await ah.getByRole("button", { name: "Menu", exact: true }).click();
      ok(await ah.getByRole("dialog", { name: "Admin pages" }).isVisible() && await ain((root) => root.activeElement.innerText.trim() === "Admin pages" && document.documentElement.style.overflow === "hidden"), "admin on a phone: Menu opens the page list, focus moves in, the page behind is locked");
      await ap.screenshot({ path: path.join(SHOTS, "workspace-admin-phone-menu.png") });
      await ah.getByRole("dialog", { name: "Admin pages" }).getByRole("button", { name: "Disputes", exact: true }).click();
      await ap.waitForFunction(() => new URL(location.href).searchParams.get("tab") === "disputes");
      ok(await ain((root) => !root.querySelector(".nl-sheet") && document.documentElement.style.overflow !== "hidden"), "admin on a phone: choosing a page closes the list and opens the page");
      for (const w of [320, 1440]) { await ap.setViewportSize({ width: w, height: 844 }); await ap.waitForTimeout(200); ok(await ap.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "admin: no sideways scrolling at " + w + " pixels"); }
      await ap.setViewportSize({ width: 1280, height: 900 });
      await ah.locator(".acctbtn").click();
      await ah.getByRole("menuitem", { name: "My account" }).click();
      await ap.waitForFunction(() => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText.includes("Sign-in email"));
      const at = await ap.evaluate(() => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText);
      const aval = await ap.evaluate(() => document.querySelector(".dela-host").shadowRoot.querySelector("#set-account .acct-val").innerText);
      ok(aval.includes("@") && at.includes("Reset password by email") && at.includes("It changes nothing for other members."), "admin: My account shows the team member's own sign-in email and where to change it: " + aval);
      await ap.screenshot({ path: path.join(SHOTS, "workspace-admin-account.png") });
      await ctx3.close();
    }

    // ---------- The attorney ----------
    s = await open(browser, ATT, "&tab=home", 1280, 900);
    p = s.page;
    t = await waitFor(p, "Your projects");
    const amenu = await inShadow(p, (root) => [...root.querySelectorAll(".nl-side .nl-item")].map((b) => b.innerText.trim()).slice(0, 4));
    ok(amenu.join(",") === "Home,Projects,Ask DELA,Library", "attorney: the four main pages: " + amenu.join(", "));
    ok(t.includes("Deliveries to review") && t.includes("Open gigs") && t.includes("Gig drafts"), "attorney: the project numbers are on Home");
    // DELA's next step for the attorney shows in the Ask DELA card with its button (it does not repeat a profile card)
    t = await waitFor(p, "Tell DELA about my firm");
    ok(t.includes("tell DELA about your firm") && !t.includes("Pause suggestions"), "attorney: DELA's next step (tell DELA about your firm) is in the Ask DELA card");
    await dela(p).getByRole("button", { name: "Tell DELA about my firm" }).click();
    await p.waitForFunction(() => new URL(location.href).searchParams.get("tab") === "library", null, { timeout: 8000 });
    ok(true, "attorney: the suggestion's button opens the Library to start");
    await dela(p).getByRole("button", { name: "Home", exact: true }).click();
    await waitFor(p, "Your projects");
    await dela(p).getByRole("button", { name: /Open gigs/ }).first().click();
    await p.waitForFunction(() => { const r = document.querySelector(".dela-host").shadowRoot; return r.activeElement && r.activeElement.tagName === "H2" && r.activeElement.textContent.indexOf("Your gigs") === 0; }, null, { timeout: 8000 });
    ok(p.url().includes("tab=projects"), "attorney: the Open gigs number opens Projects at Your gigs");
    await dela(p).getByRole("button", { name: "Home", exact: true }).click();
    await waitFor(p, "Your projects");
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
    if (restore) await restore().catch(() => null);
    await browser.close();
  }
})();

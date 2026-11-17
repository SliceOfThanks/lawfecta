// Step 33: the Home each member arranges (docs/briefs/step-33-home-dashboard.md). An attorney: the default widgets in
// two columns, the Customize panel (add, the switch that removes, "Move up" by keyboard, dragging the handle, Cancel,
// leaving with Escape, Save, Reset to default), the layout after a reload, a widget that cannot load, and the widths
// 768 and 320. A freelancer: their own widget list and layout, and the profile card that stays while the profile is
// not complete. Removing a widget never changes the bell. Runs with the new layout on and puts the switches back.
//   node tests/pw/home-test.js   (with tests/pw/server.ts running)
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = "http://127.0.0.1:8787";
const ROOT = path.join(__dirname, "..", "..");
const SHOTS = process.env.SHOTS || path.join(__dirname, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
let passed = 0;
function ok(cond, msg) { if (!cond) throw new Error("FAILED: " + msg); passed++; console.log("ok", msg); }
async function sql(q) { const r = await fetch(BASE + "/test/sql", { method: "POST", body: JSON.stringify({ sql: q }) }); const j = await r.json(); if (j.error) throw new Error("sql: " + j.error); return j.rows; }
async function open(browser, uid, query, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w || 1280, height: h || 900 } });
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
async function waitGone(page, words, ms) {
  const end = Date.now() + (ms || 8000);
  let t = "";
  while (Date.now() < end) { t = await text(page); if (!t.includes(words)) return t; await page.waitForTimeout(200); }
  throw new Error("FAILED: still see \"" + words + "\"");
}
const inShadow = (page, fn, arg) => page.evaluate(([f, a]) => (new Function("root", "arg", "return (" + f + ")(root, arg)"))(document.querySelector(".dela-host").shadowRoot, a), [fn.toString(), arg]);
const fits = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const onHome = (page) => inShadow(page, (root) => [...root.querySelectorAll("#home-grid [data-widget]")].map((x) => x.getAttribute("data-widget")));
const inPanel = (page) => inShadow(page, (root) => [...root.querySelectorAll("#cz-mine li")].map((x) => x.getAttribute("data-id")));
const offered = (page) => inShadow(page, (root) => [...root.querySelectorAll("#cz-avail li")].map((x) => x.getAttribute("data-id")));
const grip = (page, id) => inShadow(page, (root, i) => { const r = root.querySelector('#cz-mine li[data-id="' + i + '"] .cz-grip').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, id);
const focusName = (page) => inShadow(page, (root) => root.activeElement ? (root.activeElement.getAttribute("aria-label") || root.activeElement.id || root.activeElement.textContent) : "");
const ATT = 5201, FL = 5202;
const person = (bd) => `(select id from people where bd_member_id = ${bd})`;
async function makeMember(bd, side, plan, name) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, '${name}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side(${person(bd)}, '${side}', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and channel = 'access' and revoked_at is null); select 1`);
}
const KEYS = "'onboarding_widget', 'flex_gigs', 'engagements', 'profiles', 'talent_search', 'playbook_library', 'ai_generation', 'gig_chat', 'meetings', 'bench', 'new_layout'";

(async () => {
  const browser = await chromium.launch();
  let s, p, t, before = null;
  try {
    before = (await sql(`select jsonb_object_agg(key, state) sw from feature_switches where key in (${KEYS})`))[0].sw;
    await sql(`update feature_switches set state = 'everyone' where key in (${KEYS})`);
    await makeMember(ATT, "attorney", "att_pro", "Hana Home");
    await makeMember(FL, "freelancer", "fl_plus", "Finn Home");
    await sql(`delete from home_layouts where person_id in (${person(ATT)}, ${person(FL)}); select 1`);
    await sql(`insert into notifications (person_id, channel, kind, title, body, dedupe_key) values (${person(ATT)}, 'in_app', 'system', 'Home check notice', 'Still unread.', 'home-pw-' || gen_random_uuid()); select 1`);

    // ---------- Attorney: the default Home ----------
    s = await open(browser, ATT, "&tab=home", 1280, 900);
    p = s.page;
    t = await waitFor(p, "Your Workspace");
    t = await waitFor(p, "Home check notice");
    ok(t.includes("Your work, your priorities.") && t.includes("Customize dashboard"), "attorney: the heading, the welcome line and the Customize button: " + t.slice(0, 300).replace(/\n/g, " | "));
    let home = await onHome(p);
    ok(JSON.stringify(home.filter((x) => x !== "account")) === JSON.stringify(["ask", "attention", "projects", "usage", "notifications"]) && home.includes("account"), "attorney: the six default widgets, in the default order: " + home.join(", "));
    ok(t.includes("Needs your attention") && t.includes("My projects") && t.includes("Urgent notifications") && t.includes("Home check notice"), "attorney: each widget shows its own content, with the unread notification");
    t = await waitFor(p, "DELA actions reset on");
    ok(t.includes("View usage details →") && t.includes("View all projects →") && t.includes("View all notifications →"), "attorney: each widget links to its full page");
    ok(await inShadow(p, (root) => getComputedStyle(root.querySelector("#home-grid")).gridTemplateColumns.split(" ").length === 2), "attorney at 1280: two columns");
    ok(await inShadow(p, (root) => root.querySelectorAll(".hero").length === 0), "the old banner is not on this Home");
    const bell = await inShadow(p, (root) => root.querySelector(".bell.icon").getAttribute("aria-label"));
    ok(/Notifications, \d+ unread/.test(bell), "the bell counts the unread notification: " + bell);
    await p.screenshot({ path: path.join(SHOTS, "home-default.png"), fullPage: true });

    // ---------- The Customize panel: add, move by keyboard, leave without saving ----------
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    t = await waitFor(p, "My dashboard (6)");
    ok(t.includes("Available widgets") && t.includes("Removing a widget only hides it on Home."), "the panel opens with the member's widgets, the others, and what removing means");
    const off = await offered(p);
    ok(JSON.stringify(off) === JSON.stringify(["meetings", "messages", "bench", "standing", "quick"]), "the five other widgets are offered: " + off.join(", "));
    ok(await dela(p).getByRole("button", { name: "Save changes" }).isDisabled(), "nothing changed yet: Save changes is off");
    ok(await inShadow(p, (root) => !!root.querySelector("#home-grid [data-widget=projects]")), "Home stays in view behind the panel");
    await dela(p).getByRole("button", { name: "Add Quick actions to Home" }).click();
    await waitFor(p, "My dashboard (7)");
    home = await onHome(p);
    ok(home[home.length - 1] === "quick" || home.includes("quick"), "the added widget shows on Home at once, as a preview");
    ok(!(await dela(p).getByRole("button", { name: "Save changes" }).isDisabled()), "a change turns Save changes on");
    // Keyboard only: open the row's menu, choose "Move up"
    await dela(p).getByLabel("More for Quick actions").first().focus();
    await p.keyboard.press("Enter");
    await dela(p).getByRole("button", { name: "Move up", exact: true }).focus();
    await p.keyboard.press("Enter");
    await p.waitForTimeout(200);
    let mine = await inPanel(p);
    ok(mine.indexOf("quick") === 5 && mine.length === 7, "keyboard: Move up moves the widget one place: " + mine.join(", "));
    ok((await focusName(p)) === "More for Quick actions", "keyboard: focus stays on the moved widget");
    await p.waitForTimeout(150);
    ok((await inShadow(p, (root) => root.querySelector(".cz-panel [role=status]").textContent)).includes("Quick actions, now 6 of 7."), "a screen reader hears the new place");
    await p.keyboard.press("Escape");
    await waitGone(p, "My dashboard (");
    home = await onHome(p);
    ok(!home.includes("quick") && (await focusName(p)) === "home-customize", "Escape leaves without saving (after asking): Home is as before and focus returns to the button");
    ok((await sql(`select count(*)::int n from home_layouts where person_id = ${person(ATT)}`))[0].n === 0, "nothing was saved");

    // ---------- Remove with the switch, add, drag, save ----------
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "My dashboard (6)");
    await dela(p).getByRole("switch", { name: "Show Urgent notifications on Home" }).click();
    await waitFor(p, "My dashboard (5)");
    ok((await offered(p)).includes("notifications") && !(await onHome(p)).includes("notifications"), "the switch takes the widget off Home and puts it under Available widgets");
    await dela(p).getByRole("button", { name: "Add Recent messages to Home" }).click();
    await waitFor(p, "My dashboard (6)");
    mine = await inPanel(p);
    const from = await grip(p, "messages"), to = await grip(p, mine[0]);
    await p.mouse.move(from.x, from.y);
    await p.mouse.down();
    await p.mouse.move(to.x, to.y - 2, { steps: 14 });
    await p.mouse.up();
    await p.waitForTimeout(250);
    mine = await inPanel(p);
    ok(mine[0] === "messages", "dragging the handle moves the widget to the top: " + mine.join(", "));
    await p.screenshot({ path: path.join(SHOTS, "home-customize.png") });
    await dela(p).getByRole("button", { name: "Save changes" }).click();
    await waitFor(p, "Your Home layout is saved.");
    await waitGone(p, "My dashboard (");
    const saved = (await sql(`select widgets from home_layouts where person_id = ${person(ATT)} and side = 'attorney'`))[0].widgets;
    ok(JSON.stringify(saved) === JSON.stringify(mine), "the saved layout is the panel's order: " + JSON.stringify(saved));
    await p.reload();
    await waitFor(p, "Recent messages");
    home = await onHome(p);
    ok(home.filter((x) => x !== "account")[0] === "messages" && !home.includes("notifications"), "after a reload Home keeps the member's order: " + home.join(", "));
    const bell2 = await inShadow(p, (root) => root.querySelector(".bell.icon").getAttribute("aria-label"));
    ok(bell2 === bell, "removing the notifications widget changes nothing on the bell: " + bell2);
    ok((await sql(`select count(*)::int n from audit_log where action = 'home_layout_saved' and object_id = ${person(ATT)}::text`))[0].n === 1, "one audit line for the save");

    // ---------- Cancel discards; Reset to default ----------
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "My dashboard (6)");
    await dela(p).getByRole("button", { name: "Add My bench to Home" }).click();
    await waitFor(p, "My dashboard (7)");
    await dela(p).getByRole("button", { name: "Cancel", exact: true }).click();
    await waitGone(p, "My dashboard (");
    ok(!(await onHome(p)).includes("bench"), "Cancel throws the changes away");
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "My dashboard (6)");
    await dela(p).getByRole("button", { name: "Reset to default" }).click();
    await p.waitForTimeout(200);
    mine = await inPanel(p);
    ok(JSON.stringify(mine) === JSON.stringify(["ask", "attention", "projects", "usage", "notifications", "account"]), "Reset to default shows the default order in the panel");
    await dela(p).getByRole("button", { name: "Save changes" }).click();
    await waitFor(p, "Home is back to the default layout.");
    ok((await sql(`select count(*)::int n from home_layouts where person_id = ${person(ATT)}`))[0].n === 0, "the default is kept as no saved layout");

    // ---------- A widget that cannot load says so; narrow screens ----------
    await p.route((u) => u.pathname.endsWith("/notifications"), (r) => r.abort());
    await p.reload();
    t = await waitFor(p, "This could not load just now.");
    ok(t.includes("Try again") && !t.includes("No unread notifications."), "a widget that cannot load says so, never that there is nothing");
    await p.unroute((u) => u.pathname.endsWith("/notifications")).catch(() => null);
    await p.setViewportSize({ width: 768, height: 1000 });
    await p.waitForTimeout(300);
    ok(await inShadow(p, (root) => getComputedStyle(root.querySelector("#home-grid")).gridTemplateColumns.split(" ").length === 1) && await fits(p), "768 wide: one column, no sideways scrolling");
    await p.setViewportSize({ width: 320, height: 700 });
    await p.waitForTimeout(300);
    ok(await fits(p), "320 wide: Home fits");
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "My dashboard (6)");
    ok(await fits(p) && await inShadow(p, (root) => root.querySelector(".cz-panel").getBoundingClientRect().width <= 320), "320 wide: the Customize panel fits the screen");
    await p.screenshot({ path: path.join(SHOTS, "home-customize-phone.png") });
    await dela(p).getByRole("button", { name: "Cancel", exact: true }).click();
    await s.ctx.close();

    // ---------- Freelancer: their own list and layout; the profile card stays while the profile is not complete ----------
    s = await open(browser, FL, "&tab=home", 1280, 900);
    p = s.page;
    t = await waitFor(p, "Your Workspace");
    t = await waitFor(p, "Complete your profile");
    ok(t.includes("Monthly usage") && t.includes("View your plan →"), "freelancer: the default widgets, with the plan's allowances under Monthly usage");
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "My dashboard (6)");
    ok(!(await offered(p)).includes("bench") && (await offered(p)).includes("quick"), "freelancer: the bench is not offered; Quick actions is");
    await dela(p).getByRole("switch", { name: "Show Account status on Home" }).click();
    await waitFor(p, "My dashboard (5)");
    await dela(p).getByRole("button", { name: "Save changes" }).click();
    await waitFor(p, "Your Home layout is saved.");
    t = await waitFor(p, "Shown on Home until this is done.");
    ok(t.includes("Complete your profile"), "freelancer: the profile card stays on Home while the profile is not complete, and says why");
    const rows = await sql(`select side, widgets from home_layouts where person_id in (${person(ATT)}, ${person(FL)})`);
    ok(rows.length === 1 && rows[0].side === "freelancer" && !rows[0].widgets.includes("account"), "the freelancer's layout is saved for the freelancer side only");
    await s.ctx.close();

    console.log("\nALL " + passed + " HOME CHECKS PASSED");
  } catch (e) {
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    if (before) for (const k of Object.keys(before)) await sql(`update feature_switches set state = '${before[k]}' where key = '${k}'`).catch(() => null);
    await sql(`delete from home_layouts where person_id in (${person(ATT)}, ${person(FL)}); select 1`).catch(() => null);
    await browser.close();
  }
})();

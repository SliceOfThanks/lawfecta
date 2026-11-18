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
const onHome = (page) => inShadow(page, (root) => [...root.querySelectorAll("#home-grid [data-widget]")].sort((a, b) => Number(a.getAttribute("data-pos")) - Number(b.getAttribute("data-pos"))).map((x) => x.getAttribute("data-widget")));
const columns = (page) => inShadow(page, (root) => root.querySelectorAll("#home-grid > .home-col").length);
const inPanel = (page) => inShadow(page, (root) => [...root.querySelectorAll("#cz-mine li")].map((x) => x.getAttribute("data-id")));
const offered = (page) => inShadow(page, (root) => [...root.querySelectorAll("#cz-avail li")].map((x) => x.getAttribute("data-id")));
const grip = (page, id) => inShadow(page, (root, i) => { const r = root.querySelector('#cz-mine li[data-id="' + i + '"] .cz-grip').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, id);
const focusName = (page) => inShadow(page, (root) => root.activeElement ? (root.activeElement.getAttribute("aria-label") || root.activeElement.id || root.activeElement.textContent) : "");
const ATT = 5201, FL = 5202, OWN = 5203, MEM = 5204;
const person = (bd) => `(select id from people where bd_member_id = ${bd})`;
async function makeMember(bd, side, plan, name) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, '${name}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side(${person(bd)}, '${side}', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and channel = 'access' and revoked_at is null); select 1`);
}
const KEYS = "'onboarding_widget', 'flex_gigs', 'engagements', 'profiles', 'talent_search', 'playbook_library', 'ai_generation', 'gig_chat', 'meetings', 'bench', 'reviews', 'automate_delegate', 'agency_team', 'new_layout'";
const DEF_ATT = ["attention", "delegating", "projects", "talent", "spend", "ask"];

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

    // ---------- Attorney: the six default widgets of the role ----------
    s = await open(browser, ATT, "&tab=home", 1280, 900);
    p = s.page;
    t = await waitFor(p, "Your Workspace");
    t = await waitFor(p, "No recorded delegation spend this month.");
    ok(t.includes("Your work, your priorities.") && t.includes("Customize dashboard"), "attorney: the heading, the welcome line and the Customize button: " + t.slice(0, 300).replace(/\n/g, " | "));
    let home = await onHome(p);
    ok(JSON.stringify(home) === JSON.stringify(DEF_ATT), "attorney: the six default widgets of the role, in order: " + home.join(", "));
    ok(t.includes("Needs your attention") && t.includes("Things to consider delegating") && t.includes("My projects and milestones") && t.includes("Proposals and talent matches") && t.includes("Delegation spend and results") && t.includes("Ask DELA"), "attorney: each widget has its name");
    ok(!t.includes("Account status"), "Account status is not on Home");
    ok(t.includes("Approve a document in the Library to get delegation ideas.") && t.includes("No open gig. Post a gig from Projects"), "attorney: with no documents and no gigs each widget says so and names the next step, with no invented numbers");
    ok(t.includes("Milestones accepted") && t.includes("Engagements completed") && !t.includes("hours saved"), "spend: only measured results, no hours saved");
    const spendRing = await inShadow(p, (root) => { const r = root.querySelector("[data-widget=spend] .usage-ring"); return r ? r.getAttribute("aria-label") : ""; });
    ok(spendRing === "Nothing paid this month", "spend: the ring is said in words: " + spendRing);
    ok(t.includes("View all projects →") && t.includes("Find talent →") && t.includes("Open the Library →"), "attorney: each widget links to its full page");
    ok((await columns(p)) === 2, "attorney at 1280: two columns");
    const heights = await inShadow(p, (root) => [...root.querySelectorAll("#home-grid [data-widget]")].map((x) => Math.round(x.getBoundingClientRect().height)));
    ok(new Set(heights).size > 1, "cards keep their own height, none is stretched to its neighbor: " + heights.join(", "));
    ok(await inShadow(p, (root) => root.querySelectorAll(".hero").length === 0), "the old banner is not on this Home");
    const bell = await inShadow(p, (root) => root.querySelector(".bell.icon").getAttribute("aria-label"));
    ok(/Notifications, \d+ unread/.test(bell), "the bell counts the unread notification: " + bell);
    // The period of the spend widget
    await dela(p).getByLabel("Period").selectOption("year");
    t = await waitFor(p, "No recorded delegation spend this year.");
    ok(t.includes("Results this year"), "spend: the period can be changed and is named");
    await p.screenshot({ path: path.join(SHOTS, "home-default.png"), fullPage: true });

    // ---------- The Customize panel: add, move by keyboard, leave without saving ----------
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    t = await waitFor(p, "Your dashboard (6)");
    ok(t.includes("Available widgets") && t.includes("Removing a widget only hides it on Home.") && t.includes("Restore default"), "the panel opens with the member's widgets, the others, and what removing means");
    const off = await offered(p);
    ok(JSON.stringify(off) === JSON.stringify(["bench", "standing", "workflow", "meetings", "messages", "usage", "notifications", "quick"]), "the attorney's other widgets are offered: " + off.join(", "));
    ok(await dela(p).getByRole("button", { name: "Save changes" }).isDisabled(), "nothing changed yet: Save changes is off");
    ok(await inShadow(p, (root) => !!root.querySelector("#home-grid [data-widget=projects]")), "Home stays in view behind the panel");
    const rowBtns = await inShadow(p, (root) => [...root.querySelectorAll('#cz-mine li[data-id="spend"] button')].map((b) => b.getAttribute("aria-label")));
    ok(JSON.stringify(rowBtns) === JSON.stringify(["Move Delegation spend and results up", "Move Delegation spend and results down", "Remove Delegation spend and results"]), "each row has its own visible Move up, Move down and Remove, named for the widget: " + rowBtns.join(" | "));
    await dela(p).getByRole("button", { name: "Add Quick actions to Home" }).click();
    await waitFor(p, "Your dashboard (7)");
    home = await onHome(p);
    ok(home[home.length - 1] === "quick", "the added widget shows on Home at once, as a preview");
    ok(!(await dela(p).getByRole("button", { name: "Save changes" }).isDisabled()), "a change turns Save changes on");
    // Keyboard only
    await dela(p).getByRole("button", { name: "Move Quick actions up" }).focus();
    await p.keyboard.press("Enter");
    await p.waitForTimeout(250);
    let mine = await inPanel(p);
    ok(mine.indexOf("quick") === 5 && mine.length === 7, "keyboard: Move up moves the widget one place: " + mine.join(", "));
    ok((await focusName(p)) === "Move Quick actions up", "keyboard: focus stays on the same control of the moved widget");
    ok((await inShadow(p, (root) => root.querySelector(".cz-panel [role=status]").textContent)).includes("Quick actions moved to position 6 of 7."), "a screen reader hears the new place");
    await p.keyboard.press("Escape");
    await waitGone(p, "Your dashboard (");
    home = await onHome(p);
    ok(!home.includes("quick") && (await focusName(p)) === "home-customize", "Escape leaves without saving (after asking): Home is as before and focus returns to the button");
    ok((await sql(`select count(*)::int n from home_layouts where person_id = ${person(ATT)}`))[0].n === 0, "nothing was saved");

    // ---------- Remove, add, drag, save ----------
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "Your dashboard (6)");
    await dela(p).getByRole("button", { name: "Remove Delegation spend and results" }).click();
    await waitFor(p, "Your dashboard (5)");
    ok((await offered(p)).includes("spend") && !(await onHome(p)).includes("spend"), "Remove takes the widget off Home and puts it under Available widgets");
    await dela(p).getByRole("button", { name: "Add Monthly usage to Home" }).click();
    await waitFor(p, "Your dashboard (6)");
    mine = await inPanel(p);
    const from = await grip(p, "usage"), to = await grip(p, mine[0]);
    await p.mouse.move(from.x, from.y);
    await p.mouse.down();
    await p.mouse.move(to.x, to.y - 2, { steps: 14 });
    await p.mouse.up();
    await p.waitForTimeout(250);
    mine = await inPanel(p);
    ok(mine[0] === "usage", "dragging the handle moves the widget to the top: " + mine.join(", "));
    await p.screenshot({ path: path.join(SHOTS, "home-customize.png") });
    await dela(p).getByRole("button", { name: "Save changes" }).click();
    await waitFor(p, "Your Home layout is saved.");
    await waitGone(p, "Your dashboard (");
    const saved = (await sql(`select widgets from home_layouts where person_id = ${person(ATT)} and side = 'attorney'`))[0].widgets;
    ok(JSON.stringify(saved) === JSON.stringify(mine), "the saved layout is the panel's order: " + JSON.stringify(saved));
    await p.reload();
    t = await waitFor(p, "DELA actions reset on");
    home = await onHome(p);
    ok(home[0] === "usage" && !home.includes("spend"), "after a reload Home keeps the member's order: " + home.join(", "));
    const ring = await inShadow(p, (root) => { const r = root.querySelector("#home-grid [data-widget=usage] .usage-ring"); return r ? { said: r.getAttribute("aria-label"), mid: r.querySelector(".usage-mid").innerText.replace(/\s+/g, " "), bars: root.querySelectorAll("#home-grid [data-widget=usage] .bar").length } : null; });
    ok(ring && /^\d[\d,]* of [\d,]+ DELA actions used this month, \d+ percent$/.test(ring.said) && /^\d[\d,]* \/ [\d,]+$/.test(ring.mid) && ring.bars >= 1, "Monthly usage: a ring with exact numbers, in words too: " + JSON.stringify(ring));
    const bell2 = await inShadow(p, (root) => root.querySelector(".bell.icon").getAttribute("aria-label"));
    ok(bell2 === bell, "changing Home changes nothing on the bell: " + bell2);
    ok((await sql(`select count(*)::int n from audit_log where action = 'home_layout_saved' and object_id = ${person(ATT)}::text`))[0].n === 1, "one audit line for the save");

    // ---------- Cancel discards; Restore default ----------
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "Your dashboard (6)");
    await dela(p).getByRole("button", { name: "Add Trusted bench to Home" }).click();
    await waitFor(p, "Your dashboard (7)");
    await dela(p).getByRole("button", { name: "Cancel", exact: true }).click();
    await waitGone(p, "Your dashboard (");
    ok(!(await onHome(p)).includes("bench"), "Cancel throws the changes away");
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "Your dashboard (6)");
    await dela(p).getByRole("button", { name: "Restore default" }).click();
    await p.waitForTimeout(200);
    mine = await inPanel(p);
    ok(JSON.stringify(mine) === JSON.stringify(DEF_ATT), "Restore default shows the role's default order in the panel");
    await dela(p).getByRole("button", { name: "Save changes" }).click();
    await waitFor(p, "Home is back to the default layout.");
    ok((await sql(`select count(*)::int n from home_layouts where person_id = ${person(ATT)}`))[0].n === 0, "the default is kept as no saved layout");

    // ---------- A widget that cannot load says so; narrow screens ----------
    await p.route((u) => u.pathname.endsWith("/home/spend"), (r) => r.abort());
    await p.reload();
    t = await waitFor(p, "This could not load just now.");
    ok(t.includes("Try again") && !t.includes("No recorded delegation spend"), "a widget that cannot load says so, never that there is nothing");
    await p.setViewportSize({ width: 768, height: 1000 });
    await p.waitForTimeout(400);
    ok((await columns(p)) === 0 && await fits(p), "768 wide: one column, no sideways scrolling");
    home = await onHome(p);
    ok(JSON.stringify(home) === JSON.stringify(DEF_ATT), "one column keeps the member's order: " + home.join(", "));
    await p.setViewportSize({ width: 320, height: 700 });
    await p.waitForTimeout(300);
    ok(await fits(p), "320 wide: Home fits");
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "Your dashboard (6)");
    ok(await fits(p) && await inShadow(p, (root) => root.querySelector(".cz-panel").getBoundingClientRect().width <= 320 && [...root.querySelectorAll("#cz-mine .cz-btn")].every((b) => b.getBoundingClientRect().width >= 24 && b.getBoundingClientRect().right <= 320)), "320 wide: the panel and its Move buttons fit the screen");
    await p.screenshot({ path: path.join(SHOTS, "home-customize-phone.png") });
    await dela(p).getByRole("button", { name: "Cancel", exact: true }).click();
    await s.ctx.close();

    // ---------- Freelancer: their own six, honest empty states, their own layout ----------
    s = await open(browser, FL, "&tab=home", 1280, 900);
    p = s.page;
    t = await waitFor(p, "Your Workspace");
    t = await waitFor(p, "More activity is needed to show a meaningful trend.");
    home = await onHome(p);
    ok(JSON.stringify(home) === JSON.stringify(["gigs", "earnings", "proposals", "projects", "attention", "growth"]), "freelancer: the six default widgets of the role: " + home.join(", "));
    ok(t.includes("Recommended gigs") && t.includes("Earnings and payments") && t.includes("My proposals and invitations") && t.includes("Business growth insights"), "freelancer: each widget has its name");
    ok(t.includes("No payments yet.") && t.includes("Waiting for payout") && t.includes("Contracted, not yet earned") && !t.includes("Profile views") && !t.includes("% Match"), "freelancer: received, waiting and contracted are apart; no profile views or match percentages are invented");
    const earnRing = await inShadow(p, (root) => { const r = root.querySelector("[data-widget=earnings] .usage-ring"); return r ? r.getAttribute("aria-label") : ""; });
    ok(/^\$0(\.00)? received this month$/.test(earnRing), "earnings: the ring is said in words: " + earnRing);
    ok(await inShadow(p, (root) => !!root.querySelector("#home-profile-top .card, #home-profile-bottom .card")) && t.includes("Complete your profile"), "freelancer: the Complete your profile card stays, apart from the widgets");
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "Your dashboard (6)");
    const offFl = await offered(p);
    ok(!offFl.includes("bench") && !offFl.includes("spend") && offFl.includes("ask") && offFl.includes("availability") && offFl.includes("reviews") && offFl.includes("quick"), "freelancer: their own library (no bench, no spend): " + offFl.join(", "));
    await dela(p).getByRole("button", { name: "Remove Business growth insights" }).click();
    await waitFor(p, "Your dashboard (5)");
    await dela(p).getByRole("button", { name: "Add My availability to Home" }).click();
    await waitFor(p, "Your dashboard (6)");
    await dela(p).getByRole("button", { name: "Save changes" }).click();
    await waitFor(p, "Your Home layout is saved.");
    t = await waitFor(p, "Edit availability");
    ok(t.includes("Complete your profile") && !t.includes("Business growth insights"), "freelancer: the saved layout shows, and the profile card is still there");
    const rows = await sql(`select side, widgets from home_layouts where person_id in (${person(ATT)}, ${person(FL)})`);
    ok(rows.length === 1 && rows[0].side === "freelancer" && rows[0].widgets.includes("availability") && !rows[0].widgets.includes("growth"), "the freelancer's layout is saved for the freelancer side only");
    await s.ctx.close();

    // ---------- Step 35: the agency's owner has "My work" and "My agency"; a team member has only their own Home ----------
    await makeMember(OWN, "freelancer", "fl_business", "Olive Owner");
    await makeMember(MEM, "freelancer", "fl_plus", "Mel Member");
    await sql(`delete from home_layouts where person_id in (${person(OWN)}, ${person(MEM)}); select 1`);
    const agencyOrg = (await sql(`select dela_agency_ensure(${person(OWN)}) id`))[0].id;
    await sql(`insert into org_members (org_id, person_id, member_role) values ('${agencyOrg}', ${person(MEM)}, 'member') on conflict (org_id, person_id) do update set status = 'active', weekly_hours = null, hours_asked_at = null, hours_set_at = null;
      update org_members set weekly_hours = null, hours_asked_at = null where org_id = '${agencyOrg}'; select 1`);
    ok((await sql(`select dela_agency_owned(${person(OWN)}) is not null o, dela_agency_owned(${person(MEM)}) is null m`))[0].o === true, "setup: Olive owns an active agency with one team member");
    s = await open(browser, OWN, "&tab=home", 1280, 900);
    p = s.page;
    await p.evaluate(() => { try { localStorage.removeItem("dela.home.agency"); } catch (e) { /* no storage */ } });
    await p.reload();
    t = await waitFor(p, "Your Workspace");
    await dela(p).getByRole("button", { name: "My agency", exact: true }).waitFor({ timeout: 8000 });
    ok(await dela(p).getByRole("button", { name: "My work", exact: true }).getAttribute("aria-pressed") === "true", "owner: the My work / My agency switch shows, on My work first");
    await dela(p).getByRole("button", { name: "My agency", exact: true }).click();
    t = await waitFor(p, "Agency Workspace");
    t = await waitFor(p, "Neither amount is profit");
    home = await onHome(p);
    ok(JSON.stringify(home) === JSON.stringify(["revenue", "team", "gigs", "proposals", "clients", "teamattention"]), "My agency: its own six widgets: " + home.join(", "));
    ok(t.includes("Paid by clients") && t.includes("Paid out to agency") && !/\bprofit\b(?! *:)/i.test(t.replace("Neither amount is profit", "")), "revenue: the two amounts apart, and neither is called profit");
    ok(t.includes("Recommended agency gigs") && t.includes("Proposals and sales pipeline") && t.includes("Active client projects") && t.includes("Needs team attention") && t.includes("No team actions pending."), "My agency: each widget has its name and an honest empty state");
    ok(t.includes("Hours not set") && !/\d+% *(used|utilization|capacity)/i.test(t), "team: with no hours entered the card says so and shows no percentage");
    await dela(p).getByRole("button", { name: /^Ask .* to set their hours$/ }).first().click();
    await waitFor(p, "was asked to set their weekly hours.");
    ok((await sql(`select count(*)::int n from notifications where person_id = ${person(MEM)} and title like '%asks for your weekly hours'`))[0].n >= 1 && (await text(p)).includes("Asked today"), "team: the owner's button sends the member one notice and reads Asked today");
    await p.screenshot({ path: path.join(SHOTS, "home-agency.png"), fullPage: true });
    // Its own layout
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "Your dashboard (6)");
    ok(!(await offered(p)).includes("earnings") && (await offered(p)).includes("quick"), "My agency has its own library");
    await dela(p).getByRole("button", { name: "Remove Needs team attention" }).click();
    await waitFor(p, "Your dashboard (5)");
    await dela(p).getByRole("button", { name: "Save changes" }).click();
    await waitFor(p, "Your Home layout is saved.");
    const agRows = await sql(`select side, widgets from home_layouts where person_id = ${person(OWN)}`);
    ok(agRows.length === 1 && agRows[0].side === "agency" && !agRows[0].widgets.includes("teamattention"), "the agency layout is saved apart from My work: " + JSON.stringify(agRows));
    await dela(p).getByRole("button", { name: "My work", exact: true }).click();
    t = await waitFor(p, "Your Workspace");
    t = await waitFor(p, "Earnings and payments");
    home = await onHome(p);
    ok(JSON.stringify(home) === JSON.stringify(["gigs", "earnings", "proposals", "projects", "attention", "growth"]) && !t.includes("Paid by clients"), "My work is the owner's own freelancer Home, unchanged");
    // The Agency page: the owner sets a member's hours
    await p.goto(`${BASE}/page/DELA-App?uid=${OWN}&plan=&tab=agency`);
    await waitFor(p, "Team");
    // The owner's own row is first in the team list; the member's is second
    await dela(p).getByLabel(/^Hours a week for /).nth(1).fill("15");
    await dela(p).getByRole("button", { name: /^Save hours a week for / }).nth(1).click();
    await waitFor(p, "Saved: 15 hours a week.");
    ok((await sql(`select weekly_hours from org_members where org_id = '${agencyOrg}' and person_id = ${person(MEM)}`))[0].weekly_hours === 15, "Agency page: the owner saves a member's hours a week");
    await s.ctx.close();
    // The team member: their own Home only
    s = await open(browser, MEM, "&tab=home", 1280, 900);
    p = s.page;
    t = await waitFor(p, "Your Workspace");
    t = await waitFor(p, "Earnings and payments");
    ok(await inShadow(p, (root) => { const v = root.querySelector("#home-view"); return !v || v.hidden; }) && !t.includes("My agency") && !t.includes("Paid by clients") && !t.includes("Agency revenue"), "team member: no My agency switch and no agency figures on Home");
    await p.evaluate(() => { try { localStorage.setItem("dela.home.agency", "1"); } catch (e) { /* no storage */ } });
    await p.reload();
    t = await waitFor(p, "Earnings and payments");
    ok(!t.includes("Agency Workspace") && !t.includes("Paid by clients"), "team member: asking for the agency view by hand falls back to their own Home");
    await s.ctx.close();

    console.log("\nALL " + passed + " HOME CHECKS PASSED");
  } catch (e) {
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    if (before) for (const k of Object.keys(before)) await sql(`update feature_switches set state = '${before[k]}' where key = '${k}'`).catch(() => null);
    await sql(`delete from home_layouts where person_id in (${person(ATT)}, ${person(FL)}, ${person(OWN)}, ${person(MEM)}); select 1`).catch(() => null);
    await browser.close();
  }
})();

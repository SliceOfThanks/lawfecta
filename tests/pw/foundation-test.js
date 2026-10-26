// Browser test of Step 1: the real widgets (through PHP), the real api and database, the member app and the admin area.
// Needs: tools/dbtest.sh run first, then tests/pw/server.ts running on port 8787.
// node tests/pw/foundation-test.js   (screenshots go to SHOTS, default ./shots)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://127.0.0.1:8787";
const ROOT = path.join(__dirname, "..", "..");
const SHOTS = process.env.SHOTS || path.join(ROOT, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
let passed = 0;
function ok(cond, msg) { if (!cond) throw new Error("FAILED: " + msg); passed++; console.log("ok", msg); }
async function sql(q) { const r = await fetch(BASE + "/test/sql", { method: "POST", body: JSON.stringify({ sql: q }) }); return (await r.json()).rows; }

async function open(browser, widget, uid, plan, opts) {
  const ctx = await browser.newContext(opts || { viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Checked in test" : undefined));
  // jsDelivr serves the repo files; here they come from this checkout
  await page.route("https://cdn.jsdelivr.net/**", (route) => {
    const u = new URL(route.request().url());
    const rel = u.pathname.split("@")[1].split("/").slice(1).join("/");
    route.fulfill({ path: path.join(ROOT, rel), contentType: "application/javascript" });
  });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto(`${BASE}/page/${widget}?uid=${uid}&plan=${plan}`);
  return { ctx, page };
}

// Text inside the DELA shadow root
async function text(page) {
  await page.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela").textContent.length > 20; });
  await page.waitForTimeout(150);
  return page.evaluate(() => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText);
}
const dela = (page) => page.locator(".dela-host");

(async () => {
  const browser = await chromium.launch();
  try {
    await sql("delete from staff_roles; delete from access_list; update plans set bd_plan_id = null");

    // Logged out
    let s = await open(browser, "DELA-App", 0, "");
    ok((await text(s.page)).includes("Log in to use DELA"), "logged-out members are asked to log in");
    await s.ctx.close();

    // First sign in, not on the list
    s = await open(browser, "DELA-App", 1, "");
    ok((await text(s.page)).includes("not open for your account yet"), "members off the access list see that DELA is not open yet");
    await s.ctx.close();

    // Claude's setup step: Stacey (BD member 1) becomes owner
    await sql("insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = 1");

    // Admin area
    s = await open(browser, "DELA-Admin", 1, "");
    let t = await text(s.page);
    ok(t.includes("Overview") && t.includes("Plans not linked to BD"), "owner opens the admin area");
    await s.page.screenshot({ path: path.join(SHOTS, "admin-overview.png"), fullPage: true });

    // BD styles do not leak into DELA
    const btnBg = await s.page.evaluate(() => getComputedStyle(document.querySelector(".dela-host").shadowRoot.querySelector("button")).backgroundColor);
    ok(btnBg !== "rgb(0, 255, 0)", "BD page styles cannot reach DELA buttons");

    // Access list: add a test attorney and a test freelancer
    await dela(s.page).getByRole("tab", { name: "Access list" }).click();
    await dela(s.page).getByLabel("BD member ID").fill("1100");
    await dela(s.page).getByLabel("Note").fill("Test attorney");
    await dela(s.page).getByRole("button", { name: "Add", exact: true }).click();
    await s.page.waitForTimeout(300);
    await dela(s.page).getByLabel("BD member ID").fill("1200");
    await dela(s.page).getByLabel("Note").fill("Test freelancer");
    await dela(s.page).getByRole("button", { name: "Add", exact: true }).click();
    await s.page.waitForTimeout(300);
    t = await text(s.page);
    ok(t.includes("Test attorney") && t.includes("Test freelancer"), "owner adds people to the access list");
    await s.page.screenshot({ path: path.join(SHOTS, "admin-access.png"), fullPage: true });

    // Plans: link BD plans and change a price through a draft
    await dela(s.page).getByRole("tab", { name: "Plans" }).click();
    t = await text(s.page);
    ok(t.includes("Attorney plans") && t.includes("Freelancer plans") && t.includes("Proposals sent per month"), "plans show both sides with their own limits");
    await s.page.screenshot({ path: path.join(SHOTS, "admin-plans.png"), fullPage: true });
    await dela(s.page).getByRole("button", { name: "Edit" }).nth(2).click(); // Attorney Pro
    await dela(s.page).getByLabel("BD plan ID").fill("12");
    await dela(s.page).getByRole("button", { name: "Save link" }).click();
    await s.page.waitForTimeout(300);
    await dela(s.page).getByLabel("Monthly price in dollars").fill("54");
    await dela(s.page).getByLabel("Open Flex Gigs at one time limit").fill("12");
    await dela(s.page).getByRole("button", { name: "Save draft" }).click();
    await s.page.waitForTimeout(400);
    ok((await text(s.page)).includes("You are looking at a draft"), "a plan change starts as a draft");
    await dela(s.page).getByRole("button", { name: "Approve draft" }).click();
    await s.page.waitForTimeout(400);
    let rows = await sql("select monthly_cents from plan_versions where plan_code = 'att_pro' and status = 'approved'");
    ok(rows[0].monthly_cents === 5400, "approved draft sets the new price ($54)");
    rows = await sql("select bd_plan_id from plans where code = 'att_pro'");
    ok(String(rows[0].bd_plan_id) === "12", "BD plan 12 is linked to Attorney Pro");
    await sql("update plans set bd_plan_id = 20 where code = 'fl_free'");

    // Settings: change the gig length and see its history
    await dela(s.page).getByRole("tab", { name: "Settings" }).click();
    t = await text(s.page);
    ok(t.includes("Engagement money") && t.includes("Smallest engagement allowed"), "settings are grouped with plain labels");
    await s.page.screenshot({ path: path.join(SHOTS, "admin-settings.png"), fullPage: true });
    const row = dela(s.page).locator("tr", { hasText: "Smallest engagement allowed" });
    await row.getByRole("button", { name: "Change" }).click();
    await dela(s.page).locator("td[colspan] input").first().fill("200");
    await dela(s.page).getByPlaceholder("Why (saved with the decision)").fill("Stacey approved $200 in test");
    await dela(s.page).getByRole("button", { name: "Save", exact: true }).click();
    await s.page.waitForTimeout(400);
    rows = await sql("select value from settings where key = 'engagement.minimum_cents'");
    ok(rows[0].value === 20000, "dollars typed in the admin area are saved as cents");

    // Switches
    await dela(s.page).getByRole("tab", { name: "Switches" }).click();
    await dela(s.page).getByLabel("DELA AI help").selectOption("staff");
    await s.page.waitForTimeout(300);
    rows = await sql("select state from feature_switches where key = 'ai_generation'");
    ok(rows[0].state === "staff", "owner turns a switch on for the Lawfecta Team only");
    await dela(s.page).getByRole("tab", { name: "Audit log" }).click();
    t = await text(s.page);
    ok(t.includes("switch changed") && t.includes("plan approved") && t.includes("setting changed"), "every change is in the audit log");
    await dela(s.page).getByRole("tab", { name: "Overview" }).click();
    await dela(s.page).getByRole("button", { name: "Send an in-app notice" }).click();
    await s.page.waitForTimeout(300);
    await s.ctx.close();

    // Attorney home
    s = await open(browser, "DELA-App", 1100, "12");
    t = await text(s.page);
    ok(t.includes("Plan. Delegate.") && t.includes("Verification") && t.includes("Attorney Pro"), "attorney sees Attorney DELA on their plan");
    ok(t.includes("Delegate") && t.includes("Talent"), "attorney has the attorney tabs");
    ok(t.includes(" of 12 available") && !t.includes("Proposals sent per month"), "attorney sees attorney limits only, with the approved change");
    ok(t.includes("Do not enter confidential client information"), "the confidential information notice shows");
    ok(t.includes("Staging"), "staging badge shows");
    await s.page.screenshot({ path: path.join(SHOTS, "attorney-home.png"), fullPage: true });
    await dela(s.page).getByRole("button", { name: "Talent" }).click();
    ok((await text(s.page)).includes("trusted bench"), "attorney tabs open their sections");
    await s.ctx.close();

    // Freelancer home on a phone
    s = await open(browser, "DELA-App", 1200, "20", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    t = await text(s.page);
    ok(t.includes("Your match checklist") && t.includes("5 of 5 left this month") && t.includes("Earnings") && !t.includes("Talent"), "freelancer sees Freelancer DELA, its own tabs and 5 proposals a month");
    const wide = await s.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    ok(!wide, "no sideways scrolling on a phone");
    await s.page.screenshot({ path: path.join(SHOTS, "freelancer-home-phone.png"), fullPage: true });
    await s.ctx.close();

    // Owner gives the freelancer an attorney side too; they can switch
    await sql("select dela_admin_grant_side((select person_id from staff_roles where role = 'owner' limit 1), 1200, 'attorney', 'att_plus')");
    s = await open(browser, "DELA-App", 1200, "20");
    await text(s.page);
    await dela(s.page).getByRole("button", { name: "Attorney", exact: true }).click();
    await s.page.waitForTimeout(400);
    t = await text(s.page);
    ok(t.includes("Verification") && t.includes("Attorney Plus"), "a member with both sides switches to Attorney DELA");
    await s.ctx.close();

    // Owner sees the notice and the admin link
    s = await open(browser, "DELA-App", 1, "");
    t = await text(s.page);
    ok(t.includes("Almost there"), "owner without a plan sees the setup message");
    await dela(s.page).getByRole("button", { name: "Account menu" }).click();
    ok((await text(s.page)).includes("Admin area"), "the account menu has the admin link for the Lawfecta Team");
    await dela(s.page).getByRole("button", { name: "Notices" }).click();
    await s.page.waitForTimeout(400);
    ok((await text(s.page)).includes("DELA test notice"), "the test notice arrives in Notices");
    await s.page.screenshot({ path: path.join(SHOTS, "notices.png") });
    await s.ctx.close();

    // Releases: password, tested checkbox, push needs the password
    await sql("delete from release_approvals; delete from releases; delete from release_password; select dela_release_record('v0.1.0', repeat('e', 40), 'api-0.2.0', array['0001_foundation_tables.sql'], 'Step 1 foundation: sign in, plans, admin area', 'https://github.com/SliceOfThanks/lawfecta/actions/runs/1')");
    s = await open(browser, "DELA-Admin", 1, "");
    await text(s.page);
    await dela(s.page).getByRole("tab", { name: "Releases" }).click();
    t = await text(s.page);
    ok(t.includes("Set your release password") && t.includes("Nothing yet"), "Releases tab asks the owner to set a release password");
    await dela(s.page).getByLabel("New release password", { exact: true }).fill("Lawfecta-Release-01");
    await dela(s.page).getByLabel("Repeat new release password").fill("Lawfecta-Release-01");
    await dela(s.page).getByRole("button", { name: "Save password" }).click();
    await s.page.waitForTimeout(500);
    ok((await text(s.page)).includes("Change your release password"), "release password saved");
    ok(!(await text(s.page)).includes("Push to Live"), "no push button before the version is marked tested");
    await dela(s.page).getByLabel("I tested v0.1.0 on Staging").check();
    await s.page.waitForTimeout(500);
    await dela(s.page).getByRole("button", { name: "Push to Live" }).click();
    await dela(s.page).getByLabel("Release password", { exact: true }).fill("not-the-password");
    await dela(s.page).getByRole("button", { name: "Confirm" }).click();
    await s.page.waitForTimeout(500);
    ok((await text(s.page)).includes("That release password is not right"), "wrong release password is refused");
    await dela(s.page).getByRole("button", { name: "Push to Live" }).click();
    await dela(s.page).getByLabel("Release password", { exact: true }).fill("Lawfecta-Release-01");
    await dela(s.page).getByRole("button", { name: "Confirm" }).click();
    await s.page.waitForTimeout(600);
    ok((await text(s.page)).includes("GitHub is not connected for pushes yet"), "with GitHub not set up, nothing is pushed and the owner is told");
    rows = await sql("select status from releases");
    ok(rows[0].status === "tested", "the version stays tested on Staging");
    await s.page.screenshot({ path: path.join(SHOTS, "admin-releases.png"), fullPage: true });
    await s.ctx.close();

    // Emergency pause: owner pauses everything, a member sees the pause message, then it is turned back on
    s = await open(browser, "DELA-Admin", 1, "");
    await text(s.page);
    await dela(s.page).getByRole("button", { name: "All of DELA", exact: true }).click();
    await s.page.waitForTimeout(600);
    ok((await text(s.page)).includes("DELA is paused for members right now"), "owner pauses all of DELA from the Overview");
    await s.page.screenshot({ path: path.join(SHOTS, "admin-emergency.png"), fullPage: false });
    const m = await open(browser, "DELA-App", 1200, "20");
    ok((await text(m.page)).includes("DELA is paused for a moment"), "members see the pause message");
    await m.ctx.close();
    await dela(s.page).getByRole("button", { name: "Paused: All of DELA" }).click();
    await s.page.waitForTimeout(600);
    ok(!(await text(s.page)).includes("DELA is paused for members right now"), "owner turns DELA back on");

    // Undo a setting change from its history
    await sql("select dela_admin_set_setting((select person_id from staff_roles where role = 'owner' limit 1), 'engagement.minimum_cents', '30000', 'O', 'try $300')");
    await dela(s.page).getByRole("tab", { name: "Settings" }).click();
    const r2 = dela(s.page).locator("tr", { hasText: "Smallest engagement allowed" });
    await r2.getByRole("button", { name: "Change" }).click();
    await dela(s.page).getByRole("button", { name: "History" }).click();
    await s.page.waitForTimeout(500);
    await dela(s.page).getByRole("button", { name: "Undo" }).first().click();
    await s.page.waitForTimeout(500);
    rows = await sql("select value from settings where key = 'engagement.minimum_cents'");
    ok(rows[0].value === 20000, "undo puts the minimum back to the value before the last change");
    await s.ctx.close();

    // A member cannot open the admin area
    s = await open(browser, "DELA-Admin", 1100, "12");
    ok((await text(s.page)).includes("Lawfecta Team only"), "members cannot open the admin area");
    await s.ctx.close();

    // Removing access takes effect on the next page load
    await sql("select dela_admin_access_revoke((select person_id from staff_roles where role = 'owner' limit 1), (select id from access_list where bd_member_id = 1100 and revoked_at is null))");
    s = await open(browser, "DELA-App", 1100, "12");
    ok((await text(s.page)).includes("not open for your account yet"), "removed member is turned away");
    await s.ctx.close();

    console.log("\n" + passed + " browser checks passed");
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });

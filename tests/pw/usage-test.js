// Browser test of step 9b, attorney usage limits: the yellow banner at 80%, the meter at the bottom of DELA, the Usage
// page with three bars and the reset date, the pop-up when the saved-documents limit is hit (Upgrade, Not now), a
// read-only document after a downgrade, and the admin Usage tab (bonus actions with a required note).
//   node tests/pw/usage-test.js   (with tests/pw/server.ts running)
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
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
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
const click = (page, name) => dela(page).getByRole("button", { name, exact: true }).first().click();
const label = (page, name) => dela(page).getByLabel(name, { exact: true }).first();
async function sign(page, name, version) {
  await label(page, "Type your full name to sign").fill(name);
  await label(page, "I agree to sign electronically").check();
  await click(page, "Sign version " + version);
}
const ATT = 4200, TEAM = 4201;

(async () => {
  const browser = await chromium.launch();
  let s, p, t;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('playbook_library', 'ai_generation', 'document_standard'); update feature_switches set state = 'off' where key = 'usage_limits_enforced'; select 1");
    await sql(`insert into people (bd_member_id, display_name, email) values (${ATT}, 'Uma Usage', '${ATT}@test.invalid'), (${TEAM}, 'Tess Team', '${TEAM}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = ${ATT}), 'attorney', 'att_free', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = ${TEAM}), 'attorney', 'att_pro', 'staff_grant');
      insert into access_list (bd_member_id, channel) select x, 'access' from unnest(array[${ATT}, ${TEAM}]) x where not exists (select 1 from access_list where bd_member_id = x and channel = 'access' and revoked_at is null);
      insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = ${TEAM} and not exists (select 1 from staff_roles s where s.person_id = people.id and s.role = 'owner'); select 1`);
    const ids = (await sql(`select (select id from people where bd_member_id = ${ATT}) att, (select id from people where bd_member_id = ${TEAM}) team, dela_side_org((select id from people where bd_member_id = ${ATT}), 'attorney') org`))[0];
    // The step 9b numbers on Attorney Free (other browser tests may have changed the plan)
    const d = (await sql(`select dela_admin_plan_draft('${ids.team}', 'att_free', '{"features":{"att.playbooks_saved":{"enabled":true,"limit":3},"ai.runs":{"enabled":true,"limit":50},"storage.mb":{"enabled":true,"limit":1024}}}') r`))[0].r;
    await sql(`select dela_admin_plan_approve('${ids.team}', ${d.version_id}); select 1`);
    // 40 of 50 actions used this month, and 4 documents saved (one over the limit of 3)
    await sql(`insert into quota_usage (person_id, side, feature_key, period_start, used) values ('${ids.att}', 'attorney', 'ai.runs', dela_period_start('month'), 40) on conflict (person_id, side, feature_key, period_start) do update set used = 40; select 1`);
    for (let i = 0; i < 4; i++) await sql(`insert into playbooks (org_id, title, status, current_version, completeness, request_id, created_by, updated_at) values ('${ids.org}', 'Usage doc ${i}', 'draft', 1, 50, 'use${i}', '${ids.att}', now() - make_interval(days => ${i})); select 1`);
    const oldest = (await sql(`select id from playbooks where org_id = '${ids.org}' and title = 'Usage doc 3'`))[0].id;

    // ---------- The banner, the meter and the Usage page ----------
    s = await open(browser, "DELA-App", ATT, "&tab=home");
    p = s.page;
    t = await waitFor(p, "You've used 40 of 50 DELA actions this month.");
    ok(await dela(p).locator(".usage-banner").getByText("Upgrade to Plus").count() === 1, "the yellow banner at 80% with an Upgrade button");
    t = await waitFor(p, "DELA actions: 40 of 50 this month");
    ok(true, "the meter at the bottom of DELA");
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=usage`);
    t = await waitFor(p, "Your plan: Attorney Free");
    ok(t.includes("4 of 3 saved") && t.includes("40 of 50 this month") && t.includes("of 1 GB used") && t.includes("DELA actions reset on"), "the Usage page: three counts and the reset date");
    ok(await dela(p).getByRole("progressbar").count() === 3, "three progress bars");
    ok(!t.includes("read-only"), "nothing is read-only while blocking is off");

    // ---------- Blocking on: the read-only document and the pop-up ----------
    await sql("update feature_switches set state = 'everyone' where key = 'usage_limits_enforced'; select 1");
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=usage`);
    t = await waitFor(p, "read-only because your plan saves fewer documents");
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=library&pb=${oldest}`);
    t = await waitFor(p, "Upgrade to edit this document.", 10000);
    ok(await dela(p).locator("#doc-locked").count() === 1, "a read-only document says so at the top, with Upgrade");
    // The pop-up when the saved-documents limit is hit: only that action stops, with Upgrade and Not now
    await sql("update feature_switches set state = 'off' where key = 'document_standard'; select 1");
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=library`);
    t = await waitFor(p, "Document library");
    ok(t.includes("Upgrade to edit this document."), "the Library marks the read-only document with a lock");
    await click(p, "New document");
    await click(p, "Start blank");
    const dlg = dela(p).getByRole("dialog", { name: "Limit reached" });
    await dlg.waitFor({ timeout: 8000 });
    const dt = await dlg.innerText();
    ok(dt.includes("You've saved 4 of 3 documents on Free.") && dt.includes("Upgrade to Plus to save more."), "the pop-up says the numbers and the next plan: " + dt.slice(0, 160));
    ok(await dlg.getByRole("link", { name: "Upgrade to Plus", exact: true }).count() === 1, "the pop-up has Upgrade");
    await dlg.getByRole("button", { name: "Not now", exact: true }).click();
    ok(await dela(p).getByRole("dialog", { name: "Limit reached" }).count() === 0, "Not now closes it");
    await sql("update feature_switches set state = 'everyone' where key = 'document_standard'; select 1");
    await s.ctx.close();
    await sql("update feature_switches set state = 'off' where key = 'usage_limits_enforced'; select 1");

    // ---------- The Lawfecta Team: the Usage tab and bonus actions ----------
    s = await open(browser, "DELA-Admin", TEAM, "");
    p = s.page;
    await dela(p).getByRole("tab", { name: "Usage", exact: true }).click();
    t = await waitFor(p, "Member 4200");
    ok(t.includes("Attorney Free") && t.includes("40 of 50") && t.includes("4 of 3"), "the admin list shows the plan and each count");
    const row = dela(p).locator("tr", { hasText: "Member 4200" });
    await label(p, "Bonus actions for Member 4200").fill("25");
    await row.getByRole("button", { name: "Grant bonus actions" }).click();
    await waitFor(p, "Add a note saying why.");
    ok(true, "a bonus needs a note");
    await label(p, "Note for the bonus for Member 4200").fill("Launch week");
    // Fix (AI review 0.9.0, payments 2): a double click grants the bonus once
    await row.getByRole("button", { name: "Grant bonus actions" }).dblclick();
    t = await waitFor(p, "includes 25 bonus");
    ok(t.includes("40 of 75"), "the bonus raises this month's limit");
    ok((await sql(`select coalesce(sum(amount), 0)::int n from usage_bonus where person_id = '${ids.att}'`))[0].n === 25, "a double click on Grant bonus actions adds the bonus once");

    // ---------- Step 9: the Trials tab (the Pro trial check, Dry run until the BD endpoints are connected) ----------
    await dela(p).getByRole("tab", { name: "Trials", exact: true }).click();
    t = await waitFor(p, "Pro trial check");
    ok(t.includes("Trial downgrade mode: Dry run") && t.includes("Plans 5, 10, 11, 12, 13, 14 are never changed") && t.includes("at 2:00 AM Pacific"), "the Trials tab shows the mode and the never-changed plans");
    await dela(p).getByRole("button", { name: "Run the check now (Dry run)" }).click();
    t = await waitFor(p, "BD not connected yet", 10000);
    ok(t.includes("Run now") && t.includes("Dry run"), "a run on demand is logged, and says BD is not connected yet");
    await dela(p).getByRole("button", { name: "Switch to Live" }).click();
    t = await waitFor(p, "Trial downgrade mode: Live (lists only while the daily check is off)", 10000);
    ok((await sql("select value #>> '{}' v from settings where key = 'trial.downgrade_mode'"))[0].v === "live", "Switch to Live changes the Trial downgrade mode setting");
    await dela(p).getByRole("button", { name: "Switch to Dry run" }).click();
    await waitFor(p, "Trial downgrade mode: Dry run", 10000);
    await s.ctx.close();
    console.log(passed + " browser checks passed");
  } catch (e) {
    if (s && s.page) await s.page.screenshot({ path: path.join(SHOTS, "usage-fail.png"), fullPage: true }).catch(() => {});
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

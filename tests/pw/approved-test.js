// Browser test of UX review Phase 4 part A (docs/briefs/step-8a-phase-4.md): an approved document opens on its read-only
// "Approved version" page (version, approval date and approver, the document as exported, no Save button); "Edit a new draft"
// opens the form; after a save the approved version stays in use, the draft page links back to it and exports the draft
// marked DRAFT; with the switch off the document opens as before.
//   node tests/pw/approved-test.js   (with tests/pw/server.ts running)
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
const STEP = (text, extra = {}) => ({ text, role: "Paralegal", raci: { Paralegal: "R", Attorney: "A" }, ...extra });
const PARENT = {
  schema: 2, type: "sop", title: "New client intake", lifecycle: "INT", owner_role: "Attorney", roles: ["Attorney", "Paralegal"], role_kinds: { Attorney: "attorney", Paralegal: "staff" },
  purpose: "Bring a new client in the same way every time.", scope: "Every new client.", trigger: "A client signs the engagement letter.", before_you_start: ["Access to Clio"],
  steps: [STEP("Send the intake questionnaire."), STEP("Send a reminder if it is not back in 2 days."), STEP("Log the returned form in the matter."), STEP("Draft the intake summary."),
    STEP("Decide whether the matter needs a second attorney.", { attorney_decides: true, role: "Attorney", raci: { Attorney: "R,A" } }), STEP("Advise the client on next steps.", { attorney_decides: true, role: "Attorney", raci: { Attorney: "R,A" } })],
  quality_check: ["The form is logged"], done_when: "The summary is in the matter.", kpis: [{ name: "Days to intake", measures: "Days", kind: "lagging", source: "Clio", owner_role: "Attorney", baseline: "", target: "2", rhythm: "Monthly" },
    { name: "Forms returned", measures: "Share", kind: "lagging", source: "Clio", owner_role: "Attorney", baseline: "", target: "90%", rhythm: "Monthly" }, { name: "Rework", measures: "Count", kind: "lagging", source: "Clio", owner_role: "Attorney", baseline: "", target: "0", rhythm: "Monthly" }],
};
const ATT = 4410;

(async () => {
  const browser = await chromium.launch();
  let s, p, t;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('document_standard', 'playbook_library', 'profiles', 'approved_view')");
    await sql(`insert into people (bd_member_id, display_name, email) values (${ATT}, 'Ada Approver', '${ATT}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = ${ATT}), 'attorney', 'att_pro', 'staff_grant');
      insert into access_list (bd_member_id, channel) select ${ATT}, 'access' where not exists (select 1 from access_list where bd_member_id = ${ATT} and channel = 'access' and revoked_at is null); select 1`);
    const ids = (await sql(`select (select id from people where bd_member_id = ${ATT}) att, dela_side_org((select id from people where bd_member_id = ${ATT}), 'attorney') org`))[0];
    const body = JSON.stringify(PARENT).replace(/'/g, "''");
    const pb = (await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by, doc_type, lifecycle, doc_id)
      values ('${ids.org}', 'New client intake', 'approved', 1, 1, 100, 'apv1', '${ids.att}', 'sop', 'INT', 'INT-07') returning id`))[0].id;
    await sql(`insert into playbook_versions (playbook_id, version, body, created_by) values ('${pb}', 1, '${body}', '${ids.att}');
      insert into document_changes (playbook_id, version, kind, what, person_id) values ('${pb}', 1, 'approval', 'Approved', '${ids.att}'); select 1`);

    // ---------- An approved document opens read-only ----------
    s = await open(browser, "DELA-App", ATT, `&tab=library&pb=${pb}`); p = s.page;
    t = await waitFor(p, "Approved version 1", 15000);
    ok(t.includes(" by Member " + ATT) && t.includes("INT-07") && t.includes("This is the version in use"), "the page shows the version, the approver and the ID");
    ok(t.includes("Send the intake questionnaire.") && t.includes("Decide whether the matter needs a second attorney."), "the steps are there to read");
    ok(await dela(p).getByRole("button", { name: "Save", exact: true }).count() === 0, "no Save button on the approved version");
    ok(t.includes("Export the approved version:") && t.includes("Edit a new draft"), "export and one clear edit action");
    ok(await dela(p).getByRole("tab", { name: "Approved version", exact: true }).count() === 1 && await dela(p).getByRole("tab", { name: "Draft and review", exact: true }).count() === 0, "the first tab is the approved version");

    // ---------- Edit a new draft, save, and the approved version stays in use ----------
    await click(p, "Edit a new draft");
    t = await waitFor(p, "Your first save makes version 2");
    ok(await dela(p).getByRole("button", { name: "Save", exact: true }).count() >= 1, "the form opens with Save");
    await click(p, "Save");
    t = await waitFor(p, "Draft (version 2)");
    ok(t.includes("The approved version 1 stays in use until this one is approved.") && t.includes("View the approved version"), "the draft page names the version in use and links back");
    ok(t.includes("Export this draft (marked DRAFT on every page):"), "the draft export is labeled");
    ok((await sql(`select status, current_version, approved_version from playbooks where id = '${pb}'`))[0].approved_version === 1, "the database keeps version 1 approved");
    await click(p, "View the approved version");
    t = await waitFor(p, "A draft (version 2) is in progress");
    ok(t.includes("Open the draft") && !t.includes("Edit a new draft"), "a second draft is never offered while one is open");
    await click(p, "Open the draft");
    t = await waitFor(p, "Draft, not approved");
    ok(t.includes("Quality check"), "Open the draft goes to the draft page");
    await s.ctx.close();

    // ---------- The switch off: the document opens as before ----------
    await sql("update feature_switches set state = 'off' where key = 'approved_view'");
    s = await open(browser, "DELA-App", ATT, `&tab=library&pb=${pb}`); p = s.page;
    t = await waitFor(p, "Draft, not approved", 15000);
    ok(await dela(p).getByRole("tab", { name: "Approved version", exact: true }).count() === 0 && t.includes("Draft and review"), "no approved page with the switch off");
    await s.ctx.close();
    console.log(passed + " browser checks passed");
  } catch (e) {
    console.error(e.message);
    if (p) await p.screenshot({ path: path.join(SHOTS, "approved-fail.png") }).catch(() => {});
    process.exitCode = 1;
  } finally { await browser.close(); }
})();

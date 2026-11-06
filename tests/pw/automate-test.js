// Browser test of step 4d: "✦ Automate or delegate" on an approved SOP (the hint card, the two optional boxes, the checked
// suggestions, the one-screen delegate path: steps, the SOP for just those steps, KPIs, approval, the gig with the suggested
// budget and fee), Dismiss, and the "Get set up" screen with Home's progress card and Skip for now.
// Real widgets, api and database; stand-ins from tests/pw/server.ts. Needs tools/dbtest.sh, then tests/pw/server.ts.
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
async function open(browser, uid, query) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept());
  await page.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(ROOT, u.pathname.split("@")[1].split("/").slice(1).join("/")), contentType: "application/javascript" }); });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto(`${BASE}/page/DELA-App?uid=${uid}&plan=${query || ""}`);
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
const ATT = 3900;
const STEP = (t, x) => Object.assign({ text: t, role: "Paralegal", raci: { Paralegal: "R", Attorney: "A" } }, x || {});
const DOC = (title) => JSON.stringify({ schema: 2, type: "sop", title, lifecycle: "INT", owner_role: "Attorney", roles: ["Attorney", "Paralegal"], role_kinds: { Attorney: "attorney", Paralegal: "staff" },
  purpose: "Bring a new client in the same way every time.", scope: "Every new client.", trigger: "The engagement letter is signed.", before_you_start: ["Access to Clio"],
  steps: [STEP("Send the intake questionnaire."), STEP("Send a reminder if it is not back in 2 days."), STEP("Log the returned form in the matter."),
    STEP("Decide whether the matter needs a second attorney.", { attorney_decides: true, role: "Attorney", raci: { Attorney: "R,A" } })],
  quality_check: ["The form is logged"], done_when: "The form is in the matter.", kpis: [{ name: "Days to intake", target: "2" }, { name: "Forms returned", target: "90%" }, { name: "Rework", target: "0" }] }).split("'").join("''");

(async () => {
  const browser = await chromium.launch();
  let s, t;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('automate_delegate', 'guided_setup', 'document_standard', 'playbook_library', 'flex_gigs', 'ai_generation', 'profiles'); update feature_switches set state = 'off' where key = 'tech_catalog'; select 1");
    await sql(`insert into people (bd_member_id, display_name, email) values (${ATT}, 'Ana Auto', '${ATT}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = ${ATT}), 'attorney', 'att_pro', 'staff_grant');
      insert into access_list (bd_member_id, channel) select ${ATT}, 'access' where not exists (select 1 from access_list where bd_member_id = ${ATT} and channel = 'access' and revoked_at is null);
      insert into member_profiles (person_id, side, body, missing, score) select id, 'attorney', '{"firm_name":"Auto Legal","practice_areas":["Family law"]}', '{}', 100 from people where bd_member_id = ${ATT} on conflict do nothing;
      insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) select id, 'l', 'TX', 'AU${ATT}', 'AU${ATT}', 'A', 'video', 'verified' from people where bd_member_id = ${ATT};
      select dela_profile_refresh((select id from people where bd_member_id = ${ATT}), 'attorney'); select 1`);
    const ids = (await sql(`select (select id from people where bd_member_id = ${ATT}) att, dela_side_org((select id from people where bd_member_id = ${ATT}), 'attorney') org`))[0];
    await sql(`insert into firm_profiles (org_id, body) values ('${ids.org}', '{"documents":{"size":"solo","practice_areas":["Family law"],"jurisdictions":"Texas","roles":[{"name":"Attorney","kind":"attorney","person_id":"${ids.att}"},{"name":"Paralegal","kind":"staff"},{"name":"Outsourced freelancer","kind":"freelancer"}],"systems":{"practice_management":["Clio"]}}}')
      on conflict (org_id) do update set body = excluded.body; select 1`);
    const mk = async (title, req) => {
      const id = (await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by, doc_type, lifecycle) values ('${ids.org}', '${title}', 'approved', 1, 1, 100, '${req}', '${ids.att}', 'sop', 'INT') returning id`))[0].id;
      await sql(`insert into playbook_versions (playbook_id, version, body, created_by) values ('${id}', 1, '${DOC(title)}', '${ids.att}'); select 1`);
      return id;
    };
    const pb = await mk("New client intake", "au-b1"), pb2 = await mk("Close a matter", "au-b2");

    // ---------- The hint card, the two boxes, the checked suggestions ----------
    s = await open(browser, ATT, `&tab=library&pb=${pb}`);
    t = await waitFor(s.page, "DELA can find steps in this playbook to automate or hand to a freelancer.");
    ok(t.includes("✦ Find what to automate or delegate") && t.includes("Dismiss"), "the hint card above an approved SOP, with the button and Dismiss");
    await label(s.page, "How often does this run?").selectOption("weekly");
    await label(s.page, "How long does it take each time?").fill("60");
    await click(s.page, "✦ Find what to automate or delegate");
    t = await waitFor(s.page, "DELA found 2 to look at.", 10000);
    ok(t.includes("Collect and log intake forms") && t.includes("Steps 1 to 2") && t.includes("Time saved: about 2 hours a month"), "a delegate suggestion with its steps and time saved");
    ok(t.includes("Tool: Clio. Already in your firm profile.") && !t.includes("All of it"), "a tool from the firm's systems; the whole document is never suggested");
    ok(t.includes("Logs each returned form.") && !(await dela(s.page).locator("#automate-card").innerText()).includes(".."), "Fix: one period at the end of each sentence");
    ok(t.includes("Add this tool to the steps") && t.includes("Hire a freelancer to set it up"), "the Automate path's actions");

    // ---------- The delegate path on one screen ----------
    await click(s.page, "Delegate these steps");
    t = await waitFor(s.page, "Delegate: Collect and log intake forms");
    ok(t.includes("1. Confirm which steps to delegate") && t.includes("(Attorney decides: stays with the attorney)") && t.includes("5. The gig"), "the numbered steps, with the attorney's step locked");
    ok(await label(s.page, "Step 4").isDisabled(), "an attorney decision cannot be ticked");
    await click(s.page, "Draft the SOP for these steps");
    t = await waitFor(s.page, "DELA drafted the SOP for just these steps.");
    ok(t.includes("SOP: ") && t.includes("stays Accountable (A) on every step") && t.includes("DELA's self-check passes."), "the SOP for just these steps, checked");
    await label(s.page, "Turnaround (business days)").fill("3");
    await click(s.page, "Save the KPIs");
    await waitFor(s.page, "KPIs saved. The SOP now uses them.");
    const sopBody = (await sql(`select v.body from playbooks p join playbook_versions v on v.playbook_id = p.id and v.version = p.current_version where p.source_ref = '${pb}' order by p.created_at desc limit 1`))[0].body;
    ok(sopBody.timing.includes("3 business days") && sopBody.steps.length === 2, "the KPIs are in the SOP");
    await click(s.page, "Approve the SOP");
    t = await waitFor(s.page, "The SOP is approved.");
    // Fix (ChatGPT 4d test 2026-11-06): a small job reads as the smallest gig budget, never "$250 to $250"
    ok(t.includes("Suggested budget: $250, the smallest gig budget on Lawfecta.") && !t.includes("$250 to $250") && t.includes("You set the final amount.") && t.includes("You also pay Lawfecta's platform fee"), "the suggested budget and the fee before posting");
    await label(s.page, "Budget from ($)").fill("300");
    await label(s.page, "Budget to ($)").fill("500");
    await click(s.page, "Draft the gig");
    t = await waitFor(s.page, "Public version", 10000);
    ok(t.includes("Post the gig"), "the gig page opens to check and post");
    await s.ctx.close();

    // ---------- Back on the document: what was delegated; Dismiss on another ----------
    s = await open(browser, ATT, `&tab=library&pb=${pb}`);
    t = await waitFor(s.page, "Delegated: Steps 1 to 2");
    ok(t.includes("Gig drafted, not posted yet."), "the parent shows what was delegated, and that its gig is not posted");
    await s.page.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=library&pb=${pb2}`);
    await waitFor(s.page, "DELA can find steps in this playbook");
    await dela(s.page).locator("#automate-card").getByText("Dismiss", { exact: true }).click();
    await s.page.waitForTimeout(500);
    ok(!(await text(s.page)).includes("DELA can find steps in this playbook"), "Dismiss hides the hint");
    await s.page.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=library&pb=${pb2}`);
    await waitFor(s.page, "Close a matter");
    await s.page.waitForTimeout(800);
    ok(!(await text(s.page)).includes("DELA can find steps in this playbook"), "and it stays hidden");

    // ---------- Get set up ----------
    await s.page.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=home`);
    t = await waitFor(s.page, "Get set up: 4 of 6 done");
    await click(s.page, "Continue setting up");
    t = await waitFor(s.page, "Six steps to your first gig.");
    ok(t.includes("Your profile and verification") && t.includes("Teach DELA about your firm") && t.includes("Invite freelancers") && !/\btrain/i.test(t), "the six steps, and never the word train");
    await dela(s.page).locator("#setup-invite").getByRole("button", { name: "Skip for now" }).click();
    t = await waitFor(s.page, "Skipped for now. It stays here for later.");
    ok(t.includes("5 of 6 done") && (await dela(s.page).locator("#setup-invite").innerText()).includes("Skipped"), "Skip for now counts the step as handled");
    await dela(s.page).locator("#setup-firm").getByRole("button", { name: "Open" }).click();
    t = await waitFor(s.page, "Your firm profile for documents");
    ok(true, "a step opens in place");
    await s.ctx.close();
    console.log(passed + " browser checks passed");
  } catch (e) {
    if (s && s.page) await s.page.screenshot({ path: path.join(SHOTS, "automate-fail.png"), fullPage: true }).catch(() => {});
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

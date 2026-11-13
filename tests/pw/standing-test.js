// Browser test of step 7c part 2, standing arrangements: the attorney sets one up from Talent (documents, price, monthly cap,
// open jobs, end date, signature); the freelancer accepts once; one click hires again and charges the saved card; a hire past
// the open-jobs limit makes a gig draft instead; the freelancer declines a hire within 24 hours; the admin Recurring tab
// lists the arrangement and its spend.
//   node tests/pw/standing-test.js   (with tests/pw/server.ts running)
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
const ATT = 4400, FL = 4401, TEAM = 4402;

(async () => {
  const browser = await chromium.launch();
  let s, p, t;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'engagements', 'milestone_funding', 'profiles', 'talent_search', 'playbook_library', 'auto_repeat_hiring'); update settings set value = 'false' where key = 'verify.freelancer_linkedin'; select 1");
    await sql(`insert into people (bd_member_id, display_name, email) values (${ATT}, 'Sam Standing', '${ATT}@test.invalid'), (${FL}, 'Rita Repeat', '${FL}@test.invalid'), (${TEAM}, 'Olly Owner', '${TEAM}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = ${ATT}), 'attorney', 'att_pro', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = ${FL}), 'freelancer', 'fl_plus', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = ${TEAM}), 'attorney', 'att_free', 'staff_grant');
      insert into access_list (bd_member_id, channel) select x, 'access' from unnest(array[${ATT}, ${FL}, ${TEAM}]) x where not exists (select 1 from access_list where bd_member_id = x and channel = 'access' and revoked_at is null);
      insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = ${TEAM} and not exists (select 1 from staff_roles s where s.person_id = people.id and s.role = 'owner');
      insert into member_profiles (person_id, side, body, missing, score) select id, 'attorney', '{"firm_name":"Repeat Legal"}', '{}', 100 from people where bd_member_id = ${ATT} on conflict do nothing;
      insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) select id, 'l', 'TX', 'ST${ATT}', 'ST${ATT}', 'A', 'video', 'verified' from people where bd_member_id = ${ATT};
      select dela_profile_refresh((select id from people where bd_member_id = ${ATT}), 'attorney');
      insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"Rita","last_name":"Repeat","headline":"Intake paralegal","practice_areas":["Family law"]}', '{}', 100, now() from people where bd_member_id = ${FL} on conflict do nothing;
      update side_profiles set verification_state = 'verified', readiness_state = 'match_ready' where person_id = (select id from people where bd_member_id = ${FL}) and side = 'freelancer'; select 1`);
    const ids = (await sql(`select (select id from people where bd_member_id = ${ATT}) att, (select id from people where bd_member_id = ${FL}) fl, dela_side_org((select id from people where bd_member_id = ${ATT}), 'attorney') org`))[0];
    await sql(`insert into firm_profiles (org_id, body) values ('${ids.org}', '{"signatory_name":"Sam Standing","billing_address":"1 Main St, Austin TX","service_email":"sam@example.com"}') on conflict (org_id) do update set body = firm_profiles.body || excluded.body; select 1`);
    for (const [title, key] of [["Send the welcome packet", "sb1"], ["Run a conflict check", "sb2"]]) {
      const pb = (await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by, doc_type) values ('${ids.org}', '${title}', 'approved', 1, 1, 100, '${key}', '${ids.att}', 'sop') returning id`))[0].id;
      await sql(`insert into playbook_versions (playbook_id, version, body, created_by) values ('${pb}', 1, '{"title":"${title}","steps":[{"text":"Do it"}]}', '${ids.att}'); select 1`);
    }
    // An earlier paid job: the firm's saved card
    const g0 = (await sql(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, request_id) select '${ids.org}', '${ids.att}', id, 1, 'Earlier job', '{}', 30000, 30000, 'filled', 'sb-old' from playbooks where request_id = 'sb1' returning id`))[0].id;
    const p0 = (await sql(`insert into proposals (gig_id, freelancer_id, status, price_cents, included, sent_at) values ('${g0}', '${ids.fl}', 'selected', 30000, 'x', now()) returning id`))[0].id;
    await sql(`insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status, provider_customer, provider_payment_method) values ('${g0}', '${p0}', '${ids.org}', '${ids.att}', '${ids.fl}', 30000, 'completed', 'cus_saved', 'pm_saved'); select 1`);

    // ---------- The attorney: set one up from Talent ----------
    // Step 18: offered from Projects, to freelancers the attorney completed a gig with (the earlier job above)
    s = await open(browser, "DELA-App", ATT, "&tab=projects");
    p = s.page;
    // Fix (AI review 0.9.1, payments 2): form limits come from the server. The test changes the open-jobs limit on its
    // way to the screen and the box follows it.
    await p.route(/\/(bootstrap|me)(\?|$)/, async (route) => {
      const r = await route.fetch(); const j = await r.json();
      if (j && j.me && j.me.limits) j.me.limits.standing_max_open = 7;
      await route.fulfill({ response: r, json: j });
    });
    await p.reload();
    await waitFor(p, "Freelancers you have completed a gig with", 15000);
    ok(await label(p, "Freelancer for a new standing arrangement").locator("option", { hasText: "Rita Repeat" }).count() === 1, "the freelancer the attorney completed a gig with is offered");
    await dela(p).locator("#standing-new").getByRole("button", { name: "Set up a standing arrangement" }).click();
    const dlg = dela(p).getByRole("dialog");
    await dlg.waitFor();
    ok(await label(p, "Most jobs open at once").getAttribute("max") === "7", "the most-open-jobs box takes its limit from the server");
    t = await dlg.innerText();
    ok(t.includes("Send the welcome packet (version 1)") && t.includes("Run a conflict check (version 1)"), "the approved SOPs to cover, each at its version");
    await dlg.getByText("Send the welcome packet (version 1)").click();
    await dlg.getByText("Run a conflict check (version 1)").click();
    await label(p, "Price per job ($)").fill("300");
    await click(p, "Sign and send");
    await waitFor(p, "Set a monthly spend cap. DELA does not save an arrangement without one.");
    ok(true, "a spend cap is required");
    await label(p, "Monthly spend cap ($)").fill("700");
    await label(p, "Most jobs open at once").fill("2");
    await label(p, "Standing arrangement: type your full name").fill("Sam Standing");
    await label(p, "Standing arrangement: I agree").check();
    // Fix (AI review 0.9.0, payments 1): a double click on Sign and send makes one arrangement
    await dela(p).getByRole("button", { name: "Sign and send", exact: true }).first().dblclick();
    // Step 18: sent from Projects, the page redraws at once; the confirmation must still be readable and the new
    // arrangement must be in the list without a reload (the confirmation was wiped by the redraw before the fix in ec29906)
    t = await waitFor(p, "Sent to Rita Repeat to accept.");
    await waitFor(p, "Standing arrangements (1)");
    await p.waitForTimeout(800);
    ok((await sql("select count(*)::int n from standing_arrangements"))[0].n === 1, "a double click on Sign and send makes one arrangement");
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=projects`);
    t = await waitFor(p, "Standing arrangements (1)", 10000);
    ok(t.includes("Waiting for the freelancer") && t.includes("$300 per job | $0 of $700 this month | 0 of 2 jobs open"), "Projects shows the arrangement and its limits");
    await s.ctx.close();

    // ---------- The freelancer accepts once ----------
    s = await open(browser, "DELA-App", FL, "&tab=work");
    p = s.page;
    t = await waitFor(p, "Standing arrangements (1)", 10000);
    await label(p, "Accept: type your full name").fill("Rita Repeat");
    await label(p, "Accept: I agree").check();
    await click(p, "Accept");
    await waitFor(p, "Accepted. The firm can now hire you again in one click.");
    // Fix (UI re-check 2026-11-08): an active standing arrangement is blue like an active engagement, not green
    await p.reload(); await waitFor(p, "Standing arrangements (1)", 10000);
    const sc = await dela(p).locator(".badge", { hasText: /^Active$/ }).last().getAttribute("class");
    ok(/\bR\b/.test(sc), "an active standing arrangement has the blue in-progress badge (" + sc + ")");
    await s.ctx.close();

    // ---------- One click: hire again; past the limit, a draft instead ----------
    s = await open(browser, "DELA-App", ATT, "&tab=projects");
    p = s.page;
    await waitFor(p, "Hire again from my standing arrangement", 10000);
    await click(p, "Hire again from my standing arrangement");
    t = await waitFor(p, "Hired and paid.", 10000);
    ok(t.includes("$400 of this month's cap is left."), "hired and paid with the saved card, with the cap left");
    await p.waitForTimeout(1500);
    t = await waitFor(p, "$400 left this month | 1 open-job place left", 10000);
    ok(t.includes("The cap counts the job price. Lawfecta's platform fee is added to each charge."), "next to Hire again: what is left and the cap rule (step 8b Part C, R08)");
    await label(p, "Document to hire for").selectOption({ label: "Run a conflict check" });
    await click(p, "Hire again from my standing arrangement");
    await waitFor(p, "$100 of this month's cap is left.", 10000);
    // Nothing left: the button is replaced by the reason and "Review limits" (the server still makes a draft, never a hire: standing_test.ts)
    t = await waitFor(p, "$100 left this month | 0 open-job places left", 10000);
    ok(t.includes("The most jobs open at once (2) are already open.") && await dela(p).getByRole("button", { name: "Hire again from my standing arrangement" }).count() === 0, "past the limits: the reason instead of the button");
    await click(p, "Review limits");
    ok(await label(p, "New monthly spend cap ($)").count() === 1, "Review limits opens the limits form");
    ok((await sql(`select count(*)::int c from standing_hires h join standing_arrangements a on a.id = h.arrangement_id where a.org_id = '${ids.org}'`))[0].c === 2, "two hires only");
    await s.ctx.close();

    // ---------- The freelancer declines one job within 24 hours ----------
    s = await open(browser, "DELA-App", FL, "&tab=work");
    p = s.page;
    await waitFor(p, "Decline this job", 10000);
    await dela(p).getByRole("button", { name: "Decline this job" }).first().click();
    await waitFor(p, "Declined. The firm is refunded in full.");
    ok((await sql(`select count(*)::int c from refunds r join standing_hires h on h.agreement_id = r.agreement_id where h.status = 'declined'`))[0].c >= 1, "the refund is queued");
    await s.ctx.close();

    // ---------- An ended arrangement moves to Past arrangements ----------
    await sql(`update standing_arrangements set status = 'ended' where org_id = '${ids.org}'; select 1`);
    s = await open(browser, "DELA-App", ATT, "&tab=projects");
    p = s.page;
    t = await waitFor(p, "Past arrangements (1)", 10000);
    ok(t.includes("Standing arrangements (0)") && !(await dela(p).locator("#standing-past").evaluate((d) => d.open)), "an ended arrangement is under Past arrangements, folded");
    await s.ctx.close();

    // ---------- The Lawfecta Team: the Recurring tab lists it ----------
    s = await open(browser, "DELA-Admin", TEAM, "");
    p = s.page;
    await dela(p).getByRole("tab", { name: "Recurring", exact: true }).click();
    t = await waitFor(p, "hires Member 4401", 10000);
    ok(t.includes("$300 per job") && t.includes("declined 1"), "the admin list shows the arrangement, spend and the declined job");
    await s.ctx.close();
    console.log(passed + " browser checks passed");
  } catch (e) {
    if (s && s.page) await s.page.screenshot({ path: path.join(SHOTS, "standing-fail.png"), fullPage: true }).catch(() => {});
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

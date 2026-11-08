// Browser test of step 7c part 1, monthly recurring engagements: the One-off or Monthly choice, the Monthly terms card (no
// "unlimited"), the client's permission to charge each month, paying month 1 on Stripe's page, the Monthly engagement
// card, "Run the renewal now" on the test site, a declined renewal with "Pay now", a change for next month, cancelling
// and keeping it with the other side's approval, Make this monthly, and the admin Recurring tab with the emergency stop.
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
const ATT = 4100, FL = 4101;

(async () => {
  const browser = await chromium.launch();
  let s, p, t;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'engagements', 'milestone_funding', 'profiles', 'recurring_engagements', 'playbook_library'); update settings set value = 'false' where key in ('verify.freelancer_linkedin', 'recurring.renewals_stopped'); select 1");
    await sql(`insert into people (bd_member_id, display_name, email) values (${ATT}, 'Mona Monthly', '${ATT}@test.invalid'), (${FL}, 'Frank Monthly', '${FL}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = ${ATT}), 'attorney', 'att_pro', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = ${FL}), 'freelancer', 'fl_plus', 'staff_grant');
      insert into access_list (bd_member_id, channel) select x, 'access' from unnest(array[${ATT}, ${FL}]) x where not exists (select 1 from access_list where bd_member_id = x and channel = 'access' and revoked_at is null);
      insert into member_profiles (person_id, side, body, missing, score) select id, 'attorney', '{"firm_name":"Monthly Legal"}', '{}', 100 from people where bd_member_id = ${ATT} on conflict do nothing;
      insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) select id, 'l', 'TX', 'MO${ATT}', 'MO${ATT}', 'A', 'video', 'verified' from people where bd_member_id = ${ATT};
      select dela_profile_refresh((select id from people where bd_member_id = ${ATT}), 'attorney');
      insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"Frank","last_name":"Monthly"}', '{}', 100, now() from people where bd_member_id = ${FL} on conflict do nothing;
      insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = ${ATT} and not exists (select 1 from staff_roles s where s.person_id = people.id and s.role = 'owner'); select 1`);
    const ids = (await sql(`select (select id from people where bd_member_id = ${ATT}) att, (select id from people where bd_member_id = ${FL}) fl, dela_side_org((select id from people where bd_member_id = ${ATT}), 'attorney') org`))[0];
    await sql(`insert into firm_profiles (org_id, body) values ('${ids.org}', '{"signatory_name":"Mona Monthly","billing_address":"1 Main St, Austin TX","service_email":"mona@example.com"}') on conflict (org_id) do update set body = firm_profiles.body || excluded.body; select 1`);
    const pb = (await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ('${ids.org}', 'Monthly intake SOP', 'approved', 1, 1, 100, 'mob1', '${ids.att}') returning id`))[0].id;
    await sql(`insert into playbook_versions (playbook_id, version, body, created_by) values ('${pb}', 1, '{"title":"Monthly intake SOP","steps":[{"text":"Call the new client"}]}', '${ids.att}'); select 1`);
    const gig = (await sql(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id, kind)
      values ('${ids.org}', '${ids.att}', '${pb}', 1, 'Monthly intake help', '{"task":"Intake calls every month"}', 80000, 120000, 'filled', now(), now() + interval '14 days', 'mob1', 'monthly') returning id`))[0].id;
    const prop = (await sql(`insert into proposals (gig_id, freelancer_id, status, price_cents, included, schedule, sent_at) values ('${gig}', '${ids.fl}', 'selected', 100000, 'Intake calls', 'Monthly', now()) returning id`))[0].id;
    const ag = (await sql(`insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents) values ('${gig}', '${prop}', '${ids.org}', '${ids.att}', '${ids.fl}', 100000) returning id`))[0].id;

    // ---------- The attorney: One-off or Monthly, the Monthly terms ----------
    s = await open(browser, "DELA-App", ATT, "&tab=projects");
    p = s.page;
    t = await waitFor(p, "Post a new gig");
    ok(t.includes("One-off") && t.includes("Monthly: the same work every month for a flat monthly price"), "the new gig form starts with One-off or Monthly");
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=projects&gig=${gig}&view=agreement`);
    t = await waitFor(p, "Monthly terms");
    ok(t.includes("Monthly price: $1,000") && t.includes("Nothing is unlimited") && t.includes("Weekly units"), "the Monthly terms card, with Weekly units");
    ok(await dela(p).getByLabel("Weekly units: the month is split into weekly units, each checked, accepted and paid like a milestone").isChecked().catch(async () => (await dela(p).locator("#monthly-terms input[type=radio]").first().isChecked())), "Weekly units is chosen by default");
    await label(p, "Task").fill("Unlimited intake calls");
    await label(p, "Included each month").fill("20");
    await click(p, "Save the monthly terms");
    await waitFor(p, "\"Unlimited\" is not allowed.");
    ok((await dela(p).locator("#monthly-terms .card-status").innerText()).includes("not allowed"), "\"unlimited\" is refused, and the answer stays on the card");
    await label(p, "Task").fill("Intake calls and conflict checks");
    await label(p, "Turnaround").fill("1 business day");
    await click(p, "Save the monthly terms");
    t = await waitFor(p, "Saved as version 2. Both of you sign the new version.");
    await s.ctx.close();
    s = await open(browser, "DELA-App", FL, `&tab=work&gig=${gig}&view=agreement`);
    p = s.page;
    t = await waitFor(p, "Agreement, version 2");
    ok(t.includes("Monthly price: $1,000") && t.includes("The freelancer receives each month:"), "the freelancer reads the monthly agreement and what they receive each month");
    await sign(p, "Frank Monthly", 2);
    await waitFor(p, "You signed version 2");
    await s.ctx.close();
    s = await open(browser, "DELA-App", ATT, `&tab=projects&gig=${gig}&view=agreement`);
    p = s.page;
    t = await waitFor(p, "Charge this payment method each month on my billing day until I or the freelancer cancel.");
    ok(true, "the client's permission to charge each month, at signing");
    await sign(p, "Mona Monthly", 2);
    await p.waitForTimeout(400);
    ok(!(await text(p)).includes("Pay month 1"), "without the permission, it does not sign");
    await label(p, "Charge this payment method each month").check();
    await click(p, "Sign version 2");
    t = await waitFor(p, "Pay month 1 ($1,000) and the platform fee ($50)");
    ok(t.includes("The day it is paid becomes your billing day") && t.includes("A bank payment takes about 4 business days"), "pay month 1, with the billing day and bank timing explained");
    await click(p, "Pay month 1");
    await p.waitForURL(/\/test\/stripe\/checkout\//, { timeout: 8000 });
    ok((await p.textContent("h1")).includes("105000 cents: paid"), "Stripe's page charges month 1 and the fee together");
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=projects&gig=${gig}&view=agreement`);
    t = await waitFor(p, "Monthly engagement");
    ok(t.includes("Month 1:") && t.includes("Units accepted") && t.includes("0 of 4") && t.includes("Intake calls and conflict checks: weekly, up to 20 included each month, each within 1 business day"), "the Monthly engagement card: this month, units and what is included");
    const endsOn = (await sql(`select to_char(ends_on + 1, 'FMMon FMDD') d from monthly_periods where agreement_id = '${ag}' and n = 1`))[0].d;
    ok(/Next billing\s*\n?\s*\S/.test(t) && t.includes(endsOn) && !/Next billing\s*-/.test(t), "Next billing shows the day after the paid month, before month 2 is drafted (" + endsOn + ")");
    ok(!t.includes("Cancel the engagement"), "a monthly engagement shows only the monthly cancel, not the one-off Cancel the engagement");

    // ---------- Renewals on the test site ----------
    await click(p, "Run the renewal now (test site)");
    t = await waitFor(p, "Renewal run: the month was charged.");
    ok((await sql(`select count(*)::int c from monthly_periods where agreement_id = '${ag}' and status = 'paid'`))[0].c === 2, "month 2 was charged with the saved card");
    await fetch(BASE + "/test/stripe/decline-next");
    await click(p, "Run the renewal now (test site)");
    t = await waitFor(p, "Renewal run: the charge failed.");
    t = await waitFor(p, "did not go through, so new work is paused.");
    ok(t.includes("DELA tries again on") && t.includes("if it stays unpaid"), "a declined renewal: paused, the retry date and the end date");
    await click(p, "Pay now");
    await p.waitForURL(/\/test\/stripe\/checkout\//, { timeout: 8000 });
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=projects&gig=${gig}&view=agreement`);
    t = await waitFor(p, "Month 3:");
    ok(!t.includes("did not go through"), "Pay now pays the month and work opens");

    // ---------- A change for next month; cancel and keep it ----------
    await click(p, "Request a change");
    await label(p, "New monthly price ($)").fill("1200");
    await label(p, "Why (optional)").fill("Two more packets a week from now on.");
    await click(p, "Send the change");
    await waitFor(p, "Sent. If the other person approves at least 1 day before billing, it starts next month.");
    ok(t.includes("Cancellation takes effect at the end of the paid month. Ending sooner needs both of you to agree.") && t.includes("You pay $1,050 each month, including the $50 platform fee.") && t.includes("unused work does not carry over"), "the monthly price with the fee, the cancel rule and no rollover, on the page (UX review M01, M02)");
    await click(p, "Review cancellation");
    await click(p, "Yes, cancel at month end");
    t = await waitFor(p, "Canceled. It ends on");
    ok(t.includes("Nothing more is charged."), "cancel: effective at the end of the paid month");
    await click(p, "Ask to keep it going");
    await waitFor(p, "Asked the other person to keep the engagement going.");
    await s.ctx.close();
    s = await open(browser, "DELA-App", FL, `&tab=work&gig=${gig}&view=agreement`);
    p = s.page;
    t = await waitFor(p, "A change to approve");
    // Fix (step 8b, retest R10): a change shows current and proposed side by side, and when it would start
    ok(t.includes("Now") && t.includes("Proposed") && /\$1,000[\s\S]*\$1,200/.test(t) && /From the (next month|month that starts)/.test(t), "the freelancer sees the change next to what is in force now");
    // AI review 0.10.0 (payments 4): the total each month with the platform fee, now and proposed
    ok(t.includes("Total each month, with the platform fee") && /\$1,0\d0[\s\S]*\$1,2\d0/.test(t), "the change shows the total with the fee, now and proposed");
    // Step 8b Part C (retest R10): a note that disagrees with the table is flagged, and DELA does not pick one
    ok(t.includes("Check this before approving: the note says \"Two more packets a week\", but no monthly quantity changes in the table.") && t.includes("DELA does not decide which one is meant."), "a contradictory change note is flagged for review");
    await click(p, "Approve the change");
    await waitFor(p, "Approved. It starts next month");
    await click(p, "Approve keeping it");
    await waitFor(p, "The engagement continues.");
    ok((await sql(`select cancel_effective from monthly_terms where agreement_id = '${ag}'`))[0].cancel_effective === null, "undoing the cancellation needed the other side");
    await s.ctx.close();

    // ---------- Make this monthly ----------
    const g2 = (await sql(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, request_id) values ('${ids.org}', '${ids.att}', '${pb}', 1, 'One-off intake job', '{"task":"Intake once"}', 30000, 90000, 'filled', 'mob2') returning id`))[0].id;
    const p2 = (await sql(`insert into proposals (gig_id, freelancer_id, status, price_cents, included, sent_at) values ('${g2}', '${ids.fl}', 'selected', 50000, 'Intake calls', now()) returning id`))[0].id;
    const a2 = (await sql(`insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status, signed_at, completed_at, version) values ('${g2}', '${p2}', '${ids.org}', '${ids.att}', '${ids.fl}', 50000, 'completed', now(), now(), 1) returning id`))[0].id;
    await sql(`insert into agreement_versions (agreement_id, version, body, body_hash, proposed_by) values ('${a2}', 1, '{"scope":{"task":"Intake once","included":"Intake calls"},"milestones":[]}', 'h', '${ids.att}'); select 1`);
    s = await open(browser, "DELA-App", ATT, `&tab=projects&gig=${g2}&view=agreement`);
    p = s.page;
    t = await waitFor(p, "Keep this going every month");
    await click(p, "Make this monthly");
    t = await waitFor(p, "Monthly terms", 10000);
    ok(t.includes("Monthly: One-off intake job") || t.includes("Monthly price: $500"), "Make this monthly drafts a monthly agreement with the same freelancer");
    await s.ctx.close();

    // ---------- The Lawfecta Team: the Recurring tab and the emergency stop ----------
    s = await open(browser, "DELA-Admin", ATT, "");
    p = s.page;
    await dela(p).getByRole("tab", { name: "Recurring", exact: true }).click();
    t = await waitFor(p, "Monthly intake help");
    ok(t.includes("Renewal charges are running") && t.includes("months paid: 3"), "the Recurring tab lists the engagement and its months");
    await click(p, "Emergency stop: no renewal charges");
    t = await waitFor(p, "Renewal charges are stopped");
    ok((await sql("select value from settings where key = 'recurring.renewals_stopped'"))[0].value === true, "the emergency stop is saved");
    await click(p, "Start renewal charges again");
    await waitFor(p, "Renewal charges are running");
    await s.ctx.close();
    console.log(passed + " browser checks passed");
  } catch (e) {
    if (s && s.page) await s.page.screenshot({ path: path.join(SHOTS, "monthly-fail.png"), fullPage: true }).catch(() => {});
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

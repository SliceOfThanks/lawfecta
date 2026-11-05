// Browser test of agencies, part 1 (docs/briefs/step-7d-agencies.md): the Agency tab (business details, team, seats,
// invites), a team member accepting, an agency proposal with "Who will do this work", the attorney seeing the agency and
// its people with "View profile", and "Who's working on this" after the hire.
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
async function open(browser, uid, query, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1200, height: 900 } });
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
async function makeFreelancer(bd, plan, first, last) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, '${first} ${last}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side((select id from people where bd_member_id = ${bd}), 'freelancer', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and channel = 'access' and revoked_at is null);
    insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"${first}","last_name":"${last}","practice_areas":["Family law"],"headline":"${first} headline","firm_name":"${bd === 3800 ? "Roe Support Group" : ""}"}', '{}', 100, now() from people where bd_member_id = ${bd} on conflict do nothing;
    select dela_profile_refresh((select id from people where bd_member_id = ${bd}), 'freelancer'); select 1`);
}
const OWNER = 3800, MGR = 3801, ATT = 3802, PIA = 3803, FRED = 3804;

(async () => {
  const browser = await chromium.launch();
  let s;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('agency_team', 'agency_bench', 'flex_gigs', 'engagements', 'reviews', 'profiles', 'gig_chat'); update settings set value = 'false' where key = 'verify.freelancer_linkedin'; select 1");
    await makeFreelancer(OWNER, "fl_business", "Olive", "Owner");
    await makeFreelancer(MGR, "fl_plus", "Max", "Manager");
    await makeFreelancer(PIA, "fl_plus", "Pia", "Plus");
    await makeFreelancer(FRED, "fl_free", "Fred", "Free");
    await sql(`insert into people (bd_member_id, display_name, email) values (${ATT}, 'Ann Attorney', '${ATT}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = ${ATT}), 'attorney', 'att_pro', 'staff_grant');
      insert into access_list (bd_member_id, channel) select ${ATT}, 'access' where not exists (select 1 from access_list where bd_member_id = ${ATT} and channel = 'access' and revoked_at is null);
      insert into member_profiles (person_id, side, body, missing, score) select id, 'attorney', '{"firm_name":"Example Legal"}', '{}', 100 from people where bd_member_id = ${ATT} on conflict do nothing;
      insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) select id, 'l', 'TX', 'AG${ATT}', 'AG${ATT}', 'A', 'video', 'verified' from people where bd_member_id = ${ATT};
      select dela_profile_refresh((select id from people where bd_member_id = ${ATT}), 'attorney'); select 1`);
    const ids = (await sql(`select (select id from people where bd_member_id = ${ATT}) att, dela_side_org((select id from people where bd_member_id = ${ATT}), 'attorney') org`))[0];
    const pb = (await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ('${ids.org}', 'Intake SOP', 'approved', 1, 1, 100, 'agb1', '${ids.att}') returning id`))[0].id;
    await sql(`insert into playbook_versions (playbook_id, version, body, created_by) values ('${pb}', 1, '{"title":"Intake SOP","steps":[{"text":"a"}]}', '${ids.att}'); select 1`);
    const gig = (await sql(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id, visibility)
      values ('${ids.org}', '${ids.att}', '${pb}', 1, 'Agency intake job', '{"task":"Intake"}', 30000, 90000, 'open', now(), now() + interval '14 days', 'agb1', 'public') returning id`))[0].id;

    // ---------- The owner: the Agency tab ----------
    s = await open(browser, OWNER, "&tab=agency");
    let t = await waitFor(s.page, "Business details");
    ok(t.includes("Roe Support Group") && t.includes("you are the owner"), "a Business freelancer's Agency tab: their agency, as owner");
    ok(t.includes("1 of 3 seats used, the owner included"), "3 seats, owner included");
    await label(s.page, "State of registration").fill("TX");
    await click(s.page, "Save business details");
    await waitFor(s.page, "Waiting for the Lawfecta Team's check.");
    await label(s.page, "Their email on Lawfecta").fill("nobody@test.invalid");
    await click(s.page, "Invite to the team");
    await waitFor(s.page, "There is no Lawfecta freelancer with that email.");
    await label(s.page, "Their email on Lawfecta").fill(MGR + "@test.invalid");
    await label(s.page, "Role").selectOption("manager");
    await click(s.page, "Invite to the team");
    t = await waitFor(s.page, "invited as manager");
    ok(t.includes("plus 1 invitation waiting"), "the invitation holds a seat");
    await s.ctx.close();

    // ---------- The manager accepts and sends the agency's proposal ----------
    s = await open(browser, MGR, "&tab=agency");
    await waitFor(s.page, "Invitation from Roe Support Group");
    await click(s.page, "Accept");
    await waitFor(s.page, "Agencies you work with");
    await s.page.goto(`${BASE}/page/DELA-App?uid=${MGR}&plan=&tab=work&gig=${gig}`);
    t = await waitFor(s.page, "Who will do this work (required)");
    ok(t.includes("Send as"), "the proposal form offers the agency");
    await label(s.page, "Your total price ($)").fill("600");
    await label(s.page, "What your price includes").fill("The intake packet");
    await label(s.page, "Schedule").fill("5 days");
    await dela(s.page).getByRole("button", { name: /^Send proposal/ }).click();
    await waitFor(s.page, "Choose at least one person");
    await label(s.page, "Name Olive Owner on this proposal").check();
    await label(s.page, "Role on this job for Olive Owner").fill("Lead paralegal");
    await dela(s.page).getByRole("button", { name: /^Send proposal/ }).click();
    await waitFor(s.page, "sent for your agency");
    const prop = (await sql(`select p.id, p.agency_org is not null ag from proposals p join gigs g on g.id = p.gig_id where g.id = '${gig}'`))[0];
    ok(prop.ag, "sent as the agency");
    await s.ctx.close();

    // ---------- The attorney sees the agency and its people ----------
    s = await open(browser, ATT, `&tab=projects&gig=${gig}`);
    await dela(s.page).getByRole("tab", { name: /^Proposals/ }).click();
    t = await waitFor(s.page, "Who will do this work:");
    ok(t.includes("Agency") && t.includes("Roe Support Group") && t.includes("Olive Owner") && t.includes("Lead paralegal"), "the attorney sees the agency, the person and their role");
    await click(s.page, "View profile");
    t = await waitFor(s.page, "Olive headline");
    ok(t.includes("Works with: Roe Support Group"), "the profile shows the agency");
    await dela(s.page).getByRole("button", { name: "Close", exact: true }).last().click();
    await click(s.page, "Choose");
    await waitFor(s.page, "Chosen.");
    await s.page.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=projects&gig=${gig}&view=agreement`);
    t = await waitFor(s.page, "Who's working on this");
    ok(t.includes("You hired Roe Support Group") && t.includes("Olive Owner") && t.includes("nothing is needed from you"), "after the hire: who's working on this");
    await s.page.screenshot({ path: path.join(SHOTS, "agency-attorney.png"), fullPage: true });
    await s.ctx.close();

    // ---------- The owner changes who works on it ----------
    s = await open(browser, OWNER, `&tab=work&gig=${gig}&view=agreement`);
    t = await waitFor(s.page, "Who's working on this");
    ok(t.includes("Max Manager") && t.includes("Sent the proposal"), "the sender is on the job");
    await dela(s.page).locator("#people-card .row", { hasText: "Max Manager" }).getByRole("button", { name: "Take off this job" }).click();
    await waitFor(s.page, "Max Manager is off this job. The attorney was told.");
    await label(s.page, "Team member to add").selectOption({ label: "Max Manager" });
    await label(s.page, "Their role on the job").fill("Review");
    await click(s.page, "Add to this job");
    await waitFor(s.page, "Added. The attorney was told.");
    ok((await sql(`select count(*)::int n from notifications n join people p on p.id = n.person_id where p.bd_member_id = ${ATT} and n.title like 'A change in who is working on%'`))[0].n === 2, "the attorney gets an information-only notice");
    await s.page.setViewportSize({ width: 390, height: 844 });
    await s.page.goto(`${BASE}/page/DELA-App?uid=${OWNER}&plan=&tab=agency`);
    await waitFor(s.page, "The agency's jobs");
    const wide = await s.page.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; return [...r.querySelectorAll(".dela *")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).length; });
    ok(wide === 0, "phone width: the Agency tab fits (" + wide + ")");
    await s.ctx.close();

    // ---------- The bench: the agency invites with a split and signs; the freelancer proposes another; the agency signs ----------
    s = await open(browser, OWNER, `&tab=agency`);
    t = await waitFor(s.page, "Invite to the bench");
    ok(t.includes("Nobody on your bench yet.") && t.includes("The attorney never sees the split."), "the Bench card");
    await label(s.page, "Bench freelancer's email on Lawfecta").fill(`${PIA}@test.invalid`);
    await label(s.page, "Agency share (%)").fill("60");
    await label(s.page, "Your full name, to sign").last().fill("Olive Owner");
    await label(s.page, "I have read the bench agreement and I sign it for the agency.").check();
    await click(s.page, "Invite to the bench");
    await waitFor(s.page, "The agency's share must be between 5% and 50% of the fee.");
    await label(s.page, "Agency share (%)").fill("30");
    await click(s.page, "Invite to the bench");
    t = await waitFor(s.page, "waiting for them to sign 30% to the agency / 70% to the freelancer");
    ok(t.includes("Pia Plus") && t.includes("Invited"), "the invitation is on the bench list");
    await label(s.page, "Bench freelancer's email on Lawfecta").fill(`${FRED}@test.invalid`);
    await label(s.page, "Your full name, to sign").last().fill("Olive Owner");
    await label(s.page, "I have read the bench agreement and I sign it for the agency.").check();
    await click(s.page, "Invite to the bench");
    t = await waitFor(s.page, "Fred Free");
    ok(t.includes("Plus plan or higher required to join a bench"), "a Free freelancer's line says Plus is needed");
    await s.ctx.close();
    s = await open(browser, FRED, `&tab=agency`);
    t = await waitFor(s.page, "Bench invitation from Roe Support Group");
    ok(t.includes("Plus plan or higher required to join a bench") && await dela(s.page).getByRole("button", { name: "Sign and join", exact: true }).count() === 0, "Fred must upgrade before signing");
    await s.ctx.close();
    s = await open(browser, PIA, `&tab=agency`);
    t = await waitFor(s.page, "Bench invitation from Roe Support Group");
    ok(t.includes("Proposed split: 30% to the agency / 70% to you"), "Pia sees the proposed split");
    await dela(s.page).getByText("Read the bench agreement").first().click();
    t = await text(s.page);
    ok(t.includes("No poaching") && t.includes("Confidentiality"), "the bench agreement's terms");
    await label(s.page, "Agency share you propose (%)").fill("20");
    await label(s.page, "Your full name, to sign").fill("Pia Plus");
    await label(s.page, "I have read the bench agreement and I sign it electronically.").check();
    await click(s.page, "Propose this split");
    t = await waitFor(s.page, "You proposed: 20% to the agency / 80% to you");
    ok(t.includes("Waiting for the agency to sign."), "Pia's split waits for the agency");
    await s.ctx.close();
    s = await open(browser, OWNER, `&tab=agency`);
    t = await waitFor(s.page, "they proposed 20% to the agency / 80% to the freelancer");
    await label(s.page, "Your full name, to sign").last().fill("Olive Owner");
    await label(s.page, "I have read the bench agreement and I sign it for the agency.").check();
    await click(s.page, "Sign their split");
    t = await waitFor(s.page, "On the bench | split 20% to the agency / 80% to the freelancer");
    ok((await sql(`select count(*)::int n from agency_bench_signatures s join agency_bench b on b.id = s.bench_id join people p on p.id = b.freelancer_person where p.bd_member_id = ${PIA} and s.version = 2`))[0].n === 2, "both signed version 2");
    await s.ctx.close();
    s = await open(browser, PIA, `&tab=agency`);
    t = await waitFor(s.page, "On Roe Support Group's bench");
    ok(t.includes("Your split: 20% to the agency / 80% to you") && t.includes("pay no fee"), "Pia is on the bench with her split");
    await s.ctx.close();

    // ---------- The Lawfecta Team: the business check and a seat limit ----------
    await sql("insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = 1 and not exists (select 1 from staff_roles s where s.person_id = people.id)");
    s = await open(browser, 1, "");
    await s.page.goto(`${BASE}/page/DELA-Admin?uid=1&plan=`);
    await text(s.page);
    await dela(s.page).getByRole("tab", { name: "Agencies", exact: true }).click();
    t = await waitFor(s.page, "Not checked yet");
    ok(t.includes("Roe Support Group") && t.includes("Seats: "), "the team sees the agency and its seats");
    await click(s.page, "Ask for a change");
    await waitFor(s.page, "Write a note saying what to change.");
    await click(s.page, "Business details are right");
    await waitFor(s.page, "Checked. The owner was told.");
    ok((await sql(`select business_checked_at is not null c from organizations where kind = 'agency' limit 1`))[0].c === true, "the business check is saved");
    await label(s.page, "Seat limit for Roe Support Group").fill("5");
    await click(s.page, "Save seat limit");
    await waitFor(s.page, "Seat limit set to 5");
    ok((await sql(`select seat_limit_override n from organizations where kind = 'agency' limit 1`))[0].n === 5, "the team raised this agency's seats by hand");
    t = await waitFor(s.page, "Agency benches and splits");
    t = await waitFor(s.page, "split 20% agency / 80% freelancer (version 2)");
    ok(t.includes("Pia Plus"), "the team sees every split");
    await s.ctx.close();
    console.log(passed + " browser checks passed");
  } catch (e) {
    if (s && s.page) await s.page.screenshot({ path: path.join(SHOTS, "agency-fail.png"), fullPage: true }).catch(() => {});
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

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
    // The role is read when the proposal is sent, even when it was put in without typing (autofill, an agent; ChatGPT agency test 2026-11-05)
    await dela(s.page).getByLabel("Role on this job for Olive Owner", { exact: true }).first().evaluate((el) => { el.value = "Lead paralegal"; });
    await dela(s.page).getByRole("button", { name: /^Send proposal/ }).click();
    await waitFor(s.page, "sent for your agency");
    const prop = (await sql(`select p.id, p.agency_org is not null ag from proposals p join gigs g on g.id = p.gig_id where g.id = '${gig}'`))[0];
    ok(prop.ag, "sent as the agency");
    await s.ctx.close();

    // ---------- The attorney sees the agency and its people ----------
    // Fix (ChatGPT subcontracting test 2026-11-06): a link with view=proposals opens the Proposals view, not Details
    s = await open(browser, ATT, `&tab=projects&gig=${gig}&view=proposals`);
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
    // The answer stays on the card after the passing message is gone (ChatGPT bench test 2026-11-05)
    await s.page.waitForTimeout(4500);
    ok((await dela(s.page).locator("#agency-bench .card-status").innerText().catch(() => "")).includes("The agency's share must be between 5% and 50%"), "a refusal stays on the Bench card");
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

    // ---------- A milestone assigned to Pia at a different split for this job; she accepts; the attorney sees no split ----------
    const agr = (await sql(`select a.id from agreements a where a.gig_id = '${gig}'`))[0].id;
    await sql(`update agreements set status = 'active', signed_at = now() where id = '${agr}';
      insert into milestones (agreement_id, seq, title, amount_cents, freelancer_fee_cents, from_version, status) values ('${agr}', 1, 'Draft', 30000, 1500, 1, 'pending') on conflict do nothing; select 1`);
    s = await open(browser, OWNER, `&tab=work&gig=${gig}&view=agreement`);
    t = await waitFor(s.page, "Bench assignments");
    ok(t.includes("Milestone 1: Draft ($300)"), "the agency sees its milestones to assign");
    await label(s.page, "Agency share for this job (%), empty for their bench split").fill("3");
    await click(s.page, "Assign");
    await s.page.waitForTimeout(4500);
    ok((await dela(s.page).locator("#assign-card .card-status").innerText().catch(() => "")).includes("The agency's share must be between 5% and 50%"), "a refusal stays on the Bench assignments card");
    await label(s.page, "Agency share for this job (%), empty for their bench split").fill("30");
    await click(s.page, "Assign");
    t = await waitFor(s.page, "waiting for Pia Plus to accept");
    ok(t.includes("Assigned to Pia Plus | split 30% to the agency / 70% to the freelancer"), "assigned at a different split for this job");
    await s.ctx.close();
    s = await open(browser, PIA, `&tab=agency`);
    t = await waitFor(s.page, "Your agency assignments");
    ok(t.includes("Split for this job: 30% agency / 70% you") && t.includes("your share $210"), "Pia sees the split for this job and her share");
    await click(s.page, "Accept");
    await waitFor(s.page, "Tick the box to accept the split for this job.");
    await label(s.page, "I accept this split for this job.").check();
    await click(s.page, "Accept");
    t = await waitFor(s.page, "Split 30% agency / 70% you | in progress");
    await s.ctx.close();
    s = await open(browser, ATT, `&tab=projects&gig=${gig}&view=agreement`);
    t = await waitFor(s.page, "Pia Plus");
    ok(t.includes("Subcontractor, Milestone 1") && !t.includes("Bench assignments") && !t.includes("30%") && !t.includes("70%"), "the attorney sees the subcontractor, never the split");
    await s.ctx.close();

    // ---------- The Lawfecta Team: the business check and a seat limit ----------
    await sql("insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = 1 and not exists (select 1 from staff_roles s where s.person_id = people.id)");
    s = await open(browser, 1, "");
    await s.page.goto(`${BASE}/page/DELA-Admin?uid=1&plan=`);
    await text(s.page);
    // Giving a plan keeps the search (ChatGPT agency test 2026-11-05: it went back to everyone)
    await dela(s.page).getByRole("tab", { name: "People", exact: true }).click();
    await label(s.page, "Search").fill(`${FRED}@test.invalid`);
    await click(s.page, "Search");
    await waitFor(s.page, `BD ${FRED}`);
    await label(s.page, "Plan to give").selectOption({ label: "Freelancer Plus" });
    await click(s.page, "Give");
    await waitFor(s.page, "fl_plus (set by team)");
    ok(await label(s.page, "Search").inputValue() === `${FRED}@test.invalid` && !(await text(s.page)).includes(`BD ${OWNER}`), "giving a plan keeps the search");
    await dela(s.page).getByRole("tab", { name: "Agencies", exact: true }).click();
    t = await waitFor(s.page, "Not checked yet");
    ok(t.includes("Roe Support Group") && t.includes("Seats: "), "the team sees the agency and its seats");
    await click(s.page, "Ask for a change");
    await waitFor(s.page, "Write a note saying what to change.");
    ok(!(await text(s.page)).includes("That did not work"), "the admin's own messages read plainly");
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
    // ---------- The agency's own gigs (part 2c): client details, Library, Projects, the bench first, what freelancers see ----------
    await sql(`update feature_switches set state = 'everyone' where key in ('agency_hiring', 'playbook_library', 'talent_search');
      insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by)
        select o.id, 'Agency intake SOP', 'approved', 1, 1, 100, 'agpb1', o.owner_person_id from organizations o where o.kind = 'agency' and o.owner_person_id = (select id from people where bd_member_id = ${OWNER});
      insert into playbook_versions (playbook_id, version, body, created_by) select id, 1, '{"title":"Agency intake SOP","steps":[{"text":"Collect the intake form"},{"text":"Check for conflicts"}]}', created_by from playbooks where request_id = 'agpb1'; select 1`);
    s = await open(browser, OWNER, `&tab=agency`);
    t = await waitFor(s.page, "Posting gigs");
    ok(t.includes("Library") && t.includes("Projects") && t.includes("Talent"), "an agency that hires gets the Library, Projects and Talent tabs");
    await label(s.page, "Who signs for the agency").fill("Olive Owner");
    await label(s.page, "Billing address").fill("1 Main St, Austin TX");
    await label(s.page, "Email for notices").fill("olive@roe.example");
    await click(s.page, "Save client details");
    t = await waitFor(s.page, "Ready to post gigs from your Library");
    ok((await dela(s.page).locator("#agency-client").innerText()).includes("Ready to post gigs"), "the agency can post");
    await s.page.goto(`${BASE}/page/DELA-App?uid=${OWNER}&plan=&tab=projects`);
    t = await waitFor(s.page, "Post a new gig");
    ok(!t.includes("verified license"), "agencies are not asked for a license");
    if (await dela(s.page).getByRole("button", { name: "Start a new gig", exact: true }).count()) await click(s.page, "Start a new gig");
    await label(s.page, "Approved SOP or Workflow").selectOption({ label: "Agency intake SOP" });
    await label(s.page, "Budget from ($)").fill("300");
    await label(s.page, "Budget to ($)").fill("900");
    await click(s.page, "Draft the gig with DELA");
    await waitFor(s.page, "Public version", 10000);
    await label(s.page, "Deadline").fill("2099-03-01");
    await label(s.page, "Milestones, one per line").fill("Draft\nFinal");
    await click(s.page, "Post the gig");
    t = await waitFor(s.page, "Your bench", 10000);
    ok(t.includes("Invite your bench first") && t.includes("Pia Plus"), "the agency's bench comes first on its gig");
    await dela(s.page).locator("#agency-bench-invite .row", { hasText: "Pia Plus" }).getByRole("button", { name: "Invite to this gig" }).click();
    await waitFor(s.page, "Invited Pia Plus");
    const agGig = (await sql(`select id from gigs where org_id = (select id from organizations where kind = 'agency' limit 1) order by created_at desc limit 1`))[0].id;
    await s.ctx.close();
    s = await open(browser, PIA, `&tab=work&gig=${agGig}`);
    t = await waitFor(s.page, "Posted by Roe Support Group (agency)");
    ok(t.includes("You are invited to send a proposal"), "the bench member sees the agency's invitation");
    ok(!t.includes("Message the attorney") && !t.includes("Reviews of this attorney"), "freelancers see an agency, not an attorney");
    await s.ctx.close();
    s = await open(browser, ATT, `&tab=library`);
    t = await text(s.page);
    await s.page.waitForTimeout(800);
    t = await text(s.page);
    ok(!t.includes("Agency intake SOP"), "an attorney never sees an agency's Library");
    // Fix (ChatGPT agency gigs test 2026-11-05): an attorney opening an agency's gig is told it is not theirs, not to refresh
    await s.page.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=projects&gig=${agGig}`);
    t = await waitFor(s.page, "This gig is not available to your account");
    ok(!t.includes("Refresh the page"), "an agency's gig reads as not available to the attorney, not as a refresh problem");
    await s.ctx.close();
    // Fix (same test): after both sign a bench hire, the bench member waits for the agency to pay, and pays no fee
    const own = (await sql(`select o.id org, o.owner_person_id owner, (select id from people where bd_member_id = ${PIA}) pia from organizations o where o.kind = 'agency' limit 1`))[0];
    const bp = (await sql(`insert into proposals (gig_id, freelancer_id, status, price_cents) values ('${agGig}', '${own.pia}', 'selected', 60000) returning id`))[0].id;
    const bag = (await sql(`insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status, signed_at) values ('${agGig}', '${bp}', '${own.org}', '${own.owner}', '${own.pia}', 60000, 'signed', now()) returning id`))[0].id;
    await sql(`insert into agreement_versions (agreement_id, version, body, body_hash, proposed_by) values ('${bag}', 1, '{"gig_title":"Agency job","parties":{"client":{"kind":"agency","firm":"Roe Support Group"}},"milestones":[],"fees":{"bench_waiver":true}}', 'h', '${own.owner}');
      update agreements set version = 1 where id = '${bag}';
      insert into milestones (agreement_id, seq, title, amount_cents, freelancer_fee_cents, from_version, status) values ('${bag}', 1, 'Draft', 30000, 0, 1, 'pending'); select 1`);
    s = await open(browser, PIA, `&tab=work&gig=${agGig}&view=agreement`);
    t = await waitFor(s.page, "to pay the next milestone");
    ok(t.includes("Waiting for the agency to pay the next milestone") && !t.includes("Waiting for the attorney"), "the bench member waits for the agency, not an attorney");
    ok(t.includes("(you receive all of it; you pay no platform fee)") && !t.includes("after the platform fee"), "a milestone with no fee says so");
    await s.ctx.close();

    // ---------- Subcontracting (part 3): the disclosure, No subcontractors, linked gigs ----------
    await sql(`update feature_switches set state = 'everyone' where key = 'agency_subcontracting';
      insert into agreement_versions (agreement_id, version, body, body_hash, proposed_by) select a.id, a.version + 1, v.body || '{"gig_title":"Agency intake job","subcontracting":{"agency":true,"no_subcontractors":false}}', 'h2', a.attorney_person
        from agreements a join agreement_versions v on v.agreement_id = a.id and v.version = a.version where a.gig_id = '${gig}';
      update agreements set version = version + 1 where gig_id = '${gig}'; select 1`);
    const j2 = (await sql(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id, visibility)
      values ('${ids.org}', '${ids.att}', '${pb}', 1, 'Second agency job', '{"task":"Intake"}', 30000, 90000, 'filled', now(), now() + interval '14 days', 'agb2', 'public') returning id`))[0].id;
    const p2 = (await sql(`insert into proposals (gig_id, freelancer_id, status, price_cents, agency_org, included, schedule) values ('${j2}', '${own.owner}', 'selected', 60000, '${own.org}', 'The intake packet', '5 days') returning id`))[0].id;
    await sql(`insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status, agency_org) values ('${j2}', '${p2}', '${ids.org}', '${ids.att}', '${own.owner}', 60000, 'draft', '${own.org}'); select 1`);
    s = await open(browser, ATT, `&tab=projects&gig=${j2}&view=agreement`);
    t = await waitFor(s.page, "Subcontractors");
    ok(t.includes("This agency may use vetted subcontractors from Lawfecta to complete this work."), "the attorney reads the disclosure on an agency agreement");
    await label(s.page, "No subcontractors on this engagement").check();
    await dela(s.page).locator("#subs-card").getByRole("button", { name: "Save", exact: true }).click();
    await waitFor(s.page, "Saved as version 2. Both of you sign the new version.");
    t = await waitFor(s.page, "No subcontractors on this engagement: only the agency's own team works on it.");
    ok((await dela(s.page).locator("#subs-card .card-status").innerText()).includes("Saved as version 2"), "the answer stays on the Subcontractors card");
    await s.ctx.close();
    s = await open(browser, OWNER, `&tab=work&gig=${gig}&view=agreement`);
    t = await waitFor(s.page, "Post a gig for part of this job");
    await click(s.page, "Post a gig for part of this job");
    t = await waitFor(s.page, "Linked to: Agency intake job");
    ok(t.includes("as your subcontractor"), "Projects shows the gig will be linked to the job");
    if (await dela(s.page).getByRole("button", { name: "Start a new gig", exact: true }).count()) await click(s.page, "Start a new gig");
    await label(s.page, "Approved SOP or Workflow").selectOption({ label: "Agency intake SOP" });
    await label(s.page, "Budget from ($)").fill("300");
    await label(s.page, "Budget to ($)").fill("600");
    await click(s.page, "Draft the gig with DELA");
    t = await waitFor(s.page, "Linked to Agency intake job", 10000);
    ok(t.includes("Public version"), "the linked gig's page says what it is linked to");
    await s.ctx.close();
    s = await open(browser, ATT, `&tab=projects&gig=${gig}&view=agreement`);
    t = await waitFor(s.page, "Subcontractors");
    ok(t.includes("This agency may use vetted subcontractors") && !t.includes("No subcontractors on this engagement") , "after signing, the attorney sees the choice read-only");
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

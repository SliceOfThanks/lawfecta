// Step 13: the DELA guide on the Dashboard (docs/briefs/step-13-dela-guide.md). Grouped by login: the freelancer, then the
// attorney, then the owner. The guide opens with the next step from real data, its buttons open the right screen, pausing
// closes it, gig alerts can be turned off, a typed question gets an answer, and it fits a phone.
//   node tests/pw/guide-test.js   (with tests/pw/server.ts running)
const { chromium } = require("playwright");
const path = require("path");

const BASE = "http://127.0.0.1:8787";
const ROOT = path.join(__dirname, "..", "..");
let passed = 0;
function ok(cond, msg) { if (!cond) throw new Error("FAILED: " + msg); passed++; console.log("ok", msg); }
async function sql(q) { const r = await fetch(BASE + "/test/sql", { method: "POST", body: JSON.stringify({ sql: q }) }); const j = await r.json(); if (j.error) throw new Error("sql: " + j.error); return j.rows; }
async function open(browser, widget, uid, query, width) {
  const ctx = await browser.newContext({ viewport: { width: width || 1200, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept());
  await page.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); const f = u.pathname.split("@")[1].split("/").slice(1).join("/"); route.fulfill({ path: path.join(ROOT, f), contentType: f.endsWith(".png") ? "image/png" : "application/javascript" }); });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto(`${BASE}/page/${widget}?uid=${uid}&plan=${query || ""}`);
  await text(page);
  return { ctx, page };
}
async function text(page) {
  await page.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela") && h.shadowRoot.querySelector(".dela").textContent.length > 20; });
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
const guide = (page) => dela(page).locator("section.guide");
const FL = 4900, ATT = 4901, OWNER_GIGS = 4902, AGENCY = 4903;
const person = (bd) => `(select id from people where bd_member_id = ${bd})`;

async function makeMember(bd, side, plan) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, 'Member ${bd}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side(${person(bd)}, '${side}', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and channel = 'access' and revoked_at is null); select 1`);
}

(async () => {
  const browser = await chromium.launch();
  let s, p, t;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('onboarding_widget', 'gig_alerts', 'flex_gigs', 'engagements', 'profiles', 'talent_search', 'playbook_library', 'ai_generation', 'guided_setup', 'ai_helpers')");
    await makeMember(FL, "freelancer", "fl_plus");
    await makeMember(ATT, "attorney", "att_pro");
    await makeMember(OWNER_GIGS, "attorney", "att_pro");
    await sql(`insert into member_profiles (person_id, side, body, missing, score) values (${person(FL)}, 'freelancer', '{"first_name":"Gwen"}', '{headline,software}', 40)
      on conflict (person_id, side) do update set missing = '{headline,software}'; select dela_profile_refresh(${person(FL)}, 'freelancer')`);

    // ---------- Log in as the freelancer ----------
    s = await open(browser, "DELA-App", FL, "&tab=home"); p = s.page;
    t = await waitFor(p, "Attorneys only see complete profiles", 15000);
    ok(t.includes("a headline and the software you use"), "freelancer: the guide opens with what is missing, in plain words");
    ok(await guide(p).getByRole("button", { name: "Finish my profile" }).isVisible(), "freelancer: one clear button");
    await Promise.all([p.waitForURL(/tab=profile/), guide(p).getByRole("button", { name: "Finish my profile" }).click()]);
    ok(true, "freelancer: Finish my profile opens the profile");

    // Match-ready, and a new gig that fits is posted by another firm
    await sql(`update member_profiles set missing = '{}', availability_confirmed_at = now() where person_id = ${person(FL)} and side = 'freelancer';
      insert into linkedin_checks (person_id, url, status) values (${person(FL)}, 'https://www.linkedin.com/in/gwen', 'verified');
      select dela_profile_refresh(${person(FL)}, 'freelancer');
      insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by)
        select dela_side_org(${person(OWNER_GIGS)}, 'attorney'), 'Owner firm', 'approved', 1, 1, 100, 'gpw1', ${person(OWNER_GIGS)} where not exists (select 1 from playbooks where request_id = 'gpw1');
      insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id)
        select dela_side_org(${person(OWNER_GIGS)}, 'attorney'), ${person(OWNER_GIGS)}, (select id from playbooks where request_id = 'gpw1'), 1, 'Guide test: Summarize depositions',
          '{"task":"Summarize two depositions","practice_area":"Family law"}', 30000, 60000, 'open', now(), now() + interval '14 days', 'gpw-gig1' where not exists (select 1 from gigs where request_id = 'gpw-gig1');
      insert into gig_matches (gig_id, person_id, fit, tier, reasons) select (select id from gigs where request_id = 'gpw-gig1'), ${person(FL)}, 80, 2, '{"Family law","Uses Clio"}' on conflict do nothing; select 1`);
    await p.goto(`${BASE}/page/DELA-App?uid=${FL}&plan=&tab=home`);
    t = await waitFor(p, "new gig fits you", 15000);
    ok(t.includes("Guide test: Summarize depositions") && t.includes("Uses Clio"), "freelancer: a new gig that fits, with why");
    ok(await guide(p).getByRole("button", { name: /^See .Guide test: Summarize depositions.$/ }).isVisible(), "freelancer: a button to see the gig");

    // Gig alerts: three toggles
    await guide(p).locator("summary", { hasText: "New gig alerts" }).click();
    await guide(p).getByLabel("By email").uncheck();
    await waitFor(p, "Saved");
    const pr = await sql(`select alerts_email from guide_prefs where person_id = ${person(FL)} and side = 'freelancer'`);
    ok(pr[0] && pr[0].alerts_email === false, "freelancer: turning off email alerts is saved");
    await guide(p).getByLabel("By email").check();

    // A typed question
    await guide(p).getByLabel("Ask the DELA guide a question").fill("Should I apply to this one?");
    await guide(p).getByRole("button", { name: "Ask", exact: true }).click();
    t = await waitFor(p, "Start with the first one");
    ok(/Free answers left today: \d+/.test(t), "freelancer: a free answer, and how many are left today");

    // Not for me, then pause
    await guide(p).getByRole("button", { name: "Not for me" }).first().click();
    await p.waitForTimeout(600);
    t = await text(p);
    ok(!t.includes("new gig fits you"), "freelancer: Not for me hides that gig from the guide");
    await guide(p).getByRole("button", { name: "Pause the guide for a day" }).click();
    t = await waitFor(p, "Paused. DELA opens it again tomorrow");
    ok(await guide(p).getByRole("button", { name: "Open the guide" }).isVisible(), "freelancer: pausing closes the guide, with a way back");
    await guide(p).getByRole("button", { name: "Open the guide" }).click();
    await p.waitForTimeout(500);
    ok(!(await text(p)).includes("Paused. DELA opens it again"), "freelancer: Open the guide brings it back");
    await s.ctx.close();

    s = await open(browser, "DELA-App", FL, "&tab=home", 390); p = s.page;
    await guide(p).locator(".guide-msg").first().waitFor();
    const w = await p.evaluate(() => ({ page: document.documentElement.scrollWidth, vw: window.innerWidth }));
    ok(w.page <= w.vw + 1, "freelancer: the guide fits a 390-pixel phone (" + w.page + " of " + w.vw + ")");
    await s.ctx.close();

    // ---------- Log in as the agency owner (MVP: the agency profile with DELA's help) ----------
    await sql("update feature_switches set state = 'everyone' where key in ('agency_team', 'agency_bench', 'agency_hiring'); select 1");
    await makeMember(AGENCY, "freelancer", "fl_business");
    s = await open(browser, "DELA-App", AGENCY, "&tab=agency"); p = s.page;
    t = await waitFor(p, "Agency profile", 15000);
    t = await waitFor(p, "Still missing:");
    ok(t.includes("a headline") && t.includes("the states you serve"), "agency owner: the agency profile says what is missing");
    await dela(p).getByLabel("Tell DELA about your agency").fill("Four paralegals in Austin doing family law discovery and case files for small firms. We use Clio.");
    await dela(p).getByRole("button", { name: "✦ Let DELA draft it" }).click();
    await waitFor(p, "DELA filled in the boxes");
    ok((await dela(p).getByLabel("Headline").inputValue()).includes("Family law support team"), "agency owner: DELA drafts the headline and the rest");
    await dela(p).getByRole("button", { name: "Save the agency profile" }).click();
    t = await waitFor(p, "Complete.");
    ok(true, "agency owner: the saved agency profile is complete");
    await s.ctx.close();

    // ---------- Log in as the attorney ----------
    s = await open(browser, "DELA-App", ATT, "&tab=home"); p = s.page;
    t = await waitFor(p, "First, tell DELA about your firm", 15000);
    await guide(p).getByRole("button", { name: "Tell DELA about my firm" }).click();
    t = await waitFor(p, "Your firm profile for documents", 10000);
    ok(t.includes("Help me describe my firm"), "attorney: a new firm is asked about itself first, with DELA's help to describe it");
    await sql(`insert into firm_profiles (org_id, body) select dela_side_org(${person(ATT)}, 'attorney'), '{"documents":{"practice_areas":["Family law"]}}'
      on conflict (org_id) do update set body = firm_profiles.body || excluded.body; select 1`);
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=home`);
    t = await waitFor(p, "take one task off your desk", 15000);
    ok(t.includes("Based on your family law practice"), "attorney: the task picks name the firm's practice");
    const drafts = await guide(p).getByRole("button", { name: /^Draft: / }).count();
    ok(drafts === 3, "attorney: three tasks to start from (" + drafts + ")");
    ok(await guide(p).getByRole("button", { name: "Something else" }).isVisible(), "attorney: or something else");
    ok(!t.includes("Get set up:"), "attorney: the guide replaces the Get set up card");
    const first = (await guide(p).getByRole("button", { name: /^Draft: / }).first().innerText()).replace("Draft: ", "");
    await guide(p).getByRole("button", { name: /^Draft: / }).first().click();
    t = await waitFor(p, "New document", 10000);
    const vals = await p.evaluate(() => [...document.querySelector(".dela-host").shadowRoot.querySelectorAll("input, textarea")].map((x) => x.value).join(" | "));
    ok(t.includes(first) || vals.includes(first) || t.includes("Your firm profile for documents"), "attorney: a task opens the new document flow for it (" + first + ")");

    await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, doc_type, request_id, created_by)
      select dela_side_org(${person(ATT)}, 'attorney'), 'Guide test: Respond to a new inquiry', 'approved', 1, 1, 100, 'sop', 'gpw2', ${person(ATT)} where not exists (select 1 from playbooks where request_id = 'gpw2'); select 1`);
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=home`);
    t = await waitFor(p, "is approved. DELA can find the steps", 15000);
    await Promise.all([p.waitForURL(/tab=library&pb=/), guide(p).getByRole("button", { name: "Find steps to hand off" }).click()]);
    ok(true, "attorney: an approved playbook leads to handing off steps (opens the document)");

    await sql(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, request_id)
      select dela_side_org(${person(ATT)}, 'attorney'), ${person(ATT)}, (select id from playbooks where request_id = 'gpw2'), 1, 'Guide test: Answer new inquiries', '{"task":"Answer inquiries"}', 30000, 60000, 'draft', 'gpw-gig2'
      where not exists (select 1 from gigs where request_id = 'gpw-gig2'); select 1`);
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=home`);
    t = await waitFor(p, "Guide test: Answer new inquiries", 15000);
    ok(t.includes("license check") || t.includes("Check the budget"), "attorney: a drafted gig leads to posting it (or the license check first)");
    await s.ctx.close();

    // ---------- Log in as the owner (admin area) ----------
    await sql("insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = 1 and not exists (select 1 from staff_roles s where s.person_id = people.id and s.role = 'owner')");
    s = await open(browser, "DELA-Admin", 1, ""); p = s.page;
    await dela(p).getByRole("tab", { name: "Overview" }).first().click();
    t = await waitFor(p, "DELA guide", 15000);
    t = await waitFor(p, "Members who saw it");
    ok(t.includes("Gig alerts sent today") && t.includes("Pick a first task"), "owner: the Overview shows the guide's numbers and steps");
    await s.ctx.close();
    console.log("\n" + passed + " guide checks passed");
  } catch (e) {
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

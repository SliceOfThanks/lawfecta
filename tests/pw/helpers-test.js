// Browser test of UX review Phase 4 part B (docs/briefs/step-8a-phase-4.md), the checks before a commitment: each ✦ check says
// how many DELA actions it uses, shows an "AI suggestion" panel with Use suggestion, Edit and Dismiss, and only fills the unsaved
// form. Attorney: Check the scope on a gig draft, Compare these proposals (no ranking sentence), Check this for me and Improve
// acceptance criteria (which fills the change editor, nothing sent). Freelancer: Check my proposal. Off: no ✦ check buttons.
//   node tests/pw/helpers-test.js   (with tests/pw/server.ts running)
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
const ATT = 4420, FL = 4421, FL2 = 4422;

(async () => {
  const browser = await chromium.launch();
  let s, p, t;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'engagements', 'profiles', 'talent_search', 'playbook_library', 'ai_generation', 'ai_helpers'); update settings set value = 'false' where key = 'verify.freelancer_linkedin'; select 1");
    await sql(`insert into people (bd_member_id, display_name, email) values (${ATT}, 'Hana Helper', '${ATT}@test.invalid'), (${FL}, 'Pia Proposal', '${FL}@test.invalid'), (${FL2}, 'Quinn Quote', '${FL2}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = ${ATT}), 'attorney', 'att_pro', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = ${FL}), 'freelancer', 'fl_plus', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = ${FL2}), 'freelancer', 'fl_plus', 'staff_grant');
      insert into access_list (bd_member_id, channel) select x, 'access' from unnest(array[${ATT}, ${FL}, ${FL2}]) x where not exists (select 1 from access_list where bd_member_id = x and channel = 'access' and revoked_at is null);
      insert into member_profiles (person_id, side, body, missing, score) select id, 'attorney', '{"firm_name":"Helper Legal"}', '{}', 100 from people where bd_member_id = ${ATT} on conflict do nothing;
      insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) select id, 'l', 'TX', 'HP${ATT}', 'HP${ATT}', 'A', 'video', 'verified' from people where bd_member_id = ${ATT};
      select dela_profile_refresh((select id from people where bd_member_id = ${ATT}), 'attorney');
      insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"Pia","last_name":"Proposal","headline":"Intake paralegal","practice_areas":["Family law"]}', '{}', 100, now() from people where bd_member_id in (${FL}, ${FL2}) on conflict do nothing;
      update side_profiles set verification_state = 'verified', readiness_state = 'match_ready' where person_id in (select id from people where bd_member_id in (${FL}, ${FL2})) and side = 'freelancer'; select 1`);
    const ids = (await sql(`select (select id from people where bd_member_id = ${ATT}) att, (select id from people where bd_member_id = ${FL}) fl, (select id from people where bd_member_id = ${FL2}) fl2, dela_side_org((select id from people where bd_member_id = ${ATT}), 'attorney') org`))[0];
    await sql(`insert into firm_profiles (org_id, body) values ('${ids.org}', '{"signatory_name":"Hana Helper","billing_address":"1 Main St, Austin TX","service_email":"hana@example.com"}') on conflict (org_id) do update set body = excluded.body; select 1`);
    const pb = (await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ('${ids.org}', 'Intake calls', 'approved', 1, 1, 100, 'hp-pb', '${ids.att}') returning id`))[0].id;
    await sql(`insert into playbook_versions (playbook_id, version, body, created_by) values ('${pb}', 1, '{"title":"Intake calls","steps":[{"text":"Call the new client"}]}', '${ids.att}'); select 1`);
    const gig = async (status, tag) => (await sql(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id)
      values ('${ids.org}', '${ids.att}', '${pb}', 1, 'Intake calls ${tag}', '{"title":"Intake calls ${tag}","task":"Call new clients","outcome":"Done","steps":["Call","Log"]}', 30000, 60000, '${status}', now(), now() + interval '14 days', 'hp-${tag}') returning id`))[0].id;
    const draftGig = await gig("draft", "draft"), openGig = await gig("open", "open"), filled = await gig("filled", "filled");
    const p1 = (await sql(`insert into proposals (gig_id, freelancer_id, status, price_cents, included, schedule, days_to_deliver, qualifications, sent_at) values ('${filled}', '${ids.fl}', 'selected', 40000, 'Intake calls; conflict checks', 'Within a week', 7, 'Five years', now()) returning id`))[0].id;
    await sql(`insert into proposals (gig_id, freelancer_id, status, price_cents, included, schedule, days_to_deliver, qualifications, sent_at) values ('${filled}', '${ids.fl2}', 'sent', 35000, 'Intake calls', 'Two weeks', 14, 'Paralegal', now()); select 1`);
    const ag = (await sql(`insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents) values ('${filled}', '${p1}', '${ids.org}', '${ids.att}', '${ids.fl}', 40000) returning id`))[0].id;
    await sql(`insert into gig_invitations (gig_id, freelancer_id, invited_by) values ('${openGig}', '${ids.fl}', '${ids.att}'); select 1`);

    // ---------- Attorney: Check the scope on a gig draft ----------
    s = await open(browser, "DELA-App", ATT, `&tab=projects&gig=${draftGig}`); p = s.page;
    t = await waitFor(p, "✦ Check the scope", 15000);
    ok(t.includes("Uses 1 DELA action on Lawfecta's AI (none on your own key)."), "the check says what it uses before it runs");
    await click(p, "✦ Check the scope");
    t = await waitFor(p, "AI suggestion");
    ok(t.includes("What done looks like: What done looks like is vague.") && t.includes("Deadline: There is no deadline.") && t.includes("do not confirm legal correctness"), "findings name the box, with the legal note");
    await dela(p).locator('[data-helper="check_scope"]').getByRole("button", { name: "Use suggestion", exact: true }).first().click();
    ok((await label(p, "What done looks like").inputValue()) === "The intake summary is saved in the matter in Clio.", "Use suggestion fills the unsaved box");
    ok((await sql(`select public->>'outcome' o from gigs where id = '${draftGig}'`))[0].o === "Done", "nothing is saved until the attorney saves");
    ok(await dela(p).locator('[data-helper="check_scope"]').getByRole("button", { name: "Use suggestion", exact: true }).count() === 0, "the deadline finding has no suggestion to use");

    // ---------- Compare these proposals ----------
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=projects&gig=${filled}&view=proposals`);
    t = await waitFor(p, "✦ Compare these proposals", 15000);
    ok(t.includes("Uses 2 DELA actions"), "compare uses 2 DELA actions");
    await click(p, "✦ Compare these proposals");
    t = await waitFor(p, "does not rank them");
    ok(t.includes("Covers the calls and the conflict checks.") && t.includes("Covers the calls only.") && !t.includes("best choice"), "every proposal gets the same fields and the ranking sentence is gone");
    ok(t.includes("Not said: Does not say what is left out") && t.includes("You could ask: Who makes the calls?"), "missing details and questions to ask");

    // ---------- Check this for me, and Improve acceptance criteria into the change editor ----------
    await sql(`update agreements set status = 'signing' where id = '${ag}'; select 1`);
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=projects&gig=${filled}&view=agreement`);
    t = await waitFor(p, "✦ Check this for me", 15000);
    await click(p, "✦ Check this for me");
    t = await waitFor(p, "The agreement does not say what is not included.");
    ok(t.includes("Not included: The agreement does not say what is not included."), "Check this for me lists mismatches");
    await click(p, "✦ Improve acceptance criteria");
    t = await waitFor(p, "Milestone 1: A call log for every new client, saved in Clio");
    ok(t.includes("Both of you sign it before it applies."), "using the criteria goes through a new version both sign");
    const v0 = (await sql(`select count(*)::int n from agreement_versions where agreement_id = '${ag}'`))[0].n;
    await dela(p).locator('[data-helper="acceptance_criteria"]').getByRole("button", { name: "Use suggestion", exact: true }).click();
    t = await waitFor(p, "DELA's suggested deliverables are filled in below");
    ok((await label(p, "Deliverables").inputValue()) === "A call log for every new client, saved in Clio", "the change editor holds the suggested deliverables");
    ok((await sql(`select count(*)::int n from agreement_versions where agreement_id = '${ag}'`))[0].n === v0, "no new version until the attorney sends it");
    await s.ctx.close();

    // ---------- Freelancer: Check my proposal ----------
    s = await open(browser, "DELA-App", FL, `&tab=work&gig=${openGig}`); p = s.page;
    t = await waitFor(p, "✦ Check my proposal", 15000);
    await label(p, "What your price includes").fill("Intake calls");
    await click(p, "✦ Check my proposal");
    t = await waitFor(p, "Say what the price does not include.");
    await dela(p).locator('[data-helper="proposal_check"]').getByRole("button", { name: "Use suggestion", exact: true }).click();
    ok((await label(p, "What it leaves out").inputValue()) === "Court filings are not included.", "the freelancer's suggestion fills What it leaves out");
    ok((await sql(`select count(*)::int n from proposals where gig_id = '${openGig}'`))[0].n === 0, "nothing is sent");
    await s.ctx.close();

    // ---------- The switch off: no check buttons ----------
    await sql("update feature_switches set state = 'off' where key = 'ai_helpers'");
    s = await open(browser, "DELA-App", ATT, `&tab=projects&gig=${draftGig}`); p = s.page;
    t = await waitFor(p, "Public version", 15000);
    await p.waitForTimeout(500);
    ok(!(await text(p)).includes("✦ Check the scope"), "no checks with the switch off");
    await s.ctx.close();
    console.log(passed + " browser checks passed");
  } catch (e) {
    console.error(e.message);
    if (p) await p.screenshot({ path: path.join(SHOTS, "helpers-fail.png") }).catch(() => {});
    process.exitCode = 1;
  } finally { await browser.close(); }
})();

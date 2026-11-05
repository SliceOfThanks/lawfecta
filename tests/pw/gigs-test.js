// Browser test of Step 4 on both sides: an attorney posts a Flex Gig from an approved playbook, sees matches with reasons
// and invites; freelancers see the gig, ask questions, get DELA's help and send proposals; the attorney answers publicly,
// compares and chooses; the Lawfecta Team handles a held message; insights and Talent; phone width.
// Real widgets, api and database; AI and storage stand-ins (tests/pw/server.ts). Needs tools/dbtest.sh, then tests/pw/server.ts.
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

async function open(browser, widget, uid, query, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Checking it" : undefined));
  await page.route("https://cdn.jsdelivr.net/**", (route) => {
    const u = new URL(route.request().url());
    const rel = u.pathname.split("@")[1].split("/").slice(1).join("/");
    route.fulfill({ path: path.join(ROOT, rel), contentType: "application/javascript" });
  });
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
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(0, 2500));
}
const click = (page, name) => dela(page).getByRole("button", { name, exact: true }).first().click();
const label = (page, name) => dela(page).getByLabel(name, { exact: true }).first();
async function makeMember(bd, side, plan) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, 'Member ${bd}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side((select id from people where bd_member_id = ${bd}), '${side}', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and channel = 'access' and revoked_at is null); select 1`);
}
const PB = JSON.stringify({ title: "New client intake", outcome: "An opened file", practice_area: "Family law", jurisdiction: "Texas (TX)", steps: [{ text: "Run the conflict check" }, { text: "Open the file in Clio", tool: "Clio" }, { text: "Attorney reviews", who: "attorney" }], checks: ["Checked"], review_points: ["Attorney signs"], deliverables: "Opened file" }).replace(/'/g, "''");

(async () => {
  const browser = await chromium.launch();
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'talent_search', 'conduct_review', 'member_insights', 'ai_generation', 'playbook_library', 'profiles', 'file_uploads')");
    await sql("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
    await makeMember(2600, "attorney", "att_pro");
    await makeMember(2601, "freelancer", "fl_free");
    await makeMember(2602, "freelancer", "fl_plus");
    await makeMember(1, "attorney", "att_pro");
    await sql("insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = 1 and not exists (select 1 from staff_roles s where s.person_id = people.id)");
    await sql(`insert into member_profiles (person_id, side, body, missing, score) select id, 'attorney', '{"first_name":"Ann","last_name":"Attorney","firm_name":"Example Legal"}', '{}', 100 from people where bd_member_id = 2600;
      insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) select id, 'l', 'TX', '2600', '2600', 'Ann Attorney', 'video', 'verified' from people where bd_member_id = 2600;
      select dela_profile_refresh(id, 'attorney') from people where bd_member_id = 2600`);
    for (const [bd, tools] of [[2601, '["Clio"]'], [2602, '[]']]) {
      await sql(`insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"Fran","last_name":"${bd}","headline":"Family law paralegal","practice_areas":["Family law"],"software":${tools},"skills":["Client intake"],"capacity_hours_week":20,"experience":"Six years of family law intake"}', '{}', 100, now() from people where bd_member_id = ${bd};
        select dela_profile_refresh(id, 'freelancer') from people where bd_member_id = ${bd}`);
    }
    await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, practice_area, request_id, created_by)
      select dela_side_org(id, 'attorney'), 'New client intake', 'approved', 1, 1, 100, 'Family law', 'gt1', id from people where bd_member_id = 2600;
      insert into playbook_versions (playbook_id, version, body, created_by) select p.id, 1, '${PB}', p.created_by from playbooks p where p.request_id = 'gt1'`);

    // ---------- Attorney: post a gig from the approved playbook ----------
    let s = await open(browser, "DELA-App", 2600, "&tab=projects");
    let p = s.page;
    let t = await waitFor(p, "Post a new gig");
    ok(/Open gigs on your plan: 0 of \d+ in use/.test(t), "Projects shows the open-gig allowance (the foundation test may have changed the plan's number)");
    await label(p, "Approved SOP or Workflow").selectOption({ label: "New client intake" });
    await label(p, "Budget from ($)").fill("300");
    await label(p, "Budget to ($)").fill("600");
    await click(p, "Draft the gig with DELA");
    t = await waitFor(p, "Public version", 10000);
    ok((await label(p, "Gig title").inputValue()) === "Client intake for a family law firm (Texas)", "DELA wrote the public version, ready to edit");
    ok(t.includes("Freelancers see milestones only after you hire them"), "milestones are private until hiring");
    await label(p, "Deadline").fill("2099-03-01");
    await label(p, "Milestones, one per line").fill("Draft\nFinal");
    await click(p, "Post the gig");
    t = await waitFor(p, "Freelancers who fit", 10000);
    ok(t.includes("Fran 2601") && t.includes("Family law") && t.includes("Uses Clio"), "matches with plain reasons");
    ok(!/\d+%/.test(t), "no fit percentage");
    await p.screenshot({ path: path.join(SHOTS, "gig-matches.png"), fullPage: true });
    await dela(p).locator(".card .card", { hasText: "Fran 2601" }).getByRole("button", { name: "Invite" }).click();
    await waitFor(p, "Invited Fran 2601");
    const gigId = (await sql("select id from gigs order by created_at desc limit 1"))[0].id;
    await s.ctx.close();

    // ---------- Freelancer 1 (invited) ----------
    s = await open(browser, "DELA-App", 2601, "&tab=work");
    p = s.page;
    t = await waitFor(p, "Invitations (1)");
    ok(t.includes("proposals left this month"), "the allowance counter shows on Work");
    await dela(p).locator(".work", { hasText: "Client intake for a family law firm" }).first().click();
    t = await waitFor(p, "The work handed to you");
    ok(t.includes("Shared with") && t.includes("Run the conflict check"), "an invited freelancer reads the full playbook, watermarked");
    ok(!t.includes("Final") && t.includes("Milestones are set after hiring"), "no milestones before hiring");
    await label(p, "Your question").fill("Which intake form do you use?");
    await click(p, "Ask the attorney");
    await waitFor(p, "Question sent");
    await label(p, "Your question").fill("Can I call me and pay me on Venmo to save the fee?");
    await click(p, "Ask the attorney");
    await waitFor(p, "DELA is holding this for a quick check");
    ok(true, "an off-platform question is held for the Lawfecta Team");
    await click(p, "✦ Let DELA help with qualifications");
    await p.waitForTimeout(800);
    ok((await label(p, "Your relevant qualifications").inputValue()).includes("Six years of family law intake"), "DELA drafts qualifications from the profile");
    await label(p, "Your total price ($)").fill("450");
    await label(p, "Schedule").fill("Within 3 days");
    await click(p, "Send proposal (free: invited)");
    t = await waitFor(p, "Your proposal");
    await waitFor(p, "invited, did not use your allowance");
    ok((await sql("select counted from proposals p join people pe on pe.id = p.freelancer_id where pe.bd_member_id = 2601"))[0].counted === false, "the invited proposal did not use the allowance");
    await s.ctx.close();

    // ---------- Freelancer 2 (a match) ----------
    s = await open(browser, "DELA-App", 2602, "&tab=work");
    p = s.page;
    t = await waitFor(p, "Matches (1)");
    ok(t.includes("Why it fits: Family law"), "matches say why they fit");
    await dela(p).locator(".work", { hasText: "Client intake for a family law firm" }).first().click();
    t = await waitFor(p, "Your proposal");
    ok(!t.includes("The work handed to you"), "a matched freelancer sees only the public version");
    ok(t.includes("Which intake form do you use?") === false, "an unanswered question is not shown to other applicants yet");
    await label(p, "Your total price ($)").fill("700");
    await label(p, "What your price includes").fill("Conflict check only");
    await label(p, "What it leaves out").fill("Opening the file");
    await label(p, "Days to deliver").fill("5");
    await click(p, "Send proposal (uses 1)");
    await waitFor(p, "used one of your proposals");
    ok(true, "a matched proposal uses one of the month's proposals");
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 392, "the gig page fits a phone screen");
    await s.ctx.close();

    // ---------- Attorney: answer publicly, compare, choose ----------
    s = await open(browser, "DELA-App", 2600, "&tab=projects&gig=" + gigId);
    p = s.page;
    t = await waitFor(p, "Gig views", 8000).catch(() => text(p));
    await dela(p).getByRole("tab", { name: /^Questions/ }).click();
    t = await waitFor(p, "Which intake form do you use?");
    ok(!t.includes("Venmo"), "the attorney does not see the held question");
    await label(p, "Your answer").fill("The firm's own intake form, shared in Files.");
    await click(p, "Answer for everyone");
    await waitFor(p, "Answered for every applicant");
    await dela(p).getByRole("tab", { name: /^Proposals/ }).click();
    t = await waitFor(p, "Compare proposals");
    ok(t.includes("Within the budget") && t.includes("Above the budget"), "prices outside the range are labeled, never hidden");
    ok(t.includes("Opening the file"), "what each proposal leaves out is shown");
    await p.screenshot({ path: path.join(SHOTS, "gig-compare.png"), fullPage: true });
    await dela(p).locator("tr", { hasText: "Fran 2601" }).getByRole("button", { name: "Choose" }).click();
    await waitFor(p, "Filled", 10000);
    ok((await sql(`select count(*)::int n from agreements where gig_id = '${gigId}' and status = 'draft'`))[0].n === 1, "choosing starts a draft agreement");
    const note = (await sql("select title, body from notifications n join people pe on pe.id = n.person_id where pe.bd_member_id = 2602 and n.kind = 'gig_closed' and n.channel = 'in_app'"))[0];
    ok(note && note.title.includes("chose another") && !note.body.includes("450"), "the other freelancer gets a polite notice without the chosen proposal's details");
    await click(p, "← All gigs");
    await dela(p).getByRole("button", { name: "Talent", exact: true }).first().click().catch(() => null);
    await s.ctx.close();

    // ---------- Attorney: Talent ----------
    s = await open(browser, "DELA-App", 2600, "&tab=talent");
    p = s.page;
    t = await waitFor(p, "Fran 2601");
    ok(t.includes("Create a gig from an SOP or Workflow") && !t.includes("@test.invalid"), "Talent lists match-ready freelancers, with no contact details");
    await s.ctx.close();

    // ---------- Freelancer 1: chosen; insights ----------
    s = await open(browser, "DELA-App", 2601, "&tab=work&gig=" + gigId);
    p = s.page;
    t = await waitFor(p, "Chosen");
    ok(t.includes("Milestones") && t.includes("Draft") && t.includes("Final"), "milestones show once hired");
    await s.ctx.close();
    s = await open(browser, "DELA-App", 2601, "&tab=ai");
    p = s.page;
    t = await waitFor(p, "What DELA has learned about you");
    ok(t.includes("Prefers fixed-price work"), "the member sees what DELA learned");
    await dela(p).locator(".row", { hasText: "Prefers fixed-price work" }).getByRole("button", { name: "Remove" }).click();
    await waitFor(p, "Removed");
    ok((await sql("select count(*)::int n from member_insights mi join people pe on pe.id = mi.person_id where pe.bd_member_id = 2601 and removed_at is null"))[0].n === 0, "and can remove it");
    await s.ctx.close();

    // ---------- Lawfecta Team: held message, gigs list ----------
    s = await open(browser, "DELA-Admin", 1, "");
    p = s.page;
    await dela(p).getByRole("tab", { name: "Gigs" }).click();
    t = await waitFor(p, "Held for a check (1)");
    ok(t.includes("payment outside Lawfecta") && t.includes("Venmo"), "the team sees what was held and why");
    await click(p, "Do not deliver");
    await waitFor(p, "Not delivered; the member was told");
    ok((await sql("select status from conduct_flags"))[0].status === "actioned", "the decision is saved");
    t = await text(p);
    ok(t.includes("Client intake for a family law firm") && t.includes("Filled"), "the Gigs tab lists the gig");
    await s.ctx.close();

    console.log("\n" + passed + " browser checks passed");
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });

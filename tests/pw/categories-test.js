// Browser test of step 17 (docs/briefs/step-17-talent-categories.md): the website's categories on Talent and on the
// freelancer Profile page. Freelancer: find a category by typing (keyboard), browse category then specialty, pick, remove,
// save. Attorney: the search box suggests categories with their path, the three lists narrow each other, results show the
// freelancer's categories, free words search, Clear. Team: the "Website categories" card on the Tech catalog page.
// The website is the stand-in in tests/pw/server.ts (two categories, four specialties, three sub subs).
//   node tests/pw/categories-test.js   (with tests/pw/server.ts running)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://127.0.0.1:8787";
const ROOT = path.join(__dirname, "..", "..");
const SHOTS = process.env.SHOTS || path.join(ROOT, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
let passed = 0;
function ok(cond, msg) { if (!cond) throw new Error("FAILED: " + msg); passed++; console.log("ok", msg); }
async function fernStar(p) { return await p.evaluate(() => { const c = [...document.querySelector(".dela-host").shadowRoot.querySelectorAll(".talent-card")].find((x) => x.textContent.includes("Fern Family")); return c ? c.querySelectorAll(".talent-star").length : -1; }); }
async function sql(q) { const r = await fetch(BASE + "/test/sql", { method: "POST", body: JSON.stringify({ sql: q }) }); const j = await r.json(); if (j.error) throw new Error("sql: " + j.error); return j.rows; }
async function open(browser, widget, uid, query) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept());
  await page.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(ROOT, u.pathname.split("@")[1].split("/").slice(1).join("/")), contentType: "application/javascript" }); });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.route("https://www.lawfecta.co/**", (r) => r.abort());
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
async function waitGone(page, words, ms) {
  const end = Date.now() + (ms || 8000);
  let t = "";
  while (Date.now() < end) { t = await text(page); if (!t.includes(words)) return t; await page.waitForTimeout(200); }
  throw new Error("FAILED: still see \"" + words + "\"");
}
const click = (page, name) => dela(page).getByRole("button", { name, exact: true }).first().click();
const label = (page, name) => dela(page).getByLabel(name, { exact: true }).first();
const ATT = 4600, FL = 4601, FL2 = 4602, FL3 = 4603, TEAM = 4604;
const SEARCH = "Search roles, specialties, tasks and software";

(async () => {
  const browser = await chromium.launch();
  let s, p, t, before = null;
  try {
    // The suites after this one share the database: remember what this suite changes and put it back at the end
    before = (await sql("select (select jsonb_object_agg(key, state) from feature_switches where key in ('flex_gigs', 'profiles', 'talent_search', 'new_layout', 'gig_chat')) sw, (select value from settings where key = 'verify.freelancer_linkedin') li"))[0];
    // Step 18 part 3: the ready-made pictures are offered once the folder's web address is set
    await sql("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'profiles', 'talent_search', 'new_layout', 'gig_chat'); update settings set value = 'false' where key = 'verify.freelancer_linkedin'; select 1");
    await sql(`insert into people (bd_member_id, display_name, email) values (${ATT}, 'Cara Category', '${ATT}@test.invalid'), (${FL}, 'Nia Nurse', '${FL}@test.invalid'),
        (${FL2}, 'Fern Family', '${FL2}@test.invalid'), (${FL3}, 'Pat Picker', '${FL3}@test.invalid'), (${TEAM}, 'Theo Team', '${TEAM}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = ${ATT}), 'attorney', 'att_pro', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = x), 'freelancer', 'fl_plus', 'staff_grant') from unnest(array[${FL}, ${FL2}, ${FL3}]) x;
      insert into access_list (bd_member_id, channel) select x, 'access' from unnest(array[${ATT}, ${FL}, ${FL2}, ${FL3}]) x where not exists (select 1 from access_list where bd_member_id = x and channel = 'access' and revoked_at is null);
      insert into staff_roles (person_id, role) select id, 'support' from people where bd_member_id = ${TEAM} and not exists (select 1 from staff_roles s where s.person_id = people.id);
      insert into member_profiles (person_id, side, body, missing, score) select id, 'attorney', '{"firm_name":"Category Legal"}', '{}', 100 from people where bd_member_id = ${ATT} on conflict do nothing;
      insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) select id, 'l', 'TX', 'CT${ATT}', 'CT${ATT}', 'A', 'video', 'verified' from people where bd_member_id = ${ATT};
      select dela_profile_refresh((select id from people where bd_member_id = ${ATT}), 'attorney');
      insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"Nia","last_name":"Nurse","headline":"Nurse reviewer","categories":["s275"]}', '{}', 100, now() from people where bd_member_id = ${FL} on conflict do nothing;
      insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"Fern","last_name":"Family","headline":"Family paralegal","categories":["s327","s331"]}', '{}', 100, now() from people where bd_member_id = ${FL2} on conflict do nothing;
      update side_profiles set verification_state = 'verified', readiness_state = 'match_ready' where person_id in (select id from people where bd_member_id in (${FL}, ${FL2})) and side = 'freelancer'; select 1`);

    // ---------- Freelancer: pick categories on the Profile page ----------
    s = await open(browser, "DELA-App", FL3, "&tab=profile"); p = s.page;
    t = await waitFor(p, "Lawfecta categories", 15000);
    t = await waitFor(p, "None picked yet.", 10000);
    ok(t.includes("Attorneys search Talent by these categories."), "the Profile page explains what the categories are for");
    // Step 20: what match-ready means, and one progress bar toward it (this freelancer has filled in nothing yet)
    const bar = await p.evaluate(() => { const b = document.querySelector(".dela-host").shadowRoot.querySelector("#ready-card [role=progressbar]"); return b ? b.getAttribute("aria-valuenow") + " | " + b.getAttribute("aria-valuetext") : ""; });
    ok(/^Match-ready: 0 of \d+ steps done/m.test(t) && /^0 \| 0 of \d+ steps done$/.test(bar) && t.includes("steps to go."), "the Profile page counts the steps to match-ready on one progress bar: " + bar);
    ok(t.includes("1. Your profile (0 of") && t.includes("3. Your availability (0 of 1)") && t.includes("Availability confirmed in the last 14 days") && !t.includes("2. The Lawfecta Team's check"), "the steps are grouped: the profile items, then availability (the check is left out when it is not required)");
    const shown = await p.evaluate(() => { const n = document.querySelector(".dela-host").shadowRoot.querySelector("#talent-shown"); return n ? n.textContent : ""; });
    ok(shown.startsWith("Attorneys cannot see you in Talent yet.") && / required profile items are still empty/.test(shown) && shown.includes("your availability is not confirmed") && shown.includes("your picture included"), "a profile that is not in Talent says so, with the reasons: " + shown);
    await dela(p).locator("#ready-card summary").click();
    ok((await text(p)).includes("That takes three things: every required profile item is filled, the Lawfecta Team's check has passed, and you confirmed in the last 14 days that you can take work."), "match-ready is defined in plain words on the page");
    await dela(p).locator("#ready-card").getByRole("button", { name: /^Add it: / }).first().click();
    await p.waitForTimeout(700);
    ok(await p.evaluate(() => { const a = document.querySelector(".dela-host").shadowRoot.activeElement; return !!a && ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "SUMMARY"].includes(a.tagName) && !a.closest("#ready-card"); }), "a step that is not done has a link that jumps to where it is filled in");
    await label(p, "Find a category").fill("discov");
    await dela(p).locator(".cat-suggest li").first().waitFor({ timeout: 5000 });
    const opt = await dela(p).locator(".cat-suggest li").first().innerText();
    ok(opt.includes("Discovery Support") && opt.includes("Paralegal Services › Family Law"), "typing suggests a category with its place in the list: " + opt);
    await label(p, "Find a category").press("ArrowDown");
    ok(await label(p, "Find a category").getAttribute("aria-activedescendant") !== null, "the arrow keys move through the suggestions");
    await label(p, "Find a category").press("Enter");
    t = await waitFor(p, "Family Law › Discovery Support");
    ok(t.includes("Lawfecta categories (1 of 25 picked)"), "Enter picks it; the count shows the limit");
    await label(p, "Category to browse").selectOption({ label: "Legal Nurse & Medical Records" });
    await label(p, "Specialty to browse").selectOption({ label: "Medical Malpractice Review" });
    await click(p, "Medical Chronology Creation");
    t = await waitFor(p, "Medical Malpractice Review › Medical Chronology Creation");
    ok(await dela(p).getByRole("button", { name: "Medical Chronology Creation", exact: true }).getAttribute("aria-pressed") === "true", "browsing: category, then specialty, then a task button that shows it is picked");
    await click(p, "All of Medical Malpractice Review");
    await dela(p).getByRole("button", { name: "Remove Medical Malpractice Review", exact: true }).click();
    t = await waitGone(p, "Remove Medical Malpractice Review");
    ok(t.includes("2 of 25 picked"), "a picked category can be removed with its ×");
    await p.screenshot({ path: path.join(SHOTS, "categories-profile.png"), fullPage: true });
    // Step 18 part 3: a ready-made picture, from one compact group of choices
    await dela(p).locator("#prof-avatars summary").click();
    const radios = dela(p).locator("#prof-avatars").getByRole("radio");
    ok(await radios.count() === 48 && (await text(p)).includes("It is never treated as a photo of you"), "all the ready-made pictures are offered in one folded group, with what they are not");
    await dela(p).locator("#prof-avatars").getByRole("radio", { name: "Ready-made picture 48 of 48", exact: true }).click();
    await waitFor(p, "A ready-made picture. It is an illustration, not a photo of you.");
    ok(await dela(p).locator("#prof-avatars").getByRole("radio", { name: "Ready-made picture 48 of 48", exact: true }).getAttribute("aria-checked") === "true" && await dela(p).locator("#prof-avatars").getByRole("radio", { checked: true }).count() === 1, "one picture is chosen and marked");
    ok((await text(p)).includes("This picture is not saved yet.") && await dela(p).locator("#photo-pending").getByRole("button", { name: "Save my picture", exact: true }).count() === 1, "choosing a picture says it is not saved yet and offers \"Save my picture\" right there");
    await dela(p).locator("#prof-avatars").getByRole("radio", { name: "Ready-made picture 48 of 48", exact: true }).focus();
    await p.keyboard.press("ArrowLeft");
    ok(await p.evaluate(() => document.querySelector(".dela-host").shadowRoot.activeElement.getAttribute("aria-label")) === "Ready-made picture 47 of 48", "the arrow keys move between the pictures");
    // The button reads "Save", "Save to DELA only" or "Save and update my directory listing", by the listing tick
    await dela(p).locator("#photo-pending").getByRole("button", { name: "Save my picture", exact: true }).click();
    await waitFor(p, "Profile saved, with your picture.", 10000);
    ok(await dela(p).locator("#photo-pending").count() === 0, "after saving, the not-saved note is gone");
    const saved = (await sql(`select body->'categories' c from member_profiles where side = 'freelancer' and person_id = (select id from people where bd_member_id = ${FL3})`))[0];
    ok(saved && JSON.stringify(saved.c) === JSON.stringify(["s327", "s275"]), "Save keeps the picks in order: " + JSON.stringify(saved && saved.c));
    ok((await sql(`select body->>'avatar' a from member_profiles where side = 'freelancer' and person_id = (select id from people where bd_member_id = ${FL3})`))[0].a === "jimis-avatar-icons-collection-48.png", "Save keeps the chosen picture");
    await s.ctx.close();

    // ---------- Attorney: Talent ----------
    s = await open(browser, "DELA-App", ATT, "&tab=talent"); p = s.page;
    t = await waitFor(p, "Find a freelancer", 15000);
    t = await waitFor(p, "Fern Family", 10000);
    ok(t.includes("Nia Nurse") && t.includes("Paralegal Services: Discovery Support, Clio"), "results list everyone match-ready, each with their categories grouped by category");
    ok(!t.includes("Tech tool") && !t.includes("Choose a category first"), "the old free-text boxes are gone and no filter waits for another");
    // Step 22 (mockup 02): five filters that each work on their own, and the match-ready help
    ok(await label(p, "Practice area / Specialty").isEnabled() && await label(p, "Services / Tasks").isEnabled() && await label(p, "Software").isEnabled() && await label(p, "State / Jurisdiction").isEnabled(), "every filter can be used without choosing a category first");
    ok(await label(p, "Software").locator("option", { hasText: "Filevine" }).count() === 1, "the Software filter lists the software names");
    ok(t.includes("You can message a freelancer before hiring. A posted gig is required to invite a freelancer to submit a proposal."), "the page says what needs a gig and what does not");
    const mrBtn = dela(p).getByRole("button", { name: "What does match-ready mean?" });
    ok(await mrBtn.getAttribute("aria-expanded") === "false", "the match-ready help starts closed");
    await mrBtn.click();
    t = await waitFor(p, "Match-ready does not guarantee qualifications, fit or availability for a particular project.");
    ok(await mrBtn.getAttribute("aria-expanded") === "true" && t.includes("Confirmed their availability within the last 14 days") && t.includes("Passed the Lawfecta Team's member check"), "a click pins the match-ready help open, with the real number of days");
    await p.keyboard.press("Escape");
    ok(await mrBtn.getAttribute("aria-expanded") === "false" && await dela(p).locator("#mr-panel").isHidden(), "Escape closes the match-ready help");
    ok(await fernStar(p) === 0, "a freelancer with no reviews shows no star");
    // Automated accessibility rules (axe-core: WCAG 2.0, 2.1 and 2.2, levels A and AA), and a phone 320 wide
    const axeSrc = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
    const axe = async (page, sel, what) => {
      if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: axeSrc });
      const v = await page.evaluate(async (s) => {
        const r = await window.axe.run({ include: [[".dela-host", s]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
        return r.violations.map((x) => x.id + " (" + x.impact + "): " + x.nodes.slice(0, 3).map((n) => n.target.join(" ") + " [" + (n.failureSummary || "").split("\n").slice(1, 3).join("; ").slice(0, 160) + "]").join(" || "));
      }, sel);
      ok(v.length === 0, "accessibility rules pass on " + what + (v.length ? ": " + v.join(" ### ") : ""));
    };
    await axe(p, ".talent-page", "the Talent search page");
    const wide = p.viewportSize();
    await p.setViewportSize({ width: 320, height: 720 }); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "Talent fits a phone 320 wide with no sideways scrolling");
    const fernPhone = dela(p).locator(".talent-card", { hasText: "Fern Family" });
    ok(await fernPhone.getByRole("button", { name: "View profile" }).isVisible() && await fernPhone.getByLabel("Gig to invite Fern Family for").isVisible(), "on a phone the card keeps View profile and the gig to invite for");
    await p.setViewportSize(wide); await p.waitForTimeout(200);
    // Step 18: each card has two actions only, and an invitation needs a posted gig chosen first
    const fern = dela(p).locator(".talent-card", { hasText: "Fern Family" });
    const btns = await fern.getByRole("button").allInnerTexts();
    ok(btns.join("|") === "View profile|Invite to this gig", "a result card has two buttons only: " + btns.join("|"));
    ok(await fern.getByRole("button", { name: "Invite to this gig" }).isDisabled() && t.includes("You have no posted gig that is open for proposals") && t.includes("No reviews yet") && t.includes("✓ Verified"), "no posted gig: the invitation is off and the page says why; cards say Verified and that there are no reviews");
    ok(t.includes("It does not hire them or award the work."), "the card says an invitation asks for a proposal and hires nobody");
    const org = (await sql(`select dela_side_org((select id from people where bd_member_id = ${ATT}), 'attorney') o, (select id from people where bd_member_id = ${ATT}) a`))[0];
    const pb = (await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by, doc_type) values ('${org.o}', 'Category gig', 'approved', 1, 1, 100, 'cat-pb', '${org.a}', 'sop') returning id`))[0].id;
    await sql(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, request_id) values ('${org.o}', '${org.a}', '${pb}', 1, 'Organize discovery responses', '{}', 30000, 40000, 'open', 'cat-gig'),
      ('${org.o}', '${org.a}', '${pb}', 1, 'A draft nobody should see', '{}', 30000, 40000, 'draft', 'cat-gig2'); select 1`);
    await click(p, "Search freelancers");
    await waitGone(p, "You have no posted gig that is open for proposals");
    const gigSel = fern.getByLabel("Gig to invite Fern Family for");
    const opts = await gigSel.locator("option").allInnerTexts();
    ok(opts.join("|") === "Select one of your posted gigs|Organize discovery responses", "the list holds only posted gigs open for proposals, with nothing chosen at first: " + opts.join("|"));
    ok(await fern.getByRole("button", { name: "Invite to this gig" }).isDisabled(), "the invitation stays off until a gig is chosen");
    // Step 18 part 3: the button opens a review step; nothing is sent until the attorney confirms there
    await gigSel.selectOption({ label: "Organize discovery responses" });
    await fern.getByRole("button", { name: "Invite to this gig" }).click();
    await waitFor(p, "Invite Fern Family to submit a proposal");
    t = await waitFor(p, "Proposals close");
    ok(t.includes("2. Review the gig") && t.includes("Organize discovery responses") && t.includes("Budget") && t.includes("Nobody is hired at this step.") && t.includes("It does not hire them, award the work or create anything to pay."), "the review step shows the gig, its budget and that nobody is hired");
    ok(await label(p, "Existing gig").inputValue() !== "" && (await sql("select count(*)::int n from gig_invitations i join gigs g on g.id = i.gig_id where g.request_id = 'cat-gig'"))[0].n === 0, "the chosen gig is kept, and nothing is sent yet");
    await label(p, "Message to the freelancer (optional)").fill("Your discovery experience fits this gig.");
    await click(p, "Send invitation to submit a proposal");
    t = await waitFor(p, "Invitation sent");
    ok(t.includes("Fern Family is invited to send a proposal for") && t.includes("Nobody is hired and nothing is charged until you choose a proposal"), "the confirmation says what was sent and what happens next");
    const sentInv = (await sql(`select i.message, (select count(*)::int from gig_invitations x where x.gig_id = i.gig_id) n from gig_invitations i join gigs g on g.id = i.gig_id where g.request_id = 'cat-gig' and i.freelancer_id = (select id from people where bd_member_id = ${FL2})`))[0];
    ok(sentInv && sentInv.n === 1 && sentInv.message === "Your discovery experience fits this gig." && (await sql("select count(*)::int n from agreements a join gigs g on g.id = a.gig_id where g.request_id = 'cat-gig'"))[0].n === 0, "one invitation with the note, and nobody is hired");
    await click(p, "Back to Talent search");
    await waitFor(p, "Fern Family");
    await gigSel.selectOption({ label: "Organize discovery responses" });
    await fern.getByRole("button", { name: "Invite to this gig" }).click();
    await waitFor(p, "Invite Fern Family to submit a proposal");
    await waitFor(p, "Proposals close");
    await click(p, "Send invitation to submit a proposal");
    await waitFor(p, "was already invited");
    await click(p, "Back to Talent search");
    await waitFor(p, "Nia Nurse");
    // A gig that closes while the review step is open: a clear message and no invitation
    const nia = dela(p).locator(".talent-card", { hasText: "Nia Nurse" });
    await nia.getByLabel("Gig to invite Nia Nurse for").selectOption({ label: "Organize discovery responses" });
    await nia.getByRole("button", { name: "Invite to this gig" }).click();
    await waitFor(p, "Invite Nia Nurse to submit a proposal");
    await waitFor(p, "Proposals close");
    await sql("update gigs set status = 'closed' where request_id = 'cat-gig'; select 1");
    await click(p, "Send invitation to submit a proposal");
    await waitFor(p, "no longer takes proposals, so no invitation was sent");
    ok((await sql(`select count(*)::int n from gig_invitations i join gigs g on g.id = i.gig_id where g.request_id = 'cat-gig'`))[0].n === 1, "a closed gig takes no invitation");
    await click(p, "Cancel");
    await waitFor(p, "You have no posted gig that is open for proposals");
    ok((await fern.getByLabel("Gig to invite Fern Family for").locator("option").allInnerTexts()).join("|") === "No posted gig is open for proposals", "the closed gig is gone from every card's list");
    t = await text(p);
    // Step 22: a specialty can be picked with no category chosen; it shows where it sits and searches
    await label(p, "Practice area / Specialty").selectOption({ label: "Family Law" });
    await waitGone(p, "Nia Nurse");
    ok(await label(p, "Category").inputValue() === "p40" && (await text(p)).includes("Fern Family"), "picking a specialty first fills in its category and searches");
    await click(p, "Reset");
    await waitFor(p, "Nia Nurse");
    ok(await label(p, "Category").inputValue() === "" && await label(p, "Practice area / Specialty").inputValue() === "", "Reset empties the filters and shows everyone again");
    await label(p, SEARCH).fill("chron");
    await dela(p).locator(".cat-suggest li").first().waitFor({ timeout: 5000 });
    await dela(p).locator(".cat-suggest li").first().click();
    t = await waitGone(p, "Fern Family");
    ok(t.includes("Nia Nurse") && t.includes("1 freelancer found"), "picking a suggestion searches that category");
    ok(await label(p, "Category").inputValue() === "p39" && await label(p, "Practice area / Specialty").inputValue() === "s267" && await label(p, "Services / Tasks").inputValue() === "s275", "the three lists show where the picked category sits");
    await label(p, "Category").selectOption({ label: "Paralegal Services" });
    t = await waitFor(p, "Fern Family");
    ok(!t.includes("Nia Nurse"), "a category finds everyone in the categories below it");
    const subs = await label(p, "Practice area / Specialty").locator("option").allInnerTexts();
    ok(subs.join("|") === "Any specialty|Civil Litigation|Family Law", "the specialties are the chosen category's only: " + subs.join("|"));
    await label(p, "Practice area / Specialty").selectOption({ label: "Civil Litigation" });
    t = await waitGone(p, "Fern Family");
    ok(t.includes("No match-ready freelancers fit this search yet."), "an empty result says to try a broader category");
    await click(p, "Clear all");
    t = await waitFor(p, "Nia Nurse");
    ok(t.includes("Fern Family"), "Clear all shows everyone again");
    await label(p, SEARCH).fill("family paralegal");
    await label(p, SEARCH).press("Escape");
    ok(await label(p, SEARCH).inputValue() === "family paralegal", "Escape closes the suggestions and keeps the typed words");
    await label(p, SEARCH).press("Enter");
    t = await waitGone(p, "Nia Nurse");
    ok(t.includes("Fern Family"), "Enter searches the typed words");
    await p.screenshot({ path: path.join(SHOTS, "categories-talent.png"), fullPage: true });

    // ---------- Attorney: the full profile page (step 18 part 2) ----------
    await sql(`update member_profiles set body = body || '{"summary":"I prepare family law filings.","experience":"Paralegal, family law firm, 2019 to now\\nLegal assistant, 2016 to 2019","education":"Paralegal certificate","timezone":"Central","capacity_hours_week":15,
      "practice_areas":["Family law"],"software":["Clio"],"services":[{"title":"Discovery responses","for_whom":"Family law firms","price_from_cents":25000,"price_to_cents":40000,"unit":"fixed"}],"phone":"512-555-0100","website":"https://fern.example.com"}'::jsonb
      where side = 'freelancer' and person_id = (select id from people where bd_member_id = ${FL2}); select 1`);
    await dela(p).locator(".talent-card", { hasText: "Fern Family" }).getByRole("button", { name: "View profile" }).click();
    await waitFor(p, "← Back to Talent search");
    t = await waitFor(p, "Quick facts");
    ok(p.url().includes("tab=talent") && p.url().includes("person=") && await dela(p).getByRole("dialog").count() === 0, "View profile opens a page with its own address, not a pop-up");
    await axe(p, ".tp", "the freelancer profile page");
    await p.goBack();
    await waitFor(p, "Find a freelancer");
    await waitFor(p, "Fern Family", 10000);
    ok(!p.url().includes("person=") && await label(p, SEARCH).inputValue() === "family paralegal", "the browser's Back button returns from the profile to the same search");
    await dela(p).locator(".talent-card", { hasText: "Fern Family" }).getByRole("button", { name: "View profile" }).click();
    await waitFor(p, "Quick facts");
    ok(t.includes("Professional summary") && t.includes("Primary services") && t.includes("Software expertise") && t.includes("What does verified mean?") && t.includes("I prepare family law filings.") && t.includes("✓ Verified") && t.includes("No reviews yet") && t.includes("15 hours a week") && t.includes("Invite for gig:"), "the page shows who this is, what was checked, the real review state and the invitation");
    ok(!t.includes("512-555") && !t.includes("fern.example.com") && !t.includes("@test.invalid"), "no phone, website or email on the profile");
    const tabs = await dela(p).getByRole("tab").allInnerTexts();
    ok(tabs.join("|") === "Overview|Services|Experience and qualifications|Portfolio|Reviews", "the sections are tabs of the same page: " + tabs.join("|"));
    await dela(p).getByRole("tab", { name: "Overview" }).focus();
    await p.keyboard.press("ArrowRight");
    t = await waitFor(p, "Services offered");
    ok(await dela(p).getByRole("tab", { name: "Services" }).getAttribute("aria-selected") === "true" && t.includes("Discovery responses") && /250(\.00)? to \$?400/.test(t.replace(/,/g, "")), "the arrow keys move between tabs; services show their price range");
    await dela(p).getByRole("tab", { name: "Experience and qualifications" }).click();
    t = await waitFor(p, "Professional experience");
    ok(t.includes("Paralegal, family law firm, 2019 to now") && t.includes("Paralegal certificate") && t.includes("Lawfecta does not check each item."), "experience and education in sections, with what is and is not checked");
    await dela(p).getByRole("tab", { name: "Portfolio" }).click();
    await waitFor(p, "has not shown any work samples yet.");
    await dela(p).getByRole("tab", { name: "Reviews" }).click();
    await waitFor(p, "A review can only be left after a completed Lawfecta engagement");
    ok(await dela(p).locator(".drawer").count() === 0, "reviews are inside the profile, with no drawer");
    await dela(p).getByRole("tab", { name: "Services" }).click();
    t = await waitFor(p, "FIRST10");
    ok(t.includes("FIRST10") && t.includes("10% off the first fixed-fee project.") && !t.includes("A blog article"), "promotions sit inside Services and come from the website's Promotion posts only");
    await p.reload();
    await waitFor(p, "Professional summary", 15000);
    await click(p, "← Back to Talent search");
    t = await waitFor(p, "Find a freelancer");
    ok(!p.url().includes("person="), "the way back leaves the profile's address");
    await s.ctx.close();
    s = await open(browser, "DELA-App", ATT, "&tab=talent"); p = s.page;
    await waitFor(p, "Fern Family", 15000);
    await label(p, SEARCH).fill("family paralegal");
    await label(p, SEARCH).press("Escape");
    await label(p, SEARCH).press("Enter");
    await waitGone(p, "Nia Nurse");
    await dela(p).locator(".talent-card", { hasText: "Fern Family" }).getByRole("button", { name: "View profile" }).click();
    await waitFor(p, "Professional summary");
    await click(p, "← Back to Talent search");
    await waitFor(p, "Fern Family", 10000);
    ok(await label(p, SEARCH).inputValue() === "family paralegal" && !(await text(p)).includes("Nia Nurse"), "back from a profile, the search is as it was");
    // ---------- Step 18 part 4: a conversation before a gig, and a gig made for that freelancer ----------
    await dela(p).locator(".talent-card", { hasText: "Fern Family" }).getByRole("button", { name: "View profile" }).click();
    await waitFor(p, "Professional summary");
    // Bookmarks: saved through the website's bookmark system, privately
    const bmBtn = dela(p).locator("#tp-bookmark").getByRole("button");
    await dela(p).locator("#tp-bookmark").getByRole("button", { name: "Bookmark Fern Family" }).click();
    await waitFor(p, "Saved to your bookmarks. Fern Family is not told.");
    ok(await bmBtn.getAttribute("aria-pressed") === "true" && (await bmBtn.innerText()).includes("Bookmarked"), "the Bookmark button saves the freelancer and shows it is on");
    await click(p, "Send message");
    t = await waitFor(p, "A conversation before any gig.");
    ok(t.includes("Fern Family") && t.includes("Messages only: files and meetings come with a gig. Nobody is hired here.") && !t.includes("Book a meeting") && !t.includes("Open the gig"), "Send message opens a conversation with no gig: messages only, and it says nobody is hired");
    ok((await sql(`select count(*)::int n from threads where intro_attorney = (select id from people where bd_member_id = ${ATT}) and freelancer_person = (select id from people where bd_member_id = ${FL2})`))[0].n === 1, "one conversation before a gig exists for the two");
    await click(p, "Create a gig for Fern Family");
    t = await waitFor(p, "You are creating a gig for Fern Family.");
    ok(t.includes("the invitation to Fern Family opens next"), "the gig is made for that freelancer: after posting, the invitation opens");
    await s.ctx.close();
    // Talent, bookmarked only
    s = await open(browser, "DELA-App", ATT, "&tab=talent"); p = s.page;
    await waitFor(p, "Nia Nurse", 15000);
    await dela(p).getByLabel("Bookmarked only (freelancers you saved)").check();
    t = await waitGone(p, "Nia Nurse");
    ok(t.includes("Fern Family") && t.includes("1 freelancer found") && await dela(p).getByRole("button", { name: "Remove filter: Bookmarked" }).count() === 1 && await dela(p).locator(".talent-marked").count() === 1, "Bookmarked only shows the saved freelancers, as a removable filter, each marked");
    await s.ctx.close();
    // 10 at a time with "Load more" on the same screen (the size is a setting; 1 here so two people make two pages)
    await sql("update settings set value = '1' where key = 'talent.page_size'; select 1");
    s = await open(browser, "DELA-App", ATT, "&tab=talent"); p = s.page;
    t = await waitFor(p, "Load more freelancers", 15000);
    const total = Number((t.match(/Showing 1 of (\d+) freelancers/) || [])[1] || 0);
    ok(total >= 2 && await dela(p).locator(".talent-card").count() === 1 && t.includes(total + " freelancers found"), "Talent shows one page and says how many there are in all: " + total);
    const firstName = await dela(p).locator(".talent-card h3").first().innerText();
    await click(p, "Load more freelancers");
    await waitFor(p, "Showing 2 of " + total);
    const names = await dela(p).locator(".talent-card h3").allInnerTexts();
    ok(names.length === 2 && names[0] === firstName && names[1] !== firstName && !p.url().includes("page="), "Load more adds the next freelancer under the first, on the same screen: " + names.join(", "));
    ok(await p.evaluate(() => { const a = document.querySelector(".dela-host").shadowRoot.activeElement; return !!a && a.classList.contains("talent-card") && a.getAttribute("aria-label"); }) === names[1], "after Load more the keyboard is on the first new freelancer");
    await sql("update settings set value = '50' where key = 'talent.page_size'; select 1");
    await s.ctx.close();
    // DELA suggests the freelancers who fit a document; a chat starts from there
    await sql(`update playbooks set practice_area = 'Family law' where request_id = 'cat-pb';
      insert into playbook_versions (playbook_id, version, body, created_by) select id, 1, '{"title":"Category gig","practice_area":"Family law","steps":[{"text":"Open the matter","tool":"Clio"}]}', created_by from playbooks where request_id = 'cat-pb'; select 1`);
    const fitPb = (await sql("select id from playbooks where request_id = 'cat-pb'"))[0].id;
    s = await open(browser, "DELA-App", ATT, "&tab=library&pb=" + fitPb); p = s.page;
    await waitFor(p, "Freelancers who fit this work", 20000);
    t = await waitFor(p, "Why: Family law", 10000);
    ok(t.includes("Fern Family") && t.includes("Uses Clio") && !t.includes("Nia Nurse"), "a document shows the freelancers who fit it, with the reasons");
    await dela(p).locator(".fit-row", { hasText: "Fern Family" }).getByRole("button", { name: "Start a chat" }).click();
    await waitFor(p, "A conversation before any gig.");
    ok((await sql(`select count(*)::int n from threads where intro_attorney is not null and freelancer_person = (select id from people where bd_member_id = ${FL2})`))[0].n === 1, "Start a chat opens the same conversation, not a second one");
    await s.ctx.close();

    // ---------- The Lawfecta Team: the Website categories card ----------
    s = await open(browser, "DELA-Admin", TEAM, "&tab=catalog"); p = s.page;
    t = await waitFor(p, "Website categories", 15000);
    t = await waitFor(p, "2 categories, 3 specialties, 4 tasks, case types and software.", 10000);
    // What started the first copy depends on what ran before this suite (first use, or the daily job), so only the result is checked
    ok(/[23] freelancers have picked categories\./.test(t) && t.includes("Copied: 2 categories, 7 below them"), "the card counts the copy and lists it: " + (t.split("Website categories")[1] || "").slice(0, 500));
    await click(p, "Refresh now");
    t = await waitFor(p, "Copied 2 categories and 7 below them.", 10000);
    const last = (await sql("select source, ok, subs from bd_category_syncs order by at desc limit 1"))[0];
    ok(last.source === "team" && last.ok && last.subs === 7 && t.includes("Copied: 2 categories, 7 below them"), "Refresh now copies the categories again and lists it");
    await s.ctx.close();

    console.log(`\n${passed} checks passed`);
  } finally {
    if (before) {
      for (const k of Object.keys(before.sw || {})) await sql(`update feature_switches set state = '${before.sw[k]}' where key = '${k}'; select 1`);
      await sql(`update settings set value = '${JSON.stringify(before.li)}'::jsonb where key = 'verify.freelancer_linkedin'; select 1`);
      await sql("update settings set value = '50' where key = 'talent.page_size'; select 1");
    }
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });

// Step 38: posting a gig in three steps (docs/briefs/step-38-new-gig.md), with the new layout on. An attorney with one
// approved document: the page opens from "+ New Gig" and from the Gigs tab, the stepper names the current step, every
// field has a visible label, mistakes are said in words beside the field, the costs come from the fee rule, DELA's
// draft opens on step 2 with what was entered kept, step 3 shows the costs and what freelancers will see, and the gig
// is posted only after the attorney ticks the confirmation. Also: no approved document, and a 320 pixel screen.
//   node tests/pw/newgig-test.js   (with tests/pw/server.ts running)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://127.0.0.1:8787";
const ROOT = path.join(__dirname, "..", "..");
const SHOTS = process.env.SHOTS || path.join(ROOT, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
let passed = 0, popups = 0;
function ok(cond, msg) { if (!cond) throw new Error("FAILED: " + msg); passed++; console.log("ok", msg); }
async function sql(q) { const r = await fetch(BASE + "/test/sql", { method: "POST", body: JSON.stringify({ sql: q }) }); const j = await r.json(); if (j.error) throw new Error("sql: " + j.error); return j.rows; }
async function open(browser, uid, query, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1280, height: 900 } });
  // Step 43: the folded sections of "Agreement and work" are open, as with "Open all sections" (the folded page has its own checks in engagements-test.js)
  await ctx.addInitScript((all) => { try { if (all) (localStorage.setItem("dela_eg_all", "1"), localStorage.setItem("dela_pf_all", "1")); else localStorage.removeItem("dela_eg_all"); } catch (e) { /* no storage */ } }, true);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => { popups++; d.accept(); });
  await page.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); const rel = u.pathname.split("@")[1].split("/").slice(1).join("/"); route.fulfill({ path: path.join(ROOT, rel), contentType: "application/javascript" }); });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto(`${BASE}/page/DELA-App?uid=${uid}&plan=${query || ""}`);
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
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(0, 2500));
}
const inShadow = (page, fn, arg) => page.evaluate(([f, a]) => (new Function("root", "arg", "return (" + f + ")(root, arg)"))(document.querySelector(".dela-host").shadowRoot, a), [fn.toString(), arg]);
const fits = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const step = (page) => inShadow(page, (root) => { const li = root.querySelector(".gs-steps li[aria-current=step]"); return li ? li.innerText.replace(/\s+/g, " ").trim() : ""; });
const focusId = (page) => inShadow(page, (root) => root.activeElement ? root.activeElement.id : "");
async function makeMember(bd, side, plan) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, 'Member ${bd}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side((select id from people where bd_member_id = ${bd}), '${side}', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and channel = 'access' and revoked_at is null); select 1`);
}
const PB = JSON.stringify({ title: "New client intake", outcome: "An opened file", practice_area: "Family law", jurisdiction: "Texas (TX)", steps: [{ text: "Run the conflict check" }, { text: "Open the file in Clio", tool: "Clio" }, { text: "Attorney reviews", who: "attorney" }], checks: ["Checked"], review_points: ["Attorney signs"], deliverables: "Opened file" }).replace(/'/g, "''");
const KEYS = "'flex_gigs', 'talent_search', 'ai_generation', 'playbook_library', 'profiles', 'engagements', 'new_layout', 'recurring_engagements'";
const ATT = 5401, BARE = 5402;

(async () => {
  const browser = await chromium.launch();
  let before = null, s, p, t;
  try {
    before = (await sql(`select jsonb_object_agg(key, state) sw from feature_switches where key in (${KEYS})`))[0].sw;
    await sql(`update feature_switches set state = 'everyone' where key in (${KEYS})`);
    for (const bd of [ATT, BARE]) {
      await makeMember(bd, "attorney", "att_pro");
      await sql(`insert into member_profiles (person_id, side, body, missing, score) select id, 'attorney', '{"first_name":"Nora","last_name":"Newgig","firm_name":"Example Legal ${bd}"}', '{}', 100 from people where bd_member_id = ${bd} on conflict do nothing;
        insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) select id, 'l${bd}', 'TX', '${bd}', '${bd}', 'Nora Newgig', 'video', 'verified' from people where bd_member_id = ${bd} and not exists (select 1 from licenses l where l.person_id = people.id);
        select dela_profile_refresh(id, 'attorney') from people where bd_member_id = ${bd}`);
    }
    await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, practice_area, request_id, created_by)
      select dela_side_org(id, 'attorney'), 'New client intake', 'approved', 1, 1, 100, 'Family law', 'ng${ATT}', id from people where bd_member_id = ${ATT} and not exists (select 1 from playbooks where request_id = 'ng${ATT}');
      insert into playbook_versions (playbook_id, version, body, created_by) select p.id, 1, '${PB}', p.created_by from playbooks p where p.request_id = 'ng${ATT}' and not exists (select 1 from playbook_versions v where v.playbook_id = p.id)`);
    const gigsBefore = (await sql(`select count(*)::int n from gigs where org_id = dela_side_org((select id from people where bd_member_id = ${ATT}), 'attorney')`))[0].n;

    // ---------- Step 1: the page, its labels and its mistakes ----------
    s = await open(browser, ATT, "&tab=projects");
    p = s.page;
    await waitFor(p, "Manage your gigs, awarded work, milestones and standing arrangements.");
    await dela(p).locator("#pj-new").click();
    await dela(p).getByRole("button", { name: "From an approved document" }).click();
    t = await waitFor(p, "Post a New Gig");
    t = await waitFor(p, "Choose the work");
    ok((await step(p)) === "1 Step 1 of 3, current: Set up your gig" && await dela(p).locator(".gs-steps li").count() === 3, "a page of its own, with the three steps and the current one named: " + await step(p));
    ok(!t.includes("Needs your attention") && !t.includes("Quick actions") && await dela(p).locator(".pj-tabs").count() === 0, "the Projects sections are not on this page");
    // Step 44: one form card with three headings; no numbered sections, no side panels, no second list of the steps
    const form = await inShadow(p, (root) => ({ cards: root.querySelectorAll(".gs-page .card").length, heads: [...root.querySelectorAll(".gs-form h2")].map((x) => x.textContent).join("|"), side: root.querySelectorAll(".gs-side").length, steps: [...root.querySelectorAll(".gs-steps li")].map((li) => li.lastChild.lastChild.textContent).join("|") }));
    ok(form.cards === 1 && form.heads === "Choose the work|Engagement type|Budget & requirements" && form.side === 0 && form.steps === "Set up your gig|Review DELA draft|Review & post", "one form with three headings, no side panels, and the three steps named once: " + JSON.stringify(form));
    ok(!t.includes("Estimated costs") && !t.includes("What happens next") && !/\b[123]\. (Choose|Add)/.test(t) && t.includes("Protect client information") && t.includes("Do not include client names, confidential case details, account numbers or passwords."), "no numbered sections, no \"Estimated costs\" or \"What happens next\" panels, and the client information notice is in view");
    ok(t.includes("One project, fixed price") && t.includes("Recurring work, monthly price") && t.includes("Nothing is posted until you review and post.") && /(Drafting uses \d+ DELA actions? from your plan\.|This draft uses no DELA actions\.)/.test(t), "the two types in a few words, and beside Draft with DELA: nothing is posted, and how many DELA actions a draft uses");
    ok(!t.includes("Save draft") && !/saved automatically/i.test(t), "step 1 offers no Save draft and claims no saving: nothing is stored before DELA writes the draft");
    const labels = await inShadow(p, (root) => ["gs-doc", "gs-bmin", "gs-bmax", "gs-deadline", "gs-notes", "gs-one", "gs-mon"].map((id) => { const l = root.querySelector('label[for="' + id + '"]'); return id + ":" + (l && l.getBoundingClientRect().height > 0 ? "y" : "n") + ":" + (root.getElementById(id).getAttribute("placeholder") ? "p" : ""); }));
    ok(labels.every((x) => x.endsWith(":y:")), "every field has a visible label tied to it, and none relies on grey words in the box: " + labels.join(" "));
    ok(await inShadow(p, (root) => { const f = root.querySelector("fieldset.gs-set"); return !!f && f.querySelector("legend").textContent.includes("Engagement type") && f.querySelectorAll("input[type=radio][name=gs_kind]").length === 2; }), "One-off and Monthly are one labeled group of two choices");
    ok(t.includes("The platform fee is calculated from your plan and shown before you post. Enter a budget to see an estimate here.") && await dela(p).locator(".gs-costline").count() === 0, "with no budget there is no estimate and no invented amount, only where the fee comes from");
    // Mistakes are said in words, beside the field, and focus goes to the first one
    await dela(p).locator("#gs-draft").click();
    await p.waitForTimeout(200);
    let errs = await inShadow(p, (root) => ({ doc: root.getElementById("gs-doc-err").textContent, bud: root.getElementById("gs-budget-err").textContent, inv: root.getElementById("gs-doc").getAttribute("aria-invalid"), desc: root.getElementById("gs-doc").getAttribute("aria-describedby") }));
    ok(errs.doc === "Choose an approved SOP or Workflow." && errs.bud === "Enter the lowest budget, in dollars." && errs.inv === "true" && errs.desc.includes("gs-doc-err") && (await focusId(p)) === "gs-doc", "an empty form names each mistake at its field and puts focus on the first: " + JSON.stringify(errs));
    ok((await sql(`select count(*)::int n from gigs where org_id = dela_side_org((select id from people where bd_member_id = ${ATT}), 'attorney')`))[0].n === gigsBefore, "nothing was created");
    await dela(p).getByLabel("Approved SOP or workflow", { exact: true }).selectOption({ label: "New client intake" });
    const prev = await inShadow(p, (root) => { const a = root.getElementById("gs-preview"); return { href: a.getAttribute("href") || "", target: a.target, hidden: a.hidden }; });
    ok(/^\/dela\?tab=library&pb=[0-9a-f-]{36}$/.test(prev.href) && prev.target === "_blank" && !prev.hidden, "Preview document is a real link to that document, in a new tab: " + JSON.stringify(prev));
    await dela(p).getByLabel("Budget from (USD)", { exact: true }).fill("100");
    await dela(p).locator("#gs-draft").click();
    await p.waitForTimeout(200);
    ok(/^The budget must be at least \$\d/.test(await inShadow(p, (root) => root.getElementById("gs-budget-err").textContent)), "a budget under the minimum is refused with the minimum named");
    await dela(p).getByLabel("Budget from (USD)", { exact: true }).fill("600");
    await dela(p).getByLabel("Budget to (USD)", { exact: true }).fill("300");
    await dela(p).locator("#gs-draft").click();
    await p.waitForTimeout(200);
    ok((await inShadow(p, (root) => root.getElementById("gs-budget-err").textContent)).includes("must be the same as \"Budget from\" or higher") && (await focusId(p)) === "gs-bmax", "a range that runs backwards is refused at the second box");
    await dela(p).getByLabel("Budget from (USD)", { exact: true }).fill("300");
    await dela(p).getByLabel("Budget to (USD)", { exact: true }).fill("600");
    // A deadline in the past is refused beside the box, and what was typed stays
    await dela(p).getByLabel("Work deadline (optional)", { exact: true }).fill("2020-01-01");
    await dela(p).locator("#gs-draft").click();
    await p.waitForTimeout(200);
    ok((await inShadow(p, (root) => root.getElementById("gs-deadline-err").textContent)).startsWith("The work deadline cannot be in the past.") && (await focusId(p)) === "gs-deadline" && await inShadow(p, (root) => root.getElementById("gs-bmin").value === "300" && root.getElementById("gs-bmax").value === "600"), "a deadline in the past is refused at its box and the budget stays");
    await dela(p).getByLabel("Work deadline (optional)", { exact: true }).fill("2099-03-01");
    await dela(p).getByLabel("Additional details (optional)", { exact: true }).fill("Clio experience is required.");
    t = await text(p);
    const costs = await inShadow(p, (root) => [...root.querySelectorAll("#gs-costs .gs-costline")].map((x) => x.innerText.replace(/\s+/g, " ").trim()));
    ok(costs.join("|") === "Your budget $300 to $600|Platform fee (5%, at least $10) $15 to $30|Estimated total $315 to $630", "the costs follow the fee rule from the api: " + costs.join("|"));
    ok(t.includes("28 of 1,500 characters"), "the details box counts its characters");
    // Leaving and coming back keeps what was entered
    await dela(p).locator("#gs-back").click();
    await waitFor(p, "Needs your attention");
    // One way to start a gig (step 40): the Gigs tab has no second button
    await dela(p).locator("#pj-tab-gigs").click();
    await waitFor(p, "Your gigs");
    ok(await dela(p).locator("#pj-start-gig").count() === 0 && await dela(p).locator("#new-gig-card").count() === 0, "the Gigs tab has no second way to start a gig");
    await dela(p).locator("#pj-new").click();
    await dela(p).getByRole("button", { name: "From an approved document" }).click();
    await waitFor(p, "Choose the work");
    const kept = await inShadow(p, (root) => [root.getElementById("gs-bmin").value, root.getElementById("gs-bmax").value, root.getElementById("gs-deadline").value, root.getElementById("gs-notes").value, root.getElementById("gs-doc").selectedOptions[0].textContent].join("|"));
    ok(kept === "300|600|2099-03-01|Clio experience is required.|New client intake", "the Gigs tab opens the same page, with what was entered still there: " + kept);
    await p.screenshot({ path: path.join(SHOTS, "newgig-step1.png"), fullPage: true });
    // Monthly changes the words of the costs
    await dela(p).getByLabel("Budget from (USD)", { exact: true }).fill("300");
    await dela(p).getByLabel("Budget to (USD)", { exact: true }).fill("600");
    await dela(p).locator("#gs-mon").check();
    ok((await inShadow(p, (root) => root.querySelector("#gs-costs .gs-costline.strong").innerText.replace(/\s+/g, " "))).startsWith("Estimated total each month"), "Monthly: the costs are per month");
    const mon = await inShadow(p, (root) => ({ l1: root.querySelector('label[for="gs-bmin"]').textContent, l2: root.querySelector('label[for="gs-bmax"]').textContent, dl: root.getElementById("gs-deadline").getBoundingClientRect().height, note: root.getElementById("gs-mon-note").hidden ? "" : root.getElementById("gs-mon-note").textContent }));
    ok(mon.l1 === "Monthly budget from (USD)" && mon.l2 === "Monthly budget to (USD)" && mon.dl === 0 && mon.note.includes("set in the agreement's \"Monthly terms\""), "Monthly shows only what applies: monthly budget labels, no work deadline, and where the monthly tasks are set: " + JSON.stringify(mon));
    await dela(p).locator("#gs-one").check();
    await dela(p).getByLabel("Approved SOP or workflow", { exact: true }).selectOption({ label: "New client intake" });
    await dela(p).getByLabel("Work deadline (optional)", { exact: true }).fill("2099-03-01");

    // ---------- Step 2: DELA's draft ----------
    await dela(p).locator("#gs-draft").click();
    t = await waitFor(p, "What freelancers will read", 15000);
    ok((await step(p)).includes("Step 2 of 3, current: Review DELA draft") && /Read it and change anything that is not right\. Nothing is posted yet\./.test(t), "the draft opens on step 2 and says nothing is posted: " + await step(p));
    ok((await dela(p).getByLabel("Gig title", { exact: true }).inputValue()).length > 5 && await dela(p).locator("#gs-step3").isHidden(), "the description is there to edit, and the budget waits on the next step");
    const draft = (await sql(`select id, status, budget_min_cents, budget_max_cents, deadline::text d from gigs where org_id = dela_side_org((select id from people where bd_member_id = ${ATT}), 'attorney') order by created_at desc limit 1`))[0];
    ok(draft.status === "draft" && draft.budget_min_cents === 30000 && draft.budget_max_cents === 60000 && draft.d === "2099-03-01", "the draft holds the budget and the deadline from step 1, and is not posted: " + JSON.stringify(draft));
    await dela(p).getByLabel("Gig title", { exact: true }).fill("Client intake for a family law firm, edited");
    await dela(p).locator("#gs-save2").click();
    await waitFor(p, "Saved");
    await p.waitForTimeout(400);
    ok((await sql(`select title from gigs where id = '${draft.id}'`))[0].title === "Client intake for a family law firm, edited" && (await step(p)).includes("Step 2 of 3"), "Save draft really saves, and the page stays on step 2");
    await p.screenshot({ path: path.join(SHOTS, "newgig-step2.png"), fullPage: true });

    // ---------- Step 3: review and post ----------
    await dela(p).locator("#gs-continue").click();
    await p.waitForTimeout(300);
    t = await text(p);
    ok((await step(p)).includes("Step 3 of 3, current: Review & post") && await dela(p).locator("#gs-step2").isHidden(), "Continue opens step 3: " + await step(p));
    const seen = await dela(p).locator("#gs-preview-card").innerText();
    ok(seen.includes("Client intake for a family law firm, edited") && seen.includes("$300 to $600") && /Mar 1, 2099/.test(seen) && seen.includes("One-off"), "step 3 shows what freelancers will see, with the edited title, the budget and the deadline");
    ok(t.includes("Estimated total") && t.includes("$315 to $630") && t.includes("I have read what freelancers will see."), "the costs and the confirmation are on the page, not in a tip");
    await dela(p).locator("#gs-post").click();
    await p.waitForTimeout(300);
    ok((await inShadow(p, (root) => root.getElementById("gs-confirm-err").textContent)) === "Tick the box to confirm you have read what freelancers will see." && (await focusId(p)) === "gs-confirm" && (await sql(`select status from gigs where id = '${draft.id}'`))[0].status === "draft", "without the confirmation nothing is posted, and the page says what is needed");
    await dela(p).locator("#gs-back2").click();
    await p.waitForTimeout(200);
    ok((await step(p)).includes("Step 2 of 3") && (await dela(p).getByLabel("Gig title", { exact: true }).inputValue()).endsWith("edited"), "Back returns to the description with nothing lost");
    await dela(p).locator("#gs-continue").click();
    await dela(p).getByLabel("Milestones, one per line", { exact: true }).fill("Draft\nFinal");
    await dela(p).locator("#gs-confirm").check();
    await p.screenshot({ path: path.join(SHOTS, "newgig-step3.png"), fullPage: true });
    await dela(p).locator("#gs-post").click();
    t = await waitFor(p, "Your gig is open until", 10000);
    ok((await sql(`select status from gigs where id = '${draft.id}'`))[0].status === "open" && popups === 0, "with the confirmation the gig is posted, and no browser pop-up was used");
    await s.ctx.close();

    // ---------- No approved document ----------
    s = await open(browser, BARE, "&tab=projects");
    p = s.page;
    await waitFor(p, "Manage your gigs, awarded work, milestones and standing arrangements.");
    await dela(p).locator("#pj-new").click();
    await dela(p).getByRole("button", { name: "From an approved document" }).click();
    t = await waitFor(p, "A gig starts from an approved SOP or Workflow, and you have none yet.");
    ok(t.includes("Open the Library to create or approve one") && await inShadow(p, (root) => root.getElementById("gs-preview").hidden), "with no approved document the page says so and offers the Library; no preview link is shown");
    // A phone
    await p.setViewportSize({ width: 320, height: 720 });
    await p.waitForTimeout(350);
    ok(await fits(p) && await inShadow(p, (root) => [...root.querySelectorAll(".gs-acts button")].every((b) => b.getBoundingClientRect().height >= 44 && b.getBoundingClientRect().right <= 320)), "320 wide: the page fits, and Back to Projects and Draft with DELA are full touch size");
    ok(await inShadow(p, (root) => { const a = root.getElementById("gs-bmin").getBoundingClientRect(), b = root.getElementById("gs-bmax").getBoundingClientRect(), k = [...root.querySelectorAll(".gs-kind")].map((x) => x.getBoundingClientRect()); return b.top >= a.bottom - 1 && (k.length < 2 || k[1].top >= k[0].bottom - 1); }), "on a phone the budget boxes and the two types stack in one column");
    await p.screenshot({ path: path.join(SHOTS, "newgig-phone.png"), fullPage: true });
    await dela(p).locator("#gs-back2").click();
    await waitFor(p, "Needs your attention");
    ok(true, "Back to Projects returns to Projects");
    await s.ctx.close();

    console.log("\nALL " + passed + " NEW GIG CHECKS PASSED");
  } catch (e) {
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    if (before) for (const k of Object.keys(before)) await sql(`update feature_switches set state = '${before[k]}' where key = '${k}'`).catch(() => null);
    await browser.close();
  }
})();

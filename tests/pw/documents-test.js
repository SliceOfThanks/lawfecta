// Browser test of the document standard (docs/briefs/step-2d-document-standard.md): an older playbook converted with
// Change type, the firm profile asked once, type cards and starters, drafting to the standard, the RACI grid, the block
// with Fix it, approval, Word export named by ID, a Policy that cannot become a gig, and a phone-width check.
// Needs tools/dbtest.sh, then tests/pw/server.ts on port 8787.   node tests/pw/documents-test.js
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
const PNG64 = "iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAAK0lEQVR4nO3NMQ0AAAgDsAlDCYqRhQw4mvRvpvpExGKxWCwWi8VisVj8N16B+mj7BBLoxAAAAABJRU5ErkJggg==";

async function open(browser, uid, viewport, extra) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1200, height: 900 }, acceptDownloads: true });
  // Step 43: the folded sections of "Agreement and work" are open, as with "Open all sections" (the folded page has its own checks in engagements-test.js)
  await ctx.addInitScript((all) => { try { if (all) (localStorage.setItem("dela_eg_all", "1"), localStorage.setItem("dela_pf_all", "1")); else localStorage.removeItem("dela_eg_all"); } catch (e) { /* no storage */ } }, true);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Keep it" : undefined));
  await page.route("https://cdn.jsdelivr.net/**", (route) => {
    const u = new URL(route.request().url());
    const rel = u.pathname.split("@")[1].split("/").slice(1).join("/");
    route.fulfill({ path: path.join(ROOT, rel), contentType: "application/javascript" });
  });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto(`${BASE}/page/DELA-App?uid=${uid}&plan=` + (extra || ""));
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
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(0, 2000));
}
const tab = (page, name) => dela(page).getByRole("tab", { name: name, exact: true }).first().click();
const click = (page, name, opts) => dela(page).getByRole("button", Object.assign({ name: name, exact: true }, opts || {})).first().click();
const MINE = "org_id in (select o.id from organizations o join people pe on pe.id = o.owner_person_id where pe.bd_member_id = 3600)";
async function makeMember(bd, side, plan) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, 'Member ${bd}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side((select id from people where bd_member_id = ${bd}), '${side}', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and channel = 'access' and revoked_at is null); select 1`);
}

(async () => {
  const browser = await chromium.launch();
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('ai_generation', 'playbook_library', 'file_uploads', 'flex_gigs', 'profiles', 'worker'); update feature_switches set state = 'off' where key in ('document_standard', 'document_conversion', 'handoff_kit'); select 1");
    await makeMember(3600, "attorney", "att_business");

    // ---------- An older playbook, made before the document standard ----------
    let s = await open(browser, 3600);
    let p = s.page;
    let t0 = await waitFor(p, "What DELA will do for you");
    ok(!t0.includes("Playbooks") && t0.includes("Documents"), "Home lists Documents, not Playbooks");
    await click(p, "Library");
    let t = await waitFor(p, "Document library");
    await click(p, "New document");
    await dela(p).getByLabel("Describe the task").fill("When a new family law client signs, we run a conflict check, send the engagement letter and open the file.");
    await click(p, "Draft it with DELA");
    await waitFor(p, "DELA's questions");
    ok(!(await text(p)).includes("RACI"), "with the standard off, the older screen is used");
    await s.ctx.close();

    // ---------- The standard turns on and DELA converts the older playbook ----------
    await sql("update feature_switches set state = 'everyone' where key in ('document_standard', 'document_conversion', 'handoff_kit'); select 1");
    await sql("create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = 'documents-browser-worker' $$; select 1");
    const q = await sql("select dela_doc_convert_queue() as r");
    ok(q[0].r.queued >= 1, "the conversion queues the older playbook");
    for (let i = 0; i < 3; i++) await fetch(BASE + "/api/worker", { method: "POST", headers: { "x-dela-worker": "documents-browser-worker" } }).catch(() => {});
    const conv = await sql("select p.doc_type, p.doc_id, p.converted_at is not null as conv from playbooks p join organizations o on o.id = p.org_id join people pe on pe.id = o.owner_person_id where pe.bd_member_id = 3600");
    ok(conv.length === 1 && conv[0].doc_type === "sop" && conv[0].conv && conv[0].doc_id.startsWith("INT-"), "the type check makes it an SOP with an ID (" + JSON.stringify(conv[0]) + ")");
    const oldId = conv[0].doc_id;

    // Two quality notes on the imported document, for the Review column check below
    await sql(`update playbooks set attention = 2, blocking = 0 where doc_id = '${oldId}'; select 1`);
    s = await open(browser, 3600);
    p = s.page;
    await click(p, "Library");
    t = await waitFor(p, "Intake and conflicts");
    ok(t.includes(oldId) && t.includes("Imported: review required") && t.includes("Owner (role)") && t.includes("Next review") && t.includes("Review") && !t.includes("Converted: check it") && !/\d+ blocking/.test(t), "the master index groups by lifecycle with ID, type, owner role, next review and a Review column (UX review L02)");
    ok(await dela(p).locator("table.doc-index").count() === 1 && await dela(p).locator("table.doc-index tr.band").count() >= 1, "the library is one aligned table with a band row per lifecycle group (UX review L01)");
    // Fix (step 8b, retest R04): the Review count says "quality notes" and opens exactly those, on the quality check
    const noteBtn = dela(p).locator("tr", { hasText: oldId }).first().getByRole("button", { name: /quality note/ });
    ok(await noteBtn.count() === 1 && /quality notes?/.test(await noteBtn.innerText()) && !t.includes(" suggestions"), "the Review column counts quality notes, not suggestions (" + (await noteBtn.innerText().catch(() => "none")) + ")");
    await noteBtn.click();
    await waitFor(p, "must be fixed first");
    ok(await p.evaluate(() => { const q = document.querySelector(".dela-host").shadowRoot.querySelector("#quality-check"); const r = q && q.getBoundingClientRect(); return !!r && r.top < innerHeight && r.bottom > 0; }), "the count opens the document at its quality check");
    ok(!(await text(p)).includes("Suggestions ("), "the AI-proposed edits tab is called Suggested edits");
    // Step 60, the DELA workflow: the seven steps on the document, with where it stands and one next action
    await dela(p).locator("#wf-card").waitFor();
    const flow = await p.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot, c = r.querySelector("#wf-card"), steps = [...c.querySelectorAll(".wf > li")];
      const now = c.querySelector("[aria-current=step]");
      return { titles: steps.map((x) => x.querySelector(".wf-t").textContent).join("|"), now: now ? now.querySelector(".wf-t").textContent : "", where: c.querySelector("#wf-where").textContent, buttons: [...c.querySelectorAll("button")].map((b) => b.textContent).join("|") }; });
    ok(flow.titles === "Talk to DELA|Clarify|Build the playbook|Review|Prepare the handoff|Confirm and do the work|Review the result|Improve the playbook", "the document page shows the seven steps and the loop back: " + flow.titles);
    ok(flow.now === "Build the playbook" && flow.where === "Step 3 of 7: Build the playbook" && flow.buttons === "Continue the draft", "a draft stands at step 3, with one next action: " + JSON.stringify(flow));
    const facts = (await dela(p).locator("#wf-facts").innerText()).replace(/\s+/g, " ");
    ok(facts.includes("Instructions: draft"), "step 71: the workflow card states each fact on its own, here that the instructions are a draft: " + facts);
    // Step 55, the newcomer check: DELA reads the draft as someone who has never worked with the firm, the attorney
    // answers, and the answers go into a new draft
    ok(await dela(p).locator("#newcomer-card").count() === 1 && (await text(p)).includes("Can someone new follow this?") && await dela(p).locator("#newcomer-badge").count() === 0, "the document page asks whether someone new can follow it, with no result before a check");
    await dela(p).locator("#newcomer-run").click();
    t = await waitFor(p, "2 gaps for someone new", 15000);
    ok(t.includes("The page does not say how a newcomer gets into Clio.") && t.includes("How does a new person get a Clio login?") && t.includes("Access needed") && t.includes("Step 1") && t.includes("What done looks like"), "each gap says what a newcomer would not know, about which step, with one question for the attorney");
    await dela(p).locator("#newcomer-fill").click();
    ok((await dela(p).locator("#newcomer-msg").innerText()) === "Answer at least one question first.", "nothing is sent without an answer");
    await dela(p).locator("#nc-a-0").fill("The office manager sets up Clio for new people.");
    await dela(p).locator("#newcomer-fill").click();
    await waitFor(p, "Your answers are in a new draft", 15000);
    const added = await p.evaluate(() => [...document.querySelector(".dela-host").shadowRoot.querySelectorAll("input, textarea")].some((x) => String(x.value).includes("Get a Clio login from the office manager.")));
    ok(added && await dela(p).locator("#newcomer-badge").count() === 0, "the answer is written into the document, and the new draft has not been checked yet");
    await dela(p).locator("#newcomer-run").click();
    t = await waitFor(p, "Ready for someone new", 15000);
    ok(await dela(p).locator("#newcomer-fill").count() === 0 && t.includes("Someone new could do this from the page."), "with the gap filled the document is marked Ready for someone new");
    await click(p, "← Library");
    await waitFor(p, "Intake and conflicts");
    await dela(p).locator("tr", { hasText: oldId }).first().click();
    t = await waitFor(p, "DELA moved this to the document standard as SOP");
    ok(t.includes("Draft, not approved"), "a converted document shows Draft, not approved until it is approved again");
    // Step 47: a suggested edit is shown part by part, now and proposed side by side, before anyone accepts it
    await tab(p, "Chat");
    await dela(p).getByLabel("Message about this document", { exact: true }).fill("Please add a welcome email step");
    await click(p, "Send");
    await waitFor(p, "Suggested edits (1)", 15000);
    await tab(p, "Suggested edits (1)");
    t = await waitFor(p, "Accepting a suggestion saves a new draft version");
    const diff = await p.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; const d = r.querySelector(".sg-diff"); const cols = [...d.querySelectorAll(".sg-cols")][0].querySelectorAll(".sg-col"); const a = cols[0].getBoundingClientRect(), b = cols[1].getBoundingClientRect();
      return { parts: [...d.querySelectorAll(".sg-part")].map((x) => x.textContent).join("|"), side: b.left > a.right - 1, marks: [...d.querySelectorAll(".sg-lines .badge")].map((x) => x.textContent + ":" + x.parentElement.lastChild.textContent).join(" | "), heads: [...d.querySelectorAll(".sg-col-h")].slice(0, 2).map((x) => x.textContent).join("|") }; });
    ok(diff.parts.includes("Purpose") && diff.parts.includes("Steps") && diff.heads === "Now, in this document|Proposed" && diff.side, "the suggestion lists the parts it changes, with now and proposed side by side: " + JSON.stringify(diff));
    ok(/New:\d+\. Send the welcome email\./.test(diff.marks) && /Changed:Find conflicts and welcome the client\./.test(diff.marks), "each changed line is marked in words (New, Changed): " + diff.marks);
    ok(t.includes("Accepting a suggestion saves a new draft version of this document. It approves nothing"), "the screen says what accepting does and does not do");
    await click(p, "Reject");
    await waitFor(p, "No suggestions waiting.");
    await tab(p, "Draft and review");
    await waitFor(p, "Draft, not approved");
    await dela(p).getByLabel("Change the type").selectOption("workflow");
    await click(p, "Change type");
    t = await waitFor(p, "Now a Workflow");
    await waitFor(p, "KPIs (3 to 5)");
    ok(true, "Change type turns it into a Workflow in one click, with the KPI cards");
    ok(!t.includes("DELA moved this to the document standard"), "changing the type counts as the owner's check, so the conversion note goes");

    // ---------- New document: the firm profile is asked once ----------
    await click(p, "← Library");
    await waitFor(p, "Document library");
    await click(p, "New document");
    t = await waitFor(p, "Your firm profile for documents");
    ok(t.includes("Team roles") && t.includes("Systems you use"), "the firm profile asks for size, roles and systems first");
    // Fix (UI review 2026-11-08): the role boxes line up whatever the length of the role's name, and no "Attorney (attorney)"
    const lefts = await dela(p).locator(".role-row select").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
    ok(lefts.length > 2 && new Set(lefts).size === 1, "the Team roles boxes line up (" + [...new Set(lefts)].join(", ") + ")");
    ok(!(await text(p)).includes("Attorney (attorney)"), "a role name does not repeat its kind");
    await click(p, "Save and continue");
    await waitFor(p, "Choose your firm size");
    ok(true, "the firm profile needs a firm size");
    await dela(p).getByLabel("Firm size").selectOption("2-5");
    await dela(p).getByLabel("Practice areas").fill("Family law");
    await dela(p).getByLabel("Practice management systems").fill("Clio").catch(() => {});
    await click(p, "Save and continue");
    t = await waitFor(p, "Pick what to build");
    ok(t.includes("SOP") && t.includes("Workflow") && t.includes("Playbook") && t.includes("Policy") && t.includes("Or start from a common process"), "the four type cards and the starter library show");
    const fp = await sql("select body->'documents'->>'size' as size from firm_profiles fp join organizations o on o.id = fp.org_id join people pe on pe.id = o.owner_person_id where pe.bd_member_id = 3600");
    ok(fp.length && fp[0].size === "2-5", "the firm profile is saved once for the firm");

    // ---------- Start from a starter: Run a conflict check ----------
    await dela(p).locator("summary", { hasText: "INT | Intake and conflicts" }).click();
    await dela(p).locator(".row", { hasText: "Run a conflict check" }).getByRole("button", { name: "Start" }).click();
    t = await waitFor(p, "About this process");
    ok((await dela(p).getByLabel("Process name").inputValue()) === "Run a conflict check", "the starter fills in the name, what starts it and what done looks like");
    await dela(p).getByLabel("Paste an existing checklist, email or old SOP (optional)").fill("Old checklist for John Smith, password hunter22").catch(() => {});
    await click(p, "Draft it with DELA");
    t = await waitFor(p, "Quality check", 15000);
    ok(t.includes("Draft, not approved") && t.includes("RACI") && t.includes("Decision points and escalation") && t.includes("Done when"), "DELA drafts an SOP to the standard with the quality panel and RACI grid");
    const newId = (await sql("select doc_id from playbooks where title = 'Run a conflict check' and doc_id is not null and " + MINE + " order by created_at desc limit 1"))[0].doc_id;
    ok(newId.startsWith("INT-") && newId !== oldId, "the new SOP gets the next ID in its group (" + newId + ")");
    ok(!(await sql("select count(*)::int as n from playbook_versions v join playbooks p on p.id = v.playbook_id where p.doc_id = '" + newId + "' and p." + MINE + " and v.body::text like '%hunter22%'"))[0].n, "a password in pasted material never reaches the document");

    // ---------- Step 72: a step says where it comes from; editing a suggestion confirms it ----------
    ok(await dela(p).getByLabel("Where step 1 comes from").count() === 1, "step 72: each step has a choice for where it comes from");
    await dela(p).getByLabel("Where step 1 comes from").selectOption("proposed");
    t = await waitFor(p, "DELA's own suggestion that nobody at the firm has confirmed");
    ok(await dela(p).locator(".basis-tag").first().innerText() === "DELA's suggestion" && t.includes("Confirm all 1 suggestion"), "step 72: a suggestion carries a tag, and the page counts what nobody confirmed");
    const s1 = dela(p).getByLabel("Step 1", { exact: true });
    await s1.fill((await s1.inputValue()) + " now");
    ok(await dela(p).locator(".basis-tag").first().innerText() === "Confirmed by the firm" && await dela(p).getByLabel("Where step 1 comes from").inputValue() === "said", "step 72: changing a suggested step's words makes it the firm's own");

    // ---------- Break the RACI: two owners means no owner, and everything is blocked ----------
    await dela(p).getByRole("button", { name: "Step 1, Attorney: empty" }).click();
    await dela(p).getByRole("button", { name: "Step 1, Attorney: R" }).click();
    t = await text(p);
    ok(t.includes("(needs exactly one A)"), "the RACI grid marks a step with two A's");
    await click(p, "Save");
    t = await waitFor(p, "Required before approval");
    ok(t.includes("Export, approval and Flex Gigs are blocked"), "the quality panel blocks a missing or double A");
    ok(await dela(p).getByRole("button", { name: "Approve", exact: true }).isDisabled(), "Approve is off while blocked");
    ok(t.includes("Author (approves)") && /Author \(approves\)\s*[^\n]*\(you\)/.test(t), "step 61: the document names its author, who approves");
    ok(await dela(p).getByRole("button", { name: "Word", exact: true }).isDisabled(), "Word export is off while blocked");
    const r1 = await sql("select blocking from playbooks where doc_id = '" + newId + "' and " + MINE);
    ok(r1[0].blocking >= 1, "the block is recorded on the document");
    await dela(p).locator(".qp-item.blocking").first().getByRole("button", { name: "Fix it" }).click();
    await p.waitForTimeout(1500);
    t = await text(p);
    ok(!t.includes("Export, approval and Flex Gigs are blocked"), "Fix it sets exactly one A and lifts the block");

    // ---------- Approve, then export to Word ----------
    await click(p, "Approve");
    t = await waitFor(p, "Approved");
    await p.waitForTimeout(500);
    t = await text(p);
    ok(!t.includes("Draft, not approved"), "an approved document drops the draft banner");
    const dl = p.waitForEvent("download");
    await click(p, "Word");
    const file = await dl;
    ok(file.suggestedFilename().includes(newId) && file.suggestedFilename().endsWith(".docx"), "Word export is named by ID (" + file.suggestedFilename() + ")");
    const changes = await sql("select count(*)::int as n from document_changes c join playbooks p on p.id = c.playbook_id where p.doc_id = '" + newId + "' and p." + MINE);
    ok(changes[0].n >= 2, "the change log records each saved version and the approval");
    ok(t.includes("Post as a Flex Gig"), "an approved SOP can be posted as a Flex Gig");
    // The empty Comments view names the real tab and takes you there (UX review D01)
    await dela(p).getByRole("tab", { name: "Comments (0)", exact: true }).click();
    t = await waitFor(p, "No comments yet.");
    ok(!t.includes("Read view") && t.includes("click \"Comment\" beside any part"), "the empty Comments view names the Draft and review tab");
    await click(p, "Go to Draft and review");
    ok((await dela(p).getByRole("tab", { name: "Draft and review", exact: true }).getAttribute("aria-selected")) === "true", "and its button opens it");

    // ---------- A Policy cannot become a gig ----------
    await click(p, "← Library");
    await waitFor(p, "Document library");
    await click(p, "New document");
    await waitFor(p, "Pick what to build");
    await dela(p).getByRole("button", { name: /^Policy/ }).first().click();
    await waitFor(p, "About this process");
    await dela(p).getByLabel("Process name").fill("Client trust account rules");
    await click(p, "Draft it with DELA");
    t = await waitFor(p, "The rules", 15000);
    // On a slow machine the earlier SOP view can still be on screen for a moment: wait for the Policy view to settle
    await p.waitForFunction(() => { const r = document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText; return r.includes("Exceptions and who approves them") && !r.includes("RACI"); }, null, { timeout: 10000 }).catch(() => {});
    t = await text(p);
    ok(t.includes("What must happen") && t.includes("Exceptions and who approves them") && !t.includes("RACI"), "a Policy has rules and exceptions, and no RACI grid");
    if (!(await dela(p).getByRole("button", { name: "Approve", exact: true }).isDisabled())) { await click(p, "Approve"); await waitFor(p, "Approved"); }
    await p.waitForTimeout(500);
    ok(!(await text(p)).includes("Post as a Flex Gig"), "a Policy has no Post as a Flex Gig button");
    await click(p, "Projects");
    await p.waitForTimeout(1200);
    const opts = await dela(p).getByLabel("Approved SOP or Workflow").locator("option").allInnerTexts();
    ok(!(await text(p)).includes("Playbook\n"), "the Projects page calls the picker \"Document\", not \"Playbook\"");
    ok(opts.some((o) => o.includes("Run a conflict check")) && !opts.some((o) => o.includes("Client trust account rules")), "the gig picker lists SOPs and Workflows only (" + opts.join(" | ") + ")");

    // ---------- A notice link opens the document itself (dela?tab=library&pb=ID) ----------
    await s.ctx.close();
    const pbId = (await sql("select id from playbooks where doc_id = '" + newId + "' and " + MINE))[0].id;
    s = await open(browser, 3600, null, "&tab=library&pb=" + pbId);
    p = s.page;
    t = await waitFor(p, "Quality check", 10000);
    ok(t.includes(newId) && t.includes("Run a conflict check"), "a link with the document's id opens that document, not the list");

    // ---------- Phone width ----------
    await s.ctx.close();
    s = await open(browser, 3600, { width: 390, height: 844 });
    p = s.page;
    await click(p, "Library");
    await waitFor(p, newId);
    await dela(p).locator("tr", { hasText: newId }).first().click();
    await waitFor(p, "Quality check");
    const wide = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(wide <= 392, "the document screen fits a phone (" + wide + "px)");
    await p.screenshot({ path: path.join(SHOTS, "documents-phone.png"), fullPage: false });
    await s.ctx.close();
    // ---------- Step 70: the document's Category card, with the website's categories ----------
    await sql("update feature_switches set state = 'everyone' where key = 'gig_categories'; select 1");
    try {
      s = await open(browser, 3600, null, "&tab=library&pb=" + pbId);
      p = s.page;
      await waitFor(p, "Quality check");
      const hasCard = await dela(p).locator("#doc-cats-card").count();
      if (hasCard) {
        t = await waitFor(p, "None yet. Pick the kind of work");
        ok(t.includes("A gig made from it starts with these"), "step 70: a document has a Category card that says what the categories are for");
        await dela(p).locator("#doc-cats-card").getByRole("combobox").fill("Family");
        await dela(p).locator("#doc-cats-card [role=option]").first().click();
        await waitFor(p, "Saved");
        const kept = await sql("select categories from playbooks where id = '" + pbId + "'");
        ok(Array.isArray(kept[0].categories) && kept[0].categories.length === 1, "step 70: picking a category saves it on the document: " + JSON.stringify(kept[0].categories));
        await dela(p).locator("#doc-cats-card .cat-chip button").first().click();
        await p.waitForTimeout(600);
        ok((await sql("select categories from playbooks where id = '" + pbId + "'"))[0].categories.length === 0, "step 70: removing it saves too");
      } else ok((await text(p)).includes("Approved version"), "step 70: on the approved view the card is not shown (it is on the draft and the other tabs)");
      await s.ctx.close();
    } finally { await sql("update feature_switches set state = 'off' where key = 'gig_categories'; select 1"); }
    // ---------- Step 73: team work with no gig. The owner assigns part of a document; the colleague accepts, ticks, submits; the owner accepts ----------
    await makeMember(3601, "attorney", "att_free");
    const teamAdd = await sql(`select dela_pb_team_set((select id from people where bd_member_id = 3600), (select org_id from playbooks where id = '${pbId}'), 3601, 'editor') r`);
    ok(teamAdd[0].r.ok === true, "step 73: a colleague is on the Library's team: " + JSON.stringify(teamAdd[0].r));
    await sql(`update playbooks set status = 'approved', approved_version = current_version, blocking = 0 where id = '${pbId}'; update feature_switches set state = 'everyone' where key = 'team_assignments'; select 1`);
    try {
      s = await open(browser, 3600, null, "&tab=library&pb=" + pbId);
      p = s.page;
      await dela(p).locator("#tw-assign-open").waitFor();
      await dela(p).locator("#tw-assign-open").click();
      await dela(p).locator("#tw-who").waitFor();
      t = await text(p);
      ok(t.includes("No gig, no agreement, no payment") || t.includes("no gig, no agreement, no payment"), "step 73: the form says this is work for the firm's own team, without a gig");
      await dela(p).locator("#tw-assign-go").click();
      await waitFor(p, "Choose who to assign it to.");
      await dela(p).locator("#tw-who").selectOption({ index: 1 });
      const nPick = await dela(p).locator("#tw-picks input").count();
      if (nPick >= 2) await dela(p).locator("#tw-pick-1").uncheck();
      await dela(p).locator("#tw-assign-note").fill("Use the new intake form.");
      await dela(p).locator("#tw-assign-go").click();
      t = await waitFor(p, "Waiting for them to accept");
      ok(t.includes("Use the new intake form.") && t.includes("has not accepted yet. Only they can accept.") && (nPick < 2 || t.includes("builds on step 1, which is not part of this assignment")), "step 73: assigned; the page says only the colleague can accept, and what the part builds on");
      ok(await dela(p).locator("#tw-accept").count() === 0, "step 73: the person who assigned has no Accept button for the colleague");
      await s.ctx.close();
      // The colleague
      s = await open(browser, 3601, null, "&tab=teamwork");
      p = s.page;
      t = await waitFor(p, "Assigned to you (1)");
      ok(t.includes("Waiting for you to accept"), "step 73: the colleague sees the work waiting for them");
      await dela(p).locator("#tw-mine .linkish").first().click();
      await waitFor(p, "Can you take this?");
      ok(await dela(p).locator("#tw-steps input[type=checkbox]").first().isDisabled(), "step 73: steps cannot be ticked before accepting");
      await dela(p).locator("#tw-accept").click();
      await waitFor(p, "Do the steps, then submit");
      await dela(p).locator("#tw-steps input[type=checkbox]").first().check();
      await waitFor(p, "1 of ");
      await dela(p).locator("#tw-note-box").fill("Done, the form is in the matter.");
      await dela(p).locator("#tw-submit").click();
      t = await waitFor(p, "Waiting for review");
      ok(t.includes("Submitted for review") && t.includes("Done, the form is in the matter.") && await dela(p).locator("#tw-approve").count() === 0, "step 73: submitted, with the note in what happened; the colleague cannot accept their own work");
      await s.ctx.close();
      // The owner reviews
      s = await open(browser, 3600, null, "&tab=teamwork");
      p = s.page;
      t = await waitFor(p, "Assigned by you or your firm (1)");
      ok(t.includes("Submitted, waiting for review"), "step 73: the owner sees it waiting for review");
      await dela(p).locator("#tw-given .linkish").first().click();
      await waitFor(p, "Review the work");
      await dela(p).locator("#tw-changes").click();
      await waitFor(p, "Write a short note first.");
      await dela(p).locator("#tw-approve").click();
      t = await waitFor(p, "The work was accepted.");
      ok(t.includes("Accepted the result") && t.includes("Accepted. Done"), "step 73: the owner accepts the result, and it is done");
      await s.ctx.close();
    } finally { await sql("update feature_switches set state = 'off' where key = 'team_assignments'; select 1"); }
    // ---------- Step 80: the document edited in place (Stacey 2026-11-24: a what-you-see-is-what-you-get editor) ----------
    // Every switch this block turns goes back to what it was, so the suites that run after this one see the same site
    const was80 = await sql("select key, state from feature_switches where key in ('document_editor_v2', 'approved_view', 'new_layout', 'file_uploads', 'team_assignments')");
    await sql("update feature_switches set state = 'everyone' where key in ('document_editor_v2', 'approved_view', 'new_layout'); select 1");
    try {
      const sr = (pg, fn, arg) => pg.evaluate(([f, a]) => new Function("r", "a", f)(document.querySelector(".dela-host").shadowRoot, a), [fn, arg]);
      const sopRow = async () => (await sql("select p.id, p.current_version v, p.status from playbooks p where p.title like 'Run a conflict check%' and p.org_id = dela_side_org((select id from people where bd_member_id = 3600), 'attorney')"))[0];
      const saved = (pg) => dela(pg).locator("#dp-status", { hasText: /^Saved / }).waitFor({ timeout: 12000 });
      const openDoc = async () => {
        const o = await open(browser, 3600, { width: 1400, height: 950 }, "&tab=library");
        await dela(o.page).getByText("Run a conflict check").first().click();
        await dela(o.page).locator(".dp-page").waitFor({ timeout: 20000 });
        return o;
      };
      const before = await sopRow();
      // Stacey 2026-11-24, "organizing menu": Notifications, Files, Team work and Subscription leave the menu
      await sql("update feature_switches set state = 'everyone' where key in ('file_uploads', 'team_assignments'); select 1");
      let m = await open(browser, 3600, { width: 1400, height: 950 }, "&tab=library");
      await dela(m.page).locator("#nl-sub").waitFor({ timeout: 20000 });
      let menu = await sr(m.page, `return { items: [...r.querySelectorAll(".nl-side .nl-item")].map((b) => b.innerText.trim()), sub: [...r.querySelectorAll("#nl-sub button")].map((b) => b.innerText.trim() + (b.getAttribute("aria-current") ? "*" : "")).join(","), cur: r.querySelector(".nl-side [aria-current=page]").innerText.trim() }`);
      ok(["Notifications", "Files", "Team work", "Subscription"].every((x) => !menu.items.includes(x)) && menu.items.includes("Library") && menu.items.includes("Projects") && menu.items.includes("Settings"), "the menu no longer lists Notifications, Files, Team work or Subscription: " + menu.items.join(", "));
      ok(menu.sub === "Documents*,Files" && menu.cur === "Library", "the Library has a row at its top: Documents and Files");
      await dela(m.page).locator("#nl-sub").getByRole("button", { name: "Files", exact: true }).click();
      await dela(m.page).locator("#nl-sub button[aria-current=page]", { hasText: "Files" }).waitFor({ timeout: 15000 });
      menu = await sr(m.page, `return { cur: r.querySelector(".nl-side [aria-current=page]").innerText.trim(), where: r.querySelector(".top .where").textContent.trim() }`);
      ok(menu.cur === "Library" && m.page.url().includes("tab=files"), "Files opens inside the Library: Library stays marked in the menu, and the page keeps its own address (" + menu.where + ")");
      ok(menu.where === "Files", "the top bar names the Files page");
      await dela(m.page).getByRole("button", { name: "Projects", exact: true }).first().click();
      await dela(m.page).locator("#nl-sub").getByRole("button", { name: "Team work", exact: true }).click();
      await dela(m.page).locator("#nl-sub button[aria-current=page]", { hasText: "Team work" }).waitFor({ timeout: 15000 });
      ok(await sr(m.page, `return r.querySelector(".nl-side [aria-current=page]").innerText.trim()`) === "Projects", "Team work opens under Projects");
      await dela(m.page).getByRole("button", { name: /^Notifications/ }).first().click();
      await dela(m.page).locator("#notices-view-all").waitFor({ timeout: 15000 });
      await dela(m.page).locator("#notices-view-all").click();
      await dela(m.page).locator(".top .where", { hasText: "Notifications" }).waitFor({ timeout: 15000 });
      const bellTo = await sr(m.page, `return { where: r.querySelector(".top .where").textContent.trim(), unread: !!r.querySelector("#notices-unread"), sub: !!r.querySelector("#nl-sub"), cur: (r.querySelector(".nl-side [aria-current=page]") || {}).innerText || "" }`);
      ok(!bellTo.sub && bellTo.where === "Notifications", "the bell opens the newest notifications, and \"View all notifications\" there opens the full page, named in the top bar: " + JSON.stringify(bellTo));
      await m.ctx.close();
      let s = await openDoc(), p = s.page;
      // The approved version reads as a document and cannot be typed into; a new draft is one click
      let st = await sr(p, `const pg = r.querySelector(".dp-page"); return { ro: pg.classList.contains("ro"), boxes: pg.querySelectorAll("[role=textbox]").length, inuse: !!r.querySelector("#dp-inuse"), top: Math.round(pg.getBoundingClientRect().top + window.scrollY), cards: !!r.querySelector("#doc-cats-card") || /Freelancers who fit this work/.test(r.querySelector(".dp-main").textContent), title: pg.querySelector("h1").textContent, heads: [...pg.querySelectorAll("h2.dp-h")].map((x) => x.textContent) }`);
      ok(st.ro && st.boxes === 0 && st.inuse && st.title === "Run a conflict check", "the approved version reads as a document and cannot be typed into");
      ok(st.top < 420 && !st.cards, "the document is the first thing on the page: nothing about delegation, categories or freelancers stands above it (starts " + st.top + "px down)");
      ok(st.heads.join("|") === "Purpose|Scope|Trigger|Roles|Before you start|Steps|Decision points and escalation|Timing|Quality check|Done when|Related links", "an SOP shows its sections in reading order: " + st.heads.join(", "));
      await dela(p).locator("#dp-new-draft").click();
      await dela(p).locator(".dp-page:not(.ro)").waitFor();
      // Type where the text stands; it is kept by itself and makes no version
      const purpose = dela(p).getByRole("textbox", { name: "Purpose", exact: true });
      await purpose.fill("Find conflicts before any consult is booked.");
      await saved(p);
      let row = await sopRow();
      const kept = (await sql("select body->>'purpose' purpose, base_version from playbook_working where playbook_id = '" + before.id + "'"))[0];
      ok(row.v === before.v && kept && kept.purpose === "Find conflicts before any consult is booked." && kept.base_version === before.v, "what is typed is kept by itself as a working copy, and no version is made (still version " + row.v + ")");
      ok(await sr(p, `return /Quality check/.test(r.querySelector("#dp-quality").textContent) && !!r.querySelector("#dp-quality #quality-check")`), "the quality check sits beside the document and follows what is typed");
      // A step: text in place, tags for what is set, the rest behind Details
      const step1 = dela(p).getByRole("textbox", { name: "Step 1", exact: true });
      const was1 = await step1.innerText(), was2 = await dela(p).getByRole("textbox", { name: "Step 2", exact: true }).innerText();
      await step1.fill(was1.trim() + " Use the full legal name.");
      st = await sr(p, `const c = r.querySelector(".dp-step"); return { fields: c.querySelectorAll("input, select").length - c.querySelectorAll("input[type=file]").length, tags: [...c.querySelectorAll(".dp-tag")].map((x) => x.textContent) }`);
      ok(st.fields === 0 && st.tags.length >= 1, "a step shows its text and small tags, with no boxes open: " + JSON.stringify(st.tags));
      await dela(p).getByRole("button", { name: "Details of step 1" }).click();
      await dela(p).getByLabel("System for step 1").fill("Clio Manage");
      await dela(p).getByRole("button", { name: "Done", exact: true }).click();
      st = await sr(p, `const c = r.querySelector(".dp-step"); return { open: !!c.querySelector(".dp-details"), tags: [...c.querySelectorAll(".dp-tag")].map((x) => x.textContent) }`);
      ok(!st.open && st.tags.includes("Clio Manage"), "Details opens the step's boxes; what was set shows as a tag when it closes: " + JSON.stringify(st.tags));
      // Steps move by button and by dragging
      await dela(p).getByRole("button", { name: "Move step 1 down" }).click();
      ok((await dela(p).getByRole("textbox", { name: "Step 1", exact: true }).innerText()).trim() === was2.trim(), "Move down swaps a step with the next one");
      await sr(p, `const steps = r.querySelectorAll(".dp-step"), h = steps[1].querySelector(".dp-handle"), dt = new DataTransfer();
        h.dispatchEvent(new DragEvent("dragstart", { dataTransfer: dt, bubbles: true }));
        const b = steps[0].getBoundingClientRect();
        steps[0].dispatchEvent(new DragEvent("dragover", { dataTransfer: dt, bubbles: true, cancelable: true, clientY: b.top + 2 }));
        steps[0].dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true, clientY: b.top + 2 }));`);
      await p.waitForTimeout(300);
      ok((await dela(p).getByRole("textbox", { name: "Step 1", exact: true }).innerText()).includes("Use the full legal name."), "dragging a step by its handle onto another puts it there");
      const nSteps = await dela(p).locator(".dp-step").count();
      await dela(p).getByRole("button", { name: "Add a step at the end" }).click();
      const added = dela(p).getByRole("textbox", { name: "Step " + (nSteps + 1), exact: true });
      await added.waitFor();
      ok(await sr(p, `return (r.activeElement || {}).getAttribute && r.activeElement.getAttribute("aria-label")`) === "Step " + (nSteps + 1), "a new step is ready to type in");
      await added.fill("Tell the attorney the result.");
      await dela(p).getByRole("button", { name: "Remove step " + (nSteps + 1) }).click();
      ok((await dela(p).locator(".dp-step").count()) === nSteps + 1 && (await dela(p).getByRole("button", { name: "Remove step " + (nSteps + 1) }).innerText()) === "Remove?", "removing a step with text asks once");
      await dela(p).getByRole("button", { name: "Remove step " + (nSteps + 1) }).click();
      ok((await dela(p).locator(".dp-step").count()) === nSteps, "the second click removes it");
      // A list: Enter adds a line, Backspace on an empty line removes it
      const l1 = dela(p).getByRole("textbox", { name: "Before you start, line 1", exact: true });
      await l1.click(); await p.keyboard.press("End"); await p.keyboard.press("Enter");
      const l2 = dela(p).getByRole("textbox", { name: "Before you start, line 2", exact: true });
      await l2.waitFor(); await p.waitForTimeout(150);
      ok(await sr(p, `return r.activeElement && r.activeElement.getAttribute("aria-label")`) === "Before you start, line 2", "the new line has the cursor");
      await p.keyboard.type("The intake form");
      ok((await l2.innerText()).trim() === "The intake form", "Enter in a list adds a line to type in");
      await l2.fill(""); await l2.press("Backspace");
      ok((await dela(p).getByRole("textbox", { name: "Before you start, line 2", exact: true }).count()) === 0, "Backspace on an empty line removes it");
      // Pasted text comes in as plain words
      await sr(p, `const el = [...r.querySelectorAll(".dp-t")].find((x) => x.getAttribute("aria-label") === "Trigger"); el.focus(); const dt = new DataTransfer(); dt.setData("text/plain", " (pasted)"); dt.setData("text/html", "<b onclick=alert(1)>bad</b>"); el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));`);
      ok(await sr(p, `const el = [...r.querySelectorAll(".dp-t")].find((x) => x.getAttribute("aria-label") === "Trigger"); return el.children.length === 0 && el.textContent.includes("(pasted)") && !el.textContent.includes("bad")`), "what is pasted comes in as plain text, never as markup");
      // ---------- Step 80b: bold, italic, bullets and links (Stacey 2026-11-24) ----------
      const DW = "Done when";
      const pick = (word) => sr(p, `const el = [...r.querySelectorAll(".dp-t")].find((x) => x.getAttribute("aria-label") === a[0]); el.focus(); const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const i = n.nodeValue.indexOf(a[1]); if (i >= 0) { const g = document.createRange(); g.setStart(n, i); g.setEnd(n, i + a[1].length); const s = window.getSelection(); s.removeAllRanges(); s.addRange(g); return true; } } return false;`, [DW, word]);
      const dw = (js) => sr(p, `const el = [...r.querySelectorAll(".dp-t")].find((x) => x.getAttribute("aria-label") === "Done when"); ` + js);
      const bar = dela(p).locator("#dp-fmt");
      await dela(p).getByRole("textbox", { name: DW, exact: true }).fill("Record the result in Clio, 2 * 3 times, as a rule.");
      ok((await bar.count()) === 1 && (await bar.getByRole("button").allInnerTexts()).join("|") === "B|I|• List|Link|Unlink", "a small bar with Bold, Italic, a list and a link shows over the text being typed in");
      await pick("result"); await bar.getByRole("button", { name: "Bold" }).click();
      await pick("rule"); await bar.getByRole("button", { name: "Italic" }).click();
      ok(await dw(`return (el.querySelector("b, strong") || {}).textContent === "result" && (el.querySelector("i, em") || {}).textContent === "rule" && r.activeElement === el`), "Bold and Italic change the chosen words where they stand, and the cursor stays in the text");
      await pick("Clio"); await bar.getByRole("button", { name: "Link the chosen words" }).click();
      await bar.getByLabel("Link address").fill("javascript:alert(1)");
      await bar.getByRole("button", { name: "Add", exact: true }).click();
      ok((await bar.locator(".dp-fmt-note").innerText()) === "A link must start with https://" && await dw(`return !el.querySelector("a")`), "a link that does not start with https:// is refused, with a line that says why");
      await bar.getByLabel("Link address").fill("https://clio.example/search");
      await bar.getByLabel("Link address").press("Enter");
      await p.screenshot({ path: path.join(SHOTS, "80b-format.png") });
      ok(await dw(`const k = el.querySelector("a"); return !!k && k.getAttribute("href") === "https://clio.example/search" && k.textContent === "Clio"`), "a link is put on the chosen words");
      // Bullets: lines that start with a dash, and formatted text pasted in arrives as plain words
      await dw(`el.focus(); const g = document.createRange(); g.selectNodeContents(el); g.collapse(false); const s = window.getSelection(); s.removeAllRanges(); s.addRange(g);`);
      await p.keyboard.press("Enter"); await p.keyboard.type("- first"); await p.keyboard.press("Enter"); await p.keyboard.type("- second");
      await dw(`const dt = new DataTransfer(); dt.setData("text/plain", " (pasted)"); dt.setData("text/html", "<b onclick=alert(1)>bad</b><img src=x onerror=alert(2)>"); el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));`);
      ok(await dw(`return el.textContent.includes("second (pasted)") && !el.textContent.includes("bad") && !el.querySelector("img") && !el.querySelector("[onclick]")`), "formatted text pasted into it arrives as plain words");
      await dela(p).getByRole("textbox", { name: "Title", exact: true }).click();
      await p.waitForTimeout(200);
      ok((await bar.count()) === 0, "the bar goes away when the cursor leaves the text");
      ok(await dw(`const li = [...el.querySelectorAll("ul.dp-ul li")].map((x) => x.textContent); return li.join("|") === "first|second (pasted)" && el.textContent.includes("2 * 3 times") && !el.textContent.includes("**") && !!el.querySelector("b") && !!el.querySelector("a")`), "lines that start with a dash become a bulleted list, and a star that was typed stays a star");
      await saved(p);
      const keptDw = (await sql("select body->>'done_when' x from playbook_working where playbook_id = '" + before.id + "'"))[0].x;
      ok(keptDw === "Record the **result** in [Clio](https://clio.example/search), 2 \\* 3 times, as a *rule*.\n- first\n- second (pasted)", "what is kept is plain text with marks, nothing else: " + JSON.stringify(keptDw));
      ok((await dela(p).getByRole("textbox", { name: "Title", exact: true }).evaluate((el) => el.contentEditable)) === "plaintext-only" && (await sr(p, `const t = [...r.querySelectorAll(".dp-t")].find((x) => x.getAttribute("aria-label") === "Trigger"); return !t.classList.contains("rich")`)), "a title and a one-line fact take no formatting");
      // Step 87 (check 32, 2026-11-24: "The linked word had disappeared during list entry"): a link on the LAST word, then Enter and list lines typed at the end
      const tm = (js) => sr(p, `const el = [...r.querySelectorAll(".dp-t")].find((x) => x.getAttribute("aria-label") === "Timing"); ` + js);
      await dela(p).getByRole("textbox", { name: "Timing", exact: true }).fill("Within one day, see linked");
      await sr(p, `const el = [...r.querySelectorAll(".dp-t")].find((x) => x.getAttribute("aria-label") === "Timing"); el.focus(); const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const i = n.nodeValue.indexOf("linked"); if (i >= 0) { const g = document.createRange(); g.setStart(n, i); g.setEnd(n, i + 6); const s = window.getSelection(); s.removeAllRanges(); s.addRange(g); } }`);
      const place = await sr(p, `const el = [...r.querySelectorAll(".dp-t")].find((x) => x.getAttribute("aria-label") === "Timing"), hd = el.closest(".dp-sec").querySelector("h2").getBoundingClientRect(), br = r.querySelector("#dp-fmt").getBoundingClientRect(); const hw = document.createRange(); hw.selectNodeContents(el.closest(".dp-sec").querySelector("h2")); const words = hw.getBoundingClientRect(); return { clear: br.left >= words.right || br.bottom <= words.top || br.top >= words.bottom, l: Math.round(br.left), wr: Math.round(words.right) }`);
      ok(place.clear, "step 87: the bar does not cover the words of the section heading above the text: " + JSON.stringify(place));
      await bar.getByRole("button", { name: "Link the chosen words" }).click();
      await bar.getByLabel("Link address").fill("https://www.lawfecta.example");
      await bar.getByLabel("Link address").press("Enter");
      // No click in between: the word must not stay chosen after the link is added, or the next key replaces it
      await p.keyboard.press("Enter"); await p.keyboard.type("- first point"); await p.keyboard.press("Enter"); await p.keyboard.type("- second point");
      await dela(p).getByRole("textbox", { name: "Title", exact: true }).click();
      await p.waitForTimeout(200);
      ok(await tm(`const k = el.querySelector("a"); const li = [...el.querySelectorAll("ul.dp-ul li")].map((x) => x.textContent); return !!k && k.textContent === "linked" && k.getAttribute("href") === "https://www.lawfecta.example" && li.join("|") === "first point|second point" && !el.querySelector("li a")`), "a link on the last word stays on that word when list lines are typed right after it");
      // Leaving and coming back: the typing is still there
      await s.ctx.close();
      s = await openDoc(); p = s.page;
      st = await sr(p, `return { back: !!r.querySelector("#dp-restored"), purpose: [...r.querySelectorAll(".dp-t")].find((x) => x.getAttribute("aria-label") === "Purpose").textContent, ro: r.querySelector(".dp-page").classList.contains("ro") }`);
      ok(st.back && st.purpose === "Find conflicts before any consult is booked.", "after closing the browser the typing is back in the document, with a line that says so");
      ok(await sr(p, `const el = [...r.querySelectorAll(".dp-t")].find((x) => x.getAttribute("aria-label") === "Done when"); return (el.querySelector("b") || {}).textContent === "result" && (el.querySelector("i") || {}).textContent === "rule" && el.querySelector("a").getAttribute("href") === "https://clio.example/search" && el.querySelector("a").rel === "noopener noreferrer" && el.querySelectorAll("ul.dp-ul li").length === 2`), "the bold, the italic, the link and the list are all there when the document opens again");
      // Save makes one version, and the working copy has done its job
      if (st.ro) await dela(p).locator("#dp-new-draft").click();
      await dela(p).locator("#dp-save").click();
      await dela(p).locator("#dp-id", { hasText: "Version " + (before.v + 1) }).waitFor({ timeout: 15000 });
      row = await sopRow();
      ok(row.v === before.v + 1 && (await sql("select count(*)::int n from playbook_working where playbook_id = '" + before.id + "'"))[0].n === 0 && (await sql("select body->>'purpose' x from playbook_versions where playbook_id = '" + before.id + "' and version = " + row.v))[0].x === "Find conflicts before any consult is booked.", "Save makes one new version with everything that was typed, and the working copy is gone");
      // Someone else saves meanwhile: nothing is overwritten silently
      await dela(p).getByRole("textbox", { name: "Scope", exact: true }).fill("Every new matter and every new party.");
      await saved(p);
      await sql("select dela_pb_save(jsonb_build_object('person_id', (select id from people where bd_member_id = 3600), 'id', '" + before.id + "', 'base_version', " + row.v + ", 'body', (select body from playbook_versions where playbook_id = '" + before.id + "' and version = " + row.v + "), 'note', 'another tab'))");
      await dela(p).getByRole("textbox", { name: "Scope", exact: true }).fill("Every new matter, every new party, every new adverse party.");
      await dela(p).locator("#dp-stale-mine").waitFor({ timeout: 12000 });
      ok((await text(p)).includes("Your changes are kept here and are not lost."), "when someone else saved a newer version, the page says so and keeps what was typed");
      await dela(p).locator("#dp-stale-mine").click();
      await dela(p).locator("#dp-id", { hasText: "Version " + (row.v + 2) }).waitFor({ timeout: 15000 });
      ok((await sql("select body->>'scope' x from playbook_versions where playbook_id = '" + before.id + "' and version = " + (row.v + 2)))[0].x.startsWith("Every new matter, every new party"), "Save mine as the newest version keeps both: the other version stays in the history");
      // The side panel: the facts and delegation are one click away
      await dela(p).locator("#dp-open-details").click();
      st = await sr(p, `const pn = r.querySelector("#dp-panel"); return { owner: !!pn.querySelector('select[aria-label="Owner (role)"]'), raci: /RACI/.test(pn.textContent), exp: r.querySelector("#dp-open-details").getAttribute("aria-expanded") }`);
      ok(st.owner && st.raci && st.exp === "true", "Details opens a side panel with the facts and the RACI grid");
      await dela(p).locator("#dp-open-delegate").click();
      ok(await sr(p, `return r.querySelector("#dp-panel").getAttribute("aria-label") === "Delegate this document"`), "Delegate opens in the same place");
      await dela(p).getByRole("button", { name: "Close the panel" }).click();
      ok((await dela(p).locator("#dp-panel").count()) === 0, "and closes again");
      // Narrow screens: the page fits
      await p.setViewportSize({ width: 390, height: 844 });
      await p.waitForTimeout(400);
      ok((await p.evaluate(() => document.documentElement.scrollWidth)) <= 392, "the document fits a phone screen");
      await p.screenshot({ path: path.join(SHOTS, "80-editor-phone.png") });
      await p.setViewportSize({ width: 1400, height: 950 });
      await p.screenshot({ path: path.join(SHOTS, "80-editor.png"), fullPage: true });
      await s.ctx.close();
      // The other three types draw in the new page too
      s = await open(browser, 3600, { width: 1400, height: 950 }, "&tab=library");
      await dela(s.page).getByText("New client intake").first().click();
      await dela(s.page).locator(".dp-page").waitFor({ timeout: 20000 });
      st = await sr(s.page, `return { heads: [...r.querySelectorAll(".dp-page h2.dp-h")].map((x) => x.textContent), stage: !!r.querySelector('.dp-t[aria-label="Stage name 1"]') }`);
      ok(st.heads.includes("Stages, handoffs, target times and linked SOPs") && st.heads.includes("Start and end points") && st.stage, "a Workflow shows its own sections, with a name on each stage: " + st.heads.join(", "));
      await click(s.page, "← Library");
      await dela(s.page).getByText("Client trust account rules").first().click();
      await dela(s.page).locator(".dp-page").waitFor({ timeout: 20000 });
      st = await sr(s.page, `return { heads: [...r.querySelectorAll(".dp-page h2.dp-h")].map((x) => x.textContent), img: /Add image/.test(r.querySelector(".dp-page").textContent) }`);
      ok(st.heads.join("|") === "Purpose|Scope|The rules|Exceptions and who approves them|Related links" && !st.img, "a Policy shows its sections and takes no images");
      await s.ctx.close();
    } finally { for (const w of was80) await sql("update feature_switches set state = '" + w.state + "' where key = '" + w.key + "'; select 1"); }
    console.log(passed + " browser checks passed");
  } finally { await browser.close(); }
})().catch((e) => { console.error(e.message); process.exit(1); });

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
    await sql("update feature_switches set state = 'everyone' where key in ('ai_generation', 'playbook_library', 'file_uploads', 'flex_gigs', 'profiles', 'worker'); update feature_switches set state = 'off' where key in ('document_standard', 'document_conversion'); select 1");
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
    await sql("update feature_switches set state = 'everyone' where key in ('document_standard', 'document_conversion'); select 1");
    await sql("create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = 'documents-browser-worker' $$; select 1");
    const q = await sql("select dela_doc_convert_queue() as r");
    ok(q[0].r.queued >= 1, "the conversion queues the older playbook");
    for (let i = 0; i < 3; i++) await fetch(BASE + "/api/worker", { method: "POST", headers: { "x-dela-worker": "documents-browser-worker" } }).catch(() => {});
    const conv = await sql("select p.doc_type, p.doc_id, p.converted_at is not null as conv from playbooks p join organizations o on o.id = p.org_id join people pe on pe.id = o.owner_person_id where pe.bd_member_id = 3600");
    ok(conv.length === 1 && conv[0].doc_type === "sop" && conv[0].conv && conv[0].doc_id.startsWith("INT-"), "the type check makes it an SOP with an ID (" + JSON.stringify(conv[0]) + ")");
    const oldId = conv[0].doc_id;

    s = await open(browser, 3600);
    p = s.page;
    await click(p, "Library");
    t = await waitFor(p, "Intake and conflicts");
    ok(t.includes(oldId) && t.includes("Converted: check it") && t.includes("Owner (role)") && t.includes("Next review"), "the master index groups by lifecycle with ID, type, owner role and next review");
    await dela(p).locator("tr", { hasText: oldId }).first().click();
    t = await waitFor(p, "DELA moved this to the document standard as SOP");
    ok(t.includes("Draft, not approved"), "a converted document shows Draft, not approved until it is approved again");
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

    // ---------- Break the RACI: two owners means no owner, and everything is blocked ----------
    await dela(p).getByRole("button", { name: "Step 1, Attorney: empty" }).click();
    await dela(p).getByRole("button", { name: "Step 1, Attorney: R" }).click();
    t = await text(p);
    ok(t.includes("(needs exactly one A)"), "the RACI grid marks a step with two A's");
    await click(p, "Save");
    t = await waitFor(p, "Blocking");
    ok(t.includes("Export, approval and Flex Gigs are blocked"), "the quality panel blocks a missing or double A");
    ok(await dela(p).getByRole("button", { name: "Approve", exact: true }).isDisabled(), "Approve is off while blocked");
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
    console.log(passed + " browser checks passed");
  } finally { await browser.close(); }
})().catch((e) => { console.error(e.message); process.exit(1); });

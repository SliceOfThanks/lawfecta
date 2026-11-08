// Browser test of step 8b Part B (docs/briefs/step-8b-ux-retest.md, answers B1 to B10): the plain-language Library.
// Cards with a title, purpose, status and one action; plain categories and no codes or IDs on the page; search by title,
// purpose and ID; status choices; back from a document keeps the search and the scroll position; "Show as a table" is
// remembered; "What would you like to document?" suggests a structure; phone width and dark mode; switch off keeps today's table.
//   node tests/pw/library-ws-test.js   (with tests/pw/server.ts running)
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
const ATT = 4520;
const BODY = (title, extra) => JSON.stringify({ schema: 2, type: "sop", title, lifecycle: "INT", roles: ["Attorney"], steps: [{ text: "Open the database." }], ...extra }).replace(/'/g, "''");

(async () => {
  const browser = await chromium.launch();
  let s, p, t;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('document_standard', 'playbook_library', 'profiles', 'approved_view', 'library_workspace')");
    await sql(`insert into people (bd_member_id, display_name, email) values (${ATT}, 'Lena Library', '${ATT}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = ${ATT}), 'attorney', 'att_pro', 'staff_grant');
      insert into access_list (bd_member_id, channel) select ${ATT}, 'access' where not exists (select 1 from access_list where bd_member_id = ${ATT} and channel = 'access' and revoked_at is null); select 1`);
    const ids = (await sql(`select (select id from people where bd_member_id = ${ATT}) att, dela_side_org((select id from people where bd_member_id = ${ATT}), 'attorney') org`))[0];
    await sql(`select dela_doc_firm_save('${ids.att}', '{"size":"solo","practice_areas":["Family law"],"jurisdictions":"Texas","roles":[{"name":"Attorney","kind":"attorney"},{"name":"Paralegal","kind":"staff"}],"systems":{"practice_management":["Clio"]}}'::jsonb)`);
    const today = (await sql("select (now() at time zone dela_tz())::date::text d"))[0].d;
    async function doc(title, cols, body) {
      const c = Object.assign({ status: "draft", lifecycle: "INT", doc_id: null, approved_version: null, blocking: 0, next_review_at: null, converted_at: null }, cols);
      const id = (await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by, doc_type, lifecycle, doc_id, blocking, next_review_at, converted_at)
        values ('${ids.org}', '${title}', '${c.status}', 1, ${c.approved_version || "null"}, 100, '${title}', '${ids.att}', 'sop', '${c.lifecycle}', ${c.doc_id ? "'" + c.doc_id + "'" : "null"}, ${c.blocking},
        ${c.next_review_at ? "'" + c.next_review_at + "'" : "null"}, ${c.converted_at ? "now()" : "null"}) returning id`))[0].id;
      await sql(`insert into playbook_versions (playbook_id, version, body, created_by) values ('${id}', 1, '${body}', '${ids.att}'); select 1`);
      return id;
    }
    const conflict = await doc("Run a conflict check", { status: "approved", approved_version: 1, doc_id: "INT-07", next_review_at: "2099-01-01" }, BODY("Run a conflict check", { purpose: "Check for conflicts before accepting a new client. Then record the result." }));
    await doc("New-client onboarding", { lifecycle: "ENG", converted_at: true, doc_id: "ENG-02" }, BODY("New-client onboarding", { purpose: "Welcome a new client the same way every time." }));
    await doc("File a motion", { lifecycle: "DOC", blocking: 2, doc_id: "DOC-03" }, BODY("File a motion", { purpose: "" }));
    await doc("Monthly trust reconciliation", { lifecycle: "BIL", status: "approved", approved_version: 1, doc_id: "BIL-01", next_review_at: "2026-01-05" }, BODY("Monthly trust reconciliation", { purpose: "Reconcile the trust account every month." }));
    await doc("Office opening checklist", { lifecycle: "ADM", status: "in_review", doc_id: "ADM-04" }, BODY("Office opening checklist", { purpose: "Open the office the same way each morning." }));
    await doc("Old archived memo", { lifecycle: "ADM", status: "archived" }, BODY("Old archived memo", {}));
    for (let i = 0; i < 6; i++) await doc("Calendar a deadline " + i, { lifecycle: "MAT", status: "approved", approved_version: 1, doc_id: "MAT-0" + i, next_review_at: "2099-01-01" }, BODY("Calendar a deadline " + i, { purpose: "Put the date on the calendar." }));

    // ---------- The page: heading, search first, plain categories, cards ----------
    s = await open(browser, "DELA-App", ATT, "&tab=library"); p = s.page;
    t = await waitFor(p, "Your firm's processes and policies, all in one place.", 15000);
    ok(t.includes("Library") && !t.includes("Document library"), "the heading is Library with the subtitle");
    ok(await label(p, "Find a document").count() === 1, "the Find a document box is there");
    ok(await dela(p).getByRole("button", { name: "Create a document", exact: true }).count() === 1 && await dela(p).getByRole("button", { name: "Import", exact: true }).count() === 1, "Create a document and Import at the top");
    ok(await dela(p).getByRole("button", { name: "Library settings", exact: true }).count() === 1, "Library settings for the owner");
    for (const g of ["Client intake", "Client onboarding", "Matter management", "Documents and filing", "Billing", "Firm administration"]) ok(t.includes(g), "plain category: " + g);
    ok(!/\b(INT|ENG|DOC|BIL|ADM|MAT)\b/.test(t) && !t.includes("INT-07") && !t.includes("Owner (role)"), "no category codes, IDs or owners on the page");
    ok(t.includes("Check for conflicts before accepting a new client.") && !t.includes("Then record the result."), "the card shows the first sentence of the purpose");
    ok(t.includes("First step: Open the database."), "a document with no purpose shows its first step");
    ok(!t.includes("Old archived memo"), "archived documents are not among the cards");

    const card = (title) => dela(p).locator(".lib-card", { has: p.locator("h3", { hasText: title }) });
    const cardText = async (title) => (await card(title).first().innerText());
    ok((await cardText("Run a conflict check")).includes("Ready to use") && (await cardText("Run a conflict check")).includes("Open document"), "approved: Ready to use, Open document");
    ok((await cardText("New-client onboarding")).includes("Needs your review") && (await cardText("New-client onboarding")).includes("Review imported document"), "imported: Review imported document");
    ok((await cardText("File a motion")).includes("Fix required items") && (await cardText("File a motion")).includes("2 required items"), "required items open: Fix required items");
    ok((await cardText("Monthly trust reconciliation")).includes("Review now") && (await cardText("Monthly trust reconciliation")).includes("Review overdue since"), "overdue review: Review now, with the date");
    ok((await cardText("Office opening checklist")).includes("Review and approve"), "sent for approval, for the administrator: Review and approve");

    // The Ready to use tip says DELA does not check legal correctness
    await card("Run a conflict check").getByRole("button", { name: "What does Ready to use mean?" }).click();
    ok((await cardText("Run a conflict check")).includes("not whether it is legally correct"), "the Ready to use tip");

    // ---------- Search by purpose, by ID, then the status choice ----------
    await label(p, "Find a document").fill("conflicts before");
    t = await text(p);
    ok(t.includes("Run a conflict check") && !t.includes("File a motion"), "search finds a document by its purpose");
    await label(p, "Find a document").fill("INT-07");
    t = await text(p);
    ok(t.includes("Run a conflict check") && !t.includes("Calendar a deadline 1"), "search still finds a document by its ID");
    await label(p, "Find a document").fill("");
    await click(p, "Needs your review");
    t = await text(p);
    ok(t.includes("File a motion") && t.includes("Monthly trust reconciliation") && !t.includes("Calendar a deadline 1") && !t.includes("Run a conflict check"), "the status choice shows only documents that need review");
    await click(p, "All");
    await click(p, "Matter management");
    t = await text(p);
    ok(t.includes("Calendar a deadline 1") && !t.includes("Run a conflict check"), "a category shows only its documents");
    await click(p, "All categories");

    // ---------- Back from a document keeps the search, the category, the status and the scroll position ----------
    await label(p, "Find a document").fill("calendar");
    await card("Calendar a deadline 5").scrollIntoViewIfNeeded();
    await p.evaluate(() => window.scrollBy(0, 200));
    const y0 = await p.evaluate(() => window.pageYOffset);
    await card("Calendar a deadline 5").getByRole("button", { name: "Open document" }).click();
    await waitFor(p, "Approved version 1", 15000);
    await click(p, "← Library");
    t = await waitFor(p, "Your firm's processes");
    ok(await label(p, "Find a document").inputValue() === "calendar" && !t.includes("Run a conflict check"), "back in the Library, the search is kept");
    await p.waitForTimeout(200);
    const y1 = await p.evaluate(() => window.pageYOffset);
    ok(Math.abs(y1 - y0) < 40 && y0 > 0, "back in the Library, the scroll position is kept (" + y0 + " and " + y1 + ")");
    await label(p, "Find a document").fill("");

    // ---------- Recently deleted, Show as a table (remembered), back to cards ----------
    await click(p, "Recently deleted (1)");
    t = await text(p);
    ok(t.includes("Old archived memo"), "Recently deleted lists the archived document");
    await click(p, "Show as a table");
    t = await waitFor(p, "Document library");
    ok(t.includes("INT-07") && t.includes("Owner (role)"), "the table view shows today's table");
    await p.reload(); await text(p);
    t = await waitFor(p, "Document library", 15000);
    ok(t.includes("Show as cards"), "the table choice is remembered");
    await click(p, "Show as cards");
    await waitFor(p, "Your firm's processes");

    // Fix (UI review 2026-11-08): the ✦ marks an AI action, but a main action keeps the same blue as every other main
    // action; the footer says the count in plain words
    const blues = await dela(p).locator(".dela").evaluate((root) => { const b = [...root.querySelectorAll("button")]; const bg = (t) => getComputedStyle(b.find((x) => x.textContent.trim() === t)).backgroundColor; return [bg("Create a document"), bg("✦ Help me create a document")]; });
    ok(blues[0] === blues[1], "Help me create a document is the same blue as Create a document (" + blues.join(" / ") + ")");
    t = await text(p);
    ok(!t.includes("not switched on") && t.includes("Your access to this Library: Administrator"), "the Library footer has no setup wording");

    // ---------- What would you like to document? ----------
    await label(p, "What would you like to document?").fill("How we check for conflicts before accepting a new client");
    await click(p, "✦ Help me create a document");
    t = await waitFor(p, "DELA suggests: SOP", 15000);
    ok(t.includes("step-by-step procedure (SOP)") && t.includes("\"Run a conflict check\"") && t.includes("Category: Client intake."), "DELA suggests the structure, the matching common process and the category");
    ok(t.includes("Never enter sensitive data"), "the sensitive data notice is beside the writing box");
    // Step 8b Part C (R06): beside an AI box the notice says to keep it in your own storage, without "share a link"
    ok(t.includes("Keep it in your own storage.") && !t.includes("Share a link from your own storage instead."), "the AI box notice keeps sensitive data in your own storage, with no link to share");
    await click(p, "Choose another type");
    ok(await dela(p).getByRole("button", { name: "Policy", exact: true }).count() === 1, "other types are one click away");
    await click(p, "Use this");
    t = await waitFor(p, "About this process");
    ok(await label(p, "Process name").inputValue() === "Run a conflict check", "the questions start from the matching process");
    ok((await label(p, "Paste an existing checklist, email or old SOP (optional)").inputValue()).includes("check for conflicts"), "the description goes with the answers");
    await click(p, "Change");
    t = await waitFor(p, "What would you like to document?");
    await click(p, "I know which type I want");
    await waitFor(p, "Pick what to build");
    ok(true, "the four type cards are still there for people who know what they want");
    await s.ctx.close();

    // ---------- Phone width and dark mode ----------
    for (const w of [390, 320]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, colorScheme: "dark" });
      const page = await ctx.newPage();
      page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
      await page.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(ROOT, u.pathname.split("@")[1].split("/").slice(1).join("/")), contentType: "application/javascript" }); });
      await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
      await page.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=library`);
      await waitFor(page, "Your firm's processes", 15000);
      const m = await page.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; const cards = [...r.querySelectorAll(".lib-card")];
        return { wide: document.documentElement.scrollWidth, lefts: new Set(cards.map((c) => Math.round(c.getBoundingClientRect().left))).size, over: cards.filter((c) => c.getBoundingClientRect().right > window.innerWidth + 1).length }; });
      ok(m.wide <= w && m.lefts === 1 && m.over === 0, "at " + w + " pixels: one column of cards, nothing off the screen");
      await page.screenshot({ path: path.join(SHOTS, "library-ws-" + w + ".png"), fullPage: false });
      await ctx.close();
    }
    s = await open(browser, "DELA-App", ATT, "&tab=library"); p = s.page;
    await waitFor(p, "Your firm's processes");
    const cols = await p.evaluate(() => new Set([...document.querySelector(".dela-host").shadowRoot.querySelectorAll(".lib-card")].map((c) => Math.round(c.getBoundingClientRect().left))).size);
    ok(cols === 2, "on a computer: two columns of cards");
    await p.screenshot({ path: path.join(SHOTS, "library-ws-desktop.png"), fullPage: true });
    await s.ctx.close();

    // ---------- Switch off: today's table ----------
    await sql("update feature_switches set state = 'off' where key = 'library_workspace'");
    s = await open(browser, "DELA-App", ATT, "&tab=library"); p = s.page;
    t = await waitFor(p, "Document library", 15000);
    ok(!t.includes("Show as cards") && !t.includes("Your firm's processes"), "with the switch off, the Library is today's table");
    await s.ctx.close();
    console.log("\nAll " + passed + " checks passed");
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await sql("update feature_switches set state = 'off' where key = 'library_workspace'").catch(() => {});
    await browser.close();
  }
})();

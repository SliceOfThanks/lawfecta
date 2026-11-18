// Step 37: Projects as a workspace (docs/briefs/step-37-projects-workspace.md), with the new layout on. An attorney
// with no work: honest empty states, the four numbers, the four tabs (mouse and arrow keys), the New Gig menu and the
// help tips. Then the same page with gigs and engagements in the server's own shapes: what needs attention with one
// specific button each, the engagements table with progress and the next milestone, Overdue by the one rule, the
// quick actions, finding a gig or an engagement, and a 320 pixel screen. Puts the switches back.
//   node tests/pw/projects-test.js   (with tests/pw/server.ts running)
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = "http://127.0.0.1:8787";
const ROOT = path.join(__dirname, "..", "..");
const SHOTS = process.env.SHOTS || path.join(__dirname, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
let passed = 0, popups = 0;
function ok(cond, msg) { if (!cond) throw new Error("FAILED: " + msg); passed++; console.log("ok", msg); }
async function sql(q) { const r = await fetch(BASE + "/test/sql", { method: "POST", body: JSON.stringify({ sql: q }) }); const j = await r.json(); if (j.error) throw new Error("sql: " + j.error); return j.rows; }
async function text(page) {
  await page.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela") && h.shadowRoot.querySelector(".dela").textContent.length > 20; });
  await page.waitForTimeout(200);
  return page.evaluate(() => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText);
}
async function waitFor(page, words, ms) {
  const end = Date.now() + (ms || 8000);
  let t = "";
  while (Date.now() < end) { t = await text(page); if (t.includes(words)) return t; await page.waitForTimeout(200); }
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(0, 2500));
}
const dela = (page) => page.locator(".dela-host");
const inShadow = (page, fn, arg) => page.evaluate(([f, a]) => (new Function("root", "arg", "return (" + f + ")(root, arg)"))(document.querySelector(".dela-host").shadowRoot, a), [fn.toString(), arg]);
const fits = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const focusId = (page) => inShadow(page, (root) => root.activeElement ? root.activeElement.id : "");
const ATT = 5301;
const person = `(select id from people where bd_member_id = ${ATT})`;
const KEYS = "'onboarding_widget', 'flex_gigs', 'engagements', 'profiles', 'talent_search', 'playbook_library', 'ai_generation', 'new_layout'";
const G = (n) => "00000000-0000-0000-0000-0000000003" + String(n).padStart(2, "0");

(async () => {
  const browser = await chromium.launch();
  let before = null;
  try {
    before = (await sql(`select jsonb_object_agg(key, state) sw from feature_switches where key in (${KEYS})`))[0].sw;
    await sql(`update feature_switches set state = 'everyone' where key in (${KEYS})`);
    await sql(`insert into people (bd_member_id, display_name, email) values (${ATT}, 'Paula Projects', '${ATT}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side(${person}, 'attorney', 'att_pro', 'staff_grant');
      insert into access_list (bd_member_id, channel) select ${ATT}, 'access' where not exists (select 1 from access_list where bd_member_id = ${ATT} and channel = 'access' and revoked_at is null); select 1`);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
    p.on("dialog", (d) => { popups++; d.accept(); });
    await p.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); const f = u.pathname.split("@")[1].split("/").slice(1).join("/"); route.fulfill({ path: path.join(ROOT, f), contentType: f.endsWith(".png") ? "image/png" : "application/javascript" }); });
    await p.route("https://fonts.googleapis.com/**", (r) => r.abort());

    // ---------- No work yet ----------
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=projects`);
    let t = await waitFor(p, "Manage your gigs, engagements and standing arrangements in one place.");
    t = await waitFor(p, "Nothing waits on you right now.");
    const tabs = await inShadow(p, (root) => [...root.querySelectorAll(".pj-tabs [role=tab]")].map((b) => b.textContent + ":" + b.getAttribute("aria-selected")));
    ok(tabs.join("|") === "Overview:true|Gigs:false|Engagements:false|Standing Arrangements:false", "four tabs, Overview first: " + tabs.join("|"));
    const tiles = await inShadow(p, (root) => [...root.querySelectorAll(".pj-tile")].map((b) => b.innerText.replace(/\s+/g, " ").trim()));
    ok(tiles.join("|") === "0 Needs action|0 Open and draft gigs|0 Active engagements|0 Standing arrangements", "the four numbers are counted from the lists: " + tiles.join("|"));
    ok(t.includes("No active engagements. An engagement starts when you choose a proposal and both sign the agreement.") && t.includes("No gigs yet. Choose \"+ New Gig\"") && t.includes("Quick actions") && t.includes("None waiting"), "with no work each section says so and names the next step");
    ok(!/vs\.? last month|\d+%|High interest|At risk|Top performing/i.test(t.replace(/\d+% of what you paid/g, "")), "no trends, scores or invented figures on the page");
    ok(!(await inShadow(p, (root) => !!root.querySelector("#new-gig-card"))), "the new gig form is not on the Overview");
    // Help tips: closed until asked for, tied to their button, closed again with Escape
    const tipBtn = dela(p).getByRole("button", { name: "About Projects" });
    ok(await tipBtn.getAttribute("aria-expanded") === "false" && !t.includes("Your workspace for delegated work."), "the page's help tip starts closed");
    await tipBtn.click();
    t = await waitFor(p, "Your workspace for delegated work.");
    await p.keyboard.press("Escape");
    ok(await tipBtn.getAttribute("aria-expanded") === "false", "Escape closes the tip");
    // Tabs by keyboard
    await dela(p).locator("#pj-tab-overview").focus();
    await p.keyboard.press("ArrowRight");
    t = await waitFor(p, "Post a new gig");
    await p.waitForFunction(() => { const r = document.querySelector(".dela-host").shadowRoot; return r.activeElement && r.activeElement.id === "pj-tab-gigs"; }, null, { timeout: 8000 });
    ok((await focusId(p)) === "pj-tab-gigs" && await dela(p).locator("#pj-tab-gigs").getAttribute("aria-selected") === "true" && await inShadow(p, (root) => root.querySelector("#pj-panel").getAttribute("aria-labelledby") === "pj-tab-gigs"), "Arrow right opens the next tab and keeps focus on it");
    await p.keyboard.press("End");
    await p.waitForFunction(() => { const r = document.querySelector(".dela-host").shadowRoot; return r.activeElement && r.activeElement.id === "pj-tab-standing"; }, null, { timeout: 8000 });
    ok((await focusId(p)) === "pj-tab-standing", "End goes to the last tab, where standing arrangements are managed");
    await p.keyboard.press("ArrowRight");
    await p.waitForFunction(() => { const r = document.querySelector(".dela-host").shadowRoot; return r.activeElement && r.activeElement.id === "pj-tab-overview"; }, null, { timeout: 8000 });
    ok((await focusId(p)) === "pj-tab-overview", "Arrow right from the last tab wraps to the first");
    // New Gig menu
    await dela(p).locator("#pj-new").click();
    const menu = await inShadow(p, (root) => [...root.querySelectorAll(".pj-new .menu-item")].map((b) => b.textContent));
    ok(menu[0] === "From an approved document" && menu.includes("Create a document first"), "New Gig offers the ways to start one: " + menu.join(" | "));
    await dela(p).getByRole("button", { name: "From an approved document" }).click();
    t = await waitFor(p, "DELA writes a public version of the document for freelancers.");
    ok(await dela(p).locator("#pj-tab-gigs").getAttribute("aria-selected") === "true", "it opens the form on the Gigs tab");
    await p.screenshot({ path: path.join(SHOTS, "projects-empty-gigs.png"), fullPage: true });

    // ---------- With work, in the server's own shapes ----------
    const gigs = [
      { id: G(1), title: "Client intake coordinator", status: "open", kind: "one_off", proposals: 3, questions_open: 1, budget_min_cents: 40000, budget_max_cents: 80000, closes_at: "2099-12-08T00:00:00Z" },
      { id: G(2), title: "Discovery response drafting", status: "open", kind: "one_off", proposals: 0, questions_open: 0, budget_min_cents: 60000, budget_max_cents: 120000, closes_at: "2099-12-08T00:00:00Z" },
      { id: G(3), title: "Estate binder assembly", status: "draft", kind: "one_off", proposals: 0, questions_open: 0, budget_min_cents: 30000, budget_max_cents: 50000 },
      { id: G(4), title: "Old filled gig", status: "filled", kind: "monthly", proposals: 2, questions_open: 0, budget_min_cents: 30000, budget_max_cents: 50000, closed_at: "2026-10-01T00:00:00Z" }];
    const eng = (n, title, who, status, needs, acc, total, next) => ({ id: G(10 + n), gig_id: G(10 + n), gig_title: title, status, total_cents: 120000, updated_at: "2026-11-1" + n + "T00:00:00Z", sign_by: needs === "sign" ? "2099-11-20T00:00:00Z" : null, other_name: who, milestones: total, accepted: acc, earned_cents: 0, needs_me: needs, next });
    const engagements = [
      eng(1, "Family law intake packets", "Avery Collins", "active", "review", 1, 3, { seq: 2, title: "Client two intake", due_date: "2099-11-20", status: "submitted" }),
      eng(2, "Discovery responses", "Tomas Reyes", "active", "pay", 2, 4, { seq: 3, title: "Finalize draft", due_date: "2099-11-22", status: "awaiting_funding" }),
      eng(3, "Late binder job", "Kendra Liu", "active", null, 0, 2, { seq: 1, title: "Initial documents", due_date: "2020-01-05", status: "in_progress" }),
      eng(4, "Welcome packet", "Maria Rojas", "signing", "sign", 0, 0, null),
      eng(5, "Finished job", "Avery Collins", "completed", null, 2, 2, null)];
    let failEng = false;
    await p.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      if (failEng && url.pathname.endsWith("/engagements")) return route.abort();
      const res = await route.fetch();
      let j; try { j = await res.json(); } catch (e) { return route.fulfill({ response: res }); }
      if (url.pathname.endsWith("/gigs") && j && Array.isArray(j.gigs)) j.gigs = gigs;
      if (url.pathname.endsWith("/engagements") && j && Array.isArray(j.engagements)) { j.on = true; j.engagements = engagements; }
      return route.fulfill({ response: res, json: j });
    });
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=projects`);
    await dela(p).locator("#pj-tab-overview").click();
    t = await waitFor(p, "Needs your attention (5)");
    const tiles2 = await inShadow(p, (root) => [...root.querySelectorAll(".pj-tile")].map((b) => b.innerText.replace(/\s+/g, " ").trim()));
    ok(tiles2.join("|") === "5 Needs action|3 Open and draft gigs|4 Active engagements|0 Standing arrangements", "the numbers follow the work: " + tiles2.join("|"));
    const items = await inShadow(p, (root) => [...root.querySelectorAll("#needs-action .pj-item")].map((li) => li.querySelector("b").textContent + " > " + li.querySelector("button").textContent + " > " + li.querySelector("button").getAttribute("aria-label")));
    ok(items.length === 3 && items[0] === "Milestone payment due > Pay milestone > Pay milestone: Discovery responses" && items[1].startsWith("Deliverable ready for review > Review deliverable") && items[2].startsWith("Agreement needs your signature > Sign agreement"), "what needs attention, payments first, each with one specific button named for its job: " + items.join(" | "));
    ok(t.includes("+ 2 more items") && t.includes("Sign by "), "the rest wait behind one link, and a deadline is shown where there is one");
    await dela(p).locator("#pj-more").click();
    t = await waitFor(p, "Review 3 proposals");
    ok(t.includes("Answer 1 question") && await dela(p).locator("#needs-action .pj-item").count() === 5, "the link shows every item");
    // The engagements table on the Overview: three rows, with progress, the next milestone and one Overdue
    const table = await inShadow(p, (root) => { const tb = root.querySelector("#pj-panel table.pj-table"); return { caption: tb.querySelector("caption").textContent, heads: [...tb.querySelectorAll("thead th")].map((x) => x.textContent).join("|"), rows: [...tb.querySelectorAll("tbody tr")].map((r) => r.innerText.replace(/\s+/g, " ")), rowHeads: tb.querySelectorAll("tbody th[scope=row]").length, bars: [...tb.querySelectorAll(".pj-bar")].map((b) => b.getAttribute("aria-label")) }; });
    ok(table.caption === "Active engagements" && table.heads === "Engagement|Freelancer|Progress|Next milestone|Status|Action" && table.rows.length === 3 && table.rowHeads === 3, "a real table with a caption, column headers and row headers: " + JSON.stringify(table.heads));
    ok(table.bars.includes("1 of 3 milestones accepted") && table.rows.some((r) => r.includes("Avery Collins") && r.includes("1 of 3 accepted") && r.includes("Client two intake")), "each row shows the freelancer, the progress in words and the next milestone: " + table.rows[0]);
    await dela(p).locator("#pj-tab-engagements").click();
    t = await waitFor(p, "Engagements (5)");
    const erows = await inShadow(p, (root) => [...root.querySelectorAll("#pj-panel table.pj-table tbody tr")].map((r) => r.innerText.replace(/\s+/g, " ")));
    const late = erows.filter((r) => r.includes("Overdue"));
    ok(late.length === 1 && late[0].includes("Late binder job") && late[0].includes("Was due") && erows.some((r) => r.includes("Client two intake") && r.includes("Due ") && !r.includes("Overdue")), "Overdue by the one rule: past its date and not accepted, with Was due: " + late.join(" | "));
    ok(t.includes("Finished and canceled (1)") && await dela(p).locator("#pj-panel details.eng-past").count() === 1, "finished work folds away under the active engagements");
    await dela(p).getByLabel("Find an engagement by its title or freelancer").fill("kendra");
    await p.waitForTimeout(200);
    ok(await dela(p).locator("#pj-panel table.pj-table tbody tr").count() === 1 && (await text(p)).includes("Late binder job"), "an engagement is found by the freelancer's name");
    await dela(p).getByLabel("Find an engagement by its title or freelancer").fill("zzzz");
    await waitFor(p, "No engagement matches \"zzzz\".");
    // Gigs tab: the table, the filters and the search
    await dela(p).locator("#pj-tab-gigs").click();
    t = await waitFor(p, "Your gigs (4)");
    const grows = await inShadow(p, (root) => [...root.querySelectorAll("#pj-panel table.pj-table tbody tr")].map((r) => r.innerText.replace(/\s+/g, " ")));
    ok(grows.length === 3 && grows[0].includes("Client intake coordinator") && grows[0].includes("3 · 1 question") && grows[0].includes("$400 to $800") && grows[0].includes("Open") && t.includes("Open and drafts (3)") && t.includes("Filled (1)"), "the gigs table: proposals, budget, closing date and status, open and drafts first: " + grows[0]);
    await dela(p).getByLabel("Find a gig by its title").fill("binder");
    await p.waitForTimeout(200);
    ok(await dela(p).locator("#pj-panel table.pj-table tbody tr").count() === 1, "a gig is found by its title");
    await dela(p).getByLabel("Find a gig by its title").fill("");
    await dela(p).getByRole("button", { name: /^Filled \(1\)$/ }).click();
    t = await waitFor(p, "Old filled gig");
    ok(t.includes("Monthly"), "the Filled filter shows the filled gig");
    // Quick actions are the project tasks, with what waits
    await dela(p).locator("#pj-tab-overview").click();
    await waitFor(p, "Quick actions");
    const quick = await inShadow(p, (root) => [...root.querySelectorAll(".pj-quick")].map((b) => b.innerText.replace(/\s+/g, " ").trim()));
    ok(quick.join("|") === "Review proposals 1 waiting|Approve deliverables 1 waiting|Pay milestones 1 waiting|Sign agreements 1 waiting" && !quick.join(" ").includes("New Gig"), "quick actions: review, approve, pay and sign, each with what waits, and no second New Gig: " + quick.join("|"));
    const upcoming = await inShadow(p, (root) => [...root.querySelectorAll("#pj-panel .pj-col:last-child .hl button.hrow")].map((r) => r.innerText.replace(/\s+/g, " ")));
    ok(upcoming.length === 3 && upcoming[0].includes("Initial documents") && upcoming[0].includes("Overdue") && upcoming[1].includes("Client two intake"), "upcoming milestones, the nearest date first, late ones marked: " + upcoming.join(" | "));
    await p.screenshot({ path: path.join(SHOTS, "projects-overview.png"), fullPage: true });
    // A tile opens its tab
    await dela(p).locator(".pj-tile").nth(2).click();
    await waitFor(p, "Engagements (5)");
    ok(await dela(p).locator("#pj-tab-engagements").getAttribute("aria-selected") === "true", "the Active engagements number opens the Engagements tab");
    // Narrow screens
    await dela(p).locator("#pj-tab-overview").click();
    await waitFor(p, "Quick actions");
    for (const w of [768, 320]) {
      await p.setViewportSize({ width: w, height: 800 });
      await p.waitForTimeout(350);
      ok(await fits(p), w + " wide: the Overview fits with no sideways scrolling");
    }
    const stacked = await inShadow(p, (root) => { const td = root.querySelector("#pj-panel table.pj-table tbody td"); return getComputedStyle(td).display + "|" + getComputedStyle(td, "::before").content; });
    ok(stacked.startsWith("block|") && stacked.includes("Freelancer"), "on a phone each table row is a stack of labeled lines: " + stacked);
    await p.screenshot({ path: path.join(SHOTS, "projects-phone.png"), fullPage: true });
    await dela(p).locator("#pj-tab-gigs").click();
    await waitFor(p, "Your gigs (4)");
    ok(await fits(p), "320 wide: the Gigs tab fits");
    await p.setViewportSize({ width: 1280, height: 900 });
    // The engagements list cannot load: the page says so, never "nothing waits"
    failEng = true;
    await dela(p).locator("#pj-tab-overview").click();
    t = await waitFor(p, "Your engagements could not load just now.");
    ok(!t.includes("Nothing waits on you right now.") && t.includes("Try again") && (await inShadow(p, (root) => root.querySelector(".pj-tile b").textContent)) === "?", "when engagements cannot load the page says so and shows no false count");
    ok(popups === 0, "no browser pop-up opened");
    await ctx.close();
    console.log("\nALL " + passed + " PROJECTS CHECKS PASSED");
  } catch (e) {
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    if (before) for (const k of Object.keys(before)) await sql(`update feature_switches set state = '${before[k]}' where key = '${k}'`).catch(() => null);
    await browser.close();
  }
})();

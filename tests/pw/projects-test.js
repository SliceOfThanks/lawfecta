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
    // Step 43: the folded sections of "Agreement and work" are open, as with "Open all sections" (the folded page has its own checks in engagements-test.js)
    await ctx.addInitScript((all) => { try { if (all) localStorage.setItem("dela_eg_all", "1"); else localStorage.removeItem("dela_eg_all"); } catch (e) { /* no storage */ } }, true);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
    p.on("dialog", (d) => { popups++; d.accept(); });
    await p.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); const f = u.pathname.split("@")[1].split("/").slice(1).join("/"); route.fulfill({ path: path.join(ROOT, f), contentType: f.endsWith(".png") ? "image/png" : "application/javascript" }); });
    await p.route("https://fonts.googleapis.com/**", (r) => r.abort());

    // ---------- No work yet ----------
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=projects`);
    let t = await waitFor(p, "Manage your gigs, awarded work, milestones and standing arrangements.");
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
    ok(await tipBtn.getAttribute("aria-expanded") === "false" && !t.includes("Manage posted gigs, awarded work, milestones and standing arrangements."), "the page's help tip starts closed");
    // Step 39: one small help tip. It floats by its icon and never moves the page.
    const tipState = () => inShadow(p, (root) => {
      const b = root.querySelector(".help-q[aria-label='About Projects']").getBoundingClientRect();
      const boxes = [...root.querySelectorAll(".tipbox")].filter((x) => !x.hidden).map((x) => { const r = x.getBoundingClientRect(), st = getComputedStyle(x); return { w: Math.round(r.width), left: r.left, right: r.right, top: r.top, pos: st.position, role: x.getAttribute("role"), id: x.id, words: x.innerText }; });
      return { icon: [b.width, b.height, b.bottom], tabs: root.querySelector("#pj-tab-overview").getBoundingClientRect().top, height: root.querySelector(".dela").scrollHeight, boxes, vw: document.documentElement.clientWidth };
    });
    const tip0 = await tipState();
    ok(tip0.icon[0] === 18 && tip0.icon[1] === 18 && tip0.boxes.length === 0, "the help icon is small (18 by 18) and its tip is closed: " + JSON.stringify(tip0.icon));
    await tipBtn.hover();
    let tip1 = await tipState();
    ok(tip1.boxes.length === 1 && tip1.boxes[0].words.includes("Manage posted gigs, awarded work, milestones and standing arrangements.") && tip1.boxes[0].role === "tooltip" && tip1.boxes[0].id === await tipBtn.getAttribute("aria-describedby"), "pointing at the icon opens its tip, tied to the icon");
    ok(tip1.boxes[0].pos === "fixed" && tip1.tabs === tip0.tabs && tip1.height === tip0.height, "the tip floats: nothing on the page moves");
    ok(tip1.boxes[0].w <= 300 && tip1.boxes[0].left >= 8 && tip1.boxes[0].right <= tip1.vw - 8 && tip1.boxes[0].top >= tip1.icon[2], "the tip is at most 300 pixels wide, inside the window, under its icon: " + JSON.stringify(tip1.boxes[0]));
    await dela(p).locator(".tipbox:not([hidden])").hover();
    await p.waitForTimeout(400);
    ok((await tipState()).boxes.length === 1, "the tip stays while the pointer is on it");
    await dela(p).locator("#pj-tab-overview").hover();
    await p.waitForTimeout(400);
    ok((await tipState()).boxes.length === 0 && await tipBtn.getAttribute("aria-expanded") === "false", "it closes when the pointer leaves");
    await tipBtn.click();
    await dela(p).locator("#pj-tab-overview").hover();
    await p.waitForTimeout(400);
    ok((await tipState()).boxes.length === 1 && await tipBtn.getAttribute("aria-expanded") === "true", "a click keeps the tip open");
    await dela(p).getByRole("button", { name: /^About Needs your attention/ }).click();
    tip1 = await tipState();
    ok(tip1.boxes.length === 1 && !tip1.boxes[0].words.includes("Manage posted gigs, awarded work, milestones and standing arrangements."), "opening another tip closes the first: one tip at a time");
    await dela(p).locator("h1").first().click();
    ok((await tipState()).boxes.length === 0, "a click anywhere else closes the tip");
    await tipBtn.click();
    await dela(p).locator(".tipbox:not([hidden]) .tip-x").click();
    ok((await tipState()).boxes.length === 0, "the x in the tip closes it");
    await tipBtn.click();
    t = await waitFor(p, "Manage posted gigs, awarded work, milestones and standing arrangements.");
    await p.keyboard.press("Escape");
    ok(await tipBtn.getAttribute("aria-expanded") === "false" && (await tipState()).boxes.length === 0, "Escape closes the tip");
    // Tabs by keyboard
    await dela(p).locator("#pj-tab-overview").focus();
    await p.keyboard.press("ArrowRight");
    await p.waitForFunction(() => document.querySelector(".dela-host").shadowRoot.querySelector("#pj-panel[aria-labelledby=pj-tab-gigs]"), null, { timeout: 8000 });
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
    t = await waitFor(p, "1. Choose your work");
    ok(t.includes("Post a New Gig") && await dela(p).locator(".pj-tabs").count() === 0, "it opens the page for posting a gig (step 38)");
    await dela(p).locator("#gs-cancel").click();
    await waitFor(p, "Quick actions");
    ok(await dela(p).locator("#pj-tab-overview").getAttribute("aria-selected") === "true", "Cancel returns to Projects");

    // ---------- With work, in the server's own shapes ----------
    const gigs = [
      { id: G(1), title: "Client intake coordinator", status: "open", kind: "one_off", proposals: 3, questions_open: 1, budget_min_cents: 40000, budget_max_cents: 80000, closes_at: "2099-12-08T00:00:00Z" },
      { id: G(2), title: "Discovery response drafting", status: "open", kind: "one_off", proposals: 0, questions_open: 0, budget_min_cents: 60000, budget_max_cents: 120000, closes_at: "2099-12-08T00:00:00Z" },
      { id: G(3), title: "Estate binder assembly", status: "draft", kind: "one_off", proposals: 0, questions_open: 0, budget_min_cents: null, budget_max_cents: null },
      { id: G(4), title: "Old filled gig", status: "filled", kind: "monthly", proposals: 2, questions_open: 0, budget_min_cents: 30000, budget_max_cents: 50000, closed_at: "2026-10-01T00:00:00Z" }];
    const eng = (n, title, who, status, needs, acc, total, next) => ({ id: G(10 + n), gig_id: G(10 + n), gig_title: title, status, total_cents: 120000, updated_at: "2026-11-1" + n + "T00:00:00Z", sign_by: needs === "sign" ? "2099-11-20T00:00:00Z" : null, other_name: who, milestones: total, accepted: acc, earned_cents: 0, needs_me: needs, next });
    const engagements = [
      eng(1, "Family law intake packets", "Avery Collins", "active", "review", 1, 3, { seq: 2, title: "Client two intake", due_date: "2020-03-01", status: "submitted" }),
      eng(2, "Discovery responses", "Tomas Reyes", "active", "pay", 2, 4, { seq: 3, title: "Finalize draft", due_date: "2099-11-22", status: "awaiting_funding" }),
      eng(3, "Late binder job", "Kendra Liu", "active", null, 0, 2, { seq: 1, title: "Initial documents", due_date: "2020-01-05", status: "in_progress" }),
      eng(4, "Welcome packet", "Maria Rojas", "signing", "sign", 0, 0, { seq: 1, title: "Welcome letter", due_date: "2020-02-01", status: "pending" }),
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
    const table = await inShadow(p, (root) => { const tb = root.querySelector("#pj-panel table.pj-table"); return { caption: tb.querySelector("caption").textContent, heads: [...tb.querySelectorAll("thead th .pj-th")].map((x) => x.textContent).join("|"), tips: [...tb.querySelectorAll("thead th .help-q")].map((x) => x.getAttribute("aria-label")).join("|"), acts: [...tb.querySelectorAll("tbody td:last-child button")].map((x) => x.textContent + " > " + x.getAttribute("aria-label")), rows: [...tb.querySelectorAll("tbody tr")].map((r) => r.innerText.replace(/\s+/g, " ")), rowHeads: tb.querySelectorAll("tbody th[scope=row]").length, bars: [...tb.querySelectorAll(".pj-bar")].map((b) => b.getAttribute("aria-label")) }; });
    ok(table.caption === "Active engagements" && table.heads === "Engagement|Freelancer|Milestones accepted|Next milestone|Status|Action" && table.tips === "About Milestones accepted|About Next milestone" && table.rows.length === 3 && table.rowHeads === 3, "a real table with a caption, column headers and row headers: " + JSON.stringify(table.heads));
    ok(table.bars.includes("1 of 3 milestones accepted") && table.rows.some((r) => r.includes("Avery Collins") && r.includes("1 of 3 accepted") && r.includes("Client two intake")), "each row shows the freelancer, the progress in words and the next milestone: " + table.rows[0]);
    // Step 40: the button names the next step when one waits on the attorney; otherwise it opens the engagement
    ok(table.acts.every((a) => /^(Pay milestone|Review deliverable|Sign agreement|View engagement) > (Pay milestone|Review deliverable|Sign agreement|View engagement): ./.test(a)) && !table.acts.some((a) => a.startsWith("View >")), "each engagement's button names its step and its job: " + table.acts.join(" | "));
    ok(!t.includes("About projects.") && !t.includes("Ask DELA a question") && t.indexOf("Your gigs (") < t.indexOf("Needs your attention"), "Your gigs is first on the Overview; the About projects note and Home's Ask DELA box are not there (Stacey 2026-11-18)");
    await dela(p).locator("#pj-tab-engagements").click();
    t = await waitFor(p, "Engagements (4)");
    const eacts = await inShadow(p, (root) => [...root.querySelectorAll("#pj-panel table.pj-table tbody td:last-child button")].map((x) => x.textContent));
    ok(eacts.includes("Pay milestone") && eacts.includes("Review deliverable") && eacts.includes("Sign agreement") && eacts.includes("View engagement"), "the Engagements tab: pay, review, sign, or view: " + eacts.join(" | "));
    // Step 41: a filter per status the active engagements really have
    const pills = await inShadow(p, (root) => [...root.querySelectorAll("#pj-eng-filter button")].map((b) => b.textContent + ":" + b.getAttribute("aria-pressed")));
    ok(pills.join("|") === "All active (4):true|Active (3):false|Needs your signature (1):false", "the status filter offers only statuses that exist, with counts: " + pills.join("|"));
    await dela(p).getByRole("button", { name: "Needs your signature (1)" }).click();
    const frows = await inShadow(p, (root) => [...root.querySelector("#pj-panel table.pj-table").querySelectorAll("tbody tr")].map((r) => r.innerText.replace(/\s+/g, " ")));
    ok(frows.length === 1 && frows[0].includes("Welcome packet") && (await inShadow(p, (root) => root.querySelector("#pj-panel [role=status].sr").textContent)) === "1 active engagement shown.", "the filter shows that status only and says how many are shown");
    await dela(p).getByRole("button", { name: "All active (4)" }).click();
    const erows = await inShadow(p, (root) => [...root.querySelectorAll("#pj-panel table.pj-table tbody tr")].map((r) => r.innerText.replace(/\s+/g, " ")));
    const late = erows.filter((r) => r.includes("Overdue"));
    ok(late.length === 1 && late[0].includes("Late binder job") && late[0].includes("Was due") && erows.some((r) => r.includes("Client two intake") && r.includes("Delivered, was due") && !r.includes("Overdue")), "Overdue by the one rule: past its date and not accepted, with Was due: " + late.join(" | "));
    ok(erows.some((r) => r.includes("Welcome packet") && r.includes("Was planned for") && !r.includes("Overdue") && !r.includes("Was due")), "an agreement that is not signed yet is never overdue, whatever its planned date (step 40)");
    // Check 10, second run: a filter does not stay when the tab is opened again, and the panel is not a keyboard stop
    await dela(p).getByRole("button", { name: "Needs your signature (1)" }).click();
    await dela(p).locator("#pj-tab-overview").click();
    await dela(p).locator("#pj-tab-engagements").click();
    await p.waitForFunction(() => document.querySelector(".dela-host").shadowRoot.querySelector("#pj-eng-filter [aria-pressed=true]"), null, { timeout: 8000 });
    ok(await inShadow(p, (root) => root.querySelector("#pj-eng-filter [aria-pressed=true]").textContent.indexOf("All active") === 0 && root.querySelectorAll("#pj-panel table.pj-table tbody tr").length >= 4 && !root.querySelector("#pj-panel").hasAttribute("tabindex")), "opening the Engagements tab again shows every active engagement, and the panel is not a keyboard stop");
    t = await text(p);
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
    const gacts = await inShadow(p, (root) => [...root.querySelectorAll("#pj-panel table.pj-table tbody tr")].map((r) => r.querySelector(".badge").textContent + " > " + r.querySelector("td:last-child button").textContent + " > " + r.querySelector("td:last-child button").getAttribute("aria-label")));
    ok(gacts.every((a) => /^Draft > Continue draft > Continue draft: .|^Open > (Review proposals > Review proposals|View gig > View gig): ./.test(a)) && gacts.some((a) => a.startsWith("Open > Review proposals")), "each gig's button says what it does: " + gacts.join(" | "));
    ok(grows.some((r) => r.includes("Estate binder assembly") && r.includes("Budget not set") && r.includes("Not set")), "a draft with no budget says Budget not set, and no closing date says Not set");
    ok(!t.includes("$0 to $0") && await dela(p).locator("#new-gig-card").count() === 0 && (await inShadow(p, (root) => [...root.querySelectorAll("#pj-panel thead .pj-th")].map((x) => x.textContent).join("|"))) === "Gig|Proposals|Budget|Closing date|Status|Action", "the gigs table: its columns, no $0 to $0, and no second New Gig");
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
    ok(await dela(p).getByRole("button", { name: "About Quick actions" }).count() === 1, "Quick actions has its help tip beside the heading");
    const quick = await inShadow(p, (root) => [...root.querySelectorAll(".pj-quick")].map((b) => b.innerText.replace(/\s+/g, " ").trim()));
    ok(quick.join("|") === "Review proposals 1 gig with proposals|Approve deliverables 1 waiting|Pay milestones 1 waiting|Sign agreements 1 waiting" && !quick.join(" ").includes("New Gig"), "quick actions: review, approve, pay and sign, each with what waits, and no second New Gig: " + quick.join("|"));
    const upcoming = await inShadow(p, (root) => [...root.querySelectorAll("#pj-panel .pj-up-b")].map((r) => r.innerText.replace(/\s+/g, " ")));
    ok(upcoming.length === 3 && upcoming[0].includes("Initial documents") && upcoming[0].includes("Overdue") && upcoming[1].includes("Client two intake"), "upcoming milestones, the nearest date first, late ones marked: " + upcoming.join(" | "));
    // The right column keeps a readable width, or sits under the left one
    const cols = await inShadow(p, (root) => { const c = root.querySelectorAll("#pj-panel .pj-col"); const a = c[0].getBoundingClientRect(), b = c[1].getBoundingClientRect(); const tt = root.querySelector(".pj-up-t").getBoundingClientRect(); return { side: b.left > a.right - 1, right: Math.round(b.width), words: Math.round(tt.width) }; });
    ok((cols.side ? cols.right >= 320 : true) && cols.words >= 150, "Upcoming milestones keeps a readable width: " + JSON.stringify(cols));
    // Check 10 (2026-11-18): the engagements table has the full width of the page and stays inside its card
    const wide = await inShadow(p, (root) => { const pn = root.querySelector("#pj-panel").getBoundingClientRect(), tb = root.querySelector("#pj-panel .pj-full table.pj-table"), cd = tb.closest(".card").getBoundingClientRect(), t = tb.getBoundingClientRect(); return { panel: Math.round(pn.width), card: Math.round(cd.width), inside: t.right <= cd.right + 1 && t.left >= cd.left - 1, btn: [...tb.querySelectorAll("td:last-child button")].every((x) => x.getBoundingClientRect().height < 50) }; });
    const gw = await inShadow(p, (root) => { const c = [...root.querySelectorAll("#pj-panel .card")].find((x) => x.textContent.indexOf("Your gigs") === 0); return Math.round(c.getBoundingClientRect().width); });
    ok(gw >= wide.panel - 2, "Your gigs is as wide as the page: " + gw);
    ok(wide.card >= wide.panel - 2 && wide.inside && wide.btn, "Active engagements is as wide as the page, the table stays inside its card and the buttons are one line: " + JSON.stringify(wide));
    ok(cols.side, "at 1280 wide, Quick actions sits at the right of Needs your attention");
    // 2026-11-18: no long right column beside an empty left side. The two cards of the row end at the same line,
    // and Upcoming milestones is its own row, as wide as the page, with the milestones side by side
    const bal = await inShadow(p, (root) => { const c = root.querySelectorAll("#pj-panel .pj-col"); const a = c[0].querySelector(".card").getBoundingClientRect(), b = c[1].querySelector(".card").getBoundingClientRect(); const uc = root.querySelector("#pj-panel .pj-uprow .card").getBoundingClientRect(); const u = [...root.querySelectorAll("#pj-panel .pj-uprow .pj-up-b")].map((x) => x.getBoundingClientRect()); const q = [...root.querySelectorAll(".pj-quick")].map((x) => x.getBoundingClientRect()); return { gap: Math.round(Math.abs(a.bottom - b.bottom)), inRight: c[1].querySelectorAll(".card").length, upWide: Math.round(uc.width), upUnder: uc.top >= a.bottom - 1, sameRow: u.every((x) => Math.abs(x.top - u[0].top) < 2), across: u[1].left > u[0].right - 1, qIn: q.every((x) => x.bottom <= b.bottom + 1) }; });
    ok(bal.gap <= 2 && bal.inRight === 1 && bal.qIn, "Needs your attention and Quick actions end at the same line, and Quick actions is alone at the right: " + JSON.stringify(bal));
    ok(bal.upWide >= wide.panel - 2 && bal.upUnder && bal.sameRow && bal.across, "Upcoming milestones is as wide as the page, with its milestones side by side: " + JSON.stringify(bal));
    // A mouse click on a tab keeps the keyboard on that tab, and the page is not loaded again
    await inShadow(p, (root) => { root.querySelector("#pj-tab-overview").dataset.kept = "1"; });
    await dela(p).locator("#pj-tab-standing").click();
    await p.waitForFunction(() => document.querySelector(".dela-host").shadowRoot.querySelector("#pj-panel[aria-labelledby=pj-tab-standing]"), null, { timeout: 8000 });
    ok((await focusId(p)) === "pj-tab-standing" && await inShadow(p, (root) => root.querySelector("#pj-tab-overview").dataset.kept === "1"), "a click on a tab keeps the focus on it and does not load the page again");
    await p.keyboard.press("Home");
    await p.waitForFunction(() => { const r = document.querySelector(".dela-host").shadowRoot; return r.activeElement && r.activeElement.id === "pj-tab-overview"; }, null, { timeout: 8000 });
    ok(await inShadow(p, (root) => root.querySelector("#pj-panel").getAttribute("aria-labelledby") === "pj-tab-overview"), "Home after a click goes back to the first tab");
    await waitFor(p, "Quick actions");
    await p.screenshot({ path: path.join(SHOTS, "projects-overview.png"), fullPage: true });
    // A tile opens its tab
    await dela(p).locator(".pj-tile").nth(2).click();
    await waitFor(p, "Engagements (4)");
    ok(await dela(p).locator("#pj-tab-engagements").getAttribute("aria-selected") === "true", "the Active engagements number opens the Engagements tab");
    // Narrow screens
    await dela(p).locator("#pj-tab-overview").click();
    await waitFor(p, "Quick actions");
    for (const w of [768, 320]) {
      await p.setViewportSize({ width: w, height: 800 });
      await p.waitForTimeout(350);
      ok(await fits(p), w + " wide: the Overview fits with no sideways scrolling");
      const nar = await inShadow(p, (root) => { const c = root.querySelectorAll("#pj-panel .pj-col"); return [c[1].getBoundingClientRect().top >= c[0].getBoundingClientRect().bottom - 1, Math.round(root.querySelector(".pj-up-t").getBoundingClientRect().width)]; });
      ok(nar[0] && nar[1] >= 150, w + " wide: the right column sits under the left one and its words keep their width: " + nar.join(", "));
      if (w === 320) ok(await inShadow(p, (root) => { const u = [...root.querySelectorAll("#pj-panel .pj-uprow .pj-up-b")].map((x) => x.getBoundingClientRect()); return u[1].top >= u[0].bottom - 1; }), "320 wide: the upcoming milestones sit one under the other");
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
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=projects`);
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

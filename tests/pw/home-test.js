// Step 33: the Home each member arranges (docs/briefs/step-33-home-dashboard.md). An attorney: the default widgets in
// two columns, the Customize panel (add, the switch that removes, "Move up" by keyboard, dragging the handle, Cancel,
// leaving with Escape, Save, Reset to default), the layout after a reload, a widget that cannot load, and the widths
// 768 and 320. A freelancer: their own widget list and layout, and the profile card that stays while the profile is
// not complete. Removing a widget never changes the bell. Runs with the new layout on and puts the switches back.
//   node tests/pw/home-test.js   (with tests/pw/server.ts running)
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
async function open(browser, uid, query, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w || 1280, height: h || 900 } });
  // Step 43: the folded sections of "Agreement and work" are open, as with "Open all sections" (the folded page has its own checks in engagements-test.js)
  await ctx.addInitScript((all) => { try { if (all) (localStorage.setItem("dela_eg_all", "1"), localStorage.setItem("dela_pf_all", "1")); else localStorage.removeItem("dela_eg_all"); } catch (e) { /* no storage */ } }, true);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => { popups++; d.accept(); });
  await page.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); const f = u.pathname.split("@")[1].split("/").slice(1).join("/"); route.fulfill({ path: path.join(ROOT, f), contentType: f.endsWith(".png") ? "image/png" : "application/javascript" }); });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto(`${BASE}/page/DELA-App?uid=${uid}&plan=${query || ""}`);
  await text(page);
  return { ctx, page };
}
async function text(page) {
  await page.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela") && h.shadowRoot.querySelector(".dela").textContent.length > 20; });
  await page.waitForTimeout(200);
  return page.evaluate(() => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText);
}
const dela = (page) => page.locator(".dela-host");
async function waitFor(page, words, ms) {
  const end = Date.now() + (ms || 8000);
  let t = "";
  while (Date.now() < end) { t = await text(page); if (t.includes(words)) return t; await page.waitForTimeout(200); }
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(0, 2500));
}
async function waitGone(page, words, ms) {
  const end = Date.now() + (ms || 8000);
  let t = "";
  while (Date.now() < end) { t = await text(page); if (!t.includes(words)) return t; await page.waitForTimeout(200); }
  throw new Error("FAILED: still see \"" + words + "\"");
}
const inShadow = (page, fn, arg) => page.evaluate(([f, a]) => (new Function("root", "arg", "return (" + f + ")(root, arg)"))(document.querySelector(".dela-host").shadowRoot, a), [fn.toString(), arg]);
const fits = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const onHome = (page) => inShadow(page, (root) => [...root.querySelectorAll("#home-grid [data-widget]")].sort((a, b) => Number(a.getAttribute("data-pos")) - Number(b.getAttribute("data-pos"))).map((x) => x.getAttribute("data-widget")));
// How many columns the cards stand in, and whether the page holds them in the member's order (the order the Tab key follows)
const columns = (page) => inShadow(page, (root) => new Set([...root.querySelectorAll("#home-grid > [data-widget]")].map((x) => Math.round(x.getBoundingClientRect().left))).size);
const inPage = (page) => inShadow(page, (root) => [...root.querySelectorAll("#home-grid > [data-widget]")].map((x) => x.getAttribute("data-widget")));
const rowName = (page, sel) => inShadow(page, (root, s) => { const b = root.querySelector(s); if (!b || !b.getAttribute("aria-labelledby")) return ""; return b.getAttribute("aria-labelledby").split(" ").map((i) => root.getElementById(i).textContent).join(" "); }, sel);
const inPanel = (page) => inShadow(page, (root) => [...root.querySelectorAll("#cz-mine li")].map((x) => x.getAttribute("data-id")));
const offered = (page) => inShadow(page, (root) => [...root.querySelectorAll("#cz-avail li")].map((x) => x.getAttribute("data-id")));
const grip = (page, id) => inShadow(page, (root, i) => { const r = root.querySelector('#cz-mine li[data-id="' + i + '"] .cz-grip').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, id);
const focusName = (page) => inShadow(page, (root) => root.activeElement ? (root.activeElement.getAttribute("aria-label") || root.activeElement.id || root.activeElement.textContent) : "");
const ATT = 5201, FL = 5202, OWN = 5203, MEM = 5204;
const person = (bd) => `(select id from people where bd_member_id = ${bd})`;
async function makeMember(bd, side, plan, name) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, '${name}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side(${person(bd)}, '${side}', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and channel = 'access' and revoked_at is null); select 1`);
}
const KEYS = "'onboarding_widget', 'flex_gigs', 'engagements', 'profiles', 'talent_search', 'playbook_library', 'ai_generation', 'gig_chat', 'meetings', 'bench', 'reviews', 'automate_delegate', 'agency_team', 'new_layout'";
const DEF_ATT = ["attention", "delegating", "projects", "talent", "spend", "ask"];

(async () => {
  const browser = await chromium.launch();
  let s, p, t, before = null;
  try {
    before = (await sql(`select jsonb_object_agg(key, state) sw from feature_switches where key in (${KEYS})`))[0].sw;
    await sql(`update feature_switches set state = 'everyone' where key in (${KEYS})`);
    await makeMember(ATT, "attorney", "att_pro", "Hana Home");
    await makeMember(FL, "freelancer", "fl_plus", "Finn Home");
    await sql(`delete from home_layouts where person_id in (${person(ATT)}, ${person(FL)}); select 1`);
    await sql(`insert into notifications (person_id, channel, kind, title, body, dedupe_key) values (${person(ATT)}, 'in_app', 'system', 'Home check notice', 'Still unread.', 'home-pw-' || gen_random_uuid()); select 1`);

    // ---------- Attorney: the six default widgets of the role ----------
    s = await open(browser, ATT, "&tab=home", 1280, 900);
    p = s.page;
    t = await waitFor(p, "Your Workspace");
    t = await waitFor(p, "No recorded delegation spend this month.");
    ok(t.includes("Your work, your priorities.") && t.includes("Customize dashboard"), "attorney: the heading, the welcome line and the Customize button: " + t.slice(0, 300).replace(/\n/g, " | "));
    let home = await onHome(p);
    ok(JSON.stringify(home) === JSON.stringify(DEF_ATT), "attorney: the six default widgets of the role, in order: " + home.join(", "));
    ok(t.includes("Needs your attention") && t.includes("Things to consider delegating") && t.includes("My projects and milestones") && t.includes("Proposals and talent matches") && t.includes("Delegation spend and results") && t.includes("Ask DELA"), "attorney: each widget has its name");
    ok(!t.includes("Account status"), "Account status is not on Home");
    ok(t.includes("Approve a document in the Library to get delegation ideas.") && t.includes("No open gig. Post a gig from Projects"), "attorney: with no documents and no gigs each widget says so and names the next step, with no invented numbers");
    ok(t.includes("Milestones accepted") && t.includes("Engagements completed") && !t.includes("hours saved"), "spend: only measured results, no hours saved");
    const spendSaid = await inShadow(p, (root) => { const r = root.querySelector("[data-widget=spend] .hw-amount"); return (r ? r.getAttribute("aria-label") : "") + "|" + root.querySelectorAll("[data-widget=spend] .usage-ring").length; });
    ok(spendSaid === "Nothing paid this month|0" && t.includes("Post a gig →"), "spend: the amount as text with no ring, and a next step when nothing was spent: " + spendSaid);
    const gap = await inShadow(p, (root) => { const c = root.querySelector("[data-widget=spend]"), a = c.querySelector(".hw-lines").getBoundingClientRect(), b = [...c.querySelectorAll(".hmini")].pop().getBoundingClientRect(); return Math.round(b.top - a.bottom); });
    ok(gap >= 0 && gap <= 24, "spend: no empty gap between the next step and the results: " + gap + " pixels");
    ok(t.includes("View all projects →") && t.includes("Find talent →") && t.includes("Open the Library →"), "attorney: each widget links to its full page");
    ok((await columns(p)) === 2, "attorney at 1280: two columns");
    ok(JSON.stringify(await inPage(p)) === JSON.stringify(DEF_ATT), "the page holds the cards in the member's order, so Tab and a screen reader follow it");
    const tops = await inShadow(p, (root) => [...root.querySelectorAll("#home-grid > [data-widget]")].map((x) => Math.round(x.getBoundingClientRect().top)));
    ok(tops[0] === tops[1] && tops[2] > tops[0] && tops[4] > tops[2], "the two columns start level, and each goes down in the member's order: " + tops.join(", "));
    // Stacey 2026-11-19: each column is stacked on its own, so a short card leaves no hole beside a tall one
    const stack = await inShadow(p, (root) => { const b = [...root.querySelectorAll("#home-grid > [data-widget]")].map((x) => x.getBoundingClientRect()); const out = [];
      for (let i = 2; i < b.length; i++) out.push({ gap: Math.round(b[i].top - b[i - 2].bottom), sameCol: Math.abs(b[i].left - b[i - 2].left) < 2 }); return out; });
    ok(stack.length > 0 && stack.every((s) => s.sameCol && s.gap >= 16 && s.gap <= 24), "each card starts right under the card above it in its own column: " + JSON.stringify(stack));
    ok(await inShadow(p, (root) => root.querySelectorAll(".usage-meter").length === 0), "no second usage line under the cards");
    ok(await inShadow(p, (root) => [...root.querySelectorAll(".home-dash .linkish")].every((b) => b.getBoundingClientRect().height >= 24)), "every link on Home is at least 24 pixels tall");
    ok(await inShadow(p, (root) => { const q = root.querySelector("#home-ask-q"); return !q || (!!root.querySelector("label[for=home-ask-q]") && !q.getAttribute("aria-label")); }), "the Ask DELA box has a label that stays visible");
    const heights = await inShadow(p, (root) => [...root.querySelectorAll("#home-grid [data-widget]")].map((x) => Math.round(x.getBoundingClientRect().height)));
    ok(new Set(heights).size > 1, "cards keep their own height, none is stretched to its neighbor: " + heights.join(", "));
    ok(await inShadow(p, (root) => root.querySelectorAll(".hero").length === 0), "the old banner is not on this Home");
    const bell = await inShadow(p, (root) => root.querySelector(".bell.icon").getAttribute("aria-label"));
    ok(/Notifications, \d+ unread/.test(bell), "the bell counts the unread notification: " + bell);
    // The period of the spend widget
    await dela(p).getByLabel("Period").selectOption("year");
    t = await waitFor(p, "No recorded delegation spend this year.");
    ok(t.includes("Results this year"), "spend: the period can be changed and is named");
    await p.screenshot({ path: path.join(SHOTS, "home-default.png"), fullPage: true });

    // ---------- Late work and a failed payment, in the server's own shapes (review 2026-11-17, items 2, 4, 8, 9) ----------
    const G1 = "00000000-0000-0000-0000-000000000011", G2 = "00000000-0000-0000-0000-000000000012";
    const fakeHome = async (route) => {
      const res = await route.fetch();
      let j; try { j = await res.json(); } catch (e) { return route.fulfill({ response: res }); }
      if (j && j.me && j.me.home) {
        j.me.home.attention = [{ kind: "sign", gig_id: G1, gig_title: "Late job", sign_by: "2099-01-01T00:00:00Z" },
          { kind: "pay", gig_id: G2, gig_title: "Custody job", seq: 2, first: false, amount_cents: 120000, failed_at: "2026-11-10T15:00:00Z" }];
        j.me.home.projects = [{ gig_id: G1, gig_title: "Late job", status: "active", other_name: "Pat Para", next: { seq: 1, title: "Draft", due_date: "2020-01-05", status: "funded" } },
          { gig_id: G2, gig_title: "Delivered job", status: "active", other_name: "Pat Para", next: { seq: 1, title: "Draft", due_date: "2020-01-05", status: "submitted" } },
          { gig_id: G2, gig_title: "Later job", status: "active", other_name: "Pat Para", next: { seq: 1, title: "Draft", due_date: "2099-01-05", status: "funded" } }];
        j.me.home.active_projects = 3; j.me.home.proposals_to_review = 3;
      }
      return route.fulfill({ response: res, json: j });
    };
    await p.route("**/api/**", fakeHome);
    await p.reload();
    t = await waitFor(p, "Late job");
    t = await waitFor(p, "Proposals to review");
    ok(/Milestone 2 · \$1,200(\.00)? · payment failed on [A-Z][a-z]+ \d+, 2026/.test(t), "a failed payment says the milestone, the amount and the day it failed");
    ok(t.indexOf("The payment for milestone 2 did not go through") < t.indexOf("Agreement to sign"), "the failed payment is listed first");
    const payName = await rowName(p, "[data-widget=attention] button.hrow");
    ok(payName === "Pay milestone: The payment for milestone 2 did not go through", "a row is named by its action and its title for a screen reader: " + payName);
    ok(await inShadow(p, (root) => { const b = root.querySelector("[data-widget=attention] button.hrow"); return (b.getAttribute("aria-describedby") || "").split(" ").filter(Boolean).every((i) => !!root.getElementById(i)) && !!b.getAttribute("aria-describedby"); }), "the detail line is read after the name");
    const proj = await inShadow(p, (root) => [...root.querySelectorAll("[data-widget=projects] button.hrow")].map((r) => r.innerText.replace(/\s+/g, " ")));
    ok(proj.length === 3 && /was due .*2020/.test(proj[0]) && proj[0].includes("Overdue") && !proj[1].includes("Overdue") && !proj[2].includes("Overdue") && / due .*2099/.test(proj[2]), "one rule for late work: past its date and not accepted is Overdue with Was due; delivered work and later dates are not: " + proj.join(" | "));
    ok(/3\s*Proposals to review/.test(t) && !t.includes("New proposals"), "the proposals count is the one Ask DELA uses, named Proposals to review");
    await p.screenshot({ path: path.join(SHOTS, "home-late-work.png"), fullPage: true });
    await p.unroute("**/api/**", fakeHome);
    await p.reload();
    await waitFor(p, "No recorded delegation spend this month.");

    // ---------- The Customize panel: add, move by keyboard, leave without saving ----------
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    t = await waitFor(p, "Your dashboard (6)");
    ok(t.includes("Available widgets") && t.includes("Removing a widget only hides it on Home.") && t.includes("Restore default"), "the panel opens with the member's widgets, the others, and what removing means");
    ok(t.includes("Home updates behind this panel as you make changes. Nothing is kept until you choose Save changes."), "the panel says Home behind it is a live preview");
    const modal = await inShadow(p, (root) => { const d = root.querySelector(".cz-panel"), behind = [...root.querySelector(".dela").children].filter((n) => n !== d && !n.classList.contains("dela-scrim"));
      return { modal: d.getAttribute("aria-modal"), named: root.getElementById(d.getAttribute("aria-labelledby")).textContent, inert: behind.length > 0 && behind.every((n) => n.hasAttribute("inert")), dim: parseFloat(getComputedStyle(root.querySelector(".dela-scrim")).backgroundColor.split(",")[3]),
        defs: [...root.querySelectorAll("#cz-mine .cz-def")].length, defsAvail: [...root.querySelectorAll("#cz-avail .cz-def")].length }; });
    ok(modal.modal === "true" && modal.named === "Customize dashboard" && modal.inert, "the panel is a modal dialog: named, and the page behind it cannot be reached: " + JSON.stringify(modal));
    ok(modal.dim <= 0.2, "the page behind is only lightly dimmed, so the preview can be read: " + modal.dim);
    ok(modal.defs === 6 && modal.defsAvail === 0, "widgets of the default layout carry a Default tag");
    // Tab stays inside the panel: forward from the last control goes to Close, back from Close goes to the last control
    await dela(p).getByRole("button", { name: "Cancel", exact: true }).focus();
    await p.keyboard.press("Tab");
    const afterLast = await focusName(p);
    await p.keyboard.press("Shift+Tab");
    ok(afterLast === "Close customize dashboard" && (await focusName(p)) === "cz-cancel", "Tab and Shift+Tab stay inside the panel: " + afterLast);
    const off = await offered(p);
    ok(JSON.stringify(off) === JSON.stringify(["bench", "standing", "workflow", "meetings", "messages", "usage", "notifications", "quick"]), "the attorney's other widgets are offered: " + off.join(", "));
    ok(await dela(p).getByRole("button", { name: "Save changes" }).isDisabled(), "nothing changed yet: Save changes is off");
    ok(await inShadow(p, (root) => !!root.querySelector("#home-grid [data-widget=projects]")), "Home stays in view behind the panel");
    const rowBtns = await inShadow(p, (root) => [...root.querySelectorAll('#cz-mine li[data-id="spend"] button')].map((b) => b.getAttribute("aria-label")));
    ok(JSON.stringify(rowBtns) === JSON.stringify(["Move Delegation spend and results up", "Move Delegation spend and results down", "Remove Delegation spend and results"]), "each row has its own visible Move up, Move down and Remove, named for the widget: " + rowBtns.join(" | "));
    await dela(p).getByRole("button", { name: "Add Quick actions to Home" }).click();
    await waitFor(p, "Your dashboard (7)");
    home = await onHome(p);
    ok(home[home.length - 1] === "quick", "the added widget shows on Home at once, as a preview");
    ok(!(await dela(p).getByRole("button", { name: "Save changes" }).isDisabled()), "a change turns Save changes on");
    // Keyboard only
    await dela(p).getByRole("button", { name: "Move Quick actions up" }).focus();
    await p.keyboard.press("Enter");
    await p.waitForTimeout(250);
    let mine = await inPanel(p);
    ok(mine.indexOf("quick") === 5 && mine.length === 7, "keyboard: Move up moves the widget one place: " + mine.join(", "));
    ok((await focusName(p)) === "Move Quick actions up", "keyboard: focus stays on the same control of the moved widget");
    ok((await inShadow(p, (root) => root.querySelector(".cz-panel [role=status]").textContent)).includes("Quick actions moved to position 6 of 7."), "a screen reader hears the new place");
    await p.keyboard.press("Escape");
    await waitFor(p, "Discard your changes?");
    ok((await focusName(p)) === "cz-keep" && popups === 0, "Escape with changes asks inside the panel, with focus on Keep editing, and no browser pop-up");
    // ChatGPT report 2026-11-17: the question opened below the visible part of the panel, and Close sat on top of a row's Remove
    const seen = await inShadow(p, (root) => { const a = root.querySelector("#cz-ask").getBoundingClientRect(), d = root.querySelector(".cz-panel").getBoundingClientRect(); return a.top >= d.top && a.bottom <= Math.min(d.bottom, window.innerHeight) && a.height > 0; });
    ok(seen, "the question is inside the visible part of the panel");
    await p.setViewportSize({ width: 1280, height: 420 });
    await p.waitForTimeout(200);
    const lowPanel = await inShadow(p, (root) => { const d = root.querySelector(".cz-panel"); d.scrollTop = 120; const a = root.querySelector("#cz-ask").getBoundingClientRect(), x = root.querySelector(".cz-panel .drawer-x").getBoundingClientRect(), bar = root.querySelector(".cz-panel .drawer-top");
      const under = [...root.querySelectorAll("#cz-mine .cz-rm, #cz-mine .cz-btn")].filter((b) => { const r = b.getBoundingClientRect(); return r.bottom > x.top && r.top < x.bottom && r.right > x.left && r.left < x.right; });
      const top = under.length ? root.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2) : null;
      return { ask: a.top >= 0 && a.bottom <= window.innerHeight, barTall: bar.getBoundingClientRect().height >= x.height, barBg: getComputedStyle(bar).backgroundColor, covered: under.length, hit: top ? (top.closest(".drawer-top") ? "bar" : top.className) : "none" }; });
    ok(lowPanel.ask, "on a short screen, scrolled, the question still shows: " + JSON.stringify(lowPanel));
    ok(lowPanel.barTall && lowPanel.barBg !== "rgba(0, 0, 0, 0)" && lowPanel.hit !== "cz-rm", "Close sits in its own solid bar, so no row's button shows through or under it: " + JSON.stringify(lowPanel));
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.waitForTimeout(200);
    await dela(p).getByRole("button", { name: "Keep editing" }).click();
    ok((await inPanel(p)).includes("quick") && await inShadow(p, (root) => root.querySelector("#cz-ask").hidden), "Keep editing keeps the panel and the changes");
    await inShadow(p, (root) => root.querySelector(".dela-scrim").click());
    await waitFor(p, "Discard your changes?");
    await dela(p).getByRole("button", { name: "Discard changes" }).click();
    await waitGone(p, "Your dashboard (");
    home = await onHome(p);
    ok(!home.includes("quick") && (await focusName(p)) === "home-customize", "a click outside asks too; Discard changes leaves without saving: Home is as before and focus returns to the button");
    ok(await inShadow(p, (root) => root.querySelectorAll("[inert]").length === 0), "after the panel closes the page can be reached again");
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "Your dashboard (6)");
    await p.keyboard.press("Escape");
    await waitGone(p, "Your dashboard (");
    ok(popups === 0, "Escape with no changes closes the panel at once");
    ok((await sql(`select count(*)::int n from home_layouts where person_id = ${person(ATT)}`))[0].n === 0, "nothing was saved");

    // ---------- Remove, add, drag, save ----------
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "Your dashboard (6)");
    await dela(p).getByRole("button", { name: "Remove Delegation spend and results" }).click();
    await waitFor(p, "Your dashboard (5)");
    ok((await offered(p)).includes("spend") && !(await onHome(p)).includes("spend"), "Remove takes the widget off Home and puts it under Available widgets");
    await dela(p).getByRole("button", { name: "Add Monthly usage to Home" }).click();
    await waitFor(p, "Your dashboard (6)");
    mine = await inPanel(p);
    const from = await grip(p, "usage"), to = await grip(p, mine[0]);
    await p.mouse.move(from.x, from.y);
    await p.mouse.down();
    await p.mouse.move(to.x, to.y - 2, { steps: 14 });
    await p.mouse.up();
    await p.waitForTimeout(250);
    mine = await inPanel(p);
    ok(mine[0] === "usage", "dragging the handle moves the widget to the top: " + mine.join(", "));
    await p.screenshot({ path: path.join(SHOTS, "home-customize.png") });
    await dela(p).getByRole("button", { name: "Save changes" }).click();
    await waitFor(p, "Your Home layout is saved.");
    await waitGone(p, "Your dashboard (");
    const saved = (await sql(`select widgets from home_layouts where person_id = ${person(ATT)} and side = 'attorney'`))[0].widgets;
    ok(JSON.stringify(saved) === JSON.stringify(mine), "the saved layout is the panel's order: " + JSON.stringify(saved));
    await p.reload();
    t = await waitFor(p, "DELA actions reset on");
    home = await onHome(p);
    ok(home[0] === "usage" && !home.includes("spend"), "after a reload Home keeps the member's order: " + home.join(", "));
    const ring = await inShadow(p, (root) => { const r = root.querySelector("#home-grid [data-widget=usage] .usage-ring"); return r ? { said: r.getAttribute("aria-label"), mid: r.querySelector(".usage-mid").innerText.replace(/\s+/g, " "), bars: root.querySelectorAll("#home-grid [data-widget=usage] .bar").length } : null; });
    ok(ring && /^\d[\d,]* of [\d,]+ DELA actions used this month, \d+ percent$/.test(ring.said) && /^\d[\d,]* \/ [\d,]+$/.test(ring.mid) && ring.bars >= 1, "Monthly usage: a ring with exact numbers, in words too: " + JSON.stringify(ring));
    const bell2 = await inShadow(p, (root) => root.querySelector(".bell.icon").getAttribute("aria-label"));
    ok(bell2 === bell, "changing Home changes nothing on the bell: " + bell2);
    ok((await sql(`select count(*)::int n from audit_log where action = 'home_layout_saved' and object_id = ${person(ATT)}::text`))[0].n === 1, "one audit line for the save");

    // ---------- Cancel discards; Restore default ----------
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "Your dashboard (6)");
    await dela(p).getByRole("button", { name: "Add Trusted bench to Home" }).click();
    await waitFor(p, "Your dashboard (7)");
    await dela(p).getByRole("button", { name: "Cancel", exact: true }).click();
    await waitGone(p, "Your dashboard (");
    ok(!(await onHome(p)).includes("bench"), "Cancel throws the changes away");
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "Your dashboard (6)");
    await dela(p).getByRole("button", { name: "Restore default" }).click();
    await p.waitForTimeout(200);
    mine = await inPanel(p);
    ok(JSON.stringify(mine) === JSON.stringify(DEF_ATT), "Restore default shows the role's default order in the panel");
    await dela(p).getByRole("button", { name: "Save changes" }).click();
    await waitFor(p, "Home is back to the default layout.");
    ok((await sql(`select count(*)::int n from home_layouts where person_id = ${person(ATT)}`))[0].n === 0, "the default is kept as no saved layout");

    // ---------- A widget that cannot load says so; narrow screens ----------
    await p.route((u) => u.pathname.endsWith("/home/spend"), (r) => r.abort());
    await p.reload();
    t = await waitFor(p, "This could not load just now.");
    ok(t.includes("Try again") && !t.includes("No recorded delegation spend"), "a widget that cannot load says so, never that there is nothing");
    await p.setViewportSize({ width: 768, height: 1000 });
    await p.waitForTimeout(400);
    ok((await columns(p)) === 1 && await fits(p), "768 wide: one column, no sideways scrolling");
    home = await onHome(p);
    ok(JSON.stringify(home) === JSON.stringify(DEF_ATT), "one column keeps the member's order: " + home.join(", "));
    await p.setViewportSize({ width: 320, height: 700 });
    await p.waitForTimeout(300);
    ok(await fits(p) && JSON.stringify(await inPage(p)) === JSON.stringify(DEF_ATT), "320 wide: Home fits, in the same order");
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "Your dashboard (6)");
    ok(await fits(p) && await inShadow(p, (root) => root.querySelector(".cz-panel").getBoundingClientRect().width <= 320 && [...root.querySelectorAll("#cz-mine .cz-btn")].every((b) => b.getBoundingClientRect().width >= 24 && b.getBoundingClientRect().right <= 320)), "320 wide: the panel and its Move buttons fit the screen");
    await p.screenshot({ path: path.join(SHOTS, "home-customize-phone.png") });
    await dela(p).getByRole("button", { name: "Cancel", exact: true }).click();
    await s.ctx.close();

    // ---------- Freelancer: their own six, honest empty states, their own layout ----------
    s = await open(browser, FL, "&tab=home", 1280, 900);
    p = s.page;
    t = await waitFor(p, "Your Workspace");
    t = await waitFor(p, "More activity is needed to show a meaningful trend.");
    home = await onHome(p);
    ok(JSON.stringify(home) === JSON.stringify(["attention", "projects", "gigs", "earnings", "proposals", "growth"]), "freelancer: the six default widgets, what needs action first: " + home.join(", "));
    ok(t.includes("Recommended gigs") && t.includes("Earnings and payments") && t.includes("My proposals and invitations") && t.includes("Business growth insights"), "freelancer: each widget has its name");
    ok(t.includes("No payments this month. You are paid after the attorney accepts a milestone.") && !t.includes("Waiting for payout") && !t.includes("Profile views") && !t.includes("% Match"), "freelancer with no money yet: one line that says why and what pays, no rows of $0; no profile views or match percentages are invented");
    const earnSaid = await inShadow(p, (root) => { const r = root.querySelector("[data-widget=earnings] .hw-amount"); return (r ? r.getAttribute("aria-label") : "") + "|" + root.querySelectorAll("[data-widget=earnings] .usage-ring").length; });
    ok(/^\$0(\.00)? received this month\|0$/.test(earnSaid), "earnings: the amount as text, no ring: " + earnSaid);
    ok(!t.includes("Paid out this month") && !/\bNo limit\b/.test(t), "Active work does not repeat the invitations and payout figures of the other cards");
    ok(await inShadow(p, (root) => !!root.querySelector("#home-profile-top .card, #home-profile-bottom .card")) && t.includes("Complete your profile"), "freelancer: the Complete your profile card stays, apart from the widgets");
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "Your dashboard (6)");
    const offFl = await offered(p);
    ok(!offFl.includes("bench") && !offFl.includes("spend") && offFl.includes("ask") && offFl.includes("availability") && offFl.includes("reviews") && offFl.includes("quick"), "freelancer: their own library (no bench, no spend): " + offFl.join(", "));
    await dela(p).getByRole("button", { name: "Remove Business growth insights" }).click();
    await waitFor(p, "Your dashboard (5)");
    await dela(p).getByRole("button", { name: "Add My availability to Home" }).click();
    await waitFor(p, "Your dashboard (6)");
    await dela(p).getByRole("button", { name: "Save changes" }).click();
    await waitFor(p, "Your Home layout is saved.");
    t = await waitFor(p, "Edit availability");
    ok(t.includes("Complete your profile") && !t.includes("Business growth insights"), "freelancer: the saved layout shows, and the profile card is still there");
    const rows = await sql(`select side, widgets from home_layouts where person_id in (${person(ATT)}, ${person(FL)})`);
    ok(rows.length === 1 && rows[0].side === "freelancer" && rows[0].widgets.includes("availability") && !rows[0].widgets.includes("growth"), "the freelancer's layout is saved for the freelancer side only");
    await s.ctx.close();

    // ---------- Step 35: the agency's owner has "My work" and "My agency"; a team member has only their own Home ----------
    await makeMember(OWN, "freelancer", "fl_business", "Olive Owner");
    await makeMember(MEM, "freelancer", "fl_plus", "Mel Member");
    await sql(`delete from home_layouts where person_id in (${person(OWN)}, ${person(MEM)}); select 1`);
    const agencyOrg = (await sql(`select dela_agency_ensure(${person(OWN)}) id`))[0].id;
    await sql(`insert into org_members (org_id, person_id, member_role) values ('${agencyOrg}', ${person(MEM)}, 'member') on conflict (org_id, person_id) do update set status = 'active', weekly_hours = null, hours_asked_at = null, hours_set_at = null;
      update org_members set weekly_hours = null, hours_asked_at = null where org_id = '${agencyOrg}'; select 1`);
    ok((await sql(`select dela_agency_owned(${person(OWN)}) is not null o, dela_agency_owned(${person(MEM)}) is null m`))[0].o === true, "setup: Olive owns an active agency with one team member");
    s = await open(browser, OWN, "&tab=home", 1280, 900);
    p = s.page;
    await p.evaluate(() => { try { localStorage.removeItem("dela.home.agency"); } catch (e) { /* no storage */ } });
    await p.reload();
    t = await waitFor(p, "Your Workspace");
    await dela(p).getByRole("button", { name: "My agency", exact: true }).waitFor({ timeout: 8000 });
    ok(await dela(p).getByRole("button", { name: "My work", exact: true }).getAttribute("aria-pressed") === "true", "owner: the My work / My agency switch shows, on My work first");
    await dela(p).getByRole("button", { name: "My agency", exact: true }).click();
    t = await waitFor(p, "Agency Workspace");
    t = await waitFor(p, "Neither amount is profit");
    home = await onHome(p);
    ok(JSON.stringify(home) === JSON.stringify(["teamattention", "clients", "team", "revenue", "proposals", "gigs"]), "My agency: its own six widgets, what needs the team first: " + home.join(", "));
    ok(await inShadow(p, (root) => ["gigs", "proposals"].every((id) => { const c = root.querySelector('[data-widget="' + id + '"] .hw-same'); return c && c.textContent === "Same list as My work. Agency and personal " + id + " are not separated yet."; })), "the two agency cards that show the owner's own lists say so, each in its own words");
    ok(t.includes("Paid by clients") && t.includes("Paid out to agency") && !/\bprofit\b(?! *:)/i.test(t.replace("Neither amount is profit", "")), "revenue: the two amounts apart, and neither is called profit");
    ok(t.includes("Recommended agency gigs") && t.includes("Proposals and sales pipeline") && t.includes("Active client projects") && t.includes("Needs team attention") && t.includes("No team actions pending."), "My agency: each widget has its name and an honest empty state");
    ok(t.includes("Hours not set") && !/\d+% *(used|utilization|capacity)/i.test(t), "team: with no hours entered the card says so and shows no percentage");
    ok(await inShadow(p, (root) => root.querySelectorAll("[data-widget=team] .hw-team button").length === 0) && t.includes("Each of them gets a notification in DELA and an email"), "team: no button in each row; one request for everyone, and it says what is sent");
    await dela(p).getByRole("button", { name: "Ask everyone without hours to set them" }).click();
    await waitFor(p, "1 team member was asked to set their weekly hours.");
    ok((await sql(`select count(*)::int n from notifications where person_id = ${person(MEM)} and title like '%asks for your weekly hours'`))[0].n >= 1 && (await text(p)).includes("Everyone without hours was asked today"), "team: the one request sends the member a notice and then reads as asked today");
    await p.screenshot({ path: path.join(SHOTS, "home-agency.png"), fullPage: true });
    // Late agency work, and one milestone that is late and also waits on the owner (review items 2 and 3)
    const A1 = "00000000-0000-0000-0000-000000000021", A2 = "00000000-0000-0000-0000-000000000022";
    const fakeAgency = async (route) => {
      const res = await route.fetch();
      let j; try { j = await res.json(); } catch (e) { return route.fulfill({ response: res }); }
      if (j && j.me && j.me.home) j.me.home.attention = [{ kind: "milestone", gig_id: A2, gig_title: "Twin job", seq: 1, title: "Summaries", due_date: "2020-02-01", amount_cents: 150000, status: "funded" }];
      if (j && Array.isArray(j.jobs) && j.team) j.jobs = [
        { gig_id: A1, title: "Unpaid late job", client: "Example Legal", people: ["Mel Member"], milestones: 2, accepted: 0, next_seq: 1, next_title: "Draft", due_date: "2020-01-05", next_status: "pending", overdue: false },
        { gig_id: A2, title: "Twin job", client: "Example Legal", people: ["Olive Owner"], milestones: 1, accepted: 0, next_seq: 1, next_title: "Summaries", due_date: "2020-02-01", next_status: "funded", overdue: true }];
      return route.fulfill({ response: res, json: j });
    };
    await p.route("**/api/**", fakeAgency);
    await p.reload();
    t = await waitFor(p, "Unpaid late job");
    const teamRows = await inShadow(p, (root) => ({ rows: [...root.querySelectorAll("[data-widget=teamattention] button.hrow")].map((r) => r.innerText.replace(/\s+/g, " ")), badge: (root.querySelector("[data-widget=teamattention] .hhead .badge") || {}).textContent,
      clients: [...root.querySelectorAll("[data-widget=clients] button.hrow")].map((r) => r.innerText.replace(/\s+/g, " ")) }));
    ok(teamRows.rows.length === 2 && teamRows.badge === "2", "one milestone is one row, and the number counts the rows: " + JSON.stringify(teamRows.rows));
    ok(teamRows.rows[0].includes("Overdue: Unpaid late job") && teamRows.rows[1].includes("Overdue: Twin job") && /\$1,500(\.00)? paid, held by Lawfecta\./.test(teamRows.rows[1]) && teamRows.rows.every((r) => r.includes("Review milestone")), "late work first, the oldest date first; the row that is also the owner's keeps its payment line; the action reads Review milestone");
    ok(teamRows.clients.length === 2 && teamRows.clients.every((r) => r.includes("Overdue") && r.includes("was due")), "Active client projects marks every job past its date, whatever its payment state: " + JSON.stringify(teamRows.clients));
    await p.unroute("**/api/**", fakeAgency);
    await p.reload();
    await waitFor(p, "Neither amount is profit");
    // Its own layout
    await dela(p).getByRole("button", { name: "Customize dashboard" }).click();
    await waitFor(p, "Your dashboard (6)");
    ok(!(await offered(p)).includes("earnings") && (await offered(p)).includes("quick"), "My agency has its own library");
    await dela(p).getByRole("button", { name: "Remove Needs team attention" }).click();
    await waitFor(p, "Your dashboard (5)");
    await dela(p).getByRole("button", { name: "Save changes" }).click();
    await waitFor(p, "Your Home layout is saved.");
    const agRows = await sql(`select side, widgets from home_layouts where person_id = ${person(OWN)}`);
    ok(agRows.length === 1 && agRows[0].side === "agency" && !agRows[0].widgets.includes("teamattention"), "the agency layout is saved apart from My work: " + JSON.stringify(agRows));
    await dela(p).getByRole("button", { name: "My work", exact: true }).click();
    t = await waitFor(p, "Your Workspace");
    t = await waitFor(p, "Earnings and payments");
    home = await onHome(p);
    ok(JSON.stringify(home) === JSON.stringify(["attention", "projects", "gigs", "earnings", "proposals", "growth"]) && !t.includes("Paid by clients"), "My work is the owner's own freelancer Home, unchanged");
    // The Agency page: the owner sets a member's hours
    await p.goto(`${BASE}/page/DELA-App?uid=${OWN}&plan=&tab=agency`);
    await waitFor(p, "Team");
    // The owner's own row is first in the team list; the member's is second
    await dela(p).getByLabel(/^Hours a week for /).nth(1).fill("15");
    await dela(p).getByRole("button", { name: /^Save hours a week for / }).nth(1).click();
    await waitFor(p, "Saved: 15 hours a week.");
    ok((await sql(`select weekly_hours from org_members where org_id = '${agencyOrg}' and person_id = ${person(MEM)}`))[0].weekly_hours === 15, "Agency page: the owner saves a member's hours a week");
    await s.ctx.close();
    // The team member: their own Home only
    s = await open(browser, MEM, "&tab=home", 1280, 900);
    p = s.page;
    t = await waitFor(p, "Your Workspace");
    t = await waitFor(p, "Earnings and payments");
    ok(await inShadow(p, (root) => { const v = root.querySelector("#home-view"); return !v || v.hidden; }) && !t.includes("My agency") && !t.includes("Paid by clients") && !t.includes("Agency revenue"), "team member: no My agency switch and no agency figures on Home");
    await p.evaluate(() => { try { localStorage.setItem("dela.home.agency", "1"); } catch (e) { /* no storage */ } });
    await p.reload();
    t = await waitFor(p, "Earnings and payments");
    ok(!t.includes("Agency Workspace") && !t.includes("Paid by clients"), "team member: asking for the agency view by hand falls back to their own Home");
    await s.ctx.close();

    ok(popups === 0, "no browser pop-up opened anywhere on Home");
    console.log("\nALL " + passed + " HOME CHECKS PASSED");
  } catch (e) {
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    if (before) for (const k of Object.keys(before)) await sql(`update feature_switches set state = '${before[k]}' where key = '${k}'`).catch(() => null);
    await sql(`delete from home_layouts where person_id in (${person(ATT)}, ${person(FL)}, ${person(OWN)}, ${person(MEM)}); select 1`).catch(() => null);
    await browser.close();
  }
})();

// Fixes from Stacey's standing arrangements report (2026-11-06): the bottom tab bar fits a 290-pixel phone (ChatGPT's narrow browser with a scrollbar) with all seven
// attorney tabs (no sideways scrolling, "Get set up" not cut off), and an attorney who opens a freelancer page (for example
// dela?tab=work) is told it is the freelancer side instead of seeing an empty "Coming soon" Work page.
//   node tests/pw/layout-test.js   (with tests/pw/server.ts running)
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
async function open(browser, widget, uid, query, width) {
  const ctx = await browser.newContext({ viewport: { width: width || 1200, height: 900 } });
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
const ATT = 4430;

(async () => {
  const browser = await chromium.launch();
  let s, p, t;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'engagements', 'profiles', 'talent_search', 'playbook_library', 'ai_generation', 'file_uploads', 'guided_setup')");
    await sql(`insert into people (bd_member_id, display_name, email) values (${ATT}, 'Lea Layout', '${ATT}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = ${ATT}), 'attorney', 'att_pro', 'staff_grant');
      insert into access_list (bd_member_id, channel) select ${ATT}, 'access' where not exists (select 1 from access_list where bd_member_id = ${ATT} and channel = 'access' and revoked_at is null); select 1`);

    // ---------- The bottom tab bar on a 290-pixel phone (ChatGPT's narrow browser with a scrollbar) ----------
    s = await open(browser, "DELA-App", ATT, "&tab=home", 290); p = s.page;
    await waitFor(p, "Get set up", 15000);
    const nav = await dela(p).locator(".nav").evaluate((n) => ({ sw: n.scrollWidth, cw: n.clientWidth, right: Math.max(...[...n.querySelectorAll("button")].map((b) => b.getBoundingClientRect().right)), count: n.querySelectorAll("button").length, vw: window.innerWidth, page: document.documentElement.scrollWidth }));
    ok(nav.page <= nav.vw + 1, "the page does not scroll sideways (" + nav.page + " > " + nav.vw + ")");
    ok(nav.count === 7, "seven attorney tabs (" + nav.count + ")");
    ok(nav.sw <= nav.cw + 1, "the tab bar does not scroll sideways (" + nav.sw + " > " + nav.cw + ")");
    ok(nav.right <= nav.vw + 1, "every tab, Get set up included, is on screen (" + Math.round(nav.right) + " of " + nav.vw + ")");
    await s.ctx.close();

    // ---------- An attorney on a freelancer page ----------
    s = await open(browser, "DELA-App", ATT, "&tab=work"); p = s.page;
    t = await waitFor(p, "freelancer side", 15000);
    ok(t.includes("This page is on the freelancer side of DELA. You are signed in as an attorney") && !t.includes("COMING SOON") && !t.includes("Coming soon"), "the attorney is told it is the freelancer side");
    await click(p, "Go to Home");
    await waitFor(p, "Projects");
    ok(!p.url().includes("tab=work"), "Go to Home also clears the freelancer page from the address bar (" + p.url() + ")");
    await s.ctx.close();
    console.log(passed + " browser checks passed");
  } catch (e) {
    console.error(e.message);
    if (p) await p.screenshot({ path: path.join(SHOTS, "layout-fail.png") }).catch(() => {});
    process.exitCode = 1;
  } finally { await browser.close(); }
})();

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
  await page.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); const f = u.pathname.split("@")[1].split("/").slice(1).join("/"); route.fulfill({ path: path.join(ROOT, f), contentType: f.endsWith(".png") ? "image/png" : "application/javascript" }); });
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

    // ---------- The Lawfecta logo in the top bar (Stacey 2026-11-09: the round mark only, no typed name) ----------
    for (const w of [1200, 290]) {
      s = await open(browser, "DELA-App", ATT, "&tab=home", w); p = s.page;
      await waitFor(p, "Get set up", 15000);
      await dela(p).locator(".top .brand img").evaluate((i) => i.decode().catch(() => null));
      const lg = await dela(p).locator(".top .brand").evaluate((b) => { const i = b.querySelector("img"); const r = i.getBoundingClientRect(); return { alt: i.alt, nw: i.naturalWidth, w: r.width, src: i.src, text: b.innerText, icon: (document.querySelector("link[rel~='icon']") || {}).href || "" }; });
      ok(lg.alt === "Lawfecta" && lg.nw === 192 && lg.w >= 30, "at " + w + " px the top bar shows the round Lawfecta logo (" + JSON.stringify(lg) + ")");
      ok(!/LAWFECTA/.test(lg.text) && /DELA/.test(lg.text), "at " + w + " px the typed name is gone and the DELA label stays (" + lg.text + ")");
      ok(lg.icon.endsWith("/brand/lawfecta-mark-192.png"), "the browser tab icon is the Lawfecta logo");
      await s.ctx.close();
    }

    // ---------- Fix (Stacey's appearance report, 2026-11-07): nine tabs and long status labels at 290 pixels ----------
    // A freelancer agency that hires has nine bottom tabs, and a job waiting for its first payment has a long label
    const FLA = 4431, ATT2 = 4432;
    await sql(`update feature_switches set state = 'everyone' where key in ('agency_team', 'agency_hiring', 'engagements', 'ai_generation', 'flex_gigs', 'talent_search', 'playbook_library');
      insert into people (bd_member_id, display_name, email) values (${FLA}, 'Nina Narrow', '${FLA}@test.invalid'), (${ATT2}, 'Wes Wide', '${ATT2}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = ${FLA}), 'freelancer', 'fl_business', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = ${ATT2}), 'attorney', 'att_pro', 'staff_grant');
      insert into access_list (bd_member_id, channel) select x, 'access' from unnest(array[${FLA}, ${ATT2}]) x where not exists (select 1 from access_list where bd_member_id = x and channel = 'access' and revoked_at is null); select 1`);
    const nid = (await sql(`select (select id from people where bd_member_id = ${FLA}) fl, (select id from people where bd_member_id = ${ATT2}) att, dela_side_org((select id from people where bd_member_id = ${ATT2}), 'attorney') org`))[0];
    await sql(`update organizations set kind = 'agency' where id = dela_side_org('${nid.fl}', 'freelancer'); select 1`).catch(() => {});
    const npb = (await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ('${nid.org}', 'Conflict check', 'approved', 1, 1, 100, 'lay-pb', '${nid.att}') returning id`))[0].id;
    await sql(`insert into playbook_versions (playbook_id, version, body, created_by) values ('${npb}', 1, '{"title":"Conflict check","steps":[{"text":"Check"}]}', '${nid.att}'); select 1`);
    const ng = (await sql(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id)
      values ('${nid.org}', '${nid.att}', '${npb}', 1, 'Repeat: Run a very long conflict check name', '{"task":"Check"}', 30000, 30000, 'filled', now(), now() + interval '14 days', 'lay-g') returning id`))[0].id;
    const np = (await sql(`insert into proposals (gig_id, freelancer_id, status, price_cents, included, schedule, days_to_deliver, sent_at) values ('${ng}', '${nid.fl}', 'selected', 30000, 'Check', 'Soon', 3, now()) returning id`))[0].id;
    await sql(`insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status) values ('${ng}', '${np}', '${nid.org}', '${nid.att}', '${nid.fl}', 30000, 'signed'); select 1`);
    for (const [uid, tb] of [[FLA, "work"], [FLA, "earnings"], [ATT2, "projects"]]) {
      s = await open(browser, "DELA-App", uid, "&tab=" + tb, 290); p = s.page;
      await waitFor(p, "Signed: waiting for the first payment", 15000);
      const w = await dela(p).locator(".nav").evaluate((n) => ({ page: document.documentElement.scrollWidth, vw: window.innerWidth, tabs: n.querySelectorAll("button").length }));
      ok(w.page <= w.vw + 1, tb + " at 290 pixels (" + w.tabs + " tabs): the page does not scroll sideways (" + w.page + " > " + w.vw + ")");
      // Fix (UX review 2026-11-08): with more than seven tabs the bar scrolls sideways, and no two tab names overlap
      const tabs = await dela(p).locator(".nav button").evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return { l: r.left, r: r.right, w: b.scrollWidth, cw: b.clientWidth }; }));
      if (tabs.length > 7) ok(tabs.every((x, i) => i === 0 || x.l >= tabs[i - 1].r - 1) && tabs.every((x) => x.r - x.l >= 63), tb + ": " + tabs.length + " tabs, each at least 64 pixels wide, none overlapping");
      const cut = await dela(p).locator(".dela").evaluate((root) => [...root.querySelectorAll(".badge")].filter((b) => b.offsetParent && b.getBoundingClientRect().right > window.innerWidth + 1).map((b) => b.textContent));
      ok(!cut.length, tb + ": no label runs off the screen" + (cut.length ? " (" + cut.join("; ") + ")" : ""));
      await s.ctx.close();
    }

    // ---------- An attorney on a freelancer page ----------
    s = await open(browser, "DELA-App", ATT, "&tab=work"); p = s.page;
    t = await waitFor(p, "freelancer workspace", 15000);
    ok(t.includes("This page is on the freelancer workspace of DELA. You are signed in as an attorney") && !t.includes("COMING SOON") && !t.includes("Coming soon"), "the attorney is told it is the freelancer side");
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

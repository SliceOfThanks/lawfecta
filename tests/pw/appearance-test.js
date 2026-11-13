// Browser test of UX review Phase 4 part D (docs/briefs/step-8a-phase-4.md), the Appearance choice: off, DELA follows the
// device; on, everyone starts on Light even on a dark device; the account menu offers Match my device, Light and Dark and the
// choice stays after reloading; Dark text is readable (at least 4.5 to 1 against its background) on the main pages; the
// admin area has the same choice.
//   node tests/pw/appearance-test.js   (with tests/pw/server.ts running)
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
async function open(browser, widget, uid, query, scheme) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, colorScheme: scheme || "light" });
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
const ATT = 4440, TEAM = 4441;
const theme = (page) => dela(page).locator(".dela").getAttribute("data-theme");
const bg = (page) => dela(page).locator(".dela").evaluate((e) => getComputedStyle(e).backgroundColor);
// Every visible piece of text against the first solid background behind it; anything under 4.5 to 1 is listed
async function lowContrast(page) {
  return dela(page).locator(".dela").evaluate((root) => {
    const rgb = (c) => { const m = c.match(/[\d.]+/g) || []; return m.map(Number); };
    const lum = (c) => { const [r, g, b] = rgb(c).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const solid = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const a = rgb(c)[3]; if (!(a === 0)) return c; } return getComputedStyle(root).backgroundColor; };
    const out = [];
    root.querySelectorAll("*").forEach((el) => {
      if (!el.offsetParent && el !== root) return;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own || el.closest("[disabled]") || el.closest(".top")) return;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || Number(s.opacity) < 0.5) return;
      const a = lum(s.color), b = lum(solid(el));
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (ratio < 4.5) out.push(el.tagName.toLowerCase() + "." + el.className + " \"" + el.textContent.trim().slice(0, 30) + "\" " + ratio.toFixed(2));
    });
    return out;
  });
}

(async () => {
  const browser = await chromium.launch();
  let s, p, t;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'engagements', 'profiles', 'talent_search', 'playbook_library', 'ai_generation', 'file_uploads', 'guided_setup', 'ai_helpers', 'document_standard', 'library_workspace'); update feature_switches set state = 'off' where key = 'appearance_choice'");
    await sql(`insert into people (bd_member_id, display_name, email) values (${ATT}, 'Dana Dark', '${ATT}@test.invalid'), (${TEAM}, 'Tom Team', '${TEAM}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = ${ATT}), 'attorney', 'att_pro', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = ${TEAM}), 'attorney', 'att_free', 'staff_grant');
      insert into access_list (bd_member_id, channel) select x, 'access' from unnest(array[${ATT}, ${TEAM}]) x where not exists (select 1 from access_list where bd_member_id = x and channel = 'access' and revoked_at is null);
      insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = ${TEAM} and not exists (select 1 from staff_roles s where s.person_id = people.id and s.role = 'owner'); select 1`);
    // One document, so the dark Library shows its cards, filters and text links (UI review 2026-11-08)
    await sql(`insert into playbooks (org_id, title, status, current_version, completeness, request_id, created_by, doc_type, lifecycle)
      select dela_side_org(id, 'attorney'), 'Dark check document', 'draft', 1, 50, 'dark-doc', id, 'sop', 'INT' from people where bd_member_id = ${ATT}
      and not exists (select 1 from playbooks where request_id = 'dark-doc'); select 1`);

    // ---------- Off: DELA follows the device, and the menu has no choice ----------
    s = await open(browser, "DELA-App", ATT, "&tab=home", "dark"); p = s.page;
    ok(await theme(p) === "auto", "off: DELA follows the device");
    ok((await bg(p)) === "rgb(17, 19, 27)", "off: a dark device shows dark, as before");
    await dela(p).getByRole("button", { name: "Account menu" }).click();
    ok(!(await text(p)).includes("Match my device"), "off: no Appearance choice in the menu");
    await s.ctx.close();

    // ---------- On: Light first, even on a dark device ----------
    await sql("update feature_switches set state = 'everyone' where key = 'appearance_choice'");
    s = await open(browser, "DELA-App", ATT, "&tab=home", "dark"); p = s.page;
    ok(await theme(p) === "light" && (await bg(p)) === "rgb(245, 245, 247)", "on: everyone starts on Light, even on a dark device");
    await dela(p).getByRole("button", { name: "Account menu" }).click();
    t = await text(p);
    ok(t.includes("Appearance") && t.includes("Match my device") && t.includes("✓ Light") && t.includes("Dark"), "the account menu offers the three choices, Light ticked");
    await dela(p).getByRole("menuitemradio", { name: "Dark" }).click();
    await waitFor(p, "Appearance: Dark");
    ok(await theme(p) === "dark" && (await bg(p)) === "rgb(17, 19, 27)", "Dark turns DELA dark at once");
    // Stacey 2026-11-13: the heading band of every card is #2B303C in the dark look
    const darkBand = await p.evaluate(() => getComputedStyle(document.querySelector(".dela-host").shadowRoot.querySelector(".dela")).getPropertyValue("--head").trim().toLowerCase());
    ok(darkBand === "#2b303c", "the heading band of a card is #2B303C in the dark look: " + darkBand);
    await p.reload(); await text(p);
    ok(await theme(p) === "dark", "the choice stays after reloading");

    // ---------- Dark text is readable on the main pages ----------
    for (const tb of ["home", "projects", "library", "talent", "delegate", "ai", "profile"]) {
      await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=${tb}`); await text(p); await p.waitForTimeout(800);
      const bad = await lowContrast(p);
      ok(!bad.length, "dark " + tb + ": all text at least 4.5 to 1" + (bad.length ? ":\n  " + bad.slice(0, 12).join("\n  ") : ""));
    }
    // Fix (UI review 2026-11-08): on dark, the text links, the selected filter and the boxes stand out from their card
    // (at least 3 to 1 for shapes); Ask DELA in the menu is a tab like the others, not an AI button
    await p.goto(`${BASE}/page/DELA-App?uid=${ATT}&plan=&tab=library`); await waitFor(p, "Dark check document");
    const shapes = await dela(p).locator(".dela").evaluate((root) => {
      const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
      const lum = (c) => { const [r, g, b] = rgb(c).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const ratio = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
      const page = getComputedStyle(root).backgroundColor;
      const pressed = root.querySelector(".pills button[aria-pressed=true]"), plain = root.querySelector(".pills button[aria-pressed=false]");
      const search = root.querySelector("input[type=search], input");
      return { link: ratio(getComputedStyle(root.querySelector(".linkish")).color, page), pill: ratio(getComputedStyle(pressed).backgroundColor, getComputedStyle(plain).backgroundColor),
        box: ratio(getComputedStyle(search).borderTopColor, page), ph: ratio(getComputedStyle(search, "::placeholder").color, getComputedStyle(search).backgroundColor),
        nav: root.querySelector(".nav button.ai-btn") ? 1 : 0 };
    });
    ok(shapes.link >= 4.5, "dark Library: text links are readable (" + shapes.link.toFixed(2) + " to 1)");
    ok(shapes.pill >= 3, "dark Library: the selected filter stands out from the others (" + shapes.pill.toFixed(2) + " to 1)");
    ok(shapes.box >= 3 && shapes.ph >= 4.5, "dark: box edges and placeholder text are visible (" + shapes.box.toFixed(2) + ", " + shapes.ph.toFixed(2) + ")");
    ok(shapes.nav === 0, "Ask DELA in the menu is not styled as an AI button");
    await s.ctx.close();

    // ---------- Match my device ----------
    await sql(`update person_appearance set mode = 'device' where person_id = (select id from people where bd_member_id = ${ATT}); select 1`);
    s = await open(browser, "DELA-App", ATT, "&tab=home", "light"); p = s.page;
    ok(await theme(p) === "auto" && (await bg(p)) === "rgb(245, 245, 247)", "Match my device on a light device is light");
    await s.ctx.close();
    s = await open(browser, "DELA-App", ATT, "&tab=home", "dark"); p = s.page;
    ok((await bg(p)) === "rgb(17, 19, 27)", "Match my device on a dark device is dark");
    await s.ctx.close();

    // ---------- The admin area has the same choice ----------
    s = await open(browser, "DELA-Admin", TEAM, "", "light"); p = s.page;
    await waitFor(p, "Member view", 15000);
    await dela(p).getByLabel("Appearance", { exact: true }).selectOption("dark");
    await waitFor(p, "Appearance saved");
    ok(await theme(p) === "dark", "the admin area turns dark");
    for (const tb of ["overview", "switches", "usage"]) {
      await dela(p).getByRole("tab", { name: { overview: "Overview", switches: "Switches", usage: "Usage" }[tb], exact: true }).click().catch(() => {});
      await p.waitForTimeout(900);
      const bad = await lowContrast(p);
      ok(!bad.length, "dark admin " + tb + ": all text at least 4.5 to 1" + (bad.length ? ":\n  " + bad.slice(0, 12).join("\n  ") : ""));
    }
    ok((await sql(`select mode from person_appearance where person_id = (select id from people where bd_member_id = ${TEAM})`))[0].mode === "dark", "saved for that person");
    await s.ctx.close();
    await sql("update feature_switches set state = 'off' where key = 'appearance_choice'");
    console.log(passed + " browser checks passed");
  } catch (e) {
    console.error(e.message);
    if (p) await p.screenshot({ path: path.join(SHOTS, "appearance-fail.png") }).catch(() => {});
    process.exitCode = 1;
  } finally { await browser.close(); }
})();

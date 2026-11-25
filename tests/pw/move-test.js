// Browser test of step 90a (docs/briefs/step-90-member-move.md): the page "Move members" in the admin area. The old
// website's members are put straight into DELA's copy here (the reading itself is tested in member_move_test.ts), so
// this test is about the page: the notice when the old site's key is missing, the plan map with nothing chosen, a
// choice saved, the categories that have no match, the preview's counts and its file, and that the page is the owner's.
// Needs tools/dbtest.sh, then tests/pw/server.ts on port 8787.   node tests/pw/move-test.js
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
async function open(browser, uid, extra) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept());
  await page.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(ROOT, u.pathname.split("@")[1].split("/").slice(1).join("/")), contentType: "application/javascript" }); });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto(`${BASE}/page/DELA-Admin?uid=${uid}&plan=` + (extra || ""));
  await page.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela").textContent.length > 20; });
  await page.waitForTimeout(150);
  return { ctx, page };
}
const dela = (page) => page.locator(".dela-host");
const sr = (pg, fn, arg) => pg.evaluate(([f, a]) => new Function("r", "a", f)(document.querySelector(".dela-host").shadowRoot, a), [fn, arg]);
const OWNER = 4830, SUPPORT = 4831;

(async () => {
  const browser = await chromium.launch();
  let was = null, wasPlan = null;
  try {
    was = await sql("select key, state from feature_switches where key in ('member_move', 'new_layout')");
    await sql("update feature_switches set state = 'everyone' where key = 'new_layout'; update feature_switches set state = 'off' where key = 'member_move'; select 1");
    await sql(`insert into people (bd_member_id, display_name, email) values (${OWNER}, 'Opal Owner', '${OWNER}@test.invalid'), (${SUPPORT}, 'Sam Support', '${SUPPORT}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = x), 'attorney', 'att_pro', 'staff_grant') from unnest(array[${OWNER}, ${SUPPORT}]) x;
      insert into access_list (bd_member_id, channel) select x, 'access' from unnest(array[${OWNER}, ${SUPPORT}]) x where not exists (select 1 from access_list where bd_member_id = x and channel = 'access' and revoked_at is null);
      insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = ${OWNER} and not exists (select 1 from staff_roles s where s.person_id = people.id and s.revoked_at is null);
      insert into staff_roles (person_id, role) select id, 'support' from people where bd_member_id = ${SUPPORT} and not exists (select 1 from staff_roles s where s.person_id = people.id and s.revoked_at is null); select 1`);
    // What a finished reading leaves behind: 12 members on three plans, two with one email, one already on the new site
    wasPlan = (await sql("select bd_plan_id from plans where code = 'att_free'"))[0].bd_plan_id;
    await sql(`update plans set bd_plan_id = null where bd_plan_id = 5 and code <> 'att_free'; update plans set bd_plan_id = 5 where code = 'att_free';
      delete from move_members where true; delete from move_plan_map where true; delete from move_category_map where true; delete from move_old_plans where true; delete from move_new_plans where true;
      delete from move_old_categories where true; delete from move_new_members where true;
      insert into move_old_plans (plan_id, name, profile_type, monthly, yearly, initial) values (5, 'Attorney Account', 'free', '0.00', '0.00', '0.00'), (16, 'Free Membership', 'free', '0.00', '0.00', '0.00'), (10, 'Pro Membership', 'paid', '35.00', '350.00', '0.00');
      insert into move_new_plans (plan_id, name, profile_type, searchable) values (5, 'Attorney Free', 'free', false), (3, 'Free', 'free', true), (8, 'Pro', 'paid', true);
      insert into move_old_categories (kind, id, name, top_id, parent_id) values ('p', 2, 'Paralegal Services', 0, 0), ('s', 99, 'Gone Here', 2, 0);
      insert into move_new_members (new_id, email_key, plan_id) values (686, 'already@new.example', 12);
      insert into move_members (old_id, email, email_key, first_name, last_name, plan_id, active, profession_id, services, last_login, run)
        select 1000 + i, case i when 5 then 'DUP@Example.com' when 6 then 'dup@example.com' when 7 then 'already@new.example' else 'm' || i || '@old.example' end,
          case i when 5 then 'dup@example.com' when 6 then 'dup@example.com' when 7 then 'already@new.example' else 'm' || i || '@old.example' end,
          'First' || i, 'Last' || i, case when i <= 8 then 5 when i <= 11 then 16 else 10 end, 2, case when i > 8 then 2 else 0 end, case when i > 8 then '{99}'::int[] else '{}'::int[] end,
          case i when 6 then now() - interval '10 days' when 5 then now() - interval '400 days' end, 1 from generate_series(1, 12) i;
      insert into move_plan_map (old_plan) values (5), (16), (10);
      insert into move_category_map (old_kind, old_id, new_key, auto) values ('p', 2, null, true), ('s', 99, null, true);
      update move_state set status = 'read', run = 1, members = 12, pages = 1, finished_at = now(), problem = '' where id = 1; select 1`);

    // ---------- Switched off: the page says so and offers nothing ----------
    let s = await open(browser, OWNER, "&tab=move"), p = s.page;
    await dela(p).locator("#move-page").waitFor({ timeout: 20000 });
    ok((await dela(p).locator("#move-off").count()) === 1 && (await dela(p).locator("#move-read").count()) === 0, "with the switch off, the page says so and has no button");
    await s.ctx.close();
    await sql("update feature_switches set state = 'staff' where key = 'member_move'; select 1");

    // ---------- The owner ----------
    s = await open(browser, OWNER, "&tab=move"); p = s.page;
    await dela(p).locator("#move-plans").waitFor({ timeout: 20000 });
    let st = await sr(p, `return { h1: r.querySelector("#move-page h1").textContent.trim(), noKey: !!r.querySelector("#move-no-key"), readOff: r.querySelector("#move-read").disabled, state: r.querySelector("#move-state").textContent,
      rows: [...r.querySelectorAll("#move-plans tbody tr")].map((t) => [t.children[0].querySelector("strong").textContent, t.children[1].textContent, t.children[2].textContent, t.querySelector("select").value]), left: r.querySelector("#move-plans-left").textContent,
      menu: [...r.querySelectorAll("[role=tab], .nl-nav button, .nl-nav a")].some((x) => x.textContent.trim() === "Move members") }`);
    ok(st.h1.startsWith("Move members") && (await dela(p).getByText("Move members", { exact: true }).count()) >= 2, "the admin area has a page \"Move members\", and its menu names it");
    ok(st.noKey && st.readOff, "without the old site's key in Supabase, the page says where to put it and the read button is off");
    ok(st.state.startsWith("Read 12 members"), "it says how many members were read: " + st.state);
    ok(JSON.stringify(st.rows) === JSON.stringify([["Attorney Account", "8", "free", ""], ["Free Membership", "3", "free", ""], ["Pro Membership", "1", "35.00 a month, 350.00 a year", ""]]) && st.left === "3 not chosen yet", "one line for each old plan with its members and price, and nothing chosen: " + JSON.stringify(st.rows));
    // Choose: attorneys to Attorney Free, free members to Free, the paying one stays
    await dela(p).getByLabel("New plan for Attorney Account").selectOption({ label: "Attorney Free (attorney in DELA)" });
    await dela(p).locator("#move-plans-left", { hasText: "2 not chosen yet" }).waitFor({ timeout: 10000 });
    await dela(p).getByLabel("New plan for Free Membership").selectOption({ label: "Free (no DELA plan)" });
    await dela(p).locator("#move-plans-left", { hasText: "1 not chosen yet" }).waitFor({ timeout: 10000 });
    await dela(p).getByLabel("New plan for Pro Membership").selectOption({ label: "Do not move" });
    await dela(p).locator("#move-plans-left", { hasText: "Every plan has a choice" }).waitFor({ timeout: 10000 });
    const map = await sql("select old_plan, new_plan, skip from move_plan_map order by old_plan");
    ok(JSON.stringify(map) === JSON.stringify([{ old_plan: 5, new_plan: 5, skip: false }, { old_plan: 10, new_plan: null, skip: true }, { old_plan: 16, new_plan: 3, skip: false }]), "each choice is saved as it is made: " + JSON.stringify(map));
    // Categories: only the ones members use and that have no match
    st = await sr(p, `return { sum: r.querySelector("#move-cats-sum").textContent, rows: [...r.querySelectorAll("#move-cats tbody tr")].map((t) => [t.children[0].textContent, t.children[1].textContent]) }`);
    ok(st.sum.startsWith("0 of 2 categories") && JSON.stringify(st.rows) === JSON.stringify([["paralegal services", "4"], ["paralegal services > gone here", "4"]]), "categories with no match are listed with how many members use them: " + JSON.stringify(st.rows));
    // The preview
    await dela(p).locator("#move-preview").click();
    await dela(p).locator("#move-pv-counts").waitFor({ timeout: 15000 });
    st = await sr(p, `return { counts: [...r.querySelectorAll("#move-pv-counts > div")].map((d) => d.querySelector("b").textContent), plans: [...r.querySelectorAll("#move-pv-plans tbody tr")].map((t) => [...t.children].map((c) => c.textContent)), notes: r.querySelector("#move-pv-notes").textContent, dl: r.querySelector("#move-download").textContent }`);
    ok(st.counts.join("|") === "9|1|1|0|1|0", "the preview counts who moves (9), who is already on the new site (1), a shared email (1) and who stays by choice (1): " + st.counts.join("|"));
    ok(JSON.stringify(st.plans) === JSON.stringify([["Attorney Free", "6", "No"], ["Free", "3", "Yes"]]), "it says how many go to each new plan and whether visitors would see them: " + JSON.stringify(st.plans));
    ok(st.notes.includes("9 active") && st.notes.includes("3 would show to visitors") && st.notes.includes("6 are on an attorney plan") && st.notes.includes("3 have a main category with no match"), "and what that means: " + st.notes);
    const [dl] = await Promise.all([p.waitForEvent("download"), dela(p).locator("#move-download").click()]);
    const file = fs.readFileSync(await dl.path(), "utf8");
    ok(dl.suggestedFilename() === "member-move-preview.csv" && file.split("\r\n").length === 14 && file.includes('"1005","DUP@Example.com"') && file.includes('"Same email as another member","1006"') && file.includes('"Already on the new site (linked, not made again)"'), "the list downloads as a file with one line for each member and what happens to them");
    ok((await sr(p, `return r.querySelector("#move-next").textContent`)).includes("not built yet"), "the page says plainly that the move itself comes later");
    await p.screenshot({ path: path.join(SHOTS, "90a-move.png"), fullPage: true });
    await s.ctx.close();

    // ---------- A team member who is not the owner ----------
    s = await open(browser, SUPPORT, "&tab=move"); p = s.page;
    await p.waitForTimeout(1500);
    ok((await dela(p).locator("#move-plans").count()) === 0 && (await dela(p).locator("#move-preview").count()) === 0, "a team member who is not the owner gets none of it");
    await s.ctx.close();
    console.log(passed + " browser checks passed");
  } finally {
    if (was) for (const w of was) await sql("update feature_switches set state = '" + w.state + "' where key = '" + w.key + "'; select 1");
    if (wasPlan !== undefined) await sql("update plans set bd_plan_id = " + (wasPlan === null ? "null" : Number(wasPlan)) + " where code = 'att_free'; select 1").catch(() => {});
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });

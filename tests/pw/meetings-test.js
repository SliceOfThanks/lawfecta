// Browser test of Step 5 on both sides: a freelancer sets availability for meetings; the attorney messages them from the gig,
// attaches a file and books a meeting from their open times; a held message; the freelancer reads, replies, asks DELA for a
// summary, moves the meeting and confirms it happened; the Lawfecta Team's Meetings and messages tab; phone width.
// Real widgets, api and database; AI and storage stand-ins (tests/pw/server.ts). Needs tools/dbtest.sh, then tests/pw/server.ts.
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

async function open(browser, widget, uid, query, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1200, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Test reason" : undefined));
  if (process.env.DEBUG_MEET) { page.on("response", async (r) => { if (r.url().includes("/api/")) console.log("resp", r.request().method(), r.url().split("/api")[1].slice(0, 80), (await r.text().catch(() => "")).slice(0, 160)); }); page.on("console", (m) => console.log("console", m.text())); }
  await page.route("https://cdn.jsdelivr.net/**", (route) => {
    const u = new URL(route.request().url());
    const rel = u.pathname.split("@")[1].split("/").slice(1).join("/");
    route.fulfill({ path: path.join(ROOT, rel), contentType: "application/javascript" });
  });
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
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(0, 2500));
}
const click = (page, name) => dela(page).getByRole("button", { name, exact: true }).first().click();
const label = (page, name) => dela(page).getByLabel(name, { exact: true }).first();
async function makeMember(bd, side, plan) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, 'Member ${bd}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side((select id from people where bd_member_id = ${bd}), '${side}', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and channel = 'access' and revoked_at is null); select 1`);
}

(async () => {
  const browser = await chromium.launch();
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'meetings', 'gig_chat', 'chat_assistant', 'conduct_review', 'ai_generation', 'profiles', 'file_uploads', 'playbook_library')");
    await sql("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
    await makeMember(2700, "attorney", "att_pro");
    await makeMember(2701, "freelancer", "fl_plus");
    await makeMember(1, "attorney", "att_pro");
    await sql("insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = 1 and not exists (select 1 from staff_roles s where s.person_id = people.id)");
    await sql(`insert into member_profiles (person_id, side, body, missing, score) select id, 'attorney', '{"firm_name":"Example Legal"}', '{}', 100 from people where bd_member_id = 2700;
      insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) select id, 'l', 'TX', '2700', '2700', 'A', 'video', 'verified' from people where bd_member_id = 2700;
      insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"Fran","last_name":"Meets","practice_areas":["Family law"]}', '{}', 100, now() from people where bd_member_id = 2701;
      select dela_profile_refresh(id, 'attorney') from people where bd_member_id = 2700; select dela_profile_refresh(id, 'freelancer') from people where bd_member_id = 2701`);
    await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) select dela_side_org(id, 'attorney'), 'Intake', 'approved', 1, 1, 100, 'mt1', id from people where bd_member_id = 2700;
      insert into playbook_versions (playbook_id, version, body, created_by) select id, 1, '{"title":"Intake","steps":[{"text":"a"}]}', created_by from playbooks where request_id = 'mt1';
      insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id)
        select p.org_id, p.created_by, p.id, 1, 'Client intake help', '{"task":"Intake","practice_area":"Family law"}', 30000, 60000, 'open', now(), now() + interval '14 days', 'mtg' from playbooks p where p.request_id = 'mt1';
      insert into gig_invitations (gig_id, freelancer_id, invited_by) select g.id, f.id, g.created_by from gigs g, people f where g.request_id = 'mtg' and f.bd_member_id = 2701;
      select dela_gig_match_refresh(id) from gigs where request_id = 'mtg';
      insert into files (org_id, group_id, version, is_current, name, ext, size_bytes, storage_path, status, check_state, uploaded_by, side, request_id, no_client_info_ticked_at)
        select org_id, gen_random_uuid(), 1, true, 'Intake template.docx', 'docx', 100, 'test/' || gen_random_uuid(), 'ready', 'clear', created_by, 'attorney', 'mtf', now() from gigs where request_id = 'mtg'`);
    const gigId = (await sql("select id from gigs where request_id = 'mtg'"))[0].id;

    // ---------- Freelancer: availability for meetings ----------
    let s = await open(browser, "DELA-App", 2701, "&tab=profile");
    let p = s.page;
    await waitFor(p, "Your availability for meetings");
    await label(p, "Time zone for meetings").selectOption("America/Chicago");
    await label(p, "Saturday").check();
    await label(p, "Sunday").check();
    await click(p, "Save availability");
    await waitFor(p, "Availability saved");
    const av = (await sql("select timezone, lengths, hours from meeting_availability a join people pe on pe.id = a.person_id where pe.bd_member_id = 2701"))[0];
    ok(av && av.timezone === "America/Chicago" && av.hours["6"] && av.lengths.includes(30), "availability saved in the freelancer's own time zone");
    await s.ctx.close();

    // ---------- Attorney: message from the gig, attach a file, book a meeting, a held message ----------
    s = await open(browser, "DELA-App", 2700, "&tab=projects&gig=" + gigId);
    p = s.page;
    await waitFor(p, "Gig views", 6000).catch(() => null);
    await dela(p).getByRole("tab", { name: /^Matches/ }).click();
    await waitFor(p, "Freelancers who fit");
    await dela(p).locator(".card .card", { hasText: "Fran Meets" }).getByRole("button", { name: "Message" }).click();
    let t = await waitFor(p, "No messages yet");
    ok(t.includes("Keep all work, contact and payment on Lawfecta"), "the thread opens from the gig, with the reminder to stay on Lawfecta");
    await label(p, "Your message").fill("Can you start Monday? Our template is attached.");
    await click(p, "Attach a file");
    await dela(p).getByText("Intake template.docx").click();
    await click(p, "Send");
    t = await waitFor(p, "Can you start Monday?");
    ok(t.includes("Open Intake template.docx"), "the message shows with its attachment");
    await label(p, "Your message").fill("Or text me at 512-555-0199 and I will pay you directly");
    await click(p, "Send");
    t = await waitFor(p, "Being checked by the Lawfecta Team");
    ok(true, "a message with contact details and payment outside Lawfecta is held");
    await click(p, "Book a meeting");
    t = await waitFor(p, "Times are shown in your own time zone");
    await dela(p).locator(".card[aria-label='Book a meeting'] .row button").first().click();
    t = await waitFor(p, "Your meetings", 10000).catch(() => text(p));
    t = await waitFor(p, "Booked", 10000);
    ok(t.includes("The room opens at") || t.includes("meeting service is connected"), "the page says when the room opens, or that the link comes once the meeting service is connected");
    ok((await sql(`select count(*)::int n from meetings where gig_id = '${gigId}' and status = 'confirmed'`))[0].n === 1, "one meeting booked");
    await p.screenshot({ path: path.join(SHOTS, "meeting-booked.png"), fullPage: true });
    await s.ctx.close();

    // ---------- Freelancer: Inbox, reply, DELA's summary, move the meeting ----------
    s = await open(browser, "DELA-App", 2701, "");
    p = s.page;
    t = await text(p);
    ok(/Inbox\s*1/.test(t) || t.includes("Inbox"), "the Inbox in the top bar");
    await click(p, "Inbox");
    t = await waitFor(p, "Client intake help");
    await dela(p).locator(".work", { hasText: "Client intake help" }).first().click();
    t = await waitFor(p, "Can you start Monday?");
    ok(!t.includes("512-555-0199"), "the held message is not shown to the freelancer");
    await click(p, "✦ Summarize");
    t = await waitFor(p, "The attorney asked about intake");
    ok(t.includes("does not change the gig"), "DELA's summary is labeled as reading only");
    await click(p, "✦ Draft a reply");
    await p.waitForTimeout(600);
    ok((await label(p, "Your message").inputValue()) === "Thanks, Monday works for me.", "DELA drafts a reply, which the member sends");
    await click(p, "Send");
    await waitFor(p, "Thanks, Monday works for me.");
    await s.ctx.close();
    s = await open(browser, "DELA-App", 2701, "&tab=meetings");
    p = s.page;
    t = await waitFor(p, "Booked");
    ok(t.includes("minutes, your time"), "the meeting shows in the freelancer's own time");
    await click(p, "Change the time");
    await waitFor(p, "Choose a new time");
    await waitFor(p, "Times are shown in your own time zone");
    await dela(p).locator(".card[aria-label='Book a meeting'] .row button").nth(3).click();
    await waitFor(p, "One update went to both of you", 10000);
    const ms = await sql(`select status from meetings where gig_id = '${gigId}' order by created_at`);
    ok(ms.map((x) => x.status).join(",") === "rescheduled,confirmed", "the new time replaces the old one");
    const moved = (await sql("select count(*)::int n from notifications where title like 'Meeting moved%' and channel = 'in_app'"))[0].n;
    ok(moved === 2, "one update reaches both people");
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForTimeout(300);
    const wide = await p.evaluate(() => { const out = []; document.querySelector(".dela-host").shadowRoot.querySelectorAll("*").forEach((e) => { const r = e.getBoundingClientRect(); if (r.right > 392) out.push(e.tagName + "." + e.className + " " + Math.round(r.right) + " " + (e.textContent || "").slice(0, 40)); }); return out.slice(0, 8); });
    if (wide.length) console.log("wide:", wide.join(" | "));
    ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 392, "the meetings page fits a phone screen");
    await s.ctx.close();

    // ---------- After the meeting ----------
    await sql(`update meetings set start_at = now() - interval '1 hour', end_at = now() - interval '30 minutes' where gig_id = '${gigId}' and status = 'confirmed'`);
    s = await open(browser, "DELA-App", 2701, "&tab=meetings");
    p = s.page;
    await waitFor(p, "Did the meeting happen?");
    await label(p, "Short summary").fill("We agreed I will send a proposal by Friday.");
    await click(p, "Send");
    t = await waitFor(p, "Waiting for the other person");
    ok(t.includes("One person confirmed"), "attendance waits for both");
    await s.ctx.close();

    // ---------- Lawfecta Team ----------
    s = await open(browser, "DELA-Admin", 1, "");
    p = s.page;
    await dela(p).getByRole("tab", { name: "Meetings and messages" }).click();
    t = await waitFor(p, "The last 30 days");
    ok(t.includes("Vectera is not connected yet") && t.includes("Meetings booked"), "the team sees the counts and that Vectera is not connected");
    await dela(p).getByRole("tab", { name: "Gigs" }).click();
    t = await waitFor(p, "Held for a check");
    ok(t.includes("512-555-0199"), "the held message waits in the Gigs tab for a decision");
    await s.ctx.close();

    console.log("\n" + passed + " browser checks passed");
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });

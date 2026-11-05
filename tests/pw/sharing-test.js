// Browser test of the security rules on screen (docs/briefs/step-6d-security-sensitive-data.md, Stacey's answers 2026-11-05):
// the gig's "Files for this gig" card (the sensitive checkbox and its help text, the expiry choice, Extend, File activity);
// Confidential materials on the engagement for both sides (the emailed code, the promise, the new upload checkbox, the
// refusal with "Mark this job as sensitive", secure links, Delete now); Ask DELA's "Save to library" and "Delete this chat";
// the Library's drafts due for deletion; "Delete forever" in Trash; the admin Security tab; phone width.
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
async function sql(q) { const r = await fetch(BASE + "/test/sql", { method: "POST", body: JSON.stringify({ sql: q }) }); const j = await r.json(); if (j.error) throw new Error("sql: " + j.error); return j.rows; }

async function open(browser, widget, uid, query, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept());
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
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(0, 3000));
}
const click = (page, name) => dela(page).getByRole("button", { name, exact: true }).first().click();
const label = (page, name) => dela(page).getByLabel(name, { exact: true }).first();
const conf = (page) => dela(page).locator("#conf-card");
async function makeMember(bd, side, plan) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, 'Member ${bd}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side((select id from people where bd_member_id = ${bd}), '${side}', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and channel = 'access' and revoked_at is null); select 1`);
}
async function code(page, bd) {
  await conf(page).getByRole("button", { name: "Email me a code", exact: true }).click();
  await waitFor(page, "We sent a code to");
  const r = await sql(`select title from notifications n join people p on p.id = n.person_id where p.bd_member_id = ${bd} and n.channel = 'email' and n.title like 'Your DELA code:%' order by n.created_at desc limit 1`);
  await label(page, "6-digit code").fill(r[0].title.split(": ")[1]);
  await click(page, "Open");
}
const ATT = 3700, FL = 3701, OWNER = 1;
const SENS = "This job involves sensitive data (SSN, medical, financial, or ID documents)";

(async () => {
  const browser = await chromium.launch();
  let s;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('confidential_materials', 'engagements', 'flex_gigs', 'gig_chat', 'ai_generation', 'file_uploads', 'playbook_library', 'profiles', 'worker')");
    await makeMember(ATT, "attorney", "att_pro");
    await makeMember(FL, "freelancer", "fl_plus");
    await makeMember(OWNER, "attorney", "att_pro");
    await sql("insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = 1 and not exists (select 1 from staff_roles s where s.person_id = people.id)");
    const ids = (await sql(`with a as (select id from people where bd_member_id = ${ATT}), f as (select id from people where bd_member_id = ${FL})
      select (select id from a) att, (select id from f) fl, dela_side_org((select id from a), 'attorney') org`))[0];
    const pb = (await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ('${ids.org}', 'Welcome SOP', 'approved', 1, 1, 100, 'sh1', '${ids.att}') returning id`))[0].id;
    await sql(`insert into playbook_versions (playbook_id, version, body, created_by) values ('${pb}', 1, '{"title":"Welcome SOP","steps":[{"text":"a"}]}', '${ids.att}'); select 1`);
    const gig = (await sql(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id)
      values ('${ids.org}', '${ids.att}', '${pb}', 1, 'Welcome packet job', '{"task":"Send the welcome packet"}', 30000, 60000, 'open', now(), now() + interval '14 days', 'sh1') returning id`))[0].id;
    await sql(`insert into gig_invitations (gig_id, freelancer_id, invited_by) values ('${gig}', '${ids.fl}', '${ids.att}'); select 1`);
    await sql(`insert into files (org_id, group_id, version, is_current, name, ext, size_bytes, storage_path, status, check_state, uploaded_by, side, request_id, no_client_info_ticked_at)
      values ('${ids.org}', gen_random_uuid(), 1, true, 'Welcome template.txt', 'txt', 20, 'sh/' || gen_random_uuid(), 'ready', 'clear', '${ids.att}', 'attorney', 'shf1', now()); select 1`);

    // ---------- The attorney: the gig's files ----------
    s = await open(browser, "DELA-App", ATT, `&tab=projects&gig=${gig}`);
    await dela(s.page).getByRole("tab", { name: /^Files \(/ }).click();
    let t = await waitFor(s.page, "Files for this gig");
    ok(t.includes(SENS), "the sensitive checkbox, word for word");
    ok(t.includes("Sensitive documents must be shared using a link from your own storage (Google Drive, Dropbox, OneDrive, Box, ShareFile, Clio, NetDocuments). Do not upload them here."), "its help text, word for word");
    ok(t.includes("File activity") && t.includes("Nobody has opened anything yet."), "the File activity card");
    await label(s.page, "Freelancer can open it for").selectOption("7");
    await click(s.page, "Share a file from Files");
    await waitFor(s.page, "Welcome template.txt");
    await dela(s.page).getByRole("button", { name: "Share", exact: true }).first().click();
    t = await waitFor(s.page, "Freelancer access until");
    const exp = (await sql(`select expires_at from gig_files where gig_id = '${gig}'`))[0].expires_at;
    ok(Math.abs((new Date(exp) - Date.now()) / 86400000 - 7) < 0.1, "shared for the 7 days picked");
    // The answer stays on the card, and the 7 days picked stay picked (ChatGPT re-test 2026-11-05)
    ok((await dela(s.page).locator(".gig-files-status").innerText()).startsWith("Shared until "), "the share answer stays on the card");
    ok(await label(s.page, "Freelancer can open it for").inputValue() === "7", "the days picked stay picked after sharing");
    await click(s.page, "Extend 14 days");
    await waitFor(s.page, "Extended to");
    ok((await dela(s.page).locator(".gig-files-status").innerText()).startsWith("Extended to "), "the extend answer stays on the card");
    const exp2 = (await sql(`select expires_at from gig_files where gig_id = '${gig}'`))[0].expires_at;
    ok(Math.abs((new Date(exp2) - Date.now()) / 86400000 - 21) < 0.1, "Extend adds 14 days");
    await s.ctx.close();

    // The hire: an active, signed engagement with the first milestone paid
    const prop = (await sql(`insert into proposals (gig_id, freelancer_id, status, price_cents) values ('${gig}', '${ids.fl}', 'selected', 45000) returning id`))[0].id;
    const ag = (await sql(`insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status, signed_at) values ('${gig}', '${prop}', '${ids.org}', '${ids.att}', '${ids.fl}', 45000, 'active', now()) returning id`))[0].id;
    await sql(`insert into agreement_versions (agreement_id, version, body, body_hash, proposed_by) values ('${ag}', 1, '{"milestones":[{"seq":1,"title":"Draft","amount_cents":45000}]}', 'h', '${ids.att}');
      insert into agreement_signatures (agreement_id, version, person_id, role, typed_name, body_hash) values ('${ag}', 1, '${ids.att}', 'attorney', 'Al', 'h'), ('${ag}', 1, '${ids.fl}', 'freelancer', 'Fe', 'h');
      insert into milestones (agreement_id, seq, title, amount_cents, from_version, status, funded_at) values ('${ag}', 1, 'Draft', 45000, 1, 'funded', now()); update gigs set status = 'filled' where id = '${gig}'; select 1`).catch(async () => {
      await sql(`insert into milestones (agreement_id, seq, title, amount_cents, from_version, status, funded_at) values ('${ag}', 1, 'Draft', 45000, 1, 'funded', now()); select 1`);
    });

    // ---------- The attorney: Confidential materials ----------
    s = await open(browser, "DELA-App", ATT, `&tab=projects&gig=${gig}&view=agreement`);
    await waitFor(s.page, "Confidential materials");
    await waitFor(s.page, "Email me a code");
    await code(s.page, ATT);
    t = await waitFor(s.page, "Secure document links");
    ok(t.includes("Client names, case facts, case numbers, court papers and contracts are allowed here."), "what belongs here");
    ok(t.includes(SENS), "the sensitive checkbox on the engagement too");
    const pick = conf(s.page).locator('input[type="file"]');
    await pick.setInputFiles({ name: "Roe intake.txt", mimeType: "text/plain", buffer: Buffer.from("Client Jane Roe, case 2026-CV-0042.") });
    await click(s.page, "Upload");
    await waitFor(s.page, "Tick the box to confirm");
    await label(s.page, "This file contains no medical records, ID documents, account numbers, logins or biometric data.").check();
    await conf(s.page).getByLabel("Freelancer can open it for").selectOption("30");
    await click(s.page, "Upload");
    t = await waitFor(s.page, "Roe intake.txt", 10000);
    await waitFor(s.page, "Freelancer access until");
    ok((await sql(`select count(*)::int n from conf_files where agreement_id = '${ag}' and expires_at > now() + interval '29 days'`))[0].n === 1, "the 30 days picked");
    await pick.setInputFiles({ name: "ids.txt", mimeType: "text/plain", buffer: Buffer.from("Client SSN 123-45-6789") });
    await label(s.page, "This file contains no medical records, ID documents, account numbers, logins or biometric data.").check();
    await click(s.page, "Upload");
    await waitFor(s.page, "This file appears to contain sensitive data like a Social Security or card number. Please share it using a secure link instead.", 10000);
    ok(await dela(s.page).getByRole("button", { name: "Mark this job as sensitive", exact: true }).count() === 1, "the button that ticks the sensitive checkbox");
    ok((await conf(s.page).locator(".conf-status").innerText()).startsWith("This file appears to contain sensitive data"), "the refusal replaces the earlier Uploaded line at the top");
    // A secure link
    await label(s.page, "Label (optional)").fill("Medical records folder");
    await label(s.page, "Secure link").fill("http://drive.google.com/x");
    await click(s.page, "Add link");
    await waitFor(s.page, "Use a secure link that starts with https.");
    // The answer stays on the card after the passing message is gone (ChatGPT test 2026-11-05 missed it)
    await s.page.waitForTimeout(6500);
    ok((await conf(s.page).locator(".conf-status").innerText()).includes("Use a secure link that starts with https."), "a refusal stays on the card");
    ok(await s.page.evaluate(() => window.DELA.money(undefined + 1) === "-" && window.DELA.money(45000) === "$450"), "a broken amount reads -, never $NaN");
    await label(s.page, "Secure link").fill("https://drive.google.com/drive/folders/abc");
    await label(s.page, "Link expires after").selectOption("7");
    await click(s.page, "Add link");
    t = await waitFor(s.page, "Medical records folder");
    ok(t.includes("drive.google.com") && t.includes("Expires"), "the link shows its storage and expiry");
    ok(!t.includes("folders/abc"), "the page never shows the stored address");
    await s.page.screenshot({ path: path.join(SHOTS, "sharing-conf-attorney.png"), fullPage: true });
    await s.ctx.close();

    // ---------- The freelancer ----------
    s = await open(browser, "DELA-App", FL, `&tab=work&gig=${gig}`);
    await dela(s.page).getByRole("tab", { name: "Agreement and work" }).click().catch(() => {});
    await waitFor(s.page, "Email me a code");
    await code(s.page, FL);
    await waitFor(s.page, "I will keep these materials confidential");
    await conf(s.page).locator('input[type="checkbox"]').first().check();
    await click(s.page, "Open Confidential materials");
    t = await waitFor(s.page, "Roe intake.txt");
    ok(t.includes("Open to you until") && t.includes("Medical records folder"), "the freelancer sees the file, its date and the link");
    ok(!t.includes(SENS) && await dela(s.page).getByRole("button", { name: "Add link", exact: true }).count() === 0, "freelancers do not mark jobs or add links");
    // Download starts in this tab (a new tab opened after DELA answers is blocked as a pop-up; ChatGPT re-test 2026-11-05)
    const [dl] = await Promise.all([s.page.waitForEvent("download", { timeout: 10000 }), click(s.page, "Download")]);
    ok(dl.suggestedFilename() === "Roe intake.txt", "the freelancer's Download saves the file");
    const popup = s.page.waitForEvent("popup").catch(() => null);
    await click(s.page, "Open link");
    await popup;
    await s.page.waitForTimeout(400);
    ok((await sql(`select count(*)::int n from conf_log l join people p on p.id = l.person_id where l.agreement_id = '${ag}' and l.action = 'link_open' and p.bd_member_id = ${FL}`))[0].n === 1, "the open is logged under the freelancer");
    await s.page.setViewportSize({ width: 390, height: 844 });
    await s.page.waitForTimeout(300);
    const wide = await s.page.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; return [...r.querySelectorAll("#conf-card *")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).length; });
    ok(wide === 0, "phone width: nothing in Confidential materials runs off the side (" + wide + ")");
    await s.ctx.close();

    // ---------- The attorney: mark sensitive, Delete now ----------
    s = await open(browser, "DELA-App", ATT, `&tab=projects&gig=${gig}&view=agreement`);
    await waitFor(s.page, "Secure document links");
    await label(s.page, SENS).check();
    t = await waitFor(s.page, "already shared on this job. They stay until they expire.");
    await click(s.page, "Delete now");
    await click(s.page, "Yes, delete them");
    await waitFor(s.page, "Deleted.");
    t = await waitFor(s.page, "files cannot be uploaded here");
    ok(t.includes("No files yet."), "Delete now removed the files");
    ok((await sql(`select count(*)::int n from gig_files where gig_id = '${gig}' and removed_at is null`))[0].n === 0, "and stopped the gig shares");
    ok((await sql(`select count(*)::int n from files where name = 'Welcome template.txt' and status = 'ready'`))[0].n === 1, "the attorney's Files tab copy stays");
    t = await waitFor(s.page, "Activity");
    await s.ctx.close();
    s = await open(browser, "DELA-App", ATT, `&tab=projects&gig=${gig}`);
    await dela(s.page).getByRole("tab", { name: /^Files \(/ }).click();
    t = await waitFor(s.page, "This job involves sensitive data, so files cannot be shared here.");
    ok(await dela(s.page).getByRole("button", { name: "Share a file from Files", exact: true }).count() === 0, "no sharing on a sensitive job");
    t = await waitFor(s.page, "opened the link");
    ok(t.includes("Member " + FL + " opened the link") && t.includes("Medical records folder"), "File activity shows the freelancer's open");
    await s.ctx.close();

    // ---------- Ask DELA, the Library and Trash: the 90-day rule and deleting at once ----------
    await sql(`insert into ai_chats (person_id, side, title, updated_at) values ('${ids.att}', 'attorney', 'Intake checklist ideas', now() - interval '86 days');
      insert into playbooks (org_id, title, status, current_version, request_id, created_by, updated_at) values ('${ids.org}', 'Old intake draft', 'draft', 1, 'shd1', '${ids.att}', now() - interval '86 days');
      insert into files (org_id, group_id, version, is_current, name, ext, size_bytes, storage_path, status, check_state, uploaded_by, side, request_id, no_client_info_ticked_at, trashed_at)
        values ('${ids.org}', gen_random_uuid(), 1, true, 'Old memo.txt', 'txt', 20, 'sh/' || gen_random_uuid(), 'trash', 'clear', '${ids.att}', 'attorney', 'shf2', now(), now()); select 1`);
    s = await open(browser, "DELA-App", ATT, "&tab=delegate");
    t = await waitFor(s.page, "due to be deleted soon");
    ok(t.includes("Intake checklist ideas"), "Ask DELA names the chat due to be deleted");
    const chatId = (await sql(`select id from ai_chats where title = 'Intake checklist ideas'`))[0].id;
    await label(s.page, "Earlier chats").selectOption(chatId);
    await waitFor(s.page, "unless you save it");
    await click(s.page, "Save to library");
    await waitFor(s.page, "Saved to your library");
    ok((await sql(`select saved_at is not null s from ai_chats where id = '${chatId}'`))[0].s, "saved");
    await click(s.page, "Delete this chat");
    await click(s.page, "Yes, delete");
    await waitFor(s.page, "Chat deleted");
    ok((await sql(`select count(*)::int n from ai_chats where id = '${chatId}'`))[0].n === 0, "a chat is deleted at once");
    await s.ctx.close();
    s = await open(browser, "DELA-App", ATT, "&tab=library");
    t = await waitFor(s.page, "Drafts due to be deleted");
    ok(t.includes("Old intake draft"), "the Library names the draft due to be deleted");
    await click(s.page, "Save to library");
    await waitFor(s.page, "Saved. This draft is kept");
    ok((await sql(`select saved_at is not null s from playbooks where title = 'Old intake draft'`))[0].s, "the draft is saved");
    await s.ctx.close();
    s = await open(browser, "DELA-App", ATT, "&tab=files");
    await dela(s.page).getByRole("button", { name: "Trash", exact: true }).click();
    await waitFor(s.page, "Old memo.txt");
    await click(s.page, "Delete forever");
    await waitFor(s.page, "Deleted forever");
    ok((await sql(`select status from files where name = 'Old memo.txt'`))[0].status === "deleted", "Delete forever is immediate");
    await s.ctx.close();

    // ---------- The admin Security tab ----------
    await sql("select dela_security_contact('{\"name\": \"Pat\", \"email\": \"pat@example.com\", \"topic\": \"Encryption\", \"message\": \"Is my data encrypted at rest?\", \"ip_hash\": \"sharing-test\"}'::jsonb)");
    s = await open(browser, "DELA-Admin", OWNER, "");
    ok(await dela(s.page).getByRole("button", { name: "Sign out", exact: true }).count() === 1, "the admin area has Sign out");
    await dela(s.page).getByRole("tab", { name: "Security", exact: true }).click();
    t = await waitFor(s.page, "Security questions from the website");
    ok(t.includes("Is my data encrypted at rest?") && t.includes("pat@example.com"), "the question is in the admin area");
    t = await waitFor(s.page, "Jobs marked sensitive");
    ok(!t.includes("Roe intake") && !t.includes("Medical records folder"), "the team's counts carry no names");
    await click(s.page, "Mark as handled");
    await waitFor(s.page, "Handled");
    await s.ctx.close();
    console.log(passed + " browser checks passed");
  } catch (e) {
    if (s && s.page) await s.page.screenshot({ path: path.join(SHOTS, "sharing-fail.png"), fullPage: true }).catch(() => {});
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

// Browser test of Step 2: the playbook library, built with DELA, chat suggestions, comments, approval, exports, team,
// and Import from Scribe with the review screen and the blur tool. Real widgets, api and database; AI and storage stand-ins
// (tests/pw/server.ts). Needs tools/dbtest.sh, then tests/pw/server.ts on port 8787.   node tests/pw/playbooks-test.js
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
const PNG64 = "iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAAK0lEQVR4nO3NMQ0AAAgDsAlDCYqRhQw4mvRvpvpExGKxWCwWi8VisVj8N16B+mj7BBLoxAAAAABJRU5ErkJggg==";

async function open(browser, uid, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1200, height: 900 }, acceptDownloads: true });
  // Step 43: the folded sections of "Agreement and work" are open, as with "Open all sections" (the folded page has its own checks in engagements-test.js)
  await ctx.addInitScript((all) => { try { if (all) (localStorage.setItem("dela_eg_all", "1"), localStorage.setItem("dela_pf_all", "1")); else localStorage.removeItem("dela_eg_all"); } catch (e) { /* no storage */ } }, true);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Keep it" : undefined));
  await page.route("https://cdn.jsdelivr.net/**", (route) => {
    const u = new URL(route.request().url());
    const rel = u.pathname.split("@")[1].split("/").slice(1).join("/");
    route.fulfill({ path: path.join(ROOT, rel), contentType: "application/javascript" });
  });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto(`${BASE}/page/DELA-App?uid=${uid}&plan=`);
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
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(0, 2000));
}
const tab = (page, name) => dela(page).getByRole("tab", { name: name, exact: true }).first().click();
const click = (page, name, opts) => dela(page).getByRole("button", Object.assign({ name: name, exact: true }, opts || {})).first().click();
async function makeMember(bd, side, plan) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, 'Member ${bd}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side((select id from people where bd_member_id = ${bd}), '${side}', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and channel = 'access' and revoked_at is null); select 1`);
}

(async () => {
  const browser = await chromium.launch();
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('ai_generation', 'playbook_library', 'scribe_import', 'file_uploads', 'voice_input')");
    await makeMember(2200, "attorney", "att_business");
    await makeMember(2201, "attorney", "att_free");
    await makeMember(2202, "freelancer", "fl_free");

    // ---------- Build a playbook with DELA ----------
    let s = await open(browser, 2200);
    const p = s.page;
    await click(p, "Library");
    let t = await waitFor(p, "Document library");
    ok(t.includes("0 documents (no cap on your plan)"), "the library opens with the count and the plan's cap");
    await click(p, "New document");
    await dela(p).getByLabel("Describe the task").fill("When a new family law client signs, we run a conflict check, send the engagement letter and open the file.");
    await click(p, "Draft it with DELA");
    t = await waitFor(p, "DELA's questions");
    ok(t.includes("Who signs the engagement letter?") && t.includes("Still missing"), "DELA drafts the playbook and asks for what is missing");
    // Home counts the new draft, and "Open the Library" opens the list, not the last playbook (Stacey's test 2026-11-05)
    await click(p, "Home");
    await p.waitForTimeout(800);
    const tile = await dela(p).locator(".stat-tile", { hasText: "Draft documents" }).innerText();
    ok(tile.startsWith("1") || tile.includes("\n1\n") || tile.trim().split("\n").includes("1"), "Home shows 1 draft playbook (" + tile.split("\n").join(" ") + ")");
    await click(p, "Open the Library");
    t = await waitFor(p, "Document library");
    ok(t.includes("1 document"), "Open the Library shows the list of playbooks");
    await dela(p).locator(".work", { hasText: "New client intake" }).first().click();
    t = await waitFor(p, "DELA's questions");
    await dela(p).getByLabel("Your answers").fill("The attorney signs. California. The paralegal opens the file in Clio.");
    await click(p, "Fill these in");
    t = await waitFor(p, "Every required part is filled");
    ok(t.includes("Complete: 100%") && t.includes("Version 2"), "the answers fill every required part as version 2");
    await click(p, "Approve");
    t = await waitFor(p, "last approved: version 2");
    ok(t.includes("Approved") && t.includes("next review"), "the administrator approves it and a review date is set");
    await p.screenshot({ path: path.join(SHOTS, "2-playbook-read.png"), fullPage: true });

    // ---------- Chat: a change becomes a suggestion ----------
    await tab(p, "Chat");
    await dela(p).getByLabel("Message about this document").fill("Who runs the conflict check?");
    await click(p, "Send");
    await waitFor(p, "The paralegal runs the conflict check");
    ok(true, "chat answers a question about the playbook");
    await dela(p).getByLabel("Message about this document").fill("Please add a step to send the welcome email");
    await click(p, "Send");
    t = await waitFor(p, "Suggested edits (1)");
    ok(t.includes("Nothing has changed yet: it is waiting on the \"Suggested edits\" tab") && t.includes("Suggested edits ("), "a requested change becomes a suggestion");
    await tab(p, "Suggested edits (1)");
    t = await waitFor(p, "Add a welcome email");
    ok(t.includes("Send the welcome email"), "the suggestion shows what would change");
    await click(p, "Accept");
    t = await waitFor(p, "Version 3");
    ok(t.includes("Draft") && t.includes("last approved: version 2"), "accepting saves version 3, which needs approving again");

    // ---------- Comment with suggested text ----------
    await tab(p, "Read");
    await waitFor(p, "Quality checks");
    await dela(p).getByRole("button", { name: "Comment" }).first().click();
    await dela(p).getByLabel("Comment").fill("Mention the retainer");
    await dela(p).getByText("Suggest new text for this part").click();
    await dela(p).getByLabel("Suggested text").fill("A signed engagement letter, the retainer paid, and an opened file");
    await click(p, "Send");
    await waitFor(p, "Suggested edits (1)");
    await tab(p, "Suggested edits (1)");
    await waitFor(p, "the retainer paid");
    await click(p, "Accept");
    await waitFor(p, "Version 4");
    await tab(p, "Read");
    t = await waitFor(p, "the retainer paid");
    ok(true, "a comment's suggested text is accepted into version 4");
    await tab(p, "Activity");
    t = await waitFor(p, "Accepted a suggestion");
    ok(t.includes("First draft by DELA") && t.includes("DELA filled in answers") && t.includes("Approved") && t.includes("Suggested a change"), "the activity log lists every event");

    // ---------- Versions: restore ----------
    await tab(p, "Versions");
    await waitFor(p, "Version 2 (approved)");
    await dela(p).getByRole("button", { name: "Restore" }).nth(1).click();
    await waitFor(p, "Restored as version 5");
    ok(true, "an earlier version is restored as a new version");

    // ---------- Exports ----------
    await tab(p, "Export");
    await waitFor(p, "Step checklist (.csv)");
    for (const [label, ext] of [["Word (.docx)", "docx"], ["Markdown (.md)", "md"], ["Step checklist (.csv)", "csv"]]) {
      const [dl] = await Promise.all([p.waitForEvent("download"), click(p, label)]);
      const file = path.join(SHOTS, "export." + ext);
      await dl.saveAs(file);
      ok(dl.suggestedFilename().startsWith("DELA - New client intake - v5") && dl.suggestedFilename().endsWith("." + ext) && fs.statSync(file).size > 100, "export downloads as " + ext + " with the title and version in its name");
    }
    ok(fs.readFileSync(path.join(SHOTS, "export.md"), "utf8").includes("1. Run the conflict check"), "the Markdown export holds the numbered steps");

    // ---------- What am I missing ----------
    await click(p, "← Library");
    await click(p, "What am I missing?");
    await waitFor(p, "Conflict check");
    ok(true, "DELA suggests playbooks the firm is missing");

    // ---------- Team ----------
    await click(p, "Team");
    await dela(p).getByLabel("BD member ID").fill("2201");
    await click(p, "Add");
    t = await waitFor(p, "Member 2201");
    ok(t.includes("Editor"), "the owner adds an editor (Business has 3 seats)");
    await dela(p).getByRole("button", { name: "Close library team" }).click();

    // ---------- Import from Scribe ----------
    await click(p, "Import from Scribe");
    await waitFor(p, "Import a guide from Scribe");
    const guide = `<!doctype html><html><head><title>File a motion</title><script>window.parent.hacked = 1</script></head><body><h1>File a motion</h1>
      <div><p>Click File, then Save as PDF</p><img src="data:image/png;base64,${PNG64}"></div>
      <div><p>Upload the PDF on the court website</p><img src="https://images.scribehow.com/step2.png"></div>
      <div><p>Upload the filed copy to Clio</p><img src="https://evil.example.com/track.png"></div></body></html>`;
    await dela(p).locator("input[type=file]").first().setInputFiles({ name: "File a motion.html", mimeType: "text/html", buffer: Buffer.from(guide) });
    await click(p, "Read the guide");
    await p.waitForTimeout(300);
    t = await text(p);
    ok(!t.includes("Review your guide"), "without the tick box nothing is read");
    await dela(p).locator("#dela-scribe-tick").check();
    await click(p, "Read the guide");
    t = await waitFor(p, "Review your guide", 15000);
    const vals = await p.evaluate(() => [...document.querySelector(".dela-host").shadowRoot.querySelectorAll("textarea[aria-label^='Step ']")].map((x) => x.value));
    ok(vals.length === 3 && vals[0] === "Click File, then Save as PDF" && vals[2] === "Upload the filed copy to Clio", "the guide's three steps are on the review screen");
    ok(await p.evaluate(() => !window.hacked), "a script inside the Scribe file never runs");
    ok((await dela(p).locator("img[alt^='Screenshot for step']").count()) === 2, "two screenshots kept; the one from an unknown address was skipped");

    // Blur part of the first screenshot
    await dela(p).getByRole("button", { name: "Blur part of this image" }).first().click();
    const canvas = dela(p).locator("canvas");
    await canvas.waitFor();
    const box = await canvas.boundingBox();
    await p.mouse.move(box.x + 5, box.y + 5);
    await p.mouse.down();
    await p.mouse.move(box.x + box.width - 5, box.y + box.height - 5);
    await p.mouse.up();
    await click(p, "Save the blurred screenshot");
    await waitFor(p, "Blurred screenshot saved");
    const dropped = await sql("select count(*)::int n from files where name like 'Scribe File a motion step 1%' and status = 'deleted'");
    ok(dropped[0].n === 1, "the unblurred original is deleted");

    await dela(p).getByLabel("Step 2").fill("Upload the PDF on the court e-filing website");
    await dela(p).getByLabel("Step 2").blur();
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(SHOTS, "2-scribe-review.png"), fullPage: true });
    await click(p, "Build my document");
    t = await waitFor(p, "File a motion", 10000);
    await waitFor(p, "Complete: 100%");
    t = await text(p);
    ok(t.includes("Screenshot"), "the built playbook keeps the screenshots with their steps");
    const src = await sql("select source from playbooks where title = 'File a motion' and source = 'scribe'");
    ok(src[0] && src[0].source === "scribe", "the playbook records it came from Scribe");

    // ---------- Step 76: connect the firm's Scribe account and pick a guide from the list (Stacey 2026-11-23) ----------
    const sr = (fn, arg) => p.evaluate(([f, a]) => new Function("r", "a", f)(document.querySelector(".dela-host").shadowRoot, a), [fn, arg]);
    await click(p, "← Library");
    await waitFor(p, "Document library");
    await click(p, "Import from Scribe");
    await waitFor(p, "From an exported file");
    await p.waitForTimeout(500);
    ok(await sr("return !r.querySelector('#scribe-card')"), "with the switch off the page offers the file import only");
    await sql("update feature_switches set state = 'everyone' where key = 'scribe_connect'");
    await click(p, "Cancel");
    await click(p, "Import from Scribe");
    await waitFor(p, "From your Scribe account");
    ok(await sr("var c = r.querySelector('#scribe-card'), f = r.querySelector('#scribe-file'); return c.compareDocumentPosition(f) & 4 && r.querySelector('#scribe-key').type === 'password' && !!r.querySelector('label[for=scribe-key]')"), "the account card sits above the file card, and the key box is a labelled password box");
    await click(p, "Connect Scribe");
    await waitFor(p, "Paste the key from Scribe first.");
    await dela(p).locator("#scribe-key").fill("not a key");
    await click(p, "Connect Scribe");
    await waitFor(p, "That does not look like a Scribe key.");
    await dela(p).locator("#scribe-key").fill("sc_browsertest1234567890.wrongkey");
    await click(p, "Connect Scribe");
    t = await waitFor(p, "Scribe did not accept this key.");
    ok(t.includes("Nothing was saved."), "a key Scribe refuses is not saved, and the page says so");
    await dela(p).locator("#scribe-key").fill("sc_browsertest1234567890.noplan");
    await click(p, "Connect Scribe");
    await waitFor(p, "plan does not include the connection");
    ok((await sql("select count(*)::int n from scribe_connections"))[0].n === 0, "no connection is stored for a refused key");
    await dela(p).locator("#scribe-key").fill("sc_browsertest1234567890.isgood");
    await click(p, "Connect Scribe");
    t = await waitFor(p, "Showing 25 of 27 guides.", 15000);
    ok(t.includes("Connected") && t.includes("Key ending in good") && t.includes("Serve a subpoena") && t.includes("3 steps") && !t.includes("isgood"), "connected: the card shows the last 4 characters, never the key, and lists the firm's guides");
    ok(await sr("return !r.querySelector('#scribe-key')"), "the key box is gone once connected");
    const sealed = await sql("select ciphertext, last4 from scribe_connections where status = 'active'");
    ok(sealed.length === 1 && sealed[0].ciphertext.startsWith("v1.") && !sealed[0].ciphertext.includes("isgood") && sealed[0].last4 === "good", "the key is stored sealed");
    await click(p, "Show more guides");
    await waitFor(p, "Showing 27 of 27 guides.");
    ok(await sr("return r.querySelector('#scribe-more').style.display === 'none' && r.querySelectorAll('#scribe-list li').length === 27"), "Show more brings the rest, then goes away");
    await dela(p).locator("#scribe-q").fill("subpoena");
    await dela(p).locator("#scribe-q").press("Enter");
    await waitFor(p, "1 guide fits.");
    ok(await sr("return r.querySelectorAll('#scribe-list li').length === 1"), "the search narrows the list");
    await p.screenshot({ path: path.join(SHOTS, "2-scribe-account.png"), fullPage: true });
    await dela(p).getByRole("button", { name: "Import Serve a subpoena" }).click();
    await waitFor(p, "Tick the box");
    ok(!(await text(p)).includes("Review your guide"), "without the tick box nothing is read from Scribe");
    await dela(p).locator("#dela-scribe-tick").check();
    await dela(p).getByRole("button", { name: "Import Serve a subpoena" }).click();
    await waitFor(p, "Review your guide", 15000);
    const sv = await p.evaluate(() => [...document.querySelector(".dela-host").shadowRoot.querySelectorAll("textarea[aria-label^='Step ']")].map((x) => x.value));
    ok(sv.length === 3 && sv[0] === "Open the subpoena form" && sv[2] === "Send it to the process server", "the guide's three steps are on the review screen: " + JSON.stringify(sv));
    ok((await dela(p).locator("img[alt^='Screenshot for step']").count()) === 1, "the screenshot from Scribe's address came in; the one from an unknown address was skipped");
    ok((await sql("select source from playbook_imports where title = 'Serve a subpoena'"))[0].source === "scribe", "the import is recorded as coming from Scribe");
    // Disconnect asks once, erases the key, and the connect form comes back
    await click(p, "← Library");
    await waitFor(p, "Document library");
    await click(p, "Import from Scribe");
    await waitFor(p, "Key ending in good");
    await click(p, "Disconnect");
    await waitFor(p, "Disconnect this Scribe account?");
    await click(p, "Keep it connected");
    ok((await sql("select count(*)::int n from scribe_connections where status = 'active'"))[0].n === 1, "Keep it connected changes nothing");
    await click(p, "Disconnect");
    await click(p, "Yes, disconnect");
    await waitFor(p, "Disconnected. The saved key was erased.");
    ok(await sr("return !!r.querySelector('#scribe-key')") && (await sql("select ciphertext from scribe_connections"))[0].ciphertext === "removed", "after disconnecting the sealed key is erased and the connect form is back");
    // Leave it connected for the editor's check below
    await dela(p).locator("#scribe-key").fill("sc_browsertest1234567890.isgood");
    await click(p, "Connect Scribe");
    await waitFor(p, "Showing 25 of 27 guides.", 15000);
    await s.ctx.close();

    // ---------- Editor in the firm's library ----------
    s = await open(browser, 2201);
    await click(s.page, "Library");
    await waitFor(s.page, "Document library");
    await dela(s.page).getByLabel("Library").selectOption({ index: 1 });
    t = await waitFor(s.page, "New client intake");
    ok(t.includes("Your access to this Library: Editor"), "the editor opens the firm's library from the picker");
    ok(!t.includes("Team"), "only the administrator manages the team");
    // Step 76: an editor uses the firm's Scribe connection and cannot see or change the key
    await click(s.page, "Import from Scribe");
    t = await waitFor(s.page, "Showing 25 of 27 guides.", 15000);
    ok(t.includes("Key ending in good") && (await dela(s.page).getByRole("button", { name: "Disconnect", exact: true }).count()) === 0 && (await dela(s.page).locator("#scribe-key").count()) === 0, "an editor sees the firm's guides, with no key box and no Disconnect");
    await click(s.page, "Cancel");
    await waitFor(s.page, "New client intake");
    await dela(s.page).getByText("New client intake").first().click();
    await waitFor(s.page, "Complete:");
    t = await text(s.page);
    ok((await dela(s.page).getByRole("button", { name: "Approve", exact: true }).count()) === 0 && t.includes("Send for review"), "an editor can send for review but not approve");
    await s.ctx.close();

    // Upload a file right on the New playbook page and draft from it alone (Stacey 2026-11-05)
    s = await open(browser, 2200);
    await click(s.page, "Library");
    await waitFor(s.page, "Document library");
    await click(s.page, "New document");
    await click(s.page, "Upload a new file");
    await dela(s.page).getByLabel("Choose a file").setInputFiles({ name: "Billing steps.txt", mimeType: "text/plain", buffer: Buffer.from("Step 1. Pull the time entries.\nStep 2. Review the draft invoices.\nStep 3. Send the invoices.") });
    await click(s.page, "Upload");
    t = await waitFor(s.page, "Tick the box");
    ok(t.includes("Tick the box to confirm"), "uploading here needs the no client information tick");
    await dela(s.page).getByLabel("This file has no sensitive data", { exact: false }).check();
    await click(s.page, "Upload");
    t = await waitFor(s.page, "is ready. DELA will draft from it", 15000);
    ok(t.includes("Billing steps.txt is ready"), "the file uploads from the New playbook page");
    await click(s.page, "Draft it with DELA");
    t = await waitFor(s.page, "DELA's questions", 15000);
    ok(t.includes("DELA's questions"), "DELA drafts from the uploaded file with no description");
    await s.ctx.close();

    // Phone
    s = await open(browser, 2200, { width: 390, height: 844 });
    await click(s.page, "Library");
    await waitFor(s.page, "Document library");
    ok(await s.page.evaluate(() => document.documentElement.scrollWidth) <= 392, "the library fits a phone screen");
    await s.page.screenshot({ path: path.join(SHOTS, "2-library-phone.png") });
    await s.ctx.close();

    // ---------- Step 45: Ask DELA as a chat-first workspace ----------
    await sql("update feature_switches set state = 'everyone' where key = 'ask_dela_workspace'; select 1");
    s = await open(browser, 2200, { width: 1280, height: 900 });
    await click(s.page, "Ask DELA");
    t = await waitFor(s.page, "What DELA is using");
    ok(t.includes("What would you like to get off your plate?") && t.includes("Describe the work or what keeps going wrong. We'll work through it together.") && t.includes("+ New chat"), "Ask DELA opens on a blank chat with the question, and New chat is a secondary button");
    ok(t.includes("Naming a document in your message does not attach it.") && /Documents \(0 of 3\)/.test(t) && t.includes("None chosen.") && t.includes("Choose a document or send a message. The actions that fit appear here."), "the panel says what DELA is using: nothing chosen yet, and no next action before a message");
    const cols = await s.page.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; const a = r.querySelector(".aw-main").getBoundingClientRect(), b = r.querySelector(".aw-side").getBoundingClientRect(); return b.left > a.right - 1; });
    ok(cols, "at 1280 wide the panel sits beside the chat");
    await click(s.page, "Add a document");
    await dela(s.page).locator(".aw-opt input").first().check();
    t = await text(s.page);
    ok(/Documents \(1 of 3\)/.test(t) && t.includes("Approved, version") && await dela(s.page).getByRole("button", { name: /^Remove .* from this chat$/ }).count() === 1, "a chosen document is listed with its type and approved version, and can be removed");
    // ChatGPT check 12: after an answer the DELA actions count is read again, without leaving the page
    const reread = [];
    s.page.on("request", (q) => { const u = q.url(); if (/\/api\/(ai|usage)(\?|$)/.test(u)) reread.push(u.split("/api")[1]); });
    await dela(s.page).getByLabel("Your message", { exact: true }).fill("Please ask me what you need about intake");
    await click(s.page, "Send");
    t = await waitFor(s.page, "Suggested answers", 15000);
    await s.page.waitForTimeout(600);
    ok(reread.includes("/ai") && reread.includes("/usage") && await dela(s.page).locator("#chat-credits").count() === 1, "after an answer the DELA actions left are read again on the same page: " + reread.join(", "));
    ok(t.includes("I used your document.") && t.includes("Which matters does this cover?") && !t.includes("CHOICES:") && !t.includes("QUESTION:"), "DELA answered from the chosen document and its one question shows as text, with the choices as buttons");
    const before45 = (await sql("select count(*)::int n from ai_messages"))[0].n;
    await click(s.page, "New matters only");
    await s.page.waitForTimeout(300);
    ok(await dela(s.page).getByLabel("Your message", { exact: true }).inputValue() === "New matters only" && (await sql("select count(*)::int n from ai_messages"))[0].n === before45, "a choice only fills the message box; nothing is sent");
    t = await text(s.page);
    ok(t.includes("Create a draft from this chat →") && t.includes("Starting a new chat keeps your earlier chats and drafts."), "after a message, the next actions fit the chat");
    await s.page.setViewportSize({ width: 320, height: 800 });
    await s.page.waitForTimeout(350);
    ok(await s.page.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; const a = r.querySelector(".aw-main").getBoundingClientRect(), b = r.querySelector(".aw-side").getBoundingClientRect(); return document.documentElement.scrollWidth <= window.innerWidth + 1 && b.top >= a.bottom - 1; }), "320 wide: one column, the panel under the chat, no sideways scrolling");
    await s.page.setViewportSize({ width: 1280, height: 900 });
    await s.page.waitForTimeout(250);
    await s.page.screenshot({ path: path.join(SHOTS, "ask-dela-workspace.png"), fullPage: true });
    // A draft from the chat: the chat is its material, the draft stays linked, nothing is approved
    await dela(s.page).locator("#aw-draft").click();
    await s.page.waitForFunction(() => { const r = document.querySelector(".dela-host").shadowRoot; const ta = r.querySelector('textarea[aria-label="Describe the task"], textarea[aria-label^="Paste an existing checklist"]'); return ta && ta.value.includes("Me: Please ask me what you need about intake"); }, null, { timeout: 15000 });
    ok(true, "Create a draft from this chat opens New document with the chat as its material");
    await click(s.page, "Draft it with DELA");
    await waitFor(s.page, "DELA's questions", 15000);
    const linked = await sql("select p.status, p.approved_version, (select saved_at is not null from ai_chats c where c.id = p.from_chat) kept from playbooks p where p.from_chat is not null");
    ok(linked.length === 1 && linked[0].status === "draft" && linked[0].approved_version === null && linked[0].kept === true, "one draft, linked to its chat, not approved, and the chat is kept: " + JSON.stringify(linked));
    await click(s.page, "Ask DELA");
    t = await waitFor(s.page, "Drafts from this chat");
    ok(/Documents \(1 of 3\)/.test(t), "back in the chat: its draft is listed and its document is still chosen");
    // ---------- Step 46: DELA instructions ----------
    t = await waitFor(s.page, "No firm guidance yet.");
    await click(s.page, "Open DELA instructions");
    t = await waitFor(s.page, "What should DELA do differently?");
    ok(t.includes("Firm guidance (0)") && t.includes("My preferences (0)") && t.includes("Change history") && t.includes("It does not change how DELA works until the administrator approves it."), "DELA instructions opens in place of the chat, with its three tabs and the proposal note");
    await dela(s.page).locator("#rule-go").click();
    await s.page.waitForTimeout(200);
    ok((await dela(s.page).locator("#rules-say").innerText()).includes("Write at least a few words."), "an empty instruction is refused in words");
    await dela(s.page).locator("#rule-new").fill("For intake work, ask who confirms missing documents before preparing a handoff.");
    await dela(s.page).locator("#rule-go").click();
    t = await waitFor(s.page, "Proposed, not in use");
    ok(t.includes("Firm guidance (1)") && t.includes("DELA does not follow it until the Library administrator approves it.") && (await sql("select count(*)::int n from firm_rules where status = 'approved'"))[0].n === 0, "a new line is a proposal: listed, labeled not in use, and nothing is approved");
    await dela(s.page).getByRole("button", { name: /^Approve: / }).click();
    t = await waitFor(s.page, "Approved, in use");
    ok(t.includes("1 line of firm guidance in use") && await dela(s.page).getByRole("button", { name: /^Retire: / }).count() === 1, "the administrator approves it; the panel counts it and it can be retired");
    await dela(s.page).locator("#rules-tab-personal").click();
    await dela(s.page).locator("#rule-new").fill("Give me checklists as numbered steps.");
    await dela(s.page).locator("#rule-go").click();
    t = await waitFor(s.page, "My preferences (1)");
    ok(t.includes("In use") && t.includes("1 preference of your own"), "a preference is the person's own and is in use at once");
    await dela(s.page).locator("#rules-tab-history").click();
    t = await waitFor(s.page, "Firm guidance. Proposed by you");
    ok(t.includes("Your preference."), "the change history lists both, with who and when");
    await click(s.page, "← Back to the chat");
    await waitFor(s.page, "Drafts from this chat");
    await click(s.page, "+ New chat");
    t = await waitFor(s.page, "None chosen.");
    ok(!t.includes("Drafts from this chat") && (await sql("select count(*)::int n from ai_chats where archived_at is null and person_id = (select id from people where bd_member_id = 2200)"))[0].n >= 1, "New chat starts clean and the earlier chat is still stored");
    await s.ctx.close();

    // ---------- Step 75a: the Ask DELA workspace as the ten workflow mockups draw it ----------
    await sql("update feature_switches set state = 'everyone' where key in ('new_layout', 'dela_workspace_v2', 'recorder'); select 1");
    try {
      s = await open(browser, 2200, { width: 1500, height: 950 });
      await click(s.page, "Ask DELA");
      t = await waitFor(s.page, "Working context");
      const navItems = (await dela(s.page).locator(".dw-nav .dw-item").allInnerTexts()).map((x) => x.trim());
      ok(navItems[0] === "Chat with DELA" && navItems[1] === "My playbooks" && navItems[navItems.length - 1] === "DELA instructions" && await dela(s.page).locator(".dw-nav .dw-item[aria-current=page]").innerText() === "Chat with DELA", "Ask DELA has its own second menu, with the chat marked as the page you are on: " + navItems.join(", "));
      ok(/recent conversations/i.test(t) && await dela(s.page).locator(".dw-chat").count() >= 1 && t.includes("Chats and drafts remain separate records. Starting a new chat does not delete previous work."), "earlier chats are a list under the menu, and a new chat deletes nothing");
      ok(t.includes("Suggested next actions") && t.includes("Create or improve a playbook") && t.includes("Manage playbooks") && t.includes("Suggestions are not approvals.") && t.includes("+ New chat") && await dela(s.page).locator("#dw-instr").innerText() === "DELA instructions", "the right column has the working context, the next actions and the note; the header has New chat and DELA instructions");
      const three = await s.page.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot, b = (q) => r.querySelector(q).getBoundingClientRect(); const w = Math.round(b(".dw-wrap").width);
        const side = b(".dw-chat-card").right <= b(".dw-3 > .dw-side").left + 1, nav = b(".dw-nav").right <= b(".dw-chat-card").left + 1;
        return { w: w, ok: w >= 900 ? side && nav : w >= 760 ? side && b(".dw-nav").bottom <= b(".dw-chat-card").top + 1 : true }; });
      // Fix (Stacey 2026-11-23): the menu card's headings and chat titles stay inside the card
      const navFit = await s.page.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot, nav = r.querySelector(".dw-nav"), box = nav.getBoundingClientRect();
        const out = [...nav.querySelectorAll(".dw-cap, .dw-chat, .dw-item")].filter((e) => { const b = e.getBoundingClientRect(); return b.right > box.right + 0.5 || e.scrollWidth > e.clientWidth + 1; }).map((e) => e.textContent.slice(0, 30));
        return { out: out, cap: parseFloat(getComputedStyle(nav.querySelector(".dw-cap")).fontSize), wrap: getComputedStyle(nav.querySelector(".dw-chat")).whiteSpace }; });
      ok(navFit.out.length === 0 && navFit.cap <= 13 && navFit.wrap === "normal", "Fix: nothing in the menu card runs past its edge, the two headings are small, and a chat title may use two lines: " + JSON.stringify(navFit));
      // Stacey 2026-11-23: the message box offers the ways to show DELA the work: talk, record the screen, bring in a Scribe guide
      const capt = await s.page.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; return { h: (r.querySelector("#dw-cap-h") || {}).textContent, btns: [...r.querySelectorAll(".dw-capture .dw-cap-btn")].map((b) => b.textContent.trim()), heights: [...r.querySelectorAll(".dw-capture .dw-cap-btn")].map((b) => Math.round(b.getBoundingClientRect().height)), msg: !!r.querySelector("label[for=dw-msg]") && !!r.querySelector("#dw-msg") }; });
      ok(capt.h === "Show DELA the work, in the way that is easiest for you" && capt.btns.includes("Record my screen") && capt.btns.includes("Import from Scribe") && capt.heights.every((x) => x >= 48) && capt.msg, "the message box opens with large buttons for recording the screen and a Scribe guide (and Talk where the browser has a microphone), and the box to type in has a label: " + JSON.stringify(capt));
      await dela(s.page).locator("#dw-cap-scribe").click();
      await waitFor(s.page, "Read the guide", 15000);
      ok(true, "Import from Scribe opens the Scribe import");
      await click(s.page, "Ask DELA");
      await waitFor(s.page, "Working context", 15000);
      // Stacey 2026-11-23: plain white cards as in the mockups, even gaps, and the right column ends with the note
      const look75 = await s.page.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot, side = [...r.querySelectorAll(".dw-3 > .dw-side > *")], h2 = getComputedStyle(r.querySelector("#aw-using > h2"));
        const gaps = side.slice(1).map((e, i) => Math.round(e.getBoundingClientRect().top - side[i].getBoundingClientRect().bottom));
        return { band: h2.backgroundColor, gaps: gaps, last: side[side.length - 1].className, work: !!r.querySelector("#aw-work") }; });
      ok((look75.band === "rgba(0, 0, 0, 0)" || look75.band === "transparent") && look75.gaps.every((g) => g >= 12 && g <= 20) && look75.last.includes("dw-note") && !look75.work, "the chat page has plain card headings, even gaps in the right column, and the note last: " + JSON.stringify(look75));
      // Fix (Stacey 2026-11-23): on a new chat the message box does not lie over the example
      await s.page.setViewportSize({ width: 1500, height: 520 });
      await s.page.waitForTimeout(200);
      const lap = await s.page.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot, c = r.querySelector(".dw-chat-card .composer").getBoundingClientRect(), e = r.querySelector("#chat-example").getBoundingClientRect(); return { pos: getComputedStyle(r.querySelector(".dw-chat-card .composer")).position, over: c.top < e.bottom && e.top < c.bottom }; });
      ok(lap.pos === "static" && !lap.over, "Fix: on a new chat the message box sits in its own place and covers nothing, also on a short screen: " + JSON.stringify(lap));
      await s.page.setViewportSize({ width: 1500, height: 950 });
      ok(three.ok, "the menu, the chat and the working context sit side by side when the page area is 900 wide or more; narrower, the menu goes on top (page area here: " + three.w + ")");
      await dela(s.page).getByRole("button", { name: /^Select .* for this chat$/ }).first().click();
      await dela(s.page).locator(".dw-ctx.on").first().waitFor({ timeout: 8000 });
      ok((await dela(s.page).locator(".dw-ctx.on").first().innerText()).includes("Selected") && await dela(s.page).getByRole("button", { name: /^Remove .* from this chat$/ }).count() === 1, "a playbook is selected for the chat with one click and marked Selected");
      // Screen 2: My Playbooks
      await click(s.page, "Manage playbooks");
      t = await waitFor(s.page, "Playbook library");
      ok(t.includes("My Playbooks") && t.includes("Selected for DELA") && t.includes("Don't have an approved playbook?") && t.includes("+ Create playbook") && t.includes("View versions & history"), "My Playbooks has the table, what is selected for DELA and the way to start without a playbook");
      await dela(s.page).locator(".dw-table tbody tr").first().waitFor({ timeout: 10000 });
      ok((await dela(s.page).locator(".dw-table thead th").allInnerTexts()).map((x) => x.trim()).join("|") === "Playbook|Owner role|Version|Status|Action", "the table has the mockup's five columns");
      ok((await dela(s.page).locator(".top .where").innerText()).replace(/\s+/g, " ").trim() === "Ask DELA / My Playbooks Library" && s.page.url().includes("ws=playbooks"), "the top bar reads Ask DELA / My Playbooks Library and the page has its own address: " + s.page.url());
      await dela(s.page).getByRole("group", { name: "Show" }).getByRole("button", { name: "Approved", exact: true }).click();
      await s.page.waitForTimeout(300);
      const apTags = (await dela(s.page).locator(".dw-table tbody .dw-tag").allInnerTexts()).map((x) => x.trim());
      ok(apTags.length >= 1 && apTags.every((x) => x === "Approved") && await dela(s.page).getByRole("button", { name: /^Selected for DELA$|^Remove .* from DELA's working context$/ }).count() >= 1, "the Approved filter keeps approved playbooks, and the selected one says so: " + apTags.join(","));
      await dela(s.page).locator("#dw-search").fill("zzzz nothing");
      await waitFor(s.page, "No playbook fits. Try another filter or fewer words.");
      await dela(s.page).locator("#dw-search").fill("");
      await dela(s.page).locator("#dw-chat-about").click();
      t = await waitFor(s.page, "Working context");
      ok(!s.page.url().includes("ws=") && await dela(s.page).locator(".dw-ctx.on").count() === 1, "Chat about this playbook goes back to the chat with the playbook still selected");
      // Screen 5: DELA instructions as its own page
      await dela(s.page).locator("#dw-instr").click();
      t = await waitFor(s.page, "How context is used");
      ok(t.includes("DELA Instructions & Firm Context") && t.includes("Assignment context") && t.includes("Propose a new instruction") && t.includes("Missing or conflicting information") && t.includes("Scope: Firm") && !t.includes("← Back to the chat"), "DELA instructions is a page with four tabs, the scope on each line and the two cards at the right");
      const before75 = (await sql("select count(*)::int n from firm_rules where status = 'proposed'"))[0].n;
      await dela(s.page).locator("#rule-new").fill("Confirm dates with the exact time zone before scheduling.");
      await dela(s.page).locator("#rule-go").click();
      await dela(s.page).locator("#rule-review").waitFor({ timeout: 5000 });
      ok((await dela(s.page).locator("#rule-review").innerText()).includes("Check your proposal before you send it") && (await dela(s.page).locator("#rule-go").innerText()) === "Send proposal" && (await sql("select count(*)::int n from firm_rules where status = 'proposed'"))[0].n === before75, "Review proposed change reads the proposal back and sends nothing yet");
      await dela(s.page).locator("#rule-go").click();
      t = await waitFor(s.page, "Proposed, not in use");
      ok((await sql("select count(*)::int n from firm_rules where status = 'proposed'"))[0].n === before75 + 1, "Send proposal makes one proposal");
      await dela(s.page).locator("#dw-unresolved").click();
      await s.page.waitForTimeout(300);
      ok(await dela(s.page).locator("#rules-filter").inputValue() === "proposed" && await dela(s.page).locator("#rules-card .rule-row").count() === before75 + 1, "View unresolved decisions shows the proposals that wait");
      // The address opens the page directly, and Ask DELA in the top bar goes back to the chat
      await s.page.reload();
      t = await waitFor(s.page, "How context is used", 15000);
      ok(s.page.url().includes("ws=instructions"), "the instructions page opens from its own address");
      await dela(s.page).locator(".top .where .dw-crumb").click();
      await waitFor(s.page, "Working context");
      // Step 75d, screen 10: one queue of what waits, with who resolves it
      await dela(s.page).locator(".dw-nav .dw-item", { hasText: "Decisions & blockers" }).click();
      t = await waitFor(s.page, "Decision queue", 15000);
      await dela(s.page).locator("#dw-queue .dw-qrow").first().waitFor({ timeout: 10000 });
      ok(t.includes("Decisions, Blockers & Work Progress") && s.page.url().includes("ws=decisions") && await dela(s.page).getByRole("group", { name: "Show" }).getByRole("button").count() === 6, "the decision queue is a page with its own address and six filters");
      await dela(s.page).getByRole("group", { name: "Show" }).getByRole("button", { name: /^Needs decision/ }).click();
      await dela(s.page).locator("#dw-queue .dw-qrow", { hasText: "A DELA instruction is proposed" }).first().click();
      t = await text(s.page);
      ok(t.includes("Decision details") && (await dela(s.page).locator("#dw-q-next").innerText()).includes("DELA does not follow it until it is approved.") && t.includes("Authorized resolver") && (await dela(s.page).locator("#dw-q-go").innerText()) === "Open DELA instructions" && t.includes("Event history"), "a proposed instruction waits in the queue with its next step and who resolves it");
      await dela(s.page).locator("#dw-q-go").click();
      await waitFor(s.page, "How context is used");
      ok(await dela(s.page).locator("#rules-filter").inputValue() === "proposed", "the item opens the place where it is resolved");
      await dela(s.page).locator(".top .where .dw-crumb").click();
      await waitFor(s.page, "Working context");
      // Step 75d, screen 7: changes and version approval
      await dela(s.page).locator(".dw-nav .dw-item", { hasText: "Playbook changes" }).click();
      await waitFor(s.page, "Choose a playbook", 15000);
      await dela(s.page).getByRole("button", { name: /^Review changes in / }).first().click();
      t = await waitFor(s.page, "Version states", 15000);
      ok(t.includes("Playbook Changes & Version Approval") && t.includes("Proposed revision ·") && t.includes("Impact review") && t.includes("Existing assignments") && t.includes("Approval authority") && s.page.url().includes("ws=changes") && s.page.url().includes("doc="), "the changes page shows the revision, the impact review and the version states, at its own address");
      ok(t.includes("No proposed changes are waiting.") || await dela(s.page).locator(".dw-sg").count() >= 1, "it lists the proposed changes, or says none wait");
      ok(await dela(s.page).locator("#dw-chg-hist").count() === 1 && t.includes("Approved changes create a new version. Existing work does not silently switch versions."), "it offers the version history and says a new version never replaces work in motion");
      await dela(s.page).locator(".top .where .dw-crumb").click();
      await waitFor(s.page, "Working context");
      await dela(s.page).locator(".dw-nav .dw-item", { hasText: "Gig drafts" }).count() && await dela(s.page).locator(".dw-nav .dw-item", { hasText: "Gig drafts" }).click();
      await s.page.setViewportSize({ width: 390, height: 800 });
      await s.page.waitForTimeout(300);
      ok(await s.page.evaluate(() => document.documentElement.scrollWidth) <= 392, "a workspace page fits a phone screen");
      await s.ctx.close();
    } finally { await sql("update feature_switches set state = 'off' where key in ('new_layout', 'dela_workspace_v2', 'recorder'); select 1"); }

    // ---------- Freelancer ----------
    s = await open(browser, 2202);
    t = await text(s.page);
    ok(!t.includes("Library"), "freelancers have no library tab in Phase 1");
    await s.ctx.close();

    console.log("\n" + passed + " browser checks passed");
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });

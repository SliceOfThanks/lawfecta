// Browser test of Step 2a: Ask DELA with talking, AI settings and own keys, Files, and the admin AI and files tab.
// The real widgets (through PHP), the real api and database, with OpenAI, Claude and storage stand-ins (tests/pw/server.ts).
// Needs: tools/dbtest.sh, then tests/pw/server.ts running on port 8787.   node tests/pw/ai-files-test.js
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

async function open(browser, widget, uid, opts) {
  const ctx = await browser.newContext(opts || { viewport: { width: 1200, height: 900 } });
  // Step 43: the folded sections of "Agreement and work" are open, as with "Open all sections" (the folded page has its own checks in engagements-test.js)
  await ctx.addInitScript((all) => { try { if (all) (localStorage.setItem("dela_eg_all", "1"), localStorage.setItem("dela_pf_all", "1")); else localStorage.removeItem("dela_eg_all"); } catch (e) { /* no storage */ } }, true);
  await ctx.grantPermissions(["microphone"], { origin: BASE });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept());
  await page.route("https://cdn.jsdelivr.net/**", (route) => {
    const u = new URL(route.request().url());
    const rel = u.pathname.split("@")[1].split("/").slice(1).join("/");
    route.fulfill({ path: path.join(ROOT, rel), contentType: "application/javascript" });
  });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto(`${BASE}/page/${widget}?uid=${uid}&plan=`);
  await text(page);
  return { ctx, page };
}
async function text(page) {
  await page.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela").textContent.length > 20; });
  await page.waitForTimeout(200);
  return page.evaluate(() => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText);
}
const dela = (page) => page.locator(".dela-host");
async function waitFor(page, words, ms) {
  const end = Date.now() + (ms || 8000);
  let t = "";
  while (Date.now() < end) { t = await text(page); if (t.includes(words)) return t; await page.waitForTimeout(250); }
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(0, 1500));
}

// A member made in the database, on the access list, with a DELA plan
async function makeMember(bd, side, plan, staff) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, 'Test ${side} ${bd}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side((select id from people where bd_member_id = ${bd}), '${side}', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and revoked_at is null and channel = 'access');
    ${staff ? `insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = ${bd} and not exists (select 1 from staff_roles s where s.person_id = people.id and s.revoked_at is null);` : ""}
    select 1`);
}

const MEMBER_OPENAI = "sk-proj-member-browser-test-key-1111111111"; // rules-ok: made-up test key
const MEMBER_CLAUDE = "sk-ant-member-browser-test-key-2222222222"; // rules-ok: made-up test key

// Fix (GitHub run where the test microphone started slowly): wait until the page has been listening for 2 seconds,
// not a fixed pause, so a slow start never gives an empty recording
async function listened(page, secs) {
  await page.waitForFunction((n) => { const m = /Listening\.\.\. (\d+)s/.exec(document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText); return !!m && Number(m[1]) >= n; }, secs, { timeout: 20000 });
}
(async () => {
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  try {
    await sql("update feature_switches set state = 'off' where key in ('byok', 'ai_generation', 'voice_input', 'file_uploads')");
    await makeMember(2100, "attorney", "att_free");
    await makeMember(2101, "freelancer", "fl_plus");
    await makeMember(2102, "attorney", "att_pro", true);

    // ---------- Switches off: nothing new shows ----------
    let s = await open(browser, "DELA-App", 2100);
    let t = await text(s.page);
    ok(!t.includes("Ask DELA") && !t.includes("Files"), "with the switches off, members see no AI chat or Files tab");
    await s.ctx.close();
    await sql("update feature_switches set state = 'everyone' where key in ('byok', 'ai_generation', 'voice_input', 'file_uploads')");

    // ---------- Attorney: Files ----------
    s = await open(browser, "DELA-App", 2100);
    const p = s.page;
    t = await text(p);
    ok(t.includes("Ask DELA to plan a task"), "Home offers Ask DELA");
    // Step 63: Home asks once about an own AI account; "No" is remembered
    ok(t.includes("Do you already use ChatGPT or Claude?") && t.includes("Yes, ChatGPT") && t.includes("Yes, Claude"), "step 63: Home asks whether the member already uses ChatGPT or Claude");
    await dela(p).locator("#key-ask-none").click();
    t = await waitFor(p, "DELA uses Lawfecta's AI. You can add your own key any time in Settings.");
    ok(!t.includes("Do you already use ChatGPT or Claude?"), "step 63: after No, the question is gone and DELA says where to add a key later");
    await p.reload();
    t = await text(p);
    ok(!t.includes("Do you already use ChatGPT or Claude?"), "step 63: the answer is remembered after a reload");
    ok(!t.includes("DELA is for operations work"), "Home has no client information banner (Stacey 2026-11-05)");
    await dela(p).getByRole("button", { name: "Files" }).first().click();
    t = await waitFor(p, "Add files");
    ok(t.includes("of 1000 MB used") || t.includes("of 1024 MB used") || t.includes("of 1 GB used"), "the storage bar shows Attorney Free's 1 GB (step 9b)");
    ok(!t.includes("DELA is for operations work") && t.includes("These files have no sensitive data (no SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords)."), "Files has no banner, and keeps the reminder and tick box at the upload");
    // Fix (AI review 0.9.0, privacy 3): the reminder names the six kinds of sensitive data (Stacey 2026-11-05), not client names
    ok(t.includes("Never enter sensitive data: SSNs or ITINs") && t.includes("Share a link from your own storage instead.") && !t.includes("[Case Number]"), "the reminder names the sensitive data kinds and says to share a link");
    ok(t.includes("Never enter sensitive data"), "the sensitive data notice shows where people upload");

    const input = dela(p).locator("input[type=file]").first();
    await input.setInputFiles({ name: "Intake steps.txt", mimeType: "text/plain", buffer: Buffer.from("Step 1. Open the intake form.\nStep 2. Run the conflict check.") });
    ok(await dela(p).locator('input[type=file]:not([aria-label])').count() === 0, "screen readers: the file box on the Files page has a name");
    await dela(p).getByRole("button", { name: "Upload" }).click();
    await p.waitForTimeout(400);
    t = await text(p);
    ok(!t.includes("Intake steps.txt: ready"), "without the tick box, nothing uploads");
    await dela(p).locator("#dela-no-client").check();
    await dela(p).getByRole("button", { name: "Upload" }).click();
    await waitFor(p, "Intake steps.txt");
    t = await waitFor(p, "Ready");
    ok(t.includes("Intake steps.txt") && t.includes("Ready"), "a process document uploads, passes the check, and is ready");

    await dela(p).locator("#dela-no-client").check();
    await dela(p).locator("input[type=file]").first().setInputFiles([
      { name: "Roe notes.txt", mimeType: "text/plain", buffer: Buffer.from("Call Jane Roe about the filing.") },
      { name: "invoice.pdf", mimeType: "application/pdf", buffer: Buffer.concat([Buffer.from("MZ"), Buffer.alloc(300)]) },
    ]);
    await dela(p).getByRole("button", { name: "Upload" }).click();
    t = await waitFor(p, "Needs your check");
    t = await waitFor(p, "Not accepted");
    ok(t.includes("may contain a client's name") || t.includes("may contain client name"), "a file with client information is held, with the reason in plain words");
    ok(t.includes("not really the type its name says"), "a program renamed to .pdf is not accepted");
    await p.screenshot({ path: path.join(SHOTS, "2a-files.png"), fullPage: true });
    await dela(p).getByRole("button", { name: "It has no client information" }).click();
    await p.waitForTimeout(800);
    t = await text(p);
    ok(!t.includes("Needs your check"), "the member confirms the held file and it becomes ready");

    // ---------- Attorney: Ask DELA with a file ----------
    await dela(p).getByRole("row", { name: /Intake steps\.txt/ }).getByRole("button", { name: "Ask DELA" }).click();
    t = await waitFor(p, "Send");
    ok(t.includes("Intake steps.txt"), "Ask DELA from a file attaches it");
    await dela(p).getByRole("button", { name: "Use this example", exact: true }).click();
    ok((await dela(p).getByLabel("Your message").inputValue()).startsWith("Turn my notes on opening a new matter"), "a new chat starts with the message box and an example to use (UX review A01)");
    await dela(p).getByLabel("Your message").fill("Turn this into a playbook");
    await dela(p).getByRole("button", { name: "Send", exact: true }).click();
    t = await waitFor(p, "I read your file");
    ok(t.includes("Answered with Lawfecta's AI"), "the answer says it used Lawfecta's AI");

    // Client information warning
    await dela(p).getByLabel("Your message").fill("My client John Smith, DOB 01/02/1980, needs the motion filed");
    await dela(p).getByRole("button", { name: "Send", exact: true }).click();
    t = await waitFor(p, "may include");
    ok(t.includes("a client's name") && t.includes("[Client Name]"), "a message with client details is caught before it is sent");
    await p.screenshot({ path: path.join(SHOTS, "2a-chat-warning.png"), fullPage: true });
    await dela(p).getByRole("button", { name: "Send anyway, it has no client information" }).click();
    await waitFor(p, "Here is a checklist");
    ok(true, "the member can still send after confirming");

    // Fix (step 9c): with client_details_allowed on, client details get the AI reminder with "Continue", and sensitive
    // data is stopped with no way to send it anyway
    await sql("update feature_switches set state = 'everyone' where key = 'client_details_allowed'; select 1");
    await dela(p).getByRole("button", { name: "New chat" }).click();
    await dela(p).getByLabel("Your message").fill("My client John Smith, case no. 2024-CV-1234, needs an intake checklist");
    await dela(p).getByRole("button", { name: "Send", exact: true }).click();
    t = await waitFor(p, "They go to OpenAI");
    ok(!t.includes("[Client Name]"), "the reminder no longer asks for placeholders");
    await dela(p).getByRole("button", { name: "Continue", exact: true }).click();
    await waitFor(p, "Here is a checklist");
    ok(true, "client details go after Continue");
    // Fix (AI review 0.10.0, security 1 and privacy 1): "Continue" is remembered for this conversation only, and only for
    // the client-details reminder. A health word still gets its reminder, and a new chat asks again.
    const answers = () => dela(p).getByText("Here is a checklist").count();
    const before = await answers();
    await dela(p).getByLabel("Your message").fill("Also add a step for Jane Roe, case no. 2024-CV-9999");
    await dela(p).getByRole("button", { name: "Send", exact: true }).click();
    await p.waitForFunction((n) => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText.split("Here is a checklist").length - 1 > n, before, { timeout: 10000 });
    ok(!(await text(p)).includes("They go to OpenAI"), "in the same conversation, client details are not asked about again");
    await dela(p).getByLabel("Your message").fill("Summarize the diagnosis in the medical records");
    await dela(p).getByRole("button", { name: "Send", exact: true }).click();
    t = await waitFor(p, "health information");
    ok(await dela(p).getByRole("button", { name: "Edit my message" }).count() === 1, "a health word still gets its reminder after Continue");
    await dela(p).getByRole("button", { name: "Edit my message" }).click();
    await dela(p).getByRole("button", { name: "New chat" }).click();
    await dela(p).getByLabel("Your message").fill("My client Mary Major, case no. 2025-CV-0001, needs a checklist");
    await dela(p).getByRole("button", { name: "Send", exact: true }).click();
    t = await waitFor(p, "They go to OpenAI");
    ok(true, "a new chat asks again");
    await dela(p).getByRole("button", { name: "Continue", exact: true }).click();
    await waitFor(p, "Here is a checklist");
    await dela(p).getByLabel("Your message").fill("Her passport number is X12345678");
    await dela(p).getByRole("button", { name: "Send", exact: true }).click();
    t = await waitFor(p, "a government ID number");
    ok(t.includes("share a link") && await dela(p).getByRole("button", { name: /Send anyway|Continue/ }).count() === 0, "sensitive data is stopped, with no way to send it anyway");
    await sql("update feature_switches set state = 'off' where key = 'client_details_allowed'; select 1");

    // Talking: the fake microphone records, the words land in the box
    await dela(p).getByRole("button", { name: "● Talk" }).click();
    await listened(p, 2);
    await dela(p).getByRole("button", { name: "■ Stop" }).click();
    await p.waitForFunction(() => document.querySelector(".dela-host").shadowRoot.querySelector("textarea").value.includes("filing a motion"), null, { timeout: 8000 });
    ok(true, "talking puts the words in the message box to check before sending");
    await p.screenshot({ path: path.join(SHOTS, "2a-chat.png"), fullPage: true });

    // ---------- Attorney: own OpenAI key ----------
    await dela(p).getByRole("button", { name: "AI settings" }).click();
    t = await waitFor(p, "Which AI DELA uses");
    ok(t.includes("Use Lawfecta's AI") && t.includes("DELA actions left this month") && t.includes("DELA actions reset on the 1st of each month") && !t.includes("credits"), "AI settings show the included DELA actions and when they reset, one word for the allowance (step 8b Part C)");
    ok(!t.includes("Save and test") && t.includes("choose \"Use my own key\" above"), "key setup stays hidden until Use my own key is chosen (UX review AI01)");
    // Step 63: the steps to get a key open from Settings too
    await dela(p).locator("#key-guide-open").click();
    t = await waitFor(p, "Get your OpenAI (ChatGPT) key");
    ok(t.includes("Create new secret key") && t.includes("does not include this") && await dela(p).locator('#key-guide-steps li').count() === 5, "step 63: the OpenAI steps say where to click and that a ChatGPT subscription does not include the key");
    ok(await dela(p).locator('#key-guide a[href^="https://platform.openai.com"][target="_blank"]').count() >= 2, "step 63: each link goes to OpenAI and opens in a new tab");
    await dela(p).locator("#key-guide-close").click();
    await p.waitForTimeout(400);
    ok(!(await text(p)).includes("Get your OpenAI (ChatGPT) key"), "step 63: the steps close");
    await dela(p).getByText("Use my own key", { exact: true }).click();
    await waitFor(p, "Your own key");
    await dela(p).getByPlaceholder("Paste your key").first().fill(MEMBER_CLAUDE);
    await dela(p).getByRole("button", { name: "Save and test" }).first().click();
    t = await waitFor(p, "That looks like a Claude key");
    ok(true, "a Claude key pasted under OpenAI is caught");
    await dela(p).getByPlaceholder("Paste your key").first().fill(MEMBER_OPENAI.slice(0, -3) + "bad");
    await dela(p).getByRole("button", { name: "Save and test" }).first().click();
    t = await waitFor(p, "did not work");
    ok(t.includes("It was not saved"), "a key the provider refuses is not saved");
    await dela(p).getByPlaceholder("Paste your key").first().fill(MEMBER_OPENAI);
    await dela(p).getByRole("button", { name: "Save and test" }).first().click();
    t = await waitFor(p, "ending " + MEMBER_OPENAI.slice(-4));
    ok(!t.includes(MEMBER_OPENAI), "after saving, only the last 4 characters show");
    ok((await p.content()).indexOf(MEMBER_OPENAI) < 0, "the key is nowhere in the page");
    await p.screenshot({ path: path.join(SHOTS, "2a-ai-settings.png"), fullPage: true });

    await dela(p).getByRole("button", { name: "Ask DELA" }).first().click();
    t = await waitFor(p, "Using your OpenAI key ending");
    ok(t.includes("DELA is for operations work"), "Ask DELA still shows the client information banner where people type");
    // Stacey's notice mockup of 2026-11-17: pale blue, an even border with no stripe at the left, a soft shadow, an
    // info icon, and an X that dismisses it. A link stays in its place, so the guidance can always be read again.
    const look = await p.evaluate(() => { const n = document.querySelector(".dela-host").shadowRoot.querySelector(".notice.info"); const c = getComputedStyle(n); const x = n.querySelector(".notice-x").getBoundingClientRect(); const w = n.querySelector(".notice-words").getBoundingClientRect();
      return { bg: c.backgroundColor, left: c.borderLeftWidth + " " + c.borderLeftColor, top: c.borderTopWidth + " " + c.borderTopColor, color: c.color, radius: c.borderRadius, shadow: c.boxShadow, xw: Math.round(x.width), xh: Math.round(x.height), over: w.right > x.left + 1, role: n.getAttribute("role") }; });
    ok(look.bg === "rgb(234, 244, 255)" && look.left === "1px rgb(184, 216, 248)" && look.top === look.left && look.color === "rgb(23, 43, 77)" && look.radius === "12px" && look.shadow.includes("2px 8px"), "the notice is the blue one, with the same thin border on every side: " + JSON.stringify(look));
    ok(look.xw >= 44 && look.xh >= 44 && !look.over && look.role === "note", "the X is at least 44 by 44, never over the words, and the notice is not an alert: " + JSON.stringify(look));
    const xBtn = dela(p).getByRole("button", { name: "Dismiss notice", exact: true });
    await xBtn.focus();
    await p.keyboard.press("Enter");
    t = await text(p);
    ok(!t.includes("DELA is for operations work") && t.includes("Show the sensitive data notice") && await p.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; return r.activeElement && r.activeElement.classList.contains("notice-back"); }), "Enter on the X hides the notice, leaves a link to bring it back, and puts the keyboard on that link");
    ok(await dela(p).getByLabel("Your message").isVisible(), "dismissing leaves the page where it was");
    await dela(p).getByRole("button", { name: "Show the sensitive data notice", exact: true }).click();
    t = await text(p);
    ok(t.includes("DELA is for operations work") && await dela(p).getByRole("button", { name: "Dismiss notice", exact: true }).count() === 1, "the link brings the notice back");
    await p.screenshot({ path: path.join(SHOTS, "notice-blue.png"), fullPage: true });
    // The dismissal is remembered in this browser: the notice does not come back by itself on the next visit
    const stored = await p.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; r.querySelector(".notice-x").click(); return localStorage.getItem("dela.notice.sensitive"); });
    ok(typeof stored === "string" && stored.length > 4 && !(await text(p)).includes("DELA is for operations work"), "the dismissal is remembered in this browser");
    await dela(p).getByRole("button", { name: "Show the sensitive data notice", exact: true }).click();
    ok(await p.evaluate(() => localStorage.getItem("dela.notice.sensitive")) === null, "bringing it back clears the remembered dismissal");
    await dela(p).getByLabel("Your message").fill("Plan my filing day");
    await dela(p).getByRole("button", { name: "Send", exact: true }).click();
    t = await waitFor(p, "your key)");
    ok(t.includes("Answered with your own key"), "with a key saved, answers run on the member's own key");

    // Phone size
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForTimeout(300);
    const wide = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(wide <= 392, "the chat fits a phone screen");
    await p.screenshot({ path: path.join(SHOTS, "2a-chat-phone.png"), fullPage: false });
    await p.setViewportSize({ width: 1200, height: 900 });

    await dela(p).getByRole("button", { name: "AI settings" }).click();
    await waitFor(p, "Your own key");
    await dela(p).getByRole("button", { name: "Remove" }).first().click();
    t = await waitFor(p, "choose \"Use my own key\" above");
    ok(true, "the member removes the key and is back on Lawfecta's AI");
    await s.ctx.close();

    // ---------- Freelancer: Claude key, no Files ----------
    s = await open(browser, "DELA-App", 2101);
    t = await text(s.page);
    ok(t.includes("Ask DELA") && !t.includes("Files"), "freelancers get Ask DELA but no Files tab yet");
    // Step 63: the freelancer answers "Yes, Claude" on Home and is taken to the steps, with the box to paste the key
    ok(t.includes("Do you already use ChatGPT or Claude?"), "step 63: a freelancer is asked too");
    await dela(s.page).locator("#key-ask-anthropic").click();
    t = await waitFor(s.page, "Get your Claude (Anthropic) key");
    ok(t.includes("Which AI DELA uses") && t.includes("Create Key") && t.includes("does not include this") && t.includes("Never send your key to anyone"), "step 63: Yes, Claude opens Settings with the Claude steps");
    ok(await dela(s.page).locator('#key-guide a[href^="https://console.anthropic.com"][target="_blank"]').count() >= 2, "step 63: each link goes to the Claude Console and opens in a new tab");
    ok(await dela(s.page).locator("#key-guide").getByLabel("Provider").inputValue() === "anthropic", "step 63: the provider is already set to Claude");
    await dela(s.page).locator("#key-guide").getByPlaceholder("Paste your key").fill(MEMBER_CLAUDE);
    await dela(s.page).locator("#key-guide").getByRole("button", { name: "Save and test" }).click();
    t = await waitFor(s.page, "ending " + MEMBER_CLAUDE.slice(-4));
    ok(t.includes("Claude"), "a freelancer adds a Claude key");
    ok(!t.includes("Get your Claude (Anthropic) key"), "step 63: the steps close once the key is saved");
    await dela(s.page).getByRole("button", { name: "Ask DELA" }).first().click();
    await waitFor(s.page, "Using your Claude key");
    await dela(s.page).getByLabel("Your message").fill("Help me plan my week");
    await dela(s.page).getByRole("button", { name: "Send", exact: true }).click();
    await waitFor(s.page, "Claude here");
    ok(true, "the freelancer's chat runs on their Claude key");
    await dela(s.page).getByRole("button", { name: "● Talk" }).click();
    await listened(s.page, 2);
    await dela(s.page).getByRole("button", { name: "■ Stop" }).click();
    t = await waitFor(s.page, "Lawfecta's speech to text was used");
    ok(true, "talking on a Claude key says Lawfecta's speech to text was used");
    await s.ctx.close();

    // ---------- Step 62: the Members page inside DELA, for the Lawfecta Team ----------
    await makeMember(2103, "attorney", "att_free");
    s = await open(browser, "DELA-App", 2100);
    ok(await dela(s.page).getByRole("button", { name: "Members", exact: true }).count() === 0, "step 62: a member has no Members page");
    await s.page.goto(`${BASE}/page/DELA-App?uid=2100&plan=&tab=members`);
    t = await text(s.page);
    ok(!t.includes("Everyone who has opened DELA"), "step 62: a member who types the address gets Home, not the Members page");
    await s.ctx.close();
    s = await open(browser, "DELA-App", 2102);
    await dela(s.page).getByRole("button", { name: "Members", exact: true }).first().click();
    t = await waitFor(s.page, "Everyone who has opened DELA");
    ok(t.includes("Test attorney 2100") && t.includes("Test freelancer 2101") && t.includes("most recently seen first"), "step 62: the Lawfecta Team sees the members with a count");
    await dela(s.page).locator("#mem-q").fill("2103");
    await dela(s.page).locator("#mem-search").click();
    t = await waitFor(s.page, "Showing 1 to 1 of 1");
    ok(t.includes("Test attorney 2103") && !t.includes("Test attorney 2100"), "step 62: search by member ID finds one person");
    await dela(s.page).getByRole("button", { name: "Open Test attorney 2103" }).click();
    t = await waitFor(s.page, "Workspaces and plans");
    ok(t.includes("Account") && t.includes("Access to DELA") && t.includes("On the access list since") && t.includes("Holds") && t.includes("Close this DELA account"), "step 62: one member shows the account, plans, access, holds and closing");
    await dela(s.page).locator("#mem-plan").selectOption({ label: "Attorney: Attorney Plus" }).catch(() => dela(s.page).locator("#mem-plan").selectOption({ index: 2 }));
    await dela(s.page).locator("#mem-plan-give").click();
    t = await waitFor(s.page, "Gave a workspace and plan");
    ok(t.includes("(set by the Team)"), "step 62: a plan given by the owner shows as set by the Team, and the action is in the history");
    await dela(s.page).locator("#mem-hold-why").fill("Checking a payment question");
    await dela(s.page).locator("#mem-hold-place").click();
    t = await waitFor(s.page, "Placed a hold");
    ok(t.includes("Checking a payment question") && t.includes("On hold"), "step 62: a hold is placed with its reason");
    await dela(s.page).locator("#mem-close-go").click();
    await waitFor(s.page, "Write the reason first");
    await dela(s.page).locator("#mem-close-why").fill("Asked to leave the pilot");
    await dela(s.page).locator("#mem-close-go").click();
    t = await waitFor(s.page, "This DELA account is closed");
    ok(t.includes("Nothing was deleted") && t.includes("Closed the account") && t.includes("Reason: Asked to leave the pilot"), "step 62: closing needs a reason, keeps everything and is in the history");
    await s.page.screenshot({ path: path.join(SHOTS, "62-member.png"), fullPage: true });
    const shut = await open(browser, "DELA-App", 2103).catch((e) => ({ err: e }));
    const shutText = shut.err ? "" : await text(shut.page);
    ok(shut.err || !shutText.includes("Ask DELA to plan a task"), "step 62: a closed account cannot open DELA");
    if (!shut.err) await shut.ctx.close();
    await dela(s.page).locator("#mem-reopen").click();
    t = await waitFor(s.page, "Reopened the account");
    ok(t.includes("Close this DELA account"), "step 62: the owner reopens the account");
    await dela(s.page).locator("#mem-back").click();
    await waitFor(s.page, "Everyone who has opened DELA");
    await dela(s.page).locator("#mem-filter").selectOption("hold");
    t = await waitFor(s.page, "Showing 1 to 1 of 1");
    ok(t.includes("Test attorney 2103"), "step 62: the On hold filter finds the member");
    await s.ctx.close();

    // ---------- Admin: AI and files ----------
    s = await open(browser, "DELA-Admin", 2102);
    await dela(s.page).getByRole("tab", { name: "AI and files" }).click();
    t = await waitFor(s.page, "AI use this month");
    ok(t.includes("Members' own keys") && t.includes("Claude") && t.includes("Roe notes.txt") === false, "admin sees keys and use; a confirmed file is no longer listed as held");
    ok(t.includes("invoice.pdf") && t.includes("Not really the type its name says"), "admin sees files that were not accepted, with the reason");
    ok(!(await s.page.content()).includes(MEMBER_CLAUDE), "admin never sees a member's key");
    await s.page.screenshot({ path: path.join(SHOTS, "2a-admin-ai-files.png"), fullPage: true });
    await s.ctx.close();

    console.log("\n" + passed + " browser checks passed");
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });

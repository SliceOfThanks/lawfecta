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
    ok(!t.includes("DELA is for operations work"), "Home has no client information banner (Stacey 2026-11-05)");
    await dela(p).getByRole("button", { name: "Files" }).first().click();
    t = await waitFor(p, "Add files");
    ok(t.includes("of 250 MB used"), "the storage bar shows the Free plan's 250 MB");
    ok(!t.includes("DELA is for operations work") && t.includes("These files have no confidential client information"), "Files has no banner, and keeps the reminder and tick box at the upload");
    ok(t.includes("Do not enter confidential client information") || t.includes("confidential client information"), "the confidential information notice shows where people upload");

    const input = dela(p).locator("input[type=file]").first();
    await input.setInputFiles({ name: "Intake steps.txt", mimeType: "text/plain", buffer: Buffer.from("Step 1. Open the intake form.\nStep 2. Run the conflict check.") });
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

    // Talking: the fake microphone records, the words land in the box
    await dela(p).getByRole("button", { name: "● Talk" }).click();
    await p.waitForTimeout(1800);
    await dela(p).getByRole("button", { name: "■ Stop" }).click();
    await p.waitForFunction(() => document.querySelector(".dela-host").shadowRoot.querySelector("textarea").value.includes("filing a motion"), null, { timeout: 8000 });
    ok(true, "talking puts the words in the message box to check before sending");
    await p.screenshot({ path: path.join(SHOTS, "2a-chat.png"), fullPage: true });

    // ---------- Attorney: own OpenAI key ----------
    await dela(p).getByRole("button", { name: "AI settings" }).click();
    t = await waitFor(p, "Which AI DELA uses");
    ok(t.includes("Use Lawfecta's AI") && t.includes("credits left this month"), "AI settings show the included credits");
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
    t = await waitFor(p, "Save and test");
    ok(true, "the member removes the key and is back on Lawfecta's AI");
    await s.ctx.close();

    // ---------- Freelancer: Claude key, no Files ----------
    s = await open(browser, "DELA-App", 2101);
    t = await text(s.page);
    ok(t.includes("Ask DELA") && !t.includes("Files"), "freelancers get Ask DELA but no Files tab yet");
    await dela(s.page).getByRole("button", { name: "Ask DELA" }).first().click();
    await waitFor(s.page, "AI settings");
    await dela(s.page).getByRole("button", { name: "AI settings" }).click();
    await waitFor(s.page, "Your own key");
    await dela(s.page).getByLabel("Provider").first().selectOption("anthropic");
    await dela(s.page).getByPlaceholder("Paste your key").first().fill(MEMBER_CLAUDE);
    await dela(s.page).getByRole("button", { name: "Save and test" }).first().click();
    t = await waitFor(s.page, "ending " + MEMBER_CLAUDE.slice(-4));
    ok(t.includes("Claude"), "a freelancer adds a Claude key");
    await dela(s.page).getByRole("button", { name: "Ask DELA" }).first().click();
    await waitFor(s.page, "Using your Claude key");
    await dela(s.page).getByLabel("Your message").fill("Help me plan my week");
    await dela(s.page).getByRole("button", { name: "Send", exact: true }).click();
    await waitFor(s.page, "Claude here");
    ok(true, "the freelancer's chat runs on their Claude key");
    await dela(s.page).getByRole("button", { name: "● Talk" }).click();
    await s.page.waitForTimeout(1500);
    await dela(s.page).getByRole("button", { name: "■ Stop" }).click();
    t = await waitFor(s.page, "Lawfecta's speech to text was used");
    ok(true, "talking on a Claude key says Lawfecta's speech to text was used");
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

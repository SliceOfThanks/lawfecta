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
    let t = await waitFor(p, "Playbook library");
    ok(t.includes("0 playbooks (no cap on your plan)"), "the library opens with the count and the plan's cap");
    await click(p, "New playbook");
    await dela(p).getByLabel("Describe the task").fill("When a new family law client signs, we run a conflict check, send the engagement letter and open the file.");
    await click(p, "Draft it with DELA");
    t = await waitFor(p, "DELA's questions");
    ok(t.includes("Who signs the engagement letter?") && t.includes("Still missing"), "DELA drafts the playbook and asks for what is missing");
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
    await dela(p).getByLabel("Message about this playbook").fill("Who runs the conflict check?");
    await click(p, "Send");
    await waitFor(p, "The paralegal runs the conflict check");
    ok(true, "chat answers a question about the playbook");
    await dela(p).getByLabel("Message about this playbook").fill("Please add a step to send the welcome email");
    await click(p, "Send");
    t = await waitFor(p, "Suggestions (1)");
    ok(t.includes("waiting on the Suggestions view"), "a requested change becomes a suggestion");
    await tab(p, "Suggestions (1)");
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
    await waitFor(p, "Suggestions (1)");
    await tab(p, "Suggestions (1)");
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
    await click(p, "Close");

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
    await click(p, "Build my playbook");
    t = await waitFor(p, "File a motion", 10000);
    await waitFor(p, "Complete: 100%");
    t = await text(p);
    ok(t.includes("Screenshot"), "the built playbook keeps the screenshots with their steps");
    const src = await sql("select source from playbooks where title = 'File a motion'");
    ok(src[0] && src[0].source === "scribe", "the playbook records it came from Scribe");
    await s.ctx.close();

    // ---------- Editor in the firm's library ----------
    s = await open(browser, 2201);
    await click(s.page, "Library");
    await waitFor(s.page, "Playbook library");
    await dela(s.page).getByLabel("Library").selectOption({ index: 1 });
    t = await waitFor(s.page, "New client intake");
    ok(t.includes("Your role: Editor"), "the editor opens the firm's library from the picker");
    ok(!t.includes("Team"), "only the administrator manages the team");
    await dela(s.page).getByText("New client intake").first().click();
    await waitFor(s.page, "Complete:");
    t = await text(s.page);
    ok((await dela(s.page).getByRole("button", { name: "Approve", exact: true }).count()) === 0 && t.includes("Send for review"), "an editor can send for review but not approve");
    await s.ctx.close();

    // Phone
    s = await open(browser, 2200, { width: 390, height: 844 });
    await click(s.page, "Library");
    await waitFor(s.page, "Playbook library");
    ok(await s.page.evaluate(() => document.documentElement.scrollWidth) <= 392, "the library fits a phone screen");
    await s.page.screenshot({ path: path.join(SHOTS, "2-library-phone.png") });
    await s.ctx.close();

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

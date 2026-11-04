// Browser test of the Process Recorder: record (a moving test picture stands in for the screen, with the browser's fake
// microphone), pieces and screenshots upload, Stop and save, the worker analyzes, the review screen with the transcript,
// Build my playbook, download and delete the video, and the message on phones. Real widgets, api and database.
// Needs tools/dbtest.sh, then tests/pw/server.ts on port 8787.   node tests/pw/recorder-test.js
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://127.0.0.1:8787";
const ROOT = path.join(__dirname, "..", "..");
const SHOTS = process.env.SHOTS || path.join(ROOT, "shots");
const WORKER = "browser-worker-secret-0123456789abcdef";
fs.mkdirSync(SHOTS, { recursive: true });
let passed = 0;
function ok(cond, msg) { if (!cond) throw new Error("FAILED: " + msg); passed++; console.log("ok", msg); }
async function sql(q) { const r = await fetch(BASE + "/test/sql", { method: "POST", body: JSON.stringify({ sql: q }) }); return (await r.json()).rows; }
async function worker(n) { for (let i = 0; i < n; i++) { await sql("update jobs set run_at = now() where status in ('queued', 'delayed')"); await fetch(BASE + "/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }); } }

// The screen: a canvas that changes every second, reported as a whole monitor
const FAKE_SCREEN = () => {
  navigator.mediaDevices.getDisplayMedia = async () => {
    const c = document.createElement("canvas"); c.width = 640; c.height = 360;
    const g = c.getContext("2d");
    let n = 0;
    setInterval(() => { n++; g.fillStyle = ["#1d2030", "#8b2146", "#0d83dd", "#2f7a4f"][n % 4]; g.fillRect(0, 0, 640, 360); g.fillStyle = "#fff"; g.font = "40px sans-serif"; g.fillText("Screen " + n, 40, 120); }, 700);
    const stream = c.captureStream(5);
    const t = stream.getVideoTracks()[0];
    const real = t.getSettings.bind(t);
    t.getSettings = () => Object.assign(real(), { displaySurface: window.__surface || "monitor" });
    return stream;
  };
};

async function open(browser, uid, opts) {
  const o = Object.assign({}, opts || {});
  delete o.startTab;
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1200, height: 900 }, acceptDownloads: true, permissions: ["microphone"] }, o));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept());
  await page.addInitScript(FAKE_SCREEN);
  await page.route("https://cdn.jsdelivr.net/**", (route) => {
    const u = new URL(route.request().url());
    route.fulfill({ path: path.join(ROOT, u.pathname.split("@")[1].split("/").slice(1).join("/")), contentType: "application/javascript" });
  });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto(`${BASE}/page/DELA-App?uid=${uid}&plan=` + (opts && opts.startTab ? "&tab=" + opts.startTab : ""));
  await text(page);
  return { ctx, page };
}
async function text(page) {
  await page.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela").textContent.length > 20; });
  await page.waitForTimeout(150);
  return page.evaluate(() => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText);
}
const dela = (page) => page.locator(".dela-host");
const click = (page, name) => dela(page).getByRole("button", { name: name, exact: true }).first().click();
async function waitFor(page, words, ms) {
  const end = Date.now() + (ms || 10000);
  let t = "";
  while (Date.now() < end) { t = await text(page); if (t.includes(words)) return t; await page.waitForTimeout(250); }
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(0, 2000));
}

(async () => {
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  try {
    await sql(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$;
      update feature_switches set state = 'everyone' where key in ('ai_generation', 'playbook_library', 'file_uploads', 'recorder');
      update settings set value = '1' where key in ('recorder.chunk_seconds', 'recorder.frame_seconds');
      insert into people (bd_member_id, display_name, email) values (2300, 'Rec Attorney', 'rec@test.invalid') on conflict do nothing;
      select dela_ensure_side((select id from people where bd_member_id = 2300), 'attorney', 'att_pro', 'staff_grant');
      insert into access_list (bd_member_id, channel) values (2300, 'access'); select 1`);

    let s = await open(browser, 2300);
    const p = s.page;
    await click(p, "Library");
    await waitFor(p, "Recordings");
    await click(p, "Record a process");
    let t = await waitFor(p, "Record a process");
    ok(t.includes("Your plan allows recordings up to 45 minutes") && t.includes("Before you start"), "the Record a Process page shows the plan's length and the tips");
    ok(await dela(p).getByRole("button", { name: "Start recording" }).isDisabled(), "Start recording waits for the consent tick");

    // Window instead of the whole screen
    await p.evaluate(() => { window.__surface = "window"; });
    await dela(p).getByLabel("Process name").fill("File a motion");
    await dela(p).locator("#dela-rec-consent").check();
    await click(p, "Start recording");
    await waitFor(p, "DELA needs your entire screen");
    ok(true, "choosing a window instead of the whole screen is refused with the plain message");

    await p.evaluate(() => { window.__surface = "monitor"; });
    await click(p, "Start recording");
    t = await waitFor(p, "Recording: File a motion");
    ok(t.includes("Stop and save"), "recording starts with the controls");
    await p.waitForTimeout(1500);
    await click(p, "Pause");
    await waitFor(p, "(paused)");
    ok(true, "pause shows on the timer");
    await click(p, "Resume");
    await p.waitForTimeout(3500);
    await click(p, "Stop and save");
    t = await waitFor(p, "We'll email you when your recording is ready", 15000);
    await waitFor(p, "Back to the library");
    const r = (await sql("select id, status, duration_seconds from recordings where title = 'File a motion'"))[0];
    ok(r && (r.status === "analyzing" || r.status === "uploading"), "Stop and save hands the recording over for analysis");
    const parts = await sql(`select kind, count(*)::int n from recording_parts where recording_id = '${r.id}' and uploaded_at is not null group by kind`);
    ok(parts.some((x) => x.kind === "video" && x.n >= 3) && parts.some((x) => x.kind === "audio" && x.n >= 1), "video pieces and the speech part uploaded");
    const shots = await sql(`select count(*)::int n from recording_frames where recording_id = '${r.id}'`);
    ok(shots[0].n >= 2, "screenshots were taken when the screen changed");
    ok((await sql("select count(*)::int n from consents where kind = 'screen_recording'"))[0].n >= 1, "the consent was saved");

    await worker(4);
    await click(p, "Back to the library");
    t = await waitFor(p, "Ready for review", 15000);
    await p.screenshot({ path: path.join(SHOTS, "rec-list.png"), fullPage: true });
    await click(p, "Review");
    t = await waitFor(p, "Review your recording");
    ok(t.includes("What you said") && t.includes("Mark as private"), "the review screen shows the transcript with Mark as private");
    const vals = await p.evaluate(() => [...document.querySelector(".dela-host").shadowRoot.querySelectorAll("textarea[aria-label^='Step ']")].map((x) => x.value));
    ok(vals[0].includes("save it as a PDF"), "Stage 1's draft steps are on the review screen");
    ok(t.includes("You may want to add these"), "extra screenshots are offered");
    await p.screenshot({ path: path.join(SHOTS, "rec-review.png"), fullPage: true });
    await click(p, "Build my playbook");
    await waitFor(p, "Complete:", 15000);
    ok((await sql("select count(*)::int n from playbooks where source = 'recorder'"))[0].n === 1, "Build my playbook makes a playbook from the recording");

    // Download and delete the video
    await click(p, "← Library");
    await waitFor(p, "Open playbook");
    const [dl] = await Promise.all([p.waitForEvent("download"), click(p, "Download video")]);
    const file = path.join(SHOTS, "recording.webm");
    await dl.saveAs(file);
    ok(dl.suggestedFilename().startsWith("DELA - File a motion") && fs.statSync(file).size > 1000, "the video downloads as one file");
    await click(p, "Delete video");
    t = await waitFor(p, "Video deleted on");
    ok(t.includes("Open playbook"), "deleting the video keeps the playbook");
    await s.ctx.close();

    // A direct link opens the recorder page
    s = await open(browser, 2300, { viewport: { width: 1200, height: 900 }, permissions: ["microphone"], startTab: "record" });
    t = await waitFor(s.page, "Record a process");
    ok(t.includes("Your plan allows recordings up to"), "the direct link /dela?tab=record opens the Record a Process page");
    await s.ctx.close();

    // Phones see the upload option instead
    s = await open(browser, 2300, Object.assign({}, devices["iPhone 13"], { permissions: [] }));
    await click(s.page, "Library");
    await waitFor(s.page, "Recordings");
    await click(s.page, "Record a process");
    t = await waitFor(s.page, "Screen recording isn't available in this browser");
    ok(t.includes("Upload a recording"), "phones see the unsupported message and Upload a recording");
    await s.ctx.close();

    console.log("\n" + passed + " browser checks passed");
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });

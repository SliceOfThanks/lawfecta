// Browser test of images in documents (docs/briefs/step-2e-document-images.md): Add image, paste and drop, wrong type,
// too large and a fourth image, the review window (flags from the text reader, Blur all flagged, Box, Arrow, Undo, the
// caption and the checkbox), the blur burned in, full screen, reorder, Edit and Remove, the block with Fix it, Word export,
// the gig warning, Check images at a due review, the freelancer's read-only view and its end, Policies, the phone.
// Needs tools/dbtest.sh, then tests/pw/server.ts on port 8787.   node tests/pw/images-test.js
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

async function open(browser, uid, viewport, extra) {
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
  await page.route("**/tesseract.js@5.1.1/dist/tesseract.min.js", (r) => r.fulfill({ contentType: "application/javascript",
    body: "window.Tesseract = { recognize: function () { return new Promise(function (ok) { setTimeout(function () { ok({ data: { words: window.__OCR_WORDS || [] } }); }, 50); }); } };" }));
  await page.goto(`${BASE}/page/DELA-App?uid=${uid}&plan=` + (extra || ""));
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
const MINE = "org_id in (select o.id from organizations o join people pe on pe.id = o.owner_person_id where pe.bd_member_id = 3700)";
async function makeMember(bd, side, plan) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, 'Member ${bd}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side((select id from people where bd_member_id = ${bd}), '${side}', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and channel = 'access' and revoked_at is null); select 1`);
}

const W = (text, x0, y0, x1, y1) => ({ text, bbox: { x0, y0, x1, y1 } });
// The words the text reader "finds" on the test screenshot: a name, an email, a case number and a button label
const FLAGGED = [W("Jane", 20, 20, 70, 46), W("Roe", 76, 20, 116, 46), W("jane@example.com", 20, 60, 220, 86), W("2026-CV-0042", 20, 100, 170, 126), W("Save", 300, 260, 350, 286)];
async function shot(page, text) {
  const b64 = await page.evaluate((t) => { const c = document.createElement("canvas"); c.width = 400; c.height = 300; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 400, 300);
    g.fillStyle = "#000"; g.font = "24px sans-serif"; g.fillText(t[0], 20, 42); g.fillText(t[1], 20, 82); g.fillText(t[2], 20, 122); g.fillText("Save", 300, 282); return c.toDataURL("image/png").split(",")[1]; }, text);
  return Buffer.from(b64, "base64");
}
const pick = (page, where) => dela(page).locator('input[aria-label="Choose an image for ' + where + '"]').first();
async function addViaButton(page, where, buf, words, caption) {
  await page.evaluate((w) => { window.__OCR_WORDS = w; }, words || []);
  await pick(page, where).setInputFiles({ name: "screen.png", mimeType: "image/png", buffer: buf });
  await waitFor(page, "Review image");
  if (caption) await finish(page, caption);
}
async function finish(page, caption) {
  await dela(page).getByLabel("Caption (what should the reader look at?)").fill(caption);
  await dela(page).getByLabel("This image contains no client information, passwords or account numbers.").check();
  await click(page, "Save image");
  await waitFor(page, caption, 10000);
  await page.waitForTimeout(1200);
}
const imgs = (step) => sql("select v.body->'steps'->" + step + "->'images' as im from playbook_versions v join playbooks p on p.id = v.playbook_id and v.version = p.current_version where p.title = 'Run a conflict check' and p." + MINE).then((r) => r[0].im || []);

(async () => {
  const browser = await chromium.launch();
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('ai_generation', 'playbook_library', 'file_uploads', 'flex_gigs', 'profiles', 'document_standard', 'document_images'); select 1");
    await makeMember(3700, "attorney", "att_business");
    await makeMember(3701, "freelancer", "fl_plus");
    await sql(`select dela_doc_firm_save((select id from people where bd_member_id = 3700), '{"size":"2-5","practice_areas":["Family law"],"jurisdictions":"Texas","roles":[{"name":"Attorney","kind":"attorney"},{"name":"Paralegal","kind":"staff"}],"systems":{"practice_management":["Clio"]}}'::jsonb)`);

    // ---------- Attorney: a new SOP, then images ----------
    let s = await open(browser, 3700);
    let p = s.page;
    await click(p, "Library");
    await waitFor(p, "Document library");
    await click(p, "New document");
    await waitFor(p, "Pick what to build");
    await dela(p).getByRole("button", { name: /^SOP/ }).first().click();
    await waitFor(p, "About this process");
    await dela(p).getByLabel("Process name").fill("Run a conflict check");
    await click(p, "Draft it with DELA");
    let t = await waitFor(p, "Quality check", 15000);
    ok(t.includes("Tip: Take a screenshot, click a step, and paste it here.") && t.includes("🖼 Add image"), "each step has Add image, and the tip shows under the first step");
    const buf = await shot(p, ["Jane Roe", "jane@example.com", "2026-CV-0042"]);
    // Wrong type, too large
    await pick(p, "step 1").setInputFiles({ name: "screen.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
    await waitFor(p, "Use a PNG or JPG image.");
    ok(true, "a GIF is refused with \"Use a PNG or JPG image.\"");
    await pick(p, "step 1").setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1048576 + 10) });
    await waitFor(p, "This image is over 5 MB. Try a smaller screenshot.");
    ok(true, "an image over 5 MB is refused");
    // The review window: flags, the disabled Save, Blur all flagged
    await addViaButton(p, "step 1", buf, FLAGGED);
    t = await waitFor(p, "We found 3 items that may be client information.");
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(SHOTS, "images-review.png") });
    ok(t.includes("Box") && t.includes("Arrow") && t.includes("Blur") && t.includes("Undo"), "the toolbar has Box, Arrow, Blur and Undo, and three items are flagged (not the Save button)");
    const save = dela(p).getByRole("button", { name: "Save image" });
    ok(await save.isDisabled(), "Save image stays off until the caption and the checkbox");
    ok((await dela(p).locator("span[title='Add a caption and confirm there is no client information.']").count()) === 1, "hovering the disabled button explains why");
    await dela(p).getByLabel("Caption (what should the reader look at?)").fill("The New matter button in Clio");
    ok(await save.isDisabled(), "a caption alone is not enough");
    await click(p, "Blur all flagged");
    await waitFor(p, "Every flagged item is blurred.");
    // A box and an arrow, then undo the arrow
    const cv = dela(p).locator("canvas.img-canvas");
    const bb = await cv.boundingBox();
    await p.mouse.move(bb.x + bb.width * 0.7, bb.y + bb.height * 0.8); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.95, bb.y + bb.height * 0.97); await p.mouse.up();
    await click(p, "Arrow");
    await p.mouse.move(bb.x + bb.width * 0.4, bb.y + bb.height * 0.5); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.7, bb.y + bb.height * 0.85); await p.mouse.up();
    await click(p, "Undo");
    await dela(p).getByLabel("This image contains no client information, passwords or account numbers.").check();
    ok(!(await save.isDisabled()), "with the caption and the checkbox, Save image turns on");
    await click(p, "Save image");
    t = await waitFor(p, "The New matter button in Clio", 10000);
    await p.waitForTimeout(1200);
    let rec = await sql("select di.flags_found, di.flags_blurred, di.caption, di.confirmed_at is not null as ok, f.storage_path from doc_images di join files f on f.id = di.file_id where di." + MINE + " order by di.created_at");
    ok(rec.length === 1 && rec[0].flags_found === 3 && rec[0].flags_blurred === 3 && rec[0].ok, "the image is saved with its check and the flags it found and blurred");
    ok((await imgs(0)).length === 1, "the image joins the step in a new version");
    // The blur is burned in: no black text pixels left where the name was
    const dark = await p.evaluate(async (path) => { const r = await fetch("/test/storage/get/" + path); const bm = await createImageBitmap(await r.blob()); const c = document.createElement("canvas"); c.width = bm.width; c.height = bm.height;
      const g = c.getContext("2d"); g.drawImage(bm, 0, 0); const d = g.getImageData(20, 20, 96, 26).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 40 && d[i + 1] < 40 && d[i + 2] < 40) n++; return n; }, rec[0].storage_path);
    ok(dark === 0, "the saved image has the name blurred; the unblurred original never left the browser (" + dark + " dark pixels)");
    // Paste a screenshot into step 2
    await p.evaluate(() => { window.__OCR_WORDS = []; });
    await p.evaluate(async (b64) => {
      const host = document.querySelector(".dela-host").shadowRoot;
      const ta = host.querySelector('textarea[aria-label="Step 2"]');
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer(); dt.items.add(new File([bin], "paste.png", { type: "image/png" }));
      ta.focus(); ta.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, composed: true }));
    }, (await shot(p, ["Run report", "", ""])).toString("base64"));
    t = await waitFor(p, "Review image");
    await waitFor(p, "DELA did not find anything that looks like client information.");
    await finish(p, "The Run report button");
    ok((await imgs(1)).length === 1, "a pasted screenshot opens the same review window and lands on that step");
    // Drop a file on step 3, then cancel
    await p.evaluate(async (b64) => {
      const host = document.querySelector(".dela-host").shadowRoot;
      const card = host.querySelectorAll(".step-card")[2];
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer(); dt.items.add(new File([bin], "drop.png", { type: "image/png" }));
      card.dispatchEvent(new DragEvent("dragover", { dataTransfer: dt, bubbles: true, cancelable: true, composed: true }));
      card.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true, composed: true }));
    }, buf.toString("base64"));
    await waitFor(p, "Review image");
    await click(p, "Cancel");
    await p.waitForTimeout(500);
    ok((await imgs(2)).length === 0 && !(await text(p)).includes("Review image"), "a dropped file opens the review window; Cancel adds nothing");
    // Two more on step 1, then the fourth is refused
    await addViaButton(p, "step 1", buf, [], "The matter list");
    await addViaButton(p, "step 1", buf, [], "The matter form");
    ok((await imgs(0)).length === 3, "three images on one step");
    await dela(p).getByRole("button", { name: "Add image to step 1" }).click();
    await waitFor(p, "Each step can have 3 images. Split this step to add more.");
    ok(true, "a fourth image on a step is refused with the split message");
    // Full screen and Esc
    await dela(p).locator(".img-fig img").first().click();
    await p.waitForSelector(".dela-host >> .img-full");
    await p.keyboard.press("Escape");
    await p.waitForTimeout(300);
    ok((await dela(p).locator(".img-full").count()) === 0, "an image opens full screen and Esc closes it");
    // Reorder by dragging
    const before = (await imgs(0)).map((x) => x.caption);
    await p.evaluate(() => {
      const figs = document.querySelector(".dela-host").shadowRoot.querySelectorAll(".step-card")[0].querySelectorAll(".img-fig");
      const dt = new DataTransfer();
      figs[0].dispatchEvent(new DragEvent("dragstart", { dataTransfer: dt, bubbles: true, composed: true }));
      figs[1].dispatchEvent(new DragEvent("dragover", { dataTransfer: dt, bubbles: true, cancelable: true, composed: true }));
      figs[1].dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true, composed: true }));
    });
    await p.waitForTimeout(1500);
    const after = (await imgs(0)).map((x) => x.caption);
    ok(after[0] === before[1] && after[1] === before[0], "dragging reorders the images on a step (" + after.join(" | ") + ")");
    // Edit the caption (no new upload when nothing is drawn)
    const n0 = (await sql("select count(*)::int n from doc_images where " + MINE))[0].n;
    await dela(p).locator(".step-card").first().locator(".img-fig").nth(0).hover();
    await dela(p).locator(".step-card").first().locator(".img-fig").nth(0).getByRole("button", { name: "Edit" }).click();
    await waitFor(p, "Review image");
    await finish(p, "The matter list, filtered");
    ok((await sql("select count(*)::int n from doc_images where " + MINE))[0].n === n0 && (await imgs(0))[0].caption === "The matter list, filtered", "Edit changes the caption without a new upload");
    // Remove asks first
    await dela(p).locator(".step-card").first().locator(".img-fig").nth(2).hover();
    await dela(p).locator(".step-card").first().locator(".img-fig").nth(2).getByRole("button", { name: "Remove" }).click();
    await waitFor(p, "Remove this image?");
    await dela(p).locator(".dela-modal").getByRole("button", { name: "Remove" }).click();
    await p.waitForTimeout(1500);
    ok((await imgs(0)).length === 2, "Remove asks \"Remove this image?\" and takes it off");

    // ---------- The client-data check blocks; Fix it opens the review window ----------
    const firstId = (await imgs(0))[0].id;
    await sql("update doc_images set confirmed_at = null where id = '" + firstId + "'; select 1");
    await click(p, "← Library");
    await waitFor(p, "Document library");
    await dela(p).locator("tr", { hasText: "Run a conflict check" }).first().click();
    t = await waitFor(p, "image has no client-data check");
    ok(t.includes("Step 1 image has no client-data check.") && t.includes("Export, approval and Flex Gigs are blocked"), "an image without a confirmed check blocks the document");
    ok(await dela(p).getByRole("button", { name: "Word", exact: true }).isDisabled(), "Word export is off");
    await dela(p).locator(".qp-item.blocking", { hasText: "client-data check" }).getByRole("button", { name: "Fix it" }).click();
    await waitFor(p, "Review image");
    await finish(p, "The matter list, filtered");
    await p.waitForTimeout(800);
    ok(!(await text(p)).includes("Export, approval and Flex Gigs are blocked"), "Fix it opens the review window; confirming lifts the block");
    // Word export with the images
    const dl = p.waitForEvent("download");
    await click(p, "Word");
    const file = await dl;
    const bytes = fs.readFileSync(await file.path());
    ok(bytes.includes(Buffer.from("word/media/image1.png")) && bytes.includes(Buffer.from("word/media/image3.png")), "the Word export carries the images");
    // Approve, then the gig warning
    await click(p, "Approve");
    await waitFor(p, "Post as a Flex Gig");
    await click(p, "Post as a Flex Gig");
    await waitFor(p, "Draft the gig with DELA");
    await click(p, "Draft the gig with DELA");
    t = await waitFor(p, "The freelancer will see 3 images in this document. Check that none show client information.");
    ok(t.includes("Review images") && t.includes("Continue"), "the warning before the gig names the image count");
    await click(p, "Continue");
    await waitFor(p, "Public version", 15000);
    const gig = (await sql("select id from gigs where " + MINE + " order by created_at desc limit 1"))[0].id;
    ok(!!gig, "Continue creates the gig");

    // ---------- A due review: Check images ----------
    await sql("update playbooks set next_review_at = current_date - 1, last_reviewed_at = current_date - 30 where title = 'Run a conflict check' and " + MINE + "; update doc_images set created_at = now() - interval '60 days' where " + MINE + "; select 1");
    await click(p, "Library");
    await p.waitForTimeout(1000);
    if ((await text(p)).includes("← Library")) await click(p, "← Library");
    await waitFor(p, "Document library");
    await dela(p).locator("tr", { hasText: "Run a conflict check" }).first().click();
    await waitFor(p, "Quality check");
    await dela(p).getByLabel("Purpose").fill("Find conflicts before every consult.");
    await click(p, "Save");
    t = await waitFor(p, "Check images");
    ok(t.includes("Still current") && t.includes("Step 1") && t.includes("The Run report button"), "a due review lists every image with its step and caption");
    ok(await dela(p).getByRole("button", { name: "Approve", exact: true }).isDisabled(), "Approve waits for the image check");
    for (let i = 0; i < 3; i++) { await click(p, "Still current"); await p.waitForTimeout(1200); }
    t = await waitFor(p, "Every image is checked.");
    ok(!(await dela(p).getByRole("button", { name: "Approve", exact: true }).isDisabled()), "with every image still current, Approve turns on " + t.slice(t.indexOf("Quality check"), t.indexOf("Quality check") + 700));
    await click(p, "Approve");
    await waitFor(p, "Approved");
    await s.ctx.close();

    // ---------- Freelancer: the gig shows the images, with no download button ----------
    await sql("update gigs set status = 'open' where id = '" + gig + "'; insert into gig_invitations (gig_id, freelancer_id, invited_by) values ('" + gig + "', (select id from people where bd_member_id = 3701), (select id from people where bd_member_id = 3700)); select 1");
    s = await open(browser, 3701, null, "&tab=work&gig=" + gig);
    p = s.page;
    t = await waitFor(p, "The work handed to you", 10000);
    await p.waitForTimeout(1500);
    ok(t.includes("The Run report button") && (await dela(p).locator(".img-fig img[src*='/test/storage/get/']").count()) >= 2, "the freelancer sees the images with captions");
    ok(!t.includes("Download") && (await dela(p).locator(".img-tools").count()) === 0, "no download button and no editing in the gig");
    await sql("update gigs set status = 'closed' where id = '" + gig + "'; select 1");
    await s.ctx.close();
    s = await open(browser, 3701, null, "&tab=work&gig=" + gig);
    p = s.page;
    t = await waitFor(p, "Images are hidden now that this engagement has ended.", 10000);
    ok(true, "after the gig closes, the images are hidden");
    await s.ctx.close();

    // ---------- Attorney: a Policy has no images; the phone view ----------
    s = await open(browser, 3700);
    p = s.page;
    await click(p, "Library");
    await waitFor(p, "Document library");
    await click(p, "New document");
    await waitFor(p, "Pick what to build");
    await dela(p).getByRole("button", { name: /^Policy/ }).first().click();
    await waitFor(p, "About this process");
    await dela(p).getByLabel("Process name").fill("Client trust account rules");
    await click(p, "Draft it with DELA");
    t = await waitFor(p, "The rules", 15000);
    ok(!t.includes("Add image"), "a Policy has no Add image button");
    await s.ctx.close();
    s = await open(browser, 3700, { width: 390, height: 844 });
    p = s.page;
    await click(p, "Library");
    await waitFor(p, "Run a conflict check");
    await dela(p).locator("tr", { hasText: "Run a conflict check" }).first().click();
    await waitFor(p, "Quality check");
    await p.waitForTimeout(1200);
    const wide = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(wide <= 392, "the document with images fits a phone (" + wide + "px)");
    await dela(p).locator(".img-fig").first().click({ position: { x: 5, y: 5 } }).catch(() => {});
    await p.screenshot({ path: path.join(SHOTS, "images-phone.png"), fullPage: false });
    await s.ctx.close();
    console.log(passed + " browser checks passed");
  } finally { await browser.close(); }
})().catch((e) => { console.error(e.message); process.exit(1); });

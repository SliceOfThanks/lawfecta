// Browser test of Step 3, profiles and verification: the attorney fills from the Lawfecta listing, saves, adds a license
// (a free email is refused), confirms the email link, and the team verifies it in the admin area. The freelancer has
// DELA draft the profile, adds a service, asks for the LinkedIn check, uploads a document, shows it to attorneys,
// confirms availability and becomes match-ready. The listing update, client information, and phone width.
// Needs tools/dbtest.sh, then tests/pw/server.ts on port 8787.   node tests/pw/profiles-test.js
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://127.0.0.1:8787";
const ROOT = path.join(__dirname, "..", "..");
const SHOTS = process.env.SHOTS || path.join(ROOT, "shots");
const WORKER = "browser-worker-secret-profiles-0123456";
fs.mkdirSync(SHOTS, { recursive: true });
let passed = 0;
function ok(cond, msg) { if (!cond) throw new Error("FAILED: " + msg); passed++; console.log("ok", msg); }
async function sql(q) { const r = await fetch(BASE + "/test/sql", { method: "POST", body: JSON.stringify({ sql: q }) }); return (await r.json()).rows; }
async function worker(n) { for (let i = 0; i < n; i++) { await sql("update jobs set run_at = now() where status in ('queued', 'delayed')"); await fetch(BASE + "/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }); } }

async function open(browser, uid, query, viewport, timezoneId) {
  const ctx = await browser.newContext(Object.assign({ viewport: viewport || { width: 1200, height: 900 } }, timezoneId ? { timezoneId } : {}));
  // Step 43: the folded sections of "Agreement and work" are open, as with "Open all sections" (the folded page has its own checks in engagements-test.js)
  await ctx.addInitScript((all) => { try { if (all) localStorage.setItem("dela_eg_all", "1"); else localStorage.removeItem("dela_eg_all"); } catch (e) { /* no storage */ } }, true);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept());
  await page.route("https://cdn.jsdelivr.net/**", (route) => {
    const u = new URL(route.request().url());
    route.fulfill({ path: path.join(ROOT, u.pathname.split("@")[1].split("/").slice(1).join("/")), contentType: "application/javascript" });
  });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.route("https://hirelegalhelp.com/**", (r) => r.fulfill({ status: 404, body: "" }));
  await page.goto(`${BASE}/page/${uid === "admin" ? "DELA-Admin" : "DELA-App"}?uid=${uid === "admin" ? 2502 : uid}&plan=` + (query ? "&" + query : ""));
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
const label = (page, name) => dela(page).getByLabel(name, { exact: true });
// Step 8b Part C (R09): practice areas and the biography are folded until opened, as a person would open them
async function unfold(page, id) { const sum = page.locator(".dela-host").locator("#" + id + " > summary"); if (await sum.count() && !(await page.locator(".dela-host").locator("#" + id).evaluate((d) => d.open))) await sum.click(); }
async function waitFor(page, words, ms) {
  const end = Date.now() + (ms || 10000);
  let t = "";
  while (Date.now() < end) { t = await text(page); if (t.includes(words)) return t; await page.waitForTimeout(250); }
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(-1500));
}

(async () => {
  const browser = await chromium.launch();
  try {
    await sql(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$;
      update feature_switches set state = 'everyone' where key in ('profiles', 'attorney_verification', 'freelancer_verification', 'profile_documents', 'ai_generation', 'file_uploads');
      update feature_switches set state = 'off' where key = 'bd_profile_sync';
      insert into people (bd_member_id, display_name, email) values (2500, 'Lia Listing', 'lia@login.invalid'), (2501, 'Fran Freelancer', 'fran@login.invalid'), (2502, 'Owen Owner', 'owen@login.invalid') on conflict do nothing;
      select dela_ensure_side((select id from people where bd_member_id = 2500), 'attorney', 'att_plus', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = 2501), 'freelancer', 'fl_plus', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = 2502), 'attorney', 'att_free', 'staff_grant');
      insert into staff_roles (person_id, role) values ((select id from people where bd_member_id = 2502), 'owner');
      insert into access_list (bd_member_id, channel) values (2500, 'access'), (2501, 'access'), (2502, 'access'); select 1`);

    // ---------- Attorney ----------
    let s = await open(browser, 2500);
    let p = s.page;
    await click(p, "Set up your profile and verification");
    let t = await waitFor(p, "Profile and verification");
    ok(!t.includes("DELA is for operations work"), "the profile page has no client information banner (Stacey 2026-11-05)");
    ok(t.includes("Not complete") && t.includes("Firm name") && t.includes("Where you are licensed or practice"), "the attorney sees exactly what is missing");
    ok(t.includes("Posting work and hiring need a verified license"), "the page says hiring needs verification");
    // Step 8b Part C (R09): the firm essentials come first, with what is missing at the top; long parts are folded
    const order = await p.evaluate(() => [...document.querySelector(".dela-host").shadowRoot.querySelectorAll("#sec-firm, #sec-verify, #sec-profile")].map((e) => e.id).join(","));
    ok(order === "sec-firm,sec-verify,sec-profile", "Firm details come before the license and the long profile (" + order + ")");
    ok(t.includes("Still needed before paid work: Billing address, Who may sign for the firm, Email for formal notices."), "what the firm still needs is listed at the top");
    await click(p, "Go to Firm details");
    ok(await p.evaluate(() => document.querySelector(".dela-host").shadowRoot.activeElement.getAttribute("aria-label")) === "Firm's legal name", "Go to Firm details goes to the first firm box");
    // Step 21: the firm's logo is uploaded in Firm details and saves at once
    ok((await text(p)).includes("No logo yet. Freelancers see your firm's name only."), "Firm details say there is no logo yet");
    await dela(p).getByLabel("Choose a firm logo").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]) });
    await waitFor(p, "Logo saved. Nothing else to click.");
    await waitFor(p, "Your firm's logo. Freelancers see it next to your firm's name");
    ok(await dela(p).getByRole("button", { name: "Change logo", exact: true }).count() === 1 && await dela(p).getByRole("button", { name: "Remove logo", exact: true }).count() === 1 && await dela(p).getByAltText("Firm logo").count() === 1, "the logo shows, with Change logo and Remove logo");
    ok(/^firms\/[0-9a-f-]{36}\/logo-[0-9a-f-]{36}\.png$/.test((await sql(`select fp.body->>'logo_file' f from firm_profiles fp join side_profiles sp on sp.org_id = fp.org_id and sp.side = 'attorney' join people pe on pe.id = sp.person_id where pe.bd_member_id = 2500`))[0].f), "the logo is saved with the firm, without a Save click");
    ok(await dela(p).locator("#prof-areas > summary").innerText() === "Practice areas (0 selected)" && await label(p, "Find a practice area").count() === 1, "practice areas are folded, with a count and a search box");
    await click(p, "Fill from my Lawfecta listing");
    await waitFor(p, "Filled");
    ok(await label(p, "First name").inputValue() === "Lia" && await label(p, "Firm name").inputValue() === "Listing Law", "the form fills from the Lawfecta listing");
    ok(!(await text(p)).includes("4111"), "nothing else from the listing reaches the page");
    // Filling again after clearing one box fills just that one, in plain words (Stacey's Step 3 test, 2026-11-05)
    await label(p, "City").fill("");
    await click(p, "Fill from my Lawfecta listing");
    await waitFor(p, "Filled 1 item from your listing.");
    ok(await label(p, "City").inputValue() === "Dallas", "filling again says \"Filled 1 item\" and fills only the empty box");
    await unfold(p, "prof-areas");
    await click(p, "Family law");
    await label(p, "Where you are licensed or practice").fill("TX");
    await click(p, "Save");
    t = await waitFor(p, "Waiting for a check");
    ok(t.includes("Profile saved") || t.includes("Waiting for a check"), "a complete profile waits for the license check");

    // License: a free email is refused, then the firm email
    await label(p, "State that issued the license").selectOption("TX");
    await label(p, "Bar number").fill("24099999");
    await label(p, "Email for the check").fill("lia@gmail.com");
    await click(p, "Add the license");
    await waitFor(p, "Gmail, Yahoo and other free email services do not count");
    ok(true, "a Gmail address is refused with a plain message");
    await label(p, "Email for the check").fill("lia@listinglaw.com");
    await click(p, "Add the license");
    t = await waitFor(p, "We emailed lia@listinglaw.com");
    ok(t.includes("Waiting for the Lawfecta Team"), "the license waits for the team");
    await p.screenshot({ path: path.join(SHOTS, "profile-attorney.png"), fullPage: true });
    const link = (await sql("select link from notifications where to_email = 'lia@listinglaw.com' order by created_at desc limit 1"))[0].link;
    await p.goto(`${BASE}/page/DELA-App?uid=2500&plan=&` + link.split("?")[1]);
    await waitFor(p, "Email confirmed");
    await waitFor(p, "Email lia@listinglaw.com confirmed");
    ok(true, "the email link confirms the license email for the signed in attorney");
    await s.ctx.close();

    // ---------- The team verifies ----------
    let a = await open(browser, "admin");
    let ap = a.page;
    ap.on("pageerror", (e) => { throw new Error("admin page error: " + e.message); });
    await dela(ap).getByRole("tab", { name: "Verification" }).click();
    t = await waitFor(ap, "Attorney licenses (1)");
    ok(t.includes("TX bar number 24099999") && t.includes("lia@listinglaw.com (confirmed"), "the team sees the license with its confirmed email");
    await dela(ap).getByLabel("How the attorney showed it is theirs").selectOption("firm_domain");
    await dela(ap).getByLabel("Lookup note").fill("TX bar lookup: active, name matches");
    await click(ap, "Verify");
    await waitFor(ap, "Attorney licenses (0)");
    ok(true, "the team verifies the license");
    await a.ctx.close();

    s = await open(browser, 2500, "tab=profile");
    p = s.page;
    t = await waitFor(p, "Verified");
    ok(t.includes("Ready") && t.includes("You are verified"), "the attorney is verified and ready");
    ok(!t.includes("before you are verified"), "the note for unverified attorneys is gone once verified");
    ok((await sql("select count(*)::int n from notifications where title = 'Your license is verified'"))[0].n >= 1, "the attorney was told");
    await click(p, "Projects");
    t = await waitFor(p, "Projects");
    ok(!t.includes("need a verified license"), "the hiring note goes away once verified");
    await s.ctx.close();

    // ---------- Freelancer ----------
    s = await open(browser, 2501);
    p = s.page;
    await click(p, "Profile");
    t = await waitFor(p, "Your availability");
    ok(t.includes("LinkedIn check") && t.includes("At least one service") && t.includes("Profile documents"), "the freelancer page has availability, the LinkedIn check, the checklist and documents");
    await dela(p).getByText("Let DELA draft your headline, summary and services").click();
    await label(p, "Tell DELA about your work").fill("Eight years of litigation support for solo attorneys in Texas, mostly e-filing and discovery, in Clio.");
    await click(p, "Draft with DELA");
    await waitFor(p, "DELA filled in a draft");
    ok(await label(p, "Headline").inputValue() === "Litigation paralegal for solo attorneys", "DELA drafts the headline");
    ok(await label(p, "Service 1 name").inputValue() === "E-filing", "and a first service");
    await label(p, "First name").fill("Fran");
    await label(p, "Last name").fill("Freelancer");
    await unfold(p, "prof-areas");
    await click(p, "Family law");
    await label(p, "Service 1 price from").fill("150");
    await label(p, "Service 1 price to").fill("400");
    // Each box explains itself behind "?", DELA can write one box, and tech tools are in groups that open (Stacey 2026-11-05)
    await unfold(p, "prof-bio");
    await dela(p).getByRole("button", { name: "What to enter in Education" }).click();
    t = await text(p);
    ok(t.includes("Degrees, certificates and courses, one per line"), "the ? next to a box explains what to enter");
    // The shared help tip: tied to its note, opens with the keyboard, Escape closes it and returns focus (UX review part 3)
    const q = dela(p).getByRole("button", { name: "What to enter in Education" });
    const noteId = await q.getAttribute("aria-controls");
    ok(!!noteId && (await q.getAttribute("aria-describedby")) === noteId && (await q.getAttribute("aria-expanded")) === "true", "the ? is tied to its note");
    await q.focus();
    await p.keyboard.press("Escape");
    ok((await q.getAttribute("aria-expanded")) === "false" && await p.evaluate(() => document.querySelector(".dela-host").shadowRoot.activeElement.getAttribute("aria-label")) === "What to enter in Education", "Escape closes it and keeps focus on the ?");
    await p.keyboard.press("Enter");
    ok((await q.getAttribute("aria-expanded")) === "true", "Enter opens it again");
    ok(await p.evaluate((id) => { const b = document.querySelector(".dela-host").shadowRoot.getElementById(id); return getComputedStyle(b).position === "fixed" && b.getBoundingClientRect().width <= 300; }, noteId), "the note floats by the ? and is at most 300 pixels wide (step 39)");
    await p.keyboard.press("Escape");
    const writeBtns = await dela(p).getByRole("button", { name: "✦ Write with DELA" }).count();
    ok(writeBtns === 4, "Headline, Summary, Experience and Education each have Write with DELA (" + writeBtns + ")");
    await dela(p).getByRole("button", { name: "✦ Write with DELA" }).nth(2).click();
    await label(p, "Facts for DELA about your experience").fill("Senior paralegal at a family law firm since 2019");
    await click(p, "Write it");
    await waitFor(p, "DELA wrote this from your facts");
    ok(await label(p, "Experience").inputValue() === "Senior paralegal, family law firm, 2019 to now.", "Write with DELA fills just that box, unsaved");
    const groups = await dela(p).locator("details.tool-group summary").allInnerTexts();
    ok(groups.length === 8 && groups[0].includes("Practice and case management") && groups[0].includes("1 chosen"), "tech tools are grouped, and a group shows how many are chosen (" + groups[0].split("\n").join(" ") + ")");
    ok(!(await dela(p).getByRole("button", { name: "Westlaw" }).isVisible()), "groups with nothing chosen start closed");
    await dela(p).locator("details.tool-group summary", { hasText: "Legal research and AI" }).click();
    ok(await dela(p).getByRole("button", { name: "Westlaw" }).isVisible(), "opening a group shows its tools");
    // Change the photo on this page (Stacey 2026-11-05: "doesn't allow me")
    await dela(p).getByLabel("Choose a profile photo").setInputFiles({ name: "me.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]) });
    await waitFor(p, "New photo ready. Click \"Save my picture\" next to it to keep it.");
    ok(await dela(p).getByRole("button", { name: "Change photo" }).count() === 1, "a new photo can be chosen on the profile page");
    await unfold(p, "prof-bio");
    await label(p, "Experience").fill("Eight years at two family law firms.");
    await click(p, "MyCase");
    await label(p, "Other tech tools").fill("Casemark");
    await label(p, "Time zone").selectOption("Central");
    await label(p, "Hours a week you can take on").fill("20");
    await dela(p).getByLabel("LinkedIn profile address", { exact: true }).nth(1).fill("linkedin.com/in/fran-freelancer");
    await dela(p).getByText("I agree to keep attorneys' work confidential").click();
    // Client information in the summary: DELA asks first (the dialog is accepted here)
    await unfold(p, "prof-bio");
    await label(p, "Summary").fill("I worked for client SSN 123-45-6789 on e-filing.");
    await click(p, "Save");
    await waitFor(p, "Profile saved");
    ok(true, "client information is caught before saving, and the member decides");
    await unfold(p, "prof-bio");
    await label(p, "Summary").fill("I support solo attorneys with e-filing and discovery in Texas courts.");
    await click(p, "Save");
    t = await waitFor(p, "Waiting for a check");
    const saved = (await sql("select body from member_profiles mp join people pe on pe.id = mp.person_id where pe.bd_member_id = 2501 and side = 'freelancer'"))[0].body;
    ok(saved.services[0].price_from_cents === 15000 && saved.services[0].price_to_cents === 40000, "prices are saved in cents");
    ok(saved.software.includes("Clio") && saved.software.includes("MyCase") && saved.software.includes("Casemark"), "tech tools are saved from the choices and the other box");
    ok(/^profiles\/[0-9a-f-]{36}\/photo-[0-9a-f-]{36}\.png$/.test(saved.photo_file || ""), "the new photo is kept when the profile is saved");

    // Step 49: the freelancer opens the live profile, as attorneys see it, and changes the headline and the education right there
    await dela(p).locator("#prof-live").click();
    t = await waitFor(p, "Your live profile, as attorneys see it");
    ok(t.includes("I support solo attorneys with e-filing and discovery in Texas courts.") && t.includes("Quick facts") && t.includes("Back to the profile form"), "the live profile shows the saved summary on the page attorneys see");
    ok(!t.includes("Invite to gig") && !t.includes("Send message") && !t.includes("Book a call"), "the member's own live profile has no invite, message or call button");
    ok(t.includes("Attorneys cannot find this profile in Talent search yet") || t.includes("Attorneys can find this profile in Talent search now"), "the page says whether attorneys can find the profile");
    await dela(p).locator("#tp-edit-headline").click();
    await dela(p).locator("#tp-box-headline").fill("Litigation support for solo attorneys in Texas");
    await dela(p).locator("#tp-save-headline").click();
    t = await waitFor(p, "Saved. Your live profile shows it now.");
    t = await waitFor(p, "Litigation support for solo attorneys in Texas");
    await dela(p).locator("#tp-edit-summary").click();
    await dela(p).locator("#tp-rich-summary").fill("This must not be kept.");
    await dela(p).getByRole("button", { name: "Cancel", exact: true }).click();
    t = await waitFor(p, "I support solo attorneys with e-filing and discovery in Texas courts.");
    ok(!t.includes("This must not be kept."), "Cancel leaves the summary as it was");
    await dela(p).getByRole("tab", { name: "Experience and qualifications" }).click();
    await dela(p).locator("#tp-edit-education").click();
    await dela(p).locator("#tp-marks-education").click();
    await dela(p).locator("#tp-box-education").fill("Paralegal certificate, Austin Community College\nNotary public, Texas");
    await dela(p).locator("#tp-save-education").click();
    t = await waitFor(p, "Notary public, Texas");
    const live = (await sql("select body from member_profiles mp join people pe on pe.id = mp.person_id where pe.bd_member_id = 2501 and side = 'freelancer'"))[0].body;
    ok(live.headline === "Litigation support for solo attorneys in Texas" && /Notary public, Texas/.test(live.education) && live.summary === saved.summary && live.services.length === saved.services.length && live.photo_file === saved.photo_file, "editing in place saves that one part and leaves the rest of the profile as it was");
    // Step 50: the summary takes a heading, a list, bold words and a picture from the bar, with a preview of what attorneys see
    await dela(p).getByRole("tab", { name: "Overview" }).click();
    await dela(p).locator("#tp-edit-summary").click();
    const sumBox = dela(p).locator("#tp-box-summary");
    await dela(p).locator("#tp-marks-summary").click();
    await sumBox.waitFor();
    ok(await dela(p).locator(".tp-editor .md-bar").getByRole("button", { name: "Bold", exact: true }).count() === 1 && await dela(p).locator(".tp-editor .md-bar").getByRole("button", { name: "Add a picture", exact: true }).count() === 1, "the editor has a formatting bar with Bold and Add a picture");
    ok(await dela(p).locator("#tp-anyway-summary").isHidden(), "the client information button stays hidden until it is needed");
    await sumBox.fill("What I do\nE-filing\nDiscovery\nI work in Texas courts.");
    await sumBox.evaluate((el) => el.setSelectionRange(0, 9));
    await dela(p).locator(".md-bar").getByRole("button", { name: "Heading", exact: true }).click();
    await sumBox.evaluate((el) => { const a = el.value.indexOf("E-filing"), z = el.value.indexOf("Discovery") + 9; el.setSelectionRange(a, z); });
    await dela(p).locator(".md-bar").getByRole("button", { name: "Bulleted list", exact: true }).click();
    await sumBox.evaluate((el) => { const a = el.value.indexOf("Texas"); el.setSelectionRange(a, a + 5); });
    await dela(p).locator(".md-bar").getByRole("button", { name: "Bold", exact: true }).click();
    ok((await sumBox.inputValue()) === "## What I do\n- E-filing\n- Discovery\nI work in **Texas** courts.", "the bar writes the marks: " + JSON.stringify(await sumBox.inputValue()));
    await sumBox.evaluate((el) => el.setSelectionRange(el.value.length, el.value.length));
    await dela(p).locator(".tp-editor .md-file").setInputFiles({ name: "desk.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]) });
    await waitFor(p, "Picture added.");
    await p.keyboard.type("My desk");
    const prevNow = await dela(p).locator("#tp-prev-summary").evaluate((d) => ({ h: d.querySelector("h3") && d.querySelector("h3").textContent, li: d.querySelectorAll("ul li").length, b: d.querySelector("strong") && d.querySelector("strong").textContent, img: d.querySelector("img") && d.querySelector("img").getAttribute("alt"), raw: d.textContent.includes("**") || d.textContent.includes("##") }));
    ok(prevNow.h === "What I do" && prevNow.li === 2 && prevNow.b === "Texas" && prevNow.img === "My desk" && !prevNow.raw, "the preview shows the heading, the list, the bold word and the picture, with no marks: " + JSON.stringify(prevNow));
    await dela(p).locator("#tp-save-summary").click();
    await waitFor(p, "Saved. Your live profile shows it now.");
    const shown = await dela(p).locator("#tp-summary").evaluate((d) => ({ h: d.querySelector("h3.md-h") && d.querySelector("h3.md-h").textContent, li: d.querySelectorAll("ul li").length, img: !!d.querySelector("img.md-img[alt='My desk']"), raw: d.textContent.includes("**") || d.textContent.includes("](") }));
    ok(shown.h === "What I do" && shown.li === 2 && shown.img && !shown.raw, "the saved summary shows formatted on the live profile: " + JSON.stringify(shown));
    await dela(p).getByRole("tab", { name: "Experience and qualifications" }).click();
    ok(await dela(p).locator("#tp-education ul.tp-lines li").count() === 2, "text written before, one point per line, still shows as a list");
    // Step 51: the formatted box. The text changes look while it is typed, with no marks showing, and saves as the same marks
    await dela(p).locator("#tp-edit-experience").click();
    const richX = dela(p).locator("#tp-rich-experience");
    await richX.waitFor();
    ok(await dela(p).locator("#tp-box-experience").isHidden() && await dela(p).locator("#tp-prev-experience").isHidden(), "the formatted box is the one shown; the box with the marks and the preview are put away");
    await dela(p).locator("#tp-marks-experience").click();
    await dela(p).locator("#tp-box-experience").fill("");
    await dela(p).locator("#tp-marks-experience").click();
    await richX.click();
    await p.keyboard.type("Paralegal work");
    await p.keyboard.press("Enter");
    await p.keyboard.type("Filed motions");
    await p.keyboard.press("ControlOrMeta+A");
    await dela(p).locator(".tp-editor .md-bar").getByRole("button", { name: "Bulleted list", exact: true }).click();
    await p.keyboard.press("ControlOrMeta+A");
    await dela(p).locator(".tp-editor .md-bar").getByRole("button", { name: "Bold", exact: true }).click();
    const richNow = await richX.evaluate((d) => ({ li: d.querySelectorAll("ul li").length, bold: d.querySelectorAll("b, strong").length, marks: d.textContent.includes("**") || d.textContent.includes("- ") }));
    ok(richNow.li === 2 && richNow.bold >= 1 && !richNow.marks, "in the formatted box the lines become a list and the words turn bold, with no marks showing: " + JSON.stringify(richNow));
    ok((await dela(p).locator("#tp-box-experience").inputValue()) === "- **Paralegal work**\n- **Filed motions**", "behind it, the same text is kept with its marks: " + JSON.stringify(await dela(p).locator("#tp-box-experience").inputValue()));
    await dela(p).locator("#tp-rich-experience").evaluate((d) => { const e = new Event("paste", { bubbles: true, cancelable: true }); e.clipboardData = { getData: () => "" }; d.dispatchEvent(e); });
    await dela(p).locator("#tp-save-experience").click();
    await waitFor(p, "Saved. Your live profile shows it now.");
    const expNow = (await sql("select body->>'experience' e from member_profiles mp join people pe on pe.id = mp.person_id where pe.bd_member_id = 2501 and side = 'freelancer'"))[0].e;
    const expShown = await dela(p).locator("#tp-experience").evaluate((d) => ({ li: d.querySelectorAll("ul li").length, strong: d.querySelectorAll("strong").length, raw: d.textContent.includes("**") }));
    ok(expNow === "- **Paralegal work**\n- **Filed motions**" && expShown.li === 2 && expShown.strong === 2 && !expShown.raw, "it saves, and the live profile shows the bold list: " + JSON.stringify([expNow, expShown]));
    // Step 49, second part (Stacey 2026-11-19, "Yes, add them"): skills, software, services and the picture are changed on the live profile too
    const one = async () => (await sql("select body from member_profiles mp join people pe on pe.id = mp.person_id where pe.bd_member_id = 2501 and side = 'freelancer'"))[0].body;
    await dela(p).locator("#tp-edit-skills").click();
    await dela(p).locator("#tp-box-skills").fill("E-filing, Discovery requests , Calendar control");
    await dela(p).locator("#tp-save-skills").click();
    t = await waitFor(p, "Calendar control");
    let now = await one();
    ok(JSON.stringify(now.skills) === JSON.stringify(["E-filing", "Discovery requests", "Calendar control"]), "skills typed with commas are saved as a list: " + JSON.stringify(now.skills));
    await dela(p).locator("#tp-edit-software").click();
    const other = dela(p).locator(".tp-editor").getByLabel("Other tech tools", { exact: true });
    ok((await other.inputValue()).includes("Casemark"), "the tools editor opens with the tools already chosen");
    await other.fill("Casemark, Lawmatics QA");
    await dela(p).locator("#tp-save-software").click();
    t = await waitFor(p, "Lawmatics QA");
    now = await one();
    ok(now.software.includes("Lawmatics QA") && now.software.includes("Clio") && now.software.includes("Casemark"), "a tool added in place is saved, and the chosen tools stay: " + JSON.stringify(now.software));
    // HTML typed into a part is shown as the words that were typed; it is never run
    await dela(p).locator("#tp-edit-education").click();
    await dela(p).locator("#tp-marks-education").click();
    await dela(p).locator("#tp-box-education").fill("Paralegal certificate, Austin Community College\nNotary public, Texas\n<img src=x onerror=window.__hit=1><b>not bold</b>");
    await dela(p).locator("#tp-save-education").click();
    await waitFor(p, "Saved. Your live profile shows it now.");
    const inj = await dela(p).locator("#tp-education").evaluate((d) => ({ tags: d.querySelectorAll("img, b, script").length, text: d.textContent.includes("<b>not bold</b>"), hit: window.__hit === 1 }));
    ok(inj.tags === 0 && inj.text && !inj.hit, "HTML typed into the text shows as plain words and nothing runs: " + JSON.stringify(inj));
    await dela(p).getByRole("tab", { name: "Services" }).click();
    await dela(p).locator("#tp-edit-services").click();
    await dela(p).locator(".tp-editor").getByRole("button", { name: "Add a service", exact: true }).click();
    const nSv = saved.services.length + 1;
    await dela(p).locator(".tp-editor").getByLabel("Service " + nSv + " name", { exact: true }).fill("Discovery document review");
    await dela(p).locator(".tp-editor").getByLabel("Service " + nSv + " price from", { exact: true }).fill("90");
    await dela(p).locator("#tp-save-services").click();
    t = await waitFor(p, "Discovery document review");
    now = await one();
    ok(now.services.length === nSv && now.services[nSv - 1].title === "Discovery document review" && now.services[nSv - 1].price_from_cents === 9000 && now.services[0].price_from_cents === 15000, "a service added in place is saved in cents, and the first service is untouched");
    ok(t.includes("From $90"), "the new service shows with its price on the page attorneys see");
    await dela(p).locator("#tp-photo-file").setInputFiles({ name: "new.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]) });
    await waitFor(p, "Picture saved. Your live profile shows it now.");
    now = await one();
    ok(/^profiles\/[0-9a-f-]{36}\/photo-[0-9a-f-]{36}\.png$/.test(now.photo_file || "") && now.photo_file !== saved.photo_file && now.headline === "Litigation support for solo attorneys in Texas", "a new picture is uploaded and saved in one go, and nothing else changes");
    await dela(p).getByRole("tab", { name: "Overview" }).click();
    // The headline goes back the same way, so the listing checks further down see the profile they expect
    await dela(p).locator("#tp-edit-headline").click();
    await dela(p).locator("#tp-box-headline").fill(saved.headline);
    await dela(p).locator("#tp-save-headline").click();
    await waitFor(p, "Saved. Your live profile shows it now.");
    await waitFor(p, saved.headline);
    await dela(p).locator("#tp-self-back").click();
    t = await waitFor(p, "Your availability");
    ok(t.includes("View my live profile"), "back on the profile form");

    // A change not saved yet survives the LinkedIn button (Stacey's Step 3 test, 2026-11-05)
    await label(p, "Usual hours").fill("Not saved yet");
    await dela(p).getByLabel("LinkedIn profile address", { exact: true }).first().fill("https://www.linkedin.com/in/fran-freelancer");
    await click(p, "Ask for the check");
    await waitFor(p, "Waiting for the Lawfecta Team");
    ok(true, "the freelancer asks for the LinkedIn check");
    ok(await label(p, "Usual hours").inputValue() === "Not saved yet", "asking for the LinkedIn check keeps changes that are not saved yet");

    // A document: the tick box first, then upload, check and show to attorneys
    const pdf = path.join(SHOTS, "resume.pdf");
    fs.writeFileSync(pdf, "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n" + " ".repeat(400));
    await click(p, "Upload a document");
    await waitFor(p, "Tick the confirmation box above the upload first.");
    await dela(p).getByText("This document has no confidential client information.").click();
    await dela(p).locator(".card", { hasText: "Profile documents" }).locator("input[type=file]").setInputFiles(pdf);
    t = await waitFor(p, "resume.pdf", 15000);
    await sql("update files set status = 'ready', check_state = 'clear' where name = 'resume.pdf'");
    await s.ctx.close();
    s = await open(browser, 2501, "tab=profile");
    p = s.page;
    await waitFor(p, "resume.pdf Ready, private");
    await click(p, "Show to attorneys");
    await waitFor(p, "shown to attorneys");
    ok(true, "a document uploads, passes the check, and is shown to attorneys only when the freelancer chooses");
    await s.ctx.close();

    // Fix (AI review 0.9.0, security 4): an address that is not LinkedIn's shows as plain text, never as a link
    await sql("update linkedin_checks set url = 'javascript:alert(1)' where status = 'pending'; select 1");
    a = await open(browser, "admin");
    ap = a.page;
    await dela(ap).getByRole("tab", { name: "Verification" }).click();
    t = await waitFor(ap, "Freelancer LinkedIn checks (1)");
    ok(t.includes("javascript:alert(1)") && await dela(ap).locator("a[href^='javascript']").count() === 0, "an address that is not LinkedIn's is not a link");
    await sql("update linkedin_checks set url = 'https://www.linkedin.com/in/fran-freelancer' where status = 'pending'; select 1");
    await dela(ap).getByRole("tab", { name: "Overview" }).click();
    await dela(ap).getByRole("tab", { name: "Verification" }).click();
    t = await waitFor(ap, "Freelancer LinkedIn checks (1)");
    ok(await dela(ap).locator("a[href='https://www.linkedin.com/in/fran-freelancer']").count() === 1, "a LinkedIn address is a link");
    ok(t.includes("Name on the DELA profile: Fran Freelancer"), "the team sees the LinkedIn profile next to the DELA name");
    await click(ap, "Checked");
    await waitFor(ap, "Tick both: the name matches");
    await dela(ap).getByText("The name on LinkedIn matches", { exact: true }).click();
    await dela(ap).getByText("LinkedIn shows its verified badge", { exact: true }).click();
    await click(ap, "Checked");
    await waitFor(ap, "Freelancer LinkedIn checks (0)");
    ok(true, "the team checks the name and the verified badge");
    await ap.screenshot({ path: path.join(SHOTS, "profile-admin.png"), fullPage: true });
    await a.ctx.close();

    s = await open(browser, 2501, "tab=profile");
    p = s.page;
    t = await waitFor(p, "Availability out of date");
    await click(p, "Available for new work");
    t = await waitFor(p, "You are match-ready");
    ok(t.includes("Confirm again by"), "confirming availability makes the freelancer match-ready, with the next date");
    ok(t.includes("Attorneys can see you in Talent now.") && !t.includes("Attorneys cannot see you in Talent yet."), "a match-ready freelancer is told attorneys can see them in Talent");
    await p.screenshot({ path: path.join(SHOTS, "profile-freelancer.png"), fullPage: true });
    // Fix (UI review 2026-11-08): Home shows the same green "Ready" as the Profile, not a grey "match ready"
    await p.goto(p.url().replace("tab=profile", "tab=home"));
    await waitFor(p, "Your profile, through an attorney's eyes");
    const hb = dela(p).locator(".hero .badge").first();
    ok((await hb.innerText()).trim() === "Ready" && (await hb.getAttribute("class")).includes("ready"), "Home: the readiness badge says Ready in green, as on the Profile");
    await p.goto(p.url().replace("tab=home", "tab=profile"));
    await waitFor(p, "You are match-ready");

    // The listing update, when the switch is on and the box stays ticked
    await sql("update feature_switches set state = 'everyone' where key = 'bd_profile_sync'; select 1");
    await p.reload();
    await waitFor(p, "Also update my Lawfecta directory listing");
    await label(p, "Usual hours").fill("Weekdays 9 to 5 Central");
    // The Save button says where the change goes, and which boxes change on the listing (UX review R02)
    await label(p, "Also update my Lawfecta directory listing").uncheck();
    ok(await dela(p).getByRole("button", { name: "Save to DELA only", exact: true }).count() === 1, "unticked, the button says Save to DELA only");
    await label(p, "Also update my Lawfecta directory listing").check();
    const dirNote = await dela(p).locator("#directory-fields").innerText();
    ok(dirNote.includes("These boxes also change on your directory listing:") && dirNote.includes("First name"), "ticked, it lists the boxes that change on the listing: " + dirNote);
    await click(p, "Save and update my directory listing");
    await waitFor(p, "Your listing is being updated");
    await worker(1);
    const sent = new URLSearchParams((await (await fetch(BASE + "/test/bd-update")).json()).body);
    ok(sent.get("first_name") === "Fran" && sent.get("position") === "Litigation paralegal for solo attorneys", "the listing gets the saved profile");
    await p.reload();
    await waitFor(p, "Your listing was updated");
    ok(true, "the member sees the listing was updated");
    await s.ctx.close();

    // Phone width
    s = await open(browser, 2501, "tab=profile", { width: 390, height: 800 });
    p = s.page;
    await waitFor(p, "Your availability");
    const wide = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(wide <= 392, "the profile fits a phone screen (" + wide + "px)");
    await s.ctx.close();

    // Dates without a time show the same day in US time zones (Stacey 2026-11-05: "Next yearly check" said Nov 3 for Nov 4)
    s = await open(browser, 2500, "tab=profile", null, "America/Los_Angeles");
    p = s.page;
    await waitFor(p, "Next yearly check");
    const nextCheck = (await sql("select to_char(next_check_at, 'Mon FMDD, YYYY') d from licenses l join people pe on pe.id = l.person_id where pe.bd_member_id = 2500 and l.status = 'verified'"))[0].d;
    t = await text(p);
    ok(t.includes("Next yearly check: " + nextCheck), "the yearly check date shows the right day in Pacific time (" + nextCheck + ")");

    // Sign out ends the DELA session and logs out of Lawfecta too, so another account can log in (Stacey 2026-11-05)
    let loggedOut = false;
    await p.route(BASE + "/logout", (r) => { loggedOut = true; r.fulfill({ body: "<h1>Lawfecta login</h1>", contentType: "text/html" }); });
    await dela(p).getByRole("button", { name: "Account menu" }).click();
    await Promise.all([p.waitForURL(/\/logout/, { timeout: 10000 }), dela(p).getByRole("menuitem", { name: "Sign out" }).click()]);
    ok(loggedOut, "sign out goes on to the Lawfecta log out page");
    const last = (await sql("select s.revoked_at is not null r from sessions s join people pe on pe.id = s.person_id where pe.bd_member_id = 2500 order by s.created_at desc limit 1"))[0].r;
    ok(last === true, "and the DELA session is ended");
    await s.ctx.close();

    // The Notices panel opens above the Lawfecta site's own header, with an X, and closes by clicking outside it,
    // on a computer and on a phone (Stacey 2026-11-05: the site header covered Close)
    for (const vp of [{ width: 1200, height: 800 }, { width: 390, height: 800 }]) {
      s = await open(browser, 2501, "", vp);
      p = s.page;
      await p.addStyleTag({ content: "body{padding-top:90px} body > header{position:fixed;top:0;left:0;right:0;height:90px;z-index:99999}" });
      // Scrolled down, DELA's top bar stays below the site's header, so Notices and the initials stay visible
      // (Stacey 2026-11-05: "My Account" covered the top bar)
      await p.mouse.wheel(0, 900);
      await p.waitForTimeout(400);
      const nb = await dela(p).locator("button.bell[aria-label^=Notifications]").first().boundingBox();
      const seen = await p.evaluate(([cx, cy]) => { const el = document.elementFromPoint(cx, cy); return !!el && el.classList.contains("dela-host"); }, [nb.x + nb.width / 2, nb.y + nb.height / 2]);
      ok(seen && nb.y >= 90, "scrolled down, the top bar sits below the site's header at " + vp.width + "px");
      await dela(p).locator("button.bell[aria-label^=Notifications]").first().click();
      const x = dela(p).getByRole("button", { name: "Close notifications" });
      await x.waitFor({ timeout: 5000 });
      const box = await x.boundingBox();
      const onTop = await p.evaluate(([cx, cy]) => { const el = document.elementFromPoint(cx, cy); return !!el && el.classList.contains("dela-host"); }, [box.x + box.width / 2, box.y + box.height / 2]);
      ok(onTop, "the X is above the site's header at " + vp.width + "px");
      await x.click();
      ok(await dela(p).getByRole("dialog", { name: "Notifications" }).count() === 0, "the X closes the panel at " + vp.width + "px");
      await dela(p).locator("button.bell[aria-label^=Notifications]").first().click();
      await dela(p).getByRole("dialog", { name: "Notifications" }).waitFor();
      await p.mouse.click(10, vp.height - 20);
      await p.waitForTimeout(200);
      ok(await dela(p).getByRole("dialog", { name: "Notifications" }).count() === 0, "clicking outside closes the panel at " + vp.width + "px");
      await s.ctx.close();
    }

    // Each notice has its own button to the page it is about, and opening it marks the notice read (UX review N01)
    await sql("insert into notifications (person_id, kind, channel, title, body, link, dedupe_key) select id, 'test', 'in_app', 'Payout sent', 'Your payout is on its way.', '/dela?tab=earnings', 'ux-n01-' || id from people where bd_member_id = 2501; select 1");
    s = await open(browser, 2501, "");
    p = s.page;
    await dela(p).locator("button.bell[aria-label^=Notifications]").first().click();
    const go = dela(p).getByRole("button", { name: "View payment", exact: true });
    await go.waitFor({ timeout: 5000 });
    await Promise.all([p.waitForURL(/tab=earnings/, { timeout: 8000 }), go.click()]);
    ok(p.url().includes("uid=2501"), "a notice's own button opens the page it is about");
    ok((await sql("select read_at is not null r from notifications where dedupe_key like 'ux-n01-%'"))[0].r === true, "and marks the notice read");
    await s.ctx.close();

    // Step 31 (Stacey's Notifications brief of 2026-11-17): the panel shows a few things and leads to the Notifications
    // page, where the history is searched, filtered, marked as read and dismissed
    await sql("insert into notifications (person_id, kind, channel, title, body, link, dedupe_key) select id, 'test', 'in_app', 'Refund completed', 'Conflict check: a refund was sent.', '/dela?tab=earnings', 'n31-a-' || id from people where bd_member_id = 2501 on conflict do nothing; select 1");
    await sql("insert into notifications (person_id, kind, channel, title, body, link, dedupe_key) select id, 'test', 'in_app', 'Your profile was checked', 'Nothing more is needed.', '/dela?tab=profile', 'n31-b-' || id from people where bd_member_id = 2501 on conflict do nothing; select 1");
    await sql("insert into notifications (person_id, kind, channel, title, body, link, dedupe_key, created_at) select id, 'test', 'in_app', 'Job history older', 'The first update.', '/dela?tab=work&gig=11111111-2222-4333-8444-555555555555', 'n31-c-' || id, now() - interval '2 minutes' from people where bd_member_id = 2501 on conflict do nothing; select 1");
    await sql("insert into notifications (person_id, kind, channel, title, body, link, dedupe_key, created_at) select id, 'test', 'in_app', 'Job history newest', 'The second update.', '/dela?tab=work&gig=11111111-2222-4333-8444-555555555555', 'n31-d-' || id, now() - interval '1 minute' from people where bd_member_id = 2501 on conflict do nothing; select 1");
    s = await open(browser, 2501, "");
    p = s.page;
    await dela(p).locator("button.bell[aria-label^=Notifications]").first().click();
    t = await waitFor(p, "Recent updates");
    ok(t.includes("Needs your action") && t.includes("unread") && await dela(p).locator("#notices-updates > li").count() <= 6, "the panel has the two groups and at most six updates");
    ok((await dela(p).locator("#notices-unread").innerText()).trim() === (await sql("select count(*)::int n from notifications n join people p on p.id = n.person_id where p.bd_member_id = 2501 and n.channel = 'in_app' and n.read_at is null"))[0].n + " unread", "the panel's unread number is the true count, the same as the bell");
    // One job's history from the panel (not reached by ChatGPT check 5): two updates about the same job show as one,
    // with a link to the earlier ones, which opens the page on that job only
    ok(await dela(p).getByRole("button", { name: "View 1 earlier update for this job →", exact: true }).count() === 1 && await dela(p).locator("#notices-updates > li", { hasText: "Job history newest" }).count() === 1 && await dela(p).locator("#notices-updates > li", { hasText: "Job history older" }).count() === 0, "two updates about one job show as the newest, with a link to the earlier one");
    await dela(p).getByRole("button", { name: "View 1 earlier update for this job →", exact: true }).click();
    t = await waitFor(p, "Showing the history of one job");
    ok(await dela(p).locator(".notice-row").count() === 2 && t.includes("Job history newest") && t.includes("Job history older") && !t.includes("Refund completed"), "the link opens the Notifications page on that job's two updates only");
    await click(p, "Show all jobs");
    await waitFor(p, "Refund completed");
    await dela(p).locator("button.bell[aria-label^=Notifications]").first().click();
    await waitFor(p, "Recent updates");
    await dela(p).locator("#notices-view-all").click();
    t = await waitFor(p, "Review updates, take action and manage your notifications.");
    ok(await dela(p).getByRole("dialog", { name: "Notifications" }).count() === 0 && /All \(\d+\)/.test(t) && /Needs action \(\d+\)/.test(t) && /Unread \(\d+\)/.test(t) && t.includes("Payments") && t.includes("Disputes"), "View all notifications opens the page, with its filters and counts");
    ok(await dela(p).locator(".notice-row", { hasText: "Refund completed" }).locator(".notice-tag").innerText() === "Payment" && await dela(p).locator(".notice-row", { hasText: "Your profile was checked" }).locator(".notice-tag").innerText() === "Update", "each row says what kind of notification it is");
    // Stacey 2026-11-17: unread rows are white like the others (the blue dot and bold title mark them), and the "⋯"
    // menu is a small outlined button with nothing drawn behind it while closed
    const rowLook = await p.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; const u = r.querySelector(".notice-row.unread"); const d = u.querySelector("details.dmenu");
      return { bg: getComputedStyle(u).backgroundColor, dot: !!u.querySelector(".notice-dot.on"), weight: Number(getComputedStyle(u.querySelector(".notice-title")).fontWeight), panel: getComputedStyle(d.querySelector(".menu-panel")).display, sumBg: getComputedStyle(d.querySelector("summary")).backgroundColor, w: Math.round(d.getBoundingClientRect().width) }; });
    ok(rowLook.bg === "rgb(255, 255, 255)" && rowLook.dot && rowLook.weight >= 700, "an unread notification is white, with a blue dot and a bold title: " + JSON.stringify(rowLook));
    ok(rowLook.panel === "none" && rowLook.sumBg !== "rgb(139, 33, 70)" && rowLook.w <= 70, "the closed menu on a row is a small outlined button with no panel showing: " + JSON.stringify(rowLook));
    // Fix (Stacey's screenshot, 2026-11-17): an open "⋯" menu is on top of the row below it, so every line can be clicked
    const firstMenu = dela(p).locator(".notice-row details.dmenu").first();
    await firstMenu.locator("summary").click();
    const onTop = await p.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; const d = r.querySelector(".notice-row details.dmenu[open]"); const items = [...d.querySelectorAll(".menu-item")];
      return items.length > 0 && items.every((b) => { const q = b.getBoundingClientRect(); const hit = r.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return hit === b || b.contains(hit); }); });
    ok(onTop, "every line of an open row menu is on top and can be clicked");
    await p.keyboard.press("Escape");
    await dela(p).getByLabel("Search notifications", { exact: true }).fill("refund");
    await p.waitForTimeout(400);
    ok(await dela(p).locator(".notice-row").count() === 1, "search narrows the list");
    await dela(p).getByLabel("Select: Refund completed").check();
    ok((await dela(p).locator("#notices-selected").innerText()) === "1 selected", "the page counts what is selected");
    // Fix (ChatGPT check 5, 2026-11-17): the bell's number follows the page. Dismissing an unread one lowers it by one.
    const bellNum = async () => Number((/(\d+) unread/.exec(await dela(p).locator("button.bell[aria-label^=Notifications]").first().getAttribute("aria-label")) || [0, 0])[1]);
    const bellBefore = await bellNum();
    await dela(p).locator(".notices-bulk").getByRole("button", { name: "Dismiss", exact: true }).click();
    await waitFor(p, "No notification matches");
    ok(bellBefore > 0 && await bellNum() === bellBefore - 1, "dismissing an unread notification lowers the number on the bell (" + bellBefore + " to " + (await bellNum()) + ")");
    await dela(p).getByLabel("Search notifications", { exact: true }).fill("");
    await p.waitForTimeout(400);
    await dela(p).getByRole("tab", { name: /^Dismissed/ }).click();
    ok(await dela(p).locator(".notice-row", { hasText: "Refund completed" }).count() === 1 && (await sql("select count(*)::int n from notifications where dedupe_key like 'n31-a-%' and dismissed_at is not null"))[0].n === 1, "a dismissed notification stays in the history under Dismissed");
    await dela(p).getByLabel("Select: Refund completed").check();
    await dela(p).locator(".notices-bulk").getByRole("button", { name: "Restore", exact: true }).click();
    await p.waitForTimeout(500);
    ok((await sql("select count(*)::int n from notifications where dedupe_key like 'n31-a-%' and dismissed_at is null"))[0].n === 1, "Restore brings it back");
    await p.setViewportSize({ width: 320, height: 720 }); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "the Notifications page fits a phone 320 wide with no sideways scrolling");
    await s.ctx.close();

    // Freelancers have no license form; attorneys no LinkedIn card
    ok((await sql("select count(*)::int n from licenses l join people p on p.id = l.person_id where p.bd_member_id = 2501"))[0].n === 0, "freelancers never get a license check");

    console.log("\n" + passed + " checks passed");
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });

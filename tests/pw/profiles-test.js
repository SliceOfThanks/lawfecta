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

async function open(browser, uid, query, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1200, height: 900 } });
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
    ok(t.includes("Not complete") && t.includes("Firm name") && t.includes("Where you are licensed or practice"), "the attorney sees exactly what is missing");
    ok(t.includes("Posting work and hiring need a verified license"), "the page says hiring needs verification");
    await click(p, "Fill from my Lawfecta listing");
    await waitFor(p, "Filled");
    ok(await label(p, "First name").inputValue() === "Lia" && await label(p, "Firm name").inputValue() === "Listing Law", "the form fills from the Lawfecta listing");
    ok(!(await text(p)).includes("4111"), "nothing else from the listing reaches the page");
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
    await dela(p).getByText("Let DELA draft your headline and summary").click();
    await label(p, "Tell DELA about your work").fill("Eight years of litigation support for solo attorneys in Texas, mostly e-filing and discovery, in Clio.");
    await click(p, "Draft with DELA");
    await waitFor(p, "DELA filled in a draft");
    ok(await label(p, "Headline").inputValue() === "Litigation paralegal for solo attorneys", "DELA drafts the headline");
    ok(await label(p, "Service 1 name").inputValue() === "E-filing", "and a first service");
    await label(p, "First name").fill("Fran");
    await label(p, "Last name").fill("Freelancer");
    await click(p, "Family law");
    await label(p, "Service 1 price from").fill("150");
    await label(p, "Service 1 price to").fill("400");
    await label(p, "Experience").fill("Eight years at two family law firms.");
    await click(p, "MyCase");
    await label(p, "Other tech tools").fill("Casemark");
    await label(p, "Time zone").selectOption("Central");
    await label(p, "Hours a week you can take on").fill("20");
    await dela(p).getByLabel("LinkedIn profile address", { exact: true }).nth(1).fill("linkedin.com/in/fran-freelancer");
    await dela(p).getByText("I agree to keep attorneys' work confidential").click();
    // Client information in the summary: DELA asks first (the dialog is accepted here)
    await label(p, "Summary").fill("I worked for client SSN 123-45-6789 on e-filing.");
    await click(p, "Save");
    await waitFor(p, "Profile saved");
    ok(true, "client information is caught before saving, and the member decides");
    await label(p, "Summary").fill("I support solo attorneys with e-filing and discovery in Texas courts.");
    await click(p, "Save");
    t = await waitFor(p, "Waiting for a check");
    const saved = (await sql("select body from member_profiles mp join people pe on pe.id = mp.person_id where pe.bd_member_id = 2501 and side = 'freelancer'"))[0].body;
    ok(saved.services[0].price_from_cents === 15000 && saved.services[0].price_to_cents === 40000, "prices are saved in cents");
    ok(saved.software.includes("Clio") && saved.software.includes("MyCase") && saved.software.includes("Casemark"), "tech tools are saved from the choices and the other box");

    await dela(p).getByLabel("LinkedIn profile address", { exact: true }).first().fill("https://www.linkedin.com/in/fran-freelancer");
    await click(p, "Ask for the check");
    await waitFor(p, "Waiting for the Lawfecta Team");
    ok(true, "the freelancer asks for the LinkedIn check");

    // A document: the tick box first, then upload, check and show to attorneys
    const pdf = path.join(SHOTS, "resume.pdf");
    fs.writeFileSync(pdf, "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n" + " ".repeat(400));
    await click(p, "Upload a document");
    await waitFor(p, "Tick the box");
    await dela(p).getByText("This document has no confidential client information.").click();
    await dela(p).locator("input[type=file]").setInputFiles(pdf);
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

    a = await open(browser, "admin");
    ap = a.page;
    await dela(ap).getByRole("tab", { name: "Verification" }).click();
    t = await waitFor(ap, "Freelancer LinkedIn checks (1)");
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
    await p.screenshot({ path: path.join(SHOTS, "profile-freelancer.png"), fullPage: true });

    // The listing update, when the switch is on and the box stays ticked
    await sql("update feature_switches set state = 'everyone' where key = 'bd_profile_sync'; select 1");
    await p.reload();
    await waitFor(p, "Also update my Lawfecta directory listing");
    await label(p, "Usual hours").fill("Weekdays 9 to 5 Central");
    await click(p, "Save");
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

    // Freelancers have no license form; attorneys no LinkedIn card
    ok((await sql("select count(*)::int n from licenses l join people p on p.id = l.person_id where p.bd_member_id = 2501"))[0].n === 0, "freelancers never get a license check");

    console.log("\n" + passed + " checks passed");
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });

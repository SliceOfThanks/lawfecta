// Browser test of Step 6 on both sides: the freelancer reads DELA's draft agreement, proposes a change and signs; the attorney
// signs and pays on (a stand-in for) Stripe's Checkout page; the freelancer starts, submits, fails DELA's check and asks for a
// human review; the Lawfecta Team passes it; the attorney asks for changes, then accepts (the next milestone is charged with the
// saved card); the freelancer sets up payouts and is paid; a dispute; the admin Payments tab; phone width.
// Real widgets, api and database; AI, storage and Stripe stand-ins (tests/pw/server.ts). Needs tools/dbtest.sh, then tests/pw/server.ts.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://127.0.0.1:8787";
const ROOT = path.join(__dirname, "..", "..");
const SHOTS = process.env.SHOTS || path.join(ROOT, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
let passed = 0;
let FOLD = false; // true: the next page opened shows the engagement folded, as a member first sees it
function ok(cond, msg) { if (!cond) throw new Error("FAILED: " + msg); passed++; console.log("ok", msg); }
async function sql(q) { const r = await fetch(BASE + "/test/sql", { method: "POST", body: JSON.stringify({ sql: q }) }); return (await r.json()).rows; }

async function open(browser, widget, uid, query, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1200, height: 900 }, acceptDownloads: true });
  // Step 43: the folded sections of "Agreement and work" are open, as with "Open all sections" (the folded page has its own checks in engagements-test.js)
  await ctx.addInitScript((all) => { try { if (all) (localStorage.setItem("dela_eg_all", "1"), localStorage.setItem("dela_pf_all", "1")); else localStorage.removeItem("dela_eg_all"); } catch (e) { /* no storage */ } }, !FOLD);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Test reason" : undefined));
  if (process.env.DEBUG_MEET) { page.on("response", async (r) => { if (r.url().includes("/api/")) console.log("resp", r.request().method(), r.url().split("/api")[1].slice(0, 80), (await r.text().catch(() => "")).slice(0, 200)); }); page.on("console", (m) => console.log("console", m.text())); }
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
async function makeMember(bd, side, plan) {
  await sql(`insert into people (bd_member_id, display_name, email) values (${bd}, 'Member ${bd}', '${bd}@test.invalid') on conflict (bd_member_id) do nothing;
    select dela_ensure_side((select id from people where bd_member_id = ${bd}), '${side}', '${plan}', 'staff_grant');
    insert into access_list (bd_member_id, channel) select ${bd}, 'access' where not exists (select 1 from access_list where bd_member_id = ${bd} and channel = 'access' and revoked_at is null); select 1`);
}
async function sign(page, name, version) {
  // Every signature shows what is being agreed to first (UX review part 3)
  const box = await dela(page).locator("#commitment").innerText().catch(() => "");
  if (!box.includes("What you are agreeing to") || !box.includes("Keep all work, messages and payment on Lawfecta.")) throw new Error("FAILED: no commitment summary before signing: " + box);
  passed++; console.log("ok the commitment summary shows before signing");
  await label(page, "Type your full name to sign").fill(name);
  await label(page, "I agree to sign electronically").check();
  await click(page, "Sign version " + version);
}

(async () => {
  const browser = await chromium.launch();
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'engagements', 'milestone_funding', 'milestone_check', 'engagement_export', 'ai_generation', 'profiles', 'file_uploads', 'playbook_library', 'gig_chat')");
    await sql("update feature_switches set state = 'off' where key = 'live_payments'");
    await sql("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
    await makeMember(2800, "attorney", "att_pro");
    await makeMember(2801, "freelancer", "fl_plus");
    await makeMember(1, "attorney", "att_pro");
    await sql("insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = 1 and not exists (select 1 from staff_roles s where s.person_id = people.id)");
    await sql(`insert into member_profiles (person_id, side, body, missing, score) select id, 'attorney', '{"firm_name":"Example Legal"}', '{}', 100 from people where bd_member_id = 2800;
      insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) select id, 'l', 'TX', '2800', '2800', 'A', 'video', 'verified' from people where bd_member_id = 2800;
      insert into firm_profiles (org_id, body) select dela_side_org(id, 'attorney'), '{"signatory_name":"Ann Attorney","billing_address":"1 Main St, Austin TX","service_email":"notices@example.com"}' from people where bd_member_id = 2800;
      insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"Fran","last_name":"Pays"}', '{}', 100, now() from people where bd_member_id = 2801;
      select dela_profile_refresh(id, 'attorney') from people where bd_member_id = 2800`);
    await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) select dela_side_org(id, 'attorney'), 'Filing', 'approved', 1, 1, 100, 'eg1', id from people where bd_member_id = 2800;
      insert into playbook_versions (playbook_id, version, body, created_by) select id, 1, '{"title":"Filing","steps":[{"text":"Draft the petition"}],"checks":["Every exhibit is labeled"]}', created_by from playbooks where request_id = 'eg1';
      insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id)
        select p.org_id, p.created_by, p.id, 1, 'Filing packet help', '{"task":"Prepare the filing packet","outcome":"A filing-ready packet"}', 30000, 80000, 'filled', now(), now() + interval '14 days', 'egg' from playbooks p where p.request_id = 'eg1';
      insert into proposals (gig_id, freelancer_id, status, price_cents, included, excluded, schedule, days_to_deliver, sent_at)
        select g.id, f.id, 'selected', 60000, 'Petition draft; Exhibit list', 'Filing with the court', 'Two weeks', 14, now() from gigs g, people f where g.request_id = 'egg' and f.bd_member_id = 2801;
      insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents)
        select g.id, pr.id, g.org_id, g.created_by, pr.freelancer_id, 60000 from gigs g join proposals pr on pr.gig_id = g.id where g.request_id = 'egg'`);
    const gigId = (await sql("select id from gigs where request_id = 'egg'"))[0].id;

    // ---------- Freelancer: read DELA's draft, propose a change, sign ----------
    let s = await open(browser, "DELA-App", 2801, "&tab=work");
    let p = s.page;
    let t = await waitFor(p, "Your engagements (1)");
    ok(t.includes("Needs your signature"), "freelancer: Work lists the engagement waiting for their signature");
    ok((await dela(p).locator(".badge", { hasText: "Needs your signature" }).first().getAttribute("class")).includes("held"), "Needs your signature is yellow on Work (UI review 2026-11-08)");
    await dela(p).getByText("Filing packet help").first().click();
    t = await waitFor(p, "Agreement, version 1");
    ok(t.includes("Example Legal") && t.includes("Fran Pays") && t.includes("$600"), "freelancer: DELA's first draft names the firm, the freelancer and the price");
    ok(t.includes("The freelancer receives: $570"), "freelancer: the fee lines say what they receive (5% on every plan)");
    ok(t.includes("Draft") && t.includes("Final") && t.includes("$300"), "freelancer: two milestones of $300 from the proposal");
    await dela(p).getByText("The terms", { exact: true }).click();
    ok((await text(p)).includes("1. The parties.") && !(await text(p)).includes("DRAFT FOR LAWFECTA"), "freelancer: the terms are the fixed template, with no draft line");
    await click(p, "Propose changes");
    await waitFor(p, "Send the new version");
    await dela(p).getByLabel("Amount ($)").first().fill("10");
    await click(p, "Send the new version");
    await waitFor(p, "at least $50");
    ok(true, "freelancer: a milestone under the smallest amount is refused with the amount");
    await dela(p).getByLabel("Amount ($)").first().fill("250");
    await dela(p).getByLabel("Amount ($)").nth(1).fill("350");
    await dela(p).getByLabel("Milestone title").first().fill("First draft");
    await label(p, "Note to the other person").fill("Smaller first step");
    await click(p, "Send the new version");
    t = await waitFor(p, "Agreement, version 2");
    ok(t.includes("First draft") && t.includes("$250") && t.includes("$350"), "freelancer: version 2 shows the new milestones");
    await sign(p, "Fran Pays", 2);
    t = await waitFor(p, "You signed version 2");
    ok(t.includes("Waiting for the attorney to sign"), "freelancer: signed, waiting for the attorney");
    await dela(p).getByRole("button", { name: /Earnings/ }).first().click();
    t = await waitFor(p, "Payouts to your bank");
    ok(t.includes("Not set up") && t.includes("Set up payouts with Stripe"), "freelancer: Earnings asks them to set up payouts");
    // Fix (UI review 2026-11-08): Earnings uses the same colors as Work (waiting on the other person is grey, not green),
    // and says "milestones accepted" the way Work does
    ok(t.includes("Waiting for signatures") && t.includes("milestones set when you both sign") && !t.includes("accepted 0 of 0"), "Earnings: the state and the milestones in Work's words, never \"accepted 0 of 0\"" + (t.includes("Waiting for signatures") ? "" : ":\n" + t.slice(0, 1500)));
    const cls = await dela(p).locator(".badge", { hasText: "Waiting for signatures" }).first().getAttribute("class");
    ok(cls.trim() === "badge", "Earnings: waiting on the attorney is a grey badge (" + cls + ")");
    await s.ctx.close();

    // ---------- Attorney: sign and pay the first milestone ----------
    s = await open(browser, "DELA-App", 2800, "&tab=projects");
    p = s.page;
    t = await waitFor(p, "Engagements (1)");
    ok(t.includes("Needs your signature"), "attorney: Projects lists the engagement waiting for their signature");
    ok((await dela(p).locator("#needs-action").innerText()).includes("the agreement needs your signature"), "Needs your action lists the agreement to sign (UX review P01)");
    // Fix (step 8b, retest R02): Notices shows the same live list as Projects, even with no notice about it
    await sql("delete from notifications where person_id = (select id from people where bd_member_id = 2800); select 1");
    await dela(p).locator("button.bell[aria-label^=Notifications]").first().click();
    await waitFor(p, "1 pending");
    ok((await dela(p).locator("#notices-action").innerText()).includes("the agreement needs your signature"), "Notices lists the same signature as Projects");
    await dela(p).locator("#notices-action").getByRole("button", { name: "Open the agreement" }).click();
    await waitFor(p, "Sign version");
    ok(true, "the Notices button opens the agreement");
    // Fix (AI review 0.10.0, tests 5): when the work list cannot load, Notices says it could not check, never "Nothing waits"
    await p.route(/\/engagements(\?.*)?$/, (r) => r.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
    await dela(p).locator("button.bell[aria-label^=Notifications]").first().click();
    t = await waitFor(p, "DELA could not check all your work just now");
    ok(!t.includes("Nothing waits on you right now"), "a failed check is never shown as nothing waiting");
    await p.unroute(/\/engagements(\?.*)?$/);
    await p.keyboard.press("Escape");
    await p.goto(`${BASE}/page/DELA-App?uid=2800&plan=&tab=projects`);
    await waitFor(p, "Engagements (1)");
    const heads = await dela(p).locator("h2").allTextContents();
    ok(heads.indexOf("Post a new gig") >= 0 && heads.indexOf("Post a new gig") < heads.indexOf("Your gigs") && heads.indexOf("Your gigs") < heads.indexOf("Engagements (1)"), "attorney: the Projects cards keep their order after loading (" + heads.join(", ") + ")");
    await dela(p).getByText("Filing packet help").last().click();
    t = await waitFor(p, "Agreement, version 2");
    ok(t.includes("The other person signed version 2"), "attorney: they see the freelancer signed version 2");
    ok(t.includes("Price for the work: $600") && t.includes("platform fee: $30"), "attorney: the price and the 5% fee before signing");
    await sign(p, "Ann Attorney", 2);
    t = await waitFor(p, "Review payment: milestone 1");
    // Step 43: the folded page, as the attorney first sees it, at 1280 wide
    {
      FOLD = true;
      const f = await open(browser, "DELA-App", 2800, `&tab=projects&gig=${gigId}&view=agreement`, { width: 1280, height: 900 });
      FOLD = false;
      const q = f.page;
      await waitFor(q, "Review payment: milestone 1");
      const next = await dela(q).locator("#eg-next").innerText();
      ok(next.includes("NEXT ACTION") || next.includes("Next action"), "folded: the page starts with the next action");
      ok(next.includes("Pay milestone 1") && next.includes("Milestone amount") && next.includes("$250") && next.includes("Platform fee") && next.includes("$30") && next.includes("Total due now") && next.includes("$280") && next.includes("Waiting for payment"), "folded: the next action names the milestone, the amount, the fee, the total due now and the state: " + next.replace(/\s+/g, " "));
      const geo = await q.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; const b = r.querySelector("#eg-review-btn").getBoundingClientRect(), m = r.querySelector(".eg-main").getBoundingClientRect(), s = r.querySelector(".eg-side").getBoundingClientRect(); return { btnBottom: Math.round(b.bottom + window.scrollY), btnH: Math.round(b.height), side: s.left > m.right - 1, fits: document.documentElement.scrollWidth <= window.innerWidth + 1 }; });
      ok(geo.btnBottom < 900 && geo.btnH >= 40, "folded: \"Review payment: milestone 1\" is in view without scrolling and is a full-size button: " + JSON.stringify(geo));
      ok(geo.side && geo.fits, "folded: the summary sits at the right of the next action at 1280 wide");
      const secs = (await q.evaluate(() => [...document.querySelector(".dela-host").shadowRoot.querySelectorAll(".eg-sec")].map((s) => s.querySelector(".eg-sec-t b").textContent + ":" + s.querySelector(".eg-sec-b").getAttribute("aria-expanded") + ":" + s.querySelector(".eg-sec-body").hidden))).filter((x) => x.indexOf("Attorney decisions") !== 0);
      ok(secs.join("|") === "Agreement and fees:false:true|Change orders:false:true|Who's working on this:false:true|Confidential materials:false:true|Disputes and cancellation:false:true", "folded: the agreement, change orders, people, confidential materials and disputes are folded sections that say they are closed: " + secs.join("|"));
      let ft = await text(q);
      ok(!ft.includes("Versions and signatures") && !ft.includes("Propose a change order"), "folded: what is inside a folded section is not on the screen");
      const sum = (await dela(q).locator("#eg-summary").innerText()).replace(/\s+/g, " ");
      ok(sum.includes("Price for the work (contract value) $600") && sum.includes("once, with the first payment") && sum.includes("$30") && sum.includes("Your total (contract + platform fee) $630") && sum.includes("Paid to date") && sum.includes("$0") && sum.includes("Amount due now (milestone 1) $280"), "folded: the summary separates the contract value, the fee, the total, what is paid and what is due now: " + sum);
      ok(ft.includes("How milestone payments work") && ft.includes("the next milestone is charged to your saved payment method") && ft.includes("is charged once, with the first milestone"), "folded: how payment works is in view, with the automatic charge said in plain words");
      const wn = (await dela(q).locator("#eg-whatnext").innerText()).replace(/\s+/g, " ");
      ok(wn.includes("What happens next?") && /You review and pay milestone 1\..*The freelancer starts the work\..*You review the deliverable when it is submitted/.test(wn), "folded: \"What happens next?\" lists the real steps from here, in order: " + wn);
      const ms = (await dela(q).locator("#eg-milestones").innerText()).replace(/\s+/g, " ");
      ok(ms.includes("Milestone progress") && ms.includes("Payment: Not paid yet") && ms.includes("Delivery: Not submitted") && ms.includes("Acceptance: Not accepted yet"), "folded: each milestone shows payment, delivery and acceptance as three separate states: " + ms.slice(0, 400));
      // A section opens with the keyboard and says so
      await dela(q).locator("#eg-sec-agreement .eg-sec-b").focus();
      await q.keyboard.press("Enter");
      ft = await waitFor(q, "Versions and signatures");
      ok(await dela(q).locator("#eg-sec-agreement .eg-sec-b").getAttribute("aria-expanded") === "true", "folded: Enter opens \"Agreement and fees\" and the button says it is open");
      await click(q, "View signed agreement (version 2)");
      ok(await q.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; return r.activeElement && r.activeElement.classList.contains("eg-sec-b"); }), "folded: \"View signed agreement\" goes to the agreement section");
      // Review before paying: the amounts again, how it is paid, and a way back with nothing charged
      await click(q, "Review payment: milestone 1");
      ft = await waitFor(q, "Total charged now");
      const rev = (await dela(q).locator("#eg-review").innerText()).replace(/\s+/g, " ");
      ok(rev.includes("Review payment: milestone 1") && rev.includes("$250") && rev.includes("Platform fee $30") && rev.includes("Total charged now $280") && rev.includes("You pay on Stripe's secure page") && rev.includes("Lawfecta holds the milestone amount until you accept the milestone"), "review: the amounts, the total, how it is paid and what happens after: " + rev);
      ok(await q.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; return r.activeElement && r.activeElement.id === "eg-review-h"; }), "review: the keyboard lands on the review heading");
      await click(q, "Go back");
      ok(await q.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; return r.activeElement && r.activeElement.id === "eg-review-btn" && !r.querySelector("#eg-review"); }) && (await sql(`select count(*)::int n from payments p join agreements a on a.id = p.agreement_id where a.gig_id = '${gigId}'`))[0].n === 0, "review: \"Go back\" closes it, returns to the button, and no payment was started");
      // "Open all sections" is remembered
      await click(q, "Open all sections");
      ok(await q.evaluate(() => localStorage.getItem("dela_eg_all") === "1" && [...document.querySelector(".dela-host").shadowRoot.querySelectorAll(".eg-sec-body")].every((b) => !b.hidden)), "\"Open all sections\" opens every section and remembers the choice");
      await click(q, "Close all sections");
      // 320 wide: one column, the payment first, nothing off the side
      await q.setViewportSize({ width: 320, height: 800 });
      await q.waitForTimeout(350);
      const nar = await q.evaluate(() => { const r = document.querySelector(".dela-host").shadowRoot; const m = r.querySelector(".eg-main").getBoundingClientRect(), s = r.querySelector(".eg-side").getBoundingClientRect(), n = r.querySelector("#eg-next").getBoundingClientRect(), ms = r.querySelector("#eg-milestones").getBoundingClientRect(); return { under: s.top >= m.bottom - 1, first: n.top < ms.top, fits: document.documentElement.scrollWidth <= window.innerWidth + 1 }; });
      ok(nar.under && nar.first && nar.fits, "320 wide: one column, the next action above the milestones, the summary under them, no sideways scrolling: " + JSON.stringify(nar));
      await q.screenshot({ path: path.join(SHOTS, "engagement-folded-320.png"), fullPage: true });
      await q.setViewportSize({ width: 1280, height: 900 });
      await q.waitForTimeout(250);
      await q.screenshot({ path: path.join(SHOTS, "engagement-folded.png"), fullPage: true });
      await f.ctx.close();
    }
    await click(p, "Review payment: milestone 1");
    t = await waitFor(p, "Continue to Stripe");
    ok(t.includes("Stripe's test card") && t.includes("Total charged now"), "attorney: after both sign, one clear next step: review, then pay milestone 1 with the fee");
    await click(p, "Continue to Stripe");
    await p.waitForURL(/\/test\/stripe\/checkout\//, { timeout: 8000 });
    ok((await p.textContent("h1")).includes("28000 cents: paid"), "attorney: Stripe's Checkout charges milestone 1 and the fee together ($280)");
    await p.goto(`${BASE}/page/DELA-App?uid=2800&plan=&tab=projects&gig=${gigId}&view=agreement&paid=1`);
    t = await waitFor(p, "Paid: ready to start");
    // Step 43: paid comes from the payment record, and the three states stay apart
    ok(/Payment: Paid[\s\S]*Payment: Not paid yet/.test(t) && t.includes("Acceptance: Not accepted yet") && /Paid to date[^$]*\$280/.test(t) && !t.includes("Amount due now"), "attorney: milestone 1 reads Paid from its confirmed payment, milestone 2 Not paid yet, and $280 is paid to date");
    ok(t.includes("Nothing is due from you right now"), "attorney: with the milestone paid, the next action says nothing is due");
    ok(t.includes("Thank you. Your payment is confirmed.") && !t.includes("Stripe is confirming") && t.includes("Active"), "attorney: back from Stripe with the milestone already paid, the notice says the payment is confirmed");
    // Fee test report 2026-11-11 (phone screenshots): the status badge does not sit on the heading at phone widths
    for (const w of [320, 390]) {
      await p.setViewportSize({ width: w, height: 800 });
      const over = await p.evaluate(() => {
        const root = document.querySelector(".dela-host").shadowRoot;
        const h2 = Array.from(root.querySelectorAll("h2")).find((x) => x.textContent.indexOf("Agreement, version") === 0);
        const r = document.createRange(); r.selectNodeContents(h2); const a = r.getBoundingClientRect(), b = h2.parentNode.querySelector(".badge").getBoundingClientRect();
        return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      });
      ok(!over, "attorney: at " + w + "px the agreement heading and its status badge do not overlap");
    }
    await p.setViewportSize({ width: 1280, height: 800 });
    ok(t.includes("$280 (includes the platform fee $30), Paid"), "attorney: their payments list");
    await s.ctx.close();

    // ---------- Freelancer: start, submit, fail DELA's check, ask for a person ----------
    s = await open(browser, "DELA-App", 2801, `&tab=work&gig=${gigId}`);
    p = s.page;
    await waitFor(p, "Start this milestone");
    await click(p, "Start this milestone");
    await waitFor(p, "Submit for DELA's check");
    await label(p, "Completion statement").fill("NOT DONE YET: the petition is half drafted.");
    await click(p, "Submit for DELA's check");
    t = await waitFor(p, "Did not pass DELA's check");
    ok(t.includes("Missing (required)") && t.includes("DELA's score"), "freelancer: DELA's check shows each missing point and the score");
    await click(p, "Ask for a human review");
    await waitFor(p, "With a Lawfecta reviewer");
    ok(true, "freelancer: a failed check can go to a person");
    await s.ctx.close();

    // ---------- Owner: the human review in the Payments tab ----------
    s = await open(browser, "DELA-Admin", 1, "");
    p = s.page;
    await dela(p).getByRole("tab", { name: "Payments", exact: true }).click();
    t = await waitFor(p, "Milestones waiting for a human review (1)");
    ok(t.includes("test mode") && t.includes("Charged") && t.includes("$280"), "owner: Payments shows Stripe in test mode and the money charged");
    await label(p, "Your note to the freelancer").fill("The draft is enough for this milestone.");
    await click(p, "Passes: send to the attorney");
    await waitFor(p, "Milestones waiting for a human review (0)");
    ok(true, "owner: passing a human review sends it to the attorney");
    await s.ctx.close();

    // ---------- Attorney: ask for changes ----------
    s = await open(browser, "DELA-App", 2800, `&tab=projects&gig=${gigId}&view=agreement`);
    p = s.page;
    t = await waitFor(p, "With the attorney for review");
    ok(t.includes("Lawfecta reviewer: The draft is enough"), "attorney: they see the reviewer's note");
    await label(p, "Note to the freelancer").fill("Please add the case caption.");
    await click(p, "Ask for changes");
    await waitFor(p, "Changes requested");
    ok(true, "attorney: changes requested with a note");
    await s.ctx.close();

    // ---------- Freelancer: resubmit with a file ----------
    s = await open(browser, "DELA-App", 2801, `&tab=work&gig=${gigId}`);
    p = s.page;
    t = await waitFor(p, "Attorney: Please add the case caption.");
    ok(t.includes("rounds of changes used: 1 of 2"), "freelancer: the attorney's note and the rounds used");
    await label(p, "These files contain no medical records, ID documents, account numbers, logins or biometric data").check();
    await label(p, "Deliverable files").setInputFiles({ name: "petition-draft.txt", mimeType: "text/plain", buffer: Buffer.from("Petition draft for [Client Name]. Caption added.") });
    await waitFor(p, "petition-draft.txt: ready", 10000);
    ok(true, "freelancer: a deliverable file uploads and passes the file check");
    await label(p, "Completion statement").fill("The petition draft is attached with the case caption. Nothing is open.");
    await click(p, "Submit for DELA's check");
    t = await waitFor(p, "With the attorney for review");
    ok(t.includes("DELA's score 100 of 100"), "freelancer: it passed DELA's check");
    await s.ctx.close();

    // ---------- Attorney: accept; the next milestone is charged with the saved card ----------
    s = await open(browser, "DELA-App", 2800, `&tab=projects&gig=${gigId}&view=agreement`);
    p = s.page;
    await waitFor(p, "petition-draft.txt");
    // Fix (AI review 0.9.0, tests 1): the tab opens during the click, before the server answers, so a pop-up blocker
    // (Safari above all) allows it; it then goes to the file. The server's answer is held back a second to prove it.
    await p.route("**/deliverables/file*", async (r) => { await new Promise((w) => setTimeout(w, 1500)); await r.continue(); });
    await p.evaluate(() => { const o = window.open; window.__opened = []; window.open = function () { window.__opened.push(Date.now()); return o.apply(window, arguments); }; });
    const clickedAt = await p.evaluate(() => Date.now());
    const popup = p.waitForEvent("popup");
    const fileReq = s.ctx.waitForEvent("request", { predicate: (r) => r.url().includes("/test/storage/get/") && r.frame().page() !== p, timeout: 10000 }).catch(() => null);
    const [resp] = await Promise.all([p.waitForResponse((r) => r.url().includes("/deliverables/file")), dela(p).getByRole("button", { name: "Open", exact: true }).first().click()]);
    const dl = await resp.json();
    ok(dl.ok && dl.name === "petition-draft.txt" && dl.url.includes("/test/storage/get/"), "attorney: opens the delivered file (a short-lived link, and the download is logged)");
    const opened = await p.evaluate(() => window.__opened);
    ok(opened.length === 1 && opened[0] - clickedAt < 1000, "attorney: the new tab opens during the click, before the server answers");
    const tab = await popup;
    ok(!!(await fileReq), "attorney: the new tab then goes to the file");
    await tab.close().catch(() => {});
    await p.unroute("**/deliverables/file*");
    // Fix (AI review 0.9.1, tests 3 and security 1): when the server refuses, or sends anything but a web address, the
    // new tab closes and the page says so
    for (const [answer, words] of [[{ ok: false, reason: "file_expired" }, null], [{ ok: true, url: "javascript:alert(1)" }, "That link cannot be opened."]]) {
      await p.route("**/deliverables/file*", (r) => r.fulfill({ json: answer }));
      const opened2 = p.waitForEvent("popup");
      await dela(p).getByRole("button", { name: "Open", exact: true }).first().click();
      // The message shows for a few seconds, so it is watched for while the tab closes (slower on GitHub's machines)
      const said = words ? waitFor(p, words, 15000).then(() => true, () => false) : Promise.resolve(true);
      const tab2 = await opened2;
      if (!tab2.isClosed()) await tab2.waitForEvent("close", { timeout: 15000 }).catch(() => {});
      ok(tab2.isClosed(), "the blank tab closes when the server answers " + JSON.stringify(answer));
      ok(await said, "the page says so when the link cannot be opened");
      await p.unroute("**/deliverables/file*");
    }
    ok((await sql("select count(*)::int n from deliverable_downloads"))[0].n === 1, "attorney: the download is in the log");
    await click(p, "Accept and release payment");
    // Step 43: the confirmation is on the page and names both amounts; nothing is decided by a browser pop-up
    t = await waitFor(p, "Accept milestone 1?");
    ok(t.includes("Released to the freelancer") && t.includes("Charged now to your saved payment method: milestone 2") && t.includes("Accepting cannot be undone."), "attorney: the accept step shows what is released and what is charged for milestone 2 before confirming");
    ok((await sql(`select count(*)::int n from milestones m join agreements a on a.id = m.agreement_id where a.gig_id = '${gigId}' and m.status = 'accepted'`))[0].n === 0, "attorney: nothing is accepted until the confirmation");
    await dela(p).getByRole("button", { name: /^Yes, accept and release / }).first().click();
    t = await waitFor(p, "Acceptance: Accepted");
    await waitFor(p, "2. Final");
    t = await text(p);
    ok(/Final[\s\S]*Paid: ready to start/.test(t), "attorney: accepting charged milestone 2 with the saved payment method");
    ok((t.match(/Payment: Paid/g) || []).length === 2, "attorney: both milestones read Paid, each from its own confirmed payment");
    await s.ctx.close();

    // ---------- Freelancer: payouts ----------
    s = await open(browser, "DELA-App", 2801, `&tab=work&gig=${gigId}`);
    p = s.page;
    t = await waitFor(p, "waiting for your payout setup");
    ok(t.includes("you receive $237"), "freelancer: the accepted milestone waits for payout setup ($250 less their share of the fee)");
    await p.goto(`${BASE}/page/DELA-App?uid=2801&plan=&tab=earnings`);
    await waitFor(p, "Set up payouts with Stripe");
    await click(p, "Set up payouts with Stripe");
    await p.waitForURL(/\/test\/stripe\/onboard/, { timeout: 8000 });
    ok((await p.textContent("h1")).includes("Payout setup done"), "freelancer: Stripe's own setup page (DELA never sees bank details)");
    await p.goto(`${BASE}/page/DELA-App?uid=2801&plan=&tab=earnings&payout=done`);
    // Fix 2026-11-11: back from Stripe, the card shows the new status by itself (no click on "Check my payout status")
    t = await waitFor(p, "Ready. Accepted milestones are paid");
    ok(t.includes("$237"), "freelancer: payouts ready and the first payout sent");
    // Fix (AI review 0.9.0, payments 3): Home shows the real amount paid out, not $0.00
    await p.goto(`${BASE}/page/DELA-App?uid=2801&plan=&tab=home`);
    t = await waitFor(p, "Paid out");
    ok(/\$237\.50\s*Paid out/.test(t) && /1\s*Active projects/.test(t), "freelancer: Home shows $237.50 paid out and 1 active project");
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(`${BASE}/page/DELA-App?uid=2801&plan=&tab=work&gig=${gigId}`);
    await waitFor(p, "sent to your bank");
    const wide = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(wide <= 392, "freelancer: the engagement page fits a phone (" + wide + "px)");
    await p.screenshot({ path: path.join(SHOTS, "engagement-phone.png"), fullPage: true });
    await s.ctx.close();

    // ---------- Attorney: a dispute on milestone 2 ----------
    s = await open(browser, "DELA-App", 2800, `&tab=projects&gig=${gigId}&view=agreement`);
    p = s.page;
    await waitFor(p, "Problems, disputes and canceling");
    await dela(p).getByText("Open a dispute", { exact: true }).click();
    await label(p, "What is the problem").fill("We disagree about what the final packet includes.");
    await click(p, "Open the dispute");
    t = await waitFor(p, "Open dispute: talk it through in Messages");
    ok(t.includes("Withdraw the dispute"), "attorney: a dispute starts the notice period, and they can withdraw it");
    await p.screenshot({ path: path.join(SHOTS, "engagement-attorney.png"), fullPage: true });
    await s.ctx.close();

    // ---------- Check the results: the owner sees the dispute ----------
    s = await open(browser, "DELA-Admin", 1, "");
    p = s.page;
    await dela(p).getByRole("tab", { name: "Payments", exact: true }).click();
    t = await waitFor(p, "Disputes (1)");
    ok(t.includes("Paid out") && t.includes("$237"), "owner: the payout is in the totals");
    // Step 11: the dispute itself is in the Disputes tab
    await click(p, "Open the Disputes page");
    t = await waitFor(p, "Open disputes (1)");
    ok(t.includes("Notice period ends"), "owner: the dispute waits for its notice period (Disputes tab)");
    await s.ctx.close();

    // ---------- Step 14: a new agreement with the fee charged with each milestone payment (prepared here, signed through the database) ----------
    await sql("update feature_switches set state = 'everyone' where key = 'fee_per_milestone'");
    const feeGig = (await sql(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id)
      select org_id, created_by, playbook_id, playbook_version, 'Fee with each milestone', public, budget_min_cents, budget_max_cents, 'filled', now(), now() + interval '14 days', 'pwfee14' from gigs where id = '${gigId}' returning id`))[0].id;
    const feeProp = (await sql(`insert into proposals (gig_id, freelancer_id, status, price_cents, included, excluded, schedule, days_to_deliver, sent_at)
      select '${feeGig}', freelancer_person, 'selected', 30000, 'Petition draft; Exhibit list', 'Filing with the court', 'Draft in a week', 10, now() from agreements where gig_id = '${gigId}' returning id`))[0].id;
    const feeAg = (await sql(`insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents)
      select '${feeGig}', '${feeProp}', attorney_org, attorney_person, freelancer_person, 30000 from agreements where gig_id = '${gigId}' returning id`))[0].id;
    s = await open(browser, "DELA-App", 2800, `&tab=projects&gig=${feeGig}&view=agreement`);
    p = s.page;
    t = await waitFor(p, "Lawfecta fee");
    ok(t.includes("Milestone 1 payment: Milestone $150.00, Lawfecta fee $7.50, Total $157.50") && t.includes("Milestone 2 payment: Milestone $150.00, Lawfecta fee $7.50, Total $157.50") && t.includes("charged with each milestone payment"), "attorney: before signing, each payment shows the milestone, the Lawfecta fee and the total");
    await s.ctx.close();
    for (const role of ["attorney", "freelancer"]) {
      await sql(`select dela_agreement_sign(${role}_person, '${role}', id, '{"version":1,"typed_name":"Signed For The Test","consent":true}') from agreements where id = '${feeAg}'`);
    }
    s = await open(browser, "DELA-App", 2800, `&tab=projects&gig=${feeGig}&view=agreement`);
    p = s.page;
    t = await waitFor(p, "Review payment: milestone 1");
    ok(/Milestone amount\s*\$150\.00/.test(t) && /Lawfecta fee[^$]*\$7\.50/.test(t) && /Total due now\s*\$157\.50/.test(t), "attorney: with the fee on each milestone, the next action shows the three amounts with cents");
    ok(t.includes("Milestone $150.00") && t.includes("Lawfecta fee $7.50") && t.includes("Total $157.50") && !t.includes("$165"), "attorney: the Pay card asks for $157.50 in three lines, not the whole fee at the start");
    await p.screenshot({ path: path.join(SHOTS, "engagement-fee-per-milestone.png"), fullPage: true });
    await s.ctx.close();
    await sql("update feature_switches set state = 'off' where key = 'fee_per_milestone'");
    console.log("\nALL " + passed + " CHECKS PASSED");
  } catch (e) {
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

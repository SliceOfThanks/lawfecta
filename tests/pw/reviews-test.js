// Browser test of Step 7 on both sides: after a completed engagement the freelancer reviews the attorney, asks a past client
// for a review and sets up a webhook (and is refused an internal address); the attorney responds, writes a negative review
// (it publishes) and invites the freelancer to the bench; the freelancer accepts and uses the bench conversation (no files);
// a past client reviews on the public page with no login; the Lawfecta Team keeps a reported review up; phone width.
// Real widgets, api and database; AI, storage, DNS and webhook-receiver stand-ins (tests/pw/server.ts).
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

async function open(browser, widget, uid, query, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1200, height: 900 } });
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
async function rate(page, labels, n) { for (const l of labels) await label(page, l).selectOption(String(n)); }

(async () => {
  const browser = await chromium.launch();
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'engagements', 'reviews', 'past_client_reviews', 'bench', 'bench_suggestions', 'member_webhooks', 'gig_chat', 'ai_generation', 'profiles', 'file_uploads', 'playbook_library', 'talent_search', 'worker')");
    await sql("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
    await makeMember(2900, "attorney", "att_pro");
    await makeMember(2901, "freelancer", "fl_free");
    await makeMember(1, "attorney", "att_pro");
    await sql("insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = 1 and not exists (select 1 from staff_roles s where s.person_id = people.id)");
    await sql(`insert into member_profiles (person_id, side, body, missing, score) select id, 'attorney', '{"firm_name":"Bench Legal"}', '{}', 100 from people where bd_member_id = 2900;
      insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) select id, 'l', 'TX', '2900', '2900', 'A', 'video', 'verified' from people where bd_member_id = 2900;
      insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"Rina","last_name":"Reviews","practice_areas":["Family law"],"headline":"Family law paralegal"}', '{}', 100, now() from people where bd_member_id = 2901;
      select dela_profile_refresh(id, 'attorney') from people where bd_member_id = 2900; select dela_profile_refresh(id, 'freelancer') from people where bd_member_id = 2901`);
    await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) select dela_side_org(id, 'attorney'), 'Intake', 'approved', 1, 1, 100, 'rv1', id from people where bd_member_id = 2900;
      insert into playbook_versions (playbook_id, version, body, created_by) select id, 1, '{"title":"Intake","steps":[{"text":"a"}]}', created_by from playbooks where request_id = 'rv1';
      insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id)
        select p.org_id, p.created_by, p.id, 1, 'Intake packet', '{"task":"Intake","practice_area":"Family law"}', 30000, 80000, 'filled', now(), now() + interval '14 days', 'rvg' from playbooks p where p.request_id = 'rv1';
      insert into proposals (gig_id, freelancer_id, status, price_cents, sent_at) select g.id, f.id, 'selected', 50000, now() from gigs g, people f where g.request_id = 'rvg' and f.bd_member_id = 2901;
      insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, status, version, completed_at, signed_at, started_at)
        select g.id, pr.id, g.org_id, g.created_by, pr.freelancer_id, 50000, 'completed', 1, now(), now(), now() from gigs g join proposals pr on pr.gig_id = g.id where g.request_id = 'rvg';
      insert into milestones (agreement_id, seq, title, amount_cents, freelancer_fee_cents, status, from_version, accepted_at)
        select a.id, 1, 'Intake packet', 50000, 2500, 'accepted', 1, now() from agreements a join gigs g on g.id = a.gig_id where g.request_id = 'rvg'`);
    const gigId = (await sql("select id from gigs where request_id = 'rvg'"))[0].id;

    // ---------- Freelancer: review the attorney, ask a past client, set up a webhook ----------
    let s = await open(browser, "DELA-App", 2901, `&tab=work&gig=${gigId}&view=agreement`);
    let p = s.page;
    let t = await waitFor(p, "Closeout");
    ok(t.includes("Milestones accepted") && t.includes("1 of 1") && t.includes("Still open"), "freelancer: the closeout after completion");
    await waitFor(p, "How was working with the attorney?");
    await rate(p, ["Clear instructions", "Timely review and feedback", "Fair requests for changes", "Communication"], 5);
    await label(p, "Would you work with them again?").selectOption("yes");
    await label(p, "Your review").fill("Clear instructions and quick feedback on every draft.");
    await click(p, "Publish my review");
    t = await waitFor(p, "Your review of the attorney");
    ok(t.includes("Clear instructions and quick feedback"), "freelancer: the review publishes straight away");
    await p.goto(`${BASE}/page/DELA-App?uid=2901&plan=&tab=profile`);
    t = await waitFor(p, "Your reviews");
    await waitFor(p, "Ask a past client for a review");
    await label(p, "Their name").fill("Pat Past");
    await label(p, "Their email").fill("pat.past@lawfirm.example");
    await click(p, "Send the request");
    await waitFor(p, "Pat Past (pat.past@lawfirm.example)");
    ok(true, "freelancer: asks a past client (outside Lawfecta) for a review");
    await p.goto(`${BASE}/page/DELA-App?uid=2901&plan=&tab=ai`);
    // Step 8b Part C (R12): webhooks fold closed under "Advanced"
    t = await waitFor(p, "Advanced: webhooks");
    ok(!t.includes("Add an endpoint"), "webhooks are folded closed under Advanced");
    await dela(p).locator("#ai-advanced > summary").click();
    await waitFor(p, "Add an endpoint");
    await label(p, "Endpoint address (https)").fill("https://inside.example.com/dela");
    await label(p, "A bench invitation").check();
    await click(p, "Add the endpoint");
    await waitFor(p, "points inside a private network");
    ok(true, "freelancer: an address inside a private network is refused (test T15)");
    await label(p, "Endpoint address (https)").fill("https://hooks.example.com/dela");
    await click(p, "Add the endpoint");
    t = await waitFor(p, "Your signing secret");
    ok(t.includes("DELA will not show it again"), "freelancer: the signing secret is shown once");
    await dela(p).getByRole("button", { name: "Close signing secret" }).click();
    await waitFor(p, "https://hooks.example.com/dela");
    await click(p, "Send a test");
    await waitFor(p, "Test notice delivered (200)");
    ok(true, "freelancer: a signed test notice is delivered");
    await s.ctx.close();

    // ---------- Attorney: respond, write a negative review, invite to the bench ----------
    s = await open(browser, "DELA-App", 2900, `&tab=projects&gig=${gigId}&view=agreement`);
    p = s.page;
    t = await waitFor(p, "The review the freelancer wrote about you");
    ok(t.includes("Clear instructions and quick feedback"), "attorney: sees the freelancer's review at once");
    await label(p, "Your public response").fill("Thank you, it was a pleasure.");
    await click(p, "Post the response");
    await waitFor(p, "Response: Thank you, it was a pleasure.");
    ok(true, "attorney: posts one public response");
    await rate(p, ["Quality of the work", "Met the deadlines", "Communication", "Followed the document"], 2);
    await label(p, "Would you hire them again?").selectOption("no");
    await label(p, "Your review").fill("The packet came in two days late and needed a lot of fixing.");
    await click(p, "Publish my review");
    t = await waitFor(p, "Your review of the freelancer");
    ok(!t.includes("with the Lawfecta Team for a quick check"), "attorney: a negative review publishes (test T18)");
    await label(p, "A note with the bench invitation (optional)").fill("Thanks again.");
    await click(p, "Invite to my bench");
    await waitFor(p, "Your bench invitation is waiting for their answer.");
    ok(true, "attorney: invites the freelancer to the bench after the engagement");
    await p.goto(`${BASE}/page/DELA-App?uid=2900&plan=&tab=talent&view=bench`);
    t = await waitFor(p, "My bench (1)");
    ok(t.includes("Rina Reviews") && t.includes("Invitation sent"), "attorney: Talent, My bench lists the invitation");
    await s.ctx.close();

    // ---------- Freelancer: accept, use the bench conversation, report the review ----------
    s = await open(browser, "DELA-App", 2901, "&tab=work");
    p = s.page;
    t = await waitFor(p, "Benches (1)");
    ok(t.includes("Bench Legal") && t.includes("Thanks again."), "freelancer: the bench invitation with the note");
    await click(p, "Accept");
    await waitFor(p, "You are on their bench");
    await click(p, "Message");
    t = await waitFor(p, "your ongoing bench conversation");
    ok(!t.includes("Attach a file") && !t.includes("Book a meeting"), "freelancer: the bench conversation shares no files and books no gig meetings");
    await label(p, "Your message").fill("Happy to help with the next one.");
    await click(p, "Send");
    await waitFor(p, "Happy to help with the next one.");
    ok(true, "freelancer: sends a message in the bench conversation");
    const hits = await (await fetch(BASE + "/test/webhooks")).json();
    await sql("update jobs set run_at = now() where kind = 'webhook_send' and status in ('queued','delayed')");
    for (let i = 0; i < 4; i++) await fetch(BASE + "/api/worker", { method: "POST", headers: { "x-dela-worker": "browser-test-worker" } }).catch(() => {});
    const hits2 = await (await fetch(BASE + "/test/webhooks")).json();
    ok(hits.length >= 1 && hits2.some((x) => x.type === "test"), "freelancer: the webhook receiver got the signed test notice");
    await p.goto(`${BASE}/page/DELA-App?uid=2901&plan=&tab=work&gig=${gigId}&view=agreement`);
    await waitFor(p, "The review the attorney wrote about you");
    await click(p, "Report this review");
    await p.waitForTimeout(500);
    await p.setViewportSize({ width: 390, height: 844 });
    await p.reload(); await waitFor(p, "Reviews");
    const wide = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(wide <= 392, "freelancer: the engagement with reviews fits a phone (" + wide + "px)");
    await p.screenshot({ path: path.join(SHOTS, "reviews-phone.png"), fullPage: true });
    await s.ctx.close();

    // ---------- A past client, with no Lawfecta login ----------
    const link = (await sql("select link from notifications where to_email = 'pat.past@lawfirm.example' order by created_at desc limit 1"))[0].link;
    const token = link.split("past_review=")[1];
    s = await open(browser, "DELA-App", 0, "&past_review=" + token);
    p = s.page;
    t = await waitFor(p, "Write a review");
    ok(t.includes("Rina Reviews asked you for a short, honest review") && t.includes("There is no reward"), "past client: the public page opens with no login");
    await label(p, "State of your license (two letters)").fill("TX");
    await label(p, "Bar number").fill("x");
    await rate(p, ["Quality of the work", "Met the deadlines", "Communication", "Followed the document"], 5);
    await label(p, "Would you hire them again?").selectOption("yes");
    await label(p, "Your review").fill("Reliable and careful over two years of work.");
    await label(p, "I confirm").check();
    await click(p, "Send my review");
    await waitFor(p, "Check your bar number");
    await label(p, "Bar number").fill("24055555");
    await click(p, "Send my review");
    await waitFor(p, "Thank you");
    ok(true, "past client: a bad bar number is refused, then the review is sent");
    await s.ctx.close();

    // ---------- Owner: the reported review stays up ----------
    s = await open(browser, "DELA-Admin", 1, "");
    p = s.page;
    await dela(p).getByRole("tab", { name: "Reviews and bench" }).click();
    t = await waitFor(p, "Reported reviews (1)");
    ok(t.includes("Published reviews") && t.includes("Past-client reviews"), "owner: the Reviews and bench tab with counts");
    await label(p, "Reason (kept with the decision)").fill("An honest negative opinion stays up.");
    await click(p, "Keep it up");
    await waitFor(p, "Reported reviews (0)");
    ok(true, "owner: keeps a negative review up, with a reason");
    await s.ctx.close();

    // ---------- Check the results (test freelancer) ----------
    s = await open(browser, "DELA-App", 2901, "&tab=profile");
    p = s.page;
    t = await waitFor(p, "From past clients (outside Lawfecta)");
    ok(t.includes("Reliable and careful") && t.includes("1 review from completed Lawfecta engagements"), "freelancer: the past-client review shows in its own section, not in the count");
    await s.ctx.close();
    console.log("\nALL " + passed + " CHECKS PASSED");
  } catch (e) {
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

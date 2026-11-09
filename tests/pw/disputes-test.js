// Browser test of step 11, the dispute center (docs/briefs/step-11-disputes.md), both sides and the owner. Prepared in the
// database: a signed, paid engagement with two $300 milestones. The freelancer opens a dispute on milestone 1 asking for the
// full payment; the attorney answers, adds a link and accepts the freelancer's offer (the money moves at once); a second
// dispute on milestone 2 goes to the Lawfecta Team, who uses "Draft with DELA" and decides it in the new Disputes tab.
//   node tests/pw/disputes-test.js   (with tests/pw/server.ts running, after tools/dbtest.sh)
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
  const ctx = await browser.newContext({ viewport: viewport || { width: 1200, height: 900 }, acceptDownloads: true });
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

(async () => {
  const browser = await chromium.launch();
  let s, p, t;
  try {
    await sql("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'engagements', 'milestone_funding', 'milestone_check', 'ai_generation', 'ai_helpers', 'profiles', 'dispute_center', 'gig_chat')");
    await sql("update feature_switches set state = 'off' where key = 'live_payments'");
    await makeMember(4800, "attorney", "att_pro");
    await makeMember(4801, "freelancer", "fl_plus");
    await makeMember(1, "attorney", "att_pro");
    await sql("insert into staff_roles (person_id, role) select id, r from people, unnest(array['owner', 'finance']) r where bd_member_id = 1 and not exists (select 1 from staff_roles s where s.person_id = people.id and s.role = r)");
    await sql(`insert into member_profiles (person_id, side, body, missing, score) select id, 'attorney', '{"firm_name":"Dispute Legal"}', '{}', 100 from people where bd_member_id = 4800;
      insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) select id, 'l', 'TX', '4800', '4800', 'A', 'video', 'verified' from people where bd_member_id = 4800;
      insert into firm_profiles (org_id, body) select dela_side_org(id, 'attorney'), '{"signatory_name":"Dee Attorney","billing_address":"1 Main St, Austin TX","service_email":"notices@example.com"}' from people where bd_member_id = 4800;
      insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) select id, 'freelancer', '{"first_name":"Dora","last_name":"Lance"}', '{}', 100, now() from people where bd_member_id = 4801;
      select dela_profile_refresh(id, 'attorney') from people where bd_member_id = 4800;
      insert into payout_accounts (person_id, provider, account_ref, status) select id, 'stripe', 'acct_disp', 'ready' from people where bd_member_id = 4801 on conflict (person_id) do update set status = 'ready'`);
    await sql(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) select dela_side_org(id, 'attorney'), 'Filing', 'approved', 1, 1, 100, 'dp1', id from people where bd_member_id = 4800;
      insert into playbook_versions (playbook_id, version, body, created_by) select id, 1, '{"title":"Filing","steps":[{"text":"Draft the petition"}]}', created_by from playbooks where request_id = 'dp1';
      insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id, milestones)
        select p.org_id, p.created_by, p.id, 1, 'Disputed packet', '{"task":"Prepare the filing packet","outcome":"A filing-ready packet"}', 30000, 80000, 'filled', now(), now() + interval '14 days', 'dpg', '[{"title":"Draft","share_pct":50},{"title":"Final"}]' from playbooks p where p.request_id = 'dp1';
      insert into proposals (gig_id, freelancer_id, status, price_cents, included, excluded, schedule, days_to_deliver, sent_at)
        select g.id, f.id, 'selected', 60000, 'Petition draft; Exhibit list', 'Filing with the court', 'Two weeks', 14, now() from gigs g, people f where g.request_id = 'dpg' and f.bd_member_id = 4801;
      insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents)
        select g.id, pr.id, g.org_id, g.created_by, pr.freelancer_id, 60000 from gigs g join proposals pr on pr.gig_id = g.id where g.request_id = 'dpg'`);
    const gigId = (await sql("select id from gigs where request_id = 'dpg'"))[0].id;
    const agId = (await sql("select id from agreements where gig_id = '" + gigId + "'"))[0].id;
    // DELA drafts version 1 when the agreement is first opened; both sign and the attorney pays, prepared in the database
    s = await open(browser, "DELA-App", 4800, `&tab=projects&gig=${gigId}&view=agreement`); p = s.page;
    await waitFor(p, "Agreement, version 1", 15000);
    await s.ctx.close();
    for (const [bd, side, name] of [[4801, "freelancer", "Dora Lance"], [4800, "attorney", "Dee Attorney"]]) {
      const r = (await sql(`select dela_agreement_sign((select id from people where bd_member_id = ${bd}), '${side}', '${agId}', '{"version":1,"typed_name":"${name}","consent":true}'::jsonb) r`))[0].r;
      if (!r.ok) throw new Error("sign " + side + ": " + JSON.stringify(r));
    }
    for (let i = 0; i < 2; i++) {
      const n = (await sql(`select dela_payment_next((select id from people where bd_member_id = 4800), 'attorney', '${agId}') r`))[0].r;
      if (!n.ok) { await sql(`update milestones set status = 'funded', funded_at = now() where agreement_id = '${agId}' and status = 'pending'; select 1`); break; }
      await sql(`select dela_payment_result('${n.payment_id}', 'succeeded', 'pi_disp${i}', 'cus_d', 'pm_d', '')`);
      await sql(`update milestones set status = 'in_progress' where agreement_id = '${agId}' and seq = ${i + 1}; select 1`);
    }
    const ms = await sql(`select id, seq, status, amount_cents from milestones where agreement_id = '${agId}' order by seq`);
    ok(ms.length === 2 && ms.every((m) => ["funded", "in_progress"].includes(m.status)), "prepared: a signed engagement with two paid milestones (" + ms.map((m) => m.status).join(", ") + ")");

    // ---------- Freelancer: open a dispute on milestone 1, asking for the full payment ----------
    s = await open(browser, "DELA-App", 4801, `&tab=work&gig=${gigId}&view=agreement`); p = s.page;
    await waitFor(p, "Problems, disputes and canceling", 15000);
    await dela(p).getByText("Open a dispute", { exact: true }).click();
    await label(p, "Which milestone").selectOption(ms[0].id);
    await label(p, "What went wrong").selectOption("not_accepted");
    await label(p, "What you are asking for").selectOption("release");
    await label(p, "What happened").fill("The draft was delivered on time and the attorney has not accepted it.");
    await click(p, "Open the dispute");
    t = await waitFor(p, "Open: waiting for an answer");
    ok(t.includes("The other side answers by") && t.includes("Withdraw the dispute"), "freelancer: the dispute is open, with the answer date and Withdraw");
    // An offer: $200 to the freelancer, the rest back
    await dela(p).getByText("Settle it: send an offer", { exact: true }).click();
    await label(p, "Amount to the freelancer ($)").fill("200");
    t = await text(p);
    ok(t.includes("back to the attorney"), "freelancer: the offer box shows what goes back to the attorney");
    await click(p, "Send the offer");
    await waitFor(p, "Your offer: $200 to the freelancer");
    await s.ctx.close();

    // ---------- Attorney: answer, add a link, accept the offer ----------
    s = await open(browser, "DELA-App", 4800, `&tab=projects&gig=${gigId}&view=agreement`); p = s.page;
    t = await waitFor(p, "The freelancer's offer: $200 to the freelancer", 15000);
    ok(t.includes("Give your side by"), "attorney: asked to give their side by a date");
    await label(p, "Your side").fill("Only the draft arrived; the exhibit list is still missing.");
    await click(p, "Send my side");
    await waitFor(p, "Answer |");
    await dela(p).getByText("Add a link", { exact: true }).click();
    await label(p, "What the link is").fill("Our delivery checklist");
    await label(p, "Secure link (https://)").fill("https://drive.example.test/checklist");
    await click(p, "Add the link");
    await waitFor(p, "Our delivery checklist");
    await click(p, "Accept the offer");
    t = await waitFor(p, "Settled by agreement", 15000);
    ok(t.includes("$200 went to the freelancer and $100 back to the attorney"), "attorney: settled by agreement, the split shown");
    await s.ctx.close();
    const money = (await sql(`select (select amount_cents from refunds where milestone_id = '${ms[0].id}') refund, (select amount_cents + fee_cents from payouts where milestone_id = '${ms[0].id}') payout`))[0];
    ok(money.refund === 10000 && money.payout === 20000, "the money: $100 refunded (the fee kept) and $200 released (" + JSON.stringify(money) + ")");

    // ---------- A second dispute goes to the Lawfecta Team (prepared: opened, answered, notice over) ----------
    const d2 = (await sql(`select dela_dispute_start((select id from people where bd_member_id = 4800), 'attorney', '${agId}', '${ms[1].id}', 'not_delivered', 'refund', null, 'The final packet never arrived.') r`))[0].r;
    await sql(`select dela_dispute_say((select id from people where bd_member_id = 4801), 'freelancer', '${d2.id}', 'It is half done; I need one more week.', 'split', 15000);
      update disputes set notice_ends_at = now() - interval '1 minute' where id = '${d2.id}'; select dela_dispute_tick(jsonb_build_object('dispute_id', '${d2.id}', 'kind', 'notice_end'))`);
    s = await open(browser, "DELA-Admin", 1, ""); p = s.page;
    await dela(p).getByRole("tab", { name: "Disputes", exact: true }).click();
    t = await waitFor(p, "Ready for your decision", 15000);
    ok(t.includes("Settled by offer") && t.includes("It is half done"), "owner: the queue shows the case ready for a decision, both sides, and the settled one");
    await click(p, "✦ Draft with DELA");
    await waitFor(p, "Use this draft", 15000);
    await click(p, "Half each");
    await label(p, "Decision and reasons (both members see this)").fill("Half the final packet was delivered.");
    await click(p, "Decide");
    t = await waitFor(p, "Decided", 15000);
    const d2r = (await sql(`select status, settled_by, release_cents, refund_cents from disputes where id = '${d2.id}'`))[0];
    ok(d2r.settled_by === "team" && d2r.release_cents === 15000 && d2r.refund_cents === 15000, "owner: decided half each (" + JSON.stringify(d2r) + ")");
    await p.screenshot({ path: path.join(SHOTS, "disputes-admin.png"), fullPage: true });
    await s.ctx.close();

    // ---------- Check the results: the freelancer sees the decision ----------
    s = await open(browser, "DELA-App", 4801, `&tab=work&gig=${gigId}&view=agreement`); p = s.page;
    t = await waitFor(p, "Decided by the Lawfecta Team", 15000);
    ok(t.includes("Half the final packet was delivered."), "freelancer: the team's note is shown");
    await s.ctx.close();
    console.log("\nALL " + passed + " CHECKS PASSED");
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally { await browser.close(); }
})();

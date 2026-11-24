// Browser test of step 82a (docs/briefs/step-82-admin-pipeline-connector.md): the Pipeline page in the admin area and
// the approval screen of the Lawfecta Team connector. The owner adds attorneys by website member number, records an
// email and a follow-up, sees who is stuck and the counts; a person with only the role "growth" lands on the Pipeline
// page; the approval screen approves for the team and refuses a member. The website is the stand-in in tests/pw/server.ts.
// Needs tools/dbtest.sh, then tests/pw/server.ts on port 8787.   node tests/pw/pipeline-test.js
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://127.0.0.1:8787";
const ROOT = path.join(__dirname, "..", "..");
const SHOTS = process.env.SHOTS || path.join(ROOT, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
let passed = 0;
function ok(cond, msg) { if (!cond) throw new Error("FAILED: " + msg); passed++; console.log("ok", msg); }
async function sql(q) { const r = await fetch(BASE + "/test/sql", { method: "POST", body: JSON.stringify({ sql: q }) }); const j = await r.json(); if (j.error) throw new Error("sql: " + j.error); return j.rows; }
async function open(browser, widget, uid, extra) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  // "Where was it sent from?" is answered with the tool's name
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Gmail" : undefined));
  await page.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(ROOT, u.pathname.split("@")[1].split("/").slice(1).join("/")), contentType: "application/javascript" }); });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto(`${BASE}/page/${widget}?uid=${uid}&plan=` + (extra || ""));
  await page.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela").textContent.length > 20; });
  await page.waitForTimeout(150);
  return { ctx, page };
}
const dela = (page) => page.locator(".dela-host");
const sr = (pg, fn, arg) => pg.evaluate(([f, a]) => new Function("r", "a", f)(document.querySelector(".dela-host").shadowRoot, a), [fn, arg]);
const OWNER = 4820, GROWTH = 4823, PLAIN = 4824;
const SW = ["mcp_admin", "new_layout", "profiles", "playbook_library", "document_standard", "document_editor_v2", "pipeline_prefill"];
const CLAIMER = 4825;
const b64 = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
// A sign-in for the Team connector, as ChatGPT or Claude start it: returns the request the approval page shows
async function teamRequest() {
  const reg = await (await fetch(BASE + "/api/oauth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "Claude", redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] }) })).json();
  const verifier = b64(crypto.getRandomValues(new Uint8Array(32))), challenge = b64(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const q = new URLSearchParams({ response_type: "code", client_id: reg.client_id, redirect_uri: "https://claude.ai/api/mcp/auth_callback", code_challenge: challenge, code_challenge_method: "S256", state: "s", resource: BASE + "/api/mcp/admin" });
  const a = await fetch(BASE + "/api/oauth/authorize?" + q, { redirect: "manual" });
  return new URL(a.headers.get("location")).searchParams.get("req");
}

(async () => {
  const browser = await chromium.launch();
  let was = null;
  try {
    was = await sql("select key, state from feature_switches where key in ('" + SW.join("','") + "')");
    await sql("update feature_switches set state = 'everyone' where key in ('" + SW.join("','") + "'); select 1");
    await sql(`insert into people (bd_member_id, display_name, email) values (${OWNER}, 'Opal Owner', '${OWNER}@test.invalid'), (${GROWTH}, 'Mia Growth', '${GROWTH}@test.invalid'), (${PLAIN}, 'Paz Plain', '${PLAIN}@test.invalid') on conflict (bd_member_id) do nothing;
      select dela_ensure_side((select id from people where bd_member_id = x), 'attorney', 'att_pro', 'staff_grant') from unnest(array[${OWNER}, ${GROWTH}, ${PLAIN}]) x;
      insert into access_list (bd_member_id, channel) select x, 'access' from unnest(array[${OWNER}, ${GROWTH}, ${PLAIN}]) x where not exists (select 1 from access_list where bd_member_id = x and channel = 'access' and revoked_at is null);
      insert into staff_roles (person_id, role) select id, 'owner' from people where bd_member_id = ${OWNER} and not exists (select 1 from staff_roles s where s.person_id = people.id and s.revoked_at is null);
      insert into staff_roles (person_id, role) select id, 'growth' from people where bd_member_id = ${GROWTH} and not exists (select 1 from staff_roles s where s.person_id = people.id and s.revoked_at is null); select 1`);

    // ---------- The owner: the Pipeline page ----------
    let s = await open(browser, "DELA-Admin", OWNER, "&tab=pipeline"), p = s.page;
    await dela(p).locator("#pipeline-page").waitFor({ timeout: 20000 });
    let st = await sr(p, `return { h1: r.querySelector("#pipeline-page h1").textContent.trim(), stages: [...r.querySelectorAll("#pipe-counts tbody tr")].map((t) => t.children[0].textContent), url: r.querySelector("#pipe-url").value, stuck: r.querySelector("#pipe-stalled h2").textContent }`);
    ok(st.h1.startsWith("Pipeline") && st.stages.join("|") === "Listing built|Playbook made|Emailed|Claimed|Playbook opened|Gig posted|Proposals received|Hired", "the Pipeline page shows the eight stages in order: " + st.stages.join(", "));
    ok(st.url.endsWith("/mcp/admin") && st.stuck.startsWith("Stuck (0)"), "it shows the Team connector's address, and nobody is stuck yet");
    // Add attorneys by website member number: one on a claim plan, one on a paid plan, one the website does not know
    await dela(p).locator("#pipe-add").click();
    ok((await dela(p).locator("#pipe-add-msg").innerText()) === "Type at least one website member number.", "an empty box says what to type");
    await dela(p).locator("#pipe-add-ids").fill("4821, 4822 4829");
    await dela(p).locator("#pipe-add").click();
    await dela(p).locator("#pipe-list tbody tr").first().waitFor({ timeout: 20000 });
    const rows = () => sr(p, `return [...r.querySelectorAll("#pipe-list tbody tr")].map((t) => ({ who: t.children[0].innerText, stage: t.children[1].innerText.trim(), emailed: t.children[2].innerText.trim(), btn: t.querySelector("button").innerText })).filter((x) => /482[12]/.test(x.who))`);
    let list = await rows();
    const cal = () => list.find((x) => x.who.includes("Cal Claim")), pia = () => list.find((x) => x.who.includes("Pia Paid"));
    ok(list.length === 2 && cal().stage === "Listing built" && pia().stage === "Added", "a listing on a claim plan is \"Listing built\"; one on a paid plan is \"Added\"; an unknown number is left out");
    ok(cal().who.includes("Claim Family Law") && cal().who.includes("Austin, TX") && cal().who.includes("Website member 4821") && !cal().who.includes("cal@claimlaw.example"), "a row shows the firm, the place and the member number, and no email address");
    // Record that an email went out: nothing is sent
    const before = (await sql("select (select count(*)::int from jobs) j, (select count(*)::int from notifications) n"))[0];
    await dela(p).getByRole("button", { name: "Record that an email went to Cal Claim" }).click();
    await dela(p).locator("#pipe-list .badge", { hasText: "Emailed" }).first().waitFor({ timeout: 15000 });
    list = await rows();
    const after = (await sql("select (select count(*)::int from jobs) j, (select count(*)::int from notifications) n"))[0];
    ok(cal().stage === "Emailed" && cal().emailed.length > 5 && cal().btn === "Record follow-up", "\"Record email\" moves the attorney to Emailed with today's date, and the button becomes \"Record follow-up\"");
    ok(after.j === before.j && after.n === before.n && (await sql("select tool from pipeline_events where bd_member_id = 4821 and stage = 'emailed'"))[0].tool === "Gmail", "recording sends nothing: no job, no notification; the tool that was named is kept");
    // Eight days later with no claim: stuck
    await sql("alter table pipeline_events disable trigger pipeline_events_append_only; update pipeline_events set at = now() - interval '8 days' where bd_member_id = 4821 and stage = 'emailed'; alter table pipeline_events enable trigger pipeline_events_append_only; select 1");
    await dela(p).getByRole("button", { name: "Pipeline", exact: true }).first().click();
    await dela(p).locator("#pipe-stalled tbody tr").first().waitFor({ timeout: 15000 });
    st = await sr(p, `const t = r.querySelector("#pipe-stalled tbody tr"); return { head: r.querySelector("#pipe-stalled h2").textContent, who: t.children[0].innerText, why: t.children[1].innerText, wait: t.children[2].innerText, counts: [...r.querySelectorAll("#pipe-counts tbody tr")].map((x) => x.innerText.replace(/\\s+/g, " ")) }`);
    ok(st.head.startsWith("Stuck (1)") && st.who.includes("Cal Claim") && st.why === "Emailed, and has not claimed the listing after 7 days" && st.wait === "8 days", "an attorney emailed 8 days ago who has not claimed is on the stuck list, with the reason and the wait: " + st.why);
    ok(st.counts.some((x) => /^Listing built 1 1 0$/.test(x)) || st.counts.some((x) => /^Listing built \d+ \d+ \d+$/.test(x)), "the counts table has numbers for each stage: " + st.counts[0]);
    await dela(p).getByRole("button", { name: "Record a follow-up to Cal Claim" }).first().click();
    await p.waitForTimeout(900);
    ok((await sql("select count(*)::int n from pipeline_events where bd_member_id = 4821 and stage = 'follow_up'"))[0].n === 1, "\"Record follow-up\" on the stuck list writes it down");
    await p.screenshot({ path: path.join(SHOTS, "82-pipeline.png"), fullPage: true });
    // The Lawfecta Team page offers the new role
    await dela(p).getByRole("button", { name: "Lawfecta Team", exact: true }).first().click();
    await dela(p).locator('select[aria-label="Role"]').waitFor({ timeout: 15000 });
    ok((await dela(p).locator('select[aria-label="Role"] option').allInnerTexts()).some((x) => x.startsWith("Growth")), "the Lawfecta Team page offers the role \"Growth\"");
    await s.ctx.close();

    // ---------- A person whose only role is growth ----------
    s = await open(browser, "DELA-Admin", GROWTH, ""); p = s.page;
    await dela(p).locator("#pipeline-page").waitFor({ timeout: 20000 });
    ok((await sr(p, `return r.querySelector("#pipeline-page h1").textContent.trim()`)).startsWith("Pipeline"), "someone with only the role \"growth\" lands on the Pipeline page");
    ok(await sr(p, `return !r.querySelector("#pipe-add-card button[disabled]") && !!r.querySelector("#pipe-list tbody tr")`), "and can read it");
    await s.ctx.close();
    s = await open(browser, "DELA-App", GROWTH, "&tab=home"); p = s.page;
    ok(!(await sr(p, `return [...r.querySelectorAll(".nl-side .nl-item")].map((b) => b.innerText.trim())`)).includes("Members"), "the role opens nothing in the member app: no Members page in the menu");
    await s.ctx.close();

    // ---------- The approval screen of the Team connector ----------
    let req = await teamRequest();
    s = await open(browser, "DELA-App", OWNER, "&tab=connect&req=" + encodeURIComponent(req)); p = s.page;
    await dela(p).locator("#team-connect h1").waitFor({ timeout: 20000 });
    st = await sr(p, `const b = r.querySelector("#team-connect"); return { h1: b.querySelector("h1").textContent, text: b.innerText, approve: !b.querySelector("button.blue").disabled }`);
    ok(st.h1 === "Claude wants to use the Lawfecta Team connector" && st.text.includes("your team role \"owner\"") && st.text.includes("It cannot send an email or a message, post a gig, hire, change a plan, or touch money.") && st.approve, "the owner sees what the Team connector can and cannot do, and may approve");
    await p.screenshot({ path: path.join(SHOTS, "82-team-approve.png") });
    await p.route("https://claude.ai/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<html><body>back at Claude</body></html>" }));
    await dela(p).getByRole("button", { name: "Approve", exact: true }).click();
    await p.waitForURL(/claude\.ai\/api\/mcp\/auth_callback\?code=/, { timeout: 15000 });
    ok(true, "Approve takes the owner back to the app with a one-use code");
    await s.ctx.close();
    req = await teamRequest();
    s = await open(browser, "DELA-App", PLAIN, "&tab=connect&req=" + encodeURIComponent(req)); p = s.page;
    await dela(p).locator("#team-connect h1").waitFor({ timeout: 20000 });
    st = await sr(p, `const b = r.querySelector("#team-connect"); return { text: b.innerText, approve: !b.querySelector("button.blue").disabled }`);
    ok(!st.approve && st.text.includes("Only the owner and people with the team role \"growth\" can approve the Lawfecta Team connector."), "a member without the role is told so and cannot approve");
    await s.ctx.close();

    // ---------- Step 82b: a prepared playbook waits, and is in the attorney's Library when they first open DELA ----------
    await sql(`insert into pipeline_attorneys (bd_member_id, name, firm, practice_area) values (${CLAIMER}, 'Cleo Claimer', 'Claimer Law', 'Family Law') on conflict do nothing;
      insert into pipeline_playbooks (bd_member_id, title, body, source_url, request_id) values (${CLAIMER}, 'Open a new family law matter',
        '{"schema":2,"type":"sop","title":"Open a new family law matter","purpose":"Open every matter the same way.","scope":"Every new family law matter.","trigger":"A prospective client asks for a consult.","roles":["Attorney","Paralegal"],"owner_role":"Paralegal","before_you_start":["Access to the case management system"],"timing":"Within 1 business day.","quality_check":["The matter is open"],"done_when":"The matter is open and the letter is signed.","steps":[{"text":"Record the caller in the intake form.","role":"Paralegal","raci":{"Paralegal":"R,A"},"basis":"proposed"},{"text":"Decide whether to accept the matter.","role":"Attorney","raci":{"Attorney":"R,A"},"attorney_decides":true,"basis":"proposed"}]}'::jsonb,
        'https://claimerlaw.example/about', 'pw-1'); select 1`);
    ok((await sql("select count(*)::int n from people where bd_member_id = " + CLAIMER))[0].n === 0, "preparing a playbook makes no account for the attorney");
    await sql(`insert into people (bd_member_id, display_name, email) values (${CLAIMER}, 'Cleo Claimer', '${CLAIMER}@test.invalid');
      select dela_ensure_side((select id from people where bd_member_id = ${CLAIMER}), 'attorney', 'att_free', 'staff_grant');
      insert into access_list (bd_member_id, channel) values (${CLAIMER}, 'access'); select 1`);
    s = await open(browser, "DELA-App", CLAIMER, "&tab=library"); p = s.page;
    await dela(p).getByText("Open a new family law matter").first().waitFor({ timeout: 20000 });
    ok(true, "the attorney's Library holds the prepared playbook the first time they open DELA");
    await dela(p).getByText("Open a new family law matter").first().click();
    await dela(p).locator("#doc-prepared").waitFor({ timeout: 20000 });
    st = await sr(p, `return { note: r.querySelector("#doc-prepared").innerText, page: r.querySelector(".dp-page, #doc-body, .card") ? r.querySelector(".dela").innerText : "" }`);
    ok(st.note.includes("Prepared for you by Lawfecta from your public website (claimerlaw.example).") && st.note.includes("Check every step before you use it."), "the playbook says who prepared it and from where: " + st.note.slice(0, 90));
    ok(/Draft/.test(st.page) && /suggestion/i.test(st.page), "it is a draft, and its steps are marked as DELA's suggestions");
    ok((await sql("select count(*)::int n from pipeline_events where bd_member_id = " + CLAIMER + " and stage = 'playbook_opened'"))[0].n === 1, "opening it is recorded as \"Playbook opened\"");
    await p.screenshot({ path: path.join(SHOTS, "82b-prepared.png") });
    await s.ctx.close();
    console.log(passed + " browser checks passed");
  } finally {
    if (was) for (const w of was) await sql("update feature_switches set state = '" + w.state + "' where key = '" + w.key + "'; select 1");
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });

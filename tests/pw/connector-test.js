// Browser test of DELA in ChatGPT and Claude: the connector card in AI settings (address, Copy, steps), the approval page
// an AI app sends members to (what it can do, the client information notice, Approve and Deny), going back to the app,
// the connection in the list, Disconnect, the freelancer page, an expired request, and the Lawfecta Team's list.
// Needs tools/dbtest.sh, then tests/pw/server.ts on port 8787.   node tests/pw/connector-test.js
const { chromium } = require("playwright");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const BASE = "http://127.0.0.1:8787";
const API = BASE + "/api";
const ROOT = path.join(__dirname, "..", "..");
const SHOTS = process.env.SHOTS || path.join(ROOT, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
let passed = 0;
function ok(cond, msg) { if (!cond) throw new Error("FAILED: " + msg); passed++; console.log("ok", msg); }
async function sql(q) { const r = await fetch(BASE + "/test/sql", { method: "POST", body: JSON.stringify({ sql: q }) }); return (await r.json()).rows; }
const b64u = (b) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const REDIRECT = "https://claude.ai/api/mcp/auth_callback";

// What Claude or ChatGPT does before it sends the member to DELA
async function startSignIn(name) {
  const reg = await (await fetch(API + "/oauth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: name, redirect_uris: [REDIRECT] }) })).json();
  const verifier = b64u(crypto.randomBytes(32));
  const challenge = b64u(crypto.createHash("sha256").update(verifier).digest());
  const q = new URLSearchParams({ response_type: "code", client_id: reg.client_id, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: "S256", state: "xyz" });
  const a = await fetch(API + "/oauth/authorize?" + q, { redirect: "manual" });
  const loc = new URL(a.headers.get("location"));
  return { client: reg.client_id, verifier, req: loc.searchParams.get("req"), tab: loc.searchParams.get("tab") };
}

async function open(browser, uid, query) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  page.on("dialog", (d) => d.accept());
  await page.route("https://cdn.jsdelivr.net/**", (route) => {
    const u = new URL(route.request().url());
    route.fulfill({ path: path.join(ROOT, u.pathname.split("@")[1].split("/").slice(1).join("/")), contentType: "application/javascript" });
  });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  // Going back to the AI app: answer with a small page instead of leaving for the real site
  await page.route("https://claude.ai/**", (r) => r.fulfill({ body: "<h1>Back in Claude</h1>", contentType: "text/html" }));
  await page.goto(`${BASE}/page/DELA-App?uid=${uid}&plan=` + (query ? "&" + query : ""));
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
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(-1500));
}

(async () => {
  const browser = await chromium.launch();
  try {
    await sql(`update feature_switches set state = 'off' where key = 'mcp_connector';
      update feature_switches set state = 'everyone' where key in ('ai_generation', 'playbook_library');
      insert into people (bd_member_id, display_name, email) values (2400, 'Conn Attorney', 'conn@test.invalid'), (2401, 'Conn Freelancer', 'connf@test.invalid'), (2402, 'Conn Owner', 'conno@test.invalid') on conflict do nothing;
      select dela_ensure_side((select id from people where bd_member_id = 2400), 'attorney', 'att_plus', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = 2401), 'freelancer', 'fl_free', 'staff_grant');
      select dela_ensure_side((select id from people where bd_member_id = 2402), 'attorney', 'att_free', 'staff_grant');
      insert into staff_roles (person_id, role) values ((select id from people where bd_member_id = 2402), 'owner');
      insert into access_list (bd_member_id, channel) values (2400, 'access'), (2401, 'access'), (2402, 'access'); select 1`);

    // Switch off: the card says it opens soon; the approval page says it is not open and Approve is off
    let s = await open(browser, 2400, "tab=ai");
    let p = s.page;
    let t = await waitFor(p, "Use DELA in ChatGPT and Claude");
    ok(t.includes("Opens soon"), "with the switch off, AI settings says the connector opens soon");
    let si = await startSignIn("Claude");
    ok(si.tab === "connect" && si.req, "authorize sends the member to the DELA page with tab=connect");
    await s.ctx.close();
    s = await open(browser, 2400, "tab=connect&req=" + encodeURIComponent(si.req));
    p = s.page;
    t = await waitFor(p, "Claude wants to connect to DELA");
    ok(t.includes("not open for your account yet"), "with the switch off, the approval page says the connector is not open");
    ok(t.includes("What leaves DELA") && t.includes("processed by Anthropic") && t.includes("cannot recall what was already read"), "the Connect page says what leaves DELA (step 8b Part C, R12)");
    ok(await dela(p).getByRole("button", { name: "Approve" }).isDisabled(), "Approve is off while the connector is not open");
    await s.ctx.close();

    await sql("update feature_switches set state = 'everyone' where key = 'mcp_connector'; select 1");

    // AI settings: address, Copy and the steps
    s = await open(browser, 2400, "tab=ai");
    p = s.page;
    t = await waitFor(p, "DELA connector address");
    ok(t.includes("In Claude") && t.includes("In ChatGPT") && t.includes("Add custom connector") && t.includes("Nothing connected yet"), "AI settings shows the steps for Claude and ChatGPT");
    const addr = await dela(p).getByLabel("DELA connector address").inputValue();
    ok(addr === API + "/mcp", "the connector address is shown: " + addr);
    await click(p, "Copy");
    await waitFor(p, "Address copied");
    ok((await p.evaluate(() => navigator.clipboard.readText())) === addr, "Copy puts the address on the clipboard");
    await p.screenshot({ path: path.join(SHOTS, "connector-settings.png"), fullPage: true });
    await s.ctx.close();

    // The approval page, then Approve sends the member back to the app with a code that works
    si = await startSignIn("Claude");
    s = await open(browser, 2400, "tab=connect&req=" + encodeURIComponent(si.req));
    p = s.page;
    t = await waitFor(p, "Claude wants to connect to DELA");
    ok(t.includes("It will use your Attorney workspace") && t.includes("you go back to claude.ai"), "the page names the workspace and where the member goes back to");
    ok(t.includes("List and read the documents") && t.includes("It cannot pay, hire, sign"), "the page lists what the app can and cannot do");
    ok(t.includes("Never enter sensitive data in DELA, and that includes what you type in ChatGPT or Claude") && t.includes("logins and passwords"), "the sensitive data notice is on the approval page");
    await p.screenshot({ path: path.join(SHOTS, "connector-approve.png"), fullPage: true });
    await Promise.all([p.waitForURL(/claude\.ai/), click(p, "Approve")]);
    const back = new URL(p.url());
    ok(back.searchParams.get("code") && back.searchParams.get("state") === "xyz", "Approve goes back to Claude with a code and the state");
    const tok = await (await fetch(API + "/oauth/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code: back.searchParams.get("code"), redirect_uri: REDIRECT, client_id: si.client, code_verifier: si.verifier }) })).json();
    ok(String(tok.access_token).startsWith("dm_"), "the code turns into a token");
    const mcp = async (method, params) => (await fetch(API + "/mcp", { method: "POST", headers: { authorization: "Bearer " + tok.access_token, "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }));
    const call = await (await mcp("tools/call", { name: "save_playbook_draft", arguments: { title: "Send the welcome packet", steps: [{ text: "Email the welcome packet" }] } })).json();
    ok(call.result && !call.result.isError, "the connection saves a playbook draft");
    await s.ctx.close();

    // The member sees it in the library and in AI settings, and disconnects it
    s = await open(browser, 2400, "tab=ai");
    p = s.page;
    t = await waitFor(p, "Connected now");
    await waitFor(p, "Attorney workspace, connected");
    ok(true, "AI settings lists the connected app");
    await click(p, "Disconnect");
    await waitFor(p, "Nothing connected yet");
    ok((await mcp("ping")).status === 401, "after Disconnect the app is refused");
    await click(p, "Library");
    await waitFor(p, "Send the welcome packet");
    ok(true, "the draft saved from Claude is in the library");

    // A request already answered
    await p.goto(`${BASE}/page/DELA-App?uid=2400&plan=&tab=connect&req=` + encodeURIComponent(si.req));
    t = await waitFor(p, "ran out or was already answered");
    ok(true, "a used request shows a plain message");
    // Deny
    si = await startSignIn("ChatGPT");
    await p.goto(`${BASE}/page/DELA-App?uid=2400&plan=&tab=connect&req=` + encodeURIComponent(si.req));
    await waitFor(p, "ChatGPT wants to connect to DELA");
    // ChatGPT's address is not routed in this test; Deny goes back to the redirect we registered (claude.ai)
    await Promise.all([p.waitForURL(/claude\.ai/), click(p, "Deny")]);
    ok(new URL(p.url()).searchParams.get("error") === "access_denied", "Deny goes back with access_denied");
    await s.ctx.close();

    // Freelancer: one tool, and the page says so
    si = await startSignIn("Claude");
    s = await open(browser, 2401, "tab=connect&req=" + encodeURIComponent(si.req));
    p = s.page;
    t = await waitFor(p, "Claude wants to connect to DELA");
    ok(t.includes("Freelancer workspace") && t.includes("See your name, workspace, plan") && !t.includes("documents"), "the freelancer page lists only what the freelancer side can do");
    await Promise.all([p.waitForURL(/claude\.ai/), click(p, "Approve")]);
    const ft = await (await fetch(API + "/oauth/token", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ grant_type: "authorization_code", code: new URL(p.url()).searchParams.get("code"), redirect_uri: REDIRECT, client_id: si.client, code_verifier: si.verifier }) })).json();
    const tools = await (await fetch(API + "/mcp", { method: "POST", headers: { authorization: "Bearer " + ft.access_token, "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) })).json();
    ok(tools.result.tools.map((t) => t.name).join(",") === "lawfecta_whoami,get_my_profile,list_my_gig_work,save_proposal_draft,list_my_threads,read_thread,save_reply_draft,list_my_meetings,list_my_reviews,list_my_bench,list_my_engagements,list_my_recurring_work,get_engagement", "the freelancer connection has only the freelancer tools");
    await s.ctx.close();

    // Phone width: the approval page fits
    si = await startSignIn("Claude");
    const phone = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const pp = await phone.newPage();
    await pp.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(ROOT, u.pathname.split("@")[1].split("/").slice(1).join("/")), contentType: "application/javascript" }); });
    await pp.route("https://fonts.googleapis.com/**", (r) => r.abort());
    await pp.goto(`${BASE}/page/DELA-App?uid=2400&plan=&tab=connect&req=` + encodeURIComponent(si.req));
    await waitFor(pp, "Claude wants to connect to DELA");
    const wide = await pp.evaluate(() => document.documentElement.scrollWidth);
    ok(wide <= 390, "the approval page fits a phone screen (" + wide + "px)");
    await pp.screenshot({ path: path.join(SHOTS, "connector-phone.png"), fullPage: true });
    await phone.close();

    // The Lawfecta Team's list
    const actx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
    const ap = await actx.newPage();
    ap.on("pageerror", (e) => { throw new Error("admin page error: " + e.message); });
    ap.on("dialog", (d) => d.accept());
    await ap.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(ROOT, u.pathname.split("@")[1].split("/").slice(1).join("/")), contentType: "application/javascript" }); });
    await ap.route("https://fonts.googleapis.com/**", (r) => r.abort());
    await ap.goto(`${BASE}/page/DELA-Admin?uid=2402&plan=`);
    await waitFor(ap, "Overview");
    await dela(ap).getByRole("tab", { name: "AI and files" }).click();
    t = await waitFor(ap, "ChatGPT and Claude connections");
    await waitFor(ap, "Member 2401 (2401)");
    ok(t.includes("ChatGPT and Claude connections"), "the team sees the connections in AI and files");
    ok(!(await text(ap)).includes("dm_"), "no token appears in the admin area");
    await dela(ap).getByRole("button", { name: "Stop", exact: true }).first().click();
    await waitFor(ap, "Connection stopped");
    ok((await sql("select count(*)::int n from mcp_connections where revoke_reason = 'lawfecta_team'"))[0].n === 1, "Stop ends the connection");
    await dela(ap).getByRole("tab", { name: "Overview" }).click();
    t = await waitFor(ap, "ChatGPT and Claude connector");
    ok(true, "the emergency pause has a ChatGPT and Claude connector button");
    await ap.screenshot({ path: path.join(SHOTS, "connector-admin.png"), fullPage: true });
    await actx.close();

    console.log("\n" + passed + " checks passed");
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });

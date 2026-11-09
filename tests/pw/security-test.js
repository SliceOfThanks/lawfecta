// Browser test of the public security page (docs/briefs/step-6d-security-sensitive-data.md): the DELA-Security widget opens
// with no login, every section shows the numbers from the settings (and changes when the settings change), the OpenAI
// sentence follows the Zero Data Retention setting, the contact form (labels, keyboard order, the hidden trap field, each
// answer, the button while sending, the limit per hour, a server error), no email address on the page, and the phone width.
// Needs tools/dbtest.sh, then tests/pw/server.ts on port 8787.   node tests/pw/security-test.js
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
const setting = (k, v) => sql(`insert into settings (key, value) values ('${k}', '${JSON.stringify(v)}'::jsonb) on conflict (key) do update set value = excluded.value; select 1`);

async function open(browser, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error("page error: " + e.message); });
  await page.route("https://cdn.jsdelivr.net/**", (route) => {
    const u = new URL(route.request().url());
    const rel = u.pathname.split("@")[1].split("/").slice(1).join("/");
    route.fulfill({ path: path.join(ROOT, rel), contentType: rel.endsWith(".png") ? "image/png" : "application/javascript" });
  });
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  // uid 0: nobody is logged in to the website
  await page.goto(`${BASE}/page/DELA-Security?uid=0&plan=`);
  await text(page);
  return { ctx, page };
}
async function text(page) {
  await page.waitForFunction(() => { const h = document.querySelector(".dela-host"); return h && h.shadowRoot && h.shadowRoot.querySelector(".dela").textContent.length > 40; });
  await page.waitForTimeout(150);
  return page.evaluate(() => document.querySelector(".dela-host").shadowRoot.querySelector(".dela").innerText);
}
const dela = (page) => page.locator(".dela-host");
async function waitFor(page, words, ms) {
  const end = Date.now() + (ms || 8000);
  let t = "";
  while (Date.now() < end) { t = await text(page); if (t.includes(words)) return t; await page.waitForTimeout(150); }
  throw new Error("FAILED: did not see \"" + words + "\". Page says:\n" + t.slice(0, 2000));
}
const sectionText = (page, id) => dela(page).locator("#" + id).innerText();
const count = async () => Number((await sql("select count(*)::int as n from security_messages"))[0].n);
const status = (page) => dela(page).locator(".sec-status");
async function fill(page, v) {
  await dela(page).getByLabel("Your name", { exact: true }).fill(v.name ?? "");
  await dela(page).getByLabel("Your email", { exact: true }).fill(v.email ?? "");
  await dela(page).getByLabel("Topic (short)", { exact: true }).fill(v.topic ?? "");
  await dela(page).getByLabel("Your message", { exact: true }).fill(v.message ?? "");
}
async function send(page, words) {
  await dela(page).getByRole("button", { name: "Send message", exact: true }).click();
  await waitFor(page, words);
  await page.waitForFunction(() => !document.querySelector(".dela-host").shadowRoot.querySelector(".sec-form button[type=submit]").disabled);
}

const SECTIONS = ["Where your data is stored", "What counts as sensitive data", "Link and file expiration", "Retention and deletion", "AI and training", "Who can access your data", "Services that handle data", "Ask a security question"];

async function checkFacts(page, f) {
  const where = await sectionText(page, "sec-where");
  ok(where.includes(f.data_location), "Where: shows the data location from settings (" + f.data_location + ")");
  ok(where.includes("TLS") && where.includes("HTTPS") && where.includes("encrypts DELA's database and file storage at rest"), "Where: encryption in transit and at rest");
  const ex = await sectionText(page, "sec-expiry");
  const ch = f.expiry_choices.slice(0, -1).join(", ") + " or " + f.expiry_choices.at(-1) + " days";
  ok(ex.includes("expire after " + ch), "Expiration: choices " + ch);
  ok(ex.includes("the default is " + f.expiry_default + " days"), "Expiration: default " + f.expiry_default);
  ok(ex.includes("extend access by " + f.extend_days + " days"), "Expiration: extend " + f.extend_days);
  ok(ex.includes("permanently deleted " + f.grace_days + " days after access ends"), "Expiration: deleted " + f.grace_days + " days after access ends");
  ok(ex.includes("works for " + f.link_minutes + " minutes"), "Expiration: download link " + f.link_minutes + " minutes");
  ok(ex.includes("lasts " + f.login_hours + " hours"), "Expiration: login code " + f.login_hours + " hours");
  ok(ex.includes("an email " + f.link_warn_days + " days before a link expires"), "Expiration: link email " + f.link_warn_days + " days before");
  ok(ex.includes("whichever comes first") && ex.includes("logged and shown to the attorney") && ex.includes("erases the address") && ex.includes("Turn sharing off there"), "Expiration: access end, log, erased address, turn sharing off");
  const re = await sectionText(page, "sec-retention");
  ok(re.includes("deleted " + f.drafts_days + " days after they were last used"), "Retention: " + f.drafts_days + " days");
  ok(re.includes("notice " + f.warn_days + " days before"), "Retention: notice " + f.warn_days + " days before");
  ok(re.includes("immediate and permanent") && re.includes("Delete forever"), "Retention: delete any time, Trash and Delete forever");
  const ai = await sectionText(page, "sec-ai");
  ok(ai.includes("Files you add to your own Files tab may be checked by AI before you share them."), "AI: the exact Files tab sentence");
  ok(ai.includes("never sent to the AI") && ai.includes("never opens or reads secure links") && ai.includes("does not train AI models") && ai.includes("notes and checklist, never the files"), "AI: never sent, links never read, no training, milestone check");
  if (f.openai_zdr) ok(ai.includes("Zero Data Retention") && !ai.includes("30 days"), "AI: OpenAI keeps no inputs (Zero Data Retention on)");
  else ok(ai.includes("up to 30 days") && ai.includes("does not train") && !ai.includes("Zero Data Retention"), "AI: OpenAI may keep inputs up to 30 days (Zero Data Retention off)");
}

(async () => {
  const browser = await chromium.launch();
  try {
    await sql("delete from security_messages; select 1");
    const DEF = { data_location: "Supabase, hosted on Amazon Web Services (AWS) in the United States", expiry_choices: [7, 14, 30], expiry_default: 14, extend_days: 14, grace_days: 7, link_minutes: 5, drafts_days: 90, warn_days: 7, login_hours: 12, link_warn_days: 2, openai_zdr: false };
    const facts = await (await fetch(BASE + "/api/public/security")).json();
    ok(facts.ok && JSON.stringify(Object.keys(facts.facts).sort()) === JSON.stringify(Object.keys(DEF).sort()), "the facts endpoint answers with no login");

    // 1. Logged out visitor, wide screen, default settings
    let { ctx, page } = await open(browser);
    let t = await text(page);
    ok(t.includes("Security and your data"), "the page opens with no login");
    const lg = await page.evaluate(async () => { const i = document.querySelector(".dela-host").shadowRoot.querySelector(".hero .sec-brand img"); await i.decode().catch(() => null); return { alt: i.alt, nw: i.naturalWidth }; });
    ok(lg.alt === "Lawfecta" && lg.nw === 192, "the Lawfecta logo shows above the heading (" + JSON.stringify(lg) + ")");
    for (const s of SECTIONS) ok((await dela(page).getByRole("heading", { name: s, level: 2, exact: true }).count()) === 1, "section heading: " + s);
    ok((await dela(page).getByRole("heading", { level: 1 }).count()) === 1, "one main heading");
    await checkFacts(page, facts.facts);
    const sens = await sectionText(page, "sec-sensitive");
    for (const w of ["ITINs", "A-numbers", "routing numbers", "health insurance member IDs", "Biometric data", "Logins and passwords", "Google Drive", "NetDocuments", "Dates of birth", "Opposing party names", "Excel", "card number patterns", "checkbox"]) ok(sens.includes(w), "Sensitive data: mentions " + w);
    const acc = await sectionText(page, "sec-access");
    ok(acc.includes("row-level security") && acc.includes("checks every request") && acc.includes("staff the attorney adds") && acc.includes("both people agree"), "Access: RLS, server checks, who sees files, disputes");
    const svc = await sectionText(page, "sec-services");
    for (const w of ["Supabase", "OpenAI", "Brevo", "Stripe", "Vectera", "Anthropic", "never sees card or bank details"]) ok(svc.includes(w), "Services: " + w);
    ok(!t.includes("@") && (await dela(page).locator("a[href^='mailto']").count()) === 0, "no email address anywhere on the page");
    ok(!t.includes("—"), "no em dashes on the page");

    // "On this page" moves to the section and focuses its heading
    await dela(page).getByRole("navigation", { name: "On this page" }).getByRole("button", { name: "Retention and deletion" }).click();
    await page.waitForTimeout(600);
    ok(await page.evaluate(() => document.querySelector(".dela-host").shadowRoot.activeElement.id === "sec-retention-h"), "On this page: the link focuses the section heading");

    // Labels, the trap field and keyboard order
    for (const l of ["Your name", "Your email", "Topic (short)", "Your message"]) ok(await dela(page).getByLabel(l, { exact: true }).isVisible(), "the form has a label: " + l);
    const trap = await page.evaluate(() => {
      const s = document.querySelector(".dela-host").shadowRoot, i = s.querySelector("input[name=website]"), r = i.getBoundingClientRect();
      return { tab: i.getAttribute("tabindex"), auto: i.getAttribute("autocomplete"), hidden: i.closest("[aria-hidden=true]") !== null, off: r.right <= 0 || r.width <= 1 };
    });
    ok(trap.tab === "-1" && trap.auto === "off" && trap.hidden && trap.off, "the trap field is hidden, aria-hidden, tabindex -1 and autocomplete off");
    await dela(page).getByLabel("Your name", { exact: true }).focus();
    const order = [];
    for (let i = 0; i < 4; i++) { await page.keyboard.press("Tab"); order.push(await page.evaluate(() => { const a = document.querySelector(".dela-host").shadowRoot.activeElement; return a.name || a.textContent; })); }
    ok(order.join(",") === "email,topic,message,Send message", "Tab moves name, email, topic, message, then the button and skips the trap (" + order.join(",") + ")");

    // Answers: no message, bad email
    await fill(page, { name: "Pat Smith", email: "pat@firm.test", topic: "Encryption", message: "" });
    await send(page, "Please write a message before you send.");
    ok((await status(page).getAttribute("role")) === "status", "the answer is read out to screen readers (role status)");
    await fill(page, { name: "Pat Smith", email: "not an email", topic: "Encryption", message: "Is my data encrypted at rest?" });
    await send(page, "Please check your email address.");
    ok((await count()) === 0, "nothing is saved for a missing message or a bad email");

    // The trap: a robot fills the hidden field, sees "sent", and nothing is saved
    await fill(page, { name: "Robot", email: "bot@spam.test", topic: "Buy", message: "Cheap links for sale" });
    await page.evaluate(() => { document.querySelector(".dela-host").shadowRoot.querySelector("input[name=website]").value = "spam.test"; });
    await send(page, "Your message was sent.");
    ok((await count()) === 0, "a filled trap field looks sent but saves nothing");
    await page.evaluate(() => { document.querySelector(".dela-host").shadowRoot.querySelector("input[name=website]").value = ""; });

    // A real message: the button is off while sending, then the form clears
    let release;
    const held = new Promise((r) => { release = r; });
    await page.route("**/api/public/security/contact", async (route) => { await held; await route.continue(); });
    await fill(page, { name: "Pat Smith", email: "Pat@Firm.test", topic: "Encryption", message: "Is my data encrypted at rest?" });
    await dela(page).getByRole("button", { name: "Send message", exact: true }).click();
    const btn = dela(page).locator(".sec-form button[type=submit]");
    await page.waitForTimeout(200);
    ok((await btn.isDisabled()) && (await btn.innerText()).includes("Sending"), "the button is off and says Sending while the message goes");
    await btn.click({ force: true, timeout: 1000 }).catch(() => {});
    release();
    await waitFor(page, "Thank you. Your message was sent.");
    await page.unroute("**/api/public/security/contact");
    ok(!(await btn.isDisabled()), "the button works again after the answer");
    const rows = await sql("select name, email, topic, message from security_messages");
    ok(rows.length === 1 && rows[0].email === "pat@firm.test" && rows[0].topic === "Encryption" && rows[0].name === "Pat Smith", "one message saved (a second click while sending does nothing)");
    ok((await dela(page).getByLabel("Your message", { exact: true }).inputValue()) === "", "the form clears after sending");

    // The limit per hour
    const limit = Number((await sql("select dela_int_setting('security.contact_per_hour', 5) as n"))[0].n);
    for (let i = (await count()); i < limit; i++) {
      await fill(page, { name: "Pat", email: "pat@firm.test", topic: "More", message: "Question number " + i });
      await send(page, "Your message was sent.");
      await page.waitForTimeout(100);
    }
    ok((await count()) === limit, "messages up to the limit (" + limit + ") are saved");
    await fill(page, { name: "Pat", email: "pat@firm.test", topic: "More", message: "One too many" });
    await send(page, "Too many messages were sent from here. Please try again in an hour.");
    ok((await count()) === limit, "the message over the limit is not saved");

    // A server error
    await page.route("**/api/public/security/contact", (route) => route.fulfill({ status: 500, contentType: "application/json", body: "{\"error\":\"server_error\"}" }));
    await send(page, "Something went wrong and your message was not sent. Please try again.");
    await page.unroute("**/api/public/security/contact");
    await page.screenshot({ path: path.join(SHOTS, "security-wide.png"), fullPage: true });
    await ctx.close();

    // 2. Changed settings: every number follows them, and Zero Data Retention changes the OpenAI sentence
    const NEW = { data_location: "Supabase, hosted on AWS in Oregon", expiry_choices: [3, 21, 45], expiry_default: 21, extend_days: 11, grace_days: 6, link_minutes: 4, drafts_days: 61, warn_days: 9, login_hours: 13, link_warn_days: 3, openai_zdr: true };
    const KEYS = { data_location: "security.data_location", expiry_choices: "sharing.expiry_choices", expiry_default: "sharing.expiry_default", extend_days: "sharing.extend_days", grace_days: "sharing.grace_days",
      link_minutes: "confidential.link_minutes", drafts_days: "drafts.auto_delete_days", warn_days: "drafts.warn_days", login_hours: "confidential.login_hours", link_warn_days: "links.warn_days", openai_zdr: "security.openai_zdr" };
    for (const k of Object.keys(KEYS)) await setting(KEYS[k], NEW[k]);
    ({ ctx, page } = await open(browser));
    await checkFacts(page, NEW);
    await ctx.close();
    for (const k of Object.keys(KEYS)) await setting(KEYS[k], DEF[k]);

    // 3. Phone width: no sideways scrolling, every section and the form fit
    ({ ctx, page } = await open(browser, { width: 375, height: 760 }));
    for (const s of SECTIONS) ok(await dela(page).getByRole("heading", { name: s, level: 2, exact: true }).isVisible(), "phone: shows " + s);
    const wide = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth,
      over: [...document.querySelector(".dela-host").shadowRoot.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1 && !e.closest(".sec-trap")).map((e) => e.tagName + "." + e.className).slice(0, 5) }));
    ok(wide.doc <= wide.win && wide.over.length === 0, "phone: no sideways scrolling (" + wide.doc + " of " + wide.win + (wide.over.length ? ", too wide: " + wide.over.join(" ") : "") + ")");
    const box = await dela(page).getByLabel("Your message", { exact: true }).boundingBox();
    ok(box && box.x >= 0 && box.x + box.width <= 375, "phone: the message box fits the screen");
    await page.screenshot({ path: path.join(SHOTS, "security-phone.png"), fullPage: true });
    await ctx.close();

    // 4. The api cannot be reached: a plain message, no half-built page
    ({ ctx } = { ctx: await browser.newContext() });
    page = await ctx.newPage();
    await page.route("https://cdn.jsdelivr.net/**", (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(ROOT, u.pathname.split("@")[1].split("/").slice(1).join("/")), contentType: "application/javascript" }); });
    await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
    await page.route("**/api/public/security", (route) => route.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
    await page.goto(`${BASE}/page/DELA-Security?uid=0&plan=`);
    t = await waitFor(page, "This page could not load. Please refresh the page.");
    ok(!t.includes("Link and file expiration"), "when the facts cannot load, the page says so and shows no numbers");
    await ctx.close();

    console.log("\nAll " + passed + " security page checks passed.");
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });

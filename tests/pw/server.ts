// Local stand-in for BD + Supabase used by the browser tests.
// /page/<DELA-App|DELA-Admin>?uid=..&plan=..  renders the real widget through PHP, inside a page with clashing styles like BD's
// /api/...                                  the real api handler on the local test database
// /test/sql                                 runs SQL (test setup only)
// deno run -A tests/pw/server.ts   (port 8787)
import { handle } from "../../supabase/functions/api/app.ts";
import { pool, rpc } from "../lib/pg_rpc.ts";
import { stripeSignatureHeader } from "../../supabase/functions/api/lib/payments/stripe.ts";
import type { Storage } from "../../supabase/functions/api/lib/files/storage.ts";

const SECRET = "abcDEF0123456789abcDEF0123456789xyz";
const PORT = Number(Deno.env.get("PORT") ?? 8787);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const ROOT = new URL("../../", import.meta.url).pathname;

export const CI = "browser-test-ci-secret-0123456789abcdefgh";
// GitHub stand-in: the push button "starts" a run; the test reads the approval from /test/dispatch and plays GitHub's part
let lastDispatch: unknown = null;
let lastBdUpdate = "";
// File storage stand-in (Step 2a): uploads and links go to this server
const objects = new Map<string, Uint8Array>();
const storage: Storage = {
  signUpload: (p) => Promise.resolve(`${ORIGIN}/test/storage/up/${p}`),
  signDownload: (p, seconds, name) => Promise.resolve(`${ORIGIN}/test/storage/get/${p}?exp=${seconds}` + (name ? "&download=" + encodeURIComponent(name) : "")),
  size: (p) => Promise.resolve(objects.get(p)?.length ?? null),
  read: (p) => (objects.has(p) ? Promise.resolve(objects.get(p)!) : Promise.reject(new Error("missing"))),
  remove: (ps) => { ps.forEach((p) => objects.delete(p)); return Promise.resolve(); },
  put: (p, b) => { objects.set(p, b); return Promise.resolve(); },
};
// Stripe stand-in (Step 6): Checkout pages and payout setup are pages on this server; "paying" sends Stripe's signed event to the api
const WHSEC = "whsec_browser_test"; // rules-ok: a made-up test secret
const sessions = new Map<string, { pid: string; amount: number }>();
let stripeN = 0;
export let declineNext = false;
function fakeStripe(u: string, opts: RequestInit): Response | null {
  if (!u.startsWith("https://api.stripe.com/v1/")) return null;
  const path = new URL(u).pathname.slice(3), method = String(opts.method ?? "GET");
  const b = new URLSearchParams(String(opts.body ?? ""));
  if (method === "POST" && path === "/checkout/sessions") {
    const id = "cs_test_" + (++stripeN);
    sessions.set(id, { pid: b.get("client_reference_id") ?? "", amount: Number(b.get("line_items[0][price_data][unit_amount]")) });
    return Response.json({ id, url: ORIGIN + "/test/stripe/checkout/" + id });
  }
  if (method === "POST" && path === "/payment_intents") {
    if (declineNext) { declineNext = false; return Response.json({ error: { message: "Your card was declined.", code: "card_declined" } }, { status: 402 }); }
    return Response.json({ id: "pi_test_" + (++stripeN), status: "succeeded", amount: Number(b.get("amount")) });
  }
  if (method === "POST" && path === "/accounts") return Response.json({ id: "acct_test_" + (++stripeN) });
  if (method === "POST" && path === "/account_links") return Response.json({ url: ORIGIN + "/test/stripe/onboard?acct=" + b.get("account") + "&back=" + encodeURIComponent(b.get("return_url") ?? "") });
  if (method === "GET" && path.startsWith("/accounts/")) return Response.json({ id: path.slice(10), payouts_enabled: true, charges_enabled: true, requirements: { currently_due: [], past_due: [] } });
  if (method === "POST" && path === "/transfers") return Response.json({ id: "tr_test_" + (++stripeN) });
  if (method === "POST" && path === "/refunds") return Response.json({ id: "re_test_" + (++stripeN) });
  if (method === "GET" && path.startsWith("/payment_intents/")) return Response.json({ id: path.slice(17), status: "succeeded", amount: 0 });
  return Response.json({ error: { message: "no such route" } }, { status: 404 });
}
async function stripeEvent(type: string, object: Record<string, unknown>) {
  const payload = JSON.stringify({ id: "evt_" + crypto.randomUUID(), type, livemode: false, data: { object } });
  return await handle(new Request(ORIGIN + "/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": await stripeSignatureHeader(payload, WHSEC) }, body: payload }), deps);
}

// Playbook answers for the browser test (Step 2)
const FULL = {
  title: "New client intake", outcome: "A signed engagement letter and an opened file", practice_area: "Family law", jurisdiction: "California",
  when_to_use: "A new client signs", roles: "Attorney: engagement letter\nParalegal: opens the file", needs: ["Intake form"],
  steps: [{ text: "Run the conflict check", who: "paralegal", tag: "delegate", minutes: 10 }, { text: "Approve the engagement letter", who: "attorney", tag: "keep" }, { text: "Open the file in Clio", who: "paralegal", tool: "Clio", tag: "delegate" }],
  checks: ["Letter signed"], review_points: ["Attorney approves the engagement letter"], deliverables: "Opened file",
};
// Document standard answers for the browser test (docs/briefs/step-2d-document-standard.md)
const DOC_SOP = {
  type: "sop", title: "Run a conflict check", lifecycle: "INT", owner_role: "Paralegal", roles: ["Attorney", "Paralegal"], purpose: "Find conflicts before a consult.", scope: "Every new matter.",
  trigger: "A prospective client asks for a consult.", before_you_start: ["Access to Clio"], timing: "Within 1 business day of the request.", quality_check: ["The result is in the matter notes"],
  done_when: "The result is recorded in the matter notes.", saved_in: "Clio", related_links: [{ label: "INT-02 Respond to a new inquiry", url: "" }],
  decisions: [{ if: "a possible conflict", then: "Send it to the attorney.", attorney_decides: true, escalate_to: "Attorney" }],
  steps: [{ text: "Search the party names in Clio.", role: "Paralegal", raci: { Paralegal: "R,A" }, menu_path: "Clio > Contacts > Search" }, { text: "Record the results in the matter notes.", role: "Paralegal", raci: { Paralegal: "R,A" } },
    { text: "Decide whether to accept the matter.", role: "Attorney", raci: { Attorney: "R,A" }, attorney_decides: true }],
};
function documentAnswer(system: string): unknown {
  if (system.includes("document assistant inside Lawfecta, writing one")) {
    if (system.includes("writing one Policy")) return { document: { type: "policy", title: "Client trust account rules", roles: ["Attorney", "Paralegal"], owner_role: "Attorney", lifecycle: "BIL", purpose: "Keep client money safe.", scope: "Everyone who touches the trust account.",
      rules_must: ["Deposit client funds into the trust account within 1 business day"], rules_must_not: ["Pay firm bills from the trust account"], exceptions: "None without approval.", exceptions_role: "Attorney" }, questions: [], notices: [] };
    return { document: DOC_SOP, suggested_type: null, questions: ["Which report shows conflicts?"], notices: [] };
  }
  if (system.includes("fixing a law firm document")) return { document: DOC_SOP, notices: ["Set exactly one Accountable (A) on each step"] };
  // Step 4d: Automate or delegate (the api checks every suggestion in code; this stand-in also tries the whole document)
  if (system.includes("find specific groups of steps that could be automated")) return { estimate: { frequency: "weekly", minutes: 60 }, recommendations: [
    { kind: "delegate", title: "Collect and log intake forms", steps: [1, 2], why: "Repeatable with clear inputs and outputs.", share: 0.5, skills: ["Intake"], hours_each: 1.5 },
    { kind: "automate", title: "Log forms in Clio", steps: [3], why: "Clio can log each form.", share: 0.2, tool: "Clio", what_it_does: "Logs each returned form." },
    { kind: "delegate", title: "All of it", steps: [1, 2, 3, 4], why: "Everything.", share: 1 }] };
  if (system.includes("You classify one existing")) return { type: "sop", lifecycle: "INT", reason: "It is one clear path." };
  if (system.includes("rewriting an existing law firm playbook")) return { document: { ...DOC_SOP, title: "New client intake" } };
  if (system.includes("answering questions about one of the firm's documents")) return { reply: "That step is done by the paralegal.", change: null, note: "" };
  return null;
}
function playbookAnswer(system: string, user: string): unknown {
  const doc = documentAnswer(system);
  if (doc) return doc;
  if (system.includes("write down one repeatable process")) return { playbook: { title: "New client intake", outcome: "An opened file", steps: [{ text: "Run the conflict check" }] }, questions: ["Who signs the engagement letter?", "Which state is this for?"] };
  if (system.includes("improving a playbook draft")) return { playbook: FULL, questions: [] };
  if (system.includes("answering questions about one of the firm's playbooks")) {
    return user.includes("welcome") ? { reply: "I added a step to send the welcome email.", change: { ...FULL, steps: [...FULL.steps, { text: "Send the welcome email", tag: "automate" }] }, note: "Add a welcome email" }
      : { reply: "The paralegal runs the conflict check.", change: null };
  }
  if (system.includes("recorded in another tool")) return { playbook: { ...FULL, title: "File a motion", steps: [{ text: "Save the motion as a PDF", from: [1] }, { text: "Upload it to the court website", from: [2] }, { text: "Upload the filed copy to Clio", from: [3] }] }, questions: [] };
  if (system.includes("recorded their whole screen")) return { steps: [{ text: "Open the motion in Word and save it as a PDF", program: "Word", at_ms: 500, frames: [1], extra: [2] }, { text: "Upload the PDF to the court website", program: "Court site", at_ms: 2500, frames: [2] }], flagged: [] };
  if (system.includes("write one box")) return { text: "Senior paralegal, family law firm, 2019 to now.", questions: ["Which courts do you file in?"] };
  if (system.includes("write their profile")) return { headline: "Litigation paralegal for solo attorneys", summary: "I support solo attorneys with e-filing and discovery in Texas courts.", skills: ["E-filing", "Discovery"], software: ["Clio"], services: [{ title: "E-filing", for_whom: "Solo attorneys" }], questions: ["How many years have you done this?"] };
  if (system.includes("Suggest up to 8")) return { suggestions: [{ title: "Conflict check", why: "Every firm runs one before taking a matter." }] };
  // Step 4: the public version of a gig, the off-platform check and proposal help
  if (system.includes("public version of a Flex Gig")) return { title: "Client intake for a family law firm (Texas)", task: "Run the conflict check and open the file from our intake form.", outcome: "An opened file, ready for the attorney",
    steps: ["Run the conflict check", "Open the file in Clio", "Send for attorney review"], tools: ["Clio"], timing: "About 2 hours", state: "TX", practice_area: "Family law", skills: ["Client intake"] };
  if (system.includes("You review messages members send")) return /venmo|call me/i.test(user) ? { off_platform: true, kinds: ["payment_outside"], insights: [] } : { off_platform: false, kinds: [], insights: ["Prefers fixed-price work"] };
  if (system.includes("You check one review")) return /hurt you/i.test(user) ? { hold: true, kinds: ["threat"] } : { hold: false, kinds: [] };
  if (system.includes("checking one milestone")) {
    const ids = [...user.matchAll(/- ([a-z][0-9]+)/g)].map((m) => m[1]);
    const missing = user.includes("NOT DONE YET");
    return { findings: ids.map((id) => ({ id, met: missing && id === "c1" ? "no" : "yes", evidence: missing && id === "c1" ? "" : "The statement says so", note: missing && id === "c1" ? "The draft is not attached" : "" })) };
  }
  if (system.includes("suggesting next steps after a meeting")) return { steps: [{ who: "freelancer", text: "Send a proposal" }] };
  if (system.includes("qualifications part of a proposal")) return { qualifications: "Six years of family law intake, mostly in Clio.", included: "Conflict check; file opened in Clio", questions: [] };
  return null;
}
// A small PNG served as a Scribe screenshot
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAAK0lEQVR4nO3NMQ0AAAgDsAlDCYqRhQw4mvRvpvpExGKxWCwWi8VisVj8N16B+mj7BBLoxAAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

// OpenAI and Claude stand-ins: a member key ending "bad" is refused; text naming "Jane Roe" counts as client information
function fakeAi(u: string, opts: RequestInit): Response | null {
  const h = new Headers(opts.headers ?? {});
  const key = (h.get("authorization") ?? "").replace("Bearer ", "") || (h.get("x-api-key") ?? "");
  if (key.endsWith("bad")) return Response.json({ error: { code: "invalid_api_key", type: "authentication_error" } }, { status: 401 });
  const body = typeof opts.body === "string" ? JSON.parse(opts.body) : null;
  if (u.startsWith("https://api.openai.com/v1/")) {
    if (u.endsWith("/models")) return Response.json({ data: [{ id: "gpt-5.4-mini" }, { id: "gpt-transcribe" }] });
    if (u.endsWith("/audio/transcriptions")) return Response.json({ text: "Make a checklist for filing a motion" });
    const system = String(body?.messages?.[0]?.content ?? "");
    // OpenAI's own rule: JSON mode is refused unless the messages mention JSON
    if (body?.response_format?.type === "json_object" && !JSON.stringify(body.messages).toLowerCase().includes("json")) return Response.json({ error: { message: "'messages' must contain the word 'json'", type: "invalid_request_error" } }, { status: 400 });
    if (system.includes("summarizing a message thread")) return Response.json({ model: body.model, choices: [{ message: { content: "The attorney asked about intake; the freelancer can start Monday." } }], usage: { prompt_tokens: 20, completion_tokens: 10 } });
    if (system.includes("drafting a reply for the member")) return Response.json({ model: body.model, choices: [{ message: { content: "Thanks, Monday works for me." } }], usage: { prompt_tokens: 20, completion_tokens: 10 } });
    const pb = playbookAnswer(system, JSON.stringify(body?.messages?.at(-1) ?? ""));
    if (pb) return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify(pb) } }], usage: { prompt_tokens: 200, completion_tokens: 80 } });
    if (body?.response_format) return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify({ client_info: JSON.stringify(body.messages).includes("Jane Roe"), kinds: ["client_name"] }) } }], usage: { prompt_tokens: 9, completion_tokens: 3 } });
    const last = JSON.stringify(body?.messages?.at(-1) ?? "");
    return Response.json({ model: body?.model, choices: [{ message: { content: "Here is a checklist (OpenAI" + (key.includes("member") ? ", your key" : ", Lawfecta") + "):\n1. Draft the motion.\n2. File it." + (last.includes("<file") ? "\nI read your file." : "") } }], usage: { prompt_tokens: 100, completion_tokens: 30 } });
  }
  if (u.startsWith("https://api.anthropic.com/v1/")) {
    if (u.includes("/v1/models")) return Response.json({ data: [{ id: "claude-opus-5-5", type: "model", display_name: "Claude", created_at: "2026-01-01T00:00:00Z" }], has_more: false, first_id: "a", last_id: "a" });
    return Response.json({ id: "m", type: "message", role: "assistant", model: body?.model, content: [{ type: "text", text: "Claude here: 1. Plan the week. 2. Block time." }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } });
  }
  return null;
}
// Webhook receiver stand-in (Step 7): hooks.example.com is a public address that records what it gets
const webhookHits: Array<{ type: string; body: string; signature: string }> = [];
const DNS: Record<string, string[]> = { "hooks.example.com": ["93.184.216.34"], "inside.example.com": ["10.0.0.7"] };
const deps = {
  rpc,
  storage,
  resolve: (host: string) => Promise.resolve(DNS[host] ?? []),
  env: (k: string) => ({ BD_SHARED_SECRET: SECRET, DELA_ORIGINS: ORIGIN, STAGING_API_URL: ORIGIN + "/api", GITHUB_REPO: "SliceOfThanks/lawfecta", GITHUB_DISPATCH_TOKEN: "test-token", RELEASE_CI_SECRET: CI,
    PUBLIC_API_URL: ORIGIN + "/api", BD_API_KEY: "bd-browser-test-key", AI_KEY_ENCRYPTION_SECRET: "browser-test-encryption-secret-0123456789", OPENAI_API_KEY: "sk-lawfecta-browser-test-key-0000000000",
    STRIPE_SECRET_KEY: "sk_test_browser_0000000000", STRIPE_WEBHOOK_SECRET: WHSEC } as Record<string, string>)[k] ?? "", // rules-ok: made-up test keys
  fetch: (async (url: string | URL | Request, opts: RequestInit = {}) => {
    const u = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    // The Lawfecta listing (BD API): reads give a sample listing, updates are recorded for the test
    if (u.includes("/api/v2/user/get/")) return Response.json({ status: "success", message: [{ user_id: Number(u.split("/").pop()), first_name: "Lia", last_name: "Listing", company: "Listing Law", city: "Dallas", state_code: "TX", website: "listinglaw.com", about_me: "From the directory.", image_main_file: "/pictures/lia.jpg", card_info: "4111111111111111" }] });
    if (u.endsWith("/api/v2/user/update")) { lastBdUpdate = String(opts.body ?? ""); return Response.json({ status: "success", message: {} }); }
    if (u.startsWith("https://images.scribehow.com/")) return new Response(PNG, { headers: { "content-type": "image/png" } });
    if (u.startsWith("https://hooks.example.com/")) {
      const hd = new Headers((url instanceof Request ? url.headers : opts.headers) ?? {});
      webhookHits.push({ type: hd.get("dela-event-type") ?? "", body: String(opts.body ?? ""), signature: hd.get("dela-signature") ?? "" });
      return new Response("ok", { status: 200 });
    }
    const st = fakeStripe(u, url instanceof Request ? { method: url.method, body: opts.body } : opts);
    if (st) return st;
    const ai = fakeAi(u, url instanceof Request ? { headers: url.headers, body: opts.body } : opts);
    if (ai) return ai;
    if (u.endsWith("/dispatches")) { lastDispatch = JSON.parse(String(opts.body)); return new Response(null, { status: 204 }); }
    if (u.startsWith("https://api.github.com/")) return new Response("{}", { status: u.endsWith("/environments/live") ? 404 : 200 });
    return new Response("{}", { status: 404 });
  }) as typeof fetch,
};

async function page(widget: string, uid: string, plan: string, cookie = "") {
  const out = await new Deno.Command("php", { args: [ROOT + "tests/php/render_widget.php", widget, uid, plan, SECRET, ORIGIN + "/api", "test/lawfecta-dela", cookie] }).output();
  const html = new TextDecoder().decode(out.stdout);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lawfecta</title>
<style>body{margin:0;font-family:Times New Roman;font-size:10px;color:red} button{background:lime!important} h1{font-size:60px} table{border:5px solid red}</style></head>
<body><header style="padding:10px;background:#222;color:#fff">Lawfecta site header (BD)</header>${html}<footer style="padding:10px">BD footer</footer></body></html>`;
}

Deno.serve({ port: PORT, hostname: "127.0.0.1" }, async (req) => {
  const url = new URL(req.url);
  if (url.pathname.startsWith("/page/")) {
    return new Response(await page(url.pathname.slice(6), url.searchParams.get("uid") ?? "0", url.searchParams.get("plan") ?? "", url.searchParams.get("cookie") ?? ""), { headers: { "content-type": "text/html" } });
  }
  if (url.pathname === "/test/sql" && req.method === "POST") {
    const { sql } = await req.json();
    const r = await pool.query(sql);
    return Response.json({ rows: Array.isArray(r) ? r.at(-1).rows : r.rows });
  }
  if (url.pathname === "/test/dispatch") return Response.json(lastDispatch);
  if (url.pathname.startsWith("/test/stripe/checkout/")) {
    const ses = sessions.get(url.pathname.split("/").pop() ?? "");
    if (!ses) return new Response("no such checkout", { status: 404 });
    const pi = "pi_test_" + (++stripeN);
    await stripeEvent("checkout.session.completed", { id: "cs", client_reference_id: ses.pid, payment_intent: pi, payment_status: "paid", metadata: { payment_id: ses.pid } });
    const r = await stripeEvent("payment_intent.succeeded", { id: pi, amount: ses.amount, customer: "cus_browser", payment_method: "pm_browser", metadata: { payment_id: ses.pid } });
    return new Response(`<!doctype html><title>Stripe test checkout</title><h1>Test payment of ${ses.amount} cents: ${r.status === 200 ? "paid" : "failed"}</h1>`, { headers: { "content-type": "text/html" } });
  }
  if (url.pathname === "/test/stripe/onboard") return new Response(`<!doctype html><title>Stripe test onboarding</title><h1>Payout setup done for ${url.searchParams.get("acct")}</h1>`, { headers: { "content-type": "text/html" } });
  if (url.pathname === "/test/webhooks") return Response.json(webhookHits);
  if (url.pathname === "/test/stripe/decline-next") { declineNext = true; return Response.json({ ok: true }); }
  if (url.pathname === "/test/bd-update") return Response.json({ body: lastBdUpdate });
  if (url.pathname.startsWith("/test/storage/up/") && req.method === "PUT") {
    objects.set(url.pathname.slice(17), new Uint8Array(await req.arrayBuffer()));
    return Response.json({ Key: "ok" });
  }
  if (url.pathname.startsWith("/test/storage/get/")) {
    const b = objects.get(url.pathname.slice(18));
    // Like Supabase Storage: a download name means "save as" (Content-Disposition: attachment)
    const dn = url.searchParams.get("download");
    const hd: Record<string, string> = { "content-type": "application/octet-stream" };
    if (dn) hd["content-disposition"] = `attachment; filename="${dn.split('"').join("")}"`;
    return b ? new Response(b as Uint8Array<ArrayBuffer>, { headers: hd }) : new Response("gone", { status: 404 });
  }
  if (url.pathname.startsWith("/api")) return await handle(req, deps);
  return new Response("not found", { status: 404 });
});

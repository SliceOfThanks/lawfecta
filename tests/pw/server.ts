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
const bdFavs: Array<Record<string, string>> = [];
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
const acctReads = new Map<string, number>();
export let declineNext = false;
function fakeStripe(u: string, opts: RequestInit): Response | null {
  if (u.startsWith("https://api.stripe.com/v2/core/")) {
    const path2 = new URL(u).pathname.slice(3), method2 = String(opts.method ?? "GET"), j = method2 === "POST" ? JSON.parse(String(opts.body ?? "{}")) : {};
    if (method2 === "POST" && path2 === "/core/accounts") return Response.json({ id: "acct_test_" + (++stripeN) });
    if (method2 === "POST" && path2 === "/core/account_links") return Response.json({ url: ORIGIN + "/test/stripe/onboard?acct=" + j.account + "&back=" + encodeURIComponent(j.use_case?.account_onboarding?.return_url ?? "") });
    if (method2 === "GET" && path2.startsWith("/core/accounts/")) {
      // Like Stripe: the first answer after its setup page is still "pending"; the account is active a moment later
      const id = path2.slice(15), seen = (acctReads.get(id) ?? 0) + 1;
      acctReads.set(id, seen);
      return Response.json({ id, configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: seen > 1 ? "active" : "pending" } } } } }, requirements: { entries: seen > 1 ? [] : [{ description: "external_account", awaiting_action_from: "user" }] } });
    }
    return Response.json({ error: { message: "no such route" } }, { status: 404 });
  }
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
  if (method === "POST" && path === "/transfers") return Response.json({ id: "tr_test_" + (++stripeN) });
  if (method === "POST" && path === "/refunds") return Response.json({ id: "re_test_" + (++stripeN) });
  if (method === "GET" && path.startsWith("/payment_intents/")) return Response.json({ id: path.slice(17), status: "succeeded", amount: 0 });
  if (method === "GET" && path.startsWith("/payment_methods/")) return Response.json({ id: path.slice(17), type: "card", card: { brand: "visa", last4: "4242" } });
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
function documentAnswer(system: string, user = ""): unknown {
  // Step 55: the newcomer check, and the attorney's answers written into the document
  if (system.includes("has never worked with this firm")) return user.includes("Clio login from the office manager") ? { ready: true, summary: "Someone new could do this from the page.", findings: [] }
    : { ready: false, summary: "A newcomer would be stuck in two places.", findings: [{ kind: "access", step: 1, what: "The page does not say how a newcomer gets into Clio.", question: "How does a new person get a Clio login?" },
      { kind: "done", step: 0, what: "It is not clear what a finished conflict check looks like.", question: "What does a finished conflict check look like?" }] };
  if (system.includes("adding the attorney's answers into a law firm document")) {
    let d: Record<string, any> = DOC_SOP;
    try { d = JSON.parse(user.split("The document:\n")[1].split("\n\nThe gaps")[0]); } catch { d = DOC_SOP; }
    return { document: { ...d, before_you_start: [...(d.before_you_start ?? []), "Get a Clio login from the office manager."] }, notices: ["Added how to get a Clio login to Before you start."] };
  }
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
  // UX review Phase 4 part B: the checks before a commitment
  if (system.includes("Check a gig draft")) return { findings: [{ field: "outcome", problem: "What done looks like is vague.", suggestion: "The intake summary is saved in the matter in Clio." }, { field: "deadline", problem: "There is no deadline.", suggestion: "" }] };
  if (system.includes("Compare proposals for one gig")) return { proposals: [...user.matchAll(/id: ([0-9a-f-]{36})/g)].map((m, i) => ({ id: m[1], covers: i ? "Covers the calls only. This one is the best choice." : "Covers the calls and the conflict checks.", missing: ["Does not say what is left out"], ask: ["Who makes the calls?"] })) };
  if (system.includes("Compare an agreement")) return { findings: [{ field: "excluded", problem: "The agreement does not say what is not included.", suggestion: "" }] };
  if (system.includes("observable deliverables")) return { milestones: [{ seq: 1, deliverables: "A call log for every new client, saved in Clio", why: "Both of you can see it is done." }] };
  if (system.includes("tasks of a monthly engagement")) return { findings: [{ row: 1, field: "turnaround", problem: "There is no turnaround.", suggestion: "1 business day" }] };
  if (system.includes("freelancer's proposal before")) return { findings: [{ field: "excluded", problem: "Say what the price does not include.", suggestion: "Court filings are not included." }] };
  if (system.includes("Check the steps of a law firm procedure")) return { findings: [{ row: 1, field: "step", problem: "Not one clear action.", suggestion: "Call the new client within one business day." }] };
  if (system.includes("Improve the Purpose and Scope")) return { findings: [{ field: "purpose", problem: "The purpose is empty.", suggestion: "Bring every new client in the same way." }] };
  if (system.includes("Explain, in plain words")) return { items: [...user.matchAll(/id: (\S+)/g)].map((m) => ({ id: m[1], explain: "Plain words: fix this before approval. The document is approved." })) };
  if (system.includes("From a short description a lawyer wrote")) return { size: "2-5", practice_areas: ["Family law"], jurisdictions: "Texas state courts", systems: { practice_management: ["Clio", "MyCase"] } };
  if (system.includes("unsent request")) return { suggestion: "Draft a welcome email for new family law clients, from the intake form, by Friday.", missing: ["Who signs it"] };
  if (system.includes("search filters for finding a freelancer")) return { practice_area: "Family law", skill: "E-filing", tool: "Clio", state: "TX", why: "From the task you described." };
  if (system.includes("three short discussion points")) return { points: ["Scope", "Timing", "Tools"] };
  if (system.includes("own star ratings and notes")) return { review: "Calls were made on time and logged in Clio." };
  if (system.includes("You classify one existing")) return { type: "sop", lifecycle: "INT", reason: "It is one clear path." };
  if (system.includes("rewriting an existing law firm playbook")) return { document: { ...DOC_SOP, title: "New client intake" } };
  // Step 47: asked to add a step, DELA proposes the document with one more step, as a suggestion
  if (system.includes("answering questions about one of the firm's documents") && user.includes("add a welcome email step")) {
    let doc: any = null;
    try { const c = String(JSON.parse(user).content ?? ""); doc = JSON.parse(c.slice(c.indexOf("{"), c.lastIndexOf("}") + 1)); } catch { doc = null; }
    if (doc && Array.isArray(doc.steps)) return { reply: "I added a welcome email step.", change: { ...doc, purpose: "Find conflicts and welcome the client.", steps: [...doc.steps, { text: "Send the welcome email.", role: doc.steps[0]?.role ?? "Paralegal", raci: doc.steps[0]?.raci ?? {} }] }, note: "Add a welcome email step" };
  }
  if (system.includes("answering questions about one of the firm's documents")) return { reply: "That step is done by the paralegal.", change: null, note: "" };
  return null;
}
function playbookAnswer(system: string, user: string): unknown {
  const doc = documentAnswer(system, user);
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
    // Step 11: the dispute AI (summary, suggested offer, the team's draft)
    const dj = (o: unknown) => Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify(o) } }], usage: { prompt_tokens: 50, completion_tokens: 30 } });
    if (system.includes("Summarize both sides")) return dj({ summary: "The freelancer says the draft was delivered; the attorney says the exhibit list is missing.", agreed: ["The draft arrived"], open: ["The exhibit list"] });
    if (system.includes("public profile of a legal support agency")) return dj({ headline: "Family law support team for small Texas firms", summary: "We are a team of paralegals who prepare discovery responses, organize case files and draft documents for attorney review. We work in Clio and Microsoft 365 and answer within one business day.",
      practice_areas: ["Family law"], services: [{ title: "Discovery responses", description: "Drafted and organized for attorney review", price_min_cents: 30000, price_max_cents: 90000 }], tools: ["Clio", "Microsoft 365"], states_served: ["TX"], questions: ["Which counties do you file in?"] });
    // Step 13: the DELA guide answers a typed question and may point at a button on offer
    if (system.includes("You are the DELA guide")) return dj({ text: "Start with the first one; it is quick to hand to a freelancer.", button: 1 });
    if (system.includes("Suggest a fair settlement")) return dj({ release_cents: 15000, why: "The draft arrived; the exhibit list is still open." });
    if (system.includes("draft a decision")) return dj({ summary: "Half of the final packet was delivered.", terms: ["Deliverables: petition draft; exhibit list"], release_cents: 15000, why: "One of two parts.", note: "Half to each of you." });
    if (system.includes("suggesting what the member")) return Response.json({ model: body.model, choices: [{ message: { content: "- Answer the open question\n- Book a call" } }], usage: { prompt_tokens: 5, completion_tokens: 5 } });
    if (system.includes("drafting a reply for the member")) return Response.json({ model: body.model, choices: [{ message: { content: "Thanks, Monday works for me." } }], usage: { prompt_tokens: 20, completion_tokens: 10 } });
    // Step 45: Ask DELA with the workspace on may end an answer with its one question and choices
    // Step 78: asked which steps a freelancer could do, DELA names tasks tied to steps of the attached document (and two it must not show)
    if (system.includes("TASK: DELEGATE") && String(body?.messages?.at(-1)?.content ?? "").includes("could a freelancer do")) {
      const last78 = String(body.messages.at(-1).content), at = last78.indexOf('<document title="'), title78 = at < 0 ? "" : last78.slice(at + 17, last78.indexOf('"', at + 17));
      return Response.json({ model: body.model, choices: [{ message: { content: "Based on your intake process, here are tasks a freelancer could handle, along with the items that should remain with an attorney." +
        (title78 ? `\nTASK: DELEGATE | ${title78} | 1 | Run the conflict search | Search the firm's records and report every hit.\nTASK: KEEP | ${title78} | 2 | Approve the engagement | Decide whether the firm takes the matter.\nTASK: DELEGATE | ${title78} | 77 | A step that is not there | Nothing.\nTASK: DELEGATE | Someone else's manual | 1 | Not attached | Nothing.` : "") } }], usage: { prompt_tokens: 100, completion_tokens: 40 } });
    }
    if (system.includes("QUESTION: the one question") && JSON.stringify(body?.messages?.at(-1) ?? "").includes("ask me")) return Response.json({ model: body.model, choices: [{ message: { content: "Here is a start." + (JSON.stringify(body.messages.at(-1)).includes("<document") ? " I used your document." : "") + "\n\nQUESTION: Which matters does this cover?\nCHOICES: New matters only | All open matters" } }], usage: { prompt_tokens: 30, completion_tokens: 20 } });
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
    // Step 82 (pipeline-test.js): one attorney on a claim plan, one on a paid plan, and a number the website does not know
    if (u.endsWith("/api/v2/user/get/4821")) return Response.json({ status: "success", message: [{ user_id: 4821, first_name: "Cal", last_name: "Claim", company: "Claim Family Law", city: "Austin", state_code: "TX", website: "claimlaw.example", filename: "texas/austin/cal-claim", subscription_id: "15", signup_date: "2026-11-02 09:00:00", profession_id: "40", email: "cal@claimlaw.example" }] });
    if (u.endsWith("/api/v2/user/get/4822")) return Response.json({ status: "success", message: [{ user_id: 4822, first_name: "Pia", last_name: "Paid", company: "Paid Injury Law", city: "Reno", state_code: "NV", website: "https://paidlaw.example", filename: "nevada/reno/pia-paid", subscription_id: "11", signup_date: "2026-10-02 09:00:00", profession_id: "39" }] });
    if (u.endsWith("/api/v2/user/get/4829")) return Response.json({ status: "error", message: "user not found" }, { status: 404 });
    if (u.includes("/api/v2/user/get/")) return Response.json({ status: "success", message: [{ user_id: Number(u.split("/").pop()), first_name: "Lia", last_name: "Listing", company: "Listing Law", city: "Dallas", state_code: "TX", website: "listinglaw.com", about_me: "From the directory.", image_main_file: "/pictures/lia.jpg", card_info: "4111111111111111" }] });
    if (u.endsWith("/api/v2/user/update")) { lastBdUpdate = String(opts.body ?? ""); return Response.json({ status: "success", message: {} }); }
    // The website's billing (step 19): no test member has a billing account, which BD answers this way
    if (u.endsWith("/api/v2/user/transactions")) return Response.json({ status: "error", message: "user_id or client_id is required" }, { status: 400 });
    // The website's bookmark table (step 18, bookmarks): kept in memory for the run
    if (u.includes("/api/v2/users_favorite/")) {
      const uu = new URL(u), form = new URLSearchParams(String(opts.body ?? ""));
      if (uu.pathname.endsWith("/get")) { const who = uu.searchParams.get("property_value"); const rows = bdFavs.filter((x) => !who || x.userId === who); return rows.length ? Response.json({ status: "success", message: rows }) : Response.json({ status: "error", message: "users_favorite not found" }, { status: 404 }); }
      if (uu.pathname.endsWith("/create")) { const row: Record<string, string> = { id: String(900000 + bdFavs.length + 1) }; for (const k of ["userId", "ownerId", "postId", "dataType", "featureId", "checked"]) row[k] = form.get(k) ?? ""; bdFavs.push(row); return Response.json({ status: "success", message: row }); }
      if (uu.pathname.endsWith("/delete")) { const i = bdFavs.findIndex((x) => x.id === form.get("id")); if (i >= 0) bdFavs.splice(i, 1); return Response.json({ status: "success", message: "users_favorite record was deleted" }); }
    }
    // The website's posts of a member (step 18 part 2): one live promotion (post type 7) and one blog article
    if (u.includes("/api/v2/data_posts/get")) { const uid = new URL(u).searchParams.get("property_value");
      // Step 69: every member's posts of one type, for Recent activity (the two freelancers of categories-test.js)
      // Step 84 (master-test.js): events of the Event post type, as the website sends its days and times
      if (new URL(u).searchParams.get("property") === "data_id" && uid === "8") { const dd = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10).split("-").join("");
        return Response.json({ status: "success", message: [
          { post_id: "50", data_id: "8", user_id: "4811", post_status: "1", post_title: "M84 Records workshop", post_content: "<p>Bring one chart.</p><p>Questions: 512-555-0111</p>", post_category: "Category 1", post_start_date: dd(5) + "183000", post_expire_date: dd(5) + "200000", post_venue: "Online", post_promo: "Free", post_url: "https://events.example/workshop", post_image: "/uploads/news-pictures/workshop.webp" },
          { post_id: "51", data_id: "8", user_id: "0", post_status: "1", post_title: "M84 Legal ops webinar", post_content: "<p>An hour on intake.</p>", post_category: "Webinars", post_start_date: dd(9) + "120000", post_expire_date: "" },
          { post_id: "52", data_id: "8", user_id: "4811", post_status: "1", post_title: "M84 Last week's meetup", post_content: "", post_category: "Meetups", post_start_date: dd(-6) + "170000", post_expire_date: dd(-6) + "190000" },
          { post_id: "53", data_id: "8", user_id: "4812", post_status: "1", post_title: "M84 Austin meetup", post_content: "<p>Coffee and questions.</p>", post_category: "Meetups", post_start_date: dd(2) + "000000", post_expire_date: "", post_venue: "The Library Bar", post_location: "100 Main St, Austin, TX" }] }); }
      if (new URL(u).searchParams.get("property") === "data_id") return Response.json({ status: "success", message: uid === "15"
        ? [{ post_id: "30", data_id: "15", user_id: "4602", post_status: "1", post_title: "Five intake mistakes", post_content: "<p>The first one is skipping the conflict check. Call 512-555-0199.</p>", post_live_date: "20261118090000" },
          // Step 83 (master-test.js): articles with the website's topic on them, as its API sends the day
          { post_id: "40", data_id: "15", user_id: "4811", post_status: "1", post_title: "M83 How I build a chronology", post_content: "<p>Start with the intake notes.</p><p>Then sort every record by date.</p><p>Questions? nia@example.com</p>", post_category: "Trial Prep", post_live_date: "2026-11-20T09:00:00-08:00" },
          { post_id: "41", data_id: "15", user_id: "4812", post_status: "1", post_title: "M83 Custody filings checklist", post_content: "<p>Check the declaration first.</p>", post_category: "Family Law Tips", post_live_date: "2026-11-22T09:00:00-08:00", post_image: "/uploads/news-pictures/custody.webp" },
          { post_id: "42", data_id: "15", user_id: "4811", post_status: "1", post_title: "M83 Old notes on intake", post_content: "<p>Old notes.</p>", post_category: "Category 1", post_live_date: "2026-11-01T09:00:00-08:00" }]
        : [{ post_id: "31", data_id: "7", user_id: "4601", post_status: "1", post_title: "10% off the first project", post_content: "For new clients.", post_promo: "FIRST10", post_expire_date: "20991231", post_live_date: "20261119090000" },
          { post_id: "43", data_id: "7", user_id: "4811", post_status: "1", post_title: "M83 Free rush upgrade", post_content: "On your first chronology. Call 512-555-0199.", post_promo: "RUSH", post_category: "Category 1", post_expire_date: "20991231235900", post_live_date: "20261120090000" },
          { post_id: "44", data_id: "7", user_id: "4812", post_status: "1", post_title: "M83 15% off a custody package", post_content: "", post_promo: "", post_expire_date: "20270131235900", post_live_date: "20261118090000" },
          { post_id: "45", data_id: "7", user_id: "4811", post_status: "1", post_title: "M83 An offer that ended", post_content: "", post_promo: "", post_expire_date: "20200101", post_live_date: "20261121090000" }] });
      return Response.json({ status: "success", message: [
      { post_id: "3", data_id: "15", user_id: uid, post_status: "1", post_title: "How I organize a family law file", post_content: "<p>Start with the pleadings index.</p><p>Write to me at fern@example.com.</p>", post_live_date: "20261101120000" },
      { post_id: "1", data_id: "7", user_id: uid, post_status: "1", post_title: "New client discount", post_content: "<p>10% off the first fixed-fee project.</p>", post_promo: "FIRST10", post_expire_date: "20991231" },
      { post_id: "2", data_id: "14", user_id: uid, post_status: "1", post_title: "A blog article", post_content: "", post_promo: "", post_expire_date: "" }] }); }
    // Step 83: the article post type's settings, where the Blog's topics come from
    if (u.includes("/api/v2/data_categories/get/8")) return Response.json({ status: "success", message: [{ data_id: "8", data_name: "Event", feature_categories: "Category 1, Webinars, Meetups" }] });
    if (u.includes("/api/v2/data_categories/get/15")) return Response.json({ status: "success", message: [{ data_id: "15", data_name: "Community Article", feature_categories: "Category 1, Family Law Tips, Trial Prep" }] });
    // The website's categories (step 17): two top categories, specialties and sub subs, as BD lists them
    if (u.includes("/api/v2/list_professions/get")) return Response.json({ status: "success", message: [
      { profession_id: "39", name: "Legal Nurse & Medical Records", filename: "legal-nurse" }, { profession_id: "40", name: "Paralegal Services", filename: "paralegal-services" }] });
    if (u.includes("/api/v2/list_services/get")) return Response.json({ status: "success", message: [
      { service_id: "267", profession_id: "39", master_id: "0", name: "Medical Malpractice Review" }, { service_id: "275", profession_id: "39", master_id: "267", name: "Medical Chronology Creation" },
      { service_id: "308", profession_id: "40", master_id: "0", name: "Family Law" }, { service_id: "327", profession_id: "40", master_id: "308", name: "Discovery Support" },
      { service_id: "331", profession_id: "40", master_id: "308", name: "Clio" }, { service_id: "309", profession_id: "40", master_id: "0", name: "Civil Litigation" },
      { service_id: "354", profession_id: "40", master_id: "309", name: "Relativity" }] });
    if (u.startsWith("https://images.scribehow.com/")) return new Response(PNG, { headers: { "content-type": "image/png" } });
    // Scribe's read-only connection (step 76): a key ending "good" works, a key ending "plan" is on a plan without it, others are refused
    if (u.startsWith("https://public-api.scribehow.com/")) {
      const key = new Headers((url instanceof Request ? url.headers : opts.headers) ?? {}).get("x-api-key") ?? "";
      if (key.endsWith("plan")) return Response.json({ detail: "Your plan does not support Public API access." }, { status: 403 });
      if (!key.endsWith("good")) return Response.json({ detail: "Invalid API key." }, { status: 401 });
      const su = new URL(u);
      const docs = Array.from({ length: 27 }, (_, i) => ({ id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(i + 1).padStart(12, "0")}`, type: "scribe", name: i === 0 ? "Serve a subpoena" : "Guide number " + (i + 1),
        description: i === 0 ? "From issue to proof of service" : "", updated_at: "2026-11-01T10:00:00Z", team: { id: "t1", name: "Operations" }, alternative_urls: [], content: null,
        actions: i === 0 ? [{ id: "a1", description: "Open the subpoena form", screenshot_url: "https://images.scribehow.com/sub1.png" }, { id: "a2", description: "Fill in the witness name", screenshot_url: "https://evil.example.com/t.png" },
          { id: "a3", description: "Send it to the process server", screenshot_url: null }] : [{ id: "a1", description: "One step", screenshot_url: null }] }));
      if (su.pathname === "/v1/teams/") return Response.json({ count: 1, results: [{ id: "t1", name: "Operations" }] });
      if (su.pathname === "/v1/search/") { const b = JSON.parse(String(opts.body ?? "{}")); return Response.json(docs.filter((d) => d.name.toLowerCase().includes(String(b.search ?? "").toLowerCase())).slice(0, 20)); }
      if (su.pathname === "/v1/documents/") { const off = Number(su.searchParams.get("offset") ?? 0), lim = Number(su.searchParams.get("limit") ?? 100); return Response.json({ count: docs.length, results: docs.slice(off, off + lim) }); }
      const one = docs.find((d) => su.pathname === `/v1/documents/${d.id}/`);
      return one ? Response.json(one) : Response.json({ detail: "Not found." }, { status: 404 });
    }
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

// The browser suites share one database and look for their own people on Talent without a filter, so a page holds
// 50 here. The suite that tests "Load more" sets the size itself (tests/pw/categories-test.js).
await pool.query("update settings set value = '50' where key = 'talent.page_size'").catch(() => null);

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

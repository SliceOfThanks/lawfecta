// Local stand-in for BD + Supabase used by the browser tests.
// /page/<DELA-App|DELA-Admin>?uid=..&plan=..  renders the real widget through PHP, inside a page with clashing styles like BD's
// /api/...                                  the real api handler on the local test database
// /test/sql                                 runs SQL (test setup only)
// deno run -A tests/pw/server.ts   (port 8787)
import { handle } from "../../supabase/functions/api/app.ts";
import { pool, rpc } from "../lib/pg_rpc.ts";
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
// Playbook answers for the browser test (Step 2)
const FULL = {
  title: "New client intake", outcome: "A signed engagement letter and an opened file", practice_area: "Family law", jurisdiction: "California",
  when_to_use: "A new client signs", roles: "Attorney: engagement letter\nParalegal: opens the file", needs: ["Intake form"],
  steps: [{ text: "Run the conflict check", who: "paralegal", tag: "delegate", minutes: 10 }, { text: "Approve the engagement letter", who: "attorney", tag: "keep" }, { text: "Open the file in Clio", who: "paralegal", tool: "Clio", tag: "delegate" }],
  checks: ["Letter signed"], review_points: ["Attorney approves the engagement letter"], deliverables: "Opened file",
};
function playbookAnswer(system: string, user: string): unknown {
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
const deps = {
  rpc,
  storage,
  env: (k: string) => ({ BD_SHARED_SECRET: SECRET, DELA_ORIGINS: ORIGIN, STAGING_API_URL: ORIGIN + "/api", GITHUB_REPO: "SliceOfThanks/lawfecta", GITHUB_DISPATCH_TOKEN: "test-token", RELEASE_CI_SECRET: CI,
    PUBLIC_API_URL: ORIGIN + "/api", BD_API_KEY: "bd-browser-test-key", AI_KEY_ENCRYPTION_SECRET: "browser-test-encryption-secret-0123456789", OPENAI_API_KEY: "sk-lawfecta-browser-test-key-0000000000" } as Record<string, string>)[k] ?? "", // rules-ok: made-up test keys
  fetch: (async (url: string | URL | Request, opts: RequestInit = {}) => {
    const u = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    // The Lawfecta listing (BD API): reads give a sample listing, updates are recorded for the test
    if (u.includes("/api/v2/user/get/")) return Response.json({ status: "success", message: [{ user_id: Number(u.split("/").pop()), first_name: "Lia", last_name: "Listing", company: "Listing Law", city: "Dallas", state_code: "TX", website: "listinglaw.com", about_me: "From the directory.", image_main_file: "/pictures/lia.jpg", card_info: "4111111111111111" }] });
    if (u.endsWith("/api/v2/user/update")) { lastBdUpdate = String(opts.body ?? ""); return Response.json({ status: "success", message: {} }); }
    if (u.startsWith("https://images.scribehow.com/")) return new Response(PNG, { headers: { "content-type": "image/png" } });
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
  if (url.pathname === "/test/bd-update") return Response.json({ body: lastBdUpdate });
  if (url.pathname.startsWith("/test/storage/up/") && req.method === "PUT") {
    objects.set(url.pathname.slice(17), new Uint8Array(await req.arrayBuffer()));
    return Response.json({ Key: "ok" });
  }
  if (url.pathname.startsWith("/test/storage/get/")) {
    const b = objects.get(url.pathname.slice(18));
    return b ? new Response(b as Uint8Array<ArrayBuffer>, { headers: { "content-type": "application/octet-stream" } }) : new Response("gone", { status: 404 });
  }
  if (url.pathname.startsWith("/api")) return await handle(req, deps);
  return new Response("not found", { status: 404 });
});

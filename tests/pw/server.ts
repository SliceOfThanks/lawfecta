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
// File storage stand-in (Step 2a): uploads and links go to this server
const objects = new Map<string, Uint8Array>();
const storage: Storage = {
  signUpload: (p) => Promise.resolve(`${ORIGIN}/test/storage/up/${p}`),
  signDownload: (p, seconds, name) => Promise.resolve(`${ORIGIN}/test/storage/get/${p}?exp=${seconds}` + (name ? "&download=" + encodeURIComponent(name) : "")),
  size: (p) => Promise.resolve(objects.get(p)?.length ?? null),
  read: (p) => (objects.has(p) ? Promise.resolve(objects.get(p)!) : Promise.reject(new Error("missing"))),
  remove: (ps) => { ps.forEach((p) => objects.delete(p)); return Promise.resolve(); },
};
// OpenAI and Claude stand-ins: a member key ending "bad" is refused; text naming "Jane Roe" counts as client information
function fakeAi(u: string, opts: RequestInit): Response | null {
  const h = new Headers(opts.headers ?? {});
  const key = (h.get("authorization") ?? "").replace("Bearer ", "") || (h.get("x-api-key") ?? "");
  if (key.endsWith("bad")) return Response.json({ error: { code: "invalid_api_key", type: "authentication_error" } }, { status: 401 });
  const body = typeof opts.body === "string" ? JSON.parse(opts.body) : null;
  if (u.startsWith("https://api.openai.com/v1/")) {
    if (u.endsWith("/models")) return Response.json({ data: [{ id: "gpt-5.4-mini" }, { id: "gpt-transcribe" }] });
    if (u.endsWith("/audio/transcriptions")) return Response.json({ text: "Make a checklist for filing a motion" });
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
    AI_KEY_ENCRYPTION_SECRET: "browser-test-encryption-secret-0123456789", OPENAI_API_KEY: "sk-lawfecta-browser-test-key-0000000000" } as Record<string, string>)[k] ?? "", // rules-ok: made-up test keys
  fetch: (async (url: string | URL | Request, opts: RequestInit = {}) => {
    const u = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
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

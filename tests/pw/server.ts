// Local stand-in for BD + Supabase used by the browser tests.
// /page/<DELA-App|DELA-Admin>?uid=..&plan=..  renders the real widget through PHP, inside a page with clashing styles like BD's
// /api/...                                  the real api handler on the local test database
// /test/sql                                 runs SQL (test setup only)
// deno run -A tests/pw/server.ts   (port 8787)
import { handle } from "../../supabase/functions/api/app.ts";
import { pool, rpc } from "../lib/pg_rpc.ts";

const SECRET = "abcDEF0123456789abcDEF0123456789xyz";
const PORT = Number(Deno.env.get("PORT") ?? 8787);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const ROOT = new URL("../../", import.meta.url).pathname;

const deps = { rpc, env: (k: string) => ({ BD_SHARED_SECRET: SECRET, DELA_ORIGINS: ORIGIN, STAGING_API_URL: ORIGIN + "/api" } as Record<string, string>)[k] ?? "" };

async function page(widget: string, uid: string, plan: string) {
  const out = await new Deno.Command("php", { args: [ROOT + "tests/php/render_widget.php", widget, uid, plan, SECRET, ORIGIN + "/api", "test/lawfecta-dela"] }).output();
  const html = new TextDecoder().decode(out.stdout);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lawfecta</title>
<style>body{margin:0;font-family:Times New Roman;font-size:10px;color:red} button{background:lime!important} h1{font-size:60px} table{border:5px solid red}</style></head>
<body><header style="padding:10px;background:#222;color:#fff">Lawfecta site header (BD)</header>${html}<footer style="padding:10px">BD footer</footer></body></html>`;
}

Deno.serve({ port: PORT, hostname: "127.0.0.1" }, async (req) => {
  const url = new URL(req.url);
  if (url.pathname.startsWith("/page/")) {
    return new Response(await page(url.pathname.slice(6), url.searchParams.get("uid") ?? "0", url.searchParams.get("plan") ?? ""), { headers: { "content-type": "text/html" } });
  }
  if (url.pathname === "/test/sql" && req.method === "POST") {
    const { sql } = await req.json();
    const r = await pool.query(sql);
    return Response.json({ rows: Array.isArray(r) ? r.at(-1).rows : r.rows });
  }
  if (url.pathname.startsWith("/api")) return await handle(req, deps);
  return new Response("not found", { status: 404 });
});

// Step 4, part 1 tests: the tech catalog. Stacey's real file is read and checked, the team previews, confirms and pauses,
// members cannot reach it, and DELA's AI gets only active catalog tools, only when the member asks about software.
// The real handler and the local test database, with an OpenAI stand-in. Run after tools/dbtest.sh:
//   deno test -A supabase/functions/api/catalog_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { asksAboutTools, parseCsv, rankForMember, readCatalog } from "./lib/catalog/csv.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "C".repeat(40); // rules-ok: a made-up test key
const STACEY_FILE = await Deno.readTextFile(new URL("../../../data/tech-catalog/catalog-2026-11-05.csv", import.meta.url));
const systems: string[] = [];

const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/chat/completions")) {
    const body = JSON.parse(String(init.body));
    const system = String(body.messages[0].content);
    if (body.response_format) return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify({ client_info: false, kinds: [] }) } }], usage: { prompt_tokens: 1, completion_tokens: 1 } });
    systems.push(system);
    return Response.json({ model: body.model, choices: [{ message: { content: "Clio Manage fits a solo family law practice." } }], usage: { prompt_tokens: 10, completion_tokens: 10 } });
  }
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const deps: Deps = { rpc, env: (k) => ({ OPENAI_API_KEY: LAWFECTA, DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: fakeFetch };

async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}

const RUN = Date.now() % 1000000;
async function member(n: number, plan: string) {
  const bd = 7_100_000 + RUN * 10 + n;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await pool.query("insert into people (bd_member_id, display_name) values ($1, $2) returning id", [bd, "Cat " + n])).rows[0].id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
let att: Awaited<ReturnType<typeof member>>, team: Awaited<ReturnType<typeof member>>;

Deno.test("Stacey's catalog file reads cleanly: 33 tools, lists split, prices as numbers", () => {
  const r = readCatalog(STACEY_FILE);
  assert(r.ok, JSON.stringify(!r.ok && r.problems.slice(0, 3)));
  if (!r.ok) return;
  assertEquals(r.tools.length, 33);
  const clio = r.tools.find((t) => t.tool_id === "clio-manage")!;
  assertEquals(clio.firm_sizes, ["Solo", "2-10", "11-50"]);
  assertEquals(clio.starting_price_usd_month, 49);
  assertEquals(clio.free_plan, false);
  assertEquals(clio.description, "Cloud practice management for law firms: matters, contacts, calendar, documents, time and billing.", "a quoted cell with commas stays whole");
  assertEquals(r.tools.find((t) => t.tool_id === "filevine")!.starting_price_usd_month, null, "an empty price stays empty");
});

Deno.test("problems are listed by row and column, and nothing is accepted", () => {
  const head = STACEY_FILE.split(/\r?\n/)[0];
  const bad = head + "\n" +
    "Clio Manage,Clio Manage,Clio,www.clio.com,Practice management,,Desc,Best,,All,Solo; 1-5,,Feat,,,,Per user per month,4x,Maybe,,,Hard,,,,,,,No,live,11/05/2026\n" +
    "dup,Dup,Vendor,https://dup.example.com,Other,,Desc,Best,,,Solo,,Feat,,,,Free,,No,,,,,,,,,,No,active,2026-11-05\n" +
    "dup,Dup again,Vendor,https://dup.example.com,Other,,Desc,Best,,,Solo,,Feat,,,,Free,,No,,,,,,,,,,No,active,2026-11-05\n";
  const r = readCatalog(bad);
  assert(!r.ok);
  if (r.ok) return;
  const has = (row: number, col: string) => r.problems.some((p) => p.row === row && p.column === col);
  assert(has(2, "tool_id") && has(2, "website") && has(2, "firm_sizes") && has(2, "starting_price_usd_month") && has(2, "free_plan") && has(2, "learning_curve") && has(2, "status") && has(2, "last_reviewed"), JSON.stringify(r.problems));
  assert(r.problems.some((p) => p.row === 4 && p.problem.includes("row 3")), "a repeated tool_id names the first row");
  const noCols = readCatalog("name,vendor\nClio,Clio\n");
  assert(!noCols.ok && noCols.problems[0].problem.includes("columns are missing"));
  assertEquals(parseCsv('a,"b ""c"", d"\r\n1,2'), [["a", 'b "c", d'], ["1", "2"]]);
});

Deno.test("ranking: fits first, and a partner label never moves a tool up", () => {
  const r = readCatalog(STACEY_FILE);
  if (!r.ok) throw new Error("bad file");
  const tools = r.tools.map((t) => (t.tool_id === "harvey" ? { ...t, lawfecta_partner: true } : t));
  const ranked = rankForMember(tools, { practice_areas: ["Immigration"], software: [] });
  assertEquals(ranked[0].tool_id, "practicepanther", "the first immigration fit in the file comes first");
  assert(ranked.findIndex((t) => t.tool_id === "harvey") > 10, "the partner label did not lift Harvey");
  assert(asksAboutTools("Which billing software should I use?") && !asksAboutTools("Draft three steps for a welcome packet"));
});

Deno.test("setup", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('ai_generation', 'tech_catalog')");
  att = await member(1, "att_pro");
  team = await member(2, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'support')", [team.id]);
});

Deno.test("only the Lawfecta Team uploads; preview, confirm, replace, history", async () => {
  assertEquals((await call("POST", "/admin/catalog/preview", att.token, { file_name: "x.csv", text: STACEY_FILE })).status, 403, "members cannot upload");
  assertEquals((await call("GET", "/admin/catalog", att.token)).status, 403);
  const p = (await call("POST", "/admin/catalog/preview", team.token, { file_name: "tech-catalog.csv", text: STACEY_FILE })).body.data;
  assertEquals([p.ok, p.first_upload, p.added, p.rows], [true, true, 33, 33], JSON.stringify(p));
  const again = (await call("POST", "/admin/catalog/preview", team.token, { file_name: "tech-catalog.csv", text: STACEY_FILE })).body.data;
  assertEquals(again.version_id, p.version_id, "the same file twice is one preview");
  assertEquals((await pool.query("select count(*)::int n from tech_catalog_versions where state = 'active'")).rows[0].n, 0, "nothing changes before Confirm");
  assertEquals((await call("POST", "/admin/catalog/confirm", team.token, { version_id: p.version_id })).body.data.ok, true);
  assertEquals((await call("POST", "/admin/catalog/confirm", team.token, { version_id: p.version_id })).body.data.duplicate, true, "confirming twice is safe");
  // A second file: one tool changed, one removed, one added
  const lines = STACEY_FILE.trimEnd().split(/\r?\n/);
  const edited = lines.filter((l) => !l.startsWith("stable,")).map((l) => (l.startsWith("mycase,") ? l.replace(",39,", ",45,") : l));
  edited.push("tyler-efile,Tyler Odyssey eFile,Tyler Technologies,https://www.tylertech.com,E-filing,,Court e-filing in many states.,Firms that e-file in Tyler courts,,All,Solo; 2-10; 11-50,,E-filing,,,Web,Per use,,No,,,Low,,,,,,,No,active,2026-11-05");
  const p2 = (await call("POST", "/admin/catalog/preview", team.token, { file_name: "tech-catalog-2.csv", text: edited.join("\n") })).body.data;
  assertEquals([p2.added, p2.changed, p2.removed], [1, 1, 1], JSON.stringify(p2));
  assertEquals(p2.added_names, ["Tyler Odyssey eFile"]);
  assertEquals(p2.removed_names, ["Stable"]);
  assertEquals(p2.changed_tools, [{ name: "MyCase", fields: ["starting_price_usd_month"] }]);
  await call("POST", "/admin/catalog/confirm", team.token, { version_id: p2.version_id });
  const a = (await call("GET", "/admin/catalog", team.token)).body.data;
  assertEquals(a.tools.length, 33);
  assertEquals(a.versions.map((v: any) => v.state), ["active", "replaced"], "every earlier version is kept");
  const bad = (await call("POST", "/admin/catalog/preview", team.token, { file_name: "bad.csv", text: "name\nClio" })).body.data;
  assertEquals(bad.reason, "catalog_problems");
});

Deno.test("pause stops DELA recommending a tool; the AI gets the catalog only when asked about software", async () => {
  assertEquals((await call("POST", "/admin/catalog/pause", team.token, { tool_id: "clio-manage", pause: true, reason: "Checking prices" })).body.data.status, "paused");
  assertEquals((await call("POST", "/admin/catalog/pause", team.token, { tool_id: "clio-manage", pause: true })).body.data.duplicate, true);
  const active = (await rpc("dela_catalog_active", {})) as Array<Record<string, unknown>>;
  assert(!active.some((t) => t.tool_id === "clio-manage") && active.some((t) => t.tool_id === "mycase"));
  systems.length = 0;
  await call("POST", "/ai/chat/send", att.token, { content: "Draft three steps for sending a welcome packet", request_id: crypto.randomUUID() });
  assert(systems.length === 1 && !systems[0].includes("Lawfecta tech catalog"), "no catalog when the member is not asking about tools");
  await call("POST", "/ai/chat/send", att.token, { content: "Which practice management software should my firm use?", request_id: crypto.randomUUID() });
  const sys = systems.at(-1)!;
  assert(sys.includes("recommend software only from the Lawfecta tech catalog") && sys.includes("MyCase (AffiniPay; Practice management)"), "the catalog and its rules go with a software question");
  assert(!sys.includes("Clio Manage (Clio;"), "a paused tool is never offered to the AI");
  await call("POST", "/admin/catalog/pause", team.token, { tool_id: "clio-manage", pause: false });
  await pool.query("update feature_switches set state = 'off' where key = 'tech_catalog'");
  await call("POST", "/ai/chat/send", att.token, { content: "Which billing software should I use?", request_id: crypto.randomUUID() });
  assert(!systems.at(-1)!.includes("Lawfecta tech catalog"), "switch off: no catalog");
});

Deno.test("teardown", async () => { await pool.end(); });

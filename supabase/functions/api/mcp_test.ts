// DELA in ChatGPT and Claude (MCP connector) API tests: sign in with PKCE, approve on the DELA page, tokens, tools,
// refresh, a code used twice, disconnect, the switch, the plan list, the pause, the rate limit and the freelancer side.
// Run after tools/dbtest.sh:   deno test -A supabase/functions/api/mcp_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { b64url, sessionHash } from "./lib/crypto.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "M".repeat(40); // rules-ok: a made-up test key
const BASE = "https://dela.test/functions/v1/api";
const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/chat/completions")) {
    const body = JSON.parse(String(init.body));
    const system = String(body.messages[0].content);
    let out: unknown = {};
    if (body.response_format && system.includes("legal operations tool")) out = { client_info: false, kinds: [] };
    else out = { playbook: { title: "Send the engagement letter", outcome: "Signed letter on file", steps: [{ text: "Fill in the letter template" }, { text: "Send it for e-signature" }] }, questions: ["Who signs for the firm?"] };
    return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 10 } });
  }
  throw new Error("unexpected fetch " + url);
}) as typeof fetch;
const deps: Deps = { rpc, env: (k) => ({ OPENAI_API_KEY: LAWFECTA, PUBLIC_API_URL: BASE, DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: fakeFetch };

async function raw(method: string, path: string, init: { headers?: Record<string, string>; body?: string } = {}) {
  return await handle(new Request("http://localhost/functions/v1/api" + path, { method, headers: init.headers, body: init.body }), deps);
}
async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await raw(method, path, { headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
}
let rpcId = 0;
async function mcp(token: string, method: string, params?: unknown, notify = false) {
  const res = await raw("POST", "/mcp", { headers: { authorization: "Bearer " + token, "content-type": "application/json", "mcp-protocol-version": "2025-11-25" },
    body: JSON.stringify({ jsonrpc: "2.0", method, ...(notify ? {} : { id: ++rpcId }), ...(params ? { params } : {}) }) });
  return { status: res.status, headers: res.headers, body: res.status === 202 ? null : await res.json() };
}
const tool = async (token: string, name: string, args: Record<string, unknown> = {}) => (await mcp(token, "tools/call", { name, arguments: args })).body.result;

const RUN = Date.now() % 1000000;
async function member(n: number, plan: string) {
  const bd = 6_000_000 + RUN * 10 + n;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await pool.query("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Mcp " + n, `m${n}@test.invalid`])).rows[0].id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}

async function pkce() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  return { verifier, challenge };
}
const REDIRECT = "https://chatgpt.com/connector_platform_oauth_redirect";

async function register(name = "ChatGPT") {
  const r = await raw("POST", "/oauth/register", { headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: name, redirect_uris: [REDIRECT] }) });
  assertEquals(r.status, 201);
  return (await r.json()).client_id as string;
}

// The whole sign in, the way ChatGPT and Claude do it
async function signIn(session: string, client: string, opts: { approve?: boolean; form?: boolean } = {}) {
  const p = await pkce();
  const q = new URLSearchParams({ response_type: "code", client_id: client, redirect_uri: REDIRECT, code_challenge: p.challenge, code_challenge_method: "S256", state: "st-" + RUN, scope: "dela" });
  const a = await raw("GET", "/oauth/authorize?" + q);
  assertEquals(a.status, 302);
  const loc = new URL(a.headers.get("location")!);
  assertEquals(loc.searchParams.get("tab"), "connect");
  const req = loc.searchParams.get("req")!;
  const shown = await call("GET", "/oauth/request?req=" + encodeURIComponent(req), session);
  const d = await call("POST", "/oauth/decide", session, { req, approve: opts.approve !== false });
  if (!d.body.ok) return { shown: shown.body, decide: d.body };
  const back = new URL(d.body.redirect);
  const code = back.searchParams.get("code") ?? "";
  const fields = { grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: client, code_verifier: p.verifier };
  const t = opts.form
    ? await raw("POST", "/oauth/token", { headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fields).toString() })
    : await raw("POST", "/oauth/token", { headers: { "content-type": "application/json" }, body: JSON.stringify(fields) });
  return { req, shown: shown.body, decide: d.body, back, code, verifier: p.verifier, tokenStatus: t.status, token: await t.json() };
}

let att: Awaited<ReturnType<typeof member>>, fl: Awaited<ReturnType<typeof member>>, other: Awaited<ReturnType<typeof member>>;
let client = "";

Deno.test("setup", async () => {
  att = await member(1, "att_pro");
  fl = await member(2, "fl_free");
  other = await member(3, "att_pro");
  await pool.query("update feature_switches set state = 'everyone' where key in ('mcp_connector', 'ai_generation', 'playbook_library')");
  await pool.query("update settings set value = value || '{\"connector\": false}' where key = 'emergency.pause'");
});

Deno.test("discovery: protected resource, auth server metadata and the 401 that points to them", async () => {
  const pr = await (await raw("GET", "/.well-known/oauth-protected-resource")).json();
  assertEquals(pr.resource, BASE + "/mcp");
  assertEquals(pr.authorization_servers, [BASE]);
  const m = await raw("GET", "/.well-known/oauth-authorization-server");
  assertEquals(m.headers.get("access-control-allow-origin"), "*");
  const meta = await m.json();
  assertEquals(meta.token_endpoint, BASE + "/oauth/token");
  assertEquals(meta.code_challenge_methods_supported, ["S256"]);
  assertEquals((await (await raw("GET", "/.well-known/openid-configuration")).json()).issuer, BASE);
  const u = await raw("POST", "/mcp", { headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }) });
  assertEquals(u.status, 401);
  assert(u.headers.get("www-authenticate")!.includes(`resource_metadata="${BASE}/.well-known/oauth-protected-resource"`));
  assertEquals((await raw("GET", "/mcp")).status, 405);
  const pre = await raw("OPTIONS", "/mcp", { headers: { origin: "https://claude.ai" } });
  assert(pre.headers.get("access-control-allow-headers")!.includes("authorization"));
  // The member pages keep their own origin list
  assertEquals((await raw("GET", "/health", { headers: { origin: "https://claude.ai" } })).headers.get("access-control-allow-origin"), "https://lawfecta.com");
});

Deno.test("registration refuses unsafe redirect addresses; authorize refuses a wrong redirect or no PKCE", async () => {
  for (const bad of [["http://evil.test/cb"], [], ["https://x.test/cb#frag"], ["javascript:alert(1)"]]) {
    const r = await raw("POST", "/oauth/register", { headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "Bad", redirect_uris: bad }) });
    assertEquals(r.status, 400, JSON.stringify(bad));
  }
  const ok = await raw("POST", "/oauth/register", { headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "Claude Desktop", redirect_uris: ["http://localhost:6274/callback"] }) });
  assertEquals(ok.status, 201);
  client = await register();
  const p = await pkce();
  const wrong = await raw("GET", "/oauth/authorize?" + new URLSearchParams({ response_type: "code", client_id: client, redirect_uri: "https://evil.test/cb", code_challenge: p.challenge, code_challenge_method: "S256" }));
  assertEquals(wrong.status, 400);
  assertEquals((await wrong.json()).error, "invalid_redirect_uri");
  const plain = await raw("GET", "/oauth/authorize?" + new URLSearchParams({ response_type: "code", client_id: client, redirect_uri: REDIRECT, code_challenge: p.challenge, code_challenge_method: "plain" }));
  assertEquals(plain.status, 400);
  const unknown = await raw("GET", "/oauth/authorize?" + new URLSearchParams({ response_type: "code", client_id: "dc_nobody", redirect_uri: REDIRECT, code_challenge: p.challenge, code_challenge_method: "S256" }));
  assertEquals((await unknown.json()).error, "invalid_client");
});

let access = "", refresh = "";
Deno.test("attorney signs in: the page shows the app, approving sends a code back, the token needs the right PKCE verifier", async () => {
  const s = await signIn(att.token, client);
  assertEquals(s.shown.ok, true);
  assertEquals(s.shown.client_name, "ChatGPT");
  assertEquals(s.shown.redirect_host, "chatgpt.com");
  assertEquals(s.shown.side, "attorney");
  assertEquals(s.back!.origin + s.back!.pathname, REDIRECT);
  assertEquals(s.back!.searchParams.get("state"), "st-" + RUN);
  assertEquals(s.back!.searchParams.get("iss"), BASE);
  assertEquals(s.tokenStatus, 200);
  assert(String(s.token.access_token).startsWith("dm_"));
  assertEquals(s.token.token_type, "Bearer");
  assertEquals(s.token.expires_in, 3600);
  access = s.token.access_token; refresh = s.token.refresh_token;
  // Only hashes are stored
  const stored = (await pool.query("select count(*)::int n from mcp_tokens where token_hash = $1", [access])).rows[0].n;
  assertEquals(stored, 0);
  // The approval request is used up
  const again = await call("POST", "/oauth/decide", att.token, { req: s.req, approve: true });
  assertEquals(again.body.reason, "request_expired");
});

Deno.test("a wrong verifier is refused, and a code used twice stops the connection it made", async () => {
  // Wrong verifier
  const p = await pkce();
  const q = new URLSearchParams({ response_type: "code", client_id: client, redirect_uri: REDIRECT, code_challenge: p.challenge, code_challenge_method: "S256" });
  const req = new URL((await raw("GET", "/oauth/authorize?" + q)).headers.get("location")!).searchParams.get("req")!;
  const code = new URL((await call("POST", "/oauth/decide", att.token, { req, approve: true })).body.redirect).searchParams.get("code")!;
  const bad = await raw("POST", "/oauth/token", { headers: { "content-type": "application/json" }, body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: client, code_verifier: (await pkce()).verifier }) });
  assertEquals(bad.status, 400);
  assertEquals((await bad.json()).error, "invalid_grant");
  // Reuse: sign in (form body, the way most apps send it), then send the same code again
  const s = await signIn(att.token, client, { form: true });
  assertEquals(s.tokenStatus, 200);
  assertEquals((await mcp(s.token.access_token, "ping")).status, 200);
  const reuse = await raw("POST", "/oauth/token", { headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code: s.code!, redirect_uri: REDIRECT, client_id: client, code_verifier: s.verifier! }).toString() });
  assertEquals(reuse.status, 400);
  assertEquals((await mcp(s.token.access_token, "ping")).status, 401);
  // The first connection is untouched
  assertEquals((await mcp(access, "ping")).status, 200);
});

Deno.test("denying sends the app an access_denied answer and makes no code", async () => {
  const s = await signIn(att.token, client, { approve: false });
  assertEquals(s.back!.searchParams.get("error"), "access_denied");
  assertEquals(s.back!.searchParams.get("code"), null);
  assertEquals(s.tokenStatus, 400);
});

Deno.test("initialize, tools/list and notifications", async () => {
  const i = await mcp(access, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
  assertEquals(i.status, 200);
  assertEquals(i.body.result.protocolVersion, "2025-06-18");
  assertEquals(i.body.result.serverInfo.title, "Lawfecta DELA");
  assert(i.body.result.instructions.includes("Confidential client information"));
  const unknownVersion = await mcp(access, "initialize", { protocolVersion: "1999-01-01" });
  assertEquals(unknownVersion.body.result.protocolVersion, "2025-11-25");
  assertEquals((await mcp(access, "notifications/initialized", undefined, true)).status, 202);
  const names = (await mcp(access, "tools/list")).body.result.tools.map((t: any) => t.name);
  assertEquals(names, ["lawfecta_whoami", "get_my_profile", "list_my_gigs", "draft_gig_from_playbook", "list_gig_proposals", "list_my_threads", "read_thread", "save_reply_draft", "list_my_meetings", "list_my_reviews", "list_my_bench", "list_my_engagements", "get_engagement", "list_playbooks", "get_playbook", "save_playbook_draft", "draft_playbook_with_dela", "suggest_playbook_change", "export_playbook"]);
  assertEquals((await mcp(access, "resources/list")).body.error.code, -32601);
});

let pbId = "";
Deno.test("tools: whoami, save a draft, list, read, suggest a change, export, DELA drafts one", async () => {
  const who = await tool(access, "lawfecta_whoami");
  assertEquals(who.isError, false);
  assert(who.content[0].text.includes("attorney side"));
  const draft = { title: "Open a new matter", outcome: "Matter opened in the practice system", steps: [{ text: "Run the conflict check" }, { text: "Create the matter in Clio", tool: "Clio" }] };
  const saved = await tool(access, "save_playbook_draft", draft);
  assertEquals(saved.isError, false, saved.content[0].text);
  pbId = saved.structuredContent.result.id;
  // Saving the same draft twice makes one playbook
  const twice = await tool(access, "save_playbook_draft", draft);
  assertEquals(twice.structuredContent.result.id, pbId);
  const list = await tool(access, "list_playbooks", { search: "new matter" });
  assertEquals(list.structuredContent.result.length, 1);
  assertEquals(list.structuredContent.result[0].status, "draft");
  const got = await tool(access, "get_playbook", { playbook_id: pbId });
  assert(got.content[0].text.includes("Run the conflict check"));
  const sug = await tool(access, "suggest_playbook_change", { playbook_id: pbId, note: "Add the engagement letter", ...draft, steps: [...draft.steps, { text: "Send the engagement letter" }] });
  assertEquals(sug.isError, false, sug.content[0].text);
  // Nothing changes until someone accepts it on the website
  const after = await tool(access, "get_playbook", { playbook_id: pbId });
  assertEquals(after.structuredContent.result.version, got.structuredContent.result.version);
  const pending = (await pool.query("select count(*)::int n from playbook_suggestions where playbook_id = $1 and status = 'open'", [pbId])).rows[0].n;
  assertEquals(pending, 1);
  const csv = await tool(access, "export_playbook", { playbook_id: pbId, format: "csv" });
  assert(csv.content[0].text.includes("Run the conflict check"));
  const dela = await tool(access, "draft_playbook_with_dela", { description: "How we send the engagement letter after the first call" });
  assertEquals(dela.isError, false, dela.content[0].text);
  assert(dela.content[0].text.includes("Who signs for the firm?"));
  const calls = (await pool.query("select count(*)::int n, count(*) filter (where ok)::int ok from mcp_calls c join mcp_connections m on m.id = c.connection_id where m.person_id = $1", [att.id])).rows[0];
  assert(calls.n >= 8 && calls.ok === calls.n);
});

Deno.test("tools refuse client information, another firm's playbook and unknown tools", async () => {
  const ci = await tool(access, "save_playbook_draft", { title: "Intake for client SSN 123-45-6789", steps: [{ text: "Call them" }] });
  assertEquals(ci.isError, true);
  assert(ci.content[0].text.includes("client information"));
  const otherOrg = (await pool.query("select dela_side_org($1, 'attorney') o", [other.id])).rows[0].o;
  const otherPb = (await call("POST", "/playbooks/create", other.token, { title: "Other firm's process", org_id: otherOrg, request_id: crypto.randomUUID() })).body;
  assert(otherPb.ok, JSON.stringify(otherPb));
  const peek = await tool(access, "get_playbook", { playbook_id: otherPb.id });
  assertEquals(peek.isError, true);
  const no = await mcp(access, "tools/call", { name: "delete_everything", arguments: {} });
  assertEquals(no.body.error.code, -32602);
  const failed = (await pool.query("select count(*)::int n from mcp_calls c join mcp_connections m on m.id = c.connection_id where m.person_id = $1 and not c.ok", [att.id])).rows[0].n;
  assertEquals(failed, 2);
});

Deno.test("refresh: a new token each time; the old refresh token stops working", async () => {
  const r = await raw("POST", "/oauth/token", { headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh, client_id: client }).toString() });
  assertEquals(r.status, 200);
  const t = await r.json();
  assert(t.access_token !== access);
  assertEquals((await mcp(t.access_token, "ping")).status, 200);
  const old = await raw("POST", "/oauth/token", { headers: { "content-type": "application/json" }, body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refresh, client_id: client }) });
  assertEquals(old.status, 400);
  const otherClient = await raw("POST", "/oauth/token", { headers: { "content-type": "application/json" }, body: JSON.stringify({ grant_type: "refresh_token", refresh_token: t.refresh_token, client_id: "dc_someone_else" }) });
  assertEquals(otherClient.status, 400);
  access = t.access_token; refresh = t.refresh_token;
});

Deno.test("switch off, plan not included, the pause and an account hold", async () => {
  await pool.query("update feature_switches set state = 'off' where key = 'mcp_connector'");
  let r = await mcp(access, "tools/list");
  assertEquals(r.status, 403);
  assert(r.body.error.message.includes("not open"));
  const off = await signIn(att.token, client);
  assertEquals(off.shown.on, false);
  assertEquals(off.decide.reason, "connector_off");
  await pool.query("update feature_switches set state = 'everyone' where key = 'mcp_connector'");
  await pool.query("update settings set value = '[\"att_business\"]' where key = 'mcp.plans'");
  r = await mcp(access, "tools/list");
  assertEquals(r.status, 403);
  assert(r.body.error.message.includes("plan"));
  await pool.query("update settings set value = '[\"att_free\",\"att_plus\",\"att_pro\",\"att_business\",\"fl_free\",\"fl_plus\",\"fl_pro\",\"fl_business\"]' where key = 'mcp.plans'");
  await pool.query("update settings set value = value || '{\"connector\": true}' where key = 'emergency.pause'");
  r = await mcp(access, "tools/list");
  assertEquals(r.status, 403);
  assert(r.body.error.message.includes("paused"));
  await pool.query("update settings set value = value || '{\"connector\": false}' where key = 'emergency.pause'");
  assertEquals((await mcp(access, "tools/list")).status, 200);
});

Deno.test("rate limit: too many calls in a minute get a 429", async () => {
  await pool.query("update settings set value = '3' where key = 'mcp.calls_per_minute'");
  try {
    let last = 0;
    for (let i = 0; i < 5; i++) last = (await mcp(access, "tools/call", { name: "lawfecta_whoami", arguments: {} })).status;
    assertEquals(last, 429);
  } finally {
    await pool.query("update settings set value = '30' where key = 'mcp.calls_per_minute'");
  }
});

Deno.test("freelancer: their own tools; attorney tools are not there", async () => {
  const s = await signIn(fl.token, await register("Claude"));
  assertEquals(s.shown.side, "freelancer");
  const t = s.token.access_token;
  const names = (await mcp(t, "tools/list")).body.result.tools.map((x: any) => x.name);
  assertEquals(names, ["lawfecta_whoami", "get_my_profile", "list_my_gig_work", "save_proposal_draft", "list_my_threads", "read_thread", "save_reply_draft", "list_my_meetings", "list_my_reviews", "list_my_bench", "list_my_engagements", "get_engagement"], "Step 4 adds the freelancer's gig tools");
  assertEquals((await mcp(t, "tools/call", { name: "list_playbooks", arguments: {} })).body.error.code, -32602);
  assert((await tool(t, "lawfecta_whoami")).content[0].text.includes("freelancer side"));
  // Step 6: engagements are read-only in the connector; signing and paying stay on the website
  await pool.query("update feature_switches set state = 'everyone' where key = 'engagements'");
  assertEquals((await tool(t, "list_my_engagements")).content[0].text, "No engagements yet.");
  const ge = await mcp(t, "tools/call", { name: "get_engagement", arguments: { engagement_id: crypto.randomUUID() } });
  assert(ge.body.result?.isError && ge.body.result.content[0].text.includes("not found"), "someone else's or a made-up engagement is refused");
});

Deno.test("members see and disconnect their own connections; the team sees and stops any", async () => {
  const mine = await call("GET", "/connections", att.token);
  assertEquals(mine.body.url, BASE + "/mcp");
  assertEquals(mine.body.on, true);
  assert(mine.body.connections.length >= 1);
  const conn = mine.body.connections.find((c: any) => c.calls_30d > 0);
  // Another member cannot disconnect it
  assertEquals((await call("POST", "/connections/disconnect", other.token, { id: conn.id })).body.reason, "not_found");
  assertEquals((await mcp(access, "ping")).status, 200);
  assertEquals((await call("POST", "/connections/disconnect", att.token, { id: conn.id })).body.ok, true);
  assertEquals((await mcp(access, "ping")).status, 401);
  const r = await raw("POST", "/oauth/token", { headers: { "content-type": "application/json" }, body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refresh, client_id: client }) });
  assertEquals(r.status, 400);
  // Disconnect is safe to repeat
  assertEquals((await call("POST", "/connections/disconnect", att.token, { id: conn.id })).body.duplicate, true);
  // The Lawfecta Team
  const staff = await member(9, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'owner')", [staff.id]);
  const s = await signIn(att.token, client);
  const list = (await call("GET", "/admin/mcp", staff.token)).body.data;
  const row = list.connections.find((c: any) => c.bd_member_id === att.bd);
  assert(row, "the team sees the connection");
  assert(!JSON.stringify(list).includes(s.token.access_token));
  assert(list.tools.some((t: any) => t.tool === "save_playbook_draft"));
  assertEquals((await call("POST", "/admin/mcp/disconnect", staff.token, { id: row.id })).body.data.ok, true);
  assertEquals((await mcp(s.token.access_token, "ping")).status, 401);
  // Members cannot use the team's route
  assertEquals((await call("GET", "/admin/mcp", att.token)).status, 403);
  const audit = (await pool.query("select count(*)::int n from audit_log where action in ('connector_approved', 'connector_connected', 'connector_disconnected') and actor_id in ($1, $2)", [att.id, staff.id])).rows[0].n;
  assert(audit >= 5);
});

Deno.test("teardown", async () => {
  await pool.end();
});

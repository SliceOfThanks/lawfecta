// The official MCP client library signs in to DELA and calls its tools, the way ChatGPT and Claude do:
// a 401 with resource metadata, discovery, dynamic registration, PKCE, approval on the DELA page, then tools.
// Run after tools/dbtest.sh:   deno test -A supabase/functions/api/mcp_sdk_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { Client } from "npm:@modelcontextprotocol/sdk@1.31.0/client/index.js";
import { StreamableHTTPClientTransport } from "npm:@modelcontextprotocol/sdk@1.31.0/client/streamableHttp.js";
import { UnauthorizedError, type OAuthClientProvider } from "npm:@modelcontextprotocol/sdk@1.31.0/client/auth.js";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const PORT = 18000 + (Date.now() % 1000);
const BASE = `http://127.0.0.1:${PORT}/functions/v1/api`;
const deps: Deps = { rpc, env: (k) => ({ PUBLIC_API_URL: BASE, DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "" };
const REDIRECT = "http://localhost:6274/oauth/callback";

Deno.test("the MCP client library signs in and uses DELA's tools", async () => {
  const server = Deno.serve({ port: PORT, hostname: "127.0.0.1", onListen() {} }, (req) => handle(req, deps));
  try {
    const bd = 7_000_000 + (Date.now() % 1000000);
    const id = (await pool.query("insert into people (bd_member_id, display_name, email) values ($1, 'Sdk Tester', 'sdk@test.invalid') returning id", [bd])).rows[0].id;
    await pool.query("select dela_ensure_side($1, 'attorney', 'att_plus', 'staff_grant')", [id]);
    await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
    const session = "ds_test_" + crypto.randomUUID();
    await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, 'attorney', 1, now() + interval '1 hour')", [await sessionHash(session), id]);
    await pool.query("update feature_switches set state = 'everyone' where key in ('mcp_connector', 'playbook_library')");

    // What the AI app keeps: its registration, the PKCE verifier and the tokens
    let info: any, verifier = "", tokens: any, authUrl: URL | null = null;
    const provider = {
      get redirectUrl() { return REDIRECT; },
      get clientMetadata() { return { client_name: "SDK test app", redirect_uris: [REDIRECT], grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none" }; },
      clientInformation: () => info,
      saveClientInformation: (i: any) => { info = i; },
      tokens: () => tokens,
      saveTokens: (t: any) => { tokens = t; },
      redirectToAuthorization: (u: URL) => { authUrl = u; },
      saveCodeVerifier: (v: string) => { verifier = v; },
      codeVerifier: () => verifier,
    };
    const url = new URL(BASE + "/mcp");
    let transport = new StreamableHTTPClientTransport(url, { authProvider: provider as OAuthClientProvider });
    let client = new Client({ name: "sdk-test", version: "1.0.0" });
    let refused = false;
    try { await client.connect(transport); } catch (e) { refused = e instanceof UnauthorizedError; if (!refused) console.log("connect error", String(e)); }
    assert(refused, "first call is refused and starts sign in");
    assert(authUrl, "the library was sent to sign in");
    assertEquals(info.client_name, "SDK test app");

    // The member's browser: authorize sends them to the DELA page, they approve, the app gets the code
    const a = await fetch(authUrl!, { redirect: "manual" });
    assertEquals(a.status, 302);
    const req = new URL(a.headers.get("location")!).searchParams.get("req")!;
    const d = await (await fetch(BASE + "/oauth/decide", { method: "POST", headers: { "content-type": "application/json", "x-dela-session": session }, body: JSON.stringify({ req, approve: true }) })).json();
    const code = new URL(d.redirect).searchParams.get("code")!;
    await transport.finishAuth(code);
    assert(String(tokens.access_token).startsWith("dm_"));

    transport = new StreamableHTTPClientTransport(url, { authProvider: provider as OAuthClientProvider });
    client = new Client({ name: "sdk-test", version: "1.0.0" });
    await client.connect(transport);
    assertEquals(client.getServerVersion()?.name, "lawfecta-dela");
    const { tools } = await client.listTools();
    assert(tools.some((t: any) => t.name === "save_playbook_draft"));
    const saved: any = await client.callTool({ name: "save_playbook_draft", arguments: { title: "Close a matter", steps: [{ text: "Send the closing letter" }, { text: "Archive the file" }] } });
    assertEquals(saved.isError, false, JSON.stringify(saved));
    const list: any = await client.callTool({ name: "list_playbooks", arguments: {} });
    assert(list.content[0].text.includes("Close a matter"));
    await client.close();
  } finally {
    await server.shutdown();
    await pool.end();
  }
});

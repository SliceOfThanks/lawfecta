// Profiles and verification API tests (Step 3): the profile on both sides, filling from the Lawfecta listing (only
// the mapped fields), saving, DELA's draft, licenses with the email link, the team's decisions, LinkedIn checks,
// availability, profile documents, the listing update, the connector tool and the daily job.
// Run after tools/dbtest.sh:   deno test -A supabase/functions/api/profiles_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const WORKER = "test-worker-secret-profiles-0123456789ab";
const LAWFECTA = "sk-lawfecta" + "P".repeat(40); // rules-ok: a made-up test key
const BD_KEY = "bd-test-key-0000"; // rules-ok: a made-up test key
const bdCalls: Array<{ method: string; url: string; body: string }> = [];
let bdMode: "ok" | "forbidden" = "ok";
const systems: string[] = [];
const brevoSent: Array<{ to: string; id: string }> = [];

const BD_RECORD = {
  user_id: 0, first_name: "Fran", last_name: "Lancer", email: "private@login.invalid", company: "Lancer Legal Support", city: "Austin", state_code: "TX", country_code: "US",
  website: "lancerlegal.com", linkedin: "https://www.linkedin.com/in/fran-lancer", about_me: "I help solo attorneys with e-filing.", software: "Clio, Word",
  image_main_file: "/pictures/profile/fran.jpg", card_info: "4111 1111 1111 1111", subscription_id: 7, revenue: { total: 99 },
};

const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("/api/v2/user/")) {
    bdCalls.push({ method: String(init.method ?? "GET"), url, body: String(init.body ?? "") });
    assertEquals(new Headers(init.headers).get("x-api-key"), BD_KEY);
    if (bdMode === "forbidden") return Response.json({ status: "error", message: "API Key does not have permission to access this endpoint" }, { status: 403 });
    if (url.includes("/api/v2/user/get/")) return Response.json({ status: "success", message: [BD_RECORD] });
    if (url.endsWith("/api/v2/user/update")) return Response.json({ status: "success", message: { user_id: 1 } });
  }
  if (url === "https://api.brevo.com/v3/smtp/email") {
    const to = JSON.parse(String(init.body)).to[0].email as string;
    const id = `<${to}-${brevoSent.length}@brevo.test>`;
    brevoSent.push({ to, id });
    return Response.json({ messageId: id }, { status: 201 });
  }
  if (url.startsWith("https://api.brevo.com/v3/smtp/statistics/events")) {
    const id = decodeURIComponent(new URL(url).searchParams.get("messageId") ?? "");
    const to = brevoSent.find((x) => x.id === id)?.to ?? "";
    if (to.startsWith("bounce")) return Response.json({ events: [{ event: "softBounces", email: to, reason: "551-5.7.1 Your IP is black listed by SpamCop.org" }, { event: "requests", email: to }] });
    if (to.startsWith("slow")) return Response.json({ events: [{ event: "requests", email: to }] });
    return Response.json({ events: [{ event: "delivered", email: to }, { event: "requests", email: to }] });
  }
  if (url.endsWith("/chat/completions")) {
    const body = JSON.parse(String(init.body));
    const system = String(body.messages[0].content);
    systems.push(system);
    let out: unknown = {};
    if (body.response_format && system.includes("legal operations tool")) out = { client_info: false, kinds: [] };
    else if (system.includes("write one box")) out = { text: "**Senior paralegal**, family law firm, 2019 to now.", questions: ["Which courts do you file in?"] };
    else if (system.includes("write their profile")) out = { headline: "Litigation paralegal for solo attorneys", summary: "**I** support solo attorneys with e-filing and discovery.", skills: ["E-filing", "Discovery"], software: ["Clio"], services: [{ title: "E-filing", for_whom: "Solo attorneys" }], questions: ["How many years have you done this work?"] };
    return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 10 } });
  }
  return new Response("{}", { status: 404 });
}) as typeof fetch;

const objects = new Map<string, Uint8Array>();
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p),
  signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: (p) => Promise.resolve(objects.get(p)?.length ?? null),
  read: (p) => (objects.has(p) ? Promise.resolve(objects.get(p)!) : Promise.reject(new Error("missing"))),
  remove: (ps) => { ps.forEach((p) => objects.delete(p)); return Promise.resolve(); },
  put: (p, b) => { objects.set(p, b); return Promise.resolve(); },
};
const deps: Deps = { rpc, env: (k) => ({ OPENAI_API_KEY: LAWFECTA, BD_API_KEY: BD_KEY, BREVO_API_KEY: "brevo-test-key", DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: fakeFetch, storage };

async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
async function worker(times = 2) {
  for (let i = 0; i < times; i++) {
    await pool.query("update jobs set run_at = now() where status in ('queued', 'delayed')");
    await handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
  }
}

const RUN = Date.now() % 1000000;
async function member(n: number, plan: string) {
  const bd = 8_000_000 + RUN * 10 + n;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await pool.query("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Prof " + n, `p${n}@login.invalid`])).rows[0].id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}

let att: Awaited<ReturnType<typeof member>>, fl: Awaited<ReturnType<typeof member>>, staff: Awaited<ReturnType<typeof member>>;
const SWITCHES = "('profiles', 'attorney_verification', 'freelancer_verification', 'profile_documents', 'ai_generation')";

Deno.test("setup", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  await pool.query(`update feature_switches set state = 'off' where key in ${SWITCHES} or key = 'bd_profile_sync'`);
  att = await member(1, "att_pro");
  fl = await member(2, "fl_plus");
  staff = await member(3, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'reviewer')", [staff.id]);
  BD_RECORD.user_id = fl.bd;
});

Deno.test("switch off, then a new profile shows exactly what is missing", async () => {
  assertEquals((await call("GET", "/profile", att.token)).body.reason, "profiles_off");
  await pool.query(`update feature_switches set state = 'everyone' where key in ${SWITCHES}`);
  const r = (await call("GET", "/profile", fl.token)).body;
  assertEquals(r.ok, true);
  assertEquals(r.state.readiness, "incomplete");
  assert(r.state.missing_labels.includes("Your profile"));
  assert(r.required.includes("linkedin") && r.practice_areas.includes("Family law"));
  assertEquals(r.body.services, []);
});

Deno.test("fill from the listing: only the mapped fields leave BD; a refused key says so", async () => {
  const r = (await call("GET", "/profile/from-directory", fl.token)).body;
  assertEquals(r.ok, true);
  assertEquals(r.fields.first_name, "Fran");
  assertEquals(r.fields.firm_name, "Lancer Legal Support");
  assertEquals(r.fields.state, "TX");
  assertEquals(r.fields.website, "https://lancerlegal.com");
  assertEquals(r.fields.software, ["Clio", "Word"]);
  assertEquals(r.fields.photo_url, "https://hirelegalhelp.com/pictures/profile/fran.jpg");
  const all = JSON.stringify(r);
  assert(!all.includes("4111") && !all.includes("private@login.invalid") && !all.includes("revenue"), "nothing outside the map is returned");
  assert(bdCalls.at(-1)!.url.endsWith("/api/v2/user/get/" + fl.bd));
  bdMode = "forbidden";
  assertEquals((await call("GET", "/profile/from-directory", fl.token)).body.reason, "directory_not_allowed");
  bdMode = "ok";
});

let flVersion = 0;
Deno.test("save: cleaned, money in cents, readiness, client information, older copies refused", async () => {
  const body = { first_name: " Fran ", last_name: "Lancer", headline: "Litigation paralegal", summary: "I help solo attorneys file on time.", practice_areas: ["Family law", "Family law", "Civil litigation"],
    services: [{ title: "E-filing", for_whom: "Solo attorneys", price_from_cents: 15000, price_to_cents: 5000, unit: "fixed" }, { title: "" }], experience: "8 years", software: "Clio, Word",
    timezone: "Central", capacity_hours_week: "20", linkedin: "linkedin.com/in/fran-lancer", acknowledged: true, website: "javascript:alert(1)" };
  let r = (await call("POST", "/profile/save", fl.token, { body, version: 0 })).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  flVersion = r.version;
  const saved = (await call("GET", "/profile", fl.token)).body;
  assertEquals(saved.body.first_name, "Fran");
  assertEquals(saved.body.practice_areas, ["Family law", "Civil litigation"]);
  assertEquals(saved.body.services.length, 1);
  assertEquals([saved.body.services[0].price_from_cents, saved.body.services[0].price_to_cents], [5000, 15000]);
  assertEquals(saved.body.software, ["Clio", "Word"]);
  assertEquals(saved.body.linkedin, "https://linkedin.com/in/fran-lancer");
  assertEquals(saved.body.website, "", "an address that is not a web address is not kept");
  assertEquals(r.state.readiness, "verification_pending");
  // Client information in the summary is caught; the member can still save after confirming
  r = (await call("POST", "/profile/save", fl.token, { body: { ...body, summary: "I worked on Jane Roe's case, SSN 123-45-6789." }, version: flVersion })).body;
  assertEquals(r.reason, "looks_like_client_info");
  r = (await call("POST", "/profile/save", fl.token, { body, version: flVersion - 1 })).body;
  assertEquals(r.ok, true, "the same content again is no change");
  r = (await call("POST", "/profile/save", fl.token, { body: { ...body, headline: "Paralegal" }, version: flVersion - 1 })).body;
  assertEquals(r.reason, "changed_elsewhere");
});

Deno.test("Write with DELA: one box at a time, from facts or what the box says, saving nothing (Stacey 2026-11-05)", async () => {
  const before = (await call("GET", "/profile", fl.token)).body.version;
  assertEquals((await call("POST", "/profile/draft", fl.token, { field: "experience", notes: "short", body: {} })).body.reason, "tell_us_more", "too little to go on");
  assertEquals((await call("POST", "/profile/draft", fl.token, { field: "password", notes: "Eight years as a paralegal in Austin", body: {} })).status, 400, "only the boxes DELA may write");
  const r = (await call("POST", "/profile/draft", fl.token, { field: "experience", notes: "Senior paralegal at a family law firm since 2019", body: {} })).body;
  assertEquals([r.ok, r.field, r.text], [true, "experience", "Senior paralegal, family law firm, 2019 to now."], JSON.stringify(r));
  assertEquals(r.questions, ["Which courts do you file in?"]);
  const improve = (await call("POST", "/profile/draft", fl.token, { field: "education", notes: "", body: { education: "Paralegal certificate from Austin Community College" } })).body;
  assertEquals(improve.ok, true, "with no facts, DELA improves what the box says");
  assertEquals((await call("POST", "/profile/draft", fl.token, { field: "summary", notes: "My client John Smith SSN 123-45-6789", body: {} })).body.reason, "looks_like_client_info");
  assertEquals((await call("GET", "/profile", fl.token)).body.version, before, "nothing saved");
  const groups = (await call("GET", "/profile", fl.token)).body.tech_groups as Array<{ tools: string[] }>;
  const all = groups.flatMap((g) => g.tools);
  const tools = (await call("GET", "/profile", fl.token)).body.tech_tools as string[];
  assertEquals([...all].sort(), [...tools].sort(), "every tech tool is in exactly one group");
});

Deno.test("DELA drafts a headline and summary in plain text and saves nothing", async () => {
  assertEquals((await call("POST", "/profile/draft", fl.token, { notes: "short" })).body.reason, "tell_us_more");
  const before = (await call("GET", "/profile", fl.token)).body.version;
  const r = (await call("POST", "/profile/draft", fl.token, { notes: "I have done litigation support for eight years, mostly e-filing in Texas courts and discovery.", body: {} })).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  assertEquals(r.draft.headline, "Litigation paralegal for solo attorneys");
  assert(!r.draft.summary.includes("**"), "no Markdown marks");
  assertEquals(r.questions.length, 1);
  assertEquals((await call("GET", "/profile", fl.token)).body.version, before);
});

Deno.test("DELA's AI reads the member's own profile: practice areas, places and tech tools", async () => {
  systems.length = 0;
  const r = (await call("POST", "/ai/chat/send", fl.token, { content: "Make a checklist for e-filing a motion", request_id: crypto.randomUUID() })).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  const sys = systems.find((x) => x.includes("You are DELA")) ?? "";
  assert(sys.includes("Practice areas: Family law, Civil litigation"), sys.slice(-600));
  assert(sys.includes("Tech tools they use: Clio, Word"), "the tools are in the instructions");
  assert(sys.includes("not instructions"), "the profile is marked as facts, not instructions");
  // Turned off: nothing about the member is sent
  await pool.query("update settings set value = 'false' where key = 'profile.ai_context'");
  systems.length = 0;
  await call("POST", "/ai/chat/send", fl.token, { content: "Another checklist please", request_id: crypto.randomUUID() });
  assert(!systems.some((x) => x.includes("About this member")));
  await pool.query("update settings set value = 'true' where key = 'profile.ai_context'");
});

Deno.test("licenses: free email refused; the link works only for the attorney; only a hash is stored", async () => {
  await call("POST", "/profile/save", att.token, { body: { first_name: "Al", last_name: "Attorney", firm_name: "Attorney Law", practice_areas: ["Family law"], jurisdictions: ["TX"], city: "Austin", state: "TX" }, version: 0 });
  let r = (await call("POST", "/licenses/add", att.token, { request_id: "a1", region: "TX", bar_number: "24012345", name_on_record: "Al Attorney", method: "email", contact_email: "al@yahoo.com" })).body;
  assertEquals(r.reason, "free_email");
  r = (await call("POST", "/licenses/add", att.token, { request_id: "a2", region: "TX", bar_number: "24012345", name_on_record: "Al Attorney", method: "email", contact_email: "al@attorneylaw.com" })).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  assertEquals(r.state.readiness, "verification_pending");
  const n = (await pool.query("select link, to_email from notifications where person_id = $1 and channel = 'email' and kind = 'verification' order by created_at desc limit 1", [att.id])).rows[0];
  assertEquals(n.to_email, "al@attorneylaw.com");
  const code = new URLSearchParams(n.link.split("?")[1]).get("confirm")!;
  assert(code.length > 30);
  assertEquals((await pool.query("select count(*)::int c from email_checks where token_hash = $1", [code])).rows[0].c, 0);
  assertEquals((await call("POST", "/licenses/confirm", fl.token, { token: code })).status, 403, "a freelancer session cannot use it");
  assertEquals((await call("POST", "/licenses/confirm", staff.token, { token: code })).body.reason, "link_not_valid");
  assertEquals((await call("POST", "/licenses/confirm", att.token, { token: code })).body.ok, true);
  assertEquals((await call("POST", "/licenses/confirm", att.token, { token: "nope" })).body.reason, "link_not_valid");
  assertEquals((await call("POST", "/licenses/email", att.token, { id: r.id })).body.already_confirmed, true);
  // The email is sent by the worker
  await worker(1);
  assertEquals((await pool.query("select status from notifications where link = $1", [n.link])).rows[0].status !== "queued", true);
});

Deno.test("the team verifies; members cannot use the team's routes", async () => {
  const q = (await call("GET", "/admin/verify", staff.token)).body.data;
  const l = q.licenses.find((x: any) => x.bd_member_id === att.bd);
  assert(l && l.email_domain === "attorneylaw.com" && l.email_confirmed_at, "the queue shows the license with its confirmed email");
  assertEquals((await call("GET", "/admin/verify", att.token)).status, 403);
  assertEquals((await call("POST", "/admin/verify/license", att.token, { id: l.id, decision: "verified", identity: "firm_domain" })).status, 403);
  const r = (await call("POST", "/admin/verify/license", staff.token, { id: l.id, decision: "verified", identity: "firm_domain", note: "TX lookup: active" })).body.data;
  assertEquals(r.ok, true, JSON.stringify(r));
  const p = (await call("GET", "/profile", att.token)).body;
  assertEquals(p.state.verification, "verified");
  assertEquals(p.state.readiness, "match_ready");
  assertEquals(p.licenses[0].counts, true);
  assertEquals(p.firm.eligibility.can_post, true);
  assertEquals(p.firm.eligibility.can_pay, false);
  const f = (await call("POST", "/firm/save", att.token, { body: { legal_name: "Attorney Law PLLC", billing_address: "1 Main St", signatory_name: "Al Attorney", service_email: "notices@attorneylaw.com", evil: "x" } })).body;
  assertEquals(f.eligibility.can_pay, true);
  assertEquals((await pool.query("select body ? 'evil' e from firm_profiles where org_id = dela_side_org($1, 'attorney')", [att.id])).rows[0].e, false);
});

Deno.test("LinkedIn check, availability, and match-ready", async () => {
  assertEquals((await call("POST", "/linkedin/submit", att.token, { url: "https://www.linkedin.com/in/al" })).status, 403);
  let r = (await call("POST", "/linkedin/submit", fl.token, { url: "https://www.linkedin.com/in/fran-lancer" })).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  const c = (await call("GET", "/admin/verify", staff.token)).body.data.linkedin.find((x: any) => x.bd_member_id === fl.bd);
  assertEquals(c.profile_name, "Fran Lancer");
  r = (await call("POST", "/admin/verify/linkedin", staff.token, { id: c.id, decision: "verified", name_matches: true, badge_seen: true })).body.data;
  assertEquals(r.state.readiness, "availability_stale");
  r = (await call("POST", "/profile/availability", fl.token, { state: "available" })).body;
  assertEquals(r.state.readiness, "match_ready");
  assertEquals((await call("POST", "/profile/availability", att.token, { state: "available" })).status, 403);
});

Deno.test("profile documents: tick, type, upload, check, show to attorneys, remove", async () => {
  assertEquals((await call("POST", "/profile/docs/start", att.token, { request_id: "d0", name: "cv.pdf", size_bytes: 10, ticked: true })).status, 403);
  assertEquals((await call("POST", "/profile/docs/start", fl.token, { request_id: "d1", name: "cv.pdf", size_bytes: 10, ticked: false })).body.reason, "tick_needed");
  assertEquals((await call("POST", "/profile/docs/start", fl.token, { request_id: "d2", name: "tool.exe", size_bytes: 10, ticked: true })).body.reason, "type_not_allowed");
  assertEquals((await call("POST", "/profile/docs/start", fl.token, { request_id: "d3", name: "cv.pdf", size_bytes: 50 * 1048576, ticked: true })).body.reason, "file_too_big");
  const s = (await call("POST", "/profile/docs/start", fl.token, { request_id: "d4", name: "Resume.pdf", size_bytes: 300, ticked: true })).body;
  assertEquals(s.ok, true, JSON.stringify(s));
  const path = String(s.upload_url).split("/up/")[1];
  objects.set(path, new TextEncoder().encode("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n" + " ".repeat(200)));
  const done = (await call("POST", "/files/complete", fl.token, { file_id: s.file_id })).body;
  assert(["ready", "held", "checking", "refused"].includes(done.status), JSON.stringify(done));
  await pool.query("update files set status = 'ready', check_state = 'clear' where id = $1", [s.file_id]);
  assertEquals((await call("POST", "/profile/docs/action", fl.token, { id: s.file_id, action: "show" })).body.ok, true);
  let p = (await call("GET", "/profile", fl.token)).body;
  assertEquals(p.documents[0].shown, true);
  assertEquals((await call("POST", "/profile/docs/action", att.token, { id: s.file_id, action: "show" })).body.reason, "not_found");
  // Profile documents do not show in Files
  assertEquals((await pool.query("select count(*)::int c from files where id = $1 and purpose = 'profile'", [s.file_id])).rows[0].c, 1);
  assertEquals((await call("POST", "/profile/docs/action", fl.token, { id: s.file_id, action: "remove" })).body.ok, true);
  p = (await call("GET", "/profile", fl.token)).body;
  assertEquals(p.documents.length, 0);
});

Deno.test("the listing update: only mapped fields with a value, after the member saves", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key = 'bd_profile_sync'");
  try {
    const cur = (await call("GET", "/profile", fl.token)).body;
    const r = (await call("POST", "/profile/save", fl.token, { body: { ...cur.body, headline: "Litigation paralegal, Texas courts", education: "" }, version: cur.version, directory: true })).body;
    assertEquals(r.bd_state, "waiting");
    bdCalls.length = 0;
    await worker(1);
    const put = bdCalls.find((c) => c.url.endsWith("/api/v2/user/update"));
    assert(put, "the worker updates the listing");
    assertEquals(put.method, "PUT");
    const sent = new URLSearchParams(put.body);
    assertEquals(sent.get("user_id"), String(fl.bd));
    assertEquals(sent.get("position"), "Litigation paralegal, Texas courts");
    assertEquals(sent.get("software"), "Clio, Word");
    assertEquals(sent.get("education"), null, "an empty box does not blank the listing");
    assertEquals(sent.get("image_main_file"), null, "the photo is read only");
    assertEquals((await call("GET", "/profile", fl.token)).body.bd_state, "done");
    // A key without permission: the DELA profile stays saved and the member is told
    bdMode = "forbidden";
    const c2 = (await call("GET", "/profile", fl.token)).body;
    await call("POST", "/profile/save", fl.token, { body: { ...c2.body, hours: "Weekdays" }, version: c2.version, directory: true });
    await worker(1);
    const after = (await call("GET", "/profile", fl.token)).body;
    assertEquals([after.bd_state, after.bd_error, after.body.hours], ["failed", "not_allowed", "Weekdays"]);
    // Unticked: no listing update
    bdCalls.length = 0;
    await call("POST", "/profile/save", fl.token, { body: { ...after.body, hours: "Weekends" }, version: after.version, directory: false });
    await worker(1);
    assertEquals(bdCalls.length, 0);
  } finally {
    bdMode = "ok";
    await pool.query("update feature_switches set state = 'off' where key = 'bd_profile_sync'");
  }
});

Deno.test("the connector's profile tool, on each side", async () => {
  const conn = async (person: string, side: string) => {
    await pool.query("insert into mcp_clients (id, name, redirect_uris) values ($1, 'Test', '{https://x.test/cb}') on conflict do nothing", ["dc_prof_" + RUN]);
    const c = (await pool.query("insert into mcp_connections (person_id, side, client_id) values ($1, $2, $3) returning id", [person, side, "dc_prof_" + RUN])).rows[0].id;
    const t = "dm_test_" + crypto.randomUUID();
    const { sha256Hex } = await import("./lib/crypto.ts");
    await pool.query("insert into mcp_tokens (token_hash, connection_id, expires_at) values ($1, $2, now() + interval '1 hour')", [await sha256Hex("dela-mcp:" + t), c]);
    return t;
  };
  await pool.query("update feature_switches set state = 'everyone' where key = 'mcp_connector'");
  const tool = async (t: string) => (await (await handle(new Request("http://localhost/functions/v1/api/mcp", { method: "POST", headers: { authorization: "Bearer " + t, "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_my_profile", arguments: {} } }) }), deps)).json()).result;
  const f1 = await tool(await conn(fl.id, "freelancer"));
  assertEquals(f1.isError, false, JSON.stringify(f1));
  assert(f1.content[0].text.includes("match-ready") && f1.content[0].text.includes("LinkedIn check: verified"), f1.content[0].text);
  const a1 = await tool(await conn(att.id, "attorney"));
  assert(a1.content[0].text.includes("TX license: verified"), a1.content[0].text);
});

Deno.test("the daily job runs from the worker", async () => {
  await pool.query("update member_profiles set availability_confirmed_at = now() - interval '13 days' where person_id = $1 and side = 'freelancer'", [fl.id]);
  await pool.query("delete from jobs where kind = 'profiles_daily'");
  await pool.query("select dela_job_enqueue('profiles_daily', '{}', now(), 'profiles_daily:test:' || $1)", [RUN]);
  await worker(1);
  const n = (await pool.query("select count(*)::int c from notifications where person_id = $1 and title = 'Confirm your availability'", [fl.id])).rows[0].c;
  assert(n >= 1);
  await pool.query(`update feature_switches set state = 'off' where key in ${SWITCHES} or key = 'mcp_connector'`);
});

Deno.test("email delivery: a bounced license email is shown on the license and to the team; a delivered one says so", async () => {
  await pool.query("update settings set value = '\"brevo\"' where key = 'email.sender'");
  await pool.query(`update feature_switches set state = 'everyone' where key in ${SWITCHES}`);
  try {
    const b = await member(7, "att_plus");
    await call("POST", "/profile/save", b.token, { body: { first_name: "Bo", last_name: "Bounce", firm_name: "Bounce Law", practice_areas: ["Tax"], jurisdictions: ["TX"], city: "Austin", state: "TX" }, version: 0 });
    let r = (await call("POST", "/licenses/add", b.token, { request_id: "bb1", region: "TX", bar_number: "24077777", name_on_record: "Bo Bounce", method: "email", contact_email: "bounce@blockedfirm.test" })).body;
    assertEquals(r.ok, true, JSON.stringify(r));
    r = (await call("POST", "/licenses/add", b.token, { request_id: "bb2", region: "CA", bar_number: "301234", name_on_record: "Bo Bounce", method: "email", contact_email: "ok@goodfirm.test" })).body;
    assertEquals(r.ok, true, JSON.stringify(r));
    r = (await call("POST", "/licenses/add", b.token, { request_id: "bb3", region: "NY", bar_number: "5551234", name_on_record: "Bo Bounce", method: "email", contact_email: "slow@slowfirm.test" })).body;
    assertEquals(r.ok, true, JSON.stringify(r));
    await worker(1); // sends the three emails and queues the first checks
    assert(brevoSent.some((x) => x.to === "bounce@blockedfirm.test"), "the email went to Brevo");
    let p = (await call("GET", "/profile", b.token)).body;
    assertEquals(p.licenses.find((l: any) => l.region === "TX").email_delivery.state, "waiting", "until the check runs, it is waiting");
    await worker(1); // the checks run (the worker moves due jobs to now)
    p = (await call("GET", "/profile", b.token)).body;
    const tx = p.licenses.find((l: any) => l.region === "TX"), ca = p.licenses.find((l: any) => l.region === "CA"), ny = p.licenses.find((l: any) => l.region === "NY");
    assertEquals(tx.email_delivery.state, "bounced");
    assertEquals(tx.email_delivery.reason, "their mail server is blocking our email service for now", "plain words, never the raw server text");
    assertEquals(ca.email_delivery.state, "delivered");
    assertEquals(ny.email_delivery.state, "waiting", "no final event yet: checked again later");
    assertEquals((await pool.query("select count(*)::int n from jobs where kind = 'email_delivery_check' and payload->>'attempt' = '1'")).rows[0].n >= 1, true);
    const q = (await call("GET", "/admin/verify", staff.token)).body.data;
    assertEquals(q.licenses.find((l: any) => l.bd_member_id === b.bd && l.region === "TX").email_delivery.state, "bounced");
    assertEquals((await pool.query("select count(*)::int n from notifications where title = 'A license email bounced' and body like $1", [`%member ${b.bd}'s TX license%`])).rows[0].n >= 1, true, "the team is told which member and state");
    assertEquals((await pool.query("select count(*)::int n from verification_events where action = 'email_bounced'")).rows[0].n, 1);
    // Checking again never changes a final answer
    const nid = (await pool.query("select e.notification_id from email_checks e join licenses l on l.id = e.license_id where l.contact_email = 'bounce@blockedfirm.test'")).rows[0].notification_id;
    assertEquals((await pool.query("select dela_notification_delivery($1, 'delivered', '') r", [nid])).rows[0].r.duplicate, true);
  } finally {
    await pool.query("update settings set value = '\"log\"' where key = 'email.sender'");
  }
});

Deno.test("profile photo: uploaded on the profile page, PNG or JPG only, kept when saved (Stacey 2026-11-05)", async () => {
  const up = async (bytes: Uint8Array, type: string, who = att) => {
    const res = await handle(new Request("http://localhost/functions/v1/api/profile/photo", { method: "POST", headers: { origin: "https://lawfecta.com", "x-dela-session": who.token, "content-type": type }, body: new Blob([bytes as BlobPart]) }), deps);
    return await res.json();
  };
  assertEquals((await up(new TextEncoder().encode("MZ not a photo"), "image/png")).reason, "not_an_image", "the contents are checked, not the name");
  await pool.query("update settings set value = '1' where key = 'profile.photo_max_kb'");
  assertEquals((await up(new Uint8Array(2048).fill(0xff), "image/jpeg")).reason, "photo_too_big");
  await pool.query("update settings set value = '3072' where key = 'profile.photo_max_kb'");
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
  const r = await up(png, "image/png");
  assertEquals(r.ok, true, JSON.stringify(r));
  assert(r.photo_file.startsWith("profiles/" + att.id + "/photo-") && r.photo_file.endsWith(".png"));
  const cur = (await call("GET", "/profile", att.token)).body;
  const saved = (await call("POST", "/profile/save", att.token, { body: { ...cur.body, photo_file: r.photo_file }, version: cur.version, directory: false })).body;
  assertEquals(saved.ok, true, JSON.stringify(saved));
  const got = (await call("GET", "/profile", att.token)).body;
  assertEquals(got.body.photo_file, r.photo_file);
  assert(got.photo_view_url.includes(r.photo_file), "the page gets a private link to show it");
  const other = await up(png, "image/png", fl);
  const flCur = (await call("GET", "/profile", fl.token)).body;
  await call("POST", "/profile/save", fl.token, { body: { ...flCur.body, photo_file: r.photo_file }, version: flCur.version, directory: false });
  assertEquals((await call("GET", "/profile", fl.token)).body.body.photo_file, "", "nobody can use another member's photo");
  assert(other.ok);
});

Deno.test("teardown", async () => {
  await pool.end();
});

// MVP 2026-11-09: the agency profile (what attorneys read about an agency) with DELA's drafting help, and the DELA guide
// walking an agency owner to it. Run after tools/dbtest.sh:
//   deno test -A supabase/functions/api/agency_profile_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "A".repeat(40); // rules-ok: a made-up test key
const env: Record<string, string> = { OPENAI_API_KEY: LAWFECTA, DELA_ORIGINS: "https://lawfecta.com" };
let aiSeen = "";
const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/chat/completions")) {
    const body = JSON.parse(String(init.body));
    const system = String(body.messages[0].content);
    let out: unknown = { client_info: false, kinds: [] };
    if (system.includes("public profile of a legal support agency")) {
      aiSeen = String(body.messages.at(-1).content);
      const noStates = aiSeen.includes("no states");
      out = { headline: "Family law support team for small Texas firms", summary: "We prepare discovery responses and organize case files for attorney review. The owner notes do not include state coverage or pricing.",
        practice_areas: ["Family law"], services: [{ title: "Discovery responses", description: "For attorney review", price_min_cents: 30000, price_max_cents: 90000 }, { title: "x" }],
        tools: ["Clio"], states_served: noStates ? [] : ["tx", "Texas"], questions: ["Which counties?"] };
    }
    return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 10 } });
  }
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: () => Promise.resolve(1), read: () => Promise.reject(new Error("missing")), remove: () => Promise.resolve(), put: () => Promise.resolve(),
};
const deps: Deps = { rpc, env: (k) => env[k] ?? "", fetch: fakeFetch, storage };
async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(k: number, plan: string): Promise<M> {
  const bd = 7_600_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name) values ($1, $2) returning id", [bd, "Agency " + k])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_agencyprof_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
let owner: M, solo: M;

Deno.test("setup: an agency owner on Freelancer Business and a freelancer on Plus", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('agency_team', 'profiles', 'ai_generation', 'onboarding_widget')");
  owner = await member(1, "fl_business"); solo = await member(2, "fl_plus");
  assert((await call("GET", "/agency", owner.token)).body.agency, "Freelancer Business makes the account an agency");
});

Deno.test("agency profile: empty to start, saved with clean fields, the missing list and the counted team", async () => {
  let r = (await call("GET", "/agency/profile", owner.token)).body;
  assert(r.ok, JSON.stringify(r));
  assertEquals(r.missing, ["headline", "summary", "practice_areas", "services", "states_served"]);
  assertEquals(r.team_size, 1, "counted, not typed");
  r = (await call("POST", "/agency/profile", owner.token, { headline: "Family law support", summary: "Too short", practice_areas: ["Family law", " "], states_served: ["tx", "Texas"],
    services: [{ title: "Discovery responses", price_min_cents: 30000, price_max_cents: -5 }, { title: "x" }], team_size: 99 })).body;
  assert(r.ok, JSON.stringify(r));
  assertEquals(r.body.states_served, ["TX"], "two-letter codes only");
  assertEquals(r.body.services.length, 1, "a service needs a title");
  assertEquals(r.body.services[0].price_max_cents, 0, "no negative money");
  assertEquals(r.missing, ["summary"]);
  assertEquals(r.score, 80);
  assertEquals(r.team_size, 1, "a typed team size is ignored");
});

Deno.test("DELA drafts it from the owner's notes; sensitive data is refused; only owners and managers", async () => {
  assertEquals((await call("POST", "/agency/profile/draft", owner.token, { notes: "short" })).body.reason, "tell_us_more");
  const bad = (await call("POST", "/agency/profile/draft", owner.token, { notes: "We are a team. Client SSN 123-45-6789 is in our files for this example." })).body;
  assert(!bad.ok && ["sensitive_data", "looks_like_client_info"].includes(bad.reason), JSON.stringify(bad));
  const d = (await call("POST", "/agency/profile/draft", owner.token, { notes: "Four paralegals in Austin doing family law discovery and case files for small firms, Clio users." })).body;
  assert(d.ok, JSON.stringify(d));
  assertEquals(d.draft.states_served, ["TX"], "the draft is cleaned too");
  assertEquals(d.draft.services.length, 1);
  assertEquals(d.draft.summary, "We prepare discovery responses and organize case files for attorney review.", "no sentence about the notes or what is missing");
  assertEquals(d.empty, [], "nothing left empty");
  const d2 = (await call("POST", "/agency/profile/draft", owner.token, { notes: "Four paralegals doing family law discovery for small firms; no states named here." })).body;
  assertEquals(d2.empty, ["states_served"], "the screen can name the empty box");
  assert(aiSeen.includes("Team members: 1"), "DELA sees the counted team size");
  assertEquals((await call("GET", "/agency/profile", solo.token)).body.reason, "agency_owner_only");
  assertEquals((await call("POST", "/agency/profile", solo.token, { headline: "x" })).body.reason, "agency_owner_only");
  const s = (await call("POST", "/agency/profile", owner.token, { headline: "Family law support", summary: "My client's SSN is 123-45-6789." })).body;
  assert(!s.ok, "sensitive data never goes in the public profile");
});

Deno.test("the guide walks the agency owner to the agency profile once their own profile is done; attorneys see it on proposals", async () => {
  await pool.query(`insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) values ($1, 'freelancer', '{"first_name":"Ann"}', '{}', 100, now())
    on conflict (person_id, side) do update set missing = '{}', availability_confirmed_at = now()`, [owner.id]);
  await pool.query("insert into linkedin_checks (person_id, url, status) values ($1, 'https://www.linkedin.com/in/ann', 'verified')", [owner.id]);
  await pool.query("select dela_profile_refresh($1, 'freelancer')", [owner.id]);
  let g = (await call("GET", "/guide", owner.token)).body;
  assertEquals(g.step, "agency_profile", JSON.stringify(g));
  assert(g.message.includes("a short summary") && g.choices[0].link === "/dela?tab=agency", g.message);
  await call("POST", "/agency/profile", owner.token, { headline: "Family law support", summary: "We prepare discovery responses and organize case files for small family law firms in Texas.",
    practice_areas: ["Family law"], states_served: ["TX"], services: [{ title: "Discovery responses" }] });
  g = (await call("GET", "/guide", owner.token)).body;
  assert(g.step !== "agency_profile", "a complete agency profile ends that step");
  const org = (await one("select dela_side_org($1, 'freelancer') o", [owner.id])).o;
  const pub = await rpc("dela_agency_public", { p_org: org }) as Record<string, any>;
  assertEquals(pub.headline, "Family law support");
  assert(!("missing" in pub) && !("updated_by" in pub), "only the public parts");
});

Deno.test("Talent: a skill search also finds a freelancer whose services or summary mention it (MVP test step 13)", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key = 'talent_search'");
  const att = await member(3, "att_pro");
  await pool.query(`update member_profiles set body = body || '{"services":[{"title":"Discovery responses","for_whom":"Family law firms"}],"skills":[]}'::jsonb,
    availability = 'available', availability_confirmed_at = now() where person_id = $1 and side = 'freelancer'`, [owner.id]);
  await pool.query("update side_profiles set readiness_state = 'match_ready', status = 'active' where person_id = $1 and side = 'freelancer'", [owner.id]);
  const r = await rpc("dela_talent_search", { p_person: att.id, p: { skill: "Discovery responses" } }) as Record<string, any>;
  assert((r.people as Array<{ person_id: string }>).some((x) => x.person_id === owner.id), JSON.stringify(r));
  const none = await rpc("dela_talent_search", { p_person: att.id, p: { skill: "Patent prosecution" } }) as Record<string, any>;
  assert(!(none.people as Array<{ person_id: string }>).some((x) => x.person_id === owner.id), "an unrelated skill does not match");
});

Deno.test("teardown", async () => { await pool.end(); });

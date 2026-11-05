// Agencies, part 2a: the agency bench with a signed fee split (docs/briefs/step-7d-agencies.md, Stacey's answers and fee
// answers 2026-11-05) through the real api and database: the agency invites a freelancer by email with a default split
// (5% to 50% to the agency, never below the freelancer fee) and signs it; a Free freelancer must upgrade to Plus to join;
// the freelancer signs, proposes another split, or declines; both signatures make them a bench member; a new default
// split needs both signatures and the old one stays until then; leaving and removing; the team sees every split; the
// attorney never does; a downgrade to Free shows "Inactive"; versions and signatures are append-only.
//   deno test -A supabase/functions/api/agency_bench_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: () => Promise.resolve(0), read: () => Promise.reject(new Error("missing")), remove: () => Promise.resolve(), put: () => Promise.resolve(),
};
const deps: Deps = { rpc, env: (k) => ({ DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: (() => Promise.resolve(new Response("{}", { status: 404 }))) as typeof fetch, storage };
async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number; email: string };
async function member(k: number, plan: string, name: string): Promise<M> {
  const bd = 8_500_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const email = `bn${bd}@test.invalid`;
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, name, email])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  if (side === "freelancer") {
    await pool.query("insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) values ($1, 'freelancer', $2, '{}', 100, now())",
      [id, { first_name: name.split(" ")[0], last_name: name.split(" ")[1] ?? "", practice_areas: ["Family law"], firm_name: k === 1 ? "Roe Support Group" : "", headline: name + " headline" }]);
    await pool.query("select dela_profile_refresh($1, 'freelancer')", [id]);
  }
  return { token, id, bd, email };
}
const sign = { typed_name: "Olive Owner", agree: true };
let owner: M, mgr: M, plus: M, free: M, other: M, att: M, team: M;
let benchPlus = "", benchFree = "";

Deno.test("setup", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('agency_team', 'agency_bench', 'profiles')");
  await pool.query("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
  owner = await member(1, "fl_business", "Olive Owner"); mgr = await member(2, "fl_plus", "Max Manager"); plus = await member(3, "fl_plus", "Pia Plus");
  free = await member(4, "fl_free", "Fred Free"); other = await member(5, "fl_pro", "Omar Other"); att = await member(6, "att_pro", "Ann Attorney"); team = await member(7, "att_free", "Lawfecta Team");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'support')", [team.id]);
  assertEquals((await call("GET", "/agency", owner.token)).body.agency.role, "owner");
  const inv = (await call("POST", "/agency/invite", owner.token, { email: mgr.email, role: "manager" })).body;
  assert(inv.ok, JSON.stringify(inv));
  const id = (await one("select id from agency_invites where person_id = $1 order by created_at desc limit 1", [mgr.id])).id;
  assert((await call("POST", "/agency/invite/answer", mgr.token, { id, accept: true })).body.ok);
});

Deno.test("invite: owner or manager, a real freelancer, a split inside 5% to 50%, signed", async () => {
  assertEquals((await call("POST", "/agency/bench/invite", plus.token, { email: other.email, agency_percent: 20, ...sign })).body.reason, "agency_managers_only", "a solo freelancer has no agency bench");
  assertEquals((await call("POST", "/agency/bench/invite", owner.token, { email: att.email, agency_percent: 20, ...sign })).body.reason, "not_a_freelancer");
  assertEquals((await call("POST", "/agency/bench/invite", owner.token, { email: mgr.email, agency_percent: 20, ...sign })).body.reason, "already_on_team", "team members use seats, not the bench");
  const low = (await call("POST", "/agency/bench/invite", owner.token, { email: plus.email, agency_percent: 4, ...sign })).body;
  assertEquals([low.reason, low.limits.min_bps, low.limits.max_bps], ["bad_split", 500, 5000], "below the freelancer fee");
  assertEquals((await call("POST", "/agency/bench/invite", owner.token, { email: plus.email, agency_percent: 51, ...sign })).body.reason, "bad_split", "the person doing the work keeps at least half");
  assertEquals((await call("POST", "/agency/bench/invite", owner.token, { email: plus.email, agency_percent: 30, typed_name: "", agree: true })).body.reason, "sign_needed");
  assertEquals((await call("POST", "/agency/bench/invite", owner.token, { email: plus.email, agency_percent: 30, typed_name: "Olive Owner", agree: false })).body.reason, "sign_needed");
  const ok = (await call("POST", "/agency/bench/invite", owner.token, { email: plus.email, agency_percent: 30, note: "For intake work", request_id: "b1", ...sign })).body;
  assert(ok.ok && ok.plan_ok, JSON.stringify(ok));
  benchPlus = ok.id;
  assertEquals((await call("POST", "/agency/bench/invite", mgr.token, { email: plus.email, agency_percent: 30, typed_name: "Max Manager", agree: true })).body.duplicate, true, "one open bench line per freelancer");
  const n = await one("select title, body from notifications where person_id = $1 order by created_at desc limit 1", [plus.id]);
  assert(n.title === "Roe Support Group invited you to its bench" && n.body.includes("30.0% of the fee to the agency and 70.0% to you"), JSON.stringify(n));
  const v = (await call("GET", "/agency/bench", owner.token)).body;
  const line = v.agency_bench.find((b: { id: string }) => b.id === benchPlus);
  assertEquals([line.status, line.split, line.waiting.agency_bps, line.waiting.agency_signed, line.waiting.freelancer_signed], ["invited", null, 3000, true, false], JSON.stringify(line));
  assert(v.terms.includes("No poaching") && v.terms.includes("Confidentiality"), "the terms are shown before signing");
});

Deno.test("a Free freelancer is told to upgrade, and cannot sign until they do", async () => {
  const r = (await call("POST", "/agency/bench/invite", mgr.token, { email: free.email, agency_percent: 20, typed_name: "Max Manager", agree: true })).body;
  assertEquals([r.ok, r.plan_ok], [true, false]);
  benchFree = r.id;
  const n = await one("select body from notifications where person_id = $1 order by created_at desc limit 1", [free.id]);
  assert(n.body.includes("you need Freelancer Plus or higher. Upgrade to Plus") && n.body.includes("stays open 30 days"), n.body);
  const mine = (await call("GET", "/agency/bench", free.token)).body;
  assertEquals([mine.plan_ok, mine.min_plan, mine.my_benches[0].status], [false, "Freelancer Plus", "invited"]);
  assertEquals((await call("POST", "/agency/bench/answer", free.token, { id: benchFree, action: "sign", typed_name: "Fred Free", agree: true })).body.reason, "bench_plus_needed");
  // Declining needs no plan
  assertEquals((await call("POST", "/agency/bench/answer", free.token, { id: benchFree, action: "decline" })).body.status, "declined");
  // An expired invitation cannot be signed
  const late = (await call("POST", "/agency/bench/invite", owner.token, { email: other.email, agency_percent: 20, ...sign })).body;
  await pool.query("update agency_bench set expires_at = now() - interval '1 minute' where id = $1", [late.id]);
  assertEquals((await call("POST", "/agency/bench/answer", other.token, { id: late.id, action: "sign", typed_name: "Omar Other", agree: true })).body.reason, "bench_invite_expired");
});

Deno.test("the freelancer proposes another split; the agency signs it; then they are on the bench", async () => {
  assertEquals((await call("POST", "/agency/bench/answer", other.token, { id: benchPlus, action: "sign", typed_name: "Omar", agree: true })).body.reason, "not_found", "only the invited freelancer answers");
  assertEquals((await call("POST", "/agency/bench/answer", plus.token, { id: benchPlus, action: "counter", agency_percent: 3, typed_name: "Pia Plus", agree: true })).body.reason, "bad_split");
  const c = (await call("POST", "/agency/bench/answer", plus.token, { id: benchPlus, action: "counter", agency_percent: 20, typed_name: "Pia Plus", agree: true })).body;
  assertEquals([c.ok, c.version, c.status], [true, 2, "invited"]);
  assertEquals((await call("POST", "/agency/bench/answer", plus.token, { id: benchPlus, action: "sign", typed_name: "Pia Plus", agree: true })).body.reason, "waiting_for_other_side", "the freelancer already signed version 2");
  const n = await one("select title from notifications where person_id = $1 order by created_at desc limit 1", [owner.id]);
  assertEquals(n.title, "Pia Plus proposed another split");
  const s = (await call("POST", "/agency/bench/agency", mgr.token, { id: benchPlus, action: "sign", typed_name: "Max Manager", agree: true })).body;
  assertEquals([s.ok, s.version, s.agency_bps, s.joined, s.status], [true, 2, 2000, true, "active"], JSON.stringify(s));
  const mine = (await call("GET", "/agency/bench", plus.token)).body.my_benches[0];
  assertEquals([mine.status, mine.agency, mine.split.agency_bps, mine.waiting], ["active", "Roe Support Group", 2000, null]);
  const sigs = await one("select count(*)::int n from agency_bench_signatures where bench_id = $1 and version = 2", [benchPlus]);
  assertEquals(sigs.n, 2, "both signed version 2");
  let blocked = false;
  try { await pool.query("update agency_bench_signatures set typed_name = 'x' where bench_id = $1", [benchPlus]); } catch { blocked = true; }
  assert(blocked, "signatures are append-only");
});

Deno.test("a new default split needs both signatures; the old one applies until then", async () => {
  assertEquals((await call("POST", "/agency/bench/agency", owner.token, { id: benchPlus, action: "change", agency_percent: 60, ...sign })).body.reason, "bad_split");
  const ch = (await call("POST", "/agency/bench/agency", owner.token, { id: benchPlus, action: "change", agency_percent: 25, ...sign })).body;
  assertEquals([ch.ok, ch.version], [true, 3]);
  let line = (await call("GET", "/agency/bench", owner.token)).body.agency_bench.find((b: { id: string }) => b.id === benchPlus);
  assertEquals([line.split.agency_bps, line.waiting.agency_bps, line.waiting.agency_signed], [2000, 2500, true], "20% stays in effect until Pia signs");
  assertEquals((await call("POST", "/agency/bench/agency", owner.token, { id: benchPlus, action: "sign", ...sign })).body.reason, "waiting_for_other_side");
  const s = (await call("POST", "/agency/bench/answer", plus.token, { id: benchPlus, action: "sign", typed_name: "Pia Plus", agree: true })).body;
  assertEquals([s.ok, s.agency_bps, s.joined], [true, 2500, false]);
  line = (await call("GET", "/agency/bench", owner.token)).body.agency_bench.find((b: { id: string }) => b.id === benchPlus);
  assertEquals([line.split.version, line.split.agency_bps, line.waiting], [3, 2500, null]);
});

Deno.test("who sees the split: the agency, the freelancer and the team, never the attorney", async () => {
  assertEquals((await call("GET", "/agency/bench", att.token)).status, 403, "attorneys have no agency bench");
  const adm = (await call("GET", "/admin/agencies/bench", team.token)).body;
  const d = adm.data ?? adm;
  assert(d.bench.some((b: { id: string; split: { agency_bps: number } }) => b.id === benchPlus && b.split.agency_bps === 2500), "the team sees every split");
  assertEquals((await call("GET", "/admin/agencies/bench", owner.token)).status, 403);
});

Deno.test("a bench member on Free shows Inactive; leaving and removing", async () => {
  await pool.query("select dela_ensure_side($1, 'freelancer', 'fl_free', 'staff_grant')", [plus.id]);
  let line = (await call("GET", "/agency/bench", owner.token)).body.agency_bench.find((b: { id: string }) => b.id === benchPlus);
  assertEquals([line.status, line.inactive, line.split.agency_bps], ["active", true, 2500], "the split stays; no new assignments (part 2b)");
  await pool.query("select dela_ensure_side($1, 'freelancer', 'fl_plus', 'staff_grant')", [plus.id]);
  line = (await call("GET", "/agency/bench", owner.token)).body.agency_bench.find((b: { id: string }) => b.id === benchPlus);
  assertEquals(line.inactive, false, "upgrading makes them active again");
  assertEquals((await call("POST", "/agency/bench/end", other.token, { id: benchPlus })).body.reason, "not_found");
  assertEquals((await call("POST", "/agency/bench/end", plus.token, { id: benchPlus })).body.status, "left");
  assertEquals((await call("POST", "/agency/bench/end", plus.token, { id: benchPlus })).body.duplicate, true);
  const n = await one("select title from notifications where person_id = $1 order by created_at desc limit 1", [owner.id]);
  assertEquals(n.title, "Pia Plus left your bench");
  // Invited again: a new line with its own agreement
  const again = (await call("POST", "/agency/bench/invite", owner.token, { email: plus.email, agency_percent: 30, ...sign })).body;
  assert(again.ok && !again.duplicate && again.id !== benchPlus);
  assertEquals((await call("POST", "/agency/bench/end", mgr.token, { id: again.id })).body.status, "removed", "a manager cancels the invitation");
});

Deno.test("the switch: off means no bench", async () => {
  await pool.query("update feature_switches set state = 'off' where key = 'agency_bench'");
  assertEquals((await call("GET", "/agency/bench", owner.token)).body.on, false);
  assertEquals((await call("POST", "/agency/bench/invite", owner.token, { email: other.email, agency_percent: 30, ...sign })).body.reason, "agency_bench_off");
  await pool.query("update feature_switches set state = 'everyone' where key = 'agency_bench'");
});

// Step 90a API tests (docs/briefs/step-90-member-move.md): reading the old website's members for the move. Two
// stand-in websites: the old one (old.bd.test, its own key) and the new one (bd.test). Who may use the page, that a
// missing key or a refusing site stops the reading with a reason, that a whole site is read page by page, that only the
// listed fields are kept (never a password or a card), that nothing is ever written to either site, the plan map with
// nothing pre-chosen, categories matched by name, and every rule of the preview.
// Run after tools/dbtest.sh:   deno test -A supabase/functions/api/member_move_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, moveForm, movePick, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const RUN = Date.now() % 1000000;
const WORKER = "test-worker-secret-move-0123456789abcdef";
const OLD_KEY = "old-site-test-key", NEW_KEY = "new-site-test-key";
let oldKeySet = true, oldSite: "ok" | "forbidden" | "busy" = "ok", newSite: "ok" | "forbidden" | "busy" = "ok";
// What the new stand-in site was asked to create, and the members it has
const made: Array<Record<string, string>> = [];
// Member numbers the new stand-in site hands out, clear of anything the test database already holds
const NEW0 = 9_600_000 + (Date.now() % 100000) * 10;
const newMembers: Array<Record<string, string>> = [{ user_id: "686", email: "already@new.example", subscription_id: "12" }, { user_id: "687", email: "other@new.example", subscription_id: "5" }];
const calls: Array<{ host: string; method: string; path: string; key: string }> = [];

// 230 members of the old site, so the reading takes three pages and more than one turn is not needed
const N = 230;
const oldMember = (i: number): Record<string, unknown> => ({
  user_id: String(1000 + i), first_name: "First" + i, last_name: "Last" + i, email: i === 5 ? "DUP@Example.com " : i === 6 ? "dup@example.com" : i === 7 ? "" : i === 8 ? "not-an-email" : i === 9 ? "Already@New.example" : `m${i}@old.example`,
  company: i % 10 === 0 ? "Firm " + i : "", subscription_id: i <= 150 ? "5" : i <= 200 ? "16" : i <= 220 ? "8" : "10", active: i === 11 ? "3" : "2",
  profession_id: i > 150 ? "2" : "0", service: i > 150 ? "23, 45, 99" : "", last_login: i === 6 ? "20260901120000" : i === 5 ? "20240101120000" : "19700101000000", signup_date: "20230803132502",
  linkedin: "https%3A%2F%2Fwww.linkedin.com%2Fin%2Fperson" + i, about_me: "<p>About " + i + "</p>", city: "Austin", state_code: "TX",
  // What must never be kept
  password: "$2y$10$abcdefghijklmnopqrstuv", token: "t".repeat(32), card_info: { last4: "4242" }, cookie: "c", last_login_ip: "10.0.0.1", app_reset_code: "999999",
  photos_schema: [{ photo_id: "1", file: "pimage-" + i + ".png", type: "photo" }],
});
const page = (url: URL, rows: unknown[]) => {
  const at = Number(url.searchParams.get("page") || "0"), lim = Number(url.searchParams.get("limit") || "25");
  const part = rows.slice(at, at + lim);
  return Response.json({ status: "success", message: part, ...(at + lim < rows.length ? { next_page: String(at + lim) } : {}) });
};
const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const key = String((init.headers as Record<string, string>)?.["X-Api-Key"] ?? "");
  calls.push({ host: url.hostname, method: String(init.method ?? "GET"), path: url.pathname, key });
  if (url.hostname === "old.bd.test") {
    if (key !== OLD_KEY) return Response.json({ status: "error", message: "bad key" }, { status: 401 });
    if (oldSite === "forbidden") return Response.json({ status: "error", message: "not allowed" }, { status: 403 });
    if (oldSite === "busy") return new Response("slow down", { status: 429 });
    if (url.pathname === "/api/v2/user/get") return page(url, Array.from({ length: N }, (_, k) => oldMember(k + 1)));
    if (url.pathname === "/api/v2/subscription_types/get") return page(url, [
      { subscription_id: "5", subscription_name: "Attorney Account", profile_type: "free", monthly_amount: "0.00", yearly_amount: "0.00", initial_amount: "0.00" },
      { subscription_id: "16", subscription_name: "Free Membership", profile_type: "free", monthly_amount: "0.00", yearly_amount: "0.00", initial_amount: "0.00" },
      { subscription_id: "8", subscription_name: "Claim Listing", profile_type: "claim", monthly_amount: "0.00", yearly_amount: "0.00", initial_amount: "0.00" },
      { subscription_id: "10", subscription_name: "Pro Membership", profile_type: "paid", monthly_amount: "35.00", yearly_amount: "350.00", initial_amount: "0.00" }]);
    if (url.pathname === "/api/v2/list_professions/get") return page(url, [{ profession_id: "2", name: "Paralegal Services" }, { profession_id: "3", name: "Only On The Old Site" }]);
    if (url.pathname === "/api/v2/list_services/get") return page(url, [
      { service_id: "23", name: "Civil Litigation", profession_id: "2", master_id: "0" }, { service_id: "45", name: "Westlaw", profession_id: "2", master_id: "23" },
      { service_id: "99", name: "Gone Here", profession_id: "2", master_id: "0" }, { service_id: "77", name: "Unused And Unmatched", profession_id: "2", master_id: "0" }]);
    return new Response("{}", { status: 404 });
  }
  if (url.hostname !== "bd.test") throw new Error("unexpected fetch " + url.href);
  if (url.pathname === "/api/v2/user/create" && init.method === "POST") {
    if (newSite === "forbidden") return Response.json({ status: "error", message: "not allowed" }, { status: 403 });
    if (newSite === "busy") return new Response("slow down", { status: 429 });
    const form = Object.fromEntries(new URLSearchParams(String(init.body)));
    made.push(form);
    const rec = { user_id: String(NEW0 + made.length), email: form.email, subscription_id: form.subscription_id };
    newMembers.push(rec);
    return Response.json({ status: "success", message: rec });
  }
  if (url.pathname === "/api/v2/user/get" && url.searchParams.get("property") === "email") {
    const want = String(url.searchParams.get("property_value") ?? "").toLowerCase();
    const hit = newMembers.filter((m) => m.email.toLowerCase() === want);
    return hit.length ? Response.json({ status: "success", message: hit }) : Response.json({ status: "error", message: "user not found" }, { status: 404 });
  }
  if (url.pathname === "/api/v2/user/get") return page(url, newMembers.slice(0, 2));
  if (url.pathname === "/api/v2/subscription_types/get") return page(url, [
    { subscription_id: "5", subscription_name: "Attorney Free", profile_type: "free", searchable: "0", search_membership_permissions: "" },
    { subscription_id: "3", subscription_name: "Free", profile_type: "free", searchable: "1", search_membership_permissions: "visitor" },
    { subscription_id: "8", subscription_name: "Pro", profile_type: "paid", searchable: "1", search_membership_permissions: "visitor" },
    { subscription_id: "6", subscription_name: "Claim Listing", profile_type: "claim", searchable: "1", search_membership_permissions: "visitor" }]);
  if (url.pathname === "/api/v2/list_professions/get") return page(url, [{ profession_id: "40", name: "Paralegal Services", filename: "paralegal-services" }]);
  if (url.pathname === "/api/v2/list_services/get") return page(url, [
    { service_id: "501", name: "Civil Litigation", profession_id: "40", master_id: "0", filename: "civil" }, { service_id: "502", name: "Westlaw", profession_id: "40", master_id: "501", filename: "westlaw" },
    { service_id: "503", name: "Estate Planning", profession_id: "40", master_id: "0", filename: "estate" }, { service_id: "504", name: "Westlaw", profession_id: "40", master_id: "503", filename: "westlaw-2" }]);
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const deps: Deps = { rpc, env: (k) => ({ BD_API_KEY: NEW_KEY, BD_OLD_API_KEY: oldKeySet ? OLD_KEY : "", DELA_WORKER_SECRET: WORKER, DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: fakeFetch };
async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, { method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }), deps);
  const j = await res.json() as Record<string, any>;
  return { status: res.status, body: (j && typeof j.data === "object" && j.data ? j.data : j) as Record<string, any> };
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
// Someone who may not use the page is turned away (401 for a member, 403 for a team member without the role)
const denied = (status: number) => status === 401 || status === 403;
async function work(times = 6) {
  for (let i = 0; i < times; i++) {
    await pool.query("update jobs set run_at = now() where status in ('queued', 'delayed') and kind in ('move_read', 'move_create')");
    await handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
  }
}
type M = { token: string; id: string };
async function member(k: number, plan: string): Promise<M> {
  const bd = 8_700_000 + RUN * 10 + k, side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Move " + k, `mv${bd}@test.invalid`])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id };
}
let owner: M, support: M, plain: M;
let was: Array<{ key: string; value: unknown }> = [], wasSwitch = "off", wasPlan: unknown = null;

Deno.test("setup", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  was = (await pool.query("select key, value from settings where key in ('site.url', 'bd_old.site_url')")).rows;
  await pool.query("update settings set value = '\"https://bd.test\"' where key = 'site.url'");
  await pool.query("update settings set value = '\"https://old.bd.test\"' where key = 'bd_old.site_url'");
  wasSwitch = (await one("select state from feature_switches where key = 'member_move'")).state;
  await pool.query("update feature_switches set state = 'off' where key = 'member_move'");
  // On the new stand-in site, plan 5 is DELA's free attorney plan
  wasPlan = (await one("select bd_plan_id from plans where code = 'att_free'")).bd_plan_id;
  await pool.query("update plans set bd_plan_id = null where bd_plan_id = 5 and code <> 'att_free'");
  await pool.query("update plans set bd_plan_id = 5 where code = 'att_free'");
  owner = await member(1, "att_free"); support = await member(2, "att_free"); plain = await member(3, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'owner'), ($2, 'support')", [owner.id, support.id]);
  await pool.query("update move_state set status = 'idle', members = 0, pages = 0, problem = '' where id = 1");
  await pool.query("delete from move_plan_map where true"); await pool.query("delete from move_category_map where true"); await pool.query("delete from move_members where true");
  await pool.query("delete from move_links where true"); await pool.query("update move_run set status = 'idle', only_ids = null where id = 1"); await pool.query("update move_examples set approved_at = null, approved_by = null, given = false where true");
});

Deno.test("what is kept of one member: the listed fields, links decoded, and never a password, a token or a card", () => {
  const p = movePick(oldMember(12))!;
  const text = JSON.stringify(p);
  assertEquals([p.old_id, p.plan_id, p.active, p.email], [1012, 5, 2, "m12@old.example"]);
  assertEquals((p.rec as Record<string, unknown>).linkedin, "https://www.linkedin.com/in/person12", "a link the old site keeps percent-encoded is read as a link");
  assertEquals(p.last_login, "", "a login date of 1970 means never logged in");
  assert(String(p.signup_date).startsWith("2023-08-03"), "the website's own date form is read");
  assertEquals(((p.rec as Record<string, unknown>).photos as unknown[]).length, 1);
  for (const bad of ["$2y$10$", "tttttttt", "4242", "10.0.0.1", "999999", "cookie", "card_info", "password"]) assert(!text.includes(bad), "never kept: " + bad);
  assertEquals(movePick({ first_name: "No number" }), null);
  assertEquals((movePick(oldMember(151))!.services as string[]), ["23", "45", "99"]);
});

Deno.test("who may use it: the owner only, and only with the switch on", async () => {
  assert(denied((await call("GET", "/admin/move", plain.token)).status), "a member is not let in");
  assert(denied((await call("GET", "/admin/move", support.token)).status), "a team member who is not the owner is not let in");
  const off = (await call("GET", "/admin/move", owner.token)).body;
  assertEquals([off.ok, off.on, off.key_set, off.site], [true, false, true, "https://old.bd.test"]);
  assert(!JSON.stringify(off).includes(OLD_KEY), "the page is told only that a key exists, never the key");
  assertEquals((await call("POST", "/admin/move/read", owner.token, {})).body.reason, "move_off");
  await pool.query("update feature_switches set state = 'staff' where key = 'member_move'");
  assert(denied((await call("POST", "/admin/move/read", support.token, {})).status));
});

Deno.test("a reading that cannot go on stops with a reason: no key, a refusing site; a busy site is tried again", async () => {
  oldKeySet = false;
  assertEquals((await call("POST", "/admin/move/read", owner.token, {})).body.ok, true);
  await work(2);
  let s = (await call("GET", "/admin/move", owner.token)).body;
  assertEquals([s.state.status, s.key_set], ["failed", false]);
  assert(s.state.problem.includes("BD_OLD_API_KEY"), s.state.problem);
  oldKeySet = true; oldSite = "forbidden";
  await call("POST", "/admin/move/read", owner.token, {});
  await work(2);
  s = (await call("GET", "/admin/move", owner.token)).body;
  assert(s.state.status === "failed" && s.state.problem.includes("may not read"), JSON.stringify(s.state));
  oldSite = "busy";
  await call("POST", "/admin/move/read", owner.token, {});
  await work(1);
  s = (await call("GET", "/admin/move", owner.token)).body;
  assertEquals(s.state.status, "reading", "a site that says slow down is not a failure; the job waits and tries again");
  await pool.query("update jobs set status = 'canceled' where kind = 'move_read' and status in ('queued', 'delayed', 'running')");
  await pool.query("update move_state set status = 'failed' where id = 1");
  oldSite = "ok";
});

Deno.test("the whole old site is read, page by page, and nothing is written to either site", async () => {
  calls.length = 0;
  const b = (await call("POST", "/admin/move/read", owner.token, {})).body;
  assertEquals(b.ok, true, JSON.stringify(b));
  assertEquals((await call("POST", "/admin/move/read", owner.token, {})).body.duplicate, true, "a second click while it reads starts nothing new");
  await work(4);
  const s = (await call("GET", "/admin/move", owner.token)).body;
  assertEquals([s.state.status, s.state.members, s.state.pages], ["read", N, 3], JSON.stringify(s.state));
  assertEquals((await one("select count(*)::int n from move_members")).n, N);
  assert(calls.length > 5 && calls.every((c) => c.method === "GET"), "every call to both sites is a read: " + JSON.stringify([...new Set(calls.map((c) => c.method))]));
  assert(calls.filter((c) => c.host === "old.bd.test").every((c) => c.key === OLD_KEY) && calls.filter((c) => c.host === "bd.test").every((c) => c.key === NEW_KEY), "each site gets its own key, never the other's");
  const kept = JSON.stringify((await pool.query("select rec from move_members")).rows);
  assert(!kept.includes("$2y$10$") && !kept.includes("4242") && !kept.includes("tttttttt"), "no password, card or token is in what was kept");
  // The plans: one line for each plan members have, with its count, and nothing chosen
  assertEquals(s.old_plans.map((p: any) => [p.plan_id, p.name, p.members, p.new_plan, p.skip]), [[5, "Attorney Account", 150, null, false], [16, "Free Membership", 50, null, false], [8, "Claim Listing", 20, null, false], [10, "Pro Membership", 10, null, false]]);
  assertEquals(s.new_plans.map((p: any) => p.name).sort(), ["Attorney Free", "Claim Listing", "Free", "Pro"]);
  assert(s.new_plans.find((p: any) => p.name === "Free").searchable === true && s.new_plans.find((p: any) => p.name === "Attorney Free").searchable === false);
  // Categories match by name and place: the same name under another parent is not a match
  const map = Object.fromEntries((await pool.query("select old_kind || old_id k, new_key from move_category_map")).rows.map((r: any) => [r.k, r.new_key]));
  assertEquals([map.p2, map.s23, map.s45, map.s99, map.p3], ["p40", "s501", "s502", null, null], JSON.stringify(map));
  assertEquals(s.categories.unmatched.map((c: any) => [c.kind, c.id, c.members]), [["s", 99, 80]], "only a category members use and that has no match is listed");
});

Deno.test("the plan map is the owner's; a plan that is not on the new site is refused", async () => {
  assert(denied((await call("POST", "/admin/move/plan", support.token, { old_plan: 5, new_plan: 5 })).status));
  assertEquals((await call("POST", "/admin/move/plan", owner.token, { old_plan: 5, new_plan: 999 })).body.reason, "plan_not_on_new_site");
  assertEquals((await call("POST", "/admin/move/plan", owner.token, { old_plan: 4242, new_plan: 5 })).body.reason, "not_found");
  // Before any choice, nobody would move
  let pv = (await call("GET", "/admin/move/preview", owner.token)).body;
  assertEquals([pv.total, pv.decisions.move ?? 0, pv.decisions.no_plan], [N, 0, N - 2], JSON.stringify(pv.decisions));
  assertEquals((await call("POST", "/admin/move/plan", owner.token, { old_plan: 5, new_plan: 5 })).body.ok, true);
  assertEquals((await call("POST", "/admin/move/plan", owner.token, { old_plan: 16, new_plan: 3 })).body.ok, true);
  assertEquals((await call("POST", "/admin/move/plan", owner.token, { old_plan: 8, skip: true })).body.ok, true);
  pv = (await call("GET", "/admin/move/preview", owner.token)).body;
  // 150 on the attorney plan: one has no email, one is not an email, one of the two with the same email stays, one is already on the new site
  assertEquals(pv.decisions, { move: 196, bad_email: 2, duplicate: 1, on_new: 1, skip: 20, no_plan: 10 }, JSON.stringify(pv.decisions));
  assertEquals(pv.by_new_plan.map((x: any) => [x.name, x.members, x.searchable]), [["Attorney Free", 146, false], ["Free", 50, true]]);
  assertEquals([pv.visible, pv.attorneys], [50, 146]);
  assertEquals(pv.statuses, { "2": 195, "3": 1 }, "a canceled member moves as canceled");
  const row = (id: number) => pv.rows.find((r: any) => r.old_id === id);
  assertEquals([row(1005).decision, row(1005).other, row(1006).decision], ["duplicate", 1006, "move"], "of two members with one email, written in different capitals, the one who logged in last moves");
  assertEquals([row(1007).decision, row(1008).decision, row(1009).decision, row(1201).decision, row(1221).decision], ["bad_email", "bad_email", "on_new", "skip", "no_plan"]);
  assertEquals([row(1012).old_plan, row(1012).new_plan], ["Attorney Account", "Attorney Free"]);
  // A category set by hand stays through the next reading
  assertEquals((await call("POST", "/admin/move/category", owner.token, { kind: "s", id: 99, new_key: "s503" })).body.ok, true);
  assertEquals((await call("POST", "/admin/move/category", owner.token, { kind: "s", id: 99, new_key: "p40" })).body.reason, "category_not_on_new_site", "a sub category cannot be mapped to a top category");
  await call("POST", "/admin/move/read", owner.token, {});
  await work(4);
  const again = (await call("GET", "/admin/move", owner.token)).body;
  assertEquals(again.categories.unmatched, [], "the hand-set category is kept");
  assertEquals(again.old_plans.find((p: any) => p.plan_id === 5).new_plan, 5, "and so are the plan choices");
});

Deno.test("step 90b: what is sent for one member, and what never is", () => {
  const form = moveForm({ email: " m12@old.example ", new_plan: 5, active: 3, profession_id: 40, services: [501, 502], photo: "https://www.old.example/pictures/p12.png",
    rec: { first_name: "Ana", last_name: "Alvarez", listing_type: "Company", linkedin: "https://www.linkedin.com/in/ana", website: "javascript:alert(1)", about_me: "<p>About</p>", signup_date: "20230803132502", last_login: "2026-09-16T12:52:17+00:00", experience: "2002", verified: "1", search_description: "x".repeat(300) } });
  assertEquals([form.email, form.subscription_id, form.active, form.listing_type, form.profession_id, form.services], ["m12@old.example", "5", "3", "Company", "40", "501,502"]);
  assertEquals([form.signup_date, form.last_login, form.experience, form.verified], ["20230803132502", "20260916125217", "2002", "1"], "dates go in the website's own form");
  assertEquals([form.linkedin, form.website, form.search_description.length], ["https://www.linkedin.com/in/ana", undefined, 170], "a link that is not a web address is left out");
  assertEquals([form.profile_photo, form.auto_image_import], ["https://www.old.example/pictures/p12.png", "1"], "the website copies the picture itself");
  assert(!("password" in form) && !("send_email_notifications" in form), "the form itself never carries a password or asks for the welcome email");
  assertEquals(moveForm({ email: "a@b.example", new_plan: 3, active: 99, rec: {} }).active, "2", "an unknown status moves as active");
});

Deno.test("step 90b: the examples are the owner's to approve; only an approved one can be given", async () => {
  assert(denied((await call("GET", "/admin/move/examples", support.token)).status));
  const ex = (await call("GET", "/admin/move/examples", owner.token)).body.examples;
  assertEquals(ex.map((e: any) => [e.key, e.approved, e.given]), [["client_intake", false, false], ["conflict_check", false, false], ["monthly_billing", false, false]]);
  assert(ex.every((e: any) => e.body.steps.length >= 6 && e.body.steps.every((st: any) => st.basis === "proposed") && e.body.steps.some((st: any) => st.attorney_decides)), "each example has its steps marked as suggestions and an attorney decision");
  assertEquals((await call("POST", "/admin/move/example/give", owner.token, { key: "client_intake" })).body.reason, "example_not_approved");
  assert(denied((await call("POST", "/admin/move/example/approve", support.token, { key: "client_intake" })).status));
  assertEquals((await call("POST", "/admin/move/example/approve", owner.token, { key: "client_intake" })).body.ok, true);
  assertEquals((await call("POST", "/admin/move/example/give", owner.token, { key: "client_intake" })).body.ok, true);
  assertEquals((await call("GET", "/admin/move/examples", owner.token)).body.examples.filter((e: any) => e.given).map((e: any) => e.key), ["client_intake"]);
});

Deno.test("step 90b: try with three members: made, linked, an example for each attorney, and nothing asked of the old site", async () => {
  assert(denied((await call("POST", "/admin/move/start", support.token, { ids: [1012] })).status));
  assertEquals((await call("POST", "/admin/move/start", owner.token, { ids: [1012, 1013, 1014, 1015] })).body.reason, "three_at_most");
  assertEquals((await call("POST", "/admin/move/start", owner.token, { ids: [1012, 1007] })).body.reason, "not_movable", "a member with no email cannot be tried");
  calls.length = 0;
  const st = (await call("POST", "/admin/move/start", owner.token, { ids: [1012, 1151, 1009] })).body;
  assertEquals([st.ok, st.members], [true, 3], JSON.stringify(st));
  await work(2);
  const v = (await call("GET", "/admin/move/run", owner.token)).body;
  assertEquals([v.run.status, v.created, v.linked, v.failed, v.examples_given], ["done", 2, 1, 0, 2], JSON.stringify(v));
  assertEquals(calls.filter((c) => c.host === "old.bd.test").length, 0, "the move never calls the old site");
  assertEquals(made.map((f) => f.email).sort(), ["m12@old.example", "m151@old.example"]);
  const a = made.find((f) => f.email === "m12@old.example")!, fr = made.find((f) => f.email === "m151@old.example")!;
  assertEquals([a.subscription_id, a.first_name, a.linkedin, a.signup_date, a.active], ["5", "First12", "https://www.linkedin.com/in/person12", "20230803132502", "2"]);
  assertEquals([fr.subscription_id, fr.profession_id, fr.services.split(",").sort().join(",")], ["3", "40", "501,502,503"], "categories go over by the map, with this site's own numbers");
  assert(made.every((f) => f.password.length >= 30 && !("send_email_notifications" in f)), "a long throwaway password, and no welcome email is asked for");
  const stored = JSON.stringify((await pool.query("select * from move_links")).rows) + JSON.stringify((await pool.query("select payload, last_error from jobs where kind = 'move_create'")).rows);
  assert(made.every((f) => !stored.includes(f.password)), "the password is kept nowhere");
  const links = Object.fromEntries((await pool.query("select old_id, new_id, how from move_links")).rows.map((r: any) => [r.old_id, [Number(r.new_id), r.how]]));
  assertEquals([links["1012"], links["1151"], links["1009"]], [[NEW0 + 1, "created"], [NEW0 + 2, "created"], [686, "linked"]], JSON.stringify(links));
  // The attorney's workspace exists before their first login, with the example as a draft in it
  const pe = await one("select pe.id, sp.org_id, sp.plan_code, sp.plan_source from people pe join side_profiles sp on sp.person_id = pe.id and sp.side = 'attorney' where pe.bd_member_id = $1", [NEW0 + 1]);
  assertEquals([pe.plan_code, pe.plan_source], ["att_free", "bd"]);
  const doc = await one("select p.id, p.title, p.status, p.source_ref, p.approved_version, (select v.body from playbook_versions v where v.playbook_id = p.id and v.version = p.current_version) body from playbooks p where p.org_id = $1", [pe.org_id]);
  assertEquals([doc.title, doc.status, doc.source_ref, doc.approved_version], ["New client intake", "draft", "lawfecta_example", null], "one example, a draft, never approved for them");
  assert(doc.body.steps.length === 7 && doc.body.steps.every((x: any) => x.basis === "proposed"), "every step is DELA's suggestion until the attorney confirms it");
  assertEquals((await one("select count(*)::int n from people where bd_member_id = $1", [NEW0 + 2])).n, 0, "a freelancer gets no workspace made ahead and no example");
  // The attorney's own page says what the document is
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [NEW0 + 1]);
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) select $1, id, 'attorney', auth_version, now() + interval '1 hour' from people where id = $2", [await sessionHash(token), pe.id]);
  const got = (await call("GET", "/playbooks/get?id=" + doc.id, token)).body;
  assertEquals([got.ok, got.example], [true, true], JSON.stringify(got).slice(0, 200));
});

Deno.test("step 90b: a website that refuses stops the move with the reason; a busy one is tried again; a failed member can be tried again", async () => {
  newSite = "forbidden";
  await call("POST", "/admin/move/start", owner.token, { ids: [1013] });
  await work(2);
  let v = (await call("GET", "/admin/move/run", owner.token)).body;
  assertEquals([v.run.status, v.failed, v.failures[0].old_id], ["paused", 1, 1013], JSON.stringify(v.run));
  assert(v.failures[0].problem.includes("may not create members"), v.failures[0].problem);
  newSite = "busy";
  assertEquals((await call("POST", "/admin/move/pause", owner.token, { on: false })).body.ok, true);
  await work(1);
  v = (await call("GET", "/admin/move/run", owner.token)).body;
  assertEquals([v.run.status, v.failed], ["running", 1], "slow down is not a failure of the member");
  newSite = "ok";
  await work(2);
  v = (await call("GET", "/admin/move/run", owner.token)).body;
  assertEquals([v.run.status, v.created, v.failed], ["done", 3, 0], JSON.stringify(v));
});

Deno.test("step 90b: move everyone: the typed count, a pause, nobody twice, and only those the preview says move", async () => {
  const before = (await call("GET", "/admin/move/run", owner.token)).body;
  assertEquals(before.todo, 193, "197 would move or are already here; four are done");
  assertEquals((await call("POST", "/admin/move/start", owner.token, { confirm: 5 })).body.reason, "count_changed", "a count that is not the page's count starts nothing");
  const n0 = made.length;
  assertEquals((await call("POST", "/admin/move/start", owner.token, { confirm: 193 })).body.ok, true);
  assertEquals((await call("POST", "/admin/move/start", owner.token, { confirm: 193 })).body.duplicate, true, "a second click starts nothing new");
  await work(1);
  assertEquals(made.length - n0, 15, "fifteen members a turn");
  assertEquals((await call("POST", "/admin/move/pause", owner.token, { on: true })).body.ok, true);
  await work(3);
  assertEquals(made.length - n0, 15, "paused: nothing more is made");
  assertEquals((await call("POST", "/admin/move/pause", owner.token, { on: false })).body.ok, true);
  await work(20);
  const v = (await call("GET", "/admin/move/run", owner.token)).body;
  assertEquals([v.run.status, v.todo, v.created, v.linked, v.failed], ["done", 0, 196, 1, 0], JSON.stringify(v));
  const emails = made.map((f) => f.email.toLowerCase());
  assertEquals(new Set(emails).size, emails.length, "nobody was made twice");
  assertEquals(emails.filter((e) => e === "dup@example.com").length, 1, "of two members with one email, one was made");
  assert(!emails.includes("") && !emails.includes("not-an-email") && !emails.includes("already@new.example"), "no member without an email, and nobody who was already here");
  assert(made.every((f) => f.subscription_id === "5" || f.subscription_id === "3"), "only the plans the owner chose; nobody from a plan set to \"Do not move\" or left without a choice");
  assertEquals(made.filter((f) => f.active === "3").length, 1, "a canceled member moves as canceled");
  assertEquals(v.examples_given, 147, "all 146 attorneys who were made have the example, and so has the one attorney who was only linked and had no documents");
  assertEquals((await call("POST", "/admin/move/start", owner.token, { confirm: 0 })).body.reason, "nothing_to_move");
  // The list for the "set your password" email
  const list = (await call("GET", "/admin/move/moved", owner.token)).body.rows;
  assertEquals([list.length, list.filter((r: any) => r.how === "linked").length, list.filter((r: any) => r.logged_in).length], [197, 1, 1], "everyone moved is on the list; one has logged in since (the test's own session)");
  assert(!JSON.stringify(list).includes("password"), "the list holds no password");
});

Deno.test("teardown", async () => {
  for (const w of was) await pool.query("update settings set value = $1 where key = $2", [JSON.stringify(w.value), w.key]);
  await pool.query("update feature_switches set state = $1 where key = 'member_move'", [wasSwitch]);
  await pool.query("update plans set bd_plan_id = $1 where code = 'att_free'", [wasPlan]);
  await pool.end();
});

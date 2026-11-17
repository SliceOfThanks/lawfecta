// Step 33: each member's own Home (docs/briefs/step-33-home-dashboard.md), through the real api and database.
// The default without a saved layout; save, read back and reset; what is refused; the two sides and two members stay
// apart; a layout hides nothing anywhere else; one audit line per save.
//   deno test -A supabase/functions/api/home_test.ts   (after tools/dbtest.sh)
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const deps: Deps = { rpc, env: (k) => ({ DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: (() => { throw new Error("no outside calls"); }) as typeof fetch };
async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
const RUN = Date.now() % 1000000;
const DEFAULT = ["ask", "attention", "projects", "usage", "notifications", "account"];
let n = 0;
async function person(sides: string[]) {
  const bd = 9_400_000 + RUN * 10 + (++n);
  const id = (await pool.query("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Home " + n, `home${n}-${RUN}@test.invalid`])).rows[0].id as string;
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const tokens: Record<string, string> = {};
  for (const side of sides) {
    await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, side === "attorney" ? "att_pro" : "fl_pro"]);
    tokens[side] = "ds_test_" + crypto.randomUUID();
    await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(tokens[side]), id, side]);
  }
  return { id, tokens };
}
const audits = async (id: string) => (await pool.query("select action, detail from audit_log where object_id = $1 and action like 'home_layout%' order by id", [id])).rows;

let both: Awaited<ReturnType<typeof person>>, other: Awaited<ReturnType<typeof person>>;
Deno.test("setup", async () => {
  both = await person(["attorney", "freelancer"]);
  other = await person(["attorney"]);
});

Deno.test("a member who never customized gets the default; signed out gets nothing", async () => {
  const r = (await call("GET", "/home/layout", both.tokens.attorney)).body;
  assertEquals([r.ok, r.widgets, r.customized], [true, DEFAULT, false]);
  assert(r.all.includes("bench") && r.all.includes("quick"), "the attorney's library has the bench");
  const f = (await call("GET", "/home/layout", both.tokens.freelancer)).body;
  assert(!f.all.includes("bench"), "a freelancer has no bench widget");
  assertEquals((await call("GET", "/home/layout", "ds_madeup")).status, 401);
  assertEquals((await call("POST", "/home/layout", "ds_madeup", { widgets: ["ask"] })).status, 401);
});

Deno.test("save keeps the member's order, drops repeats, and refuses what is not a widget", async () => {
  const s = (await call("POST", "/home/layout", both.tokens.attorney, { widgets: ["messages", "ask", "messages", "bench"] })).body;
  assertEquals([s.ok, s.widgets, s.customized], [true, ["messages", "ask", "bench"], true]);
  assertEquals((await call("GET", "/home/layout", both.tokens.attorney)).body.widgets, ["messages", "ask", "bench"]);
  assertEquals((await call("POST", "/home/layout", both.tokens.attorney, { widgets: ["ask", "made_up"] })).body.reason, "unknown_widget");
  assertEquals((await call("POST", "/home/layout", both.tokens.attorney, { widgets: [] })).body.reason, "keep_one_widget");
  assertEquals((await call("POST", "/home/layout", both.tokens.attorney, { widgets: "ask" })).body.reason, "bad_request");
  assertEquals((await call("POST", "/home/layout", both.tokens.attorney, {})).body.reason, "bad_request");
  assertEquals((await call("GET", "/home/layout", both.tokens.attorney)).body.widgets, ["messages", "ask", "bench"], "a refused save changes nothing");
  const a = await audits(both.id);
  assertEquals(a.length, 1, "one audit line for the one save that went through");
  assertEquals([a[0].action, a[0].detail.side, a[0].detail.widgets], ["home_layout_saved", "attorney", ["messages", "ask", "bench"]]);
});

Deno.test("the two sides and two members keep separate layouts", async () => {
  assertEquals((await call("GET", "/home/layout", both.tokens.freelancer)).body.widgets, DEFAULT, "the attorney layout did not touch the freelancer side");
  assertEquals((await call("POST", "/home/layout", both.tokens.freelancer, { widgets: ["ask", "bench"] })).body.reason, "unknown_widget", "the bench is the attorney's");
  assertEquals((await call("POST", "/home/layout", both.tokens.freelancer, { widgets: ["usage"] })).body.widgets, ["usage"]);
  assertEquals((await call("GET", "/home/layout", both.tokens.attorney)).body.widgets, ["messages", "ask", "bench"]);
  assertEquals((await call("GET", "/home/layout", other.tokens.attorney)).body.widgets, DEFAULT, "another member is not changed");
  // The person is always the signed-in one: an id in the body is ignored
  await call("POST", "/home/layout", other.tokens.attorney, { widgets: ["quick"], person_id: both.id, side: "freelancer" });
  assertEquals((await call("GET", "/home/layout", both.tokens.freelancer)).body.widgets, ["usage"]);
  assertEquals((await call("GET", "/home/layout", other.tokens.attorney)).body.widgets, ["quick"]);
});

Deno.test("a layout only changes Home: notifications are still counted and listed", async () => {
  await pool.query("insert into notifications (person_id, channel, kind, title, body, dedupe_key) values ($1, 'in_app', 'system', 'Home test notice', 'Still here.', 'home-test-' || gen_random_uuid())", [both.id]);
  await call("POST", "/home/layout", both.tokens.attorney, { widgets: ["ask"] });
  const me = (await call("GET", "/me", both.tokens.attorney)).body.me;
  assert(me.unread >= 1, "the bell still counts it");
  const list = (await call("GET", "/notifications", both.tokens.attorney)).body;
  assert(JSON.stringify(list).includes("Home test notice"), "the notification is still listed");
});

Deno.test("a widget that no longer exists is left out; reset returns to the default", async () => {
  await pool.query("update home_layouts set widgets = '[\"gone\", \"usage\", \"ask\"]' where person_id = $1 and side = 'attorney'", [both.id]);
  assertEquals((await call("GET", "/home/layout", both.tokens.attorney)).body.widgets, ["usage", "ask"]);
  await pool.query("update home_layouts set widgets = '[\"gone\"]' where person_id = $1 and side = 'attorney'", [both.id]);
  assertEquals((await call("GET", "/home/layout", both.tokens.attorney)).body.widgets, DEFAULT, "nothing left: the default, never an empty Home");
  const r = (await call("POST", "/home/layout/reset", both.tokens.attorney, {})).body;
  assertEquals([r.widgets, r.customized], [DEFAULT, false]);
  assertEquals((await call("GET", "/home/layout", both.tokens.freelancer)).body.widgets, ["usage"], "reset is for one side");
  assertEquals((await call("POST", "/home/layout/reset", both.tokens.attorney, {})).body.customized, false, "a second reset is harmless");
  assertEquals((await audits(both.id)).filter((x: Record<string, unknown>) => x.action === "home_layout_reset").length, 1);
});

Deno.test("teardown", async () => { await pool.end(); });

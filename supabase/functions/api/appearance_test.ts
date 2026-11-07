// UX review Phase 4 part D (docs/briefs/step-8a-phase-4.md): the Appearance choice through the real api and database. Off: DELA
// follows the device and nothing can be chosen. On: everyone starts on the setting appearance.default (light); each person's
// choice (device, light or dark) is kept for them only and comes back at sign-in and on /me.
//   deno test -A supabase/functions/api/appearance_test.ts
import { assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const fakeFetch = (async () => new Response("{}", { status: 404 })) as typeof fetch;
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: () => Promise.resolve(1), read: () => Promise.reject(new Error("missing")), remove: () => Promise.resolve(), put: () => Promise.resolve(),
};
const deps: Deps = { rpc, env: (k) => ({ DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: fakeFetch, storage };
async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(k: number, plan: string, name: string): Promise<M> {
  const bd = 8_970_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, name, `ap${bd}@test.invalid`])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
let att: M, fl: M;
const look = async (who: M) => (await call("GET", "/me", who.token)).body.me.appearance;
const set = async (who: M, mode: string) => (await call("POST", "/me/appearance", who.token, { mode })).body;

Deno.test("off: DELA follows the device and nothing can be chosen", async () => {
  await pool.query("update feature_switches set state = 'off' where key = 'appearance_choice'");
  att = await member(1, "att_pro", "Ana Appearance"); fl = await member(2, "fl_plus", "Finn Freelancer");
  assertEquals(await look(att), { on: false, mode: "device" });
  assertEquals((await set(att, "dark")).reason, "appearance_off");
});

Deno.test("on: everyone starts on Light; each person keeps their own choice", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key = 'appearance_choice'");
  assertEquals(await look(att), { on: true, mode: "light" }, "Stacey's answer 8: Light first");
  assertEquals(await set(att, "dark"), { ok: true, mode: "dark" });
  assertEquals((await look(att)).mode, "dark");
  assertEquals((await look(fl)).mode, "light", "one person's choice never changes another's");
  assertEquals((await set(fl, "device")).mode, "device");
  assertEquals((await set(att, "purple")).reason, "bad_request");
  assertEquals((await look(att)).mode, "dark", "a bad value changes nothing");
  await pool.query("update settings set value = '\"device\"' where key = 'appearance.default'");
  const other = await member(3, "att_free", "Ola Other");
  assertEquals((await look(other)).mode, "device", "the starting look comes from the setting");
  await pool.query("update settings set value = '\"light\"' where key = 'appearance.default'");
});

Deno.test("teardown", async () => {
  await pool.query("update feature_switches set state = 'off' where key = 'appearance_choice'");
  await pool.end();
});

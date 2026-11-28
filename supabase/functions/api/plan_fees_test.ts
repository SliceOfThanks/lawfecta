// Step 97a API tests (docs/briefs/step-97-fees-and-custom-plans.md): every plan shows the fee that is charged.
// The fee charged is the same on every plan (two settings). A plan version cannot be saved with another number, every
// approved version shows the charged fee, and the six-hour check notices a plan that drifts.
// Run after tools/dbtest.sh:   deno test -A supabase/functions/api/plan_fees_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { pool } from "../../../tests/lib/pg_rpc.ts";

const RUN = Date.now() % 1000000;
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
let owner = "";

Deno.test("setup", async () => {
  owner = (await one("insert into people (bd_member_id, display_name, email) values ($1, 'Fee Owner', $2) returning id", [8_600_000 + RUN, "fee" + RUN + "@test.invalid"])).id;
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'owner')", [owner]);
});

Deno.test("every approved plan shows the fee that is charged, on both sides", async () => {
  const rows = (await pool.query("select pl.code, pl.side, pv.fee_bps, dela_fee_charged(pl.side) charged from plans pl join plan_versions pv on pv.plan_code = pl.code and pv.status = 'approved' order by pl.code")).rows;
  assertEquals(rows.length, 8, "the eight standard plans");
  for (const r of rows) assertEquals([r.code, r.fee_bps], [r.code, r.charged], "the plan shows what is charged");
  assertEquals([(await one("select dela_fee_charged('attorney') f")).f, (await one("select dela_fee_charged('freelancer') f")).f], [500, 500]);
  // What a member is charged does not depend on their plan
  const p = (await one("insert into people (bd_member_id, display_name, email) values ($1, 'Fee Member', $2) returning id", [8_600_001 + RUN, "feem" + RUN + "@test.invalid"])).id;
  for (const plan of ["att_free", "att_business"]) {
    await pool.query("select dela_ensure_side($1, 'attorney', $2, 'staff_grant')", [p, plan]);
    await pool.query("update side_profiles set plan_code = $2 where person_id = $1 and side = 'attorney'", [p, plan]);
    assertEquals((await one("select dela_plan_fee_bps($1, 'attorney') f", [p])).f, 500, plan);
  }
});

Deno.test("a plan version cannot be saved with another fee; with the charged fee it can", async () => {
  const no = (await one("select dela_admin_plan_draft($1, 'att_pro', $2::jsonb) r", [owner, JSON.stringify({ fee_bps: 350, note: "lower" })])).r;
  assertEquals([no.ok, no.reason, no.fee_bps], [false, "standard_fee", 500]);
  assertEquals(Number((await one("select count(*) n from plan_versions where plan_code = 'att_pro' and status = 'draft'")).n), 0, "no draft was made");
  const yes = (await one("select dela_admin_plan_draft($1, 'att_pro', $2::jsonb) r", [owner, JSON.stringify({ fee_bps: 500, note: "same fee" })])).r;
  assertEquals(yes.ok, true, JSON.stringify(yes));
  // A draft that does not mention the fee keeps the plan's fee
  const keep = (await one("select dela_admin_plan_draft($1, 'att_pro', $2::jsonb) r", [owner, JSON.stringify({ note: "limits only" })])).r;
  assertEquals(keep.ok, true);
  assertEquals((await one("select fee_bps from plan_versions where id = $1", [keep.version_id])).fee_bps, 500);
  await pool.query("select dela_admin_plan_discard($1, $2)", [owner, keep.version_id]).catch(() => null);
  await pool.query("delete from plan_features where plan_version_id in (select id from plan_versions where plan_code = 'att_pro' and status = 'draft')");
  await pool.query("delete from plan_versions where plan_code = 'att_pro' and status = 'draft'");
});

Deno.test("the six-hour check notices a plan that shows another fee", async () => {
  const before = (await one("select dela_health_db() d")).d as Array<Record<string, any>>;
  assert(!before.some((i) => i.code === "fees_mismatch"), "nothing to report while every plan shows the charged fee");
  // The charged fee is changed in Settings while the plans still show the old one
  const was = (await one("select value from settings where key = 'fee.freelancer_bps'")).value;
  try {
    await pool.query("update settings set value = '450' where key = 'fee.freelancer_bps'");
    const after = (await one("select dela_health_db() d")).d as Array<Record<string, any>>;
    const hit = after.find((i) => i.code === "fees_mismatch");
    assert(hit && hit.title.startsWith("4 plans show"), JSON.stringify(after));
  } finally {
    await pool.query("update settings set value = $1::jsonb where key = 'fee.freelancer_bps'", [JSON.stringify(was)]);
  }
});

Deno.test("teardown", async () => {
  await pool.query("update staff_roles set revoked_at = now() where person_id = $1", [owner]);
  await pool.end();
});

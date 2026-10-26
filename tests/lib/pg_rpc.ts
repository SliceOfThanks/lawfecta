// Calls DELA database functions on a local Postgres the way supabase-js does:
// jsonb arguments go as JSON, set-returning functions come back as arrays. Test use only.
import pg from "npm:pg@8.13.1";

export const pool = new pg.Pool({
  host: Deno.env.get("PGHOST") ?? "127.0.0.1", port: Number(Deno.env.get("PGPORT") ?? 55432),
  user: Deno.env.get("PGUSER") ?? "postgres", database: Deno.env.get("PGDATABASE") ?? "dela_test", max: 4,
});

let setof: Set<string> | null = null;
let jsonbArgs: Set<string> | null = null;

export async function rpc(fn: string, args: Record<string, unknown>) {
  if (!setof || !jsonbArgs) {
    setof = new Set((await pool.query("select proname from pg_proc where proretset and proname like 'dela_%'")).rows.map((r: any) => r.proname));
    jsonbArgs = new Set((await pool.query(`select p.proname || '.' || a.name as k from pg_proc p,
      unnest(p.proargnames, p.proargtypes::oid[]) as a(name, t) where p.proname like 'dela_%' and a.t = 'jsonb'::regtype`)).rows.map((r: any) => r.k));
  }
  const keys = Object.keys(args);
  const vals = keys.map((k) => {
    const v = args[k];
    if (v === null || v === undefined) return null;
    return jsonbArgs!.has(fn + "." + k) || typeof v === "object" ? JSON.stringify(v) : v;
  });
  const call = `${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")})`;
  if (setof.has(fn)) return (await pool.query(`select to_jsonb(t) as r from ${call} t`, vals)).rows.map((r: any) => r.r);
  return (await pool.query(`select ${call} as r`, vals)).rows[0].r;
}

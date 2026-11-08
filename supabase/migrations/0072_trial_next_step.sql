-- Step 9: in Dry run, the trial log also says what would happen next for a member DELA would start tracking (the reminder
-- date and the move to Free), since a Dry run never saves the trial start in BD (Stacey's Trials check, 2026-11-08).
-- Additive: one column with a default, and the event function takes it when given.
alter table trial_events add column if not exists next_step text not null default '';

create or replace function dela_trial_event(p jsonb) returns void language sql as $$
  insert into trial_events (run_id, bd_user_id, name, plan_id, trial_ends_at, invoice_status, action, reason, mode, done, error, manual, next_step)
  values ((p->>'run_id')::uuid, (p->>'bd_user_id')::bigint, left(coalesce(p->>'name', ''), 120), nullif(p->>'plan_id', '')::int, nullif(p->>'trial_ends_at', '')::timestamptz,
    left(coalesce(p->>'invoice_status', ''), 20), left(p->>'action', 20), left(coalesce(p->>'reason', ''), 60), left(p->>'mode', 10), coalesce((p->>'done')::boolean, false),
    left(coalesce(p->>'error', ''), 300), left(coalesce(p->>'manual', ''), 400), left(coalesce(p->>'next_step', ''), 200))
$$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'dela_trial_event' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end $$;

-- Step 9: the Pro trial check connects to Brilliant Directories (Stacey's read-only BD check, 2026-11-08). BD has no API to
-- cancel an invoice or a subscription, so a downgrade records those as a task for the Lawfecta Team in BD admin
-- (Stacey's question 2): kept on the member, shown in the Trials tab and listed in the daily summary email. Additive.
alter table trial_members add column if not exists manual text not null default '';
alter table trial_events add column if not exists manual text not null default '';

create or replace function dela_trial_member(p_user bigint) returns jsonb language sql stable as $$
  select jsonb_build_object('steps', steps, 'reminded_at', reminded_at, 'hidden', hidden, 'from_plan', from_plan, 'manual', manual) from trial_members where bd_user_id = p_user
$$;

create or replace function dela_trial_member_save(p_user bigint, p jsonb) returns void language plpgsql as $$
begin
  insert into trial_members (bd_user_id) values (p_user) on conflict (bd_user_id) do nothing;
  update trial_members set
    name = coalesce(nullif(p->>'name', ''), name),
    from_plan = coalesce(nullif(p->>'from_plan', '')::int, from_plan),
    steps = coalesce(p->'steps', steps),
    reminded_at = coalesce(nullif(p->>'reminded_at', '')::timestamptz, reminded_at),
    downgraded_at = coalesce(nullif(p->>'downgraded_at', '')::timestamptz, downgraded_at),
    restored_at = coalesce(nullif(p->>'restored_at', '')::timestamptz, restored_at),
    hidden = coalesce(p->'hidden', hidden),
    manual = coalesce(nullif(p->>'manual', ''), manual),
    updated_at = now()
  where bd_user_id = p_user;
end $$;

create or replace function dela_trial_event(p jsonb) returns void language sql as $$
  insert into trial_events (run_id, bd_user_id, name, plan_id, trial_ends_at, invoice_status, action, reason, mode, done, error, manual)
  values ((p->>'run_id')::uuid, (p->>'bd_user_id')::bigint, left(coalesce(p->>'name', ''), 120), nullif(p->>'plan_id', '')::int, nullif(p->>'trial_ends_at', '')::timestamptz,
    left(coalesce(p->>'invoice_status', ''), 20), left(p->>'action', 20), left(coalesce(p->>'reason', ''), 60), left(p->>'mode', 10), coalesce((p->>'done')::boolean, false),
    left(coalesce(p->>'error', ''), 300), left(coalesce(p->>'manual', ''), 400))
$$;

-- The status value BD uses for "Active" on a member is not confirmed yet; until it is, the manual task says to check it
insert into settings (key, value, label, section, unit, status, source, note) values
  ('trial.bd_active_value', '""', 'BD member status value for Active (the trial check sets it after a downgrade)', 'Trials', 'BD "active" field value', 'O', 'Claude 2026-11-08', 'Empty: DELA does not change the status and the BD admin task says to check it is Active. Fill in once the value is confirmed in BD.')
on conflict (key) do nothing;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_trial_member', 'dela_trial_member_save', 'dela_trial_event') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end $$;

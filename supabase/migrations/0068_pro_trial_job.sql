-- Step 9: the Pro trial and the downgrade to Free (docs/briefs/step-9-pro-trial-downgrade.md, Stacey's answers 2026-11-07).
-- The daily trial check runs at 2:00 AM Pacific behind the switch bd_trial_downgrade (off until the BD endpoints are
-- confirmed and connected), in "Trial downgrade mode" Dry run until Stacey switches it to Live. Every run and every member
-- it would change is logged for the admin area. DELA's own "trials" switch is taken out of the plan logic (answer 5):
-- DELA allowances follow the member's BD plan only. Additive, except that one function stops reading the old switch.

insert into feature_switches (key, label, gate) values
  ('bd_trial_downgrade', 'The daily Pro trial check: downgrade unpaid trials to Free (BD)', 'Stacey''s read-only BD API check done, endpoints connected, then 3 clean dry-run days')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('trial.downgrade_mode', '"dry_run"', 'Trial downgrade mode', 'Trials', 'dry_run or live', 'C', 'Stacey 2026-11-07 (Pro trial answers)', 'Dry run lists who the daily job would downgrade or mark converted and changes nothing. Switch to Live in the admin area after 3 clean days on the test site (answer 6).'),
  ('trial.reminder_days', '2', 'Days before the trial ends to send "Your Pro trial ends in 2 days"', 'Trials', 'days', 'C', 'Developer notes 2026-11-06', ''),
  ('trial.run_hour', '2', 'Hour the daily trial check runs (Pacific)', 'Trials', 'hour (0 to 23)', 'C', 'Developer notes 2026-11-06', '2:00 AM Pacific.'),
  ('trial.free_areas', '3', 'Areas of law a Free member shows', 'Trials', 'areas', 'C', 'Developer notes 2026-11-06', 'Areas past the first 3 are hidden at the downgrade, never deleted.'),
  ('trial.bd_plans', '{"pro": 8, "free": 3, "plus": 7, "agency": 9, "trial": [7, 8], "never": [5, 10, 11, 12, 13, 14]}', 'BD plan IDs the trial job uses', 'Trials', 'BD plan IDs', 'C', 'Stacey 2026-11-07 (Pro trial answers)', 'Only members on 7 or 8 with dela_trial_status active are ever changed. Never changed, even with trial data: attorney plans 5, 12, 13, 14 and the lifetime plans 10, 11 (answer 1).'),
  ('trial.summary_to', '"stacey@lawfecta.com"', 'Who gets the daily downgrade summary email', 'Trials', 'email', 'C', 'Stacey 2026-11-07 (Pro trial answers)', 'One email on a day with at least one downgrade, listing each member''s name, user ID and trial end date. None on other days (answer 8).'),
  ('trial.allowances', '{"7": {"areas": null, "types": ["video", "promotion", "article"]}, "8": {"areas": null, "types": ["video", "promotion", "article"]}, "9": {"areas": null, "types": ["video", "promotion", "article"]}}', 'What comes back when a downgraded member upgrades', 'Trials', 'per BD plan: areas shown (null = all) and post types', 'R', 'Suggested by Claude 2026-11-08', 'Suggested: everything comes back on Plus, Pro and Agency Business. If Plus allows fewer areas of law or not every post type in BD, change Plus here.')
on conflict (key) do nothing;

-- Each run: when, how it started, the mode, how many members it checked, the counts per action, and any error
create table if not exists trial_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text not null check (trigger in ('daily', 'manual', 'login')),
  mode text not null check (mode in ('dry_run', 'live')),
  checked int not null default 0,
  counts jsonb not null default '{}',
  error text not null default '',
  summary_sent_at timestamptz
);
create index if not exists trial_runs_started on trial_runs (started_at desc);
alter table trial_runs enable row level security;

-- Each member a run would change or did change: never edited or deleted
create table if not exists trial_events (
  id bigserial primary key,
  run_id uuid not null references trial_runs(id),
  at timestamptz not null default now(),
  bd_user_id bigint not null,
  name text not null default '',
  plan_id int,
  trial_ends_at timestamptz,
  invoice_status text not null default '',
  action text not null,
  reason text not null default '',
  mode text not null,
  done boolean not null default false,
  error text not null default ''
);
create index if not exists trial_events_run on trial_events (run_id);
create index if not exists trial_events_member on trial_events (bd_user_id, at desc);
alter table trial_events enable row level security;
drop trigger if exists trial_events_append_only on trial_events;
create trigger trial_events_append_only before update or delete on trial_events for each row execute function dela_no_change();

-- What DELA keeps per member so the job is safe to run twice: finished steps, the reminder, and what it hid
create table if not exists trial_members (
  bd_user_id bigint primary key,
  name text not null default '',
  from_plan int,
  steps jsonb not null default '{}',
  reminded_at timestamptz,
  downgraded_at timestamptz,
  restored_at timestamptz,
  hidden jsonb not null default '{"posts": [], "areas": []}',
  updated_at timestamptz not null default now()
);
alter table trial_members enable row level security;

create or replace function dela_trial_settings() returns jsonb language sql stable as $$
  select jsonb_build_object('on', dela_switch_on('bd_trial_downgrade', null),
    'mode', dela_setting_text('trial.downgrade_mode', 'dry_run'),
    'days', dela_int_setting('trial.days', 7), 'reminder_days', dela_int_setting('trial.reminder_days', 2),
    'eligible_from', dela_setting_text('trial.eligible_from', ''), 'free_areas', dela_int_setting('trial.free_areas', 3),
    'plans', coalesce(dela_setting('trial.bd_plans'), '{"pro": 8, "free": 3, "plus": 7, "agency": 9, "trial": [7, 8], "never": [5, 10, 11, 12, 13, 14]}'),
    'allowances', coalesce(dela_setting('trial.allowances'), '{}'),
    'summary_to', dela_setting_text('trial.summary_to', ''),
    'site_url', dela_setting_text('site.url', ''), 'environment', dela_setting_text('environment', 'staging'),
    'sender', dela_setting_text('email.sender', 'log'), 'from_name', dela_setting_text('email.from_name', 'Lawfecta DELA'), 'from_address', dela_setting_text('email.from_address', ''))
$$;

create or replace function dela_trial_run_start(p_trigger text, p_mode text) returns uuid language sql as $$
  insert into trial_runs (trigger, mode) values (p_trigger, p_mode) returning id
$$;

create or replace function dela_trial_run_finish(p_run uuid, p_checked int, p_counts jsonb, p_error text) returns void language sql as $$
  update trial_runs set finished_at = now(), checked = p_checked, counts = coalesce(p_counts, '{}'), error = left(coalesce(p_error, ''), 300) where id = p_run
$$;

create or replace function dela_trial_event(p jsonb) returns void language sql as $$
  insert into trial_events (run_id, bd_user_id, name, plan_id, trial_ends_at, invoice_status, action, reason, mode, done, error)
  values ((p->>'run_id')::uuid, (p->>'bd_user_id')::bigint, left(coalesce(p->>'name', ''), 120), nullif(p->>'plan_id', '')::int, nullif(p->>'trial_ends_at', '')::timestamptz,
    left(coalesce(p->>'invoice_status', ''), 20), left(p->>'action', 20), left(coalesce(p->>'reason', ''), 60), left(p->>'mode', 10), coalesce((p->>'done')::boolean, false), left(coalesce(p->>'error', ''), 300))
$$;

create or replace function dela_trial_member(p_user bigint) returns jsonb language sql stable as $$
  select jsonb_build_object('steps', steps, 'reminded_at', reminded_at, 'hidden', hidden, 'from_plan', from_plan) from trial_members where bd_user_id = p_user
$$;

-- Merges the given fields into the member's record (steps and hidden are replaced as a whole by the caller)
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
    updated_at = now()
  where bd_user_id = p_user;
end $$;

-- Members the BD search may no longer find (signed up long ago): unfinished downgrades and downgraded members with hidden content
create or replace function dela_trial_followups() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(bd_user_id), '[]') from trial_members
  where (steps ? 'plan' and not steps ? 'email') or jsonb_array_length(coalesce(hidden->'posts', '[]')) + jsonb_array_length(coalesce(hidden->'areas', '[]')) > 0
$$;

-- The summary email goes once per run, and only when that run downgraded at least one member (answer 8)
create or replace function dela_trial_summary_mark(p_run uuid) returns boolean language sql as $$
  with u as (update trial_runs set summary_sent_at = now() where id = p_run and summary_sent_at is null returning 1) select exists (select 1 from u)
$$;

-- The admin area: the mode, the switch, the last 30 runs and the members of the latest 3 runs
create or replace function dela_admin_trial(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['support', 'finance', 'reviewer']);
  return jsonb_build_object('ok', true, 'settings', dela_trial_settings() - 'summary_to' - 'from_address' - 'sender',
    'runs', (select coalesce(jsonb_agg(to_jsonb(r) order by r.started_at desc), '[]') from (select * from trial_runs order by started_at desc limit 30) r),
    'events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.at desc), '[]') from trial_events e
      where e.run_id in (select id from trial_runs order by started_at desc limit 3)));
end $$;

-- 2:00 AM Pacific (trial.run_hour), once a day, only while the switch is on
create or replace function dela_maybe_queue_trial() returns void language plpgsql as $$
declare v_local timestamp := now() at time zone dela_tz();
begin
  if dela_switch_on('bd_trial_downgrade', null) and extract(hour from v_local) >= dela_int_setting('trial.run_hour', 2) then
    perform dela_job_enqueue('trial_daily', '{}', now(), 'trial_daily:' || v_local::date, null);
  end if;
end $$;

-- Answer 5: one trial, in BD. DELA's allowances follow the member's BD plan only, whatever the old "trials" switch says.
create or replace function dela_effective_version(p_person uuid, p_side text) returns bigint language plpgsql stable as $$
declare v_code text; v_id bigint;
begin
  select sp.plan_code into v_code from side_profiles sp
  where sp.person_id = p_person and sp.side = p_side and sp.status <> 'closed';
  if v_code is null then return null; end if;
  select id into v_id from plan_versions where plan_code = v_code and status = 'approved';
  return v_id;
end $$;
update feature_switches set state = 'off' where key = 'trials';
update feature_switches set label = 'Old DELA-only trial (replaced by the BD Pro trial; no longer used by plan logic)' where key = 'trials';

do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_trial_settings', 'dela_trial_run_start', 'dela_trial_run_finish', 'dela_trial_event', 'dela_trial_member',
      'dela_trial_member_save', 'dela_trial_followups', 'dela_trial_summary_mark', 'dela_admin_trial', 'dela_maybe_queue_trial', 'dela_effective_version') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end $$;

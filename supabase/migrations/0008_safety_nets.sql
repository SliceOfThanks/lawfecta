-- Safety nets (Stacey, 2026-10-26: "include all recommendations").
-- 1. Going back checks the older version still works with today's database.
-- 2. Undo for settings, and restore an earlier plan version (password for plans).
-- 3. Emergency pause: all of DELA or one area, without a push.
-- 4. A version can only be offered with passing tests and plain release notes.
-- 5. Heartbeat, daily summary and reminders (restore drill every quarter, secret change every year).
-- 6. Reset Staging test data.

-- ---------- 1. Releases: tests, notes, compatibility ----------

alter table releases add column if not exists tests_url text not null default '';
-- Database changes in this version that older versions cannot work with (rare; the "contract" step of a change)
alter table releases add column if not exists contract_migrations text[] not null default '{}';

-- Replaces the version from 0007: notes and a passing test run are required
create or replace function dela_release_record(p_version text, p_commit text, p_api_version text, p_migrations text[], p_notes text, p_tests_url text default '', p_contract text[] default '{}')
returns bigint language plpgsql as $$
declare v bigint;
begin
  if length(trim(coalesce(p_notes, ''))) < 20 then raise exception 'release_notes_required'; end if;
  if coalesce(p_tests_url, '') not like 'https://github.com/%/actions/runs/%' then raise exception 'passing_tests_required'; end if;
  insert into releases (version, commit_sha, api_version, migrations, notes, tests_url, contract_migrations)
  values (p_version, lower(p_commit), coalesce(p_api_version, ''), coalesce(p_migrations, '{}'), trim(p_notes), p_tests_url, coalesce(p_contract, '{}'))
  returning id into v;
  perform dela_audit('system', null, 'release_recorded', 'release', v::text, jsonb_build_object('version', p_version, 'commit', p_commit));
  return v;
end $$;
drop function if exists dela_release_record(text, text, text, text[], text);

-- Can Live go back to this version? Not if a newer version made a change it cannot work with.
create or replace function dela_release_compatible(p_release bigint) returns jsonb language sql stable as $$
  with t as (select * from releases where id = p_release),
  blockers as (
    select distinct m from releases r, t, unnest(r.contract_migrations) m
    where r.id <> t.id and r.status in ('live', 'replaced', 'rolled_back') and r.created_at > t.created_at and not (m = any(t.migrations)))
  select jsonb_build_object('ok', not exists (select 1 from blockers), 'blocking', coalesce((select jsonb_agg(m) from blockers), '[]'))
$$;

create or replace function dela_release_json(r releases) returns jsonb language sql stable as $$
  select jsonb_build_object('id', r.id, 'version', r.version, 'commit', r.commit_sha, 'api_version', r.api_version, 'migrations', to_jsonb(r.migrations),
    'notes', r.notes, 'status', r.status, 'tested_at', r.tested_at, 'approved_at', r.approved_at, 'live_at', r.live_at, 'created_at', r.created_at,
    'tested_by', (select display_name from people where id = r.tested_by), 'approved_by', (select display_name from people where id = r.approved_by),
    'deploy_log', right(r.deploy_log, 2000), 'test_report', left(r.test_report, 20000), 'tests_url', r.tests_url,
    'compatible', case when r.status in ('replaced', 'rolled_back') then dela_release_compatible(r.id) end)
$$;

-- Password check shared by pushes and protected undo actions. Five wrong tries lock for 30 minutes.
create or replace function dela_release_check_password(p_actor uuid, p_password text, p_what text) returns text language plpgsql
set search_path = public, extensions as $$
declare rp release_password;
begin
  select * into rp from release_password where id = 1 for update;
  if rp.id is null then return 'no_password'; end if;
  if rp.locked_until > now() then return 'locked'; end if;
  if p_password is null or crypt(p_password, rp.hash) <> rp.hash then
    perform dela_release_failed_attempt(p_actor, p_what);
    return 'wrong_password';
  end if;
  update release_password set failed_attempts = 0 where id = 1;
  return 'ok';
end $$;

-- Wraps the 0007 approval so going back refuses an incompatible version before the password is used
create or replace function dela_release_approve_checked(p_actor uuid, p_release bigint, p_action text, p_password text) returns jsonb language plpgsql as $$
declare c jsonb;
begin
  perform dela_require_staff(p_actor, '{}');
  if p_action = 'rollback' then
    c := dela_release_compatible(p_release);
    if not (c->>'ok')::boolean then return jsonb_build_object('ok', false, 'reason', 'not_compatible', 'blocking', c->'blocking'); end if;
  end if;
  return dela_release_approve(p_actor, p_release, p_action, p_password);
end $$;

-- ---------- 2. Undo ----------

create or replace function dela_admin_setting_history(p_actor uuid, p_key text) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'old_value', h.old_value, 'new_value', h.new_value, 'old_status', h.old_status, 'new_status', h.new_status,
            'changed_at', h.changed_at, 'by', p.display_name, 'reason', h.reason) order by h.id desc), '[]')
          from settings_history h left join people p on p.id = h.changed_by where h.key = p_key);
end $$;

-- Puts a setting back to the value it had before one change. Saved as a new change, so nothing is lost.
create or replace function dela_admin_undo_setting(p_actor uuid, p_history bigint) returns jsonb language plpgsql as $$
declare h settings_history;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into h from settings_history where id = p_history;
  if h.id is null or h.old_value is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return dela_admin_set_setting(p_actor, h.key, h.old_value, coalesce(h.old_status, 'O'), 'Undo of change ' || h.id);
end $$;

create or replace function dela_admin_plan_history(p_actor uuid, p_plan text) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return (select coalesce(jsonb_agg(dela_plan_json(id) || jsonb_build_object('effective_from', effective_from) order by version desc), '[]')
          from plan_versions where plan_code = p_plan and status in ('approved', 'retired'));
end $$;

-- Brings back an earlier plan version as a new version (prices and limits copied). Needs the release password.
create or replace function dela_admin_plan_restore(p_actor uuid, p_version bigint, p_password text) returns jsonb language plpgsql as $$
declare v plan_versions; chk text; d jsonb; feats jsonb;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into v from plan_versions where id = p_version and status = 'retired';
  if v.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  chk := dela_release_check_password(p_actor, p_password, 'plan_restore');
  if chk <> 'ok' then return jsonb_build_object('ok', false, 'reason', chk); end if;
  select coalesce(jsonb_object_agg(feature_key, jsonb_build_object('enabled', enabled, 'limit', quota_limit)), '{}') into feats from plan_features where plan_version_id = v.id;
  d := dela_admin_plan_draft(p_actor, v.plan_code, jsonb_build_object('monthly_cents', v.monthly_cents, 'annual_cents', v.annual_cents, 'fee_bps', v.fee_bps,
         'note', 'Restored from version ' || v.version, 'features', feats));
  perform dela_admin_plan_approve(p_actor, (d->>'version_id')::bigint);
  perform dela_audit('staff', p_actor, 'plan_restored', 'plan', v.plan_code, jsonb_build_object('from_version', v.version));
  return jsonb_build_object('ok', true, 'version', d->'version');
end $$;

-- ---------- 3. Emergency pause ----------

insert into settings (key, value, label, section, status, source, note) values
  ('emergency.pause', '{"all": false, "ai": false, "checkout": false, "payouts": false, "renewals": false, "external": false, "email": false}',
   'Emergency pause', 'Emergency', 'C', 'Program Guide 1A section 29', 'Changed from the Emergency card in the admin area, not here.'),
  ('emergency.message', '"DELA is paused for a short check. Your work is safe. Please try again soon."', 'Message members see while DELA is paused', 'Emergency', 'C', 'Setup', ''),
  ('worker.last_run', '"1970-01-01T00:00:00Z"', 'Last time the background worker ran', 'System', 'C', 'Setup', 'Written by the worker every minute.'),
  ('reminders.next_restore_test', '"2027-01-15"', 'Next backup restore drill on Staging', 'System', 'C', 'Stacey 2026-10-26', 'Every three months.'),
  ('reminders.next_secret_change', '"2027-10-26"', 'Next yearly change of secrets and tokens', 'System', 'C', 'Stacey 2026-10-26', 'Every year.')
on conflict (key) do nothing;

create or replace function dela_paused(p_area text) returns boolean language sql stable as $$
  select coalesce((dela_setting('emergency.pause') ->> 'all')::boolean, false) or coalesce((dela_setting('emergency.pause') ->> p_area)::boolean, false)
$$;

-- Owner turns a pause on or off. Kept out of the normal settings editor so it is one clear action.
create or replace function dela_admin_set_pause(p_actor uuid, p_area text, p_on boolean, p_reason text) returns jsonb language plpgsql as $$
declare cur jsonb; o record;
begin
  perform dela_require_staff(p_actor, '{}');
  cur := dela_setting('emergency.pause');
  if p_area is null or not (cur ? p_area) then return jsonb_build_object('ok', false, 'reason', 'bad_area'); end if;
  insert into settings_history (key, old_value, new_value, old_status, new_status, changed_by, reason)
  values ('emergency.pause', cur, jsonb_set(cur, array[p_area], to_jsonb(p_on)), 'C', 'C', p_actor, left(coalesce(p_reason, ''), 500));
  update settings set value = jsonb_set(cur, array[p_area], to_jsonb(p_on)), version = version + 1, updated_by = p_actor, updated_at = now() where key = 'emergency.pause';
  perform dela_audit('staff', p_actor, case when p_on then 'pause_on' else 'pause_off' end, 'emergency', p_area, jsonb_build_object('reason', p_reason));
  for o in select person_id from staff_roles where role = 'owner' and revoked_at is null loop
    perform dela_notify(jsonb_build_object('person_id', o.person_id, 'kind', 'security', 'essential', true, 'email', true,
      'title', 'DELA ' || case when p_area = 'all' then 'is' else p_area || ' is' end || case when p_on then ' paused' else ' running again' end,
      'body', coalesce(nullif(p_reason, ''), 'Changed in the admin area.'),
      'dedupe_key', 'pause:' || p_area || ':' || p_on || ':' || o.person_id || ':' || extract(epoch from now())::bigint));
  end loop;
  return jsonb_build_object('ok', true, 'pause', dela_setting('emergency.pause'));
end $$;

-- Sessions report the pause so the app can show the message; staff keep working to fix things
create or replace function dela_pause_state() returns jsonb language sql stable as $$
  select jsonb_build_object('pause', dela_setting('emergency.pause'), 'message', dela_setting_text('emergency.message', ''))
$$;

-- ---------- 5. Heartbeat, health, daily summary, reminders ----------

create or replace function dela_worker_beat() returns void language sql as $$
  update settings set value = to_jsonb(to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')), updated_at = now() where key = 'worker.last_run'
$$;

create or replace function dela_health() returns jsonb language sql stable as $$
  select jsonb_build_object(
    'environment', dela_setting_text('environment', 'staging'),
    'code_version', dela_setting_text('code_version', ''),
    'worker_ok', (dela_setting_text('worker.last_run', '1970-01-01T00:00:00Z'))::timestamptz > now() - interval '10 minutes',
    'paused', coalesce((dela_setting('emergency.pause') ->> 'all')::boolean, false))
$$;

-- Once a day: a short summary for owners, and the quarterly and yearly reminders when they are due
create or replace function dela_daily_summary() returns jsonb language plpgsql as $$
declare d date := (now() at time zone dela_tz())::date; o record; body text; due_restore boolean; due_secret boolean;
begin
  body := format('Last 24 hours: %s sign ins, %s turned away, %s background jobs failed for good, %s active holds.',
    (select count(*) from audit_log where action = 'sign_in' and at > now() - interval '1 day'),
    (select count(*) from audit_log where action = 'access_denied' and at > now() - interval '1 day'),
    (select count(*) from jobs where status = 'dead' and updated_at > now() - interval '1 day'),
    (select count(*) from holds where state = 'active'));
  if dela_paused('all') then body := body || ' DELA is paused.'; end if;
  due_restore := d >= dela_setting_text('reminders.next_restore_test', '2999-01-01')::date;
  due_secret := d >= dela_setting_text('reminders.next_secret_change', '2999-01-01')::date;
  if due_restore then
    body := body || ' Reminder: it is time for the quarterly backup restore drill on Staging (see the runbook).';
    update settings set value = to_jsonb(to_char(d + interval '3 months', 'YYYY-MM-DD')) where key = 'reminders.next_restore_test';
  end if;
  if due_secret then
    body := body || ' Reminder: it is time for the yearly change of secrets and tokens (see the runbook).';
    update settings set value = to_jsonb(to_char(d + interval '1 year', 'YYYY-MM-DD')) where key = 'reminders.next_secret_change';
  end if;
  for o in select person_id from staff_roles where role = 'owner' and revoked_at is null loop
    perform dela_notify(jsonb_build_object('person_id', o.person_id, 'kind', 'daily_summary', 'essential', due_restore or due_secret,
      'email', true, 'title', 'DELA daily summary (' || dela_setting_text('environment', 'staging') || ')', 'body', body,
      'dedupe_key', 'daily:' || d || ':' || o.person_id));
  end loop;
  return jsonb_build_object('ok', true, 'body', body);
end $$;

-- ---------- 6. Reset Staging test data ----------

-- Clears activity on Staging (allowances used, notices, jobs, sessions, holds). Keeps people, the team,
-- the access list, settings, plans and releases. Refused on Live.
create or replace function dela_admin_reset_staging(p_actor uuid) returns jsonb language plpgsql as $$
begin
  perform dela_require_staff(p_actor, '{}');
  if dela_setting_text('environment', 'staging') <> 'staging' then return jsonb_build_object('ok', false, 'reason', 'staging_only'); end if;
  delete from quota_reservations;
  delete from quota_usage;
  delete from notifications;
  delete from jobs;
  delete from holds;
  update sessions set revoked_at = now() where revoked_at is null and person_id <> p_actor;
  update people set trial_started_at = null, trial_ends_at = null;
  perform dela_audit('staff', p_actor, 'staging_reset', 'environment', 'staging', '{}');
  return jsonb_build_object('ok', true);
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'dela_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- A job that cannot run right now (for example, email is paused) waits without using up its tries
create or replace function dela_job_postpone(p_job uuid, p_seconds int) returns void language sql as $$
  update jobs set status = 'delayed', attempts = greatest(attempts - 1, 0), lease_until = null, updated_at = now(),
    run_at = now() + make_interval(secs => greatest(p_seconds, 30)) where id = p_job and status = 'running'
$$;

-- Queues the daily summary once a day, from 8 in the morning Lawfecta time
create or replace function dela_maybe_queue_daily() returns void language plpgsql as $$
declare local timestamp := now() at time zone dela_tz();
begin
  if extract(hour from local) >= 8 then
    perform dela_job_enqueue('daily_summary', '{}', now(), 'daily:' || local::date);
  end if;
end $$;

revoke all on function dela_job_postpone(uuid, int) from public, anon, authenticated;
grant execute on function dela_job_postpone(uuid, int) to service_role;
revoke all on function dela_maybe_queue_daily() from public, anon, authenticated;
grant execute on function dela_maybe_queue_daily() to service_role;

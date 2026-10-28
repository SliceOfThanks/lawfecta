-- Release Control dashboard (Stacey, 2026-10-27).
-- She chose: the dashboard is the first tab of the Staging admin area; a 6 digit code is sent to her before each push
-- or go back; a push needs the ChatGPT test report; Live is watched for 15 minutes after a push and goes back by itself
-- if it becomes unhealthy; alerts go by email and text message.
-- Everything here is added next to 0007 and 0008. Older code keeps working with it.

-- ---------- Release records: progress steps, the watch after a push, the version it replaced ----------

alter table releases add column if not exists action text not null default '';
alter table releases add column if not exists steps jsonb not null default '[]';
alter table releases add column if not exists previous_release_id bigint references releases(id);
alter table releases add column if not exists watch_until timestamptz;
alter table releases add column if not exists watch_result text not null default '';
alter table releases add column if not exists watch_checks int not null default 0;
alter table releases add column if not exists watch_fails int not null default 0;

-- One-use codes sent to the owner before a push or go back. Only a hash is kept.
create table if not exists release_codes (
  id bigserial primary key,
  release_id bigint not null references releases(id),
  action text not null check (action in ('push', 'rollback')),
  code_hash text not null,
  requested_by uuid not null references people(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts int not null default 0
);
alter table release_codes enable row level security;
revoke all on release_codes from anon, authenticated;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('release.email_code', 'true', 'Send a 6 digit code before each push or go back', 'Releases', '', 'C', 'Stacey 2026-10-27',
   'Sent by email, and by text message when text alerts are set up. Until email or text sending works, the password alone is used and the dashboard says so.'),
  ('release.require_report', 'true', 'A push needs the ChatGPT test report saved', 'Releases', '', 'C', 'Stacey 2026-10-27', ''),
  ('release.watch_minutes', '15', 'Minutes Live is watched after a push', 'Releases', 'minutes', 'C', 'Stacey 2026-10-27',
   'If Live is unhealthy for 3 checks in a row during this time, it goes back to the version it had. 0 turns the watch off.'),
  ('alerts.sms', 'true', 'Also send alerts by text message', 'Alerts', '', 'C', 'Stacey 2026-10-27',
   'Needs the phone number below and the Brevo key (BREVO_API_KEY) with text credits. Until then alerts go by email only.'),
  ('alerts.sms_to', '""', 'Phone number for text alerts, with country code (for example +1 then the number)', 'Alerts', '', 'O', 'Stacey 2026-10-27', ''),
  ('alerts.sms_sender', '"Lawfecta"', 'Name text messages come from (up to 11 letters)', 'Alerts', '', 'C', 'Setup', ''),
  ('live.project_ref', '""', 'Live project ID (the 20 letters in its Supabase address)', 'Releases', '', 'O', 'Setup',
   'Staging checks Live every minute once this is filled in. Filled in by the first push if empty.'),
  ('live.status', '{}', 'Last check of Live from Staging', 'System', '', 'C', 'Setup', 'Written by the worker every minute.'),
  ('release.setup', '{"github_env": false, "uptime": false}', 'Live setup steps you ticked', 'System', '', 'C', 'Setup', 'Ticked on the Release Control tab.')
on conflict (key) do nothing;

-- ---------- Alerts: email to every owner, and a text message when it is set up ----------

create or replace function dela_alert(p_kind text, p_title text, p_body text, p_key text) returns void language plpgsql as $$
declare o record; v_to text := dela_setting_text('alerts.sms_to', '');
begin
  for o in select person_id from staff_roles where role = 'owner' and revoked_at is null loop
    perform dela_notify(jsonb_build_object('person_id', o.person_id, 'kind', p_kind, 'essential', true, 'email', true,
      'title', p_title, 'body', p_body, 'dedupe_key', p_key || ':' || o.person_id));
  end loop;
  if dela_setting_text('alerts.sms', 'false') = 'true' and v_to <> '' then
    perform dela_job_enqueue('send_sms', jsonb_build_object('to', v_to,
      'text', left('DELA ' || dela_setting_text('environment', 'staging') || ': ' || p_title || '. ' || p_body, 320)), now(), 'sms:' || p_key);
  end if;
end $$;

-- Replaces 0007: the lock alert also goes by text message
create or replace function dela_release_failed_attempt(p_actor uuid, p_what text) returns void language plpgsql as $$
declare n int;
begin
  update release_password set failed_attempts = failed_attempts + 1,
    locked_until = case when failed_attempts + 1 >= 5 then now() + interval '30 minutes' else locked_until end
  where id = 1 returning failed_attempts into n;
  perform dela_audit('staff', p_actor, 'release_password_wrong', 'release_password', '1', jsonb_build_object('what', p_what, 'attempts', n));
  if n >= 5 then
    update release_password set failed_attempts = 0 where id = 1;
    perform dela_alert('security', 'Release password locked',
      'Someone entered a wrong release password or code five times. Pushing to Live is locked for 30 minutes.',
      'release-lock:' || extract(epoch from now())::bigint);
  end if;
end $$;

-- ---------- Health summary of this copy (Staging or Live) ----------

create or replace function dela_env_summary() returns jsonb language sql stable as $$
  select jsonb_build_object(
    'environment', dela_setting_text('environment', 'staging'),
    'code_version', dela_setting_text('code_version', ''),
    'worker_last_run', dela_setting_text('worker.last_run', ''),
    'worker_ok', (dela_health() ->> 'worker_ok')::boolean,
    'problems_24h', (select count(*) from jobs where status = 'dead' and updated_at > now() - interval '1 day')
                  + (select count(*) from notifications where status = 'failed' and created_at > now() - interval '1 day'),
    'turned_away_24h', (select count(*) from audit_log where action = 'access_denied' and at > now() - interval '1 day'),
    'paused', (select coalesce(jsonb_agg(key order by key), '[]') from jsonb_each(coalesce(dela_setting('emergency.pause'), '{}')) where value = 'true'::jsonb),
    'checked_at', now())
$$;

-- Staging's worker saves what Live answered each minute. 3 bad answers in a row (once Live has been healthy) alert the owners.
create or replace function dela_live_status_save(p jsonb) returns jsonb language plpgsql as $$
declare cur jsonb := coalesce(dela_setting('live.status'), '{}'); ok boolean := coalesce((p->>'ok')::boolean, false);
  fails int; ever boolean; was_down boolean; now_down boolean; nxt jsonb;
begin
  fails := case when ok then 0 else coalesce((cur->>'fails')::int, 0) + 1 end;
  ever := coalesce((cur->>'ever_ok')::boolean, false) or ok;
  was_down := coalesce((cur->>'down')::boolean, false);
  now_down := case when ok then false when fails >= 3 and ever then true else was_down end;
  nxt := coalesce(p->'summary', '{}') || jsonb_build_object('ok', ok, 'answered', coalesce((p->>'answered')::boolean, false),
    'error', left(coalesce(p->>'error', ''), 300), 'fails', fails, 'ever_ok', ever, 'down', now_down, 'checked_at', now());
  update settings set value = nxt, updated_at = now() where key = 'live.status';
  if now_down and not was_down then
    perform dela_audit('system', null, 'live_down', 'environment', 'live', jsonb_build_object('error', p->>'error'));
    perform dela_alert('live_health', 'Live is not healthy', 'Staging has not had a healthy answer from Live for 3 minutes. ' || coalesce(p->>'error', ''),
      'live-down:' || extract(epoch from now())::bigint);
  elsif was_down and ok then
    perform dela_audit('system', null, 'live_up', 'environment', 'live', '{}');
    perform dela_alert('live_health', 'Live is healthy again', 'Live is answering normally.', 'live-up:' || extract(epoch from now())::bigint);
  end if;
  return nxt;
end $$;

-- ---------- Checks before a push or go back ----------

create or replace function dela_release_precheck(p_release bigint, p_action text) returns text language plpgsql stable as $$
declare r releases;
begin
  select * into r from releases where id = p_release;
  if r.id is null then return 'not_found'; end if;
  if p_action not in ('push', 'rollback') then return 'bad_action'; end if;
  if exists (select 1 from releases where status in ('approved', 'deploying')) then return 'push_in_progress'; end if;
  if p_action = 'push' then
    -- Going back stays possible while Live is watched; a new push waits until the watch ends
    if exists (select 1 from releases where watch_until > now() and watch_result = '') then return 'watch_in_progress'; end if;
    if r.status <> 'tested' then return 'not_tested'; end if;
    if dela_setting_text('release.require_report', 'true') = 'true' and trim(r.test_report) = '' then return 'report_missing'; end if;
  else
    if r.status not in ('replaced', 'rolled_back') then return 'not_rollback_target'; end if;
    if not (dela_release_compatible(r.id) ->> 'ok')::boolean then return 'not_compatible'; end if;
  end if;
  return 'ok';
end $$;

-- How the code can reach the owner. p_sms_ready: the api has the Brevo key.
create or replace function dela_release_code_channels(p_sms_ready boolean) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'required', dela_setting_text('release.email_code', 'true') = 'true',
    'email', dela_setting_text('email.sender', 'log') <> 'log',
    'sms', coalesce(p_sms_ready, false) and dela_setting_text('alerts.sms', 'false') = 'true' and dela_setting_text('alerts.sms_to', '') <> '')
$$;

create or replace function dela_mask_email(p text) returns text language sql immutable as $$
  select case when coalesce(p, '') like '%@%' then left(p, 1) || '***' || substr(p, strpos(p, '@')) else '' end
$$;

create or replace function dela_mask_phone(p text) returns text language sql immutable as $$
  select case when length(coalesce(p, '')) >= 4 then '***' || right(p, 4) else '' end
$$;

-- Step 1 of a push or go back: checks the password, then sends a one-use code that lasts 10 minutes
create or replace function dela_release_code_request(p_actor uuid, p_release bigint, p_action text, p_password text, p_sms_ready boolean) returns jsonb language plpgsql
set search_path = public, extensions, pg_temp as $$
declare ch jsonb := dela_release_code_channels(p_sms_ready); pre text; chk text; v_code text; v_id bigint; n int;
begin
  perform dela_require_staff(p_actor, '{}');
  if dela_setting_text('environment', 'staging') <> 'staging' then return jsonb_build_object('ok', false, 'reason', 'staging_only'); end if;
  pre := dela_release_precheck(p_release, p_action);
  if pre <> 'ok' then return jsonb_build_object('ok', false, 'reason', pre); end if;
  if not (ch->>'required')::boolean or not ((ch->>'email')::boolean or (ch->>'sms')::boolean) then
    return jsonb_build_object('ok', true, 'code_needed', false, 'waiting_setup', (ch->>'required')::boolean);
  end if;
  select count(*) into n from release_codes where requested_by = p_actor and created_at > now() - interval '30 minutes';
  if n >= 5 then return jsonb_build_object('ok', false, 'reason', 'too_many_codes'); end if;
  chk := dela_release_check_password(p_actor, p_password, 'code_' || p_action);
  if chk <> 'ok' then return jsonb_build_object('ok', false, 'reason', chk); end if;

  update release_codes set expires_at = least(expires_at, now()) where release_id = p_release and used_at is null;
  v_code := lpad(((('x' || encode(gen_random_bytes(3), 'hex'))::bit(24)::int) % 1000000)::text, 6, '0');
  insert into release_codes (release_id, action, code_hash, requested_by, expires_at)
  values (p_release, p_action, encode(digest(p_release || ':' || p_action || ':' || v_code, 'sha256'), 'hex'), p_actor, now() + interval '10 minutes')
  returning id into v_id;
  -- The code rides in the job only until it is sent; the worker then wipes it
  perform dela_job_enqueue('send_code', jsonb_build_object('code_id', v_id, 'code', v_code, 'email', ch->'email', 'sms', ch->'sms'), now(), 'code:' || v_id, p_actor);
  perform dela_audit('staff', p_actor, 'release_code_sent', 'release', p_release::text, jsonb_build_object('action', p_action));
  return jsonb_build_object('ok', true, 'code_needed', true, 'minutes', 10,
    'email', case when (ch->>'email')::boolean then dela_mask_email((select email from people where id = p_actor)) end,
    'sms', case when (ch->>'sms')::boolean then dela_mask_phone(dela_setting_text('alerts.sms_to', '')) end);
end $$;

-- Step 2: the code (when one is needed) and the password again, then the one-use approval from 0007
create or replace function dela_release_approve_coded(p_actor uuid, p_release bigint, p_action text, p_password text, p_code text, p_sms_ready boolean) returns jsonb language plpgsql
set search_path = public, extensions, pg_temp as $$
declare ch jsonb := dela_release_code_channels(p_sms_ready); pre text; c release_codes; r jsonb; needed boolean;
begin
  perform dela_require_staff(p_actor, '{}');
  pre := dela_release_precheck(p_release, p_action);
  if pre <> 'ok' then return jsonb_build_object('ok', false, 'reason', pre); end if;
  needed := (ch->>'required')::boolean and ((ch->>'email')::boolean or (ch->>'sms')::boolean);
  if needed then
    if exists (select 1 from release_password where locked_until > now()) then return jsonb_build_object('ok', false, 'reason', 'locked'); end if;
    select * into c from release_codes where release_id = p_release and action = p_action and requested_by = p_actor
      and used_at is null and expires_at > now() order by id desc limit 1 for update;
    if c.id is null then return jsonb_build_object('ok', false, 'reason', 'code_needed'); end if;
    if c.attempts >= 5 then return jsonb_build_object('ok', false, 'reason', 'code_locked'); end if;
    if coalesce(trim(p_code), '') = '' or encode(digest(p_release || ':' || p_action || ':' || trim(p_code), 'sha256'), 'hex') <> c.code_hash then
      update release_codes set attempts = attempts + 1 where id = c.id;
      perform dela_release_failed_attempt(p_actor, 'code');
      return jsonb_build_object('ok', false, 'reason', 'wrong_code');
    end if;
  end if;
  r := dela_release_approve_checked(p_actor, p_release, p_action, p_password);
  if needed and coalesce((r->>'ok')::boolean, false) then update release_codes set used_at = now() where id = c.id; end if;
  return r || jsonb_build_object('code_used', needed, 'waiting_setup', (ch->>'required')::boolean and not needed);
end $$;

-- What the worker needs to send a code. Nothing once the code is used or expired.
create or replace function dela_code_target(p_code bigint) returns jsonb language sql stable as $$
  select jsonb_build_object('to_email', p.email, 'to_name', p.display_name, 'action', c.action, 'version', r.version,
    'from_name', dela_setting_text('email.from_name', 'Lawfecta DELA'), 'from_address', dela_setting_text('email.from_address', ''),
    'sender', dela_setting_text('email.sender', 'log'), 'environment', dela_setting_text('environment', 'staging'),
    'sms_to', dela_setting_text('alerts.sms_to', ''), 'sms_sender', dela_setting_text('alerts.sms_sender', 'Lawfecta'))
  from release_codes c join people p on p.id = c.requested_by join releases r on r.id = c.release_id
  where c.id = p_code and c.used_at is null and c.expires_at > now()
$$;

create or replace function dela_job_scrub(p_job uuid) returns void language sql as $$
  update jobs set payload = jsonb_build_object('scrubbed', true) where id = p_job
$$;

-- ---------- Progress while GitHub pushes, and the watch afterwards ----------

create or replace function dela_release_json(r releases) returns jsonb language sql stable as $$
  select jsonb_build_object('id', r.id, 'version', r.version, 'commit', r.commit_sha, 'api_version', r.api_version, 'migrations', to_jsonb(r.migrations),
    'notes', r.notes, 'status', r.status, 'tested_at', r.tested_at, 'approved_at', r.approved_at, 'live_at', r.live_at, 'created_at', r.created_at,
    'tested_by', (select display_name from people where id = r.tested_by), 'approved_by', (select display_name from people where id = r.approved_by),
    'deploy_log', right(r.deploy_log, 4000), 'test_report', left(r.test_report, 20000), 'tests_url', r.tests_url,
    'contract_migrations', to_jsonb(r.contract_migrations), 'action', r.action, 'steps', r.steps,
    'previous_version', (select version from releases x where x.id = r.previous_release_id),
    'watch_until', r.watch_until, 'watch_result', r.watch_result, 'watch_checks', r.watch_checks, 'watch_fails', r.watch_fails,
    'watching', r.watch_until > now() and r.watch_result = '',
    'compatible', case when r.status in ('replaced', 'rolled_back') then dela_release_compatible(r.id) end)
$$;

-- Replaces 0007: also notes which action is running, clears old steps and tells GitHub how long to watch
create or replace function dela_release_claim(p_release bigint, p_nonce text) returns jsonb language plpgsql
set search_path = public, extensions, pg_temp as $$
declare a release_approvals; r releases;
begin
  select * into a from release_approvals where release_id = p_release and nonce_hash = encode(digest(coalesce(p_nonce, ''), 'sha256'), 'hex') for update;
  if a.id is null or a.used_at is not null or a.expires_at < now() then
    perform dela_audit('system', null, 'release_claim_refused', 'release', p_release::text, jsonb_build_object('reason', case when a.id is null then 'unknown' when a.used_at is not null then 'used' else 'expired' end));
    return jsonb_build_object('ok', false, 'reason', 'approval_not_valid');
  end if;
  update release_approvals set used_at = now() where id = a.id;
  update releases set status = 'deploying', action = a.action, steps = '[]',
    deploy_log = deploy_log || to_char(now(), 'YYYY-MM-DD HH24:MI') || ' ' || case when a.action = 'push' then 'push' else 'go back' end || ' started' || chr(10)
  where id = p_release returning * into r;
  return jsonb_build_object('ok', true, 'action', a.action, 'version', r.version, 'commit', r.commit_sha, 'api_version', r.api_version, 'migrations', to_jsonb(r.migrations),
    'watch_minutes', case when a.action = 'push' then greatest(least(coalesce(dela_setting_text('release.watch_minutes', '15')::int, 15), 30), 0) else 0 end);
end $$;

create or replace function dela_release_step(p_release bigint, p_key text, p_text text, p_ok boolean) returns jsonb language plpgsql as $$
declare v bigint;
begin
  update releases set steps = (case when jsonb_array_length(steps) >= 40 then steps - 0 else steps end)
      || jsonb_build_array(jsonb_build_object('key', left(coalesce(p_key, ''), 40), 'text', left(coalesce(p_text, ''), 300), 'ok', coalesce(p_ok, true), 'at', now()))
  where id = p_release and (status = 'deploying' or (watch_until is not null and watch_result = '')) returning id into v;
  if v is null then return jsonb_build_object('ok', false, 'reason', 'not_running'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Added next to 0007's version (nothing is dropped): remembers the version it replaced, starts the watch, alerts on failure.
-- The api passes p_live_ref; the 3-value form from 0007 now hands over to this one (below).
create or replace function dela_release_finish(p_release bigint, p_ok boolean, p_log text, p_live_ref text) returns jsonb language plpgsql as $$
declare r releases; v_prev bigint; v_watch int := greatest(least(coalesce(dela_setting_text('release.watch_minutes', '15')::int, 15), 30), 0); o record;
begin
  select * into r from releases where id = p_release and status = 'deploying' for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_deploying'); end if;
  if p_ok then
    select id into v_prev from releases where status = 'live' and id <> r.id order by live_at desc nulls last limit 1;
    update releases set status = 'replaced' where status = 'live' and id <> r.id;
    update releases set status = 'live', live_at = now(), previous_release_id = coalesce(v_prev, previous_release_id),
      watch_until = case when r.action = 'push' and v_watch > 0 then now() + make_interval(mins => v_watch) end,
      watch_result = '', watch_checks = 0, watch_fails = 0,
      deploy_log = deploy_log || left(coalesce(p_log, ''), 4000) || chr(10) || 'live' || chr(10) where id = r.id;
    if coalesce(p_live_ref, '') ~ '^[a-z0-9]{20}$' and dela_setting_text('live.project_ref', '') = '' then
      update settings set value = to_jsonb(p_live_ref), updated_at = now() where key = 'live.project_ref';
    end if;
    for o in select person_id from staff_roles where role = 'owner' and revoked_at is null loop
      perform dela_notify(jsonb_build_object('person_id', o.person_id, 'kind', 'release', 'essential', true, 'email', true,
        'title', 'DELA ' || r.version || ' is live',
        'body', case when r.action = 'push' and v_watch > 0 then 'Your push finished. Live is watched for ' || v_watch || ' minutes and goes back by itself if it becomes unhealthy.' else 'Live now runs ' || r.version || '.' end,
        'dedupe_key', 'release-finish:' || r.id || ':' || o.person_id || ':' || extract(epoch from now())::bigint));
    end loop;
  else
    update releases set status = 'failed', deploy_log = deploy_log || left(coalesce(p_log, ''), 4000) || chr(10) || 'failed' || chr(10) where id = r.id;
    perform dela_alert('release', 'DELA ' || r.version || ' did not go live', 'The push stopped before finishing. Live keeps the version it had. Open Release Control to see the log.',
      'release-failed:' || r.id || ':' || extract(epoch from now())::bigint);
  end if;
  perform dela_audit('system', null, case when p_ok then 'release_live' else 'release_failed' end, 'release', r.id::text, jsonb_build_object('version', r.version, 'action', r.action));
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_release_finish(p_release bigint, p_ok boolean, p_log text) returns jsonb language sql as $$
  select dela_release_finish(p_release, p_ok, p_log, '')
$$;

-- GitHub reports each health check while it watches. continue = false when the owner has started a go back.
create or replace function dela_release_watch_tick(p_release bigint, p_ok boolean) returns jsonb language plpgsql as $$
declare v bigint;
begin
  update releases set watch_checks = watch_checks + 1, watch_fails = case when p_ok then 0 else watch_fails + 1 end
  where id = p_release and watch_until is not null and watch_result = '' returning id into v;
  if v is null then return jsonb_build_object('ok', false, 'continue', false); end if;
  return jsonb_build_object('ok', true, 'continue', not exists (select 1 from releases where status = 'approved'));
end $$;

-- How the watch ended: passed, stopped (the owner started a go back), went_back (Live was unhealthy and went back by itself),
-- or could_not_go_back (unhealthy, and going back did not work: the owner is alerted at once)
create or replace function dela_release_watch_end(p_release bigint, p_result text, p_log text) returns jsonb language plpgsql as $$
declare r releases; prev releases;
begin
  if p_result not in ('passed', 'stopped', 'went_back', 'could_not_go_back') then return jsonb_build_object('ok', false, 'reason', 'bad_result'); end if;
  select * into r from releases where id = p_release and watch_until is not null and watch_result = '' for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_watching'); end if;
  update releases set watch_result = p_result, watch_until = least(watch_until, now()),
    deploy_log = deploy_log || left(coalesce(p_log, ''), 2000) || chr(10) || 'watch: ' || p_result || chr(10) where id = r.id;
  if p_result = 'went_back' then
    update releases set status = 'failed' where id = r.id;
    update releases set status = 'live', live_at = now() where id = r.previous_release_id and status = 'replaced' returning * into prev;
    perform dela_audit('system', null, 'release_auto_back', 'release', r.id::text, jsonb_build_object('version', r.version, 'back_to', prev.version));
    perform dela_alert('release', 'Live went back to ' || coalesce(prev.version, 'the earlier version') || ' by itself',
      r.version || ' became unhealthy in the ' || dela_setting_text('release.watch_minutes', '15') || ' minutes after your push, so Live went back. Member data is kept.',
      'auto-back:' || r.id);
  elsif p_result = 'could_not_go_back' then
    perform dela_audit('system', null, 'release_auto_back_failed', 'release', r.id::text, jsonb_build_object('version', r.version));
    perform dela_alert('release', 'Live needs you now', r.version || ' is unhealthy and going back by itself did not work. Open Release Control, or turn on the emergency pause on Live.',
      'auto-back-failed:' || r.id);
  else
    perform dela_audit('system', null, 'release_watch_' || p_result, 'release', r.id::text, jsonb_build_object('version', r.version));
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- The dashboard ----------

create or replace function dela_admin_control(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return jsonb_build_object(
    'environment', dela_setting_text('environment', 'staging'),
    'here', dela_env_summary(),
    'live', coalesce(dela_setting('live.status'), '{}'),
    'live_ref', dela_setting_text('live.project_ref', ''),
    'password_set', exists (select 1 from release_password),
    'locked_until', (select locked_until from release_password where locked_until > now()),
    'settings', jsonb_build_object(
      'email_code', dela_setting_text('release.email_code', 'true') = 'true',
      'require_report', dela_setting_text('release.require_report', 'true') = 'true',
      'watch_minutes', coalesce(dela_setting_text('release.watch_minutes', '15')::int, 15),
      'email_sender', dela_setting_text('email.sender', 'log'),
      'sms', dela_setting_text('alerts.sms', 'false') = 'true',
      'sms_to', dela_mask_phone(dela_setting_text('alerts.sms_to', ''))),
    'setup', coalesce(dela_setting('release.setup'), '{}'),
    'releases', (select coalesce(jsonb_agg(dela_release_json(r) order by r.id desc), '[]') from (select * from releases order by id desc limit 30) r),
    'activity', (select coalesce(jsonb_agg(x order by (x->>'id')::bigint desc), '[]') from (
      select jsonb_build_object('id', a.id, 'at', a.at, 'action', a.action, 'actor', coalesce(p.display_name, a.actor_type), 'object_id', a.object_id, 'detail', a.detail) x
      from audit_log a left join people p on p.id = a.actor_id
      where a.action like 'release%' or a.action like 'pause%' or a.action like 'live_%'
         or a.action in ('setting_changed', 'switch_changed', 'plan_approved', 'plan_restored', 'staging_reset')
      order by a.id desc limit 60) t));
end $$;

-- Live setup steps that cannot be checked from here (Stacey ticks them)
create or replace function dela_admin_setup_tick(p_actor uuid, p_item text, p_done boolean) returns jsonb language plpgsql as $$
declare cur jsonb := coalesce(dela_setting('release.setup'), '{}');
begin
  perform dela_require_staff(p_actor, '{}');
  if p_item not in ('github_env', 'uptime') then return jsonb_build_object('ok', false, 'reason', 'bad_item'); end if;
  update settings set value = jsonb_set(cur, array[p_item], to_jsonb(coalesce(p_done, false))), updated_by = p_actor, updated_at = now() where key = 'release.setup';
  perform dela_audit('staff', p_actor, 'release_setup_ticked', 'setup', p_item, jsonb_build_object('done', p_done));
  return jsonb_build_object('ok', true);
end $$;

-- Replaces 0004 with two more checks: the Live project ID and the text alert phone number
create or replace function dela_admin_set_setting(p_actor uuid, p_key text, p_value jsonb, p_status text, p_reason text) returns jsonb language plpgsql as $$
declare s settings; v_log bigint; v_prev bigint;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into s from settings where key = p_key for update;
  if s.key is null then return jsonb_build_object('ok', false, 'reason', 'unknown_setting'); end if;
  if p_key in ('environment', 'live.status', 'release.setup', 'worker.last_run', 'emergency.pause') then return jsonb_build_object('ok', false, 'reason', 'locked_setting'); end if;
  if jsonb_typeof(p_value) <> jsonb_typeof(s.value) then return jsonb_build_object('ok', false, 'reason', 'wrong_type', 'expected', jsonb_typeof(s.value)); end if;
  if p_status not in ('C', 'R', 'O', 'G') then return jsonb_build_object('ok', false, 'reason', 'bad_status'); end if;
  if p_key = 'access.mode' and p_value #>> '{}' not in ('access_list', 'everyone') then return jsonb_build_object('ok', false, 'reason', 'bad_value'); end if;
  if p_key = 'payments.mode' and p_value #>> '{}' not in ('test', 'live') then return jsonb_build_object('ok', false, 'reason', 'bad_value'); end if;
  if p_key = 'live.project_ref' and p_value #>> '{}' !~ '^([a-z0-9]{20})?$' then return jsonb_build_object('ok', false, 'reason', 'bad_project_ref'); end if;
  if p_key = 'alerts.sms_to' and p_value #>> '{}' !~ '^([+][0-9]{8,15})?$' then return jsonb_build_object('ok', false, 'reason', 'bad_phone'); end if;
  if p_key = 'release.watch_minutes' and ((p_value #>> '{}')::numeric < 0 or (p_value #>> '{}')::numeric > 30) then return jsonb_build_object('ok', false, 'reason', 'bad_value'); end if;

  insert into settings_history (key, old_value, new_value, old_status, new_status, changed_by, reason)
  values (p_key, s.value, p_value, s.status, p_status, p_actor, left(coalesce(p_reason, ''), 500));
  update settings set value = p_value, status = p_status, version = version + 1, updated_by = p_actor, updated_at = now() where key = p_key;

  select max(id) into v_prev from decision_log where decision_id = p_key;
  insert into decision_log (decision_id, status, owner, approved_at, version, supersedes, value, note, recorded_by)
  values (p_key, p_status, 'Stacey', case when p_status = 'C' then now() end, (s.version + 1)::text, v_prev, p_value, left(coalesce(p_reason, ''), 500), p_actor)
  returning id into v_log;

  perform dela_audit('staff', p_actor, 'setting_changed', 'setting', p_key, jsonb_build_object('from', s.value, 'to', p_value, 'status', p_status));
  perform dela_emit('setting.changed', 'staff', p_actor, 'setting', p_key, jsonb_build_object('version', s.version + 1));
  return jsonb_build_object('ok', true, 'version', s.version + 1, 'decision_log_id', v_log);
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'dela_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

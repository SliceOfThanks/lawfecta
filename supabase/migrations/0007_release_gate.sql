-- Release gate (Stacey, 2026-10-26): Staging is built and tested first. Only Stacey pushes a version from Staging
-- to Live, from the Staging admin area, with her release password. Claude never deploys to Live.
-- These tables are used on the Staging copy. The push itself runs in GitHub Actions (.github/workflows/promote.yml),
-- which asks Staging to confirm a one-use approval before it changes anything on Live.

create table releases (
  id bigserial primary key,
  version text not null unique,          -- for example v0.1.0
  commit_sha text not null check (length(commit_sha) = 40),
  api_version text not null default '',
  migrations text[] not null default '{}', -- files under supabase/migrations this version needs, in order
  notes text not null default '',
  status text not null default 'candidate' check (status in ('candidate', 'tested', 'approved', 'deploying', 'live', 'failed', 'replaced', 'rolled_back')),
  tested_by uuid references people(id),
  tested_at timestamptz,
  approved_by uuid references people(id),
  approved_at timestamptz,
  live_at timestamptz,
  deploy_log text not null default '',
  created_at timestamptz not null default now()
);

-- One row. Only a hash of the password is kept.
create table release_password (
  id int primary key default 1 check (id = 1),
  hash text not null,
  set_by uuid references people(id),
  set_at timestamptz not null default now(),
  failed_attempts int not null default 0,
  locked_until timestamptz
);

create table release_approvals (
  id bigserial primary key,
  release_id bigint not null references releases(id),
  action text not null check (action in ('push', 'rollback')),
  nonce_hash text not null unique,
  approved_by uuid not null references people(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

alter table releases enable row level security;
alter table release_password enable row level security;
alter table release_approvals enable row level security;
revoke all on releases, release_password, release_approvals from anon, authenticated;

create or replace function dela_release_json(r releases) returns jsonb language sql stable as $$
  select jsonb_build_object('id', r.id, 'version', r.version, 'commit', r.commit_sha, 'api_version', r.api_version, 'migrations', to_jsonb(r.migrations),
    'notes', r.notes, 'status', r.status, 'tested_at', r.tested_at, 'approved_at', r.approved_at, 'live_at', r.live_at, 'created_at', r.created_at,
    'tested_by', (select display_name from people where id = r.tested_by), 'approved_by', (select display_name from people where id = r.approved_by),
    'deploy_log', right(r.deploy_log, 2000))
$$;

-- Claude records each version that is ready on Staging (service role only, never from the browser)
create or replace function dela_release_record(p_version text, p_commit text, p_api_version text, p_migrations text[], p_notes text) returns bigint language plpgsql as $$
declare v bigint;
begin
  insert into releases (version, commit_sha, api_version, migrations, notes) values (p_version, lower(p_commit), coalesce(p_api_version, ''), coalesce(p_migrations, '{}'), coalesce(p_notes, ''))
  returning id into v;
  perform dela_audit('system', null, 'release_recorded', 'release', v::text, jsonb_build_object('version', p_version, 'commit', p_commit));
  return v;
end $$;

create or replace function dela_admin_releases(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return jsonb_build_object(
    'environment', dela_setting_text('environment', 'staging'),
    'password_set', exists (select 1 from release_password),
    'locked_until', (select locked_until from release_password where locked_until > now()),
    'live', (select dela_release_json(r) from releases r where status = 'live' order by live_at desc limit 1),
    'releases', (select coalesce(jsonb_agg(dela_release_json(r) order by r.id desc), '[]') from releases r));
end $$;

-- Sets the release password. The first time needs only the owner role; changing it needs the current password.
create or replace function dela_release_password_set(p_actor uuid, p_current text, p_new text) returns jsonb language plpgsql
set search_path = public, extensions as $$
declare rp release_password;
begin
  perform dela_require_staff(p_actor, '{}');
  if dela_setting_text('environment', 'staging') <> 'staging' then return jsonb_build_object('ok', false, 'reason', 'staging_only'); end if;
  if p_new is null or length(p_new) < 12 then return jsonb_build_object('ok', false, 'reason', 'password_too_short'); end if;
  select * into rp from release_password where id = 1 for update;
  if rp.id is not null then
    if rp.locked_until > now() then return jsonb_build_object('ok', false, 'reason', 'locked', 'locked_until', rp.locked_until); end if;
    if p_current is null or crypt(p_current, rp.hash) <> rp.hash then
      perform dela_release_failed_attempt(p_actor, 'password_change');
      return jsonb_build_object('ok', false, 'reason', 'wrong_password');
    end if;
  end if;
  insert into release_password (id, hash, set_by, set_at, failed_attempts, locked_until) values (1, crypt(p_new, gen_salt('bf', 10)), p_actor, now(), 0, null)
  on conflict (id) do update set hash = excluded.hash, set_by = excluded.set_by, set_at = now(), failed_attempts = 0, locked_until = null;
  perform dela_audit('staff', p_actor, case when rp.id is null then 'release_password_set' else 'release_password_changed' end, 'release_password', '1', '{}');
  return jsonb_build_object('ok', true);
end $$;

-- Five wrong passwords lock pushing for 30 minutes and tell the owner
create or replace function dela_release_failed_attempt(p_actor uuid, p_what text) returns void language plpgsql as $$
declare n int; o record;
begin
  update release_password set failed_attempts = failed_attempts + 1,
    locked_until = case when failed_attempts + 1 >= 5 then now() + interval '30 minutes' else locked_until end
  where id = 1 returning failed_attempts into n;
  perform dela_audit('staff', p_actor, 'release_password_wrong', 'release_password', '1', jsonb_build_object('what', p_what, 'attempts', n));
  if n >= 5 then
    update release_password set failed_attempts = 0 where id = 1;
    for o in select person_id from staff_roles where role = 'owner' and revoked_at is null loop
      perform dela_notify(jsonb_build_object('person_id', o.person_id, 'kind', 'security', 'essential', true, 'email', true,
        'title', 'Release password locked', 'body', 'Someone entered the wrong release password five times. Pushing to Live is locked for 30 minutes.',
        'dedupe_key', 'release-lock:' || o.person_id || ':' || extract(epoch from now())::bigint));
    end loop;
  end if;
end $$;

create or replace function dela_release_mark_tested(p_actor uuid, p_release bigint, p_tested boolean) returns jsonb language plpgsql as $$
declare r releases;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into r from releases where id = p_release for update;
  if r.id is null or r.status not in ('candidate', 'tested', 'failed') then return jsonb_build_object('ok', false, 'reason', 'not_open'); end if;
  update releases set status = case when p_tested then 'tested' else 'candidate' end,
    tested_by = case when p_tested then p_actor end, tested_at = case when p_tested then now() end where id = r.id;
  perform dela_audit('staff', p_actor, case when p_tested then 'release_marked_tested' else 'release_unmarked_tested' end, 'release', r.id::text, jsonb_build_object('version', r.version));
  return jsonb_build_object('ok', true);
end $$;

-- Checks the password and creates a one-use approval that lasts 15 minutes. Returns the approval code once.
-- push: only a version Stacey marked as tested. rollback: only a version that was live before.
create or replace function dela_release_approve(p_actor uuid, p_release bigint, p_action text, p_password text) returns jsonb language plpgsql
set search_path = public, extensions as $$
declare rp release_password; r releases; v_nonce text;
begin
  perform dela_require_staff(p_actor, '{}');
  if dela_setting_text('environment', 'staging') <> 'staging' then return jsonb_build_object('ok', false, 'reason', 'staging_only'); end if;
  select * into rp from release_password where id = 1 for update;
  if rp.id is null then return jsonb_build_object('ok', false, 'reason', 'no_password'); end if;
  if rp.locked_until > now() then return jsonb_build_object('ok', false, 'reason', 'locked', 'locked_until', rp.locked_until); end if;
  if p_password is null or crypt(p_password, rp.hash) <> rp.hash then
    perform dela_release_failed_attempt(p_actor, p_action);
    return jsonb_build_object('ok', false, 'reason', 'wrong_password');
  end if;
  update release_password set failed_attempts = 0 where id = 1;

  select * into r from releases where id = p_release for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_action = 'push' and r.status <> 'tested' then return jsonb_build_object('ok', false, 'reason', 'not_tested'); end if;
  if p_action = 'rollback' and r.status not in ('replaced', 'rolled_back') then return jsonb_build_object('ok', false, 'reason', 'not_rollback_target'); end if;
  if p_action not in ('push', 'rollback') then return jsonb_build_object('ok', false, 'reason', 'bad_action'); end if;
  if exists (select 1 from releases where status in ('approved', 'deploying')) then return jsonb_build_object('ok', false, 'reason', 'push_in_progress'); end if;

  v_nonce := encode(gen_random_bytes(32), 'hex');
  insert into release_approvals (release_id, action, nonce_hash, approved_by, expires_at)
  values (r.id, p_action, encode(digest(v_nonce, 'sha256'), 'hex'), p_actor, now() + interval '15 minutes');
  update releases set status = 'approved', approved_by = p_actor, approved_at = now(),
    deploy_log = deploy_log || to_char(now(), 'YYYY-MM-DD HH24:MI') || ' ' || p_action || ' approved' || chr(10) where id = r.id;
  perform dela_audit('staff', p_actor, 'release_approved', 'release', r.id::text, jsonb_build_object('version', r.version, 'action', p_action));
  return jsonb_build_object('ok', true, 'nonce', v_nonce, 'release_id', r.id, 'version', r.version, 'commit', r.commit_sha);
end $$;

-- GitHub Actions calls this before touching Live. The approval works once, within 15 minutes.
create or replace function dela_release_claim(p_release bigint, p_nonce text) returns jsonb language plpgsql
set search_path = public, extensions as $$
declare a release_approvals; r releases;
begin
  select * into a from release_approvals where release_id = p_release and nonce_hash = encode(digest(coalesce(p_nonce, ''), 'sha256'), 'hex') for update;
  if a.id is null or a.used_at is not null or a.expires_at < now() then
    perform dela_audit('system', null, 'release_claim_refused', 'release', p_release::text, jsonb_build_object('reason', case when a.id is null then 'unknown' when a.used_at is not null then 'used' else 'expired' end));
    return jsonb_build_object('ok', false, 'reason', 'approval_not_valid');
  end if;
  update release_approvals set used_at = now() where id = a.id;
  update releases set status = 'deploying', deploy_log = deploy_log || to_char(now(), 'YYYY-MM-DD HH24:MI') || ' deploy started' || chr(10) where id = p_release returning * into r;
  return jsonb_build_object('ok', true, 'action', a.action, 'version', r.version, 'commit', r.commit_sha, 'api_version', r.api_version, 'migrations', to_jsonb(r.migrations));
end $$;

create or replace function dela_release_finish(p_release bigint, p_ok boolean, p_log text) returns jsonb language plpgsql as $$
declare r releases; o record;
begin
  select * into r from releases where id = p_release and status = 'deploying' for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_deploying'); end if;
  if p_ok then
    update releases set status = 'replaced' where status = 'live' and id <> r.id;
    update releases set status = 'live', live_at = now(), deploy_log = deploy_log || left(coalesce(p_log, ''), 4000) || chr(10) || 'live' || chr(10) where id = r.id;
  else
    update releases set status = 'failed', deploy_log = deploy_log || left(coalesce(p_log, ''), 4000) || chr(10) || 'failed' || chr(10) where id = r.id;
  end if;
  perform dela_audit('system', null, case when p_ok then 'release_live' else 'release_failed' end, 'release', r.id::text, jsonb_build_object('version', r.version));
  for o in select person_id from staff_roles where role = 'owner' and revoked_at is null loop
    perform dela_notify(jsonb_build_object('person_id', o.person_id, 'kind', 'release', 'essential', true, 'email', true,
      'title', case when p_ok then 'DELA ' || r.version || ' is live' else 'DELA ' || r.version || ' did not go live' end,
      'body', case when p_ok then 'Your push to Live finished.' else 'The push stopped before finishing. Live keeps the version it had. Claude will look at the log.' end,
      'dedupe_key', 'release-finish:' || r.id || ':' || o.person_id || ':' || p_ok));
  end loop;
  return jsonb_build_object('ok', true);
end $$;

-- An approval that GitHub never picked up expires, and the version can be pushed again
create or replace function dela_release_expire() returns int language plpgsql as $$
declare n int;
begin
  update releases r set status = 'tested', deploy_log = deploy_log || 'approval expired' || chr(10)
  where r.status = 'approved' and not exists (select 1 from release_approvals a where a.release_id = r.id and a.used_at is null and a.expires_at > now());
  get diagnostics n = row_count;
  return n;
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

-- If GitHub could not be reached, the approval is thrown away at once and the version goes back to tested
create or replace function dela_release_cancel_approval(p_release bigint, p_reason text) returns void language plpgsql as $$
begin
  update release_approvals set expires_at = now() where release_id = p_release and used_at is null;
  update releases set status = 'tested', deploy_log = deploy_log || 'push not started: ' || left(coalesce(p_reason, ''), 300) || chr(10)
  where id = p_release and status = 'approved';
end $$;
revoke all on function dela_release_cancel_approval(bigint, text) from public, anon, authenticated;
grant execute on function dela_release_cancel_approval(bigint, text) to service_role;

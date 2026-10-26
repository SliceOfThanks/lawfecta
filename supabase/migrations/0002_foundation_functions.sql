-- DELA foundation functions (Step 1): settings, switches, sign in, sessions, entitlements, quotas,
-- audit, events, notifications and the job queue. Service role only.

-- ---------- Small helpers ----------

create or replace function dela_setting(p_key text) returns jsonb language sql stable as $$
  select value from settings where key = p_key
$$;

create or replace function dela_setting_text(p_key text, p_default text) returns text language sql stable as $$
  select coalesce((select value #>> '{}' from settings where key = p_key), p_default)
$$;

create or replace function dela_tz() returns text language sql stable as $$
  select dela_setting_text('quota.timezone', 'America/Los_Angeles')
$$;

create or replace function dela_period_start(p_period text) returns date language sql stable as $$
  select case when p_period = 'month' then date_trunc('month', now() at time zone dela_tz())::date else date '1970-01-01' end
$$;

create or replace function dela_tier_rank(p_tier text) returns int language sql immutable as $$
  select case p_tier when 'free' then 0 when 'plus' then 1 when 'pro' then 2 when 'business' then 3 else -1 end
$$;

create or replace function dela_staff_roles(p_person uuid) returns text[] language sql stable as $$
  select coalesce(array_agg(role order by role), '{}') from staff_roles where person_id = p_person and revoked_at is null
$$;

create or replace function dela_is_staff(p_person uuid) returns boolean language sql stable as $$
  select exists (select 1 from staff_roles where person_id = p_person and revoked_at is null)
$$;

create or replace function dela_on_list(p_bd bigint, p_channel text) returns boolean language sql stable as $$
  select exists (select 1 from access_list where bd_member_id = p_bd and channel = p_channel and revoked_at is null)
$$;

-- May this person open this copy of DELA right now?
create or replace function dela_may_open(p_person uuid) returns boolean language sql stable as $$
  select p.status <> 'closed' and (
    dela_setting_text('access.mode', 'access_list') = 'everyone'
    or dela_is_staff(p.id)
    or dela_on_list(p.bd_member_id, 'access'))
  from people p where p.id = p_person
$$;

create or replace function dela_switch_on(p_key text, p_person uuid) returns boolean language sql stable as $$
  select coalesce((
    select case s.state
      when 'everyone' then true
      when 'list' then dela_is_staff(p_person) or exists (select 1 from people p where p.id = p_person and dela_on_list(p.bd_member_id, 'access'))
      when 'staff' then dela_is_staff(p_person)
      else false end
    from feature_switches s where s.key = p_key), false)
$$;

create or replace function dela_audit(p_actor_type text, p_actor uuid, p_action text, p_object_type text, p_object_id text, p_detail jsonb, p_ip text default '')
returns void language sql as $$
  insert into audit_log (actor_type, actor_id, action, object_type, object_id, detail, ip)
  values (p_actor_type, p_actor, p_action, coalesce(p_object_type, ''), coalesce(p_object_id, ''), coalesce(p_detail, '{}'), coalesce(p_ip, ''))
$$;

-- Written in the same transaction as the change it describes. Payloads stay small and never hold private text.
create or replace function dela_emit(p_type text, p_actor_type text, p_actor uuid, p_object_type text, p_object_id text, p_payload jsonb, p_is_test boolean default false)
returns uuid language sql as $$
  insert into outbox_events (event_type, actor_type, actor_id, object_type, object_id, payload, is_test, policy_version)
  values (p_type, p_actor_type, p_actor, p_object_type, p_object_id, coalesce(p_payload, '{}'), p_is_test, dela_setting_text('policy.version', ''))
  returning event_id
$$;

create or replace function dela_has_hold(p_person uuid) returns boolean language sql stable as $$
  select exists (
    select 1 from holds where state = 'active' and (expires_at is null or expires_at > now())
      and scope_type = 'person' and scope_id = p_person::text)
$$;

-- ---------- Plans and entitlements ----------

-- The plan version that applies to this person's side right now (trial included)
create or replace function dela_effective_version(p_person uuid, p_side text) returns bigint language plpgsql stable as $$
declare
  v_code text; v_tier text; v_trial_tier text; v_id bigint;
begin
  select sp.plan_code, pl.tier into v_code, v_tier
  from side_profiles sp join plans pl on pl.code = sp.plan_code
  where sp.person_id = p_person and sp.side = p_side and sp.status <> 'closed';
  if v_code is null then return null; end if;
  if dela_switch_on('trials', p_person) and exists (select 1 from people where id = p_person and trial_ends_at > now()) then
    v_trial_tier := dela_setting_text('trial.tier', 'pro');
    if dela_tier_rank(v_trial_tier) > dela_tier_rank(v_tier) then
      select code into v_code from plans where side = p_side and tier = v_trial_tier;
    end if;
  end if;
  select id into v_id from plan_versions where plan_code = v_code and status = 'approved';
  return v_id;
end $$;

create or replace function dela_entitlements(p_person uuid, p_side text) returns jsonb language plpgsql stable as $$
declare v_ver bigint; v jsonb;
begin
  v_ver := dela_effective_version(p_person, p_side);
  select coalesce(jsonb_agg(jsonb_build_object(
      'key', f.key, 'label', f.label, 'unit', f.unit, 'period', f.period, 'kind', f.kind,
      'enabled', coalesce(pf.enabled, false),
      'limit', case when pf.enabled then pf.quota_limit else 0 end,
      'unlimited', coalesce(pf.enabled and pf.quota_limit is null and f.kind = 'quota', false),
      'used', coalesce(u.used, 0), 'reserved', coalesce(u.reserved, 0),
      'remaining', case when f.kind <> 'quota' then null
                        when not coalesce(pf.enabled, false) then 0
                        when pf.quota_limit is null then null
                        else greatest(pf.quota_limit - coalesce(u.used, 0) - coalesce(u.reserved, 0), 0) end
    ) order by f.key), '[]')
  into v
  from features f
  left join plan_features pf on pf.plan_version_id = v_ver and pf.feature_key = f.key
  left join quota_usage u on u.person_id = p_person and u.side = p_side and u.feature_key = f.key and u.period_start = dela_period_start(f.period)
  where f.side in (p_side, 'both');
  return v;
end $$;

-- Reserve allowance before an action. Two clicks or a retry with the same key reserve once.
create or replace function dela_quota_reserve(p_person uuid, p_side text, p_feature text, p_amount int, p_idem text, p_ref text default '')
returns jsonb language plpgsql as $$
declare
  f features; v_ver bigint; v_enabled boolean; v_limit int; v_period date; u quota_usage; r quota_reservations;
begin
  if p_amount is null or p_amount <= 0 or coalesce(p_idem, '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  select * into f from features where key = p_feature;
  if f.key is null or f.kind <> 'quota' or f.side not in (p_side, 'both') then return jsonb_build_object('ok', false, 'reason', 'unknown_feature'); end if;
  v_period := dela_period_start(f.period);
  insert into quota_usage (person_id, side, feature_key, period_start) values (p_person, p_side, p_feature, v_period)
  on conflict (person_id, side, feature_key, period_start) do nothing;
  -- This lock makes concurrent reservations for the same allowance wait their turn
  select * into u from quota_usage where person_id = p_person and side = p_side and feature_key = p_feature and period_start = v_period for update;

  select * into r from quota_reservations where idempotency_key = p_idem;
  if r.id is not null then
    return jsonb_build_object('ok', r.status <> 'released', 'duplicate', true, 'reservation_id', r.id, 'status', r.status);
  end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;

  v_ver := dela_effective_version(p_person, p_side);
  select pf.enabled, pf.quota_limit into v_enabled, v_limit from plan_features pf where pf.plan_version_id = v_ver and pf.feature_key = p_feature;
  if not coalesce(v_enabled, false) then return jsonb_build_object('ok', false, 'reason', 'not_in_plan'); end if;
  if v_limit is not null and u.used + u.reserved + p_amount > v_limit then
    return jsonb_build_object('ok', false, 'reason', 'limit_reached', 'limit', v_limit, 'remaining', greatest(v_limit - u.used - u.reserved, 0));
  end if;

  update quota_usage set reserved = reserved + p_amount where id = u.id;
  insert into quota_reservations (idempotency_key, person_id, side, feature_key, period_start, amount, object_ref)
  values (p_idem, p_person, p_side, p_feature, v_period, p_amount, coalesce(p_ref, ''))
  returning * into r;
  return jsonb_build_object('ok', true, 'duplicate', false, 'reservation_id', r.id, 'status', 'reserved',
    'remaining', case when v_limit is null then null else v_limit - u.used - u.reserved - p_amount end);
end $$;

create or replace function dela_quota_finish(p_reservation uuid, p_settle boolean) returns jsonb language plpgsql as $$
declare r quota_reservations;
begin
  select * into r from quota_reservations where id = p_reservation for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if r.status <> 'reserved' then return jsonb_build_object('ok', true, 'status', r.status, 'duplicate', true); end if;
  perform 1 from quota_usage where person_id = r.person_id and side = r.side and feature_key = r.feature_key and period_start = r.period_start for update;
  if p_settle then
    update quota_usage set reserved = reserved - r.amount, used = used + r.amount
    where person_id = r.person_id and side = r.side and feature_key = r.feature_key and period_start = r.period_start;
    update quota_reservations set status = 'settled', finished_at = now() where id = r.id;
    return jsonb_build_object('ok', true, 'status', 'settled');
  end if;
  update quota_usage set reserved = reserved - r.amount
  where person_id = r.person_id and side = r.side and feature_key = r.feature_key and period_start = r.period_start;
  update quota_reservations set status = 'released', finished_at = now() where id = r.id;
  return jsonb_build_object('ok', true, 'status', 'released');
end $$;

-- For "at one time" allowances (open gigs, published services): give one back when the thing closes. Once per key.
create or replace function dela_quota_return(p_person uuid, p_side text, p_feature text, p_amount int, p_idem text) returns jsonb language plpgsql as $$
declare f features; v_period date; v_new uuid;
begin
  select * into f from features where key = p_feature;
  if f.key is null or f.period <> 'none' then return jsonb_build_object('ok', false, 'reason', 'not_returnable'); end if;
  v_period := dela_period_start(f.period);
  insert into quota_reservations (idempotency_key, person_id, side, feature_key, period_start, amount, status, finished_at)
  values ('return:' || p_idem, p_person, p_side, p_feature, v_period, p_amount, 'released', now())
  on conflict (idempotency_key) do nothing returning id into v_new;
  if v_new is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update quota_usage set used = greatest(used - p_amount, 0)
  where person_id = p_person and side = p_side and feature_key = p_feature and period_start = v_period;
  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;

-- ---------- People and sides ----------

create or replace function dela_ensure_side(p_person uuid, p_side text, p_plan text, p_source text) returns uuid language plpgsql as $$
declare v_org uuid; v_kind text; v_id uuid; v_name text;
begin
  v_kind := case p_side when 'attorney' then 'attorney_personal' else 'freelancer_personal' end;
  select id into v_org from organizations where owner_person_id = p_person and kind = v_kind;
  if v_org is null then
    select display_name into v_name from people where id = p_person;
    insert into organizations (kind, name, owner_person_id) values (v_kind, coalesce(v_name, ''), p_person) returning id into v_org;
    insert into org_members (org_id, person_id, member_role) values (v_org, p_person, 'owner');
  end if;
  insert into side_profiles (person_id, side, org_id, plan_code, plan_source, verification_state, readiness_state)
  values (p_person, p_side, v_org, p_plan, p_source,
          case p_side when 'attorney' then 'not_started' else 'not_required' end,
          case p_side when 'attorney' then 'not_applicable' else 'incomplete' end)
  on conflict (person_id, side) do update
    set plan_code = case when side_profiles.plan_source = 'staff_grant' and excluded.plan_source = 'bd' then side_profiles.plan_code else excluded.plan_code end,
        plan_source = case when side_profiles.plan_source = 'staff_grant' and excluded.plan_source = 'bd' then side_profiles.plan_source else excluded.plan_source end,
        status = case when side_profiles.status = 'closed' then 'active' else side_profiles.status end,
        updated_at = now()
  returning id into v_id;
  return v_id;
end $$;

create or replace function dela_me(p_person uuid, p_side text) returns jsonb language plpgsql stable as $$
declare p people; v jsonb; v_sw jsonb;
begin
  select * into p from people where id = p_person;
  if p.id is null then return null; end if;
  select coalesce(jsonb_object_agg(key, dela_switch_on(key, p_person)), '{}') into v_sw from feature_switches;
  v := jsonb_build_object(
    'person', jsonb_build_object('id', p.id, 'bd_member_id', p.bd_member_id, 'name', p.display_name, 'email', p.email, 'status', p.status),
    'side', p_side,
    'sides', coalesce((select jsonb_agg(jsonb_build_object(
        'side', sp.side, 'plan_code', sp.plan_code, 'plan_name', pl.name, 'tier', pl.tier, 'plan_source', sp.plan_source,
        'status', sp.status, 'verification_state', sp.verification_state, 'readiness_state', sp.readiness_state, 'org_id', sp.org_id
      ) order by sp.side) from side_profiles sp join plans pl on pl.code = sp.plan_code where sp.person_id = p_person and sp.status <> 'closed'), '[]'),
    'staff', to_jsonb(dela_staff_roles(p_person)),
    'trial', jsonb_build_object('on', dela_switch_on('trials', p_person), 'active', coalesce(p.trial_ends_at > now(), false), 'ends_at', p.trial_ends_at, 'tier', dela_setting_text('trial.tier', 'pro')),
    'entitlements', case when p_side is null then '[]'::jsonb else dela_entitlements(p_person, p_side) end,
    'switches', v_sw,
    'environment', dela_setting_text('environment', 'staging'),
    'unread', (select count(*) from notifications n where n.person_id = p_person and n.channel = 'in_app' and n.read_at is null),
    'on_hold', dela_has_hold(p_person),
    'notice', dela_setting('data.notice_text')
  );
  return v;
end $$;

-- ---------- Sign in ----------

-- Exchanges a verified one-use BD pass for a DELA session.
-- p: bd_member_id, bd_plan_id, name, email, jti, exp (unix seconds), token_hash, ip, ua, side (optional)
create or replace function dela_exchange(p jsonb) returns jsonb language plpgsql as $$
declare
  v_bd bigint := (p->>'bd_member_id')::bigint;
  v_jti text := p->>'jti';
  v_ok text; v_person people; v_plan plans; v_side text; v_session uuid; v_hours int; v_staff boolean;
begin
  if v_bd is null or v_bd <= 0 or coalesce(v_jti, '') = '' or coalesce(p->>'token_hash', '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'bad_pass');
  end if;
  delete from used_passes where expires_at < now() - interval '1 day';
  insert into used_passes (jti, expires_at) values (v_jti, to_timestamp((p->>'exp')::bigint))
  on conflict (jti) do nothing returning jti into v_ok;
  if v_ok is null then return jsonb_build_object('ok', false, 'reason', 'pass_used'); end if;

  insert into people (bd_member_id, display_name, email)
  values (v_bd, left(coalesce(p->>'name', ''), 200), left(coalesce(p->>'email', ''), 320))
  on conflict (bd_member_id) do update
    set display_name = case when excluded.display_name <> '' then excluded.display_name else people.display_name end,
        email = case when excluded.email <> '' then excluded.email else people.email end,
        last_seen_at = now(), updated_at = now()
  returning * into v_person;

  if v_person.status = 'closed' then return jsonb_build_object('ok', false, 'reason', 'closed'); end if;
  v_staff := dela_is_staff(v_person.id);

  -- The Live copy sends test accounts to Staging and opens no session here
  if dela_setting_text('environment', 'staging') = 'live' and dela_on_list(v_bd, 'staging_tester') then
    perform dela_audit('member', v_person.id, 'routed_to_staging', 'person', v_person.id::text, '{}', p->>'ip');
    return jsonb_build_object('ok', true, 'route', 'staging');
  end if;

  if not dela_may_open(v_person.id) then
    perform dela_audit('member', v_person.id, 'access_denied', 'person', v_person.id::text, jsonb_build_object('reason', 'not_on_access_list'), p->>'ip');
    return jsonb_build_object('ok', false, 'reason', 'no_access');
  end if;

  if (p->>'bd_plan_id') ~ '^[0-9]+$' then
    select * into v_plan from plans where bd_plan_id = (p->>'bd_plan_id')::bigint;
    if v_plan.code is not null then perform dela_ensure_side(v_person.id, v_plan.side, v_plan.code, 'bd'); end if;
  end if;

  if dela_switch_on('trials', v_person.id) and v_person.trial_started_at is null
     and dela_setting_text('trial.starts', 'first_dela_login') = 'first_dela_login'
     and exists (select 1 from side_profiles where person_id = v_person.id) then
    update people set trial_started_at = now(),
      trial_ends_at = now() + make_interval(days => coalesce((dela_setting('trial.days') #>> '{}')::int, 7))
    where id = v_person.id;
  end if;

  select side into v_side from side_profiles
  where person_id = v_person.id and status <> 'closed'
  order by (side = coalesce(p->>'side', '')) desc, (side = coalesce(v_plan.side, '')) desc, side
  limit 1;

  v_hours := coalesce((dela_setting('session.hours') #>> '{}')::int, 8);
  insert into sessions (token_hash, person_id, side, auth_version, expires_at, ip, user_agent)
  values (p->>'token_hash', v_person.id, v_side, v_person.auth_version, now() + make_interval(hours => v_hours), left(coalesce(p->>'ip', ''), 80), left(coalesce(p->>'ua', ''), 300))
  returning id into v_session;

  perform dela_audit(case when v_staff then 'staff' else 'member' end, v_person.id, 'sign_in', 'session', v_session::text,
    jsonb_build_object('side', v_side, 'bd_plan_id', p->>'bd_plan_id', 'plan_mapped', v_plan.code is not null), p->>'ip');
  return jsonb_build_object('ok', true, 'route', 'here', 'session_id', v_session, 'expires_in_hours', v_hours, 'me', dela_me(v_person.id, v_side));
end $$;

-- Checks a session on every request: expiry, sign out, access removal and account status all apply at once.
create or replace function dela_session_resolve(p_token_hash text) returns jsonb language plpgsql as $$
declare s sessions; pr people;
begin
  select * into s from sessions where token_hash = p_token_hash;
  if s.id is null or s.revoked_at is not null or s.expires_at < now() then return null; end if;
  select * into pr from people where id = s.person_id;
  if pr.auth_version <> s.auth_version or not dela_may_open(pr.id) then return null; end if;
  if s.last_used_at < now() - interval '1 minute' then update sessions set last_used_at = now() where id = s.id; end if;
  return jsonb_build_object('session_id', s.id, 'person_id', s.person_id, 'side', s.side, 'staff', to_jsonb(dela_staff_roles(s.person_id)), 'bd_member_id', pr.bd_member_id);
end $$;

create or replace function dela_session_set_side(p_session uuid, p_side text) returns jsonb language plpgsql as $$
declare s sessions;
begin
  select * into s from sessions where id = p_session and revoked_at is null;
  if s.id is null then return jsonb_build_object('ok', false, 'reason', 'no_session'); end if;
  if not exists (select 1 from side_profiles where person_id = s.person_id and side = p_side and status <> 'closed') then
    return jsonb_build_object('ok', false, 'reason', 'no_such_side');
  end if;
  update sessions set side = p_side where id = s.id;
  return jsonb_build_object('ok', true, 'me', dela_me(s.person_id, p_side));
end $$;

create or replace function dela_sign_out(p_session uuid) returns void language sql as $$
  update sessions set revoked_at = now() where id = p_session and revoked_at is null
$$;

-- Ends every session for a person (access removed, account restricted, staff change)
create or replace function dela_revoke_person(p_person uuid) returns void language sql as $$
  update people set auth_version = auth_version + 1, updated_at = now() where id = p_person;
  update sessions set revoked_at = now() where person_id = p_person and revoked_at is null;
$$;

-- ---------- Notifications ----------

-- p: person_id, side, kind, title, body, link, essential, email (bool), dedupe_key
create or replace function dela_notify(p jsonb) returns jsonb language plpgsql as $$
declare v_in uuid; v_mail uuid; v_person uuid := (p->>'person_id')::uuid; v_key text := p->>'dedupe_key';
begin
  if v_person is null or coalesce(v_key, '') = '' or coalesce(p->>'title', '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  insert into notifications (person_id, side, kind, channel, essential, title, body, link, dedupe_key)
  values (v_person, p->>'side', coalesce(p->>'kind', 'general'), 'in_app', coalesce((p->>'essential')::boolean, false),
          left(p->>'title', 200), left(coalesce(p->>'body', ''), 2000), left(coalesce(p->>'link', ''), 500), v_key || ':in_app')
  on conflict (dedupe_key) do nothing returning id into v_in;
  if coalesce((p->>'email')::boolean, false) then
    insert into notifications (person_id, side, kind, channel, essential, title, body, link, dedupe_key)
    values (v_person, p->>'side', coalesce(p->>'kind', 'general'), 'email', coalesce((p->>'essential')::boolean, false),
            left(p->>'title', 200), left(coalesce(p->>'body', ''), 2000), left(coalesce(p->>'link', ''), 500), v_key || ':email')
    on conflict (dedupe_key) do nothing returning id into v_mail;
    if v_mail is not null then
      perform dela_job_enqueue('send_email', jsonb_build_object('notification_id', v_mail), now(), 'email:' || v_mail::text, v_person);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'in_app_id', v_in, 'email_id', v_mail);
end $$;

create or replace function dela_notifications(p_person uuid, p_limit int default 30) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]') from (
    select jsonb_build_object('id', id, 'kind', kind, 'title', title, 'body', body, 'link', link, 'essential', essential,
                              'created_at', created_at, 'read', read_at is not null) as x
    from notifications where person_id = p_person and channel = 'in_app'
    order by created_at desc limit least(greatest(p_limit, 1), 100)) t
$$;

create or replace function dela_notification_read(p_person uuid, p_id uuid) returns boolean language sql as $$
  update notifications set read_at = coalesce(read_at, now()) where id = p_id and person_id = p_person and channel = 'in_app' returning true
$$;

create or replace function dela_notifications_read_all(p_person uuid) returns int language sql as $$
  with u as (update notifications set read_at = now() where person_id = p_person and channel = 'in_app' and read_at is null returning 1)
  select count(*)::int from u
$$;

-- ---------- Jobs ----------

create or replace function dela_job_enqueue(p_kind text, p_payload jsonb, p_run_at timestamptz, p_idem text, p_person uuid default null)
returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into jobs (kind, payload, run_at, idempotency_key, person_id)
  values (p_kind, coalesce(p_payload, '{}'), coalesce(p_run_at, now()), p_idem, p_person)
  on conflict (idempotency_key) do nothing returning id into v;
  if v is null then select id into v from jobs where idempotency_key = p_idem; end if;
  return v;
end $$;

-- Hands out due jobs. A job whose worker died gets picked up again after its lease runs out.
create or replace function dela_job_lease(p_limit int, p_lease_seconds int) returns setof jobs language sql as $$
  update jobs set status = 'running', attempts = attempts + 1, lease_until = now() + make_interval(secs => p_lease_seconds), updated_at = now()
  where id in (
    select id from jobs
    where (status in ('queued', 'delayed') and run_at <= now()) or (status = 'running' and lease_until < now())
    order by run_at limit greatest(p_limit, 1)
    for update skip locked)
  returning *
$$;

create or replace function dela_job_finish(p_job uuid, p_ok boolean, p_error text default '', p_retry_seconds int default 60) returns text language plpgsql as $$
declare j jobs; v_status text;
begin
  select * into j from jobs where id = p_job for update;
  if j.id is null or j.status <> 'running' then return 'ignored'; end if;
  if p_ok then
    v_status := 'succeeded';
    update jobs set status = v_status, finished_at = now(), lease_until = null, updated_at = now(), last_error = '' where id = j.id;
  elsif j.attempts >= j.max_attempts then
    v_status := 'dead';
    update jobs set status = v_status, finished_at = now(), lease_until = null, updated_at = now(), last_error = left(coalesce(p_error, ''), 1000) where id = j.id;
    perform dela_audit('worker', null, 'job_dead', 'job', j.id::text, jsonb_build_object('kind', j.kind, 'error', left(coalesce(p_error, ''), 300)));
  else
    v_status := 'delayed';
    update jobs set status = v_status, lease_until = null, updated_at = now(), last_error = left(coalesce(p_error, ''), 1000),
      run_at = now() + make_interval(secs => greatest(p_retry_seconds, 5) * power(2, j.attempts - 1)::int) where id = j.id;
  end if;
  return v_status;
end $$;

create or replace function dela_job_cancel(p_job uuid) returns boolean language sql as $$
  update jobs set status = 'canceled', finished_at = now(), updated_at = now() where id = p_job and status in ('queued', 'delayed', 'waiting_approval') returning true
$$;

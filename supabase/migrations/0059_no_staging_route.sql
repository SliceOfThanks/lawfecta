-- AI review of 0.9.1 (tests 6): the "Test site account" list is gone (migration 0057), so sign-in no longer has a
-- branch that sends a Live member to the test site. The same function as before, with that branch removed.
-- Older versions never call it differently: the arguments and the answer's shape are unchanged.

CREATE OR REPLACE FUNCTION public.dela_exchange(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_bd bigint := (p->>'bd_member_id')::bigint;
  v_jti text := p->>'jti';
  v_ok text; v_person people; v_plan plans; v_side text; v_session uuid; v_hours int; v_staff boolean; v_reg timestamptz; v_days int;
begin
  if v_bd is null or v_bd <= 0 or coalesce(v_jti, '') = '' or coalesce(p->>'token_hash', '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'bad_pass');
  end if;
  delete from used_passes where expires_at < now() - interval '1 day';
  insert into used_passes (jti, expires_at) values (v_jti, to_timestamp((p->>'exp')::bigint))
  on conflict (jti) do nothing returning jti into v_ok;
  if v_ok is null then return jsonb_build_object('ok', false, 'reason', 'pass_used'); end if;

  begin
    v_reg := nullif(p->>'registered_at', '')::timestamptz;
  exception when others then
    v_reg := null;
  end;
  if v_reg > now() then v_reg := null; end if;

  insert into people (bd_member_id, display_name, email, registered_at)
  values (v_bd, left(coalesce(p->>'name', ''), 200), left(coalesce(p->>'email', ''), 320), v_reg)
  on conflict (bd_member_id) do update
    set display_name = case when excluded.display_name <> '' then excluded.display_name else people.display_name end,
        email = case when excluded.email <> '' then excluded.email else people.email end,
        registered_at = coalesce(people.registered_at, excluded.registered_at),
        last_seen_at = now(), updated_at = now()
  returning * into v_person;

  if v_person.status = 'closed' then return jsonb_build_object('ok', false, 'reason', 'closed'); end if;

  -- First owner: on a copy with no owner yet, the member named in bootstrap.owner_bd_member_id becomes owner
  -- at first sign in. This is how Stacey becomes owner of Live without anyone touching Live by hand.
  if not exists (select 1 from staff_roles where role = 'owner' and revoked_at is null)
     and coalesce((dela_setting('bootstrap.owner_bd_member_id') #>> '{}')::bigint, 0) = v_bd then
    insert into staff_roles (person_id, role) values (v_person.id, 'owner');
    perform dela_audit('system', v_person.id, 'first_owner_set', 'person', v_person.id::text, '{}', p->>'ip');
  end if;
  v_staff := dela_is_staff(v_person.id);


  if not dela_may_open(v_person.id) then
    perform dela_audit('member', v_person.id, 'access_denied', 'person', v_person.id::text, jsonb_build_object('reason', 'not_on_access_list'), p->>'ip');
    return jsonb_build_object('ok', false, 'reason', 'no_access');
  end if;

  if (p->>'bd_plan_id') ~ '^[0-9]+$' then
    select * into v_plan from plans where bd_plan_id = (p->>'bd_plan_id')::bigint;
    if v_plan.code is not null then perform dela_ensure_side(v_person.id, v_plan.side, v_plan.code, 'bd'); end if;
  end if;

  -- One trial per member, for new registrations only. It runs from the BD sign up date, so a member who opens
  -- DELA late gets what is left of it. When it ends, the member is back on their own plan with their data intact.
  v_days := coalesce((dela_setting('trial.days') #>> '{}')::int, 7);
  if dela_switch_on('trials', v_person.id) and v_person.trial_started_at is null
     and exists (select 1 from side_profiles where person_id = v_person.id) then
    if dela_setting_text('trial.starts', 'registration') = 'registration' then
      if v_person.registered_at is not null
         and v_person.registered_at >= coalesce(nullif(dela_setting_text('trial.eligible_from', ''), '')::date, '1970-01-01'::date) then
        update people set trial_started_at = registered_at, trial_ends_at = registered_at + make_interval(days => v_days) where id = v_person.id;
      end if;
    elsif dela_setting_text('trial.starts', '') = 'first_dela_login' then
      update people set trial_started_at = now(), trial_ends_at = now() + make_interval(days => v_days) where id = v_person.id;
    end if;
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
end $function$;

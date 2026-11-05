-- Wording (Stacey 2026-11-05): "A AK license" read wrong, and the license email said "the button" while the button says "Open DELA".
-- Additive: a helper for a or an, and the three messages redefined.

-- "a" or "an" before a state code, by how its first letter sounds: an AK, an IL, an NY, a TX, a CA
create or replace function dela_a(p text) returns text language sql immutable as $$
  select case when upper(left(coalesce(p, ''), 1)) in ('A', 'E', 'F', 'H', 'I', 'L', 'M', 'N', 'O', 'R', 'S', 'X') then 'an' else 'a' end
$$;

create or replace function dela_license_add(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
declare
  v_why text := dela_profile_editable(p_person, 'attorney'); l licenses; v_country text := upper(btrim(coalesce(p->>'country', 'US')));
  v_region text := upper(btrim(coalesce(p->>'region', ''))); v_num text := btrim(coalesce(p->>'bar_number', '')); v_key text;
  v_email text := lower(btrim(coalesce(p->>'contact_email', ''))); v_method text := coalesce(p->>'method', 'email'); v_dup uuid; v_id uuid := gen_random_uuid();
begin
  if v_why <> '' then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  if not dela_switch_on('attorney_verification', p_person) then return jsonb_build_object('ok', false, 'reason', 'verification_off'); end if;
  select * into l from licenses where person_id = p_person and request_id = left(coalesce(p->>'request_id', ''), 80);
  if l.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', l.id, 'status', l.status); end if;
  if coalesce(p->>'request_id', '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if not (dela_setting('verify.countries') ? v_country) then return jsonb_build_object('ok', false, 'reason', 'country_not_yet'); end if;
  if v_country = 'US' and not (v_region = any(dela_us_regions())) then return jsonb_build_object('ok', false, 'reason', 'bad_region'); end if;
  v_key := upper(regexp_replace(v_num, '[^A-Za-z0-9]', '', 'g'));
  if length(v_key) < 2 or length(v_num) > 40 then return jsonb_build_object('ok', false, 'reason', 'bad_bar_number'); end if;
  if length(btrim(coalesce(p->>'name_on_record', ''))) < 3 then return jsonb_build_object('ok', false, 'reason', 'name_needed'); end if;
  if v_method not in ('email', 'video') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if v_method = 'email' then
    if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' or length(v_email) > 200 then return jsonb_build_object('ok', false, 'reason', 'bad_email'); end if;
    if dela_free_email(v_email) then return jsonb_build_object('ok', false, 'reason', 'free_email'); end if;
    if coalesce(p->>'token_hash', '') = '' or coalesce(p->>'token', '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  end if;
  if exists (select 1 from licenses where person_id = p_person and country = v_country and region = v_region and bar_key = v_key and status in ('pending', 'needs_more', 'verified')) then
    return jsonb_build_object('ok', false, 'reason', 'already_added');
  end if;
  if (select count(*) from licenses where person_id = p_person and created_at > now() - interval '1 day') >= 10 then return jsonb_build_object('ok', false, 'reason', 'too_many'); end if;
  -- The same license on another account is flagged for the team, never passed
  select id into v_dup from licenses where person_id <> p_person and country = v_country and region = v_region and bar_key = v_key and status in ('pending', 'needs_more', 'verified')
  order by (status = 'verified') desc, created_at limit 1;
  insert into licenses (id, person_id, request_id, country, region, bar_number, bar_key, name_on_record, contact_email, method, duplicate_of, video_requested_at)
  values (v_id, p_person, left(p->>'request_id', 80), v_country, v_region, left(v_num, 40), v_key, left(btrim(p->>'name_on_record'), 200), v_email, v_method, v_dup,
    case when v_method = 'video' then now() end)
  returning * into l;
  perform dela_verify_event('license', l.id, p_person, 'member', p_person, 'added', jsonb_build_object('region', v_region, 'method', v_method, 'duplicate', v_dup is not null,
    'email_domain', dela_email_domain(v_email)));
  if v_method = 'email' then perform dela_license_email(p_person, l.id, p->>'token', p->>'token_hash'); end if;
  perform dela_alert('verification', 'A license is waiting for a check', initcap(dela_a(v_region)) || ' ' || v_region || ' license was added' || case when v_dup is not null then ' (the same number is on another account)' else '' end || '. Open the admin area, Verification.',
    'licadd:' || l.id);
  perform dela_audit('member', p_person, 'license_added', 'license', l.id::text, jsonb_build_object('region', v_region, 'method', v_method));
  return jsonb_build_object('ok', true, 'duplicate', false, 'id', l.id, 'status', l.status, 'state', dela_profile_refresh(p_person, 'attorney'));
end $$;

create or replace function dela_license_action(p_person uuid, p_license uuid, p_action text) returns jsonb language plpgsql as $$
declare l licenses;
begin
  select * into l from licenses where id = p_license and person_id = p_person for update;
  if l.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_action = 'video' then
    if l.status not in ('pending', 'needs_more') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
    if l.video_requested_at > now() - interval '1 day' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    update licenses set video_requested_at = now(), updated_at = now() where id = l.id;
    perform dela_verify_event('license', l.id, p_person, 'member', p_person, 'video_requested', '{}');
    perform dela_alert('verification', 'An attorney asked for a confirming video call', 'For ' || dela_a(l.region) || ' ' || l.region || ' license. Open the admin area, Verification.', 'licvideo:' || l.id || ':' || now()::date);
  elsif p_action = 'withdraw' then
    if l.status = 'withdrawn' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    update licenses set status = 'withdrawn', updated_at = now() where id = l.id;
    perform dela_verify_event('license', l.id, p_person, 'member', p_person, 'withdrawn', '{}');
  else
    return jsonb_build_object('ok', false, 'reason', 'bad_request');
  end if;
  return jsonb_build_object('ok', true, 'state', dela_profile_refresh(p_person, 'attorney'));
end $$;

create or replace function dela_license_email(p_person uuid, p_license uuid, p_token text, p_token_hash text) returns jsonb language plpgsql as $$
declare l licenses; v_n uuid;
begin
  select * into l from licenses where id = p_license and person_id = p_person;
  if l.id is null or l.method <> 'email' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if l.status not in ('pending', 'needs_more') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if l.email_confirmed_at is not null then return jsonb_build_object('ok', true, 'already_confirmed', true); end if;
  if (select count(*) from email_checks where license_id = l.id and created_at > now() - interval '1 hour') >= 3 then return jsonb_build_object('ok', false, 'reason', 'wait_a_little'); end if;
  if coalesce(p_token_hash, '') = '' or coalesce(p_token, '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  insert into notifications (person_id, side, kind, channel, essential, title, body, link, dedupe_key, to_email)
  values (p_person, 'attorney', 'verification', 'email', true, 'Confirm this email for your license',
    'You added ' || dela_a(l.region) || ' ' || l.region || ' license (number ' || l.bar_number || ') in DELA. To confirm this email address, log in to Lawfecta as yourself, then click "Open DELA" below. The link works for '
      || dela_int_setting('verify.email_link_hours', 24) || ' hours. If this was not you, ignore this email.',
    '/dela?tab=profile&confirm=' || p_token, 'licmail:' || p_token_hash, l.contact_email)
  returning id into v_n;
  insert into email_checks (token_hash, person_id, license_id, email, expires_at, notification_id)
  values (p_token_hash, p_person, l.id, l.contact_email, now() + make_interval(hours => dela_int_setting('verify.email_link_hours', 24)), v_n);
  perform dela_job_enqueue('send_email', jsonb_build_object('notification_id', v_n), now(), 'email:' || v_n::text, p_person);
  perform dela_verify_event('license', l.id, p_person, 'member', p_person, 'email_sent', jsonb_build_object('email_domain', dela_email_domain(l.contact_email)));
  return jsonb_build_object('ok', true);
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

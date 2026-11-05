-- The "license email bounced" alert names the member and the state, so the team knows where to look (Stacey 2026-11-05). Additive.

create or replace function dela_notification_delivery(p_notification uuid, p_state text, p_reason text) returns jsonb language plpgsql as $$
declare n notifications; v_lic uuid; v_region text; v_bd bigint;
begin
  select * into n from notifications where id = p_notification for update;
  if n.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_state not in ('delivered', 'bounced', 'waiting', 'unknown') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if n.delivery_state in ('delivered', 'bounced') then return jsonb_build_object('ok', true, 'duplicate', true, 'state', n.delivery_state); end if;
  update notifications set delivery_state = p_state, delivery_reason = left(coalesce(p_reason, ''), 200), delivery_checked_at = now() where id = n.id;
  if p_state = 'bounced' then
    select e.license_id, l.region, pe.bd_member_id into v_lic, v_region, v_bd from email_checks e join licenses l on l.id = e.license_id join people pe on pe.id = l.person_id where e.notification_id = n.id;
    if v_lic is not null then
      perform dela_verify_event('license', v_lic, n.person_id, 'worker', null, 'email_bounced', jsonb_build_object('reason', left(coalesce(p_reason, ''), 200)));
      perform dela_alert('verification', 'A license email bounced', 'The confirmation email for member ' || v_bd || '''s ' || v_region || ' license could not be delivered (' || left(coalesce(p_reason, ''), 120) || '). The attorney is told on their Profile. Open the admin area, Verification.',
        'licbounce:' || n.id);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'state', p_state);
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

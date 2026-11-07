-- AI review of 0.9.0 (security 5): with two sites (hirelegalhelp.com for testing, lawfecta.com for Live) the
-- "Test site account" list is not needed, and on Live it would send a real member's sign-in toward the test copy,
-- which has other member numbers. Nobody can be added to it any more, and anyone still on it is taken off.
-- Additive: the grant function keeps its arguments; the list's column and the sign-in code stay for older versions.

create or replace function dela_admin_access_grant(p_actor uuid, p_bd bigint, p_channel text, p_note text) returns jsonb language plpgsql as $$
declare v bigint;
begin
  perform dela_require_staff(p_actor, '{}');
  if p_bd is null or p_bd <= 0 then return jsonb_build_object('ok', false, 'reason', 'bad_member_id'); end if;
  if p_channel is distinct from 'access' then return jsonb_build_object('ok', false, 'reason', 'bad_channel'); end if;
  insert into access_list (bd_member_id, channel, note, granted_by) values (p_bd, p_channel, left(coalesce(p_note, ''), 200), p_actor)
  on conflict (bd_member_id, channel) where revoked_at is null do nothing returning id into v;
  if v is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  perform dela_audit('staff', p_actor, 'access_granted', 'access_list', v::text, jsonb_build_object('bd_member_id', p_bd, 'channel', p_channel));
  return jsonb_build_object('ok', true, 'id', v);
end $$;

update access_list set revoked_at = now() where channel = 'staging_tester' and revoked_at is null;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure::text as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'dela_admin_access_grant' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

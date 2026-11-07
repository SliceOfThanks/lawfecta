-- AI review of 0.9.0 (payments 2, tests 3): "Grant bonus actions" could add the bonus twice on a double click. The grant now
-- carries a request ID made once per form; a repeat with the same ID adds nothing and answers as the first did.
-- Additive: a nullable column, a unique index, and the grant function with one more argument (the old one stays).

alter table usage_bonus add column if not exists request_id text;
create unique index if not exists usage_bonus_request_id on usage_bonus (request_id) where request_id is not null;

create or replace function dela_admin_usage_bonus(p_actor uuid, p_person uuid, p_amount int, p_note text, p_request text) returns jsonb language plpgsql as $$
declare v_who uuid; v_id uuid; v_req text := nullif(left(btrim(coalesce(p_request, '')), 80), '');
begin
  perform dela_require_staff(p_actor, '{}');
  if v_req is not null then
    select id into v_id from usage_bonus where request_id = v_req;
    if v_id is not null then return jsonb_build_object('ok', true, 'id', v_id, 'duplicate', true); end if;
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then return jsonb_build_object('ok', false, 'reason', 'bad_amount'); end if;
  if length(trim(coalesce(p_note, ''))) = 0 then return jsonb_build_object('ok', false, 'reason', 'note_required'); end if;
  if not exists (select 1 from side_profiles where person_id = p_person and side = 'attorney' and status <> 'closed') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_who := dela_quota_subject(p_person, 'attorney', 'ai.runs');
  insert into usage_bonus (person_id, side, feature_key, period_start, amount, note, granted_by, request_id)
  values (v_who, 'attorney', 'ai.runs', dela_period_start('month'), p_amount, left(trim(p_note), 500), p_actor, v_req)
  on conflict (request_id) where request_id is not null do nothing returning id into v_id;
  if v_id is null then
    select id into v_id from usage_bonus where request_id = v_req;
    return jsonb_build_object('ok', true, 'id', v_id, 'duplicate', true);
  end if;
  perform dela_audit('staff', p_actor, 'usage_bonus_granted', 'person', p_person::text, jsonb_build_object('amount', p_amount, 'note', left(trim(p_note), 500), 'counter', v_who));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure::text as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'dela_admin_usage_bonus' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

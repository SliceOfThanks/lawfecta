-- Step 62: the Members page inside DELA, for the Lawfecta Team (Stacey 2026-11-20: "on DELA (not DELA-admin)
-- there needs to be an admin account to manage users, similar to the BD backend").
-- The page reads people with search, filters and pages, opens one member with everything about them in one place,
-- and lets the owner close or reopen a DELA account. Giving a workspace and plan, the access list and holds keep
-- their own functions (0004); the page calls those.
-- Additive: three functions. Nothing is deleted; closing an account is a status and is undone by reopening.

-- p_filter: all, attorney, freelancer, access, no_access, hold, closed, team
create or replace function dela_members_list(p_actor uuid, p_q text, p_filter text, p_limit int default 25, p_offset int default 0)
returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_q text := btrim(coalesce(p_q, '')); v_f text := coalesce(nullif(p_filter, ''), 'all'); v_total int; v_rows jsonb;
  v_limit int := least(greatest(coalesce(p_limit, 25), 1), 100); v_offset int := greatest(coalesce(p_offset, 0), 0);
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  if v_f not in ('all', 'attorney', 'freelancer', 'access', 'no_access', 'hold', 'closed', 'team') then v_f := 'all'; end if;
  select count(*) into v_total from people p
  where (v_q = '' or p.display_name ilike '%' || v_q || '%' or p.email ilike '%' || v_q || '%' or p.bd_member_id::text = v_q)
    and case v_f
      when 'attorney' then exists (select 1 from side_profiles sp where sp.person_id = p.id and sp.side = 'attorney')
      when 'freelancer' then exists (select 1 from side_profiles sp where sp.person_id = p.id and sp.side = 'freelancer')
      when 'access' then dela_on_list(p.bd_member_id, 'access')
      when 'no_access' then not dela_on_list(p.bd_member_id, 'access') and not dela_is_staff(p.id)
      when 'hold' then dela_has_hold(p.id)
      when 'closed' then p.status = 'closed'
      when 'team' then dela_is_staff(p.id)
      else true end;
  select coalesce(jsonb_agg(x), '[]') into v_rows from (
    select jsonb_build_object('id', p.id, 'bd_member_id', p.bd_member_id, 'name', p.display_name, 'email', p.email, 'status', p.status,
      'last_seen_at', p.last_seen_at, 'first_seen_at', p.first_seen_at, 'staff', to_jsonb(dela_staff_roles(p.id)),
      'access', dela_on_list(p.bd_member_id, 'access'), 'on_hold', dela_has_hold(p.id),
      'sides', coalesce((select jsonb_agg(jsonb_build_object('side', sp.side, 'plan_code', sp.plan_code, 'plan_name', pl.name, 'plan_source', sp.plan_source,
               'verification_state', sp.verification_state, 'readiness_state', sp.readiness_state) order by sp.side)
               from side_profiles sp left join plans pl on pl.code = sp.plan_code where sp.person_id = p.id), '[]')) x
    from people p
    where (v_q = '' or p.display_name ilike '%' || v_q || '%' or p.email ilike '%' || v_q || '%' or p.bd_member_id::text = v_q)
      and case v_f
        when 'attorney' then exists (select 1 from side_profiles sp where sp.person_id = p.id and sp.side = 'attorney')
        when 'freelancer' then exists (select 1 from side_profiles sp where sp.person_id = p.id and sp.side = 'freelancer')
        when 'access' then dela_on_list(p.bd_member_id, 'access')
        when 'no_access' then not dela_on_list(p.bd_member_id, 'access') and not dela_is_staff(p.id)
        when 'hold' then dela_has_hold(p.id)
        when 'closed' then p.status = 'closed'
        when 'team' then dela_is_staff(p.id)
        else true end
    order by p.last_seen_at desc nulls last, p.bd_member_id limit v_limit offset v_offset) t;
  return jsonb_build_object('ok', true, 'total', v_total, 'limit', v_limit, 'offset', v_offset, 'filter', v_f, 'people', v_rows,
    'access_mode', dela_setting_text('access.mode', 'access_list'), 'owner', dela_staff_roles(p_actor) @> array['owner']);
end $$;
revoke all on function dela_members_list(uuid, text, text, int, int) from public, anon, authenticated;

-- One member: the account, each workspace, the access list entry, holds, what they made, and the Team's last actions on them
create or replace function dela_member_detail(p_actor uuid, p_bd bigint)
returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare p people;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  select * into p from people where bd_member_id = p_bd;
  if p.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'owner', dela_staff_roles(p_actor) @> array['owner'], 'self', p.id = p_actor,
    'person', jsonb_build_object('id', p.id, 'bd_member_id', p.bd_member_id, 'name', p.display_name, 'email', p.email, 'status', p.status,
      'first_seen_at', p.first_seen_at, 'last_seen_at', p.last_seen_at, 'registered_at', p.registered_at,
      'trial_ends_at', p.trial_ends_at, 'staff', to_jsonb(dela_staff_roles(p.id)), 'may_open', dela_may_open(p.id)),
    'sides', coalesce((select jsonb_agg(jsonb_build_object('side', sp.side, 'plan_code', sp.plan_code, 'plan_name', pl.name, 'plan_source', sp.plan_source,
        'verification_state', sp.verification_state, 'readiness_state', sp.readiness_state, 'status', sp.status,
        'org', (select coalesce(nullif(o.business_name, ''), o.name) from organizations o where o.id = sp.org_id)) order by sp.side)
      from side_profiles sp left join plans pl on pl.code = sp.plan_code where sp.person_id = p.id), '[]'),
    'access', (select jsonb_build_object('id', a.id, 'note', a.note, 'granted_at', a.granted_at) from access_list a
      where a.bd_member_id = p.bd_member_id and a.channel = 'access' and a.revoked_at is null order by a.granted_at desc limit 1),
    'holds', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'reason', h.reason, 'severity', h.severity, 'rule', h.rule, 'created_at', h.created_at) order by h.created_at desc)
      from holds h where h.scope_type = 'person' and h.scope_id = p.id::text and h.state = 'active'), '[]'),
    'counts', jsonb_build_object(
      'documents', (select count(*) from playbooks b where b.created_by = p.id and b.status not in ('deleted', 'trash')),
      'gigs', (select count(*) from gigs g where g.created_by = p.id),
      'firms', (select count(*) from org_members m where m.person_id = p.id and m.status = 'active')),
    'history', coalesce((select jsonb_agg(x) from (select jsonb_build_object('at', l.at, 'action', l.action,
        'by', (select display_name from people where id = l.actor_id), 'detail', l.detail) x
      from audit_log l where l.actor_type = 'staff' and l.object_type = 'person' and l.object_id = p.id::text order by l.at desc limit 15) t), '[]'));
end $$;
revoke all on function dela_member_detail(uuid, bigint) from public, anon, authenticated;

-- Close or reopen a DELA account. Owner only. A closed account cannot open DELA; its website (BD) account is untouched
-- and nothing is deleted. Closing ends every open session at once. The same call twice changes nothing.
create or replace function dela_member_status_set(p_actor uuid, p_bd bigint, p_status text, p_reason text)
returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare p people; v_reason text := btrim(coalesce(p_reason, ''));
begin
  perform dela_require_staff(p_actor, '{}');
  if p_status not in ('active', 'closed') then return jsonb_build_object('ok', false, 'reason', 'bad_status'); end if;
  select * into p from people where bd_member_id = p_bd for update;
  if p.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p.status = p_status then return jsonb_build_object('ok', true, 'duplicate', true, 'status', p.status); end if;
  if p_status = 'closed' then
    if p.id = p_actor then return jsonb_build_object('ok', false, 'reason', 'not_yourself'); end if;
    if dela_is_staff(p.id) then return jsonb_build_object('ok', false, 'reason', 'team_member'); end if;
    if length(v_reason) < 5 then return jsonb_build_object('ok', false, 'reason', 'reason_needed'); end if;
  end if;
  update people set status = p_status, updated_at = now() where id = p.id;
  if p_status = 'closed' then perform dela_revoke_person(p.id); end if;
  perform dela_audit('staff', p_actor, case when p_status = 'closed' then 'account_closed' else 'account_reopened' end, 'person', p.id::text,
    jsonb_build_object('reason', left(v_reason, 500), 'was', p.status));
  return jsonb_build_object('ok', true, 'status', p_status);
end $$;
revoke all on function dela_member_status_set(uuid, bigint, text, text) from public, anon, authenticated;

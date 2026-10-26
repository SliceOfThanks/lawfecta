-- Lawfecta Team admin functions (Step 1). Each one checks the caller's staff role itself.
-- owner: everything. reviewer, support, finance: read the admin area; their own tools arrive in later steps.

create or replace function dela_require_staff(p_actor uuid, p_roles text[]) returns void language plpgsql stable as $$
begin
  if p_actor is null or not exists (
    select 1 from staff_roles where person_id = p_actor and revoked_at is null and (role = 'owner' or role = any(p_roles))) then
    raise exception 'forbidden';
  end if;
end $$;

create or replace function dela_admin_overview(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return jsonb_build_object(
    'environment', dela_setting_text('environment', 'staging'),
    'access_mode', dela_setting_text('access.mode', 'access_list'),
    'people', (select count(*) from people),
    'signed_in_7d', (select count(distinct person_id) from sessions where created_at > now() - interval '7 days'),
    'sides', (select coalesce(jsonb_object_agg(plan_code, n), '{}') from (select plan_code, count(*) n from side_profiles where status <> 'closed' group by plan_code) t),
    'access_list', (select count(*) from access_list where channel = 'access' and revoked_at is null),
    'staging_testers', (select count(*) from access_list where channel = 'staging_tester' and revoked_at is null),
    'denied_7d', (select count(*) from audit_log where action = 'access_denied' and at > now() - interval '7 days'),
    'switches_on', (select count(*) from feature_switches where state <> 'off'),
    'decisions', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from settings group by status) t),
    'unmapped_plans', (select count(*) from plans where bd_plan_id is null),
    'jobs', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from jobs where created_at > now() - interval '7 days' group by status) t),
    'holds_active', (select count(*) from holds where state = 'active'),
    'recent', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('at', a.at, 'action', a.action, 'actor', coalesce(p.display_name, a.actor_type), 'object_type', a.object_type) x
                from audit_log a left join people p on p.id = a.actor_id order by a.id desc limit 12) t)
  );
end $$;

-- ---------- Settings and decisions ----------

create or replace function dela_admin_settings(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return (select coalesce(jsonb_agg(jsonb_build_object('key', key, 'value', value, 'label', label, 'section', section, 'unit', unit,
            'status', status, 'source', source, 'note', note, 'version', version, 'updated_at', updated_at) order by section, key), '[]') from settings);
end $$;

-- Changes a business setting. The value must keep its type (a number stays a number).
-- Status C records it as approved by the owner in the decision log.
create or replace function dela_admin_set_setting(p_actor uuid, p_key text, p_value jsonb, p_status text, p_reason text) returns jsonb language plpgsql as $$
declare s settings; v_log bigint; v_prev bigint;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into s from settings where key = p_key for update;
  if s.key is null then return jsonb_build_object('ok', false, 'reason', 'unknown_setting'); end if;
  if p_key = 'environment' then return jsonb_build_object('ok', false, 'reason', 'locked_setting'); end if;
  if jsonb_typeof(p_value) <> jsonb_typeof(s.value) then return jsonb_build_object('ok', false, 'reason', 'wrong_type', 'expected', jsonb_typeof(s.value)); end if;
  if p_status not in ('C', 'R', 'O', 'G') then return jsonb_build_object('ok', false, 'reason', 'bad_status'); end if;
  if p_key = 'access.mode' and p_value #>> '{}' not in ('access_list', 'everyone') then return jsonb_build_object('ok', false, 'reason', 'bad_value'); end if;
  if p_key = 'payments.mode' and p_value #>> '{}' not in ('test', 'live') then return jsonb_build_object('ok', false, 'reason', 'bad_value'); end if;

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

create or replace function dela_admin_decisions(p_actor uuid, p_key text default null) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return (select coalesce(jsonb_agg(x), '[]') from (
    select jsonb_build_object('id', d.id, 'decision_id', d.decision_id, 'status', d.status, 'value', d.value, 'approved_at', d.approved_at,
             'version', d.version, 'note', d.note, 'recorded_at', d.recorded_at, 'by', p.display_name) x
    from decision_log d left join people p on p.id = d.recorded_by
    where p_key is null or d.decision_id = p_key order by d.id desc limit 200) t);
end $$;

-- ---------- Switches ----------

create or replace function dela_admin_switches(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return (select coalesce(jsonb_agg(jsonb_build_object('key', key, 'label', label, 'gate', gate, 'state', state, 'updated_at', updated_at) order by key), '[]') from feature_switches);
end $$;

create or replace function dela_admin_set_switch(p_actor uuid, p_key text, p_state text) returns jsonb language plpgsql as $$
declare s feature_switches;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into s from feature_switches where key = p_key for update;
  if s.key is null then return jsonb_build_object('ok', false, 'reason', 'unknown_switch'); end if;
  if p_state not in ('off', 'staff', 'list', 'everyone') then return jsonb_build_object('ok', false, 'reason', 'bad_state'); end if;
  update feature_switches set state = p_state, updated_by = p_actor, updated_at = now() where key = p_key;
  insert into decision_log (decision_id, status, approved_at, value, release_gate, note, recorded_by)
  values ('switch:' || p_key, 'C', now(), to_jsonb(p_state), s.gate, 'Switch changed from ' || s.state || ' to ' || p_state, p_actor);
  perform dela_audit('staff', p_actor, 'switch_changed', 'switch', p_key, jsonb_build_object('from', s.state, 'to', p_state));
  perform dela_emit('switch.changed', 'staff', p_actor, 'switch', p_key, jsonb_build_object('state', p_state));
  return jsonb_build_object('ok', true, 'state', p_state);
end $$;

-- ---------- Access list ----------

create or replace function dela_admin_access(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['support']);
  return (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'bd_member_id', a.bd_member_id, 'channel', a.channel, 'note', a.note,
            'granted_at', a.granted_at, 'name', p.display_name, 'email', p.email, 'last_seen_at', p.last_seen_at) order by a.granted_at desc), '[]')
          from access_list a left join people p on p.bd_member_id = a.bd_member_id where a.revoked_at is null);
end $$;

create or replace function dela_admin_access_grant(p_actor uuid, p_bd bigint, p_channel text, p_note text) returns jsonb language plpgsql as $$
declare v bigint;
begin
  perform dela_require_staff(p_actor, '{}');
  if p_bd is null or p_bd <= 0 then return jsonb_build_object('ok', false, 'reason', 'bad_member_id'); end if;
  if p_channel not in ('access', 'staging_tester') then return jsonb_build_object('ok', false, 'reason', 'bad_channel'); end if;
  insert into access_list (bd_member_id, channel, note, granted_by) values (p_bd, p_channel, left(coalesce(p_note, ''), 200), p_actor)
  on conflict (bd_member_id, channel) where revoked_at is null do nothing returning id into v;
  if v is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  perform dela_audit('staff', p_actor, 'access_granted', 'access_list', v::text, jsonb_build_object('bd_member_id', p_bd, 'channel', p_channel));
  return jsonb_build_object('ok', true, 'id', v);
end $$;

-- Removing access ends the person's sessions right away
create or replace function dela_admin_access_revoke(p_actor uuid, p_id bigint) returns jsonb language plpgsql as $$
declare a access_list; v_person uuid;
begin
  perform dela_require_staff(p_actor, '{}');
  update access_list set revoked_at = now(), revoked_by = p_actor where id = p_id and revoked_at is null returning * into a;
  if a.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select id into v_person from people where bd_member_id = a.bd_member_id;
  if v_person is not null then perform dela_revoke_person(v_person); end if;
  perform dela_audit('staff', p_actor, 'access_revoked', 'access_list', a.id::text, jsonb_build_object('bd_member_id', a.bd_member_id, 'channel', a.channel));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Lawfecta Team ----------

create or replace function dela_admin_staff(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'person_id', s.person_id, 'role', s.role, 'name', p.display_name,
            'email', p.email, 'bd_member_id', p.bd_member_id, 'granted_at', s.granted_at) order by s.granted_at), '[]')
          from staff_roles s join people p on p.id = s.person_id where s.revoked_at is null);
end $$;

-- The person must have signed in to DELA once so their BD member ID is known
create or replace function dela_admin_staff_grant(p_actor uuid, p_bd bigint, p_role text) returns jsonb language plpgsql as $$
declare v_person uuid; v bigint;
begin
  perform dela_require_staff(p_actor, '{}');
  if p_role not in ('owner', 'reviewer', 'support', 'finance') then return jsonb_build_object('ok', false, 'reason', 'bad_role'); end if;
  select id into v_person from people where bd_member_id = p_bd;
  if v_person is null then return jsonb_build_object('ok', false, 'reason', 'never_signed_in'); end if;
  insert into staff_roles (person_id, role, granted_by) values (v_person, p_role, p_actor)
  on conflict (person_id, role) where revoked_at is null do nothing returning id into v;
  if v is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  perform dela_revoke_person(v_person);
  perform dela_audit('staff', p_actor, 'staff_granted', 'person', v_person::text, jsonb_build_object('role', p_role));
  return jsonb_build_object('ok', true, 'id', v);
end $$;

create or replace function dela_admin_staff_revoke(p_actor uuid, p_id bigint) returns jsonb language plpgsql as $$
declare s staff_roles;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into s from staff_roles where id = p_id and revoked_at is null for update;
  if s.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if s.role = 'owner' and (select count(*) from staff_roles where role = 'owner' and revoked_at is null) <= 1 then
    return jsonb_build_object('ok', false, 'reason', 'last_owner');
  end if;
  update staff_roles set revoked_at = now(), revoked_by = p_actor where id = s.id;
  perform dela_revoke_person(s.person_id);
  perform dela_audit('staff', p_actor, 'staff_revoked', 'person', s.person_id::text, jsonb_build_object('role', s.role));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- People and sides ----------

create or replace function dela_admin_people(p_actor uuid, p_q text, p_limit int default 50) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return (select coalesce(jsonb_agg(x), '[]') from (
    select jsonb_build_object('id', p.id, 'bd_member_id', p.bd_member_id, 'name', p.display_name, 'email', p.email, 'status', p.status,
      'last_seen_at', p.last_seen_at, 'staff', to_jsonb(dela_staff_roles(p.id)),
      'access', dela_on_list(p.bd_member_id, 'access'), 'staging_tester', dela_on_list(p.bd_member_id, 'staging_tester'),
      'sides', coalesce((select jsonb_agg(jsonb_build_object('side', sp.side, 'plan_code', sp.plan_code, 'plan_source', sp.plan_source,
               'verification_state', sp.verification_state, 'readiness_state', sp.readiness_state, 'status', sp.status)) from side_profiles sp where sp.person_id = p.id), '[]')) x
    from people p
    where coalesce(p_q, '') = '' or p.display_name ilike '%' || p_q || '%' or p.email ilike '%' || p_q || '%' or p.bd_member_id::text = p_q
    order by p.last_seen_at desc limit least(greatest(p_limit, 1), 200)) t);
end $$;

-- Gives a person a side and plan by hand (test accounts, a second side, comped plans). BD plan changes do not override it.
create or replace function dela_admin_grant_side(p_actor uuid, p_bd bigint, p_side text, p_plan text) returns jsonb language plpgsql as $$
declare v_person uuid; v_plan plans;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into v_plan from plans where code = p_plan;
  if v_plan.code is null or v_plan.side <> p_side then return jsonb_build_object('ok', false, 'reason', 'bad_plan'); end if;
  if p_bd is null or p_bd <= 0 then return jsonb_build_object('ok', false, 'reason', 'bad_member_id'); end if;
  insert into people (bd_member_id) values (p_bd) on conflict (bd_member_id) do nothing;
  select id into v_person from people where bd_member_id = p_bd;
  perform dela_ensure_side(v_person, p_side, p_plan, 'staff_grant');
  update side_profiles set plan_code = p_plan, plan_source = 'staff_grant', updated_at = now() where person_id = v_person and side = p_side;
  perform dela_audit('staff', p_actor, 'side_granted', 'person', v_person::text, jsonb_build_object('side', p_side, 'plan', p_plan));
  return jsonb_build_object('ok', true, 'person_id', v_person);
end $$;

-- Hands a side back to BD: the plan follows the member's BD plan again from their next sign in
create or replace function dela_admin_release_side(p_actor uuid, p_bd bigint, p_side text) returns jsonb language plpgsql as $$
declare v_person uuid; n int;
begin
  perform dela_require_staff(p_actor, '{}');
  select id into v_person from people where bd_member_id = p_bd;
  update side_profiles set plan_source = 'bd', updated_at = now() where person_id = v_person and side = p_side and plan_source = 'staff_grant';
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform dela_audit('staff', p_actor, 'side_released', 'person', v_person::text, jsonb_build_object('side', p_side));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Plans ----------

create or replace function dela_plan_json(p_version bigint) returns jsonb language sql stable as $$
  select jsonb_build_object('id', v.id, 'version', v.version, 'status', v.status, 'monthly_cents', v.monthly_cents, 'annual_cents', v.annual_cents,
    'fee_bps', v.fee_bps, 'approved_at', v.approved_at, 'note', v.note,
    'features', coalesce((select jsonb_object_agg(pf.feature_key, jsonb_build_object('enabled', pf.enabled, 'limit', pf.quota_limit)) from plan_features pf where pf.plan_version_id = v.id), '{}'))
  from plan_versions v where v.id = p_version
$$;

create or replace function dela_admin_plans(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return jsonb_build_object(
    'plans', (select coalesce(jsonb_agg(jsonb_build_object('code', pl.code, 'side', pl.side, 'tier', pl.tier, 'name', pl.name, 'bd_plan_id', pl.bd_plan_id,
               'approved', (select dela_plan_json(id) from plan_versions where plan_code = pl.code and status = 'approved'),
               'draft', (select dela_plan_json(id) from plan_versions where plan_code = pl.code and status = 'draft' order by version desc limit 1),
               'members', (select count(*) from side_profiles sp where sp.plan_code = pl.code and sp.status <> 'closed'))
             order by pl.side, pl.sort), '[]') from plans pl),
    'features', (select coalesce(jsonb_agg(jsonb_build_object('key', key, 'side', side, 'label', label, 'unit', unit, 'period', period, 'kind', kind, 'status', status, 'note', note) order by side, key), '[]') from features));
end $$;

create or replace function dela_admin_plan_map(p_actor uuid, p_plan text, p_bd_plan bigint) returns jsonb language plpgsql as $$
begin
  perform dela_require_staff(p_actor, '{}');
  if not exists (select 1 from plans where code = p_plan) then return jsonb_build_object('ok', false, 'reason', 'bad_plan'); end if;
  if p_bd_plan is not null and exists (select 1 from plans where bd_plan_id = p_bd_plan and code <> p_plan) then
    return jsonb_build_object('ok', false, 'reason', 'bd_plan_in_use');
  end if;
  update plans set bd_plan_id = p_bd_plan where code = p_plan;
  perform dela_audit('staff', p_actor, 'plan_mapped', 'plan', p_plan, jsonb_build_object('bd_plan_id', p_bd_plan));
  return jsonb_build_object('ok', true);
end $$;

-- Saves a new draft version of a plan. Features left out keep the approved version's values.
-- p: monthly_cents, annual_cents (or null), fee_bps, note, features {key: {enabled, limit}}
create or replace function dela_admin_plan_draft(p_actor uuid, p_plan text, p jsonb) returns jsonb language plpgsql as $$
declare v_app plan_versions; v_new bigint; v_num int; k text; f jsonb;
begin
  perform dela_require_staff(p_actor, '{}');
  if not exists (select 1 from plans where code = p_plan) then return jsonb_build_object('ok', false, 'reason', 'bad_plan'); end if;
  select * into v_app from plan_versions where plan_code = p_plan and status = 'approved';
  delete from plan_features where plan_version_id in (select id from plan_versions where plan_code = p_plan and status = 'draft');
  delete from plan_versions where plan_code = p_plan and status = 'draft';
  select coalesce(max(version), 0) + 1 into v_num from plan_versions where plan_code = p_plan;
  insert into plan_versions (plan_code, version, monthly_cents, annual_cents, fee_bps, note)
  values (p_plan, v_num,
    coalesce((p->>'monthly_cents')::int, v_app.monthly_cents, 0),
    case when p ? 'annual_cents' then (p->>'annual_cents')::int else v_app.annual_cents end,
    coalesce((p->>'fee_bps')::int, v_app.fee_bps, 500),
    left(coalesce(p->>'note', ''), 500))
  returning id into v_new;
  insert into plan_features (plan_version_id, feature_key, enabled, quota_limit)
  select v_new, pf.feature_key, pf.enabled, pf.quota_limit from plan_features pf where pf.plan_version_id = v_app.id;
  for k, f in select * from jsonb_each(coalesce(p->'features', '{}')) loop
    if not exists (select 1 from features where key = k) then raise exception 'unknown_feature %', k; end if;
    insert into plan_features (plan_version_id, feature_key, enabled, quota_limit)
    values (v_new, k, coalesce((f->>'enabled')::boolean, true), (f->>'limit')::int)
    on conflict (plan_version_id, feature_key) do update set enabled = excluded.enabled, quota_limit = excluded.quota_limit;
  end loop;
  perform dela_audit('staff', p_actor, 'plan_draft_saved', 'plan', p_plan, jsonb_build_object('version', v_num));
  return jsonb_build_object('ok', true, 'version_id', v_new, 'version', v_num);
end $$;

-- Approving a draft makes it the plan everyone on it gets now. The old version is kept, retired.
create or replace function dela_admin_plan_approve(p_actor uuid, p_version bigint) returns jsonb language plpgsql as $$
declare v plan_versions;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into v from plan_versions where id = p_version for update;
  if v.id is null or v.status <> 'draft' then return jsonb_build_object('ok', false, 'reason', 'not_a_draft'); end if;
  update plan_versions set status = 'retired' where plan_code = v.plan_code and status = 'approved';
  update plan_versions set status = 'approved', approved_by = p_actor, approved_at = now(), effective_from = now() where id = v.id;
  insert into decision_log (decision_id, status, approved_at, version, value, note, recorded_by)
  values ('plan:' || v.plan_code, 'C', now(), v.version::text, dela_plan_json(v.id), 'Plan version approved', p_actor);
  perform dela_audit('staff', p_actor, 'plan_approved', 'plan', v.plan_code, jsonb_build_object('version', v.version));
  perform dela_emit('plan.approved', 'staff', p_actor, 'plan', v.plan_code, jsonb_build_object('version', v.version));
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_admin_plan_discard(p_actor uuid, p_version bigint) returns jsonb language plpgsql as $$
begin
  perform dela_require_staff(p_actor, '{}');
  if not exists (select 1 from plan_versions where id = p_version and status = 'draft') then return jsonb_build_object('ok', false, 'reason', 'not_a_draft'); end if;
  delete from plan_features where plan_version_id = p_version;
  delete from plan_versions where id = p_version;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Audit, jobs, holds ----------

create or replace function dela_admin_audit(p_actor uuid, p_before bigint default null, p_limit int default 100) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return (select coalesce(jsonb_agg(x), '[]') from (
    select jsonb_build_object('id', a.id, 'at', a.at, 'actor_type', a.actor_type, 'actor', p.display_name, 'action', a.action,
             'object_type', a.object_type, 'object_id', a.object_id, 'detail', a.detail) x
    from audit_log a left join people p on p.id = a.actor_id
    where p_before is null or a.id < p_before order by a.id desc limit least(greatest(p_limit, 1), 500)) t);
end $$;

create or replace function dela_admin_jobs(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['support']);
  return jsonb_build_object(
    'counts', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from jobs group by status) t),
    'recent_problems', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('id', id, 'kind', kind, 'status', status, 'attempts', attempts,
        'last_error', last_error, 'updated_at', updated_at) x from jobs where status in ('dead', 'delayed', 'failed') order by updated_at desc limit 30) t));
end $$;

create or replace function dela_admin_hold(p_actor uuid, p_bd bigint, p_reason text, p_severity text) returns jsonb language plpgsql as $$
declare v_person uuid; v uuid;
begin
  perform dela_require_staff(p_actor, array['support', 'finance']);
  select id into v_person from people where bd_member_id = p_bd;
  if v_person is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  insert into holds (scope_type, scope_id, rule, reason, severity, created_by)
  values ('person', v_person::text, 'manual', left(coalesce(p_reason, ''), 500), coalesce(p_severity, 'medium'), p_actor) returning id into v;
  perform dela_audit('staff', p_actor, 'hold_placed', 'person', v_person::text, jsonb_build_object('hold', v, 'reason', p_reason));
  return jsonb_build_object('ok', true, 'id', v);
end $$;

create or replace function dela_admin_hold_release(p_actor uuid, p_hold uuid, p_evidence text) returns jsonb language plpgsql as $$
declare h holds;
begin
  perform dela_require_staff(p_actor, array['support', 'finance']);
  update holds set state = 'released', released_by = p_actor, released_at = now(), release_evidence = left(coalesce(p_evidence, ''), 1000)
  where id = p_hold and state = 'active' returning * into h;
  if h.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform dela_audit('staff', p_actor, 'hold_released', h.scope_type, h.scope_id, jsonb_build_object('hold', h.id));
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_admin_holds(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['support', 'finance', 'reviewer']);
  return (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'scope_type', h.scope_type, 'scope_id', h.scope_id, 'name', p.display_name,
            'bd_member_id', p.bd_member_id, 'reason', h.reason, 'severity', h.severity, 'created_at', h.created_at) order by h.created_at desc), '[]')
          from holds h left join people p on h.scope_type = 'person' and p.id::text = h.scope_id where h.state = 'active');
end $$;

-- ---------- Only the service role may call any DELA function ----------

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'dela_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

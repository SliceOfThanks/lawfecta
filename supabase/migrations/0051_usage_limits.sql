-- Step 9b: attorney plan usage limits (docs/briefs/step-9b-attorney-usage-limits.md, Stacey's answers 2026-11-06).
-- New attorney plan versions with the new limits (the admin Plans tab changes them later without a release),
-- one shared AI counter for a Business firm, bonus credits from the Lawfecta Team, read-only playbooks over the
-- limit after a downgrade, the Usage page, the admin usage list with AI cost, and the nightly BD plan sync.
-- New blocking (the playbook limit and read-only playbooks) waits behind the switch usage_limits_enforced, off.
-- Additive: new functions and one new table; existing functions keep their signatures.

-- ---------- Switch and settings ----------
insert into feature_switches (key, label, gate) values
  ('usage_limits_enforced', 'Attorney usage limits block at 100% (saved documents, read-only documents after a downgrade). Counting, banners and the Usage page work while it is off.', 'Step 9b tested')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('usage.warn_pct', '80', 'Show the usage banner at this share of a limit', 'Usage limits', 'percent', 'C', 'Stacey 2026-11-06 (usage limits note)', ''),
  ('usage.ai_cost_flag_cents', '1000', 'Flag an attorney whose AI cost this month is above this', 'Usage limits', 'cents', 'C', 'Stacey 2026-11-06 (usage limits note)', 'The $10 a month variable allowance in the unit economics.'),
  ('usage.upgrade_url', '"/account/upgrade"', 'Where the Upgrade buttons go', 'Usage limits', '', 'O', 'Stacey 2026-11-06; the address that preselects a plan is still open', ''),
  ('usage.plan_sync_hour', '2', 'Hour of the nightly BD plan sync (Pacific time)', 'Usage limits', 'hour', 'C', 'Stacey 2026-11-06 (usage limits answers)', ''),
  ('ai.price_cents_per_mtok', '{"default":{"in":250,"out":1000},"gpt-4o-mini":{"in":15,"out":60},"gpt-4o":{"in":250,"out":1000},"whisper-1":{"audio_second":0.01}}', 'AI provider prices, in cents per million tokens (audio in cents per second)', 'Usage limits', 'cents', 'O', 'Provider price lists, 2026-11; check before launch', 'Used only to show AI cost to the Lawfecta Team. It never changes what a member is charged.')
on conflict (key) do nothing;

-- Archived documents do not count toward saved playbooks (Stacey 2026-11-06, answer 3)
update settings set value = 'false', source = 'Stacey 2026-11-06 (usage limits answer 3)' where key = 'playbooks.count_archived';

-- ---------- New attorney plan versions with the new limits ----------
do $$
declare p record; v_app plan_versions; v_new bigint; v_num int; lim jsonb;
begin
  for p in select * from (values
      ('att_free', 3, 50, 1024), ('att_plus', 15, 300, 10240), ('att_pro', 50, 1000, 51200), ('att_business', null, 2500, 204800)
    ) as x(code, pb, ai, mb) loop
    select * into v_app from plan_versions where plan_code = p.code and status = 'approved';
    if v_app.id is null then continue; end if;
    -- Already on these numbers: nothing to do (safe to run twice)
    if exists (select 1 from plan_features where plan_version_id = v_app.id and feature_key = 'ai.runs' and quota_limit = p.ai) then continue; end if;
    delete from plan_features where plan_version_id in (select id from plan_versions where plan_code = p.code and status = 'draft');
    delete from plan_versions where plan_code = p.code and status = 'draft';
    select coalesce(max(version), 0) + 1 into v_num from plan_versions where plan_code = p.code;
    insert into plan_versions (plan_code, version, monthly_cents, annual_cents, fee_bps, note)
    values (p.code, v_num, v_app.monthly_cents, v_app.annual_cents, v_app.fee_bps, 'Usage limits (Stacey 2026-11-06)') returning id into v_new;
    insert into plan_features (plan_version_id, feature_key, enabled, quota_limit)
    select v_new, pf.feature_key, pf.enabled, pf.quota_limit from plan_features pf where pf.plan_version_id = v_app.id;
    insert into plan_features (plan_version_id, feature_key, enabled, quota_limit) values
      (v_new, 'att.playbooks_saved', true, p.pb), (v_new, 'ai.runs', true, p.ai), (v_new, 'storage.mb', true, p.mb)
    on conflict (plan_version_id, feature_key) do update set enabled = true, quota_limit = excluded.quota_limit;
    update plan_versions set status = 'retired' where id = v_app.id;
    update plan_versions set status = 'approved', approved_at = now(), effective_from = now() where id = v_new;
    insert into decision_log (decision_id, status, approved_at, version, value, note)
    values ('plan:' || p.code, 'C', now(), v_num::text, dela_plan_json(v_new), 'Usage limits (Stacey 2026-11-06)');
  end loop;
end $$;

-- ---------- Bonus credits from the Lawfecta Team (this month only; the plan does not change) ----------
create table if not exists usage_bonus (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  feature_key text not null references features(key),
  period_start date not null,
  amount int not null check (amount > 0 and amount <= 100000),
  note text not null check (length(trim(note)) > 0),
  granted_by uuid not null references people(id),
  created_at timestamptz not null default now()
);
create index if not exists usage_bonus_person on usage_bonus (person_id, side, feature_key, period_start);
alter table usage_bonus enable row level security;

-- Plan sync log: one row per nightly run and per Resync
create table if not exists plan_sync_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  kind text not null check (kind in ('nightly', 'resync')),
  checked int not null default 0,
  changed int not null default 0,
  errors int not null default 0,
  detail jsonb not null default '[]'
);
alter table plan_sync_runs enable row level security;

-- ---------- Who an AI credit counts against ----------
-- A Business firm shares one counter (Stacey 2026-11-06, answer 7): everyone in the firm's DELA workspace counts
-- against the firm owner. Everyone else counts against themselves.
create or replace function dela_quota_subject(p_person uuid, p_side text, p_feature text) returns uuid language sql stable as $$
  select coalesce((
    select o.owner_person_id from side_profiles sp join organizations o on o.id = sp.org_id
      join side_profiles osp on osp.person_id = o.owner_person_id and osp.side = 'attorney' and osp.status <> 'closed'
      join plans pl on pl.code = osp.plan_code
    where p_side = 'attorney' and p_feature = 'ai.runs' and sp.person_id = p_person and sp.side = 'attorney' and sp.status <> 'closed'
      and pl.tier = 'business'), p_person)
$$;

create or replace function dela_quota_bonus(p_person uuid, p_side text, p_feature text, p_period date) returns int language sql stable as $$
  select coalesce(sum(amount), 0)::int from usage_bonus where person_id = p_person and side = p_side and feature_key = p_feature and period_start = p_period
$$;

-- Reserve allowance before an action (same as before, now with the shared Business counter and bonus credits)
create or replace function dela_quota_reserve(p_person uuid, p_side text, p_feature text, p_amount int, p_idem text, p_ref text default '')
returns jsonb language plpgsql as $$
declare
  f features; v_ver bigint; v_enabled boolean; v_limit int; v_period date; u quota_usage; r quota_reservations; v_who uuid;
begin
  if p_amount is null or p_amount <= 0 or coalesce(p_idem, '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  select * into f from features where key = p_feature;
  if f.key is null or f.kind <> 'quota' or f.side not in (p_side, 'both') then return jsonb_build_object('ok', false, 'reason', 'unknown_feature'); end if;
  v_who := dela_quota_subject(p_person, p_side, p_feature);
  v_period := dela_period_start(f.period);
  insert into quota_usage (person_id, side, feature_key, period_start) values (v_who, p_side, p_feature, v_period)
  on conflict (person_id, side, feature_key, period_start) do nothing;
  -- This lock makes concurrent reservations for the same allowance wait their turn (a whole firm on Business)
  select * into u from quota_usage where person_id = v_who and side = p_side and feature_key = p_feature and period_start = v_period for update;

  select * into r from quota_reservations where idempotency_key = p_idem;
  if r.id is not null then
    return jsonb_build_object('ok', r.status <> 'released', 'duplicate', true, 'reservation_id', r.id, 'status', r.status);
  end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;

  v_ver := dela_effective_version(v_who, p_side);
  select pf.enabled, pf.quota_limit into v_enabled, v_limit from plan_features pf where pf.plan_version_id = v_ver and pf.feature_key = p_feature;
  if not coalesce(v_enabled, false) then return jsonb_build_object('ok', false, 'reason', 'not_in_plan'); end if;
  if v_limit is not null then v_limit := v_limit + dela_quota_bonus(v_who, p_side, p_feature, v_period); end if;
  if v_limit is not null and u.used + u.reserved + p_amount > v_limit then
    return jsonb_build_object('ok', false, 'reason', 'limit_reached', 'limit', v_limit, 'remaining', greatest(v_limit - u.used - u.reserved, 0),
      'resets_on', case when f.period = 'month' then (v_period + interval '1 month')::date end);
  end if;

  update quota_usage set reserved = reserved + p_amount where id = u.id;
  insert into quota_reservations (idempotency_key, person_id, side, feature_key, period_start, amount, object_ref)
  values (p_idem, v_who, p_side, p_feature, v_period, p_amount, coalesce(p_ref, ''))
  returning * into r;
  return jsonb_build_object('ok', true, 'duplicate', false, 'reservation_id', r.id, 'status', 'reserved',
    'remaining', case when v_limit is null then null else v_limit - u.used - u.reserved - p_amount end);
end $$;

-- What a member gets and has used (the shared Business counter and bonus credits included)
create or replace function dela_entitlements(p_person uuid, p_side text) returns jsonb language plpgsql stable as $$
declare v_ver bigint; v jsonb;
begin
  v_ver := dela_effective_version(p_person, p_side);
  select coalesce(jsonb_agg(jsonb_build_object(
      'key', f.key, 'label', f.label, 'unit', f.unit, 'period', f.period, 'kind', f.kind,
      'enabled', coalesce(lim.enabled, false),
      'limit', case when lim.enabled then lim.quota_limit + case when lim.quota_limit is null then 0 else dela_quota_bonus(w.who, p_side, f.key, dela_period_start(f.period)) end else 0 end,
      'unlimited', coalesce(lim.enabled and lim.quota_limit is null and f.kind = 'quota', false),
      'used', coalesce(u.used, 0), 'reserved', coalesce(u.reserved, 0),
      'shared', w.who <> p_person,
      'remaining', case when f.kind <> 'quota' then null
                        when not coalesce(lim.enabled, false) then 0
                        when lim.quota_limit is null then null
                        else greatest(lim.quota_limit + dela_quota_bonus(w.who, p_side, f.key, dela_period_start(f.period)) - coalesce(u.used, 0) - coalesce(u.reserved, 0), 0) end
    ) order by f.key), '[]')
  into v
  from features f
  cross join lateral (select dela_quota_subject(p_person, p_side, f.key) as who) w
  left join lateral (select pf.enabled, pf.quota_limit from plan_features pf
    where pf.plan_version_id = case when w.who = p_person then v_ver else dela_effective_version(w.who, p_side) end and pf.feature_key = f.key) lim on true
  left join quota_usage u on u.person_id = w.who and u.side = p_side and u.feature_key = f.key and u.period_start = dela_period_start(f.period)
  where f.side in (p_side, 'both');
  return v;
end $$;

-- ---------- Saved playbooks ----------
-- The plan's number, always (for the Usage page and the admin list)
create or replace function dela_pb_plan_limit(p_org uuid) returns int language sql stable as $$
  select case when o.kind = 'agency' then nullif(dela_int_setting('agency.playbooks_saved', 0), 0) when not coalesce(pf.enabled, true) then 0 else pf.quota_limit end
  from organizations o
  left join plan_features pf on pf.feature_key = 'att.playbooks_saved' and pf.plan_version_id = dela_effective_version(o.owner_person_id, 'attorney')
  where o.id = p_org
$$;

-- The limit that blocks new playbooks: only once usage_limits_enforced is on for the library's owner
create or replace function dela_pb_limit(p_org uuid) returns int language sql stable as $$
  select case when o.kind = 'agency' then dela_pb_plan_limit(o.id)
              when dela_switch_on('usage_limits_enforced', o.owner_person_id) then dela_pb_plan_limit(o.id) end
  from organizations o where o.id = p_org
$$;

-- Read-only after a downgrade: the most recently edited playbooks stay editable up to the limit; the rest are read-only.
-- They can still be viewed, exported and assigned. Only while usage_limits_enforced is on.
create or replace function dela_pb_locked_ids(p_org uuid) returns uuid[] language sql stable as $$
  select coalesce(array_agg(id), '{}') from (
    select p.id, row_number() over (order by p.updated_at desc, p.id) as n
    from playbooks p where p.org_id = p_org and p.status not in ('trash', 'deleted', 'archived')
  ) x
  where dela_pb_limit(p_org) is not null and x.n > dela_pb_limit(p_org)
$$;

create or replace function dela_pb_locked(p_pb uuid) returns boolean language sql stable as $$
  select coalesce((select p.id = any(dela_pb_locked_ids(p.org_id)) from playbooks p where p.id = p_pb), false)
$$;

-- ---------- AI cost (for the Lawfecta Team only; never changes what a member is charged) ----------
create or replace function dela_ai_cost_cents(p_people uuid[], p_side text, p_from date) returns numeric language sql stable as $$
  select coalesce(sum(
    (u.input_tokens * coalesce((pr.p->>'in')::numeric, (dp.p->>'in')::numeric, 0) + u.output_tokens * coalesce((pr.p->>'out')::numeric, (dp.p->>'out')::numeric, 0)) / 1000000.0
    + u.audio_seconds * coalesce((pr.p->>'audio_second')::numeric, 0)), 0)
  from ai_usage u
  cross join lateral (select dela_setting('ai.price_cents_per_mtok') -> u.model as p) pr
  cross join lateral (select dela_setting('ai.price_cents_per_mtok') -> 'default' as p) dp
  where u.person_id = any(p_people) and u.side = p_side and u.source = 'lawfecta' and u.at >= p_from
$$;

-- ---------- The Usage page ----------
create or replace function dela_usage(p_person uuid, p_side text) returns jsonb language plpgsql stable as $$
declare v_org uuid; v_ai jsonb; v_period date := dela_period_start('month'); v_plan text; v_tier text; v_next text; v_limit int; v_count int;
begin
  v_org := dela_side_org(p_person, p_side);
  select e into v_ai from jsonb_array_elements(dela_entitlements(p_person, p_side)) e where e->>'key' = 'ai.runs';
  select pl.name, pl.tier into v_plan, v_tier from side_profiles sp join plans pl on pl.code = sp.plan_code where sp.person_id = p_person and sp.side = p_side;
  select name into v_next from plans where side = p_side and dela_tier_rank(tier) = dela_tier_rank(v_tier) + 1 limit 1;
  v_limit := dela_pb_plan_limit(v_org);
  v_count := dela_pb_count(v_org);
  return jsonb_build_object('ok', true, 'side', p_side, 'plan', v_plan, 'tier', v_tier, 'next_plan', v_next,
    'enforced', dela_switch_on('usage_limits_enforced', p_person),
    'warn_pct', dela_int_setting('usage.warn_pct', 80),
    'upgrade_url', dela_setting_text('usage.upgrade_url', '/account/upgrade'),
    'resets_on', (v_period + interval '1 month')::date,
    'playbooks', jsonb_build_object('used', v_count, 'limit', v_limit),
    'actions', jsonb_build_object('used', coalesce((v_ai->>'used')::int, 0) + coalesce((v_ai->>'reserved')::int, 0), 'limit', case when (v_ai->>'unlimited')::boolean then null else (v_ai->>'limit')::int end, 'shared', coalesce((v_ai->>'shared')::boolean, false)),
    'storage', jsonb_build_object('used_bytes', dela_storage_used_bytes(v_org), 'limit_bytes', dela_storage_limit_bytes(v_org)),
    'locked_ids', to_jsonb(dela_pb_locked_ids(v_org)));
end $$;

-- ---------- The Lawfecta Team: every attorney's usage, AI cost and bonus credits ----------
create or replace function dela_admin_usage(p_actor uuid) returns jsonb language plpgsql stable as $$
declare v_period date := dela_period_start('month'); v_flag int := dela_int_setting('usage.ai_cost_flag_cents', 1000);
begin
  perform dela_require_staff(p_actor, '{}');
  return jsonb_build_object('ok', true, 'flag_cents', v_flag, 'month', v_period, 'enforced_switch', (select state from feature_switches where key = 'usage_limits_enforced'),
    'attorneys', coalesce((select jsonb_agg(x order by (x->>'ai_cost_cents')::numeric desc, x->>'name') from (
      select jsonb_build_object('person_id', pe.id, 'bd_member_id', pe.bd_member_id, 'name', pe.display_name, 'email', pe.email,
        'plan', pl.name, 'plan_source', sp.plan_source, 'shared_with', case when w.who <> pe.id then (select display_name from people where id = w.who) end,
        'playbooks', dela_pb_count(sp.org_id), 'playbooks_limit', dela_pb_plan_limit(sp.org_id),
        'actions', coalesce(u.used, 0) + coalesce(u.reserved, 0), 'actions_limit', (select (e->>'limit')::int from jsonb_array_elements(dela_entitlements(pe.id, 'attorney')) e where e->>'key' = 'ai.runs' and not (e->>'unlimited')::boolean),
        'bonus', dela_quota_bonus(w.who, 'attorney', 'ai.runs', v_period),
        'storage_bytes', dela_storage_used_bytes(sp.org_id), 'storage_limit_bytes', dela_storage_limit_bytes(sp.org_id),
        'ai_cost_cents', round(dela_ai_cost_cents(array[pe.id], 'attorney', v_period), 2)) as x
      from side_profiles sp join people pe on pe.id = sp.person_id join plans pl on pl.code = sp.plan_code
      cross join lateral (select dela_quota_subject(pe.id, 'attorney', 'ai.runs') as who) w
      left join quota_usage u on u.person_id = w.who and u.side = 'attorney' and u.feature_key = 'ai.runs' and u.period_start = v_period
      where sp.side = 'attorney' and sp.status <> 'closed') t), '[]'));
end $$;

create or replace function dela_admin_usage_bonus(p_actor uuid, p_person uuid, p_amount int, p_note text) returns jsonb language plpgsql as $$
declare v_who uuid; v_id uuid;
begin
  perform dela_require_staff(p_actor, '{}');
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then return jsonb_build_object('ok', false, 'reason', 'bad_amount'); end if;
  if length(trim(coalesce(p_note, ''))) = 0 then return jsonb_build_object('ok', false, 'reason', 'note_required'); end if;
  if not exists (select 1 from side_profiles where person_id = p_person and side = 'attorney' and status <> 'closed') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_who := dela_quota_subject(p_person, 'attorney', 'ai.runs');
  insert into usage_bonus (person_id, side, feature_key, period_start, amount, note, granted_by)
  values (v_who, 'attorney', 'ai.runs', dela_period_start('month'), p_amount, left(trim(p_note), 500), p_actor) returning id into v_id;
  perform dela_audit('staff', p_actor, 'usage_bonus_granted', 'person', p_person::text, jsonb_build_object('amount', p_amount, 'note', left(trim(p_note), 500), 'counter', v_who));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- ---------- The BD plan sync (nightly at 2:00 AM Pacific, and "Resync plan" in admin) ----------
-- The api reads subscription_id from BD; this applies it. A BD plan not linked to a DELA plan changes nothing,
-- and a plan the Lawfecta Team set by hand (staff_grant) is kept.
create or replace function dela_plan_sync_apply(p_person uuid, p_bd_plan bigint) returns jsonb language plpgsql as $$
declare v_plan plans; v_before text; v_after text;
begin
  select * into v_plan from plans where bd_plan_id = p_bd_plan;
  if v_plan.code is null then return jsonb_build_object('ok', true, 'changed', false, 'reason', 'plan_not_linked'); end if;
  select plan_code into v_before from side_profiles where person_id = p_person and side = v_plan.side;
  perform dela_ensure_side(p_person, v_plan.side, v_plan.code, 'bd');
  select plan_code into v_after from side_profiles where person_id = p_person and side = v_plan.side;
  if v_before is distinct from v_after then
    perform dela_audit('system', null, 'plan_synced', 'person', p_person::text, jsonb_build_object('from', v_before, 'to', v_after, 'bd_plan_id', p_bd_plan));
  end if;
  return jsonb_build_object('ok', true, 'changed', v_before is distinct from v_after, 'from', v_before, 'to', v_after);
end $$;

-- Members to check in one batch, after a given BD member id (attorneys and freelancers alike; BD holds one plan per member)
create or replace function dela_plan_sync_batch(p_after bigint, p_limit int) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('person_id', id, 'bd_member_id', bd_member_id) order by bd_member_id), '[]') from (
    select pe.id, pe.bd_member_id from people pe
    where pe.bd_member_id > coalesce(p_after, 0) and pe.status <> 'closed' and exists (select 1 from side_profiles sp where sp.person_id = pe.id and sp.status <> 'closed')
    order by pe.bd_member_id limit least(greatest(p_limit, 1), 200)) t
$$;

create or replace function dela_maybe_queue_plan_sync() returns void language plpgsql as $$
declare v_local timestamp := now() at time zone dela_tz();
begin
  if extract(hour from v_local) >= dela_int_setting('usage.plan_sync_hour', 2) then
    perform dela_job_enqueue('bd_plan_sync', jsonb_build_object('after', 0, 'run', v_local::date), now(), 'bd_plan_sync:' || v_local::date, null);
  end if;
end $$;

create or replace function dela_person_bd(p_person uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('bd_member_id', bd_member_id) from people where id = p_person
$$;

create or replace function dela_plan_sync_log(p_kind text, p_checked int, p_changed int, p_errors int, p_detail jsonb, p_actor uuid) returns void language plpgsql as $$
begin
  insert into plan_sync_runs (kind, checked, changed, errors, detail, finished_at) values (p_kind, p_checked, p_changed, p_errors, coalesce(p_detail, '[]'), now());
  if p_actor is not null then perform dela_audit('staff', p_actor, 'plan_resync', 'plan_sync', '', jsonb_build_object('changed', p_changed, 'errors', p_errors)); end if;
end $$;

-- ---------- Locked down like every DELA function ----------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure::text as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_quota_subject', 'dela_quota_bonus', 'dela_quota_reserve', 'dela_entitlements', 'dela_pb_plan_limit', 'dela_pb_limit',
      'dela_pb_locked_ids', 'dela_pb_locked', 'dela_ai_cost_cents', 'dela_usage', 'dela_admin_usage', 'dela_admin_usage_bonus', 'dela_plan_sync_apply', 'dela_plan_sync_batch', 'dela_maybe_queue_plan_sync', 'dela_person_bd', 'dela_plan_sync_log') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

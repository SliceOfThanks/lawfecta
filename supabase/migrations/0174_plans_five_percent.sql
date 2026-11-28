-- Step 97a: every plan shows the fee that is charged (docs/briefs/step-97-fees-and-custom-plans.md).
-- Stacey 2026-11-28: "Ensure all plans have all users at 5% fee on every transaction (we are not lowering for now)."
-- Since migration 0041 every member is charged the same fee on every plan: the two settings fee.client_bps and
-- fee.freelancer_bps (5%). The number kept on a plan version is only what the Subscription page shows. On the live
-- site the paid plans' versions had come to show 4%, 3.5% and 3%, while members were charged 5%. This puts every
-- plan back to the charged fee, refuses a plan version that shows anything else, and has the six-hour check watch it.
-- Additive: new plan versions (the old ones are kept, retired), one new function, two functions gain a check.

create or replace function dela_fee_charged(p_side text) returns int language sql stable set search_path = public, extensions, pg_temp as $$
  select case when p_side = 'attorney' then dela_int_setting('fee.client_bps', 500) else dela_int_setting('fee.freelancer_bps', 500) end
$$;
revoke all on function dela_fee_charged(text) from public, anon, authenticated;

-- A new version of each plan that shows another fee: everything copied, the fee corrected, the old version retired
do $$
declare p record; v_app plan_versions; v_new bigint; v_num int;
begin
  for p in select pl.code, pl.side from plans pl loop
    select * into v_app from plan_versions where plan_code = p.code and status = 'approved';
    if v_app.id is null or v_app.fee_bps = dela_fee_charged(p.side) then continue; end if;
    delete from plan_features where plan_version_id in (select id from plan_versions where plan_code = p.code and status = 'draft');
    delete from plan_versions where plan_code = p.code and status = 'draft';
    select coalesce(max(version), 0) + 1 into v_num from plan_versions where plan_code = p.code;
    insert into plan_versions (plan_code, version, monthly_cents, annual_cents, fee_bps, note)
    values (p.code, v_num, v_app.monthly_cents, v_app.annual_cents, dela_fee_charged(p.side), 'Shows the fee that is charged on every plan (Stacey 2026-11-28)') returning id into v_new;
    insert into plan_features (plan_version_id, feature_key, enabled, quota_limit)
    select v_new, pf.feature_key, pf.enabled, pf.quota_limit from plan_features pf where pf.plan_version_id = v_app.id;
    update plan_versions set status = 'retired' where id = v_app.id;
    update plan_versions set status = 'approved', approved_at = now(), effective_from = now() where id = v_new;
    insert into decision_log (decision_id, status, approved_at, version, value, note)
    values ('plan:' || p.code, 'C', now(), v_num::text, dela_plan_json(v_new), 'Shows the fee that is charged on every plan (Stacey 2026-11-28)');
    perform dela_audit('system', null, 'plan_approved', 'plan', p.code, jsonb_build_object('version', v_num, 'fee_bps', dela_fee_charged(p.side), 'was', v_app.fee_bps));
  end loop;
end $$;

-- A plan version can no longer be saved with a fee other than the one charged
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_admin_plan_draft(uuid,text,jsonb)'::regprocedure) into v_src;
  if position('standard_fee' in v_src) > 0 then return; end if;
  v_new := replace(v_src, $a$  if not exists (select 1 from plans where code = p_plan) then return jsonb_build_object('ok', false, 'reason', 'bad_plan'); end if;$a$,
    $b$  if not exists (select 1 from plans where code = p_plan) then return jsonb_build_object('ok', false, 'reason', 'bad_plan'); end if;
  -- Step 97a: every standard plan shows the fee that is charged
  if p ? 'fee_bps' and (p->>'fee_bps')::int <> dela_fee_charged((select side from plans where code = p_plan)) then
    return jsonb_build_object('ok', false, 'reason', 'standard_fee', 'fee_bps', dela_fee_charged((select side from plans where code = p_plan)));
  end if;$b$);
  if v_new = v_src then raise exception 'dela_admin_plan_draft changed; update 0174'; end if;
  execute v_new;
end $$;

-- The six-hour check: a plan that shows a fee other than the one charged
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_health_db()'::regprocedure) into v_src;
  if position('fees_mismatch' in v_src) > 0 then return; end if;
  v_new := replace(v_src, $a$  return v;
end$a$, $b$  select count(*) into n from plan_versions pv join plans pl on pl.code = pv.plan_code where pv.status = 'approved' and pv.fee_bps <> dela_fee_charged(pl.side);
  if n > 0 then v := v || jsonb_build_object('code', 'fees_mismatch', 'title', n || ' plan' || case when n = 1 then ' shows' else 's show' end || ' a fee that is not the fee charged',
    'body', 'Members on that plan read one fee on their Subscription page and are charged another. Open the admin area, Plans, and tell Claude.'); end if;
  return v;
end$b$);
  if v_new = v_src then raise exception 'dela_health_db changed; update 0174'; end if;
  execute v_new;
end $$;

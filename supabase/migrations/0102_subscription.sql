-- Step 16 (docs/briefs/step-16-subscription.md): the Subscription page. One read-only function gives the member's plan
-- and every approved plan of their workspace with its price, platform fee and allowances. Plan changes and payment stay
-- on the Lawfecta website. Additive: nothing is changed or removed.
create or replace function dela_subscription(p_person uuid, p_side text) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_code text; v_source text; v_tier text; v_name text;
begin
  select sp.plan_code, sp.plan_source, pl.tier, pl.name into v_code, v_source, v_tier, v_name
  from side_profiles sp join plans pl on pl.code = sp.plan_code
  where sp.person_id = p_person and sp.side = p_side and sp.status <> 'closed';
  if v_code is null then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  return jsonb_build_object('ok', true, 'side', p_side, 'plan_code', v_code, 'plan_name', v_name, 'plan_source', v_source, 'tier', v_tier,
    'warn_pct', dela_int_setting('usage.warn_pct', 80),
    'upgrade_url', dela_setting_text('usage.upgrade_url', '/account/upgrade'),
    'resets_on', (dela_period_start('month') + interval '1 month')::date,
    'plans', coalesce((
      select jsonb_agg(jsonb_build_object('code', pl.code, 'name', pl.name, 'tier', pl.tier, 'rank', dela_tier_rank(pl.tier), 'current', pl.code = v_code,
        'monthly_cents', v.monthly_cents, 'annual_cents', v.annual_cents, 'fee_bps', v.fee_bps,
        'features', coalesce((
          select jsonb_agg(jsonb_build_object('key', f.key, 'label', f.label, 'unit', f.unit, 'period', f.period, 'kind', f.kind,
            'enabled', coalesce(pf.enabled, false), 'limit', case when pf.enabled then pf.quota_limit end,
            'unlimited', coalesce(pf.enabled and pf.quota_limit is null and f.kind = 'quota', false)) order by f.key)
          from features f left join plan_features pf on pf.plan_version_id = v.id and pf.feature_key = f.key
          where f.side in (p_side, 'both')), '[]')) order by pl.sort)
      from plans pl join plan_versions v on v.plan_code = pl.code and v.status = 'approved'
      where pl.side = p_side), '[]'));
end $$;
revoke all on function dela_subscription(uuid, text) from public, anon, authenticated;

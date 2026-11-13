-- Stacey 2026-11-13: "YES" to changing freelancer storage to 5,120 MB (Pro) and 20,480 MB (Business), so the
-- Subscription page reads "5 GB" and "20 GB" (it read "4.9 GB" and "19.5 GB" with 5,000 and 20,000 MB; ChatGPT check 2).
-- A new approved plan version for each of the two plans, the old one retired, as every plan change is made.
-- Free (250 MB) and Plus (1,000 MB) are unchanged. Safe to run twice.
do $$
declare p record; v_app plan_versions; v_new bigint; v_num int;
begin
  for p in select * from (values ('fl_pro', 5120), ('fl_business', 20480)) as x(code, mb) loop
    select * into v_app from plan_versions where plan_code = p.code and status = 'approved';
    if v_app.id is null then continue; end if;
    if exists (select 1 from plan_features where plan_version_id = v_app.id and feature_key = 'storage.mb' and quota_limit = p.mb) then continue; end if;
    delete from plan_features where plan_version_id in (select id from plan_versions where plan_code = p.code and status = 'draft');
    delete from plan_versions where plan_code = p.code and status = 'draft';
    select coalesce(max(version), 0) + 1 into v_num from plan_versions where plan_code = p.code;
    insert into plan_versions (plan_code, version, monthly_cents, annual_cents, fee_bps, note)
    values (p.code, v_num, v_app.monthly_cents, v_app.annual_cents, v_app.fee_bps, 'Storage in whole GB (Stacey 2026-11-13)') returning id into v_new;
    insert into plan_features (plan_version_id, feature_key, enabled, quota_limit)
    select v_new, pf.feature_key, pf.enabled, pf.quota_limit from plan_features pf where pf.plan_version_id = v_app.id;
    insert into plan_features (plan_version_id, feature_key, enabled, quota_limit) values (v_new, 'storage.mb', true, p.mb)
    on conflict (plan_version_id, feature_key) do update set enabled = true, quota_limit = excluded.quota_limit;
    update plan_versions set status = 'retired' where id = v_app.id;
    update plan_versions set status = 'approved', approved_at = now(), effective_from = now() where id = v_new;
    insert into decision_log (decision_id, status, approved_at, version, value, note)
    values ('plan:' || p.code, 'C', now(), v_num::text, dela_plan_json(v_new), 'Storage in whole GB: ' || p.mb || ' MB (Stacey 2026-11-13)');
  end loop;
end $$;
update features set source = 'Stacey 2026-11-13 (freelancer Pro 5,120 and Business 20,480 MB, whole GB); before: Stacey 2026-11-10' where key = 'storage.mb';

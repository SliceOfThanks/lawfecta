-- Safety net tests: release rules, compatibility before going back, undo, plan restore, pause, health, summary, reset.
\set ON_ERROR_STOP 1
do $$
declare owner_id uuid; r jsonb; a bigint; b bigint; c bigint; h bigint; v bigint; n int;
  t text := 'https://github.com/SliceOfThanks/lawfecta-dela/actions/runs/7';
begin
  select person_id into owner_id from staff_roles where role = 'owner' and revoked_at is null limit 1;
  delete from release_approvals; delete from releases; update release_password set failed_attempts = 0, locked_until = null;

  -- Release rules
  begin perform dela_release_record('v1.0.0', repeat('1', 40), '', '{}', 'short', t); raise exception 'FAILED: short notes';
  exception when others then perform t_ok(sqlerrm = 'release_notes_required', 'release notes are required'); end;
  begin perform dela_release_record('v1.0.0', repeat('1', 40), '', '{}', 'A proper note about this version', ''); raise exception 'FAILED: no tests';
  exception when others then perform t_ok(sqlerrm = 'passing_tests_required', 'a passing test run is required'); end;

  -- Compatibility: v1 then v2 (normal) then v3 (removes something older versions use)
  a := dela_release_record('v1.0.0', repeat('1', 40), '', array['0001_a.sql'], 'First version for compatibility tests', t);
  b := dela_release_record('v2.0.0', repeat('2', 40), '', array['0001_a.sql', '0002_b.sql'], 'Second version, additive changes only', t);
  update releases set created_at = now() - interval '2 days' where id = a;
  update releases set created_at = now() - interval '1 day' where id = b;
  update releases set status = 'replaced' where id in (a, b);
  c := dela_release_record('v3.0.0', repeat('3', 40), '', array['0001_a.sql', '0002_b.sql', '0003_c.sql'], 'Third version removes an old column', t, array['0003_c.sql']);
  update releases set status = 'live', live_at = now() where id = c;
  perform t_ok((dela_release_compatible(b)->>'ok')::boolean = false, 'v2 cannot run on a database v3 changed in a breaking way');
  r := dela_release_approve_checked(owner_id, b, 'rollback', 'Stacey-Release-2026');
  perform t_ok(r->>'reason' = 'not_compatible' and r->'blocking' ? '0003_c.sql', 'going back to an incompatible version is refused and says why');
  update releases set contract_migrations = '{}' where id = c;
  perform t_ok((dela_release_compatible(b)->>'ok')::boolean, 'without breaking changes, going back is allowed');
  r := dela_release_approve_checked(owner_id, b, 'rollback', 'Stacey-Release-2026');
  perform t_ok((r->>'ok')::boolean, 'compatible version: password approval works');

  -- Undo a setting
  perform dela_admin_set_setting(owner_id, 'gig.duration_days', '21', 'C', 'try 21');
  select max(id) into h from settings_history where key = 'gig.duration_days';
  perform t_ok((dela_admin_undo_setting(owner_id, h)->>'ok')::boolean, 'undo a setting change');
  perform t_ok((dela_setting('gig.duration_days'))::text = '14', 'value is back to 14');
  perform t_ok((select count(*) from settings_history where key = 'gig.duration_days' and reason like 'Undo of change%') = 1, 'the undo is itself recorded');

  -- Restore an earlier plan version (needs the release password)
  r := dela_admin_plan_draft(owner_id, 'fl_plus', '{"monthly_cents": 1500}');
  perform dela_admin_plan_approve(owner_id, (r->>'version_id')::bigint);
  select id into v from plan_versions where plan_code = 'fl_plus' and status = 'retired' order by version desc limit 1;
  perform t_ok(dela_admin_plan_restore(owner_id, v, 'nope-nope-nope')->>'reason' = 'wrong_password', 'restoring a plan needs the release password');
  update release_password set failed_attempts = 0;
  perform t_ok((dela_admin_plan_restore(owner_id, v, 'Stacey-Release-2026')->>'ok')::boolean, 'restore earlier plan');
  perform t_ok((select monthly_cents from plan_versions where plan_code = 'fl_plus' and status = 'approved') = 1200, 'price back to $12 as a new version');

  -- Emergency pause
  perform t_ok(not dela_paused('ai'), 'nothing paused at first');
  perform t_ok(dela_admin_set_pause(owner_id, 'banana', true, '')->>'reason' = 'bad_area', 'unknown area refused');
  perform dela_admin_set_pause(owner_id, 'ai', true, 'AI provider outage');
  perform t_ok(dela_paused('ai') and not dela_paused('checkout'), 'one area paused');
  perform dela_admin_set_pause(owner_id, 'all', true, 'checking a problem');
  perform t_ok(dela_paused('checkout') and (dela_health()->>'paused')::boolean, 'pause all covers every area and shows in health');
  perform t_ok(exists (select 1 from notifications where title = 'DELA is paused'), 'owner is told');
  perform dela_admin_set_pause(owner_id, 'all', false, 'fixed');
  perform dela_admin_set_pause(owner_id, 'ai', false, 'fixed');
  perform t_ok(not dela_paused('ai'), 'unpaused');

  -- Health and heartbeat
  perform t_ok(not (dela_health()->>'worker_ok')::boolean, 'a worker that never ran is reported');
  perform dela_worker_beat();
  perform t_ok((dela_health()->>'worker_ok')::boolean, 'heartbeat makes the worker healthy');

  -- Daily summary and reminders
  update settings set value = '"2026-01-01"' where key = 'reminders.next_restore_test';
  r := dela_daily_summary();
  perform t_ok(r->>'body' like '%restore drill%', 'restore drill reminder is included when due');
  perform t_ok(dela_setting_text('reminders.next_restore_test', '') > '2026-03-31', 'next reminder moves three months on');
  r := dela_daily_summary();
  perform t_ok((select count(*) from notifications where kind = 'daily_summary' and channel = 'in_app' and person_id = owner_id) = 1, 'one summary per day');

  -- Reset Staging
  perform t_ok((dela_admin_reset_staging(owner_id)->>'ok')::boolean, 'reset staging');
  select count(*) into n from quota_usage;
  perform t_ok(n = 0 and (select count(*) from notifications) = 0, 'activity cleared');
  perform t_ok((select count(*) from staff_roles where role = 'owner' and revoked_at is null) >= 1 and exists (select 1 from plans), 'team and plans kept');
  update settings set value = '"live"' where key = 'environment';
  perform t_ok(dela_admin_reset_staging(owner_id)->>'reason' = 'staging_only', 'reset is refused on Live');
  update settings set value = '"staging"' where key = 'environment';
end $$;
select 'safety tests passed' as result;

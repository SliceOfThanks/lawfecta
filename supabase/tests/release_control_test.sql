-- Release Control tests: report required, emailed code, password-only fallback, progress steps, the watch,
-- going back by itself, Live health alerts, text alerts, setting checks and the dashboard data.
-- Cleans up after itself so release_test.sql starts from nothing.
\set ON_ERROR_STOP 1
do $$
declare owner_id uuid; sup uuid; r jsonb; a bigint; b bigint; c bigint; code text; job record; i int;
begin
  select person_id into owner_id from staff_roles where role = 'owner' and revoked_at is null limit 1;
  update people set email = 'owner@test.invalid' where id = owner_id;
  insert into people (bd_member_id, display_name) values (7101, 'Support RC') returning id into sup;
  insert into staff_roles (person_id, role) values (sup, 'support');
  perform dela_release_password_set(owner_id, null, 'Control-Pass-2026');

  a := dela_release_record('rc-1', repeat('1', 40), 'api-0.4.0', array['0001_foundation_tables.sql'], 'Release control test version one', 'https://github.com/SliceOfThanks/lawfecta/actions/runs/1');
  perform dela_release_mark_tested(owner_id, a, true);

  -- The ChatGPT report is required before a push
  perform t_ok(dela_release_precheck(a, 'push') = 'report_missing', 'no push without the ChatGPT test report');
  perform t_ok(dela_release_code_request(owner_id, a, 'push', 'Control-Pass-2026', false)->>'reason' = 'report_missing', 'no code without the report either');
  perform dela_release_attach_report(a, 'PASS: every step');

  -- No email or text service yet: the password alone is used, and the dashboard is told
  r := dela_release_code_request(owner_id, a, 'push', 'Control-Pass-2026', false);
  perform t_ok((r->>'ok')::boolean and not (r->>'code_needed')::boolean and (r->>'waiting_setup')::boolean, 'code waits on email or text setup, and says so');
  begin
    perform dela_release_code_request(sup, a, 'push', 'Control-Pass-2026', false);
    raise exception 'FAILED: support asked for a code';
  exception when others then perform t_ok(sqlerrm = 'forbidden', 'only an owner asks for a code'); end;

  -- Email works: a code is needed
  update settings set value = '"brevo"' where key = 'email.sender';
  perform t_ok(dela_release_code_request(owner_id, a, 'push', 'wrong-password-zz', false)->>'reason' = 'wrong_password', 'the password is checked before a code is sent');
  update release_password set failed_attempts = 0;
  r := dela_release_code_request(owner_id, a, 'push', 'Control-Pass-2026', false);
  perform t_ok((r->>'code_needed')::boolean and r->>'email' = 'o***@test.invalid' and r->>'sms' is null, 'code sent by email, address masked');
  select * into job from jobs where kind = 'send_code' order by created_at desc limit 1;
  code := job.payload->>'code';
  perform t_ok(length(code) = 6 and code ~ '^[0-9]+$', 'six digit code');
  perform t_ok(not exists (select 1 from release_codes where code_hash = code), 'only a hash of the code is kept');
  perform t_ok(dela_code_target((job.payload->>'code_id')::bigint)->>'to_email' = 'owner@test.invalid', 'the worker knows where to send it');

  perform t_ok(dela_release_approve_coded(owner_id, a, 'push', 'Control-Pass-2026', '', false)->>'reason' = 'wrong_code', 'no code, no push');
  perform t_ok(dela_release_approve_coded(owner_id, a, 'push', 'Control-Pass-2026', case when code = '000000' then '000001' else '000000' end, false)->>'reason' = 'wrong_code', 'wrong code refused');
  perform t_ok((select attempts from release_codes where id = (job.payload->>'code_id')::bigint) = 2, 'wrong codes are counted');
  perform t_ok((select failed_attempts from release_password) = 2, 'wrong codes count toward the 30 minute lock');
  update release_password set failed_attempts = 0;
  perform t_ok(dela_release_approve_coded(owner_id, a, 'push', 'not-the-password', code, false)->>'reason' = 'wrong_password', 'right code still needs the password');
  update release_password set failed_attempts = 0;
  r := dela_release_approve_coded(owner_id, a, 'push', 'Control-Pass-2026', code, false);
  perform t_ok((r->>'ok')::boolean and (r->>'code_used')::boolean and length(r->>'nonce') = 64, 'right code and password approve the push');
  perform t_ok((select used_at is not null from release_codes where id = (job.payload->>'code_id')::bigint), 'the code is used up');
  perform t_ok(dela_code_target((job.payload->>'code_id')::bigint) is null, 'a used code is never sent again');
  perform t_ok(dela_release_precheck(a, 'push') = 'push_in_progress', 'one push at a time');

  -- GitHub claims, reports steps, finishes; the watch starts
  r := dela_release_claim(a, r->>'nonce');
  perform t_ok((r->>'watch_minutes')::int = 15 and r->>'action' = 'push', 'GitHub is told to watch Live for 15 minutes');
  perform t_ok((dela_release_step(a, 'tests', 'Automatic tests passed', true)->>'ok')::boolean, 'progress step recorded');
  perform dela_release_finish(a, true, 'ok', 'abcdefghijklmnopqrst');
  perform t_ok((select status = 'live' and watch_until > now() + interval '14 minutes' from releases where id = a), 'live, and watched for 15 minutes');
  perform t_ok(dela_setting_text('live.project_ref', '') = 'abcdefghijklmnopqrst', 'the first push saves the Live project ID');
  perform t_ok((select steps->0->>'key' from releases where id = a) = 'tests', 'steps kept for the dashboard');
  perform t_ok((dela_release_watch_tick(a, true)->>'continue')::boolean, 'the watch goes on');
  perform dela_release_watch_end(a, 'passed', 'healthy for 15 minutes');
  perform t_ok((select watch_result from releases where id = a) = 'passed', 'watch passed');
  perform t_ok(dela_release_step(a, 'late', 'x', true)->>'reason' = 'not_running', 'no steps after it is done');

  -- Second version, password only, then Live becomes unhealthy and goes back by itself
  update settings set value = '"log"' where key = 'email.sender';
  b := dela_release_record('rc-2', repeat('2', 40), 'api-0.4.0', array['0001_foundation_tables.sql'], 'Release control test version two', 'https://github.com/SliceOfThanks/lawfecta/actions/runs/2');
  perform dela_release_mark_tested(owner_id, b, true);
  perform dela_release_attach_report(b, 'PASS');
  r := dela_release_approve_coded(owner_id, b, 'push', 'Control-Pass-2026', null, false);
  perform t_ok((r->>'ok')::boolean and (r->>'waiting_setup')::boolean and not (r->>'code_used')::boolean, 'password alone while email and text are not set up');
  perform dela_release_claim(b, r->>'nonce');
  perform dela_release_finish(b, true, 'ok');
  perform t_ok((select previous_release_id from releases where id = b) = a and (select status from releases where id = a) = 'replaced', 'remembers the version it replaced');

  c := dela_release_record('rc-3', repeat('3', 40), 'api-0.4.0', array['0001_foundation_tables.sql'], 'Release control test version three', 'https://github.com/SliceOfThanks/lawfecta/actions/runs/3');
  perform dela_release_mark_tested(owner_id, c, true);
  perform dela_release_attach_report(c, 'PASS');
  perform t_ok(dela_release_precheck(c, 'push') = 'watch_in_progress', 'a new push waits for the watch to end');
  perform t_ok(dela_release_precheck(a, 'rollback') = 'ok', 'going back is allowed while Live is watched');

  update settings set value = '"+15555550123"' where key = 'alerts.sms_to';
  for i in 1..3 loop perform dela_release_watch_tick(b, false); end loop;
  perform t_ok((select watch_fails from releases where id = b) = 3, 'bad health checks counted');
  perform dela_release_watch_end(b, 'went_back', 'unhealthy 3 times');
  perform t_ok((select status from releases where id = b) = 'failed' and (select status from releases where id = a) = 'live', 'Live went back by itself to the earlier version');
  perform t_ok(exists (select 1 from notifications where title = 'Live went back to rc-1 by itself' and channel = 'email'), 'owner is emailed');
  perform t_ok(exists (select 1 from jobs where kind = 'send_sms' and payload->>'to' = '+15555550123' and payload->>'text' like '%went back%'), 'and texted');
  perform t_ok(dela_release_watch_end(b, 'passed', '')->>'reason' = 'not_watching', 'a watch ends once');
  perform t_ok(dela_release_precheck(c, 'push') = 'ok', 'pushing is open again after the watch');

  -- Failed push alerts by text too
  update settings set value = 'false' where key = 'alerts.sms';
  r := dela_release_approve_coded(owner_id, c, 'push', 'Control-Pass-2026', null, false);
  perform dela_release_claim(c, r->>'nonce');
  perform dela_release_finish(c, false, 'migration error');
  perform t_ok(exists (select 1 from notifications where title = 'DELA rc-3 did not go live'), 'failed push alert');
  perform t_ok(not exists (select 1 from jobs where kind = 'send_sms' and payload->>'text' like '%rc-3%'), 'no text when text alerts are off');
  update settings set value = 'true' where key = 'alerts.sms';

  -- Live health seen from Staging
  update settings set value = '{}' where key = 'live.status';
  for i in 1..3 loop perform dela_live_status_save('{"ok": false, "error": "404"}'); end loop;
  perform t_ok(not (dela_setting('live.status')->>'down')::boolean, 'no alert before Live has ever been healthy');
  perform dela_live_status_save('{"ok": true, "answered": true, "summary": {"code_version": "abc", "problems_24h": 0}}');
  perform t_ok(dela_setting('live.status')->>'code_version' = 'abc', 'Live summary saved');
  perform dela_live_status_save('{"ok": false, "error": "timeout"}');
  perform dela_live_status_save('{"ok": false, "error": "timeout"}');
  perform t_ok(not exists (select 1 from notifications where title = 'Live is not healthy'), 'two bad checks are not enough to alert');
  perform dela_live_status_save('{"ok": false, "error": "timeout"}');
  perform t_ok(exists (select 1 from notifications where title = 'Live is not healthy') and exists (select 1 from audit_log where action = 'live_down'), 'three bad checks alert the owner');
  perform dela_live_status_save('{"ok": false, "error": "timeout"}');
  perform t_ok((select count(*) from notifications where title = 'Live is not healthy' and channel = 'email') = 1, 'one alert, not one a minute');
  perform dela_live_status_save('{"ok": true, "answered": true}');
  perform t_ok(exists (select 1 from notifications where title = 'Live is healthy again'), 'recovery alert');

  -- Setting checks
  perform t_ok(dela_admin_set_setting(owner_id, 'live.project_ref', '"BAD-REF"', 'C', '')->>'reason' = 'bad_project_ref', 'Live project ID is checked');
  perform t_ok(dela_admin_set_setting(owner_id, 'alerts.sms_to', '"5555"', 'C', '')->>'reason' = 'bad_phone', 'phone number is checked');
  perform t_ok((dela_admin_set_setting(owner_id, 'alerts.sms_to', '"+15555550199"', 'C', 'my phone')->>'ok')::boolean, 'good phone number saved');
  perform t_ok(dela_admin_set_setting(owner_id, 'live.status', '{}', 'C', '')->>'reason' = 'locked_setting', 'system values cannot be edited');
  perform t_ok(dela_admin_set_setting(owner_id, 'release.watch_minutes', '45', 'C', '')->>'reason' = 'bad_value', 'watch is at most 30 minutes');

  -- Dashboard data and setup ticks
  r := dela_admin_control(owner_id);
  perform t_ok(jsonb_array_length(r->'releases') = 3 and (r->'settings'->>'watch_minutes')::int = 15 and r->'settings'->>'sms_to' = '***0199', 'dashboard data, phone masked');
  perform t_ok(exists (select 1 from jsonb_array_elements(r->'activity') x where x->>'action' = 'release_auto_back'), 'activity shows going back by itself');
  perform t_ok(r->'here'->>'environment' = 'staging' and r->'here' ? 'problems_24h', 'Staging health summary');
  perform t_ok(dela_admin_control(sup)->>'environment' = 'staging', 'the team can look');
  begin
    perform dela_admin_setup_tick(sup, 'uptime', true);
    raise exception 'FAILED: support ticked setup';
  exception when others then perform t_ok(sqlerrm = 'forbidden', 'only an owner ticks setup steps'); end;
  perform t_ok((dela_admin_setup_tick(owner_id, 'uptime', true)->>'ok')::boolean, 'owner ticks a setup step');
  perform t_ok((dela_setting('release.setup')->>'uptime')::boolean, 'setup step saved');
  perform t_ok(dela_admin_setup_tick(owner_id, 'nope', true)->>'reason' = 'bad_item', 'unknown setup step refused');

  -- At most 5 codes in 30 minutes
  update settings set value = '"brevo"' where key = 'email.sender';
  perform dela_release_mark_tested(owner_id, c, true);
  for i in 1..4 loop perform dela_release_code_request(owner_id, c, 'push', 'Control-Pass-2026', false); end loop;
  perform t_ok(dela_release_code_request(owner_id, c, 'push', 'Control-Pass-2026', false)->>'reason' = 'too_many_codes', 'no more than 5 codes in 30 minutes');
  perform t_ok((select count(*) from release_codes where release_id = c and used_at is null and expires_at > now()) = 1, 'only the newest code works');

  -- Clean up for release_test.sql
  delete from release_codes; delete from release_approvals; update releases set previous_release_id = null; delete from releases; delete from release_password;
  delete from jobs where kind in ('send_code', 'send_sms');
  update settings set value = '"log"' where key = 'email.sender';
  update settings set value = '""' where key in ('alerts.sms_to', 'live.project_ref');
  update settings set value = '{}' where key = 'live.status';
  update settings set value = '{"github_env": false, "uptime": false}' where key = 'release.setup';
end $$;
select 'release control tests passed' as result;

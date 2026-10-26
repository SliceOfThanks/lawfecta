-- Step 1 foundation tests. Run with tools/dbtest.sh on a throwaway database.
\set ON_ERROR_STOP 1

create or replace function t_ok(p boolean, p_msg text) returns void language plpgsql as $$
begin
  if p is not true then raise exception 'FAILED: %', p_msg; end if;
end $$;

create or replace function t_pass(p_bd bigint, p_plan text, p_jti text) returns jsonb language sql as $$
  select jsonb_build_object('bd_member_id', p_bd, 'bd_plan_id', p_plan, 'name', 'Member ' || p_bd, 'email', p_bd || '@test.invalid',
    'jti', p_jti, 'exp', extract(epoch from now() + interval '5 minutes')::bigint, 'token_hash', 'hash-' || p_jti, 'ip', '127.0.0.1', 'ua', 'test')
$$;

do $$
declare
  r jsonb; owner_id uuid; att_id uuid; fl_id uuid; v_res uuid; i int; v_job uuid; j jobs; v_ver bigint; ent jsonb;
begin
  perform t_ok(dela_setting_text('environment', '') = 'staging', 'new projects start as staging');

  -- Bootstrap: Stacey signs in once, then becomes owner (done by Claude at setup)
  r := dela_exchange(t_pass(1, '', 'p-owner-1'));
  perform t_ok(r->>'reason' = 'no_access', 'not on the access list means no access');
  select id into owner_id from people where bd_member_id = 1;
  perform t_ok(owner_id is not null, 'denied sign in still records the person');

  -- First owner comes from the bootstrap setting, only while nobody is owner
  update settings set value = '1' where key = 'bootstrap.owner_bd_member_id';
  r := dela_exchange(t_pass(2, '', 'p-not-owner'));
  perform t_ok(r->>'reason' = 'no_access', 'someone else does not become owner');
  r := dela_exchange(t_pass(1, '', 'p-owner-0'));
  perform t_ok((r->>'ok')::boolean and r->'me'->'staff' ? 'owner', 'the named member becomes owner at first sign in');
  insert into people (bd_member_id) values (3) on conflict do nothing;
  update settings set value = '3' where key = 'bootstrap.owner_bd_member_id';
  perform dela_admin_access_grant(owner_id, 3, 'access', 'x');
  r := dela_exchange(t_pass(3, '', 'p-owner-x'));
  perform t_ok(not (r->'me'->'staff' ? 'owner'), 'once there is an owner, the setting grants nothing');
  perform dela_admin_access_revoke(owner_id, (select id from access_list where bd_member_id = 3 and revoked_at is null));

  r := dela_exchange(t_pass(1, '', 'p-owner-1'));
  perform t_ok(r->>'reason' = 'pass_used', 'a pass works once');
  r := dela_exchange(t_pass(1, '', 'p-owner-2'));
  perform t_ok((r->>'ok')::boolean and r->>'route' = 'here', 'staff can open DELA without being on the list');
  perform t_ok(r->'me'->'staff' ? 'owner', 'me shows the owner role');
  perform t_ok(r->'me'->>'side' is null, 'no side until a plan is mapped or granted');

  -- Map BD plans to DELA plans
  perform t_ok((dela_admin_plan_map(owner_id, 'att_pro', 12)->>'ok')::boolean, 'map attorney pro');
  perform t_ok((dela_admin_plan_map(owner_id, 'fl_free', 20)->>'ok')::boolean, 'map freelancer free');
  perform t_ok(dela_admin_plan_map(owner_id, 'fl_plus', 12)->>'reason' = 'bd_plan_in_use', 'one BD plan maps to one DELA plan');

  -- Attorney test account
  perform t_ok((dela_admin_access_grant(owner_id, 100, 'access', 'Test attorney')->>'ok')::boolean, 'grant access');
  perform t_ok((dela_admin_access_grant(owner_id, 100, 'access', 'again')->>'duplicate')::boolean, 'granting twice is harmless');
  r := dela_exchange(t_pass(100, '12', 'p-att-1'));
  perform t_ok((r->>'ok')::boolean, 'listed attorney signs in');
  perform t_ok(r->'me'->>'side' = 'attorney', 'BD plan 12 makes them an attorney');
  perform t_ok(r->'me'->'sides'->0->>'plan_code' = 'att_pro', 'on attorney pro');
  perform t_ok(r->'me'->'sides'->0->>'verification_state' = 'not_started', 'attorneys start unverified');
  select id into att_id from people where bd_member_id = 100;
  perform t_ok(dela_session_resolve('hash-p-att-1')->>'person_id' = att_id::text, 'session resolves');
  perform t_ok(not exists (select 1 from jsonb_array_elements(r->'me'->'entitlements') e where e->>'key' like 'fl.%'), 'attorneys never see freelancer limits');

  -- Removing access ends the session at once
  perform dela_admin_access_revoke(owner_id, (select id from access_list where bd_member_id = 100 and channel = 'access' and revoked_at is null));
  perform t_ok(dela_session_resolve('hash-p-att-1') is null, 'revoked access kills the session');
  r := dela_exchange(t_pass(100, '12', 'p-att-2'));
  perform t_ok(r->>'reason' = 'no_access', 'and blocks the next sign in');
  perform dela_admin_access_grant(owner_id, 100, 'access', 'back');

  -- Freelancer on Free: proposals allowance is 5
  perform dela_admin_access_grant(owner_id, 200, 'access', 'Test freelancer');
  r := dela_exchange(t_pass(200, '20', 'p-fl-1'));
  select id into fl_id from people where bd_member_id = 200;
  perform t_ok(r->'me'->>'side' = 'freelancer', 'BD plan 20 makes them a freelancer');
  perform t_ok(r->'me'->'sides'->0->>'readiness_state' = 'incomplete', 'freelancers start incomplete');
  for i in 1..5 loop
    r := dela_quota_reserve(fl_id, 'freelancer', 'fl.proposals', 1, 'prop-' || i, 'gig-x');
    perform t_ok((r->>'ok')::boolean, 'proposal ' || i || ' fits');
  end loop;
  r := dela_quota_reserve(fl_id, 'freelancer', 'fl.proposals', 1, 'prop-6', 'gig-x');
  perform t_ok(r->>'reason' = 'limit_reached', 'sixth proposal is refused');
  r := dela_quota_reserve(fl_id, 'freelancer', 'fl.proposals', 1, 'prop-3', 'gig-x');
  perform t_ok((r->>'duplicate')::boolean and (r->>'ok')::boolean, 'a retry of the same proposal does not use more');
  select id into v_res from quota_reservations where idempotency_key = 'prop-5';
  perform t_ok(dela_quota_finish(v_res, false)->>'status' = 'released', 'a failed submit gives the allowance back');
  perform t_ok((dela_quota_reserve(fl_id, 'freelancer', 'fl.proposals', 1, 'prop-7', 'gig-y')->>'ok')::boolean, 'so another fits');
  select id into v_res from quota_reservations where idempotency_key = 'prop-1';
  perform t_ok(dela_quota_finish(v_res, true)->>'status' = 'settled', 'settle');
  perform t_ok((dela_quota_finish(v_res, true)->>'duplicate')::boolean, 'settling twice counts once');
  select e into ent from jsonb_array_elements(dela_entitlements(fl_id, 'freelancer')) e where e->>'key' = 'fl.proposals';
  perform t_ok((ent->>'used')::int = 1 and (ent->>'reserved')::int = 4 and (ent->>'remaining')::int = 0, 'counts add up: ' || ent::text);
  perform t_ok(dela_quota_reserve(fl_id, 'freelancer', 'fl.promotions_active', 1, 'promo-1')->>'reason' = 'not_in_plan', 'Free has no promotions');
  perform t_ok(dela_quota_reserve(fl_id, 'freelancer', 'att.gigs_active', 1, 'gig-1')->>'reason' = 'unknown_feature', 'freelancers cannot use attorney limits');
  perform t_ok((dela_quota_reserve(att_id, 'attorney', 'att.gigs_active', 1, 'att-gig-1')->>'ok')::boolean, 'attorney opens a gig');

  -- Holds stop new actions
  perform dela_admin_hold(owner_id, 200, 'test hold', 'high');
  perform t_ok(dela_quota_reserve(fl_id, 'freelancer', 'ai.runs', 1, 'ai-1')->>'reason' = 'on_hold', 'a hold blocks new actions');
  perform dela_admin_hold_release(owner_id, (select id from holds where state = 'active' limit 1), 'checked');
  perform t_ok((dela_quota_reserve(fl_id, 'freelancer', 'ai.runs', 1, 'ai-1')->>'ok')::boolean, 'released hold allows it again');

  -- Staff can give a second side by hand, and BD does not override it
  perform t_ok((dela_admin_grant_side(owner_id, 200, 'attorney', 'att_business')->>'ok')::boolean, 'grant attorney side');
  r := dela_exchange(t_pass(200, '20', 'p-fl-2') || '{"side": "attorney"}');
  perform t_ok(r->'me'->>'side' = 'attorney' and jsonb_array_length(r->'me'->'sides') = 2, 'person has both sides and picked attorney');
  perform t_ok((dela_session_set_side((r->>'session_id')::uuid, 'freelancer')->'me'->>'side') = 'freelancer', 'switch side');
  perform t_ok(dela_session_set_side((r->>'session_id')::uuid, 'agency')->>'reason' = 'no_such_side', 'unknown side refused');

  -- Settings
  perform t_ok(dela_admin_set_setting(owner_id, 'gig.duration_days', '"fourteen"', 'C', 'x')->>'reason' = 'wrong_type', 'a number stays a number');
  perform t_ok(dela_admin_set_setting(owner_id, 'environment', '"live"', 'C', 'x')->>'reason' = 'locked_setting', 'environment cannot be changed from the admin area');
  perform t_ok((dela_admin_set_setting(owner_id, 'engagement.minimum_cents', '20000', 'C', 'Stacey approved $200')->>'ok')::boolean, 'owner changes a setting');
  perform t_ok((dela_setting('engagement.minimum_cents'))::text = '20000', 'new value applies');
  perform t_ok(exists (select 1 from settings_history where key = 'engagement.minimum_cents'), 'history kept');
  perform t_ok(exists (select 1 from decision_log where decision_id = 'engagement.minimum_cents' and status = 'C' and approved_at is not null), 'decision recorded as confirmed');
  begin
    perform dela_admin_set_setting(att_id, 'gig.duration_days', '10', 'C', 'x');
    raise exception 'FAILED: a member changed a setting';
  exception when others then
    perform t_ok(sqlerrm = 'forbidden', 'members cannot use admin functions');
  end;

  -- Plans: a new version replaces the old one, which stays on record and cannot change
  r := dela_admin_plan_draft(owner_id, 'att_plus', '{"monthly_cents": 2400, "features": {"att.gigs_active": {"enabled": true, "limit": 5}}}');
  perform t_ok((r->>'version')::int = 2, 'draft is version 2');
  perform t_ok((dela_admin_plan_approve(owner_id, (r->>'version_id')::bigint)->>'ok')::boolean, 'approve');
  perform t_ok((select monthly_cents from plan_versions where plan_code = 'att_plus' and status = 'approved') = 2400, 'new price applies');
  perform t_ok((select quota_limit from plan_features pf join plan_versions v on v.id = pf.plan_version_id where v.plan_code = 'att_plus' and v.status = 'approved' and pf.feature_key = 'exports') = 2, 'untouched limits are copied');
  begin
    update plan_versions set monthly_cents = 1 where plan_code = 'att_plus' and version = 1;
    raise exception 'FAILED: retired plan changed';
  exception when others then
    perform t_ok(sqlerrm = 'plan_version_locked', 'old versions are locked');
  end;

  -- Audit log cannot be edited
  begin
    update audit_log set action = 'x';
    raise exception 'FAILED: audit changed';
  exception when others then
    perform t_ok(sqlerrm like 'append_only%', 'audit log is append-only');
  end;

  -- Switches and trials: 7 days of Pro from BD registration, new registrations only, once per member
  perform t_ok(not dela_switch_on('trials', fl_id), 'switches start off');
  perform dela_admin_set_switch(owner_id, 'trials', 'everyone');
  update settings set value = '"2026-01-01"' where key = 'trial.eligible_from';
  perform dela_admin_access_grant(owner_id, 300, 'access', 'new member');
  r := dela_exchange(t_pass(300, '20', 'p-trial-1') || jsonb_build_object('registered_at', now() - interval '2 days'));
  perform t_ok((r->'me'->'trial'->>'active')::boolean, 'new registration gets a trial');
  perform t_ok((select trial_ends_at::date from people where bd_member_id = 300) = (now() - interval '2 days' + interval '7 days')::date, 'trial runs 7 days from registration');
  select e into ent from jsonb_array_elements(r->'me'->'entitlements') e where e->>'key' = 'fl.proposals';
  perform t_ok((ent->>'limit')::int = 50, 'trial gives Pro limits');
  perform dela_admin_access_grant(owner_id, 301, 'access', 'old member');
  r := dela_exchange(t_pass(301, '20', 'p-trial-2') || jsonb_build_object('registered_at', '2025-05-01T00:00:00Z'));
  perform t_ok(not (r->'me'->'trial'->>'active')::boolean, 'members who registered before the start date get no trial');
  perform dela_admin_access_grant(owner_id, 302, 'access', 'expired trial');
  r := dela_exchange(t_pass(302, '20', 'p-trial-3') || jsonb_build_object('registered_at', now() - interval '10 days'));
  perform t_ok(not (r->'me'->'trial'->>'active')::boolean, 'a trial that ran out is not restarted by a late first visit');
  update people set trial_started_at = null, trial_ends_at = null where bd_member_id = 302;
  update people set trial_ends_at = now() - interval '1 day', trial_started_at = now() - interval '8 days' where bd_member_id = 300;
  r := dela_exchange(t_pass(300, '20', 'p-trial-4') || jsonb_build_object('registered_at', now()));
  perform t_ok(not (r->'me'->'trial'->>'active')::boolean, 'one trial per member');
  perform t_ok((select registered_at < now() - interval '1 day' from people where bd_member_id = 300), 'registration date is kept from the first visit');
  r := dela_exchange(t_pass(303, '20', 'p-trial-5') || jsonb_build_object('registered_at', 'not a date'));
  perform t_ok(r->>'reason' = 'no_access', 'a bad date does not break sign in');
  perform dela_admin_set_switch(owner_id, 'trials', 'off');
  perform t_ok((select (e->>'limit')::int from jsonb_array_elements(dela_entitlements((select id from people where bd_member_id = 300), 'freelancer')) e where e->>'key' = 'fl.proposals') = 5, 'trials off means plan limits');

  -- Owners
  perform t_ok(dela_admin_staff_revoke(owner_id, (select id from staff_roles where person_id = owner_id))->>'reason' = 'last_owner', 'the last owner stays');

  -- Jobs
  v_job := dela_job_enqueue('test', '{}', now(), 'job-1');
  perform t_ok(dela_job_enqueue('test', '{}', now(), 'job-1') = v_job, 'same job once');
  update jobs set max_attempts = 2 where id = v_job;
  select * into j from dela_job_lease(10, 30) where id = v_job;
  perform t_ok(j.status = 'running' and j.attempts = 1, 'leased');
  perform t_ok(dela_job_finish(v_job, false, 'boom', 1) = 'delayed', 'first failure retries');
  update jobs set run_at = now() where id = v_job;
  perform 1 from dela_job_lease(10, 30);
  perform t_ok(dela_job_finish(v_job, false, 'boom again', 1) = 'dead', 'stops after max attempts');
  v_job := dela_job_enqueue('test', '{}', now(), 'job-2');
  perform 1 from dela_job_lease(10, 30);
  update jobs set lease_until = now() - interval '1 second' where id = v_job;
  perform t_ok(exists (select 1 from dela_job_lease(10, 30) where id = v_job), 'a job whose worker died is picked up again');

  -- Notifications
  r := dela_notify(jsonb_build_object('person_id', fl_id, 'kind', 'test', 'title', 'Hello', 'email', true, 'dedupe_key', 'n-1'));
  perform t_ok(r->>'email_id' is not null, 'email notification queued');
  r := dela_notify(jsonb_build_object('person_id', fl_id, 'kind', 'test', 'title', 'Hello', 'email', true, 'dedupe_key', 'n-1'));
  perform t_ok(r->>'in_app_id' is null and r->>'email_id' is null, 'same notice is sent once');
  perform t_ok(exists (select 1 from jobs where kind = 'send_email'), 'email job created');
  perform t_ok(dela_notifications_read_all(fl_id) = 1, 'mark read');

  -- The Live copy sends test accounts to Staging
  update settings set value = '"live"' where key = 'environment';
  perform dela_admin_access_grant(owner_id, 400, 'staging_tester', 'Test attorney on staging');
  r := dela_exchange(t_pass(400, '12', 'p-stage-1'));
  perform t_ok(r->>'route' = 'staging' and r->>'session_id' is null, 'staging testers are routed, with no live session');
  update settings set value = '"staging"' where key = 'environment';

  -- Nobody but the service role can call DELA functions or read tables
  perform t_ok(not has_function_privilege('anon', 'dela_exchange(jsonb)', 'execute'), 'anon cannot call functions');
  perform t_ok(not has_table_privilege('authenticated', 'people', 'select'), 'authenticated cannot read tables');
  perform t_ok((select bool_and(relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'), 'RLS on every table');
end $$;

select 'foundation tests passed' as result;

-- Release gate tests: password, lockout, tested-only pushes, one-use approvals, finish and rollback.
\set ON_ERROR_STOP 1
do $$
declare owner_id uuid; sup uuid; r jsonb; rel1 bigint; rel2 bigint; nonce text; i int;
begin
  select person_id into owner_id from staff_roles where role = 'owner' and revoked_at is null limit 1;
  insert into people (bd_member_id, display_name) values (7001, 'Support person') returning id into sup;
  insert into staff_roles (person_id, role) values (sup, 'support');

  rel1 := dela_release_record('v0.1.0', repeat('a', 40), 'api-0.1.0', array['0001_foundation_tables.sql'], 'First release with the foundation', 'https://github.com/SliceOfThanks/lawfecta/actions/runs/1');
  perform dela_release_attach_report(rel1, 'PASS: all 16 steps');
  perform t_ok((select test_report from releases where id = rel1) = 'PASS: all 16 steps', 'test report saved with the version');
  r := dela_release_approve(owner_id, rel1, 'push', 'whatever-password');
  perform t_ok(r->>'reason' = 'no_password', 'no push before a release password exists');

  begin
    perform dela_release_password_set(sup, null, 'support-password-123');
    raise exception 'FAILED: support set the password';
  exception when others then perform t_ok(sqlerrm = 'forbidden', 'only an owner sets the release password'); end;
  perform t_ok(dela_release_password_set(owner_id, null, 'short')->>'reason' = 'password_too_short', 'at least 12 characters');
  perform t_ok((dela_release_password_set(owner_id, null, 'Stacey-Release-2026')->>'ok')::boolean, 'owner sets the release password');
  perform t_ok((select hash <> 'Stacey-Release-2026' from release_password), 'only a hash is stored');
  perform t_ok(dela_release_password_set(owner_id, 'wrong-current-pw', 'Another-Password-1')->>'reason' = 'wrong_password', 'changing it needs the current password');

  r := dela_release_approve(owner_id, rel1, 'push', 'Stacey-Release-2026');
  perform t_ok(r->>'reason' = 'not_tested', 'a version must be marked tested before it can be pushed');
  begin
    perform dela_release_approve(sup, rel1, 'push', 'Stacey-Release-2026');
    raise exception 'FAILED: support pushed';
  exception when others then perform t_ok(sqlerrm = 'forbidden', 'only an owner can push'); end;
  perform dela_release_mark_tested(owner_id, rel1, true);
  perform t_ok(dela_release_approve(owner_id, rel1, 'push', 'nope-nope-nope')->>'reason' = 'wrong_password', 'wrong password refused');
  update release_password set failed_attempts = 0;

  r := dela_release_approve(owner_id, rel1, 'push', 'Stacey-Release-2026');
  perform t_ok((r->>'ok')::boolean and length(r->>'nonce') = 64, 'right password gives a one-use approval');
  nonce := r->>'nonce';
  perform t_ok(not exists (select 1 from release_approvals where nonce_hash = nonce), 'the approval code itself is not stored');
  perform t_ok(dela_release_approve(owner_id, rel1, 'push', 'Stacey-Release-2026')->>'reason' = 'not_tested', 'no second approval while one is open');
  perform t_ok(dela_release_claim(rel1, 'made-up')->>'reason' = 'approval_not_valid', 'a made-up approval is refused');
  r := dela_release_claim(rel1, nonce);
  perform t_ok((r->>'ok')::boolean and r->>'commit' = repeat('a', 40) and r->>'action' = 'push', 'GitHub claims the approval and gets the exact commit');
  perform t_ok(dela_release_claim(rel1, nonce)->>'reason' = 'approval_not_valid', 'an approval works once');
  perform t_ok((dela_release_finish(rel1, true, 'migrations applied')->>'ok')::boolean, 'finish');
  perform t_ok((select status from releases where id = rel1) = 'live', 'version is live');
  perform t_ok(exists (select 1 from notifications where kind = 'release' and title like '%v0.1.0 is live%'), 'owner is told it is live');

  -- Second version, then roll back to the first
  rel2 := dela_release_record('v0.2.0', repeat('b', 40), 'api-0.2.0', array['0001_foundation_tables.sql', '0007_release_gate.sql'], 'Second release adds the release gate', 'https://github.com/SliceOfThanks/lawfecta/actions/runs/1');
  perform dela_release_mark_tested(owner_id, rel2, true);
  nonce := dela_release_approve(owner_id, rel2, 'push', 'Stacey-Release-2026')->>'nonce';
  perform dela_release_claim(rel2, nonce);
  perform dela_release_finish(rel2, true, 'ok');
  perform t_ok((select status from releases where id = rel1) = 'replaced' and (select status from releases where id = rel2) = 'live', 'new version replaces the old');
  perform t_ok(dela_release_approve(owner_id, rel2, 'rollback', 'Stacey-Release-2026')->>'reason' = 'not_rollback_target', 'cannot roll back to the version that is live');
  r := dela_release_approve(owner_id, rel1, 'rollback', 'Stacey-Release-2026');
  perform t_ok((r->>'ok')::boolean, 'roll back to the earlier version needs the password too');
  perform t_ok(dela_release_claim(rel1, r->>'nonce')->>'action' = 'rollback', 'rollback claimed');
  perform dela_release_finish(rel1, true, 'rolled back');
  perform t_ok((select status from releases where id = rel1) = 'live' and (select status from releases where id = rel2) = 'replaced', 'earlier version is live again');

  -- Expired approval
  rel2 := dela_release_record('v0.3.0', repeat('c', 40), '', '{}', 'Third release for expiry tests', 'https://github.com/SliceOfThanks/lawfecta/actions/runs/1');
  perform dela_release_mark_tested(owner_id, rel2, true);
  r := dela_release_approve(owner_id, rel2, 'push', 'Stacey-Release-2026');
  update release_approvals set expires_at = now() - interval '1 second' where release_id = rel2;
  perform t_ok(dela_release_claim(rel2, r->>'nonce')->>'reason' = 'approval_not_valid', 'an approval older than 15 minutes is refused');
  i := dela_release_expire();
  perform t_ok(i = 1 and (select status from releases where id = rel2) = 'tested', 'expired approval frees the version to be pushed again');

  -- Failed deploy keeps Live as it was
  r := dela_release_approve(owner_id, rel2, 'push', 'Stacey-Release-2026');
  perform dela_release_claim(rel2, r->>'nonce');
  perform dela_release_finish(rel2, false, 'migration error');
  perform t_ok((select status from releases where id = rel1) = 'live' and (select status from releases where id = rel2) = 'failed', 'a failed push leaves the live version in place');

  -- Lockout after five wrong passwords
  for i in 1..5 loop perform dela_release_approve(owner_id, rel2, 'push', 'wrong-' || i); end loop;
  perform t_ok(dela_release_approve(owner_id, rel2, 'push', 'Stacey-Release-2026')->>'reason' = 'locked', 'five wrong passwords lock pushing');
  perform t_ok(exists (select 1 from notifications where title = 'Release password locked'), 'owner is told about the lock');

  -- Live copy never accepts pushes
  update settings set value = '"live"' where key = 'environment';
  perform t_ok(dela_release_approve(owner_id, rel2, 'push', 'Stacey-Release-2026')->>'reason' = 'staging_only', 'pushes start only from Staging');
  update settings set value = '"staging"' where key = 'environment';
end $$;
select 'release tests passed' as result;

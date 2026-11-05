-- Step 3 tests: profiles, readiness, licenses and the identity check, LinkedIn checks, availability, firm staff, the
-- team's decisions, the yearly re-check and the daily job. Run with tools/dbtest.sh.
\set ON_ERROR_STOP 1

create or replace function t_ok(p boolean, p_msg text) returns void language plpgsql as $$
begin
  if p is not true then raise exception 'FAILED: %', p_msg; end if;
end $$;

do $$
declare
  att uuid; att2 uuid; fl uuid; both_p uuid; staff uuid; teammate uuid; r jsonb; lic uuid; lic2 uuid; li uuid; n int; tok text := 'hash-of-code-1';
begin
  insert into people (bd_member_id, display_name, email) values (8301, 'Ann Attorney', 'ann@login.invalid') returning id into att;
  insert into people (bd_member_id, display_name, email) values (8302, 'Ben Copycat', 'ben@login.invalid') returning id into att2;
  insert into people (bd_member_id, display_name, email) values (8303, 'Fay Freelancer', 'fay@login.invalid') returning id into fl;
  insert into people (bd_member_id, display_name, email) values (8304, 'Bo Both', 'bo@login.invalid') returning id into both_p;
  insert into people (bd_member_id, display_name, email) values (8305, 'Sam Staff', 'sam@login.invalid') returning id into staff;
  insert into people (bd_member_id, display_name, email) values (8306, 'Tia Teammate', 'tia@login.invalid') returning id into teammate;
  perform dela_ensure_side(att, 'attorney', 'att_plus', 'staff_grant');
  perform dela_ensure_side(att2, 'attorney', 'att_free', 'staff_grant');
  perform dela_ensure_side(fl, 'freelancer', 'fl_free', 'staff_grant');
  perform dela_ensure_side(both_p, 'attorney', 'att_free', 'staff_grant');
  perform dela_ensure_side(both_p, 'freelancer', 'fl_free', 'staff_grant');
  perform dela_ensure_side(teammate, 'attorney', 'att_free', 'staff_grant');
  insert into staff_roles (person_id, role) values (staff, 'reviewer');

  -- ---------- Switches ----------
  perform t_ok(dela_profile_get(att, 'attorney')->>'reason' = 'profiles_off', 'profiles are off until the switch is on');
  update feature_switches set state = 'everyone' where key in ('profiles', 'attorney_verification', 'freelancer_verification', 'profile_documents');
  r := dela_profile_get(att, 'attorney');
  perform t_ok((r->>'ok')::boolean and r->'state'->>'readiness' = 'incomplete' and r->'state'->>'verification' = 'not_started', 'a new attorney profile is incomplete and not verified');

  -- ---------- Saving ----------
  r := dela_profile_save(att, jsonb_build_object('side', 'attorney', 'body', '{"first_name":"Ann","last_name":"Attorney","firm_name":"Attorney Law"}'::jsonb, 'missing', '["practice_areas"]'::jsonb, 'score', 70, 'version', 0));
  perform t_ok((r->>'ok')::boolean and (r->>'version')::int = 1 and r->'state'->>'readiness' = 'incomplete', 'a part-done profile saves and stays incomplete');
  r := dela_profile_save(att, jsonb_build_object('side', 'attorney', 'body', '{"first_name":"Ann"}'::jsonb, 'missing', '[]'::jsonb, 'version', 0));
  perform t_ok(r->>'reason' = 'changed_elsewhere', 'a save from an older copy is refused');
  r := dela_profile_save(att, jsonb_build_object('side', 'attorney', 'body', '{"first_name":"Ann","last_name":"Attorney","firm_name":"Attorney Law"}'::jsonb, 'missing', '[]'::jsonb, 'score', 100, 'version', 1));
  perform t_ok((r->>'ok')::boolean and r->'state'->>'readiness' = 'verification_pending', 'complete but unverified: verification is next');
  perform t_ok((select readiness_state from side_profiles where person_id = att and side = 'attorney') = 'verification_pending', 'side_profiles follows');
  perform t_ok(not (dela_attorney_eligibility(att)->>'can_post')::boolean, 'an unverified attorney cannot post work');
  perform t_ok((select bd_state from member_profiles where person_id = att and side = 'attorney') = 'none', 'no directory write while bd_profile_sync is off');

  -- ---------- Licenses ----------
  r := dela_license_add(att, jsonb_build_object('request_id', 'l1', 'region', 'TX', 'bar_number', '24-012345', 'name_on_record', 'Ann Attorney', 'method', 'email', 'contact_email', 'ann@gmail.com', 'token', 'code1', 'token_hash', tok));
  perform t_ok(r->>'reason' = 'free_email', 'a Gmail address never counts');
  r := dela_license_add(att, jsonb_build_object('request_id', 'l1', 'region', 'ZZ', 'bar_number', '24-012345', 'name_on_record', 'Ann Attorney', 'method', 'video'));
  perform t_ok(r->>'reason' = 'bad_region', 'an unknown state is refused');
  r := dela_license_add(att, jsonb_build_object('request_id', 'l1', 'country', 'CA', 'region', 'ON', 'bar_number', '123', 'name_on_record', 'Ann Attorney', 'method', 'video'));
  perform t_ok(r->>'reason' = 'country_not_yet', 'countries outside verify.countries wait');
  r := dela_license_add(att, jsonb_build_object('request_id', 'l1', 'region', 'tx', 'bar_number', '24-012345', 'name_on_record', 'Ann Attorney', 'method', 'email', 'contact_email', 'Ann@AttorneyLaw.com', 'token', 'code1', 'token_hash', tok));
  lic := (r->>'id')::uuid;
  perform t_ok((r->>'ok')::boolean and r->>'status' = 'pending', 'a firm-domain email is accepted for the check');
  perform t_ok((dela_license_add(att, jsonb_build_object('request_id', 'l1'))->>'duplicate')::boolean, 'two clicks add one license');
  perform t_ok((select count(*) from notifications where person_id = att and channel = 'email' and to_email = 'ann@attorneylaw.com' and link like '%confirm=code1') = 1, 'the link goes to the license email, not the login email');
  perform t_ok(not exists (select 1 from email_checks where token_hash = 'code1'), 'only the hash of the code is kept for the check');
  perform t_ok(dela_a('AK') = 'an' and dela_a('TX') = 'a' and dela_a('NY') = 'an' and dela_a('CA') = 'a', 'a or an before a state code');
  perform t_ok(dela_license_email_confirm(att2, tok)->>'reason' = 'link_not_valid', 'the link does not work for another account');
  perform t_ok((dela_license_email_confirm(att, tok)->>'ok')::boolean, 'the attorney confirms the email');
  perform t_ok((select email_confirmed_at is not null from licenses where id = lic), 'the license email is confirmed');
  perform t_ok((dela_license_email_confirm(att, tok)->>'duplicate')::boolean, 'confirming twice is fine');
  r := dela_license_add(att, jsonb_build_object('request_id', 'l2', 'region', 'TX', 'bar_number', '24 012345', 'name_on_record', 'Ann Attorney', 'method', 'video'));
  perform t_ok(r->>'reason' = 'already_added', 'the same license twice on one account is refused');

  -- The same number on another account is flagged, not passed
  r := dela_license_add(att2, jsonb_build_object('request_id', 'x1', 'region', 'TX', 'bar_number', '24012345', 'name_on_record', 'Ann Attorney', 'method', 'video'));
  lic2 := (r->>'id')::uuid;
  perform t_ok((select duplicate_of = lic from licenses where id = lic2), 'a copied bar number is flagged as a duplicate');
  perform t_ok((select video_requested_at is not null from licenses where id = lic2), 'choosing the video call asks for it');

  -- ---------- The team decides ----------
  begin
    perform dela_admin_license_decide(att, lic, 'verified', 'firm_domain', '', '', '');
    raise exception 'FAILED: a member cannot decide';
  exception when others then
    perform t_ok(sqlerrm like '%forbidden%', 'only the Lawfecta Team decides');
  end;
  perform t_ok(dela_admin_license_decide(staff, lic, 'verified', '', '', '', '')->>'reason' = 'identity_needed', 'verifying needs how they showed it is theirs');
  perform t_ok(dela_admin_license_decide(staff, lic2, 'verified', 'firm_domain', '', '', '')->>'reason' = 'email_not_confirmed', 'an email method needs a confirmed email');
  perform t_ok(dela_admin_license_decide(staff, lic2, 'verified', 'video', '', '', '')->>'reason' = 'duplicate_needs_note', 'a duplicate needs a note to verify');
  perform t_ok(dela_admin_license_decide(staff, lic2, 'not_verified', '', 'x', '', '')->>'reason' = 'reason_needed', 'not verified needs a reason the attorney sees');
  perform t_ok((dela_admin_license_decide(staff, lic2, 'not_verified', '', 'The name and number belong to another attorney.', 'TX bar lookup', '')->>'ok')::boolean, 'the copy is refused');
  r := dela_admin_license_decide(staff, lic, 'verified', 'firm_domain', '', 'TX bar lookup: active, name matches', '');
  perform t_ok((r->>'ok')::boolean and r->'state'->>'verification' = 'verified' and r->'state'->>'readiness' = 'match_ready', 'verified: the attorney is ready');
  perform t_ok((select next_check_at from licenses where id = lic) = ((now() at time zone dela_tz())::date + interval '12 months')::date, 'the next yearly check is set');
  perform t_ok((dela_attorney_eligibility(att)->>'can_post')::boolean and not (dela_attorney_eligibility(att)->>'can_pay')::boolean, 'verified can post; paid work also needs firm details');
  perform t_ok((select count(*) from notifications where person_id = att and title = 'Your license is verified' and channel = 'email') = 1, 'the attorney is told by email');
  perform t_ok((select count(*) from verification_events where subject_id = lic) >= 4, 'every step is in the history');
  begin
    update verification_events set action = 'x' where subject_id = lic;
    raise exception 'FAILED: history can change';
  exception when others then
    perform t_ok(sqlerrm not like 'FAILED%', 'the history is append-only');
  end;

  -- ---------- Firm details and firm staff ----------
  insert into org_members (org_id, person_id, member_role) values (dela_side_org(att, 'attorney'), teammate, 'member');
  -- teammate's own side org is their personal one; firm staff edit through the owner's org
  perform t_ok(dela_firm_save(teammate, dela_side_org(att, 'attorney'), '{"legal_name":"Hijack"}'::jsonb)->>'reason' = 'firm_staff_only', 'a plain team member cannot change the firm details');
  perform t_ok((dela_firm_staff_set(att, 8306, true)->>'ok')::boolean, 'a verified owner names firm staff');
  perform t_ok((select member_role from org_members where org_id = dela_side_org(att, 'attorney') and person_id = teammate) = 'manager', 'the teammate is firm staff');
  perform t_ok(dela_firm_staff_set(att2, 8306, true)->>'reason' in ('verify_first', 'not_on_team'), 'an unverified owner cannot');
  perform t_ok(dela_firm_save(att2, dela_side_org(att, 'attorney'), '{"legal_name":"Hijack"}'::jsonb)->>'reason' = 'firm_staff_only', 'another firm cannot change them');
  perform t_ok(jsonb_array_length(dela_profile_get(teammate, 'attorney')->'firm'->'staff_of') = 1, 'firm staff see the firm they work for');
  perform t_ok((dela_firm_save(teammate, dela_side_org(att, 'attorney'), '{"legal_name":"Attorney Law PLLC","billing_address":"1 Main St, Austin TX"}'::jsonb)->>'ok')::boolean, 'firm staff set up the firm details');
  r := dela_firm_save(att, null, '{"legal_name":"Attorney Law PLLC","billing_address":"1 Main St, Austin TX","signatory_name":"Ann Attorney","service_email":"notices@attorneylaw.com"}'::jsonb);
  perform t_ok((r->>'ok')::boolean and (r->'eligibility'->>'can_pay')::boolean, 'with firm details, paid work is allowed');

  -- ---------- Freelancer: availability and LinkedIn ----------
  r := dela_profile_save(fl, jsonb_build_object('side', 'freelancer', 'body', '{"first_name":"Fay"}'::jsonb, 'missing', '[]'::jsonb, 'version', 0));
  perform t_ok(r->'state'->>'readiness' = 'verification_pending', 'complete freelancer: the LinkedIn check is next');
  perform t_ok(dela_linkedin_submit(fl, 'https://example.com/fay')->>'reason' = 'bad_linkedin', 'only a LinkedIn profile address');
  r := dela_linkedin_submit(fl, 'https://www.linkedin.com/in/fay-freelancer');
  li := (select id from linkedin_checks where person_id = fl and status = 'pending');
  perform t_ok((r->>'ok')::boolean and li is not null, 'the freelancer asks for the LinkedIn check');
  perform t_ok((dela_linkedin_submit(fl, 'https://www.linkedin.com/in/fay-freelancer/')->>'duplicate')::boolean, 'asking twice is one check');
  perform t_ok(dela_admin_linkedin_decide(staff, li, 'verified', true, false, '')->>'reason' = 'both_checks_needed', 'checked needs the name and the verified badge');
  r := dela_admin_linkedin_decide(staff, li, 'verified', true, true, '');
  perform t_ok(r->'state'->>'readiness' = 'availability_stale', 'checked, but availability not confirmed yet');
  r := dela_profile_availability(fl, 'available');
  perform t_ok(r->'state'->>'readiness' = 'match_ready', 'confirming availability makes the freelancer match-ready');
  perform t_ok((select count(*) from availability_log where person_id = fl) = 1, 'the answer is logged');
  update member_profiles set availability_confirmed_at = now() - interval '13 days' where person_id = fl;
  perform t_ok((dela_profiles_daily()->>'reminders')::int >= 1, 'the daily job reminds 2 days before');
  perform t_ok((select count(*) from notifications where person_id = fl and title = 'Confirm your availability' and channel = 'email') = 1, 'the reminder is emailed');
  perform dela_profiles_daily();
  perform t_ok((select count(*) from notifications where person_id = fl and title = 'Confirm your availability' and channel = 'in_app') = 1, 'one reminder per due date');
  update member_profiles set availability_confirmed_at = now() - interval '15 days' where person_id = fl;
  perform dela_profiles_daily();
  perform t_ok((select readiness_state from side_profiles where person_id = fl and side = 'freelancer') = 'availability_stale', 'after 14 days the freelancer drops out of matches');
  perform dela_profile_availability(fl, 'unavailable');
  perform t_ok(dela_profile_state(fl, 'freelancer')->>'readiness' = 'unavailable', 'not taking work shows as unavailable');

  -- ---------- Both sides: one directory listing ----------
  perform dela_profile_save(both_p, jsonb_build_object('side', 'attorney', 'body', '{"first_name":"Bo"}'::jsonb, 'missing', '[]'::jsonb, 'version', 0, 'directory', true));
  perform dela_profile_save(both_p, jsonb_build_object('side', 'freelancer', 'body', '{"first_name":"Bo"}'::jsonb, 'missing', '[]'::jsonb, 'version', 0, 'directory', true));
  perform t_ok((select count(*) from member_profiles where person_id = both_p and directory) = 1, 'only one side updates the listing');
  perform t_ok(dela_profile_state(both_p, 'attorney')->>'verification' = 'not_started' and dela_profile_state(both_p, 'freelancer')->>'verification' = 'not_started', 'each side has its own verification');

  -- ---------- Directory writes (switch on) ----------
  update feature_switches set state = 'everyone' where key = 'bd_profile_sync';
  r := dela_profile_save(att, jsonb_build_object('side', 'attorney', 'body', '{"first_name":"Ann","last_name":"Attorney","firm_name":"Attorney Law PLLC"}'::jsonb, 'missing', '[]'::jsonb, 'version', 2));
  perform t_ok(r->>'bd_state' = 'waiting' and exists (select 1 from jobs where kind = 'bd_profile_push' and payload->>'person_id' = att::text), 'a save queues the listing update');
  perform t_ok((dela_profile_for_bd(att, 'attorney', 3)->>'ok')::boolean, 'the worker gets the saved version');
  perform dela_profile_bd_result(att, 'attorney', 3, false, 'not_allowed');
  perform t_ok((select bd_state = 'failed' and bd_error = 'not_allowed' from member_profiles where person_id = att and side = 'attorney'), 'a refused write is shown, and the DELA profile stays saved');
  update feature_switches set state = 'off' where key = 'bd_profile_sync';

  -- ---------- Holds ----------
  insert into holds (scope_type, scope_id, rule, reason, created_by) values ('person', fl::text, 'test', 'test', staff);
  perform t_ok(dela_profile_save(fl, jsonb_build_object('side', 'freelancer', 'body', '{}'::jsonb, 'missing', '[]'::jsonb, 'version', 99))->>'reason' = 'on_hold', 'a member on hold cannot change the profile');
  perform t_ok(dela_profile_state(fl, 'freelancer')->>'readiness' = 'restricted', 'and is out of matches');

  -- ---------- The yearly re-check ----------
  update licenses set next_check_at = (now() at time zone dela_tz())::date where id = lic;
  r := dela_profiles_daily();
  perform t_ok((select recheck_due from licenses where id = lic) and dela_profile_state(att, 'attorney')->>'verification' = 'verified', 'a due re-check goes to the queue and still counts');
  perform t_ok(jsonb_array_length(dela_admin_verify(staff)->'licenses') >= 1, 'the team sees it in the queue');
  r := dela_admin_license_decide(staff, lic, 'recheck_ok', '', '', 'Still active', '');
  perform t_ok((r->>'ok')::boolean, 'the team records the re-check: ' || r::text);
  perform t_ok(not (select recheck_due from licenses where id = lic), 'the re-check is no longer due');
  update licenses set next_check_at = (now() at time zone dela_tz())::date - 31 where id = lic;
  perform dela_profiles_daily();
  perform t_ok((select status from licenses where id = lic) = 'expired' and dela_profile_state(att, 'attorney')->>'verification' = 'expired', 'past the grace days the license expires');
  perform t_ok(not (dela_attorney_eligibility(att)->>'can_post')::boolean, 'and posting work stops');

  -- Clean up switches for the other tests
  update feature_switches set state = 'off' where key in ('profiles', 'attorney_verification', 'freelancer_verification', 'profile_documents');
  update holds set state = 'released' where scope_id = fl::text;
end $$;

select 'profiles tests passed';

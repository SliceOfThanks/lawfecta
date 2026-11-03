-- Step 2 tests: playbook library, versions, suggestions, comments, team, limits, imports. Run with tools/dbtest.sh.
\set ON_ERROR_STOP 1

create or replace function t_ok(p boolean, p_msg text) returns void language plpgsql as $$
begin
  if p is not true then raise exception 'FAILED: %', p_msg; end if;
end $$;

do $$
declare
  own uuid; ed uuid; com uuid; v1 uuid; v2 uuid; v3 uuid; other uuid; org uuid; r jsonb; pb uuid; pb2 uuid; s uuid; c jsonb; full_body jsonb; v_ver bigint; imp uuid; n int;
begin
  insert into people (bd_member_id, display_name) values (8101, 'Olive Owner') returning id into own;
  insert into people (bd_member_id, display_name) values (8102, 'Eddie Editor') returning id into ed;
  insert into people (bd_member_id, display_name) values (8103, 'Cora Commenter') returning id into com;
  insert into people (bd_member_id, display_name) values (8104, 'Vic Viewer') returning id into v1;
  insert into people (bd_member_id, display_name) values (8105, 'Val Viewer') returning id into v2;
  insert into people (bd_member_id, display_name) values (8106, 'Vin Viewer') returning id into v3;
  insert into people (bd_member_id, display_name) values (8107, 'Other Firm') returning id into other;
  perform dela_ensure_side(own, 'attorney', 'att_free', 'staff_grant');
  foreach s in array array[ed, com, v1, v2, v3, other] loop perform dela_ensure_side(s, 'attorney', 'att_free', 'staff_grant'); end loop;
  org := dela_side_org(own, 'attorney');
  full_body := '{"title":"New client intake","outcome":"A signed engagement letter and an opened file","practice_area":"Family law","jurisdiction":"California","when_to_use":"A new client signs","roles":"Attorney: engagement\nParalegal: file","needs":["Intake form"],"steps":[{"text":"Run the conflict check"},{"text":"Send the engagement letter"},{"text":"Open the file"}],"checks":["Letter signed"],"review_points":["Attorney approves the engagement letter"],"deliverables":"Opened file"}';

  -- ---------- Switch and roles ----------
  r := dela_pb_create(jsonb_build_object('person_id', own, 'org_id', org, 'request_id', 'p1', 'title', 'Intake', 'body', '{}'::jsonb));
  perform t_ok(r->>'reason' = 'library_off', 'the library is off until its switch is on');
  update feature_switches set state = 'everyone' where key in ('playbook_library', 'scribe_import');
  perform t_ok(dela_pb_role(own, org) = 'administrator', 'the owner is the administrator');
  perform t_ok(dela_pb_role(other, org) is null, 'another firm has no role');

  r := dela_pb_create(jsonb_build_object('person_id', own, 'org_id', org, 'request_id', 'p1', 'title', 'Intake', 'body', '{"title":"Intake"}'::jsonb, 'completeness', 10, 'missing', '["Steps"]'::jsonb));
  pb := (r->>'id')::uuid;
  perform t_ok((r->>'ok')::boolean and not (r->>'duplicate')::boolean, 'the owner creates a playbook');
  perform t_ok((dela_pb_create(jsonb_build_object('person_id', own, 'org_id', org, 'request_id', 'p1', 'title', 'Intake', 'body', '{}'::jsonb))->>'duplicate')::boolean, 'two clicks make one playbook');
  perform t_ok(dela_pb_get(other, pb)->>'reason' = 'not_found', 'another firm cannot open it');
  perform t_ok(dela_pb_list(other, org)->>'reason' = 'not_found', 'or list the library');

  -- ---------- Team: seats and guests (Free has 1 seat, used by the owner) ----------
  perform t_ok(dela_pb_team_set(ed, org, 8103, 'commenter')->>'reason' = 'administrator_only', 'only the administrator changes the team');
  perform t_ok(dela_pb_team_set(own, org, 8102, 'editor')->>'reason' = 'no_seat', 'an editor needs a seat');
  perform t_ok((dela_pb_team_set(own, org, 8103, 'commenter')->>'ok')::boolean, 'a commenter is a guest');
  perform dela_pb_team_set(own, org, 8104, 'viewer');
  perform dela_pb_team_set(own, org, 8105, 'viewer');
  perform t_ok(dela_pb_team_set(own, org, 8106, 'viewer')->>'reason' = 'no_guest_place', 'up to 3 guests');
  perform t_ok(dela_pb_team_set(own, org, 9999999, 'viewer')->>'reason' = 'never_signed_in', 'only people who opened DELA');
  -- Upgrade to Business: 3 seats
  update side_profiles set plan_code = 'att_business' where person_id = own and side = 'attorney';
  perform t_ok((dela_pb_team_set(own, org, 8102, 'editor')->>'ok')::boolean, 'on Business the owner adds an editor');
  perform t_ok(dela_pb_role(ed, org) = 'editor', 'the editor has the editor role');
  perform t_ok(jsonb_array_length(dela_pb_libraries(ed)) = 2, 'the editor sees their own library and the firm''s');
  perform t_ok(exists (select 1 from notifications where person_id = ed and kind = 'playbook'), 'people added are told');

  -- ---------- Editing, versions, conflicts ----------
  r := dela_pb_save(jsonb_build_object('person_id', com, 'id', pb, 'base_version', 1, 'body', full_body));
  perform t_ok(r->>'reason' = 'not_allowed', 'a commenter cannot edit');
  r := dela_pb_save(jsonb_build_object('person_id', ed, 'id', pb, 'base_version', 1, 'body', full_body, 'title', 'New client intake', 'completeness', 100, 'missing', '[]'::jsonb));
  perform t_ok((r->>'version')::int = 2, 'an editor saves version 2');
  r := dela_pb_save(jsonb_build_object('person_id', own, 'id', pb, 'base_version', 1, 'body', full_body));
  perform t_ok(r->>'reason' = 'changed' and (r->>'current_version')::int = 2, 'a save from an older version is refused, nothing overwritten');

  -- ---------- Review and approval ----------
  perform t_ok(dela_pb_status(ed, pb, 'approve')->>'reason' = 'administrator_only', 'only the administrator approves');
  perform dela_pb_status(ed, pb, 'submit');
  perform t_ok((select status from playbooks where id = pb) = 'in_review', 'sent for review');
  perform t_ok(exists (select 1 from notifications where person_id = own and title = 'A playbook is ready for your review'), 'the administrator is told');
  perform t_ok((dela_pb_status(own, pb, 'approve')->>'ok')::boolean, 'the administrator approves a complete playbook');
  perform t_ok((select approved_version from playbooks where id = pb) = 2 and (select next_review_at from playbooks where id = pb) > current_date + 300, 'approved version and review date are kept');
  r := dela_pb_save(jsonb_build_object('person_id', ed, 'id', pb, 'base_version', 2, 'body', full_body, 'completeness', 100, 'missing', '[]'::jsonb, 'note', 'Small fix'));
  perform t_ok((select status from playbooks where id = pb) = 'draft' and (select approved_version from playbooks where id = pb) = 2, 'a change needs approving again; the approved version stays');

  -- An incomplete playbook cannot be approved
  r := dela_pb_create(jsonb_build_object('person_id', ed, 'org_id', org, 'request_id', 'p2', 'title', 'Billing', 'body', '{"title":"Billing"}'::jsonb, 'completeness', 20, 'missing', '["Steps (at least 3)"]'::jsonb));
  pb2 := (r->>'id')::uuid;
  perform t_ok(dela_pb_status(own, pb2, 'approve')->>'reason' = 'not_complete', 'an incomplete playbook cannot be approved');

  -- ---------- Suggestions ----------
  r := dela_pb_suggest(jsonb_build_object('person_id', com, 'id', pb, 'kind', 'ai', 'proposed', full_body));
  perform t_ok(r->>'reason' = 'not_allowed', 'a commenter cannot make AI changes');
  r := dela_pb_suggest(jsonb_build_object('person_id', ed, 'id', pb, 'kind', 'ai', 'base_version', 3, 'proposed', full_body || '{"deliverables":"Opened file and welcome email"}'::jsonb, 'note', 'Add welcome email'));
  s := (r->>'suggestion_id')::uuid;
  perform t_ok((select current_version from playbooks where id = pb) = 3, 'a suggestion changes nothing yet');
  perform t_ok((dela_pb_decide(ed, s, true, full_body || '{"deliverables":"Opened file and welcome email"}'::jsonb, '{"completeness":100,"missing":[]}'::jsonb, '')->>'ok')::boolean, 'an editor accepts an AI suggestion');
  perform t_ok((select current_version from playbooks where id = pb) = 4, 'accepting makes a new version');
  perform t_ok((dela_pb_decide(ed, s, true, full_body, '{}'::jsonb, '')->>'duplicate')::boolean, 'deciding twice does nothing more');

  -- A suggestion that removes an attorney review point needs the administrator
  r := dela_pb_suggest(jsonb_build_object('person_id', ed, 'id', pb, 'kind', 'ai', 'base_version', 4, 'proposed', full_body || '{"review_points":[]}'::jsonb, 'removes_review', true));
  s := (r->>'suggestion_id')::uuid;
  perform t_ok(dela_pb_decide(ed, s, true, full_body, '{}'::jsonb, '')->>'reason' = 'administrator_only', 'removing an attorney review point needs the administrator');
  perform t_ok(dela_pb_decide(own, s, false, null, '{}'::jsonb, 'Keep the review')->>'status' = 'rejected', 'the administrator rejects it');
  perform t_ok(exists (select 1 from notifications where person_id = ed and title = 'Your suggestion was not accepted'), 'the author is told');

  -- An AI suggestion made from an older version goes stale when someone saves
  r := dela_pb_suggest(jsonb_build_object('person_id', ed, 'id', pb, 'kind', 'ai', 'base_version', 4, 'proposed', full_body));
  s := (r->>'suggestion_id')::uuid;
  perform dela_pb_save(jsonb_build_object('person_id', own, 'id', pb, 'base_version', 4, 'body', full_body, 'completeness', 100, 'missing', '[]'::jsonb));
  perform t_ok((select status from playbook_suggestions where id = s) = 'stale', 'an old AI suggestion goes stale after a save');

  -- Comments: a note, and a suggested change only the administrator decides
  perform t_ok((dela_pb_comment(com, pb, 'outcome', null, 'Should we mention the retainer?')->>'ok')::boolean, 'a commenter leaves a note');
  r := dela_pb_suggest(jsonb_build_object('person_id', com, 'id', pb, 'kind', 'comment', 'part', 'outcome', 'proposed', '{"text":"A signed engagement letter, the retainer paid, and an opened file"}'::jsonb, 'comment', 'Add the retainer'));
  s := (r->>'suggestion_id')::uuid;
  perform t_ok((r->>'comment_id') is not null, 'a suggested change shows as a comment');
  perform t_ok(dela_pb_decide(ed, s, true, full_body, '{}'::jsonb, '')->>'reason' = 'administrator_only', 'only the administrator decides on comments');
  perform t_ok(dela_pb_comment_resolve(own, (r->>'comment_id')::uuid)->>'reason' = 'decide_suggestion_first', 'a suggestion comment closes when decided');
  perform t_ok((dela_pb_decide(own, s, true, full_body || '{"outcome":"A signed engagement letter, the retainer paid, and an opened file"}'::jsonb, '{"completeness":100,"missing":[]}'::jsonb, '')->>'ok')::boolean, 'the administrator accepts it');
  perform t_ok((select resolved_at from playbook_comments where suggestion_id = s) is not null, 'its comment is resolved');
  perform t_ok(dela_pb_comment(v1, pb, 'outcome', null, 'hi')->>'reason' = 'not_found', 'a viewer cannot comment');

  -- Restore an older version as a new one
  r := dela_pb_restore_version(own, pb, 2, '{"completeness":100,"missing":[]}'::jsonb);
  perform t_ok((select current_version from playbooks where id = pb) = (r->>'version')::int and (select body from playbook_versions where playbook_id = pb and version = (r->>'version')::int) = (select body from playbook_versions where playbook_id = pb and version = 2), 'restoring makes a new version with the old content');

  -- Exports: editors and up, logged once per request
  perform t_ok(dela_pb_export(v1, pb, 'docx', 'e1')->>'reason' = 'not_allowed', 'a viewer cannot export');
  perform dela_pb_export(ed, pb, 'docx', 'e1');
  perform dela_pb_export(ed, pb, 'docx', 'e1');
  perform t_ok((select count(*) from playbook_activity where playbook_id = pb and action = 'exported') = 1, 'one export per request in the log');
  perform t_ok(dela_pb_export(ed, pb, 'exe', 'e2')->>'reason' = 'bad_format', 'only the five formats');

  -- History cannot be changed
  begin
    update playbook_versions set note = 'x' where playbook_id = pb;
    perform t_ok(false, 'versions are append-only');
  exception when others then null;
  end;
  begin
    delete from playbook_activity where playbook_id = pb;
    perform t_ok(false, 'the activity log is append-only');
  exception when others then null;
  end;
  perform t_ok((select count(*) from playbook_activity where playbook_id = pb) >= 10, 'every event is in the log');

  -- ---------- Limits (a plan version with a limit of 2) ----------
  update side_profiles set plan_code = 'att_free' where person_id = own and side = 'attorney';
  insert into plan_versions (plan_code, version, monthly_cents, annual_cents, fee_bps, note) select plan_code, 99, monthly_cents, annual_cents, fee_bps, 'test' from plan_versions where plan_code = 'att_free' and status = 'approved' returning id into v_ver;
  insert into plan_features (plan_version_id, feature_key, enabled, quota_limit) select v_ver, feature_key, enabled, case when feature_key = 'att.playbooks_saved' then 2 else quota_limit end
    from plan_features where plan_version_id = (select id from plan_versions where plan_code = 'att_free' and status = 'approved');
  update plan_versions set status = 'retired' where plan_code = 'att_free' and status = 'approved';
  update plan_versions set status = 'approved', effective_from = now() where id = v_ver;
  perform t_ok(dela_pb_limit(org) = 2 and dela_pb_count(org) = 2, 'the library is at its limit');
  r := dela_pb_create(jsonb_build_object('person_id', own, 'org_id', org, 'request_id', 'p3', 'title', 'Third', 'body', '{}'::jsonb));
  perform t_ok(r->>'reason' = 'playbook_limit' and (r->>'limit')::int = 2, 'the third is refused with the numbers');
  perform dela_pb_status(own, pb2, 'archive');
  perform t_ok(dela_pb_create(jsonb_build_object('person_id', own, 'org_id', org, 'request_id', 'p3', 'title', 'Third', 'body', '{}'::jsonb))->>'reason' = 'playbook_limit', 'archiving does not free a place');
  perform dela_pb_status(own, pb2, 'trash');
  r := dela_pb_create(jsonb_build_object('person_id', own, 'org_id', org, 'request_id', 'p3', 'title', 'Third', 'body', '{}'::jsonb));
  perform t_ok((r->>'ok')::boolean, 'the trash frees a place');
  perform t_ok(dela_pb_status(own, pb2, 'restore')->>'reason' = 'playbook_limit', 'restoring over the limit is refused');
  perform t_ok(dela_pb_get(ed, pb2)->>'reason' = 'not_found', 'only the administrator sees the trash');
  perform t_ok((dela_pb_save(jsonb_build_object('person_id', ed, 'id', pb, 'base_version', (select current_version from playbooks where id = pb), 'body', full_body))->>'ok')::boolean, 'over the limit, existing playbooks stay editable');

  -- Put the Free plan back to no cap for the tests that run after this one
  insert into plan_versions (plan_code, version, monthly_cents, annual_cents, fee_bps, note) select plan_code, 100, monthly_cents, annual_cents, fee_bps, 'test undo' from plan_versions where id = v_ver returning id into v_ver;
  insert into plan_features (plan_version_id, feature_key, enabled, quota_limit) select v_ver, feature_key, enabled, case when feature_key = 'att.playbooks_saved' then null else quota_limit end
    from plan_features where plan_version_id = (select id from plan_versions where plan_code = 'att_free' and status = 'approved');
  update plan_versions set status = 'retired' where plan_code = 'att_free' and status = 'approved';
  update plan_versions set status = 'approved', effective_from = now() where id = v_ver;
  perform t_ok(dela_pb_limit(org) is null, 'the Free plan is back to no cap');

  -- ---------- Daily: review reminders, trash emptied ----------
  update playbooks set status = 'approved', next_review_at = current_date - 1 where id = pb;
  update playbooks set trashed_at = now() - interval '31 days' where id = pb2;
  c := dela_pb_daily();
  perform t_ok((c->>'reminders')::int >= 1 and (c->>'emptied')::int = 1, 'review reminders go out and the trash empties');
  perform t_ok((dela_pb_daily()->>'reminders')::int = 0, 'a reminder goes once');
  perform t_ok((select status from playbooks where id = pb2) = 'deleted' and exists (select 1 from playbook_versions where playbook_id = pb2), 'emptied playbooks keep their record');

  -- ---------- Team member removed loses access at once ----------
  perform dela_pb_team_set(own, org, 8103, 'remove');
  perform t_ok(dela_pb_role(com, org) is null, 'a removed member loses access');
  perform t_ok(exists (select 1 from playbook_comments where author = com), 'their comments stay');

  -- ---------- Imports ----------
  r := dela_import_save(jsonb_build_object('person_id', v1, 'org_id', org, 'request_id', 'i1', 'source', 'scribe', 'title', 'Filing', 'steps', '[{"text":"Click File"}]'::jsonb));
  perform t_ok(r->>'reason' = 'not_allowed', 'viewers cannot import');
  r := dela_import_save(jsonb_build_object('person_id', ed, 'org_id', org, 'request_id', 'i1', 'source', 'scribe', 'title', 'Filing', 'steps', '[]'::jsonb));
  perform t_ok(r->>'reason' = 'no_steps', 'an empty guide is refused');
  r := dela_import_save(jsonb_build_object('person_id', ed, 'org_id', org, 'request_id', 'i1', 'source', 'scribe', 'title', 'Filing',
    'steps', jsonb_build_array(jsonb_build_object('text', 'Click File', 'file_id', gen_random_uuid()))));
  perform t_ok(r->>'reason' = 'file_not_usable', 'screenshots must be this firm''s files');
  r := dela_import_save(jsonb_build_object('person_id', ed, 'org_id', org, 'request_id', 'i1', 'source', 'scribe', 'title', 'Filing',
    'steps', (select jsonb_agg(jsonb_build_object('text', 'Step ' || g)) from generate_series(1, 151) g)));
  perform t_ok(r->>'reason' = 'too_many_steps', 'very long guides are refused');
  r := dela_import_save(jsonb_build_object('person_id', ed, 'org_id', org, 'request_id', 'i1', 'source', 'scribe', 'title', 'Filing', 'steps', '[{"text":"Click File"},{"text":"Click Save as PDF"}]'::jsonb));
  imp := (r->>'id')::uuid;
  perform t_ok(jsonb_array_length(dela_import_get(ed, imp)->'steps') = 2, 'the guide waits on the review screen');
  perform t_ok(dela_import_get(other, imp) is null, 'another firm cannot see it');
  perform dela_import_finish(ed, imp, 'built', pb);
  perform t_ok((dela_import_finish(ed, imp, 'built', pb)->>'duplicate')::boolean, 'building twice makes one playbook');

  begin
    perform dela_admin_playbooks(own);
    perform t_ok(false, 'members cannot open the admin playbook view');
  exception when others then
    perform t_ok(sqlerrm = 'forbidden', 'members cannot open the admin playbook view');
  end;
end $$;
select 'playbook tests passed' as result;

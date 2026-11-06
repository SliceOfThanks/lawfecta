-- Step 2a tests: own AI keys, where AI runs, chats, files. Run with tools/dbtest.sh on a throwaway database.
\set ON_ERROR_STOP 1

create or replace function t_ok(p boolean, p_msg text) returns void language plpgsql as $$
begin
  if p is not true then raise exception 'FAILED: %', p_msg; end if;
end $$;

do $$
declare
  a uuid; b uuid; fl uuid; biz uuid; r jsonb; k1 uuid := gen_random_uuid(); k2 uuid := gen_random_uuid(); kf uuid := gen_random_uuid();
  v_job uuid; f1 uuid; f2 uuid; f3 uuid; v_chat uuid; v_folder uuid; n int; v_org uuid;
begin
  -- Four members: two attorneys on Free, a freelancer, an attorney on Business
  insert into people (bd_member_id, display_name, email) values (9001, 'Ann Attorney', 'a@test.invalid') returning id into a;
  insert into people (bd_member_id, display_name, email) values (9002, 'Bo Attorney', 'b@test.invalid') returning id into b;
  insert into people (bd_member_id, display_name, email) values (9003, 'Fay Freelancer', 'f@test.invalid') returning id into fl;
  insert into people (bd_member_id, display_name, email) values (9004, 'Biz Owner', 'z@test.invalid') returning id into biz;
  perform dela_ensure_side(a, 'attorney', 'att_free', 'staff_grant');
  perform dela_ensure_side(b, 'attorney', 'att_free', 'staff_grant');
  perform dela_ensure_side(fl, 'freelancer', 'fl_free', 'staff_grant');
  perform dela_ensure_side(biz, 'attorney', 'att_business', 'staff_grant');

  -- ---------- Settings and switches ----------
  perform t_ok(dela_int_setting('files.max_mb_per_file', 0) = 25, 'file size limit setting is in place');
  perform t_ok((select status from features where key = 'storage.mb') = 'C', 'storage per plan is approved');
  perform t_ok((select count(*) from feature_switches where key in ('byok', 'voice_input', 'file_uploads') and state = 'off') = 3, 'new switches start off');
  perform t_ok(exists (select 1 from decision_log where decision_id = 'ai.firm_keys' and version = '2a'), 'Stacey''s answers are in the decision log');

  -- ---------- Keys ----------
  r := dela_ai_key_save(jsonb_build_object('id', k1, 'person_id', a, 'side', 'attorney', 'provider', 'openai', 'ciphertext', 'v1.x.y', 'last4', 'abcd'));
  perform t_ok(r->>'reason' = 'byok_off', 'no keys while the byok switch is off');
  update feature_switches set state = 'everyone' where key in ('byok', 'ai_generation', 'voice_input', 'file_uploads');

  r := dela_ai_key_save(jsonb_build_object('id', k1, 'person_id', a, 'side', 'attorney', 'provider', 'mistral', 'ciphertext', 'v1.x.y', 'last4', 'abcd'));
  perform t_ok(r->>'reason' = 'bad_provider', 'only OpenAI and Claude keys');
  r := dela_ai_key_save(jsonb_build_object('id', k1, 'person_id', a, 'side', 'attorney', 'provider', 'openai', 'ciphertext', 'v1.x.y', 'last4', 'abcd'));
  perform t_ok((r->>'ok')::boolean and not (r->>'replaced')::boolean, 'a key is saved');
  r := dela_ai_key_save(jsonb_build_object('id', k1, 'person_id', a, 'side', 'attorney', 'provider', 'openai', 'ciphertext', 'v1.x.y', 'last4', 'abcd'));
  perform t_ok((r->>'duplicate')::boolean, 'the same save twice is one key');
  perform t_ok((select count(*) from ai_keys where person_id = a) = 1, 'still one key');
  perform t_ok((select mode from ai_prefs where person_id = a and side = 'attorney') = 'own_key', 'saving a key switches the member to their own key');
  perform t_ok(not (dela_ai_state(a, 'attorney')::text like '%v1.x.y%'), 'the AI settings screen never holds the sealed key');
  perform t_ok(dela_ai_state(a, 'attorney')->'own_key'->>'last4' = 'abcd', 'only the last 4 characters show');

  -- A queued AI job that will use the key; replacing the key stops it
  v_job := dela_job_enqueue('ai_reply', jsonb_build_object('ai_key_id', k1), now() + interval '1 hour', 'test-ai-job-1', a);
  r := dela_ai_key_save(jsonb_build_object('id', k2, 'person_id', a, 'side', 'attorney', 'provider', 'anthropic', 'ciphertext', 'v1.p.q', 'last4', 'wxyz'));
  perform t_ok((r->>'replaced')::boolean, 'saving again replaces the key');
  perform t_ok((select status from ai_keys where id = k1) = 'removed' and (select status from ai_keys where id = k2) = 'active', 'old key removed, new key active');
  perform t_ok((select status from jobs where id = v_job) = 'canceled', 'a job waiting on the old key is stopped');

  -- ---------- Where AI runs ----------
  r := dela_ai_route(a, 'attorney', 'chat', false);
  perform t_ok(r->>'source' = 'own_key' and r->>'provider' = 'anthropic' and (r->>'credits')::int = 0, 'chat runs on the member''s own key with no credits');
  r := dela_ai_route(a, 'attorney', 'voice', false);
  perform t_ok(r->>'source' = 'lawfecta' and r->>'why' = 'claude_key_voice', 'talking on a Claude key uses Lawfecta speech to text');
  r := dela_ai_route(a, 'attorney', 'chat', true);
  perform t_ok(r->>'source' = 'lawfecta', 'Use Lawfecta credits this time runs on Lawfecta''s key');
  update settings set value = 'false' where key = 'ai.byok_backup_credits';
  r := dela_ai_route(a, 'attorney', 'chat', true);
  perform t_ok(r->>'reason' = 'no_backup_credits', 'backup credits can be turned off');
  update settings set value = 'true' where key = 'ai.byok_backup_credits';

  perform dela_ai_key_result(k2, false, 'bad_key');
  perform t_ok((select status from ai_keys where id = k2) = 'failed' and (select failed_since from ai_keys where id = k2) is not null, 'a failing key is marked');
  r := dela_ai_route(a, 'attorney', 'chat', false);
  perform t_ok(r->>'source' = 'own_key', 'a failing key is still the member''s choice, never Lawfecta''s key on its own');

  -- Reminder after the set number of days, once
  update ai_keys set failed_since = now() - interval '4 days' where id = k2;
  perform t_ok(dela_ai_key_reminders() = 1, 'a key failing for 3 days gets a reminder');
  perform t_ok(dela_ai_key_reminders() = 0, 'the reminder goes once');
  perform t_ok(exists (select 1 from notifications where person_id = a and kind = 'ai_key' and channel = 'email'), 'the reminder is emailed');

  r := dela_ai_key_remove(a, 'attorney', 'person');
  perform t_ok((r->>'ok')::boolean and (select ciphertext from ai_keys where id = k2) = 'removed', 'removing a key wipes the sealed key');
  r := dela_ai_route(a, 'attorney', 'chat', false);
  perform t_ok(r->>'source' = 'lawfecta', 'after removing the key, the member is back on Lawfecta''s AI');
  r := dela_ai_set_mode(a, 'attorney', 'own_key');
  r := dela_ai_route(a, 'attorney', 'chat', false);
  perform t_ok(r->>'reason' = 'no_key', 'own key chosen with no key says so, and does not use Lawfecta''s key');
  perform dela_ai_set_mode(a, 'attorney', 'lawfecta');

  -- Firm keys: only the owner on Business
  r := dela_ai_key_save(jsonb_build_object('id', kf, 'person_id', a, 'side', 'attorney', 'scope', 'org', 'provider', 'openai', 'ciphertext', 'v1.f.f', 'last4', 'firm'));
  perform t_ok(r->>'reason' = 'not_firm_owner', 'a Free attorney cannot add a firm key');
  r := dela_ai_key_save(jsonb_build_object('id', kf, 'person_id', biz, 'side', 'attorney', 'scope', 'org', 'provider', 'openai', 'ciphertext', 'v1.f.f', 'last4', 'firm'));
  perform t_ok((r->>'ok')::boolean, 'the Business owner adds a firm key');
  perform dela_ai_set_mode(biz, 'attorney', 'own_key');
  r := dela_ai_route(biz, 'attorney', 'chat', false);
  perform t_ok(r->>'source' = 'firm_key', 'with no personal key the firm key is used');
  -- A team member of the firm uses it too, and loses it when removed from the firm
  insert into org_members (org_id, person_id, member_role) values (dela_side_org(biz, 'attorney'), b, 'member');
  perform t_ok((dela_firm_key_for(b, 'attorney')).id = kf, 'a firm member can use the firm key');
  update org_members set status = 'removed' where person_id = b and org_id = dela_side_org(biz, 'attorney');
  perform t_ok((dela_firm_key_for(b, 'attorney')).id is null, 'a removed member cannot');

  -- Switches and pause
  update feature_switches set state = 'off' where key = 'voice_input';
  perform t_ok(dela_ai_route(b, 'attorney', 'voice', false)->>'reason' = 'voice_off', 'talking off means no speech to text');
  update feature_switches set state = 'everyone' where key = 'voice_input';
  update settings set value = jsonb_set(value, '{ai}', 'true') where key = 'emergency.pause';
  perform t_ok(dela_ai_route(b, 'attorney', 'chat', false)->>'reason' = 'paused', 'the AI pause stops AI');
  update settings set value = jsonb_set(value, '{ai}', 'false') where key = 'emergency.pause';

  -- Usage history cannot be changed
  perform dela_ai_usage_log(jsonb_build_object('person_id', b, 'side', 'attorney', 'task', 'chat', 'source', 'lawfecta', 'ok', true, 'credits', 1));
  begin
    update ai_usage set credits = 0;
    perform t_ok(false, 'ai usage is append-only');
  exception when others then null;
  end;

  -- ---------- Files ----------
  r := dela_file_start(jsonb_build_object('person_id', fl, 'side', 'freelancer', 'request_id', 'r0', 'name', 'cv.pdf', 'size_bytes', 100, 'ticked', true));
  perform t_ok(r->>'reason' = 'attorneys_only', 'freelancer uploads come in Step 3');
  r := dela_file_start(jsonb_build_object('person_id', a, 'side', 'attorney', 'request_id', 'r1', 'name', 'Intake process.pdf', 'size_bytes', 1000, 'ticked', false));
  perform t_ok(r->>'reason' = 'tick_needed', 'the no client information box must be ticked');
  r := dela_file_start(jsonb_build_object('person_id', a, 'side', 'attorney', 'request_id', 'r1', 'name', 'setup.exe', 'size_bytes', 1000, 'ticked', true));
  perform t_ok(r->>'reason' = 'type_not_allowed', 'programs are refused');
  r := dela_file_start(jsonb_build_object('person_id', a, 'side', 'attorney', 'request_id', 'r1', 'name', 'Big.pdf', 'size_bytes', 26 * 1048576, 'ticked', true));
  perform t_ok(r->>'reason' = 'file_too_big', 'files over the size limit are refused');
  r := dela_file_start(jsonb_build_object('person_id', a, 'side', 'attorney', 'request_id', 'r1', 'name', 'Intake process.PDF', 'size_bytes', 1000, 'ticked', true));
  perform t_ok((r->>'ok')::boolean and r->>'storage_path' like '%.pdf', 'an upload starts');
  f1 := (r->>'file_id')::uuid;
  r := dela_file_start(jsonb_build_object('person_id', a, 'side', 'attorney', 'request_id', 'r1', 'name', 'Intake process.PDF', 'size_bytes', 1000, 'ticked', true));
  perform t_ok((r->>'duplicate')::boolean and (r->>'file_id')::uuid = f1, 'the same upload twice is one file');

  -- Storage limit (Attorney Free: 1 GB since step 9b): space counts uploads in progress
  for n in 1..43 loop
    r := dela_file_start(jsonb_build_object('person_id', a, 'side', 'attorney', 'request_id', 'big' || n, 'name', 'part' || n || '.pdf', 'size_bytes', 24 * 1048576, 'ticked', true));
  end loop;
  perform t_ok(r->>'reason' = 'storage_full', 'the storage allowance is checked when an upload starts');
  delete from files where request_id like 'big%';

  -- Upload finishes, the check passes, the file is ready
  r := dela_file_uploaded(b, 'attorney', f1, 1000);
  perform t_ok(r->>'reason' = 'not_found', 'only the uploader finishes an upload');
  r := dela_file_uploaded(a, 'attorney', f1, 1000);
  perform t_ok(r->>'status' = 'checking', 'upload finished, checking');
  perform t_ok(exists (select 1 from jobs where idempotency_key = 'filecheck:' || f1), 'a check job is queued as a backup');
  r := dela_file_checked(f1, '{"ok": true, "mime": "application/pdf", "text": "Step 1. Open the intake form.", "flagged": false, "reasons": []}');
  perform t_ok(r->>'status' = 'ready' and (select is_current from files where id = f1), 'a clear file is ready');
  perform t_ok((select body from file_texts where file_id = f1) like 'Step 1%', 'its text is kept for the AI');

  -- Another attorney cannot see or open it
  perform t_ok(dela_file_open(b, 'attorney', f1, '')->>'reason' = 'not_found', 'another firm cannot open the file');
  perform t_ok(dela_file_open(a, 'attorney', f1, '')->>'storage_path' is not null, 'the owner can');
  perform t_ok(exists (select 1 from audit_log where action = 'file_opened' and object_id = f1::text), 'opening is logged');

  -- A file that looks like it holds client information is held
  r := dela_file_start(jsonb_build_object('person_id', a, 'side', 'attorney', 'request_id', 'r2', 'name', 'Smith matter.docx', 'size_bytes', 500, 'ticked', true));
  f2 := (r->>'file_id')::uuid;
  perform dela_file_uploaded(a, 'attorney', f2, 500);
  r := dela_file_checked(f2, '{"ok": true, "text": "Client: John Smith", "flagged": true, "reasons": ["client_name"]}');
  perform t_ok(r->>'status' = 'held', 'flagged file is held');
  perform t_ok(exists (select 1 from notifications where kind = 'file' and person_id = a and title = 'Please check a file'), 'the member is told');

  -- The AI cannot use a held file
  r := dela_ai_chat_prepare(jsonb_build_object('person_id', a, 'side', 'attorney', 'request_id', 'c1', 'content', 'Summarize this', 'file_ids', jsonb_build_array(f2)));
  perform t_ok(r->>'reason' = 'file_not_usable', 'a held file cannot go to the AI');
  perform dela_file_action(a, 'attorney', jsonb_build_object('action', 'confirm', 'file_id', f2));
  perform t_ok((select check_state from files where id = f2) = 'confirmed', 'the member confirms it has no client information');

  -- Chat: one user message per request, history, files
  r := dela_ai_chat_prepare(jsonb_build_object('person_id', a, 'side', 'attorney', 'request_id', 'c1', 'content', 'Summarize this', 'file_ids', jsonb_build_array(f1, f2)));
  perform t_ok((r->>'ok')::boolean and jsonb_array_length(r->'files') = 2, 'the AI gets the files');
  v_chat := (r->>'chat_id')::uuid;
  r := dela_ai_chat_prepare(jsonb_build_object('person_id', a, 'side', 'attorney', 'request_id', 'c1', 'content', 'Summarize this', 'file_ids', jsonb_build_array(f1, f2)));
  perform t_ok((r->>'chat_id')::uuid = v_chat and (select count(*) from ai_messages where chat_id = v_chat) = 1, 'sending again does not repeat the message or make a new chat');
  perform dela_ai_chat_reply(v_chat, 'c1', 'Here is the summary.', 'lawfecta', 'openai', 'test-model');
  r := dela_ai_chat_prepare(jsonb_build_object('person_id', a, 'side', 'attorney', 'chat_id', v_chat, 'request_id', 'c1', 'content', 'Summarize this'));
  perform t_ok((r->>'duplicate')::boolean and r->'reply'->>'content' = 'Here is the summary.', 'a repeated send gets the saved answer');
  r := dela_ai_chat_prepare(jsonb_build_object('person_id', a, 'side', 'attorney', 'chat_id', v_chat, 'request_id', 'c2', 'content', 'And step 2?'));
  perform t_ok(jsonb_array_length(r->'history') = 2, 'the next message sees the earlier ones');
  perform t_ok(dela_ai_chat_get(b, 'attorney', v_chat) is null, 'another member cannot read the chat');
  r := dela_ai_chat_prepare(jsonb_build_object('person_id', b, 'side', 'attorney', 'chat_id', v_chat, 'request_id', 'c3', 'content', 'hi'));
  perform t_ok(r->>'reason' = 'not_found', 'or add to it');

  -- New version, folders, trash and restore
  r := dela_file_action(a, 'attorney', jsonb_build_object('action', 'folder_new', 'name', 'Intake'));
  v_folder := (r->>'folder_id')::uuid;
  perform t_ok((dela_file_action(a, 'attorney', jsonb_build_object('action', 'folder_new', 'name', 'intake'))->>'duplicate')::boolean, 'folder names are unique');
  perform dela_file_action(a, 'attorney', jsonb_build_object('action', 'move', 'file_id', f1, 'folder_id', v_folder));
  perform t_ok(dela_file_action(a, 'attorney', jsonb_build_object('action', 'folder_delete', 'folder_id', v_folder))->>'reason' = 'folder_not_empty', 'a folder with files stays');
  r := dela_file_start(jsonb_build_object('person_id', a, 'side', 'attorney', 'request_id', 'r3', 'name', 'Intake process v2.pdf', 'size_bytes', 1200, 'ticked', true, 'replace_of', f1));
  f3 := (r->>'file_id')::uuid;
  perform t_ok((select version from files where id = f3) = 2 and (select folder_id from files where id = f3) = v_folder, 'a new version joins the same file and folder');
  perform dela_file_uploaded(a, 'attorney', f3, 1200);
  perform dela_file_checked(f3, '{"ok": true, "text": "v2", "flagged": false, "reasons": []}');
  perform t_ok((select is_current from files where id = f3) and not (select is_current from files where id = f1), 'the new version is shown; the old one is kept');
  perform t_ok(jsonb_array_length(dela_file_versions(a, 'attorney', f3)) = 2, 'both versions are listed');
  perform dela_file_action(a, 'attorney', jsonb_build_object('action', 'rename', 'file_id', f3, 'name', 'Intake'));
  perform t_ok((select name from files where id = f3) = 'Intake.pdf', 'renaming keeps the file type');

  perform dela_file_action(a, 'attorney', jsonb_build_object('action', 'trash', 'file_id', f3));
  perform t_ok((select count(*) from files where group_id = f1 and status = 'trash') = 2, 'deleting moves every version to the trash');
  perform dela_file_action(a, 'attorney', jsonb_build_object('action', 'restore', 'file_id', f3));
  perform t_ok((select count(*) from files where group_id = f1 and status = 'ready') = 2, 'restore brings them back');
  perform dela_file_action(a, 'attorney', jsonb_build_object('action', 'trash', 'file_id', f3));
  perform t_ok(jsonb_array_length(dela_files_sweep_due()) = 0, 'the trash keeps files for its days');
  update files set trashed_at = now() - interval '31 days' where group_id = f1;
  perform t_ok(jsonb_array_length(dela_files_sweep_due()) = 2, 'after 30 days the trash is emptied');
  perform dela_file_mark_deleted(f1);
  perform t_ok((select status from files where id = f1) = 'deleted' and not exists (select 1 from file_texts where file_id = f1), 'deleted files lose their text');

  -- A refused file (wrong type) and an unfinished upload
  r := dela_file_start(jsonb_build_object('person_id', a, 'side', 'attorney', 'request_id', 'r4', 'name', 'notreally.pdf', 'size_bytes', 300, 'ticked', true));
  perform dela_file_uploaded(a, 'attorney', (r->>'file_id')::uuid, 300);
  r := dela_file_checked((r->>'file_id')::uuid, '{"ok": false, "reason": "wrong_type"}');
  perform t_ok(r->>'status' = 'refused', 'a renamed program is refused');
  r := dela_file_start(jsonb_build_object('person_id', a, 'side', 'attorney', 'request_id', 'r5', 'name', 'left.txt', 'size_bytes', 300, 'ticked', true));
  update files set created_at = now() - interval '2 hours' where id = (r->>'file_id')::uuid;
  perform t_ok(dela_files_sweep_due()::text like '%' || (r->>'file_id') || '%', 'uploads that never finish are cleared');

  -- Admin view needs the Lawfecta Team
  begin
    perform dela_admin_ai_files(a);
    perform t_ok(false, 'members cannot open the admin AI view');
  exception when others then
    perform t_ok(sqlerrm = 'forbidden', 'members cannot open the admin AI view');
  end;
end $$;
select 'ai and files tests passed' as result;

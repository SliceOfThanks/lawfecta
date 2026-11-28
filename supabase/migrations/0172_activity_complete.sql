-- Step 94b: the Activity list on Release Control shows everything that changed (Stacey 2026-11-27: "why does the
-- activity in dela-admin not update automatically? A lot of activity has happened since November 20").
-- The list reads the audit log, and the audit log was written only by the admin area's own buttons. Since the site
-- went live, versions were released and switches set straight in the database, which wrote nothing. From here every
-- change of a switch, a setting or the live version writes its own line, whoever made it and however. The releases
-- since 8 November are added from the project's history, marked as added afterwards. Additive.

create or replace function dela_note_direct_change() returns trigger language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_action text; v_type text; v_from jsonb; v_to jsonb;
begin
  if tg_table_name = 'feature_switches' then
    if new.state is not distinct from old.state then return null; end if;
    v_action := 'switch_changed'; v_type := 'switch'; v_from := to_jsonb(old.state); v_to := to_jsonb(new.state);
  else
    if new.value is not distinct from old.value then return null; end if;
    -- What DELA writes by itself every minute or on its own schedule is not news
    if new.key like 'worker.%' or new.key like 'live.%' or new.key like 'reminders.%' or new.key in ('release.setup', 'emergency.pause') then return null; end if;
    v_action := case when new.key = 'code_version' then 'release_version' else 'setting_changed' end;
    v_type := 'setting'; v_from := old.value; v_to := new.value;
  end if;
  -- The admin area's own buttons write their line themselves, in the same transaction: no second one
  if exists (select 1 from audit_log a where a.at = now() and a.object_id = new.key and a.action = v_action) then return null; end if;
  insert into audit_log (actor_type, action, object_type, object_id, detail) values ('system', v_action, v_type, new.key, jsonb_build_object('from', v_from, 'to', v_to, 'how', 'direct'));
  return null;
end $$;
revoke all on function dela_note_direct_change() from public, anon, authenticated;

drop trigger if exists feature_switches_noted on feature_switches;
create constraint trigger feature_switches_noted after update on feature_switches deferrable initially deferred for each row execute function dela_note_direct_change();
drop trigger if exists settings_noted on settings;
create constraint trigger settings_noted after update on settings deferrable initially deferred for each row execute function dela_note_direct_change();

-- A release says what it was: the note is the line the Activity list shows
drop function if exists dela_code_release(text);
create or replace function dela_code_release(p_commit text, p_note text default '') returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_was text := dela_setting_text('code_version', '');
begin
  if p_commit !~ '^[0-9a-f]{40}$' then return jsonb_build_object('ok', false, 'reason', 'bad_commit'); end if;
  if dela_setting_text('code.source', 'jsdelivr') = 'storage' and not exists (select 1 from code_versions where commit = p_commit and status = 'ready') then
    return jsonb_build_object('ok', false, 'reason', 'not_copied');
  end if;
  if v_was is distinct from p_commit then
    insert into audit_log (actor_type, action, object_type, object_id, detail) values ('system', 'release_version', 'setting', 'code_version',
      jsonb_build_object('from', v_was, 'to', p_commit, 'note', left(coalesce(p_note, ''), 300)) - case when coalesce(p_note, '') = '' then 'note' else '' end);
    update settings set value = to_jsonb(p_commit) where key = 'code_version';
  end if;
  return jsonb_build_object('ok', true, 'code_version', p_commit);
end $$;
revoke all on function dela_code_release(text, text) from public, anon, authenticated;

-- The list: newest first by time (lines added afterwards carry their real time), and more of them
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_admin_control(uuid)'::regprocedure) into v_src;
  v_new := replace(v_src, $a$jsonb_agg(x order by (x->>'id')::bigint desc), '[]') from ($a$, $b$jsonb_agg(x order by (x->>'at')::timestamptz desc, (x->>'id')::bigint desc), '[]') from ($b$);
  v_new := replace(v_new, $a$order by a.id desc limit 60) t$a$, $b$order by a.at desc, a.id desc limit 200) t$b$);
  if v_new = v_src and position($b$order by a.at desc, a.id desc limit 200$b$ in v_src) = 0 then raise exception 'dela_admin_control changed; update 0172'; end if;
  if v_new <> v_src then execute v_new; end if;
end $$;

-- The releases since the last one the list knows (8 November), from the project's history. Live site only, once.
do $$
begin
  if dela_setting_text('environment', 'staging') = 'live' and not exists (select 1 from audit_log where action = 'release_version' and detail ? 'added_afterwards') then
    insert into audit_log (at, actor_type, action, object_type, object_id, detail)
    select v.at::timestamptz, 'system', 'release_version', 'setting', 'code_version', jsonb_build_object('note', v.note, 'to', v.sha, 'added_afterwards', true)
    from (values
    ('2026-11-12T17:54:45-08:00', $n$step 17 and the Subscription fixes (code_version a9d91da, api 106, migration 0103)$n$, 'a9d91da'),
    ('2026-11-12T19:24:14-08:00', $n$step 18 part 1 (code_version 0507de6, api 107, migration 0104)$n$, '0507de6'),
    ('2026-11-12T19:44:38-08:00', $n$step 18 part 2 (code_version decc029, api 108, migration 0105)$n$, 'decc029'),
    ('2026-11-12T20:35:57-08:00', $n$step 18 part 4 and bookmarks (code_version cec3b81, api 110, migrations 0107 and 0108)$n$, 'cec3b81'),
    ('2026-11-12T20:54:09-08:00', $n$step 19, the Subscription redesign (code_version a716cca, api 111, migration 0109)$n$, 'a716cca'),
    ('2026-11-13T07:56:13-08:00', $n$step 20 (code_version 7e5a98f, api 112, migration 0110) and the five sample freelancers$n$, '7e5a98f'),
    ('2026-11-13T08:27:58-08:00', $n$the "Save my picture" change (code_version d847227)$n$, 'd847227'),
    ('2026-11-13T08:45:22-08:00', $n$the Talent line on the Profile page (code_version 7462ba2)$n$, '7462ba2'),
    ('2026-11-13T09:54:12-08:00', $n$steps 21 and 22 (code_version c9bd839, api 113, migrations 0111 and 0112)$n$, 'c9bd839'),
    ('2026-11-13T10:49:51-08:00', $n$step 23 (code_version 58e6e9d, api 114, migration 0113)$n$, '58e6e9d'),
    ('2026-11-13T11:24:13-08:00', $n$step 24 and the Vectera connection (code_version 675235e, api 115, migrations 0114 and 0115)$n$, '675235e'),
    ('2026-11-13T11:51:47-08:00', $n$step 25 part 1 (code_version e81f826, api 117, migration 0116) and the first real VideoSDK room$n$, 'e81f826'),
    ('2026-11-13T12:28:36-08:00', $n$step 25 part 2 and step 26 (code_version ee087f0, api 118, migrations 0117 and 0118); check 3 matches the prepared meeting$n$, 'ee087f0'),
    ('2026-11-13T12:35:12-08:00', $n$step 27 (code_version 4a64183, api 119, migration 0119)$n$, '4a64183'),
    ('2026-11-13T13:07:32-08:00', $n$the colors, the Home meeting card and notice wording (code_version 5bc9b64, migration 0120)$n$, '5bc9b64'),
    ('2026-11-13T13:59:06-08:00', $n$the Meetings menu, quick view, 10-minute join and grey bands (code_version a801cb7, api 120, migrations 0121 and 0122)$n$, 'a801cb7'),
    ('2026-11-13T14:40:03-08:00', $n$the bookmark button, the room note and freelancer storage (code_version f2b953b, migration 0123), and where the website lists bookmarks$n$, 'f2b953b'),
    ('2026-11-13T14:52:42-08:00', $n$"Your bookmarks" (code_version 3c3bf6d)$n$, '3c3bf6d'),
    ('2026-11-13T15:40:17-08:00', $n$the draft warning and the room alert (code_version afba23b, api 121)$n$, 'afba23b'),
    ('2026-11-13T16:57:19-08:00', $n$step 29 (code_version 89abf70) and save the password.link plan for 2027$n$, '89abf70'),
    ('2026-11-13T17:13:50-08:00', $n$the availability date on Talent cards (code_version a2f87ce, migration 0124)$n$, 'a2f87ce'),
    ('2026-11-17T06:37:26-08:00', $n$the Bookmarks tab, the filter icon and the DELA bar (code_version 0866953, api 122)$n$, '0866953'),
    ('2026-11-17T06:51:49-08:00', $n$the "Not available right now" card on the Bookmarks tab (code_version 8f0470a, api 123, migration 0125)$n$, '8f0470a'),
    ('2026-11-17T08:04:43-08:00', $n$step 31, notifications (code_version f07d1b0, api 125, migration 0127)$n$, 'f07d1b0'),
    ('2026-11-17T08:07:05-08:00', $n$the fixes from ChatGPT check 4 (code_version 956d503)$n$, '956d503'),
    ('2026-11-17T08:46:07-08:00', $n$the fixes from ChatGPT checks 4 and 5 (code_version 4218799)$n$, '4218799'),
    ('2026-11-17T08:59:54-08:00', $n$the Help card (code_version 2b1ba31) and the health report reading$n$, '2b1ba31'),
    ('2026-11-17T09:53:35-08:00', $n$step 32 (code_version 0271115, api 126, migration 0128); ChatGPT check 4 rewritten for the new screens$n$, '0271115'),
    ('2026-11-17T10:11:04-08:00', $n$the grey section backgrounds (code_version bb56465)$n$, 'bb56465'),
    ('2026-11-17T14:55:07-08:00', $n$step 33 (code_version bbe9e47, api 127, migration 0129); ChatGPT check 6 for the new Home$n$, 'bbe9e47'),
    ('2026-11-17T15:19:26-08:00', $n$the rings on Home (code_version 444f462)$n$, '444f462'),
    ('2026-11-17T15:49:31-08:00', $n$step 34 (code_version 1e6de60, api 128, migration 0130); brief and ChatGPT check 6 for the role widgets$n$, '1e6de60'),
    ('2026-11-17T16:11:11-08:00', $n$step 35 (code_version cc453f0, api 129, migration 0131); ChatGPT check 7 for the agency Home$n$, 'cc453f0'),
    ('2026-11-17T17:00:26-08:00', $n$the manager role removal (code_version 17919e7, migration 0132)$n$, '17919e7'),
    ('2026-11-17T19:44:41-08:00', $n$step 36 (code_version ce53e6a, api 130, migration 0133) and ChatGPT check 9 for it$n$, 'ce53e6a'),
    ('2026-11-17T21:54:44-08:00', $n$steps 37 and 38 (code_version 6dee56e, migration 0134) and ChatGPT check 10 for both$n$, '6dee56e'),
    ('2026-11-18T07:49:05-08:00', $n$step 39 (code_version 755462f) and add the help tip to ChatGPT check 10$n$, '755462f'),
    ('2026-11-18T08:46:11-08:00', $n$step 40 (code_version 850ceb8) and bring ChatGPT check 10 up to date$n$, '850ceb8'),
    ('2026-11-18T09:24:49-08:00', $n$step 41 (code_version daac2c1) and add the status filter to ChatGPT check 10$n$, 'daac2c1'),
    ('2026-11-18T16:34:27-08:00', $n$step 42 (code_version 9f1546c)$n$, '9f1546c'),
    ('2026-11-18T21:29:44-08:00', $n$steps 43 and 44 (code_version 85e24eb, api 132, migration 0135); ChatGPT check 11$n$, '85e24eb'),
    ('2026-11-18T21:55:00-08:00', $n$the handoff fixes (code_version ea4cecf)$n$, 'ea4cecf'),
    ('2026-11-18T22:07:41-08:00', $n$the Library wording batch (code_version fc0ed16, api 133)$n$, 'fc0ed16'),
    ('2026-11-19T08:24:29-08:00', $n$steps 45a and 45 (code_version 490b470, api 135, migration 0136)$n$, '490b470'),
    ('2026-11-19T08:44:46-08:00', $n$the admin gate buttons (code_version 60485e0) and the security scan review$n$, '60485e0'),
    ('2026-11-19T09:33:43-08:00', $n$steps 46 to 48 (code_version 6383c01, api 136, migration 0137); ChatGPT check 13$n$, '6383c01'),
    ('2026-11-19T12:36:35-08:00', $n$the stacked Home columns (code_version bc58836)$n$, 'bc58836'),
    ('2026-11-19T13:44:19-08:00', $n$step 49 (code_version cdb5fec): the live profile and editing in place$n$, 'cdb5fec'),
    ('2026-11-19T14:09:55-08:00', $n$step 49, second part (code_version 4648ebc); ChatGPT check 14 covers skills and services$n$, '4648ebc'),
    ('2026-11-19T14:57:34-08:00', $n$step 50 (code_version 59a4001, api 138, migration 0138); ChatGPT check 14 covers the formatting bar$n$, '59a4001'),
    ('2026-11-19T16:29:52-08:00', $n$steps 51 to 53 (code_version 2f2df8f); ChatGPT check 14 rewritten for the rebuilt profile pages$n$, '2f2df8f'),
    ('2026-11-19T17:07:41-08:00', $n$the public profile colors (code_version d6cd48c); ChatGPT check 14 describes the new look$n$, 'd6cd48c'),
    ('2026-11-19T18:31:36-08:00', $n$the warm Profile page and the reviews rework (code_version bd06a01); ChatGPT check 14 updated$n$, 'bd06a01'),
    ('2026-11-19T19:17:36-08:00', $n$availability at the top and the folding steps list (code_version b01e574); the five builds approved before the pilot$n$, 'b01e574'),
    ('2026-11-19T20:38:34-08:00', $n$the handoff kit, steps 55 to 59 (code_version db9bffd, api 139, migrations 0139 to 0141)$n$, 'db9bffd'),
    ('2026-11-19T21:07:41-08:00', $n$step 60, the DELA workflow (code_version 5a04a53, api 140, migration 0142); check 15 covers it$n$, '5a04a53'),
    ('2026-11-19T21:24:06-08:00', $n$the playbook wording on the workflow path (code_version 5a7e165)$n$, '5a7e165'),
    ('2026-11-20T10:46:22-08:00', $n$steps 61 to 64 (code_version 268968a, api 141, migrations through 0145); check 17 covers them$n$, '268968a'),
    ('2026-11-20T11:41:38-08:00', $n$steps 65 to 67 (code_version 4201abe, api 142, migrations through 0148); check 18 covers them$n$, '4201abe'),
    ('2026-11-20T12:14:25-08:00', $n$step 68 (code_version 6d3c502, api 143, migration 0149); check 19 covers it$n$, '6d3c502'),
    ('2026-11-20T12:36:34-08:00', $n$step 69 (code_version 310e946, api 144, migration 0150); check 20 covers it; the admin switch list names community$n$, '310e946'),
    ('2026-11-20T12:55:15-08:00', $n$step 70 (code_version 989e75a, api 145, migration 0151); check 21 covers it$n$, '989e75a'),
    ('2026-11-20T14:04:31-08:00', $n$step 71 (code_version d9b4754, api 147, migration 0152); check 22 covers it$n$, 'd9b4754'),
    ('2026-11-20T14:27:49-08:00', $n$step 72 (code_version 100fb3d, api 148); check 23 covers it$n$, '100fb3d'),
    ('2026-11-20T14:48:51-08:00', $n$step 73 (code_version d216f17, api 149, migration 0153)$n$, 'd216f17'),
    ('2026-11-20T18:22:51-08:00', $n$step 74 (code_version 20e278f, api 150, migration 0154); check 25; the plan and state of step 75$n$, '20e278f'),
    ('2026-11-20T20:35:17-08:00', $n$step 75a to 75c (code_version 203b1ff, migration 0155, dela_workspace_v2 on the access list); checks 26 to 28$n$, '203b1ff'),
    ('2026-11-23T07:58:20-08:00', $n$step 75d (code_version 9b3b390); check 29; check 26 updated$n$, '9b3b390'),
    ('2026-11-23T09:26:14-08:00', $n$the step 75 routing (code_version 0e69622)$n$, '0e69622'),
    ('2026-11-23T10:09:04-08:00', $n$the review fixes (code_version 5c1b91f); check 27 updated$n$, '5c1b91f'),
    ('2026-11-23T11:45:08-08:00', $n$the chat page changes (code_version 4e1fd33); checks 15 and 26 updated$n$, '4e1fd33'),
    ('2026-11-23T13:44:59-08:00', $n$the Scribe connection (code_version 169af60, api 151, migration 0156); check file 30$n$, '169af60'),
    ('2026-11-23T15:08:46-08:00', $n$the Ask DELA first screen (code_version fed5ac2); keep the stand-in that lets browser tests run without PHP$n$, 'fed5ac2'),
    ('2026-11-23T15:53:20-08:00', $n$the Ask DELA conversation screen (code_version ef09de8, api 152, migration 0157)$n$, 'ef09de8'),
    ('2026-11-23T16:31:10-08:00', $n$the message box buttons and screenshots (code_version 836599e, api 153, migration 0158)$n$, '836599e'),
    ('2026-11-23T17:40:21-08:00', $n$the in-place document editor and the shorter menu (code_version ad70ce6, api 154, migration 0159); check file 31$n$, 'ad70ce6'),
    ('2026-11-24T09:04:52-08:00', $n$formatting (80b) and the master pages (83): code_version f787d66, api 155, migration 0160; check files 32 and 33$n$, 'f787d66'),
    ('2026-11-24T10:02:30-08:00', $n$step 82 (the Team connector, the pipeline, prepared playbooks, claim listings): code_version 1c812ec, api 156, migrations 0161 to 0163; check file 34$n$, '1c812ec'),
    ('2026-11-24T13:43:38-08:00', $n$step 84 (Events in Community): code_version faf1940, api 157, migration 0164; check file 35, check file 33 updated$n$, 'faf1940'),
    ('2026-11-24T14:38:11-08:00', $n$step 85 (Blog pictures, the event link): code_version da7c3e9, api 158, migration 0165; check file 35 matches the test event$n$, 'da7c3e9'),
    ('2026-11-24T16:45:53-08:00', $n$step 86 (Library card title, Pipeline stage notes, event note): code_version a5ed2a0; checks 31 to 35 corrected$n$, 'a5ed2a0'),
    ('2026-11-24T17:27:54-08:00', $n$step 87 (a linked word is kept; the formatting bar clears the heading): code_version f5791d9$n$, 'f5791d9'),
    ('2026-11-24T18:02:28-08:00', $n$step 80c: code_version 552e07f, api 159; check file 36$n$, '552e07f'),
    ('2026-11-24T19:04:09-08:00', $n$step 88 (the editor's full set of tools): code_version 5451d28, api 161, migrations 0166 and 0167; check file 37$n$, '5451d28'),
    ('2026-11-25T08:44:03-08:00', $n$step 89 (the first click on Play, the notice, the Saved wording): code_version e522c3d$n$, 'e522c3d'),
    ('2026-11-25T09:47:28-08:00', $n$step 90a (read the old site, map, preview): code_version d37b51b, api 162, migration 0168; check file 38$n$, 'd37b51b'),
    ('2026-11-25T10:13:54-08:00', $n$step 90b (the move, examples for attorneys): code_version a091d85, api 163, migration 0169; check file 38 updated$n$, 'a091d85'),
    ('2026-11-25T11:17:56-08:00', $n$step 93 (audit fixes): code_version 0bafec4, api 164, migration 0170; check file 39$n$, '0bafec4'),
    ('2026-11-27T17:56:09-08:00', $n$steps 93b and 93c: code_version dc490e1, api 165; check 39 passed$n$, 'dc490e1'),
    ('2026-11-27T18:40:18-08:00', $n$step 94 (code store): code_version 1df945d, api 167, migration 0171$n$, '1df945d')
    ) v(at, note, sha);
  end if;
end $$;

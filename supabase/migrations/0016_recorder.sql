-- Process Recorder (beta), attorney side. Brief docs/briefs/step-2-recorder-beta.md, built with the suggested answers
-- (Stacey 2026-11-03). No separate video server: the browser records the screen and microphone, uploads in pieces,
-- and picks screenshots when the screen changes; the DELA worker turns speech into text and drafts the steps.
-- Additive only. Plan numbers are settings marked Open until Stacey decides.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('recorder.max_minutes', '{"att_free":20,"att_plus":30,"att_pro":45,"att_business":60}', 'Longest recording per plan', 'Process Recorder', 'minutes', 'O', 'Recorder brief question 5 (suggested)', ''),
  ('recorder.video_days', '{"att_free":14,"att_plus":30,"att_pro":90,"att_business":180}', 'Days a recording''s video is kept per plan', 'Process Recorder', 'days', 'O', 'Recorder brief question 5 (suggested)', 'The playbook built from it is kept while the account is active.'),
  ('recorder.credits', '{"att_free":5,"att_plus":5,"att_pro":5,"att_business":5}', 'AI credits one recording uses per plan', 'Process Recorder', 'credits', 'O', 'Recorder brief question 5 (suggested)', 'Only on Lawfecta''s AI. Taken when analysis starts, given back if it fails.'),
  ('recorder.warn_days', '3', 'Days of warning before a video is deleted', 'Process Recorder', 'days', 'O', 'Recorder build plan', ''),
  ('recorder.chunk_seconds', '10', 'Seconds of video in each uploaded piece', 'Process Recorder', 'seconds', 'R', 'Recorder build plan', ''),
  ('recorder.audio_part_minutes', '10', 'Minutes of speech in each part sent to speech to text', 'Process Recorder', 'minutes', 'R', 'Recorder build plan', ''),
  ('recorder.frame_seconds', '2', 'How often the browser looks for a screen change', 'Process Recorder', 'seconds', 'R', 'Claude', ''),
  ('recorder.max_frames', '200', 'Most screenshots kept from one recording', 'Process Recorder', 'screenshots', 'R', 'Recorder build plan', ''),
  ('recorder.ai_frames', '40', 'Most screenshots the AI looks at when drafting steps', 'Process Recorder', 'screenshots', 'R', 'Claude', 'More screenshots cost more; the rest stay available on the review screen.'),
  ('recorder.video_kbps', '1000', 'Video quality while recording', 'Process Recorder', 'kbps', 'R', 'Claude', 'About 7 MB a minute; screen text stays readable at 5 frames a second.'),
  ('recorder.consent_text', '"I understand this records my entire screen, including any client information on it. I will pause or close anything I don''t want recorded."', 'Consent the attorney ticks before the first recording', 'Process Recorder', '', 'O', 'Recorder build plan', 'Recorder brief question 1: beta users record practice runs or non-client work.')
on conflict (key) do nothing;

insert into feature_switches (key, label, gate) values ('recorder', 'Process Recorder (attorneys)', 'Recorder brief question 1 (client information) answered; Step 2 tested')
on conflict (key) do nothing;

-- Screenshots taken by the recorder are firm files too, but they live with their recording, not on the Files tab
alter table files add column if not exists purpose text not null default 'member' check (purpose in ('member', 'recording'));
alter table files add column if not exists recording_id uuid;

create table consents (
  id bigserial primary key,
  person_id uuid not null references people(id),
  kind text not null,
  wording text not null,
  at timestamptz not null default now(),
  ip text not null default ''
);
create trigger consents_append_only before update or delete on consents for each row execute function dela_no_change();

create table recordings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  person_id uuid not null references people(id),
  title text not null check (length(title) between 1 and 200),
  source text not null default 'screen' check (source in ('screen', 'upload')),
  status text not null default 'recording' check (status in ('recording', 'uploading', 'analyzing', 'ready', 'failed', 'discarded')),
  browser text not null default '',
  mime text not null default '',
  max_minutes int not null,
  duration_seconds int,
  video_bytes bigint not null default 0,
  finished_at timestamptz,
  video_delete_after date,
  video_deleted_at timestamptz,
  warned_for date,
  reservation_id uuid,
  import_id uuid references playbook_imports(id),
  error text not null default '',
  request_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, request_id)
);
create index recordings_org on recordings (org_id, created_at desc);

-- Video pieces (10 seconds each) and speech parts (10 minutes each)
create table recording_parts (
  recording_id uuid not null references recordings(id),
  kind text not null check (kind in ('video', 'audio')),
  seq int not null check (seq >= 0),
  start_ms int not null default 0,
  storage_path text not null unique,
  bytes bigint not null default 0,
  uploaded_at timestamptz,
  transcribed_at timestamptz,
  deleted_at timestamptz,
  primary key (recording_id, kind, seq)
);

create table recording_frames (
  recording_id uuid not null references recordings(id),
  file_id uuid not null references files(id),
  at_ms int not null,
  reason text not null default 'change',
  primary key (recording_id, file_id)
);

-- What was said, with times. Lines marked private never go to the AI.
create table recording_transcript (
  recording_id uuid not null references recordings(id),
  seq int not null,
  start_ms int not null,
  end_ms int not null,
  body text not null,
  private boolean not null default false,
  primary key (recording_id, seq)
);

do $$
declare t text;
begin
  foreach t in array array['consents', 'recordings', 'recording_parts', 'recording_frames', 'recording_transcript'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end $$;

-- ---------- Storage now counts recordings, and the Files tab shows only member files ----------

create or replace function dela_storage_used_bytes(p_org uuid) returns bigint language sql stable as $$
  select coalesce((select sum(size_bytes) from files where org_id = p_org and status in ('uploading', 'checking', 'ready', 'held', 'trash')), 0)::bigint
       + coalesce((select sum(p.bytes) from recording_parts p join recordings r on r.id = p.recording_id where r.org_id = p_org and p.deleted_at is null), 0)::bigint
$$;

-- p: as before, plus purpose and recording_id for recorder screenshots
create or replace function dela_file_tag(p_file uuid, p_recording uuid, p_at_ms int, p_reason text) returns void language plpgsql as $$
begin
  update files set purpose = 'recording', recording_id = p_recording, folder_id = null where id = p_file;
  insert into recording_frames (recording_id, file_id, at_ms, reason) values (p_recording, p_file, greatest(coalesce(p_at_ms, 0), 0), left(coalesce(p_reason, 'change'), 20))
  on conflict do nothing;
end $$;

create or replace function dela_plan_setting(p_key text, p_person uuid, p_default int) returns int language sql stable as $$
  select coalesce((dela_setting(p_key) ->> (select plan_code from side_profiles where person_id = p_person and side = 'attorney' and status <> 'closed'))::int, p_default)
$$;

-- The Files tab lists member files only; recorder screenshots stay with their recording
create or replace function dela_files_list(p_person uuid, p_side text) returns jsonb language plpgsql stable as $$
declare v_org uuid := dela_side_org(p_person, p_side);
begin
  if v_org is null or not dela_file_member(p_person, p_side, v_org) then return jsonb_build_object('ok', false, 'reason', 'no_side'); end if;
  return jsonb_build_object('ok', true,
    'uploads_on', dela_switch_on('file_uploads', p_person),
    'used_bytes', dela_storage_used_bytes(v_org), 'limit_bytes', dela_storage_limit_bytes(v_org),
    'max_mb_per_file', dela_int_setting('files.max_mb_per_file', 25), 'allowed', dela_setting('files.allowed_types'),
    'trash_days', dela_int_setting('files.trash_days', 30),
    'folders', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name) order by lower(name)), '[]') from file_folders where org_id = v_org and deleted_at is null),
    'files', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'group_id', f.group_id, 'name', f.name, 'ext', f.ext, 'size_bytes', f.size_bytes, 'status', f.status,
        'check_state', f.check_state, 'check_reasons', f.check_reasons, 'refuse_reason', f.refuse_reason, 'folder_id', f.folder_id, 'version', f.version,
        'versions', (select count(*) from files v where v.group_id = f.group_id and v.status in ('ready', 'held')), 'has_text', f.text_chars > 0,
        'uploaded_by', p.display_name, 'created_at', f.created_at, 'trashed_at', f.trashed_at) order by f.created_at desc), '[]')
      from files f join people p on p.id = f.uploaded_by
      where f.org_id = v_org and f.purpose = 'member' and ((f.is_current and f.status in ('ready', 'held')) or f.status in ('checking', 'trash')
        or (f.status = 'refused' and f.updated_at > now() - interval '7 days') or (f.status = 'uploading' and f.uploaded_by = p_person)))
  );
end $$;

create or replace function dela_file_for_check(p_file uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('id', id, 'status', status, 'ext', ext, 'storage_path', storage_path, 'size_bytes', size_bytes, 'person_id', uploaded_by, 'side', side, 'name', name,
    'purpose', purpose, 'org_id', org_id)
  from files where id = p_file
$$;

-- ---------- Recording lifecycle ----------

create or replace function dela_rec_settings(p_person uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('on', dela_switch_on('recorder', p_person), 'max_minutes', dela_plan_setting('recorder.max_minutes', p_person, 20),
    'video_days', dela_plan_setting('recorder.video_days', p_person, 14), 'credits', dela_plan_setting('recorder.credits', p_person, 5),
    'chunk_seconds', dela_int_setting('recorder.chunk_seconds', 10), 'audio_part_minutes', dela_int_setting('recorder.audio_part_minutes', 10),
    'frame_seconds', dela_int_setting('recorder.frame_seconds', 2), 'max_frames', dela_int_setting('recorder.max_frames', 200),
    'video_kbps', dela_int_setting('recorder.video_kbps', 1000), 'warn_days', dela_int_setting('recorder.warn_days', 3),
    'consent_text', dela_setting_text('recorder.consent_text', ''),
    'consented', exists (select 1 from consents where person_id = p_person and kind = 'screen_recording'))
$$;

-- p: person_id, request_id, title, source, browser, mime, consent (bool), ip
create or replace function dela_rec_start(p jsonb) returns jsonb language plpgsql as $$
declare v_person uuid := (p->>'person_id')::uuid; v_org uuid; r recordings; v_req text := left(coalesce(p->>'request_id', ''), 80);
begin
  if not dela_switch_on('recorder', v_person) then return jsonb_build_object('ok', false, 'reason', 'recorder_off'); end if;
  if dela_paused('ai') then return jsonb_build_object('ok', false, 'reason', 'paused'); end if;
  if dela_has_hold(v_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  v_org := dela_side_org(v_person, 'attorney');
  if v_org is null or dela_pb_rank(dela_pb_role(v_person, v_org)) < 3 then return jsonb_build_object('ok', false, 'reason', 'attorneys_only'); end if;
  if v_req = '' or coalesce(btrim(p->>'title'), '') = '' then return jsonb_build_object('ok', false, 'reason', 'title_needed'); end if;
  select * into r from recordings where org_id = v_org and request_id = v_req;
  if r.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', r.id, 'settings', dela_rec_settings(v_person)); end if;
  if not exists (select 1 from consents where person_id = v_person and kind = 'screen_recording') then
    if coalesce((p->>'consent')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'consent_needed'); end if;
    insert into consents (person_id, kind, wording, ip) values (v_person, 'screen_recording', dela_setting_text('recorder.consent_text', ''), left(coalesce(p->>'ip', ''), 80));
  end if;
  -- One recording at a time per person
  if exists (select 1 from recordings where person_id = v_person and status = 'recording' and created_at > now() - interval '3 hours') and coalesce(p->>'source', 'screen') = 'screen' then
    update recordings set status = 'uploading', updated_at = now() where person_id = v_person and status = 'recording';
  end if;
  insert into recordings (org_id, person_id, title, source, browser, mime, max_minutes, request_id)
  values (v_org, v_person, left(btrim(p->>'title'), 200), case when p->>'source' = 'upload' then 'upload' else 'screen' end, left(coalesce(p->>'browser', ''), 80),
          left(coalesce(p->>'mime', ''), 80), dela_plan_setting('recorder.max_minutes', v_person, 20), v_req)
  returning * into r;
  perform dela_audit('member', v_person, 'recording_started', 'recording', r.id::text, jsonb_build_object('source', r.source, 'browser', r.browser));
  return jsonb_build_object('ok', true, 'duplicate', false, 'id', r.id, 'settings', dela_rec_settings(v_person));
end $$;

-- Registers one piece before its upload; checks the plan's length and the storage allowance
create or replace function dela_rec_part(p_person uuid, p_rec uuid, p_kind text, p_seq int, p_start_ms int, p_bytes bigint) returns jsonb language plpgsql as $$
declare r recordings; v_path text; v_limit bigint; v_used bigint; x recording_parts;
begin
  select * into r from recordings where id = p_rec and person_id = p_person;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if r.status not in ('recording', 'uploading') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if p_kind not in ('video', 'audio') or p_seq < 0 or p_seq > 100000 then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if p_start_ms > (r.max_minutes * 60 + 60) * 1000 then return jsonb_build_object('ok', false, 'reason', 'too_long'); end if;
  select * into x from recording_parts where recording_id = p_rec and kind = p_kind and seq = p_seq;
  if x.recording_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'storage_path', x.storage_path, 'uploaded', x.uploaded_at is not null); end if;
  perform pg_advisory_xact_lock(hashtextextended('storage:' || r.org_id::text, 0));
  v_limit := dela_storage_limit_bytes(r.org_id);
  v_used := dela_storage_used_bytes(r.org_id);
  if v_limit is not null and v_used + greatest(coalesce(p_bytes, 0), 0) > v_limit then return jsonb_build_object('ok', false, 'reason', 'storage_full', 'used_bytes', v_used, 'limit_bytes', v_limit); end if;
  v_path := 'recordings/' || r.org_id || '/' || r.id || '/' || p_kind || '-' || lpad(p_seq::text, 5, '0') || '.webm';
  insert into recording_parts (recording_id, kind, seq, start_ms, storage_path, bytes) values (p_rec, p_kind, p_seq, greatest(coalesce(p_start_ms, 0), 0), v_path, greatest(coalesce(p_bytes, 0), 0));
  return jsonb_build_object('ok', true, 'duplicate', false, 'storage_path', v_path, 'uploaded', false);
end $$;

create or replace function dela_rec_part_done(p_person uuid, p_rec uuid, p_kind text, p_seq int, p_bytes bigint) returns jsonb language plpgsql as $$
begin
  if not exists (select 1 from recordings where id = p_rec and person_id = p_person) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_bytes is null or p_bytes <= 0 then return jsonb_build_object('ok', false, 'reason', 'not_uploaded'); end if;
  update recording_parts set uploaded_at = coalesce(uploaded_at, now()), bytes = p_bytes where recording_id = p_rec and kind = p_kind and seq = p_seq;
  update recordings set video_bytes = (select coalesce(sum(bytes), 0) from recording_parts where recording_id = p_rec and kind = 'video'), updated_at = now() where id = p_rec;
  return jsonb_build_object('ok', true);
end $$;

-- Stop and save. Analysis starts only when every piece has arrived; otherwise the browser is told which are missing.
-- AI credits are reserved here (Lawfecta's AI only) and given back if analysis fails.
create or replace function dela_rec_finish(p_person uuid, p_rec uuid, p_duration int, p_video_parts int, p_audio_parts int) returns jsonb language plpgsql as $$
declare r recordings; v_missing jsonb; v_route jsonb; v_res jsonb; v_credits int; v_seq int;
begin
  select * into r from recordings where id = p_rec and person_id = p_person for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if r.status in ('analyzing', 'ready') then return jsonb_build_object('ok', true, 'duplicate', true, 'status', r.status); end if;
  if r.status = 'discarded' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('kind', k, 'seq', s)), '[]') into v_missing from (
    select 'video' k, g s from generate_series(0, greatest(coalesce(p_video_parts, 0) - 1, -1)) g
      where not exists (select 1 from recording_parts where recording_id = p_rec and kind = 'video' and seq = g and uploaded_at is not null)
    union all
    select 'audio', g from generate_series(0, greatest(coalesce(p_audio_parts, 0) - 1, -1)) g
      where not exists (select 1 from recording_parts where recording_id = p_rec and kind = 'audio' and seq = g and uploaded_at is not null)) m;
  update recordings set duration_seconds = least(greatest(coalesce(p_duration, 0), 0), r.max_minutes * 60 + 60), updated_at = now() where id = r.id;
  if jsonb_array_length(v_missing) > 0 then
    update recordings set status = 'uploading' where id = r.id;
    return jsonb_build_object('ok', false, 'reason', 'parts_missing', 'missing', v_missing);
  end if;
  if coalesce(p_audio_parts, 0) = 0 then return jsonb_build_object('ok', false, 'reason', 'no_sound'); end if;
  v_route := dela_ai_route(p_person, 'attorney', 'chat', false);
  if not (v_route->>'ok')::boolean then return jsonb_build_object('ok', false, 'reason', v_route->>'reason'); end if;
  if v_route->>'source' = 'lawfecta' then
    v_credits := dela_plan_setting('recorder.credits', p_person, 5);
    v_res := dela_quota_reserve(p_person, 'attorney', 'ai.runs', v_credits, 'rec:' || r.id || ':' || coalesce(r.error, ''), r.id::text);
    if not (v_res->>'ok')::boolean then return jsonb_build_object('ok', false, 'reason', case when v_res->>'reason' = 'limit_reached' then 'no_credits_left' else v_res->>'reason' end); end if;
  end if;
  update recordings set status = 'analyzing', finished_at = coalesce(finished_at, now()), error = '', reservation_id = (v_res->>'reservation_id')::uuid,
    video_delete_after = coalesce(video_delete_after, (now() at time zone dela_tz())::date + dela_plan_setting('recorder.video_days', p_person, 14)), updated_at = now()
  where id = r.id;
  for v_seq in select seq from recording_parts where recording_id = r.id and kind = 'audio' and transcribed_at is null order by seq loop
    perform dela_job_enqueue('recording_transcribe', jsonb_build_object('recording_id', r.id, 'seq', v_seq), now(), 'rectx:' || r.id || ':' || v_seq || ':' || gen_random_uuid(), p_person);
  end loop;
  perform dela_job_enqueue('recording_stage1', jsonb_build_object('recording_id', r.id), now() + interval '20 seconds', 'recst1:' || r.id || ':' || gen_random_uuid(), p_person);
  perform dela_audit('member', p_person, 'recording_finished', 'recording', r.id::text, jsonb_build_object('seconds', p_duration, 'video_parts', p_video_parts, 'audio_parts', p_audio_parts));
  return jsonb_build_object('ok', true, 'status', 'analyzing');
end $$;

-- What the worker needs
create or replace function dela_rec_load(p_rec uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('id', r.id, 'org_id', r.org_id, 'person_id', r.person_id, 'title', r.title, 'status', r.status, 'reservation_id', r.reservation_id,
    'duration_seconds', r.duration_seconds,
    'audio', (select coalesce(jsonb_agg(jsonb_build_object('seq', seq, 'path', storage_path, 'start_ms', start_ms, 'bytes', bytes, 'done', transcribed_at is not null) order by seq), '[]') from recording_parts where recording_id = r.id and kind = 'audio' and deleted_at is null),
    'frames', (select coalesce(jsonb_agg(jsonb_build_object('file_id', f.file_id, 'at_ms', f.at_ms, 'path', fi.storage_path, 'size', fi.size_bytes, 'status', fi.status) order by f.at_ms), '[]') from recording_frames f join files fi on fi.id = f.file_id where f.recording_id = r.id and fi.status in ('ready', 'held')),
    'transcript', (select coalesce(jsonb_agg(jsonb_build_object('start_ms', start_ms, 'end_ms', end_ms, 'text', body, 'private', private) order by start_ms, seq), '[]') from recording_transcript where recording_id = r.id))
  from recordings r where r.id = p_rec
$$;

-- p_lines: [{start_ms, end_ms, text}] for one speech part
create or replace function dela_rec_transcribed(p_rec uuid, p_seq int, p_lines jsonb) returns void language plpgsql as $$
declare base int := coalesce((select max(seq) + 1 from recording_transcript where recording_id = p_rec), 0);
begin
  if exists (select 1 from recording_parts where recording_id = p_rec and kind = 'audio' and seq = p_seq and transcribed_at is not null) then return; end if;
  insert into recording_transcript (recording_id, seq, start_ms, end_ms, body)
  select p_rec, base + (o - 1)::int, greatest((l->>'start_ms')::int, 0), greatest((l->>'end_ms')::int, 0), left(l->>'text', 4000)
  from jsonb_array_elements(coalesce(p_lines, '[]')) with ordinality as e(l, o) where coalesce(btrim(l->>'text'), '') <> '';
  update recording_parts set transcribed_at = now() where recording_id = p_rec and kind = 'audio' and seq = p_seq;
end $$;

-- Stage 1 finished: the draft steps go to the review screen (a recorder import), screenshots the AI flagged are held
-- p: steps [{text, file_id, extra:[file ids], at_ms}], flagged: [file ids]
create or replace function dela_rec_ready(p_rec uuid, p jsonb) returns jsonb language plpgsql as $$
declare r recordings; v_imp uuid;
begin
  select * into r from recordings where id = p_rec for update;
  if r.id is null or r.status <> 'analyzing' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update files set status = 'held', check_state = 'flagged', check_reasons = '["may_show_client_info"]', updated_at = now()
  where id in (select (x #>> '{}')::uuid from jsonb_array_elements(coalesce(p->'flagged', '[]')) x) and recording_id = p_rec and status = 'ready';
  insert into playbook_imports (org_id, person_id, source, title, steps, request_id)
  values (r.org_id, r.person_id, 'recorder', r.title, coalesce(p->'steps', '[]'), 'recording:' || r.id)
  on conflict (org_id, request_id) do update set steps = excluded.steps, status = 'review', updated_at = now() returning id into v_imp;
  update recordings set status = 'ready', import_id = v_imp, updated_at = now() where id = r.id;
  if r.reservation_id is not null then perform dela_quota_finish(r.reservation_id, true); end if;
  perform dela_notify(jsonb_build_object('person_id', r.person_id, 'side', 'attorney', 'kind', 'recording', 'email', true,
    'title', 'Your recording is ready to review', 'body', '"' || r.title || '" is ready. Check the steps and screenshots, then build your playbook.',
    'link', '/dela?tab=library', 'dedupe_key', 'recready:' || r.id));
  return jsonb_build_object('ok', true, 'import_id', v_imp);
end $$;

create or replace function dela_rec_failed(p_rec uuid, p_reason text) returns void language plpgsql as $$
declare r recordings;
begin
  select * into r from recordings where id = p_rec for update;
  if r.id is null or r.status <> 'analyzing' then return; end if;
  update recordings set status = 'failed', error = left(coalesce(p_reason, 'failed'), 60), updated_at = now() where id = r.id;
  if r.reservation_id is not null then perform dela_quota_finish(r.reservation_id, false); end if;
  perform dela_notify(jsonb_build_object('person_id', r.person_id, 'side', 'attorney', 'kind', 'recording', 'title', 'We could not analyze a recording',
    'body', '"' || r.title || '" could not be analyzed (' || replace(coalesce(p_reason, 'failed'), '_', ' ') || '). Nothing ran on Lawfecta''s AI instead. Open Library, Recordings, and click Try again.',
    'link', '/dela?tab=library', 'dedupe_key', 'recfail:' || r.id || ':' || extract(epoch from now())::bigint));
end $$;

-- Try again after a failure (for example the member fixed their AI key)
create or replace function dela_rec_retry(p_person uuid, p_rec uuid) returns jsonb language plpgsql as $$
declare r recordings; n int; v int;
begin
  select * into r from recordings where id = p_rec and person_id = p_person for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if r.status <> 'failed' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  select count(*) into n from recording_parts where recording_id = r.id and kind = 'audio';
  select count(*) into v from recording_parts where recording_id = r.id and kind = 'video';
  update recordings set status = 'uploading', error = 'retry' || gen_random_uuid() where id = r.id;
  return dela_rec_finish(p_person, p_rec, r.duration_seconds, v, n);
end $$;

create or replace function dela_rec_list(p_person uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('settings', dela_rec_settings(p_person),
    'used_bytes', dela_storage_used_bytes(dela_side_org(p_person, 'attorney')), 'limit_bytes', dela_storage_limit_bytes(dela_side_org(p_person, 'attorney')),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'status', r.status, 'source', r.source, 'created_at', r.created_at,
      'duration_seconds', r.duration_seconds, 'video_bytes', r.video_bytes, 'video_delete_after', r.video_delete_after, 'video_deleted_at', r.video_deleted_at,
      'import_id', r.import_id, 'error', r.error, 'playbook_id', (select playbook_id from playbook_imports i where i.id = r.import_id)) order by r.created_at desc)
      from recordings r where r.person_id = p_person and r.status <> 'discarded'), '[]'))
$$;

create or replace function dela_rec_video(p_person uuid, p_rec uuid) returns jsonb language sql stable as $$
  select case when r.id is null or r.video_deleted_at is not null then null else jsonb_build_object('title', r.title, 'mime', r.mime, 'created_at', r.created_at,
    'parts', (select coalesce(jsonb_agg(storage_path order by seq), '[]') from recording_parts where recording_id = r.id and kind = 'video' and uploaded_at is not null and deleted_at is null)) end
  from recordings r where r.id = p_rec and r.person_id = p_person
$$;

-- Delete the video now (the member's choice), or because its days are up. Screenshots used in a playbook or on the review screen stay.
-- Returns the storage paths for the api to remove.
create or replace function dela_rec_delete_video(p_rec uuid, p_actor uuid, p_why text) returns jsonb language plpgsql as $$
declare r recordings; v_paths jsonb; v_keep uuid[];
begin
  select * into r from recordings where id = p_rec for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_actor is not null and r.person_id <> p_actor then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select coalesce(array_agg(nullif(s->>'file_id', '')::uuid), '{}') into v_keep from playbook_imports i, jsonb_array_elements(i.steps) s where i.id = r.import_id;
  v_keep := v_keep || coalesce((select array_agg(distinct (st->>'screenshot')::uuid) from playbook_imports i join playbook_versions v on v.playbook_id = i.playbook_id,
    jsonb_array_elements(v.body->'steps') st where i.id = r.import_id and coalesce(st->>'screenshot', '') <> ''), '{}');
  select coalesce(jsonb_agg(storage_path), '[]') into v_paths from (
    select storage_path from recording_parts where recording_id = r.id and deleted_at is null
    union all select fi.storage_path from recording_frames f join files fi on fi.id = f.file_id where f.recording_id = r.id and fi.status <> 'deleted' and not (fi.id = any(v_keep))) x;
  update recording_parts set deleted_at = now() where recording_id = r.id and deleted_at is null;
  update files set status = 'deleted', deleted_at = now(), updated_at = now() where recording_id = r.id and status <> 'deleted' and not (id = any(v_keep));
  update recordings set video_deleted_at = coalesce(video_deleted_at, now()), status = case when p_why = 'discard' then 'discarded' else status end, updated_at = now() where id = r.id;
  perform dela_audit(case when p_actor is null then 'worker' else 'member' end, coalesce(p_actor, r.person_id), 'recording_video_deleted', 'recording', r.id::text, jsonb_build_object('why', p_why));
  return jsonb_build_object('ok', true, 'paths', v_paths);
end $$;

-- Daily: warnings before a video is deleted, then the deletions. Returns recordings whose video is due.
create or replace function dela_rec_daily() returns jsonb language plpgsql as $$
declare r record; v_today date := (now() at time zone dela_tz())::date; n int := 0;
begin
  for r in select * from recordings where video_deleted_at is null and video_delete_after is not null
           and video_delete_after - dela_int_setting('recorder.warn_days', 3) <= v_today and video_delete_after > v_today and warned_for is distinct from video_delete_after loop
    perform dela_notify(jsonb_build_object('person_id', r.person_id, 'side', 'attorney', 'kind', 'recording', 'email', true,
      'title', 'A recording''s video will be deleted soon',
      'body', 'The video of "' || r.title || '" will be deleted on ' || to_char(r.video_delete_after, 'FMMonth FMDD') || '. Your playbook stays. To keep the video, download it from Library, Recordings before then.',
      'link', '/dela?tab=library', 'dedupe_key', 'recwarn:' || r.id || ':' || r.video_delete_after));
    update recordings set warned_for = video_delete_after where id = r.id;
    n := n + 1;
  end loop;
  return jsonb_build_object('warned', n, 'due', (select coalesce(jsonb_agg(id), '[]') from recordings where video_deleted_at is null and video_delete_after <= v_today));
end $$;

create or replace function dela_maybe_queue_daily() returns void language plpgsql as $$
declare local timestamp := now() at time zone dela_tz();
begin
  if extract(hour from local) >= 8 then
    perform dela_job_enqueue('daily_summary', '{}', now(), 'daily:' || local::date);
    perform dela_job_enqueue('playbooks_daily', '{}', now(), 'playbooks_daily:' || local::date);
    perform dela_job_enqueue('recordings_daily', '{}', now(), 'recordings_daily:' || local::date);
  end if;
  perform dela_job_enqueue('files_sweep', '{}', now(), 'files_sweep:' || local::date);
  perform dela_job_enqueue('ai_key_reminders', '{}', now(), 'ai_key_reminders:' || local::date);
end $$;

-- Transcript edits and private lines from the review screen
create or replace function dela_rec_transcript_save(p_person uuid, p_rec uuid, p_lines jsonb) returns jsonb language plpgsql as $$
begin
  if not exists (select 1 from recordings where id = p_rec and person_id = p_person) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  update recording_transcript t set body = left(coalesce(l->>'text', t.body), 4000), private = coalesce((l->>'private')::boolean, t.private)
  from jsonb_array_elements(coalesce(p_lines, '[]')) l where t.recording_id = p_rec and t.seq = (l->>'seq')::int;
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_rec_for_import(p_person uuid, p_import uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('id', r.id, 'duration_seconds', r.duration_seconds,
    'transcript', (select coalesce(jsonb_agg(jsonb_build_object('seq', seq, 'start_ms', start_ms, 'text', body, 'private', private) order by start_ms, seq), '[]') from recording_transcript where recording_id = r.id),
    'frames', (select coalesce(jsonb_agg(jsonb_build_object('file_id', f.file_id, 'at_ms', f.at_ms, 'status', fi.status) order by f.at_ms), '[]') from recording_frames f join files fi on fi.id = f.file_id where f.recording_id = r.id and fi.status in ('ready', 'held')))
  from recordings r join playbook_imports i on i.id = r.import_id where i.id = p_import and dela_pb_rank(dela_pb_role(p_person, i.org_id)) >= 3
$$;

-- Admin: recorder counts
create or replace function dela_admin_recorder(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return jsonb_build_object(
    'by_month', (select coalesce(jsonb_agg(x order by x->>'month' desc), '[]') from (select jsonb_build_object('month', to_char(created_at, 'YYYY-MM'),
        'started', count(*), 'finished', count(*) filter (where status in ('analyzing', 'ready')), 'ready', count(*) filter (where status = 'ready'),
        'failed', count(*) filter (where status = 'failed'), 'abandoned', count(*) filter (where status in ('recording', 'uploading') and created_at < now() - interval '1 day'),
        'built', count(*) filter (where import_id is not null and exists (select 1 from playbook_imports i where i.id = import_id and i.status = 'built')),
        'avg_minutes', round(avg(duration_seconds) / 60.0), 'uploads', count(*) filter (where source = 'upload')) x
      from recordings group by to_char(created_at, 'YYYY-MM')) t),
    'by_browser', (select coalesce(jsonb_object_agg(b, n), '{}') from (select coalesce(nullif(browser, ''), 'unknown') b, count(*) n from recordings group by 1) t),
    'storage_bytes', (select coalesce(sum(bytes), 0) from recording_parts where deleted_at is null),
    'videos_deleted', (select count(*) from recordings where video_deleted_at is not null));
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'dela_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

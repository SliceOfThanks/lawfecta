-- Step 25 part 2 (Stacey's answers of 2026-11-13, docs/briefs/step-25-videosdk-meetings.md):
-- 1. Transcribe only. No video or audio file is kept. Both people tick a box before joining; either can stop it.
-- 2. The full transcript is deleted 90 days after the meeting ends. The summary and next steps stay with the meeting.
--    Both people can read it and either can delete it early. The Lawfecta Team may open one only after DELA's AI
--    flagged it or a member reported the conversation, and every opening is written to the meeting's events.
-- 3. DELA's AI reads each transcript once: a summary, next steps, and a flag for talk about paying or working
--    outside Lawfecta. A flag goes to the team's queue; nothing happens to a member by itself.
-- Additive: one new table and new functions.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('meeting.transcript_on', 'true', 'Meetings can be transcribed when both people agree', 'Booking and meetings', '', 'C', 'Stacey 2026-11-13', 'Text only: no video or audio file is kept.'),
  ('meeting.transcript_days', '90', 'Days a meeting transcript is kept after the meeting ends', 'Booking and meetings', 'days', 'C', 'Stacey 2026-11-13', 'The summary and next steps stay with the meeting.')
on conflict (key) do nothing;

create table if not exists meeting_transcripts (
  meeting_id uuid primary key references meetings(id),
  provider_ref text not null default '',
  status text not null default 'starting' check (status in ('starting', 'running', 'stopped', 'collected', 'empty', 'failed', 'deleted')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  stopped_by uuid references people(id),
  body text,
  collected_at timestamptz,
  delete_after timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references people(id),
  summary text not null default '',
  steps jsonb not null default '[]',
  ai_at timestamptz,
  flag_state text not null default 'none' check (flag_state in ('none', 'open', 'cleared', 'confirmed')),
  flag_kinds text[] not null default '{}',
  flag_note text not null default '',
  flag_decided_by uuid references people(id),
  flag_decided_at timestamptz,
  flag_decision_note text not null default ''
);
alter table meeting_transcripts enable row level security;
create index if not exists meeting_transcripts_flags on meeting_transcripts (flag_state) where flag_state = 'open';

-- Is this person one of the two people of the meeting (by the same rule that shows them the meeting)?
create or replace function dela_meeting_mine(p_person uuid, p_side text, p_meeting uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  return (dela_meetings(p_person, p_side, null, p_meeting))->'meetings'->0;
end $$;
revoke all on function dela_meeting_mine(uuid, text, uuid) from public, anon, authenticated;

-- May a transcript start now? Only on VideoSDK, only when both people agreed, only while the two are in a session,
-- and only once per meeting (a stopped transcript does not start again). The row is taken before the provider is
-- asked, so two requests at the same moment cannot both start one.
create or replace function dela_transcript_reserve(p_meeting uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare m meetings; v_last_start timestamptz; v_last_end timestamptz; v_n int;
begin
  if dela_setting_text('meeting.transcript_on', 'false') <> 'true' then return jsonb_build_object('ok', false, 'reason', 'transcript_off'); end if;
  select * into m from meetings where id = p_meeting for update;
  if m.id is null or m.provider <> 'videosdk' or m.room_ref = '' or m.status <> 'confirmed' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if m.consent_attorney_at is null or m.consent_freelancer_at is null then return jsonb_build_object('ok', false, 'reason', 'no_consent'); end if;
  select max(at) filter (where action in ('room_session_started', 'room_participant_joined')), max(at) filter (where action = 'room_session_ended') into v_last_start, v_last_end from meeting_events where meeting_id = m.id;
  if v_last_start is null or (v_last_end is not null and v_last_end > v_last_start) then return jsonb_build_object('ok', false, 'reason', 'no_session'); end if;
  insert into meeting_transcripts (meeting_id) values (m.id) on conflict (meeting_id) do update set status = 'starting', started_at = now() where meeting_transcripts.status = 'failed';
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('ok', false, 'reason', 'already'); end if;
  return jsonb_build_object('ok', true, 'room', m.room_ref);
end $$;
revoke all on function dela_transcript_reserve(uuid) from public, anon, authenticated;

create or replace function dela_transcript_started(p_meeting uuid, p_ref text, p_ok boolean) returns void language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  update meeting_transcripts set status = case when p_ok then 'running' else 'failed' end, provider_ref = coalesce(nullif(p_ref, ''), provider_ref) where meeting_id = p_meeting and status = 'starting';
  if found then insert into meeting_events (meeting_id, action, actor, detail) values (p_meeting, case when p_ok then 'transcript_started' else 'transcript_failed' end, null, '{}'); end if;
end $$;
revoke all on function dela_transcript_started(uuid, text, boolean) from public, anon, authenticated;

-- Stop for the rest of the call: either person, or DELA itself when one of them takes back their agreement or the session ends
create or replace function dela_transcript_stop(p_person uuid, p_side text, p_meeting uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare t meeting_transcripts; v_room text;
begin
  if p_person is not null and dela_meeting_mine(p_person, p_side, p_meeting) is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into t from meeting_transcripts where meeting_id = p_meeting for update;
  if t.meeting_id is null or t.status not in ('starting', 'running') then return jsonb_build_object('ok', true, 'was_running', false); end if;
  update meeting_transcripts set status = 'stopped', ended_at = now(), stopped_by = p_person where meeting_id = p_meeting;
  insert into meeting_events (meeting_id, action, actor, detail) values (p_meeting, 'transcript_stopped', p_person, jsonb_build_object('by', case when p_person is null then 'dela' else p_side end));
  select room_ref into v_room from meetings where id = p_meeting;
  return jsonb_build_object('ok', true, 'was_running', true, 'room', v_room);
end $$;
revoke all on function dela_transcript_stop(uuid, text, uuid) from public, anon, authenticated;

create or replace function dela_transcript_for_job(p_meeting uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('status', t.status, 'provider_ref', t.provider_ref, 'room', m.room_ref, 'has_body', t.body is not null, 'ai_done', t.ai_at is not null,
    'attorney_person', m.attorney_person, 'title', coalesce((select g.title from gigs g where g.id = m.gig_id), 'Introductory call'), 'body', t.body)
  from meeting_transcripts t join meetings m on m.id = t.meeting_id where t.meeting_id = p_meeting
$$;
revoke all on function dela_transcript_for_job(uuid) from public, anon, authenticated;

-- The text arrives from the provider after the call. It is kept until N days after the meeting ended.
create or replace function dela_transcript_store(p_meeting uuid, p_body text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_days int := dela_int_setting('meeting.transcript_days', 90); v_until timestamptz; v_body text := nullif(trim(coalesce(p_body, '')), '');
begin
  select greatest(m.end_at, now()) + make_interval(days => v_days) into v_until from meetings m where m.id = p_meeting;
  update meeting_transcripts set status = case when v_body is null then 'empty' else 'collected' end, body = left(v_body, 300000), collected_at = now(),
    ended_at = coalesce(ended_at, now()), delete_after = case when v_body is null then null else v_until end
  where meeting_id = p_meeting and status in ('starting', 'running', 'stopped');
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  insert into meeting_events (meeting_id, action, actor, detail) values (p_meeting, 'transcript_collected', null, jsonb_build_object('empty', v_body is null, 'delete_after', v_until));
  if v_body is not null then
    perform dela_job_enqueue('meeting_tick', jsonb_build_object('meeting_id', p_meeting, 'kind', 'transcript_expire'), v_until, 'meettrx:' || p_meeting::text, null);
  end if;
  return jsonb_build_object('ok', true, 'empty', v_body is null, 'delete_after', v_until);
end $$;
revoke all on function dela_transcript_store(uuid, text) from public, anon, authenticated;

-- What DELA's AI wrote after reading it once. A flag opens an item in the team's queue; nothing else happens.
create or replace function dela_transcript_ai_save(p_meeting uuid, p_summary text, p_steps jsonb, p_flag boolean, p_kinds text[], p_note text) returns void language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  update meeting_transcripts set summary = left(coalesce(p_summary, ''), 4000), steps = case when jsonb_typeof(p_steps) = 'array' then p_steps else '[]'::jsonb end, ai_at = now(),
    flag_state = case when p_flag and flag_state = 'none' then 'open' else flag_state end,
    flag_kinds = case when p_flag then coalesce(p_kinds, '{}') else flag_kinds end, flag_note = case when p_flag then left(coalesce(p_note, ''), 600) else flag_note end
  where meeting_id = p_meeting and ai_at is null;
  if found and p_flag then
    insert into meeting_events (meeting_id, action, actor, detail) values (p_meeting, 'transcript_flagged', null, jsonb_build_object('kinds', to_jsonb(coalesce(p_kinds, '{}'))));
    perform dela_alert('report', 'A meeting transcript was flagged', 'DELA''s AI found talk about paying or working outside Lawfecta in a meeting transcript. Review it in the admin area under Meetings and messages.', 'trflag:' || p_meeting::text);
  end if;
end $$;
revoke all on function dela_transcript_ai_save(uuid, text, jsonb, boolean, text[], text) from public, anon, authenticated;

-- What the two people see on their meeting cards (never the team's flag)
create or replace function dela_transcript_cards(p_meetings uuid[]) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_object_agg(t.meeting_id::text, jsonb_build_object('status', t.status, 'has_text', t.body is not null, 'summary', t.summary, 'steps', t.steps,
    'delete_after', t.delete_after, 'deleted_at', t.deleted_at)), '{}') from meeting_transcripts t where t.meeting_id = any(p_meetings)
$$;
revoke all on function dela_transcript_cards(uuid[]) from public, anon, authenticated;

-- The room's top bar: has each agreed, and is a transcript running
create or replace function dela_room_state(p_person uuid, p_side text, p_meeting uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v jsonb := dela_meeting_mine(p_person, p_side, p_meeting); t meeting_transcripts;
begin
  if v is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into t from meeting_transcripts where meeting_id = p_meeting;
  return jsonb_build_object('ok', true, 'my_consent', v->'my_consent', 'both_consent', v->'both_consent', 'transcript', coalesce(t.status, 'none'),
    'transcript_on', dela_setting_text('meeting.transcript_on', 'false') = 'true');
end $$;
revoke all on function dela_room_state(uuid, text, uuid) from public, anon, authenticated;

create or replace function dela_transcript_read(p_person uuid, p_side text, p_meeting uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare t meeting_transcripts;
begin
  if dela_meeting_mine(p_person, p_side, p_meeting) is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into t from meeting_transcripts where meeting_id = p_meeting;
  if t.meeting_id is null or t.body is null then return jsonb_build_object('ok', false, 'reason', 'no_transcript'); end if;
  return jsonb_build_object('ok', true, 'text', t.body, 'delete_after', t.delete_after, 'summary', t.summary, 'steps', t.steps);
end $$;
revoke all on function dela_transcript_read(uuid, text, uuid) from public, anon, authenticated;

-- Either person deletes the text early, for both. The summary and next steps stay. p_person null: the 90 days are over.
create or replace function dela_transcript_delete(p_person uuid, p_side text, p_meeting uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if p_person is not null and dela_meeting_mine(p_person, p_side, p_meeting) is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_person is null and not exists (select 1 from meeting_transcripts where meeting_id = p_meeting and delete_after <= now()) then return jsonb_build_object('ok', true, 'skipped', true); end if;
  update meeting_transcripts set body = null, status = 'deleted', deleted_at = now(), deleted_by = p_person where meeting_id = p_meeting and body is not null;
  if not found then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  insert into meeting_events (meeting_id, action, actor, detail) values (p_meeting, 'transcript_deleted', p_person, jsonb_build_object('by', case when p_person is null then 'kept_time_over' else p_side end));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_transcript_delete(uuid, text, uuid) from public, anon, authenticated;

-- ---------- The Lawfecta Team ----------
create or replace function dela_admin_transcript_flags(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  return jsonb_build_object('ok', true, 'flags', (select coalesce(jsonb_agg(jsonb_build_object('meeting_id', m.id, 'start_at', m.start_at, 'attorney', pa.display_name, 'freelancer', pf.display_name,
      'title', coalesce((select g.title from gigs g where g.id = m.gig_id), 'Introductory call'), 'kinds', to_jsonb(t.flag_kinds), 'note', t.flag_note, 'state', t.flag_state,
      'has_text', t.body is not null, 'decided_at', t.flag_decided_at, 'decision_note', t.flag_decision_note) order by (t.flag_state = 'open') desc, m.start_at desc), '[]')
    from meeting_transcripts t join meetings m on m.id = t.meeting_id join people pa on pa.id = m.attorney_person join people pf on pf.id = m.freelancer_person
    where t.flag_state <> 'none'));
end $$;
revoke all on function dela_admin_transcript_flags(uuid) from public, anon, authenticated;

-- The team opens a transcript only when DELA's AI flagged it or a member reported the conversation. Each opening is recorded.
create or replace function dela_admin_transcript_open(p_actor uuid, p_meeting uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare t meeting_transcripts; m meetings; v_reported boolean;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  select * into m from meetings where id = p_meeting;
  select * into t from meeting_transcripts where meeting_id = p_meeting;
  if m.id is null or t.meeting_id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_reported := exists (select 1 from thread_reports r join threads th on th.id = r.thread_id
    where r.created_at >= m.created_at and (th.id = m.intro_thread or (m.gig_id is not null and th.gig_id = m.gig_id and th.freelancer_person = m.freelancer_person)));
  if t.flag_state = 'none' and not v_reported then return jsonb_build_object('ok', false, 'reason', 'no_reason_to_open'); end if;
  if t.body is null then return jsonb_build_object('ok', false, 'reason', 'no_transcript'); end if;
  insert into meeting_events (meeting_id, action, actor, detail) values (p_meeting, 'transcript_opened_by_team', p_actor, jsonb_build_object('why', case when t.flag_state <> 'none' then 'flagged' else 'reported' end));
  perform dela_audit('staff', p_actor, 'transcript_opened', 'meeting', p_meeting::text, jsonb_build_object('why', case when t.flag_state <> 'none' then 'flagged' else 'reported' end));
  return jsonb_build_object('ok', true, 'text', t.body, 'note', t.flag_note, 'kinds', to_jsonb(t.flag_kinds));
end $$;
revoke all on function dela_admin_transcript_open(uuid, uuid) from public, anon, authenticated;

create or replace function dela_admin_transcript_decide(p_actor uuid, p_meeting uuid, p_action text, p_note text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  if p_action not in ('cleared', 'confirmed') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  update meeting_transcripts set flag_state = p_action, flag_decided_by = p_actor, flag_decided_at = now(), flag_decision_note = left(coalesce(p_note, ''), 600) where meeting_id = p_meeting and flag_state = 'open';
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform dela_audit('staff', p_actor, 'transcript_flag_' || p_action, 'meeting', p_meeting::text, jsonb_build_object('note', left(coalesce(p_note, ''), 600)));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_admin_transcript_decide(uuid, uuid, text, text) from public, anon, authenticated;

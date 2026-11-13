-- Step 25 (Stacey 2026-11-13: "Just use VideoSDK - best option even if paid"): meetings and introductory calls run on
-- VideoSDK. The room is made by DELA for each booking and the meeting happens inside a DELA page, so only the two
-- people of the meeting can get in. VideoSDK tells DELA who joined and left; that is kept with the meeting.
-- This replaces "Online meetings: Vectera" (Stacey 2026-10-25, 2026-11-04). Additive: nothing is removed; setting
-- meetings.provider back to "vectera" brings the Vectera connection back.
insert into settings_history (key, old_value, new_value, old_status, new_status, reason)
select 'meetings.provider', value, '"videosdk"'::jsonb, status, 'C', 'Stacey 2026-11-13: "Just use VideoSDK - best option even if paid"'
from settings where key = 'meetings.provider' and value <> '"videosdk"'::jsonb;
update settings set value = '"videosdk"'::jsonb, status = 'C', source = 'Stacey 2026-11-13', note = 'Was Vectera (Stacey 2026-10-25). Compared in docs/research/vectera-meetings-evaluation.md.'
where key = 'meetings.provider' and value <> '"videosdk"'::jsonb;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('meeting.videosdk_api_base', '"https://api.videosdk.live"', 'VideoSDK API address', 'Booking and meetings', '', 'R', 'Claude', 'From VideoSDK''s API reference.'),
  ('meeting.videosdk_prebuilt_url', '"https://sdk.videosdk.live/rtc-js-prebuilt/0.3.43/rtc-js-prebuilt.js"', 'VideoSDK meeting screen (exact version)', 'Booking and meetings', '', 'R', 'Claude', 'The ready-made meeting screen, pinned to one version. Change it only after testing the new version.')
on conflict (key) do nothing;

-- What the meeting screen needs to join: only for one of the two people, only inside the join window, only when the
-- room is ready. It reuses dela_meetings, so the same rules decide who sees the meeting and when the room opens.
create or replace function dela_meeting_join(p_person uuid, p_side text, p_meeting uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v jsonb; m meetings; v_me uuid;
begin
  v := (dela_meetings(p_person, p_side, null, p_meeting))->'meetings'->0;
  if v is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if coalesce(v->>'join_url', '') = '' then return jsonb_build_object('ok', false, 'reason', 'room_not_open'); end if;
  select * into m from meetings where id = p_meeting;
  if m.provider <> 'videosdk' or m.room_ref = '' then return jsonb_build_object('ok', false, 'reason', 'room_not_open'); end if;
  v_me := case when p_side = 'attorney' then m.attorney_person else m.freelancer_person end;
  insert into meeting_events (meeting_id, action, actor, detail) values (m.id, 'join_opened', p_person, jsonb_build_object('side', p_side));
  return jsonb_build_object('ok', true, 'room', m.room_ref, 'role', p_side, 'title', v->>'gig_title', 'end_at', m.end_at,
    'participant', case when p_side = 'attorney' then 'att-' else 'fl-' end || left(replace(v_me::text, '-', ''), 12),
    'name', coalesce((select nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), '') from member_profiles mp where mp.person_id = v_me and mp.side = p_side),
      (select display_name from people where id = v_me), 'Member'));
end $$;
revoke all on function dela_meeting_join(uuid, text, uuid) from public, anon, authenticated;

-- The room's provider is written when the room is made, so a later change of provider does not confuse older meetings
create or replace function dela_meeting_room_set(p_meeting uuid, p_provider text, p_status text, p_ref text, p_att text, p_free text) returns void language sql set search_path = public, extensions, pg_temp as $$
  update meetings set provider = p_provider, room_status = p_status, room_ref = coalesce(p_ref, room_ref), room_url_attorney = coalesce(p_att, room_url_attorney),
    room_url_freelancer = coalesce(p_free, room_url_freelancer), updated_at = now() where id = p_meeting
$$;
revoke all on function dela_meeting_room_set(uuid, text, text, text, text, text) from public, anon, authenticated;

-- What the meeting service reports about a room: the session started or ended, a person joined or left. Kept as
-- meeting events (append-only). When both people have joined, attendance has evidence; the two people still confirm
-- "we met" themselves, as before. Unknown rooms are ignored.
create or replace function dela_meeting_provider_event(p_room text, p_type text, p jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare m meetings; v_pid text := coalesce(p->>'participantId', ''); v_who uuid; v_both boolean;
begin
  if p_type not in ('session-started', 'session-ended', 'participant-joined', 'participant-left') then return jsonb_build_object('ok', true, 'ignored', true); end if;
  select * into m from meetings where provider = 'videosdk' and room_ref = p_room and room_ref <> '' order by created_at desc limit 1;
  if m.id is null then return jsonb_build_object('ok', true, 'ignored', true); end if;
  v_who := case when v_pid = 'att-' || left(replace(m.attorney_person::text, '-', ''), 12) then m.attorney_person
                when v_pid = 'fl-' || left(replace(m.freelancer_person::text, '-', ''), 12) then m.freelancer_person end;
  insert into meeting_events (meeting_id, action, actor, detail)
  values (m.id, 'room_' || replace(p_type, '-', '_'), v_who, jsonb_build_object('session', left(coalesce(p->>'sessionId', ''), 60), 'known_person', v_who is not null,
    'reason', left(coalesce(p->>'reason', ''), 80), 'start', p->>'start', 'end', p->>'end'));
  if p_type = 'participant-joined' and v_who is not null then
    select count(distinct e.actor) = 2 into v_both from meeting_events e where e.meeting_id = m.id and e.action = 'room_participant_joined' and e.actor in (m.attorney_person, m.freelancer_person);
    if v_both and m.attendance = 'unverified' then update meetings set attendance = 'evidence_received', updated_at = now() where id = m.id; end if;
  end if;
  return jsonb_build_object('ok', true, 'meeting', m.id);
end $$;
revoke all on function dela_meeting_provider_event(text, text, jsonb) from public, anon, authenticated;

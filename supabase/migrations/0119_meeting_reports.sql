-- Step 27: "Report this meeting". Either person of a meeting can report it to the Lawfecta Team with a reason. A
-- report is the second ground (next to a flag by DELA's AI) on which the team may open that meeting's transcript
-- (Stacey 2026-11-13, answer 2). Nothing happens to the other person by itself. Additive.
create table if not exists meeting_reports (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id),
  reporter uuid not null references people(id),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_by uuid references people(id),
  closed_at timestamptz,
  close_note text not null default '',
  created_at timestamptz not null default now()
);
alter table meeting_reports enable row level security;
create index if not exists meeting_reports_open on meeting_reports (meeting_id) where status = 'open';

create or replace function dela_meeting_report(p_person uuid, p_side text, p_meeting uuid, p_reason text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_reason text := left(trim(coalesce(p_reason, '')), 1000); v uuid;
begin
  if dela_meeting_mine(p_person, p_side, p_meeting) is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_reason = '' then return jsonb_build_object('ok', false, 'reason', 'reason_needed'); end if;
  if exists (select 1 from meeting_reports where meeting_id = p_meeting and reporter = p_person and status = 'open') then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  insert into meeting_reports (meeting_id, reporter, reason) values (p_meeting, p_person, v_reason) returning id into v;
  insert into meeting_events (meeting_id, action, actor, detail) values (p_meeting, 'reported', p_person, jsonb_build_object('side', p_side));
  perform dela_alert('report', 'A member reported a meeting', 'A member reported a meeting. Review it in the admin area under Meetings and messages.', 'meetreport:' || v::text);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_meeting_report(uuid, text, uuid, text) from public, anon, authenticated;

-- The team's list now holds flagged transcripts and reported meetings together
create or replace function dela_admin_transcript_flags(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  return jsonb_build_object('ok', true, 'flags', (select coalesce(jsonb_agg(jsonb_build_object('meeting_id', m.id, 'start_at', m.start_at, 'attorney', pa.display_name, 'freelancer', pf.display_name,
      'title', coalesce((select g.title from gigs g where g.id = m.gig_id), 'Introductory call'), 'kinds', to_jsonb(coalesce(t.flag_kinds, '{}')), 'note', coalesce(t.flag_note, ''),
      'state', case when coalesce(t.flag_state, 'none') <> 'none' then t.flag_state when r.n_open > 0 then 'open' else 'cleared' end,
      'flagged', coalesce(t.flag_state, 'none') <> 'none', 'has_text', t.body is not null, 'decided_at', t.flag_decided_at, 'decision_note', coalesce(t.flag_decision_note, ''),
      'reports', r.list) order by (coalesce(t.flag_state, 'none') = 'open' or r.n_open > 0) desc, m.start_at desc), '[]')
    from meetings m join people pa on pa.id = m.attorney_person join people pf on pf.id = m.freelancer_person
      left join meeting_transcripts t on t.meeting_id = m.id
      left join lateral (select count(*) filter (where mr.status = 'open') n_open, count(*) n_all,
          coalesce(jsonb_agg(jsonb_build_object('id', mr.id, 'by', case when mr.reporter = m.attorney_person then 'The attorney' else 'The freelancer' end, 'reason', mr.reason, 'at', mr.created_at, 'status', mr.status, 'close_note', mr.close_note) order by mr.created_at), '[]') list
        from meeting_reports mr where mr.meeting_id = m.id) r on true
    where coalesce(t.flag_state, 'none') <> 'none' or r.n_all > 0));
end $$;
revoke all on function dela_admin_transcript_flags(uuid) from public, anon, authenticated;

create or replace function dela_admin_meeting_report_close(p_actor uuid, p_report uuid, p_note text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_meeting uuid;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  update meeting_reports set status = 'closed', closed_by = p_actor, closed_at = now(), close_note = left(coalesce(p_note, ''), 600) where id = p_report and status = 'open' returning meeting_id into v_meeting;
  if v_meeting is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform dela_audit('staff', p_actor, 'meeting_report_closed', 'meeting', v_meeting::text, jsonb_build_object('note', left(coalesce(p_note, ''), 600)));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_admin_meeting_report_close(uuid, uuid, text) from public, anon, authenticated;

-- A report of the meeting itself also lets the team open its transcript
do $mig$
declare v_def text; v_new text;
begin
  v_def := pg_get_functiondef('dela_admin_transcript_open(uuid, uuid)'::regprocedure);
  if position('meeting_reports' in v_def) = 0 then
    v_new := replace(v_def, $a$v_reported := exists (select 1 from thread_reports r$a$, $b$v_reported := exists (select 1 from meeting_reports mr where mr.meeting_id = m.id) or exists (select 1 from thread_reports r$b$);
    if v_new = v_def then raise exception 'dela_admin_transcript_open: anchor not found'; end if;
    execute v_new;
  end if;
end $mig$;
revoke all on function dela_admin_transcript_open(uuid, uuid) from public, anon, authenticated;

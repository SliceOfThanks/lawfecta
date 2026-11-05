-- Step 5: booking, meetings and chat inside DELA. Brief: docs/briefs/step-5-booking-meetings-chat.md (Stacey: all 18 answers as suggested, 2026-11-05).
-- Meetings are always inside a gig, between the attorney's side and a freelancer who was invited, applied or was hired.
-- Times are stored in UTC and shown in each person's own time zone. Additive: new tables, functions, switches and settings.

insert into feature_switches (key, label, gate) values
  ('meetings', 'Booking and meetings (inside a gig)', 'Step 5 tested'),
  ('gig_chat', 'Messages between an attorney and a freelancer on a gig', 'Step 5 tested'),
  ('chat_assistant', 'DELA in a message thread: summarize, draft a reply, list what was agreed', 'Step 5 tested')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('meeting.lengths', '[15,30,45]', 'Meeting lengths members can offer', 'Booking and meetings', 'minutes', 'C', 'Stacey 2026-11-05 (Step 5 answer 2)', 'Always free. No paid consultations.'),
  ('meeting.default_length', '30', 'Default meeting length', 'Booking and meetings', 'minutes', 'C', 'Stacey 2026-11-05', ''),
  ('meeting.min_notice_hours', '12', 'Least notice for a booking', 'Booking and meetings', 'hours', 'C', 'Stacey 2026-11-05 (answer 3)', ''),
  ('meeting.buffer_minutes', '15', 'Time kept free between meetings', 'Booking and meetings', 'minutes', 'C', 'Stacey 2026-11-05 (answer 3)', ''),
  ('meeting.window_days', '21', 'How far ahead people can book', 'Booking and meetings', 'days', 'C', 'Stacey 2026-11-05 (answer 3)', ''),
  ('meeting.hold_minutes', '10', 'How long a time is held while confirming', 'Booking and meetings', 'minutes', 'C', 'Stacey 2026-11-05 (answer 3)', ''),
  ('meeting.reminder_hours', '[24,1]', 'Reminders before a meeting', 'Booking and meetings', 'hours', 'C', 'Stacey 2026-11-05 (answer 4)', ''),
  ('meeting.late_cancel_hours', '2', 'Cancel or reschedule later than this counts as late', 'Booking and meetings', 'hours', 'C', 'Stacey 2026-11-05 (answer 5)', ''),
  ('meeting.flag_count', '2', 'Late cancels or no-shows that go to the Lawfecta Team', 'Booking and meetings', 'times', 'C', 'Stacey 2026-11-05 (answer 5)', 'Counted over meeting.flag_days.'),
  ('meeting.flag_days', '30', 'Days counted for late cancels and no-shows', 'Booking and meetings', 'days', 'C', 'Stacey 2026-11-05 (answer 5)', ''),
  ('meeting.confirm_hours', '48', 'Hours to confirm a meeting happened', 'Booking and meetings', 'hours', 'C', 'Stacey 2026-11-05 (answer 8)', ''),
  ('meeting.join_early_minutes', '15', 'How early the room opens', 'Booking and meetings', 'minutes', 'R', 'Claude', ''),
  ('meeting.vectera_api_base', '"https://api.vectera.com"', 'Vectera API address', 'Booking and meetings', '', 'O', 'Claude', 'To confirm with Vectera with the API plan.'),
  ('meeting.room_domain', '"meet.lawfecta.com"', 'Lawfecta''s own address for meeting rooms (CNAME to Vectera)', 'Booking and meetings', '', 'O', 'Stacey 2026-11-04', 'Set up in Vectera team settings and DNS.'),
  ('chat.edit_minutes', '15', 'Minutes a message can be edited', 'Messages', 'minutes', 'C', 'Stacey 2026-11-05 (answer 11)', 'The history is kept.'),
  ('chat.email_gap_minutes', '15', 'Least time between message emails for one thread', 'Messages', 'minutes', 'C', 'Stacey 2026-11-05 (answer 16)', 'Emails never include the message text.'),
  ('chat.rate_per_minute', '20', 'Most messages one person sends in a minute', 'Messages', 'messages', 'R', 'Claude', 'Spam limit.'),
  ('chat.close_days_after_gig', '30', 'Days messages stay open after a gig closes without a hire', 'Messages', 'days', 'R', 'Brief: When', '')
on conflict (key) do nothing;

-- Conduct flags (Step 4) also cover messages now
do $$
declare c text;
begin
  select conname into c from pg_constraint where conrelid = 'conduct_flags'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%invitation%';
  if c is not null then execute format('alter table conduct_flags drop constraint %I', c); end if;
  alter table conduct_flags add constraint conduct_flags_object_type_check check (object_type in ('proposal', 'question', 'answer', 'invitation', 'gig', 'message'));
end $$;

-- ---------- Availability for meetings ----------
create table meeting_availability (
  person_id uuid primary key references people(id),
  timezone text not null default 'America/Chicago',
  lengths int[] not null default '{30}',
  hours jsonb not null default '{"1":[["09:00","17:00"]],"2":[["09:00","17:00"]],"3":[["09:00","17:00"]],"4":[["09:00","17:00"]],"5":[["09:00","17:00"]]}',  -- ISO weekday 1 Monday .. 7 Sunday
  days_off date[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table meeting_availability enable row level security;

create table member_prefs (
  person_id uuid primary key references people(id),
  read_receipts boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table member_prefs enable row level security;

-- ---------- Meetings ----------
create table meetings (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references gigs(id),
  attorney_person uuid not null references people(id),
  freelancer_person uuid not null references people(id),
  booked_by uuid not null references people(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  length_min int not null,
  status text not null check (status in ('held', 'confirmed', 'completed', 'canceled', 'rescheduled', 'no_show', 'expired')),
  hold_expires_at timestamptz,
  replaces uuid references meetings(id),
  version int not null default 1,
  canceled_by uuid references people(id),
  cancel_reason text not null default '',
  late boolean not null default false,
  provider text not null default 'vectera',
  room_status text not null default 'pending' check (room_status in ('pending', 'ready', 'failed', 'waiting_for_provider')),
  room_ref text not null default '',
  room_url_attorney text not null default '',
  room_url_freelancer text not null default '',
  consent_attorney_at timestamptz,
  consent_freelancer_at timestamptz,
  attendance text not null default 'unverified' check (attendance in ('unverified', 'evidence_received', 'verified', 'disputed')),
  next_steps jsonb not null default '[]',
  request_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booked_by, request_id)
);
create index meetings_people on meetings (attorney_person, start_at);
create index meetings_free on meetings (freelancer_person, start_at);
alter table meetings enable row level security;

create table meeting_events (
  id bigserial primary key,
  meeting_id uuid not null references meetings(id),
  action text not null,
  actor uuid references people(id),
  detail jsonb not null default '{}',
  at timestamptz not null default now()
);
create trigger meeting_events_append_only before update or delete on meeting_events for each row execute function dela_no_change();
alter table meeting_events enable row level security;

create table meeting_followups (
  meeting_id uuid not null references meetings(id),
  person_id uuid not null references people(id),
  met boolean not null,
  summary text not null default '',
  submitted_at timestamptz not null default now(),
  primary key (meeting_id, person_id)
);
alter table meeting_followups enable row level security;

-- ---------- Threads and messages ----------
create table threads (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references gigs(id),
  freelancer_person uuid not null references people(id),
  blocked_by uuid references people(id),
  blocked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (gig_id, freelancer_person)
);
alter table threads enable row level security;

create table messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id),
  sender uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  body text not null check (length(body) between 1 and 8000),
  attachments uuid[] not null default '{}',
  status text not null default 'sent' check (status in ('sent', 'held', 'removed')),
  warned boolean not null default false,
  edited_at timestamptz,
  removed_at timestamptz,
  request_id text not null,
  created_at timestamptz not null default now(),
  unique (thread_id, sender, request_id)
);
create index messages_thread on messages (thread_id, created_at);
alter table messages enable row level security;

create table message_edits (
  id bigserial primary key,
  message_id uuid not null references messages(id),
  old_body text not null,
  at timestamptz not null default now()
);
create trigger message_edits_append_only before update or delete on message_edits for each row execute function dela_no_change();
alter table message_edits enable row level security;

create table thread_reads (
  thread_id uuid not null references threads(id),
  person_id uuid not null references people(id),
  last_read_at timestamptz not null default now(),
  primary key (thread_id, person_id)
);
alter table thread_reads enable row level security;

create table thread_reports (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id),
  message_id uuid references messages(id),
  reporter uuid not null references people(id),
  reason text not null default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_by uuid references people(id),
  created_at timestamptz not null default now()
);
alter table thread_reports enable row level security;

create table thread_drafts (
  thread_id uuid not null references threads(id),
  person_id uuid not null references people(id),
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (thread_id, person_id)
);
alter table thread_drafts enable row level security;

create table message_file_downloads (
  id bigserial primary key,
  thread_id uuid not null references threads(id),
  file_id uuid not null references files(id),
  person_id uuid not null references people(id),
  at timestamptz not null default now()
);
create trigger message_file_downloads_append_only before update or delete on message_file_downloads for each row execute function dela_no_change();
alter table message_file_downloads enable row level security;

-- ---------- Who may meet and message ----------
-- The freelancer was invited to the gig, sent a proposal, or was hired
create or replace function dela_gig_pair(p_gig uuid, p_freelancer uuid) returns boolean language sql stable as $$
  select exists (select 1 from gig_invitations i where i.gig_id = p_gig and i.freelancer_id = p_freelancer and i.status in ('sent', 'answered', 'closed'))
      or exists (select 1 from proposals p where p.gig_id = p_gig and p.freelancer_id = p_freelancer and p.status not in ('draft'))
      or exists (select 1 from agreements a where a.gig_id = p_gig and a.freelancer_person = p_freelancer)
$$;

-- This person's role in a thread: 'attorney' (manager of the gig), 'freelancer' (the thread's freelancer) or ''
create or replace function dela_thread_role(p_person uuid, p_side text, p_thread uuid) returns text language sql stable as $$
  select case when p_side = 'attorney' and dela_gig_manager(p_person, t.gig_id) then 'attorney'
              when p_side = 'freelancer' and t.freelancer_person = p_person then 'freelancer' else '' end
  from threads t where t.id = p_thread
$$;

create or replace function dela_thread_open(p_person uuid, p_side text, p_gig uuid, p_freelancer uuid) returns jsonb language plpgsql as $$
declare v_id uuid; v_free uuid := case when p_side = 'freelancer' then p_person else p_freelancer end;
begin
  if not dela_switch_on('gig_chat', p_person) then return jsonb_build_object('ok', false, 'reason', 'chat_off'); end if;
  if p_side = 'attorney' and not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_free is null or not dela_gig_pair(p_gig, v_free) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  insert into threads (gig_id, freelancer_person) values (p_gig, v_free) on conflict (gig_id, freelancer_person) do nothing;
  select id into v_id from threads where gig_id = p_gig and freelancer_person = v_free;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Open for new messages: not blocked (unless funded work exists, Step 6), and not more than the set days after a gig closed without a hire
create or replace function dela_thread_writable(p_thread uuid) returns text language sql stable as $$
  select case
    when t.blocked_at is not null and not exists (select 1 from agreements a where a.gig_id = t.gig_id and a.freelancer_person = t.freelancer_person and a.status in ('signed')) then 'blocked'
    when exists (select 1 from agreements a where a.gig_id = t.gig_id and a.freelancer_person = t.freelancer_person and a.status <> 'canceled') then ''
    when g.closed_at is not null and g.closed_at + make_interval(days => dela_int_setting('chat.close_days_after_gig', 30)) < now() then 'thread_closed'
    else '' end
  from threads t join gigs g on g.id = t.gig_id where t.id = p_thread
$$;

-- ---------- Messages ----------
create or replace function dela_message_send(p_person uuid, p_side text, p_thread uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_role text := dela_thread_role(p_person, p_side, p_thread); v_why text; v_id uuid; t threads; g gigs; v_other uuid; v_recent int; v_att uuid[]; f uuid; v_bucket bigint;
  v_held boolean := coalesce((p->>'held')::boolean, false);
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('gig_chat', p_person) then return jsonb_build_object('ok', false, 'reason', 'chat_off'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  v_why := dela_thread_writable(p_thread);
  if v_why <> '' then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  select id into v_id from messages where thread_id = p_thread and sender = p_person and request_id = p->>'request_id';
  if v_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_id); end if;
  select count(*) into v_recent from messages where sender = p_person and created_at > now() - interval '1 minute';
  if v_recent >= dela_int_setting('chat.rate_per_minute', 20) then return jsonb_build_object('ok', false, 'reason', 'too_many_messages'); end if;
  select * into t from threads where id = p_thread;
  select * into g from gigs where id = t.gig_id;
  -- Attachments: the attorney's side attaches ready firm files; the freelancer attaches their own ready profile documents
  v_att := array(select (x #>> '{}')::uuid from jsonb_array_elements(coalesce(p->'attachments', '[]')) x limit 5);
  foreach f in array v_att loop
    if not exists (select 1 from files fi where fi.id = f and fi.status = 'ready' and (
         (v_role = 'attorney' and fi.org_id = g.org_id and fi.purpose = 'member') or
         (v_role = 'freelancer' and fi.uploaded_by = p_person and fi.purpose in ('profile', 'member')))) then
      return jsonb_build_object('ok', false, 'reason', 'file_not_usable');
    end if;
  end loop;
  insert into messages (thread_id, sender, side, body, attachments, status, warned, request_id)
  values (p_thread, p_person, v_role, left(p->>'body', 8000), v_att, case when v_held then 'held' else 'sent' end, coalesce((p->>'warned')::boolean, false), coalesce(p->>'request_id', gen_random_uuid()::text))
  returning id into v_id;
  insert into thread_reads (thread_id, person_id, last_read_at) values (p_thread, p_person, now()) on conflict (thread_id, person_id) do update set last_read_at = now();
  delete from thread_drafts where thread_id = p_thread and person_id = p_person;
  if not v_held then perform dela_message_notify(v_id); end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'held', v_held);
end $$;

-- A short notice and email to the other side, with no message text, at most one email per thread every few minutes,
-- and no email while the person has the thread open (read in the last 2 minutes)
create or replace function dela_message_notify(p_msg uuid) returns void language plpgsql as $$
declare m messages; t threads; g gigs; v_to uuid[]; who uuid; v_bucket bigint; v_open boolean;
begin
  select * into m from messages where id = p_msg;
  select * into t from threads where id = m.thread_id;
  select * into g from gigs where id = t.gig_id;
  v_to := case when m.side = 'attorney' then array[t.freelancer_person]
               else array(select distinct x from (select g.created_by as x union select o.owner_person_id from organizations o where o.id = g.org_id) y) end;
  v_bucket := floor(extract(epoch from now()) / (60 * greatest(dela_int_setting('chat.email_gap_minutes', 15), 1)))::bigint;
  foreach who in array v_to loop
    v_open := exists (select 1 from thread_reads r where r.thread_id = t.id and r.person_id = who and r.last_read_at > now() - interval '2 minutes');
    perform dela_notify(jsonb_build_object('person_id', who, 'side', case when m.side = 'attorney' then 'freelancer' else 'attorney' end, 'kind', 'message',
      'email', not v_open, 'title', 'New message on ' || g.title, 'body', 'You have a new message about "' || g.title || '". Open DELA to read it.',
      'link', '/dela?tab=inbox&thread=' || t.id::text, 'dedupe_key', 'msg:' || t.id::text || ':' || who::text || ':' || v_bucket));
  end loop;
end $$;

create or replace function dela_message_edit(p_person uuid, p_msg uuid, p_body text) returns jsonb language plpgsql as $$
declare m messages;
begin
  select * into m from messages where id = p_msg for update;
  if m.id is null or m.sender <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if m.status = 'removed' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if m.created_at < now() - make_interval(mins => dela_int_setting('chat.edit_minutes', 15)) then return jsonb_build_object('ok', false, 'reason', 'edit_time_over'); end if;
  if m.body = p_body then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  insert into message_edits (message_id, old_body) values (m.id, m.body);
  update messages set body = left(p_body, 8000), edited_at = now() where id = m.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_message_remove(p_person uuid, p_msg uuid) returns jsonb language plpgsql as $$
declare m messages;
begin
  select * into m from messages where id = p_msg for update;
  if m.id is null or m.sender <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if m.status = 'removed' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  -- The text stays for the Lawfecta Team; the other person sees "Message removed"
  update messages set status = 'removed', removed_at = now() where id = m.id;
  return jsonb_build_object('ok', true);
end $$;

-- One thread: messages in order, the other person's last read time (when both allow read receipts), and marks it read
create or replace function dela_thread_get(p_person uuid, p_side text, p_thread uuid) returns jsonb language plpgsql as $$
declare v_role text := dela_thread_role(p_person, p_side, p_thread); t threads; g gigs; v_seen timestamptz; v_mine boolean; v_theirs boolean; v_other uuid;
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into t from threads where id = p_thread;
  select * into g from gigs where id = t.gig_id;
  v_mine := coalesce((select read_receipts from member_prefs where person_id = p_person), true);
  if v_role = 'attorney' then
    v_other := t.freelancer_person;
    select max(last_read_at) into v_seen from thread_reads where thread_id = p_thread and person_id = t.freelancer_person;
  else
    select max(r.last_read_at) into v_seen from thread_reads r where r.thread_id = p_thread and r.person_id <> p_person;
    v_other := g.created_by;
  end if;
  v_theirs := coalesce((select read_receipts from member_prefs where person_id = v_other), true);
  insert into thread_reads (thread_id, person_id, last_read_at) values (p_thread, p_person, now()) on conflict (thread_id, person_id) do update set last_read_at = now();
  return jsonb_build_object('ok', true, 'role', v_role, 'writable', dela_thread_writable(p_thread) = '', 'why_closed', dela_thread_writable(p_thread),
    'thread', jsonb_build_object('id', t.id, 'gig_id', t.gig_id, 'gig_title', g.title, 'gig_status', g.status, 'blocked', t.blocked_at is not null, 'blocked_by_me', t.blocked_by = p_person,
      'freelancer_person', t.freelancer_person,
      'other_name', case when v_role = 'attorney' then (select coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name) from people pe left join member_profiles mp on mp.person_id = pe.id and mp.side = 'freelancer' where pe.id = t.freelancer_person)
        else (select coalesce(nullif(mp.body->>'firm_name', ''), pe.display_name) from people pe left join member_profiles mp on mp.person_id = pe.id and mp.side = 'attorney' where pe.id = g.created_by) end),
    'seen_at', case when v_mine and v_theirs then v_seen end,
    'draft', (select body from thread_drafts where thread_id = p_thread and person_id = p_person),
    'edit_minutes', dela_int_setting('chat.edit_minutes', 15),
    'messages', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'mine', m.sender = p_person, 'side', m.side,
        'body', case when m.status = 'removed' then '' when m.status = 'held' and m.sender <> p_person then '' else m.body end,
        'status', m.status, 'warned', m.warned and m.sender = p_person, 'edited', m.edited_at is not null, 'created_at', m.created_at,
        'attachments', (select coalesce(jsonb_agg(jsonb_build_object('file_id', fi.id, 'name', fi.name)), '[]') from files fi where fi.id = any(m.attachments) and m.status = 'sent'))
        order by m.created_at), '[]')
      from messages m where m.thread_id = p_thread and (m.status <> 'held' or m.sender = p_person)));
end $$;

-- The inbox: every thread this person is part of, with unread counts
create or replace function dela_threads(p_person uuid, p_side text) returns jsonb language sql stable as $$
  select jsonb_build_object('ok', true, 'on', dela_switch_on('gig_chat', p_person), 'threads', coalesce(jsonb_agg(x order by x->>'last_at' desc nulls last), '[]')) from (
    select jsonb_build_object('id', t.id, 'gig_id', t.gig_id, 'gig_title', g.title,
      'other_name', case when p_side = 'attorney' then (select coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name) from people pe left join member_profiles mp on mp.person_id = pe.id and mp.side = 'freelancer' where pe.id = t.freelancer_person)
        else (select coalesce(nullif(mp.body->>'firm_name', ''), pe.display_name) from people pe left join member_profiles mp on mp.person_id = pe.id and mp.side = 'attorney' where pe.id = g.created_by) end,
      'last_at', (select max(m.created_at) from messages m where m.thread_id = t.id and (m.status = 'sent' or m.sender = p_person)),
      'unread', (select count(*) from messages m where m.thread_id = t.id and m.status = 'sent' and m.sender <> p_person
        and m.created_at > coalesce((select r.last_read_at from thread_reads r where r.thread_id = t.id and r.person_id = p_person), '-infinity'::timestamptz))) x
    from threads t join gigs g on g.id = t.gig_id
    where (p_side = 'freelancer' and t.freelancer_person = p_person) or (p_side = 'attorney' and dela_gig_manager(p_person, t.gig_id))) y
$$;

create or replace function dela_thread_draft(p_person uuid, p_side text, p_thread uuid, p_body text) returns jsonb language plpgsql as $$
begin
  if dela_thread_role(p_person, p_side, p_thread) = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  insert into thread_drafts (thread_id, person_id, body) values (p_thread, p_person, left(coalesce(p_body, ''), 8000))
  on conflict (thread_id, person_id) do update set body = excluded.body, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_thread_report(p_person uuid, p_side text, p_thread uuid, p_msg uuid, p_reason text) returns jsonb language plpgsql as $$
declare v uuid;
begin
  if dela_thread_role(p_person, p_side, p_thread) = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  insert into thread_reports (thread_id, message_id, reporter, reason) values (p_thread, p_msg, p_person, left(coalesce(p_reason, ''), 1000)) returning id into v;
  perform dela_alert('report', 'A member reported a message', 'A member reported a message thread. Review it in the admin Meetings and messages tab.', 'report:' || v::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_thread_block(p_person uuid, p_side text, p_thread uuid, p_block boolean) returns jsonb language plpgsql as $$
declare t threads;
begin
  if dela_thread_role(p_person, p_side, p_thread) = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into t from threads where id = p_thread for update;
  if p_block then
    if t.blocked_at is not null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    update threads set blocked_by = p_person, blocked_at = now() where id = p_thread;
    -- Upcoming meetings between them are canceled
    update meetings set status = 'canceled', canceled_by = p_person, cancel_reason = 'blocked', updated_at = now()
    where gig_id = t.gig_id and freelancer_person = t.freelancer_person and status in ('held', 'confirmed') and start_at > now();
    perform dela_alert('report', 'A member blocked a thread', 'A member blocked a message thread on a gig. Check it in the admin Meetings and messages tab.', 'block:' || p_thread::text);
  else
    if t.blocked_by is distinct from p_person then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
    update threads set blocked_by = null, blocked_at = null where id = p_thread;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_message_file_get(p_person uuid, p_side text, p_thread uuid, p_file uuid) returns jsonb language plpgsql as $$
declare f files;
begin
  if dela_thread_role(p_person, p_side, p_thread) = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not exists (select 1 from messages m where m.thread_id = p_thread and m.status = 'sent' and p_file = any(m.attachments)) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into f from files where id = p_file and status = 'ready';
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  insert into message_file_downloads (thread_id, file_id, person_id) values (p_thread, p_file, p_person);
  return jsonb_build_object('ok', true, 'path', f.storage_path, 'name', f.name);
end $$;

-- Text for DELA's assistant and the connector: the last messages the person may read
create or replace function dela_thread_text(p_person uuid, p_side text, p_thread uuid) returns jsonb language plpgsql stable as $$
declare v_role text := dela_thread_role(p_person, p_side, p_thread);
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'role', v_role, 'gig_title', (select g.title from threads t join gigs g on g.id = t.gig_id where t.id = p_thread),
    'gig_id', (select t.gig_id from threads t where t.id = p_thread),
    'lines', (select coalesce(jsonb_agg(x order by x->>'at'), '[]') from (select jsonb_build_object('who', case when m.side = 'attorney' then 'Attorney' else 'Freelancer' end, 'text', m.body, 'at', m.created_at) x
      from messages m where m.thread_id = p_thread and m.status = 'sent' order by m.created_at desc limit 80) y));
end $$;

create or replace function dela_prefs(p_person uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('read_receipts', coalesce((select read_receipts from member_prefs where person_id = p_person), true))
$$;
create or replace function dela_prefs_save(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
begin
  insert into member_prefs (person_id, read_receipts) values (p_person, coalesce((p->>'read_receipts')::boolean, true))
  on conflict (person_id) do update set read_receipts = excluded.read_receipts, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Availability and open times ----------
create or replace function dela_avail_get(p_person uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('ok', true,
    'availability', coalesce((select jsonb_build_object('timezone', a.timezone, 'lengths', to_jsonb(a.lengths), 'hours', a.hours, 'days_off', to_jsonb(a.days_off), 'updated_at', a.updated_at) from meeting_availability a where a.person_id = p_person),
      jsonb_build_object('timezone', 'America/Chicago', 'lengths', '[30]'::jsonb, 'hours', '{"1":[["09:00","17:00"]],"2":[["09:00","17:00"]],"3":[["09:00","17:00"]],"4":[["09:00","17:00"]],"5":[["09:00","17:00"]]}'::jsonb, 'days_off', '[]'::jsonb, 'updated_at', null)),
    'allowed_lengths', coalesce(dela_setting('meeting.lengths'), '[15,30,45]'), 'saved', exists (select 1 from meeting_availability where person_id = p_person))
$$;

create or replace function dela_avail_save(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_tz text := coalesce(p->>'timezone', ''); v_lengths int[]; v_allowed int[]; d text; w jsonb;
begin
  if not exists (select 1 from pg_timezone_names where name = v_tz) then return jsonb_build_object('ok', false, 'reason', 'bad_timezone'); end if;
  v_allowed := array(select (x #>> '{}')::int from jsonb_array_elements(coalesce(dela_setting('meeting.lengths'), '[15,30,45]')) x);
  v_lengths := array(select distinct (x #>> '{}')::int from jsonb_array_elements(coalesce(p->'lengths', '[]')) x where (x #>> '{}')::int = any(v_allowed) order by 1);
  if cardinality(v_lengths) = 0 then return jsonb_build_object('ok', false, 'reason', 'choose_a_length'); end if;
  -- Hours: weekday "1".."7" -> list of [from, to] in 24-hour HH:MM, from before to
  for d, w in select key, value from jsonb_each(coalesce(p->'hours', '{}')) loop
    if d !~ '^[1-7]$' or jsonb_typeof(w) <> 'array' then return jsonb_build_object('ok', false, 'reason', 'bad_hours'); end if;
    if exists (select 1 from jsonb_array_elements(w) r where jsonb_typeof(r) <> 'array' or (r->>0) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or (r->>1) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$|^24:00$' or (r->>0) >= (r->>1)) then
      return jsonb_build_object('ok', false, 'reason', 'bad_hours');
    end if;
  end loop;
  insert into meeting_availability (person_id, timezone, lengths, hours, days_off)
  values (p_person, v_tz, v_lengths, coalesce(p->'hours', '{}'), array(select distinct (x #>> '{}')::date from jsonb_array_elements(coalesce(p->'days_off', '[]')) x where (x #>> '{}') ~ '^\d{4}-\d{2}-\d{2}$' limit 120))
  on conflict (person_id) do update set timezone = excluded.timezone, lengths = excluded.lengths, hours = excluded.hours, days_off = excluded.days_off, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- Busy times for one person: confirmed meetings and holds that have not run out, with the buffer around them
create or replace function dela_person_busy(p_person uuid, p_from timestamptz, p_to timestamptz, p_except uuid default null) returns table (b_start timestamptz, b_end timestamptz) language sql stable as $$
  select m.start_at - make_interval(mins => dela_int_setting('meeting.buffer_minutes', 15)), m.end_at + make_interval(mins => dela_int_setting('meeting.buffer_minutes', 15))
  from meetings m
  where (m.attorney_person = p_person or m.freelancer_person = p_person) and m.id is distinct from p_except
    and (m.status = 'confirmed' or (m.status = 'held' and m.hold_expires_at > now()))
    and m.end_at > p_from and m.start_at < p_to
$$;

-- Open times for a meeting of a given length with this freelancer: their weekly hours in their own time zone (daylight saving
-- handled by the time zone), minus days off, minimum notice, the booking window, and both people's meetings with buffers
create or replace function dela_open_times(p_freelancer uuid, p_attorney uuid, p_length int, p_except uuid default null) returns setof timestamptz language plpgsql stable as $$
declare a meeting_availability; v_from timestamptz := now() + make_interval(hours => dela_int_setting('meeting.min_notice_hours', 12));
  v_to timestamptz := now() + make_interval(days => dela_int_setting('meeting.window_days', 21));
begin
  select * into a from meeting_availability where person_id = p_freelancer;
  if a.person_id is null or not (p_length = any(a.lengths)) then return; end if;
  return query
    with days as (
      select d::date as day from generate_series((now() at time zone a.timezone)::date, (v_to at time zone a.timezone)::date, interval '1 day') d
    ), windows as (
      select day, (r->>0)::time as w_from, case when r->>1 = '24:00' then time '23:59:59' else (r->>1)::time end as w_to
      from days, jsonb_array_elements(coalesce(a.hours -> extract(isodow from day)::text, '[]')) r
      where not (day = any(a.days_off))
    ), starts as (
      select ((day + t) at time zone a.timezone) as s
      from windows, generate_series(timestamp '2000-01-01' + w_from, timestamp '2000-01-01' + w_to - make_interval(mins => p_length), interval '15 minutes') g, lateral (select g::time as t) x
    )
    select s from starts
    where s >= v_from and s <= v_to
      and not exists (select 1 from dela_person_busy(p_freelancer, s - interval '1 day', s + interval '1 day', p_except) b where b.b_start < s + make_interval(mins => p_length) and b.b_end > s)
      and not exists (select 1 from dela_person_busy(p_attorney, s - interval '1 day', s + interval '1 day', p_except) b where b.b_start < s + make_interval(mins => p_length) and b.b_end > s)
    order by s;
end $$;

create or replace function dela_meeting_slots(p_person uuid, p_side text, p_gig uuid, p_freelancer uuid, p_length int, p_except uuid) returns jsonb language plpgsql stable as $$
declare g gigs; v_free uuid := case when p_side = 'freelancer' then p_person else p_freelancer end; a meeting_availability;
begin
  if not dela_switch_on('meetings', p_person) then return jsonb_build_object('ok', false, 'reason', 'meetings_off'); end if;
  select * into g from gigs where id = p_gig;
  if g.id is null or (p_side = 'attorney' and not dela_gig_manager(p_person, p_gig)) or not dela_gig_pair(p_gig, v_free) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into a from meeting_availability where person_id = v_free;
  if a.person_id is null then return jsonb_build_object('ok', true, 'no_availability', true, 'slots', '[]'::jsonb); end if;
  return jsonb_build_object('ok', true, 'timezone', a.timezone, 'lengths', to_jsonb(a.lengths), 'length', p_length,
    'slots', (select coalesce(jsonb_agg(s), '[]') from (select s from dela_open_times(v_free, g.created_by, p_length, p_except) s limit 200) x));
end $$;

-- ---------- Booking ----------
create or replace function dela_meeting_hold(p_person uuid, p_side text, p jsonb) returns jsonb language plpgsql as $$
declare g gigs; v_free uuid; v_start timestamptz := (p->>'start_at')::timestamptz; v_len int := (p->>'length')::int; v_id uuid; v_att uuid; v_lock1 uuid; v_lock2 uuid; v_dup meetings;
begin
  if not dela_switch_on('meetings', p_person) then return jsonb_build_object('ok', false, 'reason', 'meetings_off'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  select * into g from gigs where id = (p->>'gig_id')::uuid;
  v_free := case when p_side = 'freelancer' then p_person else (p->>'freelancer')::uuid end;
  if g.id is null or (p_side = 'attorney' and not dela_gig_manager(p_person, g.id)) or v_free is null or not dela_gig_pair(g.id, v_free) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_has_hold(v_free) or exists (select 1 from threads t where t.gig_id = g.id and t.freelancer_person = v_free and t.blocked_at is not null) then return jsonb_build_object('ok', false, 'reason', 'not_available'); end if;
  select * into v_dup from meetings where booked_by = p_person and request_id = p->>'request_id';
  if v_dup.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_dup.id, 'status', v_dup.status, 'hold_expires_at', v_dup.hold_expires_at); end if;
  v_att := g.created_by;
  -- Both people are locked in a fixed order, so two bookings at once cannot both win the same time
  v_lock1 := least(v_att, v_free); v_lock2 := greatest(v_att, v_free);
  perform pg_advisory_xact_lock(hashtext('meet:' || v_lock1::text));
  perform pg_advisory_xact_lock(hashtext('meet:' || v_lock2::text));
  if not exists (select 1 from dela_open_times(v_free, v_att, v_len, null) s where s = v_start) then
    return jsonb_build_object('ok', false, 'reason', 'time_taken', 'next', (select coalesce(jsonb_agg(s), '[]') from (select s from dela_open_times(v_free, v_att, v_len, null) s limit 5) x));
  end if;
  insert into meetings (gig_id, attorney_person, freelancer_person, booked_by, start_at, end_at, length_min, status, hold_expires_at, request_id)
  values (g.id, v_att, v_free, p_person, v_start, v_start + make_interval(mins => v_len), v_len, 'held', now() + make_interval(mins => dela_int_setting('meeting.hold_minutes', 10)), coalesce(p->>'request_id', gen_random_uuid()::text))
  returning id into v_id;
  insert into meeting_events (meeting_id, action, actor, detail) values (v_id, 'held', p_person, jsonb_build_object('start_at', v_start));
  return jsonb_build_object('ok', true, 'id', v_id, 'status', 'held', 'hold_expires_at', now() + make_interval(mins => dela_int_setting('meeting.hold_minutes', 10)));
end $$;

-- Confirm once: notices to both, reminders, the room and the follow-up are queued. Rescheduling passes the meeting it replaces.
create or replace function dela_meeting_confirm(p_person uuid, p_meeting uuid) returns jsonb language plpgsql as $$
declare m meetings; old meetings; g gigs; h int; v_other uuid; v_title text;
begin
  select * into m from meetings where id = p_meeting for update;
  if m.id is null or m.booked_by <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if m.status = 'confirmed' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if m.status <> 'held' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if m.hold_expires_at < now() then update meetings set status = 'expired', updated_at = now() where id = m.id; return jsonb_build_object('ok', false, 'reason', 'hold_expired'); end if;
  select * into g from gigs where id = m.gig_id;
  if m.replaces is not null then
    select * into old from meetings where id = m.replaces for update;
    if old.status <> 'confirmed' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
    update meetings set status = 'rescheduled', late = old.start_at < now() + make_interval(hours => dela_int_setting('meeting.late_cancel_hours', 2)), canceled_by = p_person, updated_at = now() where id = old.id;
    insert into meeting_events (meeting_id, action, actor, detail) values (old.id, 'rescheduled', p_person, jsonb_build_object('to', m.id));
    update meetings set version = old.version + 1, consent_attorney_at = old.consent_attorney_at, consent_freelancer_at = old.consent_freelancer_at,
      room_status = old.room_status, room_ref = old.room_ref, room_url_attorney = old.room_url_attorney, room_url_freelancer = old.room_url_freelancer where id = m.id;
    perform dela_meeting_pattern(p_person);
  end if;
  update meetings set status = 'confirmed', hold_expires_at = null, updated_at = now() where id = m.id returning * into m;
  insert into meeting_events (meeting_id, action, actor, detail) values (m.id, 'confirmed', p_person, jsonb_build_object('start_at', m.start_at, 'version', m.version));
  v_title := case when m.replaces is null then 'Meeting booked' else 'Meeting moved' end;
  for v_other in select unnest(array[m.attorney_person, m.freelancer_person]) loop
    perform dela_notify(jsonb_build_object('person_id', v_other, 'side', case when v_other = m.attorney_person then 'attorney' else 'freelancer' end, 'kind', 'meeting', 'email', true, 'essential', true,
      'title', v_title || ': ' || g.title, 'body', case when m.replaces is null then 'A ' || m.length_min || '-minute meeting about "' || g.title || '" is booked. Open DELA for the time in your time zone, the calendar file and the join link.'
        else 'The meeting about "' || g.title || '" has a new time. This replaces the earlier time. Open DELA for the new time and calendar file.' end,
      'link', '/dela?tab=meetings&meeting=' || m.id::text, 'dedupe_key', 'meet:' || m.id::text || ':' || v_other::text));
  end loop;
  for h in select (x #>> '{}')::int from jsonb_array_elements(coalesce(dela_setting('meeting.reminder_hours'), '[24,1]')) x loop
    if m.start_at - make_interval(hours => h) > now() then
      perform dela_job_enqueue('meeting_tick', jsonb_build_object('meeting_id', m.id, 'kind', 'reminder', 'hours', h), m.start_at - make_interval(hours => h), 'meetrem:' || m.id::text || ':' || h, p_person);
    end if;
  end loop;
  perform dela_job_enqueue('meeting_tick', jsonb_build_object('meeting_id', m.id, 'kind', 'room'), now(), 'meetroom:' || m.id::text, p_person);
  perform dela_job_enqueue('meeting_tick', jsonb_build_object('meeting_id', m.id, 'kind', 'followup'), m.end_at, 'meetfu:' || m.id::text, p_person);
  perform dela_job_enqueue('meeting_tick', jsonb_build_object('meeting_id', m.id, 'kind', 'followup_reminder'), m.end_at + interval '1 day', 'meetfu2:' || m.id::text, p_person);
  return jsonb_build_object('ok', true, 'id', m.id, 'start_at', m.start_at);
end $$;

-- A new time for a confirmed meeting: hold the new time (replacing the old one), then confirm it. One update reaches both.
create or replace function dela_meeting_reschedule_hold(p_person uuid, p_side text, p_meeting uuid, p jsonb) returns jsonb language plpgsql as $$
declare m meetings; r jsonb;
begin
  select * into m from meetings where id = p_meeting;
  if m.id is null or not ((p_side = 'attorney' and dela_gig_manager(p_person, m.gig_id)) or (p_side = 'freelancer' and m.freelancer_person = p_person)) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if m.status <> 'confirmed' or m.start_at < now() then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  r := dela_meeting_hold(p_person, p_side, jsonb_build_object('gig_id', m.gig_id, 'freelancer', m.freelancer_person, 'start_at', p->>'start_at', 'length', coalesce(p->>'length', m.length_min::text), 'request_id', p->>'request_id'));
  if coalesce((r->>'ok')::boolean, false) then update meetings set replaces = m.id where id = (r->>'id')::uuid and replaces is null; end if;
  return r;
end $$;

-- Late cancels, late reschedules and no-shows: two in 30 days go to the Lawfecta Team
create or replace function dela_meeting_pattern(p_person uuid) returns void language plpgsql as $$
declare n int;
begin
  select count(*) into n from meetings m
  where m.updated_at > now() - make_interval(days => dela_int_setting('meeting.flag_days', 30))
    and ((m.canceled_by = p_person and m.late) or (m.status = 'no_show' and exists (select 1 from meeting_followups f where f.meeting_id = m.id and f.person_id <> p_person and not f.met)
         and not exists (select 1 from meeting_followups f where f.meeting_id = m.id and f.person_id = p_person and f.met)));
  if n >= dela_int_setting('meeting.flag_count', 2) then
    perform dela_alert('meetings', 'Late cancels or no-shows', 'A member has ' || n || ' late cancels, late reschedules or no-shows in the last ' || dela_int_setting('meeting.flag_days', 30) || ' days. See the admin Meetings and messages tab.', 'meetpat:' || p_person::text || ':' || to_char(now(), 'YYYY-MM-DD'));
  end if;
end $$;

create or replace function dela_meeting_cancel(p_person uuid, p_side text, p_meeting uuid, p_reason text) returns jsonb language plpgsql as $$
declare m meetings; g gigs; v_late boolean; who uuid;
begin
  select * into m from meetings where id = p_meeting for update;
  if m.id is null or not ((p_side = 'attorney' and dela_gig_manager(p_person, m.gig_id)) or (p_side = 'freelancer' and m.freelancer_person = p_person)) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if m.status = 'canceled' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if m.status = 'held' then update meetings set status = 'expired', updated_at = now() where id = m.id; return jsonb_build_object('ok', true); end if;
  if m.status <> 'confirmed' or m.end_at < now() then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  v_late := m.start_at < now() + make_interval(hours => dela_int_setting('meeting.late_cancel_hours', 2));
  update meetings set status = 'canceled', canceled_by = p_person, cancel_reason = left(coalesce(p_reason, ''), 500), late = v_late, updated_at = now() where id = m.id;
  insert into meeting_events (meeting_id, action, actor, detail) values (m.id, 'canceled', p_person, jsonb_build_object('late', v_late, 'reason', left(coalesce(p_reason, ''), 500)));
  select * into g from gigs where id = m.gig_id;
  for who in select unnest(array[m.attorney_person, m.freelancer_person]) loop
    perform dela_notify(jsonb_build_object('person_id', who, 'side', case when who = m.attorney_person then 'attorney' else 'freelancer' end, 'kind', 'meeting', 'email', true, 'essential', true,
      'title', 'Meeting canceled: ' || g.title, 'body', 'The meeting about "' || g.title || '" was canceled' || case when coalesce(p_reason, '') <> '' then ': ' || left(p_reason, 300) else '' end || '. You can book a new time on the gig.',
      'link', '/dela?tab=meetings&meeting=' || m.id::text, 'dedupe_key', 'meetcan:' || m.id::text || ':' || who::text));
  end loop;
  if v_late then perform dela_meeting_pattern(p_person); end if;
  return jsonb_build_object('ok', true, 'late', v_late);
end $$;

create or replace function dela_meeting_consent(p_person uuid, p_side text, p_meeting uuid, p_consent boolean) returns jsonb language plpgsql as $$
declare m meetings;
begin
  select * into m from meetings where id = p_meeting for update;
  if m.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_side = 'attorney' and dela_gig_manager(p_person, m.gig_id) then update meetings set consent_attorney_at = case when p_consent then now() end where id = m.id;
  elsif p_side = 'freelancer' and m.freelancer_person = p_person then update meetings set consent_freelancer_at = case when p_consent then now() end where id = m.id;
  else return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  insert into meeting_events (meeting_id, action, actor, detail) values (m.id, case when p_consent then 'consented' else 'consent_withdrawn' end, p_person, '{}');
  return jsonb_build_object('ok', true);
end $$;

-- After the meeting: each person says whether they met and writes a short summary. Both "met" is attendance verified (O-08 fallback).
create or replace function dela_meeting_followup(p_person uuid, p_side text, p_meeting uuid, p_met boolean, p_summary text) returns jsonb language plpgsql as $$
declare m meetings; v_n int; v_yes int;
begin
  select * into m from meetings where id = p_meeting for update;
  if m.id is null or not ((p_side = 'attorney' and dela_gig_manager(p_person, m.gig_id)) or (p_side = 'freelancer' and m.freelancer_person = p_person)) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if m.status not in ('confirmed', 'completed', 'no_show') or m.start_at > now() then return jsonb_build_object('ok', false, 'reason', 'not_yet'); end if;
  insert into meeting_followups (meeting_id, person_id, met, summary) values (m.id, case when p_side = 'attorney' then m.attorney_person else p_person end, p_met, left(coalesce(p_summary, ''), 4000))
  on conflict (meeting_id, person_id) do update set met = excluded.met, summary = excluded.summary, submitted_at = now();
  select count(*), count(*) filter (where met) into v_n, v_yes from meeting_followups where meeting_id = m.id;
  update meetings set status = case when v_n = 2 and v_yes = 0 then 'no_show' else 'completed' end,
    attendance = case when v_n = 2 and v_yes = 2 then 'verified' when v_n = 2 and v_yes = 1 then 'disputed' when v_yes >= 1 then 'evidence_received' else attendance end, updated_at = now()
  where id = m.id returning * into m;
  insert into meeting_events (meeting_id, action, actor, detail) values (m.id, 'followup', p_person, jsonb_build_object('met', p_met));
  if not p_met then perform dela_meeting_pattern(case when p_person = m.attorney_person then m.freelancer_person else m.attorney_person end); end if;
  return jsonb_build_object('ok', true, 'attendance', m.attendance, 'both_in', v_n = 2,
    'summaries', case when v_n = 2 then (select jsonb_agg(jsonb_build_object('who', case when f.person_id = m.attorney_person then 'Attorney' else 'Freelancer' end, 'met', f.met, 'summary', f.summary)) from meeting_followups f where f.meeting_id = m.id) end,
    'gig_title', (select title from gigs where id = m.gig_id));
end $$;

create or replace function dela_meeting_next_steps(p_meeting uuid, p_steps jsonb) returns void language sql as $$
  update meetings set next_steps = coalesce(p_steps, '[]'), updated_at = now() where id = p_meeting
$$;

-- The room: the api creates it with the meeting provider and saves the links (only the two people see their own link)
create or replace function dela_meeting_room(p_meeting uuid, p_status text, p_ref text, p_att text, p_free text) returns void language sql as $$
  update meetings set room_status = p_status, room_ref = coalesce(p_ref, room_ref), room_url_attorney = coalesce(p_att, room_url_attorney), room_url_freelancer = coalesce(p_free, room_url_freelancer), updated_at = now() where id = p_meeting
$$;

create or replace function dela_meeting_for_job(p_meeting uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('id', m.id, 'status', m.status, 'start_at', m.start_at, 'end_at', m.end_at, 'length_min', m.length_min, 'gig_title', g.title, 'room_status', m.room_status,
    'attorney_person', m.attorney_person, 'freelancer_person', m.freelancer_person,
    'followups', (select count(*) from meeting_followups f where f.meeting_id = m.id))
  from meetings m join gigs g on g.id = m.gig_id where m.id = p_meeting
$$;

-- The worker: reminders and the follow-up request (the room is made in the api)
create or replace function dela_meeting_tick(p jsonb) returns jsonb language plpgsql as $$
declare m meetings; g gigs; who uuid; v_kind text := p->>'kind';
begin
  select * into m from meetings where id = (p->>'meeting_id')::uuid;
  if m.id is null or m.status <> 'confirmed' and not (v_kind like 'followup%' and m.status in ('confirmed', 'completed')) then return jsonb_build_object('ok', true, 'skipped', true); end if;
  select * into g from gigs where id = m.gig_id;
  for who in select unnest(array[m.attorney_person, m.freelancer_person]) loop
    if v_kind = 'reminder' then
      perform dela_notify(jsonb_build_object('person_id', who, 'side', case when who = m.attorney_person then 'attorney' else 'freelancer' end, 'kind', 'meeting', 'email', true,
        'title', 'Meeting in ' || (p->>'hours') || case when (p->>'hours') = '1' then ' hour' else ' hours' end || ': ' || g.title,
        'body', 'Your meeting about "' || g.title || '" starts soon. Open DELA to join; the room opens ' || dela_int_setting('meeting.join_early_minutes', 15) || ' minutes before.',
        'link', '/dela?tab=meetings&meeting=' || m.id::text, 'dedupe_key', 'meetrem:' || m.id::text || ':' || (p->>'hours') || ':' || who::text));
    elsif v_kind in ('followup', 'followup_reminder') and not exists (select 1 from meeting_followups f where f.meeting_id = m.id and f.person_id = who) then
      perform dela_notify(jsonb_build_object('person_id', who, 'side', case when who = m.attorney_person then 'attorney' else 'freelancer' end, 'kind', 'meeting', 'email', true,
        'title', 'Did your meeting happen? ' || g.title, 'body', 'Tell DELA whether you met about "' || g.title || '" and write a short summary of what you agreed. DELA suggests next steps from both summaries.',
        'link', '/dela?tab=meetings&meeting=' || m.id::text, 'dedupe_key', 'meetfu:' || v_kind || ':' || m.id::text || ':' || who::text));
    end if;
  end loop;
  return jsonb_build_object('ok', true);
end $$;

-- What one person sees: their meetings (upcoming first), with their own join link only inside the join window
create or replace function dela_meetings(p_person uuid, p_side text, p_gig uuid, p_meeting uuid) returns jsonb language plpgsql as $$
declare v_early int := dela_int_setting('meeting.join_early_minutes', 15);
begin
  update meetings set status = 'expired', updated_at = now() where status = 'held' and hold_expires_at < now() and (attorney_person = p_person or freelancer_person = p_person);
  return jsonb_build_object('ok', true, 'on', dela_switch_on('meetings', p_person), 'confirm_hours', dela_int_setting('meeting.confirm_hours', 48),
    'meetings', (select coalesce(jsonb_agg(x order by (x->>'start_at')), '[]') from (
      select jsonb_build_object('id', m.id, 'gig_id', m.gig_id, 'gig_title', g.title, 'start_at', m.start_at, 'end_at', m.end_at, 'length_min', m.length_min, 'status', m.status,
        'version', m.version, 'late', m.late, 'cancel_reason', m.cancel_reason, 'room_status', m.room_status, 'attendance', m.attendance, 'next_steps', m.next_steps,
        'freelancer_person', m.freelancer_person,
        'other_name', case when p_side = 'attorney' then (select coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name) from people pe left join member_profiles mp on mp.person_id = pe.id and mp.side = 'freelancer' where pe.id = m.freelancer_person)
          else (select coalesce(nullif(mp.body->>'firm_name', ''), pe.display_name) from people pe left join member_profiles mp on mp.person_id = pe.id and mp.side = 'attorney' where pe.id = m.attorney_person) end,
        'my_consent', case when p_side = 'attorney' then m.consent_attorney_at is not null else m.consent_freelancer_at is not null end,
        'both_consent', m.consent_attorney_at is not null and m.consent_freelancer_at is not null,
        'join_url', case when m.status = 'confirmed' and now() between m.start_at - make_interval(mins => v_early) and m.end_at + interval '30 minutes' and m.room_status = 'ready'
          then case when p_side = 'attorney' then m.room_url_attorney else m.room_url_freelancer end end,
        'join_opens_at', m.start_at - make_interval(mins => v_early),
        'my_followup', (select jsonb_build_object('met', f.met, 'summary', f.summary) from meeting_followups f where f.meeting_id = m.id and f.person_id = (case when p_side = 'attorney' then m.attorney_person else p_person end)),
        'their_followup_in', exists (select 1 from meeting_followups f where f.meeting_id = m.id and f.person_id <> (case when p_side = 'attorney' then m.attorney_person else p_person end))) x
      from meetings m join gigs g on g.id = m.gig_id
      where m.status in ('confirmed', 'completed', 'canceled', 'no_show', 'held')
        and ((p_side = 'freelancer' and m.freelancer_person = p_person) or (p_side = 'attorney' and dela_gig_manager(p_person, m.gig_id)))
        and (p_gig is null or m.gig_id = p_gig) and (p_meeting is null or m.id = p_meeting)
        and not (m.status = 'held' and m.booked_by <> p_person)
      order by m.start_at limit 100) t));
end $$;

-- ---------- Admin ----------
create or replace function dela_admin_meetings(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  return jsonb_build_object(
    'switches', (select jsonb_object_agg(key, state) from feature_switches where key in ('meetings', 'gig_chat', 'chat_assistant', 'calendar_sync', 'meeting_recording', 'consultation_export_grant')),
    'provider_ready', false,
    'counts', jsonb_build_object(
      'booked_30d', (select count(*) from meetings where created_at > now() - interval '30 days' and status in ('confirmed', 'completed', 'no_show', 'canceled', 'rescheduled')),
      'attended_30d', (select count(*) from meetings where start_at > now() - interval '30 days' and attendance = 'verified'),
      'canceled_30d', (select count(*) from meetings where updated_at > now() - interval '30 days' and status = 'canceled'),
      'late_30d', (select count(*) from meetings where updated_at > now() - interval '30 days' and late),
      'no_show_30d', (select count(*) from meetings where updated_at > now() - interval '30 days' and status = 'no_show'),
      'messages_30d', (select count(*) from messages where created_at > now() - interval '30 days'),
      'threads', (select count(*) from threads)),
    'upcoming', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'gig_title', g.title, 'start_at', m.start_at, 'length_min', m.length_min, 'room_status', m.room_status,
        'attorney', pa.display_name, 'freelancer', pf.display_name) order by m.start_at), '[]')
      from meetings m join gigs g on g.id = m.gig_id join people pa on pa.id = m.attorney_person join people pf on pf.id = m.freelancer_person where m.status = 'confirmed' and m.end_at > now()),
    'reports', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'thread_id', r.thread_id, 'gig_title', g.title, 'reporter', pe.display_name, 'reason', r.reason, 'created_at', r.created_at,
        'message', (select left(m.body, 400) from messages m where m.id = r.message_id), 'blocked', t.blocked_at is not null) order by r.created_at), '[]')
      from thread_reports r join threads t on t.id = r.thread_id join gigs g on g.id = t.gig_id join people pe on pe.id = r.reporter where r.status = 'open'),
    'patterns', (select coalesce(jsonb_agg(jsonb_build_object('name', pe.display_name, 'bd_member_id', pe.bd_member_id, 'late', x.late_n, 'no_shows', x.ns) order by x.late_n + x.ns desc), '[]') from (
      select p.id, (select count(*) from meetings m where m.canceled_by = p.id and m.late and m.updated_at > now() - make_interval(days => dela_int_setting('meeting.flag_days', 30))) late_n,
        (select count(*) from meetings m where (m.attorney_person = p.id or m.freelancer_person = p.id) and m.status = 'no_show' and m.updated_at > now() - make_interval(days => dela_int_setting('meeting.flag_days', 30))) ns
      from people p) x join people pe on pe.id = x.id where x.late_n + x.ns >= dela_int_setting('meeting.flag_count', 2)));
end $$;

create or replace function dela_admin_report_close(p_actor uuid, p_report uuid) returns jsonb language plpgsql as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  update thread_reports set status = 'closed', closed_by = p_actor where id = p_report and status = 'open';
  perform dela_audit('staff', p_actor, 'report_closed', 'thread_report', p_report::text, '{}');
  return jsonb_build_object('ok', true);
end $$;

-- Releasing a held message when the team clears it (extends the Step 4 decision)
create or replace function dela_admin_conduct_decide(p_actor uuid, p_flag uuid, p_clear boolean, p_note text) returns jsonb language plpgsql as $$
declare f conduct_flags;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  select * into f from conduct_flags where id = p_flag for update;
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if f.status <> 'open' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update conduct_flags set status = case when p_clear then 'cleared' else 'actioned' end, decided_by = p_actor, decided_at = now(), note = left(coalesce(p_note, ''), 500) where id = p_flag;
  if p_clear then
    if f.object_type = 'proposal' then update proposals set status = 'sent', updated_at = now() where id = f.object_id and status = 'held'; perform dela_proposal_notify(f.object_id);
    elsif f.object_type = 'question' then update gig_questions set status = 'open' where id = f.object_id and status = 'held'; perform dela_question_notify(f.object_id);
    elsif f.object_type = 'answer' then update gig_questions set status = 'answered' where id = f.object_id and status = 'held';
    elsif f.object_type = 'invitation' then update gig_invitations set status = 'sent' where id = f.object_id and status = 'held'; perform dela_gig_invite_notify(f.object_id);
    elsif f.object_type = 'message' then
      if exists (select 1 from messages where id = f.object_id and status = 'held') then update messages set status = 'sent' where id = f.object_id; perform dela_message_notify(f.object_id); end if;
    end if;
  else
    if f.object_type = 'question' or f.object_type = 'answer' then update gig_questions set status = 'hidden' where id = f.object_id; end if;
    if f.object_type = 'message' then update messages set status = 'removed', removed_at = now() where id = f.object_id and status = 'held'; end if;
    perform dela_notify(jsonb_build_object('person_id', f.person_id, 'kind', 'conduct', 'email', true, 'essential', true,
      'title', 'A message was not delivered', 'body', 'Something you sent on a gig looked like a plan to work or pay outside Lawfecta, which the terms do not allow, so it was not delivered. Keep all work, messages and payment on Lawfecta. Contact the Lawfecta Team if you think this is wrong.',
      'link', '/dela', 'dedupe_key', 'conduct:' || p_flag::text));
  end if;
  perform dela_audit('staff', p_actor, case when p_clear then 'conduct_cleared' else 'conduct_actioned' end, f.object_type, f.object_id::text, jsonb_build_object('flag', p_flag));
  return jsonb_build_object('ok', true);
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

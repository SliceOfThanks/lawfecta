-- Step 73: work for the firm's own team, with no gig (Stacey 2026-11-20: "Yes, build it"; the largest open item of the
-- build handoff, section 5 B). An editor or the administrator of a Library assigns an approved document, or some of
-- its steps, to a person on that Library's team. No proposal, no agreement, no money.
-- The person assigned answers for themselves (accept or decline), ticks the steps as they do them, and submits. The
-- person who assigned reviews: accept, or ask for changes with a note. Either can write a note at any time.
-- Each of these is its own recorded event; saving, accepting, submitting and accepting the result are never the same thing.
-- Behind the switch team_assignments. Additive: one switch, one setting, three tables, functions.

insert into feature_switches (key, label, gate) values ('team_assignments', 'Team work: assign an approved document to someone on your own team, with no gig and no payment (step 73)', 'Stacey asked for it 2026-11-20; on for the access list on the site after the release')
on conflict (key) do nothing;
insert into settings (key, value, label, section, unit, status, source, note) values
  ('team.assignments_open_max', '200'::jsonb, 'Open team assignments one firm may have at a time', 'Team work', 'assignments', 'C', 'Claude 2026-11-20 (step 73)', 'Finished, declined and canceled ones do not count.')
on conflict (key) do nothing;

create table if not exists team_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  playbook_id uuid not null references playbooks(id),
  playbook_version int not null,
  step_nos int[],                                   -- null: every step
  title text not null check (length(title) between 1 and 200),
  assigned_by uuid not null references people(id),
  assignee uuid not null references people(id),
  due_date date,
  note text not null default '',
  status text not null default 'assigned' check (status in ('assigned', 'accepted', 'submitted', 'changes_requested', 'done', 'declined', 'canceled')),
  request_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz
);
alter table team_assignments enable row level security;
create index if not exists team_assignments_assignee on team_assignments (assignee, status);
create index if not exists team_assignments_org on team_assignments (org_id, status);
create unique index if not exists team_assignments_request on team_assignments (assigned_by, request_id) where request_id <> '';

create table if not exists team_assignment_steps (
  assignment_id uuid not null references team_assignments(id),
  step_no int not null,
  done_by uuid not null references people(id),
  done_at timestamptz not null default now(),
  primary key (assignment_id, step_no)
);
alter table team_assignment_steps enable row level security;

-- What happened, in order. Never changed.
create table if not exists team_assignment_events (
  id bigint generated always as identity primary key,
  assignment_id uuid not null references team_assignments(id),
  actor uuid not null references people(id),
  action text not null,
  note text not null default '',
  at timestamptz not null default now()
);
alter table team_assignment_events enable row level security;
create index if not exists team_assignment_events_a on team_assignment_events (assignment_id, id);
create or replace function team_assignment_events_keep() returns trigger language plpgsql set search_path = public, extensions, pg_temp as $$
begin raise exception 'team_assignment_events is append-only'; end $$;
revoke all on function team_assignment_events_keep() from public, anon, authenticated;
drop trigger if exists team_assignment_events_keep on team_assignment_events;
create trigger team_assignment_events_keep before update or delete on team_assignment_events for each row execute function team_assignment_events_keep();

-- The caller's part in one assignment: 'assignee', 'assigner' (the person who assigned it, or an administrator of that Library), or ''
create or replace function dela_team_role(p_person uuid, p_id uuid) returns text language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce((select case when a.assignee = p_person then 'assignee'
      when a.assigned_by = p_person and dela_pb_role(p_person, a.org_id) is not null then 'assigner'
      when dela_pb_rank(dela_pb_role(p_person, a.org_id)) >= 4 then 'assigner' else '' end
    from team_assignments a where a.id = p_id), '')
$$;
revoke all on function dela_team_role(uuid, uuid) from public, anon, authenticated;

create or replace function dela_team_event(p_id uuid, p_actor uuid, p_action text, p_note text) returns void language sql set search_path = public, extensions, pg_temp as $$
  insert into team_assignment_events (assignment_id, actor, action, note) values (p_id, p_actor, p_action, left(coalesce(p_note, ''), 2000));
  update team_assignments set updated_at = now() where id = p_id;
$$;
revoke all on function dela_team_event(uuid, uuid, text, text) from public, anon, authenticated;

create or replace function dela_team_tell(p_to uuid, p_id uuid, p_title text, p_body text, p_key text) returns void language sql set search_path = public, extensions, pg_temp as $$
  select dela_notify(jsonb_build_object('person_id', p_to, 'side', 'attorney', 'kind', 'engagement', 'email', true, 'title', p_title, 'body', p_body,
    'link', '/dela?tab=teamwork&assignment=' || p_id, 'dedupe_key', 'team:' || p_id || ':' || p_key))
$$;
revoke all on function dela_team_tell(uuid, uuid, text, text, text) from public, anon, authenticated;

-- The people of a Library's team the caller may assign work to: everyone on it except themselves
create or replace function dela_team_people(p_person uuid, p_org uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  if not dela_switch_on('team_assignments', p_person) then return jsonb_build_object('ok', true, 'on', false, 'people', '[]'::jsonb); end if;
  if dela_pb_rank(dela_pb_role(p_person, p_org)) < 3 then return jsonb_build_object('ok', true, 'on', true, 'can_assign', false, 'people', '[]'::jsonb); end if;
  return jsonb_build_object('ok', true, 'on', true, 'can_assign', true, 'people', (select coalesce(jsonb_agg(jsonb_build_object('person_id', x.id, 'name', x.name, 'role', x.role) order by x.name), '[]') from (
    select pe.id, pe.display_name as name, 'administrator' as role from organizations o join people pe on pe.id = o.owner_person_id where o.id = p_org
    union select pe.id, pe.display_name, r.role from library_roles r join people pe on pe.id = r.person_id where r.org_id = p_org and r.removed_at is null) x
    where x.id <> p_person and dela_pb_role(x.id, p_org) is not null));
end $$;
revoke all on function dela_team_people(uuid, uuid) from public, anon, authenticated;

-- p: playbook_id, assignee, step_nos (array or null), due_date, note, request_id
create or replace function dela_team_assign(p_person uuid, p jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare x playbooks; v_to uuid := (p->>'assignee')::uuid; v_req text := left(coalesce(p->>'request_id', ''), 80); v uuid; v_nos int[]; v_open int; v_due date;
begin
  if not dela_switch_on('team_assignments', p_person) then return jsonb_build_object('ok', false, 'reason', 'feature_off'); end if;
  select * into x from playbooks where id = (p->>'playbook_id')::uuid;
  if x.id is null or dela_pb_role(p_person, x.org_id) is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_pb_rank(dela_pb_role(p_person, x.org_id)) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if x.approved_version is null or x.status in ('trash', 'archived', 'deleted') then return jsonb_build_object('ok', false, 'reason', 'playbook_not_approved'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  if v_to is null or v_to = p_person or dela_pb_role(v_to, x.org_id) is null then return jsonb_build_object('ok', false, 'reason', 'not_on_team'); end if;
  if v_req <> '' then
    select id into v from team_assignments where assigned_by = p_person and request_id = v_req;
    if v is not null then return jsonb_build_object('ok', true, 'id', v, 'duplicate', true); end if;
  end if;
  select count(*) into v_open from team_assignments where org_id = x.org_id and status in ('assigned', 'accepted', 'submitted', 'changes_requested');
  if v_open >= dela_int_setting('team.assignments_open_max', 200) then return jsonb_build_object('ok', false, 'reason', 'too_many_open', 'limit', dela_int_setting('team.assignments_open_max', 200)); end if;
  if jsonb_typeof(p->'step_nos') = 'array' and jsonb_array_length(p->'step_nos') > 0 then
    v_nos := array(select distinct (e #>> '{}')::int from jsonb_array_elements(p->'step_nos') e where (e #>> '{}') ~ '^[0-9]{1,4}$' order by 1);
  end if;
  v_due := case when coalesce(p->>'due_date', '') ~ '^\d{4}-\d{2}-\d{2}$' then (p->>'due_date')::date end;
  insert into team_assignments (org_id, playbook_id, playbook_version, step_nos, title, assigned_by, assignee, due_date, note, request_id)
  values (x.org_id, x.id, x.approved_version, v_nos, x.title, p_person, v_to, v_due, left(btrim(coalesce(p->>'note', '')), 2000), v_req) returning id into v;
  perform dela_team_event(v, p_person, 'assigned', p->>'note');
  perform dela_team_tell(v_to, v, 'Work was assigned to you', coalesce((select display_name from people where id = p_person), 'A colleague') || ' assigned you "' || x.title || '"'
    || coalesce(', due ' || to_char(v_due, 'FMMonth FMDD'), '') || '. Open it to read the steps and accept it.', 'assigned');
  return jsonb_build_object('ok', true, 'id', v);
end $$;
revoke all on function dela_team_assign(uuid, jsonb) from public, anon, authenticated;

create or replace function dela_team_row(a team_assignments, p_person uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('id', a.id, 'title', a.title, 'status', a.status, 'due_date', a.due_date, 'created_at', a.created_at, 'updated_at', a.updated_at,
    'playbook_id', a.playbook_id, 'version', a.playbook_version, 'step_nos', to_jsonb(a.step_nos),
    'steps_done', (select count(*) from team_assignment_steps s where s.assignment_id = a.id),
    'mine', a.assignee = p_person,
    'assignee', jsonb_build_object('person_id', a.assignee, 'name', (select display_name from people where id = a.assignee)),
    'assigned_by', jsonb_build_object('person_id', a.assigned_by, 'name', (select display_name from people where id = a.assigned_by)))
$$;
revoke all on function dela_team_row(team_assignments, uuid) from public, anon, authenticated;

-- Everything the caller has a part in: assigned to them, and assigned by them (an administrator sees the whole firm's)
create or replace function dela_team_list(p_person uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  if not dela_switch_on('team_assignments', p_person) then return jsonb_build_object('ok', true, 'on', false); end if;
  return jsonb_build_object('ok', true, 'on', true,
    'mine', (select coalesce(jsonb_agg(dela_team_row(a, p_person) order by (a.status in ('done', 'declined', 'canceled')), a.due_date nulls last, a.created_at desc), '[]')
      from (select * from team_assignments where assignee = p_person order by created_at desc limit 100) a),
    'given', (select coalesce(jsonb_agg(dela_team_row(a, p_person) order by (a.status <> 'submitted'), (a.status in ('done', 'declined', 'canceled')), a.due_date nulls last, a.created_at desc), '[]')
      from (select * from team_assignments t where t.assignee <> p_person and (t.assigned_by = p_person or dela_pb_rank(dela_pb_role(p_person, t.org_id)) >= 4) order by created_at desc limit 200) a));
end $$;
revoke all on function dela_team_list(uuid) from public, anon, authenticated;

-- One assignment with the text of the version it was assigned from; the api cuts the steps
create or replace function dela_team_get(p_person uuid, p_id uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare a team_assignments; v_role text := dela_team_role(p_person, p_id);
begin
  if not dela_switch_on('team_assignments', p_person) then return jsonb_build_object('ok', false, 'reason', 'feature_off'); end if;
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into a from team_assignments where id = p_id;
  return jsonb_build_object('ok', true, 'role', v_role, 'assignment', dela_team_row(a, p_person) || jsonb_build_object('note', a.note),
    'body', (select v.body from playbook_versions v where v.playbook_id = a.playbook_id and v.version = a.playbook_version),
    'current_version', (select approved_version from playbooks where id = a.playbook_id),
    'done', (select coalesce(jsonb_agg(s.step_no order by s.step_no), '[]') from team_assignment_steps s where s.assignment_id = a.id),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('action', e.action, 'note', e.note, 'at', e.at, 'by', (select display_name from people where id = e.actor), 'mine', e.actor = p_person) order by e.id), '[]')
      from team_assignment_events e where e.assignment_id = a.id));
end $$;
revoke all on function dela_team_get(uuid, uuid) from public, anon, authenticated;

-- One call for every change of state. p_action: accept, decline, note, step, unstep, submit, approve, changes, cancel
create or replace function dela_team_act(p_person uuid, p_id uuid, p_action text, p_note text, p_step int default null) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare a team_assignments; v_role text := dela_team_role(p_person, p_id); v_note text := left(btrim(coalesce(p_note, '')), 2000); v_other uuid; v_me text;
begin
  if not dela_switch_on('team_assignments', p_person) then return jsonb_build_object('ok', false, 'reason', 'feature_off'); end if;
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into a from team_assignments where id = p_id for update;
  v_other := case when v_role = 'assignee' then a.assigned_by else a.assignee end;
  v_me := coalesce((select display_name from people where id = p_person), 'Your colleague');
  if p_action = 'note' then
    if length(v_note) < 2 then return jsonb_build_object('ok', false, 'reason', 'note_needed'); end if;
    perform dela_team_event(a.id, p_person, 'note', v_note);
    perform dela_team_tell(v_other, a.id, 'A note on "' || left(a.title, 80) || '"', v_me || ' wrote: ' || left(v_note, 300), 'note:' || to_char(now(), 'YYYYMMDDHH24MISS'));
    return jsonb_build_object('ok', true, 'status', a.status);
  end if;
  if p_action in ('accept', 'decline') then
    if v_role <> 'assignee' then return jsonb_build_object('ok', false, 'reason', 'assignee_only'); end if;
    if a.status = (case p_action when 'accept' then 'accepted' else 'declined' end) then return jsonb_build_object('ok', true, 'duplicate', true, 'status', a.status); end if;
    if a.status <> 'assigned' then return jsonb_build_object('ok', false, 'reason', 'not_now', 'status', a.status); end if;
    if p_action = 'decline' and length(v_note) < 2 then return jsonb_build_object('ok', false, 'reason', 'note_needed'); end if;
    update team_assignments set status = case p_action when 'accept' then 'accepted' else 'declined' end, responded_at = now() where id = a.id;
    perform dela_team_event(a.id, p_person, case p_action when 'accept' then 'accepted' else 'declined' end, v_note);
    perform dela_team_tell(a.assigned_by, a.id, case p_action when 'accept' then v_me || ' accepted the work' else v_me || ' declined the work' end,
      '"' || a.title || '"' || coalesce(nullif('. Note: ' || left(v_note, 300), '. Note: '), '.'), p_action);
    return jsonb_build_object('ok', true, 'status', case p_action when 'accept' then 'accepted' else 'declined' end);
  end if;
  if p_action in ('step', 'unstep') then
    if v_role <> 'assignee' then return jsonb_build_object('ok', false, 'reason', 'assignee_only'); end if;
    if a.status not in ('accepted', 'changes_requested') then return jsonb_build_object('ok', false, 'reason', 'not_now', 'status', a.status); end if;
    if p_step is null or p_step < 1 or (a.step_nos is not null and not (p_step = any(a.step_nos))) then return jsonb_build_object('ok', false, 'reason', 'not_your_step'); end if;
    if p_action = 'step' then insert into team_assignment_steps (assignment_id, step_no, done_by) values (a.id, p_step, p_person) on conflict do nothing;
    else delete from team_assignment_steps where assignment_id = a.id and step_no = p_step; end if;
    update team_assignments set updated_at = now() where id = a.id;
    return jsonb_build_object('ok', true, 'status', a.status);
  end if;
  if p_action = 'submit' then
    if v_role <> 'assignee' then return jsonb_build_object('ok', false, 'reason', 'assignee_only'); end if;
    if a.status = 'submitted' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', a.status); end if;
    if a.status not in ('accepted', 'changes_requested') then return jsonb_build_object('ok', false, 'reason', 'not_now', 'status', a.status); end if;
    update team_assignments set status = 'submitted', submitted_at = now() where id = a.id;
    perform dela_team_event(a.id, p_person, 'submitted', v_note);
    perform dela_team_tell(a.assigned_by, a.id, v_me || ' submitted the work for your review', '"' || a.title || '"' || coalesce(nullif('. Note: ' || left(v_note, 300), '. Note: '), '.'), 'submitted:' || to_char(now(), 'YYYYMMDDHH24MI'));
    return jsonb_build_object('ok', true, 'status', 'submitted');
  end if;
  if p_action in ('approve', 'changes', 'cancel') then
    if v_role <> 'assigner' then return jsonb_build_object('ok', false, 'reason', 'assigner_only'); end if;
    if p_action = 'cancel' then
      if a.status = 'canceled' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', a.status); end if;
      if a.status in ('done', 'declined') then return jsonb_build_object('ok', false, 'reason', 'not_now', 'status', a.status); end if;
      update team_assignments set status = 'canceled' where id = a.id;
      perform dela_team_event(a.id, p_person, 'canceled', v_note);
      perform dela_team_tell(a.assignee, a.id, 'An assignment was canceled', '"' || a.title || '" is no longer assigned to you.' || coalesce(nullif(' Note: ' || left(v_note, 300), ' Note: '), ''), 'canceled');
      return jsonb_build_object('ok', true, 'status', 'canceled');
    end if;
    if a.status = (case p_action when 'approve' then 'done' else 'changes_requested' end) then return jsonb_build_object('ok', true, 'duplicate', true, 'status', a.status); end if;
    if a.status <> 'submitted' then return jsonb_build_object('ok', false, 'reason', 'not_submitted', 'status', a.status); end if;
    if p_action = 'changes' and length(v_note) < 2 then return jsonb_build_object('ok', false, 'reason', 'note_needed'); end if;
    update team_assignments set status = case p_action when 'approve' then 'done' else 'changes_requested' end, reviewed_at = now() where id = a.id;
    perform dela_team_event(a.id, p_person, case p_action when 'approve' then 'approved' else 'changes_requested' end, v_note);
    perform dela_team_tell(a.assignee, a.id, case p_action when 'approve' then 'Your work was accepted' else 'Changes were requested' end,
      '"' || a.title || '"' || coalesce(nullif('. Note: ' || left(v_note, 300), '. Note: '), '.'), p_action || ':' || to_char(now(), 'YYYYMMDDHH24MI'));
    return jsonb_build_object('ok', true, 'status', case p_action when 'approve' then 'done' else 'changes_requested' end);
  end if;
  return jsonb_build_object('ok', false, 'reason', 'bad_action');
end $$;
revoke all on function dela_team_act(uuid, uuid, text, text, int) from public, anon, authenticated;

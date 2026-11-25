-- Step 90b (Stacey 2026-11-25: the move itself, and "for attorneys we move to the new website I want to generate them an
-- example playbook in their account"). The owner starts the move in the admin area; a job makes the members on this
-- website a few at a time, keeps the pair of member numbers (old site, new site), and gives every moved attorney one
-- example document that the owner approved first. Nothing is ever deleted on either website, and no welcome email is
-- asked for. Additive: four tables, functions.

-- The pair of member numbers, and what happened for each member the move tried
create table if not exists move_links (
  old_id bigint primary key,
  new_id bigint,
  email_key text not null default '',
  how text not null default '' check (how in ('', 'created', 'linked')),
  status text not null default 'done' check (status in ('done', 'failed')),
  problem text not null default '',
  attempts int not null default 1,
  example_playbook uuid references playbooks(id),
  moved_at timestamptz not null default now()
);
create index if not exists move_links_new on move_links (new_id);

-- One row: where the move stands
create table if not exists move_run (
  id int primary key check (id = 1),
  status text not null default 'idle' check (status in ('idle', 'running', 'paused', 'done')),
  run int not null default 0,
  only_ids bigint[],
  turn int not null default 0,
  started_at timestamptz, finished_at timestamptz,
  started_by uuid references people(id)
);
insert into move_run (id) values (1) on conflict (id) do nothing;

-- Example documents the owner reads and approves once. One of them is the one moved attorneys get.
create table if not exists move_examples (
  key text primary key check (key ~ '^[a-z0-9_]{2,40}$'),
  title text not null,
  about text not null default '',
  body jsonb not null,
  sort int not null default 0,
  approved_by uuid references people(id), approved_at timestamptz,
  given boolean not null default false
);
alter table move_links enable row level security;
alter table move_run enable row level security;
alter table move_examples enable row level security;

-- Three examples, drafted by Claude 2026-11-25. None is approved: the owner reads each one first. They name no client,
-- no firm and no person; every step is marked as DELA's suggestion until the attorney confirms it.
insert into move_examples (key, title, about, sort, body) values
('client_intake', 'New client intake', 'From the first call to a signed engagement letter. Fits most practice areas.', 1, $ex${
  "type": "sop", "title": "New client intake", "lifecycle": "INT", "owner_role": "Paralegal", "roles": ["Attorney", "Paralegal"],
  "purpose": "Take in a new client the same way every time, so nothing is missed between the first call and the signed engagement letter.",
  "scope": "Every prospective client, in every practice area of the firm. It ends when the engagement letter is signed and the matter is opened. It does not cover the conflict check itself or billing setup.",
  "trigger": "A prospective client calls, emails or fills in the contact form.",
  "before_you_start": ["Access to the firm's case management system", "The firm's intake questions", "The current engagement letter template"],
  "steps": [
    {"text": "Record the caller's name, contact details and the kind of matter in the intake form.", "role": "Paralegal", "raci": {"Paralegal": "R,A"}, "basis": "proposed"},
    {"text": "Run a conflict check on every party named and record the result.", "role": "Paralegal", "raci": {"Paralegal": "R,A", "Attorney": "I"}, "basis": "proposed"},
    {"text": "Schedule the consultation and send the confirmation with what to bring.", "role": "Paralegal", "raci": {"Paralegal": "R,A"}, "basis": "proposed"},
    {"text": "Decide whether the firm takes the matter and on what terms.", "role": "Attorney", "raci": {"Attorney": "R,A", "Paralegal": "I"}, "attorney_decides": true, "basis": "proposed"},
    {"text": "Prepare the engagement letter from the template with the terms the attorney set.", "role": "Paralegal", "raci": {"Paralegal": "R", "Attorney": "A"}, "basis": "proposed"},
    {"text": "Send the engagement letter for signature and follow up after 2 business days if it is not signed.", "role": "Paralegal", "raci": {"Paralegal": "R,A"}, "basis": "proposed"},
    {"text": "Open the matter in the case management system once the signed letter is back.", "role": "Paralegal", "raci": {"Paralegal": "R,A", "Attorney": "I"}, "basis": "proposed"}
  ],
  "decisions": [
    {"if": "the conflict check shows a possible conflict", "then": "Stop and send the result to the attorney before scheduling anything.", "attorney_decides": true, "escalate_to": "Attorney"},
    {"if": "the caller asks for legal advice during intake", "then": "Say that the attorney answers legal questions at the consultation, and note the question for the attorney.", "attorney_decides": false, "escalate_to": "Attorney"}
  ],
  "timing": "Answer a new inquiry within 1 business day. Send the engagement letter within 1 business day of the attorney's decision.",
  "quality_check": ["The conflict check result is recorded before the consultation", "The engagement letter matches the terms the attorney set", "The signed letter is saved in the matter"],
  "done_when": "The engagement letter is signed and the matter is open in the case management system.",
  "saved_in": "The case management system, in the new matter",
  "related_links": []
}$ex$::jsonb),
('conflict_check', 'Run a conflict check', 'Checking a new matter against the firm''s clients and parties before any work starts.', 2, $ex${
  "type": "sop", "title": "Run a conflict check", "lifecycle": "INT", "owner_role": "Paralegal", "roles": ["Attorney", "Paralegal"],
  "purpose": "Find conflicts of interest before the firm speaks with a prospective client about their matter.",
  "scope": "Every new matter and every new party added to an open matter. It does not decide whether a conflict can be waived; the attorney decides that.",
  "trigger": "A prospective client asks for a consultation, or a new party is named in an open matter.",
  "before_you_start": ["Access to the firm's case management system", "The names of every party, including businesses and their owners"],
  "steps": [
    {"text": "List every person and business named in the new matter, with other names they use.", "role": "Paralegal", "raci": {"Paralegal": "R,A"}, "basis": "proposed"},
    {"text": "Search each name in the case management system, in current and closed matters.", "role": "Paralegal", "raci": {"Paralegal": "R,A"}, "basis": "proposed"},
    {"text": "Record every match with the matter it belongs to and the party's role in it.", "role": "Paralegal", "raci": {"Paralegal": "R,A", "Attorney": "I"}, "basis": "proposed"},
    {"text": "Send the list of matches, or a note that there are none, to the attorney.", "role": "Paralegal", "raci": {"Paralegal": "R,A", "Attorney": "I"}, "basis": "proposed"},
    {"text": "Decide whether the firm can take the matter, needs a waiver, or must decline.", "role": "Attorney", "raci": {"Attorney": "R,A", "Paralegal": "I"}, "attorney_decides": true, "basis": "proposed"},
    {"text": "Save the search results and the attorney's decision in the matter notes.", "role": "Paralegal", "raci": {"Paralegal": "R,A"}, "basis": "proposed"}
  ],
  "decisions": [
    {"if": "a name matches a current or former client", "then": "Stop. Do not schedule a consultation until the attorney has decided.", "attorney_decides": true, "escalate_to": "Attorney"}
  ],
  "timing": "Finish the search within 1 business day of the request, and before any consultation.",
  "quality_check": ["Every party was searched, including other names they use", "The attorney's decision is recorded with its date"],
  "done_when": "The search results and the attorney's decision are saved in the matter notes.",
  "saved_in": "The case management system, in the matter notes",
  "related_links": []
}$ex$::jsonb),
('monthly_billing', 'Monthly billing review', 'Reviewing time entries and sending invoices once a month.', 3, $ex${
  "type": "sop", "title": "Monthly billing review", "lifecycle": "BIL", "owner_role": "Paralegal", "roles": ["Attorney", "Paralegal"],
  "purpose": "Send accurate invoices every month, after the attorney has reviewed the time on each matter.",
  "scope": "Every open matter billed by the hour. It does not cover trust account transfers or collections on unpaid invoices.",
  "trigger": "The first business day of the month.",
  "before_you_start": ["Access to the firm's billing system", "Last month's time entries for every open matter"],
  "steps": [
    {"text": "Run the report of unbilled time and costs for last month.", "role": "Paralegal", "raci": {"Paralegal": "R,A"}, "basis": "proposed"},
    {"text": "Check each time entry for a date, a matter and a description a client can understand.", "role": "Paralegal", "raci": {"Paralegal": "R,A"}, "basis": "proposed"},
    {"text": "Send the draft invoices to the attorney for review.", "role": "Paralegal", "raci": {"Paralegal": "R,A", "Attorney": "I"}, "basis": "proposed"},
    {"text": "Approve each draft invoice, or write it down or change it.", "role": "Attorney", "raci": {"Attorney": "R,A", "Paralegal": "I"}, "attorney_decides": true, "basis": "proposed"},
    {"text": "Make the attorney's changes and finalize the invoices.", "role": "Paralegal", "raci": {"Paralegal": "R", "Attorney": "A"}, "basis": "proposed"},
    {"text": "Send each invoice to the client and record the date sent.", "role": "Paralegal", "raci": {"Paralegal": "R,A"}, "basis": "proposed"}
  ],
  "decisions": [
    {"if": "a time entry looks too long for the work described", "then": "Flag it for the attorney. Do not change it.", "attorney_decides": true, "escalate_to": "Attorney"}
  ],
  "timing": "Draft invoices reach the attorney by the 3rd business day. Invoices go out by the 7th business day.",
  "quality_check": ["Every invoice was approved by the attorney before it was sent", "No entry is missing its matter or description"],
  "done_when": "Every approved invoice is sent and its sent date is recorded.",
  "saved_in": "The billing system, on each matter",
  "related_links": []
}$ex$::jsonb)
on conflict (key) do nothing;

-- A picture address that many members share is the old site's stand-in picture, not a member's own
create or replace function dela_move_own_photo(p_url text) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(p_url, '') ~* '^https://[^[:space:]?#]+[.](jpg|jpeg|png|webp)$' and (select count(*) from move_members m where m.rec->>'image_main_file' = p_url) <= 3
$$;

create or replace function dela_move_examples(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, '{}');
  return jsonb_build_object('ok', true, 'examples', coalesce((select jsonb_agg(jsonb_build_object('key', e.key, 'title', e.title, 'about', e.about, 'approved', e.approved_at is not null, 'approved_at', e.approved_at, 'given', e.given,
    'steps', jsonb_array_length(coalesce(e.body->'steps', '[]')), 'body', e.body) order by e.sort, e.key) from move_examples e), '[]'));
end $$;

create or replace function dela_move_example_approve(p_actor uuid, p_key text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, '{}');
  if not dela_switch_on('member_move', p_actor) then return jsonb_build_object('ok', false, 'reason', 'move_off'); end if;
  if not exists (select 1 from move_examples where key = p_key) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  update move_examples set approved_by = p_actor, approved_at = now() where key = p_key and approved_at is null;
  perform dela_audit('staff', p_actor, 'move_example_approved', 'move_example', p_key, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

-- Which example moved attorneys get. Only an approved one; an empty key means none.
create or replace function dela_move_example_give(p_actor uuid, p_key text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_key text := nullif(btrim(coalesce(p_key, '')), '');
begin
  perform dela_require_staff(p_actor, '{}');
  if not dela_switch_on('member_move', p_actor) then return jsonb_build_object('ok', false, 'reason', 'move_off'); end if;
  if v_key is not null and not exists (select 1 from move_examples where key = v_key and approved_at is not null) then return jsonb_build_object('ok', false, 'reason', 'example_not_approved'); end if;
  update move_examples set given = (key = v_key) where true;
  perform dela_audit('staff', p_actor, 'move_example_given', 'move_example', coalesce(v_key, ''), '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

-- Who is still to do: members the preview says move or are already here, without a finished pair, tried fewer than 3 times
create or replace function dela_move_todo() returns table (old_id bigint, decision text) language sql stable set search_path = public, extensions, pg_temp as $$
  select r.old_id, r.decision from dela_move_rows() r
  where r.decision in ('move', 'on_new')
    and not exists (select 1 from move_links l where l.old_id = r.old_id and (l.status = 'done' or l.attempts >= 3))
$$;

-- Start the move. p_ids: up to 3 old member numbers for "Try with 3 members first"; empty for everyone. For everyone,
-- p_confirm must be the number of members the page showed, so a stale page cannot start a different move.
create or replace function dela_move_start(p_actor uuid, p_confirm int, p_ids bigint[]) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare r move_run; v_todo int; v_ids bigint[] := case when coalesce(array_length(p_ids, 1), 0) > 0 then p_ids end;
begin
  perform dela_require_staff(p_actor, '{}');
  if not dela_switch_on('member_move', p_actor) then return jsonb_build_object('ok', false, 'reason', 'move_off'); end if;
  if not exists (select 1 from move_state where id = 1 and status = 'read') then return jsonb_build_object('ok', false, 'reason', 'not_read_yet'); end if;
  select * into r from move_run where id = 1 for update;
  if r.status = 'running' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if v_ids is not null then
    if array_length(v_ids, 1) > 3 then return jsonb_build_object('ok', false, 'reason', 'three_at_most'); end if;
    select count(*) into v_todo from dela_move_todo() t where t.old_id = any(v_ids);
    if v_todo <> array_length(v_ids, 1) then return jsonb_build_object('ok', false, 'reason', 'not_movable', 'movable', v_todo); end if;
  else
    select count(*) into v_todo from dela_move_todo();
    if v_todo = 0 then return jsonb_build_object('ok', false, 'reason', 'nothing_to_move'); end if;
    if coalesce(p_confirm, -1) <> v_todo then return jsonb_build_object('ok', false, 'reason', 'count_changed', 'count', v_todo); end if;
  end if;
  update move_run set status = 'running', run = r.run + 1, only_ids = v_ids, turn = 0, started_at = now(), finished_at = null, started_by = p_actor where id = 1;
  perform dela_job_enqueue('move_create', jsonb_build_object('run', r.run + 1, 'turn', 0), now(), 'move_create:' || (r.run + 1) || ':0', null);
  perform dela_audit('staff', p_actor, 'move_started', 'move', (r.run + 1)::text, jsonb_build_object('members', v_todo, 'try', v_ids is not null));
  return jsonb_build_object('ok', true, 'run', r.run + 1, 'members', v_todo);
end $$;

create or replace function dela_move_pause(p_actor uuid, p_on boolean) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare r move_run;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into r from move_run where id = 1 for update;
  if coalesce(p_on, true) then
    if r.status <> 'running' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', r.status); end if;
    update move_run set status = 'paused' where id = 1;
  else
    if r.status <> 'paused' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', r.status); end if;
    if not dela_switch_on('member_move', p_actor) then return jsonb_build_object('ok', false, 'reason', 'move_off'); end if;
    update move_run set status = 'running', turn = r.turn + 1 where id = 1;
    perform dela_job_enqueue('move_create', jsonb_build_object('run', r.run, 'turn', r.turn + 1), now(), 'move_create:' || r.run || ':' || (r.turn + 1), null);
  end if;
  perform dela_audit('staff', p_actor, case when coalesce(p_on, true) then 'move_paused' else 'move_resumed' end, 'move', r.run::text, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

-- The next members for the job, with everything it sends to the website already worked out
create or replace function dela_move_next(p_run int, p_n int) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare r move_run;
begin
  select * into r from move_run where id = 1;
  if r.run <> p_run or r.status <> 'running' then return jsonb_build_object('go', false); end if;
  return jsonb_build_object('go', true, 'rows', coalesce((select jsonb_agg(x.j) from (
    select jsonb_build_object('old_id', m.old_id, 'decision', t.decision, 'email', btrim(m.email), 'rec', m.rec, 'active', m.active,
      'new_plan', pm.new_plan, 'side', (dela_plan_for_bd(pm.new_plan)).side, 'plan_code', (dela_plan_for_bd(pm.new_plan)).code,
      'new_id', (select n.new_id from move_new_members n where n.email_key = m.email_key order by n.new_id limit 1),
      'profession_id', (select b.bd_id from move_category_map cm join bd_categories b on b.key = cm.new_key where cm.old_kind = 'p' and cm.old_id = m.profession_id),
      'services', coalesce((select jsonb_agg(distinct b.bd_id) from move_category_map cm join bd_categories b on b.key = cm.new_key where cm.old_kind = 's' and cm.old_id = any(m.services)), '[]'),
      'photo', case when dela_move_own_photo(m.rec->>'image_main_file') then m.rec->>'image_main_file' end) j
    from dela_move_todo() t join move_members m on m.old_id = t.old_id left join move_plan_map pm on pm.old_plan = m.plan_id
    where r.only_ids is null or m.old_id = any(r.only_ids)
    order by m.old_id limit greatest(least(coalesce(p_n, 15), 40), 1)) x), '[]'));
end $$;

-- What happened for one member
create or replace function dela_move_result(p_old bigint, p_ok boolean, p_new bigint, p_how text, p_problem text) returns void language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  insert into move_links (old_id, new_id, email_key, how, status, problem, attempts)
    select p_old, case when p_ok then p_new end, m.email_key, case when p_ok then p_how else '' end, case when p_ok then 'done' else 'failed' end, left(coalesce(p_problem, ''), 300), 1 from move_members m where m.old_id = p_old
  on conflict (old_id) do update set new_id = coalesce(excluded.new_id, move_links.new_id), how = case when excluded.status = 'done' then excluded.how else move_links.how end, status = excluded.status,
    problem = excluded.problem, attempts = move_links.attempts + 1, moved_at = now();
  -- The new site's members as DELA knows them, so a second member with the same email is linked, not made again
  if p_ok and p_new is not null then
    insert into move_new_members (new_id, email_key, plan_id) select p_new, m.email_key, coalesce(pm.new_plan, 0) from move_members m left join move_plan_map pm on pm.old_plan = m.plan_id where m.old_id = p_old on conflict (new_id) do nothing;
  end if;
end $$;

-- An attorney's workspace made ahead of their first login: the person, the attorney side on the mapped plan, their firm.
-- First login finds the same person by the website member number.
create or replace function dela_move_person(p_new bigint, p_name text, p_email text, p_plan text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_person uuid; v_org uuid;
begin
  if p_new is null or not exists (select 1 from plans where code = p_plan and side = 'attorney') then return jsonb_build_object('ok', false, 'reason', 'not_an_attorney_plan'); end if;
  insert into people (bd_member_id, display_name, email) values (p_new, left(coalesce(nullif(btrim(p_name), ''), 'Member ' || p_new), 200), left(coalesce(p_email, ''), 320)) on conflict (bd_member_id) do nothing;
  select id into v_person from people where bd_member_id = p_new;
  if not exists (select 1 from side_profiles where person_id = v_person and side = 'attorney') then perform dela_ensure_side(v_person, 'attorney', p_plan, 'bd'); end if;
  select org_id into v_org from side_profiles where person_id = v_person and side = 'attorney';
  return jsonb_build_object('ok', true, 'person_id', v_person, 'org_id', v_org, 'documents', (select count(*) from playbooks where org_id = v_org and status <> 'deleted'));
end $$;

create or replace function dela_move_example_body() returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('key', e.key, 'body', e.body) from move_examples e where e.given and e.approved_at is not null limit 1
$$;
create or replace function dela_move_example_done(p_old bigint, p_playbook uuid) returns void language sql set search_path = public, extensions, pg_temp as $$
  update move_links set example_playbook = p_playbook where old_id = p_old and example_playbook is null
$$;
create or replace function dela_move_turn(p_run int, p_turn int, p_more boolean) returns void language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if p_more then update move_run set turn = p_turn where id = 1 and run = p_run and status = 'running';
  else update move_run set status = 'done', finished_at = now() where id = 1 and run = p_run and status = 'running'; end if;
end $$;

-- The website refused in a way that would repeat for everyone (its key may not create members): the move waits
create or replace function dela_move_halt(p_run int) returns void language sql set search_path = public, extensions, pg_temp as $$
  update move_run set status = 'paused' where id = 1 and run = p_run and status = 'running'
$$;
revoke all on function dela_move_halt(int) from public, anon, authenticated;

-- The page: where the move stands, what failed, the examples, and the list for the "set your password" email
create or replace function dela_move_run_view(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare r move_run;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into r from move_run where id = 1;
  return jsonb_build_object('ok', true,
    'run', jsonb_build_object('status', r.status, 'run', r.run, 'trying', r.only_ids is not null, 'started_at', r.started_at, 'finished_at', r.finished_at),
    'todo', (select count(*) from dela_move_todo()),
    'created', (select count(*) from move_links where status = 'done' and how = 'created'),
    'linked', (select count(*) from move_links where status = 'done' and how = 'linked'),
    'failed', (select count(*) from move_links where status = 'failed'),
    'examples_given', (select count(*) from move_links where example_playbook is not null),
    'logged_in', (select count(*) from move_links l join people pe on pe.bd_member_id = l.new_id where l.status = 'done' and exists (select 1 from sessions ss where ss.person_id = pe.id)),
    'failures', coalesce((select jsonb_agg(jsonb_build_object('old_id', l.old_id, 'email', m.email, 'problem', l.problem, 'attempts', l.attempts) order by l.old_id) from (select * from move_links where status = 'failed' order by old_id limit 60) l join move_members m on m.old_id = l.old_id), '[]'),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('old_id', l.old_id, 'new_id', l.new_id, 'email', m.email, 'name', btrim(m.first_name || ' ' || m.last_name), 'how', l.how, 'example', l.example_playbook is not null) order by l.moved_at desc)
      from (select * from move_links where status = 'done' order by moved_at desc limit 12) l join move_members m on m.old_id = l.old_id), '[]'));
end $$;

create or replace function dela_move_moved(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, '{}');
  return jsonb_build_object('ok', true, 'rows', coalesce((select jsonb_agg(jsonb_build_object('old_id', l.old_id, 'new_id', l.new_id, 'email', btrim(m.email), 'first_name', m.first_name, 'last_name', m.last_name, 'how', l.how,
      'new_plan', coalesce(np.name, ''), 'logged_in', exists (select 1 from people pe join sessions ss on ss.person_id = pe.id where pe.bd_member_id = l.new_id)) order by l.old_id)
    from move_links l join move_members m on m.old_id = l.old_id left join move_plan_map pm on pm.old_plan = m.plan_id left join move_new_plans np on np.plan_id = pm.new_plan where l.status = 'done'), '[]'));
end $$;

-- A failed member can be tried again: the count of attempts starts over
create or replace function dela_move_retry(p_actor uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_n int;
begin
  perform dela_require_staff(p_actor, '{}');
  update move_links set attempts = 0 where status = 'failed';
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'members', v_n);
end $$;

-- A document that came from an example says so on its page
create or replace function dela_move_is_example(p_playbook uuid) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select exists (select 1 from playbooks where id = p_playbook and source_ref = 'lawfecta_example')
$$;

revoke all on function dela_move_own_photo(text) from public, anon, authenticated;
revoke all on function dela_move_examples(uuid) from public, anon, authenticated;
revoke all on function dela_move_example_approve(uuid, text) from public, anon, authenticated;
revoke all on function dela_move_example_give(uuid, text) from public, anon, authenticated;
revoke all on function dela_move_todo() from public, anon, authenticated;
revoke all on function dela_move_start(uuid, int, bigint[]) from public, anon, authenticated;
revoke all on function dela_move_pause(uuid, boolean) from public, anon, authenticated;
revoke all on function dela_move_next(int, int) from public, anon, authenticated;
revoke all on function dela_move_result(bigint, boolean, bigint, text, text) from public, anon, authenticated;
revoke all on function dela_move_person(bigint, text, text, text) from public, anon, authenticated;
revoke all on function dela_move_example_body() from public, anon, authenticated;
revoke all on function dela_move_example_done(bigint, uuid) from public, anon, authenticated;
revoke all on function dela_move_turn(int, int, boolean) from public, anon, authenticated;
revoke all on function dela_move_run_view(uuid) from public, anon, authenticated;
revoke all on function dela_move_moved(uuid) from public, anon, authenticated;
revoke all on function dela_move_retry(uuid) from public, anon, authenticated;
revoke all on function dela_move_is_example(uuid) from public, anon, authenticated;

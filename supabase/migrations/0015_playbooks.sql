-- Step 2: the playbook library (attorney side), with Import from Scribe.
-- Briefs: docs/briefs/step-2-playbooks.md and docs/briefs/step-2-recorder-beta.md. Built with the suggested answers
-- (Stacey 2026-11-03: "keep building, hold anything that needs me"). Numbers still to decide are settings marked Open.
-- Additive only.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('playbooks.review_months', '12', 'Months until an approved playbook is due for review', 'Playbooks', 'months', 'O', 'Step 2 brief question 7 (suggested)', ''),
  ('playbooks.guests', '3', 'Commenters and viewers a library can invite without a seat', 'Playbooks', 'people', 'O', 'Step 2 brief question 5 (suggested)', 'Editing needs a seat (att.team_seats).'),
  ('playbooks.count_archived', 'true', 'Archived playbooks count toward the plan''s playbook limit', 'Playbooks', '', 'O', 'Step 2 brief question 6 (suggested)', 'So archiving is not a way around the limit. Playbooks in the trash do not count.'),
  ('playbooks.trash_days', '30', 'Days a deleted playbook stays in the trash', 'Playbooks', 'days', 'O', 'Step 2 brief question 6 (suggested)', ''),
  ('playbooks.suggest_missing', 'true', 'DELA can suggest playbooks a firm is missing', 'Playbooks', '', 'O', 'Step 2 brief question 8 (suggested)', 'A suggestion list only.'),
  ('exports.own_library_counts', 'false', 'Exports of your own library count against the monthly export allowance', 'Playbooks', '', 'O', 'Step 2 brief question 4 (suggested: no)', 'The allowance still applies to marketplace and engagement playbooks later.'),
  ('ai.credits.playbook', '3', 'Credits for one AI playbook draft or change', 'Files and AI', 'credits', 'O', 'Claude', 'Only on Lawfecta''s key.'),
  ('import.max_steps', '150', 'Most steps one imported guide can have', 'Playbooks', 'steps', 'R', 'Claude', ''),
  ('import.image_hosts', '["colony-recorder.s3.amazonaws.com","colony-recorder.s3.us-west-1.amazonaws.com","images.scribehow.com","scribehow.com","www.scribehow.com","scribe-assets.s3.amazonaws.com"]', 'Web addresses DELA may fetch screenshots from when importing a Scribe guide', 'Playbooks', '', 'O', 'Claude; confirm with a real Scribe export', 'Only these exact hosts, over https.')
on conflict (key) do nothing;

insert into feature_switches (key, label, gate) values
  ('playbook_library', 'Playbook library (attorneys)', 'Step 2 tested'),
  ('scribe_import', 'Import a guide from Scribe', 'Step 2 tested, a real Scribe export checked')
on conflict (key) do nothing;

-- ---------- Tables ----------

-- Who may do what in a firm's library. The firm owner is always the administrator and is not listed here.
create table library_roles (
  org_id uuid not null references organizations(id),
  person_id uuid not null references people(id),
  role text not null check (role in ('administrator', 'editor', 'commenter', 'viewer')),
  guest boolean not null default false,
  added_by uuid not null references people(id),
  added_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (org_id, person_id)
);

create table playbooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  title text not null check (length(title) between 1 and 200),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'archived', 'trash', 'deleted')),
  current_version int not null default 1,
  approved_version int,
  completeness int not null default 0 check (completeness between 0 and 100),
  missing jsonb not null default '[]',
  practice_area text not null default '',
  source text not null default 'manual' check (source in ('manual', 'ai', 'file', 'scribe', 'recorder')),
  source_ref text not null default '',
  request_id text not null,
  next_review_at date,
  reminded_for date,
  created_by uuid not null references people(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status_before_trash text,
  trashed_at timestamptz,
  unique (org_id, request_id)
);
create index playbooks_org on playbooks (org_id, status);

-- Every saved version, kept for ever. A restore makes a new version.
create table playbook_versions (
  playbook_id uuid not null references playbooks(id),
  version int not null,
  body jsonb not null,
  note text not null default '',
  created_by uuid not null references people(id),
  created_at timestamptz not null default now(),
  primary key (playbook_id, version)
);
create trigger playbook_versions_append_only before update or delete on playbook_versions for each row execute function dela_no_change();

-- The activity log: every event on a playbook, never editable
create table playbook_activity (
  id bigserial primary key,
  playbook_id uuid not null references playbooks(id),
  at timestamptz not null default now(),
  actor uuid references people(id),
  action text not null,
  version int,
  detail jsonb not null default '{}'
);
create index playbook_activity_pb on playbook_activity (playbook_id, id desc);
create trigger playbook_activity_append_only before update or delete on playbook_activity for each row execute function dela_no_change();

-- Proposed changes: from the AI in chat (a whole new body) or from a team member's comment (new text for one part)
create table playbook_suggestions (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references playbooks(id),
  kind text not null check (kind in ('ai', 'comment')),
  base_version int not null,
  part text not null default '',
  proposed jsonb not null,
  note text not null default '',
  removes_review boolean not null default false,
  status text not null default 'open' check (status in ('open', 'accepted', 'rejected', 'stale')),
  author uuid not null references people(id),
  created_at timestamptz not null default now(),
  decided_by uuid references people(id),
  decided_at timestamptz,
  decision_note text not null default ''
);
create index playbook_suggestions_open on playbook_suggestions (playbook_id) where status = 'open';

create table playbook_comments (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references playbooks(id),
  part text not null default '',
  step int,
  body text not null check (length(body) between 1 and 4000),
  suggestion_id uuid references playbook_suggestions(id),
  author uuid not null references people(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references people(id)
);

-- Templates, forms and checklists kept with a playbook (part 10). Linked by file group, so new versions follow.
create table playbook_files (
  playbook_id uuid not null references playbooks(id),
  file_group uuid not null,
  added_by uuid not null references people(id),
  added_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (playbook_id, file_group)
);

-- A guide brought in from Scribe (later also a recording), waiting on the review screen before Build my playbook
create table playbook_imports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  person_id uuid not null references people(id),
  source text not null check (source in ('scribe', 'recorder', 'file')),
  title text not null default '',
  steps jsonb not null default '[]',
  status text not null default 'review' check (status in ('review', 'built', 'discarded')),
  playbook_id uuid references playbooks(id),
  request_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, request_id)
);

do $$
declare t text;
begin
  foreach t in array array['library_roles', 'playbooks', 'playbook_versions', 'playbook_activity', 'playbook_suggestions', 'playbook_comments', 'playbook_files', 'playbook_imports'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end $$;

-- ---------- Roles and access ----------

create or replace function dela_pb_role(p_person uuid, p_org uuid) returns text language sql stable as $$
  select case
    when o.id is null or o.status <> 'active' then null
    when o.owner_person_id = p_person then 'administrator'
    else (select r.role from library_roles r join org_members m on m.org_id = r.org_id and m.person_id = r.person_id and m.status = 'active'
          where r.org_id = p_org and r.person_id = p_person and r.removed_at is null) end
  from organizations o where o.id = p_org and o.kind in ('attorney_personal', 'firm')
$$;

create or replace function dela_pb_rank(p_role text) returns int language sql immutable as $$
  select case p_role when 'administrator' then 4 when 'editor' then 3 when 'commenter' then 2 when 'viewer' then 1 else 0 end
$$;

-- The libraries this person can open on the attorney side: their own, and firms that invited them
create or replace function dela_pb_libraries(p_person uuid) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('org_id', o.id, 'name', coalesce(nullif(o.name, ''), 'Library'), 'role', dela_pb_role(p_person, o.id),
      'mine', o.owner_person_id = p_person) order by (o.owner_person_id = p_person) desc, o.name), '[]')
  from organizations o
  where o.status = 'active' and o.kind in ('attorney_personal', 'firm') and dela_pb_role(p_person, o.id) is not null
    and (o.owner_person_id <> p_person or exists (select 1 from side_profiles s where s.person_id = p_person and s.side = 'attorney' and s.org_id = o.id and s.status <> 'closed'))
$$;

-- Playbook limit for a library, from its owner's plan (att.playbooks_saved). null means no cap.
create or replace function dela_pb_limit(p_org uuid) returns int language sql stable as $$
  select case when not coalesce(pf.enabled, true) then 0 else pf.quota_limit end
  from organizations o
  left join plan_features pf on pf.feature_key = 'att.playbooks_saved' and pf.plan_version_id = dela_effective_version(o.owner_person_id, 'attorney')
  where o.id = p_org
$$;

create or replace function dela_pb_count(p_org uuid) returns int language sql stable as $$
  select count(*)::int from playbooks where org_id = p_org and status not in ('trash', 'deleted')
    and (status <> 'archived' or coalesce((dela_setting('playbooks.count_archived') #>> '{}')::boolean, true))
$$;

create or replace function dela_pb_log(p_pb uuid, p_actor uuid, p_action text, p_version int, p_detail jsonb) returns void language sql as $$
  insert into playbook_activity (playbook_id, actor, action, version, detail) values (p_pb, p_actor, p_action, p_version, coalesce(p_detail, '{}'))
$$;

-- Notice to the library's administrators (owner and any named administrators), except the person who acted
create or replace function dela_pb_notify_admins(p_org uuid, p_actor uuid, p_title text, p_body text, p_key text) returns void language plpgsql as $$
declare r record;
begin
  for r in select o.owner_person_id as person_id from organizations o where o.id = p_org
           union select person_id from library_roles where org_id = p_org and role = 'administrator' and removed_at is null loop
    if r.person_id is distinct from p_actor then
      perform dela_notify(jsonb_build_object('person_id', r.person_id, 'side', 'attorney', 'kind', 'playbook', 'title', p_title, 'body', p_body,
        'link', '/dela?tab=library', 'dedupe_key', p_key || ':' || r.person_id));
    end if;
  end loop;
end $$;

-- ---------- Library and playbooks ----------

create or replace function dela_pb_list(p_person uuid, p_org uuid) returns jsonb language plpgsql stable as $$
declare v_role text := dela_pb_role(p_person, p_org);
begin
  if v_role is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'role', v_role, 'on', dela_switch_on('playbook_library', p_person), 'scribe_on', dela_switch_on('scribe_import', p_person),
    'count', dela_pb_count(p_org), 'limit', dela_pb_limit(p_org),
    'playbooks', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'status', p.status, 'version', p.current_version,
        'approved_version', p.approved_version, 'completeness', p.completeness, 'practice_area', p.practice_area, 'source', p.source,
        'next_review_at', p.next_review_at, 'updated_at', p.updated_at, 'trashed_at', p.trashed_at,
        'open_suggestions', (select count(*) from playbook_suggestions s where s.playbook_id = p.id and s.status = 'open')) order by p.updated_at desc), '[]')
      from playbooks p where p.org_id = p_org and p.status <> 'deleted' and (p.status <> 'trash' or dela_pb_rank(v_role) >= 4)),
    'imports', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'title', i.title, 'source', i.source, 'steps', jsonb_array_length(i.steps), 'created_at', i.created_at) order by i.created_at desc), '[]')
      from playbook_imports i where i.org_id = p_org and i.status = 'review' and (i.person_id = p_person or dela_pb_rank(v_role) >= 4)));
end $$;

create or replace function dela_pb_get(p_person uuid, p_id uuid) returns jsonb language plpgsql stable as $$
declare p playbooks; v_role text; v playbook_versions;
begin
  select * into p from playbooks where id = p_id;
  if p.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_pb_role(p_person, p.org_id);
  if v_role is null or p.status = 'deleted' or (p.status = 'trash' and dela_pb_rank(v_role) < 4) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into v from playbook_versions where playbook_id = p.id and version = p.current_version;
  return jsonb_build_object('ok', true, 'role', v_role,
    'playbook', jsonb_build_object('id', p.id, 'org_id', p.org_id, 'title', p.title, 'status', p.status, 'version', p.current_version, 'approved_version', p.approved_version,
      'completeness', p.completeness, 'missing', p.missing, 'source', p.source, 'next_review_at', p.next_review_at, 'created_at', p.created_at, 'updated_at', p.updated_at,
      'administrator', (select display_name from people where id = (select owner_person_id from organizations where id = p.org_id))),
    'body', v.body,
    'versions', (select coalesce(jsonb_agg(jsonb_build_object('version', x.version, 'note', x.note, 'by', pe.display_name, 'at', x.created_at,
        'approved', x.version = p.approved_version) order by x.version desc), '[]') from playbook_versions x join people pe on pe.id = x.created_by where x.playbook_id = p.id),
    'suggestions', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'kind', s.kind, 'part', s.part, 'proposed', s.proposed, 'note', s.note, 'base_version', s.base_version,
        'removes_review', s.removes_review, 'by', pe.display_name, 'at', s.created_at) order by s.created_at), '[]')
      from playbook_suggestions s join people pe on pe.id = s.author where s.playbook_id = p.id and s.status = 'open'),
    'comments', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'part', c.part, 'step', c.step, 'body', c.body, 'by', pe.display_name, 'at', c.created_at,
        'resolved', c.resolved_at is not null, 'suggestion_id', c.suggestion_id) order by c.created_at), '[]')
      from playbook_comments c join people pe on pe.id = c.author where c.playbook_id = p.id),
    'activity', (select coalesce(jsonb_agg(jsonb_build_object('action', a.action, 'version', a.version, 'by', pe.display_name, 'at', a.at, 'detail', a.detail) order by a.id desc), '[]')
      from (select * from playbook_activity where playbook_id = p.id order by id desc limit 100) a left join people pe on pe.id = a.actor),
    'files', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'ext', f.ext, 'status', f.status)), '[]')
      from playbook_files pf join files f on f.group_id = pf.file_group and f.is_current and f.status in ('ready', 'held')
      where pf.playbook_id = p.id and pf.removed_at is null));
end $$;

-- p: person_id, org_id, request_id, title, body, completeness, missing, practice_area, source, source_ref, note
create or replace function dela_pb_create(p jsonb) returns jsonb language plpgsql as $$
declare
  v_person uuid := (p->>'person_id')::uuid; v_org uuid := (p->>'org_id')::uuid; v_req text := left(coalesce(p->>'request_id', ''), 80);
  v_role text; v_limit int; v_count int; x playbooks; v_src text := coalesce(nullif(p->>'source', ''), 'manual');
begin
  if not dela_switch_on('playbook_library', v_person) then return jsonb_build_object('ok', false, 'reason', 'library_off'); end if;
  v_role := dela_pb_role(v_person, v_org);
  if dela_pb_rank(v_role) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if v_req = '' or coalesce(btrim(p->>'title'), '') = '' or jsonb_typeof(p->'body') <> 'object' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  select * into x from playbooks where org_id = v_org and request_id = v_req;
  if x.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', x.id); end if;
  if dela_has_hold(v_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  -- One new playbook at a time per library decides who gets the last place
  perform pg_advisory_xact_lock(hashtextextended('playbooks:' || v_org::text, 0));
  v_limit := dela_pb_limit(v_org);
  v_count := dela_pb_count(v_org);
  if v_limit is not null and v_count >= v_limit then return jsonb_build_object('ok', false, 'reason', 'playbook_limit', 'count', v_count, 'limit', v_limit); end if;
  insert into playbooks (org_id, title, completeness, missing, practice_area, source, source_ref, request_id, created_by)
  values (v_org, left(btrim(p->>'title'), 200), least(greatest(coalesce((p->>'completeness')::int, 0), 0), 100), coalesce(p->'missing', '[]'),
          left(coalesce(p->>'practice_area', ''), 100), v_src, left(coalesce(p->>'source_ref', ''), 200), v_req, v_person)
  returning * into x;
  insert into playbook_versions (playbook_id, version, body, note, created_by) values (x.id, 1, p->'body', left(coalesce(p->>'note', ''), 300), v_person);
  perform dela_pb_log(x.id, v_person, case when v_src = 'manual' then 'created' else 'created_' || v_src end, 1, jsonb_build_object('source', v_src));
  perform dela_audit('member', v_person, 'playbook_created', 'playbook', x.id::text, jsonb_build_object('source', v_src));
  return jsonb_build_object('ok', true, 'duplicate', false, 'id', x.id);
end $$;

-- Saving a change makes a new version. A save based on an older version is refused, so nothing is overwritten silently.
-- p: person_id, id, base_version, title, body, completeness, missing, practice_area, note, action (edited, ai_change, restored)
create or replace function dela_pb_save(p jsonb) returns jsonb language plpgsql as $$
declare v_person uuid := (p->>'person_id')::uuid; x playbooks; v_role text; v_new int;
begin
  select * into x from playbooks where id = (p->>'id')::uuid for update;
  if x.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_pb_role(v_person, x.org_id);
  if dela_pb_rank(v_role) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if x.status in ('trash', 'archived', 'deleted') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if jsonb_typeof(p->'body') <> 'object' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if (p->>'base_version')::int is distinct from x.current_version then
    return jsonb_build_object('ok', false, 'reason', 'changed', 'current_version', x.current_version);
  end if;
  v_new := x.current_version + 1;
  insert into playbook_versions (playbook_id, version, body, note, created_by) values (x.id, v_new, p->'body', left(coalesce(p->>'note', ''), 300), v_person);
  update playbooks set current_version = v_new, title = coalesce(nullif(left(btrim(p->>'title'), 200), ''), title),
    completeness = least(greatest(coalesce((p->>'completeness')::int, completeness), 0), 100), missing = coalesce(p->'missing', missing),
    practice_area = coalesce(left(p->>'practice_area', 100), practice_area),
    -- A changed playbook needs approving again; the last approved version stays readable
    status = case when status in ('approved', 'in_review') then 'draft' else status end, updated_at = now()
  where id = x.id;
  -- Open AI suggestions made from the old version can no longer be applied as they are
  update playbook_suggestions set status = 'stale', decided_at = now() where playbook_id = x.id and status = 'open' and kind = 'ai' and base_version < v_new;
  perform dela_pb_log(x.id, v_person, coalesce(nullif(p->>'action', ''), 'edited'), v_new, jsonb_build_object('note', left(coalesce(p->>'note', ''), 300)));
  return jsonb_build_object('ok', true, 'version', v_new);
end $$;

-- submit, approve, archive, unarchive, trash, restore
create or replace function dela_pb_status(p_person uuid, p_id uuid, p_action text) returns jsonb language plpgsql as $$
declare x playbooks; v_role text; v_limit int; v_count int;
begin
  select * into x from playbooks where id = p_id for update;
  if x.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_pb_role(p_person, x.org_id);
  if v_role is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_action = 'submit' then
    if dela_pb_rank(v_role) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
    if x.status <> 'draft' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    update playbooks set status = 'in_review', updated_at = now() where id = x.id;
    perform dela_pb_notify_admins(x.org_id, p_person, 'A playbook is ready for your review', '"' || x.title || '" was sent for approval.', 'pbreview:' || x.id || ':' || x.current_version);
  elsif p_action = 'approve' then
    if dela_pb_rank(v_role) < 4 then return jsonb_build_object('ok', false, 'reason', 'administrator_only'); end if;
    if x.status not in ('draft', 'in_review') then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    if x.completeness < 100 or jsonb_array_length(x.missing) > 0 then return jsonb_build_object('ok', false, 'reason', 'not_complete', 'missing', x.missing); end if;
    update playbooks set status = 'approved', approved_version = current_version, updated_at = now(), reminded_for = null,
      next_review_at = (now() at time zone dela_tz())::date + make_interval(months => dela_int_setting('playbooks.review_months', 12)) where id = x.id;
  elsif p_action in ('archive', 'trash') then
    if dela_pb_rank(v_role) < 4 then return jsonb_build_object('ok', false, 'reason', 'administrator_only'); end if;
    if x.status = (case p_action when 'archive' then 'archived' else 'trash' end) then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    update playbooks set status = case p_action when 'archive' then 'archived' else 'trash' end,
      status_before_trash = case when p_action = 'trash' then x.status else status_before_trash end,
      trashed_at = case when p_action = 'trash' then now() else trashed_at end, updated_at = now() where id = x.id;
  elsif p_action in ('unarchive', 'restore') then
    if dela_pb_rank(v_role) < 4 then return jsonb_build_object('ok', false, 'reason', 'administrator_only'); end if;
    if x.status <> (case p_action when 'unarchive' then 'archived' else 'trash' end) then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    perform pg_advisory_xact_lock(hashtextextended('playbooks:' || x.org_id::text, 0));
    v_limit := dela_pb_limit(x.org_id);
    v_count := dela_pb_count(x.org_id);
    -- Bringing one back from the trash, or from the archive when archived ones do not count, takes a place
    if v_limit is not null and (p_action = 'restore' or not coalesce((dela_setting('playbooks.count_archived') #>> '{}')::boolean, true)) and v_count >= v_limit then
      return jsonb_build_object('ok', false, 'reason', 'playbook_limit', 'count', v_count, 'limit', v_limit);
    end if;
    update playbooks set status = case when p_action = 'restore' then coalesce(case when x.status_before_trash = 'archived' then 'archived' end, 'draft') else 'draft' end,
      trashed_at = null, updated_at = now() where id = x.id;
  else
    return jsonb_build_object('ok', false, 'reason', 'bad_action');
  end if;
  perform dela_pb_log(x.id, p_person, case p_action when 'submit' then 'sent_for_review' when 'approve' then 'approved' when 'archive' then 'archived'
    when 'unarchive' then 'unarchived' when 'trash' then 'deleted' else 'restored_from_trash' end, x.current_version, '{}');
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_pb_version(p_person uuid, p_id uuid, p_version int) returns jsonb language sql stable as $$
  select case when dela_pb_role(p_person, p.org_id) is null then null else
    (select jsonb_build_object('version', v.version, 'body', v.body, 'note', v.note, 'at', v.created_at) from playbook_versions v where v.playbook_id = p.id and v.version = p_version) end
  from playbooks p where p.id = p_id
$$;

-- p: person_id, id, kind (ai or comment), base_version, part, proposed, note, removes_review, comment (text for a comment suggestion)
create or replace function dela_pb_suggest(p jsonb) returns jsonb language plpgsql as $$
declare v_person uuid := (p->>'person_id')::uuid; x playbooks; v_role text; s uuid; c uuid;
begin
  select * into x from playbooks where id = (p->>'id')::uuid;
  if x.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_pb_role(v_person, x.org_id);
  if dela_pb_rank(v_role) < (case when p->>'kind' = 'ai' then 3 else 2 end) then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if x.status in ('trash', 'archived') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if p->'proposed' is null or p->>'kind' not in ('ai', 'comment') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  insert into playbook_suggestions (playbook_id, kind, base_version, part, proposed, note, removes_review, author)
  values (x.id, p->>'kind', coalesce((p->>'base_version')::int, x.current_version), left(coalesce(p->>'part', ''), 40), p->'proposed',
          left(coalesce(p->>'note', ''), 1000), coalesce((p->>'removes_review')::boolean, false), v_person)
  returning id into s;
  if p->>'kind' = 'comment' then
    insert into playbook_comments (playbook_id, part, body, suggestion_id, author)
    values (x.id, left(coalesce(p->>'part', ''), 40), left(coalesce(nullif(p->>'comment', ''), 'Suggested change'), 4000), s, v_person) returning id into c;
  end if;
  perform dela_pb_log(x.id, v_person, 'suggestion_made', x.current_version, jsonb_build_object('kind', p->>'kind', 'part', p->>'part', 'removes_review', coalesce((p->>'removes_review')::boolean, false)));
  perform dela_pb_notify_admins(x.org_id, v_person, 'A suggested change is waiting', 'A change to "' || x.title || '" is waiting for a decision.', 'pbsug:' || s);
  return jsonb_build_object('ok', true, 'suggestion_id', s, 'comment_id', c);
end $$;

-- Accept or reject. The api builds the new body for an accepted suggestion and passes it in p_body.
-- AI suggestions: an editor or the administrator decides, except one that removes an attorney review point (administrator only).
-- Comment suggestions: the administrator decides.
create or replace function dela_pb_decide(p_person uuid, p_suggestion uuid, p_accept boolean, p_body jsonb, p_meta jsonb, p_note text) returns jsonb language plpgsql as $$
declare s playbook_suggestions; x playbooks; v_role text; r jsonb;
begin
  select * into s from playbook_suggestions where id = p_suggestion for update;
  if s.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into x from playbooks where id = s.playbook_id;
  v_role := dela_pb_role(p_person, x.org_id);
  if v_role is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if s.status <> 'open' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', s.status); end if;
  if dela_pb_rank(v_role) < (case when s.kind = 'comment' or s.removes_review then 4 else 3 end) then return jsonb_build_object('ok', false, 'reason', 'administrator_only'); end if;
  if p_accept then
    if s.kind = 'ai' and s.base_version <> x.current_version then
      update playbook_suggestions set status = 'stale', decided_by = p_person, decided_at = now() where id = s.id;
      return jsonb_build_object('ok', false, 'reason', 'changed', 'current_version', x.current_version);
    end if;
    r := dela_pb_save(jsonb_build_object('person_id', p_person, 'id', x.id, 'base_version', x.current_version, 'body', p_body, 'title', p_meta->>'title',
      'completeness', p_meta->'completeness', 'missing', p_meta->'missing', 'note', left(coalesce(nullif(s.note, ''), 'Suggested change accepted'), 300),
      'action', 'suggestion_accepted'));
    if not (r->>'ok')::boolean then return r; end if;
  end if;
  update playbook_suggestions set status = case when p_accept then 'accepted' else 'rejected' end, decided_by = p_person, decided_at = now(), decision_note = left(coalesce(p_note, ''), 500)
  where id = s.id;
  update playbook_comments set resolved_at = now(), resolved_by = p_person where suggestion_id = s.id and resolved_at is null;
  if not p_accept then perform dela_pb_log(x.id, p_person, 'suggestion_rejected', x.current_version, jsonb_build_object('kind', s.kind, 'part', s.part)); end if;
  if s.author <> p_person then
    perform dela_notify(jsonb_build_object('person_id', s.author, 'side', 'attorney', 'kind', 'playbook',
      'title', 'Your suggestion was ' || case when p_accept then 'accepted' else 'not accepted' end,
      'body', 'Your suggested change to "' || x.title || '" was ' || case when p_accept then 'accepted' else 'not accepted' end || '.' || coalesce(nullif(' Note: ' || left(coalesce(p_note, ''), 200), ' Note: '), ''),
      'link', '/dela?tab=library', 'dedupe_key', 'pbdecide:' || s.id));
  end if;
  return jsonb_build_object('ok', true, 'status', case when p_accept then 'accepted' else 'rejected' end, 'version', r->'version');
end $$;

create or replace function dela_pb_suggestion(p_person uuid, p_suggestion uuid) returns jsonb language sql stable as $$
  select case when dela_pb_role(p_person, p.org_id) is null then null else jsonb_build_object('id', s.id, 'kind', s.kind, 'part', s.part, 'proposed', s.proposed,
    'base_version', s.base_version, 'status', s.status, 'playbook_id', p.id, 'current_version', p.current_version,
    'body', (select body from playbook_versions v where v.playbook_id = p.id and v.version = p.current_version), 'title', p.title) end
  from playbook_suggestions s join playbooks p on p.id = s.playbook_id where s.id = p_suggestion
$$;

create or replace function dela_pb_comment(p_person uuid, p_id uuid, p_part text, p_step int, p_body text) returns jsonb language plpgsql as $$
declare x playbooks; c uuid;
begin
  select * into x from playbooks where id = p_id;
  if x.id is null or dela_pb_rank(dela_pb_role(p_person, x.org_id)) < 2 then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if length(btrim(coalesce(p_body, ''))) = 0 then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  insert into playbook_comments (playbook_id, part, step, body, author) values (x.id, left(coalesce(p_part, ''), 40), p_step, left(btrim(p_body), 4000), p_person) returning id into c;
  perform dela_pb_log(x.id, p_person, 'comment_added', x.current_version, jsonb_build_object('part', p_part));
  perform dela_pb_notify_admins(x.org_id, p_person, 'New comment on a playbook', 'Someone commented on "' || x.title || '".', 'pbcomment:' || c);
  return jsonb_build_object('ok', true, 'comment_id', c);
end $$;

create or replace function dela_pb_comment_resolve(p_person uuid, p_comment uuid) returns jsonb language plpgsql as $$
declare c playbook_comments; x playbooks;
begin
  select * into c from playbook_comments where id = p_comment;
  if c.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into x from playbooks where id = c.playbook_id;
  if dela_pb_rank(dela_pb_role(p_person, x.org_id)) < 3 and c.author <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if c.suggestion_id is not null and exists (select 1 from playbook_suggestions where id = c.suggestion_id and status = 'open') then
    return jsonb_build_object('ok', false, 'reason', 'decide_suggestion_first');
  end if;
  update playbook_comments set resolved_at = coalesce(resolved_at, now()), resolved_by = coalesce(resolved_by, p_person) where id = c.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_pb_restore_version(p_person uuid, p_id uuid, p_version int, p_meta jsonb) returns jsonb language plpgsql as $$
declare x playbooks; b jsonb;
begin
  select * into x from playbooks where id = p_id;
  if x.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select body into b from playbook_versions where playbook_id = p_id and version = p_version;
  if b is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return dela_pb_save(jsonb_build_object('person_id', p_person, 'id', p_id, 'base_version', x.current_version, 'body', b, 'title', p_meta->>'title',
    'completeness', p_meta->'completeness', 'missing', p_meta->'missing', 'note', 'Restored version ' || p_version, 'action', 'restored'));
end $$;

-- Exports: logged for the activity log. Own library exports do not use the monthly allowance unless the setting says so.
create or replace function dela_pb_export(p_person uuid, p_id uuid, p_format text, p_request text) returns jsonb language plpgsql as $$
declare x playbooks; v_role text; r jsonb;
begin
  select * into x from playbooks where id = p_id;
  v_role := dela_pb_role(p_person, x.org_id);
  if x.id is null or v_role is null or x.status in ('trash', 'deleted') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_pb_rank(v_role) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if p_format not in ('docx', 'pdf', 'md', 'html', 'csv') then return jsonb_build_object('ok', false, 'reason', 'bad_format'); end if;
  if coalesce((dela_setting('exports.own_library_counts') #>> '{}')::boolean, false) then
    r := dela_quota_reserve(p_person, 'attorney', 'exports', 1, 'pbexport:' || p_request, p_id::text);
    if not (r->>'ok')::boolean then return jsonb_build_object('ok', false, 'reason', r->>'reason', 'limit', r->'limit'); end if;
    if not coalesce((r->>'duplicate')::boolean, false) then perform dela_quota_finish((r->>'reservation_id')::uuid, true); end if;
  end if;
  if not exists (select 1 from playbook_activity where playbook_id = p_id and action = 'exported' and detail->>'request' = p_request) then
    perform dela_pb_log(p_id, p_person, 'exported', x.current_version, jsonb_build_object('format', p_format, 'request', left(p_request, 80)));
  end if;
  return jsonb_build_object('ok', true, 'version', x.current_version);
end $$;

-- Files kept with a playbook: from the same firm only
create or replace function dela_pb_attach(p_person uuid, p_id uuid, p_file uuid, p_on boolean) returns jsonb language plpgsql as $$
declare x playbooks; f files;
begin
  select * into x from playbooks where id = p_id;
  if x.id is null or dela_pb_rank(dela_pb_role(p_person, x.org_id)) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  select * into f from files where id = p_file and org_id = x.org_id and status in ('ready', 'held');
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'file_not_usable'); end if;
  if p_on then
    insert into playbook_files (playbook_id, file_group, added_by) values (p_id, f.group_id, p_person)
    on conflict (playbook_id, file_group) do update set removed_at = null, added_by = excluded.added_by, added_at = now();
  else
    update playbook_files set removed_at = now() where playbook_id = p_id and file_group = f.group_id and removed_at is null;
  end if;
  perform dela_pb_log(p_id, p_person, case when p_on then 'file_attached' else 'file_removed' end, x.current_version, jsonb_build_object('file', f.name));
  return jsonb_build_object('ok', true);
end $$;

-- Text of files the AI may read for a playbook: firm files the person can open, ready and cleared. null if any is not.
create or replace function dela_pb_file_texts(p_person uuid, p_files uuid[]) returns jsonb language sql stable as $$
  select case when count(*) filter (where not (f.status = 'ready' and f.check_state in ('clear', 'confirmed') and dela_file_member(p_person, 'attorney', f.org_id))) > 0
              or count(*) < cardinality(p_files) then null
         else coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'text', t.body)), '[]') end
  from files f left join file_texts t on t.file_id = f.id where f.id = any(p_files)
$$;

-- ---------- Team ----------

create or replace function dela_pb_team(p_person uuid, p_org uuid) returns jsonb language plpgsql stable as $$
declare o organizations; v_seats int;
begin
  if dela_pb_role(p_person, p_org) is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into o from organizations where id = p_org;
  select pf.quota_limit into v_seats from plan_features pf where pf.feature_key = 'att.team_seats' and pf.plan_version_id = dela_effective_version(o.owner_person_id, 'attorney');
  return jsonb_build_object('ok', true, 'seats', coalesce(v_seats, 1), 'guests', dela_int_setting('playbooks.guests', 3),
    'owner', (select jsonb_build_object('name', display_name, 'bd_member_id', bd_member_id) from people where id = o.owner_person_id),
    'members', (select coalesce(jsonb_agg(jsonb_build_object('bd_member_id', pe.bd_member_id, 'name', pe.display_name, 'role', r.role, 'guest', r.guest, 'added_at', r.added_at) order by r.added_at), '[]')
      from library_roles r join people pe on pe.id = r.person_id where r.org_id = p_org and r.removed_at is null));
end $$;

-- Only the owner (or a named administrator) changes the team. Editors and administrators use seats; commenters and viewers are guests.
create or replace function dela_pb_team_set(p_person uuid, p_org uuid, p_bd bigint, p_role text) returns jsonb language plpgsql as $$
declare o organizations; v_target uuid; v_seats int; v_used int; v_guests int; v_guest boolean;
begin
  if dela_pb_rank(dela_pb_role(p_person, p_org)) < 4 then return jsonb_build_object('ok', false, 'reason', 'administrator_only'); end if;
  select * into o from organizations where id = p_org;
  select id into v_target from people where bd_member_id = p_bd and status <> 'closed';
  if v_target is null then return jsonb_build_object('ok', false, 'reason', 'never_signed_in'); end if;
  if v_target = o.owner_person_id then return jsonb_build_object('ok', false, 'reason', 'is_owner'); end if;
  perform pg_advisory_xact_lock(hashtextextended('libteam:' || p_org::text, 0));
  if p_role = 'remove' then
    update library_roles set removed_at = now() where org_id = p_org and person_id = v_target and removed_at is null;
    update org_members set status = 'removed', effective_to = now() where org_id = p_org and person_id = v_target and member_role <> 'owner';
    perform dela_audit('member', p_person, 'library_member_removed', 'organization', p_org::text, jsonb_build_object('bd_member_id', p_bd));
    return jsonb_build_object('ok', true);
  end if;
  if p_role not in ('administrator', 'editor', 'commenter', 'viewer') then return jsonb_build_object('ok', false, 'reason', 'bad_role'); end if;
  v_guest := p_role in ('commenter', 'viewer');
  select pf.quota_limit into v_seats from plan_features pf where pf.feature_key = 'att.team_seats' and pf.plan_version_id = dela_effective_version(o.owner_person_id, 'attorney');
  -- The owner uses one seat
  select 1 + count(*) filter (where not guest), count(*) filter (where guest) into v_used, v_guests
  from library_roles where org_id = p_org and removed_at is null and person_id <> v_target;
  if not v_guest and v_seats is not null and v_used >= v_seats then return jsonb_build_object('ok', false, 'reason', 'no_seat', 'seats', v_seats); end if;
  if v_guest and v_guests >= dela_int_setting('playbooks.guests', 3) then return jsonb_build_object('ok', false, 'reason', 'no_guest_place', 'guests', dela_int_setting('playbooks.guests', 3)); end if;
  insert into library_roles (org_id, person_id, role, guest, added_by) values (p_org, v_target, p_role, v_guest, p_person)
  on conflict (org_id, person_id) do update set role = excluded.role, guest = excluded.guest, removed_at = null, added_by = excluded.added_by, added_at = now();
  insert into org_members (org_id, person_id, member_role) values (p_org, v_target, 'member')
  on conflict (org_id, person_id) do update set status = 'active', effective_to = null where org_members.member_role <> 'owner';
  perform dela_audit('member', p_person, 'library_member_set', 'organization', p_org::text, jsonb_build_object('bd_member_id', p_bd, 'role', p_role));
  perform dela_notify(jsonb_build_object('person_id', v_target, 'side', 'attorney', 'kind', 'playbook', 'title', 'You were added to a playbook library',
    'body', 'You can now open ' || coalesce(nullif(o.name, ''), 'a firm') || '''s playbook library as ' || case p_role when 'administrator' then 'an administrator' when 'editor' then 'an editor' when 'commenter' then 'a commenter' else 'a viewer' end || '.',
    'link', '/dela?tab=library', 'dedupe_key', 'libadd:' || p_org || ':' || v_target || ':' || extract(epoch from now())::bigint));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Imports (Scribe guides now, recordings later) ----------

-- p: person_id, org_id, request_id, source, title, steps [{text, file_id}]
create or replace function dela_import_save(p jsonb) returns jsonb language plpgsql as $$
declare v_person uuid := (p->>'person_id')::uuid; v_org uuid := (p->>'org_id')::uuid; i playbook_imports; n int; bad int;
begin
  if dela_pb_rank(dela_pb_role(v_person, v_org)) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if coalesce(p->>'source', '') = 'scribe' and not dela_switch_on('scribe_import', v_person) then return jsonb_build_object('ok', false, 'reason', 'import_off'); end if;
  if jsonb_typeof(p->'steps') <> 'array' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  n := jsonb_array_length(p->'steps');
  if n = 0 then return jsonb_build_object('ok', false, 'reason', 'no_steps'); end if;
  if n > dela_int_setting('import.max_steps', 150) then return jsonb_build_object('ok', false, 'reason', 'too_many_steps', 'max', dela_int_setting('import.max_steps', 150)); end if;
  -- Screenshots must be this firm's files
  select count(*) into bad from jsonb_array_elements(p->'steps') s
  where coalesce(s->>'file_id', '') <> '' and not exists (select 1 from files f where f.id = (s->>'file_id')::uuid and f.org_id = v_org and f.status in ('uploading', 'checking', 'ready', 'held'));
  if bad > 0 then return jsonb_build_object('ok', false, 'reason', 'file_not_usable'); end if;
  if coalesce(p->>'id', '') <> '' then
    update playbook_imports set steps = p->'steps', title = left(coalesce(p->>'title', title), 200), updated_at = now()
    where id = (p->>'id')::uuid and org_id = v_org and status = 'review' returning * into i;
    if i.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
    return jsonb_build_object('ok', true, 'id', i.id);
  end if;
  insert into playbook_imports (org_id, person_id, source, title, steps, request_id)
  values (v_org, v_person, coalesce(nullif(p->>'source', ''), 'scribe'), left(coalesce(p->>'title', ''), 200), p->'steps', left(coalesce(p->>'request_id', ''), 80))
  on conflict (org_id, request_id) do nothing returning * into i;
  if i.id is null then select * into i from playbook_imports where org_id = v_org and request_id = left(coalesce(p->>'request_id', ''), 80); end if;
  perform dela_audit('member', v_person, 'import_saved', 'playbook_import', i.id::text, jsonb_build_object('source', i.source, 'steps', n));
  return jsonb_build_object('ok', true, 'id', i.id);
end $$;

create or replace function dela_import_get(p_person uuid, p_id uuid) returns jsonb language sql stable as $$
  select case when i.id is null or dela_pb_rank(dela_pb_role(p_person, i.org_id)) < 3 then null else jsonb_build_object('id', i.id, 'org_id', i.org_id, 'title', i.title,
    'source', i.source, 'status', i.status, 'playbook_id', i.playbook_id, 'request_id', i.request_id,
    'steps', (select coalesce(jsonb_agg(s || jsonb_build_object('file', (select jsonb_build_object('status', f.status, 'check_state', f.check_state, 'reasons', f.check_reasons, 'name', f.name)
       from files f where f.id = nullif(s->>'file_id', '')::uuid)) order by o), '[]') from jsonb_array_elements(i.steps) with ordinality as e(s, o))) end
  from playbook_imports i where i.id = p_id
$$;

create or replace function dela_import_finish(p_person uuid, p_id uuid, p_status text, p_playbook uuid) returns jsonb language plpgsql as $$
declare i playbook_imports;
begin
  select * into i from playbook_imports where id = p_id for update;
  if i.id is null or dela_pb_rank(dela_pb_role(p_person, i.org_id)) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if i.status <> 'review' then return jsonb_build_object('ok', true, 'duplicate', true, 'playbook_id', i.playbook_id); end if;
  update playbook_imports set status = p_status, playbook_id = p_playbook, updated_at = now() where id = i.id;
  return jsonb_build_object('ok', true);
end $$;

-- Deletes one older version of a file for good (the unblurred original after a blur). The current version cannot be dropped this way.
create or replace function dela_file_drop_version(p_person uuid, p_file uuid) returns jsonb language plpgsql as $$
declare f files;
begin
  select * into f from files where id = p_file for update;
  if f.id is null or not dela_file_member(p_person, 'attorney', f.org_id) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if f.status = 'deleted' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if f.is_current then return jsonb_build_object('ok', false, 'reason', 'current_version'); end if;
  delete from file_texts where file_id = f.id;
  update files set status = 'deleted', deleted_at = now(), updated_at = now() where id = f.id;
  perform dela_job_enqueue('file_remove', jsonb_build_object('path', f.storage_path), now(), 'fileremove:' || f.id, p_person);
  perform dela_audit('member', p_person, 'file_version_dropped', 'file', f.id::text, '{}');
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Daily: review reminders, trash ----------

create or replace function dela_pb_daily() returns jsonb language plpgsql as $$
declare r record; n int := 0; t int;
begin
  for r in select * from playbooks where status = 'approved' and next_review_at <= (now() at time zone dela_tz())::date and reminded_for is distinct from next_review_at loop
    perform dela_pb_notify_admins(r.org_id, null, 'A playbook is due for review', '"' || r.title || '" was approved a while ago and is due for its review. Open it and check it still matches how you work.',
      'pbdue:' || r.id || ':' || r.next_review_at);
    update playbooks set reminded_for = next_review_at where id = r.id;
    n := n + 1;
  end loop;
  -- Trash past its days: the playbook leaves the library for good; its versions and log stay as the record
  with d as (update playbooks set status = 'deleted', updated_at = now()
    where status = 'trash' and trashed_at < now() - make_interval(days => dela_int_setting('playbooks.trash_days', 30)) returning id)
  select count(*) into t from d;
  return jsonb_build_object('reminders', n, 'emptied', t);
end $$;

create or replace function dela_maybe_queue_daily() returns void language plpgsql as $$
declare local timestamp := now() at time zone dela_tz();
begin
  if extract(hour from local) >= 8 then
    perform dela_job_enqueue('daily_summary', '{}', now(), 'daily:' || local::date);
    perform dela_job_enqueue('playbooks_daily', '{}', now(), 'playbooks_daily:' || local::date);
  end if;
  perform dela_job_enqueue('files_sweep', '{}', now(), 'files_sweep:' || local::date);
  perform dela_job_enqueue('ai_key_reminders', '{}', now(), 'ai_key_reminders:' || local::date);
end $$;

-- Admin: library counts per plan
create or replace function dela_admin_playbooks(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return jsonb_build_object(
    'by_plan', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('plan', sp.plan_code, 'libraries', count(distinct p.org_id), 'playbooks', count(*),
        'approved', count(*) filter (where p.status = 'approved'), 'drafts', count(*) filter (where p.status in ('draft', 'in_review')),
        'from_scribe', count(*) filter (where p.source = 'scribe'), 'from_ai', count(*) filter (where p.source = 'ai')) x
      from playbooks p join organizations o on o.id = p.org_id left join side_profiles sp on sp.person_id = o.owner_person_id and sp.side = 'attorney'
      where p.status not in ('trash', 'deleted') group by sp.plan_code order by sp.plan_code) t),
    'at_limit', (select coalesce(jsonb_agg(jsonb_build_object('bd_member_id', pe.bd_member_id, 'count', dela_pb_count(o.id), 'limit', dela_pb_limit(o.id))), '[]')
      from organizations o join people pe on pe.id = o.owner_person_id where dela_pb_limit(o.id) is not null and dela_pb_count(o.id) >= dela_pb_limit(o.id)),
    'imports', (select count(*) from playbook_imports where created_at > now() - interval '30 days'),
    'suggestions_open', (select count(*) from playbook_suggestions where status = 'open'));
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

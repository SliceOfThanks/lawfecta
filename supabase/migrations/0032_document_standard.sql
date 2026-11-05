-- The document standard (brief docs/briefs/step-2d-document-standard.md, Stacey's final decisions 2026-11-05).
-- Library items become documents of four types (Policy, Workflow, SOP, Playbook) with IDs by lifecycle prefix, a master
-- index, a change log on every save (append-only), review dates by risk, a reminder 14 days ahead to the owner role, the
-- export and approval block in the database, gigs from SOPs and Workflows only, read-only reference documents on gigs,
-- attorney checkpoints inside an engagement, and the type check of older items. Additive: new columns, tables, functions.

insert into feature_switches (key, label, gate) values
  ('document_standard', 'The document standard: four types, the self-check, RACI, KPIs and the new Library screens', 'Document standard tested'),
  ('document_conversion', 'Type check and conversion of older playbooks into documents', 'Document standard tested')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('documents.max_words', '900', 'Most words of body text in an SOP', 'Documents', 'words', 'C', 'Stacey 2026-11-05 (decision 5)', 'Over it adds a quality item with "Split into linked SOPs"; it never blocks.'),
  ('documents.review_months_high_risk', '3', 'Months between reviews for trust, conflicts and deadline documents', 'Documents', 'months', 'C', 'Stacey 2026-11-05 (build prompt, Step 4)', ''),
  ('documents.review_reminder_days', '14', 'Days before the next review to remind the owner role', 'Documents', 'days', 'C', 'Stacey 2026-11-05 (build prompt, Step 5)', ''),
  ('documents.kpi_min', '3', 'Fewest KPIs on a workflow', 'Documents', 'KPIs', 'C', 'Guide section 6', ''),
  ('documents.kpi_max', '5', 'Most KPIs on a workflow', 'Documents', 'KPIs', 'C', 'Guide section 6', ''),
  ('documents.max_consulted', '2', 'Consulted (C) per step before a warning', 'Documents', 'roles', 'C', 'Stacey 2026-11-05 (build prompt)', '')
on conflict (key) do nothing;
update settings set label = 'Months until an approved document is due for review', section = 'Documents' where key = 'playbooks.review_months';

-- ---------- Documents (the playbooks table keeps its name inside the database; members read "document") ----------
alter table playbooks add column if not exists doc_type text check (doc_type is null or doc_type in ('policy', 'workflow', 'sop', 'playbook'));
alter table playbooks add column if not exists doc_id text;
alter table playbooks add column if not exists lifecycle text not null default '' check (lifecycle in ('', 'INT', 'ENG', 'MAT', 'DOC', 'BIL', 'CLS', 'ADM'));
alter table playbooks add column if not exists high_risk boolean not null default false;
alter table playbooks add column if not exists owner_role text not null default '';
alter table playbooks add column if not exists blocking int not null default 0;
alter table playbooks add column if not exists attention int not null default 0;
alter table playbooks add column if not exists last_reviewed_at date;
alter table playbooks add column if not exists review_reminded_for date;
alter table playbooks add column if not exists converted_at timestamptz;
alter table playbooks add column if not exists converted_from_version int;
alter table playbooks add column if not exists conversion_note text not null default '';
alter table playbooks add column if not exists conversion_seen_at timestamptz;
create unique index if not exists playbooks_doc_id on playbooks (org_id, doc_id) where doc_id is not null;
alter table playbook_versions add column if not exists blocking int;

create table doc_counters (
  org_id uuid not null references organizations(id),
  prefix text not null,
  n int not null default 0,
  primary key (org_id, prefix)
);
alter table doc_counters enable row level security;

-- The change log: one row per save (what changed, who) and one per approval (who approved). Never edited.
create table document_changes (
  id bigserial primary key,
  playbook_id uuid not null references playbooks(id),
  version int not null,
  kind text not null check (kind in ('change', 'approval', 'conversion')),
  what text not null default '',
  person_id uuid references people(id),
  at timestamptz not null default now()
);
create index document_changes_pb on document_changes (playbook_id, id);
create trigger document_changes_append_only before update or delete on document_changes for each row execute function dela_no_change();
alter table document_changes enable row level security;

-- Review reminders sent for a document (so a bounce can go to the firm owner)
create table doc_review_notices (
  notification_id uuid primary key,
  playbook_id uuid not null references playbooks(id),
  org_id uuid not null references organizations(id),
  resent_at timestamptz
);
alter table doc_review_notices enable row level security;

-- Policies and Playbooks attached to a gig as read-only reference
create table gig_references (
  gig_id uuid not null references gigs(id),
  playbook_id uuid not null references playbooks(id),
  version int not null,
  added_by uuid not null references people(id),
  added_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (gig_id, playbook_id)
);
alter table gig_references enable row level security;

-- "Attorney decides" steps inside an engagement: the gig waits at each until the attorney approves it
create table engagement_checkpoints (
  agreement_id uuid not null references agreements(id),
  step_no int not null,
  step_text text not null,
  status text not null default 'pending' check (status in ('pending', 'requested', 'approved')),
  requested_at timestamptz,
  requested_note text not null default '',
  approved_by uuid references people(id),
  approved_at timestamptz,
  approval_note text not null default '',
  primary key (agreement_id, step_no)
);
alter table engagement_checkpoints enable row level security;

-- ---------- The firm profile for documents (inside firm_profiles.body.documents) ----------
create or replace function dela_doc_firm(p_person uuid) returns jsonb language plpgsql stable as $$
declare v_org uuid := dela_side_org(p_person, 'attorney'); f firm_profiles; d jsonb; mp member_profiles;
begin
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'attorneys_only'); end if;
  select * into f from firm_profiles where org_id = v_org;
  select * into mp from member_profiles where person_id = (select owner_person_id from organizations where id = v_org) and side = 'attorney';
  d := coalesce(f.body->'documents', '{}');
  return jsonb_build_object('ok', true, 'saved', f.body ? 'documents', 'can_edit', dela_firm_role(p_person, v_org) in ('owner', 'manager'),
    'firm', d || jsonb_build_object('practice_areas', coalesce(d->'practice_areas', mp.body->'practice_areas', '[]')),
    'team', (select coalesce(jsonb_agg(jsonb_build_object('person_id', x.person_id, 'name', pe.display_name, 'role', x.r) order by x.r desc, pe.display_name), '[]')
      from (select o.owner_person_id person_id, 'owner' r from organizations o where o.id = v_org union select m.person_id, m.member_role from org_members m where m.org_id = v_org and m.status = 'active') x join people pe on pe.id = x.person_id),
    'unassigned', (select coalesce(jsonb_agg(r->>'name'), '[]') from jsonb_array_elements(coalesce(d->'roles', '[]')) r where coalesce(r->>'person_id', '') = '' and coalesce(r->>'email', '') = ''),
    'documents_count', (select count(*) from playbooks where org_id = v_org and status not in ('deleted', 'trash')));
end $$;

create or replace function dela_doc_firm_save(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_org uuid := dela_side_org(p_person, 'attorney'); r jsonb; v_roles jsonb := '[]'; v_pid uuid;
begin
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'attorneys_only'); end if;
  if dela_firm_role(p_person, v_org) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'owner_or_manager_only'); end if;
  if coalesce(p->>'size', '') not in ('solo', '2-5', '6-20', '21+') then return jsonb_build_object('ok', false, 'reason', 'choose_firm_size'); end if;
  for r in select x from jsonb_array_elements(coalesce(p->'roles', '[]')) x limit 30 loop
    if coalesce(trim(r->>'name'), '') = '' then continue; end if;
    v_pid := case when coalesce(r->>'person_id', '') ~ '^[0-9a-f-]{36}$' then (r->>'person_id')::uuid end;
    -- A role can be held by someone in the firm, or by an email address
    if v_pid is not null and dela_firm_role(v_pid, v_org) = '' then return jsonb_build_object('ok', false, 'reason', 'not_in_firm', 'role', r->>'name'); end if;
    if coalesce(r->>'email', '') <> '' and (r->>'email') !~ '^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$' then return jsonb_build_object('ok', false, 'reason', 'bad_email', 'role', r->>'name'); end if;
    v_roles := v_roles || jsonb_build_object('name', left(trim(r->>'name'), 60), 'kind', case when r->>'kind' in ('attorney', 'staff', 'freelancer') then r->>'kind' else 'staff' end,
      'person_id', coalesce(v_pid::text, ''), 'email', case when v_pid is null then lower(coalesce(r->>'email', '')) else '' end);
  end loop;
  if not exists (select 1 from jsonb_array_elements(v_roles) x where x->>'kind' = 'attorney') then return jsonb_build_object('ok', false, 'reason', 'attorney_role_needed'); end if;
  insert into firm_profiles (org_id, body, updated_by) values (v_org, jsonb_build_object('documents', '{}'::jsonb), p_person) on conflict (org_id) do nothing;
  update firm_profiles set body = body || jsonb_build_object('documents', jsonb_build_object('size', p->>'size',
      'practice_areas', coalesce(p->'practice_areas', '[]'), 'jurisdictions', left(coalesce(p->>'jurisdictions', ''), 500), 'roles', v_roles,
      'systems', coalesce(p->'systems', '{}'))), updated_by = p_person, updated_at = now() where org_id = v_org;
  perform dela_audit('member', p_person, 'doc_firm_saved', 'organization', v_org::text, jsonb_build_object('roles', jsonb_array_length(v_roles)));
  return jsonb_build_object('ok', true, 'unassigned', (select coalesce(jsonb_agg(x->>'name'), '[]') from jsonb_array_elements(v_roles) x where x->>'person_id' = '' and x->>'email' = ''));
end $$;

-- The next document ID in a lifecycle group: INT-01, INT-02 ... (three digits after 99)
create or replace function dela_doc_next_id(p_org uuid, p_prefix text) returns text language plpgsql as $$
declare v_n int;
begin
  insert into doc_counters (org_id, prefix, n) values (p_org, p_prefix, 1) on conflict (org_id, prefix) do update set n = doc_counters.n + 1 returning n into v_n;
  return p_prefix || '-' || lpad(v_n::text, 2, '0');
end $$;

-- Document facts written with every create and save (the api works out the checks in code; the database keeps the result)
create or replace function dela_doc_apply(p_id uuid, p jsonb) returns void language plpgsql as $$
declare x playbooks;
begin
  if coalesce(p->>'doc_type', '') = '' then return; end if;
  select * into x from playbooks where id = p_id for update;
  update playbooks set doc_type = p->>'doc_type', lifecycle = coalesce(nullif(p->>'lifecycle', ''), nullif(lifecycle, ''), 'ADM'), high_risk = coalesce((p->>'high_risk')::boolean, high_risk),
    owner_role = left(coalesce(p->>'owner_role', owner_role), 60), blocking = coalesce((p->>'blocking')::int, blocking), attention = coalesce((p->>'attention')::int, attention)
  where id = x.id returning * into x;
  -- An ID once, by its lifecycle group; it never changes afterwards, so links keep working
  if x.doc_id is null then update playbooks set doc_id = dela_doc_next_id(x.org_id, x.lifecycle) where id = x.id; end if;
  update playbook_versions set blocking = coalesce((p->>'blocking')::int, 0) where playbook_id = x.id and version = x.current_version;
  insert into document_changes (playbook_id, version, kind, what, person_id) values (x.id, x.current_version, case when p->>'kind' = 'conversion' then 'conversion' else 'change' end,
    left(coalesce(nullif(p->>'what_changed', ''), 'Saved'), 300), (p->>'person_id')::uuid);
end $$;

-- ---------- Approval and review dates ----------
create or replace function dela_pb_status(p_person uuid, p_id uuid, p_action text) returns jsonb language plpgsql as $$
declare x playbooks; v_role text; v_limit int; v_count int; v_months int;
begin
  select * into x from playbooks where id = p_id for update;
  if x.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_pb_role(p_person, x.org_id);
  if v_role is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_action = 'submit' then
    if dela_pb_rank(v_role) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
    if x.status <> 'draft' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    if x.doc_type is not null and x.blocking > 0 then return jsonb_build_object('ok', false, 'reason', 'checks_failing', 'blocking', x.blocking); end if;
    update playbooks set status = 'in_review', updated_at = now() where id = x.id;
    perform dela_pb_notify_admins(x.org_id, p_person, 'A document is ready for your review', '"' || x.title || '" was sent for approval.', 'pbreview:' || x.id || ':' || x.current_version);
  elsif p_action = 'approve' then
    if dela_pb_rank(v_role) < 4 then return jsonb_build_object('ok', false, 'reason', 'administrator_only'); end if;
    if x.status not in ('draft', 'in_review') then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    if x.doc_type is not null then
      -- The block (Stacey decision 4): no approval while a step lacks its one A or a judgment step lacks the attorney flag
      if x.blocking > 0 then return jsonb_build_object('ok', false, 'reason', 'checks_failing', 'blocking', x.blocking); end if;
    elsif x.completeness < 100 or jsonb_array_length(x.missing) > 0 then return jsonb_build_object('ok', false, 'reason', 'not_complete', 'missing', x.missing);
    end if;
    v_months := case when x.high_risk then dela_int_setting('documents.review_months_high_risk', 3) else dela_int_setting('playbooks.review_months', 12) end;
    update playbooks set status = 'approved', approved_version = current_version, updated_at = now(), reminded_for = null, review_reminded_for = null,
      last_reviewed_at = (now() at time zone dela_tz())::date, next_review_at = (now() at time zone dela_tz())::date + make_interval(months => v_months) where id = x.id;
    if x.doc_type is not null then insert into document_changes (playbook_id, version, kind, what, person_id) values (x.id, x.current_version, 'approval', 'Approved', p_person); end if;
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

-- ---------- The master index and one document ----------
create or replace function dela_pb_list(p_person uuid, p_org uuid) returns jsonb language plpgsql stable as $$
declare v_role text := dela_pb_role(p_person, p_org);
begin
  if v_role is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'role', v_role, 'on', dela_switch_on('playbook_library', p_person), 'scribe_on', dela_switch_on('scribe_import', p_person),
    'standard', dela_switch_on('document_standard', p_person), 'count', dela_pb_count(p_org), 'limit', dela_pb_limit(p_org),
    'playbooks', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'status', p.status, 'version', p.current_version,
        'approved_version', p.approved_version, 'completeness', p.completeness, 'practice_area', p.practice_area, 'source', p.source,
        'next_review_at', p.next_review_at, 'updated_at', p.updated_at, 'trashed_at', p.trashed_at,
        'doc_type', p.doc_type, 'doc_id', p.doc_id, 'lifecycle', p.lifecycle, 'owner_role', p.owner_role, 'blocking', p.blocking, 'attention', p.attention, 'high_risk', p.high_risk,
        'converted', p.converted_at is not null and p.conversion_seen_at is null,
        'open_suggestions', (select count(*) from playbook_suggestions s where s.playbook_id = p.id and s.status = 'open')) order by p.lifecycle, p.doc_id nulls last, p.updated_at desc), '[]')
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
      'doc_type', p.doc_type, 'doc_id', p.doc_id, 'lifecycle', p.lifecycle, 'owner_role', p.owner_role, 'blocking', p.blocking, 'attention', p.attention, 'high_risk', p.high_risk,
      'last_reviewed_at', p.last_reviewed_at, 'converted', p.converted_at is not null and p.conversion_seen_at is null, 'conversion_note', p.conversion_note, 'converted_from_version', p.converted_from_version,
      'administrator', (select display_name from people where id = (select owner_person_id from organizations where id = p.org_id))),
    'body', v.body,
    'changes', (select coalesce(jsonb_agg(jsonb_build_object('version', c.version, 'kind', c.kind, 'what', c.what, 'by', pe.display_name, 'at', c.at) order by c.id), '[]')
      from document_changes c left join people pe on pe.id = c.person_id where c.playbook_id = p.id),
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

create or replace function dela_doc_conversion_seen(p_person uuid, p_id uuid) returns jsonb language plpgsql as $$
begin
  if dela_pb_role(p_person, (select org_id from playbooks where id = p_id)) is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  update playbooks set conversion_seen_at = now() where id = p_id and conversion_seen_at is null;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Converting older items (the guide's type check) ----------
create or replace function dela_doc_convert_queue() returns jsonb language plpgsql as $$
declare r record; n int := 0;
begin
  for r in select p.id, p.org_id, o.owner_person_id from playbooks p join organizations o on o.id = p.org_id
           where p.doc_type is null and p.status not in ('deleted') and p.converted_at is null loop
    if not dela_switch_on('document_conversion', r.owner_person_id) then continue; end if;
    perform dela_job_enqueue('doc_convert', jsonb_build_object('playbook_id', r.id), now(), 'docconv:' || r.id::text, r.owner_person_id);
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'queued', n);
end $$;

create or replace function dela_doc_convert_source(p_id uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('id', p.id, 'org_id', p.org_id, 'title', p.title, 'status', p.status, 'version', p.current_version, 'doc_type', p.doc_type,
    'body', (select body from playbook_versions v where v.playbook_id = p.id and v.version = p.current_version), 'owner', p.created_by)
  from playbooks p where p.id = p_id
$$;

-- The converted body becomes a new version; the older versions (and an approved one) stay. The owner is asked to check it.
create or replace function dela_doc_convert_done(p_id uuid, p jsonb) returns jsonb language plpgsql as $$
declare x playbooks; v_new int; v_label text;
begin
  select * into x from playbooks where id = p_id for update;
  if x.id is null or x.doc_type is not null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  v_new := x.current_version + 1;
  insert into playbook_versions (playbook_id, version, body, note, created_by) values (x.id, v_new, p->'body', 'Converted to the document standard', x.created_by);
  update playbooks set current_version = v_new, converted_at = now(), converted_from_version = x.current_version, conversion_note = left(coalesce(p->>'reason', ''), 300),
    status = case when status in ('approved', 'in_review') then 'draft' else status end, updated_at = now() where id = x.id;
  perform dela_doc_apply(x.id, p || jsonb_build_object('kind', 'conversion', 'person_id', x.created_by, 'what_changed', 'Converted to the document standard: ' || coalesce(p->>'reason', '')));
  v_label := case p->>'doc_type' when 'sop' then 'an SOP' when 'workflow' then 'a Workflow' when 'playbook' then 'a Playbook' else 'a Policy' end;
  perform dela_notify(jsonb_build_object('person_id', x.created_by, 'side', 'attorney', 'kind', 'document', 'email', false, 'title', '"' || x.title || '" is now ' || v_label,
    'body', 'DELA moved it to the new document standard as ' || v_label || ' (' || coalesce(p->>'reason', '') || '). Open it to check it, change the type in one click if it is wrong, and approve it again.'
      || case when x.status = 'approved' then ' The approved version stays in use until then.' else '' end,
    'link', '/dela?tab=library&pb=' || x.id::text, 'dedupe_key', 'docconv:' || x.id::text));
  perform dela_pb_log(x.id, null, 'converted', v_new, jsonb_build_object('type', p->>'doc_type'));
  return jsonb_build_object('ok', true, 'version', v_new);
end $$;

-- ---------- Reminders 14 days ahead to the owner role, and on the day ----------
create or replace function dela_doc_role_holder(p_org uuid, p_role text) returns jsonb language sql stable as $$
  select coalesce((select jsonb_build_object('person_id', nullif(r->>'person_id', ''), 'email', nullif(r->>'email', ''))
    from firm_profiles f, jsonb_array_elements(coalesce(f.body->'documents'->'roles', '[]')) r where f.org_id = p_org and lower(r->>'name') = lower(p_role)
      and (coalesce(r->>'person_id', '') <> '' or coalesce(r->>'email', '') <> '') limit 1), '{}')
$$;

create or replace function dela_doc_review_remind(p_pb uuid) returns void language plpgsql as $$
declare x playbooks; h jsonb; v_owner uuid; v_to uuid; v_n uuid; v_body text;
begin
  select * into x from playbooks where id = p_pb;
  v_owner := (select owner_person_id from organizations where id = x.org_id);
  h := case when x.owner_role <> '' then dela_doc_role_holder(x.org_id, x.owner_role) else '{}' end;
  v_to := coalesce((h->>'person_id')::uuid, v_owner);
  v_body := '"' || coalesce(x.doc_id || ' ', '') || x.title || '" is due for review on ' || to_char(x.next_review_at, 'FMMonth FMDD, YYYY') || '. Open it, check it still matches how the firm works, and approve it again. An outdated document is worse than none.';
  perform dela_notify(jsonb_build_object('person_id', v_to, 'side', 'attorney', 'kind', 'doc_review', 'email', h->>'email' is null, 'essential', true, 'title', 'A document is due for review in ' || dela_int_setting('documents.review_reminder_days', 14) || ' days',
    'body', v_body, 'link', '/dela?tab=library&pb=' || x.id::text, 'dedupe_key', 'docrev:' || x.id || ':' || x.next_review_at));
  if v_to <> v_owner then
    perform dela_notify(jsonb_build_object('person_id', v_owner, 'side', 'attorney', 'kind', 'doc_review', 'email', false, 'title', 'A document is due for review soon', 'body', v_body,
      'link', '/dela?tab=library&pb=' || x.id::text, 'dedupe_key', 'docrevown:' || x.id || ':' || x.next_review_at));
  end if;
  -- The role is held by an email address: the reminder goes there, and a bounce goes to the firm owner
  if h->>'email' is not null then
    insert into notifications (person_id, side, kind, channel, essential, title, body, link, dedupe_key, to_email)
    values (v_owner, 'attorney', 'doc_review', 'email', true, 'A document is due for review in ' || dela_int_setting('documents.review_reminder_days', 14) || ' days', v_body,
      '/dela?tab=library&pb=' || x.id::text, 'docrevmail:' || x.id || ':' || x.next_review_at, h->>'email')
    on conflict (dedupe_key) do nothing returning id into v_n;
    if v_n is not null then perform dela_job_enqueue('send_email', jsonb_build_object('notification_id', v_n), now(), 'email:' || v_n::text, v_owner); end if;
  else
    select id into v_n from notifications where dedupe_key = 'docrev:' || x.id || ':' || x.next_review_at || ':email';
  end if;
  if v_n is not null then insert into doc_review_notices (notification_id, playbook_id, org_id) values (v_n, x.id, x.org_id) on conflict do nothing; end if;
end $$;

create or replace function dela_pb_daily() returns jsonb language plpgsql as $$
declare r record; n int := 0; t int; m int := 0; v_today date := (now() at time zone dela_tz())::date;
begin
  -- 14 days ahead: the owner role (documents)
  for r in select * from playbooks where status = 'approved' and doc_type is not null and next_review_at is not null
           and next_review_at - dela_int_setting('documents.review_reminder_days', 14) <= v_today and next_review_at > v_today and review_reminded_for is distinct from next_review_at loop
    perform dela_doc_review_remind(r.id);
    update playbooks set review_reminded_for = next_review_at where id = r.id;
    m := m + 1;
  end loop;
  for r in select * from playbooks where status = 'approved' and next_review_at <= v_today and reminded_for is distinct from next_review_at loop
    perform dela_pb_notify_admins(r.org_id, null, 'A document is due for review', '"' || coalesce(r.doc_id || ' ', '') || r.title || '" is due for its review today. Open it and check it still matches how you work.',
      'pbdue:' || r.id || ':' || r.next_review_at);
    update playbooks set reminded_for = next_review_at where id = r.id;
    n := n + 1;
  end loop;
  with d as (update playbooks set status = 'deleted', updated_at = now()
    where status = 'trash' and trashed_at < now() - make_interval(days => dela_int_setting('playbooks.trash_days', 30)) returning id)
  select count(*) into t from d;
  -- Older items still to convert (while the switch is on for the firm)
  perform dela_doc_convert_queue();
  return jsonb_build_object('reminders', n, 'early_reminders', m, 'emptied', t);
end $$;

-- A bounced review reminder goes to the firm owner instead (Stacey decision 3)
create or replace function dela_notification_delivery(p_notification uuid, p_state text, p_reason text) returns jsonb language plpgsql as $$
declare n notifications; v_lic uuid; v_region text; v_bd bigint; d doc_review_notices; v_owner uuid; x playbooks;
begin
  select * into n from notifications where id = p_notification for update;
  if n.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_state not in ('delivered', 'bounced', 'waiting', 'unknown') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if n.delivery_state in ('delivered', 'bounced') then return jsonb_build_object('ok', true, 'duplicate', true, 'state', n.delivery_state); end if;
  update notifications set delivery_state = p_state, delivery_reason = left(coalesce(p_reason, ''), 200), delivery_checked_at = now() where id = n.id;
  if p_state = 'bounced' then
    select e.license_id, l.region, pe.bd_member_id into v_lic, v_region, v_bd from email_checks e join licenses l on l.id = e.license_id join people pe on pe.id = l.person_id where e.notification_id = n.id;
    if v_lic is not null then
      perform dela_verify_event('license', v_lic, n.person_id, 'worker', null, 'email_bounced', jsonb_build_object('reason', left(coalesce(p_reason, ''), 200)));
      perform dela_alert('verification', 'A license email bounced', 'The confirmation email for member ' || v_bd || '''s ' || v_region || ' license could not be delivered (' || left(coalesce(p_reason, ''), 120) || '). The attorney is told on their Profile. Open the admin area, Verification.',
        'licbounce:' || n.id);
    end if;
    select * into d from doc_review_notices where notification_id = n.id for update;
    if d.notification_id is not null and d.resent_at is null then
      select * into x from playbooks where id = d.playbook_id;
      v_owner := (select owner_person_id from organizations where id = d.org_id);
      perform dela_notify(jsonb_build_object('person_id', v_owner, 'side', 'attorney', 'kind', 'doc_review', 'email', true, 'essential', true,
        'title', 'A review reminder could not be delivered', 'body', 'The reminder for "' || coalesce(x.doc_id || ' ', '') || x.title || '" bounced at the address for its owner role, so it comes to you. The document is due for review on ' || to_char(x.next_review_at, 'FMMonth FMDD, YYYY') || '. Check the role''s email in the firm profile.',
        'link', '/dela?tab=library&pb=' || x.id::text, 'dedupe_key', 'docrevbounce:' || n.id));
      update doc_review_notices set resent_at = now() where notification_id = n.id;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'state', p_state);
end $$;

-- ---------- Gigs: only from approved SOPs and Workflows that pass the block; references; checkpoints ----------
create or replace function dela_gig_create(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
declare pb playbooks; v_id uuid; v_org uuid; v_block int;
begin
  if not dela_switch_on('flex_gigs', p_person) then return jsonb_build_object('ok', false, 'reason', 'gigs_off'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  select * into pb from playbooks where id = (p->>'playbook_id')::uuid;
  if pb.id is null or dela_firm_role(p_person, pb.org_id) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if pb.status <> 'approved' or pb.approved_version is null then return jsonb_build_object('ok', false, 'reason', 'playbook_not_approved'); end if;
  if pb.doc_type in ('policy', 'playbook') then return jsonb_build_object('ok', false, 'reason', 'type_not_for_gigs', 'doc_type', pb.doc_type); end if;
  select blocking into v_block from playbook_versions where playbook_id = pb.id and version = pb.approved_version;
  if pb.doc_type is not null and coalesce(v_block, 0) > 0 then return jsonb_build_object('ok', false, 'reason', 'checks_failing'); end if;
  v_org := pb.org_id;
  select id into v_id from gigs where org_id = v_org and request_id = p->>'request_id';
  if v_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_id); end if;
  insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, deadline, milestones, request_id)
  values (v_org, p_person, pb.id, pb.approved_version, left(coalesce(nullif(p->'public'->>'title', ''), pb.title), 200), coalesce(p->'public', '{}'),
    greatest(coalesce((p->>'budget_min_cents')::int, 0), 0), greatest(coalesce((p->>'budget_max_cents')::int, 0), coalesce((p->>'budget_min_cents')::int, 0), 0),
    nullif(p->>'deadline', '')::date, coalesce(p->'milestones', '[]'), p->>'request_id')
  returning id into v_id;
  perform dela_gig_event(v_id, 'drafted', 'member', p_person, jsonb_build_object('playbook_id', pb.id, 'version', pb.approved_version));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function dela_gig_reference(p_person uuid, p_gig uuid, p_doc uuid, p_on boolean) returns jsonb language plpgsql as $$
declare g gigs; pb playbooks;
begin
  if not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into g from gigs where id = p_gig;
  select * into pb from playbooks where id = p_doc and org_id = g.org_id;
  if pb.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not p_on then update gig_references set removed_at = now() where gig_id = g.id and playbook_id = pb.id and removed_at is null; return jsonb_build_object('ok', true); end if;
  if pb.doc_type not in ('policy', 'playbook') then return jsonb_build_object('ok', false, 'reason', 'reference_policies_and_playbooks'); end if;
  if pb.status <> 'approved' or pb.approved_version is null then return jsonb_build_object('ok', false, 'reason', 'playbook_not_approved'); end if;
  insert into gig_references (gig_id, playbook_id, version, added_by) values (g.id, pb.id, pb.approved_version, p_person)
  on conflict (gig_id, playbook_id) do update set removed_at = null, version = excluded.version, added_by = excluded.added_by, added_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- References for whoever may see a gig's full document (the manager; invited, applicant and hired freelancers)
create or replace function dela_gig_references(p_person uuid, p_side text, p_gig uuid) returns jsonb language plpgsql stable as $$
declare v_ok boolean;
begin
  v_ok := (p_side = 'attorney' and dela_gig_manager(p_person, p_gig)) or (p_side = 'freelancer' and dela_gig_access(p_person, p_gig) in ('invited', 'applicant', 'hired'));
  if not coalesce(v_ok, false) then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'doc_id', p.doc_id, 'title', p.title, 'doc_type', p.doc_type, 'version', r.version,
      'body', (select body from playbook_versions v where v.playbook_id = p.id and v.version = r.version)) order by p.doc_id), '[]')
    from gig_references r join playbooks p on p.id = r.playbook_id where r.gig_id = p_gig and r.removed_at is null);
end $$;

-- Checkpoints: made once per engagement from the gig's document (the api works out the "Attorney decides" steps)
create or replace function dela_checkpoints_ensure(p_agreement uuid, p_steps jsonb) returns void language plpgsql as $$
declare s jsonb;
begin
  if exists (select 1 from engagement_checkpoints where agreement_id = p_agreement) then return; end if;
  for s in select x from jsonb_array_elements(coalesce(p_steps, '[]')) x loop
    insert into engagement_checkpoints (agreement_id, step_no, step_text) values (p_agreement, (s->>'n')::int, left(s->>'text', 600)) on conflict do nothing;
  end loop;
end $$;

create or replace function dela_checkpoints(p_person uuid, p_side text, p_agreement uuid) returns jsonb language sql stable as $$
  select case when dela_agreement_role(p_person, p_side, p_agreement) = '' then '[]'::jsonb else
    (select coalesce(jsonb_agg(jsonb_build_object('step_no', c.step_no, 'text', c.step_text, 'status', c.status, 'requested_at', c.requested_at, 'requested_note', c.requested_note,
      'approved_at', c.approved_at, 'approval_note', c.approval_note, 'approved_by', (select display_name from people where id = c.approved_by)) order by c.step_no), '[]')
     from engagement_checkpoints c where c.agreement_id = p_agreement) end
$$;

-- The freelancer reaches a checkpoint and asks; the attorney approves inside the gig. Recorded with who and when.
create or replace function dela_checkpoint_act(p_person uuid, p_side text, p_agreement uuid, p_step int, p_note text) returns jsonb language plpgsql as $$
declare v_role text := dela_agreement_role(p_person, p_side, p_agreement); c engagement_checkpoints;
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into c from engagement_checkpoints where agreement_id = p_agreement and step_no = p_step for update;
  if c.agreement_id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_role = 'freelancer' then
    if c.status <> 'pending' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    update engagement_checkpoints set status = 'requested', requested_at = now(), requested_note = left(coalesce(p_note, ''), 1000) where agreement_id = p_agreement and step_no = p_step;
    perform dela_engagement_notify(p_agreement, 'attorney', 'Your decision is needed', 'The freelancer reached step ' || p_step || ' ("' || left(c.step_text, 120) || '"), which the attorney decides. The work waits until you approve it.', 'ckpt' || p_step);
  else
    if c.status = 'approved' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    update engagement_checkpoints set status = 'approved', approved_by = p_person, approved_at = now(), approval_note = left(coalesce(p_note, ''), 1000) where agreement_id = p_agreement and step_no = p_step;
    perform dela_engagement_notify(p_agreement, 'freelancer', 'The attorney approved a step', 'The attorney approved step ' || p_step || '. You can go on.' || case when coalesce(p_note, '') <> '' then ' Note: ' || left(p_note, 200) else '' end, 'ckptok' || p_step, false);
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- The gig waits at an "Attorney decides" step: no submission while one is asked and unanswered; the last milestone needs all approved
create or replace function dela_submission_create(p_person uuid, p_milestone uuid, p jsonb) returns jsonb language plpgsql as $$
declare m milestones; a agreements; v_n int; v_id uuid; f uuid; av agreement_versions; v_files uuid[];
begin
  select * into m from milestones where id = p_milestone for update;
  if m.id is null or dela_agreement_role(p_person, 'freelancer', m.agreement_id) <> 'freelancer' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select id into v_id from milestone_submissions where milestone_id = m.id and request_id = p->>'request_id';
  if v_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_id); end if;
  if m.status not in ('in_progress', 'changes_requested', 'funded') and not exists (select 1 from milestone_submissions s where s.milestone_id = m.id and s.status = 'failed' and s.n = (select max(n) from milestone_submissions where milestone_id = m.id)) then
    return jsonb_build_object('ok', false, 'reason', 'not_now');
  end if;
  if exists (select 1 from milestone_submissions s where s.milestone_id = m.id and s.status in ('checking', 'with_attorney', 'human_review')) then return jsonb_build_object('ok', false, 'reason', 'already_submitted'); end if;
  if exists (select 1 from engagement_checkpoints c where c.agreement_id = m.agreement_id and c.status = 'requested') then return jsonb_build_object('ok', false, 'reason', 'waiting_for_attorney'); end if;
  if not exists (select 1 from milestones x where x.agreement_id = m.agreement_id and x.seq > m.seq and x.status not in ('canceled', 'refunded'))
     and exists (select 1 from engagement_checkpoints c where c.agreement_id = m.agreement_id and c.status <> 'approved') then
    return jsonb_build_object('ok', false, 'reason', 'attorney_decision_needed');
  end if;
  if length(trim(coalesce(p->>'statement', ''))) < 10 then return jsonb_build_object('ok', false, 'reason', 'statement_needed'); end if;
  v_files := array(select (x #>> '{}')::uuid from jsonb_array_elements(coalesce(p->'files', '[]')) x limit 10);
  foreach f in array v_files loop
    if not exists (select 1 from files fi where fi.id = f and fi.uploaded_by = p_person and fi.purpose = 'deliverable' and fi.status = 'ready') then return jsonb_build_object('ok', false, 'reason', 'file_not_usable'); end if;
  end loop;
  select * into a from agreements where id = m.agreement_id;
  select * into av from agreement_versions where agreement_id = a.id and version = m.from_version;
  select coalesce(max(n), 0) + 1 into v_n from milestone_submissions where milestone_id = m.id;
  insert into milestone_submissions (milestone_id, n, statement, checklist, files, rubric, rubric_hash, request_id, submitted_by)
  values (m.id, v_n, left(p->>'statement', 6000), coalesce(p->'checklist', '[]'), v_files,
    coalesce((select r from jsonb_array_elements(av.body->'rubric') r where (r->>'milestone_seq')::int = m.seq limit 1)->'criteria', av.body->'rubric_all', '[]'), av.body_hash, coalesce(p->>'request_id', gen_random_uuid()::text), p_person)
  returning id into v_id;
  update milestones set status = 'submitted', updated_at = now() where id = m.id;
  return jsonb_build_object('ok', true, 'id', v_id, 'n', v_n);
end $$;

-- The gig's document (the version the gig was posted from), for the engagement's checkpoints
create or replace function dela_agreement_doc(p_agreement uuid) returns jsonb language sql stable as $$
  select v.body from agreements a join gigs g on g.id = a.gig_id join playbook_versions v on v.playbook_id = g.playbook_id and v.version = g.playbook_version where a.id = p_agreement
$$;

-- The Lawfecta Team's view of the conversion and the document library
create or replace function dela_admin_documents(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  return jsonb_build_object('switches', (select jsonb_object_agg(key, state) from feature_switches where key in ('document_standard', 'document_conversion')),
    'by_type', (select coalesce(jsonb_object_agg(coalesce(doc_type, 'not converted'), c), '{}') from (select doc_type, count(*) c from playbooks where status not in ('deleted') group by doc_type) x),
    'converted', (select count(*) from playbooks where converted_at is not null), 'waiting', (select count(*) from playbooks where doc_type is null and status not in ('deleted')),
    'not_checked_by_owner', (select count(*) from playbooks where converted_at is not null and conversion_seen_at is null),
    'blocked', (select count(*) from playbooks where doc_type is not null and blocking > 0 and status not in ('deleted', 'trash')),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'doc_id', p.doc_id, 'title', p.title, 'doc_type', p.doc_type, 'note', p.conversion_note, 'firm', o.name, 'at', p.converted_at) order by p.converted_at desc), '[]')
      from (select * from playbooks where converted_at is not null order by converted_at desc limit 30) p join organizations o on o.id = p.org_id));
end $$;

-- The agreement's facts: the rubric's quality checks come from a document's Quality check and Done when
create or replace function dela_doc_quality(p_body jsonb) returns jsonb language sql immutable as $$
  select case when p_body->>'schema' = '2' then coalesce(p_body->'quality_check', '[]') || case when coalesce(p_body->>'done_when', '') <> '' then jsonb_build_array('Done when: ' || (p_body->>'done_when')) else '[]'::jsonb end
    else coalesce(p_body->'checks', '[]') end
$$;

do $$
declare src text;
begin
  -- Point dela_agreement_facts at dela_doc_quality without copying the whole function: swap the one expression
  select pg_get_functiondef('dela_agreement_facts(uuid, text, uuid)'::regprocedure) into src;
  if position('coalesce(pbv->''checks'', ''[]'')' in src) > 0 then
    execute replace(src, 'coalesce(pbv->''checks'', ''[]'')', 'dela_doc_quality(pbv)');
  end if;
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

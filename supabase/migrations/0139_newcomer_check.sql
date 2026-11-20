-- Step 55 (docs/briefs/step-55-newcomer-check.md): the newcomer check. DELA reads a document as a freelancer who has
-- never worked with the firm and lists what that person would not know. The result is kept per document version, so
-- it is read without running the AI again, and it never blocks approval, export or a gig. Additive.
-- The switch "handoff_kit" covers this step and the four that follow it (assign a part, what the freelancer needs,
-- the freelancer's preview, feedback after a job). It is off until Stacey turns it on.

insert into feature_switches (key, label, gate) values ('handoff_kit', 'Handoff kit: the newcomer check on documents, assigning a part of a document, what the freelancer needs before starting, the freelancer preview, and feedback after a job (steps 55 to 59)', 'Stacey turns it on for the pilot after ChatGPT check 15')
on conflict (key) do nothing;

create table if not exists doc_newcomer_checks (
  playbook_id uuid not null references playbooks(id) on delete cascade,
  version int not null,
  ready boolean not null default false,
  findings jsonb not null default '[]',
  summary text not null default '',
  source text not null default '',
  created_by uuid not null references people(id),
  created_at timestamptz not null default now(),
  primary key (playbook_id, version)
);
alter table doc_newcomer_checks enable row level security;

-- What the document page needs: the check of the version being worked on, and whether the approved version passed
create or replace function dela_doc_newcomer_get(p_person uuid, p_playbook uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare x playbooks; v_role text; c doc_newcomer_checks; a doc_newcomer_checks;
begin
  select * into x from playbooks where id = p_playbook;
  v_role := case when x.id is null then null else dela_pb_role(p_person, x.org_id) end;
  if v_role is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('handoff_kit', p_person) then return jsonb_build_object('ok', true, 'on', false); end if;
  select * into c from doc_newcomer_checks where playbook_id = x.id and version = x.current_version;
  select * into a from doc_newcomer_checks where playbook_id = x.id and version = x.approved_version;
  return jsonb_build_object('ok', true, 'on', true, 'can_run', dela_pb_rank(v_role) >= 3, 'version', x.current_version,
    'check', case when c.playbook_id is null then null else jsonb_build_object('version', c.version, 'ready', c.ready, 'findings', c.findings, 'summary', c.summary, 'created_at', c.created_at) end,
    'approved_ready', case when a.playbook_id is null then null else a.ready end,
    'out_of_date', c.playbook_id is null and exists (select 1 from doc_newcomer_checks o where o.playbook_id = x.id));
end $$;
revoke all on function dela_doc_newcomer_get(uuid, uuid) from public, anon, authenticated;

create or replace function dela_doc_newcomer_save(p_person uuid, p_playbook uuid, p_version int, p jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare x playbooks; v_role text;
begin
  select * into x from playbooks where id = p_playbook;
  v_role := case when x.id is null then null else dela_pb_role(p_person, x.org_id) end;
  if v_role is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_pb_rank(v_role) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if not exists (select 1 from playbook_versions v where v.playbook_id = x.id and v.version = p_version) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  insert into doc_newcomer_checks (playbook_id, version, ready, findings, summary, source, created_by)
    values (x.id, p_version, coalesce((p->>'ready')::boolean, false), coalesce(p->'findings', '[]'), left(coalesce(p->>'summary', ''), 400), left(coalesce(p->>'source', ''), 40), p_person)
    on conflict (playbook_id, version) do update set ready = excluded.ready, findings = excluded.findings, summary = excluded.summary, source = excluded.source, created_by = excluded.created_by, created_at = now();
  perform dela_audit('member', p_person, 'doc_newcomer_checked', 'playbook', x.id::text, jsonb_build_object('version', p_version, 'ready', coalesce((p->>'ready')::boolean, false), 'findings', jsonb_array_length(coalesce(p->'findings', '[]'))));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_doc_newcomer_save(uuid, uuid, int, jsonb) from public, anon, authenticated;

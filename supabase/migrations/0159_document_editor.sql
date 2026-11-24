-- Step 80: the what-you-see-is-what-you-get editor for documents (Stacey 2026-11-24: "Playbooks need to be edited like
-- a what-you-see-is-what-you-get type of editor because attorneys are not technical people and they don't have time
-- to learn a new system"; docs/briefs/step-80-playbook-editor.md).
-- The editor saves by itself. Saved versions never change (playbook_versions is append-only), so what a member is
-- typing is kept as their own working copy: one row for each member and document, replaced as they type, and turned
-- into a real version when they save, send for review, or leave the document. Nobody else reads it.
-- Additive: one switch (off), one table, three functions.

insert into feature_switches (key, label, gate) values ('document_editor_v2', 'Edit a document in place, as it will read: click any text, drag steps, drop images, saved as you type (step 80)', 'Stacey asked for it 2026-11-24; built in three releases (80a to 80c)')
on conflict (key) do nothing;

create table if not exists playbook_working (
  playbook_id uuid not null references playbooks(id),
  person_id uuid not null references people(id),
  base_version int not null,
  body jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (playbook_id, person_id)
);
alter table playbook_working enable row level security;

-- Keep what the member is typing. The same rights as saving a version, checked at this moment.
create or replace function dela_pb_working_set(p_person uuid, p_id uuid, p_base int, p_body jsonb) returns jsonb
language plpgsql set search_path = public, extensions, pg_temp as $$
declare x playbooks;
begin
  select * into x from playbooks where id = p_id;
  if x.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_pb_rank(dela_pb_role(p_person, x.org_id)) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if x.status in ('trash', 'archived', 'deleted') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if not dela_switch_on('document_editor_v2', p_person) then return jsonb_build_object('ok', false, 'reason', 'editor_off'); end if;
  if jsonb_typeof(p_body) <> 'object' or pg_column_size(p_body) > 2000000 then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  insert into playbook_working (playbook_id, person_id, base_version, body) values (p_id, p_person, p_base, p_body)
  on conflict (playbook_id, person_id) do update set base_version = excluded.base_version, body = excluded.body, updated_at = now();
  return jsonb_build_object('ok', true, 'current_version', x.current_version, 'stale', p_base is distinct from x.current_version, 'saved_at', now());
end $$;
revoke all on function dela_pb_working_set(uuid, uuid, int, jsonb) from public, anon, authenticated;

-- The member's own working copy, if they may still edit the document
create or replace function dela_pb_working_get(p_person uuid, p_id uuid) returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('base_version', w.base_version, 'body', w.body, 'updated_at', w.updated_at, 'stale', w.base_version is distinct from p.current_version)
  from playbook_working w join playbooks p on p.id = w.playbook_id
  where w.playbook_id = p_id and w.person_id = p_person and dela_pb_rank(dela_pb_role(p_person, p.org_id)) >= 3
$$;
revoke all on function dela_pb_working_get(uuid, uuid) from public, anon, authenticated;

-- After a save, or when the member throws their changes away
create or replace function dela_pb_working_clear(p_person uuid, p_id uuid) returns void
language sql set search_path = public, extensions, pg_temp as $$
  delete from playbook_working where playbook_id = p_id and person_id = p_person
$$;
revoke all on function dela_pb_working_clear(uuid, uuid) from public, anon, authenticated;

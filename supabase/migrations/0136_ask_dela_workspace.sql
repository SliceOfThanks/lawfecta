-- Step 45 (docs/briefs/step-45-ask-dela-chat-first-workspace.md): Ask DELA as a chat-first workspace.
-- A chat can use documents the member chose from the firm's Library, and a chat can become a draft that stays linked
-- to it. Everything here is additive. Nothing changes for a member until the switch ask_dela_workspace is on.

insert into feature_switches (key, label, gate) values ('ask_dela_workspace', 'Ask DELA workspace: choose Library documents for a chat, create a draft from a chat, one next question with choices (step 45)', 'Stacey turns it on after ChatGPT check 12')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('ai.chat_context_documents', '3', 'Library documents a member may choose for one Ask DELA chat', 'Files and AI', 'documents', 'C', 'Stacey 2026-11-19 (step 45)', 'Each chosen document is sent to the AI with every message of that chat, so more documents make answers slower.')
on conflict (key) do nothing;

-- The documents chosen for a chat. A row says "this chat may use this document"; whether the member may still read the
-- document is checked again every time it is used.
create table if not exists ai_chat_docs (
  chat_id uuid not null references ai_chats(id) on delete cascade,
  playbook_id uuid not null references playbooks(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (chat_id, playbook_id)
);
alter table ai_chat_docs enable row level security;
revoke all on ai_chat_docs from public, anon, authenticated;

-- A draft started from a chat keeps the chat it came from. The chat belongs to one person, so only that person is
-- shown the link. Deleting the chat clears it.
alter table playbooks add column if not exists from_chat uuid references ai_chats(id) on delete set null;
create index if not exists playbooks_from_chat on playbooks (from_chat) where from_chat is not null;

-- The Library documents a member may choose for a chat: documents with an approved version in every library where the
-- member has a role (the approved version is what DELA gets, also while a newer draft is being edited), and documents
-- that were never approved only for an editor or the administrator (Stacey 2026-11-19: drafts too, labeled, chosen by someone
-- who may edit). Never another firm's.
create or replace function dela_ai_chat_docs_available(p_person uuid, p_side text) returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  with orgs as (
    select o.id from organizations o where o.owner_person_id = p_person
    union select r.org_id from library_roles r where r.person_id = p_person and r.removed_at is null
    union select dela_side_org(p_person, p_side)
  ), mine as (
    select o.id, dela_pb_rank(dela_pb_role(p_person, o.id)) as rank from orgs o where o.id is not null
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'doc_type', p.doc_type, 'doc_id', p.doc_id,
      'approved', p.approved_version is not null,
      'version', coalesce(p.approved_version, p.current_version),
      'status', p.status) order by (p.approved_version is not null) desc, p.title), '[]')
  from playbooks p join mine m on m.id = p.org_id
  where m.rank >= 1 and p.status in ('approved', 'draft', 'in_review')
    and (p.approved_version is not null or m.rank >= 3)
$$;
revoke all on function dela_ai_chat_docs_available(uuid, text) from public, anon, authenticated;

-- Sets the documents of a chat to exactly p_docs and returns what the AI may be given now. Each document is checked at
-- this moment: the chat is the member's own, the member has a role in the document's library, the document is approved
-- or (for an editor) a draft, and the count is inside the setting. A document that fails is left out and named in
-- "dropped". A document with an approved version gives that version; one never approved gives its current version, marked not approved.
create or replace function dela_ai_chat_docs_sync(p_person uuid, p_side text, p_chat uuid, p_docs uuid[]) returns jsonb
language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_max int := greatest(coalesce(dela_int_setting('ai.chat_context_documents', 3), 3), 0);
  v_keep uuid[] := '{}'; v_drop uuid[] := '{}'; d uuid; p playbooks; v_rank int; v_out jsonb := '[]'; v_ver int; v_body jsonb;
begin
  if not exists (select 1 from ai_chats where id = p_chat and person_id = p_person and side = p_side and archived_at is null) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  foreach d in array coalesce(p_docs, '{}') loop
    if d = any(v_keep) or d = any(v_drop) then continue; end if;
    select * into p from playbooks where id = d;
    v_rank := case when p.id is null then 0 else coalesce(dela_pb_rank(dela_pb_role(p_person, p.org_id)), 0) end;
    if p.id is null or v_rank < 1 or cardinality(v_keep) >= v_max or p.status not in ('approved', 'draft', 'in_review')
       or not (p.approved_version is not null or v_rank >= 3) then
      v_drop := v_drop || d; continue;
    end if;
    v_ver := coalesce(p.approved_version, p.current_version);
    select body into v_body from playbook_versions where playbook_id = p.id and version = v_ver;
    if v_body is null then v_drop := v_drop || d; continue; end if;
    v_keep := v_keep || d;
    v_out := v_out || jsonb_build_object('id', p.id, 'title', p.title, 'doc_type', p.doc_type, 'doc_id', p.doc_id, 'version', v_ver,
      'approved', p.approved_version is not null, 'body', v_body);
  end loop;
  delete from ai_chat_docs where chat_id = p_chat and not (playbook_id = any(v_keep));
  insert into ai_chat_docs (chat_id, playbook_id) select p_chat, x from unnest(v_keep) x on conflict do nothing;
  return jsonb_build_object('ok', true, 'docs', v_out, 'dropped', to_jsonb(v_drop), 'max', v_max);
end $$;
revoke all on function dela_ai_chat_docs_sync(uuid, text, uuid, uuid[]) from public, anon, authenticated;

-- What a chat shows beside its messages: the documents chosen for it (without their text, and only those the member
-- may still read) and the drafts that were started from it.
create or replace function dela_ai_chat_side(p_person uuid, p_side text, p_chat uuid) returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  select case when c.id is null then null else jsonb_build_object(
    'docs', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'doc_type', p.doc_type, 'doc_id', p.doc_id,
        'approved', p.approved_version is not null,
        'version', coalesce(p.approved_version, p.current_version),
        'usable', p.status in ('approved', 'draft', 'in_review') and (p.approved_version is not null or dela_pb_rank(dela_pb_role(p_person, p.org_id)) >= 3)) order by d.added_at), '[]')
      from ai_chat_docs d join playbooks p on p.id = d.playbook_id
      where d.chat_id = c.id and coalesce(dela_pb_rank(dela_pb_role(p_person, p.org_id)), 0) >= 1),
    'drafts', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'doc_type', p.doc_type, 'status', p.status) order by p.created_at), '[]')
      from playbooks p where p.from_chat = c.id and p.status not in ('trash', 'deleted') and coalesce(dela_pb_rank(dela_pb_role(p_person, p.org_id)), 0) >= 1),
    'max', greatest(coalesce(dela_int_setting('ai.chat_context_documents', 3), 3), 0)) end
  from (select * from ai_chats where id = p_chat and person_id = p_person and side = p_side and archived_at is null) c
$$;
revoke all on function dela_ai_chat_side(uuid, text, uuid) from public, anon, authenticated;

-- Links a draft to the chat it was started from. Only the chat's own person, only a document they may edit, and only
-- once: a document keeps the first chat it came from. The chat is then kept (it counts as saved), because the draft
-- points to it.
create or replace function dela_ai_chat_link(p_person uuid, p_side text, p_chat uuid, p_playbook uuid) returns jsonb
language plpgsql set search_path = public, extensions, pg_temp as $$
declare p playbooks;
begin
  if not exists (select 1 from ai_chats where id = p_chat and person_id = p_person and side = p_side and archived_at is null) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  select * into p from playbooks where id = p_playbook for update;
  if p.id is null or coalesce(dela_pb_rank(dela_pb_role(p_person, p.org_id)), 0) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p.from_chat is not null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update playbooks set from_chat = p_chat where id = p_playbook;
  update ai_chats set saved_at = coalesce(saved_at, now()) where id = p_chat;
  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;
revoke all on function dela_ai_chat_link(uuid, text, uuid, uuid) from public, anon, authenticated;

-- The chat a document was started from, for the person who owns that chat and nobody else.
create or replace function dela_pb_from_chat(p_person uuid, p_playbook uuid) returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce((select jsonb_build_object('chat_id', c.id, 'title', c.title, 'side', c.side)
    from playbooks p join ai_chats c on c.id = p.from_chat
    where p.id = p_playbook and c.person_id = p_person and c.archived_at is null
      and coalesce(dela_pb_rank(dela_pb_role(p_person, p.org_id)), 0) >= 1), 'null'::jsonb)
$$;
revoke all on function dela_pb_from_chat(uuid, uuid) from public, anon, authenticated;

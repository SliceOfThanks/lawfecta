-- Step 78: an Ask DELA answer keeps what it was built from (Stacey's mockup of 2026-11-23, "Ask DELA / active
-- conversation": "Ground answers in selected sources. Show source title, version and specific steps.";
-- docs/briefs/step-78-ask-dela-conversation.md).
-- The api checks every source in code before it is saved here: the documents are the ones really sent to the AI, and
-- a task's step number is a real step of one of them. The page reads it back with the chat, so the sources still show
-- when the member opens the chat again.
-- Additive: one column, one function, and dela_ai_chat_get returns the new column too.

alter table ai_messages add column if not exists meta jsonb not null default '{}'::jsonb;

create or replace function dela_ai_message_meta_set(p_chat uuid, p_message bigint, p_meta jsonb) returns void language sql set search_path = public, extensions, pg_temp as $$
  update ai_messages set meta = coalesce(p_meta, '{}'::jsonb)
  where id = p_message and chat_id = p_chat and role = 'assistant' and meta = '{}'::jsonb and pg_column_size(coalesce(p_meta, '{}'::jsonb)) < 20000
$$;
revoke all on function dela_ai_message_meta_set(uuid, bigint, jsonb) from public, anon, authenticated;

create or replace function dela_ai_chat_get(p_person uuid, p_side text, p_chat uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select case when c.id is null then null else jsonb_build_object('id', c.id, 'title', c.title,
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'role', m.role, 'content', m.content, 'file_ids', m.file_ids, 'source', m.source, 'created_at', m.created_at, 'meta', m.meta,
        'files', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name)), '[]') from files f where f.id = any(m.file_ids))) order by m.id)
      from ai_messages m where m.chat_id = c.id), '[]')) end
  from (select * from ai_chats where id = p_chat and person_id = p_person and side = p_side and archived_at is null) c
$$;

-- The playbooks a member may choose for a chat now also say when each was last changed, so the source picker can show
-- the most recent ones first (Stacey 2026-11-23: "only show the most recent 3-5"). Same rows, same rights, same order.
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
      'status', p.status, 'updated_at', p.updated_at) order by (p.approved_version is not null) desc, p.title), '[]')
  from playbooks p join mine m on m.id = p.org_id
  where m.rank >= 1 and p.status in ('approved', 'draft', 'in_review')
    and (p.approved_version is not null or m.rank >= 3)
$$;
revoke all on function dela_ai_chat_docs_available(uuid, text) from public, anon, authenticated;

-- Step 79: screenshots a member put into an Ask DELA chat go with the playbook draft made from that chat
-- (Stacey 2026-11-24: "The user also needs to be able to upload screenshots so that it can be added to the playbook
-- because visuals are very important in a playbook"; docs/briefs/step-79-message-box-buttons-screenshots.md).
-- This lists the picture files of one chat: the member's own chat, files of the firm that owns the new draft, checked
-- and ready. The api turns each into a document image with the function that exists (dela_doc_image_legacy).
-- Additive: one function.
create or replace function dela_ai_chat_images(p_person uuid, p_side text, p_chat uuid, p_org uuid) returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name) order by x.first_at, x.place), '[]')
  from (
    select f.id, f.name, min(m.id) as first_at, min(u.ord) as place
    from ai_chats c join ai_messages m on m.chat_id = c.id
    cross join lateral unnest(m.file_ids) with ordinality as u(file_id, ord)
    join files f on f.id = u.file_id
    where c.id = p_chat and c.person_id = p_person and c.side = p_side and c.archived_at is null
      and f.org_id = p_org and f.ext in ('png', 'jpg') and f.status = 'ready'
    group by f.id, f.name
  ) x
$$;
revoke all on function dela_ai_chat_images(uuid, text, uuid, uuid) from public, anon, authenticated;

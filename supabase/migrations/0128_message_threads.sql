-- Step 32 (Stacey's Inbox and messages brief of 2026-11-17, second round): replies in a thread, a quick preview in the
-- Inbox, and "Remove" limited to the same 15 minutes as "Edit".
--   messages.reply_to: a reply in a thread points to the message it answers. One level only: a reply cannot itself
--     be replied to in a thread, and the parent must be in the same conversation.
--   dela_message_send: takes reply_to and refuses a parent that is gone, in another conversation, or itself a reply.
--   dela_thread_get: each message says what it replies to, and how many replies it has that this member may see.
--   dela_message_remove: after chat.edit_minutes (15) the sender can no longer remove a message. The Lawfecta Team
--     still can, through its own tools.
--   dela_threads: each conversation also carries the day it started, for a conversation with no messages yet.
--   dela_thread_peek: the newest messages of a conversation for the Inbox's quick preview. It does not mark the
--     conversation as read.
-- Additive: one column, one index, one new function; four functions gain fields or one more check.
alter table messages add column if not exists reply_to uuid references messages(id);
create index if not exists messages_reply_to on messages (reply_to) where reply_to is not null;

do $$
declare v_def text; v_new text;
begin
  -- Sending: a reply in a thread
  v_def := pg_get_functiondef('dela_message_send(uuid, text, uuid, jsonb)'::regprocedure);
  if position('v_reply' in v_def) = 0 then
    v_new := replace(v_def, 'v_held boolean := coalesce((p->>''held'')::boolean, false);',
      'v_held boolean := coalesce((p->>''held'')::boolean, false); v_reply uuid := case when coalesce(p->>''reply_to'', '''') ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' then (p->>''reply_to'')::uuid end;');
    if v_new = v_def then raise exception 'dela_message_send: first anchor not found'; end if;
    v_def := v_new;
    v_new := replace(v_def, 'insert into messages (thread_id, sender, side, body, attachments, status, warned, request_id)',
      'if v_reply is not null and not exists (select 1 from messages pm where pm.id = v_reply and pm.thread_id = p_thread and pm.reply_to is null and pm.status <> ''removed'' and (pm.status = ''sent'' or pm.sender = p_person)) then
    return jsonb_build_object(''ok'', false, ''reason'', ''reply_parent_gone'');
  end if;
  insert into messages (thread_id, sender, side, body, attachments, status, warned, request_id, reply_to)');
    if v_new = v_def then raise exception 'dela_message_send: second anchor not found'; end if;
    v_def := v_new;
    v_new := replace(v_def, 'gen_random_uuid()::text))', 'gen_random_uuid()::text), v_reply)');
    if v_new = v_def then raise exception 'dela_message_send: third anchor not found'; end if;
    execute v_new;
  end if;

  -- Reading a conversation: what a message replies to, and its replies
  v_def := pg_get_functiondef('dela_thread_get(uuid, text, uuid)'::regprocedure);
  if position('''reply_to''' in v_def) = 0 then
    v_new := replace(v_def, '''status'', m.status, ''warned''',
      '''reply_to'', m.reply_to, ''replies'', (select count(*) from messages r where r.reply_to = m.id and r.status <> ''removed'' and (r.status <> ''held'' or r.sender = p_person)), ''status'', m.status, ''warned''');
    if v_new = v_def then raise exception 'dela_thread_get: first anchor not found'; end if;
    v_def := v_new;
    v_new := replace(v_def, '''thread'', jsonb_build_object(''id'', t.id,', '''thread'', jsonb_build_object(''id'', t.id, ''created_at'', t.created_at,');
    if v_new = v_def then raise exception 'dela_thread_get: second anchor not found'; end if;
    execute v_new;
  end if;

  -- Removing: the same 15 minutes as editing
  v_def := pg_get_functiondef('dela_message_remove(uuid, uuid)'::regprocedure);
  if position('edit_time_over' in v_def) = 0 then
    v_new := replace(v_def, 'if m.status = ''removed'' then return jsonb_build_object(''ok'', true, ''duplicate'', true); end if;',
      'if m.status = ''removed'' then return jsonb_build_object(''ok'', true, ''duplicate'', true); end if;
  if m.created_at < now() - make_interval(mins => dela_int_setting(''chat.edit_minutes'', 15)) then return jsonb_build_object(''ok'', false, ''reason'', ''edit_time_over''); end if;');
    if v_new = v_def then raise exception 'dela_message_remove: anchor not found'; end if;
    execute v_new;
  end if;

  -- The Inbox list: when the conversation started
  v_def := pg_get_functiondef('dela_threads(uuid, text)'::regprocedure);
  if position('''created_at'', t.created_at' in v_def) = 0 then
    v_new := replace(v_def, '''gig_id'', t.gig_id, ''bench_id'', t.bench_id,', '''gig_id'', t.gig_id, ''bench_id'', t.bench_id, ''created_at'', t.created_at,');
    if v_new = v_def then raise exception 'dela_threads: anchor not found'; end if;
    execute v_new;
  end if;
end $$;
revoke all on function dela_message_send(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function dela_thread_get(uuid, text, uuid) from public, anon, authenticated;
revoke all on function dela_message_remove(uuid, uuid) from public, anon, authenticated;
revoke all on function dela_threads(uuid, text) from public, anon, authenticated;

create or replace function dela_thread_peek(p_person uuid, p_side text, p_thread uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_role text := dela_thread_role(p_person, p_side, p_thread); t threads; c jsonb;
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into t from threads where id = p_thread;
  c := dela_thread_ctx(p_thread);
  return jsonb_build_object('ok', true, 'role', v_role,
    'thread', jsonb_build_object('id', t.id, 'kind', c->>'kind', 'gig_id', t.gig_id, 'gig_title', c->>'title', 'created_at', t.created_at, 'freelancer_person', t.freelancer_person,
      'other_name', case when v_role = 'attorney' then dela_person_name(t.freelancer_person, 'freelancer') else dela_person_name((c->>'attorney')::uuid, 'attorney') end),
    'total', (select count(*) from messages m where m.thread_id = p_thread and m.status <> 'removed' and (m.status = 'sent' or m.sender = p_person)),
    'messages', coalesce((select jsonb_agg(x order by x->>'created_at') from (
      select jsonb_build_object('id', m.id, 'mine', m.sender = p_person, 'body', left(m.body, 400), 'status', m.status, 'created_at', m.created_at, 'reply', m.reply_to is not null,
        'files', cardinality(m.attachments)) x
      from messages m where m.thread_id = p_thread and m.status <> 'removed' and (m.status = 'sent' or m.sender = p_person)
      order by m.created_at desc limit 3) y), '[]'));
end $$;
revoke all on function dela_thread_peek(uuid, text, uuid) from public, anon, authenticated;

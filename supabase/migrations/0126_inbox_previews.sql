-- Step 30 (Stacey's Inbox and messaging brief of 2026-11-17): the Inbox list shows a preview of the newest message
-- in each conversation. dela_threads returns two more fields for each conversation:
--   last_text: the first 160 characters of the newest message this member may see (a sent message, or their own
--     message that is still being checked; never a removed message, never the other person's held message)
--   last_mine: whether that message is the member's own
-- Additive: two more fields; nothing is removed. Safe to run twice.
do $$
declare v_def text; v_new text;
begin
  v_def := pg_get_functiondef('dela_threads(uuid, text)'::regprocedure);
  if position('''last_text''' in v_def) = 0 then
    v_new := replace(v_def, '''last_at'', (select max(m.created_at)',
      '''last_text'', (select left(regexp_replace(m.body, ''\s+'', '' '', ''g''), 160) from messages m where m.thread_id = t.id and (m.status = ''sent'' or (m.sender = p_person and m.status <> ''removed'')) order by m.created_at desc limit 1),
      ''last_mine'', (select m.sender = p_person from messages m where m.thread_id = t.id and (m.status = ''sent'' or (m.sender = p_person and m.status <> ''removed'')) order by m.created_at desc limit 1),
      ''last_at'', (select max(m.created_at)');
    if v_new = v_def then raise exception 'dela_threads: anchor not found'; end if;
    execute v_new;
  end if;
end $$;
revoke all on function dela_threads(uuid, text) from public, anon, authenticated;

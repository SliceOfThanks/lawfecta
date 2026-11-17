-- Step 31 (Stacey's Notifications brief of 2026-11-17): a Notifications page with a history the member can manage.
--   notifications.dismissed_at: a dismissed notification leaves the panel and the main lists; it stays in the history
--     under "Dismissed" and can be restored. Dismissing also marks it read. Nothing is ever deleted.
--   dela_notifications (the panel): now leaves dismissed ones out and says which are dismissed (always false there).
--   dela_notifications_page: the member's history for the page, newest first, dismissed ones included.
--   dela_notifications_set: mark as read, mark as unread, dismiss or restore, for a list of the member's own notifications.
-- Additive: one column, two new functions, one function returns one more field.
alter table notifications add column if not exists dismissed_at timestamptz;

create or replace function dela_notifications(p_person uuid, p_limit int default 30) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]') from (
    select jsonb_build_object('id', id, 'kind', kind, 'title', title, 'body', body, 'link', link, 'essential', essential,
                              'created_at', created_at, 'read', read_at is not null, 'dismissed', false) as x
    from notifications where person_id = p_person and channel = 'in_app' and dismissed_at is null
    order by created_at desc limit least(greatest(p_limit, 1), 100)) t
$$;
revoke all on function dela_notifications(uuid, int) from public, anon, authenticated;

create or replace function dela_notifications_page(p_person uuid, p_limit int default 300) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('ok', true,
    'total', (select count(*) from notifications where person_id = p_person and channel = 'in_app'),
    'items', coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
      select jsonb_build_object('id', id, 'kind', kind, 'title', title, 'body', body, 'link', link, 'essential', essential,
                                'created_at', created_at, 'read', read_at is not null, 'dismissed', dismissed_at is not null) as x
      from notifications where person_id = p_person and channel = 'in_app'
      order by created_at desc limit least(greatest(p_limit, 1), 500)) t), '[]'))
$$;
revoke all on function dela_notifications_page(uuid, int) from public, anon, authenticated;

create or replace function dela_notifications_set(p_person uuid, p_ids jsonb, p_action text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_n int := 0; v_ids uuid[];
begin
  if p_action not in ('read', 'unread', 'dismiss', 'restore') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  select coalesce(array_agg((x #>> '{}')::uuid), '{}') into v_ids
  from jsonb_array_elements(case when jsonb_typeof(p_ids) = 'array' then p_ids else '[]' end) x
  where (x #>> '{}') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  if coalesce(array_length(v_ids, 1), 0) = 0 or array_length(v_ids, 1) > 500 then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  with u as (
    update notifications set
      read_at = case p_action when 'read' then coalesce(read_at, now()) when 'dismiss' then coalesce(read_at, now()) when 'unread' then null else read_at end,
      dismissed_at = case p_action when 'dismiss' then coalesce(dismissed_at, now()) when 'restore' then null else dismissed_at end
    where person_id = p_person and channel = 'in_app' and id = any(v_ids) returning 1)
  select count(*)::int into v_n from u;
  return jsonb_build_object('ok', true, 'count', v_n);
end $$;
revoke all on function dela_notifications_set(uuid, jsonb, text) from public, anon, authenticated;

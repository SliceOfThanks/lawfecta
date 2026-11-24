-- Step 84: Events, the first tab of Community (Stacey 2026-11-24, with a picture of the Community page: "For the post
-- type setting events, there should be a page that shows up here. It should be the first tab", for attorneys,
-- freelancers and agencies, filtered by the event categories, a card view and a list view, and an event that opens
-- with its information and its buttons; docs/briefs/step-84-events.md).
-- Events are written on the website (post type "Event"). DELA copies them with the promotions and articles it already
-- copies, and reads the category list from that post type's own settings, so Stacey changes the categories on the
-- website only. Text is cleaned of markup and contact details before it is stored; the event's own link is kept as a
-- button, and only when it starts with https.
-- Additive: one setting, one more value for a kind, eight columns, two columns of state, one function replaced with
-- the same answer plus events, two new functions. Behind the switches master_pages and community, as the Blog is.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('bd.events_data_id', '8'::jsonb, 'Website post type shown as Events in Community', 'Community', '', 'C', 'Read from the website 2026-11-24: 8 is "Event"', '0 turns Events off.')
on conflict (key) do nothing;

alter table bd_posts drop constraint if exists bd_posts_kind_check;
alter table bd_posts add constraint bd_posts_kind_check check (kind in ('promotion', 'article', 'event'));
alter table bd_posts add column if not exists starts_on date;
alter table bd_posts add column if not exists start_time text not null default '';
alter table bd_posts add column if not exists end_time text not null default '';
alter table bd_posts add column if not exists venue text not null default '';
alter table bd_posts add column if not exists location text not null default '';
alter table bd_posts add column if not exists link text not null default '';
alter table bd_posts add column if not exists price text not null default '';
alter table bd_posts add column if not exists image text not null default '';
create index if not exists bd_posts_events on bd_posts (starts_on) where kind = 'event';

alter table bd_posts_state add column if not exists event_topics jsonb not null default '[]';
alter table bd_posts_state add column if not exists event_topics_ok boolean not null default false;

-- The api hands over what it read, now with events. A kind the website answered for is replaced whole; a kind it did
-- not answer for keeps its last good copy. A kind the api did not ask about (not in p.ok at all) is left alone.
create or replace function dela_posts_sync(p jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_kind text; v_all boolean := true; v_any boolean := false; v_n int := 0;
  v_topics jsonb := case when jsonb_typeof(p->'topics') = 'array' then p->'topics' end;
  v_events jsonb := case when jsonb_typeof(p->'event_topics') = 'array' then p->'event_topics' end;
  v_day text := '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'; v_clock text := '^[0-9]{2}:[0-9]{2}$';
begin
  foreach v_kind in array array['promotion', 'article', 'event'] loop
    if not (coalesce(p->'ok', '{}'::jsonb) ? v_kind) then continue; end if;
    if coalesce((p->'ok'->>v_kind)::boolean, false) then
      v_any := true;
      delete from bd_posts where kind = v_kind and post_id not in (
        select (x->>'post_id')::bigint from jsonb_array_elements(case when jsonb_typeof(p->'posts') = 'array' then p->'posts' else '[]' end) x where x->>'kind' = v_kind and (x->>'post_id') ~ '^[0-9]{1,15}$');
      insert into bd_posts (post_id, kind, bd_member_id, title, body, code, category, posted_on, ends_on, starts_on, start_time, end_time, venue, location, link, price, image, synced_at)
      select (x->>'post_id')::bigint, v_kind, (x->>'bd')::bigint, left(x->>'title', 200), left(coalesce(x->>'body', ''), 6500), left(coalesce(x->>'code', ''), 80), left(btrim(coalesce(x->>'category', '')), 80),
        case when (x->>'posted') ~ v_day then (x->>'posted')::date end, case when (x->>'ends') ~ v_day then (x->>'ends')::date end, case when (x->>'starts') ~ v_day then (x->>'starts')::date end,
        case when (x->>'start_time') ~ v_clock then x->>'start_time' else '' end, case when (x->>'end_time') ~ v_clock then x->>'end_time' else '' end,
        left(coalesce(x->>'venue', ''), 160), left(coalesce(x->>'location', ''), 300), case when (x->>'link') ~* '^https://[^[:space:]<>"]+$' then left(x->>'link', 500) else '' end,
        left(coalesce(x->>'price', ''), 60), case when (x->>'image') ~ '^/[A-Za-z0-9._/-]+$' then left(x->>'image', 300) else '' end, now()
      from jsonb_array_elements(case when jsonb_typeof(p->'posts') = 'array' then p->'posts' else '[]' end) x
      where x->>'kind' = v_kind and (x->>'post_id') ~ '^[0-9]{1,15}$' and (x->>'bd') ~ '^[0-9]{1,15}$' and btrim(coalesce(x->>'title', '')) <> ''
      on conflict (post_id) do update set kind = excluded.kind, bd_member_id = excluded.bd_member_id, title = excluded.title, body = excluded.body, code = excluded.code,
        category = excluded.category, posted_on = excluded.posted_on, ends_on = excluded.ends_on, starts_on = excluded.starts_on, start_time = excluded.start_time, end_time = excluded.end_time,
        venue = excluded.venue, location = excluded.location, link = excluded.link, price = excluded.price, image = excluded.image, synced_at = now();
    else
      v_all := false;
    end if;
  end loop;
  insert into bd_posts_state (id, ok, error, tried_at, fetched_at, topics, topics_ok, event_topics, event_topics_ok)
  values (1, v_all, left(coalesce(p->>'error', ''), 200), now(), case when v_any then now() end, coalesce(v_topics, '[]'), v_topics is not null, coalesce(v_events, '[]'), v_events is not null)
  on conflict (id) do update set ok = excluded.ok, error = excluded.error, tried_at = now(), fetched_at = coalesce(excluded.fetched_at, bd_posts_state.fetched_at),
    topics = case when v_topics is not null then v_topics else bd_posts_state.topics end, topics_ok = case when v_topics is not null then true else bd_posts_state.topics_ok end,
    event_topics = case when v_events is not null then v_events else bd_posts_state.event_topics end, event_topics_ok = case when v_events is not null then true else bd_posts_state.event_topics_ok end;
  select count(*) into v_n from bd_posts;
  return jsonb_build_object('ok', v_all, 'posts', v_n, 'topics', v_topics is not null, 'event_topics', v_events is not null);
end $$;
revoke all on function dela_posts_sync(jsonb) from public, anon, authenticated;

-- The website's category list for events, without the placeholders a new site comes with. When the list could not be
-- read, the categories are the ones the coming events carry.
create or replace function dela_event_topics() returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select case when coalesce((select event_topics_ok from bd_posts_state where id = 1), false)
    then coalesce((select jsonb_agg(t order by o) from (select distinct on (lower(btrim(t))) btrim(t) t, o from jsonb_array_elements_text((select event_topics from bd_posts_state where id = 1)) with ordinality x(t, o)
      where btrim(t) <> '' and btrim(t) !~* '^category [0-9]+$' order by lower(btrim(t)), o) u), '[]')
    else coalesce((select jsonb_agg(c order by c) from (select distinct b.category c from bd_posts b
      where b.kind = 'event' and b.category <> '' and b.category !~* '^category [0-9]+$' and coalesce(b.ends_on, b.starts_on, current_date) >= current_date) u), '[]') end
$$;
revoke all on function dela_event_topics() from public, anon, authenticated;

-- Events for every member with Community: the ones still to come (or going on), soonest first, with one filter, the
-- category. An event shows whoever on the website posted it. The organizer is named only as "Lawfecta" (posted by the
-- Lawfecta Team) or as a freelancer who shows in Talent search (the api shortens the name); otherwise only the venue shows.
create or replace function dela_events_list(p_person uuid, p_side text, p jsonb) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_topic text := btrim(coalesce(p->>'topic', '')); v_topics jsonb; v_past boolean := coalesce((p->>'past')::boolean, false);
  v_limit int := least(greatest(coalesce(nullif(p->>'limit', '')::int, dela_int_setting('master.page_size', 12)), 1), 50);
  v_offset int := greatest(coalesce(nullif(p->>'offset', '')::int, 0), 0);
begin
  if not dela_master_may(p_person, p_side, 'blog') then return jsonb_build_object('ok', false, 'reason', 'not_open'); end if;
  if dela_int_setting('bd.events_data_id', 8) = 0 then return jsonb_build_object('ok', false, 'reason', 'not_open'); end if;
  v_topics := dela_event_topics();
  if v_topic <> '' and not exists (select 1 from jsonb_array_elements_text(v_topics) t where lower(t) = lower(v_topic)) then v_topic := ''; end if;
  return (with f as (
    select b.*, pe.id person_id, case when exists (select 1 from jsonb_array_elements_text(v_topics) t where lower(t) = lower(b.category)) then b.category else '' end topic,
      coalesce(b.ends_on, b.starts_on) < current_date gone
    from bd_posts b left join people pe on pe.bd_member_id = b.bd_member_id
    where b.kind = 'event' and b.starts_on is not null and (v_topic = '' or lower(b.category) = lower(v_topic))
      and ((not v_past and coalesce(b.ends_on, b.starts_on) >= current_date) or (v_past and coalesce(b.ends_on, b.starts_on) < current_date))
  ) select jsonb_build_object('ok', true, 'total', (select count(*) from f), 'limit', v_limit, 'offset', v_offset, 'topics', v_topics, 'topic', v_topic, 'past', v_past,
      'past_count', (select count(*) from bd_posts b where b.kind = 'event' and b.starts_on is not null and coalesce(b.ends_on, b.starts_on) < current_date),
      'fetched_at', (select fetched_at from bd_posts_state where id = 1), 'website_ok', coalesce((select ok from bd_posts_state where id = 1), false),
      'events', (select coalesce(jsonb_agg(t.x order by t.n), '[]') from (
        select coalesce(case when f.person_id is not null and dela_talent_shown(f.person_id) then dela_master_person(f.person_id) end, '{}'::jsonb)
            || jsonb_build_object('post_id', f.post_id, 'title', f.title, 'text', f.body, 'topic', f.topic, 'starts', f.starts_on, 'ends', f.ends_on, 'start_time', f.start_time, 'end_time', f.end_time,
              'venue', f.venue, 'location', f.location, 'link', f.link, 'price', f.price, 'image', f.image, 'gone', f.gone,
              'by_lawfecta', f.person_id is not null and dela_is_staff(f.person_id), 'mine', f.person_id = p_person) x,
          row_number() over (order by case when v_past then f.starts_on end desc, f.starts_on asc, f.start_time asc, f.post_id) n
        from f order by n limit v_limit offset v_offset) t)));
end $$;
revoke all on function dela_events_list(uuid, text, jsonb) from public, anon, authenticated;

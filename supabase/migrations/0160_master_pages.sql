-- Step 83: three master pages (Stacey 2026-11-24: "Need a master pages for all active plans (not claim listings)
-- (1) services (2) promotions page that attorneys can filter & sort (by top category, sub, and sub category)
-- (3) community blog by order of posting and able to filter by topic"; docs/briefs/step-83-master-pages.md).
-- Whose content shows: the freelancers who show in Talent search, and nobody else. A member on a claim listing has no
-- DELA workspace, so they are never in it. Attorneys see all three pages; freelancers see the blog.
-- Promotions and articles are written on the website. DELA keeps a copy (bd_posts) that a background job refreshes,
-- so a page never asks the website about every member. Blog topics are the website's own list for the post type
-- ("Post Categories" in the post type's settings); Stacey changes them there and DELA reads the list with the posts.
-- Additive: one switch (off), two settings, two tables, eight functions. Nothing is changed or removed.

insert into feature_switches (key, label, gate) values ('master_pages', 'Services and Promotions pages under Talent, and the Blog in Community (step 83)', 'Stacey asked for it 2026-11-24')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('posts.refresh_minutes', '60'::jsonb, 'How often DELA copies promotions and articles from the website for the Promotions page and the Blog', 'Community', 'minutes', 'C', 'Claude 2026-11-24 (step 83)', 'Between 5 and 1440. The page says when the copy was last refreshed.'),
  ('master.page_size', '12'::jsonb, 'Cards shown at a time on Services, Promotions and the Blog, before "Load more"', 'Community', 'cards', 'C', 'Claude 2026-11-24 (step 83)', 'Between 1 and 50.')
on conflict (key) do nothing;

-- The copy of the website's promotions and articles. Text is cleaned of markup and contact details before it is stored.
create table if not exists bd_posts (
  post_id bigint primary key,
  kind text not null check (kind in ('promotion', 'article')),
  bd_member_id bigint not null,
  title text not null,
  body text not null default '',
  code text not null default '',
  category text not null default '',
  posted_on date,
  ends_on date,
  synced_at timestamptz not null default now()
);
alter table bd_posts enable row level security;
create index if not exists bd_posts_kind on bd_posts (kind, posted_on desc);
create index if not exists bd_posts_member on bd_posts (bd_member_id);

-- When the copy was last tried and last read, and the website's topic list for articles (one row)
create table if not exists bd_posts_state (
  id int primary key check (id = 1),
  ok boolean not null default false,
  error text not null default '',
  tried_at timestamptz,
  fetched_at timestamptz,
  topics jsonb not null default '[]',
  topics_ok boolean not null default false
);
alter table bd_posts_state enable row level security;

-- Is the copy there, and is it due? Staleness counts from the last try, so a website that does not answer is not asked on every page.
create or replace function dela_posts_state() returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce((select jsonb_build_object('empty', tried_at is null, 'ok', ok, 'fetched_at', fetched_at, 'tried_at', tried_at,
    'stale', tried_at is null or tried_at < now() - make_interval(mins => least(greatest(dela_int_setting('posts.refresh_minutes', 60), 5), 1440))) from bd_posts_state where id = 1),
    jsonb_build_object('empty', true, 'ok', false, 'fetched_at', null, 'tried_at', null, 'stale', true))
$$;
revoke all on function dela_posts_state() from public, anon, authenticated;

-- The api hands over what it read. A kind the website answered for is replaced whole (a post taken down there leaves
-- here too); a kind it did not answer for keeps its last good copy.
create or replace function dela_posts_sync(p jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_kind text; v_all boolean := true; v_any boolean := false; v_n int := 0;
  v_topics jsonb := case when jsonb_typeof(p->'topics') = 'array' then p->'topics' end;
begin
  foreach v_kind in array array['promotion', 'article'] loop
    if coalesce((p->'ok'->>v_kind)::boolean, false) then
      v_any := true;
      delete from bd_posts where kind = v_kind and post_id not in (
        select (x->>'post_id')::bigint from jsonb_array_elements(case when jsonb_typeof(p->'posts') = 'array' then p->'posts' else '[]' end) x where x->>'kind' = v_kind and (x->>'post_id') ~ '^[0-9]{1,15}$');
      insert into bd_posts (post_id, kind, bd_member_id, title, body, code, category, posted_on, ends_on, synced_at)
      select (x->>'post_id')::bigint, v_kind, (x->>'bd')::bigint, left(x->>'title', 200), left(coalesce(x->>'body', ''), 6500), left(coalesce(x->>'code', ''), 80), left(btrim(coalesce(x->>'category', '')), 80),
        case when (x->>'posted') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then (x->>'posted')::date end, case when (x->>'ends') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then (x->>'ends')::date end, now()
      from jsonb_array_elements(case when jsonb_typeof(p->'posts') = 'array' then p->'posts' else '[]' end) x
      where x->>'kind' = v_kind and (x->>'post_id') ~ '^[0-9]{1,15}$' and (x->>'bd') ~ '^[0-9]{1,15}$' and btrim(coalesce(x->>'title', '')) <> ''
      on conflict (post_id) do update set kind = excluded.kind, bd_member_id = excluded.bd_member_id, title = excluded.title, body = excluded.body, code = excluded.code,
        category = excluded.category, posted_on = excluded.posted_on, ends_on = excluded.ends_on, synced_at = now();
    else
      v_all := false;
    end if;
  end loop;
  insert into bd_posts_state (id, ok, error, tried_at, fetched_at, topics, topics_ok)
  values (1, v_all, left(coalesce(p->>'error', ''), 200), now(), case when v_any then now() end, coalesce(v_topics, '[]'), v_topics is not null)
  on conflict (id) do update set ok = excluded.ok, error = excluded.error, tried_at = now(), fetched_at = coalesce(excluded.fetched_at, bd_posts_state.fetched_at),
    topics = case when v_topics is not null then v_topics else bd_posts_state.topics end, topics_ok = case when v_topics is not null then true else bd_posts_state.topics_ok end;
  select count(*) into v_n from bd_posts;
  return jsonb_build_object('ok', v_all, 'posts', v_n, 'topics', v_topics is not null);
end $$;
revoke all on function dela_posts_sync(jsonb) from public, anon, authenticated;

-- Does this freelancer show in Talent search right now? The same rule as dela_talent_search, kept in one place for the
-- master pages (supabase/tests/master_pages_test.sql holds the two to the same answer).
create or replace function dela_talent_shown(p_person uuid) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select exists (select 1 from side_profiles sp join member_profiles mp on mp.person_id = sp.person_id and mp.side = 'freelancer' join people pe on pe.id = sp.person_id
    where sp.person_id = p_person and sp.side = 'freelancer' and sp.status = 'active' and sp.readiness_state = 'match_ready' and pe.status = 'active' and not dela_has_hold(sp.person_id)
      and mp.availability <> 'unavailable' and mp.availability_confirmed_at > now() - make_interval(days => dela_int_setting('profile.availability_days', 14)))
$$;
revoke all on function dela_talent_shown(uuid) from public, anon, authenticated;

-- The provider on a card. The api shortens the name to a first name and last initial, as everywhere.
create or replace function dela_master_person(p_person uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('person_id', mp.person_id, 'name', dela_freelancer_name(mp.person_id), 'headline', coalesce(mp.body->>'headline', ''), 'photo_file', mp.body->>'photo_file', 'avatar', mp.body->>'avatar',
    'categories', coalesce((select jsonb_agg(c.key order by o) from jsonb_array_elements_text(case when jsonb_typeof(mp.body->'categories') = 'array' then mp.body->'categories' else '[]' end) with ordinality k(key, o)
      join bd_categories c on c.key = k.key and c.active), '[]'))
  from member_profiles mp where mp.person_id = p_person and mp.side = 'freelancer'
$$;
revoke all on function dela_master_person(uuid) from public, anon, authenticated;

-- A category fits a provider who picked it or anything below it (the Talent search's rule)
create or replace function dela_person_in_category(p_person uuid, p_cat text) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(p_cat, '') = '' or exists (select 1 from member_profiles mp, jsonb_array_elements_text(case when jsonb_typeof(mp.body->'categories') = 'array' then mp.body->'categories' else '[]' end) k
    join bd_categories c on c.key = k and c.active
    where mp.person_id = p_person and mp.side = 'freelancer' and (c.key = p_cat or c.parent_key = p_cat or c.top_key = p_cat))
$$;
revoke all on function dela_person_in_category(uuid, text) from public, anon, authenticated;

-- May this member, on this side, open this page? Checked on every call.
create or replace function dela_master_may(p_person uuid, p_side text, p_page text) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select dela_switch_on('master_pages', p_person)
    and exists (select 1 from side_profiles sp where sp.person_id = p_person and sp.side = p_side and sp.status <> 'closed')
    and case when p_page in ('services', 'promotions') then p_side = 'attorney' and dela_switch_on('talent_search', p_person)
      when p_page = 'blog' then p_side in ('attorney', 'freelancer') and dela_switch_on('community', p_person) else false end
$$;
revoke all on function dela_master_may(uuid, text, text) from public, anon, authenticated;

-- Services: one row for each service of each freelancer who shows in Talent search
create or replace function dela_services_list(p_person uuid, p_side text, p jsonb) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_cat text := coalesce(p->>'category', ''); v_q text := lower(btrim(coalesce(p->>'q', ''))); v_unit text := coalesce(p->>'unit', ''); v_sort text := coalesce(p->>'sort', '');
  v_max bigint := case when (p->>'max_cents') ~ '^[0-9]{1,12}$' then (p->>'max_cents')::bigint end;
  v_limit int := least(greatest(coalesce(nullif(p->>'limit', '')::int, dela_int_setting('master.page_size', 12)), 1), 50);
  v_offset int := greatest(coalesce(nullif(p->>'offset', '')::int, 0), 0);
begin
  if not dela_master_may(p_person, p_side, 'services') then return jsonb_build_object('ok', false, 'reason', 'not_open'); end if;
  if v_cat <> '' and not exists (select 1 from bd_categories where key = v_cat and active) then return jsonb_build_object('ok', false, 'reason', 'category_gone'); end if;
  return (with m as (
    select mp.person_id, mp.updated_at, s.o, left(btrim(coalesce(s.x->>'title', '')), 120) title, left(btrim(coalesce(s.x->>'for_whom', '')), 300) for_whom,
      case when (s.x->>'price_from_cents') ~ '^[0-9]{1,12}$' then (s.x->>'price_from_cents')::bigint end pf, case when (s.x->>'price_to_cents') ~ '^[0-9]{1,12}$' then (s.x->>'price_to_cents')::bigint end pt,
      case when s.x->>'unit' = 'hour' then 'hour' else 'fixed' end unit
    from member_profiles mp, jsonb_array_elements(case when jsonb_typeof(mp.body->'services') = 'array' then mp.body->'services' else '[]' end) with ordinality s(x, o)
    where mp.side = 'freelancer' and mp.person_id <> p_person and dela_talent_shown(mp.person_id) and dela_person_in_category(mp.person_id, v_cat)
      and btrim(coalesce(s.x->>'title', '')) <> ''
  ), f as (
    select * from m where (v_q = '' or lower(title || ' ' || for_whom) like '%' || v_q || '%') and (v_unit not in ('hour', 'fixed') or unit = v_unit)
      and (v_max is null or (coalesce(pf, pt) is not null and coalesce(pf, pt) <= v_max))
  ) select jsonb_build_object('ok', true, 'total', (select count(*) from f), 'limit', v_limit, 'offset', v_offset,
      'services', (select coalesce(jsonb_agg(t.x order by t.n), '[]') from (
        select dela_master_person(f.person_id) || jsonb_build_object('no', f.o, 'title', f.title, 'for_whom', f.for_whom, 'price_from_cents', f.pf, 'price_to_cents', f.pt, 'unit', f.unit, 'updated_at', f.updated_at) x,
          row_number() over (order by case when v_sort = 'price_low' then coalesce(f.pf, f.pt) end asc nulls last, case when v_sort = 'price_high' then coalesce(f.pt, f.pf) end desc nulls last,
            f.updated_at desc, f.person_id, f.o) n
        from f order by n limit v_limit offset v_offset) t)));
end $$;
revoke all on function dela_services_list(uuid, text, jsonb) from public, anon, authenticated;

-- Promotions: every promotion that has not ended, from freelancers who show in Talent search
create or replace function dela_promotions_list(p_person uuid, p_side text, p jsonb) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_cat text := coalesce(p->>'category', ''); v_q text := lower(btrim(coalesce(p->>'q', ''))); v_sort text := coalesce(p->>'sort', '');
  v_limit int := least(greatest(coalesce(nullif(p->>'limit', '')::int, dela_int_setting('master.page_size', 12)), 1), 50);
  v_offset int := greatest(coalesce(nullif(p->>'offset', '')::int, 0), 0);
begin
  if not dela_master_may(p_person, p_side, 'promotions') then return jsonb_build_object('ok', false, 'reason', 'not_open'); end if;
  if v_cat <> '' and not exists (select 1 from bd_categories where key = v_cat and active) then return jsonb_build_object('ok', false, 'reason', 'category_gone'); end if;
  return (with f as (
    select b.*, pe.id person_id from bd_posts b join people pe on pe.bd_member_id = b.bd_member_id
    where b.kind = 'promotion' and (b.ends_on is null or b.ends_on >= current_date) and pe.id <> p_person and dela_talent_shown(pe.id) and dela_person_in_category(pe.id, v_cat)
      and (v_q = '' or lower(b.title || ' ' || b.body) like '%' || v_q || '%')
  ) select jsonb_build_object('ok', true, 'total', (select count(*) from f), 'limit', v_limit, 'offset', v_offset,
      'fetched_at', (select fetched_at from bd_posts_state where id = 1), 'website_ok', coalesce((select ok from bd_posts_state where id = 1), false),
      'promotions', (select coalesce(jsonb_agg(t.x order by t.n), '[]') from (
        select dela_master_person(f.person_id) || jsonb_build_object('post_id', f.post_id, 'title', f.title, 'text', f.body, 'code', f.code, 'ends', f.ends_on, 'posted', f.posted_on) x,
          row_number() over (order by case when v_sort = 'ending' then f.ends_on end asc nulls last, f.posted_on desc nulls last, f.post_id desc) n
        from f order by n limit v_limit offset v_offset) t)));
end $$;
revoke all on function dela_promotions_list(uuid, text, jsonb) from public, anon, authenticated;

-- The website's topic list for articles, without the placeholders a new site comes with ("Category 1"). When the list
-- could not be read, the topics are the ones the shown articles carry.
create or replace function dela_blog_topics() returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select case when coalesce((select topics_ok from bd_posts_state where id = 1), false)
    then coalesce((select jsonb_agg(t order by o) from (select distinct on (lower(btrim(t))) btrim(t) t, o from jsonb_array_elements_text((select topics from bd_posts_state where id = 1)) with ordinality x(t, o)
      where btrim(t) <> '' and btrim(t) !~* '^category [0-9]+$' order by lower(btrim(t)), o) u), '[]')
    else coalesce((select jsonb_agg(c order by c) from (select distinct b.category c from bd_posts b join people pe on pe.bd_member_id = b.bd_member_id
      where b.kind = 'article' and b.category <> '' and b.category !~* '^category [0-9]+$' and dela_talent_shown(pe.id)) u), '[]') end
$$;
revoke all on function dela_blog_topics() from public, anon, authenticated;

-- The blog: every published article in order of posting, newest first, with one filter, the topic
create or replace function dela_blog_list(p_person uuid, p_side text, p jsonb) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_topic text := btrim(coalesce(p->>'topic', '')); v_topics jsonb;
  v_limit int := least(greatest(coalesce(nullif(p->>'limit', '')::int, dela_int_setting('master.page_size', 12)), 1), 50);
  v_offset int := greatest(coalesce(nullif(p->>'offset', '')::int, 0), 0);
begin
  if not dela_master_may(p_person, p_side, 'blog') then return jsonb_build_object('ok', false, 'reason', 'not_open'); end if;
  v_topics := dela_blog_topics();
  if v_topic <> '' and not exists (select 1 from jsonb_array_elements_text(v_topics) t where lower(t) = lower(v_topic)) then v_topic := ''; end if;
  return (with f as (
    select b.*, pe.id person_id, case when exists (select 1 from jsonb_array_elements_text(v_topics) t where lower(t) = lower(b.category)) then b.category else '' end topic
    from bd_posts b join people pe on pe.bd_member_id = b.bd_member_id
    where b.kind = 'article' and exists (select 1 from member_profiles mp where mp.person_id = pe.id and mp.side = 'freelancer') and (dela_talent_shown(pe.id) or pe.id = p_person) and (v_topic = '' or lower(b.category) = lower(v_topic))
  ) select jsonb_build_object('ok', true, 'total', (select count(*) from f), 'limit', v_limit, 'offset', v_offset, 'topics', v_topics, 'topic', v_topic,
      'fetched_at', (select fetched_at from bd_posts_state where id = 1), 'website_ok', coalesce((select ok from bd_posts_state where id = 1), false),
      'articles', (select coalesce(jsonb_agg(t.x order by t.n), '[]') from (
        select dela_master_person(f.person_id) || jsonb_build_object('post_id', f.post_id, 'title', f.title, 'text', f.body, 'topic', f.topic, 'posted', f.posted_on, 'mine', f.person_id = p_person) x,
          row_number() over (order by f.posted_on desc nulls last, f.post_id desc) n
        from f order by n limit v_limit offset v_offset) t)));
end $$;
revoke all on function dela_blog_list(uuid, text, jsonb) from public, anon, authenticated;

-- Step 17 (docs/briefs/step-17-talent-categories.md): Talent search by the website's categories.
--   bd_categories: DELA's copy of the Lawfecta website's member categories. Keys are 'p<profession_id>' for a top category
--     and 's<service_id>' for a sub category; a sub sub category is a sub category whose parent_key is another sub category.
--   bd_category_syncs: one row per copy from the website (or a failed try), for the admin card.
--   Freelancers keep the categories they work in on their profile (body.categories, a list of 's...' keys).
--   dela_talent_search takes a category (any level; a higher level also finds everyone below it) and free words (q).
-- Additive: two tables, three settings, new functions, dela_talent_search and dela_maybe_queue_daily extended.

create table if not exists bd_categories (
  key text primary key check (key ~ '^[ps][0-9]+$'),
  kind text not null check (kind in ('top', 'sub')),
  bd_id int not null,
  top_key text not null,
  parent_key text,
  name text not null,
  slug text not null default '',
  sort int not null default 0,
  active boolean not null default true,
  synced_at timestamptz not null default now()
);
alter table bd_categories enable row level security;
create index if not exists bd_categories_top on bd_categories (top_key) where active;
create index if not exists bd_categories_parent on bd_categories (parent_key) where active;

create table if not exists bd_category_syncs (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  ok boolean not null,
  source text not null default '',
  tops int not null default 0,
  subs int not null default 0,
  removed int not null default 0,
  error text not null default ''
);
alter table bd_category_syncs enable row level security;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('categories.refresh_hours', '24'::jsonb, 'How old DELA''s copy of the website''s categories may get before it is copied again', 'Profiles and verification', 'hours', 'R',
    'Claude 2026-11-12 (step 17 default)', 'DELA also copies the categories once a day and when the team clicks "Refresh now" on the Tech catalog page.'),
  ('profile.categories_max', '25'::jsonb, 'The most website categories one freelancer can pick on their profile', 'Profiles and verification', 'categories', 'R',
    'Claude 2026-11-12 (step 17 default)', 'Keeps search results honest: a freelancer cannot pick every category to show up everywhere.'),
  ('bd.push_categories', 'false'::jsonb, 'Saving a freelancer profile also writes their categories to their website listing', 'Profiles and verification', '', 'O',
    'Open question for Stacey (step 17 question 1)', 'When on, the listing gets the top category of the first category picked and all picked categories as its sub categories.')
on conflict (key) do nothing;

-- A copy from the website. p = {source, tops: [{id, name, slug, sort}], subs: [{id, top, parent, name, slug, sort}]}.
-- An answer with no top categories never empties the lists (an outage looks the same); it is recorded as failed.
create or replace function dela_categories_sync(p jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_now timestamptz := now(); v_tops int; v_subs int; v_removed int; v_err text := left(coalesce(p->>'error', ''), 300);
begin
  if v_err <> '' or jsonb_typeof(p->'tops') <> 'array' or jsonb_array_length(p->'tops') = 0 then
    insert into bd_category_syncs (ok, source, error) values (false, left(coalesce(p->>'source', ''), 20), case when v_err <> '' then v_err else 'no_top_categories' end);
    return jsonb_build_object('ok', false, 'reason', case when v_err <> '' then 'website_refused' else 'no_top_categories' end, 'error', v_err);
  end if;
  insert into bd_categories as c (key, kind, bd_id, top_key, parent_key, name, slug, sort, active, synced_at)
  select 'p' || (t->>'id')::int, 'top', (t->>'id')::int, 'p' || (t->>'id')::int, null, left(trim(t->>'name'), 200), left(coalesce(t->>'slug', ''), 200), coalesce((t->>'sort')::int, 0), true, v_now
  from jsonb_array_elements(p->'tops') t where coalesce(t->>'id', '') ~ '^[0-9]+$' and trim(coalesce(t->>'name', '')) <> ''
  on conflict (key) do update set name = excluded.name, slug = excluded.slug, sort = excluded.sort, active = true, synced_at = v_now;
  insert into bd_categories as c (key, kind, bd_id, top_key, parent_key, name, slug, sort, active, synced_at)
  select 's' || (s->>'id')::int, 'sub', (s->>'id')::int, 'p' || (s->>'top')::int,
    case when coalesce(s->>'parent', '0') ~ '^[0-9]+$' and (s->>'parent')::int > 0 then 's' || (s->>'parent')::int end,
    left(trim(s->>'name'), 200), left(coalesce(s->>'slug', ''), 200), coalesce((s->>'sort')::int, 0), true, v_now
  from jsonb_array_elements(coalesce(p->'subs', '[]')) s
  where coalesce(s->>'id', '') ~ '^[0-9]+$' and coalesce(s->>'top', '') ~ '^[0-9]+$' and trim(coalesce(s->>'name', '')) <> ''
  on conflict (key) do update set top_key = excluded.top_key, parent_key = excluded.parent_key, name = excluded.name, slug = excluded.slug, sort = excluded.sort, active = true, synced_at = v_now;
  -- Gone from the website, or hanging under a top category or parent that is gone: not shown and not searched
  update bd_categories set active = false where active and synced_at < v_now;
  loop
    update bd_categories c set active = false where c.active and c.kind = 'sub' and (
      not exists (select 1 from bd_categories t where t.key = c.top_key and t.active)
      or (c.parent_key is not null and not exists (select 1 from bd_categories pa where pa.key = c.parent_key and pa.active and pa.top_key = c.top_key)));
    exit when not found;
  end loop;
  select count(*) filter (where kind = 'top' and active), count(*) filter (where kind = 'sub' and active), count(*) filter (where not active) into v_tops, v_subs, v_removed from bd_categories;
  insert into bd_category_syncs (ok, source, tops, subs, removed) values (true, left(coalesce(p->>'source', ''), 20), v_tops, v_subs, v_removed);
  return jsonb_build_object('ok', true, 'tops', v_tops, 'subs', v_subs, 'removed', v_removed);
end $$;
revoke all on function dela_categories_sync(jsonb) from public, anon, authenticated;

-- The lists for the screens: compact rows, in the website's order then by name
create or replace function dela_categories() returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('ok', true,
    'synced_at', (select max(at) from bd_category_syncs where ok),
    'stale', coalesce((select max(at) from bd_category_syncs where ok) < now() - make_interval(hours => dela_int_setting('categories.refresh_hours', 24)), true),
    'empty', not exists (select 1 from bd_categories where active),
    'max', dela_int_setting('profile.categories_max', 25),
    'tops', coalesce((select jsonb_agg(jsonb_build_array(key, name) order by sort, name) from bd_categories where active and kind = 'top'), '[]'),
    'subs', coalesce((select jsonb_agg(jsonb_build_array(key, top_key, parent_key, name) order by sort, name) from bd_categories where active and kind = 'sub'), '[]'))
$$;
revoke all on function dela_categories() from public, anon, authenticated;

-- A freelancer's picks, kept only when they are active sub categories, without repeats, in order, up to the setting
create or replace function dela_categories_clean(p_keys jsonb) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(k order by o), '[]') from (
    select k, min(o) o from jsonb_array_elements_text(case when jsonb_typeof(p_keys) = 'array' then p_keys else '[]' end) with ordinality x(k, o)
    where exists (select 1 from bd_categories c where c.key = x.k and c.active and c.kind = 'sub')
    group by k order by min(o) limit dela_int_setting('profile.categories_max', 25)) y
$$;
revoke all on function dela_categories_clean(jsonb) from public, anon, authenticated;

-- What the website listing gets when bd.push_categories is on: the first pick's top category and every pick as a sub category
create or replace function dela_categories_bd(p_keys jsonb) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('on', dela_setting_text('bd.push_categories', 'false') = 'true',
    'profession_id', (select t.bd_id::text from jsonb_array_elements_text(dela_categories_clean(p_keys)) with ordinality x(k, o)
      join bd_categories c on c.key = x.k join bd_categories t on t.key = c.top_key order by o limit 1),
    'services', (select string_agg(c.bd_id::text, ',' order by o) from jsonb_array_elements_text(dela_categories_clean(p_keys)) with ordinality x(k, o)
      join bd_categories c on c.key = x.k))
$$;
revoke all on function dela_categories_bd(jsonb) from public, anon, authenticated;

-- The Tech catalog page card: how many, when, and the last tries
create or replace function dela_admin_categories(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return jsonb_build_object('ok', true,
    'tops', (select count(*) from bd_categories where active and kind = 'top'),
    'subs', (select count(*) from bd_categories where active and kind = 'sub' and parent_key is null),
    'subsubs', (select count(*) from bd_categories where active and kind = 'sub' and parent_key is not null),
    'freelancers', (select count(*) from member_profiles where side = 'freelancer' and jsonb_typeof(body->'categories') = 'array' and jsonb_array_length(body->'categories') > 0),
    'refresh_hours', dela_int_setting('categories.refresh_hours', 24),
    'push', dela_setting_text('bd.push_categories', 'false') = 'true',
    'syncs', coalesce((select jsonb_agg(jsonb_build_object('at', at, 'ok', ok, 'source', source, 'tops', tops, 'subs', subs, 'error', error) order by at desc)
      from (select * from bd_category_syncs order by at desc limit 5) s), '[]'));
end $$;
revoke all on function dela_admin_categories(uuid) from public, anon, authenticated;

-- Talent: the step 4 filters stay (the connector uses them); category and q are new.
create or replace function dela_talent_search(p_person uuid, p jsonb) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_area text := coalesce(p->>'practice_area', ''); v_skill text := lower(coalesce(p->>'skill', '')); v_tool text := lower(coalesce(p->>'tool', '')); v_state text := upper(coalesce(p->>'state', ''));
  v_cat text := coalesce(p->>'category', ''); v_q text := lower(trim(coalesce(p->>'q', '')));
  v_days int := dela_int_setting('profile.availability_days', 14);
begin
  if not dela_switch_on('talent_search', p_person) then return jsonb_build_object('ok', false, 'reason', 'talent_off'); end if;
  if v_cat <> '' and not exists (select 1 from bd_categories where key = v_cat and active) then return jsonb_build_object('ok', false, 'reason', 'category_gone'); end if;
  return jsonb_build_object('ok', true, 'people', (select coalesce(jsonb_agg(x), '[]') from (
    select jsonb_build_object('person_id', sp.person_id, 'name', coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name),
      'headline', mp.body->>'headline', 'summary', left(coalesce(mp.body->>'summary', ''), 400), 'practice_areas', mp.body->'practice_areas', 'skills', mp.body->'skills',
      'software', mp.body->'software', 'timezone', mp.body->>'timezone', 'capacity_hours_week', mp.body->'capacity_hours_week', 'states_excluded', mp.body->'states_excluded',
      'categories', coalesce((select jsonb_agg(c.key order by o) from jsonb_array_elements_text(case when jsonb_typeof(mp.body->'categories') = 'array' then mp.body->'categories' else '[]' end) with ordinality k(key, o)
        join bd_categories c on c.key = k.key and c.active), '[]')) x
    from side_profiles sp join member_profiles mp on mp.person_id = sp.person_id and mp.side = 'freelancer' join people pe on pe.id = sp.person_id
    where sp.side = 'freelancer' and sp.status = 'active' and sp.readiness_state = 'match_ready' and sp.person_id <> p_person and not dela_has_hold(sp.person_id)
      and mp.availability <> 'unavailable' and mp.availability_confirmed_at > now() - make_interval(days => v_days)
      and (v_area = '' or mp.body->'practice_areas' ? v_area)
      and (v_skill = '' or exists (select 1 from jsonb_array_elements_text(coalesce(mp.body->'skills', '[]')) s where lower(s) like '%' || v_skill || '%')
        or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(mp.body->'services') = 'array' then mp.body->'services' else '[]' end) sv
          where lower(coalesce(sv->>'title', '') || ' ' || coalesce(sv->>'for_whom', '')) like '%' || v_skill || '%')
        or lower(coalesce(mp.body->>'headline', '') || ' ' || coalesce(mp.body->>'summary', '')) like '%' || v_skill || '%')
      and (v_tool = '' or exists (select 1 from jsonb_array_elements_text(coalesce(mp.body->'software', '[]')) s where lower(s) like '%' || v_tool || '%'))
      and (v_state = '' or not exists (select 1 from jsonb_array_elements_text(coalesce(mp.body->'states_excluded', '[]')) s where upper(s) = v_state))
      -- A category finds freelancers who picked it or anything below it
      and (v_cat = '' or exists (select 1 from jsonb_array_elements_text(case when jsonb_typeof(mp.body->'categories') = 'array' then mp.body->'categories' else '[]' end) k
        join bd_categories c on c.key = k and c.active
        where c.key = v_cat or c.parent_key = v_cat or c.top_key = v_cat))
      -- Free words: the profile's own words, software, practice areas and the names of the categories picked
      and (v_q = '' or lower(concat_ws(' ', mp.body->>'headline', mp.body->>'summary', mp.body->>'skills', mp.body->>'software', mp.body->>'practice_areas', mp.body->>'services',
          (select string_agg(c.name, ' ') from jsonb_array_elements_text(case when jsonb_typeof(mp.body->'categories') = 'array' then mp.body->'categories' else '[]' end) k
            join bd_categories c on c.key = k and c.active))) like '%' || v_q || '%')
    order by coalesce((dela_setting('matching.plan_boost') ->> sp.plan_code)::int, 0) desc, pe.last_seen_at desc nulls last limit 40) t));
end $$;
revoke all on function dela_talent_search(uuid, jsonb) from public, anon, authenticated;

-- The daily copy from the website joins the other daily jobs
do $mig$
declare v_def text; v_new text;
begin
  v_def := pg_get_functiondef('dela_maybe_queue_daily'::regproc);
  if position('categories_sync' in v_def) > 0 then return; end if;
  v_new := replace(v_def, $r$perform dela_job_enqueue('files_sweep', '{}', now(), 'files_sweep:' || local::date);$r$,
    $r$perform dela_job_enqueue('files_sweep', '{}', now(), 'files_sweep:' || local::date);
  perform dela_job_enqueue('categories_sync', '{"source":"daily"}', now(), 'categories_sync:' || local::date);$r$);
  if v_new = v_def then raise exception 'dela_maybe_queue_daily: files_sweep line not found'; end if;
  execute v_new;
end $mig$;

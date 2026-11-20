-- Step 70: categories on documents and gigs, and matching by category (Stacey 2026-11-20: "Lawfecta is back office,
-- the whole back office for law firms"). Until now a gig was matched by practice area, tools and skills, so a
-- bookkeeping or marketing gig had nothing to be matched by. A document and a gig now carry the same website
-- categories freelancers pick on their profile. A gig starts with its document's categories; the attorney can change
-- them. A freelancer in the same branch of the category tree (the category itself, one below it, or one above it)
-- fits better, and says why. A gig with categories no longer counts a freelancer outside them as a fit by default.
-- Additive: one switch, two settings, one column, functions, and four small changes inside dela_gig_match_refresh.

insert into feature_switches (key, label, gate) values ('gig_categories', 'Categories on documents and gigs, and matching freelancers by category (step 70)', 'Stacey asked for it 2026-11-20; on for everyone on the site after the release')
on conflict (key) do nothing;
insert into settings (key, value, label, section, unit, status, source, note) values
  ('gig.categories_max', '5'::jsonb, 'Categories one document or gig may carry', 'Gigs', 'categories', 'C', 'Claude 2026-11-20 (step 70)', ''),
  ('matching.category_points', '25'::jsonb, 'Points a freelancer gets for working in a gig''s category', 'Matching', 'points', 'C', 'Claude 2026-11-20 (step 70)', 'Out of 100. A practice area gives 30, each matching tool 10, each matching skill 7.'),
  ('matching.category_miss_base', '5'::jsonb, 'Starting points for a freelancer outside every category of a gig that has categories', 'Matching', 'points', 'C', 'Claude 2026-11-20 (step 70)', 'Without categories on the gig the starting points are 15.')
on conflict (key) do nothing;

alter table playbooks add column if not exists categories text[] not null default '{}';

-- Real, active category keys only, in the order given, up to gig.categories_max
create or replace function dela_gig_categories_clean(p_keys jsonb) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(k order by o), '[]') from (
    select k, min(o) o from jsonb_array_elements_text(case when jsonb_typeof(p_keys) = 'array' then p_keys else '[]' end) with ordinality x(k, o)
    where exists (select 1 from bd_categories c where c.key = x.k and c.active and c.kind = 'sub')
    group by k order by min(o) limit greatest(dela_int_setting('gig.categories_max', 5), 1)) y
$$;
revoke all on function dela_gig_categories_clean(jsonb) from public, anon, authenticated;

-- A category's branch: the keys themselves, what sits directly under each, and what each sits under
create or replace function dela_category_family(p_keys text[]) returns text[] language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(array_agg(distinct k), '{}') from (
    select unnest(coalesce(p_keys, '{}'::text[])) k
    union select c.key from bd_categories c where c.active and c.parent_key = any(coalesce(p_keys, '{}'::text[]))
    union select c.parent_key from bd_categories c where c.key = any(coalesce(p_keys, '{}'::text[])) and c.parent_key is not null) t
  where k is not null
$$;
revoke all on function dela_category_family(text[]) from public, anon, authenticated;

-- A document's categories: anyone who may read the document reads them; an editor sets them
create or replace function dela_pb_categories(p_person uuid, p_id uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select case when dela_pb_role(p_person, p.org_id) is null then null else to_jsonb(p.categories) end from playbooks p where p.id = p_id
$$;
revoke all on function dela_pb_categories(uuid, uuid) from public, anon, authenticated;
create or replace function dela_pb_categories_set(p_person uuid, p_id uuid, p_keys jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare x playbooks; v jsonb;
begin
  select * into x from playbooks where id = p_id for update;
  if x.id is null or dela_pb_role(p_person, x.org_id) is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_pb_rank(dela_pb_role(p_person, x.org_id)) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  v := dela_gig_categories_clean(p_keys);
  update playbooks set categories = array(select jsonb_array_elements_text(v)) where id = x.id;
  perform dela_pb_log(x.id, p_person, 'categories_set', x.current_version, jsonb_build_object('categories', v));
  return jsonb_build_object('ok', true, 'categories', v);
end $$;
revoke all on function dela_pb_categories_set(uuid, uuid, jsonb) from public, anon, authenticated;

create or replace function dela_patch(p_sig text, p_pairs text[]) returns void language plpgsql as $$
declare v_src text; v_new text; i int;
begin
  select pg_get_functiondef(p_sig::regprocedure) into v_src;
  v_new := v_src;
  for i in 1 .. array_length(p_pairs, 1) / 2 loop
    if position(p_pairs[i * 2] in v_new) > 0 and position(p_pairs[i * 2 - 1] in v_new) = 0 then continue; end if;
    if position(p_pairs[i * 2 - 1] in v_new) = 0 then raise exception '% changed; update 0151 (looking for: %)', p_sig, left(p_pairs[i * 2 - 1], 80); end if;
    v_new := replace(v_new, p_pairs[i * 2 - 1], p_pairs[i * 2]);
  end loop;
  if v_new <> v_src then execute v_new; end if;
end $$;

do $$ begin
  perform dela_patch('dela_gig_match_refresh(uuid)', array[
    'v_days int := dela_int_setting(''profile.availability_days'', 14); v_n int;',
    'v_days int := dela_int_setting(''profile.availability_days'', 14); v_n int; v_cats text[] := ''{}''; v_cat_pts int := dela_int_setting(''matching.category_points'', 25); v_cat_miss int := dela_int_setting(''matching.category_miss_base'', 5);',
    'v_skills := array(select lower(x) from jsonb_array_elements_text(coalesce(g.public->''skills'', ''[]'')) x);',
    'v_skills := array(select lower(x) from jsonb_array_elements_text(coalesce(g.public->''skills'', ''[]'')) x);
  -- Step 70: the gig''s categories with their branch; a freelancer who picked any of them works in the gig''s category
  if dela_switch_on(''gig_categories'', g.created_by) then
    v_cats := dela_category_family(array(select x from jsonb_array_elements_text(coalesce(g.public->''categories'', ''[]'')) x));
  end if;',
    'least(100, (case when v_area <> '''' then 30 else 15 end)',
    'least(100, (case when v_area <> '''' then 30 when v_cats <> ''{}'' and not exists (select 1 from jsonb_array_elements_text(coalesce(mp.body->''categories'', ''[]'')) k where k = any(v_cats)) then v_cat_miss else 15 end)
        + case when exists (select 1 from jsonb_array_elements_text(coalesce(mp.body->''categories'', ''[]'')) k where k = any(v_cats)) then v_cat_pts else 0 end',
    'nullif(v_area, ''''),',
    'nullif(v_area, ''''),
        (select ''Works in '' || c.name from jsonb_array_elements_text(coalesce(mp.body->''categories'', ''[]'')) k join bd_categories c on c.key = k where k = any(v_cats) limit 1),']);
end $$;
drop function if exists dela_patch(text, text[]);

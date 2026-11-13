-- Step 18 follow-up (Stacey 2026-11-13): Talent shows 10 freelancers at a time with "Load more" on the same screen.
--   Setting talent.page_size (10): how many a page holds.
--   dela_talent_search answers one page (limit, offset), the total that fit, and takes the sort order (most relevant,
--     most reviews, most hours a week, name), because the order now has to be the same across pages.
-- Additive: one setting; one function returns three more fields and no longer stops at 40.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('talent.page_size', '10'::jsonb, 'Freelancers shown at a time on Talent, before "Load more"', 'Platform rules decided by Stacey', 'freelancers', 'C',
    'Stacey 2026-11-13 (in chat: 10 at a time, load more on the same screen)', 'Between 1 and 50.')
on conflict (key) do nothing;

create or replace function dela_talent_search(p_person uuid, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $fn$
declare v_area text := coalesce(p->>'practice_area', ''); v_skill text := lower(coalesce(p->>'skill', '')); v_tool text := lower(coalesce(p->>'tool', '')); v_state text := upper(coalesce(p->>'state', ''));
  v_cat text := coalesce(p->>'category', ''); v_q text := lower(trim(coalesce(p->>'q', '')));
  v_days int := dela_int_setting('profile.availability_days', 14);
  v_limit int := least(greatest(coalesce(nullif(p->>'limit', '')::int, dela_int_setting('talent.page_size', 10)), 1), 50);
  v_offset int := greatest(coalesce(nullif(p->>'offset', '')::int, 0), 0); v_sort text := coalesce(p->>'sort', '');
begin
  if not dela_switch_on('talent_search', p_person) then return jsonb_build_object('ok', false, 'reason', 'talent_off'); end if;
  if v_cat <> '' and not exists (select 1 from bd_categories where key = v_cat and active) then return jsonb_build_object('ok', false, 'reason', 'category_gone'); end if;
  return (with m as (
    select coalesce((dela_setting('matching.plan_boost') ->> sp.plan_code)::int, 0) as boost, pe.last_seen_at as seen, jsonb_build_object('person_id', sp.person_id, 'name', coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name),
      'headline', mp.body->>'headline', 'summary', left(coalesce(mp.body->>'summary', ''), 400), 'practice_areas', mp.body->'practice_areas', 'skills', mp.body->'skills',
      'software', mp.body->'software', 'timezone', mp.body->>'timezone', 'capacity_hours_week', mp.body->'capacity_hours_week', 'states_excluded', mp.body->'states_excluded', 'photo_file', mp.body->>'photo_file', 'avatar', mp.body->>'avatar', 'verification', sp.verification_state, 'availability', mp.availability,
      'reviews', dela_review_summary(sp.person_id, 'freelancer'), 'firm_name', mp.body->>'firm_name',
      'categories', coalesce((select jsonb_agg(c.key order by o) from jsonb_array_elements_text(case when jsonb_typeof(mp.body->'categories') = 'array' then mp.body->'categories' else '[]' end) with ordinality k(key, o)
        join bd_categories c on c.key = k.key and c.active), '[]')) x
    from side_profiles sp join member_profiles mp on mp.person_id = sp.person_id and mp.side = 'freelancer' join people pe on pe.id = sp.person_id
    where sp.side = 'freelancer' and sp.status = 'active' and sp.readiness_state = 'match_ready' and sp.person_id <> p_person and not dela_has_hold(sp.person_id)
      and mp.availability <> 'unavailable' and mp.availability_confirmed_at > now() - make_interval(days => v_days)
      and (jsonb_typeof(p->'only') is distinct from 'array' or (p->'only') ? sp.person_id::text)
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
  ) select jsonb_build_object('ok', true, 'total', (select count(*) from m), 'limit', v_limit, 'offset', v_offset,
      'people', (select coalesce(jsonb_agg(t.x order by t.n), '[]') from (
        select m.x, row_number() over (order by case when v_sort = 'name' then lower(m.x->>'name') end asc nulls last,
          case when v_sort = 'reviews' then (m.x->'reviews'->>'count')::int end desc nulls last,
          case when v_sort = 'hours' then dela_fit_hours(m.x) end desc nulls last, m.boost desc, m.seen desc nulls last, m.x->>'person_id') n
        from m order by n limit v_limit offset v_offset) t)));
end $fn$;
revoke all on function dela_talent_search(uuid, jsonb) from public, anon, authenticated;

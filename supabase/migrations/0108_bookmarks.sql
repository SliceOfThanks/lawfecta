-- Step 18, bookmarks (docs/briefs/step-18-talent-marketplace.md, Stacey's decision 7 of 2026-11-12): an attorney saves a
-- freelancer for later through the bookmark system the Lawfecta website already has (Brilliant Directories table
-- users_favorite, API /api/v2/users_favorite). DELA keeps no bookmark table of its own. No notice to the freelancer.
--   Setting bd.bookmarks: on or off, and how the website marks a bookmarked member (dataType and featureId; from the
--     examples in Brilliant Directories' API reference, to confirm against a real bookmark on the site).
--   dela_bookmark_target: the website member number of a freelancer who can be bookmarked.
--   dela_bookmark_people: website member numbers back to DELA freelancers.
--   dela_talent_search takes "only": a list of people to keep (the "Bookmarked only" filter).
-- Additive: one setting, two functions, one function gets one more filter.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('bd.bookmarks', '{"on": true, "dataType": 10, "featureId": 1, "checked": 1}'::jsonb, 'Bookmarks through the website''s own bookmark system', 'Profiles and verification', '', 'R',
    'Stacey 2026-11-12 (Talent revision, decision 7); field values from Brilliant Directories'' API reference "User Favorites"', 'dataType 10 marks a bookmarked member; featureId is where the bookmark was made. The API key needs the Advanced API permission for users_favorite. Confirm both numbers with "Check the website''s bookmarks" after bookmarking one member on the website.')
on conflict (key) do nothing;

create or replace function dela_bookmark_target(p_viewer uuid, p_person uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce((select jsonb_build_object('ok', true, 'bd_member_id', pe.bd_member_id) from people pe join side_profiles sp on sp.person_id = pe.id and sp.side = 'freelancer' and sp.status <> 'closed'
    where pe.id = p_person and pe.id <> p_viewer and pe.bd_member_id is not null), jsonb_build_object('ok', false, 'reason', 'not_found'))
$$;
revoke all on function dela_bookmark_target(uuid, uuid) from public, anon, authenticated;

create or replace function dela_bookmark_people(p_bd_ids jsonb) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(distinct pe.id), '[]') from people pe join side_profiles sp on sp.person_id = pe.id and sp.side = 'freelancer' and sp.status <> 'closed'
  where pe.bd_member_id in (select (x #>> '{}')::int from jsonb_array_elements(case when jsonb_typeof(p_bd_ids) = 'array' then p_bd_ids else '[]' end) x where (x #>> '{}') ~ '^[0-9]{1,9}$')
$$;
revoke all on function dela_bookmark_people(jsonb) from public, anon, authenticated;

do $mig$
declare v_def text; v_new text;
begin
  v_def := pg_get_functiondef('dela_talent_search'::regproc);
  if position('p->''only''' in v_def) = 0 then
    v_new := replace(v_def, $r$      and (v_area = '' or mp.body->'practice_areas' ? v_area)$r$,
      $r$      and (jsonb_typeof(p->'only') is distinct from 'array' or (p->'only') ? sp.person_id::text)
      and (v_area = '' or mp.body->'practice_areas' ? v_area)$r$);
    if v_new = v_def then raise exception 'dela_talent_search: anchor not found'; end if;
    execute v_new;
  end if;
end $mig$;

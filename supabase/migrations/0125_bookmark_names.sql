-- The Bookmarks tab on Talent (Stacey 2026-11-17) lists bookmarked freelancers who are match-ready, through the search.
-- A bookmarked freelancer who is not taking work right now would silently vanish from the tab. This function gives the
-- tab their names, so it can say "not available right now" and offer to remove the bookmark.
-- Names only, for people the member already bookmarked from Talent; no contact details, no reason why.
-- Additive: one new function.
create or replace function dela_bookmark_names(p_people jsonb) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('person_id', pe.id,
      'name', coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name)) order by pe.display_name), '[]')
  from people pe join side_profiles sp on sp.person_id = pe.id and sp.side = 'freelancer' and sp.status <> 'closed'
    left join member_profiles mp on mp.person_id = pe.id and mp.side = 'freelancer'
  where pe.id::text in (select x #>> '{}' from jsonb_array_elements(case when jsonb_typeof(p_people) = 'array' then p_people else '[]' end) x)
$$;
revoke all on function dela_bookmark_names(jsonb) from public, anon, authenticated;

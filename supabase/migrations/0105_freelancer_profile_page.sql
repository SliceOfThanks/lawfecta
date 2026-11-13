-- Step 18 part 2 (docs/briefs/step-18-talent-marketplace.md): the full freelancer profile page.
--   dela_freelancer_profile: everything the page shows about a freelancer. Never contact details (phone, website,
--     LinkedIn, booking link and email stay out). The documents a freelancer marked "shown" are listed only for a
--     member who hires (an attorney, or an agency that hires) and for the freelancer.
--   dela_freelancer_doc: one shown document, for the same viewers, checked again when it is opened.
--   Setting bd.promotions_data_id: the website post type whose posts are shown as Promotions (7, "Promotion").
-- Additive: one setting and two functions. dela_freelancer_card (the small pop-up) is unchanged.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('bd.promotions_data_id', '7'::jsonb, 'Website post type shown as Promotions on a freelancer''s profile', 'Profiles and verification', '', 'C',
    'Stacey 2026-11-12 (Talent revision, decision 4); checked on www.lawfecta.co (post type 7, Promotion, the coupon form)', 'DELA reads a freelancer''s live, unexpired posts of this type from the website. 0 turns the Promotions tab off.')
on conflict (key) do nothing;

-- Who may see a freelancer's shown documents: someone who hires, or the freelancer
create or replace function dela_can_see_samples(p_viewer uuid, p_person uuid) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select p_viewer = p_person or exists (select 1 from side_profiles v where v.person_id = p_viewer and v.side = 'attorney' and v.status <> 'closed')
    or dela_side_org(p_viewer, 'attorney') is not null
$$;
revoke all on function dela_can_see_samples(uuid, uuid) from public, anon, authenticated;

create or replace function dela_freelancer_profile(p_viewer uuid, p_person uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select case when not exists (select 1 from side_profiles v where v.person_id = p_viewer and v.status <> 'closed') then jsonb_build_object('ok', false, 'reason', 'not_found')
    else coalesce((select jsonb_build_object('ok', true, 'person_id', pe.id,
      'name', coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name),
      'headline', mp.body->>'headline', 'summary', mp.body->>'summary', 'experience', mp.body->>'experience', 'education', mp.body->>'education',
      'practice_areas', coalesce(mp.body->'practice_areas', '[]'), 'software', coalesce(mp.body->'software', '[]'), 'skills', coalesce(mp.body->'skills', '[]'),
      'services', case when jsonb_typeof(mp.body->'services') = 'array' then mp.body->'services' else '[]'::jsonb end,
      'categories', coalesce((select jsonb_agg(c.key order by o) from jsonb_array_elements_text(case when jsonb_typeof(mp.body->'categories') = 'array' then mp.body->'categories' else '[]' end) with ordinality k(key, o)
        join bd_categories c on c.key = k.key and c.active), '[]'),
      'timezone', mp.body->>'timezone', 'hours', mp.body->>'hours', 'capacity_hours_week', mp.body->'capacity_hours_week', 'state', mp.body->>'state',
      'company', mp.body->>'firm_name', 'availability', mp.availability,
      'available_now', sp.readiness_state = 'match_ready' and mp.availability <> 'unavailable',
      'photo_file', mp.body->>'photo_file', 'verification', sp.verification_state, 'readiness', sp.readiness_state,
      'reviews', dela_review_summary(pe.id, 'freelancer'), 'bd_member_id', pe.bd_member_id,
      'agencies', (select coalesce(jsonb_agg(coalesce(nullif(o.business_name, ''), o.name)), '[]') from org_members m join organizations o on o.id = m.org_id where m.person_id = pe.id and m.status = 'active' and o.kind = 'agency'),
      'samples_allowed', dela_can_see_samples(p_viewer, pe.id),
      'samples', case when dela_can_see_samples(p_viewer, pe.id) then coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'ext', f.ext, 'size_bytes', f.size_bytes) order by f.created_at desc)
        from files f where f.org_id = dela_side_org(pe.id, 'freelancer') and f.purpose = 'profile' and f.shown and f.status = 'ready' and f.deleted_at is null and f.trashed_at is null), '[]') else '[]'::jsonb end)
      from people pe join side_profiles sp on sp.person_id = pe.id and sp.side = 'freelancer' and sp.status <> 'closed'
      left join member_profiles mp on mp.person_id = pe.id and mp.side = 'freelancer' where pe.id = p_person), jsonb_build_object('ok', false, 'reason', 'not_found')) end
$$;
revoke all on function dela_freelancer_profile(uuid, uuid) from public, anon, authenticated;

create or replace function dela_freelancer_doc(p_viewer uuid, p_person uuid, p_file uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare f files;
begin
  if not dela_can_see_samples(p_viewer, p_person) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into f from files where id = p_file and org_id = dela_side_org(p_person, 'freelancer') and purpose = 'profile' and shown and status = 'ready' and deleted_at is null and trashed_at is null;
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'storage_path', f.storage_path, 'name', f.name);
end $$;
revoke all on function dela_freelancer_doc(uuid, uuid, uuid) from public, anon, authenticated;

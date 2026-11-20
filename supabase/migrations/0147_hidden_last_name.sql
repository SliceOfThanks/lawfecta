-- Step 66: a freelancer's last name stays hidden until they are hired (Stacey 2026-11-20: an attorney who has not
-- hired them sees "Stacey L.", not "Stacey Lake", "so attorney cannot bypass").
-- Hired means an agreement both people signed (signed, active, paused, disputed or completed) between the freelancer
-- and the viewer or the viewer's firm. The freelancer, the Lawfecta Team, people on the same team (firm or agency)
-- and anyone who hired them see the full name. Everyone else gets the first name and the first letter of the last.
-- The server shortens names in every answer it sends (app.ts, nameShield); the list functions that give no person
-- id next to the name are changed here. Additive: helper functions, and one expression changed in four functions.

-- The rule has its own switch, so it can be turned off without a release
insert into feature_switches (key, label, gate) values ('hide_last_names', 'Hide a freelancer''s last name until hired: attorneys see "First L." until both have signed an agreement (step 66)', 'Stacey asked for it 2026-11-20; on for everyone on the site after the release')
on conflict (key) do nothing;

create or replace function dela_short_name(p_person uuid) returns text language sql stable set search_path = public, extensions, pg_temp as $$
  select case
    when f <> '' then f || case when l <> '' then ' ' || upper(left(l, 1)) || '.' else '' end
    when position(' ' in d) > 0 then split_part(d, ' ', 1) || ' ' || upper(left(split_part(d, ' ', array_length(string_to_array(d, ' '), 1)), 1)) || '.'
    else d end
  from (select btrim(coalesce(mp.body->>'first_name', '')) f, btrim(coalesce(mp.body->>'last_name', '')) l, btrim(regexp_replace(coalesce(pe.display_name, ''), '[[:space:]]+', ' ', 'g')) d
        from people pe left join member_profiles mp on mp.person_id = pe.id and mp.side = 'freelancer' where pe.id = p_person) x
$$;
revoke all on function dela_short_name(uuid) from public, anon, authenticated;

-- Has this viewer, or the viewer's firm, an agreement with this freelancer that both signed?
create or replace function dela_hired_by(p_viewer uuid, p_freelancer uuid) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select exists (
    select 1 from agreements a
    where a.status in ('signed', 'active', 'paused', 'disputed', 'completed')
      and (a.freelancer_person = p_freelancer
        or exists (select 1 from engagement_team t where t.agreement_id = a.id and t.person_id = p_freelancer and t.removed_at is null))
      and (a.attorney_person = p_viewer
        or a.attorney_org in (select m.org_id from org_members m where m.person_id = p_viewer and m.status = 'active')
        or a.attorney_org in (select o.id from organizations o where o.owner_person_id = p_viewer)))
$$;
revoke all on function dela_hired_by(uuid, uuid) from public, anon, authenticated;

-- May this viewer see this person's full name?
create or replace function dela_sees_full_name(p_viewer uuid, p_person uuid) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select not dela_switch_on('hide_last_names', p_viewer) or (p_viewer is not null and (p_viewer = p_person
    or not exists (select 1 from side_profiles sp where sp.person_id = p_person and sp.side = 'freelancer')
    or dela_is_staff(p_viewer)
    or exists (select 1 from org_members a join org_members b on b.org_id = a.org_id where a.person_id = p_viewer and a.status = 'active' and b.person_id = p_person and b.status = 'active')
    or exists (select 1 from organizations o join org_members b on b.org_id = o.id where o.owner_person_id = p_viewer and b.person_id = p_person and b.status = 'active')
    or exists (select 1 from organizations o join org_members a on a.org_id = o.id where o.owner_person_id = p_person and a.person_id = p_viewer and a.status = 'active')
    -- on the viewer's bench (an attorney's bench needs finished work together; an agency's bench a signed fee split)
    or exists (select 1 from bench_members bm where bm.freelancer_person = p_person and bm.status = 'active' and (bm.owner_person = p_viewer
         or bm.org_id in (select m.org_id from org_members m where m.person_id = p_viewer and m.status = 'active')
         or bm.org_id in (select o.id from organizations o where o.owner_person_id = p_viewer)))
    or exists (select 1 from agency_bench ab where ab.freelancer_person = p_person and ab.status = 'active' and (
         ab.org_id in (select m.org_id from org_members m where m.person_id = p_viewer and m.status = 'active')
         or ab.org_id in (select o.id from organizations o where o.owner_person_id = p_viewer)))
    or dela_hired_by(p_viewer, p_person)))
$$;
revoke all on function dela_sees_full_name(uuid, uuid) from public, anon, authenticated;

create or replace function dela_name_for(p_viewer uuid, p_person uuid) returns text language sql stable set search_path = public, extensions, pg_temp as $$
  select case when dela_sees_full_name(p_viewer, p_person) then dela_freelancer_name(p_person) else dela_short_name(p_person) end
$$;
revoke all on function dela_name_for(uuid, uuid) from public, anon, authenticated;

-- For the server's guard: of these people, the ones whose name this viewer must see shortened, as id -> {full, short, display}
create or replace function dela_names_to_shorten(p_viewer uuid, p_people uuid[]) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_object_agg(x.id::text, jsonb_build_object('full', dela_freelancer_name(x.id), 'display', (select display_name from people where id = x.id), 'short', dela_short_name(x.id))), '{}'::jsonb)
  from (select distinct u as id from unnest(coalesce(p_people, '{}'::uuid[])) u) x
  where exists (select 1 from people where id = x.id) and not dela_sees_full_name(p_viewer, x.id)
$$;
revoke all on function dela_names_to_shorten(uuid, uuid[]) from public, anon, authenticated;

-- An agreement not yet signed by both: the names the other side must not read in its text
create or replace function dela_agreement_name_mask(p_viewer uuid, p_agreement uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select dela_names_to_shorten(p_viewer, array[a.freelancer_person] || coalesce((select array_agg(t.person_id) from engagement_team t where t.agreement_id = a.id and t.removed_at is null), '{}'::uuid[]))
  from agreements a where a.id = p_agreement
$$;
revoke all on function dela_agreement_name_mask(uuid, uuid) from public, anon, authenticated;

-- The name a freelancer carries into a meeting room: short until the attorney of that meeting has hired them
create or replace function dela_meeting_room_name(p_person uuid, p_meeting uuid) returns text language sql stable set search_path = public, extensions, pg_temp as $$
  select case when m.freelancer_person = p_person and not dela_sees_full_name(m.attorney_person, p_person) then dela_short_name(p_person) end
  from meetings m where m.id = p_meeting
$$;
revoke all on function dela_meeting_room_name(uuid, uuid) from public, anon, authenticated;

create or replace function dela_patch(p_sig text, p_pairs text[]) returns void language plpgsql as $$
declare v_src text; v_new text; i int;
begin
  select pg_get_functiondef(p_sig::regprocedure) into v_src;
  v_new := v_src;
  for i in 1 .. array_length(p_pairs, 1) / 2 loop
    if position(p_pairs[i * 2] in v_new) > 0 and position(p_pairs[i * 2 - 1] in v_new) = 0 then continue; end if;
    if position(p_pairs[i * 2 - 1] in v_new) = 0 then raise exception '% changed; update 0147 (looking for: %)', p_sig, left(p_pairs[i * 2 - 1], 80); end if;
    v_new := replace(v_new, p_pairs[i * 2 - 1], p_pairs[i * 2]);
  end loop;
  if v_new <> v_src then execute v_new; end if;
end $$;

do $$ begin
  -- Inbox list: the row has no person id, so the name is shortened here
  perform dela_patch('dela_threads(uuid,text)', array[
    '''other_name'', case when p_side = ''attorney'' then dela_person_name(t.freelancer_person, ''freelancer'') else',
    '''other_name'', case when p_side = ''attorney'' then dela_name_for(p_person, t.freelancer_person) else']);
  -- Engagements list: it includes agreements that are chosen but not signed yet
  perform dela_patch('dela_engagements(uuid,text)', array[
    '''other_name'', case when p_side = ''attorney'' then (select display_name from people where id = a.freelancer_person) else',
    '''other_name'', case when p_side = ''attorney'' then dela_name_for(p_person, a.freelancer_person) else']);
  -- Home: the projects list
  perform dela_patch('dela_home_counts(uuid,text)', array[
    '''other_name'', (select display_name from people where id = a.freelancer_person),',
    '''other_name'', dela_name_for(p_person, a.freelancer_person),']);
end $$;
drop function if exists dela_patch(text, text[]);

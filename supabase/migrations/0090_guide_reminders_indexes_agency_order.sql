-- Launch review 2026-11-10, items 12, 13 and 15.
--   12. The guide's reminder email skipped members whose next step is "tell DELA about the firm" or "agency profile"
--       (both added after the reminder was written), so brand-new attorneys got no reminder.
--   13. Indexes for the lookups the Home page and the guide make for every member.
--   15. A person who manages two agencies got an arbitrary one for the agency profile: their own agency now comes first.
-- Additive.
create index if not exists gig_matches_person on gig_matches (person_id);
create index if not exists gig_invitations_freelancer on gig_invitations (freelancer_id);
create index if not exists gigs_org_status on gigs (org_id, status);
create index if not exists gigs_playbook on gigs (playbook_id) where playbook_id is not null;

do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_guide_daily()'::regprocedure) into v_src;
  v_new := replace(v_src, 'not in (''pick_task'', ''approve_playbook''', 'not in (''firm'', ''agency_profile'', ''pick_task'', ''approve_playbook''');
  if v_new = v_src then raise exception 'dela_guide_daily: the text to change was not found'; end if;
  execute v_new;
end $$;

create or replace function dela_agency_profile_org(p_person uuid) returns uuid language sql stable set search_path = public, extensions, pg_temp as $$
  select x.id from (
    select o.id, 0 as ord, o.created_at from organizations o where o.kind = 'agency' and o.id = dela_side_org(p_person, 'freelancer')
      and dela_agency_role(p_person, o.id) in ('owner', 'manager')
    union all
    select o.id, 1, o.created_at from organizations o join org_members m on m.org_id = o.id and m.person_id = p_person and m.status = 'active' and m.member_role = 'manager'
      where o.kind = 'agency'
  ) x order by x.ord, x.created_at, x.id limit 1
$$;
revoke all on function dela_agency_profile_org(uuid) from public, anon, authenticated;

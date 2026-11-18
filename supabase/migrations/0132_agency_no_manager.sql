-- Stacey 2026-11-17: "We do not have a manager role." An agency has its owner (the main agency account) and team
-- members. Nothing else.
--   dela_agency_role: never answers 'manager' for an agency, so every agency rule written for "owner or manager"
--     is now the owner's alone (inviting, removing, sending the agency's proposals, posting its gigs, naming people on
--     jobs, signing). Law firms keep their own roles: this function is only asked about agencies.
--   Inviting someone as a manager, or changing a team member's role to manager, is refused.
--   Anyone who was a manager of an agency, or invited as one, is a team member from now on.
-- Rollback note: older browser code offers "Manager" in two lists; the server refuses it with a plain reason.
create or replace function dela_agency_role(p_person uuid, p_org uuid) returns text language sql stable set search_path = public, extensions, pg_temp as $$
  select case when exists (select 1 from organizations o where o.id = p_org and o.kind = 'agency')
    then case dela_firm_role(p_person, p_org) when 'manager' then 'member' else dela_firm_role(p_person, p_org) end else '' end
$$;

update org_members m set member_role = 'member' from organizations o where o.id = m.org_id and o.kind = 'agency' and m.member_role = 'manager';
update agency_invites set member_role = 'member' where member_role = 'manager';

do $$
declare v_src text; v_new text; f text;
begin
  foreach f in array array['dela_agency_invite(uuid,text,text)', 'dela_agency_member_set(uuid,uuid,text,text)'] loop
    select pg_get_functiondef(f::regprocedure) into v_src;
    if position('p_role <> ''member''' in v_src) > 0 then continue; end if;
    v_new := replace(v_src, 'if p_role not in (''manager'', ''member'') then', 'if p_role <> ''member'' then');
    if v_new = v_src then raise exception '% changed; update 0132', f; end if;
    execute v_new;
  end loop;
end $$;

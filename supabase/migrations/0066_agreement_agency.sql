-- Step 8b Part C (retest R10): the party summary names the contracting agency and its lead separately. An agency's
-- proposal records the agency (proposals.agency_org); the agreement read its company from the lead's own profile, which can
-- be empty. Additive: one read-only function.
create or replace function dela_agreement_agency(p_agreement uuid) returns text language sql stable as $$
  select nullif(btrim(o.name), '') from agreements a join proposals pr on pr.id = a.proposal_id join organizations o on o.id = pr.agency_org where a.id = p_agreement;
$$;
revoke all on function dela_agreement_agency(uuid) from public, anon, authenticated;
alter function dela_agreement_agency(uuid) set search_path = public, extensions, pg_temp;

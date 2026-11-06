-- UX review N01 (docs/briefs/step-8-ux-review.md): the Notices panel splits "Needs your action" from "Updates".
-- A notice about a job needs action only while that job still waits on this member, checked against the current state,
-- so a signed agreement no longer asks for a signature. Read only; adds one function.

create or replace function dela_notice_actions(p_person uuid, p_side text) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(distinct x.gig_id::text), '[]') from (
    -- Agreements waiting for this member's signature
    select a.gig_id from agreements a
    where dela_agreement_role(p_person, p_side, a.id) <> '' and a.status in ('draft', 'sent', 'signing')
      and exists (select 1 from agreement_versions v where v.agreement_id = a.id and v.version = a.version)
      and not exists (select 1 from agreement_signatures s where s.agreement_id = a.id and s.version = a.version and s.person_id = p_person)
    union all
    -- Attorney: work submitted and waiting for review
    select a.gig_id from agreements a join milestones m on m.agreement_id = a.id
    where p_side = 'attorney' and dela_agreement_role(p_person, p_side, a.id) = 'attorney' and m.status = 'submitted'
    union all
    -- Freelancer: changes requested on a milestone
    select a.gig_id from agreements a join milestones m on m.agreement_id = a.id
    where p_side = 'freelancer' and a.freelancer_person = p_person and m.status = 'changes_requested'
    union all
    -- A monthly change the other person proposed
    select a.gig_id from agreements a join monthly_changes c on c.agreement_id = a.id
    where dela_agreement_role(p_person, p_side, a.id) <> '' and c.status = 'open' and c.proposed_by <> p_person
    union all
    -- Attorney: open gigs with proposals to review or questions to answer
    select g.id from gigs g
    where p_side = 'attorney' and g.org_id = dela_side_org(p_person, 'attorney') and g.status = 'open'
      and (exists (select 1 from proposals pr where pr.gig_id = g.id and pr.status = 'sent')
        or exists (select 1 from gig_questions q where q.gig_id = g.id and q.status = 'open'))
    union all
    -- Freelancer: invitations still open
    select i.gig_id from gig_invitations i join gigs g on g.id = i.gig_id
    where p_side = 'freelancer' and i.freelancer_id = p_person and i.status = 'sent' and g.status = 'open'
  ) x
$$;
revoke all on function dela_notice_actions(uuid, text) from public, anon, authenticated;
alter function dela_notice_actions(uuid, text) set search_path = public, extensions, pg_temp;

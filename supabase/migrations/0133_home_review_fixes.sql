-- Step 36 (docs/briefs/step-36-home-ux-accessibility.md): the Home review of 2026-11-17.
--   dela_home_default: the freelancer's and the agency's default Home open on what needs action. A member who saved
--     their own layout keeps it; only members who never saved one get the new order.
--   dela_home_counts (attorney): a payment that waits says how much it is and, when a charge failed, on which day;
--     and one count of the proposals that wait for an answer, the same count Ask DELA uses (status 'sent' on open gigs).
-- Additive: the same functions and arguments; every earlier key is still returned.
create or replace function dela_home_default(p_side text) returns text[] language sql immutable set search_path = public, extensions, pg_temp as $$
  select case p_side
    when 'attorney' then array['attention', 'delegating', 'projects', 'talent', 'spend', 'ask']
    when 'agency' then array['teamattention', 'clients', 'team', 'revenue', 'proposals', 'gigs']
    else array['attention', 'projects', 'gigs', 'earnings', 'proposals', 'growth'] end
$$;
revoke all on function dela_home_default(text) from public, anon, authenticated;

do $do$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_home_counts(uuid,text)'::regprocedure) into v_src;
  v_new := replace(v_src,
    $a$'first', a.started_at is null)$a$,
    $b$'first', a.started_at is null,
          'amount_cents', (select m.amount_cents from milestones m where m.agreement_id = a.id and m.status in ('pending', 'awaiting_funding') order by m.seq limit 1),
          'failed_at', (select max(p.updated_at) from payments p where p.agreement_id = a.id and p.status = 'failed'
            and (p.milestone_id is null or p.milestone_id = (select m.id from milestones m where m.agreement_id = a.id and m.status in ('pending', 'awaiting_funding') order by m.seq limit 1))
            and not exists (select 1 from payments p2 where p2.agreement_id = a.id and p2.status = 'succeeded' and p2.updated_at > p.updated_at and p2.milestone_id is not distinct from p.milestone_id)))$b$);
  if v_new = v_src then raise exception 'dela_home_counts: the pay item was not found'; end if;
  v_src := v_new;
  v_new := replace(v_src,
    $a$'profile', v_profile, 'required', v_required, 'firm', dela_client_eligibility(p_person, v_org),$a$,
    $b$'proposals_to_review', (select count(*) from proposals p join gigs g on g.id = p.gig_id where g.org_id = v_org and g.status = 'open' and p.status = 'sent'),
      'proposals_gig', (select g.id from gigs g where g.org_id = v_org and g.status = 'open' and exists (select 1 from proposals p where p.gig_id = g.id and p.status = 'sent') order by g.updated_at desc limit 1),
      'profile', v_profile, 'required', v_required, 'firm', dela_client_eligibility(p_person, v_org),$b$);
  if v_new = v_src then raise exception 'dela_home_counts: the attorney result was not found'; end if;
  execute v_new;
end $do$;
revoke all on function dela_home_counts(uuid, text) from public, anon, authenticated;

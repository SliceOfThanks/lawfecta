-- Step 8b Part A (retest R02, Stacey's answer 4): Notices and Projects use one live list of what needs the member.
-- The engagements list now also says when a delivery waits for the attorney's review ('review') or the next milestone
-- waits for payment ('pay'), as well as a signature ('sign'). Same arguments and fields; one field gains two values.

create or replace function dela_engagements(p_person uuid, p_side text) returns jsonb language sql stable as $$
  select jsonb_build_object('ok', true, 'on', dela_switch_on('engagements', p_person), 'engagements', coalesce(jsonb_agg(x order by x->>'updated_at' desc), '[]'),
    'payout_account', (select jsonb_build_object('status', pa.status, 'requirements', pa.requirements) from payout_accounts pa where pa.person_id = p_person)) from (
    select jsonb_build_object('id', a.id, 'gig_id', a.gig_id, 'gig_title', g.title, 'status', a.status, 'total_cents', a.total_cents, 'updated_at', a.updated_at, 'sign_by', a.sign_by,
      'other_name', case when p_side = 'attorney' then (select display_name from people where id = a.freelancer_person) else (select coalesce(nullif(mp.body->>'firm_name', ''), pe.display_name) from people pe left join member_profiles mp on mp.person_id = pe.id and mp.side = 'attorney' where pe.id = a.attorney_person) end,
      'milestones', (select count(*) from milestones m where m.agreement_id = a.id and m.status <> 'canceled'),
      'accepted', (select count(*) from milestones m where m.agreement_id = a.id and m.status = 'accepted'),
      'earned_cents', (select coalesce(sum(po.amount_cents), 0) from payouts po where po.agreement_id = a.id and po.status = 'sent'),
      'needs_me', case when a.status in ('draft', 'sent', 'signing') and not exists (select 1 from agreement_signatures s where s.agreement_id = a.id and s.version = a.version and s.person_id = p_person) then 'sign'
        when dela_agreement_role(p_person, p_side, a.id) = 'attorney' and exists (select 1 from milestone_submissions s join milestones m on m.id = s.milestone_id where m.agreement_id = a.id and s.status = 'with_attorney') then 'review'
        when dela_agreement_role(p_person, p_side, a.id) = 'attorney' and a.status = 'active' and exists (select 1 from milestones m where m.agreement_id = a.id and m.status = 'awaiting_funding') then 'pay' end) x
    from agreements a join gigs g on g.id = a.gig_id where dela_agreement_role(p_person, p_side, a.id) <> '') y
$$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure::text as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'dela_engagements' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

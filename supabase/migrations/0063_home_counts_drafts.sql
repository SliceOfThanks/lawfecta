-- Step 8b Part A (retest R11, Stacey's answer 8): "Open gigs" on Home counts posted gigs only (open or paused); drafts
-- get their own count. Same function, one more field.

create or replace function dela_home_counts(p_person uuid, p_side text) returns jsonb language plpgsql stable as $$
declare v_org uuid; v_live text[] := array['signing', 'signed', 'active', 'paused', 'disputed'];
begin
  if p_side = 'attorney' then
    v_org := dela_side_org(p_person, 'attorney');
    return jsonb_build_object(
      'open_gigs', (select count(*) from gigs where org_id = v_org and status in ('open', 'paused')),
      'draft_gigs', (select count(*) from gigs where org_id = v_org and status = 'draft'),
      'active_projects', (select count(*) from agreements where attorney_org = v_org and status = any (v_live)),
      'pending_reviews', (select count(*) from milestone_submissions s join milestones m on m.id = s.milestone_id join agreements a on a.id = m.agreement_id
        where a.attorney_org = v_org and s.status = 'with_attorney'));
  end if;
  return jsonb_build_object(
    'invitations', (select count(*) from gig_invitations where freelancer_id = p_person and status = 'sent'),
    'active_projects', (select count(*) from agreements where freelancer_person = p_person and status = any (v_live)),
    'paid_out_cents', (select coalesce(sum(amount_cents), 0) from payouts where person_id = p_person and status = 'sent'));
end $$;

revoke all on function dela_home_counts(uuid, text) from public, anon, authenticated;
alter function dela_home_counts(uuid, text) set search_path = public, extensions, pg_temp;

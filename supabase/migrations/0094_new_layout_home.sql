-- Step 15 (docs/briefs/step-15-compact-workspace.md): the compact workspace. This migration adds the switch (off) and
-- gives Home what the new layout shows, all from data DELA already keeps:
--   profile:   the member's readiness, verification, missing details and availability (dela_profile_state), and how many
--              details are required, so Home can say "7 of 12 complete" without inventing a number
--   attention: what waits on this member now (a delivery to review, a payment, a signature, proposals, a paid milestone
--              to work on, an invitation), newest need first, at most 6
--   projects:  up to 4 live engagements with their next milestone
--   paid_out_month_cents: payouts sent this calendar month in DELA's time zone (setting quota.timezone), next to the
--              all-time total that was already there
-- Additive: the same function and arguments; every earlier key is still returned.
insert into feature_switches (key, label, gate) values ('new_layout', 'The compact workspace: sidebar, phone bottom bar with More, compact Home (step 15)', 'Stacey approves it on the site')
on conflict (key) do nothing;

create or replace function dela_home_counts(p_person uuid, p_side text) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_org uuid; v_live text[] := array['signing', 'signed', 'active', 'paused', 'disputed'];
  v_tz text := coalesce(nullif(dela_setting_text('quota.timezone', ''), ''), 'America/Los_Angeles');
  v_month timestamptz := date_trunc('month', now() at time zone coalesce(nullif(dela_setting_text('quota.timezone', ''), ''), 'America/Los_Angeles')) at time zone coalesce(nullif(dela_setting_text('quota.timezone', ''), ''), 'America/Los_Angeles');
  v_profile jsonb := dela_profile_state(p_person, p_side);
  v_required int := coalesce(jsonb_array_length(dela_setting('profile.required.' || p_side)), 0);
  v_attention jsonb; v_projects jsonb;
begin
  if p_side = 'attorney' then
    v_org := dela_side_org(p_person, 'attorney');
    select coalesce(jsonb_agg(x.j order by x.ord, x.at), '[]'::jsonb) into v_attention from (
      select * from (
        select 1 ord, s.created_at at, jsonb_build_object('kind', 'review', 'gig_id', a.gig_id, 'gig_title', g.title, 'seq', m.seq, 'title', m.title, 'delivered_at', s.created_at, 'review_due_at', s.review_due_at) j
        from milestone_submissions s join milestones m on m.id = s.milestone_id join agreements a on a.id = m.agreement_id join gigs g on g.id = a.gig_id
        where a.attorney_org = v_org and s.status = 'with_attorney'
        union all
        select 2, a.updated_at, jsonb_build_object('kind', 'pay', 'gig_id', a.gig_id, 'gig_title', g.title,
          'seq', (select min(m.seq) from milestones m where m.agreement_id = a.id and m.status in ('pending', 'awaiting_funding')), 'first', a.started_at is null)
        from agreements a join gigs g on g.id = a.gig_id
        where a.attorney_org = v_org and ((a.status = 'signed' and a.started_at is null) or (a.status = 'active' and exists (select 1 from milestones m where m.agreement_id = a.id and m.status = 'awaiting_funding')))
        union all
        select 3, a.updated_at, jsonb_build_object('kind', 'sign', 'gig_id', a.gig_id, 'gig_title', g.title, 'sign_by', a.sign_by)
        from agreements a join gigs g on g.id = a.gig_id
        where a.attorney_org = v_org and a.status in ('draft', 'sent', 'signing')
          and not exists (select 1 from agreement_signatures sg where sg.agreement_id = a.id and sg.version = a.version and sg.person_id = p_person)
        union all
        select 4, g.updated_at, jsonb_build_object('kind', 'proposals', 'gig_id', g.id, 'gig_title', g.title, 'n', (select count(*) from proposals p where p.gig_id = g.id and p.status = 'sent'))
        from gigs g where g.org_id = v_org and g.status = 'open' and exists (select 1 from proposals p where p.gig_id = g.id and p.status = 'sent')
      ) u order by ord, at limit 6) x;
    select coalesce(jsonb_agg(y.j order by y.at desc), '[]'::jsonb) into v_projects from (
      select a.updated_at at, jsonb_build_object('gig_id', a.gig_id, 'gig_title', g.title, 'status', a.status, 'kind', a.kind,
        'other_name', (select display_name from people where id = a.freelancer_person),
        'awaiting_review', exists (select 1 from milestone_submissions s join milestones m on m.id = s.milestone_id where m.agreement_id = a.id and s.status = 'with_attorney'),
        'next', (select jsonb_build_object('seq', m.seq, 'title', m.title, 'due_date', m.due_date, 'status', m.status) from milestones m
          where m.agreement_id = a.id and m.status not in ('accepted', 'canceled', 'refunded') order by m.seq limit 1)) j
      from agreements a join gigs g on g.id = a.gig_id where a.attorney_org = v_org and a.status = any (v_live) order by a.updated_at desc limit 4) y;
    return jsonb_build_object(
      'open_gigs', (select count(*) from gigs where org_id = v_org and status in ('open', 'paused')),
      'draft_gigs', (select count(*) from gigs where org_id = v_org and status = 'draft'),
      'active_projects', (select count(*) from agreements where attorney_org = v_org and status = any (v_live)),
      'pending_reviews', (select count(*) from milestone_submissions s join milestones m on m.id = s.milestone_id join agreements a on a.id = m.agreement_id
        where a.attorney_org = v_org and s.status = 'with_attorney'),
      'profile', v_profile, 'required', v_required, 'firm', dela_client_eligibility(p_person, v_org), 'attention', v_attention, 'projects', v_projects);
  end if;
  select coalesce(jsonb_agg(x.j order by x.ord, x.at), '[]'::jsonb) into v_attention from (
    select * from (
      select 1 ord, coalesce(m.due_date::timestamptz, m.updated_at) at, jsonb_build_object('kind', 'milestone', 'gig_id', a.gig_id, 'gig_title', g.title, 'seq', m.seq, 'title', m.title,
        'due_date', m.due_date, 'amount_cents', m.amount_cents, 'status', m.status,
        'client', (select coalesce(nullif(mp.body->>'firm_name', ''), pe.display_name) from people pe left join member_profiles mp on mp.person_id = pe.id and mp.side = 'attorney' where pe.id = a.attorney_person)) j
      from milestones m join agreements a on a.id = m.agreement_id join gigs g on g.id = a.gig_id
      where a.freelancer_person = p_person and a.status = 'active' and m.status in ('funded', 'in_progress', 'changes_requested')
      union all
      select 2, a.updated_at, jsonb_build_object('kind', 'sign', 'gig_id', a.gig_id, 'gig_title', g.title, 'sign_by', a.sign_by)
      from agreements a join gigs g on g.id = a.gig_id
      where a.freelancer_person = p_person and a.status in ('draft', 'sent', 'signing')
        and not exists (select 1 from agreement_signatures sg where sg.agreement_id = a.id and sg.version = a.version and sg.person_id = p_person)
      union all
      select 3, i.created_at, jsonb_build_object('kind', 'invitation', 'gig_id', i.gig_id, 'gig_title', g.title)
      from gig_invitations i join gigs g on g.id = i.gig_id where i.freelancer_id = p_person and i.status = 'sent'
    ) u order by ord, at limit 6) x;
  select coalesce(jsonb_agg(y.j order by y.at desc), '[]'::jsonb) into v_projects from (
    select a.updated_at at, jsonb_build_object('gig_id', a.gig_id, 'gig_title', g.title, 'status', a.status, 'kind', a.kind,
      'other_name', (select coalesce(nullif(mp.body->>'firm_name', ''), pe.display_name) from people pe left join member_profiles mp on mp.person_id = pe.id and mp.side = 'attorney' where pe.id = a.attorney_person),
      'next', (select jsonb_build_object('seq', m.seq, 'title', m.title, 'due_date', m.due_date, 'status', m.status) from milestones m
        where m.agreement_id = a.id and m.status not in ('accepted', 'canceled', 'refunded') order by m.seq limit 1)) j
    from agreements a join gigs g on g.id = a.gig_id where a.freelancer_person = p_person and a.status = any (v_live) order by a.updated_at desc limit 4) y;
  return jsonb_build_object(
    'invitations', (select count(*) from gig_invitations where freelancer_id = p_person and status = 'sent'),
    'active_projects', (select count(*) from agreements where freelancer_person = p_person and status = any (v_live)),
    'paid_out_cents', (select coalesce(sum(amount_cents), 0) from payouts where person_id = p_person and status = 'sent'),
    'paid_out_month_cents', (select coalesce(sum(amount_cents), 0) from payouts where person_id = p_person and status = 'sent' and updated_at >= v_month),
    'profile', v_profile, 'required', v_required, 'attention', v_attention, 'projects', v_projects);
end $$;
revoke all on function dela_home_counts(uuid, text) from public, anon, authenticated;

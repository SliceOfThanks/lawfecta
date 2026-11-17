-- Step 34 (Stacey's role-based dashboard spec of 2026-11-17): Home widgets by role, with real numbers only.
--   dela_home_widgets / dela_home_default: each side's own library and its six default widgets. "Account status"
--     leaves Home (the spec's decision); a saved layout that names it simply shows without it.
--   dela_home_spend: what an attorney's firm paid in a period (work and platform fee apart, refunds apart) and what
--     was measured: milestones accepted, engagements completed, days from start to acceptance, freelancers hired again.
--   dela_home_earnings: what a freelancer received in a period, what waits for payout, what is contracted but not yet
--     earned, and the last six months received. Pending is never counted as received.
--   dela_home_delegate: delegation suggestions DELA already made on the firm's approved documents (one review per
--     approved version), across documents. Nothing is generated here, and nothing is posted or sent.
-- Additive: two functions redefined with the same arguments, three new read-only functions.
create or replace function dela_home_widgets(p_side text) returns text[] language sql immutable set search_path = public, extensions, pg_temp as $$
  select case when p_side = 'attorney'
    then array['attention', 'delegating', 'projects', 'talent', 'spend', 'ask', 'bench', 'standing', 'workflow', 'meetings', 'messages', 'usage', 'notifications', 'quick']
    else array['gigs', 'earnings', 'proposals', 'projects', 'attention', 'growth', 'meetings', 'availability', 'reviews', 'ask', 'usage', 'messages', 'notifications', 'standing', 'quick'] end
$$;

create or replace function dela_home_default(p_side text) returns text[] language sql immutable set search_path = public, extensions, pg_temp as $$
  select case when p_side = 'attorney'
    then array['attention', 'delegating', 'projects', 'talent', 'spend', 'ask']
    else array['gigs', 'earnings', 'proposals', 'projects', 'attention', 'growth'] end
$$;

create or replace function dela_home_period_start(p_period text) returns timestamptz language sql stable set search_path = public, extensions, pg_temp as $$
  select case p_period when 'quarter' then date_trunc('quarter', now()) when 'year' then date_trunc('year', now()) else date_trunc('month', now()) end
$$;

create or replace function dela_home_spend(p_person uuid, p_period text) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_from timestamptz; v_period text := case when p_period in ('month', 'quarter', 'year') then p_period else 'month' end;
  v_paid bigint; v_fee bigint; v_refund bigint; v_ms int; v_done int; v_days numeric; v_again int; v_hired int;
begin
  v_from := dela_home_period_start(v_period);
  select coalesce(sum(p.amount_cents), 0), coalesce(sum(p.fee_cents), 0) into v_paid, v_fee
  from payments p join agreements a on a.id = p.agreement_id
  where p.status = 'succeeded' and p.updated_at >= v_from and dela_agreement_role(p_person, 'attorney', a.id) = 'attorney';
  select coalesce(sum(r.amount_cents), 0) into v_refund
  from refunds r join agreements a on a.id = r.agreement_id
  where r.status = 'succeeded' and r.updated_at >= v_from and dela_agreement_role(p_person, 'attorney', a.id) = 'attorney';
  select count(*)::int, round(avg(extract(epoch from (m.accepted_at - m.started_at)) / 86400.0) filter (where m.started_at is not null), 1) into v_ms, v_days
  from milestones m join agreements a on a.id = m.agreement_id
  where m.status = 'accepted' and m.accepted_at >= v_from and dela_agreement_role(p_person, 'attorney', a.id) = 'attorney';
  select count(*)::int into v_done from agreements a
  where a.completed_at >= v_from and dela_agreement_role(p_person, 'attorney', a.id) = 'attorney';
  -- Freelancers the firm signed with: how many, and how many of them more than once (all time: "hired again" has no period)
  select count(*)::int, count(*) filter (where n > 1)::int into v_hired, v_again from (
    select a.freelancer_person, count(*) n from agreements a
    where a.signed_at is not null and dela_agreement_role(p_person, 'attorney', a.id) = 'attorney' group by a.freelancer_person) t;
  return jsonb_build_object('ok', true, 'period', v_period, 'from', v_from,
    'paid_cents', v_paid, 'fee_cents', v_fee, 'work_cents', v_paid - v_fee, 'refunded_cents', v_refund,
    'milestones_accepted', v_ms, 'engagements_completed', v_done, 'avg_days', v_days, 'freelancers_hired', v_hired, 'freelancers_again', v_again);
end $$;

create or replace function dela_home_earnings(p_person uuid, p_period text) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_from timestamptz; v_period text := case when p_period in ('month', 'quarter', 'year') then p_period else 'month' end;
  v_received bigint; v_pending bigint; v_failed bigint; v_upcoming bigint; v_months jsonb;
begin
  v_from := dela_home_period_start(v_period);
  select coalesce(sum(amount_cents) filter (where status = 'sent' and updated_at >= v_from), 0),
         coalesce(sum(amount_cents) filter (where status in ('pending', 'held')), 0),
         coalesce(sum(amount_cents) filter (where status = 'failed'), 0)
    into v_received, v_pending, v_failed from payouts where person_id = p_person;
  -- Agreed and signed, the work not accepted yet: the freelancer's part after their platform fee. Nothing here is earned.
  select coalesce(sum(m.amount_cents - m.freelancer_fee_cents), 0) into v_upcoming
  from milestones m join agreements a on a.id = m.agreement_id
  where a.freelancer_person = p_person and a.status = 'signed' and a.completed_at is null and a.canceled_at is null
    and m.status in ('pending', 'awaiting_funding', 'funded', 'in_progress', 'submitted', 'changes_requested');
  select coalesce(jsonb_agg(jsonb_build_object('month', to_char(g.m, 'YYYY-MM'), 'label', to_char(g.m, 'Mon'),
      'cents', (select coalesce(sum(p.amount_cents), 0) from payouts p where p.person_id = p_person and p.status = 'sent' and date_trunc('month', p.updated_at) = g.m)) order by g.m), '[]')
    into v_months from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') g(m);
  return jsonb_build_object('ok', true, 'period', v_period, 'from', v_from, 'received_cents', v_received, 'pending_cents', v_pending,
    'failed_cents', v_failed, 'upcoming_cents', v_upcoming, 'months', v_months);
end $$;

create or replace function dela_home_delegate(p_person uuid, p_limit int default 3) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_items jsonb; v_docs int; v_reviewed int;
begin
  if not dela_switch_on('automate_delegate', p_person) then return jsonb_build_object('ok', true, 'on', false, 'items', '[]'::jsonb, 'documents', 0, 'reviewed', 0); end if;
  -- The member's approved documents (any Library role), and how many of them DELA has reviewed at their approved version
  select count(*)::int, count(*) filter (where exists (select 1 from automate_reviews r where r.playbook_id = x.id and r.version = x.approved_version))::int
    into v_docs, v_reviewed
  from playbooks x where x.approved_version is not null and x.status not in ('archived', 'trash', 'deleted') and dela_pb_role(p_person, x.org_id) is not null;
  select coalesce(jsonb_agg(t.item order by t.at desc), '[]') into v_items from (
    select jsonb_build_object('playbook_id', x.id, 'playbook_title', x.title, 'doc_id', x.doc_id, 'rec_id', rec->>'id', 'title', rec->>'title', 'why', rec->>'why',
             'skills', coalesce(rec->'skills', '[]'::jsonb), 'steps', coalesce(rec->'steps', '[]'::jsonb), 'reviewed_at', r.created_at) item, r.created_at at
    from playbooks x
    join automate_reviews r on r.playbook_id = x.id and r.version = x.approved_version
    cross join lateral jsonb_array_elements(r.recommendations) rec
    where x.approved_version is not null and x.status not in ('archived', 'trash', 'deleted') and dela_pb_role(p_person, x.org_id) is not null
      and rec->>'kind' = 'delegate'
      and not exists (select 1 from automate_dismissals d where d.person_id = p_person and d.playbook_id = x.id)
      and not exists (select 1 from delegations d where d.review_id = r.id and d.rec_id = rec->>'id' and d.status <> 'canceled')
    order by r.created_at desc limit least(greatest(p_limit, 1), 10)) t;
  return jsonb_build_object('ok', true, 'on', true, 'items', v_items, 'documents', v_docs, 'reviewed', v_reviewed);
end $$;

do $$ declare f text; begin
  foreach f in array array['dela_home_widgets(text)', 'dela_home_default(text)', 'dela_home_period_start(text)', 'dela_home_spend(uuid,text)', 'dela_home_earnings(uuid,text)', 'dela_home_delegate(uuid,int)'] loop
    execute 'revoke all on function ' || f || ' from public, anon, authenticated';
  end loop;
end $$;

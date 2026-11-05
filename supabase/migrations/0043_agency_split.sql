-- Agencies, part 2b: attorney work assigned to a bench member, paid by the signed split (Stacey's fee answers 2026-11-05).
-- On an engagement the agency was hired for, the owner or a manager assigns a milestone to an active bench member. The
-- bench agreement's split fills in; a different split for that job needs the bench member's Accept (accepting counts as
-- signing; work cannot start until then; Decline sends the milestone back to unassigned). One bench member per milestone.
-- When the milestone is paid out, the freelancer side splits: the agency gets its share minus the whole freelancer fee,
-- and the bench member gets their full share. Each share is its own payout to its owner's own payout account, and a
-- missing account holds only that share (reminders at 1, 7 and 30 days; the agency sees "Waiting on [name]'s payout
-- setup", never the amount). Refunds and chargebacks come back from both shares by the split: money still held first,
-- then a reversal of the Stripe transfer, each recorded under the person it came from. The attorney sees who is working
-- (the bench member as a subcontractor), never the split, and gets an information-only notice. Bench members never open
-- the attorney's area. "No subcontractors on this engagement" (part 3 sets it) blocks assignments. Additive.

alter table agreements add column if not exists no_subcontractors boolean not null default false;

create table if not exists milestone_assignments (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references milestones(id),
  agreement_id uuid not null references agreements(id),
  bench_id uuid not null references agency_bench(id),
  person_id uuid not null references people(id),
  agency_org uuid not null references organizations(id),
  agency_bps int not null check (agency_bps between 0 and 10000),
  bench_version int not null,
  status text not null default 'accepted' check (status in ('proposed', 'accepted', 'declined', 'removed')),
  assigned_by uuid not null references people(id),
  typed_name text not null default '',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  removed_at timestamptz,
  removed_by uuid references people(id)
);
create unique index if not exists milestone_assignments_one on milestone_assignments (milestone_id) where status in ('proposed', 'accepted');
create index if not exists milestone_assignments_person on milestone_assignments (person_id);
alter table milestone_assignments enable row level security;

-- Each payout says whose share it is
alter table payouts add column if not exists share_kind text not null default 'freelancer';
alter table payouts add column if not exists share_bps int;
alter table payouts add column if not exists assignment_id uuid references milestone_assignments(id);
do $$ begin
  alter table payouts add constraint payouts_share_kind check (share_kind in ('freelancer', 'agency_share', 'bench_share'));
exception when duplicate_object then null; end $$;

-- Money taken back from a payout: from money still held, or by reversing the Stripe transfer
create table if not exists payout_reversals (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references payouts(id),
  agreement_id uuid not null references agreements(id),
  milestone_id uuid not null references milestones(id),
  person_id uuid not null references people(id),
  amount_cents int not null check (amount_cents > 0),
  from_held boolean not null,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  provider_ref text not null default '',
  reason text not null default '',
  idem_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table payout_reversals enable row level security;

-- The ledger records reversals and anything Lawfecta absorbs
alter table ledger_entries drop constraint if exists ledger_entries_kind_check;
alter table ledger_entries add constraint ledger_entries_kind_check check (kind in ('charge', 'attorney_fee', 'freelancer_fee', 'transfer', 'refund', 'held', 'released', 'chargeback', 'chargeback_won', 'transfer_reversal', 'shortfall'));

-- The accepted assignment on a milestone, if any
create or replace function dela_milestone_split(p_milestone uuid) returns milestone_assignments language sql stable as $$
  select * from milestone_assignments where milestone_id = p_milestone and status = 'accepted' limit 1
$$;

-- When a payout is made for an assigned milestone, it becomes two: the agency's share (minus the whole freelancer fee)
-- and the bench member's full share. This covers acceptance and a dispute decision alike.
create or replace function dela_payout_split() returns trigger language plpgsql as $$
declare x milestone_assignments; v_gross int; v_bench int; v_agency int; v_ready boolean; m milestones; v_title text;
begin
  if new.share_kind <> 'freelancer' then return new; end if;
  x := dela_milestone_split(new.milestone_id);
  if x.id is null then return new; end if;
  v_gross := new.amount_cents + new.fee_cents;
  v_bench := round(v_gross * (10000 - x.agency_bps) / 10000.0)::int;
  v_agency := v_gross - v_bench - new.fee_cents;
  if v_agency < 0 then v_bench := v_gross - new.fee_cents; v_agency := 0; end if;
  v_ready := exists (select 1 from payout_accounts pa where pa.person_id = x.person_id and pa.status = 'ready');
  insert into payouts (milestone_id, agreement_id, person_id, amount_cents, fee_cents, status, held_reason, idem_key, share_kind, share_bps, assignment_id)
  values (new.milestone_id, new.agreement_id, x.person_id, v_bench, 0, case when v_ready then 'pending' else 'held' end, case when v_ready then '' else 'payout_account' end,
    new.idem_key || ':bench', 'bench_share', 10000 - x.agency_bps, x.id)
  on conflict (idem_key) do nothing;
  if found then
    select * into m from milestones where id = new.milestone_id;
    select g.title into v_title from agreements a join gigs g on g.id = a.gig_id where a.id = new.agreement_id;
    perform dela_notify(jsonb_build_object('person_id', x.person_id, 'side', 'freelancer', 'kind', 'agency', 'email', true,
      'title', 'Your share of milestone ' || m.seq || ' is ' || case when v_ready then 'on its way' else 'waiting for your payout setup' end,
      'body', 'Milestone ' || m.seq || ' of ' || coalesce(v_title, 'the job') || ' was accepted. Your share is ' || dela_gig_money(v_bench) || ', with no platform fee for you. ' ||
        case when v_ready then 'It is on its way to your payout account.' else 'Set up payouts on the Earnings tab to receive it.' end,
      'link', '/dela?tab=earnings', 'dedupe_key', 'splitpay:' || new.idem_key));
  end if;
  new.person_id := (select owner_person_id from organizations where id = x.agency_org);
  new.amount_cents := v_agency;
  new.share_kind := 'agency_share';
  new.share_bps := x.agency_bps;
  new.assignment_id := x.id;
  return new;
end $$;
drop trigger if exists payouts_split on payouts;
create trigger payouts_split before insert on payouts for each row execute function dela_payout_split();

-- What one person receives from a milestone (after any split), for the acceptance notice
create or replace function dela_milestone_payout_to(p_milestone uuid, p_person uuid) returns int language sql stable as $$
  select coalesce(sum(amount_cents), 0)::int from payouts where milestone_id = p_milestone and person_id = p_person
$$;
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_milestone_decide(uuid,uuid,boolean,text)'::regprocedure) into v_src;
  if position('dela_milestone_payout_to' in v_src) > 0 then return; end if;
  v_new := replace(v_src, '''. Your payout of '' || dela_gig_money(m.amount_cents - m.freelancer_fee_cents) || '' (after the platform fee) is on its way''',
    '''. Your payout of '' || dela_gig_money(dela_milestone_payout_to(m.id, a.freelancer_person)) || '' (after the platform fee) is on its way''');
  if v_new = v_src then raise exception 'dela_milestone_decide changed; update 0043'; end if;
  execute v_new;
end $$;

-- Payouts due: less any money already taken back from what was held
create or replace function dela_payout_net(p_payout uuid) returns int language sql stable as $$
  select (po.amount_cents - coalesce((select sum(r.amount_cents) from payout_reversals r where r.payout_id = po.id and r.from_held and r.status = 'succeeded'), 0))::int
  from payouts po where po.id = p_payout
$$;
create or replace function dela_payouts_due() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', po.id, 'amount_cents', dela_payout_net(po.id), 'idem_key', po.idem_key, 'account_ref', pa.account_ref, 'agreement_id', po.agreement_id)), '[]')
  from payouts po join payout_accounts pa on pa.person_id = po.person_id and pa.status = 'ready'
  where po.status = 'pending' and dela_payout_net(po.id) > 0
    and not exists (select 1 from disputes d where d.agreement_id = po.agreement_id and d.status in ('notice', 'team_review'))
    and not exists (select 1 from agreements a where a.id = po.agreement_id and a.status = 'paused')
$$;

-- ---------- Assigning a milestone to a bench member ----------
create or replace function dela_milestone_assign(p_person uuid, p_milestone uuid, p jsonb) returns jsonb language plpgsql as $$
declare m milestones; a agreements; b agency_bench; sp jsonb; v_bps int; v_status text; v_id uuid; v_title text; v_agency text;
begin
  select * into m from milestones where id = p_milestone for update;
  if m.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into a from agreements where id = m.agreement_id;
  if a.agency_org is null or dela_agency_role(p_person, a.agency_org) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'agency_managers_only'); end if;
  if not dela_agency_bench_open(p_person) then return jsonb_build_object('ok', false, 'reason', 'agency_bench_off'); end if;
  if not dela_agency_active(a.agency_org) then return jsonb_build_object('ok', false, 'reason', 'agency_inactive'); end if;
  if a.no_subcontractors then return jsonb_build_object('ok', false, 'reason', 'no_subcontractors'); end if;
  if a.status not in ('signing', 'signed', 'active') then return jsonb_build_object('ok', false, 'reason', 'agreement_closed'); end if;
  if m.status not in ('pending', 'awaiting_funding', 'funded') then return jsonb_build_object('ok', false, 'reason', 'milestone_started'); end if;
  if exists (select 1 from milestone_assignments x where x.milestone_id = m.id and x.status in ('proposed', 'accepted')) then return jsonb_build_object('ok', false, 'reason', 'already_assigned'); end if;
  select * into b from agency_bench where id = (p->>'bench_id')::uuid and org_id = a.agency_org;
  if b.id is null or b.status <> 'active' then return jsonb_build_object('ok', false, 'reason', 'not_on_bench'); end if;
  sp := dela_agency_bench_signed(b.id);
  if sp is null then return jsonb_build_object('ok', false, 'reason', 'not_on_bench'); end if;
  if not dela_bench_plan_ok(b.freelancer_person) then return jsonb_build_object('ok', false, 'reason', 'bench_member_inactive'); end if;
  v_bps := coalesce((p->>'agency_bps')::int, (sp->>'agency_bps')::int);
  if not dela_bench_split_ok(v_bps) then return jsonb_build_object('ok', false, 'reason', 'bad_split', 'limits', dela_agency_split_limits()); end if;
  -- The agency's share must cover the whole freelancer fee on this milestone
  if round(m.amount_cents * v_bps / 10000.0) < m.freelancer_fee_cents then
    return jsonb_build_object('ok', false, 'reason', 'split_below_fee', 'fee_cents', m.freelancer_fee_cents);
  end if;
  v_status := case when v_bps = (sp->>'agency_bps')::int then 'accepted' else 'proposed' end;
  insert into milestone_assignments (milestone_id, agreement_id, bench_id, person_id, agency_org, agency_bps, bench_version, status, assigned_by, decided_at)
  values (m.id, a.id, b.id, b.freelancer_person, a.agency_org, v_bps, (sp->>'version')::int, v_status, p_person, case when v_status = 'accepted' then now() end)
  returning id into v_id;
  select g.title into v_title from gigs g where g.id = a.gig_id;
  select coalesce(nullif(o.business_name, ''), o.name) into v_agency from organizations o where o.id = a.agency_org;
  if v_status = 'accepted' then
    perform dela_assignment_on_job(v_id);
  end if;
  perform dela_notify(jsonb_build_object('person_id', b.freelancer_person, 'side', 'freelancer', 'kind', 'agency', 'email', true,
    'title', case when v_status = 'accepted' then v_agency || ' assigned you milestone ' || m.seq else v_agency || ' asks you to work on milestone ' || m.seq || ' at a different split' end,
    'body', 'Milestone ' || m.seq || ' of ' || coalesce(v_title, 'a job') || ': ' || m.title || ' (' || dela_gig_money(m.amount_cents) || '). ' ||
      case when v_status = 'accepted' then 'Your bench split applies: ' || ((10000 - v_bps) / 100.0)::numeric(5,1)::text || '% to you, with no platform fee for you.'
      else 'Split for this job: ' || (v_bps / 100.0)::numeric(5,1)::text || '% agency / ' || ((10000 - v_bps) / 100.0)::numeric(5,1)::text || '% you. Open DELA, Agency tab, to accept or decline. Work cannot start until you accept.' end,
    'link', '/dela?tab=agency', 'dedupe_key', 'assign:' || v_id::text));
  perform dela_audit('member', p_person, 'milestone_assigned', 'milestone_assignment', v_id::text, jsonb_build_object('milestone_id', m.id, 'agency_bps', v_bps, 'status', v_status));
  return jsonb_build_object('ok', true, 'id', v_id, 'status', v_status);
end $$;

-- The bench member is now on the job: "Who's working on this", and an information-only notice to the attorney
create or replace function dela_assignment_on_job(p_assignment uuid) returns void language plpgsql as $$
declare x milestone_assignments; m milestones; v_title text;
begin
  select * into x from milestone_assignments where id = p_assignment;
  select * into m from milestones where id = x.milestone_id;
  select g.title into v_title from agreements a join gigs g on g.id = a.gig_id where a.id = x.agreement_id;
  if not exists (select 1 from engagement_team t where t.agreement_id = x.agreement_id and t.person_id = x.person_id and t.removed_at is null) then
    insert into engagement_team (agreement_id, person_id, kind, role_text, added_by) values (x.agreement_id, x.person_id, 'subcontractor', 'Milestone ' || m.seq, x.assigned_by);
  else
    update engagement_team set role_text = left(role_text || ', ' || m.seq, 80) where agreement_id = x.agreement_id and person_id = x.person_id and removed_at is null and kind = 'subcontractor';
  end if;
  perform dela_engagement_notify(x.agreement_id, 'attorney', 'A change in who is working on ' || coalesce(v_title, 'your engagement'),
    dela_freelancer_name(x.person_id) || ', a verified Lawfecta freelancer, now works on milestone ' || m.seq || ' as the agency''s subcontractor. The agency stays responsible for the work. Nothing is needed from you.',
    'teamsub:' || x.id::text, false);
end $$;

-- The bench member accepts or declines a different split for one job (accepting counts as signing)
create or replace function dela_assignment_answer(p_person uuid, p_assignment uuid, p jsonb) returns jsonb language plpgsql as $$
declare x milestone_assignments; m milestones; v_accept boolean := coalesce((p->>'accept')::boolean, false);
begin
  select * into x from milestone_assignments where id = p_assignment for update;
  if x.id is null or x.person_id <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if x.status = 'accepted' and v_accept then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if x.status <> 'proposed' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  select * into m from milestones where id = x.milestone_id;
  if v_accept then
    if coalesce((p->>'agree')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'tick_to_accept'); end if;
    if m.status not in ('pending', 'awaiting_funding', 'funded') then return jsonb_build_object('ok', false, 'reason', 'milestone_started'); end if;
    update milestone_assignments set status = 'accepted', decided_at = now(), typed_name = left(btrim(coalesce(p->>'typed_name', '')), 120) where id = x.id;
    perform dela_assignment_on_job(x.id);
  else
    update milestone_assignments set status = 'declined', decided_at = now() where id = x.id;
  end if;
  perform dela_notify(jsonb_build_object('person_id', x.assigned_by, 'side', 'freelancer', 'kind', 'agency', 'email', true,
    'title', dela_freelancer_name(p_person) || case when v_accept then ' accepted milestone ' else ' declined milestone ' end || m.seq,
    'body', case when v_accept then 'They accepted the split for this job and can start once the milestone is funded.' else 'Milestone ' || m.seq || ' is back to unassigned. You can assign it to someone else.' end,
    'link', '/dela?tab=work', 'dedupe_key', 'assignans:' || x.id::text));
  perform dela_audit('member', p_person, case when v_accept then 'assignment_accepted' else 'assignment_declined' end, 'milestone_assignment', x.id::text, '{}');
  return jsonb_build_object('ok', true, 'status', case when v_accept then 'accepted' else 'declined' end);
end $$;

-- The agency takes an assignment back (before the milestone is accepted or refunded)
create or replace function dela_assignment_remove(p_person uuid, p_assignment uuid) returns jsonb language plpgsql as $$
declare x milestone_assignments; m milestones;
begin
  select * into x from milestone_assignments where id = p_assignment for update;
  if x.id is null or dela_agency_role(p_person, x.agency_org) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if x.status not in ('proposed', 'accepted') then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  select * into m from milestones where id = x.milestone_id;
  if m.status in ('accepted', 'refunded', 'submitted') then return jsonb_build_object('ok', false, 'reason', 'milestone_started'); end if;
  update milestone_assignments set status = 'removed', removed_at = now(), removed_by = p_person where id = x.id;
  if not exists (select 1 from milestone_assignments y where y.agreement_id = x.agreement_id and y.person_id = x.person_id and y.status = 'accepted') then
    update engagement_team set removed_at = now(), removed_by = p_person where agreement_id = x.agreement_id and person_id = x.person_id and removed_at is null and kind = 'subcontractor';
  end if;
  perform dela_notify(jsonb_build_object('person_id', x.person_id, 'side', 'freelancer', 'kind', 'agency', 'title', 'Milestone ' || m.seq || ' is no longer assigned to you',
    'body', 'The agency took this milestone back.', 'link', '/dela?tab=agency', 'dedupe_key', 'assignrm:' || x.id::text));
  perform dela_audit('member', p_person, 'assignment_removed', 'milestone_assignment', x.id::text, '{}');
  return jsonb_build_object('ok', true, 'status', 'removed');
end $$;

-- Work cannot start on a milestone while its split for the job waits for the bench member's Accept
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_milestone_start(uuid,uuid)'::regprocedure) into v_src;
  if position('split_not_accepted' in v_src) > 0 then return; end if;
  v_new := replace(v_src, '  if m.status <> ''funded'' then return jsonb_build_object(''ok'', false, ''reason'', ''not_funded''); end if;',
    '  if exists (select 1 from milestone_assignments x where x.milestone_id = m.id and x.status = ''proposed'') then return jsonb_build_object(''ok'', false, ''reason'', ''split_not_accepted''); end if;
  if m.status <> ''funded'' then return jsonb_build_object(''ok'', false, ''reason'', ''not_funded''); end if;');
  if v_new = v_src then raise exception 'dela_milestone_start changed; update 0043'; end if;
  execute v_new;
end $$;

-- The agency's view of assignments on one engagement: each milestone, who it is assigned to, the split, and whether a
-- bench member's share waits for their payout setup (never the amount held). Owners and managers only.
create or replace function dela_agreement_assignments(p_person uuid, p_agreement uuid) returns jsonb language plpgsql stable as $$
declare a agreements;
begin
  select * into a from agreements where id = p_agreement;
  if a.id is null or a.agency_org is null or dela_agency_role(p_person, a.agency_org) not in ('owner', 'manager') or not dela_agency_bench_open(p_person) then
    return jsonb_build_object('ok', true, 'on', false);
  end if;
  return jsonb_build_object('ok', true, 'on', true, 'no_subcontractors', a.no_subcontractors, 'limits', dela_agency_split_limits(),
    'milestones', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'seq', m.seq, 'title', m.title, 'amount_cents', m.amount_cents, 'fee_cents', m.freelancer_fee_cents, 'status', m.status,
        'assignment', (select jsonb_build_object('id', x.id, 'name', dela_freelancer_name(x.person_id), 'agency_bps', x.agency_bps, 'status', x.status,
            'waiting_payout', exists (select 1 from payouts po where po.assignment_id = x.id and po.share_kind = 'bench_share' and po.status = 'held'))
          from milestone_assignments x where x.milestone_id = m.id and x.status in ('proposed', 'accepted') limit 1)) order by m.seq), '[]')
      from milestones m where m.agreement_id = a.id),
    'bench', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'name', dela_freelancer_name(b.freelancer_person), 'agency_bps', (dela_agency_bench_signed(b.id)->>'agency_bps')::int)
        order by dela_freelancer_name(b.freelancer_person)), '[]')
      from agency_bench b where b.org_id = a.agency_org and b.status = 'active' and dela_agency_bench_signed(b.id) is not null and dela_bench_plan_ok(b.freelancer_person)));
end $$;

-- A bench member's assignments (the Agency tab): what they work on, their share, and where its payment stands
create or replace function dela_my_assignments(p_person uuid) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'agency', coalesce(nullif(o.business_name, ''), o.name), 'job', g.title, 'seq', m.seq, 'title', m.title,
      'deliverables', m.deliverables, 'due_date', m.due_date, 'amount_cents', m.amount_cents, 'agency_bps', x.agency_bps, 'status', x.status, 'milestone_status', m.status,
      'share_cents', round(m.amount_cents * (10000 - x.agency_bps) / 10000.0)::int,
      'payout', (select jsonb_build_object('status', po.status, 'amount_cents', po.amount_cents) from payouts po where po.assignment_id = x.id and po.share_kind = 'bench_share' order by po.created_at desc limit 1))
    order by x.created_at desc), '[]')
  from milestone_assignments x join milestones m on m.id = x.milestone_id join agreements a on a.id = x.agreement_id join gigs g on g.id = a.gig_id join organizations o on o.id = x.agency_org
  where x.person_id = p_person and x.status in ('proposed', 'accepted')
$$;
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_agency_bench_list(uuid)'::regprocedure) into v_src;
  if position('dela_my_assignments' in v_src) > 0 then return; end if;
  v_new := replace(v_src, '''fee_bps'', dela_int_setting(''fee.freelancer_bps'', 500),', '''fee_bps'', dela_int_setting(''fee.freelancer_bps'', 500), ''my_assignments'', dela_my_assignments(p_person),');
  if v_new = v_src then raise exception 'dela_agency_bench_list changed; update 0043'; end if;
  execute v_new;
end $$;

-- ---------- Refunds and chargebacks on a split milestone ----------
-- Take p_amount back from the milestone's shares by the split: from money still held first, then by reversing the transfer.
create or replace function dela_split_recover(p_milestone uuid, p_amount int, p_reason text, p_key text) returns jsonb language plpgsql as $$
declare x milestone_assignments; po payouts; v_part int; v_net int; v_held int; v_rev int; v_short int := 0; v_n int := 0;
begin
  select * into x from milestone_assignments y where y.milestone_id = p_milestone and y.status = 'accepted' limit 1;
  if x.id is null or coalesce(p_amount, 0) <= 0 then return jsonb_build_object('ok', true, 'split', false); end if;
  for po in select * from payouts where milestone_id = p_milestone and share_kind in ('agency_share', 'bench_share') and assignment_id = x.id order by share_kind loop
    v_part := case when po.share_kind = 'agency_share' then round(p_amount * x.agency_bps / 10000.0)::int else p_amount - round(p_amount * x.agency_bps / 10000.0)::int end;
    if v_part <= 0 then continue; end if;
    v_net := dela_payout_net(po.id);
    if po.status in ('pending', 'held', 'failed') then
      v_held := least(v_part, v_net);
      if v_held > 0 then
        insert into payout_reversals (payout_id, agreement_id, milestone_id, person_id, amount_cents, from_held, status, reason, idem_key)
        values (po.id, po.agreement_id, po.milestone_id, po.person_id, v_held, true, 'succeeded', left(coalesce(p_reason, ''), 200), 'rev:' || p_key || ':' || po.id::text)
        on conflict (idem_key) do nothing;
        if found then perform dela_ledger(po.agreement_id, po.milestone_id, 'transfer_reversal', v_held, '', 'Taken from money still held for ' || dela_freelancer_name(po.person_id)); v_n := v_n + 1; end if;
      end if;
      v_short := v_short + (v_part - v_held);
    else
      v_rev := least(v_part, po.amount_cents - coalesce((select sum(r.amount_cents) from payout_reversals r where r.payout_id = po.id and not r.from_held and r.status <> 'failed'), 0));
      if v_rev > 0 then
        insert into payout_reversals (payout_id, agreement_id, milestone_id, person_id, amount_cents, from_held, status, reason, idem_key)
        values (po.id, po.agreement_id, po.milestone_id, po.person_id, v_rev, false, 'pending', left(coalesce(p_reason, ''), 200), 'rev:' || p_key || ':' || po.id::text)
        on conflict (idem_key) do nothing;
        if found then v_n := v_n + 1; end if;
      end if;
      v_short := v_short + (v_part - greatest(v_rev, 0));
    end if;
  end loop;
  if v_short > 0 then
    perform dela_ledger(x.agreement_id, p_milestone, 'shortfall', v_short, '', 'Could not be taken back from the shares: ' || left(coalesce(p_reason, ''), 120));
    perform dela_alert('payments', 'A split milestone could not be fully taken back', dela_gig_money(v_short) || ' of a refund or chargeback could not be recovered from the shares. Check the admin Payments tab.', 'splitshort:' || p_key);
  end if;
  return jsonb_build_object('ok', true, 'split', true, 'reversals', v_n, 'shortfall_cents', v_short);
end $$;

do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_chargeback_event(text,text,text,integer,text)'::regprocedure) into v_src;
  if position('dela_split_recover' in v_src) > 0 then return; end if;
  v_new := replace(v_src, '    if p_status = ''lost'' and a.id is not null then',
    '    if p_status = ''lost'' and a.id is not null and p.milestone_id is not null then
      perform dela_split_recover(p.milestone_id, least(coalesce(p_amount, c.amount_cents), (select amount_cents from milestones where id = p.milestone_id)), ''Chargeback lost'', ''cb:'' || p_ref);
    end if;
    if p_status = ''lost'' and a.id is not null then');
  if v_new = v_src then raise exception 'dela_chargeback_event changed; update 0043'; end if;
  execute v_new;
end $$;

create or replace function dela_reversals_due() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'amount_cents', r.amount_cents, 'idem_key', r.idem_key, 'transfer_ref', po.provider_ref)), '[]')
  from payout_reversals r join payouts po on po.id = r.payout_id where r.status = 'pending' and not r.from_held and po.provider_ref like 'tr_%'
$$;
create or replace function dela_reversal_result(p_reversal uuid, p_status text, p_ref text) returns void language plpgsql as $$
declare r payout_reversals;
begin
  select * into r from payout_reversals where id = p_reversal for update;
  if r.id is null or r.status = 'succeeded' then return; end if;
  update payout_reversals set status = p_status, provider_ref = coalesce(nullif(p_ref, ''), provider_ref), updated_at = now() where id = r.id;
  if p_status = 'succeeded' then perform dela_ledger(r.agreement_id, r.milestone_id, 'transfer_reversal', r.amount_cents, p_ref, 'Transfer reversed from ' || dela_freelancer_name(r.person_id)); end if;
  if p_status = 'failed' then perform dela_alert('payments', 'A transfer reversal failed', 'Stripe refused to reverse a transfer for a split milestone. Check the admin Payments tab.', 'revfail:' || r.id::text); end if;
end $$;

-- ---------- Reminders: a bench member's share held for payout setup (1, 7 and 30 days) ----------
create or replace function dela_split_daily() returns jsonb language plpgsql as $$
declare po payouts; v_days int; v_n int := 0;
begin
  for po in select * from payouts where share_kind = 'bench_share' and status = 'held' and held_reason = 'payout_account' loop
    v_days := extract(day from now() - po.created_at)::int;
    if v_days in (1, 7, 30) then
      perform dela_notify(jsonb_build_object('person_id', po.person_id, 'side', 'freelancer', 'kind', 'agency', 'email', true,
        'title', 'Your share is waiting for your payout setup',
        'body', 'A share of ' || dela_gig_money(po.amount_cents) || ' from agency work is waiting for you. Set up payouts on the Earnings tab to receive it.',
        'link', '/dela?tab=earnings', 'dedupe_key', 'splithold:' || po.id::text || ':' || v_days));
      v_n := v_n + 1;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'reminders', v_n);
end $$;
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_engagements_daily()'::regprocedure) into v_src;
  if position('dela_split_daily' in v_src) > 0 then return; end if;
  v_new := regexp_replace(v_src, E'\nbegin\n', E'\nbegin\n  perform dela_split_daily();\n');
  if v_new = v_src then raise exception 'dela_engagements_daily changed; update 0043'; end if;
  execute v_new;
end $$;

-- The Lawfecta Team: every assignment with its split
create or replace function dela_admin_assignments(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['support', 'reviewer', 'finance']);
  return jsonb_build_object('ok', true, 'assignments', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'agency', coalesce(nullif(o.business_name, ''), o.name), 'name', dela_freelancer_name(x.person_id),
      'job', g.title, 'seq', m.seq, 'agency_bps', x.agency_bps, 'status', x.status, 'milestone_status', m.status, 'at', x.created_at) order by x.created_at desc), '[]')
    from (select * from milestone_assignments order by created_at desc limit 200) x join milestones m on m.id = x.milestone_id join agreements a on a.id = x.agreement_id
      join gigs g on g.id = a.gig_id join organizations o on o.id = x.agency_org));
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('dela_milestone_split', 'dela_payout_split', 'dela_milestone_payout_to', 'dela_payout_net', 'dela_payouts_due', 'dela_milestone_assign',
             'dela_assignment_on_job', 'dela_assignment_answer', 'dela_assignment_remove', 'dela_agreement_assignments', 'dela_my_assignments', 'dela_split_recover', 'dela_reversals_due',
             'dela_reversal_result', 'dela_split_daily', 'dela_admin_assignments') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

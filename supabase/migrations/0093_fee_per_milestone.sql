-- Step 14 (docs/briefs/step-14-fee-with-each-milestone.md, Stacey's decisions 2026-11-11): the attorney's fee is charged
-- with each milestone payment. Behind the switch fee_per_milestone (off). The timing is saved on each agreement when it
-- is first signed and all fee code reads it from the agreement, never from the current setting.
--   at_start (every agreement signed before the switch is on): unchanged. The whole fee rides on the first payment.
--   with_each_milestone: the total fee (the larger of the percentage and the once-per-engagement minimum) is spread over
--     the milestones by amount, rounded down, leftover cents on the last one. Each payment carries its milestone's fee.
--     A refund gives back the same share of that milestone's fee (a full refund gives back all of it).
-- Additive: three new columns with defaults, one switch, one new function, text patches to existing functions.
alter table agreements add column if not exists attorney_fee_timing text not null default 'at_start';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'agreements_fee_timing_check') then
    alter table agreements add constraint agreements_fee_timing_check check (attorney_fee_timing in ('at_start', 'with_each_milestone'));
  end if;
end $$;
alter table milestones add column if not exists attorney_fee_cents int not null default 0;
alter table refunds add column if not exists fee_cents int not null default 0;

insert into feature_switches (key, label, gate) values ('fee_per_milestone', 'Charge the attorney''s fee with each milestone payment (step 14). New agreements only; signed ones keep their terms', 'Stacey turns it on after the first real payments')
on conflict (key) do nothing;

-- What the api needs to write the agreement: the timing this agreement uses, and the fees already charged on paid milestones
create or replace function dela_fee_plan(p_agreement uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare a agreements;
begin
  select * into a from agreements where id = p_agreement;
  if a.id is null then return jsonb_build_object('attorney_fee_timing', 'at_start', 'paid', '[]'::jsonb); end if;
  return jsonb_build_object(
    'attorney_fee_timing', case when a.signed_at is not null then a.attorney_fee_timing
      when a.kind is distinct from 'monthly' and dela_switch_on('fee_per_milestone', a.attorney_person) and dela_setting_text('fees.attorney_fee_timing', 'at_start') = 'with_each_milestone' then 'with_each_milestone'
      else 'at_start' end,
    'paid', (select coalesce(jsonb_agg(jsonb_build_object('seq', m.seq, 'attorney_fee_cents', m.attorney_fee_cents) order by m.seq), '[]'::jsonb)
      from milestones m where m.agreement_id = a.id and m.period_id is null and m.status not in ('pending', 'awaiting_funding', 'canceled')));
end $$;
revoke all on function dela_fee_plan(uuid) from public, anon, authenticated;

do $$
declare v_src text; v_new text; v_step text;
begin
  -- 1. Signing: save the timing at the first signing, spread the fee over the unpaid milestones
  select pg_get_functiondef('dela_agreement_sign(uuid,text,uuid,jsonb)'::regprocedure) into v_src;
  v_new := replace(v_src, 'v_i int := 0; v_total int; v_alloc int;', 'v_i int := 0; v_total int; v_alloc int; v_timing text; v_charged int; v_rem int; v_utot int; v_ucount int; mm milestones;');
  if v_new = v_src then raise exception 'dela_agreement_sign: declare not found'; end if;
  v_step := v_new;
  v_new := replace(v_step, '  select coalesce(sum((x->>''amount_cents'')::int), 0), count(*) into v_total, v_count from jsonb_array_elements(av.body->''milestones'') x;',
    '  select coalesce(sum((x->>''amount_cents'')::int), 0), count(*) into v_total, v_count from jsonb_array_elements(av.body->''milestones'') x;
  -- The fee timing is fixed at the first signing, from the signed text; a change order never changes it
  v_timing := case when a.signed_at is not null then a.attorney_fee_timing
    when a.kind is distinct from ''monthly'' and av.body->''fees''->>''attorney_fee_timing'' = ''with_each_milestone'' then ''with_each_milestone'' else ''at_start'' end;');
  if v_new = v_step then raise exception 'dela_agreement_sign: totals line not found'; end if;
  v_step := v_new;
  v_new := replace(v_step, '  perform dela_engagement_notify(a.id, ''both'', case when a.version > 1 and a.started_at is not null then ''Change order signed'' else ''Agreement signed'' end,',
    '  if v_timing = ''with_each_milestone'' then
    -- Fees already charged on paid milestones stay. What is left of the total fee is spread over the unpaid milestones
    -- by amount, rounded down, with the leftover cents on the last unpaid one.
    select coalesce(sum(attorney_fee_cents), 0) into v_charged from milestones where agreement_id = a.id and period_id is null and status not in (''pending'', ''awaiting_funding'', ''canceled'');
    v_rem := greatest(v_fee - v_charged, 0);
    select coalesce(sum(amount_cents), 0), count(*) into v_utot, v_ucount from milestones where agreement_id = a.id and period_id is null and status in (''pending'', ''awaiting_funding'');
    v_i := 0; v_left := v_rem;
    for mm in select * from milestones where agreement_id = a.id and period_id is null and status in (''pending'', ''awaiting_funding'') order by seq loop
      v_i := v_i + 1;
      v_alloc := case when v_i = v_ucount then v_left when v_utot > 0 then floor(v_rem * mm.amount_cents / v_utot::numeric)::int else 0 end;
      v_left := v_left - v_alloc;
      update milestones set attorney_fee_cents = v_alloc, updated_at = now() where id = mm.id;
    end loop;
    -- A payment that was started but not paid, and no longer matches its milestone, is closed; the next one is made fresh
    update payments p set status = ''canceled'', updated_at = now() from milestones x
    where p.agreement_id = a.id and p.status = ''requires_payment'' and x.id = p.milestone_id and x.status in (''pending'', ''awaiting_funding'') and p.amount_cents <> x.amount_cents + x.attorney_fee_cents;
    update agreements set attorney_fee_timing = v_timing, attorney_fee_cents = v_charged + case when v_ucount > 0 then v_rem else 0 end, updated_at = now() where id = a.id returning * into a;
  end if;
  perform dela_engagement_notify(a.id, ''both'', case when a.version > 1 and a.started_at is not null then ''Change order signed'' else ''Agreement signed'' end,');
  if v_new = v_step then raise exception 'dela_agreement_sign: notify line not found'; end if;
  execute v_new;

  -- 2. The next payment: this milestone's own fee
  select pg_get_functiondef('dela_payment_next(uuid,text,uuid)'::regprocedure) into v_src;
  v_new := replace(v_src, '  if v_kind = ''start'' then v_fee := a.attorney_fee_cents; end if;',
    '  if a.attorney_fee_timing = ''with_each_milestone'' then v_fee := m.attorney_fee_cents; elsif v_kind = ''start'' then v_fee := a.attorney_fee_cents; end if;');
  if v_new = v_src then raise exception 'dela_payment_next: fee line not found'; end if;
  v_step := v_new;
  v_new := replace(v_step, '''kind'', p.kind, ''idem_key'', p.idem_key,', '''kind'', p.kind, ''idem_key'', p.idem_key, ''fee_timing'', a.attorney_fee_timing,');
  if v_new = v_step then raise exception 'dela_payment_next: return not found'; end if;
  execute v_new;

  -- 3. A paid payment: a receipt for the attorney with the three lines
  select pg_get_functiondef('dela_payment_result(uuid,text,text,text,text,text)'::regprocedure) into v_src;
  v_new := replace(v_src, 'The freelancer can start work on it now.'', ''funded'' || m.id::text);',
    'The freelancer can start work on it now.'', ''funded'' || m.id::text);
    if a.attorney_fee_timing = ''with_each_milestone'' then
      perform dela_engagement_notify(a.id, ''attorney'', ''Payment receipt: milestone '' || m.seq, ''Milestone '' || dela_gig_money(m.amount_cents) || ''. Lawfecta fee '' || dela_gig_money(p.fee_cents) || ''. Total '' || dela_gig_money(p.amount_cents) || ''.'', ''receipt'' || p.id::text);
    end if;');
  if v_new = v_src then raise exception 'dela_payment_result: funded notice not found'; end if;
  execute v_new;

  -- 4. Canceling: a paid milestone refunded in full takes its whole fee with it
  select pg_get_functiondef('dela_engagement_cancel(uuid,text,uuid,text)'::regprocedure) into v_src;
  v_new := replace(v_src, '      insert into refunds (payment_id, agreement_id, milestone_id, amount_cents, reason, idem_key)
      values (p.id, a.id, m.id, m.amount_cents + case when not v_started then p.fee_cents else 0 end, ',
    '      insert into refunds (payment_id, agreement_id, milestone_id, amount_cents, fee_cents, reason, idem_key)
      values (p.id, a.id, m.id, m.amount_cents + case when a.attorney_fee_timing = ''with_each_milestone'' or not v_started then p.fee_cents else 0 end,
        case when a.attorney_fee_timing = ''with_each_milestone'' or not v_started then p.fee_cents else 0 end, ');
  if v_new = v_src then raise exception 'dela_engagement_cancel: refund insert not found'; end if;
  v_step := v_new;
  v_new := replace(v_step, '''fee_refunded'', not v_started)', '''fee_refunded'', (not v_started or a.attorney_fee_timing = ''with_each_milestone''))');
  if v_new = v_step then raise exception 'dela_engagement_cancel: return not found'; end if;
  execute v_new;

  -- 5. A dispute: the refunded part takes the same share of that milestone's fee (half a cent rounds up)
  select pg_get_functiondef('dela_dispute_settle_money(uuid,int,int,text,text,uuid)'::regprocedure) into v_src;
  v_new := replace(v_src, '    if p.id is not null then
      insert into refunds (payment_id, agreement_id, milestone_id, amount_cents, reason, idem_key)
      values (p.id, a.id, m.id, p_refund + v_fee_refund, ',
    '    if p.id is not null and a.attorney_fee_timing = ''with_each_milestone'' and m.period_id is null then
      v_fee_refund := least(round(p.fee_cents * p_refund::numeric / m.amount_cents)::int, p.fee_cents);
    end if;
    if p.id is not null then
      insert into refunds (payment_id, agreement_id, milestone_id, amount_cents, fee_cents, reason, idem_key)
      values (p.id, a.id, m.id, p_refund + v_fee_refund, v_fee_refund, ');
  if v_new = v_src then raise exception 'dela_dispute_settle_money: refund insert not found'; end if;
  v_step := v_new;
  v_new := replace(v_step, ''' back to the attorney. The money moves now.''',
    ''' back to the attorney.'' || case when v_fee_refund > 0 then '' The attorney also gets back '' || dela_gig_money(v_fee_refund) || '' of the Lawfecta fee.'' else '''' end || '' The money moves now.''');
  if v_new = v_step then raise exception 'dela_dispute_settle_money: notice not found'; end if;
  v_step := v_new;
  v_new := replace(v_step, 'return jsonb_build_object(''ok'', true, ''release_cents'', p_release, ''refund_cents'', p_refund);',
    'return jsonb_build_object(''ok'', true, ''release_cents'', p_release, ''refund_cents'', p_refund, ''fee_refund_cents'', v_fee_refund);');
  if v_new = v_step then raise exception 'dela_dispute_settle_money: return not found'; end if;
  execute v_new;

  -- 6. A refund that went through: the fee part comes off the attorney fees in the ledger, and the attorney gets a receipt
  select pg_get_functiondef('dela_refund_result(uuid,text,text)'::regprocedure) into v_src;
  v_new := replace(v_src, '  if p_status = ''succeeded'' then perform dela_ledger(r.agreement_id, r.milestone_id, ''refund'', -r.amount_cents, p_ref, r.reason); end if;',
    '  if p_status = ''succeeded'' then
    perform dela_ledger(r.agreement_id, r.milestone_id, ''refund'', -r.amount_cents, p_ref, r.reason);
    if r.fee_cents > 0 then perform dela_ledger(r.agreement_id, r.milestone_id, ''attorney_fee'', -r.fee_cents, p_ref, ''Attorney platform fee refunded''); end if;
    if exists (select 1 from agreements x where x.id = r.agreement_id and x.attorney_fee_timing = ''with_each_milestone'') then
      perform dela_engagement_notify(r.agreement_id, ''attorney'', ''Refund receipt'', ''Milestone amount refunded '' || dela_gig_money(r.amount_cents - r.fee_cents) || ''. Lawfecta fee refunded '' || dela_gig_money(r.fee_cents) || ''. Total refunded '' || dela_gig_money(r.amount_cents) || ''.'', ''refundrcpt'' || r.id::text);
    end if;
  end if;');
  if v_new = v_src then raise exception 'dela_refund_result: ledger line not found'; end if;
  execute v_new;

  -- 7. The agreement view: the timing, each milestone's fee (the client side only) and the refunds
  select pg_get_functiondef('dela_agreement_view(uuid,text,uuid)'::regprocedure) into v_src;
  v_new := replace(v_src, '''total_cents'', a.total_cents, ''attorney_fee_cents'', a.attorney_fee_cents,', '''total_cents'', a.total_cents, ''attorney_fee_timing'', a.attorney_fee_timing, ''attorney_fee_cents'', a.attorney_fee_cents,');
  if v_new = v_src then raise exception 'dela_agreement_view: agreement fields not found'; end if;
  v_step := v_new;
  v_new := replace(v_step, '''amount_cents'', m.amount_cents, ''freelancer_fee_cents'', m.freelancer_fee_cents,', '''amount_cents'', m.amount_cents, ''attorney_fee_cents'', case when v_role = ''attorney'' then m.attorney_fee_cents end, ''freelancer_fee_cents'', m.freelancer_fee_cents,');
  if v_new = v_step then raise exception 'dela_agreement_view: milestone fields not found'; end if;
  v_step := v_new;
  v_new := replace(v_step, '    ''disputes'', (select coalesce(jsonb_agg(jsonb_build_object(''id'', d.id, ''status'', d.status, ''reason'', d.reason, ''mine'', d.opened_by = p_person,',
    '    ''refunds'', case when v_role = ''attorney'' then (select coalesce(jsonb_agg(jsonb_build_object(''amount_cents'', r.amount_cents, ''fee_cents'', r.fee_cents, ''status'', r.status, ''reason'', r.reason,
        ''seq'', (select seq from milestones x where x.id = r.milestone_id), ''created_at'', r.created_at) order by r.created_at), ''[]'') from refunds r where r.agreement_id = a.id) end,
    ''disputes'', (select coalesce(jsonb_agg(jsonb_build_object(''id'', d.id, ''status'', d.status, ''reason'', d.reason, ''mine'', d.opened_by = p_person,');
  if v_new = v_step then raise exception 'dela_agreement_view: disputes line not found'; end if;
  execute v_new;
end $$;

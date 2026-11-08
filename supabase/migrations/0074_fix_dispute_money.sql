-- Fixes from the step 11 dispute plan (2026-11-08). Same arguments and answers as before; additive.
-- 1. A dispute decision on a monthly unit refunds the unit from that month's payment (monthly units are paid by the
--    period, so the old lookup by milestone found nothing and no refund was made while the unit showed "refunded").
--    The refund key is per milestone, so two disputed units of one month are both refunded.
-- 2. A chargeback that is won or withdrawn lifts the engagement's pause once no other chargeback on it is still open.

create or replace function dela_admin_dispute_resolve(p_actor uuid, p_dispute uuid, p_release int, p_refund int, p_note text) returns jsonb language plpgsql as $$
declare d disputes; m milestones; a agreements; p payments;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'finance', 'support']);
  select * into d from disputes where id = p_dispute for update;
  if d.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if d.status = 'resolved' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if d.status = 'notice' and d.notice_ends_at > now() then return jsonb_build_object('ok', false, 'reason', 'notice_not_over', 'notice_ends_at', d.notice_ends_at); end if;
  if coalesce(trim(p_note), '') = '' then return jsonb_build_object('ok', false, 'reason', 'say_why'); end if;
  select * into a from agreements where id = d.agreement_id;
  select * into m from milestones where id = d.milestone_id;
  if m.id is not null and coalesce(p_release, 0) + coalesce(p_refund, 0) <> m.amount_cents then return jsonb_build_object('ok', false, 'reason', 'split_must_equal', 'amount_cents', m.amount_cents); end if;
  update disputes set status = 'resolved', release_cents = p_release, refund_cents = p_refund, resolution_note = left(p_note, 2000), resolved_by = p_actor, resolved_at = now() where id = d.id;
  if m.id is not null then
    if coalesce(p_release, 0) > 0 then
      perform dela_ledger(a.id, m.id, 'released', p_release, '', 'Released after the Lawfecta Team''s review');
      insert into payouts (milestone_id, agreement_id, person_id, amount_cents, fee_cents, status, held_reason, idem_key)
      values (m.id, a.id, a.freelancer_person, greatest(p_release - round(m.freelancer_fee_cents * p_release::numeric / m.amount_cents)::int, 0), round(m.freelancer_fee_cents * p_release::numeric / m.amount_cents)::int,
        case when exists (select 1 from payout_accounts pa where pa.person_id = a.freelancer_person and pa.status = 'ready') then 'pending' else 'held' end,
        case when exists (select 1 from payout_accounts pa where pa.person_id = a.freelancer_person and pa.status = 'ready') then '' else 'payout_account' end, 'payout:' || m.id::text || ':dispute')
      on conflict (idem_key) do nothing;
    end if;
    if coalesce(p_refund, 0) > 0 then
      -- The milestone's own payment, or for a monthly unit the payment of its month
      select * into p from payments
      where status = 'succeeded' and (milestone_id = m.id or (m.period_id is not null and period_id = m.period_id))
      order by (milestone_id = m.id) desc nulls last, created_at limit 1;
      if p.id is not null then
        insert into refunds (payment_id, agreement_id, milestone_id, amount_cents, reason, idem_key)
        values (p.id, a.id, m.id, p_refund, 'Dispute decision', 'refund:' || m.id::text || ':dispute') on conflict (idem_key) do nothing;
      else
        perform dela_alert('payments', 'A dispute refund has no payment', 'A dispute decision sends money back, but DELA found no paid payment for that milestone. Refund it by hand in Stripe and record it.', 'disprefund:' || d.id::text);
      end if;
    end if;
    update milestones set status = case when coalesce(p_release, 0) > 0 then 'accepted' else 'refunded' end, accepted_at = case when coalesce(p_release, 0) > 0 then now() end, updated_at = now() where id = m.id;
  end if;
  perform dela_audit('staff', p_actor, 'dispute_resolved', 'dispute', d.id::text, jsonb_build_object('release_cents', p_release, 'refund_cents', p_refund));
  perform dela_engagement_notify(a.id, 'both', 'The dispute is decided', 'The Lawfecta Team reviewed the dispute: ' || left(p_note, 300) || '. ' || dela_gig_money(coalesce(p_release, 0)) || ' goes to the freelancer and ' || dela_gig_money(coalesce(p_refund, 0)) || ' back to the attorney.', 'dispdone' || d.id::text);
  return jsonb_build_object('ok', true);
end $$;

CREATE OR REPLACE FUNCTION public.dela_chargeback_event(p_ref text, p_payment_ref text, p_status text, p_amount integer, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare c chargebacks; p payments; a agreements; v_lost int;
begin
  select * into p from payments where provider_ref = p_payment_ref limit 1;
  select * into a from agreements where id = p.agreement_id;
  insert into chargebacks (provider_ref, payment_id, agreement_id, amount_cents, status, reason) values (p_ref, p.id, a.id, coalesce(p_amount, 0), 'open', left(coalesce(p_reason, ''), 200))
  on conflict (provider_ref) do nothing;
  select * into c from chargebacks where provider_ref = p_ref for update;
  if p_status = 'open' then
    if a.id is not null and a.status in ('active', 'signed') then update agreements set status = 'paused', updated_at = now() where id = a.id; end if;
    if a.id is not null then perform dela_ledger(a.id, p.milestone_id, 'chargeback', -coalesce(p_amount, 0), p_ref, 'Card holder disputed the charge'); end if;
    perform dela_alert('payments', 'A chargeback was opened', 'A card holder disputed a charge with their bank. The engagement is paused. Decide whether to contest it before Stripe''s deadline (admin Payments tab).', 'cb:' || p_ref);
    if a.id is not null then perform dela_engagement_notify(a.id, 'both', 'Payment under review', 'A payment on this engagement is under review with the bank, so the engagement is paused. The Lawfecta Team will be in touch. You can still read everything and send messages.', 'cbpause' || p_ref); end if;
  elsif p_status in ('won', 'lost', 'withdrawn') and c.status = 'open' then
    update chargebacks set status = p_status, updated_at = now() where id = c.id;
    if p_status = 'won' and a.id is not null then perform dela_ledger(a.id, p.milestone_id, 'chargeback_won', coalesce(p_amount, c.amount_cents), p_ref, 'Chargeback won'); end if;
    if p_status = 'lost' and a.id is not null and p.milestone_id is not null then
      perform dela_split_recover(p.milestone_id, least(coalesce(p_amount, c.amount_cents), (select amount_cents from milestones where id = p.milestone_id)), 'Chargeback lost', 'cb:' || p_ref);
    end if;
    if p_status = 'lost' and a.id is not null then
      select count(*) into v_lost from chargebacks x join agreements y on y.id = x.agreement_id where y.attorney_person = a.attorney_person and x.status = 'lost';
      insert into holds (scope_type, scope_id, rule, reason, severity) values ('person', a.attorney_person::text, case when v_lost >= 2 then 'second_chargeback' else 'first_lost_chargeback' end,
        case when v_lost >= 2 then 'Second lost chargeback: termination review' else 'First lost chargeback: manual reinstatement review' end, case when v_lost >= 2 then 'critical' else 'high' end);
      perform dela_alert('payments', case when v_lost >= 2 then 'Second lost chargeback' else 'A chargeback was lost' end, case when v_lost >= 2 then 'An attorney has a second lost chargeback. A termination review is needed.' else 'A chargeback was lost. The attorney is on hold for a manual reinstatement review.' end, 'cblost:' || p_ref);
    end if;
    -- Won or withdrawn: the engagement runs again once no other chargeback on it is still open (a lost one stays paused for the team)
    if p_status in ('won', 'withdrawn') and a.id is not null and a.status = 'paused'
       and not exists (select 1 from chargebacks x where x.agreement_id = a.id and x.status = 'open') then
      update agreements set status = 'active', updated_at = now() where id = a.id;
      perform dela_engagement_notify(a.id, 'both', 'The engagement is running again', 'The bank review of a payment on this engagement is over. The engagement is running again.', 'cbresume' || p_ref);
    end if;
  end if;
  return jsonb_build_object('ok', true);
end $function$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_admin_dispute_resolve', 'dela_chargeback_event') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end $$;

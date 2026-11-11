-- Launch review 2026-11-10, fix 3, and the fee ledger gap found in the Stripe sandbox run of 2026-11-11.
--   1. A payout or refund that failed (or got no answer) is tried again a day later. By then Stripe has forgotten the
--      idempotency key, so if the first try had in fact gone through, the money went out twice. The lists of payouts and
--      refunds to send now say when Stripe's own record must be checked first ("check_first": a retry, or a row older
--      than 10 minutes). The api then looks for the transfer or refund at Stripe and only sends when there is none.
--   2. A dispute that releases money to the freelancer takes the freelancer's fee on that part, but wrote no
--      'freelancer_fee' row in the ledger, so the admin "Freelancer fees" total was short. It writes the row now.
-- Additive: same functions and arguments; one more field in each list.
create or replace function dela_payouts_due() returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', po.id, 'amount_cents', dela_payout_net(po.id), 'idem_key', po.idem_key, 'account_ref', pa.account_ref, 'agreement_id', po.agreement_id,
    'check_first', po.retries > 0 or po.created_at < now() - interval '10 minutes')), '[]')
  from payouts po join payout_accounts pa on pa.person_id = po.person_id and pa.status = 'ready'
  where po.status = 'pending' and dela_payout_net(po.id) > 0
    and not exists (select 1 from disputes d where d.agreement_id = po.agreement_id and (d.milestone_id is null or d.milestone_id = po.milestone_id) and d.status in ('notice', 'team_review'))
    and not exists (select 1 from agreements a where a.id = po.agreement_id and a.status = 'paused')
$$;
create or replace function dela_refunds_due() returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'amount_cents', r.amount_cents, 'idem_key', r.idem_key, 'payment_ref', p.provider_ref,
    'check_first', r.retries > 0 or r.created_at < now() - interval '10 minutes')), '[]')
  from refunds r join payments p on p.id = r.payment_id where r.status = 'pending'
$$;
revoke all on function dela_payouts_due() from public, anon, authenticated;
revoke all on function dela_refunds_due() from public, anon, authenticated;

do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_dispute_settle_money(uuid,int,int,text,text,uuid)'::regprocedure) into v_src;
  v_new := replace(v_src, '    on conflict (idem_key) do nothing;
  end if;
  if p_refund > 0 then', '    on conflict (idem_key) do nothing;
    if round(m.freelancer_fee_cents * p_release::numeric / m.amount_cents)::int > 0 then
      perform dela_ledger(a.id, m.id, ''freelancer_fee'', round(m.freelancer_fee_cents * p_release::numeric / m.amount_cents)::int, '''', ''Freelancer platform fee on the released part'');
    end if;
  end if;
  if p_refund > 0 then');
  if v_new = v_src then raise exception 'dela_dispute_settle_money: the text to change was not found'; end if;
  execute v_new;
end $$;

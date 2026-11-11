-- Launch review 2026-11-10, fix 2. A charge that got no answer from Stripe (a timeout) was treated as failed and a new
-- payment was made for the same milestone. When the first charge had in fact gone through, the attorney paid twice and the
-- ledger held the milestone twice. Two parts:
--   1. The api no longer treats "no answer" as failed (it asks again with the same key, then waits for Stripe's notice).
--   2. Here, as the safety net: a second successful payment for a milestone that another payment already paid is recorded
--      as charged, refunded in full at once, and the Lawfecta Team is told. Nothing is held twice.
--   3. dela_payments_unanswered lists charges still waiting for an answer, for the daily check against Stripe.
-- Additive: same function and arguments, one new answer field ("double"); one new function.
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_payment_result(uuid,text,text,text,text,text)'::regprocedure) into v_src;
  v_new := replace(v_src, '  if p_status = ''succeeded'' then
', '  if p_status = ''succeeded'' and m.id is not null and m.status not in (''pending'', ''awaiting_funding'')
     and exists (select 1 from payments x where x.milestone_id = m.id and x.id <> p.id and x.status = ''succeeded'') then
    update payments set status = ''succeeded'', provider_ref = coalesce(nullif(p_ref, ''''), provider_ref), failure = '''', updated_at = now() where id = p.id;
    perform dela_ledger(a.id, m.id, ''charge'', p.amount_cents, p_ref, ''Charged a second time for a milestone already paid'');
    insert into refunds (payment_id, agreement_id, milestone_id, amount_cents, reason, idem_key)
    values (p.id, a.id, m.id, p.amount_cents, ''Charged twice: the second payment is refunded'', ''refund:'' || p.id::text || '':double'') on conflict (idem_key) do nothing;
    perform dela_alert(''payments'', ''A milestone was charged twice'', ''A second payment went through for a milestone that was already paid. DELA is refunding the second payment in full. Check it in the admin Payments tab.'', ''double:'' || p.id::text);
    perform dela_engagement_notify(a.id, ''attorney'', ''A second charge is being refunded'', ''Your payment method was charged twice for milestone '' || m.seq || ''. The second charge of '' || dela_gig_money(p.amount_cents) || '' is being refunded in full. We are sorry for the trouble.'', ''double'' || p.id::text);
    return jsonb_build_object(''ok'', true, ''double'', true);
  end if;
  if p_status = ''succeeded'' then
');
  if v_new = v_src then raise exception 'dela_payment_result: the text to change was not found'; end if;
  execute v_new;
end $$;

create or replace function dela_payments_unanswered() returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'amount_cents', p.amount_cents, 'kind', p.kind)), '[]')
  from payments p where p.status = 'processing' and p.provider_ref = '' and p.updated_at < now() - interval '30 minutes' and p.updated_at > now() - interval '45 days'
$$;
revoke all on function dela_payments_unanswered() from public, anon, authenticated;

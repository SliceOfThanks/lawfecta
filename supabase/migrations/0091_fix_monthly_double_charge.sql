-- Launch review 2026-11-10, fix 2, for monthly engagements. A second paid charge for a month that another payment
-- already paid is recorded as charged, refunded in full at once, and the Lawfecta Team is told. Nothing is held twice.
-- (Migration 0086 did this for milestone payments.) Additive: same function and arguments, one new answer field.
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_period_payment_result(uuid,text,text,text,text,text)'::regprocedure) into v_src;
  v_new := replace(v_src, '  v_today := dela_monthly_today(a.id);
', '  v_today := dela_monthly_today(a.id);
  if p_status = ''succeeded'' and pr.id is not null and pr.status = ''paid''
     and exists (select 1 from payments x where x.period_id = pr.id and x.id <> p.id and x.status = ''succeeded'') then
    update payments set status = ''succeeded'', provider_ref = coalesce(nullif(p_ref, ''''), provider_ref), failure = '''', updated_at = now() where id = p.id;
    perform dela_ledger(a.id, null, ''charge'', p.amount_cents, p_ref, ''Charged a second time for month '' || pr.n || '', already paid'');
    insert into refunds (payment_id, agreement_id, milestone_id, amount_cents, reason, idem_key)
    values (p.id, a.id, null, p.amount_cents, ''Charged twice: the second payment is refunded'', ''refund:'' || p.id::text || '':double'') on conflict (idem_key) do nothing;
    perform dela_alert(''payments'', ''A month was charged twice'', ''A second payment went through for a month that was already paid. DELA is refunding the second payment in full. Check it in the admin Payments tab.'', ''double:'' || p.id::text);
    perform dela_engagement_notify(a.id, ''attorney'', ''A second charge is being refunded'', ''Your payment method was charged twice for month '' || pr.n || ''. The second charge of '' || dela_gig_money(p.amount_cents) || '' is being refunded in full. We are sorry for the trouble.'', ''double'' || p.id::text);
    return jsonb_build_object(''ok'', true, ''double'', true);
  end if;
');
  if v_new = v_src then raise exception 'dela_period_payment_result: the text to change was not found'; end if;
  execute v_new;
end $$;

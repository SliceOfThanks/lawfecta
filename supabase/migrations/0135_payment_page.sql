-- Step 43 (docs/briefs/step-43-agreement-work-payment.md): the Agreement and work page shows what is paid from the
-- payment records, and the saved card before a payment. Both changes are additive and read only.
--
-- 1. dela_agreement_view: each payment says which milestone it paid ("milestone_seq"), so a milestone reads "Paid" only
--    when a confirmed payment covers it. The same function and arguments; every earlier field is still returned.
do $do$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_agreement_view(uuid,text,uuid)'::regprocedure) into v_src;
  if position('milestone_seq' in v_src) > 0 then return; end if;
  v_new := replace(v_src,
    $a$'status', p.status, 'failure', p.failure,$a$,
    $b$'status', p.status, 'failure', p.failure, 'milestone_seq', (select x.seq from milestones x where x.id = p.milestone_id),$b$);
  if v_new = v_src then raise exception 'dela_agreement_view: payment fields not found'; end if;
  execute v_new;
end $do$;
revoke all on function dela_agreement_view(uuid, text, uuid) from public, anon, authenticated;

-- 2. The saved payment method of an agreement, for the paying side only. The api asks Stripe for its brand and last four
--    digits when the attorney opens "Review payment". Nothing about the card is stored in DELA.
create or replace function dela_agreement_pay_method(p_person uuid, p_side text, p_agreement uuid) returns jsonb
language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare a agreements;
begin
  if dela_agreement_role(p_person, p_side, p_agreement) <> 'attorney' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into a from agreements where id = p_agreement;
  if a.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'customer', a.provider_customer, 'payment_method', a.provider_payment_method);
end $$;
revoke all on function dela_agreement_pay_method(uuid, text, uuid) from public, anon, authenticated;

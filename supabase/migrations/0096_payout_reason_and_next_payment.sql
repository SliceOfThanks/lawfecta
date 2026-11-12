-- From the sandbox refund and dispute run of 2026-11-12 (docs/HANDOFF.md section 1b-3). Additive.
-- 1. A payout that Stripe refuses now keeps Stripe's reason (the same column a held payout uses), so the Lawfecta Team
--    sees why on the Disputes tab next to "Retry". Before, a failed payout said nothing.
-- 2. After a dispute settles a milestone, the next milestone is not charged by itself (only an acceptance does that).
--    The attorney's Home now lists "Pay milestone N" for an active engagement with no milestone in work and one waiting
--    to be paid, so the job cannot sit unnoticed.
create or replace function dela_payout_result(p_payout uuid, p_status text, p_ref text, p_reason text) returns void language plpgsql set search_path = public, extensions, pg_temp as $$
declare po payouts;
begin
  select * into po from payouts where id = p_payout for update;
  if po.id is null or po.status = 'sent' then return; end if;
  update payouts set status = p_status, provider_ref = coalesce(nullif(p_ref, ''), provider_ref),
    held_reason = case when p_status in ('held', 'failed') then left(coalesce(p_reason, ''), 200) when p_status = 'sent' then '' else held_reason end, updated_at = now() where id = po.id;
  if p_status = 'sent' then perform dela_ledger(po.agreement_id, po.milestone_id, 'transfer', -po.amount_cents, p_ref, 'Paid to the freelancer'); end if;
end $$;
revoke all on function dela_payout_result(uuid, text, text, text) from public, anon, authenticated;

do $do$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_home_counts(uuid,text)'::regprocedure) into v_src;
  v_new := replace(v_src,
    $a$(a.status = 'active' and exists (select 1 from milestones m where m.agreement_id = a.id and m.status = 'awaiting_funding')))$a$,
    $b$(a.status = 'active' and exists (select 1 from milestones m where m.agreement_id = a.id and m.status = 'awaiting_funding'))
          or (a.status = 'active' and exists (select 1 from milestones m where m.agreement_id = a.id and m.status = 'pending')
            and not exists (select 1 from milestones m where m.agreement_id = a.id and m.status in ('funded', 'in_progress', 'submitted', 'changes_requested', 'disputed'))
            and not exists (select 1 from payments p where p.agreement_id = a.id and p.status = 'processing')
            and not exists (select 1 from disputes d where d.agreement_id = a.id and d.status in ('notice', 'team_review'))))$b$);
  if v_new = v_src then raise exception 'dela_home_counts: the pay condition was not found'; end if;
  execute v_new;
end $do$;

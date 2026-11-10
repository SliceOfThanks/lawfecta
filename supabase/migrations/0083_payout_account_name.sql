-- Payout setup moved to Stripe's Accounts v2 (2026-11-10): the account is created with the freelancer's display name, so
-- the Lawfecta Team can tell accounts apart in Stripe. Additive: one more field in the answer.
create or replace function dela_payout_account(p_person uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce((select jsonb_build_object('status', status, 'account_ref', account_ref, 'requirements', requirements) from payout_accounts where person_id = p_person), jsonb_build_object('status', 'none', 'account_ref', ''))
    || jsonb_build_object('name', coalesce((select display_name from people where id = p_person), ''))
$$;
revoke all on function dela_payout_account(uuid) from public, anon, authenticated;

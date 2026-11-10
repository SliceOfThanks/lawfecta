-- Stripe's Accounts v2 needs a contact email on an account that receives transfers (found on the first sandbox run,
-- 2026-11-10). The email is the member's own, from Brilliant Directories. Additive: one more field in the answer.
create or replace function dela_payout_account(p_person uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce((select jsonb_build_object('status', status, 'account_ref', account_ref, 'requirements', requirements) from payout_accounts where person_id = p_person), jsonb_build_object('status', 'none', 'account_ref', ''))
    || coalesce((select jsonb_build_object('name', display_name, 'email', email) from people where id = p_person), '{}'::jsonb)
$$;
revoke all on function dela_payout_account(uuid) from public, anon, authenticated;

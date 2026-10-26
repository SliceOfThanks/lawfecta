-- Supabase only (tools/dbtest.sh skips it). Runs the DELA worker every minute.
-- The worker secret is made inside the database vault; nobody types or sees it.
-- To pause the worker: select cron.unschedule('dela-worker');

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'dela_worker_secret', 'Calls from cron to the api /worker route')
where not exists (select 1 from vault.secrets where name = 'dela_worker_secret');

create or replace function dela_worker_ok(p_secret text) returns boolean language sql stable security definer set search_path = public, vault as $$
  select coalesce(length(p_secret) >= 32 and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'dela_worker_secret'), false)
$$;
revoke all on function dela_worker_ok(text) from public, anon, authenticated;
grant execute on function dela_worker_ok(text) to service_role;

-- The project address is read from the vault too (secret dela_project_url, set at setup to the project's https address)
select cron.schedule('dela-worker', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'dela_project_url') || '/functions/v1/api/worker',
    headers := jsonb_build_object('content-type', 'application/json',
      'x-dela-worker', (select decrypted_secret from vault.decrypted_secrets where name = 'dela_worker_secret')),
    body := '{}'::jsonb)
$$);

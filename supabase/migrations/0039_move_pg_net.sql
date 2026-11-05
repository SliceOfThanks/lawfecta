-- Security Advisor fix (Stacey 2026-11-05: "Move pg_net only with a tested migration"): pg_net moves out of the public
-- schema into extensions. pg_net cannot be moved in place, so it is dropped and created again. Its functions stay in the
-- net schema, so the worker's scheduled call (net.http_post) and net.http_get keep working; only requests in flight at
-- that moment are lost, and the worker runs again a minute later. Tested on the test site first in a block that rolled back.
-- Runs only where pg_net is in public (local test databases have no pg_net).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_net' and extnamespace = 'public'::regnamespace) then
    drop extension pg_net;
    create extension pg_net schema extensions;
    if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then raise exception 'pg_net did not come back'; end if;
  end if;
end $$;

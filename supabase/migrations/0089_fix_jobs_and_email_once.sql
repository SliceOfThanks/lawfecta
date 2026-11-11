-- Launch review 2026-11-10, fix 5.
--   1. A background job whose worker stopped before finishing was picked up again without limit. Now it stops for good
--      ("dead", in the audit log) once it has been tried max_attempts times, like a job that fails normally.
--   2. Two overlapping worker runs could both send the same email: each saw the notice as "queued" before either marked
--      it sent. An email is now claimed first; only the run that gets the claim sends. A claim lasts 4 minutes, less than
--      the 5-minute job lease, so a claim left by a worker that stopped never blocks the retry.
-- Additive: same function and arguments for the lease; one new column; two new functions.
alter table notifications add column if not exists claimed_at timestamptz;

create or replace function dela_job_lease(p_limit integer, p_lease_seconds integer) returns setof jobs language plpgsql set search_path = public, extensions, pg_temp as $$
declare d record;
begin
  for d in update jobs set status = 'dead', finished_at = now(), lease_until = null, updated_at = now(),
      last_error = left('The worker stopped before finishing, ' || attempts || ' times. ' || last_error, 1000)
    where status = 'running' and lease_until < now() and attempts >= max_attempts returning id, kind loop
    perform dela_audit('worker', null, 'job_dead', 'job', d.id::text, jsonb_build_object('kind', d.kind, 'error', 'the worker stopped before finishing'));
  end loop;
  return query
    update jobs set status = 'running', attempts = attempts + 1, lease_until = now() + make_interval(secs => p_lease_seconds), updated_at = now()
    where id in (
      select id from jobs
      where (status in ('queued', 'delayed') and run_at <= now()) or (status = 'running' and lease_until < now())
      order by run_at limit greatest(p_limit, 1)
      for update skip locked)
    returning *;
end $$;

-- True for the one run that may send this email now
create or replace function dela_email_claim(p_notification uuid) returns boolean language plpgsql set search_path = public, extensions, pg_temp as $$
declare v uuid;
begin
  update notifications set claimed_at = now() where id = p_notification and channel = 'email' and status = 'queued'
    and (claimed_at is null or claimed_at < now() - interval '4 minutes') returning id into v;
  return v is not null;
end $$;
-- The send did not happen (the email service refused or was down): the next try may claim it at once
create or replace function dela_email_release(p_notification uuid) returns void language sql set search_path = public, extensions, pg_temp as $$
  update notifications set claimed_at = null where id = p_notification and status = 'queued'
$$;

revoke all on function dela_job_lease(integer, integer) from public, anon, authenticated;
revoke all on function dela_email_claim(uuid) from public, anon, authenticated;
revoke all on function dela_email_release(uuid) from public, anon, authenticated;

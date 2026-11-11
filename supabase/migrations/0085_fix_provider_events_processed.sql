-- Launch review 2026-11-10, fix 4. A Stripe event was recorded as seen before it was processed. If processing failed, Stripe's
-- retry was dropped as a duplicate: a lost chargeback notice meant payouts kept going. Now an event counts as handled only
-- once processed_at is set, after its work is done; an unprocessed event is processed again when Stripe retries it.
-- Additive: one new column and two new functions; the old function stays for the version before this one.
alter table provider_events add column if not exists processed_at timestamptz;
update provider_events set processed_at = received_at where processed_at is null;

-- 'done' when this event was already processed; otherwise 'process' (first time, or an earlier attempt failed)
create or replace function dela_provider_event_begin(p_id text, p_type text) returns text language plpgsql set search_path = public, extensions, pg_temp as $$
declare v timestamptz;
begin
  insert into provider_events (id, type) values (p_id, p_type) on conflict (id) do nothing;
  select processed_at into v from provider_events where id = p_id;
  return case when v is not null then 'done' else 'process' end;
end $$;
create or replace function dela_provider_event_done(p_id text) returns void language sql set search_path = public, extensions, pg_temp as $$
  update provider_events set processed_at = now() where id = p_id and processed_at is null
$$;
revoke all on function dela_provider_event_begin(text, text) from public, anon, authenticated;
revoke all on function dela_provider_event_done(text) from public, anon, authenticated;

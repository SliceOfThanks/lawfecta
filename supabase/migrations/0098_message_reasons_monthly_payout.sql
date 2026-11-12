-- Open items from the UX review of 2026-11-08, closed 2026-11-13. Additive.
-- 1. "Message removed" says who removed it: the sender, or the Lawfecta Team after a conduct check.
-- 2. The notice "A message was not delivered" opens that conversation when the thing held back was a message.
-- 3. A monthly change shows the freelancer what they receive each month, now and proposed, worked out with the same
--    formula the monthly periods use (0049): the freelancer's rate, the minimum, no fee on a bench hire.
alter table messages add column if not exists removed_why text not null default '';
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'messages_removed_why_check') then
    alter table messages add constraint messages_removed_why_check check (removed_why in ('', 'sender', 'team'));
  end if;
end $c$;

do $do$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_message_remove(uuid,uuid)'::regprocedure) into v_src;
  v_new := replace(v_src, $a$update messages set status = 'removed', removed_at = now() where id = m.id;$a$, $b$update messages set status = 'removed', removed_at = now(), removed_why = 'sender' where id = m.id;$b$);
  if v_new = v_src then raise exception 'dela_message_remove: the update was not found'; end if;
  execute v_new;

  select pg_get_functiondef('dela_admin_conduct_decide(uuid,uuid,boolean,text)'::regprocedure) into v_src;
  v_new := replace(v_src, $a$update messages set status = 'removed', removed_at = now() where id = f.object_id and status = 'held';$a$,
    $b$update messages set status = 'removed', removed_at = now(), removed_why = 'team' where id = f.object_id and status = 'held';$b$);
  if v_new = v_src then raise exception 'dela_admin_conduct_decide: the message update was not found'; end if;
  v_src := v_new;
  v_new := replace(v_src, $a$'link', '/dela', 'dedupe_key', 'conduct:' || p_flag::text$a$,
    $b$'link', case when f.object_type = 'message' then coalesce((select '/dela?tab=inbox&thread=' || mm.thread_id::text from messages mm where mm.id = f.object_id), '/dela') else '/dela' end, 'dedupe_key', 'conduct:' || p_flag::text$b$);
  if v_new = v_src then raise exception 'dela_admin_conduct_decide: the notice link was not found'; end if;
  execute v_new;

  select pg_get_functiondef('dela_thread_get(uuid,text,uuid)'::regprocedure) into v_src;
  v_new := replace(v_src, $a$'body', case when m.status = 'removed' then ''$a$, $b$'removed_why', m.removed_why, 'body', case when m.status = 'removed' then ''$b$);
  if v_new = v_src then raise exception 'dela_thread_get: the body line was not found'; end if;
  execute v_new;
end $do$;

create or replace function dela_monthly_freelancer_fee_for(p_agreement uuid, p_price int) returns int language sql stable set search_path = public, extensions, pg_temp as $$
  select case when coalesce((v.body->'fees'->>'bench_waiver')::boolean, false) then 0
    else least(greatest(round(p_price * coalesce((v.body->'fees'->>'freelancer_bps')::int, dela_int_setting('fee.freelancer_bps', 500)) / 10000.0)::int,
      coalesce((v.body->'fees'->>'floor_cents')::int, dela_int_setting('fees.floor_cents_per_party', 1000))), p_price) end
  from agreements a join agreement_versions v on v.agreement_id = a.id and v.version = a.version where a.id = p_agreement
$$;
revoke all on function dela_monthly_freelancer_fee_for(uuid, int) from public, anon, authenticated;

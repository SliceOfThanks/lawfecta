-- Clears the TEST MONEY from the pilot database before real payments start (Stacey 2026-11-12: "I only want financials
-- removed" and "I don't want test data to obscure real financial intake and processing").
-- IT CANNOT BE UNDONE. Run it only when Stacey has said yes at that moment, after a backup is confirmed.
--
-- How to run (Supabase, the Lawfecta AI project, SQL Editor), in ONE run:
--   set dela.confirm_clear = 'YES-CLEAR-TEST-MONEY';
--   then the whole of this file.
-- Without the first line the script stops and changes nothing.
--
-- REMOVED:
--   1. Every agreement that has a money record (a payment, payout, refund, ledger line, dispute, chargeback or payout
--      reversal), with everything that belongs to that agreement: its versions and signatures, milestones and
--      deliveries, monthly terms and periods, disputes, confidential materials, reviews, and all its money records.
--   2. Any money record left over, all payout accounts (they are Stripe test accounts; freelancers set up payouts again
--      with the live key) and all stored Stripe events.
--   3. The saved test card on every remaining agreement and standing arrangement.
-- KEPT: all accounts, plans, profiles, documents, files, gigs, proposals, invitations, messages, meetings, notices,
--   agreements that never had money, settings, switches and the audit log.
-- After it runs, every money total in the admin area is zero.
do $$
declare
  v_n bigint; v_round int := 0; v_new bigint; v_report jsonb := '{}'; fk record; t record; v_owner uuid; v_bad text;
begin
  if coalesce(current_setting('dela.confirm_clear', true), '') <> 'YES-CLEAR-TEST-MONEY' then
    raise exception 'Nothing was changed. This script clears data for good. Read the top of the file first.';
  end if;
  select person_id into v_owner from staff_roles where role = 'owner' order by person_id limit 1;
  if v_owner is null then raise exception 'Nothing was changed. No owner account found.'; end if;

  create temp table doomed (tbl text not null, id text not null, primary key (tbl, id)) on commit drop;
  insert into doomed
    select 'agreements', a.id::text from agreements a
    where exists (select 1 from payments x where x.agreement_id = a.id) or exists (select 1 from payouts x where x.agreement_id = a.id)
       or exists (select 1 from refunds x where x.agreement_id = a.id) or exists (select 1 from ledger_entries x where x.agreement_id = a.id)
       or exists (select 1 from disputes x where x.agreement_id = a.id) or exists (select 1 from chargebacks x where x.agreement_id = a.id)
       or exists (select 1 from payout_reversals x where x.agreement_id = a.id);
  -- every money row goes, whether or not its agreement was found above
  insert into doomed select 'payments', id::text from payments on conflict do nothing;
  insert into doomed select 'payouts', id::text from payouts on conflict do nothing;
  insert into doomed select 'refunds', id::text from refunds on conflict do nothing;
  insert into doomed select 'ledger_entries', id::text from ledger_entries on conflict do nothing;
  insert into doomed select 'chargebacks', id::text from chargebacks on conflict do nothing;
  insert into doomed select 'payout_reversals', id::text from payout_reversals on conflict do nothing;
  insert into doomed select 'disputes', id::text from disputes on conflict do nothing;

  -- The guards that keep history append-only, and the links between tables, are off for this transaction only. The
  -- links are checked again by hand at the end; if one is broken, everything is rolled back.
  set local session_replication_role = replica;

  -- A gig that pointed at a removed agreement stays, without the pointer
  update gigs set linked_agreement = null where linked_agreement::text in (select id from doomed where tbl = 'agreements');

  -- Everything that belongs to a removed row is removed too, level by level
  loop
    v_round := v_round + 1; v_new := 0;
    for fk in
      select c.conrelid::regclass::text child, (select attname from pg_attribute where attrelid = c.conrelid and attnum = c.conkey[1]) col,
             c.confrelid::regclass::text parent,
             exists (select 1 from pg_attribute a where a.attrelid = c.conrelid and a.attname = 'id' and not a.attisdropped) has_id
      from pg_constraint c
      where c.contype = 'f' and c.connamespace = 'public'::regnamespace and array_length(c.conkey, 1) = 1
        and (select attname from pg_attribute where attrelid = c.confrelid and attnum = c.confkey[1]) = 'id'
        and c.confrelid::regclass::text in (select distinct tbl from doomed)
        and not (c.conrelid::regclass::text = 'gigs' and c.confrelid::regclass::text = 'agreements')
    loop
      if fk.has_id then
        execute format('insert into doomed select %L, x.id::text from %s x where x.%I::text in (select id from doomed where tbl = %L) on conflict do nothing', fk.child, fk.child, fk.col, fk.parent);
        get diagnostics v_n = row_count; v_new := v_new + v_n;
      else
        execute format('delete from %s x where x.%I::text in (select id from doomed where tbl = %L)', fk.child, fk.col, fk.parent);
        get diagnostics v_n = row_count;
        if v_n > 0 then v_report := v_report || jsonb_build_object(fk.child, coalesce((v_report->>fk.child)::bigint, 0) + v_n); end if;
      end if;
    end loop;
    exit when v_new = 0 or v_round > 20;
  end loop;
  -- Only tables that belong to an agreement or to money may be touched. Anything else stops the run.
  select string_agg(distinct tbl, ', ') into v_bad from doomed
  where tbl in ('people', 'organizations', 'gigs', 'proposals', 'playbooks', 'files', 'threads', 'messages', 'meetings', 'side_profiles', 'member_profiles', 'firm_profiles', 'notifications', 'audit_log', 'settings', 'plans');
  if v_bad is not null then raise exception 'Nothing was changed. The clearing reached tables it must not touch: %', v_bad; end if;

  for t in select tbl, count(*) n from doomed group by tbl order by tbl loop
    execute format('delete from %s where id::text in (select id from doomed where tbl = %L)', t.tbl, t.tbl);
    v_report := v_report || jsonb_build_object(t.tbl, t.n);
  end loop;

  delete from payout_accounts;
  get diagnostics v_n = row_count; v_report := v_report || jsonb_build_object('payout_accounts', v_n);
  delete from provider_events;
  get diagnostics v_n = row_count; v_report := v_report || jsonb_build_object('provider_events', v_n);
  update agreements set provider_customer = '', provider_payment_method = '' where coalesce(provider_customer, '') <> '' or coalesce(provider_payment_method, '') <> '';
  get diagnostics v_n = row_count; v_report := v_report || jsonb_build_object('agreements_card_removed', v_n);
  update standing_arrangements set provider_customer = '', provider_payment_method = '' where coalesce(provider_customer, '') <> '' or coalesce(provider_payment_method, '') <> '';
  get diagnostics v_n = row_count; v_report := v_report || jsonb_build_object('standing_card_removed', v_n);

  set local session_replication_role = origin;

  -- Every link between tables is checked by hand. One broken link rolls everything back.
  for fk in
    select c.conname, c.conrelid::regclass::text child, (select attname from pg_attribute where attrelid = c.conrelid and attnum = c.conkey[1]) col,
           c.confrelid::regclass::text parent, (select attname from pg_attribute where attrelid = c.confrelid and attnum = c.confkey[1]) pcol
    from pg_constraint c where c.contype = 'f' and c.connamespace = 'public'::regnamespace and array_length(c.conkey, 1) = 1
  loop
    execute format('select count(*) from %s x where x.%I is not null and not exists (select 1 from %s p where p.%I = x.%I)', fk.child, fk.col, fk.parent, fk.pcol, fk.col) into v_n;
    if v_n > 0 then raise exception 'Nothing was changed. % rows of %.% would point at a removed row of %.', v_n, fk.child, fk.col, fk.parent; end if;
  end loop;
  if exists (select 1 from payments) or exists (select 1 from payouts) or exists (select 1 from refunds) or exists (select 1 from ledger_entries) or exists (select 1 from disputes) then
    raise exception 'Nothing was changed. A money table is not empty after the clearing.';
  end if;

  perform dela_audit('staff', v_owner, 'pilot_money_cleared', 'environment', dela_setting_text('environment', 'staging'), v_report);
  raise notice 'Test money cleared: %', v_report;
end $$;

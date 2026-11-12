-- Clears the made-up test data from the pilot database before real members come in (pilot plan, step 8).
-- IT CANNOT BE UNDONE. Run it only when Stacey has said yes at that moment, after a backup is confirmed.
--
-- How to run (Supabase, the Lawfecta AI project, SQL Editor), in ONE run:
--   set dela.confirm_clear = 'YES-CLEAR-TEST-DATA';
--   set dela.keep_bd_members = '686,687,688';  -- BD member numbers whose accounts stay, comma separated. Stacey 2026-11-11:
--                                              -- 686 is Stacey, 687 the test attorney, 688 the test freelancer. Their
--                                              -- accounts, plans and profiles stay; all their test jobs and money rows go.
--   then the whole of this file.
-- Without the first line the script stops and changes nothing.
--
-- KEPT: everything that is setup, not member work:
--   settings and their history, switches, plans and plan features, the tech catalog, the decision log, releases and the
--   release password, the connector's registered apps, the trial lock, and the audit log (it is the record of what
--   happened, including this clearing).
-- KEPT for the accounts named in dela.keep_bd_members: the person, their sides and plans, staff roles, access list
--   entry, organizations and memberships, profiles, appearance choice, licenses and LinkedIn check.
-- REMOVED: every other account, and for every account all work and money rows: documents, files, gigs, proposals,
--   agreements, milestones, payments, payouts, refunds, the ledger, disputes, messages, meetings, notices, jobs,
--   sessions (everyone logs in again), AI chats and usage, usage counts, guide events, trial runs, Stripe events.
do $$
declare
  v_keep_tables text[] := array[
    -- setup
    'settings', 'settings_history', 'feature_switches', 'features', 'plans', 'plan_features', 'plan_versions',
    'tech_catalog_tools', 'tech_catalog_versions', 'tech_catalog_events', 'decision_log', 'releases', 'release_password',
    'mcp_clients', 'trial_lock', 'audit_log',
    -- accounts (rows of accounts that are not kept are deleted below)
    'people', 'side_profiles', 'staff_roles', 'access_list', 'organizations', 'org_members', 'member_profiles',
    'firm_profiles', 'person_appearance', 'licenses', 'linkedin_checks', 'email_optouts', 'member_prefs', 'guide_prefs', 'ai_prefs'];
  v_remove text; v_keep_people uuid[]; v_keep_orgs uuid[]; t text; v_n bigint; v_report jsonb := '{}'; v_owner uuid; fk record;
begin
  if coalesce(current_setting('dela.confirm_clear', true), '') <> 'YES-CLEAR-TEST-DATA' then
    raise exception 'Nothing was changed. This script clears data for good. Read the top of the file first.';
  end if;
  select array_agg(id) into v_keep_people from people
    where bd_member_id::text = any (string_to_array(replace(coalesce(current_setting('dela.keep_bd_members', true), ''), ' ', ''), ','));
  if v_keep_people is null or not exists (select 1 from staff_roles where person_id = any (v_keep_people) and role = 'owner') then
    raise exception 'Nothing was changed. dela.keep_bd_members must name at least the owner''s BD member number.';
  end if;

  -- 1. Every table that is not on the keep list is emptied. Listing them together lets Postgres check the links between
  --    them; if a kept table points at a removed one, this fails and nothing is changed.
  select string_agg(format('%I', c.relname), ', ' order by c.relname) into v_remove
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relname <> all (v_keep_tables);
  execute 'truncate table ' || v_remove;

  -- 2. Accounts that are not kept, with their setup rows (children first)
  select array_agg(distinct m.org_id) into v_keep_orgs from org_members m where m.person_id = any (v_keep_people);
  foreach t in array array['email_optouts', 'member_prefs', 'guide_prefs', 'ai_prefs', 'linkedin_checks', 'licenses', 'person_appearance', 'member_profiles', 'access_list', 'staff_roles', 'side_profiles'] loop
    if t = 'access_list' then
      delete from access_list a where not exists (select 1 from people p where p.id = any (v_keep_people) and p.bd_member_id = a.bd_member_id);
    else
      execute format('delete from %I where person_id <> all ($1)', t) using v_keep_people;
    end if;
    get diagnostics v_n = row_count; v_report := v_report || jsonb_build_object(t, v_n);
  end loop;
  delete from org_members where person_id <> all (v_keep_people) or org_id <> all (coalesce(v_keep_orgs, '{}'));
  delete from firm_profiles where org_id <> all (coalesce(v_keep_orgs, '{}'));
  delete from organizations where id <> all (coalesce(v_keep_orgs, '{}'));
  -- Kept setup records (a plan version, a settings change, a release) can name an account that is being removed as the
  -- person who made or approved them. Those names move to the owner (the first kept owner), so the records stay whole.
  -- Found in the local trial of 2026-11-13.
  select s.person_id into v_owner from staff_roles s where s.person_id = any (v_keep_people) and s.role = 'owner' order by s.person_id limit 1;
  -- Some of those tables are append-only (a guard stops any change). The guards are switched off for these renames only
  -- and on again before anything is deleted, so every delete below is still checked.
  set local session_replication_role = replica;
  for fk in
    select c.conrelid::regclass::text tbl, a.attname col
    from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'people'::regclass and array_length(c.conkey, 1) = 1 and c.conrelid <> 'people'::regclass
  loop
    execute format('update %s set %I = $1 where %I is not null and %I <> all ($2)', fk.tbl, fk.col, fk.col, fk.col) using v_owner, v_keep_people;
    get diagnostics v_n = row_count;
    if v_n > 0 then v_report := v_report || jsonb_build_object('renamed_' || fk.tbl || '.' || fk.col, v_n); end if;
  end loop;
  set local session_replication_role = origin;
  delete from people where id <> all (v_keep_people);
  get diagnostics v_n = row_count; v_report := v_report || jsonb_build_object('people', v_n);

  -- 3. Counters start again, and the clearing is on the record
  update people set trial_started_at = null, trial_ends_at = null where id = any (v_keep_people);
  perform dela_audit('staff', v_keep_people[1], 'pilot_data_cleared', 'environment', dela_setting_text('environment', 'staging'), v_report);
  raise notice 'Cleared. Accounts kept: %. Removed account rows: %', array_length(v_keep_people, 1), v_report;
end $$;

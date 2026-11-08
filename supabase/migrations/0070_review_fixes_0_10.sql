-- Fixes from the AI review of 0.10.0 (GitHub issue #11). Additive.

-- Security 3, payments 2, tests 1: one trial check at a time. The daily run, "Run the check now" and the sign-in backstop
-- take this lease first; a second check skips while one is running. The lease ends by itself after p_minutes, so a run
-- that stops without letting go never blocks the job for good.
create table if not exists trial_lock (
  id int primary key check (id = 1),
  holder text not null default '',
  until timestamptz
);
alter table trial_lock enable row level security;
insert into trial_lock (id) values (1) on conflict (id) do nothing;

create or replace function dela_trial_lock(p_holder text, p_minutes int) returns boolean language sql as $$
  with u as (update trial_lock set holder = p_holder, until = now() + make_interval(mins => greatest(p_minutes, 1))
    where id = 1 and (until is null or until < now()) returning 1)
  select exists (select 1 from u)
$$;

create or replace function dela_trial_unlock(p_holder text) returns void language sql as $$
  update trial_lock set until = null where id = 1 and holder = p_holder
$$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_trial_lock', 'dela_trial_unlock') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end $$;

-- Privacy 2 and security 4: turning on the sensitive data rule (client_details_allowed) no longer releases held files on
-- their old reason labels alone. The files whose owner the switch covers, held only for client details, go back to
-- "checking"; the api runs the file check again under the new rule (all six sensitive kinds), and only a file that comes
-- back clear is released, with the notice and an audit line. The old function stays for older code.
create or replace function dela_files_recheck_list(p_actor uuid) returns jsonb language plpgsql as $$
declare f record; v_ids uuid[] := '{}';
  v_ok text[] := array['date_of_birth', 'case_number', 'federal_case_number', 'client_name', 'case_caption', 'phone_number',
    'email_address', 'street_address', 'client_information', 'party_name', 'address', 'contact_details', 'case_fact', 'matter',
    'name', 'phone', 'email', 'docket_number', 'client_names', 'case_numbers', 'party_names', 'addresses', 'phone_numbers',
    'email_addresses', 'dates_of_birth', 'names', 'case_facts', 'case_details', 'client_details'];
begin
  perform dela_require_staff(p_actor, '{}');
  for f in select * from files where status = 'held' and purpose = 'member' and check_state = 'flagged'
      and jsonb_array_length(check_reasons) > 0
      and not exists (select 1 from jsonb_array_elements_text(check_reasons) r
        where not (btrim(regexp_replace(lower(r), '[^a-z]+', '_', 'g'), '_') = any (v_ok)))
      and dela_switch_on('client_details_allowed', uploaded_by)
  loop
    update files set status = 'checking', check_state = 'pending' where id = f.id and status = 'held';
    v_ids := v_ids || f.id;
  end loop;
  return to_jsonb(v_ids);
end $$;

create or replace function dela_files_recheck_done(p_actor uuid, p_file uuid) returns boolean language plpgsql as $$
declare f files;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into f from files where id = p_file;
  if f.id is null or f.status <> 'ready' then return false; end if;
  perform dela_audit('staff', p_actor, 'file_released_client_details', 'file', f.id::text, jsonb_build_object('rechecked', true));
  perform dela_notify(jsonb_build_object('person_id', f.uploaded_by, 'side', f.side, 'kind', 'files',
    'title', '"' || left(f.name, 120) || '" is ready',
    'body', 'DELA held this file because it named a client or case. Client details are allowed in your Files tab, and DELA checked the file again for sensitive data, so it is now ready to use. Sensitive data (SSNs, ID numbers, account numbers, health information, biometric data, passwords) is still never allowed.',
    'link', '/dela?tab=files', 'dedupe_key', 'file_released:' || f.id));
  return true;
end $$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_files_recheck_list', 'dela_files_recheck_done') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end $$;

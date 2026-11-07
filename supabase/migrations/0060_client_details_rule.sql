-- Step 9c (docs/briefs/step-9c-client-information-check.md, Stacey's answers 2026-11-07: "all as suggested").
-- The client information check follows the sensitive data rule: the six sensitive kinds are stopped everywhere; client
-- details are allowed where the rule allows them. Behind the switch client_details_allowed (off on Live until the lawyer's
-- privacy review). Additive: one switch, one setting, two functions.

insert into feature_switches (key, label, gate) values
  ('client_details_allowed', 'The client information check follows the sensitive data rule (client details allowed where the rule allows them)', 'Lawyer reviews the privacy policy and data handling')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('privacy.ai_client_details_reminder', 'true', 'Remind members before client details go to DELA''s AI on Lawfecta''s key', 'Security and sensitive data', '', 'C', 'Stacey 2026-11-07 (step 9c answers)', 'Turn off once OpenAI approves Zero Data Retention (docs/RUNBOOK.md). Never shown when the member uses their own AI key.')
on conflict (key) do nothing;

-- A gig conversation counts as "after signing" once the attorney and this freelancer have a signed agreement on the gig
create or replace function dela_thread_signed(p_thread uuid) returns boolean language sql stable as $$
  select exists (select 1 from threads t join agreements a on a.gig_id = t.gig_id and a.freelancer_person = t.freelancer_person
    where t.id = p_thread and a.status in ('signed', 'active', 'paused', 'disputed', 'completed'));
$$;

-- Files in the Files tab held only for client details (names, dates of birth, case numbers, contact details) are released
-- once the switch is on (question 6); a file held for any other reason stays held. Each owner gets a notice, and the audit
-- log records every release. Safe to run more than once.
create or replace function dela_files_recheck_client_details(p_actor uuid) returns jsonb language plpgsql as $$
declare f record; n int := 0;
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
  loop
    update files set status = 'ready', check_state = 'clear' where id = f.id and status = 'held';
    perform dela_audit('staff', p_actor, 'file_released_client_details', 'file', f.id::text, jsonb_build_object('reasons', f.check_reasons));
    perform dela_notify(jsonb_build_object('person_id', f.uploaded_by, 'side', f.side, 'kind', 'files',
      'title', '"' || left(f.name, 120) || '" is ready',
      'body', 'DELA held this file because it named a client or case. Client details are allowed in your Files tab, so the file is now ready to use. Sensitive data (SSNs, ID numbers, account numbers, health information, biometric data, passwords) is still never allowed.',
      'link', '/dela?tab=files', 'dedupe_key', 'file_released:' || f.id));
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'released', n);
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure::text as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_thread_signed', 'dela_files_recheck_client_details') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

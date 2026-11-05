-- Every Library item is a "document" (Stacey 2026-11-05). The labels members and the team read in plan limits, switches
-- and settings still said "playbook" (found in the ChatGPT test of the document standard). Only the words people read
-- change; every key stays the same, so older code keeps working. The conversion switch keeps "older playbooks", which
-- is what it converts. Additive and safe to run twice.

create or replace function dela_doc_words(t text) returns text language sql immutable as $$
  select replace(replace(replace(replace(coalesce(t, ''), 'Playbooks', 'Documents'), 'playbooks', 'documents'), 'Playbook', 'Document'), 'playbook', 'document')
$$;

update features set label = dela_doc_words(label), unit = dela_doc_words(unit)
where label ilike '%playbook%' or unit ilike '%playbook%';

update feature_switches set label = dela_doc_words(label)
where label ilike '%playbook%' and key <> 'document_conversion';

update settings set label = dela_doc_words(label), section = dela_doc_words(section), note = dela_doc_words(note)
where label ilike '%playbook%' or section ilike '%playbook%' or note ilike '%playbook%';

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'dela_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

-- Every Library item is a "document": plan limits, switches and settings say so (0034). Run with tools/dbtest.sh.
\set ON_ERROR_STOP 1

create or replace function t_ok(p boolean, p_msg text) returns void language plpgsql as $$
begin
  if p is not true then raise exception 'FAILED: %', p_msg; end if;
end $$;

do $$
begin
  perform t_ok(not exists (select 1 from features where label ilike '%playbook%' or unit ilike '%playbook%'), 'plan limits say document');
  perform t_ok(not exists (select 1 from feature_switches where label ilike '%playbook%' and key <> 'document_conversion'), 'switches say document');
  perform t_ok(not exists (select 1 from settings where label ilike '%playbook%' or section ilike '%playbook%' or note ilike '%playbook%'), 'settings say document');
  perform t_ok((select label from features where key = 'att.playbooks_saved') = 'Saved documents', 'the saved limit reads Saved documents');
  perform t_ok((select label from feature_switches where key = 'playbook_library') = 'Document library (attorneys)', 'the library switch reads Document library');
  perform t_ok(exists (select 1 from features where key = 'att.playbooks_saved'), 'the keys stay the same');
end $$;
select 'document wording tests passed' as result;

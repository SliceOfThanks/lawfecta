-- Home shows how many playbooks are still drafts (or in review) in the libraries the attorney can open.
-- Additive: one new read-only function.

create or replace function dela_pb_draft_count(p_person uuid) returns int language sql stable as $$
  select count(*)::int from playbooks p
  where p.status in ('draft', 'in_review') and dela_pb_role(p_person, p.org_id) is not null
$$;

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

-- Pins the search path of every DELA function so a function always finds DELA's own tables and pgcrypto,
-- whoever calls it. Additive: changes no behaviour. Functions that already pin a path (0006 to 0008) are left as they are.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'dela%' and p.prokind = 'f'
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end $$;

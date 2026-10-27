-- Security checks after every migration (safety kit): runs last.
-- Every table has row level security on and no policies; no DELA function can be called by anon or authenticated.
\set ON_ERROR_STOP 1
do $$
declare bad text;
begin
  select string_agg(c.relname, ', ') into bad from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  perform t_ok(bad is null, 'row level security is on for every table (missing: ' || coalesce(bad, '') || ')');

  select string_agg(tablename || '.' || policyname, ', ') into bad from pg_policies where schemaname = 'public';
  perform t_ok(bad is null, 'no table has a policy (found: ' || coalesce(bad, '') || ')');

  select string_agg(distinct p.proname, ', ') into bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'dela%'
    and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
  perform t_ok(bad is null, 'no DELA function can be called from the browser (found: ' || coalesce(bad, '') || ')');

  select string_agg(distinct p.proname, ', ') into bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'dela%'
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%');
  perform t_ok(bad is null, 'every DELA function pins its search path (missing: ' || coalesce(bad, '') || ')');

  select string_agg(table_name || '.' || column_name, ', ') into bad from information_schema.columns
  where table_schema = 'public' and (column_name like '%cents%' or column_name like '%bps%') and data_type not in ('integer', 'bigint', 'smallint');
  perform t_ok(bad is null, 'money columns are whole numbers (found: ' || coalesce(bad, '') || ')');
end $$;
select 'security tests passed' as result;

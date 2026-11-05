-- Security Advisor fix (Stacey 2026-11-05): no SECURITY DEFINER function in the public schema can be called from the browser.
-- The project setup added rls_auto_enable (an event trigger that turns RLS on for new tables). Event triggers still fire
-- after this; only direct calls through the public API are refused.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef
             and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

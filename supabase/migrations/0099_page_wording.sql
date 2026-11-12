-- Step 15 follow-up (prompt check 2026-11-13): notices, emails and team alerts written by the database still said
-- "tab", "AI settings" and "the DELA guide on your Dashboard". The new layout has pages in a menu and a Settings page.
-- This rewrites those words inside the functions that write the texts. Nothing else in the functions changes.
-- Additive: no table, column or function is removed or renamed.
do $mig$
declare
  r record;
  v_def text;
  v_new text;
  v_n int := 0;
begin
  for r in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
    where n.nspname = 'public' and p.prokind = 'f' and l.lanname in ('plpgsql', 'sql')
      and (p.prosrc ~ '(Agency|Earnings|Files|Work|Gigs|Payments|Disputes|Security|People|Projects|Library|Talent|Recurring|Jobs|Verification|Release Control) tab'
        or p.prosrc like '%AI settings%' or p.prosrc like '%on your Dashboard%')
  loop
    v_def := pg_get_functiondef(r.oid);
    v_new := regexp_replace(v_def,
      '(Agency|Earnings|Files|Work|Gigs|Payments|Disputes|Security|People|Projects|Library|Talent|Recurring|Jobs|Verification|Release Control) tab',
      '\1 page', 'g');
    v_new := replace(v_new, 'Turn these alerts off in the DELA guide on your Dashboard.',
      'To turn these alerts off, open DELA, then Settings, then "Suggestions and alerts".');
    v_new := replace(v_new, 'The DELA guide on your Dashboard', 'Your Home page in DELA');
    v_new := replace(v_new, 'on your Dashboard', 'on your Home page');
    v_new := replace(v_new, 'then AI settings,', 'then Settings,');
    v_new := replace(v_new, 'AI settings', 'Settings');
    if v_new <> v_def then
      execute v_new;
      v_n := v_n + 1;
    end if;
  end loop;
  if v_n = 0 then raise exception '0099: no function text was changed'; end if;
  raise notice '0099: wording updated in % functions', v_n;
end
$mig$;

-- Setting notes the owner reads in the admin area
update settings set note = replace(note, 'Release Control tab', 'Release Control page') where note like '%Release Control tab%';

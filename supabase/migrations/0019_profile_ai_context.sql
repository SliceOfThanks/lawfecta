-- Step 3 follow-up (Stacey 2026-11-04): licenses are verified for the US only, and DELA's AI reads the member's own
-- profile (practice areas, where they practice, tech tools) to tailor its answers. Additive only.

update settings set status = 'C', source = 'Stacey 2026-11-04 (Step 3 question 8: US only)', note = 'Attorneys elsewhere can still sign up and keep a profile.', updated_at = now()
where key = 'verify.countries' and status <> 'C';

insert into settings (key, value, label, section, unit, status, source, note) values
  ('profile.ai_context', 'true', 'DELA''s AI reads the member''s own profile (practice areas, places and tech tools) to tailor answers', 'Profiles and verification', '', 'C', 'Stacey 2026-11-04', 'Only the member''s own side. Never another member''s profile.')
on conflict (key) do nothing;

-- What the AI may read about this member: their own profile on this side, when profiles are open for them
create or replace function dela_profile_ai_context(p_person uuid, p_side text) returns jsonb language sql stable as $$
  select case when coalesce((dela_setting('profile.ai_context') #>> '{}')::boolean, false) and dela_switch_on('profiles', p_person)
    then (select mp.body from member_profiles mp where mp.person_id = p_person and mp.side = p_side) end
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

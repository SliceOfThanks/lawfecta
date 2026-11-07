-- UX review Phase 4 part D (docs/briefs/step-8a-phase-4.md, Stacey's answers 8 and 9): each person chooses how DELA looks,
-- "Match my device", "Light" or "Dark", in the member area and the admin area. Everyone starts on the setting
-- appearance.default (light). Behind the switch appearance_choice; while it is off DELA follows the device, as before.
-- Additive: one table and two functions.

create table if not exists person_appearance (
  person_id uuid primary key references people(id),
  mode text not null check (mode in ('device', 'light', 'dark')),
  updated_at timestamptz not null default now()
);
alter table person_appearance enable row level security;
revoke all on person_appearance from public, anon, authenticated;

-- What the page applies: the person's choice, or the starting setting; "device" while the switch is off
create or replace function dela_appearance(p_person uuid) returns jsonb language sql stable as $$
  select case when dela_switch_on('appearance_choice', p_person)
    then jsonb_build_object('on', true, 'mode', coalesce((select mode from person_appearance where person_id = p_person),
      case when dela_setting_text('appearance.default', 'light') in ('device', 'light', 'dark') then dela_setting_text('appearance.default', 'light') else 'light' end))
    else jsonb_build_object('on', false, 'mode', 'device') end
$$;

create or replace function dela_appearance_set(p_person uuid, p_mode text) returns jsonb language plpgsql as $$
begin
  if not dela_switch_on('appearance_choice', p_person) then return jsonb_build_object('ok', false, 'reason', 'appearance_off'); end if;
  if p_mode is null or p_mode not in ('device', 'light', 'dark') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  insert into person_appearance (person_id, mode) values (p_person, p_mode)
    on conflict (person_id) do update set mode = excluded.mode, updated_at = now();
  return jsonb_build_object('ok', true, 'mode', p_mode);
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure::text as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_appearance', 'dela_appearance_set') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

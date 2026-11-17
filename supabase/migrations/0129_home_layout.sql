-- Step 33 (Stacey's brief of 2026-11-17, "Customizable Dashboard"): each member arranges their own Home.
--   home_layouts: the member's widgets for one side, in order. No row means the default.
--   dela_home_widgets / dela_home_default: the widgets a side may have, and the set a new member sees.
--   dela_home_layout: what to draw. dela_home_layout_save / _reset: the member's own choice, with one audit line.
-- A layout only says what Home shows. It never hides a notification, a message or a feature anywhere else.
-- Additive: one table, five functions. The two sides keep separate layouts.
create table if not exists home_layouts (
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  widgets jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (person_id, side)
);
alter table home_layouts enable row level security;

create or replace function dela_home_widgets(p_side text) returns text[] language sql immutable set search_path = public, extensions, pg_temp as $$
  select case when p_side = 'attorney'
    then array['ask', 'attention', 'projects', 'usage', 'notifications', 'account', 'meetings', 'messages', 'bench', 'standing', 'quick']
    else array['ask', 'attention', 'projects', 'usage', 'notifications', 'account', 'meetings', 'messages', 'standing', 'quick'] end
$$;

create or replace function dela_home_default(p_side text) returns text[] language sql immutable set search_path = public, extensions, pg_temp as $$
  select array['ask', 'attention', 'projects', 'usage', 'notifications', 'account']
$$;

create or replace function dela_home_layout(p_person uuid, p_side text) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_saved jsonb; v_list text[];
begin
  if p_side not in ('attorney', 'freelancer') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  select widgets into v_saved from home_layouts where person_id = p_person and side = p_side;
  if v_saved is not null then
    -- A widget that no longer exists for this side is left out, in the member's order
    select coalesce(array_agg(x.id order by x.n), '{}') into v_list
    from jsonb_array_elements_text(v_saved) with ordinality x(id, n) where x.id = any(dela_home_widgets(p_side));
  end if;
  if v_list is null or coalesce(array_length(v_list, 1), 0) = 0 then v_list := dela_home_default(p_side); v_saved := null; end if;
  return jsonb_build_object('ok', true, 'widgets', to_jsonb(v_list), 'customized', v_saved is not null,
    'all', to_jsonb(dela_home_widgets(p_side)), 'default', to_jsonb(dela_home_default(p_side)));
end $$;

create or replace function dela_home_layout_save(p_person uuid, p_side text, p_widgets jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_list text[] := '{}'; v_id text;
begin
  if p_side not in ('attorney', 'freelancer') or jsonb_typeof(p_widgets) is distinct from 'array' or jsonb_array_length(p_widgets) > 30 then
    return jsonb_build_object('ok', false, 'reason', 'bad_request');
  end if;
  for v_id in select x #>> '{}' from jsonb_array_elements(p_widgets) with ordinality t(x, n) where jsonb_typeof(x) = 'string' order by n loop
    if not (v_id = any(dela_home_widgets(p_side))) then return jsonb_build_object('ok', false, 'reason', 'unknown_widget', 'widget', left(v_id, 40)); end if;
    if not (v_id = any(v_list)) then v_list := v_list || v_id; end if;
  end loop;
  if coalesce(array_length(v_list, 1), 0) = 0 then return jsonb_build_object('ok', false, 'reason', 'keep_one_widget'); end if;
  insert into home_layouts (person_id, side, widgets) values (p_person, p_side, to_jsonb(v_list))
  on conflict (person_id, side) do update set widgets = excluded.widgets, updated_at = now();
  perform dela_audit('member', p_person, 'home_layout_saved', 'person', p_person::text, jsonb_build_object('side', p_side, 'widgets', to_jsonb(v_list)));
  return dela_home_layout(p_person, p_side);
end $$;

create or replace function dela_home_layout_reset(p_person uuid, p_side text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_n int;
begin
  with d as (delete from home_layouts where person_id = p_person and side = p_side returning 1) select count(*)::int into v_n from d;
  if v_n > 0 then perform dela_audit('member', p_person, 'home_layout_reset', 'person', p_person::text, jsonb_build_object('side', p_side)); end if;
  return dela_home_layout(p_person, p_side);
end $$;

do $$ declare f text; begin
  foreach f in array array['dela_home_widgets(text)', 'dela_home_default(text)', 'dela_home_layout(uuid,text)', 'dela_home_layout_save(uuid,text,jsonb)', 'dela_home_layout_reset(uuid,text)'] loop
    execute 'revoke all on function ' || f || ' from public, anon, authenticated';
  end loop;
end $$;

-- Step 65: code the owner adds to DELA's pages (Stacey 2026-11-20: "a section where I can add code that will be
-- injected into the header, into the footer, and before /body").
-- Three places: head (inside the page's head), footer (at the page's footer) and body_end (last thing before the
-- closing body tag). Each can be switched off without losing its code. Every save is kept in a history that is
-- never changed, so an earlier version can be put back. Only the owner may save. The code runs on DELA's member
-- pages, never in the admin area, so a mistake in it cannot lock the owner out of the page that fixes it.
-- Additive: two tables and three functions.

create table if not exists site_code (
  slot text primary key check (slot in ('head', 'footer', 'body_end')),
  code text not null default '',
  enabled boolean not null default true,
  updated_by uuid references people(id),
  updated_at timestamptz not null default now()
);
alter table site_code enable row level security;

create table if not exists site_code_history (
  id bigint generated always as identity primary key,
  slot text not null,
  code text not null,
  enabled boolean not null,
  saved_by uuid references people(id),
  saved_at timestamptz not null default now()
);
alter table site_code_history enable row level security;
create index if not exists site_code_history_slot on site_code_history (slot, id desc);

-- What the member pages load: only the places that are on and hold code
create or replace function dela_site_code() returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_object_agg(slot, code), '{}'::jsonb) from site_code where enabled and btrim(code) <> ''
$$;
revoke all on function dela_site_code() from public, anon, authenticated;

-- The admin page: the three places, and the last saves of each (who, when, how long; the text of each for "Put back")
create or replace function dela_admin_site_code(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return jsonb_build_object('ok', true, 'owner', dela_staff_roles(p_actor) @> array['owner'], 'max', 20000,
    'slots', (select jsonb_agg(jsonb_build_object('slot', s.slot, 'code', coalesce(c.code, ''), 'enabled', coalesce(c.enabled, true),
        'updated_at', c.updated_at, 'updated_by', (select display_name from people where id = c.updated_by),
        'history', coalesce((select jsonb_agg(x) from (select jsonb_build_object('id', hh.id, 'saved_at', hh.saved_at, 'chars', length(hh.code), 'enabled', hh.enabled,
            'by', (select display_name from people where id = hh.saved_by)) x from site_code_history hh where hh.slot = s.slot order by hh.id desc limit 5) t), '[]')) order by s.n)
      from (values ('head', 1), ('footer', 2), ('body_end', 3)) s(slot, n) left join site_code c on c.slot = s.slot));
end $$;
revoke all on function dela_admin_site_code(uuid) from public, anon, authenticated;

-- Save one place. p_restore: the id of an earlier save to put back (its text is used; p_code is ignored).
create or replace function dela_admin_site_code_set(p_actor uuid, p_slot text, p_code text, p_enabled boolean, p_restore bigint default null)
returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_code text := coalesce(p_code, ''); v_on boolean := coalesce(p_enabled, true); c site_code;
begin
  perform dela_require_staff(p_actor, '{}');
  if p_slot not in ('head', 'footer', 'body_end') then return jsonb_build_object('ok', false, 'reason', 'bad_slot'); end if;
  if p_restore is not null then
    select code into v_code from site_code_history where id = p_restore and slot = p_slot;
    if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  end if;
  if length(v_code) > 20000 then return jsonb_build_object('ok', false, 'reason', 'too_long', 'max', 20000); end if;
  select * into c from site_code where slot = p_slot for update;
  if c.slot is not null and c.code = v_code and c.enabled = v_on then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  insert into site_code (slot, code, enabled, updated_by, updated_at) values (p_slot, v_code, v_on, p_actor, now())
  on conflict (slot) do update set code = excluded.code, enabled = excluded.enabled, updated_by = excluded.updated_by, updated_at = now();
  insert into site_code_history (slot, code, enabled, saved_by) values (p_slot, v_code, v_on, p_actor);
  perform dela_audit('staff', p_actor, 'site_code_saved', 'site_code', p_slot, jsonb_build_object('chars', length(v_code), 'enabled', v_on, 'restored_from', p_restore));
  return jsonb_build_object('ok', true, 'chars', length(v_code), 'enabled', v_on);
end $$;
revoke all on function dela_admin_site_code_set(uuid, text, text, boolean, bigint) from public, anon, authenticated;

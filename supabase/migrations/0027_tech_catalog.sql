-- Step 4, part 1: the tech catalog (brief docs/briefs/step-4-matching-gigs-proposals.md, Stacey's answer 10).
-- The Lawfecta Team uploads one CSV with every tool (columns: docs/templates/tech-catalog-guide.md). A new upload replaces the
-- whole list. DELA shows what will be added, changed and removed before the team confirms, and keeps every earlier version.
-- DELA's AI recommends tools only from the active list. Additive: new tables, functions, one switch and two settings.

insert into feature_switches (key, label, gate) values
  ('tech_catalog', 'Tech catalog: DELA recommends tools only from the Lawfecta list', 'Step 4 tested')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('catalog.max_rows', '500', 'Most tools in one catalog upload', 'Tech catalog', 'tools', 'R', 'Claude', ''),
  ('catalog.ai_max_tools', '60', 'Most catalog tools DELA''s AI reads in one answer', 'Tech catalog', 'tools', 'R', 'Claude', 'The best fits for the member come first.')
on conflict (key) do nothing;

-- One row per upload. Never edited except its state, which moves preview -> active -> replaced (or preview -> discarded).
create table tech_catalog_versions (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references people(id),
  file_name text not null default '',
  sha256 text not null,
  row_count int not null,
  added int not null default 0,
  changed int not null default 0,
  removed int not null default 0,
  state text not null default 'preview' check (state in ('preview', 'active', 'replaced', 'discarded')),
  confirmed_by uuid references people(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index tech_catalog_one_active on tech_catalog_versions ((true)) where state = 'active';
alter table tech_catalog_versions enable row level security;

-- The tools in each version, exactly as uploaded (data holds every column, cleaned)
create table tech_catalog_tools (
  version_id uuid not null references tech_catalog_versions(id),
  tool_id text not null check (tool_id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name text not null,
  category text not null,
  status text not null check (status in ('active', 'paused')),
  partner boolean not null default false,
  data jsonb not null,
  primary key (version_id, tool_id)
);
alter table tech_catalog_tools enable row level security;

-- Pauses made in the admin area between uploads (append-only). The latest event per tool wins until the next upload.
create table tech_catalog_events (
  id bigserial primary key,
  version_id uuid not null references tech_catalog_versions(id),
  tool_id text not null,
  action text not null check (action in ('paused', 'resumed')),
  reason text not null default '',
  actor uuid not null references people(id),
  at timestamptz not null default now()
);
alter table tech_catalog_events enable row level security;

-- The status a tool has now: its uploaded status, then any later pause or resume in the admin area
create or replace function dela_catalog_status(p_version uuid, p_tool text, p_uploaded text) returns text language sql stable as $$
  select coalesce((select case when e.action = 'paused' then 'paused' else 'active' end from tech_catalog_events e
                   where e.version_id = p_version and e.tool_id = p_tool order by e.id desc limit 1), p_uploaded)
$$;

-- Preview an upload: saves it as a preview version and returns what changes against the active list. Idempotent on the file's hash.
create or replace function dela_catalog_preview(p_actor uuid, p_file text, p_sha text, p_rows jsonb) returns jsonb language plpgsql as $$
declare v_id uuid; v_active uuid; v_added int; v_changed int; v_removed int; v_max int := dela_int_setting('catalog.max_rows', 500);
begin
  perform dela_require_staff(p_actor, array['support']);
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then return jsonb_build_object('ok', false, 'reason', 'catalog_empty'); end if;
  if jsonb_array_length(p_rows) > v_max then return jsonb_build_object('ok', false, 'reason', 'catalog_too_many', 'max', v_max); end if;
  select id into v_active from tech_catalog_versions where state = 'active';
  select id into v_id from tech_catalog_versions where state = 'preview' and sha256 = p_sha and uploaded_by = p_actor order by created_at desc limit 1;
  if v_id is null then
    insert into tech_catalog_versions (uploaded_by, file_name, sha256, row_count) values (p_actor, left(coalesce(p_file, ''), 200), p_sha, jsonb_array_length(p_rows)) returning id into v_id;
    insert into tech_catalog_tools (version_id, tool_id, name, category, status, partner, data)
      select v_id, r->>'tool_id', r->>'name', r->>'category', r->>'status', coalesce((r->>'lawfecta_partner')::boolean, false), r
      from jsonb_array_elements(p_rows) r;
  end if;
  select count(*) into v_added from tech_catalog_tools n where n.version_id = v_id and not exists (select 1 from tech_catalog_tools o where o.version_id = v_active and o.tool_id = n.tool_id);
  select count(*) into v_removed from tech_catalog_tools o where o.version_id = v_active and not exists (select 1 from tech_catalog_tools n where n.version_id = v_id and n.tool_id = o.tool_id);
  select count(*) into v_changed from tech_catalog_tools n join tech_catalog_tools o on o.tool_id = n.tool_id and o.version_id = v_active where n.version_id = v_id and o.data <> n.data;
  update tech_catalog_versions set added = v_added, changed = v_changed, removed = v_removed where id = v_id;
  return jsonb_build_object('ok', true, 'version_id', v_id, 'rows', jsonb_array_length(p_rows), 'added', v_added, 'changed', v_changed, 'removed', v_removed,
    'added_names', (select coalesce(jsonb_agg(n.name order by n.name), '[]') from tech_catalog_tools n where n.version_id = v_id and not exists (select 1 from tech_catalog_tools o where o.version_id = v_active and o.tool_id = n.tool_id)),
    'removed_names', (select coalesce(jsonb_agg(o.name order by o.name), '[]') from tech_catalog_tools o where o.version_id = v_active and not exists (select 1 from tech_catalog_tools n where n.version_id = v_id and n.tool_id = o.tool_id)),
    'changed_tools', (select coalesce(jsonb_agg(jsonb_build_object('name', n.name, 'fields',
        (select coalesce(jsonb_agg(k order by k), '[]') from jsonb_object_keys(n.data) k where n.data->k is distinct from o.data->k)) order by n.name), '[]')
      from tech_catalog_tools n join tech_catalog_tools o on o.tool_id = n.tool_id and o.version_id = v_active where n.version_id = v_id and o.data <> n.data),
    'first_upload', v_active is null);
end $$;

-- Confirm a preview: it becomes the active list and the old one is kept as replaced. Idempotent.
create or replace function dela_catalog_confirm(p_actor uuid, p_version uuid) returns jsonb language plpgsql as $$
declare v tech_catalog_versions;
begin
  perform dela_require_staff(p_actor, array['support']);
  select * into v from tech_catalog_versions where id = p_version for update;
  if v.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v.state = 'active' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if v.state <> 'preview' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  update tech_catalog_versions set state = 'replaced' where state = 'active';
  update tech_catalog_versions set state = 'active', confirmed_by = p_actor, confirmed_at = now() where id = p_version;
  update tech_catalog_versions set state = 'discarded' where state = 'preview' and id <> p_version;
  perform dela_audit('staff', p_actor, 'catalog_replaced', 'tech_catalog', p_version::text, jsonb_build_object('rows', v.row_count, 'added', v.added, 'changed', v.changed, 'removed', v.removed));
  return jsonb_build_object('ok', true, 'version_id', p_version);
end $$;

-- Pause or resume one tool between uploads (the next upload's own status column replaces this)
create or replace function dela_catalog_pause(p_actor uuid, p_tool text, p_pause boolean, p_reason text) returns jsonb language plpgsql as $$
declare v_active uuid; v_now text;
begin
  perform dela_require_staff(p_actor, array['support']);
  select id into v_active from tech_catalog_versions where state = 'active';
  if v_active is null or not exists (select 1 from tech_catalog_tools where version_id = v_active and tool_id = p_tool) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select dela_catalog_status(v_active, t.tool_id, t.status) into v_now from tech_catalog_tools t where t.version_id = v_active and t.tool_id = p_tool;
  if (v_now = 'paused') = p_pause then return jsonb_build_object('ok', true, 'duplicate', true, 'status', v_now); end if;
  insert into tech_catalog_events (version_id, tool_id, action, reason, actor) values (v_active, p_tool, case when p_pause then 'paused' else 'resumed' end, left(coalesce(p_reason, ''), 300), p_actor);
  perform dela_audit('staff', p_actor, case when p_pause then 'catalog_tool_paused' else 'catalog_tool_resumed' end, 'tech_catalog', p_tool, jsonb_build_object('reason', left(coalesce(p_reason, ''), 300)));
  return jsonb_build_object('ok', true, 'status', case when p_pause then 'paused' else 'active' end);
end $$;

-- The active tools DELA's AI may recommend (paused tools are never included)
create or replace function dela_catalog_active() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(t.data order by t.name), '[]') from tech_catalog_tools t join tech_catalog_versions v on v.id = t.version_id
  where v.state = 'active' and dela_catalog_status(v.id, t.tool_id, t.status) = 'active'
$$;

-- The admin view: the active list with each tool's status now, and every version
create or replace function dela_admin_catalog(p_actor uuid) returns jsonb language plpgsql stable as $$
declare v_active uuid;
begin
  perform dela_require_staff(p_actor, array['support', 'reviewer']);
  select id into v_active from tech_catalog_versions where state = 'active';
  return jsonb_build_object('on_for', (select state from feature_switches where key = 'tech_catalog'),
    'active_version', v_active,
    'tools', (select coalesce(jsonb_agg(jsonb_build_object('tool_id', t.tool_id, 'name', t.name, 'category', t.category, 'partner', t.partner,
        'uploaded_status', t.status, 'status', dela_catalog_status(v_active, t.tool_id, t.status), 'website', t.data->>'website', 'last_reviewed', t.data->>'last_reviewed') order by t.category, t.name), '[]')
      from tech_catalog_tools t where t.version_id = v_active),
    'versions', (select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'file_name', v.file_name, 'rows', v.row_count, 'added', v.added, 'changed', v.changed, 'removed', v.removed,
        'state', v.state, 'uploaded_by', pe.display_name, 'created_at', v.created_at, 'confirmed_at', v.confirmed_at) order by v.created_at desc), '[]')
      from tech_catalog_versions v join people pe on pe.id = v.uploaded_by where v.state <> 'discarded'));
end $$;

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

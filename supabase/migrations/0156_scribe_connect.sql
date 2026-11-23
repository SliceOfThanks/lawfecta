-- Step 76: a firm connects its Scribe account, so a member picks a guide from a list in place of exporting a file
-- (Stacey 2026-11-23, about the Ask DELA message box: "they should be able to ... connect Scribe project with the
-- integration"; docs/briefs/step-76-scribe-connection.md).
-- Scribe offers a read-only connection that works with a key from the firm's own Scribe account. The key is sealed by
-- the api (the same encryption as members' AI keys) before it reaches this table; only its last 4 characters are kept
-- in the open. One connection for each Library. The Library's administrator connects and disconnects; editors use it.
-- Additive: one switch (off), one setting, one table, five functions.

insert into feature_switches (key, label, gate) values ('scribe_connect', 'Connect a firm''s Scribe account, to pick a guide from a list in place of an exported file (step 76)', 'Stacey said yes 2026-11-23; tested with a stand-in for Scribe, a real Scribe key still to be seen working')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('import.scribe_page_size', '25'::jsonb, 'Guides shown on one page of a connected Scribe account', 'Documents', 'guides', 'C', 'Claude 2026-11-23 (step 76)', 'Scribe allows up to 100.')
on conflict (key) do nothing;

create table if not exists scribe_connections (
  id uuid primary key,
  org_id uuid not null references organizations(id),
  ciphertext text not null,
  last4 text not null check (length(last4) = 4),
  status text not null default 'active' check (status in ('active', 'failed', 'removed')),
  last_error text not null default '',
  last_used_at timestamptz,
  added_by uuid not null references people(id),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references people(id)
);
create unique index if not exists scribe_connections_one on scribe_connections (org_id) where status <> 'removed';
alter table scribe_connections enable row level security;

-- What the import page shows. Never the key, only its last 4 characters.
create or replace function dela_scribe_state(p_person uuid, p_org uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('ok', true,
    'on', dela_switch_on('scribe_connect', p_person) and dela_switch_on('scribe_import', p_person) and r.rank >= 3,
    'may_manage', r.rank >= 4, 'may_use', r.rank >= 3,
    'connected', c.id is not null and r.rank >= 3,
    'connection', case when c.id is null or r.rank < 3 then null else jsonb_build_object('last4', c.last4, 'status', c.status, 'last_error', c.last_error,
      'added_by', (select display_name from people where id = c.added_by), 'added_at', c.created_at, 'last_used_at', c.last_used_at) end,
    'page_size', least(greatest(dela_int_setting('import.scribe_page_size', 25), 1), 100))
  from (select dela_pb_rank(dela_pb_role(p_person, p_org)) as rank) r
  left join scribe_connections c on c.org_id = p_org and c.status <> 'removed'
$$;
revoke all on function dela_scribe_state(uuid, uuid) from public, anon, authenticated;

-- p: id, person_id, org_id, ciphertext, last4. A new key replaces the old one, and the old sealed key is wiped.
create or replace function dela_scribe_save(p jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_person uuid := (p->>'person_id')::uuid; v_org uuid := (p->>'org_id')::uuid; v_id uuid := (p->>'id')::uuid; old scribe_connections;
begin
  if not (dela_switch_on('scribe_connect', v_person) and dela_switch_on('scribe_import', v_person)) then return jsonb_build_object('ok', false, 'reason', 'scribe_off'); end if;
  if dela_pb_rank(dela_pb_role(v_person, v_org)) < 4 then return jsonb_build_object('ok', false, 'reason', 'administrator_only'); end if;
  if dela_has_hold(v_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  perform pg_advisory_xact_lock(hashtextextended('scribe:' || v_org::text, 0));
  -- The same save sent twice (two clicks) is one connection
  if exists (select 1 from scribe_connections where id = v_id) then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_id); end if;
  select * into old from scribe_connections where org_id = v_org and status <> 'removed';
  if old.id is not null then
    update scribe_connections set status = 'removed', removed_at = now(), removed_by = v_person, ciphertext = 'removed' where id = old.id;
  end if;
  insert into scribe_connections (id, org_id, ciphertext, last4, added_by) values (v_id, v_org, p->>'ciphertext', p->>'last4', v_person);
  perform dela_audit('member', v_person, case when old.id is null then 'scribe_connected' else 'scribe_key_replaced' end, 'scribe_connection', v_id::text,
    jsonb_build_object('org_id', v_org, 'replaced', old.id));
  return jsonb_build_object('ok', true, 'duplicate', false, 'id', v_id, 'replaced', old.id is not null);
end $$;
revoke all on function dela_scribe_save(jsonb) from public, anon, authenticated;

-- Disconnecting works with the switch off too, so a firm can always take its key back. The sealed key is wiped.
create or replace function dela_scribe_remove(p_person uuid, p_org uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare c scribe_connections;
begin
  if dela_pb_rank(dela_pb_role(p_person, p_org)) < 4 then return jsonb_build_object('ok', false, 'reason', 'administrator_only'); end if;
  select * into c from scribe_connections where org_id = p_org and status <> 'removed' for update;
  if c.id is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update scribe_connections set status = 'removed', removed_at = now(), removed_by = p_person, ciphertext = 'removed' where id = c.id;
  perform dela_audit('member', p_person, 'scribe_disconnected', 'scribe_connection', c.id::text, jsonb_build_object('org_id', p_org));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_scribe_remove(uuid, uuid) from public, anon, authenticated;

-- The api reads the sealed key only to use it, and only for an editor or administrator of that Library, at that moment
create or replace function dela_scribe_load(p_person uuid, p_org uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select case
    when not (dela_switch_on('scribe_connect', p_person) and dela_switch_on('scribe_import', p_person)) then jsonb_build_object('ok', false, 'reason', 'scribe_off')
    when dela_pb_rank(dela_pb_role(p_person, p_org)) < 3 then jsonb_build_object('ok', false, 'reason', 'not_allowed')
    when dela_has_hold(p_person) then jsonb_build_object('ok', false, 'reason', 'on_hold')
    else coalesce((select jsonb_build_object('ok', true, 'id', c.id, 'ciphertext', c.ciphertext) from scribe_connections c where c.org_id = p_org and c.status <> 'removed'),
      jsonb_build_object('ok', false, 'reason', 'scribe_not_connected')) end
$$;
revoke all on function dela_scribe_load(uuid, uuid) from public, anon, authenticated;

-- How the key did the last time it was used
create or replace function dela_scribe_result(p_id uuid, p_ok boolean, p_error text) returns void language sql set search_path = public, extensions, pg_temp as $$
  update scribe_connections set status = case when p_ok then 'active' else 'failed' end,
    last_error = case when p_ok then '' else left(coalesce(p_error, ''), 60) end, last_used_at = now()
  where id = p_id and status <> 'removed'
$$;
revoke all on function dela_scribe_result(uuid, boolean, text) from public, anon, authenticated;

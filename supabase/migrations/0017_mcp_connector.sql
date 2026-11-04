-- Step 2b: DELA in ChatGPT and Claude (an MCP connector with "sign in with Lawfecta").
-- Brief docs/briefs/step-2b-mcp-connector.md, built with the suggested answers (Stacey 2026-11-04: keep building,
-- hold anything that needs me). Tokens are stored only as hashes. Additive only.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('mcp.name', '"Lawfecta DELA"', 'Name shown in ChatGPT and Claude', 'Connected AI apps', '', 'O', 'Step 2b question 6 (suggested)', ''),
  ('mcp.plans', '["att_free","att_plus","att_pro","att_business","fl_free","fl_plus","fl_pro","fl_business"]', 'Plans that include the ChatGPT and Claude connector', 'Connected AI apps', '', 'O', 'Step 2b question 2 (open; all plans for now, like BYOK)', ''),
  ('mcp.unused_days', '90', 'Days a connection lasts without use', 'Connected AI apps', 'days', 'O', 'Step 2b brief', ''),
  ('mcp.access_minutes', '60', 'Minutes one access token lasts (it renews by itself)', 'Connected AI apps', 'minutes', 'R', 'Claude', ''),
  ('mcp.calls_per_minute', '30', 'Most connector calls per member per minute', 'Connected AI apps', 'calls', 'O', 'Step 2b brief', ''),
  ('mcp.write_actions', 'false', 'Members may post, send or book from ChatGPT and Claude', 'Connected AI apps', '', 'O', 'Step 2b question 4 (suggested: read and draft only; finish on the website)', 'Drafting playbooks and suggesting changes is allowed; changes are accepted on the website.')
on conflict (key) do nothing;

insert into feature_switches (key, label, gate) values ('mcp_connector', 'DELA in ChatGPT and Claude (connector)', 'Step 2b tested in ChatGPT and in Claude')
on conflict (key) do nothing;

-- The emergency pause gets its own area for the connector
update settings set value = value || '{"connector": false}' where key = 'emergency.pause' and not (value ? 'connector');

create table mcp_clients (
  id text primary key,
  name text not null default '',
  redirect_uris text[] not null,
  created_at timestamptz not null default now()
);

-- A sign-in started by ChatGPT or Claude, waiting for the member to approve on the DELA page
create table mcp_auth_requests (
  id text primary key,
  client_id text not null references mcp_clients(id),
  redirect_uri text not null,
  code_challenge text not null,
  state text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_at timestamptz
);

create table mcp_codes (
  code_hash text primary key,
  client_id text not null,
  redirect_uri text not null,
  code_challenge text not null,
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  expires_at timestamptz not null,
  used_at timestamptz,
  connection_id uuid
);

create table mcp_connections (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  client_id text not null references mcp_clients(id),
  client_name text not null default '',
  refresh_hash text unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references people(id),
  revoke_reason text not null default ''
);
create index mcp_connections_person on mcp_connections (person_id) where revoked_at is null;

create table mcp_tokens (
  token_hash text primary key,
  connection_id uuid not null references mcp_connections(id),
  expires_at timestamptz not null
);

-- Every connector call, append-only. Never holds what was asked or answered.
create table mcp_calls (
  id bigserial primary key,
  at timestamptz not null default now(),
  connection_id uuid not null references mcp_connections(id),
  tool text not null,
  ok boolean not null,
  error text not null default ''
);
create index mcp_calls_conn on mcp_calls (connection_id, at desc);
create trigger mcp_calls_append_only before update or delete on mcp_calls for each row execute function dela_no_change();

do $$
declare t text;
begin
  foreach t in array array['mcp_clients', 'mcp_auth_requests', 'mcp_codes', 'mcp_connections', 'mcp_tokens', 'mcp_calls'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end $$;

-- ---------- OAuth ----------

-- Dynamic client registration: ChatGPT and Claude register themselves. Only https addresses, or localhost for desktop apps.
create or replace function dela_mcp_register(p_id text, p_name text, p_redirects jsonb) returns jsonb language plpgsql as $$
declare u text; v_list text[];
begin
  if jsonb_typeof(p_redirects) is distinct from 'array' or jsonb_array_length(p_redirects) = 0 or jsonb_array_length(p_redirects) > 10 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_redirect_uri');
  end if;
  for u in select jsonb_array_elements_text(p_redirects) loop
    if length(u) > 500 or not (u like 'https://%' or u like 'http://localhost:%' or u like 'http://127.0.0.1:%' or u like 'http://localhost/%' or u like 'http://127.0.0.1/%') or position('#' in u) > 0 then
      return jsonb_build_object('ok', false, 'reason', 'invalid_redirect_uri');
    end if;
    v_list := v_list || u;
  end loop;
  insert into mcp_clients (id, name, redirect_uris) values (p_id, left(coalesce(nullif(btrim(p_name), ''), 'An AI app'), 80), v_list);
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_mcp_auth_start(p_id text, p_client text, p_redirect text, p_challenge text, p_state text) returns jsonb language plpgsql as $$
declare c mcp_clients;
begin
  select * into c from mcp_clients where id = p_client;
  if c.id is null then return jsonb_build_object('ok', false, 'reason', 'invalid_client'); end if;
  if not (p_redirect = any(c.redirect_uris)) then return jsonb_build_object('ok', false, 'reason', 'invalid_redirect_uri'); end if;
  if coalesce(length(p_challenge), 0) < 43 or length(p_challenge) > 128 then return jsonb_build_object('ok', false, 'reason', 'invalid_request'); end if;
  delete from mcp_auth_requests where expires_at < now() - interval '1 day';
  insert into mcp_auth_requests (id, client_id, redirect_uri, code_challenge, state, expires_at)
  values (p_id, p_client, p_redirect, p_challenge, left(coalesce(p_state, ''), 500), now() + interval '15 minutes');
  return jsonb_build_object('ok', true);
end $$;

-- What the approval page shows
create or replace function dela_mcp_auth_get(p_person uuid, p_side text, p_req text) returns jsonb language plpgsql stable as $$
declare r mcp_auth_requests; c mcp_clients;
begin
  select * into r from mcp_auth_requests where id = p_req;
  if r.id is null or r.decided_at is not null or r.expires_at < now() then return jsonb_build_object('ok', false, 'reason', 'request_expired'); end if;
  select * into c from mcp_clients where id = r.client_id;
  return jsonb_build_object('ok', true, 'client_name', c.name, 'redirect_host', split_part(split_part(r.redirect_uri, '://', 2), '/', 1),
    'side', p_side, 'on', dela_switch_on('mcp_connector', p_person),
    'plan_ok', dela_setting('mcp.plans') ? coalesce((select plan_code from side_profiles where person_id = p_person and side = p_side and status <> 'closed'), ''),
    'name', dela_setting_text('mcp.name', 'Lawfecta DELA'));
end $$;

-- Approve or deny on the DELA page. Approving makes a one-use code (10 minutes) for this person and side.
create or replace function dela_mcp_decide(p_person uuid, p_side text, p_req text, p_approve boolean, p_code_hash text) returns jsonb language plpgsql as $$
declare r mcp_auth_requests;
begin
  select * into r from mcp_auth_requests where id = p_req for update;
  if r.id is null or r.decided_at is not null or r.expires_at < now() then return jsonb_build_object('ok', false, 'reason', 'request_expired'); end if;
  update mcp_auth_requests set decided_at = now() where id = r.id;
  if not p_approve then
    return jsonb_build_object('ok', true, 'redirect_uri', r.redirect_uri, 'state', r.state, 'approved', false);
  end if;
  if not dela_switch_on('mcp_connector', p_person) then return jsonb_build_object('ok', false, 'reason', 'connector_off'); end if;
  if not (dela_setting('mcp.plans') ? coalesce((select plan_code from side_profiles where person_id = p_person and side = p_side and status <> 'closed'), '')) then
    return jsonb_build_object('ok', false, 'reason', 'not_in_plan');
  end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  insert into mcp_codes (code_hash, client_id, redirect_uri, code_challenge, person_id, side, expires_at)
  values (p_code_hash, r.client_id, r.redirect_uri, r.code_challenge, p_person, p_side, now() + interval '10 minutes');
  perform dela_audit('member', p_person, 'connector_approved', 'mcp_client', r.client_id, jsonb_build_object('side', p_side));
  return jsonb_build_object('ok', true, 'redirect_uri', r.redirect_uri, 'state', r.state, 'approved', true);
end $$;

-- The code can be used once; the api checks PKCE with what this returns
create or replace function dela_mcp_code_take(p_code_hash text, p_client text, p_redirect text) returns jsonb language plpgsql as $$
declare c mcp_codes;
begin
  select * into c from mcp_codes where code_hash = p_code_hash for update;
  if c.code_hash is null or c.used_at is not null or c.expires_at < now() or c.client_id <> p_client or c.redirect_uri <> p_redirect then
    if c.code_hash is not null and c.used_at is not null then
      -- A code used twice: stop the connection it made (RFC 6749 section 4.1.2)
      update mcp_connections set revoked_at = now(), revoke_reason = 'code_reused' where id = c.connection_id and revoked_at is null;
      delete from mcp_tokens where connection_id = c.connection_id;
    end if;
    return jsonb_build_object('ok', false, 'reason', 'invalid_grant');
  end if;
  update mcp_codes set used_at = now() where code_hash = c.code_hash;
  return jsonb_build_object('ok', true, 'challenge', c.code_challenge, 'person_id', c.person_id, 'side', c.side);
end $$;

create or replace function dela_mcp_connect(p_person uuid, p_side text, p_client text, p_access_hash text, p_refresh_hash text, p_code_hash text) returns jsonb language plpgsql as $$
declare v_id uuid;
begin
  insert into mcp_connections (person_id, side, client_id, client_name, refresh_hash)
  values (p_person, p_side, p_client, coalesce((select name from mcp_clients where id = p_client), ''), p_refresh_hash) returning id into v_id;
  update mcp_codes set connection_id = v_id where code_hash = p_code_hash;
  insert into mcp_tokens (token_hash, connection_id, expires_at) values (p_access_hash, v_id, now() + make_interval(mins => dela_int_setting('mcp.access_minutes', 60)));
  perform dela_audit('member', p_person, 'connector_connected', 'mcp_connection', v_id::text, jsonb_build_object('side', p_side, 'client', p_client));
  return jsonb_build_object('ok', true, 'connection_id', v_id, 'expires_in', dela_int_setting('mcp.access_minutes', 60) * 60);
end $$;

-- A refresh token works once and is replaced each time
create or replace function dela_mcp_refresh(p_old_hash text, p_client text, p_access_hash text, p_refresh_hash text) returns jsonb language plpgsql as $$
declare c mcp_connections;
begin
  select * into c from mcp_connections where refresh_hash = p_old_hash for update;
  if c.id is null or c.revoked_at is not null or c.client_id <> p_client
     or c.last_used_at < now() - make_interval(days => dela_int_setting('mcp.unused_days', 90)) or not dela_may_open(c.person_id) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_grant');
  end if;
  update mcp_connections set refresh_hash = p_refresh_hash, last_used_at = now() where id = c.id;
  delete from mcp_tokens where connection_id = c.id and expires_at < now();
  insert into mcp_tokens (token_hash, connection_id, expires_at) values (p_access_hash, c.id, now() + make_interval(mins => dela_int_setting('mcp.access_minutes', 60)));
  return jsonb_build_object('ok', true, 'expires_in', dela_int_setting('mcp.access_minutes', 60) * 60);
end $$;

-- Every call: the token, the connection, the person's access, the switch, the plan, holds, the pause and the rate limit
create or replace function dela_mcp_resolve(p_access_hash text) returns jsonb language plpgsql as $$
declare t mcp_tokens; c mcp_connections; p people; n int;
begin
  select * into t from mcp_tokens where token_hash = p_access_hash;
  if t.token_hash is null or t.expires_at < now() then return jsonb_build_object('ok', false, 'reason', 'invalid_token'); end if;
  select * into c from mcp_connections where id = t.connection_id;
  if c.revoked_at is not null then return jsonb_build_object('ok', false, 'reason', 'invalid_token'); end if;
  select * into p from people where id = c.person_id;
  if not dela_may_open(p.id) then return jsonb_build_object('ok', false, 'reason', 'invalid_token'); end if;
  if dela_paused('connector') then return jsonb_build_object('ok', false, 'reason', 'paused'); end if;
  if not dela_switch_on('mcp_connector', p.id) then return jsonb_build_object('ok', false, 'reason', 'connector_off'); end if;
  if not exists (select 1 from side_profiles where person_id = p.id and side = c.side and status <> 'closed') then return jsonb_build_object('ok', false, 'reason', 'no_side'); end if;
  if not (dela_setting('mcp.plans') ? (select plan_code from side_profiles where person_id = p.id and side = c.side)) then return jsonb_build_object('ok', false, 'reason', 'not_in_plan'); end if;
  select count(*) into n from mcp_calls where connection_id = c.id and at > now() - interval '1 minute';
  if n >= dela_int_setting('mcp.calls_per_minute', 30) then return jsonb_build_object('ok', false, 'reason', 'rate_limited'); end if;
  if c.last_used_at < now() - interval '1 minute' then update mcp_connections set last_used_at = now() where id = c.id; end if;
  return jsonb_build_object('ok', true, 'connection_id', c.id, 'person_id', p.id, 'side', c.side, 'bd_member_id', p.bd_member_id, 'name', p.display_name,
    'on_hold', dela_has_hold(p.id), 'write_actions', coalesce((dela_setting('mcp.write_actions') #>> '{}')::boolean, false));
end $$;

create or replace function dela_mcp_log(p_conn uuid, p_tool text, p_ok boolean, p_error text) returns void language sql as $$
  insert into mcp_calls (connection_id, tool, ok, error) values (p_conn, left(coalesce(p_tool, ''), 60), p_ok, left(coalesce(p_error, ''), 60))
$$;

-- ---------- Members and the Lawfecta Team ----------

create or replace function dela_mcp_connections(p_person uuid) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'side', c.side, 'client_name', c.client_name, 'created_at', c.created_at, 'last_used_at', c.last_used_at,
      'calls_30d', (select count(*) from mcp_calls m where m.connection_id = c.id and m.at > now() - interval '30 days')) order by c.created_at desc), '[]')
  from mcp_connections c where c.person_id = p_person and c.revoked_at is null
$$;

create or replace function dela_mcp_disconnect(p_person uuid, p_conn uuid, p_by_staff boolean) returns jsonb language plpgsql as $$
declare c mcp_connections;
begin
  select * into c from mcp_connections where id = p_conn for update;
  if c.id is null or (not p_by_staff and c.person_id <> p_person) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_by_staff then perform dela_require_staff(p_person, array['support']); end if;
  if c.revoked_at is not null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update mcp_connections set revoked_at = now(), revoked_by = p_person, revoke_reason = case when p_by_staff then 'lawfecta_team' else 'member' end where id = c.id;
  delete from mcp_tokens where connection_id = c.id;
  perform dela_audit(case when p_by_staff then 'staff' else 'member' end, p_person, 'connector_disconnected', 'mcp_connection', c.id::text, jsonb_build_object('client', c.client_name));
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_admin_mcp(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return jsonb_build_object(
    'connections', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('id', c.id, 'bd_member_id', p.bd_member_id, 'name', p.display_name, 'side', c.side,
        'client_name', c.client_name, 'created_at', c.created_at, 'last_used_at', c.last_used_at,
        'calls_30d', (select count(*) from mcp_calls m where m.connection_id = c.id and m.at > now() - interval '30 days'),
        'errors_30d', (select count(*) from mcp_calls m where m.connection_id = c.id and not m.ok and m.at > now() - interval '30 days')) x
      from mcp_connections c join people p on p.id = c.person_id where c.revoked_at is null order by c.last_used_at desc limit 200) t),
    'tools', (select coalesce(jsonb_agg(jsonb_build_object('tool', tool, 'calls', n, 'failed', f) order by n desc), '[]') from (
      select tool, count(*) n, count(*) filter (where not ok) f from mcp_calls where at > now() - interval '30 days' group by tool) t));
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

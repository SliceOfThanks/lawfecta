-- Step 82a: the admin connector and the attorney outreach pipeline (Stacey 2026-11-24: "Do we have an MCP connector? If
-- yes - we need one for ADMIN only", then: attorney record, stage tracking, a stalled list for Michelle's follow-up,
-- a proposal check on each gig, and weekly counts by stage; docs/briefs/step-82-admin-pipeline-connector.md).
-- A second connector, apart from the members' one: its own address, its own switch (off), its own approval. Only the
-- owner and people with the new team role "growth" may use it, and the role is checked on every call.
-- The pipeline is a list of attorneys by their website member number, so an attorney can be tracked before they have
-- ever opened DELA. What a person does is recorded (added, emailed, followed up). What the attorney does is read
-- from what really happened (first login, gig opened, proposal sent, agreement signed), never typed in.
-- This connector sends nothing, posts nothing, hires nobody and touches no money.
-- Additive: one switch (off), one more value for a team role, three columns with defaults, two tables, settings, functions.

insert into feature_switches (key, label, gate) values ('mcp_admin', 'The Lawfecta Team connector for ChatGPT and Claude: the attorney outreach pipeline (step 82)', 'Stacey asked for it 2026-11-24; the owner and the role "growth" only')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('pipeline.stalled', '{"emailed_not_claimed_days": 7, "claimed_playbook_unopened_days": 2, "claimed_no_gig_days": 3, "gig_no_proposals_hours": 48, "proposals_no_hire_days": 5}'::jsonb,
    'Pipeline: when an attorney counts as stuck at each stage', 'Pipeline', '', 'O', 'Stacey 2026-11-24 gave two (claimed, no gig after 3 days; a gig with no proposals after 48 hours); Claude proposed the other three',
    'Days or hours without the next step. Change a number here and the stalled list follows.'),
  ('pipeline.claim_plan_ids', '[6, 15]'::jsonb, 'Pipeline: the website plan numbers that are claim listings', 'Pipeline', '', 'C', 'Read from the website 2026-11-24: 6 "Claim Listing", 15 "Attorney Claim Listing"', 'A member on one of these has a listing and has not claimed it.'),
  ('pipeline.calls_per_minute', '60'::jsonb, 'Most Team connector calls for one connection in a minute', 'Pipeline', 'calls', 'C', 'Claude 2026-11-24 (step 82)', '')
on conflict (key) do nothing;

-- The new team role. It opens nothing else: every other team function names its own roles.
alter table staff_roles drop constraint if exists staff_roles_role_check;
alter table staff_roles add constraint staff_roles_role_check check (role in ('owner', 'reviewer', 'support', 'finance', 'growth'));

create or replace function dela_admin_staff_grant(p_actor uuid, p_bd bigint, p_role text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_person uuid; v bigint;
begin
  perform dela_require_staff(p_actor, '{}');
  if p_role not in ('owner', 'reviewer', 'support', 'finance', 'growth') then return jsonb_build_object('ok', false, 'reason', 'bad_role'); end if;
  select id into v_person from people where bd_member_id = p_bd;
  if v_person is null then return jsonb_build_object('ok', false, 'reason', 'never_signed_in'); end if;
  insert into staff_roles (person_id, role, granted_by) values (v_person, p_role, p_actor)
  on conflict (person_id, role) where revoked_at is null do nothing returning id into v;
  if v is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  perform dela_revoke_person(v_person);
  perform dela_audit('staff', p_actor, 'staff_granted', 'person', v_person::text, jsonb_build_object('role', p_role));
  return jsonb_build_object('ok', true, 'id', v);
end $$;
revoke all on function dela_admin_staff_grant(uuid, bigint, text) from public, anon, authenticated;

-- ---------- The admin kind of connection ----------
alter table mcp_auth_requests add column if not exists kind text not null default 'member' check (kind in ('member', 'admin'));
alter table mcp_codes add column if not exists kind text not null default 'member' check (kind in ('member', 'admin'));
alter table mcp_connections add column if not exists kind text not null default 'member' check (kind in ('member', 'admin'));

create or replace function dela_team_role(p_person uuid) returns text language sql stable set search_path = public, extensions, pg_temp as $$
  select case when exists (select 1 from staff_roles where person_id = p_person and revoked_at is null and role = 'owner') then 'owner'
    when exists (select 1 from staff_roles where person_id = p_person and revoked_at is null and role = 'growth') then 'growth' else '' end
$$;
revoke all on function dela_team_role(uuid) from public, anon, authenticated;

-- A sign-in that asked for the Team connector's address is marked, before anyone sees the approval page
create or replace function dela_mcp_auth_mark_admin(p_req text) returns void language sql set search_path = public, extensions, pg_temp as $$
  update mcp_auth_requests set kind = 'admin' where id = p_req and decided_at is null
$$;
revoke all on function dela_mcp_auth_mark_admin(text) from public, anon, authenticated;

create or replace function dela_mcp_auth_kind(p_req text) returns text language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce((select kind from mcp_auth_requests where id = p_req), 'member')
$$;
revoke all on function dela_mcp_auth_kind(text) from public, anon, authenticated;

-- What the approval page shows for the Team connector
create or replace function dela_mcp_admin_auth_get(p_person uuid, p_req text) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare r mcp_auth_requests; c mcp_clients;
begin
  select * into r from mcp_auth_requests where id = p_req;
  if r.id is null or r.kind <> 'admin' or r.decided_at is not null or r.expires_at < now() then return jsonb_build_object('ok', false, 'reason', 'request_expired'); end if;
  select * into c from mcp_clients where id = r.client_id;
  return jsonb_build_object('ok', true, 'kind', 'admin', 'client_name', c.name, 'redirect_host', split_part(split_part(r.redirect_uri, '://', 2), '/', 1),
    'on', dela_switch_on('mcp_admin', p_person), 'role', dela_team_role(p_person));
end $$;
revoke all on function dela_mcp_admin_auth_get(uuid, text) from public, anon, authenticated;

-- Approve or deny. Only a person who holds the role right now can approve.
create or replace function dela_mcp_admin_decide(p_person uuid, p_side text, p_req text, p_approve boolean, p_code_hash text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare r mcp_auth_requests;
begin
  select * into r from mcp_auth_requests where id = p_req for update;
  if r.id is null or r.kind <> 'admin' or r.decided_at is not null or r.expires_at < now() then return jsonb_build_object('ok', false, 'reason', 'request_expired'); end if;
  if p_approve and not dela_switch_on('mcp_admin', p_person) then return jsonb_build_object('ok', false, 'reason', 'team_connector_off'); end if;
  if p_approve and dela_team_role(p_person) = '' then return jsonb_build_object('ok', false, 'reason', 'not_on_team'); end if;
  update mcp_auth_requests set decided_at = now() where id = r.id;
  if not p_approve then return jsonb_build_object('ok', true, 'redirect_uri', r.redirect_uri, 'state', r.state, 'approved', false); end if;
  insert into mcp_codes (code_hash, client_id, redirect_uri, code_challenge, person_id, side, expires_at, kind)
  values (p_code_hash, r.client_id, r.redirect_uri, r.code_challenge, p_person, case when p_side = 'freelancer' then 'freelancer' else 'attorney' end, now() + interval '10 minutes', 'admin');
  perform dela_audit('staff', p_person, 'team_connector_approved', 'mcp_client', r.client_id, jsonb_build_object('role', dela_team_role(p_person)));
  return jsonb_build_object('ok', true, 'redirect_uri', r.redirect_uri, 'state', r.state, 'approved', true);
end $$;
revoke all on function dela_mcp_admin_decide(uuid, text, text, boolean, text) from public, anon, authenticated;

-- After the code is exchanged, the connection takes the kind the code was approved for
create or replace function dela_mcp_conn_kind(p_code_hash text) returns text language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_kind text; v_conn uuid;
begin
  select kind, connection_id into v_kind, v_conn from mcp_codes where code_hash = p_code_hash;
  if v_conn is not null and v_kind = 'admin' then update mcp_connections set kind = 'admin' where id = v_conn; end if;
  return coalesce(v_kind, 'member');
end $$;
revoke all on function dela_mcp_conn_kind(text) from public, anon, authenticated;

-- Which kind of connection a token belongs to ('' when the token is not known). The members' connector refuses an
-- admin token, and the Team connector refuses a member token.
create or replace function dela_mcp_token_kind(p_access_hash text) returns text language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce((select c.kind from mcp_tokens t join mcp_connections c on c.id = t.connection_id where t.token_hash = p_access_hash), '')
$$;
revoke all on function dela_mcp_token_kind(text) from public, anon, authenticated;

-- Every Team connector call: the token, the connection, the person's access, the pause, the switch, the role at this
-- moment, and the rate limit
create or replace function dela_mcp_admin_resolve(p_access_hash text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare t mcp_tokens; c mcp_connections; p people; n int; v_role text;
begin
  select * into t from mcp_tokens where token_hash = p_access_hash;
  if t.token_hash is null or t.expires_at < now() then return jsonb_build_object('ok', false, 'reason', 'invalid_token'); end if;
  select * into c from mcp_connections where id = t.connection_id;
  if c.revoked_at is not null or c.kind <> 'admin' then return jsonb_build_object('ok', false, 'reason', 'invalid_token'); end if;
  select * into p from people where id = c.person_id;
  if not dela_may_open(p.id) then return jsonb_build_object('ok', false, 'reason', 'invalid_token'); end if;
  if dela_paused('connector') then return jsonb_build_object('ok', false, 'reason', 'paused'); end if;
  if not dela_switch_on('mcp_admin', p.id) then return jsonb_build_object('ok', false, 'reason', 'team_connector_off'); end if;
  v_role := dela_team_role(p.id);
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_on_team'); end if;
  select count(*) into n from mcp_calls where connection_id = c.id and at > now() - interval '1 minute';
  if n >= dela_int_setting('pipeline.calls_per_minute', 60) then return jsonb_build_object('ok', false, 'reason', 'rate_limited'); end if;
  if c.last_used_at < now() - interval '1 minute' then update mcp_connections set last_used_at = now() where id = c.id; end if;
  return jsonb_build_object('ok', true, 'connection_id', c.id, 'person_id', p.id, 'role', v_role, 'name', p.display_name);
end $$;
revoke all on function dela_mcp_admin_resolve(text) from public, anon, authenticated;

-- ---------- The pipeline ----------
-- One row for each attorney the team is working, by website member number. The listing facts are a copy read from the
-- website when the attorney was added or last looked at.
create table if not exists pipeline_attorneys (
  bd_member_id bigint primary key check (bd_member_id > 0),
  name text not null default '',
  firm text not null default '',
  practice_area text not null default '',
  website text not null default '',
  city text not null default '',
  state text not null default '',
  listing_path text not null default '',
  plan_id int,
  listed_at timestamptz,
  added_by uuid references people(id),
  added_at timestamptz not null default now(),
  refreshed_at timestamptz not null default now(),
  -- Taken off the list by a person (a test, or added by mistake). Nothing is deleted; adding again puts them back.
  left_out boolean not null default false
);
alter table pipeline_attorneys enable row level security;

-- What a person did, append-only: the listing was built, a playbook was made, an email went out, a follow-up was made,
-- the attorney opened the playbook. The date a stage was reached is the first event of that stage.
create table if not exists pipeline_events (
  id bigserial primary key,
  bd_member_id bigint not null references pipeline_attorneys(bd_member_id),
  stage text not null check (stage in ('listing_built', 'playbook_made', 'emailed', 'follow_up', 'playbook_opened')),
  at timestamptz not null default now(),
  by_person uuid references people(id),
  tool text not null default '',
  note text not null default '',
  request_id text
);
alter table pipeline_events enable row level security;
create index if not exists pipeline_events_who on pipeline_events (bd_member_id, stage, at);
create unique index if not exists pipeline_events_request on pipeline_events (bd_member_id, stage, request_id) where request_id is not null;
drop trigger if exists pipeline_events_append_only on pipeline_events;
create trigger pipeline_events_append_only before update or delete on pipeline_events for each row execute function dela_no_change();

create or replace function dela_pipeline_stages() returns text[] language sql immutable set search_path = public, extensions, pg_temp as $$
  select array['listing_built', 'playbook_made', 'emailed', 'claimed', 'playbook_opened', 'gig_posted', 'proposals_received', 'hired']
$$;
revoke all on function dela_pipeline_stages() from public, anon, authenticated;

-- Every attorney the team can see: the ones in the pipeline, and DELA's attorneys who are not in it yet. One row each,
-- with the day each stage was reached. Claimed, gig posted, proposals received and hired come from what happened.
create or replace function dela_pipeline_table() returns table (bd_member_id bigint, person_id uuid, in_pipeline boolean, name text, firm text, practice_area text, website text, city text, state text,
  listing_path text, plan_id int, plan_code text, added_at timestamptz, listing_built timestamptz, playbook_made timestamptz, emailed timestamptz, claimed timestamptz, playbook_opened timestamptz,
  gig_posted timestamptz, proposals_received timestamptz, hired timestamptz, last_touch timestamptz, stage text)
language sql stable set search_path = public, extensions, pg_temp as $$
  with base as (
    select coalesce(pa.bd_member_id, pe.bd_member_id) bd, pe.id person_id, pa.bd_member_id is not null in_pipeline,
      coalesce(nullif(pa.name, ''), nullif(btrim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name, '') name,
      coalesce(nullif(pa.firm, ''), mp.body->>'firm_name', '') firm, coalesce(pa.practice_area, '') practice_area, coalesce(nullif(pa.website, ''), mp.body->>'website', '') website,
      coalesce(nullif(pa.city, ''), mp.body->>'city', '') city, coalesce(nullif(pa.state, ''), mp.body->>'state', '') state, coalesce(pa.listing_path, '') listing_path, pa.plan_id, sp.plan_code, pa.added_at,
      case when sp.status = 'active' then sp.created_at end claimed
    from (select * from pipeline_attorneys where not left_out) pa
      full join (people pe join side_profiles sp on sp.person_id = pe.id and sp.side = 'attorney' and sp.status <> 'closed') on pe.bd_member_id = pa.bd_member_id
      left join member_profiles mp on mp.person_id = pe.id and mp.side = 'attorney'
  ), ev as (
    select e.bd_member_id bd, min(at) filter (where e.stage = 'listing_built') listing_built, min(at) filter (where e.stage = 'playbook_made') playbook_made, min(at) filter (where e.stage = 'emailed') emailed,
      min(at) filter (where e.stage = 'playbook_opened') playbook_opened, max(at) filter (where e.stage in ('emailed', 'follow_up')) last_touch
    from pipeline_events e group by e.bd_member_id
  ), work as (
    select b.bd,
      (select min(g.opened_at) from gigs g join organizations o on o.id = g.org_id where o.owner_person_id = b.person_id and g.opened_at is not null) gig_posted,
      (select min(pr.sent_at) from proposals pr join gigs g on g.id = pr.gig_id join organizations o on o.id = g.org_id where o.owner_person_id = b.person_id and pr.sent_at is not null and pr.status <> 'draft') proposals_received,
      (select min(a.signed_at) from agreements a where a.attorney_person = b.person_id and a.status = 'signed' and a.signed_at is not null) hired
    from base b where b.person_id is not null
  ) select b.bd, b.person_id, b.in_pipeline, b.name, b.firm, b.practice_area, b.website, b.city, b.state, b.listing_path, b.plan_id, b.plan_code, b.added_at,
      ev.listing_built, ev.playbook_made, ev.emailed, b.claimed, ev.playbook_opened, w.gig_posted, w.proposals_received, w.hired, ev.last_touch,
      case when w.hired is not null then 'hired' when w.proposals_received is not null then 'proposals_received' when w.gig_posted is not null then 'gig_posted'
        when ev.playbook_opened is not null and b.claimed is not null then 'playbook_opened' when b.claimed is not null then 'claimed' when ev.emailed is not null then 'emailed'
        when ev.playbook_made is not null then 'playbook_made' when ev.listing_built is not null then 'listing_built' else 'added' end
    from base b left join ev on ev.bd = b.bd left join work w on w.bd = b.bd
$$;
revoke all on function dela_pipeline_table() from public, anon, authenticated;

create or replace function dela_pipeline_row_json(r jsonb) returns jsonb language sql immutable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('bd_member_id', r->'bd_member_id', 'in_pipeline', r->'in_pipeline', 'in_dela', (r->>'person_id') is not null, 'name', r->'name', 'firm', r->'firm', 'practice_area', r->'practice_area', 'website', r->'website',
    'city', r->'city', 'state', r->'state', 'listing_path', r->'listing_path', 'website_plan_id', r->'plan_id', 'dela_plan', r->'plan_code', 'stage', r->'stage', 'last_touch', r->'last_touch',
    'stages', jsonb_build_object('listing_built', r->'listing_built', 'playbook_made', r->'playbook_made', 'emailed', r->'emailed', 'claimed', r->'claimed', 'playbook_opened', r->'playbook_opened',
      'gig_posted', r->'gig_posted', 'proposals_received', r->'proposals_received', 'hired', r->'hired'))
$$;
revoke all on function dela_pipeline_row_json(jsonb) from public, anon, authenticated;

-- The stages, the stalled rules and the claim plans, for the agent and the admin page
create or replace function dela_pipeline_rules(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, array['growth']);
  return jsonb_build_object('ok', true, 'stages', to_jsonb(dela_pipeline_stages()),
    'set_by', jsonb_build_object('listing_built', 'recorded when the attorney is added and their website plan is a claim listing', 'playbook_made', 'recorded when a playbook is prepared for the attorney',
      'emailed', 'recorded by a person or their agent with outreach_mark; DELA sends nothing', 'claimed', 'DELA: the attorney has an attorney workspace in DELA',
      'playbook_opened', 'DELA: the attorney opened the prepared playbook', 'gig_posted', 'DELA: the attorney opened a gig', 'proposals_received', 'DELA: the first proposal was sent', 'hired', 'DELA: an agreement was signed'),
    'stalled_rules', dela_setting('pipeline.stalled'), 'claim_plan_ids', dela_setting('pipeline.claim_plan_ids'));
end $$;
revoke all on function dela_pipeline_rules(uuid) from public, anon, authenticated;

-- Add attorneys, or refresh their listing facts. p_rows: what the api read from the website for each member number.
create or replace function dela_pipeline_add(p_actor uuid, p_rows jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare x jsonb; v_bd bigint; v_new boolean; v_added int := 0; v_refreshed int := 0; v_plan int;
begin
  perform dela_require_staff(p_actor, array['growth']);
  for x in select * from jsonb_array_elements(case when jsonb_typeof(p_rows) = 'array' then p_rows else '[]' end) loop
    if (x->>'bd_member_id') !~ '^[0-9]{1,12}$' or (x->>'bd_member_id')::bigint < 1 then continue; end if;
    v_bd := (x->>'bd_member_id')::bigint;
    v_plan := case when (x->>'plan_id') ~ '^[0-9]{1,9}$' then (x->>'plan_id')::int end;
    insert into pipeline_attorneys (bd_member_id, name, firm, practice_area, website, city, state, listing_path, plan_id, listed_at, added_by)
    values (v_bd, left(coalesce(x->>'name', ''), 160), left(coalesce(x->>'firm', ''), 160), left(coalesce(x->>'practice_area', ''), 200), left(coalesce(x->>'website', ''), 300), left(coalesce(x->>'city', ''), 80),
      left(coalesce(x->>'state', ''), 40), left(coalesce(x->>'listing_path', ''), 200), v_plan, nullif(x->>'listed_at', '')::timestamptz, p_actor)
    on conflict (bd_member_id) do update set name = case when excluded.name <> '' then excluded.name else pipeline_attorneys.name end, firm = case when excluded.firm <> '' then excluded.firm else pipeline_attorneys.firm end,
      practice_area = case when excluded.practice_area <> '' then excluded.practice_area else pipeline_attorneys.practice_area end, website = case when excluded.website <> '' then excluded.website else pipeline_attorneys.website end,
      city = case when excluded.city <> '' then excluded.city else pipeline_attorneys.city end, state = case when excluded.state <> '' then excluded.state else pipeline_attorneys.state end,
      listing_path = case when excluded.listing_path <> '' then excluded.listing_path else pipeline_attorneys.listing_path end, plan_id = coalesce(excluded.plan_id, pipeline_attorneys.plan_id),
      listed_at = coalesce(pipeline_attorneys.listed_at, excluded.listed_at), refreshed_at = now(), left_out = false
    returning (xmax = 0) into v_new;
    if v_new then v_added := v_added + 1; perform dela_audit('staff', p_actor, 'pipeline_added', 'bd_member', v_bd::text, '{}'); else v_refreshed := v_refreshed + 1; end if;
    -- A listing on a claim plan is "listing built", once
    if v_plan is not null and dela_setting('pipeline.claim_plan_ids') @> to_jsonb(v_plan) and not exists (select 1 from pipeline_events where bd_member_id = v_bd and stage = 'listing_built') then
      insert into pipeline_events (bd_member_id, stage, at, by_person, tool, note) values (v_bd, 'listing_built', coalesce(nullif(x->>'listed_at', '')::timestamptz, now()), p_actor, 'website', 'On a claim plan when added');
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'added', v_added, 'refreshed', v_refreshed);
end $$;
revoke all on function dela_pipeline_add(uuid, jsonb) from public, anon, authenticated;

-- Take an attorney off the list (a test, or added by mistake). The record of what was done stays; adding them again puts them back.
create or replace function dela_pipeline_leave(p_actor uuid, p_bd bigint) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, array['growth']);
  update pipeline_attorneys set left_out = true where bd_member_id = p_bd and not left_out;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_in_pipeline'); end if;
  perform dela_audit('staff', p_actor, 'pipeline_left_out', 'bd_member', p_bd::text, '{}');
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_pipeline_leave(uuid, bigint) from public, anon, authenticated;

-- Record that outreach went out, or a follow-up. Sends nothing. The same request sent twice is recorded once.
-- p: bd_member_ids, stage (emailed or follow_up), at (optional), tool, note, request_id
create or replace function dela_pipeline_mark(p_actor uuid, p jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_stage text := coalesce(p->>'stage', 'emailed'); v_at timestamptz := coalesce(nullif(p->>'at', '')::timestamptz, now()); v_req text := nullif(left(coalesce(p->>'request_id', ''), 80), '');
  v_bd bigint; v_done bigint[] := '{}'; v_dupe bigint[] := '{}'; v_missing bigint[] := '{}'; v_id bigint;
begin
  perform dela_require_staff(p_actor, array['growth']);
  if v_stage not in ('emailed', 'follow_up') then return jsonb_build_object('ok', false, 'reason', 'bad_stage'); end if;
  if v_at > now() + interval '1 day' then return jsonb_build_object('ok', false, 'reason', 'date_in_future'); end if;
  if v_req is null then return jsonb_build_object('ok', false, 'reason', 'request_id_needed'); end if;
  if jsonb_typeof(p->'bd_member_ids') is distinct from 'array' or jsonb_array_length(p->'bd_member_ids') = 0 or jsonb_array_length(p->'bd_member_ids') > 200 then return jsonb_build_object('ok', false, 'reason', 'bad_list'); end if;
  for v_bd in select distinct (t.value)::bigint from jsonb_array_elements_text(p->'bd_member_ids') t where t.value ~ '^[0-9]{1,12}$' loop
    if not exists (select 1 from pipeline_attorneys where bd_member_id = v_bd and not left_out) then v_missing := v_missing || v_bd; continue; end if;
    insert into pipeline_events (bd_member_id, stage, at, by_person, tool, note, request_id) values (v_bd, v_stage, v_at, p_actor, left(coalesce(p->>'tool', ''), 60), left(coalesce(p->>'note', ''), 500), v_req)
    on conflict (bd_member_id, stage, request_id) where request_id is not null do nothing returning id into v_id;
    if v_id is null then v_dupe := v_dupe || v_bd; else v_done := v_done || v_bd; end if;
    v_id := null;
  end loop;
  if cardinality(v_done) > 0 then perform dela_audit('staff', p_actor, 'pipeline_marked', 'pipeline', v_stage, jsonb_build_object('members', to_jsonb(v_done), 'tool', left(coalesce(p->>'tool', ''), 60))); end if;
  return jsonb_build_object('ok', true, 'stage', v_stage, 'recorded', to_jsonb(v_done), 'already_recorded', to_jsonb(v_dupe), 'not_in_pipeline', to_jsonb(v_missing));
end $$;
revoke all on function dela_pipeline_mark(uuid, jsonb) from public, anon, authenticated;

-- Find attorneys by words (name, firm, city, website), state, practice area, stage; in the pipeline or all of DELA's
create or replace function dela_pipeline_find(p_actor uuid, p jsonb) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_q text := lower(btrim(coalesce(p->>'q', ''))); v_state text := lower(btrim(coalesce(p->>'state', ''))); v_area text := lower(btrim(coalesce(p->>'practice_area', ''))); v_stage text := coalesce(p->>'stage', '');
  v_all boolean := coalesce((p->>'include_not_in_pipeline')::boolean, false); v_limit int := least(greatest(coalesce(nullif(p->>'limit', '')::int, 25), 1), 100); v_offset int := greatest(coalesce(nullif(p->>'offset', '')::int, 0), 0);
begin
  perform dela_require_staff(p_actor, array['growth']);
  return (with f as (
    select t.* from dela_pipeline_table() t where (v_all or t.in_pipeline)
      and (v_q = '' or lower(concat_ws(' ', t.name, t.firm, t.city, t.website, t.bd_member_id::text)) like '%' || v_q || '%')
      and (v_state = '' or lower(t.state) = v_state) and (v_area = '' or lower(t.practice_area) like '%' || v_area || '%') and (v_stage = '' or t.stage = v_stage)
  ) select jsonb_build_object('ok', true, 'total', (select count(*) from f), 'limit', v_limit, 'offset', v_offset,
      'attorneys', (select coalesce(jsonb_agg(dela_pipeline_row_json(to_jsonb(x)) order by x.n), '[]') from (select f.*, row_number() over (order by f.in_pipeline desc, f.added_at desc nulls last, f.bd_member_id) n from f order by n limit v_limit offset v_offset) x)));
end $$;
revoke all on function dela_pipeline_find(uuid, jsonb) from public, anon, authenticated;

-- One attorney: the row, every recorded event, and their gigs with the number of proposals on each
create or replace function dela_pipeline_gigs_of(p_person uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('gig_id', g.id, 'title', g.title, 'status', g.status, 'opened_at', g.opened_at, 'closes_at', g.closes_at,
      'proposals', (select count(*) from proposals pr where pr.gig_id = g.id and pr.sent_at is not null and pr.status <> 'draft'),
      'hours_open', case when g.opened_at is not null then floor(extract(epoch from now() - g.opened_at) / 3600)::int end,
      'no_proposals_flag', g.status = 'open' and g.opened_at is not null and g.opened_at < now() - make_interval(hours => coalesce((dela_setting('pipeline.stalled')->>'gig_no_proposals_hours')::int, 48))
        and not exists (select 1 from proposals pr where pr.gig_id = g.id and pr.sent_at is not null and pr.status <> 'draft')) order by g.created_at desc), '[]')
  from gigs g join organizations o on o.id = g.org_id where o.owner_person_id = p_person and g.status <> 'draft'
$$;
revoke all on function dela_pipeline_gigs_of(uuid) from public, anon, authenticated;

create or replace function dela_pipeline_record(p_actor uuid, p_bd bigint) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare r record;
begin
  perform dela_require_staff(p_actor, array['growth']);
  select * into r from dela_pipeline_table() t where t.bd_member_id = p_bd;
  if r.bd_member_id is null then return jsonb_build_object('ok', true, 'known', false, 'bd_member_id', p_bd); end if;
  return jsonb_build_object('ok', true, 'known', true, 'attorney', dela_pipeline_row_json(to_jsonb(r)),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('stage', e.stage, 'at', e.at, 'tool', e.tool, 'note', e.note, 'by', (select display_name from people where id = e.by_person)) order by e.at), '[]') from pipeline_events e where e.bd_member_id = p_bd),
    'gigs', case when r.person_id is not null then dela_pipeline_gigs_of(r.person_id) else '[]'::jsonb end);
end $$;
revoke all on function dela_pipeline_record(uuid, bigint) from public, anon, authenticated;

-- Who is stuck, and why. Oldest first. The numbers are the setting pipeline.stalled.
create or replace function dela_pipeline_stalled(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare s jsonb := dela_setting('pipeline.stalled');
  d_email int := coalesce((s->>'emailed_not_claimed_days')::int, 7); d_open int := coalesce((s->>'claimed_playbook_unopened_days')::int, 2); d_gig int := coalesce((s->>'claimed_no_gig_days')::int, 3);
  h_prop int := coalesce((s->>'gig_no_proposals_hours')::int, 48); d_hire int := coalesce((s->>'proposals_no_hire_days')::int, 5);
begin
  perform dela_require_staff(p_actor, array['growth']);
  return (with t as (select * from dela_pipeline_table() where in_pipeline), hits as (
    select t.bd_member_id, t.name, t.firm, t.stage, t.last_touch, 'emailed_not_claimed' rule, 'Emailed, and has not claimed the listing after ' || d_email || ' days' reason, t.emailed since, null::text gig
      from t where t.emailed is not null and t.claimed is null and t.emailed < now() - make_interval(days => d_email)
    union all select t.bd_member_id, t.name, t.firm, t.stage, t.last_touch, 'claimed_playbook_unopened', 'Claimed, and has not opened the prepared playbook after ' || d_open || ' days', t.claimed, null
      from t where t.claimed is not null and t.playbook_made is not null and t.playbook_opened is null and t.gig_posted is null and t.claimed < now() - make_interval(days => d_open)
    union all select t.bd_member_id, t.name, t.firm, t.stage, t.last_touch, 'claimed_no_gig', 'Claimed, and has not posted a gig after ' || d_gig || ' days', t.claimed, null
      from t where t.claimed is not null and t.gig_posted is null and t.claimed < now() - make_interval(days => d_gig)
    union all select t.bd_member_id, t.name, t.firm, t.stage, t.last_touch, 'gig_no_proposals', 'A gig has no proposals after ' || h_prop || ' hours', g.opened_at, g.title
      from t join organizations o on o.owner_person_id = t.person_id join gigs g on g.org_id = o.id
      where g.status = 'open' and g.opened_at is not null and g.opened_at < now() - make_interval(hours => h_prop) and not exists (select 1 from proposals pr where pr.gig_id = g.id and pr.sent_at is not null and pr.status <> 'draft')
    union all select t.bd_member_id, t.name, t.firm, t.stage, t.last_touch, 'proposals_no_hire', 'Has proposals, and has hired nobody after ' || d_hire || ' days', t.proposals_received, null
      from t where t.proposals_received is not null and t.hired is null and t.proposals_received < now() - make_interval(days => d_hire)
  ) select jsonb_build_object('ok', true, 'rules', s, 'count', (select count(*) from hits),
      'stalled', (select coalesce(jsonb_agg(jsonb_build_object('bd_member_id', h.bd_member_id, 'name', h.name, 'firm', h.firm, 'stage', h.stage, 'rule', h.rule, 'reason', h.reason, 'since', h.since, 'gig', h.gig,
        'days_waiting', floor(extract(epoch from now() - h.since) / 86400)::int, 'last_touch', h.last_touch) order by h.since, h.bd_member_id), '[]') from hits h)));
end $$;
revoke all on function dela_pipeline_stalled(uuid) from public, anon, authenticated;

-- Every pipeline attorney's gigs with the number of proposals, and a flag on the ones with none
create or replace function dela_pipeline_gigs(p_actor uuid, p_only_flagged boolean) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, array['growth']);
  return (with g as (
    select t.bd_member_id, t.name, t.firm, x.value gig from dela_pipeline_table() t, jsonb_array_elements(dela_pipeline_gigs_of(t.person_id)) x where t.in_pipeline and t.person_id is not null
  ) select jsonb_build_object('ok', true, 'gigs_total', (select count(*) from g), 'gigs_with_no_proposals', (select count(*) from g where (g.gig->>'proposals')::int = 0), 'flagged', (select count(*) from g where (g.gig->>'no_proposals_flag')::boolean),
      'gigs', (select coalesce(jsonb_agg(jsonb_build_object('bd_member_id', g.bd_member_id, 'name', g.name, 'firm', g.firm) || g.gig order by (g.gig->>'no_proposals_flag')::boolean desc, g.gig->>'opened_at'), '[]') from g
        where not coalesce(p_only_flagged, false) or (g.gig->>'no_proposals_flag')::boolean)));
end $$;
revoke all on function dela_pipeline_gigs(uuid, boolean) from public, anon, authenticated;

-- Counts by stage: how many attorneys reached each stage in a period (the week by default), how many ever did, and
-- how many sit at each stage now
create or replace function dela_pipeline_counts(p_actor uuid, p_from date, p_to date) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_from date := coalesce(p_from, date_trunc('week', now())::date); v_to date := coalesce(p_to, (coalesce(p_from, date_trunc('week', now())::date) + 6));
begin
  perform dela_require_staff(p_actor, array['growth']);
  if v_to < v_from or v_to - v_from > 370 then return jsonb_build_object('ok', false, 'reason', 'bad_period'); end if;
  return (with t as (select * from dela_pipeline_table() where in_pipeline), d as (
    select s.stage, s.o, case s.stage when 'listing_built' then t.listing_built when 'playbook_made' then t.playbook_made when 'emailed' then t.emailed when 'claimed' then t.claimed
      when 'playbook_opened' then t.playbook_opened when 'gig_posted' then t.gig_posted when 'proposals_received' then t.proposals_received when 'hired' then t.hired end at, t.stage now_stage
    from unnest(dela_pipeline_stages()) with ordinality s(stage, o) left join t on true
  ) select jsonb_build_object('ok', true, 'from', v_from, 'to', v_to, 'attorneys_in_pipeline', (select count(*) from t), 'added_in_period', (select count(*) from t where t.added_at::date between v_from and v_to),
      'stages', (select jsonb_agg(jsonb_build_object('stage', x.stage, 'reached_in_period', x.in_period, 'reached_ever', x.ever, 'at_this_stage_now', x.now_at) order by x.o)
        from (select d.stage, d.o, count(*) filter (where d.at::date between v_from and v_to) in_period, count(*) filter (where d.at is not null) ever, count(*) filter (where d.now_stage = d.stage) now_at from d group by d.stage, d.o) x)));
end $$;
revoke all on function dela_pipeline_counts(uuid, date, date) from public, anon, authenticated;

-- The admin page: everything in one read
create or replace function dela_admin_pipeline(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, array['growth']);
  return jsonb_build_object('ok', true, 'on', dela_switch_on('mcp_admin', p_actor), 'role', dela_team_role(p_actor), 'rules', dela_pipeline_rules(p_actor), 'counts', dela_pipeline_counts(p_actor, null, null),
    'stalled', dela_pipeline_stalled(p_actor)->'stalled', 'attorneys', dela_pipeline_find(p_actor, '{"limit": 100}'::jsonb)->'attorneys',
    'connections', (select coalesce(jsonb_agg(jsonb_build_object('name', pe.display_name, 'client_name', c.client_name, 'created_at', c.created_at, 'last_used_at', c.last_used_at) order by c.last_used_at desc), '[]')
      from mcp_connections c join people pe on pe.id = c.person_id where c.kind = 'admin' and c.revoked_at is null));
end $$;
revoke all on function dela_admin_pipeline(uuid) from public, anon, authenticated;

-- The name of a website category, for a listing's practice area
create or replace function dela_category_name(p_key text) returns text language sql stable set search_path = public, extensions, pg_temp as $$
  select name from bd_categories where key = p_key and active
$$;
revoke all on function dela_category_name(text) from public, anon, authenticated;

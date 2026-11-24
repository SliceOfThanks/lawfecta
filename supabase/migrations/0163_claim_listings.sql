-- Step 82c: claim listings created on the website from a sheet Stacey reviews first (Stacey 2026-11-24: "we need one
-- for ADMIN only - so we can automate creation of claim listings and the info in them for growth and scale"; listings
-- for freelancers, attorneys and agencies; information from "A sheet I review first"; the connector "only creates").
-- The agent hands the reviewed rows to DELA. DELA checks every row and keeps the batch as a draft; nothing reaches the
-- website. An owner opens the batch in the admin area and clicks "Create these listings"; only then does DELA create
-- each listing on the website, on the claim plan for its kind. Welcome emails are never asked for. A listing can be
-- corrected or taken down while nobody has claimed it, and a person who asks to be removed is never listed again.
-- Off until Stacey has made the third claim plan, turned "Listing Searchable" off on the claim plans, allowed DELA's
-- website key to create members, and the lawyer has reviewed listing people who have not signed up.
-- Additive: one switch (off), four settings, three tables, functions.

insert into feature_switches (key, label, gate) values ('claim_listings', 'Create claim listings on the website from a reviewed sheet, after an owner approves each batch (step 82c)',
  'Stacey: the plan "Agency Claim Listing", "Listing Searchable" off on the claim plans, the website key may create members; a lawyer reviews listing people who have not signed up')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('claim.plan_ids', '{"freelancer": 6, "attorney": 15, "agency": 0}'::jsonb, 'Claim listings: the website plan number for each kind of listing', 'Pipeline', '', 'O', 'Read from the website 2026-11-24: 6 "Claim Listing", 15 "Attorney Claim Listing"; the agency plan is not made yet',
    '0 means that kind cannot be created yet. Set the agency number once the plan "Agency Claim Listing" exists.'),
  ('claim.placeholder_domain', '""'::jsonb, 'Claim listings: the email domain used when a row has no email address', 'Pipeline', '', 'O', 'For Stacey to choose', 'A domain Lawfecta owns, for example claim.lawfecta.co. Left empty, a row without an email address is not created.'),
  ('claim.batch_max', '50'::jsonb, 'Claim listings: most rows in one batch', 'Pipeline', 'rows', 'O', 'Claude 2026-11-24 (step 82c)', ''),
  ('claim.per_day', '100'::jsonb, 'Claim listings: most listings created in one day', 'Pipeline', 'listings', 'O', 'Claude 2026-11-24 (step 82c)', 'A stop against a runaway batch.')
on conflict (key) do nothing;

create table if not exists claim_batches (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft', 'approved', 'done', 'canceled')),
  note text not null default '',
  request_id text not null unique,
  created_by uuid references people(id),
  created_at timestamptz not null default now(),
  approved_by uuid references people(id),
  approved_at timestamptz,
  finished_at timestamptz
);
alter table claim_batches enable row level security;

create table if not exists claim_listings (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references claim_batches(id),
  row_no int not null,
  kind text not null check (kind in ('freelancer', 'attorney', 'agency')),
  first_name text not null default '',
  last_name text not null default '',
  company text not null default '',
  city text not null default '',
  state text not null default '',
  country text not null default 'US',
  website text not null default '',
  category_key text not null default '',
  description text not null default '',
  source_url text not null default '',
  email text not null default '',
  status text not null check (status in ('ready', 'invalid', 'duplicate', 'created', 'failed', 'removed')),
  problem text not null default '',
  bd_member_id bigint,
  listing_path text not null default '',
  created_at timestamptz,
  removed_at timestamptz,
  unique (batch_id, row_no)
);
alter table claim_listings enable row level security;
create index if not exists claim_listings_bd on claim_listings (bd_member_id) where bd_member_id is not null;

-- People and firms who asked not to be listed. Checked before every batch.
create table if not exists claim_removed (
  id bigserial primary key,
  name_key text not null default '',
  website_host text not null default '',
  email text not null default '',
  reason text not null default '',
  removed_by uuid references people(id),
  removed_at timestamptz not null default now()
);
alter table claim_removed enable row level security;

create or replace function dela_claim_host(p_url text) returns text language sql immutable set search_path = public, extensions, pg_temp as $$
  select lower(regexp_replace(split_part(split_part(coalesce(p_url, ''), '://', 2), '/', 1), '^www\.', ''))
$$;
revoke all on function dela_claim_host(text) from public, anon, authenticated;
create or replace function dela_claim_name_key(p_first text, p_last text, p_company text, p_state text) returns text language sql immutable set search_path = public, extensions, pg_temp as $$
  select lower(regexp_replace(coalesce(nullif(btrim(coalesce(p_first, '') || ' ' || coalesce(p_last, '')), ''), coalesce(p_company, '')) || '|' || coalesce(p_state, ''), '\s+', ' ', 'g'))
$$;
revoke all on function dela_claim_name_key(text, text, text, text) from public, anon, authenticated;

-- Keep a checked batch as a draft. p: request_id, note, rows (each already checked by the api: status ready or invalid, with its problem)
-- Duplicates are found here: against earlier listings, against people who asked to be removed, and inside the batch.
create or replace function dela_claim_batch_save(p_actor uuid, p jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_id uuid; x jsonb; v_no int := 0; v_status text; v_problem text; v_host text; v_key text; v_email text; v_max int := dela_int_setting('claim.batch_max', 50);
begin
  perform dela_require_staff(p_actor, '{}');
  if not dela_switch_on('claim_listings', p_actor) then return jsonb_build_object('ok', false, 'reason', 'claims_off'); end if;
  if coalesce(p->>'request_id', '') = '' then return jsonb_build_object('ok', false, 'reason', 'request_id_needed'); end if;
  select id into v_id from claim_batches where request_id = p->>'request_id';
  if v_id is not null then return dela_claim_batch_get(p_actor, v_id) || jsonb_build_object('duplicate', true); end if;
  if jsonb_typeof(p->'rows') is distinct from 'array' or jsonb_array_length(p->'rows') = 0 then return jsonb_build_object('ok', false, 'reason', 'no_rows'); end if;
  if jsonb_array_length(p->'rows') > v_max then return jsonb_build_object('ok', false, 'reason', 'too_many_rows', 'max', v_max); end if;
  insert into claim_batches (note, request_id, created_by) values (left(coalesce(p->>'note', ''), 300), left(p->>'request_id', 80), p_actor) returning id into v_id;
  for x in select * from jsonb_array_elements(p->'rows') loop
    v_no := v_no + 1;
    v_status := case when x->>'status' = 'ready' then 'ready' else 'invalid' end; v_problem := left(coalesce(x->>'problem', ''), 300);
    v_host := dela_claim_host(x->>'website'); v_key := dela_claim_name_key(x->>'first_name', x->>'last_name', x->>'company', x->>'state'); v_email := lower(btrim(coalesce(x->>'email', '')));
    if v_status = 'ready' then
      if exists (select 1 from claim_removed r where (v_host <> '' and r.website_host = v_host) or (r.name_key <> '' and r.name_key = v_key) or (v_email <> '' and r.email = v_email)) then
        v_status := 'duplicate'; v_problem := 'This person or firm asked not to be listed.';
      elsif exists (select 1 from claim_listings l where l.status in ('ready', 'created') and ((v_host <> '' and dela_claim_host(l.website) = v_host) or dela_claim_name_key(l.first_name, l.last_name, l.company, l.state) = v_key or (v_email <> '' and lower(l.email) = v_email))) then
        v_status := 'duplicate'; v_problem := 'Already in this batch or an earlier one (same website, same name and state, or same email).';
      elsif v_email <> '' and exists (select 1 from people pe where lower(pe.email) = v_email) then
        v_status := 'duplicate'; v_problem := 'A DELA member already has this email address.';
      end if;
    end if;
    insert into claim_listings (batch_id, row_no, kind, first_name, last_name, company, city, state, country, website, category_key, description, source_url, email, status, problem)
    values (v_id, v_no, case when x->>'kind' in ('freelancer', 'attorney', 'agency') then x->>'kind' else 'attorney' end, left(coalesce(x->>'first_name', ''), 80), left(coalesce(x->>'last_name', ''), 80), left(coalesce(x->>'company', ''), 160),
      left(coalesce(x->>'city', ''), 80), left(coalesce(x->>'state', ''), 40), left(coalesce(nullif(x->>'country', ''), 'US'), 2), left(coalesce(x->>'website', ''), 300), left(coalesce(x->>'category_key', ''), 12),
      left(coalesce(x->>'description', ''), 600), left(coalesce(x->>'source_url', ''), 300), left(v_email, 200), v_status, v_problem);
  end loop;
  perform dela_audit('staff', p_actor, 'claim_batch_checked', 'claim_batch', v_id::text, jsonb_build_object('rows', v_no));
  return dela_claim_batch_get(p_actor, v_id) || jsonb_build_object('duplicate', false);
end $$;

-- A batch: its state, the counts, and each row with its problem or its listing. The email of a row is never returned.
create or replace function dela_claim_batch_get(p_actor uuid, p_id uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare b claim_batches;
begin
  perform dela_require_staff(p_actor, array['growth']);
  select * into b from claim_batches where id = p_id;
  if b.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'batch_id', b.id, 'status', b.status, 'note', b.note, 'created_at', b.created_at, 'approved_at', b.approved_at, 'finished_at', b.finished_at,
    'counts', (select coalesce(jsonb_object_agg(s, n), '{}') from (select status s, count(*) n from claim_listings where batch_id = b.id group by status) c),
    'rows', (select coalesce(jsonb_agg(jsonb_build_object('row', l.row_no, 'kind', l.kind, 'name', btrim(l.first_name || ' ' || l.last_name), 'company', l.company, 'city', l.city, 'state', l.state, 'website', l.website,
      'has_email', l.email <> '', 'status', l.status, 'problem', l.problem, 'bd_member_id', l.bd_member_id, 'listing_path', l.listing_path) order by l.row_no), '[]') from claim_listings l where l.batch_id = b.id));
end $$;
revoke all on function dela_claim_batch_get(uuid, uuid) from public, anon, authenticated;
revoke all on function dela_claim_batch_save(uuid, jsonb) from public, anon, authenticated;

create or replace function dela_claim_batches(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, array['growth']);
  return jsonb_build_object('ok', true, 'on', dela_switch_on('claim_listings', p_actor), 'plans', dela_setting('claim.plan_ids'), 'placeholder_domain', dela_setting_text('claim.placeholder_domain', ''),
    'batches', (select coalesce(jsonb_agg(jsonb_build_object('batch_id', b.id, 'status', b.status, 'note', b.note, 'created_at', b.created_at, 'approved_at', b.approved_at, 'finished_at', b.finished_at,
      'counts', (select coalesce(jsonb_object_agg(s, n), '{}') from (select status s, count(*) n from claim_listings where batch_id = b.id group by status) c)) order by b.created_at desc), '[]')
      from (select * from claim_batches order by created_at desc limit 30) b));
end $$;
revoke all on function dela_claim_batches(uuid) from public, anon, authenticated;

-- The owner approves a batch in the admin area. Nothing else can.
create or replace function dela_claim_batch_approve(p_actor uuid, p_id uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare b claim_batches; v_today int; v_ready int;
begin
  perform dela_require_staff(p_actor, '{}');
  if not dela_switch_on('claim_listings', p_actor) then return jsonb_build_object('ok', false, 'reason', 'claims_off'); end if;
  select * into b from claim_batches where id = p_id for update;
  if b.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if b.status <> 'draft' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', b.status); end if;
  select count(*) into v_ready from claim_listings where batch_id = b.id and status = 'ready';
  if v_ready = 0 then return jsonb_build_object('ok', false, 'reason', 'nothing_ready'); end if;
  select count(*) into v_today from claim_listings where status = 'created' and created_at > now() - interval '24 hours';
  if v_today + v_ready > dela_int_setting('claim.per_day', 100) then return jsonb_build_object('ok', false, 'reason', 'daily_cap', 'cap', dela_int_setting('claim.per_day', 100)); end if;
  update claim_batches set status = 'approved', approved_by = p_actor, approved_at = now() where id = b.id;
  perform dela_audit('staff', p_actor, 'claim_batch_approved', 'claim_batch', b.id::text, jsonb_build_object('ready', v_ready));
  perform dela_job_enqueue('claim_create', jsonb_build_object('batch_id', b.id), now(), 'claim_create:' || b.id || ':0', null);
  return jsonb_build_object('ok', true, 'duplicate', false, 'status', 'approved', 'ready', v_ready);
end $$;
revoke all on function dela_claim_batch_approve(uuid, uuid) from public, anon, authenticated;

create or replace function dela_claim_batch_cancel(p_actor uuid, p_id uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, '{}');
  update claim_batches set status = 'canceled' where id = p_id and status = 'draft';
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_a_draft'); end if;
  update claim_listings set status = 'invalid', problem = 'The batch was canceled.' where batch_id = p_id and status = 'ready';
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_claim_batch_cancel(uuid, uuid) from public, anon, authenticated;

-- The job takes the next rows of an approved batch (with the email, which only the job reads), and writes back what happened
create or replace function dela_claim_next(p_batch uuid, p_n int) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('approved', (select status = 'approved' and dela_switch_on('claim_listings', approved_by) from claim_batches where id = p_batch), 'approved_by', (select approved_by from claim_batches where id = p_batch),
    'plans', dela_setting('claim.plan_ids'), 'rows', (select coalesce(jsonb_agg(to_jsonb(l) order by l.row_no), '[]') from (select * from claim_listings where batch_id = p_batch and status = 'ready' order by row_no limit greatest(p_n, 1)) l))
$$;
revoke all on function dela_claim_next(uuid, int) from public, anon, authenticated;

create or replace function dela_claim_result(p_listing uuid, p_ok boolean, p_bd bigint, p_path text, p_problem text) returns void language plpgsql set search_path = public, extensions, pg_temp as $$
declare l claim_listings;
begin
  update claim_listings set status = case when p_ok then 'created' else 'failed' end, bd_member_id = case when p_ok then p_bd end, listing_path = left(coalesce(p_path, ''), 200), problem = left(coalesce(p_problem, ''), 300),
    created_at = case when p_ok then now() end where id = p_listing and status = 'ready' returning * into l;
  if l.id is null then return; end if;
  if not exists (select 1 from claim_listings where batch_id = l.batch_id and status = 'ready') then update claim_batches set status = 'done', finished_at = now() where id = l.batch_id; end if;
  -- An attorney's listing joins the pipeline as "listing built"
  if p_ok and l.kind = 'attorney' then
    insert into pipeline_attorneys (bd_member_id, name, firm, website, city, state, listing_path, plan_id, listed_at, added_by)
    values (p_bd, btrim(l.first_name || ' ' || l.last_name), l.company, l.website, l.city, l.state, left(coalesce(p_path, ''), 200), (dela_setting('claim.plan_ids')->>'attorney')::int, now(), (select approved_by from claim_batches where id = l.batch_id))
    on conflict (bd_member_id) do nothing;
    if not exists (select 1 from pipeline_events where bd_member_id = p_bd and stage = 'listing_built') then
      insert into pipeline_events (bd_member_id, stage, by_person, tool, note) values (p_bd, 'listing_built', (select approved_by from claim_batches where id = l.batch_id), 'DELA', 'Created from a reviewed sheet');
    end if;
  end if;
end $$;
revoke all on function dela_claim_result(uuid, boolean, bigint, text, text) from public, anon, authenticated;

-- One created listing that nobody has claimed, for a correction or a removal
create or replace function dela_claim_listing_of(p_actor uuid, p_bd bigint) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare l claim_listings;
begin
  perform dela_require_staff(p_actor, '{}');
  if not dela_switch_on('claim_listings', p_actor) then return jsonb_build_object('ok', false, 'reason', 'claims_off'); end if;
  select * into l from claim_listings where bd_member_id = p_bd and status = 'created';
  if l.id is null then return jsonb_build_object('ok', false, 'reason', 'not_a_claim_listing'); end if;
  if exists (select 1 from people where bd_member_id = p_bd) then return jsonb_build_object('ok', false, 'reason', 'already_claimed'); end if;
  return jsonb_build_object('ok', true, 'id', l.id, 'kind', l.kind, 'name', btrim(l.first_name || ' ' || l.last_name), 'company', l.company);
end $$;
revoke all on function dela_claim_listing_of(uuid, bigint) from public, anon, authenticated;

-- Taken down at the person's request: marked removed, remembered so they are not listed again, and off the pipeline list
create or replace function dela_claim_removed(p_actor uuid, p_bd bigint, p_reason text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare l claim_listings;
begin
  perform dela_require_staff(p_actor, '{}');
  update claim_listings set status = 'removed', removed_at = now() where bd_member_id = p_bd and status = 'created' returning * into l;
  if l.id is null then return jsonb_build_object('ok', false, 'reason', 'not_a_claim_listing'); end if;
  insert into claim_removed (name_key, website_host, email, reason, removed_by) values (dela_claim_name_key(l.first_name, l.last_name, l.company, l.state), dela_claim_host(l.website), lower(l.email), left(coalesce(p_reason, ''), 300), p_actor);
  update pipeline_attorneys set left_out = true where bd_member_id = p_bd;
  perform dela_audit('staff', p_actor, 'claim_listing_removed', 'bd_member', p_bd::text, jsonb_build_object('reason', left(coalesce(p_reason, ''), 300)));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_claim_removed(uuid, bigint, text) from public, anon, authenticated;

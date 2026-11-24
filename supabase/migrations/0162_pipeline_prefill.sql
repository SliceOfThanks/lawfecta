-- Step 82b: a playbook prepared for a pipeline attorney (Stacey 2026-11-24: "Playbook generation: read the firm's
-- website, draft the prefilled playbook, and attach it to the attorney's DELA account before outreach goes out";
-- one for each attorney, chosen by practice area; "A draft, marked as prepared by Lawfecta").
-- The agent reads the firm's public website and hands the text over; DELA drafts the playbook to the document standard
-- and keeps it with the pipeline. No account is made for anyone in advance: the playbook waits, and it is put into the
-- attorney's own Library as a draft the first time they open DELA with an attorney workspace. Every step is marked as
-- DELA's suggestion until the attorney confirms it. Nothing is approved, posted or sent by this.
-- Preparing content for a person before they sign up is behind its own switch, which is off.
-- Additive: one switch (off), two settings, one table, functions; one function gets one more field in its answer.

insert into feature_switches (key, label, gate) values ('pipeline_prefill', 'Prepare a document for a pipeline attorney from their public website, to wait for them as a marked draft (step 82b)',
  'A lawyer reviews preparing content for people before they sign up (the open item "Lawyer reviews the privacy policy and data handling")')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('pipeline.prefill_per_day', '20'::jsonb, 'Pipeline: most documents prepared for attorneys in one day', 'Pipeline', 'documents', 'O', 'Claude 2026-11-24 (step 82b)', 'Each one uses Lawfecta''s own AI. The cap keeps a large batch from running up a bill.'),
  ('pipeline.practice_playbooks', '{"family": {"name": "Open a new family law matter", "trigger": "A prospective client asks for a consult", "done": "The matter is open, the engagement letter is signed and the first deadlines are on the calendar"},
    "injury": {"name": "Open a new personal injury matter", "trigger": "A prospective client calls after an injury", "done": "The matter is open, the medical providers are listed and records are requested"},
    "estate": {"name": "Open a new estate planning matter", "trigger": "A prospective client asks about a will or a trust", "done": "The matter is open and the client''s document checklist has been sent"},
    "immigration": {"name": "Open a new immigration matter", "trigger": "A prospective client asks for a consult", "done": "The matter is open and the document checklist has been sent"},
    "criminal": {"name": "Open a new criminal defense matter", "trigger": "A prospective client or their family calls", "done": "The matter is open and the first court date is on the calendar"},
    "default": {"name": "Take in a new client", "trigger": "A prospective client contacts the firm", "done": "The matter is open, the engagement letter is signed and the file is set up"}}'::jsonb,
    'Pipeline: which document is prepared for which practice area', 'Pipeline', '', 'O', 'Claude 2026-11-24 (step 82b), for Stacey to change',
    'The key is a word looked for in the attorney''s practice area; "default" is used when none fits. One document is prepared for each attorney.')
on conflict (key) do nothing;

create table if not exists pipeline_playbooks (
  id uuid primary key default gen_random_uuid(),
  bd_member_id bigint not null references pipeline_attorneys(bd_member_id),
  title text not null,
  body jsonb not null,
  source_url text not null default '',
  practice_key text not null default '',
  prepared_by uuid references people(id),
  prepared_at timestamptz not null default now(),
  request_id text not null,
  status text not null default 'waiting' check (status in ('waiting', 'delivered', 'withdrawn')),
  playbook_id uuid references playbooks(id),
  delivered_at timestamptz,
  opened_at timestamptz,
  gig_suggested boolean not null default false,
  unique (bd_member_id, request_id)
);
alter table pipeline_playbooks enable row level security;
create unique index if not exists pipeline_playbooks_one on pipeline_playbooks (bd_member_id) where status <> 'withdrawn';
create index if not exists pipeline_playbooks_pb on pipeline_playbooks (playbook_id) where playbook_id is not null;

-- Which playbook goes with a practice area
create or replace function dela_pipeline_template(p_area text) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce((select jsonb_build_object('key', k.key) || k.value from jsonb_each(dela_setting('pipeline.practice_playbooks')) k
      where k.key <> 'default' and lower(coalesce(p_area, '')) like '%' || lower(k.key) || '%' order by length(k.key) desc, k.key limit 1),
    jsonb_build_object('key', 'default') || coalesce(dela_setting('pipeline.practice_playbooks')->'default', '{"name": "Take in a new client"}'::jsonb))
$$;
revoke all on function dela_pipeline_template(text) from public, anon, authenticated;

-- May a playbook be prepared for this attorney now? The owner only, the switch, the day's cap, one for each attorney.
create or replace function dela_pipeline_prefill_gate(p_actor uuid, p_bd bigint, p_request text, p_replace boolean) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare a pipeline_attorneys; x pipeline_playbooks; v_today int;
begin
  perform dela_require_staff(p_actor, '{}');
  if not dela_switch_on('pipeline_prefill', p_actor) then return jsonb_build_object('ok', false, 'reason', 'prefill_off'); end if;
  select * into a from pipeline_attorneys where bd_member_id = p_bd;
  if a.bd_member_id is null then return jsonb_build_object('ok', false, 'reason', 'not_in_pipeline'); end if;
  select * into x from pipeline_playbooks where bd_member_id = p_bd and request_id = p_request;
  if x.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', x.id, 'title', x.title, 'status', x.status); end if;
  select * into x from pipeline_playbooks where bd_member_id = p_bd and status <> 'withdrawn';
  if x.id is not null and x.status = 'delivered' then return jsonb_build_object('ok', false, 'reason', 'already_delivered'); end if;
  if x.id is not null and not coalesce(p_replace, false) then return jsonb_build_object('ok', false, 'reason', 'already_prepared', 'title', x.title); end if;
  select count(*) into v_today from pipeline_playbooks where prepared_at > now() - interval '24 hours';
  if v_today >= dela_int_setting('pipeline.prefill_per_day', 20) then return jsonb_build_object('ok', false, 'reason', 'daily_cap', 'cap', dela_int_setting('pipeline.prefill_per_day', 20)); end if;
  return jsonb_build_object('ok', true, 'duplicate', false, 'name', a.name, 'firm', a.firm, 'practice_area', a.practice_area, 'state', a.state, 'template', dela_pipeline_template(a.practice_area));
end $$;
revoke all on function dela_pipeline_prefill_gate(uuid, bigint, text, boolean) from public, anon, authenticated;

-- Keep the prepared playbook with the pipeline. p: bd_member_id, title, body, source_url, practice_key, request_id, replace
create or replace function dela_pipeline_prefill_save(p_actor uuid, p jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_bd bigint := (p->>'bd_member_id')::bigint; g jsonb; v_id uuid;
begin
  g := dela_pipeline_prefill_gate(p_actor, v_bd, p->>'request_id', coalesce((p->>'replace')::boolean, false));
  if not (g->>'ok')::boolean or (g->>'duplicate')::boolean then return g; end if;
  if jsonb_typeof(p->'body') <> 'object' or btrim(coalesce(p->>'title', '')) = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  update pipeline_playbooks set status = 'withdrawn' where bd_member_id = v_bd and status = 'waiting';
  insert into pipeline_playbooks (bd_member_id, title, body, source_url, practice_key, prepared_by, request_id)
  values (v_bd, left(btrim(p->>'title'), 200), p->'body', left(coalesce(p->>'source_url', ''), 300), left(coalesce(p->>'practice_key', ''), 40), p_actor, left(p->>'request_id', 80)) returning id into v_id;
  if not exists (select 1 from pipeline_events where bd_member_id = v_bd and stage = 'playbook_made') then
    insert into pipeline_events (bd_member_id, stage, by_person, tool, note) values (v_bd, 'playbook_made', p_actor, 'DELA', left(btrim(p->>'title'), 200));
  end if;
  perform dela_audit('staff', p_actor, 'pipeline_playbook_prepared', 'bd_member', v_bd::text, jsonb_build_object('id', v_id, 'source_url', left(coalesce(p->>'source_url', ''), 300)));
  return jsonb_build_object('ok', true, 'duplicate', false, 'id', v_id, 'title', left(btrim(p->>'title'), 200), 'status', 'waiting');
end $$;
revoke all on function dela_pipeline_prefill_save(uuid, jsonb) from public, anon, authenticated;

-- A prepared playbook that waits for this person: they are the attorney it was prepared for, and they have an attorney
-- workspace with a Library. The api then creates the draft as the attorney, through the same path as any new document.
create or replace function dela_pipeline_waiting(p_person uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('id', x.id, 'title', x.title, 'body', x.body, 'org_id', sp.org_id)
  from people pe join side_profiles sp on sp.person_id = pe.id and sp.side = 'attorney' and sp.status = 'active'
    join pipeline_playbooks x on x.bd_member_id = pe.bd_member_id and x.status = 'waiting'
  where pe.id = p_person and dela_switch_on('playbook_library', p_person) limit 1
$$;
revoke all on function dela_pipeline_waiting(uuid) from public, anon, authenticated;

create or replace function dela_pipeline_delivered(p_id uuid, p_playbook uuid) returns void language sql set search_path = public, extensions, pg_temp as $$
  update pipeline_playbooks set status = 'delivered', playbook_id = p_playbook, delivered_at = now() where id = p_id and status = 'waiting'
$$;
revoke all on function dela_pipeline_delivered(uuid, uuid) from public, anon, authenticated;

-- What the document page says about a prepared playbook. The first time someone of the attorney's firm opens it, that
-- is "playbook opened".
create or replace function dela_pipeline_pb_note(p_person uuid, p_playbook uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare x pipeline_playbooks; v_status text; v_gig boolean;
begin
  select * into x from pipeline_playbooks where playbook_id = p_playbook and status = 'delivered';
  if x.id is null then return null; end if;
  if dela_pb_rank(dela_pb_role(p_person, (select org_id from playbooks where id = p_playbook))) < 1 then return null; end if;
  if x.opened_at is null and not dela_is_staff(p_person) then
    update pipeline_playbooks set opened_at = now() where id = x.id;
    insert into pipeline_events (bd_member_id, stage, by_person, tool) values (x.bd_member_id, 'playbook_opened', p_person, 'DELA');
  end if;
  select status into v_status from playbooks where id = p_playbook;
  v_gig := exists (select 1 from gigs where playbook_id = p_playbook);
  return jsonb_build_object('prepared', true, 'prepared_at', x.prepared_at, 'source_host', split_part(split_part(x.source_url, '://', 2), '/', 1),
    'gig_suggested', x.gig_suggested and v_status = 'approved' and not v_gig);
end $$;
revoke all on function dela_pipeline_pb_note(uuid, uuid) from public, anon, authenticated;

-- The team asks DELA to point the attorney to a gig once they approve the prepared playbook
create or replace function dela_pipeline_gig_suggest(p_actor uuid, p_bd bigint) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare x pipeline_playbooks;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into x from pipeline_playbooks where bd_member_id = p_bd and status <> 'withdrawn';
  if x.id is null then return jsonb_build_object('ok', false, 'reason', 'no_prepared_playbook'); end if;
  update pipeline_playbooks set gig_suggested = true where id = x.id;
  return jsonb_build_object('ok', true, 'title', x.title, 'status', x.status, 'already', x.gig_suggested);
end $$;
revoke all on function dela_pipeline_gig_suggest(uuid, bigint) from public, anon, authenticated;

-- The attorney's record also says where their prepared playbook stands
create or replace function dela_pipeline_playbook_of(p_bd bigint) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('title', x.title, 'status', x.status, 'prepared_at', x.prepared_at, 'source_url', x.source_url, 'delivered_at', x.delivered_at, 'opened_at', x.opened_at, 'gig_suggested', x.gig_suggested,
    'document_status', (select status from playbooks where id = x.playbook_id), 'steps', jsonb_array_length(case when jsonb_typeof(x.body->'steps') = 'array' then x.body->'steps' else '[]' end))
  from pipeline_playbooks x where x.bd_member_id = p_bd and x.status <> 'withdrawn'
$$;
revoke all on function dela_pipeline_playbook_of(bigint) from public, anon, authenticated;

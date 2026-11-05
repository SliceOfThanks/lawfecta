-- Step 4: Flex Gigs, matching, invitations, proposals and the allowance, questions, gig files, the draft agreement,
-- off-platform checks and what DELA learns about each member. Brief: docs/briefs/step-4-matching-gigs-proposals.md
-- (Stacey's answers 2026-11-05). Additive: new tables, functions, switches and settings. Money in integer cents.

-- ---------- Switches and settings ----------
insert into feature_switches (key, label, gate) values
  ('flex_gigs', 'Flex Gigs: post work, matches, proposals and hiring', 'Step 4 tested'),
  ('talent_search', 'Talent tab: attorneys search match-ready freelancers', 'Step 4 tested'),
  ('multiple_hires', 'More than one hire on one gig (with DELA splitting the work)', 'Later (Stacey answer 4)'),
  ('conduct_review', 'DELA''s AI checks messages, questions, invitations and proposals for plans to work or pay outside Lawfecta', 'Step 4 tested'),
  ('member_insights', 'What DELA has learned about you (members see and remove it)', 'Step 4 tested')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('gig.min_budget_cents', '25000', 'Smallest gig budget', 'Flex Gigs and proposals', 'cents', 'C', 'Stacey 2026-11-05 (answer 8)', ''),
  ('gig.max_budget_cents', '10000000', 'Largest gig budget', 'Flex Gigs and proposals', 'cents', 'R', 'Claude', 'A typing guard, not a business limit.'),
  ('gig.big_change_pct', '20', 'A budget change bigger than this asks applicants to confirm their proposal again', 'Flex Gigs and proposals', '%', 'O', 'Claude', 'Any change to the task or steps also counts as big.'),
  ('proposal.rate_per_hour', '10', 'Most proposals one freelancer sends in an hour', 'Flex Gigs and proposals', 'proposals', 'O', 'Brief: spam limits, also on Business', ''),
  ('proposal.rate_per_day', '30', 'Most proposals one freelancer sends in a day', 'Flex Gigs and proposals', 'proposals', 'O', 'Brief: spam limits, also on Business', ''),
  ('matching.max_shown', '10', 'Most matches shown for one gig', 'Matching', 'freelancers', 'O', 'Claude', 'DELA shows fewer people rather than inactive ones.'),
  ('matching.plan_boost', '{"fl_free":0,"fl_plus":1,"fl_pro":2,"fl_business":3}', 'Membership plan order among freelancers who already fit a gig', 'Matching', '', 'O', 'Stacey 2026-11-05 (answer 6): follow the BD plan setup', 'Only orders people within the same fit group; a poor fit is never lifted above a good fit. Match the order to the BD plans.'),
  ('matching.good_fit', '60', 'Fit score for a good fit', 'Matching', 'points', 'O', 'Claude', ''),
  ('matching.fair_fit', '35', 'Fit score for a fair fit', 'Matching', 'points', 'O', 'Claude', 'Below this a freelancer is not shown as a match.'),
  ('insights.max_per_member', '40', 'Most things DELA keeps about one member', 'Matching', 'items', 'O', 'Claude', 'Members see every one and can remove any.')
on conflict (key) do nothing;

-- DELA's off-platform check is logged with the other AI use (Lawfecta's key, never the member's credits)
do $$
declare c text;
begin
  select conname into c from pg_constraint where conrelid = 'ai_usage'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%client_check%';
  if c is not null then execute format('alter table ai_usage drop constraint %I', c); end if;
  alter table ai_usage add constraint ai_usage_task_check check (task in ('chat', 'file', 'voice', 'key_test', 'client_check', 'conduct_review'));
end $$;

-- ---------- Gigs ----------
create table gigs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  created_by uuid not null references people(id),
  playbook_id uuid not null references playbooks(id),
  playbook_version int not null,
  title text not null check (length(title) between 1 and 200),
  public jsonb not null default '{}',            -- task, outcome, steps (short), tools, timing, state, practice_area, skills
  budget_min_cents int not null check (budget_min_cents >= 0),
  budget_max_cents int not null check (budget_max_cents >= budget_min_cents),
  deadline date,
  milestones jsonb not null default '[]',        -- the attorney's plan; freelancers see milestones only after they are hired
  status text not null default 'draft' check (status in ('draft', 'open', 'paused', 'closed', 'filled', 'canceled')),
  visibility text not null default 'matches' check (visibility in ('matches', 'public')),
  hires_allowed int not null default 1 check (hires_allowed >= 1),
  version int not null default 1,                -- bumps on every saved change once open
  scope_version int not null default 1,          -- bumps on a big change (applicants confirm again)
  opened_at timestamptz,
  closes_at timestamptz,
  extensions int not null default 0,
  closed_at timestamptz,
  close_reason text not null default '',
  paused_by_team boolean not null default false,
  pause_reason text not null default '',
  reservation_id uuid,
  request_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, request_id)
);
create index gigs_open on gigs (status, closes_at);
alter table gigs enable row level security;

create table gig_events (
  id bigserial primary key,
  gig_id uuid not null references gigs(id),
  action text not null,
  actor_type text not null check (actor_type in ('member', 'staff', 'system', 'worker')),
  actor uuid references people(id),
  detail jsonb not null default '{}',
  at timestamptz not null default now()
);
create trigger gig_events_append_only before update or delete on gig_events for each row execute function dela_no_change();
alter table gig_events enable row level security;

create table gig_matches (
  gig_id uuid not null references gigs(id),
  person_id uuid not null references people(id),
  fit int not null,
  tier int not null,          -- 2 good, 1 fair
  boost int not null default 0,
  reasons text[] not null default '{}',
  computed_at timestamptz not null default now(),
  primary key (gig_id, person_id)
);
alter table gig_matches enable row level security;

create table gig_invitations (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references gigs(id),
  freelancer_id uuid not null references people(id),
  invited_by uuid not null references people(id),
  message text not null default '',
  status text not null default 'sent' check (status in ('sent', 'held', 'declined', 'answered', 'closed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (gig_id, freelancer_id)
);
alter table gig_invitations enable row level security;

create table proposals (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references gigs(id),
  freelancer_id uuid not null references people(id),
  status text not null default 'draft' check (status in ('draft', 'sent', 'held', 'withdrawn', 'selected', 'not_selected', 'closed')),
  price_cents int check (price_cents is null or price_cents >= 0),
  included text not null default '',
  excluded text not null default '',
  schedule text not null default '',
  days_to_deliver int check (days_to_deliver is null or days_to_deliver between 1 and 365),
  qualifications text not null default '',
  message text not null default '',
  invited boolean not null default false,
  counted boolean not null default false,       -- used one of the month's proposals
  reservation_id uuid,
  scope_version int not null default 1,         -- the gig's scope when sent; a big change after it asks to confirm again
  needs_reconfirm boolean not null default false,
  reconfirm_asked_at timestamptz,
  reconfirmed_at timestamptz,
  sent_at timestamptz,
  withdrawn_at timestamptz,
  decided_at timestamptz,
  request_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gig_id, freelancer_id)
);
create index proposals_person on proposals (freelancer_id, sent_at);
alter table proposals enable row level security;

create table gig_questions (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references gigs(id),
  asked_by uuid not null references people(id),
  question text not null check (length(question) between 1 and 2000),
  answer text not null default '',
  answered_by uuid references people(id),
  answered_at timestamptz,
  status text not null default 'open' check (status in ('open', 'held', 'answered', 'hidden')),
  request_id text not null,
  created_at timestamptz not null default now(),
  unique (gig_id, asked_by, request_id)
);
alter table gig_questions enable row level security;

-- Files the attorney shares with a gig: read only, that gig only, every download logged
create table gig_files (
  gig_id uuid not null references gigs(id),
  file_id uuid not null references files(id),
  shared_by uuid not null references people(id),
  shared_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (gig_id, file_id)
);
alter table gig_files enable row level security;
create table gig_file_downloads (
  id bigserial primary key,
  gig_id uuid not null references gigs(id),
  file_id uuid not null references files(id),
  person_id uuid not null references people(id),
  at timestamptz not null default now()
);
create trigger gig_file_downloads_append_only before update or delete on gig_file_downloads for each row execute function dela_no_change();
alter table gig_file_downloads enable row level security;

-- Selecting a proposal starts a draft agreement; signing and funding come in Step 6
create table agreements (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references gigs(id),
  proposal_id uuid not null unique references proposals(id),
  attorney_org uuid not null references organizations(id),
  attorney_person uuid not null references people(id),
  freelancer_person uuid not null references people(id),
  total_cents int not null check (total_cents >= 0),
  status text not null default 'draft' check (status in ('draft', 'sent', 'signed', 'canceled')),
  milestones jsonb not null default '[]',      -- DELA sets these after hiring (Step 6 makes them payable)
  created_at timestamptz not null default now()
);
alter table agreements enable row level security;

-- Plans to work or pay outside Lawfecta (against the terms): flagged and held for the Lawfecta Team
create table conduct_flags (
  id uuid primary key default gen_random_uuid(),
  object_type text not null check (object_type in ('proposal', 'question', 'answer', 'invitation', 'gig')),
  object_id uuid not null,
  gig_id uuid references gigs(id),
  person_id uuid not null references people(id),
  kinds text[] not null default '{}',
  excerpt text not null default '',
  source text not null check (source in ('rules', 'ai')),
  status text not null default 'open' check (status in ('open', 'cleared', 'actioned')),
  decided_by uuid references people(id),
  decided_at timestamptz,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index conduct_flags_open on conduct_flags (status, created_at);
alter table conduct_flags enable row level security;

-- What DELA has learned about a member, to help them. Members see every item and can remove any.
create table member_insights (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  text text not null check (length(text) between 1 and 300),
  source text not null default '',
  created_at timestamptz not null default now(),
  removed_at timestamptz
);
create index member_insights_person on member_insights (person_id, side) where removed_at is null;
alter table member_insights enable row level security;

-- ---------- Helpers ----------
create or replace function dela_gig_event(p_gig uuid, p_action text, p_actor_type text, p_actor uuid, p_detail jsonb) returns void language sql as $$
  insert into gig_events (gig_id, action, actor_type, actor, detail) values (p_gig, p_action, p_actor_type, p_actor, coalesce(p_detail, '{}'))
$$;

-- May this person manage the gig? Owners and managers of the firm that posted it.
create or replace function dela_gig_manager(p_person uuid, p_gig uuid) returns boolean language sql stable as $$
  select exists (select 1 from gigs g where g.id = p_gig and dela_firm_role(p_person, g.org_id) in ('owner', 'manager'))
$$;

create or replace function dela_gig_money(p_cents int) returns text language sql immutable as $$
  select '$' || to_char(p_cents / 100.0, 'FM999,999,990.00')
$$;

-- Closes a gig whose time ran out. Every action calls this first, so an old page can never act on a closed gig.
create or replace function dela_gig_close_if_due(p_gig uuid) returns text language plpgsql as $$
declare g gigs;
begin
  select * into g from gigs where id = p_gig for update;
  if g.id is null then return null; end if;
  if g.status in ('open', 'paused') and g.closes_at is not null and g.closes_at <= now() then
    perform dela_gig_finish(g.id, 'closed', 'time_ran_out', 'system', null);
    return 'closed';
  end if;
  return g.status;
end $$;

-- Ends a gig (closed, canceled or filled): returns the open-gig allowance once and tells applicants not chosen
create or replace function dela_gig_finish(p_gig uuid, p_status text, p_reason text, p_actor_type text, p_actor uuid) returns void language plpgsql as $$
declare g gigs; p record; v_side_owner uuid;
begin
  select * into g from gigs where id = p_gig for update;
  if g.status not in ('open', 'paused', 'draft') then return; end if;
  update gigs set status = p_status, closed_at = now(), close_reason = p_reason, updated_at = now() where id = p_gig;
  if g.status <> 'draft' then
    perform dela_quota_return(g.created_by, 'attorney', 'att.gigs_active', 1, 'gig:' || g.id::text);
  end if;
  update gig_invitations set status = 'closed', decided_at = coalesce(decided_at, now()) where gig_id = p_gig and status in ('sent', 'held');
  perform dela_gig_event(p_gig, p_status, p_actor_type, p_actor, jsonb_build_object('reason', p_reason));
  -- Applicants still waiting hear once, politely, with no details about any chosen proposal
  for p in select * from proposals where gig_id = p_gig and status in ('sent', 'held') loop
    if p_status = 'filled' then
      update proposals set status = 'not_selected', decided_at = now(), updated_at = now() where id = p.id;
    end if;
    perform dela_notify(jsonb_build_object('person_id', p.freelancer_id, 'side', 'freelancer', 'kind', 'gig_closed', 'email', true,
      'title', case when p_status = 'filled' then 'The attorney chose another proposal' else 'A gig you applied to has closed' end,
      'body', case when p_status = 'filled' then 'Thank you for your proposal for "' || g.title || '". The attorney chose another freelancer this time. Your proposal stays in your Work tab.'
              else '"' || g.title || '" has closed. The attorney can still choose a proposal for ' || dela_int_setting('gig.proposals_actionable_days', 7) || ' days.' end,
      'link', '/dela?tab=work', 'dedupe_key', 'gigend:' || p_gig::text || ':' || p.freelancer_id::text));
  end loop;
end $$;

-- ---------- Attorney: create, edit, publish, extend, close ----------

-- A draft gig from an approved playbook. The public version comes from DELA (the api), and the attorney edits it.
create or replace function dela_gig_create(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
declare pb playbooks; v_id uuid; v_org uuid;
begin
  if not dela_switch_on('flex_gigs', p_person) then return jsonb_build_object('ok', false, 'reason', 'gigs_off'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  select * into pb from playbooks where id = (p->>'playbook_id')::uuid;
  if pb.id is null or dela_firm_role(p_person, pb.org_id) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if pb.status <> 'approved' or pb.approved_version is null then return jsonb_build_object('ok', false, 'reason', 'playbook_not_approved'); end if;
  v_org := pb.org_id;
  select id into v_id from gigs where org_id = v_org and request_id = p->>'request_id';
  if v_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_id); end if;
  insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, deadline, milestones, request_id)
  values (v_org, p_person, pb.id, pb.approved_version, left(coalesce(nullif(p->'public'->>'title', ''), pb.title), 200), coalesce(p->'public', '{}'),
    greatest(coalesce((p->>'budget_min_cents')::int, 0), 0), greatest(coalesce((p->>'budget_max_cents')::int, 0), coalesce((p->>'budget_min_cents')::int, 0), 0),
    nullif(p->>'deadline', '')::date, coalesce(p->'milestones', '[]'), p->>'request_id')
  returning id into v_id;
  perform dela_gig_event(v_id, 'drafted', 'member', p_person, jsonb_build_object('playbook_id', pb.id, 'version', pb.approved_version));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Save edits. Once open, a change to the budget or scope tells applicants once; a big change asks them to confirm their proposal.
create or replace function dela_gig_save(p_person uuid, p_gig uuid, p jsonb, p_version int) returns jsonb language plpgsql as $$
declare g gigs; v_min int; v_max int; v_big boolean := false; v_changed boolean; v_pct int := dela_int_setting('gig.big_change_pct', 20); a record;
begin
  if dela_gig_close_if_due(p_gig) is null or not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into g from gigs where id = p_gig for update;
  if g.status not in ('draft', 'open') then return jsonb_build_object('ok', false, 'reason', 'gig_closed'); end if;
  if p_version is not null and p_version <> g.version then return jsonb_build_object('ok', false, 'reason', 'changed_elsewhere', 'version', g.version); end if;
  v_min := greatest(coalesce((p->>'budget_min_cents')::int, g.budget_min_cents), 0);
  v_max := greatest(coalesce((p->>'budget_max_cents')::int, g.budget_max_cents), v_min);
  v_changed := v_min <> g.budget_min_cents or v_max <> g.budget_max_cents or coalesce(p->'public', g.public) <> g.public or nullif(p->>'deadline', '')::date is distinct from g.deadline;
  if g.status = 'open' then
    v_big := (g.budget_max_cents > 0 and abs(v_max - g.budget_max_cents) * 100 > v_pct * g.budget_max_cents)
          or (g.budget_min_cents > 0 and abs(v_min - g.budget_min_cents) * 100 > v_pct * g.budget_min_cents)
          or coalesce(p->'public'->>'task', g.public->>'task') is distinct from g.public->>'task'
          or coalesce(p->'public'->'steps', g.public->'steps') is distinct from g.public->'steps';
    if v_min < dela_int_setting('gig.min_budget_cents', 25000) then return jsonb_build_object('ok', false, 'reason', 'budget_too_low', 'min_cents', dela_int_setting('gig.min_budget_cents', 25000)); end if;
  end if;
  update gigs set title = left(coalesce(nullif(p->'public'->>'title', ''), title), 200), public = coalesce(p->'public', public), budget_min_cents = v_min, budget_max_cents = v_max,
    deadline = case when p ? 'deadline' then nullif(p->>'deadline', '')::date else deadline end, milestones = coalesce(p->'milestones', milestones),
    version = version + case when status = 'open' and v_changed then 1 else 0 end, scope_version = scope_version + case when v_big then 1 else 0 end, updated_at = now()
  where id = p_gig returning * into g;
  if g.status = 'open' and v_changed then
    perform dela_gig_event(p_gig, case when v_big then 'big_change' else 'changed' end, 'member', p_person, jsonb_build_object('version', g.version));
    if v_big then update proposals set needs_reconfirm = true, updated_at = now() where gig_id = p_gig and status in ('sent', 'held'); end if;
    for a in select freelancer_id from proposals where gig_id = p_gig and status in ('sent', 'held') loop
      perform dela_notify(jsonb_build_object('person_id', a.freelancer_id, 'side', 'freelancer', 'kind', 'gig_changed', 'email', v_big,
        'title', case when v_big then 'A gig you applied to changed: please confirm your proposal' else 'A gig you applied to was updated' end,
        'body', '"' || g.title || '" was updated. ' || case when v_big then 'The budget or the work changed a lot, so the attorney needs you to confirm your proposal (or change or withdraw it).' else 'Have a look in your Work tab.' end,
        'link', '/dela?tab=work&gig=' || p_gig::text, 'dedupe_key', 'gigchange:' || p_gig::text || ':' || g.version || ':' || a.freelancer_id::text));
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'version', g.version, 'big_change', v_big);
end $$;

-- Publish: only verified attorneys, within the open-gig allowance, with at least the minimum budget. Idempotent.
create or replace function dela_gig_publish(p_person uuid, p_gig uuid) returns jsonb language plpgsql as $$
declare g gigs; e jsonb; q jsonb; v_days int := dela_int_setting('gig.duration_days', 14); d int;
begin
  if not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into g from gigs where id = p_gig for update;
  if g.status = 'open' then return jsonb_build_object('ok', true, 'duplicate', true, 'closes_at', g.closes_at); end if;
  if g.status <> 'draft' then return jsonb_build_object('ok', false, 'reason', 'gig_closed'); end if;
  if not dela_switch_on('flex_gigs', p_person) then return jsonb_build_object('ok', false, 'reason', 'gigs_off'); end if;
  e := dela_attorney_eligibility(p_person);
  if not coalesce((e->>'can_post')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'not_verified', 'readiness', e->>'readiness'); end if;
  if g.budget_min_cents < dela_int_setting('gig.min_budget_cents', 25000) then return jsonb_build_object('ok', false, 'reason', 'budget_too_low', 'min_cents', dela_int_setting('gig.min_budget_cents', 25000)); end if;
  if g.budget_max_cents > dela_int_setting('gig.max_budget_cents', 10000000) then return jsonb_build_object('ok', false, 'reason', 'budget_too_high'); end if;
  if coalesce(g.public->>'task', '') = '' then return jsonb_build_object('ok', false, 'reason', 'gig_needs_task'); end if;
  if g.deadline is not null and g.deadline < (now() at time zone dela_setting_text('quota.timezone', 'America/Los_Angeles'))::date then return jsonb_build_object('ok', false, 'reason', 'deadline_past'); end if;
  q := dela_quota_reserve(p_person, 'attorney', 'att.gigs_active', 1, 'gigpost:' || g.id::text, g.id::text);
  if not coalesce((q->>'ok')::boolean, false) then return q; end if;
  perform dela_quota_finish((q->>'reservation_id')::uuid, true);
  update gigs set status = 'open', opened_at = now(), closes_at = now() + make_interval(days => v_days), reservation_id = (q->>'reservation_id')::uuid,
    visibility = case when dela_switch_on('public_gigs', p_person) then 'public' else 'matches' end, updated_at = now()
  where id = p_gig returning * into g;
  perform dela_gig_event(p_gig, 'published', 'member', p_person, jsonb_build_object('closes_at', g.closes_at, 'visibility', g.visibility));
  for d in select (x #>> '{}')::int from jsonb_array_elements(coalesce(dela_setting('gig.reminder_days'), '[10,13]')) x loop
    perform dela_job_enqueue('gig_tick', jsonb_build_object('gig_id', g.id, 'kind', 'reminder', 'day', d), g.opened_at + make_interval(days => d), 'gigrem:' || g.id::text || ':' || d, p_person);
  end loop;
  perform dela_job_enqueue('gig_tick', jsonb_build_object('gig_id', g.id, 'kind', 'close'), g.closes_at, 'gigclose:' || g.id::text || ':0', p_person);
  perform dela_gig_match_refresh(g.id);
  return jsonb_build_object('ok', true, 'closes_at', g.closes_at, 'visibility', g.visibility);
end $$;

-- One extension of 14 days, with reminders before it ends
create or replace function dela_gig_extend(p_person uuid, p_gig uuid) returns jsonb language plpgsql as $$
declare g gigs; d int;
begin
  if dela_gig_close_if_due(p_gig) is null or not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into g from gigs where id = p_gig for update;
  if g.status <> 'open' then return jsonb_build_object('ok', false, 'reason', 'gig_closed'); end if;
  if g.extensions >= dela_int_setting('gig.max_extensions', 1) then return jsonb_build_object('ok', false, 'reason', 'no_more_extensions'); end if;
  update gigs set extensions = extensions + 1, closes_at = closes_at + make_interval(days => dela_int_setting('gig.extension_days', 14)), updated_at = now() where id = p_gig returning * into g;
  perform dela_gig_event(p_gig, 'extended', 'member', p_person, jsonb_build_object('closes_at', g.closes_at));
  for d in select (x #>> '{}')::int from jsonb_array_elements(coalesce(dela_setting('gig.extended_reminder_days_before'), '[4,1]')) x loop
    perform dela_job_enqueue('gig_tick', jsonb_build_object('gig_id', g.id, 'kind', 'reminder_before', 'days', d), g.closes_at - make_interval(days => d), 'gigrem2:' || g.id::text || ':' || g.extensions || ':' || d, p_person);
  end loop;
  perform dela_job_enqueue('gig_tick', jsonb_build_object('gig_id', g.id, 'kind', 'close'), g.closes_at, 'gigclose:' || g.id::text || ':' || g.extensions, p_person);
  return jsonb_build_object('ok', true, 'closes_at', g.closes_at);
end $$;

create or replace function dela_gig_close(p_person uuid, p_gig uuid, p_cancel boolean) returns jsonb language plpgsql as $$
declare v text;
begin
  v := dela_gig_close_if_due(p_gig);
  if v is null or not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v not in ('draft', 'open', 'paused') then return jsonb_build_object('ok', true, 'duplicate', true, 'status', v); end if;
  perform dela_gig_finish(p_gig, case when p_cancel then 'canceled' else 'closed' end, case when p_cancel then 'canceled_by_attorney' else 'closed_by_attorney' end, 'member', p_person);
  return jsonb_build_object('ok', true);
end $$;

-- The worker: reminders and closing on time
create or replace function dela_gig_tick(p jsonb) returns jsonb language plpgsql as $$
declare g gigs; v_kind text := p->>'kind'; v_n int;
begin
  select * into g from gigs where id = (p->>'gig_id')::uuid;
  if g.id is null then return jsonb_build_object('ok', true); end if;
  if v_kind = 'close' then perform dela_gig_close_if_due(g.id); return jsonb_build_object('ok', true); end if;
  if g.status <> 'open' then return jsonb_build_object('ok', true, 'skipped', true); end if;
  if v_kind = 'reminder' and g.extensions > 0 then return jsonb_build_object('ok', true, 'skipped', true); end if;
  select count(*) into v_n from proposals where gig_id = g.id and status = 'sent';
  perform dela_notify(jsonb_build_object('person_id', g.created_by, 'side', 'attorney', 'kind', 'gig_reminder', 'email', true,
    'title', 'Your gig closes ' || to_char(g.closes_at at time zone dela_setting_text('quota.timezone', 'America/Los_Angeles'), 'FMMon FMDD'),
    'body', '"' || g.title || '" has ' || v_n || case when v_n = 1 then ' proposal' else ' proposals' end || '. Compare them and choose one, or extend the gig once' ||
      case when g.extensions > 0 then ' (already extended)' else '' end || '.',
    'link', '/dela?tab=projects&gig=' || g.id::text, 'dedupe_key', 'gigtick:' || g.id::text || ':' || coalesce(p->>'day', p->>'days', '') || ':' || g.extensions));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Matching ----------
-- Eligible first: match-ready (verified, profile complete, availability confirmed in the last 14 days, no hold), the gig's
-- practice area, and not excluding the gig's state. Then a fit score with plain reasons. The plan only orders people within
-- the same fit group (Stacey answer 6), so a poor fit is never lifted above a good fit.
create or replace function dela_gig_match_refresh(p_gig uuid) returns int language plpgsql as $$
declare g gigs; v_area text; v_state text; v_tools text[]; v_skills text[]; v_good int := dela_int_setting('matching.good_fit', 60); v_fair int := dela_int_setting('matching.fair_fit', 35);
  v_days int := dela_int_setting('profile.availability_days', 14); v_n int;
begin
  select * into g from gigs where id = p_gig;
  v_area := coalesce(g.public->>'practice_area', '');
  v_state := upper(coalesce(g.public->>'state', ''));
  v_tools := array(select lower(x) from jsonb_array_elements_text(coalesce(g.public->'tools', '[]')) x);
  v_skills := array(select lower(x) from jsonb_array_elements_text(coalesce(g.public->'skills', '[]')) x);
  delete from gig_matches where gig_id = p_gig;
  insert into gig_matches (gig_id, person_id, fit, tier, boost, reasons)
  select p_gig, c.person_id, c.fit, case when c.fit >= v_good then 2 else 1 end, coalesce((dela_setting('matching.plan_boost') ->> c.plan_code)::int, 0), c.reasons
  from (
    select sp.person_id, sp.plan_code,
      least(100, (case when v_area <> '' then 30 else 15 end)
        + least(30, 10 * (select count(*) from jsonb_array_elements_text(coalesce(mp.body->'software', '[]')) s where lower(s) = any(v_tools)))::int
        + least(20, 7 * (select count(*) from jsonb_array_elements_text(coalesce(mp.body->'skills', '[]')) s where lower(s) = any(v_skills)))::int
        + least(15, coalesce((mp.body->>'capacity_hours_week')::int, 0) * 15 / 20)
        + case when pe.last_seen_at > now() - interval '7 days' then 5 else 0 end) as fit,
      array_remove(array[
        nullif(v_area, ''),
        (select case when count(*) > 0 then 'Uses ' || string_agg(s, ' and ') end from (select s from jsonb_array_elements_text(coalesce(mp.body->'software', '[]')) s where lower(s) = any(v_tools) limit 3) t),
        (select case when count(*) > 0 then string_agg(s, ', ') end from (select s from jsonb_array_elements_text(coalesce(mp.body->'skills', '[]')) s where lower(s) = any(v_skills) limit 3) t),
        case when coalesce((mp.body->>'capacity_hours_week')::int, 0) > 0 then (mp.body->>'capacity_hours_week') || ' hours a week free' end,
        case when pe.last_seen_at > now() - interval '7 days' then 'Active this week' end], null) as reasons
    from side_profiles sp
    join member_profiles mp on mp.person_id = sp.person_id and mp.side = 'freelancer'
    join people pe on pe.id = sp.person_id
    where sp.side = 'freelancer' and sp.status = 'active' and sp.readiness_state = 'match_ready'
      and sp.person_id <> g.created_by and not dela_has_hold(sp.person_id)
      and mp.availability <> 'unavailable' and mp.availability_confirmed_at > now() - make_interval(days => v_days)
      and (v_area = '' or mp.body->'practice_areas' ? v_area)
      and (v_state = '' or not exists (select 1 from jsonb_array_elements_text(coalesce(mp.body->'states_excluded', '[]')) x where upper(x) = v_state))
  ) c
  where c.fit >= v_fair;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Is this freelancer still eligible right now (checked again when invited and when hired)?
create or replace function dela_freelancer_eligible(p_person uuid, p_gig uuid) returns text language plpgsql stable as $$
declare g gigs; s jsonb; mp member_profiles;
begin
  select * into g from gigs where id = p_gig;
  s := dela_profile_state(p_person, 'freelancer');
  if not coalesce((s->>'ok')::boolean, false) then return 'not_a_freelancer'; end if;
  if s->>'readiness' <> 'match_ready' then return 'not_match_ready'; end if;
  select * into mp from member_profiles where person_id = p_person and side = 'freelancer';
  if coalesce(g.public->>'state', '') <> '' and exists (select 1 from jsonb_array_elements_text(coalesce(mp.body->'states_excluded', '[]')) x where upper(x) = upper(g.public->>'state')) then return 'excludes_state'; end if;
  if p_person = g.created_by then return 'own_gig'; end if;
  return '';
end $$;

create or replace function dela_gig_matches(p_person uuid, p_gig uuid, p_refresh boolean) returns jsonb language plpgsql as $$
declare g gigs; v_max int := dela_int_setting('matching.max_shown', 10);
begin
  if dela_gig_close_if_due(p_gig) is null or not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into g from gigs where id = p_gig;
  if p_refresh and g.status in ('draft', 'open') then perform dela_gig_match_refresh(p_gig); end if;
  return jsonb_build_object('ok', true, 'matches', (select coalesce(jsonb_agg(x), '[]') from (
    select jsonb_build_object('person_id', m.person_id, 'name', coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name),
      'headline', mp.body->>'headline', 'reasons', to_jsonb(m.reasons), 'fit', case m.tier when 2 then 'Good fit' else 'Fair fit' end,
      'invited', exists (select 1 from gig_invitations i where i.gig_id = p_gig and i.freelancer_id = m.person_id),
      'applied', exists (select 1 from proposals pr where pr.gig_id = p_gig and pr.freelancer_id = m.person_id and pr.status in ('sent', 'selected', 'not_selected'))) x
    from gig_matches m join people pe on pe.id = m.person_id left join member_profiles mp on mp.person_id = m.person_id and mp.side = 'freelancer'
    where m.gig_id = p_gig order by m.tier desc, m.boost desc, m.fit desc, m.person_id limit v_max) t));
end $$;

-- ---------- Invitations ----------
create or replace function dela_gig_invite(p_person uuid, p_gig uuid, p_freelancer uuid, p_message text, p_held boolean) returns jsonb language plpgsql as $$
declare g gigs; v_why text; v_id uuid;
begin
  if dela_gig_close_if_due(p_gig) is null or not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into g from gigs where id = p_gig;
  if g.status <> 'open' then return jsonb_build_object('ok', false, 'reason', 'gig_not_open'); end if;
  v_why := dela_freelancer_eligible(p_freelancer, p_gig);
  if v_why <> '' then return jsonb_build_object('ok', false, 'reason', 'freelancer_not_available', 'why', v_why); end if;
  select id into v_id from gig_invitations where gig_id = p_gig and freelancer_id = p_freelancer;
  if v_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_id); end if;
  insert into gig_invitations (gig_id, freelancer_id, invited_by, message, status) values (p_gig, p_freelancer, p_person, left(coalesce(p_message, ''), 2000), case when p_held then 'held' else 'sent' end) returning id into v_id;
  perform dela_gig_event(p_gig, 'invited', 'member', p_person, jsonb_build_object('freelancer', p_freelancer, 'held', p_held));
  if not p_held then perform dela_gig_invite_notify(v_id); end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'held', p_held);
end $$;

create or replace function dela_gig_invite_notify(p_inv uuid) returns void language plpgsql as $$
declare i gig_invitations; g gigs;
begin
  select * into i from gig_invitations where id = p_inv;
  select * into g from gigs where id = i.gig_id;
  perform dela_notify(jsonb_build_object('person_id', i.freelancer_id, 'side', 'freelancer', 'kind', 'gig_invitation', 'email', true,
    'title', 'An attorney invited you to a gig', 'body', 'You are invited to send a proposal for "' || g.title || '" (budget ' || dela_gig_money(g.budget_min_cents) || ' to ' || dela_gig_money(g.budget_max_cents) || '). An invited proposal does not use your monthly allowance.',
    'link', '/dela?tab=work&gig=' || g.id::text, 'dedupe_key', 'giginv:' || i.id::text));
end $$;

create or replace function dela_gig_invite_decline(p_person uuid, p_gig uuid) returns jsonb language plpgsql as $$
begin
  update gig_invitations set status = 'declined', decided_at = now() where gig_id = p_gig and freelancer_id = p_person and status = 'sent';
  return jsonb_build_object('ok', true);
end $$;

-- ---------- What a freelancer may see ----------
create or replace function dela_gig_access(p_person uuid, p_gig uuid) returns text language sql stable as $$
  select case
    when g.id is null then ''
    when exists (select 1 from agreements a where a.gig_id = g.id and a.freelancer_person = p_person) then 'hired'
    when exists (select 1 from gig_invitations i where i.gig_id = g.id and i.freelancer_id = p_person and i.status in ('sent', 'answered')) then 'invited'
    when exists (select 1 from proposals p where p.gig_id = g.id and p.freelancer_id = p_person and p.status <> 'draft') then 'applicant'
    when g.status = 'open' and exists (select 1 from gig_matches m where m.gig_id = g.id and m.person_id = p_person) then 'match'
    when g.status = 'open' and g.visibility = 'public' and exists (select 1 from side_profiles sp where sp.person_id = p_person and sp.side = 'freelancer' and sp.readiness_state = 'match_ready') then 'public'
    when exists (select 1 from proposals p where p.gig_id = g.id and p.freelancer_id = p_person) then 'drafted'
    else '' end
  from gigs g where g.id = p_gig
$$;

-- The gig as each person may see it. Freelancers see everything about the gig except milestones until hired,
-- the full playbook only when invited or hired (with their name as a watermark), their own proposal only, and public answers.
create or replace function dela_gig_get(p_person uuid, p_side text, p_gig uuid) returns jsonb language plpgsql as $$
declare g gigs; v_access text; v_mgr boolean; v_pb jsonb; v_name text; v_tz text := dela_setting_text('quota.timezone', 'America/Los_Angeles');
begin
  if dela_gig_close_if_due(p_gig) is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into g from gigs where id = p_gig;
  v_mgr := p_side = 'attorney' and dela_gig_manager(p_person, p_gig);
  v_access := case when v_mgr then 'manager' when p_side = 'freelancer' then dela_gig_access(p_person, p_gig) else '' end;
  if v_access = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_access in ('invited', 'hired', 'manager') then
    select body into v_pb from playbook_versions where playbook_id = g.playbook_id and version = g.playbook_version;
  end if;
  select display_name into v_name from people where id = p_person;
  return jsonb_build_object('ok', true, 'access', v_access,
    'gig', jsonb_build_object('id', g.id, 'title', g.title, 'public', g.public, 'budget_min_cents', g.budget_min_cents, 'budget_max_cents', g.budget_max_cents,
      'deadline', g.deadline, 'status', g.status, 'visibility', g.visibility, 'opened_at', g.opened_at, 'closes_at', g.closes_at, 'extensions', g.extensions,
      'max_extensions', dela_int_setting('gig.max_extensions', 1), 'closed_at', g.closed_at, 'close_reason', g.close_reason, 'version', g.version, 'scope_version', g.scope_version,
      'paused_by_team', g.paused_by_team, 'playbook_id', case when v_mgr then g.playbook_id end,
      'milestones', case when v_access in ('manager', 'hired') then g.milestones else null end,
      'firm', (select coalesce(nullif(mp.body->>'firm_name', ''), o.name) from organizations o left join member_profiles mp on mp.person_id = g.created_by and mp.side = 'attorney' where o.id = g.org_id),
      'actionable_until', case when g.closed_at is not null then g.closed_at + make_interval(days => dela_int_setting('gig.proposals_actionable_days', 7)) end),
    'playbook', case when v_pb is not null then v_pb end,
    'watermark', case when v_access in ('invited', 'hired') then 'Shared with ' || coalesce(v_name, 'you') || ' for this gig only. Confidential.' end,
    'my_proposal', case when p_side = 'freelancer' then (select to_jsonb(p) - 'reservation_id' from proposals p where p.gig_id = g.id and p.freelancer_id = p_person) end,
    'invitation', case when p_side = 'freelancer' then (select jsonb_build_object('status', i.status, 'message', i.message, 'created_at', i.created_at) from gig_invitations i where i.gig_id = g.id and i.freelancer_id = p_person and i.status <> 'held') end,
    'questions', (select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'answer', q.answer, 'answered_at', q.answered_at, 'status', q.status,
        'mine', q.asked_by = p_person, 'created_at', q.created_at) order by q.created_at), '[]')
      from gig_questions q where q.gig_id = g.id and (q.status = 'answered' or v_mgr and q.status = 'open' or q.asked_by = p_person and q.status <> 'hidden')),
    'files', (select coalesce(jsonb_agg(jsonb_build_object('file_id', f.id, 'name', f.name, 'size_bytes', f.size_bytes) order by f.name), '[]')
      from gig_files gf join files f on f.id = gf.file_id where gf.gig_id = g.id and gf.removed_at is null and f.status = 'ready'
        and (v_mgr or (v_access in ('invited', 'hired') and dela_gig_files_open(g.id, p_person)))),
    'counts', case when v_mgr then jsonb_build_object('proposals', (select count(*) from proposals where gig_id = g.id and status in ('sent', 'selected', 'not_selected')),
      'invited', (select count(*) from gig_invitations where gig_id = g.id), 'questions_open', (select count(*) from gig_questions where gig_id = g.id and status = 'open')) end,
    'allowance', case when p_side = 'freelancer' then dela_proposal_allowance(p_person) end,
    'today', (now() at time zone v_tz)::date);
end $$;

-- Files stay open to invited and hired freelancers while the gig is open, and to the hired freelancer after; they end when it closes without a hire
create or replace function dela_gig_files_open(p_gig uuid, p_person uuid) returns boolean language sql stable as $$
  select case
    when exists (select 1 from agreements a where a.gig_id = p_gig and a.freelancer_person = p_person and a.status <> 'canceled') then true
    when g.status = 'open' and exists (select 1 from gig_invitations i where i.gig_id = p_gig and i.freelancer_id = p_person and i.status in ('sent', 'answered')) then true
    else false end
  from gigs g where g.id = p_gig
$$;

-- ---------- Proposals ----------
create or replace function dela_proposal_allowance(p_person uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('limit', e->'limit', 'unlimited', e->'unlimited', 'used', e->'used', 'remaining', e->'remaining',
    'invited_counts', coalesce((dela_setting('quota.invited_proposals_count') #>> '{}')::boolean, false),
    'resets_on', (date_trunc('month', now() at time zone dela_setting_text('quota.timezone', 'America/Los_Angeles')) + interval '1 month')::date)
  from jsonb_array_elements(dela_entitlements(p_person, 'freelancer')) e where e->>'key' = 'fl.proposals'
$$;

create or replace function dela_proposal_save(p_person uuid, p_gig uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_access text; pr proposals;
begin
  if dela_gig_close_if_due(p_gig) is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_access := dela_gig_access(p_person, p_gig);
  if v_access = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into pr from proposals where gig_id = p_gig and freelancer_id = p_person for update;
  if pr.id is not null and pr.status not in ('draft') then return jsonb_build_object('ok', false, 'reason', 'already_sent'); end if;
  insert into proposals (gig_id, freelancer_id, price_cents, included, excluded, schedule, days_to_deliver, qualifications, message)
  values (p_gig, p_person, (p->>'price_cents')::int, left(coalesce(p->>'included', ''), 4000), left(coalesce(p->>'excluded', ''), 4000), left(coalesce(p->>'schedule', ''), 2000),
          nullif(p->>'days_to_deliver', '')::int, left(coalesce(p->>'qualifications', ''), 4000), left(coalesce(p->>'message', ''), 4000))
  on conflict (gig_id, freelancer_id) do update set price_cents = excluded.price_cents, included = excluded.included, excluded = excluded.excluded, schedule = excluded.schedule,
    days_to_deliver = excluded.days_to_deliver, qualifications = excluded.qualifications, message = excluded.message, updated_at = now()
  returning * into pr;
  return jsonb_build_object('ok', true, 'id', pr.id, 'status', pr.status);
end $$;

-- Send: the gig must be open (checked on the server, so an old page cannot send to a closed gig). Spam limits per hour and day.
-- A proposal counts once, when sent; an invited one does not count (Stacey answer 1). Two clicks send and count once.
create or replace function dela_proposal_send(p_person uuid, p_gig uuid, p jsonb, p_held boolean) returns jsonb language plpgsql as $$
declare g gigs; pr proposals; v_access text; v_invited boolean; v_count boolean; q jsonb; v_hour int; v_day int; v_why text;
begin
  if dela_gig_close_if_due(p_gig) is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into g from gigs where id = p_gig;
  -- One send at a time per freelancer per gig
  perform pg_advisory_xact_lock(hashtext('proposal:' || p_gig::text || ':' || p_person::text));
  select * into pr from proposals where gig_id = p_gig and freelancer_id = p_person;
  if pr.id is not null and pr.status in ('sent', 'held', 'selected', 'not_selected') then return jsonb_build_object('ok', true, 'duplicate', true, 'id', pr.id, 'status', pr.status); end if;
  if pr.status = 'withdrawn' then return jsonb_build_object('ok', false, 'reason', 'proposal_withdrawn'); end if;
  if g.status <> 'open' or g.paused_by_team then return jsonb_build_object('ok', false, 'reason', 'gig_not_open'); end if;
  if not dela_switch_on('flex_gigs', p_person) then return jsonb_build_object('ok', false, 'reason', 'gigs_off'); end if;
  v_access := dela_gig_access(p_person, p_gig);
  if v_access not in ('invited', 'match', 'public', 'drafted') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_why := dela_freelancer_eligible(p_person, p_gig);
  if v_why <> '' then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  if coalesce((p->>'price_cents')::int, 0) <= 0 then return jsonb_build_object('ok', false, 'reason', 'proposal_needs_price'); end if;
  if coalesce(p->>'included', '') = '' then return jsonb_build_object('ok', false, 'reason', 'proposal_needs_included'); end if;
  if coalesce(p->>'schedule', '') = '' and nullif(p->>'days_to_deliver', '') is null then return jsonb_build_object('ok', false, 'reason', 'proposal_needs_schedule'); end if;
  select count(*) filter (where sent_at > now() - interval '1 hour'), count(*) filter (where sent_at > now() - interval '1 day') into v_hour, v_day
    from proposals where freelancer_id = p_person and sent_at is not null;
  if v_hour >= dela_int_setting('proposal.rate_per_hour', 10) or v_day >= dela_int_setting('proposal.rate_per_day', 30) then return jsonb_build_object('ok', false, 'reason', 'too_many_proposals'); end if;
  v_invited := exists (select 1 from gig_invitations i where i.gig_id = p_gig and i.freelancer_id = p_person and i.status in ('sent', 'answered'));
  v_count := not v_invited or coalesce((dela_setting('quota.invited_proposals_count') #>> '{}')::boolean, false);
  if v_count then
    q := dela_quota_reserve(p_person, 'freelancer', 'fl.proposals', 1, 'proposal:' || p_gig::text || ':' || p_person::text, p_gig::text);
    if not coalesce((q->>'ok')::boolean, false) then return q || jsonb_build_object('allowance', dela_proposal_allowance(p_person)); end if;
    if not coalesce((q->>'duplicate')::boolean, false) or q->>'status' = 'reserved' then perform dela_quota_finish((q->>'reservation_id')::uuid, true); end if;
  end if;
  perform dela_proposal_save(p_person, p_gig, p);
  update proposals set status = case when p_held then 'held' else 'sent' end, invited = v_invited, counted = v_count, reservation_id = (q->>'reservation_id')::uuid,
    scope_version = g.scope_version, needs_reconfirm = false, sent_at = now(), request_id = coalesce(p->>'request_id', ''), updated_at = now()
  where gig_id = p_gig and freelancer_id = p_person returning * into pr;
  update gig_invitations set status = 'answered', decided_at = now() where gig_id = p_gig and freelancer_id = p_person and status = 'sent';
  perform dela_gig_event(p_gig, 'proposal_sent', 'member', p_person, jsonb_build_object('proposal', pr.id, 'held', p_held, 'counted', v_count));
  if not p_held then perform dela_proposal_notify(pr.id); end if;
  return jsonb_build_object('ok', true, 'id', pr.id, 'status', pr.status, 'counted', v_count, 'allowance', dela_proposal_allowance(p_person));
end $$;

create or replace function dela_proposal_notify(p_prop uuid) returns void language plpgsql as $$
declare pr proposals; g gigs;
begin
  select * into pr from proposals where id = p_prop;
  select * into g from gigs where id = pr.gig_id;
  perform dela_notify(jsonb_build_object('person_id', g.created_by, 'side', 'attorney', 'kind', 'gig_proposal', 'email', true,
    'title', 'New proposal for your gig', 'body', 'A freelancer sent a proposal for "' || g.title || '" (' || dela_gig_money(pr.price_cents) || '). Compare proposals in Projects.',
    'link', '/dela?tab=projects&gig=' || g.id::text, 'dedupe_key', 'gigprop:' || pr.id::text));
end $$;

-- Withdraw: the allowance never comes back (Stacey answer 2)
create or replace function dela_proposal_withdraw(p_person uuid, p_gig uuid) returns jsonb language plpgsql as $$
declare pr proposals;
begin
  select * into pr from proposals where gig_id = p_gig and freelancer_id = p_person for update;
  if pr.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if pr.status = 'withdrawn' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if pr.status not in ('sent', 'held', 'draft') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  update proposals set status = case when pr.status = 'draft' then 'draft' else 'withdrawn' end, withdrawn_at = now(), updated_at = now() where id = pr.id;
  if pr.status = 'draft' then delete from proposals where id = pr.id; end if;
  perform dela_gig_event(p_gig, 'proposal_withdrawn', 'member', p_person, jsonb_build_object('proposal', pr.id));
  return jsonb_build_object('ok', true, 'allowance_returned', false);
end $$;

-- After a big change, or when the attorney picks a proposal after it expired, the freelancer confirms it again
create or replace function dela_proposal_reconfirm(p_person uuid, p_gig uuid) returns jsonb language plpgsql as $$
declare g gigs;
begin
  select * into g from gigs where id = p_gig;
  update proposals set needs_reconfirm = false, reconfirmed_at = now(), scope_version = g.scope_version, updated_at = now()
  where gig_id = p_gig and freelancer_id = p_person and status = 'sent';
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform dela_gig_event(p_gig, 'proposal_reconfirmed', 'member', p_person, '{}');
  perform dela_notify(jsonb_build_object('person_id', g.created_by, 'side', 'attorney', 'kind', 'gig_proposal', 'title', 'A freelancer confirmed their proposal',
    'body', 'A proposal for "' || g.title || '" is confirmed and can be chosen.', 'link', '/dela?tab=projects&gig=' || g.id::text, 'dedupe_key', 'gigreconf:' || p_gig::text || ':' || p_person::text || ':' || extract(epoch from now())::bigint));
  return jsonb_build_object('ok', true);
end $$;

-- Proposals side by side for the attorney: price against the range (outside is labeled, never hidden), included and
-- excluded, schedule, and the freelancer's relevant qualifications. Each applicant only ever sees their own.
create or replace function dela_gig_proposals(p_person uuid, p_gig uuid) returns jsonb language plpgsql as $$
declare g gigs; v_until timestamptz;
begin
  if dela_gig_close_if_due(p_gig) is null or not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into g from gigs where id = p_gig;
  v_until := g.closed_at + make_interval(days => dela_int_setting('gig.proposals_actionable_days', 7));
  return jsonb_build_object('ok', true, 'budget_min_cents', g.budget_min_cents, 'budget_max_cents', g.budget_max_cents, 'status', g.status, 'actionable_until', v_until,
    'proposals', (select coalesce(jsonb_agg(x order by x->>'sent_at'), '[]') from (
      select jsonb_build_object('id', p.id, 'person_id', p.freelancer_id, 'status', p.status, 'price_cents', p.price_cents,
        'price_label', case when p.price_cents < g.budget_min_cents then 'below' when p.price_cents > g.budget_max_cents then 'above' else 'within' end,
        'included', p.included, 'excluded', p.excluded, 'schedule', p.schedule, 'days_to_deliver', p.days_to_deliver, 'qualifications', p.qualifications, 'message', p.message,
        'invited', p.invited, 'needs_reconfirm', p.needs_reconfirm or p.scope_version < g.scope_version, 'reconfirm_asked_at', p.reconfirm_asked_at, 'reconfirmed_at', p.reconfirmed_at, 'sent_at', p.sent_at,
        'name', coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name),
        'headline', mp.body->>'headline', 'experience', left(coalesce(mp.body->>'experience', ''), 600), 'software', mp.body->'software', 'practice_areas', mp.body->'practice_areas',
        'match_reasons', (select to_jsonb(m.reasons) from gig_matches m where m.gig_id = g.id and m.person_id = p.freelancer_id)) x
      from proposals p join people pe on pe.id = p.freelancer_id left join member_profiles mp on mp.person_id = p.freelancer_id and mp.side = 'freelancer'
      where p.gig_id = g.id and p.status in ('sent', 'selected', 'not_selected')) t));
end $$;

create or replace function dela_proposal_ask_reconfirm(p_person uuid, p_prop uuid) returns jsonb language plpgsql as $$
declare pr proposals; g gigs;
begin
  select * into pr from proposals where id = p_prop;
  if pr.id is null or not dela_gig_manager(p_person, pr.gig_id) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into g from gigs where id = pr.gig_id;
  update proposals set reconfirm_asked_at = now(), needs_reconfirm = true, updated_at = now() where id = p_prop and status = 'sent';
  perform dela_notify(jsonb_build_object('person_id', pr.freelancer_id, 'side', 'freelancer', 'kind', 'gig_reconfirm', 'email', true,
    'title', 'The attorney wants to choose your proposal', 'body', 'Please confirm your proposal for "' || g.title || '" still stands, so the attorney can choose it.',
    'link', '/dela?tab=work&gig=' || g.id::text, 'dedupe_key', 'gigask:' || p_prop::text || ':' || extract(epoch from now())::bigint));
  return jsonb_build_object('ok', true);
end $$;

-- Choose a proposal: starts a draft agreement (signing and funding in Step 6), closes the gig unless more hires are allowed,
-- and other applicants get a polite closing notice with no details. The freelancer is checked again now.
create or replace function dela_proposal_select(p_person uuid, p_prop uuid) returns jsonb language plpgsql as $$
declare pr proposals; g gigs; v_until timestamptz; v_why text; v_ag uuid; v_hires int;
begin
  select * into pr from proposals where id = p_prop;
  if pr.id is null or not dela_gig_manager(p_person, pr.gig_id) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform dela_gig_close_if_due(pr.gig_id);
  select * into g from gigs where id = pr.gig_id for update;
  select * into pr from proposals where id = p_prop for update;
  if pr.status = 'selected' then return jsonb_build_object('ok', true, 'duplicate', true, 'agreement_id', (select id from agreements where proposal_id = p_prop)); end if;
  if pr.status <> 'sent' then return jsonb_build_object('ok', false, 'reason', 'proposal_not_available'); end if;
  if g.status = 'canceled' or g.paused_by_team then return jsonb_build_object('ok', false, 'reason', 'gig_not_open'); end if;
  if not coalesce((dela_attorney_eligibility(p_person)->>'can_post')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'not_verified'); end if;
  v_until := g.closed_at + make_interval(days => dela_int_setting('gig.proposals_actionable_days', 7));
  -- After the actionable days, or after a big change, the freelancer confirms first
  if (g.closed_at is not null and now() > v_until and (pr.reconfirmed_at is null or pr.reconfirmed_at < v_until)) or pr.needs_reconfirm or pr.scope_version < g.scope_version then
    return jsonb_build_object('ok', false, 'reason', 'needs_reconfirm');
  end if;
  v_why := dela_freelancer_eligible(pr.freelancer_id, g.id);
  if v_why = 'not_match_ready' then return jsonb_build_object('ok', false, 'reason', 'freelancer_not_available'); end if;
  insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents)
  values (g.id, pr.id, g.org_id, p_person, pr.freelancer_id, pr.price_cents) on conflict (proposal_id) do nothing returning id into v_ag;
  update proposals set status = 'selected', decided_at = now(), updated_at = now() where id = pr.id;
  perform dela_gig_event(g.id, 'proposal_selected', 'member', p_person, jsonb_build_object('proposal', pr.id, 'agreement', v_ag));
  perform dela_notify(jsonb_build_object('person_id', pr.freelancer_id, 'side', 'freelancer', 'kind', 'gig_selected', 'email', true, 'essential', true,
    'title', 'You were chosen for a gig', 'body', 'The attorney chose your proposal for "' || g.title || '" (' || dela_gig_money(pr.price_cents) || '). DELA is preparing the agreement and the milestones; you will be asked to review and sign before any work starts.',
    'link', '/dela?tab=work&gig=' || g.id::text, 'dedupe_key', 'gigsel:' || pr.id::text));
  select count(*) into v_hires from agreements where gig_id = g.id and status <> 'canceled';
  if not (dela_switch_on('multiple_hires', p_person) and v_hires < g.hires_allowed) then
    if g.status in ('open', 'paused') then perform dela_gig_finish(g.id, 'filled', 'proposal_selected', 'member', p_person);
    else
      update gigs set status = 'filled', close_reason = 'proposal_selected', updated_at = now() where id = g.id;
      update proposals set status = 'not_selected', decided_at = now(), updated_at = now() where gig_id = g.id and status in ('sent', 'held');
    end if;
  end if;
  return jsonb_build_object('ok', true, 'agreement_id', v_ag);
end $$;

-- ---------- Questions (answered publicly, for every applicant: Stacey answer 9) ----------
create or replace function dela_question_ask(p_person uuid, p_gig uuid, p_text text, p_request text, p_held boolean) returns jsonb language plpgsql as $$
declare g gigs; v_id uuid;
begin
  if dela_gig_close_if_due(p_gig) is null or dela_gig_access(p_person, p_gig) not in ('invited', 'match', 'public', 'applicant', 'drafted', 'hired') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into g from gigs where id = p_gig;
  if g.status <> 'open' then return jsonb_build_object('ok', false, 'reason', 'gig_not_open'); end if;
  insert into gig_questions (gig_id, asked_by, question, status, request_id) values (p_gig, p_person, left(p_text, 2000), case when p_held then 'held' else 'open' end, p_request)
  on conflict (gig_id, asked_by, request_id) do nothing returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if not p_held then perform dela_question_notify(v_id); end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'held', p_held);
end $$;

create or replace function dela_question_notify(p_q uuid) returns void language plpgsql as $$
declare q gig_questions; g gigs;
begin
  select * into q from gig_questions where id = p_q;
  select * into g from gigs where id = q.gig_id;
  perform dela_notify(jsonb_build_object('person_id', g.created_by, 'side', 'attorney', 'kind', 'gig_question', 'email', true,
    'title', 'A question on your gig', 'body', 'A freelancer asked a question on "' || g.title || '". Your answer is shown to every applicant.',
    'link', '/dela?tab=projects&gig=' || g.id::text, 'dedupe_key', 'gigq:' || q.id::text));
end $$;

create or replace function dela_question_answer(p_person uuid, p_q uuid, p_answer text, p_held boolean) returns jsonb language plpgsql as $$
declare q gig_questions; g gigs; a record;
begin
  select * into q from gig_questions where id = p_q for update;
  if q.id is null or not dela_gig_manager(p_person, q.gig_id) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if q.status = 'answered' and q.answer = p_answer then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  select * into g from gigs where id = q.gig_id;
  update gig_questions set answer = left(p_answer, 4000), answered_by = p_person, answered_at = now(), status = case when p_held then 'held' else 'answered' end where id = p_q;
  if not p_held then
    for a in select distinct person_id from (select q.asked_by as person_id union select freelancer_id from proposals where gig_id = g.id and status in ('sent', 'held', 'draft')
                                             union select freelancer_id from gig_invitations where gig_id = g.id and status in ('sent', 'answered')) t loop
      perform dela_notify(jsonb_build_object('person_id', a.person_id, 'side', 'freelancer', 'kind', 'gig_answer', 'title', 'A question on a gig was answered',
        'body', 'The attorney answered a question on "' || g.title || '". Every applicant sees the answer.', 'link', '/dela?tab=work&gig=' || g.id::text, 'dedupe_key', 'giga:' || p_q::text || ':' || a.person_id::text));
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'held', p_held);
end $$;

-- ---------- Gig files ----------
create or replace function dela_gig_file_share(p_person uuid, p_gig uuid, p_file uuid, p_share boolean) returns jsonb language plpgsql as $$
declare g gigs; f files;
begin
  if dela_gig_close_if_due(p_gig) is null or not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into g from gigs where id = p_gig;
  select * into f from files where id = p_file;
  if f.id is null or f.org_id <> g.org_id or f.purpose <> 'member' or f.status <> 'ready' then return jsonb_build_object('ok', false, 'reason', 'file_not_usable'); end if;
  if p_share then
    insert into gig_files (gig_id, file_id, shared_by) values (p_gig, p_file, p_person) on conflict (gig_id, file_id) do update set removed_at = null, shared_at = now(), shared_by = p_person;
  else
    update gig_files set removed_at = now() where gig_id = p_gig and file_id = p_file and removed_at is null;
  end if;
  perform dela_gig_event(p_gig, case when p_share then 'file_shared' else 'file_unshared' end, 'member', p_person, jsonb_build_object('file', p_file));
  return jsonb_build_object('ok', true);
end $$;

-- A download: allowed only to the gig's managers and, while access lasts, invited or hired freelancers. Every download is logged.
create or replace function dela_gig_file_get(p_person uuid, p_side text, p_gig uuid, p_file uuid) returns jsonb language plpgsql as $$
declare f files; v_ok boolean;
begin
  perform dela_gig_close_if_due(p_gig);
  select fi.* into f from gig_files gf join files fi on fi.id = gf.file_id where gf.gig_id = p_gig and gf.file_id = p_file and gf.removed_at is null and fi.status = 'ready';
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_ok := (p_side = 'attorney' and dela_gig_manager(p_person, p_gig)) or (p_side = 'freelancer' and dela_gig_files_open(p_gig, p_person));
  if not v_ok then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  insert into gig_file_downloads (gig_id, file_id, person_id) values (p_gig, p_file, p_person);
  return jsonb_build_object('ok', true, 'path', f.storage_path, 'name', f.name);
end $$;

-- ---------- Lists ----------
create or replace function dela_gigs_mine(p_person uuid) returns jsonb language plpgsql as $$
declare due record;
begin
  for due in select id from gigs where status in ('open', 'paused') and closes_at <= now() and dela_firm_role(p_person, org_id) in ('owner', 'manager') loop perform dela_gig_close_if_due(due.id); end loop;
  return jsonb_build_object('ok', true, 'eligibility', dela_attorney_eligibility(p_person),
    'allowance', (select e from jsonb_array_elements(dela_entitlements(p_person, 'attorney')) e where e->>'key' = 'att.gigs_active'),
    'min_budget_cents', dela_int_setting('gig.min_budget_cents', 25000),
    'gigs', (select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'title', g.title, 'status', g.status, 'budget_min_cents', g.budget_min_cents, 'budget_max_cents', g.budget_max_cents,
        'deadline', g.deadline, 'closes_at', g.closes_at, 'closed_at', g.closed_at, 'paused_by_team', g.paused_by_team,
        'proposals', (select count(*) from proposals p where p.gig_id = g.id and p.status in ('sent', 'selected', 'not_selected')),
        'questions_open', (select count(*) from gig_questions q where q.gig_id = g.id and q.status = 'open')) order by g.created_at desc), '[]')
      from gigs g where dela_firm_role(p_person, g.org_id) in ('owner', 'manager') and g.status <> 'canceled'),
    'playbooks', (select coalesce(jsonb_agg(jsonb_build_object('id', pb.id, 'title', pb.title, 'practice_area', pb.practice_area) order by pb.title), '[]')
      from playbooks pb where pb.status = 'approved' and dela_firm_role(p_person, pb.org_id) in ('owner', 'manager')));
end $$;

-- The freelancer's Work tab: matches, invitations, open gigs (public), drafts and sent proposals, and the allowance
create or replace function dela_work(p_person uuid) returns jsonb language plpgsql as $$
declare v_row jsonb;
begin
  perform dela_gig_close_if_due(g.id) from gigs g where g.status in ('open', 'paused') and g.closes_at <= now();
  return jsonb_build_object('ok', true, 'on', dela_switch_on('flex_gigs', p_person), 'state', dela_profile_state(p_person, 'freelancer'), 'allowance', dela_proposal_allowance(p_person),
    'matches', (select coalesce(jsonb_agg(dela_gig_card(g, m.reasons) order by m.tier desc, m.fit desc), '[]') from gig_matches m join gigs g on g.id = m.gig_id
      where m.person_id = p_person and g.status = 'open' and not g.paused_by_team and not exists (select 1 from proposals p where p.gig_id = g.id and p.freelancer_id = p_person and p.status <> 'draft')),
    'invitations', (select coalesce(jsonb_agg(dela_gig_card(g, null) || jsonb_build_object('message', i.message, 'invited_at', i.created_at) order by i.created_at desc), '[]')
      from gig_invitations i join gigs g on g.id = i.gig_id where i.freelancer_id = p_person and i.status = 'sent' and g.status = 'open'),
    'open_gigs', (select coalesce(jsonb_agg(dela_gig_card(g, null) order by g.opened_at desc), '[]') from gigs g
      where g.status = 'open' and g.visibility = 'public' and not g.paused_by_team and dela_switch_on('public_gigs', p_person)
        and exists (select 1 from side_profiles sp where sp.person_id = p_person and sp.side = 'freelancer' and sp.readiness_state = 'match_ready')
        and not exists (select 1 from gig_matches m where m.gig_id = g.id and m.person_id = p_person)
        and not exists (select 1 from proposals p where p.gig_id = g.id and p.freelancer_id = p_person)
        and dela_freelancer_eligible(p_person, g.id) = ''),
    'drafts', (select coalesce(jsonb_agg(dela_gig_card(g, null) || jsonb_build_object('proposal_status', p.status) order by p.updated_at desc), '[]')
      from proposals p join gigs g on g.id = p.gig_id where p.freelancer_id = p_person and p.status = 'draft'),
    'sent', (select coalesce(jsonb_agg(dela_gig_card(g, null) || jsonb_build_object('proposal_status', p.status, 'price_cents', p.price_cents, 'sent_at', p.sent_at,
        'needs_reconfirm', p.needs_reconfirm or p.scope_version < g.scope_version, 'counted', p.counted) order by p.sent_at desc), '[]')
      from proposals p join gigs g on g.id = p.gig_id where p.freelancer_id = p_person and p.status in ('sent', 'held', 'selected', 'not_selected', 'withdrawn')));
end $$;

create or replace function dela_gig_card(g gigs, p_reasons text[]) returns jsonb language sql stable as $$
  select jsonb_build_object('id', g.id, 'title', g.title, 'task', left(coalesce(g.public->>'task', ''), 300), 'practice_area', g.public->>'practice_area', 'state', g.public->>'state',
    'budget_min_cents', g.budget_min_cents, 'budget_max_cents', g.budget_max_cents, 'deadline', g.deadline, 'closes_at', g.closes_at, 'status', g.status,
    'reasons', to_jsonb(coalesce(p_reasons, '{}'::text[])))
$$;

-- ---------- Talent: search match-ready freelancers ----------
create or replace function dela_talent_search(p_person uuid, p jsonb) returns jsonb language plpgsql stable as $$
declare v_area text := coalesce(p->>'practice_area', ''); v_skill text := lower(coalesce(p->>'skill', '')); v_tool text := lower(coalesce(p->>'tool', '')); v_state text := upper(coalesce(p->>'state', ''));
  v_days int := dela_int_setting('profile.availability_days', 14);
begin
  if not dela_switch_on('talent_search', p_person) then return jsonb_build_object('ok', false, 'reason', 'talent_off'); end if;
  return jsonb_build_object('ok', true, 'people', (select coalesce(jsonb_agg(x), '[]') from (
    select jsonb_build_object('person_id', sp.person_id, 'name', coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name),
      'headline', mp.body->>'headline', 'summary', left(coalesce(mp.body->>'summary', ''), 400), 'practice_areas', mp.body->'practice_areas', 'skills', mp.body->'skills',
      'software', mp.body->'software', 'timezone', mp.body->>'timezone', 'capacity_hours_week', mp.body->'capacity_hours_week', 'states_excluded', mp.body->'states_excluded') x
    from side_profiles sp join member_profiles mp on mp.person_id = sp.person_id and mp.side = 'freelancer' join people pe on pe.id = sp.person_id
    where sp.side = 'freelancer' and sp.status = 'active' and sp.readiness_state = 'match_ready' and sp.person_id <> p_person and not dela_has_hold(sp.person_id)
      and mp.availability <> 'unavailable' and mp.availability_confirmed_at > now() - make_interval(days => v_days)
      and (v_area = '' or mp.body->'practice_areas' ? v_area)
      and (v_skill = '' or exists (select 1 from jsonb_array_elements_text(coalesce(mp.body->'skills', '[]')) s where lower(s) like '%' || v_skill || '%'))
      and (v_tool = '' or exists (select 1 from jsonb_array_elements_text(coalesce(mp.body->'software', '[]')) s where lower(s) like '%' || v_tool || '%'))
      and (v_state = '' or not exists (select 1 from jsonb_array_elements_text(coalesce(mp.body->'states_excluded', '[]')) s where upper(s) = v_state))
    order by coalesce((dela_setting('matching.plan_boost') ->> sp.plan_code)::int, 0) desc, pe.last_seen_at desc nulls last limit 40) t));
end $$;

-- ---------- Conduct (off-platform) ----------
create or replace function dela_conduct_flag(p jsonb) returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into conduct_flags (object_type, object_id, gig_id, person_id, kinds, excerpt, source)
  values (p->>'object_type', (p->>'object_id')::uuid, (p->>'gig_id')::uuid, (p->>'person_id')::uuid, array(select jsonb_array_elements_text(coalesce(p->'kinds', '[]'))), left(coalesce(p->>'excerpt', ''), 500), coalesce(p->>'source', 'rules'))
  returning id into v;
  perform dela_alert('conduct', 'A message was held for review', 'DELA held a ' || (p->>'object_type') || ' that may plan work or payment outside Lawfecta. Review it in the admin Gigs tab.', 'conduct:' || v::text);
  return v;
end $$;

create or replace function dela_admin_conduct_decide(p_actor uuid, p_flag uuid, p_clear boolean, p_note text) returns jsonb language plpgsql as $$
declare f conduct_flags;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  select * into f from conduct_flags where id = p_flag for update;
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if f.status <> 'open' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update conduct_flags set status = case when p_clear then 'cleared' else 'actioned' end, decided_by = p_actor, decided_at = now(), note = left(coalesce(p_note, ''), 500) where id = p_flag;
  if p_clear then
    -- Release what was held
    if f.object_type = 'proposal' then update proposals set status = 'sent', updated_at = now() where id = f.object_id and status = 'held'; perform dela_proposal_notify(f.object_id);
    elsif f.object_type = 'question' then update gig_questions set status = 'open' where id = f.object_id and status = 'held'; perform dela_question_notify(f.object_id);
    elsif f.object_type = 'answer' then update gig_questions set status = 'answered' where id = f.object_id and status = 'held';
    elsif f.object_type = 'invitation' then update gig_invitations set status = 'sent' where id = f.object_id and status = 'held'; perform dela_gig_invite_notify(f.object_id);
    end if;
  else
    if f.object_type = 'question' or f.object_type = 'answer' then update gig_questions set status = 'hidden' where id = f.object_id; end if;
    perform dela_notify(jsonb_build_object('person_id', f.person_id, 'kind', 'conduct', 'email', true, 'essential', true,
      'title', 'A message was not delivered', 'body', 'Something you sent on a gig looked like a plan to work or pay outside Lawfecta, which the terms do not allow, so it was not delivered. Keep all work, messages and payment on Lawfecta. Contact the Lawfecta Team if you think this is wrong.',
      'link', '/dela', 'dedupe_key', 'conduct:' || p_flag::text));
  end if;
  perform dela_audit('staff', p_actor, case when p_clear then 'conduct_cleared' else 'conduct_actioned' end, f.object_type, f.object_id::text, jsonb_build_object('flag', p_flag));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- What DELA has learned about you ----------
create or replace function dela_insight_add(p_person uuid, p_side text, p_text text, p_source text) returns void language plpgsql as $$
begin
  if not dela_switch_on('member_insights', p_person) or coalesce(trim(p_text), '') = '' then return; end if;
  if exists (select 1 from member_insights where person_id = p_person and side = p_side and lower(text) = lower(left(trim(p_text), 300))) then return; end if;
  insert into member_insights (person_id, side, text, source) values (p_person, p_side, left(trim(p_text), 300), left(coalesce(p_source, ''), 60));
  -- Keep the newest ones only
  update member_insights set removed_at = now() where id in (select id from member_insights where person_id = p_person and side = p_side and removed_at is null
    order by created_at desc offset dela_int_setting('insights.max_per_member', 40));
end $$;

create or replace function dela_insights(p_person uuid, p_side text) returns jsonb language sql stable as $$
  select jsonb_build_object('ok', true, 'on', dela_switch_on('member_insights', p_person), 'items', coalesce(jsonb_agg(jsonb_build_object('id', id, 'text', text, 'source', source, 'created_at', created_at) order by created_at desc), '[]'))
  from member_insights where person_id = p_person and side = p_side and removed_at is null
$$;

create or replace function dela_insight_remove(p_person uuid, p_id uuid) returns jsonb language plpgsql as $$
begin
  update member_insights set removed_at = now() where id = p_id and person_id = p_person and removed_at is null;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Admin ----------
create or replace function dela_admin_gigs(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  return jsonb_build_object(
    'switches', (select jsonb_object_agg(key, state) from feature_switches where key in ('flex_gigs', 'public_gigs', 'talent_search', 'multiple_hires', 'conduct_review', 'member_insights')),
    'gigs', (select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'title', g.title, 'status', g.status, 'firm', o.name, 'by', pe.display_name, 'opened_at', g.opened_at, 'closes_at', g.closes_at,
        'budget_min_cents', g.budget_min_cents, 'budget_max_cents', g.budget_max_cents, 'paused_by_team', g.paused_by_team, 'pause_reason', g.pause_reason,
        'proposals', (select count(*) from proposals p where p.gig_id = g.id and p.status <> 'draft'), 'matches', (select count(*) from gig_matches m where m.gig_id = g.id),
        'flags', (select count(*) from conduct_flags f where f.gig_id = g.id and f.status = 'open')) order by g.opened_at desc nulls last), '[]')
      from gigs g join organizations o on o.id = g.org_id join people pe on pe.id = g.created_by where g.status in ('open', 'paused') or g.updated_at > now() - interval '30 days'),
    'proposals_by_plan', (select coalesce(jsonb_agg(jsonb_build_object('plan', x.plan_code, 'sent', x.n, 'senders', x.people) order by x.plan_code), '[]') from (
      select sp.plan_code, count(*) n, count(distinct p.freelancer_id) people from proposals p join side_profiles sp on sp.person_id = p.freelancer_id and sp.side = 'freelancer'
      where p.sent_at > date_trunc('month', now()) group by sp.plan_code) x),
    'flags', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'object_type', f.object_type, 'gig_title', g.title, 'person', pe.display_name, 'bd_member_id', pe.bd_member_id,
        'kinds', to_jsonb(f.kinds), 'excerpt', f.excerpt, 'source', f.source, 'created_at', f.created_at) order by f.created_at), '[]')
      from conduct_flags f join people pe on pe.id = f.person_id left join gigs g on g.id = f.gig_id where f.status = 'open'));
end $$;

create or replace function dela_admin_gig_pause(p_actor uuid, p_gig uuid, p_pause boolean, p_reason text) returns jsonb language plpgsql as $$
declare g gigs;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  select * into g from gigs where id = p_gig for update;
  if g.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if g.paused_by_team = p_pause then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update gigs set paused_by_team = p_pause, pause_reason = case when p_pause then left(coalesce(p_reason, ''), 300) else '' end, status = case when p_pause and status = 'open' then 'paused' when not p_pause and status = 'paused' then 'open' else status end, updated_at = now() where id = p_gig;
  perform dela_gig_event(p_gig, case when p_pause then 'paused_by_team' else 'resumed_by_team' end, 'staff', p_actor, jsonb_build_object('reason', p_reason));
  perform dela_audit('staff', p_actor, case when p_pause then 'gig_paused' else 'gig_resumed' end, 'gig', p_gig::text, jsonb_build_object('reason', p_reason));
  perform dela_notify(jsonb_build_object('person_id', g.created_by, 'side', 'attorney', 'kind', 'gig_paused', 'email', true,
    'title', case when p_pause then 'The Lawfecta Team paused your gig' else 'Your gig is open again' end,
    'body', '"' || g.title || '" ' || case when p_pause then 'is paused while the Lawfecta Team checks it' || case when coalesce(p_reason, '') <> '' then ': ' || p_reason else '' end || '. Contact the team with any questions.' else 'is open again.' end,
    'link', '/dela?tab=projects&gig=' || p_gig::text, 'dedupe_key', 'gigpause:' || p_gig::text || ':' || extract(epoch from now())::bigint));
  return jsonb_build_object('ok', true);
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

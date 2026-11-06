-- Step 4d, part C: "✦ Automate or delegate" (docs/briefs/step-4d-guided-setup-delegate-automate.md, Stacey's answers
-- 2026-11-06). On an approved SOP, Workflow or Playbook, the attorney (or a manager) clicks "✦ Find what to automate or
-- delegate"; DELA reviews that approved version once and the review is reused until a new version is approved. The
-- delegate path is saved step by step (pick steps, the SOP for just those steps, its KPIs, approval, the gig), so the
-- attorney can stop and come back. Only an attorney who can post gigs approves the delegated SOP and posts the gig.
-- Part B, "Get set up": each person's skipped steps and whether they dismissed the progress card on Home.
-- Switches automate_delegate and guided_setup (off until tested). Additive.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('automate.max_recommendations', '5', 'Most recommendations in one Automate or delegate review', 'Guided setup and Automate or delegate', 'recommendations', 'C', 'Stacey 2026-11-06 (step 4d answers)', 'Ranked only by time saved.'),
  ('ai.credits.automate_review', '2', 'Credits for one Automate or delegate review (Lawfecta''s key only)', 'Guided setup and Automate or delegate', 'credits', 'O', 'Claude suggestion', 'One review per approved version, reused until the document changes.'),
  ('automate.rate_low_cents', '4000', 'Low end of the hourly rate DELA uses to suggest a delegated gig''s budget', 'Guided setup and Automate or delegate', 'cents an hour', 'O', 'Claude suggestion', 'Used until Lawfecta has enough hires to work out real rates for a skill.'),
  ('automate.rate_high_cents', '7500', 'High end of the hourly rate DELA uses to suggest a delegated gig''s budget', 'Guided setup and Automate or delegate', 'cents an hour', 'O', 'Claude suggestion', 'Used until Lawfecta has enough hires to work out real rates for a skill.'),
  ('onboarding.reminder_days', '[2,7]', 'Days after sign-up for reminder emails about unfinished setup steps (empty turns them off)', 'Guided setup and Automate or delegate', 'days', 'C', 'Stacey 2026-11-06 (step 4d answers)', 'For the onboarding widget, after the MVP launch.')
on conflict (key) do nothing;
insert into feature_switches (key, label, gate) values
  ('automate_delegate', 'Automate or delegate: DELA finds steps in an approved document to automate or hand to a freelancer', 'Step 4d tested'),
  ('guided_setup', 'The Get set up screen for attorneys', 'Step 4d tested'),
  ('onboarding_widget', 'The onboarding widget for new attorneys and freelancers', 'After the MVP launch')
on conflict (key) do nothing;

-- One review per approved version. The AI's answer is checked by code before it is saved (never an attorney-decides step
-- to delegate, never a tool outside the catalog or the firm's own systems, at most automate.max_recommendations).
create table if not exists automate_reviews (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references playbooks(id),
  org_id uuid not null references organizations(id),
  version int not null,
  recommendations jsonb not null default '[]',
  estimate jsonb not null default '{}',            -- DELA's estimate: {frequency, minutes}
  frequency text check (frequency in ('daily', 'weekly', 'monthly', 'quarterly')),   -- the attorney's answers (optional)
  minutes int check (minutes between 1 and 6000),
  source text not null default '',
  created_by uuid not null references people(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (playbook_id, version)
);
alter table automate_reviews enable row level security;

create table if not exists automate_dismissals (
  person_id uuid not null references people(id),
  playbook_id uuid not null references playbooks(id),
  dismissed_at timestamptz not null default now(),
  primary key (person_id, playbook_id)
);
alter table automate_dismissals enable row level security;

-- The delegate path, saved as it goes. kind 'setup' is "Hire a freelancer to set it up" for a tool.
create table if not exists delegations (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references automate_reviews(id),
  playbook_id uuid not null references playbooks(id),
  org_id uuid not null references organizations(id),
  rec_id text not null,
  kind text not null default 'delegate' check (kind in ('delegate', 'setup')),
  title text not null default '',
  steps int[] not null default '{}',
  tool text not null default '',
  stage int not null default 1 check (stage between 1 and 5),
  kpis jsonb not null default '{}',
  sop_id uuid references playbooks(id),
  gig_id uuid references gigs(id),
  status text not null default 'open' check (status in ('open', 'posted', 'canceled')),
  created_by uuid not null references people(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (review_id, rec_id, kind)
);
alter table delegations enable row level security;
create index if not exists delegations_playbook on delegations (playbook_id);

-- "Get set up" (part B): skipped steps and the dismissed Home card, per person and side
create table if not exists setup_progress (
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  skipped text[] not null default '{}',
  dismissed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (person_id, side)
);
alter table setup_progress enable row level security;

-- Who may run it: editors and administrators of the document's library (attorneys and managers)
create or replace function dela_automate_role(p_person uuid, p_playbook uuid) returns text language sql stable as $$
  select dela_pb_role(p_person, x.org_id) from playbooks x where x.id = p_playbook
$$;

-- What the document page needs: the review for the approved version, whether an older one exists, the hint, delegations
create or replace function dela_automate_state(p_person uuid, p_playbook uuid) returns jsonb language plpgsql stable as $$
declare x playbooks; v_role text; r automate_reviews;
begin
  select * into x from playbooks where id = p_playbook;
  v_role := case when x.id is null then null else dela_pb_role(p_person, x.org_id) end;
  if v_role is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('automate_delegate', p_person) then return jsonb_build_object('ok', true, 'on', false); end if;
  select * into r from automate_reviews where playbook_id = x.id and version = x.approved_version;
  return jsonb_build_object('ok', true, 'on', true, 'can_run', dela_pb_rank(v_role) >= 3 and x.doc_type is not null and x.doc_type <> 'policy',
    'approved', x.approved_version is not null, 'approved_version', x.approved_version, 'doc_type', x.doc_type,
    'can_approve', coalesce((dela_client_eligibility(p_person, x.org_id)->>'can_post')::boolean, false),
    'dismissed', exists (select 1 from automate_dismissals d where d.person_id = p_person and d.playbook_id = x.id),
    'review', case when r.id is null then null else jsonb_build_object('id', r.id, 'version', r.version, 'recommendations', r.recommendations, 'estimate', r.estimate,
      'frequency', r.frequency, 'minutes', r.minutes, 'created_at', r.created_at) end,
    'out_of_date', r.id is null and exists (select 1 from automate_reviews o where o.playbook_id = x.id),
    'delegations', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'rec_id', d.rec_id, 'kind', d.kind, 'title', d.title, 'steps', d.steps, 'tool', d.tool, 'stage', d.stage,
        'status', d.status, 'sop_id', d.sop_id, 'sop_title', s.title, 'sop_doc_id', s.doc_id, 'sop_status', s.status, 'gig_id', d.gig_id) order by d.created_at), '[]')
      from delegations d left join playbooks s on s.id = d.sop_id where d.playbook_id = x.id and d.status <> 'canceled'));
end $$;

create or replace function dela_automate_save(p_person uuid, p_playbook uuid, p_version int, p_recs jsonb, p_estimate jsonb, p_source text, p_frequency text, p_minutes int) returns jsonb language plpgsql as $$
declare x playbooks; v_id uuid;
begin
  select * into x from playbooks where id = p_playbook;
  if x.id is null or dela_pb_rank(coalesce(dela_pb_role(p_person, x.org_id), '')) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('automate_delegate', p_person) then return jsonb_build_object('ok', false, 'reason', 'automate_off'); end if;
  if x.approved_version is distinct from p_version then return jsonb_build_object('ok', false, 'reason', 'not_approved'); end if;
  insert into automate_reviews (playbook_id, org_id, version, recommendations, estimate, frequency, minutes, source, created_by)
  values (x.id, x.org_id, p_version, coalesce(p_recs, '[]'), coalesce(p_estimate, '{}'), p_frequency, p_minutes, coalesce(p_source, ''), p_person)
  on conflict (playbook_id, version) do nothing returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', (select id from automate_reviews where playbook_id = x.id and version = p_version)); end if;
  perform dela_audit('member', p_person, 'automate_review', 'playbook', x.id::text, jsonb_build_object('version', p_version, 'recommendations', jsonb_array_length(coalesce(p_recs, '[]'))));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- The attorney's own answers to "How often does this run?" and "How long does it take each time?" (no AI needed)
create or replace function dela_automate_inputs(p_person uuid, p_review uuid, p_frequency text, p_minutes int) returns jsonb language plpgsql as $$
declare r automate_reviews;
begin
  select * into r from automate_reviews where id = p_review for update;
  if r.id is null or dela_pb_rank(coalesce(dela_pb_role(p_person, r.org_id), '')) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_frequency is not null and p_frequency not in ('daily', 'weekly', 'monthly', 'quarterly') then return jsonb_build_object('ok', false, 'reason', 'bad_frequency'); end if;
  if p_minutes is not null and (p_minutes < 1 or p_minutes > 6000) then return jsonb_build_object('ok', false, 'reason', 'bad_minutes'); end if;
  update automate_reviews set frequency = p_frequency, minutes = p_minutes, updated_at = now() where id = r.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_automate_dismiss(p_person uuid, p_playbook uuid, p_on boolean) returns jsonb language plpgsql as $$
declare x playbooks;
begin
  select * into x from playbooks where id = p_playbook;
  if x.id is null or dela_pb_role(p_person, x.org_id) is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_on then insert into automate_dismissals (person_id, playbook_id) values (p_person, x.id) on conflict do nothing;
  else delete from automate_dismissals where person_id = p_person and playbook_id = x.id; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_automate_review_playbook(p_review uuid) returns uuid language sql stable as $$
  select playbook_id from automate_reviews where id = p_review
$$;

-- The systems listed in the firm profile of the library that holds the document (a manager may work in another
-- member's library, so their own firm profile is not the one to read)
create or replace function dela_automate_systems(p_person uuid, p_org uuid) returns jsonb language sql stable as $$
  select case when dela_pb_role(p_person, p_org) is null then '{}'::jsonb else coalesce((select f.body->'documents'->'systems' from firm_profiles f where f.org_id = p_org), '{}'::jsonb) end
$$;

-- Start (or reopen) the delegate path for one recommendation; the steps are checked by the api against the document
create or replace function dela_delegation_start(p_person uuid, p_review uuid, p_rec_id text, p_kind text, p_title text, p_steps int[], p_tool text) returns jsonb language plpgsql as $$
declare r automate_reviews; v_id uuid;
begin
  select * into r from automate_reviews where id = p_review;
  if r.id is null or dela_pb_rank(coalesce(dela_pb_role(p_person, r.org_id), '')) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not exists (select 1 from playbooks x where x.id = r.playbook_id and x.approved_version = r.version) then return jsonb_build_object('ok', false, 'reason', 'review_out_of_date'); end if;
  insert into delegations (review_id, playbook_id, org_id, rec_id, kind, title, steps, tool, created_by)
  values (r.id, r.playbook_id, r.org_id, left(p_rec_id, 40), p_kind, left(coalesce(p_title, ''), 160), coalesce(p_steps, '{}'), left(coalesce(p_tool, ''), 120), p_person)
  on conflict (review_id, rec_id, kind) do update set status = case when delegations.status = 'canceled' then 'open' else delegations.status end, updated_at = now()
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function dela_delegation_get(p_person uuid, p_id uuid) returns jsonb language plpgsql stable as $$
declare d delegations; v_role text;
begin
  select * into d from delegations where id = p_id;
  v_role := case when d.id is null then null else dela_pb_role(p_person, d.org_id) end;
  if v_role is null or dela_pb_rank(v_role) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'delegation', to_jsonb(d) - 'created_by',
    'review', (select jsonb_build_object('id', r.id, 'version', r.version, 'recommendations', r.recommendations, 'estimate', r.estimate, 'frequency', r.frequency, 'minutes', r.minutes) from automate_reviews r where r.id = d.review_id),
    'sop', (select jsonb_build_object('id', s.id, 'title', s.title, 'doc_id', s.doc_id, 'status', s.status, 'approved_version', s.approved_version, 'blocking', s.blocking) from playbooks s where s.id = d.sop_id),
    'gig', (select jsonb_build_object('id', g.id, 'title', g.title, 'status', g.status) from gigs g where g.id = d.gig_id),
    'parent', (select jsonb_build_object('id', x.id, 'title', x.title, 'doc_id', x.doc_id) from playbooks x where x.id = d.playbook_id),
    'can_approve', coalesce((dela_client_eligibility(p_person, d.org_id)->>'can_post')::boolean, false));
end $$;

-- Save progress. The SOP and the gig are set by the api after it creates them; stage only moves within 1 to 5.
create or replace function dela_delegation_save(p_person uuid, p_id uuid, p jsonb) returns jsonb language plpgsql as $$
declare d delegations;
begin
  select * into d from delegations where id = p_id for update;
  if d.id is null or dela_pb_rank(coalesce(dela_pb_role(p_person, d.org_id), '')) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if d.status = 'posted' and (p ? 'steps' or p ? 'kpis') then return jsonb_build_object('ok', false, 'reason', 'already_posted'); end if;
  update delegations set
    stage = least(greatest(coalesce((p->>'stage')::int, stage), 1), 5),
    steps = case when p ? 'steps' then array(select jsonb_array_elements_text(p->'steps')::int) else steps end,
    kpis = case when p ? 'kpis' then p->'kpis' else kpis end,
    title = case when p ? 'title' then left(p->>'title', 160) else title end,
    sop_id = case when p ? 'sop_id' then (p->>'sop_id')::uuid else sop_id end,
    gig_id = case when p ? 'gig_id' then (p->>'gig_id')::uuid else gig_id end,
    status = case when p ? 'status' and p->>'status' in ('open', 'posted', 'canceled') then p->>'status' else status end,
    updated_at = now()
  where id = d.id returning * into d;
  return jsonb_build_object('ok', true, 'stage', d.stage, 'status', d.status);
end $$;

-- ---------- "Get set up" (part B) ----------
-- The six steps, worked out from what the attorney has done; skipped steps count as handled
create or replace function dela_setup_state(p_person uuid, p_side text) returns jsonb language plpgsql stable as $$
declare v_org uuid := dela_side_org(p_person, p_side); sp setup_progress; v_steps jsonb; v_done int;
begin
  if p_side <> 'attorney' then return jsonb_build_object('ok', false, 'reason', 'attorneys_only'); end if;
  if not dela_switch_on('guided_setup', p_person) then return jsonb_build_object('ok', true, 'on', false); end if;
  select * into sp from setup_progress where person_id = p_person and side = p_side;
  v_steps := jsonb_build_array(
    jsonb_build_object('key', 'profile', 'done', coalesce((dela_attorney_eligibility(p_person)->>'can_post')::boolean, false)),
    jsonb_build_object('key', 'firm', 'done', exists (select 1 from firm_profiles f where f.org_id = v_org and f.body ? 'documents')),
    jsonb_build_object('key', 'playbook', 'done', exists (select 1 from playbooks x where x.org_id = v_org and x.status = 'approved' and x.doc_type in ('sop', 'workflow', 'playbook'))),
    jsonb_build_object('key', 'automate', 'done', exists (select 1 from automate_reviews r where r.org_id = v_org)),
    jsonb_build_object('key', 'gig', 'done', exists (select 1 from gigs g where g.org_id = v_org and g.status in ('open', 'paused', 'closed', 'filled'))),
    jsonb_build_object('key', 'invite', 'done', exists (select 1 from gig_invitations i join gigs g on g.id = i.gig_id where g.org_id = v_org)));
  select count(*) into v_done from jsonb_array_elements(v_steps) e where (e->>'done')::boolean or (e->>'key') = any(coalesce(sp.skipped, '{}'));
  return jsonb_build_object('ok', true, 'on', true, 'steps', v_steps, 'skipped', to_jsonb(coalesce(sp.skipped, '{}')), 'done', v_done, 'total', 6,
    'dismissed', sp.dismissed_at is not null, 'finished', v_done >= 6);
end $$;

create or replace function dela_setup_mark(p_person uuid, p_side text, p_step text, p_skip boolean, p_dismiss boolean) returns jsonb language plpgsql as $$
begin
  if p_side <> 'attorney' then return jsonb_build_object('ok', false, 'reason', 'attorneys_only'); end if;
  if p_step is not null and p_step not in ('profile', 'firm', 'playbook', 'automate', 'gig', 'invite') then return jsonb_build_object('ok', false, 'reason', 'bad_step'); end if;
  insert into setup_progress (person_id, side) values (p_person, p_side) on conflict do nothing;
  update setup_progress set
    skipped = case when p_step is null then skipped when p_skip then (select array_agg(distinct v) from unnest(skipped || p_step) v) else array_remove(skipped, p_step) end,
    dismissed_at = case when p_dismiss is null then dismissed_at when p_dismiss then coalesce(dismissed_at, now()) else null end,
    updated_at = now()
  where person_id = p_person and side = p_side;
  return dela_setup_state(p_person, p_side);
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('dela_automate_systems', 'dela_automate_review_playbook', 'dela_automate_role', 'dela_automate_state', 'dela_automate_save', 'dela_automate_inputs', 'dela_automate_dismiss',
             'dela_delegation_start', 'dela_delegation_get', 'dela_delegation_save', 'dela_setup_state', 'dela_setup_mark') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

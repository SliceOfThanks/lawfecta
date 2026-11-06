-- Step 7c part 2: limited automatic repeat hiring, the "standing arrangement" (docs/briefs/step-7c-recurring-repeat-hiring.md,
-- Stacey's answers 17 to 26, 2026-11-06). Off on Live (switch auto_repeat_hiring) until counsel approves the wording.
-- A firm owner or manager and a freelancer sign once. It names the documents covered (at their approved versions), a fixed
-- price per job, a monthly spend cap, the most jobs open at once and an end date. Inside those limits the attorney hires again
-- in one click: DELA makes the gig, the agreement (signed under the arrangement) and charges the saved card. Every hire is
-- checked again at the moment it runs; anything outside the limits makes a draft gig, never a hire. Additive only.

create table if not exists standing_arrangements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  created_by uuid not null references people(id),
  freelancer_person uuid not null references people(id),
  status text not null default 'proposed' check (status in ('proposed', 'active', 'needs_review', 'ending', 'ended', 'declined')),
  docs jsonb not null default '[]',
  price_cents int not null check (price_cents > 0),
  cap_cents int not null check (cap_cents > 0),
  max_open int not null check (max_open between 1 and 20),
  end_on date not null,
  allow_firm boolean not null default false,
  attorney_typed_name text not null default '',
  attorney_signed_at timestamptz,
  freelancer_typed_name text not null default '',
  freelancer_accepted_at timestamptz,
  pending jsonb,
  review_reason text not null default '',
  review_attorney_ok boolean not null default false,
  review_freelancer_ok boolean not null default false,
  provider_customer text not null default '',
  provider_payment_method text not null default '',
  ended_at timestamptz,
  ended_by uuid references people(id),
  ended_reason text not null default '',
  request_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists standing_org on standing_arrangements (org_id);
create index if not exists standing_freelancer on standing_arrangements (freelancer_person);
alter table standing_arrangements enable row level security;

create table if not exists standing_hires (
  id uuid primary key default gen_random_uuid(),
  arrangement_id uuid not null references standing_arrangements(id),
  requested_by uuid not null references people(id),
  playbook_id uuid not null references playbooks(id),
  playbook_version int not null,
  gig_id uuid references gigs(id),
  agreement_id uuid unique references agreements(id),
  price_cents int not null check (price_cents > 0),
  status text not null default 'signing' check (status in ('signing', 'paying', 'active', 'declined', 'failed')),
  failure text not null default '',
  decline_until timestamptz,
  declined_at timestamptz,
  request_id text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists standing_hires_arr on standing_hires (arrangement_id, created_at);
alter table standing_hires enable row level security;

-- ---------- Helpers ----------
-- Jobs still open on an arrangement (not declined or failed, and the engagement not finished)
create or replace function dela_standing_open(p_arr uuid) returns int language sql stable as $$
  select count(*)::int from standing_hires h left join agreements a on a.id = h.agreement_id
  where h.arrangement_id = p_arr and h.status in ('signing', 'paying', 'active') and coalesce(a.status, 'draft') not in ('completed', 'canceled')
$$;

-- This month's spend: every hire made this month that was not declined or failed
create or replace function dela_standing_spend(p_arr uuid) returns int language sql stable as $$
  select coalesce(sum(price_cents), 0)::int from standing_hires where arrangement_id = p_arr and status in ('signing', 'paying', 'active')
    and (created_at at time zone dela_tz())::date >= dela_period_start('month')
$$;

-- Who may use an arrangement: the firm's owners and managers, and other firm attorneys when the owner allowed it
create or replace function dela_standing_role(p_person uuid, p_side text, s standing_arrangements) returns text language sql stable as $$
  select case when p_side = 'freelancer' and s.freelancer_person = p_person then 'freelancer'
              when p_side = 'attorney' and dela_firm_role(p_person, s.org_id) in ('owner', 'manager') then 'manager'
              when p_side = 'attorney' and s.allow_firm and dela_firm_role(p_person, s.org_id) is not null and dela_firm_role(p_person, s.org_id) <> '' then 'user'
              else '' end
$$;

create or replace function dela_standing_notify(s standing_arrangements, p_to text, p_title text, p_body text, p_key text) returns void language plpgsql as $$
begin
  if p_to in ('freelancer', 'both') then
    perform dela_notify(jsonb_build_object('person_id', s.freelancer_person, 'side', 'freelancer', 'kind', 'standing', 'title', p_title, 'body', p_body, 'link', '/dela?tab=work', 'email', true, 'dedupe_key', 'standing:' || s.id || ':' || p_key || ':f'));
  end if;
  if p_to in ('attorney', 'both') then
    perform dela_notify(jsonb_build_object('person_id', s.created_by, 'side', 'attorney', 'kind', 'standing', 'title', p_title, 'body', p_body, 'link', '/dela?tab=projects', 'email', true, 'dedupe_key', 'standing:' || s.id || ':' || p_key || ':a'));
  end if;
end $$;

-- The documents an attorney can put on an arrangement: approved SOPs and Workflows in the firm's library
create or replace function dela_standing_docs(p_org uuid) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('playbook_id', p.id, 'title', p.title, 'doc_id', p.doc_id, 'version', p.approved_version) order by p.title), '[]')
  from playbooks p where p.org_id = p_org and p.status = 'approved' and p.approved_version is not null and coalesce(p.doc_type, 'sop') in ('sop', 'workflow')
$$;

-- ---------- Set up (the attorney signs here; the freelancer accepts once) ----------
create or replace function dela_standing_create(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_org uuid; v_id uuid; v_fl uuid := (p->>'freelancer_person')::uuid; v_docs jsonb := '[]'; d text; pb playbooks; v_end date; v_max int; v_open int;
  v_min_tier text; v_price int := (p->>'price_cents')::int; v_cap int := (p->>'cap_cents')::int; ag agreements; s standing_arrangements;
begin
  if coalesce(p->>'request_id', '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  select * into s from standing_arrangements where request_id = p->>'request_id';
  if s.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', s.id); end if;
  if not dela_switch_on('auto_repeat_hiring', p_person) then return jsonb_build_object('ok', false, 'reason', 'standing_off'); end if;
  v_org := dela_side_org(p_person, 'attorney');
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'attorneys_only'); end if;
  if coalesce(dela_firm_role(p_person, v_org), '') not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'owners_and_managers_only'); end if;
  select tier into v_min_tier from plans where code = dela_setting_text('standing.min_attorney_plan', 'att_plus');
  if dela_tier_rank(coalesce(dela_side_tier(p_person, 'attorney'), 'free')) < dela_tier_rank(coalesce(v_min_tier, 'plus')) then return jsonb_build_object('ok', false, 'reason', 'standing_paid_plans_only'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  -- A spend cap is required (answer 19)
  if v_cap is null or v_cap <= 0 then return jsonb_build_object('ok', false, 'reason', 'cap_required'); end if;
  if v_price is null or v_price < dela_int_setting('engagement.minimum_cents', 25000) then return jsonb_build_object('ok', false, 'reason', 'price_too_low', 'min_cents', dela_int_setting('engagement.minimum_cents', 25000)); end if;
  if v_price > v_cap then return jsonb_build_object('ok', false, 'reason', 'price_over_cap'); end if;
  v_open := coalesce((p->>'max_open')::int, dela_int_setting('standing.default_open_jobs', 3));
  if v_open < 1 or v_open > 20 then return jsonb_build_object('ok', false, 'reason', 'bad_max_open'); end if;
  v_max := dela_int_setting('standing.max_months', 12);
  v_end := coalesce(nullif(p->>'end_on', '')::date, (dela_monthly_today_tz(dela_tz()) + make_interval(months => dela_int_setting('standing.default_months', 6)))::date);
  if v_end <= dela_monthly_today_tz(dela_tz()) or v_end > (dela_monthly_today_tz(dela_tz()) + make_interval(months => v_max))::date then return jsonb_build_object('ok', false, 'reason', 'bad_end_date', 'max_months', v_max); end if;
  if jsonb_typeof(p->'docs') <> 'array' or jsonb_array_length(p->'docs') = 0 then return jsonb_build_object('ok', false, 'reason', 'docs_required'); end if;
  for d in select jsonb_array_elements_text(p->'docs') loop
    select * into pb from playbooks where id = d::uuid and org_id = v_org and status = 'approved' and approved_version is not null and coalesce(doc_type, 'sop') in ('sop', 'workflow');
    if pb.id is null then return jsonb_build_object('ok', false, 'reason', 'doc_not_approved'); end if;
    v_docs := v_docs || jsonb_build_array(jsonb_build_object('playbook_id', pb.id, 'title', pb.title, 'doc_id', pb.doc_id, 'version', pb.approved_version));
  end loop;
  if not exists (select 1 from side_profiles where person_id = v_fl and side = 'freelancer' and status <> 'closed' and verification_state = 'verified') then return jsonb_build_object('ok', false, 'reason', 'freelancer_not_verified'); end if;
  if length(trim(coalesce(p->>'typed_name', ''))) < 2 or coalesce((p->>'consent')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'sign_needs_name_and_consent'); end if;
  -- The saved payment method from the firm's last paid engagement (each hire is charged to it at once, answer 22)
  select * into ag from agreements where attorney_org = v_org and coalesce(provider_payment_method, '') <> '' order by updated_at desc limit 1;
  insert into standing_arrangements (org_id, created_by, freelancer_person, docs, price_cents, cap_cents, max_open, end_on, allow_firm, attorney_typed_name, attorney_signed_at, provider_customer, provider_payment_method, request_id)
  values (v_org, p_person, v_fl, v_docs, v_price, v_cap, v_open, v_end, coalesce((p->>'allow_firm')::boolean, false), left(trim(p->>'typed_name'), 200), now(), coalesce(ag.provider_customer, ''), coalesce(ag.provider_payment_method, ''), p->>'request_id')
  returning * into s;
  perform dela_standing_notify(s, 'freelancer', 'A standing arrangement to review', 'A firm wants to hire you again for the same work without a new proposal each time: ' || dela_gig_money(s.price_cents) || ' per job, up to ' || dela_gig_money(s.cap_cents) || ' a month, at most ' || s.max_open || ' jobs open at once, until ' || to_char(s.end_on, 'FMMonth FMDD, YYYY') || '. Open Work to accept or decline.', 'new');
  perform dela_audit('member', p_person, 'standing_created', 'standing', s.id::text, jsonb_build_object('price_cents', s.price_cents, 'cap_cents', s.cap_cents));
  return jsonb_build_object('ok', true, 'id', s.id);
end $$;

create or replace function dela_monthly_today_tz(p_tz text) returns date language sql stable as $$ select (now() at time zone p_tz)::date $$;

create or replace function dela_standing_accept(p_person uuid, p_id uuid, p jsonb) returns jsonb language plpgsql as $$
declare s standing_arrangements;
begin
  select * into s from standing_arrangements where id = p_id for update;
  if s.id is null or s.freelancer_person <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if s.status <> 'proposed' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', s.status); end if;
  if coalesce((p->>'accept')::boolean, false) is not true then
    update standing_arrangements set status = 'declined', ended_at = now(), ended_by = p_person, ended_reason = 'declined', updated_at = now() where id = p_id returning * into s;
    perform dela_standing_notify(s, 'attorney', 'Standing arrangement declined', 'The freelancer declined the standing arrangement. Hire them through a normal gig instead.', 'declined');
    return jsonb_build_object('ok', true, 'status', 'declined');
  end if;
  if length(trim(coalesce(p->>'typed_name', ''))) < 2 or coalesce((p->>'consent')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'sign_needs_name_and_consent'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  update standing_arrangements set status = 'active', freelancer_typed_name = left(trim(p->>'typed_name'), 200), freelancer_accepted_at = now(), updated_at = now() where id = p_id returning * into s;
  perform dela_standing_notify(s, 'attorney', 'Standing arrangement accepted', 'The freelancer accepted. You can now hire again in one click from Projects, inside the limits you both signed.', 'accepted');
  perform dela_audit('member', p_person, 'standing_accepted', 'standing', s.id::text, '{}');
  return jsonb_build_object('ok', true, 'status', 'active');
end $$;

-- ---------- One click: hire again (answer 17). Every limit is checked at the moment it runs. ----------
create or replace function dela_standing_hire_start(p_person uuid, p_id uuid, p_playbook uuid, p_request text) returns jsonb language plpgsql as $$
declare s standing_arrangements; h standing_hires; pb playbooks; d jsonb; v_role text; v_gig uuid; v_prop uuid; v_ag uuid; v_draft uuid; v_reason text;
begin
  if coalesce(p_request, '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  select * into h from standing_hires where request_id = p_request;
  if h.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'hire_id', h.id, 'status', h.status, 'gig_id', h.gig_id, 'agreement_id', h.agreement_id); end if;
  select * into s from standing_arrangements where id = p_id for update;
  if s.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_standing_role(p_person, 'attorney', s);
  if v_role not in ('manager', 'user') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('auto_repeat_hiring', p_person) then return jsonb_build_object('ok', false, 'reason', 'standing_off'); end if;
  if s.status = 'active' and s.end_on < dela_monthly_today_tz(dela_tz()) then
    update standing_arrangements set status = 'ended', ended_at = now(), ended_reason = 'expired', updated_at = now() where id = s.id returning * into s;
  end if;
  if s.status <> 'active' then return jsonb_build_object('ok', false, 'reason', 'standing_not_active', 'status', s.status); end if;
  -- Holds and open disputes stop every hire (T17: checked at the moment the hire runs)
  if dela_has_hold(p_person) or dela_has_hold(s.created_by) or dela_has_hold(s.freelancer_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  if exists (select 1 from disputes x join standing_hires y on y.agreement_id = x.agreement_id where y.arrangement_id = s.id and x.status in ('notice', 'team_review')) then return jsonb_build_object('ok', false, 'reason', 'dispute_open'); end if;
  if dela_tier_rank(coalesce(dela_side_tier(s.created_by, 'attorney'), 'free')) < dela_tier_rank(coalesce((select tier from plans where code = dela_setting_text('standing.min_attorney_plan', 'att_plus')), 'plus')) then return jsonb_build_object('ok', false, 'reason', 'standing_paid_plans_only'); end if;
  -- Material changes stop automatic hiring until both approve again (answer 20)
  if not exists (select 1 from side_profiles where person_id = s.freelancer_person and side = 'freelancer' and status <> 'closed' and verification_state = 'verified') then
    v_reason := 'The freelancer''s verification is no longer current.';
  end if;
  select x into d from jsonb_array_elements(s.docs) x where (x->>'playbook_id')::uuid = p_playbook;
  if d is null then
    v_reason := null;
  else
    select * into pb from playbooks where id = p_playbook;
    if pb.status <> 'approved' or pb.approved_version is distinct from (d->>'version')::int then v_reason := coalesce(v_reason, '"' || pb.title || '" has a new approved version.'); end if;
  end if;
  if v_reason is not null then
    update standing_arrangements set status = 'needs_review', review_reason = v_reason, review_attorney_ok = false, review_freelancer_ok = false, updated_at = now() where id = s.id returning * into s;
    perform dela_standing_notify(s, 'both', 'A standing arrangement needs review', v_reason || ' Automatic hiring is paused until you both review and approve the arrangement again.', 'review:' || md5(v_reason || now()::date::text));
    return jsonb_build_object('ok', false, 'reason', 'needs_review', 'detail', v_reason);
  end if;
  -- The freelancer is not available right now: no hire (DELA suggests a bench alternative on the screen)
  if not exists (select 1 from side_profiles where person_id = s.freelancer_person and side = 'freelancer' and readiness_state = 'match_ready') then return jsonb_build_object('ok', false, 'reason', 'freelancer_unavailable'); end if;
  -- Outside the limits: a draft gig both must approve the normal way, never a hire
  v_reason := case when d is null then 'not_covered' when dela_standing_spend(s.id) + s.price_cents > s.cap_cents then 'over_cap' when dela_standing_open(s.id) >= s.max_open then 'too_many_open' end;
  if v_reason is not null then
    select * into pb from playbooks where id = p_playbook and org_id = s.org_id;
    if pb.id is not null and pb.approved_version is not null then
      insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, request_id)
      values (s.org_id, p_person, pb.id, pb.approved_version, left(pb.title, 200), jsonb_build_object('title', pb.title, 'task', pb.title), s.price_cents, s.price_cents, 'draft', 'standing-draft:' || p_request)
      on conflict do nothing returning id into v_draft;
    end if;
    return jsonb_build_object('ok', false, 'reason', v_reason, 'draft_gig_id', v_draft, 'spend_cents', dela_standing_spend(s.id), 'cap_cents', s.cap_cents, 'open', dela_standing_open(s.id), 'max_open', s.max_open);
  end if;
  -- Inside every limit: the gig, the proposal and the agreement, with the saved payment method
  insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closed_at, close_reason, request_id)
  values (s.org_id, p_person, pb.id, pb.approved_version, left('Repeat: ' || pb.title, 200), jsonb_build_object('title', pb.title, 'task', pb.title), s.price_cents, s.price_cents, 'filled', now(), now(), 'standing_arrangement', 'standing:' || p_request)
  returning id into v_gig;
  insert into proposals (gig_id, freelancer_id, status, price_cents, included, schedule, sent_at, decided_at, request_id)
  values (v_gig, s.freelancer_person, 'selected', s.price_cents, left('The work in "' || pb.title || '", version ' || pb.approved_version, 4000), 'As in the document', now(), now(), 'standing:' || p_request)
  returning id into v_prop;
  insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, provider_customer, provider_payment_method, off_session_consent_at)
  values (v_gig, v_prop, s.org_id, s.created_by, s.freelancer_person, s.price_cents, nullif(s.provider_customer, ''), nullif(s.provider_payment_method, ''), s.attorney_signed_at)
  returning id into v_ag;
  insert into standing_hires (arrangement_id, requested_by, playbook_id, playbook_version, gig_id, agreement_id, price_cents, request_id)
  values (s.id, p_person, pb.id, pb.approved_version, v_gig, v_ag, s.price_cents, p_request) returning * into h;
  perform dela_audit('member', p_person, 'standing_hire', 'standing', s.id::text, jsonb_build_object('hire', h.id, 'agreement', v_ag, 'price_cents', s.price_cents));
  return jsonb_build_object('ok', true, 'hire_id', h.id, 'gig_id', v_gig, 'agreement_id', v_ag, 'attorney_person', s.created_by, 'freelancer_person', s.freelancer_person,
    'attorney_typed_name', s.attorney_typed_name, 'freelancer_typed_name', s.freelancer_typed_name);
end $$;

-- After the api signed and charged: the outcome, the 24-hour decline window and the notices (answer 23)
create or replace function dela_standing_hire_done(p_hire uuid, p_status text, p_failure text) returns jsonb language plpgsql as $$
declare h standing_hires; s standing_arrangements; v_left int;
begin
  update standing_hires set status = p_status, failure = left(coalesce(p_failure, ''), 300),
    decline_until = case when p_status in ('active', 'paying') then coalesce(decline_until, now() + make_interval(hours => dela_int_setting('standing.decline_hours', 24))) end
  where id = p_hire returning * into h;
  select * into s from standing_arrangements where id = h.arrangement_id;
  v_left := greatest(s.cap_cents - dela_standing_spend(s.id), 0);
  if p_status in ('active', 'paying') then
    perform dela_standing_notify(s, 'both', 'Repeat hire: ' || (select title from playbooks where id = h.playbook_id),
      'A job was hired from your standing arrangement for ' || dela_gig_money(h.price_cents) || '. ' || dela_gig_money(v_left) || ' of this month''s cap is left. The freelancer can decline this job within ' || dela_int_setting('standing.decline_hours', 24) || ' hours; the firm is then refunded in full.', 'hire:' || h.id);
  end if;
  return jsonb_build_object('ok', true, 'cap_left_cents', v_left);
end $$;

-- The freelancer declines one hire within the window: the engagement is canceled before work starts, refunded in full (answer 21)
create or replace function dela_standing_decline_hire(p_person uuid, p_hire uuid) returns jsonb language plpgsql as $$
declare h standing_hires; s standing_arrangements; r jsonb;
begin
  select * into h from standing_hires where id = p_hire for update;
  if h.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into s from standing_arrangements where id = h.arrangement_id;
  if s.freelancer_person <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if h.status = 'declined' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if h.decline_until is null or h.decline_until < now() then return jsonb_build_object('ok', false, 'reason', 'decline_window_over'); end if;
  if exists (select 1 from milestones where agreement_id = h.agreement_id and status in ('in_progress', 'submitted', 'accepted', 'changes_requested', 'disputed')) then return jsonb_build_object('ok', false, 'reason', 'work_started'); end if;
  r := dela_engagement_cancel(p_person, 'freelancer', h.agreement_id, 'Declined within ' || dela_int_setting('standing.decline_hours', 24) || ' hours under the standing arrangement');
  if not coalesce((r->>'ok')::boolean, false) then return r; end if;
  update standing_hires set status = 'declined', declined_at = now() where id = h.id;
  perform dela_standing_notify(s, 'attorney', 'A repeat hire was declined', 'The freelancer declined a job from your standing arrangement. It is refunded in full and does not count against this month''s cap.', 'declined:' || h.id);
  return jsonb_build_object('ok', true, 'refunds', r->'refunds');
end $$;

-- ---------- Ending, changing and approving again ----------
create or replace function dela_standing_end(p_person uuid, p_side text, p_id uuid) returns jsonb language plpgsql as $$
declare s standing_arrangements; v_role text;
begin
  select * into s from standing_arrangements where id = p_id for update;
  if s.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_standing_role(p_person, p_side, s);
  if v_role not in ('manager', 'freelancer') then return jsonb_build_object('ok', false, 'reason', case when v_role = 'user' then 'owners_and_managers_only' else 'not_found' end); end if;
  if s.status in ('ended', 'declined') then return jsonb_build_object('ok', true, 'duplicate', true, 'status', s.status); end if;
  -- No new hires from now on; it ends once the open jobs finish
  update standing_arrangements set status = case when dela_standing_open(s.id) > 0 then 'ending' else 'ended' end, ended_at = case when dela_standing_open(s.id) > 0 then null else now() end,
    ended_by = p_person, ended_reason = case when v_role = 'freelancer' then 'freelancer_ended' else 'firm_ended' end, updated_at = now()
  where id = s.id returning * into s;
  perform dela_standing_notify(s, case when v_role = 'freelancer' then 'attorney' else 'freelancer' end, 'Standing arrangement ending',
    'The standing arrangement ' || case when s.status = 'ending' then 'ends once its open jobs finish. No new jobs can be hired from it.' else 'has ended.' end, 'end');
  return jsonb_build_object('ok', true, 'status', s.status);
end $$;

-- A change to the limits needs both to sign again (answer 18): the attorney proposes, the freelancer approves
create or replace function dela_standing_change(p_person uuid, p_id uuid, p jsonb) returns jsonb language plpgsql as $$
declare s standing_arrangements; v_new jsonb;
begin
  select * into s from standing_arrangements where id = p_id for update;
  if s.id is null or dela_standing_role(p_person, 'attorney', s) <> 'manager' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if s.status not in ('active', 'needs_review') then return jsonb_build_object('ok', false, 'reason', 'standing_not_active'); end if;
  if (p->>'cap_cents')::int is null or (p->>'cap_cents')::int <= 0 then return jsonb_build_object('ok', false, 'reason', 'cap_required'); end if;
  if (p->>'price_cents')::int < dela_int_setting('engagement.minimum_cents', 25000) then return jsonb_build_object('ok', false, 'reason', 'price_too_low'); end if;
  if (p->>'price_cents')::int > (p->>'cap_cents')::int then return jsonb_build_object('ok', false, 'reason', 'price_over_cap'); end if;
  if length(trim(coalesce(p->>'typed_name', ''))) < 2 or coalesce((p->>'consent')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'sign_needs_name_and_consent'); end if;
  v_new := jsonb_build_object('price_cents', (p->>'price_cents')::int, 'cap_cents', (p->>'cap_cents')::int, 'max_open', least(greatest(coalesce((p->>'max_open')::int, s.max_open), 1), 20));
  update standing_arrangements set status = 'needs_review', pending = v_new, review_reason = 'New limits: ' || dela_gig_money((v_new->>'price_cents')::int) || ' per job, up to ' || dela_gig_money((v_new->>'cap_cents')::int) || ' a month, ' || (v_new->>'max_open') || ' jobs open at once.',
    review_attorney_ok = true, review_freelancer_ok = false, attorney_typed_name = left(trim(p->>'typed_name'), 200), attorney_signed_at = now(), updated_at = now()
  where id = s.id returning * into s;
  perform dela_standing_notify(s, 'freelancer', 'New limits to approve', s.review_reason || ' Automatic hiring is paused until you approve. Open Work to review and approve.', 'change:' || md5(v_new::text));
  return jsonb_build_object('ok', true, 'status', s.status);
end $$;

create or replace function dela_standing_review(p_person uuid, p_side text, p_id uuid, p jsonb) returns jsonb language plpgsql as $$
declare s standing_arrangements; v_role text; v_docs jsonb := '[]'; d jsonb; pb playbooks;
begin
  select * into s from standing_arrangements where id = p_id for update;
  if s.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_standing_role(p_person, p_side, s);
  if v_role not in ('manager', 'freelancer') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if s.status <> 'needs_review' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', s.status); end if;
  if coalesce((p->>'approve')::boolean, false) is not true then
    -- Not approved: a proposed change is dropped and the signed limits stay; a material change keeps hiring paused
    update standing_arrangements set pending = null, review_attorney_ok = false, review_freelancer_ok = false,
      status = case when review_reason like 'New limits:%' then 'active' else 'needs_review' end, review_reason = case when review_reason like 'New limits:%' then '' else review_reason end, updated_at = now()
    where id = s.id returning * into s;
    perform dela_standing_notify(s, case when v_role = 'freelancer' then 'attorney' else 'freelancer' end, 'Standing arrangement change not approved', 'The change was not approved. ' || case when s.status = 'active' then 'The limits you both signed still apply.' else 'Automatic hiring stays paused.' end, 'notapproved:' || now()::text);
    return jsonb_build_object('ok', true, 'status', s.status);
  end if;
  if length(trim(coalesce(p->>'typed_name', ''))) < 2 or coalesce((p->>'consent')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'sign_needs_name_and_consent'); end if;
  if v_role = 'manager' then update standing_arrangements set review_attorney_ok = true, attorney_typed_name = left(trim(p->>'typed_name'), 200), attorney_signed_at = now() where id = s.id returning * into s;
  else update standing_arrangements set review_freelancer_ok = true, freelancer_typed_name = left(trim(p->>'typed_name'), 200), freelancer_accepted_at = now() where id = s.id returning * into s; end if;
  if s.review_attorney_ok and s.review_freelancer_ok then
    -- Both approved: the documents move to their current approved versions and any new limits apply
    for d in select x from jsonb_array_elements(s.docs) x loop
      select * into pb from playbooks where id = (d->>'playbook_id')::uuid and status = 'approved' and approved_version is not null;
      if pb.id is not null then v_docs := v_docs || jsonb_build_array(jsonb_build_object('playbook_id', pb.id, 'title', pb.title, 'doc_id', pb.doc_id, 'version', pb.approved_version)); end if;
    end loop;
    if not exists (select 1 from side_profiles where person_id = s.freelancer_person and side = 'freelancer' and verification_state = 'verified') then return jsonb_build_object('ok', false, 'reason', 'freelancer_not_verified'); end if;
    update standing_arrangements set docs = v_docs, price_cents = coalesce((pending->>'price_cents')::int, price_cents), cap_cents = coalesce((pending->>'cap_cents')::int, cap_cents),
      max_open = coalesce((pending->>'max_open')::int, max_open), pending = null, review_reason = '', review_attorney_ok = false, review_freelancer_ok = false, status = 'active', updated_at = now()
    where id = s.id returning * into s;
    perform dela_standing_notify(s, 'both', 'Standing arrangement approved again', 'You both approved the standing arrangement. One-click hiring works again inside its limits.', 'approved:' || now()::text);
    return jsonb_build_object('ok', true, 'status', 'active');
  end if;
  perform dela_standing_notify(s, case when v_role = 'freelancer' then 'attorney' else 'freelancer' end, 'Standing arrangement: your approval is needed', coalesce(nullif(s.review_reason, ''), 'The arrangement changed.') || ' The other person approved. Review and approve to start one-click hiring again.', 'half:' || now()::text);
  return jsonb_build_object('ok', true, 'status', 'needs_review', 'waiting_for_other', true);
end $$;

-- ---------- What each side sees ----------
create or replace function dela_standing_list(p_person uuid, p_side text) returns jsonb language plpgsql stable as $$
declare v_org uuid := dela_side_org(p_person, p_side);
begin
  return jsonb_build_object('ok', true, 'on', dela_switch_on('auto_repeat_hiring', p_person),
    'can_create', p_side = 'attorney' and coalesce(dela_firm_role(p_person, v_org), '') in ('owner', 'manager')
      and dela_tier_rank(coalesce(dela_side_tier(p_person, 'attorney'), 'free')) >= dela_tier_rank(coalesce((select tier from plans where code = dela_setting_text('standing.min_attorney_plan', 'att_plus')), 'plus')),
    'docs', case when p_side = 'attorney' then dela_standing_docs(v_org) else '[]'::jsonb end,
    'defaults', jsonb_build_object('max_open', dela_int_setting('standing.default_open_jobs', 3), 'months', dela_int_setting('standing.default_months', 6), 'max_months', dela_int_setting('standing.max_months', 12),
      'min_price_cents', dela_int_setting('engagement.minimum_cents', 25000), 'decline_hours', dela_int_setting('standing.decline_hours', 24)),
    'arrangements', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'status', s.status, 'role', dela_standing_role(p_person, p_side, s),
        'freelancer_name', (select display_name from people where id = s.freelancer_person), 'freelancer_person', s.freelancer_person,
        'firm_name', (select coalesce(nullif(o.business_name, ''), o.name) from organizations o where o.id = s.org_id),
        'docs', s.docs, 'price_cents', s.price_cents, 'cap_cents', s.cap_cents, 'max_open', s.max_open, 'end_on', s.end_on, 'allow_firm', s.allow_firm,
        'spend_cents', dela_standing_spend(s.id), 'open', dela_standing_open(s.id), 'pending', s.pending, 'review_reason', s.review_reason,
        'review_attorney_ok', s.review_attorney_ok, 'review_freelancer_ok', s.review_freelancer_ok, 'saved_payment', s.provider_payment_method <> '',
        'hires', (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'status', h.status, 'title', pb.title, 'price_cents', h.price_cents, 'gig_id', h.gig_id, 'created_at', h.created_at,
            'decline_until', h.decline_until, 'can_decline', p_side = 'freelancer' and h.status in ('active', 'paying') and h.decline_until > now(), 'agreement_status', a.status) order by h.created_at desc), '[]')
          from (select * from standing_hires where arrangement_id = s.id order by created_at desc limit 10) h join playbooks pb on pb.id = h.playbook_id left join agreements a on a.id = h.agreement_id))
      order by s.created_at desc)
      from standing_arrangements s where (p_side = 'attorney' and s.org_id = v_org) or (p_side = 'freelancer' and s.freelancer_person = p_person)), '[]'));
end $$;

-- ---------- Hourly: endings, expiry and the monthly statement (answer 23) ----------
create or replace function dela_standing_tick() returns jsonb language plpgsql as $$
declare s standing_arrangements; v_today date := dela_monthly_today_tz(dela_tz()); v_prev date := (dela_period_start('month') - interval '1 month')::date; v_n int := 0; v_count int; v_spend int;
begin
  for s in select * from standing_arrangements where status in ('active', 'needs_review', 'ending') for update skip locked loop
    if s.status = 'ending' and dela_standing_open(s.id) = 0 then
      update standing_arrangements set status = 'ended', ended_at = now(), updated_at = now() where id = s.id;
      v_n := v_n + 1;
    elsif s.status in ('active', 'needs_review') and s.end_on < v_today then
      update standing_arrangements set status = case when dela_standing_open(s.id) > 0 then 'ending' else 'ended' end, ended_at = case when dela_standing_open(s.id) > 0 then null else now() end, ended_reason = 'expired', updated_at = now() where id = s.id;
      perform dela_standing_notify(s, 'both', 'Standing arrangement reached its end date', 'The standing arrangement reached its end date. No new jobs can be hired from it. Set up a new one to keep working this way.', 'expired');
      v_n := v_n + 1;
    end if;
    -- On the first days of a month: last month's statement for the firm
    if extract(day from v_today) <= 3 then
      select count(*), coalesce(sum(price_cents), 0) into v_count, v_spend from standing_hires where arrangement_id = s.id and status in ('signing', 'paying', 'active')
        and (created_at at time zone dela_tz())::date >= v_prev and (created_at at time zone dela_tz())::date < dela_period_start('month');
      perform dela_notify(jsonb_build_object('person_id', s.created_by, 'side', 'attorney', 'kind', 'standing', 'title', 'Standing arrangement statement for ' || to_char(v_prev, 'FMMonth YYYY'),
        'body', 'Last month you hired ' || v_count || (case when v_count = 1 then ' job' else ' jobs' end) || ' from your standing arrangement with ' || (select display_name from people where id = s.freelancer_person) || ', for ' || dela_gig_money(v_spend) || ' of the ' || dela_gig_money(s.cap_cents) || ' monthly cap.',
        'link', '/dela?tab=projects', 'dedupe_key', 'standing:' || s.id || ':statement:' || v_prev));
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'changed', v_n);
end $$;

-- ---------- The Lawfecta Team: every arrangement and its spend ----------
create or replace function dela_admin_standing(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, '{}');
  return jsonb_build_object('ok', true, 'arrangements', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'status', s.status,
      'firm', (select coalesce(nullif(o.business_name, ''), o.name) from organizations o where o.id = s.org_id), 'freelancer', (select display_name from people where id = s.freelancer_person),
      'price_cents', s.price_cents, 'cap_cents', s.cap_cents, 'spend_cents', dela_standing_spend(s.id), 'open', dela_standing_open(s.id), 'max_open', s.max_open, 'end_on', s.end_on,
      'hires', (select count(*) from standing_hires h where h.arrangement_id = s.id and h.status in ('signing', 'paying', 'active')),
      'declined', (select count(*) from standing_hires h where h.arrangement_id = s.id and h.status = 'declined')) order by s.created_at desc)
    from standing_arrangements s), '[]'));
end $$;

-- ---------- Locked down like every DELA function ----------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure::text as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'dela_standing%' or p.proname in ('dela_monthly_today_tz', 'dela_admin_standing') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

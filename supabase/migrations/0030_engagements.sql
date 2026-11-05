-- Step 6: agreements, signing, milestone funding (Stripe Connect, test mode), delivery with DELA's check, the attorney's review,
-- payouts, change orders, cancellation and refunds, disputes and chargebacks. Brief: docs/briefs/step-6-agreements-payments.md
-- (Stacey: all 18 answers as suggested, 2026-11-05). Money is in integer cents; the ledger and every signature are append-only.
-- Additive: new tables, functions, switches and settings; the Step 4 agreements table gains columns.

insert into feature_switches (key, label, gate) values
  ('engagements', 'Agreements and signing after a proposal is chosen', 'Step 6 tested'),
  ('milestone_funding', 'Milestone payments and payouts through Stripe (test mode until live_payments)', 'Step 6 tested and Stripe set up'),
  ('milestone_check', 'DELA''s check of each milestone against the agreed rubric', 'Step 6 tested'),
  ('engagement_export', 'Engagement playbook export after the first accepted milestone', 'O: exports.engagement_grant_after')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('engagement.sign_days', '14', 'Days to sign after a proposal is chosen', 'Engagement money', 'days', 'C', 'Stacey 2026-11-05 (Step 6 answer 15)', 'Then the agreement closes and the attorney can choose again.'),
  ('engagement.max_milestones', '6', 'Most milestones in one engagement', 'Engagement money', 'milestones', 'C', 'Stacey 2026-11-05 (answer 3)', ''),
  ('engagement.min_milestone_cents', '5000', 'Smallest milestone', 'Engagement money', 'cents', 'C', 'Stacey 2026-11-05 (answer 3)', ''),
  ('milestone.revisions_included', '2', 'Rounds of changes included per milestone', 'Engagement money', 'rounds', 'C', 'Stacey 2026-11-05 (answer 10)', 'After that, a change order both sign.'),
  ('milestone.review_reminder_days', '[3,6]', 'Reminders during the attorney''s review', 'Engagement money', 'days', 'C', 'Stacey 2026-11-05 (answer 9)', 'On day 7 the Lawfecta Team is told.'),
  ('payments.methods', '["card","us_bank_account"]', 'Payment methods attorneys can use', 'Engagement money', '', 'C', 'Stacey 2026-11-05 (answer 6)', 'Bank payments take about 4 business days to confirm.'),
  ('payments.currency', '"usd"', 'Currency', 'Engagement money', '', 'C', 'Decision Sheet', ''),
  ('agreement.template_version', '"draft-2026-11-05"', 'Agreement terms template version', 'Engagement money', '', 'G', 'Claude draft for counsel (answer 2)', 'Live payments stay off until a lawyer approves the template.')
on conflict (key) do nothing;

-- The milestone check and the file purpose for deliverables
do $$
declare c text;
begin
  select conname into c from pg_constraint where conrelid = 'ai_usage'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%conduct_review%';
  if c is not null then execute format('alter table ai_usage drop constraint %I', c); end if;
  alter table ai_usage add constraint ai_usage_task_check check (task in ('chat', 'file', 'voice', 'key_test', 'client_check', 'conduct_review', 'milestone_check'));
  alter table files drop constraint if exists files_purpose_check;
  alter table files add constraint files_purpose_check check (purpose in ('member', 'recording', 'profile', 'deliverable'));
end $$;

-- ---------- Agreements ----------
alter table agreements drop constraint if exists agreements_status_check;
alter table agreements add constraint agreements_status_check check (status in ('draft', 'sent', 'signing', 'signed', 'active', 'completed', 'canceled', 'disputed', 'paused'));
alter table agreements add column if not exists version int not null default 0;
alter table agreements add column if not exists sign_by timestamptz;
alter table agreements add column if not exists signed_at timestamptz;
alter table agreements add column if not exists attorney_fee_cents int;
alter table agreements add column if not exists freelancer_fee_cents int;
alter table agreements add column if not exists started_at timestamptz;
alter table agreements add column if not exists completed_at timestamptz;
alter table agreements add column if not exists canceled_at timestamptz;
alter table agreements add column if not exists cancel_reason text not null default '';
alter table agreements add column if not exists provider_customer text not null default '';
alter table agreements add column if not exists provider_payment_method text not null default '';
alter table agreements add column if not exists off_session_consent_at timestamptz;
alter table agreements add column if not exists updated_at timestamptz not null default now();

-- Every version of the agreement, kept for ever. The body holds the parties, scope, milestones, fees, rubric and terms.
create table agreement_versions (
  agreement_id uuid not null references agreements(id),
  version int not null,
  body jsonb not null,
  body_hash text not null,
  note text not null default '',
  proposed_by uuid not null references people(id),
  created_at timestamptz not null default now(),
  primary key (agreement_id, version)
);
create trigger agreement_versions_append_only before update or delete on agreement_versions for each row execute function dela_no_change();
alter table agreement_versions enable row level security;

create table agreement_signatures (
  id bigserial primary key,
  agreement_id uuid not null references agreements(id),
  version int not null,
  role text not null check (role in ('attorney', 'freelancer')),
  person_id uuid not null references people(id),
  typed_name text not null check (length(typed_name) between 2 and 200),
  body_hash text not null,
  ip text not null default '',
  user_agent text not null default '',
  signed_at timestamptz not null default now(),
  unique (agreement_id, version, role)
);
create trigger agreement_signatures_append_only before update or delete on agreement_signatures for each row execute function dela_no_change();
alter table agreement_signatures enable row level security;

-- ---------- Milestones and submissions ----------
create table milestones (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id),
  seq int not null,
  title text not null,
  amount_cents int not null check (amount_cents > 0),
  freelancer_fee_cents int not null default 0 check (freelancer_fee_cents >= 0),
  due_date date,
  deliverables text not null default '',
  status text not null default 'pending' check (status in ('pending', 'awaiting_funding', 'funded', 'in_progress', 'submitted', 'changes_requested', 'accepted', 'refunded', 'canceled', 'disputed')),
  revisions_used int not null default 0,
  funded_at timestamptz,
  started_at timestamptz,
  accepted_at timestamptz,
  from_version int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agreement_id, seq)
);
alter table milestones enable row level security;

create table milestone_submissions (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references milestones(id),
  n int not null,
  statement text not null,
  checklist jsonb not null default '[]',
  files uuid[] not null default '{}',
  status text not null default 'checking' check (status in ('checking', 'failed', 'human_review', 'with_attorney', 'accepted', 'changes_requested')),
  score numeric(5,2),
  findings jsonb not null default '[]',
  rubric jsonb not null default '[]',
  rubric_hash text not null default '',
  model text not null default '',
  review_due_at timestamptz,
  decided_at timestamptz,
  decision_note text not null default '',
  human_note text not null default '',
  request_id text not null,
  submitted_by uuid not null references people(id),
  created_at timestamptz not null default now(),
  unique (milestone_id, n),
  unique (milestone_id, request_id)
);
alter table milestone_submissions enable row level security;

create table deliverable_downloads (
  id bigserial primary key,
  submission_id uuid not null references milestone_submissions(id),
  file_id uuid not null references files(id),
  person_id uuid not null references people(id),
  at timestamptz not null default now()
);
create trigger deliverable_downloads_append_only before update or delete on deliverable_downloads for each row execute function dela_no_change();
alter table deliverable_downloads enable row level security;

-- ---------- Money ----------
create table payout_accounts (
  person_id uuid primary key references people(id),
  provider text not null default 'stripe',
  account_ref text not null default '',
  status text not null default 'none' check (status in ('none', 'pending', 'ready', 'restricted')),
  requirements jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
alter table payout_accounts enable row level security;

create table payments (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id),
  milestone_id uuid references milestones(id),
  kind text not null check (kind in ('start', 'milestone')),
  amount_cents int not null check (amount_cents > 0),
  fee_cents int not null default 0,
  status text not null default 'requires_payment' check (status in ('requires_payment', 'processing', 'succeeded', 'failed', 'canceled')),
  provider_ref text not null default '',
  checkout_url text not null default '',
  failure text not null default '',
  idem_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table payments enable row level security;

create table payouts (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references milestones(id),
  agreement_id uuid not null references agreements(id),
  person_id uuid not null references people(id),
  amount_cents int not null check (amount_cents >= 0),
  fee_cents int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'held', 'sent', 'failed')),
  held_reason text not null default '',
  provider_ref text not null default '',
  idem_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table payouts enable row level security;

create table refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id),
  agreement_id uuid not null references agreements(id),
  milestone_id uuid references milestones(id),
  amount_cents int not null check (amount_cents > 0),
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  provider_ref text not null default '',
  idem_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table refunds enable row level security;

-- The ledger: every money movement, in cents, never edited. Corrections are new entries.
create table ledger_entries (
  id bigserial primary key,
  agreement_id uuid not null references agreements(id),
  milestone_id uuid references milestones(id),
  kind text not null check (kind in ('charge', 'attorney_fee', 'freelancer_fee', 'transfer', 'refund', 'held', 'released', 'chargeback', 'chargeback_won')),
  amount_cents int not null,
  provider_ref text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);
create trigger ledger_entries_append_only before update or delete on ledger_entries for each row execute function dela_no_change();
alter table ledger_entries enable row level security;

create table disputes (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id),
  milestone_id uuid references milestones(id),
  opened_by uuid not null references people(id),
  reason text not null check (length(reason) between 1 and 4000),
  status text not null default 'notice' check (status in ('notice', 'team_review', 'resolved', 'withdrawn')),
  notice_ends_at timestamptz not null,
  release_cents int,
  refund_cents int,
  resolution_note text not null default '',
  resolved_by uuid references people(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
alter table disputes enable row level security;

create table chargebacks (
  id uuid primary key default gen_random_uuid(),
  provider_ref text not null unique,
  payment_id uuid references payments(id),
  agreement_id uuid references agreements(id),
  amount_cents int not null default 0,
  status text not null default 'open' check (status in ('open', 'won', 'lost', 'withdrawn')),
  reason text not null default '',
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table chargebacks enable row level security;

-- Stripe events, once each
create table provider_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table provider_events enable row level security;

-- ---------- Helpers ----------
create or replace function dela_agreement_role(p_person uuid, p_side text, p_agreement uuid) returns text language sql stable as $$
  select case when p_side = 'attorney' and dela_firm_role(p_person, a.attorney_org) in ('owner', 'manager') then 'attorney'
              when p_side = 'freelancer' and a.freelancer_person = p_person then 'freelancer' else '' end
  from agreements a where a.id = p_agreement
$$;

create or replace function dela_ledger(p_agreement uuid, p_milestone uuid, p_kind text, p_amount int, p_ref text, p_note text) returns void language sql as $$
  insert into ledger_entries (agreement_id, milestone_id, kind, amount_cents, provider_ref, note) values (p_agreement, p_milestone, p_kind, p_amount, coalesce(p_ref, ''), left(coalesce(p_note, ''), 300))
$$;

create or replace function dela_plan_fee_bps(p_person uuid, p_side text) returns int language sql stable as $$
  select coalesce((select pv.fee_bps from plan_versions pv where pv.id = dela_effective_version(p_person, p_side)), 500)
$$;

create or replace function dela_engagement_notify(p_agreement uuid, p_to text, p_title text, p_body text, p_key text, p_email boolean default true) returns void language plpgsql as $$
declare a agreements; g gigs; who uuid;
begin
  select * into a from agreements where id = p_agreement;
  select * into g from gigs where id = a.gig_id;
  for who in select unnest(case p_to when 'attorney' then array[a.attorney_person] when 'freelancer' then array[a.freelancer_person] else array[a.attorney_person, a.freelancer_person] end) loop
    perform dela_notify(jsonb_build_object('person_id', who, 'side', case when who = a.freelancer_person and p_to <> 'attorney' then 'freelancer' else 'attorney' end, 'kind', 'engagement', 'email', p_email, 'essential', true,
      'title', p_title || ': ' || g.title, 'body', p_body, 'link', '/dela?tab=' || case when who = a.freelancer_person then 'work' else 'projects' end || '&gig=' || g.id::text || '&view=agreement',
      'dedupe_key', 'eng:' || p_key || ':' || who::text));
  end loop;
end $$;

-- ---------- Building and changing the agreement ----------
-- The facts DELA puts in version 1 (the api writes the body; the database checks and stores it)
create or replace function dela_agreement_facts(p_person uuid, p_side text, p_agreement uuid) returns jsonb language plpgsql stable as $$
declare a agreements; g gigs; pr proposals; fa firm_profiles; ma member_profiles; mf member_profiles; pbv jsonb;
begin
  if dela_agreement_role(p_person, p_side, p_agreement) = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into a from agreements where id = p_agreement;
  select * into g from gigs where id = a.gig_id;
  select * into pr from proposals where id = a.proposal_id;
  select * into fa from firm_profiles where org_id = a.attorney_org;
  select * into ma from member_profiles where person_id = a.attorney_person and side = 'attorney';
  select * into mf from member_profiles where person_id = a.freelancer_person and side = 'freelancer';
  select body into pbv from playbook_versions where playbook_id = g.playbook_id and version = g.playbook_version;
  return jsonb_build_object('ok', true, 'version', a.version,
    'gig', jsonb_build_object('id', g.id, 'title', g.title, 'public', g.public, 'deadline', g.deadline, 'milestones', g.milestones),
    'proposal', jsonb_build_object('price_cents', pr.price_cents, 'included', pr.included, 'excluded', pr.excluded, 'schedule', pr.schedule, 'days_to_deliver', pr.days_to_deliver),
    'attorney', jsonb_build_object('firm', coalesce(nullif(ma.body->>'firm_name', ''), (select name from organizations where id = a.attorney_org)), 'signatory', coalesce(fa.body->>'signatory_name', ''),
      'notice_email', coalesce(fa.body->>'service_email', ''), 'address', coalesce(fa.body->>'billing_address', ''), 'name', (select display_name from people where id = a.attorney_person)),
    'freelancer', jsonb_build_object('name', coalesce(nullif(trim(coalesce(mf.body->>'first_name', '') || ' ' || coalesce(mf.body->>'last_name', '')), ''), (select display_name from people where id = a.freelancer_person)),
      'company', coalesce(mf.body->>'firm_name', '')),
    'checks', coalesce(pbv->'checks', '[]'),
    'fees', jsonb_build_object('attorney_bps', dela_plan_fee_bps(a.attorney_person, 'attorney'), 'freelancer_bps', dela_plan_fee_bps(a.freelancer_person, 'freelancer'),
      'floor_cents', dela_int_setting('fees.floor_cents_per_party', 1000)),
    'limits', jsonb_build_object('max_milestones', dela_int_setting('engagement.max_milestones', 6), 'min_milestone_cents', dela_int_setting('engagement.min_milestone_cents', 5000),
      'min_total_cents', dela_int_setting('engagement.minimum_cents', 25000), 'max_days', dela_int_setting('engagement.max_duration_days', 90),
      'revisions', dela_int_setting('milestone.revisions_included', 2), 'review_days', dela_int_setting('milestone.attorney_review_days', 7),
      'dispute_days', dela_int_setting('risk.dispute_notice_days', 14), 'pass_score', dela_int_setting('milestone.pass_score', 90)),
    'template_version', dela_setting_text('agreement.template_version', ''));
end $$;

-- A new version (version 1 from DELA, then proposed changes from either person). Signatures on earlier versions no longer count.
-- Once signed, a new version is a change order: the work goes on under the signed version until both sign the new one.
create or replace function dela_agreement_version_add(p_person uuid, p_side text, p_agreement uuid, p_body jsonb, p_note text, p_base int) returns jsonb language plpgsql as $$
declare a agreements; v_role text := dela_agreement_role(p_person, p_side, p_agreement); v_hash text; v_total int; v_n int; v_min int := dela_int_setting('engagement.min_milestone_cents', 5000);
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('engagements', p_person) then return jsonb_build_object('ok', false, 'reason', 'engagements_off'); end if;
  select * into a from agreements where id = p_agreement for update;
  if a.status in ('completed', 'canceled') then return jsonb_build_object('ok', false, 'reason', 'agreement_closed'); end if;
  if p_base is not null and p_base <> a.version then return jsonb_build_object('ok', false, 'reason', 'changed_elsewhere', 'version', a.version); end if;
  select count(*), coalesce(sum((m->>'amount_cents')::int), 0) into v_n, v_total from jsonb_array_elements(coalesce(p_body->'milestones', '[]')) m;
  if v_n = 0 or v_n > dela_int_setting('engagement.max_milestones', 6) then return jsonb_build_object('ok', false, 'reason', 'milestone_count', 'max', dela_int_setting('engagement.max_milestones', 6)); end if;
  if exists (select 1 from jsonb_array_elements(p_body->'milestones') m where coalesce((m->>'amount_cents')::int, 0) < v_min or coalesce(m->>'title', '') = '') then
    return jsonb_build_object('ok', false, 'reason', 'milestone_too_small', 'min_cents', v_min);
  end if;
  if v_total < dela_int_setting('engagement.minimum_cents', 25000) then return jsonb_build_object('ok', false, 'reason', 'total_too_small', 'min_cents', dela_int_setting('engagement.minimum_cents', 25000)); end if;
  if exists (select 1 from jsonb_array_elements(p_body->'milestones') m where (m->>'due_date') is not null and (m->>'due_date')::date > (now() at time zone dela_tz())::date + dela_int_setting('engagement.max_duration_days', 90)) then
    return jsonb_build_object('ok', false, 'reason', 'too_long', 'max_days', dela_int_setting('engagement.max_duration_days', 90));
  end if;
  -- In a change order, milestones already funded, submitted or accepted cannot change amount
  if a.status in ('active', 'signed') and exists (
      select 1 from milestones ms left join lateral (select m from jsonb_array_elements(p_body->'milestones') m where (m->>'seq')::int = ms.seq) x on true
      where ms.agreement_id = a.id and ms.status not in ('pending', 'awaiting_funding') and (x.m is null or (x.m->>'amount_cents')::int <> ms.amount_cents)) then
    return jsonb_build_object('ok', false, 'reason', 'paid_milestone_fixed');
  end if;
  v_hash := encode(digest(convert_to(p_body::text, 'UTF8'), 'sha256'), 'hex');
  insert into agreement_versions (agreement_id, version, body, body_hash, note, proposed_by) values (a.id, a.version + 1, p_body, v_hash, left(coalesce(p_note, ''), 300), p_person);
  update agreements set version = version + 1, status = case when status in ('draft', 'sent') then 'signing' else status end,
    sign_by = coalesce(sign_by, now() + make_interval(days => dela_int_setting('engagement.sign_days', 14))), updated_at = now()
  where id = a.id returning * into a;
  if a.version > 1 then
    perform dela_engagement_notify(a.id, case when v_role = 'attorney' then 'freelancer' else 'attorney' end, case when a.status in ('active', 'signed') then 'A change order to review' else 'Changes to the agreement' end,
      'The other person proposed a new version of the agreement' || case when coalesce(p_note, '') <> '' then ': ' || left(p_note, 200) else '' end || '. Review it and sign, or propose changes.', 'v' || a.version);
  end if;
  return jsonb_build_object('ok', true, 'version', a.version, 'hash', v_hash);
end $$;

-- Sign the current version. When both have signed it: the milestones are set from it (or, for a change order, updated),
-- the fees are fixed, and the attorney is asked to pay. Signing an older version is refused.
create or replace function dela_agreement_sign(p_person uuid, p_side text, p_agreement uuid, p jsonb) returns jsonb language plpgsql as $$
declare a agreements; av agreement_versions; v_role text := dela_agreement_role(p_person, p_side, p_agreement); v_both boolean; m jsonb; v_fee int; v_flfee int; v_left int; v_count int; v_i int := 0; v_total int; v_alloc int;
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  select * into a from agreements where id = p_agreement for update;
  if a.status in ('completed', 'canceled') then return jsonb_build_object('ok', false, 'reason', 'agreement_closed'); end if;
  if (p->>'version')::int is distinct from a.version then return jsonb_build_object('ok', false, 'reason', 'not_current_version', 'version', a.version); end if;
  if a.status in ('signing', 'draft') and a.sign_by < now() then return jsonb_build_object('ok', false, 'reason', 'sign_time_over'); end if;
  if length(trim(coalesce(p->>'typed_name', ''))) < 2 or coalesce((p->>'consent')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'sign_needs_name_and_consent'); end if;
  if v_role = 'attorney' and not coalesce((dela_attorney_eligibility(p_person)->>'can_pay')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'firm_details_missing', 'eligibility', dela_attorney_eligibility(p_person)); end if;
  select * into av from agreement_versions where agreement_id = a.id and version = a.version;
  insert into agreement_signatures (agreement_id, version, role, person_id, typed_name, body_hash, ip, user_agent)
  values (a.id, a.version, v_role, p_person, left(trim(p->>'typed_name'), 200), av.body_hash, left(coalesce(p->>'ip', ''), 80), left(coalesce(p->>'user_agent', ''), 300))
  on conflict (agreement_id, version, role) do nothing;
  v_both := (select count(distinct role) from agreement_signatures where agreement_id = a.id and version = a.version) = 2;
  if not v_both then
    perform dela_engagement_notify(a.id, case when v_role = 'attorney' then 'freelancer' else 'attorney' end, 'Your signature is needed', 'The other person signed version ' || a.version || ' of the agreement. Review it and sign.', 's' || a.version);
    return jsonb_build_object('ok', true, 'both_signed', false);
  end if;
  -- Both signed this version: fees fixed and milestones set (only milestones not yet paid change in a change order)
  select coalesce(sum((x->>'amount_cents')::int), 0), count(*) into v_total, v_count from jsonb_array_elements(av.body->'milestones') x;
  v_fee := greatest(round(v_total * (av.body->'fees'->>'attorney_bps')::int / 10000.0)::int, (av.body->'fees'->>'floor_cents')::int);
  v_flfee := least(greatest(round(v_total * (av.body->'fees'->>'freelancer_bps')::int / 10000.0)::int, (av.body->'fees'->>'floor_cents')::int), v_total);
  v_left := v_flfee;
  for m in select x from jsonb_array_elements(av.body->'milestones') x order by (x->>'seq')::int loop
    v_i := v_i + 1;
    v_alloc := case when v_i = v_count then v_left else floor(v_flfee * (m->>'amount_cents')::int / v_total::numeric)::int end;
    v_left := v_left - v_alloc;
    insert into milestones (agreement_id, seq, title, amount_cents, freelancer_fee_cents, due_date, deliverables, from_version)
    values (a.id, (m->>'seq')::int, left(m->>'title', 200), (m->>'amount_cents')::int, v_alloc, nullif(m->>'due_date', '')::date, left(coalesce(m->>'deliverables', ''), 2000), a.version)
    on conflict (agreement_id, seq) do update set title = excluded.title, amount_cents = case when milestones.status in ('pending', 'awaiting_funding') then excluded.amount_cents else milestones.amount_cents end,
      freelancer_fee_cents = case when milestones.status in ('pending', 'awaiting_funding') then excluded.freelancer_fee_cents else milestones.freelancer_fee_cents end,
      due_date = excluded.due_date, deliverables = excluded.deliverables, from_version = excluded.from_version, updated_at = now();
  end loop;
  -- Milestones a change order removed (never paid ones only) are canceled
  update milestones set status = 'canceled', updated_at = now() where agreement_id = a.id and status in ('pending', 'awaiting_funding')
    and seq not in (select (x->>'seq')::int from jsonb_array_elements(av.body->'milestones') x);
  update agreements set status = case when status in ('signing', 'draft', 'sent') then 'signed' else status end, signed_at = coalesce(signed_at, now()), total_cents = v_total,
    attorney_fee_cents = case when attorney_fee_cents is null then v_fee else attorney_fee_cents end, freelancer_fee_cents = v_flfee, milestones = av.body->'milestones', updated_at = now()
  where id = a.id returning * into a;
  perform dela_engagement_notify(a.id, 'both', case when a.version > 1 and a.started_at is not null then 'Change order signed' else 'Agreement signed' end,
    'You both signed version ' || a.version || '. ' || case when a.started_at is null then 'The attorney pays the first milestone and the platform fee; work starts when the payment is confirmed.' else 'The new version applies now.' end, 'signed' || a.version);
  return jsonb_build_object('ok', true, 'both_signed', true, 'attorney_fee_cents', a.attorney_fee_cents, 'freelancer_fee_cents', a.freelancer_fee_cents);
end $$;

-- What one person sees: the agreement, its current version, signatures, milestones, submissions and money
create or replace function dela_agreement_view(p_person uuid, p_side text, p_agreement uuid) returns jsonb language plpgsql stable as $$
declare a agreements; v_role text := dela_agreement_role(p_person, p_side, p_agreement); av agreement_versions; signed_v int;
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into a from agreements where id = p_agreement;
  select * into av from agreement_versions where agreement_id = a.id and version = a.version;
  select max(s.version) into signed_v from agreement_signatures s where s.agreement_id = a.id group by s.version having count(distinct s.role) = 2 order by s.version desc limit 1;
  return jsonb_build_object('ok', true, 'role', v_role,
    'agreement', jsonb_build_object('id', a.id, 'gig_id', a.gig_id, 'status', a.status, 'version', a.version, 'signed_version', signed_v, 'sign_by', a.sign_by, 'signed_at', a.signed_at,
      'total_cents', a.total_cents, 'attorney_fee_cents', a.attorney_fee_cents, 'freelancer_fee_cents', a.freelancer_fee_cents, 'started_at', a.started_at, 'completed_at', a.completed_at,
      'canceled_at', a.canceled_at, 'cancel_reason', a.cancel_reason, 'saved_payment', a.provider_payment_method <> '', 'gig_title', (select title from gigs where id = a.gig_id)),
    'current', case when av.agreement_id is not null then jsonb_build_object('version', av.version, 'body', av.body, 'hash', av.body_hash, 'note', av.note, 'by_me', av.proposed_by = p_person, 'created_at', av.created_at) end,
    'signatures', (select coalesce(jsonb_agg(jsonb_build_object('version', s.version, 'role', s.role, 'typed_name', s.typed_name, 'signed_at', s.signed_at) order by s.id), '[]') from agreement_signatures s where s.agreement_id = a.id),
    'versions', (select coalesce(jsonb_agg(jsonb_build_object('version', v.version, 'note', v.note, 'by_me', v.proposed_by = p_person, 'created_at', v.created_at, 'hash', v.body_hash) order by v.version), '[]') from agreement_versions v where v.agreement_id = a.id),
    'milestones', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'seq', m.seq, 'title', m.title, 'amount_cents', m.amount_cents, 'freelancer_fee_cents', m.freelancer_fee_cents,
        'payout_cents', m.amount_cents - m.freelancer_fee_cents, 'due_date', m.due_date, 'deliverables', m.deliverables, 'status', m.status, 'revisions_used', m.revisions_used, 'funded_at', m.funded_at, 'accepted_at', m.accepted_at,
        'submissions', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'n', s.n, 'status', s.status, 'score', s.score, 'findings', s.findings, 'statement', s.statement, 'review_due_at', s.review_due_at,
            'decision_note', s.decision_note, 'human_note', s.human_note, 'created_at', s.created_at,
            'files', (select coalesce(jsonb_agg(jsonb_build_object('file_id', f.id, 'name', f.name)), '[]') from files f where f.id = any(s.files))) order by s.n), '[]') from milestone_submissions s where s.milestone_id = m.id),
        'payout', (select jsonb_build_object('status', po.status, 'amount_cents', po.amount_cents, 'held_reason', po.held_reason) from payouts po where po.milestone_id = m.id order by po.created_at desc limit 1)) order by m.seq), '[]')
      from milestones m where m.agreement_id = a.id and m.status <> 'canceled'),
    'payments', case when v_role = 'attorney' then (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'kind', p.kind, 'amount_cents', p.amount_cents, 'fee_cents', p.fee_cents, 'status', p.status, 'failure', p.failure,
        'checkout_url', case when p.status in ('requires_payment', 'failed') then p.checkout_url end, 'created_at', p.created_at) order by p.created_at), '[]') from payments p where p.agreement_id = a.id) end,
    'disputes', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'status', d.status, 'reason', d.reason, 'mine', d.opened_by = p_person, 'notice_ends_at', d.notice_ends_at, 'resolution_note', d.resolution_note,
        'release_cents', d.release_cents, 'refund_cents', d.refund_cents) order by d.created_at), '[]') from disputes d where d.agreement_id = a.id),
    'payout_account', case when v_role = 'freelancer' then (select jsonb_build_object('status', pa.status, 'requirements', pa.requirements) from payout_accounts pa where pa.person_id = p_person) end,
    'limits', jsonb_build_object('revisions', dela_int_setting('milestone.revisions_included', 2), 'review_days', dela_int_setting('milestone.attorney_review_days', 7), 'pass_score', dela_int_setting('milestone.pass_score', 90)),
    'export', dela_switch_on('engagement_export', p_person) and exists (select 1 from milestones m where m.agreement_id = a.id and m.status = 'accepted'));
end $$;

create or replace function dela_agreement_for_gig(p_person uuid, p_side text, p_gig uuid) returns uuid language sql stable as $$
  select a.id from agreements a where a.gig_id = p_gig and a.status <> 'canceled' and dela_agreement_role(p_person, p_side, a.id) <> '' order by a.created_at desc limit 1
$$;

create or replace function dela_engagements(p_person uuid, p_side text) returns jsonb language sql stable as $$
  select jsonb_build_object('ok', true, 'on', dela_switch_on('engagements', p_person), 'engagements', coalesce(jsonb_agg(x order by x->>'updated_at' desc), '[]'),
    'payout_account', (select jsonb_build_object('status', pa.status, 'requirements', pa.requirements) from payout_accounts pa where pa.person_id = p_person)) from (
    select jsonb_build_object('id', a.id, 'gig_id', a.gig_id, 'gig_title', g.title, 'status', a.status, 'total_cents', a.total_cents, 'updated_at', a.updated_at, 'sign_by', a.sign_by,
      'other_name', case when p_side = 'attorney' then (select display_name from people where id = a.freelancer_person) else (select coalesce(nullif(mp.body->>'firm_name', ''), pe.display_name) from people pe left join member_profiles mp on mp.person_id = pe.id and mp.side = 'attorney' where pe.id = a.attorney_person) end,
      'milestones', (select count(*) from milestones m where m.agreement_id = a.id and m.status <> 'canceled'),
      'accepted', (select count(*) from milestones m where m.agreement_id = a.id and m.status = 'accepted'),
      'earned_cents', (select coalesce(sum(po.amount_cents), 0) from payouts po where po.agreement_id = a.id and po.status = 'sent'),
      'needs_me', case when a.status = 'signing' and not exists (select 1 from agreement_signatures s where s.agreement_id = a.id and s.version = a.version and s.person_id = p_person) then 'sign' end) x
    from agreements a join gigs g on g.id = a.gig_id where dela_agreement_role(p_person, p_side, a.id) <> '') y
$$;

-- ---------- Payments ----------
-- The next charge due: the platform fee and the first milestone together, then each next milestone. Idempotent per milestone.
create or replace function dela_payment_next(p_person uuid, p_side text, p_agreement uuid) returns jsonb language plpgsql as $$
declare a agreements; m milestones; p payments; v_kind text; v_amount int; v_fee int := 0; v_key text;
begin
  if dela_agreement_role(p_person, p_side, p_agreement) <> 'attorney' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('milestone_funding', p_person) then return jsonb_build_object('ok', false, 'reason', 'funding_off'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  select * into a from agreements where id = p_agreement for update;
  if a.status not in ('signed', 'active') then return jsonb_build_object('ok', false, 'reason', 'not_signed'); end if;
  if exists (select 1 from disputes d where d.agreement_id = a.id and d.status in ('notice', 'team_review')) then return jsonb_build_object('ok', false, 'reason', 'in_dispute'); end if;
  select * into m from milestones where agreement_id = a.id and status in ('pending', 'awaiting_funding') order by seq limit 1;
  if m.id is null then return jsonb_build_object('ok', false, 'reason', 'nothing_to_pay'); end if;
  if exists (select 1 from milestones x where x.agreement_id = a.id and x.seq < m.seq and x.status in ('funded', 'in_progress', 'submitted', 'changes_requested', 'disputed')) then
    return jsonb_build_object('ok', false, 'reason', 'previous_not_accepted');
  end if;
  v_kind := case when a.started_at is null and not exists (select 1 from payments x where x.agreement_id = a.id and x.kind = 'start' and x.status = 'succeeded') then 'start' else 'milestone' end;
  if v_kind = 'start' then v_fee := a.attorney_fee_cents; end if;
  v_amount := m.amount_cents + v_fee;
  v_key := 'pay:' || m.id::text || ':' || (select count(*) from payments x where x.milestone_id = m.id and x.status in ('failed', 'canceled'));
  select * into p from payments where idem_key = v_key;
  if p.id is null then
    insert into payments (agreement_id, milestone_id, kind, amount_cents, fee_cents, idem_key) values (a.id, m.id, v_kind, v_amount, v_fee, v_key) returning * into p;
  end if;
  return jsonb_build_object('ok', true, 'payment_id', p.id, 'status', p.status, 'amount_cents', p.amount_cents, 'fee_cents', p.fee_cents, 'kind', p.kind, 'idem_key', p.idem_key,
    'milestone', jsonb_build_object('id', m.id, 'seq', m.seq, 'title', m.title, 'amount_cents', m.amount_cents), 'checkout_url', p.checkout_url,
    'customer', a.provider_customer, 'payment_method', a.provider_payment_method, 'gig_title', (select title from gigs where id = a.gig_id), 'gig_id', a.gig_id, 'agreement_id', a.id, 'attorney_person', a.attorney_person);
end $$;

create or replace function dela_payment_ref(p_payment uuid, p_ref text, p_url text, p_status text) returns void language sql as $$
  update payments set provider_ref = coalesce(nullif(p_ref, ''), provider_ref), checkout_url = coalesce(nullif(p_url, ''), checkout_url), status = coalesce(nullif(p_status, ''), status), updated_at = now() where id = p_payment
$$;

-- Stripe told us how a payment went (by our payment id). Succeeded: the milestone is funded and work can start; failed: it waits.
create or replace function dela_payment_result(p_payment uuid, p_status text, p_ref text, p_customer text, p_method text, p_failure text) returns jsonb language plpgsql as $$
declare p payments; a agreements; m milestones;
begin
  select * into p from payments where id = p_payment for update;
  if p.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p.status = 'succeeded' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  select * into a from agreements where id = p.agreement_id for update;
  select * into m from milestones where id = p.milestone_id for update;
  if p_status = 'succeeded' then
    update payments set status = 'succeeded', provider_ref = coalesce(nullif(p_ref, ''), provider_ref), failure = '', updated_at = now() where id = p.id;
    perform dela_ledger(a.id, m.id, 'charge', p.amount_cents, p_ref, 'Paid by the attorney');
    if p.fee_cents > 0 then perform dela_ledger(a.id, null, 'attorney_fee', p.fee_cents, p_ref, 'Attorney platform fee'); end if;
    perform dela_ledger(a.id, m.id, 'held', m.amount_cents, p_ref, 'Held until the milestone is accepted');
    update milestones set status = 'funded', funded_at = now(), updated_at = now() where id = m.id and status in ('pending', 'awaiting_funding');
    update agreements set status = 'active', started_at = coalesce(started_at, now()), provider_customer = coalesce(nullif(p_customer, ''), provider_customer),
      provider_payment_method = coalesce(nullif(p_method, ''), provider_payment_method), off_session_consent_at = coalesce(off_session_consent_at, case when nullif(p_method, '') is not null then now() end), updated_at = now() where id = a.id;
    perform dela_engagement_notify(a.id, 'both', 'Milestone ' || m.seq || ' is paid', 'Milestone ' || m.seq || ' ("' || m.title || '") is paid and held by Lawfecta. The freelancer can start work on it now.', 'funded' || m.id::text);
  elsif p_status = 'processing' then
    update payments set status = 'processing', provider_ref = coalesce(nullif(p_ref, ''), provider_ref), updated_at = now() where id = p.id;
  else
    update payments set status = 'failed', failure = left(coalesce(p_failure, ''), 300), updated_at = now() where id = p.id;
    update milestones set status = 'awaiting_funding', updated_at = now() where id = m.id and status = 'pending';
    perform dela_engagement_notify(a.id, 'attorney', 'Payment did not go through', 'The payment for milestone ' || m.seq || ' did not go through' || case when coalesce(p_failure, '') <> '' then ' (' || left(p_failure, 120) || ')' else '' end || '. Open the agreement to pay again. Work on it waits until it is paid.', 'failed' || p.id::text);
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_payment_by_ref(p_ref text) returns uuid language sql stable as $$
  select id from payments where provider_ref = p_ref or id::text = p_ref limit 1
$$;

create or replace function dela_provider_event_seen(p_id text, p_type text) returns boolean language plpgsql as $$
declare v text;
begin
  insert into provider_events (id, type) values (p_id, p_type) on conflict (id) do nothing returning id into v;
  return v is null;
end $$;

-- ---------- Payout accounts ----------
create or replace function dela_payout_account(p_person uuid) returns jsonb language sql stable as $$
  select coalesce((select jsonb_build_object('status', status, 'account_ref', account_ref, 'requirements', requirements) from payout_accounts where person_id = p_person), jsonb_build_object('status', 'none', 'account_ref', ''))
$$;
create or replace function dela_payout_account_set(p_person uuid, p_ref text, p_status text, p_req jsonb) returns void language plpgsql as $$
begin
  insert into payout_accounts (person_id, account_ref, status, requirements) values (p_person, coalesce(p_ref, ''), p_status, coalesce(p_req, '[]'))
  on conflict (person_id) do update set account_ref = coalesce(nullif(excluded.account_ref, ''), payout_accounts.account_ref), status = excluded.status, requirements = excluded.requirements, updated_at = now();
  -- Payouts that waited for the account go now
  if p_status = 'ready' then update payouts set status = 'pending', held_reason = '', updated_at = now() where person_id = p_person and status = 'held' and held_reason = 'payout_account'; end if;
end $$;
create or replace function dela_payout_account_by_ref(p_ref text) returns uuid language sql stable as $$ select person_id from payout_accounts where account_ref = p_ref $$;

-- ---------- Work: start, submit, DELA's check, the attorney's decision ----------
create or replace function dela_milestone_start(p_person uuid, p_milestone uuid) returns jsonb language plpgsql as $$
declare m milestones;
begin
  select * into m from milestones where id = p_milestone for update;
  if m.id is null or dela_agreement_role(p_person, 'freelancer', m.agreement_id) <> 'freelancer' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if m.status = 'in_progress' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if m.status <> 'funded' then return jsonb_build_object('ok', false, 'reason', 'not_funded'); end if;
  update milestones set status = 'in_progress', started_at = now(), updated_at = now() where id = m.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_submission_create(p_person uuid, p_milestone uuid, p jsonb) returns jsonb language plpgsql as $$
declare m milestones; a agreements; v_n int; v_id uuid; f uuid; av agreement_versions; v_files uuid[];
begin
  select * into m from milestones where id = p_milestone for update;
  if m.id is null or dela_agreement_role(p_person, 'freelancer', m.agreement_id) <> 'freelancer' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select id into v_id from milestone_submissions where milestone_id = m.id and request_id = p->>'request_id';
  if v_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_id); end if;
  if m.status not in ('in_progress', 'changes_requested', 'funded') and not exists (select 1 from milestone_submissions s where s.milestone_id = m.id and s.status = 'failed' and s.n = (select max(n) from milestone_submissions where milestone_id = m.id)) then
    return jsonb_build_object('ok', false, 'reason', 'not_now');
  end if;
  if exists (select 1 from milestone_submissions s where s.milestone_id = m.id and s.status in ('checking', 'with_attorney', 'human_review')) then return jsonb_build_object('ok', false, 'reason', 'already_submitted'); end if;
  if length(trim(coalesce(p->>'statement', ''))) < 10 then return jsonb_build_object('ok', false, 'reason', 'statement_needed'); end if;
  v_files := array(select (x #>> '{}')::uuid from jsonb_array_elements(coalesce(p->'files', '[]')) x limit 10);
  foreach f in array v_files loop
    if not exists (select 1 from files fi where fi.id = f and fi.uploaded_by = p_person and fi.purpose = 'deliverable' and fi.status = 'ready') then return jsonb_build_object('ok', false, 'reason', 'file_not_usable'); end if;
  end loop;
  select * into a from agreements where id = m.agreement_id;
  select * into av from agreement_versions where agreement_id = a.id and version = m.from_version;
  select coalesce(max(n), 0) + 1 into v_n from milestone_submissions where milestone_id = m.id;
  insert into milestone_submissions (milestone_id, n, statement, checklist, files, rubric, rubric_hash, request_id, submitted_by)
  values (m.id, v_n, left(p->>'statement', 6000), coalesce(p->'checklist', '[]'), v_files,
    coalesce((select r from jsonb_array_elements(av.body->'rubric') r where (r->>'milestone_seq')::int = m.seq limit 1)->'criteria', av.body->'rubric_all', '[]'), av.body_hash, coalesce(p->>'request_id', gen_random_uuid()::text), p_person)
  returning id into v_id;
  update milestones set status = 'submitted', updated_at = now() where id = m.id;
  return jsonb_build_object('ok', true, 'id', v_id, 'n', v_n);
end $$;

create or replace function dela_submission_for_check(p_submission uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('id', s.id, 'n', s.n, 'statement', s.statement, 'checklist', s.checklist, 'rubric', s.rubric, 'milestone', jsonb_build_object('id', m.id, 'seq', m.seq, 'title', m.title, 'deliverables', m.deliverables),
    'files', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'text', left(coalesce(t.body, ''), 30000))), '[]') from files f left join file_texts t on t.file_id = f.id where f.id = any(s.files)),
    'agreement_id', m.agreement_id, 'person_id', s.submitted_by, 'check_on', dela_switch_on('milestone_check', s.submitted_by), 'pass_score', dela_int_setting('milestone.pass_score', 90))
  from milestone_submissions s join milestones m on m.id = s.milestone_id where s.id = p_submission
$$;

-- DELA's check result: the score is worked out by the api from the findings (code, not the AI). Pass: the attorney's 7-day review starts.
create or replace function dela_submission_checked(p_submission uuid, p_status text, p_score numeric, p_findings jsonb, p_model text) returns jsonb language plpgsql as $$
declare s milestone_submissions; m milestones; a agreements; d int; v_days int := dela_int_setting('milestone.attorney_review_days', 7);
begin
  select * into s from milestone_submissions where id = p_submission for update;
  if s.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if s.status <> 'checking' and not (s.status = 'human_review' and p_status = 'with_attorney') then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  select * into m from milestones where id = s.milestone_id;
  select * into a from agreements where id = m.agreement_id;
  update milestone_submissions set status = p_status, score = p_score, findings = coalesce(p_findings, '[]'), model = coalesce(p_model, ''),
    review_due_at = case when p_status = 'with_attorney' then now() + make_interval(days => v_days) end where id = s.id returning * into s;
  if p_status = 'with_attorney' then
    for d in select (x #>> '{}')::int from jsonb_array_elements(coalesce(dela_setting('milestone.review_reminder_days'), '[3,6]')) x loop
      perform dela_job_enqueue('engagement_tick', jsonb_build_object('submission_id', s.id, 'kind', 'review_reminder', 'day', d), now() + make_interval(days => d), 'revrem:' || s.id::text || ':' || d, a.attorney_person);
    end loop;
    perform dela_job_enqueue('engagement_tick', jsonb_build_object('submission_id', s.id, 'kind', 'review_due'), s.review_due_at, 'revdue:' || s.id::text, a.attorney_person);
    perform dela_engagement_notify(a.id, 'attorney', 'Milestone ' || m.seq || ' is ready for your review', 'The freelancer submitted milestone ' || m.seq || ' ("' || m.title || '") and it passed DELA''s check' || case when p_score is not null then ' (' || p_score || ' of 100)' else '' end || '. Please accept it or ask for changes within ' || v_days || ' days.', 'review' || s.id::text);
    perform dela_engagement_notify(a.id, 'freelancer', 'Milestone ' || m.seq || ' passed DELA''s check', 'It is with the attorney for review now.', 'passed' || s.id::text, false);
  elsif p_status = 'failed' then
    update milestones set status = 'in_progress', updated_at = now() where id = m.id;
    perform dela_engagement_notify(a.id, 'freelancer', 'Milestone ' || m.seq || ' needs more work before review', 'DELA''s check found what is missing (score ' || coalesce(p_score::text, '-') || ' of 100). Open the engagement to see each point, then submit again or ask for a human review.', 'failed' || s.id::text);
  elsif p_status = 'human_review' then
    perform dela_alert('milestones', 'A milestone needs a human review', 'DELA could not check a milestone, or the freelancer asked for a human review. See the admin Payments tab.', 'humrev:' || s.id::text);
  end if;
  return jsonb_build_object('ok', true, 'status', s.status);
end $$;

create or replace function dela_submission_human(p_person uuid, p_submission uuid) returns jsonb language plpgsql as $$
declare s milestone_submissions;
begin
  select * into s from milestone_submissions where id = p_submission for update;
  if s.id is null or s.submitted_by <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if s.status = 'human_review' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if s.status <> 'failed' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  update milestone_submissions set status = 'human_review' where id = s.id;
  update milestones set status = 'submitted', updated_at = now() where id = s.milestone_id;
  perform dela_alert('milestones', 'A freelancer asked for a human review', 'A freelancer asked for a human review of a milestone DELA''s check did not pass. Target: ' || dela_int_setting('milestone.human_review_days', 5) || ' days. See the admin Payments tab.', 'humrev:' || s.id::text);
  return jsonb_build_object('ok', true);
end $$;

-- The attorney accepts (the payout is queued and the next milestone is charged) or asks for changes (within the included rounds)
create or replace function dela_milestone_decide(p_person uuid, p_submission uuid, p_accept boolean, p_note text) returns jsonb language plpgsql as $$
declare s milestone_submissions; m milestones; a agreements; pa payout_accounts; v_payout uuid; v_next uuid; v_open int;
begin
  select * into s from milestone_submissions where id = p_submission for update;
  if s.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into m from milestones where id = s.milestone_id for update;
  if dela_agreement_role(p_person, 'attorney', m.agreement_id) <> 'attorney' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if s.status = 'accepted' and p_accept then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if s.status <> 'with_attorney' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  select * into a from agreements where id = m.agreement_id for update;
  if exists (select 1 from disputes d where d.agreement_id = a.id and d.status in ('notice', 'team_review')) then return jsonb_build_object('ok', false, 'reason', 'in_dispute'); end if;
  if p_accept then
    update milestone_submissions set status = 'accepted', decided_at = now(), decision_note = left(coalesce(p_note, ''), 2000) where id = s.id;
    update milestones set status = 'accepted', accepted_at = now(), updated_at = now() where id = m.id;
    perform dela_ledger(a.id, m.id, 'released', m.amount_cents, '', 'Accepted by the attorney');
    perform dela_ledger(a.id, m.id, 'freelancer_fee', m.freelancer_fee_cents, '', 'Freelancer platform fee');
    select * into pa from payout_accounts where person_id = a.freelancer_person;
    insert into payouts (milestone_id, agreement_id, person_id, amount_cents, fee_cents, status, held_reason, idem_key)
    values (m.id, a.id, a.freelancer_person, m.amount_cents - m.freelancer_fee_cents, m.freelancer_fee_cents, case when coalesce(pa.status, 'none') = 'ready' then 'pending' else 'held' end,
      case when coalesce(pa.status, 'none') = 'ready' then '' else 'payout_account' end, 'payout:' || m.id::text)
    on conflict (idem_key) do nothing returning id into v_payout;
    perform dela_engagement_notify(a.id, 'freelancer', 'Milestone ' || m.seq || ' accepted', 'The attorney accepted milestone ' || m.seq || '. Your payout of ' || dela_gig_money(m.amount_cents - m.freelancer_fee_cents) || ' (after the platform fee) is on its way' ||
      case when coalesce(pa.status, 'none') = 'ready' then '.' else ' as soon as you finish payout setup on the Earnings tab.' end, 'accepted' || m.id::text);
    -- The engagement playbook export unlocks after the first accepted milestone (behind its switch)
    select count(*) into v_open from milestones where agreement_id = a.id and status not in ('accepted', 'canceled', 'refunded');
    if v_open = 0 then
      update agreements set status = 'completed', completed_at = now(), updated_at = now() where id = a.id;
      perform dela_engagement_notify(a.id, 'both', 'Engagement complete', 'Every milestone is accepted. Thank you for working on Lawfecta.', 'complete' || a.id::text);
    end if;
    select id into v_next from milestones where agreement_id = a.id and status = 'pending' order by seq limit 1;
    return jsonb_build_object('ok', true, 'payout_id', v_payout, 'next_milestone', v_next, 'completed', v_open = 0, 'agreement_id', a.id);
  end if;
  if coalesce(trim(p_note), '') = '' then return jsonb_build_object('ok', false, 'reason', 'say_what_to_change'); end if;
  if m.revisions_used >= dela_int_setting('milestone.revisions_included', 2) then return jsonb_build_object('ok', false, 'reason', 'revisions_used_up', 'included', dela_int_setting('milestone.revisions_included', 2)); end if;
  update milestone_submissions set status = 'changes_requested', decided_at = now(), decision_note = left(p_note, 2000) where id = s.id;
  update milestones set status = 'changes_requested', revisions_used = revisions_used + 1, updated_at = now() where id = m.id;
  perform dela_engagement_notify(a.id, 'freelancer', 'Changes requested on milestone ' || m.seq, 'The attorney asked for changes: ' || left(p_note, 300), 'changes' || s.id::text);
  return jsonb_build_object('ok', true, 'revisions_left', dela_int_setting('milestone.revisions_included', 2) - m.revisions_used - 1);
end $$;

create or replace function dela_payout_result(p_payout uuid, p_status text, p_ref text, p_reason text) returns void language plpgsql as $$
declare po payouts;
begin
  select * into po from payouts where id = p_payout for update;
  if po.id is null or po.status = 'sent' then return; end if;
  update payouts set status = p_status, provider_ref = coalesce(nullif(p_ref, ''), provider_ref), held_reason = case when p_status = 'held' then left(coalesce(p_reason, ''), 200) else held_reason end, updated_at = now() where id = po.id;
  if p_status = 'sent' then perform dela_ledger(po.agreement_id, po.milestone_id, 'transfer', -po.amount_cents, p_ref, 'Paid to the freelancer'); end if;
end $$;

create or replace function dela_payouts_due() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', po.id, 'amount_cents', po.amount_cents, 'idem_key', po.idem_key, 'account_ref', pa.account_ref, 'agreement_id', po.agreement_id)), '[]')
  from payouts po join payout_accounts pa on pa.person_id = po.person_id and pa.status = 'ready'
  where po.status = 'pending' and not exists (select 1 from disputes d where d.agreement_id = po.agreement_id and d.status in ('notice', 'team_review'))
    and not exists (select 1 from agreements a where a.id = po.agreement_id and a.status = 'paused')
$$;

-- ---------- Cancellation and refunds (Stacey answer 12) ----------
create or replace function dela_engagement_cancel(p_person uuid, p_side text, p_agreement uuid, p_reason text) returns jsonb language plpgsql as $$
declare a agreements; v_role text := dela_agreement_role(p_person, p_side, p_agreement); v_started boolean; p payments; m milestones; v_n int := 0;
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into a from agreements where id = p_agreement for update;
  if a.status = 'canceled' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if a.status = 'completed' then return jsonb_build_object('ok', false, 'reason', 'agreement_closed'); end if;
  if coalesce(trim(p_reason), '') = '' then return jsonb_build_object('ok', false, 'reason', 'say_why'); end if;
  if exists (select 1 from milestones x where x.agreement_id = a.id and x.status = 'submitted') then return jsonb_build_object('ok', false, 'reason', 'under_review_open_dispute'); end if;
  if exists (select 1 from disputes d where d.agreement_id = a.id and d.status in ('notice', 'team_review')) then return jsonb_build_object('ok', false, 'reason', 'in_dispute'); end if;
  -- Work started: the freelancer started a milestone, or any milestone was submitted or accepted
  v_started := exists (select 1 from milestones x where x.agreement_id = a.id and (x.started_at is not null or x.status in ('accepted', 'changes_requested')));
  for p in select * from payments where agreement_id = a.id and status = 'succeeded' loop
    select * into m from milestones where id = p.milestone_id;
    if m.status in ('funded', 'in_progress') then
      insert into refunds (payment_id, agreement_id, milestone_id, amount_cents, reason, idem_key)
      values (p.id, a.id, m.id, m.amount_cents + case when not v_started then p.fee_cents else 0 end, 'Canceled: ' || left(p_reason, 200), 'refund:' || p.id::text)
      on conflict (idem_key) do nothing;
      update milestones set status = 'refunded', updated_at = now() where id = m.id;
      v_n := v_n + 1;
    end if;
  end loop;
  update milestones set status = 'canceled', updated_at = now() where agreement_id = a.id and status in ('pending', 'awaiting_funding');
  update payments set status = 'canceled', updated_at = now() where agreement_id = a.id and status in ('requires_payment', 'failed');
  update agreements set status = 'canceled', canceled_at = now(), cancel_reason = left(p_reason, 500), updated_at = now() where id = a.id;
  perform dela_engagement_notify(a.id, case when v_role = 'attorney' then 'freelancer' else 'attorney' end, 'Engagement canceled', 'The engagement was canceled: ' || left(p_reason, 300) || '. Accepted milestones stay paid; paid milestones not yet submitted are refunded to the attorney.', 'cancel' || a.id::text);
  return jsonb_build_object('ok', true, 'refunds', v_n, 'fee_refunded', not v_started);
end $$;

create or replace function dela_refunds_due() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'amount_cents', r.amount_cents, 'idem_key', r.idem_key, 'payment_ref', p.provider_ref)), '[]')
  from refunds r join payments p on p.id = r.payment_id where r.status = 'pending'
$$;

create or replace function dela_refund_result(p_refund uuid, p_status text, p_ref text) returns void language plpgsql as $$
declare r refunds;
begin
  select * into r from refunds where id = p_refund for update;
  if r.id is null or r.status = 'succeeded' then return; end if;
  update refunds set status = p_status, provider_ref = coalesce(nullif(p_ref, ''), provider_ref), updated_at = now() where id = r.id;
  if p_status = 'succeeded' then perform dela_ledger(r.agreement_id, r.milestone_id, 'refund', -r.amount_cents, p_ref, r.reason); end if;
end $$;

-- ---------- Disputes (14-day notice, then the Lawfecta Team) ----------
create or replace function dela_dispute_open(p_person uuid, p_side text, p_agreement uuid, p_milestone uuid, p_reason text) returns jsonb language plpgsql as $$
declare a agreements; v_id uuid;
begin
  if dela_agreement_role(p_person, p_side, p_agreement) = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if coalesce(trim(p_reason), '') = '' then return jsonb_build_object('ok', false, 'reason', 'say_why'); end if;
  select * into a from agreements where id = p_agreement for update;
  if a.status not in ('active', 'signed', 'paused') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  select id into v_id from disputes where agreement_id = a.id and status in ('notice', 'team_review');
  if v_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_id); end if;
  insert into disputes (agreement_id, milestone_id, opened_by, reason, notice_ends_at) values (a.id, p_milestone, p_person, left(p_reason, 4000), now() + make_interval(days => dela_int_setting('risk.dispute_notice_days', 14))) returning id into v_id;
  update milestones set status = 'disputed', updated_at = now() where id = p_milestone and agreement_id = a.id and status in ('submitted', 'changes_requested', 'in_progress', 'funded');
  perform dela_job_enqueue('engagement_tick', jsonb_build_object('dispute_id', v_id, 'kind', 'dispute_notice_end'), now() + make_interval(days => dela_int_setting('risk.dispute_notice_days', 14)), 'dispend:' || v_id::text, p_person);
  perform dela_engagement_notify(a.id, 'both', 'A dispute was opened', 'A dispute was opened on this engagement: ' || left(p_reason, 300) || '. For ' || dela_int_setting('risk.dispute_notice_days', 14) || ' days you can talk it through in Messages; the money in question stays held. After that the Lawfecta Team reviews it. Lawfecta is not a court or an arbitrator.', 'dispute' || v_id::text);
  perform dela_alert('disputes', 'A dispute was opened', 'A dispute was opened on an engagement. The 14-day notice period runs first.', 'dispute:' || v_id::text);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function dela_dispute_withdraw(p_person uuid, p_dispute uuid) returns jsonb language plpgsql as $$
declare d disputes;
begin
  select * into d from disputes where id = p_dispute for update;
  if d.id is null or d.opened_by <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if d.status not in ('notice', 'team_review') then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update disputes set status = 'withdrawn', resolved_at = now() where id = d.id;
  update milestones set status = case when exists (select 1 from milestone_submissions s where s.milestone_id = milestones.id and s.status = 'with_attorney') then 'submitted' else 'in_progress' end, updated_at = now()
  where id = d.milestone_id and status = 'disputed';
  perform dela_engagement_notify(d.agreement_id, 'both', 'The dispute was withdrawn', 'The dispute was withdrawn and the engagement goes on.', 'dispwd' || d.id::text, false);
  return jsonb_build_object('ok', true);
end $$;

-- The team decides how the held money of the disputed milestone goes: to the freelancer, back to the attorney, or split
create or replace function dela_admin_dispute_resolve(p_actor uuid, p_dispute uuid, p_release int, p_refund int, p_note text) returns jsonb language plpgsql as $$
declare d disputes; m milestones; a agreements; p payments;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'finance', 'support']);
  select * into d from disputes where id = p_dispute for update;
  if d.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if d.status = 'resolved' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if d.status = 'notice' and d.notice_ends_at > now() then return jsonb_build_object('ok', false, 'reason', 'notice_not_over', 'notice_ends_at', d.notice_ends_at); end if;
  if coalesce(trim(p_note), '') = '' then return jsonb_build_object('ok', false, 'reason', 'say_why'); end if;
  select * into a from agreements where id = d.agreement_id;
  select * into m from milestones where id = d.milestone_id;
  if m.id is not null and coalesce(p_release, 0) + coalesce(p_refund, 0) <> m.amount_cents then return jsonb_build_object('ok', false, 'reason', 'split_must_equal', 'amount_cents', m.amount_cents); end if;
  update disputes set status = 'resolved', release_cents = p_release, refund_cents = p_refund, resolution_note = left(p_note, 2000), resolved_by = p_actor, resolved_at = now() where id = d.id;
  if m.id is not null then
    if coalesce(p_release, 0) > 0 then
      perform dela_ledger(a.id, m.id, 'released', p_release, '', 'Released after the Lawfecta Team''s review');
      insert into payouts (milestone_id, agreement_id, person_id, amount_cents, fee_cents, status, held_reason, idem_key)
      values (m.id, a.id, a.freelancer_person, greatest(p_release - round(m.freelancer_fee_cents * p_release::numeric / m.amount_cents)::int, 0), round(m.freelancer_fee_cents * p_release::numeric / m.amount_cents)::int,
        case when exists (select 1 from payout_accounts pa where pa.person_id = a.freelancer_person and pa.status = 'ready') then 'pending' else 'held' end,
        case when exists (select 1 from payout_accounts pa where pa.person_id = a.freelancer_person and pa.status = 'ready') then '' else 'payout_account' end, 'payout:' || m.id::text || ':dispute')
      on conflict (idem_key) do nothing;
    end if;
    if coalesce(p_refund, 0) > 0 then
      select * into p from payments where milestone_id = m.id and status = 'succeeded' limit 1;
      if p.id is not null then insert into refunds (payment_id, agreement_id, milestone_id, amount_cents, reason, idem_key) values (p.id, a.id, m.id, p_refund, 'Dispute decision', 'refund:' || p.id::text || ':dispute') on conflict (idem_key) do nothing; end if;
    end if;
    update milestones set status = case when coalesce(p_release, 0) > 0 then 'accepted' else 'refunded' end, accepted_at = case when coalesce(p_release, 0) > 0 then now() end, updated_at = now() where id = m.id;
  end if;
  perform dela_audit('staff', p_actor, 'dispute_resolved', 'dispute', d.id::text, jsonb_build_object('release_cents', p_release, 'refund_cents', p_refund));
  perform dela_engagement_notify(a.id, 'both', 'The dispute is decided', 'The Lawfecta Team reviewed the dispute: ' || left(p_note, 300) || '. ' || dela_gig_money(coalesce(p_release, 0)) || ' goes to the freelancer and ' || dela_gig_money(coalesce(p_refund, 0)) || ' back to the attorney.', 'dispdone' || d.id::text);
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Chargebacks (Decision Sheet: first lost = manual reinstatement review; second = termination review) ----------
create or replace function dela_chargeback_event(p_ref text, p_payment_ref text, p_status text, p_amount int, p_reason text) returns jsonb language plpgsql as $$
declare c chargebacks; p payments; a agreements; v_lost int;
begin
  select * into p from payments where provider_ref = p_payment_ref limit 1;
  select * into a from agreements where id = p.agreement_id;
  insert into chargebacks (provider_ref, payment_id, agreement_id, amount_cents, status, reason) values (p_ref, p.id, a.id, coalesce(p_amount, 0), 'open', left(coalesce(p_reason, ''), 200))
  on conflict (provider_ref) do nothing;
  select * into c from chargebacks where provider_ref = p_ref for update;
  if p_status = 'open' then
    if a.id is not null and a.status in ('active', 'signed') then update agreements set status = 'paused', updated_at = now() where id = a.id; end if;
    if a.id is not null then perform dela_ledger(a.id, p.milestone_id, 'chargeback', -coalesce(p_amount, 0), p_ref, 'Card holder disputed the charge'); end if;
    perform dela_alert('payments', 'A chargeback was opened', 'A card holder disputed a charge with their bank. The engagement is paused. Decide whether to contest it before Stripe''s deadline (admin Payments tab).', 'cb:' || p_ref);
    if a.id is not null then perform dela_engagement_notify(a.id, 'both', 'Payment under review', 'A payment on this engagement is under review with the bank, so the engagement is paused. The Lawfecta Team will be in touch. You can still read everything and send messages.', 'cbpause' || p_ref); end if;
  elsif p_status in ('won', 'lost', 'withdrawn') and c.status = 'open' then
    update chargebacks set status = p_status, updated_at = now() where id = c.id;
    if p_status = 'won' and a.id is not null then perform dela_ledger(a.id, p.milestone_id, 'chargeback_won', coalesce(p_amount, c.amount_cents), p_ref, 'Chargeback won'); end if;
    if p_status = 'lost' and a.id is not null then
      select count(*) into v_lost from chargebacks x join agreements y on y.id = x.agreement_id where y.attorney_person = a.attorney_person and x.status = 'lost';
      insert into holds (scope_type, scope_id, rule, reason, severity) values ('person', a.attorney_person::text, case when v_lost >= 2 then 'second_chargeback' else 'first_lost_chargeback' end,
        case when v_lost >= 2 then 'Second lost chargeback: termination review' else 'First lost chargeback: manual reinstatement review' end, case when v_lost >= 2 then 'critical' else 'high' end);
      perform dela_alert('payments', case when v_lost >= 2 then 'Second lost chargeback' else 'A chargeback was lost' end, case when v_lost >= 2 then 'An attorney has a second lost chargeback. A termination review is needed.' else 'A chargeback was lost. The attorney is on hold for a manual reinstatement review.' end, 'cblost:' || p_ref);
    end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- The worker ----------
create or replace function dela_engagement_tick(p jsonb) returns jsonb language plpgsql as $$
declare s milestone_submissions; m milestones; a agreements; d disputes;
begin
  if p ? 'submission_id' then
    select * into s from milestone_submissions where id = (p->>'submission_id')::uuid;
    if s.id is null or s.status <> 'with_attorney' then return jsonb_build_object('ok', true, 'skipped', true); end if;
    select * into m from milestones where id = s.milestone_id;
    select * into a from agreements where id = m.agreement_id;
    if p->>'kind' = 'review_reminder' then
      perform dela_engagement_notify(a.id, 'attorney', 'Reminder: review milestone ' || m.seq, 'Milestone ' || m.seq || ' ("' || m.title || '") is waiting for your review. Please accept it or ask for changes by ' || to_char(s.review_due_at at time zone dela_tz(), 'FMMon FMDD') || '.', 'revrem' || s.id::text || ':' || (p->>'day'));
    elsif p->>'kind' = 'review_due' then
      -- Silence never pays out while administrative acceptance is off (G); the Lawfecta Team is told
      perform dela_alert('milestones', 'A milestone review is overdue', 'An attorney has not reviewed a milestone within ' || dela_int_setting('milestone.attorney_review_days', 7) || ' days. Contact them (admin Payments tab).', 'revdue:' || s.id::text);
    end if;
  elsif p ? 'dispute_id' then
    select * into d from disputes where id = (p->>'dispute_id')::uuid;
    if d.status = 'notice' then
      update disputes set status = 'team_review' where id = d.id;
      perform dela_alert('disputes', 'A dispute is ready for review', 'The 14-day notice period ended. The Lawfecta Team reviews the dispute now.', 'dispready:' || d.id::text);
    end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Every day: close agreements not signed in time (the attorney can choose again), and tell the team about money waiting too long
create or replace function dela_engagements_daily() returns jsonb language plpgsql as $$
declare a agreements; n_closed int := 0; m record;
begin
  for a in select * from agreements where status in ('draft', 'sent', 'signing') and sign_by < now() for update loop
    update agreements set status = 'canceled', canceled_at = now(), cancel_reason = 'not_signed_in_time', updated_at = now() where id = a.id;
    update proposals set status = 'sent', updated_at = now() where id = a.proposal_id and status = 'selected';
    update gigs set status = 'closed', closed_at = now(), updated_at = now() where id = a.gig_id and status = 'filled';
    perform dela_engagement_notify(a.id, 'both', 'The agreement was not signed in time', 'The agreement was not signed within ' || dela_int_setting('engagement.sign_days', 14) || ' days, so it closed. The attorney can choose a proposal again for ' || dela_int_setting('gig.proposals_actionable_days', 7) || ' days.', 'unsigned' || a.id::text);
    n_closed := n_closed + 1;
  end loop;
  for m in select ms.id from milestones ms where ms.status in ('funded', 'in_progress', 'submitted', 'changes_requested') and ms.funded_at < now() - make_interval(days => dela_int_setting('engagement.max_unreleased_days', 45)) loop
    perform dela_alert('payments', 'Money held for a long time', 'A paid milestone has waited more than ' || dela_int_setting('engagement.max_unreleased_days', 45) || ' days without being accepted. Review it (admin Payments tab).', 'unrel:' || m.id::text);
  end loop;
  return jsonb_build_object('ok', true, 'closed', n_closed);
end $$;

-- Daily match with the provider: the api compares each payment's state with Stripe and records differences here
create or replace function dela_payments_to_match() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'provider_ref', p.provider_ref, 'status', p.status, 'amount_cents', p.amount_cents)), '[]')
  from payments p where p.provider_ref like 'pi_%' and p.updated_at > now() - interval '45 days'
$$;

-- ---------- Admin ----------
create or replace function dela_admin_payments(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'finance', 'support']);
  return jsonb_build_object(
    'live_payments', (select state from feature_switches where key = 'live_payments'),
    'switches', (select jsonb_object_agg(key, state) from feature_switches where key in ('engagements', 'milestone_funding', 'milestone_check', 'admin_acceptance_timeout', 'engagement_export', 'recurring_engagements')),
    'totals', jsonb_build_object(
      'charged', (select coalesce(sum(amount_cents), 0) from ledger_entries where kind = 'charge'),
      'attorney_fees', (select coalesce(sum(amount_cents), 0) from ledger_entries where kind = 'attorney_fee'),
      'freelancer_fees', (select coalesce(sum(amount_cents), 0) from ledger_entries where kind = 'freelancer_fee'),
      'paid_out', (select coalesce(-sum(amount_cents), 0) from ledger_entries where kind = 'transfer'),
      'refunded', (select coalesce(-sum(amount_cents), 0) from ledger_entries where kind = 'refund'),
      'held_now', (select coalesce(sum(m.amount_cents), 0) from milestones m where m.status in ('funded', 'in_progress', 'submitted', 'changes_requested', 'disputed'))),
    'engagements', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'gig_title', g.title, 'status', a.status, 'total_cents', a.total_cents, 'attorney', pa.display_name, 'freelancer', pf.display_name, 'updated_at', a.updated_at) order by a.updated_at desc), '[]')
      from agreements a join gigs g on g.id = a.gig_id join people pa on pa.id = a.attorney_person join people pf on pf.id = a.freelancer_person where a.updated_at > now() - interval '60 days'),
    'waiting_payment', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'gig_title', g.title, 'amount_cents', p.amount_cents, 'status', p.status, 'failure', p.failure, 'created_at', p.created_at)), '[]')
      from payments p join agreements a on a.id = p.agreement_id join gigs g on g.id = a.gig_id where p.status in ('failed', 'processing', 'requires_payment') and p.created_at > now() - interval '30 days'),
    'payouts_held', (select coalesce(jsonb_agg(jsonb_build_object('id', po.id, 'amount_cents', po.amount_cents, 'reason', po.held_reason, 'freelancer', pe.display_name)), '[]') from payouts po join people pe on pe.id = po.person_id where po.status in ('held', 'failed')),
    'human_reviews', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'gig_title', g.title, 'milestone', m.title, 'seq', m.seq, 'score', s.score, 'findings', s.findings, 'statement', left(s.statement, 600), 'created_at', s.created_at) order by s.created_at), '[]')
      from milestone_submissions s join milestones m on m.id = s.milestone_id join agreements a on a.id = m.agreement_id join gigs g on g.id = a.gig_id where s.status = 'human_review'),
    'overdue_reviews', (select coalesce(jsonb_agg(jsonb_build_object('gig_title', g.title, 'seq', m.seq, 'due', s.review_due_at, 'attorney', pe.display_name)), '[]')
      from milestone_submissions s join milestones m on m.id = s.milestone_id join agreements a on a.id = m.agreement_id join gigs g on g.id = a.gig_id join people pe on pe.id = a.attorney_person where s.status = 'with_attorney' and s.review_due_at < now()),
    'disputes', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'gig_title', g.title, 'status', d.status, 'reason', d.reason, 'notice_ends_at', d.notice_ends_at, 'opened_by', pe.display_name,
        'milestone_amount_cents', (select amount_cents from milestones where id = d.milestone_id), 'milestone', (select title from milestones where id = d.milestone_id)) order by d.created_at), '[]')
      from disputes d join agreements a on a.id = d.agreement_id join gigs g on g.id = a.gig_id join people pe on pe.id = d.opened_by where d.status in ('notice', 'team_review')),
    'chargebacks', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'status', c.status, 'amount_cents', c.amount_cents, 'reason', c.reason, 'created_at', c.created_at)), '[]') from chargebacks c where c.status = 'open'),
    'long_held', (select coalesce(jsonb_agg(jsonb_build_object('gig_title', g.title, 'seq', m.seq, 'amount_cents', m.amount_cents, 'funded_at', m.funded_at)), '[]')
      from milestones m join agreements a on a.id = m.agreement_id join gigs g on g.id = a.gig_id where m.status in ('funded', 'in_progress', 'submitted', 'changes_requested') and m.funded_at < now() - make_interval(days => dela_int_setting('engagement.max_unreleased_days', 45))),
    'ledger', (select coalesce(jsonb_agg(jsonb_build_object('kind', l.kind, 'amount_cents', l.amount_cents, 'note', l.note, 'created_at', l.created_at, 'gig_title', g.title) order by l.id desc), '[]')
      from (select * from ledger_entries order by id desc limit 50) l join agreements a on a.id = l.agreement_id join gigs g on g.id = a.gig_id));
end $$;

create or replace function dela_admin_submission_decide(p_actor uuid, p_submission uuid, p_pass boolean, p_note text) returns jsonb language plpgsql as $$
declare s milestone_submissions;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  select * into s from milestone_submissions where id = p_submission for update;
  if s.id is null or s.status <> 'human_review' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if coalesce(trim(p_note), '') = '' then return jsonb_build_object('ok', false, 'reason', 'say_why'); end if;
  update milestone_submissions set human_note = left(p_note, 2000) where id = s.id;
  perform dela_audit('staff', p_actor, 'human_review', 'submission', s.id::text, jsonb_build_object('pass', p_pass));
  if p_pass then return dela_submission_checked(s.id, 'with_attorney', s.score, s.findings, s.model); end if;
  update milestone_submissions set status = 'failed' where id = s.id;
  update milestones set status = 'in_progress', updated_at = now() where id = s.milestone_id;
  perform dela_engagement_notify((select agreement_id from milestones where id = s.milestone_id), 'freelancer', 'The human review is done', 'A reviewer looked at your milestone: ' || left(p_note, 300) || '. Submit again when it is ready.', 'humdone' || s.id::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_deliverable_get(p_person uuid, p_side text, p_submission uuid, p_file uuid) returns jsonb language plpgsql as $$
declare s milestone_submissions; m milestones; f files;
begin
  select * into s from milestone_submissions where id = p_submission;
  select * into m from milestones where id = s.milestone_id;
  if s.id is null or dela_agreement_role(p_person, p_side, m.agreement_id) = '' or not (p_file = any(s.files)) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into f from files where id = p_file and status = 'ready';
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  insert into deliverable_downloads (submission_id, file_id, person_id) values (s.id, f.id, p_person);
  return jsonb_build_object('ok', true, 'path', f.storage_path, 'name', f.name);
end $$;

-- The daily jobs include engagements
create or replace function dela_maybe_queue_daily() returns void language plpgsql as $$
declare local timestamp := now() at time zone dela_tz();
begin
  if extract(hour from local) >= 8 then
    perform dela_job_enqueue('daily_summary', '{}', now(), 'daily:' || local::date);
    perform dela_job_enqueue('playbooks_daily', '{}', now(), 'playbooks_daily:' || local::date);
    perform dela_job_enqueue('recordings_daily', '{}', now(), 'recordings_daily:' || local::date);
    perform dela_job_enqueue('profiles_daily', '{}', now(), 'profiles_daily:' || local::date);
  end if;
  perform dela_job_enqueue('files_sweep', '{}', now(), 'files_sweep:' || local::date);
  perform dela_job_enqueue('ai_key_reminders', '{}', now(), 'ai_key_reminders:' || local::date);
  -- Step 6: unsigned agreements, long-held money, payouts and refunds to send, and the daily match with Stripe
  perform dela_job_enqueue('engagements_daily', '{}', now(), 'engagements_daily:' || local::date);
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

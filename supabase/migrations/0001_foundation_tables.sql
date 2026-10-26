-- DELA foundation tables (Step 1).
-- Every table has row level security on and no policies: only the api Edge Function (service role) reaches them.
-- Money is integer cents. History tables are append-only.

create extension if not exists pgcrypto;

-- ---------- People, organizations, sides ----------

create table people (
  id uuid primary key default gen_random_uuid(),
  bd_member_id bigint not null unique check (bd_member_id > 0),
  display_name text not null default '',
  email text not null default '',
  status text not null default 'active' check (status in ('active', 'restricted', 'closed')),
  auth_version int not null default 1,
  registered_at timestamptz, -- BD sign up date, from the pass
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('attorney_personal', 'freelancer_personal', 'firm', 'agency')),
  name text not null default '',
  owner_person_id uuid not null references people(id),
  status text not null default 'active' check (status in ('active', 'restricted', 'closed')),
  created_at timestamptz not null default now()
);
create unique index organizations_one_personal on organizations (owner_person_id, kind) where kind in ('attorney_personal', 'freelancer_personal');

create table org_members (
  org_id uuid not null references organizations(id),
  person_id uuid not null references people(id),
  member_role text not null check (member_role in ('owner', 'manager', 'member')),
  status text not null default 'active' check (status in ('active', 'invited', 'removed')),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  primary key (org_id, person_id)
);

-- ---------- Plans and entitlements ----------

create table plans (
  code text primary key,
  side text not null check (side in ('attorney', 'freelancer')),
  tier text not null check (tier in ('free', 'plus', 'pro', 'business')),
  name text not null,
  bd_plan_id bigint unique,
  sort int not null default 0,
  unique (side, tier)
);

create table plan_versions (
  id bigserial primary key,
  plan_code text not null references plans(code),
  version int not null,
  monthly_cents int not null check (monthly_cents >= 0),
  annual_cents int check (annual_cents >= 0),
  fee_bps int not null check (fee_bps between 0 and 5000),
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  effective_from timestamptz,
  approved_by uuid references people(id),
  approved_at timestamptz,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (plan_code, version)
);
create unique index plan_versions_one_approved on plan_versions (plan_code) where status = 'approved';

create table features (
  key text primary key,
  side text not null check (side in ('attorney', 'freelancer', 'both')),
  label text not null,
  unit text not null default '',
  period text not null default 'none' check (period in ('none', 'month')),
  kind text not null check (kind in ('quota', 'flag')),
  status text not null default 'O',
  source text not null default '',
  note text not null default ''
);

create table plan_features (
  plan_version_id bigint not null references plan_versions(id),
  feature_key text not null references features(key),
  enabled boolean not null default true,
  quota_limit int check (quota_limit >= 0), -- null means no cap
  primary key (plan_version_id, feature_key)
);

create table side_profiles (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  org_id uuid not null references organizations(id),
  plan_code text not null references plans(code),
  plan_source text not null check (plan_source in ('bd', 'staff_grant')),
  status text not null default 'active' check (status in ('active', 'restricted', 'closed')),
  verification_state text not null default 'not_started' check (verification_state in ('not_started', 'pending', 'verified', 'rejected', 'expired', 'not_required')),
  readiness_state text not null default 'incomplete' check (readiness_state in ('incomplete', 'verification_pending', 'match_ready', 'availability_stale', 'unavailable', 'restricted', 'not_applicable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, side)
);

-- ---------- Lawfecta Team and access ----------

create table staff_roles (
  id bigserial primary key,
  person_id uuid not null references people(id),
  role text not null check (role in ('owner', 'reviewer', 'support', 'finance')),
  granted_by uuid references people(id),
  granted_at timestamptz not null default now(),
  revoked_by uuid references people(id),
  revoked_at timestamptz
);
create unique index staff_roles_active on staff_roles (person_id, role) where revoked_at is null;

-- channel access: may open this copy of DELA. channel staging_tester: a test account that the Live copy sends to Staging.
create table access_list (
  id bigserial primary key,
  bd_member_id bigint not null check (bd_member_id > 0),
  channel text not null check (channel in ('access', 'staging_tester')),
  note text not null default '',
  granted_by uuid references people(id),
  granted_at timestamptz not null default now(),
  revoked_by uuid references people(id),
  revoked_at timestamptz
);
create unique index access_list_active on access_list (bd_member_id, channel) where revoked_at is null;

create table sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  person_id uuid not null references people(id),
  side text check (side in ('attorney', 'freelancer')),
  auth_version int not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz not null default now(),
  revoked_at timestamptz,
  ip text not null default '',
  user_agent text not null default ''
);
create index sessions_person on sessions (person_id) where revoked_at is null;

-- One-use BD sign in passes: a pass can be exchanged once
create table used_passes (
  jti text primary key,
  used_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- ---------- Settings, switches, decisions ----------

create table settings (
  key text primary key,
  value jsonb not null,
  label text not null default '',
  section text not null default '',
  unit text not null default '',
  status text not null default 'O' check (status in ('C', 'R', 'O', 'G')),
  source text not null default '',
  note text not null default '',
  version int not null default 1,
  updated_by uuid references people(id),
  updated_at timestamptz not null default now()
);

create table settings_history (
  id bigserial primary key,
  key text not null,
  old_value jsonb,
  new_value jsonb not null,
  old_status text,
  new_status text not null,
  changed_by uuid references people(id),
  changed_at timestamptz not null default now(),
  reason text not null default ''
);

create table feature_switches (
  key text primary key,
  label text not null,
  gate text not null default '',
  state text not null default 'off' check (state in ('off', 'staff', 'list', 'everyone')),
  updated_by uuid references people(id),
  updated_at timestamptz not null default now()
);

-- The Program Guide's required record for each decision
create table decision_log (
  id bigserial primary key,
  decision_id text not null,
  status text not null check (status in ('C', 'R', 'O', 'G')),
  owner text not null default 'Stacey',
  approved_at timestamptz,
  version text not null default '',
  supersedes bigint references decision_log(id),
  value jsonb,
  affected_requirement_ids text[] not null default '{}',
  release_gate text not null default '',
  evidence_reference text not null default '',
  note text not null default '',
  recorded_by uuid references people(id),
  recorded_at timestamptz not null default now()
);

-- ---------- Quotas ----------

create table quota_usage (
  id bigserial primary key,
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  feature_key text not null references features(key),
  period_start date not null,
  used int not null default 0 check (used >= 0),
  reserved int not null default 0 check (reserved >= 0),
  unique (person_id, side, feature_key, period_start)
);

create table quota_reservations (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  person_id uuid not null references people(id),
  side text not null,
  feature_key text not null references features(key),
  period_start date not null,
  amount int not null check (amount > 0),
  status text not null default 'reserved' check (status in ('reserved', 'settled', 'released')),
  object_ref text not null default '',
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- ---------- Audit, events, jobs, notifications, holds ----------

create table audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor_type text not null check (actor_type in ('member', 'staff', 'system', 'worker')),
  actor_id uuid,
  action text not null,
  object_type text not null default '',
  object_id text not null default '',
  detail jsonb not null default '{}',
  ip text not null default ''
);
create index audit_log_at on audit_log (at desc);

create table outbox_events (
  event_id uuid primary key default gen_random_uuid(),
  event_type text not null,
  schema_version int not null default 1,
  occurred_at timestamptz not null default now(),
  workspace_id uuid,
  actor_type text not null default 'system',
  actor_id uuid,
  object_type text not null default '',
  object_id text not null default '',
  object_version int,
  correlation_id uuid,
  causation_id uuid,
  policy_version text not null default '',
  classification text not null default 'internal',
  is_test boolean not null default false,
  payload jsonb not null default '{}',
  published_at timestamptz
);
create index outbox_unpublished on outbox_events (occurred_at) where published_at is null;

create table jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  payload jsonb not null default '{}',
  run_at timestamptz not null default now(),
  status text not null default 'queued' check (status in ('queued', 'running', 'waiting_approval', 'delayed', 'succeeded', 'failed', 'canceled', 'dead')),
  attempts int not null default 0,
  max_attempts int not null default 5,
  lease_until timestamptz,
  last_error text not null default '',
  idempotency_key text unique,
  person_id uuid references people(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index jobs_due on jobs (run_at) where status in ('queued', 'delayed');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id),
  side text,
  kind text not null,
  channel text not null check (channel in ('in_app', 'email')),
  essential boolean not null default false,
  title text not null,
  body text not null default '',
  link text not null default '',
  dedupe_key text not null unique,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'suppressed')),
  provider text not null default '',
  provider_ref text not null default '',
  error text not null default '',
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz
);
create index notifications_person on notifications (person_id, created_at desc);

create table holds (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('person', 'org', 'feature', 'session')),
  scope_id text not null,
  rule text not null,
  reason text not null default '',
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  state text not null default 'active' check (state in ('active', 'released', 'expired')),
  created_by uuid references people(id),
  created_at timestamptz not null default now(),
  review_at timestamptz,
  expires_at timestamptz,
  released_by uuid references people(id),
  released_at timestamptz,
  release_evidence text not null default ''
);
create index holds_active on holds (scope_type, scope_id) where state = 'active';

-- ---------- Append-only guards ----------

create or replace function dela_no_change() returns trigger language plpgsql as $$
begin
  raise exception 'append_only: % rows cannot be changed or deleted', tg_table_name;
end $$;

create trigger audit_log_append_only before update or delete on audit_log for each row execute function dela_no_change();
create trigger settings_history_append_only before update or delete on settings_history for each row execute function dela_no_change();
create trigger decision_log_append_only before update or delete on decision_log for each row execute function dela_no_change();

-- An approved plan version keeps its prices and limits; it can only be retired.
create or replace function dela_plan_version_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then raise exception 'plan_version_locked'; end if;
    return old;
  end if;
  if old.status = 'draft' then return new; end if;
  if old.status = 'approved' and new.status = 'retired'
     and new.monthly_cents = old.monthly_cents and new.fee_bps = old.fee_bps
     and new.annual_cents is not distinct from old.annual_cents then
    return new;
  end if;
  raise exception 'plan_version_locked';
end $$;
create trigger plan_versions_guard before update or delete on plan_versions for each row execute function dela_plan_version_guard();

create or replace function dela_plan_feature_guard() returns trigger language plpgsql as $$
declare st text;
begin
  select status into st from plan_versions where id = coalesce(new.plan_version_id, old.plan_version_id);
  if st is distinct from 'draft' then raise exception 'plan_version_locked'; end if;
  return coalesce(new, old);
end $$;
create trigger plan_features_guard before insert or update or delete on plan_features for each row execute function dela_plan_feature_guard();

-- ---------- Lock everything down ----------

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end $$;

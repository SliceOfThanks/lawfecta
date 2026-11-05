-- Step 7: reviews after completed work, reviews from past clients outside Lawfecta, the trusted talent bench (personal and
-- firm), bench conversations, bench suggestions, and member webhooks. Brief docs/briefs/step-7-reviews-bench-webhooks.md
-- (Stacey: all 18 answers as suggested, 2026-11-05). Additive: new tables, functions, switches and settings; threads gains a
-- nullable bench link (gig_id may now be empty for a bench conversation).

insert into feature_switches (key, label, gate) values
  ('reviews', 'Reviews after completed engagements', 'Step 7 tested'),
  ('past_client_reviews', 'Reviews from past clients outside Lawfecta (freelancers)', 'Step 7 tested'),
  ('bench', 'The trusted talent bench and bench conversations', 'Step 7 tested'),
  ('bench_suggestions', 'DELA suggests bench freelancers for new work', 'Step 7 tested')
on conflict (key) do nothing;
update feature_switches set gate = 'Step 7 tested' where key = 'member_webhooks';

insert into settings (key, value, label, section, unit, status, source, note) values
  ('reviews.window_days', '60', 'Days after completion to write a review', 'Profiles, reviews and risk', 'days', 'C', 'Stacey 2026-11-05 (Step 7 answer 4)', ''),
  ('reviews.reminder_days', '7', 'Review reminder after completion', 'Profiles, reviews and risk', 'days', 'C', 'Stacey 2026-11-05 (Step 7 answer 4)', ''),
  ('reviews.response_edit_days', '14', 'Days to edit a response to a review', 'Profiles, reviews and risk', 'days', 'C', 'Stacey 2026-11-05 (Step 7 answer 6)', ''),
  ('reviews.appeal_days', '14', 'Days to appeal a review decision', 'Profiles, reviews and risk', 'days', 'C', 'Stacey 2026-11-05 (Step 7 answer 7)', ''),
  ('reviews.min_to_show_average', '3', 'Reviews needed before averages show', 'Profiles, reviews and risk', 'reviews', 'C', 'Stacey 2026-11-05 (Step 7 answer 3)', ''),
  ('reviews.visibility', '"members"', 'Who can read reviews', 'Profiles, reviews and risk', '', 'C', 'Stacey 2026-11-05 (Step 7 answer 2)', 'Signed-in DELA members only until a lawyer checks the FTC review rules.'),
  ('past_reviews.requests_per_month', '5', 'Past-client review requests a month', 'Profiles, reviews and risk', 'requests', 'C', 'Stacey 2026-11-05 (Step 7 answer 8)', ''),
  ('past_reviews.max_total', '20', 'Past-client review requests in total', 'Profiles, reviews and risk', 'requests', 'C', 'Stacey 2026-11-05 (Step 7 answer 8)', ''),
  ('past_reviews.link_days', '30', 'Days a past-client review link works', 'Profiles, reviews and risk', 'days', 'R', 'Claude suggestion', ''),
  ('past_reviews.same_email_days', '90', 'Days before the same person can be asked again', 'Profiles, reviews and risk', 'days', 'R', 'Claude suggestion', ''),
  ('bench.invite_expiry_days', '30', 'Days a bench invitation stays open', 'Bench', 'days', 'C', 'Stacey 2026-11-05 (Step 7 brief, When)', ''),
  ('bench.max_size', 'null', 'Largest personal bench (empty: no limit)', 'Bench', 'freelancers', 'C', 'Stacey 2026-11-05 (Step 7 answer 9)', ''),
  ('bench.firm_plans', '["att_business"]', 'Attorney plans with a firm bench', 'Bench', '', 'C', 'Stacey 2026-11-05 (Step 7 answer 9)', ''),
  ('bench.snooze_days', '30', 'Days a snoozed bench suggestion stays quiet', 'Bench', 'days', 'C', 'Stacey 2026-11-05 (Step 7 answer 12)', ''),
  ('webhooks.retry_schedule_minutes', '[1,5,30,120,360,720]', 'Webhook retry waits', 'Webhooks', 'minutes', 'C', 'Stacey 2026-11-05 (Step 7 answer 15)', 'About 21 hours in total, then the notice is marked failed.'),
  ('webhooks.pause_after_failures', '20', 'Failures in a row before an endpoint pauses', 'Webhooks', 'failures', 'C', 'Stacey 2026-11-05 (Step 7 answer 15)', ''),
  ('webhooks.timeout_seconds', '5', 'Seconds to wait for a member''s system', 'Webhooks', 'seconds', 'R', '1A section 26', ''),
  ('webhooks.secret_overlap_hours', '24', 'Hours the old signing secret keeps working', 'Webhooks', 'hours', 'R', '1A section 26', ''),
  ('webhooks.daily_cap', '1000', 'Webhook notices a day per member', 'Webhooks', 'notices', 'C', 'Stacey 2026-11-05 (Step 7 answer 14)', 'Then they wait for the next day.')
on conflict (key) do nothing;

do $$
declare c text;
begin
  select conname into c from pg_constraint where conrelid = 'ai_usage'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%milestone_check%';
  if c is not null then execute format('alter table ai_usage drop constraint %I', c); end if;
  alter table ai_usage add constraint ai_usage_task_check check (task in ('chat', 'file', 'voice', 'key_test', 'client_check', 'conduct_review', 'milestone_check', 'review_check'));
end $$;

alter table member_prefs add column if not exists bench_digest boolean not null default false;

-- ---------- Reviews ----------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id),
  direction text not null check (direction in ('of_freelancer', 'of_attorney')),
  author_person uuid not null references people(id),
  subject_person uuid not null references people(id),
  ratings jsonb not null,
  would_again boolean not null,
  body text not null check (length(body) between 1 and 3000),
  status text not null default 'published' check (status in ('published', 'held', 'removed')),
  held_kinds text[] not null default '{}',
  version int not null default 1,
  edited_at timestamptz,
  response text not null default '',
  response_at timestamptz,
  response_edited_at timestamptz,
  response_status text not null default 'none' check (response_status in ('none', 'published', 'held', 'removed')),
  appeal_text text not null default '',
  appeal_at timestamptz,
  appeal_status text not null default 'none' check (appeal_status in ('none', 'open', 'upheld', 'reversed')),
  request_id text not null default '',
  created_at timestamptz not null default now(),
  unique (agreement_id, direction)
);
create index reviews_subject on reviews (subject_person, direction, status);
alter table reviews enable row level security;

-- Every earlier version of a review or response, kept for ever
create table review_versions (
  id bigserial primary key,
  review_id uuid not null references reviews(id),
  part text not null check (part in ('review', 'response')),
  ratings jsonb,
  would_again boolean,
  body text not null,
  replaced_at timestamptz not null default now()
);
create trigger review_versions_append_only before update or delete on review_versions for each row execute function dela_no_change();
alter table review_versions enable row level security;

create table review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id),
  reporter uuid not null references people(id),
  reason text not null check (length(reason) between 1 and 2000),
  status text not null default 'open' check (status in ('open', 'kept', 'removed')),
  decision_note text not null default '',
  decided_by uuid references people(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index review_reports_one_open on review_reports (review_id, reporter) where status = 'open';
alter table review_reports enable row level security;

-- Every decision the Lawfecta Team makes on a review, with the reason (never edited)
create table review_moderation (
  id bigserial primary key,
  review_id uuid not null references reviews(id),
  action text not null,
  note text not null default '',
  actor uuid references people(id),
  at timestamptz not null default now()
);
create trigger review_moderation_append_only before update or delete on review_moderation for each row execute function dela_no_change();
alter table review_moderation enable row level security;

-- ---------- Reviews from past clients outside Lawfecta ----------
create table past_review_requests (
  id uuid primary key default gen_random_uuid(),
  freelancer_person uuid not null references people(id),
  client_name text not null,
  email text not null,
  email_hash text not null,
  token_hash text not null unique,
  status text not null default 'sent' check (status in ('sent', 'done', 'expired', 'opted_out')),
  expires_at timestamptz not null,
  notification_id uuid,
  created_at timestamptz not null default now()
);
create index past_review_requests_person on past_review_requests (freelancer_person, created_at);
alter table past_review_requests enable row level security;

create table past_review_optouts (
  email_hash text primary key,
  at timestamptz not null default now()
);
alter table past_review_optouts enable row level security;

create table past_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references past_review_requests(id),
  freelancer_person uuid not null references people(id),
  reviewer_name text not null,
  reviewer_state text not null,
  bar_number text not null,
  ratings jsonb not null,
  would_again boolean not null,
  body text not null check (length(body) between 1 and 3000),
  status text not null default 'published' check (status in ('published', 'held', 'removed')),
  held_kinds text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table past_reviews enable row level security;

-- ---------- The bench ----------
create table bench_members (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('personal', 'firm')),
  org_id uuid not null references organizations(id),
  owner_person uuid references people(id),          -- personal bench: the attorney; firm bench: empty
  freelancer_person uuid not null references people(id),
  status text not null default 'invited' check (status in ('invited', 'active', 'declined', 'left', 'removed', 'expired')),
  note text not null default '',
  invited_by uuid not null references people(id),
  request_id text not null default '',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  ended_at timestamptz,
  ended_by uuid references people(id),
  check ((kind = 'personal') = (owner_person is not null))
);
create unique index bench_one_open on bench_members (kind, org_id, coalesce(owner_person, '00000000-0000-0000-0000-000000000000'::uuid), freelancer_person) where status in ('invited', 'active');
create index bench_freelancer on bench_members (freelancer_person, status);
alter table bench_members enable row level security;

create table bench_suggestions (
  id uuid primary key default gen_random_uuid(),
  attorney_person uuid not null references people(id),
  bench_id uuid not null references bench_members(id),
  freelancer_person uuid not null references people(id),
  gig_id uuid references gigs(id),
  playbook_id uuid references playbooks(id),
  reason text not null,
  status text not null default 'new' check (status in ('new', 'dismissed', 'used')),
  created_at timestamptz not null default now()
);
create unique index bench_suggestions_once on bench_suggestions (attorney_person, freelancer_person, coalesce(gig_id, playbook_id));
alter table bench_suggestions enable row level security;

create table bench_snoozes (
  attorney_person uuid not null references people(id),
  freelancer_person uuid not null references people(id),
  until timestamptz not null,
  primary key (attorney_person, freelancer_person)
);
alter table bench_snoozes enable row level security;

-- A bench conversation is a thread with no gig
alter table threads alter column gig_id drop not null;
alter table threads add column if not exists bench_id uuid references bench_members(id);
create unique index if not exists threads_one_per_bench on threads (bench_id) where bench_id is not null;
do $$ begin
  alter table threads add constraint threads_gig_or_bench check (num_nonnulls(gig_id, bench_id) = 1);
exception when duplicate_object then null; end $$;

-- ---------- Member webhooks ----------
create table webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  url text not null check (url like 'https://%' and length(url) <= 500),
  events text[] not null,
  secret_sealed text not null,
  secret_last4 text not null,
  prev_secret_sealed text,
  prev_until timestamptz,
  status text not null default 'active' check (status in ('active', 'paused', 'deleted')),
  paused_reason text not null default '',
  failures int not null default 0,
  last_ok_at timestamptz,
  last_error text not null default '',
  request_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index webhook_endpoints_person on webhook_endpoints (person_id, side, status);
alter table webhook_endpoints enable row level security;

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id),
  side text not null,
  type text not null,
  check_kind text not null,
  check_id uuid,
  data jsonb not null,
  dedupe_key text not null unique,
  created_at timestamptz not null default now()
);
alter table webhook_events enable row level security;

create table webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references webhook_endpoints(id),
  event_id uuid not null references webhook_events(id),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'canceled')),
  attempts int not null default 0,
  next_at timestamptz not null default now(),
  last_code int,
  last_error text not null default '',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (endpoint_id, event_id)
);
create index webhook_deliveries_endpoint on webhook_deliveries (endpoint_id, created_at desc);
alter table webhook_deliveries enable row level security;

-- ---------- Helpers ----------
create or replace function dela_person_name(p_person uuid, p_side text) returns text language sql stable as $$
  select coalesce((select case when p_side = 'attorney' then coalesce(nullif(mp.body->>'firm_name', ''), pe.display_name)
    else coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name) end
    from people pe left join member_profiles mp on mp.person_id = pe.id and mp.side = p_side where pe.id = p_person), '')
$$;

create or replace function dela_site_link(p_path text) returns text language sql stable as $$
  select rtrim(coalesce(dela_setting_text('site.url', ''), ''), '/') || p_path
$$;

-- The firm's owner and managers (the people who manage gigs, playbooks and the firm bench)
create or replace function dela_org_managers(p_org uuid) returns uuid[] language sql stable as $$
  select array(select distinct x from (
    select o.owner_person_id as x from organizations o where o.id = p_org
    union select m.person_id from org_members m where m.org_id = p_org and m.status = 'active' and m.member_role = 'manager') y where x is not null)
$$;

create or replace function dela_gig_owner(p_gig uuid) returns uuid language sql stable as $$ select created_by from gigs where id = p_gig $$;

-- ---------- Threads: gig conversations and bench conversations ----------
-- The person's role in a thread. Always '' (never empty) when they are not part of it or the thread does not exist.
create or replace function dela_thread_role(p_person uuid, p_side text, p_thread uuid) returns text language sql stable as $$
  select coalesce((select case
      when t.gig_id is not null and p_side = 'attorney' and dela_gig_manager(p_person, t.gig_id) then 'attorney'
      when t.bench_id is not null and p_side = 'attorney' and (
        (b.kind = 'personal' and b.owner_person = p_person) or (b.kind = 'firm' and dela_firm_role(p_person, b.org_id) <> '')) then 'attorney'
      when p_side = 'freelancer' and t.freelancer_person = p_person then 'freelancer' else '' end
    from threads t left join bench_members b on b.id = t.bench_id where t.id = p_thread), '')
$$;

-- What a thread is about: the title, the firm, and the attorney who gets the messages
create or replace function dela_thread_ctx(p_thread uuid) returns jsonb language sql stable as $$
  select case when t.gig_id is not null then jsonb_build_object('kind', 'gig', 'title', g.title, 'org_id', g.org_id, 'attorney', g.created_by, 'gig_id', g.id, 'gig_status', g.status)
    else jsonb_build_object('kind', 'bench', 'title', 'Bench: ' || coalesce(nullif(dela_person_name(coalesce(b.owner_person, o.owner_person_id), 'attorney'), ''), o.name), 'org_id', b.org_id,
      'attorney', coalesce(b.owner_person, o.owner_person_id), 'bench_id', b.id, 'bench_status', b.status, 'bench_kind', b.kind) end
  from threads t left join gigs g on g.id = t.gig_id left join bench_members b on b.id = t.bench_id left join organizations o on o.id = b.org_id where t.id = p_thread
$$;

-- Open for new messages? Bench conversations: while the freelancer is on the bench. Gig conversations: as in Step 5, and
-- read only once the engagement is complete (test T09: the bench conversation stays open).
create or replace function dela_thread_writable(p_thread uuid) returns text language sql stable as $$
  select coalesce((select case
    when t.bench_id is not null then case when b.status <> 'active' then 'bench_ended' when t.blocked_at is not null then 'blocked' else '' end
    when t.blocked_at is not null and not exists (select 1 from agreements a where a.gig_id = t.gig_id and a.freelancer_person = t.freelancer_person and a.status in ('signed', 'active', 'paused')) then 'blocked'
    when exists (select 1 from agreements a where a.gig_id = t.gig_id and a.freelancer_person = t.freelancer_person and a.status not in ('canceled', 'completed')) then ''
    when exists (select 1 from agreements a where a.gig_id = t.gig_id and a.freelancer_person = t.freelancer_person and a.status = 'completed') then 'project_closed'
    when g.closed_at is not null and g.closed_at + make_interval(days => dela_int_setting('chat.close_days_after_gig', 30)) < now() then 'thread_closed'
    else '' end
  from threads t left join gigs g on g.id = t.gig_id left join bench_members b on b.id = t.bench_id where t.id = p_thread), 'not_found')
$$;

create or replace function dela_message_send(p_person uuid, p_side text, p_thread uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_role text := dela_thread_role(p_person, p_side, p_thread); v_why text; v_id uuid; v_recent int; v_att uuid[]; f uuid; c jsonb;
  v_held boolean := coalesce((p->>'held')::boolean, false);
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  c := dela_thread_ctx(p_thread);
  if not dela_switch_on(case when c->>'kind' = 'bench' then 'bench' else 'gig_chat' end, p_person) then return jsonb_build_object('ok', false, 'reason', 'chat_off'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  v_why := dela_thread_writable(p_thread);
  if v_why <> '' then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  select id into v_id from messages where thread_id = p_thread and sender = p_person and request_id = p->>'request_id';
  if v_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_id); end if;
  select count(*) into v_recent from messages where sender = p_person and created_at > now() - interval '1 minute';
  if v_recent >= dela_int_setting('chat.rate_per_minute', 20) then return jsonb_build_object('ok', false, 'reason', 'too_many_messages'); end if;
  -- A bench conversation shares no files (1A section 18); a gig conversation attaches as in Step 5
  v_att := array(select (x #>> '{}')::uuid from jsonb_array_elements(coalesce(p->'attachments', '[]')) x limit 5);
  if c->>'kind' = 'bench' and cardinality(v_att) > 0 then return jsonb_build_object('ok', false, 'reason', 'bench_no_files'); end if;
  foreach f in array v_att loop
    if not exists (select 1 from files fi where fi.id = f and fi.status = 'ready' and (
         (v_role = 'attorney' and fi.org_id = (c->>'org_id')::uuid and fi.purpose = 'member') or
         (v_role = 'freelancer' and fi.uploaded_by = p_person and fi.purpose in ('profile', 'member')))) then
      return jsonb_build_object('ok', false, 'reason', 'file_not_usable');
    end if;
  end loop;
  insert into messages (thread_id, sender, side, body, attachments, status, warned, request_id)
  values (p_thread, p_person, v_role, left(p->>'body', 8000), v_att, case when v_held then 'held' else 'sent' end, coalesce((p->>'warned')::boolean, false), coalesce(p->>'request_id', gen_random_uuid()::text))
  returning id into v_id;
  insert into thread_reads (thread_id, person_id, last_read_at) values (p_thread, p_person, now()) on conflict (thread_id, person_id) do update set last_read_at = now();
  delete from thread_drafts where thread_id = p_thread and person_id = p_person;
  if not v_held then perform dela_message_notify(v_id); end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'held', v_held);
end $$;

create or replace function dela_message_notify(p_msg uuid) returns void language plpgsql as $$
declare m messages; t threads; c jsonb; v_to uuid[]; who uuid; v_bucket bigint; v_open boolean;
begin
  select * into m from messages where id = p_msg;
  select * into t from threads where id = m.thread_id;
  c := dela_thread_ctx(t.id);
  v_to := case when m.side = 'attorney' then array[t.freelancer_person]
               when c->>'kind' = 'bench' and c->>'bench_kind' = 'personal' then array[(c->>'attorney')::uuid]
               else array(select distinct x from (select (c->>'attorney')::uuid as x union select o.owner_person_id from organizations o where o.id = (c->>'org_id')::uuid) y where x is not null) end;
  v_bucket := floor(extract(epoch from now()) / (60 * greatest(dela_int_setting('chat.email_gap_minutes', 15), 1)))::bigint;
  foreach who in array v_to loop
    v_open := exists (select 1 from thread_reads r where r.thread_id = t.id and r.person_id = who and r.last_read_at > now() - interval '2 minutes');
    perform dela_notify(jsonb_build_object('person_id', who, 'side', case when m.side = 'attorney' then 'freelancer' else 'attorney' end, 'kind', 'message',
      'email', not v_open, 'title', 'New message: ' || (c->>'title'), 'body', 'You have a new message (' || (c->>'title') || '). Open DELA to read it.',
      'link', '/dela?tab=inbox&thread=' || t.id::text, 'dedupe_key', 'msg:' || t.id::text || ':' || who::text || ':' || v_bucket));
  end loop;
end $$;

create or replace function dela_thread_get(p_person uuid, p_side text, p_thread uuid) returns jsonb language plpgsql as $$
declare v_role text := dela_thread_role(p_person, p_side, p_thread); t threads; c jsonb; v_seen timestamptz; v_mine boolean; v_theirs boolean; v_other uuid;
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into t from threads where id = p_thread;
  c := dela_thread_ctx(p_thread);
  v_mine := coalesce((select read_receipts from member_prefs where person_id = p_person), true);
  if v_role = 'attorney' then
    v_other := t.freelancer_person;
    select max(last_read_at) into v_seen from thread_reads where thread_id = p_thread and person_id = t.freelancer_person;
  else
    select max(r.last_read_at) into v_seen from thread_reads r where r.thread_id = p_thread and r.person_id <> p_person;
    v_other := (c->>'attorney')::uuid;
  end if;
  v_theirs := coalesce((select read_receipts from member_prefs where person_id = v_other), true);
  insert into thread_reads (thread_id, person_id, last_read_at) values (p_thread, p_person, now()) on conflict (thread_id, person_id) do update set last_read_at = now();
  return jsonb_build_object('ok', true, 'role', v_role, 'writable', dela_thread_writable(p_thread) = '', 'why_closed', dela_thread_writable(p_thread),
    'thread', jsonb_build_object('id', t.id, 'kind', c->>'kind', 'gig_id', t.gig_id, 'bench_id', t.bench_id, 'gig_title', c->>'title', 'gig_status', c->>'gig_status',
      'blocked', t.blocked_at is not null, 'blocked_by_me', t.blocked_by = p_person, 'freelancer_person', t.freelancer_person,
      'other_name', case when v_role = 'attorney' then dela_person_name(t.freelancer_person, 'freelancer') else dela_person_name((c->>'attorney')::uuid, 'attorney') end),
    'seen_at', case when v_mine and v_theirs then v_seen end,
    'draft', (select body from thread_drafts where thread_id = p_thread and person_id = p_person),
    'edit_minutes', dela_int_setting('chat.edit_minutes', 15),
    'messages', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'mine', m.sender = p_person, 'side', m.side,
        'body', case when m.status = 'removed' then '' when m.status = 'held' and m.sender <> p_person then '' else m.body end,
        'status', m.status, 'warned', m.warned and m.sender = p_person, 'edited', m.edited_at is not null, 'created_at', m.created_at,
        'attachments', (select coalesce(jsonb_agg(jsonb_build_object('file_id', fi.id, 'name', fi.name)), '[]') from files fi where fi.id = any(m.attachments) and m.status = 'sent'))
        order by m.created_at), '[]')
      from messages m where m.thread_id = p_thread and (m.status <> 'held' or m.sender = p_person)));
end $$;

create or replace function dela_threads(p_person uuid, p_side text) returns jsonb language sql stable as $$
  select jsonb_build_object('ok', true, 'on', dela_switch_on('gig_chat', p_person) or dela_switch_on('bench', p_person), 'threads', coalesce(jsonb_agg(x order by x->>'last_at' desc nulls last), '[]')) from (
    select jsonb_build_object('id', t.id, 'kind', c->>'kind', 'gig_id', t.gig_id, 'bench_id', t.bench_id, 'gig_title', c->>'title',
      'other_name', case when p_side = 'attorney' then dela_person_name(t.freelancer_person, 'freelancer') else dela_person_name((c->>'attorney')::uuid, 'attorney') end,
      'last_at', (select max(m.created_at) from messages m where m.thread_id = t.id and (m.status = 'sent' or m.sender = p_person)),
      'unread', (select count(*) from messages m where m.thread_id = t.id and m.status = 'sent' and m.sender <> p_person
        and m.created_at > coalesce((select r.last_read_at from thread_reads r where r.thread_id = t.id and r.person_id = p_person), '-infinity'::timestamptz))) x
    from threads t cross join lateral (select dela_thread_ctx(t.id) c) cc
    where dela_thread_role(p_person, p_side, t.id) <> '') y
$$;

create or replace function dela_thread_text(p_person uuid, p_side text, p_thread uuid) returns jsonb language plpgsql stable as $$
declare v_role text := dela_thread_role(p_person, p_side, p_thread); c jsonb := dela_thread_ctx(p_thread);
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'role', v_role, 'gig_title', c->>'title', 'gig_id', (select t.gig_id from threads t where t.id = p_thread),
    'lines', (select coalesce(jsonb_agg(x order by x->>'at'), '[]') from (select jsonb_build_object('who', case when m.side = 'attorney' then 'Attorney' else 'Freelancer' end, 'text', m.body, 'at', m.created_at) x
      from messages m where m.thread_id = p_thread and m.status = 'sent' order by m.created_at desc limit 80) y));
end $$;

-- ---------- Webhooks: events and deliveries ----------
create or replace function dela_webhook_allowed(p_side text) returns text[] language sql immutable as $$
  select case when p_side = 'attorney' then array['playbook.approved', 'gig.posted', 'gig.closed', 'proposal.received', 'meeting.booked', 'meeting.canceled', 'agreement.signed',
      'milestone.paid', 'milestone.submitted', 'milestone.accepted', 'milestone.changes_requested', 'dispute.opened', 'dispute.decided', 'bench.accepted', 'review.received']
    else array['match.new', 'invitation.received', 'proposal.chosen', 'meeting.booked', 'meeting.canceled', 'agreement.signed', 'milestone.paid', 'milestone.accepted',
      'milestone.changes_requested', 'payout.sent', 'dispute.opened', 'dispute.decided', 'bench.invited', 'review.received'] end
$$;

-- How many endpoints the member's plan allows (null: no cap)
create or replace function dela_webhook_limit(p_person uuid, p_side text) returns int language sql stable as $$
  select case when coalesce(pf.enabled, false) then pf.quota_limit else 0 end
  from (select 1) one left join plan_features pf on pf.plan_version_id = dela_effective_version(p_person, p_side) and pf.feature_key = 'webhooks.endpoints'
$$;

-- An event for one member on one side. Only members with an active endpoint for the event get anything; the oldest endpoints
-- within the plan's limit are used (after a downgrade the newest ones wait). Each notice goes out once per endpoint.
create or replace function dela_webhook_emit(p_person uuid, p_side text, p_type text, p_check_kind text, p_check_id uuid, p_data jsonb, p_key text) returns void language plpgsql as $$
declare v_ev uuid; e record; v_d uuid; v_today int; v_cap int := dela_int_setting('webhooks.daily_cap', 1000); v_at timestamptz := now(); v_lim int;
begin
  if p_person is null or not exists (select 1 from webhook_endpoints w where w.person_id = p_person and w.side = p_side and w.status = 'active' and (p_type = any(w.events) or p_type = 'test')) then return; end if;
  if not dela_switch_on('member_webhooks', p_person) then return; end if;
  insert into webhook_events (person_id, side, type, check_kind, check_id, data, dedupe_key)
  values (p_person, p_side, p_type, p_check_kind, p_check_id, coalesce(p_data, '{}'), p_key) on conflict (dedupe_key) do nothing returning id into v_ev;
  if v_ev is null then return; end if;
  select count(*) into v_today from webhook_deliveries d join webhook_endpoints w on w.id = d.endpoint_id where w.person_id = p_person and d.created_at > date_trunc('day', now());
  if v_today >= v_cap then v_at := date_trunc('day', now()) + interval '1 day'; end if;
  v_lim := dela_webhook_limit(p_person, p_side);
  for e in select w.id from webhook_endpoints w where w.person_id = p_person and w.side = p_side and w.status = 'active'
             and w.id in (select x.id from webhook_endpoints x where x.person_id = p_person and x.side = p_side and x.status <> 'deleted' order by x.created_at limit v_lim)
             and (p_type = any(w.events) or (p_type = 'test' and p_data->>'endpoint_id' = w.id::text)) loop
    insert into webhook_deliveries (endpoint_id, event_id, next_at) values (e.id, v_ev, v_at) on conflict do nothing returning id into v_d;
    if v_d is not null then perform dela_job_enqueue('webhook_send', jsonb_build_object('delivery_id', v_d), v_at, 'wh:' || v_d::text || ':0', p_person); end if;
  end loop;
end $$;

-- May this member still see this event now (checked again at delivery, for example after leaving a firm)?
create or replace function dela_webhook_visible(p_person uuid, p_side text, p_kind text, p_id uuid) returns boolean language sql stable as $$
  select case p_kind
    when 'test' then true
    when 'gig' then dela_gig_manager(p_person, p_id)
    when 'playbook' then exists (select 1 from playbooks pb where pb.id = p_id and dela_firm_role(p_person, pb.org_id) <> '')
    when 'agreement' then dela_agreement_role(p_person, p_side, p_id) <> ''
    when 'proposal' then exists (select 1 from proposals pr where pr.id = p_id and pr.freelancer_id = p_person)
    when 'invitation' then exists (select 1 from gig_invitations i where i.id = p_id and i.freelancer_id = p_person)
    when 'match' then exists (select 1 from gig_matches m where m.gig_id = p_id and m.person_id = p_person)
    when 'meeting' then exists (select 1 from meetings m where m.id = p_id and p_person in (m.attorney_person, m.freelancer_person))
    when 'bench' then exists (select 1 from bench_members b where b.id = p_id and (b.freelancer_person = p_person or b.owner_person = p_person or (b.kind = 'firm' and dela_firm_role(p_person, b.org_id) <> '')))
    when 'review' then exists (select 1 from reviews r where r.id = p_id and r.subject_person = p_person)
    else false end
$$;

-- What the worker needs to send one notice (the sealed secrets are opened by the api), or why not to send it
create or replace function dela_webhook_for_delivery(p_delivery uuid) returns jsonb language plpgsql as $$
declare d webhook_deliveries; w webhook_endpoints; ev webhook_events;
begin
  select * into d from webhook_deliveries where id = p_delivery for update;
  if d.id is null or d.status <> 'pending' then return jsonb_build_object('ok', false, 'reason', 'not_pending'); end if;
  select * into w from webhook_endpoints where id = d.endpoint_id;
  select * into ev from webhook_events where id = d.event_id;
  if w.status <> 'active' or not dela_switch_on('member_webhooks', w.person_id) or dela_has_hold(w.person_id) or not dela_webhook_visible(w.person_id, w.side, ev.check_kind, ev.check_id)
     or not exists (select 1 from side_profiles s where s.person_id = w.person_id and s.side = w.side and s.status <> 'closed') then
    update webhook_deliveries set status = 'canceled', last_error = 'no longer allowed' where id = d.id;
    return jsonb_build_object('ok', false, 'reason', 'canceled');
  end if;
  return jsonb_build_object('ok', true, 'person_id', w.person_id, 'url', w.url, 'secret', w.secret_sealed, 'prev_secret', case when w.prev_until > now() then w.prev_secret_sealed end,
    'event', jsonb_build_object('id', ev.id, 'type', ev.type, 'created', extract(epoch from ev.created_at)::bigint, 'schema_version', 1, 'data', ev.data), 'attempts', d.attempts);
end $$;

create or replace function dela_webhook_result(p_delivery uuid, p_ok boolean, p_code int, p_error text) returns jsonb language plpgsql as $$
declare d webhook_deliveries; w webhook_endpoints; v_sched jsonb := coalesce(dela_setting('webhooks.retry_schedule_minutes'), '[1,5,30,120,360,720]'); v_wait int; v_fail int;
begin
  select * into d from webhook_deliveries where id = p_delivery for update;
  if d.id is null or d.status <> 'pending' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  select * into w from webhook_endpoints where id = d.endpoint_id for update;
  if p_ok then
    update webhook_deliveries set status = 'sent', attempts = attempts + 1, last_code = p_code, last_error = '', sent_at = now() where id = d.id;
    update webhook_endpoints set failures = 0, last_ok_at = now(), last_error = '', updated_at = now() where id = w.id;
    return jsonb_build_object('ok', true, 'status', 'sent');
  end if;
  v_wait := (v_sched->>d.attempts)::int;
  v_fail := w.failures + 1;
  update webhook_endpoints set failures = v_fail, last_error = left(coalesce(p_error, ''), 200), updated_at = now() where id = w.id;
  if v_fail >= dela_int_setting('webhooks.pause_after_failures', 20) and w.status = 'active' then
    update webhook_endpoints set status = 'paused', paused_reason = 'failures' where id = w.id;
    update webhook_deliveries set status = 'canceled', last_error = 'endpoint paused' where endpoint_id = w.id and status = 'pending' and id <> d.id;
    perform dela_notify(jsonb_build_object('person_id', w.person_id, 'side', w.side, 'kind', 'webhook', 'email', true, 'essential', true,
      'title', 'A webhook endpoint is paused', 'body', 'DELA could not deliver to your webhook endpoint ' || left(w.url, 80) || ' ' || v_fail || ' times in a row, so it is paused. Fix the address or your system, then click "Resume" in DELA, AI settings, Webhooks.',
      'link', '/dela?tab=ai', 'dedupe_key', 'whpause:' || w.id::text || ':' || extract(epoch from now())::bigint));
  end if;
  if v_wait is null or (select status from webhook_endpoints where id = w.id) <> 'active' then
    update webhook_deliveries set status = 'failed', attempts = attempts + 1, last_code = p_code, last_error = left(coalesce(p_error, ''), 200) where id = d.id;
    return jsonb_build_object('ok', true, 'status', 'failed');
  end if;
  update webhook_deliveries set attempts = attempts + 1, last_code = p_code, last_error = left(coalesce(p_error, ''), 200), next_at = now() + make_interval(mins => v_wait) where id = d.id;
  perform dela_job_enqueue('webhook_send', jsonb_build_object('delivery_id', d.id), now() + make_interval(mins => v_wait), 'wh:' || d.id::text || ':' || (d.attempts + 1), w.person_id);
  return jsonb_build_object('ok', true, 'status', 'retry', 'retry_in_minutes', v_wait);
end $$;

-- The member's endpoints, their limit and the last deliveries
create or replace function dela_webhooks(p_person uuid, p_side text) returns jsonb language sql stable as $$
  select jsonb_build_object('ok', true, 'on', dela_switch_on('member_webhooks', p_person), 'limit', dela_webhook_limit(p_person, p_side), 'events', to_jsonb(dela_webhook_allowed(p_side)),
    'endpoints', (select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'url', w.url, 'events', to_jsonb(w.events), 'status', w.status, 'paused_reason', w.paused_reason, 'failures', w.failures,
        'secret_last4', w.secret_last4, 'last_ok_at', w.last_ok_at, 'last_error', w.last_error, 'created_at', w.created_at,
        'over_limit', w.id not in (select x.id from webhook_endpoints x where x.person_id = p_person and x.side = p_side and x.status <> 'deleted' order by x.created_at limit dela_webhook_limit(p_person, p_side)),
        'deliveries', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'type', ev.type, 'status', d.status, 'attempts', d.attempts, 'code', d.last_code, 'error', d.last_error, 'at', d.created_at, 'sent_at', d.sent_at) order by d.created_at desc), '[]')
          from (select * from webhook_deliveries x where x.endpoint_id = w.id order by x.created_at desc limit 15) d join webhook_events ev on ev.id = d.event_id)) order by w.created_at), '[]')
      from webhook_endpoints w where w.person_id = p_person and w.side = p_side and w.status <> 'deleted'))
$$;

create or replace function dela_webhook_add(p_person uuid, p_side text, p jsonb) returns jsonb language plpgsql as $$
declare v_id uuid; v_lim int := dela_webhook_limit(p_person, p_side); v_n int; v_events text[];
begin
  if not dela_switch_on('member_webhooks', p_person) then return jsonb_build_object('ok', false, 'reason', 'webhooks_off'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  select id into v_id from webhook_endpoints where person_id = p_person and request_id = p->>'request_id' and coalesce(p->>'request_id', '') <> '';
  if v_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_id); end if;
  perform pg_advisory_xact_lock(hashtextextended('webhooks:' || p_person::text, 0));
  select count(*) into v_n from webhook_endpoints where person_id = p_person and side = p_side and status <> 'deleted';
  if v_lim is not null and v_n >= v_lim then return jsonb_build_object('ok', false, 'reason', 'limit_reached', 'limit', v_lim); end if;
  v_events := array(select distinct x from jsonb_array_elements_text(coalesce(p->'events', '[]')) x where x = any(dela_webhook_allowed(p_side)));
  if cardinality(v_events) = 0 then return jsonb_build_object('ok', false, 'reason', 'choose_events'); end if;
  if coalesce(p->>'url', '') not like 'https://%' then return jsonb_build_object('ok', false, 'reason', 'https_only'); end if;
  insert into webhook_endpoints (person_id, side, url, events, secret_sealed, secret_last4, request_id)
  values (p_person, p_side, left(p->>'url', 500), v_events, p->>'sealed', left(p->>'last4', 4), coalesce(p->>'request_id', '')) returning id into v_id;
  perform dela_audit('member', p_person, 'webhook_added', 'webhook', v_id::text, jsonb_build_object('host', split_part(split_part(p->>'url', '://', 2), '/', 1), 'events', to_jsonb(v_events)));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function dela_webhook_change(p_person uuid, p_side text, p_id uuid, p jsonb) returns jsonb language plpgsql as $$
declare w webhook_endpoints; v_events text[];
begin
  select * into w from webhook_endpoints where id = p_id and person_id = p_person and side = p_side and status <> 'deleted' for update;
  if w.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p->>'action' = 'delete' then
    update webhook_endpoints set status = 'deleted', updated_at = now() where id = w.id;
    update webhook_deliveries set status = 'canceled', last_error = 'endpoint deleted' where endpoint_id = w.id and status = 'pending';
  elsif p->>'action' = 'pause' then
    update webhook_endpoints set status = 'paused', paused_reason = 'member', updated_at = now() where id = w.id;
    update webhook_deliveries set status = 'canceled', last_error = 'endpoint paused' where endpoint_id = w.id and status = 'pending';
  elsif p->>'action' = 'resume' then
    if not dela_switch_on('member_webhooks', p_person) then return jsonb_build_object('ok', false, 'reason', 'webhooks_off'); end if;
    update webhook_endpoints set status = 'active', paused_reason = '', failures = 0, updated_at = now() where id = w.id;
  elsif p->>'action' = 'events' then
    v_events := array(select distinct x from jsonb_array_elements_text(coalesce(p->'events', '[]')) x where x = any(dela_webhook_allowed(p_side)));
    if cardinality(v_events) = 0 then return jsonb_build_object('ok', false, 'reason', 'choose_events'); end if;
    update webhook_endpoints set events = v_events, updated_at = now() where id = w.id;
  elsif p->>'action' = 'rotate' then
    if coalesce(p->>'sealed', '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
    update webhook_endpoints set prev_secret_sealed = secret_sealed, prev_until = now() + make_interval(hours => dela_int_setting('webhooks.secret_overlap_hours', 24)),
      secret_sealed = p->>'sealed', secret_last4 = left(p->>'last4', 4), updated_at = now() where id = w.id;
  else return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  perform dela_audit('member', p_person, 'webhook_' || (p->>'action'), 'webhook', w.id::text, '{}');
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_webhook_test(p_person uuid, p_side text, p_id uuid) returns jsonb language plpgsql as $$
declare w webhook_endpoints; v_key text := 'test:' || p_id::text || ':' || extract(epoch from clock_timestamp())::text;
begin
  select * into w from webhook_endpoints where id = p_id and person_id = p_person and side = p_side and status = 'active';
  if w.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('member_webhooks', p_person) then return jsonb_build_object('ok', false, 'reason', 'webhooks_off'); end if;
  perform dela_webhook_emit(p_person, p_side, 'test', 'test', null, jsonb_build_object('endpoint_id', w.id, 'message', 'A test notice from DELA', 'link', dela_site_link('/dela?tab=ai')), v_key);
  return jsonb_build_object('ok', true, 'delivery_id', (select d.id from webhook_deliveries d join webhook_events e on e.id = d.event_id where e.dedupe_key = v_key and d.endpoint_id = w.id));
end $$;

create or replace function dela_webhook_resend(p_person uuid, p_side text, p_delivery uuid) returns jsonb language plpgsql as $$
declare d webhook_deliveries; w webhook_endpoints; v_new uuid;
begin
  select * into d from webhook_deliveries where id = p_delivery;
  select * into w from webhook_endpoints where id = d.endpoint_id and person_id = p_person and side = p_side and status = 'active';
  if d.id is null or w.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if d.status = 'pending' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update webhook_deliveries set status = 'pending', attempts = 0, next_at = now(), last_error = '' where id = d.id;
  perform dela_job_enqueue('webhook_send', jsonb_build_object('delivery_id', d.id), now(), 'wh:' || d.id::text || ':resend:' || extract(epoch from clock_timestamp())::bigint, p_person);
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Events from the rest of DELA (triggers) ----------
create or replace function dela_wh_link(p_tab text, p_gig uuid, p_extra text default '') returns text language sql stable as $$
  select dela_site_link('/dela?tab=' || p_tab || case when p_gig is not null then '&gig=' || p_gig::text else '' end || coalesce(p_extra, ''))
$$;

create or replace function dela_wh_playbooks() returns trigger language plpgsql as $$
declare who uuid;
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    foreach who in array dela_org_managers(new.org_id) loop
      perform dela_webhook_emit(who, 'attorney', 'playbook.approved', 'playbook', new.id, jsonb_build_object('object', 'playbook', 'id', new.id, 'state', new.status, 'version', new.approved_version, 'at', now(), 'link', dela_site_link('/dela?tab=library')), 'pb:' || new.id || ':' || coalesce(new.approved_version, 0) || ':' || who);
    end loop;
  end if;
  return null;
end $$;
drop trigger if exists wh_playbooks on playbooks;
create trigger wh_playbooks after insert or update of status on playbooks for each row execute function dela_wh_playbooks();

create or replace function dela_wh_gigs() returns trigger language plpgsql as $$
begin
  if new.status = 'open' and (tg_op = 'INSERT' or old.status is distinct from 'open') then
    perform dela_webhook_emit(new.created_by, 'attorney', 'gig.posted', 'gig', new.id, jsonb_build_object('object', 'gig', 'id', new.id, 'state', new.status, 'at', now(), 'link', dela_wh_link('projects', new.id)), 'gig:' || new.id || ':open:' || coalesce(new.opened_at::text, ''));
    perform dela_bench_suggest_for_gig(new.id);
  elsif tg_op = 'UPDATE' and new.status in ('closed', 'filled', 'canceled') and old.status is distinct from new.status then
    perform dela_webhook_emit(new.created_by, 'attorney', 'gig.closed', 'gig', new.id, jsonb_build_object('object', 'gig', 'id', new.id, 'state', new.status, 'at', now(), 'link', dela_wh_link('projects', new.id)), 'gig:' || new.id || ':' || new.status);
  end if;
  return null;
end $$;

create or replace function dela_wh_proposals() returns trigger language plpgsql as $$
declare g gigs;
begin
  select * into g from gigs where id = new.gig_id;
  if new.status = 'sent' and (tg_op = 'INSERT' or old.status is distinct from 'sent') then
    perform dela_webhook_emit(g.created_by, 'attorney', 'proposal.received', 'gig', g.id, jsonb_build_object('object', 'proposal', 'id', new.id, 'gig_id', g.id, 'state', new.status, 'at', now(), 'link', dela_wh_link('projects', g.id, '&view=proposals')), 'prop:' || new.id || ':sent');
  elsif new.status = 'selected' and (tg_op = 'INSERT' or old.status is distinct from 'selected') then
    perform dela_webhook_emit(new.freelancer_id, 'freelancer', 'proposal.chosen', 'proposal', new.id, jsonb_build_object('object', 'proposal', 'id', new.id, 'gig_id', g.id, 'state', new.status, 'at', now(), 'link', dela_wh_link('work', g.id)), 'prop:' || new.id || ':selected');
  end if;
  return null;
end $$;

create or replace function dela_wh_invitations() returns trigger language plpgsql as $$
begin
  if new.status = 'sent' and (tg_op = 'INSERT' or old.status is distinct from 'sent') then
    perform dela_webhook_emit(new.freelancer_id, 'freelancer', 'invitation.received', 'invitation', new.id, jsonb_build_object('object', 'invitation', 'id', new.id, 'gig_id', new.gig_id, 'state', new.status, 'at', now(), 'link', dela_wh_link('work', new.gig_id)), 'inv:' || new.id);
  end if;
  return null;
end $$;

create or replace function dela_wh_matches() returns trigger language plpgsql as $$
begin
  perform dela_webhook_emit(new.person_id, 'freelancer', 'match.new', 'match', new.gig_id, jsonb_build_object('object', 'match', 'gig_id', new.gig_id, 'at', now(), 'link', dela_wh_link('work', new.gig_id)), 'match:' || new.gig_id || ':' || new.person_id);
  return null;
end $$;

create or replace function dela_wh_meetings() returns trigger language plpgsql as $$
declare v_type text;
begin
  v_type := case when new.status = 'confirmed' and (tg_op = 'INSERT' or old.status is distinct from 'confirmed') then 'meeting.booked'
                 when new.status = 'canceled' and tg_op = 'UPDATE' and old.status is distinct from 'canceled' then 'meeting.canceled' end;
  if v_type is not null then
    perform dela_webhook_emit(new.attorney_person, 'attorney', v_type, 'meeting', new.id, jsonb_build_object('object', 'meeting', 'id', new.id, 'gig_id', new.gig_id, 'state', new.status, 'start_at', new.start_at, 'at', now(), 'link', dela_site_link('/dela?tab=meetings')), 'meet:' || new.id || ':' || new.status || ':a');
    perform dela_webhook_emit(new.freelancer_person, 'freelancer', v_type, 'meeting', new.id, jsonb_build_object('object', 'meeting', 'id', new.id, 'gig_id', new.gig_id, 'state', new.status, 'start_at', new.start_at, 'at', now(), 'link', dela_site_link('/dela?tab=meetings')), 'meet:' || new.id || ':' || new.status || ':f');
  end if;
  return null;
end $$;

create or replace function dela_wh_agreements() returns trigger language plpgsql as $$
begin
  if new.status = 'signed' and old.status is distinct from 'signed' then
    perform dela_webhook_emit(new.attorney_person, 'attorney', 'agreement.signed', 'agreement', new.id, jsonb_build_object('object', 'agreement', 'id', new.id, 'gig_id', new.gig_id, 'state', new.status, 'version', new.version, 'at', now(), 'link', dela_wh_link('projects', new.gig_id, '&view=agreement')), 'ag:' || new.id || ':signed:a');
    perform dela_webhook_emit(new.freelancer_person, 'freelancer', 'agreement.signed', 'agreement', new.id, jsonb_build_object('object', 'agreement', 'id', new.id, 'gig_id', new.gig_id, 'state', new.status, 'version', new.version, 'at', now(), 'link', dela_wh_link('work', new.gig_id, '&view=agreement')), 'ag:' || new.id || ':signed:f');
  end if;
  -- Completed: both are asked for a review (the closeout), with one reminder later
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform dela_review_ask(new.id);
  end if;
  return null;
end $$;

create or replace function dela_wh_milestones() returns trigger language plpgsql as $$
declare a agreements; v_type text; d jsonb;
begin
  if old.status is not distinct from new.status then return null; end if;
  v_type := case new.status when 'funded' then 'milestone.paid' when 'submitted' then 'milestone.submitted' when 'accepted' then 'milestone.accepted' when 'changes_requested' then 'milestone.changes_requested' end;
  if v_type is null then return null; end if;
  select * into a from agreements where id = new.agreement_id;
  d := jsonb_build_object('object', 'milestone', 'id', new.id, 'agreement_id', a.id, 'gig_id', a.gig_id, 'seq', new.seq, 'state', new.status, 'amount_cents', new.amount_cents, 'currency', dela_setting_text('payments.currency', 'usd'), 'due_date', new.due_date, 'at', now(),
    'action_required', case new.status when 'funded' then 'freelancer: start the work' when 'submitted' then 'attorney: review the milestone' when 'changes_requested' then 'freelancer: make the changes' else '' end);
  if v_type <> 'milestone.submitted' then
    perform dela_webhook_emit(a.freelancer_person, 'freelancer', v_type, 'agreement', a.id, d || jsonb_build_object('link', dela_wh_link('work', a.gig_id, '&view=agreement')), 'ms:' || new.id || ':' || new.status || ':' || coalesce(new.revisions_used, 0) || ':f');
  end if;
  if v_type <> 'milestone.changes_requested' or true then
    perform dela_webhook_emit(a.attorney_person, 'attorney', v_type, 'agreement', a.id, d || jsonb_build_object('link', dela_wh_link('projects', a.gig_id, '&view=agreement')), 'ms:' || new.id || ':' || new.status || ':' || coalesce(new.revisions_used, 0) || ':a');
  end if;
  return null;
end $$;

create or replace function dela_wh_payouts() returns trigger language plpgsql as $$
declare a agreements;
begin
  if new.status = 'sent' and old.status is distinct from 'sent' then
    select * into a from agreements where id = new.agreement_id;
    perform dela_webhook_emit(new.person_id, 'freelancer', 'payout.sent', 'agreement', a.id, jsonb_build_object('object', 'payout', 'id', new.id, 'agreement_id', a.id, 'state', new.status, 'amount_cents', new.amount_cents, 'currency', dela_setting_text('payments.currency', 'usd'), 'at', now(), 'link', dela_site_link('/dela?tab=earnings')), 'po:' || new.id);
  end if;
  return null;
end $$;

create or replace function dela_wh_disputes() returns trigger language plpgsql as $$
declare a agreements; v_type text;
begin
  v_type := case when tg_op = 'INSERT' then 'dispute.opened' when new.status = 'resolved' and old.status is distinct from 'resolved' then 'dispute.decided' end;
  if v_type is null then return null; end if;
  select * into a from agreements where id = new.agreement_id;
  perform dela_webhook_emit(a.attorney_person, 'attorney', v_type, 'agreement', a.id, jsonb_build_object('object', 'dispute', 'id', new.id, 'agreement_id', a.id, 'state', new.status, 'at', now(), 'link', dela_wh_link('projects', a.gig_id, '&view=agreement')), 'disp:' || new.id || ':' || new.status || ':a');
  perform dela_webhook_emit(a.freelancer_person, 'freelancer', v_type, 'agreement', a.id, jsonb_build_object('object', 'dispute', 'id', new.id, 'agreement_id', a.id, 'state', new.status, 'at', now(), 'link', dela_wh_link('work', a.gig_id, '&view=agreement')), 'disp:' || new.id || ':' || new.status || ':f');
  return null;
end $$;

create or replace function dela_wh_bench() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.status = 'invited' then
    perform dela_webhook_emit(new.freelancer_person, 'freelancer', 'bench.invited', 'bench', new.id, jsonb_build_object('object', 'bench_invitation', 'id', new.id, 'state', new.status, 'at', now(), 'link', dela_site_link('/dela?tab=work')), 'bench:' || new.id || ':invited');
  elsif tg_op = 'UPDATE' and new.status = 'active' and old.status = 'invited' then
    perform dela_webhook_emit(new.invited_by, 'attorney', 'bench.accepted', 'bench', new.id, jsonb_build_object('object', 'bench_member', 'id', new.id, 'state', new.status, 'at', now(), 'link', dela_site_link('/dela?tab=talent&view=bench')), 'bench:' || new.id || ':active');
  end if;
  return null;
end $$;

create or replace function dela_wh_reviews() returns trigger language plpgsql as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    perform dela_webhook_emit(new.subject_person, case when new.direction = 'of_freelancer' then 'freelancer' else 'attorney' end, 'review.received', 'review', new.id,
      jsonb_build_object('object', 'review', 'id', new.id, 'state', new.status, 'at', now(), 'link', dela_site_link(case when new.direction = 'of_freelancer' then '/dela?tab=profile' else '/dela?tab=projects' end)), 'rev:' || new.id || ':published');
  end if;
  return null;
end $$;

-- ---------- Reviews ----------
create or replace function dela_review_questions(p_direction text) returns text[] language sql immutable as $$
  select case when p_direction = 'of_freelancer' then array['quality', 'deadlines', 'communication', 'followed_playbook'] else array['instructions', 'timely_review', 'fair_changes', 'communication'] end
$$;

-- Ask both people for a review once an engagement is complete (the closeout), and remind once later
create or replace function dela_review_ask(p_agreement uuid) returns void language plpgsql as $$
begin
  if not dela_switch_on('reviews', (select attorney_person from agreements where id = p_agreement)) then return; end if;
  perform dela_engagement_notify(p_agreement, 'both', 'How did it go?', 'The engagement is complete. Please write a short review, so other members can hire with confidence. It is never needed to get paid or to keep access. You can write it for ' || dela_int_setting('reviews.window_days', 60) || ' days.', 'reviewask' || p_agreement::text);
  perform dela_job_enqueue('review_tick', jsonb_build_object('agreement_id', p_agreement, 'kind', 'reminder'), now() + make_interval(days => dela_int_setting('reviews.reminder_days', 7)), 'revrem:' || p_agreement::text, null);
end $$;

create or replace function dela_review_tick(p jsonb) returns jsonb language plpgsql as $$
declare a agreements;
begin
  select * into a from agreements where id = (p->>'agreement_id')::uuid;
  if a.id is null or a.status <> 'completed' then return jsonb_build_object('ok', true, 'skipped', true); end if;
  if not exists (select 1 from reviews where agreement_id = a.id and direction = 'of_freelancer') then
    perform dela_engagement_notify(a.id, 'attorney', 'Reminder: review the freelancer', 'You can still write a short review of the freelancer for this engagement.', 'revrem' || a.id::text, false);
  end if;
  if not exists (select 1 from reviews where agreement_id = a.id and direction = 'of_attorney') then
    perform dela_engagement_notify(a.id, 'freelancer', 'Reminder: review the attorney', 'You can still write a short review of the attorney for this engagement.', 'revrem' || a.id::text, false);
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- What this person can do about reviews on one engagement
create or replace function dela_review_state(p_person uuid, p_side text, p_agreement uuid) returns jsonb language plpgsql stable as $$
declare a agreements; v_role text := dela_agreement_role(p_person, p_side, p_agreement); v_dir text; r reviews; them reviews; v_until timestamptz;
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into a from agreements where id = p_agreement;
  v_dir := case when v_role = 'attorney' then 'of_freelancer' else 'of_attorney' end;
  select * into r from reviews where agreement_id = a.id and direction = v_dir;
  select * into them from reviews where agreement_id = a.id and direction <> v_dir and status = 'published';
  v_until := a.completed_at + make_interval(days => dela_int_setting('reviews.window_days', 60));
  return jsonb_build_object('ok', true, 'on', dela_switch_on('reviews', p_person), 'direction', v_dir, 'questions', to_jsonb(dela_review_questions(v_dir)),
    'freelancer_person', case when v_role = 'attorney' then a.freelancer_person end,
    'can_write', a.status = 'completed' and r.id is null and now() <= v_until, 'write_until', v_until, 'completed', a.status = 'completed',
    'mine', case when r.id is not null then jsonb_build_object('id', r.id, 'ratings', r.ratings, 'would_again', r.would_again, 'body', r.body, 'status', r.status, 'edited', r.edited_at is not null, 'created_at', r.created_at,
      'can_edit', r.status <> 'removed' and now() <= r.created_at + make_interval(days => dela_int_setting('reviews.edit_window_days', 14)), 'response', case when r.response_status = 'published' then r.response end,
      'appeal_status', r.appeal_status, 'can_appeal', r.status = 'removed' and r.appeal_status = 'none') end,
    'about_me', case when them.id is not null then jsonb_build_object('id', them.id, 'ratings', them.ratings, 'would_again', them.would_again, 'body', them.body, 'edited', them.edited_at is not null, 'created_at', them.created_at,
      'response', them.response, 'response_status', them.response_status, 'can_respond', them.response_status = 'none' or (them.response_status = 'published' and now() <= them.response_at + make_interval(days => dela_int_setting('reviews.response_edit_days', 14)))) end,
    'bench', case when v_role = 'attorney' then (select jsonb_build_object('id', b.id, 'status', b.status, 'kind', b.kind) from bench_members b
        where b.freelancer_person = a.freelancer_person and b.status in ('invited', 'active') and ((b.kind = 'personal' and b.owner_person = p_person) or (b.kind = 'firm' and b.org_id = a.attorney_org)) order by b.created_at desc limit 1) end);
end $$;

-- Write or edit a review. Published straight away unless the api found something to hold (never for being negative).
create or replace function dela_review_save(p_person uuid, p_side text, p_agreement uuid, p jsonb) returns jsonb language plpgsql as $$
declare a agreements; v_role text := dela_agreement_role(p_person, p_side, p_agreement); v_dir text; r reviews; q text; v_r jsonb := '{}'; n int;
  v_held boolean := coalesce((p->>'held')::boolean, false); v_kinds text[] := array(select jsonb_array_elements_text(coalesce(p->'held_kinds', '[]')));
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('reviews', p_person) then return jsonb_build_object('ok', false, 'reason', 'reviews_off'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  select * into a from agreements where id = p_agreement;
  -- Only a completed Lawfecta engagement qualifies (1A section 24)
  if a.status <> 'completed' then return jsonb_build_object('ok', false, 'reason', 'not_completed'); end if;
  v_dir := case when v_role = 'attorney' then 'of_freelancer' else 'of_attorney' end;
  foreach q in array dela_review_questions(v_dir) loop
    n := case when jsonb_typeof(p->'ratings'->q) = 'number' then (p->'ratings'->>q)::numeric::int end;
    if n is null or n < 1 or n > 5 then return jsonb_build_object('ok', false, 'reason', 'rate_every_question', 'question', q); end if;
    v_r := v_r || jsonb_build_object(q, n);
  end loop;
  if jsonb_typeof(p->'would_again') is distinct from 'boolean' then return jsonb_build_object('ok', false, 'reason', 'say_would_again'); end if;
  if length(trim(coalesce(p->>'body', ''))) < 10 then return jsonb_build_object('ok', false, 'reason', 'write_a_little'); end if;
  select * into r from reviews where agreement_id = a.id and direction = v_dir for update;
  if r.id is null then
    if now() > a.completed_at + make_interval(days => dela_int_setting('reviews.window_days', 60)) then return jsonb_build_object('ok', false, 'reason', 'review_time_over'); end if;
    insert into reviews (agreement_id, direction, author_person, subject_person, ratings, would_again, body, status, held_kinds, request_id)
    values (a.id, v_dir, p_person, case when v_dir = 'of_freelancer' then a.freelancer_person else a.attorney_person end, v_r, (p->>'would_again')::boolean, left(trim(p->>'body'), 3000),
      case when v_held then 'held' else 'published' end, v_kinds, coalesce(p->>'request_id', '')) returning * into r;
    if v_held then
      insert into review_moderation (review_id, action, note) values (r.id, 'held', array_to_string(v_kinds, ', '));
      perform dela_alert('reviews', 'A review is held for a check', 'A review may include ' || array_to_string(v_kinds, ', ') || '. See the admin Reviews and bench tab.', 'revheld:' || r.id::text);
    else
      perform dela_notify(jsonb_build_object('person_id', r.subject_person, 'side', case when v_dir = 'of_freelancer' then 'freelancer' else 'attorney' end, 'kind', 'review', 'email', true,
        'title', 'You have a new review', 'body', 'A review of your work on a completed engagement was published. You can read it and post one response.',
        'link', '/dela?tab=' || case when v_dir = 'of_freelancer' then 'work' else 'projects' end || '&gig=' || a.gig_id::text || '&view=agreement', 'dedupe_key', 'review:' || r.id::text));
    end if;
    return jsonb_build_object('ok', true, 'id', r.id, 'status', r.status);
  end if;
  -- An edit: within the edit window; the earlier version is kept
  if r.request_id = coalesce(p->>'request_id', '-') then return jsonb_build_object('ok', true, 'duplicate', true, 'id', r.id, 'status', r.status); end if;
  if r.status = 'removed' then return jsonb_build_object('ok', false, 'reason', 'review_removed'); end if;
  if now() > r.created_at + make_interval(days => dela_int_setting('reviews.edit_window_days', 14)) then return jsonb_build_object('ok', false, 'reason', 'edit_time_over'); end if;
  if r.ratings = v_r and r.would_again = (p->>'would_again')::boolean and r.body = left(trim(p->>'body'), 3000) then return jsonb_build_object('ok', true, 'duplicate', true, 'id', r.id, 'status', r.status); end if;
  insert into review_versions (review_id, part, ratings, would_again, body) values (r.id, 'review', r.ratings, r.would_again, r.body);
  update reviews set ratings = v_r, would_again = (p->>'would_again')::boolean, body = left(trim(p->>'body'), 3000), version = version + 1, edited_at = now(), request_id = coalesce(p->>'request_id', ''),
    status = case when v_held then 'held' else status end, held_kinds = case when v_held then v_kinds else held_kinds end where id = r.id returning * into r;
  if v_held then insert into review_moderation (review_id, action, note) values (r.id, 'held_on_edit', array_to_string(v_kinds, ', '));
    perform dela_alert('reviews', 'An edited review is held for a check', 'See the admin Reviews and bench tab.', 'revheld:' || r.id::text || ':' || r.version); end if;
  return jsonb_build_object('ok', true, 'id', r.id, 'status', r.status, 'edited', true);
end $$;

-- One public response by the person reviewed, editable for a while
create or replace function dela_review_respond(p_person uuid, p_side text, p_review uuid, p_body text, p_held boolean) returns jsonb language plpgsql as $$
declare r reviews;
begin
  select * into r from reviews where id = p_review for update;
  if r.id is null or r.subject_person <> p_person or r.status <> 'published' or (r.direction = 'of_freelancer') <> (p_side = 'freelancer') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('reviews', p_person) then return jsonb_build_object('ok', false, 'reason', 'reviews_off'); end if;
  if length(trim(coalesce(p_body, ''))) < 2 then return jsonb_build_object('ok', false, 'reason', 'write_a_little'); end if;
  if r.response_status in ('published', 'held') then
    if r.response = left(trim(p_body), 2000) then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    if now() > r.response_at + make_interval(days => dela_int_setting('reviews.response_edit_days', 14)) then return jsonb_build_object('ok', false, 'reason', 'edit_time_over'); end if;
    insert into review_versions (review_id, part, body) values (r.id, 'response', r.response);
    update reviews set response = left(trim(p_body), 2000), response_edited_at = now(), response_status = case when p_held then 'held' else 'published' end where id = r.id;
  elsif r.response_status = 'removed' then return jsonb_build_object('ok', false, 'reason', 'not_now');
  else
    update reviews set response = left(trim(p_body), 2000), response_at = now(), response_status = case when p_held then 'held' else 'published' end where id = r.id;
  end if;
  if p_held then insert into review_moderation (review_id, action, note) values (r.id, 'response_held', ''); perform dela_alert('reviews', 'A review response is held for a check', 'See the admin Reviews and bench tab.', 'resheld:' || r.id::text); end if;
  return jsonb_build_object('ok', true, 'held', p_held);
end $$;

create or replace function dela_review_report(p_person uuid, p_side text, p_review uuid, p_reason text) returns jsonb language plpgsql as $$
declare r reviews; v_id uuid;
begin
  select * into r from reviews where id = p_review;
  if r.id is null or r.status <> 'published' or p_person not in (r.author_person, r.subject_person) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if coalesce(trim(p_reason), '') = '' then return jsonb_build_object('ok', false, 'reason', 'say_why'); end if;
  select id into v_id from review_reports where review_id = r.id and reporter = p_person and status = 'open';
  if v_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_id); end if;
  insert into review_reports (review_id, reporter, reason) values (r.id, p_person, left(p_reason, 2000)) returning id into v_id;
  perform dela_alert('reviews', 'A review was reported', 'A member reported a review. Decide under the review policy (a negative opinion stays up). Admin Reviews and bench tab.', 'revrep:' || v_id::text);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function dela_review_appeal(p_person uuid, p_review uuid, p_text text) returns jsonb language plpgsql as $$
declare r reviews; v_last timestamptz;
begin
  select * into r from reviews where id = p_review for update;
  if r.id is null or r.author_person <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if r.status <> 'removed' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if r.appeal_status <> 'none' then return jsonb_build_object('ok', false, 'reason', 'already_appealed'); end if;
  select max(at) into v_last from review_moderation where review_id = r.id and action in ('removed', 'held_removed');
  if v_last < now() - make_interval(days => dela_int_setting('reviews.appeal_days', 14)) then return jsonb_build_object('ok', false, 'reason', 'appeal_time_over'); end if;
  if coalesce(trim(p_text), '') = '' then return jsonb_build_object('ok', false, 'reason', 'say_why'); end if;
  update reviews set appeal_text = left(p_text, 2000), appeal_at = now(), appeal_status = 'open' where id = r.id;
  insert into review_moderation (review_id, action, note, actor) values (r.id, 'appealed', left(p_text, 300), p_person);
  perform dela_alert('reviews', 'A review decision was appealed', 'See the admin Reviews and bench tab.', 'revapp:' || r.id::text);
  return jsonb_build_object('ok', true);
end $$;

-- Reviews of one member on one side, for a signed-in member (reviews.visibility = members). Averages show after the set number.
create or replace function dela_reviews_of(p_viewer uuid, p_subject uuid, p_side text) returns jsonb language plpgsql stable as $$
declare v_dir text := case when p_side = 'freelancer' then 'of_freelancer' else 'of_attorney' end; v_n int; v_min int := dela_int_setting('reviews.min_to_show_average', 3);
begin
  if not dela_switch_on('reviews', p_viewer) then return jsonb_build_object('ok', true, 'on', false); end if;
  if not exists (select 1 from side_profiles s where s.person_id = p_viewer and s.status <> 'closed') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select count(*) into v_n from reviews where subject_person = p_subject and direction = v_dir and status = 'published';
  return jsonb_build_object('ok', true, 'on', true, 'count', v_n, 'min_for_average', v_min, 'questions', to_jsonb(dela_review_questions(v_dir)),
    'averages', case when v_n >= v_min then (select jsonb_object_agg(q, (select round(avg((r.ratings->>q)::numeric), 1) from reviews r where r.subject_person = p_subject and r.direction = v_dir and r.status = 'published'))
      from unnest(dela_review_questions(v_dir)) q) end,
    'would_again_pct', case when v_n >= v_min then (select round(100.0 * count(*) filter (where would_again) / count(*)) from reviews where subject_person = p_subject and direction = v_dir and status = 'published') end,
    'reviews', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'ratings', r.ratings, 'would_again', r.would_again, 'body', r.body, 'edited', r.edited_at is not null,
        'month', to_char(r.created_at, 'FMMonth YYYY'), 'practice_area', coalesce(g.public->>'practice_area', ''),
        'by', case when v_dir = 'of_freelancer' then coalesce(nullif((select mp.body->>'firm_name' from member_profiles mp where mp.person_id = r.author_person and mp.side = 'attorney'), ''), 'An attorney')
              else coalesce(nullif((select mp.body->>'first_name' from member_profiles mp where mp.person_id = r.author_person and mp.side = 'freelancer'), ''), 'A freelancer') end,
        'response', case when r.response_status = 'published' then r.response end, 'mine', r.author_person = p_viewer, 'about_me', r.subject_person = p_viewer) order by r.created_at desc), '[]')
      from reviews r join agreements a on a.id = r.agreement_id join gigs g on g.id = a.gig_id where r.subject_person = p_subject and r.direction = v_dir and r.status = 'published'),
    'past_clients', case when p_side = 'freelancer' and dela_switch_on('past_client_reviews', p_viewer) then (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'ratings', x.ratings, 'would_again', x.would_again, 'body', x.body,
        'by', x.reviewer_name, 'state', x.reviewer_state, 'month', to_char(x.created_at, 'FMMonth YYYY')) order by x.created_at desc), '[]') from past_reviews x where x.freelancer_person = p_subject and x.status = 'published') end);
end $$;

-- A short review summary for lists (matches, proposals, Talent, the bench)
create or replace function dela_review_summary(p_subject uuid, p_side text) returns jsonb language sql stable as $$
  select jsonb_build_object('count', count(*), 'average', case when count(*) >= dela_int_setting('reviews.min_to_show_average', 3)
      then round(avg((select avg(v::numeric) from jsonb_each_text(r.ratings) e(k, v))), 1) end)
  from reviews r where r.subject_person = p_subject and r.direction = case when p_side = 'freelancer' then 'of_freelancer' else 'of_attorney' end and r.status = 'published'
$$;

-- ---------- Reviews from past clients outside Lawfecta ----------
create or replace function dela_past_review_request(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_email text := lower(trim(coalesce(p->>'email', ''))); v_hash text; v_month int; v_total int; v_n uuid; v_id uuid; v_name text := left(trim(coalesce(p->>'name', '')), 120); v_me text;
begin
  if not dela_switch_on('past_client_reviews', p_person) then return jsonb_build_object('ok', false, 'reason', 'past_reviews_off'); end if;
  if not exists (select 1 from side_profiles where person_id = p_person and side = 'freelancer' and status <> 'closed') then return jsonb_build_object('ok', false, 'reason', 'freelancers_only'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then return jsonb_build_object('ok', false, 'reason', 'bad_email'); end if;
  if length(v_name) < 2 then return jsonb_build_object('ok', false, 'reason', 'name_needed'); end if;
  if coalesce(p->>'token', '') = '' or coalesce(p->>'token_hash', '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if v_email = lower((select email from people where id = p_person)) then return jsonb_build_object('ok', false, 'reason', 'not_yourself'); end if;
  v_hash := encode(digest(v_email, 'sha256'), 'hex');
  if exists (select 1 from past_review_optouts where email_hash = v_hash) then return jsonb_build_object('ok', false, 'reason', 'opted_out'); end if;
  perform pg_advisory_xact_lock(hashtextextended('pastrev:' || p_person::text, 0));
  if exists (select 1 from past_review_requests where freelancer_person = p_person and email_hash = v_hash and created_at > now() - make_interval(days => dela_int_setting('past_reviews.same_email_days', 90))) then
    return jsonb_build_object('ok', false, 'reason', 'asked_recently', 'days', dela_int_setting('past_reviews.same_email_days', 90));
  end if;
  select count(*) filter (where created_at > date_trunc('month', now())), count(*) into v_month, v_total from past_review_requests where freelancer_person = p_person;
  if v_month >= dela_int_setting('past_reviews.requests_per_month', 5) then return jsonb_build_object('ok', false, 'reason', 'limit_reached', 'limit', dela_int_setting('past_reviews.requests_per_month', 5), 'period', 'month'); end if;
  if v_total >= dela_int_setting('past_reviews.max_total', 20) then return jsonb_build_object('ok', false, 'reason', 'limit_reached', 'limit', dela_int_setting('past_reviews.max_total', 20), 'period', 'total'); end if;
  v_me := dela_person_name(p_person, 'freelancer');
  insert into past_review_requests (freelancer_person, client_name, email, email_hash, token_hash, expires_at)
  values (p_person, v_name, v_email, v_hash, p->>'token_hash', now() + make_interval(days => dela_int_setting('past_reviews.link_days', 30))) returning id into v_id;
  -- Neutral wording written by DELA; the freelancer cannot add a message (no pressure, no rewards)
  insert into notifications (person_id, side, kind, channel, essential, title, body, link, dedupe_key, to_email)
  values (p_person, 'freelancer', 'past_review', 'email', true, v_me || ' asked for a review of their work',
    'Hello ' || v_name || '. ' || v_me || ', a freelancer on Lawfecta, says they did work for you outside Lawfecta and asked if you would write a short, honest review. It takes about two minutes. '
      || 'You will confirm you are an attorney with your state and bar number. There is no reward for reviewing, and you can say no. The link works for ' || dela_int_setting('past_reviews.link_days', 30)
      || ' days. If you do not want any more requests like this, open the link and click "Do not ask me again".',
    '/dela?past_review=' || (p->>'token'), 'pastrev:' || v_id::text, v_email)
  returning id into v_n;
  update past_review_requests set notification_id = v_n where id = v_id;
  perform dela_job_enqueue('send_email', jsonb_build_object('notification_id', v_n), now(), 'email:' || v_n::text, p_person);
  return jsonb_build_object('ok', true, 'id', v_id, 'left_this_month', dela_int_setting('past_reviews.requests_per_month', 5) - v_month - 1);
end $$;

create or replace function dela_past_requests(p_person uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('ok', true, 'on', dela_switch_on('past_client_reviews', p_person),
    'per_month', dela_int_setting('past_reviews.requests_per_month', 5), 'max_total', dela_int_setting('past_reviews.max_total', 20),
    'used_this_month', (select count(*) from past_review_requests where freelancer_person = p_person and created_at > date_trunc('month', now())),
    'used_total', (select count(*) from past_review_requests where freelancer_person = p_person),
    'requests', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.client_name, 'email', r.email, 'status', case when r.status = 'sent' and r.expires_at < now() then 'expired' else r.status end, 'created_at', r.created_at) order by r.created_at desc), '[]')
      from past_review_requests r where r.freelancer_person = p_person))
$$;

-- The public page a past client opens from the email (no Lawfecta login)
create or replace function dela_past_review_get(p_token_hash text) returns jsonb language plpgsql stable as $$
declare r past_review_requests; mp member_profiles;
begin
  select * into r from past_review_requests where token_hash = p_token_hash;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'link_not_valid'); end if;
  if r.status = 'done' then return jsonb_build_object('ok', false, 'reason', 'already_reviewed'); end if;
  if r.status = 'opted_out' then return jsonb_build_object('ok', false, 'reason', 'opted_out'); end if;
  if r.expires_at < now() or not dela_switch_on('past_client_reviews', r.freelancer_person) then return jsonb_build_object('ok', false, 'reason', 'link_expired'); end if;
  select * into mp from member_profiles where person_id = r.freelancer_person and side = 'freelancer';
  return jsonb_build_object('ok', true, 'freelancer', dela_person_name(r.freelancer_person, 'freelancer'), 'headline', coalesce(mp.body->>'headline', ''), 'your_name', r.client_name,
    'questions', to_jsonb(dela_review_questions('of_freelancer')));
end $$;

create or replace function dela_past_review_submit(p_token_hash text, p jsonb) returns jsonb language plpgsql as $$
declare r past_review_requests; q text; n int; v_r jsonb := '{}'; v_state text := upper(trim(coalesce(p->>'state', ''))); v_bar text := upper(regexp_replace(coalesce(p->>'bar_number', ''), '\s', '', 'g'));
  v_held boolean := coalesce((p->>'held')::boolean, false); v_id uuid;
begin
  select * into r from past_review_requests where token_hash = p_token_hash for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'link_not_valid'); end if;
  if r.status = 'done' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if r.status <> 'sent' or r.expires_at < now() or not dela_switch_on('past_client_reviews', r.freelancer_person) then return jsonb_build_object('ok', false, 'reason', 'link_expired'); end if;
  if length(trim(coalesce(p->>'name', ''))) < 2 then return jsonb_build_object('ok', false, 'reason', 'name_needed'); end if;
  if v_state !~ '^[A-Z]{2}$' then return jsonb_build_object('ok', false, 'reason', 'bad_state'); end if;
  if v_bar !~ '^[A-Z0-9-]{3,20}$' then return jsonb_build_object('ok', false, 'reason', 'bad_bar_number'); end if;
  if coalesce((p->>'confirm')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'confirm_needed'); end if;
  foreach q in array dela_review_questions('of_freelancer') loop
    n := case when jsonb_typeof(p->'ratings'->q) = 'number' then (p->'ratings'->>q)::numeric::int end;
    if n is null or n < 1 or n > 5 then return jsonb_build_object('ok', false, 'reason', 'rate_every_question', 'question', q); end if;
    v_r := v_r || jsonb_build_object(q, n);
  end loop;
  if jsonb_typeof(p->'would_again') is distinct from 'boolean' then return jsonb_build_object('ok', false, 'reason', 'say_would_again'); end if;
  if length(trim(coalesce(p->>'body', ''))) < 10 then return jsonb_build_object('ok', false, 'reason', 'write_a_little'); end if;
  insert into past_reviews (request_id, freelancer_person, reviewer_name, reviewer_state, bar_number, ratings, would_again, body, status, held_kinds)
  values (r.id, r.freelancer_person, left(trim(p->>'name'), 120), v_state, v_bar, v_r, (p->>'would_again')::boolean, left(trim(p->>'body'), 3000), case when v_held then 'held' else 'published' end,
    array(select jsonb_array_elements_text(coalesce(p->'held_kinds', '[]')))) returning id into v_id;
  update past_review_requests set status = 'done' where id = r.id;
  if v_held then perform dela_alert('reviews', 'A past-client review is held for a check', 'See the admin Reviews and bench tab.', 'pastheld:' || v_id::text);
  else perform dela_notify(jsonb_build_object('person_id', r.freelancer_person, 'side', 'freelancer', 'kind', 'review', 'email', true, 'title', r.client_name || ' wrote a review',
    'body', 'A past client from outside Lawfecta wrote a review. It shows in its own section on your profile.', 'link', '/dela?tab=profile', 'dedupe_key', 'pastrev:' || v_id::text)); end if;
  return jsonb_build_object('ok', true, 'held', v_held);
end $$;

create or replace function dela_past_review_optout(p_token_hash text) returns jsonb language plpgsql as $$
declare r past_review_requests;
begin
  select * into r from past_review_requests where token_hash = p_token_hash for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'link_not_valid'); end if;
  insert into past_review_optouts (email_hash) values (r.email_hash) on conflict do nothing;
  update past_review_requests set status = 'opted_out' where email_hash = r.email_hash and status = 'sent';
  return jsonb_build_object('ok', true);
end $$;

-- ---------- The bench ----------
create or replace function dela_firm_bench_allowed(p_person uuid) returns boolean language sql stable as $$
  select exists (select 1 from side_profiles s where s.person_id = (select o.owner_person_id from organizations o where o.id = dela_side_org(p_person, 'attorney')) and s.side = 'attorney'
    and coalesce(dela_setting('bench.firm_plans'), '["att_business"]') ? s.plan_code)
$$;

-- What this person may do with one bench entry: 'manager' (invite, remove), 'staff' (see and invite from a firm bench), 'freelancer', or ''
create or replace function dela_bench_role(p_person uuid, p_side text, p_bench uuid) returns text language sql stable as $$
  select coalesce((select case
    when p_side = 'freelancer' and b.freelancer_person = p_person then 'freelancer'
    when p_side = 'attorney' and b.kind = 'personal' and b.owner_person = p_person then 'manager'
    when p_side = 'attorney' and b.kind = 'firm' and dela_firm_role(p_person, b.org_id) in ('owner', 'manager') then 'manager'
    when p_side = 'attorney' and b.kind = 'firm' and dela_firm_role(p_person, b.org_id) <> '' then 'staff'
    else '' end from bench_members b where b.id = p_bench), '')
$$;

create or replace function dela_bench_invite(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_free uuid := (p->>'freelancer')::uuid; v_kind text := coalesce(p->>'kind', 'personal'); v_org uuid := dela_side_org(p_person, 'attorney'); v_id uuid; v_max int; v_n int;
begin
  if not dela_switch_on('bench', p_person) then return jsonb_build_object('ok', false, 'reason', 'bench_off'); end if;
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'attorneys_only'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  if v_kind not in ('personal', 'firm') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if v_kind = 'firm' and not dela_firm_bench_allowed(p_person) then return jsonb_build_object('ok', false, 'reason', 'firm_bench_business_only'); end if;
  if v_kind = 'firm' and dela_firm_role(p_person, v_org) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'owner_or_manager_only'); end if;
  if v_free is null or v_free = p_person or not exists (select 1 from side_profiles s where s.person_id = v_free and s.side = 'freelancer' and s.status <> 'closed') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select id into v_id from bench_members where kind = v_kind and org_id = v_org and coalesce(owner_person, '00000000-0000-0000-0000-000000000000'::uuid) = case when v_kind = 'personal' then p_person else '00000000-0000-0000-0000-000000000000'::uuid end
    and freelancer_person = v_free and status in ('invited', 'active');
  if v_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_id); end if;
  v_max := (dela_setting('bench.max_size') #>> '{}')::int;
  if v_max is not null and v_kind = 'personal' then
    select count(*) into v_n from bench_members where kind = 'personal' and owner_person = p_person and status in ('invited', 'active');
    if v_n >= v_max then return jsonb_build_object('ok', false, 'reason', 'limit_reached', 'limit', v_max); end if;
  end if;
  insert into bench_members (kind, org_id, owner_person, freelancer_person, note, invited_by, request_id)
  values (v_kind, v_org, case when v_kind = 'personal' then p_person end, v_free, left(coalesce(p->>'note', ''), 600), p_person, coalesce(p->>'request_id', '')) returning id into v_id;
  perform dela_job_enqueue('bench_tick', jsonb_build_object('bench_id', v_id, 'kind', 'expire'), now() + make_interval(days => dela_int_setting('bench.invite_expiry_days', 30)), 'benchexp:' || v_id::text, p_person);
  perform dela_notify(jsonb_build_object('person_id', v_free, 'side', 'freelancer', 'kind', 'bench', 'email', true,
    'title', dela_person_name(p_person, 'attorney') || ' invited you to their bench',
    'body', 'An attorney you can work with again invited you to their ' || case when v_kind = 'firm' then 'firm''s ' else '' end || 'trusted bench. Accepting opens an ongoing conversation; it does not create a contract or any work. Open DELA to accept or decline.',
    'link', '/dela?tab=work&bench=' || v_id::text, 'dedupe_key', 'benchinv:' || v_id::text));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function dela_bench_answer(p_person uuid, p_bench uuid, p_accept boolean) returns jsonb language plpgsql as $$
declare b bench_members; v_thread uuid;
begin
  select * into b from bench_members where id = p_bench for update;
  if b.id is null or b.freelancer_person <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if b.status = 'active' and p_accept then return jsonb_build_object('ok', true, 'duplicate', true, 'thread_id', (select id from threads where bench_id = b.id)); end if;
  if b.status <> 'invited' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if not dela_switch_on('bench', p_person) then return jsonb_build_object('ok', false, 'reason', 'bench_off'); end if;
  if p_accept then
    update bench_members set status = 'active', decided_at = now() where id = b.id;
    insert into threads (bench_id, freelancer_person) values (b.id, b.freelancer_person) on conflict do nothing;
    select id into v_thread from threads where bench_id = b.id;
    perform dela_notify(jsonb_build_object('person_id', b.invited_by, 'side', 'attorney', 'kind', 'bench', 'email', true, 'title', dela_person_name(p_person, 'freelancer') || ' joined your bench',
      'body', 'They accepted your bench invitation. You can message them any time, and invite them to new gigs first.', 'link', '/dela?tab=inbox&thread=' || v_thread::text, 'dedupe_key', 'benchyes:' || b.id::text));
  else
    update bench_members set status = 'declined', decided_at = now() where id = b.id;
  end if;
  return jsonb_build_object('ok', true, 'thread_id', v_thread);
end $$;

-- The freelancer leaves, or the attorney (or firm manager) removes them. The bench conversation closes; paid work records stay.
create or replace function dela_bench_end(p_person uuid, p_side text, p_bench uuid) returns jsonb language plpgsql as $$
declare b bench_members; v_role text := dela_bench_role(p_person, p_side, p_bench);
begin
  if v_role not in ('freelancer', 'manager') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into b from bench_members where id = p_bench for update;
  if b.status not in ('invited', 'active') then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update bench_members set status = case when v_role = 'freelancer' then (case when b.status = 'invited' then 'declined' else 'left' end) else 'removed' end, ended_at = now(), ended_by = p_person where id = b.id;
  update bench_suggestions set status = 'dismissed' where bench_id = b.id and status = 'new';
  return jsonb_build_object('ok', true);
end $$;

-- The bench lists: an attorney's personal bench and (Business firms) the firm bench; a freelancer's invitations and benches
create or replace function dela_bench(p_person uuid, p_side text) returns jsonb language plpgsql stable as $$
declare v_org uuid := dela_side_org(p_person, 'attorney');
begin
  if p_side = 'freelancer' then
    return jsonb_build_object('ok', true, 'on', dela_switch_on('bench', p_person), 'items', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'kind', b.kind, 'status', b.status, 'note', b.note, 'created_at', b.created_at,
        'attorney', dela_person_name(coalesce(b.owner_person, b.invited_by), 'attorney'), 'thread_id', (select t.id from threads t where t.bench_id = b.id)) order by b.created_at desc), '[]')
      from bench_members b where b.freelancer_person = p_person and b.status in ('invited', 'active')));
  end if;
  return jsonb_build_object('ok', true, 'on', dela_switch_on('bench', p_person), 'firm_bench', dela_firm_bench_allowed(p_person), 'can_manage_firm', dela_firm_role(p_person, v_org) in ('owner', 'manager'),
    'digest', coalesce((select bench_digest from member_prefs where person_id = p_person), false),
    'items', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'kind', b.kind, 'status', b.status, 'note', b.note, 'created_at', b.created_at, 'freelancer', b.freelancer_person,
        'name', dela_person_name(b.freelancer_person, 'freelancer'), 'headline', coalesce(mp.body->>'headline', ''), 'readiness', sp.readiness_state,
        'available', sp.readiness_state = 'match_ready', 'availability_confirmed_at', mp.availability_confirmed_at, 'capacity_hours_week', mp.body->'capacity_hours_week',
        'last_engagement', (select max(a.updated_at) from agreements a where a.freelancer_person = b.freelancer_person and a.attorney_org = b.org_id and a.status <> 'canceled'),
        'reviews', dela_review_summary(b.freelancer_person, 'freelancer'), 'role', dela_bench_role(p_person, 'attorney', b.id),
        'thread_id', (select t.id from threads t where t.bench_id = b.id),
        'snoozed_until', (select s.until from bench_snoozes s where s.attorney_person = p_person and s.freelancer_person = b.freelancer_person and s.until > now())) order by b.kind, b.status, b.created_at desc), '[]')
      from bench_members b left join member_profiles mp on mp.person_id = b.freelancer_person and mp.side = 'freelancer' left join side_profiles sp on sp.person_id = b.freelancer_person and sp.side = 'freelancer'
      where b.status in ('invited', 'active') and ((b.kind = 'personal' and b.owner_person = p_person) or (b.kind = 'firm' and b.org_id = v_org and dela_firm_role(p_person, v_org) <> ''))),
    'suggestions', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'freelancer', s.freelancer_person, 'name', dela_person_name(s.freelancer_person, 'freelancer'), 'reason', s.reason, 'gig_id', s.gig_id,
        'gig_title', (select title from gigs where id = s.gig_id), 'playbook_id', s.playbook_id, 'playbook_title', (select title from playbooks where id = s.playbook_id), 'created_at', s.created_at) order by s.created_at desc), '[]')
      from bench_suggestions s where s.attorney_person = p_person and s.status = 'new'
        and not exists (select 1 from bench_snoozes z where z.attorney_person = p_person and z.freelancer_person = s.freelancer_person and z.until > now())));
end $$;

-- Bench freelancers for one gig, with whether each can be invited now
create or replace function dela_gig_bench(p_person uuid, p_gig uuid) returns jsonb language plpgsql stable as $$
declare g gigs;
begin
  if not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('bench', p_person) then return jsonb_build_object('ok', true, 'on', false, 'bench', '[]'::jsonb); end if;
  select * into g from gigs where id = p_gig;
  return jsonb_build_object('ok', true, 'on', true, 'bench', (select coalesce(jsonb_agg(jsonb_build_object('freelancer', x.freelancer_person, 'name', dela_person_name(x.freelancer_person, 'freelancer'), 'kind', x.kind,
      'why_not', dela_freelancer_eligible(x.freelancer_person, p_gig), 'reviews', dela_review_summary(x.freelancer_person, 'freelancer'),
      'invited', exists (select 1 from gig_invitations i where i.gig_id = p_gig and i.freelancer_id = x.freelancer_person))), '[]')
    from (select distinct on (b.freelancer_person) b.* from bench_members b where b.status = 'active' and ((b.kind = 'personal' and b.owner_person = p_person) or (b.kind = 'firm' and b.org_id = g.org_id)) order by b.freelancer_person, b.kind desc) x));
end $$;

-- Suggest available bench freelancers when a gig is posted (never forced over better fits; only those who can be invited now)
create or replace function dela_bench_suggest_for_gig(p_gig uuid) returns void language plpgsql as $$
declare g gigs; b record; v_reason text;
begin
  select * into g from gigs where id = p_gig;
  if g.id is null or not dela_switch_on('bench_suggestions', g.created_by) or not dela_switch_on('bench', g.created_by) then return; end if;
  for b in select distinct on (x.freelancer_person) x.* from bench_members x where x.status = 'active' and ((x.kind = 'personal' and x.owner_person = g.created_by) or (x.kind = 'firm' and x.org_id = g.org_id)) order by x.freelancer_person, x.kind desc loop
    if dela_freelancer_eligible(b.freelancer_person, g.id) <> '' then continue; end if;
    if exists (select 1 from bench_snoozes s where s.attorney_person = g.created_by and s.freelancer_person = b.freelancer_person and s.until > now()) then continue; end if;
    v_reason := 'On your ' || case when b.kind = 'firm' then 'firm''s ' else '' end || 'bench and available now'
      || case when coalesce(g.public->>'practice_area', '') <> '' and exists (select 1 from member_profiles mp, jsonb_array_elements_text(coalesce(mp.body->'practice_areas', '[]')) pa
           where mp.person_id = b.freelancer_person and mp.side = 'freelancer' and pa = g.public->>'practice_area') then '; works in ' || (g.public->>'practice_area') else '' end;
    insert into bench_suggestions (attorney_person, bench_id, freelancer_person, gig_id, reason) values (g.created_by, b.id, b.freelancer_person, g.id, v_reason) on conflict do nothing;
  end loop;
  if exists (select 1 from bench_suggestions where gig_id = g.id and status = 'new') then
    perform dela_notify(jsonb_build_object('person_id', g.created_by, 'side', 'attorney', 'kind', 'bench', 'email', false, 'title', 'Bench freelancers who fit "' || g.title || '"',
      'body', 'Some of your bench freelancers are available for this gig. Invite them first from the gig''s Matches view.', 'link', '/dela?tab=projects&gig=' || g.id::text || '&view=matches', 'dedupe_key', 'benchsug:' || g.id::text));
  end if;
end $$;

-- A new approved playbook: suggest bench freelancers who work in its practice area
create or replace function dela_bench_suggest_for_playbook() returns trigger language plpgsql as $$
declare b record; who uuid; v_area text := coalesce(new.practice_area, '');
begin
  if new.status <> 'approved' or (tg_op = 'UPDATE' and old.status = 'approved') or v_area = '' then return null; end if;
  foreach who in array dela_org_managers(new.org_id) loop
    if not dela_switch_on('bench_suggestions', who) or not dela_switch_on('bench', who) then continue; end if;
    for b in select distinct on (x.freelancer_person) x.* from bench_members x where x.status = 'active' and ((x.kind = 'personal' and x.owner_person = who) or (x.kind = 'firm' and x.org_id = new.org_id)) order by x.freelancer_person, x.kind desc loop
      if not exists (select 1 from member_profiles mp, jsonb_array_elements_text(coalesce(mp.body->'practice_areas', '[]')) pa where mp.person_id = b.freelancer_person and mp.side = 'freelancer' and pa = v_area) then continue; end if;
      if (select readiness_state from side_profiles where person_id = b.freelancer_person and side = 'freelancer') <> 'match_ready' then continue; end if;
      if exists (select 1 from bench_snoozes s where s.attorney_person = who and s.freelancer_person = b.freelancer_person and s.until > now()) then continue; end if;
      insert into bench_suggestions (attorney_person, bench_id, freelancer_person, playbook_id, reason) values (who, b.id, b.freelancer_person, new.id, 'On your bench, available, and works in ' || v_area)
      on conflict do nothing;
    end loop;
  end loop;
  return null;
end $$;
drop trigger if exists bench_playbooks on playbooks;
create trigger bench_playbooks after insert or update of status on playbooks for each row execute function dela_bench_suggest_for_playbook();

create or replace function dela_bench_suggestion_act(p_person uuid, p_suggestion uuid, p_action text) returns jsonb language plpgsql as $$
declare s bench_suggestions;
begin
  select * into s from bench_suggestions where id = p_suggestion and attorney_person = p_person for update;
  if s.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_action = 'dismiss' then update bench_suggestions set status = 'dismissed' where id = s.id;
  elsif p_action = 'snooze' then
    insert into bench_snoozes (attorney_person, freelancer_person, until) values (p_person, s.freelancer_person, now() + make_interval(days => dela_int_setting('bench.snooze_days', 30)))
    on conflict (attorney_person, freelancer_person) do update set until = excluded.until;
    update bench_suggestions set status = 'dismissed' where attorney_person = p_person and freelancer_person = s.freelancer_person and status = 'new';
  elsif p_action = 'used' then update bench_suggestions set status = 'used' where id = s.id;
  else return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_bench_digest_set(p_person uuid, p_on boolean) returns jsonb language plpgsql as $$
begin
  insert into member_prefs (person_id, bench_digest) values (p_person, p_on) on conflict (person_id) do update set bench_digest = excluded.bench_digest, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_bench_tick(p jsonb) returns jsonb language plpgsql as $$
begin
  if p->>'kind' = 'expire' then
    update bench_members set status = 'expired', ended_at = now() where id = (p->>'bench_id')::uuid and status = 'invited';
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Every day: on Mondays, a weekly bench summary for attorneys who turned it on
create or replace function dela_bench_daily() returns jsonb language plpgsql as $$
declare r record; n int := 0;
begin
  if extract(isodow from now() at time zone dela_tz()) <> 1 then return jsonb_build_object('ok', true, 'skipped', true); end if;
  for r in select s.attorney_person, count(*) c from bench_suggestions s join member_prefs mp on mp.person_id = s.attorney_person and mp.bench_digest
           where s.status = 'new' and s.created_at > now() - interval '7 days' group by s.attorney_person loop
    perform dela_notify(jsonb_build_object('person_id', r.attorney_person, 'side', 'attorney', 'kind', 'bench', 'email', true, 'title', 'Your bench this week',
      'body', r.c || ' suggestion' || case when r.c = 1 then '' else 's' end || ' from your bench for new work. Open Talent, My bench, to see them.', 'link', '/dela?tab=talent&view=bench',
      'dedupe_key', 'benchweek:' || r.attorney_person::text || ':' || to_char(now(), 'IYYY-IW')));
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'sent', n);
end $$;

-- ---------- Admin ----------
create or replace function dela_admin_reviews(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  return jsonb_build_object(
    'switches', (select jsonb_object_agg(key, state) from feature_switches where key in ('reviews', 'past_client_reviews', 'bench', 'bench_suggestions', 'member_webhooks')),
    'counts', jsonb_build_object('published', (select count(*) from reviews where status = 'published'), 'held', (select count(*) from reviews where status = 'held'),
      'removed', (select count(*) from reviews where status = 'removed'), 'past_published', (select count(*) from past_reviews where status = 'published'),
      'past_requests_30d', (select count(*) from past_review_requests where created_at > now() - interval '30 days'), 'bench_active', (select count(*) from bench_members where status = 'active'),
      'webhook_endpoints', (select count(*) from webhook_endpoints where status = 'active'), 'webhooks_paused', (select count(*) from webhook_endpoints where status = 'paused' and paused_reason = 'failures')),
    'held', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'kind', 'review', 'direction', r.direction, 'body', r.body, 'kinds', to_jsonb(r.held_kinds), 'author', pa.display_name, 'subject', ps.display_name, 'created_at', r.created_at) order by r.created_at), '[]')
      from reviews r join people pa on pa.id = r.author_person join people ps on ps.id = r.subject_person where r.status = 'held'),
    'held_responses', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'response', r.response, 'subject', ps.display_name) order by r.response_at), '[]')
      from reviews r join people ps on ps.id = r.subject_person where r.response_status = 'held'),
    'held_past', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'body', x.body, 'kinds', to_jsonb(x.held_kinds), 'by', x.reviewer_name, 'state', x.reviewer_state, 'bar_number', x.bar_number, 'freelancer', pe.display_name) order by x.created_at), '[]')
      from past_reviews x join people pe on pe.id = x.freelancer_person where x.status = 'held'),
    'reports', (select coalesce(jsonb_agg(jsonb_build_object('id', rp.id, 'review_id', r.id, 'reason', rp.reason, 'by', pe.display_name, 'by_author', rp.reporter = r.author_person, 'body', r.body, 'ratings', r.ratings, 'created_at', rp.created_at) order by rp.created_at), '[]')
      from review_reports rp join reviews r on r.id = rp.review_id join people pe on pe.id = rp.reporter where rp.status = 'open'),
    'appeals', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'body', r.body, 'appeal', r.appeal_text, 'author', pe.display_name, 'at', r.appeal_at,
        'reason_removed', (select m.note from review_moderation m where m.review_id = r.id and m.action in ('removed', 'held_removed') order by m.id desc limit 1)) order by r.appeal_at), '[]')
      from reviews r join people pe on pe.id = r.author_person where r.appeal_status = 'open'),
    'past_checks', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'by', x.reviewer_name, 'state', x.reviewer_state, 'bar_number', x.bar_number, 'freelancer', pe.display_name, 'created_at', x.created_at) order by x.created_at desc), '[]')
      from (select * from past_reviews where status = 'published' order by created_at desc limit 30) x join people pe on pe.id = x.freelancer_person),
    'webhooks_paused', (select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'person', pe.display_name, 'side', w.side, 'host', split_part(split_part(w.url, '://', 2), '/', 1), 'failures', w.failures, 'last_error', w.last_error, 'updated_at', w.updated_at)), '[]')
      from webhook_endpoints w join people pe on pe.id = w.person_id where w.status = 'paused' and w.paused_reason = 'failures'));
end $$;

-- Publish or remove a held review, response or past-client review; decide a report; decide an appeal. Always with a reason, kept for ever.
create or replace function dela_admin_review_decide(p_actor uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_kind text := p->>'kind'; v_id uuid := (p->>'id')::uuid; v_action text := p->>'action'; v_note text := left(trim(coalesce(p->>'note', '')), 1000); r reviews; rp review_reports; x past_reviews;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  if v_note = '' then return jsonb_build_object('ok', false, 'reason', 'say_why'); end if;
  if v_kind = 'held' then
    select * into r from reviews where id = v_id and status = 'held' for update;
    if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
    update reviews set status = case when v_action = 'publish' then 'published' else 'removed' end where id = r.id;
    insert into review_moderation (review_id, action, note, actor) values (r.id, case when v_action = 'publish' then 'held_published' else 'held_removed' end, v_note, p_actor);
    if v_action <> 'publish' then
      perform dela_notify(jsonb_build_object('person_id', r.author_person, 'side', case when r.direction = 'of_freelancer' then 'attorney' else 'freelancer' end, 'kind', 'review', 'email', true,
        'title', 'Your review was not published', 'body', 'The Lawfecta Team did not publish your review: ' || v_note || '. You can appeal once within ' || dela_int_setting('reviews.appeal_days', 14) || ' days on the engagement page.',
        'link', '/dela', 'dedupe_key', 'revno:' || r.id::text));
    end if;
  elsif v_kind = 'response' then
    select * into r from reviews where id = v_id and response_status = 'held' for update;
    if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
    update reviews set response_status = case when v_action = 'publish' then 'published' else 'removed' end where id = r.id;
    insert into review_moderation (review_id, action, note, actor) values (r.id, 'response_' || case when v_action = 'publish' then 'published' else 'removed' end, v_note, p_actor);
  elsif v_kind = 'past' then
    select * into x from past_reviews where id = v_id and status = 'held' for update;
    if x.id is null then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
    update past_reviews set status = case when v_action = 'publish' then 'published' else 'removed' end where id = x.id;
    perform dela_audit('staff', p_actor, 'past_review_' || v_action, 'past_review', x.id::text, jsonb_build_object('note', v_note));
  elsif v_kind = 'report' then
    select * into rp from review_reports where id = v_id and status = 'open' for update;
    if rp.id is null then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
    update review_reports set status = case when v_action = 'remove' then 'removed' else 'kept' end, decision_note = v_note, decided_by = p_actor, decided_at = now() where id = rp.id;
    if v_action = 'remove' then
      update reviews set status = 'removed' where id = rp.review_id;
      update review_reports set status = 'removed', decision_note = v_note, decided_by = p_actor, decided_at = now() where review_id = rp.review_id and status = 'open';
      insert into review_moderation (review_id, action, note, actor) values (rp.review_id, 'removed', v_note, p_actor);
      select * into r from reviews where id = rp.review_id;
      perform dela_notify(jsonb_build_object('person_id', r.author_person, 'side', case when r.direction = 'of_freelancer' then 'attorney' else 'freelancer' end, 'kind', 'review', 'email', true,
        'title', 'Your review was removed', 'body', 'After a report, the Lawfecta Team removed your review: ' || v_note || '. You can appeal once within ' || dela_int_setting('reviews.appeal_days', 14) || ' days on the engagement page.',
        'link', '/dela', 'dedupe_key', 'revrm:' || r.id::text));
    else
      insert into review_moderation (review_id, action, note, actor) values (rp.review_id, 'kept', v_note, p_actor);
    end if;
    perform dela_notify(jsonb_build_object('person_id', rp.reporter, 'side', (select case when direction = 'of_freelancer' then case when author_person = rp.reporter then 'attorney' else 'freelancer' end else case when author_person = rp.reporter then 'freelancer' else 'attorney' end end from reviews where id = rp.review_id),
      'kind', 'review', 'email', true, 'title', 'Your report was decided', 'body', 'The Lawfecta Team ' || case when v_action = 'remove' then 'removed the review' else 'kept the review up' end || ': ' || v_note || '.',
      'link', '/dela', 'dedupe_key', 'repdone:' || rp.id::text));
  elsif v_kind = 'appeal' then
    select * into r from reviews where id = v_id and appeal_status = 'open' for update;
    if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
    update reviews set appeal_status = case when v_action = 'reverse' then 'reversed' else 'upheld' end, status = case when v_action = 'reverse' then 'published' else status end where id = r.id;
    insert into review_moderation (review_id, action, note, actor) values (r.id, 'appeal_' || case when v_action = 'reverse' then 'reversed' else 'upheld' end, v_note, p_actor);
    perform dela_notify(jsonb_build_object('person_id', r.author_person, 'side', case when r.direction = 'of_freelancer' then 'attorney' else 'freelancer' end, 'kind', 'review', 'email', true,
      'title', 'Your appeal was decided', 'body', case when v_action = 'reverse' then 'Your review is published again: ' else 'The decision stays: ' end || v_note || '.', 'link', '/dela', 'dedupe_key', 'appdone:' || r.id::text));
  else return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  perform dela_audit('staff', p_actor, 'review_' || v_kind || '_' || coalesce(v_action, ''), 'review', v_id::text, jsonb_build_object('note', v_note));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Triggers ----------
drop trigger if exists wh_gigs on gigs;
create trigger wh_gigs after insert or update of status on gigs for each row execute function dela_wh_gigs();
drop trigger if exists wh_proposals on proposals;
create trigger wh_proposals after insert or update of status on proposals for each row execute function dela_wh_proposals();
drop trigger if exists wh_invitations on gig_invitations;
create trigger wh_invitations after insert or update of status on gig_invitations for each row execute function dela_wh_invitations();
drop trigger if exists wh_matches on gig_matches;
create trigger wh_matches after insert on gig_matches for each row execute function dela_wh_matches();
drop trigger if exists wh_meetings on meetings;
create trigger wh_meetings after insert or update of status on meetings for each row execute function dela_wh_meetings();
drop trigger if exists wh_agreements on agreements;
create trigger wh_agreements after update of status on agreements for each row execute function dela_wh_agreements();
drop trigger if exists wh_milestones on milestones;
create trigger wh_milestones after update of status on milestones for each row execute function dela_wh_milestones();
drop trigger if exists wh_payouts on payouts;
create trigger wh_payouts after update of status on payouts for each row execute function dela_wh_payouts();
drop trigger if exists wh_disputes on disputes;
create trigger wh_disputes after insert or update of status on disputes for each row execute function dela_wh_disputes();
drop trigger if exists wh_bench on bench_members;
create trigger wh_bench after insert or update of status on bench_members for each row execute function dela_wh_bench();
drop trigger if exists wh_reviews on reviews;
create trigger wh_reviews after insert or update of status on reviews for each row execute function dela_wh_reviews();

-- The daily jobs include the bench summary
create or replace function dela_maybe_queue_daily() returns void language plpgsql as $$
declare local timestamp := now() at time zone dela_tz();
begin
  if extract(hour from local) >= 8 then
    perform dela_job_enqueue('daily_summary', '{}', now(), 'daily:' || local::date);
    perform dela_job_enqueue('playbooks_daily', '{}', now(), 'playbooks_daily:' || local::date);
    perform dela_job_enqueue('recordings_daily', '{}', now(), 'recordings_daily:' || local::date);
    perform dela_job_enqueue('profiles_daily', '{}', now(), 'profiles_daily:' || local::date);
    perform dela_job_enqueue('bench_daily', '{}', now(), 'bench_daily:' || local::date);
  end if;
  perform dela_job_enqueue('files_sweep', '{}', now(), 'files_sweep:' || local::date);
  perform dela_job_enqueue('ai_key_reminders', '{}', now(), 'ai_key_reminders:' || local::date);
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

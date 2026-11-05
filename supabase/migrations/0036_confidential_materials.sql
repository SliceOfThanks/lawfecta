-- Confidential materials (docs/briefs/step-6c-confidential-engagement-materials.md; Stacey's final decisions 2026-11-05).
-- One walled-off area per engagement where the hiring attorney and the hired freelancer exchange client files,
-- confidential messages and secure links to sensitive documents in the firm's own storage. It opens after both
-- signatures and the first funded milestone, is never read by the AI, never searched, never exported and never shown
-- outside the engagement. Security rules (docs/briefs/step-6d-security-sensitive-data.md, Stacey 2026-11-05):
-- each file expires 7, 14 or 30 days after it is shared (default 14; the attorney can extend 14 days at a time); the
-- freelancer's access ends at the expiry or when the job is complete, whichever comes first; files are deleted 7 days
-- after access ends and messages 7 days after the job ends (an open dispute holds both). Links expire too and their
-- address is erased. Off on Live until a lawyer approves. Additive.

insert into feature_switches (key, label, gate) values
  ('confidential_materials', 'Confidential materials in engagements (client information for the hired freelancer)', 'A lawyer approves the terms, privacy policy and data handling (G-CONTRACT)')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('sharing.expiry_choices', '[7, 14, 30]', 'Days a file or link shared with a freelancer can last (the attorney picks)', 'Sharing and retention', 'days', 'C', 'Stacey 2026-11-05', ''),
  ('sharing.expiry_default', '14', 'Days a shared file or link lasts unless the attorney picks another choice', 'Sharing and retention', 'days', 'C', 'Stacey 2026-11-05', ''),
  ('sharing.extend_days', '14', 'Days the "Extend" button adds to a shared file', 'Sharing and retention', 'days', 'C', 'Stacey 2026-11-05', 'No limit on extensions; every extension is logged.'),
  ('sharing.grace_days', '7', 'Days after access ends before shared files are deleted (time for the attorney to recover them)', 'Sharing and retention', 'days', 'C', 'Stacey 2026-11-05', 'An open dispute holds deletion until it is decided.'),
  ('sharing.download_all_reminder_days', '2', 'Days before deletion the attorney is reminded to click Download all', 'Sharing and retention', 'days', 'C', 'Stacey 2026-11-05', ''),
  ('links.warn_days', '2', 'Days before a secure link expires that the attorney gets the first email', 'Sharing and retention', 'days', 'C', 'Stacey 2026-11-05', 'A second email goes at expiry.'),
  ('links.max_per_engagement', '25', 'Most secure links open at once in one engagement', 'Sharing and retention', 'links', 'O', 'Claude suggestion', ''),
  ('confidential.max_mb', '25', 'Largest confidential file', 'Confidential materials', 'MB', 'C', 'Stacey 2026-11-05', ''),
  ('confidential.engagement_max_mb', '500', 'Most confidential storage in one engagement', 'Confidential materials', 'MB', 'C', 'Stacey 2026-11-05', 'Counted in the firm''s storage too.'),
  ('confidential.allowed_types', '["pdf","docx","xlsx","png","jpg","txt","csv"]', 'File types allowed in confidential materials', 'Confidential materials', '', 'C', 'Stacey 2026-11-05', ''),
  ('confidential.login_hours', '12', 'Hours a login check lasts before the area asks again', 'Confidential materials', 'hours', 'C', 'Stacey 2026-11-05', 'DELA emails a 6-digit code, because it cannot see when the member last typed their Lawfecta password.'),
  ('confidential.link_minutes', '5', 'Minutes a confidential file link works', 'Confidential materials', 'minutes', 'C', 'Stacey 2026-11-05', ''),
  ('confidential.scan_provider', '"none"', 'Virus scanner for confidential uploads', 'Confidential materials', '', 'O', 'Stacey 2026-11-05 (every upload is scanned)', 'none: the test site marks files "Not virus scanned"; anywhere else uploads are refused until a scanner is set up (http: CONF_SCAN_URL and CONF_SCAN_TOKEN secrets).')
on conflict (key) do nothing;

-- The emergency stop gets its own switch for this area
update settings set value = value || '{"confidential": false}'::jsonb where key = 'emergency.pause' and not (value ? 'confidential');

alter table files drop constraint if exists files_purpose_check;
alter table files add constraint files_purpose_check check (purpose in ('member', 'recording', 'profile', 'deliverable', 'doc_image', 'confidential'));
alter table agreements add column if not exists conf_deleted_at timestamptz;
-- A job with sensitive data (SSN, medical, financial or ID documents): no uploads, secure links only
alter table gigs add column if not exists sensitive boolean not null default false;
alter table gigs add column if not exists sensitive_at timestamptz;
alter table gigs add column if not exists sensitive_by uuid references people(id);
alter table milestone_submissions add column if not exists conf_files uuid[] not null default '{}';

-- Files in the area (the file itself is a firm file with purpose confidential, never listed on the Files tab)
create table if not exists conf_files (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id),
  file_id uuid not null unique references files(id),
  uploaded_by uuid not null references people(id),
  view_only boolean not null default false,
  no_sensitive_at timestamptz not null,
  scan_state text not null default 'not_scanned' check (scan_state in ('clean', 'not_scanned')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_reason text not null default ''
);
-- The expiry the uploader picked, kept until the checks pass
create table if not exists conf_upload_choices (
  file_id uuid primary key references files(id),
  expiry_days int not null,
  created_at timestamptz not null default now()
);
alter table conf_upload_choices enable row level security;

-- Secure links to sensitive documents in the firm's own storage (Google Drive, Dropbox, OneDrive, Box, ShareFile, Clio,
-- NetDocuments). DELA never opens, fetches, reads or summarizes them; the address is erased when the link expires.
create table if not exists conf_links (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id),
  label text not null default '',
  url text,
  host text not null default '',
  expires_at timestamptz not null,
  added_by uuid not null references people(id),
  request_id text not null,
  created_at timestamptz not null default now(),
  warned_at timestamptz,
  expired_at timestamptz,
  expired_mailed_at timestamptz,
  removed_at timestamptz,
  unique (agreement_id, added_by, request_id)
);
create index if not exists conf_links_agreement on conf_links (agreement_id);
create index if not exists conf_links_due on conf_links (expires_at) where expired_at is null;
alter table conf_links enable row level security;
create index if not exists conf_files_agreement on conf_files (agreement_id);
alter table conf_files enable row level security;

create table if not exists conf_messages (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id),
  author uuid not null references people(id),
  body text not null check (length(body) between 1 and 8000),
  request_id text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (agreement_id, author, request_id)
);
create index if not exists conf_messages_agreement on conf_messages (agreement_id, created_at);
alter table conf_messages enable row level security;

-- Firm staff the hiring attorney adds to one engagement
create table if not exists conf_members (
  agreement_id uuid not null references agreements(id),
  person_id uuid not null references people(id),
  added_by uuid not null references people(id),
  added_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (agreement_id, person_id)
);
alter table conf_members enable row level security;

-- The freelancer's promise before first opening the area
create table if not exists conf_acks (
  agreement_id uuid not null references agreements(id),
  person_id uuid not null references people(id),
  wording text not null,
  at timestamptz not null default now(),
  primary key (agreement_id, person_id)
);
alter table conf_acks enable row level security;

-- The login check: a 6-digit code emailed to the member, good for 12 hours once entered
create table if not exists conf_stepups (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id),
  code_hash text not null,
  sent_at timestamptz not null default now(),
  attempts int not null default 0,
  confirmed_at timestamptz
);
create index if not exists conf_stepups_person on conf_stepups (person_id, sent_at desc);
alter table conf_stepups enable row level security;

-- In a dispute: both people agree before a Lawfecta reviewer may open the area
create table if not exists conf_review_consents (
  dispute_id uuid not null references disputes(id),
  agreement_id uuid not null references agreements(id),
  person_id uuid not null references people(id),
  agree boolean not null,
  at timestamptz not null default now(),
  primary key (dispute_id, person_id)
);
alter table conf_review_consents enable row level security;

-- Every upload, open, download, message, change and deletion (append-only)
create table if not exists conf_log (
  id bigserial primary key,
  agreement_id uuid not null references agreements(id),
  person_id uuid references people(id),
  file_id uuid references conf_files(id),
  link_id uuid references conf_links(id),
  action text not null,
  detail jsonb not null default '{}',
  at timestamptz not null default now()
);
create index if not exists conf_log_agreement on conf_log (agreement_id, at);
alter table conf_log enable row level security;
create or replace function dela_conf_no_change() returns trigger language plpgsql as $$ begin raise exception 'append-only'; end $$;
drop trigger if exists conf_log_append on conf_log;
create trigger conf_log_append before update or delete on conf_log for each row execute function dela_conf_no_change();

create or replace function dela_conf_log(p_agreement uuid, p_person uuid, p_file uuid, p_action text, p_detail jsonb default '{}', p_link uuid default null) returns void language sql as $$
  insert into conf_log (agreement_id, person_id, file_id, link_id, action, detail) values (p_agreement, p_person, p_file, p_link, p_action, coalesce(p_detail, '{}'))
$$;

-- When a shared file's access ends (its expiry, or the job ending, whichever comes first) and when it is deleted
create or replace function dela_conf_file_access_end(c conf_files, a agreements) returns timestamptz language sql stable as $$
  select least(c.expires_at, case when a.status in ('completed', 'canceled') then coalesce(a.completed_at, a.canceled_at, a.updated_at) end)
$$;
create or replace function dela_conf_file_delete_at(c conf_files, a agreements) returns timestamptz language sql stable as $$
  select dela_conf_file_access_end(c, a) + make_interval(days => dela_int_setting('sharing.grace_days', 7))
$$;
-- The expiry choice: one of sharing.expiry_choices, or the default
create or replace function dela_sharing_days(p_days int) returns int language sql stable as $$
  select case when p_days is not null and dela_setting('sharing.expiry_choices') @> to_jsonb(p_days) then p_days else dela_int_setting('sharing.expiry_default', 14) end
$$;

-- Where the area stands for one engagement
create or replace function dela_conf_state(p_agreement uuid) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'open', a.signed_at is not null and exists (select 1 from milestones m where m.agreement_id = a.id and m.funded_at is not null),
    'signed', a.signed_at is not null,
    'funded', exists (select 1 from milestones m where m.agreement_id = a.id and m.funded_at is not null),
    'ended', a.status in ('completed', 'canceled'),
    'ended_at', case when a.status in ('completed', 'canceled') then coalesce(a.completed_at, a.canceled_at, a.updated_at) end,
    'messages_delete_at', case when a.status in ('completed', 'canceled') then coalesce(a.completed_at, a.canceled_at, a.updated_at) + make_interval(days => dela_int_setting('sharing.grace_days', 7)) end,
    'sensitive', coalesce((select g.sensitive from gigs g where g.id = a.gig_id), false),
    'dispute_open', exists (select 1 from disputes d where d.agreement_id = a.id and d.status in ('notice', 'team_review')),
    'deleted', a.conf_deleted_at is not null, 'deleted_at', a.conf_deleted_at)
  from agreements a where a.id = p_agreement
$$;

-- Who someone is to the area: the hiring attorney, a firm owner or manager, staff the attorney added, or the freelancer
create or replace function dela_conf_role(p_person uuid, p_agreement uuid) returns text language sql stable as $$
  select case
    when a.id is null then ''
    when a.attorney_person = p_person then 'hiring'
    when a.freelancer_person = p_person then 'freelancer'
    when dela_firm_role(p_person, a.attorney_org) in ('owner', 'manager') then 'firm'
    when dela_firm_role(p_person, a.attorney_org) <> '' and exists (select 1 from conf_members m where m.agreement_id = a.id and m.person_id = p_person and m.removed_at is null) then 'staff'
    else '' end
  from agreements a where a.id = p_agreement
$$;

-- The one access check every action uses. p_need: view, write, manage
create or replace function dela_conf_access(p_person uuid, p_side text, p_agreement uuid, p_need text default 'view') returns jsonb language plpgsql stable as $$
declare a agreements; v_role text; st jsonb;
begin
  select * into a from agreements where id = p_agreement;
  if a.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_conf_role(p_person, a.id);
  if v_role = '' or (v_role = 'freelancer' and p_side <> 'freelancer') or (v_role <> 'freelancer' and p_side <> 'attorney') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('confidential_materials', p_person) then return jsonb_build_object('ok', false, 'reason', 'confidential_off', 'role', v_role); end if;
  if dela_paused('confidential') then return jsonb_build_object('ok', false, 'reason', 'confidential_paused', 'role', v_role); end if;
  st := dela_conf_state(a.id);
  if (st->>'deleted')::boolean then return jsonb_build_object('ok', false, 'reason', 'confidential_deleted', 'role', v_role, 'state', st); end if;
  if not (st->>'open')::boolean then return jsonb_build_object('ok', false, 'reason', 'confidential_not_open', 'role', v_role, 'state', st); end if;
  if v_role = 'freelancer' then
    if (st->>'ended')::boolean then return jsonb_build_object('ok', false, 'reason', 'confidential_ended', 'role', v_role, 'state', st); end if;
    if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold', 'role', v_role); end if;
  end if;
  if p_need = 'write' and (st->>'ended')::boolean then return jsonb_build_object('ok', false, 'reason', 'confidential_ended', 'role', v_role, 'state', st); end if;
  if p_need = 'manage' and v_role not in ('hiring', 'firm') then return jsonb_build_object('ok', false, 'reason', 'not_allowed', 'role', v_role); end if;
  return jsonb_build_object('ok', true, 'role', v_role, 'state', st, 'org_id', a.attorney_org, 'attorney', a.attorney_person, 'freelancer', a.freelancer_person);
end $$;

-- The login check
create or replace function dela_conf_fresh(p_person uuid) returns boolean language sql stable as $$
  select exists (select 1 from conf_stepups s where s.person_id = p_person and s.confirmed_at > now() - make_interval(hours => dela_int_setting('confidential.login_hours', 12)))
$$;
-- The code goes by email only (never an in-app notice, which anyone holding the open page could read)
create or replace function dela_conf_stepup_start(p_person uuid, p_side text, p_code_hash text, p_code text) returns jsonb language plpgsql as $$
declare v_recent int; pr people; v_mail uuid;
begin
  select count(*) into v_recent from conf_stepups where person_id = p_person and sent_at > now() - interval '1 hour';
  if v_recent >= 5 then return jsonb_build_object('ok', false, 'reason', 'too_many_codes'); end if;
  select * into pr from people where id = p_person;
  if coalesce(pr.email, '') = '' then return jsonb_build_object('ok', false, 'reason', 'no_email'); end if;
  insert into conf_stepups (person_id, code_hash) values (p_person, p_code_hash);
  insert into notifications (person_id, side, kind, channel, essential, title, body, link, dedupe_key)
  values (p_person, p_side, 'security', 'email', true, 'Your DELA code: ' || p_code,
    'Enter ' || p_code || ' in DELA to open Confidential materials. The code works for 15 minutes. If you did not ask for it, ignore this email and tell the Lawfecta Team.', '', 'confcode:' || gen_random_uuid()::text)
  returning id into v_mail;
  return jsonb_build_object('ok', true, 'email', pr.email, 'notification_id', v_mail);
end $$;
create or replace function dela_conf_stepup_confirm(p_person uuid, p_code_hash text) returns jsonb language plpgsql as $$
declare s conf_stepups;
begin
  select * into s from conf_stepups where person_id = p_person and confirmed_at is null and sent_at > now() - interval '15 minutes' order by sent_at desc limit 1 for update;
  if s.id is null then return jsonb_build_object('ok', false, 'reason', 'code_expired'); end if;
  if s.attempts >= 5 then return jsonb_build_object('ok', false, 'reason', 'too_many_tries'); end if;
  if s.code_hash <> p_code_hash then
    update conf_stepups set attempts = attempts + 1 where id = s.id;
    return jsonb_build_object('ok', false, 'reason', 'wrong_code');
  end if;
  update conf_stepups set confirmed_at = now() where id = s.id;
  perform dela_audit('member', p_person, 'confidential_login_check', 'person', p_person::text, '{}');
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_conf_ack(p_person uuid, p_side text, p_agreement uuid, p_wording text) returns jsonb language plpgsql as $$
declare acc jsonb;
begin
  acc := dela_conf_access(p_person, p_side, p_agreement, 'view');
  if not (acc->>'ok')::boolean then return acc; end if;
  if acc->>'role' <> 'freelancer' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  insert into conf_acks (agreement_id, person_id, wording) values (p_agreement, p_person, left(p_wording, 400)) on conflict do nothing;
  perform dela_conf_log(p_agreement, p_person, null, 'acknowledged', '{}');
  return jsonb_build_object('ok', true);
end $$;

-- Everything the card shows. Files and messages only once the login check passed (and, for the freelancer, the promise).
create or replace function dela_conf_view(p_person uuid, p_side text, p_agreement uuid) returns jsonb language plpgsql as $$
declare acc jsonb; v_role text; v_fresh boolean; v_ack boolean; a agreements; v_disp disputes;
begin
  acc := dela_conf_access(p_person, p_side, p_agreement, 'view');
  select * into a from agreements where id = p_agreement;
  if not (acc->>'ok')::boolean then
    return jsonb_build_object('ok', false, 'reason', acc->>'reason', 'role', acc->>'role', 'state', coalesce(acc->'state', case when acc->>'role' is not null then dela_conf_state(p_agreement) end));
  end if;
  v_role := acc->>'role';
  v_fresh := dela_conf_fresh(p_person);
  v_ack := v_role <> 'freelancer' or exists (select 1 from conf_acks where agreement_id = p_agreement and person_id = p_person);
  select * into v_disp from disputes where agreement_id = p_agreement and status in ('notice', 'team_review') order by created_at desc limit 1;
  if not v_fresh or not v_ack then
    return jsonb_build_object('ok', true, 'role', v_role, 'state', acc->'state', 'login_needed', not v_fresh, 'ack_needed', not v_ack);
  end if;
  return jsonb_build_object('ok', true, 'role', v_role, 'state', acc->'state', 'login_needed', false, 'ack_needed', false,
    'limits', jsonb_build_object('max_mb', dela_int_setting('confidential.max_mb', 25), 'engagement_max_mb', dela_int_setting('confidential.engagement_max_mb', 500), 'types', dela_setting('confidential.allowed_types'),
      'used_bytes', (select coalesce(sum(f.size_bytes), 0) from conf_files c join files f on f.id = c.file_id where c.agreement_id = p_agreement and c.deleted_at is null)),
    'sharing', jsonb_build_object('choices', dela_setting('sharing.expiry_choices'), 'default', dela_int_setting('sharing.expiry_default', 14),
      'extend_days', dela_int_setting('sharing.extend_days', 14), 'grace_days', dela_int_setting('sharing.grace_days', 7)),
    'can_upload', not coalesce((acc->'state'->>'sensitive')::boolean, false),
    'files', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', f.name, 'ext', f.ext, 'size_bytes', f.size_bytes, 'by', pe.display_name, 'mine', c.uploaded_by = p_person,
        'at', c.created_at, 'view_only', c.view_only, 'scan_state', c.scan_state, 'expires_at', c.expires_at,
        'access_ends_at', dela_conf_file_access_end(c, a), 'delete_at', dela_conf_file_delete_at(c, a), 'access_ended', dela_conf_file_access_end(c, a) <= now(),
        'can_delete', v_role in ('hiring', 'firm') or c.uploaded_by = p_person,
        'opens', case when v_role in ('hiring', 'firm') then (select count(*) from conf_log l where l.file_id = c.id and l.action in ('open', 'download')) end) order by c.created_at desc), '[]')
      from conf_files c join files f on f.id = c.file_id join people pe on pe.id = c.uploaded_by where c.agreement_id = p_agreement and c.deleted_at is null
        and (v_role <> 'freelancer' or dela_conf_file_access_end(c, a) > now())),
    -- Links: the label and the storage service only; the address is given out one click at a time, and that click is logged
    'links', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'label', l.label, 'host', l.host, 'expires_at', l.expires_at, 'by', pe.display_name,
        'state', case when l.removed_at is not null then 'removed' when l.expired_at is not null or l.expires_at <= now() then 'expired' else 'open' end,
        'opens', case when v_role <> 'freelancer' then (select count(*) from conf_log g where g.link_id = l.id and g.action = 'link_open') end) order by l.created_at desc), '[]')
      from conf_links l join people pe on pe.id = l.added_by where l.agreement_id = p_agreement
        and (v_role <> 'freelancer' or (l.removed_at is null and l.expired_at is null and l.expires_at > now() and a.status not in ('completed', 'canceled')))),
    'messages', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'body', m.body, 'by', pe.display_name, 'mine', m.author = p_person, 'at', m.created_at) order by m.created_at), '[]')
      from conf_messages m join people pe on pe.id = m.author where m.agreement_id = p_agreement and m.deleted_at is null),
    'people', (select jsonb_agg(x) from (
        select jsonb_build_object('name', pe.display_name, 'role', 'Hiring attorney') x from people pe where pe.id = a.attorney_person
        union all select jsonb_build_object('name', pe.display_name, 'role', 'Hired freelancer') from people pe where pe.id = a.freelancer_person
        union all select jsonb_build_object('name', pe.display_name, 'role', case o.owner_person_id when pe.id then 'Firm owner' else 'Firm manager' end) from organizations o join people pe on pe.id = o.owner_person_id or pe.id in (select person_id from org_members where org_id = o.id and member_role = 'manager' and status = 'active') where o.id = a.attorney_org and pe.id <> a.attorney_person
        union all select jsonb_build_object('name', pe.display_name, 'role', 'Added by the attorney', 'person_id', pe.id, 'removable', v_role = 'hiring') from conf_members m join people pe on pe.id = m.person_id where m.agreement_id = p_agreement and m.removed_at is null) y),
    'staff_options', case when v_role = 'hiring' then (select coalesce(jsonb_agg(jsonb_build_object('person_id', pe.id, 'name', pe.display_name)), '[]') from org_members om join people pe on pe.id = om.person_id
        where om.org_id = a.attorney_org and om.status = 'active' and om.member_role = 'member' and pe.id <> a.attorney_person
        and not exists (select 1 from conf_members m where m.agreement_id = p_agreement and m.person_id = pe.id and m.removed_at is null)) end,
    'log', case when v_role in ('hiring', 'firm') then (select coalesce(jsonb_agg(jsonb_build_object('at', l.at, 'who', coalesce(pe.display_name, 'DELA'), 'action', l.action,
          'file', coalesce(f.name, l.detail->>'name', (select k.label from conf_links k where k.id = l.link_id)), 'detail', l.detail - 'name') order by l.at desc), '[]')
        from (select * from conf_log where agreement_id = p_agreement and action in ('upload', 'open', 'download', 'link_added', 'link_open', 'link_removed', 'link_expired', 'extended', 'file_deleted', 'files_expired', 'messages_deleted', 'review_open')
              order by at desc limit 200) l left join people pe on pe.id = l.person_id left join conf_files c on c.id = l.file_id left join files f on f.id = c.file_id) end,
    'review', case when v_disp.id is not null then jsonb_build_object('dispute_id', v_disp.id,
        'mine', (select agree from conf_review_consents where dispute_id = v_disp.id and person_id = p_person),
        'other', (select agree from conf_review_consents where dispute_id = v_disp.id and person_id <> p_person and person_id in (a.attorney_person, a.freelancer_person))) end,
    'reviewer_opens', (select count(*) from conf_log where agreement_id = p_agreement and action = 'review_open'));
end $$;

-- Upload: step one (a place to upload) and the record once the checks passed
create or replace function dela_conf_file_start(p jsonb) returns jsonb language plpgsql as $$
declare
  v_person uuid := (p->>'person_id')::uuid; v_ag uuid := (p->>'agreement_id')::uuid; acc jsonb; v_org uuid; v_req text := left(coalesce(p->>'request_id', ''), 80);
  v_name text := btrim(coalesce(p->>'name', '')); v_ext text; v_size bigint := (p->>'size_bytes')::bigint; v_used bigint; v_limit bigint; v_id uuid := gen_random_uuid(); f files;
begin
  acc := dela_conf_access(v_person, p->>'side', v_ag, 'write');
  if not (acc->>'ok')::boolean then return acc; end if;
  if not dela_conf_fresh(v_person) then return jsonb_build_object('ok', false, 'reason', 'login_needed'); end if;
  if acc->>'role' = 'freelancer' and not exists (select 1 from conf_acks where agreement_id = v_ag and person_id = v_person) then return jsonb_build_object('ok', false, 'reason', 'ack_needed'); end if;
  if coalesce((acc->'state'->>'sensitive')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'sensitive_job'); end if;
  if coalesce((p->>'no_sensitive')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'no_sensitive_needed'); end if;
  if v_req = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  v_org := (acc->>'org_id')::uuid;
  select * into f from files where org_id = v_org and request_id = v_req;
  if f.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'file_id', f.id, 'status', f.status, 'storage_path', f.storage_path); end if;
  v_name := regexp_replace(v_name, '[[:cntrl:]/\\]+', ' ', 'g');
  if length(v_name) = 0 or length(v_name) > 200 then return jsonb_build_object('ok', false, 'reason', 'bad_name'); end if;
  v_ext := lower(substring(v_name from '\.([A-Za-z0-9]{1,8})$'));
  if v_ext = 'jpeg' then v_ext := 'jpg'; end if;
  if v_ext is null or not (dela_setting('confidential.allowed_types') ? v_ext) then return jsonb_build_object('ok', false, 'reason', 'type_not_allowed', 'allowed', dela_setting('confidential.allowed_types')); end if;
  if v_size is null or v_size <= 0 then return jsonb_build_object('ok', false, 'reason', 'empty_file'); end if;
  if v_size > dela_int_setting('confidential.max_mb', 25)::bigint * 1048576 then return jsonb_build_object('ok', false, 'reason', 'file_too_big', 'max_mb', dela_int_setting('confidential.max_mb', 25)); end if;
  perform pg_advisory_xact_lock(hashtextextended('conf:' || v_ag::text, 0));
  select coalesce(sum(fi.size_bytes), 0) into v_used from conf_files c join files fi on fi.id = c.file_id where c.agreement_id = v_ag and c.deleted_at is null;
  if v_used + v_size > dela_int_setting('confidential.engagement_max_mb', 500)::bigint * 1048576 then return jsonb_build_object('ok', false, 'reason', 'engagement_full', 'max_mb', dela_int_setting('confidential.engagement_max_mb', 500)); end if;
  perform pg_advisory_xact_lock(hashtextextended('storage:' || v_org::text, 0));
  v_limit := dela_storage_limit_bytes(v_org);
  if v_limit is not null and dela_storage_used_bytes(v_org) + v_size > v_limit then return jsonb_build_object('ok', false, 'reason', 'storage_full'); end if;
  insert into files (id, org_id, group_id, version, name, ext, size_bytes, storage_path, uploaded_by, side, request_id, no_client_info_ticked_at, purpose)
  values (v_id, v_org, v_id, 1, v_name, v_ext, v_size, v_org::text || '/conf/' || v_ag::text || '/' || v_id::text || '.' || v_ext, v_person, p->>'side', v_req, now(), 'confidential')
  returning * into f;
  -- The attorney side picks how long the freelancer can open it; the freelancer's own uploads use the default
  insert into conf_upload_choices (file_id, expiry_days) values (f.id, case when acc->>'role' = 'freelancer' then dela_sharing_days(null) else dela_sharing_days((p->>'expiry_days')::int) end);
  return jsonb_build_object('ok', true, 'duplicate', false, 'file_id', f.id, 'storage_path', f.storage_path, 'status', f.status);
end $$;

create or replace function dela_conf_file_uploaded(p_person uuid, p_file uuid, p_size bigint) returns jsonb language plpgsql as $$
declare f files;
begin
  select * into f from files where id = p_file and uploaded_by = p_person and purpose = 'confidential' for update;
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if f.status <> 'uploading' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', f.status, 'storage_path', f.storage_path, 'ext', f.ext); end if;
  if p_size is null or p_size <= 0 then return jsonb_build_object('ok', false, 'reason', 'not_uploaded'); end if;
  if p_size > dela_int_setting('confidential.max_mb', 25)::bigint * 1048576 then
    update files set status = 'refused', refuse_reason = 'file_too_big', size_bytes = p_size, updated_at = now() where id = f.id;
    return jsonb_build_object('ok', false, 'reason', 'too_big_after_upload', 'storage_path', f.storage_path);
  end if;
  update files set status = 'checking', size_bytes = p_size, updated_at = now() where id = f.id;
  return jsonb_build_object('ok', true, 'status', 'checking', 'storage_path', f.storage_path, 'ext', f.ext);
end $$;

-- The checks' result. p: ok, reason, mime, sha256, scan (clean | not_scanned), agreement_id
create or replace function dela_conf_file_checked(p_file uuid, p jsonb) returns jsonb language plpgsql as $$
declare f files; c conf_files; v_ag uuid := (p->>'agreement_id')::uuid; a agreements; who uuid;
begin
  select * into f from files where id = p_file and purpose = 'confidential' for update;
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into c from conf_files where file_id = f.id;
  if c.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', c.id); end if;
  if f.status <> 'checking' then return jsonb_build_object('ok', false, 'reason', 'not_uploaded'); end if;
  if not coalesce((p->>'ok')::boolean, false) then
    update files set status = 'refused', refuse_reason = left(coalesce(p->>'reason', 'wrong_type'), 40), updated_at = now() where id = f.id;
    perform dela_conf_log(v_ag, f.uploaded_by, null, 'upload_refused', jsonb_build_object('reason', p->>'reason'));
    return jsonb_build_object('ok', false, 'reason', coalesce(p->>'reason', 'wrong_type'), 'storage_path', f.storage_path, 'kinds', p->'kinds');
  end if;
  update files set status = 'ready', is_current = true, mime = left(coalesce(p->>'mime', ''), 100), sha256 = left(coalesce(p->>'sha256', ''), 64), check_state = 'confirmed', updated_at = now() where id = f.id;
  insert into conf_files (agreement_id, file_id, uploaded_by, no_sensitive_at, scan_state, expires_at)
  values (v_ag, f.id, f.uploaded_by, now(), case when p->>'scan' = 'clean' then 'clean' else 'not_scanned' end,
    now() + make_interval(days => coalesce((select expiry_days from conf_upload_choices u where u.file_id = f.id), dela_sharing_days(null))))
  returning * into c;
  perform dela_conf_log(v_ag, f.uploaded_by, c.id, 'upload', jsonb_build_object('ext', f.ext, 'size_bytes', f.size_bytes, 'scan', p->>'scan', 'expires_at', c.expires_at));
  perform dela_conf_notify(v_ag, f.uploaded_by, 'file:' || c.id);
  return jsonb_build_object('ok', true, 'id', c.id, 'scan_state', c.scan_state);
end $$;

-- Notices name the engagement only: never a file name or message text
create or replace function dela_conf_notify(p_agreement uuid, p_from uuid, p_key text) returns void language plpgsql as $$
declare a agreements; who record; v_title text;
begin
  select * into a from agreements where id = p_agreement;
  select title into v_title from gigs where id = a.gig_id;
  for who in select x.person_id, x.side from (
      select a.attorney_person as person_id, 'attorney' as side
      union select a.freelancer_person, 'freelancer' where a.status not in ('completed', 'canceled')
      union select m.person_id, 'attorney' from conf_members m where m.agreement_id = a.id and m.removed_at is null) x
    where x.person_id <> p_from loop
    perform dela_notify(jsonb_build_object('person_id', who.person_id, 'side', who.side, 'kind', 'engagement', 'email', true,
      'title', 'New item in Confidential materials', 'body', 'There is a new item in Confidential materials on ' || coalesce(v_title, 'your engagement') || '. Open DELA to see it.',
      'link', '/dela?tab=' || case when who.side = 'attorney' then 'projects' else 'work' end || '&gig=' || a.gig_id::text || '&view=agreement', 'dedupe_key', 'conf:' || p_key || ':' || who.person_id));
  end loop;
end $$;

create or replace function dela_conf_message(p_person uuid, p_side text, p_agreement uuid, p_body text, p_request text) returns jsonb language plpgsql as $$
declare acc jsonb; m conf_messages;
begin
  acc := dela_conf_access(p_person, p_side, p_agreement, 'write');
  if not (acc->>'ok')::boolean then return acc; end if;
  if not dela_conf_fresh(p_person) then return jsonb_build_object('ok', false, 'reason', 'login_needed'); end if;
  if acc->>'role' = 'freelancer' and not exists (select 1 from conf_acks where agreement_id = p_agreement and person_id = p_person) then return jsonb_build_object('ok', false, 'reason', 'ack_needed'); end if;
  if btrim(coalesce(p_body, '')) = '' then return jsonb_build_object('ok', false, 'reason', 'empty_message'); end if;
  select * into m from conf_messages where agreement_id = p_agreement and author = p_person and request_id = left(coalesce(p_request, ''), 80);
  if m.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', m.id); end if;
  insert into conf_messages (agreement_id, author, body, request_id) values (p_agreement, p_person, left(p_body, 8000), left(coalesce(p_request, gen_random_uuid()::text), 80)) returning * into m;
  perform dela_conf_log(p_agreement, p_person, null, 'message', '{}');
  perform dela_conf_notify(p_agreement, p_person, 'msg:' || m.id);
  return jsonb_build_object('ok', true, 'id', m.id);
end $$;

-- Opening or downloading one file (view only blocks downloads for everyone). The access, the login check and the
-- promise are checked at the moment it runs, and every open is logged.
create or replace function dela_conf_file_open(p_person uuid, p_side text, p_agreement uuid, p_file uuid, p_action text) returns jsonb language plpgsql as $$
declare acc jsonb; c conf_files; f files;
begin
  acc := dela_conf_access(p_person, p_side, p_agreement, 'view');
  if not (acc->>'ok')::boolean then return acc; end if;
  if not dela_conf_fresh(p_person) then return jsonb_build_object('ok', false, 'reason', 'login_needed'); end if;
  if acc->>'role' = 'freelancer' and not exists (select 1 from conf_acks where agreement_id = p_agreement and person_id = p_person) then return jsonb_build_object('ok', false, 'reason', 'ack_needed'); end if;
  select * into c from conf_files where id = p_file and agreement_id = p_agreement and deleted_at is null;
  if c.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into f from files where id = c.file_id and status = 'ready';
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if acc->>'role' = 'freelancer' and dela_conf_file_access_end(c, (select ag from agreements ag where ag.id = p_agreement)) <= now() then return jsonb_build_object('ok', false, 'reason', 'share_expired'); end if;
  if p_action = 'download' and c.view_only then return jsonb_build_object('ok', false, 'reason', 'view_only'); end if;
  perform dela_conf_log(p_agreement, p_person, c.id, case when p_action = 'download' then 'download' else 'open' end, '{}');
  return jsonb_build_object('ok', true, 'path', f.storage_path, 'ext', f.ext, 'name', f.name, 'view_only', c.view_only,
    'viewer', (select display_name from people where id = p_person), 'minutes', dela_int_setting('confidential.link_minutes', 5));
end $$;

create or replace function dela_conf_view_only(p_person uuid, p_side text, p_agreement uuid, p_file uuid, p_on boolean) returns jsonb language plpgsql as $$
declare acc jsonb;
begin
  acc := dela_conf_access(p_person, p_side, p_agreement, 'manage');
  if not (acc->>'ok')::boolean then return acc; end if;
  update conf_files set view_only = p_on where id = p_file and agreement_id = p_agreement and deleted_at is null;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform dela_conf_log(p_agreement, p_person, p_file, case when p_on then 'view_only_on' else 'view_only_off' end, '{}');
  return jsonb_build_object('ok', true);
end $$;

-- Only the hiring attorney adds or removes firm staff, and only active members of the same firm
create or replace function dela_conf_member(p_person uuid, p_side text, p_agreement uuid, p_member uuid, p_on boolean) returns jsonb language plpgsql as $$
declare acc jsonb; a agreements;
begin
  acc := dela_conf_access(p_person, p_side, p_agreement, 'manage');
  if not (acc->>'ok')::boolean then return acc; end if;
  if acc->>'role' <> 'hiring' then return jsonb_build_object('ok', false, 'reason', 'hiring_attorney_only'); end if;
  select * into a from agreements where id = p_agreement;
  if p_on then
    if not exists (select 1 from org_members where org_id = a.attorney_org and person_id = p_member and status = 'active') then return jsonb_build_object('ok', false, 'reason', 'not_in_firm'); end if;
    insert into conf_members (agreement_id, person_id, added_by) values (p_agreement, p_member, p_person)
    on conflict (agreement_id, person_id) do update set removed_at = null, added_by = excluded.added_by, added_at = now();
  else
    update conf_members set removed_at = now() where agreement_id = p_agreement and person_id = p_member and removed_at is null;
  end if;
  perform dela_conf_log(p_agreement, p_person, null, case when p_on then 'member_added' else 'member_removed' end, jsonb_build_object('person_id', p_member));
  return jsonb_build_object('ok', true);
end $$;

-- A dispute: each person agrees or declines a Lawfecta reviewer's access (both must agree)
create or replace function dela_conf_review_consent(p_person uuid, p_side text, p_agreement uuid, p_agree boolean) returns jsonb language plpgsql as $$
declare a agreements; d disputes;
begin
  select * into a from agreements where id = p_agreement;
  if a.id is null or p_person not in (a.attorney_person, a.freelancer_person) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into d from disputes where agreement_id = a.id and status in ('notice', 'team_review') order by created_at desc limit 1;
  if d.id is null then return jsonb_build_object('ok', false, 'reason', 'no_open_dispute'); end if;
  insert into conf_review_consents (dispute_id, agreement_id, person_id, agree) values (d.id, a.id, p_person, p_agree)
  on conflict (dispute_id, person_id) do update set agree = excluded.agree, at = now();
  perform dela_conf_log(a.id, p_person, null, case when p_agree then 'review_agreed' else 'review_declined' end, jsonb_build_object('dispute_id', d.id));
  return jsonb_build_object('ok', true);
end $$;

-- The Lawfecta reviewer's view: only with both people's agreement on an open dispute, and every open is logged and shown to both
create or replace function dela_conf_reviewer(p_actor uuid, p_agreement uuid, p_file uuid) returns jsonb language plpgsql as $$
declare a agreements; d disputes; c conf_files; f files;
begin
  perform dela_require_staff(p_actor, array['reviewer']);
  select * into a from agreements where id = p_agreement;
  select * into d from disputes where agreement_id = p_agreement and status in ('notice', 'team_review') order by created_at desc limit 1;
  if a.id is null or d.id is null then return jsonb_build_object('ok', false, 'reason', 'no_open_dispute'); end if;
  if (select count(*) from conf_review_consents r where r.dispute_id = d.id and r.agree and r.person_id in (a.attorney_person, a.freelancer_person)) < 2 then
    return jsonb_build_object('ok', false, 'reason', 'both_must_agree');
  end if;
  if a.conf_deleted_at is not null then return jsonb_build_object('ok', false, 'reason', 'confidential_deleted'); end if;
  if p_file is null then
    perform dela_conf_log(p_agreement, p_actor, null, 'review_open', jsonb_build_object('dispute_id', d.id));
    return jsonb_build_object('ok', true,
      'files', (select coalesce(jsonb_agg(jsonb_build_object('id', c2.id, 'name', f2.name, 'ext', f2.ext, 'at', c2.created_at, 'by', pe.display_name) order by c2.created_at), '[]')
        from conf_files c2 join files f2 on f2.id = c2.file_id join people pe on pe.id = c2.uploaded_by where c2.agreement_id = p_agreement and c2.deleted_at is null),
      'messages', (select coalesce(jsonb_agg(jsonb_build_object('body', m.body, 'by', pe.display_name, 'at', m.created_at) order by m.created_at), '[]')
        from conf_messages m join people pe on pe.id = m.author where m.agreement_id = p_agreement and m.deleted_at is null));
  end if;
  select * into c from conf_files where id = p_file and agreement_id = p_agreement and deleted_at is null;
  select * into f from files where id = c.file_id and status = 'ready';
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform dela_conf_log(p_agreement, p_actor, c.id, 'review_open', jsonb_build_object('dispute_id', d.id));
  return jsonb_build_object('ok', true, 'path', f.storage_path, 'ext', f.ext, 'name', f.name, 'viewer', 'Lawfecta reviewer', 'minutes', dela_int_setting('confidential.link_minutes', 5));
end $$;

-- Confidential deliverables on a milestone (never read by the AI)
create or replace function dela_conf_attach_submission(p_person uuid, p_submission uuid, p_files uuid[]) returns jsonb language plpgsql as $$
declare s milestone_submissions; v_ag uuid; v_ok uuid[];
begin
  select * into s from milestone_submissions where id = p_submission and submitted_by = p_person;
  if s.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select agreement_id into v_ag from milestones where id = s.milestone_id;
  select coalesce(array_agg(id), '{}') into v_ok from conf_files where id = any(p_files) and agreement_id = v_ag and deleted_at is null;
  update milestone_submissions set conf_files = v_ok where id = s.id;
  if array_length(v_ok, 1) > 0 then perform dela_conf_log(v_ag, p_person, null, 'attached_to_milestone', jsonb_build_object('submission_id', s.id, 'count', array_length(v_ok, 1))); end if;
  return jsonb_build_object('ok', true, 'count', coalesce(array_length(v_ok, 1), 0));
end $$;

-- "Extend 14 days" (the attorney side, no limit, every extension logged). Works until the file is deleted.
create or replace function dela_conf_extend(p_person uuid, p_side text, p_agreement uuid, p_file uuid) returns jsonb language plpgsql as $$
declare acc jsonb; c conf_files;
begin
  acc := dela_conf_access(p_person, p_side, p_agreement, 'manage');
  if not (acc->>'ok')::boolean then return acc; end if;
  if not dela_conf_fresh(p_person) then return jsonb_build_object('ok', false, 'reason', 'login_needed'); end if;
  update conf_files set expires_at = greatest(expires_at, now()) + make_interval(days => dela_int_setting('sharing.extend_days', 14))
  where id = p_file and agreement_id = p_agreement and deleted_at is null returning * into c;
  if c.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform dela_conf_log(p_agreement, p_person, c.id, 'extended', jsonb_build_object('expires_at', c.expires_at));
  return jsonb_build_object('ok', true, 'expires_at', c.expires_at, 'job_ended', (acc->'state'->>'ended')::boolean);
end $$;

-- Delete a file now: immediate and permanent. The attorney side can delete any file; the freelancer only their own.
-- Returns the storage path; the api removes the object at once.
create or replace function dela_conf_file_delete(p_person uuid, p_side text, p_agreement uuid, p_file uuid) returns jsonb language plpgsql as $$
declare acc jsonb; c conf_files; f files;
begin
  acc := dela_conf_access(p_person, p_side, p_agreement, 'view');
  if not (acc->>'ok')::boolean then return acc; end if;
  if not dela_conf_fresh(p_person) then return jsonb_build_object('ok', false, 'reason', 'login_needed'); end if;
  select * into c from conf_files where id = p_file and agreement_id = p_agreement and deleted_at is null for update;
  if c.id is null then return jsonb_build_object('ok', true, 'duplicate', true, 'paths', '[]'::jsonb); end if;
  if acc->>'role' not in ('hiring', 'firm') and c.uploaded_by <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  select * into f from files where id = c.file_id;
  perform dela_conf_files_gone(array[c.id], 'deleted_by_member', p_person);
  return jsonb_build_object('ok', true, 'paths', jsonb_build_array(f.storage_path));
end $$;

-- "Delete now" on a job marked sensitive: every confidential file on it, at once (the attorney side only)
create or replace function dela_conf_delete_all_files(p_person uuid, p_side text, p_agreement uuid) returns jsonb language plpgsql as $$
declare acc jsonb; v_ids uuid[]; v_paths jsonb;
begin
  acc := dela_conf_access(p_person, p_side, p_agreement, 'manage');
  if not (acc->>'ok')::boolean then return acc; end if;
  select coalesce(array_agg(c.id), '{}'), coalesce(jsonb_agg(f.storage_path), '[]') into v_ids, v_paths
  from conf_files c join files f on f.id = c.file_id where c.agreement_id = p_agreement and c.deleted_at is null;
  perform dela_conf_files_gone(v_ids, 'deleted_by_member', p_person);
  return jsonb_build_object('ok', true, 'count', cardinality(v_ids), 'paths', v_paths);
end $$;

-- Marks files gone (the api has removed or is removing the storage objects). Text is never kept for these files.
create or replace function dela_conf_files_gone(p_ids uuid[], p_reason text, p_person uuid default null) returns void language plpgsql as $$
declare c record;
begin
  for c in select cf.id, cf.agreement_id, cf.file_id, f.name from conf_files cf join files f on f.id = cf.file_id where cf.id = any(p_ids) and cf.deleted_at is null loop
    update conf_files set deleted_at = now(), deleted_reason = p_reason where id = c.id;
    update files set status = 'deleted', deleted_at = now(), updated_at = now() where id = c.file_id and status <> 'deleted';
    delete from file_texts where file_id = c.file_id;
    perform dela_conf_log(c.agreement_id, p_person, c.id, case when p_reason = 'deleted_by_member' then 'file_deleted' else 'files_expired' end, jsonb_build_object('name', c.name, 'reason', p_reason));
  end loop;
end $$;

-- "Download all": every file the attorney side can still download (view-only files are left out and counted)
create or replace function dela_conf_download_all(p_person uuid, p_side text, p_agreement uuid) returns jsonb language plpgsql as $$
declare acc jsonb; v_files jsonb; v_skipped int;
begin
  acc := dela_conf_access(p_person, p_side, p_agreement, 'manage');
  if not (acc->>'ok')::boolean then return acc; end if;
  if not dela_conf_fresh(p_person) then return jsonb_build_object('ok', false, 'reason', 'login_needed'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'path', f.storage_path, 'name', f.name)), '[]') into v_files
  from conf_files c join files f on f.id = c.file_id where c.agreement_id = p_agreement and c.deleted_at is null and not c.view_only and f.status = 'ready';
  select count(*) into v_skipped from conf_files where agreement_id = p_agreement and deleted_at is null and view_only;
  insert into conf_log (agreement_id, person_id, file_id, action, detail)
  select p_agreement, p_person, (x->>'id')::uuid, 'download', '{"all": true}'::jsonb from jsonb_array_elements(v_files) x;
  return jsonb_build_object('ok', true, 'files', v_files, 'view_only_skipped', v_skipped, 'minutes', dela_int_setting('confidential.link_minutes', 5));
end $$;

-- ---------- Secure links ----------
-- Added by the attorney side only (the hiring attorney, firm owners and managers, staff the attorney added). The api
-- checks the address (https, no login details in it) and DELA never opens it.
create or replace function dela_conf_link_add(p_person uuid, p_side text, p_agreement uuid, p jsonb) returns jsonb language plpgsql as $$
declare acc jsonb; l conf_links; v_req text := left(coalesce(p->>'request_id', ''), 80); v_days int; a agreements; v_title text;
begin
  acc := dela_conf_access(p_person, p_side, p_agreement, 'write');
  if not (acc->>'ok')::boolean then return acc; end if;
  if acc->>'role' = 'freelancer' then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if not dela_conf_fresh(p_person) then return jsonb_build_object('ok', false, 'reason', 'login_needed'); end if;
  if v_req = '' or coalesce(p->>'url', '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  select * into l from conf_links where agreement_id = p_agreement and added_by = p_person and request_id = v_req;
  if l.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', l.id); end if;
  if (select count(*) from conf_links where agreement_id = p_agreement and removed_at is null and expired_at is null and expires_at > now()) >= dela_int_setting('links.max_per_engagement', 25) then
    return jsonb_build_object('ok', false, 'reason', 'too_many_links', 'max', dela_int_setting('links.max_per_engagement', 25));
  end if;
  v_days := dela_sharing_days((p->>'expiry_days')::int);
  insert into conf_links (agreement_id, label, url, host, expires_at, added_by, request_id)
  values (p_agreement, left(btrim(coalesce(p->>'label', '')), 80), left(p->>'url', 2000), left(coalesce(p->>'host', ''), 120), now() + make_interval(days => v_days), p_person, v_req)
  returning * into l;
  perform dela_conf_log(p_agreement, p_person, null, 'link_added', jsonb_build_object('host', l.host, 'expires_at', l.expires_at), l.id);
  perform dela_conf_notify(p_agreement, p_person, 'link:' || l.id);
  return jsonb_build_object('ok', true, 'id', l.id, 'expires_at', l.expires_at);
end $$;

-- Opening a link: checked at the moment, logged under the person's name, then the address is handed to the browser
create or replace function dela_conf_link_open(p_person uuid, p_side text, p_agreement uuid, p_link uuid) returns jsonb language plpgsql as $$
declare acc jsonb; l conf_links;
begin
  acc := dela_conf_access(p_person, p_side, p_agreement, 'view');
  if not (acc->>'ok')::boolean then return acc; end if;
  if not dela_conf_fresh(p_person) then return jsonb_build_object('ok', false, 'reason', 'login_needed'); end if;
  if acc->>'role' = 'freelancer' and not exists (select 1 from conf_acks where agreement_id = p_agreement and person_id = p_person) then return jsonb_build_object('ok', false, 'reason', 'ack_needed'); end if;
  select * into l from conf_links where id = p_link and agreement_id = p_agreement;
  if l.id is null or l.removed_at is not null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if l.expired_at is not null or l.expires_at <= now() or l.url is null then return jsonb_build_object('ok', false, 'reason', 'link_expired'); end if;
  if acc->>'role' = 'freelancer' and (acc->'state'->>'ended')::boolean then return jsonb_build_object('ok', false, 'reason', 'confidential_ended'); end if;
  perform dela_conf_log(p_agreement, p_person, null, 'link_open', '{}', l.id);
  return jsonb_build_object('ok', true, 'url', l.url);
end $$;

-- Removing a link erases its address at once
create or replace function dela_conf_link_remove(p_person uuid, p_side text, p_agreement uuid, p_link uuid) returns jsonb language plpgsql as $$
declare acc jsonb; l conf_links;
begin
  acc := dela_conf_access(p_person, p_side, p_agreement, 'view');
  if not (acc->>'ok')::boolean then return acc; end if;
  if acc->>'role' = 'freelancer' then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  update conf_links set url = null, removed_at = now() where id = p_link and agreement_id = p_agreement and removed_at is null returning * into l;
  if l.id is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  perform dela_conf_log(p_agreement, p_person, null, 'link_removed', '{}', l.id);
  return jsonb_build_object('ok', true);
end $$;

-- Hourly: links about to expire get the first email; expired links lose their address and get the second email.
-- Wording from Stacey (2026-11-05). The emails go to the hiring attorney.
create or replace function dela_links_sweep() returns jsonb language plpgsql as $$
declare l record; v_title text; v_date text; v_warned int := 0; v_expired int := 0;
  v_tail1 constant text := ' DELA cannot change sharing settings in your own storage, so please turn off sharing for this file in Google Drive, Dropbox or wherever it is stored once the work is done.';
  v_tail2 constant text := ' DELA cannot change sharing settings in your own storage, so please turn off sharing for this file in Google Drive, Dropbox or wherever it is stored.';
begin
  for l in select k.*, a.attorney_person, a.gig_id from conf_links k join agreements a on a.id = k.agreement_id
           where k.removed_at is null and k.expired_at is null and k.warned_at is null and k.expires_at > now()
             and k.expires_at <= now() + make_interval(days => dela_int_setting('links.warn_days', 2)) for update of k loop
    select title into v_title from gigs where id = l.gig_id;
    v_date := to_char(l.expires_at at time zone dela_tz(), 'Mon FMDD, YYYY');
    perform dela_notify(jsonb_build_object('person_id', l.attorney_person, 'side', 'attorney', 'kind', 'engagement', 'email', true, 'essential', true,
      'title', 'Your shared link for ' || coalesce(v_title, 'your job') || ' expires on ' || v_date,
      'body', 'Your shared link for ' || coalesce(v_title, 'your job') || ' expires on ' || v_date || '. After that, the freelancer can no longer open it in DELA.' || v_tail1,
      'link', '/dela?tab=projects&gig=' || l.gig_id::text || '&view=agreement', 'dedupe_key', 'linkwarn:' || l.id));
    update conf_links set warned_at = now() where id = l.id;
    v_warned := v_warned + 1;
  end loop;
  for l in select k.*, a.attorney_person, a.gig_id from conf_links k join agreements a on a.id = k.agreement_id
           where k.removed_at is null and k.expired_at is null and k.expires_at <= now() for update of k loop
    select title into v_title from gigs where id = l.gig_id;
    update conf_links set url = null, expired_at = now() where id = l.id;
    perform dela_conf_log(l.agreement_id, null, null, 'link_expired', '{}', l.id);
    perform dela_notify(jsonb_build_object('person_id', l.attorney_person, 'side', 'attorney', 'kind', 'engagement', 'email', true, 'essential', true,
      'title', 'Your shared link for ' || coalesce(v_title, 'your job') || ' has expired',
      'body', 'Your shared link for ' || coalesce(v_title, 'your job') || ' has expired, and the freelancer can no longer open it in DELA.' || v_tail2,
      'link', '/dela?tab=projects&gig=' || l.gig_id::text || '&view=agreement', 'dedupe_key', 'linkexp:' || l.id));
    update conf_links set expired_mailed_at = now() where id = l.id;
    v_expired := v_expired + 1;
  end loop;
  -- Removed links never keep an address
  update conf_links set url = null where removed_at is not null and url is not null;
  return jsonb_build_object('warned', v_warned, 'expired', v_expired);
end $$;

-- Daily: the "Download all" reminder 2 days before files are deleted, the files due for deletion (7 days after access
-- ends), and the messages of jobs that ended 7 days ago. An open dispute holds both. Returns the files for the api to
-- remove from storage; dela_conf_files_gone and dela_conf_messages_gone mark them.
create or replace function dela_conf_daily() returns jsonb language plpgsql as $$
declare a agreements; v_title text; v_due jsonb := '[]'; v_msgs jsonb := '[]'; v_soon int; v_when timestamptz;
begin
  for a in select ag.* from agreements ag where exists (select 1 from conf_files c where c.agreement_id = ag.id and c.deleted_at is null)
           or (ag.status in ('completed', 'canceled') and exists (select 1 from conf_messages m where m.agreement_id = ag.id and m.deleted_at is null)) loop
    if exists (select 1 from disputes d where d.agreement_id = a.id and d.status in ('notice', 'team_review')) then continue; end if;
    v_due := v_due || coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'path', f.storage_path)) from conf_files c join files f on f.id = c.file_id
      where c.agreement_id = a.id and c.deleted_at is null and dela_conf_file_delete_at(c, a) <= now()), '[]');
    select count(*), min(dela_conf_file_delete_at(c, a)) into v_soon, v_when from conf_files c
    where c.agreement_id = a.id and c.deleted_at is null and dela_conf_file_delete_at(c, a) > now()
      and dela_conf_file_delete_at(c, a) <= now() + make_interval(days => dela_int_setting('sharing.download_all_reminder_days', 2));
    if v_soon > 0 then
      select title into v_title from gigs where id = a.gig_id;
      perform dela_notify(jsonb_build_object('person_id', a.attorney_person, 'side', 'attorney', 'kind', 'engagement', 'email', true, 'essential', true,
        'title', 'Files in Confidential materials will be deleted soon',
        'body', v_soon || case when v_soon = 1 then ' file' else ' files' end || ' in Confidential materials on ' || coalesce(v_title, 'your job') || ' will be deleted on ' ||
          to_char(v_when at time zone dela_tz(), 'Mon FMDD, YYYY') || '. Open the job and click "Download all" if you need a copy.',
        'link', '/dela?tab=projects&gig=' || a.gig_id::text || '&view=agreement', 'dedupe_key', 'confdel:' || a.id || ':' || (v_when at time zone dela_tz())::date));
    end if;
    if a.status in ('completed', 'canceled') and coalesce(a.completed_at, a.canceled_at, a.updated_at) + make_interval(days => dela_int_setting('sharing.grace_days', 7)) <= now()
       and exists (select 1 from conf_messages m where m.agreement_id = a.id and m.deleted_at is null) then
      v_msgs := v_msgs || to_jsonb(a.id);
    end if;
  end loop;
  return jsonb_build_object('files', v_due, 'messages', v_msgs);
end $$;
-- Message text is removed; the record that a message existed stays in the log
create or replace function dela_conf_messages_gone(p_agreement uuid) returns void language plpgsql as $$
begin
  update conf_messages set body = '[deleted]', deleted_at = now() where agreement_id = p_agreement and deleted_at is null;
  if not exists (select 1 from conf_files where agreement_id = p_agreement and deleted_at is null) then update agreements set conf_deleted_at = now() where id = p_agreement and conf_deleted_at is null; end if;
  perform dela_conf_log(p_agreement, null, null, 'messages_deleted', '{}');
end $$;

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
  perform dela_job_enqueue('confidential_daily', '{}', now(), 'confidential_daily:' || local::date);
end $$;

-- The Lawfecta Team sees counts only: never names, files or messages
create or replace function dela_admin_confidential(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  return jsonb_build_object('switch', (select state from feature_switches where key = 'confidential_materials'), 'paused', dela_paused('confidential'),
    'scanner', dela_setting_text('confidential.scan_provider', 'none'),
    'engagements', (select count(distinct agreement_id) from conf_files where deleted_at is null), 'files', (select count(*) from conf_files where deleted_at is null),
    'messages', (select count(*) from conf_messages where deleted_at is null),
    'bytes', (select coalesce(sum(f.size_bytes), 0) from conf_files c join files f on f.id = c.file_id where c.deleted_at is null),
    'not_scanned', (select count(*) from conf_files where deleted_at is null and scan_state = 'not_scanned'),
    'refused_30d', (select count(*) from conf_log where action = 'upload_refused' and at > now() - interval '30 days'),
    'deletions_due_7d', (select count(*) from conf_files c join agreements a on a.id = c.agreement_id where c.deleted_at is null and dela_conf_file_delete_at(c, a) <= now() + interval '7 days'),
    'links_open', (select count(*) from conf_links where removed_at is null and expired_at is null and expires_at > now()),
    'links_expired_30d', (select count(*) from conf_links where expired_at > now() - interval '30 days'),
    'deleted_30d', (select count(*) from conf_files where deleted_at > now() - interval '30 days'),
    'sensitive_jobs', (select count(*) from gigs where sensitive),
    'reviews', (select coalesce(jsonb_agg(jsonb_build_object('agreement_id', x.agreement_id, 'dispute_id', x.dispute_id, 'agreed', x.n)), '[]') from (
      select r.agreement_id, r.dispute_id, count(*) filter (where r.agree) n from conf_review_consents r join disputes d on d.id = r.dispute_id where d.status in ('notice', 'team_review') group by 1, 2) x));
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

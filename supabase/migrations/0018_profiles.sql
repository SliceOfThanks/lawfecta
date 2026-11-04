-- Step 3: profiles and verification for both sides. Brief docs/briefs/step-3-profiles-verification.md, answered by
-- Stacey 2026-11-04. Additive only. The Lawfecta directory listing (BD) stays the public profile; DELA fills from it and,
-- when the member chooses, writes changes back (switch bd_profile_sync).

insert into settings (key, value, label, section, unit, status, source, note) values
  ('profile.availability_days', '14', 'Freelancers confirm availability every', 'Profiles and verification', 'days', 'C', 'Stacey 2026-11-04 (Step 3 question 7)', ''),
  ('profile.availability_reminder_days', '2', 'Reminder before availability runs out', 'Profiles and verification', 'days', 'C', 'Stacey 2026-11-04 (Step 3 question 7)', ''),
  ('profile.docs_max', '10', 'Profile documents per freelancer', 'Profiles and verification', 'files', 'O', 'Step 3 brief (suggestion by Claude)', ''),
  ('profile.doc_max_mb', '10', 'Largest profile document', 'Profiles and verification', 'MB', 'O', 'Step 3 brief (suggestion by Claude)', ''),
  ('profile.required.attorney', '["first_name","last_name","firm_name","practice_areas","jurisdictions","city","state"]', 'Attorney profile: required parts', 'Profiles and verification', '', 'O', '1A section 7', ''),
  ('profile.required.freelancer', '["first_name","last_name","headline","summary","practice_areas","services","experience","software","timezone","capacity","linkedin","acknowledged"]', 'Freelancer profile: required parts', 'Profiles and verification', '', 'O', '1A section 7', ''),
  ('verify.countries', '["US"]', 'Countries whose attorney licenses the Lawfecta Team verifies', 'Profiles and verification', '', 'O', 'Stacey 2026-11-04 (Step 3 question 8: to confirm)', 'Attorneys from other countries can still sign up and keep a profile.'),
  ('verify.free_email_domains', '["gmail.com","googlemail.com","yahoo.com","ymail.com","rocketmail.com","hotmail.com","outlook.com","live.com","msn.com","aol.com","icloud.com","me.com","mac.com","proton.me","protonmail.com","pm.me","gmx.com","gmx.us","mail.com","zoho.com","zohomail.com","yandex.com","hey.com","fastmail.com","comcast.net","att.net","sbcglobal.net","verizon.net","cox.net","charter.net","earthlink.net"]', 'Free email services that never count for license checks', 'Profiles and verification', '', 'C', 'Stacey 2026-11-04 (Step 3 question 2)', 'Add more in the admin area.'),
  ('verify.email_link_hours', '24', 'Hours a license confirmation email link works', 'Profiles and verification', 'hours', 'R', 'Claude', ''),
  ('verify.video_minutes', '10', 'Length of the confirming video call', 'Profiles and verification', 'minutes', 'C', 'Stacey 2026-11-04 (Step 3 question 2)', ''),
  ('verify.video_booking_url', '""', 'Where attorneys book the confirming video call (empty: the team emails them)', 'Profiles and verification', '', 'O', 'Step 3 brief', 'For example a TidyCal or Calendly link.'),
  ('verify.recheck_months', '12', 'Re-check verified licenses every', 'Profiles and verification', 'months', 'O', 'Step 3 brief (suggested)', ''),
  ('verify.recheck_grace_days', '30', 'Days a due re-check can wait before the license counts as expired', 'Profiles and verification', 'days', 'O', 'Step 3 brief (suggestion by Claude)', ''),
  ('verify.target_business_days', '2', 'Target time for the team to answer a verification request', 'Profiles and verification', 'business days', 'O', 'Step 3 brief (suggested)', ''),
  ('verify.freelancer_linkedin', 'true', 'Freelancers need a checked LinkedIn profile to be match-ready', 'Profiles and verification', '', 'C', 'Stacey 2026-11-04 (Step 3 question 4)', 'No ID documents or passports are collected.'),
  ('bd.profile_map', '{"first_name":"first_name","last_name":"last_name","firm_name":"company","headline":"position","city":"city","state":"state_code","country":"country_code","zip":"zip_code","phone":"phone_number","website":"website","linkedin":"linkedin","summary":"about_me","experience":"experience","education":"education","software":"software","booking_link":"booking_link","photo_url":"image_main_file"}', 'Lawfecta directory listing fields DELA reads and writes', 'Profiles and verification', '', 'R', 'BD site check 2026-11-04 (hirelegalhelp.com user fields)', 'photo_url is read only. Categories wait on the BD key permission for categories.')
on conflict (key) do nothing;

insert into feature_switches (key, label, gate) values
  ('profiles', 'Profiles (both sides)', 'Step 3 tested'),
  ('attorney_verification', 'Attorney license verification', 'Step 3 tested'),
  ('freelancer_verification', 'Freelancer LinkedIn check', 'Step 3 tested'),
  ('profile_documents', 'Freelancer profile documents', 'Step 3 tested'),
  ('bd_profile_sync', 'Write profile changes to the Lawfecta directory listing', 'Step 3 tested on the test site with a test member')
on conflict (key) do nothing;

-- Profile documents are files with their own purpose; "shown" means attorneys may see them
alter table files drop constraint if exists files_purpose_check;
alter table files add constraint files_purpose_check check (purpose in ('member', 'recording', 'profile'));
alter table files add column if not exists shown boolean not null default false;

-- A license check email may go to an address other than the login email
alter table notifications add column if not exists to_email text not null default '';

create or replace function dela_email_load(p_notification uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('id', n.id, 'status', n.status, 'title', n.title, 'body', n.body, 'link', n.link, 'kind', n.kind, 'essential', n.essential,
    'to_email', coalesce(nullif(n.to_email, ''), p.email), 'to_name', p.display_name, 'person_status', p.status,
    'from_name', dela_setting_text('email.from_name', 'Lawfecta DELA'), 'from_address', dela_setting_text('email.from_address', ''),
    'site_url', dela_setting_text('site.url', ''), 'app_path', dela_setting_text('site.app_path', '/dela'),
    'sender', dela_setting_text('email.sender', 'log'), 'environment', dela_setting_text('environment', 'staging'))
  from notifications n join people p on p.id = n.person_id where n.id = p_notification and n.channel = 'email'
$$;

create table member_profiles (
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  body jsonb not null default '{}',
  missing text[] not null default '{}',
  score int not null default 0,
  version int not null default 0,
  availability text not null default 'available' check (availability in ('available', 'limited', 'unavailable')),
  availability_confirmed_at timestamptz,
  availability_reminded_for date,
  directory boolean not null default true,       -- this side's changes go to the directory listing
  bd_state text not null default 'none' check (bd_state in ('none', 'waiting', 'done', 'failed')),
  bd_error text not null default '',
  bd_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (person_id, side)
);

-- Every availability answer, append-only. Only a signed in website action counts.
create table availability_log (
  id bigserial primary key,
  person_id uuid not null references people(id),
  at timestamptz not null default now(),
  state text not null,
  source text not null default 'website'
);
create trigger availability_log_append_only before update or delete on availability_log for each row execute function dela_no_change();

-- Firm details for paid work (billing address, who may sign). Edited by the owner or firm staff they named.
create table firm_profiles (
  org_id uuid primary key references organizations(id),
  body jsonb not null default '{}',
  updated_by uuid references people(id),
  updated_at timestamptz not null default now()
);

create table licenses (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id),
  request_id text not null,
  country text not null default 'US',
  region text not null,                     -- state or territory code
  bar_number text not null,
  bar_key text not null,                    -- the number in capitals without spaces or dashes, to find the same license twice
  name_on_record text not null,
  contact_email text not null default '',
  method text not null check (method in ('email', 'video')),
  status text not null default 'pending' check (status in ('pending', 'needs_more', 'verified', 'not_verified', 'expired', 'withdrawn')),
  email_confirmed_at timestamptz,
  video_requested_at timestamptz,
  video_done_at timestamptz,
  identity text check (identity in ('bar_email', 'firm_domain', 'video')),
  duplicate_of uuid references licenses(id),
  reason text not null default '',
  lookup_note text not null default '',
  decided_by uuid references people(id),
  decided_at timestamptz,
  next_check_at date,
  recheck_due boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, request_id)
);
create index licenses_key on licenses (country, region, bar_key) where status in ('pending', 'needs_more', 'verified');
create index licenses_person on licenses (person_id);

create table email_checks (
  token_hash text primary key,
  person_id uuid not null references people(id),
  license_id uuid not null references licenses(id),
  email text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  confirmed_at timestamptz
);

create table linkedin_checks (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id),
  url text not null,
  status text not null default 'pending' check (status in ('pending', 'needs_more', 'verified', 'not_verified', 'withdrawn')),
  name_matches boolean,
  badge_seen boolean,
  reason text not null default '',
  decided_by uuid references people(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index linkedin_checks_person on linkedin_checks (person_id, created_at desc);

-- Everything that happens in a check, append-only
create table verification_events (
  id bigserial primary key,
  at timestamptz not null default now(),
  subject text not null check (subject in ('license', 'linkedin')),
  subject_id uuid not null,
  person_id uuid not null references people(id),
  actor_type text not null,
  actor uuid,
  action text not null,
  detail jsonb not null default '{}'
);
create index verification_events_subject on verification_events (subject_id, at);
create trigger verification_events_append_only before update or delete on verification_events for each row execute function dela_no_change();

do $$
declare t text;
begin
  foreach t in array array['member_profiles', 'availability_log', 'firm_profiles', 'licenses', 'email_checks', 'linkedin_checks', 'verification_events'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end $$;

-- ---------- Helpers ----------

create or replace function dela_us_regions() returns text[] language sql immutable as $$
  select array['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','PR','GU','VI','AS','MP']
$$;

create or replace function dela_email_domain(p text) returns text language sql immutable as $$
  select lower(split_part(btrim(coalesce(p, '')), '@', 2))
$$;

create or replace function dela_free_email(p text) returns boolean language sql stable as $$
  select dela_email_domain(p) = '' or dela_setting('verify.free_email_domains') ? dela_email_domain(p)
$$;

create or replace function dela_verify_event(p_subject text, p_id uuid, p_person uuid, p_actor_type text, p_actor uuid, p_action text, p_detail jsonb) returns void language sql as $$
  insert into verification_events (subject, subject_id, person_id, actor_type, actor, action, detail) values (p_subject, p_id, p_person, p_actor_type, p_actor, p_action, coalesce(p_detail, '{}'))
$$;

-- A license counts while it is verified and its re-check is not more than the grace days late
create or replace function dela_license_counts(l licenses) returns boolean language sql stable as $$
  select l.status = 'verified' and (l.next_check_at is null or l.next_check_at + dela_int_setting('verify.recheck_grace_days', 30) > (now() at time zone dela_tz())::date)
$$;

-- Where a profile stands. Attorney: restricted, incomplete, verification_pending, match_ready (may hire once Step 4 opens).
-- Freelancer: restricted, unavailable, incomplete, verification_pending, availability_stale, match_ready.
create or replace function dela_profile_state(p_person uuid, p_side text) returns jsonb language plpgsql stable as $$
declare sp side_profiles; mp member_profiles; v_ver text; v_ready text; v_li linkedin_checks; v_days int := dela_int_setting('profile.availability_days', 14);
  v_due timestamptz;
begin
  select * into sp from side_profiles where person_id = p_person and side = p_side;
  if sp.id is null then return jsonb_build_object('ok', false, 'reason', 'no_side'); end if;
  select * into mp from member_profiles where person_id = p_person and side = p_side;
  if p_side = 'attorney' then
    v_ver := case
      when exists (select 1 from licenses l where l.person_id = p_person and dela_license_counts(l)) then 'verified'
      when exists (select 1 from licenses l where l.person_id = p_person and l.status in ('pending', 'needs_more')) then 'pending'
      when exists (select 1 from licenses l where l.person_id = p_person and l.status = 'expired') then 'expired'
      when exists (select 1 from licenses l where l.person_id = p_person and l.status = 'not_verified') then 'rejected'
      else 'not_started' end;
  else
    select * into v_li from linkedin_checks where person_id = p_person and status <> 'withdrawn' order by created_at desc limit 1;
    v_ver := case
      when not coalesce((dela_setting('verify.freelancer_linkedin') #>> '{}')::boolean, true) then 'not_required'
      when v_li.status = 'verified' then 'verified'
      when v_li.status in ('pending', 'needs_more') then 'pending'
      when v_li.status = 'not_verified' then 'rejected'
      else 'not_started' end;
  end if;
  v_due := case when mp.availability_confirmed_at is null then null else mp.availability_confirmed_at + make_interval(days => v_days) end;
  v_ready := case
    when sp.status <> 'active' or dela_has_hold(p_person) then 'restricted'
    when p_side = 'freelancer' and mp.availability = 'unavailable' then 'unavailable'
    when mp.person_id is null or cardinality(mp.missing) > 0 then 'incomplete'
    when v_ver not in ('verified', 'not_required') then 'verification_pending'
    when p_side = 'freelancer' and (v_due is null or v_due < now()) then 'availability_stale'
    else 'match_ready' end;
  return jsonb_build_object('ok', true, 'verification', v_ver, 'readiness', v_ready, 'missing', coalesce(to_jsonb(mp.missing), '["everything"]'),
    'score', coalesce(mp.score, 0), 'availability', coalesce(mp.availability, 'available'), 'availability_confirmed_at', mp.availability_confirmed_at,
    'availability_due_at', v_due, 'availability_days', v_days);
end $$;

-- Keeps side_profiles in step, so other parts (matching in Step 4) read one place
create or replace function dela_profile_refresh(p_person uuid, p_side text) returns jsonb language plpgsql as $$
declare s jsonb := dela_profile_state(p_person, p_side);
begin
  if not coalesce((s->>'ok')::boolean, false) then return s; end if;
  update side_profiles set verification_state = s->>'verification', readiness_state = s->>'readiness', updated_at = now()
  where person_id = p_person and side = p_side and (verification_state, readiness_state) is distinct from (s->>'verification', s->>'readiness');
  return s;
end $$;

-- What an attorney may do now. Step 4 calls this before posting a gig or hiring.
create or replace function dela_attorney_eligibility(p_person uuid) returns jsonb language plpgsql stable as $$
declare s jsonb := dela_profile_state(p_person, 'attorney'); f firm_profiles; v_missing text[] := '{}';
begin
  if not coalesce((s->>'ok')::boolean, false) then return jsonb_build_object('can_post', false, 'can_pay', false, 'reason', 'no_side'); end if;
  select * into f from firm_profiles where org_id = dela_side_org(p_person, 'attorney');
  if coalesce(f.body->>'billing_address', '') = '' then v_missing := v_missing || 'billing_address'::text; end if;
  if coalesce(f.body->>'signatory_name', '') = '' then v_missing := v_missing || 'signatory'::text; end if;
  if coalesce(f.body->>'service_email', '') = '' then v_missing := v_missing || 'service_email'::text; end if;
  return jsonb_build_object('can_post', s->>'readiness' = 'match_ready', 'can_pay', s->>'readiness' = 'match_ready' and cardinality(v_missing) = 0,
    'verification', s->>'verification', 'readiness', s->>'readiness', 'missing_for_paid_work', to_jsonb(v_missing));
end $$;

create or replace function dela_profile_editable(p_person uuid, p_side text) returns text language sql stable as $$
  select case
    when not dela_switch_on('profiles', p_person) then 'profiles_off'
    when not exists (select 1 from side_profiles where person_id = p_person and side = p_side and status <> 'closed') then 'no_side'
    when dela_has_hold(p_person) then 'on_hold'
    else '' end
$$;

-- ---------- Profiles ----------

create or replace function dela_firm_role(p_person uuid, p_org uuid) returns text language sql stable as $$
  select coalesce((select case when o.owner_person_id = p_person then 'owner' else m.member_role end
    from organizations o left join org_members m on m.org_id = o.id and m.person_id = p_person and m.status = 'active'
    where o.id = p_org and (o.owner_person_id = p_person or m.person_id is not null)), '')
$$;

create or replace function dela_profile_get(p_person uuid, p_side text) returns jsonb language plpgsql as $$
declare mp member_profiles; v_org uuid := dela_side_org(p_person, p_side); f firm_profiles; v_role text;
begin
  if not dela_switch_on('profiles', p_person) then return jsonb_build_object('ok', false, 'reason', 'profiles_off'); end if;
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'no_side'); end if;
  select * into mp from member_profiles where person_id = p_person and side = p_side;
  v_role := dela_firm_role(p_person, v_org);
  if p_side = 'attorney' then select * into f from firm_profiles where org_id = v_org; end if;
  return jsonb_build_object('ok', true, 'side', p_side, 'exists', mp.person_id is not null, 'body', coalesce(mp.body, '{}'), 'version', coalesce(mp.version, 0),
    'state', dela_profile_refresh(p_person, p_side), 'directory', coalesce(mp.directory, true), 'bd_state', coalesce(mp.bd_state, 'none'), 'bd_error', coalesce(mp.bd_error, ''),
    'bd_synced_at', mp.bd_synced_at, 'sync_on', dela_switch_on('bd_profile_sync', p_person), 'required', dela_setting('profile.required.' || p_side),
    'firm', case when p_side = 'attorney' then jsonb_build_object('org_id', v_org, 'role', v_role, 'may_edit', v_role in ('owner', 'manager'), 'body', coalesce(f.body, '{}'),
      'name', (select name from organizations where id = v_org),
      'staff', (select coalesce(jsonb_agg(jsonb_build_object('bd_member_id', pe.bd_member_id, 'name', pe.display_name, 'role', m.member_role) order by pe.display_name), '[]')
        from org_members m join people pe on pe.id = m.person_id where m.org_id = v_org and m.status = 'active' and m.member_role <> 'owner'),
      'eligibility', dela_attorney_eligibility(p_person),
      'staff_of', (select coalesce(jsonb_agg(jsonb_build_object('org_id', o.id, 'name', coalesce(nullif(fp.body->>'legal_name', ''), nullif(o.name, ''), op.display_name), 'body', coalesce(fp.body, '{}'))), '[]')
        from org_members m join organizations o on o.id = m.org_id join people op on op.id = o.owner_person_id left join firm_profiles fp on fp.org_id = o.id
        where m.person_id = p_person and m.status = 'active' and m.member_role = 'manager' and o.owner_person_id <> p_person)) else null end,
    'licenses', case when p_side = 'attorney' then (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'country', l.country, 'region', l.region, 'bar_number', l.bar_number,
        'name_on_record', l.name_on_record, 'contact_email', l.contact_email, 'method', l.method, 'status', l.status, 'email_confirmed', l.email_confirmed_at is not null,
        'video_requested_at', l.video_requested_at, 'reason', l.reason, 'decided_at', l.decided_at, 'next_check_at', l.next_check_at, 'recheck_due', l.recheck_due,
        'counts', dela_license_counts(l), 'created_at', l.created_at) order by l.created_at desc), '[]') from licenses l where l.person_id = p_person and l.status <> 'withdrawn') else null end,
    'linkedin', case when p_side = 'freelancer' then (select jsonb_build_object('id', c.id, 'url', c.url, 'status', c.status, 'reason', c.reason, 'decided_at', c.decided_at, 'created_at', c.created_at)
        from linkedin_checks c where c.person_id = p_person and c.status <> 'withdrawn' order by c.created_at desc limit 1) else null end,
    'documents', case when p_side = 'freelancer' then (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'ext', x.ext, 'size_bytes', x.size_bytes, 'status', x.status,
        'shown', x.shown, 'check_reasons', x.check_reasons, 'refuse_reason', x.refuse_reason, 'created_at', x.created_at) order by x.created_at), '[]')
        from files x where x.org_id = v_org and x.purpose = 'profile' and x.status in ('uploading', 'checking', 'ready', 'held', 'refused')) else null end,
    'settings', jsonb_build_object('countries', dela_setting('verify.countries'), 'regions', to_jsonb(dela_us_regions()), 'video_minutes', dela_int_setting('verify.video_minutes', 10),
      'video_booking_url', dela_setting_text('verify.video_booking_url', ''), 'target_days', dela_int_setting('verify.target_business_days', 2),
      'docs_max', dela_int_setting('profile.docs_max', 10), 'doc_max_mb', dela_int_setting('profile.doc_max_mb', 10),
      'verification_on', dela_switch_on(case when p_side = 'attorney' then 'attorney_verification' else 'freelancer_verification' end, p_person),
      'documents_on', dela_switch_on('profile_documents', p_person)));
end $$;

-- Save. p: side, body (already cleaned by the api), missing, score, version (what the member started from), directory.
-- A save from an older copy is refused, so two tabs never overwrite each other silently.
create or replace function dela_profile_save(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_side text := p->>'side'; v_why text := dela_profile_editable(p_person, p->>'side'); mp member_profiles; v_sync boolean;
begin
  if v_why <> '' then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  perform pg_advisory_xact_lock(hashtextextended('profile:' || p_person::text || v_side, 0));
  select * into mp from member_profiles where person_id = p_person and side = v_side;
  -- The same content again (a second click) is no change, whichever copy it came from
  if mp.person_id is not null and mp.body = p->'body' and mp.directory = coalesce((p->>'directory')::boolean, true)
     and to_jsonb(mp.missing) = coalesce(p->'missing', '[]') then
    return jsonb_build_object('ok', true, 'duplicate', true, 'version', mp.version, 'state', dela_profile_refresh(p_person, v_side));
  end if;
  if mp.person_id is not null and coalesce((p->>'version')::int, -1) <> mp.version then
    return jsonb_build_object('ok', false, 'reason', 'changed_elsewhere', 'version', mp.version);
  end if;
  v_sync := dela_switch_on('bd_profile_sync', p_person) and coalesce((p->>'directory')::boolean, true);
  insert into member_profiles (person_id, side, body, missing, score, version, directory, bd_state, availability_confirmed_at)
  values (p_person, v_side, p->'body', coalesce((select array_agg(x) from jsonb_array_elements_text(p->'missing') x), '{}'), coalesce((p->>'score')::int, 0), 1,
    coalesce((p->>'directory')::boolean, true), case when v_sync then 'waiting' else 'none' end, null)
  on conflict (person_id, side) do update set body = excluded.body, missing = excluded.missing, score = excluded.score, version = member_profiles.version + 1,
    directory = excluded.directory, bd_state = case when v_sync then 'waiting' else member_profiles.bd_state end, bd_error = case when v_sync then '' else member_profiles.bd_error end,
    updated_at = now()
  returning * into mp;
  -- A person with both sides has one directory listing: only one side updates it
  if mp.directory then update member_profiles set directory = false where person_id = p_person and side <> v_side and directory; end if;
  if v_sync then
    perform dela_job_enqueue('bd_profile_push', jsonb_build_object('person_id', p_person, 'side', v_side, 'version', mp.version), now(), 'bdpush:' || p_person || ':' || v_side || ':' || mp.version, p_person);
  end if;
  perform dela_audit('member', p_person, 'profile_saved', 'profile', p_person::text || ':' || v_side, jsonb_build_object('version', mp.version, 'score', mp.score, 'missing', mp.missing));
  return jsonb_build_object('ok', true, 'version', mp.version, 'state', dela_profile_refresh(p_person, v_side), 'bd_state', mp.bd_state);
end $$;

-- What the worker needs to write a listing, and the result
create or replace function dela_profile_for_bd(p_person uuid, p_side text, p_version int) returns jsonb language sql stable as $$
  select jsonb_build_object('ok', mp.version = p_version and mp.bd_state = 'waiting', 'body', mp.body, 'bd_member_id', pe.bd_member_id, 'map', dela_setting('bd.profile_map'),
    'on', dela_switch_on('bd_profile_sync', p_person))
  from member_profiles mp join people pe on pe.id = mp.person_id where mp.person_id = p_person and mp.side = p_side
$$;

create or replace function dela_profile_bd_result(p_person uuid, p_side text, p_version int, p_ok boolean, p_error text) returns void language plpgsql as $$
begin
  update member_profiles set bd_state = case when p_ok then 'done' else 'failed' end, bd_error = case when p_ok then '' else left(coalesce(p_error, ''), 200) end,
    bd_synced_at = case when p_ok then now() else bd_synced_at end
  where person_id = p_person and side = p_side and version = p_version;
  perform dela_audit('worker', p_person, case when p_ok then 'directory_updated' else 'directory_update_failed' end, 'profile', p_person::text || ':' || p_side, jsonb_build_object('version', p_version, 'error', left(coalesce(p_error, ''), 200)));
end $$;

-- Freelancers confirm availability on the website. available, limited (some hours) or unavailable.
create or replace function dela_profile_availability(p_person uuid, p_state text) returns jsonb language plpgsql as $$
declare v_why text := dela_profile_editable(p_person, 'freelancer');
begin
  if v_why <> '' then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  if p_state not in ('available', 'limited', 'unavailable') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  insert into member_profiles (person_id, side, availability, availability_confirmed_at) values (p_person, 'freelancer', p_state, now())
  on conflict (person_id, side) do update set availability = excluded.availability, availability_confirmed_at = now(), availability_reminded_for = null, updated_at = now();
  insert into availability_log (person_id, state) values (p_person, p_state);
  return jsonb_build_object('ok', true, 'state', dela_profile_refresh(p_person, 'freelancer'));
end $$;

-- Firm details. Owner or firm staff (manager) only. p_org: the firm (empty: the person's own).
create or replace function dela_firm_save(p_person uuid, p_org uuid, p_body jsonb) returns jsonb language plpgsql as $$
declare v_org uuid := coalesce(p_org, dela_side_org(p_person, 'attorney')); v_why text := dela_profile_editable(p_person, 'attorney');
begin
  if v_why <> '' then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  if dela_firm_role(p_person, v_org) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'firm_staff_only'); end if;
  insert into firm_profiles (org_id, body, updated_by) values (v_org, p_body, p_person)
  on conflict (org_id) do update set body = excluded.body, updated_by = p_person, updated_at = now();
  if coalesce(p_body->>'legal_name', '') <> '' then update organizations set name = left(p_body->>'legal_name', 200) where id = v_org and kind = 'firm'; end if;
  perform dela_audit('member', p_person, 'firm_saved', 'organization', v_org::text, '{}');
  return jsonb_build_object('ok', true, 'eligibility', dela_attorney_eligibility((select owner_person_id from organizations where id = v_org)));
end $$;

-- A verified attorney who owns the firm names firm staff (Step 3 question 5). The person must already be on the team.
create or replace function dela_firm_staff_set(p_person uuid, p_bd bigint, p_on boolean) returns jsonb language plpgsql as $$
declare v_org uuid := dela_side_org(p_person, 'attorney'); v_target uuid;
begin
  if dela_firm_role(p_person, v_org) <> 'owner' then return jsonb_build_object('ok', false, 'reason', 'owner_only'); end if;
  if dela_profile_state(p_person, 'attorney')->>'verification' <> 'verified' then return jsonb_build_object('ok', false, 'reason', 'verify_first'); end if;
  select m.person_id into v_target from org_members m join people pe on pe.id = m.person_id
  where m.org_id = v_org and pe.bd_member_id = p_bd and m.status = 'active' and m.member_role <> 'owner';
  if v_target is null then return jsonb_build_object('ok', false, 'reason', 'not_on_team'); end if;
  update org_members set member_role = case when p_on then 'manager' else 'member' end where org_id = v_org and person_id = v_target;
  perform dela_audit('member', p_person, case when p_on then 'firm_staff_added' else 'firm_staff_removed' end, 'organization', v_org::text, jsonb_build_object('bd_member_id', p_bd));
  if p_on then
    perform dela_notify(jsonb_build_object('person_id', v_target, 'side', 'attorney', 'kind', 'profile', 'title', 'You can now manage your firm''s details',
      'body', 'You were named firm staff. You can set up the firm''s details in DELA, Profile.', 'link', '/dela?tab=profile', 'dedupe_key', 'firmstaff:' || v_org || ':' || v_target || ':' || extract(epoch from now())::bigint));
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Attorney licenses ----------

-- p: request_id, country, region, bar_number, name_on_record, method (email or video), contact_email, token and token_hash (for the email link)
create or replace function dela_license_add(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
declare
  v_why text := dela_profile_editable(p_person, 'attorney'); l licenses; v_country text := upper(btrim(coalesce(p->>'country', 'US')));
  v_region text := upper(btrim(coalesce(p->>'region', ''))); v_num text := btrim(coalesce(p->>'bar_number', '')); v_key text;
  v_email text := lower(btrim(coalesce(p->>'contact_email', ''))); v_method text := coalesce(p->>'method', 'email'); v_dup uuid; v_id uuid := gen_random_uuid();
begin
  if v_why <> '' then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  if not dela_switch_on('attorney_verification', p_person) then return jsonb_build_object('ok', false, 'reason', 'verification_off'); end if;
  select * into l from licenses where person_id = p_person and request_id = left(coalesce(p->>'request_id', ''), 80);
  if l.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', l.id, 'status', l.status); end if;
  if coalesce(p->>'request_id', '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if not (dela_setting('verify.countries') ? v_country) then return jsonb_build_object('ok', false, 'reason', 'country_not_yet'); end if;
  if v_country = 'US' and not (v_region = any(dela_us_regions())) then return jsonb_build_object('ok', false, 'reason', 'bad_region'); end if;
  v_key := upper(regexp_replace(v_num, '[^A-Za-z0-9]', '', 'g'));
  if length(v_key) < 2 or length(v_num) > 40 then return jsonb_build_object('ok', false, 'reason', 'bad_bar_number'); end if;
  if length(btrim(coalesce(p->>'name_on_record', ''))) < 3 then return jsonb_build_object('ok', false, 'reason', 'name_needed'); end if;
  if v_method not in ('email', 'video') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if v_method = 'email' then
    if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' or length(v_email) > 200 then return jsonb_build_object('ok', false, 'reason', 'bad_email'); end if;
    if dela_free_email(v_email) then return jsonb_build_object('ok', false, 'reason', 'free_email'); end if;
    if coalesce(p->>'token_hash', '') = '' or coalesce(p->>'token', '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  end if;
  if exists (select 1 from licenses where person_id = p_person and country = v_country and region = v_region and bar_key = v_key and status in ('pending', 'needs_more', 'verified')) then
    return jsonb_build_object('ok', false, 'reason', 'already_added');
  end if;
  if (select count(*) from licenses where person_id = p_person and created_at > now() - interval '1 day') >= 10 then return jsonb_build_object('ok', false, 'reason', 'too_many'); end if;
  -- The same license on another account is flagged for the team, never passed
  select id into v_dup from licenses where person_id <> p_person and country = v_country and region = v_region and bar_key = v_key and status in ('pending', 'needs_more', 'verified')
  order by (status = 'verified') desc, created_at limit 1;
  insert into licenses (id, person_id, request_id, country, region, bar_number, bar_key, name_on_record, contact_email, method, duplicate_of, video_requested_at)
  values (v_id, p_person, left(p->>'request_id', 80), v_country, v_region, left(v_num, 40), v_key, left(btrim(p->>'name_on_record'), 200), v_email, v_method, v_dup,
    case when v_method = 'video' then now() end)
  returning * into l;
  perform dela_verify_event('license', l.id, p_person, 'member', p_person, 'added', jsonb_build_object('region', v_region, 'method', v_method, 'duplicate', v_dup is not null,
    'email_domain', dela_email_domain(v_email)));
  if v_method = 'email' then perform dela_license_email(p_person, l.id, p->>'token', p->>'token_hash'); end if;
  perform dela_alert('verification', 'A license is waiting for a check', 'A ' || v_region || ' license was added' || case when v_dup is not null then ' (the same number is on another account)' else '' end || '. Open the admin area, Verification.',
    'licadd:' || l.id);
  perform dela_audit('member', p_person, 'license_added', 'license', l.id::text, jsonb_build_object('region', v_region, 'method', v_method));
  return jsonb_build_object('ok', true, 'duplicate', false, 'id', l.id, 'status', l.status, 'state', dela_profile_refresh(p_person, 'attorney'));
end $$;

-- Sends (or sends again) the confirmation link to the license email. At most 3 an hour per license.
-- Only the hash of the code is kept for the check; the code itself is in the link of that one email.
create or replace function dela_license_email(p_person uuid, p_license uuid, p_token text, p_token_hash text) returns jsonb language plpgsql as $$
declare l licenses; v_n uuid;
begin
  select * into l from licenses where id = p_license and person_id = p_person;
  if l.id is null or l.method <> 'email' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if l.status not in ('pending', 'needs_more') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if l.email_confirmed_at is not null then return jsonb_build_object('ok', true, 'already_confirmed', true); end if;
  if (select count(*) from email_checks where license_id = l.id and created_at > now() - interval '1 hour') >= 3 then return jsonb_build_object('ok', false, 'reason', 'wait_a_little'); end if;
  if coalesce(p_token_hash, '') = '' or coalesce(p_token, '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  insert into email_checks (token_hash, person_id, license_id, email, expires_at)
  values (p_token_hash, p_person, l.id, l.contact_email, now() + make_interval(hours => dela_int_setting('verify.email_link_hours', 24)));
  insert into notifications (person_id, side, kind, channel, essential, title, body, link, dedupe_key, to_email)
  values (p_person, 'attorney', 'verification', 'email', true, 'Confirm this email for your license',
    'You added a ' || l.region || ' license (number ' || l.bar_number || ') in DELA. Click the button, signed in to Lawfecta as yourself, to confirm this email address. The link works for '
      || dela_int_setting('verify.email_link_hours', 24) || ' hours. If this was not you, ignore this email.',
    '/dela?tab=profile&confirm=' || p_token, 'licmail:' || p_token_hash, l.contact_email)
  returning id into v_n;
  perform dela_job_enqueue('send_email', jsonb_build_object('notification_id', v_n), now(), 'email:' || v_n::text, p_person);
  perform dela_verify_event('license', l.id, p_person, 'member', p_person, 'email_sent', jsonb_build_object('email_domain', dela_email_domain(l.contact_email)));
  return jsonb_build_object('ok', true);
end $$;

-- The api hashes the code from the link. It only works for the same signed in person.
create or replace function dela_license_email_confirm(p_person uuid, p_token_hash text) returns jsonb language plpgsql as $$
declare e email_checks;
begin
  select * into e from email_checks where token_hash = p_token_hash for update;
  if e.token_hash is null or e.person_id <> p_person then return jsonb_build_object('ok', false, 'reason', 'link_not_valid'); end if;
  if e.confirmed_at is not null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if e.expires_at < now() then return jsonb_build_object('ok', false, 'reason', 'link_expired'); end if;
  update email_checks set confirmed_at = now() where token_hash = e.token_hash;
  update licenses set email_confirmed_at = now(), updated_at = now() where id = e.license_id and contact_email = e.email and email_confirmed_at is null;
  perform dela_verify_event('license', e.license_id, p_person, 'member', p_person, 'email_confirmed', jsonb_build_object('email_domain', dela_email_domain(e.email)));
  return jsonb_build_object('ok', true);
end $$;

-- Ask for the video call instead (or again); withdraw a license
create or replace function dela_license_action(p_person uuid, p_license uuid, p_action text) returns jsonb language plpgsql as $$
declare l licenses;
begin
  select * into l from licenses where id = p_license and person_id = p_person for update;
  if l.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_action = 'video' then
    if l.status not in ('pending', 'needs_more') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
    if l.video_requested_at > now() - interval '1 day' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    update licenses set video_requested_at = now(), updated_at = now() where id = l.id;
    perform dela_verify_event('license', l.id, p_person, 'member', p_person, 'video_requested', '{}');
    perform dela_alert('verification', 'An attorney asked for a confirming video call', 'For a ' || l.region || ' license. Open the admin area, Verification.', 'licvideo:' || l.id || ':' || now()::date);
  elsif p_action = 'withdraw' then
    if l.status = 'withdrawn' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    update licenses set status = 'withdrawn', updated_at = now() where id = l.id;
    perform dela_verify_event('license', l.id, p_person, 'member', p_person, 'withdrawn', '{}');
  else
    return jsonb_build_object('ok', false, 'reason', 'bad_request');
  end if;
  return jsonb_build_object('ok', true, 'state', dela_profile_refresh(p_person, 'attorney'));
end $$;

-- ---------- Freelancer LinkedIn check ----------

create or replace function dela_linkedin_submit(p_person uuid, p_url text) returns jsonb language plpgsql as $$
declare v_why text := dela_profile_editable(p_person, 'freelancer'); c linkedin_checks; v_url text := btrim(coalesce(p_url, ''));
begin
  if v_why <> '' then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  if not dela_switch_on('freelancer_verification', p_person) then return jsonb_build_object('ok', false, 'reason', 'verification_off'); end if;
  if v_url !~* '^https://([a-z]{2,3}[.])?linkedin[.]com/in/[A-Za-z0-9_%-]{3,100}/?$' then return jsonb_build_object('ok', false, 'reason', 'bad_linkedin'); end if;
  select * into c from linkedin_checks where person_id = p_person and status in ('pending', 'needs_more', 'verified') order by created_at desc limit 1;
  if c.id is not null and lower(rtrim(c.url, '/')) = lower(rtrim(v_url, '/')) and c.status in ('pending', 'verified') then return jsonb_build_object('ok', true, 'duplicate', true, 'status', c.status); end if;
  if (select count(*) from linkedin_checks where person_id = p_person and created_at > now() - interval '1 day') >= 5 then return jsonb_build_object('ok', false, 'reason', 'too_many'); end if;
  update linkedin_checks set status = 'withdrawn' where person_id = p_person and status in ('pending', 'needs_more', 'verified');
  insert into linkedin_checks (person_id, url) values (p_person, v_url) returning * into c;
  perform dela_verify_event('linkedin', c.id, p_person, 'member', p_person, 'submitted', '{}');
  perform dela_alert('verification', 'A freelancer LinkedIn profile is waiting for a check', 'Open the admin area, Verification.', 'lisub:' || c.id);
  return jsonb_build_object('ok', true, 'status', c.status, 'state', dela_profile_refresh(p_person, 'freelancer'));
end $$;

-- ---------- Profile documents (freelancers) ----------

-- p: request_id, name, size_bytes, ticked. Same checks as Files; a document starts private.
create or replace function dela_profile_doc_start(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_why text := dela_profile_editable(p_person, 'freelancer'); v_org uuid := dela_side_org(p_person, 'freelancer'); r jsonb; f files;
begin
  if v_why <> '' then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  if not dela_switch_on('profile_documents', p_person) then return jsonb_build_object('ok', false, 'reason', 'documents_off'); end if;
  if dela_paused('external') then return jsonb_build_object('ok', false, 'reason', 'paused'); end if;
  select * into f from files where org_id = v_org and request_id = left(coalesce(p->>'request_id', ''), 80);
  if f.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'file_id', f.id, 'storage_path', f.storage_path, 'status', f.status); end if;
  if (select count(*) from files where org_id = v_org and purpose = 'profile' and status in ('uploading', 'checking', 'ready', 'held')) >= dela_int_setting('profile.docs_max', 10) then
    return jsonb_build_object('ok', false, 'reason', 'too_many_documents', 'max', dela_int_setting('profile.docs_max', 10));
  end if;
  if coalesce((p->>'size_bytes')::bigint, 0) > dela_int_setting('profile.doc_max_mb', 10)::bigint * 1048576 then
    return jsonb_build_object('ok', false, 'reason', 'file_too_big', 'max_mb', dela_int_setting('profile.doc_max_mb', 10));
  end if;
  if lower(coalesce(substring(p->>'name' from '[.]([A-Za-z0-9]{1,8})$'), '')) not in ('pdf', 'docx', 'png', 'jpg', 'jpeg') then
    return jsonb_build_object('ok', false, 'reason', 'type_not_allowed', 'allowed', '["pdf","docx","png","jpg"]'::jsonb);
  end if;
  -- The Files rules (attorneys only) do not apply here; the same storage allowance, size and type checks do
  r := dela_file_start_any(jsonb_set(jsonb_set(p, '{person_id}', to_jsonb(p_person)), '{side}', '"freelancer"'), 'profile');
  return r;
end $$;

-- The shared part of starting an upload, for any side and purpose (Files keeps its own attorneys-only entry)
create or replace function dela_file_start_any(p jsonb, p_purpose text) returns jsonb language plpgsql as $$
declare
  v_person uuid := (p->>'person_id')::uuid; v_side text := p->>'side'; v_org uuid := dela_side_org((p->>'person_id')::uuid, p->>'side');
  v_req text := left(coalesce(p->>'request_id', ''), 80); v_name text := btrim(coalesce(p->>'name', '')); v_ext text; v_size bigint := (p->>'size_bytes')::bigint;
  v_limit bigint; v_used bigint; v_id uuid := gen_random_uuid(); f files;
begin
  if v_org is null or not dela_file_member(v_person, v_side, v_org) then return jsonb_build_object('ok', false, 'reason', 'no_side'); end if;
  if v_req = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if coalesce((p->>'ticked')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'tick_needed'); end if;
  v_name := regexp_replace(v_name, '[[:cntrl:]/\\]+', ' ', 'g');
  if length(v_name) = 0 or length(v_name) > 200 then return jsonb_build_object('ok', false, 'reason', 'bad_name'); end if;
  v_ext := lower(substring(v_name from '\.([A-Za-z0-9]{1,8})$'));
  if v_ext = 'jpeg' then v_ext := 'jpg'; end if;
  if v_ext is null or not (dela_setting('files.allowed_types') ? v_ext) then return jsonb_build_object('ok', false, 'reason', 'type_not_allowed', 'allowed', dela_setting('files.allowed_types')); end if;
  if v_size is null or v_size <= 0 then return jsonb_build_object('ok', false, 'reason', 'empty_file'); end if;
  if v_size > dela_int_setting('files.max_mb_per_file', 25)::bigint * 1048576 then return jsonb_build_object('ok', false, 'reason', 'file_too_big'); end if;
  perform pg_advisory_xact_lock(hashtextextended('storage:' || v_org::text, 0));
  v_limit := dela_storage_limit_bytes(v_org);
  v_used := dela_storage_used_bytes(v_org);
  if v_limit is not null and v_used + v_size > v_limit then return jsonb_build_object('ok', false, 'reason', 'storage_full', 'used_bytes', v_used, 'limit_bytes', v_limit); end if;
  insert into files (id, org_id, group_id, version, name, ext, size_bytes, storage_path, uploaded_by, side, request_id, no_client_info_ticked_at, purpose)
  values (v_id, v_org, v_id, 1, v_name, v_ext, v_size, v_org::text || '/' || v_id::text || '.' || v_ext, v_person, v_side, v_req, now(), p_purpose)
  returning * into f;
  perform dela_audit('member', v_person, 'file_upload_started', 'file', f.id::text, jsonb_build_object('ext', v_ext, 'size_bytes', v_size, 'purpose', p_purpose));
  return jsonb_build_object('ok', true, 'duplicate', false, 'file_id', f.id, 'storage_path', f.storage_path, 'status', f.status);
end $$;

-- show (attorneys may see it), hide, remove (to the trash; the daily sweep empties it), confirm (a held file has no client information)
create or replace function dela_profile_doc_action(p_person uuid, p_file uuid, p_action text) returns jsonb language plpgsql as $$
declare f files;
begin
  select * into f from files where id = p_file and uploaded_by = p_person and purpose = 'profile' for update;
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_action = 'show' then
    if f.status <> 'ready' then return jsonb_build_object('ok', false, 'reason', 'not_ready'); end if;
    update files set shown = true, updated_at = now() where id = f.id;
  elsif p_action = 'hide' then update files set shown = false, updated_at = now() where id = f.id;
  elsif p_action = 'remove' then update files set status = 'trash', shown = false, trashed_at = now(), updated_at = now() where id = f.id and status <> 'trash';
  elsif p_action = 'confirm' then
    if f.status <> 'held' then return jsonb_build_object('ok', false, 'reason', 'not_held'); end if;
    update files set status = 'ready', check_state = 'confirmed', updated_at = now() where id = f.id;
  else return jsonb_build_object('ok', false, 'reason', 'bad_request');
  end if;
  perform dela_audit('member', p_person, 'profile_document_' || p_action, 'file', f.id::text, '{}');
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Lawfecta Team: the verification queue ----------

create or replace function dela_admin_verify(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  return jsonb_build_object(
    'licenses', (select coalesce(jsonb_agg(x order by x->>'created_at'), '[]') from (select jsonb_build_object('id', l.id, 'bd_member_id', pe.bd_member_id, 'name', pe.display_name,
        'country', l.country, 'region', l.region, 'bar_number', l.bar_number, 'name_on_record', l.name_on_record, 'method', l.method, 'status', l.status,
        'contact_email', l.contact_email, 'email_domain', dela_email_domain(l.contact_email), 'email_confirmed_at', l.email_confirmed_at, 'video_requested_at', l.video_requested_at,
        'firm_name', mp.body->>'firm_name', 'firm_website', coalesce(fp.body->>'website', mp.body->>'website'), 'recheck_due', l.recheck_due, 'next_check_at', l.next_check_at,
        'duplicate', l.duplicate_of is not null, 'duplicate_bd_member_id', (select pe2.bd_member_id from licenses l2 join people pe2 on pe2.id = l2.person_id where l2.id = l.duplicate_of),
        'created_at', l.created_at,
        'history', (select coalesce(jsonb_agg(jsonb_build_object('at', e.at, 'action', e.action, 'actor_type', e.actor_type, 'detail', e.detail) order by e.at), '[]') from verification_events e where e.subject_id = l.id)) x
      from licenses l join people pe on pe.id = l.person_id
      left join member_profiles mp on mp.person_id = l.person_id and mp.side = 'attorney'
      left join firm_profiles fp on fp.org_id = dela_side_org(l.person_id, 'attorney')
      where l.status in ('pending', 'needs_more') or (l.status = 'verified' and l.recheck_due) limit 300) t),
    'linkedin', (select coalesce(jsonb_agg(x order by x->>'created_at'), '[]') from (select jsonb_build_object('id', c.id, 'bd_member_id', pe.bd_member_id, 'name', pe.display_name,
        'profile_name', btrim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), 'url', c.url, 'status', c.status, 'created_at', c.created_at) x
      from linkedin_checks c join people pe on pe.id = c.person_id left join member_profiles mp on mp.person_id = c.person_id and mp.side = 'freelancer'
      where c.status in ('pending', 'needs_more') limit 300) t),
    'recent', (select coalesce(jsonb_agg(x order by x->>'at' desc), '[]') from (select jsonb_build_object('at', e.at, 'subject', e.subject, 'action', e.action, 'bd_member_id', pe.bd_member_id,
        'detail', e.detail) x from verification_events e join people pe on pe.id = e.person_id where e.actor_type = 'staff' order by e.at desc limit 30) t),
    'readiness', (select coalesce(jsonb_agg(jsonb_build_object('side', side, 'state', readiness_state, 'count', n)), '[]') from (
      select side, readiness_state, count(*) n from side_profiles where status <> 'closed' group by side, readiness_state order by side, readiness_state) t),
    'target_days', dela_int_setting('verify.target_business_days', 2));
end $$;

-- decision: verified, needs_more, not_verified, recheck_ok (a verified license passed its yearly check).
-- identity (for verified): bar_email (the email matches the bar record), firm_domain (an email at the firm's own domain), video (the call happened).
create or replace function dela_admin_license_decide(p_actor uuid, p_license uuid, p_decision text, p_identity text, p_reason text, p_note text, p_override text) returns jsonb language plpgsql as $$
declare l licenses; v_next date; v_title text; v_body text;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  select * into l from licenses where id = p_license for update;
  if l.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_decision not in ('verified', 'needs_more', 'not_verified', 'recheck_ok') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if l.person_id = p_actor then return jsonb_build_object('ok', false, 'reason', 'not_your_own'); end if;
  if p_decision in ('needs_more', 'not_verified') and length(btrim(coalesce(p_reason, ''))) < 5 then return jsonb_build_object('ok', false, 'reason', 'reason_needed'); end if;
  if p_decision = 'recheck_ok' then
    if l.status <> 'verified' then return jsonb_build_object('ok', false, 'reason', 'not_verified_yet'); end if;
  elsif p_decision = 'verified' then
    if l.status = 'verified' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    if l.status not in ('pending', 'needs_more') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
    if p_identity not in ('bar_email', 'firm_domain', 'video') then return jsonb_build_object('ok', false, 'reason', 'identity_needed'); end if;
    if p_identity in ('bar_email', 'firm_domain') and l.email_confirmed_at is null then return jsonb_build_object('ok', false, 'reason', 'email_not_confirmed'); end if;
    if p_identity = 'firm_domain' and dela_free_email(l.contact_email) then return jsonb_build_object('ok', false, 'reason', 'free_email'); end if;
    if l.duplicate_of is not null and length(btrim(coalesce(p_override, ''))) < 10 then return jsonb_build_object('ok', false, 'reason', 'duplicate_needs_note'); end if;
  else
    if l.status not in ('pending', 'needs_more', 'verified') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  end if;
  v_next := ((now() at time zone dela_tz())::date + make_interval(months => dela_int_setting('verify.recheck_months', 12)))::date;
  update licenses set
    status = case p_decision when 'recheck_ok' then 'verified' else p_decision end,
    identity = case when p_decision = 'verified' then p_identity else identity end,
    video_done_at = case when p_decision = 'verified' and p_identity = 'video' then now() else video_done_at end,
    reason = case when p_decision in ('needs_more', 'not_verified') then left(btrim(p_reason), 500) else '' end,
    lookup_note = left(coalesce(p_note, ''), 500), decided_by = p_actor, decided_at = now(),
    next_check_at = case when p_decision in ('verified', 'recheck_ok') then v_next else next_check_at end,
    recheck_due = false, updated_at = now()
  where id = l.id;
  perform dela_verify_event('license', l.id, l.person_id, 'staff', p_actor, p_decision, jsonb_build_object('identity', p_identity, 'note', left(coalesce(p_note, ''), 500),
    'reason', left(coalesce(p_reason, ''), 500), 'override', left(coalesce(p_override, ''), 500), 'next_check_at', case when p_decision in ('verified', 'recheck_ok') then v_next end));
  perform dela_audit('staff', p_actor, 'license_' || p_decision, 'license', l.id::text, jsonb_build_object('identity', p_identity));
  if p_decision <> 'recheck_ok' then
    v_title := case p_decision when 'verified' then 'Your license is verified' when 'needs_more' then 'We need a little more for your license check' else 'We could not verify your license' end;
    v_body := case p_decision
      when 'verified' then 'The Lawfecta Team checked your ' || l.region || ' license. When hiring opens in DELA, you can post work and hire.'
      when 'needs_more' then 'About your ' || l.region || ' license: ' || btrim(p_reason) || ' Open DELA, Profile, to answer.'
      else 'About your ' || l.region || ' license: ' || btrim(p_reason) || ' You can still use DELA''s planning tools. Contact the Lawfecta Team if you think this is a mistake.' end;
    perform dela_notify(jsonb_build_object('person_id', l.person_id, 'side', 'attorney', 'kind', 'verification', 'essential', true, 'email', true, 'title', v_title, 'body', v_body,
      'link', '/dela?tab=profile', 'dedupe_key', 'licdecide:' || l.id || ':' || p_decision || ':' || extract(epoch from now())::bigint));
  end if;
  return jsonb_build_object('ok', true, 'state', dela_profile_refresh(l.person_id, 'attorney'));
end $$;

create or replace function dela_admin_linkedin_decide(p_actor uuid, p_check uuid, p_decision text, p_name_matches boolean, p_badge boolean, p_reason text) returns jsonb language plpgsql as $$
declare c linkedin_checks;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  select * into c from linkedin_checks where id = p_check for update;
  if c.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if c.person_id = p_actor then return jsonb_build_object('ok', false, 'reason', 'not_your_own'); end if;
  if p_decision not in ('verified', 'needs_more', 'not_verified') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if c.status = p_decision then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if c.status not in ('pending', 'needs_more') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if p_decision = 'verified' and not (coalesce(p_name_matches, false) and coalesce(p_badge, false)) then return jsonb_build_object('ok', false, 'reason', 'both_checks_needed'); end if;
  if p_decision <> 'verified' and length(btrim(coalesce(p_reason, ''))) < 5 then return jsonb_build_object('ok', false, 'reason', 'reason_needed'); end if;
  update linkedin_checks set status = p_decision, name_matches = p_name_matches, badge_seen = p_badge, reason = case when p_decision = 'verified' then '' else left(btrim(p_reason), 500) end,
    decided_by = p_actor, decided_at = now() where id = c.id;
  perform dela_verify_event('linkedin', c.id, c.person_id, 'staff', p_actor, p_decision, jsonb_build_object('name_matches', p_name_matches, 'badge_seen', p_badge, 'reason', left(coalesce(p_reason, ''), 500)));
  perform dela_audit('staff', p_actor, 'linkedin_' || p_decision, 'linkedin_check', c.id::text, '{}');
  perform dela_notify(jsonb_build_object('person_id', c.person_id, 'side', 'freelancer', 'kind', 'verification', 'essential', true, 'email', true,
    'title', case p_decision when 'verified' then 'Your LinkedIn profile is checked' when 'needs_more' then 'We need a little more for your LinkedIn check' else 'We could not check your LinkedIn profile' end,
    'body', case p_decision when 'verified' then 'The Lawfecta Team checked your LinkedIn profile. Keep your availability up to date to stay ready for matches.'
      else btrim(p_reason) || ' Open DELA, Profile, to fix it.' end,
    'link', '/dela?tab=profile', 'dedupe_key', 'lidecide:' || c.id || ':' || p_decision));
  return jsonb_build_object('ok', true, 'state', dela_profile_refresh(c.person_id, 'freelancer'));
end $$;

-- ---------- Every day ----------

create or replace function dela_profiles_daily() returns jsonb language plpgsql as $$
declare r record; n_remind int := 0; n_due int := 0; n_expired int := 0; v_days int := dela_int_setting('profile.availability_days', 14);
  v_before int := dela_int_setting('profile.availability_reminder_days', 2); v_today date := (now() at time zone dela_tz())::date; v_due date;
begin
  -- Availability reminders, once per due date
  for r in select mp.* from member_profiles mp join side_profiles sp on sp.person_id = mp.person_id and sp.side = 'freelancer' and sp.status = 'active'
           where mp.side = 'freelancer' and mp.availability <> 'unavailable' and mp.availability_confirmed_at is not null loop
    v_due := ((r.availability_confirmed_at + make_interval(days => v_days)) at time zone dela_tz())::date;
    if v_due - v_before <= v_today and r.availability_reminded_for is distinct from v_due then
      perform dela_notify(jsonb_build_object('person_id', r.person_id, 'side', 'freelancer', 'kind', 'profile', 'email', true,
        'title', case when v_due < v_today then 'Your availability is out of date' else 'Confirm your availability' end,
        'body', 'Attorneys only see freelancers who confirmed their availability in the last ' || v_days || ' days. It takes one click in DELA, Profile.',
        'link', '/dela?tab=profile', 'dedupe_key', 'avail:' || r.person_id || ':' || v_due));
      update member_profiles set availability_reminded_for = v_due where person_id = r.person_id and side = 'freelancer';
      n_remind := n_remind + 1;
    end if;
  end loop;
  -- Yearly license checks: due goes to the team's queue; past the grace days the license expires
  for r in select * from licenses where status = 'verified' and next_check_at <= v_today and not recheck_due loop
    update licenses set recheck_due = true where id = r.id;
    perform dela_verify_event('license', r.id, r.person_id, 'worker', null, 'recheck_due', '{}');
    n_due := n_due + 1;
  end loop;
  for r in select * from licenses l where l.status = 'verified' and l.next_check_at is not null and not dela_license_counts(l) loop
    update licenses set status = 'expired', updated_at = now() where id = r.id;
    perform dela_verify_event('license', r.id, r.person_id, 'worker', null, 'expired', '{}');
    perform dela_notify(jsonb_build_object('person_id', r.person_id, 'side', 'attorney', 'kind', 'verification', 'essential', true, 'email', true,
      'title', 'Your license check is out of date', 'body', 'Your ' || r.region || ' license was due for its yearly check. Add it again in DELA, Profile, so the Lawfecta Team can check it. Your work and playbooks stay as they are.',
      'link', '/dela?tab=profile', 'dedupe_key', 'licexp:' || r.id));
    n_expired := n_expired + 1;
  end loop;
  if n_due > 0 then perform dela_alert('verification', n_due || ' license re-checks are due', 'Open the admin area, Verification.', 'recheck:' || v_today); end if;
  -- States that change with time alone (availability running out, licenses expiring)
  for r in select person_id, side from side_profiles where status <> 'closed' loop
    perform dela_profile_refresh(r.person_id, r.side);
  end loop;
  return jsonb_build_object('reminders', n_remind, 'recheck_due', n_due, 'expired', n_expired);
end $$;

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
end $$;

-- For the ChatGPT and Claude connector: my profile, what is missing, verification (read only)
create or replace function dela_profile_summary(p_person uuid, p_side text) returns jsonb language plpgsql as $$
declare mp member_profiles;
begin
  select * into mp from member_profiles where person_id = p_person and side = p_side;
  return jsonb_build_object('body', coalesce(mp.body, '{}'), 'state', dela_profile_refresh(p_person, p_side),
    'licenses', case when p_side = 'attorney' then (select coalesce(jsonb_agg(jsonb_build_object('region', region, 'status', status, 'next_check_at', next_check_at)), '[]') from licenses where person_id = p_person and status <> 'withdrawn') end,
    'linkedin', case when p_side = 'freelancer' then (select status from linkedin_checks where person_id = p_person and status <> 'withdrawn' order by created_at desc limit 1) end);
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

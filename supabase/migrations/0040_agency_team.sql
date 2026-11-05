-- Agencies, part 1: the team and agency proposals (docs/briefs/step-7d-agencies.md, Stacey's answers 2026-11-05).
-- A freelancer on Freelancer Business runs an agency: their freelancer organization becomes an agency, they invite team
-- members (seats, owner included; the Lawfecta Team can raise one agency's limit by hand), and the owner and managers
-- send proposals as the agency, naming who will do the work. After a hire, the named team members work on the engagement
-- ("Who's working on this"), reviews go to the agency and to each named person, and the proposals allowance is shared.
-- A downgrade stops new invites, team changes and agency proposals; jobs already running continue. Additive.

insert into feature_switches (key, label, gate) values
  ('agency_team', 'Agency team: seats, invites, roles and agency proposals', 'Step 7d tested'),
  ('agency_hiring', 'Agencies post their own gigs, keep a bench and use Talent', 'Step 7d tested'),
  ('agency_subcontracting', 'Agencies hand parts of attorney engagements to subcontractors (disclosed in the agreement)', 'Step 7d tested'),
  ('agency_extra_seats', 'In-app purchase of extra agency seats', 'DELA bills seats itself')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('agency.invite_days', '14', 'Days a team invitation stays open', 'Agencies', 'days', 'O', 'Claude suggestion', ''),
  ('agency.bench_min_plan', '"fl_plus"', 'Lowest freelancer plan that can join an agency''s bench', 'Agencies', 'plan', 'C', 'Stacey 2026-11-05', 'Free freelancers see "Plus plan or higher required to join a bench".'),
  ('agency.bench_invite_days', '30', 'Days a bench invitation stays open (time to upgrade and accept)', 'Agencies', 'days', 'C', 'Stacey 2026-11-05', ''),
  ('agency.post_requires_business_check', 'true', 'The Lawfecta Team checks the agency''s business name and state once before its first gig goes live', 'Agencies', '', 'C', 'Stacey 2026-11-05', '')
on conflict (key) do nothing;

-- The agency's business details, checked once by the Lawfecta Team; a hand-set seat limit
alter table organizations add column if not exists business_name text not null default '';
alter table organizations add column if not exists business_state text not null default '';
alter table organizations add column if not exists business_checked_at timestamptz;
alter table organizations add column if not exists business_checked_by uuid references people(id);
alter table organizations add column if not exists business_check_note text not null default '';
alter table organizations add column if not exists seat_limit_override int check (seat_limit_override is null or seat_limit_override between 1 and 500);

create table if not exists agency_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  person_id uuid not null references people(id),
  member_role text not null check (member_role in ('manager', 'member')),
  invited_by uuid not null references people(id),
  status text not null default 'sent' check (status in ('sent', 'accepted', 'declined', 'canceled', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_at timestamptz
);
create unique index if not exists agency_invites_open on agency_invites (org_id, person_id) where status = 'sent';
alter table agency_invites enable row level security;

-- An agency proposal names who will do the work
alter table proposals add column if not exists agency_org uuid references organizations(id);
create table if not exists proposal_team (
  proposal_id uuid not null references proposals(id),
  person_id uuid not null references people(id),
  role_text text not null default '',
  position int not null default 0,
  primary key (proposal_id, person_id)
);
alter table proposal_team enable row level security;

-- Who works on an engagement for the agency (team members now; subcontractors in part 3)
alter table agreements add column if not exists agency_org uuid references organizations(id);
create table if not exists engagement_team (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id),
  person_id uuid not null references people(id),
  kind text not null default 'team' check (kind in ('team', 'subcontractor')),
  role_text text not null default '',
  added_by uuid references people(id),
  added_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references people(id)
);
create unique index if not exists engagement_team_open on engagement_team (agreement_id, person_id) where removed_at is null;
alter table engagement_team enable row level security;

-- Reviews of an agency also belong to every team member named on the proposal
alter table reviews add column if not exists agency_org uuid references organizations(id);
create table if not exists review_subjects (
  review_id uuid not null references reviews(id),
  person_id uuid not null references people(id),
  primary key (review_id, person_id)
);
alter table review_subjects enable row level security;

-- ---------- The agency itself ----------
-- A freelancer's name as members know it: their profile name, or their Lawfecta name
create or replace function dela_freelancer_name(p_person uuid) returns text language sql stable as $$
  select coalesce((select nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), '') from member_profiles mp where mp.person_id = p_person and mp.side = 'freelancer'),
    (select display_name from people where id = p_person), '')
$$;
create or replace function dela_agency_owner(p_org uuid) returns uuid language sql stable as $$
  select owner_person_id from organizations where id = p_org and kind = 'agency'
$$;
-- An agency is active while its owner is on Freelancer Business and the switch is on for them
create or replace function dela_agency_active(p_org uuid) returns boolean language sql stable as $$
  select exists (select 1 from organizations o where o.id = p_org and o.kind = 'agency' and o.status = 'active'
    and dela_side_tier(o.owner_person_id, 'freelancer') = 'business' and dela_switch_on('agency_team', o.owner_person_id))
$$;
-- The agency role of a person: owner, manager, member or ''
create or replace function dela_agency_role(p_person uuid, p_org uuid) returns text language sql stable as $$
  select case when exists (select 1 from organizations o where o.id = p_org and o.kind = 'agency') then dela_firm_role(p_person, p_org) else '' end
$$;
create or replace function dela_agency_seats(p_org uuid) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'limit', coalesce(o.seat_limit_override, (select (e->>'limit')::int from jsonb_array_elements(dela_entitlements(o.owner_person_id, 'freelancer')) e where e->>'key' = 'fl.team_seats'), 1),
    'override', o.seat_limit_override,
    'used', (select count(*) from org_members m where m.org_id = o.id and m.status = 'active') + case when exists (select 1 from org_members m where m.org_id = o.id and m.person_id = o.owner_person_id and m.status = 'active') then 0 else 1 end,
    'pending', (select count(*) from agency_invites i where i.org_id = o.id and i.status = 'sent' and i.expires_at > now()))
  from organizations o where o.id = p_org
$$;
-- On Freelancer Business, the freelancer's own organization becomes their agency (history, profile and reviews stay)
create or replace function dela_agency_ensure(p_person uuid) returns uuid language plpgsql as $$
declare v_org uuid := dela_side_org(p_person, 'freelancer'); o organizations; v_name text;
begin
  if v_org is null then return null; end if;
  select * into o from organizations where id = v_org;
  if o.kind = 'agency' then return o.id; end if;
  if o.kind <> 'freelancer_personal' or o.owner_person_id <> p_person or dela_side_tier(p_person, 'freelancer') <> 'business' then return null; end if;
  select nullif(btrim(coalesce(body->>'firm_name', '')), '') into v_name from member_profiles where person_id = p_person and side = 'freelancer';
  update organizations set kind = 'agency', name = coalesce(v_name, name), business_name = coalesce(v_name, '') where id = o.id;
  insert into org_members (org_id, person_id, member_role, status) values (o.id, p_person, 'owner', 'active')
  on conflict do nothing;
  perform dela_audit('member', p_person, 'agency_started', 'organization', o.id::text, '{}');
  return o.id;
end $$;

-- Everything the Agency tab shows
create or replace function dela_agency_view(p_person uuid) returns jsonb language plpgsql as $$
declare v_org uuid; o organizations; v_role text; v_tier text := dela_side_tier(p_person, 'freelancer');
begin
  if not dela_switch_on('agency_team', p_person) then return jsonb_build_object('ok', true, 'on', false); end if;
  v_org := dela_agency_ensure(p_person);
  select * into o from organizations where id = v_org;
  v_role := case when o.id is null then '' else dela_agency_role(p_person, o.id) end;
  return jsonb_build_object('ok', true, 'on', true, 'tier', v_tier,
    'invitations', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'agency', coalesce(nullif(ao.business_name, ''), ao.name), 'role', i.member_role,
        'from', dela_freelancer_name(pe.id), 'expires_at', i.expires_at) order by i.created_at desc), '[]')
      from agency_invites i join organizations ao on ao.id = i.org_id join people pe on pe.id = i.invited_by
      where i.person_id = p_person and i.status = 'sent' and i.expires_at > now()),
    'memberships', (select coalesce(jsonb_agg(jsonb_build_object('org_id', ao.id, 'agency', coalesce(nullif(ao.business_name, ''), ao.name), 'role', m.member_role, 'active', dela_agency_active(ao.id))), '[]')
      from org_members m join organizations ao on ao.id = m.org_id where m.person_id = p_person and m.status = 'active' and ao.kind = 'agency' and ao.owner_person_id <> p_person),
    'agency', case when o.id is null then null else jsonb_build_object('id', o.id, 'name', coalesce(nullif(o.business_name, ''), o.name), 'business_name', o.business_name,
      'business_state', o.business_state, 'business_checked', o.business_checked_at is not null, 'business_check_note', o.business_check_note,
      'active', dela_agency_active(o.id), 'role', v_role, 'seats', dela_agency_seats(o.id),
      'allowance', dela_proposal_allowance(o.owner_person_id),
      'team', (select coalesce(jsonb_agg(jsonb_build_object('person_id', pe.id, 'name', dela_freelancer_name(pe.id), 'email', case when v_role in ('owner', 'manager') then pe.email end,
          'role', case when pe.id = o.owner_person_id then 'owner' else m.member_role end, 'since', m.effective_from,
          'verified', coalesce((select sp.readiness_state from side_profiles sp where sp.person_id = pe.id and sp.side = 'freelancer'), '') in ('match_ready', 'availability_stale', 'unavailable'),
          'jobs', (select count(*) from engagement_team t join agreements a on a.id = t.agreement_id where t.person_id = pe.id and t.removed_at is null and a.agency_org = o.id and a.status in ('draft', 'signing', 'signed', 'active')))
          order by case when pe.id = o.owner_person_id then 0 when m.member_role = 'manager' then 1 else 2 end, dela_freelancer_name(pe.id)), '[]')
        from org_members m join people pe on pe.id = m.person_id where m.org_id = o.id and m.status = 'active'),
      'pending', case when v_role in ('owner', 'manager') then (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'name', dela_freelancer_name(pe.id), 'email', pe.email, 'role', i.member_role, 'expires_at', i.expires_at) order by i.created_at desc), '[]')
        from agency_invites i join people pe on pe.id = i.person_id where i.org_id = o.id and i.status = 'sent' and i.expires_at > now()) end,
      'jobs', (select coalesce(jsonb_agg(jsonb_build_object('agreement_id', a.id, 'gig_id', a.gig_id, 'title', g.title, 'status', a.status,
          'people', (select coalesce(jsonb_agg(dela_freelancer_name(px.id) order by 1), '[]') from engagement_team t join people px on px.id = t.person_id where t.agreement_id = a.id and t.removed_at is null and t.kind = 'team'))
          order by a.created_at desc), '[]')
        from agreements a join gigs g on g.id = a.gig_id where a.agency_org = o.id and (v_role in ('owner', 'manager') or exists (select 1 from engagement_team t where t.agreement_id = a.id and t.person_id = p_person and t.removed_at is null)))) end);
end $$;

create or replace function dela_agency_business_save(p_person uuid, p_name text, p_state text) returns jsonb language plpgsql as $$
declare v_org uuid := dela_side_org(p_person, 'freelancer'); o organizations;
begin
  select * into o from organizations where id = v_org and kind = 'agency';
  if o.id is null or dela_agency_role(p_person, o.id) <> 'owner' then return jsonb_build_object('ok', false, 'reason', 'agency_owner_only'); end if;
  if length(btrim(coalesce(p_name, ''))) < 2 or upper(btrim(coalesce(p_state, ''))) !~ '^[A-Z]{2}$' then return jsonb_build_object('ok', false, 'reason', 'business_details_needed'); end if;
  -- A change after the check needs the check again
  update organizations set business_name = left(btrim(p_name), 160), business_state = upper(btrim(p_state)), name = left(btrim(p_name), 160),
    business_checked_at = case when business_name = left(btrim(p_name), 160) and business_state = upper(btrim(p_state)) then business_checked_at end,
    business_checked_by = case when business_name = left(btrim(p_name), 160) and business_state = upper(btrim(p_state)) then business_checked_by end
  where id = o.id;
  if not exists (select 1 from organizations where id = o.id and business_checked_at is not null) then
    perform dela_alert('agency', 'An agency is waiting for its business check', 'Check the agency''s business name and state in the admin area, Agencies card on the People tab.', 'agencycheck:' || o.id);
  end if;
  perform dela_audit('member', p_person, 'agency_business_saved', 'organization', o.id::text, jsonb_build_object('state', upper(btrim(p_state))));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- The team ----------
create or replace function dela_agency_invite(p_person uuid, p_email text, p_role text) returns jsonb language plpgsql as $$
declare v_org uuid := dela_side_org(p_person, 'freelancer'); o organizations; who people; s jsonb; i agency_invites;
begin
  select * into o from organizations where id = v_org and kind = 'agency';
  if o.id is null or dela_agency_role(p_person, o.id) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'agency_managers_only'); end if;
  if not dela_agency_active(o.id) then return jsonb_build_object('ok', false, 'reason', 'agency_inactive'); end if;
  if p_role not in ('manager', 'member') then return jsonb_build_object('ok', false, 'reason', 'bad_role'); end if;
  if p_role = 'manager' and dela_agency_role(p_person, o.id) <> 'owner' then return jsonb_build_object('ok', false, 'reason', 'agency_owner_only'); end if;
  select * into who from people where lower(email) = lower(btrim(coalesce(p_email, ''))) limit 1;
  if who.id is null or not exists (select 1 from side_profiles sp where sp.person_id = who.id and sp.side = 'freelancer' and sp.status <> 'closed') then
    return jsonb_build_object('ok', false, 'reason', 'not_a_freelancer');
  end if;
  if who.id = o.owner_person_id or exists (select 1 from org_members m where m.org_id = o.id and m.person_id = who.id and m.status = 'active') then return jsonb_build_object('ok', false, 'reason', 'already_on_team'); end if;
  select * into i from agency_invites where org_id = o.id and person_id = who.id and status = 'sent' and expires_at > now();
  if i.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', i.id); end if;
  update agency_invites set status = 'expired' where org_id = o.id and person_id = who.id and status = 'sent';
  perform pg_advisory_xact_lock(hashtextextended('agencyseats:' || o.id::text, 0));
  s := dela_agency_seats(o.id);
  if (s->>'used')::int + (s->>'pending')::int >= (s->>'limit')::int then return jsonb_build_object('ok', false, 'reason', 'no_seats', 'seats', s); end if;
  insert into agency_invites (org_id, person_id, member_role, invited_by, expires_at)
  values (o.id, who.id, p_role, p_person, now() + make_interval(days => dela_int_setting('agency.invite_days', 14))) returning * into i;
  perform dela_notify(jsonb_build_object('person_id', who.id, 'side', 'freelancer', 'kind', 'agency', 'email', true,
    'title', 'You are invited to join ' || coalesce(nullif(o.business_name, ''), o.name) || ' on Lawfecta',
    'body', coalesce(nullif(o.business_name, ''), o.name) || ' invited you to its team as a ' || p_role || '. Open DELA, Agency tab, to accept or decline.',
    'link', '/dela?tab=agency', 'dedupe_key', 'agencyinv:' || i.id));
  perform dela_audit('member', p_person, 'agency_invited', 'organization', o.id::text, jsonb_build_object('person_id', who.id, 'role', p_role));
  return jsonb_build_object('ok', true, 'id', i.id);
end $$;

create or replace function dela_agency_invite_cancel(p_person uuid, p_invite uuid) returns jsonb language plpgsql as $$
declare i agency_invites;
begin
  select * into i from agency_invites where id = p_invite;
  if i.id is null or dela_agency_role(p_person, i.org_id) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  update agency_invites set status = 'canceled', decided_at = now() where id = i.id and status = 'sent';
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_agency_invite_answer(p_person uuid, p_invite uuid, p_accept boolean) returns jsonb language plpgsql as $$
declare i agency_invites; s jsonb;
begin
  select * into i from agency_invites where id = p_invite and person_id = p_person for update;
  if i.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if i.status <> 'sent' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', i.status); end if;
  if i.expires_at <= now() then update agency_invites set status = 'expired' where id = i.id; return jsonb_build_object('ok', false, 'reason', 'invite_expired'); end if;
  if not p_accept then
    update agency_invites set status = 'declined', decided_at = now() where id = i.id;
    return jsonb_build_object('ok', true, 'status', 'declined');
  end if;
  if not dela_agency_active(i.org_id) then return jsonb_build_object('ok', false, 'reason', 'agency_inactive'); end if;
  perform pg_advisory_xact_lock(hashtextextended('agencyseats:' || i.org_id::text, 0));
  s := dela_agency_seats(i.org_id);
  -- This invite is one of the pending ones, so it fits if used is below the limit
  if (s->>'used')::int >= (s->>'limit')::int then return jsonb_build_object('ok', false, 'reason', 'no_seats'); end if;
  insert into org_members (org_id, person_id, member_role, status) values (i.org_id, p_person, i.member_role, 'active')
  on conflict (org_id, person_id) do update set member_role = excluded.member_role, status = 'active', effective_from = now(), effective_to = null;
  update agency_invites set status = 'accepted', decided_at = now() where id = i.id;
  perform dela_notify(jsonb_build_object('person_id', i.invited_by, 'side', 'freelancer', 'kind', 'agency',
    'title', dela_freelancer_name(p_person) || ' joined your agency', 'body', 'They can now be named on proposals.', 'link', '/dela?tab=agency', 'dedupe_key', 'agencyjoin:' || i.id));
  perform dela_audit('member', p_person, 'agency_joined', 'organization', i.org_id::text, jsonb_build_object('role', i.member_role));
  return jsonb_build_object('ok', true, 'status', 'accepted');
end $$;

-- Change a role (the owner), remove someone (owner, or a manager removing a member), or leave. Leaving or removal ends
-- the person's access to every agency engagement at once; their work and the record stay with the agency.
create or replace function dela_agency_member_set(p_person uuid, p_member uuid, p_action text, p_role text default null) returns jsonb language plpgsql as $$
declare v_org uuid := dela_side_org(p_person, 'freelancer'); o organizations; v_mine text; v_theirs text; v_n int;
begin
  select * into o from organizations where id = v_org and kind = 'agency';
  if o.id is null then return jsonb_build_object('ok', false, 'reason', 'agency_managers_only'); end if;
  v_mine := dela_agency_role(p_person, o.id); v_theirs := dela_agency_role(p_member, o.id);
  if v_theirs = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_theirs = 'owner' then return jsonb_build_object('ok', false, 'reason', 'owner_stays'); end if;
  if not dela_agency_active(o.id) then return jsonb_build_object('ok', false, 'reason', 'agency_inactive'); end if;
  if p_action = 'role' then
    if v_mine <> 'owner' then return jsonb_build_object('ok', false, 'reason', 'agency_owner_only'); end if;
    if p_role not in ('manager', 'member') then return jsonb_build_object('ok', false, 'reason', 'bad_role'); end if;
    update org_members set member_role = p_role where org_id = o.id and person_id = p_member and status = 'active';
  elsif p_action = 'remove' then
    if not (v_mine = 'owner' or (v_mine = 'manager' and v_theirs = 'member')) then return jsonb_build_object('ok', false, 'reason', 'agency_owner_only'); end if;
    update org_members set status = 'removed', effective_to = now() where org_id = o.id and person_id = p_member and status = 'active';
    update engagement_team t set removed_at = now(), removed_by = p_person from agreements a where a.id = t.agreement_id and a.agency_org = o.id and t.person_id = p_member and t.removed_at is null;
    get diagnostics v_n = row_count;
    perform dela_notify(jsonb_build_object('person_id', p_member, 'side', 'freelancer', 'kind', 'agency', 'title', 'You are no longer on ' || coalesce(nullif(o.business_name, ''), o.name) || '''s team',
      'body', 'Your access to its jobs has ended.', 'link', '/dela?tab=agency', 'dedupe_key', 'agencyrm:' || o.id || ':' || p_member || ':' || now()::date));
  else
    return jsonb_build_object('ok', false, 'reason', 'bad_action');
  end if;
  perform dela_audit('member', p_person, 'agency_member_' || p_action, 'organization', o.id::text, jsonb_build_object('person_id', p_member, 'role', p_role));
  return jsonb_build_object('ok', true, 'jobs_ended', coalesce(v_n, 0));
end $$;
create or replace function dela_agency_leave(p_person uuid, p_org uuid) returns jsonb language plpgsql as $$
begin
  if dela_agency_role(p_person, p_org) in ('', 'owner') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  update org_members set status = 'removed', effective_to = now() where org_id = p_org and person_id = p_person and status = 'active';
  update engagement_team t set removed_at = now(), removed_by = p_person from agreements a where a.id = t.agreement_id and a.agency_org = p_org and t.person_id = p_person and t.removed_at is null;
  perform dela_audit('member', p_person, 'agency_left', 'organization', p_org::text, '{}');
  return jsonb_build_object('ok', true);
end $$;

-- The agency's team members who can be named on a proposal: active, with their own verification done
create or replace function dela_agency_pickable(p_org uuid) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('person_id', pe.id, 'name', dela_freelancer_name(pe.id), 'role', case when pe.id = o.owner_person_id then 'owner' else m.member_role end) order by dela_freelancer_name(pe.id)), '[]')
  from organizations o join org_members m on m.org_id = o.id and m.status = 'active' join people pe on pe.id = m.person_id
  where o.id = p_org and coalesce((select sp.readiness_state from side_profiles sp where sp.person_id = pe.id and sp.side = 'freelancer'), '') in ('match_ready', 'availability_stale', 'unavailable')
$$;

-- ---------- Agency proposals ----------
-- Who a proposal is sent as: the agency (owner and managers of an active agency) or the person alone
create or replace function dela_proposal_sender(p_person uuid, p_org uuid) returns jsonb language sql stable as $$
  select case when p_org is not null and dela_agency_role(p_person, p_org) in ('owner', 'manager') and dela_agency_active(p_org)
    then jsonb_build_object('agency', true, 'org_id', p_org, 'quota_person', dela_agency_owner(p_org))
    else jsonb_build_object('agency', false, 'quota_person', p_person) end
$$;
-- The proposal form's choices for this person on this gig
create or replace function dela_proposal_options(p_person uuid, p_gig uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('agencies', coalesce((select jsonb_agg(jsonb_build_object('org_id', o.id, 'name', coalesce(nullif(o.business_name, ''), o.name),
      'team', dela_agency_pickable(o.id), 'allowance', dela_proposal_allowance(o.owner_person_id),
      'already', (select p.status from proposals p where p.gig_id = p_gig and p.agency_org = o.id and p.status not in ('draft', 'withdrawn') limit 1)))
    from organizations o where o.kind = 'agency' and dela_agency_role(p_person, o.id) in ('owner', 'manager') and dela_agency_active(o.id)), '[]'),
    'solo', not exists (select 1 from organizations o where o.id = dela_side_org(p_person, 'freelancer') and o.kind = 'agency'))
$$;

-- Send, with the agency's rules first: an agency proposal names at least one team member who can be named, one agency
-- proposal per gig, and the allowance shared across the agency (the owner's). The rest is the usual send.
create or replace function dela_proposal_send_agency(p_person uuid, p_gig uuid, p jsonb, p_held boolean) returns jsonb language plpgsql as $$
declare v_org uuid := nullif(p->>'agency_org', '')::uuid; snd jsonb; v_team jsonb := coalesce(p->'team', '[]'); x jsonb; v_ok jsonb; r jsonb; pr proposals; v_i int := 0;
begin
  -- The owner's own proposals are always the agency's
  if v_org is null and exists (select 1 from organizations o where o.id = dela_side_org(p_person, 'freelancer') and o.kind = 'agency' and dela_agency_active(o.id)) then
    v_org := dela_side_org(p_person, 'freelancer');
  end if;
  if v_org is null then return dela_proposal_send(p_person, p_gig, p, p_held); end if;
  snd := dela_proposal_sender(p_person, v_org);
  if not (snd->>'agency')::boolean then return jsonb_build_object('ok', false, 'reason', 'agency_managers_only'); end if;
  if exists (select 1 from proposals pp where pp.gig_id = p_gig and pp.agency_org = v_org and pp.freelancer_id <> p_person and pp.status not in ('draft', 'withdrawn')) then
    return jsonb_build_object('ok', false, 'reason', 'agency_already_proposed');
  end if;
  if jsonb_typeof(v_team) <> 'array' or jsonb_array_length(v_team) = 0 then return jsonb_build_object('ok', false, 'reason', 'pick_team'); end if;
  v_ok := dela_agency_pickable(v_org);
  for x in select * from jsonb_array_elements(v_team) loop
    if not exists (select 1 from jsonb_array_elements(v_ok) y where y->>'person_id' = x->>'person_id') then return jsonb_build_object('ok', false, 'reason', 'team_member_not_ready'); end if;
  end loop;
  -- The shared allowance: the agency owner's
  r := dela_proposal_send_as(p_person, (snd->>'quota_person')::uuid, p_gig, p, p_held);
  if not coalesce((r->>'ok')::boolean, false) or coalesce((r->>'duplicate')::boolean, false) then return r; end if;
  update proposals set agency_org = v_org where id = (r->>'id')::uuid returning * into pr;
  delete from proposal_team where proposal_id = pr.id;
  for x in select * from jsonb_array_elements(v_team) loop
    v_i := v_i + 1;
    insert into proposal_team (proposal_id, person_id, role_text, position) values (pr.id, (x->>'person_id')::uuid, left(btrim(coalesce(x->>'role', '')), 80), v_i) on conflict do nothing;
  end loop;
  return r || jsonb_build_object('agency', true, 'allowance', dela_proposal_allowance((snd->>'quota_person')::uuid));
end $$;

-- The usual send, with the allowance taken from another person (the agency owner). Same rules as dela_proposal_send.
do $$
declare v_src text;
begin
  select pg_get_functiondef('dela_proposal_send(uuid,uuid,jsonb,boolean)'::regprocedure) into v_src;
  v_src := replace(v_src, 'FUNCTION public.dela_proposal_send(p_person uuid, p_gig uuid, p jsonb, p_held boolean)', 'FUNCTION public.dela_proposal_send_as(p_person uuid, p_quota uuid, p_gig uuid, p jsonb, p_held boolean)');
  v_src := replace(v_src, 'q := dela_quota_reserve(p_person, ''freelancer'', ''fl.proposals'', 1,', 'q := dela_quota_reserve(p_quota, ''freelancer'', ''fl.proposals'', 1,');
  v_src := replace(v_src, 'return q || jsonb_build_object(''allowance'', dela_proposal_allowance(p_person));', 'return q || jsonb_build_object(''allowance'', dela_proposal_allowance(p_quota));');
  if position('p_quota uuid' in v_src) = 0 or position('dela_quota_reserve(p_quota' in v_src) = 0 then raise exception 'dela_proposal_send changed; update 0040'; end if;
  execute v_src;
end $$;

-- For the attorney: the agency behind each proposal and the people it named (photos are signed by the api)
create or replace function dela_proposals_agency(p_person uuid, p_gig uuid) returns jsonb language sql stable as $$
  select case when not dela_gig_manager(p_person, p_gig) then '{}'::jsonb else coalesce((select jsonb_object_agg(p.id::text, jsonb_build_object(
      'agency', jsonb_build_object('org_id', o.id, 'name', coalesce(nullif(o.business_name, ''), o.name), 'reviews', dela_review_summary(o.owner_person_id, 'freelancer')),
      'team', (select coalesce(jsonb_agg(jsonb_build_object('person_id', pe.id, 'name', coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name),
          'role', t.role_text, 'photo_file', mp.body->>'photo_file', 'headline', mp.body->>'headline', 'reviews', dela_review_summary(pe.id, 'freelancer')) order by t.position), '[]')
        from proposal_team t join people pe on pe.id = t.person_id left join member_profiles mp on mp.person_id = pe.id and mp.side = 'freelancer' where t.proposal_id = p.id)))
    from proposals p join organizations o on o.id = p.agency_org where p.gig_id = p_gig and p.agency_org is not null), '{}'::jsonb) end
$$;

-- A freelancer's profile as an attorney or agency sees it: experience, verification, skills and their own reviews
create or replace function dela_freelancer_card(p_viewer uuid, p_person uuid) returns jsonb language sql stable as $$
  select case when not exists (select 1 from side_profiles v where v.person_id = p_viewer and v.status <> 'closed') then jsonb_build_object('ok', false, 'reason', 'not_found')
    else (select jsonb_build_object('ok', true, 'person_id', pe.id,
      'name', coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name),
      'headline', mp.body->>'headline', 'summary', mp.body->>'summary', 'experience', mp.body->>'experience', 'practice_areas', mp.body->'practice_areas',
      'software', mp.body->'software', 'services', mp.body->'services', 'photo_file', mp.body->>'photo_file',
      'verified', sp.verification_state, 'readiness', sp.readiness_state, 'reviews', dela_review_summary(pe.id, 'freelancer'),
      'agencies', (select coalesce(jsonb_agg(coalesce(nullif(o.business_name, ''), o.name)), '[]') from org_members m join organizations o on o.id = m.org_id where m.person_id = pe.id and m.status = 'active' and o.kind = 'agency'))
      from people pe join side_profiles sp on sp.person_id = pe.id and sp.side = 'freelancer' left join member_profiles mp on mp.person_id = pe.id and mp.side = 'freelancer' where pe.id = p_person) end
$$;

-- ---------- After the hire ----------
-- An agency proposal becomes an agency engagement: paid to the agency (its owner's payout account), with the proposal's
-- sender and named team members on "Who's working on this"
create or replace function dela_agreement_agency() returns trigger language plpgsql as $$
declare pr proposals; v_owner uuid;
begin
  select * into pr from proposals where id = new.proposal_id;
  if pr.agency_org is null then return new; end if;
  v_owner := dela_agency_owner(pr.agency_org);
  new.agency_org := pr.agency_org;
  if v_owner is not null then new.freelancer_person := v_owner; end if;
  return new;
end $$;
drop trigger if exists agreements_agency on agreements;
create trigger agreements_agency before insert on agreements for each row execute function dela_agreement_agency();
create or replace function dela_agreement_agency_team() returns trigger language plpgsql as $$
declare pr proposals;
begin
  if new.agency_org is null then return new; end if;
  select * into pr from proposals where id = new.proposal_id;
  insert into engagement_team (agreement_id, person_id, kind, role_text, added_by)
  select new.id, t.person_id, 'team', t.role_text, pr.freelancer_id from proposal_team t where t.proposal_id = pr.id
  on conflict do nothing;
  if pr.freelancer_id <> new.freelancer_person and not exists (select 1 from engagement_team where agreement_id = new.id and person_id = pr.freelancer_id and removed_at is null) then
    insert into engagement_team (agreement_id, person_id, kind, role_text, added_by) values (new.id, pr.freelancer_id, 'team', 'Sent the proposal', pr.freelancer_id) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists agreements_agency_team on agreements;
create trigger agreements_agency_team after insert on agreements for each row execute function dela_agreement_agency_team();

-- Team members named on the engagement act on the freelancer's side of it (agreement, milestones, messages, Confidential
-- materials with their own code and promise). Removed team members lose it at once.
create or replace function dela_on_engagement_team(p_person uuid, p_agreement uuid) returns boolean language sql stable as $$
  select exists (select 1 from engagement_team t join agreements a on a.id = t.agreement_id
    where t.agreement_id = p_agreement and t.person_id = p_person and t.removed_at is null and t.kind = 'team'
      and a.agency_org is not null and dela_agency_role(p_person, a.agency_org) <> '')
$$;
create or replace function dela_agreement_role(p_person uuid, p_side text, p_agreement uuid) returns text language sql stable as $$
  select coalesce((select case when p_side = 'attorney' and dela_firm_role(p_person, a.attorney_org) in ('owner', 'manager') then 'attorney'
              when p_side = 'freelancer' and (a.freelancer_person = p_person or dela_on_engagement_team(p_person, a.id)) then 'freelancer' else '' end
  from agreements a where a.id = p_agreement), '')
$$;
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_conf_role(uuid,uuid)'::regprocedure) into v_src;
  if position('dela_on_engagement_team' in v_src) > 0 then return; end if;
  v_new := replace(v_src, 'when a.freelancer_person = p_person then ''freelancer''', 'when a.freelancer_person = p_person or dela_on_engagement_team(p_person, a.id) then ''freelancer''');
  if v_new = v_src then raise exception 'dela_conf_role changed; update 0040'; end if;
  execute v_new;
end $$;

-- "Who's working on this": the attorney, the agency and the people on it see the list
create or replace function dela_engagement_people(p_person uuid, p_side text, p_agreement uuid) returns jsonb language plpgsql stable as $$
declare a agreements; v_role text;
begin
  select * into a from agreements where id = p_agreement;
  v_role := dela_agreement_role(p_person, p_side, p_agreement);
  if a.id is null or (v_role = '' and not (p_side = 'freelancer' and a.agency_org is not null and dela_agency_role(p_person, a.agency_org) in ('owner', 'manager'))) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  return jsonb_build_object('ok', true, 'agency', case when a.agency_org is not null then (select jsonb_build_object('org_id', o.id, 'name', coalesce(nullif(o.business_name, ''), o.name)) from organizations o where o.id = a.agency_org) end,
    'can_change', p_side = 'freelancer' and a.agency_org is not null and dela_agency_role(p_person, a.agency_org) in ('owner', 'manager') and a.status in ('draft', 'signing', 'signed', 'active'),
    'people', (select coalesce(jsonb_agg(jsonb_build_object('person_id', pe.id, 'name', dela_freelancer_name(pe.id), 'kind', t.kind, 'role', t.role_text, 'since', t.added_at,
        'photo_file', mp.body->>'photo_file') order by t.kind, t.added_at), '[]')
      from engagement_team t join people pe on pe.id = t.person_id left join member_profiles mp on mp.person_id = pe.id and mp.side = 'freelancer' where t.agreement_id = a.id and t.removed_at is null),
    'options', case when p_side = 'freelancer' and a.agency_org is not null and dela_agency_role(p_person, a.agency_org) in ('owner', 'manager') then dela_agency_pickable(a.agency_org) end);
end $$;

-- The agency changes who works on an engagement after the hire; the attorney gets an information-only notice
create or replace function dela_engagement_team_set(p_person uuid, p_agreement uuid, p_member uuid, p_on boolean, p_role text) returns jsonb language plpgsql as $$
declare a agreements; v_name text; v_title text;
begin
  select * into a from agreements where id = p_agreement for update;
  if a.id is null or a.agency_org is null or dela_agency_role(p_person, a.agency_org) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if a.status not in ('draft', 'signing', 'signed', 'active') then return jsonb_build_object('ok', false, 'reason', 'agreement_closed'); end if;
  if p_on then
    if not exists (select 1 from jsonb_array_elements(dela_agency_pickable(a.agency_org)) y where y->>'person_id' = p_member::text) then return jsonb_build_object('ok', false, 'reason', 'team_member_not_ready'); end if;
    if exists (select 1 from engagement_team where agreement_id = a.id and person_id = p_member and removed_at is null) then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    insert into engagement_team (agreement_id, person_id, kind, role_text, added_by) values (a.id, p_member, 'team', left(btrim(coalesce(p_role, '')), 80), p_person);
  else
    if (select count(*) from engagement_team where agreement_id = a.id and removed_at is null and kind = 'team') <= 1 and exists (select 1 from engagement_team where agreement_id = a.id and person_id = p_member and removed_at is null and kind = 'team') then
      return jsonb_build_object('ok', false, 'reason', 'keep_one_person');
    end if;
    update engagement_team set removed_at = now(), removed_by = p_person where agreement_id = a.id and person_id = p_member and removed_at is null;
    if not found then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  end if;
  v_name := dela_freelancer_name(p_member);
  select title into v_title from gigs where id = a.gig_id;
  perform dela_notify(jsonb_build_object('person_id', a.attorney_person, 'side', 'attorney', 'kind', 'engagement',
    'title', 'A change in who is working on ' || coalesce(v_title, 'your engagement'),
    'body', v_name || case when p_on then ' is now working on ' else ' is no longer working on ' end || coalesce(v_title, 'your engagement') || '. This is for your information; nothing is needed from you.',
    'link', '/dela?tab=projects&gig=' || a.gig_id || '&view=agreement', 'dedupe_key', 'engteam:' || a.id || ':' || p_member || ':' || p_on || ':' || now()::text));
  perform dela_audit('member', p_person, case when p_on then 'engagement_person_added' else 'engagement_person_removed' end, 'agreement', a.id::text, jsonb_build_object('person_id', p_member));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Reviews ----------
-- A review of an agency is also a review of each team member named on the proposal
create or replace function dela_review_fanout() returns trigger language plpgsql as $$
declare a agreements;
begin
  if new.direction <> 'of_freelancer' then return new; end if;
  select * into a from agreements where id = new.agreement_id;
  if a.agency_org is null then return new; end if;
  update reviews set agency_org = a.agency_org where id = new.id;
  insert into review_subjects (review_id, person_id) select new.id, t.person_id from proposal_team t where t.proposal_id = a.proposal_id and t.person_id <> new.subject_person on conflict do nothing;
  return new;
end $$;
drop trigger if exists reviews_fanout on reviews;
create trigger reviews_fanout after insert on reviews for each row execute function dela_review_fanout();
create or replace function dela_review_about(p_review uuid, p_subject_col uuid, p_subject uuid) returns boolean language sql stable as $$
  select p_subject_col = p_subject or exists (select 1 from review_subjects rs where rs.review_id = p_review and rs.person_id = p_subject)
$$;
do $$
declare v_src text; v_new text; f text;
begin
  foreach f in array array['dela_reviews_of(uuid,uuid,text)', 'dela_review_summary(uuid,text)'] loop
    select pg_get_functiondef(f::regprocedure) into v_src;
    if position('dela_review_about' in v_src) > 0 then continue; end if;
    v_new := replace(v_src, 'r.subject_person = p_subject', 'dela_review_about(r.id, r.subject_person, p_subject)');
    v_new := replace(v_new, 'where subject_person = p_subject', 'where dela_review_about(id, subject_person, p_subject)');
    if v_new = v_src then raise exception '% changed; update 0040', f; end if;
    execute v_new;
  end loop;
end $$;

-- ---------- The Lawfecta Team ----------
create or replace function dela_admin_agencies(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['support', 'reviewer']);
  return jsonb_build_object('ok', true, 'switches', (select jsonb_object_agg(key, state) from feature_switches where key like 'agency%'),
    'agencies', (select coalesce(jsonb_agg(jsonb_build_object('org_id', o.id, 'name', coalesce(nullif(o.business_name, ''), o.name), 'business_name', o.business_name, 'business_state', o.business_state,
        'checked', o.business_checked_at is not null, 'checked_at', o.business_checked_at, 'note', o.business_check_note, 'owner', dela_freelancer_name(pe.id), 'owner_email', pe.email,
        'active', dela_agency_active(o.id), 'seats', dela_agency_seats(o.id),
        'engagements', (select count(*) from agreements a where a.agency_org = o.id)) order by o.business_checked_at nulls first, o.created_at desc), '[]')
      from organizations o join people pe on pe.id = o.owner_person_id where o.kind = 'agency'));
end $$;
create or replace function dela_admin_agency_check(p_actor uuid, p_org uuid, p_ok boolean, p_note text) returns jsonb language plpgsql as $$
begin
  perform dela_require_staff(p_actor, array['support', 'reviewer']);
  update organizations set business_checked_at = case when p_ok then now() end, business_checked_by = case when p_ok then p_actor end, business_check_note = left(coalesce(p_note, ''), 300)
  where id = p_org and kind = 'agency';
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform dela_notify(jsonb_build_object('person_id', dela_agency_owner(p_org), 'side', 'freelancer', 'kind', 'agency',
    'title', case when p_ok then 'Your agency''s business details are checked' else 'Your agency''s business details need a change' end,
    'body', case when p_ok then 'The Lawfecta Team checked your business name and state.' else 'The Lawfecta Team could not confirm your business name and state: ' || coalesce(nullif(p_note, ''), 'please check them') || '.' end,
    'link', '/dela?tab=agency', 'dedupe_key', 'agencychecked:' || p_org || ':' || now()::text));
  perform dela_audit('staff', p_actor, case when p_ok then 'agency_business_checked' else 'agency_business_rejected' end, 'organization', p_org::text, jsonb_build_object('note', left(coalesce(p_note, ''), 300)));
  return jsonb_build_object('ok', true);
end $$;
create or replace function dela_admin_agency_seats(p_actor uuid, p_org uuid, p_limit int) returns jsonb language plpgsql as $$
begin
  perform dela_require_staff(p_actor, array['support']);
  if p_limit is not null and (p_limit < 1 or p_limit > 500) then return jsonb_build_object('ok', false, 'reason', 'bad_number'); end if;
  update organizations set seat_limit_override = p_limit where id = p_org and kind = 'agency';
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform dela_audit('staff', p_actor, 'agency_seats_set', 'organization', p_org::text, jsonb_build_object('limit', p_limit));
  return jsonb_build_object('ok', true, 'seats', dela_agency_seats(p_org));
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

-- Binding steps on an agency engagement (signing, changing the agreement, canceling, disputes, the review of the
-- attorney) are for the agency's owner and managers; team members do the work. DELA's own first draft is not one.
create or replace function dela_agency_may_bind(p_person uuid, p_side text, p_agreement uuid) returns boolean language sql stable as $$
  select coalesce((select p_side <> 'freelancer' or a.agency_org is null or a.freelancer_person = p_person or dela_agency_role(p_person, a.agency_org) in ('owner', 'manager')
    from agreements a where a.id = p_agreement), true)
$$;
do $$
declare f text; v_src text; v_new text; v_guard text;
begin
  foreach f in array array['dela_agreement_sign(uuid,text,uuid,jsonb)', 'dela_agreement_version_add(uuid,text,uuid,jsonb,text,integer)', 'dela_engagement_cancel(uuid,text,uuid,text)',
                           'dela_dispute_open(uuid,text,uuid,uuid,text)', 'dela_review_save(uuid,text,uuid,jsonb)'] loop
    select pg_get_functiondef(f::regprocedure) into v_src;
    if position('dela_agency_may_bind' in v_src) > 0 then continue; end if;
    v_guard := case when f like 'dela_agreement_version_add%' then 'if p_base > 0 and not dela_agency_may_bind(p_person, p_side, p_agreement)'
                    else 'if not dela_agency_may_bind(p_person, p_side, p_agreement)' end;
    v_new := regexp_replace(v_src, E'\nbegin\n', E'\nbegin\n  ' || v_guard || E' then return jsonb_build_object(''ok'', false, ''reason'', ''agency_managers_only''); end if;\n');
    if v_new = v_src then raise exception '% changed; update 0040', f; end if;
    execute v_new;
  end loop;
end $$;
revoke all on function dela_agency_may_bind(uuid, text, uuid) from public, anon, authenticated;
grant execute on function dela_agency_may_bind(uuid, text, uuid) to service_role;
alter function dela_agency_may_bind(uuid, text, uuid) set search_path = public, extensions, pg_temp;

-- Team members on an agency engagement open the gig as hired (its document, files and messages)
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_gig_access(uuid,uuid)'::regprocedure) into v_src;
  if position('dela_on_engagement_team' in v_src) = 0 then
    v_new := replace(v_src, 'when exists (select 1 from agreements a where a.gig_id = g.id and a.freelancer_person = p_person) then ''hired''',
      'when exists (select 1 from agreements a where a.gig_id = g.id and (a.freelancer_person = p_person or dela_on_engagement_team(p_person, a.id))) then ''hired''');
    if v_new = v_src then raise exception 'dela_gig_access changed; update 0040'; end if;
    execute v_new;
  end if;
  select pg_get_functiondef('dela_gig_files_open(uuid,uuid)'::regprocedure) into v_src;
  if position('dela_on_engagement_team' in v_src) = 0 then
    v_new := replace(v_src, 'a.freelancer_person = p_person and a.status not in', '(a.freelancer_person = p_person or dela_on_engagement_team(p_person, a.id)) and a.status not in');
    if v_new = v_src then raise exception 'dela_gig_files_open changed; update 0040'; end if;
    execute v_new;
  end if;
end $$;

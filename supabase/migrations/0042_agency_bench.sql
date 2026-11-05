-- Agencies, part 2a: the agency bench with a signed fee split (docs/briefs/step-7d-agencies.md, Stacey's answers and
-- fee answers 2026-11-05).
-- The bench is outside freelancers the agency hires gig by gig; they never use a seat. Before a freelancer joins, the
-- agency and the freelancer both sign the bench agreement, which sets the default split of the fee (the agency's share
-- is 5% to 50%, never below the freelancer-side fee) and carries the confidentiality and no-poaching terms.
-- Only Freelancer Plus or higher can join (agency.bench_min_plan). A Free freelancer can be invited; the invitation says
-- they must upgrade, and stays open agency.bench_invite_days days. A bench member who drops to Free shows "Inactive:
-- Free plan" and gets no new assignments; jobs already assigned run to the end.
-- Changing the default split needs a new version signed by both; until then the last version both signed applies.
-- The attorney never sees a split. The Lawfecta Team sees every split. Versions and signatures are append-only. Additive.

insert into feature_switches (key, label, gate) values
  ('agency_bench', 'Agency bench: bench agreements with a fee split (agencies on Freelancer Business)', 'Step 7d part 2 tested')
on conflict (key) do nothing;

create table if not exists agency_bench (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  freelancer_person uuid not null references people(id),
  status text not null default 'invited' check (status in ('invited', 'active', 'declined', 'left', 'removed', 'expired')),
  note text not null default '',
  invited_by uuid not null references people(id),
  expires_at timestamptz not null,
  request_id text not null default '',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  ended_at timestamptz,
  ended_by uuid references people(id)
);
create unique index if not exists agency_bench_open on agency_bench (org_id, freelancer_person) where status in ('invited', 'active');
create index if not exists agency_bench_person on agency_bench (freelancer_person);
alter table agency_bench enable row level security;

-- Each proposed split is a version. Version 1 comes with the invitation.
create table if not exists agency_bench_versions (
  bench_id uuid not null references agency_bench(id),
  version int not null,
  agency_bps int not null check (agency_bps between 0 and 10000),
  proposed_by uuid not null references people(id),
  proposed_side text not null check (proposed_side in ('agency', 'freelancer')),
  terms_hash text not null,
  created_at timestamptz not null default now(),
  primary key (bench_id, version)
);
create trigger agency_bench_versions_append_only before update or delete on agency_bench_versions for each row execute function dela_no_change();
alter table agency_bench_versions enable row level security;

create table if not exists agency_bench_signatures (
  bench_id uuid not null references agency_bench(id),
  version int not null,
  role text not null check (role in ('agency', 'freelancer')),
  person_id uuid not null references people(id),
  typed_name text not null,
  terms_hash text not null,
  signed_at timestamptz not null default now(),
  primary key (bench_id, version, role),
  foreign key (bench_id, version) references agency_bench_versions (bench_id, version)
);
create trigger agency_bench_signatures_append_only before update or delete on agency_bench_signatures for each row execute function dela_no_change();
alter table agency_bench_signatures enable row level security;

-- The bench agreement's terms. The version's fingerprint covers these words and the split.
create or replace function dela_agency_bench_terms() returns text language sql immutable as $$
  select 'Bench agreement on Lawfecta. 1. Split: for each milestone the agency assigns to the freelancer, the fee is shared by the split in this version: the agency''s share and the freelancer''s share. The agency pays the whole freelancer-side platform fee out of its share, so the freelancer receives their full share. A different split for one job applies only when the freelancer accepts it for that job. 2. Payment: each share is paid to its owner''s own payout account when the attorney accepts the milestone. Refunds and chargebacks come back from both shares in the same percentages. 3. Confidentiality: the freelancer keeps everything the agency or its clients share confidential, uses it only for the assigned work, and deletes copies when the work ends. 4. No poaching: while on the bench and for 12 months after, the freelancer does not take work directly from the agency''s clients met through this work, and the agency does not hire the freelancer outside Lawfecta for that work. All work and payment stay on Lawfecta. 5. Ending: either side may leave the bench at any time. New assignments stop; milestones already assigned keep their split and pay out. A new default split needs a new version signed by both.'
$$;
create or replace function dela_agency_bench_hash(p_bench uuid, p_version int, p_bps int) returns text language sql stable as $$
  select encode(digest(convert_to(p_bench::text || ':' || p_version || ':' || p_bps || ':' || dela_agency_bench_terms(), 'UTF8'), 'sha256'), 'hex')
$$;

-- The plan rule: Plus or higher can join a bench
create or replace function dela_tier_rank(p_tier text) returns int language sql immutable as $$
  select case p_tier when 'free' then 0 when 'plus' then 1 when 'pro' then 2 when 'business' then 3 else 0 end
$$;
create or replace function dela_bench_plan_ok(p_person uuid) returns boolean language sql stable as $$
  select dela_tier_rank(coalesce(dela_side_tier(p_person, 'freelancer'), 'free')) >=
    dela_tier_rank(coalesce((select pl.tier from plans pl where pl.code = dela_setting_text('agency.bench_min_plan', 'fl_plus')), 'plus'))
$$;
create or replace function dela_bench_split_ok(p_bps int) returns boolean language sql stable as $$
  select p_bps is not null and p_bps >= (dela_agency_split_limits()->>'min_bps')::int and p_bps <= (dela_agency_split_limits()->>'max_bps')::int
$$;

-- The split in effect: the newest version both signed
create or replace function dela_agency_bench_signed(p_bench uuid) returns jsonb language sql stable as $$
  select (select jsonb_build_object('version', v.version, 'agency_bps', v.agency_bps, 'signed_at', greatest(sa.signed_at, sf.signed_at))
    from agency_bench_versions v
    join agency_bench_signatures sa on sa.bench_id = v.bench_id and sa.version = v.version and sa.role = 'agency'
    join agency_bench_signatures sf on sf.bench_id = v.bench_id and sf.version = v.version and sf.role = 'freelancer'
    where v.bench_id = p_bench order by v.version desc limit 1)
$$;
-- A version waiting for the other side's signature (newer than the one in effect)
create or replace function dela_agency_bench_waiting(p_bench uuid) returns jsonb language sql stable as $$
  select (select jsonb_build_object('version', v.version, 'agency_bps', v.agency_bps, 'proposed_side', v.proposed_side, 'at', v.created_at,
      'agency_signed', exists (select 1 from agency_bench_signatures s where s.bench_id = v.bench_id and s.version = v.version and s.role = 'agency'),
      'freelancer_signed', exists (select 1 from agency_bench_signatures s where s.bench_id = v.bench_id and s.version = v.version and s.role = 'freelancer'))
    from agency_bench_versions v where v.bench_id = p_bench and v.version > coalesce((dela_agency_bench_signed(p_bench)->>'version')::int, 0)
    order by v.version desc limit 1)
$$;
create or replace function dela_agency_bench_open(p_person uuid) returns boolean language sql stable as $$
  select dela_switch_on('agency_bench', p_person)
$$;

-- A new version proposed by one side, signed by that side at once
create or replace function dela_agency_bench_propose(p_bench uuid, p_person uuid, p_side text, p_bps int, p_name text) returns int language plpgsql as $$
declare v_ver int;
begin
  select coalesce(max(version), 0) + 1 into v_ver from agency_bench_versions where bench_id = p_bench;
  insert into agency_bench_versions (bench_id, version, agency_bps, proposed_by, proposed_side, terms_hash) values (p_bench, v_ver, p_bps, p_person, p_side, dela_agency_bench_hash(p_bench, v_ver, p_bps));
  insert into agency_bench_signatures (bench_id, version, role, person_id, typed_name, terms_hash) values (p_bench, v_ver, p_side, p_person, left(btrim(p_name), 120), dela_agency_bench_hash(p_bench, v_ver, p_bps));
  return v_ver;
end $$;
-- The other side signs the waiting version. When both have signed, it is the split in effect (and an invitation becomes active).
create or replace function dela_agency_bench_countersign(p_bench uuid, p_person uuid, p_side text, p_name text) returns jsonb language plpgsql as $$
declare w jsonb := dela_agency_bench_waiting(p_bench); b agency_bench;
begin
  if w is null then return jsonb_build_object('ok', false, 'reason', 'nothing_to_sign'); end if;
  if (p_side = 'agency' and (w->>'agency_signed')::boolean) or (p_side = 'freelancer' and (w->>'freelancer_signed')::boolean) then
    return jsonb_build_object('ok', false, 'reason', 'waiting_for_other_side');
  end if;
  insert into agency_bench_signatures (bench_id, version, role, person_id, typed_name, terms_hash)
  values (p_bench, (w->>'version')::int, p_side, p_person, left(btrim(p_name), 120), dela_agency_bench_hash(p_bench, (w->>'version')::int, (w->>'agency_bps')::int));
  select * into b from agency_bench where id = p_bench for update;
  if b.status = 'invited' then update agency_bench set status = 'active', decided_at = now() where id = b.id; end if;
  return jsonb_build_object('ok', true, 'version', (w->>'version')::int, 'agency_bps', (w->>'agency_bps')::int, 'joined', b.status = 'invited');
end $$;

-- The agency (owner or manager) invites a freelancer by their Lawfecta email, with the default split, and signs version 1
create or replace function dela_agency_bench_invite(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_org uuid := dela_side_org(p_person, 'freelancer'); o organizations; who people; v_id uuid; v_bps int := (p->>'agency_bps')::int; v_name text := btrim(coalesce(p->>'typed_name', ''));
  v_agency text; v_plan_ok boolean;
begin
  if not dela_agency_bench_open(p_person) then return jsonb_build_object('ok', false, 'reason', 'agency_bench_off'); end if;
  -- A manager acts for the agency they belong to
  select o2.* into o from organizations o2 join org_members m on m.org_id = o2.id and m.person_id = p_person and m.status = 'active'
  where o2.kind = 'agency' and m.member_role in ('owner', 'manager') order by (o2.id = v_org) desc limit 1;
  if o.id is null then return jsonb_build_object('ok', false, 'reason', 'agency_managers_only'); end if;
  if not dela_agency_active(o.id) then return jsonb_build_object('ok', false, 'reason', 'agency_inactive'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  if not dela_bench_split_ok(v_bps) then return jsonb_build_object('ok', false, 'reason', 'bad_split', 'limits', dela_agency_split_limits()); end if;
  if length(v_name) < 2 or coalesce((p->>'agree')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'sign_needed'); end if;
  select * into who from people where lower(email) = lower(btrim(coalesce(p->>'email', ''))) limit 1;
  if who.id is null or not exists (select 1 from side_profiles sp where sp.person_id = who.id and sp.side = 'freelancer' and sp.status <> 'closed') then
    return jsonb_build_object('ok', false, 'reason', 'not_a_freelancer');
  end if;
  if who.id = o.owner_person_id or exists (select 1 from org_members m where m.org_id = o.id and m.person_id = who.id and m.status = 'active') then
    return jsonb_build_object('ok', false, 'reason', 'already_on_team');
  end if;
  select id into v_id from agency_bench where org_id = o.id and freelancer_person = who.id and status in ('invited', 'active');
  if v_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_id); end if;
  insert into agency_bench (org_id, freelancer_person, note, invited_by, expires_at, request_id)
  values (o.id, who.id, left(coalesce(p->>'note', ''), 600), p_person, now() + make_interval(days => dela_int_setting('agency.bench_invite_days', 30)), coalesce(p->>'request_id', ''))
  returning id into v_id;
  perform dela_agency_bench_propose(v_id, p_person, 'agency', v_bps, v_name);
  v_agency := coalesce(nullif(o.business_name, ''), o.name);
  v_plan_ok := dela_bench_plan_ok(who.id);
  perform dela_notify(jsonb_build_object('person_id', who.id, 'side', 'freelancer', 'kind', 'agency', 'email', true,
    'title', v_agency || ' invited you to its bench',
    'body', v_agency || ' wants to hire you for its work, with ' || (v_bps / 100.0)::numeric(5,1)::text || '% of the fee to the agency and ' || ((10000 - v_bps) / 100.0)::numeric(5,1)::text || '% to you. The agency pays the platform fee from its share. ' ||
      case when v_plan_ok then 'Open DELA, Agency tab, to read and sign the bench agreement, or propose another split.'
      else 'To join a bench you need Freelancer Plus or higher. Upgrade to Plus, then open DELA, Agency tab, to sign. The invitation stays open ' || dela_int_setting('agency.bench_invite_days', 30) || ' days.' end,
    'link', '/dela?tab=agency', 'dedupe_key', 'agbenchinv:' || v_id::text));
  perform dela_audit('member', p_person, 'agency_bench_invited', 'agency_bench', v_id::text, jsonb_build_object('agency_bps', v_bps, 'plan_ok', v_plan_ok));
  return jsonb_build_object('ok', true, 'id', v_id, 'plan_ok', v_plan_ok);
end $$;

-- The freelancer answers: sign the agency's split, propose another split (signed by them), or decline
create or replace function dela_agency_bench_answer(p_person uuid, p_bench uuid, p jsonb) returns jsonb language plpgsql as $$
declare b agency_bench; v_action text := coalesce(p->>'action', ''); v_name text := btrim(coalesce(p->>'typed_name', '')); v_bps int := (p->>'agency_bps')::int; r jsonb; v_ver int; v_agency text;
begin
  select * into b from agency_bench where id = p_bench for update;
  if b.id is null or b.freelancer_person <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_agency_bench_open(p_person) then return jsonb_build_object('ok', false, 'reason', 'agency_bench_off'); end if;
  if b.status = 'invited' and b.expires_at < now() then
    update agency_bench set status = 'expired', decided_at = now() where id = b.id;
    return jsonb_build_object('ok', false, 'reason', 'bench_invite_expired');
  end if;
  if b.status not in ('invited', 'active') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  select coalesce(nullif(o.business_name, ''), o.name) into v_agency from organizations o where o.id = b.org_id;
  if v_action = 'decline' then
    if b.status <> 'invited' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
    update agency_bench set status = 'declined', decided_at = now() where id = b.id;
    perform dela_notify(jsonb_build_object('person_id', b.invited_by, 'side', 'freelancer', 'kind', 'agency', 'title', dela_freelancer_name(p_person) || ' declined your bench invitation',
      'body', 'You can invite them again later.', 'link', '/dela?tab=agency', 'dedupe_key', 'agbenchno:' || b.id::text));
    return jsonb_build_object('ok', true, 'status', 'declined');
  end if;
  if not dela_bench_plan_ok(p_person) then return jsonb_build_object('ok', false, 'reason', 'bench_plus_needed'); end if;
  if length(v_name) < 2 or coalesce((p->>'agree')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'sign_needed'); end if;
  if v_action = 'sign' then
    r := dela_agency_bench_countersign(b.id, p_person, 'freelancer', v_name);
    if not (r->>'ok')::boolean then return r; end if;
    perform dela_notify(jsonb_build_object('person_id', b.invited_by, 'side', 'freelancer', 'kind', 'agency', 'email', true,
      'title', case when (r->>'joined')::boolean then dela_freelancer_name(p_person) || ' joined your bench' else dela_freelancer_name(p_person) || ' signed the new split' end,
      'body', 'Bench agreement version ' || (r->>'version') || ' is signed by both: ' || ((r->>'agency_bps')::int / 100.0)::numeric(5,1)::text || '% to the agency.', 'link', '/dela?tab=agency', 'dedupe_key', 'agbenchsig:' || b.id::text || ':' || (r->>'version')));
    perform dela_audit('member', p_person, 'agency_bench_signed', 'agency_bench', b.id::text, jsonb_build_object('version', r->>'version', 'side', 'freelancer'));
    return r || jsonb_build_object('status', 'active');
  end if;
  if v_action = 'counter' then
    if not dela_bench_split_ok(v_bps) then return jsonb_build_object('ok', false, 'reason', 'bad_split', 'limits', dela_agency_split_limits()); end if;
    -- A newer proposal replaces any older one still waiting (only the newest can be signed)
    v_ver := dela_agency_bench_propose(b.id, p_person, 'freelancer', v_bps, v_name);
    perform dela_notify(jsonb_build_object('person_id', b.invited_by, 'side', 'freelancer', 'kind', 'agency', 'email', true,
      'title', dela_freelancer_name(p_person) || ' proposed another split',
      'body', 'They proposed ' || (v_bps / 100.0)::numeric(5,1)::text || '% to the agency and ' || ((10000 - v_bps) / 100.0)::numeric(5,1)::text || '% to them, and signed it. Open DELA, Agency tab, to sign it or propose another.',
      'link', '/dela?tab=agency', 'dedupe_key', 'agbenchctr:' || b.id::text || ':' || v_ver));
    perform dela_audit('member', p_person, 'agency_bench_countered', 'agency_bench', b.id::text, jsonb_build_object('version', v_ver, 'agency_bps', v_bps));
    return jsonb_build_object('ok', true, 'version', v_ver, 'status', b.status);
  end if;
  return jsonb_build_object('ok', false, 'reason', 'bad_request');
end $$;

-- The agency (owner or manager) signs the freelancer's proposed split, or proposes a new default split
create or replace function dela_agency_bench_agency(p_person uuid, p_bench uuid, p jsonb) returns jsonb language plpgsql as $$
declare b agency_bench; v_action text := coalesce(p->>'action', ''); v_name text := btrim(coalesce(p->>'typed_name', '')); v_bps int := (p->>'agency_bps')::int; r jsonb; v_ver int; v_agency text;
begin
  select * into b from agency_bench where id = p_bench for update;
  if b.id is null or dela_agency_role(p_person, b.org_id) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_agency_bench_open(p_person) then return jsonb_build_object('ok', false, 'reason', 'agency_bench_off'); end if;
  if not dela_agency_active(b.org_id) then return jsonb_build_object('ok', false, 'reason', 'agency_inactive'); end if;
  if b.status not in ('invited', 'active') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if length(v_name) < 2 or coalesce((p->>'agree')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'sign_needed'); end if;
  select coalesce(nullif(o.business_name, ''), o.name) into v_agency from organizations o where o.id = b.org_id;
  if v_action = 'sign' then
    if b.status = 'invited' and not dela_bench_plan_ok(b.freelancer_person) then return jsonb_build_object('ok', false, 'reason', 'bench_plus_needed_them'); end if;
    r := dela_agency_bench_countersign(b.id, p_person, 'agency', v_name);
    if not (r->>'ok')::boolean then return r; end if;
    perform dela_notify(jsonb_build_object('person_id', b.freelancer_person, 'side', 'freelancer', 'kind', 'agency', 'email', true,
      'title', case when (r->>'joined')::boolean then 'You joined ' || v_agency || '''s bench' else v_agency || ' signed the new split' end,
      'body', 'Bench agreement version ' || (r->>'version') || ' is signed by both: ' || ((10000 - (r->>'agency_bps')::int) / 100.0)::numeric(5,1)::text || '% of the fee to you, with no platform fee for you.',
      'link', '/dela?tab=agency', 'dedupe_key', 'agbenchsig:' || b.id::text || ':' || (r->>'version')));
    perform dela_audit('member', p_person, 'agency_bench_signed', 'agency_bench', b.id::text, jsonb_build_object('version', r->>'version', 'side', 'agency'));
    return r || jsonb_build_object('status', 'active');
  end if;
  if v_action = 'change' then
    if b.status <> 'active' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
    if not dela_bench_split_ok(v_bps) then return jsonb_build_object('ok', false, 'reason', 'bad_split', 'limits', dela_agency_split_limits()); end if;
    v_ver := dela_agency_bench_propose(b.id, p_person, 'agency', v_bps, v_name);
    perform dela_notify(jsonb_build_object('person_id', b.freelancer_person, 'side', 'freelancer', 'kind', 'agency', 'email', true,
      'title', v_agency || ' proposed a new default split',
      'body', 'The new default would be ' || ((10000 - v_bps) / 100.0)::numeric(5,1)::text || '% of the fee to you. Your current split stays until you sign. It would apply only to work assigned after both sign.',
      'link', '/dela?tab=agency', 'dedupe_key', 'agbenchchg:' || b.id::text || ':' || v_ver));
    perform dela_audit('member', p_person, 'agency_bench_change_proposed', 'agency_bench', b.id::text, jsonb_build_object('version', v_ver, 'agency_bps', v_bps));
    return jsonb_build_object('ok', true, 'version', v_ver);
  end if;
  return jsonb_build_object('ok', false, 'reason', 'bad_request');
end $$;

-- Either side ends it: the freelancer leaves, or the agency removes them (or cancels an invitation)
create or replace function dela_agency_bench_end(p_person uuid, p_bench uuid) returns jsonb language plpgsql as $$
declare b agency_bench; v_mine boolean; v_agency text;
begin
  select * into b from agency_bench where id = p_bench for update;
  if b.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_mine := b.freelancer_person = p_person;
  if not v_mine and dela_agency_role(p_person, b.org_id) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if b.status not in ('invited', 'active') then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update agency_bench set status = case when v_mine then 'left' else 'removed' end, ended_at = now(), ended_by = p_person where id = b.id;
  select coalesce(nullif(o.business_name, ''), o.name) into v_agency from organizations o where o.id = b.org_id;
  perform dela_notify(jsonb_build_object('person_id', case when v_mine then b.invited_by else b.freelancer_person end, 'side', 'freelancer', 'kind', 'agency',
    'title', case when v_mine then dela_freelancer_name(p_person) || ' left your bench' else 'You are no longer on ' || v_agency || '''s bench' end,
    'body', 'New assignments stop. Milestones already assigned keep their split and pay out.', 'link', '/dela?tab=agency', 'dedupe_key', 'agbenchend:' || b.id::text));
  perform dela_audit('member', p_person, case when v_mine then 'agency_bench_left' else 'agency_bench_removed' end, 'agency_bench', b.id::text, '{}');
  return jsonb_build_object('ok', true, 'status', case when v_mine then 'left' else 'removed' end);
end $$;

-- One bench line as the agency or the freelancer sees it (never the attorney)
create or replace function dela_agency_bench_line(p_bench uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('id', b.id, 'org_id', b.org_id, 'agency', coalesce(nullif(o.business_name, ''), o.name), 'person_id', b.freelancer_person, 'name', dela_freelancer_name(b.freelancer_person),
    'email', (select email from people where id = b.freelancer_person),
    'status', case when b.status = 'invited' and b.expires_at < now() then 'expired' else b.status end, 'expires_at', b.expires_at, 'note', b.note,
    'invited_by', dela_freelancer_name(b.invited_by), 'created_at', b.created_at,
    'plan_ok', dela_bench_plan_ok(b.freelancer_person),
    'inactive', b.status = 'active' and not dela_bench_plan_ok(b.freelancer_person),
    'readiness', (select sp.readiness_state from side_profiles sp where sp.person_id = b.freelancer_person and sp.side = 'freelancer'),
    'split', dela_agency_bench_signed(b.id), 'waiting', dela_agency_bench_waiting(b.id))
  from agency_bench b join organizations o on o.id = b.org_id where b.id = p_bench
$$;

-- Everything the Agency tab needs about benches: the agency's bench (owner and managers) and the benches you are on
create or replace function dela_agency_bench_list(p_person uuid) returns jsonb language plpgsql stable as $$
declare v_org uuid;
begin
  if not dela_agency_bench_open(p_person) then return jsonb_build_object('ok', true, 'on', false); end if;
  select o.id into v_org from organizations o join org_members m on m.org_id = o.id and m.person_id = p_person and m.status = 'active'
  where o.kind = 'agency' and m.member_role in ('owner', 'manager') order by (o.id = dela_side_org(p_person, 'freelancer')) desc limit 1;
  return jsonb_build_object('ok', true, 'on', true, 'limits', dela_agency_split_limits(), 'terms', dela_agency_bench_terms(),
    'fee_bps', dela_int_setting('fee.freelancer_bps', 500), 'plan_ok', dela_bench_plan_ok(p_person),
    'min_plan', (select name from plans where code = dela_setting_text('agency.bench_min_plan', 'fl_plus')),
    'agency_bench', case when v_org is null then null else (select coalesce(jsonb_agg(dela_agency_bench_line(b.id) order by (b.status = 'active') desc, b.created_at desc), '[]')
      from agency_bench b where b.org_id = v_org and (b.status in ('invited', 'active') or b.decided_at > now() - interval '30 days' or b.ended_at > now() - interval '30 days')) end,
    'my_benches', (select coalesce(jsonb_agg(dela_agency_bench_line(b.id) order by b.created_at desc), '[]')
      from agency_bench b where b.freelancer_person = p_person and b.status in ('invited', 'active')));
end $$;

-- The Lawfecta Team sees every bench and its split
create or replace function dela_admin_agency_bench(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['support', 'reviewer']);
  return jsonb_build_object('ok', true, 'bench', (select coalesce(jsonb_agg(dela_agency_bench_line(b.id) order by b.created_at desc), '[]')
    from (select id, created_at from agency_bench order by created_at desc limit 200) b));
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and (p.proname like 'dela_agency_bench%' or p.proname in ('dela_tier_rank', 'dela_bench_plan_ok', 'dela_bench_split_ok', 'dela_admin_agency_bench')) loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

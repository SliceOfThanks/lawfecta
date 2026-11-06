-- Agencies, part 2c: the agency's own gigs (docs/briefs/step-7d-agencies.md, Stacey's answers 3, 4 and 8 and fee answer 5).
-- An agency on Freelancer Business has its own Library (SOPs and Workflows under the same document standard), posts gigs
-- from approved documents once the owner is verified and the Lawfecta Team has checked its business name and state, uses
-- Talent, invites its bench first, and is the client on the agreement: it signs, pays each milestone and accepts the work.
-- It pays the 5% client fee; when it hires its own bench member it also pays the 5% freelancer-side fee and the bench member
-- pays none. The agency acts from its freelancer session: dela_client_role decides client rights for attorney orgs (the
-- attorney side, as before) and agency orgs (the freelancer side, owner or manager, switch agency_hiring). The columns
-- agreements.attorney_org and attorney_person keep their names and hold the agency and the person acting for it.
-- Agency members cannot be matched to, or propose to, their own agency's gigs. Additive; existing functions are patched
-- in place with a guard that stops if a function changed.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('agency.gigs_active', '0', 'Open gigs an agency can have at once (0 means no limit)', 'Agencies', 'gigs', 'O', 'Claude suggestion: the same as Attorney Business (no limit)', ''),
  ('agency.playbooks_saved', '0', 'Documents an agency can keep in its Library (0 means no limit)', 'Agencies', 'documents', 'O', 'Claude suggestion: the same as Attorney Business (no limit)', ''),
  ('agency.bench_fee_waiver', 'true', 'On an agency''s own gig, a bench member pays no freelancer fee; the agency pays it', 'Agencies', '', 'C', 'Stacey 2026-11-05 (fee answer 5)', '')
on conflict (key) do nothing;

-- ---------- Who acts as the client ----------
create or replace function dela_is_agency(p_org uuid) returns boolean language sql stable as $$
  select exists (select 1 from organizations where id = p_org and kind = 'agency')
$$;
-- Client rights on an org: attorneys on the attorney side (owner or manager); agencies on the freelancer side (owner or
-- manager, the agency_hiring switch on). Running work stays reachable after a downgrade; new gigs need an active agency.
create or replace function dela_client_role(p_person uuid, p_side text, p_org uuid) returns boolean language sql stable as $$
  select coalesce((select case
      when o.kind in ('attorney_personal', 'firm') then p_side = 'attorney' and dela_firm_role(p_person, o.id) in ('owner', 'manager')
      when o.kind = 'agency' then p_side = 'freelancer' and dela_agency_role(p_person, o.id) in ('owner', 'manager') and dela_switch_on('agency_hiring', o.owner_person_id)
      else false end
    from organizations o where o.id = p_org), false)
$$;
-- The org a person acts for as a client on this side: their attorney org, or the agency they run (their own first)
create or replace function dela_client_org(p_person uuid, p_side text) returns uuid language sql stable as $$
  select case when p_side = 'attorney' then dela_side_org(p_person, 'attorney')
    else (select o.id from organizations o where o.kind = 'agency' and dela_client_role(p_person, 'freelancer', o.id)
            and (o.owner_person_id = p_person or exists (select 1 from org_members m where m.org_id = o.id and m.person_id = p_person and m.status = 'active'))
          order by (o.owner_person_id = p_person) desc, o.created_at limit 1) end
$$;
create or replace function dela_gig_client(p_person uuid, p_side text, p_gig uuid) returns boolean language sql stable as $$
  select coalesce((select dela_client_role(p_person, p_side, g.org_id) from gigs g where g.id = p_gig), false)
$$;
create or replace function dela_agreement_is_client(p_person uuid, p_agreement uuid) returns boolean language sql stable as $$
  select coalesce((select dela_client_role(p_person, 'attorney', a.attorney_org) or dela_client_role(p_person, 'freelancer', a.attorney_org) from agreements a where a.id = p_agreement), false)
$$;
create or replace function dela_client_noun(p_org uuid) returns text language sql stable as $$
  select case when dela_is_agency(p_org) then 'The agency' else 'The attorney' end
$$;
-- The name freelancers see for whoever posted a gig
create or replace function dela_gig_poster(p_org uuid, p_creator uuid) returns text language sql stable as $$
  select case when o.kind = 'agency' then coalesce(nullif(o.business_name, ''), o.name)
    else (select coalesce(nullif(mp.body->>'firm_name', ''), o.name) from member_profiles mp where mp.person_id = p_creator and mp.side = 'attorney' union all select o.name limit 1) end
  from organizations o where o.id = p_org
$$;

-- Can this person post gigs and pay for this org? Attorneys: their verification and firm details, as before.
-- Agencies: an active agency (Freelancer Business), the switch, the owner verified, the business check done, and for
-- paying the client details (billing address, signatory and service email in the agency's firm profile).
create or replace function dela_client_eligibility(p_person uuid, p_org uuid) returns jsonb language plpgsql stable as $$
declare o organizations; f firm_profiles; v_missing text[] := '{}'; v_why text[] := '{}'; s jsonb;
begin
  select * into o from organizations where id = p_org;
  if o.id is null or o.kind <> 'agency' then return dela_attorney_eligibility(p_person); end if;
  if not dela_client_role(p_person, 'freelancer', o.id) then return jsonb_build_object('can_post', false, 'can_pay', false, 'reason', 'agency_managers_only', 'needs', '["agency_managers_only"]'::jsonb); end if;
  if not dela_agency_active(o.id) then v_why := v_why || 'agency_inactive'::text; end if;
  s := dela_profile_state(o.owner_person_id, 'freelancer');
  if coalesce(s->>'readiness', '') not in ('match_ready', 'availability_stale', 'unavailable') then v_why := v_why || 'owner_not_verified'::text; end if;
  if coalesce((dela_setting('agency.post_requires_business_check') #>> '{}')::boolean, true) and o.business_checked_at is null then v_why := v_why || 'business_check_needed'::text; end if;
  select * into f from firm_profiles where org_id = o.id;
  if coalesce(f.body->>'billing_address', '') = '' then v_missing := v_missing || 'billing_address'::text; end if;
  if coalesce(f.body->>'signatory_name', '') = '' then v_missing := v_missing || 'signatory'::text; end if;
  if coalesce(f.body->>'service_email', '') = '' then v_missing := v_missing || 'service_email'::text; end if;
  return jsonb_build_object('can_post', cardinality(v_why) = 0, 'can_pay', cardinality(v_why) = 0 and cardinality(v_missing) = 0, 'agency', true,
    'needs', to_jsonb(v_why), 'missing_for_paid_work', to_jsonb(v_missing), 'readiness', s->>'readiness', 'verification', s->>'verification');
end $$;

-- An agency's client details (who signs and where notices go), kept in its firm profile like an attorney firm's
create or replace function dela_agency_client_save(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_org uuid := dela_client_org(p_person, 'freelancer');
begin
  if v_org is null or dela_agency_role(p_person, v_org) <> 'owner' then return jsonb_build_object('ok', false, 'reason', 'agency_owner_only'); end if;
  if length(btrim(coalesce(p->>'signatory_name', ''))) < 2 or length(btrim(coalesce(p->>'billing_address', ''))) < 5 then return jsonb_build_object('ok', false, 'reason', 'client_details_needed'); end if;
  if coalesce(p->>'service_email', '') !~ '^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$' then return jsonb_build_object('ok', false, 'reason', 'bad_email'); end if;
  insert into firm_profiles (org_id, body, updated_by) values (v_org, '{}'::jsonb, p_person) on conflict (org_id) do nothing;
  update firm_profiles set body = body || jsonb_build_object('signatory_name', left(btrim(p->>'signatory_name'), 120), 'billing_address', left(btrim(p->>'billing_address'), 300),
      'service_email', lower(btrim(p->>'service_email'))), updated_by = p_person, updated_at = now() where org_id = v_org;
  perform dela_audit('member', p_person, 'agency_client_details_saved', 'organization', v_org::text, '{}');
  return jsonb_build_object('ok', true, 'eligibility', dela_client_eligibility(p_person, v_org));
end $$;
create or replace function dela_agency_client(p_person uuid) returns jsonb language plpgsql stable as $$
declare v_org uuid := dela_client_org(p_person, 'freelancer'); f firm_profiles; o organizations;
begin
  if v_org is null then return null; end if;
  select * into o from organizations where id = v_org;
  select * into f from firm_profiles where org_id = v_org;
  return jsonb_build_object('org_id', v_org, 'name', coalesce(nullif(o.business_name, ''), o.name), 'role', dela_agency_role(p_person, v_org),
    'details', jsonb_build_object('signatory_name', coalesce(f.body->>'signatory_name', ''), 'billing_address', coalesce(f.body->>'billing_address', ''), 'service_email', coalesce(f.body->>'service_email', '')),
    'eligibility', dela_client_eligibility(p_person, v_org));
end $$;

-- Notices for a client go to the side they act on: an agency owner has no attorney side
create or replace function dela_notify_side(p_person uuid, p_side text) returns text language sql stable as $$
  select case when p_side = 'attorney' and not exists (select 1 from side_profiles s where s.person_id = p_person and s.side = 'attorney' and s.status <> 'closed')
      and exists (select 1 from side_profiles s where s.person_id = p_person and s.side = 'freelancer' and s.status <> 'closed') then 'freelancer' else p_side end
$$;

-- ---------- Patches (each stops if the function changed since it was read) ----------
create or replace function dela_patch(p_sig text, p_pairs text[]) returns void language plpgsql as $$
declare v_src text; v_new text; i int;
begin
  select pg_get_functiondef(p_sig::regprocedure) into v_src;
  v_new := v_src;
  for i in 1 .. array_length(p_pairs, 1) / 2 loop
    if position(p_pairs[i * 2] in v_new) > 0 and position(p_pairs[i * 2 - 1] in v_new) = 0 then continue; end if; -- already applied
    if position(p_pairs[i * 2 - 1] in v_new) = 0 then raise exception '% changed; update 0045 (looking for: %)', p_sig, left(p_pairs[i * 2 - 1], 80); end if;
    v_new := replace(v_new, p_pairs[i * 2 - 1], p_pairs[i * 2]);
  end loop;
  if v_new <> v_src then execute v_new; end if;
end $$;

do $$ begin
  -- Notices: the side an agency owner reads
  perform dela_patch('dela_notify(jsonb)', array[
    'values (v_person, p->>''side'', coalesce(p->>''kind'', ''general''), ''in_app''', 'values (v_person, dela_notify_side(v_person, p->>''side''), coalesce(p->>''kind'', ''general''), ''in_app''',
    'values (v_person, p->>''side'', coalesce(p->>''kind'', ''general''), ''email''', 'values (v_person, dela_notify_side(v_person, p->>''side''), coalesce(p->>''kind'', ''general''), ''email''']);

  -- The Library: agencies get one, the owner as administrator and managers as editors
  perform dela_patch('dela_pb_role(uuid,uuid)', array[
    '    else (select r.role', '    when o.kind = ''agency'' then case when dela_agency_role(p_person, o.id) = ''manager'' then ''editor'' end
    else (select r.role',
    'from organizations o where o.id = p_org and o.kind in (''attorney_personal'', ''firm'')', 'from organizations o where o.id = p_org and (o.kind in (''attorney_personal'', ''firm'') or (o.kind = ''agency'' and dela_switch_on(''agency_hiring'', o.owner_person_id)))']);
  perform dela_patch('dela_pb_limit(uuid)', array[
    'select case when not coalesce(pf.enabled, true) then 0 else pf.quota_limit end', 'select case when o.kind = ''agency'' then nullif(dela_int_setting(''agency.playbooks_saved'', 0), 0) when not coalesce(pf.enabled, true) then 0 else pf.quota_limit end']);
  perform dela_patch('dela_pb_export(uuid,uuid,text,text)', array[
    'dela_quota_reserve(p_person, ''attorney'', ''exports''', 'dela_quota_reserve(p_person, case when dela_is_agency(dela_pb_org(p_id)) then ''freelancer'' else ''attorney'' end, ''exports''']);
  perform dela_patch('dela_doc_image_open(uuid,text,uuid,uuid)', array[
    'if p_side = ''attorney'' and dela_pb_role(p_person, di.org_id) is not null then v_ok := true; end if;', 'if (p_side = ''attorney'' or dela_is_agency(di.org_id)) and dela_pb_role(p_person, di.org_id) is not null then v_ok := true; end if;',
    'if p_side = ''attorney'' and dela_gig_manager(p_person, g.id) then v_ok := true;', 'if dela_gig_client(p_person, p_side, g.id) then v_ok := true;']);

  -- Gigs: client rights, the agency allowance, who may be hired, and the poster's name
  perform dela_patch('dela_gig_publish(uuid,uuid)', array[
    '  e := dela_attorney_eligibility(p_person);', '  e := dela_client_eligibility(p_person, g.org_id);',
    'return jsonb_build_object(''ok'', false, ''reason'', ''not_verified'', ''readiness'', e->>''readiness'');', 'return jsonb_build_object(''ok'', false, ''reason'', case when coalesce((e->>''agency'')::boolean, false) then ''agency_not_ready'' else ''not_verified'' end, ''readiness'', e->>''readiness'', ''needs'', e->''needs'');',
    '  q := dela_quota_reserve(p_person, ''attorney'', ''att.gigs_active'', 1, ''gigpost:'' || g.id::text, g.id::text);
  if not coalesce((q->>''ok'')::boolean, false) then return q; end if;
  perform dela_quota_finish((q->>''reservation_id'')::uuid, true);',
    '  if dela_is_agency(g.org_id) then
    if nullif(dela_int_setting(''agency.gigs_active'', 0), 0) is not null and (select count(*) from gigs x where x.org_id = g.org_id and x.status in (''open'', ''paused'')) >= dela_int_setting(''agency.gigs_active'', 0) then
      return jsonb_build_object(''ok'', false, ''reason'', ''limit_reached'', ''limit'', dela_int_setting(''agency.gigs_active'', 0));
    end if;
    q := jsonb_build_object(''ok'', true);
  else
  q := dela_quota_reserve(p_person, ''attorney'', ''att.gigs_active'', 1, ''gigpost:'' || g.id::text, g.id::text);
  if not coalesce((q->>''ok'')::boolean, false) then return q; end if;
  perform dela_quota_finish((q->>''reservation_id'')::uuid, true);
  end if;']);
  perform dela_patch('dela_gig_finish(uuid,text,text,text,uuid)', array[
    '  if g.status <> ''draft'' then
    perform dela_quota_return', '  if g.status <> ''draft'' and g.reservation_id is not null then
    perform dela_quota_return',
    '''title'', case when p_status = ''filled'' then ''The attorney chose another proposal''', '''title'', case when p_status = ''filled'' then dela_client_noun(g.org_id) || '' chose another proposal''',
    '''". The attorney chose another freelancer this time.', '''". '' || dela_client_noun(g.org_id) || '' chose another freelancer this time.',
    '''" has closed. The attorney can still choose', '''" has closed. '' || dela_client_noun(g.org_id) || '' can still choose']);
  perform dela_patch('dela_gig_get(uuid,text,uuid)', array[
    '  v_mgr := p_side = ''attorney'' and dela_gig_manager(p_person, p_gig);', '  v_mgr := dela_gig_client(p_person, p_side, p_gig);',
    '''firm'', (select coalesce(nullif(mp.body->>''firm_name'', ''''), o.name) from organizations o left join member_profiles mp on mp.person_id = g.created_by and mp.side = ''attorney'' where o.id = g.org_id),',
    '''firm'', dela_gig_poster(g.org_id, g.created_by), ''client_kind'', case when dela_is_agency(g.org_id) then ''agency'' else ''attorney'' end,']);
  perform dela_patch('dela_gig_references(uuid,text,uuid)', array[
    '(p_side = ''attorney'' and dela_gig_manager(p_person, p_gig))', 'dela_gig_client(p_person, p_side, p_gig)']);
  perform dela_patch('dela_gig_file_get(uuid,text,uuid,uuid)', array[
    '(p_side = ''attorney'' and dela_gig_manager(p_person, p_gig))', 'dela_gig_client(p_person, p_side, p_gig)',
    '  if p_side = ''freelancer'' and gf.expires_at <= now()', '  if p_side = ''freelancer'' and not dela_gig_client(p_person, p_side, p_gig) and gf.expires_at <= now()']);
  perform dela_patch('dela_freelancer_eligible(uuid,uuid)', array[
    '  if p_person = g.created_by then return ''own_gig''; end if;', '  if p_person = g.created_by then return ''own_gig''; end if;
  if exists (select 1 from organizations o where o.id = g.org_id and o.kind = ''agency'' and (o.owner_person_id = p_person
      or exists (select 1 from org_members m where m.org_id = o.id and m.person_id = p_person and m.status = ''active''))) then return ''own_gig''; end if;']);
  perform dela_patch('dela_gig_match_refresh(uuid)', array[
    'and sp.person_id <> g.created_by and not dela_has_hold(sp.person_id)', 'and sp.person_id <> g.created_by and not dela_has_hold(sp.person_id)
      and not exists (select 1 from organizations ao where ao.id = g.org_id and ao.kind = ''agency'' and (ao.owner_person_id = sp.person_id
        or exists (select 1 from org_members am where am.org_id = ao.id and am.person_id = sp.person_id and am.status = ''active'')))']);
  perform dela_patch('dela_gig_invite_notify(uuid)', array[
    '''title'', ''An attorney invited you to a gig''', '''title'', case when dela_is_agency(g.org_id) then dela_gig_poster(g.org_id, g.created_by) || '' (an agency) invited you to a gig'' else ''An attorney invited you to a gig'' end']);
  perform dela_patch('dela_proposal_select(uuid,uuid)', array[
    'if not coalesce((dela_attorney_eligibility(p_person)->>''can_post'')::boolean, false)', 'if not coalesce((dela_client_eligibility(p_person, g.org_id)->>''can_post'')::boolean, false)',
    '''The attorney chose your proposal for "''', 'dela_client_noun(g.org_id) || '' chose your proposal for "''']);

  -- Agreements: the client role, fees on a bench hire, signing, paying, accepting and notices
  perform dela_patch('dela_agreement_role(uuid,text,uuid)', array[
    'when p_side = ''attorney'' and dela_firm_role(p_person, a.attorney_org) in (''owner'', ''manager'') then ''attorney''', 'when dela_client_role(p_person, p_side, a.attorney_org) then ''attorney''']);
  perform dela_patch('dela_agreement_facts(uuid,text,uuid)', array[
    '''firm'', coalesce(nullif(ma.body->>''firm_name'', ''''), (select name from organizations where id = a.attorney_org))',
    '''firm'', case when dela_is_agency(a.attorney_org) then (select coalesce(nullif(business_name, ''''), name) from organizations where id = a.attorney_org) else coalesce(nullif(ma.body->>''firm_name'', ''''), (select name from organizations where id = a.attorney_org)) end, ''kind'', case when dela_is_agency(a.attorney_org) then ''agency'' else ''attorney'' end',
    '''fees'', jsonb_build_object(''attorney_bps'', dela_plan_fee_bps(a.attorney_person, ''attorney''), ''freelancer_bps'', dela_plan_fee_bps(a.freelancer_person, ''freelancer''),',
    '''fees'', jsonb_build_object(''attorney_bps'', dela_plan_fee_bps(a.attorney_person, ''attorney'') + case when dela_bench_hire(a.id) then dela_plan_fee_bps(a.freelancer_person, ''freelancer'') else 0 end,
      ''freelancer_bps'', case when dela_bench_hire(a.id) then 0 else dela_plan_fee_bps(a.freelancer_person, ''freelancer'') end, ''bench_waiver'', dela_bench_hire(a.id),']);
  perform dela_patch('dela_agreement_sign(uuid,text,uuid,jsonb)', array[
    'if v_role = ''attorney'' and not coalesce((dela_attorney_eligibility(p_person)->>''can_pay'')::boolean, false) then return jsonb_build_object(''ok'', false, ''reason'', ''firm_details_missing'', ''eligibility'', dela_attorney_eligibility(p_person)); end if;',
    'if v_role = ''attorney'' and not coalesce((dela_client_eligibility(p_person, a.attorney_org)->>''can_pay'')::boolean, false) then return jsonb_build_object(''ok'', false, ''reason'', case when dela_is_agency(a.attorney_org) then ''agency_details_missing'' else ''firm_details_missing'' end, ''eligibility'', dela_client_eligibility(p_person, a.attorney_org)); end if;',
    '  v_flfee := least(greatest(round(v_total * (av.body->''fees''->>''freelancer_bps'')::int / 10000.0)::int, (av.body->''fees''->>''floor_cents'')::int), v_total);',
    '  v_flfee := case when coalesce((av.body->''fees''->>''bench_waiver'')::boolean, false) then 0 else least(greatest(round(v_total * (av.body->''fees''->>''freelancer_bps'')::int / 10000.0)::int, (av.body->''fees''->>''floor_cents'')::int), v_total) end;',
    '''The attorney pays the first milestone and the platform fee;', ''''' || dela_client_noun(a.attorney_org) || '' pays the first milestone and the platform fee;']);
  perform dela_patch('dela_payment_next(uuid,text,uuid)', array[
    '''agreement_id'', a.id, ''attorney_person'', a.attorney_person);', '''agreement_id'', a.id, ''attorney_person'', a.attorney_person, ''payer_side'', case when dela_is_agency(a.attorney_org) then ''freelancer'' else ''attorney'' end);']);
  perform dela_patch('dela_milestone_decide(uuid,uuid,boolean,text)', array[
    'if dela_agreement_role(p_person, ''attorney'', m.agreement_id) <> ''attorney'' then', 'if not dela_agreement_is_client(p_person, m.agreement_id) then']);
  perform dela_patch('dela_engagement_notify(uuid,text,text,text,text,boolean)', array[
    'then ''freelancer'' else ''attorney'' end, ''kind'', ''engagement''', 'then ''freelancer'' when dela_is_agency(a.attorney_org) then ''freelancer'' else ''attorney'' end, ''kind'', ''engagement''']);
end $$;

create or replace function dela_agreement_client_is_agency(p_agreement uuid) returns boolean language sql stable as $$
  select coalesce((select dela_is_agency(attorney_org) from agreements where id = p_agreement), false)
$$;
-- A bench hire on an agency's own gig: the agency pays the freelancer-side fee too
create or replace function dela_bench_hire(p_agreement uuid) returns boolean language sql stable as $$
  select coalesce((select dela_is_agency(a.attorney_org) and coalesce((dela_setting('agency.bench_fee_waiver') #>> '{}')::boolean, true)
      and exists (select 1 from agency_bench b where b.org_id = a.attorney_org and b.freelancer_person = a.freelancer_person and b.status = 'active')
    from agreements a where a.id = p_agreement), false)
$$;

-- ---------- The agency's Projects, Library and firm profile ----------
-- Gigs and documents for whoever acts as the client on this side (attorneys unchanged; agencies see their agency's)
create or replace function dela_gigs_mine_side(p_person uuid, p_side text) returns jsonb language plpgsql as $$
declare v_org uuid; r jsonb; due record;
begin
  if p_side = 'attorney' then return dela_gigs_mine(p_person); end if;
  v_org := dela_client_org(p_person, 'freelancer');
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'clients_only'); end if;
  for due in select id from gigs where org_id = v_org and status in ('open', 'paused') and closes_at <= now() loop perform dela_gig_close_if_due(due.id); end loop;
  return jsonb_build_object('ok', true, 'agency', true, 'eligibility', dela_client_eligibility(p_person, v_org),
    'allowance', jsonb_build_object('key', 'agency.gigs_active', 'limit', nullif(dela_int_setting('agency.gigs_active', 0), 0), 'unlimited', nullif(dela_int_setting('agency.gigs_active', 0), 0) is null,
      'used', (select count(*) from gigs where org_id = v_org and status in ('open', 'paused'))),
    'min_budget_cents', dela_int_setting('gig.min_budget_cents', 25000),
    'gigs', (select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'title', g.title, 'status', g.status, 'budget_min_cents', g.budget_min_cents, 'budget_max_cents', g.budget_max_cents,
        'deadline', g.deadline, 'closes_at', g.closes_at, 'closed_at', g.closed_at, 'paused_by_team', g.paused_by_team,
        'proposals', (select count(*) from proposals p where p.gig_id = g.id and p.status in ('sent', 'selected', 'not_selected')),
        'questions_open', (select count(*) from gig_questions q where q.gig_id = g.id and q.status = 'open')) order by g.created_at desc), '[]')
      from gigs g where g.org_id = v_org and g.status <> 'canceled'),
    'playbooks', (select coalesce(jsonb_agg(jsonb_build_object('id', pb.id, 'title', pb.title, 'practice_area', pb.practice_area, 'doc_type', pb.doc_type, 'doc_id', pb.doc_id,
        'images', coalesce((select dela_doc_image_count(v.body) from playbook_versions v where v.playbook_id = pb.id and v.version = pb.approved_version), 0)) order by pb.title), '[]')
      from playbooks pb where pb.org_id = v_org and pb.status = 'approved' and coalesce(pb.doc_type, '') not in ('policy', 'playbook')));
end $$;
create or replace function dela_pb_libraries_side(p_person uuid, p_side text) returns jsonb language plpgsql stable as $$
declare v_org uuid;
begin
  if p_side = 'attorney' then return dela_pb_libraries(p_person); end if;
  v_org := dela_client_org(p_person, 'freelancer');
  if v_org is null or dela_pb_role(p_person, v_org) is null then return '[]'::jsonb; end if;
  return (select jsonb_build_array(jsonb_build_object('org_id', o.id, 'name', coalesce(nullif(o.business_name, ''), o.name), 'role', dela_pb_role(p_person, o.id), 'mine', o.owner_person_id = p_person))
    from organizations o where o.id = v_org);
end $$;
-- The document standard's firm profile for the side (for an agency: its roles; no attorney role is needed)
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_doc_firm(uuid)'::regprocedure) into v_src;
  v_new := replace(replace(replace(v_src, 'public.dela_doc_firm(p_person uuid)', 'public.dela_doc_firm_side(p_person uuid, p_side text)'),
    'v_org uuid := dela_side_org(p_person, ''attorney'')', 'v_org uuid := dela_client_org(p_person, p_side)'),
    'and side = ''attorney'';', 'and side = p_side;');
  if position('dela_doc_firm_side' in v_new) = 0 or position('dela_client_org(p_person, p_side)' in v_new) = 0 then raise exception 'dela_doc_firm changed; update 0045'; end if;
  execute v_new;
  select pg_get_functiondef('dela_doc_firm_save(uuid,jsonb)'::regprocedure) into v_src;
  v_new := replace(replace(replace(v_src, 'public.dela_doc_firm_save(p_person uuid, p jsonb)', 'public.dela_doc_firm_save_side(p_person uuid, p_side text, p jsonb)'),
    'v_org uuid := dela_side_org(p_person, ''attorney'')', 'v_org uuid := dela_client_org(p_person, p_side)'),
    'if not exists (select 1 from jsonb_array_elements(v_roles) x where x->>''kind'' = ''attorney'')', 'if not dela_is_agency(v_org) and not exists (select 1 from jsonb_array_elements(v_roles) x where x->>''kind'' = ''attorney'')');
  if position('dela_doc_firm_save_side' in v_new) = 0 or position('not dela_is_agency(v_org)' in v_new) = 0 then raise exception 'dela_doc_firm_save changed; update 0045'; end if;
  execute v_new;
end $$;

-- The agency's bench, to invite first to one of its gigs
create or replace function dela_gig_bench_for(p_person uuid, p_gig uuid) returns jsonb language sql stable as $$
  select case when not dela_gig_client(p_person, 'freelancer', p_gig) then jsonb_build_object('ok', false, 'reason', 'not_found') else
    jsonb_build_object('ok', true, 'bench', (select coalesce(jsonb_agg(jsonb_build_object('person_id', b.freelancer_person, 'name', dela_freelancer_name(b.freelancer_person),
        'invited', exists (select 1 from gig_invitations i where i.gig_id = g.id and i.freelancer_id = b.freelancer_person),
        'eligible', dela_freelancer_eligible(b.freelancer_person, g.id) = '', 'why', dela_freelancer_eligible(b.freelancer_person, g.id)) order by dela_freelancer_name(b.freelancer_person)), '[]')
      from agency_bench b where b.org_id = g.org_id and b.status = 'active')) end
  from gigs g where g.id = p_gig
$$;

drop function if exists dela_patch(text, text[]);

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('dela_is_agency', 'dela_client_role', 'dela_client_org', 'dela_gig_client', 'dela_agreement_is_client', 'dela_client_noun',
             'dela_gig_poster', 'dela_client_eligibility', 'dela_agency_client_save', 'dela_agency_client', 'dela_notify_side', 'dela_bench_hire', 'dela_gigs_mine_side',
             'dela_pb_libraries_side', 'dela_doc_firm_side', 'dela_doc_firm_save_side', 'dela_gig_bench_for', 'dela_agreement_client_is_agency') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

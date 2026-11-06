-- Agencies, part 3: subcontracting (docs/briefs/step-7d-agencies.md, Stacey's answers 2 and 3).
-- The proposal and the agreement disclose: "This agency may use vetted subcontractors from Lawfecta to complete this work."
-- The attorney agrees once, by signing; no approval for each person. Before signing, the attorney may choose "No
-- subcontractors on this engagement" (off by default); it is written into a new version both sign, and it blocks bench
-- assignments and linked gigs. An agency posts a gig for part of an attorney engagement as a linked gig: whoever it hires
-- appears on the attorney's "Who's working on this" as the agency's subcontractor, with an information-only notice, and
-- never opens the attorney's area (their work area is the linked gig's own engagement, whose agreement carries the
-- confidentiality and no-poaching terms). The conduct check flags an agency gig that copies an engagement's scope but is
-- not linked to it, for the Lawfecta Team. Switch agency_subcontracting (off until tested). Additive.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('agency.copy_flag_share', '0.6', 'Share of an agency gig''s words found in one of its engagements that flags it as a copy', 'Agencies', 'share', 'O', 'Claude suggestion', 'Only gigs not linked to that engagement are flagged. The flag goes to the Lawfecta Team; the gig still posts.')
on conflict (key) do nothing;

alter table gigs add column if not exists linked_agreement uuid references agreements(id);
create index if not exists gigs_linked_agreement on gigs (linked_agreement) where linked_agreement is not null;
-- conduct_flags already allows object_type gig (0028, 0029)

-- ---------- "No subcontractors on this engagement" (the attorney, before both sign) ----------
create or replace function dela_agreement_subs_set(p_person uuid, p_side text, p_agreement uuid, p_no boolean) returns jsonb language plpgsql as $$
declare a agreements;
begin
  select * into a from agreements where id = p_agreement for update;
  if a.id is null or not dela_client_role(p_person, p_side, a.attorney_org) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if a.agency_org is null then return jsonb_build_object('ok', false, 'reason', 'not_an_agency'); end if;
  if a.status not in ('draft', 'sent', 'signing') then return jsonb_build_object('ok', false, 'reason', 'agreement_signed'); end if;
  if a.no_subcontractors = coalesce(p_no, false) then return jsonb_build_object('ok', true, 'duplicate', true, 'no_subcontractors', a.no_subcontractors); end if;
  if coalesce(p_no, false) and (exists (select 1 from milestone_assignments x where x.agreement_id = a.id and x.status in ('proposed', 'accepted'))
      or exists (select 1 from gigs g where g.linked_agreement = a.id and g.status <> 'canceled')) then
    return jsonb_build_object('ok', false, 'reason', 'subcontractors_in_use');
  end if;
  update agreements set no_subcontractors = coalesce(p_no, false), updated_at = now() where id = a.id;
  perform dela_audit('member', p_person, case when p_no then 'agreement_no_subcontractors' else 'agreement_subcontractors_allowed' end, 'agreement', a.id::text, '{}');
  return jsonb_build_object('ok', true, 'no_subcontractors', coalesce(p_no, false));
end $$;

-- ---------- Linked gigs ----------
-- Checked before DELA drafts the gig (no AI credits spent on a link that would be refused), and again when linking
create or replace function dela_gig_link_check(p_person uuid, p_agreement uuid) returns text language plpgsql stable as $$
declare a agreements;
begin
  select * into a from agreements where id = p_agreement;
  if a.id is null or a.agency_org is null or coalesce(dela_agency_role(p_person, a.agency_org), '') not in ('owner', 'manager') then return 'not_found'; end if;
  if not dela_switch_on('agency_subcontracting', p_person) then return 'subcontracting_off'; end if;
  if a.no_subcontractors then return 'no_subcontractors'; end if;
  if a.status not in ('signing', 'signed', 'active') then return 'agreement_closed'; end if;
  return null;
end $$;
create or replace function dela_gig_link(p_person uuid, p_gig uuid, p_agreement uuid) returns jsonb language plpgsql as $$
declare g gigs; a agreements; v_why text;
begin
  select * into g from gigs where id = p_gig for update;
  select * into a from agreements where id = p_agreement for update;
  if g.id is null or a.id is null or g.org_id is distinct from a.agency_org then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_why := dela_gig_link_check(p_person, p_agreement);
  if v_why is not null then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  if g.linked_agreement = a.id then return jsonb_build_object('ok', true, 'duplicate', true, 'linked_agreement', a.id); end if;
  if g.status <> 'draft' then return jsonb_build_object('ok', false, 'reason', 'gig_already_posted'); end if;
  update gigs set linked_agreement = a.id, updated_at = now() where id = g.id;
  perform dela_audit('member', p_person, 'gig_linked', 'gig', g.id::text, jsonb_build_object('agreement_id', a.id));
  return jsonb_build_object('ok', true, 'linked_agreement', a.id);
end $$;

-- Whoever is hired on a linked gig joins the attorney engagement's "Who's working on this" as the agency's subcontractor
create or replace function dela_linked_hire() returns trigger language plpgsql as $$
declare g gigs; v_title text;
begin
  select * into g from gigs where id = new.gig_id;
  if g.linked_agreement is null or g.org_id <> new.attorney_org then return new; end if;
  if not exists (select 1 from engagement_team t where t.agreement_id = g.linked_agreement and t.person_id = new.freelancer_person and t.removed_at is null) then
    insert into engagement_team (agreement_id, person_id, kind, role_text, added_by) values (g.linked_agreement, new.freelancer_person, 'subcontractor', left(g.title, 80), new.attorney_person);
  end if;
  perform dela_engagement_notify(g.linked_agreement, 'attorney', 'A change in who is working on this job',
    dela_freelancer_name(new.freelancer_person) || ', a verified Lawfecta freelancer, now works on part of this job as the agency''s subcontractor. The agency stays responsible for the work. Nothing is needed from you.',
    'teamsublink:' || new.id::text, false);
  return new;
end $$;
drop trigger if exists agreements_linked_hire on agreements;
create trigger agreements_linked_hire after insert on agreements for each row execute function dela_linked_hire();
create or replace function dela_linked_end() returns trigger language plpgsql as $$
declare g gigs;
begin
  if new.status <> 'canceled' or old.status = 'canceled' then return new; end if;
  select * into g from gigs where id = new.gig_id;
  if g.linked_agreement is null then return new; end if;
  update engagement_team set removed_at = now() where agreement_id = g.linked_agreement and person_id = new.freelancer_person and kind = 'subcontractor' and removed_at is null and role_text = left(g.title, 80);
  return new;
end $$;
drop trigger if exists agreements_linked_end on agreements;
create trigger agreements_linked_end after update of status on agreements for each row execute function dela_linked_end();

-- ---------- The copy flag ----------
create or replace function dela_words(p_text text) returns text[] language sql immutable as $$
  select coalesce(array_agg(distinct w), '{}') from regexp_split_to_table(lower(coalesce(p_text, '')), '[^a-z]+') w where length(w) >= 4
$$;
create or replace function dela_agency_copy_check(p_gig uuid) returns jsonb language plpgsql as $$
declare g gigs; gw text[]; a record; ew text[]; v_share numeric; v_min numeric := coalesce((dela_setting('agency.copy_flag_share') #>> '{}')::numeric, 0.6);
begin
  select * into g from gigs where id = p_gig;
  if g.id is null or not dela_is_agency(g.org_id) or g.linked_agreement is not null or not dela_switch_on('agency_subcontracting', g.created_by) then return jsonb_build_object('ok', true, 'checked', false); end if;
  if exists (select 1 from conduct_flags f where f.object_type = 'gig' and f.object_id = g.id and 'copied_engagement' = any(f.kinds)) then return jsonb_build_object('ok', true, 'flagged', true, 'duplicate', true); end if;
  gw := dela_words(g.title || ' ' || coalesce(g.public->>'title', '') || ' ' || coalesce(g.public->>'task', '') || ' ' || coalesce(g.public->>'outcome', '') || ' ' || coalesce((g.public->'steps')::text, ''));
  if cardinality(gw) < 5 then return jsonb_build_object('ok', true, 'flagged', false); end if;
  for a in select ag.id, eg.title, v.body from agreements ag join gigs eg on eg.id = ag.gig_id
           left join agreement_versions v on v.agreement_id = ag.id and v.version = ag.version
           where ag.agency_org = g.org_id and ag.status in ('signing', 'signed', 'active') loop
    ew := dela_words(a.title || ' ' || coalesce(a.body->'scope'->>'task', '') || ' ' || coalesce(a.body->'scope'->>'outcome', '') || ' ' || coalesce(a.body->'scope'->>'included', ''));
    v_share := (select count(*) from unnest(gw) w where w = any(ew))::numeric / cardinality(gw);
    if v_share >= v_min then
      insert into conduct_flags (object_type, object_id, gig_id, person_id, kinds, excerpt, source)
      values ('gig', g.id, g.id, g.created_by, array['copied_engagement'], left('Gig "' || g.title || '" shares ' || round(v_share * 100) || '% of its words with the engagement "' || a.title || '" but is not linked to it.', 300), 'rules');
      perform dela_alert('conduct', 'An agency gig looks copied from an engagement', 'An agency posted a gig that shares most of its words with one of its attorney engagements, without linking it. Check it in the admin Conduct tab.', 'copyflag:' || g.id::text);
      return jsonb_build_object('ok', true, 'flagged', true, 'share', round(v_share, 2));
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'flagged', false);
end $$;

-- ---------- Patches ----------
create or replace function dela_patch(p_sig text, p_pairs text[]) returns void language plpgsql as $$
declare v_src text; v_new text; i int;
begin
  select pg_get_functiondef(p_sig::regprocedure) into v_src;
  v_new := v_src;
  for i in 1 .. array_length(p_pairs, 1) / 2 loop
    if position(p_pairs[i * 2] in v_new) > 0 and position(p_pairs[i * 2 - 1] in v_new) = 0 then continue; end if;
    if position(p_pairs[i * 2 - 1] in v_new) = 0 then raise exception '% changed; update 0046 (looking for: %)', p_sig, left(p_pairs[i * 2 - 1], 80); end if;
    v_new := replace(v_new, p_pairs[i * 2 - 1], p_pairs[i * 2]);
  end loop;
  if v_new <> v_src then execute v_new; end if;
end $$;
do $$ begin
  perform dela_patch('dela_agreement_facts(uuid,text,uuid)', array[
    '''template_version'', dela_setting_text(''agreement.template_version'', '''')',
    '''subcontracting'', jsonb_build_object(''agency'', a.agency_org is not null, ''no_subcontractors'', a.no_subcontractors), ''template_version'', dela_setting_text(''agreement.template_version'', '''')']);
  perform dela_patch('dela_gig_publish(uuid,uuid)', array[
    '  perform dela_gig_match_refresh(g.id);', '  perform dela_agency_copy_check(g.id);
  perform dela_gig_match_refresh(g.id);']);
  perform dela_patch('dela_gig_get(uuid,text,uuid)', array[
    '''sensitive'', g.sensitive,', '''sensitive'', g.sensitive, ''linked_to'', case when v_mgr and g.linked_agreement is not null then (select jsonb_build_object(''agreement_id'', la.id, ''title'', lg.title) from agreements la join gigs lg on lg.id = la.gig_id where la.id = g.linked_agreement) end,']);
  -- A copy flag on a gig: "Do not deliver" pauses the gig (it is already posted) instead of the message-not-delivered notice
  perform dela_patch('dela_admin_conduct_decide(uuid,uuid,boolean,text)', array[
    '  else
    if f.object_type = ''question''', '  elsif f.object_type = ''gig'' then
    perform dela_admin_gig_pause(p_actor, f.object_id, true, left(coalesce(nullif(p_note, ''''), ''It copies one of the agency''''s engagements but is not linked to it.''), 300));
  else
    if f.object_type = ''question''']);
  -- An agency's gig pause notice reaches the agency on its freelancer side
  perform dela_patch('dela_admin_gig_pause(uuid,uuid,boolean,text)', array[
    '''person_id'', g.created_by, ''side'', ''attorney'', ''kind'', ''gig_paused''', '''person_id'', g.created_by, ''side'', dela_notify_side(g.created_by, ''attorney''), ''kind'', ''gig_paused''']);
  perform dela_patch('dela_gigs_mine_side(uuid,text)', array[
    '''paused_by_team'', g.paused_by_team,', '''paused_by_team'', g.paused_by_team, ''linked_to'', (select lg.title from agreements la join gigs lg on lg.id = la.gig_id where la.id = g.linked_agreement),']);
end $$;
drop function if exists dela_patch(text, text[]);

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('dela_agreement_subs_set', 'dela_gig_link', 'dela_gig_link_check', 'dela_linked_hire', 'dela_linked_end', 'dela_words', 'dela_agency_copy_check') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

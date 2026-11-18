-- Step 35 (Stacey's answers of 2026-11-17): the agency Home, for the main agency account only.
--   org_members.weekly_hours: the hours a week a team member can give the agency. The member or the agency's owner
--     sets it. Not set means not known: nothing works out a capacity from it.
--   dela_agency_hours_set / dela_agency_hours_ask: set the hours; the owner asks a member to set theirs (one notice a day).
--   home_layouts: a third layout, 'agency', for the owner's "My agency" view. Each view keeps its own widgets.
--   dela_home_agency: what clients paid for the agency's jobs, what was paid out to the agency (never a team member's share), the
--     team with jobs and hours, and the agency's jobs with their next milestone. For the agency's owner only: a team
--     member, whatever their role in the agency, gets nothing from it.
-- Additive: three columns, one check widened, functions added or redefined with the same arguments.
alter table org_members add column if not exists weekly_hours int check (weekly_hours is null or weekly_hours between 0 and 80);
alter table org_members add column if not exists hours_set_at timestamptz;
alter table org_members add column if not exists hours_asked_at timestamptz;

alter table home_layouts drop constraint if exists home_layouts_side_check;
alter table home_layouts add constraint home_layouts_side_check check (side in ('attorney', 'freelancer', 'agency'));

-- The active agency this person owns, or null. Owning it is the only thing that opens the agency Home.
create or replace function dela_agency_owned(p_person uuid) returns uuid language sql stable set search_path = public, extensions, pg_temp as $$
  select o.id from organizations o where o.kind = 'agency' and o.owner_person_id = p_person and dela_agency_active(o.id) order by o.created_at limit 1
$$;

create or replace function dela_home_widgets(p_side text) returns text[] language sql immutable set search_path = public, extensions, pg_temp as $$
  select case p_side
    when 'attorney' then array['attention', 'delegating', 'projects', 'talent', 'spend', 'ask', 'bench', 'standing', 'workflow', 'meetings', 'messages', 'usage', 'notifications', 'quick']
    when 'agency' then array['revenue', 'team', 'gigs', 'proposals', 'clients', 'teamattention', 'meetings', 'messages', 'notifications', 'ask', 'usage', 'quick']
    else array['gigs', 'earnings', 'proposals', 'projects', 'attention', 'growth', 'meetings', 'availability', 'reviews', 'ask', 'usage', 'messages', 'notifications', 'standing', 'quick'] end
$$;

create or replace function dela_home_default(p_side text) returns text[] language sql immutable set search_path = public, extensions, pg_temp as $$
  select case p_side
    when 'attorney' then array['attention', 'delegating', 'projects', 'talent', 'spend', 'ask']
    when 'agency' then array['revenue', 'team', 'gigs', 'proposals', 'clients', 'teamattention']
    else array['gigs', 'earnings', 'proposals', 'projects', 'attention', 'growth'] end
$$;

create or replace function dela_home_layout(p_person uuid, p_side text) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_saved jsonb; v_list text[]; v_owned uuid;
begin
  if p_side not in ('attorney', 'freelancer', 'agency') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if p_side <> 'attorney' then v_owned := dela_agency_owned(p_person); end if;
  if p_side = 'agency' and v_owned is null then return jsonb_build_object('ok', false, 'reason', 'agency_owner_only'); end if;
  select widgets into v_saved from home_layouts where person_id = p_person and side = p_side;
  if v_saved is not null then
    select coalesce(array_agg(x.id order by x.n), '{}') into v_list
    from jsonb_array_elements_text(v_saved) with ordinality x(id, n) where x.id = any(dela_home_widgets(p_side));
  end if;
  if v_list is null or coalesce(array_length(v_list, 1), 0) = 0 then v_list := dela_home_default(p_side); v_saved := null; end if;
  return jsonb_build_object('ok', true, 'view', p_side, 'widgets', to_jsonb(v_list), 'customized', v_saved is not null,
    'all', to_jsonb(dela_home_widgets(p_side)), 'default', to_jsonb(dela_home_default(p_side)), 'agency_owner', v_owned is not null);
end $$;

create or replace function dela_home_layout_save(p_person uuid, p_side text, p_widgets jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_list text[] := '{}'; v_id text;
begin
  if p_side not in ('attorney', 'freelancer', 'agency') or jsonb_typeof(p_widgets) is distinct from 'array' or jsonb_array_length(p_widgets) > 30 then
    return jsonb_build_object('ok', false, 'reason', 'bad_request');
  end if;
  if p_side = 'agency' and dela_agency_owned(p_person) is null then return jsonb_build_object('ok', false, 'reason', 'agency_owner_only'); end if;
  for v_id in select x #>> '{}' from jsonb_array_elements(p_widgets) with ordinality t(x, n) where jsonb_typeof(x) = 'string' order by n loop
    if not (v_id = any(dela_home_widgets(p_side))) then return jsonb_build_object('ok', false, 'reason', 'unknown_widget', 'widget', left(v_id, 40)); end if;
    if not (v_id = any(v_list)) then v_list := v_list || v_id; end if;
  end loop;
  if coalesce(array_length(v_list, 1), 0) = 0 then return jsonb_build_object('ok', false, 'reason', 'keep_one_widget'); end if;
  insert into home_layouts (person_id, side, widgets) values (p_person, p_side, to_jsonb(v_list))
  on conflict (person_id, side) do update set widgets = excluded.widgets, updated_at = now();
  perform dela_audit('member', p_person, 'home_layout_saved', 'person', p_person::text, jsonb_build_object('side', p_side, 'widgets', to_jsonb(v_list)));
  return dela_home_layout(p_person, p_side);
end $$;

create or replace function dela_agency_hours_set(p_person uuid, p_member uuid, p_hours int, p_org uuid default null) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_org uuid;
begin
  -- The owner sets anyone's hours in their own agency; a member sets their own, in an agency they belong to
  v_org := dela_agency_owned(p_person);
  if v_org is null or (p_org is not null and p_org <> v_org) or not exists (select 1 from org_members m where m.org_id = v_org and m.person_id = p_member and m.status = 'active') then
    if p_person <> p_member then return jsonb_build_object('ok', false, 'reason', 'agency_owner_only'); end if;
    select m.org_id into v_org from org_members m join organizations o on o.id = m.org_id
    where m.person_id = p_person and m.status = 'active' and o.kind = 'agency' and (p_org is null or o.id = p_org) order by m.effective_from limit 1;
    if v_org is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  end if;
  if p_hours is not null and (p_hours < 0 or p_hours > 80) then return jsonb_build_object('ok', false, 'reason', 'bad_hours'); end if;
  update org_members set weekly_hours = p_hours, hours_set_at = case when p_hours is null then null else now() end where org_id = v_org and person_id = p_member;
  perform dela_audit('member', p_person, 'agency_hours_set', 'person', p_member::text, jsonb_build_object('org', v_org, 'hours', p_hours));
  return jsonb_build_object('ok', true, 'weekly_hours', p_hours);
end $$;

create or replace function dela_agency_hours_ask(p_person uuid, p_member uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_org uuid := dela_agency_owned(p_person); m org_members; v_name text;
begin
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'agency_owner_only'); end if;
  select * into m from org_members where org_id = v_org and person_id = p_member and status = 'active';
  if m.person_id is null or p_member = p_person then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if m.weekly_hours is not null then return jsonb_build_object('ok', false, 'reason', 'hours_already_set'); end if;
  if m.hours_asked_at is not null and m.hours_asked_at > now() - interval '24 hours' then return jsonb_build_object('ok', false, 'reason', 'asked_recently', 'asked_at', m.hours_asked_at); end if;
  select coalesce(nullif(business_name, ''), name) into v_name from organizations where id = v_org;
  update org_members set hours_asked_at = now() where org_id = v_org and person_id = p_member;
  perform dela_notify(jsonb_build_object('person_id', p_member, 'side', 'freelancer', 'kind', 'agency', 'email', true,
    'title', v_name || ' asks for your weekly hours',
    'body', 'Say how many hours a week you can give ' || v_name || ', so work can be planned. Open the Agency page and fill in "Hours a week" in your row of the team list.',
    'link', '/dela?tab=agency', 'dedupe_key', 'agencyhours:' || v_org || ':' || p_member || ':' || to_char(now(), 'YYYY-MM-DD')));
  perform dela_audit('member', p_person, 'agency_hours_asked', 'person', p_member::text, jsonb_build_object('org', v_org));
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_home_agency(p_person uuid, p_period text) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_org uuid := dela_agency_owned(p_person); v_from timestamptz; v_period text := case when p_period in ('month', 'quarter', 'year') then p_period else 'month' end;
  v_clients bigint; v_out bigint; v_wait bigint; v_months jsonb; v_people jsonb; v_jobs jsonb; v_name text;
begin
  -- Agency money and the whole team's work are the owner's to see. Everyone else gets no figures at all.
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'agency_owner_only'); end if;
  v_from := dela_home_period_start(v_period);
  select coalesce(nullif(business_name, ''), name) into v_name from organizations where id = v_org;
  select coalesce(sum(p.amount_cents - p.fee_cents), 0) into v_clients
  from payments p join agreements a on a.id = p.agreement_id where a.agency_org = v_org and p.status = 'succeeded' and p.updated_at >= v_from;
  select coalesce(sum(po.amount_cents) filter (where po.person_id = p_person and po.status = 'sent' and po.updated_at >= v_from), 0),
         coalesce(sum(po.amount_cents) filter (where po.person_id = p_person and po.status in ('pending', 'held')), 0)
    into v_out, v_wait
  from payouts po join agreements a on a.id = po.agreement_id where a.agency_org = v_org;
  select coalesce(jsonb_agg(jsonb_build_object('month', to_char(g.m, 'YYYY-MM'), 'label', to_char(g.m, 'Mon'),
      'clients_cents', (select coalesce(sum(p.amount_cents - p.fee_cents), 0) from payments p join agreements a on a.id = p.agreement_id
        where a.agency_org = v_org and p.status = 'succeeded' and date_trunc('month', p.updated_at) = g.m),
      'agency_cents', (select coalesce(sum(po.amount_cents), 0) from payouts po join agreements a on a.id = po.agreement_id
        where a.agency_org = v_org and po.person_id = p_person and po.status = 'sent' and date_trunc('month', po.updated_at) = g.m)) order by g.m), '[]')
    into v_months from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') g(m);
  select coalesce(jsonb_agg(jsonb_build_object('person_id', pe.id, 'name', dela_freelancer_name(pe.id), 'owner', pe.id = p_person,
      'weekly_hours', m.weekly_hours, 'hours_set_at', m.hours_set_at, 'hours_asked_at', m.hours_asked_at,
      'jobs', (select count(*)::int from engagement_team t join agreements a on a.id = t.agreement_id
        where t.person_id = pe.id and t.removed_at is null and a.agency_org = v_org and a.signed_at is not null and a.completed_at is null and a.canceled_at is null))
      order by (pe.id = p_person) desc, dela_freelancer_name(pe.id)), '[]')
    into v_people from org_members m join people pe on pe.id = m.person_id where m.org_id = v_org and m.status = 'active';
  select coalesce(jsonb_agg(j order by (j->>'due_date') nulls last, j->>'title'), '[]') into v_jobs from (
    select jsonb_build_object('agreement_id', a.id, 'gig_id', a.gig_id, 'title', g.title,
      'client', (select coalesce(nullif(co.business_name, ''), co.name) from organizations co where co.id = a.attorney_org),
      'people', (select coalesce(jsonb_agg(dela_freelancer_name(t.person_id) order by 1), '[]') from engagement_team t where t.agreement_id = a.id and t.removed_at is null and t.kind = 'team'),
      'milestones', (select count(*)::int from milestones x where x.agreement_id = a.id and x.status <> 'canceled'),
      'accepted', (select count(*)::int from milestones x where x.agreement_id = a.id and x.status = 'accepted'),
      'next_seq', nx.seq, 'next_title', nx.title, 'due_date', nx.due_date, 'next_status', nx.status,
      'overdue', nx.due_date is not null and nx.due_date < current_date and nx.status in ('funded', 'in_progress', 'changes_requested')) j
    from agreements a join gigs g on g.id = a.gig_id
    left join lateral (select x.seq, x.title, x.due_date, x.status from milestones x where x.agreement_id = a.id and x.status not in ('accepted', 'refunded', 'canceled') order by x.seq limit 1) nx on true
    where a.agency_org = v_org and a.signed_at is not null and a.completed_at is null and a.canceled_at is null and a.status <> 'canceled') q;
  return jsonb_build_object('ok', true, 'agency', v_name, 'period', v_period, 'from', v_from,
    'paid_by_clients_cents', v_clients, 'paid_out_agency_cents', v_out, 'waiting_agency_cents', v_wait,
    'months', v_months, 'team', v_people, 'jobs', v_jobs);
end $$;

-- The Agency page shows each member's weekly hours to the owner and to that member only
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_agency_view(uuid)'::regprocedure) into v_src;
  if position('weekly_hours' in v_src) > 0 then return; end if;
  v_new := replace(v_src, '''jobs'', (select count(*) from engagement_team t join agreements a on a.id = t.agreement_id where t.person_id = pe.id',
    '''weekly_hours'', case when v_role = ''owner'' or pe.id = p_person then m.weekly_hours end, ''hours_asked_at'', case when v_role = ''owner'' then m.hours_asked_at end, ''jobs'', (select count(*) from engagement_team t join agreements a on a.id = t.agreement_id where t.person_id = pe.id');
  if v_new = v_src then raise exception 'dela_agency_view changed; update 0131'; end if;
  v_src := v_new;
  -- A member sees and sets their own hours where the agencies they belong to are listed
  v_new := replace(v_src, '''role'', m.member_role, ''active'', dela_agency_active(ao.id))', '''role'', m.member_role, ''active'', dela_agency_active(ao.id), ''weekly_hours'', m.weekly_hours)');
  if v_new = v_src then raise exception 'dela_agency_view memberships changed; update 0131'; end if;
  execute v_new;
end $$;

do $$ declare f text; begin
  foreach f in array array['dela_agency_owned(uuid)', 'dela_home_widgets(text)', 'dela_home_default(text)', 'dela_home_layout(uuid,text)', 'dela_home_layout_save(uuid,text,jsonb)',
      'dela_agency_hours_set(uuid,uuid,int,uuid)', 'dela_agency_hours_ask(uuid,uuid)', 'dela_home_agency(uuid,text)', 'dela_agency_view(uuid)'] loop
    execute 'revoke all on function ' || f || ' from public, anon, authenticated';
  end loop;
end $$;

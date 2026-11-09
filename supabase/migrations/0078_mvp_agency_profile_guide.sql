-- MVP 2026-11-09 (Stacey: "help agencies build profile", "learn about the law firm and onboard intelligently").
-- 1. Agencies get their own profile (what attorneys see about the agency), with DELA's drafting help in the api.
-- 2. The DELA guide asks a new firm about itself first (the firm profile DELA uses in every document), and walks an
--    agency owner to the agency profile. Additive: a new table and functions; dela_guide_state is patched in place (checked).

create table if not exists agency_profiles (
  org_id uuid primary key references organizations(id),
  body jsonb not null default '{}',
  missing text[] not null default '{}',
  score int not null default 0 check (score between 0 and 100),
  updated_by uuid references people(id),
  updated_at timestamptz not null default now()
);
alter table agency_profiles enable row level security;

-- The agency a person runs (owner or manager), or null
create or replace function dela_agency_profile_org(p_person uuid) returns uuid language sql stable as $$
  select o.id from organizations o where o.kind = 'agency' and o.id = dela_side_org(p_person, 'freelancer')
    and dela_agency_role(p_person, o.id) in ('owner', 'manager')
  union all
  select o.id from organizations o join org_members m on m.org_id = o.id and m.person_id = p_person and m.status = 'active' and m.member_role = 'manager'
    where o.kind = 'agency'
  limit 1
$$;

create or replace function dela_agency_profile_missing(b jsonb) returns text[] language sql immutable as $$
  select array_remove(array[
    case when length(btrim(coalesce(b->>'headline', ''))) < 10 then 'headline' end,
    case when length(btrim(coalesce(b->>'summary', ''))) < 60 then 'summary' end,
    case when jsonb_array_length(coalesce(b->'practice_areas', '[]')) = 0 then 'practice_areas' end,
    case when jsonb_array_length(coalesce(b->'services', '[]')) = 0 then 'services' end,
    case when jsonb_array_length(coalesce(b->'states_served', '[]')) = 0 then 'states_served' end], null)
$$;

create or replace function dela_agency_profile_get(p_person uuid) returns jsonb language plpgsql stable as $$
declare v_org uuid := dela_agency_profile_org(p_person); o organizations; ap agency_profiles;
begin
  if not dela_switch_on('agency_team', p_person) then return jsonb_build_object('ok', false, 'reason', 'agency_off'); end if;
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'agency_owner_only'); end if;
  select * into o from organizations where id = v_org;
  select * into ap from agency_profiles where org_id = v_org;
  return jsonb_build_object('ok', true, 'org_id', v_org, 'name', coalesce(nullif(o.business_name, ''), o.name),
    'body', coalesce(ap.body, '{}'), 'missing', to_jsonb(coalesce(ap.missing, dela_agency_profile_missing('{}'))), 'score', coalesce(ap.score, 0),
    'team_size', (select count(*) from org_members m where m.org_id = v_org and m.status = 'active'),
    'bench_size', (select count(*) from agency_bench b where b.org_id = v_org and b.status = 'active'),
    'role', dela_agency_role(p_person, v_org), 'updated_at', ap.updated_at);
end $$;

-- Saves only known fields, each cleaned and capped; team and bench sizes are counted, never typed
create or replace function dela_agency_profile_save(p_person uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_org uuid := dela_agency_profile_org(p_person); b jsonb; v_missing text[];
begin
  if not dela_switch_on('agency_team', p_person) then return jsonb_build_object('ok', false, 'reason', 'agency_off'); end if;
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'agency_owner_only'); end if;
  b := jsonb_build_object(
    'headline', left(btrim(coalesce(p->>'headline', '')), 160),
    'summary', left(btrim(coalesce(p->>'summary', '')), 2000),
    'practice_areas', (select coalesce(jsonb_agg(left(btrim(x), 80)) filter (where btrim(x) <> ''), '[]') from (select jsonb_array_elements_text(case when jsonb_typeof(p->'practice_areas') = 'array' then p->'practice_areas' else '[]' end) x limit 12) t),
    'tools', (select coalesce(jsonb_agg(left(btrim(x), 60)) filter (where btrim(x) <> ''), '[]') from (select jsonb_array_elements_text(case when jsonb_typeof(p->'tools') = 'array' then p->'tools' else '[]' end) x limit 20) t),
    'states_served', (select coalesce(jsonb_agg(distinct upper(btrim(x))) filter (where upper(btrim(x)) ~ '^[A-Z]{2}$'), '[]') from (select jsonb_array_elements_text(case when jsonb_typeof(p->'states_served') = 'array' then p->'states_served' else '[]' end) x limit 60) t),
    'services', (select coalesce(jsonb_agg(jsonb_build_object('title', left(btrim(s->>'title'), 120), 'description', left(btrim(coalesce(s->>'description', '')), 600),
        'price_min_cents', greatest(coalesce((s->>'price_min_cents')::bigint, 0), 0), 'price_max_cents', greatest(coalesce((s->>'price_max_cents')::bigint, 0), 0)))
        filter (where length(btrim(coalesce(s->>'title', ''))) >= 3), '[]')
      from (select s from jsonb_array_elements(case when jsonb_typeof(p->'services') = 'array' then p->'services' else '[]' end) s limit 10) t));
  v_missing := dela_agency_profile_missing(b);
  insert into agency_profiles (org_id, body, missing, score, updated_by, updated_at)
  values (v_org, b, v_missing, 100 - 20 * cardinality(v_missing), p_person, now())
  on conflict (org_id) do update set body = excluded.body, missing = excluded.missing, score = excluded.score, updated_by = excluded.updated_by, updated_at = now();
  perform dela_audit('member', p_person, 'agency_profile_saved', 'organization', v_org::text, jsonb_build_object('missing', to_jsonb(v_missing)));
  return dela_agency_profile_get(p_person);
end $$;

-- What attorneys see about an agency (on proposals and in Talent): only the public parts
create or replace function dela_agency_public(p_org uuid) returns jsonb language sql stable as $$
  select case when o.id is null then null else jsonb_build_object('name', coalesce(nullif(o.business_name, ''), o.name),
    'headline', ap.body->>'headline', 'summary', ap.body->>'summary', 'practice_areas', coalesce(ap.body->'practice_areas', '[]'),
    'services', coalesce(ap.body->'services', '[]'), 'tools', coalesce(ap.body->'tools', '[]'), 'states_served', coalesce(ap.body->'states_served', '[]'),
    'team_size', (select count(*) from org_members m where m.org_id = o.id and m.status = 'active')) end
  from organizations o left join agency_profiles ap on ap.org_id = o.id where o.id = p_org and o.kind = 'agency'
$$;

-- ---------- The guide: the firm first, and the agency profile for agency owners (checked text patches) ----------
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('dela_guide_state(uuid, text)'::regprocedure);
  n := replace(d,
    $a$    v_step := case
      when g_open.id is not null and g_open.props > 0 then 'review_proposals'$a$,
    $a$    v_step := case
      when not exists (select 1 from firm_profiles f where f.org_id = v_org and f.body ? 'documents')
        and not exists (select 1 from playbooks where org_id = v_org and status not in ('trash', 'deleted')) then 'firm'
      when g_open.id is not null and g_open.props > 0 then 'review_proposals'$a$);
  if n = d then raise exception 'guide patch 1 did not apply'; end if;
  d := n;
  n := replace(d,
    $a$      when v_inv > 0 then 'invitations'$a$,
    $a$      when dela_agency_profile_org(p_person) is not null and dela_switch_on('agency_team', p_person)
        and coalesce((select cardinality(ap.missing) from agency_profiles ap where ap.org_id = dela_agency_profile_org(p_person)), 1) > 0 then 'agency_profile'
      when v_inv > 0 then 'invitations'$a$);
  if n = d then raise exception 'guide patch 2 did not apply'; end if;
  d := n;
  n := replace(d,
    $a$      'practice_areas', coalesce((select f.body->'practice_areas' from firm_profiles f where f.org_id = v_org), '[]'));$a$,
    $a$      'practice_areas', coalesce((select coalesce(f.body->'documents'->'practice_areas', f.body->'practice_areas') from firm_profiles f where f.org_id = v_org),
        (select mp.body->'practice_areas' from member_profiles mp where mp.person_id = p_person and mp.side = 'attorney'), '[]'),
      'systems', coalesce((select f.body->'documents'->'systems' from firm_profiles f where f.org_id = v_org), '{}'));$a$);
  if n = d then raise exception 'guide patch 3 did not apply'; end if;
  d := n;
  n := replace(d,
    $a$    v_facts := jsonb_build_object('readiness', st->>'readiness',$a$,
    $a$    v_facts := jsonb_build_object('agency', case when dela_agency_profile_org(p_person) is null then null
        else jsonb_build_object('missing', coalesce((select to_jsonb(ap.missing) from agency_profiles ap where ap.org_id = dela_agency_profile_org(p_person)), to_jsonb(dela_agency_profile_missing('{}')))) end,
      'readiness', st->>'readiness',$a$);
  if n = d then raise exception 'guide patch 4 did not apply'; end if;
  execute n;
end $$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_agency_profile_org', 'dela_agency_profile_missing', 'dela_agency_profile_get', 'dela_agency_profile_save',
      'dela_agency_public', 'dela_guide_state') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end $$;

-- Attorneys see the agency's profile (headline, summary, services) on its proposals (checked text patch)
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('dela_proposals_agency(uuid, uuid)'::regprocedure);
  n := replace(d, $a$'reviews', dela_review_summary(o.owner_person_id, 'freelancer')),$a$, $a$'reviews', dela_review_summary(o.owner_person_id, 'freelancer'), 'profile', dela_agency_public(o.id)),$a$);
  if n = d then raise exception 'proposals_agency patch did not apply'; end if;
  execute n;
end $$;

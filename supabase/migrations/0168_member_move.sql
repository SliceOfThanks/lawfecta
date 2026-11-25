-- Step 90a (Stacey 2026-11-25: "We will be transferring BD data (users, etc) from the old BD site to this new one. What
-- can we create that will help us do this transfer easy?"). The old site is www.lawfecta.com, the new one is
-- www.lawfecta.co, where DELA runs. This part only READS: DELA copies the old site's members into its own tables, the
-- owner sets which new plan each old plan becomes and how categories match, and a preview says what a move would do.
-- Nothing is written to either website here; the move itself is step 90b. The old site's key is the secret
-- BD_OLD_API_KEY, never a setting. Additive: one switch (off), one setting, eight tables, functions.

insert into feature_switches (key, label, gate) values ('member_move',
  'Move members from the old website (www.lawfecta.com) to this one: read them, map plans and categories, preview (step 90)',
  'Stacey asked for it 2026-11-25; the old site''s API key is set in Supabase as BD_OLD_API_KEY')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('bd_old.site_url', '"https://www.lawfecta.com"'::jsonb, 'Member move: the address of the old website', 'Member move', '', 'O', 'Stacey 2026-11-25',
    'The site members are read from. Its API key is the Supabase secret BD_OLD_API_KEY and is never kept here.')
on conflict (key) do nothing;

-- One row: where the reading stands
create table if not exists move_state (
  id int primary key check (id = 1),
  status text not null default 'idle' check (status in ('idle', 'reading', 'read', 'failed')),
  run int not null default 0,
  started_at timestamptz, finished_at timestamptz,
  members int not null default 0, pages int not null default 0,
  problem text not null default '',
  started_by uuid references people(id)
);
insert into move_state (id) values (1) on conflict (id) do nothing;

-- The old site's members as DELA read them. rec holds only the listed fields; a password, a login token, a card or an
-- invoice is never read into it (the api keeps an allow-list).
create table if not exists move_members (
  old_id bigint primary key,
  email text not null default '', email_key text not null default '',
  first_name text not null default '', last_name text not null default '', company text not null default '',
  plan_id int not null default 0, active int not null default 0,
  profession_id int not null default 0, services int[] not null default '{}',
  last_login timestamptz, signup_date timestamptz,
  rec jsonb not null default '{}'::jsonb,
  run int not null default 0, read_at timestamptz not null default now()
);
create index if not exists move_members_email on move_members (email_key);
create index if not exists move_members_plan on move_members (plan_id);

create table if not exists move_old_plans (plan_id int primary key, name text not null default '', profile_type text not null default '', monthly text not null default '', yearly text not null default '', initial text not null default '');
create table if not exists move_new_plans (plan_id int primary key, name text not null default '', profile_type text not null default '', searchable boolean not null default false);
create table if not exists move_old_categories (kind text not null check (kind in ('p', 's')), id int not null, name text not null default '', top_id int not null default 0, parent_id int not null default 0, primary key (kind, id));
create table if not exists move_new_members (new_id bigint primary key, email_key text not null default '', plan_id int not null default 0);
create index if not exists move_new_members_email on move_new_members (email_key);

-- The owner's choices. No line is pre-chosen for a plan: new_plan stays empty until she sets it.
create table if not exists move_plan_map (old_plan int primary key, new_plan int, skip boolean not null default false, set_by uuid references people(id), set_at timestamptz);
create table if not exists move_category_map (old_kind text not null check (old_kind in ('p', 's')), old_id int not null, new_key text, auto boolean not null default false, set_by uuid references people(id), set_at timestamptz, primary key (old_kind, old_id));

alter table move_state enable row level security;
alter table move_members enable row level security;
alter table move_old_plans enable row level security;
alter table move_new_plans enable row level security;
alter table move_old_categories enable row level security;
alter table move_new_members enable row level security;
alter table move_plan_map enable row level security;
alter table move_category_map enable row level security;

-- An email as it is compared: no spaces around it, no capital letters
create or replace function dela_move_email_key(p text) returns text language sql immutable set search_path = public, extensions, pg_temp as $$
  select lower(btrim(coalesce(p, '')))
$$;

-- A category's place in words: "Paralegal Services > Civil Litigation > Westlaw". Two sites match on this, not on numbers.
create or replace function dela_move_old_path(p_kind text, p_id int) returns text language sql stable set search_path = public, extensions, pg_temp as $$
  select case when p_kind = 'p' then (select lower(btrim(name)) from move_old_categories where kind = 'p' and id = p_id)
    else (select coalesce((select lower(btrim(t.name)) from move_old_categories t where t.kind = 'p' and t.id = c.top_id), '') || ' > ' ||
        case when c.parent_id > 0 then coalesce((select lower(btrim(x.name)) from move_old_categories x where x.kind = 's' and x.id = c.parent_id), '') || ' > ' else '' end || lower(btrim(c.name))
      from move_old_categories c where c.kind = 's' and c.id = p_id) end
$$;
create or replace function dela_move_new_path(p_key text) returns text language sql stable set search_path = public, extensions, pg_temp as $$
  select case when c.kind = 'top' then lower(btrim(c.name))
    else coalesce((select lower(btrim(t.name)) from bd_categories t where t.key = c.top_key), '') || ' > ' ||
      case when c.parent_key is not null and c.parent_key <> c.top_key then coalesce((select lower(btrim(x.name)) from bd_categories x where x.key = c.parent_key), '') || ' > ' else '' end || lower(btrim(c.name)) end
  from bd_categories c where c.key = p_key
$$;

-- Start reading the old site. The api does the reading in the job "move_read".
create or replace function dela_move_begin(p_actor uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare s move_state;
begin
  perform dela_require_staff(p_actor, '{}');
  if not dela_switch_on('member_move', p_actor) then return jsonb_build_object('ok', false, 'reason', 'move_off'); end if;
  select * into s from move_state where id = 1 for update;
  if s.status = 'reading' and s.started_at > now() - interval '20 minutes' then return jsonb_build_object('ok', true, 'duplicate', true, 'run', s.run); end if;
  update move_state set status = 'reading', run = s.run + 1, started_at = now(), finished_at = null, members = 0, pages = 0, problem = '', started_by = p_actor where id = 1;
  perform dela_job_enqueue('move_read', jsonb_build_object('run', s.run + 1, 'step', 'lists'), now(), 'move_read:' || (s.run + 1) || ':lists', null);
  perform dela_audit('staff', p_actor, 'move_read_started', 'move', (s.run + 1)::text, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'run', s.run + 1);
end $$;

-- The lists that go with the members: both sites' plans, the old site's categories, the new site's members
create or replace function dela_move_put_lists(p_run int, p jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if not exists (select 1 from move_state where id = 1 and run = p_run and status = 'reading') then return jsonb_build_object('ok', false, 'reason', 'not_this_run'); end if;
  delete from move_members where true;
  delete from move_old_plans where true;
  insert into move_old_plans (plan_id, name, profile_type, monthly, yearly, initial)
    select (x->>'plan_id')::int, left(coalesce(x->>'name', ''), 200), left(coalesce(x->>'profile_type', ''), 40), left(coalesce(x->>'monthly', ''), 20), left(coalesce(x->>'yearly', ''), 20), left(coalesce(x->>'initial', ''), 20)
    from jsonb_array_elements(coalesce(p->'old_plans', '[]')) x where (x->>'plan_id') ~ '^[0-9]{1,9}$' on conflict (plan_id) do nothing;
  delete from move_new_plans where true;
  insert into move_new_plans (plan_id, name, profile_type, searchable)
    select (x->>'plan_id')::int, left(coalesce(x->>'name', ''), 200), left(coalesce(x->>'profile_type', ''), 40), coalesce((x->>'searchable')::boolean, false)
    from jsonb_array_elements(coalesce(p->'new_plans', '[]')) x where (x->>'plan_id') ~ '^[0-9]{1,9}$' on conflict (plan_id) do nothing;
  -- When the new site's plans could not be read, the plans DELA already knows are offered
  if not exists (select 1 from move_new_plans) then
    insert into move_new_plans (plan_id, name) select pl.bd_plan_id::int, pl.name from plans pl where pl.bd_plan_id is not null on conflict (plan_id) do nothing;
  end if;
  delete from move_old_categories where true;
  insert into move_old_categories (kind, id, name, top_id, parent_id)
    select x->>'kind', (x->>'id')::int, left(coalesce(x->>'name', ''), 200), coalesce((x->>'top_id')::int, 0), coalesce((x->>'parent_id')::int, 0)
    from jsonb_array_elements(coalesce(p->'old_categories', '[]')) x where x->>'kind' in ('p', 's') and (x->>'id') ~ '^[0-9]{1,9}$' on conflict (kind, id) do nothing;
  delete from move_new_members where true;
  insert into move_new_members (new_id, email_key, plan_id)
    select (x->>'new_id')::bigint, dela_move_email_key(x->>'email'), coalesce((x->>'plan_id')::int, 0)
    from jsonb_array_elements(coalesce(p->'new_members', '[]')) x where (x->>'new_id') ~ '^[0-9]{1,12}$' on conflict (new_id) do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- One page of the old site's members
create or replace function dela_move_put_members(p_run int, p_rows jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_n int;
begin
  if not exists (select 1 from move_state where id = 1 and run = p_run and status = 'reading') then return jsonb_build_object('ok', false, 'reason', 'not_this_run'); end if;
  insert into move_members (old_id, email, email_key, first_name, last_name, company, plan_id, active, profession_id, services, last_login, signup_date, rec, run, read_at)
    select (x->>'old_id')::bigint, left(coalesce(x->>'email', ''), 320), dela_move_email_key(x->>'email'), left(coalesce(x->>'first_name', ''), 200), left(coalesce(x->>'last_name', ''), 200), left(coalesce(x->>'company', ''), 300),
      coalesce((x->>'plan_id')::int, 0), coalesce((x->>'active')::int, 0), coalesce((x->>'profession_id')::int, 0),
      coalesce((select array_agg(v::int) from jsonb_array_elements_text(coalesce(x->'services', '[]')) v where v ~ '^[0-9]{1,9}$'), '{}'),
      nullif(x->>'last_login', '')::timestamptz, nullif(x->>'signup_date', '')::timestamptz, coalesce(x->'rec', '{}'::jsonb), p_run, now()
    from jsonb_array_elements(coalesce(p_rows, '[]')) x where (x->>'old_id') ~ '^[0-9]{1,12}$'
  on conflict (old_id) do update set email = excluded.email, email_key = excluded.email_key, first_name = excluded.first_name, last_name = excluded.last_name, company = excluded.company, plan_id = excluded.plan_id,
    active = excluded.active, profession_id = excluded.profession_id, services = excluded.services, last_login = excluded.last_login, signup_date = excluded.signup_date, rec = excluded.rec, run = excluded.run, read_at = now();
  select count(*) into v_n from move_members where run = p_run;
  update move_state set members = v_n, pages = pages + 1 where id = 1;
  return jsonb_build_object('ok', true, 'members', v_n);
end $$;

-- The reading ended. When it went well: a line for every old plan (nothing chosen), and categories matched by their names.
create or replace function dela_move_finish(p_run int, p_ok boolean, p_problem text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if not exists (select 1 from move_state where id = 1 and run = p_run and status = 'reading') then return jsonb_build_object('ok', false, 'reason', 'not_this_run'); end if;
  update move_state set status = case when p_ok then 'read' else 'failed' end, finished_at = now(), problem = left(coalesce(p_problem, ''), 300) where id = 1;
  if not p_ok then return jsonb_build_object('ok', true); end if;
  insert into move_plan_map (old_plan) select distinct m.plan_id from move_members m on conflict (old_plan) do nothing;
  -- A category the owner has not set by hand is matched again on every reading
  delete from move_category_map where auto;
  insert into move_category_map (old_kind, old_id, new_key, auto)
    select c.kind, c.id, (select b.key from bd_categories b where b.active and b.kind = case when c.kind = 'p' then 'top' else 'sub' end and dela_move_new_path(b.key) = dela_move_old_path(c.kind, c.id) order by b.key limit 1), true
    from move_old_categories c on conflict (old_kind, old_id) do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- What a move would do with each member. One rule, used by the preview now and by the move in step 90b.
--   move              goes to the new site on the mapped plan
--   skip              the owner chose "Do not move" for this plan
--   no_plan           the plan has no choice yet
--   on_new            the new site already has this email (it is linked, not made again)
--   duplicate         another member of the old site has the same email; the one who logged in last moves
--   bad_email         no email, or not an email address
create or replace function dela_move_rows() returns table (old_id bigint, email text, first_name text, last_name text, company text, old_plan int, new_plan int, active int, last_login timestamptz, decision text, other bigint)
language sql stable set search_path = public, extensions, pg_temp as $$
  with r as (
    select m.*, pm.new_plan, coalesce(pm.skip, false) skip,
      first_value(m.old_id) over (partition by m.email_key order by m.last_login desc nulls last, m.old_id desc) keep_id,
      count(*) over (partition by m.email_key) same
    from move_members m left join move_plan_map pm on pm.old_plan = m.plan_id)
  select r.old_id, r.email, r.first_name, r.last_name, r.company, r.plan_id, r.new_plan, r.active, r.last_login,
    case when r.email_key !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then 'bad_email'
      when r.skip then 'skip'
      when r.new_plan is null then 'no_plan'
      when r.same > 1 and r.keep_id <> r.old_id then 'duplicate'
      when exists (select 1 from move_new_members n where n.email_key = r.email_key) then 'on_new'
      else 'move' end,
    case when r.same > 1 and r.keep_id <> r.old_id then r.keep_id end
  from r
$$;

create or replace function dela_move_overview(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare s move_state;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into s from move_state where id = 1;
  return jsonb_build_object('ok', true, 'on', dela_switch_on('member_move', p_actor), 'site', dela_setting_text('bd_old.site_url', ''),
    'state', jsonb_build_object('status', s.status, 'run', s.run, 'started_at', s.started_at, 'finished_at', s.finished_at, 'members', s.members, 'pages', s.pages, 'problem', s.problem),
    'old_plans', coalesce((select jsonb_agg(jsonb_build_object('plan_id', pm.old_plan, 'name', coalesce(op.name, ''), 'profile_type', coalesce(op.profile_type, ''), 'monthly', coalesce(op.monthly, ''), 'yearly', coalesce(op.yearly, ''), 'initial', coalesce(op.initial, ''),
        'members', (select count(*) from move_members m where m.plan_id = pm.old_plan), 'new_plan', pm.new_plan, 'skip', pm.skip) order by (select count(*) from move_members m where m.plan_id = pm.old_plan) desc, pm.old_plan)
      from move_plan_map pm left join move_old_plans op on op.plan_id = pm.old_plan), '[]'),
    'new_plans', coalesce((select jsonb_agg(jsonb_build_object('plan_id', np.plan_id, 'name', np.name, 'profile_type', np.profile_type, 'searchable', np.searchable, 'dela_plan', (dela_plan_for_bd(np.plan_id)).code, 'side', (dela_plan_for_bd(np.plan_id)).side) order by np.name) from move_new_plans np), '[]'),
    'categories', jsonb_build_object(
      'total', (select count(*) from move_old_categories),
      'matched', (select count(*) from move_category_map where new_key is not null),
      'unmatched', coalesce((select jsonb_agg(jsonb_build_object('kind', c.kind, 'id', c.id, 'name', c.name, 'path', dela_move_old_path(c.kind, c.id),
          'members', case when c.kind = 'p' then (select count(*) from move_members m where m.profession_id = c.id) else (select count(*) from move_members m where c.id = any(m.services)) end) order by c.kind, dela_move_old_path(c.kind, c.id))
        from move_old_categories c join move_category_map cm on cm.old_kind = c.kind and cm.old_id = c.id where cm.new_key is null
          and case when c.kind = 'p' then exists (select 1 from move_members m where m.profession_id = c.id) else exists (select 1 from move_members m where c.id = any(m.services)) end), '[]'),
      'set_by_hand', (select count(*) from move_category_map where not auto)),
    'new_categories', coalesce((select jsonb_agg(jsonb_build_object('key', b.key, 'kind', b.kind, 'path', dela_move_new_path(b.key)) order by dela_move_new_path(b.key)) from bd_categories b where b.active), '[]'));
end $$;

create or replace function dela_move_plan_set(p_actor uuid, p_old int, p_new int, p_skip boolean) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, '{}');
  if not dela_switch_on('member_move', p_actor) then return jsonb_build_object('ok', false, 'reason', 'move_off'); end if;
  if not exists (select 1 from move_plan_map where old_plan = p_old) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not coalesce(p_skip, false) and p_new is not null and not exists (select 1 from move_new_plans where plan_id = p_new) then return jsonb_build_object('ok', false, 'reason', 'plan_not_on_new_site'); end if;
  update move_plan_map set new_plan = case when coalesce(p_skip, false) then null else p_new end, skip = coalesce(p_skip, false), set_by = p_actor, set_at = now() where old_plan = p_old;
  perform dela_audit('staff', p_actor, 'move_plan_mapped', 'move', p_old::text, jsonb_build_object('new_plan', p_new, 'skip', coalesce(p_skip, false)));
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_move_category_set(p_actor uuid, p_kind text, p_id int, p_new_key text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_key text := nullif(btrim(coalesce(p_new_key, '')), '');
begin
  perform dela_require_staff(p_actor, '{}');
  if not dela_switch_on('member_move', p_actor) then return jsonb_build_object('ok', false, 'reason', 'move_off'); end if;
  if not exists (select 1 from move_old_categories where kind = p_kind and id = p_id) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_key is not null and not exists (select 1 from bd_categories b where b.key = v_key and b.active and b.kind = case when p_kind = 'p' then 'top' else 'sub' end) then return jsonb_build_object('ok', false, 'reason', 'category_not_on_new_site'); end if;
  insert into move_category_map (old_kind, old_id, new_key, auto, set_by, set_at) values (p_kind, p_id, v_key, false, p_actor, now())
    on conflict (old_kind, old_id) do update set new_key = excluded.new_key, auto = false, set_by = excluded.set_by, set_at = excluded.set_at;
  return jsonb_build_object('ok', true);
end $$;

-- The preview: counts, and every member with what would happen to them (the page turns the rows into a file)
create or replace function dela_move_preview(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v jsonb;
begin
  perform dela_require_staff(p_actor, '{}');
  with r as (select * from dela_move_rows())
  select jsonb_build_object('ok', true,
    'total', (select count(*) from r),
    'decisions', coalesce((select jsonb_object_agg(d, n) from (select decision d, count(*) n from r group by decision) x), '{}'),
    'by_new_plan', coalesce((select jsonb_agg(jsonb_build_object('plan_id', x.new_plan, 'name', coalesce(np.name, ''), 'members', x.n, 'searchable', coalesce(np.searchable, false), 'dela_plan', (dela_plan_for_bd(x.new_plan)).code) order by x.n desc)
      from (select new_plan, count(*) n from r where decision = 'move' group by new_plan) x left join move_new_plans np on np.plan_id = x.new_plan), '[]'),
    'statuses', coalesce((select jsonb_object_agg(a, n) from (select active::text a, count(*) n from r where decision = 'move' group by active) x), '{}'),
    'visible', (select count(*) from r join move_new_plans np on np.plan_id = r.new_plan where r.decision = 'move' and np.searchable and r.active = 2),
    'attorneys', (select count(*) from r where r.decision = 'move' and (dela_plan_for_bd(r.new_plan)).side = 'attorney'),
    'no_category', (select count(*) from r join move_members m on m.old_id = r.old_id where r.decision = 'move' and m.profession_id > 0
      and not exists (select 1 from move_category_map cm where cm.old_kind = 'p' and cm.old_id = m.profession_id and cm.new_key is not null)),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('old_id', r.old_id, 'email', r.email, 'first_name', r.first_name, 'last_name', r.last_name, 'company', r.company,
        'old_plan', coalesce(op.name, r.old_plan::text), 'new_plan', coalesce(np.name, ''), 'active', r.active, 'last_login', r.last_login, 'decision', r.decision, 'other', r.other) order by r.old_id)
      from r left join move_old_plans op on op.plan_id = r.old_plan left join move_new_plans np on np.plan_id = r.new_plan), '[]'))
  into v;
  return v;
end $$;

revoke all on function dela_move_email_key(text) from public, anon, authenticated;
revoke all on function dela_move_old_path(text, int) from public, anon, authenticated;
revoke all on function dela_move_new_path(text) from public, anon, authenticated;
revoke all on function dela_move_begin(uuid) from public, anon, authenticated;
revoke all on function dela_move_put_lists(int, jsonb) from public, anon, authenticated;
revoke all on function dela_move_put_members(int, jsonb) from public, anon, authenticated;
revoke all on function dela_move_finish(int, boolean, text) from public, anon, authenticated;
revoke all on function dela_move_rows() from public, anon, authenticated;
revoke all on function dela_move_overview(uuid) from public, anon, authenticated;
revoke all on function dela_move_plan_set(uuid, int, int, boolean) from public, anon, authenticated;
revoke all on function dela_move_category_set(uuid, text, int, text) from public, anon, authenticated;
revoke all on function dela_move_preview(uuid) from public, anon, authenticated;

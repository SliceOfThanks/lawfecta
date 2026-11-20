-- Steps 56 to 58 (docs/briefs/step-56-58-assign-part-inputs-preview.md): a gig may hand over only some of a
-- document's steps, it lists what the freelancer needs before starting and whether each thing has been supplied,
-- and the attorney sees exactly what the freelancer will see. Additive: a gig with no chosen steps hands over what it
-- always did.

alter table gigs add column if not exists step_nos int[];

insert into settings (key, value, label, section, unit, status, source, note) values
  ('gig.inputs_max', '20', 'Things a gig may list as needed before the freelancer starts', 'Flex Gigs and proposals', 'items', 'C', 'Claude 2026-11-19 (step 57, acceleration mode)', 'Access, files, templates and information. Each line is up to 200 characters.')
on conflict (key) do nothing;

create table if not exists gig_inputs (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references gigs(id) on delete cascade,
  pos int not null default 0,
  kind text not null default 'other' check (kind in ('access', 'file', 'template', 'information', 'other')),
  label text not null check (length(label) between 1 and 200),
  supplied_by text not null default 'client' check (supplied_by in ('client', 'freelancer')),
  status text not null default 'needed' check (status in ('needed', 'supplied', 'not_needed')),
  note text not null default '',
  updated_by uuid references people(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists gig_inputs_gig on gig_inputs (gig_id, pos);
alter table gig_inputs enable row level security;

-- The chosen steps of a gig, for the server (null: the gig hands over every step it may)
create or replace function dela_gig_step_nos(p_gig uuid) returns int[] language sql stable set search_path = public, extensions, pg_temp as $$
  select step_nos from gigs where id = p_gig
$$;
revoke all on function dela_gig_step_nos(uuid) from public, anon, authenticated;

-- Choosing the steps: the gig's manager, while the gig is still a draft. Once posted the part is fixed, because
-- proposals, the agreement and the attorney's decision points all count from it.
create or replace function dela_gig_steps_set(p_person uuid, p_gig uuid, p_steps int[]) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare g gigs;
begin
  select * into g from gigs where id = p_gig for update;
  if g.id is null or not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if g.status <> 'draft' then return jsonb_build_object('ok', false, 'reason', 'gig_not_draft'); end if;
  update gigs set step_nos = case when p_steps is null or cardinality(p_steps) = 0 then null else (select array_agg(distinct n order by n) from unnest(p_steps) n where n between 1 and 500) end where id = p_gig;
  perform dela_audit('member', p_person, 'gig_steps_chosen', 'gig', p_gig::text, jsonb_build_object('steps', to_jsonb(p_steps)));
  return jsonb_build_object('ok', true, 'step_nos', (select to_jsonb(step_nos) from gigs where id = p_gig));
end $$;
revoke all on function dela_gig_steps_set(uuid, uuid, int[]) from public, anon, authenticated;

-- What the gig page needs for the handoff: the chosen steps and the list of things needed. The manager always; a
-- freelancer once invited or hired (the same people who may read the steps).
create or replace function dela_gig_handoff(p_person uuid, p_side text, p_gig uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare g gigs; v_mgr boolean; v_access text;
begin
  select * into g from gigs where id = p_gig;
  if g.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_mgr := p_side = 'attorney' and dela_gig_manager(p_person, p_gig);
  v_access := case when v_mgr then 'manager' when p_side = 'freelancer' then dela_gig_access(p_person, p_gig) else '' end;
  if v_access not in ('manager', 'invited', 'hired') then return jsonb_build_object('ok', true, 'on', dela_switch_on('handoff_kit', p_person), 'access', v_access, 'step_nos', null, 'inputs', '[]'::jsonb); end if;
  return jsonb_build_object('ok', true, 'on', dela_switch_on('handoff_kit', p_person), 'access', v_access, 'step_nos', to_jsonb(g.step_nos), 'draft', g.status = 'draft',
    'max', dela_int_setting('gig.inputs_max', 20),
    'inputs', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'kind', i.kind, 'label', i.label, 'supplied_by', i.supplied_by, 'status', i.status, 'note', i.note, 'updated_at', i.updated_at) order by i.pos, i.created_at), '[]')
      from gig_inputs i where i.gig_id = g.id));
end $$;
revoke all on function dela_gig_handoff(uuid, text, uuid) from public, anon, authenticated;

-- The manager's list: lines kept by id keep their state; new lines start as "needed"; lines left out are removed
create or replace function dela_gig_inputs_save(p_person uuid, p_gig uuid, p_items jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare g gigs; it jsonb; n int := 0; v_keep uuid[] := '{}'; v_id uuid; v_max int := dela_int_setting('gig.inputs_max', 20);
begin
  select * into g from gigs where id = p_gig for update;
  if g.id is null or not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if g.status in ('closed', 'canceled') then return jsonb_build_object('ok', false, 'reason', 'gig_closed'); end if;
  if jsonb_typeof(p_items) <> 'array' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if jsonb_array_length(p_items) > v_max then return jsonb_build_object('ok', false, 'reason', 'too_many_inputs', 'max', v_max); end if;
  for it in select * from jsonb_array_elements(p_items) loop
    n := n + 1;
    if length(trim(coalesce(it->>'label', ''))) = 0 then continue; end if;
    v_id := case when coalesce(it->>'id', '') ~ '^[0-9a-f-]{36}$' then (it->>'id')::uuid end;
    if v_id is not null and exists (select 1 from gig_inputs where id = v_id and gig_id = p_gig) then
      update gig_inputs set pos = n, label = left(trim(it->>'label'), 200), kind = case when it->>'kind' in ('access', 'file', 'template', 'information', 'other') then it->>'kind' else kind end,
        supplied_by = case when it->>'supplied_by' in ('client', 'freelancer') then it->>'supplied_by' else supplied_by end, updated_by = p_person, updated_at = now() where id = v_id;
    else
      insert into gig_inputs (gig_id, pos, kind, label, supplied_by, updated_by) values (p_gig, n, case when it->>'kind' in ('access', 'file', 'template', 'information', 'other') then it->>'kind' else 'other' end,
        left(trim(it->>'label'), 200), case when it->>'supplied_by' = 'freelancer' then 'freelancer' else 'client' end, p_person) returning id into v_id;
    end if;
    v_keep := v_keep || v_id;
  end loop;
  delete from gig_inputs where gig_id = p_gig and not (id = any(v_keep));
  perform dela_audit('member', p_person, 'gig_inputs_saved', 'gig', p_gig::text, jsonb_build_object('count', cardinality(v_keep)));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_gig_inputs_save(uuid, uuid, jsonb) from public, anon, authenticated;

-- One line's state. The manager may set any state. The hired freelancer may say a thing is still needed, and may
-- mark as supplied only the things that are theirs to bring.
create or replace function dela_gig_input_mark(p_person uuid, p_side text, p_input uuid, p_status text, p_note text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare i gig_inputs; v_mgr boolean; v_access text;
begin
  select * into i from gig_inputs where id = p_input for update;
  if i.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_status not in ('needed', 'supplied', 'not_needed') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  v_mgr := p_side = 'attorney' and dela_gig_manager(p_person, i.gig_id);
  v_access := case when v_mgr then 'manager' when p_side = 'freelancer' then dela_gig_access(p_person, i.gig_id) else '' end;
  if v_access = 'manager' then null;
  elsif v_access = 'hired' and (p_status = 'needed' or (p_status = 'supplied' and i.supplied_by = 'freelancer')) then null;
  elsif v_access in ('hired', 'invited') then return jsonb_build_object('ok', false, 'reason', 'not_allowed');
  else return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  update gig_inputs set status = p_status, note = left(coalesce(p_note, ''), 300), updated_by = p_person, updated_at = now() where id = p_input;
  perform dela_audit('member', p_person, 'gig_input_marked', 'gig', i.gig_id::text, jsonb_build_object('input', p_input, 'status', p_status, 'by', v_access));
  return jsonb_build_object('ok', true, 'gig_id', i.gig_id);
end $$;
revoke all on function dela_gig_input_mark(uuid, text, uuid, text, text) from public, anon, authenticated;

-- The same list for an engagement, read through the agreement by either party to it
create or replace function dela_agreement_inputs(p_person uuid, p_side text, p_agreement uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select case when dela_agreement_role(p_person, p_side, p_agreement) = '' then '[]'::jsonb else
    (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'kind', i.kind, 'label', i.label, 'supplied_by', i.supplied_by, 'status', i.status, 'note', i.note, 'updated_at', i.updated_at) order by i.pos, i.created_at), '[]')
      from agreements a join gig_inputs i on i.gig_id = a.gig_id where a.id = p_agreement) end
$$;
revoke all on function dela_agreement_inputs(uuid, text, uuid) from public, anon, authenticated;

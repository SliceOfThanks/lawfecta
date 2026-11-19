-- Step 46 (docs/briefs/step-46-dela-instructions.md): DELA instructions. A firm tells DELA how to work for it
-- ("firm guidance"), and each person may keep their own preferences. Firm guidance is proposed by anyone who may
-- comment in the firm's Library and takes effect only when the Library administrator approves it. A preference is
-- the person's own and applies to their own chats at once. Everything is additive, and it sits behind the switch
-- ask_dela_workspace with the rest of the Ask DELA workspace.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('ai.firm_rules_max', '20', 'Approved firm guidance lines a firm may have for DELA', 'Files and AI', 'lines', 'C', 'Claude 2026-11-19 (step 46, acceleration mode)', 'Each approved line is sent to the AI with every Ask DELA message of that firm. Preferences have the same limit for each person.')
on conflict (key) do nothing;

create table if not exists firm_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  scope text not null check (scope in ('firm', 'personal')),
  person_id uuid references people(id),          -- whose preference it is (scope personal)
  body text not null check (char_length(body) between 5 and 300),
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected', 'retired')),
  proposed_by uuid not null references people(id),
  decided_by uuid references people(id),
  decided_at timestamptz,
  retired_by uuid references people(id),
  retired_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists firm_rules_org on firm_rules (org_id, scope, status);
alter table firm_rules enable row level security;
revoke all on firm_rules from public, anon, authenticated;

-- The firm this person's guidance belongs to (the attorney's firm, or the agency they hire for), and their rank in
-- its Library: 4 administrator, 3 editor, 2 commenter, 1 viewer, 0 none.
create or replace function dela_firm_rules_org(p_person uuid, p_side text) returns uuid
language sql stable set search_path = public, extensions, pg_temp as $$
  select dela_client_org(p_person, p_side)
$$;
revoke all on function dela_firm_rules_org(uuid, text) from public, anon, authenticated;

create or replace function dela_firm_rules(p_person uuid, p_side text) returns jsonb
language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_org uuid := dela_firm_rules_org(p_person, p_side); v_rank int;
begin
  if v_org is null then return jsonb_build_object('ok', true, 'has_firm', false, 'rules', '[]'::jsonb, 'can_propose', false, 'can_approve', false, 'max', 0); end if;
  v_rank := coalesce(dela_pb_rank(dela_pb_role(p_person, v_org)), 0);
  if v_rank < 1 then return jsonb_build_object('ok', true, 'has_firm', false, 'rules', '[]'::jsonb, 'can_propose', false, 'can_approve', false, 'max', 0); end if;
  return jsonb_build_object('ok', true, 'has_firm', true, 'can_propose', v_rank >= 2, 'can_approve', v_rank >= 4,
    'max', greatest(coalesce(dela_int_setting('ai.firm_rules_max', 20), 20), 1),
    'rules', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'scope', r.scope, 'body', r.body, 'status', r.status, 'mine', r.proposed_by = p_person,
        'proposed_by', (select display_name from people where id = r.proposed_by), 'created_at', r.created_at,
        'decided_by', (select display_name from people where id = r.decided_by), 'decided_at', r.decided_at,
        'retired_by', (select display_name from people where id = r.retired_by), 'retired_at', r.retired_at) order by r.created_at desc), '[]')
      from firm_rules r where r.org_id = v_org and (r.scope = 'firm' or r.person_id = p_person)));
end $$;
revoke all on function dela_firm_rules(uuid, text) from public, anon, authenticated;

-- A new line. Firm guidance starts as proposed, also when the administrator writes it: approving is its own action.
-- A preference is the person's own and is in force at once.
create or replace function dela_firm_rule_propose(p_person uuid, p_side text, p_scope text, p_body text) returns jsonb
language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_org uuid := dela_firm_rules_org(p_person, p_side); v_rank int; v_body text := btrim(regexp_replace(coalesce(p_body, ''), '\s+', ' ', 'g'));
  v_max int := greatest(coalesce(dela_int_setting('ai.firm_rules_max', 20), 20), 1); v_id uuid; v_n int;
begin
  if not dela_switch_on('ask_dela_workspace', p_person) then return jsonb_build_object('ok', false, 'reason', 'workspace_off'); end if;
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'no_firm'); end if;
  v_rank := coalesce(dela_pb_rank(dela_pb_role(p_person, v_org)), 0);
  if p_scope not in ('firm', 'personal') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if v_rank < 1 or (p_scope = 'firm' and v_rank < 2) then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if char_length(v_body) < 5 then return jsonb_build_object('ok', false, 'reason', 'rule_too_short'); end if;
  if char_length(v_body) > 300 then return jsonb_build_object('ok', false, 'reason', 'rule_too_long'); end if;
  if p_scope = 'personal' then
    select count(*) into v_n from firm_rules where org_id = v_org and scope = 'personal' and person_id = p_person and status = 'approved';
    if v_n >= v_max then return jsonb_build_object('ok', false, 'reason', 'rules_full', 'max', v_max); end if;
    insert into firm_rules (org_id, scope, person_id, body, status, proposed_by, decided_by, decided_at)
    values (v_org, 'personal', p_person, v_body, 'approved', p_person, p_person, now()) returning id into v_id;
  else
    select count(*) into v_n from firm_rules where org_id = v_org and scope = 'firm' and status = 'proposed';
    if v_n >= v_max then return jsonb_build_object('ok', false, 'reason', 'proposals_full', 'max', v_max); end if;
    insert into firm_rules (org_id, scope, body, status, proposed_by) values (v_org, 'firm', v_body, 'proposed', p_person) returning id into v_id;
  end if;
  perform dela_audit('member', p_person, 'firm_rule_' || case when p_scope = 'personal' then 'preference_saved' else 'proposed' end, 'firm_rule', v_id::text, jsonb_build_object('org_id', v_org, 'scope', p_scope));
  return jsonb_build_object('ok', true, 'id', v_id, 'status', case when p_scope = 'personal' then 'approved' else 'proposed' end);
end $$;
revoke all on function dela_firm_rule_propose(uuid, text, text, text) from public, anon, authenticated;

-- approve / reject (the administrator, on proposed firm guidance), retire (the administrator on approved firm guidance;
-- the person on their own preference), withdraw (the proposer, on their own proposal). The right is checked now.
create or replace function dela_firm_rule_act(p_person uuid, p_side text, p_id uuid, p_action text) returns jsonb
language plpgsql set search_path = public, extensions, pg_temp as $$
declare r firm_rules; v_org uuid := dela_firm_rules_org(p_person, p_side); v_rank int; v_n int;
  v_max int := greatest(coalesce(dela_int_setting('ai.firm_rules_max', 20), 20), 1);
begin
  select * into r from firm_rules where id = p_id for update;
  if r.id is null or v_org is null or r.org_id <> v_org or (r.scope = 'personal' and r.person_id <> p_person) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_rank := coalesce(dela_pb_rank(dela_pb_role(p_person, v_org)), 0);
  if p_action in ('approve', 'reject') then
    if r.scope <> 'firm' or v_rank < 4 then return jsonb_build_object('ok', false, 'reason', 'administrator_only'); end if;
    if r.status <> 'proposed' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', r.status); end if;
    if p_action = 'approve' then
      select count(*) into v_n from firm_rules where org_id = v_org and scope = 'firm' and status = 'approved';
      if v_n >= v_max then return jsonb_build_object('ok', false, 'reason', 'rules_full', 'max', v_max); end if;
    end if;
    update firm_rules set status = case when p_action = 'approve' then 'approved' else 'rejected' end, decided_by = p_person, decided_at = now() where id = r.id;
  elsif p_action = 'retire' then
    if r.scope = 'firm' and v_rank < 4 then return jsonb_build_object('ok', false, 'reason', 'administrator_only'); end if;
    if r.status <> 'approved' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', r.status); end if;
    update firm_rules set status = 'retired', retired_by = p_person, retired_at = now() where id = r.id;
  elsif p_action = 'withdraw' then
    if r.proposed_by <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
    if r.status <> 'proposed' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', r.status); end if;
    update firm_rules set status = 'retired', retired_by = p_person, retired_at = now() where id = r.id;
  else
    return jsonb_build_object('ok', false, 'reason', 'bad_request');
  end if;
  perform dela_audit('member', p_person, 'firm_rule_' || p_action, 'firm_rule', r.id::text, jsonb_build_object('org_id', v_org, 'scope', r.scope));
  return jsonb_build_object('ok', true, 'duplicate', false, 'status', (select status from firm_rules where id = r.id));
end $$;
revoke all on function dela_firm_rule_act(uuid, text, uuid, text) from public, anon, authenticated;

-- What the AI is given for this person: the firm's approved guidance and the person's own preferences. A proposed,
-- rejected or retired line is never sent.
create or replace function dela_firm_rules_for_ai(p_person uuid, p_side text) returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  with o as (select dela_firm_rules_org(p_person, p_side) id)
  select jsonb_build_object(
    'firm', (select coalesce(jsonb_agg(r.body order by r.decided_at), '[]') from firm_rules r, o where r.org_id = o.id and r.scope = 'firm' and r.status = 'approved'
      and coalesce(dela_pb_rank(dela_pb_role(p_person, o.id)), 0) >= 1),
    'personal', (select coalesce(jsonb_agg(r.body order by r.created_at), '[]') from firm_rules r, o where r.org_id = o.id and r.scope = 'personal' and r.person_id = p_person and r.status = 'approved'))
$$;
revoke all on function dela_firm_rules_for_ai(uuid, text) from public, anon, authenticated;

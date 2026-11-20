-- Step 59 (docs/briefs/step-59-learning-from-each-job.md): learning from each job. A freelancer on an engagement
-- says, privately, what was unclear in the document they worked from. The firm reads it on the document and can turn
-- it into a suggested edit. It is not a review: it is never public and has no rating. Additive.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('documents.feedback_max', '20', 'Notes one freelancer may send about the document of one engagement', 'Documents', 'notes', 'C', 'Claude 2026-11-19 (step 59, acceleration mode)', 'Each note is up to 1,500 characters and goes only to the firm.')
on conflict (key) do nothing;

create table if not exists doc_feedback (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id),
  playbook_id uuid not null references playbooks(id) on delete cascade,
  version int not null,
  person_id uuid not null references people(id),
  step_no int,
  body text not null check (length(body) between 3 and 1500),
  status text not null default 'open' check (status in ('open', 'handled')),
  handled_by uuid references people(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists doc_feedback_playbook on doc_feedback (playbook_id, status, created_at desc);
create index if not exists doc_feedback_agreement on doc_feedback (agreement_id, person_id);
alter table doc_feedback enable row level security;

-- The freelancer on the engagement adds a note. The document and its version come from the gig, never from the caller.
create or replace function dela_doc_feedback_add(p_person uuid, p_side text, p_agreement uuid, p_step int, p_body text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare a agreements; g gigs; v_max int := dela_int_setting('documents.feedback_max', 20); v_body text := trim(coalesce(p_body, ''));
begin
  if not dela_switch_on('handoff_kit', p_person) then return jsonb_build_object('ok', false, 'reason', 'feature_off'); end if;
  if dela_agreement_role(p_person, p_side, p_agreement) <> 'freelancer' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into a from agreements where id = p_agreement;
  if a.status not in ('signed', 'active', 'completed', 'paused', 'disputed') then return jsonb_build_object('ok', false, 'reason', 'not_signed_yet'); end if;
  select * into g from gigs where id = a.gig_id;
  if g.playbook_id is null then return jsonb_build_object('ok', false, 'reason', 'no_document'); end if;
  if length(v_body) < 3 then return jsonb_build_object('ok', false, 'reason', 'write_a_little'); end if;
  if (select count(*) from doc_feedback where agreement_id = p_agreement and person_id = p_person) >= v_max then return jsonb_build_object('ok', false, 'reason', 'feedback_limit', 'max', v_max); end if;
  insert into doc_feedback (agreement_id, playbook_id, version, person_id, step_no, body)
    values (p_agreement, g.playbook_id, g.playbook_version, p_person, case when p_step between 1 and 500 then p_step end, left(v_body, 1500));
  perform dela_audit('member', p_person, 'doc_feedback_sent', 'playbook', g.playbook_id::text, jsonb_build_object('agreement', p_agreement, 'step', p_step));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_doc_feedback_add(uuid, text, uuid, int, text) from public, anon, authenticated;

-- What the freelancer already sent for this engagement
create or replace function dela_doc_feedback_mine(p_person uuid, p_side text, p_agreement uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select case when dela_agreement_role(p_person, p_side, p_agreement) <> 'freelancer' then '[]'::jsonb else
    (select coalesce(jsonb_agg(jsonb_build_object('step_no', f.step_no, 'body', f.body, 'created_at', f.created_at) order by f.created_at), '[]') from doc_feedback f where f.agreement_id = p_agreement and f.person_id = p_person) end
$$;
revoke all on function dela_doc_feedback_mine(uuid, text, uuid) from public, anon, authenticated;

-- The firm's view on the document: anyone who may read the document sees the notes; editors may mark them handled
create or replace function dela_doc_feedback_list(p_person uuid, p_playbook uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare x playbooks; v_role text;
begin
  select * into x from playbooks where id = p_playbook;
  v_role := case when x.id is null then null else dela_pb_role(p_person, x.org_id) end;
  if v_role is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('handoff_kit', p_person) then return jsonb_build_object('ok', true, 'on', false); end if;
  return jsonb_build_object('ok', true, 'on', true, 'can_handle', dela_pb_rank(v_role) >= 3,
    'open', (select count(*) from doc_feedback f where f.playbook_id = x.id and f.status = 'open'),
    'notes', (select coalesce(jsonb_agg(n order by (n->>'created_at') desc), '[]') from (
      select jsonb_build_object('id', f.id, 'step_no', f.step_no, 'body', f.body, 'version', f.version, 'status', f.status, 'created_at', f.created_at,
        'by', coalesce(p.display_name, 'A freelancer'), 'gig', g.title) n
      from doc_feedback f join agreements a on a.id = f.agreement_id join gigs g on g.id = a.gig_id left join people p on p.id = f.person_id
      where f.playbook_id = x.id order by f.created_at desc limit 50) q));
end $$;
revoke all on function dela_doc_feedback_list(uuid, uuid) from public, anon, authenticated;

create or replace function dela_doc_feedback_handle(p_person uuid, p_id uuid, p_handled boolean) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare f doc_feedback; x playbooks;
begin
  select * into f from doc_feedback where id = p_id for update;
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into x from playbooks where id = f.playbook_id;
  if dela_pb_role(p_person, x.org_id) is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_pb_rank(dela_pb_role(p_person, x.org_id)) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  update doc_feedback set status = case when p_handled then 'handled' else 'open' end, handled_by = case when p_handled then p_person end, handled_at = case when p_handled then now() end where id = p_id;
  return jsonb_build_object('ok', true, 'playbook_id', f.playbook_id);
end $$;
revoke all on function dela_doc_feedback_handle(uuid, uuid, boolean) from public, anon, authenticated;

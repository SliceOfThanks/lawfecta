-- Step 60 (docs/briefs/step-60-dela-workflow.md): the DELA workflow. For each document of a firm, the facts that say
-- where it stands in the seven steps (talk, clarify, build, review, prepare the handoff, do the work, review the
-- result) and in the loop back (improve for next time). Read only; nothing here changes a document, a gig or an
-- engagement. Behind the switch handoff_kit, with steps 55 to 59. Additive.

create or replace function dela_workflow(p_person uuid, p_side text, p_playbook uuid default null) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_org uuid := dela_side_org(p_person, p_side);
begin
  if not dela_switch_on('handoff_kit', p_person) then return jsonb_build_object('ok', true, 'on', false, 'items', '[]'::jsonb); end if;
  if p_playbook is not null then select org_id into v_org from playbooks where id = p_playbook; end if;
  if v_org is null or dela_pb_role(p_person, v_org) is null then
    return case when p_playbook is null then jsonb_build_object('ok', true, 'on', true, 'items', '[]'::jsonb) else jsonb_build_object('ok', false, 'reason', 'not_found') end;
  end if;
  return jsonb_build_object('ok', true, 'on', true, 'items', (select coalesce(jsonb_agg(x.j order by x.u desc), '[]') from (
    select p.updated_at u, jsonb_build_object(
      'id', p.id, 'title', p.title, 'doc_id', p.doc_id, 'doc_type', p.doc_type, 'status', p.status, 'approved', p.approved_version is not null,
      'from_chat', p.from_chat is not null,
      'newcomer', (select case when c.ready then 'ready' else 'gaps' end from doc_newcomer_checks c where c.playbook_id = p.id and c.version = p.current_version),
      'gig_draft', (select g.id from gigs g where g.playbook_id = p.id and g.status = 'draft' order by g.created_at desc limit 1),
      'gig_open', (select g.id from gigs g where g.playbook_id = p.id and g.status in ('open', 'paused') order by g.created_at desc limit 1),
      'proposals', (select count(*) from proposals pr join gigs g on g.id = pr.gig_id where g.playbook_id = p.id and g.status in ('open', 'paused') and pr.status = 'sent'),
      'eng', (select jsonb_build_object('gig_id', a.gig_id, 'status', a.status,
          'needs', (select count(*) from gig_inputs i where i.gig_id = a.gig_id and i.status = 'needed'),
          'submitted', (select count(*) from milestones m where m.agreement_id = a.id and m.status = 'submitted'))
        from agreements a join gigs g on g.id = a.gig_id where g.playbook_id = p.id and a.status in ('signing', 'signed', 'active', 'paused', 'disputed') order by a.created_at desc limit 1),
      'done', (select count(*) from agreements a join gigs g on g.id = a.gig_id where g.playbook_id = p.id and a.status = 'completed'),
      'feedback_open', (select count(*) from doc_feedback f where f.playbook_id = p.id and f.status = 'open'),
      'updated_at', p.updated_at) j
    from playbooks p where p.org_id = v_org and p.status in ('draft', 'in_review', 'approved') and (p_playbook is null or p.id = p_playbook)
    order by p.updated_at desc limit 60) x));
end $$;
revoke all on function dela_workflow(uuid, text, uuid) from public, anon, authenticated;

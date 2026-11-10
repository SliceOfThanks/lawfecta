-- Launch review 2026-11-10, fix 1 (blocker). A dispute could name any milestone: one from another agreement, or one already
-- accepted and paid out. The settlement (an accepted offer, the automatic grant, the team's decision) then paid or refunded
-- that milestone. Now:
--   1. Opening: a named milestone must belong to the agreement and still be held (paid, not yet accepted).
--   2. Settling and offering: the milestone must belong to the dispute's agreement and be in status 'disputed'.
-- Additive: same functions, same arguments, same answers; two new refusal reasons.
do $$
declare v_src text; v_new text;
begin
  -- 1. dela_dispute_open: the check goes after the "one open dispute" answer, so a repeat still reads as a duplicate
  select pg_get_functiondef('dela_dispute_open(uuid,text,uuid,uuid,text)'::regprocedure) into v_src;
  v_new := replace(v_src, '  insert into disputes (agreement_id, milestone_id, opened_by, reason, notice_ends_at)',
    '  if p_milestone is not null then
    perform 1 from milestones where id = p_milestone and agreement_id = a.id for update;
    if not found then return jsonb_build_object(''ok'', false, ''reason'', ''pick_milestone''); end if;
    if not exists (select 1 from milestones where id = p_milestone and status in (''funded'', ''in_progress'', ''submitted'', ''changes_requested'')) then
      return jsonb_build_object(''ok'', false, ''reason'', ''milestone_not_paid'');
    end if;
  end if;
  insert into disputes (agreement_id, milestone_id, opened_by, reason, notice_ends_at)');
  if v_new = v_src then raise exception 'dela_dispute_open: the text to change was not found'; end if;
  execute v_new;

  -- 2. dela_dispute_settle_money: never move the money of a milestone that is not this dispute's held milestone
  select pg_get_functiondef('dela_dispute_settle_money(uuid,int,int,text,text,uuid)'::regprocedure) into v_src;
  v_new := replace(v_src, '  if m.id is null then return jsonb_build_object(''ok'', false, ''reason'', ''no_milestone''); end if;',
    '  if m.id is null then return jsonb_build_object(''ok'', false, ''reason'', ''no_milestone''); end if;
  if m.agreement_id <> d.agreement_id or m.status <> ''disputed'' then
    perform dela_alert(''disputes'', ''A dispute points at money that is not held'', ''A dispute names a milestone that is not on its agreement or is not held in dispute. No money was moved. Look at it in the admin Disputes tab.'', ''dispbad:'' || d.id::text);
    return jsonb_build_object(''ok'', false, ''reason'', ''milestone_not_held'');
  end if;');
  if v_new = v_src then raise exception 'dela_dispute_settle_money: the text to change was not found'; end if;
  execute v_new;

  -- 3. dela_dispute_offer: no offer on such a milestone either
  select pg_get_functiondef('dela_dispute_offer(uuid,text,uuid,int,text)'::regprocedure) into v_src;
  v_new := replace(v_src, '  if m.id is null then return jsonb_build_object(''ok'', false, ''reason'', ''no_milestone''); end if;',
    '  if m.id is null or m.agreement_id <> d.agreement_id or m.status <> ''disputed'' then return jsonb_build_object(''ok'', false, ''reason'', ''no_milestone''); end if;');
  if v_new = v_src then raise exception 'dela_dispute_offer: the text to change was not found'; end if;
  execute v_new;
end $$;

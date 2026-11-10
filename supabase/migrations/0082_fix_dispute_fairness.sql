-- Launch review 2026-11-10, fixes 8 to 10: disputes are fair.
--   8. The other side's first statement is always the answer, even while a team question is open (before, it was saved as
--      a reply, so the unanswered-dispute grant still fired against the person who answered). Only the person the team
--      asked closes a question.
--   9. A dispute follows how it was opened: dela_dispute_center_open says whether a dispute (or an offer's dispute) was
--      opened with the dispute center, so the other side can act on it whatever their own switch says.
--  10. A dispute settled on the last open milestone completes the engagement. Only someone still on the agreement can
--      withdraw. The review timer does not re-queue hourly while a question is open; the reply re-arms it. A dispute
--      opened with the dispute center sends a notice that describes its real steps.
-- Additive: same functions and arguments; one new function.
create or replace function dela_dispute_center_open(p_id uuid) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select exists (select 1 from disputes d where d.category <> '' and (d.id = p_id or d.id = (select o.dispute_id from dispute_offers o where o.id = p_id)))
$$;
revoke all on function dela_dispute_center_open(uuid) from public, anon, authenticated;

do $$
declare v_src text; v_new text;
begin
  -- 8 and 10: dela_dispute_say
  select pg_get_functiondef('dela_dispute_say(uuid,text,uuid,text,text,int)'::regprocedure) into v_src;
  v_new := replace(v_src, 'declare d disputes; v_role text; v_kind text;', 'declare d disputes; v_role text; v_kind text; v_asked boolean; v_due timestamptz;');
  v_new := replace(v_new, '  v_kind := case when d.question_open_at is not null then ''reply''
    when v_role <> dela_dispute_opener_role(d.id) and not exists (select 1 from dispute_statements x where x.dispute_id = d.id and x.kind = ''answer'') then ''answer'' else ''note'' end;',
    '  v_asked := d.question_open_at is not null and coalesce((select q.to_role in (''both'', v_role) from dispute_statements q
    where q.dispute_id = d.id and q.kind = ''question'' order by q.created_at desc limit 1), true);
  v_kind := case when v_role <> dela_dispute_opener_role(d.id) and not exists (select 1 from dispute_statements x where x.dispute_id = d.id and x.kind = ''answer'') then ''answer''
    when v_asked then ''reply'' else ''note'' end;');
  v_new := replace(v_new, '  elsif v_kind = ''reply'' then
    update disputes set question_open_at = null, review_due_at = dela_add_business_days(now(), dela_int_setting(''dispute.team_decision_business_days'', 10)) where id = d.id;',
    '  end if;
  if v_asked then
    v_due := dela_add_business_days(now(), dela_int_setting(''dispute.team_decision_business_days'', 10));
    update disputes set question_open_at = null, review_due_at = v_due where id = d.id;
    if d.status = ''team_review'' then
      perform dela_job_enqueue(''dispute_tick'', jsonb_build_object(''dispute_id'', d.id, ''kind'', ''review_due''), v_due, ''dispdue:'' || d.id::text || '':r'' || extract(epoch from now())::bigint, null);
    end if;');
  if v_new = v_src or position('v_asked := ' in v_new) = 0 or position('if v_asked then' in v_new) = 0 then raise exception 'dela_dispute_say: the text to change was not found'; end if;
  execute v_new;

  -- 10: the review timer waits while a question is open
  select pg_get_functiondef('dela_dispute_tick(jsonb)'::regprocedure) into v_src;
  v_new := replace(v_src, '    elsif d.status = ''team_review'' then', '    elsif d.status = ''team_review'' and d.question_open_at is null then');
  if v_new = v_src then raise exception 'dela_dispute_tick: the text to change was not found'; end if;
  execute v_new;

  -- 10: settling the last open milestone completes a fixed-fee engagement (monthly ones end by their own rules)
  select pg_get_functiondef('dela_dispute_settle_money(uuid,int,int,text,text,uuid)'::regprocedure) into v_src;
  v_new := replace(v_src, '  -- Repeat losses (automatic grants', '  if m.period_id is null and a.status in (''active'', ''paused'') and not exists (select 1 from milestones x where x.agreement_id = a.id and x.status not in (''accepted'', ''canceled'', ''refunded''))
     and exists (select 1 from milestones x where x.agreement_id = a.id and x.status = ''accepted'') then
    update agreements set status = ''completed'', completed_at = now(), updated_at = now() where id = a.id;
    perform dela_engagement_notify(a.id, ''both'', ''Engagement complete'', ''Every milestone is finished. Thank you for working on Lawfecta.'', ''complete'' || a.id::text);
  end if;
  -- Repeat losses (automatic grants');
  if v_new = v_src then raise exception 'dela_dispute_settle_money: the text to change was not found'; end if;
  execute v_new;

  -- 10: only someone still on the agreement can withdraw
  select pg_get_functiondef('dela_dispute_withdraw(uuid,uuid)'::regprocedure) into v_src;
  v_new := replace(v_src, '  if d.id is null or d.opened_by <> p_person then return jsonb_build_object(''ok'', false, ''reason'', ''not_found''); end if;',
    '  if d.id is null or d.opened_by <> p_person or (dela_agreement_role(p_person, ''attorney'', d.agreement_id) = '''' and dela_agreement_role(p_person, ''freelancer'', d.agreement_id) = '''') then
    return jsonb_build_object(''ok'', false, ''reason'', ''not_found'');
  end if;');
  if v_new = v_src then raise exception 'dela_dispute_withdraw: the text to change was not found'; end if;
  execute v_new;

  -- 10: the opening notice. dela_dispute_start marks the transaction, and dela_dispute_open then describes the new steps.
  select pg_get_functiondef('dela_dispute_open(uuid,text,uuid,uuid,text)'::regprocedure) into v_src;
  v_new := replace(v_src, ' days you can talk it through in Messages; the money in question stays held. After that the Lawfecta Team reviews it. Lawfecta is not a court or an arbitrator.'', ''dispute'' || v_id::text);',
    ' days you can talk it through in Messages; the money in question stays held. After that the Lawfecta Team reviews it. Lawfecta is not a court or an arbitrator.'', ''dispute'' || v_id::text);
  end if;');
  v_new := replace(v_new, '  perform dela_engagement_notify(a.id, ''both'', ''A dispute was opened'', ''A dispute was opened on this engagement: ''',
    '  if coalesce(current_setting(''dela.dispute_center'', true), '''') = ''1'' then
    perform dela_engagement_notify(a.id, ''both'', ''A dispute was opened'', ''A dispute was opened on this engagement: '' || left(p_reason, 300) || ''. The other side has '' || dela_int_setting(''dispute.answer_days'', 5) ||
      '' days to answer, and either side can send an offer to settle it. The money in question stays held. If it is not answered by the end of the '' || dela_int_setting(''risk.dispute_notice_days'', 14) ||
      ''-day notice period, the request is granted; otherwise the Lawfecta Team reviews it. Lawfecta is not a court or an arbitrator.'', ''dispute'' || v_id::text);
  else
  perform dela_engagement_notify(a.id, ''both'', ''A dispute was opened'', ''A dispute was opened on this engagement: ''');
  if position('dela.dispute_center' in v_new) = 0 or position('  end if;
  perform dela_alert(''disputes'', ''A dispute was opened''' in v_new) = 0 then raise exception 'dela_dispute_open: the text to change was not found'; end if;
  execute v_new;

  select pg_get_functiondef('dela_dispute_start(uuid,text,uuid,uuid,text,text,int,text)'::regprocedure) into v_src;
  v_new := replace(v_src, '  r := dela_dispute_open(p_person, p_side, p_agreement, p_milestone, p_reason);',
    '  perform set_config(''dela.dispute_center'', ''1'', true);
  r := dela_dispute_open(p_person, p_side, p_agreement, p_milestone, p_reason);
  perform set_config(''dela.dispute_center'', '''', true);');
  if v_new = v_src then raise exception 'dela_dispute_start: the text to change was not found'; end if;
  execute v_new;
end $$;

-- Pilot live check 2026-11-11. A finished engagement still offered "Approve this step" on an attorney decision that was
-- never reached, and the server accepted it. Now a closed engagement (completed or canceled) takes no more decisions.
-- Additive: same function, same arguments; one new refusal reason (agreement_closed).
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_checkpoint_act(uuid,text,uuid,int,text)'::regprocedure) into v_src;
  v_new := replace(v_src, '  select * into c from engagement_checkpoints where agreement_id = p_agreement and step_no = p_step for update;',
    '  if exists (select 1 from agreements where id = p_agreement and status in (''completed'', ''canceled'')) then return jsonb_build_object(''ok'', false, ''reason'', ''agreement_closed''); end if;
  select * into c from engagement_checkpoints where agreement_id = p_agreement and step_no = p_step for update;');
  if v_new = v_src then raise exception 'dela_checkpoint_act: the text to change was not found'; end if;
  execute v_new;
end $$;

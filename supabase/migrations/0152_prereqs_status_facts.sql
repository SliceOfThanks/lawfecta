-- Step 71: three gaps from the Lapt workflow handoff (Stacey 2026-11-20: "Yes, build them").
--   1. Prerequisites in a partial handoff: when the attorney hands over step 3 and keeps step 2, the result of
--      step 2 becomes something the freelancer needs before starting, supplied by the firm. DELA adds it to the
--      gig's list and takes it away again when the steps change. Nothing the attorney wrote or marked is touched.
--   2. Separate status facts on the workflow path: who signed, what is still needed, whether the work is paid.
--   3. "Stop" in the chat and the kept message are in the browser only.
-- Additive: one function, and more facts in dela_workflow's "eng".

-- p_items: [{"no": 2, "label": "Result of step 2, which the firm keeps: ..."}]. Lines DELA added earlier for steps
-- that are no longer prerequisites go, as long as they are still marked "needed" (a line someone marked stays).
create or replace function dela_gig_prereqs_sync(p_person uuid, p_gig uuid, p_items jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare g gigs; it jsonb; v_max int := dela_int_setting('gig.inputs_max', 20); v_added int := 0; v_gone int := 0; v_pos int;
begin
  select * into g from gigs where id = p_gig for update;
  if g.id is null or not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if g.status in ('closed', 'canceled') then return jsonb_build_object('ok', false, 'reason', 'gig_closed'); end if;
  if jsonb_typeof(p_items) <> 'array' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  delete from gig_inputs i where i.gig_id = p_gig and i.status = 'needed' and i.label ~ '^Result of step [0-9]+, which the firm keeps'
    and not exists (select 1 from jsonb_array_elements(p_items) x where split_part(x->>'label', ':', 1) = split_part(i.label, ':', 1));
  get diagnostics v_gone = row_count;
  select coalesce(max(pos), 0) into v_pos from gig_inputs where gig_id = p_gig;
  for it in select * from jsonb_array_elements(p_items) loop
    continue when length(trim(coalesce(it->>'label', ''))) = 0;
    continue when exists (select 1 from gig_inputs i where i.gig_id = p_gig and split_part(i.label, ':', 1) = split_part(it->>'label', ':', 1));
    exit when (select count(*) from gig_inputs where gig_id = p_gig) >= v_max;
    v_pos := v_pos + 1;
    insert into gig_inputs (gig_id, pos, kind, label, supplied_by, updated_by) values (p_gig, v_pos, 'information', left(trim(it->>'label'), 200), 'client', p_person);
    v_added := v_added + 1;
  end loop;
  return jsonb_build_object('ok', true, 'added', v_added, 'removed', v_gone);
end $$;
revoke all on function dela_gig_prereqs_sync(uuid, uuid, jsonb) from public, anon, authenticated;

create or replace function dela_patch(p_sig text, p_pairs text[]) returns void language plpgsql as $$
declare v_src text; v_new text; i int;
begin
  select pg_get_functiondef(p_sig::regprocedure) into v_src;
  v_new := v_src;
  for i in 1 .. array_length(p_pairs, 1) / 2 loop
    if position(p_pairs[i * 2] in v_new) > 0 and position(p_pairs[i * 2 - 1] in v_new) = 0 then continue; end if;
    if position(p_pairs[i * 2 - 1] in v_new) = 0 then raise exception '% changed; update 0152 (looking for: %)', p_sig, left(p_pairs[i * 2 - 1], 80); end if;
    v_new := replace(v_new, p_pairs[i * 2 - 1], p_pairs[i * 2]);
  end loop;
  if v_new <> v_src then execute v_new; end if;
end $$;

do $$ begin
  perform dela_patch('dela_workflow(uuid,text,uuid)', array[
    '''eng'', (select jsonb_build_object(''gig_id'', a.gig_id, ''status'', a.status,',
    '''eng'', (select jsonb_build_object(''gig_id'', a.gig_id, ''status'', a.status,
          ''client_signed'', exists (select 1 from agreement_signatures s where s.agreement_id = a.id and s.version = a.version and s.role = ''attorney''),
          ''freelancer_signed'', exists (select 1 from agreement_signatures s where s.agreement_id = a.id and s.version = a.version and s.role = ''freelancer''),
          ''plan_wait'', coalesce((dela_hire_gate(a.id)->>''needed'')::boolean, false),
          ''needs_total'', (select count(*) from gig_inputs i where i.gig_id = a.gig_id and i.status <> ''not_needed''),
          ''paid'', exists (select 1 from milestones m where m.agreement_id = a.id and m.funded_at is not null),
          ''accepted'', (select count(*) from milestones m where m.agreement_id = a.id and m.accepted_at is not null),
          ''milestones'', (select count(*) from milestones m where m.agreement_id = a.id and m.status <> ''canceled''),']);
end $$;
drop function if exists dela_patch(text, text[]);

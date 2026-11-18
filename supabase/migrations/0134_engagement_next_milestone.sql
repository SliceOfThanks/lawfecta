-- Step 37 (docs/briefs/step-37-projects-workspace.md): the Projects page shows each engagement's next milestone.
-- dela_engagements gains one field per engagement, "next": the first milestone that is not accepted, refunded or
-- canceled, with its number, title, due date and status. Read only. Additive: the same function and arguments, and
-- every earlier field is still returned.
do $do$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_engagements(uuid,text)'::regprocedure) into v_src;
  if position($k$'next', (select jsonb_build_object('seq'$k$ in v_src) > 0 then return; end if;
  v_new := replace(v_src,
    $a$'accepted', (select count(*) from milestones m where m.agreement_id = a.id and m.status = 'accepted'),$a$,
    $b$'accepted', (select count(*) from milestones m where m.agreement_id = a.id and m.status = 'accepted'),
      'next', (select jsonb_build_object('seq', m.seq, 'title', m.title, 'due_date', m.due_date, 'status', m.status) from milestones m
        where m.agreement_id = a.id and m.status not in ('accepted', 'canceled', 'refunded') order by m.seq limit 1),$b$);
  if v_new = v_src then raise exception 'dela_engagements: the accepted count was not found'; end if;
  execute v_new;
end $do$;
revoke all on function dela_engagements(uuid, text) from public, anon, authenticated;

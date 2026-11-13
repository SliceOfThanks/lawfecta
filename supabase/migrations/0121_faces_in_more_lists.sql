-- Step 28: the other person's picture in two more lists: engagements (both sides) and the freelancer's benches.
-- As in 0117: the list carries "face" (file path and ready-made picture), the API turns it into a short-lived link,
-- and the path never leaves the server. Only these additions; nothing else in the two functions changes.
do $mig$
declare v_def text; v_new text;
begin
  v_def := pg_get_functiondef('dela_engagements(uuid, text)'::regprocedure);
  if position('dela_face_of' in v_def) = 0 then
    v_new := replace(v_def, $a$'other_name', case when p_side = 'attorney' then (select display_name from people where id = a.freelancer_person)$a$,
      $b$'face', dela_face_of(case when p_side = 'attorney' then a.freelancer_person else a.attorney_person end, case when p_side = 'attorney' then 'freelancer' else 'attorney' end),
      'other_name', case when p_side = 'attorney' then (select display_name from people where id = a.freelancer_person)$b$);
    if v_new = v_def then raise exception 'dela_engagements: anchor not found'; end if;
    execute v_new;
  end if;
  v_def := pg_get_functiondef('dela_bench(uuid, text)'::regprocedure);
  if position('dela_face_of' in v_def) = 0 then
    v_new := replace(v_def, $a$'attorney', dela_person_name(coalesce(b.owner_person, b.invited_by), 'attorney'), 'thread_id'$a$,
      $b$'face', dela_face_of(coalesce(b.owner_person, b.invited_by), 'attorney'), 'attorney', dela_person_name(coalesce(b.owner_person, b.invited_by), 'attorney'), 'thread_id'$b$);
    if v_new = v_def then raise exception 'dela_bench: first anchor not found'; end if;
    v_def := v_new;
    v_new := replace(v_def, $a$'name', dela_person_name(b.freelancer_person, 'freelancer'), 'headline'$a$,
      $b$'face', dela_face_of(b.freelancer_person, 'freelancer'), 'name', dela_person_name(b.freelancer_person, 'freelancer'), 'headline'$b$);
    if v_new = v_def then raise exception 'dela_bench: second anchor not found'; end if;
    execute v_new;
  end if;
end $mig$;
revoke all on function dela_engagements(uuid, text) from public, anon, authenticated;
revoke all on function dela_bench(uuid, text) from public, anon, authenticated;

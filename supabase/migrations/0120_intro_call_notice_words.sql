-- Notices about an introductory call read naturally. Before, they said: A 30-minute meeting about "Introductory call"
-- is booked. Only the wording for a meeting with no gig changes; notices about gig meetings are word for word as before.
do $mig$
declare r record; v_def text; v_new text; v_pair text[];
begin
  for r in select * from (values
    ('dela_meeting_confirm(uuid, uuid)', array[
      array[$a$'A ' || m.length_min || '-minute meeting about "' || g.title || '" is booked. Open DELA$a$,
            $b$'A ' || m.length_min || case when m.gig_id is null then '-minute introductory call' else '-minute meeting about "' || g.title || '"' end || ' is booked. Open DELA$b$],
      array[$a$'The meeting about "' || g.title || '" has a new time.$a$,
            $b$case when m.gig_id is null then 'The introductory call' else 'The meeting about "' || g.title || '"' end || ' has a new time.$b$]]),
    ('dela_meeting_cancel(uuid, text, uuid, text)', array[
      array[$a$'The meeting about "' || g.title || '" was canceled'$a$,
            $b$case when m.gig_id is null then 'The introductory call' else 'The meeting about "' || g.title || '"' end || ' was canceled'$b$]]),
    ('dela_meeting_tick(jsonb)', array[
      array[$a$'Your meeting about "' || g.title || '" starts soon.$a$,
            $b$case when m.gig_id is null then 'Your introductory call' else 'Your meeting about "' || g.title || '"' end || ' starts soon.$b$],
      array[$a$'Tell DELA whether you met about "' || g.title || '" and write$a$,
            $b$case when m.gig_id is null then 'Tell DELA whether your introductory call happened' else 'Tell DELA whether you met about "' || g.title || '"' end || ' and write$b$]])
  ) as x(sig, pairs) loop
    v_def := pg_get_functiondef(r.sig::regprocedure);
    if position('introductory call' in v_def) > 0 then continue; end if;
    foreach v_pair slice 1 in array r.pairs loop
      v_new := replace(v_def, v_pair[1], v_pair[2]);
      if v_new = v_def then raise exception '%: anchor not found: %', r.sig, v_pair[1]; end if;
      v_def := v_new;
    end loop;
    execute v_def;
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end $mig$;

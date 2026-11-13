-- Step 24: the conversation before a gig shows the introductory call that is booked on it, so neither person has to
-- look for it in "Your meetings". Read only; the API asks only after the conversation's own access check passed.
create or replace function dela_intro_call_of(p_thread uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('id', m.id, 'start_at', m.start_at, 'end_at', m.end_at, 'length_min', m.length_min)
  from meetings m where m.intro_thread = p_thread and m.status = 'confirmed' and m.end_at > now() order by m.start_at limit 1
$$;
revoke all on function dela_intro_call_of(uuid) from public, anon, authenticated;

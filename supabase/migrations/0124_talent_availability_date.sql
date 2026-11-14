-- Step 29 follow-up (Stacey's review note 8, 2026-11-13: "State when availability was confirmed, when known").
-- The Talent search also returns the day each freelancer last confirmed their availability, so the card can say it.
-- Additive: one more field in each person of dela_talent_search; nothing is removed. Safe to run twice.
do $$
declare v_def text; v_new text;
begin
  v_def := pg_get_functiondef('dela_talent_search(uuid, jsonb)'::regprocedure);
  if position('''availability_confirmed_at'', mp.availability_confirmed_at' in v_def) = 0 then
    v_new := replace(v_def, '''availability'', mp.availability,', '''availability'', mp.availability, ''availability_confirmed_at'', mp.availability_confirmed_at,');
    if v_new = v_def then raise exception 'dela_talent_search: anchor not found'; end if;
    execute v_new;
  end if;
end $$;
revoke all on function dela_talent_search(uuid, jsonb) from public, anon, authenticated;

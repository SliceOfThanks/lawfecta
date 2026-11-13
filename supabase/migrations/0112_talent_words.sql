-- Step 22 (Stacey 2026-11-13, Talent revision package): the keyword box finds a freelancer when every typed word
-- appears somewhere in the profile, in any order ("clio texas family" no longer has to appear as one phrase).
-- Only the free-words condition of dela_talent_search changes; nothing is removed.
do $mig$
declare v_def text; v_new text;
begin
  v_def := pg_get_functiondef('dela_talent_search(uuid, jsonb)'::regprocedure);
  if position('regexp_split_to_table(v_q' in v_def) = 0 then
    v_new := replace(v_def, $r$and (v_q = '' or lower(concat_ws($r$, $r$and (v_q = '' or not exists (select 1 from regexp_split_to_table(v_q, '\s+') w where w <> '' and lower(concat_ws($r$);
    if v_new = v_def then raise exception 'dela_talent_search: first anchor not found'; end if;
    v_def := v_new;
    v_new := replace(v_def, $r$like '%' || v_q || '%')$r$, $r$not like '%' || w || '%'))$r$);
    if v_new = v_def then raise exception 'dela_talent_search: second anchor not found'; end if;
    execute v_new;
  end if;
end $mig$;
revoke all on function dela_talent_search(uuid, jsonb) from public, anon, authenticated;

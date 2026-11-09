-- MVP test 2026-11-09 (step 13): a Talent search for a skill found nobody because it looked only at the profile's
-- skills list. It now also matches the freelancer's services, headline and summary. Checked text patch; additive.
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('dela_talent_search(uuid, jsonb)'::regprocedure);
  n := replace(d,
    $a$(v_skill = '' or exists (select 1 from jsonb_array_elements_text(coalesce(mp.body->'skills', '[]')) s where lower(s) like '%' || v_skill || '%'))$a$,
    $a$(v_skill = '' or exists (select 1 from jsonb_array_elements_text(coalesce(mp.body->'skills', '[]')) s where lower(s) like '%' || v_skill || '%')
        or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(mp.body->'services') = 'array' then mp.body->'services' else '[]' end) sv
          where lower(coalesce(sv->>'title', '') || ' ' || coalesce(sv->>'for_whom', '')) like '%' || v_skill || '%')
        or lower(coalesce(mp.body->>'headline', '') || ' ' || coalesce(mp.body->>'summary', '')) like '%' || v_skill || '%')$a$);
  if n = d then raise exception 'talent search patch did not apply'; end if;
  execute n;
end $$;

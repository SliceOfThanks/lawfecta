-- Step 88c (Stacey 2026-11-24: a picture inside a text takes an optional caption; the tick that it shows no client
-- information stays required). The save of a picture record accepts an empty caption when the picture is placed inside
-- a text ("inline"). Checked text patch: one condition widened, nothing removed. Safe to run twice.
do $mig$
declare v_def text; v_new text;
begin
  v_def := pg_get_functiondef('dela_doc_image_save(jsonb)'::regprocedure);
  if position('p->>''inline''' in v_def) = 0 then
    v_new := replace(v_def, 'if v_cap = '''' then return', 'if v_cap = '''' and coalesce((p->>''inline'')::boolean, false) is not true then return');
    if v_new = v_def then raise exception 'dela_doc_image_save: anchor not found'; end if;
    execute v_new;
  end if;
end $mig$;
revoke all on function dela_doc_image_save(jsonb) from public, anon, authenticated;

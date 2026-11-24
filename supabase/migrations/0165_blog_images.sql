-- Step 85 (Stacey 2026-11-24, with a picture of the Blog: "blog need images above headings"). An article's picture is
-- copied with the article (the column bd_posts.image came with events, 0164), and the Blog's list now hands it over.
-- Only a picture stored on the Lawfecta website is kept. Checked text patch: one more field in the answer of
-- dela_blog_list, nothing removed. Safe to run twice.
do $$
declare v_def text; v_new text;
begin
  v_def := pg_get_functiondef('dela_blog_list(uuid, text, jsonb)'::regprocedure);
  if position('''image'', f.image' in v_def) = 0 then
    v_new := replace(v_def, '''topic'', f.topic,', '''topic'', f.topic, ''image'', f.image,');
    if v_new = v_def then raise exception 'dela_blog_list: anchor not found'; end if;
    execute v_new;
  end if;
end $$;
revoke all on function dela_blog_list(uuid, text, jsonb) from public, anon, authenticated;

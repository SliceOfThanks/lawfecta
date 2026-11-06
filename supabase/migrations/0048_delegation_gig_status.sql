-- Step 4d fix (Stacey's ChatGPT test 2026-11-06): the document's Automate or delegate card said "Gig drafted." after the
-- gig was posted. The card now gets each delegation's gig status. Guarded patch: stops if the function changed.
create or replace function dela_patch(p_sig text, p_pairs text[]) returns void language plpgsql as $$
declare v_src text; v_new text; i int;
begin
  select pg_get_functiondef(p_sig::regprocedure) into v_src;
  v_new := v_src;
  for i in 1 .. array_length(p_pairs, 1) / 2 loop
    if position(p_pairs[i * 2] in v_new) > 0 and position(p_pairs[i * 2 - 1] in v_new) = 0 then continue; end if;
    if position(p_pairs[i * 2 - 1] in v_new) = 0 then raise exception '% changed; update 0048 (looking for: %)', p_sig, left(p_pairs[i * 2 - 1], 80); end if;
    v_new := replace(v_new, p_pairs[i * 2 - 1], p_pairs[i * 2]);
  end loop;
  if v_new <> v_src then execute v_new; end if;
end $$;
do $$ begin
  perform dela_patch('dela_automate_state(uuid,uuid)', array[
    '''gig_id'', d.gig_id) order by d.created_at)', '''gig_id'', d.gig_id, ''gig_status'', (select g.status from gigs g where g.id = d.gig_id)) order by d.created_at)']);
end $$;
drop function if exists dela_patch(text, text[]);

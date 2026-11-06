-- Step 7c part 2 fix: a firm without a saved card can still hire from a standing arrangement.
-- The job's agreement keeps empty provider fields (they are NOT NULL), and the attorney pays on Stripe's page.
-- Off-session consent is recorded only when a saved card exists.

create or replace function dela_patch(p_sig text, p_pairs text[]) returns void language plpgsql as $$
declare v_src text; v_new text; i int;
begin
  select pg_get_functiondef(p_sig::regprocedure) into v_src;
  v_new := v_src;
  for i in 1 .. array_length(p_pairs, 1) / 2 loop
    if position(p_pairs[i * 2] in v_new) > 0 and position(p_pairs[i * 2 - 1] in v_new) = 0 then continue; end if;
    if position(p_pairs[i * 2 - 1] in v_new) = 0 then raise exception '% changed; update 0053 (looking for: %)', p_sig, left(p_pairs[i * 2 - 1], 80); end if;
    v_new := replace(v_new, p_pairs[i * 2 - 1], p_pairs[i * 2]);
  end loop;
  if v_new <> v_src then execute v_new; end if;
end $$;

do $$ begin
  perform dela_patch('dela_standing_hire_start(uuid,uuid,uuid,text)', array[
    'nullif(s.provider_customer, ''''), nullif(s.provider_payment_method, ''''), s.attorney_signed_at)',
    'coalesce(s.provider_customer, ''''), coalesce(s.provider_payment_method, ''''), case when coalesce(s.provider_payment_method, '''') <> '''' then s.attorney_signed_at end)'
  ]);
end $$;

drop function if exists dela_patch(text, text[]);

-- Step 68: free for freelancers until they are hired (Stacey 2026-11-20: "It is completely free for them to be on
-- the platform and get visibility, etc., but once they get hired, they need to have a subscription", and her yes to
-- the brief's recommended answers the same day).
-- One gate, at the freelancer's signature: a freelancer whose plan is below the plan named in the setting cannot
-- sign an agreement until they subscribe on the website. Nothing else changes: a free freelancer keeps their
-- profile, visibility and proposals; the attorney is charged only after both signed, as before; an engagement
-- already signed is never stopped by a lapsed plan, and its later change orders are not gated.
-- The setting ships empty (the rule is off) and is set to "plus" on the site with Stacey's yes.
-- Additive: two settings, three functions, one check added to dela_agreement_sign.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('fl.hire_min_tier', '""', 'The least plan a freelancer needs to accept a job (free until hired)', 'Freelancer plans', '', 'C', 'Stacey 2026-11-20 (step 68: "Yes, as recommended")', 'Empty turns the rule off. "plus", "pro" or "business" turns it on: a freelancer below that plan must subscribe before signing an agreement.'),
  ('fl.hire_gate_from', '""', 'Agreements started on or after this day follow the free until hired rule', 'Freelancer plans', '', 'C', 'Claude 2026-11-20 (step 68, question 8)', 'A date as YYYY-MM-DD. Agreements started before it are untouched. Empty means every agreement not yet signed.')
on conflict (key) do nothing;

-- The plan that counts for an agreement: the freelancer the agreement pays (for an agency, its owner's plan)
create or replace function dela_hire_gate(p_agreement uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare a agreements; v_min text := lower(btrim(dela_setting_text('fl.hire_min_tier', ''))); v_from text := btrim(dela_setting_text('fl.hire_gate_from', '')); v_tier text; v_signed boolean;
begin
  if v_min not in ('plus', 'pro', 'business') then return jsonb_build_object('on', false, 'needed', false); end if;
  select * into a from agreements where id = p_agreement;
  if a.id is null then return jsonb_build_object('on', true, 'needed', false); end if;
  select pl.tier into v_tier from side_profiles sp join plans pl on pl.code = sp.plan_code where sp.person_id = a.freelancer_person and sp.side = 'freelancer';
  v_signed := exists (select 1 from agreement_signatures s where s.agreement_id = a.id and s.role = 'freelancer');
  return jsonb_build_object('on', true,
    'needed', a.status in ('draft', 'sent', 'signing') and not v_signed
      and (v_from !~ '^\d{4}-\d{2}-\d{2}$' or a.created_at >= (v_from::date)::timestamp at time zone dela_tz())
      and dela_tier_rank(coalesce(v_tier, 'free')) < dela_tier_rank(v_min),
    'min_tier', v_min, 'tier', coalesce(v_tier, 'free'), 'sign_by', a.sign_by,
    'min_plan', (select name from plans where side = 'freelancer' and tier = v_min),
    'plans', (select coalesce(jsonb_agg(jsonb_build_object('code', pl.code, 'name', pl.name, 'tier', pl.tier, 'monthly_cents', pv.monthly_cents, 'annual_cents', pv.annual_cents) order by dela_tier_rank(pl.tier)), '[]')
      from plans pl join plan_versions pv on pv.plan_code = pl.code and pv.status = 'approved' where pl.side = 'freelancer' and dela_tier_rank(pl.tier) >= dela_tier_rank(v_min)),
    'upgrade_url', dela_setting_text('usage.upgrade_url', '/account/upgrade'));
end $$;
revoke all on function dela_hire_gate(uuid) from public, anon, authenticated;

-- For the freelancer's own pages: is the rule on, and would they have to subscribe at their next hire?
create or replace function dela_hire_gate_me(p_person uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select case when lower(btrim(dela_setting_text('fl.hire_min_tier', ''))) not in ('plus', 'pro', 'business') then jsonb_build_object('on', false)
    else jsonb_build_object('on', true, 'min_plan', (select name from plans where side = 'freelancer' and tier = lower(btrim(dela_setting_text('fl.hire_min_tier', '')))),
      'needs_plan', dela_tier_rank(coalesce((select pl.tier from side_profiles sp join plans pl on pl.code = sp.plan_code where sp.person_id = p_person and sp.side = 'freelancer'), 'free'))
        < dela_tier_rank(lower(btrim(dela_setting_text('fl.hire_min_tier', ''))))) end
$$;
revoke all on function dela_hire_gate_me(uuid) from public, anon, authenticated;

-- For the attorney's proposal list: which of these freelancers already hold a plan that can be hired at once
create or replace function dela_hire_ready(p_people uuid[]) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select case when lower(btrim(dela_setting_text('fl.hire_min_tier', ''))) not in ('plus', 'pro', 'business') then '{}'::jsonb
    else coalesce((select jsonb_object_agg(sp.person_id::text, true) from side_profiles sp join plans pl on pl.code = sp.plan_code
      where sp.side = 'freelancer' and sp.person_id = any(coalesce(p_people, '{}'::uuid[])) and dela_tier_rank(pl.tier) >= dela_tier_rank(lower(btrim(dela_setting_text('fl.hire_min_tier', ''))))), '{}'::jsonb) end
$$;
revoke all on function dela_hire_ready(uuid[]) from public, anon, authenticated;

-- Told once, right after the attorney chose: what to do to accept. Returns whether a notice went out.
create or replace function dela_hire_gate_notify(p_agreement uuid) returns boolean language plpgsql set search_path = public, extensions, pg_temp as $$
declare g jsonb := dela_hire_gate(p_agreement); a agreements;
begin
  if not coalesce((g->>'needed')::boolean, false) then return false; end if;
  select * into a from agreements where id = p_agreement;
  perform dela_notify(jsonb_build_object('person_id', a.freelancer_person, 'side', 'freelancer', 'kind', 'gig_selected', 'email', true, 'essential', true,
    'title', 'Start your subscription to accept this job',
    'body', 'You were chosen for "' || coalesce((select title from gigs where id = a.gig_id), 'a job') || '". Being on Lawfecta is free until you are hired. To accept this job, start a '
      || coalesce(g->>'min_plan', 'paid') || ' subscription or higher, then sign the agreement' || coalesce(' by ' || to_char(a.sign_by at time zone dela_tz(), 'FMMonth FMDD'), '') || '. The attorney is not charged until you have both signed.',
    'link', '/dela?tab=work&gig=' || a.gig_id || '&view=agreement', 'dedupe_key', 'hiregate:' || a.id));
  return true;
end $$;
revoke all on function dela_hire_gate_notify(uuid) from public, anon, authenticated;
create or replace function dela_hire_gate_notify_proposal(p_proposal uuid) returns boolean language sql set search_path = public, extensions, pg_temp as $$
  select coalesce((select dela_hire_gate_notify(a.id) from agreements a where a.proposal_id = p_proposal and a.status <> 'canceled' order by a.created_at desc limit 1), false)
$$;
revoke all on function dela_hire_gate_notify_proposal(uuid) from public, anon, authenticated;

create or replace function dela_patch(p_sig text, p_pairs text[]) returns void language plpgsql as $$
declare v_src text; v_new text; i int;
begin
  select pg_get_functiondef(p_sig::regprocedure) into v_src;
  v_new := v_src;
  for i in 1 .. array_length(p_pairs, 1) / 2 loop
    if position(p_pairs[i * 2] in v_new) > 0 and position(p_pairs[i * 2 - 1] in v_new) = 0 then continue; end if;
    if position(p_pairs[i * 2 - 1] in v_new) = 0 then raise exception '% changed; update 0149 (looking for: %)', p_sig, left(p_pairs[i * 2 - 1], 80); end if;
    v_new := replace(v_new, p_pairs[i * 2 - 1], p_pairs[i * 2]);
  end loop;
  if v_new <> v_src then execute v_new; end if;
end $$;

do $$ begin
  perform dela_patch('dela_agreement_sign(uuid,text,uuid,jsonb)', array[
    'if dela_has_hold(p_person) then return jsonb_build_object(''ok'', false, ''reason'', ''on_hold''); end if;',
    'if dela_has_hold(p_person) then return jsonb_build_object(''ok'', false, ''reason'', ''on_hold''); end if;
  -- Step 68: free until hired. A freelancer below the plan in fl.hire_min_tier subscribes before signing.
  if v_role = ''freelancer'' and coalesce((dela_hire_gate(p_agreement)->>''needed'')::boolean, false) then
    return jsonb_build_object(''ok'', false, ''reason'', ''plan_needed'', ''gate'', dela_hire_gate(p_agreement));
  end if;']);
end $$;
drop function if exists dela_patch(text, text[]);

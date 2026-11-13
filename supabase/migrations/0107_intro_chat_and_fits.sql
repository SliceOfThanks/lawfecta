-- Step 18 part 4 (docs/briefs/step-18-talent-marketplace.md, Stacey's decision 1 of 2026-11-12): an attorney can
-- start a conversation with a freelancer before any gig exists, and DELA suggests the freelancers who fit a document.
--   threads gets a third kind, "intro": the attorney's firm and the attorney who started it, no gig and no bench.
--     One conversation per firm and freelancer. Messages go through the same checks as every DELA conversation;
--     no files and no meetings (those belong to a gig). Either side can block it as in any conversation.
--   dela_intro_open: who may start one, and how many a day (setting intro.max_new_per_day).
--   dela_playbook_fits: match-ready freelancers who fit a document, scored like gig matching, with reasons.
-- Additive: two columns, one constraint made wider, two settings, two new functions, four functions changed in place.

alter table threads add column if not exists intro_org uuid references organizations(id);
alter table threads add column if not exists intro_attorney uuid references people(id);
alter table threads drop constraint if exists threads_gig_or_bench;
alter table threads add constraint threads_gig_or_bench check (num_nonnulls(gig_id, bench_id, intro_attorney) = 1 and (intro_attorney is null) = (intro_org is null));
create unique index if not exists threads_intro_once on threads (intro_org, freelancer_person) where intro_attorney is not null;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('intro.chat_on', 'true'::jsonb, 'Attorneys can start a conversation with a freelancer before a gig exists', 'Platform rules decided by Stacey', '', 'C',
    'Stacey 2026-11-12 (Talent revision, decision 1)', 'The conversation takes messages only: no files and no meetings until there is a gig. Every message is checked like any DELA message.'),
  ('intro.max_new_per_day', '10'::jsonb, 'New conversations before a gig one attorney can start in a day', 'Platform rules decided by Stacey', 'conversations', 'R',
    'Claude 2026-11-12 (step 18 part 4 default)', 'Keeps freelancers from being contacted in bulk. Conversations already open do not count.')
on conflict (key) do nothing;

-- Start (or find) the conversation. The attorney must be verified, as for posting a gig; the freelancer must be match-ready.
create or replace function dela_intro_open(p_person uuid, p_freelancer uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_org uuid := dela_side_org(p_person, 'attorney'); v_id uuid; v_max int := dela_int_setting('intro.max_new_per_day', 10); v_n int;
begin
  if dela_setting_text('intro.chat_on', 'true') <> 'true' or not dela_switch_on('gig_chat', p_person) then return jsonb_build_object('ok', false, 'reason', 'chat_off'); end if;
  if v_org is null or dela_firm_role(p_person, v_org) = '' then return jsonb_build_object('ok', false, 'reason', 'attorneys_only'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  if not exists (select 1 from side_profiles s where s.person_id = p_person and s.side = 'attorney' and s.status = 'active' and s.verification_state in ('verified', 'not_required')) then
    return jsonb_build_object('ok', false, 'reason', 'verify_first');
  end if;
  if p_freelancer is null or p_freelancer = p_person or not exists (select 1 from side_profiles s where s.person_id = p_freelancer and s.side = 'freelancer' and s.status = 'active') then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  select id into v_id from threads where intro_org = v_org and freelancer_person = p_freelancer and intro_attorney is not null;
  if v_id is not null then return jsonb_build_object('ok', true, 'thread_id', v_id, 'existing', true); end if;
  if not exists (select 1 from side_profiles s where s.person_id = p_freelancer and s.side = 'freelancer' and s.readiness_state = 'match_ready') or dela_has_hold(p_freelancer) then
    return jsonb_build_object('ok', false, 'reason', 'freelancer_not_available');
  end if;
  select count(*) into v_n from threads where intro_attorney = p_person and created_at > now() - interval '24 hours';
  if v_n >= v_max then return jsonb_build_object('ok', false, 'reason', 'limit_reached', 'limit', v_max); end if;
  insert into threads (freelancer_person, intro_org, intro_attorney) values (p_freelancer, v_org, p_person)
  on conflict (intro_org, freelancer_person) where intro_attorney is not null do nothing returning id into v_id;
  if v_id is null then select id into v_id from threads where intro_org = v_org and freelancer_person = p_freelancer and intro_attorney is not null; return jsonb_build_object('ok', true, 'thread_id', v_id, 'existing', true); end if;
  perform dela_audit('member', p_person, 'intro_chat_opened', 'thread', v_id::text, jsonb_build_object('freelancer', p_freelancer));
  return jsonb_build_object('ok', true, 'thread_id', v_id);
end $$;
revoke all on function dela_intro_open(uuid, uuid) from public, anon, authenticated;

do $mig$
declare v_def text; v_new text;
begin
  -- Who is in the conversation: the attorney who started it, and the owners and managers of that firm
  v_def := pg_get_functiondef('dela_thread_role'::regproc);
  if position('intro_attorney' in v_def) = 0 then
    v_new := replace(v_def, $r$      when p_side = 'freelancer' and t.freelancer_person = p_person then 'freelancer'$r$,
      $r$      when t.intro_attorney is not null and p_side = 'attorney' and (t.intro_attorney = p_person or dela_firm_role(p_person, t.intro_org) in ('owner', 'manager')) then 'attorney'
      when p_side = 'freelancer' and t.freelancer_person = p_person then 'freelancer'$r$);
    if v_new = v_def then raise exception 'dela_thread_role: anchor not found'; end if;
    execute v_new;
  end if;
  -- What it is called and who the attorney is
  v_def := pg_get_functiondef('dela_thread_ctx'::regproc);
  if position('intro_attorney' in v_def) = 0 then
    v_new := replace(v_def, $r$    else jsonb_build_object('kind', 'bench',$r$,
      $r$    when t.intro_attorney is not null then jsonb_build_object('kind', 'intro', 'title', 'Introduction from ' || coalesce(nullif(dela_person_name(t.intro_attorney, 'attorney'), ''), 'an attorney'),
      'org_id', t.intro_org, 'attorney', t.intro_attorney)
    else jsonb_build_object('kind', 'bench',$r$);
    if v_new = v_def then raise exception 'dela_thread_ctx: anchor not found'; end if;
    execute v_new;
  end if;
  -- Open for messages unless one side blocked it
  v_def := pg_get_functiondef('dela_thread_writable'::regproc);
  if position('intro_attorney' in v_def) = 0 then
    v_new := replace(v_def, $r$    when t.bench_id is not null then case$r$,
      $r$    when t.intro_attorney is not null then case when t.blocked_at is not null then 'blocked' else '' end
    when t.bench_id is not null then case$r$);
    if v_new = v_def then raise exception 'dela_thread_writable: anchor not found'; end if;
    execute v_new;
  end if;
  -- Messages only: files belong to a gig
  v_def := pg_get_functiondef('dela_message_send'::regproc);
  if position($r$in ('bench', 'intro')$r$ in v_def) = 0 then
    v_new := replace(v_def, $r$if c->>'kind' = 'bench' and cardinality(v_att) > 0 then$r$, $r$if c->>'kind' in ('bench', 'intro') and cardinality(v_att) > 0 then$r$);
    if v_new = v_def then raise exception 'dela_message_send: anchor not found'; end if;
    execute v_new;
  end if;
end $mig$;

-- Hours a week from a profile, whatever shape an old or hand-made profile has (a number, text, or nothing)
create or replace function dela_fit_hours(p_body jsonb) returns int language sql immutable set search_path = public, extensions, pg_temp as $$
  select case when (p_body->>'capacity_hours_week') ~ '^[0-9]{1,3}$' then (p_body->>'capacity_hours_week')::int else 0 end
$$;
revoke all on function dela_fit_hours(jsonb) from public, anon, authenticated;

-- The freelancers who fit a document, before any gig: the same points as gig matching (practice area, the tools its
-- steps name, hours free, active this week), for a member of the firm that owns the document.
create or replace function dela_playbook_fits(p_person uuid, p_playbook uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare pb playbooks; b jsonb; v_area text; v_state text; v_tools text[]; v_days int := dela_int_setting('profile.availability_days', 14); v_fair int := dela_int_setting('matching.fair_fit', 35);
begin
  select * into pb from playbooks where id = p_playbook;
  if pb.id is null or dela_firm_role(p_person, pb.org_id) = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('talent_search', p_person) then return jsonb_build_object('ok', true, 'on', false, 'people', '[]'::jsonb); end if;
  select body into b from playbook_versions where playbook_id = pb.id and version = coalesce(pb.approved_version, pb.current_version);
  v_area := coalesce(nullif(b->>'practice_area', ''), pb.practice_area, '');
  v_state := upper(coalesce(substring(coalesce(b->>'jurisdiction', '') from '\(([A-Za-z]{2})\)'), ''));
  -- A step names its tool as "tool" (older documents) or "system" (the document standard)
  v_tools := array(select distinct lower(coalesce(nullif(s->>'tool', ''), s->>'system')) from jsonb_array_elements(case when jsonb_typeof(b->'steps') = 'array' then b->'steps' else '[]' end) s
    where coalesce(nullif(s->>'tool', ''), s->>'system', '') <> '');
  return jsonb_build_object('ok', true, 'on', true, 'practice_area', v_area, 'people', (select coalesce(jsonb_agg(x.j order by x.fit desc, x.boost desc), '[]') from (
    select c.fit, c.boost, jsonb_build_object('person_id', c.person_id, 'name', c.name, 'headline', c.headline, 'reasons', to_jsonb(c.reasons), 'fit', case when c.fit >= dela_int_setting('matching.good_fit', 60) then 'Good fit' else 'Fair fit' end,
      'photo_file', c.photo_file, 'avatar', c.avatar, 'verification', c.verification, 'reviews', dela_review_summary(c.person_id, 'freelancer'), 'capacity_hours_week', c.cap, 'timezone', c.tz) j
    from (
      select sp.person_id, coalesce((dela_setting('matching.plan_boost') ->> sp.plan_code)::int, 0) boost,
        coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name) as name, mp.body->>'headline' as headline,
        mp.body->>'photo_file' as photo_file, mp.body->>'avatar' as avatar, sp.verification_state as verification, mp.body->'capacity_hours_week' as cap, mp.body->>'timezone' as tz,
        least(100, (case when v_area <> '' then 30 else 15 end)
          + least(30, 10 * (select count(*) from jsonb_array_elements_text(case when jsonb_typeof(mp.body->'software') = 'array' then mp.body->'software' else '[]' end) s where lower(s) = any(v_tools)))::int
          + least(15, dela_fit_hours(mp.body) * 15 / 20)
          + case when pe.last_seen_at > now() - interval '7 days' then 5 else 0 end) as fit,
        array_remove(array[
          nullif(v_area, ''),
          (select case when count(*) > 0 then 'Uses ' || string_agg(s, ' and ') end from (select s from jsonb_array_elements_text(case when jsonb_typeof(mp.body->'software') = 'array' then mp.body->'software' else '[]' end) s where lower(s) = any(v_tools) limit 3) t),
          case when dela_fit_hours(mp.body) > 0 then dela_fit_hours(mp.body)::text || ' hours a week free' end,
          case when pe.last_seen_at > now() - interval '7 days' then 'Active this week' end], null) as reasons
      from side_profiles sp join member_profiles mp on mp.person_id = sp.person_id and mp.side = 'freelancer' join people pe on pe.id = sp.person_id
      where sp.side = 'freelancer' and sp.status = 'active' and sp.readiness_state = 'match_ready' and sp.person_id <> p_person and not dela_has_hold(sp.person_id)
        and mp.availability <> 'unavailable' and mp.availability_confirmed_at > now() - make_interval(days => v_days)
        and (v_area = '' or mp.body->'practice_areas' ? v_area)
        and (v_state = '' or not exists (select 1 from jsonb_array_elements_text(case when jsonb_typeof(mp.body->'states_excluded') = 'array' then mp.body->'states_excluded' else '[]' end) s where upper(s) = v_state))
    ) c where c.fit >= v_fair order by c.fit desc, c.boost desc limit 5) x));
end $$;
revoke all on function dela_playbook_fits(uuid, uuid) from public, anon, authenticated;

-- Step 13: the DELA guide (docs/briefs/step-13-dela-guide.md, Stacey's answers 2026-11-09).
-- A proactive chat on the Dashboard. The next step is worked out every time from real data (nothing is guessed), so the
-- guide never asks for something already done. New gig alerts for freelancers go to the guide, email and Notices, each
-- one on or off. Behind the switches onboarding_widget and gig_alerts. Additive: new tables, functions and a trigger.

-- ---------- Settings and switches (from config/decisions.json) ----------
insert into settings (key, value, label, section, unit, status, source, note) values
  ('guide.ai_replies_per_day', '20'::jsonb, 'Free answers a member can get from the DELA guide each day', 'Guided setup', 'answers a day', 'R', 'Stacey 2026-11-09 (step 13 brief)', 'Lawfecta''s key; does not use DELA actions. The work the guide leads to counts as usual.'),
  ('guide.snooze_hours', '24'::jsonb, 'Hours the DELA guide stays closed after the member pauses it', 'Guided setup', 'hours', 'R', 'Stacey 2026-11-09 (step 13 brief)', 'It opens sooner when something new needs the member, such as a new gig that fits.'),
  ('gig_alerts.max_per_day', '3'::jsonb, 'New gig alerts a freelancer can get each day', 'Guided setup', 'alerts a day', 'R', 'Stacey 2026-11-09 (step 13 brief)', 'One alert per gig per freelancer.'),
  ('gig_alerts.min_reasons', '2'::jsonb, 'Match reasons a gig needs before a freelancer is alerted', 'Guided setup', 'reasons', 'R', 'Stacey 2026-11-09 (step 13 brief)', ''),
  ('gig_alerts.default_on', 'true'::jsonb, 'New gig alerts start on (guide, email and Notices)', 'Guided setup', 'on or off', 'R', 'Stacey 2026-11-09 (step 13 brief)', 'Each member can turn each channel off.')
on conflict (key) do nothing;
insert into feature_switches (key, label, gate) values ('gig_alerts', 'New gig alerts for freelancers in the guide, by email and in Notices (step 13)', 'Stacey turns it on for Live')
on conflict (key) do nothing;
update feature_switches set label = 'The DELA guide: a proactive chat on the Dashboard for attorneys and freelancers (step 13)', gate = 'Stacey turns it on for Live'
where key = 'onboarding_widget';

alter table ai_usage drop constraint if exists ai_usage_task_check;
alter table ai_usage add constraint ai_usage_task_check check (task in ('chat', 'file', 'voice', 'key_test', 'client_check', 'conduct_review', 'milestone_check', 'review_check', 'dispute_draft', 'guide'));

-- ---------- Tables ----------
create table if not exists guide_prefs (
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  alerts_in_guide boolean,
  alerts_email boolean,
  alerts_notices boolean,
  paused_until timestamptz,
  paused_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (person_id, side)
);
alter table guide_prefs enable row level security;

-- Append-only history of what the guide showed and what the member chose (feeds the admin card)
create table if not exists guide_events (
  id bigserial primary key,
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  kind text not null check (kind in ('shown', 'chose', 'paused', 'resumed', 'gig_seen', 'ai_reply', 'prefs')),
  step text not null default '',
  ref text not null default '',
  request_id text not null,
  created_at timestamptz not null default now(),
  unique (person_id, request_id)
);
alter table guide_events enable row level security;
create index if not exists guide_events_person on guide_events (person_id, side, kind, created_at desc);
create or replace trigger guide_events_no_change before update or delete on guide_events for each row execute function dela_no_change();

create table if not exists gig_alerts_sent (
  gig_id uuid not null references gigs(id),
  person_id uuid not null references people(id),
  channels text[] not null default '{}',
  sent_at timestamptz not null default now(),
  primary key (gig_id, person_id)
);
alter table gig_alerts_sent enable row level security;
create index if not exists gig_alerts_sent_person on gig_alerts_sent (person_id, sent_at desc);

-- ---------- Preferences ----------
create or replace function dela_guide_prefs(p_person uuid, p_side text) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'alerts_in_guide', coalesce(gp.alerts_in_guide, d.v), 'alerts_email', coalesce(gp.alerts_email, d.v), 'alerts_notices', coalesce(gp.alerts_notices, d.v),
    'paused_until', gp.paused_until, 'paused_at', gp.paused_at)
  from (select coalesce((dela_setting('gig_alerts.default_on') #>> '{}')::boolean, true) as v) d
  left join guide_prefs gp on gp.person_id = p_person and gp.side = p_side
$$;

create or replace function dela_guide_prefs_set(p_person uuid, p_side text, p jsonb) returns jsonb language plpgsql as $$
begin
  if p_side not in ('attorney', 'freelancer') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  insert into guide_prefs (person_id, side) values (p_person, p_side) on conflict do nothing;
  update guide_prefs set
    alerts_in_guide = case when p ? 'alerts_in_guide' then (p->>'alerts_in_guide')::boolean else alerts_in_guide end,
    alerts_email = case when p ? 'alerts_email' then (p->>'alerts_email')::boolean else alerts_email end,
    alerts_notices = case when p ? 'alerts_notices' then (p->>'alerts_notices')::boolean else alerts_notices end,
    updated_at = now()
  where person_id = p_person and side = p_side;
  insert into guide_events (person_id, side, kind, ref, request_id) values (p_person, p_side, 'prefs', left(p::text, 200), 'prefs:' || gen_random_uuid()::text);
  return jsonb_build_object('ok', true, 'prefs', dela_guide_prefs(p_person, p_side));
end $$;

-- ---------- The next best step ----------
-- Attorneys: pick a task, approve the playbook, mark what a freelancer can do, post the gig, invite, compare proposals.
-- Freelancers: finish the profile, the LinkedIn check, confirm availability, invitations, new gigs that fit.
create or replace function dela_guide_state(p_person uuid, p_side text) returns jsonb language plpgsql stable as $$
declare v_org uuid; pr jsonb := dela_guide_prefs(p_person, p_side); v_step text; v_facts jsonb := '{}'; v_new int := 0; v_cap int := dela_int_setting('guide.ai_replies_per_day', 20);
  v_used int; v_tz text := dela_setting_text('quota.timezone', 'America/Los_Angeles'); v_paused boolean; v_since timestamptz;
  d_pb record; a_pb record; dl record; g_draft record; g_open record; st jsonb; v_inv int; v_matches int; v_props int; v_min int := dela_int_setting('gig_alerts.min_reasons', 2);
begin
  if p_side not in ('attorney', 'freelancer') or not exists (select 1 from side_profiles where person_id = p_person and side = p_side) then
    return jsonb_build_object('ok', false, 'reason', 'no_side');
  end if;
  if not dela_switch_on('onboarding_widget', p_person) then return jsonb_build_object('ok', true, 'on', false); end if;
  select count(*) into v_used from guide_events where person_id = p_person and side = p_side and kind = 'ai_reply'
    and created_at >= (date_trunc('day', now() at time zone v_tz) at time zone v_tz);
  v_since := (pr->>'paused_at')::timestamptz;

  if p_side = 'attorney' then
    v_org := dela_side_org(p_person, 'attorney');
    select id, title, status into d_pb from playbooks where org_id = v_org and doc_type in ('sop', 'workflow', 'playbook') and status in ('draft', 'in_review') order by updated_at desc limit 1;
    select p.id, p.title into a_pb from playbooks p where p.org_id = v_org and p.doc_type in ('sop', 'workflow') and p.status = 'approved'
      and not exists (select 1 from delegations x where x.playbook_id = p.id and x.status <> 'canceled')
      and not exists (select 1 from gigs gg where gg.playbook_id = p.id and gg.status <> 'deleted') order by p.updated_at desc limit 1;
    select id, playbook_id, stage, title into dl from delegations where org_id = v_org and status = 'open' order by updated_at desc limit 1;
    select id, title into g_draft from gigs where org_id = v_org and status = 'draft' order by updated_at desc limit 1;
    select g.id, g.title, (select count(*) from gig_invitations i where i.gig_id = g.id) as invites,
      (select count(*) from proposals x where x.gig_id = g.id and x.status = 'sent') as props,
      (select count(*) from gig_matches m where m.gig_id = g.id) as matches
      into g_open from gigs g where g.org_id = v_org and g.status = 'open' order by g.opened_at desc limit 1;
    v_step := case
      when g_open.id is not null and g_open.props > 0 then 'review_proposals'
      when g_open.id is not null and g_open.invites = 0 and g_open.matches > 0 then 'invite'
      when g_draft.id is not null then case when coalesce((dela_attorney_eligibility(p_person)->>'can_post')::boolean, false) then 'post_gig' else 'verify' end
      when dl.id is not null then 'continue_delegation'
      when a_pb.id is not null then 'delegate'
      when d_pb.id is not null then 'approve_playbook'
      when not exists (select 1 from playbooks where org_id = v_org and status not in ('trash', 'deleted')) then 'pick_task'
      else 'next_task' end;
    v_facts := jsonb_build_object(
      'draft_playbook', case when d_pb.id is null then null else jsonb_build_object('id', d_pb.id, 'title', d_pb.title) end,
      'approved_playbook', case when a_pb.id is null then null else jsonb_build_object('id', a_pb.id, 'title', a_pb.title) end,
      'delegation', case when dl.id is null then null else jsonb_build_object('id', dl.id, 'playbook_id', dl.playbook_id, 'stage', dl.stage, 'title', dl.title) end,
      'draft_gig', case when g_draft.id is null then null else jsonb_build_object('id', g_draft.id, 'title', g_draft.title) end,
      'open_gig', case when g_open.id is null then null else jsonb_build_object('id', g_open.id, 'title', g_open.title, 'invites', g_open.invites, 'proposals', g_open.props, 'matches', g_open.matches) end,
      'lifecycles', (select coalesce(jsonb_agg(distinct lifecycle), '[]') from playbooks where org_id = v_org and status not in ('trash', 'deleted') and lifecycle <> ''),
      'practice_areas', coalesce((select f.body->'practice_areas' from firm_profiles f where f.org_id = v_org), '[]'));
    v_new := case when v_since is null then 0 else (select count(*) from proposals x join gigs g on g.id = x.gig_id where g.org_id = v_org and x.status = 'sent' and x.sent_at > v_since) end;
  else
    st := dela_profile_state(p_person, 'freelancer');
    select count(*) into v_inv from gig_invitations i join gigs g on g.id = i.gig_id where i.freelancer_id = p_person and i.status = 'sent' and g.status = 'open';
    select count(*) into v_matches from gig_matches m join gigs g on g.id = m.gig_id where m.person_id = p_person and g.status = 'open' and not g.paused_by_team
      and not exists (select 1 from proposals x where x.gig_id = g.id and x.freelancer_id = p_person and x.status <> 'draft');
    select count(*) into v_props from proposals x where x.freelancer_id = p_person and x.status <> 'draft';
    v_facts := jsonb_build_object('readiness', st->>'readiness', 'verification', st->>'verification', 'missing', st->'missing', 'score', st->'score',
      'availability_due_at', st->'availability_due_at', 'invitations', v_inv, 'matches', v_matches, 'proposals_sent', v_props,
      'new_gigs', case when coalesce((pr->>'alerts_in_guide')::boolean, true) then (select coalesce(jsonb_agg(x order by x->>'fit' desc), '[]') from (
        select jsonb_build_object('id', g.id, 'title', g.title, 'reasons', to_jsonb(m.reasons), 'fit', m.fit, 'closes_at', g.closes_at,
          'budget_min_cents', g.budget_min_cents, 'budget_max_cents', g.budget_max_cents) x
        from gig_matches m join gigs g on g.id = m.gig_id
        where m.person_id = p_person and g.status = 'open' and not g.paused_by_team and cardinality(m.reasons) >= v_min
          and not exists (select 1 from proposals x where x.gig_id = g.id and x.freelancer_id = p_person and x.status <> 'draft')
          and not exists (select 1 from guide_events e where e.person_id = p_person and e.side = 'freelancer' and e.kind = 'gig_seen' and e.ref = g.id::text)
        order by m.fit desc limit 3) t) else '[]'::jsonb end);
    v_new := jsonb_array_length(v_facts->'new_gigs');
    v_step := case
      when st->>'readiness' = 'restricted' then 'restricted'
      when st->>'readiness' = 'incomplete' then 'profile'
      when st->>'readiness' = 'verification_pending' and st->>'verification' in ('not_started', 'rejected') then 'verify_linkedin'
      when st->>'readiness' = 'availability_stale' or st->>'readiness' = 'unavailable' then 'availability'
      when v_inv > 0 then 'invitations'
      when v_new > 0 then 'new_gigs'
      when v_matches > 0 and v_props = 0 then 'first_proposal'
      when st->>'readiness' = 'verification_pending' then 'verify_waiting'
      else 'teach' end;
    if v_since is not null then
      v_new := (select count(*) from gig_matches m join gigs g on g.id = m.gig_id where m.person_id = p_person and g.status = 'open' and m.computed_at > v_since and cardinality(m.reasons) >= v_min)
        + (select count(*) from gig_invitations i where i.freelancer_id = p_person and i.created_at > v_since);
    end if;
  end if;
  -- Paused: closed until the pause ends, or until something new needs the member
  v_paused := (pr->>'paused_until') is not null and (pr->>'paused_until')::timestamptz > now() and coalesce(v_new, 0) = 0;
  return jsonb_build_object('ok', true, 'on', true, 'side', p_side, 'step', v_step, 'facts', v_facts, 'paused', v_paused, 'prefs', pr,
    'alerts_on', dela_switch_on('gig_alerts', p_person), 'replies_left', greatest(v_cap - v_used, 0), 'replies_cap', v_cap);
end $$;

-- What the member did in the guide. Each request is saved once (two tabs, double clicks).
create or replace function dela_guide_mark(p_person uuid, p_side text, p jsonb) returns jsonb language plpgsql as $$
declare v_kind text := coalesce(p->>'kind', ''); v_req text := left(coalesce(p->>'request_id', ''), 80); v_id bigint;
begin
  if p_side not in ('attorney', 'freelancer') or v_kind not in ('shown', 'chose', 'paused', 'resumed', 'gig_seen', 'ai_reply') or v_req = '' then
    return jsonb_build_object('ok', false, 'reason', 'bad_request');
  end if;
  if not dela_switch_on('onboarding_widget', p_person) then return jsonb_build_object('ok', false, 'reason', 'guide_off'); end if;
  if v_kind = 'gig_seen' and not exists (select 1 from gig_matches m where m.person_id = p_person and m.gig_id::text = p->>'ref') then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  insert into guide_events (person_id, side, kind, step, ref, request_id)
  values (p_person, p_side, v_kind, left(coalesce(p->>'step', ''), 40), left(coalesce(p->>'ref', ''), 200), v_req)
  on conflict (person_id, request_id) do nothing returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if v_kind in ('paused', 'resumed') then
    insert into guide_prefs (person_id, side) values (p_person, p_side) on conflict do nothing;
    update guide_prefs set paused_until = case when v_kind = 'paused' then now() + make_interval(hours => dela_int_setting('guide.snooze_hours', 24)) end,
      paused_at = case when v_kind = 'paused' then now() end, updated_at = now()
    where person_id = p_person and side = p_side;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- New gig alerts ----------
-- When a gig opens, the worker sends alerts a minute later (after matching ran). One alert per gig and freelancer.
create or replace function dela_gig_open_alerts() returns trigger language plpgsql as $$
begin
  if new.status = 'open' and old.status is distinct from 'open' then
    perform dela_job_enqueue('gig_alerts', jsonb_build_object('gig_id', new.id), now() + interval '1 minute', 'gigalert:' || new.id::text, new.created_by);
  end if;
  return new;
end $$;
create or replace trigger gigs_open_alerts after update of status on gigs for each row execute function dela_gig_open_alerts();

create or replace function dela_gig_alerts_send(p jsonb) returns jsonb language plpgsql as $$
declare g gigs; m record; pr jsonb; v_max int := dela_int_setting('gig_alerts.max_per_day', 3); v_min int := dela_int_setting('gig_alerts.min_reasons', 2);
  v_tz text := dela_setting_text('quota.timezone', 'America/Los_Angeles'); v_day timestamptz; v_sent int := 0; v_ch text[]; v_key text; v_mail uuid;
  v_title text; v_body text; v_link text;
begin
  select * into g from gigs where id = (p->>'gig_id')::uuid;
  if g.id is null or g.status <> 'open' or g.paused_by_team then return jsonb_build_object('ok', true, 'sent', 0); end if;
  v_day := date_trunc('day', now() at time zone v_tz) at time zone v_tz;
  for m in select gm.person_id, gm.reasons from gig_matches gm
      join side_profiles sp on sp.person_id = gm.person_id and sp.side = 'freelancer' and sp.status = 'active' and sp.readiness_state = 'match_ready'
      where gm.gig_id = g.id and cardinality(gm.reasons) >= v_min and not dela_has_hold(gm.person_id)
        and not exists (select 1 from proposals x where x.gig_id = g.id and x.freelancer_id = gm.person_id and x.status <> 'draft')
        and not exists (select 1 from gig_alerts_sent s where s.gig_id = g.id and s.person_id = gm.person_id)
      order by gm.fit desc loop
    if not dela_switch_on('gig_alerts', m.person_id) then continue; end if;
    if (select count(*) from gig_alerts_sent s where s.person_id = m.person_id and s.sent_at >= v_day) >= v_max then continue; end if;
    pr := dela_guide_prefs(m.person_id, 'freelancer');
    v_ch := array_remove(array[
      case when (pr->>'alerts_in_guide')::boolean then 'guide' end,
      case when (pr->>'alerts_notices')::boolean then 'notices' end,
      case when (pr->>'alerts_email')::boolean then 'email' end], null);
    if cardinality(v_ch) = 0 then continue; end if;
    insert into gig_alerts_sent (gig_id, person_id, channels) values (g.id, m.person_id, v_ch) on conflict do nothing;
    if not found then continue; end if;
    v_sent := v_sent + 1;
    v_title := left('A new gig fits you: ' || g.title, 200);
    v_body := 'Why it fits: ' || array_to_string(m.reasons, '; ') || '. Proposals close ' ||
      to_char(g.closes_at at time zone v_tz, 'FMMon FMDD') || '. Turn these alerts off in the DELA guide on your Dashboard.';
    v_link := '/dela?tab=work&gig=' || g.id::text;
    v_key := 'gigalert:' || g.id::text || ':' || m.person_id::text;
    if 'notices' = any(v_ch) then
      perform dela_notify(jsonb_build_object('person_id', m.person_id, 'side', 'freelancer', 'kind', 'gig_alert', 'email', 'email' = any(v_ch),
        'title', v_title, 'body', v_body, 'link', v_link, 'dedupe_key', v_key));
    elsif 'email' = any(v_ch) then
      insert into notifications (person_id, side, kind, channel, essential, title, body, link, dedupe_key)
      values (m.person_id, 'freelancer', 'gig_alert', 'email', false, v_title, v_body, v_link, v_key || ':email')
      on conflict (dedupe_key) do nothing returning id into v_mail;
      if v_mail is not null then perform dela_job_enqueue('send_email', jsonb_build_object('notification_id', v_mail), now(), 'email:' || v_mail::text, m.person_id); end if;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'sent', v_sent);
end $$;

-- ---------- Reminder emails on days 2 and 7 for unfinished first steps (onboarding.reminder_days) ----------
create or replace function dela_guide_daily() returns jsonb language plpgsql as $$
declare r record; d int; st jsonb; v_n int := 0;
begin
  for d in select (x #>> '{}')::int from jsonb_array_elements(coalesce(dela_setting('onboarding.reminder_days'), '[]')) x loop
    for r in select sp.person_id, sp.side from side_profiles sp
        where sp.status = 'active' and sp.created_at >= now() - make_interval(days => d + 1) and sp.created_at < now() - make_interval(days => d) loop
      if not dela_switch_on('onboarding_widget', r.person_id) or not coalesce((dela_guide_prefs(r.person_id, r.side)->>'alerts_email')::boolean, true) then continue; end if;
      st := dela_guide_state(r.person_id, r.side);
      if not coalesce((st->>'on')::boolean, false) or st->>'step' not in ('pick_task', 'approve_playbook', 'delegate', 'continue_delegation', 'post_gig', 'verify', 'profile', 'verify_linkedin', 'availability') then continue; end if;
      perform dela_notify(jsonb_build_object('person_id', r.person_id, 'side', r.side, 'kind', 'guide_reminder', 'email', true,
        'title', case when r.side = 'attorney' then 'Your first gig is a few minutes away' else 'A few minutes to get you into matches' end,
        'body', case when r.side = 'attorney' then 'The DELA guide on your Dashboard picks up where you left off: a playbook for one task, then a gig a freelancer can take on.'
          else 'The DELA guide on your Dashboard shows what is missing from your profile so attorneys can find and invite you.' end,
        'link', '/dela?tab=home', 'dedupe_key', 'guiderem:' || r.person_id::text || ':' || r.side || ':' || d));
      v_n := v_n + 1;
    end loop;
  end loop;
  return jsonb_build_object('ok', true, 'sent', v_n);
end $$;

-- ---------- The Lawfecta Team's view ----------
create or replace function dela_admin_guide_report(p_actor uuid) returns jsonb language plpgsql stable as $$
declare v_tz text := dela_setting_text('quota.timezone', 'America/Los_Angeles');
begin
  perform dela_require_staff(p_actor, array['support', 'reviewer', 'finance']);
  return jsonb_build_object('ok', true,
    'people', (select count(distinct (person_id, side)) from guide_events where kind = 'shown' and created_at > now() - interval '30 days'),
    'steps', (select coalesce(jsonb_object_agg(step, n), '{}') from (select step, count(distinct (person_id, side)) n from guide_events
      where kind = 'shown' and step <> '' and created_at > now() - interval '30 days' group by step) t),
    'chose', (select count(*) from guide_events where kind = 'chose' and created_at > now() - interval '30 days'),
    'paused', (select count(*) from guide_events where kind = 'paused' and created_at > now() - interval '30 days'),
    'ai_replies', (select count(*) from guide_events where kind = 'ai_reply' and created_at > now() - interval '30 days'),
    'alerts_today', (select count(*) from gig_alerts_sent where sent_at >= date_trunc('day', now() at time zone v_tz) at time zone v_tz));
end $$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_guide_prefs', 'dela_guide_prefs_set', 'dela_guide_state', 'dela_guide_mark', 'dela_gig_open_alerts',
      'dela_gig_alerts_send', 'dela_guide_daily', 'dela_admin_guide_report') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end $$;

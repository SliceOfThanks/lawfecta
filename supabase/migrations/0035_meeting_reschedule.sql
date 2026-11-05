-- Changing a meeting's time (track B test and Stacey, 2026-11-05):
-- 1. The new-time list showed the meeting's own current time, and booking any time near it said "Someone just took
--    that time", because the new time was checked against the meeting being moved. The list now leaves out the
--    current time, the check leaves out the meeting being moved, and choosing the same time is refused.
-- 2. The list stopped after the first 200 open times, so later days looked empty. It now returns the whole window.
-- Replaces four functions from 0029; nothing else changes.

create or replace function dela_open_times(p_freelancer uuid, p_attorney uuid, p_length int, p_except uuid default null) returns setof timestamptz language plpgsql stable as $$
declare a meeting_availability; v_from timestamptz := now() + make_interval(hours => dela_int_setting('meeting.min_notice_hours', 12));
  v_to timestamptz := now() + make_interval(days => dela_int_setting('meeting.window_days', 21));
begin
  select * into a from meeting_availability where person_id = p_freelancer;
  if a.person_id is null or not (p_length = any(a.lengths)) then return; end if;
  return query
    with days as (
      select d::date as day from generate_series((now() at time zone a.timezone)::date, (v_to at time zone a.timezone)::date, interval '1 day') d
    ), windows as (
      select day, (r->>0)::time as w_from, case when r->>1 = '24:00' then time '23:59:59' else (r->>1)::time end as w_to
      from days, jsonb_array_elements(coalesce(a.hours -> extract(isodow from day)::text, '[]')) r
      where not (day = any(a.days_off))
    ), starts as (
      select ((day + t) at time zone a.timezone) as s
      from windows, generate_series(timestamp '2000-01-01' + w_from, timestamp '2000-01-01' + w_to - make_interval(mins => p_length), interval '15 minutes') g, lateral (select g::time as t) x
    )
    select s from starts
    where s >= v_from and s <= v_to
      and (p_except is null or s <> (select m.start_at from meetings m where m.id = p_except))
      and not exists (select 1 from dela_person_busy(p_freelancer, s - interval '1 day', s + interval '1 day', p_except) b where b.b_start < s + make_interval(mins => p_length) and b.b_end > s)
      and not exists (select 1 from dela_person_busy(p_attorney, s - interval '1 day', s + interval '1 day', p_except) b where b.b_start < s + make_interval(mins => p_length) and b.b_end > s)
    order by s;
end $$;

create or replace function dela_meeting_hold(p_person uuid, p_side text, p jsonb) returns jsonb language plpgsql as $$
declare g gigs; v_free uuid; v_start timestamptz := (p->>'start_at')::timestamptz; v_len int := (p->>'length')::int; v_id uuid; v_att uuid; v_lock1 uuid; v_lock2 uuid; v_dup meetings;
begin
  if not dela_switch_on('meetings', p_person) then return jsonb_build_object('ok', false, 'reason', 'meetings_off'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  select * into g from gigs where id = (p->>'gig_id')::uuid;
  v_free := case when p_side = 'freelancer' then p_person else (p->>'freelancer')::uuid end;
  if g.id is null or (p_side = 'attorney' and not dela_gig_manager(p_person, g.id)) or v_free is null or not dela_gig_pair(g.id, v_free) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_has_hold(v_free) or exists (select 1 from threads t where t.gig_id = g.id and t.freelancer_person = v_free and t.blocked_at is not null) then return jsonb_build_object('ok', false, 'reason', 'not_available'); end if;
  select * into v_dup from meetings where booked_by = p_person and request_id = p->>'request_id';
  if v_dup.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_dup.id, 'status', v_dup.status, 'hold_expires_at', v_dup.hold_expires_at); end if;
  v_att := g.created_by;
  -- Both people are locked in a fixed order, so two bookings at once cannot both win the same time
  v_lock1 := least(v_att, v_free); v_lock2 := greatest(v_att, v_free);
  perform pg_advisory_xact_lock(hashtext('meet:' || v_lock1::text));
  perform pg_advisory_xact_lock(hashtext('meet:' || v_lock2::text));
  if (p->>'except') is not null and v_start = (select m.start_at from meetings m where m.id = (p->>'except')::uuid) then
    return jsonb_build_object('ok', false, 'reason', 'same_time');
  end if;
  if not exists (select 1 from dela_open_times(v_free, v_att, v_len, (p->>'except')::uuid) s where s = v_start) then
    return jsonb_build_object('ok', false, 'reason', 'time_taken', 'next', (select coalesce(jsonb_agg(s), '[]') from (select s from dela_open_times(v_free, v_att, v_len, (p->>'except')::uuid) s limit 5) x));
  end if;
  insert into meetings (gig_id, attorney_person, freelancer_person, booked_by, start_at, end_at, length_min, status, hold_expires_at, request_id)
  values (g.id, v_att, v_free, p_person, v_start, v_start + make_interval(mins => v_len), v_len, 'held', now() + make_interval(mins => dela_int_setting('meeting.hold_minutes', 10)), coalesce(p->>'request_id', gen_random_uuid()::text))
  returning id into v_id;
  insert into meeting_events (meeting_id, action, actor, detail) values (v_id, 'held', p_person, jsonb_build_object('start_at', v_start));
  return jsonb_build_object('ok', true, 'id', v_id, 'status', 'held', 'hold_expires_at', now() + make_interval(mins => dela_int_setting('meeting.hold_minutes', 10)));
end $$;

create or replace function dela_meeting_reschedule_hold(p_person uuid, p_side text, p_meeting uuid, p jsonb) returns jsonb language plpgsql as $$
declare m meetings; r jsonb;
begin
  select * into m from meetings where id = p_meeting;
  if m.id is null or not ((p_side = 'attorney' and dela_gig_manager(p_person, m.gig_id)) or (p_side = 'freelancer' and m.freelancer_person = p_person)) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if m.status <> 'confirmed' or m.start_at < now() then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  r := dela_meeting_hold(p_person, p_side, jsonb_build_object('gig_id', m.gig_id, 'freelancer', m.freelancer_person, 'start_at', p->>'start_at', 'length', coalesce(p->>'length', m.length_min::text), 'request_id', p->>'request_id', 'except', m.id));
  if coalesce((r->>'ok')::boolean, false) then update meetings set replaces = m.id where id = (r->>'id')::uuid and replaces is null; end if;
  return r;
end $$;

create or replace function dela_meeting_slots(p_person uuid, p_side text, p_gig uuid, p_freelancer uuid, p_length int, p_except uuid) returns jsonb language plpgsql stable as $$
declare g gigs; v_free uuid := case when p_side = 'freelancer' then p_person else p_freelancer end; a meeting_availability;
begin
  if not dela_switch_on('meetings', p_person) then return jsonb_build_object('ok', false, 'reason', 'meetings_off'); end if;
  select * into g from gigs where id = p_gig;
  if g.id is null or (p_side = 'attorney' and not dela_gig_manager(p_person, p_gig)) or not dela_gig_pair(p_gig, v_free) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into a from meeting_availability where person_id = v_free;
  if a.person_id is null then return jsonb_build_object('ok', true, 'no_availability', true, 'slots', '[]'::jsonb); end if;
  return jsonb_build_object('ok', true, 'timezone', a.timezone, 'lengths', to_jsonb(a.lengths), 'length', p_length,
    'slots', (select coalesce(jsonb_agg(s), '[]') from (select s from dela_open_times(v_free, g.created_by, p_length, p_except) s limit 2000) x));
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'dela_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

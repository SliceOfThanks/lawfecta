-- Step 23 (Stacey 2026-11-13, "build book a call before a gig"): an attorney books an introductory call with a
-- freelancer before any gig exists. The call belongs to the conversation the two already may have before a gig
-- (0107), so everything that conversation checks applies: a verified attorney, a match-ready freelancer, no blocks.
-- It uses the same availability, the same room and the same consent rule as a gig meeting. It hires nobody.
-- Additive: meetings.gig_id may now be empty when the meeting belongs to such a conversation; nothing is removed.

alter table meetings alter column gig_id drop not null;
alter table meetings add column if not exists intro_thread uuid references threads(id);
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'meetings_gig_or_intro') then
    alter table meetings add constraint meetings_gig_or_intro check (gig_id is not null or intro_thread is not null);
  end if;
end $c$;
create index if not exists meetings_intro on meetings (intro_thread) where intro_thread is not null;

-- One setting turns it off; the daily limit is the one already used for conversations before a gig (intro.max_new_per_day)
insert into settings (key, value) values ('intro.calls_on', 'true') on conflict (key) do nothing;

-- The attorney side of a meeting: whoever manages the gig, or, with no gig, the attorney the call is with
create or replace function dela_meeting_attorney_ok(p_person uuid, p_gig uuid, p_attorney uuid) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select case when p_gig is not null then dela_gig_manager(p_person, p_gig) else p_attorney = p_person end
$$;
revoke all on function dela_meeting_attorney_ok(uuid, uuid, uuid) from public, anon, authenticated;

-- May this person book or move a call on this conversation? Returns the conversation's two people, or a reason.
create or replace function dela_intro_call_ctx(p_person uuid, p_side text, p_thread uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare t threads; v_role text;
begin
  if not dela_switch_on('meetings', p_person) then return jsonb_build_object('ok', false, 'reason', 'meetings_off'); end if;
  if dela_setting_text('intro.calls_on', 'false') <> 'true' then return jsonb_build_object('ok', false, 'reason', 'intro_calls_off'); end if;
  select * into t from threads where id = p_thread;
  if t.id is null or t.intro_attorney is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_thread_role(p_person, p_side, p_thread);
  -- The attorney on the call is the one who started the conversation; firm colleagues can read it but not book for them
  if v_role = '' or (p_side = 'attorney' and t.intro_attorney <> p_person) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  if t.blocked_at is not null or dela_has_hold(t.freelancer_person) or dela_has_hold(t.intro_attorney) then return jsonb_build_object('ok', false, 'reason', 'not_available'); end if;
  if not exists (select 1 from side_profiles s where s.person_id = t.freelancer_person and s.side = 'freelancer' and s.status = 'active') then return jsonb_build_object('ok', false, 'reason', 'not_available'); end if;
  return jsonb_build_object('ok', true, 'attorney', t.intro_attorney, 'freelancer', t.freelancer_person, 'role', v_role);
end $$;
revoke all on function dela_intro_call_ctx(uuid, text, uuid) from public, anon, authenticated;

-- The freelancer's open times for an introductory call (the same answer shape as dela_meeting_slots)
create or replace function dela_intro_call_slots(p_person uuid, p_side text, p_thread uuid, p_length int, p_except uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare c jsonb := dela_intro_call_ctx(p_person, p_side, p_thread); a meeting_availability; v_free uuid; v_att uuid;
begin
  if not (c->>'ok')::boolean then return c; end if;
  v_free := (c->>'freelancer')::uuid; v_att := (c->>'attorney')::uuid;
  select * into a from meeting_availability where person_id = v_free;
  if a.person_id is null then return jsonb_build_object('ok', true, 'no_availability', true, 'slots', '[]'::jsonb); end if;
  return jsonb_build_object('ok', true, 'timezone', a.timezone, 'lengths', to_jsonb(a.lengths), 'length', p_length,
    'slots', (select coalesce(jsonb_agg(s), '[]') from (select s from dela_open_times(v_free, v_att, p_length, p_except) s limit 2000) x));
end $$;
revoke all on function dela_intro_call_slots(uuid, text, uuid, int, uuid) from public, anon, authenticated;

-- Hold a time for an introductory call. Only the attorney starts one; either person may move one that is booked
-- (p->>'except' names the call being moved). One upcoming call per conversation, and a daily limit for the attorney.
create or replace function dela_intro_call_hold(p_person uuid, p_side text, p_thread uuid, p jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare c jsonb := dela_intro_call_ctx(p_person, p_side, p_thread); v_free uuid; v_att uuid; v_start timestamptz := (p->>'start_at')::timestamptz; v_len int := (p->>'length')::int;
  v_except uuid := (p->>'except')::uuid; v_id uuid; v_dup meetings; v_max int := dela_int_setting('intro.max_new_per_day', 10); v_hold int := dela_int_setting('meeting.hold_minutes', 10);
begin
  if not (c->>'ok')::boolean then return c; end if;
  v_free := (c->>'freelancer')::uuid; v_att := (c->>'attorney')::uuid;
  if v_except is null and p_side <> 'attorney' then return jsonb_build_object('ok', false, 'reason', 'attorneys_only'); end if;
  select * into v_dup from meetings where booked_by = p_person and request_id = p->>'request_id';
  if v_dup.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_dup.id, 'status', v_dup.status, 'hold_expires_at', v_dup.hold_expires_at); end if;
  if v_except is null then
    if exists (select 1 from meetings m where m.intro_thread = p_thread and m.status = 'confirmed' and m.end_at > now()) then return jsonb_build_object('ok', false, 'reason', 'intro_call_booked'); end if;
    if (select count(*) from meetings m where m.intro_thread is not null and m.booked_by = p_person and m.replaces is null and m.status in ('confirmed', 'completed', 'no_show', 'canceled') and m.created_at > now() - interval '24 hours') >= v_max then
      return jsonb_build_object('ok', false, 'reason', 'limit_reached', 'limit', v_max);
    end if;
  end if;
  -- Both people are locked in a fixed order, so two bookings at once cannot both win the same time
  perform pg_advisory_xact_lock(hashtext('meet:' || least(v_att, v_free)::text));
  perform pg_advisory_xact_lock(hashtext('meet:' || greatest(v_att, v_free)::text));
  if v_except is not null and v_start = (select m.start_at from meetings m where m.id = v_except) then return jsonb_build_object('ok', false, 'reason', 'same_time'); end if;
  if not exists (select 1 from dela_open_times(v_free, v_att, v_len, v_except) s where s = v_start) then
    return jsonb_build_object('ok', false, 'reason', 'time_taken', 'next', (select coalesce(jsonb_agg(s), '[]') from (select s from dela_open_times(v_free, v_att, v_len, v_except) s limit 5) x));
  end if;
  insert into meetings (gig_id, intro_thread, attorney_person, freelancer_person, booked_by, start_at, end_at, length_min, status, hold_expires_at, request_id)
  values (null, p_thread, v_att, v_free, p_person, v_start, v_start + make_interval(mins => v_len), v_len, 'held', now() + make_interval(mins => v_hold), coalesce(p->>'request_id', gen_random_uuid()::text))
  returning id into v_id;
  insert into meeting_events (meeting_id, action, actor, detail) values (v_id, 'held', p_person, jsonb_build_object('start_at', v_start, 'intro_thread', p_thread));
  return jsonb_build_object('ok', true, 'id', v_id, 'status', 'held', 'hold_expires_at', now() + make_interval(mins => v_hold));
end $$;
revoke all on function dela_intro_call_hold(uuid, text, uuid, jsonb) from public, anon, authenticated;

-- The functions every meeting goes through learn that a meeting may have no gig. Each change is a small, exact
-- replacement in the function as it stands; a missing anchor stops the migration.
do $mig$
declare r record; v_def text; v_new text; v_pair text[];
begin
  for r in select * from (values
    ('dela_meeting_confirm(uuid, uuid)', array[
      array[$a$select * into g from gigs where id = m.gig_id;$a$, $b$select * into g from gigs where id = m.gig_id; if g.id is null then g.title := 'Introductory call'; end if;$b$]]),
    ('dela_meeting_cancel(uuid, text, uuid, text)', array[
      array[$a$dela_gig_manager(p_person, m.gig_id)$a$, $b$dela_meeting_attorney_ok(p_person, m.gig_id, m.attorney_person)$b$],
      array[$a$select * into g from gigs where id = m.gig_id;$a$, $b$select * into g from gigs where id = m.gig_id; if g.id is null then g.title := 'Introductory call'; end if;$b$],
      array[$a$You can book a new time on the gig.$a$, $b$You can book a new time in DELA.$b$]]),
    ('dela_meeting_consent(uuid, text, uuid, boolean)', array[
      array[$a$dela_gig_manager(p_person, m.gig_id)$a$, $b$dela_meeting_attorney_ok(p_person, m.gig_id, m.attorney_person)$b$]]),
    ('dela_meeting_followup(uuid, text, uuid, boolean, text)', array[
      array[$a$dela_gig_manager(p_person, m.gig_id)$a$, $b$dela_meeting_attorney_ok(p_person, m.gig_id, m.attorney_person)$b$],
      array[$a$'gig_title', (select title from gigs where id = m.gig_id)$a$, $b$'gig_title', coalesce((select title from gigs where id = m.gig_id), 'Introductory call')$b$]]),
    ('dela_meeting_tick(jsonb)', array[
      array[$a$select * into g from gigs where id = m.gig_id;$a$, $b$select * into g from gigs where id = m.gig_id; if g.id is null then g.title := 'Introductory call'; end if;$b$]]),
    ('dela_meeting_for_job(uuid)', array[
      array[$a$'gig_title', g.title$a$, $b$'gig_title', coalesce(g.title, 'Introductory call')$b$],
      array[$a$from meetings m join gigs g on g.id = m.gig_id$a$, $b$from meetings m left join gigs g on g.id = m.gig_id$b$]]),
    ('dela_meetings(uuid, text, uuid, uuid)', array[
      array[$a$'gig_title', g.title,$a$, $b$'gig_title', coalesce(g.title, 'Introductory call'), 'intro_thread', m.intro_thread,$b$],
      array[$a$from meetings m join gigs g on g.id = m.gig_id$a$, $b$from meetings m left join gigs g on g.id = m.gig_id$b$],
      array[$a$dela_gig_manager(p_person, m.gig_id)$a$, $b$dela_meeting_attorney_ok(p_person, m.gig_id, m.attorney_person)$b$]]),
    ('dela_admin_meetings(uuid)', array[
      array[$a$'gig_title', g.title, 'start_at'$a$, $b$'gig_title', coalesce(g.title, 'Introductory call'), 'start_at'$b$],
      array[$a$from meetings m join gigs g on g.id = m.gig_id join people pa$a$, $b$from meetings m left join gigs g on g.id = m.gig_id join people pa$b$]]),
    ('dela_meeting_reschedule_hold(uuid, text, uuid, jsonb)', array[
      array[$a$dela_gig_manager(p_person, m.gig_id)$a$, $b$dela_meeting_attorney_ok(p_person, m.gig_id, m.attorney_person)$b$],
      array[$a$r := dela_meeting_hold(p_person, p_side, jsonb_build_object('gig_id', m.gig_id,$a$,
            $b$if m.gig_id is null then
    r := dela_intro_call_hold(p_person, p_side, m.intro_thread, jsonb_build_object('start_at', p->>'start_at', 'length', coalesce(p->>'length', m.length_min::text), 'request_id', p->>'request_id', 'except', m.id));
    if coalesce((r->>'ok')::boolean, false) then update meetings set replaces = m.id where id = (r->>'id')::uuid and replaces is null; end if;
    return r;
  end if;
  r := dela_meeting_hold(p_person, p_side, jsonb_build_object('gig_id', m.gig_id,$b$]]),
    ('dela_thread_block(uuid, text, uuid, boolean)', array[
      array[$a$where gig_id = t.gig_id and freelancer_person = t.freelancer_person and status in ('held', 'confirmed') and start_at > now();$a$,
            $b$where (gig_id = t.gig_id or intro_thread = t.id) and freelancer_person = t.freelancer_person and status in ('held', 'confirmed') and start_at > now();$b$]])
  ) as x(sig, pairs) loop
    v_def := pg_get_functiondef(r.sig::regprocedure);
    if position('dela_meeting_attorney_ok' in v_def) > 0 or position('Introductory call' in v_def) > 0 or position('intro_thread' in v_def) > 0 then continue; end if;
    foreach v_pair slice 1 in array r.pairs loop
      v_new := replace(v_def, v_pair[1], v_pair[2]);
      if v_new = v_def then raise exception '%: anchor not found: %', r.sig, v_pair[1]; end if;
      v_def := v_new;
    end loop;
    execute v_def;
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end $mig$;

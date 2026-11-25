-- Step 93: what the audit of 2026-11-25 found, fixed (docs/briefs/step-93-audit-fixes.md).
-- 1. A member the move made or linked gets no email from DELA until they have signed in once.
-- 2. A freelancer's last name: the job's file activity shortens it, and being added to an attorney's Library no
--    longer shows it. Only hiring does.
-- 3. Stripe: a late notice cannot move a finished payment backwards, and a chargeback is written to the ledger once.
-- 4. The six-hour check: what it finds in the database, where its results are kept, and who is told.
-- Additive: new functions, one new table, one new setting; older functions get one expression changed.

-- ---------- 1. No email to a moved member who has never signed in ----------
create or replace function dela_move_quiet(p_person uuid) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select exists (select 1 from move_links ml join people pe on pe.bd_member_id = ml.new_id where pe.id = p_person and ml.status = 'done')
     and not exists (select 1 from sessions s where s.person_id = p_person)
$$;
revoke all on function dela_move_quiet(uuid) from public, anon, authenticated;

-- The notice in DELA is still written, so it is there at the first sign-in. Only the email is left out.
create or replace function dela_notify(p jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_in uuid; v_mail uuid; v_person uuid := (p->>'person_id')::uuid; v_key text := p->>'dedupe_key';
begin
  if v_person is null or coalesce(v_key, '') = '' or coalesce(p->>'title', '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  insert into notifications (person_id, side, kind, channel, essential, title, body, link, dedupe_key)
  values (v_person, p->>'side', coalesce(p->>'kind', 'general'), 'in_app', coalesce((p->>'essential')::boolean, false),
          left(p->>'title', 200), left(coalesce(p->>'body', ''), 2000), left(coalesce(p->>'link', ''), 500), v_key || ':in_app')
  on conflict (dedupe_key) do nothing returning id into v_in;
  if coalesce((p->>'email')::boolean, false) and not dela_move_quiet(v_person) then
    insert into notifications (person_id, side, kind, channel, essential, title, body, link, dedupe_key)
    values (v_person, p->>'side', coalesce(p->>'kind', 'general'), 'email', coalesce((p->>'essential')::boolean, false),
            left(p->>'title', 200), left(coalesce(p->>'body', ''), 2000), left(coalesce(p->>'link', ''), 500), v_key || ':email')
    on conflict (dedupe_key) do nothing returning id into v_mail;
    if v_mail is not null then
      perform dela_job_enqueue('send_email', jsonb_build_object('notification_id', v_mail), now(), 'email:' || v_mail::text, v_person);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'in_app_id', v_in, 'email_id', v_mail);
end $$;
revoke all on function dela_notify(jsonb) from public, anon, authenticated;

-- The Pro trial never starts for a member the move made: they are on the plan the owner chose, free until 2027
create or replace function dela_move_made(p_bd bigint) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select exists (select 1 from move_links ml where ml.new_id = p_bd and ml.how = 'created' and ml.status = 'done')
$$;
revoke all on function dela_move_made(bigint) from public, anon, authenticated;

-- ---------- 2. Last names ----------
-- Being in an attorney's Library or firm no longer shows a freelancer's last name: an attorney could add anyone there
-- without asking them. People in the same agency still see each other's names, and so does anyone who hired them.
create or replace function dela_sees_full_name(p_viewer uuid, p_person uuid) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select not dela_switch_on('hide_last_names', p_viewer) or (p_viewer is not null and (p_viewer = p_person
    or not exists (select 1 from side_profiles sp where sp.person_id = p_person and sp.side = 'freelancer')
    or dela_is_staff(p_viewer)
    or exists (select 1 from org_members a join org_members b on b.org_id = a.org_id join organizations g on g.id = a.org_id
               where a.person_id = p_viewer and a.status = 'active' and b.person_id = p_person and b.status = 'active' and g.kind = 'agency')
    or exists (select 1 from organizations o join org_members b on b.org_id = o.id where o.owner_person_id = p_viewer and b.person_id = p_person and b.status = 'active' and o.kind = 'agency')
    -- the freelancer's own team or Library: they chose who is in it
    or exists (select 1 from organizations o join org_members a on a.org_id = o.id where o.owner_person_id = p_person and a.person_id = p_viewer and a.status = 'active')
    -- on the viewer's bench (an attorney's bench needs finished work together; an agency's bench a signed fee split)
    or exists (select 1 from bench_members bm where bm.freelancer_person = p_person and bm.status = 'active' and (bm.owner_person = p_viewer
         or bm.org_id in (select m.org_id from org_members m where m.person_id = p_viewer and m.status = 'active')
         or bm.org_id in (select o.id from organizations o where o.owner_person_id = p_viewer)))
    or exists (select 1 from agency_bench ab where ab.freelancer_person = p_person and ab.status = 'active' and (
         ab.org_id in (select m.org_id from org_members m where m.person_id = p_viewer and m.status = 'active')
         or ab.org_id in (select o.id from organizations o where o.owner_person_id = p_viewer)))
    or dela_hired_by(p_viewer, p_person)))
$$;
revoke all on function dela_sees_full_name(uuid, uuid) from public, anon, authenticated;

-- A name as this viewer may read it, for lists that carry a name without the person's id next to it
create or replace function dela_name_seen(p_viewer uuid, p_person uuid, p_name text) returns text language sql stable set search_path = public, extensions, pg_temp as $$
  select case when p_person is null then p_name when dela_sees_full_name(p_viewer, p_person) then p_name else dela_short_name(p_person) end
$$;
revoke all on function dela_name_seen(uuid, uuid, text) from public, anon, authenticated;

create or replace function dela_patch(p_sig text, p_pairs text[]) returns void language plpgsql as $$
declare v_src text; v_new text; i int;
begin
  select pg_get_functiondef(p_sig::regprocedure) into v_src;
  v_new := v_src;
  for i in 1 .. array_length(p_pairs, 1) / 2 loop
    if position(p_pairs[i * 2] in v_new) > 0 and position(p_pairs[i * 2 - 1] in replace(v_new, p_pairs[i * 2], '')) = 0 then continue; end if;
    if position(p_pairs[i * 2 - 1] in v_new) = 0 then raise exception '% changed; update 0170 (looking for: %)', p_sig, left(p_pairs[i * 2 - 1], 80); end if;
    v_new := replace(v_new, p_pairs[i * 2 - 1], p_pairs[i * 2]);
  end loop;
  if v_new <> v_src then execute v_new; end if;
end $$;

-- The job's file activity (who opened or downloaded what): the name follows the same rule as everywhere else
select dela_patch('dela_job_activity(uuid,text,uuid)', array[
  $a$'who', pe.display_name, 'action', 'download'$a$, $b$'who', dela_name_seen(p_person, pe.id, pe.display_name), 'action', 'download'$b$,
  $a$'who', coalesce(pe.display_name, 'DELA'), 'action', l.action$a$, $b$'who', coalesce(dela_name_seen(p_person, pe.id, pe.display_name), 'DELA'), 'action', l.action$b$]);

-- ---------- 3. Stripe notices that arrive late or twice ----------
-- Stripe does not promise the order of its notices. A payment that already failed or succeeded stays that way when a
-- late "processing" arrives; before, the attorney was then told a payment was under way and could not pay again.
select dela_patch('dela_payment_result(uuid,text,text,text,text,text)', array[
  $a$update payments set status = 'processing', provider_ref = coalesce(nullif(p_ref, ''), provider_ref), updated_at = now() where id = p.id;$a$,
  $b$update payments set status = 'processing', provider_ref = coalesce(nullif(p_ref, ''), provider_ref), updated_at = now() where id = p.id and status not in ('succeeded', 'failed', 'canceled');$b$]);

create or replace function dela_payment_ref(p_payment uuid, p_ref text, p_url text, p_status text) returns void language sql set search_path = public, extensions, pg_temp as $$
  update payments set provider_ref = coalesce(nullif(p_ref, ''), provider_ref), checkout_url = coalesce(nullif(p_url, ''), checkout_url),
    status = case when status in ('succeeded', 'failed', 'canceled') then status else coalesce(nullif(p_status, ''), status) end, updated_at = now() where id = p_payment
$$;
revoke all on function dela_payment_ref(uuid, text, text, text) from public, anon, authenticated;

-- A chargeback notice that Stripe sends again writes the ledger once
select dela_patch('dela_chargeback_event(text,text,text,integer,text)', array[
  $a$if a.id is not null then perform dela_ledger(a.id, p.milestone_id, 'chargeback', -coalesce(p_amount, 0), p_ref, 'Card holder disputed the charge'); end if;$a$,
  $b$if a.id is not null and not exists (select 1 from ledger_entries le where le.kind = 'chargeback' and le.provider_ref = p_ref) then perform dela_ledger(a.id, p.milestone_id, 'chargeback', -coalesce(p_amount, 0), p_ref, 'Card holder disputed the charge'); end if;$b$]);

drop function if exists dela_patch(text, text[]);

-- ---------- 4. The six-hour check ----------
insert into settings (key, value, label, section, unit, status, source, note) values
  ('health.check_hours', '6'::jsonb, 'Hours between two checks of Stripe, the website and the database', 'Monitoring', 'hours', 'C', 'Stacey 2026-11-25',
    'Once every six hours, with an email to the owner when something is wrong.')
on conflict (key) do nothing;

create table if not exists health_runs (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  trigger text not null default 'timer' check (trigger in ('timer', 'manual')),
  ok boolean not null default true,
  checks jsonb not null default '[]',
  issues jsonb not null default '[]'
);
alter table health_runs enable row level security;
create index if not exists health_runs_at on health_runs (at desc);

-- Queues the next check when its time has come (the worker asks every minute; the key lets one through per period)
create or replace function dela_health_due() returns void language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_h int := greatest(1, least(24, dela_int_setting('health.check_hours', 6))); v_now timestamp := now() at time zone 'utc';
begin
  if dela_setting_text('environment', 'staging') <> 'live' then return; end if;
  perform dela_job_enqueue('health_check', jsonb_build_object('trigger', 'timer'), now(),
    'health_check:' || to_char(v_now, 'YYYYMMDD') || ':' || (extract(hour from v_now)::int / v_h)::text, null);
end $$;
revoke all on function dela_health_due() from public, anon, authenticated;

-- What the database itself shows. Each line: a code, a title, what to do, and whether to say it again tomorrow.
create or replace function dela_health_db() returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v jsonb := '[]'; n int; m int;
begin
  select count(*) into n from jobs where status = 'dead' and updated_at > now() - interval '24 hours';
  if n > 0 then v := v || jsonb_build_object('code', 'jobs_dead', 'title', n || ' background job' || case when n = 1 then '' else 's' end || ' failed for good',
    'body', 'A job failed every try in the last 24 hours. Open the admin area, Jobs, and read "Problems"; the last error says why.'); end if;
  select count(*) into n from jobs where status in ('queued', 'delayed') and run_at < now() - interval '30 minutes';
  if n > 0 then v := v || jsonb_build_object('code', 'jobs_waiting', 'title', n || ' background job' || case when n = 1 then ' has' else 's have' end || ' waited over 30 minutes',
    'body', 'Jobs are not being picked up in time. Emails and payments may be late. Open the admin area, Jobs.'); end if;
  select count(*) into n from notifications where channel = 'email' and status = 'failed' and created_at > now() - interval '24 hours';
  if n > 0 then v := v || jsonb_build_object('code', 'email_failed', 'title', n || ' email' || case when n = 1 then '' else 's' end || ' could not be sent',
    'body', 'In the last 24 hours. Open the admin area, Email, to see which and why.'); end if;
  select count(*) into n from notifications where channel = 'email' and delivery_state = 'bounced' and created_at > now() - interval '24 hours';
  if n > 0 then v := v || jsonb_build_object('code', 'email_bounced', 'title', n || ' email' || case when n = 1 then '' else 's' end || ' bounced',
    'body', 'The address refused the email in the last 24 hours. Open the admin area, Email.'); end if;
  select count(*) into n from payments where status = 'processing' and updated_at < now() - interval '5 days';
  if n > 0 then v := v || jsonb_build_object('code', 'payments_stuck', 'title', n || ' payment' || case when n = 1 then ' has' else 's have' end || ' been "processing" for over 5 days',
    'body', 'Stripe has not said how the payment ended. Open the admin area, Payments, and look the payment up in Stripe.'); end if;
  select count(*) filter (where status = 'failed'), count(*) filter (where status = 'pending' and created_at < now() - interval '2 days') into n, m from payouts;
  if n > 0 then v := v || jsonb_build_object('code', 'payouts_failed', 'title', n || ' payout' || case when n = 1 then '' else 's' end || ' failed',
    'body', 'A freelancer has not been paid. Open the admin area, Payments.'); end if;
  if m > 0 then v := v || jsonb_build_object('code', 'payouts_waiting', 'title', m || ' payout' || case when m = 1 then ' has' else 's have' end || ' waited over 2 days',
    'body', 'A payout is ready and has not been sent. Open the admin area, Payments.'); end if;
  select count(*) into n from refunds where status = 'failed';
  if n > 0 then v := v || jsonb_build_object('code', 'refunds_failed', 'title', n || ' refund' || case when n = 1 then '' else 's' end || ' failed',
    'body', 'An attorney has not got their money back. Open the admin area, Payments.'); end if;
  select count(*) into n from chargebacks where status = 'open';
  if n > 0 then v := v || jsonb_build_object('code', 'chargebacks_open', 'title', n || ' chargeback' || case when n = 1 then ' is' else 's are' end || ' open',
    'body', 'A card holder disputed a charge with their bank. Decide in Stripe whether to contest it before Stripe''s deadline.'); end if;
  select count(*) into n from provider_events where processed_at is null and received_at < now() - interval '1 hour';
  if n > 0 then v := v || jsonb_build_object('code', 'stripe_events_unread', 'title', n || ' notice' || case when n = 1 then '' else 's' end || ' from Stripe could not be handled',
    'body', 'Stripe sent a notice over an hour ago and DELA has not finished with it. Ask Claude to look at the function logs.'); end if;
  if exists (select 1 from move_run where status = 'running')
     and not exists (select 1 from jobs where kind = 'move_create' and status in ('queued', 'running', 'delayed')) then
    v := v || jsonb_build_object('code', 'move_stopped', 'title', 'The member move stopped before it finished',
      'body', 'Open the admin area, Move members, card "6. Move", and click "Pause" and then "Resume".');
  end if;
  return v;
end $$;
revoke all on function dela_health_db() from public, anon, authenticated;

-- Keeps one check and tells the owner about each problem: at once, and again each day it is still there.
-- A problem marked "once" is said one time only.
create or replace function dela_health_save(p_trigger text, p_checks jsonb, p_issues jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_id uuid; i jsonb;
begin
  insert into health_runs (trigger, ok, checks, issues) values (case when p_trigger = 'manual' then 'manual' else 'timer' end, jsonb_array_length(coalesce(p_issues, '[]')) = 0, coalesce(p_checks, '[]'), coalesce(p_issues, '[]')) returning id into v_id;
  for i in select * from jsonb_array_elements(coalesce(p_issues, '[]')) loop
    perform dela_alert('health', left('DELA check: ' || coalesce(i->>'title', 'a problem'), 200), left(coalesce(i->>'body', ''), 1500),
      'health:' || coalesce(i->>'code', 'x') || ':' || case when coalesce((i->>'once')::boolean, false) then 'once' else to_char(now() at time zone 'utc', 'YYYYMMDD') end);
  end loop;
  delete from health_runs where at < now() - interval '90 days';
  return jsonb_build_object('ok', true, 'id', v_id, 'issues', jsonb_array_length(coalesce(p_issues, '[]')));
end $$;
revoke all on function dela_health_save(text, jsonb, jsonb) from public, anon, authenticated;

-- Refunds and payouts the check asks Stripe about: what DELA believes went through in the last 30 days
create or replace function dela_health_money() returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object(
    'refunds', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'ref', r.provider_ref, 'amount_cents', r.amount_cents)), '[]') from (select * from refunds where status = 'succeeded' and provider_ref <> '' and updated_at > now() - interval '30 days' order by updated_at desc limit 40) r))
$$;
revoke all on function dela_health_money() from public, anon, authenticated;

create or replace function dela_admin_health(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, '{}');
  return jsonb_build_object('ok', true, 'hours', greatest(1, least(24, dela_int_setting('health.check_hours', 6))),
    'runs', (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'at', h.at, 'trigger', h.trigger, 'ok', h.ok, 'checks', h.checks, 'issues', h.issues) order by h.at desc), '[]') from (select * from health_runs order by at desc limit 12) h));
end $$;
revoke all on function dela_admin_health(uuid) from public, anon, authenticated;

create or replace function dela_admin_health_run(p_actor uuid) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, '{}');
  perform dela_job_enqueue('health_check', jsonb_build_object('trigger', 'manual'), now(), 'health_manual:' || floor(extract(epoch from now()) / 60)::text, p_actor);
  perform dela_audit('staff', p_actor, 'health_check_run', 'system', 'health', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_admin_health_run(uuid) from public, anon, authenticated;

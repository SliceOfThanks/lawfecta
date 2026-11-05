-- After an essential email is sent, DELA asks the email service whether it was delivered or bounced (Stacey's Step 3
-- test, 2026-11-05: a license email to hello@lawwurk.com bounced because the receiving server blocked Brevo's
-- shared sending address, while DELA said "We emailed"). Additive only.

alter table notifications add column if not exists delivery_state text not null default '' check (delivery_state in ('', 'waiting', 'delivered', 'bounced', 'unknown'));
alter table notifications add column if not exists delivery_reason text not null default '';
alter table notifications add column if not exists delivery_checked_at timestamptz;
alter table email_checks add column if not exists notification_id uuid;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('email.delivery_check_minutes', '[5, 20, 60]', 'Minutes after sending that DELA checks an essential email was delivered', 'Email', 'minutes', 'R', 'Claude', 'Brevo only. Members are told when an email bounced.')
on conflict (key) do nothing;

-- The result of one check. state: delivered, bounced, waiting (check again), unknown (stop).
create or replace function dela_notification_delivery(p_notification uuid, p_state text, p_reason text) returns jsonb language plpgsql as $$
declare n notifications; v_lic uuid;
begin
  select * into n from notifications where id = p_notification for update;
  if n.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_state not in ('delivered', 'bounced', 'waiting', 'unknown') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if n.delivery_state in ('delivered', 'bounced') then return jsonb_build_object('ok', true, 'duplicate', true, 'state', n.delivery_state); end if;
  update notifications set delivery_state = p_state, delivery_reason = left(coalesce(p_reason, ''), 200), delivery_checked_at = now() where id = n.id;
  if p_state = 'bounced' then
    select license_id into v_lic from email_checks where notification_id = n.id;
    if v_lic is not null then
      perform dela_verify_event('license', v_lic, n.person_id, 'worker', null, 'email_bounced', jsonb_build_object('reason', left(coalesce(p_reason, ''), 200)));
      perform dela_alert('verification', 'A license email bounced', 'The confirmation email for a license could not be delivered (' || left(coalesce(p_reason, ''), 120) || '). The attorney is told on their Profile. Open the admin area, Verification.',
        'licbounce:' || n.id);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'state', p_state);
end $$;

-- When the email job sends an essential email through Brevo, the api queues the first check
create or replace function dela_delivery_due(p_notification uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('id', id, 'provider', provider, 'ref', provider_ref, 'state', delivery_state, 'status', status)
  from notifications where id = p_notification and channel = 'email'
$$;

-- Licenses now say whether their newest confirmation email arrived
create or replace function dela_license_delivery(p_license uuid) returns jsonb language sql stable as $$
  select coalesce((select jsonb_build_object('state', coalesce(nullif(n.delivery_state, ''), case when n.status = 'sent' then 'waiting' when n.status = 'failed' then 'bounced' else 'waiting' end),
      'reason', case when n.status = 'failed' and n.delivery_reason = '' then 'our email service could not send it' else n.delivery_reason end, 'sent_at', n.sent_at)
    from email_checks e join notifications n on n.id = e.notification_id
    where e.license_id = p_license order by e.created_at desc limit 1), '{}'::jsonb)
$$;

create or replace function dela_license_email(p_person uuid, p_license uuid, p_token text, p_token_hash text) returns jsonb language plpgsql as $$
declare l licenses; v_n uuid;
begin
  select * into l from licenses where id = p_license and person_id = p_person;
  if l.id is null or l.method <> 'email' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if l.status not in ('pending', 'needs_more') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if l.email_confirmed_at is not null then return jsonb_build_object('ok', true, 'already_confirmed', true); end if;
  if (select count(*) from email_checks where license_id = l.id and created_at > now() - interval '1 hour') >= 3 then return jsonb_build_object('ok', false, 'reason', 'wait_a_little'); end if;
  if coalesce(p_token_hash, '') = '' or coalesce(p_token, '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  insert into notifications (person_id, side, kind, channel, essential, title, body, link, dedupe_key, to_email)
  values (p_person, 'attorney', 'verification', 'email', true, 'Confirm this email for your license',
    'You added a ' || l.region || ' license (number ' || l.bar_number || ') in DELA. Click the button, signed in to Lawfecta as yourself, to confirm this email address. The link works for '
      || dela_int_setting('verify.email_link_hours', 24) || ' hours. If this was not you, ignore this email.',
    '/dela?tab=profile&confirm=' || p_token, 'licmail:' || p_token_hash, l.contact_email)
  returning id into v_n;
  insert into email_checks (token_hash, person_id, license_id, email, expires_at, notification_id)
  values (p_token_hash, p_person, l.id, l.contact_email, now() + make_interval(hours => dela_int_setting('verify.email_link_hours', 24)), v_n);
  perform dela_job_enqueue('send_email', jsonb_build_object('notification_id', v_n), now(), 'email:' || v_n::text, p_person);
  perform dela_verify_event('license', l.id, p_person, 'member', p_person, 'email_sent', jsonb_build_object('email_domain', dela_email_domain(l.contact_email)));
  return jsonb_build_object('ok', true);
end $$;

-- Older checks (before this migration) find their email by its dedupe key
update email_checks e set notification_id = n.id from notifications n where e.notification_id is null and n.dedupe_key = 'licmail:' || e.token_hash;

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

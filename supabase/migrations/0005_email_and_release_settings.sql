-- Settings the system needs to run, and the email side of notifications.

insert into settings (key, value, label, section, status, source, note) values
  ('code_version', '"main"', 'Code version (commit ID) this copy loads', 'System', 'C', 'Setup', 'Set at each release to the exact commit that passed testing.'),
  ('email.sender', '"log"', 'Email service in use (log, brevo or bd)', 'System', 'O', 'Setup', 'log records the email without sending it. Changes once BD email is checked.'),
  ('email.from_name', '"Lawfecta DELA"', 'Name emails come from', 'System', 'O', 'Setup', ''),
  ('email.from_address', '"dela@lawfecta.com"', 'Address emails come from', 'System', 'O', 'Setup', 'Must be a verified sender with the email service.'),
  ('site.url', '"https://lawfecta.com"', 'Lawfecta site address used in email links', 'System', 'O', 'Setup', 'Please confirm the Lawfecta BD site address.'),
  ('site.app_path', '"/dela"', 'BD page that holds the DELA app', 'System', 'O', 'Setup', ''),
  ('site.admin_path', '"/dela-admin"', 'BD page that holds the DELA admin area', 'System', 'O', 'Setup', ''),
  ('bootstrap.owner_bd_member_id', '0', 'BD member ID that becomes owner at first sign in, only while there is no owner', 'System', 'C', 'Setup', 'Set from GitHub at the first push to Live, and by Claude on Staging.')
on conflict (key) do nothing;

-- What the worker needs to send one email notification
create or replace function dela_email_load(p_notification uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('id', n.id, 'status', n.status, 'title', n.title, 'body', n.body, 'link', n.link, 'kind', n.kind, 'essential', n.essential,
    'to_email', p.email, 'to_name', p.display_name, 'person_status', p.status,
    'from_name', dela_setting_text('email.from_name', 'Lawfecta DELA'), 'from_address', dela_setting_text('email.from_address', ''),
    'site_url', dela_setting_text('site.url', ''), 'app_path', dela_setting_text('site.app_path', '/dela'),
    'sender', dela_setting_text('email.sender', 'log'), 'environment', dela_setting_text('environment', 'staging'))
  from notifications n join people p on p.id = n.person_id where n.id = p_notification and n.channel = 'email'
$$;

create or replace function dela_notification_mark(p_notification uuid, p_status text, p_provider text, p_ref text, p_error text) returns void language sql as $$
  update notifications set status = p_status, provider = coalesce(p_provider, ''), provider_ref = left(coalesce(p_ref, ''), 200),
    error = left(coalesce(p_error, ''), 500), sent_at = case when p_status = 'sent' then now() else sent_at end
  where id = p_notification and status = 'queued'
$$;

-- Sends a test notice to the staff member using the admin area
create or replace function dela_admin_test_notification(p_actor uuid, p_email boolean) returns jsonb language plpgsql as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return dela_notify(jsonb_build_object('person_id', p_actor, 'kind', 'test', 'title', 'DELA test notice',
    'body', 'This is a test notice from the DELA admin area. If you can read it, notices work.',
    'email', p_email, 'dedupe_key', 'test:' || p_actor::text || ':' || extract(epoch from now())::bigint));
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'dela_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

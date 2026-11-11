-- Pilot plan step 7 (launch review items 22 and 23). Reminder and alert emails need a postal address and a way to stop
-- them without logging in. Emails about the account, payments and signed work ("essential") always arrive.
--   email_optouts: one row per member with a private token for the unsubscribe link, and when they opted out.
--   dela_email_load also returns the postal address and whether the member opted out.
-- Additive: one table, four functions, one setting, two more fields in an answer.
create table if not exists email_optouts (
  person_id uuid primary key references people(id),
  token text not null unique default substr(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 1, 48),
  opted_out_at timestamptz,
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table email_optouts enable row level security;

insert into settings (key, value, label, section, unit, status, source, note)
values ('email.postal_address', '"Lawfecta, 967 Kendall Dr Ste A, #271, San Bernardino, CA 92407"'::jsonb, 'Postal address shown at the bottom of every DELA email', 'Platform rules decided by Stacey', '', 'C', 'Stacey 2026-11-11',
  'U.S. email law asks for a postal address on reminder and alert emails. Those emails also carry an unsubscribe link; emails about the account, payments and signed work always arrive.')
on conflict (key) do nothing;

-- The member's private unsubscribe token (made on first use)
create or replace function dela_email_unsub_token(p_person uuid) returns text language plpgsql set search_path = public, extensions, pg_temp as $$
declare v text;
begin
  insert into email_optouts (person_id) values (p_person) on conflict (person_id) do nothing;
  select token into v from email_optouts where person_id = p_person;
  return v;
end $$;

-- The unsubscribe link: no login. The answer never says whose token it was.
create or replace function dela_email_unsubscribe(p_token text, p_source text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_person uuid;
begin
  if coalesce(p_token, '') !~ '^[0-9a-f]{48}$' then return jsonb_build_object('ok', false, 'reason', 'bad_link'); end if;
  update email_optouts set opted_out_at = coalesce(opted_out_at, now()), source = left(coalesce(p_source, ''), 40), updated_at = now() where token = p_token returning person_id into v_person;
  if v_person is null then return jsonb_build_object('ok', false, 'reason', 'bad_link'); end if;
  perform dela_audit('member', v_person, 'email_unsubscribed', 'person', v_person::text, jsonb_build_object('source', left(coalesce(p_source, ''), 40)));
  return jsonb_build_object('ok', true);
end $$;

-- The member's own choice, from their settings: reminder and alert emails on or off
create or replace function dela_email_optional_set(p_person uuid, p_on boolean) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  insert into email_optouts (person_id) values (p_person) on conflict (person_id) do nothing;
  update email_optouts set opted_out_at = case when p_on then null else coalesce(opted_out_at, now()) end, source = 'settings', updated_at = now() where person_id = p_person;
  return jsonb_build_object('ok', true, 'optional_emails', p_on);
end $$;

create or replace function dela_email_load(p_notification uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('id', n.id, 'status', n.status, 'title', n.title, 'body', n.body, 'link', n.link, 'kind', n.kind, 'essential', n.essential,
    'to_email', coalesce(nullif(n.to_email, ''), p.email), 'to_name', p.display_name, 'person_status', p.status, 'person_id', p.id,
    'from_name', dela_setting_text('email.from_name', 'Lawfecta DELA'), 'from_address', dela_setting_text('email.from_address', ''),
    'site_url', dela_setting_text('site.url', ''), 'app_path', dela_setting_text('site.app_path', '/dela'),
    'sender', dela_setting_text('email.sender', 'log'), 'environment', dela_setting_text('environment', 'staging'),
    'postal', dela_setting_text('email.postal_address', ''),
    'opted_out', exists (select 1 from email_optouts o where o.person_id = p.id and o.opted_out_at is not null))
  from notifications n join people p on p.id = n.person_id where n.id = p_notification and n.channel = 'email'
$$;

create or replace function dela_prefs(p_person uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('read_receipts', coalesce((select read_receipts from member_prefs where person_id = p_person), true),
    'optional_emails', not exists (select 1 from email_optouts o where o.person_id = p_person and o.opted_out_at is not null))
$$;

do $$ declare f text; begin
  foreach f in array array['dela_email_unsub_token(uuid)', 'dela_email_unsubscribe(text,text)', 'dela_email_optional_set(uuid,boolean)', 'dela_email_load(uuid)', 'dela_prefs(uuid)'] loop
    execute 'revoke all on function ' || f || ' from public, anon, authenticated';
  end loop;
end $$;

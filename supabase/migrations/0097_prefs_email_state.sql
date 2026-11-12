-- The Emails card on Settings (2026-11-13): the member's page says whether reminder and alert emails are on, and when
-- they are off, since when and how (from the settings page, or from the unsubscribe link in an email).
-- Additive: dela_prefs keeps its two keys and gains two.
create or replace function dela_prefs(p_person uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('read_receipts', coalesce((select read_receipts from member_prefs where person_id = p_person), true),
    'optional_emails', not exists (select 1 from email_optouts o where o.person_id = p_person and o.opted_out_at is not null),
    'emails_off_since', (select o.opted_out_at from email_optouts o where o.person_id = p_person and o.opted_out_at is not null),
    'emails_off_from', (select case when o.source = 'settings' then 'settings' else 'email_link' end from email_optouts o where o.person_id = p_person and o.opted_out_at is not null))
$$;
revoke all on function dela_prefs(uuid) from public, anon, authenticated;

-- Fix (Live candidate check 2026-11-06, notes; step 9c check, notes): the page notice at the top of Ask DELA, the Library,
-- the recorder and the Inbox still said "Do not enter client names, case numbers", next to the new sensitive data warning.
-- With the switch client_details_allowed on, the page shows this notice instead. The old one stays for the switch off.
-- Additive: one setting.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('data.notice_text_sensitive', '"DELA is for operations work. Never enter sensitive data: SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords. Share a link from your own storage instead. You are responsible for what you enter."'::jsonb,
   'Page notice when client details are allowed (sensitive data rule)', 'Security and sensitive data', '', 'C', 'Stacey 2026-11-07 (step 9c answers)', 'Shown instead of data.notice_text while the switch client_details_allowed is on for the member.')
on conflict (key) do nothing;

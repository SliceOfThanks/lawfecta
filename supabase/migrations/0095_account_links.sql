-- Account and security (Stacey 2026-11-12): members and the Lawfecta Team could not find where to see their sign-in email
-- or change their email and password. Sign-in belongs to the Lawfecta website (Brilliant Directories); DELA never stores
-- a password. DELA shows the sign-in email it was given at the last sign-in and links to the website's own pages.
-- The page addresses are settings, so they can be corrected without new code. Additive.
insert into settings (key, value, label, section, unit, status, source, note) values
  ('account.change_email_path', '"/account/contact"'::jsonb, 'Page on the Lawfecta website where a member changes the email they sign in with', 'Platform rules decided by Stacey', '', 'R',
    'Claude 2026-11-12, from Brilliant Directories'' member dashboard (Contact Details); Stacey confirms the page opens', 'DELA''s Account and security card links here. Sign-in belongs to the Lawfecta website; DELA never stores a password.'),
  ('account.change_password_path', '"/account/password"'::jsonb, 'Page on the Lawfecta website where a member changes their password', 'Platform rules decided by Stacey', '', 'R',
    'Claude 2026-11-12, from Brilliant Directories'' member dashboard (Password); Stacey confirms the page opens', 'DELA''s Account and security card links here.'),
  ('account.forgot_password_path', '"/login/retrieval"'::jsonb, 'Page on the Lawfecta website that emails a password reset', 'Platform rules decided by Stacey', '', 'C',
    'Checked on www.lawfecta.co 2026-11-12', 'DELA''s Account and security card links here.'),
  ('account.google_sign_in', 'true'::jsonb, 'The Lawfecta login page offers Sign in with Google', 'Platform rules decided by Stacey', '', 'C',
    'Checked on www.lawfecta.co/login 2026-11-12', 'When true, the Account and security card says where a Google member manages their password.')
on conflict (key) do nothing;

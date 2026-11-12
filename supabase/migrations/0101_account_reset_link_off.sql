-- Stacey 2026-11-12: "Reset password by email" opened /login/retrieval, which only shows to someone who is signed out.
-- For a signed-in member Brilliant Directories sends it into the member dashboard. The page setting is emptied; the
-- Account and security card then gives the steps (sign out, then the forgotten-password link on the login page) and no
-- button. The setting stays, so a page can be linked again later. Additive.
update settings set value = '""'::jsonb,
  source = 'Stacey 2026-11-12: for a signed-in member the page lands in the Brilliant Directories member dashboard'
where key = 'account.forgot_password_path';

-- Stacey 2026-11-12: "Change email" opened /account/contact and "Change password" opened /account/password. Both are
-- pages of the Brilliant Directories member dashboard, which members should not be sent into. The two page settings are
-- emptied: the Account and security card then offers the website's password reset by email (/login/retrieval) and sends
-- an email change through the Lawfecta Team. A page can be set again later on the Settings page. Additive.
update settings set value = '""'::jsonb, status = 'C',
  source = 'Stacey 2026-11-12: the page opens the whole Brilliant Directories member dashboard, which members should not be sent into'
where key in ('account.change_email_path', 'account.change_password_path');

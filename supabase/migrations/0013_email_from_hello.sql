-- BD delivers email from hello@lawfecta.com, the sender already proven on hirelegalhelp.com (BD outbox report, 2026-10-28).
-- An address on another domain may be refused or filed as spam. Only changes the starting value; a value Stacey set stays.
update settings set value = '"hello@lawfecta.com"', source = 'BD outbox report 2026-10-28', note = 'The address BD has delivered from on hirelegalhelp.com.', updated_at = now()
where key = 'email.from_address' and value = '"dela@lawfecta.com"';

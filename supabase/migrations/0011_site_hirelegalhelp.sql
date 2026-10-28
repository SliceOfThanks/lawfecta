-- DELA runs on the BD site hirelegalhelp.com (BD site 24325), Stacey 2026-10-28.
-- Email links point there. Only changes the value if it is still the placeholder from 0005.
update settings set value = '"https://www.hirelegalhelp.com"', status = 'C', source = 'Stacey 2026-10-28',
  note = 'DELA runs on hirelegalhelp.com (BD site 24325).', updated_at = now()
where key = 'site.url' and value = '"https://lawfecta.com"';

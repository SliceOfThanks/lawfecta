-- hirelegalhelp.com sends www to the plain address (seen in the BD email test, 2026-10-28), so DELA uses the plain one.
-- Only changes the value 0011 set; a value Stacey changed by hand stays.
update settings set value = '"https://hirelegalhelp.com"', source = 'BD email test 2026-10-28', note = 'DELA runs on hirelegalhelp.com (BD site 24325). The www address redirects here.', updated_at = now()
where key = 'site.url' and value = '"https://www.hirelegalhelp.com"';

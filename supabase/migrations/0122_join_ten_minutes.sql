-- Stacey 2026-11-13: "a join button that allows them to click into meeting 10 mins before meeting". The room opened
-- 15 minutes before (a value Claude had suggested). It is now 10, marked confirmed by Stacey, with its history kept.
insert into settings_history (key, old_value, new_value, old_status, new_status, reason)
select 'meeting.join_early_minutes', value, '10'::jsonb, status, 'C', 'Stacey 2026-11-13: join 10 minutes before the meeting'
from settings where key = 'meeting.join_early_minutes' and value <> '10'::jsonb;
update settings set value = '10'::jsonb, status = 'C', source = 'Stacey 2026-11-13', note = 'Was 15 (suggested by Claude).'
where key = 'meeting.join_early_minutes' and value <> '10'::jsonb;

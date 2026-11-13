-- Meeting times for the fifteen sample freelancers (Stacey 2026-11-13: "give the sample freelancers meeting times"),
-- so an attorney can book an introductory call with them: Monday to Friday, 9:00 to 17:00 in the time zone on the
-- sample's profile, 30-minute meetings. Safe to run twice. Only the sample accounts (addresses ending .demo@example.com).
insert into meeting_availability (person_id, timezone)
select pe.id, case mp.body->>'timezone' when 'Pacific' then 'America/Los_Angeles' when 'Mountain' then 'America/Denver' when 'Eastern' then 'America/New_York' else 'America/Chicago' end
from people pe join member_profiles mp on mp.person_id = pe.id and mp.side = 'freelancer'
where pe.email like '%.demo@example.com' and (pe.bd_member_id between 697 and 701 or pe.bd_member_id between 998000001 and 998000010)
on conflict (person_id) do nothing;

select pe.display_name, ma.timezone, ma.lengths, ma.hours->'1' monday
from meeting_availability ma join people pe on pe.id = ma.person_id where pe.email like '%.demo@example.com' order by 1;

-- Takes the sample freelancers (member numbers 697 to 701, and the ten DELA-only ones 998000001 to 998000010) out of Talent before real members arrive.
-- Nothing is deleted: their freelancer profiles are closed, so they stop showing and cannot be invited. History stays.
update side_profiles set status = 'closed', updated_at = now()
where side = 'freelancer' and person_id in (select id from people where (bd_member_id between 697 and 701 or bd_member_id between 998000001 and 998000010) and email like '%.demo@example.com');
select dela_audit('system', null, 'demo_profiles_closed', 'person', id::text, jsonb_build_object('bd_member_id', bd_member_id)) from people where (bd_member_id between 697 and 701 or bd_member_id between 998000001 and 998000010) and email like '%.demo@example.com';
select pe.bd_member_id, pe.display_name, sp.status from people pe join side_profiles sp on sp.person_id = pe.id and sp.side = 'freelancer' where (pe.bd_member_id between 697 and 701 or pe.bd_member_id between 998000001 and 998000010) order by 1;

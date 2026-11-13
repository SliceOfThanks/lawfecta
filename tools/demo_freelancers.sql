-- Sample freelancers for Talent (Stacey 2026-11-13: "Yes, set them up").
-- The five demo members she created on the website (BD member numbers 697 to 701, all example.com addresses) get a
-- DELA record and a complete freelancer profile, marked verified and available, so they show on Talent.
-- They are NOT real people and no real check was done: each summary starts with "Sample profile for testing."
-- Remove them before real members arrive: tools/demo_freelancers_remove.sql.
-- Safe to run twice (it updates the same five). Availability lasts 14 days; run it again to refresh.
do $demo$
declare r record; v_id uuid; v_plan text; v_cats jsonb; v_body jsonb;
begin
  for r in select * from (values
    (697, 'Maria', 'Delgado', '', 8, 'p40', 'Riverside', 'CA', 'Pacific', 20, 'Family law paralegal for small firms',
      'I prepare family law filings, discovery responses and judgment packages for solo and small-firm attorneys.',
      array['Family law'], array['Clio', 'Adobe Acrobat', 'Microsoft 365'], array['E-filing', 'Discovery', 'Court forms'],
      'Family law filing packet', 'Solo and small family law firms', 30000, 60000,
      E'Senior paralegal, family law firm, 2018 to now\nLegal assistant, general practice, 2014 to 2018', 'Paralegal certificate, ABA-approved program'),
    (698, 'Denise', 'Carter', '', 7, 'p39', 'Houston', 'TX', 'Central', 15, 'Legal nurse consultant for personal injury and malpractice',
      'I review medical records and write chronologies and injury summaries for personal injury and medical malpractice matters.',
      array['Personal injury', 'Medical malpractice'], array['Adobe Acrobat', 'Microsoft 365'], array['Medical chronologies', 'Record review'],
      'Medical chronology', 'Personal injury and malpractice attorneys', 40000, 90000,
      E'Legal nurse consultant, independent, 2019 to now\nRegistered nurse, hospital trauma unit, 2008 to 2019', 'BSN; registered nurse'),
    (699, 'Jordan', 'Pierce', 'Pierce Trial Tech', 9, 'p41', 'Chicago', 'IL', 'Central', 30, 'Trial technology and litigation support',
      'We build exhibit sets, deposition designations and trial presentations, and run the courtroom technology for trial teams.',
      array['Civil litigation'], array['Microsoft 365', 'Adobe Acrobat', 'Zoom'], array['Trial presentation', 'Exhibit management', 'Deposition summaries'],
      'Trial presentation package', 'Litigation teams preparing for trial or mediation', 75000, 250000,
      E'Founder, Pierce Trial Tech, 2017 to now\nLitigation support specialist, mid-size firm, 2011 to 2017', 'BA; certified trial presentation professional'),
    (700, 'Priya', 'Nair', '', 10, 'p48', 'Atlanta', 'GA', 'Eastern', 25, 'Legal tech setup and automation for small firms',
      'I set up practice management systems, automate intake and document workflows, and train firm staff to use them.',
      array['General practice'], array['Clio', 'Zapier', 'Lawmatics', 'Microsoft 365'], array['Workflow automation', 'Practice management setup', 'Staff training'],
      'Clio setup and intake automation', 'Firms moving to or cleaning up Clio', 50000, 150000,
      E'Legal operations consultant, independent, 2020 to now\nOperations manager, immigration law firm, 2015 to 2020', 'Clio Certified Consultant'),
    (701, 'Marcus', 'Bell', '', 3, 'p42', 'Phoenix', 'AZ', 'Mountain', 10, 'Mobile notary and loan signing agent',
      'I handle notarizations and document signings for law firms and their clients, at the office or on site.',
      array['Real estate', 'Estate planning and probate'], array['DocuSign', 'Adobe Acrobat'], array['Notarization', 'Loan signings'],
      'Mobile notarization visit', 'Firms that need documents signed and notarized', 7500, 20000,
      E'Notary public and signing agent, 2016 to now', 'Commissioned notary public, Arizona')
  ) as t(bd, first_name, last_name, company, bd_plan, top_key, city, state, tz, hours, headline, summary, areas, software, skills, svc_title, svc_for, svc_from, svc_to, experience, education)
  loop
    insert into people (bd_member_id, display_name, email) values (r.bd, r.first_name || ' ' || r.last_name, lower(r.first_name || '.' || r.last_name) || '.demo@example.com')
    on conflict (bd_member_id) do update set display_name = excluded.display_name returning id into v_id;
    v_plan := coalesce((select code from plans where code = (dela_plan_for_bd(r.bd_plan)).code and side = 'freelancer'), 'fl_free');
    perform dela_ensure_side(v_id, 'freelancer', v_plan, 'bd');
    -- Up to three of the website's categories under the member's top category
    select coalesce(jsonb_agg(k), '[]') into v_cats from (select c.key k from bd_categories c where c.active and c.kind = 'sub' and c.top_key = r.top_key order by (c.parent_key is null), c.bd_id limit 3) x;
    v_body := jsonb_build_object('first_name', r.first_name, 'last_name', r.last_name, 'firm_name', r.company, 'headline', r.headline,
      'summary', 'Sample profile for testing. ' || r.summary, 'experience', r.experience, 'education', r.education,
      'city', r.city, 'state', r.state, 'country', 'US', 'practice_areas', to_jsonb(r.areas), 'software', to_jsonb(r.software), 'skills', to_jsonb(r.skills),
      'services', jsonb_build_array(jsonb_build_object('title', r.svc_title, 'for_whom', r.svc_for, 'price_from_cents', r.svc_from, 'price_to_cents', r.svc_to, 'unit', 'fixed')),
      'timezone', r.tz, 'capacity_hours_week', r.hours, 'states_excluded', '[]'::jsonb, 'jurisdictions', '[]'::jsonb, 'software_none', false,
      'linkedin', 'https://www.linkedin.com/in/demo-' || lower(r.first_name || '-' || r.last_name), 'acknowledged', true, 'categories', v_cats);
    insert into member_profiles (person_id, side, body, missing, score, availability, availability_confirmed_at, directory)
    values (v_id, 'freelancer', v_body, '{}', 100, 'available', now(), false)
    on conflict (person_id, side) do update set body = excluded.body, missing = '{}', score = 100, availability = 'available', availability_confirmed_at = now(), updated_at = now();
    if not exists (select 1 from linkedin_checks where person_id = v_id and status = 'verified') then
      insert into linkedin_checks (person_id, url, status, name_matches, badge_seen, reason, decided_at)
      values (v_id, v_body->>'linkedin', 'verified', true, true, 'Sample profile for testing; no real check was done', now());
    end if;
    update side_profiles set status = 'active' where person_id = v_id and side = 'freelancer';
    perform dela_profile_refresh(v_id, 'freelancer');
    perform dela_audit('system', null, 'demo_profile_created', 'person', v_id::text, jsonb_build_object('bd_member_id', r.bd, 'by', 'Claude, on Stacey''s instruction of 2026-11-13'));
  end loop;
end $demo$;

select pe.bd_member_id, pe.display_name, sp.plan_code, sp.verification_state, sp.readiness_state, jsonb_array_length(mp.body->'categories') categories
from people pe join side_profiles sp on sp.person_id = pe.id and sp.side = 'freelancer' join member_profiles mp on mp.person_id = pe.id and mp.side = 'freelancer'
where pe.bd_member_id between 697 and 701 order by 1;

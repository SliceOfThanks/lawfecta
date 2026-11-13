-- Ten more sample freelancers for Talent (Stacey 2026-11-13: "add 10 more sample freelancers so i can test load more").
-- These ten exist in DELA only. They have no member on the website, so nobody can log in as them, and they use
-- member numbers 998000001 to 998000010, far above any real website member number.
-- They are NOT real people and no real check was done: each summary starts with "Sample profile for testing."
-- Remove them before real members arrive: tools/demo_freelancers_remove.sql.
-- Safe to run twice (it updates the same ten). Availability lasts 14 days; run it again to refresh.
do $demo$
declare r record; v_id uuid; v_cats jsonb; v_body jsonb;
begin
  for r in select * from (values
    (998000001, 'Alicia', 'Romero', '', 'fl_plus', 'p40', 3, 'San Antonio', 'TX', 'Central', 25, 'Immigration paralegal for busy practices',
      'I prepare family-based and employment-based immigration filings and keep case deadlines on track.',
      array['Immigration'], array['Docketwise', 'Clio', 'Microsoft 365'], array['Form preparation', 'Client follow-up', 'Deadline tracking'],
      'Family-based petition packet', 'Solo and small immigration firms', 35000, 80000,
      E'Immigration paralegal, boutique firm, 2016 to now', 'Paralegal certificate'),
    (998000002, 'Terrence', 'Walsh', '', 'fl_pro', 'p44', 0, 'Boston', 'MA', 'Eastern', 20, 'Law clerk for research and motion drafting',
      'I research case law and draft memos, motions and briefs for litigation attorneys.',
      array['Civil litigation', 'Appeals'], array['Westlaw', 'Lexis', 'Microsoft 365'], array['Legal research', 'Motion drafting', 'Bluebooking'],
      'Research memo', 'Litigators who need research and first drafts', 45000, 120000,
      E'Contract law clerk, 2019 to now\nJudicial extern, state trial court, 2018', 'JD'),
    (998000003, 'Naomi', 'Okafor', '', 'fl_free', 'p45', 0, 'Charlotte', 'NC', 'Eastern', 30, 'Virtual legal assistant for solo attorneys',
      'I manage calendars, client email, billing entries and document filing for solo attorneys.',
      array['General practice'], array['Clio', 'Google Workspace', 'Calendly'], array['Calendar management', 'Billing entries', 'Client email'],
      'Monthly admin support', 'Solo attorneys without office staff', 60000, 150000,
      E'Virtual legal assistant, independent, 2018 to now', 'AA, legal office administration'),
    (998000004, 'Grace', 'Lindqvist', 'Lindqvist Legal Marketing', 'fl_business', 'p43', 0, 'Minneapolis', 'MN', 'Central', 35, 'Marketing and content for law firms',
      'We write practice-area pages, newsletters and intake follow-up emails that follow attorney advertising rules.',
      array['General practice'], array['WordPress', 'Mailchimp', 'Canva'], array['Content writing', 'Email newsletters', 'Local search'],
      'Practice-area page set', 'Firms rebuilding their website content', 80000, 200000,
      E'Owner, Lindqvist Legal Marketing, 2015 to now', 'BA, communications'),
    (998000005, 'Samuel', 'Ortiz', '', 'fl_plus', 'p46', 0, 'Denver', 'CO', 'Mountain', 15, 'Legal bookkeeping and trust accounting',
      'I reconcile trust and operating accounts and prepare month-end reports for small firms.',
      array['General practice'], array['QuickBooks Online', 'Clio', 'Excel'], array['Trust reconciliation', 'Month-end close', 'Billing review'],
      'Monthly trust reconciliation', 'Small firms with client trust accounts', 30000, 70000,
      E'Legal bookkeeper, independent, 2017 to now\nAccounting clerk, mid-size firm, 2012 to 2017', 'BS, accounting'),
    (998000006, 'Hannah', 'Kim', '', 'fl_pro', 'p47', 0, 'Seattle', 'WA', 'Pacific', 25, 'Client intake specialist',
      'I answer new client inquiries, run conflict and intake questionnaires and book consultations.',
      array['Family law', 'Estate planning and probate'], array['Lawmatics', 'Clio Grow', 'Zoom'], array['Intake calls', 'Consultation booking', 'Follow-up'],
      'Intake coverage, per week', 'Firms that miss calls and web inquiries', 40000, 90000,
      E'Intake specialist, family law firm, 2019 to now', 'BA, psychology'),
    (998000007, 'Derrick', 'Stone', '', 'fl_free', 'p41', 6, 'Miami', 'FL', 'Eastern', 20, 'E-discovery and document review',
      'I run document review, privilege logs and production sets for litigation teams.',
      array['Civil litigation', 'Employment'], array['Relativity', 'Everlaw', 'Excel'], array['Document review', 'Privilege logs', 'Productions'],
      'Document review, per batch', 'Litigation teams with a production deadline', 50000, 180000,
      E'E-discovery analyst, independent, 2018 to now', 'BA; Relativity Certified Administrator'),
    (998000008, 'Leila', 'Haddad', '', 'fl_plus', 'p40', 9, 'Detroit', 'MI', 'Eastern', 20, 'Estate planning and probate paralegal',
      'I draft wills, trusts and probate filings and prepare inventories and accountings.',
      array['Estate planning and probate'], array['WealthCounsel', 'Clio', 'Adobe Acrobat'], array['Will and trust drafting', 'Probate filings', 'Inventories'],
      'Probate opening packet', 'Estate planning and probate attorneys', 35000, 75000,
      E'Probate paralegal, small firm, 2013 to now', 'Paralegal certificate'),
    (998000009, 'Victor', 'Nguyen', '', 'fl_pro', 'p48', 6, 'San Jose', 'CA', 'Pacific', 20, 'Document automation builder',
      'I turn firm templates into automated documents and intake forms.',
      array['General practice', 'Business'], array['Gavel', 'Clio', 'Microsoft Word'], array['Document automation', 'Template cleanup', 'Form design'],
      'Template automation, per document', 'Firms with repeat documents', 25000, 60000,
      E'Legal automation consultant, 2020 to now\nParalegal, business law firm, 2014 to 2020', 'BS, information systems'),
    (998000010, 'Renee', 'Baptiste', '', 'fl_free', 'p39', 6, 'New Orleans', 'LA', 'Central', 10, 'Medical records retrieval and summaries',
      'I request, organize and summarize medical and billing records for injury cases.',
      array['Personal injury'], array['Adobe Acrobat', 'Excel'], array['Records requests', 'Billing summaries', 'Bates numbering'],
      'Records summary', 'Personal injury firms', 20000, 50000,
      E'Medical records specialist, 2015 to now', 'Certified medical records technician')
  ) as t(bd, first_name, last_name, company, plan, top_key, cat_skip, city, state, tz, hours, headline, summary, areas, software, skills, svc_title, svc_for, svc_from, svc_to, experience, education)
  loop
    insert into people (bd_member_id, display_name, email) values (r.bd, r.first_name || ' ' || r.last_name, lower(r.first_name || '.' || r.last_name) || '.demo@example.com')
    on conflict (bd_member_id) do update set display_name = excluded.display_name returning id into v_id;
    perform dela_ensure_side(v_id, 'freelancer', r.plan, 'bd');
    -- Three of the website's categories under the sample's top category
    select coalesce(jsonb_agg(k), '[]') into v_cats from (select c.key k from bd_categories c where c.active and c.kind = 'sub' and c.top_key = r.top_key order by (c.parent_key is null), c.bd_id offset r.cat_skip limit 3) x;
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
where pe.bd_member_id between 998000001 and 998000010 order by 1;

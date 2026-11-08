-- Fix (PLAN, "Listing photo"): a member with no photo has the site's default logo on their Lawfecta listing, and "Fill from
-- my Lawfecta listing" copied it as their photo. The site's default pictures are listed here and never copied. On Live, add
-- lawfecta.com's default picture path if it differs. Profiles that already copied it are cleared (the member's own photo,
-- if they uploaded one, is a separate field and stays).
insert into settings (key, value, label, section, unit, status, source, note) values
  ('bd.default_photos', '["/images/Lawtica-Logo-06.png"]', 'The listing''s default pictures (never copied as a member''s photo)', 'Profiles and verification', 'picture paths on the BD site', 'C', 'Claude 2026-11-08 (seen on hirelegalhelp.com)', 'The picture BD shows on a listing with no photo. Add lawfecta.com''s if it differs.')
on conflict (key) do nothing;

update member_profiles set body = jsonb_set(body, '{photo_url}', '""')
where lower(coalesce(body->>'photo_url', '')) like '%/images/lawtica-logo-06.png';

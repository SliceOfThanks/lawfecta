-- Members change their profile photo on the DELA profile page (Stacey 2026-11-05: "they should be able to change everything from this screen").
-- Additive: three settings. Sending the photo to the Lawfecta listing waits for a check of how BD takes a photo, so it starts off.
insert into settings (key, value, label, section, unit, status, source, note) values
  ('profile.photo_max_kb', '3072', 'Largest profile photo', 'Profiles and verification', 'KB', 'O', 'Claude', 'PNG or JPG.'),
  ('bd.photo_push', 'false', 'Also send a new profile photo to the Lawfecta listing', 'Profiles and verification', '', 'O', 'Claude', 'Off until the BD photo field is checked on the test site.'),
  ('bd.photo_field', '"profile_photo"', 'Lawfecta listing field that takes a photo address', 'Profiles and verification', '', 'O', 'Claude', 'To confirm with Brilliant Directories.')
on conflict (key) do nothing;

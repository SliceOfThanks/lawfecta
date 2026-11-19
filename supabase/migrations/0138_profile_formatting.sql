-- Step 50 (docs/briefs/step-50-profile-formatting.md): light formatting and pictures in the profile's summary,
-- experience and education. The text itself needs no new column: it stays in the profile body with a few marks.
-- This adds only the setting for how many pictures one profile may show. Additive.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('profile.images_max', '6', 'Pictures a member may put in the text of their profile', 'Profiles and verification', 'pictures', 'C', 'Claude 2026-11-19 (step 50, acceleration mode)', 'Counts the pictures in the summary, experience and education together. Each is a PNG or JPG no larger than the profile photo limit.')
on conflict (key) do nothing;

-- Step 88 (Stacey 2026-11-24, with a picture of wysiwyghtml.com: "WYSIWYG editor should have: headings, numbered lists,
-- bullet lists, alignment, insert image, embeds, insert video, and tables"). The formatting is kept as marks inside the
-- plain text of a document (lib/documents/marks.ts), so no table changes shape. This adds only the switch that shows the
-- wider set of tools in the bar over a text. Additive, safe to run twice.
insert into feature_switches (key, label, gate) values ('document_editor_tools',
  'More tools in the bar over a document''s text: headings, numbered lists, underline, alignment, then tables, pictures and video (step 88)',
  'Stacey asked for it 2026-11-24; released in three parts (88a to 88c)')
on conflict (key) do nothing;

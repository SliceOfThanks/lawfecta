# Feature brief: the full set of tools in the document editor

Step: 88 (releases 88a, 88b, 88c)   Spec references: step 80 (documents edited in place), step 2e (images in documents), step 2c (the document standard)
Status: approved to build. Stacey 2026-11-24, with a picture of a document's page and a picture of wysiwyghtml.com: "WYSIWYG editor should have: headings, numbered lists, bullet lists, alignment, insert image, embeds, insert video, and tables. Review the one on wysiwyghtml.com to see what they have and let's add." Plan approved the same day.

## Who
Attorneys and firm staff who may edit documents in a firm's Library, and agency owners with a Library. Readers, freelancers on a gig and the exports get what was written, without the tools.

## What
The small bar over a text being typed gets the tools of a word processor: a style list (Text, Heading, Small heading), bold, italic, underline, a bulleted and a numbered list, four alignments, link, clear formatting, undo and redo (88a); tables (88b); pictures and video inside a text (88c).

## Where
The Library, on a document's page, in every long text: Purpose, Scope, each step, Timing, Done when and the other paragraphs. One-line facts (the title, a role, a stage name) stay plain. A single list line keeps bold, italic, underline and links. Browser: app/dela-app.js (fmtLine, fmtSegs, fmtInto, fmtRead, fmtShow). Server: supabase/functions/api/lib/documents/marks.ts and model.ts. Behind the switch document_editor_tools.

## When
While a member types in a document. What is typed is kept by itself as before, and becomes a version on Save.

## Why
Stacey: attorneys are not technical people and have no time to learn a new system. A document they write should take the same tools as the word processor they know, and export with them.

## What wysiwyghtml.com has, and what DELA takes
Taken: headings, bold, italic, underline, the four alignments, bulleted and numbered lists, link and unlink, picture, video, table, clear formatting, undo and redo.
Not taken: indent and outdent (steps and lists are one level, so "Step 3" always means one thing); text colour and background colour (a firm's documents stay in one look, and colour does not survive every export); the source code view and print (Word and PDF exports exist).

## How it is kept
Text stays plain text with marks, as since step 80b. Nothing in the database changes shape, older versions read as before, and no HTML is stored. Each new mark stands at the start of a line: "## " a heading, "### " a small heading, "1. " a numbered line, "{center} ", "{right} " or "{justify} " an aligned line, "| a | b |" a table row, a picture line that names one of DELA's own picture records, and a video line with a YouTube, Vimeo or Loom address. Two underscores on each side underline words. The server reads the same marks and checks them at every save.

## How it could go wrong
- Markup or scripts get in through a paste or a video address: pasted text arrives as plain words; only marks DELA knows become elements; the server drops what fails its rules at every save. A video address must match one of three sites in a known form, and no embed code is taken.
- A video site tracks members who only read: the player loads only after a click.
- A picture with client information slips in through a text: it goes through the same tick and the same block on export and approval as every picture.
- A step no longer starts with a verb because it starts with a heading: the checks read the plain words.
- Marks show as typed characters somewhere: the plain words go to the quality check, a gig, the freelancer's page, the step checklist, table cells in the exports and the Library card. Four places that showed stars before this step are fixed with it.
- A blank to fill in ("Name: ______") turns into underline: a run of underscores is never a mark, and underscores a member types are kept apart from the marks.
- The wide bar covers what is being read: it sits over the right end of the line above and never over a heading's words.
- A tab left open on the old code: an unknown mark shows as its typed characters and is never lost.

## Settings and switches it uses
- New switch document_editor_tools: off, then the Access list, then everyone.
- 88b: documents.table.max_cols 8 and documents.table.max_rows 40 (proposed).
- Existing: document_editor_v2, document_images and the picture settings.
- No business number.

## Stacey's answers (2026-11-24)
1. Where do the tools work? **Every long text.**
2. Where does the bar sit? **It stays a floating bar** above the text being typed.
3. Which videos? **YouTube, Vimeo and Loom links only.**
4. A picture inside a text: **the caption is optional; the tick that it shows no client information stays required.**

## Release 88a: the questions Claude answered itself (acceleration mode, 2026-11-24)
1. How many heading sizes? **Two**, "Heading" and "Small heading". A section's own title stays the largest, so a heading inside a text never looks like a new section.
2. Is underline in? **Yes.** It is on the site she sent and in every word processor.
3. What happens to a numbered list when a line is added in the middle? **It renumbers itself.** The numbers are worked out when the text is shown.
4. Do lists take alignment? **No.** A list line stays at the left, as in the exports.
5. What does "Clear" do? **It takes bold, italic, underline, a link, a heading and alignment off the chosen words**, and leaves the words.
6. What does the freelancer on a gig see? **The plain words**, as before.

## Success looks like
Attorney login, switch on:
- Clicking in a long text shows the bar with the style list, B, I, U, the two lists, Link, Unlink, four alignments, Clear, Undo and Redo.
- A line made a heading reads as a heading after a reload, and in Word.
- A numbered list keeps its numbers in order after a line is added.
- A centered line is centered after a reload and in the web page export.

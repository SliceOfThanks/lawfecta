# Feature brief: formatting, pictures and DELA's help in the profile sections

Step: 50   Spec references: step 3 (profiles), step 49 (the live profile)
Status: built in acceleration mode (Stacey 2026-11-19: "They should be able to use a DELA action to help them add content and design this section. Each section should be able to have Markdown or light HTML. For instance, they should be able to add images. They should be able to chat with the AI and type something in and have it expanded on. And I don't see a WYSIWYG editor to make it easy (like a bar to bold, add headers, add image, etc).")

## Who
Freelancers, on every plan, editing their live profile. Attorneys and everyone else who opens a freelancer profile see the result.

## What
The three long sections of the profile (professional summary, professional experience, education and credentials) take light formatting: headings, bulleted and numbered lists, bold and italic words, and pictures. The editor has a bar of buttons for each of these, and under the box a preview headed "How attorneys will see it" that changes as the member types. "Write with DELA" sits in the same editor: the member types a few facts or a rough sentence and DELA writes or expands the section, with formatting; leaving the notes empty improves what the box already holds. Nothing is saved until the member chooses "Save".

## Where
The live profile (Profile page, "View my live profile"), after choosing "Edit" on the summary, the experience or the education. The formatted result shows on the profile page attorneys open from Talent search.

## When
Any time. A picture is uploaded when it is chosen and appears in the profile when the section is saved.

## Why
A wall of plain text reads poorly. A freelancer who can show a short heading, a list of what they do and a picture of their work gets read, and a better profile gets more invitations. DELA's help removes the blank page.

## How it could go wrong
- Code typed into a section (HTML, scripts): the page is built from the few marks DELA knows, one element at a time. Anything else shows as the words that were typed and never runs. Tested.
- A picture address that points outside the member's own folder, or to another website: not accepted as a picture. Only a picture the member uploaded to their own profile is ever shown.
- Too many pictures: the save is refused with a plain sentence. The limit is a setting.
- A picture or text with client information or sensitive data: the same check as the profile form runs on save, and the notice sits above the box.
- Links that lead attorneys off Lawfecta: there are no links in the formatting.
- The Lawfecta directory listing: it receives the plain words only, without marks or pictures, so the listing never shows stray symbols.
- Search results and other short places: they show the plain words.
- Text written before this step, one point per line: it still shows as a list.
- DELA inventing a qualification: the same rule as before; it uses only the member's facts and asks about what is missing.

## Settings and switches it uses
- New setting profile.images_max (6): pictures a member may put in the text of their profile. Migration 0138.
- profile.photo_max_kb (existing): the largest picture file.
- ai_generation switch and the member's DELA actions (existing) for "Write with DELA".
No new switch: the formatting is shown through code that cannot run anything, and it is the member's own content.

## Questions, and how Claude answered them (acceleration mode)
1. Markdown or HTML? **A small set of Markdown marks, no HTML.** HTML from members on a page other members open is the classic way an account gets attacked. The marks give the same result on the page.
2. A true "what you see is what you get" box, or a bar over the text with a live preview? **A bar over the text, with the preview right under it.** It works the same in every browser and for screen readers and agents. The member presses "Bold" or "Heading" and sees the result at once in the preview. If Stacey wants the text itself to change look inside the box, that is a larger step and can follow.
3. Which sections? **Summary, experience, education.** The headline stays one plain line; services, skills and tools are already structured.
4. Links? **No.** A link in a profile is the easiest way to move an attorney off Lawfecta.
5. How many pictures, and how big? **6 per profile, as a setting; each as large as a profile photo may be (3 MB today).**
6. Does DELA write formatting too? **Yes**, light: a heading, a list, a few bold words. It never adds a picture and keeps the ones already there.
7. Does the directory listing get the formatting? **No, plain words.** Brilliant Directories shows that box its own way.
8. The profile form's own boxes? **They show the same text with its marks.** The bar and preview are on the live profile; the form says so. Adding the bar to the form too is a small follow-up if wanted.
9. A "chat" with DELA inside the editor? **The "Write with DELA" box, used as often as wanted**: each run takes the member's new note and what the section says now. A full back-and-forth chat lives in Ask DELA.

## Success looks like
Freelancer login:
- "Edit" on the summary shows the bar: "B", "I", "Heading", "• List", "1. List", "Plain", "Add picture".
- Selecting a line and choosing "Heading" shows it as a heading in "How attorneys will see it".
- Selecting lines and choosing "• List" shows a list; "B" makes words bold.
- "Write with DELA" writes the section from a few facts; the preview shows it.
- After "Save" the live profile shows the formatting, with no marks.
- "Cancel" leaves the section as it was.
Attorney login:
- The freelancer's profile in Talent shows the same formatting.

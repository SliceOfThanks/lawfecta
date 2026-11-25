# Feature brief: playbooks edited in place, as they will read

Step: 80 (releases 80a, 80b, 80c)   Spec references: step 2c (the document standard), step 2e (images in documents), step 61 (the author approves), step 79 (screenshots from a chat)
Status: approved to build. Stacey 2026-11-24, with a full-page screenshot of a document's page: "Playbooks need to be edited like a what-you-see-is-what-you-get type of editor because attorneys are not technical people and they don't have time to learn a new system. They need to be able to drag and drop images and upload them, etc."

## Who
Attorneys and firm staff who may edit documents in a firm's Library (editors and the administrator). Readers get the same page without the editing.

## What
A document opens as it will read: a title, sections, numbered steps with their pictures. Any text is changed where it stands. Steps are blocks that can be dragged into another order. Pictures are dropped, pasted or uploaded onto a step and can be moved to another step. What is typed is saved by itself.

## Where
The Library, on a document's page. Browser: app/dela-app.js (drawDocument2, dpPage, dpSteps and the functions beside them), shared/dela-core.js. Server: app.ts (routes /playbooks/working). Database: migration 0159. Behind the switch document_editor_v2; with it off the page is as before.

## When
- Typing is kept a moment after it stops, and when the browser tab is left.
- A version is made by "Save", by sending for review or approving, by opening another tab of the document, and on leaving the document.
- Unsaved typing comes back when the member opens the document again.

## Why
The form editor shows about ten boxes for every step and starts far down the page. An attorney who opens a playbook wants to read it and fix a sentence, without learning which box holds what.

## Stacey's answers (2026-11-24)
1. How should editing feel? **Looks finished, click to edit.** Steps stay numbered blocks.
2. Where do "Automate or delegate", "Category", "Freelancers who fit this work" and the facts go? **The playbook first, the rest in a side panel.**
3. Step details (role, system, menu path, "Attorney decides", court rule)? **Small tags, open on click.**
4. Formatting? **Bold, italic, bullets, links** (release 80b).

## How it could go wrong
- Typing is lost: it is kept on the server as the member's own working copy, apart from the saved versions, and restored on the next visit. A failed save says so in red and is tried again.
- Autosave floods the version history: it does not make versions. Saved versions cannot be altered (the table is append-only), so a working copy is its own record, one for each member and document.
- Two people in one document: a save onto an older version is refused as before. The page keeps what was typed and offers two choices: save mine as the newest version (the other stays in the history) or drop mine. Nothing is overwritten silently.
- Someone reads another member's unsaved typing: a working copy is returned only to the member who wrote it, and only while they may still edit.
- The approved version is changed by accident: an approved document opens read-only with "Edit a new draft". Unsaved typing on it opens as a draft, never as the approved text.
- A check, an export or an AI fix runs on old text: each of them saves what was typed first.
- Pasted text brings markup or scripts: paste is taken as plain text.
- A picture with client information: every new picture still goes through the review window (caption, and the tick that it shows no client information). Moving a picture does not skip that.
- A step loses its number meaning: steps stay numbered blocks, so delegation and "Source: Step N" keep working after a reorder.
- Keyboard and touch: every drag has a button twin ("Move up", "Move down", "Move to..." on a picture).

## Settings and switches it uses
- New switch document_editor_v2: off, then the Access list, then everyone.
- Existing: document_standard, document_images, approved_view, documents.images.per_step and the other image settings.
- No business number.

## Where the build differs from the plan she approved
- Autosave keeps a working copy; it does not write into a recent version. Saved versions are protected from change, and that protection stays.
- "History" is not a side panel. Chat, Suggested edits, Comments, Activity, Versions and Files stay as a row of tabs above the document, because those views need the full width.
- "The DELA workflow" strip sits under the document, not above it.
- Decision points, related links and the court rule keep their boxes inside the page for now.

## Releases
- **80a:** the page order with the side panel, text edited in place for all four types, step blocks with tags and details, drag to reorder, pictures moved between steps, autosave with the working copy.
- **80b:** bold, italic, bullets and links, carried into the exports.
- **80c:** playbooks in the older format, and what the pilot turns up.

## Release 80b: the questions Claude answered itself (acceleration mode, 2026-11-24)
1. Which texts take formatting? **Every paragraph, every step and every list line.** A title, a role, a stage name and the one-line facts (Trigger, Saved in) stay plain, so a heading cannot be made to look like body text and a role name stays a name.
2. How is formatting kept? **As four marks inside the plain text:** two stars around bold, one star around italic, a line that starts with a dash and a space for a bullet, and words in square brackets followed by the link in round brackets. No table changes, and every older version reads as before.
3. What do the quality check, a gig, a freelancer and Ask DELA's step lists read? **The plain words.** A step that starts with a bold verb still starts with a verb.
4. What may a link be? **Only an address that starts with https://.** Anything else keeps its words and loses its link, in the editor and again on the server at every save. In Word a link shows its words and then its address, so it survives printing.
5. Numbered lists inside a text? **No.** Steps are the numbered thing in a document; a second numbering would confuse "Step 3".
6. Formatted text pasted from Word or a web page? **It arrives as plain words**, as before.
7. A star the member types (2 * 3)? **It stays a star.** Stars with a space after them are never read as marks, and a star typed in the editor is kept apart from the marks.
8. Where are the buttons? **A small bar over the text being typed in:** "B", "I", "• List", "Link", "Unlink". Ctrl or Cmd with B, I and K work too.
Known: a firm member for whom the switch is off sees the old form, where the marks show as typed characters. This ends when the switch is on for everyone.

## Release 80c: the questions Claude answered itself (acceleration mode, 2026-11-24)
What was found first: on Live every playbook is already in the current format (24 of 24), because DELA moves older ones by itself and nothing makes an older one while the document standard is on. Two ways back to the older page were left, and three kinds of boxes were still inside the new page.
1. A playbook still in the older format (its move failed or has not run yet)? **A notice on its page with one button, "Move to the current format".** Anyone who may edit can click it. The version before the move stays in Versions, and an approved version stays in use until the new one is approved, as with the moves DELA makes by itself. Nothing is moved without that click.
2. Restoring an older-format version in a document that is in the current format? **The restored words are moved to the current format as they are restored**, by fixed rules (no AI, no credits), and saved as a new version. Before, the document fell back to the older page.
3. "View" on a version in the Versions tab? **A version in the current format reads as the document reads** (the layout of the approved version). An older-format version keeps its older layout, with a line saying so.
4. Decision points, escalations and related links? **Lines on the page, typed in place**, like every other text: a label and the words beside it, "+ Add" under them and a small "✕" to remove one. "Attorney decides" stays a tick beside a decision point.
5. The court rule on a step and on Timing? **It stays behind "Details".** It is six linked facts with a date, and loose text would lose the check that reads them.
6. Turn the new editor on for everyone? **No.** It stays on the Access list until Stacey says so.

## Success looks like
Attorney login, switch on:
- A document opens with its title and "Purpose" at the top of the page, not under delegation cards.
- Clicking a sentence and typing changes it; "Saved" and a time appear by themselves.
- A step drags to a new place; a picture drags from one step to another.
- "Details" on a step opens its boxes; what is set shows as tags.
- Closing the browser and opening the document again brings the typing back.
- "Save" makes one version.

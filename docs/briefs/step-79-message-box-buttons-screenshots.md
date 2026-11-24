# Feature brief: the Ask DELA message box: two buttons of their own, and screenshots

Step: 79   Spec references: step 77 (the first screen), step 78 (the conversation), step 2e (images in documents), step 2 (the recorder)
Status: built in acceleration mode. Stacey 2026-11-24, with two screenshots of the "Add" list: "For the add tab, remove record my screen and move it next to talk and make it its own button. Separately, add the improve my request as a button next to record my screen. The user also needs to be able to upload screenshots so that it can be added to the playbook because visuals are very important in a playbook."

## Who
Attorneys and firm staff in Ask DELA with the workspace on. Uploading needs the Files feature, which the attorney side has.

## What
- "Record my screen" and "Improve my request" leave the "Add" list and become buttons beside "Talk".
- A member puts screenshots into a message: "Add", then "Upload screenshots", or by pasting a picture into the message box. DELA sees them with the message.
- When the member makes a playbook draft from that chat, the screenshots go into the draft.

## Where
https://www.lawfecta.co/dela?tab=delegate, the message box on the first screen and in a conversation. Browser: app/dela-app.js (composer). Server: app.ts (the draft route). Database: migration 0158.

## When
A screenshot is uploaded the moment it is chosen or pasted, checked like any file, and attached to the message being written. It travels to a draft when "Save as a playbook draft" is used.

## Why
Stacey: visuals are very important in a playbook. A person following a procedure needs to see the screen, and the firm already has the screen in front of it while describing the work.

## How it could go wrong
- A screenshot shows sensitive data: it is saved to the firm's Files and goes through the same check as any uploaded file before it can be attached. One that is held is not attached, and the member is sent to the Files page to confirm it.
- A file that is not a picture is chosen: only PNG and JPG are taken; others are left out with a message.
- Too many at once: the limit for one message (a setting) applies; the page says how many fit.
- What was typed is lost during the upload: the message box keeps its text.
- DELA puts a screenshot on the wrong step: it does not place them on steps at all. They go into the draft's own image section ("Before you start" on an SOP), and the member is told to add each to its step. A wrong picture on a step would be worse than a picture waiting to be placed.
- More screenshots than a section holds (a setting, 3): the rest stay on the Files page and the member is told.
- A policy: it holds text only; the member is told.
- Someone else's chat: only the member's own chat, and only files of the firm that owns the new draft, are read. Covered by a test.
- "Improve my request" spends a DELA action by surprise: the button opens a line that shows the cost; the member clicks again to use it.

## Settings and switches it uses
No new switch or setting. Existing: recorder, ai_helpers, file_uploads, document_images, documents.images.per_step, the limit of files for one chat message.

## Questions, and how Claude answered them (acceleration mode)
1. Does "Improve my request" run at once when clicked? **No, it opens its line with the cost first.** One click more, and no action is used by accident.
2. Where do screenshots go in the draft? **Into the draft's image section, not onto steps.** DELA cannot see which step a screenshot shows from the draft request.
3. Paste as well as choose? **Yes.** A screenshot is usually on the clipboard.
4. Are screenshots kept anywhere else? **In the firm's Files**, like every upload, so they can be used again.
5. The older way of making a playbook (before the document standard)? **Not changed**; it takes text only.

## Success looks like
Attorney login:
- Under the message box: "Add", "Talk", "Record my screen", "Improve my request", and "Send" at the right.
- "Add" lists "Add a playbook as a source", "Upload screenshots", "Attach a file", "Import from Scribe".
- A chosen or pasted screenshot shows as a small tag above the message box and can be removed.
- A draft made from a chat with screenshots shows them under "Before you start", with a message that says so.

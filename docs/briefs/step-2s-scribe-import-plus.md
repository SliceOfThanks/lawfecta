# Feature brief: Import from Scribe, more ways in

Step: 2s (an add-on to Step 2)   Spec references: Step 2 brief (Import from Scribe), docs/briefs/step-2-recorder-beta.md
Status: draft, waiting on Stacey's answers (each question has a suggested answer)

## Who
- Attorneys and firm staff with an editor role or higher in a playbook library, on every attorney plan.
- Freelancers do not have a playbook library in Phase 1.

## What
Import from Scribe works today with Scribe's HTML and Markdown exports. This add-on makes bringing guides in easier and the playbooks better:
1. **Word (.docx) and PDF exports.**
   - Word keeps the screenshots inside the file, so nothing needs fetching and no link can expire.
   - PDF gives the step text, plus a picture of each page where practical.
2. **Several guides at once.** The member picks many files. Each becomes its own review screen, and the member builds each one.
3. **A Scribe share link,** for members on Scribe's free plan who can only share links. This is built only if the share page can be read without a browser and Scribe's terms allow it.
4. **The AI sees the screenshots** while building. It then reads button names and screens that the step text leaves out. This makes playbooks better but costs more AI credits.

## Where
DELA, Library, "Import from Scribe": https://www.hirelegalhelp.com/dela?tab=library. The review screen and "Build my playbook" stay as they are.

## When
- A member imports whenever they want.
- Each guide waits on its review screen until it is built or discarded.
- Unfinished imports are cleaned up by the daily job, as today.

## Why
- Many firms already documented processes in Scribe.
- Every guide brought in is a playbook in the library, ready to delegate.
- Word and several-at-once remove the two biggest frictions.

## How it could go wrong
- A file with client information: the tick box, the client information check and blur, as today.
- A program renamed to .docx or .pdf: refused by the file type check, as in Files.
- A huge guide: the most-steps setting (import.max_steps, 150), and the file size limit.
- Many files at once: a limit per batch (setting), with each file checked on its own.
- A share link to someone else's guide: we cannot tell who owns it. The member confirms they have the right to use it.
- Scribe changes its export layout: the importer is checked with a real export, and DELA says plainly when it cannot read a file.
- Screenshots sent to the AI cost more and may show client details: the setting is off by default; blurred and unticked screenshots are never sent; credits are shown before building.

## Settings and switches it uses
- Switch scribe_import (exists).
- Settings: import.max_steps, import.image_hosts (exist), import.batch_max (new), import.ai_sees_screenshots (new, off), ai.credits.import_screenshots (new).

## Questions to make it better
1. Add Word (.docx) and PDF Scribe exports? Suggested: yes, Word first because the screenshots are inside it.
2. How many guides at once? Suggested: up to 10.
3. Build a "paste a Scribe link" option, only if Scribe's terms allow it? Suggested: check first, build only if allowed.
4. Let the AI see the screenshots when building? Suggested: a setting, off at first. Turn it on for a plan once we see the cost.
5. If the AI sees screenshots, what should it cost? Suggested: 1 extra credit per 10 screenshots (an Open setting you can change).
6. Can you send one Scribe guide exported as HTML, Markdown and Word (no client information), so we test with real files? Suggested: yes, before this is built.

## Success looks like
- A real Scribe Word export imports with every screenshot in place, and builds a playbook with its questions.
- Ten guides imported at once each get a review screen. One bad file does not stop the others.
- A PDF export imports its steps.
- With the setting on, the playbook names buttons and screens it could only see in the pictures. Blurred and unticked screenshots are never sent.
- A renamed program, a file with client information and a too-big guide are each refused with a plain message.

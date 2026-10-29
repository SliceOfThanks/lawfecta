# Feature brief: the AI foundation, with your own AI key (BYOK), talking to the AI, and document uploads

Step: 2a (Phase 1, built before the playbook library in Step 2, which uses all three)
Spec references: 1A section 10 (AI gateway, BYOK and cost controls), 1A "describe work or upload a permitted sanitized SOP", 1A malicious upload, Program Guide C (BYOK for all plans and both sides; confidential client data upload prohibited at first release), Decision Register byok, ai.byok_providers, ai.default_provider, ai.runs, storage.mb
Status: draft, waiting on Stacey's answers. Added to Phase 1 by Stacey 2026-10-29: "Ensure BYOK and talk into the AI is in phase 1. Also attorneys should be able to upload docs."

## The goal
Every member can use DELA's AI on Lawfecta's key or on their own OpenAI or Claude key, can talk to the AI instead of typing, and attorneys can upload their own documents (existing process write-ups, templates, forms, checklists) for the AI to work from and for the team to keep with their playbooks.

## Who
- Bring your own AI key: every member on every plan, attorney side and freelancer side, each side separately (Decision Register byok: all plans). A firm owner on Business can add one key the whole firm uses.
- Talk to the AI: everyone who can use the AI chat, on both sides.
- Document uploads: attorneys and their team in Step 2a. Freelancers upload profile documents (resume, certificates) in Step 3, and both sides share files in a gig in Steps 4 and 5, on the same file system built here.
- Lawfecta Team: sees AI usage, key status (never the key), storage use and blocked uploads in the admin area.

## What
### 1. Your own AI key (BYOK)
1. Settings, AI: choose "Use Lawfecta's AI" (included credits, ai.runs) or "Use my own key" for OpenAI or Claude (Anthropic).
2. Paste the key once. DELA tests it with a tiny request, then stores it encrypted on the server. After that only the provider and the last 4 characters are ever shown. The key never goes to BD, the browser, logs, emails or the MCP connector.
3. Choose which tasks use it: all AI tasks, or chat and playbooks only.
4. Test again, replace (rotate) or remove the key at any time. Removing it stops queued AI jobs that were going to use it.
5. A usage line shows what ran on your key this month (number of AI tasks, and the estimated cost the provider reports), separately from the included Lawfecta credits.
6. If your key fails (wrong key, no credit at the provider, provider down), DELA stops and says why in plain words. It offers "Try again", "Fix my key" and, only if you click it, "Use Lawfecta's credits this time". It never switches to Lawfecta's key silently (Program Guide rule).
7. Some checks stay on Lawfecta's key whatever the member chooses, because a member must not pick the AI that grades their own work (1A: trust-critical assessments). In Phase 1 that is only the "this looks like client information" check.

### 2. Talk to the AI
1. A microphone button in every AI chat box (build a playbook, chat with a playbook, later gigs and proposals).
2. Press to talk, press again to stop. The words appear in the chat box to read and correct, then you press Send. Nothing is sent to the AI until you press Send.
3. A "Send when I stop talking" choice for people who prefer hands free.
4. Works on phone and computer browsers. If the browser blocks the microphone, a short message says how to allow it.
5. Optional (question 3): the AI reads its answer aloud.
6. Where the sound goes: the recording is turned into text by the same AI service the member is using (Lawfecta's, or their own key where that provider offers speech to text), with storing turned off where the provider allows it. The recording is not kept by DELA after it becomes text. The confidential data notice shows next to the microphone too.

### 3. Document uploads (attorneys)
1. A Files area in the attorney side, and an "Add a file" button in the AI chat and on each playbook.
2. Allowed types: PDF, Word (.docx), text and Markdown, and images (PNG, JPG) of a process or form. Anything else is refused with a plain message.
3. Before each upload: the confidential data notice and a tick box, "This file has no confidential client information" (Program Guide: confidential client data upload is prohibited at first release).
4. After upload: DELA checks the file is really the type it claims, reads its text, and runs the client information check. A file that looks like it holds client details is held for the member to confirm or remove, and is not used by the AI until then.
5. Use it with the AI: "Turn this into a playbook" builds a draft playbook from an uploaded process document (1A: upload a permitted sanitized SOP). The AI can also be asked questions about an uploaded file.
6. Keep it with a playbook: attach templates, forms and checklists to a playbook (part 10, Templates and resources). They export with the playbook as links or attachments.
7. Storage: each plan has a storage allowance (storage.mb). A bar shows how much is used. Rename, move to a folder, replace with a new version (old versions kept), and delete (to a trash that empties after 30 days).
8. Files are private to the firm. They open through short-lived links that only work for people with access.

## Where
- DELA attorney and freelancer sides: Settings, AI (keys and usage); the microphone in every AI chat box.
- DELA attorney side: Files (list, folders, storage bar), "Add a file" in chat and on the playbook page.
- Admin area: AI usage by side and plan, BYOK on or off per member (never the key), key failures, storage use per member, files held by the client information check, files refused as the wrong type.

## When
- Keys: tested when added and each time a task fails; a reminder if a key has failed for 3 days in a row.
- Talking: only while the member holds the microphone on; it stops by itself after 2 minutes of recording (setting).
- Uploads: checked at once; held files wait for the member; trash empties after 30 days; storage limit checked when the upload starts and again when it finishes.

## Why
- BYOK: members who already pay OpenAI or Anthropic can use DELA without hitting the included credit limit, and Lawfecta's AI costs stay predictable (1A: BYOK is an adoption lever, not a way around storage or export limits).
- Talking: attorneys explain a process faster by talking it through than typing it, which makes the first playbook much easier to build.
- Uploads: most firms already have process notes and templates. Turning them into playbooks is the fastest way to fill the library, and keeping templates with the playbook means the team has everything in one place.

## How it could go wrong
- A key is pasted into the wrong box (for example an OpenAI key under Claude): the test fails and says which provider the key looks like.
- A key leaks through DELA: prevented by design. The key is encrypted at rest with a secret only the server holds, decrypted only for the moment of the call, and never logged. The rules checker gets a new rule that fails the build if code writes a key to a log or a response.
- A member's key runs out of credit mid task: the task stops and keeps what was done; the member chooses what happens next.
- Two quick clicks on Save key or Upload: one key saved, one file stored.
- A member removes their key while a long AI job is queued: the job is cancelled with a notice, not run on Lawfecta's key.
- Downgrade or expired plan: BYOK still works (all plans); uploads stay readable and downloadable over the storage limit, only new uploads are blocked.
- Someone talks about a client while the microphone is on: the notice is next to the microphone, the text shows before sending so it can be deleted, and the client information check runs on what is sent.
- Microphone blocked or no speech to text for the member's provider: typing still works; the message says why.
- A file with hidden harmful content (a disguised program, a PDF with scripts): only the allowed types, checked by their contents not their name; files are never run, only read for text; nothing uploaded is served from the same web address as DELA.
- Instructions hidden inside an uploaded document ("ignore your rules and..."): the AI treats file text as material to work from, never as instructions; it cannot change permissions or settings.
- A firm member removed from the firm: loses access to files at once; files they uploaded stay with the firm.
- Storage abuse (huge files, many files): per file size limit and the plan's storage allowance, checked twice.

## Settings and switches it uses
- byok (all plans, confirmed), ai.byok_providers (openai, anthropic), ai.default_provider (openai), ai.runs (included credits, provisional), storage.mb (per plan, open).
- New settings (proposed, all Open until Stacey decides): files.max_mb_per_file (25), files.allowed_types (pdf, docx, txt, md, png, jpg), files.trash_days (30), voice.max_seconds (120), voice.read_aloud (off), ai.byok_failure_reminder_days (3).
- Switches, all off until tested: ai_generation (already exists), byok, voice_input, file_uploads.
- New secret Stacey adds in Supabase (Staging first, Live at launch): AI_KEY_ENCRYPTION_SECRET (Claude gives her the exact steps; it is never shown in chat).

## Questions to make it better
1. Firm keys on Business: one firm key the whole team uses (suggested), or each person adds their own, or both?
2. BYOK and the included credits: when a member uses their own key, do they keep their included Lawfecta credits for when their key fails (suggested: yes, used only when they click "Use Lawfecta's credits this time")?
3. Talking: microphone to text only (suggested for launch), or should the AI also read its answers aloud?
4. Talking on Claude keys: Claude's API does not turn speech into text today (check again at build time). For members on a Claude key, use Lawfecta's speech to text for the talking part only (suggested; it counts against included credits), or ask them to type?
5. Uploads for freelancers: profile documents in Step 3 and gig files in Steps 4 and 5 (suggested), or earlier?
6. File types: PDF, Word, text, Markdown, PNG and JPG enough for launch? Add Excel and PowerPoint later?
7. Storage per plan (storage.mb, Claude's suggestion, still Open): Free 250 MB, Plus 1 GB, Pro 5 GB, Business 20 GB. Keep, or change?
8. The tick box "no confidential client information" on every upload (suggested), or only on the first upload?
9. Should a file the client information check flags be held for the member to confirm (suggested), or refused outright?

## Success looks like
- A test attorney adds an OpenAI key and a test freelancer adds a Claude key; each test passes, only the last 4 characters show, and AI chat runs on their own key (usage shows it).
- A wrong key, and a key with no credit, both stop with a clear message; nothing runs on Lawfecta's key unless the member clicks to allow it.
- Removing a key cancels a queued job; the key is never visible in the database to anyone, in logs, or in any page.
- On a phone and a laptop, the microphone turns speech into text in the chat box; nothing sends until Send; a blocked microphone shows the how-to message.
- An attorney uploads a process PDF, ticks the box, and "Turn this into a playbook" produces a draft that the playbook rules then check.
- A renamed program (.exe called .pdf) is refused; a file with client-looking details is held; another firm cannot open the file or its link; an expired link no longer works.
- At the storage limit, the next upload is refused with the numbers and an upgrade button; existing files stay downloadable.

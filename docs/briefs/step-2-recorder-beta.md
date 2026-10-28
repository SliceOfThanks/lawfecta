# Feature brief: Beta MVP, the Process Recorder and playbooks together

Step: 2 (replaces the old order: Step 2 playbooks, recorder in Phase 1B)   Spec references: DELA Process Recorder Build Plan (2026-10-28), 02 Phase 1B section 1 to 3, 00 Program Guide section 2 (Launch / data, Extensions, AI / BYOK), C-28, Step 2 playbooks brief
Status: draft, waiting on Stacey's answers. Recommended answers are filled in; Stacey says yes or changes them. Import from Scribe added by Stacey 2026-10-28 so beta users have something to use before the recorder is ready.

## The idea in one paragraph
The fastest way to put DELA in front of beta users is a feature an attorney can use alone, on day one, with no freelancer, no payment and no contract. The Process Recorder is that feature: record a task once, get a written SOP (a playbook) and a list of steps that could be handed off. So the beta MVP is the recorder and the playbook library built as one thing. Hiring, payments, booking and reviews follow after the beta tells us what attorneys actually record and want to hand off.

## What changes from the build plan, and why
The build plan was written for a fresh project. DELA already has sign in, plans, limits, settings, jobs, email, admin and release control on Staging. Reusing them removes about three of the eight weeks.

| Build plan says | Beta MVP does instead | Why |
|---|---|---|
| New Supabase project lawfecta-dela | DELA Staging (then Live), new tables next to the existing ones | One login, one plan system, one audit log |
| New HS256 token from the widget PHP | The existing DELA-Auth sign in pass and DELA session | Already built and tested |
| Separate consents and audit_log tables | consents table added; the existing append-only audit log | One history for everything |
| Plans by BD plan and groups (Founding Attorney, Agency) | DELA plans att_free to att_business and fl_free to fl_business, numbers in config/decisions.json | CLAUDE.md: two sides, own plans, no hard-coded numbers. Founding Attorney becomes an override list (question 6) |
| Render worker with Docker, ffmpeg and OpenCV | No new server for the beta. The browser records the audio as its own small file and picks screenshots while recording. The existing DELA job worker sends audio to transcription and screenshots to the AI | Removes a whole system to set up, pay for and secure. Biggest single time saver |
| Cursor click detection with OpenCV | Later, only if beta data says desktop programs need it | Hard to get right; narration plus the review screen covers the beta |
| DELA Click Tracker extension (Chrome Web Store) | Beta v2. We can submit it early as unlisted so store review runs in the background | Store review takes days and is not needed to get an SOP |
| Video converted to MP4 by the worker | Keep the recorded file at a lower bitrate (screen video at 5 frames a second), short beta retention | No converter needed; storage stays small |
| Admin screen in the BD Plugins menu | A Recorder tab in the existing DELA Admin area | Already built, already private to the Lawfecta Team |
| pgmq queue | The existing jobs table with leases and retries | Already built and tested |
| Get more AI credits button | "Add your own AI key or upgrade" | Approved rule C-28: no AI credit purchases at launch |
| Share SOP, analytics dashboard, ZIP downloads | Share and full analytics in beta v2; basic counts in beta v1 | Not needed for first feedback |

## Who
- Attorneys on every plan (recorder access, length and video retention set per plan). Firm team members on Business see the firm's playbooks.
- Freelancers: recorder access per fl_ plan (question 5), for their own methods.
- Beta users: only accounts on the access list.
- Lawfecta Team: Recorder tab in the admin area (settings, counts, errors). The Team never opens member recordings.

## Beta v1a: Import from Scribe (ships first, before the recorder)
Stacey 2026-10-28: the recorder takes a while, so members who already use Scribe (scribehow.com) can bring their existing guides into DELA first.

A Scribe guide is already what the recorder's Stage 1 produces: a title and numbered steps, each with a line of text ("Click File") and a screenshot. So an import skips recording and Stage 1 and lands on the same review screen, then the same Build my SOP, playbook library and exports. Building the import first means the review screen, Stage 2, the library and downloads are built and tested by real beta users before the recorder arrives, and the recorder then plugs into them.

How it works for the member:
1. Record a Process page gets a third button: Import from Scribe (also Import a guide on the Delegate tab).
2. Short how-to on the page: in Scribe, open the guide, click Share, then the Export tab, then Export next to HTML (or Markdown or PDF), and upload the file here. Several files at once are allowed.
3. DELA reads the title, steps and screenshots and opens the review screen: step cards with their screenshots checked, "May show client info" flags from the AI, blur, remove, merge, add step, and a notes box per step to add the why (Scribe captures clicks, not reasons).
4. Build my SOP turns it into a full playbook (purpose, when to use it, roles, checks, Keep, Delegate or Automate tags, hours saved, Post as Flex Gig). The AI asks follow-up questions for required parts a Scribe guide does not have, using the Step 2 playbook definition.
5. The original export file is deleted once the playbook is built. Only the approved screenshots (blurs burned in) are kept, stored privately like recorder screenshots.

What is known and not yet known about Scribe (checked 2026-10-28):
- Scribe's own help pages say HTML export is on Pro and Enterprise plans only, and on Enterprise an admin must turn it on. PDF and Markdown export articles also exist. Free Scribe accounts can only share a link or embed.
- No public Scribe API for reading guides was found. The import is built on export files, not an API connection. If Scribe offers an API later, it becomes a Connect Scribe button using the same import code.
- Not yet confirmed: whether screenshots in an HTML or Markdown export are inside the file or are links to Scribe's servers. The importer handles both (links are downloaded once by the server, from Scribe's image addresses only). Confirmed from a real export Stacey sends (question 11).
- Free Scribe users: they can open their guide's share page and use the browser's Print, Save as PDF, then upload the PDF. PDF import reads the text and page images in the browser.
- Pasting a Scribe share link is not in v1a: it means reading Scribe's web pages, which can break without notice and may be against Scribe's terms (question 12).

How the import could go wrong:
- Wrong file, an export from another tool, or a damaged file: "This does not look like a Scribe export" with the how-to again. Nothing saved.
- Very large exports: limit by file size and step count from settings, checked before upload and again on the server.
- Screenshots with client details: same notice, AI flags and blur as the recorder. Imports are covered by question 1.
- Image links that point anywhere other than Scribe's image servers: not downloaded (stops the server being used to fetch other sites).
- Script or tracking code inside an HTML export: never run; only text and images are read, and text is cleaned before display.
- Same guide imported twice: allowed, but DELA asks "You imported this guide on [date]. Import again?"
- Playbook limit or AI credits used up: checked before the file is read, and again at Build my SOP.
- Scribe's name: shown as plain text ("Import from Scribe"), no Scribe logo unless Scribe agrees.

Settings for the import (added to config/decisions.json as proposed): import.scribe (switch, off until Stacey turns it on), import.max_mb (25), import.max_steps (150), import.credits_per_guide (2, lower than a recording since there is no transcript or video to read). Imports count toward att.playbooks_saved and ai.runs.

## What (beta v1, the first release beta users touch)
1. Record a Process page (/dela, new tab Record a Process): process name, microphone picker with level meter, first-time consent checkbox saved to consents, Before you start tips, plan length shown, Start recording and Upload a recording.
2. Whole-screen recording in Chrome, Edge, Firefox and Safari on a computer: Entire Screen check (window or tab refused with the plan's message), floating control bar in Chrome and Edge, timer, pause, resume, stop, the browser's Stop sharing button saves, 2 minutes left warning, auto stop at the plan maximum.
3. Never lose a recording: 10 second pieces saved in the browser first, uploaded through signed links, Finish upload banner after a dropped connection or closed tab.
4. Upload a recording (MP4, MOV, WebM) for phones, tablets and Loom users.
5. Stage 1 Analyze: transcript with timestamps, screenshots picked during recording (screen change, narration cues), AI draft steps with recommended and extra screenshots and "May show client info" flags. Email when ready.
6. Review screen: video with step markers, step cards, check or uncheck screenshots, capture a frame, blur part of an image (the blur is burned into the saved image, not a layer), remove, merge, add steps, editable transcript, Mark as private, Build my SOP with the confirm box.
7. Stage 2 Build: the SOP is saved as a playbook in the library using the playbook definition from the Step 2 brief, with workflow stages, Keep, Delegate or Automate tags, suggested category, minutes per run, and client details replaced with [Client Name] and the like.
8. Recording detail page: SOP (editable), Workflow, Delegate (how often, hours saved per month, Post as Flex Gig prefilled in a new tab), Video.
9. My Recordings and the playbook library: list, status, video deletes on, storage used, open, download, delete.
10. Downloads: video, SOP as Word, PDF and Markdown, transcript as TXT, through 5 minute signed links, logged.
11. Retention: daily sweep, 3 day warning email (Brevo, link to the page, never a file link), deletion logged, SOP kept.
12. Feedback button on every recorder screen (question 9) so beta users report what is confusing in the moment.

## Beta v2 (after first feedback, about 2 weeks later)
Playbook chat and tracked suggestions, versions and comments (Step 2 brief), Share SOP with a member, DELA Click Tracker extension for Chrome and Edge (Firefox after), ZIP download, compression of long videos, full analytics, downgrade and account closed rules.

## Full launch (Phase 1A completes)
Profiles and verification, matching and Flex Gigs, booking, contracts and payments, reviews, then launch readiness, in the existing roadmap order (Steps 3 to 8). The beta's playbooks feed Flex Gigs, so nothing built for the beta is thrown away.

## Where
- BD pages: /dela (new Record a Process tab, My Recordings inside the attorney Delegate tab or its own tab, question 8). No new BD pages; review and detail open inside the DELA app.
- Supabase DELA Staging: tables recordings, recording_chunks, consents, transcript_segments, candidate_frames, steps, delegation_tags (SOPs are playbooks); private buckets dela-raw, dela-frames, dela-exports.
- Email through Brevo (needs BREVO_API_KEY, already waiting on Stacey).
- Admin: new Recorder tab.

## When
- AI credits are reserved when Stage 1 starts and returned if it fails.
- Retention clock starts when the upload finishes. Warning 3 days before. Daily sweep.
- Exports deleted after 24 hours. Download links last 5 minutes.

## Why
- Members: the process they never had time to write down gets written for them in the time it takes to do it once.
- Lawfecta: a reason to sign up and come back before the hiring side exists, real data on what attorneys want to hand off (which shapes Flex Gig categories), and a direct path from SOP to Flex Gig when hiring opens.

## How it could go wrong
- Client information in recordings. Current approved rule (data.confidential_policy, Program Guide "Launch / data") says confidential client data does not belong in DELA. A screen recording of real work will show it. Question 1 decides this before the build.
- Member picks a window instead of the whole screen: refused with the message. Browser does not report the screen type: 3 second preview and confirm.
- Mac screen permission off: the System Settings steps are shown.
- Network drop or closed tab mid-recording: pieces stay in the browser; Finish upload resumes; the server checks every piece before analysis.
- Two tabs recording at once, double clicks on Stop or Build my SOP: one active recording per member, every command idempotent.
- Someone asks for another member's recording ID: 403, logged.
- Plan maximum reached mid-sentence: warning at 2 minutes, saved automatically.
- AI fails or times out: job retries, credits returned, member sees "We could not analyze this yet" and can retry.
- Member's own AI key fails: the job stops and says so. It never falls back to Lawfecta's key.
- Very long or very large uploads: refused above the plan maximum length or storage limit, before upload starts.
- Downgrade or no credits: Start recording disabled with the reason and the way forward.
- Private transcript lines or screenshots inside private time ranges reach Stage 2: removed on the server, not only hidden on screen; tested.
- Blur that can be undone: the saved image is the blurred one; the unblurred frame is deleted.
- Retention deletes the wrong thing: the sweep only deletes files past their date, logs each one, and the SOP stays.

## Settings and switches it uses
All added to config/decisions.json as proposed (O) until Stacey approves:
- recorder.access, recorder.max_minutes, recorder.video_days, recorder.credits_per_recording per plan (12 to 15 in the build plan).
- recorder.warn_days (3), recorder.export_hours (24), recorder.link_minutes (5), recorder.chunk_seconds (10), recorder.max_screenshots (200).
- recorder.extension_url (empty until the extension is published).
- Switch recorder (off until Stacey turns it on), and the existing access list for beta users.
- Existing: ai.runs, storage.mb, att.playbooks_saved, exports, byok, email.sender, emergency.pause (ai, email).

## Questions to make it better
Import from Scribe (11 to 13) ships first, so those answers are needed first.
1. Client information. A recording of real work shows client details. Recommended for the beta: beta users record practice runs or non-client work (demo matters, internal admin tasks), the consent checkbox says so, the review screen and blur stay in. Before full launch, a separate security approval: Supabase Team plan, zero data retention requests to OpenAI and Anthropic, and a lawyer's review of the wording. Yes, or do you want real client recordings in the beta?
2. Order of work. Recommended: the recorder and playbooks become Step 2 and ship together as the beta MVP, ahead of profiles, hiring and payments. This changes the Program Guide's order (capture after Phase 1A), and I record your answer in the decision log. Yes?
3. No new server for the beta (browser picks screenshots, no OpenCV click detection, no MP4 conversion). Yes, or keep the Render worker from the start?
4. AI. Transcription with OpenAI (Lawfecta's key). For writing steps and the SOP: Claude from Anthropic needs a Lawfecta Anthropic key in Supabase secrets; OpenAI alone needs nothing new. Recommended: Claude for Stage 1 and Stage 2, since it reads screenshots well. Which one? Members with their own key use their key either way.
5. Starting numbers, using DELA plans (all editable later in admin). Recommended:
   - att_free: 20 minutes, video kept 14 days. att_plus: 30 minutes, 30 days. att_pro: 45 minutes, 90 days. att_business: 60 minutes, 180 days.
   - fl_free: 10 minutes, 7 days. fl_plus: 20 minutes, 14 days. fl_pro: 45 minutes, 90 days. fl_business: 60 minutes, 180 days.
   - AI credits per recording: 5 on every plan (att_free's 25 a month allows 5 recordings).
   Yes, or your numbers?
6. Founding Attorneys. The build plan gives them their own values. Recommended: a "Founding Attorney" list in the admin area (like the access list) that gives att_plus recorder values to anyone on it. Yes?
7. Extension. Recommended: build it in beta v2, but submit an early version to the Chrome Web Store as unlisted during beta v1 so the store review is done when we need it. This needs a Chrome Web Store developer account (one-time $5, in your name). Yes?
8. Where My Recordings lives for attorneys: inside the Delegate tab, or its own tab next to Record a Process? Recommended: its own tab, named Recordings.
9. Beta feedback. Userback is connected to this session. Recommended: add the Userback feedback button to the DELA app for beta users only, so I can read every report and screenshot and turn them into fixes. Yes?
10. Beta users. How many, and who? Recommended: 5 to 10 attorneys and 3 to 5 freelancers you know, added to the access list, on Live after the first Staging test, so their work is not wiped by Staging resets.

11. Real Scribe export. Please send one Scribe guide exported as HTML (and as Markdown and PDF if your Scribe plan allows), made from a test task with no client information. I build the importer against the real file. Do you have a Scribe Pro account, or should I build from PDF first?
12. Free Scribe users. Recommended: support them through Save as PDF from the share page, and leave share links out of v1a. Yes?
13. Other tools. Tango and Loom guides work almost the same way. Recommended: Scribe first, then Tango in beta v2 if beta users ask for it. Yes?

## Success looks like
- A Scribe HTML export, a Markdown export and a saved PDF each import with every step and screenshot in order, and build a playbook.
- A file from another tool, a damaged file and an oversized file are refused with a clear message and nothing saved.
- Script inside an HTML export never runs; image links outside Scribe's servers are not fetched.
- A 10 minute recording in Chrome on Windows that moves between Word and a website gives a review screen with steps, screenshots and transcript within 5 minutes, and a playbook after Build my SOP.
- The same in Safari on a Mac and Firefox on Windows.
- Choosing a window shows the Entire Screen message. A phone shows the unsupported message and Upload a recording.
- Wi-Fi off for 2 minutes mid-recording: the saved video has no gap. Closing the tab: Finish upload completes it.
- Private transcript lines and blurred areas never reach Stage 2 or any export.
- Another member's recording ID returns 403.
- Retention set to 1 day: warning email, video deleted, SOP kept, both in the audit log.
- Every download opens; a link fails after 5 minutes.
- With the recorder switch off, nobody sees the tab. With a member's own key failing, nothing runs on Lawfecta's key.

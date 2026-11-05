# Feature brief: Confidential engagement materials (client information for the hired freelancer)

Step: 6c (an add-on to agreements and payments)   Spec references: Program Guide C (line 46: "Confidential client-data upload is prohibited at initial release until a separate security/legal approval"), the "Important conflict" note (line 52: either keep engagements to nonconfidential work or "activate a separately approved confidential-data boundary"; a Terms of Service warning is not the technical boundary), O-07 (permitted data, the confidential-data gate, retention, subprocessors and BYOK); 1A sections 19 and 21 (explicit grants, "new sensitive sharing needs explicit authorization"), 1A section 30 (safety and security), G-CONTRACT
Status: answered (Stacey's final decisions 2026-11-05); building

## Stacey's direction (2026-11-05)
- Keep the Library as it is: DELA finds personal and client information in documents and images, and the attorney must blur it or remove it from SOPs, Workflows, Playbooks and Policies.
- When an attorney hires a freelancer through a Flex Gig, the attorney must be able to send sensitive information, including client information, so the freelancer can do the job.

## What DELA does today (checked in the code)
- Gig files: the attorney can share only files that passed the client information check.
- Deliverables: files the freelancer delivers must pass the same check.
- Messages: a message that looks like client information is held unless the sender confirms it has none.
- In practice, an attorney cannot send client information to a hired freelancer today without wrongly confirming it has none.
- The project rules (CLAUDE.md) say "Confidential client data does not belong in DELA". The Program Guide says this may change only with a separate security and legal approval. This brief is that change, kept to one walled-off place.

## Stacey's final decisions (2026-11-05)
All 15 suggested answers, with these additions:
- Notifications say only "New item in Confidential materials" with a link, never file names or message text.
- Bank account numbers are blocked too: DELA blocks full Social Security numbers, card numbers and bank account numbers by pattern in uploads and messages, and asks for the last 4 digits only.
- The upload screen requires the checkbox "This file contains no medical records."
- Items here are left out of search, the Library, exports and AI context.
- Deletion 30 days after the engagement ends, including from backups. An open dispute pauses deletion until it is decided.
- In a dispute, if either person declines the reviewer's access, the reviewer decides from the nonconfidential record and what each person chooses to share.
- Every upload is virus scanned before it appears. Files are encrypted at rest and served through links that expire after 5 minutes.
- PDFs and images open in the browser with the viewer's name and the date as a watermark.

Build notes (where a decision needs one more step):
- **The 12-hour login check.** DELA cannot see when someone last typed their Lawfecta password: Brilliant Directories does not send it, and each page load starts a fresh DELA session. So "log in again" is done by DELA emailing a 6-digit code to the member's Lawfecta email. Entering it counts as a fresh login for 12 hours.
- **Virus scanning** needs a scanning service. DELA has a scanner adapter (the CONF_SCAN_URL and CONF_SCAN_TOKEN secrets).
  - On the test site, with no scanner set up, files are marked "Not virus scanned (test site)".
  - Anywhere else, uploads are refused until a scanner is set up.
  - Stacey chooses the service (question for her).
- **Backups.**
  - Files are deleted from storage at 30 days. Supabase database backups do not hold stored files.
  - Confidential messages are deleted from the database at 30 days. Supabase's backups cannot be edited one record at a time, so the messages also leave the backups when those backups expire (7 days on the Pro plan, or the point-in-time window if that is turned on).
  - The privacy policy needs to say this.
- **Images** cannot be read for Social Security, card or bank numbers by pattern (no text inside the file). They rely on the uploader's checkboxes. PDFs, Word, Excel and text files are read and checked.

## Who
- Attorneys and the firm members the attorney adds to an engagement. Owners and managers by default; others only if added.
- The one hired freelancer on that engagement.
- Nobody else: no other freelancers, no applicants, no bench members, no other firm staff, no Lawfecta Team member by default (see question 8).

## What
A "Confidential materials" area on each engagement.
- **It opens only when:** the agreement is signed by both people and the first milestone is funded.
- **It holds:** files (for example client documents, intake forms, court papers) and confidential messages between the attorney and the freelancer.
- **Inside it:**
  - DELA does not hold or block client information.
  - Passwords and bank or card numbers are still refused (question 4).
  - Everything outside it keeps today's rules: the Library, the gig post, matches, questions, proposals, the bench, reviews, notices, emails and the AI.
- **It closes:** when the engagement ends, the freelancer loses access at once. The materials are deleted after the retention period, after the attorney has had a chance to download them.

## Where
- The engagement page (Projects for the attorney, Work for the freelancer), a new card "Confidential materials". It holds:
  - a clear notice of who can see it
  - the upload area
  - the file list, with who added each file and when, and a "Downloads" log
  - the confidential message thread
- The agreement: a confidentiality clause both sign, and a one-time acknowledgement the freelancer ticks before first opening the area.
- Notices and emails say only "New confidential material on [engagement]" with a link, never a file name or text.
- Admin area: counts only (engagements with materials, storage used, deletions due), never names or contents.

## When
- **Opens:** after both signatures and the first funded milestone.
- **Closes for the freelancer:** at completion, cancellation, a dispute decision, a hold on the freelancer, or when the attorney removes them.
- **Deleted:** after the retention period (question 6). Deletion is logged and never undone. The attorney gets a reminder before it.

## Why
- The real legal work needs client facts. Freelancers cannot draft, file or prepare packets without them.
- It keeps client information in one place built for it, instead of email, text or personal file-sharing outside Lawfecta, which is riskier and goes around the platform.

## How it could go wrong
- **The wrong freelancer sees a client's file.** Access is checked at every open, against the engagement, the signatures and the hire. Links are short-lived and work only for that person. Every open and download is logged.
- **The freelancer keeps copies after the work.** The agreement and the acknowledgement forbid it. Files are watermarked with the freelancer's name (PDF and images), and downloads are logged. No website can stop someone saving a file they were allowed to see; the brief says so plainly.
- **Client information leaks into the AI.** The AI never reads this area unless question 5 says otherwise. The milestone check then works only from what the freelancer writes outside the area.
- **Client information leaks into the Library.** A freelancer or attorney copies a confidential file into a document or gig post. The Library and gig checks still run there and catch what they can. Moving a file from the area to the Library is not offered.
- **A breach or a stolen login.** Files are stored in a separate private bucket, encrypted at rest. Opening the area needs a recent login (question 9). The emergency stop closes every confidential area at once.
- **The legal side.** Confidentiality, privilege, HIPAA if medical records are involved, state privacy laws, a data processing agreement, the subprocessors (Supabase, Stripe, the mail service), and what happens if Lawfecta receives a subpoena. These need a lawyer's approval before real client information goes into Live (lawfecta.com).
- **Health, Social Security, bank and similar data.** These carry extra legal duties (question 3).

## Settings and switches it uses
- **New switch confidential_materials:** built and tested on the test site with made-up data only. Off on Live until a lawyer approves (gate G-CONTRACT plus a security review).
- **New settings:** retention days after the engagement ends, the largest file, the most storage per engagement, the allowed file types, the recent-login window, and whether health or ID documents are allowed.

## Questions to make it better
Each question has a suggested answer. Reply "all as suggested", or give the number and your answer.

1. **When the area opens.** Suggested: after both signatures and the first milestone funded. Before that, applicants and invited freelancers still see only the nonconfidential gig and the document.
2. **What it holds.** Suggested: files and confidential messages, between the attorney and the hired freelancer. Freelancers can upload their drafts there too, because drafts will contain client facts.
3. **Limits on kinds of data.** Suggested: allowed are client names, facts, case numbers, court papers and contracts. Not allowed until a lawyer approves:
   - medical records (HIPAA)
   - full Social Security numbers
   - bank and card numbers
   - passwords

   DELA still refuses those by pattern and tells the member to send only the last 4 digits.
4. **Passwords and logins.** Suggested: always refused, even here. Logins to the firm's systems are shared through the firm's own password manager, never DELA.
5. **The AI and confidential materials.** Suggested: the AI never reads them. DELA's milestone check scores the work from the freelancer's submission notes and any nonconfidential deliverable. A milestone with only confidential deliverables goes straight to the attorney's review. A later option, once a lawyer approves, is to let the AI read them only on the firm's own AI key (BYOK) with zero data retention.
6. **How long materials are kept.** Suggested: the freelancer loses access the moment the engagement ends. Materials are deleted 30 days later. The attorney gets a reminder 7 days before, with a "Download all" button. A dispute keeps them until it is decided.
7. **Who on the firm side sees them.** Suggested: the attorney who hired, plus firm owners and managers. Other staff only if the attorney adds them to that engagement.
8. **The Lawfecta Team.** Suggested: no access by default. In a milestone dispute, a Lawfecta reviewer may open them only if both people agree in DELA. Every open is logged and shown to both.
9. **Extra login check.** Suggested: opening the area needs a login within the last 12 hours. If it is older, DELA asks the member to log in again.
10. **Watermarks and downloads.** Suggested: PDFs and images open in the browser with the freelancer's name and the date as a watermark. Word and other files download, and every download is logged and shown to the attorney. The attorney can switch a file to "view only", which turns off its download button.
11. **File types and sizes.** Suggested: PDF, Word, Excel, PNG, JPG and TXT, up to 25 MB each and 500 MB per engagement, counted in the firm's storage. The file type check still runs: a renamed program is refused.
12. **The freelancer's promise.** Suggested: the agreement gets a confidentiality clause, with its wording from a lawyer. The freelancer also ticks "I will keep these materials confidential, use them only for this engagement, and delete any copies when it ends" before first opening the area.
13. **Plans.** Suggested: every attorney and freelancer plan, since it is part of doing the hired work.
14. **Live.** Suggested: build and test it fully on hirelegalhelp.com with made-up data. On lawfecta.com the card says "Coming soon" until a lawyer approves the terms, the privacy policy and the data handling. Stacey turns the switch on herself.
15. **Project rule.** Suggested: change the rule "Confidential client data does not belong in DELA" to "Confidential client data belongs only in an engagement's Confidential materials area, never in the Library, gig posts, messages outside it, the AI or exports." This change happens once the build is approved.

## Success looks like
These become the agent test, grouped by login.

Attorney:
- The area is closed before signing and funding.
- After signing and funding, upload a made-up client file. It is not held.
- Send a confidential message with a made-up client name. It is not held.
- A password or a full Social Security number is refused.
- See the freelancer's opens and downloads.
- Make a file view only.
- Remove the freelancer and see their access end at once.

Freelancer:
- Tick the acknowledgement, open the file and see the watermark.
- Upload a draft into the area.
- Lose access when the engagement ends.

Owner:
- Counts only, with no names or files.
- The emergency stop closes every area.

Check the results:
- An applicant, a bench member and another freelancer cannot open the area or guess its links.
- Notices show no file names.
- The materials are deleted after 30 days and the deletion is logged.

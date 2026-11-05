# Feature brief: Security and sensitive data

Step: 6d   Spec references: Stacey's "Security and sensitive data requirements" (2026-11-05), the Confidential materials brief (step-6c)
Status: conflicts flagged, waiting on Stacey's answers

Stacey's requirements are decided. This brief lists where they conflict with code that is already built, or with her Confidential materials decisions from earlier the same day, and asks one question for each. Each question has a suggested answer. Nothing below has been changed yet.

## Who
Attorneys who share work with a freelancer, the freelancer they hired, firm owners and managers, the Lawfecta Team, and anyone (no login) who opens the /security page.

## What
1. A clear definition of sensitive data that must never be uploaded: SSNs and ITINs, government ID numbers, financial account numbers, health information, biometric data, logins and passwords.
2. On every job, a "This job involves sensitive data" checkbox. When ticked, uploads are replaced by secure document links from the firm's own storage, which expire after 7, 14 or 30 days.
3. Every file shared with a freelancer expires. Files are deleted from storage 7 days after access ends. Every view and download is logged for the attorney.
4. Files are scanned before upload for SSN and card numbers.
5. Shared files and links never go to OpenAI and are never used for AI training or personalization.
6. A 90-day auto-delete for DELA drafts and uploads not saved to the library, and permanent deletion on demand.
7. Database checks before launch, and a public /security page with a contact form.

## Where
- The gig and engagement pages (Projects and Work tabs).
- The Confidential materials card.
- The Files tab and Ask DELA.
- Emails to the attorney.
- The admin area.
- A new public page at /security on each BD site.

## What is already true today (no change needed)
- **Database access.**
  - Every table has row-level security on and has no access rules for the public key, so nobody can read any table directly from a browser.
  - All reads and writes go through DELA's server, which checks who the person is and what they may see on every request. That is stricter than per-user rules on each table.
  - A test checks this on every build (supabase/tests/zz_security_test.sql).
- **The service key** is only in the server function (Supabase Edge Function secrets). It is never in widget or browser code.
- **Storage.** Buckets are private. Download links expire after 5 minutes, which is shorter than the 1 hour in the requirements.
- **Firm personalization** is already limited to each firm's own content:
  - The firm profile, the library, its images and the files an attorney picks for drafting are all read only for that firm.
  - Ask DELA uses only the member's own profile.
  - Nothing is used to train any AI.
- **Logging.**
  - Downloads of gig files and deliverables are logged today.
  - Files-tab opens are logged in the audit log.
- **Supabase Security Advisor on the test site** (checked 2026-11-05):
  - 121 notes saying "RLS enabled, no policy". This is intended: no direct access at all.
  - 2 warnings to fix:
    - A function named rls_auto_enable that anyone can run. It is not part of DELA's code; it was likely created when the project was set up. I can lock it on the test site.
    - The pg_net extension sits in the public schema. This is low risk: moving it means reinstalling it, and the scheduled jobs use it, so I would do that only with a tested migration.
- **Where data is stored.** The test site's database is on AWS in us-west-2 (Oregon, US). Live is not created yet; it must also be created in a US region.

## Conflicts and questions

### A. With the Confidential materials decisions (earlier today)
1. **How long shared files last.**
   - Confidential materials: files stay until the engagement ends, then are deleted 30 days later, with a reminder 7 days before and a "Download all" button.
   - New: each file expires 7, 14 or 30 days after it is shared (default 14). Access ends at the expiry or when the job is complete, whichever comes first. Files are deleted 7 days after that.
   - Suggested: the new rule replaces the old one for files. Add an "Extend 14 days" button for the attorney, because a 14-day default cuts off a freelancer in the middle of a 2-month engagement. Keep "Download all" and send its reminder 2 days before deletion (inside the 7-day grace).
   - Confidential messages: suggested they follow the job (access ends at completion, deleted 7 days later), since messages have no per-item expiry.
2. **Download link lifetime.** Today all links last 5 minutes; the requirement says 1 hour. Suggested: keep 5 minutes. It is safer and still meets "expires within 1 hour".
3. **What the block message says.**
   - Confidential materials: when DELA finds a full SSN, card or bank number, it asks the member to send only the last 4 digits.
   - New: "This file appears to contain sensitive data like a Social Security or card number. Please share it using a secure link instead.", plus a button that ticks the sensitive checkbox.
   - Suggested: use the new message and button for files. Keep the "last 4 digits" message for typed messages, where a link does not fit.
4. **The checkbox on uploads.** Confidential materials requires "This file contains no medical records." The new definition adds ID documents and biometric data, which a pattern cannot detect reliably: driver's license and passport numbers look different in every state and country. Suggested: change the checkbox to "This file contains no medical records, ID documents, account numbers or biometric data."
5. **Features the new requirements do not mention:** the 12-hour login code, watermarks on PDFs and images, "View only", firm staff access, reviewer consent in disputes, the freelancer's confidentiality promise, the 25 MB and 500 MB limits and the virus scan. Suggested: keep them all.
6. **Who sees secure links.** The requirement says only the attorney and the assigned freelancer. Confidential materials also lets firm owners, managers and staff the attorney adds see the materials. Suggested: the same people as Confidential materials, so a firm owner can cover for an attorney who is away.
7. **Ticking the checkbox after files are already uploaded.** Suggested: the files already shared stay until they expire, no new uploads are allowed, and the attorney sees a note offering to delete them now.

### B. With code that is already built
8. **Uploads are checked by OpenAI today.**
   - Every uploaded file (except recordings) is sent to OpenAI on Lawfecta's key for the client-information check. That includes freelancer deliverables.
   - The requirement says files shared between attorneys and freelancers never go to OpenAI.
   - Suggested: deliverables, Confidential materials files and anything uploaded on a job get the pattern check only, with no AI. The Files tab keeps its AI check, because those files are the firm's own content added on purpose.
   - Open point: a Files-tab file the attorney later shares on a gig was already checked by the AI when it was uploaded. Suggested: allow that, and state it on the /security page ("files you add to your own Files tab may be checked by the AI before you share them").
9. **The milestone check reads deliverables today.**
   - DELA's milestone check sends the freelancer's deliverable text to OpenAI to score it against the agreement.
   - Under the new rule it can no longer read files. Suggested: it scores from the freelancer's submission notes and checklist only, and says so on the page. A milestone with files and no notes goes straight to attorney review.
   - Also, Ask DELA lets a freelancer attach their own deliverables today. Suggested: block files shared on a job from Ask DELA.
10. **The 90-day auto-delete.** Nothing auto-deletes today:
    - Ask DELA chats are kept until archived.
    - Files stay until trashed.
    - Trash is permanently deleted after 30 days.
    - Playbook versions are kept as the record.

    Questions:
    - a. What counts as a "draft"? Suggested: Ask DELA chats and drafts never approved into the library (a playbook still in Draft with no approved version).
    - b. What counts as an "upload"? Suggested: files attached to Ask DELA chats and files uploaded on a job. The Files tab is the firm's storage, so it counts as "saved to the library" and does not auto-delete.
    - c. "Deletion is immediate and permanent." Today deleting goes to Trash for 30 days. Suggested: keep Trash for library files (people delete by mistake) and add "Delete forever" in Trash, which is immediate. Drafts, chats and job files are deleted at once when the person deletes them.
    - d. Reminder before the 90-day delete: suggested an in-app notice 7 days before, with a "Save to library" button.
11. **The upload scan.**
    - Today DELA already checks every upload for SSN and card patterns, but it holds the file for review instead of refusing it.
    - CSV files are not accepted anywhere today.
    - Suggested:
      - Files shared with a freelancer are refused outright, with the new message.
      - The Files tab keeps the hold, since nothing there is shared until the attorney shares it.
      - CSV is added to the allowed types and scanned.
      - Bank routing and account numbers are also blocked when the words "routing" or "account" appear next to them, as Confidential materials does now.
12. **Gig files shared today.**
    - On a gig, an attorney can share Files-tab files with invited and hired freelancers.
    - Those shares have no expiry, and a hired freelancer keeps access with no end date.
    - Suggested: the new expiry rules apply to these shares too. Expiry removes the freelancer's access to the share only; the attorney's own copy in the Files tab is not deleted.
    - The gig's document (the nonconfidential post made from the playbook) is not a file and does not expire.

### C. Wording and setup
13. **The expiry email.** The text "Your shared link for [job name] has expired" would be wrong in the email sent 2 days before. Suggested:
    - The first email says "Your shared link for [job name] expires on [date] ..."
    - The second says "has expired ...", both followed by your sentence about turning off sharing in Google Drive, Dropbox or other storage.
14. **The /security page.**
    - DELA cannot create BD pages. Suggested: I build it as a small widget, and you create a page at /security on each BD site and paste it in. I will send the exact BD steps.
    - The page also names the other services that handle data: Brevo for email, Stripe for payments, Vectera for meetings, and Anthropic when a member brings their own Claude key. Suggested: yes, list them.
15. **The contact form with no email shown.** The BD reCAPTCHA is not working on the test site, so the form needs its own spam protection. Suggested:
    - A hidden trap field, plus a limit of 5 messages an hour from one address.
    - Messages go to the admin area and to the team's email.
16. **OpenAI settings (only Stacey can do these).** Turning off training in Data Controls, and applying for Zero Data Retention. I will send the exact steps and record the setting in docs/RUNBOOK.md when she confirms. Until ZDR is approved, the page says OpenAI may keep inputs up to 30 days for abuse monitoring and does not train on them.
17. **Supabase Pro before launch.** This is already in the Live checklist (docs/STACEY_CHECKLIST.md Part C). No change.
18. **The project rule in CLAUDE.md.** Today it says "Confidential client data does not belong in DELA." Suggested: replace it with your definition. Sensitive data (the six kinds) is never uploaded, only linked. Client names, dates of birth, contact details, case numbers and case facts are normal data, kept only where the rules above allow.

## How it could go wrong
- An attorney forgets to stop sharing in Google Drive after the link expires in DELA. The two emails remind them, but DELA cannot turn off sharing in their storage.
- A file with an SSN as an image (a scan) passes the text pattern check. The checkbox and the attorney's own judgment cover this. Scanned PDFs have no text to check.
- A link to a public folder is pasted. DELA never opens links, so it cannot tell. The help text says to use the storage's own access limits.
- A freelancer downloads a file before it expires and keeps it. The confidentiality promise and the download log cover this.
- Two clicks on "Extend" or "Delete". Every command is idempotent.

## Settings and switches it uses
New settings (all from the admin area):
- sharing.expiry_choices [7, 14, 30]
- sharing.expiry_default 14
- sharing.grace_days 7
- sharing.link_warn_days 2
- drafts.auto_delete_days 90
- drafts.warn_days 7
- security.contact_per_hour 5

Switches:
- sensitive_links (off until tested)
- security_page

## Success looks like
- Ticking the checkbox hides uploads and shows "Secure document links".
- A link expires, disappears for the freelancer and is gone from the database. Both emails arrive.
- A shared file expires, and the freelancer loses access.
- Storage deletion happens 7 days later.
- The attorney sees every view and download.
- An upload with an SSN is refused with the new message, and the button ticks the checkbox.
- No shared file or link is ever sent to the AI. A test counts AI calls.
- Drafts and uploads older than 90 days are deleted, unless saved.
- /security loads without a login, and the form sends.
- The Security Advisor shows no warnings.

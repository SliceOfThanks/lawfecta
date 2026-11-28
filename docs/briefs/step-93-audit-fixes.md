# Feature brief: what the audit of 25 November found, fixed

Step: 93
Spec references: the audit report of 2026-11-25 (kept on Stacey's Mac, not in this repository), step 66 (last names), step 90 (member move), step 6d and 9c (sensitive data), step 11 (payments)
Status: built and released in acceleration mode. Stacey 2026-11-25 answered the audit point by point; her words are quoted under each part.

## Who
- Members who are moved from the old website and have never signed in.
- Freelancers, whose last name stays hidden until they are hired.
- Attorneys writing or commenting on Library documents.
- The owner, who is told when something is wrong.

## What
1. **No email to moved members.** Stacey: "I don't want them to get an email. I'm going to send an email campaign through a separate platform. We need to ensure that on Brilliant Directories for this import it does not send them an email and it only triggers for individuals who sign up using the front-facing form."
   - The website: a member made through its API gets no welcome email unless the call asks for one (`send_email_notifications=1`). The move never sends that field, and a test checks it. The website's own sign-up form is not touched, so its welcome email still goes to people who sign up there.
   - DELA: a member the move made or linked gets no email from DELA until they have signed in once. The notices are still written, so they are waiting at the first sign-in. This covers the onboarding reminders of day 2 and day 7 and every other email.
   - A member the move made never starts a Pro trial, so the "trial ending" emails cannot reach them either.
2. **Last names.** Stacey: "Freelancer's last name should not show up before hiring. It should only have the first letter of their last name. So if the name is Stacy Lake, the attorney should only see Stacy L."
   - Being added to an attorney's Library or firm no longer shows the last name. Only hiring does (and being on the same agency team, or on the viewer's bench).
   - The list of who opened or downloaded a job's files follows the rule.
3. **Sensitive data in documents.** A Social Security number, an ITIN or a government ID number typed into a Library document is taken out on every save, also the save as you type, with a notice. A comment or suggested change that holds sensitive data is refused, as a message is.
4. **One stuck service.** Every call to the website, the email service and the text service now has a time limit of 25 seconds. Stripe, the AI providers and the meeting rooms had their own limits already.
5. **Stripe notices out of order or sent twice.** A late "processing" notice no longer moves a failed or paid payment backwards. A chargeback told twice writes the ledger once.
6. **The six-hour check.** Stacey: "We need to schedule in Claude a run of Stripe, Brilliant Directories, and the databases once every six hours. Ensure that if there's any issue, I get an email ASAP so I can fix it."
7. **The test password** is out of this repository. Stacey: "Remove the password from the repository and I'll deal with changing it myself."

## Where
- Database: migration 0170.
- Server: `healthCheck`, `limited` (lib/http.ts), `scrubSensitive` (lib/documents/model.ts), `keyMode` (lib/payments/stripe.ts), the trial's member search, `pbComment`.
- Admin area: the page "Jobs" (menu group "Safety"), new card "Six-hour check".

## When
- The check runs every six hours on the live site, and when the owner clicks "Run the check now".
- Everything else applies from the release.

## Why
The audit's verdict was "not ready" for opening DELA to the 2,600 members of the old website. These were the points that stood in the way and that code can settle.

## How it could go wrong
- A real member stops getting emails: only members in the move's own list who have never signed in are quiet, and the first sign-in ends it.
- Firm staff who are also freelancers show as "First L." to their own firm until hired: accepted. An attorney could add anyone to a Library without asking, so membership cannot be what unlocks a name.
- A case number or phone number is taken for a Social Security number: the pattern needs the 3-2-4 dashes or the words "SSN" or "Social Security" next to it. A test keeps a federal case number and a phone number untouched.
- The check floods the inbox: one email for each problem, at once, then one a day while it lasts. Facts that do not change by themselves (a missing key, test mode) are said once.
- The check itself hangs: its calls have the same time limits, and it runs as a background job with the usual retries.
- The check shows a key: it reads only whether a key is a live or a test key. A test checks that no key is in any answer.

## Settings and switches it uses
- New setting `health.check_hours` (6): hours between two checks.
- Existing: `hide_last_names`, `live_payments`, `site.url`, `bd_old.site_url`, `email.provider`, `environment`.
- No price, fee or limit.

## Questions Claude answered itself (acceleration mode, 2026-11-25)
1. Where does the six-hour check run? **Inside DELA's own server, not as a scheduled task in the Claude app.** A task in the Claude app runs only while Stacey's Mac is on, and Claude's Stripe connection sees only the old sandbox, so it could not check the real account. DELA's server is always on, holds the right keys and already sends email.
2. What does it check?
   - The database: jobs failed for good, jobs waiting over 30 minutes, emails failed or bounced, payments "processing" over 5 days, payouts failed or waiting over 2 days, refunds failed, open chargebacks, Stripe notices not handled, a member move that stopped.
   - Stripe: that it answers with the key in Supabase, which mode the key is in, and how each refund of the last 30 days ended.
   - The website: that its API answers with DELA's key. The old website too, once its key is set.
   - The email service: that Brevo answers.
3. How is the owner told? **By email through DELA's alerts, and by text if alerts by text are on.** One for each problem, at once.
4. Do moved members get the notices at all? **In DELA, yes; by email, no.**
5. Should Library membership ever show a last name? **No, for an attorney's Library or firm. Yes inside an agency.**
6. Refuse a document save that holds sensitive data, or take the data out? **Take it out and say so.** Refusing the save as you type would lose the member's work.
7. Which parts of the audit are not in this release? **The widgets' fallback to old code** (a widget install by hand, to be planned), **who may decide a dispute** (waits for Stacey's answer), **the rewrite of CLAUDE.md** and **the security scan on the live branch** (next), and **the smaller list** (P2).

## Release 93b: the recovery steps in the admin area (2026-11-27)
Stacey, after seeing that a test restore costs money: "We won't be doing this. I'm not going to pay right now, but in dela-admin write a section step by step when, where, how and why we would need to do this."
- No restore was run. The panel in Supabase was cancelled at the cost screen; nothing was created.
- The admin Guide has a new last section, "Getting data back from a backup": why, what is and is not in a backup, how much can be lost, what it costs, where it is done, when to use a separate copy and when to restore over the live site, five steps for each, and what to do if the whole project is gone. Four steps show the screen as it looked on 27 November 2026.
- It says plainly that no restore has been tested yet.
- The same steps with the pictures: docs/RECOVERY.md.

## Success looks like
- A member in the move's list who never signed in: a notice with "email" makes no email; the daily reminder sends nothing; after one sign-in emails work.
- An attorney adds a freelancer to their Library as a viewer and still reads "Fiona L.".
- The file activity of a job shows "Sec 2." for a freelancer not yet hired.
- A document text with "SSN 123-45-6789" is saved as "[removed: Social Security number]"; a case number and a phone number stay.
- A stand-in service that never answers is cut off at the limit.
- The six-hour check with the website down: one run with the problem, one email to the owner, no second email the same day.
- Owner login: the card "Six-hour check" on the Jobs page, "Run the check now", and a table of results a minute later.

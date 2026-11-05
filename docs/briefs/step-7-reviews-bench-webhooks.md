# Feature brief: Reviews, the trusted talent bench, and member webhooks

Step: 7   Spec references: 1A sections 7 (past-attorney reviews), 18 (Trusted Talent Bench and bench channels), 24 (reviews and closeout), 26 (V1 webhooks); tests T09 (project closed, bench open), T15 (webhook to a private address), T18 (negative review published); Decision Sheet: reviews.publish (C, immediately), reviews.edit_window_days (O, 14), webhooks.endpoints (C, Free 1, Plus 2, Pro 5, Business 10 on each side), switches member_webhooks (Step 7), recurring_engagements and auto_repeat_hiring (stay off)
Status: draft, questions for Stacey. The build starts after she answers.

## Who
- **Attorneys** who completed an engagement in Step 6. They review the freelancer, invite them to a bench, and set up webhooks.
- **Firm owners and managers** (Business plan firms with staff). They keep a firm bench that the firm's staff can use, separate from each person's own bench.
- **Freelancers** who completed an engagement. They review the attorney, accept or decline bench invitations, leave a bench, set up webhooks, and can ask past clients from outside Lawfecta for a review.
- **The Lawfecta Team**: reported reviews, appeals, and webhook endpoints that keep failing.
- Every plan on both sides. Webhook endpoints per plan come from the plan's limit (Free 1, Plus 2, Pro 5, Business 10).

## What

### Reviews after completed work
1. **When an engagement is complete** (every milestone accepted), both people are asked for a review. Reviews are never needed to get paid or to keep access.
2. **Each side answers different questions** about the job (1A section 24):
   - **The attorney reviews the freelancer:** quality of the work, meeting deadlines, communication, following the playbook, and whether they would hire them again. Each is 1 to 5 stars, plus a short written review.
   - **The freelancer reviews the attorney:** clear instructions, timely review and feedback, fair changes, communication, and whether they would work with them again. Each is 1 to 5 stars, plus a short written review.
3. **Only completed Lawfecta engagements count.** A freelancer can review an attorney only after a completed engagement with them. One review per engagement per side.
4. **Reviews publish straight away** (C, no waiting for the other person). The other person is told and can post one public response.
5. **Editing:** the writer can edit their review for 14 days (O). Every version is kept. The page shows "Edited".
6. **Safety checks before publishing**, narrow on purpose:
   - client information (names, case numbers): the writer is asked to remove it first
   - threats, impersonation, hate, contact details or plans to pay outside Lawfecta: held for the Lawfecta Team
   - a negative opinion is never held or removed for being negative (test T18)
7. **Reporting and appeals:** either person can report a review with a reason. The Lawfecta Team decides under a written policy, keeps the original text and the reason for any decision, and the writer can appeal once. Nobody can pay or reward someone for a review, and nobody can delete a review written about them.
8. **Where reviews show:** on the freelancer's DELA profile that attorneys see in matches, proposals and Talent; on the attorney's profile that freelancers see on a gig. The page shows the count, the average for each question, and each review with the engagement's month and practice area (never the client or the matter).
9. **Reviews from past clients outside Lawfecta** (1A section 7, freelancers only):
   - the freelancer sends a short request by email to a past attorney client
   - the attorney confirms their identity through the email link and their bar number, then writes the review
   - these show in a separate section labeled "From past clients (outside Lawfecta)", never mixed into the platform reviews or their averages
   - limits on how many requests, neutral wording DELA writes, and the person asked can opt out of any more requests

### The trusted talent bench
10. **Each attorney has a personal bench.** A firm (Business plan) also has a **firm bench** that its staff can use. The two are separate and never merge on their own.
11. **Invite:** after a completed engagement (or from Talent for any freelancer), the attorney clicks "Invite to my bench" and adds a short note. The invitation does not depend on the review score.
12. **Accept or decline:** the freelancer sees the invitation in their Inbox and on Work. Accepting opens a **bench conversation**: an ongoing message thread that stays open after the engagement's own thread becomes read only (test T09). The same off-platform checks apply as in Step 5.
13. **What a bench is not:** it does not share files, does not create a contract, and does not allow spending. Hiring a bench freelancer still goes through a gig or an invitation, a signed agreement and paid milestones.
14. **Using the bench:**
    - "Invite from my bench" when posting a gig: bench freelancers get the invitation first (it does not use their monthly proposals, as in Step 4)
    - the bench list shows each freelancer's availability, last engagement, and their review summary
    - DELA suggests bench freelancers when the attorney approves a new playbook or posts a gig that fits them, with the reason, and only if they are available. Suggestions can be snoozed and are never forced over a better fit.
15. **Leaving:** the freelancer can leave a bench at any time, and the attorney can remove someone. The bench conversation closes for new messages; past messages and all paid work records stay.

### Member webhooks (outgoing event notices)
16. **A member adds an endpoint:** an https address on their own system (for example Zapier, Make or their own server), and picks which events to send. DELA shows a signing secret once, so their system can check each notice really came from DELA.
17. **Events** (each with only a small, non-confidential payload: the ID, the state, the time and a link back to DELA that needs a login):
    - attorneys: playbook approved, gig posted or closed, a new proposal, a meeting booked or canceled, agreement signed, a milestone paid, submitted, accepted or changes requested, a dispute opened or decided
    - freelancers: a new match or invitation, a proposal chosen, a meeting booked or canceled, agreement signed, a milestone paid (start work), accepted, payout sent, a bench invitation
    - never in a payload: the playbook text, message text, files, card, bank or identity details
18. **Safe delivery** (1A section 26):
    - https only; DELA refuses addresses that point inside a network or at cloud metadata, checks again at each delivery, and does not follow redirects (test T15)
    - each notice is signed with the endpoint's secret and a time, and carries an event ID so duplicates can be ignored
    - retries with growing waits (for about a day), then the notice is marked failed; after repeated failures the endpoint is paused and the member is told
    - the member can send a test notice, see the last deliveries, resend one, change the secret (the old one keeps working for 24 hours) and delete the endpoint
    - before each delivery DELA checks again that the member may still see that event (for example after leaving a firm)
19. **Out of scope for Step 7:** members changing things in DELA from their own systems (incoming commands). That waits until permissions for it are designed (1A section 26).

### Also in the 1A plan, kept off for now
20. **Monthly recurring engagements** (switch recurring_engagements) and **limited automatic repeat hiring** (switch auto_repeat_hiring, G) are part of 1A. They need their own brief because they change money rules (question 16).

## Where
- **Attorney:**
  - Projects, the engagement page: "Review the freelancer" and "Invite to my bench" after completion
  - Talent: a "My bench" view (and "Firm bench" for firms), with Invite and Remove, and an "Invite to my bench" button on each freelancer
  - posting a gig: "Invite from my bench"
  - AI settings (account menu): a new "Webhooks" card
- **Freelancer:**
  - Work, the engagement page: "Review the attorney"
  - Work and Inbox: bench invitations, and the bench conversations
  - Profile: a "Reviews" card with platform reviews and "From past clients (outside Lawfecta)", and "Ask a past client for a review"
  - AI settings: "Webhooks"
- **Both:** the profile the other side sees (matches, proposals, Talent, the gig page) shows the reviews.
- **Emails and notices:** review requests after completion, a new review about you, a response, a bench invitation, accepted or left, a webhook endpoint paused.
- **Lawfecta Team (admin area):** a new "Reviews and bench" tab (reported and held reviews, appeals, past-client requests) and webhook health in the "AI and files" tab (paused endpoints, failure counts).
- **ChatGPT and Claude connector:** read my reviews, list my bench (read only).

## When
- Review requests: when the engagement completes, with one reminder after 7 days. Reviews can be written for 60 days after completion (question 4).
- Edits: 14 days after posting (O).
- Responses: once, any time.
- Reports: decided by the Lawfecta Team; appeals once, within 14 days of the decision.
- Bench invitations: expire after 30 days if not answered.
- Bench suggestions: when a playbook is approved or a gig posted, and an optional weekly summary; snoozed suggestions stay quiet for 30 days.
- Webhooks: sent within a minute of the event; retries for about 24 hours; an endpoint pauses after 20 failures in a row.

## Why
- **Members:** reviews from real, paid, completed work are trustworthy because nobody can buy or invent them. A bench lets an attorney rehire people they trust in two clicks. Webhooks let firms connect DELA to the tools they already use.
- **Lawfecta:** repeat relationships are the main business engine (Program Guide). The bench keeps rehiring on Lawfecta, with its fees and protections, instead of moving off the platform. Reviews raise trust for new attorneys. Webhooks are a paid-plan reason (more endpoints on higher plans).

## How it could go wrong
- **Fake or traded reviews:** only completed engagements count; one per side per engagement; no rewards; the off-platform check runs on reviews and responses.
- **Retaliation:** both publish straight away, so neither can wait to see the other first; reports go to a neutral policy, not to whoever pays more.
- **A member wants a bad review removed:** not removed for being negative (T18); only the narrow checks apply.
- **Client information in a review:** checked before publishing, as everywhere in DELA.
- **Past-client reviews faked by a friend:** the attorney confirms with an email link and a bar number we can check; they show in a separate, labeled section; a limit on requests.
- **Bench used to go around Lawfecta:** the bench conversation has the same off-platform checks; hiring still needs a signed agreement and paid milestones.
- **A freelancer leaves a bench or a firm member leaves:** the bench conversation closes; firm bench access ends with their firm role; paid records stay.
- **Webhook to an internal address (SSRF):** refused when saved and at every delivery; no redirects; short time and size limits (T15).
- **Webhook leaks:** small payloads only; the link back needs a login; a deleted endpoint or a changed secret stops pending notices.
- **A member's system is down:** retries, then failed, then the endpoint pauses and the member is told; nothing in DELA waits on it.
- **Duplicate notices:** every notice has an event ID; the member's system ignores repeats.
- **Plan downgrade:** endpoints over the new limit pause (the oldest stay on), and nothing is deleted.
- **Two clicks:** submitting a review, accepting a bench invitation or adding an endpoint twice has one effect.

## Settings and switches it uses
- Switches (off until tested, then the access list on the test site): reviews, bench, bench_suggestions, past_client_reviews, member_webhooks. Kept off: recurring_engagements, auto_repeat_hiring.
- Existing settings: reviews.publish (C, immediately), reviews.edit_window_days (O, 14), webhooks.endpoints per plan (C).
- New settings (each with the suggested value from the questions below): reviews.window_days (60), reviews.reminder_days (7), reviews.response_limit (1), reviews.appeal_days (14), reviews.min_to_show_average (3), past_reviews.requests_per_month (5), past_reviews.max_total (20), bench.invite_expiry_days (30), bench.max_size per plan, bench.snooze_days (30), webhooks.retry_hours (24), webhooks.pause_after_failures (20), webhooks.timeout_seconds (5), webhooks.secret_overlap_hours (24).

## Questions to make it better
1. **Review questions.** Suggested, 1 to 5 stars each plus a short written review:
   - attorney about the freelancer: quality of the work, deadlines, communication, followed the playbook, would hire again (yes or no)
   - freelancer about the attorney: clear instructions, timely review, fair changes, communication, would work with again (yes or no)
2. **Who sees reviews?** Suggested: only signed-in DELA members, not the public, until your lawyer checks the FTC review rules (1A section 24). Later they can go on the BD listing.
3. **Show the average?** Suggested: show the averages only after 3 reviews, so one review does not define a new member; show each review from the first one.
4. **How long can people review?** Suggested: 60 days after completion, with one reminder after 7 days.
5. **Edits.** Suggested: the writer can edit for 14 days (O, already in settings); every version is kept and the review shows "Edited".
6. **Responses.** Suggested: the person reviewed can post one public response, which they can edit for 14 days.
7. **What gets held for the Lawfecta Team?** Suggested: only client information, threats, hate or harassment, impersonation, contact details or plans to pay outside Lawfecta. A negative opinion is never held. The writer can appeal once.
8. **Past-client reviews (outside Lawfecta).** Suggested:
   - build it now, behind its own switch
   - up to 5 requests a month and 20 in total per freelancer
   - the attorney confirms by email link and bar number; DELA checks the bar number looks valid for the state but cannot prove the work happened, so the section says "From past clients (outside Lawfecta). Lawfecta confirmed the reviewer is an attorney, not the work itself"
   - never counted in the platform averages
9. **Bench size.** Suggested: no limit on the personal bench for now (a setting, so it can get a plan limit later); the firm bench is for Business firms only.
10. **Who can add to the firm bench?** Suggested: the firm owner and managers; staff can see it and invite from it.
11. **Bench conversation.** Suggested: yes, a separate ongoing thread that stays open while the freelancer is on the bench, with the Step 5 off-platform checks.
12. **Bench suggestions from DELA.** Suggested: on, for a new approved playbook or a new gig that fits a bench freelancer who is available, with the reason shown; an optional weekly summary email (off unless the member turns it on); snooze for 30 days.
13. **Webhook events.** Suggested: the lists in "What", item 17. Anything you would add or remove?
14. **Webhook limits.** Suggested: the endpoint counts per plan you already approved (Free 1, Plus 2, Pro 5, Business 10, on each side); up to 1,000 notices a day per member, then they wait.
15. **Webhook failures.** Suggested: retry for about 24 hours with growing waits; pause the endpoint after 20 failures in a row and email the member; they can resume it with one click.
16. **Monthly recurring engagements and automatic repeat hiring.** Suggested: not in Step 7. They change money rules (renewals, the end of a paid period, standing permission to hire and charge), so they get their own brief (Step 7c) after your Step 6 test passes. Automatic repeat hiring stays off (G) until then.
17. **Closeout.** Suggested: when an engagement completes, DELA shows both people a short closeout: accepted milestones, money paid and paid out, anything still open, then the review and the bench invitation.
18. **Connector (ChatGPT and Claude).** Suggested: read only: "my reviews" and "my bench". Writing a review or inviting stays on the website.

## Success looks like
Grouped by login for the ChatGPT test:
- **Freelancer:** after a completed engagement, writes a review of the attorney (and sees it published at once); sees the attorney's review on their profile and posts one response; accepts a bench invitation and sends a message in the bench conversation; asks a past client for a review; adds a webhook to a test address, sends a test notice and sees it delivered; tries an internal address and is refused.
- **Attorney:** writes a review of the freelancer, including a negative one, and it publishes; edits it within 14 days and sees "Edited"; invites the freelancer to the bench; sees the bench list with availability; posts a gig and invites from the bench; adds a webhook and sees delivery attempts; tries a 3rd endpoint on a plan that allows 2 and is told the limit.
- **Owner (admin):** sees a reported review, keeps it with a reason (a negative opinion stays up), sees an appeal, sees a past-client request, sees a paused webhook endpoint.
- **Check the results:** the review shows on the other person's profile; the bench conversation stays open after the engagement thread is read only; the freelancer leaves the bench and the conversation closes while paid records stay; a review with client information is stopped before it publishes.

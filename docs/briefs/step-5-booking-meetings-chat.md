# Feature brief: Booking, meetings and chat

Step: 5   Spec references: 1A sections 17 (native booking and meeting verification) and 18 (messaging); Decision Sheet: booking.off_platform (C, false), booking.calendar_sync (C), calendar.connections (O), meetings.provider (C, Vectera), meetings.recording_consent (G, both people), meetings.transcript_training (G, separate opt-in), safety.off_platform_flags (C), exports.consultation_grant and exports.consultation_proof (O-08); Stacey's Step 4 answer 11 (every conversation is tied to a gig; DELA reviews messages for off-platform plans and learns about each member)
Status: questions answered by Stacey 2026-11-05 (all as suggested); approved to build. The Vectera rooms wait for Vectera's answers and API access (docs/research/vectera-meetings-evaluation.md).

## Stacey's answers (2026-11-05)
All 18 questions as suggested.

## Who
- Attorneys on every plan, and firm staff with a role that allows it.
- Freelancers on every plan.
- Both only inside a gig: the attorney and a freelancer who was invited to it, applied to it, or was hired for it.
- The Lawfecta Team: reads reports, held messages and no-show patterns. It never joins meetings.

## What
Booking
1. **Freelancer availability:** time zone, meeting lengths offered, working hours per weekday, buffer between meetings, minimum notice, how far ahead people can book, and days off.
2. **Book a meeting from a gig:** the attorney picks a time from the freelancer's open times. The freelancer can also suggest times. The slot is held for a few minutes while the attorney confirms, so two people cannot take it at once. It is confirmed once, and both get one confirmation with a calendar file (.ics) to add to any calendar.
3. **Reschedule or cancel:** either person, with a reason. Rescheduling replaces the old meeting and sends one update, not a cancel plus a new booking.
4. **Reminders:** by notice and email before the meeting.
5. **Calendar sync (paid entitlement, switch calendar_sync):** connect Google or Outlook. DELA reads only busy times, so open times skip them, and checks again when confirming. It adds the meeting to the connected calendar. Members without a connected calendar see a plain note that DELA cannot see their other appointments.

Meetings
6. **A Vectera room for each meeting:** DELA creates it through Vectera's API, on Lawfecta's own address (for example meet.lawfecta.com), with guest links for both people. No account, nothing to install, and nobody from Lawfecta in the room.
7. **Consent before any recording or notes:** both people tick consent first. Without both ticks, nothing is recorded.
8. **After the meeting:**
   - Each person confirms "We met" (or "They did not come").
   - DELA asks each person for a short summary: what was agreed, next steps, any change to scope or price. This is the fallback while Vectera cannot send transcripts.
   - DELA turns the summaries into suggested next steps, for example "Update the gig budget" or "Send a proposal". These are suggestions only, never binding.
9. **Attendance:** Vectera's attendance record if its API gives one, otherwise both people confirming. Attendance unlocks the free consultation export (O-08, a switch that stays off until approved).
10. **No-shows:** recorded. Repeated no-shows go to the Lawfecta Team.

Chat inside DELA
11. **One thread per gig per freelancer,** between the attorney's side and that freelancer. It starts when the attorney invites, or when the freelancer applies. Nobody can message someone cold.
12. **Messages:**
    - delivered at once while the page is open, with unread counts on the Projects and Work tabs
    - search within your own threads
    - attachments from DELA Files (read only, logged like gig files)
    - edit for a short time with the history kept
    - delete shows "Message removed" and keeps the record for the team
    - report and block controls
13. **DELA as an explicit assistant in the thread:** "Summarize this thread", "Draft a reply" and "List what we agreed". DELA never sends anything by itself, and summaries are not binding changes to a gig or agreement.
14. **The off-platform check on every message,** the same one used for gigs in Step 4:
    - clear cases (personal contact details, paying outside Lawfecta, moving off the platform) are held for the Lawfecta Team
    - borderline ones send with a gentle reminder to the sender
    - Lawfecta's own meeting links and DELA file links are always allowed
15. **What DELA learns:** DELA adds useful, non-sensitive facts about how each member works to "What DELA has learned about you" (visible and removable, as in Step 4).
16. **Email for new messages:** a short notice with no message text in it, at most one every few minutes per thread.

Connector (DELA in ChatGPT and Claude)
17. List my threads and meetings, read a thread, and draft a reply (saved as a draft). Sending and booking stay on the website while connector write actions are off.

## Where
- Attorney:
  - the gig page in Projects gets a "Messages" view and a "Meetings" view
  - a "Book a meeting" button on each match, invitation and proposal
- Freelancer:
  - the gig page in Work gets the same two views
  - Profile gets a new "Your availability for meetings" card next to "Your availability"
- Both: an "Inbox" in the dark top bar next to "Notices", listing threads with unread counts. The meeting page shows the time in the member's own time zone, the join link, the consent ticks and, afterwards, "We met" and the summary.
- Emails and notices:
  - meeting booked, rescheduled or canceled
  - reminders
  - "Confirm the meeting happened"
  - new message (no text preview)
  - message held for a check
- Admin area: a "Meetings and messages" tab with:
  - held messages (deliver or not)
  - reports and blocks
  - no-show patterns
  - Vectera room and link status
  - counts: bookings, attended, canceled and no-shows

## When
- A thread opens with the first invitation or proposal on a gig, and stays readable after the gig closes.
- New messages stop 30 days after a gig closes without a hire. A hired freelancer's thread stays open while there is work.
- A slot is held for a few minutes, then released.
- Reminders go out before the meeting (question 4).
- The "We met" and summary request goes out right after the meeting's end time, with one reminder a day later.

## Why
- Talking and meeting inside Lawfecta is how attorneys decide to hire. Keeping it on the platform protects both people (records, payment protection in Step 6) and Lawfecta's business (no fees lost to off-platform deals).
- Clear times, one confirmation and reminders cut no-shows.
- The summaries and what DELA learns make the next step (proposal, agreement) faster and better.

## How it could go wrong
- **Two people book the same slot:** the expiring hold and a database lock mean only one wins. The other is told plainly and shown the next open times.
- **Time zones and the change to and from daylight saving time:** times are stored in UTC and shown in each person's own time zone. Tests include the November and March changes and people in different time zones.
- **A freelancer becomes unavailable or goes on hold after booking:** the meeting stays, but both are told, and new bookings stop.
- **The attorney cancels at the last minute again and again,** or one person never comes: recorded, and repeated patterns go to the team.
- **Vectera is down or the room was not created:** the meeting page says so and offers to retry. Reminders do not send a broken link.
- **A calendar connection is revoked or expires:** DELA stops reading it, says so on the profile, and falls back to "DELA cannot see your other appointments".
- **Off-platform plans in chat:** held or warned (as above). A determined pair can still talk elsewhere. The terms and the Step 6 payment protection are what keep them.
- **Client information in chat or attachments:** the same client information check and notice as everywhere else.
- **Spam or harassment:** report and block. Blocking stops messages and meetings but keeps a way to settle funded work in Step 6.
- **Recording without consent:** impossible from DELA. Both ticks come first, and the consent wording is G (needs a lawyer's review).
- **Email previews leaking content:** emails never include message text.
- **Someone opens an old meeting link:** the room only opens around the meeting time, and DELA checks the person is one of the two.

## Settings and switches it uses
- Switches:
  - meetings (booking and meetings)
  - gig_chat (threads)
  - calendar_sync (already exists, off; needs Google's app review)
  - meeting_recording (already exists, off; G)
  - consultation_export_grant (already exists, off; O-08)
  - chat_assistant (DELA in the thread)
- Settings already in the Decision Sheet:
  - calendar.connections per plan (O)
  - booking.off_platform (C)
  - meetings.provider (C)
  - meetings.recording_consent (G)
  - exports.consultation_grant and exports.consultation_proof (O)
- New settings (suggested numbers in the questions):
  - meeting lengths
  - minimum notice
  - buffer
  - booking window
  - slot hold minutes
  - reminder times
  - late cancel hours
  - no-show count for a team review
  - chat edit minutes
  - message email gap minutes
  - message rate limits

## Questions to make it better
1. Who may book whom? Suggested: meetings only inside a gig. The attorney books with a freelancer who was invited, applied or was hired, and either person can suggest times.
2. Meeting lengths and price? Suggested: 15, 30 or 45 minutes (30 by default), always free. No paid consultations, as the spec says.
3. Booking rules? Suggested:
   - at least 12 hours' notice
   - 15 minutes between meetings
   - bookable up to 21 days ahead
   - a slot held for 10 minutes while confirming
4. Reminders? Suggested: 24 hours and 1 hour before, by notice and email, with the join link.
5. Cancel and reschedule? Suggested: either person, up to 2 hours before. Later than that counts as a late cancel. Two late cancels or no-shows in 30 days go to the Lawfecta Team.
6. Calendar sync? Suggested:
   - everyone gets the .ics calendar file now
   - Google and Outlook connection (busy times only, plus adding the meeting) comes next, behind calendar_sync, after Google approves the app
   - plans as in calendar.connections: Free 1, Plus 2, Pro 5, Business 10
7. Vectera transcripts? Vectera does not document sending transcripts or chat to DELA. Suggested:
   - start with Vectera rooms on meet.lawfecta.com, plus the "We met" and summary step after each meeting
   - when Vectera answers, either add their transcripts or (if they cannot) look again at a video service built for apps
   - recording stays off until the consent wording is reviewed (G)
8. What proves a meeting happened? Suggested: Vectera's attendance record if the API gives it, otherwise both people confirm "We met" within 48 hours. If only one confirms, it stays unverified and the team can correct it.
9. Who may message whom? Suggested:
   - a thread per gig per freelancer, opened by the invitation or the proposal
   - the attorney's side may message anyone invited, applying or hired; the freelancer replies in that thread
   - no messages to people who have not been invited and have not applied
10. Attachments in chat? Suggested: the attorney attaches from DELA Files; the freelancer attaches from their profile documents or a new upload with the no client information tick. All read only, with downloads logged.
11. Edit and delete? Suggested: edit within 15 minutes with the history kept and "edited" shown. Delete shows "Message removed" to the other person and keeps the record for the Lawfecta Team.
12. Off-platform check in chat? Suggested:
    - hold clear cases (personal contact details, paying outside Lawfecta, moving off the platform) for the team, as with gigs
    - send borderline ones with a reminder of the terms to the sender
    - Lawfecta meeting links and DELA file links are always fine
13. Read receipts? Suggested: show "Seen" by default, and each member can turn it off in AI settings (renamed "Settings") for both directions.
14. Report and block? Suggested:
    - either person can report a message or a thread
    - blocking stops new messages and meetings
    - if there is funded work (Step 6), the thread stays open for that work only, and the team is told
15. DELA in the thread? Suggested: buttons for "Summarize this thread", "Draft a reply" and "List what we agreed", on the member's own AI (credits or their key). DELA never sends, and its summaries never change a gig or agreement.
16. Message emails? Suggested: "You have a new message on <gig>" with no message text, at most one every 15 minutes per thread, and none while the person has the page open.
17. After the meeting, should DELA suggest next steps from the two summaries (for example "Update the budget to $600" or "Send a proposal")? Suggested: yes, as suggestions the person clicks to act on, never automatic.
18. Connector? Suggested: list threads and meetings, read a thread, and save a reply draft. Sending and booking stay on the website.

## Success looks like (the test, grouped by login)
1. Freelancer:
   - set availability for meetings (time zone, hours, lengths, a day off)
   - confirm the gig thread shows the attorney's invitation
2. Attorney:
   - book a 30-minute meeting from the freelancer's open times (a day off and times inside the minimum notice are not offered)
   - get one confirmation with a calendar file
   - send a message with a file attachment
   - try a message with a phone number and "pay me directly": expect it held
   - ask DELA to summarize the thread
3. Freelancer:
   - see the booking and reminder in the local time zone
   - reply
   - reschedule once: one update reaches both
4. Owner:
   - see the held message and decide on it
   - see the meeting with its Vectera room status
   - see the counts
5. Check the results:
   - both confirm "We met" and write summaries
   - DELA's suggested next steps appear
   - attendance shows as verified
   - two people trying the same slot at once: exactly one gets it

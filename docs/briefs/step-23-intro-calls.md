# Feature brief: an introductory call before a gig

Step: 23   Spec references: Stacey 2026-11-12 ("Messages and calls before a gig"), Stacey 2026-11-13 ("build book a call before a gig"), the Talent revision package (profile actions: Bookmark, Send message, Book a call)
Status: built with the defaults below; questions open

## Who
Attorneys with a verified license (the same people who can start a conversation before a gig). Freelancers who are match-ready and have set their meeting availability. All plans that have meetings.

## What
An attorney books a first call with a freelancer before any gig exists. The call belongs to the conversation the two have before a gig. It hires nobody, costs nothing and creates no gig.

## Where
- Freelancer profile page, at the right of the header: "Book a call", next to "Send message". It opens the conversation with the open times showing.
- A conversation before a gig: "Book a call" for the attorney who started it.
- "Your meetings", for both people: the call shows as "NAME: Introductory call", with the same join link, calendar file, consent tick, "Change the time" and "Cancel" as a gig meeting.
- Not on Talent result cards.

## When
Only in the freelancer's open times, with the same notice, buffer and booking window as gig meetings. Reminders and the "Did your meeting happen?" follow-up go out as for any meeting. Either person can move or cancel it.

## Why
Attorneys want to talk to someone before they write up a gig. Stacey decided calls and messages may come before a gig; only a proposal invitation needs one.

## How it could go wrong
- A freelancer or someone outside the conversation tries to book: refused. Only the attorney who started the conversation books the first call; a firm colleague can read the conversation but not book for them.
- Stacking calls: one upcoming call per conversation, and a daily limit per attorney (the limit already used for new conversations before a gig, setting intro.max_new_per_day).
- Two clicks, two people at once: the same locks and one-time request numbers as gig meetings.
- The conversation is blocked, or either account is on hold: no booking, and blocking cancels an upcoming call.
- Going around the platform: the screen says to keep all work, contact and payment on Lawfecta; the room is the Lawfecta room; no contact details are shown.
- Recording: the same rule as gig meetings, only with consent from both people.
- The freelancer has set no availability: the screen says so and suggests a message.

## Settings and switches it uses
The meetings switch; intro.calls_on (new, on; set it to false to turn calls before a gig off); intro.max_new_per_day; the meeting.* settings (notice, buffer, window, hold, reminders, join). No new numbers.

## Questions to make it better
1. Is one upcoming call per conversation right, or should an attorney be able to book a second one before the first has happened?
2. Should the daily limit for calls be its own number, lower than the limit for new conversations (10 a day)?
3. Should a freelancer be able to ask for a call, or only the attorney?
4. Should an introductory call have its own shorter length (for example 15 minutes), apart from the lengths the freelancer offers?
5. After the call, should the follow-up offer "Create a gig for NAME" to the attorney?

## Success looks like
- Attorney: profile, "Book a call", pick a time, "Review booking", confirm; "Your meetings" shows "NAME: Introductory call"; no gig exists.
- Freelancer: "Your meetings" shows the same call; consent tick; "Change the time" moves it; both are told.
- Misuse: a second booking on the same conversation is refused with a plain sentence; a blocked conversation offers no times.
- Check the results: the meeting row has no gig and points to the conversation; the notices read "Meeting booked: Introductory call".

# Feature brief: firm logo, and the attorney's picture for freelancers

Step: 21   Spec references: Stacey 2026-11-13 ("attorneys should still be able to upload photo/logo etc since the freelancer should be able to see who they are working with")
Status: built with the defaults below; questions open

## Who
Attorneys and firm staff (they set the picture and the logo). Freelancers (they see them). All plans.

## What
A freelancer deciding whether to send a proposal, writing in a conversation, or working on an engagement sees who the client is: the attorney's picture and name, a "Verified" mark, and the firm's logo and name.
An attorney already had the picture controls on the Profile page. New: the firm's logo.

## Where
- Profile page, "Firm details" card, top: the logo with "Add a logo" / "Change logo" and "Remove logo". It saves at once; there is no Save click.
- Freelancer screens, one card each: the gig page ("Who posted this gig", or "Who you are working with" once hired), a conversation ("Who you are talking with"), the engagement ("Who you are working with").
- Not yet: the small rows in lists (Work, Inbox, Engagements, Bench, Standing arrangements, Meetings) still show the name only.

## When
The logo shows as soon as it is uploaded. A removed logo is gone at once. Pictures follow the attorney's saved profile.

## Why
Freelancers should know who they are dealing with before they commit time. A face and a logo make the request look real and make repeat work more likely.

## How it could go wrong
- A file that is not a picture, or too large: refused, with the same words and size limit as a profile photo (setting profile.photo_max_kb).
- Someone outside the firm tries to set the logo: only the owner and firm staff may; a freelancer is refused; another firm is refused.
- Saving the firm's details must not lose the logo: the form never sends a path and the database keeps the logo.
- A freelancer who cannot see a gig, conversation or engagement gets nothing about the client: the client card is attached only after that screen's own access check passed.
- File paths never reach the browser; pictures and logos travel as links that expire after an hour.
- A logo that is offensive or belongs to someone else: no review today (question 3).
- An agency that posts a gig shows as "Agency" with its business name; it has no logo upload yet (question 4).

## Settings and switches it uses
profile.photo_max_kb (the size limit, shared with profile photos), profile.avatars (ready-made pictures). No new numbers.

## Questions to make it better
1. The gig page now shows the attorney's own name next to the firm's name, to every freelancer who may see the gig. Before, it showed the firm's name only. Keep the attorney's name, or show it only after an invitation or hire?
2. Should the list rows (Work, Inbox, Engagements, Bench, Meetings) get a small picture or logo too?
3. Should the Lawfecta Team be able to take down a logo from the admin area?
4. Should agencies upload a logo as well?
5. Should the logo go on emails and on the exported agreement?

## Success looks like
- Attorney: Profile, "Firm details": add a logo, see it at once with "Logo saved. Nothing else to click."; change it; remove it; save firm details and the logo stays.
- Freelancer: on an invited gig, the card "Who posted this gig" shows the attorney's picture or initial, name, "Verified", and the firm's logo and name; the same card in the conversation and on the engagement.
- Misuse: a text file renamed .png is refused; a freelancer has no logo controls.
- Check the results: firm_profiles holds the logo path; the audit log has firm_logo_set and firm_logo_removed.

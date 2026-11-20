# Feature brief: the public profile, rebuilt to Stacey's five mockups

Step: 53   Spec references: migration 0105 (the freelancer profile page), steps 49 to 51 (the live profile and its editor)
Status: built in acceleration mode. Source: public-profile-mockups.zip (Stacey 2026-11-19), five screens each with numbered revision notes: Overview, Services, Experience, Work samples, Reviews. The mockups are kept in docs/handoff/public-profile-mockups/.

## Who
Attorneys who open a freelancer's profile from Talent, and the freelancer looking at their own.

## What
1. **Owner bar.** On their own profile the freelancer sees a bar, "Editing your profile", with two buttons: "Edit profile" and "Preview as attorney". Preview shows the page exactly as an attorney gets it: no edit buttons and no empty parts.
2. **Compact header.** Photo, name, headline, then one line: the LinkedIn check, the rating and number of reviews, hours a week, time zone, and the agency.
3. **Tabs with plain names:** Overview, Services, Experience, Work samples, Reviews.
4. **Overview.** "About" and "Services" come first at the left (each service with its price and the words "Indicative pricing"), then one card with rows for Skills, Software and Practice area. At the right: "At a glance" and the check card.
5. **The check says what it covers.** "LinkedIn check completed. Lawfecta completed the LinkedIn check. Experience, education and skills are provided by the member."
6. **Services.** Each service on one row: title, for whom, price with "Indicative range". The owner gets "Edit service" on each row and "+ Add service".
7. **Experience.** Each line becomes an entry on a timeline: the role in bold, then the place and the length as the member wrote them. Skills and software in rows under it. An empty Education part shows only to the owner, as a dashed box with "+ Add education or training".
8. **Work samples.** For the owner with none: "No work samples added", the confidentiality reminder, and "Manage work samples", which opens Profile documents. For an attorney an empty Work samples tab is left out.
9. **Reviews.** The rating and count at the left with "Rating details" (each question as "4.6/5", and "Would hire again"); the written reviews at the right, one card each.

## Where
Talent, a freelancer's profile; and Profile, "Preview profile", for the freelancer's own.

## When
Any time.

## Why
Stacey's notes on the mockups: expertise first, facts scannable, what Lawfecta checked said honestly, the owner's controls kept apart from what an attorney sees, and nothing invented.

## How it could go wrong
- Inventing structure: an experience line is split only at " at " and at a dash before a part with a number in it ("... - 6 years"). No dates or lengths are worked out. A line that does not fit shows whole.
- Experience written with headings or lists (step 50) keeps its own formatting; the timeline is for plain lines.
- The owner mistakes Preview for publishing: the bar says which mode is on, and nothing is saved or published by switching.
- An attorney sees empty parts: left out for them (About, Education, Work samples).
- The mockups use a pink header band and pink tags. The first release made them grey under the older no-pink rule; Stacey corrected this the same day ("it should follow the color schemes for the content sections, right now its boring and unappealing"), so the page now takes the mockups' colors: the pink band behind the name, pink tags and icon tiles, the LinkedIn mark, the green check, the gold star, and marks on the buttons.

## Settings and switches it uses
None new.

## Questions, and how Claude answered them (acceleration mode)
1. "LinkedIn check completed" or the word "Verified" (Stacey 2026-11-12)? **On the profile page, the mockup's words**, because they say what was checked. Search result cards keep "Verified member"; say if those should change too.
2. The pink header band? First answered "grey", which was wrong. **The mockups' colors**, as Stacey said on 2026-11-19. A mockup from her is the visual spec for its page.
3. The mockup's left menu (Home, Find Talent, My Profile, Opportunities, Saved)? **Not changed.** The global menu is not to be redesigned.
4. "Would hire again 80% (4 of 5 supplied responses)"? First "the percentage only". **Now with the count** ("80% (4 of 5 reviews)"), counted from the reviews on the page, after Stacey said on 2026-11-19 that the reviews did not follow the mockup.
5. "Category ratings" folded under each review, and "View all 5 reviews"? First left as it was, which was wrong. **Built as in the mockup** (step 54): the reviewer leads in bold, then the month and the practice area, then the text, with "Category ratings" folded under it; the first three reviews show and "View all N reviews" opens the rest. The same view is used wherever reviews show: the profile, "Your reviews" on the Profile page, and the reviews pop-up.
6. Icons in "At a glance" and on service rows? First "words only"; **now drawn** (clock, building, document, pencil, eye, plus), with the mockups' colors.
7. "Edit service" on each row? **Yes**, and each opens the one services editor, where all services are edited together.
8. The owner's Work samples list? **The files the owner marked as shown to attorneys**, read from their own profile.
9. The mockup's note "Overall rating shown as supplied; calculation requires validation"? **The rating is DELA's own average** from completed engagements, shown only once there are enough reviews (the existing rule).

## Success looks like
Freelancer login:
- The bar "Editing your profile" with "Edit profile" and "Preview as attorney"; Preview removes every edit button.
- One header line with the check, reviews, hours and time zone.
- Overview shows About, Services with "Indicative pricing", and the rows card.
- Experience shows the timeline; Work samples shows "Manage work samples".
Attorney login:
- The same page without the bar, with "Invite to gig"; no empty Work samples tab.

# Feature brief: one help tip for the whole site

Step: 39   Spec references: Stacey's "Tooltip and Help System, Design and Rules" with a mockup (2026-11-18); WCAG 2.2 AA (1.4.13 Content on Hover or Focus, 2.5.8 Target Size)
Status: built without waiting, on Stacey's standing word ("release when tests pass and continue building"). The open points are at the end.

## Who
Every member on both sides, and the owner in the admin area.

## What
The "?" help was a large round button that pushed a blue box into the page, so everything under it jumped. It is now one small help tip, the same everywhere:
- **The icon.** A small grey "?" in a circle (18 pixels) beside the heading or label it explains. The area that takes a click or a tap is larger than the picture (44 pixels on a touch screen).
- **The tip.** A small white box with a thin grey border, dark text of 14 pixels, at most 300 pixels wide, with a light shadow. It floats beside or under the icon. Nothing on the page moves.
- **A heading in the tip** only where it helps (the term being explained).
- **Opening.** On a computer: pointing at the icon, or reaching it with the keyboard. A click keeps it open. On a phone: a tap.
- **Closing.** Escape, a click or tap anywhere else, the icon again, or the "×" in the tip. The tip stays readable while the pointer is on it.
- **One at a time.** Opening a tip closes the one before.

## The three kinds of help, and where each is used
1. **Tip** (this step): a short explanation of a word or a feature. One or two sentences.
2. **Help line**: grey text under a field or heading, always on the page, for what a member needs to do the task right (for example "At least $250" under the budget).
3. **Notice**: the blue box, kept for security, privacy, account and system information (for example "Protect client information").

Money, privacy and legal text is never put in a tip.

## Where
One piece of code, D.helpTip in shared/dela-core.js, used by every "?" in the member app and the admin area: Projects, Post a New Gig, the Profile boxes, the Library ("Ready to use"), Work (proposal allowance), the agency bench, the engagement page (milestones, fees, confidential materials, subcontractors, disputes), monthly work, the quality check, usage, and the admin area. "What does match-ready mean?" on Talent keeps its words and now floats on a phone too.

## How it could go wrong
- A tip near the edge of the screen: it is moved to stay inside the screen, and opens above the icon when there is no room under it.
- A tip inside a side panel or a pop-up window: it stays inside that panel.
- The page is redrawn or scrolled while a tip is open: the tip follows its icon, or closes when the icon is gone.
- A screen reader: the icon is a button with a name ("About Projects"), the tip is tied to it and read as its description.

## Not changed
- The words of every tip.
- The blue notices that are real notices.
- "Find a freelancer with DELA" on Talent and "Privacy and secure sharing": these open a section of the page with things to do in it. They are not tips.
- Lines of words that open a longer explanation in place, such as "What does verified mean?" on a freelancer's profile and "What match-ready means" on the Profile page. They hold limits members should read in full ("Verified does not mean Lawfecta checked a license"), which is too long and too important for a tip.

## Questions to make it better
1. The mockup shows a "?" beside each of the four numbers at the top of Projects. Those boxes are buttons, and a button cannot hold a second button. Do you want the numbers explained in one tip beside the row, or is the label under each number enough?
2. The mockup shows a line at the bottom of Projects, "About gigs, engagements, and standing arrangements". Do you want it? The same words are in the tip beside "Projects" today.

## Success looks like
- GitHub Tests pass with the new checks in tests/pw/projects-test.js and tests/pw/profiles-test.js, and the older tip checks.
- A tip never moves the page, on a computer or a phone.
- Only real use can prove: a screen reader reading the tips, and tips on a real phone (docs/PILOT_CHECKS.md 39.1, 39.2).

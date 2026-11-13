# Feature brief: Talent search and freelancer profile, revised to mockup 02

Step: 22   Spec references: Stacey 2026-11-13, "Lawfecta Talent: Original-Locked Annotated Package" (three annotated mockups, annotation index, implementation brief). Stacey: "use mockup 02 as the base".
Status: built with the defaults below; questions open

## Who
Attorneys (and agencies that hire) searching Talent and reading a freelancer's profile. All plans.

## What
The audit of the site against the package's 15 acceptance tests found 4 that passed (invitation flow, invalid gig handling, bench and standing rules, software found by keyword) and 11 that passed in part or not at all. This step closes the gaps that do not need a new back-end feature.

## Where
Talent tab:
- Top: one line of what Talent is, "What does match-ready mean?" (opens on hover, keyboard focus or click on a computer; opens in place on a phone; Escape closes it), and the rule "You can message a freelancer before hiring. A posted gig is required to invite a freelancer to submit a proposal."
- "Find a freelancer": the keyword box, then five filters that each work on their own: "Category", "Practice area / Specialty", "Services / Tasks", "Software", "State / Jurisdiction". Buttons "Search freelancers" and "Reset".
- "Find a freelancer with DELA": an accordion that keeps its state and typed words. "Suggest filters" returns chips; "Apply filters & search" or "Edit filters manually" comes after. Nothing is searched before that.
- Results: the count, the filters in use as removable chips, "Clear all", "Sort by" whenever there is a result, "Try again" after an error. Cards: picture, name, "Verified", reviews (no star when there are none), summary, tags, facts, and on the right "View profile", "Invite for gig:" and "Invite to this gig".
Freelancer profile page:
- Header: who they are on the left; on the right the bookmark, "Send message", then "Invite for gig:" with "Invite to this gig".
- Five tabs: Overview, Services, Experience and qualifications, Portfolio, Reviews. Promotions now sit inside Services and are summed up on Overview.
- Overview in two columns: "Professional summary", "Primary services", "Software expertise", categories on the left; "Quick facts", "Verification" (with "What does verified mean?") and "Current promotion" on the right. Empty items are left out.
- The browser's Back button returns from a profile to the search, with the filters, the sort, the freelancers already loaded and the place in the list.

## When
Every search. The match-ready days come from the setting profile.availability_days.

## Why
Attorneys could not filter by software without picking a category and a specialty first, DELA's suggestions could start a search on their own, and the profile's Overview repeated the header in one long column.

## How it could go wrong
- A typed word that appears nowhere finds nobody: every word must appear, in any order (before, the whole phrase had to appear as typed).
- A suggestion from DELA that is not a category or a listed software becomes its own removable filter, so it can be seen and taken out.
- Double clicks on "Suggest filters": the button is off while DELA works, so an action is used once.
- The match-ready panel must not trap the keyboard or hide content on a phone: it is in the page flow on small screens.
- Trust words: "Verified" is explained where it is shown, and the page says what it does not mean.

## Settings and switches it uses
profile.availability_days, talent.page_size, ai.credits.find_fit, the ai_helpers switch. No new numbers.

## Not built in this step
- "Book a call" on the profile before a gig. Meetings today belong to a gig (a booking needs a gig). This needs a back-end change and a decision (question 1).
- Sort by text relevance. "Most relevant" still orders by plan and recent activity (question 3).
- A screen-reader pass by a person, and zoom to 400%. The automated rules (axe-core) and a 320 pixel phone width are tested.

## Questions to make it better
1. "Book a call" before a gig: who may book (any verified attorney?), how many a day, and does it use the same Vectera room and consent rules as gig meetings?
2. "State / Jurisdiction" today only leaves out freelancers who said they do not take work for that state. Should it instead mean where the freelancer is based, or where they are experienced?
3. Should "Most relevant" put the best text match first, ahead of plan level?
4. The Software filter lists the same software names as the Profile page. Should attorneys also be able to type a software name that is not on the list? (The keyword box already finds it.)

## Success looks like
- Attorney: pick "Software" Clio with nothing else chosen and get results; type "clio family" and get the same people as "family clio".
- Attorney: open "Find a freelancer with DELA", type a task, close and reopen (the words stay), "Suggest filters", remove one chip, "Apply filters & search".
- Attorney: open a profile, see two columns on a computer and one on a phone, press the browser's Back button and land on the same results.
- Misuse: with no posted gig, "Invite to this gig" is off and the page says why, while "Send message" still works.

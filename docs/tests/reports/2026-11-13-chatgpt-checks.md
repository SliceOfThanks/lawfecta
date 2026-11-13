# ChatGPT checks 1, 2 and 3, run by Stacey on 2026-11-13

Stacey pasted the three reports into the session. This is what they said and what was done.

## Check 1, Talent journey: 25 of 26 passed
- Step 14 failed: the agent saw the four suggested chips and both buttons, but not the heading "DELA suggested filters" and the sentence "Review or remove the suggestions below. Nothing is searched until you apply them."
  The code draws both in the same place as the chips, and the browser test (tests/pw/helpers-test.js) waits for the heading. Not reproduced. Open: a person looks once.
- Step 26, verbatim: "The website answered. Rows read: 1. ... DELA writes a bookmarked member as: dataType 10, featureId 1, checked 1. The website's own bookmarks look like: dataType 10, featureId 1, checked 0, a member."
  Not changed: one row is not enough to know what "checked" means on the website (it may mark a bookmark that was removed there). Open in docs/PILOT_CHECKS.md, line 3.2.
- Everything else passed: categories, who posted a gig, five filters, keywords in any order, Load more, the profile page, browser Back, bookmark and removal, invitation not sent twice.

## Check 2, Subscription: 10 of 10 passed
- Note: freelancer storage reads "4.9 GB" (Pro) and "19.5 GB" (Business), because the plans hold 5,000 and 20,000 MB. Attorney plans hold multiples of 1,024 and read as whole numbers. Asked Stacey whether to make them 5,120 and 20,480 MB (a business number, her decision).
- Note: the website's own sidebar says "Plan: Free" while DELA says the plan the team set. DELA explains it on the page.

## Check 3, Meetings and calls: 15 of 16 passed
- Step 1 failed on one point: the heading "Scheduled (N)" was missing. The step ran a few minutes before the release that added that heading (release 21:59 UTC; the booking in step 10 was at 22:05 UTC). Not a defect.
- Note, fixed: right after booking, the card said "Meeting room not connected yet..." although VideoSDK is connected; the room is made about a minute later. The card now says "Your meeting room is being set up. This takes about a minute." and keeps the old sentence for a meeting service that really is not connected. Test added in tests/pw/meetings-test.js.
- Note: the attorney's transcript box was already ticked. Expected: the test attorney ticked it in the first VideoSDK test.
- Left on the site by the check: an introductory call with sample freelancer Hannah Kim, 2026-11-16 3:15 PM Pacific, 30 minutes.

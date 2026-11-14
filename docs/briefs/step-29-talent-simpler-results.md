# Step 29: a simpler Talent search page

Stacey 2026-11-13: sent a new mockup, an annotated copy with 12 review notes, and a list of 12 findings on the page as it was ("why the current Talent results feel too busy"). Her words: "review the attached, and only make adjustments that haven't been made. This is UX/UI improvements, that's all." Built the same day; no questions were needed first.

## Who
Attorneys (and agencies that hire) searching Talent on a computer and on a phone.

## What changed, by her finding
| # | Finding | State before | What was done |
|---|---|---|---|
| 01 | Too much explanation before search | Three lines of text above the search | One line: "Find verified legal professionals to support your practice." The match-ready help stays a small link. The rule about inviting is said on the invitation step. |
| 02 | Too many search fields at once | A search box and five lists | One search box. The five lists sit behind "Filters (N)", closed until asked for. Each still works on its own. |
| 03 | State filter explanation | Helper text next to the list | The help sits with the State list inside the Filters panel. |
| 04 | Search actions scattered | Search, Reset and "Bookmarked only" on separate rows | One row: "Filters (N)", "Search freelancers", "Clear filters". "Bookmarked only" and "★ Your bookmarks" are in the Filters panel, with "Apply filters". |
| 05 | DELA should be optional | Already an accordion | Kept. The bar now shows "Uses 1 DELA action (none on your own AI key)" while closed. |
| 06 | Results need better feedback | Already there: the count, removable chips, "Clear all", "Sort by" | Kept. |
| 07 | Weak identity hierarchy | Picture, name, headline, "✓ Verified", "No reviews yet" | "✓ Verified member" (hover says what was checked). The reviews line shows only when there are reviews. |
| 08 | Bios and service lists overwhelm | Full summary, a long category line, up to nine tags | Two lines of summary, at most three tags, no category line. The full profile holds the rest. |
| 09 | Gig selector on every card | A gig list and "Invite to this gig" on each card | "View profile" and "Invite to gig". The gig is chosen on the invitation step (already chosen when there is only one). |
| 10 | Invitation warning repeats | The same sentence under every card | Removed from the cards. The invitation step already says "Nobody is hired at this step." |
| 11 | Rows too tall and uneven | Variable | Follows from 08, 09 and 10. |
| 12 | Paging and usage distract | "DELA actions: N of M" under the results | Not shown on Talent (it stays on the other pages and on the Subscription page). "Load more freelancers" is unchanged. |

## Already in place before this step
The count and sort, removable filter chips, "Load more" with the keyboard landing on the first new card, pictures and ready-made avatars, browser Back, the review step before an invitation, results announced to screen readers.

## How it could go wrong
- A member looks for the filters and does not see them: the button says "Filters (N)" and shows how many are in use; chips above the results name each one.
- "Invite to gig" with no posted gig: the invitation step says "Post a gig in Projects first." and the send button is off.
- Phone 320 wide: the row of three controls wraps; cards keep two buttons side by side.

## Not done, and why
- Hours "confirmed on" date on the card (note 8, "when known"): the search does not return that date yet.
- Neutral (grey) tags: the mockup itself shows pink tags, so they stay pink.

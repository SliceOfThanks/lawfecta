# Feature brief: Talent marketplace redesign

Step: 18 (after go-live)   Spec references: Stacey's revision prompt and 12 annotated mockups of 2026-11-12 (her Downloads folder, "Lawfecta_Annotated_Mockups_and_Revision_Prompt"); step 17 (website categories); steps 4, 5, 7 (gigs, messages and meetings, reviews and bench)
Status: approved to build in parts (Stacey 2026-11-12: the prompt, and "keep the website categories, use the mockup layout")

## Who
Attorneys and agencies that hire (finding, judging and inviting freelancers); freelancers (how they appear, their picture); the Lawfecta Team.

## What
An attorney finds a freelancer, reads one complete profile, messages or books them, picks one of their posted gigs and invites the freelancer to send a proposal, all inside Lawfecta. Nothing on the way hires anyone.

## The audit (2026-11-12): what exists, what changes, what is missing

| Mockup | Exists today | Changes | Missing (no server side yet) |
|---|---|---|---|
| 01, 02 Talent results and gig selector | Search by website category, state and words; invitations that ask for a proposal, with duplicate handling | Count, filter chips, sort, cards with photo, checked status, reviews, tags, availability; two actions only; gig chosen first; a paused gig takes no invitation | Multi-select of several categories at once |
| 03 Full profile | A small pop-up from `GET /freelancers/card` | One page with a way back that keeps the search; shows services with prices, education, categories, availability | A page address for a person; services, education and shown documents in the answer |
| 04 Invitation review | Invite with an optional note (only on the gig's Matches view) | A review step with the gig's scope, budget, deadline and a note | Nothing; the note and the checks exist |
| 05 Services and promotions | Services with a price range on the profile | Shown to attorneys | Promotions do not exist (only a plan allowance) |
| 06 Experience and qualifications | Experience and education as text; LinkedIn check for freelancers | Shown in sections; only "LinkedIn verified" is claimed | Structured roles with dates; identity and credential checks |
| 07 Portfolio | Freelancers upload documents and mark them "shown" | A Portfolio tab | No way yet for an attorney to list or open a shown document |
| 08 Reviews | Reviews only from completed engagements; count, averages per question, "would hire again" | Inside the profile, not a drawer | A star distribution (reviews rate four questions, not one star score) |
| 09 Messages | Conversations on a gig (after an invitation, proposal or agreement) or on a bench | "Send message" from the profile | A conversation before any gig exists |
| 10 Book a call | Booking with availability, time zones and confirmation, on a gig | "Book a call" from the profile | A call before any gig exists |
| 11 Profile picture | Photo upload | A neutral default and a set of ready-made pictures | The set itself (Stacey uploaded 60 to the website's Media Manager, folder "Avatars", on 2026-11-12) |
| 12 Completed gig | Bench invitation on a completed engagement; standing arrangements the freelancer must accept | Both only after a completed engagement, checked on the server; standing arrangement offered from the completed engagement and from Projects | Nothing |

Also missing everywhere: bookmarks.

## The parts, in build order
1. **Part 1 (built 2026-11-12): Talent results and the rules.** Mockups 01, 02 and 12. Migration 0104.
   - Cards: photo or initial, name, headline, "LinkedIn verified" only when that check passed, the real review summary or "No reviews yet", categories, practice areas and software, hours and time zone, short summary.
   - Two buttons only: "View profile" and "Invite to this gig". "Gig to invite for" lists only posted gigs still open for proposals, starts unselected, and the button is off until one is chosen. The card says an invitation asks for a proposal and hires nobody. Already invited, closed gig, unavailable freelancer and a lost connection each get their own message and send nothing twice.
   - Count, the filters as removable chips, "Clear filters", "Sort by" (most relevant, most reviews, most hours a week, name).
   - DELA's help is folded into "Need help finding the right freelancer?"; opening it or typing uses no action.
   - Rules on the server: a bench invitation and a standing arrangement need a completed engagement between the two (not canceled, not refunded, no open dispute); settings bench.require_completed and standing.require_completed, both on. A gig paused by the Lawfecta Team takes no invitation.
   - Standing arrangements are offered from the completed engagement ("Propose a standing arrangement") and from Projects ("Freelancers you have completed a gig with"). "Reviews", "Invite to my bench", "Set up a standing arrangement" and "Create a gig from an SOP or Workflow" left the Talent cards.
2. **Part 2: the full profile page.** Mockups 03, 05, 06, 07, 08. A page at /dela?tab=talent&person=..., back link that keeps filters, sort and place; tabs Overview, Services, Experience and qualifications, Portfolio, Reviews; the invite control; shown documents opened through DELA.
3. **Part 3: the invitation review step and profile pictures.** Mockups 04 and 11. Review page with scope and an optional note; default picture and the ready-made set, shown the same on cards, profile and messages.
4. **Part 4: contact before a gig.** Mockups 09, 10 and bookmarks. Needs decisions below.

## How it could go wrong
- An attorney invites to a gig that closed a minute ago: the server refuses, the card says so, the gig leaves every list.
- Two clicks or two tabs: one invitation (the server answers "already invited").
- Someone calls the bench or standing address directly without a completed engagement: refused with "needs_completed_gig".
- A photo link is copied: it is a signed link that stops working after an hour; the storage path never leaves the server.
- Existing bench members and standing arrangements made before the rule: untouched.

## Settings and switches it uses
bench.require_completed, standing.require_completed (new, on); switches talent_search, bench, auto_repeat_hiring, reviews, ai_helpers (unchanged).

## Decisions needed from Stacey
1. **Messages and calls before a gig (mockups 09, 10).** Today every conversation and call belongs to a gig, which is also how DELA keeps contact on the platform and checks each message. Choices: (a) "Send message" and "Book a call" open after the attorney invited the freelancer to a gig (works today), or (b) a new kind of conversation with no gig, with the same message checks and a limit per day. Default until you choose: (a).
2. **Verification wording.** Freelancers have one check, LinkedIn. The mockups show "Identity verified" and "Credentials reviewed". DELA will say "LinkedIn verified" and nothing more unless new checks are added. Do you want identity or credential checks built (who checks, and what proof)?
3. **Reviews breakdown.** DELA reviews rate four questions (quality, deadlines, communication, followed the playbook), not one star score. The Reviews tab will show the average per question and the count rather than a 5-star distribution. OK?
4. **Promotions.** Nothing exists. Leave the tab out until promotions are built, or build promotions now (who may post one, with what terms)?
5. **Portfolio.** Show the documents a freelancer marked "shown" (they tick that there is no client information when uploading). OK to let verified attorneys open them?
6. **Avatars.** Of the 60 uploaded pictures some are costumes (ninja, nun, waitress). Offer all 60 or a professional subset? And should a monthly engagement that is still running count as "worked together" for the bench and standing arrangements? Today only a completed engagement counts.
7. **Bookmarks.** A private "saved" list per attorney, no notice to the freelancer. OK?

## Success looks like
An attorney can find a freelancer, review their complete profile, message or book them, select an existing posted gig, and invite them to submit a proposal without unnecessary screens, misleading actions, inaccessible interactions or off-platform contact.

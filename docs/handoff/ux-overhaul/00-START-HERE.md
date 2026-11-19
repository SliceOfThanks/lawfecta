# Lawfecta DELA: UX/UI overhaul handoff

Written 2026-11-18 from the code that is live on that day (code_version c801b18 or later, step 43 included).
Every label in quotes in this handoff was copied from the code. Nothing here is a mockup or a wish.

## 1. What this is for

Lawfecta DELA is being redesigned as a whole, not page by page. This handoff gives a design team (people or AI) what
they need to redesign every screen at once without losing a feature, a rule or a state:

- every page, what it is for, and the one main thing a person does there
- the layout of each page from top to bottom
- every button, link, tab, dropdown (with its options), box, upload and pop-up, and what each does
- every status word, empty state, error and success message
- what changes by side, plan, role, feature switch and state
- the design system as it is built today
- the rules a redesign must keep
- what is inconsistent, duplicated or unfinished today

## 2. How to read it

| File | What it holds |
|---|---|
| 00-START-HERE.md (this file) | The product in one page, the site map, the journeys, the rules, the known problems, what is still needed from Stacey |
| A-shell-home-settings.md | Global menu, top bar, account menu, the screens before the app opens, Home (every widget, "Customize dashboard"), Help, Settings, Subscription, Usage, Notifications, links by address |
| B-askdela-profile-files.md | Ask DELA, Profile and verification (both sides), Connect to ChatGPT or Claude, the client information card, Files |
| C-library-recorder-setup.md | Library, the document page (both formats), images in documents, imports, Recordings and "Record a process", "Get set up", attorney decisions |
| D-projects-gigs-agency.md | Projects (four tabs), "Post a New Gig" (three steps), the gig page and its views, standing arrangements, the Agency page, inviting a freelancer |
| E-talent-work-inbox-meetings.md | Talent search, Bookmarks, the freelancer profile page, the freelancer's Work page and proposal form, Inbox and conversations, booking and Meetings |
| F-engagements-earnings-reviews.md | "Agreement and work" in every state, signing, payment review, milestones, monthly engagements, Confidential materials, disputes, Earnings and payouts, closeout, reviews, the bench |
| G-admin-security-design.md | **The design system as built** (colors, type, spacing, buttons, badges, notices, cards, tables, help tips, glossary), the owner's admin area (every tab), the public security page |

Each page section has the same parts: How to reach it, Purpose and primary focus, Shown when, Layout top to bottom,
Content and data, Interactive elements, States, Help, Variations, Mobile and accessibility notes, UX observations.
"UX observations" are the reader's opinion and are marked as such. Everything else is fact from the code.
Function names and line numbers point into `app/dela-app.js`, `admin/dela-admin.js` and `shared/dela-core.js` for the
developer who builds the new design.

LAWFECTA-DELA-UX-HANDOFF-ALL.md is all of the files above in one, for pasting into an AI tool.

## 3. The product in one page

- **Who uses it.** Attorneys (and their firm staff) who hire, and freelancers (paralegals and other legal support, alone
  or as an agency) who are hired. The Lawfecta Team (the owner) has a separate admin area.
- **Two sides, always separate.** One person can hold both sides. Each side has its own plan (att_free, att_plus,
  att_pro, att_business; fl_free, fl_plus, fl_pro, fl_business), its own menu, Home, fees and limits. A workspace switch
  in the top bar moves between them. Nothing mixes. An agency owner is a freelancer who can also hire subcontractors, so
  an agency sees some hiring pages on the freelancer side.
- **What it does.** An attorney describes work to DELA (the AI), which drafts step by step documents and gigs. The
  attorney posts a gig, freelancers send proposals, the attorney hires. Both sign an agreement with milestones. The
  attorney pays each milestone through Stripe, Lawfecta holds the money, the freelancer delivers, DELA checks the
  delivery against the agreed checklist, the attorney accepts, and the freelancer is paid out. Around that: messages,
  meetings, confidential materials, disputes, reviews, a bench of trusted freelancers, monthly engagements and standing
  arrangements for repeat work.
- **Where it runs.** Inside a Brilliant Directories website as one widget. All pages are one app at
  `/dela?tab=<key>`; a page is chosen by the `tab` value and by state inside the app. The app draws inside a shadow
  root, so the website's own styles do not reach it.
- **Feature switches.** Most features sit behind a switch the owner turns on. A redesign must handle a page or control
  being off. Each page section says which switch it needs.

## 4. Site map

Full tables, with icons and the rules for when an item shows, are in A-shell-home-settings.md, section 1.

**Attorney menu:** Home (`home`), Projects (`projects`), Ask DELA (`delegate`), Library (`library`), Talent (`talent`),
Notifications (`notices`), Meetings (`meetings`), Files (`files`), Get set up (`setup`, until finished), Profile
(`profile`), Subscription (`subscription`), Settings (`ai`), Help (`help`), Collapse sidebar.

**Freelancer menu:** Home (`home`), Work (`work`), Ask DELA (`ask`), Earnings (`earnings`), Notifications (`notices`),
Meetings (`meetings`), Profile (`profile`), Subscription (`subscription`), Agency (`agency`), Settings (`ai`), Help
(`help`), Collapse sidebar. An agency that hires also gets Library, Projects and Talent.

**Top bar, every page:** page title, workspace switch, "Inbox" (`inbox`) with its unread count, the bell (opens the
notifications panel), the avatar (account menu with Appearance and signing out).

**Pages with no menu item:** Inbox (`inbox`), Usage (`usage`, attorney, older page), Connect (`connect`), "Record a
process" (`record`), and every page inside a page:

- Projects → "Post a New Gig" (3 steps) · a gig (Details, Matches, Questions, Proposals, Files, Agreement and work)
- Talent → Bookmarks · My bench · a freelancer's profile (Overview, Services, Experience and qualifications, Portfolio,
  Reviews) · "Invite to submit a proposal"
- Work → a gig as the freelancer sees it · "Your proposal" · Agreement and work
- Library → a document (Read, Edit, Chat, Suggested edits, Comments, Activity, Versions, Files, Export) · the approved
  version · imports · Recordings
- Inbox → a conversation · booking a meeting
- Meetings → one meeting · the meeting room
- Subscription → My Subscription, Usage & Limits, Compare Plans, Billing & History
- Admin area (owner only, a separate widget) and the public security page

## 5. The journeys that cross pages

A redesign should be checked against these whole journeys, not single screens.

1. **Join and get ready.** Log in on the website → "Almost there" (choose a side) → Home → "Get set up" (attorney) or
   "Complete your profile" (freelancer) → Profile: license verification (attorney) or match readiness (freelancer).
2. **Describe work and get a document.** Ask DELA or Library → DELA's questions → a draft document → quality check →
   approve → the approved version.
3. **Post a gig.** Projects → "+ New Gig" → step 1 "Set up the gig" → step 2 "Review DELA's draft" → step 3 "Review
   and post" → the gig page.
4. **Find and choose a freelancer.** Gig → Matches, or Talent search → a freelancer's profile → invite → the
   freelancer's Work page → their proposal → the attorney's Proposals view → "Compare proposals" → hire.
5. **Agree and pay.** Agreement and work → both sign → "Next action: Pay milestone 1" → "Review payment" → Stripe →
   back on the page, paid.
6. **Deliver and accept.** Freelancer: start, submit with a completion statement → DELA's check → attorney: "Review
   deliverable" → accept (on-page confirmation that shows the amount released and the next charge) or ask for changes →
   payout → next milestone → closeout → reviews.
7. **Talk and meet.** Inbox conversation ↔ booking a meeting → Meetings → the meeting room with recording consent →
   transcript and follow-up.
8. **When it goes wrong.** Payment did not go through → pay again; a dispute → the dispute center with offers and the
   Lawfecta Team; cancel; a paused engagement.
9. **Repeat work.** Bench → standing arrangement → monthly engagement (monthly terms, renewal, change for next month,
   cancel at month end).
10. **Plan and limits.** A limit is reached → "Limit reached" dialog → Subscription → "Compare Plans" → "Review your
    plan change".

## 6. Rules a redesign must keep

These are decisions already made by the owner or required by law or payments. They are not design choices.

1. **Two sides stay separate.** Separate menus, plans, fees, limits and Home. Never show one side's fee, payment method
   or payout account to the other.
2. **No invented data.** Every figure comes from a platform record. No sample numbers, trends, scores or zeros that stand
   in for "not set". Say "Budget not set", "Not scheduled", "Not available".
3. **Money is exact.** Show the amounts and fees in view, never only in a tooltip. Each payment shows its fee only when
   that payment carries one. "Paid" comes from the payment record, never from "accepted". Payment, delivery and
   acceptance are three separate states.
4. **Review before a consequential action.** Paying, accepting a milestone, signing, opening or settling a dispute,
   canceling: the person sees what will happen and confirms on the page. Buttons lock while a payment is in flight.
5. **Automatic charge is said in plain words.** The next milestone is charged to the saved method when the one before
   it is accepted. The page says so before the attorney confirms.
6. **Sensitive data.** SSNs, ID numbers, account numbers, health information, biometric data and logins are never
   uploaded, only linked from the firm's own storage. The notice shows wherever people type or upload, and uploads have
   a tick box. Files shared on a job are never read by the AI.
7. **AI is labeled.** AI output is shown as a suggestion that fills an unsaved form; nothing is saved, posted, signed or
   paid by the AI. Each AI check shows how many DELA actions it uses. Members may bring their own AI key.
8. **Recording needs consent** from both people before a meeting is recorded.
9. **Help tips.** One shared help component: a small "?" beside the label, a floating white box that does not move the
   page, opens on hover, focus and tap, closes with Escape, stays open while hovered (WCAG 1.4.13). A tip never holds the
   only copy of an instruction.
10. **Accessibility.** WCAG 2.2 AA: text contrast 4.5:1, status in words and not by color alone, visible focus, full
    keyboard use, targets at least 24 by 24 and 44 by 44 for main touch actions, one column and no sideways scrolling
    at 320 wide, tables that stack into labeled lines on a phone.
11. **Visual rules already set.** White sidebar (do not redesign the global sidebar or navigation without the owner's
    word). Navy `#0B1220` headings, burgundy `#8B2146` main actions, `#F5F5F7` page background, white cards, blue
    `#0D83DD` for information and focus. No pink section backgrounds in content; small tags may be pink. Light and dark
    mode both exist.
12. **Writing style.** Plain and direct. No em dashes. Buttons say what they do ("Review payment: milestone 2", not
    "Pay"). Dates and amounts in full.
13. **Nothing is removed silently.** Every action that works today must have a place in the new design, or be listed as
    removed for the owner to approve.
14. **Features that are off are not shown as working.** "Coming soon" is said in words, or the item is left out.

## 7. Known problems to solve in the overhaul

Collected from the page readers. Details and line numbers are in each file's "UX observations".

**Wording that drifts**
- "Notices" and "Notifications" for the same thing. "AI settings" and "Settings". "playbook" and "document".
  "paralegals" and "freelancers".
- "Needs your attention", "Needs your action" and "Needs action": three names, built from two data sources, so the
  counts can differ between Home, Projects and the notifications panel.
- The attorney's fee has four names: "Platform fee", "Lawfecta fee", "Attorney platform fee", "the platform fee".
- "Suggestions view" in the text, "Suggested edits (N)" on the tab.
- "Ask DELA" has the address `delegate` for attorneys and `ask` for freelancers.

**Structure**
- Settings is one long page of up to 16 cards with no tabs. Appearance is in Settings and again in the account menu.
- Two usage pages for attorneys: the footer link "DELA actions: N of N this month" opens the old Usage page, while Home
  and the banner open Subscription, "Usage & Limits".
- Menu items "Projects", "Talent", "Work", "Earnings" and "Ask DELA/Delegate" show even when their switch is off and
  open a dead-end "Coming soon" page.
- The Library has two document formats (the older 13-part one and the document standard) with different tabs and
  editors, and two create flows.
- Earnings shows two totals only: no payout history, pending amounts, dates or export.
- Agency Home says "Agency and personal proposals/gigs are not separated yet."
- The wrong-side page's "Switch to the ... workspace" lands on Home, not on the page the link asked for.

**Confirmations**
- Three patterns are mixed: on-page review boxes (payment, accepting a milestone), in-row swaps (monthly cancel), and
  browser pop-ups (human review, accept an offer, withdraw a dispute, cancel an engagement, remove from bench, leave a
  bench, delete a webhook, stop review requests, report a review, cancel a meeting, remove an AI key). "Open the
  dispute", "Ask for changes" and "Ask to end now" have no confirmation. One pattern is needed.

**Fixed on 2026-11-18, after this was written (code_version ea4cecf):** the meeting "Cancel" button; rows that are buttons now open with Enter or Space; the footer usage link opens Subscription, "Usage & Limits"; a paused, canceled or disputed engagement says so in "Next action"; the wrong-side page's switch lands on the page asked for; "Signed" says who pays. Agreement status "sent" is never set, so it was not a defect.

**Possible defects found while reading (not yet confirmed by running; each will be checked and fixed with a test)**
- Meetings: "Cancel" on a meeting card reads a value that is not defined at that spot, so canceling may fail.
- Agreement status "sent" shows "Nothing to do here" with no sign form.
- A paused or disputed engagement's "Next action" says "Nothing to do here" even when a dispute waits for an answer.
- Library comments: the empty state points to a "Comment" button the standard editor does not have; "Accept" on a
  suggestion shows to Editors where the text says only the administrator can accept.
- "Saving your recording" never marks the "Ready for review" step.
- "Use suggestion" and "Edit" under "✦ Improve acceptance criteria" do the same thing.
- Rows that look clickable (engagement list, Library table) have a role and tab stop but no keyboard handler in the code
  read.
- On a freelancer's profile, "Send message" and "Book a call" show to attorneys only, while "Invite to gig" and the
  bookmark also show to an agency that hires.

## 8. What the code could not tell us

- Lists that come from the server or the website at run time: practice areas, Lawfecta categories and specialties, tech
  tools, US states, time zones, plan names, prices and plan feature labels, the sensitive data notice text, the profile
  checklist labels, DELA's suggested questions.
- Server error texts that are not mapped in the browser code.
- How each page looks: this handoff has no screenshots.

## 9. Still needed from Stacey for a complete handoff

1. Screenshots of each page at desktop and phone width, light and dark (or a login for the design team on the test
   site).
2. The priority order: which pages and journeys matter most, and which may wait.
3. What members and testers have complained about, in their words.
4. Brand files: logo, fonts, any brand guide.
5. What must not change (beyond section 6), and whether the global sidebar may be redesigned in this overhaul.
6. Which switched-off features to design for now, and which to leave out.
7. The target: a visual refresh on the same structure, or a new structure (new menu, merged pages).

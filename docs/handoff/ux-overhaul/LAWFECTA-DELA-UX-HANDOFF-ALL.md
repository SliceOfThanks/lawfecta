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

---

# PART G. Design system as built, admin area, security page

(The design system is the first section of this part.)

# G. Admin area, public security page, widgets, and the design system as built

Sources read in full: `admin/dela-admin.js` (2,557 lines), `app/dela-security.js` (282 lines), the four files in `widgets/`.
`shared/dela-core.js` lines 1 to 520 were read in full. The stylesheet (`D.CSS`) starts at line 485 and runs to about line 919, so the rules for buttons, notices, cards, tables, pills, the help tip and the toast sit after line 520. Those rules were pulled by targeted search of lines 521 to 919 and are quoted exactly; rules that only style member-app pages were not inventoried. Lines 933 to 959 (login-conflict text, logo) were also looked at because the admin uses them.

---

# Design system as built

Everything renders inside a shadow root (`D.mount`, core line 114) in `<div class="dela" data-theme="auto">`. Theme attribute: `auto` (follow device), `light`, `dark` (`D.setTheme`, line 483). The admin and member app share one stylesheet. The new layout adds class `nl` to `.dela` and overrides several values (noted as "new layout" below).

## Color tokens (core lines 487 to 493)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#f5f5f7` | `#11131b` | page background |
| `--card` | `#ffffff` | `#1a1d28` | cards, inputs, menus |
| `--ink` | `#0b1220` | `#eceef3` | body text |
| `--muted` | `#475569` | `#a7adbb` | secondary text, table headers |
| `--line` | `#dce3ea` | `#2a2e3c` | borders, dividers |
| `--head` | `#e2e4e8` | `#2b303c` | card header band (new layout), Switches table bands |
| `--sel` | `#e8ecf2` | `#262b39` | selected/"now" step, strong flow panel |
| `--brand` | `#8b2146` (burgundy) | `#c2416f` | primary buttons, links styled `linkish` |
| `--brand-ink` | `#ffffff` | (not redefined) | text on brand |
| `--blue` | `#0b6fbd` | (not redefined; blue buttons become `#1f6fb2`) | `blue` buttons, focus ring, progress bar |
| `--pink` | `#fbeef2` | `#2a1622` | current nav item, selected tab, badge G |
| `--pink-ink` | `#8b2146` | `#f19ab8` | text on pink, eyebrow, row action text |
| `--navy` | `#1d2030` | (not redefined) | pressed pill |
| `--hero` | `linear-gradient(135deg,#1d2030 0%,#3a1a33 45%,#8b2146 100%)` | same | `.hero.navy` (security page hero) |
| `--hot` | `linear-gradient(120deg,#3a1238 0%,#8b2146 55%,#d23b62 100%)` | same | `.hero` default |
| `--ok` | `#2f7a4f` | (not redefined) | done ticks, ok notice border |
| `--warn` | `#a46a00` | (not redefined) | activity dot "settings" |
| `--bad` | `#b3261e` | (not redefined) | danger button, bad notice, bad toast |
| `--soft` | `#f1f2f6` | `#222634` | soft panels, kv tiles, hover |
| `--shadow` | `0 10px 30px rgba(139,33,70,.10)` | `none` | card shadow (new layout sets `none` in both) |
| `--okbg` / `--okline` | `#e3f3ea` / `#b6dcc5` | `#17301f` / `#2b5a3b` | done steps, ok boxes |
| `--bluebg` | `#eef6fd` | `#132233` | flow panel, help box, own message |

Sidebar, bottom bar and sheet (`.nl-side,.nl-bar,.nl-sheet`) use their own light values: `--ink:#1c2230; --muted:#5f6675; --line:#e6e7ec` (dark: same as the main dark values).

Hard-coded colors outside tokens (not exhaustive): old top bar `linear-gradient(120deg,#1d1426,#3a1430)`; avatar `#b8315e`; notice `#eaf4ff` / `#b8d8f8` / `#172b4d`; info icon `#0d83dd`; AI button `#7a4b8c` / `#5a2d6b` / `#f7f0fa`; health dot `#d23b62`. Dark mode has its own hard-coded set (links `#8cc4ff`, ghost text `#f19ab8`, notice `#132233`/`#2b4a66`, bad `#3a1d1b`, ok `#17301f`).

## Fonts and sizes
- Family: `Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`. No web font is loaded in the code read, so Inter only shows if the device has it.
- Base: `16px`, line-height `1.5`. New layout: `15px`.
- `h1` 28px / 800 / letter-spacing -.01em (new layout 22px, 24px from 900px wide; 24px under 600px in old layout). `h2` 19px / 800 (new layout 17px / 700). `h3` 16px / 700.
- `.small` 14px. `.muted` uses `--muted`. `.eyebrow` 13px / 800 / uppercase / letter-spacing .08em. Badge 12px / 700. `.stat` 28px / 800. `label` 14px / 700. Table 14px. Tip box 14px. Help icon "?" 11px.

## Spacing and radius
- Page: `.wrap` max-width 1040px, padding 16px (new layout: max 1120px, padding 14px 16px, then 22px 28px from 900px; the admin uses `.wrap.awide` = no max width).
- Card: radius 20px, padding 20px, margin 14px 0 (new layout: radius 12px, padding 14px 16px, margin 12px 0; from 900px padding 18px 20px, margin 16px 0).
- Radius values in use: 999px (buttons, badges, pills, toast, progress bar), 24px (hero), 20px (card), 18px (tile), 16px (menu, flow panel, sheet top), 14px (soft panel, steps, guide boxes), 12px (inputs, notices, kv tiles, help box), 10px (tip box, notice ok/bad in new layout, row list), 8px (new-layout buttons, nav items), 6px (tip close).
- Gaps: `.row` 8px; `.grid` 12px; `.kv` 10px; `.envs` 14px.
- Touch targets: nav items 44px (40px in sidebar), sheet items 48px, notice close 44px.

## Buttons (`button, .btn`)
Base (this is the default look of every `<button>` with no class): bold 700, radius 999px, `1.5px solid var(--brand)`, background `--brand`, text `--brand-ink`, padding `10px 20px`, inline-flex, gap 6px. Disabled: opacity .55, not-allowed cursor. Focus: `outline:3px solid var(--blue); outline-offset:2px` (new layout: `2px solid var(--ink)`).

| Class | Look |
|---|---|
| (none) | burgundy filled pill: the primary button |
| `blue` | blue filled (`--blue`). In the new layout `blue` is recolored to burgundy (`--brand`), so `blue` and default look the same there |
| `ghost` | transparent, burgundy text, burgundy border (new layout: border `--line`, radius 8px) |
| `danger` | red filled (`--bad`); `ghost danger` in new layout = red border |
| `small` | padding `6px 14px`, 14px text |
| `big` | padding `14px 28px`, 17px / 800 (only "Push to Live") |
| `linkish` | no background or border, burgundy underlined text (looks like a link) |
| `ai-btn` | added automatically to any button whose label starts with "✦" (`D.markAi`): purple border `#7a4b8c`, text `#5a2d6b`, background `#f7f0fa` |
| `tip` | older round blue "?" (24px); the current help icon is `help-q` |
| `mic`, `mic on` | member app voice button |
| `nl-item`, `nl-group`, `nl-fold`, `nl-x` | sidebar item, sidebar group heading, collapse button, sheet close |
| `hrow` | a whole row that is a button (title, sub line, action words, chevron) |
| `notice-x`, `notice-back`, `tip-x`, `help-q` | notice dismiss, "show notice again" link, tip close, help icon |

New layout: `button.blue`, `button.ghost` and `.btn` get radius 8px. A plain default `<button>` keeps the 999px pill, so the admin mixes pill and 8px buttons on one page.

## Badges (`.badge`)
Base: 12px / 700, padding `3px 10px`, radius 999px, background `--soft`, 1px `--line` border, no wrap.

| Class | Colors (light) | Meaning where used |
|---|---|---|
| `C` | `#e3f3ea` / `#21613d` / `#b6dcc5` (green) | Confirmed; also "Live", "Healthy", "Set", neutral-done states |
| `R` | `#e5f1fc` / `#0b5fa3` / `#b9d9f4` (blue) | Suggested; dispute in notice period |
| `O` | `#fff3d6` / `#7a5200` / `#e8c97a` (amber) | Open; "Draft waiting", "Not linked", "Not set" |
| `G` | `--pink` / `--pink-ink` / `#efc3d2` | Needs a gate; release "Tested on the test site" |
| `stage` | same amber as `O` | "Test site" environment badge |
| `held` | `#fff3d6` / `#7a5200` / `#e8c97a` | waiting on a check |
| `ready` | `#e3f3ea` / `#21613d` / `#b6dcc5` | good / running |
| `bad` | `#fdeceb` / `#9b1c14` / `#f3b8b3` | problem |
| `off` | transparent / `--muted` / `--line`, weight 600 | closed, inactive |
| `pink` | `--pink` / `--pink-ink` | member app |
| `agency` | `#2b1834` / white | member app |
| `ai-label` | `#f7f0fa` / `#5a2d6b` / `#d8c2e2`, text "AI suggestion" (`D.aiLabel`) | marks AI-written text |

`D.STATUS` = `{ C: "Confirmed", R: "Suggested", O: "Open", G: "Needs a gate" }`. `D.SIDE` = `{ attorney: "Attorney", freelancer: "Freelancer" }`.

## Notices
- `.notice`: blue information box, background `#eaf4ff`, border `#b8d8f8`, text `#172b4d`, radius 12px, padding `14px 16px`, 15px text, soft shadow.
- `.notice.bad`: left 4px bar `--bad`, background `#fdeceb`, 14px. `.notice.ok`: left bar `--ok`, background `#e9f5ee`.
- `.notice.info` + `D.infoNotice(text, key)` (core line 387): dismissible notice with a round "i" icon, the words, and a 44px "×" button (aria-label "Dismiss notice"). Dismissal is remembered in the browser; a small link "Show the sensitive data notice" stays in its place and brings it back.
- `.problem`: red-tinted box (`#fdeceb`, border `#f3b8b3`, radius 14px).
- `p.small.bad` / `p.small.ok`: colored small text. `.oktxt`: green bold text.

## Cards, tiles, panels
- `.card`: see spacing above. New layout: when a card's first child is an `h2` (or a `.row` holding an `h2`/`h3`), that heading becomes a full-width header band with background `--head` and a bottom border.
- `.tile` / `.tile.col`: stat tile, radius 18px, padding 16px; holds a small muted label, a `.stat` number, an optional small note. `.grid`: auto-fill columns min 230px.
- `.kv`: two-column grid of small `--soft` boxes (label on top, bold 18px value).
- `.soft`: soft grey panel, radius 14px, padding 14px.
- `.envs`: auto-fit grid (min 300px) for side-by-side cards.
- `.hero` / `.hero.navy`: gradient banner, radius 24px, white text.
- `.flow` (light blue panel) and `.flow.strong` (2px burgundy border): in-page step panels. `.drawer`: fixed right-side panel, width min(380px, 100% - 48px).
- `.hl` + `.hrow`: bordered list of clickable rows.

## Tables
`table` 100% width, 14px; `th, td` padding `10px 8px`, bottom border, top aligned; `th` muted bold. `.scroll` wraps a table for sideways scroll. `table.stack`: under 640px the header hides and each cell becomes a block with its `data-label` shown above it. `.sw-table` / `.sw-band`: Switches table with shaded group bands (name 16px bold + about line 13px).

## Pills and tabs
- `.pills`: wrap of small buttons, white with `--line` border; pressed (`aria-pressed=true` or `aria-selected=true`) = navy filled (dark mode: pink `#f19ab8` with dark text).
- `.tabs` (old admin layout only): horizontal scrolling row; selected tab = pink background, pink-ink text.
- Sidebar (`.nl-side`, 232px, sticky, from 900px): `.nl-item` 15px / 500 muted; current = pink background, pink-ink bold, 3px bar at left. `.nl-group` = uppercase 12px / 800 heading with chevron. Collapsed (`.mini`) = 64px wide.
- Under 900px the sidebar is hidden and a "Menu" button opens `.nl-sheet.full` (bottom sheet, up to 88% of screen height) over `.nl-scrim`.

## Help tip (`D.helpTip`, core lines 154 to 225)
A small round "?" button (`.help-q`: 18px circle, 1.5px muted border, 11px "?") beside a heading or label. Its tip is a floating white box (`.tipbox`: fixed position, max width 300px, radius 10px, light shadow, 14px text) with an optional bold title (`.tip-h`), the text (`.tip-t`) and a "×" (`.tip-x`). It never moves the page.
- Mouse: opens on hover, stays while the pointer is on the tip, closes 200ms after leaving; a click pins it open.
- Keyboard: opens on focus (focus-visible); Enter or Space pins it; Escape closes.
- Touch: tap opens.
- Closes on Escape, click or tap elsewhere, the icon again, or "×". One tip open at a time. Repositions on scroll and resize; flips above the icon when there is no room below.
- Accessibility: button `aria-label` (default "What does this mean?"), `aria-expanded`, `aria-controls`, `aria-describedby`; box `role="tooltip"`.
- Code comment rule: money, privacy and legal text always stays on the page; a tip only explains a word or a feature.
- `.helpbox` (blue inline box) is an older style still in the stylesheet.

## Toast (`D.toast`, core line 271)
Fixed pill at bottom center (`bottom:84px`), background `--ink`, text `--bg`, bold, radius 999px, max width 90%, `role="status"`. `.toast.bad` = red. Removed after 4 seconds. No close button, no stacking rule (several can overlap).

## Glossary (`D.term(label, key, tag)` + `D.HELP`, core lines 227 to 269)
`D.term` renders the label followed by a help tip. The tip's aria-label is "What does <label> mean?" and its title is the label. Keys and texts:

| Key | Text |
|---|---|
| `verified` | "The Lawfecta Team checked this person: an attorney's bar license, or a freelancer's identity and LinkedIn profile. It does not rate the quality of their work." |
| `match_ready` | "A freelancer is match-ready when three things are true: every required profile item is filled, the Lawfecta Team's check has passed, and they confirmed in the last 14 days that they can take work. Only match-ready freelancers show in Talent and gig matches. Match-ready does not guarantee qualifications, fit or availability for a particular project." |
| `bench` | "Freelancers an agency hires for its own clients' work under a signed bench agreement. They never use a team seat, and the attorney never sees the agency's share." |
| `platform_fee` | "Lawfecta's fee on each engagement: a percentage of the price, with a minimum. The client's fee is added to what they pay; the freelancer's fee comes out of their payouts." |
| `milestone` | "A portion of work with its own price, due date and review. Funds are released after acceptance." |
| `checklist` | "The points DELA checks in each milestone's completion statement before the client reviews it. It is agreed at signing. DELA's check is not a legal review." |
| `dela_check` | "DELA scores the completion statement against the checklist. A pass needs the agreed score and every required point. The client still reviews the work." |
| `dispute` | "A way to settle a problem with held money. You talk it through in Messages for the notice period, then the Lawfecta Team decides. It is not a court or arbitration." |
| `weekly_units` | "How a monthly engagement is checked and paid: the month splits into units, each accepted and paid out like a milestone. They are not a weekly limit." |
| `billing_day` | "The day of the month a monthly engagement renews, set by the day month 1 is paid. The saved payment method is charged once on that day." |
| `dela_actions` | "DELA's AI use on Lawfecta's AI each month. A larger task, such as drafting a whole document, uses more than a short answer. Your own AI key uses none." |
| `read_only` | "Your plan saves fewer documents than you have. The most recently edited ones stay editable; the rest can be viewed, exported and assigned, not edited." |
| `sensitive` | "Social Security and ID numbers, financial account numbers, health information, biometric data, and logins or passwords. Never upload them to DELA; link to your own storage." |
| `confidential` | "A private area on an engagement for client files and secure links, open only to the attorney and the hired freelancer, after signing and the first payment." |
| `subcontractors` | "Vetted Lawfecta freelancers an agency brings onto a job. The agency stays responsible for them, and everyone is listed under Who's working on this." |
| `quality_check` | "Checks DELA runs on how a document is written. Items marked Required before approval block export, approval and gigs until fixed. Items marked Suggestion do not block anything." |
| `raci` | "Who does each step: R does the work, A is accountable and approves (exactly one per step), C is consulted, I is kept informed." |
| `doc_types` | "Policy: a rule the firm follows. Workflow: steps across roles. SOP: one task, step by step. Playbook: how to handle a situation that needs judgment." |
| `next_review` | "The date the document should be checked again: 12 months after approval, or 3 months for high-risk documents about trust money, conflicts or deadlines." |
| `proposal_allowance` | "How many proposals you can send this month on your plan. It resets on the 1st. Proposals to gigs you were invited to do not count." |
| `agency_share` | "The part of the freelancer's payout an agency keeps on a bench job, agreed in the bench agreement. The attorney never sees it." |

The admin has its own, separate help dictionary (`HELP` in dela-admin.js lines 2105 to 2182, about 75 keys); those texts are quoted under each admin page below.

## Other shared pieces in lines 1 to 520
- Formatting: `D.money(cents)` ("$1,234" or "$12.50"; a broken amount reads "-"), `D.pct(bps)` ("10%"), `D.date` ("Nov 4, 2027"), `D.dateTime` ("Nov 4, 3:15 PM", no year), `D.mbText` ("50 GB"), `D.limitText` ("Included", "Not in your plan", "No cap", "3 of 10 left this month", "2 seats included").
- `D.errorText(code)`: about 95 plain-word messages for server error codes; unknown codes read "That did not work (<code>)."
- `D.accountCard(me)`: the shared "Account and security" card (see "My account" below).
- `D.openTab`: opens a server link in a new tab; messages "That link cannot be opened." and "Your browser blocked the new tab. Allow pop-ups for this site, then click again."
- A 503 "paused" answer reloads the page; a 401 calls the signed-out handler.

---

# Admin area (`admin/dela-admin.js`) (owner / Lawfecta Team)

## Admin frame and navigation (owner)
- How to reach it: the `/dela-admin` page (widget DELA-Admin). `frameNew()` line 173, `navList()` line 73, `go()` line 242. A page opens from `?tab=<key>` in the new layout only (line 2553); the address is kept in step with the page (`syncAddress`). Default page: `control`.
- Purpose and primary focus: move between the 25 admin pages; see which copy (test or Live) you are on.
- Shown when: `boot.route === "here"` and the person has at least one staff role. `isOwner` = has role "owner"; many controls are hidden or disabled for non-owners (`ownerOnly`).
- Layout, top to bottom (new layout, switch `new_layout`):
  - Left sidebar (from 900px): logo + "LAWFECTA ADMIN"; ungrouped items "Release Control", "Guide"; then groups that open and close: "Members" (Overview, Access list, People, Lawfecta Team, Agencies), "Plans and settings" (Plans, Settings, Switches, AI and files, Tech catalog, Trials, Usage), "Marketplace" (Verification, Gigs, Meetings and messages, Reviews and bench), "Payments" (Payments, Disputes, Recurring), "Safety" (Security, Holds, Audit log, Jobs); at the bottom "Collapse sidebar" / "Expand sidebar".
  - Top bar: "Menu" button (under 900px only), the current page name, environment badge "Live" (class C, title "Live: lawfecta.co, real members") or "Test site" (class stage, title "Test mode on lawfecta.co: test data only"), then the account button labelled "<name> (<roles>)".
  - Main area: the page.
- Interactive elements:
  - Sidebar group headings (buttons, `aria-expanded`): open/close; open groups are remembered in the browser (`dela.admin.groups`); the group holding the current page stays open.
  - Sidebar items: go to the page.
  - "Collapse sidebar" / "Expand sidebar": remembered (`dela.admin.folded`).
  - "Menu": opens a full-height sheet titled "Admin pages" with the same list and a close button (aria-label "Close menu"); focus is trapped; Escape or the dark backdrop closes it.
  - Account button: menu with a line "<name> (<roles>)", "My account", then (when `me.appearance.on`) heading "Appearance" with radio items "Match my device", "Light", "Dark" (a "✓ " prefix on the current one; toast "Appearance: <choice>"), link "Member view" (goes to /dela), "Sign out" (ends the DELA session then goes to the site's logout URL).
- States: page loading text "Loading..."; signed out: red notice "Your sign in ended. Refresh the page."
- Gate screens (no navigation shown):
  - Two logins: card with h1 "Two website logins in this browser", notice "Saved logins found for BD members <ids>.", then three paragraphs from `D.LOGIN_CONFLICT_TEXT` (log out, clear cookies, log in again; "Tip: test accounts are easiest in a private window, so your own login stays separate.").
  - Not staff: centered card, h1 "Lawfecta Team only", "This page is for the Lawfecta Team. Log in with a Lawfecta Team account." plus, when signed in, a notice "You are signed in as <name> (<email>), BD member <id>. To use the admin area, log out of the website and log in with your Lawfecta Team account."
- Shared page helpers: `pageHead(title, key)` = h1 + "?" tip; `titled(tag, title, key)` = heading + "?"; `section(id, title, key, defaultOpen, badge, content)` = a card that folds with a "Show" / "Hide" button (state remembered in the browser under `dela.control.open`); `askPassword(title, text)` = right-side drawer with label "Release password", buttons "Confirm" and "Cancel".
- Mobile/accessibility: nav has `aria-label="Admin pages"`, current item `aria-current="page"`; sheet is `role="dialog" aria-modal="true"`; background gets `inert`; sidebar height is fitted to the window.
- UX observations:
  - 25 pages. The old layout (switch off) shows them as one scrolling tab row with a dark gradient top bar holding an "Appearance" dropdown, "My account", "Member view", "Sign out".
  - When the sidebar is collapsed the code draws no page items at all (the group loop is skipped), only the logo and the expand button. A collapsed sidebar cannot be used to navigate.
  - Sidebar items are text only (no icons), so an icon-only collapsed mode has nothing to show.
  - The environment badge tooltip says "lawfecta.co"; other project text names hirelegalhelp.com as the test site. Wording to confirm.
  - Many confirmations and reasons use browser pop-ups (`confirm`, `prompt`), listed per page. A designed dialog would be more consistent and accessible.
  - Page titles are inconsistent: some pages have an h1 with "?" (`pageHead`), others (Disputes, Recurring, Trials, Usage, Agencies, Security) start straight with a card and have no h1.

## My account (owner)
- How to reach it: account button, "My account" (`accountTab`, line 269). Key `account` (not in the sidebar).
- Purpose: see your own sign-in email and how to change email or password.
- Layout: h1 "My account"; muted line "Signed in as <name> (<roles>). This page is about your own sign-in. It changes nothing for other members."; then the shared card "Account and security" (`D.accountCard`, core line 447) with intro "You sign in to DELA with your Lawfecta website account. DELA never sees or stores your password."
  - Row "Sign-in email": the email, or "Not known yet. Sign out and sign in again."; lines "This is the address your Lawfecta account had when you last signed in. DELA sends your emails to it." and either the self-service text or "To change it, ask the Lawfecta Team: open Help in the menu, then \"Contact the Lawfecta Team\". Your current address stays in use until the team confirms the change."
  - Row "Password": explanatory text; with no reset page set, a numbered list: "Sign out (the round button at the top right, then \"Sign out\").", "On the login page click \"Forgot Password? Click to Reset Password\".", "The Lawfecta website emails you a link to choose a new password." If Google sign-in: "If you sign in with Google, Google keeps your password. Change it in your Google account."
- Interactive elements (each shows only when its link is configured; all open a new tab): "Change email", "Change password", "Forgot password" or "Reset password by email", "Google account security".
- UX observations: the "ask the Lawfecta Team... open Help in the menu" wording is written for members and is odd inside the admin area (no Help item there). The sign-out step mentions "the round button at the top right", which does not match the admin's account button.

## Release Control (owner)
- How to reach it: sidebar "Release Control", `?tab=control`; the default page. `controlTab` line 2079, `drawControl` line 2520. Refreshes itself every 60 seconds (every 5 seconds during a push); refresh pauses while a password or code is being typed.
- Purpose and primary focus: see the health of this site and of Live, and push a tested version to Live (or go back).
- Shown when: all staff can view; push, tested tick, go back, password and reset are owner only.
- Layout, top to bottom (test site):
  1. h1 "Release Control" (no "?"); muted line "Everything between the test site and Live in one place. Only you can push or go back, with your release password and a code sent to you." (or ending "password.").
  2. Notices (when they apply): "Pushing is locked until <time> after too many wrong passwords or codes. You were emailed." (bad); "Live is not answering normally. If members are affected, turn on the emergency pause in the Live admin area, or go back to an earlier version below." (bad); "Push codes are on, but email and text are not set up yet. Until they are, pushes use your release password alone. See Live setup."; "Text alerts are on, but your phone number is not saved yet / the Brevo key is not in the test site secrets yet. Alerts go by email until then."
  3. Card "One site for the pilot" (only when no Live project is entered): "The pilot runs on this site only. Claude puts each new version here after every automatic test has passed, and you test it here. The Live card and the Push to Live steps below belong to a second copy, which is not set up. You do not need them for the pilot."
  4. Two cards side by side:
     - "This site: <hostname>" with badge "Healthy" (C) or "Worker stopped" (bad); "You and your testers. Every new version goes here first."; tiles "Version running", "Worker last ran", "Problems, last 24 hours", "Paused areas" (value "None" when empty).
     - "Live" or "Live: second copy, not set up" with badge "Not set up yet", "Checking soon", "Not healthy" (bad), "Healthy" (C), "Waiting for your first push", "Checking again" (others amber O); "Members on the access list. Changes only when you push."; tiles "Version running" ("None yet"), "Checked" ("Not yet"), "Problems, last 24 hours" ("Not known yet"), "Paused areas"; red line "Last answer: <error>".
  5. Card "Next version": eyebrow "Next version", the version number (24px), status badge; "Steps to Live" (six boxes: "Built on the test site", "Automatic tests passed" [Passed / Not yet], "ChatGPT report saved" [Saved / Needed before a push / Optional], "You marked it tested" [date / Waiting on you], "Pushed with your password and code" [name / Not yet], "Live and healthy" [Watching, N minutes left / Done / Not yet]; done = green with ✓, next = burgundy outline); three soft panels "What changes for members" (notes or "No notes."), "Database changes" ("N additions (...)." or "Nothing new." plus " Nothing removed or renamed, so going back stays safe." or " It also removes or renames something, so going back past this version will be blocked."), "Proof it works" (link "Automatic tests: passed" or "Automatic tests: not yet"; "ChatGPT test report: saved" / "not saved yet"; expandable "Read the test report"); then the push progress panel when running; then the tick box and push button.
     - Empty: "No new version is waiting. Claude adds each version here when it is ready on the test site."
  6. Card "Version history" (folds; badge "N versions"): "Every version, when it went Live, and a button to go back. Member data is always kept when you go back." Table columns "Version" (version + "code <7 chars>"), "Where it is" (badge + "Live <time>" or "Added <time>"), "What changed", "Going back" ("Safe to go back" in green, or bold red "Blocked: a newer version changed the database in a way this version cannot work with (...)", or "This is Live now"), and actions. Empty: "No versions yet."
  7. Two columns: card "Activity" (folded by default; badge "latest <time>" or "none yet") and, beside it, "Live setup" and "Emergency pause on Live".
  8. Card "Set your release password" / "Change your release password" (owner; badge "Set" or "Not set").
  9. Card "Reset test site data" (owner; folded).
- Layout on Live (`environment === "live"`): h1 "Release Control"; one card "This site is Live: real members use it. A new version arrives only after every automatic test has passed on that exact code." with tiles "Code running", "Worker last ran", "Problems, last 24 hours", "Paused areas", line "Live now: <version>"; then the "Activity" card. Nothing else.
- Status words: release status map `candidate` "Ready to test", `tested` "Tested on the test site", `approved` "Starting", `deploying` "Running now", `live` "Live now", `failed` "Did not go live", `replaced` and `rolled_back` "Was live before"; plus "Live, being watched" and "Went back by itself". Badge colors: live green, failed red, tested pink, others amber.
- Interactive elements:
  - Checkbox "I tested this version on the test site and it is ready" (owner; toast "Marked as tested" / "Unmarked").
  - Button "Push to Live" (class `big`; disabled while anything is missing). Under it a list of what is missing: "Set your release password (below).", "Locked until <time> after too many wrong tries.", "Tick that you tested it on the test site.", "The ChatGPT test report is not saved yet. Send it to Claude.", "Another push is running.", "Live is still being watched after the last push.", "GitHub is not connected for pushes yet (see Live setup)."
  - Push panel (in the card, not a pop-up), heading "Push <version> to Live" with text "Members on Live get this version when the push finishes. If anything fails, Live stays on <version>. Live is then watched for N minutes and goes back by itself if it becomes unhealthy." Step 1: "Release password" (password box), button "Continue" (or the heading text when codes are off), "Cancel". Step 2: "We sent a 6 digit code to your email (...) and your phone (...). It works once, for N minutes. It can take a minute to arrive."; box "Code" (6 digits, large letter-spaced); buttons "Push <version> to Live", "Send a new code" (toast "New code sent"), "Cancel". Toasts "Push started." / "Going back started." (+ " Your password alone was used, because email and text are not set up yet.").
  - Progress panel: title one of "Waiting for GitHub to start", "Pushing <v>", "Going back to <v>", "Live runs <v>. Watching it now.", "Live went back to <v> by itself", "<v> did not go live. Live kept the version it had.", "Live runs <v>"; a progress bar; a tick list. Push steps: "Your approval checked", "Automatic tests checked", "Database additions", "Server code switched", "Screens switched", "Health check on Live", "Watching Live". Go back steps: "Your approval checked", "Automatic tests checked", "Database checked", "Server code switched back", "Screens switched back", "Health check on Live". Marks ✓ (green), … (blue, running), ! (red). Expandable "Full push log".
  - History rows: "Go back to this" (owner; only on versions that were live before and are safe; opens the same panel titled "Go back to <version>", text "Live switches back to <version>. Member data added since then is kept."); expandable "Log".
  - Activity: filter pills "All", "Pushes", "Go backs", "Security", "Health", "Settings", "Pauses"; list of dated lines with a colored dot; "Show more" (12 then 60); "Open the full audit log" (goes to Audit log). Empty: "Nothing here yet." Intro: "From the audit log. Nobody can edit or delete these."
  - Live setup (badge "N of 9 done"; "Most lines check themselves. Tick the others when you have done them."): lines "Release password set", "The test site can start pushes", "GitHub accepts the push token", "GitHub environment named live, with its secrets and variables" (button "I did this" / "Untick"), "Live project ID entered" (text box, placeholder "20 letters and numbers", button "Save", toast "Saved. The test site checks Live within a minute."), "Live answers the test site's health check", "Email for codes and alerts", "Text alerts", "Uptime monitor watching the test site and Live" ("I did this" / "Untick"). Each undone line shows a small how-to. Marks: ✓, "?" (could not be checked), blank. Button "Check again".
  - Emergency pause on Live (badge "Nothing paused" or "Paused: ..."): "Paused on Live now: <list or nothing>." and "To pause Live, open the Live admin area, Overview page, Emergency pause. It works at once, with no push." No controls here.
  - Password card: "Current password" (when set), "New password", "Repeat new password", button "Save password". Text: "Only you push to Live, and every push asks for this password. Use at least 12 characters. Do not share it, and never paste it in chat. Five wrong tries lock pushing for 30 minutes." Toasts "Release password saved", "The two new passwords do not match."
  - Reset card: text "Clears test activity on the test site: allowances used, notices, background jobs, holds and other people's sign ins. Keeps people, the team, the access list, settings, plans and versions. Live is never touched."; button "Reset test site data" opens a browser prompt (POP-UP) "Type RESET to clear test activity on the test site."; toast "Test site activity cleared".
- Error toasts (`RELEASE_ERR`): "That release password is not right."; "Too many wrong tries. Pushing is locked for 30 minutes."; "Set your release password first."; "Mark this version as tested on the test site first."; "Use at least 12 characters."; "A push is already running. Wait for it to finish."; "GitHub is not connected for pushes yet. See Live setup on this page."; "Pushes start from the test site admin area."; "You can only go back to a version that was live before."; "This version cannot run on today's database. A newer version made a change it does not understand. Ask Claude for a fixed version instead."; "Type RESET to confirm."; "Save the ChatGPT test report for this version first. Send it to Claude."; "Live is still being watched after the last push. You can push again when the watch ends."; "That code is not right."; "Ask for a new code. The last one was used or ran out."; "Too many wrong codes. Ask for a new code."; "Five codes were sent in the last 30 minutes. Wait a little, then try again."; "The Live project ID is the 20 small letters and numbers in its Supabase address."; "That setup step is not known."; "GitHub did not start it (<code>). Nothing changed on Live."
- Help ("?" tips, admin `HELP` keys): `staging`, `staging_health`, `version_running`, `worker`, `problems`, `paused`, `live`, `live_health`, `live_checked`, `next`, `steps`, `changes`, `db`, `proof`, `push`, `progress`, `history`, `activity`, `setup`, `pause`, `password`, `reset`. Examples: `next` "The newest version waiting to go Live, and how far it has come. A green tick is done. The pink step is the next thing to do."; `problems` "Emails that failed for good, plus background jobs that gave up after all their retries, in the last 24 hours. 0 is the goal. Any other number: open the Jobs page to see what failed, or ask Claude."; `activity` ends "Dot colors: green pushes, blue go backs, red security (wrong passwords, codes), pink Live health, amber settings, burgundy pauses. Use the buttons to show one kind."
- Mobile/accessibility: stepper `aria-label="Steps to Live"`; progress bar has `role="progressbar"` with values; progress panel `aria-live="polite"`; open tips survive the auto-refresh.
- UX observations: the densest page in the admin. During the pilot (one site) most of it does not apply, and the page says so in a card rather than hiding the unused parts. The whole page redraws on each refresh. The Live card subtitle "Members on the access list" may not match Live's real audience. The `next` tip says "The pink step" while the next step is drawn with a burgundy outline on a grey-blue fill.

## Guide (owner)
- How to reach it: sidebar "Guide", `?tab=guide`. `guide()` line 393; content in `GUIDE` lines 279 to 373. Static text.
- Purpose: a plain-words manual for someone new to the admin area.
- Layout: h1 "Guide" + "?" ("A plain-words manual: the two copies of DELA, how a version gets to Live, what a push moves, going back, and what every page is for."); muted line "How the DELA admin area works, for anyone new to it. Pick a topic, or open a section below."; card "On this page" (numbered list of link-buttons, each with a short description); then nine folding cards (first open by default):
  1. "Start here" / "What this admin area is and how to read it" (terms: "One site for the pilot", "Two copies, later", "The ? buttons", "Show and Hide"; a note).
  2. "Test site and Live" / "How it works when a second copy is set up (not during the pilot)" (two boxes "Test site" (blue) and "Live" (green); term "Testers").
  3. "How a version gets to Live" / "The six steps, from Claude's build to members" (a pill flow: "Built on the test site", "Automatic tests", "Your ChatGPT test", "You mark it tested", "Push to Live", "15 minute watch"; then the same six as numbered steps).
  4. "What a push moves" / "What goes to Live and what stays where it is" (boxes "Moves to Live" and "Stays on its own copy"; a note).
  5. "Going back" / "Returning Live to an earlier version" (steps "Open History", "Pick the version", "Confirm").
  6. "When something goes wrong" / "Pause, alerts and where to look" (terms "Emergency pause", "Alerts", "Problems count"; note "When in doubt, pause first, then tell Claude. A pause is safe and quick to undo.").
  7. "Every page" / "What each page in the menu is for" (terms for 12 pages).
  8. "Who does what" / "Claude, GitHub, you, and the services behind DELA" (terms "Claude", "GitHub", "You (owner)", "Brilliant Directories", "Supabase").
  9. "Words you will see" / "Short meanings for the terms on these pages" ("Version", "Commit", "Database change", "Worker", "Release password", "Code", "Watch", "Confirmed", "Suggested", "Open").
- Interactive elements: contents links (scroll to a section and open it if folded); "Show" / "Hide" on each section.
- Block types a designer must style: paragraph, note (blue notice), flow pills, numbered steps, term list (name left, meaning right; stacks under 600px), two side-by-side boxes.
- UX observations: "Every page" describes only 12 of the 25 pages (missing AI and files, Verification, Tech catalog, Gigs, Meetings and messages, Payments, Disputes, Reviews and bench, Agencies, Recurring, Trials, Usage, Security). It mentions "The Releases tab" and an Access list "second list" of test accounts, neither of which exists in the code now. "Needs a gate" is not in "Words you will see".

## Overview (owner)
- How to reach it: sidebar group "Members", "Overview", `?tab=overview`. `overview()` line 411.
- Purpose: a quick picture of this copy, and the emergency pause.
- Layout, top to bottom:
  1. h1 "Overview" + "?"; muted line "DELA is open to every member with a linked plan." or "DELA is open only to people on the access list and the Lawfecta Team."
  2. Seven stat tiles (each with a "?"): "People who opened DELA" (note "N in the last 7 days"), "On the access list", "Turned away (7 days)" (note "Not on the access list"), "Decisions to make" (note "N open, N suggested, N need a gate"), "Plans not linked to BD" (note "Link them on the Plans page"), "Switches on", "Active holds".
  3. Card "Emergency pause": "Stops all of DELA or one part at once, without a push. Members see: \"<message>\" The Lawfecta Team keeps working. You get an email each time."; red notice "DELA is paused for members right now." when all is paused; nine buttons.
  4. Card "DELA guide" (about the member Home guide, last 30 days): "The proactive chat on members' Home pages, in the last 30 days. Each member is counted once per step they reached."; tiles "Members who saw it", "Buttons chosen", "Questions answered", "Paused", "Gig alerts sent today"; list "<step>: N members" sorted by count. Step names: "Tell DELA about the firm", "Agency profile", "Pick a first task", "Approve the playbook", "Hand off steps", "Handing off", "License check before posting", "Post the gig", "Invite freelancers", "Compare proposals", "Next task", "Finish the profile", "LinkedIn check", "Waiting on the LinkedIn check", "Confirm availability", "Answer invitations", "New gigs that fit", "First proposal", "Teach DELA", "On hold".
  5. Card "Check notices": "Sends a test notice to you. Email uses the service in the email.sender setting (log means it is recorded, not sent)."
  6. Folding card "Recent activity": list "<action> by <actor> <time>".
- Interactive elements:
  - Pause buttons (owner; disabled for others): "All of DELA", "AI help", "New payments", "Payouts", "Monthly renewals", "Outside connections", "Emails", "ChatGPT and Claude connector", "Confidential materials". Not paused = ghost small; paused = red, label "Paused: <area>". Click opens a browser prompt (POP-UP) "Pause: <area>. Why? (saved in the log)" or "Turn back on: <area>. Why? (saved in the log)". Toast "<area> paused" / "<area> running again".
  - "Send an in-app notice" (toast "Test notice sent. Open the member view to see it."), "Send a test email" (toast "Test email queued. The worker sends it within a minute.").
  - "Show" / "Hide" on Recent activity.
- States: "Loading..." inside the pause and guide cards; "No member has seen the guide yet."; "Could not load the guide numbers."
- Help: `ov`, `ov_people`, `ov_access`, `ov_denied`, `ov_decisions`, `ov_unmapped`, `ov_switches`, `ov_holds`, `ov_pause`, `ov_notices`, `ov_recent` (for example `ov_denied`: "Members who tried to open DELA in the last 7 days but are not on the access list. A rising number can mean word is spreading before you open DELA.").
- UX observations: the tiles are not links, although several name where to act ("Link them on the Plans page"). Two things are called "guide": the admin Guide page and this "DELA guide" card about the member Home chat. The most dangerous control (pause all of DELA) looks the same as the eight smaller pauses and is confirmed only by a prompt whose reason may be left empty.

## Access list (owner)
- How to reach it: "Members", "Access list", `?tab=access`. `access()` line 493.
- Purpose: decide who may open DELA while it is not open to everyone.
- Layout: h1 "Access list" + "?"; "Find a member's ID in BD admin under Members. The Lawfecta Team can always open DELA."; card "Add someone" (owner only); folding card "May open DELA" with a count badge and a table: "BD member ID", "Name" (or "Has not opened DELA yet"), "Note", "Added", action.
- Interactive elements: number box (placeholder "BD member ID"), text box (placeholder "Note (for example: test attorney)"), button "Add" (toast "Added" or "Already on that list"); row button "Remove" (owner) with browser confirm (POP-UP) "Remove <name>? They are signed out of DELA right away."; toast "Removed".
- States: empty "Nobody yet."
- Help: `acc`, `acc_add` ("Add a member by their BD member ID (BD admin, Members). They can then open this copy of DELA. Use member numbers from this site only: every Brilliant Directories site numbers its members separately."), `acc_list`.
- UX observations: adding needs a numeric ID looked up in another system; there is no search by name or email. Inputs have no visible labels (placeholder and aria-label only).

## People (owner)
- How to reach it: "Members", "People", `?tab=people`. `people()` line 551.
- Purpose: find a person, give them a workspace and plan for testing, or place a hold. Also holds the firm logo moderation list.
- Layout: h1 "People" + "?"; search row; card with table "Person" (name or "(no name)", "BD <id> | <email>", "Last seen <time>"), "Workspaces and plans" ("Attorney: att_plus (set by team)" per side, or "No workspace yet"), "Flags" (joined with " | ": "Team: <roles>", "Access list", "Test site tester", any non-active status), "Actions"; note "Showing up to 50 people, most recently seen first."; card "Firm logos".
- Interactive elements:
  - Search box (placeholder "Search name, email or BD member ID") and "Search" button (no Enter-key handler in code).
  - Per row (owner): dropdown "Give a workspace and plan..." listing every plan by name (eight), button "Give" (toast "Done. It applies on their next page load."); for each team-set side a button "Use BD plan for Attorney" / "Use BD plan for Freelancer" (toast "Back on their BD plan from their next sign in").
  - Per row (all staff): "Place hold": browser prompt (POP-UP) "Why are you placing a hold? Members see a short notice that some actions are paused."; toast "Hold placed". Severity is always "medium".
  - Firm logos card: "Logos that firms uploaded. Freelancers see them next to the firm's name. Remove one only when it is offensive, misleading or not the firm's own; the firm's owner is told your reason and can upload another." Table "Logo" (56px image or "Could not be shown"), "Firm", "Owner", "Uploaded", "Action": "Remove logo" with prompt (POP-UP) "Why are you removing this logo? The firm's owner is told this reason."; error "Write a reason first."; toast "Logo removed. The owner was told." Empty: "No firm has uploaded a logo yet."
- UX observations: no paging beyond 50, no sorting or filters. Plans show as codes (`att_plus`) here but as names in the dropdown. The action cell stacks a dropdown and up to four buttons. Firm logos sit at the bottom of an unrelated page. The logo table uses `stack`; the main people table does not.

## Plans (owner)
- How to reach it: "Plans and settings", "Plans", `?tab=plans`. `plans()` line 598; editor `editPlan()` line 640.
- Purpose: see and change the eight plans (four per side): price, fee, limits, BD link.
- Layout (list): h1 "Plans" + "?"; "Attorneys and freelancers have separate plans. Each side pays its own fee. Edits are saved as a draft; approving the draft applies it to everyone on that plan right away, and the old version is kept on record."; two folding cards "Attorney plans" and "Freelancer plans". Each is a comparison table: one column per plan (name without the side word; badge "Draft waiting" when a draft exists); rows "Monthly price", "Yearly price" ("None" when empty), "Platform fee for this side", "BD plan ID" (number or badge "Not linked"), "Members on it", then one row per feature (label + " (per month)" / " (MB)" where needed + a status badge Confirmed / Suggested / Open / Needs a gate) with cells "Yes" / "No" for flags, a number, "No cap" or "Not included"; last row a button per plan.
- Interactive elements (list): "Edit" or "Review draft" per plan (owner); "Show" / "Hide".
- Plan editor (replaces the page): "Back to plans"; h1 = plan name; notice "You are looking at a draft. Nothing changes for members until you approve it." (when a draft exists);
  - Card: "Monthly price (dollars)" (number), "Yearly price (dollars)" (placeholder "Leave empty for no yearly price"), "Platform fee this side pays (percent of the project price)" + "?" (0 to 50), note "The minimum fee per side is a separate setting (fees.floor_cents_per_party), on the Settings page.", "Note" (placeholder "Why this change (saved with the version)").
  - Card "Limits": "Leave a limit empty for no cap. Untick to leave it out of the plan."; table "Limit", "Included" (checkbox), "Amount" (number, placeholder "No cap"; "Yes or no" for flags).
  - Buttons: "Save draft" (toast "Draft saved. Review it, then approve."), "Approve draft" (browser confirm POP-UP "Approve this version of <plan>? It applies to everyone on this plan right away."; toast "Approved"), "Throw draft away" (no confirm; toast "Draft thrown away").
  - Card "Earlier versions": "Bring back an earlier version's prices and limits. It comes back as a new version, and needs your release password."; list "Version N: $X a month, fee Y%, from <date>" with "Restore", which opens the password drawer titled "Restore version N" with "Everyone on <plan> gets these prices and limits right away."; toast "Restored". Empty: "No earlier versions yet."
  - Card "Link to a BD plan": "Members on this BD plan get this DELA plan. Find the plan ID in BD admin under Membership Plans."; number box (placeholder "BD plan ID"); "Save link" (toast "Linked").
- Help: `plans`, `plans_side`, `plan_limits`, `plan_history`, `plan_link`, `plan_fee`.
- UX observations: the editor only shows the draft or approved values, with no side-by-side view of what changed. "Throw draft away" has no confirm while "Approve draft" has one. A bad price surfaces as "That did not work (bad_monthly_cents)." The comparison table is wide (label column + four plans) and scrolls sideways on small screens.

## Settings (owner)
- How to reach it: "Plans and settings", "Settings", `?tab=settings`. `settings()` line 715. The page h1 reads "Settings and decisions".
- Purpose: review and change every business number, with status and history.
- Layout: h1 "Settings and decisions" + "?"; "Every business number DELA uses. Changing one saves the old value in its history and records your decision. Marking it Confirmed means you approved it."; line "What Confirmed, Suggested, Open and Needs a gate mean" + "?"; then one folding card per section (A to Z, "System" last; first open), each with a badge "N settings" and a table with no header: name (label, then "key | source", then note), value, status badge, "Change".
- Value display: Yes/No; money for cents; percent for basis points; lists joined with commas; per-plan maps as "Attorney Free: 20 minutes; Attorney Plus: 30 minutes" ("no cap" for empty); nested maps as raw JSON.
- Interactive elements:
  - "Change" (owner; not shown for `environment`, `emergency.pause`, `worker.last_run`, `live.status`, `release.setup`): the row turns into an inline form: label "New value (dollars)" / "(unit)" / ", separated by commas" with an input that fits the type (Yes/No dropdown, number, text, one small box per plan, or a JSON text area); "Status" dropdown ("Confirmed", "Suggested", "Open", "Needs a gate"; default Confirmed); "Reason" (placeholder "Why (saved with the decision)"); buttons "Save" (toast "Saved"), "Cancel", "History".
  - Extra browser confirms (POP-UP): `access.mode` to everyone: "Open DELA to every member with a linked plan?"; `payments.mode` to live: "This marks Stripe as live. Real money moves only when the live_payments switch is also on. Continue?"
  - "History": appends a list "<time>: <old> to <new> by <who>. <reason>" with "Undo" per line (owner; confirm POP-UP "Put this setting back to <value>?"; toast "Undone"). Empty: "No changes yet. This is the starting value."
- Help: `settings`, `settings_status` ("Confirmed: you approved it. Suggested: Claude's suggestion, waiting for your yes. Open: not decided yet; DELA uses a safe default. Needs a gate: only turn on after a check, such as a lawyer review."), `settings_group`.
- UX observations: no search or filter (Switches has both). History shows raw JSON values. Clicking "History" twice appends the list twice. The technical key and source show on every row. The table has no column headers. The sidebar says "Settings" and the page says "Settings and decisions".

## Switches (owner)
- How to reach it: "Plans and settings", "Switches", `?tab=switches`. `switches()` line 854.
- Purpose: turn each built feature on for nobody, the team, the access list or everyone.
- Layout: h1 "Switches" + "?"; "Features that are built stay off until you turn them on. Try a feature with Lawfecta Team only first, then the access list, then everyone. Sections and switches are in A to Z order."; filter row; one card with a table "Switch" (name + key), "Before it goes on" (the gate text), "State" (dropdown), split by shaded bands.
- Sections (band name + line): "Accounts, profiles and plans", "Agencies", "DELA's AI", "Documents and files", "Gigs and hiring", "Layout and look", "Messages and meetings", "Payments and agreements" (its line ends "Change these with care."), and "Other" ("Switches that are not sorted into a section yet.") for any unlisted key. Each band has a one-line description (lines 835 to 852).
- Interactive elements: search box (placeholder "Find a switch"); dropdown "Show all" / "Only switched on" / "Only switched off"; live count "N switches" or "N of M switches shown"; per row a State dropdown "Off", "Lawfecta Team only", "Access list", "Everyone" (disabled for non-owners), saved on change with toast "<label>: <state>". `live_payments` to anything but Off asks (POP-UP) "Turning this on lets real money move through Stripe for these people. A payments lawyer review is recommended first. Continue?"
- Help: `switches` ("Built features stay off until you switch them on. Off: nobody. Lawfecta Team only: you test it first. Access list: testers and early members. Everyone: all members with a plan.").
- UX observations: about 60 switches in one long table. A dropdown saves instantly with no undo and, except for live payments, no confirm. On/off is only visible by reading each dropdown (no color or badge). The count is announced (`role="status"`).

## AI and files (owner)
- How to reach it: "Plans and settings", "AI and files", `?tab=aifiles`. `aiFiles()` line 1885, plus `libraryCounts()`, `documentsCard()`, `connectorCard()`.
- Purpose: read-only monitoring of AI use, members' own keys, storage and files; the one action is stopping a ChatGPT/Claude connection.
- Layout, top to bottom:
  1. h1 "AI and files" + "?".
  2. Status notice: green "Lawfecta's AI key, the key lock secret and file storage are all in place." or a red notice listing what is missing: "Lawfecta's OpenAI key (OPENAI_API_KEY) is not in Supabase secrets, so Lawfecta's AI, talking and the AI part of the file check are off."; "AI_KEY_ENCRYPTION_SECRET is not in Supabase secrets, so members cannot add their own key."; "File storage is not connected."
  3. "AI use this month": "Workspace", "Plan", "Where it ran" ("Lawfecta's key", "Member's own key", "Firm key"), "What" ("Chat", "Chat with files", "Talking (speech to text)", "Key test", "Client information check"), "Calls", "Failed", "Credits", "Tokens in / out". Empty: "No AI use yet this month."
  4. "Members' own keys": "BD member", "Name", "Workspace" (or "Firm key"), "Key" ("OpenAI" / "Claude"), "Status" (badge "Working" or red "Not working since <date> (<reason>)"), "Added". Empty: "No member has added a key."
  5. "Recent AI problems": "When", "BD member", "What", "Where", "Reason". Empty: "No problems."
  6. "Storage by member": "Firm", "BD member", "Files", "Used", "Allowed". Empty: "No files yet."
  7. "Files held for a client information check": "When", "BD member", "File", "Why". Empty: "No files are held."
  8. "Files not accepted": "When", "BD member", "File", "Reason" ("Not really the type its name says", "Has scripts, macros or hidden files", "Could not be opened", "Over the storage allowance", "Over the file size limit"). Empty: "None."
  9. "Documents by plan": "Plan", "Libraries", "Documents", "Approved", "Drafts", "From Scribe", "Drafted by DELA"; line "Suggestions waiting for a decision: N. Imports in the last 30 days: N. Libraries at their limit: N." Empty: "No documents yet."
  10. "Process Recorder": "Month", "Started", "Finished", "Ready", "Failed", "Abandoned", "Built into documents", "Average minutes", "Uploaded files"; line "Recordings by browser: ... Video storage in use: ... Videos deleted: N." Empty: "No recordings yet."
  11. "ChatGPT and Claude connections": "Member", "Workspace", "App", "Connected", "Last used", "Calls (30 days)", "Failed", action; line "Tools used in the last 30 days: ...". Empty: "Nobody has connected ChatGPT or Claude yet."
  12. "Documents (Policy, Workflow, SOP, Playbook)": line "Document standard switch: <state>. Conversion switch: <state>."; tiles "SOP", "Workflow", "Playbook", "Policy", "Older playbooks waiting to convert", "Converted", "Converted, not yet checked by the owner", "Blocked (missing A, attorney flag or image check)"; h3 "Images in documents" with "Image switch: <state>. Counts only; the team never sees the images here." and tiles "Images in documents", "Waiting for a client-data check", "Held by DELA's check", "Items the text reader found", "Items members blurred"; table "When", "Firm", "ID", "Title", "Type", "Why". Empty: "No conversions yet."
- Interactive elements: "Stop" (red small) per connection, browser confirm (POP-UP) "Stop this connection? <name> will need to connect <app> again."; toast "Connection stopped". "?" tips on most card titles.
- States: "Loading document and recorder counts..."; "Loading..."; "Connections could not load."; "Documents are not available yet."
- Help: `aifiles` ("How members use DELA's AI and files. You see counts, key status and file names, never a member's key and never what a file says."), `ai_usage`, `ai_keys`, `ai_errors`, `ai_storage`, `ai_held`, `ai_refused`, `ai_playbooks`, `ai_recorder`, `ai_connector`.
- UX observations: twelve cards of plain tables on one long page, no tabs, filters or paging. Members show as BD member numbers only in several tables. Error reasons are raw codes with underscores removed. None of these tables stack on mobile. Card order in the code puts "Documents by plan", "Process Recorder" and connections before the "Documents" card.

## Verification (owner)
- How to reach it: "Marketplace", "Verification", `?tab=verify`. `verifyTab()` line 1822.
- Purpose: decide attorney license checks and freelancer LinkedIn checks.
- Layout: h1 "Verification" + "?"; card "Attorney licenses (N)" + "?"; card "Freelancer LinkedIn checks (N)"; card "Profiles by state".
- License item (a card inside the card): bold "<name> (<BD id>): <state> bar number <number>"; badge "Yearly re-check due" (held), "Asked for more" (bad) or "New" (C); "Name on the record (as typed): ... Firm: ... ."; "Email: <address> (confirmed <time>)" / "(not confirmed yet)" or "Asked for the video call <time>."; red notice "The confirmation email bounced: <reason>. The attorney sees this on their Profile."; "The confirmation email was delivered."; "Also asked for the video call <time>."; red notice "The same license number is on another account (member <id>). Find out which is real before verifying. Verifying needs a note."; expandable "History".
- License controls: dropdown "How they showed it is theirs" with options "The email matches the state bar record", "The email is at the firm's own domain", "We had the video call" (hidden for a re-check); text box "Lookup note (what you checked, where)"; text box "Reason the attorney will see (for More needed or Not verified)"; when duplicate, text box "Why this account is the real one"; buttons "Verify" (blue) or "Still active: re-check done" (blue), "More needed" (ghost), "Not verified" (red; browser confirm POP-UP "Mark this license as not verified?"). Toasts "Verified", "Re-check recorded", "Saved and the attorney was told".
- LinkedIn item: bold "<name> (<BD id>)"; "Name on the DELA profile: <name or not filled in>"; the LinkedIn address (a link only when it is a linkedin.com address); checkboxes "The name on LinkedIn matches" and "LinkedIn shows its verified badge"; text box "Reason the freelancer will see"; buttons "Checked" (blue), "More needed" (ghost), "Not verified" (red, no confirm). Toast "Saved and the freelancer was told".
- Profiles by state: table "Workspace", "Where it stands" ("Not complete", "Waiting for a check", "Ready", "Availability out of date", "Not taking work", "Paused", "Not used"), "Members"; line "Target time to answer a request: N business days." Empty: "No profiles yet."
- States: "Nothing is waiting." in each queue. Related errors from `D.errorText`: "Tick both: the name matches, and LinkedIn shows its verified badge."; "Choose how the attorney showed the license is theirs."; "The attorney has not confirmed the email yet. Wait for it, or use the video call."; "This license number is on another account. Write why this account is the real one."; "Write a short reason the member will see."; "Someone else on the Lawfecta Team has to check your own profile."
- Help: `verify` (a long tip that carries the whole checking procedure; ends "Never ask for ID documents.").
- UX observations: the procedure lives only in one long "?" tip. The form has three or four unlabelled text boxes (placeholder only) and it is not clear which are needed for which button. "Verify" versus "Checked", and a confirm on one "Not verified" but not the other, are inconsistent. No link to the state bar lookup.

## Tech catalog (owner)
- How to reach it: "Plans and settings", "Tech catalog", `?tab=catalog`. `catalogTab()` line 1712, `categoriesCard()` line 1782.
- Purpose: replace the list of tools DELA's AI may recommend (CSV upload with a preview), pause a tool, and refresh the website's member categories.
- Layout, top to bottom:
  1. h1 "Tech catalog" + "?".
  2. Card "Website categories": "Talent search and the freelancer Profile page use the member categories of the Lawfecta website. DELA copies them every day and keeps the last good copy if the website does not answer. Change the categories on the website, then click Refresh now."; bold "N categories, N specialties, N tasks, case types and software." + "N freelancers have picked categories."; "Copied again when older than N hours. Freelancers' categories are also written to their website listing when they save." (or "stay in DELA; they are not written to the website listing (setting bd.push_categories)."); table "When", "Started by" ("Daily copy", "Lawfecta Team", "First use", "Copy was old", "Job"), "Result" (green badge "Copied: N categories, N below them" or red badge with the reason); buttons.
  3. Card "Upload a new catalog" + "?": "One CSV with every tool. Save it from Google Sheets (File, Download, Comma separated values) or Excel (Save as, CSV UTF-8). Nothing changes until you confirm."; file input; button; preview area.
  4. Card "Tools in the catalog now (N)": "DELA recommends these to members: <Off / On for the Lawfecta Team / On for the access list / On for everyone> (switch tech_catalog). Paused tools stay listed but are never recommended. A partner label never moves a tool up."; table "Tool" (name + id), "Category", "Status" (badge "Active" or "Paused"), "Partner" (Yes/No), "Last checked", action.
  5. Card "Earlier versions": table "Uploaded", "By", "File", "Tools", "Changes" ("N new, N changed, N removed"), "State" (badge "In use", "Replaced", "Not confirmed").
- Interactive elements:
  - "Refresh now" (label becomes "Copying..."; toast "Copied N categories and N below them." or an error).
  - "Check the website's bookmarks": writes a long technical sentence under the buttons ("Checking...", then "The website answered. Rows read: ...").
  - File input (accepts .csv) and "Check the file" (blue). Error "Choose the CSV file first."
  - Preview, problems: red notice "Nothing was changed. Fix these in the spreadsheet, export it as CSV again, and check it again." with table "Row", "Column", "What to fix".
  - Preview, OK: blue notice "This is the first catalog: N tools will be added." or "N tools in the file: N new, N changed, N removed." plus lines "New: ...", "Changed: ...", "Removed (DELA stops recommending them): ..."; buttons "Confirm and replace the catalog" (toast "The catalog is replaced") and "Cancel".
  - Per tool: "Pause" (browser prompt POP-UP "Why pause <tool>? (saved in the audit log)"; toast "<tool> is paused") or "Resume" (toast "<tool> is active again").
- States: "No catalog yet. Upload the first one above."; "No uploads yet."; "Not copied yet."; category errors: "The website refused: the API key may not read categories. In Brilliant Directories, Developer Hub, edit the DELA API key's permissions and allow list_professions and list_services."; "The website answered with no categories, so DELA kept its last copy."
- Help: `catalog`.
- UX observations: "Website categories" is the first card on a page named Tech catalog, though it is a different subject (Talent search categories). "Check the website's bookmarks" is a developer diagnostic. The upload preview is a good pattern (check, see changes, confirm) that other risky actions on the admin do not use.

## Gigs (owner)
- How to reach it: "Marketplace", "Gigs", `?tab=gigs`. `gigsTab()` line 1378.
- Purpose: decide held messages and gigs, and pause or resume a gig.
- Layout: h1 "Gigs" + "?"; card "Held for a check (N)" + "?"; card "Gigs (N)" with "Open and paused gigs, and gigs changed in the last 30 days. Switches: flex_gigs: off | public_gigs: off | ..."; card "Proposals sent this month, by plan".
- Held item: bold "<person> (<BD id>): a <object type> on \"<gig>\""; amber badge with what was found ("contact details", "payment outside Lawfecta", "working outside Lawfecta", "copies an engagement's text but is not linked to it"); the excerpt; "Found by DELA's AI / DELA's rules, <time>"; text box (placeholder "Note (saved in the audit log)"); buttons "It is fine: deliver it" / "It is fine" (blue) and "Do not deliver" / "Pause the gig" (red). Toasts "Delivered", "Not delivered; the member was told", "Cleared; the gig stays open", "Gig paused; the agency was told".
- Gigs table (stacks on mobile): "Gig" (title, "by <name>, closes <time>"), "Firm", "Status" (badge "Draft", "Open" (green), "Paused" (amber), "Closed", "Filled", "Canceled"; the pause reason under it), "Budget" ("$X to $Y"), "Proposals", "Matches", "Held", action "Pause" (browser prompt POP-UP "Why pause \"<title>\"? The attorney is told."; toast "Paused") or "Resume" (toast "Open again").
- Proposals table: "Plan" (for example "Freelancer Plus"), "Proposals", "Freelancers". Empty: "None yet this month."
- States: "Nothing is waiting."; "No gigs yet."
- Help: `gigs`.
- UX observations: the object type and switch states show as raw code words. "Do not deliver" and "Pause the gig" are red with no confirm. The pause toast says the agency was told while the prompt says the attorney is told.

## Meetings and messages (owner)
- How to reach it: "Marketplace", "Meetings and messages", `?tab=meet`. `meetTab()` line 984, `transcriptFlagsCard()` line 1021.
- Purpose: watch meeting activity and handle reported conversations and flagged transcripts.
- Layout, top to bottom:
  1. h1 "Meetings and messages" + "?".
  2. Card "The last 30 days" + "?": tiles "Meetings booked", "Both confirmed they met", "Canceled", "Late cancels", "Did not happen", "Messages", "Conversations"; a line on the meeting service: "Vectera is connected: DELA makes a meeting room for each booking." / "Vectera is not connected yet, so meetings show \"Waiting for the meeting service\" instead of a join link. It needs the VECTERA_API_KEY secret in Supabase." / "VideoSDK is connected: DELA makes a meeting room for each booking, and the meeting happens inside DELA." / "VideoSDK is not connected yet, ... It needs two secrets in Supabase: VIDEOSDK_API_KEY and VIDEOSDK_SECRET."
  3. Card "Upcoming meetings (N)": table (stacks) "When" ("<time> (N min)"), "Gig", "Attorney", "Freelancer", "Room" ("Being made", "Ready", "Could not be made (retrying)", "Waiting for the meeting service"). Empty: "None booked."
  4. Card "Meeting transcripts flagged by DELA's AI": "DELA's AI reads each transcript once and flags talk about paying or working outside Lawfecta. Meetings that a member reported are listed here too. Nothing happens to a member by itself: you decide. Opening a transcript is written to the meeting's record each time, with your name. Transcripts that were not flagged or reported cannot be opened." Each item (soft panel): bold "<attorney> and <freelancer>: <title>"; badge "To review" (amber), "No problem found" (green), "Confirmed" (red), or for reports "Reported" / "Report closed"; "Meeting of <time>. Flagged for: Contact details to continue elsewhere, Paying outside Lawfecta, Working outside Lawfecta."; report lines "<who> reported on <time>: \"<reason>\" (closed: <note>)"; "Passage: \"...\""; "Decision note: ...". Empty: "No transcript has been flagged." and "No meeting has been reported."
  5. Card "Reports (N)": each "<reporter> reported a conversation on \"<gig>\"", badge "Blocked" when blocked, "Reason: <text or none given>", "Message: ...", time. Empty: "No open reports."
  6. Card "Repeated late cancels or no-shows": list "<name> (<BD id>): N late cancels, N did not happen". Empty: "Nobody right now."
- Interactive elements:
  - "Open transcript": browser confirm (POP-UP) "Open this transcript? Your name and the time are written to the meeting's record."; the text then shows in a scrolling box (max 360px high) under the item. When there is no text: "The transcript text is no longer kept (deleted by a member or after its keeping time)." or "This meeting has no transcript text (it was not transcribed, or the text is no longer kept)."
  - "No problem found" and "Confirmed" (open flags): browser prompt (POP-UP) "A short note on your decision (<word>). It is kept with the flag."; toast "Saved".
  - "Close report": browser prompt (POP-UP) "A short note on what you did about this report. It is kept with the report."; toast "Report closed".
  - "Mark as handled" on a conversation report (no confirm; toast "Closed").
- Help: `meet` (notes "The Lawfecta Team never joins meetings. Held messages wait in the Gigs tab.").
- UX observations: "Confirmed" is both a button and a badge here and also means "approved business number" elsewhere in the admin. The transcript box has a hard-coded white background and will not follow dark mode. Reports appear in two places (inside the transcripts card and in "Reports"). Held messages live on the Gigs page, not here.

## Payments (owner)
- How to reach it: "Payments", "Payments", `?tab=pay`. `payTab()` line 1295, `attentionCard()` line 1268, `stripeWarnings()` line 255.
- Purpose and primary focus: see what about money needs the team now, then act on milestone reviews. Mostly a monitoring page.
- Layout, top to bottom:
  1. h1 "Payments" + "?".
  2. Card "Needs attention (N)": clickable rows, each a bold title, a sub line, action words and a chevron:
     - "Stripe pays Lawfecta's balance to the bank by itself" / "Held milestone money can leave Stripe before it is released. Set the payout schedule to Manual in Stripe." / "See the notice"
     - "Stripe holds less than DELA owes" / "$X available at Stripe, $Y held for milestones." / "See the notice"
     - "Payout failed: / Payout held: / Payout not sent: $X to <freelancer>, <gig>" / "Waiting for the freelancer's payout setup." or "Stripe said: <reason>" / "View held payout"
     - "Refund failed: $X, <gig>" / "Retried N times." / "View failed refund"
     - "Dispute waiting for the Lawfecta Team: <gig>" / "Milestone: <name>, $X." / "Review dispute"
     - "Bank chargeback open: $X" / reason / "View chargeback"
     - "N milestones waiting for a human review" / "A freelancer asked for a person to check DELA's result." / "Review milestones"
     - "N reviews are past the attorney's deadline" / "The attorney has not accepted or asked for changes in time." / "View overdue reviews"
     - "Engagement paused: <gig>" / "Paused since <date>. The bank chargeback is still open." / "View paused engagement"
     - Empty: "Nothing needs you right now." Footnote when the Disputes data could not load: "Failed refunds and paused engagements could not be checked just now. They are on the Disputes page."
     - A row scrolls to the matching card on this page, or opens the Disputes page and scrolls to "Money tools" or "Disputes".
  3. Card "Payment overview" + "?" (new layout; "Money on DELA" in the old layout): Stripe warnings (red notice "Stripe sends Lawfecta's balance to the bank by itself, every day / every week / every month. Money held for milestones leaves Stripe before it is released, and a payout to a freelancer then fails. In Stripe, set the payout schedule to Manual, and move only Lawfecta's own fees to the bank."; line "Stripe balance available now: $X. Held for milestones in DELA: $Y." which turns red and adds " Stripe holds less than DELA owes. Payouts and releases can fail until the balance covers it."; a negative balance reads "minus $X"); connection line "Stripe is connected in LIVE mode (real money) / test mode (no real money). Live payments switch: <state>." or notice "Stripe is not connected yet. Attorneys see \"Payments are not set up\". It needs the STRIPE_SECRET_KEY (test key) and STRIPE_WEBHOOK_SECRET secrets in Supabase."; a list of four switches ("Engagements", "Paying milestones", "DELA's milestone check", "Agreement export": "off", "on for the Lawfecta Team", "on for the access list", "on for everyone"); h3 "All time" with "Every payment, payout, refund and fee since DELA started. There is no date filter yet." and tiles "Charged", "Paid out", "Refunded", "Attorney fees", "Freelancer fees"; h3 "Current balance" with "Milestones that are paid and not yet accepted, refunded or released." and tile "Held now".
  4. Card "Milestones waiting for a human review (N)": each "<gig>, milestone N: <name>"; "DELA's score: N of 100" or "none (DELA could not check it)"; the freelancer's statement; findings list "Met / Missing / Could not tell (required): <text>"; a note box; two buttons. Empty: "Nothing is waiting."
  5. Card "Disputes (N)": "Open disputes are in the Disputes page, with both sides, offers and the decision." or "No open disputes."; button.
  6. Card "Chargebacks (open) (N)": lines "<time>: $X (<reason>). The engagement is paused. Answer it in Stripe's dashboard before Stripe's deadline." Empty: "None open."
  7. Card "Payments waiting or failed (30 days) (N)": lines "<time>, <gig>: $X, <status> (<failure>)". Empty: "None."
  8. Card "Payouts held or failed (N)": lines "<freelancer>: $X (waiting for the freelancer's payout setup / <reason> / failed)". Empty: "None."
  9. Card "Reviews past their deadline (N)": lines "<gig>, milestone N: <attorney> was due <time>. Contact the attorney. Silence never pays out on its own." Empty: "None."
  10. Card "Money held a long time (N)": lines "<gig>, milestone N: $X paid <date>". Empty: "None."
  11. Card "Engagements (last 60 days)": table (stacks) "Gig", "Attorney", "Freelancer", "Total", "Status" ("Waiting for signatures", "Signed", "Active", "Complete", "Canceled", "Paused", "Draft"), "Updated". Empty: "None yet."
  12. Expandable card "The ledger (latest 50 entries, never edited)": lines "<time> | <gig> | <kind> $X | <note>".
- Interactive elements: attention rows (buttons); in human review: text area (aria-label "Your note to the freelancer"), "Passes: send to the attorney" (blue; toast "Sent to the attorney for review"), "Needs more work" (ghost; toast "Sent back to the freelancer"); "Open the Disputes page"; the ledger expander. No confirms on this page.
- Help: `pay`.
- Variations: card title depends on the layout switch. An older in-page dispute form (`oldDisputes`, lines 1332 to 1346) is built in code and never shown.
- UX observations: about twelve cards. The "Needs attention" list is the newest and clearest pattern in the admin (one row, one action), but the cards it points to are plain text lines with no actions, so several "View ..." rows lead to information only, and money actions are on the Disputes page ("Money tools"). The code states "There is no date filter yet." No links to Stripe. Empty cards are always shown ("None.").

## Disputes (owner)
- How to reach it: "Payments", "Disputes", `?tab=disputes`; also from Payments. `disputesTab()` line 1139.
- Purpose and primary focus: decide how held milestone money is split when members could not settle.
- Layout: no h1. Card "Disputes": "Members settle most disputes themselves with offers; unanswered ones are granted automatically. You decide the rest within N business days. Lawfecta is not a court or an arbitrator, and DELA's draft is only a suggestion."; tiles "Open now", "Last 90 days", "Settled by offer", "Granted, no answer", "Decided by the team", "Withdrawn", "Released to freelancers", "Refunded to attorneys", "Average days to close" ("None yet"). Then card "Open disputes (N)", card "Closed in the last 90 days", card "Money tools".
- Case card: bold "<gig>, milestone N. <title> ($X)"; status badge; badges "Needs the lawyer" and "Bank chargeback open" (red); "Attorney: ... Freelancer: ... Opened by the <role> on <date>: <category>. Asks for $X to the freelancer."; a timing line ("Notice period ends <time>. No answer yet: the request is granted then unless the other side answers." / "Decide by <date>." / "$X to the freelancer, $Y back to the attorney, <date>."); "Agreed deliverables: ... (due <date>)"; "DELA's milestone check: <status>, score N. Delivery note: ..."; the statements as message bubbles headed "The attorney | Opened | <time>" or "Lawfecta Team to the <role> | Our question | <time>"; evidence links (new tab); offers "The <role> offered $X to the freelancer (<status>)".
- Status words: "Waiting for an answer to our question", "Ready for your decision" (amber `held`), "Members are settling", "Waiting for an answer" (blue `R`), "Settled by offer", "Granted, no answer", "Decided", "Withdrawn" (`off`). Categories: "Not delivered", "Late", "Not what was agreed", "Quality", "Payment or acceptance withheld", "Other". Statement kinds: "Opened", "Answer", "Note", "Our question", "Answer to our question".
- Interactive elements (open cases):
  - Expandable "Decide" (open by default when ready): notice "The notice period is not over. You can decide after <time>." when early; preset buttons "All to the freelancer", "All back to the attorney", "Half each", "The attorney's last offer", "The freelancer's last offer"; "✦ Draft with DELA" (AI style; shows "DELA is drafting...", then a soft panel with the "AI suggestion" badge, a summary, terms, "Suggested: $X to the freelancer, $Y back. <why>", a button "Use this draft", and a small AI note); box "To the freelancer ($)" with live text "and $Y back to the attorney"; text area (aria-label "Decision and reasons (both members see this)"); "Decide" (blue): browser confirm (POP-UP) "Decide this dispute? $X goes to the freelancer and $Y back to the attorney, through Stripe straight away."; toast "Decided. Both members were told and the money moves."
  - Expandable "Ask a question, give more time, or flag for the lawyer": dropdown "Ask whom" ("Both", "The attorney", "The freelancer"); text area (aria-label "Your question"); "Send the question" (toast "Asked. The decision clock waits for the answer."); "More days to settle (once)" number box (1 to 14, default 7) and "Give more time" (toast "More time given. Both members were told."); "Flag: needs the lawyer" / "Clear the lawyer flag".
  - Money tools: "Failed refunds and payouts are retried every day, 3 times, then listed here. Only the finance role can use these." Rows: "Refund failed: $X, <gig> (N retries)" + "Retry now" (toast "Sent to Stripe again."); "Payout failed: ..." + "Retry now"; "Payout held: $X to <freelancer>, <gig> (waiting for the freelancer's payout setup)" + "Release now" (browser prompt POP-UP "Why release this payout now?"; toast "Released."); "Paused since <date>: <gig> (bank chargeback still open)" + "Lift the pause" (browser prompt POP-UP "Why lift the pause?"; toast "The engagement is running again. Both members were told."). Empty: "Nothing waiting."
- States and errors: "No open disputes."; "None."; "Type the amount to the freelancer."; "The notice period is not over yet"; "Write the decision and reasons"; "A bank chargeback is open on this engagement"; "Lawfecta's AI key is not set up."; "The freelancer's payout setup is not ready yet"; "That milestone is in dispute".
- UX observations: the heaviest decision in the admin (moving real money) ends in a browser confirm. A case card is one long column: facts, statements, evidence, offers, then two expanders. The decision note is required but its box has no visible label. Two different things are named "Decide" (the expander and the button). There is no h1 and no "?" on this page.

## Reviews and bench (owner)
- How to reach it: "Marketplace", "Reviews and bench", `?tab=reviews`. `reviewsTab()` line 1065.
- Purpose: moderate held reviews and responses, reported reviews and appeals.
- Layout: h1 "Reviews and bench" + "?"; card "Reviews, the bench and webhooks" + "?" with a raw switch line ("reviews: off | past_client_reviews: off | bench: off | bench_suggestions: off | member_webhooks: off"), tiles "Published reviews", "Held for a check", "Removed", "Past-client reviews", "Past-client requests (30 days)", "Bench members", "Active webhook endpoints", "Paused after failures", and the policy line "The policy: a negative opinion stays up. Hold or remove only client information, threats, hate or harassment, impersonation, contact details or payment outside Lawfecta. Every decision needs a reason and is kept." Then seven queue cards, each titled with a count:
  1. "Reviews held for a check": "<author> about <subject> (attorney about freelancer / freelancer about attorney)", "DELA found: ...", the text, note box, "Publish" (blue; toast "Published"), "Do not publish" (ghost; toast "Not published; the writer was told"). Empty: "Nothing is waiting."
  2. "Responses held for a check": "Response by <name>", text, note box, "Publish", "Do not publish" (toast "Not published").
  3. "Past-client reviews held for a check": "<name> (<state> bar <number>) about <freelancer>", "DELA found: ...", text, note box, "Publish", "Do not publish".
  4. "Reported reviews": "Reported by <name> (the writer / the person reviewed)", "Reason: ...", text, note box, "Keep it up" (blue; toast "Kept up; both were told"), "Remove" (ghost; browser confirm POP-UP "Remove this review? Only for the policy reasons, never for being negative."; toast "Removed; both were told"). Empty: "No open reports."
  5. "Appeals": "Appeal by <author>", "Removed because: ...", "Appeal: ...", text, note box, "Reverse: publish it" (blue; toast "Published again"), "Uphold the decision" (ghost; toast "The decision stays"). Empty: "No open appeals."
  6. "Recent past-client reviews (spot check the bar numbers)": lines "<time>: <name>, <state> bar <number>, about <freelancer>". Empty: "None yet."
  7. "Webhook endpoints paused after failures": lines "<person> (<side>): <host>, N failures, last problem <reason>. The member was emailed and can resume it." Empty: "None."
- Interactive elements: the note text area in each item (aria-label "Reason (kept with the decision)", no visible label) and the buttons above. Error: "Write the reason first. Both members may see it."
- Help: `reviews`.
- UX observations: the page is named "Reviews and bench" but shows nothing about the bench except one count; agency benches are on the Agencies page. Webhooks are an unrelated topic placed here. The required reason box is unlabelled. All seven queues always show, even when empty.

## Agencies (owner)
- How to reach it: "Members", "Agencies", `?tab=agencies`. `agenciesTab()` line 1586.
- Purpose: do the one-time business check of each agency and set a seat limit.
- Layout: no h1. Card "Agencies": "A Business freelancer becomes an agency. Check each agency's business name and state once. Switches: <key state, ...>."; one block per agency. Card "Agency benches and splits": "The split is private between the agency and the freelancer. The agency pays the freelancer platform fee from its share."; lines "<agency> | <name> (<email>) | <status> | split 20% agency / 80% freelancer (version N)" or "| not signed by both yet", "| proposed X% agency, waiting for the freelancer / the agency", "| Inactive: Free plan". Card "Bench assignments": lines "<agency> | <job>, milestone N | <name> | split X% agency / Y% | <status> | milestone <status>".
- Agency block: bold name; badge "Checked <date>" (green) or "Not checked yet"; one line "Business name: ... | State: ... | Owner: <name> (<email>) | Active / Not active (owner is not on Business) | Seats: N of N | Engagements: N"; "Last note: ...".
- Interactive elements: text box (placeholder "Note (shown to the owner if the details need a change)", max 300); "Business details are right" (blue; toast "Checked. The owner was told."); "Ask for a change" (ghost; needs a note, else toast "Write a note saying what to change."; toast "Sent. The owner was asked to change the details."); "Seat limit for this agency (empty for the plan's limit):" number box (1 to 500) and "Save seat limit" (toasts "Seat limit set to N" / "Back to the plan's seat limit").
- States: "No agencies yet."; "No benches yet."; "None yet."; load errors show as a red notice.
- UX observations: facts are packed into pipe-separated sentences instead of a table or labelled fields; statuses are raw code words. No h1 and no "?".

## Recurring (owner)
- How to reach it: "Payments", "Recurring", `?tab=recurring`. `recurringTab()` line 1423.
- Purpose: watch monthly engagements; emergency stop for renewal charges.
- Layout: no h1. Card "Recurring": "Monthly engagements: renewals due, failed and paused ones, and cancellations. Renewals run every hour; each month is charged once, on its billing day, with the saved payment method."; a row with badge "Renewal charges are running" (green) or "Renewal charges are stopped" (red) and the stop/start button; then one block per engagement: bold title, badge "Not started", "Running" (green), "Paused: payment failed" (red), "Ended"; line "<attorney> hires <freelancer> | $X a month | months paid: N | next charge <date> | failed <date> | canceled, ends <date> | ended: <reason>". Card "Standing arrangements": "Limited automatic repeat hiring. Each one names a price per job, a monthly cap, the most jobs open at once and an end date. Off on Live until counsel approves (switch auto_repeat_hiring)."; blocks "<firm> hires <freelancer>" with a raw status badge and "$X per job | spend this month $Y of $Z | N of N open | jobs N, declined N | until <date>".
- Interactive elements: "Emergency stop: no renewal charges" (red; no confirm; toast "Renewal charges stopped. Reminders still go out; nothing is charged.") / "Start renewal charges again" (blue; toast "Renewal charges run again"); on the test site only, per engagement: "Run the renewal now (test site)" (toast "Renewal run: <raw JSON>").
- States: "No monthly engagements yet."; "No standing arrangements yet."
- UX observations: the emergency stop has no confirm and no reason, unlike the Overview pauses, and "Monthly renewals" can also be paused from Overview: two controls for the same idea. A toast shows raw JSON. No h1 or "?".

## Trials (owner)
- How to reach it: "Plans and settings", "Trials", `?tab=trials`. `trialsTab()` line 1481. The card is titled "Pro trial check".
- Purpose: run and review the daily check that moves unpaid Pro trials to Free.
- Layout (one card): h2 "Pro trial check"; rule sentence "Every day at <hour> Pacific, DELA checks freelancers on plans <ids> whose trial is active. An unpaid trial moves to Free (<id>); a paid invoice for the plan they are on marks them converted. Plans <ids> are never changed (the attorney and lifetime plans). Dry run lists what it would do and changes nothing."; badges "Daily check: on" (green) / "Daily check: off (switch bd_trial_downgrade)", "Trial downgrade mode: Dry run" (green) / "Trial downgrade mode: Live" (red; adds " (lists only while the daily check is off)"), "BD not connected yet: waiting for the BD check" (amber); two buttons; h3 "Runs" with table (stacks) "Started", "How" ("Daily", "Run now", "At sign-in"), "Mode" ("Live" / "Dry run"), "Members checked", "What it found" ("Nothing to do" or counts), "Problem" ("BD not connected yet", "DELA's BD key needs more permissions", or raw text); h3 "Members in the last 3 runs" with table "Member", "BD user ID", "Plan", "What" (prefix "Would: " in dry run; "Start tracking the trial", "Send the \"Your Pro trial ends soon\" email", "Mark converted", "Move to Free", "Bring back hidden content", "Could not check"; a next-step line under it), "Why" ("New signup on Pro", "Trial ends soon (the reminder setting)", "Paid Pro invoice", "Paid Plus invoice", "Upgraded to Agency Business", "Trial ended, Pro invoice not paid", "Trial ended, moved to Plus but the Plus invoice is not paid", "Finishing a downgrade that stopped halfway", "Upgraded after the downgrade", "BD could not be read"), "Trial ends", "Invoice" ("Paid", "Unpaid", "None"), "Result" ("Listed only", "Done", "Not finished: <error>", and bold "To do in BD admin: <text>").
- Interactive elements: "Run the check now (Dry run)" or "Run the check now (Live: changes BD)" (blue; Live asks, POP-UP, "Live mode: this moves unpaid trial members to Free in BD and emails them. Run it now?"; toast "Checked N members." or a plain-words stop reason); "Switch to Live" (red; POP-UP "Switch the trial check to Live? From the next run it changes plans in BD, cancels unpaid trial invoices and sends the trial emails. Do this only after 3 clean dry-run days."; toast "Live: the next run changes BD.") / "Switch to Dry run" (ghost; toast "Dry run: the check lists and changes nothing.").
- States: "No runs yet."; "No member to change in the last 3 runs."; stop reasons: "BD is not connected yet, so nothing was checked. The run is in the list below."; "BD refused the check: DELA's BD API key needs more permissions (Users, User Metadata, Single Image Posts). The run is in the list below."; "Another check is running. Try again in a few minutes."
- UX observations: sidebar says "Trials", the card says "Pro trial check". Plan IDs are BD numbers. No h1 or "?". Here "Live" means the check's mode, not the Live site: a second meaning of the same word.

## Usage (owner)
- How to reach it: "Plans and settings", "Usage", `?tab=usage`. `usageTab()` line 1537.
- Purpose: see each attorney's plan use and AI cost this month; resync a plan; grant bonus DELA actions.
- Layout (one card): h2 "Usage"; "Attorneys' saved documents, DELA actions this month (weighted AI credits on Lawfecta's AI) and storage. AI cost is worked out from the provider prices in Settings (ai.price_cents_per_mtok). Anyone above $X this month is flagged. Blocking at 100% follows the switch usage_limits_enforced, now: <state>."; table (stacks) "Attorney" (name, "email | BD id"), "Plan" (+ " (set by the team)"), "Documents" ("3 of 10" or "3 (no limit)"), "DELA actions" (+ " (includes N bonus)", ", shared with <name>"), "Storage" ("X MB of Y GB"), "AI cost this month" (a red badge "$X over $Y" when flagged), actions.
- Interactive elements (per row): "Resync plan" (toast "Plan updated: <from> to <to>" or "The plan is up to date."); number box (1 to 100000; aria-label "Bonus actions for <name>"); text box (placeholder "Why (required)"); "Grant bonus actions" (disables while saving; toast "Bonus actions added for this month."). Errors: "Enter a number of actions from 1 to 100,000."; "Add a note saying why."
- States: "No attorneys yet."
- UX observations: attorneys only (no freelancer usage). Each row carries two inputs and two buttons, so the table is very wide. No search, sort or paging. The number box has no visible label. No h1 or "?".

## Lawfecta Team (owner)
- How to reach it: "Members", "Lawfecta Team", `?tab=team`. `team()` line 907.
- Purpose: add or remove team members and their role.
- Layout: h1 "Lawfecta Team" + "?"; "Team members can open DELA and this admin area. Only owners can change settings, plans and switches. A person must open DELA once before they can be added."; card "Add a team member" + "?" (owner); card with a table (no header): name + "BD <id> | <email>", role, date added, action.
- Interactive elements: number box (placeholder "BD member ID"); dropdown "Role": "Reviewer (checks attorneys and milestones)", "Support (access list, holds, jobs)", "Finance (payments and holds)", "Owner (everything)"; "Add" (toast "Added. They need to refresh DELA."); row "Remove" (owner; browser confirm POP-UP "Remove <name> as <role>?"; toast "Removed"). Errors: "That member has not opened DELA yet. Ask them to open DELA once, then try again."; "DELA needs at least one owner."
- Help: `team`, `team_add`.
- UX observations: a person with two roles appears as two rows. The table has no column headers.

## Security (owner)
- How to reach it: "Safety", "Security", `?tab=security`. `securityTab()` line 1648, `reviewerView()` line 1689.
- Purpose: answer security questions sent from the public page; see counts for Confidential materials; open materials for a dispute when both people agreed.
- Layout: no h1. Card "Security questions from the website (N open)": "Sent from the contact form on the /security page. Each one is also emailed to the team. Reply from your own email."; blocks "<name or No name> (<email>): <topic>", time, the message, then badge "Handled" or a button. Card "Confidential materials": "Counts only. The team never sees file names, messages or links here. Switch: <state>. Paused by the emergency stop. Virus scanner: <name or none (test site only)>."; tiles "Engagements with files", "Files", "Messages", "Storage used (MB)", "Files not virus scanned", "Uploads refused, last 30 days", "Files due for deletion in 7 days", "Files deleted, last 30 days", "Secure links open", "Links expired, last 30 days", "Jobs marked sensitive"; h3 "Disputes asking to open the materials" with "A reviewer may open the materials only when both people agreed in DELA. Every open is logged and shown to both people." and rows "Dispute on engagement <8 chars>: N of 2 agreed".
- Interactive elements: "Mark as handled" (toast "Marked as handled"); "Open the materials" (only at 2 of 2; no confirm): shows notice "Logged: both people see that a Lawfecta reviewer opened these materials.", then file rows "<file> (<by>, <date>)" each with "Open" (new tab), then h3 "Messages" and the messages. Refusal: "Both people must agree first."
- States: "None yet."; "None open."; load errors as red notices.
- UX observations: there is no reply box (answers go from the team's own email). "Open the materials" is a privacy-sensitive, logged action with no confirm, while opening a transcript on the Meetings page has one. The dispute shows as a shortened ID with no gig name. No h1 or "?".

## Holds (owner)
- How to reach it: "Safety", "Holds", `?tab=holds`. `holds()` line 927.
- Purpose: see active holds and release one.
- Layout: h1 "Holds" + "?"; "A hold pauses new actions for a person (new allowances, and later hiring and payments). Their records stay readable. Place one from the People page."; card with a table (no header): name + "BD <id>", reason, severity, time, "Release".
- Interactive elements: "Release": browser prompt (POP-UP) "What did you check before releasing this hold?"; toast "Released".
- States: "No active holds."
- UX observations: holds are placed on People and released here. Severity is always "medium". No history of released holds.

## Audit log (owner)
- How to reach it: "Safety", "Audit log", `?tab=audit`; also "Open the full audit log" on Release Control. `audit()` line 942.
- Purpose: read the permanent record of sign ins, refusals and changes.
- Layout: h1 "Audit log" + "?"; "Every sign in, refusal and change. Entries can never be edited or deleted."; card with table "When", "Who", "What" (action code with spaces), "Details" (object type and id + raw JSON).
- Interactive elements: "Load older" (shown when a full page of 100 came back; appends 100 more).
- UX observations: no search, filters or export. Details are raw JSON. Dates have no year. Release Control's Activity card shows the same events in plain words with filter pills; that pattern is not reused here.

## Jobs (owner)
- How to reach it: "Safety", "Jobs", `?tab=jobs`. `jobs()` line 954.
- Purpose: see background work and what failed.
- Layout: h1 "Jobs" + "?"; "Background work such as emails and reminders. The worker runs every minute and retries problems with growing waits."; one stat tile per status (label = the raw status word, each with a "?"); card "Problems" + "?" with a table (no header): kind, status, "Tries: N", last error, time. Empty: "No problems."
- Help: `jobs`, `jobs_problems`, `job_queued` ("Waiting for the next minute's run."), `job_running` ("Being done right now."), `job_succeeded` ("Done."), `job_delayed` ("Failed and will try again later, with a longer wait each time."), `job_dead` ("Failed every try and stopped. Look at Problems below, or ask Claude."), `job_canceled` ("Stopped on purpose, for example an email that could not be sent and should not be retried.").
- Interactive elements: only the "?" tips. No retry or cancel.
- UX observations: tile labels are lower-case code words ("queued", "dead"). Read only.

---

# Public security page (`app/dela-security.js`) (public: anyone, no login)

## Security and your data (both sides and the public)
- How to reach it: the `/security` page of the website (widget DELA-Security). `render()` line 222. No login. Every number comes from `GET /public/security`.
- Purpose and primary focus: explain how DELA protects data and what must never be uploaded; let anyone send a security question.
- Layout, top to bottom:
  1. Hero (navy to burgundy gradient): logo (48px) + eyebrow "Lawfecta DELA"; h1 "Security and your data"; "How DELA protects the work attorneys and freelancers share, what never belongs in DELA, and how long anything is kept."
  2. Card "On this page": numbered list of eight link-buttons with the section titles.
  3. "Where your data is stored": term list "Location" (from settings), "While it travels" ("Everything sent between your browser and DELA is encrypted with TLS. This is the HTTPS lock in your browser's address bar."), "While it is stored" ("Supabase encrypts DELA's database and file storage at rest, so the stored data cannot be read without the keys.").
  4. "What counts as sensitive data": "Some information is too risky to keep in DELA. Sensitive data is never uploaded to DELA, typed into a chat or pasted into a job."; two boxes: "Sensitive data (never upload it)" (six items: SSNs and ITINs; government ID numbers; financial account numbers; protected health information; biometric data; logins and passwords) and "Not sensitive (normal handling)" (green box; six items: client names; dates of birth; addresses, phone numbers and email addresses; case numbers and court names; opposing party names; general case facts and non-medical documents); h3 "How to share sensitive data" ("Keep it in your own storage, such as Google Drive, Dropbox, OneDrive, Box, ShareFile, Clio or NetDocuments, and add a secure link to it on the job. DELA keeps only the link, never the file."); h3 "How DELA checks uploads".
  5. "Link and file expiration": h3 "Files shared with a freelancer" (seven bullets with numbers from settings: expiry choices and default, extension days, days until deletion, minutes a download link works, hours a login code lasts, logging) and h3 "Secure links to your own storage" (three bullets).
  6. "Retention and deletion": four bullets (days until unused drafts, chats and uploads are deleted; days of warning; "You can delete any draft, chat or upload at any time. Deleting is immediate and permanent."; Trash and "Delete forever").
  7. "AI and training": six bullets; h3 "OpenAI" with one of two texts: "DELA's AI features use OpenAI with Zero Data Retention. OpenAI keeps none of the inputs DELA sends." or "DELA's AI features use OpenAI. OpenAI may keep inputs for up to 30 days to monitor for abuse, and does not train its models on them."
  8. "Who can access your data": four bullets.
  9. "Services that handle data": term list "Supabase", "OpenAI", "Brevo", "Stripe", "Vectera", "Anthropic".
  10. "Ask a security question": "Have a question about security or how DELA handles your data? Send it here, and the Lawfecta Team will reply by email."; notice "Do not include client information or sensitive data in your message."; the form.
- Interactive elements:
  - Contents links (smooth scroll, focus moves to the section heading).
  - Form (max width 640px, labels above fields): "Your name" (max 120), "Your email" (max 200), "Topic (short)" (max 80), "Your message" (text area, max 4000, min height 140px), a hidden trap field "Website (leave this empty)" for robots, button "Send message" (becomes "Sending..." and disabled while sending).
- States:
  - Loading: "Loading the security page..." (the widget shows "Loading the security page, one moment..." first).
  - Load failure: card with h1 "Security and your data" and "This page could not load. Please refresh the page."
  - Form results (a notice under the button, `role="status"`): "Thank you. Your message was sent. The Lawfecta Team will reply by email." (ok; the form clears); "Please check your email address. It needs to be a full email address."; "Please write a message before you send."; "Too many messages were sent from here. Please try again in an hour."; "Something went wrong and your message was not sent. Please try again."
- Help: none (no "?" tips or glossary terms).
- Variations: the OpenAI paragraph depends on a setting. With `?unsubscribe=<token>` in the address, an extra card appears first (next section).
- Mobile/accessibility: each section is a `<section>` labelled by its h2; headings can take focus; the form is described by the notice; the trap is `aria-hidden` and out of the tab order; term lists go to one column under 600px; long words wrap.
- UX observations: a long text page in a single column with one hero, eight cards and a form. Empty required fields are only reported after sending (the form has `novalidate`). No link back to DELA or the website. No "last updated" date. "Vectera" is listed for meetings although the admin code also supports VideoSDK.

## Stop reminder and alert emails (public, from an email link)
- How to reach it: the unsubscribe link in DELA reminder and alert emails opens `/security?unsubscribe=<token>`. `unsubscribeCard()` line 245. The card sits at the top, above the hero.
- Purpose: stop reminder and alert emails in one click, with no login.
- Layout: card h2 "Stop reminder and alert emails"; "Click the button to stop reminder and alert emails from DELA, such as new gig alerts and next-step reminders. Emails about your account, payments and signed work will still arrive."; button.
- Interactive elements: "Unsubscribe" (blue; disabled while sending; removed on success). After success, link "open Settings" (goes to /dela?tab=ai).
- States: success (green notice) "Done. You will no longer get reminder and alert emails from DELA. You will still get emails about your account, payments and signed work." then "To get them again, sign in to DELA and open Settings, then the card \"Emails\": open Settings."; bad link (red) "This unsubscribe link did not work. Open the link from your most recent DELA email, or write to us with the form at the bottom of this page."; network error (red) "That did not go through. Please try again in a minute."
- UX observations: the unsubscribe card is placed on top of an unrelated long page. The resubscribe link points to `tab=ai` while the text says Settings, "Emails" card.

---

# Widgets (`widgets/`): install shims, not pages

- `DELA-Admin.php` (version 1.2.0): placed on the `/dela-admin` page. It loads the DELA-Auth helper to get a signed pass for the logged-in member, calls the api `/bootstrap`, then loads `shared/dela-core.js` and `admin/dela-admin.js` from jsDelivr at the commit the api names. Its only visible text is "Loading DELA..." and "DELA could not load. Please refresh the page."
- `DELA-App.php` (version 1.2.0): placed on the `/dela` page. The same shim as DELA-Admin with `data-mode="app"`, so it loads `app/dela-app.js` (the member app). Same two texts: "Loading DELA..." and "DELA could not load. Please refresh the page."
- `DELA-Auth.php` (version 1.0.0): a helper that is never placed on a page and shows nothing. On the server it checks the Brilliant Directories login and signs a one-use pass, valid 10 minutes, with the member ID, plan ID, name, email and sign-up date; it also reports why a pass is empty.
- `DELA-Security.php` (version 1.0.0): placed on the `/security` page, no login. It calls `/bootstrap` for the current code version, then loads the core and `app/dela-security.js`. Visible texts: "Loading the security page...", "Loading the security page, one moment...", and after 20 seconds or an error "The security page could not load (step N). Please refresh the page. If this stays, tell the Lawfecta Team: step N."

All three page shims draw their loading and error text in Arial, color `#1f2a37`, centered, outside the design system (before the stylesheet exists).

---

# Cross-page elements seen

- Page header: h1 + "?" help tip (`pageHead`). Missing on Disputes, Recurring, Trials, Usage, Agencies, Security, My account and Release Control.
- Folding card with "Show" / "Hide" (remembered per browser): Guide, Overview, Access list, Plans, Settings, Release Control.
- Count in a card title: "<Title> (N)" across the queue pages.
- Queue item pattern: a small card inside a card with a bold title, facts, an unlabelled note box, then a blue primary and a ghost or red secondary button (Verification, Gigs, Reviews and bench, Payments human review, Disputes).
- Stat tiles (`.tile.col` with `.stat`) on Overview and Jobs; smaller key/value tiles (`.kv`) on Release Control, Meetings, Reviews, Payments, Disputes, Security, AI and files.
- Tables in a `.scroll` wrapper; `table.stack` (mobile-stacking with `data-label`) only on some tables.
- "Needs attention" clickable rows (`.hl` / `.hrow`): Payments only.
- Browser pop-ups: `prompt` for a reason (pause, hold, release hold, remove logo, pause gig, pause tool, close report, transcript decision, release payout, lift pause, reset test data) and `confirm` for risky steps (remove access, approve plan, undo setting, open DELA to everyone, mark Stripe live, live payments switch, not verified, open transcript, remove review, decide dispute, stop connection, remove team member, trial Live mode). Several equally risky actions have none (renewal emergency stop, "Do not deliver", "Pause the gig", "Throw draft away", "Open the materials", switch changes).
- Release password drawer (`askPassword`) for plan restore; an in-card password and code panel for push and go back.
- Toasts for every result; errors through `D.errorText` or `RELEASE_ERR`; an unknown code shows as "That did not work (<code>)."
- Loading text "Loading..." everywhere; empty-state wording varies: "Nothing is waiting.", "None.", "None yet.", "None open.", "No ... yet.", "Nobody yet.", "Nobody right now.", "Nothing waiting.", "Nothing here yet."
- Shared status words: Confirmed / Suggested / Open / Needs a gate (settings and plan features); Off / Lawfecta Team only / Access list / Everyone (switch states, also shown raw as off / staff / list / everyone on several pages); Attorney / Freelancer. "Confirmed", "Live", "Open" and "Paused" each carry more than one meaning across pages.
- Environment badge "Test site" / "Live" in the top bar on every page.
- Raw technical words shown to the owner in many places: switch keys, setting keys, plan codes, status codes, JSON in history, audit details and one toast.
- Owner-only controls are hidden (or disabled for pause buttons, switch dropdowns and the tested tick) for other staff roles; no page explains to a non-owner why a control is missing.

---

# PART A

# A. App shell, Home, Settings, Subscription, Usage, Notifications, Help, deep links

Source: `app/dela-app.js`, lines 1 to 1855, 2215 to 2428, 12195 to 12901 (every line read).
A few functions that these pages call sit just outside the ranges; they were read too where the page cannot be described without them, and are marked "(outside range, line N)".
New layout only (`NL()` true: `me.side` set and switch `new_layout` on). The old layout (old top bar `header()`, old tab strip `nav()`, old Home `attorneyHome()` / `freelancerHome()`, old guide card `guideBox()`, `planCard()`) is still in the code and is listed once at the end under "Old layout, not part of the new design".

---

## 1. Global navigation (both sides)

Functions: `tabsFor()` line 21, `navGroups()` line 216, `sidebar()` line 244, `bottomBar()` line 378, `openMore()` line 344, `headerNew()` line 387, `toggleMenu()` line 143, `shellNew()` line 443, `draw()` line 12206.

### 1.1 Sidebar (desktop, 900px and wider)

`<nav aria-label="DELA sections">`. Top: logo and the word "LAWFECTA". Then four groups divided by thin separator lines: main, second, account, (flexible gap), foot. Last item is the fold button.

Each item is a button with an SVG icon and a label; the current page has `aria-current="page"`. Clicking sets `tab` and redraws (`goTab`). The address bar is updated to `?tab=<key>` (`syncAddress`, line 411).

A menu item existing in the menu and the page actually opening are gated separately. "Menu gate" is what makes the item appear; "Page gate" is what `draw()` needs to open the real page. If the menu gate passes and the page gate fails, the member sees a "Coming soon" page (section 9).

**Attorney sidebar**

| Group | Label (exact) | Tab key | Icon | Menu gate | Page gate in `draw()` |
|---|---|---|---|---|---|
| main | "Home" | `home` | home | always | always |
| main | "Projects" | `projects` | folder | always | switch `flex_gigs` (else "Coming soon") |
| main | "Ask DELA" (switch `ai_generation` on) or "Delegate" (off) | `delegate` | sparkle | always | switch `ai_generation` (else "Coming soon") |
| main | "Library" | `library` | book | switch `playbook_library` | switch `playbook_library` |
| second | "Talent" | `talent` | magnifier | always | switch `talent_search` (else "Coming soon") |
| second | "Notifications" | `notices` | bell | always | always |
| second | "Meetings" | `meetings` | calendar/clock | switch `meetings` | switch `meetings` |
| second | "Files" | `files` | page | switch `file_uploads` | switch `file_uploads` |
| second | "Get set up" | `setup` | check | switch `guided_setup`, and setup not finished or dismissed (`GET /setup`; once `finished` or `dismissed` it leaves the menu and stays reachable from Help) | switch `guided_setup` |
| account | "Profile" | `profile` | person | switch `profiles` | switch `profiles` |
| account | "Subscription" | `subscription` | card | always | new layout |
| foot | "Settings" | `ai` | sliders | always | always |
| foot | "Help" | `help` | question mark | always | new layout |
| foot | "Collapse sidebar" / "Expand sidebar" | (none) | chevron | always | n/a |

Rule: main is filled to four items. If "Library" is off, the first item of second ("Talent") moves up into main.

**Freelancer sidebar**

| Group | Label (exact) | Tab key | Icon | Menu gate | Page gate in `draw()` |
|---|---|---|---|---|---|
| main | "Home" | `home` | home | always | always |
| main | "Work" | `work` | briefcase | always | switch `flex_gigs` (else "Coming soon") |
| main | "Ask DELA" | `ask` | sparkle | switch `ai_generation` | switch `ai_generation` |
| main | "Earnings" | `earnings` | dollar | always | switch `engagements` (else "Coming soon") |
| second | "Notifications" | `notices` | bell | always | always |
| second | "Meetings" | `meetings` | calendar/clock | switch `meetings` | switch `meetings` |
| second | "Library" | `library` | book | `me.agency_client` AND switch `playbook_library` | same |
| second | "Projects" | `projects` | folder | `me.agency_client` AND switch `flex_gigs` | same |
| second | "Talent" | `talent` | magnifier | `me.agency_client` AND switch `talent_search` | same |
| account | "Profile" | `profile` | person | switch `profiles` | switch `profiles` |
| account | "Subscription" | `subscription` | card | always | new layout |
| account | "Agency" | `agency` | building | switch `agency_team` | switch `agency_team` |
| foot | "Settings" | `ai` | sliders | always | always |
| foot | "Help" | `help` | question mark | always | new layout |
| foot | "Collapse sidebar" / "Expand sidebar" | (none) | chevron | always | n/a |

Rule: if "Ask DELA" is off, "Notifications" moves up into main. An agency that hires (`me.agency_client`) gets Library, Projects and Talent on the freelancer side.

**Pages with no menu item** (reached from the top bar, a button, or a link): `inbox` ("Inbox", top bar button, switch `gig_chat`), `usage` ("Usage", attorney only), `connect` ("Connect"), `record` ("Record a process", attorney, opens the Library with the recorder started). Page titles for these come from `PAGE_NAMES` (line 212).

**"Collapse sidebar"**: button at the very bottom of the sidebar. Label "Collapse sidebar" when open, "Expand sidebar" when folded. Folded state shows icons only; each item then has an `aria-label` and a `data-tip` with its name (tooltip). Stored in this browser only (`localStorage` key `dela.side.folded`). `aria-expanded` reflects the state.

The sidebar height is set by script to the visible window height so "Settings", "Help" and "Collapse sidebar" stay in view (`fitSidebar`, line 461).

### 1.2 Phone bottom bar and "More" sheet (under 900px)

`bottomBar()` line 378: the same four main items as buttons (icon over label), then a fifth button "More" (three dots icon). "More" shows as current when the open page is in second, account or foot.

"More" opens a modal bottom sheet (`openMore`, line 344):
- Grab bar (decorative), heading "Attorney workspace" or "Freelancer workspace", close button (X icon, `aria-label` "Close menu").
- The second group, the account group and the foot group ("Settings", "Help") as rows, separated by lines.
- "Switch to attorney workspace" / "Switch to freelancer workspace" (only when the member holds both sides).
- "Sign out".
- Closes with X, a tap on the dimmed backdrop, Escape, or "More" again. Tab key is trapped inside. Page behind is `inert` and cannot scroll.

The bar hides while the member types in a text box (class `kb`) and comes back when typing ends. There is defensive code that moves the bar to the page body if the host website traps `position: fixed` (lines 259 to 321). The host site's "back to top" button is hidden on phones.

### 1.3 Top bar (`headerNew`, line 387), left to right

1. Brand: logo and "LAWFECTA".
2. Page title (class `where`): the menu label of the current tab, or from `PAGE_NAMES` ("Subscription", "Inbox", "Meetings", "Usage", "Connect", "Record a process", "Settings", "Help", "Profile"), or "DELA".
3. Badge "Test site" (tooltip "This copy of DELA is in test mode. Test data only.") when not the live environment.
4. Workspace switch, only when the member holds both sides: a two-button segment, `aria-label` "Switch workspace", buttons "Attorney" and "Freelancer" (`aria-pressed`). Clicking posts `/me/side` and lands on Home of the other side. Failure: error toast.
5. "Inbox" button (envelope icon and the word "Inbox"), only with switch `gig_chat`. Red count bubble with total unread messages; `aria-label` becomes "Inbox, N unread". Opens `?tab=inbox`.
6. Bell (icon only), `aria-label` "Notifications" or "Notifications, N unread", count bubble when `me.unread > 0`. Opens the Notifications panel (section 12). Clicking again closes it.
7. Avatar: round button with the member's initials (first and last name initials; if no name, first letter of the email; else "Me"). `aria-label` "Account menu". Opens the account menu.

### 1.4 Account menu (`toggleMenu`, line 143)

Dropdown under the avatar, `role="menu"`. Closes on any outside click or Escape. Items top to bottom:
- The member's name (muted, not clickable).
- "Profile and verification" (attorney) or "Profile" (freelancer). Switch `profiles`. Opens `?tab=profile`.
- "Account and security". Opens Settings and scrolls to and focuses the "Account and security" card.
- "Settings". Opens `?tab=ai`.
- "Admin area" (link to `/dela-admin`). Only for Lawfecta Team staff (`me.staff` not empty).
- Appearance block (`appearanceItems`, line 12194), only when `me.appearance.on`: small heading "Appearance", then three radio items "Match my device", "Light", "Dark". The chosen one is prefixed "✓ ". Click posts `/me/appearance`, applies the theme, closes the menu, toast "Appearance: <choice>". Failure: error toast.
- "Sign out". If a screen recording is still uploading, a browser confirm pop-up: "A recording has not finished uploading. Sign out and delete it from this browser?". Then a full-screen card "Signing you out..." / "One moment." and a redirect to the website's log out page.

### 1.5 Things `draw()` puts on every page (line 12206)

In order, above the page content:
- Usage limit banner (yellow, `limitBanner`, line 12340), on every page except Subscription, when any counted limit is at or above the warning level (default 80%). Text: "You have used N of your N DELA actions this month." and/or "You are close to a limit of your plan: <label>, <text>; ..." or "You have reached a limit of your plan: ...". Buttons: "View subscription" (opens Subscription on the "Usage & Limits" tab) and "Dismiss" (hides it in this browser until a limit crosses its next level or the month resets).
- Sensitive data notice (blue info bar with an "i" and a "×" `aria-label` "Dismiss notice"; after dismissal a small button "Show the sensitive data notice"). Text comes from the server (`me.notice`). Shown on Ask DELA, Library, recorder, Meetings, Notifications, Agency, Get set up, Connect. Not shown on: Home, Files, Projects, Talent, Work, Earnings, Profile, Settings, Help, Usage, Subscription, Inbox.
- Red alert, staff only: "DELA is paused for members right now. You can still use it because you are on the Lawfecta Team."
- Red alert when the account is on hold: "Some actions are paused on your account. Contact the Lawfecta Team."

Below the page content, attorney only, on every page except Talent and Home: a small centered link "DELA actions: N of N this month" (only when the plan has an action limit). It opens `?tab=usage` (section 11).

Drawers (right side panels: Notifications, Customize dashboard) share `showDrawer` (line 127): dimmed backdrop, a "Close" button pinned at the top (`aria-label` "Close <panel name>"), Escape closes.

**UX observations (navigation)**
- The Settings page has tab key `ai` and is called "Settings" in the menu, but notification buttons that link to it are labelled via `setName()` and an older map still says "Open AI settings" for other cases. Wording "AI settings" survives in places.
- Notification wording is mixed: menu "Notifications", page "Notifications", but Settings toggles and help text say "Notices" ("In Notices").
- Attorney "Ask DELA" has tab key `delegate`; freelancer "Ask DELA" has tab key `ask`. Same label, two keys.
- "Projects", "Talent", "Work", "Earnings" and the attorney's "Ask DELA/Delegate" appear in the menu even when their switch is off and then open a "Coming soon" page.
- Two different attorney usage pages exist: the footer link opens the old "Usage" page (`?tab=usage`), while the banner and the Home widget open Subscription, "Usage & Limits".
- The workspace switch is in the top bar on desktop and inside "More" on phones (the top bar segment has class `nl-seg`; whether it is hidden on phones is in the styles, unclear from this file).
- Appearance can be changed in two places (account menu and Settings).
- Icons for "Ask DELA" (sparkle) and "Get set up" (check) are generic line icons; many unrelated widgets reuse the same icon ("bars", "swap").

---

## 2. Screens before the app opens (both)

- How to reach it: automatic at page load (lines 12892 to 12900), by the server's boot route. Functions `frame()` line 54, `signedOut()` line 62, `denied()` line 68.
- Purpose and primary focus: tell a person why DELA is not open and the one thing to do.
- Shown when: not signed in, session ended, account closed or not on the access list, DELA paused, two logins in one browser.
- Layout: top bar with brand only ("DELA" wordmark here, since no side is known), then one centered card (max 560px) with a heading, a muted line, and at most one button.
- Variants (heading / body / action):
  - "Log in to use DELA" / "DELA is part of your Lawfecta account. Log in, then come back to this page." / link button "Log in to Lawfecta".
  - "Your sign in ended" / "For your security, DELA signs you out after a while. Refresh the page to keep going." / button "Refresh".
  - "This account is closed" / "Contact the Lawfecta Team if you think this is a mistake." / no button.
  - "DELA is not open for your account yet" / "DELA is opening to members in stages. We will let you know as soon as it is ready for you." / no button.
  - "DELA is paused for a moment" / server message or "Please try again soon." / no button.
  - "Two website logins in this browser" / three sentences of clean-up steps (log out, clear cookies, log in again; tip about a private window) / no button.
  - "Signing you out..." / "One moment." (during sign out).
- A link with `?past_review=<token>` opens a past-review page with only the brand bar (page itself is outside these ranges, `pastReviewPage` line 10688).
- UX observations: these screens say "DELA" while the signed-in app says "LAWFECTA". Several dead ends have no button or contact link.

---

## 3. "Almost there" (no side) (both)

- How to reach it: automatic when the member is signed in but `me.side` is empty. `noSide()` line 1800.
- Purpose: explain that the plan is not linked to a side yet.
- Shown when: `me.side` is empty. The new layout is not used (no sidebar); old top bar only.
- Layout: one card (max 620px). Heading "Almost there". Text "Your Lawfecta plan is not linked to DELA yet, so we do not know whether to open Attorney DELA or Freelancer DELA for you." Muted: "The Lawfecta Team will set this up. If you just changed plans, refresh this page in a minute."
- Interactive elements: none in the card. The top bar still has the bell and the avatar menu (name, "Admin area" for staff, Appearance, "Sign out").
- UX observations: no button to refresh or contact the team.

---

## 4. Home: "Your Workspace" (attorney and freelancer)

- How to reach it: menu "Home", `?tab=home`, and any unknown tab falls back here. `homeDash()` line 1428, `paintHome()` line 1404.
- Purpose and primary focus: a dashboard of cards ("widgets") the member arranges. The one main thing: see what needs attention and jump to it.
- Shown when: new layout, any side. Layout is loaded from `GET /home/layout`.
- Layout, top to bottom:
  1. Header row: heading "Your Workspace"; muted line "Welcome back, <first name>. Your work, your priorities." (without the welcome part when no name). On the right: the "My work" / "My agency" segment (agency owners only, section 5) and the button "Customize dashboard" (grid icon).
  2. Top slot: the "Complete your profile" / eligibility card (4.1) when the member has nothing urgent and no work.
  3. The widget grid. One column, or two columns on a wide screen when there is more than one widget (fills row by row; each card keeps its own height). DOM order equals the member's order.
  4. Bottom slot: the same profile card moves here when there is something in "Needs your attention" or the member has active projects or invitations.
- States: grid shows "Loading..." first. If no widget is allowed or chosen: "Nothing to show yet. Choose "Customize dashboard" to add widgets." If the saved layout cannot load, the default widgets show and "Customize dashboard" is disabled with tooltip "Your saved layout could not load. Reload the page to change it." Every widget that loads its own data shows "Loading..." then, on failure, "This could not load just now. " with a link button "Try again".
- Default widgets: attorney: Needs your attention, Things to consider delegating, My projects and milestones, Proposals and talent matches, Delegation spend and results, Ask DELA. Freelancer: Needs your attention, Active work and deadlines, Recommended gigs, Earnings and payments, My proposals and invitations, Business growth insights. (The server can send a different default and the full allowed list.)
- Widget gating (`homeAllowed`, line 865). A widget is not offered and not drawn when:
  - "Ask DELA": both `onboarding_widget` and `ai_generation` off.
  - "Recent messages": `gig_chat` off. "Upcoming meetings": `meetings` off.
  - "Trusted bench": freelancer, or `bench` off. "Standing arrangements": `engagements` off.
  - "Things to consider delegating": freelancer, or `automate_delegate` off, or `playbook_library` off.
  - "Workflow improvement opportunities": freelancer, or `playbook_library` off.
  - "Proposals and talent matches": freelancer, or `flex_gigs` off. "Delegation spend and results": freelancer, or `engagements` off.
  - "Recommended gigs", "My proposals and invitations", "Business growth insights": attorney, or `flex_gigs` off.
  - "Earnings and payments": attorney, or `engagements` off. "My availability": attorney, or `profiles` off. "Client reviews": attorney, or `reviews` off.
  - The four agency widgets: only in the "My agency" view.
- Shared widget anatomy: a card with an h2 title, an optional pink count badge or a period dropdown at the right of the title, a body, and a footer link ending in " →".
- Shared row (`hrow`, line 548): optional status dot (grey open, green done, amber warn), bold title, one or two grey sub lines, optional red flag badge ("Overdue"), optional status badge, optional action words at the right, and a chevron. A row with an action is one big button; screen readers hear "action: title".
- Shared number tile (`hstat`): a big number, a label, optional small note. Every tile is a button that opens the matching list.
- Late rule used everywhere on Home: "Overdue" means the due date is before today and the milestone is not accepted, refunded, canceled, delivered ("submitted") or disputed. Date words: "Due <date>", "Was due <date>", "Delivered, was due <date>", "In dispute, was due <date>".
- Mobile/accessibility: widgets are in one container in the member's order (WCAG 1.3.2, 2.4.3 noted in code). Progress bars and rings carry `aria-label` text. Number tiles are buttons.
- UX observations: Home can show up to about 20 different widgets; several overlap (see each widget). The profile card is not a widget and cannot be removed or moved by the member; its position flips between top and bottom depending on activity.

### 4.1 "Complete your profile" card and eligibility cards (not a widget) (`profileBox`, line 596)

- Shown when: profile data loaded. Not shown in the "My agency" view.
- Variation A, profile incomplete (both sides). Title "Complete your profile" with pink badge "N of N details complete". Progress bar (`aria-label` "N of N profile details complete"). A list of missing items (labels from the server), each a row that opens the Profile page at the matching section. Buttons: "Continue setup" (blue; opens Profile at the first missing item), "View all N remaining details" (link; toggles to "Show fewer"; only when more than one is missing), "Help me complete my profile" (link; hidden until the Ask DELA widget on the same page can take a question; it sends "Help me complete my profile. What should I add next?" to that widget).
  - Freelancer only, below: small heading "Also needed before new invitations" with two rows:
    - "Verification: LinkedIn check": badge "Verified"; or sub "The Lawfecta Team is reviewing it. Nothing more is needed from you." badge "Review pending"; or sub "The Lawfecta Team reviews it by hand." badge "Not submitted", action "Submit LinkedIn profile"; or sub "It was not approved. You can send it again." badge "Action needed", action "Send it again". (Row is left out when verification is not required.)
    - "Availability": sub "You said you are not taking new work." badge "Not taking work", action "Change availability"; or sub "You confirm it every N days." badge "Not confirmed yet", action "Confirm availability"; or sub "Last confirmed <date>." badge "Out of date", action "Confirm availability"; or sub "Confirm again by <date>." badge "Available" or "Some hours only".
    - If the member has active projects: "Work you already have is not affected."
- Variation B, freelancer, profile complete but not ready for invitations. Title is one of: "Almost ready for invitations", "Your availability is out of date", "You are not taking new work", "Your account is paused".
  - Paused: text "Attorneys cannot invite you while your account is paused. Contact the Lawfecta Team." and nothing else.
  - Out of date: "Attorneys cannot invite you until you confirm it again. Work you already have is not affected."
  - Rows: "Profile" with badge "N of N details complete", then the two eligibility rows above.
  - Button "Confirm availability" or "Change availability" (blue), or the line "Invitations start when the review is done."
- Variation C: attorney with a complete profile, or freelancer who is match-ready: no card.

### 4.2 Widget "Needs your attention" (both) (`wAttention` line 891, `attentionRows` line 642)

- Title "Needs your attention" with a pink badge holding the count.
- Empty: "Nothing needs you right now."
- Shows the first 3 rows; if more, link button "View all N items →" adds the rest in place.
- Row types (sorted: overdue milestones first, then failed payments, then by date):
  - "Review milestone N", sub "<gig>. Delivered <date>. Review by <date>.", action "Review delivery".
  - "Pay milestone N to start the work" or "The payment for milestone N did not go through", sub "<gig>.", second sub "Milestone N · $amount · payment failed on <date>", action "Pay milestone".
  - "Agreement to sign", sub "<gig>. Sign by <date>.", action "Review and sign".
  - "N proposal to review" / "N proposals to compare", sub "Gig: <gig>.", action "View proposal" / "Compare proposals".
  - "Milestone N: <title>", sub "<gig>, <client>. Due <date>. $amount paid, held by Lawfecta. Changes requested.", red flag "Overdue" when late, action "View milestone".
  - "Invitation: <gig>", sub "Answering does not use your monthly proposals.", action "View invitation".
  - Attorney: "Firm details missing", sub "Needed before you can sign an agreement and pay.", action "Add details".
  - Attorney: "Bar license not verified yet", sub "Needed before you can post a gig.", action "Verify license".
  - Freelancer (within 3 days of the date): "Availability: confirm by <date>", sub "You said: some hours only." or "You said: available for new work.", action "Confirm availability".
- Each row opens the gig or agreement page, or the Profile section.

### 4.3 Widget "My projects and milestones" (attorney) / "Active work and deadlines" (freelancer) (`wProjects` line 904, `workBox` line 682)

- Attorney tiles (4): "Deliveries to review", "Active projects", "Open gigs", "Gig drafts". Each opens Projects at the matching list ("Engagements" or "Your gigs").
- Freelancer tiles (2 in the new layout): "Active projects" (opens Work, "Your engagements"), and "Proposals left this month" with the number, or "Unlimited" over "proposals this month" (opens Work, "Sent proposals").
- Project rows: title = gig title; sub "<other person>. Milestone N due <date>."; red flag "Overdue"; status badge: "Awaiting your review", "Waiting for signatures", "Waiting for the first payment", "In progress", "Paused", "In dispute". Each opens the gig.
- Empty: attorney "No active projects yet. Post a gig from Projects, or ask DELA to plan a task." Freelancer "No active projects yet."
- Freelancer who is not ready and has no work sees a different card titled "Work opportunities" with one line: "Invitations start when your profile, the LinkedIn check and your availability are in place." or "Invitations start when the LinkedIn check is done." or "Invitations start again once the step above is done."
- Title-row link "Manage alerts" (freelancer, switches `gig_alerts` and `onboarding_widget`): opens Settings at "Suggestions and alerts".
- Footer: "View all projects →" (attorney) / "View all work →" (freelancer).

### 4.4 Widget "Ask DELA" (both) (`wAsk` line 1259, `askBox` line 748)

- Gate: `onboarding_widget` or `ai_generation`. With only `ai_generation`, the card holds just the link "Open Ask DELA".
- Loading text: "DELA is getting ready..."
- Body, top to bottom (with `onboarding_widget` and the guide on):
  1. DELA's suggestion sentence (from the server) and its choice buttons (labels from the server; the first is blue, the rest ghost). Hidden when suggestions are paused, or when every button would only open the Profile page while the profile card is on screen.
  2. Label "Ask DELA a question", a one-line text box (max 1000 characters; placeholder attorney "For example: What can I delegate this week?", freelancer "For example: How do I get more invitations?") and a round send button (`aria-label` "Send"). Enter sends. Shown only while free answers remain.
  3. The answer appears in a box under the input.
  4. "N free answers remaining today." (or "1 free answer remaining today."). When none: "You used today's free guide answers. Ask DELA on its own page, or come back tomorrow."
  5. "Questions asked here are free and do not use your DELA actions." plus, for attorneys with `ai_generation`, " Planning a task uses DELA actions."
  6. Links: "Open Ask DELA" (switch `ai_generation`) and "DELA suggestion settings" (or "DELA suggestions are paused"), which opens Settings at "Suggestions and alerts".
  7. Attorney only, shortcut buttons: "What can I delegate?" (`ai_generation`), "Create a playbook" (`playbook_library`), "Find talent" (`talent_search`).
- Error messages under the input: "That looks like client details. Leave them out and ask again."; "The guide cannot answer questions right now. The buttons above still work."; "The guide could not answer right now. Try again in a minute."; "The guide could not give a clear answer. Try asking another way."; "That question was already sent. Type it again to ask once more."; "The DELA guide is off right now."
- UX observations: the words "guide", "DELA guide", "Ask DELA" and "DELA suggestions" all name parts of the same thing. "Create a playbook" uses "playbook" while the rest of the app says "document".

### 4.5 Widget "Monthly usage" (both) (`wUsage` line 908)

- Attorney: a ring chart of DELA actions used this month (number in the middle, "/ limit" or "used"; turns amber at the warning level and red at 100%). Beside it: "DELA actions" with "N left this month (P% used)" or "None left this month" or "No limit on your plan", and "Shared by your firm" when shared. Then a bar each for "Saved documents" and "Storage" with their text. Line: "DELA actions reset on <date>." Footer "View usage details →" (opens Subscription).
- Freelancer: a plain list of the first five plan items with their limit text, or "Your plan has no monthly limits to show." Footer "View your plan →".

### 4.6 Widget "Urgent notifications" (both) (`wNotices` line 950)

- Pink badge with the unread count. Up to 3 unread notifications: amber dot, title, date and time, and an action (the notification's own button label, or "Open"). Clicking marks it read and follows its link.
- Empty: "No unread notifications." Footer "View all notifications →".

### 4.7 Widget "Upcoming meetings" (both, switch `meetings`) (`wMeetings` line 964)

- The next 2 confirmed meetings: face/avatar, "<other person>: <gig title>", date, time and time zone. Buttons: "Join the meeting" (blue; opens DELA's own room or an outside link in a new tab) and "Open the meeting".
- Empty: "No upcoming meetings." Footer "View calendar →".

### 4.8 Widget "Recent messages" (both, switch `gig_chat`) (`wMessages` line 982)

- The 3 latest conversations: amber dot when unread, title "<other person> (N unread)", sub "<gig title>. You: <last message>" or "No messages yet". Opens the conversation in the Inbox.
- Empty: "No conversations yet." Footer "View inbox →".

### 4.9 Widget "Trusted bench" (attorney, switch `bench`) (`wBench` line 996)

- Up to 3 people: name, headline, badge "Invitation sent", "Available" or "Not available now". Each row opens Talent on the bench view.
- Empty: "Nobody on your bench yet. Invite someone from Talent, or after a completed job." Footer "Open my bench →".

### 4.10 Widget "Standing arrangements" (both, switch `engagements`) (`wStanding` line 1009)

- Up to 3 arrangements that are not ended or declined: title is the freelancer's name (attorney) or the firm's name (freelancer); sub "$X of $Y this month. N of N jobs open."; badge from: "Waiting for the freelancer", "Active", "Needs review", "Ending after open jobs", "Ended", "Declined".
- Empty: "No standing arrangement is active." Footer "Open Projects →" / "Open Work →".

### 4.11 Widget "Quick actions" (both) (`wQuick` line 1022)

- Ghost buttons. Attorney: "Post a gig" (`flex_gigs`), "Find a freelancer" (`talent_search`), "Open the Library" (`playbook_library`), "Open my inbox" (`gig_chat`), "Open Files" (`file_uploads`). Freelancer: "Find work" (`flex_gigs`), "Update my profile" (`profiles`), "See my earnings" (`engagements`), "Open my inbox" (`gig_chat`).
- UX observation: "Post a gig" only opens the Projects page; it does not start a new gig.

### 4.12 Widget "Things to consider delegating" (attorney, switches `automate_delegate` and `playbook_library`) (`wDelegating` line 1053)

- Rows: title (or "A task to hand off"), sub "From <doc id> <document title>. <why> Skills: a, b.", action "Review suggestion" (opens the document in the Library).
- Footnote: "Suggestions from DELA, from your approved documents. Nothing is posted or sent until you review and approve it."
- Empty states: "Approve a document in the Library to get delegation ideas. DELA only looks at documents you approved." / "No open delegation suggestion right now." / "DELA has not looked at your approved documents yet. Open one and go to its card "Automate or delegate" to see what could be handed off."
- Footer "Open the Library →".

### 4.13 Widget "Proposals and talent matches" (attorney, switch `flex_gigs`) (`wTalent` line 1069)

- Two tiles: "Proposal to review" / "Proposals to review", and "Open gig" / "Open gigs".
- Then for the newest open gig: "Looking for freelancers who fit "<gig>"..." then heading "Freelancers who fit "<gig>"" and up to 3 rows: name, headline and reasons, badge "Invited", action "View profile".
- Footnote: "Why they fit is taken from their profiles. An invitation asks for a proposal; it does not hire anyone."
- Empty: "No open gig. Post a gig from Projects to get proposals and matching freelancers." / "No matching profiles yet." Error: "The matching freelancers could not load just now."
- Footer "Find talent →".

### 4.14 Widget "Delegation spend and results" (attorney, switch `engagements`) (`wSpend` line 1097)

- Period dropdown in the title row (`aria-label` "Period"): "This month", "This quarter", "This year".
- Big amount with "paid this month/quarter/year". Lines: "For the work" ($, "N% of what you paid"), "Platform fee" ($), "Refunded to you" ($, when any).
- Small heading "Results this month/quarter/year" and rows: "Milestones accepted", "Engagements completed", "Average time from start to acceptance" (N day/days), "Freelancers hired more than once" (sub "Of everyone you have signed with, all time", value "N of N").
- Empty: "No recorded delegation spend this month." with link "Post a gig →" (`flex_gigs`).
- Footer "View projects and payments →".

### 4.15 Widget "Workflow improvement opportunities" (attorney, switch `playbook_library`) (`wWorkflow` line 1129)

- Up to 3 documents with flagged issues: title, sub "N problem(s) that block(s) approval, N thing(s) to look at.", action "Open document".
- Footnote: "From each document's own self-check. DELA never changes a document by itself."
- Empty: "No flagged issues in your documents." Footer "Open the Library →".

### 4.16 Widget "Recommended gigs" (freelancer, switch `flex_gigs`) (`wGigs` line 1147)

- Up to 3 gigs: title, sub "<practice area> · <state> · <budget> · closes <date>. Why it matches: a, b.", action "View gig".
- Footnote: "Opening a gig sends nothing. You send a proposal yourself."
- Empty: "No new matching gigs right now." with button "Update skills and availability". Footer "View all gigs →".

### 4.17 Widget "My proposals and invitations" (freelancer, switch `flex_gigs`) (`wProposals` line 1168)

- Four tiles: "Invitation"/"Invitations" (small "to answer"), "Under review", "Chosen", "Not chosen". Each opens Work at "Invitations" or "Sent proposals".
- Rows: up to 2 invitations ("Invitation: <gig>", sub "Invited <date>. An invitation asks for a proposal; it is not a job yet.", action "View invitation") and 1 to 3 sent proposals (title, sub "$price. Sent <date>.", badge from: "Draft", "Sent", "Being checked", "Withdrawn", "Chosen", "Not chosen", "Closed", with ": please confirm" appended when a re-confirmation is needed).
- Empty: "No proposals or invitations yet. Open a gig that fits and send your first proposal." Footer "View all →".

### 4.18 Widget "Earnings and payments" (freelancer, switch `engagements`) (`wEarnings` line 1190)

- Period dropdown: "This month", "This quarter", "This year".
- Big amount with "received this month/quarter/year". Lines: "Waiting for payout" (note "Earned, not paid out yet"), "Could not be paid out" (note "Check your payout details in Earnings"), "Signed, not yet paid" (note "Signed work that is not accepted yet").
- Small heading "Received in the last six months" and a six-bar chart with month labels (amounts available to screen readers only).
- Empty: "No payments this month. You are paid after the attorney accepts a milestone." Footer "View earnings →".

### 4.19 Widget "Business growth insights" (freelancer, switch `flex_gigs`) (`wGrowth` line 1220)

- Two tiles: "Proposal sent"/"Proposals sent" (small "all time") and "Proposals chosen" ("N of N", small "of those the attorney decided" or "none decided yet").
- "More activity is needed to show a meaningful trend." (fewer than 5 decided).
- One tip line with a button: "Attorneys can only find and invite you once your profile is match-ready." / "Open my profile"; or "N open gigs match your profile right now." / "View matching gigs"; or "Keep your skills and availability current so new gigs can match you." / "Update my profile".
- No footer link.

### 4.20 Widget "My availability" (freelancer, switch `profiles`) (`wAvailability` line 1237)

- One sentence: "You said you are not taking new work." / "You said you have some hours only." / "You said you are available for new work." / "You have not said yet whether you can take new work."
- "Last confirmed <date>. Confirm again by <date>." or "Not confirmed yet. Attorneys can invite you only while it is confirmed."
- Button "Edit availability".

### 4.21 Widget "Client reviews" (freelancer, switch `reviews`) (`wReviews` line 1246)

- Tiles: "Review"/"Reviews" (small "from clients on Lawfecta") and "Would hire again" (N%, small "of N reviews").
- "Averages show from N reviews." Empty: "No reviews yet. A client can review you after a completed job." Footer "View my reviews →" (opens Profile).

### UX observations (Home widgets)
- Overlap: "Needs your attention", "Urgent notifications", the bell panel and the Notifications page all list things waiting on the member. "My availability" repeats the Availability row of the profile card. Invitations appear in "Needs your attention", "My proposals and invitations" and (old layout) the work tiles.
- "Quick actions" and the Ask DELA shortcuts duplicate menu items.
- Footer link wording is not uniform: "View all →", "View all work →", "View all projects →", "Open the Library →", "Find talent →".
- Many widgets end with a small grey legal-style footnote.
- Words for the same record vary: "projects", "engagements", "jobs", "work", "gigs".

---

## 5. Home: "Agency Workspace" (freelancer who owns an agency)

- How to reach it: on Home, the segment at the top right (`aria-label` "Which Home to show") with buttons "My work" and "My agency". Shown only when the server says the member owns an agency (`agency_owner`). The choice is remembered in this browser (`dela.home.agency`). Function `homeDash()` line 1428; widgets lines 1278 to 1382.
- Purpose and primary focus: the agency owner's overview of the agency's jobs, team and money.
- Layout: heading "Agency Workspace", line "Your agency's work, team and payments.", the same "Customize dashboard" button (this view keeps its own widget list), then the grid. No profile card in this view.
- Default widgets: Needs team attention, Active client projects, Team workload and availability, Agency revenue and payments, Proposals and sales pipeline, Recommended agency gigs.
- If the member no longer owns an agency the view switches back to "My work" silently.

### 5.1 "Needs team attention" (`wAgAttention` line 1360)
- Pink count badge. Up to 4 rows; "Showing 4 of N." when more.
- Row types: "Overdue: <job>" (sub "Milestone N, <title>, was due <date>. Team: a, b." or "No team member named."; red flag "Overdue"; action "Review milestone"); "No team member named: <job>" (sub "<client>. Name who works on it on the job's page."; badge "Unassigned"; action "Assign"); plus the owner's own rows from "Needs your attention".
- Empty: "No team actions pending." Footer "View all work →".

### 5.2 "Active client projects" (`wAgClients` line 1349)
- Up to 3 rows: job title; sub "<client> · N of N milestones accepted · Next: <title>, due <date> · Team: a, b." or "No team member named."; red flag "Overdue"; action "Open job".
- "Showing 3 of N, the nearest due date first." Empty: "No active client projects. A job shows here once its agreement is signed by both sides." Footer "View all work →".

### 5.3 "Team workload and availability" (`wAgTeam` line 1304)
- Three tiles (not clickable): "Team member(s)", "On a job now", "On no job now".
- A list of team members: "<name> (you)" for the owner; sub "On N job(s) · N hour(s) a week" or "Hours not set", plus " · Asked today".
- "Hours a week across the team: N. DELA does not record hours worked, so it shows no share of capacity used." or "N of N has/have no weekly hours yet, so no team total is shown."
- Link button "Ask everyone without hours to set them" (becomes disabled "Everyone without hours was asked today"). Toasts: "1 team member was asked to set their weekly hours." / "N team members were asked to set their weekly hours." / "N of N were asked. Try again for the rest." / "The request was not sent. Try again."
- Note: "Each of them gets a notification in DELA and an email that ask for their hours a week, at most once a day. To ask one person, use Manage team."
- Footer "Manage team →" (opens Agency).

### 5.4 "Agency revenue and payments" (`wAgRevenue` line 1278)
- Period dropdown: "This month", "This quarter", "This year".
- Two tiles (not clickable): "Paid by clients" (small "<period>, for the agency's jobs, without platform fees") and "Paid out to agency" (small "<period>, sent to your payout account").
- Line "Waiting for payout to the agency" (note "Earned, not paid out yet").
- Small heading "The last six months", a paired bar chart, and a key "Paid by clients" / "Paid out to agency". Empty: "No payments recorded for the agency's jobs yet."
- Note: "Neither amount is profit: team members' shares and your own costs are not taken off here."
- Footer "View earnings →".

### 5.5 "Proposals and sales pipeline" and "Recommended agency gigs"
- The freelancer widgets 4.17 and 4.16 with a new title and a line under the title: "Same list as My work. Agency and personal proposals are not separated yet." / "Same list as My work. Agency and personal gigs are not separated yet."

- UX observations: the "not separated yet" line marks unfinished work. Tiles in agency widgets look like the clickable tiles elsewhere but do nothing.

---

## 6. "Customize dashboard" panel (both)

- How to reach it: Home, top right, button "Customize dashboard". `openCustomize()` line 1466.
- Purpose and primary focus: choose which widgets Home shows and in what order. Home behind the panel updates live as a preview; nothing is kept until "Save changes".
- Shown when: the layout loaded from the server (button is disabled otherwise). Separate lists for "My work" and "My agency".
- Layout, top to bottom (right side drawer, modal):
  1. "Close" button pinned at the top right.
  2. Heading "Customize dashboard".
  3. "Add, remove and reorder widgets to make Home work for you. Removing a widget only hides it on Home."
  4. "Home updates behind this panel as you make changes. Nothing is kept until you choose Save changes."
  5. Heading "Your dashboard (N)" with the link button "Restore default" on the right. A list; each row: drag handle (six dots, tooltip "Drag to reorder"), widget icon, widget name with a small "Default" tag when it is part of the default set, "↑" button (`aria-label` "Move <name> up", tooltip "Move up"), "↓" button ("Move <name> down", "Move down"), and "Remove" (`aria-label` "Remove <name>").
  6. Heading "Available widgets". Each row: icon, name (with "Default" tag), a one-line description, and "+ Add" (`aria-label` "Add <name> to Home"). When nothing is left: "Every widget is on your Home."
  7. Error line (red, hidden until needed).
  8. Bottom bar: the in-panel question "Discard your changes?" with "Discard changes" and "Keep editing" (hidden until needed), then "Cancel" and "Save changes" (blue; disabled until something changed).
- Widget descriptions shown under "Available widgets" (attorney wording; freelancer differences noted):
  - "Needs your attention": "Signatures, payments, reviews and approvals that wait on you."
  - "Things to consider delegating": "DELA's suggestions from your approved documents, for you to review."
  - "My projects and milestones": "Your active work, gigs and next milestones." Freelancer title "Active work and deadlines": "Your active jobs and what is due next."
  - "Proposals and talent matches": "New proposals on your gigs and freelancers who fit."
  - "Delegation spend and results": "What you paid in a period and what was completed."
  - "Recommended gigs" (agency: "Recommended agency gigs"): "Open gigs that match your profile, with the reason."
  - "Earnings and payments": "What you received, what waits for payout, and what is contracted."
  - "My proposals and invitations" (agency: "Proposals and sales pipeline"): "Invitations to answer and where each proposal stands."
  - "Business growth insights": "How your proposals are doing, and one next step."
  - "Ask DELA": "Ask a question and see DELA's next step for you."
  - "Monthly usage": "Your DELA actions, storage and plan limits." Freelancer: "What your plan gives you this month."
  - "Urgent notifications": "Your newest unread updates and alerts."
  - "Upcoming meetings": "Your next scheduled calls and meetings."
  - "Recent messages": "Your latest conversations and unread messages."
  - "Trusted bench": "Freelancers you finished a job with, and whether they are available."
  - "Standing arrangements": "Recurring work and what was spent this month."
  - "Workflow improvement opportunities": "Documents whose self-check found something to fix."
  - "My availability": "Whether you can take new work, and when you last confirmed it."
  - "Client reviews": "Reviews from clients after completed jobs."
  - "Quick actions": "Shortcuts to the pages you use most."
  - "Agency revenue and payments": "What clients paid for the agency's jobs and what was paid out to the agency."
  - "Team workload and availability": "Who is on a job, and the weekly hours each person gave."
  - "Active client projects": "The agency's jobs, their next milestone and who works on them."
  - "Needs team attention": "Overdue work, jobs with nobody named, and what waits on you."
- Interactive behavior:
  - Drag a row by its handle (mouse or touch); the row moves one place at a time.
  - "↑" / "↓" move one place; disabled at the ends.
  - "Remove" is disabled when one widget is left. Message: "Keep at least one widget on Home."
  - "+ Add" appends the widget to the end.
  - "Restore default" sets the default list (not saved until "Save changes").
  - "Save changes": toast "Your Home layout is saved." or "Home is back to the default layout." Failure: "Your layout was not saved. Check your connection and try again." or "Keep at least one widget on Home."
  - "Cancel": closes and puts Home back.
  - "Close", Escape, or a click on the backdrop: if there are unsaved changes the panel asks "Discard your changes?" in the panel itself (no browser pop-up).
- Accessibility: `role="dialog"`, `aria-modal`, focus trapped, page behind `inert` and only lightly dimmed so the preview stays readable. Every change is announced: "<name> moved to position N of N.", "<name> removed from Home. It is under Available widgets.", "<name> added to Home, N of N.", "Back to the default layout. Choose Save changes to keep it.", "Discard your changes? Choose Discard changes or Keep editing."
- UX observations: there is no size or column choice; order is the only layout control, and on a wide screen order maps to a two-column, row-by-row grid, which may not be obvious from a single list. No preview is visible on a phone where the drawer covers the screen (drawer width is in the styles, unclear from this file).

---

## 7. Help (both)

- How to reach it: sidebar foot "Help", `?tab=help`. `helpView()` line 2215.
- Purpose: a short list of places to get help.
- Shown when: new layout.
- Layout: heading "Help". One card with a list of rows (title, grey sub line, chevron):
  - "Ask DELA" / "Ask how something in DELA works, or get help with a task." (switch `ai_generation`). Opens Ask DELA.
  - "See all setup steps" / "The six steps of getting set up, with what is done and what is left." (attorney, switch `guided_setup`). Opens Get set up.
  - "Your profile" / attorney "Firm details, license verification and your profile." / freelancer "Your profile, the LinkedIn check and your availability." (switch `profiles`). Opens Profile.
  - "Contact the Lawfecta Team" / "Opens the contact form on the Security page." Link to `/security#contact`.
  - "How DELA keeps your information safe" / "The Security page." Link to `/security`.
- Second card (when the server sends the notice text): heading "Sensitive data: what never goes in DELA", the full notice text, and "This rule always applies. Closing the blue notice on a page only hides the reminder; DELA still checks what you type and upload."
- States: none (static).
- UX observations: no search, no FAQ, no glossary link. Contacting the team means leaving the app for the public Security page. Other pages tell people to "contact the Lawfecta Team from Help", which takes two clicks and a page change.

---

## 8. Settings (both)

- How to reach it: sidebar foot "Settings"; account menu "Settings" and "Account and security"; `?tab=ai`. Links from Home ("DELA suggestion settings", "Manage alerts") jump to the "Suggestions and alerts" card. `aiSettingsView()` line 2233, `drawAi()` line 2240, `settingsTop()` (outside range, line 2167), `keyCard()` line 2296, `keyForm()` line 2321.
- Purpose and primary focus: one long page of account, appearance, alerts, email and AI choices. There is no single main action.
- Shown when: any side. Settings are kept per workspace.
- Layout, top to bottom (each is a card):
  1. Heading "Settings". Muted line "These settings are for your Attorney workspace only." / "... Freelancer workspace only."
  2. **"Account and security"** (shared card, `D.accountCard` in `shared/dela-core.js` line 447). Intro: "You sign in to DELA with your Lawfecta website account. DELA never sees or stores your password." Row "Sign-in email" with the address (or "Not known yet. Sign out and sign in again."), explanatory lines, and a button "Change email" only when the website page is configured (otherwise text telling the member to ask the Lawfecta Team through Help). Row "Password" with explanatory lines and, depending on configuration, buttons "Change password", "Forgot password" or "Reset password by email", and "Google account security" for Google sign-in; with nothing configured it shows numbered steps instead of a button. All buttons open the Lawfecta website in a new tab.
  3. **"Appearance"** (when `me.appearance.on`). "How DELA looks for you, on every device you sign in on." Three pill buttons: "Match my device", "Light", "Dark". Toast "Appearance: <choice>".
  4. **"Suggestions and alerts"** (switch `onboarding_widget`). Loading: "Loading...". Text: "DELA suggests your next step on Home. Pausing hides the suggestions for a day." or "DELA's suggestions on Home are paused. They come back tomorrow, or sooner when something new needs you." Button "Pause suggestions" / "Resume suggestions". If the guide is off: "Nothing to set here yet."
     - Freelancer with gig alerts on: sub-heading "New gig alerts", "When a gig that fits you is posted, DELA can tell you on Home, by email and in Notices. Turn off any of them.", three checkboxes "On Home", "By email", "In Notices". Toasts "Saved" / "Not saved. Try again." Notice when optional emails are off: "Reminder and alert emails are off, so gig alerts are not emailed. Turn them on in the card "Emails" below."
     - Error: "These settings could not load. Reload the page to try again."
  5. **"Emails"** (outside range, line 8755). Checkbox "Email me reminders and alerts, such as new gig alerts and next-step reminders." Note: "Emails about your account, payments and signed work always arrive. They go to your sign-in email, shown under "Account and security" at the top of this page." Status line: "Reminder and alert emails are on." or "Reminder and alert emails are off since <date>, turned off from the link in an email." Toasts "Saved" / "Not saved. Try again." Error: "This setting could not load. Reload the page to try again."
  6. Section heading **"AI and messages"**.
  7. **"Which AI DELA uses"**. Two radio buttons:
     - "Use Lawfecta's AI" with sub line "Included with your plan." or "Included with your plan: N of N DELA actions left this month. DELA actions reset on the 1st of each month (Pacific time)."
     - "Use my own key" with sub line "Your OpenAI or Claude account pays for the AI. Your included DELA actions stay as a backup you can choose to use." or, when own keys are not open yet, "Opens soon." (disabled).
     - Choosing saves at once: toast "Saved". Note when not ready: "Lawfecta's AI is still being set up."
  8. Hint (own keys open, not chosen, no key saved): "To add your own OpenAI or Claude key, choose "Use my own key" above."
  9. **"Your own key"** (sub "Only you use this key.") and, for a firm, **"Firm key"** (sub "Everyone in your firm can use this key. A person's own key is used first." for the person who may manage it, or "Your firm owner added this key for the team." for others).
     - With a saved key: facts "Provider" (OpenAI / Claude), "Key" ("ending 1234"), "Used for" ("All AI tasks" / "Chat and documents only"), "Status" ("Working" / "Not working"). When failing, red notice: "This key has not worked since <date>: <reason> Test it again after fixing it with your provider, or replace it." Buttons: "Test it" (toast "The key works." or "The key did not work: <reason>"), "Replace" (swaps the card for the form under the heading "Replace your own key" / "Replace firm key"), "Remove" (red; browser confirm pop-up: "Remove this key? Any waiting AI work that was going to use it will stop. Nothing will run on Lawfecta's AI unless you choose it."; toast "Key removed").
     - Key form: dropdown "Provider" with options "OpenAI", "Claude (Anthropic)"; help line that changes with the provider ("Get a key at platform.openai.com, under API keys. Your OpenAI account needs billing set up." / "Get a key at console.anthropic.com, under API Keys. Your Anthropic account needs credit."); password box "Your key" (placeholder "Paste your key"); dropdown "Use it for" with options "All AI tasks", "Chat and documents only"; note "DELA tests the key, then stores it encrypted. It is used only to run your requests, and the Lawfecta Team cannot see it. Only the last 4 characters are shown."; button "Save and test".
     - Form messages: "Paste your key first."; "Testing the key with OpenAI..." / "... with Claude..."; "That looks like a <provider> key. Choose <provider> above, or paste your <provider> key."; "The key did not work: <reason> It was not saved."; toast "Key saved. DELA will use it from now on."
     - Key problem reasons: "the provider did not accept the key. It may have been deleted or typed wrong."; "your account with the provider is out of credit or has no billing set up."; "the provider is busy with too many requests on this key. Wait a minute and try again."; "the provider is not answering right now. Try again in a few minutes."; "this key cannot use the AI model DELA asked for."; "the AI declined to answer this request."; "the message and files are too long for one answer. Attach fewer files or ask about one part."; "the provider could not handle this request."; fallback "the provider refused it."
  10. **"This month"**. Four facts: "AI tasks on your key", "Text read and written on your key" (N tokens), "AI tasks on Lawfecta's AI", "Included DELA actions used". Note: "Your provider's billing page shows the exact cost of what ran on your key."
  11. **"Talking to the AI"**. "Press Talk in any AI chat, say what you need, and press Stop. Your words appear in the box so you can fix them before you press Send. Recordings are turned into text and not kept." plus a note on the maximum seconds and on Claude keys using Lawfecta's speech to text. When off: "Talking to the AI opens soon."
  12. **"What DELA knows about you"** (switch `profiles`). One paragraph and the button "Open your profile".
  13. Insights card (switch `member_insights`; `insightsCard`, outside range, line 7783; not read).
  14. **"Messages"** (switch `gig_chat`; outside range, line 8742). One checkbox: "Show "Seen" when I read a message, and show me when others read mine. Turning it off turns it off both ways." Toast "Saved".
  15. **"Use DELA in ChatGPT and Claude"** (outside range, line 3146). Read-only box "DELA connector address" with "Copy" (toast "Address copied"); numbered steps under "In Claude" and "In ChatGPT"; "Connected now" list with "Disconnect" per connection (red; browser confirm pop-up "Disconnect <name>? It stops working with DELA right away. You can connect it again later."; toast "Disconnected"); empty "Nothing connected yet."; when off "Opens soon. You will be able to read and draft your DELA documents from ChatGPT or Claude."
  16. **"Advanced: webhooks"** (switch `member_webhooks`): a closed expandable section (`webhooksCard`, outside range, line 10627; not read).
- States: page loading "Loading..."; load failure shows a red notice with the error text.
- Help: no help tips or glossary terms on this page in these ranges.
- Variations: the firm key card shows only to people who may manage it or who are covered by one. Freelancers get the "New gig alerts" block.
- UX observations: one very long page with up to 16 cards and no tabs or in-page index. The first half is account matters and the second half is technical AI setup. The heading "AI and messages" sits above cards about keys, usage, voice, profile data, connectors and webhooks. "This month" duplicates usage shown on Subscription and Usage. Appearance is duplicated in the account menu. Two destructive actions use browser confirm pop-ups, while the Customize panel uses an in-panel question. "Notices" versus "Notifications" wording.

---

## 9. "Coming soon" pages and fallback (both)

- How to reach it: a menu item or link whose feature switch is off. `sectionSoon()` line 1787, `SECTIONS` line 1791, used in `draw()` line 12243.
- Layout: heading (page name), then a card with a "Coming soon" pill and one sentence.
- Texts:
  - "Delegate": "Start a delegation, answer DELA's questions, and approve a step by step document. This opens in the next DELA update."
  - "Projects": "Your gigs, proposals, signed engagements and milestones will live here."
  - "Talent": "Find available, qualified paralegals, and keep your trusted bench in one place."
  - "Profile": "Profile Builder and Profile Audit, your services, promotions and pitches will live here."
  - "Work": "Matches, invitations, proposals and active projects will live here."
  - "Earnings": "Funded milestones, payouts and your bank transfer status will live here."
  - Attorney, not verified, on Projects or Talent, this sentence is added: " Posting work and hiring need a verified license: open Profile and verification from your account menu."
- Any tab key that matches nothing (and is not a wrong-side page) silently shows Home.
- Interactive elements: none.
- UX observations: dead-end pages with no link onward. "paralegals" here versus "freelancers" elsewhere.

---

## 10. Subscription (both)

- How to reach it: sidebar account group "Subscription", `?tab=subscription`; the limit banner's "View subscription"; Home "Monthly usage" footer. `subscriptionView()` line 12408.
- Purpose and primary focus: see the current plan and usage, compare plans, and go to the Lawfecta website to change or pay. Nothing is charged or changed inside DELA.
- Shown when: new layout, any side.
- Layout: heading "Subscription"; line "Your plan, what you have used, the other plans, and your billing, in one place."; a tab strip (`role="tablist"`, `aria-label` "Subscription sections"); the tab panel.
- Tabs (full label / short label used on narrow screens): "My Subscription" / "Plan"; "Usage & Limits" / "Usage"; "Compare Plans" / "Compare"; "Billing & History" / "Billing". Arrow keys, Home and End move between tabs. The chosen tab is remembered while the page is open (not in the address).
- States: "Loading..."; "Your plan could not be shown right now. Reload the page, or contact the Lawfecta Team from Help."; "Your plan could not be loaded. Reload the page."

### 10.1 Tab "My Subscription"
- Card 1 (eyebrow "Your current plan"): plan name as heading, badge "✓ Current plan", badge "Set by the Lawfecta Team" when staff set it.
  - Facts: "Published price" ("$X a month or $Y a year", "No charge", or "Not one of the standard plans"); "Platform fee on jobs" ("N%" or "See your agreements"); "What you are billed" (amount, "billed monthly", status in brackets; or "No paid membership on record"; or "Could not be loaded just now"; or "Amount not given"); "Next renewal" (date, "No renewal date on record", or "Could not be loaded just now").
  - Note: "The published price is the plan's list price. What you are billed and the renewal date come from the Lawfecta website's billing for your account; DELA never estimates them."
  - Staff-set notice: "The Lawfecta Team set this plan on your DELA account. It can differ from your website membership, and you are billed only what "What you are billed" shows. To change a plan the team set, contact the Lawfecta Team from Help."
  - Trial notice (green): "Your free trial gives you Pro features until <date>. After that you keep everything you made, on your own plan."
  - Buttons: "Manage subscription on the Lawfecta website" (blue link, new tab) and "View billing history" (goes to the Billing tab).
- Card 2 "Your usage at a glance": yellow notice "You are close to one limit: <label>." / "You are close to N limits: a, b."; or "Nothing is near a limit."; or "Nothing on your plan is counted against a limit." Then the DELA actions usage row (see 10.2). Buttons "See all usage and limits" and "Compare plans".

### 10.2 Tab "Usage & Limits"
- Card "Your plan usage":
  - Group heading "Monthly allowances (start again on <date>)" and group heading "Account and capacity limits (these do not reset)".
  - Each usage row: bold label, badge "Nearing the limit" (amber) or "Limit reached" (red), the text ("N of N this month", "N of N saved", "X GB of Y GB used", with ", shared by your firm"), a meter bar (amber at warning level, red at 100%), a grey sentence on what reaching the limit means, and "N remaining" / "X GB remaining" / "No limit on your plan".
  - Row labels for attorneys: "Saved documents", "DELA actions this month", "Storage", plus any other counted plan item (label from the server).
  - "What the limit means" sentences: "At the limit, DELA's AI stops until the reset date. Actions on your own AI key do not count."; "At the limit, new documents cannot be saved. The ones you have stay, and you can still view, export and assign them."; "At the limit, new uploads are refused until you delete files or move to a plan with more space."; "This counts gigs that are open at the same time, not how many you post in a month. Close or fill one to post another."; "At the limit, exports stop until the reset date."; "At the limit, adding another is refused until you remove one or change plan."
  - "Exporting your own documents is not limited and is not counted." (when exports are not counted).
  - Footnote: attorney "Viewing and assigning documents, messaging freelancers, hiring and paying are never limited. Posting a gig is limited only by how many are open at the same time." Freelancer sees only the second sentence.
  - Empty: "Nothing on your plan is counted against a limit."
- Card "What your plan allows": table with caption "Everything on <plan name>", columns "What you get" and "Your plan allows". Cell values: "Included", "Not in your plan", "No cap", a size (MB/GB), "N seat(s) included", "N", "N a month".

### 10.3 Tab "Compare Plans"
- Card "Compare attorney plans" / "Compare freelancer plans". Note: "These are the published prices. A plan change is reviewed here and made on the Lawfecta website, which shows the exact charge before you pay."
- Toggle (`role="radiogroup"`, `aria-label` "Show prices by"): "Monthly", "Annual".
- Notice when the member's plan is not a standard one: "Your plan, <name>, is not one of the standard plans below. To change it, contact the Lawfecta Team from Help."
- A grid of plan boxes. Each: short plan name, badge "✓ Your current plan", price ("$X a month" with small "or $Y a year"; or "$Y a year" with small "About $Z a month, paid once a year"; or "No charge"; small "No annual price for this plan"), "Platform fee on jobs: N%", a bullet list of included features ("<label>", "<label>: no cap", "<label>: N a month", "<label>: <size>"), and either "You are on this plan" or a button "Upgrade to <plan>" (blue) / "Downgrade to <plan>" (ghost). No buttons when the member's plan is not standard.
- Card "Full feature comparison": one wide table (scrolls sideways), caption "Every attorney plan, feature by feature" / "Every freelancer plan, feature by feature". First column "Feature"; one column per plan (the member's marked "(your plan)"). Rows: "Price a month", "Price a year" ("Monthly only" or "No charge" where none), "Platform fee on jobs", then every feature. Cell values: "Not included", "Included", "No cap", a size, "N", "N a month". Footnote: "Need something these plans do not cover? Contact the Lawfecta Team from Help."

### 10.4 Dialog "Review your plan change" (`planChangeReview` line 12381)
- Opened by "Upgrade to ..." or "Downgrade to ...". A modal dialog.
- Content: "Upgrade from <current> to <new>." / "Downgrade from ...". Table with caption "What changes", columns "Item", "Now", "After the change"; rows "Published price", "Platform fee on jobs", and every feature whose value differs.
- Downgrade notice: attorney "On a lower plan, documents above its limit become read-only. Nothing is deleted: you can still view, export and assign them. Open gigs, engagements and payments are not affected." Freelancer "On a lower plan, anything above a lower limit stays, but you cannot add more until you are under it. Engagements and payouts are not affected."
- "Memberships are billed by the Lawfecta website, not by DELA. The website shows the date the change starts, the exact charge and any credit for unused time before you confirm there. Nothing is charged by continuing from here."
- Staff-set notice: "Your DELA plan was set by the Lawfecta Team. Changing your website membership may not change it. To change this plan, contact the Lawfecta Team from Help."
- "After you finish on the website, come back and reload this page to see your plan."
- Buttons: "Continue to the Lawfecta website" (blue link, new tab; also closes the dialog) and "Cancel". Escape closes.

### 10.5 Tab "Billing & History"
- Card "Your membership billing". Note: "Memberships are billed by the Lawfecta website. This is what the website has on record for your account. DELA never charges your card for a membership."
  - Facts: "Status", "Billing interval", "Amount", "Next renewal", "Member since" ("Not given" / "No renewal date on record" where missing).
  - Sub-heading "Invoices": table with caption "Your most recent invoices from the Lawfecta website"; columns "Date", "Invoice", "For", "Amount", "Status" (status text plus " on <date>" when paid, or ", due <date>" when unpaid). Empty: "No invoices on record."
  - States: "Your billing details could not be loaded just now. Try again in a minute, or open the Lawfecta website."; "The Lawfecta website has no paid membership and no invoices on record for your account." plus, when staff set the plan, " Your plan was set by the Lawfecta Team, so nothing is billed for it here."
- Card "Manage your membership": "Changing plan, changing your card and renewing happen on the Lawfecta website. It opens in a new tab; when you come back, reload this page." Buttons: "Manage subscription on the Lawfecta website", "Compare plans first", "Contact the Lawfecta Team" (opens Help). Note: "To cancel your membership or ask about a charge, contact the Lawfecta Team: open Help in the menu, then "Contact the Lawfecta Team"."

- Help: no help tips or glossary terms on this page.
- Accessibility: proper tablist with arrow keys; meters with `aria-valuetext`; tables with captions and row/column headers; wide tables in a horizontal scroll box.
- UX observations: the member cannot change plan, pay, download an invoice or cancel here; every path ends on the website or with "contact the Lawfecta Team from Help". The member must reload the page by hand after a change. Invoices are not links. "Compare plans" is reachable from three places. Three price sources ("Published price", "What you are billed", invoices) need careful explanation, which the page does with long notes.

---

## 11. Usage (attorney)

- How to reach it: the small footer link "DELA actions: N of N this month" at the bottom of attorney pages; `?tab=usage`; the website path `/account/usage`. No menu item. `usageView()` line 12571.
- Purpose: the attorney's three limits on one card. Older page; Subscription, "Usage & Limits" covers the same ground.
- Shown when: attorney. A freelancer opening `?tab=usage` gets the wrong-side page.
- Layout: heading "Usage". One card: heading "Your plan: <plan>" with a button "Upgrade to <next plan>" or "Upgrade" (link to the website). Three rows with a bar each: "DELA actions this month" (glossary term `dela_actions`), "Saved documents" (glossary term `read_only` when some documents are locked), "Storage"; text "N of N this month", "N of N saved", "X GB of Y GB used", or "(no limit ...)".
- Note: "DELA actions reset on <date>. A larger task, such as drafting a whole document, uses more than a short answer. Actions on your own AI key do not count. Viewing, exporting and assigning documents, messaging freelancers, posting gigs, hiring and paying are never limited."
- Locked documents notice: "🔒 N document is / documents are read-only because your plan saves fewer documents. You can still view, export and assign them. Upgrade to edit them, or archive others to make room."
- States: "Loading..."; "Usage is shown for the attorney workspace."
- Related dialog "Limit reached" (`limitPopup` line 12590), opened from other pages when an action hits a limit. Texts: "You've saved N of N documents on <plan>. Upgrade to <next> to save more."; "This document is read-only on your plan. Upgrade to edit it. You can still view, export and assign it."; "Your storage is full. Delete files or upgrade for more space."; "You've used this month's DELA actions. They reset on <date>, or upgrade for more." Buttons: "Upgrade to <plan>" / "Upgrade" and "Not now".
- UX observations: duplicates Subscription. The upgrade button here goes straight to the website, skipping the "Review your plan change" dialog. This is one of the few places in these ranges that uses glossary terms.

---

## 12. Notifications panel (from the bell) (both)

- How to reach it: the bell in the top bar. `openNotices()` line 12717.
- Purpose and primary focus: at most six things: what needs the member first, then the newest update per job.
- Layout (right side drawer, `aria-label` "Notifications"), top to bottom:
  1. "Close" button; heading "Notifications" with a badge "N unread".
  2. Heading "Needs your action" with "N pending" at the right. Up to 2 rows: a sentence and a button. If more: full-width button "See all N pending actions →" (opens the Notifications page on "Needs action").
     - Sentences and buttons (`liveActions`, outside range, line 5665): "<gig>: N question(s) to answer" / "Answer"; "<gig>: N proposal(s) to review" / "Review proposals"; "<gig>: the agreement needs your signature" / "Open the agreement"; "<gig>: a delivery waits for your review" / "Review the delivery"; "<gig>: the next milestone waits for payment" / "Open the payment".
     - Loading: "Checking your work...". Empty: "Nothing waits on you right now." plus, for attorneys, link "Open Projects". Partial failure: "DELA could not check all your work just now, so something may still wait on you." with link "Open Projects" / "Open Work".
  3. Heading "Recent updates". A list, one entry per job (newest first), 4 to 6 entries depending on how many actions show. Each: bold title, green "New" badge when unread, body text, date and time, a link button (label from the list in section 13), and, when the job has older ones, "View N earlier update(s) for this job →" (opens the Notifications page filtered to that job). Empty: "Nothing yet. Updates about your work will show up here."
  4. Bottom row: link "Mark all read" (marks everything read, closes the panel, refreshes) and blue button "View all notifications →".
- States: "Loading..."; "Notifications could not load."
- UX observations: "Needs your action" here, "Needs your attention" on Home, and the "Needs action" filter on the page are three names for the same idea, and they are built from two different sources (Home uses the server's home list; the panel and page use live gig and engagement lists), so counts can differ.

---

## 13. Notifications page (both)

- How to reach it: sidebar "Notifications", `?tab=notices`; "View all notifications →" in the panel and on Home. `noticesView()` line 12773.
- Purpose and primary focus: the whole history, with filters, search, a time range, and marking or dismissing several at once.
- Layout, top to bottom:
  1. Heading "Notifications"; line "Review updates, take action and manage your notifications."
  2. Filter pills (`role="tablist"`, `aria-label` "Notifications to show"): "All (N)", "Needs action (N)", "Unread (N)", "Updates", "Payments", "Disputes", "Meetings", "Messages", "Dismissed (N)" (the last only when there are dismissed ones).
  3. Row: label "Search notifications" with a search box (placeholder "Search notifications (for example a job, a freelancer or a dispute)") and a dropdown (`aria-label` "Time range"): "All time", "Last 7 days", "Last 30 days", "Last 90 days".
  4. One-job bar (when filtered to a job): "Showing the history of one job: <title>. " with link "Show all jobs".
  5. Bulk row: checkbox with "N selected" (selects everything shown), buttons "Mark as read" and "Dismiss" (or "Restore" on the Dismissed filter), all disabled until something is selected; at the right "Sort " with a dropdown (`aria-label` "Sort"): "Most recent", "Oldest first".
  6. The list. Each row: checkbox (`aria-label` "Select: <title>"), unread dot, title and body, a category tag, date and time, one action button, and a "⋯" menu (`aria-label` "More for: <title>").
  7. Footer: "Showing N of N notification(s)." plus " Older ones are kept; the newest N are listed." when the server holds more; button "Show more notifications" (25 more each time).
- Category tags (worked out from the title and kind): "Needs action", "Dispute", "Payment", "Meeting", "Message", "Update", "Dismissed".
- Row action button labels: "Review and sign" (title mentions a signature), "Review proposals", "View invitation", "Write review", "View payment", "View details" (disputes), otherwise by destination: "Open the agreement", "Open the gig", "Open the document", "Open the meeting", "Open the conversation", "Open the bench agreement", "Open Settings", "Open Home", "Open Projects", "Open Work", "Open the Library", "Open Files", "Open Talent", "Open Inbox", "Open Meetings", "Open your profile", "Open Earnings", "Open Agency", "Open Ask DELA", "Open Get set up", "Open the connection page". The button is blue for "Needs action" rows and ghost otherwise. Clicking marks the notification read and follows its link (a full page load to the new address).
- "⋯" menu items: "Mark as read" / "Mark as unread"; "Dismiss" / "Restore"; "Show this job's history". Escape closes the menu.
- "Needs action" filter: a different list, with no checkboxes, no bulk row, no search effect: each row is a sentence, the tag "Needs action" and a blue button (same sentences and buttons as the panel, section 12). These cannot be dismissed; they leave when the task is done.
- States: "Loading..."; empty "Nothing here yet." / "Nothing dismissed." / "Nothing waits on you right now." / "No notification matches "<words>". Try fewer words or another filter."; partial failure "DELA could not check all your work just now, so something may still wait on you."
- Toasts: "Marked as read."; "Marked as unread."; "Dismissed. They stay in your history under "Dismissed"." / "Dismissed. It stays in your history under "Dismissed"."; "Restored."; "That did not work. Please try again."; "That did not work. Check your connection and try again."
- Accessibility: a live region announces the result count after a filter or search ("N notifications", "N waiting on you"); unread rows carry hidden text " (unread)"; the bell count updates as items are read or dismissed.
- UX observations: seven columns per row (checkbox, dot, text, tag, date, button, menu) is dense, especially on a phone. Nine filter pills. Search, range and sort do nothing on the "Needs action" filter but stay on screen. The sort dropdown sits in the bulk action row, away from the time range dropdown. Categories are guessed from words in the title (for example "paid", "refund", "dispute"), so tags can be wrong. There is no "Mark all read" on this page (only in the panel) and no link to notification settings.

---

## 14. Wrong-side page (both)

- How to reach it: a link to a page of the other side. `wrongSideTab()` line 12609, `wrongSideView()` line 12614.
- Shown when: attorney opens `work`, `earnings`, `agency` or `ask`; freelancer opens `files`, `setup`, `delegate`, `record` or `usage`, or (when not a hiring agency) `library`, `projects` or `talent`.
- Layout: one card. Heading "This page is for freelancers" / "This page is for attorneys". Text: "This page is on the <other> workspace of DELA. You are signed in as an attorney (<name>)." / "... as a freelancer (<name>)." then " Switch workspaces to open it." (member holds both sides) or " To use it, sign out and sign in with your <other> account."
- Buttons: "Switch to the freelancer workspace" / "Switch to the attorney workspace" (blue; only with both sides; note: it lands on Home of the other side, not on the page that was asked for) and "Go to Home" (clears `tab` from the address).
- UX observations: after switching, the member is not taken to the page the link pointed at.

---

## 15. Deep links (URL parameters)

Read at page load (lines 12879 to 12900, plus the lines noted).
- `?tab=<key>` (lowercase letters only): opens that page. Keys handled by `draw()`: `home`, `delegate` (attorney Ask DELA), `ask` (freelancer Ask DELA), `library`, `record` (attorney; opens the Library with "Record a process" started), `files`, `projects`, `talent`, `setup`, `profile`, `work`, `earnings`, `agency`, `inbox`, `meetings`, `notices`, `subscription`, `help`, `ai` (Settings), `usage` (attorney), `connect`.
- Path containing `/account/usage`: opens the Usage page.
- `?tab=library&pb=<document id>`: opens that document in reading view.
- `?tab=talent&person=<person id>`: opens that person's profile in Talent.
- `?past_review=<token>`: opens the past-review page without the app shell.
- Read elsewhere in the file (outside these ranges, noted for completeness): `gig=<id>` (line 4934) opens a gig; `view=` is one of `details`, `matches`, `questions`, `proposals`, `files`, `agreement` for a gig (line 8790), or `bench` / `bookmarks` for Talent (line 6637); `thread=<id>` and `meeting=<id>` (lines 7808, 7809) open a conversation or a meeting; `paid=1` (line 8790) marks a return from payment; `payout=` (line 10302) on Earnings; `bench=` is carried by notification links.
- The address is rewritten to `?tab=<key>` whenever the page changes, and `gig`, `view`, `pb`, `thread`, `meeting`, `person` are removed, so a reload stays on the same page but not on the same item.
- Not in the address: the Subscription tab, the Notifications filter and search, the Home view ("My work" / "My agency"), the Settings section.
- Notification links are stored as `/dela?tab=...&gig=...&view=...` and are rewritten onto the current page's address, keeping the website's own parameters.

---

## 16. Old layout, not part of the new design (for reference only)

Still in the code for members without the `new_layout` switch: old top bar (`header`, line 91, brand reads "DELA"), old tab strip (`nav`, line 468), old Home pages `attorneyHome` (line 1699; greeting "Good morning/afternoon/evening, <name>", hero "AI Delegation Center", "Plan. Delegate. Get it done.", stat tiles, "Verification" card, "What DELA will do for you" list with "Coming soon" pills, plan table) and `freelancerHome` (line 1744; hero "Match readiness", "Your match checklist"), the "DELA guide" card (`guideBox`, line 1615; "Pause", "Open the guide", "Ask", "New gig alerts", "See all setup steps"), `planCard` (line 488), the yellow `usageBanner` (line 12280). In the old layout the Settings page is titled "AI settings" and Help and Subscription do not exist. `statusLine` (line 721) and `planLine` (line 736) are defined but not called anywhere.

---

## Cross-page elements seen

- **Card** (`.card`, `hcard`): white box with an h2 title; on Home the title row can hold a count badge, a period dropdown or a link.
- **Home row** (`hrow`): dot, title, sub lines, flag, badge, action words, chevron; the whole row is one button. Also used on Help.
- **Number tile** (`hstat`): big number, label, small note; a button. Some agency tiles reuse the look but are not clickable.
- **Badges**: tones `ready` (green), `held` (amber/neutral), `bad` (red), `pink` (counts), `stage` ("Test site"), `G` ("New").
- **Shared status words**: "Overdue"; engagement: "Waiting for signatures", "Waiting for the first payment", "In progress", "Paused", "In dispute", "Awaiting your review"; proposal: "Draft", "Sent", "Being checked", "Withdrawn", "Chosen", "Not chosen", "Closed"; standing arrangement: "Waiting for the freelancer", "Active", "Needs review", "Ending after open jobs", "Ended", "Declined"; verification: "Verified", "Review pending", "Not submitted", "Action needed"; availability: "Available", "Some hours only", "Not taking work", "Not confirmed yet", "Out of date"; limits: "Nearing the limit", "Limit reached"; readiness (profile): "Not complete", "Waiting for a check", "Ready", "Availability out of date", "Not taking work", "Paused".
- **Notices** (`.notice`): plain, `ok` (green), `warn` (yellow), `bad` (red), `info` (blue, dismissible sensitive data notice).
- **Toasts** (`D.toast`): short confirmation ("Saved") or error (red).
- **Drawer** (`showDrawer`): right side panel with backdrop and a pinned "Close"; used by Notifications and Customize dashboard.
- **Modal** (`modal`, line 11915): centered dialog with title, body and a button row; Escape closes; used by "Review your plan change" and "Limit reached".
- **Browser pop-ups** (`confirm`): removing an AI key, disconnecting a connector, signing out with an unfinished recording.
- **Period dropdown**: "This month", "This quarter", "This year" (three Home widgets).
- **Pills** (`.pills`): Appearance choice, Notifications filters.
- **Tabs**: Subscription tablist with full and short labels.
- **Usage bar / meter / ring**: brand color, amber at the warning level (default 80%), red at 100%.
- **Loading and retry pattern**: "Loading..." then "This could not load just now. Try again".
- **"Coming soon" pill** and "Opens soon." wording for features behind a switch.
- **Footer links ending in " →"** on Home widgets and notification buttons.
- **Money** always through `D.money` (cents), dates through `D.date` / `D.dateTime`.
- **Glossary terms** (`D.term`): only on the Usage page in these ranges (`dela_actions`, `read_only`). No `D.helpTip` is used in these ranges.
- **Phone rule**: 900px is the break between sidebar and bottom bar.

---

# PART B

# Inventory B: Ask DELA, Settings (top part), Profile, Connect, Client card, Files

Source: `app/dela-app.js`, lines 1855 to 2215 and 2428 to 3419 (helpers outside the range were read only to resolve labels, and are cited with their line).
All labels in quotes are copied from the code. "unclear from code" marks anything the code does not settle.

Routing facts used below (line 12224 to 12233, outside my range, read to confirm):
- `tab === "delegate"` or `"ask"` opens Ask DELA only when switch `ai_generation` is on.
- `tab === "files"` opens Files only for the attorney side with switch `file_uploads` on.
- `tab === "connect"` opens the Connect page for anyone with a side.
- `tab === "profile"` opens Profile only when switch `profiles` is on.
- The page-wide client information notice (`me.notice`) shows above Ask DELA and Connect; it is deliberately NOT shown above Files, Profile or Settings (line 12214).

---

## Ask DELA (both)

- How to reach it: menu item "Ask DELA". Attorney tab key `?tab=delegate`; freelancer tab key `?tab=ask`. Also from Home ("Open Ask DELA", "Ask DELA to plan a task", "What can I delegate?"), from Help, and from the Files page row button "Ask DELA" (opens with that file already attached). Functions `chatView()` line 1855, `drawChat()` line 1890, `composer()` line 1949.
- Purpose and primary focus: a chat with DELA's AI. The ONE main thing: type (or speak) a request and press "Send".
- Shown when: switch `ai_generation` on. File attaching only for attorney side with switch `file_uploads` on. The "● Talk" button only when the server says voice is on (`ai.voice_on`) and the browser supports the microphone.
- Layout, top to bottom:
  1. Header row: heading "Ask DELA" (h1), then two small ghost buttons on the right: "New chat" and a button labelled with the settings page name ("Settings" in the new layout).
  2. Intro line (muted). Attorney: "Describe a task you want to hand off, ask for a checklist, or attach a process write-up and ask DELA to turn it into an SOP. " followed by the credits line. Freelancer: "Plan your work, draft a checklist or tidy a process. " followed by the credits line.
  3. Earlier chats row (only when the member has at least one earlier chat): a dropdown, then for the open chat either the text "Saved to your library" or the button "Save to library", then "Delete this chat".
  4. Auto-delete line for the open unsaved chat, and a notice listing chats due to be deleted soon (both conditional).
  5. For a NEW chat (no messages): the composer comes first, then any problem box, then the message list holding only the example card. For a chat WITH messages: the message list, then any problem box, then the composer at the bottom.
  6. Composer (class "composer"), in order: sensitive data reminder line; attached file chips and the file picker (attorney, when open); the message text box; the "✦ Improve my request" helper row with its cost note; a button row: "● Talk", checkbox "Send when I stop talking", "Add a file" / "Close files", a status text, and "Send" on the right; then (when voice is on but the browser cannot record) a small line about microphone support.
- Content and data shown:
  - Credits line (`creditsLine()` line 1879), one of: "Using your <OpenAI or Claude> key ending <last4>." / "You chose your own key, but none is saved yet." / "Using Lawfecta's AI." / "Using Lawfecta's AI: <n> of <limit> included DELA actions left this month."
  - Message bubbles: user and assistant bubbles with plain text. Under a bubble: "Files: <names>" when files were attached. Under an assistant bubble, the source: "Answered with Lawfecta's AI" / "Answered with your firm's key" / "Answered with your own key".
  - A pending user message shows as a user bubble while sending, followed by an assistant-style placeholder "DELA is checking your message, then answering...".
  - Extra assistant note after long attachments: "Note: the attached files were long, so DELA read only the first part of them."
  - Earlier chats dropdown options: each "<title> (<date>)"; a chat title is the first 60 characters of its first message.
- Interactive elements:
  - "New chat" (button): clears the open chat, messages, problem box, attached files.
  - "Settings" (button; label is "AI settings" in the old layout): goes to tab `ai`.
  - Dropdown, aria-label "Earlier chats": first option "Open an earlier chat" (no chat open) or "Switch to another chat" (a chat open); then one option per earlier chat. Choosing one opens it.
  - "Save to library" (button, only on an open, unsaved chat): saves the chat; toast "Saved. This chat is kept until you delete it."; the button is replaced by the text "Saved to your library".
  - "Delete this chat" (button): replaces the row inline with the text "Delete this chat for good? This cannot be undone." plus "Cancel" and a red "Yes, delete". No browser pop-up. Success toast "Chat deleted".
  - Example card (new chat only): text 'Example: "Turn my notes on opening a new matter into a step by step checklist a paralegal can follow."' and button "Use this example" (puts the example into the message box and focuses it).
  - Message box: textarea, aria-label "Your message", placeholder "Type here, or press Talk and say it", max 8000 characters. Ctrl+Enter or Cmd+Enter sends.
  - "✦ Improve my request" (AI helper button, shown only when the helpers feature is on, `helperButton` line 5708): beside it the note "Uses <n> DELA action(s) on Lawfecta's AI (none on your own key)." While running the button reads "DELA is checking...". Results open in a soft panel below with an AI label, a "Dismiss" button, and a list of findings; each finding can have "Use suggestion", "Edit" and "Dismiss"; with more than one usable suggestion a "Use all suggestions" button appears; with no findings: "DELA found nothing to flag." Using a suggestion toasts "Added to your message. Nothing is sent until you click Send." If the text looks like client information, a browser OK/Cancel pop-up (confirm) appears: "This may include client information (<kinds>). Use placeholders instead. Click OK only if it is not client information." (or the server's own wording).
  - "● Talk" (button, class "mic", aria-pressed): starts recording; label changes to "■ Stop"; press again to stop. Recording stops by itself at the maximum (server value, default 120 seconds). The words are transcribed and appended to the message box.
  - Checkbox "Send when I stop talking" (remembered in the browser): when ticked, recording stops after about two seconds of quiet following speech, and the transcribed message is sent automatically.
  - "Add a file" / "Close files" (attorney with `file_uploads`): toggles the file picker. The picker is a list of checkboxes, one per ready file from the Files page (label = file name). Files saved from a job are never listed. If there are no ready files: "No files ready yet. Upload process documents on the Files page, then attach them here."
  - Attached file chips: file name plus a "×" button (aria-label "Remove <name>").
  - "Send" (blue button): disabled and labelled "Sending..." while busy.
  - Problem box buttons (see States): "Edit my message", "Continue", "Send anyway", "Send anyway, it has no client information", "Try again", "Fix my key", "Use Lawfecta's DELA actions this time", "Add my own key".
- States:
  - Loading: "Loading...". Load error: red notice with the error text.
  - While sending: user bubble plus "DELA is checking your message, then answering...".
  - Attach limit reached: toast "Attach up to 5 files at a time." (error text `too_many_files`; the actual limit comes from the server setting `chat_attach_max`).
  - Unsaved chat: "Unsaved chats are deleted after a set time without use. This one will be deleted on <date> unless you save it."
  - Chats due soon (notice, role status): "<n> chat is / chats are due to be deleted soon: <title (date)>, .... Open a chat and click "Save to library" to keep it."
  - Problem box (role alert, `problemBox()` line 2044), by reason:
    - Sensitive data: the server's message (or the standard sensitive data error text); only "Edit my message". There is no way to send anyway.
    - Looks like client information: "This message may include <kinds>. Confidential client information does not belong in DELA. Please replace names and numbers with placeholders such as [Client Name] or [Case Number]." (or the server's own note). Buttons "Edit my message" and one of "Continue" (AI-based reminder; then remembered for this conversation), "Send anyway" (rule-based), or "Send anyway, it has no client information" (older wording).
    - Own key failed: "Your <OpenAI or Claude> key did not work: <problem> Nothing was sent with Lawfecta's key." Buttons "Try again", "Fix my key", and (unless backup credits are off) the blue "Use Lawfecta's DELA actions this time".
    - Lawfecta AI failed: "DELA's AI could not answer: <problem> No DELA actions were used." Button "Try again".
    - No key saved or key unreadable: standard error text; buttons "Fix my key" and "Use Lawfecta's DELA actions this time".
    - No credits left: standard error text; blue button "Add my own key". For attorneys a "Limit reached" pop-up dialog also opens once (text: "You've used this month's DELA actions. They reset on <date>, or upgrade for more."; buttons: an upgrade button and "Not now").
    - Anything else: standard error text; "Try again".
    - Key problem wordings (`KEY_PROBLEM` line 1815): "the provider did not accept the key. It may have been deleted or typed wrong." / "your account with the provider is out of credit or has no billing set up." / "the provider is busy with too many requests on this key. Wait a minute and try again." / "the provider is not answering right now. Try again in a few minutes." / "this key cannot use the AI model DELA asked for." / "the AI declined to answer this request." / "the message and files are too long for one answer. Attach fewer files or ask about one part." / "the provider could not handle this request."
  - Voice status texts (beside "Send"): "Listening... <n>s (stops at <max>s)"; "No sound was recorded. Check your microphone."; "Turning your words into text..."; "Done. (Claude keys cannot turn speech into text, so Lawfecta's speech to text was used.)"; "Your browser blocked the microphone. Click the icon left of the web address, allow the microphone for this site, then press Talk again. On a Mac, also check System Settings, Privacy and Security, Microphone."; "No microphone was found. You can type instead."; "Your key could not turn speech into text: <problem> You can type instead."; "Speech to text did not work: <problem> You can type instead."; "That recording was too long. Keep each one under <max> seconds."; "Talking uses your included DELA actions, and they are used up this month. You can type instead."
  - Voice on but browser unsupported: "Talking needs a browser with microphone support. You can type instead."
- Help: composer reminder line (role note): "Never enter sensitive data: SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords. Keep it in your own storage. You are responsible for what you enter." No "?" help tips on this page.
- Variations: attorney intro text and file attaching versus freelancer (no files). Source label under answers differs by whose key answered. The page-wide client information notice shows above this page.
- Mobile/accessibility notes: the message list is `aria-live="polite"`; problem box `role="alert"`; status texts `role="status"`; Talk button uses `aria-pressed`; chip remove buttons have aria-labels; Ctrl/Cmd+Enter sends (plain Enter makes a new line).
- UX observations (mine):
  - The composer sits at the top for a new chat and at the bottom once the chat has messages, so its position jumps after the first send.
  - The earlier-chats control is a plain dropdown with no search; long histories will be hard to scan.
  - "Save to library" here means keeping the chat, while "Library" elsewhere is the document library. The wording may confuse.
  - Three AI-related affordances crowd the composer: "✦ Improve my request", "● Talk" and "Send", plus a cost note line. Hierarchy between them is weak.
  - The whole view is redrawn on many clicks (attach, pick a file); typed text is kept, but focus is lost.
  - There is no visible keyboard hint for Ctrl+Enter.

---

## Settings: top cards "Account", "Appearance", "Suggestions and alerts" (both)

- How to reach it: menu item "Settings" (tab key `?tab=ai`). `settingsTop()` line 2167 builds the first cards of the Settings page in the new layout; the heading "AI and messages" and the AI cards follow it (outside my range). Deep links can jump to `set-account` or `set-alerts`.
- Purpose and primary focus: personal settings that are not about AI: account details, light or dark look, and whether DELA suggests next steps and sends gig alerts.
- Shown when: new layout only. "Appearance" card only when `me.appearance.on`. "Suggestions and alerts" card only with switch `onboarding_widget`. The "New gig alerts" block only for freelancers when the server says alerts are on.
- Layout, top to bottom:
  1. Account card (shared component `D.accountCard(me)`; contents are in shared/dela-core.js, outside my range).
  2. Card "Appearance": "How DELA looks for you, on every device you sign in on." then a pill group.
  3. Card "Suggestions and alerts": a sentence, a pause button, and for freelancers the sub-heading "New gig alerts" with three checkboxes.
  4. The "Emails" card (`emailsCard()`, line 8755, outside my range).
- Interactive elements:
  - Appearance pills (group aria-label "Appearance", each with aria-pressed): "Match my device", "Light", "Dark". Saves at once; toast "Appearance: <choice>".
  - "Pause suggestions" / "Resume suggestions" (button): toggles DELA's suggestions on Home.
  - Checkboxes under "New gig alerts": "On Home", "By email", "In Notices". Each saves at once; toast "Saved"; on failure the box flips back with toast "Not saved. Try again."
- States:
  - Loading: "Loading...". Feature not on for the member: "Nothing to set here yet." Load failure: "These settings could not load. Reload the page to try again."
  - Not paused: "DELA suggests your next step on Home. Pausing hides the suggestions for a day." Paused: "DELA's suggestions on Home are paused. They come back tomorrow, or sooner when something new needs you."
  - Gig alerts intro: "When a gig that fits you is posted, DELA can tell you on Home, by email and in Notices. Turn off any of them."
  - Notice when reminder emails are off: "Reminder and alert emails are off, so gig alerts are not emailed. Turn them on in the card "Emails" below."
- Help: none.
- Variations: gig alerts block is freelancer only.
- Mobile/accessibility notes: jumping to the account card moves keyboard focus to its heading.
- UX observations (mine): the wording mixes "Notices" (here) and "Notifications" (menu item) for the same place. The "By email" checkbox can be on while emails are globally off; a notice explains it, but the control does not disable.

---

## Profile ("Profile and verification" for attorneys, "Profile" for freelancers) (both)

- How to reach it: account menu item "Profile and verification" (attorney) or "Profile" (freelancer); freelancer main menu "Profile"; tab key `?tab=profile`. Also from Home and Get set up buttons ("Open your profile", "Finish your profile", "Set up your profile and verification", "Update my profile", "View my reviews"). An attorney arriving from the license confirmation email lands here with `?confirm=<token>`. Functions `profileView()` line 2428, `drawProfile()` line 2500.
- Purpose and primary focus: fill in the member's DELA profile and pass the Lawfecta Team's check so the member becomes "Ready". The ONE main thing: complete the required items and click Save.
- Shown when: switch `profiles` on. Each side sees its own profile.
- Layout, top to bottom:
  1. Heading "Profile and verification" (attorney) or "Profile" (freelancer).
  2. Intro: "This is your <side> profile. Your Lawfecta directory listing is your public profile; DELA keeps them in step when you choose."
  3. Section pills (nav, aria-label "Profile sections"). Attorney: "Firm details", "License verification", "Your profile", and "Document preferences" (switch `document_standard`). Freelancer: "Availability", "LinkedIn check", "Your profile". Each scrolls to its card and focuses its first control.
  4. Readiness card (see its own section below).
  5. Attorney: "Firm details" card. Freelancer: "Your availability" card, then "Your availability for meetings" card (switch `meetings`).
  6. Attorney: "License verification" card. Freelancer: "LinkedIn check" card.
  7. "Your profile" card (the long form).
  8. Freelancer: "Profile documents" card (only when the server setting `documents_on` is on).
  9. Attorney: "Document preferences" block (switch `document_standard`; the form itself, `firmProfileForm`, is outside my range), then one extra "Firm details for <name> (you are firm staff)" card for each firm the attorney is staff of.
  10. "Your reviews" card (switch `reviews`; see below).
- States for the page: loading "Loading..."; load failure shows a notice with the error text. Coming from the license email: toast "Email confirmed. The Lawfecta Team will finish the check." or the error text. When another card reloads the page data (availability, license, LinkedIn), unsaved typing in the form is kept.
- UX observations (mine): this is one very long page with up to nine cards and four separate save actions ("Save firm details", "Save availability", the profile "Save", and instant-save buttons). The section pills do not list every card (meetings availability, profile documents, reviews and readiness have no pill). There is no sticky save bar and no unsaved-changes warning visible in this code.

### Readiness card: "Match-ready" / "Ready to post and hire" (both)

- How to reach it: top of the Profile page. `statusCard()` line 2549, `readinessSteps()` line 2534.
- Purpose and primary focus: show how many steps are left before the member is ready, and jump to each missing item.
- Layout, top to bottom:
  1. Heading "<goal>: <done> of <total> steps done", where goal is "Ready to post and hire" (attorney) or "Match-ready" (freelancer), with a status badge on the right.
  2. Progress bar (turns green when ready).
  3. One sentence: paused wording, ready wording, "One step to go." or "<n> steps to go."
  4. Freelancer only: a green or red notice that starts "Attorneys can see you in Talent now." or "Attorneys cannot see you in Talent yet."
  5. Expandable explainer: "What "ready to post and hire" means" (attorney) or "What "match-ready" means" (freelancer).
  6. Step groups with counts: "1. Your profile (<d> of <n>)", "2. The Lawfecta Team's check (<d> of <n>)", and for freelancers "3. Your availability (<d> of <n>)". Each is a checklist; each undone item has a link-style action.
  7. Attorney, not verified: "You can use Ask DELA, documents, files and the recorder before you are verified. Posting work and hiring need a verified license."
  8. Attorney, firm items missing: notice "Still needed before paid work: <items>. " with the link "Go to Firm details". Items: "Billing address", "Who may sign for the firm", "Email for formal notices".
- Content and data shown:
  - Status badge words (`STATE_BADGE` line 2361): "Not complete" (incomplete), "Waiting for a check" (verification_pending), "Ready" (match_ready), "Availability out of date" (availability_stale), "Not taking work" (unavailable), "Paused" (restricted).
  - Ready sentence (`READY_WORDS` line 2357). Attorney ready: "You are verified. You can post work and hire on DELA." Attorney paused: "Some actions are paused on your account. Contact the Lawfecta Team." Freelancer ready: "You are match-ready. Attorneys can find and invite you." Freelancer paused: "Matching is paused on your account. Contact the Lawfecta Team."
  - Profile steps: one per required item; the labels come from the server (`prof.data.labels`), so the exact words are unclear from code.
  - Check step label: "Bar license verified by the Lawfecta Team" (attorney) or "LinkedIn check passed by the Lawfecta Team" (freelancer). Notes: "Being checked by the Lawfecta Team. Nothing for you to do right now." / "The last check did not pass. Open it to see why and try again." / "The check is out of date. Renew it."
  - Availability step (freelancer): "Availability confirmed in the last <n> days" (default 14). Notes: "You are marked "Not taking new work", so attorneys do not see you." / "Your last confirmation is older than <n> days." / "Good until <date>."
  - Freelancer Talent notice, ready: "Attorneys can see you in Talent now. Your picture, headline and summary show on your Talent card." Not ready: "Attorneys cannot see you in Talent yet." then "The Lawfecta Team has paused matching on your account." or "Reason: <reasons>." or "Finish the steps below.", then "Everything you save here, your picture included, is kept and shows to attorneys as soon as you are match-ready." Reasons: "1 required profile item is still empty (<label>)" / "<n> required profile items are still empty"; "the Lawfecta Team is still doing your LinkedIn check" / "the Lawfecta Team's LinkedIn check has not passed yet"; "you are marked "Not taking new work"" / "your availability is not confirmed".
  - Explainer text, attorney: "You can post gigs, contact freelancers and hire when two things are true: every required profile item is filled, and the Lawfecta Team has verified your bar license. Until then you can still use Ask DELA, documents, files and the recorder." Freelancer: "Attorneys can find you on Talent, see you in gig matches and invite you only while you are match-ready. That takes three things: every required profile item is filled, the Lawfecta Team's check has passed, and you confirmed in the last <n> days that you can take work. If any one lapses, you drop out of Talent until it is fixed. Work you already have is not affected."
- Interactive elements:
  - Expandable summary (details): "What "ready to post and hire" means" / "What "match-ready" means".
  - Per undone step, a link-style button: "Add it" (profile items), "Start the license check" or "Start the LinkedIn check" (no button while the check is pending), "Confirm it" (availability). Each scrolls to the right card, opens it if folded, and focuses its first control.
  - "Go to Firm details" (link-style button, attorney).
- Mobile/accessibility notes: progress bar has `role="progressbar"` with value text "<done> of <total> steps done"; each step has screen-reader text " (done)" or " (not done yet)"; action buttons have aria-labels "<action>: <step>".
- UX observations (mine): the freelancer card states the same thing up to four ways (badge, sentence, Talent notice, checklist). The firm-missing notice repeats inside the Firm details card as "Still needed for paid work: ...".

### "Firm details" card (attorney)

- How to reach it: Profile page, first card after readiness; pill "Firm details". `firmCard()` line 3019. A second copy titled "Firm details for <name> (you are firm staff)" appears near the bottom for each firm the member is staff of.
- Purpose and primary focus: record what the firm needs before its first paid engagement, and its logo.
- Layout, top to bottom: heading "Firm details"; "Needed before your first paid engagement: the billing address, who may sign for the firm, and an email for formal notices."; logo row; "Still needed for paid work: <items>." (when anything is missing); seven fields; "Save firm details"; then, for the firm owner with team members, the sub-heading "Firm staff" and a list.
- Interactive elements:
  - Logo: image or a placeholder reading "Logo". Buttons "Add a logo" / "Change logo" (opens a file chooser, PNG or JPG; aria-label "Choose a firm logo") and "Remove logo". The logo saves the moment it is chosen: toast "Logo saved. Nothing else to click."; removing toasts "Logo removed". Hint: "PNG or JPG. A square or wide logo on a plain background works best." Status text: "Your firm's logo. Freelancers see it next to your firm's name on gigs, conversations and engagements." or "No logo yet. Freelancers see your firm's name only."; "Uploading..." while sending; errors replace the status text.
  - Text boxes (each with a "?" help icon that has no specific tip text): "Firm's legal name", "Firm website", "Billing address" (3-row text area), "Who may sign for the firm", "Their title", "Email for formal notices" (email type), "Firm phone".
  - "Save firm details" (blue): toast "Firm details saved"; errors show under the button.
  - Firm staff list (owner only): each row "<name> (<member id>)" plus ": firm staff" when named; button "Make firm staff" or red "Remove as firm staff". Toasts "Named firm staff" / "No longer firm staff". No confirm step.
- States: when the member may not edit, all boxes are disabled, logo buttons are hidden, and the text reads "The firm owner or firm staff can change these."
- Help: firm staff intro: "Firm staff can set up the firm's details for you. You can name firm staff once your license is verified. Add people to your team first in Library, Team."
- Variations: owner sees the staff list; staff see the same card for the other firm; read-only for others.
- UX observations (mine): no field is marked required even though three are required for paid work. The staff list shows a raw member ID next to the name. The logo saves instantly while the fields need a button, which is inconsistent within one card.

### "Your availability" card (freelancer)

- How to reach it: Profile page; pill "Availability". `availabilityCard()` line 2596.
- Purpose and primary focus: say whether you can take work, and re-confirm it on schedule.
- Layout: heading "Your availability"; one sentence; three buttons in a row.
- Content: "You said: <choice>, on <date>." plus " Confirm again by <date> to stay in matches." (not shown when not taking work); or, before the first confirmation, "Tell attorneys whether you can take work. Confirm it every <n> days to stay in matches."
- Interactive elements: three buttons, the current choice shown filled blue: "Available for new work", "Some hours only", "Not taking new work". One click saves and confirms; toast "Availability saved".
- UX observations (mine): there is no separate "confirm" button; clicking the already-selected choice again is how a member re-confirms, which is not stated.

### "Your availability for meetings" card (freelancer)

- How to reach it: Profile page, under "Your availability". `meetingAvailabilityCard()` line 8682 (outside my range, called from it).
- Shown when: freelancer with switch `meetings`.
- Purpose and primary focus: set the weekly hours attorneys can book meetings in.
- Layout and interactive elements, top to bottom:
  - Intro: "Attorneys book meetings with you inside a gig, or one introductory call before a gig, from these times, with <n hours> of notice and <n minutes> between meetings. Meetings are free. Times are in your time zone."
  - Dropdown "Time zone" (aria-label "Time zone for meetings"): options are city zones written "<City> (<zone id>)"; the full list (`TZS`) is defined outside my range.
  - Notice when it differs from the profile time zone: "Your profile says your time zone is <zone>, under "How you work". Meeting times use the one chosen here (<zone id>). " with link "Open my profile".
  - "Meeting lengths you offer": checkboxes "15 minutes", "30 minutes", "45 minutes" (defaults; the server can send others).
  - One row per weekday: a checkbox with the day name, a "from" time box (default 09:00), the word "to", and a "to" time box (default 17:00). Day names come from `WEEK`, outside my range.
  - "Days off" text box: placeholder "For example 2026-11-26, 2026-12-24"; hint "Dates as YYYY-MM-DD, separated by commas. Or pick a date below and click Add."
  - Date picker (aria-label "Pick a day off") and button "Add day off".
  - "Save availability" (blue): toast "Availability saved".
- States: "Loading..."; on load failure the card is emptied without a message.
- UX observations (mine): two cards with nearly the same title ("Your availability" and "Your availability for meetings") sit next to each other, and the profile has a third time zone setting under "How you work". Only one time range per day is possible.

### "License verification" card (attorney)

- How to reach it: Profile page; pill "License verification". `licenseCard()` line 2610, `licenseForm()` line 2641.
- Purpose and primary focus: add a bar license and prove it belongs to the member.
- Shown when: attorney. If license checks are not open: "License checks open soon. Your profile is saved meanwhile." and nothing else.
- Layout, top to bottom: heading "License verification"; intro "The Lawfecta Team checks your license on the state bar's own website, usually within <n> business days. To show the license is yours, confirm an email that is on your bar record or at your firm's own domain, or have a <n> minute video call with us. We never ask for ID documents."; one inner card per license; the foldable "Add a license" form (open by default when there are no licenses).
- Content per license: "<State> license <bar number>" with a badge; "Name on the record: <name>" plus ". Next yearly check: <date>" when verified; a notice with the team's reason, when there is one.
  - Badge words (`LIC_WORDS` line 2362): "Waiting for the Lawfecta Team" (pending), "We need a little more" (needs_more), "Verified", "Not verified", "Check out of date" (expired).
  - Email method lines: "Email <address> confirmed." / red notice "We could not deliver the email to <address>: <reason or 'their mail server refused it'>. Click "Send the email again" later, withdraw this license and add it again with another work email, or ask for a video call instead." / "Delivered to <address>. Click the link in it while signed in to Lawfecta. Check your spam folder too." / "We emailed <address>. Click the link in it while signed in to Lawfecta. Check your spam folder too."
  - Video call lines: "Book your <n> minute video call:" with link " choose a time" (opens a new tab), or "The Lawfecta Team will email you to set up a <n> minute video call."
- Interactive elements:
  - Per pending or needs-more license: "Send the email again" (toast "Email sent again"); "Ask for a video call instead" (toast "Video call requested"); red "Withdraw" (browser OK/Cancel pop-up: "Withdraw this license?").
  - "Add a license" (expandable):
    - Dropdown "Country" (only when more than one country is allowed; option "United States" for US, other codes shown as they are). Otherwise the text "For now we check US licenses. Attorneys elsewhere can keep their profile and use DELA's planning tools."
    - Dropdown "State that issued the license": first option "Choose the state", then the states sent by the server.
    - Text box "Bar number".
    - Text box "Name exactly as on the state bar record" (pre-filled with the profile first and last name).
    - Radio group "How to show the license is yours": "Confirm an email (on my bar record or at my firm's domain)" (default) and "A <n> minute video call with the Lawfecta Team".
    - Text box "Email for the check" (email type, placeholder "you@yourfirm.com", hint "The email on your state bar record, or an email at your firm's own domain. Gmail, Yahoo and other free email services do not count."). Hidden when the video call radio is chosen.
    - "Add the license" (blue): status "Saving..."; toast "License added. Check your email for the link." or "License added. We will set up the video call."; errors show under the button.
- Help: each field has a "?" icon with no specific tip text.
- UX observations (mine): "Withdraw" uses a browser pop-up while chat deletion uses an inline confirm. A verified license has no visible actions at all (no withdraw, no renew), so what a member does when a license expires is unclear from code.

### "LinkedIn check" card (freelancer)

- How to reach it: Profile page; pill "LinkedIn check". `linkedinCard()` line 2676.
- Purpose and primary focus: send a LinkedIn profile address for the Lawfecta Team to check.
- Layout: heading "LinkedIn check"; intro "The Lawfecta Team checks that the name on your LinkedIn profile matches your DELA profile, and that LinkedIn shows its verified badge. We never ask for ID documents or a passport."; the current address with a badge and the team's reason, when one was sent; a text box; one button.
- Content: badge uses the same words as licenses ("Waiting for the Lawfecta Team", "We need a little more", "Verified", "Not verified", "Check out of date").
- Interactive elements: text box "LinkedIn profile address" (placeholder "linkedin.com/in/your-name"; "https://" is added if missing). Button "Ask for the check" (first time) or "Send for a new check" (after one was sent). Toast "Sent to the Lawfecta Team" or "Already sent".
- States: checks not open: "LinkedIn checks open soon."
- UX observations (mine): the LinkedIn address can also appear as a field inside "Your profile" (when required), so the same value has two entry points.

### "Your profile" card: the profile form (both)

- How to reach it: Profile page; pill "Your profile". `formCard()` line 2698.
- Purpose and primary focus: the main profile form. Fill in the boxes and click the save button at the bottom.
- Layout, top to bottom:
  1. Heading "Your profile" and the notice "Profiles are seen by other members. Do not include confidential client information, client names or case details."
  2. "Fill from my Lawfecta listing" button with the note "Fills only empty boxes. Nothing is saved until you click Save. To change your listing from here, tick "Also update my Lawfecta directory listing" at the bottom before you save."
  3. Photo row, then the foldable "Or choose a ready-made picture (<n>)".
  4. Sub-heading "About you" and its fields.
  5. Sub-heading "Your practice" (attorney) or "What you support" (freelancer): practice areas, Lawfecta categories (freelancer), jurisdictions (attorney).
  6. Foldable "Biography: summary, experience and education".
  7. "Tech tools you use" picker and the checkbox "I do not use specific legal tech tools".
  8. Freelancer only: "Task skills", "Services", then sub-heading "How you work" with its fields and the agreement checkbox.
  9. Foldable "Let DELA draft your headline and summary" (attorney) or "Let DELA draft your headline, summary and services" (freelancer).
  10. Directory listing checkbox and status lines (when listing sync is on).
  11. The save button, and a status line under it.
- Field labelling rule: any field that is not required gets " (optional)" added to its label. Which fields are required comes from the server, so it can differ per side and setting. Every field label has a "?" help icon; the tip text is listed below where the code gives one.
- Interactive elements, in order:
  - "Fill from my Lawfecta listing" (button): copies listing values into empty boxes only; the photo always follows the listing. Toast "Filled <n> item(s) from your listing. Check it/them, then Save." or "Your listing had nothing new to add: the boxes it fills are already filled here. Change anything below and click Save. With "Also update my Lawfecta directory listing" ticked at the bottom, your listing changes too."
  - Photo: round picture, or a "?" placeholder when there is none. Buttons "Add a photo" / "Change photo" (file chooser, PNG or JPG, aria-label "Choose a profile photo") and "Use the default picture" (only when a DELA photo or ready-made picture is set). Status text, one of: "Your DELA profile photo." / "A ready-made picture. It is an illustration, not a photo of you." / "This photo comes from your Lawfecta listing." / "No photo yet. Members see your initial." / "Uploading...". After a change, a pending row appears: bold "Your new photo is not saved yet." or "The default picture is not saved yet." or "This picture is not saved yet.", the blue button "Save my picture", and "This saves your whole profile, the same as the Save button at the bottom of this page." Toasts: "New photo ready. Click "Save my picture" next to it to keep it." / "Back to the default picture. Click "Save my picture" next to it to keep it." / "Picture chosen. Click "Save my picture" next to it to keep it."
  - "Or choose a ready-made picture (<n>)" (expandable): note "A ready-made picture is an illustration. It is never treated as a photo of you or as proof of who you are. The same picture shows on Talent, your profile and your conversations." then a grid of picture buttons (radio group "Ready-made pictures", each named "Ready-made picture <i> of <n>").
  - "About you" fields:
    - "First name" (tip: "Your first name as you want members to see it.")
    - "Last name" (tip: "Your last name as you want members to see it.")
    - "Headline" (has "✦ Write with DELA"). Placeholder attorney "Family law attorney in Austin", freelancer "Litigation paralegal, e-filing and discovery". Tip: "One short line under your name: your role and the main kind of work you do. For example: Family law attorney for Texas families." (freelancer example: "Litigation paralegal for small firms.")
    - "Firm name" (attorney; tip "The firm name clients and courts know you by.") or "Company or agency" (freelancer; tip "Your business name, if you work through one. Leave empty if you work under your own name.")
    - "Your role at the firm" (attorney only; placeholder "Owner, partner, associate"; tip "For example owner, partner, associate or of counsel.")
    - "City" (tip "The city you work from.")
    - "State" (placeholder "TX"; tip "Two letters, for example TX or CA.")
    - "Business phone" (tip "A work number. Members contact you through Lawfecta, so this is shown only where your listing shows it.")
    - "Website" (tip "Your own or your firm's website, starting with https://")
    - "LinkedIn profile address" (attorney: always shown here, optional, no tip)
    - "Booking link" (tip "A Calendly, TidyCal or similar link, if you use one."; hint under the box "A page where people book time with you, if you have one.")
  - "Practice areas (<n> selected)" plus ", optional" when not required (expandable; opens by itself when it is required and empty): shows "Selected: <list>", a search box (placeholder "Find a practice area") that filters the chips as you type, and one toggle chip per practice area (selected ones first, filled blue, aria-pressed). The list of areas and the maximum (`practice_areas_max`) come from the server. Clicking past the maximum silently does nothing.
  - Freelancer: "Lawfecta categories (<n> picked)", becoming "Lawfecta categories (<n> of <max> picked)" once loaded (expandable, open when none are picked; `profileCats()` line 2365). Note: "Attorneys search Talent by these categories. Pick the specialties, tasks and software you work in. You show up under each one you pick and under the specialty and category above it." Inside: search box "Find a category" (placeholder "For example: discovery, medical chronology, Clio", hint "Type a few letters, then pick from the list."); label "Or browse"; dropdown "Category" (first option "Choose a category") and dropdown "Specialty" (first option "Choose a category first", then "Choose a specialty"; disabled until a category is chosen); toggle chips for the chosen specialty, the first reading "All of <specialty>"; label "Your categories" with removable chips (each "×", aria-label "Remove <name>") or "None picked yet." Toasts: "You can pick up to <max> categories. Remove one first." / "Now choose a specialty under <name>." / "<name> is already picked." States: "Loading the categories..." / "The categories could not be loaded right now. Reload the page to try again."
  - Attorney: "Where you are licensed or practice" (comma list; placeholder "TX, Western District of Texas"; hint "Separate them with commas.").
  - "Biography: summary, experience and education" (expandable; opens by itself when a required part is missing; the summary line adds " (not written yet)" when folded and the summary is empty). Three text areas, each with "✦ Write with DELA":
    - "Summary" (5 rows). Tip attorney: "A short paragraph about your practice: what you handle, for whom, and how you like to work with support staff." Freelancer: "A short paragraph about you: the work you do, for which kinds of firms, how you work and what you are known for. No client names or case details."
    - "Experience" (4 rows). Tip: "Your roles or kinds of work, newest first, one per line, with years. For example: Founding attorney, Smith Family Law, 2019 to now." (freelancer example: "Senior paralegal, family law firm, 2019 to now.")
    - "Education" (3 rows). Tip: "Degrees, certificates and courses, one per line, with the school and year. For example: J.D., University of Texas School of Law, 2012." (freelancer example: "Paralegal certificate, Austin Community College, 2018.")
  - "Tech tools you use" (plus " (optional)" when not required; `toolsPicker()` line 2866). Hint: "Open a group to choose the tools you use. DELA's AI uses them to tailor its answers, for example by naming your own tools in document steps." Tip: "Choose every tool you use day to day. Attorneys can search for freelancers by tool, and DELA names your tools in document steps." Contains one expandable group per kind of tool (group names and tool names come from the server; a single fallback group is named "Tools"); each group shows "<n> chosen" and holds toggle chips; a group with a chosen tool starts open. Below: a text box with placeholder "Other tools, separated by commas" (aria-label "Other tech tools"). The maximum (`software_max`) comes from the server; clicking past it silently does nothing.
  - Checkbox "I do not use specific legal tech tools".
  - Freelancer: "Task skills" (comma list; placeholder "E-filing, discovery requests, client intake"; tip "The tasks you do well, separated by commas."; hint "Separate them with commas.").
  - Freelancer: "Services" block (see "Services editor" below).
  - Freelancer, under "How you work":
    - Dropdown "Time zone": first option "Choose", then the zones sent by the server.
    - "Usual hours" (placeholder "Weekdays 9 to 5 Central"; tip "When you usually work, with your time zone.")
    - "Hours a week you can take on" (number; tip "About how many hours of new work you can take each week. DELA uses it for matching.")
    - "States you will not work for" (comma list; tip "Two-letter states where you will not take work, for example because of licensing rules. Leave empty if none."; hint "Leave empty if none. Separate them with commas.")
    - "LinkedIn profile address" (only when the server requires it; placeholder "linkedin.com/in/your-name")
    - Checkbox: "I agree to keep attorneys' work confidential, to work only on funded milestones through Lawfecta, and not to take Lawfecta clients off the platform."
  - "✦ Write with DELA" (small AI button under Headline, Summary, Experience and Education; only with switch `ai_generation`; `writeWithDela()` line 2462): opens a help box under the field (click again to close) with the text "DELA uses only the facts you give and what your profile says. It never invents a qualification. Uses DELA actions like Ask DELA.", a 3-row text area (placeholder "A few facts for DELA, for example where you worked, for how long, what you did. Leave empty to improve what the box says now."), and the blue button "Write it". Status texts: "DELA is writing..." / "Tell DELA a few facts first, or write a little in the box for DELA to improve." / "DELA wrote this from your facts. Check it, change anything, then click Save." (plus " DELA asks: <questions>" when it has questions) / an error text. A browser OK/Cancel pop-up can appear: "This may include client information. Click OK if it is not."
  - "Let DELA draft your headline and summary" / "Let DELA draft your headline, summary and services" (expandable; `draftHelper()` line 2931): note "DELA uses only what you write here and in the form. It does not invent qualifications. Uses DELA actions like Ask DELA."; a 4-row text area (aria-label "Tell DELA about your work", placeholder "A few sentences: what you do, for whom, for how long, the tools you use."); button "Draft with DELA". It fills the headline and summary (and for freelancers the skills, and the tools and services only when those are empty). Status "DELA is writing..."; toast "DELA filled in a draft. Check it, then Save." and then a second toast "DELA asks: <questions>". Same browser pop-up as above when the text looks like client information.
  - Checkbox "Also update my Lawfecta directory listing" (only when listing sync is on; ticked by default; members with both workspaces see the longer label "Also update my Lawfecta directory listing from this workspace (your listing is one page for both workspaces)").
  - Save button. Its label changes with the checkbox: "Save and update my directory listing" (ticked), "Save to DELA only" (not ticked, sync on), or "Save" (sync off). Above it, when ticked: "These boxes also change on your directory listing: <field list>."
- States:
  - Saving: "Saving..." under the button; button disabled.
  - Saved: toast "Profile saved", or "Profile saved, with your picture." when a picture was pending.
  - Save refused: the error text under the button; if a picture was pending, also toast "Not saved. <error>".
  - Client information check on save: browser OK/Cancel pop-up "This may include client information (<kinds>). Take it out and click Save, or click OK if it is not client information." (or the server's wording).
  - Listing status lines: "Your listing is being updated." / "Your listing was updated <date and time>." / "Your listing could not be updated: DELA is not allowed to change listings yet. Your DELA profile is saved." (or the raw error) and always "Clearing a box here does not clear it on your listing."
- Help: the "?" icon beside every label (shared `D.helpTip`, opens on hover or tap, closes with Escape); its accessible name is "What to enter in <label>". Fields with no tip text given in code: "LinkedIn profile address", "Where you are licensed or practice", "Time zone", and all firm, license and services fields.
- Variations: attorney-only fields: "Your role at the firm", "Where you are licensed or practice", always-visible LinkedIn field. Freelancer-only: Lawfecta categories, Task skills, Services, "How you work", the agreement checkbox. Headings differ: "Your practice" versus "What you support"; "Firm name" versus "Company or agency".
- Mobile/accessibility notes: every input has an aria-label; toggle chips use aria-pressed; the ready-made pictures are a radio group with arrow-key movement; status lines use `role="status"`.
- UX observations (mine):
  - Very long single form with one save button at the very bottom, plus a second "Save my picture" button near the top that saves the whole form.
  - Three different AI entry points do overlapping jobs: "✦ Write with DELA" per field, "Draft with DELA" for several fields, and Ask DELA itself.
  - Client information warnings use browser pop-ups here but an inline box in Ask DELA.
  - Limits on practice areas, tools and services fail silently (no message), while categories show a toast.
  - Comma-separated text boxes are used for lists (skills, states, jurisdictions) next to chip pickers for other lists.
  - "State" is a free text box here but a dropdown in the license form.
  - Optional fields are tagged "(optional)" but required ones carry no mark.

### Services editor (freelancer, inside "Your profile")

- How to reach it: inside the "Your profile" card, after "Task skills". `servicesEditor()` line 2900.
- Purpose and primary focus: list what the freelancer sells and the usual price.
- Layout: sub-heading "Services" (plus " (optional)" when not required); "What you do, for whom, and your usual price. Prices are a guide; each job is agreed in its proposal."; one small card per service; button "Add a service".
- Interactive elements per service: text box "Service" (placeholder "Draft discovery responses"); text box "For whom" (placeholder "Solo family law attorneys"); a price row reading "From $" [number box] "to $" [number box]; dropdown with options "per job" and "per hour"; red "Remove" (no confirm). "Add a service" adds an empty service, up to the server maximum (`services_max`); past it, nothing happens.
- States: no empty-state text; with no services only the button shows.
- UX observations (mine): removal is instant with no undo. Nothing is saved until the profile's main save button is clicked, which is far below.

### "Profile documents" card (freelancer)

- How to reach it: Profile page, after "Your profile". `docsCard()` line 2958.
- Shown when: freelancer and the server setting `documents_on` is on.
- Purpose and primary focus: upload a resume, certificates or work samples and choose which ones attorneys can see.
- Layout, top to bottom: heading "Profile documents"; "A resume, certificates or work samples with no client information. PDF, Word, PNG or JPG, up to <n> MB each, <n> at most. Each one stays private until you choose to show it to attorneys."; the confirmation checkbox; "Upload a document"; a status line; one row per document.
- Content per document: the file name in bold, then a status phrase: "Uploading", "Checking", "Ready, shown to attorneys", "Ready, private", "Held: please check", or "Not accepted". A held document may be followed by the notice "DELA thinks it may include client information (<reasons>)."
- Interactive elements:
  - Checkbox "This document has no confidential client information." (must be ticked before uploading).
  - "Upload a document" (button): opens a file chooser (accepts .pdf, .docx, .png, .jpg, .jpeg; one file at a time).
  - Per row: "Open" (ready or held; opens in a new tab); "Show to attorneys" / "Make private" (ready); "It has no client information" (held; browser OK/Cancel pop-up "Confirm this document has no confidential client information?"); red "Remove" (browser OK/Cancel pop-up "Remove "<name>"?"; not offered while uploading or checking).
- States: status line texts: "Tick the confirmation box above the upload first." / "Uploading <name>..." / "Checking <name>..." / "Ready." / "Held for your check: see below." / "Not accepted." / "Checking." / an error text.
- UX observations (mine): status is plain text here, while the Files page uses coloured badges with slightly different words for the same states ("Held: please check" versus "Needs your check"). No reason is shown for "Not accepted".

### "Your reviews" card (both)

- How to reach it: bottom of the Profile page. `profileReviewsCard()` line 10592 (outside my range, called from it).
- Shown when: switch `reviews` on. The "Ask a past client for a review" block: freelancer with switch `past_client_reviews`.
- Layout: heading "Your reviews"; "Only signed-in Lawfecta members can read reviews. You cannot remove a review, but you can post one response and report one that breaks the rules."; the reviews list (shared `reviewsList`, outside my range); for freelancers the sub-heading "Ask a past client for a review".
- Past client block: text "For attorneys you worked for outside Lawfecta. DELA sends a short, neutral email; you cannot add a message, and there is no reward for reviewing. They confirm they are an attorney with their state and bar number. Up to <n> requests a month and <n> in total (used: <n> this month, <n> in total)."; text boxes with placeholders "Their name" and "Their work email"; blue button "Send the request" (message "Request sent to <email>."); a list of earlier requests "<name> (<email>), <date>: <status>" with status words "Sent", "Reviewed", "Link expired", "Asked not to be asked".
- States: "Loading..."; if reviews cannot load the card is removed without a message.

---

## Connect DELA to ChatGPT or Claude: the approval page (both)

- How to reach it: tab key `?tab=connect`. ChatGPT or Claude sends the member here with `?tab=connect&req=<id>` when they add DELA as a connector. Without `req` the page is an explainer. There is no menu item. `connectView()` line 3114, `connectExplain()` line 3097.
- Purpose and primary focus: approve or deny an assistant's request to connect to the member's DELA workspace. The ONE main thing: click "Approve" or "Deny".
- Shown when: any member with a side. Approval is blocked when the connector is not open for the account or the plan does not include it.
- Layout, top to bottom: one centred card, at most 620 px wide.
  - Explainer mode (no request): heading "Connect DELA to ChatGPT or Claude"; the five explanation sections below; then "To connect: open ChatGPT or Claude and add DELA there. It brings you back to this page to approve. The steps are in Settings." and the button "Open Settings".
  - Approval mode: heading "<assistant name> wants to connect to DELA"; "It will use your <side> workspace." (members with both workspaces see "... workspace. To connect your other workspace instead, switch workspaces at the top of this page first."); small text "After you choose, you go back to <host>."; the five explanation sections; the sensitive data notice; a red notice if blocked; the buttons; a status line.
- Content and data shown: the five explanation sections (headings are h2):
  - "What <assistant> can access": read-only items. Attorney: "See your name, workspace, plan and DELA actions left"; "Read your profile and where your verification stands"; "List and read the documents in your library"; "Export a document as text, a web page or a checklist". Freelancer: "See your name, workspace, plan and DELA actions left"; "Read your profile and what is missing to be match-ready".
  - "What it can change": attorney: "Save new document drafts and suggest changes (you accept changes here, on the DELA website)"; "Have DELA's AI draft a document, using your DELA actions or your own key". Freelancer: "Nothing. It can only read."
  - "What stays private": "It cannot pay, hire, sign, send messages, delete anything or see your passwords or AI keys."
  - "What leaves DELA": "What <assistant> reads from DELA is processed by <OpenAI / Anthropic / OpenAI (ChatGPT) or Anthropic (Claude)> under your own account with them, and their terms apply to it. Disconnecting stops new reading right away, but it cannot recall what was already read."
  - "How to disconnect": "Open Settings, find the card "Use DELA in ChatGPT and Claude" and click "Disconnect". It stops working right away."
- Interactive elements:
  - "Open Settings" (explainer mode): goes to tab `ai`.
  - "Approve" (blue; disabled when the connector is off or not in the plan) and "Deny" (ghost). Both disable while working, then the browser leaves DELA for the assistant's site.
- States:
  - Loading: "Loading...".
  - Request problem: heading "Connect DELA" and a red notice, one of: "This connection request ran out or was already answered. Start again from ChatGPT or Claude." / "DELA in ChatGPT and Claude is not open for your account yet." / "Your plan does not include the ChatGPT and Claude connector." / "Some actions are paused on your account. Contact the Lawfecta Team."
  - Status line: "Connecting..." / "Saying no..." / "Connected. Taking you back to <assistant>..." / "Not connected. Taking you back...".
  - Notice (role note): "Never enter sensitive data in DELA, and that includes what you type in ChatGPT or Claude for DELA: SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords. Keep it in your own storage. You are responsible for what you enter."
- Help: none.
- Variations: the access and change lists differ by side; wording names the assistant when known.
- Mobile/accessibility notes: none specific beyond `role="status"` and `role="note"`.
- UX observations (mine): a consent screen with five headed sections before the two buttons, so "Approve" and "Deny" sit below a lot of reading. The page-wide client information notice also shows above this card, so two warnings appear on one small page. In explainer mode the only action is a plain unstyled button.

## "Use DELA in ChatGPT and Claude" card, in Settings (both)

- How to reach it: Settings page (tab key `?tab=ai`), a card further down that page. `connectionsCard()` line 3146.
- Purpose and primary focus: give the connector address and steps, and list and disconnect connected assistants.
- Layout, top to bottom: heading "Use DELA in ChatGPT and Claude"; one intro sentence; label "DELA connector address" with a read-only box and "Copy"; sub-heading "In Claude" with three numbered steps; sub-heading "In ChatGPT" with three numbered steps; a small note; sub-heading "Connected now" with the list.
- Content and data shown:
  - Intro, attorney: "Read your documents, save drafts and suggest changes from ChatGPT or Claude. Changes wait for you here before they count." Freelancer: "Connect ChatGPT or Claude to your DELA freelancer workspace. More freelancer tools come in a later update."
  - "In Claude" steps: "Open claude.ai, then Settings, then Connectors." / "Click Add custom connector. Name it Lawfecta DELA and paste the address above. Click Add." / "Click Connect next to Lawfecta DELA. This page opens: click Approve."
  - "In ChatGPT" steps: "Open chatgpt.com, then Settings, then Apps and Connectors. If you do not see a Create button, turn on Developer mode under Advanced settings." / "Click Create. Name it Lawfecta DELA, paste the address above, choose OAuth for sign in, and click Create." / "ChatGPT opens this page: click Approve."
  - Note: "Menu names in ChatGPT and Claude change from time to time. Look for Connectors or Apps. Some ChatGPT and Claude plans do not allow custom connectors."
  - Connected list rows: "<assistant name>" in bold, then " <side> workspace, connected <date>, last used <date>".
- Interactive elements: read-only text box (aria-label "DELA connector address"); "Copy" (toast "Address copied"); per connection a red "Disconnect" (browser OK/Cancel pop-up: "Disconnect <name>? It stops working with DELA right away. You can connect it again later."; toast "Disconnected").
- States: "Loading..."; not open and nothing connected: "Opens soon. You will be able to read and draft your DELA documents from ChatGPT or Claude."; empty list: "Nothing connected yet."; on load failure the card is emptied without a message.
- UX observations (mine): step 3 in both lists says "This page opens", but the page that opens is the Connect approval page, not Settings. Setup instructions and the management list share one long card.

---

## Client information card: "Who you are working with" / "Who posted this gig" (freelancer)

- How to reach it: not a page. A card shown to the freelancer on a gig page (heading "Who posted this gig", or "Who you are working with" once hired; line 7649) and on an engagement page inside the section "Who's working on this" (line 9212). `clientCard()` line 3007.
- Purpose and primary focus: tell the freelancer who the client is.
- Shown when: freelancer side, and the client has a name or a firm name; otherwise nothing is drawn.
- Layout: heading (default "Who you are working with"); one row: round picture (or a circle with the first letter), the person's name in bold, a "✓ Verified" mark when verified, a small line "Agency" or "Attorney"; then, on the right, the firm logo and firm name when there is a logo or the firm name differs from the person's name.
- Interactive elements: none.
- Mobile/accessibility notes: picture alt text "Picture of <name>"; logo alt text "Logo of <firm>"; the row wraps on narrow screens.
- UX observations (mine): display only; there is no link to the client's profile or to a conversation.

---

## Files (attorney)

- How to reach it: menu item "Files"; tab key `?tab=files`; Home button "Open Files". `filesView()` line 3185, `drawFiles()` line 3200.
- Purpose and primary focus: the firm's store of process documents, templates, forms and checklists. The ONE main thing: upload files, then open them or ask DELA about them.
- Shown when: attorney side with switch `file_uploads` on. Freelancers cannot open it.
- Layout, top to bottom:
  1. Heading "Files" and intro: "Keep your process documents, templates, forms and checklists here, and ask DELA about them. Files belong to your firm and only your firm can open them."
  2. Storage card: bold "Storage: <used> of <limit> used", small text "Files in the trash count until it empties after <n> days.", and a bar (red at 90 percent or more). The limit reads "no cap" when there is none.
  3. Card "Add files" (the upload card).
  4. Folder pills: "All files", one pill per folder, "Trash", then "+ New folder", and when a folder is selected "Rename or delete this folder".
  5. Search box.
  6. The file table in a scrolling card, or an empty-state card.
- Content and data shown:
  - Table columns: "Name", "Status", "Size", "Added", and an unnamed actions column.
  - Name cell: the file name in bold; "Version <n>, uploaded <date and time>"; plus info lines: "It may contain <kinds>. The AI will not use it until you check it." (held) / "Saved from a job. DELA's AI never reads files from a job." / "<reason> DELA did not keep it." (refused) / "No readable text was found, so the AI cannot read it." (ready, not an image).
  - Status badge words (`STATUS_WORDS` line 3182): "Ready", "Checking", "Needs your check" (held), "Not accepted" (refused), "In the trash", "Uploading". A ready file also shows "Available to your firm" under the badge.
  - Refusal reasons (`REFUSE_WORDS`): "It is not really the type its name says." / "It has scripts, macros or hidden files inside." / "It could not be opened." / "Your storage is full." / "It is over the size limit." / fallback "It could not be accepted."
  - Size cell: KB, MB or GB. Added cell: "<date and time> by <uploader>".
- Interactive elements:
  - Upload card "Add files" (`uploadCard()` line 3315):
    - Reminder: "Never enter sensitive data: SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords. Share a link from your own storage instead. You are responsible for what you enter."
    - Checkbox "These files have no sensitive data (no SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords)."
    - Text: "PDF, Word (.docx), text, Markdown, PNG or JPG, up to <n> MB each. DELA checks each file. A file that looks like it has client information is held until you check it."
    - A visible browser file input (several files allowed; accepted types come from the server).
    - "Upload" (blue). Toasts when it cannot start: "Choose a file first." / "Tick the confirmation box above the upload first."
    - Progress list: one line per file, "<name>: <state>", states "waiting", "starting", "uploading", "checking", "ready", "held: please check it below", "not accepted", "the upload did not finish. Check your connection and try again.", or an error text. Files upload one after another into the folder that is selected.
  - Folder pills (aria-pressed): "All files", each folder name, "Trash".
  - "+ New folder": browser text pop-up (prompt) "Folder name".
  - "Rename or delete this folder": browser text pop-up "Rename the folder, or leave it empty and press OK to delete it (only an empty folder can be deleted)", pre-filled with the name. Toasts "Folder renamed" / "Folder deleted".
  - Search box: placeholder "Search files by name" (aria-label "Search files"). Filters when the box loses focus or Enter is pressed, not on each keystroke.
  - Row actions (which ones show depends on status):
    - "Open" (ready, held): opens the file in a new tab.
    - "Download" (ready, not PNG or JPG).
    - "Ask DELA" (blue; ready, not from a job, switch `ai_generation`): opens Ask DELA with this file attached.
    - "It has no client information" (blue; held): browser OK/Cancel pop-up "Confirm that "<name>" has no confidential client information. You are responsible for what you upload."; toast "Thanks. The file is ready."
    - "New version" (ready, held): file chooser limited to the same file type, then a browser OK/Cancel pop-up "Upload a new version of "<name>"? Confirm it has no sensitive data (<kinds>)."
    - "Rename" (ready, held): browser text pop-up "New name"; toast "Renamed".
    - "Move" (ready, held; only when folders exist): browser text pop-up "Move to which folder? Type its number." followed by a numbered list starting "0. No folder"; toast "Moved", or "Type one of the numbers shown."
    - "Versions (<n>)" (when more than one version): opens the versions panel (below).
    - "Delete" (red; ready, held): browser OK/Cancel pop-up "Move "<name>" to the trash? You can restore it for <n> days."; toast "Moved to the trash".
    - "Clear" (refused): removes the row; toast "Cleared". No confirm.
    - "Restore" (in the trash): toast "Restored".
    - "Delete forever" (in the trash): browser OK/Cancel pop-up "Delete "<name>" forever? It is removed at once, with every version, and cannot be restored."; toast "Deleted forever".
- States: loading "Loading..."; load failure a red notice; empty folder "No files here yet."; empty trash "The trash is empty."; files being checked refresh on their own every 4 seconds; when storage is full during upload (attorney) a "Limit reached" dialog opens: "Your storage is full. Delete files or upgrade for more space." with an upgrade button and "Not now".
- Help: no "?" tips or glossary terms on this page.
- Variations: by file status as listed; files saved from a job cannot be sent to Ask DELA; image files have no "Download" button (they use "Open").
- Mobile/accessibility notes: the table has class "stack" and every cell carries a `data-label` (Name, Status, Size, Added), so it stacks into labelled blocks on narrow screens; the actions cell has no label. Pills use aria-pressed.
- UX observations (mine):
  - Up to eight buttons in one row ("Open", "Download", "Ask DELA", "New version", "Rename", "Move", "Versions", "Delete"), all the same small size. A row menu would reduce the density.
  - Folder creation, rename, delete and file move all use browser text pop-ups. "Move" asks the member to type a number, and deleting a folder is done by clearing its name. These are the least finished interactions in my ranges.
  - The search box does not filter as you type, and a search with no matches shows "No files here yet.", which reads as if the folder were empty.
  - The upload date appears twice per row (under the name and in "Added").
  - "Delete" means move to the trash; "Delete forever" is the permanent one; "Clear" is a third word for removing a refused file.
  - The upload card always sits above the list, pushing the files down the page.
  - The search text and selected folder persist while the page is redrawn; there is no sort control and no paging.

### Versions panel: "Versions of <file name>" (attorney)

- How to reach it: Files page, row button "Versions (<n>)". `showVersions()` line 3302.
- Purpose and primary focus: download an earlier version of a file.
- Layout: a side drawer (role dialog, aria-label "Versions") with the heading "Versions of <file name>" and a list. The close control comes from the shared drawer (outside my range).
- Content per item: "Version <n>" plus " (current)" on the current one; "<date and time>, <size>".
- Interactive elements: "Download" per version.
- States: no loading or empty text in the code.
- UX observations (mine): there is no way to restore an earlier version as the current one from here; only download.

---

## Cross-page elements seen

- Sensitive data reminder, two wordings: beside AI writing boxes "Never enter sensitive data: ... Keep it in your own storage. You are responsible for what you enter." (`aiNotice`), and beside uploads "... Share a link from your own storage instead. ..." (`notice`). The list of kinds is always "SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords".
- Client information check, three presentations of the same idea: an inline problem box with buttons (Ask DELA), a browser OK/Cancel pop-up (profile save, "Write with DELA", "Draft with DELA", "✦ Improve my request"), and a "held" file state with a confirm button (Files, Profile documents).
- "I confirm" tick box before upload (Files and Profile documents), with the shared message "Tick the confirmation box above the upload first."
- Upload flow shared by Files and Profile documents: start, upload, check, then ready, held or refused.
- File status words. Files page badges: "Ready", "Checking", "Needs your check", "Not accepted", "In the trash", "Uploading". Profile documents text: "Uploading", "Checking", "Ready", "Held: please check", "Not accepted".
- Verification status words shared by licenses and LinkedIn: "Waiting for the Lawfecta Team", "We need a little more", "Verified", "Not verified", "Check out of date".
- Readiness badge words: "Not complete", "Waiting for a check", "Ready", "Availability out of date", "Not taking work", "Paused".
- Badge colours by class: "ready" (good), "held" (waiting), "bad" (problem), plain (neutral).
- `field(label, input, hint, help)`: label row with a "?" help icon (`D.helpTip`), the input, and a small muted hint. Used on every profile, firm, license and services field.
- AI buttons carry a "✦" mark and class "ai-btn": "✦ Improve my request", "✦ Write with DELA". AI cost wording: "Uses DELA actions like Ask DELA." and "Uses <n> DELA action(s) on Lawfecta's AI (none on your own key)."
- Pills (class "pills") used as section jump links (Profile), as a choice group (Appearance) and as folder tabs (Files).
- Toggle chips (blue when on, ghost when off, aria-pressed) for practice areas, tech tools and categories; removable chips with "×" for attached files and picked categories.
- Expandable sections (native details/summary) throughout the profile: readiness explainer, "Add a license", ready-made pictures, practice areas, Lawfecta categories, biography, tool groups, "Let DELA draft...".
- Toasts (`D.toast`) for success and short errors; inline `role="status"` lines under buttons for form errors; red "notice bad" boxes for load failures.
- Browser pop-ups are still used for: withdraw license, remove or confirm a profile document, disconnect an assistant, every Files confirm, and all Files text entry (new folder, rename, move). Inline confirm is used only for deleting a chat.
- "Limit reached" dialog (`limitPopup`) with an upgrade button and "Not now": opened from Ask DELA (actions used up) and Files (storage full), attorney side.
- Loading text is always "Loading..." (or "Loading the categories...").
- Button styles: "blue" (primary), "ghost" (secondary), "danger" (red), "linkish" (text link), with "small" variants.
- Shared error wording for the library and AI (`failText`, line 3394, used by "Write with DELA" and "Draft with DELA"): for example "Your own AI key did not work: <problem> Nothing ran on Lawfecta's AI. Open Settings to fix it." and "DELA's AI could not finish: <problem> No DELA actions were used. Please try again."

---

# PART C

# Inventory C: Library, recorder, guided setup, document editor, images

Source: `app/dela-app.js`, lines 3419 to 5066 and 11228 to 12195. Every label below is copied from the code.

Shared facts used throughout this file:

- Library roles and what they unlock (`RANK`, line 3381; `can(n)`, line 3393): "Viewer" (1), "Commenter" (2), "Editor" (3), "Administrator" (4). In this file "can(2)" means Commenter or higher, "can(3)" Editor or higher, "can(4)" Administrator only.
- Document status words (`PB_STATUS`, line 3379): "Draft", "In review", "Approved", "Archived", "In the trash".
- Document type words (`DOC_TYPE_WORDS`, line 10721): "Policy", "Workflow", "SOP", "Playbook".
- Two document formats exist. Older documents ("legacy", 13 fixed parts) are drawn by `drawPlaybook` (line 3812). Documents on the "document standard" (`body.schema === 2`) are drawn by `drawDocument` (line 11288). Which one a member sees depends on the document, not on a choice.
- Sensitive-data line (`aiNotice`, line 1847), shown above most AI text boxes: "Never enter sensitive data: SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords. Keep it in your own storage. You are responsible for what you enter." The variant `notice()` (line 1848) ends "Share a link from your own storage instead. You are responsible for what you enter."
- Who reaches the Library: `tab=library`, shown when the switch `playbook_library` is on and the member is an attorney, or a freelancer whose agency hires (`me.agency_client`) (line 12226, `canHire` line 12603). Menu label "Library" (line 25).

---

## Library: plain-language workspace (cards) (attorney, and freelancer agencies that hire)

- How to reach it: menu "Library", `?tab=library`. `libraryView` (3419) then `drawLibrary` (3435) hands over to `drawWorkspace` (3545).
- Purpose and primary focus: find a firm document and open it, or start a new one. The one main action is "Create a document".
- Shown when: `L.workspace` is on (comment says switch `library_workspace`), the library is on (`L.on`), and the member has not chosen "Show as a table" (saved preference `libTable`).
- Layout, top to bottom:
  1. Header row: h1 "Library", sub-line "Your firm's processes and policies, all in one place.", then buttons "Create a document", "Import", "Library settings".
  2. Library picker (dropdown) on its own row, only when the member belongs to more than one library.
  3. "Import" card (only after clicking "Import"): heading "Import", two buttons, one small note.
  4. Search box.
  5. Two rows of filter pills: Category, then Status.
  6. Card groups. First group "Imported, waiting for review" (if any), then one group per category, heading = category name, cards sorted A to Z by title.
  7. Row of text links: "Recordings", "Recently deleted (N)", "Show as a table".
  8. "Recordings" card (only when its link is open). See the Recordings card section.
  9. "Recently deleted" card (only when its link is open).
  10. "Drafts due to be deleted" card (only when there are drafts due soon).
  11. Help card "Not sure where to start?" (Editor and above).
  12. Footer line: the plan limit text plus " Your access to this Library: <role>."
- Content and data shown:
  - Document card (`docCard`, 3530): title; one purpose sentence (or link "Add a purpose"); one status badge; optional note line; optional lock line; one action button.
  - Status badge words (`WS_WORDS`, 3529): "Ready to use (approved)" (green), "Draft" (plain), "Needs your review" (yellow).
  - Note lines under the badge (`cardState`, 3515): "A new draft is waiting for your approval.", "Review overdue since <date>", "A new draft is in progress.", "<N> required item(s) before approval.", "Sent for approval."
  - Import card: title or "Imported guide"; "<N> step(s) imported on <date>."; badge "Needs your review".
  - Categories come from lifecycle codes in this order: INT, ENG, MAT, DOC, BIL, CLS, ADM (names come from the server, `L.groups`), then "Not grouped yet".
  - Plan limit text (`libLimitText`, 482): "<count> of <limit> documents", or "<count> documents saved. Your plan allows <limit>.", or "<count> documents (no cap on your plan)".
- Interactive elements:
  - Button "Create a document" (blue; Editor+): opens the new-document flow (`newDocument`, line 10800, outside this range) when the library is on the document standard, else the older "New document" card (`newPlaybook`).
  - Button "Import" (ghost; Editor+; toggles, aria-expanded): opens the "Import" card with buttons "From a Scribe guide" (only if `L.scribe_on`) and "From a file or text you already have" (opens the "New document" card). Note under them: "DELA turns it into a draft. Nothing is ready to use until someone approves it."
  - Link-style button "Library settings" (Administrator only): opens the "Library team" drawer.
  - Dropdown, aria-label "Library": one option per library, text "My library (<Role>)" or "<name> (<Role>)". Changing it reloads.
  - Search box: aria-label "Find a document", placeholder "Find a document by name, purpose or ID". Filters as you type (title, purpose, ID, category name, practice area).
  - Category pills (group label "Category"): "All categories", then each category that has documents, then "Not grouped yet".
  - Status pills (group label "Status"): "All", "Ready to use", "Draft", "Needs your review".
  - Card action button, one per card. Labels and when: "Review imported document" (document moved to the standard, not yet confirmed); "Review and approve" (in review, Administrator); "Review now" (approved, review date passed); "Open document" (approved); "Fix required items" (draft with blocking quality items, Editor+; opens the document scrolled to the quality check); "Open draft" (in review, or a draft for a non-editor); "Continue draft" (draft, Editor+). Draft actions are ghost buttons, the rest blue.
  - Link "Add a purpose" on a card with no purpose (Editor+): opens the document.
  - Import card button "Review imported document": opens the import review screen.
  - Empty-result button "Show all documents": clears search and both filters.
  - Links at the bottom: "Recordings" (Editor+, toggle), "Recently deleted (N)" (toggle, only if any archived or trashed), "Show as a table" (switches to the table view and remembers it).
  - "Recently deleted" card: heading "Recently deleted", text "Archived documents and documents in the trash. Open one to restore it.", list of title + status word, button "Open" per row.
  - Help card "Not sure where to start?": text "Describe the process in a sentence. DELA suggests how to structure it, asks a few questions and drafts it for you. The draft is yours to edit, and it is never the working version until someone approves it."; sensitive-data line; text area (aria-label "What would you like to document?", placeholder "For example: how we check for conflicts before accepting a new client", 3 rows); buttons "✦ Help me create a document" (starts the new-document flow with that text) and "What am I missing?" (see that section).
- States:
  - Loading: "Loading..."
  - Load error: red notice with the server's error text.
  - No library at all: "No library yet."
  - Empty library: "No documents yet. Click "Create a document" and describe what you want to document."
  - Filters match nothing: "No documents match." plus "Show all documents".
  - Locked after a downgrade: "🔒 Upgrade to edit this document." on the card.
- Help: help tip beside the "Ready to use (approved)" badge, question "What does Ready to use mean?", text "Approved by your firm. DELA checks how it is written, not whether it is legally correct."
- Variations: Viewers and Commenters see no create, import, recordings or help card. Only the Administrator sees "Library settings". "From a Scribe guide" needs `L.scribe_on`.
- Mobile/accessibility: pills use `aria-pressed`; pill groups have `role="group"` with labels; toggles use `aria-expanded`. Coming back from a document restores search, category, status and scroll position.
- UX observations (mine): The "Import" button, the "Recordings" link and the "Recently deleted" link share one open/closed slot (`ws.more`), so opening one closes the others, and two of them open far from where they are clicked (Import opens at the top, the other two near the bottom). "Library settings" opens a drawer titled "Library team". The same "What am I missing?" action exists here and in the table view. The plan limit sits at the very bottom as small grey text.

---

## Library: table view, "Document library" (attorney, and freelancer agencies that hire)

- How to reach it: same tab. Shown when the workspace switch is off, or after clicking "Show as a table". `drawLibrary` (3435).
- Purpose and primary focus: the older, denser list of documents with a usage bar. Main action: "New document".
- Shown when: see above. If the library is off for the account the page stops after the intro with a notice (text from `D.errorText("library_off")`; the same reason maps to "The document library is not open for your account yet." in `failText`).
- Layout, top to bottom:
  1. h1 "Document library" with the library picker dropdown on the right (if more than one library).
  2. Intro: "Each document is one repeatable process, written so a trained person who has never done it can do it right, with the points where an attorney must review."
  3. Usage card: bold limit text, badge "Your access to this Library: <Role>", a progress bar (turns red at 100%), then the action buttons.
  4. Search box and filter pills on one wrapping row.
  5. The list.
  6. "Drafts due to be deleted" card (if any).
  7. Collapsed card "Imports waiting for review (N)" (if any).
  8. "Recordings" card (Editor+).
  9. Link "Show as cards" (only when the workspace switch is on).
- Content and data shown: Legacy rows (`drawList`, 3494): a chip with completeness "<N>%", title, lock line if locked, a meta line "<practice area> | version <n> | updated <date> | <n> suggestion(s) waiting", and a status badge (Approved green, In review yellow). When the library is on the document standard the list is drawn by `docIndex` (line 10934, outside this range). `reviewCell` (3780, used by that index) shows "None" or a link "<N> quality note(s)" with " (required)" when blocking.
- Interactive elements:
  - Buttons in the usage card: "New document" (blue, Editor+), "Import from Scribe" (ghost, Editor+, only if `L.scribe_on`), "What am I missing?" (ghost, Editor+), "Team" (ghost, Administrator only).
  - Dropdown aria-label "Library" (same options as above).
  - Search: aria-label "Search documents", placeholder "Search by title, ID or practice area".
  - Filter pills: "All", "Drafts", "In review", "Approved", "Due for review", then "More". Clicking "More" adds "Archived" and (Administrator only) "Trash".
  - Each row is clickable (role button, tabindex 0) and opens the document.
  - Imports list: per row a "Review" button (blue).
  - "Show as cards" link.
- States: "Loading..."; "No library yet."; "Nothing here." (filter empty); "No documents yet. Click New document and describe a task, or import a guide you made in Scribe."; row lock "🔒 Upgrade to edit this document."
- Help: none.
- Variations: "All" hides archived and trashed documents. "Due for review" means approved with a review date today or earlier.
- Mobile/accessibility: rows have role and tabindex but no key handler is visible in this code, so Enter may not open them (unclear from code).
- UX observations (mine): Wording differs from the card view for the same things: "New document" vs "Create a document", "Team" vs "Library settings", "Import from Scribe" vs "Import", "Imports waiting for review" vs "Imported, waiting for review", "Drafts" vs "Draft". The search filter is skipped for the "Due for review" and "Trash" pills (the code returns before the search test).

---

## "New document" card (older create flow) (attorney, and freelancer agencies that hire; Editor+)

- How to reach it: "New document" in the table view when the library is not on the document standard; "From a file or text you already have" in the Import card; "Create a document" or "✦ Help me create a document" when the library is not on the standard. `newPlaybook` (3642). It replaces the whole Library page.
- Purpose and primary focus: describe a task (type, talk or attach a file) and let DELA draft the document.
- Layout, top to bottom: h2 "New document"; sensitive-data line; title box; description box; a row with "● Talk", "Use a file I uploaded", "Upload a new file" and a status line; the file pick list; the upload panel; the problem panel; a row with "Draft it with DELA", "Start blank", "Cancel".
- Interactive elements:
  - Text box aria-label "Title", placeholder "Title (optional)".
  - Text area aria-label "Describe the task", placeholder "Describe the task the way you would explain it to a new paralegal: what starts it, the steps, who does each part, what done looks like." Gets focus on open.
  - Button "● Talk" (only when voice is on and the browser supports recording): voice to text into the description.
  - Button "Use a file I uploaded" (switch `file_uploads`): loads the member's ready, readable files as a checkbox list (label = file name).
  - Button "Upload a new file" (switch `file_uploads`): opens a small panel with a file input (aria-label "Choose a file", accepts .pdf, .docx, .txt, .md), a checkbox "This file has no sensitive data (no SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords).", and button "Upload".
  - Button "Draft it with DELA" (blue).
  - Button "Start blank" (ghost): creates "Untitled document" (or the typed title) and opens it in Edit.
  - Button "Cancel": back to the Library.
  - In the problem panel: "Send anyway, it has no client information"; "Try again"; "Use Lawfecta's DELA actions this time" (only when the member's own AI key failed and backup credits are allowed).
- States:
  - Status while drafting: "DELA is drafting your document..."
  - Toast when nothing was entered: "Describe the task or choose a file first, or click Start blank."
  - File list empty: "No readable files yet. Click "Upload a new file" to add one here."
  - Upload messages: "Choose a file first."; "Tick the box to confirm the file has no sensitive data."; "Uploading <name>..."; "The upload did not finish. Check your connection and try again."; "✓ <name> is ready. DELA will draft from it."; "DELA is holding this file because it may include client information. Check it on the Files page."; "This file was not accepted. Use a Word file, PDF or text file."; "DELA is still checking the file. Try again in a moment."
  - Client-information warning: the server's note, or "This may include <kinds>. Use placeholders such as [Client Name] instead."
  - AI failure text (`failText`, 3394), for example "Your own AI key did not work: ... Nothing ran on Lawfecta's AI. Open <settings name> to fix it." or "DELA's AI could not finish: ... No DELA actions were used. Please try again."
  - Library full: a limit pop-up (`limitPopup`, outside this range).
- Variations: file buttons only with switch `file_uploads`; "● Talk" only with voice on.
- UX observations (mine): An `auto` checkbox is created for the microphone but never placed on the page here. Two ways to attach a file sit side by side with similar names.

---

## "What am I missing?" result card (Editor+)

- How to reach it: button "What am I missing?" in either Library view. `suggestMissing` (3739). The card is inserted near the top of the Library page (before the fourth element).
- Purpose: DELA lists documents that similar firms usually have.
- Layout: while loading "DELA is looking at your library..."; then h2 "Documents firms like yours often have", a list of bold title + grey reason, and button "Close".
- States: failure text in a red "problem" paragraph.
- UX observations (mine): The suggestions are plain text; nothing lets the member start one of them from the list. In the card view the result appears near the top while the button is at the bottom of the page.

---

## "Library team" drawer (Administrator)

- How to reach it: "Library settings" (card view) or "Team" (table view). `openTeam` (3753). Opens as a side drawer, role dialog, aria-label "Library team".
- Purpose: add or remove people and set their role.
- Layout: h2 "Library team"; note "Editors and administrators use a seat (<n> on your plan, including you). Commenters and viewers do not, up to <n>."; member list, first line "<owner name> Administrator (owner)", then "<name> <Role>" with a "Remove" button each; h3 "Add someone"; note "They need a Lawfecta account and must have opened DELA once. Find their BD member ID in their Lawfecta profile."; a row with the ID box, role dropdown and "Add".
- Interactive elements:
  - "Remove" (red, per member): removes at once, no confirm. Toast "Removed. They lost access straight away."
  - Text box aria-label and placeholder "BD member ID" (numeric keyboard).
  - Dropdown aria-label "Role": "Editor", "Commenter", "Viewer", "Administrator" (in that order).
  - "Add" (blue). Toast "Added".
- States: seat errors from `failText`: "Every seat on this plan is in use (<n>). Editors need a seat. Add them as a commenter or viewer, or add seats on the Business plan."; "This library already has <n> commenters and viewers, the most allowed."
- UX observations (mine): Adding someone needs a "BD member ID", an internal number the member has to look up elsewhere. "Remove" has no confirm step although access ends at once. There is no way to change a role without removing and adding again (unclear whether "Add" on an existing member updates the role).

---

## "Drafts due to be deleted" card (both Library views)

- How to reach it: appears by itself in the Library when at least one never-approved draft is close to automatic deletion. `draftsDueCard` (3857).
- Layout: h2 "Drafts due to be deleted"; note "Drafts that were never approved are deleted after a set time without changes. Click "Save to library" to keep one."; one row per draft: bold title, " | deleted on <date>", buttons "Save to library" and "Open".
- Interactive elements: "Save to library" (toast "Saved. This draft is kept until you delete it."); "Open".
- States: hidden when nothing is due; load errors are silent.

---

## Document page, legacy format (older documents) (attorney, and freelancer agencies that hire)

- How to reach it: open any older document from the Library. `openPlaybook` (3786) then `drawPlaybook` (3812). A deep link with a document ID also lands here (line 12889).
- Purpose and primary focus: read one process document and move it toward approval.
- Layout, top to bottom:
  1. Lock notice (only when the plan was downgraded): "🔒 Upgrade to edit this document. Your plan saves fewer documents, so this one is read-only. You can still view, export and assign it." with an upgrade button.
  2. "← Library" button.
  3. h1 title with the status badge.
  4. Meta line: "Version <n> | last approved: version <n> | administrator: <name> | next review <date> | your role: <Role>".
  5. Freelancers-who-fit card (`fitsCard`, outside this range) when switch `talent_search` is on, the member can hire, and the view is not Edit.
  6. Completeness card: "Complete: <n>%", action buttons, a bar (green at 100%), then "Still missing: <parts>." or "Every required part is filled." (plus " DELA still has <n> question(s) for you below: check its guesses before you approve.").
  7. "DELA's questions" card (if DELA has open questions; Editor+).
  8. Tab strip.
  9. The chosen tab's content.
  10. Administrator row at the bottom: archive and delete actions.
- Interactive elements:
  - "← Library".
  - In the completeness card: "Send for review" (Editor+, status Draft; toast "Sent to the administrator for review"); "Post as a Flex Gig" (approved, attorney, switch `flex_gigs`, Administrator; goes to Projects with this document chosen); "Approve" (Administrator, Draft or In review; disabled below 100% with tooltip "Fill in every required part first"; toast "Approved").
  - Tabs: "Read", "Edit", "Chat", "Suggested edits (N)", "Comments (N)", "Activity", "Versions", "Files (N)", "Export". Below Editor the "Edit" and "Export" tabs are removed.
  - Bottom row (Administrator): "Archive" (toast "Archived") or "Bring back from the archive" (toast "Back in the library"); then one of "Delete draft" (never-approved draft; browser confirm "Delete this draft for good? It was never approved, so it is removed at once with its versions and comments. This cannot be undone."; toast "Draft deleted"), "Restore from the trash" (toast "Restored"), or "Delete" (browser confirm "Move this document to the trash? You can restore it for 30 days."; toast "Moved to the trash").
- States: load failure shows a toast and returns to the Library.
- Variations: by role as listed; by status for the action buttons.
- UX observations (mine): Three places hold actions (completeness card, tab strip, bottom row). Nine tabs in one strip. Destructive actions use the browser's own confirm box.

### Legacy tab "Read"

- `readView` (3915). One card per part, in this order with these headings: "Title and outcome", "Practice area and jurisdiction", "When to use it", "Roles", "What you need first", "Steps", "Deadlines and timing", "Quality checks", "Attorney review and ethics points", "Never delegate", "Templates and resources", "Tools", "Deliverables". "Deadlines and timing" is hidden when the process has none; "Never delegate", "Templates and resources" and "Tools" are hidden when empty.
- Steps show a number, the text, a grey line "Who: <x> | Tool: <x> | About <n> min | <delegation word>" and, if set, "Decision: <text>". Delegation words: "Keep (attorney)", "Delegate", "Automate".
- Interactive elements: "Comment" on each part's heading (Commenter+; not on "Steps" or "Practice area and jurisdiction"); per step "Screenshot" (opens the file) and "Comment".
- States: "No steps yet."; "Not filled in yet."
- Comment box (`commentBox`, 3940), opens inside the card: sensitive-data line; text area aria-label "Comment", placeholder "Your comment on <part>"; checkbox "Suggest new text for this part" (reveals a second text area, aria-label "Suggested text", pre-filled with the current text); buttons "Send" and "Cancel". Toasts: "Comment added" or "Suggestion sent to the administrator".

### Legacy tab "Edit"

- `editView` (3957). One long card: sensitive-data line, then fields in order:
  - "1. Title" (one line); "Outcome: what done produces" (text area).
  - "2. Practice area" and "Jurisdiction (a state, federal, or any)" side by side.
  - "3. When to use it", hint "What starts it: a new client signs, a court notice arrives, the first of the month."
  - "4. Roles", hint "Who owns it, who does each part, and which parts only an attorney may do. One per line."
  - "5. What you need first", hint "One per line. Describe documents and access; never paste real client data."
  - "6. Steps (at least 3)": per step a block "Step <n>" with a text area, small boxes with placeholders "Who", "Tool", "Minutes", a dropdown aria-label "Delegation" (options "Delegation?", "Keep (attorney)", "Delegate", "Automate"), a box with placeholder "Decision point (if X, go to step N)", and buttons "Move up" (not on the first step), "Add a step below", "Remove" (red). Under the list: "+ Add a step".
  - Checkbox "7. This process has deadlines", then "Deadlines and timing", hint "Court or rule deadlines and your own target times. Write Check this: in front of anything you are not sure of."
  - "8. Quality checks", hint "How to tell each step and the whole job was done right. One per line."
  - "9. Attorney review and ethics points", hint "Where an attorney must review or sign. One per line."
  - "What must never be delegated".
  - "10. Templates and resources", hint "Files can also be attached on the Files view."
  - "11. Tools"; "12. Deliverables", hint "What is handed over at the end, and to whom."
  - "Note for this version", placeholder "What you changed (shows in Versions)".
  - Buttons "Save as a new version" (blue; toast "Saved as version <n>") and "Cancel".
- States: save conflict text "Someone saved a newer version while you were working. Your changes were not saved. Reload the document, then make your change again."
- UX observations (mine): A very long single form with one save at the bottom. Steps can move up but not down. Removing a step has no confirm. Numbering skips an item ("What must never be delegated" has no number).

### Tab "Chat" (legacy and standard documents)

- `pbChatView` (4017). A message list and a composer.
- Empty-state card: "Ask about this document ("Who does step 4?") or ask for a change ("Add a conflict check before step 2"). DELA proposes changes as suggestions; nothing changes until you or an editor accept it." (for non-administrators the ending is "an editor or the administrator accepts it.").
- Interactive elements: text area aria-label "Message about this document"; "● Talk" (if voice is on); "Send" (blue).
- States: status "DELA is thinking..."; browser confirm on a client-information warning ("This may include <kinds>. Send anyway? Only if it has no client information."); browser confirm on the member's own AI key failing ("<failure text> Use Lawfecta's DELA actions this time?"); DELA's reply may end with "This change is waiting on the Suggestions view." and " It removes an attorney review point, so only the administrator can accept it."
- UX observations (mine): The reply says "Suggestions view" but the tab is named "Suggested edits (N)". The chat log lives only in the browser's memory and is lost on reload.

### Legacy tab "Suggested edits (N)"

- `suggestionsView` (4079). One card per suggestion: heading "From DELA chat: <note>" or "From <person>: <note>" (fallback "Suggested change"); badge "Removes an attorney review point" (red) when it applies; "<date time> | made from version <n>"; a list of changes by part ("<Part>: Becomes: <text>", "Steps: Adds or changes: <text>", "Steps: Removes: <text>").
- Interactive elements: "Accept" (blue; disabled when stale; toast "Accepted. A new version was saved."), "Reject" (opens a browser prompt "Why not? (optional, the author sees this)"; toast "Rejected").
- States: "No suggestions waiting."; stale notice "The document changed after this was suggested, so it cannot be applied as it is. Ask DELA again in Chat."; "No visible change."; for people who cannot decide: "Waiting for the administrator." or "Waiting for an editor or the administrator."
- Variations: a comment suggestion, or one that removes a review point, needs the Administrator; other DELA suggestions need Editor+.

### Tab "Comments (N)" (legacy and standard documents)

- `commentsView` (4100). One card per comment (resolved ones faded): "<person> on <part or step n>", date time, the comment, and either "Has a suggested change waiting on the Suggestions view.", a "Mark done" button (Editor+), or a "Done" badge.
- Empty states: "No comments yet. The approved version is read-only: to comment, start a new draft. The approved version stays in use until the new one is approved." with button "Edit a new draft"; or "No comments yet. In "<tab name>", click "Comment" beside any part." with button "Go to <tab name>" where the tab name is "Draft and review", "New draft" or "Draft (version <n>)".
- UX observations (mine): The empty-state text tells people to click "Comment" beside a part, but the standard document editor in this range has no "Comment" button (only the legacy Read tab does). The empty-state buttons call the standard-document drawer even on a legacy document (possible defect).

### Tab "Activity"

- `activityView` (4120). One card: "Every event on this document, newest first. Nobody can edit or delete these lines." then a list "<event> by <person or DELA>, version <n> (<format>)" with date time.
- Event words (`ACTION_WORDS`, 3389): "Created", "First draft by DELA", "Drafted by DELA from a file", "Built from a Scribe guide", "Edited", "DELA filled in answers", "Sent for review", "Approved", "Suggested a change", "Accepted a suggestion", "Rejected a suggestion", "Commented", "Restored an earlier version", "Exported", "Archived", "Brought back from the archive", "Moved to the trash", "Restored from the trash", "Attached a file", "Removed a file".

### Tab "Versions"

- `versionsView` (4128). A list: "Version <n> (current) (approved)", "<date time> by <person>: <note>", buttons "View" and (Editor+, not the current one) "Restore".
- "Restore": browser confirm "Restore version <n>? It is saved as a new version; nothing is lost."; toast "Restored as version <n>".
- "View": opens a drawer titled "Version <n>" showing the legacy Read layout, read-only.
- UX observations (mine): The version drawer always uses the legacy 13-part layout, so a standard-format version may show mostly "Not filled in yet." (unclear from code how it renders for standard documents).

### Tab "Files (N)"

- `pbFilesView` (4153). Card text: "Templates, forms and checklists kept with this document. They come from your firm's Files page; new versions of a file follow automatically."
- Interactive elements: per file "Open" and (Editor+) "Remove"; a dropdown aria-label "Attach a file" whose first option is "Attach a file from Files" (Editor+ and switch `file_uploads`); choosing a file attaches it at once.
- States: "No files attached."

### Legacy tab "Export"

- `exportView` (4170). Note: "Every file shows the version and date in its footer, so older copies are easy to spot." plus, when not approved, " This version is not approved yet, and the footer says so."
- Five blue buttons with a grey note each: "Word (.docx)" ("For Word, Google Docs, Waybook, Monday Docs and Notion."), "PDF" ("Opens a print view; choose Save as PDF."), "Markdown (.md)" ("For Notion, Confluence and ClickUp."), "Web page (.html)" ("For Notion, Trainual and any knowledge base."), "Step checklist (.csv)" ("For Monday, Excel, Google Sheets or a Notion table.").
- States: toast "Downloaded <file name>"; PDF needs a pop-up window: "Allow pop-ups for this site to print to PDF."

### "DELA's questions" card (legacy and standard documents; Editor+)

- `questionsCard` (3880). Blue-bordered card: h2 "DELA's questions", a numbered list of questions, sensitive-data line, a text area (aria-label "Your answers", placeholder "Answer any of the questions here, in your own words"), buttons "● Talk" (if voice on), "Fill these in" (blue), "Not now" (hides the card).
- States: "DELA is updating the document..."; browser confirm on a client-information warning.
- UX observations (mine): One answer box for all questions; "Fill these in" does nothing when the box is empty, with no message.

---

## Document page, document standard (SOP, Workflow, Playbook, Policy) (attorney, and freelancer agencies that hire)

- How to reach it: open a document on the standard from the Library. `drawDocument` (11288).
- Purpose and primary focus: write and check one document against the quality check, then approve it. The main thing on the page is the editor with the quality check beside it.
- Layout, top to bottom:
  1. Lock notice (same text as legacy) with upgrade button.
  2. "← Library".
  3. h1 "<Document ID> <title>", a type badge ("SOP", "Workflow", "Playbook" or "Policy") and the status badge.
  4. One of these notices: "Draft, not approved. Do not use this as an approved procedure." (plus " The approved version <n> stays in use until this one is approved." and button "View the approved version"); or "New draft. Your first save makes version <n> as a draft; the approved version <n> stays in use until the draft is approved."
  5. Conversion notice (documents moved from the old format): "DELA moved this to the document standard as <Type> (<note>). Check it, then approve it again." with a type dropdown, "Change type" and "The type is right".
  6. Type suggestion notice: "DELA thinks this fits a <Type> better: <reason>" with "Switch to <Type>" and "Keep <Type>".
  7. Green one-off notices returned by the last save.
  8. Automate-or-delegate hint card (`automateCard`, outside this range) when switch `automate_delegate` is on, the document has an approved version and is not a Policy.
  9. Freelancers-who-fit card when switch `talent_search` is on, the member can hire, not a Policy, not editing.
  10. Header fields grid (hidden on the approved view): "Document ID", "Version", "Owner (role)", "Last reviewed", "Next review", "High risk".
  11. Tab strip.
  12. Tab content.
  13. Administrator row: same archive and delete buttons, confirms and toasts as the legacy page.
- Content and data shown: "Document ID" or "Not given yet (given at the first save)"; "Last reviewed": a date, "Never reviewed since approval" or "Not reviewed yet"; "Next review": a date, "3 months after approval" (high risk) or "12 months after approval".
- Interactive elements:
  - Dropdown aria-label "Owner (role)": one option per role on the document. Disabled when read-only.
  - Checkbox aria-label "High risk (trust, conflicts or deadlines)", visible text "Trust, conflicts or deadlines (reviewed every 3 months)".
  - Conversion notice: dropdown aria-label "Change the type" with "SOP", "Workflow", "Playbook", "Policy"; "Change type" (toast "Now a <Type>"); "The type is right".
  - Tabs. Without an approved version: "Draft and review", "Chat", "Suggested edits (N)", "Comments (N)", "Activity", "Versions", "Files (N)". With an approved version and no draft open: the first tab is "Approved version". With an approved version and a draft: "Approved version" then "New draft" or "Draft (version <n>)".
- States: editing is off when the member is below Editor, the document is archived or in the trash, or the plan lock applies.
- Variations: Policy documents have no images, no automate card and no fit card.
- Mobile/accessibility: tabs use `role="tab"` and `aria-selected`.
- UX observations (mine): Up to five stacked notices can appear above the editor. There is no "Export" tab here; export lives inside the Quality check card. Owner and High risk changes are saved only by the "Save" button further down, with nothing saying so.

### Tab "Approved version" (approved-document page)

- `approvedPage` (11377). Read-only.
- Layout:
  1. Card h2 "Approved version <n>" with a grid: "Document ID" (or "Not recorded"), "Version", "Approved" ("<date> by <person>" or "Date not recorded"), "Owner (role)" (or "Not set"), "Last reviewed" (or "Never reviewed since approval"), "Next review" (or "Not scheduled").
  2. Notes: "Some details were not recorded when this version was approved. They are added when a new draft is approved." (older documents); "This is the version in use: new gigs, standing arrangements and exports use it." (plus " The document is archived." or " The document is in the trash.").
  3. If a draft exists: notice "A draft (version <n>) is in progress. This approved version stays in use until the draft is approved."
  4. Action row, then an export row.
  5. Card "Quality notes (N)" when the check has open items: "What the quality check suggests for this version. They do not block anything, and they do not confirm the document is legally correct. To act on them, start a new draft; the approved version stays in use until the new one is approved." Items show "✕ <label>" with badge "Required before approval" (red) or "! <label>" with badge "Suggestion" (yellow), plus a detail line.
  6. The document body as it exports: h3 per section, paragraphs, numbered or bulleted lists with images, tables. Empty sections say "Not set".
- Interactive elements: "Open the draft" (when a draft exists) or "Edit a new draft" (Editor+); "Post as a Flex Gig" (SOP or Workflow, status Approved, no draft open, switch `flex_gigs`, Administrator); export buttons after the label "Export the approved version: ": "Word", "PDF", "Markdown", "Web page", "Step checklist". Images open full screen on click.
- UX observations (mine): Export labels here are short ("Word") while the legacy Export tab uses "Word (.docx)". "Post as a Flex Gig" is a ghost button here and a blue button on the draft page.

### Tab "Draft and review" (also named "New draft" or "Draft (version n)"): the review screen

- `reviewScreen` (11431). Two columns (`doc-grid`): left the editor, right the checks.
- Right column, top to bottom: "Quality check" card; "Check images" card (only at a due review); "DELA's questions" card (if any).
- Left column, top to bottom: the document editor card; "RACI" card (SOP and Workflow); "KPIs (3 to 5)" card (Workflow); collapsed "Change log (N)".

#### "Quality check" card

- Heading "Quality check" is a glossary term. Glossary text: "Checks DELA runs on how a document is written. Items marked Required before approval block export, approval and gigs until fixed. Items marked Suggestion do not block anything."
- Intro: "Items marked "Required before approval" must be fixed first. Items marked "Suggestion" are optional. These checks look at how the document is written; they do not confirm it is legally correct."
- Summary line, one of: "Export, approval and Flex Gigs are blocked until the items marked "Required before approval" are fixed." (red notice); "Nothing blocks this document. Look at the items marked "Suggestion"."; "Every check passes."
- Items: "✕ <label>" badge "Required before approval" (red); "! <label>" badge "Suggestion" (yellow); "✓ <label>" badge "Passed" (green). Passed items are folded under a collapsed line "<N> checks passed".
- Interactive elements:
  - Per open item (Editor+ and the item has a fix): button "Fix it: <first part of the item label, cut at 48 characters>" (label becomes "Fixing..." while it runs), or "Split into linked SOPs" (becomes "Splitting..."; afterwards a green notice "Split into linked SOPs. New: <titles>."). For an image item the "Fix it: ..." button opens the "Review image" window.
  - "Save" (blue; Editor+).
  - "Send for review" (Editor+, status Draft; disabled while blocked; toast "Sent to the administrator for review").
  - "Approve" (Administrator, Draft or In review; disabled while blocked or while images are due; tooltip "Fix the blocking items first" or "Mark every image "Still current" or replace it in Check images first"; toast "Approved").
  - "Post as a Flex Gig" (status Approved, SOP or Workflow, switch `flex_gigs`, Administrator; disabled while blocked).
  - "✦ Explain these findings" (when there are open items): an AI helper (`helperButton`, line 5708, outside this range) that lists "<item label>: <explanation>". Fallback text: "DELA could not explain these. Read each item's own note above."
  - Export row, label "Export: " or "Export this draft (marked DRAFT on every page): ", buttons "Word", "PDF", "Markdown", "Web page", "Step checklist" (all disabled while blocked).
- UX observations (mine): The card mixes three jobs: the check list, the workflow actions (Save, Send for review, Approve, Post as a Flex Gig) and export. "Save" appears twice on the page (here and at the bottom of the editor). The disabled "Approve" explains itself only through a hover tooltip.

#### "Check images" card

- `checkImagesCard` (12142). Shown only when the document is due for review and has images.
- h2 "Check images"; text "This document is due for review. Software screens change, so mark each image "Still current" or replace it. You can approve once every image is checked." or "Every image is checked."
- Per image: thumbnail, bold location ("Step <n>", "Stage <n>", "Before you start", "Swimlane chart", "Scripts and templates", "Examples"), caption or "No caption", buttons "Still current" (blue) and "Replace" (opens a file chooser, then the "Review image" window).

#### Document editor card

- `docEditor` (11525). Always starts with "Title". Sections then depend on the type. Every list box has the placeholder "One per line". Read-only members see the same fields disabled.
- SOP sections, in order:
  - "Purpose" (2 rows); "Scope" (2 rows); AI button "✦ Improve this section" (can apply a suggestion to Purpose or Scope).
  - "Trigger" (one line).
  - "Roles": one box labelled "Roles (from your firm profile; roles, never names)", comma separated.
  - "Before you start" (list) with an image area.
  - "Steps" (the steps editor, below); AI button "✦ Check these steps" (results labelled by "Step"; can apply a rewritten step).
  - "Decision points and escalation" (decisions editor).
  - "Timing" (2 rows) plus the rule row.
  - "Quality check" (list) and "Reviewed by (role)".
  - "Done when" (2 rows) and "Saved in".
  - "Related links" (links editor).
- Workflow sections: "Name and process owner" ("Process owner (one role)" and the Roles box); "Start and end points" ("Starts when", "Finished when"); "Swimlane chart" (image area, text "Attach the chart of lanes and stages you drew elsewhere (for example in Visio or Lucidchart)."); "Stages, handoffs, target times and linked SOPs" (steps editor in stage mode); "Decision points".
- Playbook sections: "Situations covered"; "Guiding principles"; "Preferred approach" (3 rows); "Acceptable fallbacks" (hint "Options staff can use without asking"); "Hard limits" (hint "What nobody agrees to without attorney or partner approval"); "Escalation" (escalation editor); "Scripts and templates" (list plus images); "Examples" (hint "Short fictional scenarios. No client information.", plus images).
- Policy sections: "The rules" with two lists "What must happen" and "What must not happen"; "Exceptions and who approves them" ("Exceptions" 2 rows, "Approved by (role)"); "Related links".
- Bottom: "Save" (blue; Editor+).
- Rule row (`ruleFields`, 11577), used under Timing and on every step: label "Court rule, statute or filing deadline:", box placeholder "Rule or statute", box placeholder "https:// link to the rule", date input labelled "Verify by".
- Steps editor (`stepsEditor`, 11587), one card per step (border changes color when the attorney decides):
  - Header: "Step <n>" or "Stage <n>"; badge "Attorney decides" (red) when ticked; buttons "↑" (aria-label "Move step <n> up", disabled on the first), "Remove" (aria-label "Remove step <n>"), "🖼 Add image" (aria-label "Add image to step <n>").
  - Workflow only: "Stage name".
  - "What to do (one action, starting with a verb)" (2 rows).
  - Image area; on the first step with no images yet: "Tip: Take a screenshot, click a step, and paste it here."
  - Row: dropdown "Role" (Workflow: "Lane (role)"), first option "Choose", then the document's roles; "System"; "Menu path and buttons" (placeholder "[Add the menu path in your system]").
  - Workflow only row: "Handoff (what passes, where, how the next person is told)"; "Target time"; "Linked SOP" (placeholder "For example INT-01").
  - Checkboxes: "Attorney decides (the A must be an attorney role)"; "Not a judgment step" (hidden while "Attorney decides" is ticked).
  - The rule row.
  - Under the list: "Add a step" or "Add a stage".
- Decisions editor (`decisionsEditor`, 11620): per row "If", "Then", "Escalate to (role)", checkbox "Attorney decides", "Remove". Button "Add a decision point".
- Links editor (`linksEditor`, 11632): per row a box with placeholder "Template, form, policy or SOP", a box with placeholder "https:// or a document ID such as INT-01", "Remove". Button "Add a link".
- Escalation editor (`escalationEditor`, 11641): per row "Issue", "Who decides (role)", "How fast", "Remove". Button "Add an escalation".
- States: save uses the version check; a conflict shows "Someone saved a newer version while you were working. ...". Read-only plan: limit pop-up.
- Mobile/accessibility: every input has an aria-label that includes the step number.
- UX observations (mine): Steps can only move up ("↑"), never down, and there is no drag handle for steps. "Remove" on steps, decisions, links, escalations and KPIs has no confirm and no undo before saving. Most edits redraw the whole document, which can lose scroll position and focus. Step cards are dense: up to 11 inputs and 2 checkboxes each for a Workflow. Changes are kept in memory until "Save"; there is no unsaved-changes warning in this range, except that images save at once (see Images).

#### "RACI" card (SOP and Workflow)

- `raciGrid` (11653). h2 "RACI"; text "R does the work, A owns the outcome and signs off (exactly one per step), C gives input before, I is told after. Keep C's to 2 or fewer. Click a cell to change it, then Save."
- A table: first column "Step" (or "Stage") with "<n>. <first 60 characters>", then one column per role. A row that does not have exactly one A is marked and its label ends " (needs exactly one A)".
- Interactive elements: each cell is a button that cycles on click through empty ("·"), "R", "A", "R+A", "C", "I". aria-label "Step <n>, <role>: <value or empty>".
- Mobile: table uses the stacked layout (`class="stack"`, `data-label` on cells) inside a scroll wrapper.
- UX observations (mine): Cycling through six states by repeated clicks is slow and easy to overshoot; there is no keyboard shortcut or menu.

#### "KPIs (3 to 5)" card (Workflow)

- `kpiCards` (11674). Text: "Each KPI needs a data source in a system you use: the exact report or field. No baseline yet? Write "measure for 30 days first"."
- Per KPI: "KPI", "What it measures", dropdown "Leading or lagging" ("Choose", "Leading", "Lagging"), "Data source (report or field)", "Owner (role)", "Baseline", "Target", "Review rhythm" (placeholder "weekly, monthly or quarterly"), "Remove".
- Button "Add a KPI" (hidden at 5).

#### "Change log (N)" (collapsed)

- `changeLogCard` (11488). A collapsed section with a table: "Date", "What changed", "Who", "Approved by". Stacked on phones.

### Tab "Suggested edits (N)" on a standard document

- `docSuggestionsView` (11688). Per suggestion: bold note (fallback "A suggested change"), "<person>, <date time>" plus ". It removes an attorney decision, so only the administrator can accept it." when it applies; buttons "Accept" and "Reject" (Editor+). Toasts "Accepted" / "Rejected". Empty: "No suggestions waiting."
- UX observations (mine): Unlike the legacy tab, this one does not show what would change, shows Accept to Editors even when the text says only the administrator can accept, and Reject asks for no reason. Legacy wording is "attorney review point"; here it is "attorney decision".

---

## Images in documents: image areas, "Review image" window, full-screen viewer

- Where: on steps and on some sections of a standard document. Only when images are on for the library (`image_settings.on`) and the document is not a Policy. Code 11770 to 12189.
- Image area (`imageSlot`, 11823):
  - Button "🖼 Add image" (aria-label "Add image to <place>"); file chooser accepts PNG and JPEG. Images can also be pasted or dragged onto the step or section (the area gets a drop highlight).
  - Each image shows its caption (or "No caption yet") and, when editable, tools "Edit", "Replace", "Remove" (shown by clicking the image frame). Images can be dragged to reorder within the step. Clicking the image opens it full screen.
  - Warnings under an image: "DELA's check thinks this image may show client information. Click Edit to blur it or confirm it shows none."; "No client-data check yet. Click Edit to confirm it."; "Confirmed at import".
  - Errors: "Use a PNG or JPG image."; "This image is over <n> MB. Try a smaller screenshot."; "Each step can have <n> images. Split this step to add more." (defaults: 5 MB, 3 per step, caption 120 characters).
  - A thin progress bar shows upload progress.
  - Every image change saves the document at once as a new version, with notes "Added an image", "Replaced an image", "Edited an image", "Removed an image", "Reordered images", "Fixed an image".
- "Remove this image?" pop-up (`askRemove`, 11907): text "It stays in older versions of this document."; buttons "Cancel", "Remove" (red).
- "Review image" window (`reviewImage`, 11971), a centered pop-up with a dimmed backdrop, closes on Esc:
  - Toolbar (aria-label "Drawing tools"): toggle buttons "Box", "Arrow", "Blur" (one active, `aria-pressed`), and "Undo".
  - Yellow bar when the in-browser text reader finds possible client information: "We found <n> item(s) that may be client information." with button "Blur all flagged"; afterwards "Every flagged item is blurred. Check the rest of the image yourself." Flagged text is outlined in yellow on the image; clicking inside an outline blurs that item.
  - Status lines: "Reading the image for names, emails, phone numbers, case numbers and account numbers..."; "DELA did not find anything that looks like client information. Check the image yourself before you save."; "DELA could not read the text in this image. Check it yourself for client information before you save."; "This image could not be opened. Use a PNG or JPG image."; "This image is not available."
  - Red notice for a held image: "DELA's check thinks this image may show client information. Blur it, or confirm below that it shows none."
  - The image canvas (aria-label "The image. Drag on it to draw."). Drag to draw a red box, a red arrow or a blur.
  - Field "Caption (what should the reader look at?)", hint "Up to <n> characters. It is also the text a screen reader reads."
  - Checkbox "This image contains no client information, passwords or account numbers."
  - Buttons "Cancel" and "Save image" (disabled until there is a caption and the box is ticked; tooltip "Add a caption and confirm there is no client information.").
  - Toasts: "Saving the image. It appears under the step in a few seconds."; "Image saved"; "Saved. DELA's check thinks this image may show client information, so the document is blocked until you blur it or confirm it shows none."
- Full-screen viewer (`imgFull`, 11795): role dialog, aria-label "Image, full screen"; "✕" button (aria-label "Close the image"); caption below; closes on Esc or a click on the backdrop. Right-click is blocked and there is no download button.
- Read-only images (`imagesRead`, 11809): full width with caption. Fallback texts: "Images are hidden now that this engagement has ended." or "This image is not available."
- "Check the images" pop-up before creating a gig from a document with images (`gigImageWarning`, 12182): "The freelancer will see <n> image(s) in this document. Check that none show client information."; buttons "Review images" (opens the document) and "Continue".
- Other image error texts (`DOC_ERR` additions, 11776): "Images are not open for your account yet."; "Policies stay text only, so they have no images."; "Add a caption: what should the reader look at?"; "Tick the box to confirm the image has no client information, passwords or account numbers."; "That file is not a real PNG or JPG image, so DELA did not keep it."; "This document is due for review. In "Check images", mark every image "Still current" or replace it, then approve."; "Open the image to fix it."; "Your firm's storage is full. Remove files you no longer need, or upgrade your plan."; "Keep the caption to <n> characters."
- Mobile/accessibility: the modal has `aria-modal`; the comment in code says pinch to zoom works on a phone in the full-screen viewer; image tools appear on tap. The flag scan loads a text-reading library from a CDN the first time.
- UX observations (mine): Image tools are hidden until the frame is clicked, and the same click target also opens full screen when the click lands on the picture. The blur cannot be undone after saving, which the window does not say (the Scribe blur drawer does say "Saving replaces the screenshot with the blurred one."). Two different blur tools exist: this window and the simpler drawer on the import review screen.

---

## "Import a guide from Scribe" (Editor+)

- How to reach it: "Import from Scribe" (table view) or "Import" then "From a Scribe guide" (card view). Needs `L.scribe_on`. `startScribe` (4250). Replaces the Library page.
- Purpose: pick an exported Scribe file so DELA can read its steps and screenshots.
- Layout: card h2 "Import a guide from Scribe"; numbered steps "In Scribe, open the guide.", "Click Share, then the Export tab.", "Click Export next to HTML (or Markdown) and save the file.", "Choose that file below."; a long note beginning "DELA reads the steps and screenshots, then shows them on a review screen where you check screenshots for client information, blur parts, fix steps and add why each step matters. Then DELA builds the document. Free Scribe accounts: open the guide's share page, press Ctrl+P (Cmd+P on a Mac), choose Save as PDF, upload it on the Files page, and ask DELA to turn it into a document."; sensitive-data line; checkbox "This guide and its screenshots have no confidential client information."; a row with the file input, "Read the guide", "Cancel"; a status line.
- Interactive elements: file input aria-label "Choose a document file" (accepts .html, .htm, .md, .markdown, .txt); the checkbox; "Read the guide" (blue); "Cancel".
- States: toasts "Choose the exported Scribe file first."; the tick-needed and file-too-big texts from the shared error list; status "This does not look like a Scribe export: no steps were found. In Scribe, open the guide, click Share, then Export, then Export next to HTML or Markdown, and choose that file."; "Saving screenshot <n> of <total>..."; skipped image "DELA only fetches screenshots from Scribe's own image addresses. This one was skipped: <host>."; "Import from Scribe is not open for your account yet."

---

## Import review screen: "Review your guide" / "Review your recording" (Editor+)

- How to reach it: after a Scribe import, from an "Imported, waiting for review" card, from "Review" in the imports list, or "Review" on a recording that is "Ready for review". `openImport` (4324), `drawImport` (4335).
- Purpose and primary focus: check each step and screenshot for client information, then click "Build my document".
- Layout, top to bottom: "← Library"; h1 "Review your guide" (Scribe) or "Review your recording" (recorder); intro "Check every screenshot for client information, blur anything private, fix the steps, and add why each step matters. Nothing goes to the AI until you click Build my document."; card with "Title"; one card per step; for recordings the "What you said" card; a final card with the sensitive-data line, "Anything to add", and the build buttons.
- Step card: heading "Step <n>" (recordings also show "at <m:ss>"); the step text area; the screenshot with its controls; for recordings, "You may want to add these (click one to use it)" with small alternative screenshots; a note box (placeholder "Why this step matters, or what to watch for (optional)"); a row of step buttons.
- Interactive elements:
  - "Title" box. Saves when changed.
  - Step text area (aria-label "Step <n>"). Saves when changed.
  - Checkbox "Use this screenshot".
  - "Blur part of this image": opens the blur drawer.
  - "It has no client information" (only on a held screenshot): browser confirm "Confirm this screenshot has no confidential client information."
  - Alternative screenshot thumbnails: click, then browser confirm "Use this screenshot for this step instead?"
  - "Merge with step above" (not on the first step), "Add a step here", "Remove step" (red, no confirm).
  - Text area under "Anything to add", placeholder "Anything else DELA should know: who does this, what starts it, what done looks like, where an attorney must check."
  - "Build my document" (large): browser confirm "Check your screenshots for client information before DELA builds your document. Build it now?"; label becomes "Building...".
  - "Discard": browser confirm "Discard this import?"
- "What you said" card (recordings only; `recorderPanel`, 4890): text "Fix names or terms. Lines marked private, and screenshots taken while you said them, never go to the AI."; per line a time stamp, an editable text box (aria-label "Transcript at <m:ss>") and a checkbox "Mark as private". Empty: "No speech was found in this recording."
- Badges on screenshots: "May show client info" (red), "Screenshot not accepted" (red).
- States: build failure toast; "A screenshot is waiting for your client information check. Confirm it has no client information, or untick it, then build again."; browser confirm "The steps may include <kinds>. Build anyway? Only if there is no client information."
- "Blur part of this image" drawer (`blurTool`, 4403): h2 "Blur part of this image", "Cancel"; text "Drag a box over anything private. Drag again for more boxes. Saving replaces the screenshot with the blurred one."; the image canvas (crosshair cursor); button "Save the blurred screenshot". Toasts: "The screenshot is still loading."; "Drag a box over the part to blur first."; "Blurred screenshot saved"; "The screenshot could not be opened for blurring. Untick it instead."
- UX observations (mine): Every edit auto-saves silently with no saved indicator. Up to four browser confirm boxes can appear on this screen. The blur drawer has no undo. Steps cannot be reordered, only merged, added or removed.

---

## "Recordings" card (Editor+)

- How to reach it: in the table view it is always at the bottom of the Library. In the card view click the "Recordings" link near the bottom. `recordingsCard` (4504).
- Purpose: see past recordings, their status and when the video is deleted; start a new recording.
- Layout: h2 "Recordings" with button "Record a process" (only when the recorder is on for the account); note "Videos are kept <n> days on your plan, then deleted; the document you build stays. Storage used: <x> of <y>."; an alert if an upload was interrupted; the table.
- Table columns: "Process name", "Date recorded", "Length" ("<m> min <s> s"), "Status", "Video deletes on", and an unnamed actions column.
- Status words (`REC_STATUS`, 4457): "Recording", "Uploading", "Analyzing", "Ready for review" (green), "Could not analyze" (red, with the error in brackets), "Discarded"; plus "Upload did not finish" (red; tooltip "The rest of this recording is not in this browser, so it cannot finish. Remove it and record again.") for an upload stuck more than 15 minutes. Other badge: "Deletes in <n> days" (when 3 days or fewer remain). Cell text "Video deleted on <date>".
- Interactive elements (row actions): "Review" (ready, not yet built); "Open document" (already built); "Remove" (stuck upload; browser confirm "Remove this recording? It did not finish uploading, so there is nothing to build from it. Record the process again."; toast "Recording removed"); "Try again" (failed; toast "Analyzing again"); "Download video"; "Delete video" (red; browser confirm "Delete this recording's video and screenshots now? A document built from it stays."; toast "Video deleted"). Alert button "Finish upload" (toasts "Finishing the upload...", "Upload finished").
- States: "Loading recordings..."; "No recordings yet."; "The Process Recorder is not open for your account yet."; alert "Your last recording didn't finish uploading."; toast "Preparing the video...". The card refreshes itself every 8 seconds while something is uploading or analyzing.
- Mobile: the table becomes one block per recording on a phone (`class="stack"`, `data-label`).
- UX observations (mine): Up to four buttons can sit in one row's action cell. "Remove" and "Delete video" are different actions with similar names.

---

## "Record a process" page (attorney; Editor+ to reach from the card)

- How to reach it: "Record a process" in the Recordings card, or the direct link `?tab=record` (attorney only, switch `playbook_library`; it opens the Library and then this page; page name "Record a process"). `recordView` (4612).
- Purpose and primary focus: name the process and click "Start recording".
- Layout, top to bottom: "← Library"; a dark banner with badge "DELA RECORDER", h2 "Record a process", text "Do the task the way you always do and talk through each step. DELA turns it into a document you can hand off."; one card with the form.
- Form on a computer: "Process name" (placeholder "Example: File a motion and upload it to Clio"); "Microphone" dropdown (first option "Default microphone", then each device, fallback "Microphone <n>"); a live level bar (aria-label "Microphone level"); a consent checkbox whose text comes from the server (only until consent has been given once); a yellow box "💡 Before you start" with four points: "Close email and chat windows you don't need.", "Keep the whole process on one screen.", "Say out loud what you are doing and why.", "For the beta, record a practice run or non-client work. Confidential client information does not belong in DELA."; "Your plan allows recordings up to <n> minutes."; buttons "Start recording" (large, blue) and "Upload a recording" (ghost).
- On a phone, tablet or unsupported browser: notice "Screen recording isn't available in this browser. Open DELA in Chrome, Edge, Firefox or Safari on a computer, or upload a recording you made elsewhere."; the consent checkbox; "Upload a recording" (blue).
- Interactive elements: as listed. Both buttons stay disabled until consent is given. "Upload a recording" opens a hidden file chooser (aria-label "Choose a video file"; MP4, WebM, MOV).
- States: toast "Give the process a name first."; microphone blocked: "DELA could not use a microphone. Allow the microphone for this site (the icon left of the web address), then reload. You can still record without talking, but the steps will be less clear."; wrong share choice: "DELA needs your entire screen so it can follow you between programs. Click Start recording again and choose Entire Screen."; Mac block: "Your Mac blocked screen recording. Open System Settings. Go to Privacy & Security, then Screen & System Audio Recording. Turn on your browser. Quit and reopen the browser."; other: "Screen sharing was blocked or cancelled. Click Start recording again and choose Entire Screen."; "Recording could not start. Please try again."
- Upload messages: "Upload an MP4, MOV or WebM file."; "This browser cannot open that video. Try an MP4 or WebM file, or open DELA in Chrome."; "That recording is longer than your plan's <n> minutes."; "Uploading a recording needs Chrome, Edge or Firefox on a computer."; "Reading your recording. This takes about half its length. Keep this tab open."
- UX observations (mine): The page asks for microphone permission as soon as it opens, before the member has done anything. The disabled buttons do not say that the consent box is what unlocks them.

### While recording: "Recording: <name>"

- `runRecorder` (4716). h1 "Recording: <name>"; a sticky red-bordered bar with "● Recording", a timer ("0:00", plus " (paused)"), and buttons "Pause" (becomes "Resume") and "Stop and save"; a hidden-until-needed notice "2 minutes left. DELA stops and saves at <n> minutes."; text "Do the task now in any program. You can leave this tab." followed by "A small control window stays on top of your other programs." (Chrome and Edge) or "Use your browser's Stop sharing bar, or come back here, to stop."
- The same controls appear in a small always-on-top window where the browser allows it. The browser's own "Stop sharing" also stops and saves. The recording stops by itself at the plan's limit.

### After stopping: "Saving your recording"

- `processingCard` (4846). h1 "Saving your recording"; three pills showing progress, "Uploading", "Analyzing", "Ready for review" (the current one is highlighted, the others faded); text "You can leave this page. We'll email you when your recording is ready to review."; button "Back to the library".
- Problem text: "Some pieces did not upload. Open Library and click Finish upload." or "The upload did not finish. Open Library and click Finish upload."
- UX observations (mine): "Ready for review" never lights up on this page (the code only shows the uploading, analyzing and problem states here).

---

## "Get set up" (attorney)

- How to reach it: menu "Get set up" (`?tab=setup`), the Home card button "Continue setting up", or the link "See all setup steps". Switch `guided_setup` on, attorney side only. `setupView` (11228), `setupStep` (11257). The menu item is dropped from the second menu group once setup is finished or dismissed (line 227).
- Purpose and primary focus: work through six steps to the first gig, each opened in place.
- Layout, top to bottom: h1 "Get set up"; intro "Six steps to your first gig. Each one opens here. Skip any step and come back to it later."; a status line area; progress text "<done> of <total> done." (or "... done. You are set up."); six numbered cards.
- The six steps (`SETUP_STEPS`, 11209), title and description:
  1. "Your profile and verification": "Your license and firm details, so you can hire."
  2. "Teach DELA about your firm": "Practice areas, the systems you use and your roles. DELA reads this each time it writes for you, only for your firm."
  3. "Your first document": "Import from Scribe, record a process, or start from a starter document. Then approve it."
  4. "✦ Find what to automate or delegate": "DELA reviews an approved document and suggests steps to automate or hand to a freelancer."
  5. "Post your first gig": "From the delegated SOP, or any approved SOP or Workflow."
  6. "Invite freelancers": "From your gig's matches."
- Each card: a number chip, the title, a badge "Done" (green), "Skipped" (yellow) or "To do", the description, then buttons.
- Interactive elements:
  - "Open" (blue) / "Close" (ghost): shows or hides the step's content inside the card. Only one step is open at a time.
  - "Skip for now" / "Pick up again" (hidden once the step is done). Status messages: "Skipped for now. It stays here for later." and "Back on your list."
- What opens inside each step:
  1. The whole Profile page (`profileView`).
  2. The firm profile form (`firmProfileForm`, line 10737). After saving: "Firm profile saved."
  3. The whole Library (`libraryView`).
  4. A dropdown "Approved document to review" (one option per approved document, "<ID> <title>") and under it the automate-or-delegate card for the chosen document. If there are none: "Approve an SOP or Workflow first (step 3)."
  5. The whole Projects page (`projectsView`).
  6. A list of open gigs, each with button "Open matches", which adds that gig's page (matches view) below. If none: "Post a gig first (step 5)."
- States: "Get set up is not open for your account yet."; load error in a red notice.
- Related: Home card "Get set up: <done> of <total> done" with a progress bar, link "Dismiss" and button "Continue setting up" (`setupHomeCard`, 11217, just above this range).
- UX observations (mine): Steps 1, 3 and 5 embed entire pages inside a card, including their own headings, back buttons and sub-navigation, so the layout nests deeply (for example the Library's "← Library" inside a setup card). In step 6 each click on "Open matches" adds another gig page below without removing the previous one. The intro says "Six steps" as fixed text while the count line uses the server's total.

---

## "Attorney decisions" card: checkpoints inside an engagement (both)

- How to reach it: a card on the engagement page (the page itself is outside this range) when the document has steps marked "Attorney decides". `checkpointsCard` (11747).
- Purpose: the freelancer asks the attorney to decide at a marked step, and the attorney approves it.
- Layout: h2 "Attorney decisions"; intro "These steps need the attorney's decision. The work waits at each one until the attorney approves it here." or, when the engagement is completed or canceled, "These steps were for the attorney to decide. The engagement is closed, so nothing more is needed here."; one row per step: "Step <n>: <text>" with a status badge.
- Status words: "Approved by <person>: <note>" (green); "Waiting for the attorney: <note>" (yellow); "Not reached yet"; "Not used: the engagement closed without it".
- Interactive elements:
  - Freelancer, step not reached yet: note box (aria-label "Note for step <n>", placeholder "Anything the attorney should know (optional)") and button "Ask the attorney to decide". Message after: "The attorney was asked to decide."
  - Attorney, step not approved: note box (placeholder "A note with your decision (optional)") and button "Approve this step". Message after: "Approved. The freelancer can go on."
- Variations: closed engagements show no buttons.
- UX observations (mine): The attorney can approve a step the freelancer has not asked about yet. There is only "Approve"; no way to decline or ask for changes here. The whole status sentence, including the note, sits inside the badge, which can get long.

---

## Smaller document pieces used on gig pages (in this range, shown elsewhere)

- What the freelancer sees of a document on a gig (`docGigView`, 11701; freelancer): "Purpose: <text>"; "Before you start" list with images; "Steps" numbered list ("<stage>: <text>", "Where: <menu path>", images) with the line "Attorney decides: ask the attorney inside the engagement before you go on." on marked steps; "Timing: <text>"; "Quality check" list; "Done when: <text>". Read-only.
- "Reference documents (read only)" card (`referencesBlock`, 11716; freelancer): one collapsed line per document, "<ID> <title> (<Type>)". A Playbook shows "Preferred approach: <text>" and "Hard limits: <a; b>". A Policy shows lines "Must: <text>" and "Must not: <text>".
- "Reference documents" card on the attorney's gig (`referencesEditor`, 11725; attorney): text "Attach approved Policies and Playbooks the freelancer should follow. They read them; they cannot change them."; per attached document a "Remove" button; a dropdown (aria-label "Reference document to attach"; "Loading...", then "Choose an approved Policy or Playbook" or "No approved Policies or Playbooks yet") and button "Attach" (toast "Attached").

---

## "Post a new gig" card (attorney, and freelancer agencies that hire) and gig wording (start of the Flex Gigs code)

- How to reach it: top of the Projects page (`projectsView` starts at line 5066, outside this range); also reached from "Post as a Flex Gig" on an approved document. `newGigCard` (5018).
- Purpose: turn an approved SOP or Workflow into a gig draft.
- Closed state (when there is already an open or draft gig): h2 "Post a new gig", button "Start a new gig", text "Turn an approved SOP or Workflow into a Flex Gig. One-off or monthly."
- Open state, top to bottom: h2 "Post a new gig"; text "DELA writes a public version of the document for freelancers. You check it, set the budget (at least <amount>) and the deadline, then post. Open gigs on your plan: no cap." (or "<used> of <limit> in use."); optional notice "Linked to: <job title>. Whoever you hire is listed on the attorney's "Who's working on this", as your subcontractor. Share with them only what their part needs." with button "Do not link"; the kind choice; "Document" dropdown; notes box; budget boxes; fee note; the button.
- Interactive elements:
  - Radio buttons "One-off" and "Monthly" (switch `recurring_engagements`), with the note "Monthly: the same work every month for a flat monthly price, until either of you cancels. The budget is the monthly price."
  - Dropdown "Document" (aria-label "Approved SOP or Workflow"): first option "Choose an approved SOP or Workflow" or "No approved SOPs or Workflows yet", then "<ID> <title>".
  - Text area, aria-label "Anything freelancers should know (optional)", placeholder "Anything freelancers should know (optional). No client information."
  - Number boxes "Budget from ($)" (placeholder = the smallest budget) and "Budget to ($)".
  - Button "Draft the gig with DELA" (blue; becomes "DELA is writing the public version..."). If the document has images, the "Check the images" pop-up comes first.
- Fee note (updates as you type): "The budget covers the work. " or "The budget is the monthly price for the work. ", then "Your platform fee (<n>%, at least <amount>) is added and shown before signing." (or "Your platform fee is added and shown before signing."), then " Estimated total: <amount> to <amount>." (with " each month" for monthly).
- States: toast "Choose an approved SOP or Workflow first."
- Gig status words defined here (`GIG_STATUS`, 4941): "Draft", "Open", "Paused by the Lawfecta Team", "Closed", "Filled", "Canceled". Proposal status words (`PROP_STATUS`, 4942): "Draft", "Sent", "Being checked", "Withdrawn", "Chosen", "Not chosen", "Closed". Engagement badge "Needs your signature" (`agBadge`, 4940).
- Color rule stated in code (4935): yellow needs you, blue in progress, green done, grey waiting on someone else, faded grey closed, red a problem.
- Public version block shown to freelancers (`publicBlock`, 4999): the task text; a grid "Budget", "Deadline", "Practice area", "State", "Usual time", "Status" ("Closes <date time>" or "<status> <date>"); "What done looks like: <text>"; h3 "Steps" numbered list; "Tools: <list>"; "Skills: <list>".
- A long list of gig, agency and bench error messages (`GIG_ERR`, 4943 to 4977) is defined here and used across the gig pages, for example "Flex Gigs are not open for your account yet.", "Posting work and hiring need a verified license. Open Profile and verification from your account menu.", "The deadline is in the past. Choose a later date.", "This gig is not available to your account. It belongs to another member, or it was removed." Computed ones: "The smallest gig budget is <amount>."; "You have no proposals left this month. Your allowance resets on <date>. Matches stay visible."; "Your plan's limit is reached (<n>)."; "This freelancer does not work for this gig's state."
- UX observations (mine): Error wording mixes "SOP or Workflow" with "document" and "playbook" names from older versions.

---

## Also in the ranges (not a page)

- Lines 12192 to 12195: the start of the appearance (light or dark) settings (`applyTheme`, `appearanceItems`). Only the first lines fall in this range; nothing to inventory here.
- Recorder plumbing with no screen of its own: unfinished recording pieces are kept in the browser (IndexedDB "dela-recorder") so "Finish upload" can resume them; only pieces saved by the same signed-in person are offered.

---

## Cross-page elements seen

- Back button "← Library" on every Library sub-page (document, import review, recorder).
- Status badges with shared colors: green `ready`, yellow `held`, red `bad`, plain for neutral.
- Shared status word sets: document status ("Draft", "In review", "Approved", "Archived", "In the trash"); workspace card status ("Ready to use (approved)", "Draft", "Needs your review"); recording status; quality item status ("Required before approval", "Suggestion", "Passed"); setup status ("Done", "Skipped", "To do").
- Library roles: "Administrator", "Editor", "Commenter", "Viewer".
- The sensitive-data line above every AI input, and "no client information" checkboxes before every upload.
- AI actions marked with "✦" ("✦ Help me create a document", "✦ Improve this section", "✦ Check these steps", "✦ Explain these findings", "✦ Find what to automate or delegate").
- "● Talk" voice button beside AI text areas.
- AI failure pattern: "Try again" and "Use Lawfecta's DELA actions this time"; client-information warning with a "send anyway" confirmation.
- Three kinds of overlay: side drawer (`showDrawer`: Library team, Version, Blur), centered modal (`modal`: Review image, Remove this image?, Check the images), and browser confirm/prompt boxes (delete, restore, build, discard, reject reason).
- Toasts (`D.toast`) for results; inline `role="status"` lines for progress.
- Export set, always the same five formats: Word, PDF, Markdown, Web page, Step checklist.
- Tables that stack on phones (`class="stack"` with `data-label`): Recordings, RACI, Change log.
- Pills with `aria-pressed` for filters; tab strips with `role="tablist"`.
- Lock line for downgraded plans: "🔒 Upgrade to edit this document."
- Glossary term component (`D.term`) used once here: "Quality check". Help tip component (`D.helpTip`) used once: "What does Ready to use mean?"

---

# PART D

# Inventory D: Projects, gigs, agency, standing arrangements, Talent invite

Source: `app/dela-app.js` lines 5066 to 7018 (read in full). New layout (`NL()`) only. The old one-long-page Projects layout (lines 5070 to 5120) is noted once under "Variations" of the Projects page and not described further.

Status words used across these pages (defined just outside the range, lines 4937 to 4942 and 8791):
- Gig status (`GIG_STATUS`): "Draft", "Open", "Paused by the Lawfecta Team", "Closed", "Filled", "Canceled". Badge tone: open = ready (green), paused = held (amber), filled = R, closed/canceled = off (grey), draft = no tone.
- Proposal status (`PROP_STATUS`): "Draft", "Sent", "Being checked", "Withdrawn", "Chosen", "Not chosen", "Closed".
- Engagement/agreement status (`AG_STATUS`): "Draft" (for both draft and sent), "Waiting for signatures", "Signed: waiting for the first payment", "Active", "Complete", "Canceled", "In dispute", "Paused by the Lawfecta Team". When the agreement waits on the member's signature the badge reads "Needs your signature" instead.
- Standing arrangement status (`STANDING_WORDS`): "Waiting for the freelancer", "Active", "Needs review", "Ending after open jobs", "Ended", "Declined".
- Bench status (`BENCH_STATUS`): "Invited", "On the bench", "Declined", "Left", "Removed", "Expired".

---

## Projects (workspace shell: header, four tiles, tabs) (attorney; also an agency owner who can hire)
- How to reach it: sidebar menu item "Projects", address `?tab=projects`. `projectsView()` line 5066, which calls `projectsWorkspace(el)` line 5360 in the new layout. Routed at line 12234 only when `canHire()` is true and switch `flex_gigs` is on.
- Purpose and primary focus: the hiring hub. The one main thing: see what waits on you and jump to it; second, start a new gig.
- Shown when: `canHire()` and `me.switches.flex_gigs`. If `gigs.id` is set the single gig page shows instead. If the new gig wizard is open (`gigs.wiz`) the "Post a New Gig" page shows instead. Arriving from a document, from a freelancer's profile ("for a specific freelancer") or from "Post a gig for part of this job" opens the wizard automatically once.
- Layout, top to bottom:
  1. Header row: `h1` "Projects" with a help icon beside it; sub-line "Manage your gigs, awarded work, milestones and standing arrangements."; on the right the "+ New Gig" menu button.
  2. Notices (conditional, see States).
  3. Four summary tiles in one row.
  4. Tab strip: "Overview", "Gigs", "Engagements", "Standing Arrangements".
  5. The tab panel (one of the four sub-views below).
- Content and data shown: the four tiles, each a big number plus a label plus a chevron icon:
  - "Needs action" (alert icon): count of items waiting (payments, deliverable reviews, signatures, proposals to review, questions to answer). Gets a highlighted "hot" style when the count is above zero. Shows "?" when engagements failed to load.
  - "Open and draft gigs" (work icon): gigs with status open, draft or paused.
  - "Active engagements" (projects icon): engagements not completed or canceled. Shows "?" when engagements failed to load.
  - "Standing arrangements" (swap icon): arrangements not ended and not declined.
- Interactive elements:
  - Help icon beside "Projects": tip text "Manage posted gigs, awarded work, milestones and standing arrangements." (aria label "About Projects").
  - "+ New Gig ▾" (blue button, a `details` dropdown). Menu items:
    - "From an approved document": opens the Post a New Gig page (keeps anything typed on a previous visit).
    - "Plan a task with Ask DELA": only when switch `ai_generation` is on and side is attorney; goes to the Ask DELA tab (`delegate`).
    - "Create a document first": only when switch `playbook_library` is on; goes to the Library tab.
    - Escape closes the menu and returns focus to the button.
  - Tile "Needs action": opens the Overview tab with the full attention list expanded.
  - Tile "Open and draft gigs": opens the Gigs tab with the "Open and drafts" filter.
  - Tile "Active engagements": opens the Engagements tab.
  - Tile "Standing arrangements": opens the Standing Arrangements tab.
  - Tabs "Overview" / "Gigs" / "Engagements" / "Standing Arrangements": switch the panel without reloading. Choosing a tab resets the gig filter to "Open and drafts" and clears the engagement status filter.
  - Link inside the "for a specific freelancer" notice: "Not for a specific freelancer" (clears the pending invitation).
- States:
  - Loading: `h1` "Projects" and "Loading...".
  - API error for gigs: a notice with the server's reason text (`gigErr`).
  - Cannot post yet (agency): "Your agency cannot post yet. You can still draft gigs. Open the Agency page to see what is missing."
  - Cannot post yet (attorney): "Posting work and hiring need a verified license. You can still draft gigs. Open Profile and verification from your account menu."
  - Creating for one freelancer: "You are creating a gig for {name}. Post it, and the invitation to {name} opens next. Not for a specific freelancer."
  - Whole-page failure: `h1` "Projects" plus a red notice with the error text.
- Help: tile aria labels read the count, the label and the help sentence. Help sentences (`PJ_HELP`): needs = "Items waiting for your review, approval, signature or payment."; gigs = "Work you created for freelancers. Drafts are not posted; open gigs can receive proposals."; engagements = "Work awarded to a freelancer, with its milestones, deliverables and approvals."; standing = "Ongoing work agreements with freelancers you have completed a gig with, inside limits you both signed."
- Variations: with switch `engagements` off, engagement cards on Overview are hidden and the Engagements tab shows a "not open" line. Old layout (not NL): one long page with cards "Needs your action", "Your gigs" (pills plus a clickable row list, "Show N more" after 6), an engagements list and the standing arrangements card.
- Mobile/accessibility notes: tabs are a real `tablist` with arrow keys, Home and End; focus returns to the chosen tab. Tables use `pjTable`: a hidden caption, row headers, and `data-label` on each cell so they stack into labeled lines on narrow screens.
- UX observations (mine): the tiles and the tab strip overlap in purpose (three of four tiles are just tab shortcuts). "Needs action" (tile) versus "Needs your attention" (card heading) versus "Needs your action" (old layout) are three wordings for one thing. "Standing Arrangements" is capitalised in the tab but "Standing arrangements" in the tile and card.

## Projects: Overview tab (attorney / agency owner)
- How to reach it: default tab of Projects; tab "Overview"; tile "Needs action". Inside `projectsWorkspace`, `paintPanel` line 5434, branch at line 5440.
- Purpose and primary focus: act on what waits on you. Everything else is a summary with links into the other tabs.
- Shown when: Projects is open and `gigs.ptab` is "overview".
- Layout, top to bottom:
  1. Full width: card "Your gigs (N)" with four count buttons and "View all →".
  2. Two columns: left card "Needs your attention (N)"; right card "Quick actions".
  3. Full width: card "Upcoming milestones" (only when switch `engagements` is on and engagements loaded).
  4. Full width: card "Active engagements (N)" with a table of up to 3 rows (only when switch `engagements` is on).
- Content and data shown:
  - "Your gigs (N)": four stat buttons, each a number and a label: "Drafts", "Open" (open plus paused), "Filled", "Closed" (closed plus canceled).
  - "Needs your attention (N)": a list, most urgent first. Each row: bold title, sub-line, optional amber badge with a date, one action button. Row types in rank order:
    - "Milestone payment due" / sub: gig title / button "Pay milestone" (blue).
    - "Deliverable ready for review" / sub: gig title / button "Review deliverable" (blue).
    - "Agreement needs your signature" / sub: gig title · total price / badge "Sign by {date}" / button "Sign agreement".
    - "Review 1 proposal" or "Review N proposals" / sub: gig title / badge "Closes {date}" / button "Review proposals".
    - "Answer 1 question" or "Answer N questions" / sub: gig title / button "Answer questions".
  - "Quick actions": up to four large buttons, each with a label and a small count line: "Review proposals" ("N gig with proposals" / "N gigs with proposals" / "None waiting"), "Approve deliverables", "Pay milestones", "Sign agreements" (each "N waiting" / "None waiting"). The last three only with switch `engagements`.
  - "Upcoming milestones": up to 4 buttons, nearest date first, one per active engagement with a dated next milestone: milestone title (or "Milestone {n}"), sub-line "{gig title} · {freelancer}", optional red badge "Overdue", and due words (from `dueWords`).
  - "Active engagements (N)": table columns "Engagement", "Freelancer", "Milestones accepted" (help tip), "Next milestone" (help tip), "Status", "Action". See the Engagements tab for cell content.
- Interactive elements:
  - "View all →" on "Your gigs": opens the Gigs tab.
  - Stat buttons "Drafts" and "Open": open the Gigs tab on filter "Open and drafts". "Filled": Gigs tab on "Filled". "Closed": Gigs tab on "Closed".
  - Attention row buttons ("Pay milestone", "Review deliverable", "Sign agreement"): open that gig's "Agreement and work" view. "Review proposals": opens the gig's Proposals view. "Answer questions": opens the gig's Questions view.
  - "+ N more item" / "+ N more items": shows the whole attention list (only 3 show at first).
  - Quick action buttons: with exactly one item waiting, go straight to it; with several, open the matching tab (Gigs on "Open and drafts", or Engagements; "Sign agreements" opens Engagements filtered to "Needs your signature"); with none, open the tab anyway.
  - Upcoming milestone buttons: open that engagement's "Agreement and work" view.
  - "View all →" on "Upcoming milestones" and on "Active engagements" (the latter only when more than 3): opens the Engagements tab.
  - Engagement table row button: see Engagements tab.
- States:
  - Attention empty: "Nothing waits on you right now."
  - No gigs: "No gigs yet. Choose "+ New Gig" at the top of the page to post your first one."
  - No active engagements: "No active engagements. An engagement starts when you choose a proposal and both sign the agreement."
  - No dated milestones: "No milestone with a date in your active engagements."
  - Engagements failed to load: "Your engagements could not load just now. Try again" (the words "Try again" are a link-style button that redraws). Shown in both the attention card and the engagements card; counts are omitted from those headings.
- Help: help icons beside each card heading. "Needs your attention": "Items waiting for your review, approval, signature or payment." "Your gigs": gigs sentence above. "Quick actions": "Shortcuts to the project tasks that wait on you. Each one says how many are waiting." "Upcoming milestones": "The next milestone of each active engagement, the nearest date first." "Active engagements": engagements sentence above. Column tips: "Milestones accepted" = "The number of milestones you accepted, out of the milestones in the signed agreement."; "Next milestone" = "The first milestone that is not accepted yet, with its date when one is set."
- Variations: see switch `engagements`.
- Mobile/accessibility: milestone buttons sit side by side on wide screens and stack on phones (code comment). Attention action buttons carry aria labels like "Pay milestone: {gig title}".
- UX observations (mine): the same tasks appear three times on this one tab (tile, attention list, quick actions) and the same engagements appear twice (upcoming milestones, active engagements table). The first two attention types use blue buttons, the rest ghost buttons, so priority is carried by colour only. "Approve deliverables" (quick action) versus "Review deliverable" (row button) is inconsistent.

## Projects: Gigs tab (attorney / agency owner)
- How to reach it: tab "Gigs"; tile "Open and draft gigs"; "View all →" on Overview. Branch at line 5509.
- Purpose and primary focus: find one of your gigs and open it.
- Shown when: `gigs.ptab` is "gigs".
- Layout: one card "Your gigs (N)" with help icon; a row of filter pills on the left and a search box on the right; then the table.
- Content and data shown: table "Your gigs: {filter name}" with columns:
  - "Gig": title in bold; sub-line "Monthly" and/or "Linked to {title}" when they apply.
  - "Proposals": the count, plus " · N question" / " · N questions" when questions are open.
  - "Budget": single amount or "{min} to {max}"; "Budget not set" when empty.
  - "Closing date": closing date for open gigs, closed date for closed ones, otherwise "Not set".
  - "Status": badge with the gig status word.
  - "Action": one button (below).
- Interactive elements:
  - Filter pills (each shows a count): "Open and drafts (N)" (open, draft, paused), "Filled (N)", "Closed (N)" (closed, canceled), "All (N)". `aria-pressed` marks the active one.
  - Search box: placeholder and aria label "Find a gig by its title". Filters as you type, within the active pill.
  - Row action button, one of: "Continue draft" (draft gigs; opens the gig page, which is the wizard at step 2 or 3), "Review proposals" (blue; open gigs with at least one proposal; opens the Proposals view), "View gig" (everything else; opens the gig page).
- States: no gigs at all: "No gigs yet. Choose "+ New Gig" at the top of the page to post your first one." Filter empty: "None in this view." Search empty: "No gig in this view matches "{words}"."
- Help: heading help icon with the gigs sentence.
- Variations: none by plan.
- Mobile/accessibility: stacked table; row buttons have aria labels with the gig title.
- UX observations (mine): there is no sort control and no paging. "Paused by the Lawfecta Team" gigs are counted under "Open and drafts", which may surprise. Search only matches the title.

## Projects: Engagements tab (attorney / agency owner)
- How to reach it: tab "Engagements"; tile "Active engagements"; "View all →" links. Branch at line 5531.
- Purpose and primary focus: see every awarded job and take its next step (sign, pay, review).
- Shown when: `gigs.ptab` is "engagements". Real content needs switch `engagements`.
- Layout: one card "Engagements (N)" (N = active count) with help icon; a row with status pills (only when the active engagements have more than one distinct status) and a search box; the active table; then a collapsed section "Finished and canceled (N)" holding a second table with the same columns.
- Content and data shown: table columns "Engagement", "Freelancer", "Milestones accepted", "Next milestone", "Status", "Action":
  - "Engagement": gig title in bold, total price under it.
  - "Freelancer": small face/avatar and the other person's name.
  - "Milestones accepted": "N of M accepted" with a thin progress bar; or "Set when you both sign" when there are no milestones yet.
  - "Next milestone": milestone title (or "Milestone {n}") and under it: due words when the engagement is active; "Planned for {date}" or "Was planned for {date}" when not yet active; "No date set"; or "Not scheduled" when there is no next milestone.
  - "Status": agreement status badge (words listed at the top of this file), plus a red "Overdue" badge when an active engagement's next milestone is late.
  - "Action": one button.
- Interactive elements:
  - Status pills: "All active (N)" plus one pill per status word actually present, for example "Needs your signature (N)", "Active (N)", "Waiting for signatures (N)". Group aria label "Show active engagements by status".
  - Search box: placeholder "Find by title or freelancer", aria label "Find an engagement by its title or freelancer".
  - Row action button: "Pay milestone", "Review deliverable" or "Sign agreement" (blue) when that step waits on the member; otherwise "View engagement" (ghost). All open the gig's "Agreement and work" view.
  - Expandable "Finished and canceled (N)" (opens automatically while searching).
- States: switch off: "Agreements are not open for your account yet." Load failure: "Your engagements could not load just now. Try again". None: "No engagements yet. When you choose a proposal, the agreement and its milestones show here." Search with no hit at all: "No engagement matches "{words}"." No active hit: "No active engagement matches." or "No active engagement." A hidden live region announces "N active engagement(s) shown."
- Help: heading help icon; column tips on "Milestones accepted" and "Next milestone" (texts above).
- Variations: the Freelancer column heading stays "Freelancer" for every row.
- Mobile/accessibility: stacked table; progress bar has an aria label "N of M milestones accepted".
- UX observations (mine): the card heading counts only active engagements, while the page also lists finished ones. The status pills appear and disappear depending on data, so the toolbar shifts.

## Projects: Standing Arrangements tab (attorney / agency owner; the same card also appears on the freelancer's Work page)
- How to reach it: tab "Standing Arrangements"; tile "Standing arrangements". Branch at line 5568; card built by `standingCard(slot, fold)` line 6703. The same `standingCard` (unfolded) is used on the freelancer's Work page (line 7624, outside my range).
- Purpose and primary focus: hire a trusted freelancer again in one click inside signed limits, and manage those limits.
- Shown when: the server says standing arrangements are on (`st.on`; the code comment names switch `auto_repeat_hiring`). Setting one up needs a paid attorney plan and the firm's owner or a manager (`st.can_create`).
- Layout, top to bottom:
  1. Card "At a glance (N)" with help icon: a table. Only when at least one current arrangement exists.
  2. Card "Standing arrangements (N)": a status line, the "set one up" row, then one folded line per arrangement (name, status badge, the word "Details"), then a collapsed "Past arrangements (N)".
- Content and data shown:
  - At a glance table columns: "Freelancer", "Monthly limit", "Counted this month", "Remaining", "Jobs open" ("N of M"), "Status" (badge), "Action".
  - Each arrangement's details: "{price} per job | {spent} of {cap} this month | N of M jobs open | until {date}"; "Covers: {doc id} {title} (version N); ..."; a notice when a review is needed: "{reason} Automatic hiring is paused until you both approve."; "{amount} left this month | N open-job place(s) left"; "The cap counts the job price. Lawfecta's platform fee is added to each charge."; a list of jobs hired: "{date}: {title}, {price} | {status}" where status is "Hired", "Waiting for payment", "Declined, refunded", "Did not start" or "Starting".
- Interactive elements:
  - "Manage" (per table row): opens that arrangement's fold in the card below and scrolls to it.
  - Dropdown "Freelancers you have completed a gig with" (options: eligible freelancers' names) plus button "Set up a standing arrangement": opens the set-up dialog (next section).
  - Each arrangement line: expandable (`details`), opens by default when it waits on the member.
  - Dropdown (aria label "Document to hire for"; options: covered document titles) plus blue button "Hire again from my standing arrangement": hires and charges at once; may redirect to a Stripe payment page. Shown to attorneys with role manager or user on an active arrangement, and only when a place and enough cap are left.
  - "Review limits": shown instead of the hire button when the cap or open-job limit blocks hiring (managers); opens the limits form.
  - "Open the job" (per hired job): opens that gig's "Agreement and work" view.
  - "Decline this job" (freelancer side, while allowed): browser confirm "Decline this job? The firm is refunded in full."
  - "Change limits" (attorney manager, active): opens an inline form with number boxes "Price per job ($)", "Monthly spend cap ($)", "Most jobs open at once", text box "Your full name", checkbox "I sign the new limits for the firm.", and button "Sign and send the new limits". Intro: "Once you send them, new limits pause one-click hiring until the freelancer approves them. Limits that are not allowed are refused and nothing changes."
  - "End arrangement": browser confirm "End this standing arrangement? No new jobs can be hired from it. " followed by one of: "No job is open under it now." / "The open job finishes as agreed: {title}." / "The N open jobs finish as agreed: {titles}." / "The 1 open job finishes as agreed." / "The N open jobs finish as agreed."
  - Needs review (both sides): text box "Your full name", checkbox "I approve the arrangement again with these documents and limits.", buttons "Review and approve" and (when a change is pending) "Do not approve". After approving: "You approved. Waiting for the other person."
  - Freelancer side, status "Waiting for the freelancer": text box "Your full name", checkbox "I accept this standing arrangement. Jobs inside its limits start without a new proposal; I can decline a job within {24} hours, and end the arrangement any time.", buttons "Accept" and "Decline".
  - Expandable "Past arrangements (N)".
- States:
  - Off (attorney): card "Standing arrangements" with a "Coming soon" tag and "Hire a trusted freelancer again in one click, inside limits you both sign once." Off (freelancer): nothing.
  - None: "None active." No eligible freelancer: "You can offer a standing arrangement to a freelancer after you complete a gig with them."
  - Hiring blocked: "The most jobs open at once (N) are already open." or "This month's cap has {amount} left, less than one job ({price})."; non-managers see "Ask the firm's owner or a manager to review the limits."
  - Results stay on the card for 10 minutes and also show as a toast: "Hired and paid. {amount} of this month's cap is left."; "Hired. The payment is not finished yet: payments are not set up on this site yet." / "...open the job to pay."; "This job would pass the monthly cap ({spent} of {cap} used). Nothing was charged. A gig draft was made instead; open it from Your gigs to post it the normal way." (also variants "The most jobs open at once (N) are already open." and "That document is not covered."); "Sent. Hiring is paused until the freelancer approves."; "Ending once the open jobs finish." / "Ended."; "Approved by both. One-click hiring works again." / "Approved. Waiting for the other person."; "Not approved. The signed limits stay."; "Accepted. The firm can now hire you again in one click."; "Declined."; "Declined. The firm is refunded in full."
  - Error texts (`STANDING_ERR`), all quoted in code: needs a completed gig, not open for your account, paid plans only, owners and managers only, "Set a monthly spend cap. DELA does not save an arrangement without one.", "The price per job cannot be more than the monthly cap.", "The price per job is below the smallest engagement allowed.", "Pick an end date within 12 months.", "Choose at least one approved SOP or Workflow.", "Only approved SOPs and Workflows can be covered.", "This freelancer is not verified right now.", "Type your full name and tick the box.", "This arrangement is not active, so it cannot hire right now.", "A hold on one of the accounts stops hiring right now.", "A job from this arrangement is in a dispute, so hiring is paused.", "The freelancer is not available right now. Try someone from your bench, or post a gig.", "The time to decline this job is over.", "Work on this job has started, so it cannot be declined here.", "Choose 1 to 20 jobs open at once."
- Help: column tips. "Monthly limit": "The most the prices of jobs started in one month may add up to. Lawfecta's platform fee is added to each charge and is not part of the limit." "Counted this month": "The prices of the jobs started from this arrangement this month." "Remaining": "The monthly limit minus the job prices counted this month. It is a limit, not money held for you." "Jobs open": "Jobs open now under this arrangement, out of the most allowed at once."
- Variations: attorney sees the freelancer's name, the freelancer sees the firm's name. Roles on an arrangement: "manager" (can hire, change, end, review), "user" (can hire only). On the freelancer's Work page arrangements are shown as open boxes, not folds.
- Mobile/accessibility: stacked table; "Manage" has aria label "Manage the arrangement with {name}".
- UX observations (mine): three words for one number: "Monthly limit" (table), "monthly cap"/"cap" (details and messages), "Monthly spend cap ($)" (forms). "Counted this month" versus "{spent} of {cap} this month". The details card repeats what the table says. Signing means typing a name and ticking a box, repeated in four slightly different forms. Two actions use browser confirm pop-ups. After an action the page redraws after a 0.9 to 1.2 second delay.

## Standing arrangement set-up dialog: "Standing arrangement with {name}" (attorney)
- How to reach it: Projects > Standing Arrangements > "Set up a standing arrangement"; also "Propose a standing arrangement" on a finished engagement (line 10472, outside my range). `standingSetup(person, personName)` line 6654. A modal dialog.
- Purpose and primary focus: set the limits and sign once.
- Shown when: standing arrangements are on and the member may create one.
- Layout, top to bottom: intro paragraph; heading "Documents covered (approved SOPs and Workflows)" with one checkbox per approved document; two rows of fields; a firm-sharing checkbox; signature name; consent checkbox; a status line; footer buttons.
- Content: intro "Hire {name} again for the same work without a new proposal each time. You both sign once. Inside these limits you hire in one click and DELA charges your saved card at once (with no saved card, the Stripe payment page opens). Anything outside them becomes a normal gig draft."
- Interactive elements:
  - Checkboxes, one per document: "{doc id} {title} (version N)".
  - Number box "Price per job ($)" (placeholder: the minimum price from settings).
  - Number box "Monthly spend cap ($)", hint "Required. Hires stop at the cap each month."
  - Number box "Most jobs open at once" (default from settings, 3 if none; min 1, max from the plan limit).
  - Date box "End date" (default today plus 6 months, from settings), hint "Up to {12} months."
  - Checkbox "Let other attorneys in the firm use this arrangement".
  - Text box "Your full name", hint "Your typed name is your signature."
  - Checkbox "I sign this standing arrangement for the firm, and I agree that Lawfecta may charge the saved payment method for each job hired from it, up to the monthly cap."
  - Buttons: "Sign and send" (blue; disabled while sending), "Cancel".
- States: off: "Standing arrangements are coming soon." with "Close". Not allowed: "Standing arrangements are part of the paid attorney plans (Plus, Pro and Business). Only the firm's owner or a manager can set up or change a standing arrangement." with "Close". No documents: "No approved SOPs or Workflows yet." Errors show in the status line inside the dialog. Success toast: "Sent to {name} to accept."
- Help: each field has the standard help-tip slot (no tip text given here).
- Variations: none.
- Mobile/accessibility: inputs carry aria labels; name box has `autocomplete="name"`.
- UX observations (mine): a long legal consent sentence sits in a small checkbox label. There is no summary of the total exposure (cap times months) before signing.

## Post a New Gig, step 1 of 3: "Set up the gig" (attorney / agency owner)
- How to reach it: Projects > "+ New Gig" > "From an approved document"; or arriving from a Library document, from a freelancer ("create a gig for {name}"), or from "Post a gig for part of this job". `newGigPage(el)` line 5159. It replaces the Projects page (same `?tab=projects` address).
- Purpose and primary focus: choose the approved document, the type and the budget, then let DELA draft the description. Nothing is posted.
- Shown when: `gigs.wiz` is set, new layout.
- Layout, top to bottom:
  1. "← Back to Projects" button.
  2. `h1` "Post a New Gig"; sub-line "Turn an approved SOP or Workflow into a gig. DELA prepares the description, and you review everything before posting."
  3. Stepper with three steps: "Set up the gig", "Review DELA's draft", "Review and post" (current step highlighted, done steps show a check mark).
  4. Notices (cannot post yet; creating for one freelancer; linked job).
  5. Two columns. Main column: card "1. Choose your work", card "2. Choose the engagement type", card "3. Add the details", then the actions card. Side column: card "Estimated costs", card "What happens next".
- Content and data shown:
  - "Estimated costs" (updates live): lines "Your budget" (or "Your budget, each month"), "Platform fee ({x}%, at least {amount})", "Estimated total" (or "Estimated total each month"), then "The fee is worked out on the price you agree with the freelancer. The exact amount is shown in the agreement before you sign." With no budget typed: "Enter a budget to see the estimated total." With no fee rule: "Your platform fee is added and shown before you sign."
  - "What happens next": three numbered items, the current one marked "(you are here)": "Set up the gig" / "Choose the document, the type, the budget and any details."; "Review DELA's draft" / "DELA writes a description for freelancers from your document. You can edit all of it."; "Review and post" / "Check what freelancers will see, the budget and the costs, then post. Nothing is posted before that."
  - Footer note in the actions card: "DELA writes a draft description from your document. Nothing is posted yet: you review and edit the draft, then post it yourself." plus (switch `ai_generation`) " Drafting uses DELA actions from your plan." plus " Open gigs on your plan: no cap." or "... N of M in use."
- Interactive elements:
  - "← Back to Projects": leaves and keeps what was typed for the next visit.
  - Card 1: dropdown "Approved SOP or Workflow" (first option "Choose an approved SOP or Workflow", or "No approved SOPs or Workflows yet"; then one option per approved document as "{doc id} {title}"). Link button "Preview document" (opens the Library document in a new tab; hidden until a document is chosen). Help icon beside the heading. Button "Open the Library to create or approve one" (only when there are no documents and switch `playbook_library` is on).
  - Card 2: radio cards "One-off" ("A defined project with specific deliverables, a deadline and a fixed price.") and "Monthly" ("The same work every month for a flat monthly price, until either of you cancels. The budget is the monthly price."). "Monthly" only with switch `recurring_engagements`.
  - Card 3: number boxes with a "$" prefix "Budget from (USD)" and "Budget to (USD)"; date box "Work deadline (optional)"; text area "Additional details for DELA (optional)" (4 rows, 1,500 characters, live counter "N of 1,500 characters").
  - Actions: "Cancel" (throws away what was typed and returns to Projects), "Draft with DELA" (blue; validates, then asks DELA to write the draft and opens step 2).
  - Notice links: "Not for a specific freelancer"; "Do not link" (button in the linked-job notice).
  - Dialog "Check the images" (only when the chosen document has images): "The freelancer will see N image(s) in this document. Check that none show client information." Buttons "Review images" (opens the document in the Library) and "Continue".
- States:
  - Hints: under the dropdown "Only approved documents are listed. "Preview document" opens it in a new tab." or "A gig starts from an approved SOP or Workflow, and you have none yet." Under the type: "Monthly gigs are not open for your account yet." (switch off). Under the budget: "At least {minimum}. "To" must be the same as "From" or higher. The budget is for the work; your platform fee comes on top." and "When the work should be finished. You can set or change it before posting. The closing date for proposals is set when you post, and shown then." Under details: "For example: software the freelancer must know, experience you need, or how you want the work delivered."
  - Protected note box: bold "Protect client information" then "Do not include client names, case details, account numbers or passwords. DELA checks what you type, but it cannot catch everything: read DELA's draft before it is shared with freelancers."
  - Inline errors (red, `role=alert`, focus moves to the first bad box): "Choose an approved SOP or Workflow."; "Enter the lowest budget, in dollars."; "The budget must be at least {minimum}."; ""Budget to" must be the same as "Budget from" or higher."
  - Working: both buttons disabled and status "DELA is writing the description. This can take a moment. Nothing is posted."
  - Failure: "The additional details may include client information. Use placeholders instead. What you entered is still here." or the server reason, or "DELA could not write the draft just now. Check your connection and try again. What you entered is still here."
  - Linked notice: "Linked to: {title}. Whoever you hire is listed on the attorney's "Who's working on this", as your subcontractor. Share with them only what their part needs."
  - Page failure: `h1` "Post a New Gig", red error notice, "← Back to Projects".
- Help: card 1 help icon (label "About choosing a document"): "DELA uses the approved version of the document to write the gig. Freelancers you invite or hire see their part of the document, with their name as a watermark."
- Variations: Monthly option by switch; agency wording in the cannot-post notice.
- Mobile/accessibility: stepper is an ordered list with screen-reader text "Step N of 3, current/done"; errors linked to inputs with `aria-describedby` and `aria-invalid`; cost card is a live region.
- UX observations (mine): "Back to Projects" keeps the entries and "Cancel" discards them, with no confirm on Cancel; the difference is not visible on screen. The page title says "Post a New Gig" while the primary button says "Draft with DELA". Step 1 has cards numbered 1, 2, 3 inside a stepper that is also numbered 1, 2, 3.

## Post a New Gig, step 2 of 3: "Review DELA's draft" (attorney / agency owner)
- How to reach it: automatically after "Draft with DELA"; or "Continue draft" on a draft gig in the Gigs table. It is the draft gig's own page: `gigPage` line 5672 then `gigDetails` line 5774 with `wizard` true (new layout and status "Draft").
- Purpose and primary focus: read and edit the description freelancers will see.
- Shown when: gig status is "Draft", view "Details", `gigs.wstep` not 3.
- Layout, top to bottom: the gig page header (see "Gig page" below, including "← All gigs" and the view pills); the stepper at step 2; a green notice on first arrival; card "What freelancers will read"; the "✦ Check the scope" helper; a button row; then (below both steps) the collapsed document card and the references block or editor.
- Content: intro in the card: "Matched freelancers read this before they spend a proposal. Invited and hired freelancers also see their part of the document (an SOP, or a workflow's steps for the freelancer role), with their name as a watermark. No client information."
- Interactive elements (all text boxes, prefilled by DELA):
  - "Title" (single line).
  - "The task" (3 rows), hint "Two or three sentences: what the freelancer will do."
  - "What done looks like" (2 rows).
  - "Steps, one per line" (6 rows).
  - "Tools", hint "Separated by commas. DELA matches freelancers who use them."
  - "Skills", hint "Separated by commas."
  - "Practice area" and "State" side by side (State: 2 letters, placeholder "TX").
  - "Usual time".
  - "✦ Check the scope" (only when the helpers feature is on): shows "Uses N DELA action(s) on Lawfecta's AI (none on your own key)." See the "AI suggestion panel" section.
  - "Save draft" (ghost), "Continue to review" (blue; goes to step 3 and scrolls to the top).
  - Expandable "The document (invited and hired freelancers see their part of it)": shows "The freelancer sees N of M steps, with N "Attorney decides" step(s) where the work waits for you." and a plain read-only copy of the document.
  - References editor (switch `document_standard`, defined outside my range) or a read-only references block.
- States: first-arrival notice: "DELA wrote this draft from your document. Read it and change anything that is not right. Nothing is posted yet." or "This draft was filled in from your document. Read it and change anything that is not right. Nothing is posted yet." Save toast: "Saved". Client-information check on save: browser confirm "This may include client information ({kinds}). Use placeholders instead. Click OK only if it is not client information."
- Help: each field has the standard help-tip slot.
- Variations: outside the wizard (open gig) the same card is titled "Public version".
- Mobile/accessibility: every input has an aria label; step heading takes focus when the step changes.
- UX observations (mine): the wizard sits inside the gig page, so the gig view pills (Details, Matches, Questions, Proposals, Files) still show above the stepper while the gig is only a draft. Tools and skills are comma-separated free text, not chips. Step 2 has no "Back" to step 1 (step 1 cannot be revisited once the draft exists).

## Post a New Gig, step 3 of 3: "Review and post" (attorney / agency owner)
- How to reach it: "Continue to review" on step 2. `gigDetails`, `showStep(3)`.
- Purpose and primary focus: confirm budget and costs, read the preview, tick the confirmation and post.
- Shown when: draft gig, `gigs.wstep` is 3.
- Layout, top to bottom: stepper at step 3; card "Budget, deadline and milestones"; card "Estimated costs"; card "What freelancers will see"; confirmation card; action row.
- Content: "What freelancers will see" lists (only filled rows): "Title", "The task", "What done looks like", "Steps", "Tools", "Skills", "Practice area", "State", "Usual time", "Type" ("Monthly" / "One-off"), "Budget" (amount, range or "Not set"), "Work deadline" (date or "Not set"). Sub-line: "Read it once more as a freelancer would. No client information." Confirmation hint: "Posting opens the gig to matching freelancers. The closing date for proposals is shown when you post. You can still edit or close the gig after that."
- Interactive elements:
  - Number boxes "Budget from ($)" and "Budget to ($)"; date box "Deadline"; text area "Milestones (private)" (3 rows), hint "For example: First version, then Final version. Freelancers see milestones only after you hire them; DELA sets the final milestones with the agreement."
  - Link button "← Edit the description" (back to step 2).
  - Checkbox "I have read what freelancers will see. It has no client information, and I want to post this gig."
  - "← Back" (to step 2), "Save draft", "Post the gig" (blue), "Delete draft" (red outline; browser confirm "Delete this draft gig?").
- States: error under the checkbox: "Tick the box to confirm you have read what freelancers will see." After posting: toast "Your gig is open until {date and time}" and the page moves to the Matches view; if the gig was made for one freelancer, the Talent invite page opens with this gig chosen. After delete: toast "Draft deleted" and return to Projects.
- Help: standard help-tip slots.
- Variations: monthly gigs label the cost lines "each month".
- Mobile/accessibility: cost card is a live region; error has `role=alert`.
- UX observations (mine): step 1 labels the budget "Budget from (USD)" and the deadline "Work deadline (optional)"; step 3 labels the same things "Budget from ($)" and "Deadline". Budget can be edited again here although it was set in step 1. "Delete draft" sits in the same row as "Post the gig".

## Gig page (header and view pills) (attorney / agency owner)
- How to reach it: any gig row or button on Projects; `gigs.id` set. `gigPage(el)` line 5672.
- Purpose and primary focus: one gig, with pills to move between its views.
- Shown when: `gigs.id` is set on the Projects tab.
- Layout, top to bottom: "← All gigs" button; title row (`h1` gig title, status badge on the right); summary line; notices; view pills; the chosen view.
- Content: summary line "{budget} | {Closes date-time, or status and date} | N proposal(s), N invited".
- Interactive elements:
  - "← All gigs": back to Projects.
  - View pills (a `tablist` labelled "Gig views"): "Details", "Matches", "Questions" or "Questions (N)" (open questions), "Proposals (N)", "Files (N)", and "Agreement and work" (only with switch `engagements`, and only when the gig is "Filled" or that view is already open).
- States: not found: "This gig is not available to your account. It belongs to another member, or it was removed." Paused: red notice "The Lawfecta Team paused this gig while they check it. Freelancers cannot send proposals until it opens again." Monthly: "Monthly gig: the budget is the monthly price. The agreement lists the work included each month." Linked: "Linked to {title}. Whoever you hire is listed on the attorney's "Who's working on this", as your subcontractor."
- Help: none.
- Variations: "Agreement and work" opens `engagementPanel` (outside my range).
- Mobile/accessibility: pills use `role=tab` and `aria-selected` but no arrow-key handling (unlike the Projects tabs).
- UX observations (mine): the back button says "← All gigs" though it returns to whichever Projects tab was open, including Engagements. Pills here look like the filter pills elsewhere but act as tabs.

## Gig page: Details view, posted gig (attorney / agency owner)
- How to reach it: gig page > pill "Details". `gigDetails` line 5774, non-wizard path.
- Purpose and primary focus: edit an open gig, extend it or close it; read-only for filled and closed gigs.
- Shown when: gig status is not "Draft" (or old layout).
- Layout: card "Public version" (same eight fields as wizard step 2); card "Budget, deadline and milestones" (same four fields as step 3); action row; expandable document card; references.
- Interactive elements: the same fields (all disabled unless the gig is "Draft" or "Open"); "Save"; "Extend {N} days" or "Extend" (open gigs with extensions left; browser confirm "Keep this gig open for N more days? You can extend it once." / "...You can extend it N more times."); "Close the gig" (red; browser confirm "Close this gig now? Applicants are told, and you can still choose a proposal for N days." / "...for a short time.").
- States: intro adds for open gigs: " Changing the budget or the work tells applicants; a big change asks them to confirm their proposals." Toasts: "Saved"; "Saved. This was a big change, so applicants are asked to confirm their proposals."; "Open until {date and time}"; "Closed".
- Variations: filled, closed, canceled: all fields disabled, no buttons.
- UX observations (mine): disabled fields are used as the read-only display, which is hard to read. "Close the gig" is separated only by a left margin.

## Gig page: Matches view (attorney / agency owner)
- How to reach it: pill "Matches"; opens automatically after posting. `gigMatches` line 5893.
- Purpose and primary focus: invite fitting freelancers to send a proposal.
- Shown when: any gig; real content only after posting.
- Layout, top to bottom: (agency client only) card "Your bench"; (switch `bench`) card "From your bench"; card "Freelancers who fit" with one inner card per match.
- Content: intro "Only match-ready freelancers who confirmed their availability in the last N days (or "recently"), work in this practice area and do not exclude this state. DELA shows fewer people rather than inactive ones. Inviting someone lets them see the full document and send a proposal that does not use their monthly allowance." Each match: name, fit badge (the server's words; "Good fit" is green, anything else neutral), optional badge "Sent a proposal", headline, reasons joined by " | ".
- Interactive elements:
  - Per match: text box with placeholder "A short note (optional). Keep everything on Lawfecta." (aria "Message to {name} (optional)"); "Invite" (blue; becomes "Invited" and disabled; disabled when the gig is not open); "Message" (only after invited or applied, with switch `gig_chat`; opens the conversation); a reviews button (defined elsewhere).
  - "From your bench" card (switch `bench`): intro "Invite people you trust first. An invited proposal does not use their monthly allowance."; per person: name (with " (firm bench)" when it is the firm's), reason when blocked ("not available right now", "does not work for this state", "no longer a freelancer", "cannot be invited now"), reviews button, "Invite" / "Invited".
  - "Your bench" card (agency as client, `agencyBenchInvite` line 6217): intro "Invite your bench first. A bench member you hire pays no platform fee; the agency pays it with its own."; per member: "Invite to this gig" (blue), or badge "Invited", or text "Not available right now" / "Cannot be invited".
  - Empty-state buttons: "Search Talent" (goes to Talent), "Review gig requirements" (back to Details).
- States: draft gig: "Post the gig first. DELA then finds freelancers who fit." Loading: "Loading matches...". None: "No one fits yet. Check back soon, widen the practice area or tools, or search in Talent." Agency bench empty: "Nobody on your bench yet. Invite people on the Agency page." Toasts: "Invited {name}", the server's note when the invitation is held for a check, "{name} is already invited".
- UX observations (mine): up to three separate lists of people to invite on one view (agency bench, bench, matches), each with a slightly different button label ("Invite to this gig" versus "Invite"). No link to the freelancer's full profile from a match card.

## Gig page: Questions view (attorney / agency owner)
- How to reach it: pill "Questions"; "Answer questions" on Projects. `gigQuestions` line 5922.
- Purpose and primary focus: answer applicants' questions; every applicant sees the answer.
- Layout: card "Questions" with sub-line "Your answers are shown to every applicant. No client information." and one inner card per question.
- Content: "Q: {question}", then "Answered: {answer}", or "Your answer is being checked by the Lawfecta Team.", or an answer box.
- Interactive elements: text area (aria "Your answer", 2 rows); button "Answer for everyone" (blue).
- States: "No questions yet." Toasts: "Answered for every applicant"; "Held for a check: keep everything on Lawfecta".
- UX observations (mine): who asked and when are not shown. No character limit shown.

## Gig page: Proposals view, "Compare proposals" (attorney / agency owner)
- How to reach it: pill "Proposals (N)"; "Review proposals" buttons. `gigProposals` line 5941.
- Purpose and primary focus: compare proposals side by side and choose one.
- Layout: one card "Compare proposals" with an intro, a wide table, and the "✦ Compare these proposals" helper under it.
- Content: intro "Budget {min} to {max}. Prices outside the range are labeled, never hidden. Check what each price includes, so cheap and complete are not confused." plus, when set, " You can choose a proposal until {date and time}; after that the freelancer confirms first." Table columns: "Freelancer", "Price", "Includes", "Leaves out", "Schedule", "Qualifications", and an unnamed action column.
  - Freelancer cell: name in bold; or, for an agency proposal, an agency box (badge "Agency", agency name, reviews line such as "★ 4.8 (3 reviews)" or "No reviews yet", agency headline, summary, "Services: ...", "Team of N", "Who will do this work:" with a line per person and a "View profile" button each, and the subcontracting note) and "Sent by {name}"; then "Invited", headline, match reasons.
  - Price cell: amount and a badge: "Within the budget" (green), "Below the budget" (neutral), "Above the budget" (amber).
  - "Leaves out" falls back to "Not specified. Confirm before signing."
  - Schedule: the freelancer's words, with "N days from signing" added or merged.
  - Qualifications cell also shows "Note: {message}".
- Interactive elements:
  - "Choose" (blue): browser confirm "Choose {name}'s proposal ({price})? DELA starts a draft agreement, closes the gig and tells the others politely."
  - "Ask to confirm" (when the proposal needs reconfirming after a big change or after the choosing window).
  - Status badge instead of a button: "Chosen" (green) or the proposal status word.
  - "Message" (switch `gig_chat`).
  - "View profile" (agency team lines): opens the Profile dialog (below).
  - "✦ Compare these proposals" (two or more live proposals, helpers on): result lists each proposal's name, what it covers, "Not said: ..." (or "nothing DELA noticed") and "You could ask: ...".
- States: loading "Loading proposals..."; "No proposals yet."; toasts "Chosen. The draft agreement is waiting for signing and funding." and "Asked {name} to confirm".
- Mobile/accessibility: table is in a horizontal scroll wrapper and stacks with `data-label` on narrow screens.
- UX observations (mine): seven columns of free text is dense; the agency box makes one cell very tall. An individual freelancer's row has no "View profile" button, only agency team members do. Choosing uses a browser pop-up for a consequential step.

## Gig page: Files view, "Files for this gig" and "File activity" (attorney / agency owner)
- How to reach it: pill "Files (N)". `gigFiles` line 6035, `fileActivityCard` line 6075, `sensitiveBox` line 5989.
- Purpose and primary focus: share read-only files with invited and hired freelancers for a limited time, and see who opened what.
- Layout: card "Files for this gig" (last-result notice, sensitive-data checkbox, explanation, shared file rows, share controls); card "File activity" (table).
- Content: each shared file row: file name, then " | Access expires after {date} for invited freelancers and the one you hire" or (red) " | Access ended {date}". Activity table columns: "When", "Who" ("{name} opened" / "downloaded" / "opened the link"), "What", "Where". Sub-line "Every view and download of files and links shared on this job, newest first."
- Interactive elements:
  - Checkbox "This job involves sensitive data (SSN, medical, financial, or ID documents)" with help line "Sensitive documents must be shared using a link from your own storage (Google Drive, Dropbox, OneDrive, Box, ShareFile, Clio, NetDocuments). Do not upload them here." Saves at once.
  - When ticked with files already shared, a notice: "1 file is already shared on this job. It stays until it expires. You can delete it now." (or "N files ... They stay ... delete them now.") with "Delete now" (red) and "Keep them until they expire". "Delete now" swaps to an inline confirm: "Delete N file(s) for good? Shared files stay in your Files page." with "Cancel" and "Yes, delete them" (red).
  - Per file: "Extend {14} days" (number from settings), "Stop sharing".
  - Dropdown "Freelancer can open it for" with options "7 days", "14 days", "30 days" (from settings), and button "Share a file from Files": lists the member's ready files, each with a "Share" (blue) button. Only with switch `file_uploads` and when the job is not marked sensitive.
- States: explanation when not sensitive: "Read only, for this gig only. Each file is open to invited freelancers and the freelancer you hire until it expires (you pick 7, 14 or 30 days) or the job is complete, whichever comes first. Your copy stays in your Files page. Every download is logged. Expiry cannot recall a copy someone already downloaded." When sensitive: "This job involves sensitive data, so files cannot be shared here. Once you hire and the first milestone is paid, add secure document links in Confidential materials on the engagement." No files to pick: "No other ready files. Upload on the Files page first." Activity: "Loading...", "Nobody has opened anything yet.", "The activity could not be loaded." Results (toast, and kept on the card for 10 minutes as a green notice): "Extended to {date}", "No longer shared", "Shared until {date}". Toasts: "Marked as sensitive: no uploads on this job, secure links only.", "No longer marked as sensitive.", "Deleted. N shared file(s) stopped and N confidential file(s) deleted."
- UX observations (mine): files cannot be uploaded here, only picked from the Files page, and there is no link to the Files page. The destructive delete uses an inline confirm here while other pages use browser pop-ups.

## AI suggestion panel (the "✦" check buttons) (both)
- How to reach it: any "✦ ..." helper button; in my range "✦ Check the scope" (gig draft) and "✦ Compare these proposals" (Proposals view). `helperButton` line 5708, `helperFindings` line 5740.
- Purpose and primary focus: DELA reviews the unsaved form and offers suggestions the member may apply.
- Shown when: the helpers feature is on for the account (`/helpers` returns on).
- Layout: the button with a cost note beside it, then a soft panel with an AI label, "Dismiss", the findings list and a small note from the server.
- Content: cost note "Uses N DELA action(s) on Lawfecta's AI (none on your own key)." Each finding: "{Task N, }{field name}: {problem}" and "Suggestion: {text}". Field names come from a fixed list (for example "Title", "The task", "What done looks like", "Steps", "Usual time", "Budget", "Deadline", "Milestones"). When all findings share one reason it is said once above the list.
- Interactive elements: the helper button (reads "DELA is checking..." while running); "Dismiss" (panel); per finding "Use suggestion", "Edit" (applies it and puts the cursor in the box), "Dismiss"; "Use all suggestions" (blue, when two or more can be applied).
- States: "DELA found nothing to flag." Toast "Added to the form. Nothing is saved until you save." Client-information check: browser confirm "This may include client information ({kinds}). Use placeholders instead. Click OK only if it is not client information." Errors: "DELA's checks are not on for your account yet.", "Compare needs at least two proposals.", "Add at least one task first.", "This is not a monthly engagement.", "You have used this month's DELA actions.", "Add at least one step first.", "Every check passed, so there is nothing to explain.", "Type a few words first.", "Choose your ratings first.", and two "write your own notes first" messages for reviews.
- UX observations (mine): "Use suggestion" and "Edit" do the same thing except for focus. Two different "Dismiss" buttons (panel and finding) sit close together.

## Profile dialog (freelancer card) (attorney and agency)
- How to reach it: "View profile" on a person line (agency proposal team, "Who's working on this"). `profileModal(personId)` line 6098. Modal titled "Profile".
- Purpose: a quick read of one freelancer.
- Content: photo, name, headline, "Verified" or "Verification not finished" plus the reviews line; "Works with: {agencies}"; summary; "Experience"; "Practice areas: ..."; "Tools: ...".
- Interactive elements: a reviews button (when available) and "Close".
- States: "Loading..."; error notice.
- UX observations (mine): this small dialog duplicates the full Talent profile page in a much thinner form.

## "Who's working on this" card (attorney sees; agency changes)
- How to reach it: inside a gig's "Agreement and work" view, section "Who's working on this" (line 9212). `peopleCard(r)` line 6139.
- Purpose: show which agency people and subcontractors are on the job; the agency adds or removes them.
- Shown when: the engagement is with an agency; otherwise the card removes itself.
- Content: intro "You hired {agency}. These are the people working on it. If the agency changes them, you get a notice; nothing is needed from you." (attorney) or "This engagement is with {agency}. The attorney sees this list and gets a notice when it changes." (agency). One line per person: photo or initial, name, role (subcontractors read "Subcontractor, {role}"), reviews line.
- Interactive elements: "View profile" (per person); agency only: "Take off this job" (per person), dropdown (aria "Team member to add"), text box with placeholder "Role on the job, for example Lead paralegal" (80 characters), button "Add to this job".
- States: "Loading..."; toasts "{name} is off this job. The attorney was told." and "Added. The attorney was told."
- UX observations (mine): "Take off this job" has no confirm.

## "Bench assignments" card (agency owner or manager only; never the attorney)
- How to reach it: same section of the "Agreement and work" view, freelancer/agency side. `assignmentsCard(r)` line 6175.
- Purpose: give a milestone to a bench member and set the fee split for that job.
- Shown when: the server says assignments are on for this agreement.
- Content: intro "Give a milestone to someone on your bench. Their bench split fills in; a different split for this job needs their Accept before work starts. When the attorney accepts the milestone, the agency gets its share minus the whole freelancer fee, and they get their full share. The attorney sees them as a subcontractor, never the split." Per milestone: "Milestone N: {title} ({amount})", then "Assigned to {name} | split X% to the agency / Y% to the freelancer | waiting for {name} to accept", optional notice "Waiting on {name}'s payout setup".
- Interactive elements: "Post a gig for part of this job" (switch `agency_subcontracting`, agency can post, agreement signing/signed/active; opens the New Gig page linked to this job) with the note "For someone outside your bench. Whoever you hire is listed on the attorney's "Who's working on this", as your subcontractor."; per unassigned milestone: dropdown of bench members ("{name} (bench split ...)"), number box "Agency share for this job (%):" (placeholder "Bench split", limits from settings, step 0.5), button "Assign" (blue); per assigned milestone: "Take back".
- States: "This engagement says no subcontractors, so its milestones cannot be assigned to bench members and no gig can be posted for part of it."; "Not assigned."; "Not assigned. Nobody on your bench can take new work yet."; results on the card: "Assigned. Waiting for them to accept the split for this job.", "Assigned. The attorney was told who is working on it.", "Milestone N is unassigned".

## Agency page (freelancer side)
- How to reach it: sidebar menu item "Agency", address `?tab=agency`. `agencyView()` line 6382. Routed at line 12238 when side is freelancer and switch `agency_team` is on.
- Purpose and primary focus: run an agency (profile, business details, team, bench) or answer agency and bench invitations.
- Shown when: freelancer side, switch `agency_team`. What shows depends on role: no agency, team member, manager, owner.
- Layout, top to bottom (each part only when it applies):
  1. `h1` "Agency".
  2. One card per invitation: "Invitation from {agency}".
  3. Card "Agencies you work with".
  4. If the member has no agency: card "Run your own agency" and the page stops (bench cards still follow).
  5. Line "{agency name} | you are the owner/manager/member".
  6. Card "Agency profile" (owner or manager).
  7. Card "Business details" (owner).
  8. Card "Posting gigs" (when the agency can be a client).
  9. Card "Team".
  10. Card "Proposals".
  11. Card "The agency's jobs" (managers) or "Your agency jobs" (members).
  12. Bench area (loads separately): cards "Bench invitation from {agency}" / "On {agency}'s bench"; card "Your agency assignments"; card "Bench" (the agency's own bench, owner and managers).
- Content and interactive elements, card by card:
  - "Invitation from {agency}": "{from} invited you to join {agency} as a member. You keep your own account and your own plan. The agency can name you on its proposals." and "Open until {date}." Buttons "Accept" (blue), "Decline". Toasts "You joined {agency}", "Declined".
  - "Agencies you work with": per agency: name, role, " | paused" when inactive; hours control (number box aria "Hours a week you can give this agency", placeholder "Not set", 0 to 80; button "Save hours"); "Leave" which swaps to an inline confirm "Leave {agency}? Your access to its jobs ends at once." with "Cancel" and "Yes, leave" (red). Toast "You left {agency}".
  - "Run your own agency": "On Freelancer Business, your account becomes an agency. You invite team members, send proposals as the agency and name who will do the work, and grow a bench of freelancers you hire." and "Your plan now: {Plan}. Upgrade your Lawfecta membership to Freelancer Business to start." No button.
  - "Agency profile" (`agencyProfileCard` line 6261): sub-line "Attorneys read this on your agency's proposals. Team of N, bench of N (counted for you)."; a live line "Still missing: a headline, a short summary, practice areas, at least one service, the states you serve." or "Complete."; an inner soft card with text area "Tell DELA about your agency" (placeholder "A few lines: what your team does, practice areas, states, tools, how you work. No client names or details."; hint "DELA drafts the profile from this. It uses DELA actions, like other drafts.") and button "✦ Let DELA draft it"; then fields "Headline" (160 characters, placeholder "For example: Family law support team for small firms in Texas"), "Summary" (4 rows, 2,000), "Practice areas" (placeholder "Separated by commas"), "Services" (4 rows; placeholder "One service per line, for example: Discovery responses | Drafted and organized for attorney review"; hint "One per line. Add a short description after a | if you like."), "Tools you use" (placeholder "Separated by commas, for example: Clio, Microsoft 365"), "States you serve" (placeholder "Two letters each, for example: TX, OK"); button "Save the agency profile" (blue). After a DELA draft: "DELA filled in the boxes. Check every word, then click Save the agency profile.", "Still empty: ... Add it/them, then save.", and "DELA asks: {question}" lines. Messages: "Saved." / toast "Saved"; "Tell DELA a little more about your agency first."; "DELA could not draft it right now. Try again in a minute."; "Not saved. Try again."; "Only the agency's owner can edit the agency profile."; "The agency profile is not open yet."; "The agency profile could not load."
  - "Business details" (owner): "The Lawfecta Team checks your business name and state once, before your agency's first gig goes live." Fields "Business name" (160), "State of registration" (2 letters, placeholder "TX"). Status line: "Checked by the Lawfecta Team." / "Waiting for the Lawfecta Team's check. Note: {note}" / "Not entered yet." Button "Save business details". Toast "Saved. The Lawfecta Team will check it."
  - "Posting gigs" (`agencyClientCard` line 6238): "Ready to post gigs from your Library (Projects page)." or "Your agency can post gigs once {the agency is on Freelancer Business / the owner's own verification is done / the Lawfecta Team has checked the business details above}." Non-owners: "The owner adds the client details below." Owner: "Needed before your agency pays for a gig: the agreement names who signs for the agency and where notices go." Fields "Who signs for the agency" (120), "Billing address" (300), "Email for notices" (email, 200). Button "Save client details". Result "Client details saved".
  - "Team": "N of M seats used, the owner included, plus N invitation(s) waiting. Team members use their own Lawfecta accounts and finish their own verification before you can name them on a proposal." Per member: name, role ("Owner", "Manager", "Member"), email, "verified" / "verification not finished", "on N job(s)". Owner sees per member: hours box (aria "Hours a week for {name}", "Save hours") and, when hours are not set, "Ask to set hours" (becomes "Asked today", disabled for a day). "Remove" swaps to an inline confirm "Remove {name}? Their access to the agency's jobs ends at once." with "Cancel" and "Yes, remove" (red). Pending invitations: "{name} | invited as member | open until {date}" with "Cancel invitation". Invite row: email box (placeholder "Their email on Lawfecta") and "Invite to the team" (blue). Footer: "Team members do the work they are named for. Only you, as the owner, send proposals for the agency, sign for it and change who works on a job." Toasts: "{name} removed from N job(s)", "Invitation canceled", "Invitation sent", "Already invited", "Saved: N hours a week.", "Hours cleared. They show as "Hours not set".", "Enter a whole number of hours from 0 to 80, or leave it empty.", "The hours were not saved. Try again.", "{name} was asked to set their weekly hours.", "The reminder was not sent. Try again."
  - "Proposals": "Shared by the whole agency. {allowance text}".
  - "The agency's jobs" / "Your agency jobs": per job: title, status (raw status word from the server), people's names; button "Open" (opens the job's "Agreement and work" view on the Work tab). Empty: "No jobs yet."
- States: loading "Loading..."; "Agencies are not open for your account yet."; inactive agency notice "Your agency is not on Freelancer Business right now, so team changes and agency proposals are paused. Jobs already running continue."; page error notice.
- Help: the "Bench" heading is a glossary term (`D.term("Bench", "bench")`). Fields have the standard help-tip slot.
- Variations: owner sees everything; manager sees the profile, team management for members, and the bench; member sees only memberships, team list and their jobs. A code comment says there is no manager role in practice, yet "Manager" still exists as a label and in permission checks.
- Mobile/accessibility: rows wrap; hours boxes have per-person aria labels.
- UX observations (mine): a very long single page with up to ten cards and no sub-navigation. Job status in the jobs card is the raw server word, not the plain status words used elsewhere. "Proposals" is a card with one sentence. Team "Remove" and "Leave" use inline confirms, bench "Remove" uses a browser pop-up. "Run your own agency" has no upgrade button.

## Agency page: bench cards (freelancer invited to a bench; agency owner or manager)
- How to reach it: bottom of the Agency page. `agencyBench(box)` line 6511.
- Purpose and primary focus: sign a bench agreement that fixes the fee split, and manage bench members.
- Shown when: the server says the bench is on.
- Card "Bench invitation from {agency}" / "On {agency}'s bench" (the invited or member freelancer):
  - Content: "Your split: X% to the agency / Y% to you. The agency pays the platform fee from its share, so you receive your full share and pay no fee."; "Proposed split: ..." / "New split proposed: ..." / "You proposed: ... Waiting for the agency to sign."; "Note from {name}: {note}"; "Open until {date}."
  - Interactive: expandable "Read the bench agreement"; text box (placeholder "Your full name"); checkbox "I have read the bench agreement and I sign it electronically."; "Sign and join" or "Sign the new split" (blue); "Or propose the agency's share (%):" number box (step 0.5, limits from settings) and "Propose this split"; "Decline" (invited); "Leave the bench" (active; browser confirm "Leave {agency}'s bench? New assignments stop. Work already assigned keeps its split and pays out.").
  - States: "Plus plan or higher required to join a bench. Upgrade your Lawfecta membership to Freelancer Plus, then come back to sign." Results: "Signed. You joined {agency}'s bench.", "Signed. The new split applies to new work.", "Proposed and signed. Waiting for the agency.", "Declined", "You left the bench".
- Card "Your agency assignments":
  - Content: "Work agencies gave you from their engagements. You hand the work to the agency; the agency delivers it to its client. You pay no platform fee on your share." Per item: "{job}, milestone N: {title}", "For {agency} | {amount} | your share {amount} | due {date}", "Deliverables: ...", then either a notice "Split for this job: X% agency / Y% you. Work cannot start until you accept." or "Split X% agency / Y% you | your share was paid / your share waits for your payout setup on the Earnings page / your share is on its way / accepted / in progress".
  - Interactive: checkbox "I accept this split for this job."; "Accept" (blue), "Decline".
  - Results: "Accepted. You can start once the milestone is funded.", "Declined. The milestone goes back to the agency."
- Card "Bench" (the agency's own):
  - Content: "Outside freelancers you hire for your work. They never use a seat. Before someone joins, you both sign a bench agreement that sets the split of the fee. The agency's share is X% to Y%, and the agency pays the Z% freelancer platform fee from its share. Only Freelancer Plus or higher can join. The attorney never sees the split." Per person: name and facts joined by " | ": bench status word, "split ...", "waiting for them to sign ..." / "they proposed ...", "Inactive: Free plan", "Plus plan or higher required to join a bench", "open until {date}".
  - Interactive per person: "Sign their split" (blue); number box (aria "New agency share for {name} (%)") and "Propose a new default split"; "Cancel invitation" (browser confirm "Cancel the bench invitation to {name}?") or "Remove" (browser confirm "Remove {name} from your bench? New assignments stop. Work already assigned keeps its split and pays out.").
  - "Invite to the bench" sub-heading: email box (placeholder "Their email on Lawfecta"), number box "Agency share (%)" (hint "Allowed: X% to Y%."), text box (placeholder "Note to them (optional)", 600), expandable "Read the bench agreement", name box and checkbox "I have read the bench agreement and I sign it for the agency.", button "Invite to the bench" (blue).
  - States: "Nobody on your bench yet." Results: "Signed. {name} joined your bench.", "Proposed and signed. Waiting for {name}.", "Invitation canceled", "{name} removed from your bench", "Bench invitation sent", "Bench invitation sent. They need Freelancer Plus or higher to join.", "Already invited or on your bench", "Enter the agency's share (%) first. Allowed: X% to Y%."
- UX observations (mine): one signature row (name and tick) at the bottom of the "Bench" card serves every row's "Sign their split" and "Propose a new default split" buttons as well as the invite form, which is easy to miss. The unlabeled number box beside "Propose a new default split" has no visible label. Two different things are both called "bench" on the attorney's Matches view ("From your bench" versus the agency's "Your bench").

## Invite {name} to submit a proposal (Talent invite page) (attorney / agency owner)
- How to reach it: Talent > "Invite to gig" on a search result or a profile; also opens automatically after posting a gig that was created for one freelancer. `talentInvitePage()` line 6934; shown by `talentView` when `talentInviteFor` is set (address stays `?tab=talent`).
- Purpose and primary focus: pick one of your open gigs and send this freelancer an invitation to propose. Nobody is hired.
- Shown when: Talent tab with an invitation in progress.
- Layout, top to bottom: back button; `h1` "Invite {name} to submit a proposal"; sub-line "Choose one of your posted gigs and invite this freelancer to send a proposal for it. Nobody is hired at this step."; two columns. Left: card "1. Select an existing gig", card "2. Review the gig", card "3. Invite to submit a proposal". Right: aside card "Inviting".
- Content:
  - Card 1: "Only your posted gigs that still take proposals are listed."
  - Card 2: the chosen gig's title, task, "Outcome: ...", facts "Budget" (amount, range or "Not given"), "Deadline" (date, the usual time, or "Not given"), "Proposals close" (date or "No closing date"), and "This is the public version of your gig, the one freelancers see. It holds no client information."
  - Card 3: "This invitation asks {name} to send a proposal for your gig. It does not hire them, award the work or create anything to pay."
  - "Inviting": avatar, name, headline, facts "Verification" ("Verified" / "Not verified yet"), "Reviews" ("N review(s)" / "No reviews yet"), "Availability" ("N hours a week" / "Not given"), "Time zone" (or "Not given"), and "Work, messages, approvals and payments stay on Lawfecta."
- Interactive elements:
  - "← Back to the profile" or "← Back to Talent search".
  - Dropdown "Existing gig": first option "Select one of your posted gigs" or "No posted gig is open for proposals"; then each open gig's title.
  - Text area "Message to the freelancer (optional)" (3 rows, 2,000 characters; placeholder "For example: your experience looks right for this gig. Please look at the scope and send a proposal if you are interested."; hint "Sent with the invitation, inside Lawfecta. Up to 2,000 characters."), with the standing sensitive-data note above it ("Never enter sensitive data: ... Share a link from your own storage instead. You are responsible for what you enter.").
  - "Send invitation to submit a proposal" (blue; disabled until a gig is chosen; reads "Sending..." while sending), "Cancel".
  - Done card buttons: "Back to Talent search" (blue), "Open the gig" (opens its Proposals view).
- States: "Loading your gigs..."; no gig chosen: "Choose a gig to see what the freelancer will be asked to propose on." or "Post a gig in Projects first. Creating a gig from an SOP or Workflow happens there, not here."; "Loading the gig..."; "This gig could not be loaded. Choose another one."; "This gig could not be loaded. Check your connection." Client-information check: browser confirm "Your message may include client information. Take it out, or click OK only if it is not client information." Success card "Invitation sent": "{name} is invited to send a proposal for "{title}"." or "Already invited": "{name} was already invited to "{title}". Nothing was sent again."; then "What happens next: {name} gets a notice and can send a proposal or decline. Proposals appear on the gig in Projects. Nobody is hired and nothing is charged until you choose a proposal and sign an agreement." Toasts "Invited {name}" / "Already invited". Errors: ""{title}" no longer takes proposals, so no invitation was sent. Choose another gig." (the gig is removed from the dropdown); "{name} cannot be invited to this gig right now. No invitation was sent."; "The invitation was not sent ({error}). Check your connection and try again."
- Help: field help-tip slots; the aside has aria label "Who you are inviting".
- Variations: back button wording depends on where the member came from.
- Mobile/accessibility: the scope area is a live region; status and alert roles on results.
- UX observations (mine): when no gig is open there is no button to go and post one, only a sentence. The three numbered cards are a wizard laid out on one page, a different pattern from the New Gig stepper.

---

## Cross-page elements seen
- Shared helpers: `field(label, input, hint, help)` (label, optional help icon, input, small hint); `pjHead` (card heading with count and help icon); `pjTable` (accessible table that stacks on phones); `hstat` (number-and-label stat button); `D.helpTip`; `D.term` glossary (used for "Bench"); `D.toast`; `D.money`; `modal(title)` with body and footer; `cardStatus` / `cardSay` (a result that stays on its card for 10 minutes and also toasts).
- Shared patterns: filter pills with counts and `aria-pressed`; "✦" AI helper buttons with the "Uses N DELA action(s)..." note and the suggestion panel; a typed full name plus a tick box as an electronic signature (bench, standing arrangements); the client-information check (browser confirm "...Click OK only if it is not client information."); "← Back ..." ghost buttons at the top of sub-pages; numbered card headings ("1. ...", "2. ...", "3. ...").
- Two confirm styles in use: browser pop-ups (choose a proposal, extend, close or delete a gig, end an arrangement, decline a job, leave or remove from a bench) and inline "Cancel / Yes, ..." rows (leave an agency, remove a team member, delete shared files).
- Shared status words: the gig, proposal, engagement, standing arrangement and bench lists at the top of this file; badges "Overdue", "Invited", "Chosen", "Agency", "Within the budget", "Below the budget", "Above the budget".
- Feature switches met: `flex_gigs`, `engagements`, `recurring_engagements`, `ai_generation`, `playbook_library`, `gig_chat`, `bench`, `file_uploads`, `document_standard`, `agency_team`, `agency_subcontracting`, plus server-side on/off answers for helpers, standing arrangements and the agency bench.
- Recurring wording themes: "Nothing is posted", "Nobody is hired", "No client information", "Keep everything on Lawfecta".

---

# PART E

# Inventory E: Talent, Work, Inbox, Meetings

Source: `app/dela-app.js`, lines 7018 to 8790 (new layout only). Every label in quotes is copied from the code.
Things defined outside this range but used here are marked "(outside range, line N)".

Menu facts (outside range, lines 21 to 46): attorneys always have "Talent" in the menu; "Meetings" shows for both sides only when switch `meetings` is on; freelancers always have "Work"; a freelancer whose agency hires (`me.agency_client`) also gets "Talent" when switch `talent_search` is on. "Inbox" is a button in the top bar (aria-label "Inbox"), not a menu tab.

---

## Talent: Search (attorney; also a freelancer whose agency hires)
- How to reach it: menu item "Talent", `?tab=talent`. `talentView()` line 7018, `talentForm()` line 7123, `talentResults()` line 7545.
- Purpose and primary focus: find match-ready freelancers. The one main thing: search or filter, then "View profile" or "Invite to gig" on a card.
- Shown when: side attorney (or agency that hires with switch `talent_search`). View pills depend on switch `bench` and on whether the website's bookmarks are on. DELA help section needs switch `ai_helpers` and the helpers service reporting on.
- Layout, top to bottom:
  1. Page heading "Talent".
  2. View pills (tablist, aria-label "Talent views"): "Search", "My bench" (only with switch `bench`), "Bookmarks" (becomes "Bookmarks (N)" when there are some; removed if bookmarks are off; the whole pill row is removed if fewer than 2 pills remain).
  3. Intro line: "Find verified legal professionals to support your practice."
  4. Help link button "What does match-ready mean?" with a small "i".
  5. Card "Find a freelancer": search box, a button row, and the folded Filters panel.
  6. Section "Find a freelancer with DELA" (accordion; only with `ai_helpers`). It is inserted between the search card and the results.
  7. Results: heading row (count, filter chips, "Clear all", sort), result cards, then "Showing X of N freelancers." and "Load more freelancers".
- Content and data shown (result card, one per freelancer): photo or initial; name; headline; trust line: "✓ Verified member" (only when verified; tooltip "The Lawfecta Team checked this member's identity and profile. It is not a check of qualifications."), "★ 4.8 (N reviews)" or "N review(s)" (only when there are reviews), "Bookmarked" (when bookmarked); summary text; up to 3 tags (first 2 practice areas, then software); facts line joined with " • ": "N hrs/week" plus " (limited right now)" when availability is limited, "<timezone> Time", "Availability confirmed <date>".
- Interactive elements:
  - View pills "Search" / "My bench" / "Bookmarks": switch the view.
  - "What does match-ready mean?": opens a small panel. On a mouse it opens on hover and focus; a click pins it; Escape closes it. On touch a tap toggles it.
  - Search box: label "Search roles, specialties, tasks and software"; placeholder "Search by role, practice area, skills or software (for example \"Family law paralegal\" or \"Clio\")". It is a combobox: typing shows up to 8 category suggestions (name plus its path, or " Category" for a top level); picking one sets the category filter and searches; Enter searches; arrow keys move; Escape closes the suggestions and keeps the words. (catSearchBox, outside range, line 6850.)
  - Button "Filters (N)" (filter icon; aria-label "Filters, N in use"): opens or closes the Filters panel; focus goes to the first dropdown; Escape inside the panel closes it.
  - Button "Search freelancers" (blue): runs the search.
  - Button "Clear filters": resets every filter and the search words, then searches.
  - Filters panel (each filter searches as soon as it changes):
    - Dropdown "Category": "Any category" plus the top-level categories (loaded from the website; names not in this code).
    - Dropdown "Practice area / Specialty": "Any specialty" plus specialties (grouped under category headings when no category is chosen).
    - Dropdown "Services / Tasks": "Any service or task" (or "Nothing more specific" when the chosen specialty has none) plus tasks (grouped when no specialty is chosen).
    - Dropdown "Software": "Any software" plus the software list (loaded; names not in this code).
    - Dropdown "State / Jurisdiction": "Any state" plus the US states. Hint: "Leaves out freelancers who do not take work for that state."
    - Checkbox " Bookmarked only (freelancers you saved)" (only if bookmarks are on).
    - Button "★ Your bookmarks" (only if bookmarks are on): clears the other filters, ticks Bookmarked only, searches.
    - Button "Apply filters" (blue): searches and closes the panel.
  - DELA help accordion header button: "✦", bold "Find a freelancer with DELA", sub-line "Use DELA to describe your project and get suggested search filters.", cost label "N DELA action(s)" or "Your own AI key" with an "i", caret "▾"/"▴". Opens or closes the panel.
    - Text box: label "What do you need help with?"; placeholder "For example: family law paralegal in Clio to help with e-filing motions." (2 rows, no length limit in this code).
    - Safety line (shield icon): "Don't enter confidential client information, personal identifiers, or passwords."
    - Button "✦ Suggest filters" (while working: "DELA is checking..."). If the text looks like client information, a browser OK/Cancel pop-up: "This may include client information (...). Use placeholders instead. Click OK only if it is not client information."
    - After suggestions: heading "DELA suggested filters"; button "Clear all suggestions"; line "Review or remove the suggestions below. Nothing is searched until you apply them."; chips worded "Practice area: X", "Skill: X", "Software: X", "State: X", each with "×" (aria-label "Remove suggestion: ..."); optional note from DELA; button "Apply filters & search" (blue); button "Edit filters manually" (fills the filters, opens the panel, toast "The filters are filled in. Change them, then click Search freelancers.").
  - Results heading row: chips for each filter in use with "×" (aria-label "Remove filter: ..."). Chip wording: the category path joined with " › ", the search words in quotes, "Practice area: X", "Skill: X", "Software: X", "Bookmarked", the state name. Button "Clear all" (only when chips exist). Dropdown "Sort by ": "Most relevant", "Most reviews", "Most hours a week", "Name, A to Z" (shown only when there are results).
  - Per card: "View profile" (opens the profile page), "Invite to gig" (blue; opens the invitation review step, outside range, line 6934; if the attorney has exactly one open gig it is preselected).
  - "Load more freelancers" (while loading: "Loading..."): adds the next page under the list; focus moves to the first new card.
- States:
  - Loading: "Loading the categories...", "Searching..." (also announced to screen readers).
  - Count heading: "N freelancer found" / "N freelancers found".
  - Empty: "No match-ready freelancers fit this search yet. Try a broader category or fewer words."
  - Categories failed: "The categories could not be loaded right now. You can still search by words, software and state." (only Software and State filters show).
  - Errors: "That category is no longer on the Lawfecta website. Choose another one."; "Your bookmarks could not be read, so nothing is shown. ..."; other errors through the shared gig error text; each with a "Try again" button. Screen reader line "The search did not work."
  - Load more errors: "More could not be loaded. Try again." / "More could not be loaded. Check your connection and try again."
  - DELA help: "Type a few words about the work first."; "DELA found no filters to suggest. Add a little more about the work, or use the filters above."; other errors from the shared helper error list.
- Help: match-ready panel: bold "Match-ready freelancers"; bullets "Completed their required profile information", "Passed the Lawfecta Team's member check", "Confirmed their availability within the last N days" (or "Confirmed their availability recently"); footnote "Match-ready does not guarantee qualifications, fit or availability for a particular project." Cost tooltip on the DELA label: "\"Suggest filters\" uses N DELA action(s). No DELA action is used if you connect your own AI key. Opening this and typing use nothing." or "\"Suggest filters\" runs on your own AI key, so it uses no DELA action."
- Variations: "My bench" pill by switch `bench`; Bookmarks pill and the two bookmark controls by the website's bookmark setting; DELA help by `ai_helpers`; cost label by own AI key.
- Mobile/accessibility: pills are a tablist; live status region for counts; filter button has aria-expanded; result cards are `article` with aria-label of the name; scroll position is restored when coming back from a profile.
- UX observations (mine):
  - Three ways to run a search sit close together: "Search freelancers", "Apply filters" and the filters auto-searching on change. "Apply filters" is redundant with auto-search.
  - Two clear actions with different words: "Clear filters" (button row) and "Clear all" (chip row), plus "Clear all suggestions" in DELA help.
  - Bookmarks are reachable three ways: the "Bookmarks" pill, the "Bookmarked only" checkbox and the "★ Your bookmarks" button.
  - The trust wording differs between places: "✓ Verified member" on cards, "✓ Verified" on the profile.
  - The time zone reads "<timezone> Time" on cards and "<timezone> time" on the profile; hours read "hrs/week" on cards and "hours a week" on the profile.

## Talent: Bookmarks (attorney; agency that hires)
- How to reach it: Talent, pill "Bookmarks". `bookmarksView()` line 7056.
- Purpose and primary focus: see the freelancers saved for later and open or invite one.
- Shown when: the website's bookmarks are on.
- Layout, top to bottom: heading "Talent", pills, intro "Freelancers you saved for later. They are not told. To add one, open a profile from Search and click \"☆ Bookmark\".", then the same result cards as Search under the heading "Bookmarks (N)" (no sort dropdown, no chips), then a card "Not available right now (N)" when some bookmarked people are not listed.
- Content: result cards as in Search. The "Not available right now (N)" card has the line "You bookmarked these freelancers, and they are not listed in Talent at the moment. They show above again when they are available." and one row per person with the name.
- Interactive elements: per card "View profile", "Invite to gig". In the not-available card, per row "Remove bookmark" (aria-label "Remove the bookmark for <name>"); no confirm step.
- States: "Loading your bookmarks..."; empty: "Nobody yet. Open a freelancer's profile from Search and click \"☆ Bookmark\"."; screen reader lines "N bookmark(s)" / "Your bookmarks could not be read."; errors show as a red notice. Up to 50 are loaded (no "Load more" in practice).
- UX observations (mine): there is no way to remove a bookmark from an available person's card here; the member has to open the profile. No reason is given for "not available".

## Talent: My bench (attorney)
- How to reach it: Talent, pill "My bench" (switch `bench`). Drawn by `benchView()` (outside range, line 10510). Not inventoried here.

## Freelancer profile page (attorney; agency that hires)
- How to reach it: "View profile" on a Talent card, from Home, or from an introduction conversation; address `?tab=talent&person=<id>`. `talentProfilePage()` line 7360. The browser Back button returns to the search.
- Purpose and primary focus: judge one freelancer, then "Invite to gig" (or message, book a call, bookmark).
- Shown when: Talent is open and the address names a person.
- Layout, top to bottom:
  1. Button "← Back to Talent search".
  2. Header card: photo or initial; name (h1); headline; a line with "✓ Verified" or "Not verified yet", the review line ("No reviews yet", "★ 4.8 (N reviews)" or "N review(s)"), and badge "Not taking new work right now" when not available; a facts line joined with " | ": "N hours a week", "<timezone> time", "Based in <state>", "Works with <agencies>" or "Works through <company>". Right side: bookmark button, "Send message", "Book a call", and below them "Invite to gig".
  3. Tab bar (aria-label "Sections of <name>'s profile"): "Overview", "Services", "Experience and qualifications", "Portfolio", "Reviews" or "Reviews (N)".
  4. The tab panel.
- Tab "Overview" (two columns on a wide screen):
  - Left: card "Professional summary" (or "<name> has not written a summary yet."); card "Primary services" (first 6 service titles; only if any); card "Software expertise" (chips; only if any); card "Practice areas and categories" (practice-area chips, then category chips grouped under each top category name; only if any).
  - Right: card "Quick facts" with rows "Availability" ("N hours a week", plus " (limited right now)"), "Usual hours", "Time zone", "Agency affiliation", "Reviews" (empty rows are left out); card "Verification" ("✓ Verified" or "Not verified yet", a sentence, and an expandable "What does verified mean?"); card "Current promotion" / "Current promotions" (up to 2 titles with " Through <date>", and button "See promotions" which jumps to the Services tab).
- Tab "Services": card "Services offered" with note "Prices are the member's own starting points. The price of a job is set in the proposal and the agreement."; each service: title, price ("$X to $Y", "From $X", "$X", with " an hour" when hourly, or "No price given"), and who it is for. Then card "Promotions" (only if any): note "Offers this member posted on Lawfecta. The price and scope of a job are confirmed in the proposal and the agreement."; each: title, text, "Code: <code>", "Ends <date>" or "No end date given".
- Tab "Experience and qualifications": card "Professional experience" (list); card "Education and credentials" (list, note "Written by the member. Lawfecta does not check each item."); card "Practice and technology experience" with sub-headings "Practice areas", "Skills", "Software" (chips). If none: card "Experience and qualifications" with "<name> has not added experience or qualifications yet."
- Tab "Portfolio": card "Work samples"; note "Samples the member chose to show. Members confirm they hold no client information. They open inside Lawfecta for a few minutes at a time."; each sample: name, type and size ("PDF, 1.2 MB"), button "Open sample".
- Tab "Reviews": card "Reviews from completed engagements"; the list itself is drawn by `reviewsList()` (outside range, line 10374).
- Interactive elements:
  - "← Back to Talent search".
  - Bookmark toggle "☆ Bookmark" / "★ Bookmarked" (aria-pressed; aria-labels "Bookmark <name>" / "Remove the bookmark for <name>"); disabled until bookmarks load; removed if bookmarks are off. (outside range, line 6907.)
  - "Send message" (attorney side only): opens or creates the introduction conversation in the Inbox.
  - "Book a call" (blue; attorney side with switch `meetings`): opens the introduction conversation with the booking panel already open.
  - "Invite to gig" (blue; when the member can hire): opens the invitation review step.
  - The five tabs: click; arrow keys, Home and End move between them.
  - "What does verified mean?" (expandable).
  - "See promotions".
  - "Open sample" (aria-label "Open the sample <name>"): opens in a new browser tab.
- States: "Loading the profile..."; "This profile could not be opened. The member may have closed their freelancer profile."; Portfolio: "Work samples are shown to members who hire.", "<name> has not shown any work samples yet.", "Opening...", "This sample is no longer shown."; Services: "<name> has not listed services yet."; Reviews: "Loading...", "No reviews yet. A review can only be left after a completed Lawfecta engagement, so a new member starts with none."
  - Message/call errors (toasts): "Conversations before a gig are not open yet."; "Only attorneys can start a conversation from Talent."; "Your account is on hold. Contact the Lawfecta Team from Help."; "Verify your bar license first. Open Profile to finish it; it is needed before you contact a freelancer or post a gig."; "This freelancer is not taking new conversations right now."; "This freelancer could not be found."; "You have started N new conversations in the last day, which is the limit. Try again tomorrow, or write in one you already have."
- Help: Verification card text: "The Lawfecta Team checked this member. Experience, education and skills are written by the member and are not checked one by one." or "This member's check is not finished. Experience, education and skills are written by the member."; inside the expander: the shared glossary text for "verified", then "Verified does not mean Lawfecta checked a license, a certificate or each job listed, and it does not promise the member fits your project."
- Variations: "Send message" and "Book a call" check `me.side === "attorney"`, while "Invite to gig" and the bookmark check `canHire()` (attorney or agency that hires). So an agency that hires sees Invite and Bookmark but no message or call button.
- Mobile/accessibility: full W3C tabs pattern; the panel is focusable; photos have alt "Photo of <name>".
- UX observations (mine): four actions in the header ("☆ Bookmark", "Send message", "Book a call", "Invite to gig") with two of them blue. Promotions appear in two places (Overview right column and under Services) and there is no "Promotions" tab, so "See promotions" lands on "Services". Software chips repeat on Overview and on Experience.

---

## Work (freelancer)
- How to reach it: menu item "Work", `?tab=work`. `workView()` line 7597.
- Purpose and primary focus: see invitations, matched gigs and proposals, and open a gig to send a proposal.
- Shown when: side freelancer. Engagements list needs switch `engagements`.
- Layout, top to bottom:
  1. Heading "Work".
  2. Notice (only when not match-ready): "You are not match-ready yet, so attorneys cannot find you. Finish your Profile and confirm your availability."
  3. Green notice with the proposal allowance and a help tip.
  4. "Your engagements" list (switch `engagements`; drawn outside range).
  5. Standing card (outside range, line 6703).
  6. Card "Invitations (N)".
  7. Card "Matches (N)".
  8. Card "Open gigs (N)" (only when there are any).
  9. Card "Drafts (N)".
  10. Card "Sent proposals (N)".
  11. Bench card for freelancers (outside range, line 10556).
- Content and data shown: allowance text is "No monthly cap on proposals on your plan (spam limits still apply)." or "N of M proposals left this month. Resets <date>. Invited proposals do not count." Each gig row: title; budget ("$X" or "$X to $Y") plus " | due <date>" and " | closes <date>"; "Why it fits: reason | reason"; "Invitation: <the attorney's note>"; a proposal status badge.
  - Proposal status words (outside range, line 4942): "Draft", "Sent", "Being checked", "Withdrawn", "Chosen", "Not chosen", "Closed". When the attorney changed the scope the badge adds ": please confirm" and turns amber.
- Interactive elements: each gig row is clickable (role button) and opens the gig page. Button "Open my profile and availability" (only in an empty Matches card). Help tip "What is the proposal allowance?".
- States: "Loading..."; "Flex Gigs are not open for your account yet."; empty texts: "No invitations right now."; "No matches right now. Keep your availability confirmed and your profile up to date."; "No saved drafts."; "Nothing sent yet."
- Help: tip text (shared, D.HELP.proposal_allowance): "How many proposals you can send this month on your plan. It resets on the 1st. Proposals to gigs you were invited to do not count."
- Mobile/accessibility: rows have role button and tabindex, but this code adds only a click handler here (no Enter/Space handler visible in this range).
- UX observations (mine): five to seven stacked cards with counts and no tabs or filters; empty cards still take space. The row has no visible "Open" button or arrow, only a pointer cursor.

## Gig page for a freelancer (freelancer)
- How to reach it: click a gig row on Work (or a deep link). `workGig()` line 7636.
- Purpose and primary focus: read the gig and send a proposal (or, once hired, reach the engagement).
- Layout, top to bottom:
  1. Button "← Work".
  2. Gig title with a status badge. Gig status words (outside range, line 4941): "Draft", "Open", "Paused by the Lawfecta Team", "Closed", "Filled", "Canceled".
  3. "Posted by <firm> (agency)." line.
  4. Button "Reviews of this attorney" / "Reviews of this agency" (switch `reviews`).
  5. Green invitation notice (when invited): "You are invited to send a proposal. An invited proposal does not use your monthly allowance." plus " The attorney wrote: <note>", with a "Decline" button.
  6. Engagement panel (when chosen or hired, switch `engagements`; outside range).
  7. Card with the public gig description (outside range, line 4999).
  8. Client card headed "Who posted this gig" or "Who you are working with" (outside range, line 3007).
  9. Button row: "Message the attorney" / "Message the agency" (switch `gig_chat`), "Your meetings" (switch `meetings`). Shown to invited, applicant or hired freelancers.
  10. Card "Milestones": numbered list of titles; note "DELA finalizes the milestones with the agreement. You review and sign before any work starts."
  11. Card "The work handed to you" (watermarked; when a playbook is shared).
  12. References block (outside range).
  13. Card "Files for this gig": note "Read only, for this gig only. Each file is open to you until the date shown or until the job is complete. Downloads are logged and shown to the attorney."; each file: name, " | until <date>", button "Open".
  14. Card "Questions": note "Answers are shown to every applicant. Keep everything on Lawfecta: no contact details or payment outside it."; each "Q: ..." with "A: ..." or "Being checked by the Lawfecta Team." or "Waiting for an answer."; a text box and "Ask the attorney" (only while the gig is open).
  15. Card "Your proposal" (see next section). Hidden when hired without a proposal of their own.
- Interactive elements: "← Work"; "Reviews of this attorney/agency"; "Decline" (POP-UP: "Decline this invitation?"; toast "Declined"); "Message the attorney/agency"; "Your meetings"; file "Open" (new tab); question text box (aria-label "Your question", 2 rows, no placeholder); "Ask the attorney" (toast "Question sent", or the hold note).
- States: "This gig is not available to you."; errors as a red notice.
- UX observations (mine): a long single column with up to 12 blocks; the proposal form, the main action, sits last. The question box has no visible label. "Your meetings" goes to the whole meetings list, not to this gig's meetings.

## Your proposal: form and sent state (freelancer)
- How to reach it: bottom card of the gig page. `proposalCard()` line 7685.
- Purpose and primary focus: write and send one proposal for this gig.
- Sent state (proposal exists and is not a draft): status badge, price, and notes " | sent for your agency", " | used one of your proposals" / " | used one of the agency's proposals" / " | invited, did not use your allowance"; line "Includes: ..."; when held: "DELA is holding your proposal for a quick check by the Lawfecta Team, because it may plan contact or payment outside Lawfecta."
  - Buttons: "Confirm my proposal still stands" (blue; when the attorney changed the scope; toast "Confirmed. The attorney can choose it now."); "Withdraw" (POP-UP: "Withdraw your proposal? A withdrawn proposal does not give your monthly allowance back."; toast "Withdrawn").
- Closed gig: "This gig is not taking proposals."
- Form, top to bottom:
  - Small line: "You were invited, so this proposal does not use your allowance. " or the allowance text, then "Milestones are set after hiring. Keep everything on Lawfecta."
  - Agency box (only for a freelancer on an agency team): dropdown "Send as": "<Agency name> (agency)" for each agency, plus "Myself" when solo proposals are allowed. Then "Who will do this work (required). The attorney sees each person you pick, with their profile and reviews."; one row per team member: checkbox with "<name> (owner / manager / member)" and a text box with placeholder "Role on this job, for example Lead paralegal" (max 80 characters, disabled until ticked); line "Uses the agency's shared allowance. <allowance text>". Messages: "Nobody on your team has finished their own verification yet."; "Your agency already sent a proposal for this gig."
  - "Total price ($)" number box (min 0, step 1) and "Days to deliver" number box (1 to 365), side by side.
  - "What your price includes" (text area, 3 rows).
  - "What it leaves out" (text area, 2 rows). Hint: "Say it plainly, so the attorney compares complete proposals."
  - "Schedule" (one line). Placeholder "For example: draft in 3 days, final 2 days after comments".
  - "Your relevant qualifications" (text area, 4 rows). Hint: "From your profile. DELA never invents qualifications." Beside it the button "✦ Let DELA help with qualifications" (fills qualifications, and "includes" if empty; toast "DELA drafted this from your profile. Check it before sending.").
  - "Note to the attorney (optional)" (text area, 2 rows).
  - Button "✦ Check my proposal" (shared helper button, outside range, line 5708).
  - Buttons: "Save draft" (toast "Draft saved. It is not sent.") and "Send proposal (uses 1)" or "Send proposal (free: invited)" (blue).
- States: on send, if it looks like client information, POP-UP: "This may include client information (...). Click OK only if it is not." Toasts: "Proposal sent" plus the remaining allowance, or the hold note. Agency without people ticked: toast "Choose at least one person in \"Who will do this work\"." No length limits or required marks are set in this code; the server decides.
- UX observations (mine): seven fields with no required marks and no inline validation. The button label "Send proposal (uses 1)" does not say one of what. The agency version still says "(uses 1)". Field label "Note to the attorney (optional)" differs from its aria-label "A short note to the attorney (optional)".

## Card: What DELA has learned about you (both)
- How to reach it: a card placed on another page (the caller is outside this range). `insightsCard()` line 7783.
- Purpose: review and remove facts DELA keeps about how the member works.
- Layout: heading "What DELA has learned about you"; note "DELA notes useful facts about how you work from what you send on gigs, to help you better. It never keeps sensitive data. Removing a fact means DELA stops using it in its answers from now on; it does not change anything you already sent."; one row per fact: the fact, "Learned from <source>, <date>." and a "Remove" button.
- Source wording: "an invitation you sent", "a proposal you sent", "a question you asked on a gig", "an answer you gave on a gig", "a message you sent on a gig", fallback "what you sent on a gig".
- Interactive elements: "Remove" per row (aria-label "Remove: <fact>"; no confirm; toast "Removed").
- States: "Loading..."; "This is not open for your account yet."; "Nothing yet."; on a load failure the card goes blank.

---

## Inbox: conversation list (both)
- How to reach it: "Inbox" button in the top bar, `?tab=inbox`. `inboxView()` line 7888.
- Purpose and primary focus: find a conversation and open it.
- Shown when: messages are on for the account (otherwise "Messages are not open for your account yet."). The "Bench" filter shows only when the member has a bench conversation.
- Layout, top to bottom:
  1. Row: heading "Inbox" and the link "Privacy and secure sharing" with an "i".
  2. The privacy notice (opens in place under the heading).
  3. Intro: "Conversations about gigs, introductions and project work. Keep all work, contact and payment on Lawfecta."
  4. Search box, label "Search conversations".
  5. Row: filter pills (tablist "Conversations to show") on the left, "Sort " dropdown on the right.
  6. Two columns on screens 1000px and wider: left card "Conversations" with "N total", the list and a footer; right card "Quick preview". Under 1000px the preview card is hidden.
- Content and data shown (list row): unread dot; face (photo or initial); name (bold when unread); time (today: the time; yesterday: "Yesterday, <time>"; else the date and time); a kind tag "Gig", "Introduction" or "Bench"; the title (the gig title, or for an attorney's introduction "Your introduction to <name>"); a preview ("You: " prefix for the member's own message, or "No messages yet · Conversation started <when>"); an unread count; a "›" chevron.
- Quick preview card: heading "Quick preview" with "Selected conversation"; face, name, kind tag and title; a box "Conversation context" with "An introduction, before any gig", "Your ongoing bench conversation" or the gig title, and "Newest message <when>." or "No messages yet. The conversation started <when>."; buttons; "Recent messages" with bubbles and a line "You · <when>" or "<name> · <when>", plus " · in a thread" and " · being checked", and file counts " (N file(s))"; "The newest N of M messages."; the notice "For private client materials, add a secure link on the job. Never put sensitive data in a message."
- Interactive elements:
  - "Privacy and secure sharing": opens the blue notice in place; the notice has a "×" (aria-label "Close the privacy notice"). Notice text comes from the account, default "Never enter sensitive data in DELA. Keep it in your own storage and add a secure link to the job."
  - Search box: placeholder "Search people, gig titles and message text". Filters as the member types (150 ms delay); Escape clears it. Matches names, gig titles, the newest message and the kind word.
  - Filter pills, each with a count: "All (N)", "Unread (N)", "Gigs (N)", "Introductions (N)", "Bench (N)".
  - "Sort " dropdown: "Most recent", "Oldest first", "Name, A to Z".
  - A list row: on a wide screen the first click selects it and shows the preview; a second click or a double click opens the conversation. On a narrow screen one click opens it.
  - "Show more conversations" (20 at a time), with "Showing X of N conversation(s)."
  - In the preview: "Open conversation →" (blue), "View gig" (gig conversations only; goes to Projects for attorneys, Work for freelancers).
- States: "Loading..."; no conversations at all: attorney "No conversations yet. Invite a freelancer to a gig, or message someone who sent a proposal."; freelancer "No conversations yet. They start when an attorney invites you or when you send a proposal."; filtered empty: "No conversation matches \"<words>\". Try fewer words, or choose \"All\"."; "Nothing unread. You are up to date."; "No conversations here yet."; preview: "Choose a conversation to see its newest messages here.", "Loading...", "No messages yet.", "The messages could not be loaded. Open the conversation to read them."
- Mobile/accessibility: rows are buttons with a full aria-label (unread count, name, kind, title, preview, time, and "Shows a preview; choose it again to open the conversation."); live region announces "N conversation(s)"; the selected row has aria-current.
- UX observations (mine): the two-click pattern on wide screens (select, then open) is unusual; the preview's "Open conversation →" duplicates it. The search and filter state persist between visits; the search box and filters do not show at all when there are zero conversations. "N total" counts the filtered rows, so the word "total" can mislead.

## Inbox: a conversation (both)
- How to reach it: open a row in the Inbox, "Send message" on a profile, "Message the attorney" on a gig, or `?tab=inbox&thread=<id>`. `threadView()` line 8017.
- Purpose and primary focus: read the messages and send one.
- Layout, top to bottom:
  1. Row: "← Inbox" on the left, "Privacy and secure sharing" on the right (same notice as the Inbox).
  2. Header card: face, firm logo (when the other side is a client with one), the person's name (h1), for freelancers a line "✓ Verified" plus " · Attorney at <firm>" or " · Agency at <firm>", and what it is about: "Introduction, before any gig", "Bench conversation: <title>" or "Gig: <title>". Action buttons on the right.
  3. A grey explainer line (differs by kind, see States).
  4. Green notice when an introductory call is booked: "An introductory call is booked for <day, date, time, zone, (N minutes)>, <zone>. " with the link "Open the meeting".
  5. Booking panel (appears here when "Book a call" or "Book a meeting" is clicked; see the booking section).
  6. Messages card (aria-label "Messages"): date dividers ("November 17, 2026"), bubbles (the member's own on the right), a line under each: "You · <time>" or "<name> · <time>", plus " · edited" and, on the member's newest message, " · ✓ Seen <when>".
  7. Thread side panel "Thread" (opens beside the messages on a wide screen, in place of them on a narrow one).
  8. Composer card: label "Message", the text box, the rule line, draft warning, error line, attachment chips, then a row with "Attach a file" menu, "✦ AI tools" menu and "Send"; under it the attachment picker and the AI suggestion panel.
- Interactive elements:
  - "← Inbox".
  - Header actions: "View profile" and "Create a gig for <name>" (attorney in an introduction); "Open the gig" (gig conversations); "Book a call" (blue; attorney in an introduction, switch `meetings`, none booked yet); "Book a meeting" (blue; gig conversations, switch `meetings`); menu "More ▾" with "Report this conversation" (POP-UP text prompt: "What is wrong? The Lawfecta Team reads every report."; toast "Reported to the Lawfecta Team") and "Block this conversation" / "Unblock" (POP-UP on block: "Block this conversation? New messages and meetings stop, and upcoming meetings are canceled. The Lawfecta Team is told."; toasts "Blocked" / "Unblocked"). The block item is hidden when the other person did the blocking.
  - "Open the meeting" (link in the booked-call notice).
  - Per message: "Open <file name>" for each attachment (new tab); "↪ Reply in thread · N reply/replies" (opens the Thread panel); menu "⋯" on the member's own message for the first minutes (aria-label "Edit or remove what you sent at <time>") with "Edit message" (POP-UP text prompt: "Edit your message (the earlier text is kept for the Lawfecta Team):"; toast "Edited") and "Remove message" (POP-UP: "Remove this message? The other person sees \"Message removed\"."), and the note "Shown only within N minutes of sending."
  - Thread panel: "← Back to the conversation"; "×" (aria-label "Close the thread"); the original message under "Original message · <who> · <when>"; replies; text box labeled "Reply in thread" with placeholder "Write a reply..."; "Send reply →" (blue; toast "Reply sent in the thread.").
  - Composer text box: label "Message", placeholder "Write your message...", 3 rows, no length limit in this code. The draft is saved when the box loses focus.
  - Menu "Attach a file ▾" (not shown in introduction or bench conversations): "Upload a new file" (attorney with switch `file_uploads`) and "Choose from Lawfecta Files" (attorney) or "Choose from your profile documents" (freelancer).
    - Choose: a box headed the same words, a checkbox per ready file with its name and "(version N, added <date and time>)", and "Done".
    - Upload: the browser's file chooser, then a box "Upload \"<file name>\"" with the checkbox "This file has no sensitive data (SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords).", "Upload and attach" (disabled until ticked) and "Cancel".
    - Chosen files show as chips with "×" (aria-label "Remove attachment: <name>").
  - Menu "✦ AI tools ▾" (switch `chat_assistant`): "Draft a reply", "Suggest next steps", "Summarize conversation". Working lines: "Drafting your reply...", "Working out the next steps...", "Summarizing the conversation...". Result headings: "✦ Suggested draft", "✦ Suggested next steps", "✦ Summary of this conversation", with the shared AI label. Draft: note "A suggestion, not sent. Check it before you send it." and buttons "Use suggestion" (toast "Added to your message. Nothing is sent until you click Send."), "Edit" (puts it in the box and selects it), "Dismiss". Others: note "For reading only. It does not change the gig, a proposal or an agreement." and "Dismiss". On error: the reason, "Try again", "Dismiss".
  - "Send" (blue).
- States:
  - "This conversation is not available to you."
  - Explainer lines: introduction, attorney: "A conversation before any gig. Messages and an introductory call only: files come with a gig. Nobody is hired here. Keep all work, contact and payment on Lawfecta."; introduction, freelancer: "An attorney wrote to you before posting a gig. Messages and an introductory call only; nobody is hired here. Keep all work, contact and payment on Lawfecta."; bench: "<title>: your ongoing bench conversation. It shares no files and is not a contract; new work goes through a gig. Keep all work, contact and payment on Lawfecta."; gig: "About the gig \"<title>\". Keep all work, contact and payment on Lawfecta."
  - Empty: "No messages yet. Say hello and ask what you need to know." Thread empty: bold "No replies yet", "Reply to this specific message without interrupting the main conversation."
  - Removed message: a grey pill "⊘ Message removed · <time>" plus "Removed by the Lawfecta Team: it looked like a plan to work or pay outside Lawfecta.", "You removed this message." or "The sender removed this message."
  - On a bubble: "Being checked by the Lawfecta Team. The other person does not see it yet."; "Sent with a reminder: keep all work, contact and payment on Lawfecta."
  - Rule line under the box: "No sensitive data, contact details or payment outside Lawfecta." (switch `client_details_allowed` on) or "No client information, contact details or payment outside Lawfecta."
  - Draft warnings: "Before you send: this draft looks like it has sensitive data (...). DELA will not send it. Take that part out."; "Before you send: this draft looks like it plans contact or payment outside Lawfecta. A message like this is held for the Lawfecta Team to check. Keep everything on Lawfecta."; "Before you send: this draft may include client information (...). DELA will ask you to confirm when you click Send."
  - On send: sensitive data is refused with a red line that stays under the box; client information triggers a POP-UP: "This may include client information (...). Click OK only if it is not."; held or warned messages show the server's note as a toast.
  - Closed conversation (no composer), one of: "This conversation is blocked."; "This conversation closed 30 days after the gig closed."; "This bench conversation is closed, because the freelancer is no longer on the bench."; "This engagement is complete, so its conversation is read only. Use your bench conversation to keep in touch."; fallback "This conversation is closed." Thread on a removed message: "This message was removed, so it takes no new replies."
  - Other error toasts (TALK_ERR, line 7813): "A bench conversation does not share files. Share files on a gig."; "You are sending messages very fast. Wait a moment."; "A message can be edited or removed for 15 minutes after it is sent."; "That message is no longer there, so the reply was not sent."; "That edit looks like contact details or payment outside Lawfecta. Send it as a new message instead, so DELA can check it."; "DELA's help in messages is not open for your account yet."; "There are no messages yet."
  - Attachments: "Loading your files..."; "No ready files yet. Choose \"Upload a new file\", or upload on the Files page."; "No ready profile documents. Add one on your Profile first."; "Uploading <name>..."; "The file was not uploaded. Check your connection and try again."; "\"<name>\" is in your Lawfecta Files and is being checked. In a moment, choose it with \"Choose from Lawfecta Files\"."; toast "Attached. It is also saved in your Files."
- Variations: by kind (introduction, bench, gig) for the header actions, explainer and attachments; by side for the header (freelancers see the client's name, verified mark and firm) and for the attachment sources; by switches `meetings`, `chat_assistant`, `file_uploads`, `client_details_allowed`.
- Mobile/accessibility: menus are `details` elements that close on Escape and return focus; the Thread panel replaces the conversation on a narrow screen with "← Back to the conversation"; message lists use aria-live for replies.
- UX observations (mine): Edit, Report and Cancel-style inputs use the browser's plain prompt pop-up, which is hard to style and cannot hold a long edit comfortably. The header can hold up to five buttons plus "More". There is no Enter-to-send or character count. "Book a call" and "Book a meeting" insert a panel high in the page, away from the button. No "Send" disabled state for an empty box (the click is ignored silently).

---

## Booking panel: Book a meeting / Book an introductory call / Choose a new time (both; first booking is attorney only)
- How to reach it: "Book a call" or "Book a meeting" in a conversation; "Change the time" on a meeting card. `bookPanel()` line 8343. It is a card inserted into the current page (fourth block from the top), not a separate page.
- Purpose and primary focus: pick a length, a date and a time, then confirm.
- Shown when: switch `meetings`; the conversation is writable.
- Layout, top to bottom: heading "Book a meeting", "Book an introductory call" or "Choose a new time"; for a new introductory call the notice "An introductory call is a first conversation. It hires nobody, costs nothing and creates no gig. Keep all work, contact and payment on Lawfecta."; the line "Times are shown in your time zone (<zone>). Meetings are free and happen in a Lawfecta meeting room. The freelancer's time zone: <zone>." (freelancer sees "Your availability is set in <zone>."); dropdown "Length"; dropdown "Date"; the chosen day in bold with " | N minutes | times in <zone>"; time buttons; a summary box.
- Interactive elements:
  - Dropdown "Length": "N minutes" for each length the freelancer offers (the allowed set defaults to 15, 30, 45). Changing it reloads the times.
  - Dropdown "Date": each day as "Mon, Nov 23 (N open time(s))".
  - Time buttons (toggle, at least 96 by 44 px; aria-label "<time>, <full date>"): 8 at first, then "Show more times (N)".
  - Summary: "Selected: <day, date, time, zone (N minutes)>, <zone>" with the button "Review booking" or "Review the new time" (blue).
  - Clicking it holds the time, then a POP-UP: "Book <when>? Both of you get one confirmation with a calendar file." / "Book an introductory call on <when>? ..." / "Move the meeting to <when>? ...". Cancel releases the hold. OK confirms and opens the meeting's page with toast "Booked. A confirmation is on its way to both of you." or "Moved. One update went to both of you."
- States: "Loading open times..."; "Set your availability for meetings on your Profile first." (freelancer); "This freelancer has not set their availability for meetings yet. Send them a message." (attorney); "No open times in the next <N days> for this length."; errors: "Booking is not open for your account yet."; "Someone just took that time. Choose another."; "That is the meeting's current time. Choose a different time."; "The time was held for 10 minutes and ran out. Choose a time again."; "Calls before a gig are not open right now."; "An introductory call with this freelancer is already booked. Open Your meetings to change or cancel it."; "You have booked the most introductory calls allowed in one day. Try again tomorrow."; "Only the attorney can book the first call. You can change its time once it is booked."; "This freelancer is not available for meetings right now."
- UX observations (mine): the button says "Review booking" but the review is a plain browser pop-up, not a review screen. There is no close or cancel control on the panel itself. The time zone is stated three times in one small card.

## Meetings: list (both)
- How to reach it: menu item "Meetings" (switch `meetings`), `?tab=meetings`. `meetingsView()` line 8526.
- Purpose and primary focus: see what is scheduled and join at the right time.
- Layout, top to bottom: row with heading "Your meetings" and an "Inbox" button; the line "Times are in your time zone (<zone>). \"Join the meeting\" appears on a meeting N minutes before it starts."; heading "Scheduled (N)" with meeting cards; heading "Just ended (N)" with cards (meetings still waiting for a "did it happen" answer, or ended within the confirm window); an expandable "Past and canceled (N)" with cards.
- Interactive elements: "Inbox" (goes to the Inbox); in the empty card: "Find a freelancer in Talent" (blue; attorney, unless switch `talent_search` is off) or "Open my Profile" (freelancer, switch `profiles`); the "Past and canceled (N)" expander; everything on each meeting card (next section).
- States: "Loading..."; "Booking is not open for your account yet."; empty card: bold "Nothing scheduled yet." with, for attorneys, "Book an introductory call from a freelancer's profile in Talent, or a meeting from a gig's conversation." and for freelancers "Attorneys book meetings and introductory calls with you from your open times. Set them on your Profile, in the card \"Your availability for meetings\"."
- UX observations (mine): the page heading is "Your meetings" while the menu says "Meetings". The "Inbox" button in the heading row duplicates the top bar. There is no "Book a meeting" action on this page; booking always starts somewhere else.

## Meetings: one meeting's page and the meeting card (both)
- How to reach it: after booking, from "Open the meeting" links, or `?tab=meetings&meeting=<id>`; heading "Meeting" with the button "← All meetings". The same card is used in the list. `meetingCard()` line 8568.
- Purpose and primary focus: join the meeting; before it, change or cancel; after it, say whether it happened.
- Layout of a card, top to bottom:
  1. Tinted heading band: face, "<other person>: <gig title>", status badge.
  2. When: "<weekday, month day, year>, <time> <zone name> (N minutes)" plus " | new time" if it was moved.
  3. Before the start (status confirmed): "Join the meeting" (blue) or a room line; the transcription consent checkbox; the row "Add to my calendar (.ics)", "Change the time", "Cancel".
  4. After the start: "Join the meeting" stays while a join link exists.
  5. Box "Transcript": "Summary by DELA's AI" with its lines; "Next steps" list; the note "Text only: no video or audio was kept. Both of you can read it. It is deleted on <date>."; "Read the transcript" / "Hide the transcript" and "Delete transcript".
  6. Link "Report this meeting".
  7. Introductory call only: "An introductory call before any gig. Nobody is hired by it." with "Open the conversation" and, for the attorney, "Create a gig for <name>".
  8. After the start: "Attendance: <word>." then the follow-up box, or "You said: we met / they did not come" with ". The other person answered too." or ". Waiting for the other person."
  9. Box "DELA suggests": a list "Attorney: ..." / "Freelancer: ..." and "Suggestions only. Nothing changes until one of you changes it."
  10. Canceled: "Reason: <reason>" plus " (late)".
- Status words (MEET_STATUS, line 7811): "Held, not confirmed" (amber), "Time confirmed" (green), "Done" (green), "Canceled" (grey), "Moved" (plain), "Did not happen" (grey).
- Attendance words (ATTEND, line 7812): "Not confirmed yet", "One person confirmed", "Both confirmed: you met", "You disagree on whether it happened".
- Interactive elements:
  - "← All meetings".
  - "Join the meeting" (blue): opens the meeting room over the page (older rooms open a link in a new tab). While opening: "Opening the room...".
  - Consent checkbox: "Transcribe this meeting (no video or audio is kept). DELA's AI reads the transcript to write a summary and next steps, and to check for payment talk outside Lawfecta. Nothing is transcribed unless both of you tick this." plus " You both agreed." Saves on change; toasts "Saved. Nothing is recorded unless you both agree." / "Saved".
  - "Add to my calendar (.ics)": downloads a calendar file.
  - "Change the time": opens the booking panel as "Choose a new time".
  - "Cancel" (red): POP-UP text prompt "Why are you canceling? Both of you are told. Less than N hours before counts as a late cancel."; toasts "Canceled" / "Canceled (late)".
  - "Read the transcript" / "Hide the transcript": shows the text in a scrolling box (max height 320px).
  - "Delete transcript" (red): POP-UP "Delete this transcript for both of you? The summary and next steps stay. This cannot be undone."; toast "Transcript deleted for both of you".
  - "Report this meeting" (link): POP-UP text prompt "Tell the Lawfecta Team what happened in or around this meeting. They read your report and may read the meeting's transcript. The other person is not told who reported."; toasts "Write what happened first.", "Reported. The Lawfecta Team will look at it.", "You already reported this meeting. The Lawfecta Team has it."
  - "Open the conversation"; "Create a gig for <name>" (attorney, when confirmed or done).
  - Follow-up box: line "Did the meeting happen? Tell DELA within N hours. DELA suggests next steps from both summaries."; dropdown (aria-label "Did the meeting happen?"): "Choose what happened", "We met", "They did not come"; text area (aria-label "Short summary", placeholder "What you agreed, next steps, any change to the work or price. No client information.", 3 rows); "Send" (blue). Toasts: "Choose what happened first."; "Thank you. You both answered." / "Thank you. Waiting for the other person."; "This may include client information. Use placeholders instead."
- States (room lines before the start): "Your meeting room is being set up. This takes about a minute. \"Join the meeting\" appears here shortly before the meeting starts."; "Your meeting room could not be set up yet. DELA keeps trying and the Lawfecta Team has been told. \"Join the meeting\" appears here once the room is ready."; "Meeting room not connected yet. The link appears here once Lawfecta's meeting service is connected, and you both get it before the meeting."; "The room opens at <time> on <day>."
  - Transcript: "Loading..."; "The transcript is no longer kept."; "The transcript text was deleted on <date>. The summary and next steps stay with the meeting."; "Nothing was said that could be written down, so there is no transcript."; "The transcript is being prepared. It shows here a few minutes after the meeting."
  - Single meeting page: "This meeting is no longer listed."
  - Other: "You can confirm the meeting once it has started."
- Variations: introductory call versus gig meeting (extra block 7); attorney versus freelancer ("Create a gig for <name>" is attorney only; "Change the time" is open to both); by status and by whether the start time has passed.
- UX observations (mine):
  - Possible defect to check: the "Cancel" button builds its prompt from `r.rules` (line 8601), and `r` is not defined inside `meetingCard()`. If no outer `r` exists, clicking "Cancel" would fail before the prompt shows. I did not run it; this is from reading the code only.
  - The consent sentence on the card is very long for a checkbox label, and the toast says "recorded" while the label says "transcribed".
  - Three plain browser prompts (cancel reason, report, and the booking confirm) on one page.
  - "Cancel" here means cancel the meeting; the same word is used for dismissing a panel elsewhere.
  - The follow-up "Send" button has a generic label.

## Meeting room and "Before you join" consent step (both)
- How to reach it: "Join the meeting" on a meeting card. `openMeetingRoom()` line 8427. A full-window dark layer over the page (dialog, aria-label "Meeting room: <name>, <title>").
- Purpose and primary focus: hold the video meeting without leaving DELA.
- Layout: top bar with "Lawfecta meeting: <other person> | <title>", "Keep all work, contact and payment on Lawfecta.", "To share links or files, use your DELA messages.", a status pill, and buttons; below it the room.
- Step 1, only when transcription is offered: white panel "Before you join" with the checkbox "Transcribe this meeting (no video or audio is kept)", the sentence "DELA's AI reads the transcript to write a summary and next steps, and to check for payment talk outside Lawfecta.", the paragraph "The meeting is transcribed only when both of you tick this box. If either of you leaves it unticked, nothing is transcribed. Either of you can press \"Stop transcript\" at any time. The transcript is deleted N days after the meeting; the summary and next steps stay with the meeting." and the button "Continue to the camera and microphone check".
- Step 2: the ready-made video screen (VideoSDK) with its own join screen titled "Lawfecta meeting"; camera, microphone and screen sharing are on; in-call chat, whiteboard, polls, raise hand and recording are off. Its leave screen has a button "Back to DELA".
- Interactive elements: the consent checkbox; "Continue to the camera and microphone check"; "Stop transcript" (shows only while a transcript runs); "Leave and go back to DELA".
- States: status pill "This meeting is being transcribed" (green) / "This meeting is not being transcribed"; "Loading the meeting room..."; "Your choice could not be saved. Try again."; "Your choice could not be saved. Check your connection and try again."; toasts "The room is not open right now. It opens shortly before the meeting and closes 30 minutes after it."; "The meeting room could not start. Reload the page and try again."; "The meeting room could not be loaded. Check your connection and try again."
- Mobile/accessibility: aria-modal dialog; focus goes to the checkbox or the leave button; buttons are at least 44px tall. Colours and fonts here are hard-coded inline (dark navy #0f1320 and #192031, maroon #8b2146), outside the shared stylesheet.
- UX observations (mine): this screen does not use the app's design tokens, so a restyle must touch it separately. The video area's look is controlled by the third-party screen (theme "LIGHT") inside a dark frame.

---

## Card: Your availability for meetings (freelancer; sits on the Profile page)
- How to reach it: Profile page (the placement is outside this range). `meetingAvailabilityCard()` line 8682.
- Purpose and primary focus: set the weekly hours attorneys can book.
- Layout, top to bottom: heading "Your availability for meetings"; note "Attorneys book meetings with you inside a gig, or one introductory call before a gig, from these times, with N hours of notice and N minutes between meetings. Meetings are free. Times are in your time zone."; the fields; "Save availability".
- Interactive elements:
  - Dropdown "Time zone": "New York (America/New_York)", "Chicago (America/Chicago)", "Denver (America/Denver)", "Phoenix (America/Phoenix)", "Los Angeles (America/Los_Angeles)", "Anchorage (America/Anchorage)", "Honolulu (Pacific/Honolulu)", plus the saved zone and the browser's zone if they are not in the list.
  - "Meeting lengths you offer": checkboxes "15 minutes", "30 minutes", "45 minutes" (the allowed set comes from the server).
  - Seven day rows, "Monday" to "Sunday": a checkbox, a "from" time box and a "to" time box (defaults 09:00 and 17:00). One time range per day.
  - "Days off": text box, placeholder "For example 2026-11-26, 2026-12-24"; hint "Dates as YYYY-MM-DD, separated by commas. Or pick a date below and click Add."; a date picker and the button "Add day off".
  - "Save availability" (blue; toast "Availability saved").
  - Warning with link (when the profile's time zone differs): "Your profile says your time zone is <zone>, under \"How you work\". Meeting times use the one chosen here (<zone>). " and the link "Open my profile".
- States: "Loading..."; errors: "Choose your time zone."; "Choose at least one meeting length."; "Check the hours: each day needs a start before its end."; on a load failure the card goes blank.
- UX observations (mine): the hint says click "Add" but the button says "Add day off". Days off are typed as raw dates in a text box, with no chips or remove buttons. Only one block of hours per day is possible. Two separate time zone settings exist (this card and "How you work").

## Card: Messages (both; sits on the Settings page)
- `prefsCard()` line 8742. Heading "Messages"; one checkbox: "Show \"Seen\" when I read a message, and show me when others read mine. Turning it off turns it off both ways." Saves on change; toast "Saved". No loading or error text (the card stays empty under its heading if it fails).

## Card: Emails (both; sits on the Settings page)
- `emailsCard()` line 8755. Heading "Emails"; checkbox "Email me reminders and alerts, such as new gig alerts and next-step reminders."; note "Emails about your account, payments and signed work always arrive. They go to your sign-in email, shown under \"Account and security\" at the top of this page."; a status line: "Reminder and alert emails are on." or "Reminder and alert emails are off since <date>, turned off from the link in an email." (or ending "." without the link part).
- States: "Loading..."; toast "Saved"; toast "Not saved. Try again."; "This setting could not load. Reload the page to try again."

---

## Cross-page elements seen
- Pills as tabs (`.pills`, role tablist): Talent views, Inbox filters. A separate tab bar style (`.tp-tabs`) on the freelancer profile.
- Chips with "×" (`.cat-chip`): search filters in use, DELA's suggested filters, message attachments.
- Tags (`.talent-tag`): practice areas, skills, software.
- Badges (`.badge` with tones ready / held / off): gig status, proposal status, meeting status, "Not taking new work right now".
- Notices (`.notice`, `.notice ok`, `.notice bad`, `.notice info`) and the in-place "Privacy and secure sharing" link.
- Small dropdown menus built from `details` ("More", "Attach a file", "✦ AI tools", "⋯").
- Faces: photo or a round initial (`smallFace`, `talentAvatar`).
- DELA / AI controls marked with "✦" ("✦ Suggest filters", "✦ Let DELA help with qualifications", "✦ Check my proposal", "✦ AI tools"), each stating that nothing is sent or changed until the member acts.
- Browser pop-ups: OK/Cancel confirms (decline, withdraw, block, remove message, delete transcript, booking, client-information checks) and text prompts (report conversation, edit message, cancel meeting, report meeting).
- Toasts for results (`D.toast`), with errors in red.
- The repeated rule sentence "Keep all work, contact and payment on Lawfecta." and the sensitive-data reminder.
- Loading text "Loading..." and red error notices from `D.errorText`.
- "Verified" marks: "✓ Verified member" (cards), "✓ Verified" (profile, conversation header).
- Paging pattern: "Showing X of N ..." with "Load more freelancers" / "Show more conversations" / "Show more times (N)".
- Time zone shown in words next to every meeting time.

---

# PART F

# F. Engagements, payments, confidential materials, disputes, earnings, reviews, bench

Source: `app/dela-app.js`, lines 8790 to 11228 (read in full). Every label below is copied from the code.
Lines 10619 to 11228 also hold Webhooks, the firm profile for documents, New document, the Library index table,
"Automate or delegate" and the "Get set up" home card. They are inventoried at the end (sections 24 to 31) because they
sit inside the assigned range, even though they are not engagement pages.

Helpers used here but defined outside the range (not inventoried, only named): `checkpointsCard` (line 11747),
`peopleCard` (6139), `assignmentsCard` (6175), `clientCard` (3007), `changeCompare` (5604), `noteConflict` (5628),
`helperButton` / `helperFindings` (5708 / 5740), `sensitiveBox` (5989), `expirySelect` (6029), `standingSetup` (6654),
`cardStatus` / `cardSay` (6483 / 6489), `agBadge` / `agTone` (4939), `pjTip` (5299), `aiNotice` (1847), `modal` (11915),
`showDrawer` (127), `smallFace` (8013), `field` (2455).

Status word maps (lines 8791 to 8794), used across every page here:

- Agreement status (`AG_STATUS`): draft = "Draft"; sent = "Draft"; signing = "Waiting for signatures"; signed = "Signed: waiting for the first payment"; active = "Active"; completed = "Complete"; canceled = "Canceled"; disputed = "In dispute"; paused = "Paused by the Lawfecta Team".
- Milestone status (`MS_STATUS`): pending = "Not paid yet"; awaiting_funding = "Waiting for payment"; funded = "Paid: ready to start"; in_progress = "In progress"; submitted = "Submitted"; changes_requested = "Changes requested"; accepted = "Accepted"; refunded = "Refunded"; canceled = "Canceled"; disputed = "In dispute".
- Submission status (`SUB_STATUS`): checking = "DELA is checking it"; failed = "Did not pass DELA's check"; human_review = "With a Lawfecta reviewer"; with_attorney = "With the attorney for review"; accepted = "Accepted"; changes_requested = "Changes requested".
- Agreement badge tone (`agTone`, line 4939): needs_me = "held"; active = "R"; completed = "ready"; canceled = "off"; disputed and paused = "bad"; all others no tone. In lists the badge reads "Needs your signature" when `needs_me === "sign"`.

---

## 1. Agreement and work: the engagement page (both)

- How to reach it: Attorney: Projects, open a gig, the gig view `agreement` (deep link `?view=agreement`, line 8790; `gigs.view = "agreement"`, line 5691). Freelancer: Work, open the gig; the panel is appended under the gig when the proposal is "selected" or access is "hired" (line 7647). Also reached by clicking any row of the engagements lists (section 17) and from Earnings. Functions: `engagementPanel` (8835) then `drawEngagement` (9167).
- Purpose and primary focus: One page per engagement. The ONE main thing is the "Next action" card at the top: sign, pay, start, submit, or review.
- Shown when: switch `engagements` on (callers check `me.switches.engagements`); an agreement exists for the gig.
- Layout, top to bottom:
  1. Header row: `h2` "Agreement, version N" and a status badge (agreement status words above).
  2. Optional notices (see States).
  3. Two columns (`eg-cols`): main column and side column.
  4. Main column, in order: "Next action" card (section 2); for a monthly engagement "Monthly terms" (before signing, section 10) or "Monthly engagement" (after signing, section 11); "Milestone progress" card when there are milestones (section 5; titled "This month's units" on monthly); when status is completed: "Closeout" (section 19), "Reviews" (section 20) and, for an attorney on a one-off engagement with switch `recurring_engagements`, the card "Keep this going every month"; then the folded sections; then the "Open all sections" link.
  5. Folded sections (each is a card whose heading is a button with title, one-line description and a "▾" chevron):
     - "Agreement and fees". Description, attorney: "Contract value, platform fees, payment history and the agreement versions." Freelancer: "The work, the milestones, what you receive and the agreement versions." Holds: "The agreement" card (section 7), attorney only "Your payments" (section 9, when any payment exists), freelancer only "Payouts to your bank" (short form, section 18), and "Engagement document (Word)" when the server sends `r.export`. Opens by itself while status is draft, sent or signing.
     - "Attorney decisions". Description, attorney: "Approve work at the steps that need your decision." Freelancer: "The steps where the work waits for the attorney's decision." Holds `checkpointsCard` (outside range). Opens by itself when a checkpoint has status "requested". Hidden when that card returns nothing.
     - "Propose changes" (status signing) or "Change orders" (signed, active). Description: "Propose changes to scope, price or milestones. Nothing changes until you both sign the new version." Holds section 8. Not shown on monthly engagements, nor in draft, sent, paused, disputed, completed, canceled. Opens by itself when the edit form is in use.
     - "Who's working on this". Description: "Everyone on the job, and any subcontractors." Holds: freelancer only the client card (`clientCard`), "Subcontractors" (section 12), `peopleCard`, freelancer only `assignmentsCard`. Never opens by itself. No help tip.
     - "Confidential materials". Description: "Client files, private messages and secure links for this engagement." Changes to "Coming soon. Not available yet." when the feature is off. Holds section 13. No help tip.
     - "Disputes and cancellation". Description: "Report a problem, open a dispute or cancel, with the dates and what happens to the money." Holds section 15 (or 16). Opens by itself when status is disputed or a dispute is in "notice" or "team_review".
  6. Side column: "Agreement summary" (section 3), "What happens next?" (section 4), "How milestone payments work" (section 4).
- Content and data shown: version number, status badge, everything in the sub-sections below.
- Interactive elements:
  - Each folded section heading button: opens or closes the section (`aria-expanded`, `aria-controls`). State is kept per engagement for the session (`eng.open`); another engagement starts folded again.
  - Link-style button "Open all sections" / "Close all sections" (id `eg-all`): opens or closes every section; saved in `localStorage` key `dela_eg_all`. Text beside it: " Your choice is remembered on this device."
  - "Make this monthly" (blue, small) in the card "Keep this going every month" (completed, attorney, not monthly, switch `recurring_engagements`): drafts a monthly agreement and opens it. No confirm step. Card text: "Draft a monthly agreement with the same freelancer, starting from this finished work. You both sign before anything is charged." Success message: "Drafted. Fill in the monthly terms, then both of you sign."
  - "Download the document (Word)" (ghost, small) in "Engagement document (Word)": downloads a Word file; toast "Downloaded <name>". Card text: "A Word copy of the document for this engagement, now that a milestone is accepted."
- States:
  - Loading: "Loading the agreement..."
  - No agreement: "There is no agreement for this gig yet. It starts when the attorney chooses a proposal."
  - Back from Stripe with `?paid=1` (attorney): green notice "Thank you. Your payment is confirmed." or "Thank you. Stripe is confirming the payment. This page shows it as paid within a minute (a bank payment can take about 4 business days)."
  - Signing with a deadline: "Both of you sign by <date time>. If it is not signed by then, it closes."
  - Paused: red notice "A payment on this engagement is under review with the bank, so it is paused. You can still read everything and send messages. The Lawfecta Team will be in touch."
  - Canceled: notice "This engagement was canceled: <reason>." (reason `not_signed_in_time` reads "it was not signed in time").
  - Errors come from `ENG_ERR` (lines 8795 to 8815), about 60 messages. Examples: "Agreements are not open for your account yet."; "There is a newer version of the agreement. Reload it and read the new version before signing."; "The other person changed the agreement while you were working. Reload it, then make your change again."; "Payments are not set up on this site yet, so nothing can be charged here. The Lawfecta Team is adding Stripe."; "Keep the work and the payment on Lawfecta. Remove the contact details or the plan to pay outside it."; fallback "That did not work."
  - Stripe test mode note appended to payment text: " Stripe is in test mode here: use Stripe's test card 4000 0000 0000 0077 (any future date, any 3 digits)."
- Help: tips on folded sections (`EG_HELP`): Agreement and fees: "The signed terms, the milestones, the fees agreed at signing, and every version with its signatures." Attorney decisions: "Approve work only when the applicable decision step becomes available." Change orders: "Propose changes to price, scope, or milestones for the required review and approval." Disputes: "Review applicable deadlines and financial consequences before taking action."
- Variations by engagement state (what the page holds in each):
  - draft / sent: Next action = sign form (draft) or, for "sent", the fallback "Nothing to do here" (see observations). "Agreement and fees" open. No change section. Disputes section shows the intro text and "Cancel the engagement" only.
  - signing: sign form or "Waiting for the other signature". "Agreement and fees" open. "Propose changes" section present. Sign-by line.
  - signed: attorney sees "Pay milestone 1" with the review step; freelancer sees "Waiting for payment". "Change orders" section. Dispute form and cancel available.
  - active: Next action follows the milestones (pay, wait, review, start, submit). Everything available.
  - paused: red notice; Next action reads "Nothing to do here"; no change section; dispute form and cancel still offered.
  - disputed: Next action reads "Nothing to do here"; "Disputes and cancellation" opens by itself; no change section; "Cancel the engagement" still offered.
  - completed: Next action "This engagement is complete"; "Closeout", "Reviews", optionally "Keep this going every month"; no change section, no dispute form, no cancel.
  - canceled: notice with reason; Next action "Nothing to do here"; folded sections read only; no dispute form, no cancel.
- Mobile/accessibility: sections use real buttons with `aria-expanded`; focus moves to the opened section and the page scrolls to it with a 120px offset (`egGo`); notices use `role="status"`.
- UX observations (mine): The page has three layers of "what to do" (Next action card, "What happens next?", "How milestone payments work") plus a "Before you pay" box, which repeat similar sentences. Status "sent" is treated as a pre-signing state everywhere except `nextStep` and `egWhatNext`, so a "sent" agreement shows "Nothing to do here" with no sign form. In paused and disputed states the Next action card says "Nothing to do here" although a dispute may need an answer. The folded card titles differ from the card titles inside them ("Disputes and cancellation" holds "Problems, disputes and canceling"; "Change orders" holds "Change order"; "Agreement and fees" holds "The agreement").

## 2. "Next action" card (both)

- How to reach it: top of the main column of the engagement page. `nextStep` (9607).
- Purpose: one clear next step for this person, with a status chip.
- Layout: kicker "Next action"; title (`h2`); chip at the right; then text and the action.
- All variants (title / chip / body / control):
  - Monthly, signed or active, terms not ended:
    - Attorney, month 1 not paid: "Pay month 1" / "Waiting for payment" / "The day month 1 is paid becomes your billing day each month. Lawfecta holds it until each unit is accepted." / amounts ("Month 1", "Platform fee", "Total due now") and "Review payment: month 1".
    - Freelancer, month 1 not paid: "Waiting for payment" / "Waiting for payment" / "Waiting for the client to pay month 1. Do not start unpaid work."
    - Renewal failed: attorney "Pay month N", freelancer "Month N is not paid yet" / chip "Payment did not go through" (red) / attorney "Month N's payment did not go through. Pay now from the Monthly engagement card below." freelancer "Month N is not paid yet, so new work is paused. Do not start month N's tasks."
    - Otherwise: attorney "Review each unit when it is submitted", freelancer "Do this month's units" / chip "Month N is paid" (green).
  - draft or signing, I signed and they did not: "Waiting for the other signature" / "You signed" (green) / "You signed version N. Waiting for the freelancer|agency|attorney to sign."
  - draft or signing otherwise: "Sign the agreement" / "Needs your signature" / "Read the agreement under "Agreement and fees" below, then sign here." plus the sign form (section 6).
  - Attorney, signed or active:
    - A payment is processing: "Payment being confirmed" / "Being confirmed" / "Your payment of $X is being confirmed by the bank. Work starts when it is confirmed." and "Nothing more is needed from you. A bank payment can take about 4 business days. No second payment can be made while this one is being confirmed."
    - A submission is with the attorney: "Review milestone N" / "Deliverable ready for review" / milestone title / "The freelancer submitted this milestone. Read it, then accept it or ask for changes." / button "Review deliverable: milestone N" (blue; opens that milestone row and scrolls to it).
    - A milestone is due and none is open: "Pay milestone N" / "Waiting for payment" or the failed payment words in red / milestone title / optional line ("The charge to your saved payment method did not go through, so nothing was paid. Review the payment and pay again." or "The last payment did not go through, so nothing was paid. Review the payment and pay again." or "This milestone has not been charged yet, so it waits for you." or "No payment method is saved for this engagement, so this milestone waits for you.") / amounts ("Milestone amount", "Platform fee" or "Lawfecta fee", "Total due now") / optional "Milestone amount only. The platform fee of $X was charged once, with the first milestone." / "Review payment: milestone N" and "View milestone details".
    - Work open: "Nothing is due from you right now" / "Work in progress" (green) / "The freelancer is working on the paid milestone. You review each one when it is submitted."
    - Else: "Nothing is due from you right now".
  - Freelancer, signed or active:
    - A milestone is funded / in progress / changes requested: "Start milestone N" / "Submit milestone N" / "Make the changes for milestone N"; chip "Paid, held by Lawfecta" (green) or "Changes requested"; "Milestone N is paid and held by Lawfecta. Do the work, then submit it below."; button "Go to milestone N" (blue).
    - Submitted: "Waiting for the attorney's|agency's review" / "Submitted" (green) / "Milestone N is submitted. Nothing is needed from you until it is reviewed."
    - Else: "Waiting for payment" / "Waiting for payment" / "Waiting for the attorney|agency to pay the next milestone. Do not start unpaid work."
    - Extra line when payouts are not ready: "Set up payouts on the Earnings page so accepted milestones reach your bank."
  - completed: "This engagement is complete" / "Complete" (green) / "Every milestone is accepted. This engagement is complete."
  - Anything else (sent, paused, disputed, canceled): title "Nothing to do here", muted "Nothing to do here."
- Payments not set up: notice "Payments are not set up on this site yet, so nothing can be charged here. The Lawfecta Team is adding Stripe." replaces the pay button.
- Help: tip on the fee line and on the review button (`EG_HELP.fee`: "Your applicable fee is calculated from the terms of this engagement and your plan."; `EG_HELP.review`: "Review the amount and payment details before completing this milestone payment.").
- UX observations (mine): The fee line is labelled "Platform fee" when charged once and "Lawfecta fee" when charged with each milestone; two names for one thing. The line under the review button, "Nothing is charged until you confirm on the next step.", is good reassurance and should stay close to the button.

## 3. "Review payment" step (attorney)

- How to reach it: in the Next action card, click "Review payment: milestone N" or "Review payment: month 1". `payStart` (9593), `payReview` (9546). It replaces the button area in place; it is not a pop-up.
- Purpose: show every amount and how it will be paid before anything is charged.
- Layout: heading "Review payment: milestone N" (focus moves here); one line per amount ("Milestone N: <title>", "Platform fee" or "Lawfecta fee"; or "Month 1", "Platform fee"); "Total charged now"; how it is paid; what happens after; on the first payment the box "Before you pay" (bullets from the server's money summary); a status line; buttons.
- Text: no saved method: "You pay on Stripe's secure page. DELA never sees your card or bank details." (plus the test card note in test mode). Saved method: first "Paid with your saved payment method. Checking which one..." then "Paid with your saved payment method: Visa ending 4242. To use another one, choose "Pay another way" and pay on Stripe's secure page." After-line for a milestone: "Lawfecta holds the milestone amount until you accept the milestone." For month 1: "That payment method is saved for each month's renewal, charged once on your billing day. A bank payment takes about 4 business days; the month's tasks open only once it clears."
- Interactive elements:
  - "Continue to Stripe" (blue; no saved method) or "Pay $X now" (blue; saved method): starts the payment. No browser pop-up. Leaves the site for Stripe when a URL comes back.
  - "Pay another way" (ghost; only with a saved method): goes to Stripe's page.
  - "Go back" (ghost): closes the review and returns focus to the review button.
  - All three lock while a payment is in flight.
- States: "Starting the payment..."; "Opening Stripe's secure page..."; "Your saved payment method did not go through. Nothing was charged. Opening Stripe to pay another way." (also a toast); failure in red: "The payment did not go through. Nothing was charged. <reason> You can try again."; success toast "Paid. The freelancer can start." or "Paid. Month 1 is open." or "The payment is being confirmed."
- Mobile/accessibility: `role="group"` labelled by its heading; status line `aria-live="polite"`.
- UX observations (mine): Amounts are shown twice in a row (the amounts block on the card, then again in the review). Cents are shown only when the fee is charged with each milestone, so the same engagement type can read "$500" or "$500.00" depending on the fee timing.

## 4. Side column: "What happens next?" and "How milestone payments work" (both)

- `egWhatNext` (9138), `egHowPay` (9118). Read only, no controls.
- "What happens next?": a numbered list of the real steps from here. Not shown on monthly engagements, nor when status is sent, paused, disputed, completed or canceled.
  - draft / signing: "You and the <other> both sign version N." or "The <other> signs version N." or "You sign version N."; then attorney "You review and pay milestone 1 on Stripe's secure page." / freelancer "The <other> pays milestone 1."; then "The freelancer starts the work." / "You start the work once it is paid."
  - Attorney, signed or active: four sets: bank confirming ("The bank confirms your payment.", "The freelancer starts the work.", "You review the deliverable when it is submitted."); review due ("You review milestone N, then accept it or ask for changes.", "Accepting releases $X to the freelancer.", then "Milestone N is charged to your saved payment method. The accept step shows the amount first." or "You review and pay milestone N." or "With every milestone accepted, the engagement is complete."); payment due; work open ("The freelancer does the work and submits it.", "DELA checks the submission against the agreed checklist.", "You review it, then accept it or ask for changes.").
  - Freelancer, signed or active: "You start milestone N." / "You make the requested changes to milestone N." / "You finish milestone N."; "You submit it with a completion statement."; "DELA checks it against the agreed checklist, then the <other> reviews it."; "After acceptance, your part is paid out to your payout account."; or waiting sets.
- "How milestone payments work": shown for one-off engagements in draft, sent, signing, signed, active. Attorney bullets: "You pay the first milestone on Stripe's secure page. With your consent there, your payment method is saved for this engagement."; "When you accept a milestone, its payment is released to the freelancer and the next milestone is charged to your saved payment method. The accept step shows both amounts before you confirm."; "If that charge does not go through, nothing is paid. This page then shows "Review payment" and you pay on Stripe's page."; and a fee line ("The platform fee is charged with each milestone. Every payment shows its own fee." or "The platform fee of $X is charged once, with the first milestone. It is not added to later milestones."). Freelancer bullets: "The attorney|agency pays each milestone before you start it. Do not start unpaid work."; "Lawfecta holds the milestone amount until the attorney|agency accepts the milestone."; "After acceptance, your part is paid out to the payout account on your Earnings page."
- "Agreement summary" card (`egSummary`, 9086): title "Agreement summary" or "Agreement summary (not signed yet)". Lines: "Client (firm)"; "Freelancer" or "Agency"; then by side:
  - Attorney: "Price for the work (contract value)"; "Attorney platform fee (with each milestone)" or "Attorney platform fee (once, with the first payment)" (value or "Not available"; help tip); "Your total (contract + platform fee)"; after signing "Paid to date" (tip: "The payments Stripe confirmed for this engagement, less any refunds. A payment still being confirmed is listed apart."), "Being confirmed by the bank", "Amount due now (milestone N)".
  - Freelancer: "Price for the work (contract value)"; "You receive"; after signing "Paid out to you so far".
  - Monthly: the server's money summary lines instead.
  - Link-style button: "View signed agreement (version N)" or "Read the agreement (version N)"; opens the "Agreement and fees" section and moves focus there.
- UX observations (mine): the summary's "Attorney platform fee" is a third name for the fee (also "Platform fee", "Lawfecta fee").

## 5. "Milestone progress" card (both); "This month's units" on monthly

- `milestonesCard` (9869). In the main column under the Next action card, whenever milestones exist.
- Purpose: one row per milestone with three separate states; a row opens to its details and its action.
- Layout: head row with title, help tip ("Funding, delivery, and acceptance are tracked separately."), and the count "N milestones · M accepted" (or "N units"). Then an ordered list.
- Each row shows: a number circle (or "✓" when accepted); `h3` "N. <title>"; "$amount · Due <date>" or "· No date set" (a moved date reads "<date> (moved from <date>: <reason>)"); three states in words: "Payment: ...", "Delivery: ...", "Acceptance: ..."; a badge with the milestone status word; a "View" / "Hide" button.
  - Payment words, attorney: "Paid", "Paid, part refunded", "Refunded", "Payment being confirmed", "Payment did not go through", "Not paid yet". Freelancer: "Paid by the client, held by Lawfecta", "Paid by the client", "Refunded to the client", "Not paid yet".
  - Delivery words: "Not submitted", "In progress, not submitted", "Submission N: <submission status in lower case>".
  - Acceptance words: "Accepted", "In dispute", "Not accepted yet".
- Opened row body: amount line (attorney with per-milestone fee: "Milestone $X, Lawfecta fee $Y, Total $Z"; freelancer: "(you receive all of it; you pay no platform fee)" or "(you receive $X after the platform fee)"; "| due ..."; "| rounds of changes used: N of M"); "Deliverables: ..."; freelancer payout line "Payout: $X, sent to your bank | waiting for your payout setup (Earnings page) | held | did not go through. The Lawfecta Team is checking it | on its way"; the latest submission block; the freelancer's action.
- Interactive elements:
  - "View" / "Hide" per row (ghost, small; `aria-label` "View milestone N: <title>"). A row opens by itself when it needs this person (attorney: submission with the attorney; freelancer: funded, in progress, changes requested, or a failed check).
  - Freelancer, milestone funded: "Start this milestone" (blue, small). No confirm. Toast "Started. Submit it here when it is done."
  - Freelancer, in progress or changes requested: the form "Submit this milestone":
    - "Completion statement" text area (4 rows; placeholder "What you did, where it is, and anything still open"; hint "Say what you did and anything still open. The attorney and DELA read this.").
    - Checkbox: "These files contain no medical records, ID documents, account numbers, logins or biometric data." Must be ticked before choosing files; otherwise toast "Tick the box first: the files contain no medical records, ID documents, account numbers, logins or biometric data."
    - Note: "DELA's check reads your notes and checklist, never the files; the attorney reviews the files. Files uploaded on a job are deleted after a set time unless the attorney saves them to the firm's library."
    - "Files (optional)" file input (multiple). Per-file lines: "<name>: uploading", "<name>: ready", "<name>: held for a check. Remove client information and upload it again.", "<name>: not accepted", "<name>: the upload did not finish".
    - "Submit for DELA's check" (blue, small); while running it reads "DELA is checking it...". Results (toasts): "It passed DELA's check and is with the attorney."; "It did not pass DELA's check yet. See each point below."; "Sent to a Lawfecta reviewer, because DELA could not check it."
  - Submission block (`submissionBlock`, 9911), both sides: "Submission N: <status> | DELA's score N of 100"; the statement; per file: name, " | saved to your library" or " | deleted on <date> unless saved" or "<name>: deleted after the time limit"; "Open" (ghost, small; new tab); attorney only "Save to library" (ghost, small; toast "Saved to your Files page. DELA's AI never reads files from a job."). Expandable "DELA's check, point by point" (open by itself when failed): each point "Met | Missing | Could not tell (required): <text>. Evidence: ... " and the note "DELA checks the submission against the agreed rubric. It does not decide whether legal work is correct; the attorney does." Lines "Lawfecta reviewer: <note>" and "Attorney: <note>".
  - Freelancer, failed check: "Ask for a human review" (ghost, small). Browser confirm pop-up: "Ask a Lawfecta reviewer to look at it instead of DELA? The target is 5 business days." Toast "Sent to a Lawfecta reviewer."
  - Attorney, submission with the attorney: line "Review it by <date time>. Accepting releases the payment to the freelancer." (with a saved method and a next milestone: "...and charges the next milestone with your saved payment method. You see both amounts before you confirm."); text area "Note to the freelancer" (placeholder "What should change (needed to ask for changes), or a thank you"); buttons:
    - "Accept and release payment" (blue, small): opens an on-page confirmation (not a pop-up) headed "Accept milestone N?" with "Released to the freelancer $X"; when a next milestone will be charged: "Charged now to your saved payment method: milestone N and its Lawfecta fee $Y" and "If that charge does not go through, nothing is paid for milestone N and you pay it on Stripe's page."; otherwise "Milestone N ($X) is not charged now. You pay it next, from the top of this page."; "Accepting cannot be undone."; buttons "Yes, accept and release $X" (blue, small) and "Go back" (ghost, small). Toasts: "Accepted. The payment is released." / "...and the next milestone is paid." / "Accepted. Your saved payment method did not go through for the next milestone. Opening Stripe."
    - "Ask for changes" (ghost, small): sends at once with the note; no confirm. Toast "Changes requested. Rounds left: N."
- States: errors such as "This milestone is not paid yet. Work starts when the attorney's payment is confirmed."; "Write a completion statement: what you did and anything still open."; "Say what needs to change."; "The N included rounds of changes are used up. Propose a change order on the agreement instead."; "One of the files is not ready yet. Wait for its check to finish."
- Mobile/accessibility: rows are list items with `aria-expanded` buttons; the confirmation takes focus.
- UX observations (mine): each row carries a status badge plus three state phrases, so status is said four ways on one line. "Ask for changes" has no confirm while "Accept" has a full confirmation; the single note box serves both. The file tick box must be ticked before picking files, which is easy to miss because the box sits above the file input but the error only shows after picking.

## 6. Signing form (both)

- `signForm` (9731), inside the Next action card in draft or signing when this person has not signed. `commitmentSummary` (9711).
- Layout: "Read the agreement below. If it is right, sign it here. If not, propose changes." (prefixed with "The other person signed version N. " when true); box "What you are agreeing to" (bullets: the money summary; review days and rounds: "You have N days to review each milestone; M rounds of changes are included."; "Canceling before work starts refunds the client in full. After that, paid milestones not yet submitted are refunded and accepted ones stay paid."; agency line "The agency may use vetted Lawfecta subcontractors. Everyone working on the job is listed under Who's working on this."; "Keep all work, messages and payment on Lawfecta."; monthly variants: "Month 1 is charged when you pay it; that day becomes your billing day, and the saved payment method is charged once on it each month." / "You are paid each month for the work accepted that month.", "Cancellation takes effect at the end of the paid month. Ending sooner needs both of you to agree.", "The limits are for each month. Unused work does not carry over.").
- Interactive elements:
  - Text box "Your full name" (hint "Your typed name is your signature. DELA records it with the time, this version and its fingerprint."; autocomplete name).
  - Checkbox: "I have read version N of this agreement and I sign it electronically."
  - Monthly, attorney only, checkbox: "Charge this payment method each month on my billing day until I or the freelancer cancel."
  - "Sign version N" (blue). No pop-up.
- States: toast "Type your full name and tick the box to sign."; "Tick the box that lets Lawfecta charge your payment method each month. Without it, a monthly engagement cannot start."; success "Signed. Waiting for the other signature." or "Signed by both of you. Pay the first milestone to start." / "...The attorney pays the first milestone next." / "...The agency pays the first milestone next."; errors "The time to sign this agreement is over."; "Before you sign, add your firm's signatory, billing address and notice email in Profile, under "Firm details"."
- UX observations (mine): the form says "Read the agreement below" while the agreement sits in a folded section further down; the line above it says "under "Agreement and fees" below".

## 7. "The agreement" card (both), inside "Agreement and fees"

- `agreementCard` (9762).
- Layout: key-value block: "Client (firm)", "Signs for the firm" (or "Not set yet"), "Agency (the contracting party)" or "Freelancer's business", "Freelancer" or "Agency lead", "Price for the work" or "Monthly price for the work". Agency sentence about subcontractors. Green box with the money summary (first line bold). "The work: ", "Included: ", "Not included: " (fallback "Not specified. Confirm with the other person before signing."), "Schedule: ". Heading "Milestones" (glossary term `milestone`) with a table: columns "#", "Milestone", "Amount", "Due", "Deliverables". Heading "Fees" (glossary term `platform_fee`) with a bullet list from the server; after signing: "These are the amounts agreed at signing. What was actually paid, refunded and paid out is listed under Payments and on each milestone." Three expandable blocks: "Completion checklist (how DELA checks each milestone)" ("Agreed at signing. A score of 90 or more with every required item met passes, then the attorney reviews it. DELA's check is not a legal review."; per milestone, criteria with weight and "required"); "The terms" (full text); "Versions and signatures" (per version: who made it (you, DELA, the other person), date, note, "Fingerprint <12 chars>", "Signed by Attorney: <name>, <date>; Freelancer: ..." or "Not signed").
- Interactive elements:
  - "✦ Check this for me" (AI helper; draft, sent, signing). Shows findings; in signing with findings adds "Propose changes" (ghost, small) which opens the change form.
  - "✦ Improve acceptance criteria" (AI helper; attorney, one-off, signing/signed/active). Output per milestone, or "DELA found nothing to improve."; note "Using them starts a new version of the agreement. Both of you sign it before it applies."; buttons "Use suggestion" and "Edit" (both ghost, small; both do the same thing: open the change form with the suggestions filled in).
  - Three `<details>` toggles named above.
- Mobile: table has class `stack` with `data-label` on each cell (stacks into cards on a phone).
- UX observations (mine): "Use suggestion" and "Edit" are two buttons with one behavior. The card is long (parties, money, scope, table, fees, three folds) inside an already folded section.

## 8. "Propose changes" / "Change order" card (both)

- `changesCard` (9825). Inside the folded section "Propose changes" (signing) or "Change orders" (signed, active). One-off engagements only.
- Closed state: title "Propose changes" or "Change order"; text "Change the milestones or the scope. The other person reviews your version and signs it, or proposes another." or "Change the price, scope or milestones with a new version you both sign. Paid milestones keep their amounts. Work goes on under the signed version until then."; button "Propose changes" or "Propose a change order" (ghost, small).
- Open state (form): notice when AI suggestions were loaded: "DELA's suggested deliverables are filled in below. Check them, then send the new version; nothing changes until you both sign." Heading "Milestones". One small card per milestone with: "Title" text box; "Amount ($)" number box (min 0, step 1); "Due date" date input; "Deliverables" text box; "Remove this milestone" (ghost, small; no confirm). Then "Add a milestone" (ghost, small); "Included" (3 rows); "Not included" (2 rows); "Schedule" (2 rows); "Note" (placeholder "What you changed and why"); buttons "Send the new version" (blue) and "Cancel" (ghost).
- States: toast "Version N sent. Both of you sign it next."; errors "Use between 1 and N milestones."; "Each milestone needs a title and at least $X."; "The total must be at least $X."; "Every due date must be within N days."; "A milestone that is already paid cannot change its amount."; "This agreement is closed."
- UX observations (mine): no comparison of old and new values before sending; a removed milestone disappears with no undo.

## 9. "Your payments" card (attorney), inside "Agreement and fees"

- `paymentsCard` (10023). Shown when at least one payment exists.
- A bullet list, one line per payment: "<date>: $X (includes the platform fee $Y), <status>" or, with per-milestone fees, "<date>: Milestone $X, Lawfecta fee $Y, Total $Z, <status>"; failure reason in brackets. Payment status words: requires_payment = "Waiting for you"; processing = "Being confirmed"; succeeded = "Paid"; failed = "Did not go through"; canceled = "Canceled". Refund lines: "<date>: Refund for milestone N: Milestone amount refunded $X, Lawfecta fee refunded $Y, Total refunded $Z, Sent | Did not go through, the team is on it | On its way".
- No controls. No receipt or invoice link.
- UX observations (mine): a plain bullet list, not a table; refunds are listed only when fees are per milestone or the refund carries a fee, so some refunds may not appear here.

## 10. "Monthly terms" card (both), before both sign a monthly engagement

- `monthlyTermsCard` (8889), `tasksEditor` (8864). Switch `recurring_engagements` (error "Monthly engagements are not open for your account yet.").
- Layout: "Monthly price: $X. It renews every month until either of you cancels."; text "List each task, how often it happens and how many are included each month. Nothing is unlimited: extra work is a separate gig or a change for next month."; task rows; "Add a task"; "How the freelancer is paid each month" with two radios; AI helper; save button.
- Interactive elements, per task row: "Task" (placeholder "For example: intake calls and conflict checks"); "How often" dropdown: "Daily", "Weekly", "Every two weeks", "Monthly"; "Included each month" number (min 1); "Turnaround" (placeholder "For example: 1 business day"); "Not included" (placeholder "Optional"); "Remove this task" (ghost, small).
- "Add a task" (ghost, small). Radios: "Weekly units: the month is split into weekly units, each checked, accepted and paid like a milestone" / "One monthly delivery: checked and accepted at month end". "✦ Check monthly scope" (AI helper). "Save the monthly terms" (blue, small): message "Saved as version N. Both of you sign the new version."
- Errors (`MONTHLY_ERR`): "List at least one task with how often and how many are included each month."; ""Unlimited" is not allowed. Give each task an included number."; "Name each task."; "Choose how often each task happens."; "Give each task an included number each month (1 or more)."

## 11. "Monthly engagement" card (both), after signing

- `monthlyCard` (8906).
- Layout: optional notices ("This monthly engagement ended, as canceled | because a month stayed unpaid | early by agreement."; "The Lawfecta Team paused all renewal charges for a moment. Nothing is charged until they start again."); attorney bold money line (plus " Your billing day is set when you pay month 1."); key-values "This month" ("Month N: <date> to <date>"), "Monthly price", "Units accepted" ("N of M"), "Next billing" (glossary term `billing_day`; "None: it ends on <date>" or "<date> ($X plus the $Y platform fee)"); heading "Included each month" with the task list; a paragraph on weekly units or one monthly delivery and "The limits are for each month: unused work does not carry over, and a month with five weeks has the same limits and price."; "Month N's tasks are drafted. They open once it is paid on <date>."; failed renewal notice; cancellation rule "Cancellation takes effect at the end of the paid month. Ending sooner needs both of you to agree."
- Interactive elements:
  - Failed renewal, attorney: "Pay now" (blue, small): goes to Stripe or pays at once ("Paid. Month N is open.").
  - "Review cancellation" (ghost, small): shows in place "Cancel at the end of this paid month (<date>)? Nothing more is charged." with "Yes, cancel at month end" (red, small) and "Keep it" (ghost, small).
  - After canceling: "Canceled: it ends on <date>." and "Ask to keep it going" (ghost, small); or "Waiting for the other person to approve keeping it."; or, for the other side, "Approve keeping it" (blue, small) and "Keep the cancellation" (ghost, small).
  - "Ask to end now" (ghost, small); or "Waiting for the other person to agree to end now."; or, for the other side, "The other person asks to end now. Accepted units stay paid; the unstarted rest of this month is refunded to the client." with "Agree to end now" (red, small) and "Keep it running" (ghost, small).
  - Open change box: "Your change, waiting for the other person" or "A change to approve", a comparison, "Note: ...", a conflict alert; buttons "Approve the change" (blue, small) and "Decline" (ghost, small).
  - "Approved change, not started yet" box (read only).
  - "Request a change" (ghost, small): opens "New monthly price ($)" number box, the task editor (as in section 10), "Why (optional)", and "Send the change" (blue, small).
  - Test site only, Lawfecta owner only: "Run the renewal now (test site)" (ghost, small).
- Messages: "Canceled. It ends on <date>. Nothing more is charged."; "Asked the other person to keep the engagement going."; "The engagement continues."; "The cancellation stays."; "Ended. Unstarted units were refunded."; "It keeps running."; "Asked the other person to end now."; "Approved. It starts next month if approved at least N days before billing."; "Declined. The current terms continue."; "Sent. If the other person approves at least N days before billing, it starts next month."
- Variations: when ended, the card stops after the task list (no cancel, end or change controls). A monthly engagement has no "Cancel the engagement" in the disputes section and no change-order section.
- UX observations (mine): six different action groups (pay, cancel, undo cancel, end now, approve change, request change) stack in one card with small ghost buttons. "Ask to end now" sends the request at once with no review step, unlike "Review cancellation".

## 12. "Subcontractors" card (both), agency engagements only

- `subsCard` (9678), inside "Who's working on this". Title is the glossary term `subcontractors`.
- Text: "No subcontractors on this engagement: only the agency's own team works on it." or "This agency may use vetted subcontractors from Lawfecta to complete this work."
- Attorney, draft or signing: explanation "Subcontractors are verified Lawfecta freelancers who accept confidentiality and no-poaching terms. You do not approve each person; they are listed under "Who's working on this". To keep this job to the agency's own team, tick the box. Saving makes a new version of the agreement that both of you sign."; checkbox "No subcontractors on this engagement"; "Save" (ghost). Messages "Nothing changed." / "Saved as version N. Both of you sign the new version."
- Otherwise read only: attorney "Everyone working on this job is listed under "Who's working on this". You get a notice when it changes; nothing is needed from you."; freelancer/agency "The attorney chose this. Bench assignments and gigs for part of this job are off." or "Subcontractors are verified Lawfecta freelancers. You choose what to share with them and stay responsible for the work."

## 13. "Confidential materials" card (both)

- `confCard` (9270), `confDraw` (9280). Inside the folded section of the same name. Title is the glossary term `confidential`.
- Purpose: exchange client files, private messages and secure links between the hiring attorney and the hired freelancer. The AI never reads it.
- Shown when: the feature is on and the engagement is signed with the first milestone paid. Gate texts: "Coming soon: a private area on each engagement where the attorney and the hired freelancer exchange client files, confidential messages and secure links. The AI never reads it."; "Confidential materials open after you both sign and the first milestone is paid."; "Your access ended when the job ended."; "Confidential materials are paused by the Lawfecta Team for now."; "The confidential materials on this job were deleted."
- Gate 1, code entry (`confCodeBox`, 9390): "For your security, DELA emails you a 6-digit code before it opens this area. Once you enter it, it works for 12 hours." Controls: "Email me a code" (ghost, small); text box "6-digit code" (numeric, max 6, one-time-code autofill; Enter submits); "Open" (blue, small). After sending: "We sent a code to <address>. Enter it here soon: it stops working after a few minutes." Errors: "That code is not right. Check the email and try again."; "That code has expired. Send a new one."; "Too many tries. Send a new code."; "Too many codes in an hour. Try again later."
- Gate 2, promise: checkbox "I will keep these materials confidential, use them only for this engagement, and delete any copies when it ends."; "Open Confidential materials" (blue, small; disabled until ticked).
- Layout once open, top to bottom:
  1. A status line that keeps the last answer for two minutes.
  2. Note: "Client names, case facts, case numbers, court papers and contracts are allowed here. Never upload medical records, ID documents, account numbers, logins or biometric data: share those with a secure link from your own storage. DELA's AI never reads anything here."
  3. Hiring attorney or firm: the "sensitive job" tick box (`sensitiveBox`, outside range).
  4. Ended notice: "This job has ended. The freelancer can no longer open anything here. Files are deleted N days after access ended, and messages N days after the job ended. Use Download all to keep a copy."
  5. "Files": upload box, file rows, "Download all".
  6. "Secure document links": explanation "Sensitive documents must be shared using a link from your own storage (Google Drive, Dropbox, OneDrive, Box, ShareFile, Clio, NetDocuments). Do not upload them here. DELA never opens these links. When a link expires, turn off sharing in your own storage too."; add form (attorney); link rows.
  7. "Confidential messages": thread and composer.
  8. "Who can see this": people and add control.
  9. "Dispute review" (only during a team review).
  10. "A Lawfecta reviewer opened these materials N times."
  11. "Activity (N)" expandable log (attorney side).
- Interactive elements:
  - Upload box: file input (accepts .pdf .docx .xlsx .png .jpg .jpeg .txt .csv; `aria-label` "Choose a confidential file"); attorney only dropdown "Freelancer can open it for" with options "7 days", "14 days", "30 days" (server may send other choices; default 14); checkbox "This file contains no medical records, ID documents, account numbers, logins or biometric data."; "Upload" (blue, small). Progress "Uploading and checking <name>...". On a blocked file, a red alert and, when allowed, "Mark this job as sensitive" (ghost, small).
  - Sensitive job: uploads are replaced by "This job involves sensitive data, so files cannot be uploaded here. Use a secure document link below."
  - File row: name; " | <by>, <date> | View only | Not virus scanned | opened N times"; access line ("Open to you until <date>" / "Freelancer access until <date>" / "Freelancer access ended <date>. Deleted on <date>"). Buttons: "Open" (pdf, png, jpg; opens a viewer dialog); "Download" (other types, unless view only); managers: "Extend 14 days" and the toggle "View only" / "Allow download" (`aria-pressed`); "Delete" (red, small) which swaps the row to "Delete <name> for good?" with "Cancel" and "Yes, delete" (on-page confirm).
  - Viewer dialog (`confOpenFile`, 9474): title is the file name; "Watermarked: <text>"; PDF in a frame or image on a canvas with a diagonal watermark; footer "Download" (unless view only) and "Close".
  - "Download all" (ghost, small; managers): lists links, "Click each file to download it. These links work for N minutes." plus a note on view-only files left out.
  - Link form (attorney): "Label (optional)" (placeholder "Label, for example Medical records folder", max 80); "Secure link" (placeholder "Paste the sharing link from your storage"); dropdown "Link expires after" ("7 days", "14 days", "30 days"); "Add link" (blue, small).
  - Link row: label or "Secure link"; " | <host>, added by <name> | opened N times"; "Expires <date>" / "Expired <date>" / "Removed"; "Open link" (ghost, small; new tab); attorney "Remove" which swaps to "Remove this link? Also turn off sharing in your own storage." with "Cancel" and "Yes, remove".
  - Messages: text area (3 rows; placeholder "Write a confidential message. Never type a full Social Security, card or account number, or a password."); "Send" (blue, small).
  - People: "<name> (<role>)" with "Remove" (ghost, small; no confirm) where allowed; dropdown "Firm staff to add" and "Add to this job" (ghost, small).
  - Dispute review: "A Lawfecta reviewer is deciding a dispute on this job. The reviewer may open these materials only if both of you agree. If either of you declines, the reviewer decides from the rest of the record and anything you choose to share."; "Your answer: you agreed | you declined | not yet. The other person: agreed | declined | not yet."; buttons "I agree" and "I decline" (both ghost, small).
  - "Activity (N)": lines "<date time>: <who> uploaded | opened | downloaded | added the link | opened the link | removed the link | extended | deleted | deleted the messages <file>", "expired: the link", "deleted after access ended:", "A Lawfecta reviewer opened".
- States: empty "No files yet.", "No links yet.", "No messages yet.", "Nothing yet."; toasts and status "Uploaded", "Uploaded. Not virus scanned on the test site.", "Sent", "Removed", "Added", "Deleted", "Link removed", "Link added. It expires on <date>.", "Extended to <date>", "Extended, but the job has ended, so the freelancer's access stays closed.", "View only: the download button is gone", "Downloads allowed again", "Downloading <name>", "Marked as sensitive. Share the file with a secure link instead."; validation "Choose a file first.", "Paste the link first.", "Write a message first."; about 30 more error texts in `CONF_ERR` (file type, size, storage full, virus scan, password-protected PDF, link rules).
- Variations: freelancer cannot add links, set expiry, extend, set view only, download all, add people or see the activity log. After the job ends there is no upload, link form or composer.
- Mobile/accessibility: status line `aria-live="polite"`; upload errors `role="alert"`.
- UX observations (mine): two gates (emailed code, then promise) before any content. The area mixes four tools (files, links, messages, people) plus a log in one folded card. Removing a person has no confirm while deleting a file and removing a link do. "Open" and "Download" never show together for the same file type.

## 14. Dispute center: "Problems, disputes and canceling" (both)

- `disputeCard` (10039), `disputeCase` (10055), `disputeBox` (10064), `disputeOpenForm` (10162), `cancelPart` (10181). Inside "Disputes and cancellation". Title is the glossary term `dispute`. Used when the server says the dispute center is on; otherwise section 15.
- Purpose: open a dispute about a paid milestone, exchange statements, settle with an offer, or cancel the engagement.
- Layout: loading "Loading..."; intro when no disputes: "Talk it through in Messages first. If you cannot agree, open a dispute: the money for that milestone stays held while you settle it. You have N days to settle it yourselves, then the Lawfecta Team decides. Lawfecta is not a court or an arbitrator."; one box per dispute; "Open a dispute" (expandable) when none is open and status is active, signed or paused; "Cancel the engagement" (expandable) unless monthly, completed or canceled.
- Dispute box: bold "Dispute about milestone N. <title> ($X)" and a state badge; "Opened by the attorney|freelancer: <category>. They ask for $X to the freelancer and $Y back to the attorney."; date lines; the thread; "Links"; "Offers"; then actions.
  - State badge words: "Withdrawn"; "Settled by agreement"; "Granted: no answer"; "Decided by the Lawfecta Team"; "Lawfecta Team review"; "Lawfecta Team review: question open"; "Open: settle it yourselves"; "Open: waiting for an answer".
  - Date lines: "The other side answers by <date>." / "Give your side by <date>."; "If there is no answer, the request is granted on <date time>." / "Settle it yourselves by <date time>. After that the Lawfecta Team decides."; "The Lawfecta Team asked a question. Its clock waits for the answer." / "The Lawfecta Team decides by <date>. You can still settle it with an offer until then."; resolved: "$X went to the freelancer and $Y back to the attorney on <date>. The Lawfecta Team's note: ...".
  - Thread entries: "You | Attorney | Freelancer | Lawfecta Team" + kind ("Opened the dispute", "Answer", "Note", "Question from the Lawfecta Team", "Answer to the Lawfecta Team") + date time.
  - Offer rows: "Your offer | The <role>'s offer: $X to the freelancer, $Y back to the attorney (<note>)" with badge "Open", "Accepted", "Withdrawn", "Replaced", "Closed".
- Interactive elements:
  - "Accept the offer" (blue, small). Browser confirm pop-up: "Accept this offer? $X goes to the freelancer and $Y back to the attorney now. This settles the dispute." Toast "Settled. The money moves now."
  - "Withdraw my offer" (ghost, small). No confirm. Toast "Offer withdrawn."
  - Statement box: label "Answer the Lawfecta Team" / "Your side" / "Add a note" (3 rows) with the sensitive-data notice; button "Send my side" or "Send". Toast "Sent. Both of you can read it here."
  - Expandable "Settle it: send an offer": text "An offer splits the $X between the freelancer and the attorney. When the other side accepts, the dispute is settled and the money moves at once." plus "The attorney also gets back the same share of the Lawfecta fee paid on this milestone." or "The attorney's platform fee is not refunded."; "Amount to the freelancer ($)" (placeholder "0.00"; live text "and $Y back to the attorney"); "Note with the offer (optional)"; "Send the offer" (blue, small); "✦ Suggest a fair offer" (ghost, small); "✦ Summarize both sides" (ghost, small). AI output: "DELA is reading both sides..."; summary with "You seem to agree on: " and "Still open: "; or "Suggested: $X to the freelancer and $Y back to the attorney. <why>" with "Use suggestion" (ghost, small); footer "Used N DELA actions."
  - Expandable "Add a link": "Share a link from your own storage. Never upload sensitive data such as ID numbers, account numbers or health information."; "What the link is" (placeholder "For example: Delivery email"); "Secure link (https://)" (placeholder "Paste a link from your own storage"); "Add the link" (ghost, small). Toast "Link added."
  - "Withdraw the dispute" (ghost, small; opener only). Browser confirm pop-up: "Withdraw the dispute? The engagement goes on and the milestone goes back to normal." Toast "Withdrawn."
  - "Open a dispute" form: intro "The money for that milestone stays held. The other side has N days to answer. If they never answer, your request is granted after N days. You can settle it together with an offer at any time; otherwise the Lawfecta Team decides within N business days."; dropdown "Milestone" ("Choose", then "N. <title> ($X)" for funded, in progress, submitted, changes requested); dropdown "What went wrong" ("Choose"; attorney: "Not delivered", "Late", "Not what was agreed", "Quality", "Other"; freelancer: "Not what was agreed", "Payment or acceptance withheld", "Other"); dropdown "What you are asking for" (attorney: "A full refund of the milestone", "Part back, part to the freelancer"; freelancer: "The full milestone paid to me", "Part to me, part back to the attorney"); "Amount to the freelancer ($)" (only for a split); sensitive-data notice; "What happened" (3 rows); "Open the dispute" (ghost, small). No confirm. Toast "The dispute is open. The other side was asked to answer."
  - "Cancel the engagement" form: rule text ("Before work starts on the first milestone, the attorney is refunded in full, platform fee included. After that, a paid milestone not yet submitted is refunded, accepted milestones stay paid, and the attorney's platform fee is kept." or the per-milestone fee version, plus " A milestone under review cannot be canceled; open a dispute instead."); "Why" text box; "Cancel the engagement" (ghost, small). Browser confirm pop-up: "Cancel this engagement? This cannot be undone." Toast "Canceled. N paid milestones are refunded to the attorney."
- States: errors "Choose what went wrong."; "Choose what you are asking for."; "Choose the milestone."; "A dispute is about a paid milestone. This one is not paid, or it is already finished."; "The amount to the freelancer must be from zero up to the milestone amount."; "You cannot accept your own offer."; "That offer is no longer open. Look at the latest offer."; "A bank review of a payment on this engagement is open, so the dispute waits until it ends."; "Type the amount to the freelancer in dollars."
- UX observations (mine): the destructive buttons "Open the dispute" and "Cancel the engagement" are styled as small ghost buttons, the same as minor actions. Three browser pop-ups here (accept offer, withdraw dispute, cancel engagement) while the payment and accept steps use on-page confirmations. Opening a dispute has no confirm at all. Money always reads "to the freelancer / back to the attorney" even on agency engagements.

## 15. Older dispute card (both), when the dispute center is off

- `oldDisputeCard` (10190). Same title. Per dispute one line: "Open dispute: talk it through in Messages until <date time>, then the Lawfecta Team reviews it." / "The Lawfecta Team is reviewing the dispute." / "Decided: <note> ($X to the freelancer, $Y back to the attorney)" / "Withdrawn." plus " Reason given: <reason>". "Withdraw the dispute" (confirm pop-up "Withdraw the dispute? The engagement goes on."). Intro "Talk it through in Messages first. A dispute holds the money in question for 14 days while you try to settle it, then the Lawfecta Team decides. Lawfecta is not a court or an arbitrator." Expandable "Open a dispute": "Milestone" dropdown, "What is the problem" text area, "Open the dispute" (toast "The dispute is open. Both of you were told."). Expandable "Cancel the engagement" as in section 14 (not on monthly).

## 16. Engagements list card (both)

- `engagementsList` (10253). Attorney: on Projects with title "Engagements" (line 5114). Freelancer: on Work with title "Your engagements" (line 7630). Switch `engagements`. The card does not appear when there are none.
- Layout: card title "<title> (N)"; one clickable row per engagement: face, gig title, a line "Freelancer: <name> | $total | milestones accepted N of M" (attorney) or "Client: <name> | ... | paid to you $X" (freelancer); before signing " | milestones set when you both sign"; status badge at the right. When more than three are finished or canceled they fold under "Finished and canceled (N)".
- Interactive elements: each row (role button, tabindex 0) opens the engagement page; the "Finished and canceled (N)" toggle.
- UX observations (mine): rows have `role="button"` and `tabindex` but no key handler in this code, so Enter may not open them.

## 17. Earnings page (freelancer), tab `earnings`

- How to reach it: menu item "Earnings" (`?tab=earnings`); `earningsView` (10280). Freelancer side with switch `engagements` (line 12237). Home links "See my earnings", "View earnings", "Open Earnings".
- Purpose: see what was paid, set up payouts, and open each engagement.
- Layout: `h1` "Earnings"; key-values "Paid to you" ($ total) and "Engagements" (count); card "Payouts to your bank" (section 18, long form); card "Your engagements" with one clickable row per engagement ("Client: <name> | $total | milestones accepted N of M | paid to you $X" and a status badge).
- Interactive elements: each engagement row opens it on the Work tab; payout card buttons.
- States: "Loading..."; off: "Agreements are not open for your account yet."; empty: "No engagements yet. When an attorney chooses your proposal, the agreement and its milestones show here."; back from Stripe (`?payout=done` or `again`): notice "Stripe is checking your details. This card updates by itself in a few seconds." then, after about 32 seconds, "Stripe has not finished yet. Click "Check my payout status" below in a minute."
- UX observations (mine): the page has two totals only; no payout history, no pending or held amounts, no dates, no export. Engagement rows here have no face image while the same rows on Work do.

## 18. "Payouts to your bank" card (freelancer)

- `payoutCard` (10223). On Earnings (long form) and inside "Agreement and fees" on an engagement (short form, without the last line).
- Content: badge "Ready" / "Not set up" / "Needs details" and one sentence: "Not set up yet. Accepted milestones wait until you set up payouts."; "Stripe needs a few more details before it can pay you."; "Stripe has paused payouts until it gets more details."; "Ready. Accepted milestones are paid to your bank through Stripe." Optional "Stripe still needs: <list>". Long form adds "You enter your bank details on Stripe's secure page. DELA never sees them."
- Interactive elements: "Set up payouts with Stripe" or "Finish payout setup" (blue, small; leaves for Stripe; hidden when ready); "Check my payout status" (ghost, small; refreshes the card in place; toast "Payouts are ready." or "Checked with Stripe. Nothing has changed yet.").
- Errors stay on the card as a red alert: "Your account has no email address yet, and Stripe needs one to pay you. Sign out, sign in again on the Lawfecta site, and try once more."; "Stripe could not start payout setup right now. Nothing is wrong with your account, and the Lawfecta Team has been told. Please try again tomorrow."

## 19. "Closeout" card (both), completed engagements

- `closeoutCard` (10403). Key-values: "Milestones accepted" ("N of M"), "Paid for the work", "Paid out to the freelancer", "Still open" (count or "Nothing"). Text: "The conversation for this engagement is now read only. Everything stays readable here." No controls.

## 20. "Reviews" card on a completed engagement (both)

- `reviewPanel` (10416), `reviewForm` (10477), `ratingInputs` (10353), `reviewBlock` (10364). Switch `reviews` (the card removes itself when off). Loading "Loading reviews..."
- Layout:
  - Not yet written and still allowed: "How was working with the freelancer|the attorney? Your review publishes straight away, and <other> can post one response. It is never needed to get paid or to keep access. You can write it until <date>." then the form.
  - Written: heading "Your review of the freelancer|the attorney"; notices "Your review is with the Lawfecta Team for a quick check before it is published." or "Your review was not published or was removed by the Lawfecta Team." (+ " Your appeal is with the team." / " The decision stayed after your appeal."); the review block; the edit form when allowed.
  - Time over: "The time to write a review for this engagement is over."
  - "The review <other> wrote about you": the block, the response box, the report button.
  - Attorney with switch `bench`: heading "Your bench" and either "This freelancer is on your bench." / "Your bench invitation is waiting for their answer." or the invitation row (section 21).
  - Attorney with switch `auto_repeat_hiring`: heading "Work together again"; "A standing arrangement lets you hire this freelancer again in one click, inside limits you both sign once. They have to accept it."; "Propose a standing arrangement" (ghost, small).
- Review form: four star dropdowns, each with "Choose", "★★★★★ (5)", "★★★★☆ (4)", "★★★☆☆ (3)", "★★☆☆☆ (2)", "★☆☆☆☆ (1)". Questions about a freelancer: "Quality of the work", "Met the deadlines", "Communication", "Followed the document". About an attorney: "Clear instructions", "Timely review and feedback", "Fair requests for changes", "Communication". Dropdown "Would you hire them again?" / "Would you work with them again?" ("Choose", "Yes", "No"). Text area "Your review" (3 rows; hint "About the work only. No client information."). "✦ Help me write a review" (AI helper). Submit: "Publish my review" or "Save the change" (blue, small).
- Other controls: appeal text area "Appeal (once)" and "Send the appeal" (ghost, small); "Your public response (one)" text area (hint "Stay factual. Everyone who reads the review sees it.") with "Post the response" / "Save the response" (ghost, small); "Report this review" (ghost, small) which opens a browser prompt pop-up: "Why should the Lawfecta Team look at this review? Negative opinions stay up; only threats, harassment, client information, impersonation or payment outside Lawfecta are removed."
- Review block shows: "<by> | <month or date> | <practice area> | <state> | Edited"; the four ratings as stars; "Would hire again: yes|no" or "Would work with again: yes|no"; the text; "Response: ...".
- Toasts: "Review published. Thank you."; "Review updated."; "Your review is with the Lawfecta Team for a quick check before it is published."; "Appeal sent to the Lawfecta Team."; "Response published."; "Your response is with the Lawfecta Team for a quick check."; "Reported to the Lawfecta Team". Errors: "Choose a rating for every question."; "Choose yes or no for working together again."; "Write a few words."; "The time to edit this is over."; "You already appealed this decision."
- UX observations (mine): stars are chosen from dropdowns, not clicked. The report step uses a browser prompt, the only one in this range. Bench and standing-arrangement offers are appended inside the Reviews card, which mixes three purposes.

## 21. Reviews drawer and "Your reviews" on the Profile (both)

- `showReviews` (10387), `reviewsButton` (10397), `reviewsList` (10374), `profileReviewsCard` (10592). Switch `reviews`.
- Drawer: opened by a "Reviews" button (ghost, small) next to a person (bench rows, "From your bench" rows, other callers outside the range). Dialog with `aria-label` "Reviews", heading "Reviews: <name>", "Loading...".
- List content: "N reviews from completed Lawfecta engagements." (+ " Averages show after N reviews."); averages as key-values ("<question> X of 5", "Would hire again NN%" / "Would work with again NN%"); review blocks; "From past clients (outside Lawfecta)" with "Lawfecta confirmed the reviewer is an attorney, not the work itself. These are not counted in the numbers above."
- Profile card "Your reviews" (called from the Profile page, line 2521): "Only signed-in Lawfecta members can read reviews. You cannot remove a review, but you can post one response and report one that breaks the rules."; the same list; for freelancers with switch `past_client_reviews`, the box below.
- "Ask a past client for a review" (`pastClientsBox`, 10605): "For attorneys you worked for outside Lawfecta. DELA sends a short, neutral email; you cannot add a message, and there is no reward for reviewing. They confirm they are an attorney with their state and bar number. Up to N requests a month and M in total (used: A this month, B in total)."; text boxes "Their name" and "Their work email"; "Send the request" (blue, small); a list "<name> (<email>), <date>: Sent | Reviewed | Link expired | Asked not to be asked". Toast "Request sent to <email>." Errors: "Check the email address."; "Type their name."; "Ask someone else: you cannot review yourself."; "This person asked not to get review requests."; "You asked this person recently. You can ask again after N days."; "You reached the limit of N requests this month|in total."
- Off state: "Reviews are not open for your account yet."

## 22. The bench (attorney) and "Benches" (freelancer)

- Attorney bench view: `benchView` (10510). Reached from the Talent page in bench mode (`talentMode === "bench"`, line 7040; a Home tile also opens it, line 999). Switch `bench`.
  - Loading "Loading your bench..."; off "The bench is not open for your account yet."
  - Card "DELA suggests from your bench": per suggestion the name and "For the gig "<title>": <reason>" or "For the document "<title>": <reason>"; buttons "Invite to this gig" (blue, small; toast "Invited <name>"), "Snooze 30 days" (ghost, small; "Snoozed for 30 days."), "Dismiss" (ghost, small).
  - Card "My bench (N)" and, with a firm bench, "Firm bench (N)" ("Shared with your firm's staff. Owners and managers add and remove people."). Empty: "Nobody yet. After a completed engagement, or from a Talent search, click "Invite to my bench"." / "Nobody on the firm bench yet." Per person: name; badge "Invitation sent" / "Available" / "Not available now"; headline; "N reviews, X of 5" or "No reviews yet" | "Last worked together <date>" | "N hours a week"; buttons "Message" (blue, small; opens the Inbox thread), "Reviews" (ghost, small), "Remove" (ghost, small; managers; browser confirm pop-up "Remove <name> from the bench? Your bench conversation closes; past work records stay."; toast "Removed.").
  - Checkbox at the bottom: "Email me a weekly summary of bench suggestions (Mondays)." (toast "Saved").
- Invitation row (`benchInviteRow`, 10500), on a completed engagement and elsewhere: "Your bench is your list of freelancers you trust. Accepting opens an ongoing conversation; it does not share files, create a contract or allow spending."; text box (placeholder "A short note (optional)"); "Invite to my bench" (blue, small). Toasts "Invitation sent." / "Already invited." Errors "A firm bench comes with the Business plan."; "Only the firm owner or a manager can add to the firm bench."
- Freelancer card "Benches (N)" (`benchFreelancerCard`, 10556), inserted near the top of the Work page: "An attorney's trusted list. Being on a bench opens an ongoing conversation; it is not a contract and not a promise of work. You can leave any time." Per row: face, attorney name, "Invited you to their [firm's ]bench: <note>" or "You are on their [firm's ]bench"; buttons "Accept" (blue, small; "You joined the bench. Your bench conversation is in the Inbox."), "Decline" (ghost, small; "Declined."), "Message" (blue, small), "Leave" (ghost, small; browser confirm pop-up "Leave this bench? The bench conversation closes. Your past work and payments stay."; "You left the bench.").
- "From your bench" card on a gig's Matches view (`gigBenchCard`, 10576; attorney; not on draft gigs): "Invite people you trust first. An invited proposal does not use their monthly allowance."; per person: name (+ " (firm bench)"), a reason when they cannot be invited ("not available right now", "does not work for this state", "no longer a freelancer", "cannot be invited now"), "Reviews", and "Invite" / "Invited" (blue, small; disabled when invited, blocked, or the gig is not open).
- UX observations (mine): the bench has no search, sort or filter. Two "Message" and "Accept" buttons are both blue in one row on the freelancer card.

## 23. "Write a review" public page for a past client (no login)

- `pastReviewPage` (10688). Opened from an emailed link with `?past_review=<token>` (line 12892). No Lawfecta login; only the brand bar above it.
- Layout: `h1` "Write a review"; "<freelancer> asked you for a short, honest review of work they did for you outside Lawfecta. (<headline>)"; "There is no reward for reviewing, and you can say no. Your review shows on their Lawfecta profile in a section for past clients, with your name and state, to signed-in Lawfecta members only. No client information."; one card with the form.
- Interactive elements: "Your name"; "License state" (2 letters); "Bar number"; four star dropdowns (the freelancer questions); "Would you hire them again?" ("Choose", "Yes", "No"); "Your review" (4 rows); checkbox "I am a licensed attorney, this is my own honest opinion of work done for me, and I was not offered anything for it."; "Send my review" (blue); "Do not ask me again" (ghost; browser confirm pop-up "Stop all review requests to your email address?").
- States: "Loading..."; after sending `h1` "Thank you" with "Your review is published on <freelancer>'s profile." or "Your review is with the Lawfecta Team for a quick check before it shows."; after opting out `h1` "Done" with "You will not get review requests from Lawfecta again."; errors "This link is not valid."; "This link has expired."; "Thank you. This review was already sent."; "Use the two-letter state of your license, for example TX."; "Check your bar number (letters, numbers and dashes)."; "Tick the box to confirm."

---

The sections below are in the assigned line range but outside the engagement topic.

## 24. "Webhooks" card (both)

- `webhooksCard` (10627). Called from the AI settings page (line 2292, in a container named `adv`; its heading is outside my range). Switch `member_webhooks`.
- Layout: "Webhooks"; explanation "Send DELA events to your own tools (for example Zapier, Make or your own server). Each notice holds only an ID, the state, the time and a link back to DELA that needs your login: never document text, messages, files, card, bank or identity details. Each notice is signed so your system can check it came from DELA. Your plan allows N endpoints."; one box per endpoint; "Add an endpoint" (expandable; open when there are none).
- Endpoint box: address; badge "Active" / "Over your plan's limit: not sending" / "Paused" / "Paused after N failed deliveries"; "Signing secret ending XXXX | <event words>"; "Last problem: ..."; buttons "Send a test" (blue, small; active only), "Pause" / "Resume", "Change the secret", "Delete" (browser confirm pop-up "Delete this endpoint? Notices waiting for it are canceled."); expandable "Recent deliveries" with "Send again" on failed ones.
- Add form: "Address" (placeholder "Your https address"; hint "It must start with https://. DELA does not send to private network addresses."); one checkbox per event in two columns; "Add the endpoint" (blue, small).
- Event words: "A document is approved", "A gig is posted", "A gig closes", "A new proposal", "Your proposal is chosen", "A new match", "An invitation to a gig", "A meeting is booked", "A meeting is canceled", "An agreement is signed", "A milestone is paid", "A milestone is submitted", "A milestone is accepted", "Changes are requested", "A payout is sent", "A dispute is opened", "A dispute is decided", "A bench invitation", "Someone joins your bench", "A new review about you", "Test notice".
- Drawer "Your signing secret": "Copy it now and store it in your own system. DELA will not show it again."; a read-only box; a technical note on the signature header; "Copy" (blue, small; toast "Copied").
- Toasts: "Test notice delivered (code)."; "The test notice did not arrive: ... DELA tries again later."; "Paused"; "Resumed"; "Deleted"; "Sending again". Errors: "Use an address that starts with https://"; "That address points inside a private network, so DELA cannot send to it."; "Choose at least one event."; "Your plan allows N endpoints."

## 25. "Your firm profile for documents" (attorney)

- `firmProfileForm` (10737). Shown the first time "New document" is opened (before the firm profile is saved); also reused elsewhere.
- Layout: card title; "DELA uses these facts in every document, so you enter them once. Roles, never people's names, go in documents; who holds each role gets its review reminders."; read-only notice for non-managers "Only the firm owner or a manager can change the firm profile."
- Interactive elements: "Describe your firm (optional)" text area (placeholder "For example: three attorneys doing family law in Texas state courts; we use Clio and Microsoft 365"; hint "A sentence or two. DELA fills in the boxes below from it; you check them and save.") with "✦ Help me describe my firm"; "Firm size" dropdown ("Choose", "Solo", "2 to 5", "6 to 20", "21+"); "Practice areas" (placeholder "For example: Family law, Estate planning"); "Jurisdictions" (placeholder "States and federal courts you use, for example: Texas state courts; N.D. Tex."); heading "Team roles": per role a checkbox, the role name, a dropdown ("Nobody yet", each team member, "An email address"), an email box, badge "No one assigned"; "Add a custom role" text box, kind dropdown ("Staff", "Attorney", "Freelancer") and "Add" (ghost, small); heading "Systems you use": one box per system group (placeholder "Names, separated by commas"); "Save and continue" or "Save the firm profile" (blue).
- Toasts: "Saved"; "Saved. No one holds: <roles>. Reminders for their documents go to the firm owner." Errors: "Choose your firm size."; "Keep at least one attorney role."; "That person is not in your firm. Choose a firm member or type an email."

## 26. "New document" (attorney), Library

- `newDocument` (10800), `wsWhat` (10817), `pickWhat` (10853), `questionsForm` (10872).
- Layout: "← Library" (ghost, small); `h1` "New document"; then one of three steps.
- Step A, "What would you like to document?" (when the library is a workspace): "Describe it in a sentence, the way you would explain it to a new team member."; sensitive-data notice; text area (placeholder "For example: how we check for conflicts before accepting a new client"); "Next" (blue); link-style "I know which type I want". Result card "DELA suggests: <type>" with the reason, "It matches a common process, "<title>", so DELA starts from it.", "Category: <group>."; buttons "Use this" (blue) and "Choose another type" (ghost; reveals buttons for the other types: SOP, Workflow, Playbook, Policy, labels from the server). Toast "Describe what you would like to document first."
- Step B, type picker: "Pick what to build. Each type has its own job: the policy sets the rules, the workflow shows the map, each box on the map gets an SOP, and the playbook covers the forks in the road."; four clickable tiles (SOP, Workflow, Playbook, Policy; label, one line, "For example: ..."); `h2` "Or start from a common process"; one expandable group per lifecycle stage "<prefix> | <label> (N)" with rows: type badge ("Policy", "Workflow", "SOP", "Playbook"), title (+ " (reviewed every 3 months)"), "Start" (blue, small).
- Step C, "About this process": line "<Type>: <one line>" with "Change" (ghost, small); "Only the name is needed. Anything you skip shows in the quality panel, so you can add it later."; fields "Process name", "What starts it", "What done looks like", "Which roles touch it" (checkboxes from the firm profile), "Which systems it uses" (checkboxes), "Any deadline or time target" (placeholder "For example: within 1 business day of the request"; hint "Use your own service level. For a court rule or statute, DELA adds a field for the rule's link and a date to verify it."), "Steps you must personally decide or approve", "What goes wrong today (optional)"; expandable "Rewrite something you already have (optional)" or "What you described, and anything you already have (optional)" with a text area (placeholder "DELA removes client names, case numbers, passwords and account numbers before drafting.") and "Use a file from your Files" (ghost, small; lists up to 30 ready files as checkboxes; empty "No ready files. Upload on the Files page first."); "Draft it with DELA" (blue) with status "DELA is drafting to your firm's standard and checking its own work. This takes about a minute."
- States: "Give the process a name."; plan limit opens the limit pop-up.

## 27. Library index table (attorney)

- `docIndex` (10934). The Library list as one table with band rows per lifecycle group ("<prefix> | <label> (N)"; older items under "Waiting for the document standard").
- Columns: "Document" (title, ID or "No ID yet", "🔒 Upgrade to edit this document.", "Imported: review required"), "Type" ("Policy", "Workflow", "SOP", "Playbook", "Older playbook"), "Owner (role)" (or "Not assigned"), "Status" (badge, words from `PB_STATUS`, outside range), "Next review" (date + " (due)" or "Not scheduled"), "Review" (cell from `reviewCell`, outside range).
- Rows are clickable and open on Enter. Mobile: class `stack` with `data-label`, inside a scroll wrapper.

## 28. "Freelancers who fit this work" card (attorney), on a document

- `fitsCard` (10992). On a document page when switch `talent_search` is on and the member can hire.
- "Looking..."; "DELA matched this document's practice area and the tools its steps name with match-ready freelancers. Start a chat to ask about fit, or turn the document into a gig and invite them. Nobody is hired here."; per person: avatar, name, fit badge (for example "Good fit"), headline, trust line, "Why: ..."; "View profile" (ghost, small); "Start a chat" (blue, small; attorney). Empty: "No match-ready freelancer fits this document yet. Search Talent for a wider look." with "Search Talent" (ghost, small). Error texts: "The suggestions could not be loaded for this document (<reason>)."; "The suggestions could not be loaded right now (<error>). Search Talent instead."

## 29. "✦ Automate or delegate" card (attorney), on an approved document

- `automateCard` (11011). Switch `automate_delegate`; approved documents that are not policies; the member must be allowed to run it.
- Before a review: "DELA can find steps in this document to automate or hand to a freelancer."; optional "The last review was for an older version. This approved version needs its own review."; dropdown "How often does this run?" ("Choose (optional)", "Daily", "Weekly", "Monthly", "Quarterly"); number box "How long does it take each time?" (placeholder "Minutes (optional)"; hint "In minutes. Leave both empty and DELA estimates."); "✦ Find what to automate or delegate" (blue; reads "DELA is reviewing the steps..." while running); link "Dismiss"; "Each review uses your DELA actions (or your own AI key) once for this approved version."
- After a review: "DELA reviewed version N. Time saved is estimated by DELA (weekly, about N minutes each time). Add your own numbers for a better estimate." or "...Time saved uses your answers."; the same two boxes with "Update time saved" (ghost, small); summary "N ideas | M already delegated"; or "DELA found nothing to automate or delegate in this version."
- Per idea: badge "Delegate" or "Automate"; title; badge "Lawfecta partner"; "Steps N to M. <why>"; "Estimated time saved: about N hours a month (estimated by DELA | from your numbers)"; "Tool: <tool>. Already in your firm profile. ..." or "Skills: ...". Buttons: "Delegate these steps" (blue, small); or "Add this tool to the steps" (ghost, small) and "Hire a freelancer to set it up" (ghost, small). Already delegated: badge "Setup task started" / "Delegation started" / "Gig drafted" / "Gig posted" / "Gig <status>" with "View gig" or "Open the setup task" / "Open the delegation".
- List of delegations at the bottom with "Open the delegation" / "Open the setup task" / "Open below".
- Messages: "DELA found N to look at."; "Time saved updated."; "Those steps already use <tool>."; "Steps N now use <tool>. That is a new version of the document: approve it to use it."; errors from `AUTO_ERR`.

## 30. Delegation panel: five numbered steps (attorney)

- `delegatePanel` (11108). Opens inside the Automate card. Title "Delegate: <title>" or "Hire a freelancer to set it up: <title>"; "Close" (ghost, small); "Your progress is saved. You can stop and come back from this card." The current step has a colored border.
  1. "1. Confirm which steps to delegate": one checkbox per step (locked ones read "(Attorney decides: stays with the attorney)" or "(Needs legal judgment: stays with the attorney)"); "Save the steps" (ghost, small). Setup tasks show a sentence instead.
  2. "2. The SOP for just this task": "Draft the SOP for these steps" (blue, small) or "Open the SOP" (ghost, small); status sentence.
  3. "3. Metrics and KPIs": "These become the SOP's quality check and the rubric DELA's milestone check scores the gig against. No client information."; "Turnaround (business days)" (1 to 90); "Accuracy target (%)" (50 to 100); "Quality checklist, one per line"; "What done means"; "Save the KPIs" (ghost, small). Locked once the SOP is approved.
  4. "4. DELA's self-check and your approval": "DELA's self-check passes." or "DELA's self-check found N things to fix. Open the SOP to fix them."; "Approve the SOP" (blue, small); or "An attorney approves the SOP and posts the gig."
  5. "5. The gig": suggested budget sentences and the platform fee sentence; "Budget from ($)", "Budget to ($)", "Deadline" (date); "Draft the gig" (blue, small; reads "DELA is writing the public version..."); "The gig page opens. Check the public version there, then click "Post the gig"."; or "Open the gig" (blue, small).
  - "Stop delegating these steps" (ghost, small; no confirm).

## 31. "Get set up" home card (attorney)

- `setupHomeCard` (11217). On Home until finished or dismissed. Title "Get set up: N of M done"; link "Dismiss"; a progress bar; "Continue setting up" (blue, small; opens tab `setup`). The six step names (`SETUP_STEPS`): "Your profile and verification", "Teach DELA about your firm", "Your first document", "✦ Find what to automate or delegate", "Post your first gig", "Invite freelancers". The setup page itself starts at line 11228 and is outside this range.

---

## Cross-page elements seen

- Card status line (`cardStatus` / `cardSay`): the last answer stays on the card for 10 minutes and also shows as a toast. Confidential materials has its own version (2 minutes).
- Toasts through `D.toast`; page reload with a toast through `engReload`.
- Three confirmation patterns in one area: on-page review boxes (payment review, accept milestone), in-row swaps ("Yes, delete", "Yes, remove", "Yes, cancel at month end"), and browser pop-ups (confirm: human review, accept offer, withdraw dispute, cancel engagement, remove from bench, leave bench, delete webhook endpoint, stop review requests; prompt: report a review).
- Badges with tones "ready" (green), "held", "bad" (red), "off", "R", "C".
- Shared status word maps: agreement, milestone, submission, payment ("Waiting for you", "Being confirmed", "Paid", "Did not go through", "Canceled"), payout ("Ready", "Not set up", "Needs details"), dispute, offer.
- AI helper buttons, always marked "✦": "✦ Check this for me", "✦ Improve acceptance criteria", "✦ Check monthly scope", "✦ Help me write a review", "✦ Suggest a fair offer", "✦ Summarize both sides", "✦ Help me describe my firm", "✦ Find what to automate or delegate".
- Sensitive-data notice (`aiNotice`) and the repeated no-sensitive-data tick box on every upload.
- Glossary terms (`D.term`): "Confidential materials", "Subcontractors", "Milestones", "Fees", "Next billing", "Problems, disputes and canceling".
- Help tips (`pjTip` / `D.helpTip`) on folded sections, fee lines, "Paid to date", "Milestone progress", "Review payment".
- Tables with class `stack` and `data-label` cells that turn into cards on a phone.
- Native `<details>` folds inside cards, next to the custom folded sections of step 43 (two fold styles on one page).
- Button styles: `blue` (primary), `ghost` (secondary), `danger` (red), `linkish` (text link), with `small` for most in-card actions.
- Fee naming: "Platform fee", "Lawfecta fee", "Attorney platform fee", "the platform fee" all refer to the attorney's fee.
- The other party is named "freelancer", "attorney", "agency", "client", "the other person" or "the other side" depending on the card.

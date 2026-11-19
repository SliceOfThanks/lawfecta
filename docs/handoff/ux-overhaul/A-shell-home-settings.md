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

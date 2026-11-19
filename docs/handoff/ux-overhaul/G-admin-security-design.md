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

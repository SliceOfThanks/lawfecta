# Feature brief: the compact DELA workspace (sidebar, bottom bar, compact Home)

Step: 15   Spec references: Stacey's written spec of 2026-11-11 with three reference mockups; replaces docs/briefs/step-12-layout.md
Status: decisions made; mockups revised once after Stacey's review (revision 2, 2026-11-11); waiting for her approval of revision 2 and her answers to the seven rule questions below. The build starts after that.

Mockup page (private to Stacey's Claude account): https://claude.ai/artifact/9Fp5SWMoaue7YARdpvmXcL

## Who
Attorneys and freelancers on every plan, agency owners, and the Lawfecta Team in the admin area.

## What
DELA becomes a compact workspace. Members see their status and next action at once, with less scrolling, smaller headings and no repeated messages.
- Desktop: a left sidebar (about 232px, can be folded to icons, remembers the choice) and a slim top bar (56px) with the page name, Inbox, Notices and the account button.
- Phones: a fixed bottom bar with five labeled items; the fifth is "More" and holds the rest. A 52px top bar.
- Home: a short greeting, one profile box (what is missing, one main button, "Preview profile"), Work, and Ask DELA as one line. When the profile is complete the profile box becomes one line and work comes first.
- One burgundy main button color. Blue is for information badges only.
- Light and dark with the same layout.

## Where
- https://www.lawfecta.co/dela (member app, both sides) and https://www.lawfecta.co/dela-admin (admin area).
- Freelancer menu: Home, Work, Ask DELA, Earnings; then Profile, Agency; then Settings, Help.
- Attorney menu: Home, Projects, Ask DELA, Library; then Talent, Files, Get set up; then Profile; then Settings, Help. On phones: Home, Projects, Ask DELA, Library, More.
- Admin: the 25 tabs keep their names, in groups in the sidebar.
- Every existing `?tab=` link keeps working.

## When
Behind a new switch `new_layout`, off until Stacey approves. On for her account first, then for everyone before pilot members are invited. With the switch off DELA looks as it does today.

## Why
The tab row is long, Home repeats "finish your profile" three times, and the guide bubble and gradient boxes push the useful part off the first screen, most of all on phones.

## How it could go wrong
- A member cannot find a page that moved under "More": the names stay the same on desktop and phone, and Inbox shows its count on "More".
- The bottom bar or the phone keyboard covers the Ask DELA box or the last item on a page: the bar hides while typing, and pages get bottom padding.
- Smaller sizes hurt reading: body text stays 15 to 16px and phone buttons stay 44px tall.
- The profile count is wrong or made up: it comes from the list DELA already keeps for each profile, with no invented percentages or time estimates.
- Home implies that a complete profile guarantees work: the wording says attorneys can find or invite the member, nothing more.
- Free guide answers and DELA actions get mixed up: they stay two separate lines with a short explanation.
- Dark mode loses contrast on new surfaces: every pair is checked with real values.
- Old test prompts describe the old look: the "what every DELA page looks like" text is updated in all of them.
- Larger text, long names and narrow phones (320px) break the layout: checked at 320, 375, 390, 414, 768, 1280 and 1440, and at 200% zoom.

## Settings and switches it uses
- New switch `new_layout`.
- Existing: `onboarding_widget`, `guided_setup`, `appearance_choice`, `gig_alerts`, `profiles`, and the settings `guide.snooze_hours` and `guide.ai_replies_per_day`. No new numbers.

## Stacey's decisions (2026-11-11)
1. Mockup page first, then the build.
2. This replaces step 12 and its 8 questions. "Find..." search, "+ New" and the money chart wait until after the pilot. The admin area gets the sidebar now.
3. The attorney menu as listed above.
4. The new layout is finished before pilot members are invited.
5. Earlier the same day: the button blue was darkened for contrast. Under the new layout main buttons are burgundy, as her spec says.

## Questions to make it better (asked with the mockup; each has a default)
1. "Settings": today's "AI settings" page becomes "Settings" (AI key, emails, Appearance, alert choices, "Pause suggestions"). Default: yes.
2. "Help": a short page with Ask DELA, "See all setup steps" and the contact form on the Security page. Default: yes.
3. Admin groups: Members, Plans and settings, Marketplace, Money, Safety, with Release Control and Guide at the top. Default: yes.
4. "Work opportunities" on the freelancer's Home; attorneys keep the word "gig". Default: yes.
5. "Pause" (hides DELA's suggestions for 24 hours) is renamed "Pause suggestions" and moves into the small menu on the Ask DELA box and into Settings. Default: yes.

## Success looks like
- On a 390 x 844 phone the top bar, the greeting, the profile box with "Continue setup" and the start of Work are on the first screen.
- Profile guidance appears once, and each missing item opens the right part of the profile.
- Ask DELA is one line on Home and never grows the page.
- The phone bar has five labeled items; "More" opens the rest; nothing is hidden under the bar or the keyboard.
- The sidebar folds and remembers it; the current item is marked by more than color.
- Light and dark are equally clear; the accessibility check passes in both.
- With the switch off, every screen matches today's.
- The ChatGPT test (desktop; freelancer, attorney, owner, one login each) passes. Phones and dark are covered by the browser tests and by screenshots sent to Stacey.

The full build plan is in docs/PLAN.md under step 15.

## Revision 2 of the mockups (Stacey's review, 2026-11-11)
The canvas now has boards 1 to 11 (revised), validation boards V1 to V8 and a navigation map, at the same link.
Her answers in this review: "Paid out" shows this month and all time; admin totals are labeled "All time" (no date filter for the pilot); the admin group "Payments" holds Payments, Disputes and Recurring, and Usage moves to "Plans and settings"; the product word "side" becomes "workspace" everywhere.

### What prompted it and the rules checked in the code
Stacey reviewed the mockup page (https://claude.ai/artifact/9Fp5SWMoaue7YARdpvmXcL) and sent a revision list for boards 1 to 8, with two annotated reference images. The direction stays: compact layout, labeled sidebar, five-item phone bar, burgundy, light and dark. This pass is about clearer actions, status wording that matches DELA's real rules, the same abilities on phones as on desktop, and a little less wasted space. She asked for a plan first.

I checked the real rules in the code before writing this. The ones that shape the wording:
- **Eligibility is four separate things.** A freelancer is matched, shown in Talent or invited only when: all 12 profile details are saved, the LinkedIn check is passed, availability was confirmed in the last 14 days and is not "Not taking new work", and the account has no hold. DELA's own state names: Not complete, Waiting for a check, Availability out of date, Not taking work, Paused, Ready.
- **LinkedIn has two parts.** The LinkedIn address is one of the 12 details. The check is separate: the member submits it, then the Lawfecta Team checks it by hand. States: not started, pending (the member can do nothing but wait), verified, rejected. So "Pending" with a "Verify" button, as in the review image, would be wrong; the action exists only for not started and rejected.
- **Held money.** A paid milestone is "paid and held by Lawfecta" until the attorney accepts it. The freelancer receives the amount less the 5% fee.
- **The next milestone is charged automatically** to the saved card when the attorney accepts the previous one. The attorney must act only for the first payment or after a failed card. "Approve a payout" (review image, board 4) does not exist and will not be shown.
- **Review deadline:** 7 days. Nothing is accepted automatically; after the deadline the team is alerted.
- **Counts:** Home counts are all-time or current. Admin totals are all-time ledger sums; only "Held now" is a current balance. There is no date filter.
- **Unread counts:** Inbox = unread messages from the other person; clears per conversation when opened. Notices = unread notices; clears when one is opened or with "Mark all read".
- **Freelancers also have DELA actions** (25, 100, 300, 1,000 by plan); free guide answers are a separate 20 a day.
- **"Get set up"** stays in the attorney menu today even when finished.

Her answers today: "Paid out" shows this month and all time; admin totals are labeled "All time" (no date filter now); admin group "Payments" holds Payments, Disputes, Recurring, and Usage moves to "Plans and settings"; the product word changes from "side" to "workspace" everywhere.

### 1. Change table, board by board
P1 = must change, P2 = should, P3 = nice.

| Board | Issue | Revision | P | Accepted when |
|---|---|---|---|---|
| 1 Freelancer new, desktop | Progress counts what is missing | "7 of 12 complete" (saved of required, real data); bar shows 7 of 12 | 1 | Badge, bar and row count agree |
| 1 | "Add" repeated on every row | Whole row is the link, one chevron, no "Add" | 1 | Each row opens its profile section |
| 1 | LinkedIn check lives in a different card | A separate block under the 12 details: "Before attorneys can invite you" with LinkedIn check and Availability as their own rows, each with its real state and its one action | 1 | Completion and eligibility read as two things |
| 1 | Three competing links | "Continue setup" main button; "View remaining requirements" quiet link; "Preview profile" moves to the Profile page | 1 | One filled button in the card |
| 1 | Work text repeats the eligibility rule | One line: "Invitations start when the steps above are done." plus "Manage alerts" | 2 | No rule stated twice |
| 1 | Plan line wordy | "Freelancer Free. 3 proposals left this month. View plan" | 3 | Plan name and allowance still shown |
| 2 Dark, folded | Expand control unclear | Labeled control "Expand sidebar" with tooltip; every icon has a name and a tooltip on hover and keyboard focus | 1 | Tooltip board shows it |
| 2 | Rows too wide when folded | Content column capped at 760px; assistant stays 320px | 2 | Label and chevron stay close |
| 2 | States look alike | Hover = soft background; current = pink + bar + bold; focus = 2px ring | 2 | Three states differ on the specs board |
| 2 | Contrast | All pairs checked with the real dark values | 1 | 4.5 to 1 text, 3 to 1 edges |
| 3 Freelancer returning | Vague actions | "View milestone", "View invitation", "Confirm availability" | 1 | No "Open", "See it", "Confirm" |
| 3 | Milestone row long | Two lines: "Milestone 1: Draft" / "Run a Conflict Check, Example Legal. Due Nov 16. $150 paid, held by Lawfecta" | 1 | No hint the money can be withdrawn |
| 3 | Availability unclear | "Available for new work. Confirm again by Nov 20" with "Confirm availability" | 1 | State and next date shown |
| 3 | "Profile complete. Attorneys can find you" may be untrue | One status line with three parts: "Profile complete", "LinkedIn verified", "Available until Nov 20"; a part that blocks invitations is amber with its action | 1 | Never says "can find you" unless the state is Ready |
| 3 | "Paid out" has no period | "$190 this month" with "$1,240 all time" under it | 1 | Period shown (new behavior, see section 5) |
| 3 | Numbers are not links | Each number opens Work or Earnings on the matching list | 2 | Four links |
| 3 | Work list repeats the attention rows | Work list shows only title, client, next date, badge | 3 | No sentence repeated |
| 4 Attorney | Review row long, deadline twice | "Review milestone 1" / "Run a Conflict Check. Delivered Nov 10. Review by Nov 17" / "Review delivery"; no second badge | 1 | Deadline appears once |
| 4 | "Your review" | "Awaiting your review" | 1 | |
| 4 | Milestone 2 "not paid yet" sounds like a task | "Milestone 2 is charged when you accept milestone 1" (neutral); a pay action only for a first payment or a failed card | 1 | No false task |
| 4 | Numbers are not links | Each opens Projects on that filter | 2 | |
| 4 | Terms mixed | Fixed words: gig (posted job), proposal, project (signed work), draft | 2 | Same words on every board |
| 4 | "Get set up" after finishing | Leaves the menu when finished or dismissed; reachable from Help | 2 | Behavior change, section 5 |
| 4 | Two allowances | "20 free answers remaining today. Planning a task uses DELA actions: 12 of 1,000 this month." | 2 | Both shown, one line each |
| 4 | "Plan a task to hand off" too strong | Quiet link under the input | 3 | |
| 5 Admin | Labels | "Payment overview", "Needs attention", "Review dispute", "Collapse sidebar"; group "Payments" (Payments, Disputes, Recurring); Usage under "Plans and settings" | 1 | |
| 5 | No time basis | Two groups: "All time" (Charged, Paid out, Refunded, Attorney fees, Freelancer fees) and "Current balance" (Held now), each with a one-line definition under it | 1 | Every number has a basis |
| 5 | Explanation paragraph in the screen | Removed; kept in the notes | 1 | |
| 5 | Held payout has no action | "View held payout" goes to the Money tools on the Disputes page (where Retry and Release live today) | 2 | Goes to a real place |
| 5 | Only one group open | Any number of groups open; the menu scrolls; the choice is remembered | 2 | |
| 5 | Top bar crowded | One account button "Stacey Lake (owner)" opening Appearance, Member view, Sign out | 3 | Name and role always visible |
| 6 Phone new | Verification missing | Same eligibility rows as desktop, with their actions | 1 | Phone can do everything desktop can |
| 6 | Card tall | Next requirement only, "View remaining requirements" opens the rest; shorter sentence | 2 | First screen: bar, greeting, card with button, start of Work (measured at 390 x 844 CSS px) |
| 6 | Inbox hidden in More | Inbox button with its count in the top bar; More has no count | 1 | One tap to messages |
| 6 | Sizes | Body 16px and 44px targets stay | 1 | |
| 7 Phone dark | Parity | Same as 6; input, card and current-item edges visible; counts readable at real size | 1 | |
| 8 More | No close, no context | Heading "Freelancer workspace", close button "Close menu", grab handle stays; "Switch to attorney workspace" only when the member has both; Sign out last, separated; Inbox removed (now in the top bar) | 1 | |
| 8 | Behavior not specified | Written spec (section 2) and a dark board | 1 | |

### 2. Shared parts, changed once
- **Requirement row:** whole row is a link, status dot, label, optional state badge, one chevron. No "Add".
- **Eligibility block:** two rows, LinkedIn check and Availability, with states. LinkedIn: Not started ("Start the check"), Being checked by the Lawfecta Team (no action), Verified, Not approved ("Try again"). Availability: Available or Some hours until <date>, Out of date ("Confirm availability"), Not taking new work ("Change").
- **Status line (returning members):** up to three parts; green when fine, amber with its action when it blocks invitations.
- **Attention row:** title; one supporting line; one specific action that starts with a verb and names the thing.
- **Number tiles:** every tile is a link; a period under the number where one applies.
- **Top bar:** phone gets Inbox with its count. Admin gets one account button.
- **Sidebar:** "Collapse sidebar" and "Expand sidebar"; tooltips on icons; groups stay open as left.
- **More sheet:** heading, close button, behavior below.
- **Words:** "workspace" for "side"; gig, proposal, project, draft; "Awaiting your review"; "held by Lawfecta".

More sheet behavior (written on a note, built later): the page behind stays as it was, dimmed, with its scroll position; it cannot be used while the sheet is open. Closes by the close button, a tap outside, Escape, or tapping "More" again. Focus goes to the heading on open and back to "More" on close. The sheet scrolls inside itself if it is taller than the screen. The bottom bar stays visible above nothing: the sheet ends at the bar, and "More" shows as open.

### 3. Rules I need Stacey to confirm (shown as an orange note; defaults in brackets)
1. LinkedIn check on Home: may the member start it from Home, or only from the Profile page? [Home row opens the Profile page at the verification part.]
2. When the check is pending, show an expected time? [No time promised.]
3. "Get set up" leaves the attorney menu once finished or dismissed. [Yes.]
4. "Preview profile" moves to the Profile page. Does a real preview (the profile as attorneys see it) need building, or is the Profile page enough for the pilot? [Profile page is enough.]
5. Paid out "this month": calendar month in Pacific time, like the other monthly allowances? [Yes.]
6. An attorney with firm details missing: is that an attention row, as drawn? [Yes; it blocks signing and paying today.]
7. Renaming "side" to "workspace": also in emails already written into templates? [Yes, everywhere members read it.]

### 4. Navigation map (goes on the canvas as its own board)
- **Freelancer.** Desktop sidebar: Home, Work, Ask DELA, Earnings | Profile, Agency (if on) | Settings, Help. Phone bar: Home, Work, Ask DELA, Earnings, More. More: Profile, Agency, Settings, Help, Switch workspace (if both), Sign out. Top bar: Inbox, Notices, account. An agency that hires also gets Library, Projects, Talent in the second group and under More.
- **Attorney.** Sidebar: Home, Projects, Ask DELA, Library | Talent, Files, Get set up (until finished) | Profile | Settings, Help. Phone bar: Home, Projects, Ask DELA, Library, More. More: Talent, Files, Get set up, Profile, Settings, Help, Switch workspace, Sign out.
- **Admin.** Release Control, Guide | Members: Overview, Access, People, Team, Agencies | Plans and settings: Plans, Settings, Switches, AI and files, Tech catalog, Trials, Usage | Marketplace: Verification, Gigs, Meetings, Reviews | Payments: Payments, Disputes, Recurring | Safety: Security, Holds, Audit, Jobs | Member view. Account button: Appearance, Sign out.

### 5. Wording and look only, versus changes to how DELA behaves
**Wording and look (no rule changes):** everything in section 1 except the rows named below.

**Behavior changes, each built and tested in phase 2, none in this mockup pass:**
- "Paid out this month" (new count in `dela_home_counts`, calendar month, Pacific).
- "Get set up" leaving the menu when finished.
- Inbox in the phone top bar (today it is in the top bar only when the gig chat switch is on; same rule stays).
- Number tiles opening filtered lists (Work, Projects and Earnings need a filter parameter).
- Admin account button; admin groups staying open.
- The rename to "workspace" in every text.
- Not changing: eligibility rules, the LinkedIn check, the 14-day availability rule, charging, payouts, admin money actions and permissions.




## Revision 3: Stacey's review of part 1 on the site (2026-11-12)

Stacey sent a list after using part 1 on her phone and desktop: keep the phone menu on screen, give every role a place to see their sign-in email and change email and password, put work before setup on Home, make the profile card accurate, and stop Ask DELA repeating setup advice.

### What was checked first, and what each problem was
| Problem | Cause | Kind |
|---|---|---|
| Phone menu shows at the end of the page | Not reproduced. The bar is fixed to the window in the code, in the local tests at every scroll position, and a fixed box on the real www.lawfecta.co/dela page stays on the window edge (checked 2026-11-12 with a phone-sized browser; no box around DELA is moved or filtered). A full-page screenshot draws a fixed bar once, at the end, which looks the same. Hardened anyway. | Layout, unconfirmed |
| "Back to top" square on More | The website's own `.scrollup` button (fixed, bottom 30px, right 30px, above everything). | Host page |
| No place for email or password | Sign-in belongs to the Lawfecta website (Brilliant Directories). DELA gets the email in the sign-in pass and stores no password. Nothing in DELA showed the email or linked to the website's pages. The login page offers a password and "Sign in with Google". | Missing navigation |
| "0 of 12 complete" with only two rows | A profile never saved reports "everything" as missing; Home had no list for that case. The 12 are the setting profile.required.freelancer: first name, last name, headline, summary, practice areas, services, experience, software, time zone, capacity, LinkedIn address, the conduct acknowledgment. The LinkedIn check and availability are not among them. | Inconsistent state |
| Active work next to "0 of 12" on Stacey's account | Two test jobs prepared in the database on 2026-11-06 for her account, which has no profile. A real member can also have work in hand with an incomplete profile after a required detail is added later. Legitimate; Home must not contradict itself. | Data |
| Agreement to sign under the setup card | Home put the profile card first whenever the profile was incomplete. | Ordering rule |
| Ask DELA repeats setup advice | The guide's next-step message and its first button ("Finish my profile") were shown inside the Ask DELA card. | Duplicate content |

### What was built
- **Phone bar.** Still fixed to the window. DELA now measures where the bar really is after every draw, scroll and resize; if it is not on the window's bottom edge (a host page that traps fixed boxes), the bar, the More sheet and its shade move to DELA's own holder on the page body. Tested by trapping it on purpose. The website's "back to top" square is hidden under 900px on the DELA page.
- **Keyboard rule.** While a text box has focus on a phone the bar is hidden; it returns when typing ends, and when the on-screen keyboard closes with the box still in focus (visual viewport).
- **More.** A modal: the page behind cannot scroll or be used (inert), the place on the page is kept, focus goes to the heading and back to More, Tab stays inside, Escape, the X, a tap outside and More all close it. The bottom bar stays usable: More is the one marked item while open, and another destination closes the sheet and goes there. The sheet scrolls inside itself.
- **Account and security.** One shared card (`D.accountCard`): sign-in email, "Change email", "Change password", "Forgot password", and the Google note with a link to Google's security page. Reached from the account menu ("Account and security"), Settings (first card, so also phone More, Settings), and the admin top bar ("My account"). The page addresses are settings (account.change_email_path, account.change_password_path, account.forgot_password_path, account.google_sign_in; migration 0095); only a path on this site is accepted.
- **Home order.** Needs your attention, then Your work, then the profile card, when anything waits or work is in hand; the profile card leads otherwise. Attention is ranked: a failed payment, then the nearest real deadline.
- **Profile card.** "N of 12 details complete" from saved data, the next detail (three on desktop), "View all N remaining details", "Continue setup", "Help me complete my profile" (asks DELA in the Home card). Under "Also needed before new invitations": "Verification: LinkedIn check" (Not submitted with "Submit LinkedIn profile", Review pending, Verified, Action needed with "Send it again") and "Availability" with its state and next date. With work in hand it adds "Work you already have is not affected."
- **Ask DELA on Home.** Heading, one input, send, the free answers line (and DELA actions for attorneys), "Open Ask DELA", "Suggestion settings". No setup paragraph, no second profile button. Pausing suggestions lives in Settings. Only a new gig alert is still announced in the card. One answer at a time, capped in height.
- **Look.** Section gaps 20px on desktop without the doubled margin, one input surface for Ask DELA in dark, quieter waiting and done badges in dark.

### Not possible without the website (Brilliant Directories), and open questions
1. **Verified email change.** The spec asks that a new address is verified before it replaces the old one, with pending, expired and canceled states, and a notice to the old address. Brilliant Directories changes the address when the member saves the Contact Details form; DELA found no verification step in its help pages. DELA therefore shows no pending state. Stacey decides: accept the website's behavior for the pilot, or ask Brilliant Directories support whether email-change verification can be turned on.
2. **Email verified or not.** The sign-in pass carries no "verified" flag, so DELA does not show one.
3. **Password or Google.** DELA cannot tell which way a member signs in, so the card explains both.
4. **The two page addresses** /account/contact and /account/password are the Brilliant Directories defaults; signed out, every /account page redirects to the login, so Claude could not open them. Stacey clicks each button once; if one is wrong, the setting is corrected (no new code).
5. **The phone menu report.** If the bar still shows only at the end of the page on her phone after this version, a screen recording of scrolling will show what the page does.

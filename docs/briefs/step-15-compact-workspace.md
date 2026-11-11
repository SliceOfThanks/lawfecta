# Feature brief: the compact DELA workspace (sidebar, bottom bar, compact Home)

Step: 15   Spec references: Stacey's written spec of 2026-11-11 with three reference mockups; replaces docs/briefs/step-12-layout.md
Status: decisions made, mockup page sent for approval. The build starts after Stacey approves the mockups.

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

# Feature brief: New DELA layout (sidebar, "+ New", dashboard)

Step: 12   Spec references: 00 Program Guide (two sides, always separate), step 10 UI and UX reviews
Status: replaced on 2026-11-11 by docs/briefs/step-15-compact-workspace.md (Stacey's new spec). The 8 questions below are no longer open. Search, "+ New" and the money chart wait until after the pilot.

Mockup (private link, Stacey can share it from the Share menu): https://claude.ai/artifact/JXogiAYYHhjyMp5inwYuH2

## Who
- Attorneys on every plan (att_free, att_plus, att_pro, att_business).
- Freelancers on every plan (fl_free, fl_plus, fl_pro, fl_business), including agency owners who also hire.
- The Lawfecta Team in the admin area (DELA-Admin).

## What
DELA gets a new layout, with Indy as the inspiration and Lawfecta's own colors:
- A left sidebar menu with grouped sections, in place of today's row of tabs.
- A slim top bar with "Find...", a "+ New" menu, Inbox, Notices with a count, and the round account button.
- A "Dashboard" home with a money card (with a chart and an All / One-off / Monthly toggle) and a "Pending items" card that shows what needs action.
- The admin area gets the same sidebar, with its 25 tabs grouped, and an Overview dashboard for the team.

Done looks like: a member finds every screen in two clicks or fewer, sees their money and their to-do list on one page, and starts any new thing from "+ New".

## Where
- Member app: the /dela page on the test site (https://www.hirelegalhelp.com/dela), widget DELA-App.
- Admin area: https://www.hirelegalhelp.com/dela-admin, widget DELA-Admin.
- Every existing page link (?tab=...) keeps working, so links in emails and notices still open the right screen.

## When
- Behind a new switch, new_layout. On for everyone on the test site, off on Live until Stacey turns it on.
- The old layout stays available behind the switch until Stacey says it can go.

## Why
- Today's tab row is long and wraps; the UX review found people had trouble finding screens on both sides.
- A dashboard with money and pending items brings people back to act (sign, review, pay, answer), which keeps engagements moving.
- The grouped admin menu makes the 25 admin tabs quicker for the team.

## How it could go wrong
- BD's own header and side columns: DELA sits inside a BD page. The sidebar must sit below BD's header and fit BD's content width.
- Phones: a sidebar does not fit. The phone layout needs a menu button and a short bottom bar.
- Dark mode: every new card and the sidebar need readable colors in dark mode.
- Broken links: notice and email links use ?tab= names. Those names stay the same.
- Tests: every browser test uses tab names and button labels. These stay the same; tests that look for the old tab row get updated.
- Money figures on the dashboard must match the ledger exactly (integer cents, the same numbers as Payments and Earnings).
- Two sides stay separate: a person with both sides sees only the money and items for the side they are on.

## Settings and switches it uses
- Switch new_layout (off on Live).
- No new prices, fees, limits or deadlines.

## Questions to make it better
1. Sidebar groups: are the group names and order in the mockup right? Attorney: Work, Knowledge, Money, Account. Freelancer: Work, Money, Hiring (agency), Account. Admin: Members, Plans and settings, Marketplace, Money, Safety.
2. Money card, attorney side: show Paid, Held for milestones, Refunded and Due? Anything to add or drop?
3. Money card, freelancer side: show Earned, Held, Paid out and Pending? Anything to add or drop?
4. "Find...": should it search documents, gigs and engagements, and people you have worked with? Or only some of these?
5. "+ New": attorney items are Post a gig, New document, Ask DELA, Record a process, Import. Freelancer items are Ask DELA, Add a service, Confirm availability. Add or remove any?
6. Phones: a menu button plus a bottom bar with four main items, or a menu button only?
7. BD's own sidebar on the /dela page: should DELA ask BD to hide it so DELA can use the full width? (If yes, I will give you a BD connector prompt.)
8. Admin Overview: is the "Needs the team" list (open disputes, held money, failed payments, waiting reviews, alerts) the right set?

## Success looks like
- With new_layout off, DELA looks and works exactly as today.
- With it on, on the test site:
  - Freelancer: the sidebar groups show, "+ New" opens each item, the Earnings card adds up for a prepared engagement, Pending items counts are right.
  - Attorney: the same checks with the attorney groups, the money card and the attorney pending items.
  - Owner: the admin sidebar groups show, every old tab opens from the sidebar, the Overview dashboard counts are right.
  - Dark mode is readable everywhere. Old ?tab= links open the right screen.

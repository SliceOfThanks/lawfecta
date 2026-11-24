# Feature brief: a shorter menu

Step: 81   Spec references: step 8 (the new layout), step 16 (Subscription), step 73 (Team work)
Status: built in acceleration mode. Stacey 2026-11-24, with a picture of the left menu: "organizing menu: (1) remove notifications - they can click the notification item to view all notifications (2) remove from menu - files should be in the library (3) remove from menu - team work should be under projects (4) subscription should be in settings".

## Who
Every member who uses the new layout: attorneys, firm staff, freelancers, agency owners.

## What
Four lines leave the left menu. Each page stays, with its own address, and is reached from the place it belongs to:
- Notifications: from the bell in the top bar. The bell shows the newest, and "View all notifications" there opens the full page.
- Files: inside the Library. A row at the top of the Library reads "Documents" and "Files".
- Team work: under Projects. A row at the top reads "Projects" and "Team work".
- Subscription: in Settings. A row at the top reads "Settings" and "Subscription".

## Where
The left menu, the bottom bar and "More" sheet on phones, and the top of the Library, Projects and Settings pages. Browser only: app/dela-app.js (navGroups, subNav), shared/dela-core.js.

## When
At once for everyone on the new layout. The older layout (top tabs) is unchanged.

## Why
The menu had fourteen lines. Four of them are parts of another line.

## How it could go wrong
- A member cannot find a page that moved: the menu line it now belongs to stays marked while the member is on it, the row at the top names both pages, and the top bar still names the page.
- A saved link or an email link breaks: every address is unchanged (?tab=files, ?tab=teamwork, ?tab=subscription, ?tab=notices).
- The row shows a page the member may not use: it lists only pages that member has. With one page left, no row shows.
- An open playbook is pushed down by the row: the row hides while a document is open.
- Subscription was placed under Profile on 2026-11-12 at Stacey's word: her newer words win.

## Settings and switches it uses
None new. Each page keeps its own switch (file_uploads, team_assignments).

## Questions, and how Claude answered them (acceleration mode)
1. Do the moved pages become tabs inside the other page, or stay pages of their own with a row to switch? **Pages of their own, with a row at the top.** No address changes, and nothing inside the pages had to be rebuilt.
2. Freelancers have no Files or Team work. **They only lose Notifications and Subscription from the menu.**
3. Is "Get set up", "Meetings", "Community" or "Profile" moved too? **No. She named four.**

## Success looks like
- The menu has no "Notifications", "Files", "Team work" or "Subscription".
- Library shows "Documents | Files"; Projects shows "Projects | Team work"; Settings shows "Settings | Subscription".
- On Files, "Library" is the marked menu line.
- The bell, then "View all notifications", opens the Notifications page.

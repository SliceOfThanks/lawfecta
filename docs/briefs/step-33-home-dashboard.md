# Step 33: a Home each member arranges

Stacey 2026-11-17: sent six mockups and the brief "Lawfecta Homepage: Customizable Dashboard Improvements", then one more mockup as the example to follow ("Your Workspace", with "My Dashboard (6)" and "Available Widgets" in the panel). She approved the plan the same day.

Status: approved to build.

## Who
Attorneys and freelancers, on every plan. Each side has its own widgets and its own saved layout, because the two sides stay separate.

## What
Home is a set of widgets. A member chooses which ones show and in what order, saves it, and can go back to the default. A member who changes nothing gets a useful default.

## Where
Home in the new layout (the one with the menu at the left): https://www.lawfecta.co/dela?tab=home. The button "Customize dashboard" is at the top right of the page and opens a panel at the right. Home stays in view behind the panel.

## Her answers (2026-11-17)
1. The Customize screen is a side panel with one list.
2. The old Home content is replaced: the banner by "Ask DELA", the number tiles by "My projects", verification by "Account status". The list "What DELA will do for you" goes away.
3. The guide stays fixed, not a widget. (In the new layout the guide's next step already lives inside the "Ask DELA" card, and the "Complete your profile" card is the part that stays: see decision 3.)

## The widgets
| Widget | What it shows | On Home by default |
|---|---|---|
| Ask DELA | The question box and DELA's next step for the member | yes |
| Needs your attention | Up to three things that wait on the member, each with its button; "View all N items" | yes |
| My projects (freelancer: My work) | The numbers and the active jobs | yes |
| Monthly usage | Attorney: DELA actions and storage with bars. Freelancer: what the plan allows this month | yes |
| Urgent notifications | The three newest unread notifications | yes |
| Account status | Profile and verification, the plan with "View plan" | yes |
| Upcoming meetings | The next two meetings, with "Join the meeting" when the room is open | no |
| Recent messages | The three newest conversations | no |
| My bench (attorney only) | Three people on the bench and whether they are available | no |
| Standing arrangements | The arrangements in force and what was spent this month | no |
| Quick actions | Shortcuts to the pages used most | no |

A widget whose feature is switched off for the member is not offered. A widget that cannot load its data says so and offers "Try again".

## Her rule
Removing a widget only hides it on Home. Nothing is deleted, no feature is turned off, and no notification is quieted. The bell, the Notifications page and the emails do not read the layout at all (tested).

## Decisions Claude made (change any of them)
1. Two columns on a wide screen, one on a tablet or phone. The member sets the order, not the width of a card.
2. "Needs your attention" can be removed like any other widget.
3. While the profile still blocks the member ("Complete your profile", availability out of date, account paused), that card stays on Home even when "Account status" was removed, with the line "Shown on Home until this is done." With no work in hand it comes first, as before.
4. The names use the site's usual capitals ("Needs your attention", "My projects"), not the mockup's capitals on every word. The page title is "Your Workspace", as in her example.
5. In the panel each row has a drag handle, an on/off switch and a "⋯" menu with "Move up", "Move down" and "Remove from Home". The switch and "Remove from Home" do the same thing.
6. Saving the default order again is kept as "no saved layout", so a member on the default follows any later change to the default.
7. Each save writes one line to the audit history. No new tracking of clicks or of time on the page; that would need her decision and a line in the privacy policy.
8. The next meeting no longer shows on Home by itself: "Upcoming meetings" is a widget the member adds, as in her example. Meetings stay in the menu and in notifications.
9. Members still on the old layout (no menu at the left) keep the old Home. The test site has the new layout on.
10. "Plan and limits" from one mockup is left out: "Monthly usage" and "Account status" cover it.

## How it could go wrong
- A saved layout names a widget that no longer exists: it is left out; if nothing is left, the default shows. Home is never empty.
- A member removes everything: refused, one widget must stay.
- Someone sends another member's id, or an attorney-only widget for the freelancer side: ignored or refused (tested).
- The layout cannot load: Home shows the default and "Customize dashboard" is off until the page is reloaded.
- Two tabs: the last save wins. It is a display choice, nothing else depends on it.
- Closing the panel with unsaved changes asks first.

## Settings and switches
None new. No business number is involved.

## Not done
- Choosing the width or column of a card.
- Counting how often each widget is used.
- A check with a real screen reader and on a real phone (see docs/PILOT_CHECKS.md).

## Success looks like
The ChatGPT check docs/tests/home-dashboard-chatgpt-prompt.md, written after the release: freelancer then attorney, each login once.

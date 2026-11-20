# Feature brief: the Members page inside DELA

Step: 62   Spec references: step 1 (admin area: People, Access list, Holds), the Lapt workflow handoff of 2026-11-19
Status: built in acceleration mode. Stacey 2026-11-20: "On DELA (not DELA-admin) there needs to be an admin account to manage users (similar to BD backend)."

## Who
The Lawfecta Team. The owner can change things. Reviewer, support and finance can read; support and finance can place and release holds, as in the admin area.

## What
A page "Members" in DELA itself, in the menu of every Lawfecta Team account. It lists everyone who has opened DELA or was added to it, with search (name, email, member ID), a filter (everyone, attorneys, freelancers, on the access list, not on it, on hold, closed, Lawfecta Team) and pages of 25. "Open" shows one member on one page:
- Account: member ID, email, first opened, last seen, whether they can open DELA now, what they made.
- Workspaces and plans: each side with its plan and check state. The owner can give a workspace and plan, or put it back on the website plan.
- Access to DELA: on the access list or not, with add and remove.
- Holds: place one with a reason, release one with what was checked.
- Close this DELA account, and reopen it. Owner only, with a reason.
- What the Lawfecta Team did on this account, newest first.

## Where
https://www.lawfecta.co/dela?tab=members (the "Members" entry in the DELA menu, Lawfecta Team only).

## When
Whenever the Team needs to look someone up or change their access during the pilot.

## Why
The admin area spreads this over four pages (People, Access list, Holds, Audit log) and shows 50 people with no pages. Stacey wants to manage members where she works, the way the website's back end does.

## How it could go wrong
- A member opens the page or calls its addresses: refused on the server, and the menu entry is not drawn for them.
- A Team member who is not the owner closes an account or gives a plan: refused on the server.
- The owner closes their own account or another Team member's: refused.
- Closing deletes something: it deletes nothing. It is a status. Documents, gigs, agreements and payment history stay. Reopening undoes it.
- A closed member stays signed in: every open session ends at once.
- Closing twice, or a double click: the second one changes nothing.
- No record of why: a reason is required and is kept on the member's record with who did it and when.
- Pop-ups: none. Reasons are typed in boxes on the page, so an agent's browser cannot cancel them.

## Settings and switches it uses
None new. Migration 0144 adds three functions. Giving a plan, the access list and holds use the admin area's existing functions.

## Questions, and how Claude answered them (acceleration mode)
1. Who is "an admin account"? **Any Lawfecta Team account** (the roles already in the admin area). No new kind of account.
2. May the Team sign in as a member, as the website's back end allows? **No.** Acting as someone's account needs Stacey's yes each time, and DELA has no such feature.
3. Edit a member's name, email or password here? **No.** Those live on the website and DELA reads them at each visit. The page says so.
4. Delete a member? **No.** Closing is the strongest action. Deleting data waits for Stacey's words.
5. Does closing touch the website account, the plan or billing? **No.** Only DELA.
6. Does the admin area's People page go away? **No.** Both stay; this page is the fuller one.
7. A firm owner managing their own staff here? **Not in this step.** That is the team seats item on the 2027 roadmap. This page is for the Lawfecta Team.

## Success looks like
Owner login:
- "Members" is in the DELA menu. The list shows members with their plans, status and last visit.
- Searching a member ID finds one person. "Open" shows the six cards.
- Giving a plan shows "(set by the Team)". A hold shows with its reason. Closing needs a reason and says nothing was deleted. Reopening works.
Member login:
- No "Members" entry, and the address shows Home.

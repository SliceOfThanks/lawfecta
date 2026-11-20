# Feature brief: team work, with no gig

Step: 73   Spec references: DELA build handoff sections 5 B and 10, the Lapt workflow handoff of 2026-11-19 (sections 5, 8, 9 screens 8 to 12), step 2 (the Library team), step 45 brief question 1 (answered "later" then)
Status: built in acceleration mode. Stacey 2026-11-20: "Yes, build it" to assigning a playbook to her own team.

## Who
A firm's editors and administrator, who assign. Anyone on that Library's team, who does the work. Both are logged in on the attorney side.

## What
On an approved SOP or Workflow, "Assign to your team": choose the person, the steps (all, or some), a due date and a note. No proposal, no agreement, no payment.
- The person assigned gets a notice and an email, opens the assignment, and **accepts or declines themselves**. Nobody can accept for them.
- After accepting they tick each step as they finish it and **submit for review**, with an optional note.
- The person who assigned (or the administrator) **accepts the result or requests changes** with a note. Changes go back to the same person.
- Either side can send a note at any time. The assigner can cancel while it is open.
- A page "Team work" lists what is assigned to you and what you or your firm assigned, each with its status.
- If the chosen steps start after a step that is not assigned, the page says which step they build on.
- The work follows the version of the document that was approved when it was assigned, and says so if a newer one has been approved since.

## Where
- A document's page in the Library: a line "Work for your own team" with the button "Assign to your team".
- The page "Team work" in the DELA menu (/dela?tab=teamwork), and one assignment's own page.

## When
Whenever work stays inside the firm: a paralegal on staff, an office manager, a bookkeeper who is on the team.

## Why
DELA could only hand work to freelancers through a gig. Work the firm's own people do had no place, so the playbooks were written and then carried out by email.

## How it could go wrong
- Someone accepts or approves for another person: refused on the server. Accepting and ticking steps are the assignee's; accepting the result is the assigner's or the administrator's.
- Work is assigned to someone outside the team, or by someone outside the firm: refused. Another firm cannot see an assignment, a freelancer has no part in it.
- "Submitted" is taken for "accepted": they are separate states and separate events, shown as such.
- The record is changed afterwards: the list of what happened cannot be edited or deleted.
- A double click assigns twice: one request, one assignment.
- A password or sensitive data in a note: the existing check runs on every note.
- The document changes after assigning: the assignment keeps its version.

## Settings and switches it uses
Switch team_assignments. Setting team.assignments_open_max (200). Migration 0153.

## Questions, and how Claude answered them (acceleration mode)
1. Who may assign? **An editor or the administrator of that Library.** The same people who may change the documents.
2. Who can be assigned? **Anyone on that Library's team** except yourself, viewers and commenters included: they can read the document.
3. Must every step be ticked before submitting? **No.** The page says how many are not ticked, and the reviewer sees the count. Some steps turn out not to apply.
4. Who reviews? **The person who assigned, or the administrator.**
5. Time tracking, payment or hours? **No.** It is the firm's own staff.
6. Does it count against a plan limit? **No new limit.** The team itself is already limited by seats.
7. Freelancers on the firm's bench? **No, they get gigs.** This is for people on the Library's team.
8. Does the workflow card ("The DELA workflow") show team assignments? **Not yet.** It shows gigs and engagements; team work has its own page.

## What is not built
Recurring assignments; reassigning to someone else (cancel and assign again); the "Was anything unclear?" note to improve the document from team work; team work on the workflow card and on Home.

## Success looks like
- The owner assigns steps 2 to 4 of an approved SOP to a colleague, with a note.
- The colleague sees it under "Assigned to you", accepts, ticks the steps and submits.
- The owner sees "Submitted, waiting for review", accepts, and both see "Accepted. Done".

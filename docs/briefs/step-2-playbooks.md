# Feature brief: AI and playbooks (attorney side), with the firm playbook library

Step: 2   Spec references: Phase 1A playbooks, AI gateway, exports (C-28), Decision Register att.playbooks_saved and exports
Status: draft, waiting on Stacey's answers. Library limits, exports, chat, activity log and comments added by Stacey 2026-10-27.
Built on Step 2a (docs/briefs/step-2a-ai-keys-voice-files.md): the AI runs on Lawfecta's key or the member's own key, members can talk instead of type, and attorneys can upload an existing process document and turn it into a playbook.

## The goal
The playbook library is where an attorney and their team keep how the firm works, one process at a time, so the firm can be run from it: anyone on the team can open a playbook and do the work the same way every time, and the attorney stays in control of what the firm's way is.

## What a playbook is (the definition the AI builds to)
A playbook is one repeatable firm process, written so a trained person who has never done it can do it correctly, and so the attorney can see where they must review.
It has these parts. Parts marked required must be filled before it can be called complete.

| # | Part | What it holds | Required |
|---|---|---|---|
| 1 | Title and outcome | What the process is and what "done" produces, in one or two sentences | Yes |
| 2 | Practice area and jurisdiction | For example family law, California; or "any" | Yes |
| 3 | When to use it | What starts it (a new client signs, a court notice arrives, the first of the month) | Yes |
| 4 | Roles | Who owns it, who does each part (attorney, paralegal, assistant, freelancer), and which parts only an attorney may do | Yes |
| 5 | What you need first | Documents, information, access and tools needed before starting (described, never actual client data) | Yes |
| 6 | Steps | Numbered steps. Each step: who does it, how, the tool used, rough time, and any decision point ("if X, go to step 9") | Yes, at least 3 steps |
| 7 | Deadlines and timing | Court or rule deadlines it depends on, and the firm's own target times | If the process has deadlines |
| 8 | Quality checks | How to tell each step and the whole job was done right (a checklist the reviewer ticks) | Yes |
| 9 | Attorney review and ethics points | Where an attorney must review or sign, supervision notes, and what must never be delegated | Yes |
| 10 | Templates and resources | Links to the firm's own templates, forms, checklists and outside references | No |
| 11 | Tools | Software used (links to the tech catalog in Step 4) | No |
| 12 | Deliverables | What is handed over at the end, to whom | Yes |
| 13 | Record | Version, status (draft, in review, approved), playbook administrator, approver, last reviewed date, next review date | Filled by DELA |

Complete means: every required part is filled, DELA's completeness check passes, and the playbook administrator has approved it. The playbook shows a completeness bar (for example 9 of 10 parts) and lists what is missing in plain words.
The AI asks follow-up questions until every required part is filled. It never invents court rules or deadlines; anything it is unsure of is marked "check this" for the attorney.
No confidential client data belongs in a playbook. The notice shows wherever people type, and the AI warns if text looks like client details.

## Who
- Attorney (library owner) and their team. Each library has a playbook administrator (the owner, or someone they name) who approves playbooks, changes and comments.
- Team roles per library: administrator, editor, commenter, viewer. View, edit, comment and share are separate permissions.
- Freelancers: see a playbook only when an attorney shares it with them for a gig (Step 4). Question 3 covers a freelancer library.

## What
1. Build: describe a task, answer the AI's questions, get a structured playbook that meets the definition above.
2. Library: one private library per attorney (or per firm on Business), with a cap on how many playbooks it holds, by plan.
   Stacey's numbers: Free 10, then plus 30, then plus 50 for each paid plan (see question 1 for how to read this).
3. Chat with a playbook: ask questions about it ("who does step 4?") or ask for a change ("add a conflict check before step 2"). The AI proposes the change as a tracked suggestion; nothing changes until an editor or the administrator accepts it.
4. Versions: every accepted change makes a new version. Approved versions are kept; any earlier version can be viewed and restored (as a new version).
5. Activity log: every event on a playbook, in order, never editable: created, AI draft, edited, suggestion made, comment added, accepted, rejected, approved, exported, shared, unshared, restored, archived.
6. Side comments: team members leave comments on a part or a step, either a note or a suggested change. The playbook administrator accepts or rejects each one; the decision and who made it go in the log, and the commenter is notified.
7. Exports: Word (.docx), PDF, Markdown, HTML, and a step checklist as CSV. These import into knowledge base and work tools such as Notion (Markdown, HTML or Word), Waybook (Word or PDF), Monday (CSV into a board, or Word into Monday Docs), Google Docs, Confluence, ClickUp and Trainual. Direct "send to Notion" or "send to Monday" buttons can come later (question 4).
8. Review reminders: each approved playbook has a next review date; the administrator gets a reminder.

## Where
DELA attorney side: Delegate tab (build), a new Library tab (list, search, filters by practice area, status and completeness), the playbook page (read view, chat panel, comments in the margin, activity, versions, export). Admin area: playbook counts per plan, AI usage, errors.

## When
- Limit checked when a playbook is created or restored from the archive, and again at the moment it saves.
- Comments and suggestions notify the administrator at once; a daily digest option later.
- Review reminders on the next review date.

## Why
The firm's know-how lives in one place, the team works the same way, new hires and freelancers get up to speed fast, and the playbooks feed Flex Gigs in Step 4. Higher plans hold more of the firm's processes, which gives a clear reason to upgrade.

## How it could go wrong
- At the limit: a clear message with the count (10 of 10) and an upgrade button. Drafts count toward the limit (question 6).
- Downgrade to a smaller plan while over the limit: everything stays readable, editable and exportable; only new playbooks are blocked until the library is under the limit. Nothing is deleted.
- Two people edit at once: the second save is told the playbook changed and shown both versions; nothing is overwritten silently.
- A team member removed from the firm: loses access at once; their comments and log entries stay.
- An AI suggestion that removes an attorney review point: flagged for the administrator, never accepted automatically.
- The AI is asked something off topic: a short redirect.
- Member's own AI key fails: DELA stops and asks before using Lawfecta's key (rule from the Program Guide).
- Exports: double clicks use one export; exported files carry the version and date in the footer so old copies are recognisable.
- Privacy: AI calls use the API with storing turned off; members' text is not used to train any model (Stacey's direction 2026-10-27).

## Settings and switches it uses
- att.playbooks_saved: becomes a limit per plan (today it is "no cap" in the Decision Register; Stacey changed this 2026-10-27, numbers per question 1). Changed through a new plan version so the history is kept.
- exports per month (open), AI credits (provisional), playbook.review_months (default 12), switches ai_generation and playbook_library.

## Questions to make it better
1. Limits: which reading is right?
   A) Free 10, Plus 40 (10 + 30), Pro 90 (40 + 50), Business 140 (90 + 50).
   B) Free 10, Plus 30, Pro 50, Business: a number you choose (or no cap).
   Suggested: A.
2. Business: is the limit for the whole firm library (shared by all seats), or per person? Suggested: one firm library, one limit.
3. Freelancers: do they get their own small library for their own service processes in Phase 1? Suggested: not in Phase 1; they see playbooks shared with them for a gig.
4. Exports: are the file formats (Word, PDF, Markdown, HTML, CSV checklist) enough for launch, with direct "send to Notion / Monday / Waybook" later? And do exports of your own library still count against the monthly export allowance (Free has 0 today)? Suggested: own library exports unlimited; the allowance applies to marketplace and engagement playbooks.
5. Team on Free, Plus and Pro (1 seat): may the attorney invite people as commenters or viewers without a seat? Suggested: yes, up to 3 guests; editing needs a seat.
6. What counts toward the limit: drafts and approved (suggested), archived (suggested: yes, so archiving is not a way around the limit), deleted (no; trash empties after 30 days).
7. Review reminders: every 12 months by default?
8. Should the AI suggest playbooks the firm is missing (for example "you have intake but no conflict check")? Suggested: yes, as a suggestion list only.

## Success looks like
- A test attorney builds a playbook through the AI; it is not "complete" until every required part is filled and the administrator approves it.
- At 10 of 10 on Free, the 11th is refused with a clear message; upgrading lifts it at once.
- Chat proposes a change, the administrator accepts it, a new version appears, and the log shows who did what.
- A team commenter leaves a suggested change on step 3; the administrator rejects it; the log and a notice show it.
- A Word export and a CSV checklist open correctly and import into Notion and Monday.
- A freelancer, or another firm, cannot see the library.

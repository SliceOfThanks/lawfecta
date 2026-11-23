# Feature brief: an Ask DELA conversation in progress, as the second mockup of 2026-11-23 draws it

Step: 78   Spec references: step 77 (the first screen), step 45 (working context, the one next question), step 75 (the workspace pages), Stacey's mockup "Ask DELA / Active conversation, numbered UX/UI & accessibility notes" (2026-11-23)
Status: built in acceleration mode. Stacey read the list of differences on 2026-11-23 and answered "all as suggested": her rule stays under the message box, "Save as a playbook draft" stays, the source tag shows on both sections, "Chats & pages" stays a list, three playbooks for one chat stays, and the first screen shows "AI usage: View details" as well. Stacey 2026-11-23, with the mockup attached: "(1) attached is mockup that needs to be done EXACTLY (colors & all). (2) If you disagree with anything please let me know in a bullet list with simple questions and your suggestion (and why suggested) (3) conversation context - need to only show the most recent 3-5 otherwise that panel will take up the whole screen. Evaluate how the user can still pull in older context items easily from this screen."

## Who
Attorneys and firm staff in Ask DELA with the workspace on. Freelancers get the same conversation layout with no playbooks to choose.

## What
Once a message is sent, the page shows the conversation as the mockup draws it: the member's words at the right with their initials, DELA's answer at the left, and inside the answer what it was built from. When the member asks which work someone else could do and a playbook is selected, the answer lists "Tasks that can be delegated" and "Keep with an attorney", each line tied to a numbered step of that playbook. At the right: the selected sources only, "Manage sources", and "What happens next?".

## Where
https://www.lawfecta.co/dela?tab=delegate after a message is sent. Browser: app/dela-app.js (dwChat, dwBubble, dwSources, composer), shared/dela-core.js. Server: supabase/functions/api/lib/ai/ask.ts (readPlan, stepsIndex), app.ts (chatContext, the chat send route). Database: migration 0157.

## When
The sources and tasks are checked and stored when DELA answers. They show again whenever the chat is opened.

## Why
Mockup note 2: "Ground answers in selected sources. Show source title, version and specific steps." A lawyer has to be able to see where an answer comes from before acting on it.

## How Stacey's point 3 is answered: the context panel stays small, and older playbooks are one search away
What I looked at:
- Listing playbooks inside the card (as before): grows with the firm's Library. Refused, as she says.
- Showing the three to five most recent in the card: still shows playbooks that are not in use, which mockup note 4 rules out ("Show selected, authorized sources only").
- Chosen: the card shows only what is selected (four at most, then "and N more"). "Manage sources" opens a window with three parts: what is selected, the five playbooks changed most recently, and a search box over every playbook the member may read. Typing part of a name finds an older one; one click selects it. "Add" under the message box offers the same window as "Add a playbook as a source". The server already limits a chat to the number in the setting ai.chat_context_documents (3).

## How it could go wrong
- An answer shows a source it did not have: the source bar is written by the server from the playbooks it really sent, not from the AI's words.
- A task points to a step that does not exist, or to another firm's playbook: every task line is read in code. The title must be a playbook that was sent and the number a real step of it, or the line is dropped. Covered by tests.
- The AI calls an attorney's decision delegable: a step the playbook marks as the attorney's decision is always shown under "Keep with an attorney", whatever the AI wrote. Legal judgment in the AI's own wording is still the AI's call; the member reviews before anything happens.
- A button under the answer publishes something: each opens a page where the member reviews. Nothing is posted, sent or approved from the chat.
- "Correct DELA's understanding" changes a playbook or an instruction: it only puts words in the message box. Mockup note 6.
- A draft is attached silently: a draft is used only when the member selects it in the picker, where it carries the tag "Draft". Mockup note 4.
- Stored sources are rewritten later: the database sets them once, for the answer's own chat only.
- The picker traps the keyboard: Escape closes it and returns the focus; Tab stays inside; the search box has the focus on opening.
- Typed words are lost when a list opens or closes: lists and the picker redraw around the message box, which keeps its text.

## Settings and switches it uses
No new switch or setting. Existing: dela_workspace_v2, ask_dela_workspace, automate_delegate, flex_gigs, client_details_allowed, ai.chat_context_documents.

## Questions, and how Claude answered them (acceleration mode)
1. The mockup's answer is a structured list with sources. Build the look only, or real sources? **Real ones, checked in code.** A source tag that is only decoration would be a false statement on a lawyer's screen.
2. When does the task list show? **When the member asks about handing work off and a selected playbook's steps were sent.** Other answers show the source bar and plain text.
3. The mockup's privacy line says "Avoid entering client names or confidential case details". **Stacey's rule stays** (her answer of the same day): the line follows the switch client_details_allowed.
4. "AI usage: View details" replaces the line with the number of DELA actions left? **Yes in a conversation, as drawn.** The number is still read to screen readers and shown on the page it opens. The first screen keeps the line until she says.
5. The mockup has no "Save to library" and "Delete this chat". **Moved under "Chats & pages", in a part "This chat".**
6. The mockup has no "Suggested next actions" card. **Its three actions are the buttons under the newest answer**, as the mockup draws them, plus "Save as a playbook draft", which the old card offered.
7. "Chats & pages" as a searchable drawer (note 1)? **A search box at the top of the list** filters chats and pages. It stays a list under the button, not a side drawer.
8. "New chat" is filled dark red here and outlined on the first screen. **Both as drawn**: filled once a conversation is open.
9. The message box followed the screen while scrolling. **It now sits under the conversation**, as drawn, and a new answer is scrolled into view. Stacey reported the following box covering content earlier.

## Success looks like
Attorney login, a playbook selected, the question "Which steps could a freelancer do?":
- The answer names the playbook with its version and "View source".
- "Tasks that can be delegated" and "Keep with an attorney" list tasks with "Source: Step N" that match real steps.
- "Conversation context" shows only the selected playbook and "Manage sources".
- "Manage sources" shows at most five recent playbooks and finds any other by name.
- Opening the chat again shows the same sources.

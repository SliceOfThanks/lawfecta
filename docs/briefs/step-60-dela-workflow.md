# Feature brief: the DELA workflow

Step: 60   Spec references: DELA build handoff (docs/handoff/dela-build-handoff/source/DELA_Build_Handoff.md, sections 4, 5, 6 and 21), Stacey's flow diagram of 2026-11-19, steps 45 to 48 and 55 to 59
Status: built in acceleration mode. Stacey 2026-11-19: "please build, test & deploy all items related to the DELA workflow instructions ... i just want to ensure we build the dela workflow properly", with the handoff document ("some things are outdated") and a diagram of seven steps and a loop.

## The workflow, as Stacey drew it
1. Talk to DELA: describe what you need.
2. Clarify: DELA asks what matters.
3. Build the playbook: organize the instructions.
4. Review: check and approve the instructions. Then either save for future use, or go on.
5. Prepare the handoff: choose the work and the recipient.
6. Confirm and do the work: resolve access, scope and blockers.
7. Review the result: accept it or request changes.
Then: improve the playbook for next time, which leads back to step 3.

## What already carried each step
| Step | Where it lives in DELA | Built in |
|---|---|---|
| 1 Talk | Ask DELA opens on a blank chat; earlier chats are kept | Steps 2a, 45 |
| 2 Clarify | One next question with up to three answers to click; DELA says when a named document is not attached | Step 45 |
| 3 Build | "Create a draft from this chat"; the document standard; DELA writes for someone new to the firm | Steps 2d, 45, 55 |
| 4 Review | Quality check, "Can someone new follow this?", suggested edits side by side, approval by the Library administrator | Steps 2d, 47, 55 |
| Save for future use | The Library, with versions | Step 2 |
| 5 Prepare the handoff | Post a New Gig with the steps to hand over, what the freelancer needs, the freelancer preview, and the invitation with its sharing list | Steps 44, 48, 56 to 58 |
| 6 Confirm and do | The proposal and the signed agreement, "Before the work starts", attorney decision points | Steps 6, 57 |
| 7 Review the result | Milestones: accept or request changes | Steps 6, 43 |
| Improve | "Was anything unclear?" from the freelancer, "From people who did the work" on the document, suggested edits | Step 59 |

## What was missing, and is built here
Every step existed, but nothing showed them as one path. A member had to know that a chat becomes a document, a document becomes a gig, a gig becomes an engagement, and an engagement feeds back into the document. Step 60 adds that thread:

- **The path on every document.** A card "The DELA workflow" at the top of a document's page shows the seven steps and the loop back, marks the step the document stands at ("Step 5 of 7: Prepare the handoff"), says in one sentence what is going on, and gives one button for the next action. The same card sits at the top of a gig made from that document.
- **Work in motion on Ask DELA.** A card "Your work, step by step" lists every document the firm has in work, each with its step and its next action. What waits on the attorney comes first: submitted work, things a freelancer still needs, proposals, notes from people who did the work, then drafts.
- **The loop.** When a freelancer leaves a note, the document's path lights "Improve for next time" and offers "Look at 1 note from people who did the work".

It reads facts that already exist (the document's state, its gigs, engagements, milestones, needs and notes). It changes nothing by itself.

## Who
Attorneys and agency owners, and the firm's staff who can open the Library.

## Where
- A document's page in the Library, top.
- A gig's page in Projects, top.
- Ask DELA, right column, under "Suggested next actions".

## How it could go wrong
- The path claims a state that is not true: every state comes from a recorded fact (a status, a count), never from the AI. Saving a draft never shows as approved, and a posted gig never shows as accepted work.
- Another firm's work shows: the list is the caller's own firm only, and asking for another firm's document returns nothing. Tested.
- A Policy or a Playbook (the guidance type) is shown a handoff it cannot have: for those the path ends at "Saved for future use" and says why.
- A document that did not start in a chat: steps 1 and 2 show as "started in the Library", not as missing.
- The list hides a blocker behind a percentage: there is no percentage. Each line says the step and the one thing that waits.

## Settings and switches it uses
The handoff_kit switch (off), with steps 55 to 59. No new setting. Migration 0142 adds one read-only function.

## Questions, and how Claude answered them (acceleration mode)
1. "Playbook" (the diagram) or "document" (Stacey's decision of 2026-11-19, kept that day)? **"Document"**: "Build the document". The diagram's meaning is unchanged. One word to switch if she wants it.
2. One step at a time, or may steps run side by side? **The path shows the furthest open step**, because a document can have a finished job, a running engagement and a new gig draft at once. The sentence under the path says what waits.
3. Is "Save for future use" a step? **It is the state after step 4**, as in the diagram: the path says "Saved for future use" and offers "Prepare a handoff" as the next thing, when needed.
4. Does the handoff document's "assignment without a gig" (internal staff work) belong here? **Not yet.** DELA has no assignment outside gigs. It is the largest open item of the handoff document and needs Stacey's decision (question 1 of the step 45 brief: answered "later").
5. Where does the freelancer see the workflow? **They see their own part**: the work handed to them, what they need, the decision points, and "Was anything unclear?". The seven-step path is the firm's view.
6. A separate page for the workflow? **No.** It rides on the pages people already use, so the next action is always one click from where they are.

## What the handoff document asks for that is still not built
Recorded so nobody thinks the whole document is done:
- Internal assignments with no gig and no payment (section 5 B, 10).
- A label on each consequential claim saying where it comes from: confirmed, from an approved source, inferred, suggested, unknown (section 8).
- A typed response envelope for every AI answer (section 8).
- Step dependencies as their own records, and the check when a prerequisite is left out of a part (section 5 C, 11). Today the part shows what comes just before and after it.
- A decision queue across all work for the attorney (section 6). "Your work, step by step" is the first form of it.
- Integrations with a firm's own systems and JSON export (section 13).
- Autosave of an unsent chat message (section 12).

## Success looks like
Attorney login:
- A draft document shows "The DELA workflow" with "Step 3 of 7: Build the document" and the button "Continue the draft".
- An approved SOP with no gig shows "Saved for future use" and "Prepare a handoff".
- A document with a running engagement shows step 6 and what waits.
- Ask DELA lists the firm's work with a step and a next action on each line.

# Feature brief: assign a part, what the freelancer needs, and the freelancer preview

Steps: 56, 57 and 58 (the second, third and fourth of the five in "the handoff kit")   Spec references: step 4 (Flex Gigs), step 2d (gigs from documents), DELA build handoff mockups 4 and 9
Status: built in acceleration mode. Stacey 2026-11-19: "the entire playbook may not be assigned, just a portion", then "build all five in that order".

## Who
Attorneys and agency owners who post gigs. Freelancers who are invited or hired.

## What
**Step 56, assign a part.** On "Post a New Gig", once a document is chosen, its steps are listed with a tick box each. The attorney unticks the steps the firm keeps. The gig then hands over only the ticked steps. The freelancer sees "You are doing steps 3 and 4 of this document's 6 steps", with one line on what happens just before their part and one on what happens just after. On a draft gig the choice can be changed under "The handoff", "Choose the steps". Once the gig is posted the part is fixed.

**Step 57, what the freelancer needs before starting.** Each gig has a list: access, files, templates and information the freelancer must have to begin. It starts from the document's "Before you start" lines. For each line the attorney says what kind of thing it is and who brings it (the firm or the freelancer). After hiring, the attorney marks each thing "Supplied" or "Not needed". The freelancer sees the list from the invitation onward, and once hired can say "I still need this", or "I have this" for things that are theirs to bring. Both sides see the same list on the engagement, under "Before the work starts".

**Step 58, the freelancer preview.** On the last step before posting, a card shows "Exactly what an invited or hired freelancer gets": their steps, the part line, and the list of what they need. It is built from the very data the freelancer is sent, so the two cannot differ.

## Where
- https://www.lawfecta.co/dela?tab=projects, "Post a New Gig": the tick boxes under "Approved SOP or workflow" on step 1; the card "The handoff" on step 2; the preview card on step 3.
- A posted gig's page: "The handoff", with "Supplied so far".
- The freelancer's gig page: the part line in "The work handed to you", and the card "What you need before you start".
- An engagement, both sides: the section "Before the work starts".

## When
The steps are chosen before posting. The list of needs can be edited until the gig is closed, and marked at any time after.

## Why
Attorneys rarely hand over a whole process. And the most common reason a freelancer cannot start is a missing login, file or template that nobody thought to send. Saying it on the gig, with a state, removes that first lost day.

## How it could go wrong
- A step that belongs to the firm (in a workflow, a step where no freelancer role is responsible) is chosen: it cannot be ticked, and the server refuses it.
- No step is chosen: refused with a plain sentence.
- The freelancer sees more than their part: the freelancer's page, the Word copy of the document and the attorney's decision points all use the chosen steps only.
- The steps change after proposals arrive: not possible; the part is fixed when the gig is posted.
- A password or client information is typed into the list: the client information check runs on every line and note, and the card says to describe how access is given, never the secret itself.
- A freelancer marks the firm's things as supplied: refused. A freelancer who is only invited cannot mark anything.
- The preview differs from the real page: it is the same object, checked by a test that compares the two.
- Older gigs: a gig with no chosen steps hands over what it always did.

## Settings and switches it uses
- handoff_kit switch (off), shared with steps 55 and 59.
- New setting gig.inputs_max (20). Migration 0140.

## Questions, and how Claude answered them (acceleration mode)
1. Can any step be handed over, or only freelancer steps? **In an SOP any step; in a workflow only steps where a freelancer role is responsible**, as today. Steps the attorney decides can be included: they stay "Attorney decides" and the work waits there.
2. Does the freelancer see anything of the steps they are not doing? **Only one line before and one line after**, so they know where their part sits. Nothing else.
3. Can the steps change after posting? **No.** Proposals, the price and the agreement are about that part.
4. Is the list of needs a gate that blocks the work? **No.** It shows states and "Still needed" opens the section on the engagement by itself. Blocking payment or submission on it is a later decision for Stacey.
5. Who can mark what? **The firm marks anything. The hired freelancer can say a thing is still needed, and can mark as supplied only what is theirs to bring.**
6. Does DELA rewrite the gig description when the steps change on a draft? **No.** It tells the attorney to check that the description still fits. At creation the description is written from the chosen steps only.
7. Where does the first list of needs come from? **The document's "Before you start" lines**, which the newcomer check (step 55) helps fill.
8. Notifications when something is marked? **Not yet.** The state shows on the gig and the engagement; a notice to the other side is a small follow-up.

## Success looks like
Attorney login:
- Step 1 of "Post a New Gig" lists the document's steps with tick boxes; a firm step in a workflow is locked.
- With one step unticked, the gig's "The handoff" card says "Steps ... of the document's N steps."
- "Add something" and "Save the list" keep a line as "Still needed".
- Step 3 shows "Exactly what an invited or hired freelancer gets".
Freelancer login:
- The gig shows the part line and "What you need before you start".
- Once hired, "I still need this" changes a line's state for both sides.

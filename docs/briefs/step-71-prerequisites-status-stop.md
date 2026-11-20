# Feature brief: prerequisites, the status facts, and Stop in the chat

Step: 71   Spec references: the Lapt workflow handoff of 2026-11-19 (sections 8, 9 screens 2, 3 and 8, 11, 12), steps 56 to 60
Status: built in acceleration mode. Stacey 2026-11-20: "Yes, build them" to the three gaps Claude named after evaluating that handoff.

## Who
Attorneys handing over part of a document, the freelancers who get that part, and everyone who uses Ask DELA.

## What
1. **Prerequisites in a partial handoff.** When the attorney hands over a step and keeps the step right before it, the freelancer's work builds on something the firm produces. DELA now says so on the handoff card ("Step 3 builds on step 2, which you keep.") and adds "Result of step 2, which the firm keeps: ..." to "What the freelancer needs before starting", supplied by the firm. The attorney marks it "Supplied" when it is ready, or hands step 2 over too with one button. If the steps change, DELA takes away the lines that no longer apply.
2. **Separate status facts.** The workflow card states each fact on its own line of tags, under the seven steps: the instructions (draft, in review, approved), the gig (draft, posted, proposals), each signature, whether the freelancer is still starting a subscription, how many needed things are still open, whether the first milestone is paid, and how the work stands.
3. **Stop, and the kept message.** While DELA is answering, a "Stop" button sits beside "Sending...". It stops the wait and puts the message back in the box. A message that was typed and not sent is kept in the browser, so leaving the page or a lost connection does not lose it.

## Where
- Post a New Gig and a gig's page, the card "The handoff", under "Steps handed over".
- The card "The DELA workflow" on a document and on a gig.
- Ask DELA, the message box.

## Why
A freelancer who gets steps 3 and 4 cannot start if nobody gives them what step 2 produces, and nobody was told to. One step name ("Confirm and do the work") hid whether the hold-up was a signature, a missing login or a payment. And a long answer that was going the wrong way could not be stopped.

## How it could go wrong
- DELA deletes something the attorney wrote: it only removes lines it added itself, and only while they are still marked "needed".
- The same prerequisite is added twice: saving the same steps twice adds nothing. Tested.
- A status tag claims something untrue: every tag is read from a record (a signature, a payment, a count), never from the AI.
- Stop is taken for "nothing happened": the note says the answer may still be saved and count as one DELA action, and that sending the same message again picks it up.
- The kept message shows on someone else's computer: it is kept in that browser only, per side, and cleared when the message is sent or the box is emptied.

## Settings and switches it uses
The handoff_kit switch for parts 1 and 2 (they sit on its cards). Part 3 has no switch. Migration 0152.

## Questions, and how Claude answered them (acceleration mode)
1. Which steps count as prerequisites? **The step right before each run of handed-over steps**, when the firm keeps it. Declaring other dependencies by hand is not built.
2. Block the freelancer until the prerequisite is supplied? **No.** It shows as "Still needed" on their page and on the attorney's path; the two of them decide. A hard block would stop independent work too.
3. One "Ready" badge, or the facts? **The facts**, as the handoff document asks.
4. Does Stop cancel the AI call on the server? **No.** It stops the wait in the browser. Cancelling a call that is half done would need a different way of sending answers.
5. Where is the unsent message kept? **In the browser**, not on the server, so nothing unsent leaves the member's computer.

## What is not built
Dependencies between steps that are not next to each other; a decision queue across all work; scope changes after signing; source labels on each instruction.

## Success looks like
- Unticking step 1 of a document on the handoff card shows "Step 2 builds on step 1, which you keep." and a new line in "What the freelancer needs before starting".
- The workflow card shows tags such as "Instructions: approved", "Your signature: signed", "What they need: 1 of 3 still open".
- Typing in Ask DELA, leaving the page and coming back shows the text again.

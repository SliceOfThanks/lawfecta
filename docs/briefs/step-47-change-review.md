# Feature brief: change review, now and proposed side by side

Step: 47   Spec references: Stacey's build handoff v1.0, section 6 (screen 4, change review) and mockup 7; the gap map's step E
Status: built in acceleration mode (Stacey 2026-11-19). Claude answered the questions below; Stacey reviews them after release

## Who
Library editors and the administrator of a firm or an agency, on documents of the document standard (SOP, Workflow, Playbook, Policy).

## What
Before this step, a suggested edit on a document showed only its note ("Add a welcome email step") with "Accept" and "Reject". The person had to trust the note. Done looks like: each suggestion lists the parts it changes, with the wording now and the wording proposed side by side, each changed line marked in words, and one sentence on what accepting does.

## Where
Library, a document, the tab "Suggested edits (N)".

## When
Whenever a suggestion waits: from DELA in the document's chat, from the ChatGPT and Claude connector, or from a comment with suggested text.

## Why
The handoff asks that a change made through chat arrives as a reviewable proposal showing before and after, and that applying it is never mistaken for approval.

## How it could go wrong
- The draft moved on after the suggestion was made: the comparison is against the draft as it is now, and the server already refuses to accept a stale suggestion.
- A long document: only the parts that change are listed.
- Color-blind readers and screen readers: lines are marked "New", "Changed" or "Removed" in words.
- A narrow screen: the two columns sit one under the other.
- A suggestion that removes an attorney decision: unchanged, only the administrator can accept, and the line shows as removed.

## Settings and switches it uses
None new. It follows the document standard switch.

## Questions, and how Claude answered them (acceleration mode)
1. Compare with the approved version or with the current draft? **The current draft**, because accepting changes the draft.
2. Show the whole document or only what changes? **Only the parts that change.**
3. Add "Request approval" on this screen, as in mockup 7? **No.** Sending for review and approving stay on the document's own buttons, so there is one place for each.
4. The mockup's "Impact review" box: **one sentence** above the list says what accepting does, that the approved version stays in use, and that posted gigs keep their version. A list of affected gigs is a later step.
5. The mockup's pink "after" column: **grey**, per the no-pink-backgrounds rule.
6. Older documents (not on the document standard): **left as they are**; they already list what a suggestion changes.

## Success looks like
- A suggestion from the document's chat shows "Now, in the draft" beside "Proposed" for each changed part.
- New, changed and removed lines are marked in words.
- The screen says accepting saves a draft version and approves nothing.
- "Reject" leaves the draft as it was.

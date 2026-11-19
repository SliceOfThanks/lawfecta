# Feature brief: the sharing review before an invitation

Step: 48   Spec references: Stacey's build handoff v1.0, section 6 (screen 5, handoff preparation), section 13 ("do not represent a link as a granted permission") and mockup 8; the gap map's step F
Status: built in acceleration mode (Stacey 2026-11-19). Claude answered the questions below; Stacey reviews them after release

## Who
Attorneys and agencies that hire, on every plan, when they invite a freelancer to a gig.

## What
The page "Invite NAME to submit a proposal" said the freelancer sees "the public version of your gig". That was incomplete. An invited freelancer can also open the gig's steps from the firm's document (watermarked with their name) and the files attached to the gig, while the gig is open and the invitation stands. Done looks like: before sending, the page lists exactly what will be shared and what will not, each line in words, and says an invitation opens none of the firm's own systems.

## Where
Talent, a freelancer, "Invite to gig" (the page with the three cards "1. Select an existing gig", "2. Review the gig", "3. Invite to submit a proposal"). The list sits in card 2, under the gig's facts.

## When
Each time an invitation is prepared. The list is read from the chosen gig at that moment.

## Why
The handoff asks that the sender reviews recipient, information and permissions before an invitation goes out, and that a shared link is never taken for access. The platform already shared more than the page said.

## How it could go wrong
- A file was attached to the gig that should not go out: the list names the files, and says where to take one off before sending.
- The attorney believes inviting gives system access: one sentence says it does not.
- A message with client information: the question is now asked on the page with two buttons, not in a browser pop-up.
- The gig closed in the meantime: unchanged, the page already says so and sends nothing.

## Settings and switches it uses
None. It follows the gig and Talent switches.

## Questions, and how Claude answered them (acceleration mode)
1. A separate "Review before sending" click, as in mockup 8? **No.** This page is already the review: nothing is sent until its one button. A second step would add a click with nothing new to read.
2. Direct invitation with "Accept scope"? **Not here.** Stacey's answer on step 45: it sits beside proposals and arrives with assignments. This step improves the invitation that exists.
3. Should inviting stop sharing the document's steps and the gig's files until a proposal is chosen? **Not changed.** That is a change to what freelancers need to price the work. The page now says what happens; whether to narrow it is Stacey's call.
4. "Save prepared draft" from the mockup: **left out.** The chosen gig and the message are kept while the page is open.
5. The pop-up that asked about client information in the message: **replaced with a question on the page**, so agents and screen readers can answer it.

## Success looks like
- The list shows seven lines, each tagged "Shared", "Shared if you write one", "Nothing to share" or "Not shared".
- The files line names the attached files, or says none are attached.
- The sentence about the firm's own systems is there.
- Sending still takes one click on "Send invitation to submit a proposal".

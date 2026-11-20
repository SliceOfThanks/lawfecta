# Feature brief: learning from each job

Step: 59 (the last of the five in "the handoff kit")   Spec references: step 7 (reviews), step 2 (suggested edits), step 55 (the newcomer check)
Status: built in acceleration mode. Stacey 2026-11-19: "build all five in that order".

## Who
Freelancers on an engagement that started from a document. The firm's editors and administrator, on that document.

## What
On the engagement, the freelancer has a section "Was anything unclear?". They choose what it is about (the whole task, or one of the steps handed to them), write what the document did not make clear or what would have helped, and choose "Send to the firm". They can send more than one note, and they see what they sent.

On the document's page the firm sees a card, "From people who did the work", with each note: the step, the words, who sent it, when, on which gig and for which version. An editor can choose "✦ Ask DELA to suggest an edit", which opens the document's Chat with a request already written from the note, so DELA proposes a change on the "Suggested edits" tab as usual. Or they choose "Mark as looked at".

## Where
- An engagement, freelancer side: the section "Was anything unclear?".
- The Library, a document's page: the card "From people who did the work", under "Can someone new follow this?".

## When
From the moment the agreement is signed, during the work and after it is completed.

## Why
The person who just did the work from the page knows exactly where the page failed. A review tells the firm how the freelancer did. This tells the firm how the document did, so the next person has an easier time. It is how the documents get better with every job.

## How it could go wrong
- A freelancer uses it to complain in public: it is private. Only the firm sees it, it has no rating, and it is not a review.
- Client information in a note: the client information check runs on every note before it is saved.
- A note changes the document by itself: it cannot. It only becomes a suggested edit when an editor asks DELA, and a suggested edit changes nothing until someone accepts it. A change that removes an attorney decision still needs the administrator.
- Someone who was not on the engagement sends a note: refused. The document and its version come from the gig, never from what the sender says.
- A flood of notes: a limit per freelancer per engagement, as a setting.
- Another firm reads or handles the notes: refused.

## Settings and switches it uses
- handoff_kit switch (off), shared with steps 55 to 58.
- New setting documents.feedback_max (20). Migration 0141.

## Questions, and how Claude answered them (acceleration mode)
1. Public or private? **Private, to the firm only.** A public note would be a second review and people would hold back.
2. Does the firm see who sent it? **Yes**, with the gig and the date, so it can ask a follow-up in the engagement's messages.
3. Only at the end, or during the work? **Any time after signing.** The moment of confusion is the best moment to write it down.
4. Does a note become a suggested edit by itself? **No.** An editor asks DELA with one click, reads the suggestion and accepts or rejects it, as with every other change.
5. Should the firm be notified of a new note? **Not yet.** The card and its count show on the document. A notice is a small follow-up.
6. May the attorney send notes too? **No**, the attorney edits the document directly.

## Success looks like
Freelancer login:
- On a signed engagement, "Was anything unclear?" with the step list of their own part.
- A note of two letters is refused; a real note is sent and listed under "What you sent".
Attorney login:
- The document shows "From people who did the work" with "1 to look at".
- "✦ Ask DELA to suggest an edit" opens Chat with the request written.
- "Mark as looked at" clears the count.

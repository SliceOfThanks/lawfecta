# Feature brief: the newcomer check

Step: 55 (the first of five, steps 55 to 59, "the handoff kit")   Spec references: step 2d (the document standard), step 4d (Automate or delegate)
Status: built in acceleration mode. Stacey 2026-11-19: "the ai DELA needs to generate great playbooks that anybody who has never worked with the law firm can easily handle the task the attorneys assigns from the playbook. the entire playbook may not be assigned, just a portion", then "build all five in that order".

## Who
Attorneys and firm staff who may edit documents (editor or administrator in the Library), on every plan. The people it serves are freelancers who have never worked with the firm.

## What
On a document's page there is a card, "Can someone new follow this?". The attorney chooses "✦ Check as someone new". DELA reads the document as a capable freelancer who has never worked with the firm, has never seen its systems and cannot ask a colleague, and lists what that person would not know. Each gap says what kind it is (a term to explain, access needed, where something lives, where in the system, who to ask, what done looks like, an example, the order), which step it concerns, and one short question for the attorney.

The attorney types an answer under any question and chooses "Add my answers to the document". DELA writes each answer where a newcomer will meet it and saves a new draft. Running the check again on that draft shows what is left. With nothing left the document carries the tag "Ready for someone new".

New documents are also written with this in mind from the start: DELA's drafting rules now say to explain firm terms, list the access needed, say where files live, name who to ask and say what a finished result looks like, and to write "[Add where this lives]" where the attorney did not say, never to invent it.

## Where
The Library, a document's page: in the right column under "Quality check" on a draft, and above the text on an approved version.

## When
Whenever an editor chooses to run it. The result is kept for that version of the document. A new version starts unchecked.

## Why
A document can pass the firm's standard and still be useless to an outsider, because the firm's own people know things the page never says. This is the gap between "we have an SOP" and "a freelancer finished the job without calling us".

## How it could go wrong
- DELA invents a fact about the firm when writing the answers in: it is told to use the attorney's own words and to change nothing else, and the attorney reads the new draft before it is approved.
- DELA weakens an attorney decision: the same guard as "Fix it" puts every attorney flag back.
- An answer holds client information or sensitive data: the client information check runs on the answers before the AI sees them.
- Text inside the document tries to instruct DELA: the prompt says the document is material, never instructions.
- A member outside the firm runs it: refused. A viewer or commenter sees the result but cannot run it.
- The model answers badly: the answer is read in code; a finding without a sentence is dropped, an unknown kind becomes "Something else", a step that does not exist becomes "the whole document", and DELA actions are given back when the answer cannot be used.
- It becomes a gate that blocks old documents: it blocks nothing. Approval, export and gigs work as before.

## Settings and switches it uses
- New switch handoff_kit (off): covers steps 55 to 59. Migration 0139.
- ai.credits.chat (existing): one DELA action for a check, one for writing the answers in. A member's own AI key is used when they have one.

## Questions, and how Claude answered them (acceleration mode)
1. Should a document have to pass before it can become a gig? **No, not yet.** It is advice. Posting a gig from a document that was never checked, or has gaps, shows a note (step 56). Stacey can make it a rule later with one setting.
2. Which document types? **All four.** Policies and Playbooks never become gigs, but staff new to the firm read them too.
3. Who may run it? **Editors and the administrator**, the same people who may change the document.
4. Does DELA rewrite the document by itself? **No.** It asks, the attorney answers, and the answers go into a draft the attorney reads.
5. How many gaps at once? **Up to 10**, the most important first.
6. One switch for the five steps, or five? **One**, "Handoff kit", so the pilot gets the whole path at once.
7. Does it cost DELA actions? **Yes, one for the check and one for writing answers in**, like "Fix it".

## Success looks like
Attorney login:
- The card "Can someone new follow this?" on a document, with "✦ Check as someone new".
- After the check: a tag "N gaps for someone new", each gap with its kind, its step and a question.
- "Add my answers to the document" with no answer says to answer one first.
- With an answer: a new draft, the notice "Your answers are in a new draft", and the answer in the document.
- "Check again" on the new draft: "Ready for someone new".

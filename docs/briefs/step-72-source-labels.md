# Feature brief: where each step comes from

Step: 72   Spec references: the Lapt workflow handoff of 2026-11-19 (section 10, "Distinguish facts from proposed methods"), the document standard (step 2d), DELA build handoff section 8
Status: built in acceleration mode. Stacey 2026-11-20: "Yes, build it" to source labels on playbook instructions.

## Who
Attorneys and the firm's editors, when they read and approve what DELA drafted.

## What
Each step of an SOP or Workflow can carry one of four labels:
- **Confirmed by the firm**: the firm stated it or confirmed it.
- **From a file or an approved document**: it comes from material the firm attached or already approved.
- **DELA's suggestion**: DELA's own idea of how to do it. Nobody at the firm stated it.
- **Not known yet**: DELA could not tell and left a placeholder or "Check this".

DELA sets the label when it drafts or changes a document. A step still holding a placeholder is "Not known yet" whatever DELA claimed. On the document page each step shows its label as a tag, and a note above the steps counts the suggestions and the unknowns. Changing a suggested step's words confirms it; so does choosing "Confirmed by the firm" on the step, or the button "Confirm all N suggestions". A step added by hand is the firm's own.

## Where
A document's page in the Library, on every step of an SOP or Workflow: the tag at the top right of the step, the note above the first step, and in the draft the list "Where this step comes from".

## Why
A draft reads the same whether the attorney said a thing or DELA guessed it. The attorney approves the whole page and DELA's guess becomes the firm's procedure without anyone having decided it.

## How it could go wrong
- DELA labels its own guess as stated: a rule in its instructions says a step nobody stated is a suggestion, and code overrides any label on a step with an open placeholder. The label is a help for the reader, not a guarantee; approval is still the firm's act.
- Labels clutter the freelancer's page: freelancers do not see them.
- Old documents look wrong: a step written before today has no label and shows none. Nothing is added to it.
- A label blocks approval: it does not. The note counts; the firm decides.

## Settings and switches it uses
None. No migration: the label lives in the document's own text.

## Questions, and how Claude answered them (acceleration mode)
1. A label per sentence or per step? **Per step.** It is the unit the firm edits and approves.
2. Should unconfirmed suggestions block approval? **No.** They are counted above the steps. Blocking would make every draft unapprovable until each step was clicked.
3. Labels on Policies and Playbooks (the guidance types)? **Not yet.** They have no steps; their parts would need their own design.
4. Does the freelancer see the labels? **No.** They work from the approved text.
5. Does editing a step confirm it? **Yes**, and the choice can be set back by hand.

## What is not built
Labels on purpose, scope, timing and the other parts; a link from a "from a file" step to the file; labels in Ask DELA's own answers.

## Success looks like
- A draft DELA wrote shows tags on its steps and a note such as "3 steps are DELA's own suggestion that nobody at the firm has confirmed."
- Editing one of them turns its tag to "Confirmed by the firm".
- "Confirm all 3 suggestions" turns them all.

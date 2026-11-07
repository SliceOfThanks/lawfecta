# DELA Library Redesign Brief (from Stacey, 2026-11-07)

Saved as sent, with the mockup library-plain-language-mockup.webp in this folder. Claude's plan for building it, the
mapping to DELA's data and the open questions are in docs/briefs/step-8b-ux-retest.md, "Part B (revised)".

## Objective
Reimagine the Library so a busy attorney can quickly find a procedure, understand its purpose, and know what to do next.
The current page requires users to interpret internal category codes, document terminology, and administrative metadata. Better alignment alone has not solved the readability problem.

## Design direction
Build a calm, plain-language document workspace. Make procedure names the main focus. Present supporting details when users open a document.
The default view should answer three questions:
1. What does this procedure help me do?
2. Is it ready to use?
3. What action should I take?

## Page structure
Heading: Library. Subtitle: "Your firm's processes and policies, all in one place."
Place a prominent "Find a document" search field immediately below the heading.
Use "Create a document" as the primary action and "Import" as the secondary action. Move team administration and recordings into secondary navigation.
Organize the collection using familiar categories: Client intake, Client onboarding, Documents and filing, Billing, Firm administration.
Remove prefixes such as INT, ENG and DOC from category headings.

## Document presentation
Replace the default six-column table with readable, compact cards. Each card: a recognizable task title, one short sentence explaining its purpose, a clear status, one primary action.
Example: Check for conflicts / Check for conflicts before accepting a new client. / Ready to use / Open document.
Example: New-client onboarding / Review the imported steps before using this process. / Needs your review / Review imported document.
Use short display titles without silently changing the approved document's content.

## Plain-language states
- Ready to use: the firm has approved the working version. Main action: Open document.
- Draft: the document is unfinished or awaiting approval. Main action: Continue draft.
- Needs your review: a specific review task requires attention. Main action: Review document.
"Ready to use" must not imply that DELA guarantees legal correctness.
Keep optional quality advice separate from required review work. An approved document should not appear unusable simply because it has wording suggestions.

## Details inside the document
Move out of the default browsing view: document ID, document type, owner, version and approval history, routine review schedule.
Keep genuinely overdue reviews or required approvals visible as actionable warnings.
Retain internal IDs for references and search. Users should not need to learn them to browse the Library.

## Review actions
Every review label must describe its destination accurately. Distinct terms: Quality notes (findings about completeness or clarity); Suggested edits (proposed changes awaiting acceptance); Required review (work needed before approval or continued use).
Clicking a count must open the exact items it describes.

## Desktop and mobile
Desktop: a spacious two-column card layout. Mobile: a single column of compact cards with the same information order.
Preserve the user's search, filters and scroll position when returning from a document.

## Creation and AI assistance
Do not require users to understand SOP, Workflow, Policy and Playbook before creating something. Start with: "What would you like to document?" Then suggest an appropriate structure with a short explanation.
Offer a secondary AI action: "Help me create a document." Show an editable draft and require explicit approval before it becomes the working version. Place a client-information reminder beside the writing area.

## Visual requirements
Lawfecta's brand, readable typography, rounded cards, restrained blue and maroon accents, clear spacing. Titles strongest; status labels consistent; secondary information readable without equal weight.

## Acceptance criteria
- Category codes and document IDs are absent from default browsing.
- Users can find a conflict-check process without understanding internal terminology.
- Every card communicates purpose, status and a clear next action.
- Required reviews and optional advice are distinguishable.
- Review counts match their destinations.
- Search supports both plain-language titles and existing IDs.
- Phone cards remain compact and readable.
- Important warnings remain visible.
- The revised design has been reviewed with the product owner before implementation is considered complete.

## Deliverable
Desktop and mobile designs, interaction notes, and the mapping from existing document data to the new presentation. An information and interaction redesign, not a cosmetic update to the existing table.

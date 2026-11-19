# Feature brief: Ask DELA as a chat-first workspace (Phase 1 of the DELA build handoff)

Step: 45   Spec references: Stacey's "DELA: Product, UX, AI and Engineering Handoff" v1.0 (2026-11-16), sections 4 to 8 and 19 (Phase 1), mockup 1; the gap map, docs/handoff/dela-build-handoff/GAP-MAP.md
Status: questions answered by Stacey 2026-11-19; approved to build after the foundation fixes

## Who
Attorneys and their firm staff on every attorney plan, and agencies that hire. Freelancers keep Ask DELA as it is today, with the next question and its choices (part 3 below) but without documents to choose, because a freelancer has no Library.

## What
The handoff's Phase 1 is "chat and reusable drafts". DELA already has the chat (Ask DELA), the drafts (the Library, with versions, a quality check, suggested edits and approval) and the saving. What it does not have is the connection between them. Today a member can talk a process through with DELA and then has to start again in the Library, and DELA in a chat knows nothing of the firm's own approved documents.

Done looks like: a member starts in a blank chat, describes work in their own words, is asked one useful question at a time, sees which of the firm's documents DELA is using, turns the chat into a draft document with one button, and can go from the draft back to the chat and from the chat to the draft. Nothing is approved, posted or sent by any of it.

## Where
Ask DELA (https://www.lawfecta.co/dela?tab=delegate for attorneys, ?tab=ask for freelancers). The document page in the Library gains one line that names the chat it came from. Code: chatView() in app/dela-app.js; aiSend() and the chat routes in supabase/functions/api/app.ts; one additive migration.

The global menu does not change.

## When
Any time a member opens Ask DELA. Chats nobody saved are still deleted after 90 days with a notice 7 days before; a chat that produced a document is kept as long as the document is.

## Why
Stacey's handoff makes chat the starting point for all work and asks that a new chat never lose earlier work. The gap map shows chat first is built as a page but not as a path: the chat leads nowhere. Closing that is the smallest change that makes the handoff's first journey ("Create a reusable playbook", journey A) work from end to end, and every later phase stands on it.

## What the platform really does today (checked in the code, 2026-11-19)
1. Ask DELA stores every chat and message. A new chat is a new record; earlier chats are listed (the 50 newest).
2. Ask DELA answers in plain text. It sends the model the member's own profile, the last 20 messages and up to 5 attached files. It does not send Library documents or the firm profile for documents.
3. Drafting a document is a separate flow that starts in the Library ("New document") or from the connector. It asks up to 5 questions and saves a draft the member edits.
4. A chat and a document are not linked in either direction.
5. The client information rule is the one from 2026-11-05: client names and case facts are allowed; SSNs, ID numbers, account numbers, health information, biometric data, and logins and passwords are refused.
6. Every chat message uses DELA actions as set in settings (1 today), or none on a member's own AI key.

## The build
1. **"Create a draft from this chat."** A button in Ask DELA, shown once the chat has something to work from. It opens the existing "New document" flow with the chat as its material, so the type (SOP, Workflow, Playbook or Policy), DELA's questions, the quality check and saving all behave as they do today. The draft is linked to the chat. The document page says "Started from the chat: TITLE" with a link; the chat shows "Drafts from this chat" with a link to each. One chat can lead to several drafts.
2. **Working context.** A panel beside the chat, "What DELA is using", with:
   - the firm profile for documents (a line that says it is used, with a link to edit it), or "No firm profile yet";
   - "Documents": the approved documents the member chose for this chat, each with its type and version. "Add a document" opens a list of the approved documents the member may read. Nothing is chosen for the member.
   - attached files, as today.
   The server reads each chosen document again at every message, with the member's rights at that moment. A document the member can no longer read drops out and the panel says so. The page never says a document was read when it was only named in a message.
3. **One next question, with choices.** DELA may end an answer with one question and up to three short choices. The server checks the answer's shape and drops anything else. A choice button puts its words in the message box; the member sends it. DELA is told to ask only a question whose answer changes the outcome, scope, authority, an input that is needed first, or how done is judged.
4. **"Suggested next actions"** under the working context, each a link to a page that exists: "Create a draft from this chat", "Review delegation opportunities" (an approved document's "✦ Automate or delegate"), "Prepare a gig draft" ("Post a New Gig"). An action shows only when it can work (for example, the gig link only with an approved SOP or Workflow chosen).
5. **"+ New chat" stays secondary** (an outlined button at the top right) and says in a line under the list that earlier chats and drafts are kept.
6. **Wording.** The page opens with "What would you like to get off your plate?" and "Describe the work or what keeps going wrong. We'll work through it together.", from the handoff.

Not in this step, so nobody expects them: firm rules for the AI (mockup 5), partial delegation with inputs and blockers (4), the recipient preview and direct invitation (8, 9), the decision queue (10), labels that say where each statement came from, internal staff assignments, outside integrations. The gap map's section 7 gives each its own step.

## Decisions Claude made (Stacey can change any)
1. A chosen document is sent to the model as material, with the same line files get today: it is never an instruction.
2. At most 3 documents per chat at first, so answers stay fast and the cost per message is known. The number is a setting.
3. Sending documents makes a message longer. The DELA actions per message stay as set today; if Stacey wants a message with documents to cost more, that is a setting too, shown before sending.
4. The chat's draft button is shown to people who may create documents (Library editors and the administrator). Others see why it is not there.
5. A chat with a linked draft is treated as saved, so the 90-day rule does not delete it.
6. Everything ships behind one switch, off until Stacey turns it on, as for every new feature.

## How it could go wrong
- A document is chosen, then the member loses the right to read it, or it is archived: it drops out at the next message and the panel says so.
- A chosen document has a newer approved version: the panel shows the version in use and offers the newer one. It never switches silently.
- Text inside a chosen document or file tries to give DELA orders ("ignore your rules"): DELA treats it as material. A test plants exactly this.
- DELA's answer comes back in a broken shape: the member sees the plain text, no buttons, and is not charged twice on "Try again".
- Two clicks on "Create a draft from this chat": one draft, as with every create today.
- The Library is full on the member's plan: the button says so and links to Subscription.
- A commenter or viewer tries the route directly: refused before the AI runs.
- Client information in the chat: today's check, unchanged.
- The connection drops mid answer: the message is kept, "Try again" reuses the stored answer if there is one.
- A freelancer or a member with no Library opens Ask DELA: no documents panel, the rest works.
- Phone: the context panel folds under the chat; what was typed stays when switching.

## Settings and switches it uses
New switch: ask_dela_workspace (off). New settings: ai.chat_context_documents (3), with its label and note. Existing: ai_generation, playbook_library, document_standard, ai.credits.chat, ai.chat_history, ai.context_chars, client_details_allowed, the retention settings. No price, fee or limit is written into code.

## Questions to make it better
The first six decide the handoff as a whole. Seven to ten decide this step.

1. Internal staff work with no gig and no payment (an office manager, IT, marketing): in the plan, out, or later? It is a new kind of record and needs firm roles.
2. Mockups 8 and 9 invite a named person who clicks "Accept scope". Should that replace proposals and agreements, sit beside them, or wait? Claude suggests it waits: the sharing review of mockup 8 can be added to the invitation that exists.
3. Do documents stay in the Library, or move under Ask DELA as "My playbooks" (mockup 2)? Claude suggests they stay, with a link from Ask DELA.
4. Which client information rule applies: yours of 2026-11-05 (client names and case facts allowed, six sensitive kinds refused), or the handoff's (non-confidential material only)? Claude suggests yours, since it is built and tested.
5. One word everywhere for members: "document" (today, with the four types SOP, Workflow, Playbook, Policy) or "playbook" (the handoff)?
6. The main button: burgundy (your last three briefs and these mockups) or blue (the handoff's section 14)?
7. In a chat's working context, may DELA use approved documents only, or drafts too? Claude suggests approved only, so an unapproved rule is never treated as the firm's.
8. Does Ask DELA get its own second menu as in mockup 1, or stay one page with the chat, the earlier chats and the context panel? Claude suggests one page: two menus are hard on a phone.
9. Who may approve a document: the Library administrator, as today, or a named approver per document? The second is its own step.
10. The gap map's section 6 lists six defects found in the AI code. Fix all six first, as their own step before this one? Claude suggests yes: two of them cost members DELA actions for nothing.

## Recommendations received 2026-11-19 (pasted by Stacey; written by the author of the build handoff)
Stacey pasted these the same day, without words of her own. They are recorded as recommendations. Three of them change decisions she made herself (5, 6 and 9), so the build waits for her own yes on those.

| # | Recommendation | What it means for the build | Changes an earlier decision of hers? |
|---|---|---|---|
| 1 | Internal staff with no gig or payment: in scope, in phases. Phase 1 covers preparing and sharing playbooks; execution and tracking come later. No artificial $0 gigs | Nothing new in step 45: firm staff already share the Library through library roles. Internal assignments are a later step | No |
| 2 | Direct invitation with "Accept scope" sits beside proposals and does not replace them. For paid work it stays tied to the engagement's terms and payment. It arrives with assignments, not with the editor | Not in step 45. Matches Claude's suggestion | No |
| 3 | Show "My playbooks" inside Ask DELA; keep one underlying record | A panel in Ask DELA that lists the same Library records. The Library page stays. A navigation change only | No |
| 4 | The handoff does not override the owner's decision. Its author asks for the wording of 2026-11-05. Until reconciled, do not widen what client information DELA takes in | Step 45 keeps the check exactly as it is. The wording is supplied below | No |
| 5 | "Playbook" for the reusable process; "document" for supporting files | A wording change across the Library, Ask DELA, gigs and the connector. Today members see "document", and one of the four types is itself called "Playbook" | **Yes.** Members see "document" since the document standard (step 32); her New Gig brief of 2026-11-18 says "Approved SOP or workflow" |
| 6 | Blue #096DB6 for primary actions; burgundy for accents | Every main button on the site changes color, and the selected states with it. Contrast must be checked in light and dark | **Yes.** Her payment and New Gig briefs of 2026-11-18 set burgundy #8B2146 for the primary action |
| 7 | Approved versions and drafts both, treated differently. Drafts are labeled unapproved and never override an approved version | Step 45's working context takes approved versions, the draft being edited, and drafts an editor explicitly chooses, each labeled | No |
| 8 | One Ask DELA workspace with panels; no second menu. Focused views on a phone | As Claude suggested | No |
| 9 | A named, authorized approver per playbook, defaulting to the firm's configured approver. Library administration alone does not confer approval | A new record of who may approve each playbook, and a change to the approval rule. Its own step, before or with step 45 | **Yes, in effect.** Today the Library administrator approves, and Stacey said on 2026-11-17 "We do not have a manager role" |
| 10 | A separate foundation-fix step is sensible. Fix what touches identity, ownership, permissions, version or status integrity, or data loss first. The author could not classify the six without section 6 | Classification below | No |

### The wording asked for in item 4 (Stacey 2026-11-05, docs/briefs/step-6d-security-sensitive-data.md and CLAUDE.md)
"Sensitive data is never uploaded to DELA, only linked from the firm's own storage. Sensitive data means: SSNs and ITINs, government ID numbers, financial account numbers, health information, biometric data, and logins and passwords. Client names, dates of birth, contact details, case numbers and case facts are normal data, stored only where the security rules allow. Show the notice where people type or upload."

Built on it: files shared on a job are never read by the AI; the six sensitive kinds are refused in what people type; client names and case facts bring a reminder in public text and before both sides have signed (step 9c, 2026-11-07).

### The six defects of the gap map's section 6, classified by the rule in item 10
| # | Defect | Kind | Before Phase 1? |
|---|---|---|---|
| 1 | An unreadable AI answer is still charged a DELA action | Billing integrity | Yes: members pay for nothing |
| 2 | A repeated request runs the model again | Speed and cost to Lawfecta; no member harm | No, can follow |
| 3 | Drafting runs the AI before checking the right to create | Permissions | Yes |
| 4 | The file check passes a file when the AI's answer cannot be read | Data protection | Yes |
| 5 | File text for a draft is checked against the file's own firm, with the side fixed to attorney | Ownership and permissions | Yes |
| 6 | No test for an instruction planted in a file or document; none for accepting a stale suggestion | Missing tests | With Phase 1: step 45 adds documents to the chat, so the planted-instruction test belongs to it |

## Stacey's answers, 2026-11-19
Given in chat, after she read the recommendations above.

1. Internal staff work with no gig: later, in phases. Not in step 45. No artificial $0 gigs.
2. Direct invitation with "Accept scope": beside proposals, never replacing them, tied to the engagement's terms and payment for paid work. It comes with assignments, not now.
3. The Library stays, with one underlying record. Ask DELA shows the same documents in a panel ("My documents", since the word stays "document").
4. Her client information rule of 2026-11-05 stands. Step 45 does not widen what DELA takes in.
5. **"Document" stays.** "Playbook" remains one of the four types.
6. **Burgundy stays** for main buttons. Blue is for information and focus.
7. Approved versions and drafts both, treated differently: a draft is labeled "Draft, not approved" in the context panel and to the model, and never overrides an approved version. A draft is used only when it is the one being edited or an editor chose it.
8. One Ask DELA page with panels. No second menu. Focused views on a phone with a clear way back to the chat.
9. **The Library administrator approves, as today.** A named approver per document is a later step with its own brief.
10. Fix first, as their own step: the defects that touch billing, permissions and data protection (1, 3, 4 and 5 in the table above). Defect 2 can follow. The missing tests come with step 45.

## Success looks like
Checks that must pass on the site before this is open to members. They become the automated tests and one ChatGPT check, grouped by login (freelancer, then attorney).

- A first visit shows a blank chat and no category to choose (the handoff's UX-01).
- "+ New chat" opens a new chat and the earlier one is still listed with its messages (UX-02).
- "Create a draft from this chat" makes one draft; the draft names the chat and the chat lists the draft; going back and forth loses nothing typed (UX-03).
- With no document chosen, DELA does not claim to know the firm's checklist; it says none is attached (AI-02).
- A chosen document that contains an instruction to DELA does not change what DELA does (AI-04).
- A member who cannot read a document cannot add it, by the page or by calling the server directly; another firm's document is never listed.
- Saving a draft from a chat approves nothing, posts nothing and sends nothing (STATE-01).
- A broken AI answer keeps the chat as it was, shows the text, and "Try again" works without a second charge (ERR-01).
- The whole path works by keyboard, with focus in the right place after each step (A11Y-01), and at 320 wide with no sideways scrolling (MOB-01).
- The client information check behaves exactly as before.

# Feature brief: The document standard (Policy, Workflow, SOP, Playbook)

Step: 2d (changes Step 2, the Library and drafting, and the parts of Steps 4, 6 and 2b that use playbooks)
Source of truth: docs/standards/Law_Firm_SOP_Workflow_Playbook_Guide.docx (text copy: docs/standards/law-firm-document-guide.txt) and Stacey's build prompt of 2026-11-05. Where the prompt and the guide disagree, the prompt wins.
Status: Stacey's final decisions recorded 2026-11-05; approved to build.

## The problem
Attorneys who ask an AI for "an intake SOP" get generic, padded documents that do not match how the firm works, do not say who does what, blur attorney-only decisions into staff steps, and give no way to tell whether the process works. DELA collects the right facts first, drafts to a fixed structure, and checks its own output before the attorney sees it.

## Stacey's final decisions (2026-11-05)
1. **Naming.** Every Library item is a "document", with four types: Policy, Workflow, SOP, Playbook. "Document" replaces "playbook" everywhere members read it: the Library, gigs, the connector and the planned marketplace.
   - Existing items are not all turned into SOPs. Each runs through the guide's type check: one clear step-by-step path becomes an SOP; work that moves across several roles and stages becomes a Workflow; options, fallbacks or judgment calls become a Playbook.
   - Each converted item is shown to its owner with the new type and a one-click "Change type". Old IDs and links keep working.
2. **Gigs.** Only SOPs and Workflows can become a Flex Gig.
   - An SOP becomes one gig. A Workflow becomes a gig made of only the steps where the freelancer's role is R (Responsible); the rest stays with the firm.
   - The freelancer sees Purpose, Before you start, Steps, Timing, Quality check and Done when. The milestone check uses Quality check and Done when.
   - Any step flagged "Attorney decides" pauses the gig until the attorney approves that step inside the gig.
   - Policies and Playbooks cannot become gigs. They can be attached to a gig as read-only reference.
3. **Reminder emails.** Each role in the firm profile can be assigned a DELA member or an email address. The 14-day reminder goes to whoever holds the document's owner role, otherwise the firm owner. A bounce is resent to the firm owner. An in-app notice goes too. The firm profile flags any role with no one assigned.
4. **Blocked export.** The block covers every export format, approval, and creating a gig from the document. Drafts can still be saved and shared inside the firm. Every unapproved draft shows a "Draft, not approved" banner, including when shared inside the firm.
5. **Length.** 900 words of body text (not the header block, the RACI table or the change log). Going over does not block export: it adds a quality panel item with a "Split into linked SOPs" button. The export block is only for missing Accountable owners and missing attorney flags.

## Who
- Attorneys and firm owners and managers (every attorney plan), and firm staff who read the Library.
- Freelancers see only the parts of an SOP or Workflow that a gig hands them.
- The Lawfecta Team: the conversion of existing items and its results.

## What
### Part 1: how the AI drafts
- **Four types**, as defined in Section 1 of the guide. If the request fits another type, DELA says so in one sentence and offers a one-click switch.
- **Fixed structure** (labels as bold headings on their own line):
  - SOP, 13 sections: Header, Purpose, Scope, Trigger, Roles, Before you start, Steps, Decision points and escalation, Timing, Quality check, Done when, Related links, Change log.
  - Workflow, 8 sections: Name and process owner, Start and end points, Stages (swimlane: one lane per role), Handoffs, Decision points, Target time per stage, Linked SOPs, KPIs.
  - Playbook, 8 sections: Situations covered, Guiding principles, Preferred approach, Acceptable fallbacks, Hard limits, Escalation, Scripts and templates, Examples.
  - Policy (the guide defines the type but not its sections; Claude's structure, built from Section 1 and Section 3 "policy mixed into steps"): Header, Purpose, Scope, The rules (must and must not), Exceptions and who approves them, Related links, Change log.
- **Writing rules:** numbered steps, one action each, starting with a verb; the attorney's exact system names, menu paths and button labels, never invented ("[Add the menu path in your system]" and a quality panel flag otherwise); plain language a new hire follows on day one, terms defined the first time; an SOP of 900 words or less (split into linked SOPs if longer); never "as needed", "if applicable", "promptly", "timely" or "the usual way" without a specific value; no em dashes; no filler.
- **Legal guardrails (hard rules):**
  - every step needing legal judgment ends with "Attorney decides", and its Accountable role is an attorney role (ABA Model Rule 5.3)
  - real client names, matter facts or client data are replaced with fictional examples, with a notice
  - passwords, logins and account numbers are removed, with the same notice
  - no legal advice; where a step depends on a court rule, statute or filing deadline, a rule link field and a "verify by" date, and never a deadline number from the AI's memory
  - roles, never people's names (names the attorney enters are mapped to roles)
- **RACI:** a table for every Workflow and SOP, one row per step and one column per role (R, A, C, I as in Section 5). Exactly one A per step, or export is blocked. A warning above two C's.
- **KPIs:** 3 to 5 for every Workflow, by the 6-step method in Section 6: name, what it measures, leading or lagging, data source (the exact report or field), owner role, baseline (or "measure for 30 days first"), target, review rhythm. Started from the "Examples by workflow" table and tailored. Never a KPI the firm's listed systems cannot give; otherwise, the field to start logging.
- **Self-check before showing:** required sections, no banned vague words, no client data, no credentials, every judgment step flagged for an attorney, one A per step, length, every rule reference with a link and a review date. DELA fixes what it can and lists the rest in the quality panel.

### Part 2: the attorney's screens
1. **Firm profile** (once, saved, editable): firm size (Solo, 2 to 5, 6 to 20, 21+), practice areas, jurisdictions (states and federal courts), team roles (Attorney, Supervising attorney, Paralegal, Legal assistant, Intake specialist, Billing/bookkeeper, Office manager, Outsourced freelancer, and custom roles), each with a DELA member or an email assigned (unassigned roles flagged), and systems (practice management, document management, calendaring, billing, e-signature, phone/intake, other). Solo firms default to Attorney and Outsourced freelancer, and their RACI has those two columns.
2. **Pick what to build:** the four types as cards with a one-line description and a law firm example, and a starter library in the 7 client lifecycle groups of Section 4.
3. **Process questions** (one screen, 8 fields at most, all skippable but the name): process name, what starts it, what done looks like, roles (from the firm profile), systems (from the firm profile), deadline or time target, steps the attorney must decide or approve, what goes wrong today. Optional upload of a checklist, email or old SOP, scrubbed for client data and credentials first. Skipped fields show as quality panel flags.
4. **Draft and review:** the editable document on the left; the quality panel on the right (each check passed or needs attention, with "Fix it" where DELA can fix it); the RACI grid (click to set R, A, C, I); a KPI card for each KPI with baseline and target; header fields always visible (document ID, version, owner role, last reviewed, next review). Next review defaults to 3 months for trust, conflicts and deadline documents, 12 months for the rest.
5. **Save and export:** document IDs by lifecycle prefix (INT, ENG, MAT, DOC, BIL, CLS, ADM) and a two-digit number; every document in the firm's library with a master index (ID, title, type, owner role, status, next review); Word export (and the other formats); a change log on every save (date, what changed, who approved); an email to the owner role 14 days before the next review.

## Where
- Library tab (attorneys): the master index, "New document" (type cards, starter library, questions), the draft and review screen.
- Profile, Firm details: the firm profile for documents (size, roles and who holds them, systems, jurisdictions).
- Projects: gigs from approved SOPs and Workflows only; reference documents on a gig; attorney decision checkpoints in the engagement.
- Freelancer Work: the parts of the document the gig hands them, and the checkpoints.
- Connector: document tools.
- Admin: conversion results in the AI and files tab.

## When
- The firm profile is asked the first time an attorney creates a document, and can be changed any time.
- The check runs on every draft and every save; the export block is checked again on the server at export, approval and gig creation.
- Reminders 14 days before the next review date, then on the day.

## Why
- Members: documents staff follow and attorneys trust, in minutes, that keep legal judgment with the attorney.
- Lawfecta: a firm's library becomes accurate, delegable work (gigs), the reason attorneys keep using DELA.

## How it could go wrong
- The AI invents a menu path or a deadline: placeholders, rule links with verify-by dates, and checks for both.
- Client data pasted or uploaded: scrubbed before drafting, with a notice.
- A judgment step slips through unflagged: the checker looks for judgment words (decide, approve, accept the matter, advise, sign, file with the court and similar) and treats an unflagged one as blocking until the attorney flags it or marks "not a judgment step".
- Two people approve at once, or a save races an approval: versions and the database's checks of the stored result.
- A converted item loses meaning: the old version is kept, the converted one waits for the owner, and "Change type" re-maps it.
- Gigs posted from a failing document: blocked on the server, not just on screen.

## Settings and switches it uses
- Switches: document_standard (the new drafting, checks and screens), document_conversion (the type check of existing items).
- Settings: documents.max_words (900, C), documents.review_months_high_risk (3, C), playbooks.review_months (12, existing), documents.review_reminder_days (14, C), documents.kpi_min (3) and documents.kpi_max (5) (C), documents.max_consulted (2, C).

## Success looks like
- An attorney goes from the firm profile to an exported Word SOP in under 10 minutes.
- Every exported document passes every check, or shows exactly which failed.
- Export, approval and gig creation are refused while any step lacks an A or a judgment step lacks the attorney flag.
- ChatGPT test, grouped by login: attorney (firm profile, a starter SOP, the quality panel, Fix it, the RACI grid, the block, approve and export, a workflow with KPIs, a gig from a workflow with only the freelancer's steps, a Playbook attached as reference), freelancer (sees only their steps, waits at an attorney checkpoint), owner (conversion results), then "Check the results".

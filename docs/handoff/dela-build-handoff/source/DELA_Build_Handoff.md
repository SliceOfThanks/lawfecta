# DELA — Product, UX, AI and Engineering Handoff

Version: 1.0 · Prepared November 16, 2026  
Product: Lawfecta DELA  
Status: Implementation proposal consolidating this conversation. Not a production audit, legal opinion, or validated usability study.

## 1. Read this first

Build a chat-first delegation workspace for law firms. DELA helps users clarify work, capture or improve a reusable process, and prepare understandable handoffs across legal support, IT, marketing, HR, finance, and operations.

The first interaction MUST be an open conversation. Do not require users to choose a practice area, role, assignment type, or playbook category before chatting. Optional shortcuts can prefill a message; they must not become mandatory routing screens.

The product should reduce the combined effort of the person delegating and the person receiving work. A polished SOP alone is not success. The recipient must understand the result, scope, inputs, authority, exceptions, and acceptance criteria.

### Requirement labels

- **Confirmed direction:** explicitly established through the conversation; preserve unless the product owner changes it.
- **Recommended specification:** engineering or design detail proposed here to make the direction implementable; review during implementation planning.
- **Launch decision:** unresolved item requiring a product/security/business decision before the affected feature ships. It does not block unrelated development.

All architecture, schema, event and interface names below are proposed internal contracts, not claims that existing APIs or database tables already exist.

### Non-negotiable product direction

1. Chat is always the starting point, including when starting anew.
2. New chats preserve previous conversations and drafts in the production design.
3. Support every back-office role; do not hard-code paralegals or attorney approval for all actions.
4. Separate firm context, reusable playbooks, assignments, and execution history.
5. Show confirmed information, proposed instructions, and unresolved decisions distinctly.
6. Let users edit directly or request changes through chat; consequential changes need an explicit reviewable proposal.
7. Support partial delegation with prerequisite and ownership checks.
8. Recipient preview must not let the delegator impersonate recipient acceptance.
9. Saving, approving, inviting, accepting, starting, submitting, and completing are distinct actions.
10. Do not promise accuracy, compliance, time savings, or failure-free operation based on mockups.

## 2. Existing prototype: reuse and limitations

Reference URL: https://dela-handoff-prototype.staceys-9825.chatgpt.site

Local source inspected for this handoff: `/workspace/sites/dela-handoff-prototype/dist/index.html`.

The prototype is a buildless HTML/CSS/JavaScript concept. Its latest chat-first source was inspected; live hosting and production DELA were not independently audited for this document.

| Capability | Prototype evidence | Production requirement |
| --- | --- | --- |
| Chat-first entry | Present; messages receive scripted responses | Real context-aware conversation with bounded actions |
| Draft creation | Opens fixed treatment-chronology content | Generate content from the actual request and approved context |
| Start new | Clears in-memory conversation and draft state | Create a new conversation while preserving previous work |
| Persistence | Page-session variables only | Durable tenant-scoped storage, autosave, recovery |
| Step editor | Checkboxes, text editing, move controls and drag handlers | General dependency model, permissions, version-aware edits |
| Dependencies | Fixed inventory → chronology → source-check order | Support independent work, prerequisites, branches and handoffs |
| Chat changes | Scripted proposal behavior | Structured, source-grounded proposals with field-level diffs |
| Recipient view | Demo acceptance/access toggles in same browser | Read-only delegator preview; authenticated recipient actions |
| Approvals | Boolean demo flags | Authorized, timestamped approval events tied to immutable versions |
| Export | Browser text download | Permission-filtered export from canonical structured content |
| AI/CMS | Simulated | Separately implemented, tested, permissioned services |
| Active work | Demonstrative status flags | Later-phase execution model; no false claim of live tracking |

Do not carry hard-coded names, dates, examples, approval roles, or chronology-specific completion criteria into the general product. Do not treat the prototype as the production architecture.

## 3. Users, jobs and boundaries

### Users

- Firm owner/attorney: explain desired outcomes, set boundaries, delegate and review decisions within their authority.
- Office manager/operations lead: maintain firm processes, coordinate assignments and resolve operational questions.
- Internal specialist: contribute methods and perform assigned work.
- Freelancer/agency member: review proposed scope, confirm availability and access, propose amendments, perform accepted work.
- Approver/process owner: approve a specific process, action, version or output when authorized.
- Firm administrator: manage membership, integration access and policy configuration; this role does not automatically confer every substantive approval authority.

A person may hold several roles. Templates contain role references; assignments resolve those references to authorized people.

### Supported intentions

Users may want to discover what to delegate, record an existing process, design a missing process, improve a process, prepare immediate work, or preserve lessons from execution. Infer intent provisionally and allow correction. Do not force a classification form.

### Out of scope for the first release

Autonomous legal advice; automatic court-deadline calculation; broad autonomous execution; automatically granting access; automatically accepting engagements; payments and dispute resolution; a full replacement for the firm's CMS, HRIS, CRM or project-management system.

Existing Lawfecta commercial policies and marketplace integrations must be verified before reuse. This handoff does not establish fee, payment, matching, contract, or automatic acceptance rules.

## 4. Product information architecture

### Four separate records

| Record | Contains | Boundary |
| --- | --- | --- |
| Firm context | Approved conventions, systems, contacts, sources and policies | An assignment answer does not silently become firm policy |
| Playbook version | Reusable outcomes, roles, steps, decisions and acceptance criteria | No unnecessary client or employee facts; no assigned individuals by default |
| Assignment | Particular scope, people, dates, inputs and approved variations | References the exact playbook version used |
| Execution history | Questions, changes, submissions, checks and acceptance | Events do not silently rewrite the template |

Conversations may produce multiple drafts, and a draft may reference multiple conversations. Preserve explicit links rather than treating the transcript as the authoritative workflow database.

### Navigation

Global: New chat, recent conversations, playbooks, assignments when available, firm context, settings.

Within a draft: Chat, Overview, Process, Recipient preview, Versions/decisions. These are available views, not a compulsory wizard.

Default to the simplest relevant view. Keep the chat and current draft linked. On mobile, switch between conversation and draft without losing unsent input or scroll position.

## 5. Core journeys

### A. Create a reusable playbook

1. User begins a fresh chat with a problem, outcome, narration or example.
2. DELA retrieves only authorized relevant context and identifies consequential gaps.
3. DELA asks a targeted question or proposes a working draft with unresolved fields.
4. User inspects the overview and adjusts instructions directly or through chat.
5. A contributor can propose the operational method when the delegator lacks that expertise.
6. Authorized process owner reviews the version; unresolved blockers remain explicit.
7. Approved version becomes available for reuse. No matter, recipient or live assignment is required.

### B. Prepare immediate work

1. User describes the needed result in chat.
2. DELA drafts a specific assignment and necessary instructions together.
3. User selects or confirms the recipient and scope when relevant.
4. System checks prerequisites, timing, access and required approvals.
5. Recipient receives an invitation only after the sender reviews recipient, information and permissions.
6. Recipient accepts or requests changes. Later execution features may track work.
7. User can optionally preserve a reusable playbook before or after execution.

### C. Delegate only part of a process

Selecting steps triggers a handoff analysis: required upstream outputs, their owners, recipient access, deadlines, downstream recipients and acceptance criteria. Excluded work is not deleted from the parent process. Offer to include a prerequisite, identify who supplies it, or keep the affected work blocked.

### D. Improve a process

Recipient questions, failed handoffs and accepted revisions can suggest changes. DELA produces a proposed version diff. The process owner approves it. Existing assignments retain their accepted version unless an explicit amendment is approved and accepted as required.

## 6. Screen-by-screen specification

### Screen 1 — Conversation entry

Primary content: welcome, blank composer, Send. Secondary: optional prompts, add example, record/narrate when available, visible context summary. New chat is secondary and non-destructive.

Default copy: “What would you like to get off your plate?” Supporting copy: “Describe the work or what keeps going wrong. We’ll work through it together.”

Required behavior: preserve unfinished text; display saving/error state; expose prior drafts; accurately state whether context is attached, connected, accessible or unavailable. Never imply a file was read because its filename was mentioned.

### Screen 2 — Clarification and provisional draft

Use available information before asking again. Ask the next question that changes scope, authority, required inputs or outcome. Offer a working draft without claiming completeness. Include concise source links for consequential firm-specific claims.

A user may keep chatting, open the draft or correct a misunderstanding. Contributor knowledge is welcome; attorney knowledge of every operational method is not presumed.

### Screen 3 — Playbook overview

Display title, version/status, purpose, start trigger, scope, roles, expected output and success criteria. Show prioritized unresolved decisions separately from optional improvements.

Saving a draft remains available. Approval is a different action with explicit authority and prerequisites. Never disable unrelated work because an optional future refinement is absent.

### Screen 4 — Process editor and change review

Each step exposes one accountable owner, instructions, inputs, dependencies, output, completion evidence, exceptions and any approval point. Contributors may be multiple, but accountability must be clear.

Default view is a readable list; expand details on demand. Drag-and-drop is secondary and has keyboard alternatives. Visual order and dependency edges are distinct. Invalid moves explain the affected prerequisite and offer a correction; do not silently rewrite the dependency.

Chat edits generate a before/after proposal identifying affected steps, authority changes, downstream effects and scope of application. Primary action: “Apply to draft.” Applying a proposal is not policy approval or permission to execute.

### Screen 5 — Recipient preview / handoff preparation

Delegator preview is read-only with respect to recipient actions. Show the actual work package filtered by recipient permissions: purpose, selected steps, input locations, examples, timing, limits, escalation contact, output destination and acceptance criteria.

Use “Required inputs” and visibly distinguish available from pending. Present separate statuses for instructions, acceptance, access and prerequisites. “Prepare invitation” opens an editable preview of recipient, message and sharing scope; it does not send immediately.

### Subsequent views

- Recipient review: accept scope/timing, decline, identify blockers, request changes; no self-granted access.
- Decision queue: unanswered questions, blocked work, submissions awaiting the user's authority; do not send all routine questions to the attorney.
- Version comparison: approved/current/proposed versions, source changes and amendment history.
- Template reuse: resolve role references and assignment-specific variables without altering the template.

## 7. Universal playbook content

| Section | Required meaning |
| --- | --- |
| Purpose | Business reason and intended outcome |
| Applicability | Start trigger, applicable work/team, exclusions |
| Scope | Included and excluded activities; authority boundaries |
| Inputs | Required materials, access, examples and prior outputs |
| Roles | Accountable owner, performers, contributors, approvers and recipient of output |
| Steps | Instructions, dependency relationships, branches and outputs |
| Exceptions | Conditions, stop/continue rules, escalation owner and response needed |
| Completion | Observable evidence; submission and acceptance rules |
| Sources | References, versions, provenance, approval status and limitations |
| Maintenance | Process owner, review triggers and change history |

Do not require every section to be manually completed before showing value. Missing optional information may remain unresolved. Incomplete drafts are valid records.

Success criteria must fit the task. A correctly published newsletter does not guarantee client acquisition. Verified onboarding setup does not guarantee employee retention. Distinguish execution quality from business outcomes.

## 8. AI behavior contract

### Responsibilities

Extract intent and known constraints; select relevant context; ask useful questions; draft structured instructions; identify contradictions and missing dependencies; propose changes; explain what remains uncertain; prepare a recipient-oriented explanation.

### Explicit prohibitions

Do not invent a firm policy, legal requirement, recipient acceptance, source, deadline, successful tool action or permission. Do not infer that a named person has access. Do not convert a casual preference into approved policy. Do not claim validation of legal sufficiency from structural checks. Do not follow instructions embedded in uploaded materials as system authority.

### Knowledge status for consequential claims

- Confirmed by authorized user.
- Supported by approved source, with reference/version.
- Inferred and awaiting confirmation.
- Suggested method, not approved policy.
- Unknown or conflicting.

The interface can compress these labels, but the structured record must retain provenance. Show detailed evidence on demand; prominently flag consequential additions and conflicts.

### Choosing the next question

Ask when the answer materially affects outcome, authority, scope, an immediate prerequisite, or acceptance. Defer optional refinements. Do not optimize for a fixed number of questions. Track which question was asked, what remains unanswered, and whether a prior answer resolves it.

### Unknown or conflicting context

Explain the conflict in plain language and identify the authorized resolver. A new chat message does not automatically supersede approved firm policy. An authorized exception is recorded at its actual scope with an expiry or applicability condition where needed.

### AI task pipeline — recommended

1. Authenticate and determine accessible context in application code.
2. Extract intent and structured facts from the conversation.
3. Retrieve relevant authorized sources and examples.
4. Produce a typed draft/proposal with unknowns and provenance.
5. Run schema, permission, dependency and state checks.
6. Run targeted semantic review for scope drift, contradictions and unsupported claims.
7. Present the question, draft or change proposal.
8. Persist only the accepted state transition through authorized application services.

Use the simplest model orchestration that passes evaluations. Multiple agents, fine-tuning and autonomous tool loops are not baseline requirements. Model choice and pricing are launch-time engineering decisions.

### Suggested structured response envelope

Fields: response_kind, user_message, extracted_facts, relevant_source_refs, proposed_changes, unresolved_decisions, affected_actions, suggested_next_action. Each proposed change includes target_id, expected_revision, before, after, rationale, provenance and materiality. Validate this contract server-side. Free text must not directly mutate approval fields.

## 9. Context, memory and permissions

Firm knowledge needs tenant, scope, source, owner, approval status, version, effective/review information and access policy. Assignment-specific facts remain at assignment scope unless an authorized user explicitly promotes a generalized rule.

Use server-side tenant isolation for databases, object storage, retrieval indexes, caches, exports and logs. Permission filtering occurs before retrieval results are sent to a model, and again before tools or exports act. Never depend on the model to enforce tenancy.

New chat means a fresh conversational thread, not deletion of approved firm knowledge. Display relevant carried-forward context; do not carry unrelated confidential facts across tasks.

**Launch decision:** Earlier DELA positioning excluded confidential client information; later integration concepts could introduce client or employee data. Until a permitted-data policy is approved, use nonconfidential process material and fictional examples. Do not activate sensitive document ingestion merely because the UI has an attachment button.

Define retention, deletion, model-provider handling, consent, access revocation and security review before supporting sensitive data. Credential values must use an approved secret mechanism, never chat memory or playbook text.

## 10. State and authorization model

### Playbook versions

Draft → In review → Approved → Superseded or Archived.

Approval records the exact version and approving authority. Changes to an approved version create a new draft. Archiving removes ordinary reuse, not the historical record required by accepted assignments.

### Assignment dimensions

Keep these independent:

- Instruction status: draft / reviewed / approved as applicable.
- Invitation: not prepared / prepared / sent / delivery failed / withdrawn.
- Recipient response: pending / accepted / changes requested / declined.
- Inputs and access: unknown / missing / confirmed / revoked.
- Execution, later phase: not started / active / blocked / submitted / changes requested / accepted / cancelled.

Start eligibility is computed for the affected action. It depends on authorized scope, required approvals, recipient agreement where applicable, input/access availability, timing conditions and unresolved blockers. A pending access approval may block account setup while allowing separately authorized orientation.

### Permission rules

| Actor | May do, subject to granted scope | Must not do implicitly |
| --- | --- | --- |
| Draft author | Create/edit drafts, request review | Approve outside their authority |
| Process approver | Approve exact versions and permitted exceptions | Grant unrelated system access |
| Contributor | Suggest methods, comment, identify gaps | Expand scope unilaterally |
| Recipient | Accept/decline their assignment, confirm their own access, submit work | Accept for another recipient or change firm policy |
| Admin | Manage authorized membership/configuration | Read every restricted personnel or matter record by default |
| AI | Propose and explain | Self-approve, impersonate or claim execution without evidence |

Prototype booleans must be replaced with authoritative server events. A status label is a view of recorded facts, not a model-generated opinion.

## 11. Data model — recommended logical entities

All identifiers below are illustrative schema names. Every tenant-owned object carries tenant_id, created_by, created_at, updated_at and a revision token.

| Entity | Important fields |
| --- | --- |
| Conversation | participants, scope, messages, linked_draft_ids, save_state |
| ContextSource | source_type, source_version, location, content_classification, permissions, approval, review_due |
| FirmRule | statement, applicability, authority, provenance, approved_version |
| Playbook | title, owner_role, applicability, current_approved_version |
| PlaybookVersion | structured_content, parent_version, status, source_refs, approval_record |
| Step | stable_id, owner_role, instructions, inputs, outputs, acceptance_checks |
| Dependency | predecessor, successor, condition, supplied_output |
| Decision | question, affected_actions, blocking_stage, resolver, proposed/confirmed answer |
| ChangeProposal | expected_revision, diff, materiality, affected_versions, status |
| Assignment | playbook_version, selected_step_ids, scoped_overrides, role_bindings, dates/timezone |
| InputRequirement | requirement, supplier, location, availability, recipient_access |
| Invitation/Acceptance | recipient, scope_version, message_preview, delivery/result, response_event |
| Submission/Review | output_refs, submitter, checks, reviewer, revision_requests, acceptance |
| AuditEvent | actor, action, object/version, timestamp, minimal before/after reference |
| IntegrationMapping | provider, external_object_id, local_object_id, sync_version, idempotency_key |

Avoid using a large transcript or Markdown blob as the sole canonical model. Render readable prose from structured content, while preserving user-written explanations and source references.

## 12. Persistence and failure recovery

Recommended behaviors:

- Autosave both messages and drafts; show saving, saved and failed states accurately.
- Preserve unsent input on recoverable navigation and errors.
- Use revision tokens to detect concurrent edits. Show conflicts instead of last-write-wins on consequential fields.
- Preserve the last good draft on model timeout or malformed output. Retry must not duplicate messages or changes.
- A failed source retrieval is not proof that the source does not exist.
- A failed invitation must not appear sent or accepted.
- Retry external writes with idempotency and reconcile uncertain outcomes before repeating them.
- Revoked access immediately affects preview, retrieval, export and future actions.
- Preserve audit history and apply the approved retention/deletion policy; do not promise indefinite retention.

## 13. Integrations and exports

### CMS and other systems

Matter selection is optional for immediate legal assignments and unnecessary for many operational playbooks. Support system references appropriate to the role: CMS, document storage, HRIS, CRM, marketing or IT systems. Verify actual capabilities independently for each connector.

Start with authorized context selection. Add controlled writes only after read behavior and permissions are validated. A write preview identifies destination, objects created/changed, assignees, dates and shared information. Maintain authoritative ownership per field and explicit conflict handling.

Never assume access through the attorney's connection gives the recipient access. Do not represent a link as a granted permission.

### Export

Initial recommended formats: readable Markdown/text and structured JSON. Add PDF/DOCX when user demand and formatting requirements justify them.

Export the intended record: reusable playbook without assignment-specific sensitive details, or recipient-specific handoff with only authorized content. Include version, status, role responsibilities, inputs, sources/links, exceptions and acceptance criteria. Do not export unresolved proposals as approved instructions. Recheck permissions at export time.

## 14. Design system and accessibility targets

Use the existing Lawfecta visual direction: navy #142335 or brand navy #0b1220, blue #096db6 for readable primary actions, light neutral surfaces, restrained berry #8b2146 accents. These are starting tokens; verify contrast in actual components and states.

Recommended accessibility target: WCAG 2.2 AA, subject to implementation testing. Provide semantic labels, keyboard operation, visible focus, correct dialog focus behavior, screen-reader announcements for status, and non-color status cues. Offer move buttons alongside dragging. Use readable body text, adequate touch targets and responsive layouts without horizontal scrolling for primary tasks.

Design notes and berry annotation numbers belong to review mockups, not the production user interface. Use a consistent plain Lawfecta/DELA wordmark; generated mockups introduced inconsistent decorative logos that should not be copied.

One primary action per immediate task. Keep New chat secondary. Do not use green checks for merely defined acceptance criteria. Do not show a global readiness percentage that hides different blockers.

## 15. Reference examples

### Multi-role onboarding

Purpose: confirmed onboarding inputs lead to authorized setup and orientation.

1. Office manager confirms role/start date and required inputs.
2. Authorized approver confirms access profile.
3. IT performs approved setup and records technical verification.
4. Office manager completes orientation and records outstanding items.

Each step has one accountable owner; collaborators remain explicit. Proposed exception: orientation may continue while access approval is pending, but setup requiring that approval remains blocked. This is an illustrative firm policy, not a universal rule.

Technical method can be proposed by IT. The attorney or firm owner should not be required to invent it. Recipient preview for IT excludes unnecessary personnel information and shows upstream approvals, output destination and escalation route.

### Family-law financial inventory

Inputs: attorney-approved document set and checklist version. Inventory received files; compare to checklist; distinguish absent, incomplete, unreadable and unclear items; submit inventory and exception list for the specified review.

Source references apply to received records; missing items reference the checklist requirement. No invented jurisdictional checklist or authority to contact a client. Dates inferred from “Thursday” require confirmation with timezone and intended calendar date.

### Marketing newsletter

Inputs: audience, approved brand/content guidance and source claims. Separate drafting, content approval, scheduling and publication authority. Completion is an approved and verified publication task, not guaranteed client acquisition. Routine approvals may belong to a marketing owner when authorized.

### Finance and HR

Finance example: prepare reconciled draft invoices with exceptions routed to the authorized reviewer. HR example: coordinate onboarding materials with restricted access to personnel information. Role-specific knowledge and data permissions must change; the overall playbook structure can remain consistent.

## 16. Mockup index and corrections

Latest five-screen conceptual set, available in the conversation's saved images:

1. “DELA conversation starter for repeatable onboarding.png” — chat-first entry and preserved history.
2. “Clarifying the onboarding handoff.png” — source-aware question about authority.
3. “Review the onboarding playbook.png” — overview and prioritized unresolved rule.
4. “Onboarding process review with visible dependencies.png” — process editor and proposed change.
5. “Role-specific IT handoff preview.png” — recipient-specific package and separate statuses.

These are visual references, not screenshots of implemented capabilities. Apply these corrections when building:

- Split the combined “IT + office manager” final step into separate accountable steps.
- Replace “Apply proposed revision” with “Apply to draft.”
- Label pending materials “Required inputs,” not supplied/available inputs.
- Keep the delegator preview read-only for recipient acceptance and access confirmation.
- Show invitation preparation separately from sending.
- Keep New chat visually secondary and preserve previous drafts.
- Include source links and detailed completion evidence behind expandable controls.
- Use “Approved” only after a real authorized approval event; screen 5 represents a later state than draft screens 3–4.

Older chronology and family-law mockups remain illustrative content examples. Their multi-screen sequences are not mandatory workflows. The “ready to reuse” illustration includes a Draft badge and proposed rule; do not implement it as approved/ready merely because of its headline.

## 17. Evaluation and learning plan

Start with instructions, curated examples, retrieval and deterministic controls. Fine-tuning is an optional later response to persistent measured failures, not a requirement for firm memory.

Build reviewed examples spanning legal support, IT, HR, marketing, finance and operations. Include messy requests, contradictory policies, missing sources, partial delegation and recipients who request changes. Use only data with appropriate permission for its intended use. Synthetic examples require practitioner review and are not evidence of real user value.

Keep training/development examples separate from held-out evaluations. Include unfamiliar firms and work types. Assess full conversations and resulting records, not just polished text.

### Evaluation dimensions

Understanding of outcome; grounding/provenance; question usefulness; role fit; authority preservation; dependency coverage; recipient comprehension; observable completion; version integrity; user effort; privacy/access isolation.

Use deterministic tests for state and permission behavior; qualified human review for substantive handoff quality; calibrated model graders as assistance, not sole authority. Repeat nondeterministic model scenarios where necessary to reveal instability.

### Product value measures

- Active delegator preparation and correction time.
- Recipient understanding and clarification time.
- Material misunderstanding and instruction-caused rework.
- Blocked time caused by unavailable inputs or access.
- Effort to reuse a playbook.
- Acceptance against the agreed criteria.
- Model latency and cost per useful handoff, not merely per message.

Compare with existing firm methods for similar work and account for task difficulty and recipient experience. Set launch targets after baseline observation; no numerical performance guarantees are established in this handoff.

Log minimal structured events such as conversation_started, draft_created, decision_resolved, proposal_applied, version_approved, invitation_sent, scope_accepted, blocker_reported and output_accepted. These are proposed names. Avoid raw sensitive chat content in general analytics. Define event ownership and denominators before interpreting funnels.

## 18. Acceptance test matrix

| ID | Scenario | Expected result |
| --- | --- | --- |
| UX-01 | First visit | Blank conversation available; no required category form |
| UX-02 | New chat from an existing draft | New thread opens; prior messages/draft recoverable |
| UX-03 | User returns from draft to chat | Conversation, draft links and unsent input preserved |
| AI-01 | User knows outcome but not method | AI asks constraints and invites qualified contribution |
| AI-02 | User says “usual checklist”; none retrieved | AI marks missing source instead of inventing policy |
| AI-03 | Source contradicts user request | Conflict and authorized resolution shown |
| AI-04 | Source includes hostile embedded instructions | No permission or system-instruction override |
| AI-05 | Marketing task without a matter | No mandatory CMS or legal-support fields |
| AI-06 | Relative date | Exact date/timezone confirmed before scheduling |
| WF-01 | User deselects a prerequisite | Supplier identified or affected step remains blocked |
| WF-02 | Drag violates dependency | Clear explanation; no silent dependency rewrite |
| WF-03 | Chat changes external-action authority | Diff highlights authority; no execution authorization |
| WF-04 | Optional backup owner absent | Unrelated draft saving remains available |
| VER-01 | Approved playbook edited | New draft version; active assignments unchanged |
| VER-02 | Assignment amendment after acceptance | Impact shown; relevant approval/acceptance renewed |
| AUTH-01 | Delegator opens recipient preview | Cannot accept or confirm access as recipient |
| AUTH-02 | Unapproved actor attempts approval | Server rejects; UI cannot bypass it |
| AUTH-03 | Cross-tenant object/retrieval request | No content or metadata leakage |
| AUTH-04 | Recipient loses access | Future retrieval/export/action reflects revocation |
| STATE-01 | Save draft | No approval, invitation, start or payment implied |
| STATE-02 | Submit output | Status is submitted, not accepted |
| INT-01 | Retry timed-out external write | Reconciliation/idempotency prevents duplicates |
| ERR-01 | Model timeout or invalid output | Last good state preserved; retry available |
| ERR-02 | Concurrent edit | Conflict detected; no silent overwrite |
| EXP-01 | Export reusable version | No accidental assignment-specific confidential content |
| A11Y-01 | Keyboard-only edit and dialog use | Full task path possible; focus managed correctly |
| MOB-01 | Small-screen navigation | Readable layout; controls accessible; input preserved |

Zero observed failures in a test set is a release check, not proof that failures cannot occur. Unauthorized access or fabricated action completion must block release until investigated and corrected.

## 19. Delivery phases and priorities

### Phase 0 — establish boundaries

Audit actual existing DELA code and permissions separately from the concept prototype. Confirm permitted data, user roles, persistence architecture, integration scope and pilot definition. Produce schema and migration plan without overwriting existing production behavior.

### Phase 1 — chat and reusable drafts

Deliver persistent chat, optional context, structured drafts, overview/process views, targeted questions, explicit proposals, source references and version-aware saving. Include general-role examples. Exit when users can capture a useful process without mandatory onboarding forms and the core permission tests pass.

### Phase 2 — handoff quality

Deliver role-specific read-only preview, partial delegation checks, contributor feedback, explicit required inputs and acceptance criteria. Test with both delegators and recipients. Exit when recipients can identify their work, inputs, boundaries and escalation path.

### Phase 3 — assignment preparation

Resolve roles to people, set dates, review sharing scope, prepare/send invitations, record scope responses and input/access conditions. Confirm marketplace engagement integration separately. Exit when acceptance and access cannot be impersonated and revisions remain traceable.

### Phase 4 — integrations and execution

Add selected context retrieval, controlled writes, status synchronization and review queues. Validate permissions, idempotency and conflict handling per connector. Avoid a broad all-systems launch.

### Phase 5 — maintenance and optimization

Add review triggers, proposed improvements, reuse analytics, richer exports and targeted model optimization. Do not add complexity solely to resemble an autonomous agent product.

Prioritize durable state and trustworthy handoffs before elaborate graph canvases, readiness scores, automatic execution or fine-tuning.

## 20. Launch decisions and unresolved items

| Decision | Recommended default for development | Must be resolved before |
| --- | --- | --- |
| Confidential client/employee data | Fictional/nonconfidential process material only | Sensitive uploads, retrieval or integrations |
| Existing production stack and schema | Audit first; additive migrations | Production implementation |
| Approval authority by firm | Explicit configured roles | Real approval and external action features |
| Freelancer engagement terms | Link to verified existing engagement flow | Sending actionable freelance assignments |
| Recording and transcription scope | Preserve as an optional input method; no fake working control | Advertising or shipping capture |
| Data retention and provider handling | No model-training reuse by default; define policy | Production data ingestion |
| First integration/provider permissions | Select narrow use case and verify API behavior | Connector launch |
| Notifications and reminder cadence | Explicit configurable workflow events | Sending notifications |
| Export format priorities | Markdown/text + structured representation | Final export release scope |
| Model/provider and cost limits | Benchmark against DELA evaluations | Production model selection |
| Accessibility and pilot targets | Test against specified tasks and baseline | General release |

## 21. Definition of done for the initial production slice

A new user can start in chat, describe a task without categorizing it, inspect a genuinely generated draft, understand unresolved decisions, edit safely, save durably, return later, and preview instructions for a recipient. The same structure works for legal support and nonlegal back-office roles. Source provenance and permissions are respected. Draft state cannot masquerade as approval or execution. Tests cover failure paths as well as the happy path.

The handoff is successful when a recipient unfamiliar with the firm's internal conversation can explain what to produce, what inputs are needed, what they may do, when to stop, who resolves exceptions, and how their work will be evaluated—with less combined clarification effort than the existing method.

## 22. Implementation instructions for the receiving developer

1. Treat this document as the consolidated target specification; distinguish confirmed direction from recommended detail and launch decisions.
2. Inspect the real repository, existing DELA records, authorization model and available integrations before choosing migrations or packages.
3. Retain the chat-first entry. Do not restore the assignment/playbook selection gate.
4. Replace the prototype's scripted responses, in-memory state and fixed chronology with server-backed, role-flexible behavior.
5. Implement permission and state checks before consequential tool actions.
6. Build Phase 1 as a coherent vertical slice, then validate handoffs with real role representatives before expanding execution.
7. Report what was implemented, what remains simulated, tests performed, unresolved decisions and any deviations from this specification.
8. Do not interpret illustrative screenshots as evidence that the depicted functionality already exists or as permission to bypass the specified controls.

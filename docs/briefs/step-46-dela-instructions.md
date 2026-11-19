# Feature brief: DELA instructions (firm guidance and preferences)

Step: 46   Spec references: Stacey's build handoff v1.0, sections 4 (firm context), 8 (unknown or conflicting context) and 9, mockup 5; the gap map's step C
Status: built in acceleration mode (Stacey 2026-11-19). Claude answered the questions below; Stacey reviews them after release

## Who
Attorneys and their firm staff, and agencies that hire. A freelancer with no agency has no firm, so no firm guidance.

## What
A firm tells DELA how it works, once, instead of repeating it in every chat. Done looks like: someone in the firm proposes a line ("For intake work, ask who confirms missing documents before preparing a handoff"), the Library administrator approves it, and from the next message DELA follows it for everyone in the firm. Each person can also keep preferences of their own.

## Where
Ask DELA (https://www.lawfecta.co/dela?tab=delegate). A card "DELA instructions" in the right column, and a screen of the same name that opens in place of the chat, with three tabs: "Firm guidance", "My preferences", "Change history".

## When
Any time. A proposal waits until the administrator decides. Approved guidance is read again at every message.

## Why
The handoff asks that a correction in a chat never silently becomes firm policy, and that the firm's own rules are visible, approved by someone with the right, and shown when they conflict with a request. Before this step DELA had facts about the firm (its profile) and no rules from it.

## How it could go wrong
- Someone proposes a line that tries to switch off DELA's rules: guidance can change how DELA works for the firm, never its rules. The prompt says so, and guidance is sent as a marked block.
- A proposal is treated as in force: only approved lines are sent to the AI. A proposed line is labeled "Proposed, not in use".
- A teammate approves their own proposal: only the Library administrator approves.
- Client names or account numbers typed into a line: the same check as a chat message runs before it is saved.
- A person's preference leaks to others: a preference is stored with its person and sent only in that person's chats.
- A request disagrees with firm guidance: DELA says so, quotes the guidance and asks which to follow this once.
- Too many lines slow every answer: a limit per firm and per person, from settings.
- Another firm: never listed, never sent, cannot be changed.

## Settings and switches it uses
The switch ask_dela_workspace (the same one as step 45). New setting ai.firm_rules_max (20). No business number.

## Questions, and how Claude answered them (acceleration mode)
1. Who may propose firm guidance? **Anyone who may comment in the firm's Library (commenter, editor, administrator).** Viewers read only.
2. Who approves? **The Library administrator**, as for documents (Stacey's answer 9 on step 45).
3. Does the administrator's own line skip approval? **No.** It is proposed, then approved with one more click, so every line in force has an approval on record.
4. Do preferences need approval? **No.** They are the person's own and apply only to their chats. Firm guidance wins when the two disagree.
5. Where is guidance used? **In Ask DELA only, for now.** Document drafting, the gig draft and the checks do not read it yet; that is a later step.
6. A new switch, or the workspace switch? **The workspace switch**, so testers who already have step 45 see it without another step.
7. How long may a line be, and how many? **300 characters; 20 approved lines per firm and 20 preferences per person**, both from one setting.
8. Is a retired or rejected line deleted? **No.** It leaves use and stays in "Change history".
9. What is "the firm" for a person in more than one Library? **The firm of their own workspace.** A guest in another firm's Library reads that firm's documents but neither sees nor changes its guidance.
10. The handoff's "Assignment context" tab: **left out.** DELA has no assignments outside gigs yet.

## Success looks like
- A proposed line is listed as "Proposed, not in use" and is not sent to the AI.
- Only the administrator can approve, reject or retire firm guidance; a proposer can withdraw their own.
- Approved guidance is sent with the next message, marked, to everyone in the firm, and to nobody outside it.
- A preference is in use at once, for its person only.
- Client information in a line is stopped before saving.
- The change history shows who proposed, who decided and when.
- Keyboard use, status in words, and 320 wide without sideways scrolling.

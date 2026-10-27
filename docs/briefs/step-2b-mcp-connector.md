# Feature brief: DELA in ChatGPT and Claude (MCP connector)

Step: 2b (right after AI and playbooks), then grows with every later step   Spec references: added by Stacey 2026-10-27; AI gateway (Step 2), plans and limits (Step 1)
Status: draft, waiting on Stacey's answers

## Who
- Attorneys and freelancers who already use ChatGPT or Claude and want to work with DELA from there.
- Each side only sees its own tools and data. A person with both sides picks which side when they connect, or connects twice.
- Lawfecta Team: switches it on, sees connections and usage, can cut off any connection.

## What
MCP (Model Context Protocol) is the standard way ChatGPT and Claude connect to outside services. DELA gets its own MCP connector, so a member can say in ChatGPT or Claude things like "turn this task into a DELA playbook" or "show my open gigs", and it happens in their real DELA account.
- Connect once: in ChatGPT or Claude, add the DELA connector, sign in with their Lawfecta login, and approve what it may do.
- Same rules as the website: plan limits, the access list, holds, switches, the emergency pause and the confidential information rule all apply.
- Tools, added step by step:
  - 2b: list my playbooks, read one, start a new playbook from a task description, save a draft, export (counts against the plan's exports).
  - 3: my profile and what is missing to be match-ready (freelancer), verification status (attorney).
  - 4: post a gig from an approved playbook, see matches, read and compare proposals (attorney); find gigs and send a proposal (freelancer).
  - 5: see my bookings and free times, book a meeting.
  - 6 and later: read-only for money (status of milestones and payouts). Paying, signing and hiring stay on the website.
- Anything that changes something (post, send, book) asks the person to confirm in the chat first, and is checked again by DELA at the moment it runs.

## Where
- A new address next to the api, for example the DELA api address plus /mcp, in Supabase.
- A Lawfecta sign-in and approval page on lawfecta.com (inside the DELA page, so BD's login is used and DELA never sees a password).
- In DELA: Settings > Connected AI apps, listing each connection with Disconnect.
- Admin area: a Connected AI tab (switch, connections, usage, errors).

## When
- Connect: the member adds DELA in ChatGPT or Claude and signs in. The connection lasts until they disconnect, their access is removed, or 90 days without use (setting).
- Every tool call: checked like a website action (signed in, on the access list, not on hold, plan allows it, not paused).
- Released per step, behind the switch mcp_connector (off, staff, list, everyone).

## Why
- Members work where they already are. That means more playbooks, gigs and proposals, and a reason to keep a paid plan.
- It is a strong selling point at launch: Lawfecta works inside ChatGPT and Claude.

## How it could go wrong
- Someone else's AI uses a stolen connection: tokens are short-lived, stored only as hashes, tied to one member and one side, and can be cut off by the member or by you at once.
- An AI tries an action the plan does not include: refused with a plain message, same as the website.
- An AI repeats the same action twice: every action has a one-use key, so it happens once.
- Prompt injection (text in a document tells the AI to do something): actions that change anything need the person's confirmation, money actions are not offered at all, and outside content is never treated as instructions by DELA.
- Confidential client data typed into ChatGPT or Claude: that data then sits with OpenAI or Anthropic under the member's own account terms. The connect screen and tool descriptions repeat the confidential information notice.
- AI credits: when the member's ChatGPT or Claude does the thinking, DELA's AI credits are not used. Tools that ask DELA's own AI to do work (for example building a playbook) use credits as on the website (question 3).
- Too many calls: per-member rate limits (setting), and the emergency pause has its own area, "connector".
- ChatGPT or Claude change their rules: the connector follows the open MCP standard, so one connector serves both.

## Settings and switches it uses
Switch mcp_connector. Settings: connection length (days unused), calls per minute per member, which plans include it (question 2), pause area "connector".

## Questions to make it better
1. Which tools matter most at launch? Suggested: playbooks (2b), profile status (3), gigs and proposals (4). Money stays website only.
2. Which plans include the connector: all plans, or Plus and above?
3. When a tool uses DELA's own AI (building a playbook), should it count against the member's AI credits as on the website? Suggested: yes.
4. Should members be able to send proposals and post gigs from ChatGPT or Claude (after confirming in chat), or only read and draft, then finish on the website?
5. Do you want DELA listed in the public ChatGPT and Claude app directories later (needs their review), or shared only as a link members add themselves at first? Suggested: link first, directories after launch.
6. Name shown in ChatGPT and Claude: "Lawfecta DELA"?

## Success looks like
- A test attorney adds DELA in ChatGPT and in Claude, signs in with their Lawfecta login, and builds and saves a playbook. It appears in DELA on the website.
- A test freelancer connected on the freelancer side cannot see attorney tools or data.
- A member off the access list, on hold, or over their plan limit is refused with a clear message.
- Disconnecting in DELA, or removing access in the admin area, stops the AI at once.
- Two identical calls save one playbook.
- The emergency pause on "connector" stops all AI app calls while the website keeps working.

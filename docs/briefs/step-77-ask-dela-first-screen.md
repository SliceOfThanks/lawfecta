# Feature brief: the Ask DELA first screen, as the mockup of 2026-11-23 draws it

Step: 77   Spec references: step 75 (the Ask DELA workspace), step 76 (the Scribe connection), Stacey's annotated mockup "Ask DELA, annotated UX/UI mockup" (2026-11-23)
Status: approved to build. Stacey 2026-11-23, with the mockup attached: "need to update the UX/UI of https://www.lawfecta.co/dela?tab=delegate - attached is mockup that needs to be done EXACTLY (colors & all). If you disagree with anything please let me know in a bullet list with simple questions and your suggestion (and why suggested)."

## Who
Attorneys and firm staff who open Ask DELA with the workspace switched on. Freelancers with the workspace on get the same screen with one starting card.

## What
A new chat opens on a light first screen: a title row, one blue band with the question "What would you like to get off your plate?", a small card "Conversation context", one message box with "Add", "Talk" and "Send", and three colored cards under "Not sure where to start?". Done is a member who knows what to type without reading instructions.

## Where
https://www.lawfecta.co/dela?tab=delegate (attorney) and https://www.lawfecta.co/dela?tab=ask (freelancer), behind the switch dela_workspace_v2. Browser code only: app/dela-app.js (dwChat, composer) and shared/dela-core.js.

## When
The first screen shows on a new chat. Once a message is sent, the band and the three cards make room for the conversation, with the context and "Suggested next actions" at the right.

## Why
Stacey called the message box the most important feature on the website. The three-column page put a menu, a chat list, three capture buttons and two side cards around it. The mockup leaves the question and the box.

## How it could go wrong
- A member cannot get back to a saved chat or to a workspace page: the button "Chats & pages" lists both.
- The context card says something untrue: its line is built from the firm's records ("No firm profile yet" when there is none).
- A menu traps the keyboard or hides behind a card: Escape closes it and returns the focus; the arrow keys move in it; a click elsewhere closes it; it is tested with the keyboard.
- "Improve my request" spends a DELA action by surprise: the line in "Add" only shows the button with its cost; the member clicks again to use it.
- The colors fail in dark mode or on contrast: each sampled color has a dark value; text on the tinted cards stays dark ink; the message box keeps the darker border from the accessibility review.
- A narrow screen: the context card goes under the band, the three cards stack, the drawing is hidden.
- The safety line weakens the sensitive data rule: it names the kinds that are never entered and says client names and case facts are fine, in Stacey's words of 2026-11-05.

## Settings and switches it uses
No new switch, setting or number. Existing: dela_workspace_v2, new_layout, ask_dela_workspace, automate_delegate, flex_gigs, recorder, scribe_import, file_uploads, voice_input, ai_helpers.

## Questions, and Stacey's answers (2026-11-23)
1. The mockup has no workspace menu and no list of earlier chats. Where do they go? **One small outlined button "Chats & pages" left of "New chat".**
2. The mockup's line says "Avoid entering confidential client details." Her rule allows client names and case facts. Which line? **Her rule, in the mockup's look.**
3. "Improve request" and "Send when I stop talking" are not in the mockup. **Moved into "Add"; the tick box shows only while Talk is recording.**

## Where the page differs from the mockup, to tell Stacey with the release
- "Chats & pages" (answer 1), the safety line (answer 2), four lines in "Add" (answer 3).
- The message box keeps a darker border than the mockup draws, for the contrast rule.
- The grey line with the DELA actions left stays under the box.
- The example with "Use this example" and the sentence about the whole back office are gone, as the mockup has neither.
- The blue notice at the very top of the page comes from the setting data.notice_text and still tells members not to enter client names. It contradicts her rule and the new line. It is her text to change.
- The top bar and the main menu are the shell that exists and were not changed.

## Success looks like
Attorney login:
- The first screen has the title row, the band, "Conversation context", the message box with "Add", "Talk", "Send", the safety line, and the three cards, in the mockup's colors.
- "Add" lists "Attach a file", "Record my screen", "Import from Scribe", "Improve my request".
- "Chats & pages" lists earlier chats and the six workspace pages.
- "Manage" opens the playbooks in the card; "Manage playbooks" opens "My Playbooks".
- After a message, the conversation takes the place of the band and cards.
Freelancer login: the same screen with one card, "Improve a process", and only "DELA instructions" under the workspace pages.

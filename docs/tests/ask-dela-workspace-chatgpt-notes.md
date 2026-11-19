# ChatGPT test 12: Ask DELA as a chat-first workspace (step 45, 2026-11-19)

What it covers: the new Ask DELA page for an attorney and for a freelancer. The panel "What DELA is using", choosing a Library document for a chat, an answer that uses it, a document that is named but not attached, the one next question with its choices, the suggested next actions, opening an earlier chat with its documents still chosen, "Create a draft from this chat" up to the form, and "+ New chat".

What it cannot cover: whether DELA's answer is good legal operations advice, a document that tries to give DELA orders (an automated test checks the rule is sent), a screen reader and a phone. The automated tests cover rights (another firm's document is never offered or used), the link between a chat and its draft, and 320 pixels wide.

What changes on the site: two chat messages are sent on the test attorney's account and one on the test freelancer's, each using one DELA action of that test account. One chat is left in each account's earlier chats. No document is created: the test stops at the form and never clicks "Draft it with DELA". Nothing is posted, approved or shared.

Two logins: the test attorney, then the test freelancer. Each logs in once.

Before you paste this:
1. Turn the feature on. Go to https://www.lawfecta.co/dela-admin?tab=switches and log in as the owner if asked. In the box "Find a switch" at the top of the page, type: Ask DELA workspace. One row stays, in the grey band "DELA's AI". At the right end of that row is a list under the column "State" that says "Off". Open it and choose "Access list". A small message at the bottom of the screen confirms it. (To turn it off again later, choose "Off" in the same list.)
2. The password is filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
3. When ChatGPT reaches the login page: click "Take over", log in as the account it names, hand control back and type: I'm logged in, continue.
4. Don't use www.lawfecta.co in other tabs while it runs.

First run, 2026-11-19 (10 PASS, 2 FAIL): both fails were this file's mistake. The test freelancer owns an agency, so it has a Library and the documents panel; steps 11 and 12 now say so. A freelancer with no agency is covered by the automated tests. Fixed in the app from that run: the DELA actions count is read again after an answer, and the empty next-actions hint reads "Choose a document or send a message."

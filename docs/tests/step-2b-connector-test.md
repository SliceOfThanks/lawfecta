# Test: DELA in Claude and ChatGPT (Step 2b)

> Checked 2026-11-13 (new layout). Open point: the menus inside claude.ai and chatgpt.com (Claude steps 1 to 3, ChatGPT steps 1 to 3) are not in the DELA code and could not be checked.

Claude already tested this on the test site with the official connector library and real calls: finding DELA, sign in, approval, the tools (who am I, list playbooks) and disconnect. What is left needs your own Claude and ChatGPT accounts, because the connector is added inside them. You do this test yourself, by hand (not with ChatGPT's agent).

Connector address (copy exactly): https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api/mcp

You can also copy it from DELA: open https://www.lawfecta.co/dela?tab=ai (the page headed "Settings"), scroll down to the card "Use DELA in ChatGPT and Claude", near the bottom of the page under the heading "AI and messages", then click the outlined "Copy" to the right of the box "DELA connector address".

The steps are grouped by login: everything as the test attorney first, then a short owner check.

## 1. Attorney
Log in as the test attorney: open https://www.lawfecta.co/login and log in with stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD). Use the same browser for Claude and ChatGPT below.

### Claude (claude.ai)
1. Open https://claude.ai/settings/connectors
2. Click "Add custom connector". In "Name" type: Lawfecta DELA. Paste the connector address into the address box. Click "Add".
3. In the list of connectors on the same page, click "Connect" next to Lawfecta DELA. A DELA page opens on www.lawfecta.co with the heading "Claude wants to connect to DELA".
   - Expect: the line "It will use your attorney workspace.", the headings "What Claude can access", "What it can change", "What stays private" (with a line starting "It cannot pay, hire, sign"), "What leaves DELA" and "How to disconnect", and a pink notice that starts "Never enter sensitive data in DELA".
4. Click the dark red "Approve" at the bottom of that page (to the left of the outlined "Deny"). You go back to Claude.
5. Start a new chat in Claude (https://claude.ai/new) and type: Using Lawfecta DELA, list my playbooks.
   - Expect: "New Family Law Client Intake After Signature" in the answer.
6. Type: Using Lawfecta DELA, save a draft playbook called Send the welcome packet, with three steps: email the welcome packet, call to confirm it arrived, note the call in the matter.
   - Expect: Claude says it saved a draft.
   - Open https://www.lawfecta.co/dela?tab=library and type Send the welcome packet in the search box near the top of the page (under the heading "Library" or "Document library"). "Send the welcome packet" is in the list below it, with the label "Draft".
7. Back in Claude, type: Using Lawfecta DELA, add a step to Send the welcome packet: send the intake questionnaire.
   - Expect: Claude says the change is waiting for you to accept it.
   - In DELA, open https://www.lawfecta.co/dela?tab=library and type Send the welcome packet in the search box near the top. Open the document: on a card, click its button "Continue draft"; in a table, click its row. On the document page, in the row of rounded buttons under the title, click "Suggested edits (1)". The change is there. Click the first button in the same row ("Draft and review", or "Read" on an older document): the document itself is unchanged until you accept the change.
8. In Claude, type: Save a DELA draft playbook for client John Smith, SSN 123-45-6789. (These are made-up details.)
   - Expect: refused, with a message about sensitive data or client information.
9. Open https://www.lawfecta.co/dela?tab=ai and scroll down to the card "Use DELA in ChatGPT and Claude", near the bottom of the page under the heading "AI and messages". Under the small heading "Connected now" at the bottom of that card, Claude is listed. Click the red "Disconnect" at the right of its row. A browser pop-up asks "Disconnect Claude?": click "OK". Expect the message "Disconnected".
10. Back in Claude, type: Using Lawfecta DELA, list my playbooks.
    - Expect: it can no longer reach DELA (it may ask you to connect again).

### ChatGPT (chatgpt.com)
1. Open https://chatgpt.com. Click your name or picture in the bottom left, then "Settings", then "Apps and Connectors" (some accounts call it "Connectors" or "Apps").
2. If there is no "Create" button: in the same "Apps and Connectors" page, open "Advanced settings" at the bottom and turn on "Developer mode".
3. Click "Create". In "Name" type: Lawfecta DELA. Paste the connector address into the connector address box. Under "Authentication" choose "OAuth". Tick the box that says you trust the app, then click "Create".
4. ChatGPT opens the DELA page. Expect the heading "ChatGPT wants to connect to DELA" (or whatever name ChatGPT gives itself). Click the dark red "Approve" at the bottom.
5. Start a new chat. Click the "+" (or tools) button next to the message box and choose the Lawfecta DELA connector. Then repeat Claude steps 5 to 8 above, typing the same messages into ChatGPT. For step 6, use the name "Send the welcome packet 2" so you can tell the two drafts apart.
6. Open https://www.lawfecta.co/dela?tab=ai, scroll down to the card "Use DELA in ChatGPT and Claude", near the bottom of the page under the heading "AI and messages", and click the red "Disconnect" at the right of ChatGPT's row under "Connected now". In the browser pop-up, click "OK".
7. Sign out of DELA: click the round dark red button with your initials at the far right of the top bar, then "Sign out", the last line in the menu that opens.

## 2. Owner
Log in as the owner: open https://www.lawfecta.co/login and log in with stacey@lawfecta.com (password TEST_PASSWORD).
1. Open https://www.lawfecta.co/dela-admin?tab=aifiles (this is "AI and files" in the menu on the left, under the heading "PLANS AND SETTINGS"). Scroll down to the card "ChatGPT and Claude connections", near the bottom of the page.
   - Expect: no connection still active (both were disconnected), and the tools that were used. No token or chat text appears.
2. Open https://www.lawfecta.co/dela-admin?tab=overview (this is "Overview" in the menu on the left, under the heading "MEMBERS"). In the card "Emergency pause", in its row of outlined buttons, there is a button "ChatGPT and Claude connector". Do not press it unless you want to test it. If you do, a browser pop-up asks why: type Test and click "OK". The button turns red and says "Paused: ChatGPT and Claude connector". Press it again, type Test and click "OK" to turn it back on.
3. Sign out: click the button "Stacey Lake (owner)" at the top right of the page, then "Sign out", the last line in the menu that opens.

## Report
For each numbered step: PASS or FAIL, what you saw, and a screenshot of anything wrong. Copy the exact words of any error.
If Claude or ChatGPT says your plan does not allow custom connectors, write that down. That is a limit of their plan, not of DELA.

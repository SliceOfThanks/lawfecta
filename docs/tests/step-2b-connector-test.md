# Test: DELA in Claude and ChatGPT (Step 2b)

> Layout note, 2026-11-13: this test was written for the earlier layout and its page description is out of date. DELA now has the menu on the left on every page. Claude rewrites this test before it is run again.

Claude already tested this on the test site with the official connector library and real calls: finding DELA, sign in, approval, the tools (who am I, list playbooks) and disconnect. What is left needs your own Claude and ChatGPT accounts, because the connector is added inside them. You do this test yourself, by hand (not with ChatGPT's agent).

Connector address (copy exactly): https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api/mcp

You can also copy it from DELA: open https://www.lawfecta.co/dela?tab=ai and scroll to the last card at the bottom, "Use DELA in ChatGPT and Claude", then click "Copy".

The steps are grouped by login: everything as the test attorney first, then a short owner check.

## 1. Attorney
Log in as the test attorney: open https://www.lawfecta.co/login and log in with stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD). Use the same browser for Claude and ChatGPT below.

### Claude (claude.ai)
1. Open https://claude.ai/settings/connectors
2. Click "Add custom connector". In "Name" type: Lawfecta DELA. Paste the connector address into the address box. Click "Add".
3. In the list of connectors on the same page, click "Connect" next to Lawfecta DELA. A DELA page opens on www.lawfecta.co with the heading "Claude wants to connect to DELA".
   - Expect: "Attorney" as the side, a list of what Claude can do, a line starting "It cannot pay, hire, sign", and the client information notice.
4. Click "Approve" at the bottom of that page. You go back to Claude.
5. Start a new chat in Claude (https://claude.ai/new) and type: Using Lawfecta DELA, list my playbooks.
   - Expect: "New Family Law Client Intake After Signature" in the answer.
6. Type: Using Lawfecta DELA, save a draft playbook called Send the welcome packet, with three steps: email the welcome packet, call to confirm it arrived, note the call in the matter.
   - Expect: Claude says it saved a draft.
   - Open https://www.lawfecta.co/dela?tab=library, scroll past the first two cards (the playbook count and "Recordings") to the list of playbooks: "Send the welcome packet" is there, marked as a draft.
7. Back in Claude, type: Using Lawfecta DELA, add a step to Send the welcome packet: send the intake questionnaire.
   - Expect: Claude says the change is waiting for you to accept it.
   - In DELA, open https://www.lawfecta.co/dela?tab=library, click "Send the welcome packet" in the list of playbooks, then click "Suggestions" in the row of views at the top of the playbook. The change is there. Click "Read" in the same row: the playbook itself is unchanged until you accept it.
8. In Claude, type: Save a DELA draft playbook for client John Smith, SSN 123-45-6789. (These are made-up details.)
   - Expect: refused, with a message about client information.
9. Open https://www.lawfecta.co/dela?tab=ai and scroll to the last card at the bottom, "Use DELA in ChatGPT and Claude". Under the "Connected now" heading in that card, Claude is listed. Click "Disconnect" on its row.
10. Back in Claude, type: Using Lawfecta DELA, list my playbooks.
    - Expect: it can no longer reach DELA (it may ask you to connect again).

### ChatGPT (chatgpt.com)
1. Open https://chatgpt.com. Click your name or picture in the bottom left, then "Settings", then "Apps and Connectors" (some accounts call it "Connectors" or "Apps").
2. If there is no "Create" button: in the same "Apps and Connectors" page, open "Advanced settings" at the bottom and turn on "Developer mode".
3. Click "Create". In "Name" type: Lawfecta DELA. Paste the connector address into the connector address box. Under "Authentication" choose "OAuth". Tick the box that says you trust the app, then click "Create".
4. ChatGPT opens the DELA page. Expect the heading "ChatGPT wants to connect to DELA" (or whatever name ChatGPT gives itself). Click "Approve" at the bottom.
5. Start a new chat. Click the "+" (or tools) button next to the message box and choose the Lawfecta DELA connector. Then repeat Claude steps 5 to 8 above, typing the same messages into ChatGPT. For step 6, use the name "Send the welcome packet 2" so you can tell the two drafts apart.
6. Open https://www.lawfecta.co/dela?tab=ai, scroll to the last card at the bottom, "Use DELA in ChatGPT and Claude", and click "Disconnect" on ChatGPT's row under "Connected now".
7. Sign out of DELA: click the initials in the top right of the DELA page, then "Sign out".

## 2. Owner
Log in as the owner: open https://www.lawfecta.co/login and log in with stacey@lawfecta.com (password TEST_PASSWORD).
1. Open https://www.lawfecta.co/dela-admin and click "AI and files" in the menu on the left near the top. Scroll to the last card at the bottom, "ChatGPT and Claude connections".
   - Expect: no connection still active (both were disconnected), and the tools that were used. No token or chat text appears.
2. Click "Overview" in the same menu on the left. In the "Emergency pause" card, there is a button "ChatGPT and Claude connector". Do not press it unless you want to test it. If you do, press it again to turn it back on.
3. Sign out: click the initials in the top right, then "Sign out".

## Report
For each numbered step: PASS or FAIL, what you saw, and a screenshot of anything wrong. Copy the exact words of any error.
If Claude or ChatGPT says your plan does not allow custom connectors, write that down. That is a limit of their plan, not of DELA.

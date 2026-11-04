# Test: DELA in Claude and ChatGPT (Step 2b)

Claude already tested this on the test site with the official MCP client library and with real calls: discovery, sign in, approval, the token, the tools (who am I, list playbooks), disconnect. What is left needs your own Claude and ChatGPT accounts, because the connector is added inside them.

Connector address (copy exactly): https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api/mcp

You can also copy it from DELA: https://www.hirelegalhelp.com/dela?tab=ai (card "Use DELA in ChatGPT and Claude", button Copy).

Log in to www.hirelegalhelp.com as the test attorney first (stacey+dela-attorney@lawfecta.com), in the same browser.

## Part 1. Claude (claude.ai)
1. Open https://claude.ai/settings/connectors
2. Click "Add custom connector". Name: Lawfecta DELA. Paste the connector address. Click Add.
3. Click Connect next to Lawfecta DELA. The DELA page opens on hirelegalhelp.com and says "Claude wants to connect to DELA".
   - Expect: the Attorney side, a list of what Claude can do, "It cannot pay, hire, sign...", and the client information notice.
4. Click Approve. You go back to Claude.
5. Start a new chat in Claude and type: "Using Lawfecta DELA, list my playbooks."
   - Expect: "New Family Law Client Intake After Signature".
6. Type: "Using Lawfecta DELA, save a draft playbook called Send the welcome packet, with three steps: email the welcome packet, call to confirm it arrived, note the call in the matter."
   - Expect: Claude says it saved a draft. Open https://www.hirelegalhelp.com/dela?tab=library and see it there as a draft.
7. Type: "Using Lawfecta DELA, add a step to Send the welcome packet: send the intake questionnaire."
   - Expect: Claude says the change is waiting. In DELA, open the playbook, Suggestions: the change is there, and the playbook itself is unchanged until you accept it.
8. Type: "Save a DELA draft playbook for client John Smith, SSN 123-45-6789." (fake details)
   - Expect: refused with a message about client information.
9. Open https://www.hirelegalhelp.com/dela?tab=ai. Under "Connected now" you see Claude. Click Disconnect.
10. Back in Claude, ask it to list your DELA playbooks again. Expect: it can no longer reach DELA (it may ask you to connect again).

## Part 2. ChatGPT (chatgpt.com)
1. Open https://chatgpt.com, then Settings, then "Apps and Connectors" (some accounts call it "Connectors" or "Apps").
2. If there is no Create button: Settings, Apps and Connectors, Advanced settings, turn on Developer mode.
3. Click Create. Name: Lawfecta DELA. Connector address: paste it. Authentication: OAuth. Tick that you trust the app, then Create.
4. ChatGPT opens the DELA page. Expect "ChatGPT wants to connect to DELA" (or the name ChatGPT gives itself). Click Approve.
5. In a new chat, choose the Lawfecta DELA connector (the + or tools menu), and repeat Part 1 steps 5 to 8.
6. Disconnect it in https://www.hirelegalhelp.com/dela?tab=ai as in Part 1 step 9.

## Part 3. Owner check
1. Open https://www.hirelegalhelp.com/dela-admin, tab "AI and files". The card "ChatGPT and Claude connections" lists any connection still active, and the tools used. No token or chat text appears.
2. Overview tab, Emergency pause: there is a button "ChatGPT and Claude connector". Do not press it unless you want to test it; if you do, press it again to turn it back on.

## Report
For each numbered step: PASS or FAIL, what you saw, and a screenshot of anything wrong. Copy the exact words of any error.
If Claude or ChatGPT says your plan does not allow custom connectors, write that down. That is a limit of their plan, not of DELA.

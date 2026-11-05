# Put the security page at /security (Brilliant Directories)

The security page tells attorneys, freelancers and visitors how DELA protects their data. It has a form for security questions. Messages from the form go to the admin area (Security tab) and to the team's email. The page shows no email address.

Anyone can open the page. Nobody has to log in.

Every number on the page (how many days links last, when files are deleted and so on) comes from your settings in the admin area. If you change a setting, the page changes by itself. You never edit the page to change a number.

You do this once on each site:
- Part 1: the test site, hirelegalhelp.com. Do this now.
- Part 2: the main site, lawfecta.com. Do this only when DELA launches there, not before.

The widget file:
- On GitHub: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/widgets/DELA-Security.php
- To copy the exact code, open the plain version: https://raw.githubusercontent.com/SliceOfThanks/lawfecta/claude/step-2a-ai-keys-voice-files/widgets/DELA-Security.php
- Claude also sends the file with this message.

Copy every character, from the first line (`<?php`) to the last line (`</script>`). Do not change anything in it on the test site.

The page shows the version of DELA that is recorded as tested. If the page says "The security page could not load", the tested version does not have the page yet. Tell Claude.

## Part 1. The test site (hirelegalhelp.com)

### Step 1. Make the widget
1. Go to https://www.hirelegalhelp.com/admin and log in as the site owner.
2. In the left menu, click "Toolbox", then click "Widget Manager".
3. At the top right of the Widget Manager page, click "New Widget" (BD may call it "Create New Widget").
4. In the "Widget Name" box, type exactly: DELA-Security
5. Click into the big code box ("Widget Code"). Delete anything already in it.
6. Open https://raw.githubusercontent.com/SliceOfThanks/lawfecta/claude/step-2a-ai-keys-voice-files/widgets/DELA-Security.php in a new tab. Press Ctrl+A (Cmd+A on a Mac) to select it all, then Ctrl+C (Cmd+C) to copy.
7. Go back to the BD tab, click into the code box and press Ctrl+V (Cmd+V) to paste.
8. Click the "Save" button (bottom or top right of the widget editor).

### Step 2. Make the page
1. Still in https://www.hirelegalhelp.com/admin, in the left menu click "Toolbox", then "Web Pages" (BD may call it "Page Builder" or "Manage Pages").
2. Click "Add New Page" (top right).
3. In the page settings:
   - "Page Title": Security
   - "Page URL" (also called "Filename" or "Page Address"): security
     The full address becomes https://www.hirelegalhelp.com/security
   - Who can see it: everyone. Do NOT set it to "Members only" or "Logged in members". Visitors must be able to read it without logging in.
   - Menu: your choice. It can go in the footer menu next to Privacy and Terms, or in no menu for now.
4. In the page's content area, add the DELA-Security widget:
   - If the content box has a "Widget" or "Insert Widget" button, click it and choose DELA-Security.
   - If not, switch the content box to code (or "Source") view and type the BD widget code for DELA-Security: an opening square bracket, the word widget, an equals sign, DELA-Security, and a closing square bracket, with no spaces.
5. Click "Save".
6. If BD shows a "Refresh Live Site" button (top of the admin area), click it.

### Step 3. Check it
1. Open a private window (Chrome: Ctrl+Shift+N, or Cmd+Shift+N on a Mac) so you are not logged in.
2. Go to https://www.hirelegalhelp.com/security
3. Expect: a dark banner at the top titled "Security and your data", then an "On this page" card with 8 links, then the sections "Where your data is stored", "What counts as sensitive data", "Link and file expiration", "Retention and deletion", "AI and training", "Who can access your data", "Services that handle data" and, at the bottom, "Ask a security question".
4. Under "Link and file expiration" (middle of the page), expect "7, 14 or 30 days" and "the default is 14 days" (your current settings).
5. At the bottom, in the "Ask a security question" card, fill in "Your name", "Your email", "Topic (short)" and "Your message", then click "Send message".
6. Expect: a green box saying "Thank you. Your message was sent."
7. Go to https://www.hirelegalhelp.com/dela-admin, open the "Security" tab, and expect your message at the top of the list. The same message also arrives by email.
8. Close the private window.

## Part 2. The main site (lawfecta.com), only when DELA launches there

Do this only after your first push to Live, when the DELA-App and DELA-Admin widgets on lawfecta.com already hold the Live api address.

### Step 1. Make the widget
1. Go to https://www.lawfecta.com/admin and log in as the site owner.
2. In the left menu, click "Toolbox", then "Widget Manager".
3. Click "New Widget". In "Widget Name" type exactly: DELA-Security
4. Paste the code exactly as in Part 1, Step 1 (open https://raw.githubusercontent.com/SliceOfThanks/lawfecta/claude/step-2a-ai-keys-voice-files/widgets/DELA-Security.php, Ctrl+A, Ctrl+C, then paste into the code box).
5. One change on this site only. Near the top of the code, on the line that starts with `<div id="dela-security"`, find `data-api=""`. Click between the two quote marks and paste the Live api address, the same one you put in DELA-App and DELA-Admin on lawfecta.com (it looks like https:// then your dela-live project ID, then .supabase.co/functions/v1/api).
   It then reads data-api="(the Live address)". Leave everything else as it is.
6. Click "Save".

### Step 2. Make the page
Follow Part 1, Step 2, on https://www.lawfecta.com/admin. The full address becomes https://www.lawfecta.com/security. Visible to everyone, not members only. Click "Refresh Live Site" if BD shows it.

### Step 3. Check it
Follow Part 1, Step 3, with https://www.lawfecta.com/security, and check the message in https://www.lawfecta.com/dela-admin on the "Security" tab.

## If something looks wrong
- "The security page could not load. Please refresh the page.": refresh once. If it stays, tell Claude (the tested version may not include the page yet, or the api address is wrong).
- "This page could not load. Please refresh the page." inside the page: DELA's server did not answer. Refresh once, then tell Claude.
- A number on the page looks wrong: change it in the admin area settings, not in the widget. The page follows the settings.

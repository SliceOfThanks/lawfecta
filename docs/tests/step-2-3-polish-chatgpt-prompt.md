# ChatGPT test: the 2026-11-05 fixes (profile page, banner, library, Word export, admin settings)

This checks the fixes from your recheck and recorder check. The live screen recording itself stays by hand (Part A of the recorder check), because ChatGPT's browser cannot share a real screen.

Before you paste this:
1. The logins are filled in. Passwords are not kept on GitHub: use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
2. Have ready on your computer, in Downloads:
   - any photo as a PNG or JPG (a headshot or any picture with no client information)
   - the process write-up Word file or PDF you used before
3. The Lawfecta login has reCAPTCHA, which ChatGPT cannot pass. Each time ChatGPT reaches the login page:
   1. Click "Take over".
   2. Log in with the account it names.
   3. Hand control back and type: I'm logged in, continue.
   The steps are grouped by login, so this happens three times.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.hirelegalhelp.com. Report every step as PASS or FAIL with what you saw. Take a screenshot of anything wrong or confusing. Never type real client information; use only made-up details.

Logins:
- test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.hirelegalhelp.com/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.

The steps are grouped by login. To sign out at the end of a group, click the initials in the top right of the DELA page, then "Sign out".

The pink banner in these steps is the one that starts "DELA is for operations work. Do not enter confidential client information". It should show only on Ask DELA, the Library and the recorder page.

1. Freelancer (ask me to log in as the test freelancer)
1. Open www.hirelegalhelp.com/dela. On Home, expect no pink banner. Click "Work" in the row of tabs: no pink banner. Click "Ask DELA": the pink banner is there.
2. Open www.hirelegalhelp.com/dela?tab=profile. Expect no pink banner at the top of the page. Scroll to the "Your profile" card.
3. Photo, at the top of the "Your profile" card:
   1. Click "Change photo" (or "Add a photo") and choose the PNG or JPG photo from Downloads.
   2. Expect "New photo ready. Click Save to keep it." and the new photo in the circle.
4. Help: click the small "?" next to "Education", about halfway down the card. Expect a blue box explaining what to enter. Hover over another "?" (for example next to "Summary") and report whether the explanation appears.
5. Write with DELA:
   1. Under the "Experience" box, click "✦ Write with DELA".
   2. In the box that opens, type: Senior paralegal at a small family law firm for six years, mostly e-filing and discovery.
   3. Click "Write it". Expect the Experience box filled in within 30 seconds, and the message "DELA wrote this from your facts. Check it, change anything, then click Save."
   4. Report whether DELA added anything you did not give it (a school, an employer name or a number). It must not.
6. Tech tools, under the "Education" box: expect "Tech tools you use" with groups such as "Practice and case management" and "Legal research and AI". Groups with chosen tools start open and show "1 chosen" (or more); the others are closed. Open "Court e-filing" and click one tool. Its group now shows "1 chosen".
7. At the bottom of the card, untick "Also update my Lawfecta directory listing" if it is ticked, then click "Save". Expect "Profile saved". Reload the page: the new photo, the Experience text and the e-filing tool are still there.
8. Near the top of the card, click "Fill from my Lawfecta listing". Copy the exact message you see.
9. Sign out.

2. Attorney (ask me to log in as the test attorney)
1. Open www.hirelegalhelp.com/dela.
   - On Home, expect no pink banner.
   - In the row of four numbers near the top, "Draft playbooks" is 1 or more.
   - Under "What DELA will do for you", lower on the page, click "Open the Library" in the Playbooks row. Expect the Library with its list of playbooks (not a single playbook), and the pink banner at the top.
2. Click "Files", "Projects" and "Talent" in the row of tabs, one at a time. Expect no pink banner on any of them. On Files, the "Add files" area still has the tick box that starts "These files have no confidential client information".
3. Click the initials in the top right, then "AI settings". Expect no pink banner. Then open www.hirelegalhelp.com/dela?tab=profile: no pink banner, and a "?" next to the boxes.
4. Upload on the New playbook page:
   1. Click "Library". In the first card at the top (the one showing how many playbooks you have), click "New playbook".
   2. Leave the description empty. Click "Upload a new file". Choose the process write-up from Downloads and click "Upload" without ticking the box. Expect a red message asking you to tick the box.
   3. Tick the box that starts "This file has no confidential client information" and click "Upload". Expect a line starting "✓" that says the file is ready.
   4. Click "Draft it with DELA". Expect a playbook page with "DELA's questions" within 60 seconds.
5. On that playbook, click "Export" in the row of views at the top, then "Word (.docx)". Open the file. Expect:
   - the title, then a line with the version and the date
   - a summary box (Outcome, Practice area and jurisdiction, When to use it, Deliverables)
   - the steps in a table with the columns #, What to do, Who, Tool, Time and Type
   - the attorney review points in a shaded box
   - "Page 1 of" in the footer
   Report anything that looks wrong or hard to read.
6. Click "Library". Scroll to the "Recordings" card, the second card from the top. Narrow the window to phone width (about 390 pixels). Expect each recording shown as its own block, with Process name, Date recorded, Length and Status each on their own line, and nothing cut off on the right. Widen the window again.
7. Sign out.

3. Owner (ask me to log in as the owner)
1. Open www.hirelegalhelp.com/dela-admin and click "Settings" in the row of tabs near the top. Find the group "Process Recorder" and click "Show" on it. Expect:
   - "Longest recording per plan" reads like "Attorney Free: 20 minutes; Attorney Plus: 30 minutes; ...", with no "[object Object]"
   - "Days a recording's video is kept per plan" and "AI credits one recording uses per plan" read the same way
   - the consent wording says to record only practice runs or work with no client information
2. On "Longest recording per plan", click "Change". Expect one box per plan, each with the plan's name. Do not save: click "Cancel".
3. Find the group "Profiles and verification" and click "Show". Expect "Largest profile photo" (3072 KB) and "Also send a new profile photo to the Lawfecta listing" (No).
4. Sign out.

Final report:
- a table of every step with PASS or FAIL
- anything confusing, slow (over 30 seconds) or worded badly
- the exact text of every error message

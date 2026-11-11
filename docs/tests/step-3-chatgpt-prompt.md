# ChatGPT test: Step 3, profiles and verification (both sides)

Claude already tested on the test site: the profile page loads, "Fill from my Lawfecta listing" reads only the name and the fields DELA uses, saving works, and the listing update. This test covers the screens, both sides and misuse.

Before you paste this:
1. The logins are filled in. Passwords are not kept on GitHub: use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
2. The work email for the license check is stacey+license@lawfecta.com (it arrives in your lawfecta.com inbox). hello@lawwurk.com cannot be used: its mail server refuses our email service.
3. Have ready a short resume as a PDF with no client information, and any program file renamed to end in .pdf.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co. Report every step as PASS or FAIL with what you saw, and take a screenshot of anything wrong or confusing. Never type real client information. Use only made-up details.

Logins: test attorney stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD); test freelancer stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD); owner stacey@lawfecta.com (password TEST_PASSWORD). Work email for the license check: stacey+license@lawfecta.com.

The steps are grouped by login: all freelancer steps, then all attorney steps, then the owner. Log in once for each group. The last group is a short check of the results. To log out, click the initials in the top right of the DELA page, then "Sign out".

1. Freelancer (log in as the test freelancer)
1. Open www.lawfecta.co/dela?tab=profile (or click "Profile" in the row of tabs under the dark top bar). Expect, from top to bottom: "Where your profile stands", "Your availability", "LinkedIn check", "Your profile" and "Profile documents".
2. In the "Your profile" card, about halfway down, open "Let DELA draft your headline, summary and services". Type a few made-up sentences about your work and click "Draft with DELA". Expect the Headline and Summary boxes filled in, and nothing saved yet.
3. Still in "Your profile", fill in:
   - First name and Last name, at the top of the card.
   - One practice area: click a button under "Practice areas".
   - Under "Services", fill in "Service" with a price in "From $" and "to $".
   - "Experience".
   - At least one button under "Tech tools you use".
   - Under the "How you work" heading near the bottom: "Time zone", "Hours a week you can take on" and "LinkedIn profile address".
   - The agreement tick box at the very bottom.
   Then click "Save" at the bottom of the card. Expect "Profile saved" and "Waiting for a check".
4. Type "client SSN 123-45-6789" (made up) into "Summary" and click "Save". Expect DELA to ask about client information first. Cancel, remove it, and save again.
5. In "Usual hours", under "How you work", type "Weekdays" without saving. Then scroll up to the "LinkedIn check" card, paste a LinkedIn profile address and click "Ask for the check". Expect "Waiting for the Lawfecta Team", and "Weekdays" is still in "Usual hours". Then try "https://example.com" in the LinkedIn box: expect a plain refusal.
6. In the "Profile documents" card at the bottom:
   - Click "Upload a document" without the tick box: expect a message.
   - Tick the box and upload the resume PDF: expect it in the list, then "Ready".
   - Upload the renamed program: expect "Not accepted".
   - Click "Show to attorneys" on the resume.
7. In the "Your availability" card near the top, click "Available for new work". Expect the date and "Confirm again by".
8. Click "Notices" in the dark top bar. Expect the panel on the right with a "Close" button in its top-right corner. Click "Close": it closes. Open it again and click the dimmed page to the left: it closes.
9. Narrow the window to phone width: nothing runs off the side. Click the initials in the top right: the menu says "Profile". Click "Sign out": you land on the Lawfecta login page.

2. Attorney (log in as the test attorney)
1. Open www.lawfecta.co/dela. On Home, the "Verification" card has "Set up your profile and verification". Click it. Expect "Profile and verification" with "Not complete" and a checklist.
2. In the "Your profile" card, click "Fill from my Lawfecta listing" at the top of the card. Expect a message and your name filled in. Nothing else private appears.
3. In "Your profile", fill in "Firm name", "City" and "State" (TX). Under "Practice areas", click "Family law". Type TX in "Where you are licensed or practice". Click "Save" at the bottom of the card. Expect "Profile saved" and "Waiting for a check".
4. In the "License verification" card, click "Add a license" at its bottom:
   1. Choose TX in "State that issued the license" and type 24000002 in "Bar number". Keep the name.
   2. Choose the email option, type a Gmail address and click "Add the license". Expect a message that Gmail and Yahoo do not count.
   3. Type stacey+license@lawfecta.com instead and add it. Expect "We emailed stacey+license@lawfecta.com".
   4. Ask me to open that email and click its button while logged in as the test attorney. Expect "Email confirmed".
5. On the license, click "Ask for a video call instead". Expect "Video call requested".
6. Scroll to the "Firm details" card at the bottom. Fill in "Billing address", "Who may sign for the firm" and "Email for formal notices". Click "Save firm details". Expect "Firm details saved".
7. Click "Projects" in the row of tabs. Expect a note that posting work and hiring need a verified license.
8. Click the initials in the top right: the menu says "Profile and verification". Click "Sign out".

3. Owner (log in as the owner)
1. Open www.lawfecta.co/dela-admin and click the "Verification" tab in the row of tabs at the top.
2. "Attorney licenses": find the TX license with its confirmed email. Click "Verify" without choosing how they showed it is theirs. Expect a plain message asking you to choose.
3. Choose "The email is at the firm's own domain", type a note in "Lookup note", and click "Verify". Expect the license to leave the list.
4. "Freelancer LinkedIn checks", below: on the freelancer's check, click "Checked" without ticking. Expect "Tick both". Tick both boxes and click "Checked".
5. Sign out (initials in the top right, then "Sign out").

4. Check the results (two quick logins)
1. Test attorney: open www.lawfecta.co/dela?tab=profile. Expect "Verified" and "Ready". Click "Projects": the hiring note is gone. Sign out.
2. Test freelancer: open www.lawfecta.co/dela?tab=profile. Expect "You are match-ready".

Final report: a table of every step with PASS or FAIL, then anything confusing, slow (over 30 seconds) or worded badly, with the exact text of every error message.

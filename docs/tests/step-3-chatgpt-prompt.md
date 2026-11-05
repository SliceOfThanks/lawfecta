# ChatGPT test: Step 3, profiles and verification (both sides)

Claude already tested on the test site: the profile page loads, "Fill from my Lawfecta listing" reads only the name and the fields DELA uses, saving works, and the listing update. This test covers the screens, both sides and misuse.

Before you paste this:
1. The logins are filled in. Passwords are not kept on GitHub: use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
2. The work email for the license check is hello@lawwurk.com. Have that inbox open: you click the link in that email when ChatGPT asks.
3. Have ready a short resume as a PDF with no client information, and any program file renamed to end in .pdf.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.hirelegalhelp.com. Report every step as PASS or FAIL with what you saw, and take a screenshot of anything wrong or confusing. Never type real client information. Use only made-up details.

Logins: test attorney stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD); test freelancer stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD); owner stacey@lawfecta.com (password TEST_PASSWORD). Work email for the license check: hello@lawwurk.com.

A. Attorney profile (test attorney)
1. Open www.hirelegalhelp.com/dela. On Home, the Verification card has "Set up your profile and verification". Click it. Expect the page "Profile and verification" with "Not complete" and a checklist.
2. Click "Fill from my Lawfecta listing". Expect a message and your name filled in. Nothing else private appears.
3. Fill Firm name, City, State (TX), click "Family law", and type TX in "Where you are licensed or practice". Click Save. Expect "Profile saved" and "Waiting for a check".
4. Under "Add a license": choose TX, bar number 24000001, keep the name, choose the email option, type a Gmail address, click "Add the license". Expect a message that Gmail and Yahoo do not count.
5. Type hello@lawwurk.com instead and add it. Expect "We emailed hello@lawwurk.com". Ask me to open that email and click the button while logged in as the test attorney. Expect "Email confirmed".
6. Click "Ask for a video call instead" on the license. Expect "Video call requested".
7. Open Projects. Expect a note that posting work and hiring need a verified license.

B. The Lawfecta Team (owner)
1. Log in as the owner, open www.hirelegalhelp.com/dela-admin, tab "Verification". Expect the TX license with its confirmed email.
2. Click Verify without choosing how they showed it is theirs. Expect a plain message asking you to choose.
3. Choose "The email is at the firm's own domain", type a lookup note, click Verify. Expect the list to empty.

C. Attorney again
1. Open www.hirelegalhelp.com/dela?tab=profile. Expect "Verified" and "Ready". Open Projects: the hiring note is gone.
2. Under Firm details, fill the billing address, who may sign and the notice email. Save. Expect "Firm details saved".

D. Freelancer (test freelancer)
1. Open www.hirelegalhelp.com/dela and click the Profile tab. Expect availability, LinkedIn check, the checklist and Profile documents.
2. Open "Let DELA draft your headline, summary and services", type a few made-up sentences about your work, click "Draft with DELA". Expect a headline and summary filled in, and nothing saved yet.
3. Fill first and last name, a practice area, a service with a price from and to, experience, software, time zone, hours a week, a LinkedIn address, tick the agreement. Click Save. Expect "Waiting for a check".
4. Type in the summary "client SSN 123-45-6789" (made up) and Save. Expect DELA to ask about client information first. Cancel, remove it, and save again.
5. LinkedIn check: paste a LinkedIn profile address and click "Ask for the check". Expect "Waiting for the Lawfecta Team". Try "example.com" instead: expect a plain refusal.
6. Profile documents: click "Upload a document" without the tick box: expect a message. Tick it and upload the resume PDF: expect it to appear, then Ready. Upload the renamed program: expect "Not accepted". Click "Show to attorneys" on the resume.
7. Click "Available for new work". Expect the date and "Confirm again by".

E. Owner: LinkedIn
1. In the admin Verification tab, on the freelancer's LinkedIn check, click Checked without ticking: expect "Tick both". Tick both boxes and click Checked.
2. As the freelancer, open www.hirelegalhelp.com/dela?tab=profile. Expect "You are match-ready".

F. Phone and other checks
1. Narrow the window to phone width on the freelancer profile: nothing runs off the side.
2. As the test attorney, the account menu (initials, top right) has "Profile and verification". As the freelancer it says "Profile".

Final report: a table of every step with PASS or FAIL, then anything confusing, slow (over 30 seconds) or worded badly, with the exact text of every error message.

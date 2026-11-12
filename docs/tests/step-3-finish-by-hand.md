# Step 3: finish by hand (about 10 minutes)

> Checked 2026-11-13 (new layout). Open point: section 1 names the email sent on Nov 4 to hello@lawwurk.com. That link has run out and that mailbox refuses our email service, so before this is used again Claude says which email address and which license it now applies to.

ChatGPT ran out of credits partway. These are the steps still to check. Do them yourself in your browser, and tell Claude what you saw at each one. Passwords are in the copy Claude sent you in chat (TEST_PASSWORD here).

Logins:
- Test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- Test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- Owner: stacey@lawfecta.com (password TEST_PASSWORD)

Already passed: A1 to A4, A6, A7, D1 to D7 and F1. The team's LinkedIn check also passed: the freelancer is match-ready, and you got the "LinkedIn profile is checked" email.

Every page has the menu down the left side and a light bar across the top. To sign out of DELA: click the round dark red button with your initials at the far right of the top bar, then "Sign out", the last line in the menu. In the admin area: click the button with your name and "(owner)" at the top right, then "Sign out".

## 1. Test attorney: confirm the license email (A5)
1. Go to https://www.lawfecta.co/login and log in as the test attorney (stacey+dela-attorney@lawfecta.com).
2. In the same browser, in a new tab, open the inbox for hello@lawwurk.com. Find the email "Confirm this email for your license", sent Nov 4 at 3:32 PM Pacific. Check spam too.
3. Click the button in the email. DELA opens on the page "Profile and verification".
   - Expect: the message "Email confirmed. The Lawfecta Team will finish the check." In the card "License verification" (click the button "License verification" in the row of buttons near the top of the page to jump to it), the TX license says "Email hello@lawwurk.com confirmed."
4. If there is no email, or the link says it ran out: go to https://www.lawfecta.co/dela?tab=profile, click the button "License verification" in the row of buttons near the top of the page, and in the card "License verification" click the outlined button "Send the email again" under the TX license. Use the new email. The link works for 24 hours.
5. Sign out: click the round button with your initials at the far right of the top bar, then "Sign out".

## 2. Owner: the team verifies it (B1 to B3)
1. Go to https://www.lawfecta.co/login and log in as the owner (stacey@lawfecta.com).
2. Go to https://www.lawfecta.co/dela-admin?tab=verify (in the left menu this is "Verification", the first line under the heading "MARKETPLACE").
   - Expect: the first card, whose heading starts "Attorney licenses (", shows the TX license with "Email: hello@lawwurk.com (confirmed" and a time.
3. In the box for that license, click the dark red "Verify" at the bottom of the box without choosing anything.
   - Expect: the message "Choose how the attorney showed the license is theirs."
4. In the same box, open the list "How they showed it is theirs" and choose "The email is at the firm's own domain". In the box under it, "Lookup note (what you checked, where)", type: Test: made-up license. Click "Verify".
   - Expect: the message "Verified". The card heading now says "Attorney licenses (0)".
5. Sign out: click the button with your name and "(owner)" at the top right, then "Sign out".

## 3. Test attorney: verified, firm details, and the listing fix (C1, C2 and the second fix from ChatGPT's report)
1. Go to https://www.lawfecta.co/login and log in as the test attorney (stacey+dela-attorney@lawfecta.com).
2. Go to https://www.lawfecta.co/dela?tab=profile
   - Expect: the first card, "Where your profile stands", has the green label "Ready" and the sentence "You are verified. You can post work and hire on DELA." In the card "License verification", the TX license has the label "Verified".
3. Click "Projects" in the menu on the left (or go to https://www.lawfecta.co/dela?tab=projects).
   - Expect: no note saying that posting work and hiring need a verified license.
4. Go back to https://www.lawfecta.co/dela?tab=profile and click the button "Firm details" in the row of buttons near the top of the page. The card "Firm details" is the second card on the page. Fill in:
   - "Billing address": 1 Main St, Austin TX
   - "Who may sign for the firm": DELA Test Attorney
   - "Email for formal notices": hello@lawwurk.com
5. Click "Save firm details" at the bottom of that card.
   - Expect: "Firm details saved". The line "Still needed for paid work" in that card goes away, and so does the yellow line "Still needed before paid work" in the first card.
6. On the same page, click the button "Your profile" in the row of buttons near the top. In the card "Your profile", clear the "City" box, then click the outlined button "Fill from my Lawfecta listing" at the top of that card.
   - Expect: a message that starts "Filled 1 item" (not "1 items") if your listing has a city. Otherwise expect a message that starts "Your listing had nothing new to add". Do not click the Save button.
7. Sign out: click the round button with your initials at the far right of the top bar, then "Sign out".

## 4. Test freelancer: the first fix from ChatGPT's report
1. Go to https://www.lawfecta.co/login and log in as the test freelancer (stacey+dela-freelancer@lawfecta.com).
2. Go to https://www.lawfecta.co/dela?tab=profile
3. Click the button "Your profile" in the row of buttons near the top of the page. In the card "Your profile", scroll down to the heading "How you work" near the bottom. Type something in the "Usual hours" box, which is under "Time zone". Do not click the Save button.
4. Scroll up to the card "LinkedIn check" (or click the button "LinkedIn check" in the row of buttons near the top) and click "Send for a new check" under the box "LinkedIn profile address".
   - Expect: the message "Sent to the Lawfecta Team" or "Already sent". Scroll back down to "Usual hours": what you typed is still there.
5. Sign out: click the round button with your initials at the far right of the top bar, then "Sign out".

## 5. Tell Claude
Reply with each number and what you saw, for example: "1 OK, 2 OK, 3 the firm details message said ..."

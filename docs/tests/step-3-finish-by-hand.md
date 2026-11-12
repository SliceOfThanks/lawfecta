# Step 3: finish by hand (about 10 minutes)

> Layout note, 2026-11-13: this test was written for the earlier layout and its page description is out of date. DELA now has the menu on the left on every page. Claude rewrites this test before it is run again.

ChatGPT ran out of credits partway. These are the steps still to check. Do them yourself in your browser, and tell Claude what you saw at each one. Passwords are in the copy Claude sent you in chat (TEST_PASSWORD here).

Logins:
- Test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- Test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- Owner: stacey@lawfecta.com (password TEST_PASSWORD)

Already passed: A1 to A4, A6, A7, D1 to D7 and F1. The team's LinkedIn check also passed: the freelancer is match-ready, and you got the "LinkedIn profile is checked" email.

## 1. Confirm the license email (A5)
1. Go to https://www.lawfecta.co/login and log in as the test attorney.
2. In the same browser, open the inbox for hello@lawwurk.com. Find the email "Confirm this email for your license", sent Nov 4 at 3:32 PM Pacific. Check spam too.
3. Click the button in the email. DELA opens on Profile.
   - Expect: "Email confirmed. The Lawfecta Team will finish the check." The license says "Email hello@lawwurk.com confirmed."
4. If there is no email, or the link says it ran out: open https://www.lawfecta.co/dela?tab=profile, click "Send the email again" on the TX license, and use the new email. The link works for 24 hours.

## 2. The team verifies it (B1 to B3)
1. Log out of www.lawfecta.co, then log in as the owner.
2. Open https://www.lawfecta.co/dela-admin and click the Verification tab.
   - Expect: the TX license, with "hello@lawwurk.com (confirmed ...)".
3. Click Verify without choosing anything. Expect: "Choose how the attorney showed the license is theirs."
4. In "How they showed it is theirs", choose "The email is at the firm's own domain". Type a note such as "Test: made-up license". Click Verify.
   - Expect: "Verified". The list says Attorney licenses (0).

## 3. The attorney is verified (C1 and C2)
1. Log out, then log in as the test attorney.
2. Open https://www.lawfecta.co/dela?tab=profile
   - Expect: "Verified" and "Ready", and "You are verified".
3. Click Projects. Expect: no note saying hiring needs a verified license.
4. Back on Profile, under Firm details, fill in:
   - Billing address: 1 Main St, Austin TX
   - Who may sign for the firm: DELA Test Attorney
   - Email for formal notices: hello@lawwurk.com
5. Click "Save firm details". Expect: "Firm details saved". The "Still needed for paid work" line goes away.

## 4. The two fixes from ChatGPT's report
1. Freelancer:
   1. Log in as the test freelancer and open https://www.lawfecta.co/dela?tab=profile
   2. Type something in "Usual hours" without clicking Save.
   3. Then click "Send for a new check" under LinkedIn check.
   4. Expect: what you typed in Usual hours is still there.
2. Attorney:
   1. Log in as the test attorney and open https://www.lawfecta.co/dela?tab=profile
   2. Clear the City box, then click "Fill from my Lawfecta listing".
   3. Expect "Filled 1 item" (not "1 items") if your listing has a city. Otherwise expect "Your listing had nothing new to add."

## 5. Tell Claude
Reply with each number and what you saw, for example: "1 OK, 2 OK, 3 the firm details message said ..."

# ChatGPT test: Step 7, reviews, the bench and webhooks

Claude already tested all of this with the real api and database: 9 api tests and 21 browser checks. They cover both sides, mistakes and misuse:
- a review before completion
- client information in a review
- a threat
- a negative review (it publishes)
- edits after 14 days
- reports and appeals
- past-client links, limits and opting out
- the bench conversation without files
- leaving a bench
- webhooks to internal addresses, redirects, retries, pausing and plan limits
- the phone screen

This test covers the real screens.

Before you paste this:
1. You need a completed engagement between the test attorney and the test freelancer (from the Step 6 test, with every milestone accepted). If you do not have one yet, ask Claude to make one on the test site.
2. The logins are filled in. Passwords are not kept on GitHub. Use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
3. For the webhook part, open https://webhook.site in a new tab first. It gives you a free test address (it starts with https://webhook.site/). Paste that address when the test asks for it.
4. The Lawfecta login has reCAPTCHA, which ChatGPT cannot pass. Each time ChatGPT reaches the login page:
   1. Click "Take over".
   2. Log in with the account it names.
   3. Hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.hirelegalhelp.com. Report every step as PASS or FAIL with what you saw. Take a screenshot of anything wrong or confusing. Never type real client information; use only made-up details.

Logins:
- test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.hirelegalhelp.com/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.

To sign out at the end of a group, click the initials in the top right of the DELA page, then "Sign out".

1. Freelancer (ask me to log in as the test freelancer)
1. Open www.hirelegalhelp.com/dela?tab=work. Scroll to "Your engagements" near the bottom and click the completed engagement.
2. Expect a "Closeout" card (milestones accepted, paid, paid out, still open) and a "Reviews" card below it.
3. In "Reviews", write a review of the attorney:
   1. Type "Client John Smith, SSN 123-45-6789, was happy" in "Your review", choose a rating for each question, choose "Yes" for working together again, and click "Publish my review". Expect a message to remove client information.
   2. Change the text to "Clear instructions and quick feedback on every draft." and click "Publish my review". Expect "Review published" and your review shown under "Your review of the attorney".
4. Open www.hirelegalhelp.com/dela?tab=profile. Scroll to the "Your reviews" card at the bottom.
5. Under "Ask a past client for a review", type a made-up name and an email address you can open (for example stacey+pastclient@lawfecta.com), and click "Send the request". Expect the request listed as "Sent".
6. Click the initials in the top right, then "AI settings". Scroll to the "Webhooks" card at the bottom.
   1. In "Add an endpoint", type https://10.0.0.1/dela, tick "A bench invitation" and click "Add the endpoint". Expect a message that the address points inside a private network.
   2. Replace it with the webhook.site address I gave you, keep "A bench invitation" and also tick "A new review about you", and click "Add the endpoint". Expect "Your signing secret" with a long value. Click "Close".
   3. Click "Send a test". Expect "Test notice delivered (200)". (I can check webhook.site shows it.)
7. Sign out.

2. Attorney (ask me to log in as the test attorney)
1. Open www.hirelegalhelp.com/dela?tab=projects. In "Engagements", click the completed engagement.
2. In "Reviews", expect "The review the freelancer wrote about you" with the freelancer's text.
3. Type a short thank you in "Your public response" and click "Post the response". Expect it under the review as "Response: ...".
4. Write a negative review of the freelancer: ratings of 2, "No" for hiring again, and the text "The packet came in two days late and needed a lot of fixing." Click "Publish my review". Expect it published (not held).
5. Under "Your bench", type a short note and click "Invite to my bench". Expect "Your bench invitation is waiting for their answer."
6. Click "Talent" in the row of tabs, then "My bench" at the top. Expect the freelancer with "Invitation sent".
7. Sign out.

3. Freelancer again (ask me to log in as the test freelancer)
1. Open www.hirelegalhelp.com/dela?tab=work. Expect a "Benches" card with the attorney's invitation and the note. Click "Accept".
2. Click "Message". Expect a bench conversation saying it shares no files, with no "Attach a file" and no "Book a meeting". Type "Happy to help with the next one." and click "Send".
3. Open the completed engagement again. Under "The review the attorney wrote about you", click "Report this review" and type a short reason. Expect "Reported to the Lawfecta Team".
4. Narrow the window to phone width: nothing runs off the side on the engagement, the Inbox and the bench conversation. Widen it again.
5. Sign out.

4. Owner (ask me to log in as the owner)
1. Open www.hirelegalhelp.com/dela-admin and click "Reviews and bench" in the row of tabs. Expect counts at the top and "Reported reviews (1)".
2. In the report, type "An honest negative opinion stays up." in the reason box and click "Keep it up". Expect "Kept up; both were told".
3. Sign out.

5. Check the results
1. Open the email address from group 1, step 5 (check spam too). Expect an email asking for a review, with "There is no reward". Click the link (no login needed).
2. On the page, type TX as the state and "x" as the bar number, fill the rest, tick the box and click "Send my review". Expect a message to check the bar number. Type 24055555 and send again. Expect "Thank you".
3. Log in as the test freelancer, open www.hirelegalhelp.com/dela?tab=profile and scroll to "Your reviews". Expect the attorney's review, and a separate section "From past clients (outside Lawfecta)" with the new review. Sign out.
4. On webhook.site, expect the test notice and a "bench.invited" notice from step 2.5. Each has a "dela-signature" header.

Final report:
- a table of every step with PASS or FAIL
- anything confusing, slow (over 30 seconds) or worded badly
- the exact text of every error message

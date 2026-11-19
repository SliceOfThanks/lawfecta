# ChatGPT test 11: the new "Agreement and work" page and the new step 1 of "Post a New Gig" (steps 43 and 44, 2026-11-18)

What it covers: the engagement page for an attorney and for a freelancer (the "Next action" card, "Review payment", "Milestone progress", "Agreement summary", "What happens next?", "How milestone payments work", the folded sections, and the on-page step before accepting a milestone), and step 1 of posting a gig (one form, its mistakes, Monthly, the estimate, the bottom row).

What it cannot cover: a real payment on Stripe, really accepting a milestone, signing, a saved card's brand and last four digits (that needs a paid engagement), a screen reader and a phone. The automated tests cover paying, accepting, the keyboard and 320 pixels wide.

What changes on the site: nothing. No payment, no acceptance, no signature, no gig. The test never clicks "Continue to Stripe", a button that starts with "Yes, accept", "Sign version" or "Draft with DELA" with a valid form.

About the sample engagements: the "(QA)" engagements were placed in the database as samples, with no payment records. So a milestone there can read "Acceptance: Accepted" and "Payment: Not paid yet", and "Paid to date" reads $0. That is the page telling the truth about its records, and the steps below expect it.

Two logins: the test attorney, then the test freelancer. Each logs in once.

Before you paste this:
1. The password is filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. When ChatGPT reaches the login page: click "Take over", log in as the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

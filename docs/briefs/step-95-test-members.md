# Feature brief: test accounts that need nobody from the Lawfecta Team

Step: 95
Spec references: step 5 (license and LinkedIn checks), step 7d (agencies), step 68 (free until hired), the audit of 2026-11-25 (real payments are on)
Status: built in acceleration mode. Stacey 2026-11-28: "I don't want to do anything. I want ChatGPT to be able to do its thing, so ensure these accounts have staging responsibilities to allow them to do all activities. I want ChatGPT to evaluate UX/UI and workflow of onboarding, so make it without my manual task."

## Who
A test account that an agent (ChatGPT) signs up and drives on the live site, to judge how onboarding looks and flows. The owner lists the account's email before the run.

## What
A member whose email is on the list of test members, for as long as the entry lasts:
- gets the plan named on the list, and a place on the Access list, the moment their workspace is made;
- has their bar license, their LinkedIn check and their agency's business details passed at once by DELA, so the agent goes on without waiting for the Lawfecta Team;
- can never start a payment or open a payout account.

## Where
- Database: migration 0173 (table `test_members`, the functions `dela_test_member`, `dela_test_apply`, `dela_test_member_set`, five triggers, one guard at the start of `dela_payment_next`).
- Server: `chargeOrCheckout`, `engagementPay`, `payoutSetup` answer "test_account" before Stripe is asked.
- Screens: the words "This is a test account. Test accounts cannot pay or set up payouts."

## When
From the moment the listed email first shows up in DELA until the entry ends (seven days unless said otherwise, never more than thirty).

## Why
The site is live and takes real money, and there is no separate test site. An agent cannot wait for a person to verify a license or give a plan, and a person should not have to sit beside it.

## How it could go wrong
- **A stranger signs up with a listed email first** and is approved as an attorney without a license. The website does not prove an email belongs to the person. What limits it: entries are short-lived, the email is only known to the owner and the agent, the first account to arrive is the only one the entry ever serves, and every start is written to the audit log. The emails must not be published.
- **A test account moves real money.** It cannot: the payment function, the one place every charge passes, and the payout set-up all refuse a test member before Stripe is asked. A test checks that the outside service is never called.
- **A test account works with a real member** (invites them, takes their gig). Nothing in the code stops that; the test script tells the agent to work only with the other test accounts.
- **A real member is listed by mistake** and loses the ability to pay. The list is set by the owner by email, and an entry ends by itself.
- **The record says a license was checked.** It says the opposite: "Test member: passed by DELA, nobody looked this license up".
- **Left on for good.** No entry lasts more than thirty days.

## Settings and switches it uses
- No setting and no switch. The list is the table `test_members`, empty until the owner adds an entry with `select dela_test_member_set('<email>', '<plan>', <days>, '<note>')`.
- No business number.

## Questions Claude answered itself (acceleration mode, 2026-11-28)
1. Approve by hand before the run, or let DELA pass the checks as they are submitted? **As they are submitted.** The agent then goes through the real screens (it types a made-up bar number, asks for the LinkedIn check, saves the business details) and sees what a member sees after approval.
2. Which plans? **Attorney Pro, Freelancer Pro and Freelancer Business (agency)**, as plans given by the Team. No payment and no change on the website's own billing.
3. May a test account pay? **Never.** The site is in Stripe's live mode.
4. Is there an admin page for the list? **No.** Claude adds entries when Stacey asks for a test run, and says so.
5. What cannot be made hands-free? **The "I'm not a robot" check on the website's sign-up and login pages.** Getting past it by a trick is not something Claude does. An agent that can tick it goes on alone; one that cannot needs a person for that one click per account.

## Success looks like
- A listed email arrives: plan and Access list at once.
- Its license, LinkedIn check and business details pass at the moment they are submitted, and the record says DELA did it.
- An unlisted member, an entry that ran out and a second account with a listed email get nothing.
- Pay and payout set-up answer "test_account", and no outside service is asked.

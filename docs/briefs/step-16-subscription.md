# Feature brief: Subscription page and the limit banner

Step: 16 (after go-live)   Spec references: step 9b usage limits (docs/briefs/step-9b-attorney-usage-limits.md), plans in config/decisions.json
Status: approved to build (Stacey 2026-11-12, in chat)

## Who
Every member with a workspace: attorneys and freelancers, on every plan.

## What
Stacey 2026-11-12: "lets create a menu item under profile ... that is "subscription" that shows what subscription they are on, what it allows, and their current usage, it should show them if they are nearing monthly usage. below should show all available plans for their account type with the plan they are on highlighted ("your current plan") with the ability to click upgrade button to upgrade and/or downgrade. separately we should create a banner that pops up top when they login (that they can dismiss each time) when they are nearing their monthly limits".

## Where
- Member menu: "Subscription", directly under "Profile" (sidebar on a computer, "More" on a phone). Address: /dela?tab=subscription.
- The banner: at the top of whatever DELA page the member lands on after logging in.
- Plan changes and payment stay on the Lawfecta website (Brilliant Directories): https://www.lawfecta.co/account/upgrade. Stacey's picture of that page (2026-11-12) shows a member can choose any other plan of their workspace there, higher or lower. Her list of plans and what each can switch to is in docs/reference/lawfecta-plan-links-2026-11-12.txt.

## When
- The page shows live numbers each time it opens.
- The banner shows once per login when any limit is at or above the warning level, until the member clicks "Dismiss". It comes back at the next login if the member is still near a limit.

## Why
Members could not see their plan, their usage or how to change plan from inside DELA, and login now sends everyone to /dela, so they no longer pass the website's "Upgrade Listing" button.

## How it could go wrong
- DELA cannot change a plan or take a plan payment; only the website can. The buttons open the website in a new tab and the page says so. After a change, the member reloads DELA and the new plan shows.
- Prices are shown from DELA's approved plan versions (admin Plans page). If a price is changed on the website and not in DELA, the two disagree. The page says the website's price is the one charged.
- A plan given by the Lawfecta Team, or a plan DELA does not list (Pro Founding Member, Agency Business Lifetime, Claim Listing), still shows the member's own plan and usage; the plan list shows the four standard plans of their workspace.
- A lower plan can make documents read-only (attorneys). The downgrade button says so before the member leaves for the website.
- Limits shared by a firm count the firm's use; the page says "shared by your firm".

## Settings and switches it uses
- usage.warn_pct (80): when a bar turns amber and when the banner shows.
- usage.upgrade_url (/account/upgrade): where the Upgrade and Downgrade buttons go.
- Plan names, prices, platform fee and allowances: the approved plan versions (admin Plans page).
- Shown in the new layout (switch new_layout, on for everyone).

## Questions to make it better
Asked in chat 2026-11-12; Stacey answered with the upgrade page picture and the plan list. Defaults used where she did not choose:
1. Prices are shown (DELA already holds them and they match the website today).
2. Upgrade and Downgrade both open the website's upgrade page, because that page offers both.
3. The banner covers every limit (monthly ones and saved documents and storage), for both workspaces, at the 80% setting.

## Success looks like
A member opens Subscription and sees their plan, what it allows, bars for what they have used with a clear mark when near a limit, and the other plans of their workspace with one button each. A member near a limit sees one banner after login and can dismiss it.

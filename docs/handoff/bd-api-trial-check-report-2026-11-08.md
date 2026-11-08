# BD API trial check report (Stacey's BD connector chat, 2026-11-08)

Saved as sent. Claude built lib/trial/bd-live.ts from it.

- Search members: GET /api/v2/user/get. Filters: property=subscription_id; signup_date via property[]/property_value[]/property_operator[] (gt, lt, between, since_days; values YYYYMMDDHHmmss). Paging: cursor, limit default 25, max 100, next_page token. Permission: Users (Standard). Test result (connector key): works; subscription_id=8 returned 0 members.
- users_meta: list GET /api/v2/users_meta/get (filter database=users_data, database_id=<user_id>, key=<key>); get GET /api/v2/users_meta/get/{meta_id}; create POST /api/v2/users_meta/create (database, database_id, key, value); update PUT /api/v2/users_meta/update (meta_id, value; send database and database_id too); delete DELETE /api/v2/users_meta/delete (meta_id). Permission: User Metadata (Advanced, off by default). Test result (connector key): works; user 687 keys = sign_up_origin, send_email_notifications, last_login_ip.
- Invoices: read POST /api/v2/user/transactions (user_id). Status field invoice_details.status: Paid, Unpaid. Unpaid also has datepaid 0000-00-00 00:00:00. Can cancel: no.
- Subscriptions: read POST /api/v2/user/subscriptions (user_id). Fields packageid, nextduedate, billingcycle, domainstatus (Active, Cancelled, ...). Can cancel: no.
- Change plan with user update: yes, PUT /api/v2/user/update subscription_id. User 687 was moved plan 3 to plan 5 this way; no invoice or subscription was created. Moving onto or off a paid plan is untested. The profile URL slug also changed.
- Posts: search GET /api/v2/data_posts/get?property=user_id&property_value=<id>; hide PUT /api/v2/data_posts/update post_id + post_status=0 (0 = Draft, not public). Multi-image: users_portfolio_groups, group_status=0.
- Areas of law: PUT /api/v2/user/update with delete_categories=1 and services=<IDs to keep>.
- Permissions: Users (Standard); Single Image Posts (Standard); User Metadata (Advanced); User Services (Advanced, only for rel_services/delete). Billing reads not mapped to a named switch in the docs.
- Gaps: no API to cancel or void an invoice; no API to cancel a subscription; changing subscription_id away from a paid plan is untested; exact permission labels unpublished; no member has a billing record yet.
- Anything changed or created: nothing.

## Decisions taken from it (Claude, 2026-11-08)
- Canceling the unpaid invoice and the subscription is a task for the Lawfecta Team in BD admin, listed in the Trials tab and the daily summary email (Stacey's question 2).
- A paid invoice whose plan BD does not name counts as paid for the member's own plan, so a payer is never downgraded.
- The BD status value for Active is not confirmed: setting trial.bd_active_value is empty, DELA leaves the status alone, and the BD admin task says to check it.
- Post types: the setting trial.free_hidden_types must hold BD's own post type values before Live; the Dry run shows what BD calls them.

## Learned from the Dry runs on Trial Tester (BD member 689), 2026-11-08
- POST /api/v2/user/transactions with user_id in the form is right (BD's own spec in brilliant-directories-mcp, mcp/openapi/bd-api.json, getUserTransactions). BD answers "user_id or client_id is required" when the member has no billing account, even with user_id sent. BD's own connector rewrites that answer as "No billing account for this member: 0 subscriptions, 0 transactions". DELA reads either one as no invoices, because the member came from BD's own search.
- GET on that path answers 405 Invalid Request Method.
- The reply is { total, invoices: [{ invoice_details, subscription_details }] }; the plan is subscription_details.packageid (subscription_details is false when there is none). BD's connector removes subscription_details.password; DELA never keeps that field.
- client_id is never used: it is a billing record number and can return another person's invoices.
- A member added through BD's API has no billing account. To test a real unpaid invoice, the member must sign up through the site's checkout.

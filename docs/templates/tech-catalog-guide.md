# Tech catalog CSV: what each column means

The Lawfecta Team uploads one CSV file with every tool in the catalog. A new upload replaces the whole list. DELA shows what will be added, changed and removed before you confirm, and keeps every earlier version so you can see the history. DELA's AI recommends tools only from this list.

Template with one example row: docs/templates/tech-catalog-template.csv. The example row is only to show the format; check every fact before uploading.

## How to fill it in
- One row per tool. The first row is the column names, exactly as in the template.
- Where a cell holds several things, separate them with a semicolon and a space, for example: Solo; 2-10; 11-50
- Put a cell in double quotes if it contains a comma.
- Leave a cell empty if you do not know. Required columns are marked below.
- Save as CSV (UTF-8) from Google Sheets (File, Download, Comma separated values) or Excel (Save as, CSV UTF-8).

## The columns
| Column | Required | What to put | Example |
|---|---|---|---|
| tool_id | Yes | A short id that never changes, lowercase with dashes. DELA uses it to match the same tool across uploads. | clio-manage |
| name | Yes | The product name members know | Clio Manage |
| vendor | Yes | The company | Clio |
| website | Yes | The product's web address, starting with https:// | https://www.clio.com |
| category | Yes | One main category: Practice management, Document management, Billing and payments, E-signature, Client intake, Legal research, Calendaring and docketing, Communication, Automation, Document automation, Accounting, AI assistant, E-filing, Other | Practice management |
| subcategories | No | More specific areas, separated by semicolons | Case management; Billing; Calendar |
| description | Yes | Two or three plain sentences: what it does | Cloud practice management for law firms... |
| best_for | Yes | Who and what it suits best | Solo and small firms that want one place for matters and billing |
| not_good_for | No | When not to recommend it | Firms that only need document storage |
| practice_areas | No | Practice areas it suits (use the profile's names), or All | All; Family law; Personal injury |
| firm_sizes | Yes | Any of: Solo; 2-10; 11-50; 51+ | Solo; 2-10; 11-50 |
| roles | No | Who uses it day to day: Attorney; Paralegal; Office manager; Assistant | Attorney; Paralegal |
| key_features | Yes | Main features, separated by semicolons | Matter management; Time tracking; Billing |
| ai_features | No | Built-in AI, if any | AI assistant for summaries and drafting |
| integrations | No | Tools it connects to, separated by semicolons | Microsoft 365; QuickBooks; LawPay |
| platforms | No | Web; Windows; Mac; iOS; Android | Web; iOS; Android |
| pricing_model | Yes | Per user per month, Per firm per month, Per use, One time, Free | Per user per month |
| starting_price_usd_month | No | Lowest monthly price in whole dollars, or empty if it varies | 49 |
| free_plan | Yes | Yes or No | No |
| free_trial_days | No | Number of trial days, or 0 | 7 |
| setup_time | No | Rough time to get started | 1 to 2 weeks |
| learning_curve | No | Low, Medium or High | Medium |
| support | No | Email; Chat; Phone; Help center; Onboarding | Email; Chat; Phone |
| data_location | No | Where data is stored | US; EU |
| security | No | Certifications and protections | SOC 2 Type II; Encryption at rest |
| client_portal | No | Yes or No | Yes |
| alternatives | No | Other tool names in this catalog, separated by semicolons | MyCase; PracticePanther |
| notes_for_ai | No | Anything DELA's AI should weigh when recommending: when to suggest it, when not to, what to check first | Recommend when the firm has no practice management system... |
| lawfecta_partner | Yes | Yes or No. Shown to members as a label. It never changes the order DELA recommends in. | No |
| status | Yes | active, or paused to keep it in the list but stop recommending it | active |
| last_reviewed | Yes | The date you last checked the facts, as YYYY-MM-DD | 2026-11-05 |

## What DELA does with it
- When a member asks for help with a process, DELA first asks what tools they already use (their profile has them), then recommends only active tools from this list that fit their practice area, firm size, budget and the tools they already have.
- It says why, in plain words, and names a gap honestly when nothing in the list fits. The Lawfecta Team then gets a note to consider adding a tool.
- A partner label never moves a tool up. Paused tools are never recommended.
- Profile tech tools (Step 3) are linked to catalog entries by name, so matching can use them.

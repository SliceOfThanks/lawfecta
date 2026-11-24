# Feature brief: the Lawfecta Team connector and the attorney pipeline

Step: 82 (releases 82a, 82b, 82c)   Spec references: step 2b (the members' connector), step 17 (the website's categories), step 4 (gigs and proposals), step 6 (agreements)
Status: 82a, 82b and 82c built in acceleration mode. Stacey 2026-11-24: "Do we have an MCP connector? If yes - we need one for ADMIN only - so we can automate creation of claim listings and the info in them for growth and scale." Then she set the scope: an attorney record, a prefilled playbook, stage tracking, a stalled list ("Michelle's follow-up checklist could be built from this list"), a gig draft, a proposal check, and weekly counts by stage "so I can update Ivme and the Blue Goals tab without anyone entering numbers".

## Who
Stacey (owner), Michelle and anyone else Stacey names. Nobody else: no member, and no other team role.

## What
A second connector for ChatGPT and Claude, apart from the members' one, and a page in the admin area with the same numbers.
- **82a (this release):** the connector itself, the team role "growth", the pipeline, the attorney record, stage tracking, the stalled list, the proposal check, the weekly counts, and the "Pipeline" page.
- **82b:** a playbook prepared for an attorney from their public website, kept as a marked draft in their Library, and a gig draft that appears when the attorney approves that playbook.
- **82c:** claim listings created on the website from a sheet Stacey reviews first.

The tools in 82a: `pipeline_rules`, `pipeline_add`, `attorney_find`, `attorney_record`, `outreach_mark`, `pipeline_stalled`, `pipeline_gigs`, `pipeline_counts`.

## Where
- The connector's address ends in /mcp/admin. It is shown on the admin area's "Pipeline" page, with a Copy button.
- Admin area: "Pipeline" (under Members), and the role "Growth" on the "Lawfecta Team" page.
- The approval screen is the DELA page a person lands on from ChatGPT or Claude (/dela?tab=connect).
- Server: migration 0161, the routes POST /mcp/admin, GET /admin/pipeline, POST /admin/pipeline/add and /admin/pipeline/mark.

## When
- An attorney enters the pipeline when someone adds them by their website member number. DELA reads the listing from the website then.
- "Listing built" is recorded at that moment if the listing is on a claim plan. "Emailed" is recorded when a person or their agent says the email went out.
- "Claimed", "Gig posted", "Proposals received" and "Hired" are read from DELA each time someone looks: the attorney has an attorney workspace, opened a gig, got a sent proposal, signed an agreement.
- "Playbook made" and "Playbook opened" start with 82b.

## Why
Outreach to attorneys is the growth plan. Today nobody can say how many attorneys are at each step without counting by hand, and nobody is told when an attorney goes quiet.

## How it could go wrong
- Someone outside the team uses it: a connection is of the admin kind only when the sign-in asked for the Team address and a person holding the role approved it on DELA with their own login. The role and the switch are checked again on every call. A member's connection is refused here, and a team connection is refused by the members' connector.
- A person leaves the team: taking the role away stops their connection at the next call.
- The agent contacts attorneys: no tool sends anything. Recording outreach makes no email, no notification and no job.
- The agent invents a stage: only "emailed" and "follow-up" can be recorded by a person. The other stages cannot be typed in.
- The same call is sent twice: recording needs a request_id and is kept once.
- A record is changed later: the record of outreach is append-only.
- Contact details travel to the AI app: a listing's email and phone are not passed on. The team reads them on the website.
- The website does not answer: nothing is added, and the tool says which member numbers failed and why.
- A flood of calls: a limit for each connection in a minute (setting pipeline.calls_per_minute), and the emergency pause for connectors stops it.
- A stalled rule is wrong for the business: all five are one setting, and the list follows a change at once.

## Settings and switches it uses
- New switch mcp_admin: off, then "Lawfecta Team only".
- New settings: pipeline.stalled (proposed: 7 days emailed and not claimed, 2 days claimed and playbook not opened, 3 days claimed and no gig, 48 hours a gig with no proposals, 5 days proposals and no hire), pipeline.claim_plan_ids ([6, 15]), pipeline.calls_per_minute (60).
- Existing: emergency.pause (connector), mcp.access_minutes, site.url.
- No price and no fee.

## Stacey's answers (2026-11-24)
1. Who are the listings for? "both, plus agency cliam listing".
2. Where does listing information come from? **A sheet I review first.**
3. Do claim listings show in Talent search or on the website? **No, direct link only**, in both places.
4. Does the connector contact people? **No, it only creates.** She or Michelle send outreach from their own tool.
5. How many playbooks for an attorney? **One, chosen by practice area.**
6. How is a prepared playbook shown? **A draft, marked as prepared by Lawfecta.**
7. Who connects? "michelle and i, and anyone else i designate - how would i do so? Add them as admin in BD? Or another role?" Answer: a role in DELA's own admin area, not in Brilliant Directories. Admin area, "Lawfecta Team", the member's website number, the role "Growth", "Add". The person must have opened DELA once.

## Questions Claude answered itself (acceleration mode, 2026-11-24)
1. Three releases, where the plan said two? **Yes.** Preparing a playbook in another person's account needs an AI path that runs for the team and a daily cap, and the gig draft can only exist once the attorney approves the playbook. That is its own release (82b), so the tracking Michelle needs is not held back by it.
2. How is an attorney named in the pipeline? **By their website member number**, so they can be tracked before they have ever opened DELA.
3. May the role "growth" add attorneys, or only read? **Add and record outreach too.** Both only write to the pipeline's own list.
4. Does the connector pass on a listing's email address? **No.** Outreach addresses stay on the website and in the outreach tool.
5. Is a follow-up a stage? **No.** It is recorded and shown as "last reached out"; the stage date stays the first email.
6. What is the week in "weekly counts"? **Monday to Sunday**, and any two dates can be asked for.
7. What does a person with only the role "growth" see? **The Pipeline page in the admin area**, and nothing new in the member app.
8. To whom is the switch opened? **"Lawfecta Team only".** The role still decides who can use it.

## Release 82b as built (2026-11-24): a playbook prepared for an attorney
- **Two more tools, for the owner only:** `playbook_prefill` and `gig_draft_from_playbook`. The role "growth" does not see them.
- **Who reads the website:** the owner's agent, in its own browser. It passes the page's address and its text. DELA never opens a website.
- **Which playbook:** one for each attorney, picked by a word in their practice area from the setting pipeline.practice_playbooks (family, injury, estate, immigration, criminal, and a default). Stacey changes the list in Settings, under "Pipeline".
- **What the AI is sent:** the website text after the same clean-up as any upload (no passwords, no client names, no contact details), with the line that it is material and never instructions. What the AI writes is cleaned again.
- **Where it is kept:** with the pipeline, waiting. No account is made for anyone in advance. The first time the attorney opens DELA with an attorney workspace, it is put into their own Library as their draft.
- **How it is marked:** a notice on top of the page, "Prepared for you by Lawfecta from your public website (the site's name). Check every step before you use it." Every step carries "DELA's suggestion" until the attorney confirms it. It is never approved by anyone but the attorney.
- **Stages:** "Playbook made" when it is prepared, "Playbook opened" the first time someone at the attorney's firm opens it.
- **The gig draft:** a gig is always made from an approved playbook, by the attorney. So `gig_draft_from_playbook` sets a flag, and once the attorney approves the prepared playbook its notice offers "Post as a Flex Gig", which starts the usual gig draft from it.
- **Cost:** each one uses Lawfecta's own AI. A cap for a day is a setting (pipeline.prefill_per_day, 20).
- **Off until decided:** the switch pipeline_prefill is off. Its gate is the lawyer's review of preparing content for people before they sign up.

Questions Claude answered itself for 82b:
1. Make the attorney's account in advance, as the plan said, or let the playbook wait? **Let it wait.** An account made in advance would count the attorney as "claimed" before they did anything, would start their plan clock, and could send them DELA's own notices before they ever signed up.
2. May a prepared playbook be replaced? **While it waits, yes, with "replace". Once it is in the attorney's Library it is theirs.**
3. What if the attorney's Library is full? **It keeps waiting** and is tried again the next time they open the Library.
4. Does the attorney get an email that it is there? **No.** The team's own outreach says so.

## Release 82c as built (2026-11-24): claim listings from a reviewed sheet
- **Four more tools:** `claim_batch_check`, `claim_listing_fix` and `claim_listing_remove` for the owner; `claim_batch_status` for the owner and "growth".
- **The sheet:** docs/templates/claim-listings-sheet.csv. Columns: kind (freelancer, attorney or agency), first_name, last_name, company, city, state, country, website, category, description, source_url, email. Any other column makes the row invalid, so a phone number or a bar number cannot ride along.
- **Checking:** every row is checked and answered with its own problem in plain words. Duplicates are found against earlier batches (same website, same name and state, or same email), against DELA's members, and against people who asked not to be listed. A row's email address is kept for the listing and never given back to the AI app.
- **Nothing is created by the connector.** The batch waits in the admin area, on the Pipeline page, under "Listing batches". An owner opens it and clicks "Create these listings". The role "growth" can read a batch and cannot approve one.
- **Creating:** a job creates the ready rows a few at a time on the claim plan for their kind (setting claim.plan_ids). The website is asked first whether the email address is already a member. No welcome email is asked for. The password the website requires is a long random one that nobody knows and DELA does not keep; the person sets their own when they claim.
- **A row with no email address** gets an address on a domain Stacey names (setting claim.placeholder_domain). Until she names one, such a row is not created.
- **After creating:** an attorney's listing joins the pipeline as "Listing built".
- **Correcting and taking down:** only a listing DELA created, and only while nobody has claimed it. Taking down sets the listing to canceled on the website (hidden, not deleted) and remembers the person so they are not listed again.
- **Stops:** 50 rows in a batch and 100 listings in a day (settings).
- **Off until decided:** the switch claim_listings is off.

Questions Claude answered itself for 82c:
1. Create at once after approval, or by a job? **By a job, a few at a time**, so a large batch cannot time out halfway and a failed row does not stop the rest.
2. What does "take down" do on the website? **It sets the listing to canceled**, which hides it. Nothing is deleted.
3. Is a claimed listing still the team's to change? **No.** Once the person has a DELA account, the listing is theirs.
4. Does the category come as a name or a number? **Either**; it must be one of the website's top categories, and DELA never makes a new category.

What Stacey does on the website before the switch is turned on:
1. Make the plan "Agency Claim Listing" (free, a claim listing) and put its number in the setting claim.plan_ids.
2. Turn "Listing Searchable" off on the three claim plans, so a listing opens by its direct link only.
3. Allow the DELA API key to create and change members (Developer Hub, the API key, Permissions).
4. Name the placeholder email domain (setting claim.placeholder_domain), if rows without an email address should be created.

## Where the build differs from the plan she approved
- Release 1 of the plan is split in two (82a and 82b), for the reason in question 1.
- The tool `pipeline_add` is new. The plan had attorneys enter the pipeline only through a created listing; attorneys who are already on the website can now be added by number.
- A draft gig cannot be made before the attorney approves the playbook, because a gig is always made from an approved version. In 82b the draft gig is made at the moment the attorney approves, by their own action.

## Success looks like
Owner login, in the admin area:
- "Pipeline" shows the eight stages with three numbers each, a "Stuck" list, "Add attorneys", the list of attorneys and the connector's address.
- Adding a website member number shows the attorney with their firm and place. A listing on a claim plan reads "Listing built".
- "Record email" asks where it was sent from, moves the attorney to "Emailed" and sends nothing.
- "Lawfecta Team" offers the role "Growth".

In Claude or ChatGPT, as the owner: adding the address brings the owner to DELA, where the screen says what the connector can and cannot do; after "Approve" the app lists eight tools, and "who is stuck" answers from the same list as the page.

-- Step 95: test accounts that need nobody from the Lawfecta Team (docs/briefs/step-95-test-members.md).
-- Stacey 2026-11-28: "I don't want to do anything. I want ChatGPT to be able to do its thing, so ensure these accounts
-- have staging responsibilities to allow them to do all activities."
-- A member whose email is on the owner's list of test members, for as long as the entry lasts:
--   gets the plan named on the list, and a place on the Access list, the moment their workspace is made;
--   has their bar license, their LinkedIn check and their agency's business details passed at once, by DELA;
--   can never start a payment or a payout account. The site takes real money, and a test must not.
-- The list is empty in this file. Entries are added on the site, by email, and each one ends by itself.
-- Additive: one table, new functions and triggers, one guard at the start of the payment function.

create table if not exists test_members (
  email text primary key check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
  plan_code text not null references plans(code),
  expires_at timestamptz not null,
  -- Filled when the account first shows up, so the entry belongs to that one website member from then on
  bd_member_id bigint,
  note text not null default '',
  created_at timestamptz not null default now()
);
alter table test_members enable row level security;

create or replace function dela_test_member(p_person uuid) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select exists (select 1 from test_members t join people pe on lower(pe.email) = t.email
    where pe.id = p_person and t.expires_at > now() and (t.bd_member_id is null or t.bd_member_id = pe.bd_member_id))
$$;
revoke all on function dela_test_member(uuid) from public, anon, authenticated;

-- The plan and the Access list. Safe to run any number of times.
create or replace function dela_test_apply(p_person uuid) returns void language plpgsql set search_path = public, extensions, pg_temp as $$
declare t test_members; pe people; v_side text;
begin
  select * into pe from people where id = p_person;
  if pe.id is null or coalesce(pe.email, '') = '' then return; end if;
  select * into t from test_members where email = lower(pe.email) and expires_at > now() and (bd_member_id is null or bd_member_id = pe.bd_member_id);
  if t.email is null then return; end if;
  if t.bd_member_id is null then
    update test_members set bd_member_id = pe.bd_member_id where email = t.email;
    perform dela_audit('system', null, 'test_member_started', 'person', pe.id::text, jsonb_build_object('plan', t.plan_code, 'until', t.expires_at));
  end if;
  select side into v_side from plans where code = t.plan_code;
  update side_profiles set plan_code = t.plan_code, plan_source = 'staff_grant', updated_at = now()
    where person_id = pe.id and side = v_side and (plan_code is distinct from t.plan_code or plan_source is distinct from 'staff_grant');
  if pe.bd_member_id is not null and not exists (select 1 from access_list where bd_member_id = pe.bd_member_id and channel = 'access' and revoked_at is null) then
    insert into access_list (bd_member_id, channel, note) values (pe.bd_member_id, 'access', 'Test member, added by DELA');
  end if;
end $$;
revoke all on function dela_test_apply(uuid) from public, anon, authenticated;

create or replace function dela_test_on_person() returns trigger language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  -- One function for two tables: the row is read by name, since only one of the two columns exists on each
  perform dela_test_apply((to_jsonb(new) ->> case when tg_table_name = 'people' then 'id' else 'person_id' end)::uuid);
  return null;
end $$;
revoke all on function dela_test_on_person() from public, anon, authenticated;

drop trigger if exists people_test_member on people;
create trigger people_test_member after insert or update of email, bd_member_id on people for each row execute function dela_test_on_person();
drop trigger if exists side_profiles_test_member on side_profiles;
create trigger side_profiles_test_member after insert on side_profiles for each row execute function dela_test_on_person();

-- The three checks the Lawfecta Team does by hand, passed by DELA for a test member
create or replace function dela_test_pass_license() returns trigger language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if new.status <> 'pending' or not dela_test_member(new.person_id) then return null; end if;
  update licenses set status = 'verified', identity = 'video', video_done_at = now(), reason = '', lookup_note = 'Test member: passed by DELA, nobody looked this license up',
    decided_at = now(), next_check_at = (now() + interval '12 months')::date, recheck_due = false, updated_at = now() where id = new.id;
  perform dela_verify_event('license', new.id, new.person_id, 'system', null, 'verified', jsonb_build_object('identity', 'video', 'note', 'Test member: passed by DELA'));
  perform dela_audit('system', null, 'license_verified', 'license', new.id::text, jsonb_build_object('test_member', true));
  perform dela_profile_refresh(new.person_id, 'attorney');
  perform dela_notify(jsonb_build_object('person_id', new.person_id, 'side', 'attorney', 'kind', 'verification', 'title', 'Your license is verified',
    'body', 'This is a test account, so DELA passed the license check by itself.', 'link', '/dela?tab=profile', 'dedupe_key', 'testlic:' || new.id));
  return null;
end $$;
revoke all on function dela_test_pass_license() from public, anon, authenticated;
drop trigger if exists licenses_test_member on licenses;
create trigger licenses_test_member after insert or update of status on licenses for each row execute function dela_test_pass_license();

create or replace function dela_test_pass_linkedin() returns trigger language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if new.status <> 'pending' or not dela_test_member(new.person_id) then return null; end if;
  update linkedin_checks set status = 'verified', name_matches = true, badge_seen = true, reason = '', decided_at = now() where id = new.id;
  perform dela_verify_event('linkedin', new.id, new.person_id, 'system', null, 'verified', jsonb_build_object('note', 'Test member: passed by DELA'));
  perform dela_audit('system', null, 'linkedin_verified', 'linkedin_check', new.id::text, jsonb_build_object('test_member', true));
  perform dela_profile_refresh(new.person_id, 'freelancer');
  perform dela_notify(jsonb_build_object('person_id', new.person_id, 'side', 'freelancer', 'kind', 'verification', 'title', 'Your LinkedIn profile is checked',
    'body', 'This is a test account, so DELA passed the LinkedIn check by itself.', 'link', '/dela?tab=profile', 'dedupe_key', 'testli:' || new.id));
  return null;
end $$;
revoke all on function dela_test_pass_linkedin() from public, anon, authenticated;
drop trigger if exists linkedin_checks_test_member on linkedin_checks;
create trigger linkedin_checks_test_member after insert or update of status on linkedin_checks for each row execute function dela_test_pass_linkedin();

create or replace function dela_test_pass_business() returns trigger language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if new.kind <> 'agency' or new.business_checked_at is not null or coalesce(new.business_name, '') = '' or not dela_test_member(new.owner_person_id) then return null; end if;
  update organizations set business_checked_at = now(), business_check_note = 'Test member: passed by DELA' where id = new.id;
  perform dela_audit('system', null, 'agency_business_checked', 'organization', new.id::text, jsonb_build_object('test_member', true));
  return null;
end $$;
revoke all on function dela_test_pass_business() from public, anon, authenticated;
drop trigger if exists organizations_test_member on organizations;
create trigger organizations_test_member after update of business_name, business_state on organizations for each row execute function dela_test_pass_business();

-- A test member never pays. The same answer comes from the server before it ever talks to Stripe (app.ts).
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_payment_next(uuid,text,uuid)'::regprocedure) into v_src;
  if position('dela_test_member(p_person)' in v_src) > 0 then return; end if;
  v_new := replace(v_src, $a$  if dela_agreement_role(p_person, p_side, p_agreement) <> 'attorney' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;$a$,
    $b$  if dela_test_member(p_person) then return jsonb_build_object('ok', false, 'reason', 'test_account'); end if;
  if dela_agreement_role(p_person, p_side, p_agreement) <> 'attorney' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;$b$);
  if v_new = v_src then raise exception 'dela_payment_next changed; update 0173'; end if;
  execute v_new;
end $$;

-- For the owner: add or renew a test member. Seven days unless said otherwise, never more than thirty.
create or replace function dela_test_member_set(p_email text, p_plan text, p_days int default 7, p_note text default '') returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); pe people;
begin
  if not exists (select 1 from plans where code = p_plan) then return jsonb_build_object('ok', false, 'reason', 'bad_plan'); end if;
  insert into test_members (email, plan_code, expires_at, note) values (v_email, p_plan, now() + make_interval(days => greatest(1, least(30, coalesce(p_days, 7)))), left(coalesce(p_note, ''), 200))
  on conflict (email) do update set plan_code = excluded.plan_code, expires_at = excluded.expires_at, note = excluded.note;
  perform dela_audit('system', null, 'test_member_listed', 'test_member', v_email, jsonb_build_object('plan', p_plan));
  for pe in select * from people where lower(email) = v_email loop perform dela_test_apply(pe.id); end loop;
  return jsonb_build_object('ok', true, 'email', v_email, 'until', (select expires_at from test_members where email = v_email));
end $$;
revoke all on function dela_test_member_set(text, text, int, text) from public, anon, authenticated;

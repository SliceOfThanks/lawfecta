-- Step 67: contact details are taken out of freelancer profiles (Stacey 2026-11-20: "the freelancer should not be
-- able to add emails, phone numbers, websites, booking links etc. Freelancers should get a notification stating that
-- that was removed because it's a violation of the terms of service and inform them that a second violation may have
-- them removed from the platform or suspended").
-- The api removes the details before saving (lib/profiles/contact.ts) and records each time here. The record is
-- append-only. Nobody is suspended by code: from the second time the owner is alerted and decides on the Members page.
-- Additive: one table, one function, one count added to the member record.

insert into feature_switches (key, label, gate) values ('profile_contact_rule', 'No contact details in freelancer profiles: emails, phone numbers, websites, booking links and chat names are removed on saving, with a notice to the freelancer (step 67)', 'Stacey asked for it 2026-11-20; on for everyone on the site after the release')
on conflict (key) do nothing;

create table if not exists profile_violations (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id),
  side text not null,
  place text not null default 'profile' check (place in ('profile', 'agency_profile')),
  kinds text[] not null default '{}',
  fields text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table profile_violations enable row level security;
create index if not exists profile_violations_person on profile_violations (person_id, created_at desc);
create or replace function profile_violations_keep() returns trigger language plpgsql set search_path = public, extensions, pg_temp as $$
begin raise exception 'profile_violations is append-only'; end $$;
revoke all on function profile_violations_keep() from public, anon, authenticated;
drop trigger if exists profile_violations_keep on profile_violations;
create trigger profile_violations_keep before update or delete on profile_violations for each row execute function profile_violations_keep();

-- Records one removal, tells the member, and alerts the owner from the second time on. p_words: the kinds in plain words.
create or replace function dela_profile_violation(p_person uuid, p_side text, p_place text, p_kinds text[], p_fields text[], p_words text)
returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v uuid; n int; v_name text;
begin
  if coalesce(array_length(p_kinds, 1), 0) = 0 then return jsonb_build_object('ok', true, 'count', 0); end if;
  insert into profile_violations (person_id, side, place, kinds, fields)
  values (p_person, p_side, case when p_place = 'agency_profile' then 'agency_profile' else 'profile' end, p_kinds, coalesce(p_fields, '{}')) returning id into v;
  select count(*) into n from profile_violations where person_id = p_person;
  perform dela_notify(jsonb_build_object('person_id', p_person, 'side', p_side, 'kind', 'conduct', 'essential', true, 'email', true,
    'title', 'Contact details were removed from your profile',
    'body', 'DELA removed ' || coalesce(nullif(p_words, ''), 'contact details') || ' from your ' || case when p_place = 'agency_profile' then 'agency profile' else 'profile' end
      || coalesce(' (' || nullif(array_to_string(p_fields, ', '), '') || ')', '') || '. Putting contact details in a profile is a violation of the Lawfecta Terms of Service: '
      || 'attorneys contact you and hire you through Lawfecta. The rest of your profile was saved. '
      || case when n >= 2 then 'This is not the first time. Your account may now be suspended or removed from the platform.'
              else 'A second violation may lead to your account being suspended or removed from the platform.' end,
    'link', '/dela?tab=profile', 'dedupe_key', 'profviol:' || v));
  perform dela_audit('system', p_person, 'profile_contact_removed', 'person', p_person::text, jsonb_build_object('kinds', p_kinds, 'fields', p_fields, 'place', p_place, 'count', n));
  if n >= 2 then
    select display_name into v_name from people where id = p_person;
    perform dela_alert('conduct', 'Contact details in a profile again', coalesce(v_name, 'A member') || ' put contact details in a profile for the ' || n
      || case when n = 2 then 'nd' when n = 3 then 'rd' else 'th' end || ' time. DELA removed them. Open the member on the Members page to decide.', 'profviol:' || v);
  end if;
  return jsonb_build_object('ok', true, 'count', n);
end $$;
revoke all on function dela_profile_violation(uuid, text, text, text[], text[], text) from public, anon, authenticated;

create or replace function dela_patch(p_sig text, p_pairs text[]) returns void language plpgsql as $$
declare v_src text; v_new text; i int;
begin
  select pg_get_functiondef(p_sig::regprocedure) into v_src;
  v_new := v_src;
  for i in 1 .. array_length(p_pairs, 1) / 2 loop
    if position(p_pairs[i * 2] in v_new) > 0 and position(p_pairs[i * 2 - 1] in v_new) = 0 then continue; end if;
    if position(p_pairs[i * 2 - 1] in v_new) = 0 then raise exception '% changed; update 0148 (looking for: %)', p_sig, left(p_pairs[i * 2 - 1], 80); end if;
    v_new := replace(v_new, p_pairs[i * 2 - 1], p_pairs[i * 2]);
  end loop;
  if v_new <> v_src then execute v_new; end if;
end $$;

-- The member record on the Members page counts them
do $$ begin
  perform dela_patch('dela_member_detail(uuid,bigint)', array[
    '''firms'', (select count(*) from org_members m where m.person_id = p.id and m.status = ''active'')),',
    '''firms'', (select count(*) from org_members m where m.person_id = p.id and m.status = ''active''),
      ''profile_violations'', (select count(*) from profile_violations pv where pv.person_id = p.id),
      ''last_violation_at'', (select max(pv.created_at) from profile_violations pv where pv.person_id = p.id)),']);
end $$;
drop function if exists dela_patch(text, text[]);

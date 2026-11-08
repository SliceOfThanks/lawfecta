-- Fixes from the AI review of 0.10.0 (GitHub issue #11). Additive.

-- Security 3, payments 2, tests 1: one trial check at a time. The daily run, "Run the check now" and the sign-in backstop
-- take this lease first; a second check skips while one is running. The lease ends by itself after p_minutes, so a run
-- that stops without letting go never blocks the job for good.
create table if not exists trial_lock (
  id int primary key check (id = 1),
  holder text not null default '',
  until timestamptz
);
alter table trial_lock enable row level security;
insert into trial_lock (id) values (1) on conflict (id) do nothing;

create or replace function dela_trial_lock(p_holder text, p_minutes int) returns boolean language sql as $$
  with u as (update trial_lock set holder = p_holder, until = now() + make_interval(mins => greatest(p_minutes, 1))
    where id = 1 and (until is null or until < now()) returning 1)
  select exists (select 1 from u)
$$;

create or replace function dela_trial_unlock(p_holder text) returns void language sql as $$
  update trial_lock set until = null where id = 1 and holder = p_holder
$$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_trial_lock', 'dela_trial_unlock') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end $$;

-- Privacy 2 and security 4: turning on the sensitive data rule (client_details_allowed) no longer releases held files on
-- their old reason labels alone. The files whose owner the switch covers, held only for client details, go back to
-- "checking"; the api runs the file check again under the new rule (all six sensitive kinds), and only a file that comes
-- back clear is released, with the notice and an audit line. The old function stays for older code.
create or replace function dela_files_recheck_list(p_actor uuid) returns jsonb language plpgsql as $$
declare f record; v_ids uuid[] := '{}';
  v_ok text[] := array['date_of_birth', 'case_number', 'federal_case_number', 'client_name', 'case_caption', 'phone_number',
    'email_address', 'street_address', 'client_information', 'party_name', 'address', 'contact_details', 'case_fact', 'matter',
    'name', 'phone', 'email', 'docket_number', 'client_names', 'case_numbers', 'party_names', 'addresses', 'phone_numbers',
    'email_addresses', 'dates_of_birth', 'names', 'case_facts', 'case_details', 'client_details'];
begin
  perform dela_require_staff(p_actor, '{}');
  for f in select * from files where status = 'held' and purpose = 'member' and check_state = 'flagged'
      and jsonb_array_length(check_reasons) > 0
      and not exists (select 1 from jsonb_array_elements_text(check_reasons) r
        where not (btrim(regexp_replace(lower(r), '[^a-z]+', '_', 'g'), '_') = any (v_ok)))
      and dela_switch_on('client_details_allowed', uploaded_by)
  loop
    update files set status = 'checking', check_state = 'pending' where id = f.id and status = 'held';
    v_ids := v_ids || f.id;
  end loop;
  return to_jsonb(v_ids);
end $$;

create or replace function dela_files_recheck_done(p_actor uuid, p_file uuid) returns boolean language plpgsql as $$
declare f files;
begin
  perform dela_require_staff(p_actor, '{}');
  select * into f from files where id = p_file;
  if f.id is null or f.status <> 'ready' then return false; end if;
  perform dela_audit('staff', p_actor, 'file_released_client_details', 'file', f.id::text, jsonb_build_object('rechecked', true));
  perform dela_notify(jsonb_build_object('person_id', f.uploaded_by, 'side', f.side, 'kind', 'files',
    'title', '"' || left(f.name, 120) || '" is ready',
    'body', 'DELA held this file because it named a client or case. Client details are allowed in your Files tab, and DELA checked the file again for sensitive data, so it is now ready to use. Sensitive data (SSNs, ID numbers, account numbers, health information, biometric data, passwords) is still never allowed.',
    'link', '/dela?tab=files', 'dedupe_key', 'file_released:' || f.id));
  return true;
end $$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_files_recheck_list', 'dela_files_recheck_done') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end $$;

-- Payments 6: the post types Free loses are a setting, and the Trials tab reads the plan numbers, the run hour and the
-- reminder days from settings instead of repeating them as text
insert into settings (key, value, label, section, unit, status, source, note) values
  ('trial.free_hidden_types', '["video", "promotion", "article"]', 'Post types hidden when a trial member moves to Free', 'Trials', 'BD post types', 'C', 'Developer notes 2026-11-06', 'Videos, Promotions and Community Articles are unpublished at the downgrade, never deleted (AI review 0.10.0, payments 6: a setting, not code).')
on conflict (key) do nothing;

create or replace function dela_trial_settings() returns jsonb language sql stable as $$
  select jsonb_build_object('on', dela_switch_on('bd_trial_downgrade', null),
    'mode', dela_setting_text('trial.downgrade_mode', 'dry_run'),
    'days', dela_int_setting('trial.days', 7), 'reminder_days', dela_int_setting('trial.reminder_days', 2),
    'run_hour', dela_int_setting('trial.run_hour', 2),
    'eligible_from', dela_setting_text('trial.eligible_from', ''), 'free_areas', dela_int_setting('trial.free_areas', 3),
    'plans', coalesce(dela_setting('trial.bd_plans'), '{"pro": 8, "free": 3, "plus": 7, "agency": 9, "trial": [7, 8], "never": [5, 10, 11, 12, 13, 14]}'),
    'allowances', coalesce(dela_setting('trial.allowances'), '{}'),
    'free_hidden_types', coalesce(dela_setting('trial.free_hidden_types'), '["video", "promotion", "article"]'),
    'summary_to', dela_setting_text('trial.summary_to', ''),
    'site_url', dela_setting_text('site.url', ''), 'environment', dela_setting_text('environment', 'staging'),
    'sender', dela_setting_text('email.sender', 'log'), 'from_name', dela_setting_text('email.from_name', 'Lawfecta DELA'), 'from_address', dela_setting_text('email.from_address', ''))
$$;
alter function dela_trial_settings() set search_path = public, extensions, pg_temp;

-- Payments 4: a pending monthly change shows the total each month with the platform fee, now and proposed, worked out
-- with the same formula the renewal charges (0049, dela_monthly_renewals)
create or replace function dela_monthly_fee_for(p_agreement uuid, p_price int) returns int language sql stable as $$
  select greatest(round(p_price * coalesce((select (v.body->'fees'->>'attorney_bps')::int from agreements a join agreement_versions v on v.agreement_id = a.id and v.version = a.version where a.id = p_agreement),
      dela_int_setting('fee.client_bps', 500)) / 10000.0)::int,
    case when coalesce((dela_setting('recurring.fee_floor_each_month') #>> '{}')::boolean, true) then dela_int_setting('fees.floor_cents_per_party', 1000) else 0 end)
$$;
revoke all on function dela_monthly_fee_for(uuid, int) from public, anon, authenticated;
alter function dela_monthly_fee_for(uuid, int) set search_path = public, extensions, pg_temp;

-- Privacy 4: the monthly due dates never change a unit that is already accepted or refunded (0061 recalculated every
-- unit that was not canceled). Same function otherwise.
create or replace function dela_monthly_dates(p_period uuid) returns void language plpgsql as $$
declare pr monthly_periods; a agreements; v_n int; v_i int := 0; m milestones; v_plan date; v_calc date; v_due date; v_last date; v_note text;
begin
  select * into pr from monthly_periods where id = p_period;
  select * into a from agreements where id = pr.agreement_id;
  select count(*) into v_n from milestones where period_id = pr.id and status <> 'canceled';
  v_last := pr.ends_on + pr.paused_days;
  for m in select * from milestones where period_id = pr.id and status <> 'canceled' order by seq loop
    v_i := v_i + 1;
    -- Accepted or refunded units keep their date: finished, paid history is never rewritten (AI review 0.10.0, privacy 4)
    continue when m.status in ('accepted', 'refunded');
    -- The date both people signed for this unit (month 1 only: later months are not in the signed version)
    select nullif(e->>'due_date', '')::date into v_plan from agreement_versions v, jsonb_array_elements(v.body->'milestones') e
      where v.agreement_id = a.id and v.version = m.from_version and (e->>'seq')::int = m.seq limit 1;
    v_calc := case when v_i = v_n then pr.ends_on else pr.starts_on + v_i * 7 - 1 end;
    v_due := case when v_plan is not null and v_plan >= pr.starts_on and v_plan <= pr.ends_on then v_plan else v_calc end;
    v_due := dela_business_day_within(v_due + pr.paused_days, v_last);
    v_note := case when v_plan is null or v_due = v_plan then ''
      when pr.paused_days > 0 then 'Moved ' || pr.paused_days || ' days while payment was paused'
      when v_plan < pr.starts_on or v_plan > pr.ends_on then 'The month started on ' || to_char(pr.starts_on, 'FMMon FMDD')
      else 'Moved to a business day' end;
    update milestones set due_date = v_due, planned_due_date = coalesce(v_plan, planned_due_date), due_note = v_note, updated_at = now() where id = m.id;
  end loop;
end $$;
alter function dela_monthly_dates(uuid) set search_path = public, extensions, pg_temp;
revoke all on function dela_monthly_dates(uuid) from public, anon, authenticated;

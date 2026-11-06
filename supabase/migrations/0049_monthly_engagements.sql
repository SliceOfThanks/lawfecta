-- Step 7c, part 1: monthly recurring engagements (docs/briefs/step-7c-recurring-repeat-hiring.md, Stacey's answers
-- 2026-11-06). A monthly engagement is an agreement of kind 'monthly' with its terms (the listed tasks with quantities,
-- the price, Weekly units or One monthly delivery) and its months (periods). Each month is one payment that funds that
-- month's units; each unit is checked, accepted and paid like a milestone. The billing day is the day month 1 is paid
-- (clamped in shorter months), in the attorney's time zone. 3 days before billing the next month is drafted and both are
-- reminded; it is charged on the billing day with the saved payment method and opens only when paid. A failed renewal
-- pauses new work, retries on day 2 and day 5, and ends after 14 days paused. Either side cancels, effective at the end
-- of the paid month; undoing needs the other side. Changes start next month only if approved 1 day before billing.
-- Every renewal charge is claimed inside the same locked step that checks the cancellation, with one unique key per
-- month and attempt, so a cancellation landing during a renewal never causes a charge (test T13). Additive.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('recurring.change_deadline_days', '1', 'A scope or price change starts next month only if approved at least this many days before billing', 'Milestones, review and recurring work', 'days', 'C', 'Stacey 2026-11-06 (step 7c answers), answer 10', ''),
  ('recurring.fee_floor_each_month', 'true', 'The minimum platform fee per party applies to each paid month', 'Milestones, review and recurring work', '', 'C', 'Stacey 2026-11-06 (step 7c answers), answer 13', 'Each month is a separate payment; the higher of 5% and the minimum applies.'),
  ('recurring.holidays', '"us_federal"', 'Holidays that move a due date to the next business day', 'Milestones, review and recurring work', '', 'C', 'Stacey 2026-11-06 (step 7c answers), answer 15', 'In the attorney''s time zone.'),
  ('recurring.weekly_units', '4', 'Weekly units in one month when the two choose Weekly units', 'Milestones, review and recurring work', 'units', 'O', 'Claude suggestion', 'The last unit covers the rest of the month.'),
  ('recurring.renewals_stopped', 'false', 'Emergency stop: no renewal charges run while this is on', 'Milestones, review and recurring work', '', 'C', 'Brief step 7c (the emergency stop for renewals)', 'Set from the admin Recurring tab. Reminders and drafting still run; nothing is charged.'),
  ('standing.max_months', '12', 'Longest standing arrangement', 'Milestones, review and recurring work', 'months', 'C', 'Stacey 2026-11-06 (step 7c answers), answer 19', ''),
  ('standing.default_months', '6', 'Standing arrangement length unless changed', 'Milestones, review and recurring work', 'months', 'C', 'Stacey 2026-11-06 (step 7c answers), answer 19', ''),
  ('standing.default_open_jobs', '3', 'Most jobs open at once on a standing arrangement, unless changed', 'Milestones, review and recurring work', 'jobs', 'C', 'Stacey 2026-11-06 (step 7c answers), answer 19', ''),
  ('standing.decline_hours', '24', 'Hours a freelancer has to decline a repeat hire (the attorney is refunded in full)', 'Milestones, review and recurring work', 'hours', 'C', 'Stacey 2026-11-06 (step 7c answers), answer 21', ''),
  ('standing.min_attorney_plan', '"att_plus"', 'Lowest attorney plan that can set up a standing arrangement', 'Milestones, review and recurring work', '', 'C', 'Stacey 2026-11-06 (step 7c answers), answer 25', '')
on conflict (key) do nothing;
update settings set status = 'C', source = 'Stacey 2026-11-06 (step 7c answers), answer 7' where key in ('recurring.retry_spacing_days', 'recurring.pause_limit_days') and status <> 'C';
update settings set value = '"weekly_units_default_or_one_monthly"', status = 'C', source = 'Stacey 2026-11-06 (step 7c answers), answer 5' where key = 'recurring.release_unit' and status <> 'C';

alter table gigs add column if not exists kind text not null default 'one_off' check (kind in ('one_off', 'monthly'));
alter table agreements add column if not exists kind text not null default 'one_off' check (kind in ('one_off', 'monthly'));
alter table payments drop constraint if exists payments_kind_check;
alter table payments add constraint payments_kind_check check (kind in ('start', 'milestone', 'period'));

create table if not exists monthly_terms (
  agreement_id uuid primary key references agreements(id),
  price_cents int not null check (price_cents > 0),
  unit_mode text not null default 'weekly' check (unit_mode in ('weekly', 'monthly')),
  tasks jsonb not null default '[]',
  timezone text not null default 'America/Chicago',
  billing_day int check (billing_day between 1 and 31),
  consent_at timestamptz,
  consent_by uuid references people(id),
  status text not null default 'setup' check (status in ('setup', 'active', 'paused', 'ended')),
  paused_since date,
  cancel_effective date,
  cancel_by uuid references people(id),
  cancel_at timestamptz,
  undo_requested_by uuid references people(id),
  end_now_requested_by uuid references people(id),
  ended_at timestamptz,
  ended_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table monthly_terms enable row level security;

create table if not exists monthly_periods (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id),
  n int not null check (n >= 1),
  starts_on date,
  ends_on date,
  bill_on date,
  price_cents int not null check (price_cents > 0),
  fee_cents int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'due', 'paid', 'failed', 'canceled')),
  attempts int not null default 0,
  failed_on date,
  next_retry_on date,
  paused_days int not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agreement_id, n)
);
alter table monthly_periods enable row level security;
alter table milestones add column if not exists period_id uuid references monthly_periods(id);
alter table payments add column if not exists period_id uuid references monthly_periods(id);
create index if not exists milestones_period on milestones (period_id) where period_id is not null;

create table if not exists monthly_changes (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id),
  proposed_by uuid not null references people(id),
  proposer_role text not null check (proposer_role in ('attorney', 'freelancer')),
  price_cents int not null check (price_cents > 0),
  unit_mode text not null check (unit_mode in ('weekly', 'monthly')),
  tasks jsonb not null,
  note text not null default '',
  status text not null default 'open' check (status in ('open', 'approved', 'declined', 'applied', 'withdrawn')),
  decided_by uuid references people(id),
  decided_at timestamptz,
  applied_n int,
  created_at timestamptz not null default now()
);
alter table monthly_changes enable row level security;

-- ---------- Dates: the billing day, business days and US federal holidays (answers 2 and 15) ----------
create or replace function dela_nth_weekday(p_year int, p_month int, p_dow int, p_n int) returns date language sql immutable as $$
  select (make_date(p_year, p_month, 1) + ((p_dow - extract(dow from make_date(p_year, p_month, 1))::int + 7) % 7) + (p_n - 1) * 7)::date
$$;
create or replace function dela_last_weekday(p_year int, p_month int, p_dow int) returns date language sql immutable as $$
  select (x - ((extract(dow from x)::int - p_dow + 7) % 7))::date from (select (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date x) s
$$;
-- A fixed-date holiday on a Saturday is observed on Friday; on a Sunday, on Monday
create or replace function dela_observed(p date) returns date language sql immutable as $$
  select case extract(dow from p)::int when 6 then p - 1 when 0 then p + 1 else p end
$$;
create or replace function dela_us_holiday(p date) returns boolean language sql immutable as $$
  select p in (
    dela_observed(make_date(y, 1, 1)), dela_nth_weekday(y, 1, 1, 3), dela_nth_weekday(y, 2, 1, 3), dela_last_weekday(y, 5, 1), dela_observed(make_date(y, 6, 19)),
    dela_observed(make_date(y, 7, 4)), dela_nth_weekday(y, 9, 1, 1), dela_nth_weekday(y, 10, 1, 2), dela_observed(make_date(y, 11, 11)), dela_nth_weekday(y, 11, 4, 4),
    dela_observed(make_date(y, 12, 25)), dela_observed(make_date(y + 1, 1, 1)))
  from (select extract(year from p)::int y) s
$$;
create or replace function dela_business_day(p date) returns date language plpgsql immutable as $$
declare d date := p;
begin
  while extract(dow from d) in (0, 6) or dela_us_holiday(d) loop d := d + 1; end loop;
  return d;
end $$;
-- The billing date in a month: the billing day, or the last day of a shorter month
create or replace function dela_bill_date(p_from date, p_months int, p_day int) returns date language sql immutable as $$
  select make_date(extract(year from m)::int, extract(month from m)::int, least(p_day, extract(day from (m + interval '1 month' - interval '1 day'))::int))
  from (select date_trunc('month', p_from + make_interval(months => p_months))::date m) s
$$;
create or replace function dela_monthly_today(p_agreement uuid) returns date language sql stable as $$
  select (now() at time zone coalesce((select timezone from monthly_terms where agreement_id = p_agreement), dela_tz()))::date
$$;

-- ---------- Agreements of kind monthly ----------
create or replace function dela_monthly_kind() returns trigger language plpgsql as $$
begin
  if new.kind = 'one_off' and exists (select 1 from gigs g where g.id = new.gig_id and g.kind = 'monthly') then new.kind := 'monthly'; end if;
  return new;
end $$;
drop trigger if exists agreements_monthly_kind on agreements;
create trigger agreements_monthly_kind before insert on agreements for each row execute function dela_monthly_kind();
create or replace function dela_monthly_terms_new() returns trigger language plpgsql as $$
begin
  if new.kind <> 'monthly' then return new; end if;
  insert into monthly_terms (agreement_id, price_cents, timezone)
  values (new.id, greatest(new.total_cents, 1), coalesce((select timezone from meeting_availability where person_id = new.attorney_person), dela_tz()))
  on conflict (agreement_id) do nothing;
  return new;
end $$;
drop trigger if exists agreements_monthly_terms on agreements;
create trigger agreements_monthly_terms after insert on agreements for each row execute function dela_monthly_terms_new();

-- What each month includes (answer 4): every task names how often, an included quantity and a turnaround; never unlimited
create or replace function dela_monthly_tasks_ok(p jsonb) returns text language plpgsql immutable as $$
declare t jsonb;
begin
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) = 0 then return 'monthly_tasks_needed'; end if;
  if jsonb_array_length(p) > 12 then return 'too_many_tasks'; end if;
  for t in select x from jsonb_array_elements(p) x loop
    if length(btrim(coalesce(t->>'task', ''))) < 3 then return 'monthly_task_needs_name'; end if;
    if coalesce(t->>'frequency', '') not in ('daily', 'weekly', 'every_two_weeks', 'monthly') then return 'monthly_task_needs_frequency'; end if;
    if coalesce((t->>'quantity')::numeric, 0) < 1 or (t->>'quantity')::numeric <> round((t->>'quantity')::numeric) then return 'monthly_task_needs_quantity'; end if;
    if position('unlimited' in lower(t::text)) > 0 then return 'no_unlimited'; end if;
  end loop;
  return null;
end $$;

-- The terms before both sign (either side drafts them; the api adds a new version both sign)
create or replace function dela_monthly_terms_save(p_person uuid, p_side text, p_agreement uuid, p jsonb) returns jsonb language plpgsql as $$
declare a agreements; t monthly_terms; v_role text := dela_agreement_role(p_person, p_side, p_agreement); v_why text; v_price int;
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into a from agreements where id = p_agreement for update;
  select * into t from monthly_terms where agreement_id = p_agreement for update;
  if a.kind <> 'monthly' or t.agreement_id is null then return jsonb_build_object('ok', false, 'reason', 'not_monthly'); end if;
  if a.status not in ('draft', 'sent', 'signing') then return jsonb_build_object('ok', false, 'reason', 'use_change_request'); end if;
  v_why := dela_monthly_tasks_ok(coalesce(p->'tasks', t.tasks));
  if v_why is not null then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  v_price := coalesce((p->>'price_cents')::int, t.price_cents);
  if v_price < dela_int_setting('engagement.minimum_cents', 25000) then return jsonb_build_object('ok', false, 'reason', 'total_too_small', 'min_cents', dela_int_setting('engagement.minimum_cents', 25000)); end if;
  update monthly_terms set tasks = coalesce(p->'tasks', tasks), price_cents = v_price,
    unit_mode = case when p->>'unit_mode' in ('weekly', 'monthly') then p->>'unit_mode' else unit_mode end, updated_at = now()
  where agreement_id = a.id returning * into t;
  perform dela_audit('member', p_person, 'monthly_terms_saved', 'agreement', a.id::text, jsonb_build_object('price_cents', t.price_cents, 'unit_mode', t.unit_mode, 'tasks', jsonb_array_length(t.tasks)));
  return jsonb_build_object('ok', true, 'terms', to_jsonb(t));
end $$;

-- ---------- Units for one month ----------
-- The month's units as milestones (Weekly units: recurring.weekly_units of them, the last covering the rest of the month;
-- One monthly delivery: one). Amounts add up to the price in whole dollars, the remainder on the last. The freelancer fee
-- for the month (with the minimum, each month) is shared across them. Due dates move past weekends and holidays.
create or replace function dela_monthly_units(p_period uuid) returns void language plpgsql as $$
declare pr monthly_periods; t monthly_terms; a agreements; av agreement_versions; v_n int; v_i int; v_seq int; v_amt int; v_left int; v_fee int; v_fleft int; v_falloc int; v_due date; v_bps int; v_floor int;
begin
  select * into pr from monthly_periods where id = p_period;
  select * into t from monthly_terms where agreement_id = pr.agreement_id;
  select * into a from agreements where id = pr.agreement_id;
  select * into av from agreement_versions where agreement_id = a.id and version = a.version;
  if exists (select 1 from milestones where period_id = pr.id) then return; end if;
  v_n := case when t.unit_mode = 'weekly' then greatest(dela_int_setting('recurring.weekly_units', 4), 1) else 1 end;
  v_bps := coalesce((av.body->'fees'->>'freelancer_bps')::int, dela_int_setting('fee.freelancer_bps', 500));
  v_floor := coalesce((av.body->'fees'->>'floor_cents')::int, dela_int_setting('fees.floor_cents_per_party', 1000));
  v_fee := case when coalesce((av.body->'fees'->>'bench_waiver')::boolean, false) then 0 else least(greatest(round(pr.price_cents * v_bps / 10000.0)::int, v_floor), pr.price_cents) end;
  v_left := pr.price_cents; v_fleft := v_fee;
  select coalesce(max(seq), 0) into v_seq from milestones where agreement_id = a.id;
  for v_i in 1 .. v_n loop
    v_amt := case when v_i = v_n then v_left else floor(pr.price_cents / v_n / 100.0)::int * 100 end;
    v_left := v_left - v_amt;
    v_falloc := case when v_i = v_n then v_fleft else floor(v_fee * v_amt / pr.price_cents::numeric)::int end;
    v_fleft := v_fleft - v_falloc;
    v_due := case when pr.starts_on is null then null when v_i = v_n then pr.ends_on else pr.starts_on + v_i * 7 - 1 end;
    insert into milestones (agreement_id, seq, title, amount_cents, freelancer_fee_cents, due_date, deliverables, from_version, period_id)
    values (a.id, v_seq + v_i, case when v_n = 1 then 'Month ' || pr.n || ' delivery' else 'Month ' || pr.n || ', week ' || v_i end, v_amt, v_falloc,
      case when v_due is null then null else dela_business_day(v_due + pr.paused_days) end,
      case when v_n = 1 then 'The month''s included work, as listed in the terms' else 'This week''s share of the month''s included work, as listed in the terms' end, a.version, pr.id);
  end loop;
end $$;

-- Dates of a month once it starts; due dates move by the days it was paused (answer 9)
create or replace function dela_monthly_dates(p_period uuid) returns void language plpgsql as $$
declare pr monthly_periods; v_n int; v_i int := 0; m milestones;
begin
  select * into pr from monthly_periods where id = p_period;
  select count(*) into v_n from milestones where period_id = pr.id and status <> 'canceled';
  for m in select * from milestones where period_id = pr.id and status <> 'canceled' order by seq loop
    v_i := v_i + 1;
    update milestones set due_date = dela_business_day((case when v_i = v_n then pr.ends_on else pr.starts_on + v_i * 7 - 1 end) + pr.paused_days), updated_at = now() where id = m.id;
  end loop;
end $$;

-- Both signed a monthly agreement: month 1 is set up from the units in the agreement (made by the signing step)
create or replace function dela_monthly_signed() returns trigger language plpgsql as $$
declare t monthly_terms; v_period uuid; v_fee int;
begin
  if new.kind <> 'monthly' or new.status <> 'signed' or old.status = 'signed' then return new; end if;
  select * into t from monthly_terms where agreement_id = new.id;
  if t.agreement_id is null or exists (select 1 from monthly_periods where agreement_id = new.id) then return new; end if;
  v_fee := coalesce(new.attorney_fee_cents, 0);
  insert into monthly_periods (agreement_id, n, price_cents, fee_cents, status) values (new.id, 1, new.total_cents, v_fee, 'due') returning id into v_period;
  update milestones set period_id = v_period where agreement_id = new.id and period_id is null;
  update monthly_terms set price_cents = new.total_cents, updated_at = now() where agreement_id = new.id;
  return new;
end $$;
drop trigger if exists agreements_monthly_signed on agreements;
create trigger agreements_monthly_signed after update of status on agreements for each row execute function dela_monthly_signed();

-- ---------- Paying a month ----------
-- The month to pay: month 1 by the attorney's click, later months by the renewal (p_system true), or a retry and the
-- "Pay now" link after a failed or 3-D Secure renewal. One payment row per month and attempt.
create or replace function dela_monthly_payment_next(p_person uuid, p_side text, p_agreement uuid, p_system boolean default false) returns jsonb language plpgsql as $$
declare a agreements; t monthly_terms; pr monthly_periods; p payments; v_key text; v_attempt int;
begin
  if not p_system then
    if dela_agreement_role(p_person, p_side, p_agreement) <> 'attorney' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
    if not dela_switch_on('milestone_funding', p_person) then return jsonb_build_object('ok', false, 'reason', 'funding_off'); end if;
    if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  end if;
  select * into a from agreements where id = p_agreement for update;
  select * into t from monthly_terms where agreement_id = p_agreement for update;
  if a.kind <> 'monthly' or t.agreement_id is null then return jsonb_build_object('ok', false, 'reason', 'not_monthly'); end if;
  if a.status not in ('signed', 'active') or t.status = 'ended' then return jsonb_build_object('ok', false, 'reason', 'not_signed'); end if;
  if exists (select 1 from disputes d where d.agreement_id = a.id and d.status in ('notice', 'team_review')) then return jsonb_build_object('ok', false, 'reason', 'in_dispute'); end if;
  select * into pr from monthly_periods where agreement_id = a.id and status in ('due', 'failed') order by n limit 1;
  if pr.id is null then return jsonb_build_object('ok', false, 'reason', 'nothing_to_pay'); end if;
  -- Never a charge for a month that starts after the cancellation date (T13): checked here, under the same lock
  if t.cancel_effective is not null and pr.n > 1 and pr.starts_on > t.cancel_effective then
    update monthly_periods set status = 'canceled', updated_at = now() where id = pr.id;
    update milestones set status = 'canceled', updated_at = now() where period_id = pr.id and status in ('pending', 'awaiting_funding');
    return jsonb_build_object('ok', false, 'reason', 'canceled');
  end if;
  select * into p from payments where period_id = pr.id and status in ('requires_payment', 'processing', 'succeeded') order by created_at desc limit 1;
  if p.id is null then
    v_attempt := (select count(*) from payments x where x.period_id = pr.id);
    v_key := 'period:' || pr.id::text || ':' || v_attempt;
    insert into payments (agreement_id, period_id, kind, amount_cents, fee_cents, idem_key) values (a.id, pr.id, 'period', pr.price_cents + pr.fee_cents, pr.fee_cents, v_key)
    on conflict (idem_key) do nothing returning * into p;
    if p.id is null then select * into p from payments where idem_key = v_key; end if;
  end if;
  return jsonb_build_object('ok', true, 'payment_id', p.id, 'status', p.status, 'amount_cents', p.amount_cents, 'fee_cents', p.fee_cents, 'kind', 'period', 'idem_key', p.idem_key,
    'period', jsonb_build_object('id', pr.id, 'n', pr.n, 'bill_on', pr.bill_on, 'price_cents', pr.price_cents), 'checkout_url', p.checkout_url,
    'milestone', jsonb_build_object('seq', pr.n, 'title', 'Month ' || pr.n), 'monthly', true,
    'customer', a.provider_customer, 'payment_method', a.provider_payment_method, 'gig_title', (select title from gigs where id = a.gig_id), 'gig_id', a.gig_id, 'agreement_id', a.id,
    'attorney_person', a.attorney_person, 'payer_side', case when dela_agreement_client_is_agency(a.id) then 'freelancer' else 'attorney' end);
end $$;

create or replace function dela_period_payment_result(p_payment uuid, p_status text, p_ref text, p_customer text, p_method text, p_failure text) returns jsonb language plpgsql as $$
declare p payments; a agreements; t monthly_terms; pr monthly_periods; m milestones; v_today date; v_spacing jsonb; v_next date; v_retries int;
begin
  select * into p from payments where id = p_payment for update;
  if p.status = 'succeeded' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  select * into a from agreements where id = p.agreement_id for update;
  select * into t from monthly_terms where agreement_id = a.id for update;
  select * into pr from monthly_periods where id = p.period_id for update;
  v_today := dela_monthly_today(a.id);
  if p_status = 'succeeded' then
    update payments set status = 'succeeded', provider_ref = coalesce(nullif(p_ref, ''), provider_ref), failure = '', updated_at = now() where id = p.id;
    if pr.n = 1 then
      update monthly_periods set starts_on = v_today, ends_on = dela_bill_date(v_today, 1, extract(day from v_today)::int) - 1, bill_on = v_today where id = pr.id;
      update monthly_terms set billing_day = extract(day from v_today)::int where agreement_id = a.id;
    elsif pr.status = 'failed' and pr.failed_on is not null then
      update monthly_periods set paused_days = greatest(v_today - pr.failed_on, 0) where id = pr.id;
    end if;
    update monthly_periods set status = 'paid', paid_at = now(), next_retry_on = null, updated_at = now() where id = pr.id returning * into pr;
    perform dela_monthly_dates(pr.id);
    for m in select * from milestones where period_id = pr.id and status in ('pending', 'awaiting_funding') order by seq loop
      perform dela_ledger(a.id, m.id, 'charge', m.amount_cents, p_ref, 'Month ' || pr.n || ', paid by the client');
      perform dela_ledger(a.id, m.id, 'held', m.amount_cents, p_ref, 'Held until this unit is accepted');
      update milestones set status = 'funded', funded_at = now(), updated_at = now() where id = m.id;
    end loop;
    if p.fee_cents > 0 then perform dela_ledger(a.id, null, 'attorney_fee', p.fee_cents, p_ref, 'Client platform fee, month ' || pr.n); end if;
    update agreements set status = 'active', started_at = coalesce(started_at, now()), provider_customer = coalesce(nullif(p_customer, ''), provider_customer),
      provider_payment_method = coalesce(nullif(p_method, ''), provider_payment_method), off_session_consent_at = coalesce(off_session_consent_at, case when nullif(p_method, '') is not null then now() end), updated_at = now() where id = a.id;
    update monthly_terms set status = 'active', paused_since = null, updated_at = now() where agreement_id = a.id and status <> 'ended';
    perform dela_engagement_notify(a.id, 'both', 'Month ' || pr.n || ' is paid', 'Month ' || pr.n || ' of the monthly engagement is paid and held by Lawfecta (' || dela_gig_money(pr.price_cents) || '). Its tasks are open now.', 'period_paid:' || pr.id::text);
  elsif p_status = 'processing' then
    update payments set status = 'processing', provider_ref = coalesce(nullif(p_ref, ''), provider_ref), updated_at = now() where id = p.id;
  else
    update payments set status = 'failed', failure = left(coalesce(p_failure, ''), 300), updated_at = now() where id = p.id;
    if pr.n = 1 then
      perform dela_engagement_notify(a.id, 'attorney', 'Payment did not go through', 'The payment for month 1 did not go through. Open the agreement to pay again. Work waits until it is paid.', 'failed' || p.id::text);
    else
      v_spacing := coalesce(dela_setting('recurring.retry_spacing_days'), '[2,5]');
      v_retries := least(dela_int_setting('recurring.failed_retries', 2), jsonb_array_length(v_spacing));
      v_next := case when pr.attempts < v_retries then coalesce(pr.failed_on, v_today) + (v_spacing->>pr.attempts)::int end;
      update monthly_periods set status = 'failed', failed_on = coalesce(failed_on, v_today), attempts = attempts + 1, next_retry_on = v_next, updated_at = now() where id = pr.id returning * into pr;
      update monthly_terms set status = 'paused', paused_since = coalesce(paused_since, v_today), updated_at = now() where agreement_id = a.id and status <> 'ended';
      perform dela_engagement_notify(a.id, 'both', 'The monthly payment did not go through',
        'The payment for month ' || pr.n || ' did not go through, so new work is paused. Do not start month ' || pr.n || '''s tasks. ' ||
        case when v_next is not null then 'DELA tries again on ' || to_char(v_next, 'FMMonth FMDD') || '. The attorney can also pay now from the engagement page.' else 'The attorney can pay now from the engagement page.' end ||
        ' The engagement ends if it stays unpaid for ' || dela_int_setting('recurring.pause_limit_days', 14) || ' days.', 'period_failed:' || p.id::text);
    end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- The renewal (run hourly by the worker; each step is idempotent) ----------
-- Returns the payments to charge now. The charge itself runs in the api with Stripe's idempotency key.
create or replace function dela_monthly_tick(p_only uuid default null) returns jsonb language plpgsql as $$
declare t monthly_terms; a agreements; cur monthly_periods; nx monthly_periods; v_today date; v_bill date; v_out jsonb := '[]'; v_pay jsonb; ch monthly_changes; v_stop boolean;
  v_remind int := dela_int_setting('recurring.renewal_reminder_days', 3); v_deadline int := dela_int_setting('recurring.change_deadline_days', 1); v_limit int := dela_int_setting('recurring.pause_limit_days', 14); v_fee int; v_bps int;
begin
  v_stop := coalesce((dela_setting('recurring.renewals_stopped') #>> '{}')::boolean, false);
  for t in select * from monthly_terms where status in ('active', 'paused') and (p_only is null or agreement_id = p_only) for update skip locked loop
    select * into a from agreements where id = t.agreement_id;
    if a.status not in ('active', 'signed') then continue; end if;
    v_today := dela_monthly_today(a.id);
    select * into cur from monthly_periods where agreement_id = a.id and status = 'paid' order by n desc limit 1;
    if cur.id is null then continue; end if;
    select * into nx from monthly_periods where agreement_id = a.id and n = cur.n + 1;
    -- The paid month ended after a cancellation: the engagement ends
    if t.cancel_effective is not null and v_today > t.cancel_effective then
      perform dela_monthly_end(a.id, 'canceled', 'The monthly engagement ended on ' || to_char(t.cancel_effective, 'FMMonth FMDD') || ', as canceled. Accepted work stays paid.');
      continue;
    end if;
    -- A failed renewal that stayed unpaid past the pause limit: the engagement ends
    if nx.id is not null and nx.status = 'failed' and v_today - nx.failed_on >= v_limit then
      perform dela_monthly_end(a.id, 'unpaid', 'Month ' || nx.n || ' stayed unpaid for ' || v_limit || ' days, so the monthly engagement ended. Accepted work stays paid.');
      continue;
    end if;
    v_bill := dela_bill_date(cur.starts_on, 1, coalesce(t.billing_day, extract(day from cur.starts_on)::int));
    -- 3 days before billing: approved changes that made the deadline apply, the next month is drafted, both are reminded
    if nx.id is null and v_today >= v_bill - v_remind and (t.cancel_effective is null or v_bill <= t.cancel_effective) then
      for ch in select * from monthly_changes where agreement_id = a.id and status = 'approved' and decided_at::date <= v_bill - v_deadline order by decided_at loop
        update monthly_terms set price_cents = ch.price_cents, unit_mode = ch.unit_mode, tasks = ch.tasks, updated_at = now() where agreement_id = a.id returning * into t;
        update monthly_changes set status = 'applied', applied_n = cur.n + 1 where id = ch.id;
      end loop;
      v_bps := coalesce((select (v.body->'fees'->>'attorney_bps')::int from agreement_versions v where v.agreement_id = a.id and v.version = a.version), dela_int_setting('fee.client_bps', 500));
      v_fee := greatest(round(t.price_cents * v_bps / 10000.0)::int, case when coalesce((dela_setting('recurring.fee_floor_each_month') #>> '{}')::boolean, true) then dela_int_setting('fees.floor_cents_per_party', 1000) else 0 end);
      insert into monthly_periods (agreement_id, n, starts_on, ends_on, bill_on, price_cents, fee_cents, status)
      values (a.id, cur.n + 1, v_bill, dela_bill_date(cur.starts_on, 2, coalesce(t.billing_day, extract(day from cur.starts_on)::int)) - 1, v_bill, t.price_cents, v_fee, 'draft')
      on conflict (agreement_id, n) do nothing returning * into nx;
      if nx.id is not null then
        perform dela_monthly_units(nx.id);
        perform dela_engagement_notify(a.id, 'both', 'Your monthly engagement renews on ' || to_char(v_bill, 'FMMonth FMDD'),
          'Month ' || nx.n || ' is charged on ' || to_char(v_bill, 'FMMonth FMDD') || ': ' || dela_gig_money(nx.price_cents) || ' plus the ' || dela_gig_money(nx.fee_cents) || ' platform fee. Its tasks are drafted, and they open once it is paid. To stop, cancel before then.',
          'period_reminder:' || nx.id::text);
      end if;
    end if;
    if v_stop then continue; end if;
    -- The billing day, and the retry days after a failure
    if nx.id is not null and ((nx.status = 'draft' and v_today >= nx.bill_on) or (nx.status = 'failed' and nx.next_retry_on is not null and v_today >= nx.next_retry_on)) then
      if nx.status = 'draft' then update monthly_periods set status = 'due', updated_at = now() where id = nx.id; end if;
      v_pay := dela_monthly_payment_next(a.attorney_person, 'attorney', a.id, true);
      if coalesce((v_pay->>'ok')::boolean, false) and v_pay->>'status' = 'requires_payment' then v_out := v_out || jsonb_build_array(v_pay); end if;
    end if;
  end loop;
  return v_out;
end $$;

-- The end of a monthly engagement: future months canceled, the gig place returned, both told
create or replace function dela_monthly_end(p_agreement uuid, p_reason text, p_message text) returns void language plpgsql as $$
declare a agreements; t monthly_terms; g gigs;
begin
  select * into t from monthly_terms where agreement_id = p_agreement for update;
  if t.status = 'ended' then return; end if;
  select * into a from agreements where id = p_agreement for update;
  update monthly_periods set status = 'canceled', updated_at = now() where agreement_id = a.id and status in ('draft', 'due', 'failed');
  update milestones set status = 'canceled', updated_at = now() where agreement_id = a.id and status in ('pending', 'awaiting_funding');
  update payments set status = 'canceled', updated_at = now() where agreement_id = a.id and status in ('requires_payment', 'failed') and kind = 'period';
  update monthly_terms set status = 'ended', ended_at = now(), ended_reason = p_reason, updated_at = now() where agreement_id = a.id;
  -- The agreement completes once its paid units are done; until then it stays active for them
  if not exists (select 1 from milestones m where m.agreement_id = a.id and m.status in ('funded', 'in_progress', 'submitted', 'changes_requested', 'disputed')) then
    update agreements set status = case when exists (select 1 from milestones m where m.agreement_id = a.id and m.status = 'accepted') then 'completed' else 'canceled' end,
      completed_at = case when exists (select 1 from milestones m where m.agreement_id = a.id and m.status = 'accepted') then now() else completed_at end,
      canceled_at = case when not exists (select 1 from milestones m where m.agreement_id = a.id and m.status = 'accepted') then now() else canceled_at end,
      cancel_reason = case when not exists (select 1 from milestones m where m.agreement_id = a.id and m.status = 'accepted') then left(p_reason, 200) else cancel_reason end, updated_at = now()
    where id = a.id;
  end if;
  select * into g from gigs where id = a.gig_id;
  if g.kind = 'monthly' and g.reservation_id is not null then perform dela_quota_return(g.created_by, 'attorney', 'att.gigs_active', 1, 'gig:' || g.id::text); end if;
  perform dela_engagement_notify(a.id, 'both', 'The monthly engagement ended', p_message, 'monthly_end:' || a.id::text);
  perform dela_audit('system', null, 'monthly_ended', 'agreement', a.id::text, jsonb_build_object('reason', p_reason));
end $$;

-- ---------- Cancelling, undoing it, ending early ----------
create or replace function dela_monthly_cancel(p_person uuid, p_side text, p_agreement uuid) returns jsonb language plpgsql as $$
declare v_role text := dela_agreement_role(p_person, p_side, p_agreement); t monthly_terms; cur monthly_periods;
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_role = 'freelancer' and exists (select 1 from agreements x where x.id = p_agreement and x.agency_org is not null) and not dela_agency_may_bind(p_person, p_side, p_agreement) then return jsonb_build_object('ok', false, 'reason', 'agency_managers_only'); end if;
  select * into t from monthly_terms where agreement_id = p_agreement for update;
  if t.agreement_id is null then return jsonb_build_object('ok', false, 'reason', 'not_monthly'); end if;
  if t.status = 'ended' then return jsonb_build_object('ok', false, 'reason', 'agreement_closed'); end if;
  if t.status = 'setup' then return jsonb_build_object('ok', false, 'reason', 'not_started_use_cancel'); end if;
  if t.cancel_effective is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'effective', t.cancel_effective); end if;
  select * into cur from monthly_periods where agreement_id = p_agreement and status = 'paid' order by n desc limit 1;
  update monthly_terms set cancel_effective = cur.ends_on, cancel_by = p_person, cancel_at = now(), undo_requested_by = null, updated_at = now() where agreement_id = p_agreement;
  -- A drafted next month is never charged
  update monthly_periods set status = 'canceled', updated_at = now() where agreement_id = p_agreement and n > cur.n and status in ('draft', 'due', 'failed');
  update milestones m set status = 'canceled', updated_at = now() from monthly_periods pr where m.period_id = pr.id and pr.agreement_id = p_agreement and pr.n > cur.n and m.status in ('pending', 'awaiting_funding');
  perform dela_engagement_notify(p_agreement, case when v_role = 'attorney' then 'freelancer' else 'attorney' end, 'The monthly engagement was canceled',
    'The monthly engagement ends on ' || to_char(cur.ends_on, 'FMMonth FMDD') || ', the end of the paid month. Nothing more is charged. Work already paid for this month continues.', 'monthly_cancel:' || p_agreement::text || ':' || cur.n);
  perform dela_audit('member', p_person, 'monthly_canceled', 'agreement', p_agreement::text, jsonb_build_object('effective', cur.ends_on));
  return jsonb_build_object('ok', true, 'effective', cur.ends_on);
end $$;

-- Undoing a cancellation needs the other side's approval before the date (answer 11)
create or replace function dela_monthly_undo(p_person uuid, p_side text, p_agreement uuid, p_approve boolean) returns jsonb language plpgsql as $$
declare v_role text := dela_agreement_role(p_person, p_side, p_agreement); t monthly_terms; v_other text;
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into t from monthly_terms where agreement_id = p_agreement for update;
  if t.cancel_effective is null or t.status = 'ended' then return jsonb_build_object('ok', false, 'reason', 'nothing_to_undo'); end if;
  if dela_monthly_today(p_agreement) > t.cancel_effective then return jsonb_build_object('ok', false, 'reason', 'too_late'); end if;
  v_other := case when v_role = 'attorney' then 'freelancer' else 'attorney' end;
  if t.undo_requested_by is null then
    if not p_approve then return jsonb_build_object('ok', false, 'reason', 'nothing_to_undo'); end if;
    update monthly_terms set undo_requested_by = p_person, updated_at = now() where agreement_id = p_agreement;
    perform dela_engagement_notify(p_agreement, v_other, 'A request to keep the monthly engagement', 'The other person asks to undo the cancellation, so the engagement keeps renewing. Approve or decline it on the engagement page before ' || to_char(t.cancel_effective, 'FMMonth FMDD') || '.', 'monthly_undo_ask:' || p_agreement::text || ':' || extract(epoch from now())::bigint);
    return jsonb_build_object('ok', true, 'requested', true);
  end if;
  if t.undo_requested_by = p_person then return jsonb_build_object('ok', false, 'reason', 'other_side_approves'); end if;
  if p_approve then
    update monthly_terms set cancel_effective = null, cancel_by = null, cancel_at = null, undo_requested_by = null, updated_at = now() where agreement_id = p_agreement;
    perform dela_engagement_notify(p_agreement, v_other, 'The monthly engagement continues', 'The cancellation was undone. The engagement renews on its billing day as before.', 'monthly_undo_ok:' || p_agreement::text || ':' || extract(epoch from now())::bigint);
  else
    update monthly_terms set undo_requested_by = null, updated_at = now() where agreement_id = p_agreement;
    perform dela_engagement_notify(p_agreement, v_other, 'The cancellation stays', 'The other person kept the cancellation. The engagement ends on ' || to_char(t.cancel_effective, 'FMMonth FMDD') || '.', 'monthly_undo_no:' || p_agreement::text || ':' || extract(epoch from now())::bigint);
  end if;
  perform dela_audit('member', p_person, case when p_approve then 'monthly_undo_approved' else 'monthly_undo_declined' end, 'agreement', p_agreement::text, '{}');
  return jsonb_build_object('ok', true, 'undone', p_approve);
end $$;

-- Ending early by agreement (answer 12): with Weekly units, accepted units stay paid and the rest of the month is refunded.
-- With One monthly delivery the two agree an amount through the dispute process; DELA never makes up a daily rate.
create or replace function dela_monthly_end_now(p_person uuid, p_side text, p_agreement uuid, p_approve boolean) returns jsonb language plpgsql as $$
declare v_role text := dela_agreement_role(p_person, p_side, p_agreement); t monthly_terms; m milestones; p payments; v_n int := 0;
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into t from monthly_terms where agreement_id = p_agreement for update;
  if t.agreement_id is null or t.status in ('setup', 'ended') then return jsonb_build_object('ok', false, 'reason', 'agreement_closed'); end if;
  if t.unit_mode = 'monthly' then return jsonb_build_object('ok', false, 'reason', 'monthly_delivery_use_dispute'); end if;
  if t.end_now_requested_by is null then
    if not p_approve then return jsonb_build_object('ok', false, 'reason', 'nothing_to_answer'); end if;
    update monthly_terms set end_now_requested_by = p_person, updated_at = now() where agreement_id = p_agreement;
    perform dela_engagement_notify(p_agreement, case when v_role = 'attorney' then 'freelancer' else 'attorney' end, 'A request to end the monthly engagement now',
      'The other person asks to end the monthly engagement now. If you agree, accepted units stay paid and the unstarted rest of this month is refunded to the client. Answer on the engagement page.', 'monthly_endnow_ask:' || p_agreement::text || ':' || extract(epoch from now())::bigint);
    return jsonb_build_object('ok', true, 'requested', true);
  end if;
  if t.end_now_requested_by = p_person then return jsonb_build_object('ok', false, 'reason', 'other_side_approves'); end if;
  if not p_approve then
    update monthly_terms set end_now_requested_by = null, updated_at = now() where agreement_id = p_agreement;
    return jsonb_build_object('ok', true, 'ended', false);
  end if;
  -- Units paid but not started are refunded; units in progress or submitted finish as agreed
  for m in select ms.* from milestones ms join monthly_periods pr on pr.id = ms.period_id where ms.agreement_id = p_agreement and ms.status = 'funded' for update of ms loop
    select * into p from payments where period_id = m.period_id and status = 'succeeded' order by created_at desc limit 1;
    insert into refunds (payment_id, agreement_id, milestone_id, amount_cents, reason, idem_key)
    values (p.id, p_agreement, m.id, m.amount_cents, 'Monthly engagement ended early by agreement', 'refund:' || p.id::text || ':' || m.id::text) on conflict (idem_key) do nothing;
    update milestones set status = 'refunded', updated_at = now() where id = m.id;
    v_n := v_n + 1;
  end loop;
  update monthly_terms set end_now_requested_by = null where agreement_id = p_agreement;
  perform dela_monthly_end(p_agreement, 'ended_early', 'The monthly engagement ended early by agreement. Accepted units stay paid, and ' || v_n || case when v_n = 1 then ' unit was' else ' units were' end || ' refunded to the client.');
  return jsonb_build_object('ok', true, 'ended', true, 'refunds', v_n);
end $$;

-- ---------- Changes for next month (answer 10) ----------
create or replace function dela_monthly_change_propose(p_person uuid, p_side text, p_agreement uuid, p jsonb) returns jsonb language plpgsql as $$
declare v_role text := dela_agreement_role(p_person, p_side, p_agreement); t monthly_terms; v_why text; v_id uuid;
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into t from monthly_terms where agreement_id = p_agreement for update;
  if t.agreement_id is null or t.status in ('setup', 'ended') then return jsonb_build_object('ok', false, 'reason', 'agreement_closed'); end if;
  v_why := dela_monthly_tasks_ok(coalesce(p->'tasks', t.tasks));
  if v_why is not null then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  if coalesce((p->>'price_cents')::int, t.price_cents) < dela_int_setting('engagement.minimum_cents', 25000) then return jsonb_build_object('ok', false, 'reason', 'total_too_small', 'min_cents', dela_int_setting('engagement.minimum_cents', 25000)); end if;
  update monthly_changes set status = 'withdrawn' where agreement_id = p_agreement and status = 'open';
  insert into monthly_changes (agreement_id, proposed_by, proposer_role, price_cents, unit_mode, tasks, note)
  values (p_agreement, p_person, v_role, coalesce((p->>'price_cents')::int, t.price_cents), case when p->>'unit_mode' in ('weekly', 'monthly') then p->>'unit_mode' else t.unit_mode end, coalesce(p->'tasks', t.tasks), left(coalesce(p->>'note', ''), 500))
  returning id into v_id;
  perform dela_engagement_notify(p_agreement, case when v_role = 'attorney' then 'freelancer' else 'attorney' end, 'A change to the monthly engagement',
    'The other person proposed a change to the monthly terms. Approve or decline it on the engagement page. Approved at least ' || dela_int_setting('recurring.change_deadline_days', 1) || ' day before billing, it starts next month.', 'monthly_change:' || v_id::text);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;
create or replace function dela_monthly_change_decide(p_person uuid, p_side text, p_change uuid, p_approve boolean) returns jsonb language plpgsql as $$
declare c monthly_changes; v_role text;
begin
  select * into c from monthly_changes where id = p_change for update;
  if c.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_agreement_role(p_person, p_side, c.agreement_id);
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if c.status <> 'open' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', c.status); end if;
  if v_role = c.proposer_role then return jsonb_build_object('ok', false, 'reason', 'other_side_approves'); end if;
  update monthly_changes set status = case when p_approve then 'approved' else 'declined' end, decided_by = p_person, decided_at = now() where id = c.id;
  perform dela_engagement_notify(c.agreement_id, c.proposer_role, case when p_approve then 'Your change was approved' else 'Your change was declined' end,
    case when p_approve then 'The change to the monthly terms was approved. It starts with the next month drafted at least ' || dela_int_setting('recurring.change_deadline_days', 1) || ' day after approval.' else 'The current monthly terms continue.' end, 'monthly_change_decided:' || c.id::text);
  perform dela_audit('member', p_person, case when p_approve then 'monthly_change_approved' else 'monthly_change_declined' end, 'agreement', c.agreement_id::text, jsonb_build_object('change', c.id));
  return jsonb_build_object('ok', true, 'status', case when p_approve then 'approved' else 'declined' end);
end $$;

-- ---------- "Make this monthly" (answer 1): from a completed one-off engagement, the same freelancer ----------
create or replace function dela_make_monthly(p_person uuid, p_side text, p_agreement uuid) returns jsonb language plpgsql as $$
declare a agreements; g gigs; pr proposals; av agreement_versions; v_gig uuid; v_prop uuid; v_ag uuid; q jsonb;
begin
  if dela_agreement_role(p_person, p_side, p_agreement) <> 'attorney' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not dela_switch_on('recurring_engagements', p_person) then return jsonb_build_object('ok', false, 'reason', 'recurring_off'); end if;
  select * into a from agreements where id = p_agreement;
  if a.status <> 'completed' or a.kind <> 'one_off' then return jsonb_build_object('ok', false, 'reason', 'not_completed'); end if;
  select id into v_ag from agreements x where x.kind = 'monthly' and x.gig_id in (select id from gigs where request_id = 'monthly:' || a.id::text);
  if v_ag is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'agreement_id', v_ag, 'gig_id', (select gig_id from agreements where id = v_ag)); end if;
  select * into g from gigs where id = a.gig_id;
  select * into pr from proposals where id = a.proposal_id;
  select * into av from agreement_versions where agreement_id = a.id and version = a.version;
  insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closed_at, close_reason, request_id, visibility, kind, sensitive)
  values (g.org_id, p_person, g.playbook_id, g.playbook_version, left('Monthly: ' || g.title, 200), g.public, greatest(a.total_cents, dela_int_setting('gig.min_budget_cents', 25000)), greatest(a.total_cents, dela_int_setting('gig.min_budget_cents', 25000)),
    'filled', now(), now(), 'made_monthly', 'monthly:' || a.id::text, 'matches', 'monthly', g.sensitive)
  returning id into v_gig;
  -- A running monthly engagement uses one of the attorney's active gig places (answer 14)
  q := dela_quota_reserve(p_person, 'attorney', 'att.gigs_active', 1, 'gigpost:' || v_gig::text, v_gig::text);
  if not coalesce((q->>'ok')::boolean, false) then
    delete from gigs where id = v_gig;
    return jsonb_build_object('ok', false, 'reason', 'limit_reached', 'allowance', q);
  end if;
  perform dela_quota_finish((q->>'reservation_id')::uuid, true);
  update gigs set reservation_id = (q->>'reservation_id')::uuid where id = v_gig;
  insert into proposals (gig_id, freelancer_id, status, price_cents, included, excluded, schedule, sent_at, decided_at, request_id, agency_org)
  values (v_gig, a.freelancer_person, 'selected', greatest(a.total_cents, dela_int_setting('engagement.minimum_cents', 25000)), left(coalesce(av.body->'scope'->>'included', ''), 4000), left(coalesce(av.body->'scope'->>'excluded', ''), 4000), 'Monthly', now(), now(), 'monthly:' || a.id::text, a.agency_org)
  returning id into v_prop;
  insert into agreements (gig_id, proposal_id, attorney_org, attorney_person, freelancer_person, total_cents, agency_org, kind)
  values (v_gig, v_prop, a.attorney_org, p_person, a.freelancer_person, greatest(a.total_cents, dela_int_setting('engagement.minimum_cents', 25000)), a.agency_org, 'monthly') returning id into v_ag;
  -- The finished work is the starting scope: one task the two then edit
  update monthly_terms set tasks = jsonb_build_array(jsonb_build_object('task', left(coalesce(nullif(av.body->'scope'->>'task', ''), g.title), 300), 'frequency', 'monthly', 'quantity', 1, 'turnaround', '', 'exclusions', left(coalesce(av.body->'scope'->>'excluded', ''), 300)))
  where agreement_id = v_ag;
  insert into engagement_team (agreement_id, person_id, kind, role_text, added_by)
  select v_ag, t.person_id, t.kind, t.role_text, p_person from engagement_team t where t.agreement_id = a.id and t.removed_at is null and t.kind = 'team';
  perform dela_engagement_notify(v_ag, 'freelancer', 'A monthly engagement to review', 'The client wants to make your finished work on "' || g.title || '" monthly. Review the monthly terms and sign if they are right.', 'make_monthly:' || v_ag::text);
  perform dela_audit('member', p_person, 'made_monthly', 'agreement', a.id::text, jsonb_build_object('monthly_agreement', v_ag));
  return jsonb_build_object('ok', true, 'agreement_id', v_ag, 'gig_id', v_gig);
end $$;

-- ---------- What the engagement page shows ----------
create or replace function dela_monthly_view(p_person uuid, p_side text, p_agreement uuid) returns jsonb language plpgsql stable as $$
declare v_role text := dela_agreement_role(p_person, p_side, p_agreement); t monthly_terms; cur monthly_periods; nx monthly_periods; v_today date;
begin
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into t from monthly_terms where agreement_id = p_agreement;
  if t.agreement_id is null then return jsonb_build_object('ok', true, 'monthly', false); end if;
  v_today := dela_monthly_today(p_agreement);
  select * into cur from monthly_periods where agreement_id = p_agreement and status = 'paid' order by n desc limit 1;
  select * into nx from monthly_periods where agreement_id = p_agreement and n = coalesce(cur.n, 0) + 1;
  return jsonb_build_object('ok', true, 'monthly', true, 'role', v_role, 'today', v_today,
    'terms', jsonb_build_object('price_cents', t.price_cents, 'unit_mode', t.unit_mode, 'tasks', t.tasks, 'billing_day', t.billing_day, 'timezone', t.timezone, 'status', t.status,
      'paused_since', t.paused_since, 'cancel_effective', t.cancel_effective, 'canceled_by_me', t.cancel_by = p_person, 'undo_requested', t.undo_requested_by is not null, 'undo_by_me', t.undo_requested_by = p_person,
      'end_now_requested', t.end_now_requested_by is not null, 'end_now_by_me', t.end_now_requested_by = p_person, 'ended_reason', t.ended_reason, 'consent', t.consent_at is not null),
    'current', case when cur.id is null then null else jsonb_build_object('n', cur.n, 'starts_on', cur.starts_on, 'ends_on', cur.ends_on, 'price_cents', cur.price_cents,
      'accepted', (select count(*) from milestones m where m.period_id = cur.id and m.status = 'accepted'), 'units', (select count(*) from milestones m where m.period_id = cur.id and m.status <> 'canceled')) end,
    'next', case when nx.id is null then jsonb_build_object('bill_on', case when cur.id is not null and t.status <> 'ended' and t.cancel_effective is null then dela_bill_date(cur.starts_on, 1, coalesce(t.billing_day, extract(day from cur.starts_on)::int)) end)
      else jsonb_build_object('n', nx.n, 'bill_on', nx.bill_on, 'status', nx.status, 'price_cents', nx.price_cents, 'fee_cents', nx.fee_cents, 'next_retry_on', nx.next_retry_on, 'failed_on', nx.failed_on, 'attempts', nx.attempts,
        'ends_if_unpaid', case when nx.failed_on is not null then nx.failed_on + dela_int_setting('recurring.pause_limit_days', 14) end) end,
    'periods', (select coalesce(jsonb_agg(jsonb_build_object('n', pr.n, 'starts_on', pr.starts_on, 'ends_on', pr.ends_on, 'status', pr.status, 'price_cents', pr.price_cents, 'fee_cents', pr.fee_cents) order by pr.n), '[]') from monthly_periods pr where pr.agreement_id = p_agreement),
    'changes', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'status', c.status, 'price_cents', c.price_cents, 'unit_mode', c.unit_mode, 'tasks', c.tasks, 'note', c.note, 'mine', c.proposed_by = p_person, 'created_at', c.created_at, 'decided_at', c.decided_at) order by c.created_at desc), '[]')
      from monthly_changes c where c.agreement_id = p_agreement and c.created_at > now() - interval '120 days'),
    'renewals_stopped', coalesce((dela_setting('recurring.renewals_stopped') #>> '{}')::boolean, false));
end $$;

-- ---------- Admin: the Recurring tab, the emergency stop, and "Run the renewal now" (test site only) ----------
create or replace function dela_admin_monthly(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['finance', 'support']);
  return jsonb_build_object('ok', true, 'stopped', coalesce((dela_setting('recurring.renewals_stopped') #>> '{}')::boolean, false),
    'staging', dela_setting_text('environment', 'staging') = 'staging',
    'engagements', (select coalesce(jsonb_agg(x order by x->>'status', x->>'next_bill_on'), '[]') from (
      select jsonb_build_object('agreement_id', t.agreement_id, 'gig_id', a.gig_id, 'title', g.title, 'status', t.status, 'price_cents', t.price_cents, 'unit_mode', t.unit_mode,
        'attorney', (select display_name from people where id = a.attorney_person), 'freelancer', dela_freelancer_name(a.freelancer_person),
        'months_paid', (select count(*) from monthly_periods pr where pr.agreement_id = t.agreement_id and pr.status = 'paid'),
        'next_bill_on', (select coalesce(pr.next_retry_on, pr.bill_on) from monthly_periods pr where pr.agreement_id = t.agreement_id and pr.status in ('draft', 'due', 'failed') order by pr.n limit 1),
        'failed_on', (select pr.failed_on from monthly_periods pr where pr.agreement_id = t.agreement_id and pr.status = 'failed' order by pr.n limit 1),
        'cancel_effective', t.cancel_effective, 'ended_reason', t.ended_reason) x
      from monthly_terms t join agreements a on a.id = t.agreement_id join gigs g on g.id = a.gig_id where t.status <> 'setup' or t.updated_at > now() - interval '30 days') s));
end $$;
create or replace function dela_admin_monthly_stop(p_actor uuid, p_on boolean) returns jsonb language plpgsql as $$
begin
  perform dela_require_staff(p_actor, array['finance']);
  update settings set value = to_jsonb(coalesce(p_on, false)), version = version + 1, updated_at = now() where key = 'recurring.renewals_stopped';
  perform dela_audit('staff', p_actor, case when p_on then 'renewals_stopped' else 'renewals_started' end, 'setting', 'recurring.renewals_stopped', '{}');
  return jsonb_build_object('ok', true, 'stopped', coalesce(p_on, false));
end $$;
-- Moves the next billing day (or retry day) to today so the renewal runs now. Never on Live.
create or replace function dela_admin_monthly_run_now(p_actor uuid, p_agreement uuid) returns jsonb language plpgsql as $$
declare t monthly_terms; cur monthly_periods; nx monthly_periods; v_today date;
begin
  perform dela_require_staff(p_actor, array['owner']);
  if dela_setting_text('environment', 'staging') <> 'staging' then return jsonb_build_object('ok', false, 'reason', 'test_site_only'); end if;
  select * into t from monthly_terms where agreement_id = p_agreement for update;
  if t.agreement_id is null or t.status not in ('active', 'paused') then return jsonb_build_object('ok', false, 'reason', 'not_running'); end if;
  v_today := dela_monthly_today(p_agreement);
  select * into cur from monthly_periods where agreement_id = p_agreement and status = 'paid' order by n desc limit 1;
  select * into nx from monthly_periods where agreement_id = p_agreement and n = cur.n + 1;
  if nx.id is null then
    -- Pretend the month began a month ago, so the next one is drafted and billed today
    update monthly_periods set starts_on = (v_today - interval '1 month')::date, ends_on = v_today - 1 where id = cur.id;
    update monthly_terms set billing_day = extract(day from v_today)::int where agreement_id = p_agreement;
  elsif nx.status = 'failed' then update monthly_periods set next_retry_on = v_today, updated_at = now() where id = nx.id;
  else update monthly_periods set bill_on = v_today, updated_at = now() where id = nx.id;
  end if;
  perform dela_audit('staff', p_actor, 'monthly_run_now', 'agreement', p_agreement::text, '{}');
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Patches (each stops if the function changed since it was read) ----------
create or replace function dela_patch(p_sig text, p_pairs text[]) returns void language plpgsql as $$
declare v_src text; v_new text; i int;
begin
  select pg_get_functiondef(p_sig::regprocedure) into v_src;
  v_new := v_src;
  for i in 1 .. array_length(p_pairs, 1) / 2 loop
    if position(p_pairs[i * 2] in v_new) > 0 and position(p_pairs[i * 2 - 1] in v_new) = 0 then continue; end if;
    if position(p_pairs[i * 2 - 1] in v_new) = 0 then raise exception '% changed; update 0049 (looking for: %)', p_sig, left(p_pairs[i * 2 - 1], 80); end if;
    v_new := replace(v_new, p_pairs[i * 2 - 1], p_pairs[i * 2]);
  end loop;
  if v_new <> v_src then execute v_new; end if;
end $$;
do $$ begin
  -- One-off milestone funding never touches a month's units (they are funded by the month's payment)
  perform dela_patch('dela_payment_next(uuid,text,uuid)', array[
    'select * into m from milestones where agreement_id = a.id and status in (''pending'', ''awaiting_funding'') order by seq limit 1;',
    'select * into m from milestones where agreement_id = a.id and status in (''pending'', ''awaiting_funding'') and period_id is null order by seq limit 1;']);
  -- A month's payment result goes to the monthly handler
  perform dela_patch('dela_payment_result(uuid,text,text,text,text,text)', array[
    '  if p.status = ''succeeded'' then return jsonb_build_object(''ok'', true, ''duplicate'', true); end if;',
    '  if p.status = ''succeeded'' then return jsonb_build_object(''ok'', true, ''duplicate'', true); end if;
  if p.kind = ''period'' then return dela_period_payment_result(p_payment, p_status, p_ref, p_customer, p_method, p_failure); end if;']);
  -- Signing a monthly agreement: tasks with quantities, and the client's permission to charge each month (answers 3 and 4)
  perform dela_patch('dela_agreement_sign(uuid,text,uuid,jsonb)', array[
    '  select * into av from agreement_versions where agreement_id = a.id and version = a.version;
  insert into agreement_signatures',
    '  if a.kind = ''monthly'' then
    if dela_monthly_tasks_ok((select tasks from monthly_terms where agreement_id = a.id)) is not null then return jsonb_build_object(''ok'', false, ''reason'', ''monthly_tasks_needed''); end if;
    if v_role = ''attorney'' and coalesce((p->>''recurring_consent'')::boolean, false) is not true then return jsonb_build_object(''ok'', false, ''reason'', ''recurring_consent_needed''); end if;
    if v_role = ''attorney'' then update monthly_terms set consent_at = now(), consent_by = p_person, updated_at = now() where agreement_id = a.id; end if;
  end if;
  select * into av from agreement_versions where agreement_id = a.id and version = a.version;
  insert into agreement_signatures']);
  -- A monthly gig keeps its gig place while the engagement runs (answer 14); it is returned when the engagement ends
  perform dela_patch('dela_gig_finish(uuid,text,text,text,uuid)', array[
    '  if g.status <> ''draft'' and g.reservation_id is not null then', '  if g.status <> ''draft'' and g.reservation_id is not null and not (g.kind = ''monthly'' and p_status = ''filled'') then']);
  -- A gig can be posted as Monthly (answer 1)
  perform dela_patch('dela_gig_create(uuid,jsonb)', array[
    'insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, deadline, milestones, request_id)',
    'insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, deadline, milestones, request_id, kind)',
    'nullif(p->>''deadline'', '''')::date, coalesce(p->''milestones'', ''[]''), p->>''request_id'')',
    'nullif(p->>''deadline'', '''')::date, coalesce(p->''milestones'', ''[]''), p->>''request_id'', case when p->>''kind'' = ''monthly'' then ''monthly'' else ''one_off'' end)']);
  perform dela_patch('dela_gig_get(uuid,text,uuid)', array[
    '''sensitive'', g.sensitive,', '''sensitive'', g.sensitive, ''kind'', g.kind,']);
  perform dela_patch('dela_gigs_mine_side(uuid,text)', array[
    '''paused_by_team'', g.paused_by_team,', '''paused_by_team'', g.paused_by_team, ''kind'', g.kind,']);
  -- The agreement's facts carry the monthly terms, so DELA builds each version from them
  perform dela_patch('dela_agreement_facts(uuid,text,uuid)', array[
    '''subcontracting'', jsonb_build_object(', '''kind'', a.kind, ''monthly'', (select jsonb_build_object(''price_cents'', mt.price_cents, ''unit_mode'', mt.unit_mode, ''tasks'', mt.tasks, ''weekly_units'', dela_int_setting(''recurring.weekly_units'', 4), ''reminder_days'', dela_int_setting(''recurring.renewal_reminder_days'', 3), ''retry_days'', dela_setting(''recurring.retry_spacing_days''), ''pause_limit_days'', dela_int_setting(''recurring.pause_limit_days'', 14), ''change_deadline_days'', dela_int_setting(''recurring.change_deadline_days'', 1)) from monthly_terms mt where mt.agreement_id = a.id), ''subcontracting'', jsonb_build_object(']);
end $$;
drop function if exists dela_patch(text, text[]);

-- The hourly renewal job
create or replace function dela_maybe_queue_monthly() returns void language plpgsql as $$
begin
  perform dela_job_enqueue('monthly_hourly', '{}', now(), 'monthly_hourly:' || to_char(now() at time zone dela_tz(), 'YYYY-MM-DD HH24'));
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('dela_nth_weekday', 'dela_last_weekday', 'dela_observed', 'dela_us_holiday', 'dela_business_day', 'dela_bill_date', 'dela_monthly_today',
             'dela_monthly_kind', 'dela_monthly_terms_new', 'dela_monthly_tasks_ok', 'dela_monthly_terms_save', 'dela_monthly_units', 'dela_monthly_dates', 'dela_monthly_signed', 'dela_monthly_payment_next',
             'dela_period_payment_result', 'dela_monthly_tick', 'dela_monthly_end', 'dela_monthly_cancel', 'dela_monthly_undo', 'dela_monthly_end_now', 'dela_monthly_change_propose',
             'dela_monthly_change_decide', 'dela_make_monthly', 'dela_monthly_view', 'dela_admin_monthly', 'dela_admin_monthly_stop', 'dela_admin_monthly_run_now', 'dela_maybe_queue_monthly') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

create or replace function dela_agreement_is_monthly(p_agreement uuid) returns boolean language sql stable as $$
  select coalesce((select kind = 'monthly' from agreements where id = p_agreement), false)
$$;
revoke all on function dela_agreement_is_monthly(uuid) from public, anon, authenticated;
grant execute on function dela_agreement_is_monthly(uuid) to service_role;
alter function dela_agreement_is_monthly(uuid) set search_path = public, extensions, pg_temp;

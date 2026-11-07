-- Step 8b Part A (docs/briefs/step-8b-ux-retest.md, Stacey's answers 2026-11-07, question 3; ChatGPT retest R01).
-- A monthly engagement's working milestones showed different due dates from the signed agreement (Nov 12 against
-- Nov 13), and the last weekly unit could fall after the paid month ended (Dec 7 for a month ending Dec 5), because the
-- dates were worked out again when the month was paid and then moved past the weekend.
-- Now: the signed date stays when it falls inside the paid month; otherwise the date is worked out from the month's
-- start; a date never moves past the month's end (a weekend before the end moves back to the last business day). Each
-- unit keeps its signed date, and a short reason when the working date differs. Additive: two columns, functions
-- replaced with the same arguments, and a one-time correction with an audit line and a notice to both people.

alter table milestones add column if not exists planned_due_date date;
alter table milestones add column if not exists due_note text not null default '';

-- The nearest business day on or after a date, but never after the last day allowed: then the last business day before it
create or replace function dela_business_day_within(p date, p_last date) returns date language plpgsql immutable as $$
declare d date := dela_business_day(p);
begin
  if p_last is null or d <= p_last then return d; end if;
  d := p_last;
  while extract(dow from d) in (0, 6) or dela_us_holiday(d) loop d := d - 1; end loop;
  return d;
end $$;

-- Dates of a month once it starts (called when the month is paid). Pausing moves the dates and the month's end together.
create or replace function dela_monthly_dates(p_period uuid) returns void language plpgsql as $$
declare pr monthly_periods; a agreements; v_n int; v_i int := 0; m milestones; v_plan date; v_calc date; v_due date; v_last date; v_note text;
begin
  select * into pr from monthly_periods where id = p_period;
  select * into a from agreements where id = pr.agreement_id;
  select count(*) into v_n from milestones where period_id = pr.id and status <> 'canceled';
  v_last := pr.ends_on + pr.paused_days;
  for m in select * from milestones where period_id = pr.id and status <> 'canceled' order by seq loop
    v_i := v_i + 1;
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

-- The signed date and the reason for each milestone of an agreement, for the screens (merged into /agreements/get)
create or replace function dela_milestone_dates(p_agreement uuid) returns jsonb language sql stable as $$
  select coalesce(jsonb_object_agg(m.id, jsonb_build_object('planned_due_date', m.planned_due_date, 'due_note', m.due_note)), '{}')
  from milestones m where m.agreement_id = p_agreement;
$$;

-- One-time correction of months already paid: units not yet accepted get their dates again under the new rule
do $$
declare pr record; m record; v_before jsonb;
begin
  for pr in select p.* from monthly_periods p where p.status = 'paid' and p.starts_on is not null loop
    select jsonb_object_agg(id, due_date) into v_before from milestones where period_id = pr.id;
    perform dela_monthly_dates(pr.id);
    for m in select x.*, a.attorney_person, a.freelancer_person from milestones x join agreements a on a.id = x.agreement_id
        where x.period_id = pr.id and x.status not in ('accepted', 'refunded', 'canceled') and (v_before->>(x.id::text))::date is distinct from x.due_date loop
      perform dela_audit('system', null, 'monthly_due_date_corrected', 'milestone', m.id::text,
        jsonb_build_object('from', v_before->>(m.id::text), 'to', m.due_date, 'signed', m.planned_due_date, 'why', 'step 8b: signed dates govern; dates stay inside the paid month'));
      perform dela_notify(jsonb_build_object('person_id', p, 'kind', 'engagement', 'title', 'A due date was corrected',
        'body', '"' || m.title || '" is now due ' || to_char(m.due_date, 'FMMon FMDD, YYYY') || ', matching your signed agreement and the paid month.',
        'link', '/dela?tab=' || case when p = m.attorney_person then 'projects' else 'work' end, 'dedupe_key', 'due_fix:' || m.id || ':' || p))
        from unnest(array[m.attorney_person, m.freelancer_person]) p;
    end loop;
  end loop;
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure::text as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_business_day_within', 'dela_monthly_dates', 'dela_milestone_dates') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;

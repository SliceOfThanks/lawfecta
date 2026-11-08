-- Step 11: the dispute center (docs/briefs/step-11-disputes.md, Stacey's answers 2026-11-08).
-- Either side opens a dispute on a paid milestone, the other answers, both may add links and send settlement offers.
-- An accepted offer moves the money at once with no team step; a dispute the other side never answers is granted at the
-- end of the notice period; everything else goes to the Lawfecta Team. The attorney's platform fee is kept; only the
-- milestone amount is refunded. Behind the switch dispute_center. Additive: new columns, tables and functions; three
-- existing functions are patched in place (checked) so only the disputed milestone's money is frozen.

-- ---------- Settings and the switch (from config/decisions.json) ----------
insert into settings (key, value, label, section, unit, status, source, note) values
  ('dispute.answer_days', '5'::jsonb, 'Days the other side has to answer a dispute', 'Risk', 'calendar days', 'C', 'Stacey 2026-11-08 (step 11 brief)', 'A warning goes out on the last day; if there is still no answer the opener''s request is granted at the end of the notice period.'),
  ('dispute.reminder_days', '[7, 12]'::jsonb, 'Days of a dispute when both sides are reminded to settle', 'Risk', 'days after opening', 'C', 'Stacey 2026-11-08 (step 11 brief)', ''),
  ('dispute.team_decision_business_days', '10'::jsonb, 'Business days for the Lawfecta Team to decide a dispute', 'Risk', 'business days', 'R', 'Claude 2026-11-08 (step 11 brief)', 'Asking a question pauses the clock until it is answered.'),
  ('dispute.auto_grant_unanswered', 'true'::jsonb, 'Grant the opener''s request when the other side never answers', 'Risk', 'on or off', 'C', 'Stacey 2026-11-08 (step 11 brief)', ''),
  ('dispute.refund_attorney_fee', 'false'::jsonb, 'Refund the attorney''s platform fee when a dispute sends money back', 'Risk', 'on or off', 'C', 'Stacey 2026-11-08 (step 11 brief)', 'Only the milestone amount is refunded; the freelancer fee applies only to the part released.'),
  ('dispute.repeat_loss_hold', '{"count": 3, "months": 12}'::jsonb, 'Lost disputes that place a review hold on a member', 'Risk', 'lost disputes within months', 'R', 'Claude 2026-11-08 (step 11 brief)', 'The hold blocks new engagements until the Lawfecta Team releases it.'),
  ('ai.credits.dispute_summary', '1'::jsonb, 'DELA actions for "Summarize both sides" on a dispute', 'AI', 'DELA actions', 'R', 'Claude 2026-11-08 (step 11 brief)', ''),
  ('ai.credits.dispute_suggest', '1'::jsonb, 'DELA actions for "Suggest a fair offer" on a dispute', 'AI', 'DELA actions', 'R', 'Claude 2026-11-08 (step 11 brief)', '')
on conflict (key) do nothing;
insert into feature_switches (key, label, gate) values ('dispute_center', 'Dispute case view, settlement offers and automatic outcomes (step 11)', 'G-CONTRACT (terms clause 6 reviewed by the lawyer)')
on conflict (key) do nothing;

-- ---------- Tables ----------
alter table disputes add column if not exists category text not null default '';
alter table disputes add column if not exists wants text not null default '' check (wants in ('', 'refund', 'release', 'split'));
alter table disputes add column if not exists wants_release_cents int;
alter table disputes add column if not exists answer_due_at timestamptz;
alter table disputes add column if not exists answered_at timestamptz;
alter table disputes add column if not exists review_due_at timestamptz;
alter table disputes add column if not exists question_open_at timestamptz;
alter table disputes add column if not exists extended_at timestamptz;
alter table disputes add column if not exists settled_by text not null default '' check (settled_by in ('', 'offer', 'auto', 'team', 'withdrawn'));
alter table disputes add column if not exists needs_lawyer boolean not null default false;

create table if not exists dispute_statements (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references disputes(id),
  person_id uuid references people(id),
  role text not null check (role in ('attorney', 'freelancer', 'team')),
  kind text not null check (kind in ('opening', 'answer', 'note', 'question', 'reply')),
  to_role text not null default '' check (to_role in ('', 'attorney', 'freelancer', 'both')),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists dispute_statements_d on dispute_statements (dispute_id, created_at);
alter table dispute_statements enable row level security;
drop trigger if exists dispute_statements_append_only on dispute_statements;
create trigger dispute_statements_append_only before update or delete on dispute_statements for each row execute function dela_no_change();

create table if not exists dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references disputes(id),
  person_id uuid not null references people(id),
  role text not null check (role in ('attorney', 'freelancer')),
  label text not null check (length(label) between 1 and 200),
  url text not null check (url ~ '^https://[^[:space:]]{4,}$' and length(url) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists dispute_evidence_d on dispute_evidence (dispute_id, created_at);
alter table dispute_evidence enable row level security;
drop trigger if exists dispute_evidence_append_only on dispute_evidence;
create trigger dispute_evidence_append_only before update or delete on dispute_evidence for each row execute function dela_no_change();

create table if not exists dispute_offers (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references disputes(id),
  from_person uuid not null references people(id),
  from_role text not null check (from_role in ('attorney', 'freelancer')),
  release_cents int not null check (release_cents >= 0),
  refund_cents int not null check (refund_cents >= 0),
  note text not null default '',
  status text not null default 'open' check (status in ('open', 'withdrawn', 'replaced', 'accepted', 'closed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists dispute_offers_d on dispute_offers (dispute_id, created_at);
alter table dispute_offers enable row level security;

alter table refunds add column if not exists retries int not null default 0;
alter table payouts add column if not exists retries int not null default 0;

-- ---------- Helpers ----------
create or replace function dela_add_business_days(p_from timestamptz, p_days int) returns timestamptz language plpgsql stable as $$
declare d date := (p_from at time zone dela_tz())::date; n int := 0;
begin
  while n < greatest(p_days, 0) loop
    d := d + 1;
    if extract(dow from d) not in (0, 6) and not dela_us_holiday(d) then n := n + 1; end if;
  end loop;
  return (d + ((p_from at time zone dela_tz())::time))::timestamp at time zone dela_tz();
end $$;

-- Who the person is in this dispute: 'attorney', 'freelancer' or ''
create or replace function dela_dispute_role(p_person uuid, p_side text, p_dispute uuid) returns text language sql stable as $$
  select coalesce((select dela_agreement_role(p_person, p_side, d.agreement_id) from disputes d where d.id = p_dispute), '')
$$;

-- The role of whoever opened the dispute
create or replace function dela_dispute_opener_role(p_dispute uuid) returns text language sql stable as $$
  select case when d.opened_by = a.freelancer_person or dela_on_engagement_team(d.opened_by, a.id) then 'freelancer' else 'attorney' end
  from disputes d join agreements a on a.id = d.agreement_id where d.id = p_dispute
$$;

-- ---------- The money: one place for every way a dispute is settled ----------
-- Release goes to the freelancer (their fee on that part only); refund goes back to the attorney (milestone amount only,
-- the attorney's platform fee is kept, setting dispute.refund_attorney_fee). Release plus refund equal the milestone amount.
create or replace function dela_dispute_settle_money(p_dispute uuid, p_release int, p_refund int, p_by text, p_note text, p_actor uuid) returns jsonb language plpgsql as $$
declare d disputes; m milestones; a agreements; p payments; v_fee_refund int := 0; v_loser uuid; v_hold jsonb; v_n int;
begin
  select * into d from disputes where id = p_dispute for update;
  if d.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if d.status = 'resolved' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if d.status not in ('notice', 'team_review') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  select * into a from agreements where id = d.agreement_id for update;
  if exists (select 1 from chargebacks c where c.agreement_id = a.id and c.status = 'open') then return jsonb_build_object('ok', false, 'reason', 'chargeback_open'); end if;
  select * into m from milestones where id = d.milestone_id for update;
  if m.id is null then return jsonb_build_object('ok', false, 'reason', 'no_milestone'); end if;
  if coalesce(p_release, -1) < 0 or coalesce(p_refund, -1) < 0 or p_release + p_refund <> m.amount_cents then
    return jsonb_build_object('ok', false, 'reason', 'split_must_equal', 'amount_cents', m.amount_cents);
  end if;
  update disputes set status = 'resolved', release_cents = p_release, refund_cents = p_refund, resolution_note = left(coalesce(p_note, ''), 2000),
    resolved_by = p_actor, resolved_at = now(), settled_by = p_by, question_open_at = null where id = d.id;
  update dispute_offers set status = 'closed', decided_at = now() where dispute_id = d.id and status = 'open';
  if p_release > 0 then
    perform dela_ledger(a.id, m.id, 'released', p_release, '', case p_by when 'offer' then 'Released by the settlement both agreed' when 'auto' then 'Released: the request was not answered' else 'Released after the Lawfecta Team''s review' end);
    insert into payouts (milestone_id, agreement_id, person_id, amount_cents, fee_cents, status, held_reason, idem_key)
    values (m.id, a.id, a.freelancer_person, greatest(p_release - round(m.freelancer_fee_cents * p_release::numeric / m.amount_cents)::int, 0), round(m.freelancer_fee_cents * p_release::numeric / m.amount_cents)::int,
      case when exists (select 1 from payout_accounts pa where pa.person_id = a.freelancer_person and pa.status = 'ready') then 'pending' else 'held' end,
      case when exists (select 1 from payout_accounts pa where pa.person_id = a.freelancer_person and pa.status = 'ready') then '' else 'payout_account' end, 'payout:' || m.id::text || ':dispute')
    on conflict (idem_key) do nothing;
  end if;
  if p_refund > 0 then
    select * into p from payments
    where status = 'succeeded' and (milestone_id = m.id or (m.period_id is not null and period_id = m.period_id))
    order by (milestone_id = m.id) desc nulls last, created_at limit 1;
    -- The attorney's platform fee is kept (Stacey 2026-11-08, setting dispute.refund_attorney_fee false): only the milestone amount goes back
    if p.id is not null then
      insert into refunds (payment_id, agreement_id, milestone_id, amount_cents, reason, idem_key)
      values (p.id, a.id, m.id, p_refund + v_fee_refund, case p_by when 'offer' then 'Dispute settled by agreement' when 'auto' then 'Dispute not answered' else 'Dispute decision' end, 'refund:' || m.id::text || ':dispute')
      on conflict (idem_key) do nothing;
    else
      perform dela_alert('payments', 'A dispute refund has no payment', 'A dispute sends money back, but DELA found no paid payment for that milestone. Refund it by hand in Stripe and record it.', 'disprefund:' || d.id::text);
    end if;
  end if;
  update milestones set status = case when p_release > 0 then 'accepted' else 'refunded' end, accepted_at = case when p_release > 0 then now() end, updated_at = now() where id = m.id;
  perform dela_audit(case when p_actor is null then 'system' else case when p_by = 'team' then 'staff' else 'member' end end, p_actor, 'dispute_settled', 'dispute', d.id::text,
    jsonb_build_object('by', p_by, 'release_cents', p_release, 'refund_cents', p_refund));
  perform dela_engagement_notify(a.id, 'both',
    case p_by when 'offer' then 'The dispute is settled' when 'auto' then 'The dispute request was granted' else 'The dispute is decided' end,
    case p_by when 'offer' then 'You both agreed: ' when 'auto' then 'The other side did not answer in time, so the request is granted: ' else 'The Lawfecta Team reviewed the dispute: ' || left(coalesce(p_note, ''), 300) || '. ' end
      || dela_gig_money(p_release) || ' goes to the freelancer and ' || dela_gig_money(p_refund) || ' back to the attorney. The money moves now.', 'dispdone' || d.id::text);
  -- Repeat losses (automatic grants and team decisions only; an agreed settlement is nobody's loss)
  if p_by in ('auto', 'team') and (p_release = 0 or p_refund = 0) then
    v_loser := case when p_release = 0 then a.freelancer_person else a.attorney_person end;
    v_hold := coalesce(dela_setting('dispute.repeat_loss_hold'), '{"count": 3, "months": 12}'::jsonb);
    select count(*) into v_n from disputes x join agreements y on y.id = x.agreement_id
    where x.status = 'resolved' and x.settled_by in ('auto', 'team') and x.resolved_at > now() - make_interval(months => coalesce((v_hold->>'months')::int, 12))
      and ((x.release_cents = 0 and y.freelancer_person = v_loser) or (x.refund_cents = 0 and y.attorney_person = v_loser));
    if v_n >= coalesce((v_hold->>'count')::int, 3) and not exists (select 1 from holds h where h.scope_type = 'person' and h.scope_id = v_loser::text and h.rule = 'repeat_dispute_losses' and h.state = 'active') then
      insert into holds (scope_type, scope_id, rule, reason, severity) values ('person', v_loser::text, 'repeat_dispute_losses', v_n || ' disputes lost within ' || coalesce((v_hold->>'months')::int, 12) || ' months: review before new engagements', 'medium');
      perform dela_alert('disputes', 'A member lost several disputes', 'A member lost ' || v_n || ' disputes within a year and is on hold for a review (admin Holds).', 'disploss:' || v_loser::text || ':' || v_n);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'release_cents', p_release, 'refund_cents', p_refund);
end $$;

-- The team's decision uses the same money path (the old one-line version is replaced; same arguments and answers)
create or replace function dela_admin_dispute_resolve(p_actor uuid, p_dispute uuid, p_release int, p_refund int, p_note text) returns jsonb language plpgsql as $$
declare d disputes;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'finance', 'support']);
  select * into d from disputes where id = p_dispute;
  if d.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if d.status = 'resolved' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if d.status = 'notice' and d.notice_ends_at > now() then return jsonb_build_object('ok', false, 'reason', 'notice_not_over', 'notice_ends_at', d.notice_ends_at); end if;
  if coalesce(trim(p_note), '') = '' then return jsonb_build_object('ok', false, 'reason', 'say_why'); end if;
  if d.milestone_id is null then
    -- A dispute about the whole engagement (no milestone): the decision is a note; money is moved with the money tools
    update disputes set status = 'resolved', release_cents = 0, refund_cents = 0, resolution_note = left(p_note, 2000), resolved_by = p_actor, resolved_at = now(), settled_by = 'team' where id = d.id;
    perform dela_audit('staff', p_actor, 'dispute_resolved', 'dispute', d.id::text, '{}'::jsonb);
    perform dela_engagement_notify(d.agreement_id, 'both', 'The dispute is decided', 'The Lawfecta Team reviewed the dispute: ' || left(p_note, 300), 'dispdone' || d.id::text);
    return jsonb_build_object('ok', true);
  end if;
  return dela_dispute_settle_money(p_dispute, coalesce(p_release, 0), coalesce(p_refund, 0), 'team', p_note, p_actor);
end $$;

-- ---------- Members ----------
-- Open (dispute_center on): on a paid milestone only, with what went wrong, what they want, and a description
create or replace function dela_dispute_start(p_person uuid, p_side text, p_agreement uuid, p_milestone uuid, p_category text, p_wants text, p_release int, p_reason text) returns jsonb language plpgsql as $$
declare v_role text; m milestones; r jsonb; v_id uuid; v_release int; v_answer int := dela_int_setting('dispute.answer_days', 5); v_notice int := dela_int_setting('risk.dispute_notice_days', 14); v_day jsonb;
begin
  v_role := dela_agreement_role(p_person, p_side, p_agreement);
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select id into v_id from disputes where agreement_id = p_agreement and status in ('notice', 'team_review') limit 1;
  if v_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', v_id); end if;
  if p_category not in ('not_delivered', 'late', 'not_as_agreed', 'quality', 'not_accepted', 'other') then return jsonb_build_object('ok', false, 'reason', 'pick_category'); end if;
  select * into m from milestones where id = p_milestone and agreement_id = p_agreement;
  if m.id is null then return jsonb_build_object('ok', false, 'reason', 'pick_milestone'); end if;
  if m.status not in ('funded', 'in_progress', 'submitted', 'changes_requested') then return jsonb_build_object('ok', false, 'reason', 'milestone_not_paid'); end if;
  if p_wants not in ('refund', 'release', 'split') or (v_role = 'attorney' and p_wants = 'release') or (v_role = 'freelancer' and p_wants = 'refund') then return jsonb_build_object('ok', false, 'reason', 'pick_wants'); end if;
  v_release := case p_wants when 'refund' then 0 when 'release' then m.amount_cents else p_release end;
  if v_release is null or v_release < 0 or v_release > m.amount_cents or (p_wants = 'split' and v_release in (0, m.amount_cents)) then
    return jsonb_build_object('ok', false, 'reason', 'split_amount', 'amount_cents', m.amount_cents);
  end if;
  r := dela_dispute_open(p_person, p_side, p_agreement, p_milestone, p_reason);
  if not coalesce((r->>'ok')::boolean, false) or coalesce((r->>'duplicate')::boolean, false) then return r; end if;
  v_id := (r->>'id')::uuid;
  update disputes set category = p_category, wants = p_wants, wants_release_cents = v_release, answer_due_at = now() + make_interval(days => v_answer) where id = v_id;
  insert into dispute_statements (dispute_id, person_id, role, kind, body) values (v_id, p_person, v_role, 'opening', left(p_reason, 4000));
  perform dela_job_enqueue('dispute_tick', jsonb_build_object('dispute_id', v_id, 'kind', 'answer_due'), now() + make_interval(days => v_answer), 'dispans:' || v_id::text, p_person);
  for v_day in select * from jsonb_array_elements(coalesce(dela_setting('dispute.reminder_days'), '[7, 12]'::jsonb)) loop
    if (v_day #>> '{}')::int < v_notice then
      perform dela_job_enqueue('dispute_tick', jsonb_build_object('dispute_id', v_id, 'kind', 'reminder', 'day', (v_day #>> '{}')::int), now() + make_interval(days => (v_day #>> '{}')::int), 'disprem:' || v_id::text || ':' || (v_day #>> '{}'), p_person);
    end if;
  end loop;
  perform dela_job_enqueue('dispute_tick', jsonb_build_object('dispute_id', v_id, 'kind', 'notice_end'), now() + make_interval(days => v_notice), 'dispnotice:' || v_id::text, p_person);
  perform dela_engagement_notify(p_agreement, case when v_role = 'attorney' then 'freelancer' else 'attorney' end, 'Answer the dispute',
    'Please give your side within ' || v_answer || ' days, by ' || to_char((now() + make_interval(days => v_answer)) at time zone dela_tz(), 'FMMon FMDD') ||
    '. You can also send an offer to settle it. If you do not answer, the request is granted when the notice period ends.', 'dispask' || v_id::text);
  perform dela_audit('member', p_person, 'dispute_opened', 'dispute', v_id::text, jsonb_build_object('category', p_category, 'wants', p_wants, 'release_cents', v_release));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- A statement: the other side's answer (the first one counts as answering), or a later note from either side; a reply
-- to the team's question reopens the team's clock
create or replace function dela_dispute_say(p_person uuid, p_side text, p_dispute uuid, p_body text, p_wants text, p_release int) returns jsonb language plpgsql as $$
declare d disputes; v_role text; v_kind text; m milestones; v_release int;
begin
  v_role := dela_dispute_role(p_person, p_side, p_dispute);
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if coalesce(trim(p_body), '') = '' then return jsonb_build_object('ok', false, 'reason', 'say_why'); end if;
  select * into d from disputes where id = p_dispute for update;
  if d.status not in ('notice', 'team_review') then return jsonb_build_object('ok', false, 'reason', 'dispute_closed'); end if;
  v_kind := case when d.question_open_at is not null then 'reply'
    when v_role <> dela_dispute_opener_role(d.id) and not exists (select 1 from dispute_statements x where x.dispute_id = d.id and x.kind = 'answer') then 'answer' else 'note' end;
  insert into dispute_statements (dispute_id, person_id, role, kind, body) values (d.id, p_person, v_role, v_kind, left(p_body, 4000));
  if v_kind = 'answer' then
    select * into m from milestones where id = d.milestone_id;
    v_release := case p_wants when 'refund' then 0 when 'release' then m.amount_cents when 'split' then p_release end;
    update disputes set answered_at = coalesce(answered_at, now()) where id = d.id;
    perform dela_engagement_notify(d.agreement_id, case when v_role = 'attorney' then 'freelancer' else 'attorney' end, 'The dispute was answered',
      'The other side gave their side' || case when v_release is not null then ' and asks for ' || dela_gig_money(v_release) || ' to the freelancer' else '' end || '. Read it on the agreement page. You can still settle it with an offer.', 'dispanswered' || d.id::text);
  elsif v_kind = 'reply' then
    update disputes set question_open_at = null, review_due_at = dela_add_business_days(now(), dela_int_setting('dispute.team_decision_business_days', 10)) where id = d.id;
    perform dela_alert('disputes', 'A dispute question was answered', 'A member answered the Lawfecta Team''s question on a dispute (admin Disputes).', 'dispreply:' || d.id::text || ':' || extract(epoch from now())::bigint);
  end if;
  perform dela_audit('member', p_person, 'dispute_statement', 'dispute', d.id::text, jsonb_build_object('kind', v_kind));
  return jsonb_build_object('ok', true, 'kind', v_kind);
end $$;

-- Evidence: a secure link from the member's own storage (never an upload)
create or replace function dela_dispute_evidence_add(p_person uuid, p_side text, p_dispute uuid, p_label text, p_url text) returns jsonb language plpgsql as $$
declare d disputes; v_role text; v_n int;
begin
  v_role := dela_dispute_role(p_person, p_side, p_dispute);
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into d from disputes where id = p_dispute;
  if d.status not in ('notice', 'team_review') then return jsonb_build_object('ok', false, 'reason', 'dispute_closed'); end if;
  if coalesce(trim(p_label), '') = '' then return jsonb_build_object('ok', false, 'reason', 'name_the_link'); end if;
  if p_url is null or length(p_url) > 2000 or p_url !~ '^https://[^[:space:]]{4,}$' then return jsonb_build_object('ok', false, 'reason', 'bad_link'); end if;
  select count(*) into v_n from dispute_evidence where dispute_id = d.id and person_id = p_person;
  if v_n >= 20 then return jsonb_build_object('ok', false, 'reason', 'too_many_links'); end if;
  insert into dispute_evidence (dispute_id, person_id, role, label, url) values (d.id, p_person, v_role, left(trim(p_label), 200), p_url);
  if v_role <> dela_dispute_opener_role(d.id) and d.answered_at is null then update disputes set answered_at = now() where id = d.id; end if;
  return jsonb_build_object('ok', true);
end $$;

-- A settlement offer: release plus refund equal the milestone amount; a newer offer replaces the sender's older one
create or replace function dela_dispute_offer(p_person uuid, p_side text, p_dispute uuid, p_release int, p_note text) returns jsonb language plpgsql as $$
declare d disputes; v_role text; m milestones; v_id uuid;
begin
  v_role := dela_dispute_role(p_person, p_side, p_dispute);
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into d from disputes where id = p_dispute for update;
  if d.status not in ('notice', 'team_review') then return jsonb_build_object('ok', false, 'reason', 'dispute_closed'); end if;
  select * into m from milestones where id = d.milestone_id;
  if m.id is null then return jsonb_build_object('ok', false, 'reason', 'no_milestone'); end if;
  if p_release is null or p_release < 0 or p_release > m.amount_cents then return jsonb_build_object('ok', false, 'reason', 'split_amount', 'amount_cents', m.amount_cents); end if;
  update dispute_offers set status = 'replaced', decided_at = now() where dispute_id = d.id and from_person = p_person and status = 'open';
  insert into dispute_offers (dispute_id, from_person, from_role, release_cents, refund_cents, note) values (d.id, p_person, v_role, p_release, m.amount_cents - p_release, left(coalesce(p_note, ''), 1000)) returning id into v_id;
  if v_role <> dela_dispute_opener_role(d.id) and d.answered_at is null then update disputes set answered_at = now() where id = d.id; end if;
  perform dela_engagement_notify(d.agreement_id, case when v_role = 'attorney' then 'freelancer' else 'attorney' end, 'An offer to settle the dispute',
    'The other side offers: ' || dela_gig_money(p_release) || ' to the freelancer and ' || dela_gig_money(m.amount_cents - p_release) || ' back to the attorney. Accept it on the agreement page to settle now, or send your own offer.', 'dispoffer' || v_id::text);
  perform dela_audit('member', p_person, 'dispute_offer', 'dispute', d.id::text, jsonb_build_object('release_cents', p_release));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function dela_dispute_offer_withdraw(p_person uuid, p_offer uuid) returns jsonb language plpgsql as $$
declare o dispute_offers;
begin
  select * into o from dispute_offers where id = p_offer for update;
  if o.id is null or o.from_person <> p_person then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if o.status <> 'open' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update dispute_offers set status = 'withdrawn', decided_at = now() where id = o.id;
  return jsonb_build_object('ok', true);
end $$;

-- Accepting: only the other side's latest open offer; the money moves at once (no team step)
create or replace function dela_dispute_offer_accept(p_person uuid, p_side text, p_offer uuid) returns jsonb language plpgsql as $$
declare o dispute_offers; d disputes; v_role text; r jsonb;
begin
  select * into o from dispute_offers where id = p_offer;
  if o.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_dispute_role(p_person, p_side, o.dispute_id);
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into d from disputes where id = o.dispute_id for update;
  if d.status = 'resolved' and d.settled_by = 'offer' and o.status = 'accepted' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if v_role = o.from_role then return jsonb_build_object('ok', false, 'reason', 'own_offer'); end if;
  select * into o from dispute_offers where id = p_offer for update;
  if o.status <> 'open' then return jsonb_build_object('ok', false, 'reason', 'offer_not_open'); end if;
  r := dela_dispute_settle_money(d.id, o.release_cents, o.refund_cents, 'offer', 'Settled by agreement', null);
  if coalesce((r->>'ok')::boolean, false) then update dispute_offers set status = 'accepted', decided_at = now() where id = o.id; end if;
  return r;
end $$;

-- The case for a member: every dispute on the agreement with statements, links and offers
create or replace function dela_dispute_case(p_person uuid, p_side text, p_agreement uuid) returns jsonb language plpgsql stable as $$
declare v_role text;
begin
  v_role := dela_agreement_role(p_person, p_side, p_agreement);
  if v_role = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'role', v_role, 'on', dela_switch_on('dispute_center', p_person),
    'notice_days', dela_int_setting('risk.dispute_notice_days', 14), 'answer_days', dela_int_setting('dispute.answer_days', 5),
    'team_days', dela_int_setting('dispute.team_decision_business_days', 10),
    'disputes', coalesce((select jsonb_agg(jsonb_build_object(
      'id', d.id, 'status', d.status, 'category', d.category, 'wants', d.wants, 'wants_release_cents', d.wants_release_cents,
      'opened_by_role', dela_dispute_opener_role(d.id), 'mine', d.opened_by = p_person, 'reason', d.reason,
      'created_at', d.created_at, 'answer_due_at', d.answer_due_at, 'answered_at', d.answered_at, 'notice_ends_at', d.notice_ends_at,
      'review_due_at', d.review_due_at, 'question_open', d.question_open_at is not null, 'settled_by', d.settled_by,
      'release_cents', d.release_cents, 'refund_cents', d.refund_cents, 'resolution_note', d.resolution_note, 'resolved_at', d.resolved_at,
      'milestone', (select jsonb_build_object('id', m.id, 'seq', m.seq, 'title', m.title, 'amount_cents', m.amount_cents, 'status', m.status, 'deliverables', m.deliverables, 'due_date', m.due_date) from milestones m where m.id = d.milestone_id),
      'statements', coalesce((select jsonb_agg(jsonb_build_object('role', s.role, 'kind', s.kind, 'to_role', s.to_role, 'body', s.body, 'at', s.created_at, 'mine', s.person_id = p_person) order by s.created_at)
        from dispute_statements s where s.dispute_id = d.id and (s.role <> 'team' or s.to_role in ('both', v_role))), '[]'),
      'evidence', coalesce((select jsonb_agg(jsonb_build_object('role', e.role, 'label', e.label, 'url', e.url, 'at', e.created_at, 'mine', e.person_id = p_person) order by e.created_at)
        from dispute_evidence e where e.dispute_id = d.id), '[]'),
      'offers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'from_role', o.from_role, 'mine', o.from_person = p_person, 'release_cents', o.release_cents, 'refund_cents', o.refund_cents,
        'note', o.note, 'status', o.status, 'at', o.created_at) order by o.created_at) from dispute_offers o where o.dispute_id = d.id), '[]')
    ) order by d.created_at desc) from disputes d where d.agreement_id = p_agreement), '[]'));
end $$;

-- ---------- The timers (job kind dispute_tick) ----------
create or replace function dela_dispute_tick(p jsonb) returns jsonb language plpgsql as $$
declare d disputes; v_kind text := p->>'kind'; v_other text; v_amount int; r jsonb;
begin
  select * into d from disputes where id = (p->>'dispute_id')::uuid for update;
  if d.id is null or d.status not in ('notice', 'team_review') then return jsonb_build_object('ok', true, 'skipped', true); end if;
  v_other := case when dela_dispute_opener_role(d.id) = 'attorney' then 'freelancer' else 'attorney' end;
  if v_kind = 'answer_due' then
    if d.answered_at is null then
      perform dela_engagement_notify(d.agreement_id, v_other, 'Last chance to answer the dispute',
        'You have not answered the dispute. If you do not answer by ' || to_char(d.notice_ends_at at time zone dela_tz(), 'FMMon FMDD') || ', the request is granted and the money moves.', 'dispwarn' || d.id::text);
    end if;
  elsif v_kind = 'reminder' then
    if d.status = 'notice' then
      perform dela_engagement_notify(d.agreement_id, 'both', 'Settle the dispute',
        (extract(day from d.notice_ends_at - now()))::int || ' days left to settle the dispute yourselves with an offer, before ' ||
        case when d.answered_at is null then 'the request is granted.' else 'the Lawfecta Team reviews it.' end, 'disprem' || d.id::text || ':' || (p->>'day'));
    end if;
  elsif v_kind = 'notice_end' then
    if d.notice_ends_at > now() then return jsonb_build_object('ok', true, 'skipped', 'not_yet'); end if;
    if d.answered_at is null and coalesce((dela_setting('dispute.auto_grant_unanswered') #>> '{}')::boolean, false) and d.wants_release_cents is not null then
      select amount_cents into v_amount from milestones where id = d.milestone_id;
      r := dela_dispute_settle_money(d.id, d.wants_release_cents, v_amount - d.wants_release_cents, 'auto', 'The request was not answered', null);
      if coalesce((r->>'ok')::boolean, false) then return r; end if;
    end if;
    update disputes set status = 'team_review', review_due_at = dela_add_business_days(now(), dela_int_setting('dispute.team_decision_business_days', 10)) where id = d.id;
    perform dela_engagement_notify(d.agreement_id, 'both', 'The Lawfecta Team is reviewing the dispute',
      'The notice period ended without a settlement. The Lawfecta Team reviews it and decides within ' || dela_int_setting('dispute.team_decision_business_days', 10) || ' business days. You can still settle it with an offer until then.', 'dispreview' || d.id::text);
    perform dela_alert('disputes', 'A dispute is ready for review', 'A dispute was not settled in the notice period. Decide it in the admin Disputes tab.', 'dispready:' || d.id::text);
    perform dela_job_enqueue('dispute_tick', jsonb_build_object('dispute_id', d.id, 'kind', 'review_due'), dela_add_business_days(now(), dela_int_setting('dispute.team_decision_business_days', 10)), 'dispdue:' || d.id::text, null);
  elsif v_kind = 'review_due' then
    if d.status = 'team_review' and d.question_open_at is null and d.review_due_at <= now() then
      perform dela_alert('disputes', 'A dispute decision is overdue', 'A dispute has waited longer than the team''s target. Decide it in the admin Disputes tab.', 'dispover:' || d.id::text || ':' || to_char(now(), 'YYYYMMDD'));
      perform dela_job_enqueue('dispute_tick', jsonb_build_object('dispute_id', d.id, 'kind', 'review_due'), now() + interval '2 days', 'dispdue:' || d.id::text || ':' || to_char(now(), 'YYYYMMDD'), null);
    elsif d.status = 'team_review' then
      perform dela_job_enqueue('dispute_tick', jsonb_build_object('dispute_id', d.id, 'kind', 'review_due'), greatest(coalesce(d.review_due_at, now() + interval '1 day'), now() + interval '1 hour'), 'dispdue:' || d.id::text || ':' || to_char(now(), 'YYYYMMDDHH24'), null);
    end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- The Lawfecta Team ----------
create or replace function dela_admin_disputes(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'finance', 'support']);
  return jsonb_build_object('ok', true, 'team_days', dela_int_setting('dispute.team_decision_business_days', 10),
    'disputes', coalesce((select jsonb_agg(x order by x->>'sort') from (select jsonb_build_object(
      'sort', case d.status when 'team_review' then '1' when 'notice' then '2' else '3' end || to_char(d.created_at, 'YYYYMMDDHH24MISS'),
      'id', d.id, 'status', d.status, 'category', d.category, 'wants', d.wants, 'wants_release_cents', d.wants_release_cents, 'reason', d.reason,
      'opened_by_role', dela_dispute_opener_role(d.id), 'created_at', d.created_at, 'answer_due_at', d.answer_due_at, 'answered_at', d.answered_at,
      'notice_ends_at', d.notice_ends_at, 'review_due_at', d.review_due_at, 'question_open', d.question_open_at is not null, 'extended', d.extended_at is not null,
      'needs_lawyer', d.needs_lawyer, 'settled_by', d.settled_by, 'release_cents', d.release_cents, 'refund_cents', d.refund_cents, 'resolution_note', d.resolution_note, 'resolved_at', d.resolved_at,
      'agreement_id', a.id, 'gig_title', g.title, 'attorney', pa.display_name, 'freelancer', pf.display_name,
      'chargeback_open', exists (select 1 from chargebacks c where c.agreement_id = a.id and c.status = 'open'),
      'milestone', (select jsonb_build_object('seq', m.seq, 'title', m.title, 'amount_cents', m.amount_cents, 'status', m.status, 'deliverables', m.deliverables, 'due_date', m.due_date) from milestones m where m.id = d.milestone_id),
      'check', (select jsonb_build_object('status', s.status, 'score', s.score, 'findings', s.findings, 'statement', left(s.statement, 2000)) from milestone_submissions s where s.milestone_id = d.milestone_id order by s.created_at desc limit 1),
      'statements', coalesce((select jsonb_agg(jsonb_build_object('role', s.role, 'kind', s.kind, 'to_role', s.to_role, 'body', s.body, 'at', s.created_at) order by s.created_at) from dispute_statements s where s.dispute_id = d.id), '[]'),
      'evidence', coalesce((select jsonb_agg(jsonb_build_object('role', e.role, 'label', e.label, 'url', e.url, 'at', e.created_at) order by e.created_at) from dispute_evidence e where e.dispute_id = d.id), '[]'),
      'offers', coalesce((select jsonb_agg(jsonb_build_object('from_role', o.from_role, 'release_cents', o.release_cents, 'refund_cents', o.refund_cents, 'note', o.note, 'status', o.status, 'at', o.created_at) order by o.created_at) from dispute_offers o where o.dispute_id = d.id), '[]')
    ) x
    from disputes d join agreements a on a.id = d.agreement_id join gigs g on g.id = a.gig_id
      left join people pa on pa.id = a.attorney_person left join people pf on pf.id = a.freelancer_person
    where d.status in ('notice', 'team_review') or d.resolved_at > now() - interval '90 days'
    order by d.created_at desc limit 300) q), '[]'),
    'paused', coalesce((select jsonb_agg(jsonb_build_object('agreement_id', a.id, 'gig_title', g.title, 'since', a.updated_at,
        'chargeback_open', exists (select 1 from chargebacks c where c.agreement_id = a.id and c.status = 'open')) order by a.updated_at)
      from agreements a join gigs g on g.id = a.gig_id where a.status = 'paused'), '[]'),
    'refunds_failed', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'amount_cents', r.amount_cents, 'reason', r.reason, 'retries', r.retries, 'gig_title', g.title, 'at', r.updated_at) order by r.updated_at)
      from refunds r join agreements a on a.id = r.agreement_id join gigs g on g.id = a.gig_id where r.status = 'failed'), '[]'),
    'payouts_waiting', coalesce((select jsonb_agg(jsonb_build_object('id', po.id, 'amount_cents', po.amount_cents, 'status', po.status, 'reason', po.held_reason, 'retries', po.retries, 'freelancer', pe.display_name, 'gig_title', g.title) order by po.updated_at)
      from payouts po join people pe on pe.id = po.person_id join agreements a on a.id = po.agreement_id join gigs g on g.id = a.gig_id where po.status in ('held', 'failed')), '[]'),
    'report', (select jsonb_build_object(
      'open', count(*) filter (where status in ('notice', 'team_review')),
      'last_90_days', count(*) filter (where created_at > now() - interval '90 days'),
      'by_offer', count(*) filter (where settled_by = 'offer' and resolved_at > now() - interval '90 days'),
      'by_auto', count(*) filter (where settled_by = 'auto' and resolved_at > now() - interval '90 days'),
      'by_team', count(*) filter (where settled_by = 'team' and resolved_at > now() - interval '90 days'),
      'withdrawn', count(*) filter (where status = 'withdrawn' and resolved_at > now() - interval '90 days'),
      'released_cents', coalesce(sum(release_cents) filter (where resolved_at > now() - interval '90 days'), 0),
      'refunded_cents', coalesce(sum(refund_cents) filter (where resolved_at > now() - interval '90 days'), 0),
      'avg_days', round(avg(extract(epoch from resolved_at - created_at) / 86400) filter (where status = 'resolved' and resolved_at > now() - interval '90 days'), 1)) from disputes));
end $$;

-- Ask one or both sides a question; the team's clock waits until a reply
create or replace function dela_admin_dispute_ask(p_actor uuid, p_dispute uuid, p_to text, p_body text) returns jsonb language plpgsql as $$
declare d disputes;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'finance', 'support']);
  if p_to not in ('attorney', 'freelancer', 'both') or coalesce(trim(p_body), '') = '' then return jsonb_build_object('ok', false, 'reason', 'say_why'); end if;
  select * into d from disputes where id = p_dispute for update;
  if d.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if d.status not in ('notice', 'team_review') then return jsonb_build_object('ok', false, 'reason', 'dispute_closed'); end if;
  insert into dispute_statements (dispute_id, person_id, role, kind, to_role, body) values (d.id, p_actor, 'team', 'question', p_to, left(p_body, 4000));
  update disputes set question_open_at = now() where id = d.id;
  perform dela_engagement_notify(d.agreement_id, p_to, 'A question about the dispute', 'The Lawfecta Team asks: ' || left(p_body, 400) || ' Answer on the agreement page.', 'dispq' || d.id::text || ':' || extract(epoch from now())::bigint);
  perform dela_audit('staff', p_actor, 'dispute_question', 'dispute', d.id::text, jsonb_build_object('to', p_to));
  return jsonb_build_object('ok', true);
end $$;

-- Give more time to settle, once, up to 14 days
create or replace function dela_admin_dispute_extend(p_actor uuid, p_dispute uuid, p_days int) returns jsonb language plpgsql as $$
declare d disputes;
begin
  perform dela_require_staff(p_actor, array['reviewer', 'finance', 'support']);
  select * into d from disputes where id = p_dispute for update;
  if d.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if d.status <> 'notice' then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
  if d.extended_at is not null then return jsonb_build_object('ok', false, 'reason', 'already_extended'); end if;
  if p_days is null or p_days < 1 or p_days > 14 then return jsonb_build_object('ok', false, 'reason', 'days_1_to_14'); end if;
  update disputes set notice_ends_at = notice_ends_at + make_interval(days => p_days), extended_at = now() where id = d.id;
  perform dela_job_enqueue('dispute_tick', jsonb_build_object('dispute_id', d.id, 'kind', 'notice_end'), d.notice_ends_at + make_interval(days => p_days), 'dispnotice:' || d.id::text || ':ext', p_actor);
  perform dela_engagement_notify(d.agreement_id, 'both', 'More time to settle the dispute', 'The Lawfecta Team gave you ' || p_days || ' more days to settle the dispute, until ' || to_char((d.notice_ends_at + make_interval(days => p_days)) at time zone dela_tz(), 'FMMon FMDD') || '.', 'dispext' || d.id::text);
  perform dela_audit('staff', p_actor, 'dispute_extended', 'dispute', d.id::text, jsonb_build_object('days', p_days));
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_admin_dispute_lawyer(p_actor uuid, p_dispute uuid, p_on boolean) returns jsonb language plpgsql as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'finance', 'support']);
  update disputes set needs_lawyer = coalesce(p_on, false) where id = p_dispute;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform dela_audit('staff', p_actor, 'dispute_needs_lawyer', 'dispute', p_dispute::text, jsonb_build_object('on', p_on));
  return jsonb_build_object('ok', true);
end $$;

-- Money tools (finance): retry a failed refund or payout, release a held payout, unpause an engagement
create or replace function dela_admin_money_retry(p_actor uuid, p_kind text, p_id uuid) returns jsonb language plpgsql as $$
begin
  perform dela_require_staff(p_actor, array['finance']);
  if p_kind = 'refund' then
    update refunds set status = 'pending', retries = retries + 1, updated_at = now() where id = p_id and status = 'failed';
  elsif p_kind = 'payout' then
    update payouts set status = 'pending', retries = retries + 1, updated_at = now() where id = p_id and status = 'failed';
  else return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_failed'); end if;
  perform dela_audit('staff', p_actor, 'money_retry', p_kind, p_id::text, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_admin_payout_release(p_actor uuid, p_payout uuid, p_note text) returns jsonb language plpgsql as $$
declare po payouts;
begin
  perform dela_require_staff(p_actor, array['finance']);
  if coalesce(trim(p_note), '') = '' then return jsonb_build_object('ok', false, 'reason', 'say_why'); end if;
  select * into po from payouts where id = p_payout for update;
  if po.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if po.status <> 'held' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if not exists (select 1 from payout_accounts pa where pa.person_id = po.person_id and pa.status = 'ready') then return jsonb_build_object('ok', false, 'reason', 'payout_account_not_ready'); end if;
  if exists (select 1 from disputes d where d.milestone_id = po.milestone_id and d.status in ('notice', 'team_review')) then return jsonb_build_object('ok', false, 'reason', 'in_dispute'); end if;
  update payouts set status = 'pending', held_reason = '', updated_at = now() where id = po.id;
  perform dela_audit('staff', p_actor, 'payout_released', 'payout', po.id::text, jsonb_build_object('note', left(p_note, 300)));
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_admin_engagement_unpause(p_actor uuid, p_agreement uuid, p_note text) returns jsonb language plpgsql as $$
declare a agreements;
begin
  perform dela_require_staff(p_actor, array['finance']);
  if coalesce(trim(p_note), '') = '' then return jsonb_build_object('ok', false, 'reason', 'say_why'); end if;
  select * into a from agreements where id = p_agreement for update;
  if a.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if a.status <> 'paused' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if exists (select 1 from chargebacks c where c.agreement_id = a.id and c.status = 'open') then return jsonb_build_object('ok', false, 'reason', 'chargeback_open'); end if;
  update agreements set status = 'active', updated_at = now() where id = a.id;
  perform dela_engagement_notify(a.id, 'both', 'The engagement is running again', 'The Lawfecta Team lifted the pause on this engagement.', 'unpause' || a.id::text || ':' || extract(epoch from now())::bigint);
  perform dela_audit('staff', p_actor, 'engagement_unpaused', 'agreement', a.id::text, jsonb_build_object('note', left(p_note, 300)));
  return jsonb_build_object('ok', true);
end $$;

-- Every day: failed refunds and payouts are tried again (up to 3 times), then the team is told
create or replace function dela_money_retry_failed() returns jsonb language plpgsql as $$
declare v_r int; v_p int; x record;
begin
  update refunds set status = 'pending', retries = retries + 1, updated_at = now() where status = 'failed' and retries < 3 and updated_at < now() - interval '20 hours';
  get diagnostics v_r = row_count;
  update payouts set status = 'pending', retries = retries + 1, updated_at = now() where status = 'failed' and retries < 3 and updated_at < now() - interval '20 hours';
  get diagnostics v_p = row_count;
  for x in select 'refund' k, id from refunds where status = 'failed' and retries >= 3 union all select 'payout', id from payouts where status = 'failed' and retries >= 3 loop
    perform dela_alert('payments', 'A ' || x.k || ' keeps failing', 'A ' || x.k || ' failed 4 times. Check it in Stripe and retry it in the admin Disputes tab (money tools).', 'moneyfail:' || x.k || ':' || x.id::text);
  end loop;
  return jsonb_build_object('ok', true, 'refunds', v_r, 'payouts', v_p);
end $$;

-- ---------- Patches to existing functions (checked) ----------
do $$
declare v_src text; v_new text;
begin
  -- Only the disputed milestone's money is frozen: payouts for other milestones of the engagement go out
  select pg_get_functiondef('dela_payouts_due()'::regprocedure) into v_src;
  if position('d.milestone_id = po.milestone_id' in v_src) = 0 then
    v_new := replace(v_src, 'and not exists (select 1 from disputes d where d.agreement_id = po.agreement_id and d.status in (''notice'', ''team_review''))',
      'and not exists (select 1 from disputes d where d.agreement_id = po.agreement_id and (d.milestone_id is null or d.milestone_id = po.milestone_id) and d.status in (''notice'', ''team_review''))');
    if v_new = v_src then raise exception 'dela_payouts_due changed; update 0075'; end if;
    execute v_new;
  end if;
  -- Accepting another milestone of the same engagement stays possible while one milestone is in dispute
  select pg_get_functiondef('dela_milestone_decide(uuid,uuid,boolean,text)'::regprocedure) into v_src;
  if position('d.milestone_id = m.id' in v_src) = 0 then
    v_new := replace(v_src, 'if exists (select 1 from disputes d where d.agreement_id = a.id and d.status in (''notice'', ''team_review'')) then return jsonb_build_object(''ok'', false, ''reason'', ''in_dispute''); end if;',
      'if exists (select 1 from disputes d where d.agreement_id = a.id and (d.milestone_id is null or d.milestone_id = m.id) and d.status in (''notice'', ''team_review'')) then return jsonb_build_object(''ok'', false, ''reason'', ''in_dispute''); end if;');
    if v_new = v_src then raise exception 'dela_milestone_decide changed; update 0075'; end if;
    execute v_new;
  end if;
  -- The old 14-day tick leaves new-style disputes to dela_dispute_tick (so an unanswered one is granted, not sent to the team)
  select pg_get_functiondef('dela_engagement_tick(jsonb)'::regprocedure) into v_src;
  if position('d.answer_due_at is null' in v_src) = 0 then
    v_new := replace(v_src, '    if d.status = ''notice'' then
      update disputes set status = ''team_review'' where id = d.id;',
      '    if d.status = ''notice'' and d.answer_due_at is null then
      update disputes set status = ''team_review'' where id = d.id;');
    if v_new = v_src then raise exception 'dela_engagement_tick changed; update 0075'; end if;
    execute v_new;
  end if;
  -- Withdrawing is recorded in the audit log and marks how the dispute ended
  select pg_get_functiondef('dela_dispute_withdraw(uuid,uuid)'::regprocedure) into v_src;
  if position('dispute_withdrawn' in v_src) = 0 then
    v_new := replace(v_src, 'update disputes set status = ''withdrawn'', resolved_at = now() where id = d.id;',
      'update disputes set status = ''withdrawn'', resolved_at = now(), settled_by = ''withdrawn'' where id = d.id;
  update dispute_offers set status = ''closed'', decided_at = now() where dispute_id = d.id and status = ''open'';
  perform dela_audit(''member'', p_person, ''dispute_withdrawn'', ''dispute'', d.id::text, ''{}''::jsonb);');
    if v_new = v_src then raise exception 'dela_dispute_withdraw changed; update 0075'; end if;
    execute v_new;
  end if;
end $$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_add_business_days', 'dela_dispute_role', 'dela_dispute_opener_role', 'dela_dispute_settle_money', 'dela_admin_dispute_resolve',
      'dela_dispute_start', 'dela_dispute_say', 'dela_dispute_evidence_add', 'dela_dispute_offer', 'dela_dispute_offer_withdraw', 'dela_dispute_offer_accept', 'dela_dispute_case',
      'dela_dispute_tick', 'dela_admin_disputes', 'dela_admin_dispute_ask', 'dela_admin_dispute_extend', 'dela_admin_dispute_lawyer', 'dela_admin_money_retry',
      'dela_admin_payout_release', 'dela_admin_engagement_unpause', 'dela_money_retry_failed', 'dela_payouts_due', 'dela_milestone_decide', 'dela_engagement_tick', 'dela_dispute_withdraw') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end $$;

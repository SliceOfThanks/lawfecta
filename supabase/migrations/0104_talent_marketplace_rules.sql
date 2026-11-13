-- Step 18 part 1 (docs/briefs/step-18-talent-marketplace.md): the Talent result cards and the rules behind them.
--   dela_worked_together: an attorney (or their firm) and a freelancer finished an engagement that was not refunded
--     and has no open dispute. Bench invitations and standing arrangements need it (Stacey 2026-11-12), each behind a
--     setting so the rule can be turned off without a release.
--   dela_gig_invite also refuses a gig the Lawfecta Team paused (proposals already did).
--   dela_talent_search also returns the photo path, the verification state, availability and the review summary.
-- Additive: two settings, one new function, four functions changed in place. Existing bench members and standing
-- arrangements are untouched.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('bench.require_completed', 'true'::jsonb, 'A bench invitation needs a completed engagement between the attorney and the freelancer', 'Platform rules decided by Stacey', '', 'C',
    'Stacey 2026-11-12 (Talent revision, section 6)', 'Canceled, refunded or disputed engagements do not count. Checked when the invitation is sent.'),
  ('standing.require_completed', 'true'::jsonb, 'A standing arrangement needs a completed engagement between the attorney and the freelancer', 'Platform rules decided by Stacey', '', 'C',
    'Stacey 2026-11-12 (Talent revision, section 6)', 'Canceled, refunded or disputed engagements do not count. The freelancer still has to accept the arrangement.')
on conflict (key) do nothing;

create or replace function dela_worked_together(p_attorney uuid, p_freelancer uuid) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select exists (
    select 1 from agreements a
    where a.status = 'completed' and a.freelancer_person = p_freelancer
      and (a.attorney_person = p_attorney or a.attorney_org = dela_side_org(p_attorney, 'attorney'))
      and not exists (select 1 from disputes d where d.agreement_id = a.id and (d.status in ('notice', 'team_review') or coalesce(d.refund_cents, 0) > 0)))
$$;
revoke all on function dela_worked_together(uuid, uuid) from public, anon, authenticated;

do $mig$
declare v_def text; v_new text;
begin
  -- Bench: after the duplicate answer (an invitation already sent stays as it is), before a new one is made
  v_def := pg_get_functiondef('dela_bench_invite'::regproc);
  if position('needs_completed_gig' in v_def) = 0 then
    v_new := replace(v_def, $r$  v_max := (dela_setting('bench.max_size') #>> '{}')::int;$r$,
      $r$  if dela_setting_text('bench.require_completed', 'true') = 'true' and not dela_worked_together(p_person, v_free) then return jsonb_build_object('ok', false, 'reason', 'needs_completed_gig'); end if;
  v_max := (dela_setting('bench.max_size') #>> '{}')::int;$r$);
    if v_new = v_def then raise exception 'dela_bench_invite: anchor not found'; end if;
    execute v_new;
  end if;

  -- Standing arrangements: with the freelancer check
  v_def := pg_get_functiondef('dela_standing_create'::regproc);
  if position('needs_completed_gig' in v_def) = 0 then
    v_new := replace(v_def, $r$  if not exists (select 1 from side_profiles where person_id = v_fl and side = 'freelancer' and status <> 'closed' and verification_state = 'verified')$r$,
      $r$  if dela_setting_text('standing.require_completed', 'true') = 'true' and not dela_worked_together(p_person, v_fl) then return jsonb_build_object('ok', false, 'reason', 'needs_completed_gig'); end if;
  if not exists (select 1 from side_profiles where person_id = v_fl and side = 'freelancer' and status <> 'closed' and verification_state = 'verified')$r$);
    if v_new = v_def then raise exception 'dela_standing_create: anchor not found'; end if;
    execute v_new;
  end if;

  -- Gig invitations: a gig the team paused takes no invitations
  v_def := pg_get_functiondef('dela_gig_invite'::regproc);
  if position('g.paused_by_team' in v_def) = 0 then
    v_new := replace(v_def, $r$if g.status <> 'open' then return jsonb_build_object('ok', false, 'reason', 'gig_not_open'); end if;$r$,
      $r$if g.status <> 'open' or g.paused_by_team then return jsonb_build_object('ok', false, 'reason', 'gig_not_open'); end if;$r$);
    if v_new = v_def then raise exception 'dela_gig_invite: anchor not found'; end if;
    execute v_new;
  end if;

  -- Talent results: what the new cards show
  v_def := pg_get_functiondef('dela_talent_search'::regproc);
  if position('''verification'', sp.verification_state' in v_def) = 0 then
    v_new := replace(v_def, $r$'states_excluded', mp.body->'states_excluded',$r$,
      $r$'states_excluded', mp.body->'states_excluded', 'photo_file', mp.body->>'photo_file', 'verification', sp.verification_state, 'availability', mp.availability,
      'reviews', dela_review_summary(sp.person_id, 'freelancer'), 'firm_name', mp.body->>'firm_name',$r$);
    if v_new = v_def then raise exception 'dela_talent_search: anchor not found'; end if;
    execute v_new;
  end if;
end $mig$;

-- The freelancers an attorney may add to the bench or offer a standing arrangement: the ones they finished work with
create or replace function dela_worked_with(p_person uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('person_id', x.fl, 'name', dela_person_name(x.fl, 'freelancer')) order by x.last desc), '[]')
  from (select a.freelancer_person fl, max(a.completed_at) last from agreements a
    where a.status = 'completed' and (a.attorney_person = p_person or a.attorney_org = dela_side_org(p_person, 'attorney'))
    group by a.freelancer_person) x
  where dela_worked_together(p_person, x.fl)
$$;
revoke all on function dela_worked_with(uuid) from public, anon, authenticated;

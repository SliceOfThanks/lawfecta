-- Launch review 2026-11-10, fix 11. The DELA guide's free answers were counted after the AI ran, so a re-sent request id
-- (never counted twice) or several questions sent at once got answers past the daily cap (setting guide.ai_replies_per_day).
-- Now one call reserves the answer before the AI runs: one at a time per member, a used request id is refused, and the
-- cap is checked and counted in the same step. A reserved answer stays counted if the AI then fails.
create or replace function dela_guide_reserve(p_person uuid, p_side text, p_step text, p_request text) returns jsonb
language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_req text := left(coalesce(p_request, ''), 80); v_cap int := dela_int_setting('guide.ai_replies_per_day', 20);
  v_tz text := dela_setting_text('quota.timezone', 'America/Los_Angeles'); v_used int;
begin
  if p_side not in ('attorney', 'freelancer') or v_req = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if not dela_switch_on('onboarding_widget', p_person) then return jsonb_build_object('ok', false, 'reason', 'guide_off'); end if;
  perform pg_advisory_xact_lock(hashtext('guide_reply:' || p_person::text));
  if exists (select 1 from guide_events where person_id = p_person and request_id = v_req) then
    return jsonb_build_object('ok', false, 'reason', 'already_answered');
  end if;
  select count(*) into v_used from guide_events where person_id = p_person and side = p_side and kind = 'ai_reply'
    and created_at >= (date_trunc('day', now() at time zone v_tz) at time zone v_tz);
  if v_used >= v_cap then return jsonb_build_object('ok', false, 'reason', 'guide_cap', 'cap', v_cap); end if;
  insert into guide_events (person_id, side, kind, step, ref, request_id) values (p_person, p_side, 'ai_reply', left(coalesce(p_step, ''), 40), '', v_req);
  return jsonb_build_object('ok', true, 'replies_left', greatest(v_cap - v_used - 1, 0));
end $$;
revoke all on function dela_guide_reserve(uuid, text, text, text) from public, anon, authenticated;

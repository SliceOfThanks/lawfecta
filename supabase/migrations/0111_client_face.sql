-- Step 21 (Stacey 2026-11-13): "attorneys should still be able to upload photo/logo etc since the freelancer should
-- be able to see who they are working with."
-- 1. A firm logo, kept with the firm's details (firm_profiles.body.logo_file, a private file path).
-- 2. One answer, "who is the client", for the screens a freelancer reads: the attorney's name and picture, the firm's
--    name and logo, and whether the attorney is verified. The API attaches it only after the screen's own access check passed.
-- Additive: no column or table changes.

-- Saving the firm's details keeps the logo (the form does not send it)
create or replace function dela_firm_save(p_person uuid, p_org uuid, p_body jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_org uuid := coalesce(p_org, dela_side_org(p_person, 'attorney')); v_why text := dela_profile_editable(p_person, 'attorney');
begin
  if v_why <> '' then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  if dela_firm_role(p_person, v_org) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'firm_staff_only'); end if;
  insert into firm_profiles (org_id, body, updated_by) values (v_org, p_body - 'logo_file', p_person)
  on conflict (org_id) do update set body = (excluded.body - 'logo_file') || jsonb_build_object('logo_file', coalesce(firm_profiles.body->>'logo_file', '')), updated_by = p_person, updated_at = now();
  if coalesce(p_body->>'legal_name', '') <> '' then update organizations set name = left(p_body->>'legal_name', 200) where id = v_org and kind = 'firm'; end if;
  perform dela_audit('member', p_person, 'firm_saved', 'organization', v_org::text, '{}');
  return jsonb_build_object('ok', true, 'eligibility', dela_attorney_eligibility((select owner_person_id from organizations where id = v_org)));
end $$;
revoke all on function dela_firm_save(uuid, uuid, jsonb) from public, anon, authenticated;

-- Which firm a logo upload is for, and whether this person may change it (the owner or firm staff). '' when allowed.
create or replace function dela_firm_logo_check(p_person uuid, p_org uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_org uuid := coalesce(p_org, dela_side_org(p_person, 'attorney')); v_why text := dela_profile_editable(p_person, 'attorney');
begin
  if v_why <> '' then return jsonb_build_object('ok', false, 'reason', v_why); end if;
  if v_org is null or dela_firm_role(p_person, v_org) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'firm_staff_only'); end if;
  return jsonb_build_object('ok', true, 'org_id', v_org, 'old', coalesce((select body->>'logo_file' from firm_profiles where org_id = v_org), ''));
end $$;
revoke all on function dela_firm_logo_check(uuid, uuid) from public, anon, authenticated;

-- Set the logo (a path under the firm's own folder) or take it away (an empty path)
create or replace function dela_firm_logo_set(p_person uuid, p_org uuid, p_path text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v jsonb := dela_firm_logo_check(p_person, p_org); v_org uuid; v_path text := coalesce(p_path, '');
begin
  if not (v->>'ok')::boolean then return v; end if;
  v_org := (v->>'org_id')::uuid;
  if v_path <> '' and v_path !~ ('^firms/' || v_org::text || '/logo-[0-9a-f-]{36}[.](png|jpg)$') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  insert into firm_profiles (org_id, body, updated_by) values (v_org, jsonb_build_object('logo_file', v_path), p_person)
  on conflict (org_id) do update set body = firm_profiles.body || jsonb_build_object('logo_file', v_path), updated_by = p_person, updated_at = now();
  perform dela_audit('member', p_person, case when v_path = '' then 'firm_logo_removed' else 'firm_logo_set' end, 'organization', v_org::text, '{}');
  return jsonb_build_object('ok', true, 'org_id', v_org, 'old', v->>'old');
end $$;
revoke all on function dela_firm_logo_set(uuid, uuid, text) from public, anon, authenticated;

-- Who the client is: the attorney (name, picture, verified) and the firm (name, logo). File paths never leave the
-- server; the API turns them into short-lived links.
create or replace function dela_client_face(p_attorney uuid, p_org uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object(
    'name', coalesce(nullif(trim(coalesce(mp.body->>'first_name', '') || ' ' || coalesce(mp.body->>'last_name', '')), ''), pe.display_name, ''),
    'firm_name', coalesce(nullif(case when o.kind = 'agency' then coalesce(nullif(o.business_name, ''), o.name) else coalesce(nullif(mp.body->>'firm_name', ''), case when o.kind = 'firm' then o.name end) end, ''), ''),
    'kind', case when o.kind = 'agency' then 'agency' else 'attorney' end,
    'verified', coalesce((select sp.verification_state = 'verified' from side_profiles sp where sp.person_id = pe.id and sp.side = 'attorney'), false),
    'photo_file', coalesce(mp.body->>'photo_file', ''), 'avatar', coalesce(mp.body->>'avatar', ''),
    'logo_file', coalesce(fp.body->>'logo_file', ''))
  from people pe
    left join lateral (select m.body from member_profiles m where m.person_id = pe.id order by (m.side = 'attorney') desc limit 1) mp on true
    left join organizations o on o.id = p_org
    left join firm_profiles fp on fp.org_id = p_org
  where pe.id = p_attorney
$$;
revoke all on function dela_client_face(uuid, uuid) from public, anon, authenticated;

create or replace function dela_client_face_gig(p_gig uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select dela_client_face(g.created_by, g.org_id) from gigs g where g.id = p_gig
$$;
revoke all on function dela_client_face_gig(uuid) from public, anon, authenticated;

create or replace function dela_client_face_thread(p_thread uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select dela_client_face(nullif(c->>'attorney', '')::uuid, nullif(c->>'org_id', '')::uuid) from (select dela_thread_ctx(p_thread) c) x where c is not null
$$;
revoke all on function dela_client_face_thread(uuid) from public, anon, authenticated;

create or replace function dela_client_face_agreement(p_agreement uuid) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select dela_client_face(a.attorney_person, a.attorney_org) from agreements a where a.id = p_agreement
$$;
revoke all on function dela_client_face_agreement(uuid) from public, anon, authenticated;

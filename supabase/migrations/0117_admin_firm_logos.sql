-- Step 26: the Lawfecta Team can see every firm logo and take one down (a logo that is offensive, misleading or
-- someone else's). The firm's owner is told, with the reason. The firm can upload another logo afterwards.
create or replace function dela_admin_firm_logos(p_actor uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  return jsonb_build_object('ok', true, 'logos', (select coalesce(jsonb_agg(jsonb_build_object('org_id', o.id, 'firm', coalesce(nullif(fp.body->>'legal_name', ''), nullif(o.name, ''), pe.display_name),
      'owner', pe.display_name, 'bd_member_id', pe.bd_member_id, 'logo_file', fp.body->>'logo_file', 'updated_at', fp.updated_at) order by fp.updated_at desc), '[]')
    from firm_profiles fp join organizations o on o.id = fp.org_id left join people pe on pe.id = o.owner_person_id
    where coalesce(fp.body->>'logo_file', '') <> ''));
end $$;
revoke all on function dela_admin_firm_logos(uuid) from public, anon, authenticated;

create or replace function dela_admin_firm_logo_remove(p_actor uuid, p_org uuid, p_reason text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_old text; v_owner uuid; v_reason text := left(trim(coalesce(p_reason, '')), 300);
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  if v_reason = '' then return jsonb_build_object('ok', false, 'reason', 'reason_needed'); end if;
  select fp.body->>'logo_file', o.owner_person_id into v_old, v_owner from firm_profiles fp join organizations o on o.id = fp.org_id where fp.org_id = p_org for update of fp;
  if coalesce(v_old, '') = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  update firm_profiles set body = body || jsonb_build_object('logo_file', ''), updated_at = now() where org_id = p_org;
  perform dela_audit('staff', p_actor, 'firm_logo_removed_by_team', 'organization', p_org::text, jsonb_build_object('reason', v_reason));
  if v_owner is not null then
    perform dela_notify(jsonb_build_object('person_id', v_owner, 'side', 'attorney', 'kind', 'profile', 'email', true,
      'title', 'Your firm logo was removed', 'body', 'The Lawfecta Team removed your firm''s logo. Reason: ' || v_reason || ' You can add another logo on your Profile page, under Firm details.',
      'link', '/dela?tab=profile', 'dedupe_key', 'firmlogo:' || p_org::text || ':' || to_char(now(), 'YYYYMMDDHH24MI')));
  end if;
  return jsonb_build_object('ok', true, 'old', v_old);
end $$;
revoke all on function dela_admin_firm_logo_remove(uuid, uuid, text) from public, anon, authenticated;

-- Step 26, second part: a small picture next to the other person's name in the Inbox and on meeting cards.
-- The picture is the other person's profile photo or ready-made picture for the side they act in. Paths stay on the
-- server; the API turns them into short-lived links.
create or replace function dela_face_of(p_person uuid, p_side text) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce((select jsonb_build_object('photo_file', coalesce(mp.body->>'photo_file', ''), 'avatar', coalesce(mp.body->>'avatar', ''))
    from member_profiles mp where mp.person_id = p_person and mp.side = p_side), jsonb_build_object('photo_file', '', 'avatar', ''))
$$;
revoke all on function dela_face_of(uuid, text) from public, anon, authenticated;

do $mig$
declare v_def text; v_new text;
begin
  v_def := pg_get_functiondef('dela_threads(uuid, text)'::regprocedure);
  if position('dela_face_of' in v_def) = 0 then
    v_new := replace(v_def, $a$, '-infinity'::timestamptz))) x$a$,
      $b$, '-infinity'::timestamptz))) || jsonb_build_object('face', dela_face_of(case when p_side = 'attorney' then t.freelancer_person else (c->>'attorney')::uuid end, case when p_side = 'attorney' then 'freelancer' else 'attorney' end)) x$b$);
    if v_new = v_def then raise exception 'dela_threads: anchor not found'; end if;
    execute v_new;
  end if;
  v_def := pg_get_functiondef('dela_meetings(uuid, text, uuid, uuid)'::regprocedure);
  if position('dela_face_of' in v_def) = 0 then
    v_new := replace(v_def, $a$'my_consent', case when p_side = 'attorney' then m.consent_attorney_at is not null$a$,
      $b$'face', dela_face_of(case when p_side = 'attorney' then m.freelancer_person else m.attorney_person end, case when p_side = 'attorney' then 'freelancer' else 'attorney' end),
        'my_consent', case when p_side = 'attorney' then m.consent_attorney_at is not null$b$);
    if v_new = v_def then raise exception 'dela_meetings: anchor not found'; end if;
    execute v_new;
  end if;
end $mig$;
revoke all on function dela_threads(uuid, text) from public, anon, authenticated;
revoke all on function dela_meetings(uuid, text, uuid, uuid) from public, anon, authenticated;

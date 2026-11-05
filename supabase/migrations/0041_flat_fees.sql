-- One fee for everyone (Stacey 2026-11-05): every transaction has a 5% fee from the client side and a 5% fee from the
-- freelancer side. No plan lowers them. Both are settings the admin can change. The fee columns on plan versions stay
-- for history but are no longer read. Agreements already drafted keep the fees written into them. Additive.
-- Also the agency fee split limits (the agency's share of a bench member's split: 5% to 50%; the minimum can never be
-- below the freelancer-side fee, so the agency's share always covers it).
insert into settings (key, value, label, section, unit, status, source, note) values
  ('fee.client_bps', '500', 'Client-side fee on every transaction (attorneys, and agencies hiring)', 'Engagement money', 'basis points', 'C', 'Stacey 2026-11-05', 'The same on every plan.'),
  ('fee.freelancer_bps', '500', 'Freelancer-side fee on every transaction', 'Engagement money', 'basis points', 'C', 'Stacey 2026-11-05', 'The same on every plan. On agency work done by a bench member, the agency pays it.'),
  ('agency.split_min_agency_bps', '500', 'Smallest share an agency can take of a bench member''s work', 'Agencies', 'basis points', 'C', 'Stacey 2026-11-05', 'Never below the freelancer-side fee, so the agency''s share always covers it.'),
  ('agency.split_max_agency_bps', '5000', 'Largest share an agency can take of a bench member''s work', 'Agencies', 'basis points', 'C', 'Stacey 2026-11-05', 'The person doing the work keeps at least half.')
on conflict (key) do nothing;

create or replace function dela_plan_fee_bps(p_person uuid, p_side text) returns int language sql stable as $$
  select case when p_side = 'attorney' then dela_int_setting('fee.client_bps', 500) else dela_int_setting('fee.freelancer_bps', 500) end
$$;

-- The agency split limits as DELA applies them: the minimum is never below the freelancer-side fee
create or replace function dela_agency_split_limits() returns jsonb language sql stable as $$
  select jsonb_build_object('min_bps', greatest(dela_int_setting('agency.split_min_agency_bps', 500), dela_int_setting('fee.freelancer_bps', 500)),
    'max_bps', dela_int_setting('agency.split_max_agency_bps', 5000))
$$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('dela_plan_fee_bps', 'dela_agency_split_limits') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end $$;

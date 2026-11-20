-- Step 63: own AI key in onboarding (Stacey 2026-11-20: "we need BYOK. On onboarding it should ask them if they
-- use ChatGPT or Claude and if so help them get an API key and add it").
-- DELA asks once per workspace, on Home. The answer is kept so the question does not come back.
-- Additive: one table and two functions. The key itself is saved by the existing key functions (0014), sealed as before.

create table if not exists ai_key_asks (
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  answer text not null check (answer in ('openai', 'anthropic', 'none')),
  answered_at timestamptz not null default now(),
  primary key (person_id, side)
);
alter table ai_key_asks enable row level security;

-- Should Home ask? Only while own keys are open for this person, the AI is on, they have no key of their own on this
-- workspace, no firm key covers them, and they have not answered yet.
create or replace function dela_ai_key_ask(p_person uuid, p_side text) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object(
    'answer', (select answer from ai_key_asks where person_id = p_person and side = p_side),
    'show', p_side in ('attorney', 'freelancer') and dela_switch_on('byok', p_person) and dela_switch_on('ai_generation', p_person)
      and not exists (select 1 from ai_key_asks where person_id = p_person and side = p_side)
      and not exists (select 1 from ai_keys where scope = 'person' and person_id = p_person and side = p_side and status <> 'removed')
      and (dela_firm_key_for(p_person, p_side)).id is null)
$$;
revoke all on function dela_ai_key_ask(uuid, text) from public, anon, authenticated;

create or replace function dela_ai_key_ask_set(p_person uuid, p_side text, p_answer text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if p_side not in ('attorney', 'freelancer') or p_answer not in ('openai', 'anthropic', 'none') then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  insert into ai_key_asks (person_id, side, answer) values (p_person, p_side, p_answer)
  on conflict (person_id, side) do update set answer = excluded.answer, answered_at = now();
  return jsonb_build_object('ok', true, 'answer', p_answer);
end $$;
revoke all on function dela_ai_key_ask_set(uuid, text, text) from public, anon, authenticated;

-- The recorder consent said "including any client information on it", which reads as if recording client
-- information is fine. DELA's rule is that client information does not belong in DELA, and beta users record
-- practice runs or non-client work (Stacey's recorder check 2026-11-05). Only changes the wording if it is still
-- the old one, and records the change in the settings history.
with old as (
  select key, value, status from settings
  where key = 'recorder.consent_text'
    and value = to_jsonb('I understand this records my entire screen, including any client information on it. I will pause or close anything I don''t want recorded.'::text)
), upd as (
  update settings s
  set value = to_jsonb('I understand this records my whole screen. I will record only practice runs or work with no client information, close anything with client information before I start, and pause if any appears.'::text),
      updated_at = now()
  from old where s.key = old.key
  returning s.key, s.value, s.status
)
insert into settings_history (key, old_value, new_value, old_status, new_status, changed_by, reason)
select upd.key, old.value, upd.value, old.status, upd.status, null, 'Wording matches the rule that client information does not belong in DELA (recorder check 2026-11-05)'
from upd join old on old.key = upd.key;

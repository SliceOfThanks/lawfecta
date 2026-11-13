-- Vectera's API lives at https://www.vectera.com/api/v2 (their API reference, read 2026-11-13). The address seeded in
-- 0029 was a placeholder "to confirm with Vectera". Only the placeholder is replaced; an address set by hand stays.
update settings set value = '"https://www.vectera.com"'::jsonb, note = 'From Vectera''s API reference (requests go to /api/v2 under this address).'
where key = 'meeting.vectera_api_base' and value = '"https://api.vectera.com"'::jsonb;

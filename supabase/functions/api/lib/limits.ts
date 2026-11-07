// Form limits the server enforces, in one place. GET /me and sign-in send them to the screens, so a screen never
// holds its own copy of a number (AI review 0.9.1, payments 2). The open-jobs number is also the database's own
// check on standing_arrangements.max_open (migration 0052): change both together.
export const FORM_LIMITS = {
  chat_attach_max: 5,
  services_max: 12,
  practice_areas_max: 15,
  software_max: 30,
  standing_max_open: 20,
  scribe_file_mb: 25,
} as const;

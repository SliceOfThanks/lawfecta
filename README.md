# Lawfecta DELA

DELA helps solo attorneys turn work into clear playbooks and hire freelance paralegals, with booking, contracts, milestone funding and reviews on the platform.

- Specs: docs/specs (Program Guide and phase documents). Decisions: config/decisions.json and docs/Decision_Sheet.docx.
- Status: STATUS.md. Instructions for Claude: CLAUDE.md.
- Code: supabase/ (database and api), widgets/ (Brilliant Directories), shared/, app/, admin/ (served by jsDelivr).

Tests: `tools/dbtest.sh`, then `deno test -A supabase/functions/api/app_test.ts tests/php/auth_test.ts`, then run `deno run -A tests/pw/server.ts` and `node tests/pw/foundation-test.js`.

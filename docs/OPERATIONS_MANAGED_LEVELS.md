# Managed semester levels operations

Release B keeps the legacy enum columns and dual-writes them with `semesterLevelId`.

1. Take and record a Neon restore point.
2. Deploy the expand migration: `npx prisma migrate deploy`.
3. Dry-run: `npm run db:backfill:semester-levels`.
4. Apply with an absolute protected report path: `npm run db:backfill:semester-levels -- --apply --report=/absolute/path/report.json`.
5. Verify: `npm run db:verify:semester-level-parity`.

Do not promote the Release-B application if the verifier reports any missing mappings, mismatches, inactive active-record references, or blocking errors. Roll back application code normally while the legacy columns remain. Release C requires a separate named backup, contract migration, and new-only parity verification before dropping the enum.

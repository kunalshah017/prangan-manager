# Managed semester levels operations

Managed levels use `semesterLevelId` as the canonical reference. The legacy
`level` columns remain as text mirrors for older clients, so administrator-defined
codes are supported without changing a PostgreSQL enum.

1. Take and record a Neon restore point.
2. Deploy the expand migration: `npx prisma migrate deploy`.
3. Dry-run: `npm run db:backfill:semester-levels`.
4. Apply with an absolute protected report path: `npm run db:backfill:semester-levels -- --apply --report=/absolute/path/report.json`.
5. Verify: `npm run db:verify:semester-level-parity`.

Do not promote the application if the verifier reports any missing mappings,
mismatches, inactive active-record references, or blocking errors. A later
contract migration may remove the text mirrors after all old clients are retired.

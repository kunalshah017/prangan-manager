# Operations Guide

## Local Fixtures

The fixture reset is intentionally destructive and local-only:

```bash
cd server
NODE_ENV=development \
ALLOW_LOCAL_SEED=true \
ALLOW_DESTRUCTIVE_SEED=true \
DEV_SEED_PASSWORD='choose-a-local-password' \
npm run db:reset:fixtures
```

The additive syllabus fixture requires only the local-environment confirmation:

```bash
cd server
NODE_ENV=development ALLOW_LOCAL_SEED=true npm run db:seed:syllabus
```

Neither command is valid for shared, staging, or production data. Use reviewed migrations or administrator workflows for those environments.

## Database Migrations

Do not modify applied migration files. Use expand, backfill, validate, and contract changes for production schema evolution. Before a production migration:

1. Confirm backup/PITR and a tested restore procedure.
2. Run `npx prisma migrate status` through an approved production connection.
3. Review the generated migration and its rollback or mitigation plan.
4. Apply the migration as an explicit operator action; the Azure build workflow never runs migrations.

## Azure App Service Release

The server is deployed only to Azure App Service. The GitHub Actions workflow installs with `npm ci`, builds the server, removes development dependencies, and deploys the runtime artifact. Before promoting a release:

1. Confirm App Service startup uses `node dist/server.js` and the platform provides `PORT`.
2. Confirm `DATABASE_URL`, `JWT_SECRET`, mail credentials, and allowed client origins are configured in Azure, not source control.
3. Confirm the deployed `/health` endpoint and an authenticated API route from the intended client origin.
4. Review App Service logs for startup, database connectivity, and CORS failures.

Production credential rotation, migration status, backups/PITR, App Service configuration, and post-deploy smoke tests remain manual release gates.

## Structured Person Name Migration

The person-name rollout is an operator-controlled expand, backfill, validate, and contract migration. Do not run its data updates from CI/CD.

After applying the nullable `add_person_name_parts` migration and deploying the compatible server, inspect the current data without writing:

```bash
cd server
npm run db:backfill:person-names
```

Apply proposed canonical parts only after reviewing the aggregate counts. The report path must be absolute, protected, outside the repository, and not an uploaded CI artifact. The command creates the report with owner-only permissions and refuses to overwrite an existing file:

```bash
npm run db:backfill:person-names -- \
	--apply \
	--report=/protected/path/person-name-backfill.jsonl
```

Resolve blocking IDs and review one-token or four-plus-token rows through an approved administrator/data workflow. Once canonical parts are accepted, normalize the compatibility `name` field explicitly:

```bash
npm run db:backfill:person-names -- \
	--apply \
	--normalize-name \
	--report=/protected/path/person-name-normalization.jsonl
npm run db:backfill:person-names
```

Do not make `firstName` required until the final dry-run reports no blocking rows, no write conflicts, no pending backfills, and no composition mismatches. Reconfirm backup/PITR, restore procedure, migration status, and smoke checks immediately before the later contract migration.

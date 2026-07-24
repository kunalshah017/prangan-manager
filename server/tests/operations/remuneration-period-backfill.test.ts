import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schemaUrl = new URL("../../prisma/schema.prisma", import.meta.url);
const migrationUrl = new URL(
  "../../prisma/migrations/20260724180000_add_effective_remuneration_periods/migration.sql",
  import.meta.url,
);

test("schema stores audited effective-dated remuneration periods", async () => {
  const schema = await readFile(schemaUrl, "utf8");

  assert.match(schema, /model SemesterRemunerationPeriod \{/);
  assert.match(schema, /amountPerDay\s+Decimal/);
  assert.match(schema, /effectiveFrom\s+DateTime\s+@db\.Date/);
  assert.match(schema, /effectiveTo\s+DateTime\?\s+@db\.Date/);
  assert.match(schema, /@@unique\(\[userId, semesterId, effectiveFrom\]\)/);
});

test("migration backfills every semester educator and center manager idempotently", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /EDUCATOR/);
  assert.match(migration, /CENTER_MANAGER/);
  assert.match(migration, /"UserRoleAssignments"/);
  assert.match(migration, /"SemesterRemunerationRate"/);
  assert.match(migration, /"reimbursementAmount"/);
  assert.match(migration, /"startDate"/);
  assert.match(migration, /ON CONFLICT \("userId", "semesterId", "effectiveFrom"\) DO NOTHING/);
});

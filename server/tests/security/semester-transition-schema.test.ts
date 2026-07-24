import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schemaUrl = new URL("../../prisma/schema.prisma", import.meta.url);
const migrationUrl = new URL(
  "../../prisma/migrations/20260724120000_add_semester_transitions_and_rates/migration.sql",
  import.meta.url,
);

test("semester transition schema preserves lifecycle, plans, and scoped rates", async () => {
  const schema = await readFile(schemaUrl, "utf8");

  assert.match(
    schema,
    /enum SemesterStatus\s*\{[\s\S]*DRAFT[\s\S]*ACTIVE[\s\S]*ARCHIVED[\s\S]*\}/,
  );
  assert.match(
    schema,
    /model SemesterTransition\s*\{[\s\S]*studentPlan\s+Json[\s\S]*staffPlan\s+Json[\s\S]*\}/,
  );
  assert.match(
    schema,
    /model SemesterRemunerationRate\s*\{[\s\S]*dailyRate\s+Decimal[\s\S]*@@unique\(\[userId,\s*semesterId\]\)[\s\S]*\}/,
  );
  assert.match(
    schema,
    /model Semesters\s*\{[\s\S]*status\s+SemesterStatus\s+@default\(DRAFT\)/,
  );
});

test("semester transition migration backfills existing semesters and scoped rates", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /ADD COLUMN\s+"status"/);
  assert.match(migration, /DEFAULT 'ACTIVE'/);
  assert.match(migration, /CREATE TABLE "SemesterTransition"/);
  assert.match(migration, /CREATE TABLE "SemesterRemunerationRate"/);
  assert.match(migration, /ON CONFLICT \("userId", "semesterId"\) DO NOTHING/);
});

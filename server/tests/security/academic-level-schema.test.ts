import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const schemaUrl = new URL("../../prisma/schema.prisma", import.meta.url);
const migrationsUrl = new URL("../../prisma/migrations/", import.meta.url);
const migrationUrl = new URL(
  "../../prisma/migrations/20260722120000_expand_managed_semester_levels/migration.sql",
  import.meta.url,
);
const contractMigrationUrl = new URL(
  "../../prisma/migrations/20260817120000_contract_managed_semester_levels/migration.sql",
  import.meta.url,
);

test("operational models use only managed semester-level references", async () => {
  const schema = await readFile(schemaUrl, "utf8");

  assert.match(schema, /model AcademicLevel \{/);
  assert.match(schema, /code\s+String\s+@unique/);
  assert.match(schema, /journeyOrder\s+Int\s+@unique/);
  assert.match(schema, /model SemesterLevel \{/);
  assert.match(schema, /@@unique\(\[semesterId, academicLevelId\]\)/);
  assert.match(schema, /@@unique\(\[id, semesterId\]\)/);
  assert.match(schema, /levels\s+SemesterLevel\[\]/);

  for (const model of [
    "UserRoleAssignments",
    "StudentEnrollments",
    "Syllabus",
    "Exam",
  ]) {
    const source = schema.match(
      new RegExp(`model ${model} \\{[\\s\\S]*?\\n\\}`),
    )?.[0];
    assert.ok(source, `expected ${model} model`);
    assert.match(
      source,
      model === "UserRoleAssignments"
        ? /semesterLevelId\s+String\?/
        : /semesterLevelId\s+String\b(?!\?)/,
    );
    assert.match(
      source,
      model === "UserRoleAssignments"
        ? /semesterLevel\s+SemesterLevel\?/
        : /semesterLevel\s+SemesterLevel\b(?!\?)/,
    );
    assert.doesNotMatch(source, /\n\s*level\s+String/);
  }
  assert.doesNotMatch(schema, /enum Level\s*\{/);
});

test("managed level code migration preserves legacy values as text", async () => {
  const migrationName = (
    await readdir(migrationsUrl, { withFileTypes: true })
  ).find(
    (entry) =>
      entry.isDirectory() &&
      entry.name.endsWith("_expand_managed_level_codes_to_text"),
  )?.name;

  assert.ok(
    migrationName,
    "expected a migration that converts legacy Level enum columns to text",
  );
  if (!migrationName) return;

  const migration = await readFile(
    new URL(`${migrationName}/migration.sql`, migrationsUrl),
    "utf8",
  );
  for (const table of [
    "UserRoleAssignments",
    "StudentEnrollments",
    "Syllabus",
    "Exam",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `ALTER TABLE "${table}"\\s+ALTER COLUMN "level" TYPE TEXT USING "level"::text`,
      ),
    );
  }
  assert.match(migration, /BEGIN;/);
  assert.match(migration, /COMMIT;/);
  assert.doesNotMatch(migration, /\bDROP TYPE\b/);
});

test("expand migration is additive and enforces semester-matched level references", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /CREATE TABLE "AcademicLevel"/);
  assert.match(migration, /CREATE TABLE "SemesterLevel"/);
  assert.match(
    migration,
    /CHECK \("semesterLevelId" IS NULL OR "semesterId" IS NOT NULL\)/,
  );
  for (const table of [
    "UserRoleAssignments",
    "StudentEnrollments",
    "Syllabus",
    "Exam",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `ALTER TABLE "${table}"[\\s\\S]*?FOREIGN KEY \\(\\"semesterLevelId\\", \\"semesterId\\"\\)[\\s\\S]*?REFERENCES \\"SemesterLevel\\"\\(\\"id\\", \\"semesterId\\"\\)`,
      ),
    );
  }
  assert.match(migration, /BEGIN;/);
  assert.match(migration, /COMMIT;/);
  assert.doesNotMatch(migration, /\bDROP\b|\bTRUNCATE\b|\bDELETE FROM\b/);
});

test("contract migration removes compatibility columns after guarded validation", async () => {
  const migration = await readFile(contractMigrationUrl, "utf8");

  for (const table of [
    "UserRoleAssignments",
    "StudentEnrollments",
    "Syllabus",
    "Exam",
  ]) {
    assert.match(
      migration,
      new RegExp(`ALTER TABLE "${table}"[\\s\\S]*?DROP COLUMN "level"`),
    );
  }
  assert.match(
    migration,
    /canonical references are missing or belong to another semester/,
  );
  assert.match(migration, /DROP TYPE IF EXISTS "Level"/);
});

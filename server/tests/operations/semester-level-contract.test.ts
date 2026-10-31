import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../prisma/migrations/20260817120000_contract_managed_semester_levels/migration.sql",
  import.meta.url,
);

test("contract migration aborts when required canonical references are missing", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  for (const table of ["StudentEnrollments", "Syllabus", "Exam"]) {
    assert.match(
      migration,
      new RegExp(
        `FROM "${table}"[\\s\\S]*?WHERE "semesterLevelId" IS NULL[\\s\\S]*?RAISE EXCEPTION`,
      ),
    );
  }
  assert.match(migration, /canonical references are missing or belong to another semester/);
  assert.match(migration, /duplicate Syllabus canonical keys exist/);
  assert.match(migration, /duplicate Exam canonical keys exist/);
  assert.match(
    migration,
    /FROM "UserRoleAssignments"[\s\S]*?"semesterLevelId" IS NULL[\s\S]*?"subRole" = 'EDUCATOR'[\s\S]*?RAISE EXCEPTION/,
  );
  assert.match(migration, /IS DISTINCT FROM/);
  for (const table of [
    "UserRoleAssignments",
    "StudentEnrollments",
    "Syllabus",
    "Exam",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `FROM "${table}"[\\s\\S]*?JOIN "SemesterLevel"[\\s\\S]*?JOIN "AcademicLevel"[\\s\\S]*?"level" IS NOT NULL`,
      ),
    );
  }
});

test("contract migration ignores inactive educator assignments without a level", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(
    migration,
    /"semesterLevelId" IS NULL[\s\S]*?"subRole" = 'EDUCATOR'[\s\S]*?"isActive" = true/,
  );
});

test("contract migration makes operational references canonical-only", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  for (const table of ["StudentEnrollments", "Syllabus", "Exam"]) {
    assert.match(
      migration,
      new RegExp(
        `ALTER TABLE "${table}"[\\s\\S]*?ALTER COLUMN "semesterLevelId" SET NOT NULL[\\s\\S]*?DROP COLUMN "level"`,
      ),
    );
  }
  assert.match(
    migration,
    /ALTER TABLE "UserRoleAssignments"\s+DROP COLUMN "level"/,
  );
  assert.match(migration, /DROP TYPE IF EXISTS "Level"/);
  assert.match(
    migration,
    /Syllabus_projectId_centerId_semesterId_semesterLevelId_name_key/,
  );
  assert.match(
    migration,
    /Exam_projectId_centerId_semesterId_semesterLevelId_cycle_name_key/,
  );
  assert.match(migration, /BEGIN;/);
  assert.match(migration, /COMMIT;/);
});

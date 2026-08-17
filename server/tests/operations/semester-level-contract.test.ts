import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildSemesterLevelIntegrityReport,
  hasSemesterLevelIntegrityViolations,
} from "../../lib/semester-level-integrity.js";

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

test("canonical integrity report blocks missing, orphaned, cross-semester, and duplicate references", () => {
  const report = buildSemesterLevelIntegrityReport(
    [
      {
        tableName: "StudentEnrollments",
        missingSemesterLevelIds: 1n,
        orphanedSemesterLevelIds: 0n,
        crossSemesterLevelIds: 0n,
      },
      {
        tableName: "Syllabus",
        missingSemesterLevelIds: 0n,
        orphanedSemesterLevelIds: 1n,
        crossSemesterLevelIds: 0n,
      },
      {
        tableName: "Exam",
        missingSemesterLevelIds: 0n,
        orphanedSemesterLevelIds: 0n,
        crossSemesterLevelIds: 1n,
      },
    ],
    [
      { tableName: "Syllabus", duplicateCanonicalKeys: 2n },
      { tableName: "Exam", duplicateCanonicalKeys: 0n },
    ],
  );

  assert.deepEqual(report.tables.Exam, {
    missingSemesterLevelIds: 0,
    orphanedSemesterLevelIds: 0,
    crossSemesterLevelIds: 1,
  });
  assert.deepEqual(report.duplicateCanonicalKeys, { Syllabus: 2, Exam: 0 });
  assert.equal(hasSemesterLevelIntegrityViolations(report), true);
});

test("canonical integrity report is clean when every count is zero", () => {
  const report = buildSemesterLevelIntegrityReport([], []);

  assert.equal(hasSemesterLevelIntegrityViolations(report), false);
  assert.deepEqual(report.tables.UserRoleAssignments, {
    missingSemesterLevelIds: 0,
    orphanedSemesterLevelIds: 0,
    crossSemesterLevelIds: 0,
  });
});

-- Contract managed semester levels after the expand/backfill compatibility window.
-- This migration intentionally aborts before dropping legacy columns if canonical
-- references are incomplete, invalid, or would violate the new unique keys.

BEGIN;

LOCK TABLE "UserRoleAssignments" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "StudentEnrollments" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "Syllabus" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "Exam" IN ACCESS EXCLUSIVE MODE;

DO $migration$
DECLARE
  invalid_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM "UserRoleAssignments"
  WHERE "semesterLevelId" IS NULL
    AND (
      "level" IS NOT NULL
      OR ("subRole" = 'EDUCATOR' AND "semesterId" IS NOT NULL)
    );
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot contract managed semester levels: % educator assignments would lose their level scope', invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM "StudentEnrollments"
  WHERE "semesterLevelId" IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot contract managed semester levels: % StudentEnrollments rows have no semesterLevelId', invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM "Syllabus"
  WHERE "semesterLevelId" IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot contract managed semester levels: % Syllabus rows have no semesterLevelId', invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM "Exam"
  WHERE "semesterLevelId" IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot contract managed semester levels: % Exam rows have no semesterLevelId', invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM (
    SELECT ura."semesterLevelId", ura."semesterId"
    FROM "UserRoleAssignments" ura
    WHERE ura."semesterLevelId" IS NOT NULL
    UNION ALL
    SELECT enrollment."semesterLevelId", enrollment."semesterId"
    FROM "StudentEnrollments" enrollment
    UNION ALL
    SELECT syllabus."semesterLevelId", syllabus."semesterId"
    FROM "Syllabus" syllabus
    UNION ALL
    SELECT exam."semesterLevelId", exam."semesterId"
    FROM "Exam" exam
  ) scoped_level
  LEFT JOIN "SemesterLevel" semester_level
    ON semester_level."id" = scoped_level."semesterLevelId"
   AND semester_level."semesterId" = scoped_level."semesterId"
  WHERE semester_level."id" IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot contract managed semester levels: % canonical references are missing or belong to another semester', invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM (
    SELECT ura."level" AS "legacyLevel", academic_level."code" AS "academicCode"
    FROM "UserRoleAssignments" ura
    LEFT JOIN "SemesterLevel" semester_level
      ON semester_level."id" = ura."semesterLevelId"
     AND semester_level."semesterId" = ura."semesterId"
    LEFT JOIN "AcademicLevel" academic_level
      ON academic_level."id" = semester_level."academicLevelId"
    WHERE ura."level" IS NOT NULL
    UNION ALL
    SELECT enrollment."level", academic_level."code"
    FROM "StudentEnrollments" enrollment
    LEFT JOIN "SemesterLevel" semester_level
      ON semester_level."id" = enrollment."semesterLevelId"
     AND semester_level."semesterId" = enrollment."semesterId"
    LEFT JOIN "AcademicLevel" academic_level
      ON academic_level."id" = semester_level."academicLevelId"
    WHERE enrollment."level" IS NOT NULL
    UNION ALL
    SELECT syllabus."level", academic_level."code"
    FROM "Syllabus" syllabus
    LEFT JOIN "SemesterLevel" semester_level
      ON semester_level."id" = syllabus."semesterLevelId"
     AND semester_level."semesterId" = syllabus."semesterId"
    LEFT JOIN "AcademicLevel" academic_level
      ON academic_level."id" = semester_level."academicLevelId"
    WHERE syllabus."level" IS NOT NULL
    UNION ALL
    SELECT exam."level", academic_level."code"
    FROM "Exam" exam
    LEFT JOIN "SemesterLevel" semester_level
      ON semester_level."id" = exam."semesterLevelId"
     AND semester_level."semesterId" = exam."semesterId"
    LEFT JOIN "AcademicLevel" academic_level
      ON academic_level."id" = semester_level."academicLevelId"
    WHERE exam."level" IS NOT NULL
  ) semantic_mismatch
  WHERE "legacyLevel" IS DISTINCT FROM "academicCode";
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot contract managed semester levels: % operational rows have legacy level values that do not match canonical academic level codes', invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM (
    SELECT "projectId", "centerId", "semesterId", "semesterLevelId", "name"
    FROM "Syllabus"
    GROUP BY "projectId", "centerId", "semesterId", "semesterLevelId", "name"
    HAVING COUNT(*) > 1
  ) duplicate_syllabus;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot contract managed semester levels: % duplicate Syllabus canonical keys exist', invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM (
    SELECT "projectId", "centerId", "semesterId", "semesterLevelId", "cycle", "name"
    FROM "Exam"
    GROUP BY "projectId", "centerId", "semesterId", "semesterLevelId", "cycle", "name"
    HAVING COUNT(*) > 1
  ) duplicate_exam;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot contract managed semester levels: % duplicate Exam canonical keys exist', invalid_count;
  END IF;
END
$migration$;

DROP INDEX "Syllabus_projectId_centerId_semesterId_level_name_key";
DROP INDEX "Syllabus_projectId_centerId_semesterId_level_idx";
DROP INDEX "Exam_projectId_centerId_semesterId_level_cycle_name_key";
DROP INDEX "Exam_projectId_centerId_semesterId_level_cycle_idx";

ALTER TABLE "StudentEnrollments"
  ALTER COLUMN "semesterLevelId" SET NOT NULL,
  DROP COLUMN "level";

ALTER TABLE "Syllabus"
  ALTER COLUMN "semesterLevelId" SET NOT NULL,
  DROP COLUMN "level";

ALTER TABLE "Exam"
  ALTER COLUMN "semesterLevelId" SET NOT NULL,
  DROP COLUMN "level";

ALTER TABLE "UserRoleAssignments"
  DROP COLUMN "level";

DROP TYPE IF EXISTS "Level";

CREATE UNIQUE INDEX "Syllabus_projectId_centerId_semesterId_semesterLevelId_name_key"
  ON "Syllabus"("projectId", "centerId", "semesterId", "semesterLevelId", "name");

CREATE INDEX "Syllabus_projectId_centerId_semesterId_semesterLevelId_idx"
  ON "Syllabus"("projectId", "centerId", "semesterId", "semesterLevelId");

CREATE UNIQUE INDEX "Exam_projectId_centerId_semesterId_semesterLevelId_cycle_name_key"
  ON "Exam"("projectId", "centerId", "semesterId", "semesterLevelId", "cycle", "name");

CREATE INDEX "Exam_projectId_centerId_semesterId_semesterLevelId_cycle_idx"
  ON "Exam"("projectId", "centerId", "semesterId", "semesterLevelId", "cycle");

COMMIT;

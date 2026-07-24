-- Managed academic-level codes are administrator-defined and cannot remain
-- constrained by the original six-value PostgreSQL enum.
BEGIN;

ALTER TABLE "UserRoleAssignments"
  ALTER COLUMN "level" TYPE TEXT USING "level"::text;

ALTER TABLE "StudentEnrollments"
  ALTER COLUMN "level" TYPE TEXT USING "level"::text;

ALTER TABLE "Syllabus"
  ALTER COLUMN "level" TYPE TEXT USING "level"::text;

ALTER TABLE "Exam"
  ALTER COLUMN "level" TYPE TEXT USING "level"::text;

COMMIT;

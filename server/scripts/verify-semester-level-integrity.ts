import { prisma } from "../lib/prisma.js";
import {
  buildSemesterLevelIntegrityReport,
  hasSemesterLevelIntegrityViolations,
  type DuplicateCanonicalKeyRow,
  type SemesterLevelIntegrityRow,
} from "../lib/semester-level-integrity.js";

const referenceQuery = `
  WITH operational_references AS (
    SELECT 'UserRoleAssignments' AS "tableName", "semesterLevelId", "semesterId", "subRole"::text AS "subRole"
    FROM "UserRoleAssignments"
    UNION ALL
    SELECT 'StudentEnrollments', "semesterLevelId", "semesterId", NULL::text
    FROM "StudentEnrollments"
    UNION ALL
    SELECT 'Syllabus', "semesterLevelId", "semesterId", NULL::text
    FROM "Syllabus"
    UNION ALL
    SELECT 'Exam', "semesterLevelId", "semesterId", NULL::text
    FROM "Exam"
  )
  SELECT
    reference."tableName",
    COUNT(*) FILTER (
      WHERE (
        reference."tableName" <> 'UserRoleAssignments'
        OR (
          reference."tableName" = 'UserRoleAssignments'
          AND reference."subRole" = 'EDUCATOR'
          AND reference."semesterId" IS NOT NULL
        )
      )
      AND reference."semesterLevelId" IS NULL
    ) AS "missingSemesterLevelIds",
    COUNT(*) FILTER (
      WHERE reference."semesterLevelId" IS NOT NULL
        AND semester_level."id" IS NULL
    ) AS "orphanedSemesterLevelIds",
    COUNT(*) FILTER (
      WHERE semester_level."id" IS NOT NULL
        AND semester_level."semesterId" IS DISTINCT FROM reference."semesterId"
    ) AS "crossSemesterLevelIds"
  FROM operational_references reference
  LEFT JOIN "SemesterLevel" semester_level
    ON semester_level."id" = reference."semesterLevelId"
  GROUP BY reference."tableName"
`;

const duplicateQuery = `
  SELECT 'Syllabus' AS "tableName", COUNT(*) AS "duplicateCanonicalKeys"
  FROM (
    SELECT "projectId", "centerId", "semesterId", "semesterLevelId", "name"
    FROM "Syllabus"
    GROUP BY "projectId", "centerId", "semesterId", "semesterLevelId", "name"
    HAVING COUNT(*) > 1
  ) duplicate_syllabus
  UNION ALL
  SELECT 'Exam', COUNT(*)
  FROM (
    SELECT "projectId", "centerId", "semesterId", "semesterLevelId", "cycle", "name"
    FROM "Exam"
    GROUP BY "projectId", "centerId", "semesterId", "semesterLevelId", "cycle", "name"
    HAVING COUNT(*) > 1
  ) duplicate_exam
`;

const main = async () => {
  const [referenceRows, duplicateRows] = await Promise.all([
    prisma.$queryRawUnsafe<SemesterLevelIntegrityRow[]>(referenceQuery),
    prisma.$queryRawUnsafe<DuplicateCanonicalKeyRow[]>(duplicateQuery),
  ]);
  const report = buildSemesterLevelIntegrityReport(
    referenceRows,
    duplicateRows,
  );

  console.log(JSON.stringify(report, null, 2));
  if (hasSemesterLevelIntegrityViolations(report)) process.exitCode = 1;
};

main()
  .catch((error) => {
    console.error("Semester-level integrity verification failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

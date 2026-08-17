import { prisma } from "../lib/prisma.js";

type SemanticMismatchRow = {
  tableName: string;
  mismatchCount: bigint | number;
};

const semanticMismatchQuery = `
  SELECT 'UserRoleAssignments' AS "tableName", COUNT(*) AS "mismatchCount"
  FROM "UserRoleAssignments" ura
  LEFT JOIN "SemesterLevel" semester_level
    ON semester_level."id" = ura."semesterLevelId"
   AND semester_level."semesterId" = ura."semesterId"
  LEFT JOIN "AcademicLevel" academic_level
    ON academic_level."id" = semester_level."academicLevelId"
  WHERE ura."level" IS NOT NULL
    AND ura."level" IS DISTINCT FROM academic_level."code"
  UNION ALL
  SELECT 'StudentEnrollments', COUNT(*)
  FROM "StudentEnrollments" enrollment
  LEFT JOIN "SemesterLevel" semester_level
    ON semester_level."id" = enrollment."semesterLevelId"
   AND semester_level."semesterId" = enrollment."semesterId"
  LEFT JOIN "AcademicLevel" academic_level
    ON academic_level."id" = semester_level."academicLevelId"
  WHERE enrollment."level" IS NOT NULL
    AND enrollment."level" IS DISTINCT FROM academic_level."code"
  UNION ALL
  SELECT 'Syllabus', COUNT(*)
  FROM "Syllabus" syllabus
  LEFT JOIN "SemesterLevel" semester_level
    ON semester_level."id" = syllabus."semesterLevelId"
   AND semester_level."semesterId" = syllabus."semesterId"
  LEFT JOIN "AcademicLevel" academic_level
    ON academic_level."id" = semester_level."academicLevelId"
  WHERE syllabus."level" IS NOT NULL
    AND syllabus."level" IS DISTINCT FROM academic_level."code"
  UNION ALL
  SELECT 'Exam', COUNT(*)
  FROM "Exam" exam
  LEFT JOIN "SemesterLevel" semester_level
    ON semester_level."id" = exam."semesterLevelId"
   AND semester_level."semesterId" = exam."semesterId"
  LEFT JOIN "AcademicLevel" academic_level
    ON academic_level."id" = semester_level."academicLevelId"
  WHERE exam."level" IS NOT NULL
    AND exam."level" IS DISTINCT FROM academic_level."code"
`;

const main = async () => {
  const rows = await prisma.$queryRawUnsafe<SemanticMismatchRow[]>(
    semanticMismatchQuery,
  );
  const report = Object.fromEntries(
    rows.map((row) => [row.tableName, Number(row.mismatchCount)]),
  );

  console.log(JSON.stringify(report, null, 2));
  if (Object.values(report).some((count) => count > 0)) process.exitCode = 1;
};

main()
  .catch((error) => {
    console.error("Semester-level cutover verification failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

-- Expand-only managed semester levels migration.
-- Existing Level columns remain authoritative until the contract migration.
-- Application dual-write and parity verification enforce that legacy level
-- codes match the joined AcademicLevel code during the compatibility window.

BEGIN;

CREATE TABLE "AcademicLevel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "journeyOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AcademicLevel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SemesterLevel" (
    "id" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "academicLevelId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SemesterLevel_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UserRoleAssignments" ADD COLUMN "semesterLevelId" TEXT;
ALTER TABLE "StudentEnrollments" ADD COLUMN "semesterLevelId" TEXT;
ALTER TABLE "Syllabus" ADD COLUMN "semesterLevelId" TEXT;
ALTER TABLE "Exam" ADD COLUMN "semesterLevelId" TEXT;

CREATE UNIQUE INDEX "AcademicLevel_code_key" ON "AcademicLevel"("code");
CREATE UNIQUE INDEX "AcademicLevel_journeyOrder_key" ON "AcademicLevel"("journeyOrder");
CREATE INDEX "AcademicLevel_isActive_journeyOrder_idx" ON "AcademicLevel"("isActive", "journeyOrder");
CREATE UNIQUE INDEX "SemesterLevel_semesterId_academicLevelId_key" ON "SemesterLevel"("semesterId", "academicLevelId");
CREATE UNIQUE INDEX "SemesterLevel_id_semesterId_key" ON "SemesterLevel"("id", "semesterId");
CREATE INDEX "SemesterLevel_semesterId_isActive_idx" ON "SemesterLevel"("semesterId", "isActive");
CREATE INDEX "SemesterLevel_academicLevelId_idx" ON "SemesterLevel"("academicLevelId");
CREATE INDEX "UserRoleAssignments_semesterLevelId_idx" ON "UserRoleAssignments"("semesterLevelId");
CREATE INDEX "StudentEnrollments_semesterLevelId_idx" ON "StudentEnrollments"("semesterLevelId");
CREATE INDEX "Syllabus_semesterLevelId_idx" ON "Syllabus"("semesterLevelId");
CREATE INDEX "Exam_semesterLevelId_idx" ON "Exam"("semesterLevelId");

ALTER TABLE "SemesterLevel" ADD CONSTRAINT "SemesterLevel_semesterId_fkey"
    FOREIGN KEY ("semesterId") REFERENCES "Semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SemesterLevel" ADD CONSTRAINT "SemesterLevel_academicLevelId_fkey"
    FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserRoleAssignments" ADD CONSTRAINT "UserRoleAssignments_semesterLevelId_semesterId_fkey"
    FOREIGN KEY ("semesterLevelId", "semesterId") REFERENCES "SemesterLevel"("id", "semesterId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollments" ADD CONSTRAINT "StudentEnrollments_semesterLevelId_semesterId_fkey"
    FOREIGN KEY ("semesterLevelId", "semesterId") REFERENCES "SemesterLevel"("id", "semesterId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_semesterLevelId_semesterId_fkey"
    FOREIGN KEY ("semesterLevelId", "semesterId") REFERENCES "SemesterLevel"("id", "semesterId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_semesterLevelId_semesterId_fkey"
    FOREIGN KEY ("semesterLevelId", "semesterId") REFERENCES "SemesterLevel"("id", "semesterId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserRoleAssignments"
    ADD CONSTRAINT "UserRoleAssignments_semester_level_requires_semester"
    CHECK ("semesterLevelId" IS NULL OR "semesterId" IS NOT NULL);

COMMIT;

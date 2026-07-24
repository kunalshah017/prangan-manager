CREATE TYPE "SemesterStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "SemesterTransitionStatus" AS ENUM ('DRAFT', 'COMPLETED');

ALTER TABLE "Semesters"
ADD COLUMN "status" "SemesterStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "Semesters"
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE TABLE "SemesterTransition" (
    "id" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "sourceSemesterId" TEXT,
    "studentPlan" JSONB NOT NULL DEFAULT '[]',
    "staffPlan" JSONB NOT NULL DEFAULT '[]',
    "status" "SemesterTransitionStatus" NOT NULL DEFAULT 'DRAFT',
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SemesterTransition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SemesterRemunerationRate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "dailyRate" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SemesterRemunerationRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SemesterTransition_semesterId_key"
ON "SemesterTransition"("semesterId");

CREATE INDEX "SemesterTransition_sourceSemesterId_idx"
ON "SemesterTransition"("sourceSemesterId");

CREATE INDEX "SemesterTransition_updatedBy_idx"
ON "SemesterTransition"("updatedBy");

CREATE UNIQUE INDEX "SemesterRemunerationRate_userId_semesterId_key"
ON "SemesterRemunerationRate"("userId", "semesterId");

CREATE INDEX "SemesterRemunerationRate_semesterId_idx"
ON "SemesterRemunerationRate"("semesterId");

ALTER TABLE "SemesterTransition"
ADD CONSTRAINT "SemesterTransition_semesterId_fkey"
FOREIGN KEY ("semesterId") REFERENCES "Semesters"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SemesterTransition"
ADD CONSTRAINT "SemesterTransition_sourceSemesterId_fkey"
FOREIGN KEY ("sourceSemesterId") REFERENCES "Semesters"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SemesterTransition"
ADD CONSTRAINT "SemesterTransition_updatedBy_fkey"
FOREIGN KEY ("updatedBy") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SemesterRemunerationRate"
ADD CONSTRAINT "SemesterRemunerationRate_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SemesterRemunerationRate"
ADD CONSTRAINT "SemesterRemunerationRate_semesterId_fkey"
FOREIGN KEY ("semesterId") REFERENCES "Semesters"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

WITH scoped_payees AS (
    SELECT DISTINCT ura."userId", ura."semesterId"
    FROM "UserRoleAssignments" ura
    WHERE ura."semesterId" IS NOT NULL
      AND ura."subRole" IN ('EDUCATOR', 'CENTER_MANAGER')

    UNION

    SELECT DISTINCT ua."userId", ua."semesterId"
    FROM "UserAttendance" ua
    JOIN "UserRoleAssignments" ura ON ura."id" = ua."roleAssignmentId"
    WHERE ura."subRole" IN ('EDUCATOR', 'CENTER_MANAGER')
)
INSERT INTO "SemesterRemunerationRate" (
    "id",
    "userId",
    "semesterId",
    "dailyRate",
    "createdAt",
    "updatedAt"
)
SELECT
    'rate_' || md5(scoped_payees."userId" || ':' || scoped_payees."semesterId"),
    scoped_payees."userId",
    scoped_payees."semesterId",
    users."reimbursementAmount",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM scoped_payees
JOIN "User" users ON users."id" = scoped_payees."userId"
ON CONFLICT ("userId", "semesterId") DO NOTHING;

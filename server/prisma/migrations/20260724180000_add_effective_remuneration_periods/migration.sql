CREATE TABLE "SemesterRemunerationPeriod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "amountPerDay" DECIMAL(10,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SemesterRemunerationPeriod_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SemesterRemunerationPeriod_amount_nonnegative" CHECK ("amountPerDay" >= 0),
    CONSTRAINT "SemesterRemunerationPeriod_dates_ordered" CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom")
);

CREATE UNIQUE INDEX "SemesterRemunerationPeriod_userId_semesterId_effectiveFrom_key"
ON "SemesterRemunerationPeriod"("userId", "semesterId", "effectiveFrom");

CREATE INDEX "SemesterRemunerationPeriod_semesterId_effectiveFrom_idx"
ON "SemesterRemunerationPeriod"("semesterId", "effectiveFrom");

CREATE INDEX "SemesterRemunerationPeriod_userId_semesterId_effectiveFrom_effectiveTo_idx"
ON "SemesterRemunerationPeriod"("userId", "semesterId", "effectiveFrom", "effectiveTo");

ALTER TABLE "SemesterRemunerationPeriod"
ADD CONSTRAINT "SemesterRemunerationPeriod_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SemesterRemunerationPeriod"
ADD CONSTRAINT "SemesterRemunerationPeriod_semesterId_fkey"
FOREIGN KEY ("semesterId") REFERENCES "Semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SemesterRemunerationPeriod"
ADD CONSTRAINT "SemesterRemunerationPeriod_createdBy_fkey"
FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SemesterRemunerationPeriod"
ADD CONSTRAINT "SemesterRemunerationPeriod_updatedBy_fkey"
FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

WITH payable_assignments AS (
    SELECT DISTINCT ura."userId", ura."semesterId"
    FROM "UserRoleAssignments" ura
    WHERE ura."semesterId" IS NOT NULL
      AND ura."subRole" IN ('EDUCATOR', 'CENTER_MANAGER')
),
backfill AS (
    SELECT
        pa."userId",
        pa."semesterId",
        COALESCE(srr."dailyRate", u."reimbursementAmount") AS "amountPerDay",
        s."startDate"::date AS "effectiveFrom"
    FROM payable_assignments pa
    JOIN "Semesters" s ON s."id" = pa."semesterId"
    JOIN "User" u ON u."id" = pa."userId"
    LEFT JOIN "SemesterRemunerationRate" srr
      ON srr."userId" = pa."userId" AND srr."semesterId" = pa."semesterId"
)
INSERT INTO "SemesterRemunerationPeriod" (
    "id",
    "userId",
    "semesterId",
    "amountPerDay",
    "effectiveFrom",
    "updatedAt"
)
SELECT
    'rem_period_' || md5(backfill."userId" || ':' || backfill."semesterId"),
    backfill."userId",
    backfill."semesterId",
    backfill."amountPerDay",
    backfill."effectiveFrom",
    CURRENT_TIMESTAMP
FROM backfill
WHERE backfill."amountPerDay" IS NOT NULL
ON CONFLICT ("userId", "semesterId", "effectiveFrom") DO NOTHING;

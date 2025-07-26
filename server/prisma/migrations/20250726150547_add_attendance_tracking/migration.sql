-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'NOT_AVAILABLE', 'HOLIDAY');

-- CreateTable
CREATE TABLE "UserAttendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "roleAssignmentId" TEXT,
    "projectId" TEXT NOT NULL,
    "centerId" TEXT,
    "semesterId" TEXT,
    "notes" TEXT,
    "holidayReason" TEXT,
    "markedBy" TEXT,
    "markedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAttendance_userId_date_idx" ON "UserAttendance"("userId", "date");

-- CreateIndex
CREATE INDEX "UserAttendance_projectId_date_idx" ON "UserAttendance"("projectId", "date");

-- CreateIndex
CREATE INDEX "UserAttendance_centerId_date_idx" ON "UserAttendance"("centerId", "date");

-- CreateIndex
CREATE INDEX "UserAttendance_semesterId_date_idx" ON "UserAttendance"("semesterId", "date");

-- CreateIndex
CREATE INDEX "UserAttendance_roleAssignmentId_date_idx" ON "UserAttendance"("roleAssignmentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UserAttendance_userId_date_projectId_centerId_semesterId_key" ON "UserAttendance"("userId", "date", "projectId", "centerId", "semesterId");

-- AddForeignKey
ALTER TABLE "UserAttendance" ADD CONSTRAINT "UserAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAttendance" ADD CONSTRAINT "UserAttendance_roleAssignmentId_fkey" FOREIGN KEY ("roleAssignmentId") REFERENCES "UserRoleAssignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAttendance" ADD CONSTRAINT "UserAttendance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAttendance" ADD CONSTRAINT "UserAttendance_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAttendance" ADD CONSTRAINT "UserAttendance_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAttendance" ADD CONSTRAINT "UserAttendance_markedBy_fkey" FOREIGN KEY ("markedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

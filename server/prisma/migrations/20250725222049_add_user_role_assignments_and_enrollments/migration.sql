/*
  Warnings:

  - You are about to drop the column `level` on the `Students` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SubRole" AS ENUM ('TRAINING_DEVELOPMENT', 'RECRUITMENT', 'GROWTH_DEVELOPMENT', 'CURRICULUM_MENTOR', 'TECH', 'CENTER_MANAGER', 'EDUCATOR');

-- CreateEnum
CREATE TYPE "CommittedDays" AS ENUM ('SATURDAY', 'SUNDAY', 'BOTH');

-- AlterTable
ALTER TABLE "Students" DROP COLUMN "level";

-- CreateTable
CREATE TABLE "UserRoleAssignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subRole" "SubRole" NOT NULL,
    "projectId" TEXT,
    "centerId" TEXT,
    "semesterId" TEXT,
    "level" "Level",
    "committedDays" "CommittedDays",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRoleAssignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentEnrollments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promotedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentEnrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRoleAssignments_userId_isActive_idx" ON "UserRoleAssignments"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleAssignments_userId_subRole_projectId_centerId_semes_key" ON "UserRoleAssignments"("userId", "subRole", "projectId", "centerId", "semesterId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollments_studentId_semesterId_key" ON "StudentEnrollments"("studentId", "semesterId");

-- AddForeignKey
ALTER TABLE "UserRoleAssignments" ADD CONSTRAINT "UserRoleAssignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignments" ADD CONSTRAINT "UserRoleAssignments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignments" ADD CONSTRAINT "UserRoleAssignments_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignments" ADD CONSTRAINT "UserRoleAssignments_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semesters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollments" ADD CONSTRAINT "StudentEnrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollments" ADD CONSTRAINT "StudentEnrollments_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollments" ADD CONSTRAINT "StudentEnrollments_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollments" ADD CONSTRAINT "StudentEnrollments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

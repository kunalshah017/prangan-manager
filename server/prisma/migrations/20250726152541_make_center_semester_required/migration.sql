/*
  Warnings:

  - Made the column `roleAssignmentId` on table `UserAttendance` required. This step will fail if there are existing NULL values in that column.
  - Made the column `centerId` on table `UserAttendance` required. This step will fail if there are existing NULL values in that column.
  - Made the column `semesterId` on table `UserAttendance` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "UserAttendance" ALTER COLUMN "roleAssignmentId" SET NOT NULL,
ALTER COLUMN "centerId" SET NOT NULL,
ALTER COLUMN "semesterId" SET NOT NULL;

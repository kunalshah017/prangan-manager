/*
  Warnings:

  - You are about to drop the column `level` on the `Exam` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[projectId,centerId,semesterId,name]` on the table `Exam` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Exam_projectId_centerId_semesterId_level_idx";

-- DropIndex
DROP INDEX "Exam_projectId_centerId_semesterId_level_name_key";

-- AlterTable
ALTER TABLE "Exam" DROP COLUMN "level";

-- CreateIndex
CREATE INDEX "Exam_projectId_centerId_semesterId_idx" ON "Exam"("projectId", "centerId", "semesterId");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_projectId_centerId_semesterId_name_key" ON "Exam"("projectId", "centerId", "semesterId", "name");

/*
  Warnings:

  - A unique constraint covering the columns `[projectId,centerId,semesterId,level,name]` on the table `Exam` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `level` to the `Exam` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Exam_projectId_centerId_semesterId_idx";

-- DropIndex
DROP INDEX "Exam_projectId_centerId_semesterId_name_key";

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "level" "Level" NOT NULL;

-- CreateIndex
CREATE INDEX "Exam_projectId_centerId_semesterId_level_idx" ON "Exam"("projectId", "centerId", "semesterId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_projectId_centerId_semesterId_level_name_key" ON "Exam"("projectId", "centerId", "semesterId", "level", "name");

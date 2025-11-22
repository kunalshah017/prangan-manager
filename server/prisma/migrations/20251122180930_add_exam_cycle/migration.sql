/*
  Warnings:

  - Added the required column `cycle` to the `Exam` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExamCycle" AS ENUM ('SA_1', 'SA_2', 'SA_3');

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "cycle" "ExamCycle" NOT NULL;

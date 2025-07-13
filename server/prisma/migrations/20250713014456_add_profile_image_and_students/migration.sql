-- CreateEnum
CREATE TYPE "Level" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'PRIMARY_A', 'PRIMARY_B');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profileImageUrl" TEXT;

-- CreateTable
CREATE TABLE "Students" (
    "id" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "name" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "phoneNumber" TEXT,
    "whatsappNumber" TEXT,
    "alternateNumber" TEXT,
    "level" "Level" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Students_pkey" PRIMARY KEY ("id")
);

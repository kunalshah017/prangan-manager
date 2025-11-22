-- CreateEnum
CREATE TYPE "SyllabusTopicStatus" AS ENUM ('PENDING', 'ONGOING', 'COMPLETED');

-- CreateTable
CREATE TABLE "Syllabus" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Syllabus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusTopic" (
    "id" TEXT NOT NULL,
    "syllabusId" TEXT NOT NULL,
    "parentId" TEXT,
    "serialNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cycle" TEXT,
    "status" "SyllabusTopicStatus" NOT NULL DEFAULT 'PENDING',
    "orderIndex" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyllabusTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusProgressLog" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "previousStatus" "SyllabusTopicStatus" NOT NULL,
    "newStatus" "SyllabusTopicStatus" NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyllabusProgressLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Syllabus_projectId_centerId_semesterId_level_idx" ON "Syllabus"("projectId", "centerId", "semesterId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "Syllabus_projectId_centerId_semesterId_level_name_key" ON "Syllabus"("projectId", "centerId", "semesterId", "level", "name");

-- CreateIndex
CREATE INDEX "SyllabusTopic_syllabusId_parentId_idx" ON "SyllabusTopic"("syllabusId", "parentId");

-- CreateIndex
CREATE INDEX "SyllabusTopic_syllabusId_cycle_idx" ON "SyllabusTopic"("syllabusId", "cycle");

-- CreateIndex
CREATE INDEX "SyllabusTopic_syllabusId_orderIndex_idx" ON "SyllabusTopic"("syllabusId", "orderIndex");

-- CreateIndex
CREATE INDEX "SyllabusProgressLog_topicId_createdAt_idx" ON "SyllabusProgressLog"("topicId", "createdAt");

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusTopic" ADD CONSTRAINT "SyllabusTopic_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "Syllabus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusTopic" ADD CONSTRAINT "SyllabusTopic_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SyllabusTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusProgressLog" ADD CONSTRAINT "SyllabusProgressLog_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SyllabusTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusProgressLog" ADD CONSTRAINT "SyllabusProgressLog_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

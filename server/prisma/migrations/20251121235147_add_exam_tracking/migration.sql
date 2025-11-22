-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "examDate" DATE NOT NULL,
    "listeningMaxMarks" INTEGER NOT NULL,
    "speakingMaxMarks" INTEGER NOT NULL,
    "readingMaxMarks" INTEGER NOT NULL,
    "writingMaxMarks" INTEGER NOT NULL,
    "totalMaxMarks" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentExamScore" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "listeningScore" DECIMAL(5,2) NOT NULL,
    "speakingScore" DECIMAL(5,2) NOT NULL,
    "readingScore" DECIMAL(5,2) NOT NULL,
    "writingScore" DECIMAL(5,2) NOT NULL,
    "totalScore" DECIMAL(6,2) NOT NULL,
    "remarks" TEXT,
    "gradedBy" TEXT,
    "gradedAt" TIMESTAMP(3),
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentExamScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exam_projectId_centerId_semesterId_level_idx" ON "Exam"("projectId", "centerId", "semesterId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_projectId_centerId_semesterId_level_name_key" ON "Exam"("projectId", "centerId", "semesterId", "level", "name");

-- CreateIndex
CREATE INDEX "StudentExamScore_examId_idx" ON "StudentExamScore"("examId");

-- CreateIndex
CREATE INDEX "StudentExamScore_studentId_idx" ON "StudentExamScore"("studentId");

-- CreateIndex
CREATE INDEX "StudentExamScore_enrollmentId_idx" ON "StudentExamScore"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentExamScore_examId_studentId_key" ON "StudentExamScore"("examId", "studentId");

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamScore" ADD CONSTRAINT "StudentExamScore_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamScore" ADD CONSTRAINT "StudentExamScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamScore" ADD CONSTRAINT "StudentExamScore_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamScore" ADD CONSTRAINT "StudentExamScore_gradedBy_fkey" FOREIGN KEY ("gradedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

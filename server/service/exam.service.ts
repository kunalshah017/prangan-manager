import { prisma } from "../lib/prisma.js";
import { buildScoreComponents } from "../security/exam-score-input.js";
import {
  CreateExamRequest,
  UpdateExamRequest,
  GetExamsRequest,
  ExamResponse,
  CreateStudentScoreRequest,
  UpdateStudentScoreRequest,
  BulkCreateScoresRequest,
  GetStudentScoresRequest,
  StudentScoreResponse,
  ExamStatisticsRequest,
  ExamStatisticsResponse,
} from "../types/exam.types.js";
import { resolveSemesterLevelInput } from "./semester-level.service.js";

const verifyExamScope = async <
  T extends {
    semesterId: string;
    semesterLevelId: string;
  },
>(
  scope: T | null,
): Promise<(T & { semesterLevelId: string }) | null> => {
  if (!scope) return null;
  const semesterLevel = await resolveSemesterLevelInput(scope);
  return { ...scope, semesterLevelId: semesterLevel.id };
};

export const getExamScope = async (id: string) => {
  const scope = await prisma.exam.findUnique({
    where: { id },
    select: {
      projectId: true,
      centerId: true,
      semesterId: true,
      semesterLevelId: true,
    },
  });
  return verifyExamScope(scope);
};

export const getScoreScope = async (id: string) => {
  const score = await prisma.studentExamScore.findUnique({
    where: { id },
    select: {
      exam: {
        select: {
          projectId: true,
          centerId: true,
          semesterId: true,
          semesterLevelId: true,
        },
      },
    },
  });
  return verifyExamScope(score?.exam ?? null);
};

// ============================================
// EXAM CRUD OPERATIONS
// ============================================

/**
 * Create a new exam
 */
export const createExam = async (
  data: CreateExamRequest,
): Promise<ExamResponse> => {
  const {
    projectId,
    centerId,
    semesterId,
    semesterLevelId,
    cycle,
    name,
    description,
    examDate,
    listeningMaxMarks,
    speakingMaxMarks,
    readingMaxMarks,
    writingMaxMarks,
  } = data;
  const semesterLevel = await resolveSemesterLevelInput({
    semesterId,
    semesterLevelId,
  });

  // Calculate total max marks
  const totalMaxMarks =
    listeningMaxMarks + speakingMaxMarks + readingMaxMarks + writingMaxMarks;

  // Check if exam with the same cycle and name already exists for this context.
  const existing = await prisma.exam.findFirst({
    where: {
      projectId,
      centerId,
      semesterId,
      semesterLevelId: semesterLevel.id,
      cycle,
      name,
    },
  });

  if (existing) {
    throw new Error(`Exam with name "${name}" already exists for this context`);
  }

  const exam = await prisma.exam.create({
    data: {
      projectId,
      centerId,
      semesterId,
      semesterLevelId: semesterLevel.id,
      cycle,
      name,
      description,
      examDate: new Date(examDate),
      listeningMaxMarks,
      speakingMaxMarks,
      readingMaxMarks,
      writingMaxMarks,
      totalMaxMarks,
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
      center: {
        select: { id: true, name: true },
      },
      semester: {
        select: { id: true, name: true },
      },
      semesterLevel: { include: { academicLevel: true } },
      _count: {
        select: { studentScores: true },
      },
    },
  });

  return exam as ExamResponse;
};

/**
 * Get exam by ID
 */
export const getExamById = async (
  id: string,
  includeScores = false,
): Promise<ExamResponse | null> => {
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      project: {
        select: { id: true, name: true },
      },
      center: {
        select: { id: true, name: true },
      },
      semester: {
        select: { id: true, name: true },
      },
      semesterLevel: { include: { academicLevel: true } },
      _count: {
        select: { studentScores: true },
      },
      ...(includeScores && {
        studentScores: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                profileImageUrl: true,
              },
            },
            grader: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      }),
    },
  });

  return exam as ExamResponse | null;
};

/**
 * Get all exams with filtering
 */
export const getExams = async (
  filters: GetExamsRequest,
): Promise<ExamResponse[]> => {
  const {
    projectId,
    centerId,
    semesterId,
    semesterLevelId,
    cycle,
    isActive,
    startDate,
    endDate,
  } = filters;

  const exams = await prisma.exam.findMany({
    where: {
      ...(projectId && { projectId }),
      ...(centerId && { centerId }),
      ...(semesterId && { semesterId }),
      ...(semesterLevelId && { semesterLevelId }),
      ...(cycle && { cycle }),
      ...(isActive !== undefined && { isActive }),
      ...(startDate && {
        examDate: {
          gte: new Date(startDate),
        },
      }),
      ...(endDate && {
        examDate: {
          lte: new Date(endDate),
        },
      }),
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
      center: {
        select: { id: true, name: true },
      },
      semester: {
        select: { id: true, name: true },
      },
      semesterLevel: { include: { academicLevel: true } },
      _count: {
        select: { studentScores: true },
      },
    },
    orderBy: {
      examDate: "desc",
    },
  });

  return exams as ExamResponse[];
};

/**
 * Update an exam
 */
export const updateExam = async (
  id: string,
  data: UpdateExamRequest,
): Promise<ExamResponse> => {
  const updateData: any = { ...data };

  // Recalculate totalMaxMarks if any LSRW marks are updated
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam) {
    throw new Error("Exam not found");
  }

  if (data.semesterLevelId) {
    const semesterLevel = await resolveSemesterLevelInput({
      semesterId: exam.semesterId,
      semesterLevelId: data.semesterLevelId,
    });
    updateData.semesterLevelId = semesterLevel.id;
  }

  if (
    data.listeningMaxMarks !== undefined ||
    data.speakingMaxMarks !== undefined ||
    data.readingMaxMarks !== undefined ||
    data.writingMaxMarks !== undefined
  ) {
    updateData.totalMaxMarks =
      (data.listeningMaxMarks ?? exam.listeningMaxMarks) +
      (data.speakingMaxMarks ?? exam.speakingMaxMarks) +
      (data.readingMaxMarks ?? exam.readingMaxMarks) +
      (data.writingMaxMarks ?? exam.writingMaxMarks);
  }

  if (data.examDate) {
    updateData.examDate = new Date(data.examDate);
  }

  const updatedExam = await prisma.exam.update({
    where: { id },
    data: updateData,
    include: {
      project: {
        select: { id: true, name: true },
      },
      center: {
        select: { id: true, name: true },
      },
      semester: {
        select: { id: true, name: true },
      },
      semesterLevel: { include: { academicLevel: true } },
      _count: {
        select: { studentScores: true },
      },
    },
  });

  return updatedExam as ExamResponse;
};

/**
 * Soft delete an exam (set isActive to false)
 */
export const deleteExam = async (id: string): Promise<ExamResponse> => {
  const exam = await prisma.exam.update({
    where: { id },
    data: { isActive: false },
    include: {
      project: {
        select: { id: true, name: true },
      },
      center: {
        select: { id: true, name: true },
      },
      semester: {
        select: { id: true, name: true },
      },
      _count: {
        select: { studentScores: true },
      },
    },
  });

  return exam as ExamResponse;
};

/**
 * Hard delete an exam (permanent deletion)
 */
export const hardDeleteExam = async (id: string): Promise<void> => {
  await prisma.exam.delete({
    where: { id },
  });
};

// ============================================
// STUDENT SCORE OPERATIONS
// ============================================

/**
 * Create a student exam score
 */
export const createStudentScore = async (
  data: CreateStudentScoreRequest,
  gradedBy: string,
): Promise<StudentScoreResponse> => {
  const {
    examId,
    studentId,
    enrollmentId,
    listeningScore,
    speakingScore,
    readingScore,
    writingScore,
    remarks,
    isAbsent,
  } = data;

  // Validate exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) {
    throw new Error("Exam not found");
  }

  if (!exam.isActive) {
    throw new Error("Exam is not active");
  }

  const enrollment = await prisma.studentEnrollments.findFirst({
    where: {
      id: enrollmentId,
      studentId,
      isActive: true,
      projectId: exam.projectId,
      centerId: exam.centerId,
      semesterId: exam.semesterId,
      semesterLevelId: exam.semesterLevelId,
    },
    select: {
      id: true,
      studentId: true,
      isActive: true,
      projectId: true,
      centerId: true,
      semesterId: true,
      semesterLevelId: true,
    },
  });

  if (!enrollment) {
    throw new Error("Invalid enrollment for student");
  }

  const components = buildScoreComponents(
    { listeningScore, speakingScore, readingScore, writingScore },
    exam,
    isAbsent,
  );

  const score = await prisma.studentExamScore.create({
    data: {
      examId,
      studentId,
      enrollmentId,
      listeningScore: components.listeningScore,
      speakingScore: components.speakingScore,
      readingScore: components.readingScore,
      writingScore: components.writingScore,
      totalScore: components.totalScore,
      remarks,
      isAbsent: components.isAbsent,
      gradedBy,
      gradedAt: new Date(),
    },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          examDate: true,
          semesterLevelId: true,
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          profileImageUrl: true,
        },
      },
      grader: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    ...score,
    listeningScore: Number(score.listeningScore),
    speakingScore: Number(score.speakingScore),
    readingScore: Number(score.readingScore),
    writingScore: Number(score.writingScore),
    totalScore: Number(score.totalScore),
  } as StudentScoreResponse;
};

/**
 * Bulk create student scores
 */
export const bulkCreateScores = async (
  data: BulkCreateScoresRequest,
  gradedBy: string,
): Promise<StudentScoreResponse[]> => {
  const { examId, scores } = data;

  // Validate exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) {
    throw new Error("Exam not found");
  }

  if (!exam.isActive) {
    throw new Error("Exam is not active");
  }

  const enrollmentPairs = scores.map(({ enrollmentId, studentId }) => ({
    id: enrollmentId,
    studentId,
  }));
  const enrollments = await prisma.studentEnrollments.findMany({
    where: {
      OR: enrollmentPairs,
      isActive: true,
      projectId: exam.projectId,
      centerId: exam.centerId,
      semesterId: exam.semesterId,
      semesterLevelId: exam.semesterLevelId,
    },
    select: {
      id: true,
      studentId: true,
      isActive: true,
      projectId: true,
      centerId: true,
      semesterId: true,
      semesterLevelId: true,
    },
  });
  const validPairs = new Set(
    enrollments.map((enrollment) => `${enrollment.id}:${enrollment.studentId}`),
  );
  const invalidPairs = enrollmentPairs.filter(
    ({ id, studentId }) => !validPairs.has(`${id}:${studentId}`),
  );

  if (invalidPairs.length > 0) {
    throw new Error(
      `Invalid enrollment for student: ${invalidPairs
        .map(({ studentId }) => studentId)
        .join(", ")}`,
    );
  }

  const scoreData = scores.map((score) => {
    const components = buildScoreComponents(score, exam, score.isAbsent);

    return {
      examId,
      studentId: score.studentId,
      enrollmentId: score.enrollmentId,
      listeningScore: components.listeningScore,
      speakingScore: components.speakingScore,
      readingScore: components.readingScore,
      writingScore: components.writingScore,
      totalScore: components.totalScore,
      remarks: score.remarks,
      isAbsent: components.isAbsent,
      gradedBy,
      gradedAt: new Date(),
    };
  });

  // Use transaction to create all scores
  const createdScores = await prisma.$transaction(
    scoreData.map((score) =>
      prisma.studentExamScore.create({
        data: score,
        include: {
          exam: {
            select: {
              id: true,
              name: true,
              examDate: true,
              semesterLevelId: true,
            },
          },
          student: {
            select: {
              id: true,
              name: true,
              profileImageUrl: true,
            },
          },
          grader: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ),
  );

  return createdScores.map((score) => ({
    ...score,
    listeningScore: Number(score.listeningScore),
    speakingScore: Number(score.speakingScore),
    readingScore: Number(score.readingScore),
    writingScore: Number(score.writingScore),
    totalScore: Number(score.totalScore),
  })) as StudentScoreResponse[];
};

/**
 * Get student score by ID
 */
export const getStudentScoreById = async (
  id: string,
): Promise<StudentScoreResponse | null> => {
  const score = await prisma.studentExamScore.findUnique({
    where: { id },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          examDate: true,
          semesterLevelId: true,
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          profileImageUrl: true,
        },
      },
      grader: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!score) return null;

  return {
    ...score,
    listeningScore: Number(score.listeningScore),
    speakingScore: Number(score.speakingScore),
    readingScore: Number(score.readingScore),
    writingScore: Number(score.writingScore),
    totalScore: Number(score.totalScore),
  } as StudentScoreResponse;
};

/**
 * Get student scores with filtering
 */
export const getStudentScores = async (
  filters: GetStudentScoresRequest,
): Promise<StudentScoreResponse[]> => {
  const { examId, studentId, enrollmentId } = filters;

  const scores = await prisma.studentExamScore.findMany({
    where: {
      ...(examId && { examId }),
      ...(studentId && { studentId }),
      ...(enrollmentId && { enrollmentId }),
    },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          examDate: true,
          semesterLevelId: true,
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          profileImageUrl: true,
        },
      },
      grader: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return scores.map((score) => ({
    ...score,
    listeningScore: Number(score.listeningScore),
    speakingScore: Number(score.speakingScore),
    readingScore: Number(score.readingScore),
    writingScore: Number(score.writingScore),
    totalScore: Number(score.totalScore),
  })) as StudentScoreResponse[];
};

/**
 * Update a student exam score
 */
export const updateStudentScore = async (
  id: string,
  data: UpdateStudentScoreRequest,
  gradedBy: string,
): Promise<StudentScoreResponse> => {
  const score = await prisma.studentExamScore.findUnique({
    where: { id },
    include: { exam: true },
  });

  if (!score) {
    throw new Error("Student score not found");
  }

  if (!score.exam.isActive) {
    throw new Error("Exam is not active");
  }

  const components = buildScoreComponents(
    {
      listeningScore: data.listeningScore ?? Number(score.listeningScore),
      speakingScore: data.speakingScore ?? Number(score.speakingScore),
      readingScore: data.readingScore ?? Number(score.readingScore),
      writingScore: data.writingScore ?? Number(score.writingScore),
    },
    score.exam,
    data.isAbsent ?? score.isAbsent,
  );

  const updatedScore = await prisma.studentExamScore.update({
    where: { id },
    data: {
      ...(data.remarks !== undefined && { remarks: data.remarks }),
      listeningScore: components.listeningScore,
      speakingScore: components.speakingScore,
      readingScore: components.readingScore,
      writingScore: components.writingScore,
      totalScore: components.totalScore,
      isAbsent: components.isAbsent,
      gradedBy,
      gradedAt: new Date(),
    },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          examDate: true,
          semesterLevelId: true,
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          profileImageUrl: true,
        },
      },
      grader: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    ...updatedScore,
    listeningScore: Number(updatedScore.listeningScore),
    speakingScore: Number(updatedScore.speakingScore),
    readingScore: Number(updatedScore.readingScore),
    writingScore: Number(updatedScore.writingScore),
    totalScore: Number(updatedScore.totalScore),
  } as StudentScoreResponse;
};

/**
 * Delete a student score
 */
export const deleteStudentScore = async (id: string): Promise<void> => {
  await prisma.studentExamScore.delete({
    where: { id },
  });
};

// ============================================
// EXAM STATISTICS
// ============================================

/**
 * Get exam statistics
 */
export const getExamStatistics = async (
  examId: string,
): Promise<ExamStatisticsResponse> => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      studentScores: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!exam) {
    throw new Error("Exam not found");
  }

  // Get total enrolled students for this exam's context
  const totalStudents = await prisma.studentEnrollments.count({
    where: {
      projectId: exam.projectId,
      centerId: exam.centerId,
      semesterId: exam.semesterId,
      semesterLevelId: exam.semesterLevelId,
      isActive: true,
    },
  });

  const scores = exam.studentScores;
  const scoresEntered = scores.length;
  const absentStudents = scores.filter((s) => s.isAbsent).length;
  const pendingScores = Math.max(0, totalStudents - scoresEntered);

  // Calculate average scores (excluding absent students)
  const presentScores = scores.filter((s) => !s.isAbsent);
  const averageScores = {
    listening:
      presentScores.length > 0
        ? presentScores.reduce((sum, s) => sum + Number(s.listeningScore), 0) /
          presentScores.length
        : 0,
    speaking:
      presentScores.length > 0
        ? presentScores.reduce((sum, s) => sum + Number(s.speakingScore), 0) /
          presentScores.length
        : 0,
    reading:
      presentScores.length > 0
        ? presentScores.reduce((sum, s) => sum + Number(s.readingScore), 0) /
          presentScores.length
        : 0,
    writing:
      presentScores.length > 0
        ? presentScores.reduce((sum, s) => sum + Number(s.writingScore), 0) /
          presentScores.length
        : 0,
    total:
      presentScores.length > 0
        ? presentScores.reduce((sum, s) => sum + Number(s.totalScore), 0) /
          presentScores.length
        : 0,
  };

  // Get top 5 scorers
  const topScorers = presentScores
    .sort((a, b) => Number(b.totalScore) - Number(a.totalScore))
    .slice(0, 5)
    .map((s) => ({
      studentId: s.studentId,
      studentName: s.student.name,
      totalScore: Number(s.totalScore),
    }));

  return {
    examId,
    totalStudents,
    scoresEntered,
    absentStudents,
    pendingScores,
    averageScores,
    topScorers,
  };
};

import { PrismaClient, Level } from "../generated/prisma/index.js";
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

const prisma = new PrismaClient();

// ============================================
// EXAM CRUD OPERATIONS
// ============================================

/**
 * Create a new exam
 */
export const createExam = async (
  data: CreateExamRequest
): Promise<ExamResponse> => {
  const {
    projectId,
    centerId,
    semesterId,
    level,
    cycle,
    name,
    description,
    examDate,
    listeningMaxMarks,
    speakingMaxMarks,
    readingMaxMarks,
    writingMaxMarks,
  } = data;

  // Calculate total max marks
  const totalMaxMarks =
    listeningMaxMarks + speakingMaxMarks + readingMaxMarks + writingMaxMarks;

  // Check if exam with same name already exists for this context
  const existing = await prisma.exam.findFirst({
    where: {
      projectId,
      centerId,
      semesterId,
      level,
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
      level,
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
  includeScores = false
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
  filters: GetExamsRequest
): Promise<ExamResponse[]> => {
  const {
    projectId,
    centerId,
    semesterId,
    level,
    isActive,
    startDate,
    endDate,
  } = filters;

  const exams = await prisma.exam.findMany({
    where: {
      ...(projectId && { projectId }),
      ...(centerId && { centerId }),
      ...(semesterId && { semesterId }),
      ...(level && { level }),
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
  data: UpdateExamRequest
): Promise<ExamResponse> => {
  const updateData: any = { ...data };

  // Recalculate totalMaxMarks if any LSRW marks are updated
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam) {
    throw new Error("Exam not found");
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
  gradedBy: string
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

  // Validate enrollment
  const enrollment = await prisma.studentEnrollments.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment || enrollment.studentId !== studentId) {
    throw new Error("Invalid enrollment for student");
  }

  // Validate exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) {
    throw new Error("Exam not found");
  }

  // Validate scores don't exceed max marks
  if (!isAbsent) {
    if (listeningScore > exam.listeningMaxMarks) {
      throw new Error(
        `Listening score (${listeningScore}) exceeds maximum marks (${exam.listeningMaxMarks})`
      );
    }
    if (speakingScore > exam.speakingMaxMarks) {
      throw new Error(
        `Speaking score (${speakingScore}) exceeds maximum marks (${exam.speakingMaxMarks})`
      );
    }
    if (readingScore > exam.readingMaxMarks) {
      throw new Error(
        `Reading score (${readingScore}) exceeds maximum marks (${exam.readingMaxMarks})`
      );
    }
    if (writingScore > exam.writingMaxMarks) {
      throw new Error(
        `Writing score (${writingScore}) exceeds maximum marks (${exam.writingMaxMarks})`
      );
    }
  }

  // Calculate total score
  const totalScore = isAbsent
    ? 0
    : listeningScore + speakingScore + readingScore + writingScore;

  const score = await prisma.studentExamScore.create({
    data: {
      examId,
      studentId,
      enrollmentId,
      listeningScore: isAbsent ? 0 : listeningScore,
      speakingScore: isAbsent ? 0 : speakingScore,
      readingScore: isAbsent ? 0 : readingScore,
      writingScore: isAbsent ? 0 : writingScore,
      totalScore,
      remarks,
      isAbsent: isAbsent || false,
      gradedBy,
      gradedAt: new Date(),
    },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          examDate: true,
          level: true,
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
  gradedBy: string
): Promise<StudentScoreResponse[]> => {
  const { examId, scores } = data;

  // Validate exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) {
    throw new Error("Exam not found");
  }

  // Prepare score data with validation
  const scoreData = scores.map((score) => {
    // Validate scores don't exceed max marks
    if (!score.isAbsent) {
      if (score.listeningScore > exam.listeningMaxMarks) {
        throw new Error(
          `Listening score for student ${score.studentId} exceeds maximum marks`
        );
      }
      if (score.speakingScore > exam.speakingMaxMarks) {
        throw new Error(
          `Speaking score for student ${score.studentId} exceeds maximum marks`
        );
      }
      if (score.readingScore > exam.readingMaxMarks) {
        throw new Error(
          `Reading score for student ${score.studentId} exceeds maximum marks`
        );
      }
      if (score.writingScore > exam.writingMaxMarks) {
        throw new Error(
          `Writing score for student ${score.studentId} exceeds maximum marks`
        );
      }
    }

    const totalScore = score.isAbsent
      ? 0
      : score.listeningScore +
        score.speakingScore +
        score.readingScore +
        score.writingScore;

    return {
      examId,
      studentId: score.studentId,
      enrollmentId: score.enrollmentId,
      listeningScore: score.isAbsent ? 0 : score.listeningScore,
      speakingScore: score.isAbsent ? 0 : score.speakingScore,
      readingScore: score.isAbsent ? 0 : score.readingScore,
      writingScore: score.isAbsent ? 0 : score.writingScore,
      totalScore,
      remarks: score.remarks,
      isAbsent: score.isAbsent || false,
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
              level: true,
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
      })
    )
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
  id: string
): Promise<StudentScoreResponse | null> => {
  const score = await prisma.studentExamScore.findUnique({
    where: { id },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          examDate: true,
          level: true,
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
  filters: GetStudentScoresRequest
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
          level: true,
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
  gradedBy: string
): Promise<StudentScoreResponse> => {
  const score = await prisma.studentExamScore.findUnique({
    where: { id },
    include: { exam: true },
  });

  if (!score) {
    throw new Error("Student score not found");
  }

  // Validate scores don't exceed max marks
  if (!data.isAbsent) {
    if (
      data.listeningScore !== undefined &&
      data.listeningScore > score.exam.listeningMaxMarks
    ) {
      throw new Error(
        `Listening score exceeds maximum marks (${score.exam.listeningMaxMarks})`
      );
    }
    if (
      data.speakingScore !== undefined &&
      data.speakingScore > score.exam.speakingMaxMarks
    ) {
      throw new Error(
        `Speaking score exceeds maximum marks (${score.exam.speakingMaxMarks})`
      );
    }
    if (
      data.readingScore !== undefined &&
      data.readingScore > score.exam.readingMaxMarks
    ) {
      throw new Error(
        `Reading score exceeds maximum marks (${score.exam.readingMaxMarks})`
      );
    }
    if (
      data.writingScore !== undefined &&
      data.writingScore > score.exam.writingMaxMarks
    ) {
      throw new Error(
        `Writing score exceeds maximum marks (${score.exam.writingMaxMarks})`
      );
    }
  }

  // Calculate new total score
  const listeningScore = data.listeningScore ?? Number(score.listeningScore);
  const speakingScore = data.speakingScore ?? Number(score.speakingScore);
  const readingScore = data.readingScore ?? Number(score.readingScore);
  const writingScore = data.writingScore ?? Number(score.writingScore);
  const isAbsent = data.isAbsent ?? score.isAbsent;

  const totalScore = isAbsent
    ? 0
    : listeningScore + speakingScore + readingScore + writingScore;

  const updatedScore = await prisma.studentExamScore.update({
    where: { id },
    data: {
      ...data,
      ...(isAbsent && {
        listeningScore: 0,
        speakingScore: 0,
        readingScore: 0,
        writingScore: 0,
      }),
      totalScore,
      gradedBy,
      gradedAt: new Date(),
    },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          examDate: true,
          level: true,
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
  examId: string
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
      level: exam.level,
      isActive: true,
    },
  });

  const scores = exam.studentScores;
  const scoresEntered = scores.length;
  const absentStudents = scores.filter((s) => s.isAbsent).length;
  const pendingScores = totalStudents - scoresEntered;

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

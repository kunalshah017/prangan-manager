import { FastifyRequest, FastifyReply } from "fastify";
import {
  createExam,
  getExamById,
  getExams,
  updateExam,
  deleteExam,
  hardDeleteExam,
  createStudentScore,
  bulkCreateScores,
  getStudentScoreById,
  getStudentScores,
  updateStudentScore,
  deleteStudentScore,
  getExamStatistics,
} from "../service/exam.service.js";
import {
  CreateExamRequest,
  UpdateExamRequest,
  GetExamsRequest,
  CreateStudentScoreRequest,
  UpdateStudentScoreRequest,
  BulkCreateScoresRequest,
  GetStudentScoresRequest,
  ExamStatisticsRequest,
} from "../types/exam.types.js";
import { Role } from "../generated/prisma/index.js";

// Define AuthenticatedRequest type
interface AuthenticatedRequest<
  T extends { Body?: any; Querystring?: any; Params?: any } = {}
> extends FastifyRequest<T> {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

// ============================================
// EXAM CONTROLLERS
// ============================================

/**
 * Create a new exam
 * POST /api/v1/exams
 */
export const createExamController = async (
  request: AuthenticatedRequest<{ Body: CreateExamRequest }>,
  reply: FastifyReply
) => {
  try {
    const data = request.body;

    // Validate required fields
    if (
      !data.projectId ||
      !data.centerId ||
      !data.semesterId ||
      !data.level ||
      !data.name ||
      !data.examDate ||
      data.listeningMaxMarks === undefined ||
      data.speakingMaxMarks === undefined ||
      data.readingMaxMarks === undefined ||
      data.writingMaxMarks === undefined
    ) {
      return reply.status(400).send({
        error:
          "Missing required fields: projectId, centerId, semesterId, level, name, examDate, LSRW max marks",
      });
    }

    const exam = await createExam(data);

    return reply.status(201).send({
      message: "Exam created successfully",
      data: exam,
    });
  } catch (error: any) {
    if (error.message.includes("already exists")) {
      return reply.status(409).send({
        error: error.message,
      });
    }
    return reply.status(500).send({
      error: "Failed to create exam",
      details: error.message,
    });
  }
};

/**
 * Get exam by ID
 * GET /api/v1/exams/:id
 */
export const getExamByIdController = async (
  request: AuthenticatedRequest<{
    Params: { id: string };
    Querystring: { includeScores?: string };
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const includeScores = request.query.includeScores === "true";

    const exam = await getExamById(id, includeScores);

    if (!exam) {
      return reply.status(404).send({
        error: "Exam not found",
      });
    }

    return reply.status(200).send({
      data: exam,
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to fetch exam",
      details: error.message,
    });
  }
};

/**
 * Get all exams with filtering
 * GET /api/v1/exams
 */
export const getExamsController = async (
  request: AuthenticatedRequest<{ Querystring: GetExamsRequest }>,
  reply: FastifyReply
) => {
  try {
    const filters = request.query;

    // Parse isActive from string to boolean if it exists
    // Query params come as strings, so we need to convert
    const parsedFilters: GetExamsRequest = {
      ...filters,
      ...(filters.isActive !== undefined && {
        isActive: String(filters.isActive) === "true",
      }),
    };

    const exams = await getExams(parsedFilters);

    return reply.status(200).send({
      data: exams,
      count: exams.length,
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to fetch exams",
      details: error.message,
    });
  }
};

/**
 * Update an exam
 * PUT /api/v1/exams/:id
 */
export const updateExamController = async (
  request: AuthenticatedRequest<{
    Params: { id: string };
    Body: UpdateExamRequest;
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const data = request.body;

    const exam = await updateExam(id, data);

    return reply.status(200).send({
      message: "Exam updated successfully",
      data: exam,
    });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return reply.status(404).send({
        error: error.message,
      });
    }
    return reply.status(500).send({
      error: "Failed to update exam",
      details: error.message,
    });
  }
};

/**
 * Delete an exam
 * DELETE /api/v1/exams/:id
 */
export const deleteExamController = async (
  request: AuthenticatedRequest<{
    Params: { id: string };
    Querystring: { hard?: string };
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const hardDelete = request.query.hard === "true";

    if (hardDelete) {
      // Only ADMIN can hard delete
      if (request.user.role !== Role.ADMIN) {
        return reply.status(403).send({
          error: "Only admins can permanently delete exams",
        });
      }
      await hardDeleteExam(id);
      return reply.status(200).send({
        message: "Exam permanently deleted",
      });
    } else {
      const exam = await deleteExam(id);
      return reply.status(200).send({
        message: "Exam deleted successfully",
        data: exam,
      });
    }
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to delete exam",
      details: error.message,
    });
  }
};

// ============================================
// STUDENT SCORE CONTROLLERS
// ============================================

/**
 * Create a student exam score
 * POST /api/v1/exams/scores
 */
export const createStudentScoreController = async (
  request: AuthenticatedRequest<{ Body: CreateStudentScoreRequest }>,
  reply: FastifyReply
) => {
  try {
    const data = request.body;
    const gradedBy = request.user.id;

    // Validate required fields
    if (
      !data.examId ||
      !data.studentId ||
      !data.enrollmentId ||
      (data.listeningScore === undefined && !data.isAbsent) ||
      (data.speakingScore === undefined && !data.isAbsent) ||
      (data.readingScore === undefined && !data.isAbsent) ||
      (data.writingScore === undefined && !data.isAbsent)
    ) {
      return reply.status(400).send({
        error:
          "Missing required fields: examId, studentId, enrollmentId, LSRW scores (unless marked absent)",
      });
    }

    const score = await createStudentScore(data, gradedBy);

    return reply.status(201).send({
      message: "Student score created successfully",
      data: score,
    });
  } catch (error: any) {
    if (
      error.message.includes("Invalid enrollment") ||
      error.message.includes("not found") ||
      error.message.includes("exceeds maximum")
    ) {
      return reply.status(400).send({
        error: error.message,
      });
    }
    if (error.message.includes("Unique constraint")) {
      return reply.status(409).send({
        error: "Score already exists for this student and exam",
      });
    }
    return reply.status(500).send({
      error: "Failed to create student score",
      details: error.message,
    });
  }
};

/**
 * Bulk create student scores
 * POST /api/v1/exams/scores/bulk
 */
export const bulkCreateScoresController = async (
  request: AuthenticatedRequest<{ Body: BulkCreateScoresRequest }>,
  reply: FastifyReply
) => {
  try {
    const data = request.body;
    const gradedBy = request.user.id;

    if (!data.examId || !data.scores || data.scores.length === 0) {
      return reply.status(400).send({
        error: "Missing required fields: examId and scores array",
      });
    }

    const scores = await bulkCreateScores(data, gradedBy);

    return reply.status(201).send({
      message: `${scores.length} student scores created successfully`,
      data: scores,
    });
  } catch (error: any) {
    if (
      error.message.includes("not found") ||
      error.message.includes("exceeds maximum")
    ) {
      return reply.status(400).send({
        error: error.message,
      });
    }
    return reply.status(500).send({
      error: "Failed to create student scores",
      details: error.message,
    });
  }
};

/**
 * Get student score by ID
 * GET /api/v1/exams/scores/:id
 */
export const getStudentScoreByIdController = async (
  request: AuthenticatedRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const score = await getStudentScoreById(id);

    if (!score) {
      return reply.status(404).send({
        error: "Student score not found",
      });
    }

    return reply.status(200).send({
      data: score,
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to fetch student score",
      details: error.message,
    });
  }
};

/**
 * Get student scores with filtering
 * GET /api/v1/exams/scores
 */
export const getStudentScoresController = async (
  request: AuthenticatedRequest<{ Querystring: GetStudentScoresRequest }>,
  reply: FastifyReply
) => {
  try {
    const filters = request.query;
    const scores = await getStudentScores(filters);

    return reply.status(200).send({
      data: scores,
      count: scores.length,
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to fetch student scores",
      details: error.message,
    });
  }
};

/**
 * Update a student exam score
 * PUT /api/v1/exams/scores/:id
 */
export const updateStudentScoreController = async (
  request: AuthenticatedRequest<{
    Params: { id: string };
    Body: UpdateStudentScoreRequest;
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const data = request.body;
    const gradedBy = request.user.id;

    const score = await updateStudentScore(id, data, gradedBy);

    return reply.status(200).send({
      message: "Student score updated successfully",
      data: score,
    });
  } catch (error: any) {
    if (
      error.message.includes("not found") ||
      error.message.includes("exceeds maximum")
    ) {
      return reply.status(400).send({
        error: error.message,
      });
    }
    return reply.status(500).send({
      error: "Failed to update student score",
      details: error.message,
    });
  }
};

/**
 * Delete a student score
 * DELETE /api/v1/exams/scores/:id
 */
export const deleteStudentScoreController = async (
  request: AuthenticatedRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;

    // Only ADMIN can delete scores
    if (request.user.role !== Role.ADMIN) {
      return reply.status(403).send({
        error: "Only admins can delete student scores",
      });
    }

    await deleteStudentScore(id);

    return reply.status(200).send({
      message: "Student score deleted successfully",
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to delete student score",
      details: error.message,
    });
  }
};

// ============================================
// STATISTICS CONTROLLERS
// ============================================

/**
 * Get exam statistics
 * GET /api/v1/exams/:id/statistics
 */
export const getExamStatisticsController = async (
  request: AuthenticatedRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const statistics = await getExamStatistics(id);

    return reply.status(200).send({
      data: statistics,
    });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return reply.status(404).send({
        error: error.message,
      });
    }
    return reply.status(500).send({
      error: "Failed to fetch exam statistics",
      details: error.message,
    });
  }
};

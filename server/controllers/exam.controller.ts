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
  getExamScope,
  getScoreScope,
} from "../service/exam.service.js";
import {
  GetExamsRequest,
  CreateStudentScoreRequest,
  UpdateStudentScoreRequest,
  BulkCreateScoresRequest,
  GetStudentScoresRequest,
  ExamStatisticsRequest,
} from "../types/exam.types.js";
import { Role } from "../generated/prisma/index.js";
import {
  canManageExam,
  canReadExam,
  canWriteScore,
  hasCompleteExamScope,
  type ExamScope,
} from "../security/exam-authorization.js";
import { getActiveUserScopeAssignments } from "../service/user.service.js";
import {
  parseBulkCreateScores,
  parseCreateStudentScore,
  parseUpdateStudentScore,
} from "../security/exam-score-input.js";
import {
  parseCreateExamRequest,
  parseOptionalAssessmentCycle,
  parseUpdateExamRequest,
} from "../security/exam-input.js";
import { resolveSemesterLevelInput } from "../service/semester-level.service.js";

// Define AuthenticatedRequest type
interface AuthenticatedRequest<
  T extends { Body?: any; Querystring?: any; Params?: any } = {},
> extends FastifyRequest<T> {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

const forbidden = (reply: FastifyReply) =>
  reply.status(403).send({ error: "Forbidden" });

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2002";

const sendScoreError = (
  reply: FastifyReply,
  error: unknown,
  fallback: string,
) => {
  console.error(error);
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Invalid enrollment")) {
    return reply.status(400).send({ error: "Invalid score enrollment" });
  }
  if (message.includes("Exam is not active")) {
    return reply.status(400).send({ error: "Exam is not active" });
  }
  if (
    /^(Listening|Speaking|Reading|Writing) score (must|exceeds)|^Total score exceeds|^isAbsent must/.test(
      message,
    )
  ) {
    return reply.status(400).send({ error: "Invalid score values" });
  }
  if (message.includes("Unique constraint")) {
    return reply
      .status(409)
      .send({ error: "Score already exists for this student and exam" });
  }
  return reply.status(500).send({ error: fallback });
};

const sendExamError = (
  reply: FastifyReply,
  error: unknown,
  fallback: string,
) => {
  console.error(error);
  return reply.status(500).send({ error: fallback });
};

const authorizeExamScope = async (
  user: AuthenticatedRequest["user"],
  scope: ExamScope | null | undefined,
  policy: "read" | "manage" | "write-score",
): Promise<boolean> => {
  if (user.role !== Role.ADMIN && !hasCompleteExamScope(scope)) return false;

  const assignments =
    user.role === Role.ADMIN
      ? []
      : await getActiveUserScopeAssignments(user.id);
  if (typeof assignments === "string") throw new Error(assignments);

  const input = { identity: user, assignments, scope };
  if (policy === "read") return canReadExam(input);
  if (policy === "manage") return canManageExam(input);
  return canWriteScore(input);
};

// ============================================
// EXAM CONTROLLERS
// ============================================

/**
 * Create a new exam
 * POST /api/v1/exams
 */
export const createExamController = async (
  request: AuthenticatedRequest<{ Body: unknown }>,
  reply: FastifyReply,
) => {
  try {
    const parsedRequest = parseCreateExamRequest(request.body);
    if ("error" in parsedRequest)
      return reply.status(400).send({ error: parsedRequest.error });
    const data = parsedRequest.data;

    const semesterLevel = await resolveSemesterLevelInput(data);
    const scope = {
      projectId: data.projectId,
      centerId: data.centerId,
      semesterId: data.semesterId,
      semesterLevelId: semesterLevel.id,
    };
    if (!hasCompleteExamScope(scope)) {
      return reply.status(400).send({
        error: "projectId, centerId, and semesterId must be canonical IDs",
      });
    }
    if (!(await authorizeExamScope(request.user, scope, "manage"))) {
      return forbidden(reply);
    }

    const exam = await createExam(data);

    return reply.status(201).send({
      message: "Exam created successfully",
      data: exam,
    });
  } catch (error: unknown) {
    console.error(error);
    if (
      isUniqueConstraintError(error) ||
      (error instanceof Error && error.message.includes("already exists"))
    ) {
      return reply.status(409).send({
        error: "Exam already exists for this context",
      });
    }
    return reply.status(500).send({ error: "Failed to create exam" });
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
  reply: FastifyReply,
) => {
  try {
    const { id } = request.params;
    const includeScores = request.query.includeScores === "true";

    const scope = await getExamScope(id);
    if (!scope) return reply.status(404).send({ error: "Exam not found" });
    if (!(await authorizeExamScope(request.user, scope, "read"))) {
      return forbidden(reply);
    }

    const exam = await getExamById(id, includeScores);

    if (!exam) {
      return reply.status(404).send({
        error: "Exam not found",
      });
    }

    return reply.status(200).send({
      data: exam,
    });
  } catch (error) {
    return sendExamError(reply, error, "Failed to fetch exam");
  }
};

/**
 * Get all exams with filtering
 * GET /api/v1/exams
 */
export const getExamsController = async (
  request: AuthenticatedRequest<{ Querystring: GetExamsRequest }>,
  reply: FastifyReply,
) => {
  try {
    const filters = request.query;
    const parsedCycle = parseOptionalAssessmentCycle(filters.cycle);
    if ("error" in parsedCycle)
      return reply.status(400).send({ error: parsedCycle.error });

    // Parse isActive from string to boolean if it exists
    // Query params come as strings, so we need to convert
    let parsedFilters: GetExamsRequest = {
      ...filters,
      ...(parsedCycle.data !== undefined && { cycle: parsedCycle.data }),
      ...(filters.isActive !== undefined && {
        isActive: String(filters.isActive) === "true",
      }),
    };

    let scope: ExamScope = {
      projectId: parsedFilters.projectId,
      centerId: parsedFilters.centerId,
      semesterId: parsedFilters.semesterId,
    };
    if (
      parsedFilters.semesterId &&
      (parsedFilters.semesterLevelId || parsedFilters.level)
    ) {
      const semesterLevel = await resolveSemesterLevelInput({
        semesterId: parsedFilters.semesterId,
        semesterLevelId: parsedFilters.semesterLevelId,
        level: parsedFilters.level,
      });
      scope = { ...scope, semesterLevelId: semesterLevel.id };
      parsedFilters = {
        ...parsedFilters,
        semesterLevelId: semesterLevel.id,
      };
    }
    if (request.user.role !== Role.ADMIN && !hasCompleteExamScope(scope)) {
      return forbidden(reply);
    }
    if (!(await authorizeExamScope(request.user, scope, "read"))) {
      return forbidden(reply);
    }

    const exams = await getExams(parsedFilters);

    return reply.status(200).send({
      data: exams,
      count: exams.length,
    });
  } catch (error) {
    return sendExamError(reply, error, "Failed to fetch exams");
  }
};

/**
 * Update an exam
 * PUT /api/v1/exams/:id
 */
export const updateExamController = async (
  request: AuthenticatedRequest<{
    Params: { id: string };
    Body: unknown;
  }>,
  reply: FastifyReply,
) => {
  try {
    const { id } = request.params;
    const parsedRequest = parseUpdateExamRequest(request.body);
    if ("error" in parsedRequest)
      return reply.status(400).send({ error: parsedRequest.error });
    const data = parsedRequest.data;

    const scope = await getExamScope(id);
    if (!scope) return reply.status(404).send({ error: "Exam not found" });
    if (!(await authorizeExamScope(request.user, scope, "manage"))) {
      return forbidden(reply);
    }

    const exam = await updateExam(id, data);

    return reply.status(200).send({
      message: "Exam updated successfully",
      data: exam,
    });
  } catch (error: unknown) {
    console.error(error);
    if (isUniqueConstraintError(error)) {
      return reply.status(409).send({
        error: "Exam already exists for this context",
      });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return reply.status(404).send({
        error: "Exam not found",
      });
    }
    return reply.status(500).send({ error: "Failed to update exam" });
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
  reply: FastifyReply,
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
      const scope = await getExamScope(id);
      if (!scope) return reply.status(404).send({ error: "Exam not found" });
      await hardDeleteExam(id);
      return reply.status(200).send({
        message: "Exam permanently deleted",
      });
    } else {
      const scope = await getExamScope(id);
      if (!scope) return reply.status(404).send({ error: "Exam not found" });
      if (!(await authorizeExamScope(request.user, scope, "manage"))) {
        return forbidden(reply);
      }
      const exam = await deleteExam(id);
      return reply.status(200).send({
        message: "Exam deleted successfully",
        data: exam,
      });
    }
  } catch (error) {
    return sendExamError(reply, error, "Failed to delete exam");
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
  reply: FastifyReply,
) => {
  try {
    const parsed = parseCreateStudentScore(request.body);
    if ("error" in parsed)
      return reply.status(400).send({ error: parsed.error });
    const data = parsed.data;
    const gradedBy = request.user.id;

    const scope = await getExamScope(data.examId);
    if (!scope) return reply.status(400).send({ error: "Exam not found" });
    if (!(await authorizeExamScope(request.user, scope, "write-score"))) {
      return forbidden(reply);
    }

    const score = await createStudentScore(data, gradedBy);

    return reply.status(201).send({
      message: "Student score created successfully",
      data: score,
    });
  } catch (error) {
    return sendScoreError(reply, error, "Failed to create student score");
  }
};

/**
 * Bulk create student scores
 * POST /api/v1/exams/scores/bulk
 */
export const bulkCreateScoresController = async (
  request: AuthenticatedRequest<{ Body: BulkCreateScoresRequest }>,
  reply: FastifyReply,
) => {
  try {
    const parsed = parseBulkCreateScores(request.body);
    if ("error" in parsed)
      return reply.status(400).send({ error: parsed.error });
    const data = parsed.data;
    const gradedBy = request.user.id;

    const scope = await getExamScope(data.examId);
    if (!scope) return reply.status(400).send({ error: "Exam not found" });
    if (!(await authorizeExamScope(request.user, scope, "write-score"))) {
      return forbidden(reply);
    }

    const scores = await bulkCreateScores(data, gradedBy);

    return reply.status(201).send({
      message: `${scores.length} student scores created successfully`,
      data: scores,
    });
  } catch (error) {
    return sendScoreError(reply, error, "Failed to create student scores");
  }
};

/**
 * Get student score by ID
 * GET /api/v1/exams/scores/:id
 */
export const getStudentScoreByIdController = async (
  request: AuthenticatedRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) => {
  try {
    const { id } = request.params;
    const scope = await getScoreScope(id);
    if (!scope)
      return reply.status(404).send({ error: "Student score not found" });
    if (!(await authorizeExamScope(request.user, scope, "read"))) {
      return forbidden(reply);
    }
    const score = await getStudentScoreById(id);

    if (!score) {
      return reply.status(404).send({
        error: "Student score not found",
      });
    }

    return reply.status(200).send({
      data: score,
    });
  } catch (error) {
    return sendExamError(reply, error, "Failed to fetch student score");
  }
};

/**
 * Get student scores with filtering
 * GET /api/v1/exams/scores
 */
export const getStudentScoresController = async (
  request: AuthenticatedRequest<{ Querystring: GetStudentScoresRequest }>,
  reply: FastifyReply,
) => {
  try {
    const filters = request.query;
    if (request.user.role !== Role.ADMIN && !filters.examId) {
      return forbidden(reply);
    }
    if (filters.examId) {
      const scope = await getExamScope(filters.examId);
      if (!scope) return reply.status(404).send({ error: "Exam not found" });
      if (!(await authorizeExamScope(request.user, scope, "read"))) {
        return forbidden(reply);
      }
    }
    const scores = await getStudentScores(filters);

    return reply.status(200).send({
      data: scores,
      count: scores.length,
    });
  } catch (error) {
    return sendExamError(reply, error, "Failed to fetch student scores");
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
  reply: FastifyReply,
) => {
  try {
    const { id } = request.params;
    const parsed = parseUpdateStudentScore(request.body);
    if ("error" in parsed)
      return reply.status(400).send({ error: parsed.error });
    const data = parsed.data;
    const gradedBy = request.user.id;

    const scope = await getScoreScope(id);
    if (!scope)
      return reply.status(404).send({ error: "Student score not found" });
    if (!(await authorizeExamScope(request.user, scope, "write-score"))) {
      return forbidden(reply);
    }

    const score = await updateStudentScore(id, data, gradedBy);

    return reply.status(200).send({
      message: "Student score updated successfully",
      data: score,
    });
  } catch (error) {
    return sendScoreError(reply, error, "Failed to update student score");
  }
};

/**
 * Delete a student score
 * DELETE /api/v1/exams/scores/:id
 */
export const deleteStudentScoreController = async (
  request: AuthenticatedRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) => {
  try {
    const { id } = request.params;

    // Only ADMIN can delete scores
    if (request.user.role !== Role.ADMIN) {
      return reply.status(403).send({
        error: "Only admins can delete student scores",
      });
    }

    const scope = await getScoreScope(id);
    if (!scope)
      return reply.status(404).send({ error: "Student score not found" });

    await deleteStudentScore(id);

    return reply.status(200).send({
      message: "Student score deleted successfully",
    });
  } catch (error) {
    return sendExamError(reply, error, "Failed to delete student score");
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
  reply: FastifyReply,
) => {
  try {
    const { id } = request.params;
    const scope = await getExamScope(id);
    if (!scope) return reply.status(404).send({ error: "Exam not found" });
    if (!(await authorizeExamScope(request.user, scope, "read"))) {
      return forbidden(reply);
    }
    const statistics = await getExamStatistics(id);

    return reply.status(200).send({
      data: statistics,
    });
  } catch (error: any) {
    console.error(error);
    if (error.message.includes("not found")) {
      return reply.status(404).send({
        error: "Exam not found",
      });
    }
    return reply.status(500).send({ error: "Failed to fetch exam statistics" });
  }
};

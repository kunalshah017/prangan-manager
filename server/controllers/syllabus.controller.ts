import { FastifyRequest, FastifyReply } from "fastify";
import {
  createSyllabus,
  getSyllabusById,
  getSyllabi,
  updateSyllabus,
  deleteSyllabus,
  hardDeleteSyllabus,
  createSyllabusTopic,
  bulkCreateTopics,
  getTopicById,
  getTopics,
  updateTopic,
  updateTopicStatus,
  reorderTopics,
  deleteTopic,
  getProgressLogs,
  getSyllabusStatistics,
  importSyllabusFromTemplate,
  getSyllabusScope,
  getTopicScope,
  getTopicSyllabusId,
  getReorderSyllabusScope,
} from "../service/syllabus.service.js";
import {
  CreateSyllabusRequest,
  UpdateSyllabusRequest,
  GetSyllabusRequest,
  CreateSyllabusTopicRequest,
  UpdateSyllabusTopicRequest,
  BulkCreateTopicsRequest,
  UpdateTopicStatusRequest,
  ReorderTopicsRequest,
  GetSyllabusTopicsRequest,
  GetProgressLogsRequest,
  SyllabusStatisticsRequest,
  ImportSyllabusFromTemplateRequest,
} from "../types/syllabus.types.js";
import { Role, SubRole } from "../generated/prisma/index.js";
import { getActiveUserScopeAssignments } from "../service/user.service.js";
import { canAccessScope } from "../security/authorization.js";
import {
  canManageSyllabus,
  canReadSyllabus,
  canUpdateTopicStatus,
  hasCompleteSyllabusScope,
  type SyllabusScope,
} from "../security/syllabus-authorization.js";
import {
  parseBulkCreateTopicsRequest,
  parseCreateSyllabusRequest,
  parseCreateTopicRequest,
  parseImportTemplateRequest,
  parseReorderTopicsRequest,
  parseUpdateSyllabusRequest,
  parseUpdateTopicRequest,
  parseUpdateTopicStatusRequest,
} from "../security/syllabus-input.js";
import { resolveSemesterLevelInput } from "../service/semester-level.service.js";
import { isValidDateFormat } from "../utils/dateHelpers.js";

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

type SyllabusPolicy = "read" | "manage" | "status";

const forbidden = (reply: FastifyReply) =>
  reply.status(403).send({ error: "Forbidden" });

const notFound = (reply: FastifyReply, resource: "Syllabus" | "Topic") =>
  reply.status(404).send({ error: `${resource} not found` });

const authorizeSyllabusScope = async (
  user: AuthenticatedRequest["user"],
  scope: SyllabusScope | null | undefined,
  policy: SyllabusPolicy,
): Promise<boolean> => {
  if (user.role !== Role.ADMIN && !hasCompleteSyllabusScope(scope))
    return false;

  const assignments =
    user.role === Role.ADMIN
      ? []
      : await getActiveUserScopeAssignments(user.id);
  if (typeof assignments === "string") throw new Error(assignments);

  const input = { identity: user, assignments, scope };
  if (policy === "read") return canReadSyllabus(input);
  if (policy === "manage") return canManageSyllabus(input);
  return canUpdateTopicStatus(input);
};

const sendError = (reply: FastifyReply, error: unknown, fallback: string) => {
  console.error(error);
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("already exists") ||
    message.includes("Unique constraint")
  ) {
    return reply
      .status(409)
      .send({ error: "Syllabus already exists for this context" });
  }
  if (
    message.includes("Parent topic must belong to the same syllabus") ||
    message.includes("Topics must belong to one syllabus")
  ) {
    return reply
      .status(400)
      .send({ error: "Invalid syllabus topic hierarchy" });
  }
  if (message === "Syllabus not found") return notFound(reply, "Syllabus");
  if (message === "Topic not found") return notFound(reply, "Topic");
  return reply.status(500).send({ error: fallback });
};

const parsed = <T>(
  result: { data: T } | { error: string },
  reply: FastifyReply,
): T | null => {
  if ("error" in result) {
    reply.status(400).send({ error: result.error });
    return null;
  }
  return result.data;
};

const queryScope = (query: Record<string, unknown>): SyllabusScope => ({
  ...(typeof query.projectId === "string" && { projectId: query.projectId }),
  ...(typeof query.centerId === "string" && { centerId: query.centerId }),
  ...(typeof query.semesterId === "string" && { semesterId: query.semesterId }),
  ...(typeof query.semesterLevelId === "string" && {
    semesterLevelId: query.semesterLevelId,
  }),
});

const resolveReadScope = async (
  query: Record<string, unknown>,
): Promise<SyllabusScope | null> => {
  if (typeof query.syllabusId === "string")
    return getSyllabusScope(query.syllabusId);
  if (typeof query.topicId === "string") return getTopicScope(query.topicId);
  const scope = queryScope(query);
  if (!hasCompleteSyllabusScope(scope)) return null;
  if (!scope.semesterLevelId && typeof query.level !== "string") return scope;
  const semesterLevel = await resolveSemesterLevelInput({
    semesterId: scope.semesterId,
    semesterLevelId: scope.semesterLevelId,
    level: typeof query.level === "string" ? query.level : undefined,
  });
  return { ...scope, semesterLevelId: semesterLevel.id };
};

// ============================================
// SYLLABUS CONTROLLERS
// ============================================

/**
 * Create a new syllabus
 * POST /api/v1/syllabus
 */
export const createSyllabusController = async (
  request: AuthenticatedRequest<{ Body: unknown }>,
  reply: FastifyReply,
) => {
  try {
    const data = parsed(parseCreateSyllabusRequest(request.body), reply);
    if (!data) return;
    const semesterLevel = await resolveSemesterLevelInput(data);
    const scope = {
      projectId: data.projectId,
      centerId: data.centerId,
      semesterId: data.semesterId,
      semesterLevelId: semesterLevel.id,
    };
    if (!hasCompleteSyllabusScope(scope)) {
      return reply.status(400).send({
        error: "projectId, centerId, and semesterId must be canonical IDs",
      });
    }
    if (!(await authorizeSyllabusScope(request.user, scope, "manage"))) {
      return forbidden(reply);
    }

    const syllabus = await createSyllabus(data);

    return reply.status(201).send({
      message: "Syllabus created successfully",
      data: syllabus,
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to create syllabus");
  }
};

/**
 * Get syllabus by ID
 * GET /api/v1/syllabus/:id
 */
export const getSyllabusByIdController = async (
  request: AuthenticatedRequest<{
    Params: { id: string };
    Querystring: { includeTopics?: string; includeStats?: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    const { id } = request.params;
    const scope = await getSyllabusScope(id);
    if (!scope) return notFound(reply, "Syllabus");
    if (!(await authorizeSyllabusScope(request.user, scope, "read"))) {
      return forbidden(reply);
    }
    const includeTopics = request.query.includeTopics === "true";
    const includeStats = request.query.includeStats === "true";

    const syllabus = await getSyllabusById(id, includeTopics, includeStats);

    if (!syllabus) {
      return reply.status(404).send({
        error: "Syllabus not found",
      });
    }

    return reply.status(200).send({
      message: "Syllabus retrieved successfully",
      data: syllabus,
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to get syllabus");
  }
};

/**
 * Get all syllabi with filtering
 * GET /api/v1/syllabus
 */
export const getSyllabiController = async (
  request: AuthenticatedRequest<{
    Querystring: GetSyllabusRequest;
  }>,
  reply: FastifyReply,
) => {
  try {
    const filters = request.query;

    // Convert isActive string to boolean if present
    const parsedFilters: GetSyllabusRequest = {
      ...filters,
      ...(filters.isActive !== undefined && {
        isActive: String(filters.isActive) === "true",
      }),
    };

    const scope = queryScope(parsedFilters as Record<string, unknown>);
    if (request.user.role !== Role.ADMIN) {
      if (
        !hasCompleteSyllabusScope(scope) ||
        !(await authorizeSyllabusScope(request.user, scope, "read"))
      ) {
        return forbidden(reply);
      }
    }

    const syllabi = await getSyllabi(parsedFilters);

    return reply.status(200).send({
      message: "Syllabi retrieved successfully",
      data: syllabi,
      total: syllabi.length,
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to get syllabi");
  }
};

/**
 * Update a syllabus
 * PUT /api/v1/syllabus/:id
 */
export const updateSyllabusController = async (
  request: AuthenticatedRequest<{
    Params: { id: string };
    Body: unknown;
  }>,
  reply: FastifyReply,
) => {
  try {
    const { id } = request.params;
    const data = parsed(parseUpdateSyllabusRequest(request.body), reply);
    if (!data) return;
    const scope = await getSyllabusScope(id);
    if (!scope) return notFound(reply, "Syllabus");
    if (!(await authorizeSyllabusScope(request.user, scope, "manage"))) {
      return forbidden(reply);
    }

    const syllabus = await updateSyllabus(id, data);

    return reply.status(200).send({
      message: "Syllabus updated successfully",
      data: syllabus,
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to update syllabus");
  }
};

/**
 * Delete a syllabus (soft delete)
 * DELETE /api/v1/syllabus/:id
 */
export const deleteSyllabusController = async (
  request: AuthenticatedRequest<{
    Params: { id: string };
    Querystring: { hard?: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    const { id } = request.params;
    const hardDelete = request.query.hard === "true";

    if (hardDelete && request.user.role !== Role.ADMIN) return forbidden(reply);
    const scope = await getSyllabusScope(id);
    if (!scope) return notFound(reply, "Syllabus");
    if (
      !hardDelete &&
      !(await authorizeSyllabusScope(request.user, scope, "manage"))
    ) {
      return forbidden(reply);
    }

    if (hardDelete) {
      await hardDeleteSyllabus(id);
    } else {
      await deleteSyllabus(id);
    }

    return reply.status(200).send({
      message: `Syllabus ${
        hardDelete ? "permanently deleted" : "deactivated"
      } successfully`,
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to delete syllabus");
  }
};

// ============================================
// SYLLABUS TOPIC CONTROLLERS
// ============================================

/**
 * Create a new topic
 * POST /api/v1/syllabus/topics
 */
export const createTopicController = async (
  request: AuthenticatedRequest<{ Body: unknown }>,
  reply: FastifyReply,
) => {
  try {
    const data = parsed(parseCreateTopicRequest(request.body), reply);
    if (!data) return;
    const scope = await getSyllabusScope(data.syllabusId);
    if (!scope) return notFound(reply, "Syllabus");
    if (!(await authorizeSyllabusScope(request.user, scope, "manage"))) {
      return forbidden(reply);
    }

    const topic = await createSyllabusTopic(data);

    return reply.status(201).send({
      message: "Topic created successfully",
      data: topic,
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to create topic");
  }
};

/**
 * Bulk create topics
 * POST /api/v1/syllabus/topics/bulk
 */
export const bulkCreateTopicsController = async (
  request: AuthenticatedRequest<{ Body: unknown }>,
  reply: FastifyReply,
) => {
  try {
    const data = parsed(parseBulkCreateTopicsRequest(request.body), reply);
    if (!data) return;
    const scope = await getSyllabusScope(data.syllabusId);
    if (!scope) return notFound(reply, "Syllabus");
    if (!(await authorizeSyllabusScope(request.user, scope, "manage"))) {
      return forbidden(reply);
    }

    const topics = await bulkCreateTopics(data);

    return reply.status(201).send({
      message: `${topics.length} topics created successfully`,
      data: topics,
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to bulk create topics");
  }
};

/**
 * Get topic by ID
 * GET /api/v1/syllabus/topics/:id
 */
export const getTopicByIdController = async (
  request: AuthenticatedRequest<{
    Params: { id: string };
    Querystring: { includeSubtopics?: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    const { id } = request.params;
    const scope = await getTopicScope(id);
    if (!scope) return notFound(reply, "Topic");
    if (!(await authorizeSyllabusScope(request.user, scope, "read"))) {
      return forbidden(reply);
    }
    const includeSubtopics = request.query.includeSubtopics === "true";

    const topic = await getTopicById(id, includeSubtopics);

    if (!topic) {
      return reply.status(404).send({
        error: "Topic not found",
      });
    }

    return reply.status(200).send({
      message: "Topic retrieved successfully",
      data: topic,
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to get topic");
  }
};

/**
 * Get topics with filtering
 * GET /api/v1/syllabus/topics
 */
export const getTopicsController = async (
  request: AuthenticatedRequest<{
    Querystring: GetSyllabusTopicsRequest & { includeSubtopics?: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    const filters: GetSyllabusTopicsRequest = {
      ...request.query,
      includeSubtopics: request.query.includeSubtopics === "true",
    };

    if (request.user.role !== Role.ADMIN) {
      const scope =
        typeof filters.syllabusId === "string"
          ? await getSyllabusScope(filters.syllabusId)
          : null;
      if (
        !scope ||
        !(await authorizeSyllabusScope(request.user, scope, "read"))
      ) {
        return forbidden(reply);
      }
    }

    const topics = await getTopics(filters);

    return reply.status(200).send({
      message: "Topics retrieved successfully",
      data: topics,
      total: topics.length,
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to get topics");
  }
};

/**
 * Update a topic
 * PUT /api/v1/syllabus/topics/:id
 */
export const updateTopicController = async (
  request: AuthenticatedRequest<{
    Params: { id: string };
    Body: unknown;
  }>,
  reply: FastifyReply,
) => {
  try {
    const { id } = request.params;
    const data = parsed(parseUpdateTopicRequest(request.body), reply);
    if (!data) return;
    const scope = await getTopicScope(id);
    if (!scope) return notFound(reply, "Topic");
    if (!(await authorizeSyllabusScope(request.user, scope, "manage"))) {
      return forbidden(reply);
    }

    const topic = await updateTopic(id, data);

    return reply.status(200).send({
      message: "Topic updated successfully",
      data: topic,
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to update topic");
  }
};

/**
 * Update topic status
 * PATCH /api/v1/syllabus/topics/:id/status
 */
export const updateTopicStatusController = async (
  request: AuthenticatedRequest<{
    Params: { id: string };
    Body: UpdateTopicStatusRequest;
  }>,
  reply: FastifyReply,
) => {
  try {
    const { id } = request.params;
    const data = parsed(parseUpdateTopicStatusRequest(request.body), reply);
    if (!data) return;
    const scope = await getTopicScope(id);
    if (!scope) return notFound(reply, "Topic");
    if (!(await authorizeSyllabusScope(request.user, scope, "status"))) {
      return forbidden(reply);
    }

    const topic = await updateTopicStatus(id, data, request.user.id);

    return reply.status(200).send({
      message: "Topic status updated successfully",
      data: topic,
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to update topic status");
  }
};

/**
 * Reorder topics
 * PATCH /api/v1/syllabus/topics/reorder
 */
export const reorderTopicsController = async (
  request: AuthenticatedRequest<{
    Body: unknown;
  }>,
  reply: FastifyReply,
) => {
  try {
    const data = parsed(parseReorderTopicsRequest(request.body), reply);
    if (!data) return;
    const scope = await getReorderSyllabusScope(
      data.topics.map((topic) => topic.id),
    );
    if (!scope) {
      return reply
        .status(400)
        .send({ error: "Topics must belong to one syllabus" });
    }
    if (!(await authorizeSyllabusScope(request.user, scope, "manage"))) {
      return forbidden(reply);
    }

    await reorderTopics(data);

    return reply.status(200).send({
      message: "Topics reordered successfully",
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to reorder topics");
  }
};

/**
 * Delete a topic
 * DELETE /api/v1/syllabus/topics/:id
 */
export const deleteTopicController = async (
  request: AuthenticatedRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    const { id } = request.params;
    const scope = await getTopicScope(id);
    if (!scope) return notFound(reply, "Topic");
    if (!(await authorizeSyllabusScope(request.user, scope, "manage"))) {
      return forbidden(reply);
    }

    await deleteTopic(id);

    return reply.status(200).send({
      message: "Topic deleted successfully",
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to delete topic");
  }
};

// ============================================
// PROGRESS LOG CONTROLLERS
// ============================================

/**
 * Get progress logs
 * GET /api/v1/syllabus/progress-logs
 */
export const getProgressLogsController = async (
  request: AuthenticatedRequest<{
    Querystring: GetProgressLogsRequest;
  }>,
  reply: FastifyReply,
) => {
  try {
    const filters = request.query;
    if (filters.startDate && !isValidDateFormat(filters.startDate)) {
      return reply.status(400).send({
        error: "startDate must be in YYYY-MM-DD format",
      });
    }
    if (filters.endDate && !isValidDateFormat(filters.endDate)) {
      return reply.status(400).send({
        error: "endDate must be in YYYY-MM-DD format",
      });
    }
    if (request.user.role !== Role.ADMIN) {
      const scope =
        typeof filters.syllabusId === "string"
          ? await getSyllabusScope(filters.syllabusId)
          : typeof filters.topicId === "string"
            ? await getTopicScope(filters.topicId)
            : null;
      if (
        !scope ||
        !(await authorizeSyllabusScope(request.user, scope, "read"))
      ) {
        return forbidden(reply);
      }
    }
    const logs = await getProgressLogs(filters);

    return reply.status(200).send({
      message: "Progress logs retrieved successfully",
      data: logs,
      total: logs.length,
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to get progress logs");
  }
};

// ============================================
// STATISTICS CONTROLLERS
// ============================================

/**
 * Get syllabus statistics
 * GET /api/v1/syllabus/statistics
 */
export const getStatisticsController = async (
  request: AuthenticatedRequest<{
    Querystring: SyllabusStatisticsRequest;
  }>,
  reply: FastifyReply,
) => {
  try {
    const { topicId, ...filters } =
      request.query as SyllabusStatisticsRequest & {
        topicId?: string;
      };
    let statisticsFilters: SyllabusStatisticsRequest = filters;
    let scope: SyllabusScope | null = null;

    if (typeof topicId === "string") {
      const [topicScope, topicSyllabusId] = await Promise.all([
        getTopicScope(topicId),
        getTopicSyllabusId(topicId),
      ]);
      if (!topicScope || !topicSyllabusId) return notFound(reply, "Topic");
      scope = topicScope;
      statisticsFilters = { ...filters, syllabusId: topicSyllabusId };
    } else if (request.user.role !== Role.ADMIN) {
      scope = await resolveReadScope(filters as Record<string, unknown>);
    }

    if (request.user.role !== Role.ADMIN) {
      if (
        !scope ||
        !(await authorizeSyllabusScope(request.user, scope, "read"))
      ) {
        return forbidden(reply);
      }
    }
    const stats = await getSyllabusStatistics(statisticsFilters);

    return reply.status(200).send({
      message: "Statistics retrieved successfully",
      data: stats,
    });
  } catch (error: unknown) {
    return sendError(reply, error, "Failed to get statistics");
  }
};

// ============================================
// IMPORT/EXPORT CONTROLLERS
// ============================================

/**
 * Import syllabus from template
 * POST /api/v1/syllabus/import-template
 */
export const importTemplateController = async (
  request: AuthenticatedRequest<{ Body: unknown }>,
  reply: FastifyReply,
) => {
  try {
    const data = parsed(parseImportTemplateRequest(request.body), reply);
    if (!data) return;
    const semesterLevel = await resolveSemesterLevelInput(data);
    const scope = {
      projectId: data.projectId,
      centerId: data.centerId,
      semesterId: data.semesterId,
      semesterLevelId: semesterLevel.id,
    };
    if (!hasCompleteSyllabusScope(scope)) {
      return reply.status(400).send({
        error: "projectId, centerId, and semesterId must be canonical IDs",
      });
    }
    const assignments =
      request.user.role === Role.ADMIN
        ? []
        : await getActiveUserScopeAssignments(request.user.id);
    if (typeof assignments === "string") throw new Error(assignments);
    if (
      request.user.role !== Role.ADMIN &&
      !canAccessScope({
        identity: request.user,
        assignments,
        allowedSubRoles: [SubRole.CURRICULUM_MENTOR],
        scope: {
          projectId: scope.projectId,
          centerId: scope.centerId,
          semesterId: scope.semesterId,
        },
      })
    ) {
      return forbidden(reply);
    }

    const syllabus = await importSyllabusFromTemplate(data, request.user.id);

    return reply.status(201).send({
      message: "Syllabus imported successfully",
      data: syllabus,
    });
  } catch (error: unknown) {
    console.error(error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("not yet implemented")) {
      return reply
        .status(501)
        .send({ error: "Template import not yet implemented" });
    }
    return reply.status(500).send({ error: "Failed to import syllabus" });
  }
};

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
// SYLLABUS CONTROLLERS
// ============================================

/**
 * Create a new syllabus
 * POST /api/v1/syllabus
 */
export const createSyllabusController = async (
  request: AuthenticatedRequest<{ Body: CreateSyllabusRequest }>,
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
      !data.name
    ) {
      return reply.status(400).send({
        error:
          "Missing required fields: projectId, centerId, semesterId, level, name",
      });
    }

    const syllabus = await createSyllabus(data);

    return reply.status(201).send({
      message: "Syllabus created successfully",
      data: syllabus,
    });
  } catch (error: any) {
    if (error.message.includes("already exists")) {
      return reply.status(409).send({
        error: error.message,
      });
    }
    return reply.status(500).send({
      error: "Failed to create syllabus",
      details: error.message,
    });
  }
};

/**
 * Get syllabus by ID
 * GET /api/v1/syllabus/:id
 */
export const getSyllabusByIdController = async (
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: { includeTopics?: string; includeStats?: string };
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
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
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to get syllabus",
      details: error.message,
    });
  }
};

/**
 * Get all syllabi with filtering
 * GET /api/v1/syllabus
 */
export const getSyllabiController = async (
  request: FastifyRequest<{
    Querystring: GetSyllabusRequest;
  }>,
  reply: FastifyReply
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

    const syllabi = await getSyllabi(parsedFilters);

    return reply.status(200).send({
      message: "Syllabi retrieved successfully",
      data: syllabi,
      total: syllabi.length,
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to get syllabi",
      details: error.message,
    });
  }
};

/**
 * Update a syllabus
 * PUT /api/v1/syllabus/:id
 */
export const updateSyllabusController = async (
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateSyllabusRequest;
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const data = request.body;

    const syllabus = await updateSyllabus(id, data);

    return reply.status(200).send({
      message: "Syllabus updated successfully",
      data: syllabus,
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return reply.status(404).send({
        error: "Syllabus not found",
      });
    }
    return reply.status(500).send({
      error: "Failed to update syllabus",
      details: error.message,
    });
  }
};

/**
 * Delete a syllabus (soft delete)
 * DELETE /api/v1/syllabus/:id
 */
export const deleteSyllabusController = async (
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: { hard?: string };
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const hardDelete = request.query.hard === "true";

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
  } catch (error: any) {
    if (error.code === "P2025") {
      return reply.status(404).send({
        error: "Syllabus not found",
      });
    }
    return reply.status(500).send({
      error: "Failed to delete syllabus",
      details: error.message,
    });
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
  request: AuthenticatedRequest<{ Body: CreateSyllabusTopicRequest }>,
  reply: FastifyReply
) => {
  try {
    const data = request.body;

    // Validate required fields
    if (
      !data.syllabusId ||
      !data.serialNumber ||
      !data.title ||
      data.orderIndex === undefined
    ) {
      return reply.status(400).send({
        error:
          "Missing required fields: syllabusId, serialNumber, title, orderIndex",
      });
    }

    const topic = await createSyllabusTopic(data);

    return reply.status(201).send({
      message: "Topic created successfully",
      data: topic,
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to create topic",
      details: error.message,
    });
  }
};

/**
 * Bulk create topics
 * POST /api/v1/syllabus/topics/bulk
 */
export const bulkCreateTopicsController = async (
  request: AuthenticatedRequest<{ Body: BulkCreateTopicsRequest }>,
  reply: FastifyReply
) => {
  try {
    const data = request.body;

    if (!data.syllabusId || !data.topics || data.topics.length === 0) {
      return reply.status(400).send({
        error: "Missing required fields: syllabusId and topics array",
      });
    }

    const topics = await bulkCreateTopics(data);

    return reply.status(201).send({
      message: `${topics.length} topics created successfully`,
      data: topics,
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to bulk create topics",
      details: error.message,
    });
  }
};

/**
 * Get topic by ID
 * GET /api/v1/syllabus/topics/:id
 */
export const getTopicByIdController = async (
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: { includeSubtopics?: string };
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
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
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to get topic",
      details: error.message,
    });
  }
};

/**
 * Get topics with filtering
 * GET /api/v1/syllabus/topics
 */
export const getTopicsController = async (
  request: FastifyRequest<{
    Querystring: GetSyllabusTopicsRequest & { includeSubtopics?: string };
  }>,
  reply: FastifyReply
) => {
  try {
    const filters: GetSyllabusTopicsRequest = {
      ...request.query,
      includeSubtopics: request.query.includeSubtopics === "true",
    };

    const topics = await getTopics(filters);

    return reply.status(200).send({
      message: "Topics retrieved successfully",
      data: topics,
      total: topics.length,
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to get topics",
      details: error.message,
    });
  }
};

/**
 * Update a topic
 * PUT /api/v1/syllabus/topics/:id
 */
export const updateTopicController = async (
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateSyllabusTopicRequest;
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const data = request.body;

    const topic = await updateTopic(id, data);

    return reply.status(200).send({
      message: "Topic updated successfully",
      data: topic,
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return reply.status(404).send({
        error: "Topic not found",
      });
    }
    return reply.status(500).send({
      error: "Failed to update topic",
      details: error.message,
    });
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
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const data = request.body;
    const userId = request.user.id;

    if (!data.status) {
      return reply.status(400).send({
        error: "Status is required",
      });
    }

    const topic = await updateTopicStatus(id, data, userId);

    return reply.status(200).send({
      message: "Topic status updated successfully",
      data: topic,
    });
  } catch (error: any) {
    if (error.message === "Topic not found") {
      return reply.status(404).send({
        error: error.message,
      });
    }
    return reply.status(500).send({
      error: "Failed to update topic status",
      details: error.message,
    });
  }
};

/**
 * Reorder topics
 * PATCH /api/v1/syllabus/topics/reorder
 */
export const reorderTopicsController = async (
  request: FastifyRequest<{
    Body: ReorderTopicsRequest;
  }>,
  reply: FastifyReply
) => {
  try {
    const data = request.body;

    if (!data.topics || data.topics.length === 0) {
      return reply.status(400).send({
        error: "Topics array is required",
      });
    }

    await reorderTopics(data);

    return reply.status(200).send({
      message: "Topics reordered successfully",
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to reorder topics",
      details: error.message,
    });
  }
};

/**
 * Delete a topic
 * DELETE /api/v1/syllabus/topics/:id
 */
export const deleteTopicController = async (
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;

    await deleteTopic(id);

    return reply.status(200).send({
      message: "Topic deleted successfully",
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return reply.status(404).send({
        error: "Topic not found",
      });
    }
    return reply.status(500).send({
      error: "Failed to delete topic",
      details: error.message,
    });
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
  request: FastifyRequest<{
    Querystring: GetProgressLogsRequest;
  }>,
  reply: FastifyReply
) => {
  try {
    const filters = request.query;
    const logs = await getProgressLogs(filters);

    return reply.status(200).send({
      message: "Progress logs retrieved successfully",
      data: logs,
      total: logs.length,
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to get progress logs",
      details: error.message,
    });
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
  request: FastifyRequest<{
    Querystring: SyllabusStatisticsRequest;
  }>,
  reply: FastifyReply
) => {
  try {
    const filters = request.query;
    const stats = await getSyllabusStatistics(filters);

    return reply.status(200).send({
      message: "Statistics retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to get statistics",
      details: error.message,
    });
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
  request: AuthenticatedRequest<{ Body: ImportSyllabusFromTemplateRequest }>,
  reply: FastifyReply
) => {
  try {
    const data = request.body;
    const userId = request.user.id;

    if (
      !data.projectId ||
      !data.centerId ||
      !data.semesterId ||
      !data.level ||
      !data.templateName
    ) {
      return reply.status(400).send({
        error:
          "Missing required fields: projectId, centerId, semesterId, level, templateName",
      });
    }

    const syllabus = await importSyllabusFromTemplate(data, userId);

    return reply.status(201).send({
      message: "Syllabus imported successfully",
      data: syllabus,
    });
  } catch (error: any) {
    if (error.message.includes("not yet implemented")) {
      return reply.status(501).send({
        error: error.message,
      });
    }
    return reply.status(500).send({
      error: "Failed to import syllabus",
      details: error.message,
    });
  }
};

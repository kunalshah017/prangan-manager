import { FastifyInstance } from "fastify";
import {
  createSyllabusController,
  getSyllabusByIdController,
  getSyllabiController,
  updateSyllabusController,
  deleteSyllabusController,
  createTopicController,
  bulkCreateTopicsController,
  getTopicByIdController,
  getTopicsController,
  updateTopicController,
  updateTopicStatusController,
  reorderTopicsController,
  deleteTopicController,
  getProgressLogsController,
  getStatisticsController,
  importTemplateController,
} from "../controllers/syllabus.controller.js";
import { authChecker } from "../utils/authChecker.js";

export default async function syllabusRoutes(fastify: FastifyInstance) {
  // Hook to require authentication for all syllabus routes
  fastify.addHook("preHandler", authChecker);

  // ============================================
  // SYLLABUS ROUTES
  // ============================================

  // Create a new syllabus
  // POST /api/v1/syllabus
  // Required: projectId, centerId, semesterId, level, name
  // Optional: description
  // Roles: ADMIN, CENTER_MANAGER, CURRICULUM_MENTOR
  fastify.post("/", createSyllabusController as any);

  // Get syllabus by ID
  // GET /api/v1/syllabus/:id
  // Query params: includeTopics (boolean), includeStats (boolean)
  // Roles: All authenticated users
  fastify.get("/:id", getSyllabusByIdController as any);

  // Get all syllabi with filtering
  // GET /api/v1/syllabus
  // Query params: projectId, centerId, semesterId, level, isActive
  // Roles: All authenticated users
  fastify.get("/", getSyllabiController as any);

  // Update a syllabus
  // PUT /api/v1/syllabus/:id
  // Body: name, description, isActive
  // Roles: ADMIN, CENTER_MANAGER, CURRICULUM_MENTOR
  fastify.put("/:id", updateSyllabusController as any);

  // Delete a syllabus (soft delete by default, hard delete with ?hard=true)
  // DELETE /api/v1/syllabus/:id
  // Query params: hard (boolean)
  // Roles: ADMIN
  fastify.delete("/:id", deleteSyllabusController as any);

  // ============================================
  // TOPIC ROUTES
  // ============================================

  // Create a new topic
  // POST /api/v1/syllabus/topics
  // Required: syllabusId, serialNumber, title, orderIndex
  // Optional: parentId, cycle, metadata
  // Roles: ADMIN, CENTER_MANAGER, CURRICULUM_MENTOR
  fastify.post("/topics", createTopicController as any);

  // Bulk create topics
  // POST /api/v1/syllabus/topics/bulk
  // Required: syllabusId, topics[]
  // Roles: ADMIN, CENTER_MANAGER, CURRICULUM_MENTOR
  fastify.post("/topics/bulk", bulkCreateTopicsController as any);

  // Get topic by ID
  // GET /api/v1/syllabus/topics/:id
  // Query params: includeSubtopics (boolean)
  // Roles: All authenticated users
  fastify.get("/topics/:id", getTopicByIdController as any);

  // Get topics with filtering
  // GET /api/v1/syllabus/topics
  // Query params: syllabusId, parentId, cycle, status, includeSubtopics
  // Roles: All authenticated users
  fastify.get("/topics", getTopicsController as any);

  // Update a topic
  // PUT /api/v1/syllabus/topics/:id
  // Body: serialNumber, title, cycle, status, orderIndex, metadata
  // Roles: ADMIN, CENTER_MANAGER, CURRICULUM_MENTOR, EDUCATOR
  fastify.put("/topics/:id", updateTopicController as any);

  // Update topic status (with progress log)
  // PATCH /api/v1/syllabus/topics/:id/status
  // Required: status
  // Optional: notes
  // Roles: ADMIN, CENTER_MANAGER, CURRICULUM_MENTOR, EDUCATOR
  fastify.patch("/topics/:id/status", updateTopicStatusController as any);

  // Reorder topics
  // PATCH /api/v1/syllabus/topics/reorder
  // Required: topics[] (id, orderIndex)
  // Roles: ADMIN, CENTER_MANAGER, CURRICULUM_MENTOR
  fastify.patch("/topics/reorder", reorderTopicsController as any);

  // Delete a topic
  // DELETE /api/v1/syllabus/topics/:id
  // Roles: ADMIN, CENTER_MANAGER, CURRICULUM_MENTOR
  fastify.delete("/topics/:id", deleteTopicController as any);

  // ============================================
  // PROGRESS & STATISTICS ROUTES
  // ============================================

  // Get progress logs
  // GET /api/v1/syllabus/progress-logs
  // Query params: topicId, syllabusId, startDate, endDate, updatedBy
  // Roles: All authenticated users
  fastify.get("/progress-logs", getProgressLogsController as any);

  // Get syllabus statistics
  // GET /api/v1/syllabus/statistics
  // Query params: syllabusId, projectId, centerId, semesterId, level
  // Roles: All authenticated users
  fastify.get("/statistics", getStatisticsController as any);

  // ============================================
  // IMPORT/EXPORT ROUTES
  // ============================================

  // Import syllabus from template
  // POST /api/v1/syllabus/import-template
  // Required: projectId, centerId, semesterId, level, templateName
  // Optional: syllabusName, description
  // Roles: ADMIN, CURRICULUM_MENTOR
  fastify.post("/import-template", importTemplateController as any);
}

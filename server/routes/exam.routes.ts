import { FastifyInstance } from "fastify";
import {
  createExamController,
  getExamByIdController,
  getExamsController,
  updateExamController,
  deleteExamController,
  createStudentScoreController,
  bulkCreateScoresController,
  getStudentScoreByIdController,
  getStudentScoresController,
  updateStudentScoreController,
  deleteStudentScoreController,
  getExamStatisticsController,
} from "../controllers/exam.controller.js";
import { authChecker } from "../utils/authChecker.js";

export default async function examRoutes(fastify: FastifyInstance) {
  // Hook to require authentication for all exam routes
  fastify.addHook("preHandler", authChecker);

  // ============================================
  // EXAM ROUTES
  // ============================================

  // Create a new exam
  // POST /api/v1/exams
  // Required: projectId, centerId, semesterId, level, name, examDate, LSRW max marks
  // Optional: description
  // Roles: ADMIN, CENTER_MANAGER, CURRICULUM_MENTOR
  fastify.post("/", createExamController as any);

  // Get exam by ID
  // GET /api/v1/exams/:id
  // Query params: includeScores (boolean)
  // Roles: All authenticated users
  fastify.get("/:id", getExamByIdController as any);

  // Get exam statistics
  // GET /api/v1/exams/:id/statistics
  // Returns: totalStudents, scoresEntered, absentStudents, pendingScores, averageScores, topScorers
  // Roles: All authenticated users
  fastify.get("/:id/statistics", getExamStatisticsController as any);

  // Get all exams with filtering
  // GET /api/v1/exams
  // Query params: projectId, centerId, semesterId, level, isActive, startDate, endDate
  // Roles: All authenticated users
  fastify.get("/", getExamsController as any);

  // Update an exam
  // PUT /api/v1/exams/:id
  // Body: name, description, examDate, LSRW max marks, isActive
  // Roles: ADMIN, CENTER_MANAGER, CURRICULUM_MENTOR
  fastify.put("/:id", updateExamController as any);

  // Delete an exam (soft delete by default, hard delete with ?hard=true)
  // DELETE /api/v1/exams/:id
  // Query params: hard (boolean)
  // Roles: ADMIN (hard delete), ADMIN/CENTER_MANAGER/CURRICULUM_MENTOR (soft delete)
  fastify.delete("/:id", deleteExamController as any);

  // ============================================
  // STUDENT SCORE ROUTES
  // ============================================

  // Create a student exam score
  // POST /api/v1/exams/scores
  // Required: examId, studentId, enrollmentId, LSRW scores (unless isAbsent=true)
  // Optional: remarks, isAbsent
  // Roles: ADMIN, CENTER_MANAGER, CURRICULUM_MENTOR, EDUCATOR
  fastify.post("/scores", createStudentScoreController as any);

  // Bulk create student scores
  // POST /api/v1/exams/scores/bulk
  // Required: examId, scores[] (array of student scores)
  // Roles: ADMIN, CENTER_MANAGER, CURRICULUM_MENTOR, EDUCATOR
  fastify.post("/scores/bulk", bulkCreateScoresController as any);

  // Get student score by ID
  // GET /api/v1/exams/scores/:id
  // Roles: All authenticated users
  fastify.get("/scores/:id", getStudentScoreByIdController as any);

  // Get student scores with filtering
  // GET /api/v1/exams/scores
  // Query params: examId, studentId, enrollmentId
  // Roles: All authenticated users
  fastify.get("/scores", getStudentScoresController as any);

  // Update a student exam score
  // PUT /api/v1/exams/scores/:id
  // Body: LSRW scores, remarks, isAbsent
  // Roles: ADMIN, CENTER_MANAGER, CURRICULUM_MENTOR, EDUCATOR
  fastify.put("/scores/:id", updateStudentScoreController as any);

  // Delete a student score
  // DELETE /api/v1/exams/scores/:id
  // Roles: ADMIN only
  fastify.delete("/scores/:id", deleteStudentScoreController as any);
}

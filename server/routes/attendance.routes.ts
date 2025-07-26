import { FastifyInstance } from "fastify";
import {
  getActiveUsersController,
  markAttendanceController,
  markBulkAttendanceController,
  getAttendanceController,
  getAttendanceSummaryController,
  autoMarkAttendanceController,
} from "../controllers/attendance.controller.js";
import { authChecker } from "../utils/authChecker.js";

export default async function attendanceRoutes(fastify: FastifyInstance) {
  // Hook to require authentication for all attendance routes
  fastify.addHook("preHandler", authChecker);

  // Get active educators and center managers for attendance marking
  fastify.get("/active-users", getActiveUsersController as any);

  // Mark attendance for a single user
  fastify.post("/mark", markAttendanceController as any);

  // Mark attendance for multiple users in bulk
  fastify.post("/bulk-mark", markBulkAttendanceController as any);

  // Get attendance records with filtering and pagination
  fastify.get("/records", getAttendanceController as any);

  // Get attendance summary/report
  fastify.get("/summary", getAttendanceSummaryController as any);

  // Auto-mark attendance for a date (admin only)
  fastify.post("/auto-mark", autoMarkAttendanceController as any);
}

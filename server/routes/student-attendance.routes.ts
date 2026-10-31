import { FastifyInstance } from "fastify";
import {
  markBulkStudentAttendance,
  getStudentAttendance,
} from "../controllers/student-attendance.controller.js";
import { authChecker } from "../utils/authChecker.js";

export default async function studentAttendanceRoutes(
  fastify: FastifyInstance
) {
  // Mark attendance for multiple students in bulk
  fastify.post("/bulk", { preHandler: authChecker }, markBulkStudentAttendance);

  // Get attendance records with filters
  fastify.get("/", { preHandler: authChecker }, getStudentAttendance);
}

import { FastifyInstance } from "fastify";
import {
  markStudentAttendance,
  markBulkStudentAttendance,
  getStudentAttendance,
  getStudentAttendanceById,
  getStudentAttendanceStats,
  updateStudentAttendance,
  deleteStudentAttendance,
  getAttendanceByDate,
  getStudentsWithoutAttendance,
  getBulkAttendanceEstimate,
} from "../controllers/student-attendance.controller.js";
import { authChecker } from "../utils/authChecker.js";

export default async function studentAttendanceRoutes(
  fastify: FastifyInstance
) {
  // Mark attendance for a single student
  fastify.post("/", { preHandler: authChecker }, markStudentAttendance);

  // Mark attendance for multiple students in bulk
  fastify.post("/bulk", { preHandler: authChecker }, markBulkStudentAttendance);

  // Get processing estimate for bulk attendance
  fastify.get(
    "/bulk/estimate",
    { preHandler: authChecker },
    getBulkAttendanceEstimate
  );

  // Get attendance records with filters
  fastify.get("/", { preHandler: authChecker }, getStudentAttendance);

  // Get attendance for a specific date and center/semester
  fastify.get("/by-date", { preHandler: authChecker }, getAttendanceByDate);

  // Get students without attendance for a specific date
  fastify.get(
    "/students-without-attendance",
    { preHandler: authChecker },
    getStudentsWithoutAttendance
  );

  // Get attendance for a specific student
  fastify.get(
    "/student/:studentId",
    { preHandler: authChecker },
    getStudentAttendanceById
  );

  // Get attendance statistics for a student
  fastify.get(
    "/student/:studentId/stats",
    { preHandler: authChecker },
    getStudentAttendanceStats
  );

  // Update attendance record
  fastify.put(
    "/:attendanceId",
    { preHandler: authChecker },
    updateStudentAttendance
  );

  // Delete attendance record
  fastify.delete(
    "/:attendanceId",
    { preHandler: authChecker },
    deleteStudentAttendance
  );
}

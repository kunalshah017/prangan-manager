import { FastifyRequest, FastifyReply } from "fastify";
import { StudentAttendanceService } from "../service/student-attendance.service.js";
import {
  StudentAttendanceCreateInput,
  StudentAttendanceUpdateInput,
  StudentAttendanceFilter,
  BulkStudentAttendanceInput,
} from "../types/student-attendance.types.js";

// Mark attendance for a single student
export const markStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const attendanceData = request.body as StudentAttendanceCreateInput;

    // Validate required fields
    if (
      !attendanceData.studentId ||
      !attendanceData.date ||
      !attendanceData.enrollmentId
    ) {
      return reply.status(400).send({
        message: "Student ID, date, and enrollment ID are required",
      });
    }

    const attendance = await StudentAttendanceService.markAttendance(
      attendanceData,
      userId
    );

    return reply.status(200).send({
      message: "Student attendance marked successfully",
      attendance,
    });
  } catch (error: any) {
    console.error("Error marking student attendance:", error);
    return reply.status(500).send({
      message: error.message || "Failed to mark student attendance",
    });
  }
};

// Mark attendance for multiple students in bulk
// Optimized for serverless environments to avoid timeouts
export const markBulkStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const bulkData = request.body as BulkStudentAttendanceInput;

    // Validate required fields
    if (!bulkData.date || !bulkData.studentAttendances?.length) {
      return reply.status(400).send({
        message: "Date and student attendances array are required",
      });
    }

    // Check for reasonable batch size to prevent timeouts
    if (bulkData.studentAttendances.length > 60) {
      return reply.status(400).send({
        message:
          "Too many student attendance records. Please process in batches of 60 or fewer.",
        maxBatchSize: 60,
        receivedCount: bulkData.studentAttendances.length,
        suggestion:
          "Split your request into smaller batches for better performance.",
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(bulkData.date)) {
      return reply.status(400).send({
        message: "Date must be in YYYY-MM-DD format",
      });
    }

    const result = await StudentAttendanceService.markBulkAttendance(
      bulkData,
      userId
    );

    const hasErrors = result.errors.length > 0;
    const allFailed = result.processedCount === 0 && hasErrors;
    const partialSuccess = hasErrors && result.processedCount > 0;

    // Return appropriate status code based on results
    let status = 200;
    let message = "Bulk student attendance marked successfully";

    if (allFailed) {
      status = 400;
      message = "All student attendance records failed to process";
    } else if (partialSuccess) {
      status = 207; // 207 Multi-Status for partial success
      message = `Bulk attendance partially completed. ${result.processedCount} successful, ${result.errors.length} failed.`;
    }

    return reply.status(status).send({
      message,
      success: !allFailed,
      partialFailure: partialSuccess,
      processedCount: result.processedCount,
      totalCount: bulkData.studentAttendances.length,
      successCount: result.processedCount,
      errorCount: result.errors.length,
      attendances: result.attendances,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error("Error marking bulk student attendance:", error);

    if (
      error.message?.includes("timeout") ||
      error.message?.includes("timed out")
    ) {
      return reply.status(408).send({
        message:
          "Request timed out. Please try processing fewer students at once.",
        suggestion:
          "Split your request into smaller batches of 30-40 students.",
        error: error.message,
      });
    }

    return reply.status(500).send({
      message: error.message || "Failed to mark bulk student attendance",
    });
  }
};

// Get attendance records with filters
export const getStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const filter = request.query as StudentAttendanceFilter;

    const attendance = await StudentAttendanceService.getAttendance(filter);

    return reply.status(200).send({
      message: "Student attendance retrieved successfully",
      attendance,
      count: attendance.length,
    });
  } catch (error: any) {
    console.error("Error getting student attendance:", error);
    return reply.status(500).send({
      message: error.message || "Failed to get student attendance",
    });
  }
};

// Get attendance for a specific student
export const getStudentAttendanceById = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { studentId } = request.params as { studentId: string };
    const filter = request.query as Omit<StudentAttendanceFilter, "studentId">;

    const attendance = await StudentAttendanceService.getStudentAttendance(
      studentId,
      filter
    );

    return reply.status(200).send({
      message: "Student attendance retrieved successfully",
      attendance,
      count: attendance.length,
    });
  } catch (error: any) {
    console.error("Error getting student attendance by ID:", error);
    return reply.status(500).send({
      message: error.message || "Failed to get student attendance",
    });
  }
};

// Get attendance statistics for a student
export const getStudentAttendanceStats = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { studentId } = request.params as { studentId: string };
    const { semesterId, centerId, dateFrom, dateTo } = request.query as {
      semesterId?: string;
      centerId?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    const stats = await StudentAttendanceService.getStudentAttendanceStats(
      studentId,
      semesterId,
      centerId,
      dateFrom,
      dateTo
    );

    return reply.status(200).send({
      message: "Student attendance statistics retrieved successfully",
      stats,
    });
  } catch (error: any) {
    console.error("Error getting student attendance stats:", error);
    return reply.status(500).send({
      message: error.message || "Failed to get student attendance statistics",
    });
  }
};

// Update attendance record
export const updateStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const { attendanceId } = request.params as { attendanceId: string };
    const updateData = request.body as StudentAttendanceUpdateInput;

    const attendance = await StudentAttendanceService.updateAttendance(
      attendanceId,
      updateData,
      userId
    );

    return reply.status(200).send({
      message: "Student attendance updated successfully",
      attendance,
    });
  } catch (error: any) {
    console.error("Error updating student attendance:", error);
    return reply.status(500).send({
      message: error.message || "Failed to update student attendance",
    });
  }
};

// Delete attendance record
export const deleteStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { attendanceId } = request.params as { attendanceId: string };

    await StudentAttendanceService.deleteAttendance(attendanceId);

    return reply.status(200).send({
      message: "Student attendance deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting student attendance:", error);
    return reply.status(500).send({
      message: error.message || "Failed to delete student attendance",
    });
  }
};

// Get attendance for a specific date and center/semester
export const getAttendanceByDate = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { date, centerId, semesterId, projectId } = request.query as {
      date: string;
      centerId: string;
      semesterId: string;
      projectId?: string;
    };

    if (!date || !centerId || !semesterId) {
      return reply.status(400).send({
        message: "Date, center ID, and semester ID are required",
      });
    }

    const attendance = await StudentAttendanceService.getAttendanceByDate(
      date,
      centerId,
      semesterId,
      projectId
    );

    return reply.status(200).send({
      message: "Attendance by date retrieved successfully",
      attendance,
      count: attendance.length,
    });
  } catch (error: any) {
    console.error("Error getting attendance by date:", error);
    return reply.status(500).send({
      message: error.message || "Failed to get attendance by date",
    });
  }
};

// Get students without attendance for a specific date
export const getStudentsWithoutAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { date, centerId, semesterId, projectId } = request.query as {
      date: string;
      centerId: string;
      semesterId: string;
      projectId?: string;
    };

    if (!date || !centerId || !semesterId) {
      return reply.status(400).send({
        message: "Date, center ID, and semester ID are required",
      });
    }

    const students =
      await StudentAttendanceService.getStudentsWithoutAttendance(
        date,
        centerId,
        semesterId,
        projectId
      );

    return reply.status(200).send({
      message: "Students without attendance retrieved successfully",
      students,
      count: students.length,
    });
  } catch (error: any) {
    console.error("Error getting students without attendance:", error);
    return reply.status(500).send({
      message: error.message || "Failed to get students without attendance",
    });
  }
};

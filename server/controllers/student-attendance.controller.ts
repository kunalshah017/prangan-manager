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

    // Allow larger batches - backend will handle splitting automatically
    // Set a reasonable upper limit to prevent abuse (e.g., 200 students max)
    if (bulkData.studentAttendances.length > 200) {
      return reply.status(400).send({
        message:
          "Too many student attendance records. Maximum allowed is 200 students per request.",
        maxBatchSize: 200,
        receivedCount: bulkData.studentAttendances.length,
        suggestion: "Please split very large requests into multiple API calls.",
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
      processingInfo: {
        automaticOptimization: true,
        batchStrategy:
          bulkData.studentAttendances.length <= 20
            ? "SMALL"
            : bulkData.studentAttendances.length <= 50
            ? "MEDIUM"
            : "LARGE",
        estimatedProcessingTime: `${Math.ceil(
          bulkData.studentAttendances.length * 0.15
        )} seconds`,
        note: "Backend automatically handles optimal batch sizes and parallel processing",
      },
    });
  } catch (error: any) {
    console.error("Error marking bulk student attendance:", error);

    if (
      error.message?.includes("timeout") ||
      error.message?.includes("timed out")
    ) {
      return reply.status(408).send({
        message:
          "Request timed out during processing. The system automatically optimizes batch sizes, but this request exceeded available processing time.",
        explanation:
          "Our backend automatically splits large requests into optimal chunks and processes them efficiently. However, this particular request was too large for the available processing window.",
        error: error.message,
        recommendedActions: [
          "Try splitting your request into 2-3 smaller requests (e.g., by class level or grade)",
          "Process attendance for different centers separately if applicable",
          "Try again during off-peak hours when server load is lower",
          "Contact support if this error persists with reasonable batch sizes",
        ],
        technicalInfo: {
          automaticOptimization:
            "The system automatically uses different batch sizes: 8 students per chunk for small requests, 6 for medium, and 4 for large requests",
          processingStrategy:
            "Requests are processed with controlled parallelism and timeout protection",
        },
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

// Get processing estimates for bulk attendance operation
export const getBulkAttendanceEstimate = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { studentCount } = request.query as { studentCount: string };

    const count = parseInt(studentCount);
    if (isNaN(count) || count <= 0) {
      return reply.status(400).send({
        message: "Valid student count is required",
      });
    }

    // Calculate estimates based on our processing strategy
    let batchStrategy: string;
    let estimatedTime: number;
    let maxRecommended: number;

    if (count <= 20) {
      batchStrategy = "SMALL";
      estimatedTime = Math.ceil(count * 0.1); // ~0.1 seconds per student
      maxRecommended = 30;
    } else if (count <= 50) {
      batchStrategy = "MEDIUM";
      estimatedTime = Math.ceil(count * 0.15); // ~0.15 seconds per student
      maxRecommended = 75;
    } else {
      batchStrategy = "LARGE";
      estimatedTime = Math.ceil(count * 0.2); // ~0.2 seconds per student
      maxRecommended = 150;
    }

    return reply.status(200).send({
      message: "Processing estimate calculated successfully",
      estimate: {
        studentCount: count,
        batchStrategy,
        estimatedProcessingTime: `${estimatedTime} seconds`,
        maxRecommendedBatchSize: maxRecommended,
        processingInfo: {
          automaticOptimization: true,
          parallelProcessing: true,
          timeoutProtection: true,
          explanation:
            "Backend automatically handles optimal chunking and parallel processing for best performance",
        },
        recommendations:
          count > maxRecommended
            ? [
                `Consider splitting into ${Math.ceil(
                  count / maxRecommended
                )} smaller requests`,
                "Process different class levels or centers separately",
                "Use the bulk processing during off-peak hours",
              ]
            : [
                "This batch size is optimal for processing",
                "Expected to complete within timeout limits",
              ],
      },
    });
  } catch (error: any) {
    console.error("Error calculating bulk attendance estimate:", error);
    return reply.status(500).send({
      message: error.message || "Failed to calculate processing estimate",
    });
  }
};

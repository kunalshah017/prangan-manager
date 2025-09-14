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

    // Simple validation for reasonable batch sizes (your typical use case: ~100 students)
    const MAX_BATCH_SIZE = 150; // Reasonable limit for typical class sizes
    if (bulkData.studentAttendances.length > MAX_BATCH_SIZE) {
      return reply.status(400).send({
        message: `Too many student attendance records. Maximum allowed is ${MAX_BATCH_SIZE} students per request.`,
        maxBatchSize: MAX_BATCH_SIZE,
        receivedCount: bulkData.studentAttendances.length,
        suggestion:
          "Please split into smaller batches if processing multiple classes.",
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
        optimizationType: "SIMPLE_TRANSACTION",
        bulkProcessing: true,
        estimatedProcessingTime: `${Math.ceil(
          bulkData.studentAttendances.length * 0.02
        )} seconds`,
        note: "Optimized for typical class sizes (~100 students)",
        performance: "Single transaction for reliable processing",
      },
    });
  } catch (error: any) {
    console.error("Error marking bulk student attendance:", error);

    if (
      error.message?.includes("timeout") ||
      error.message?.includes("timed out") ||
      error.message?.includes("Transaction already closed") ||
      error.message?.includes("expired transaction")
    ) {
      return reply.status(408).send({
        message:
          "Request timed out during processing. Vercel's serverless environment has strict timeout limits.",
        explanation:
          "The application is deployed on Vercel's serverless platform, which has execution time limits to ensure optimal performance. This batch exceeded those limits.",
        error: error.message,
        recommendedActions: [
          "Try reducing the batch size to 200-300 students or fewer",
          "Process attendance for different class levels separately",
          "Split large centers into multiple smaller requests",
          "Process during off-peak hours when database response is faster",
          "Contact support if issues persist with reasonable batch sizes",
        ],
        technicalInfo: {
          optimizationType: "SIMPLE_TRANSACTION",
          processingStrategy: "Single transaction for typical class sizes",
          transactionTimeout: "10 seconds",
          maxRecommendedBatchSize: 150,
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

    // Calculate estimates based on Vercel serverless deployment constraints
    const batchStrategy = "VERCEL_SERVERLESS_BATCHING";
    const estimatedTime = Math.ceil(Math.max(count * 0.05, 2)); // More conservative for Vercel
    const maxRecommended = 300; // Reduced for Vercel's timeout limits

    return reply.status(200).send({
      message: "Processing estimate calculated successfully",
      estimate: {
        studentCount: count,
        batchStrategy,
        estimatedProcessingTime: `${estimatedTime} seconds`,
        maxRecommendedBatchSize: maxRecommended,
        processingInfo: {
          deployment: "VERCEL_SERVERLESS",
          optimizationType: "BATCHED_TRANSACTIONS",
          bulkProcessing: true,
          timeoutProtection: true,
          transactionTimeout: "15 seconds",
          explanation:
            "Backend uses Prisma transactions with batching optimized for Vercel's serverless environment",
          performance:
            "Processes 20 students per batch with extended timeout protection",
        },
        recommendations:
          count > maxRecommended
            ? [
                `Consider splitting into ${Math.ceil(
                  count / maxRecommended
                )} smaller requests`,
                "Process different class levels or centers separately",
                "Use bulk processing during off-peak hours for better performance",
                "Vercel's serverless limits require smaller batch sizes",
              ]
            : [
                "This batch size is excellent for Vercel's serverless environment",
                "Expected to complete within timeout limits",
                "Batched processing handles 20 students per transaction batch",
                "Optimized for Vercel's 15-second function timeout",
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

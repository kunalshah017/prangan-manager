import { FastifyRequest, FastifyReply } from "fastify";
import {
  getActiveUsersForAttendance,
  markAttendance,
  markBulkAttendance,
  getAttendanceRecords,
  getAttendanceSummary,
  autoMarkAttendance,
} from "../service/attendance.service.js";
import {
  GetActiveUsersForAttendanceRequest,
  MarkAttendanceRequest,
  MarkBulkAttendanceRequest,
  GetAttendanceRequest,
  GetAttendanceSummaryRequest,
} from "../types/attendance.types.js";
import { AttendanceStatus, Role } from "../generated/prisma/index.js";

// Define AuthenticatedRequest type locally
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

/**
 * Get active educators and center managers for attendance marking
 * GET /api/v1/attendance/active-users
 */
export const getActiveUsersController = async (
  request: FastifyRequest<{
    Querystring: {
      date: string;
      projectId: string;
      centerId: string;
      semesterId: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const { date, projectId, centerId, semesterId } = request.query;

    if (!date || !projectId || !centerId || !semesterId) {
      return reply.status(400).send({
        error: "Date, projectId, centerId, and semesterId are required",
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return reply.status(400).send({
        error: "Date must be in YYYY-MM-DD format",
      });
    }

    const requestData: GetActiveUsersForAttendanceRequest = {
      date,
      projectId,
      centerId,
      semesterId,
    };

    const result = await getActiveUsersForAttendance(requestData);

    return reply.status(200).send({
      message: "Active users retrieved successfully",
      data: result,
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to get active users",
      details: error.message,
    });
  }
};

/**
 * Mark attendance for a single user
 * POST /api/v1/attendance/mark
 */
export const markAttendanceController = async (
  request: AuthenticatedRequest<{
    Body: MarkAttendanceRequest;
  }>,
  reply: FastifyReply
) => {
  try {
    const attendanceData = request.body;
    const markedBy = request.user.id;

    // Validate required fields
    if (
      !attendanceData.userId ||
      !attendanceData.date ||
      !attendanceData.status ||
      !attendanceData.projectId ||
      !attendanceData.centerId ||
      !attendanceData.semesterId ||
      !attendanceData.roleAssignmentId
    ) {
      return reply.status(400).send({
        error:
          "userId, date, status, projectId, centerId, semesterId, and roleAssignmentId are required",
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(attendanceData.date)) {
      return reply.status(400).send({
        error: "Date must be in YYYY-MM-DD format",
      });
    }

    // Validate status
    if (!Object.values(AttendanceStatus).includes(attendanceData.status)) {
      return reply.status(400).send({
        error: "Invalid attendance status",
      });
    }

    // Validate holiday reason for HOLIDAY status
    if (
      attendanceData.status === AttendanceStatus.HOLIDAY &&
      !attendanceData.holidayReason
    ) {
      return reply.status(400).send({
        error: "Holiday reason is required when marking as holiday",
      });
    }

    const result = await markAttendance(attendanceData, markedBy);

    return reply.status(200).send(result);
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to mark attendance",
      details: error.message,
    });
  }
};

/**
 * Mark attendance for multiple users in bulk
 * POST /api/v1/attendance/bulk-mark
 * Optimized for serverless environments to avoid timeouts
 */
export const markBulkAttendanceController = async (
  request: AuthenticatedRequest<{
    Body: MarkBulkAttendanceRequest;
  }>,
  reply: FastifyReply
) => {
  try {
    const bulkData = request.body;
    const markedBy = request.user.id;

    // Validate required fields
    if (
      !bulkData.date ||
      !bulkData.projectId ||
      !bulkData.centerId ||
      !bulkData.semesterId ||
      !bulkData.attendances ||
      !Array.isArray(bulkData.attendances)
    ) {
      return reply.status(400).send({
        error:
          "date, projectId, centerId, semesterId, and attendances array are required",
      });
    }

    // Check for reasonable batch size to prevent timeouts
    if (bulkData.attendances.length > 100) {
      return reply.status(400).send({
        error:
          "Too many attendance records. Please process in batches of 100 or fewer.",
        maxBatchSize: 100,
        receivedCount: bulkData.attendances.length,
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(bulkData.date)) {
      return reply.status(400).send({
        error: "Date must be in YYYY-MM-DD format",
      });
    }

    // Validate each attendance entry
    for (const attendance of bulkData.attendances) {
      if (
        !attendance.userId ||
        !attendance.status ||
        !attendance.roleAssignmentId
      ) {
        return reply.status(400).send({
          error:
            "Each attendance entry must have userId, status, and roleAssignmentId",
        });
      }

      if (!Object.values(AttendanceStatus).includes(attendance.status)) {
        return reply.status(400).send({
          error: `Invalid attendance status: ${attendance.status}`,
        });
      }

      if (
        attendance.status === AttendanceStatus.HOLIDAY &&
        !attendance.holidayReason
      ) {
        return reply.status(400).send({
          error: `Holiday reason is required for user ${attendance.userId} when marking as holiday`,
        });
      }
    }

    const result = await markBulkAttendance(bulkData, markedBy);

    // Return appropriate status code based on results
    if (result.errors.length > 0 && result.processedCount === 0) {
      // All failed
      return reply.status(400).send({
        success: false,
        ...result,
      });
    } else if (result.errors.length > 0) {
      // Partial success
      return reply.status(207).send({
        success: true,
        partialFailure: true,
        ...result,
      });
    } else {
      // Complete success
      return reply.status(200).send({
        success: true,
        ...result,
      });
    }
  } catch (error: any) {
    console.error("Bulk attendance controller error:", error);

    if (error.message?.includes("timeout") || error.code === "P2024") {
      return reply.status(408).send({
        error:
          "Request timed out. Please try processing fewer records at once.",
        suggestion: "Split your request into smaller batches of 20-30 records.",
        details: error.message,
      });
    }

    return reply.status(500).send({
      error: "Failed to mark bulk attendance",
      details: error.message,
    });
  }
};

/**
 * Get attendance records with filtering and pagination
 * GET /api/v1/attendance/records
 */
export const getAttendanceController = async (
  request: FastifyRequest<{
    Querystring: {
      startDate?: string;
      endDate?: string;
      userId?: string;
      projectId?: string;
      centerId?: string;
      semesterId?: string;
      status?: AttendanceStatus;
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const {
      startDate,
      endDate,
      userId,
      projectId,
      centerId,
      semesterId,
      status,
      page,
      limit,
    } = request.query;

    // Validate date formats if provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (startDate && !dateRegex.test(startDate)) {
      return reply.status(400).send({
        error: "startDate must be in YYYY-MM-DD format",
      });
    }
    if (endDate && !dateRegex.test(endDate)) {
      return reply.status(400).send({
        error: "endDate must be in YYYY-MM-DD format",
      });
    }

    // Validate status if provided
    if (status && !Object.values(AttendanceStatus).includes(status)) {
      return reply.status(400).send({
        error: "Invalid attendance status",
      });
    }

    const requestData: GetAttendanceRequest = {
      startDate,
      endDate,
      userId,
      projectId,
      centerId,
      semesterId,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    const result = await getAttendanceRecords(requestData);

    return reply.status(200).send({
      message: "Attendance records retrieved successfully",
      data: result,
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to get attendance records",
      details: error.message,
    });
  }
};

/**
 * Get attendance summary/report
 * GET /api/v1/attendance/summary
 */
export const getAttendanceSummaryController = async (
  request: FastifyRequest<{
    Querystring: {
      startDate: string;
      endDate: string;
      projectId?: string;
      centerId?: string;
      semesterId?: string;
      userIds?: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const { startDate, endDate, projectId, centerId, semesterId, userIds } =
      request.query;

    if (!startDate || !endDate) {
      return reply.status(400).send({
        error: "startDate and endDate are required",
      });
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return reply.status(400).send({
        error: "Dates must be in YYYY-MM-DD format",
      });
    }

    const requestData: GetAttendanceSummaryRequest = {
      startDate,
      endDate,
      projectId,
      centerId,
      semesterId,
      userIds: userIds ? userIds.split(",") : undefined,
    };

    const result = await getAttendanceSummary(requestData);

    return reply.status(200).send({
      message: "Attendance summary retrieved successfully",
      data: result,
    });
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to get attendance summary",
      details: error.message,
    });
  }
};

/**
 * Auto-mark attendance for a date (admin only)
 * POST /api/v1/attendance/auto-mark
 */
export const autoMarkAttendanceController = async (
  request: AuthenticatedRequest<{
    Body: {
      date: string;
      projectId: string;
      centerId: string;
      semesterId: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    // Check if user is admin
    if (request.user.role !== Role.ADMIN) {
      return reply.status(403).send({
        error: "Only admins can auto-mark attendance",
      });
    }

    const { date, projectId, centerId, semesterId } = request.body;

    if (!date || !projectId || !centerId || !semesterId) {
      return reply.status(400).send({
        error: "date, projectId, centerId, and semesterId are required",
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return reply.status(400).send({
        error: "Date must be in YYYY-MM-DD format",
      });
    }

    const result = await autoMarkAttendance(
      date,
      projectId,
      centerId,
      semesterId
    );

    return reply.status(200).send(result);
  } catch (error: any) {
    return reply.status(500).send({
      error: "Failed to auto-mark attendance",
      details: error.message,
    });
  }
};

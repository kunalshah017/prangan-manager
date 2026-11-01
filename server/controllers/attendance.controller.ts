import { FastifyRequest, FastifyReply } from "fastify";
import {
  getActiveUsersForAttendance,
  getRelevantCommittedDays,
  markBulkAttendance,
  getAttendanceRecords,
} from "../service/attendance.service.js";
import { resolveAttendanceRemindersInBackground } from "../service/reminder.service.js";
import {
  GetActiveUsersForAttendanceRequest,
  GetAttendanceRequest,
} from "../types/attendance.types.js";
import { AttendanceStatus, Role } from "../generated/prisma/index.js";
import {
  canManageUserAttendance,
  hasCompleteAttendanceScope,
} from "../security/attendance-authorization.js";
import { getActiveUserScopeAssignments } from "../service/user.service.js";
import { parseMarkBulkAttendanceRequest } from "../security/attendance-input.js";
import {
  assertStudentAttendanceDatesWithinSemester,
  StudentAttendanceSemesterDateError,
} from "../service/student-attendance.service.js";
import { isValidDateFormat } from "../utils/dateHelpers.js";

// Define AuthenticatedRequest type locally
interface AuthenticatedRequest<
  T extends { Body?: any; Querystring?: any; Params?: any } = {},
> extends FastifyRequest<T> {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

type AttendanceScope = {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
};

export const authorizeUserAttendanceScope = async (
  user: AuthenticatedRequest["user"],
  scope: Required<AttendanceScope>,
): Promise<boolean> => {
  const assignments =
    user.role === Role.ADMIN
      ? []
      : await getActiveUserScopeAssignments(user.id);

  if (typeof assignments === "string") {
    throw new Error(assignments);
  }

  return canManageUserAttendance({
    identity: user,
    assignments,
    scope,
  });
};

const isTimeoutError = (error: unknown): boolean =>
  (error instanceof Error && error.message.includes("timeout")) ||
  (typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2024");

/**
 * Get active educators and center managers for attendance marking
 * GET /api/v1/attendance/active-users
 */
export const getActiveUsersController = async (
  request: AuthenticatedRequest<{
    Querystring: {
      date: string;
      projectId: string;
      centerId: string;
      semesterId: string;
    };
  }>,
  reply: FastifyReply,
) => {
  try {
    const { date, projectId, centerId, semesterId } = request.query;

    if (!date || !projectId || !centerId || !semesterId) {
      return reply.status(400).send({
        error: "Date, projectId, centerId, and semesterId are required",
      });
    }

    // Validate date format
    if (!isValidDateFormat(date)) {
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

    const scope = { projectId, centerId, semesterId };
    if (!hasCompleteAttendanceScope(scope)) {
      return reply.status(400).send({
        error: "projectId, centerId, and semesterId must be canonical IDs",
      });
    }

    if (!(await authorizeUserAttendanceScope(request.user, scope))) {
      return reply.status(403).send({
        error: "You are not authorized to manage user attendance",
      });
    }

    const result = await getActiveUsersForAttendance(requestData);

    return reply.status(200).send({
      message: "Active users retrieved successfully",
      data: result,
    });
  } catch (error: unknown) {
    console.error("Get active users controller error:", error);
    return reply.status(500).send({
      error: "Failed to get active users",
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
    Body: unknown;
  }>,
  reply: FastifyReply,
) => {
  try {
    const parsedBulkAttendance = parseMarkBulkAttendanceRequest(request.body);
    if ("error" in parsedBulkAttendance) {
      return reply.status(400).send({ error: parsedBulkAttendance.error });
    }

    const bulkData = parsedBulkAttendance.data;
    const markedBy = request.user.id;

    // Check for reasonable batch size to prevent timeouts
    if (bulkData.attendances.length > 100) {
      return reply.status(400).send({
        error:
          "Too many attendance records. Please process in batches of 100 or fewer.",
        maxBatchSize: 100,
        receivedCount: bulkData.attendances.length,
      });
    }

    const scope = {
      projectId: bulkData.projectId,
      centerId: bulkData.centerId,
      semesterId: bulkData.semesterId,
    };
    if (!hasCompleteAttendanceScope(scope)) {
      return reply.status(400).send({
        error: "projectId, centerId, and semesterId must be canonical IDs",
      });
    }

    if (!(await authorizeUserAttendanceScope(request.user, scope))) {
      return reply.status(403).send({
        error: "You are not authorized to manage user attendance",
      });
    }

    // Attendance drives pay, so only class days inside the semester count.
    if (getRelevantCommittedDays(bulkData.date).length === 0) {
      return reply.status(400).send({
        error: "Attendance can only be marked on a Saturday or Sunday.",
      });
    }
    try {
      await assertStudentAttendanceDatesWithinSemester(bulkData.semesterId, [
        bulkData.date,
      ]);
    } catch (error) {
      if (error instanceof StudentAttendanceSemesterDateError) {
        const publicMessage = error.message;
        return reply.status(400).send({ error: publicMessage });
      }
      throw error;
    }

    const result = await markBulkAttendance(bulkData, markedBy);
    if (result.processedCount > 0) {
      resolveAttendanceRemindersInBackground(bulkData.semesterId, bulkData.date);
    }

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
  } catch (error: unknown) {
    console.error("Bulk attendance controller error:", error);

    if (isTimeoutError(error)) {
      return reply.status(408).send({
        error:
          "Request timed out. Please try processing fewer records at once.",
        suggestion: "Split your request into smaller batches of 20-30 records.",
      });
    }

    return reply.status(500).send({
      error: "Failed to mark bulk attendance",
    });
  }
};

/**
 * Get attendance records with filtering and pagination
 * GET /api/v1/attendance/records
 */
export const getAttendanceController = async (
  request: AuthenticatedRequest<{
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
  reply: FastifyReply,
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
    if (startDate && !isValidDateFormat(startDate)) {
      return reply.status(400).send({
        error: "startDate must be in YYYY-MM-DD format",
      });
    }
    if (endDate && !isValidDateFormat(endDate)) {
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

    const scope = { projectId, centerId, semesterId };
    const isAdmin = request.user.role === Role.ADMIN;
    // Anyone may read their own attendance (their profile shows it). Every
    // other non-admin read still needs a complete scope the caller manages.
    const isOwnRecords = Boolean(userId) && userId === request.user.id;
    if (!isAdmin && !isOwnRecords) {
      if (!hasCompleteAttendanceScope(scope)) {
        return reply.status(403).send({
          error: "You are not authorized to manage user attendance",
        });
      }

      if (!(await authorizeUserAttendanceScope(request.user, scope))) {
        return reply.status(403).send({
          error: "You are not authorized to manage user attendance",
        });
      }
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
      // A volunteer's own history covers only the roles they hold now; ended
      // roles and their attendance are admin-only.
      activeAssignmentsOnly: !isAdmin && isOwnRecords,
    };

    const result = await getAttendanceRecords(requestData);

    return reply.status(200).send({
      message: "Attendance records retrieved successfully",
      data: result,
    });
  } catch (error: unknown) {
    console.error("Get attendance controller error:", error);
    return reply.status(500).send({
      error: "Failed to get attendance records",
    });
  }
};


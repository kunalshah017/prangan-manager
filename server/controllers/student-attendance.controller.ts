import { FastifyRequest, FastifyReply } from "fastify";
import {
  StudentAttendanceSemesterDateError,
  StudentAttendanceService,
  StudentAttendanceWeekendDateError,
} from "../service/student-attendance.service.js";
import { StudentAttendanceFilter } from "../types/student-attendance.types.js";
import { Role, SubRole } from "../generated/prisma/index.js";
import {
  canManageStudentAttendance,
  hasCompleteAttendanceScope,
} from "../security/attendance-authorization.js";
import {
  parseBulkStudentAttendance,
  parseStudentAttendanceCreate,
  parseStudentAttendanceUpdate,
} from "../security/student-attendance-update.js";
import { getActiveUserScopeAssignments } from "../service/user.service.js";
import { isValidDateFormat } from "../utils/dateHelpers.js";

type StudentAttendanceScope = {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
};

const studentAttendanceAuthorizationMessage =
  "You are not authorized to manage student attendance";

const sendStudentAttendanceError = (
  reply: FastifyReply,
  error: unknown,
  logMessage: string,
  fallbackMessage: string,
) => {
  if (
    error instanceof StudentAttendanceSemesterDateError ||
    error instanceof StudentAttendanceWeekendDateError
  ) {
    const publicMessage = error.message;
    return reply.status(400).send({ message: publicMessage });
  }

  console.error(logMessage, error);
  return reply.status(500).send({ message: fallbackMessage });
};

const invalidStudentAttendanceFilterDateMessage = (
  filter: Pick<StudentAttendanceFilter, "date" | "dateFrom" | "dateTo">,
): string | null => {
  if (filter.date && !isValidDateFormat(filter.date)) {
    return "Date must be in YYYY-MM-DD format";
  }

  if (
    (filter.dateFrom && !isValidDateFormat(filter.dateFrom)) ||
    (filter.dateTo && !isValidDateFormat(filter.dateTo))
  ) {
    return "Dates must be in YYYY-MM-DD format";
  }

  return null;
};

const resolveStudentAttendanceAccess = async (
  user: NonNullable<FastifyRequest["user"]>,
  scope: Required<StudentAttendanceScope>,
): Promise<{ allowedSemesterLevelIds?: string[] } | null> => {
  if (user.role === Role.ADMIN) return {};

  const assignments = await getActiveUserScopeAssignments(user.id);
  if (typeof assignments === "string") throw new Error(assignments);

  if (!canManageStudentAttendance({ identity: user, assignments, scope })) {
    return null;
  }

  const exactAssignments = assignments.filter(
    (assignment) =>
      assignment.isActive &&
      assignment.projectId === scope.projectId &&
      assignment.centerId === scope.centerId &&
      assignment.semesterId === scope.semesterId,
  );

  if (
    exactAssignments.some(
      (assignment) => assignment.subRole === SubRole.CENTER_MANAGER,
    )
  ) {
    return {};
  }

  const allowedSemesterLevelIds = Array.from(
    new Set(
      exactAssignments
        .filter(
          (
            assignment,
          ): assignment is typeof assignment & {
            semesterLevelId: string;
          } =>
            assignment.subRole === SubRole.EDUCATOR &&
            assignment.semesterLevelId !== null,
        )
        .map((assignment) => assignment.semesterLevelId),
    ),
  );

  return allowedSemesterLevelIds.length > 0
    ? { allowedSemesterLevelIds }
    : null;
};

const requireStudentAttendanceAccess = async (
  request: FastifyRequest,
  reply: FastifyReply,
  scope: StudentAttendanceScope,
  invalidScopeStatus: 400 | 403,
) => {
  if (!hasCompleteAttendanceScope(scope)) {
    return reply.status(invalidScopeStatus).send({
      message:
        invalidScopeStatus === 400
          ? "projectId, centerId, and semesterId must be canonical IDs"
          : studentAttendanceAuthorizationMessage,
    });
  }

  const access = await resolveStudentAttendanceAccess(request.user!, scope);
  if (!access) {
    return reply
      .status(403)
      .send({ message: studentAttendanceAuthorizationMessage });
  }

  return access;
};

// Mark attendance for a single student
export const markStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const parsedAttendance = parseStudentAttendanceCreate(request.body);
    if ("error" in parsedAttendance) {
      return reply.status(400).send({ message: parsedAttendance.error });
    }
    const attendanceData = parsedAttendance.data;

    const access = await requireStudentAttendanceAccess(
      request,
      reply,
      {
        projectId: attendanceData.projectId,
        centerId: attendanceData.centerId,
        semesterId: attendanceData.semesterId,
      },
      400,
    );
    if (!access || "sent" in access) return;

    const attendance = await StudentAttendanceService.markAttendance(
      attendanceData,
      userId,
      access.allowedSemesterLevelIds,
    );

    return reply.status(200).send({
      message: "Student attendance marked successfully",
      attendance,
    });
  } catch (error: any) {
    return sendStudentAttendanceError(
      reply,
      error,
      "Error marking student attendance:",
      "Failed to mark student attendance",
    );
  }
};

// Mark attendance for multiple students in bulk
// Optimized for serverless environments to avoid timeouts
export const markBulkStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const parsedBulkAttendance = parseBulkStudentAttendance(request.body);
    if ("error" in parsedBulkAttendance) {
      return reply.status(400).send({ message: parsedBulkAttendance.error });
    }
    const bulkData = parsedBulkAttendance.data;

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

    const access = await requireStudentAttendanceAccess(
      request,
      reply,
      {
        projectId: bulkData.projectId,
        centerId: bulkData.centerId,
        semesterId: bulkData.semesterId,
      },
      400,
    );
    if (!access || "sent" in access) return;

    const result = await StudentAttendanceService.markBulkAttendance(
      bulkData,
      userId,
      access.allowedSemesterLevelIds,
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
          bulkData.studentAttendances.length * 0.02,
        )} seconds`,
        note: "Optimized for typical class sizes (~100 students)",
        performance: "Single transaction for reliable processing",
      },
    });
  } catch (error: any) {
    return sendStudentAttendanceError(
      reply,
      error,
      "Error marking bulk student attendance:",
      "Failed to mark bulk student attendance",
    );
  }
};

// Get attendance records with filters
export const getStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const filter = request.query as StudentAttendanceFilter;
    const dateValidationError =
      invalidStudentAttendanceFilterDateMessage(filter);
    if (dateValidationError) {
      return reply.status(400).send({ message: dateValidationError });
    }
    const isAdmin = request.user?.role === Role.ADMIN;
    let allowedSemesterLevelIds: string[] | undefined;

    if (!isAdmin) {
      const access = await requireStudentAttendanceAccess(
        request,
        reply,
        filter,
        403,
      );
      if (!access || "sent" in access) return;
      allowedSemesterLevelIds = access.allowedSemesterLevelIds;
    }

    const attendance = await StudentAttendanceService.getAttendance(
      filter,
      allowedSemesterLevelIds,
    );

    return reply.status(200).send({
      message: "Student attendance retrieved successfully",
      attendance,
      count: attendance.length,
    });
  } catch (error: any) {
    return sendStudentAttendanceError(
      reply,
      error,
      "Error getting student attendance:",
      "Failed to get student attendance",
    );
  }
};

// Get attendance for a specific student
export const getStudentAttendanceById = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { studentId } = request.params as { studentId: string };
    const filter = request.query as Omit<StudentAttendanceFilter, "studentId">;
    const dateValidationError =
      invalidStudentAttendanceFilterDateMessage(filter);
    if (dateValidationError) {
      return reply.status(400).send({ message: dateValidationError });
    }
    const isAdmin = request.user?.role === Role.ADMIN;
    let allowedSemesterLevelIds: string[] | undefined;

    if (!isAdmin) {
      const access = await requireStudentAttendanceAccess(
        request,
        reply,
        filter,
        403,
      );
      if (!access || "sent" in access) return;
      allowedSemesterLevelIds = access.allowedSemesterLevelIds;
    }

    const attendance = await StudentAttendanceService.getStudentAttendance(
      studentId,
      filter,
      allowedSemesterLevelIds,
    );

    return reply.status(200).send({
      message: "Student attendance retrieved successfully",
      attendance,
      count: attendance.length,
    });
  } catch (error: any) {
    return sendStudentAttendanceError(
      reply,
      error,
      "Error getting student attendance by ID:",
      "Failed to get student attendance",
    );
  }
};

// Get attendance statistics for a student
export const getStudentAttendanceStats = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { studentId } = request.params as { studentId: string };
    const { projectId, semesterId, centerId, dateFrom, dateTo } =
      request.query as {
        projectId?: string;
        semesterId?: string;
        centerId?: string;
        dateFrom?: string;
        dateTo?: string;
      };
    const dateValidationError = invalidStudentAttendanceFilterDateMessage({
      dateFrom,
      dateTo,
    });
    if (dateValidationError) {
      return reply.status(400).send({ message: dateValidationError });
    }
    const isAdmin = request.user?.role === Role.ADMIN;
    let allowedSemesterLevelIds: string[] | undefined;

    if (!isAdmin) {
      const access = await requireStudentAttendanceAccess(
        request,
        reply,
        {
          projectId,
          centerId,
          semesterId,
        },
        403,
      );
      if (!access || "sent" in access) return;
      allowedSemesterLevelIds = access.allowedSemesterLevelIds;
    }

    const stats = await StudentAttendanceService.getStudentAttendanceStats(
      studentId,
      projectId,
      semesterId,
      centerId,
      dateFrom,
      dateTo,
      allowedSemesterLevelIds,
    );

    return reply.status(200).send({
      message: "Student attendance statistics retrieved successfully",
      stats,
    });
  } catch (error: any) {
    return sendStudentAttendanceError(
      reply,
      error,
      "Error getting student attendance stats:",
      "Failed to get student attendance statistics",
    );
  }
};

// Update attendance record
export const updateStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const { attendanceId } = request.params as { attendanceId: string };
    const parsedUpdate = parseStudentAttendanceUpdate(request.body);
    if ("error" in parsedUpdate) {
      return reply.status(400).send({ message: parsedUpdate.error });
    }

    const scope =
      await StudentAttendanceService.getAttendanceScope(attendanceId);
    if (!scope) {
      return reply
        .status(403)
        .send({ message: studentAttendanceAuthorizationMessage });
    }

    const access = await requireStudentAttendanceAccess(
      request,
      reply,
      scope,
      403,
    );
    if (!access || "sent" in access) return;
    if (
      access.allowedSemesterLevelIds &&
      !access.allowedSemesterLevelIds.includes(scope.enrollment.semesterLevelId)
    ) {
      return reply
        .status(403)
        .send({ message: studentAttendanceAuthorizationMessage });
    }

    const attendance = await StudentAttendanceService.updateAttendance(
      attendanceId,
      parsedUpdate.data,
      userId,
    );

    return reply.status(200).send({
      message: "Student attendance updated successfully",
      attendance,
    });
  } catch (error: any) {
    console.error("Error updating student attendance:", error);
    return reply.status(500).send({
      message: "Failed to update student attendance",
    });
  }
};

// Delete attendance record
export const deleteStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const { attendanceId } = request.params as { attendanceId: string };
    const scope =
      await StudentAttendanceService.getAttendanceScope(attendanceId);
    if (!scope) {
      return reply
        .status(403)
        .send({ message: studentAttendanceAuthorizationMessage });
    }

    const access = await requireStudentAttendanceAccess(
      request,
      reply,
      scope,
      403,
    );
    if (!access || "sent" in access) return;
    if (
      access.allowedSemesterLevelIds &&
      !access.allowedSemesterLevelIds.includes(scope.enrollment.semesterLevelId)
    ) {
      return reply
        .status(403)
        .send({ message: studentAttendanceAuthorizationMessage });
    }

    await StudentAttendanceService.deleteAttendance(attendanceId);

    return reply.status(200).send({
      message: "Student attendance deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting student attendance:", error);
    return reply.status(500).send({
      message: "Failed to delete student attendance",
    });
  }
};

// Get attendance for a specific date and center/semester
export const getAttendanceByDate = async (
  request: FastifyRequest,
  reply: FastifyReply,
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
    if (!isValidDateFormat(date)) {
      return reply.status(400).send({
        message: "Date must be in YYYY-MM-DD format",
      });
    }

    const isAdmin = request.user?.role === Role.ADMIN;
    let allowedSemesterLevelIds: string[] | undefined;
    if (!isAdmin) {
      const access = await requireStudentAttendanceAccess(
        request,
        reply,
        {
          projectId,
          centerId,
          semesterId,
        },
        403,
      );
      if (!access || "sent" in access) return;
      allowedSemesterLevelIds = access.allowedSemesterLevelIds;
    }

    const attendance = await StudentAttendanceService.getAttendanceByDate(
      date,
      centerId,
      semesterId,
      projectId,
      allowedSemesterLevelIds,
    );

    return reply.status(200).send({
      message: "Attendance by date retrieved successfully",
      attendance,
      count: attendance.length,
    });
  } catch (error: any) {
    return sendStudentAttendanceError(
      reply,
      error,
      "Error getting attendance by date:",
      "Failed to get attendance by date",
    );
  }
};

// Get students without attendance for a specific date
export const getStudentsWithoutAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply,
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
    if (!isValidDateFormat(date)) {
      return reply.status(400).send({
        message: "Date must be in YYYY-MM-DD format",
      });
    }

    const isAdmin = request.user?.role === Role.ADMIN;
    let allowedSemesterLevelIds: string[] | undefined;
    if (!isAdmin) {
      const access = await requireStudentAttendanceAccess(
        request,
        reply,
        {
          projectId,
          centerId,
          semesterId,
        },
        403,
      );
      if (!access || "sent" in access) return;
      allowedSemesterLevelIds = access.allowedSemesterLevelIds;
    }

    const students =
      await StudentAttendanceService.getStudentsWithoutAttendance(
        date,
        centerId,
        semesterId,
        projectId,
        allowedSemesterLevelIds,
      );

    return reply.status(200).send({
      message: "Students without attendance retrieved successfully",
      students,
      count: students.length,
    });
  } catch (error: any) {
    return sendStudentAttendanceError(
      reply,
      error,
      "Error getting students without attendance:",
      "Failed to get students without attendance",
    );
  }
};

const parsePositiveStudentCount = (value: unknown): number | null => {
  if (typeof value !== "string" || !/^(?:[1-9]\d*)$/.test(value)) {
    return null;
  }

  const count = Number(value);
  return Number.isSafeInteger(count) && count > 0 ? count : null;
};

// Get processing estimates for bulk attendance operation
export const getBulkAttendanceEstimate = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { studentCount } = request.query as { studentCount?: unknown };

    const count = parsePositiveStudentCount(studentCount);
    if (count === null) {
      return reply.status(400).send({
        message: "Valid student count is required",
      });
    }

    const batchStrategy = "SINGLE_PRISMA_TRANSACTION";
    const estimatedTime = Math.ceil(Math.max(count * 0.02, 1));
    const maxRecommended = 150;

    return reply.status(200).send({
      message: "Processing estimate calculated successfully",
      estimate: {
        studentCount: count,
        batchStrategy,
        estimatedProcessingTime: `${estimatedTime} seconds`,
        maxRecommendedBatchSize: maxRecommended,
        processingInfo: {
          optimizationType: "SINGLE_TRANSACTION",
          bulkProcessing: true,
          timeoutSafeguard: "8 seconds",
          explanation:
            "Valid attendance records are processed in one Prisma transaction.",
          performance:
            "The service applies an 8-second elapsed-time safeguard before transaction processing; actual duration varies with the request and database.",
        },
        recommendations:
          count > maxRecommended
            ? [
                `Consider splitting into ${Math.ceil(
                  count / maxRecommended,
                )} smaller requests`,
                "Process different class levels or centers separately",
                "This endpoint is a planning estimate, not a completion guarantee",
              ]
            : [
                "This endpoint provides a planning estimate, not a completion guarantee",
                "Valid records are committed together in one Prisma transaction",
                "The service uses an 8-second elapsed-time safeguard before transaction processing",
              ],
      },
    });
  } catch (error: any) {
    console.error("Error calculating bulk attendance estimate:", error);
    return reply.status(500).send({
      message: "Failed to calculate processing estimate",
    });
  }
};

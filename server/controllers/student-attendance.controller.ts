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
import { parseBulkStudentAttendance } from "../security/student-attendance-update.js";
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


import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/handler.js";
import {
  CreateSemester,
  GetSemestersByCenterId,
  updateSemester,
  deleteSemester,
  getSemesterById,
  getSemesterScope,
} from "../service/semester.service.js";
import {
  parseCreateSemesterRequest,
  parseUpdateSemesterRequest,
} from "../security/semester-input.js";
import { AcademicLevelServiceError } from "../service/academic-level.service.js";
import {
  getActiveUserScopeAssignments,
  getUserAccessibleSemesters,
} from "../service/user.service.js";
import { isAdmin } from "../security/authorization.js";
import { canReadContext } from "../security/student-authorization.js";

export const createSemester = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user; // Assuming user is set by authChecker middleware
    if (!user || user.role !== "ADMIN") {
      return errorHandle("Unauthorized: Admin access required.", reply, 403);
    }

    const parsed = parseCreateSemesterRequest(request.body);
    if ("error" in parsed) return errorHandle(parsed.error, reply, 400);

    try {
      const semester = await CreateSemester(parsed.data, user.id);
      return successHandle(
        { message: "Semester created successfully", semester },
        reply,
        201,
      );
    } catch (error) {
      if (error instanceof AcademicLevelServiceError) {
        return errorHandle(error.message, reply, error.statusCode);
      }
      throw error;
    }
  },
);

export const getSemestersByCenterId = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const { centerId } = request.params as { centerId: string };

    if (!user) {
      return errorHandle("User not found in request.", reply, 401);
    }

    if (!centerId) {
      return errorHandle("Center ID is required.", reply, 400);
    }

    // Use role-based access to get semesters by center
    const semesters = await getUserAccessibleSemesters(
      user.id,
      user.role,
      centerId,
    );

    if (typeof semesters === "string") {
      return errorHandle(semesters, reply, 500);
    }

    return successHandle({ semesters }, reply, 200);
  },
);

export const listSemesters = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (!user) {
      return errorHandle("User not found in request.", reply, 401);
    }

    // Use role-based access to get all accessible semesters
    const semesters = await getUserAccessibleSemesters(user.id, user.role);

    if (typeof semesters === "string") {
      return errorHandle(semesters, reply, 500);
    }

    return successHandle({ semesters }, reply, 200);
  },
);

export const getSemesterByIdController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("User not found in request.", reply, 401);
    }

    const { id } = request.params as { id: string };

    if (!id) {
      return errorHandle("Semester ID is required.", reply, 400);
    }

    const scope = await getSemesterScope(id);
    if (!scope) {
      return errorHandle("Semester not found.", reply, 404);
    }

    const assignments = isAdmin(user)
      ? []
      : await getActiveUserScopeAssignments(user.id);
    if (typeof assignments === "string") {
      return errorHandle("Unable to verify semester access.", reply, 500);
    }

    if (!canReadContext({ identity: user, assignments, scope })) {
      return errorHandle(
        "You are not authorized to view this semester.",
        reply,
        403,
      );
    }

    const semester = await getSemesterById(id);

    if (typeof semester === "string") {
      return errorHandle("Unable to retrieve semester.", reply, 500);
    }

    if (!semester) {
      return errorHandle("Semester not found.", reply, 404);
    }

    return successHandle({ semester }, reply, 200);
  },
);

export const updateSemesterController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (user?.role !== "ADMIN") {
      return errorHandle("Only admins can update semesters.", reply, 403);
    }

    const { id } = request.params as { id: string };

    if (!id) {
      return errorHandle("Semester ID is required.", reply, 400);
    }

    const parsed = parseUpdateSemesterRequest(request.body);
    if ("error" in parsed) return errorHandle(parsed.error, reply, 400);

    try {
      const semester = await updateSemester(id, parsed.data);
      return successHandle(
        { message: "Semester updated successfully", semester },
        reply,
        200,
      );
    } catch (error) {
      if (error instanceof AcademicLevelServiceError) {
        return errorHandle(error.message, reply, error.statusCode);
      }
      throw error;
    }
  },
);

export const deleteSemesterController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (user?.role !== "ADMIN") {
      return errorHandle("Only admins can delete semesters.", reply, 403);
    }

    const { id } = request.params as { id: string };

    if (!id) {
      return errorHandle("Semester ID is required.", reply, 400);
    }

    const result = await deleteSemester(id);

    if (typeof result === "string") {
      if (result === "Cannot delete semester while enrollments exist") {
        return errorHandle(result, reply, 409);
      }

      return errorHandle("Internal Server Error", reply, 500);
    }

    return successHandle(
      { message: "Semester deleted successfully" },
      reply,
      200,
    );
  },
);

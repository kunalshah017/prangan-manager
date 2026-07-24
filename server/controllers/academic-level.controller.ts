import type { FastifyReply, FastifyRequest } from "fastify";
import { Prisma, Role } from "../generated/prisma/index.js";
import {
  parseCreateAcademicLevelRequest,
  parseReorderAcademicLevelsRequest,
  parseReplaceSemesterLevelsRequest,
  parseUpdateAcademicLevelRequest,
} from "../security/academic-level-input.js";
import {
  AcademicLevelServiceError,
  createAcademicLevel,
  listAcademicLevels,
  reorderAcademicLevels,
  updateAcademicLevel,
} from "../service/academic-level.service.js";
import {
  listSemesterLevels,
  replaceSemesterLevels,
} from "../service/semester-level.service.js";
import { asyncHandle, errorHandle, successHandle } from "../utils/handler.js";
import { getSemesterScope } from "../service/semester.service.js";
import { getActiveUserScopeAssignments } from "../service/user.service.js";
import { canReadContext } from "../security/student-authorization.js";
import { isAdmin } from "../security/authorization.js";

const requireAuthenticated = (request: FastifyRequest, reply: FastifyReply) => {
  if (request.user) return true;
  errorHandle("Unauthorized", reply, 401);
  return false;
};

const requireAdmin = (request: FastifyRequest, reply: FastifyReply) => {
  if (request.user?.role === Role.ADMIN) return true;
  errorHandle("Admin access required", reply, 403);
  return false;
};

const sendServiceError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof AcademicLevelServiceError) {
    return errorHandle(error.message, reply, error.statusCode);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return errorHandle(
        "Academic level code or order already exists",
        reply,
        409,
      );
    if (error.code === "P2025")
      return errorHandle("Academic level not found", reply, 404);
  }
  throw error;
};

export const listAcademicLevelsController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAuthenticated(request, reply)) return;
    const query = request.query as Record<string, unknown>;
    if (
      Object.keys(query).some((key) => key !== "includeArchived") ||
      (query.includeArchived !== undefined &&
        query.includeArchived !== "true" &&
        query.includeArchived !== "false")
    ) {
      return errorHandle("Invalid academic level query", reply, 400);
    }
    const levels = await listAcademicLevels(query.includeArchived === "true");
    return successHandle({ levels }, reply, 200);
  },
);

export const createAcademicLevelController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;
    const parsed = parseCreateAcademicLevelRequest(request.body);
    if ("error" in parsed) return errorHandle(parsed.error, reply, 400);
    try {
      const level = await createAcademicLevel(parsed.data);
      return successHandle({ level }, reply, 201);
    } catch (error) {
      return sendServiceError(error, reply);
    }
  },
);

export const updateAcademicLevelController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;
    const { id } = request.params as { id?: string };
    if (!id) return errorHandle("Academic level ID is required", reply, 400);
    const parsed = parseUpdateAcademicLevelRequest(request.body);
    if ("error" in parsed) return errorHandle(parsed.error, reply, 400);
    try {
      const level = await updateAcademicLevel(id, parsed.data);
      return successHandle({ level }, reply, 200);
    } catch (error) {
      return sendServiceError(error, reply);
    }
  },
);

export const reorderAcademicLevelsController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;
    const parsed = parseReorderAcademicLevelsRequest(request.body);
    if ("error" in parsed) return errorHandle(parsed.error, reply, 400);
    try {
      const levels = await reorderAcademicLevels(parsed.data.orderedIds);
      return successHandle({ levels }, reply, 200);
    } catch (error) {
      return sendServiceError(error, reply);
    }
  },
);

export const listSemesterLevelsController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAuthenticated(request, reply)) return;
    const { id } = request.params as { id?: string };
    if (!id) return errorHandle("Semester ID is required", reply, 400);

    const scope = await getSemesterScope(id);
    if (!scope) return errorHandle("Semester not found", reply, 404);
    const assignments = isAdmin(request.user!)
      ? []
      : await getActiveUserScopeAssignments(request.user!.id);
    if (typeof assignments === "string")
      return errorHandle("Unable to verify semester access", reply, 500);
    if (!canReadContext({ identity: request.user!, assignments, scope }))
      return errorHandle(
        "You are not authorized to view this semester",
        reply,
        403,
      );

    const query = request.query as Record<string, unknown>;
    if (
      Object.keys(query).some((key) => key !== "includeInactive") ||
      (query.includeInactive !== undefined &&
        query.includeInactive !== "true" &&
        query.includeInactive !== "false")
    ) {
      return errorHandle("Invalid semester level query", reply, 400);
    }
    const levels = await listSemesterLevels(
      id,
      query.includeInactive === "true",
    );
    return successHandle({ levels }, reply, 200);
  },
);

export const replaceSemesterLevelsController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;
    const { id } = request.params as { id?: string };
    if (!id) return errorHandle("Semester ID is required", reply, 400);
    const parsed = parseReplaceSemesterLevelsRequest(request.body);
    if ("error" in parsed) {
      const isEmptySelection =
        typeof request.body === "object" &&
        request.body !== null &&
        "academicLevelIds" in request.body &&
        Array.isArray(request.body.academicLevelIds) &&
        request.body.academicLevelIds.length === 0;
      return errorHandle(parsed.error, reply, isEmptySelection ? 422 : 400);
    }
    try {
      const levels = await replaceSemesterLevels(
        id,
        parsed.data.academicLevelIds,
      );
      return successHandle({ levels }, reply, 200);
    } catch (error) {
      return sendServiceError(error, reply);
    }
  },
);

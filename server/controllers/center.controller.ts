import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/handler.js";
import type { Center } from "../types/center.types.js";
import {
  CreateCenter,
  GetCenters,
  GetCentersByProjectId,
  updateCenter,
  deleteCenter,
  getCenterById,
  getCenterScope,
} from "../service/center.service.js";
import {
  getActiveUserScopeAssignments,
  getUserAccessibleCenters,
} from "../service/user.service.js";
import { isAdmin } from "../security/authorization.js";

const canAccessCenterResource = (
  user: NonNullable<FastifyRequest["user"]>,
  assignments: Awaited<ReturnType<typeof getActiveUserScopeAssignments>>,
  scope: { projectId: string; centerId: string },
) =>
  isAdmin(user) ||
  (Array.isArray(assignments) &&
    assignments.some(
      (assignment) =>
        assignment.isActive &&
        assignment.projectId === scope.projectId &&
        assignment.centerId === scope.centerId,
    ));

export const createCenter = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user; // Assuming user is set in the request by authentication middleware

    if (user?.role !== "ADMIN") {
      return errorHandle("Only admins can create centers.", reply, 403);
    }

    const data = request.body as Partial<Center>;

    if (!data.name) {
      return errorHandle("Center name is required.", reply, 400);
    }

    const center = await CreateCenter(data);

    if (typeof center === "string") {
      return errorHandle(center, reply, 500);
    }

    return successHandle(
      { message: "Center created successfully", center },
      reply,
      201,
    );
  },
);

export const listCenters = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (!user) {
      return errorHandle("User not found in request.", reply, 401);
    }

    // Use role-based access to get centers
    const centers = await getUserAccessibleCenters(user.id, user.role);

    if (typeof centers === "string") {
      return errorHandle(centers, reply, 500);
    }

    return successHandle({ centers }, reply, 200);
  },
);

export const getCentersByProjectId = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const { projectId } = request.params as { projectId: string };

    if (!user) {
      return errorHandle("User not found in request.", reply, 401);
    }

    if (!projectId) {
      return errorHandle("Project ID is required.", reply, 400);
    }

    // Use role-based access to get centers by project
    const centers = await getUserAccessibleCenters(
      user.id,
      user.role,
      projectId,
    );

    if (typeof centers === "string") {
      return errorHandle(centers, reply, 500);
    }

    return successHandle({ centers }, reply, 200);
  },
);

export const getCenterByIdController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("User not found in request.", reply, 401);
    }

    const { id } = request.params as { id: string };

    if (!id) {
      return errorHandle("Center ID is required.", reply, 400);
    }

    const scope = await getCenterScope(id);
    if (!scope) {
      return errorHandle("Center not found.", reply, 404);
    }

    const assignments = isAdmin(user)
      ? []
      : await getActiveUserScopeAssignments(user.id);
    if (typeof assignments === "string") {
      return errorHandle("Unable to verify center access.", reply, 500);
    }

    if (!canAccessCenterResource(user, assignments, scope)) {
      return errorHandle(
        "You are not authorized to view this center.",
        reply,
        403,
      );
    }

    const center = await getCenterById(id);

    if (typeof center === "string") {
      return errorHandle("Unable to retrieve center.", reply, 500);
    }

    if (!center) {
      return errorHandle("Center not found.", reply, 404);
    }

    return successHandle({ center }, reply, 200);
  },
);

export const updateCenterController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (user?.role !== "ADMIN") {
      return errorHandle("Only admins can update centers.", reply, 403);
    }

    const { id } = request.params as { id: string };
    const data = request.body as Partial<Center>;

    if (!id) {
      return errorHandle("Center ID is required.", reply, 400);
    }

    const center = await updateCenter(id, data);

    if (typeof center === "string") {
      return errorHandle(center, reply, 500);
    }

    return successHandle(
      { message: "Center updated successfully", center },
      reply,
      200,
    );
  },
);

export const deleteCenterController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (user?.role !== "ADMIN") {
      return errorHandle("Only admins can delete centers.", reply, 403);
    }

    const { id } = request.params as { id: string };

    if (!id) {
      return errorHandle("Center ID is required.", reply, 400);
    }

    const result = await deleteCenter(id);

    if (typeof result === "string") {
      if (result === "Cannot delete center while enrollments exist") {
        return errorHandle(result, reply, 409);
      }

      return errorHandle("Internal Server Error", reply, 500);
    }

    return successHandle(
      { message: "Center deleted successfully" },
      reply,
      200,
    );
  },
);

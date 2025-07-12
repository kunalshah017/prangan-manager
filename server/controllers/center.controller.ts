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
} from "../service/center.service.js";

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
      201
    );
  }
);

export const listCenters = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const centers = await GetCenters();

    if (typeof centers === "string") {
      return errorHandle(centers, reply, 500);
    }

    return successHandle({ centers }, reply, 200);
  }
);

export const getCentersByProjectId = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { projectId } = request.params as { projectId: string };

    if (!projectId) {
      return errorHandle("Project ID is required.", reply, 400);
    }

    const centers = await GetCentersByProjectId(projectId);

    if (typeof centers === "string") {
      return errorHandle(centers, reply, 500);
    }

    return successHandle({ centers }, reply, 200);
  }
);

export const getCenterByIdController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    if (!id) {
      return errorHandle("Center ID is required.", reply, 400);
    }

    const center = await getCenterById(id);

    if (typeof center === "string") {
      return errorHandle(center, reply, 500);
    }

    return successHandle({ center }, reply, 200);
  }
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
      200
    );
  }
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
      return errorHandle(result, reply, 500);
    }

    return successHandle(
      { message: "Center deleted successfully" },
      reply,
      200
    );
  }
);

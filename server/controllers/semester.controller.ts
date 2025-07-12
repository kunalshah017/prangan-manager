import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/handler.js";
import type { semester } from "../types/semester.type.js";
import {
  CreateSemester,
  GetSemestersByCenterId,
  updateSemester,
  deleteSemester,
  getSemesterById,
} from "../service/semester.service.js";

export const createSemester = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user; // Assuming user is set by authChecker middleware
    if (!user || user.role !== "ADMIN") {
      return errorHandle("Unauthorized: Admin access required.", reply, 403);
    }

    const data: Partial<semester> = request.body as Partial<semester>;

    if (!data.name || !data.startDate || !data.endDate || !data.centerId) {
      return errorHandle(
        "Name, start date, end date, and center ID are required.",
        reply,
        400
      );
    }

    // Assuming you have a service function to create a semester
    const semester = await CreateSemester(data);

    if (typeof semester === "string") {
      return errorHandle(semester, reply, 500);
    }

    return successHandle(
      { message: "Semester created successfully", semester },
      reply,
      201
    );
  }
);

export const getSemestersByCenterId = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { centerId } = request.params as { centerId: string };

    if (!centerId) {
      return errorHandle("Center ID is required.", reply, 400);
    }

    const semesters = await GetSemestersByCenterId(centerId);

    if (typeof semesters === "string") {
      return errorHandle(semesters, reply, 500);
    }

    return successHandle({ semesters }, reply, 200);
  }
);

export const getSemesterByIdController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    if (!id) {
      return errorHandle("Semester ID is required.", reply, 400);
    }

    const semester = await getSemesterById(id);

    if (typeof semester === "string") {
      return errorHandle(semester, reply, 500);
    }

    return successHandle({ semester }, reply, 200);
  }
);

export const updateSemesterController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (user?.role !== "ADMIN") {
      return errorHandle("Only admins can update semesters.", reply, 403);
    }

    const { id } = request.params as { id: string };
    const data = request.body as Partial<semester>;

    if (!id) {
      return errorHandle("Semester ID is required.", reply, 400);
    }

    const semester = await updateSemester(id, data);

    if (typeof semester === "string") {
      return errorHandle(semester, reply, 500);
    }

    return successHandle(
      { message: "Semester updated successfully", semester },
      reply,
      200
    );
  }
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
      return errorHandle(result, reply, 500);
    }

    return successHandle(
      { message: "Semester deleted successfully" },
      reply,
      200
    );
  }
);

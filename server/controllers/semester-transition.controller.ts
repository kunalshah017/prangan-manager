import type { FastifyReply, FastifyRequest } from "fastify";
import { Role } from "../generated/prisma/index.js";
import {
  parseStaffTransitionPlan,
  parseStudentTransitionPlan,
} from "../security/semester-transition-input.js";
import {
  activateSemesterTransition,
  getCenterSemesterTransitionSummaries,
  getSemesterTransition,
  saveStaffTransitionPlan,
  saveStudentTransitionPlan,
  SemesterTransitionError,
} from "../service/semester-transition.service.js";
import { asyncHandle, errorHandle, successHandle } from "../utils/handler.js";

const requireAdmin = (request: FastifyRequest, reply: FastifyReply) => {
  const admin = request.user;
  if (!admin || admin.role !== Role.ADMIN) {
    errorHandle("Only administrators can manage semester setup.", reply, 403);
    return null;
  }
  return admin;
};

const transitionError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof SemesterTransitionError) {
    return errorHandle(error.message, reply, error.statusCode);
  }
  throw error;
};

export const getSemesterSetupController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;
    try {
      const setup = await getSemesterTransition(
        (request.params as { id: string }).id,
      );
      return successHandle({ setup }, reply, 200);
    } catch (error) {
      return transitionError(error, reply);
    }
  },
);

export const getCenterSemesterSetupSummariesController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;
    const centerId = (request.params as { centerId?: string }).centerId?.trim();
    if (!centerId) return errorHandle("Center ID is required.", reply, 400);

    try {
      const setupSummaries =
        await getCenterSemesterTransitionSummaries(centerId);
      return successHandle({ setupSummaries }, reply, 200);
    } catch (error) {
      return transitionError(error, reply);
    }
  },
);

export const saveSemesterStudentsController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const parsed = parseStudentTransitionPlan(
      (request.body as { students?: unknown } | null)?.students,
    );
    if ("error" in parsed) return errorHandle(parsed.error, reply, 400);
    try {
      const setup = await saveStudentTransitionPlan(
        (request.params as { id: string }).id,
        parsed.data,
        admin.id,
      );
      return successHandle(
        { message: "Student transition saved.", setup },
        reply,
        200,
      );
    } catch (error) {
      return transitionError(error, reply);
    }
  },
);

export const saveSemesterStaffController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    const parsed = parseStaffTransitionPlan(
      (request.body as { staff?: unknown } | null)?.staff,
    );
    if ("error" in parsed) return errorHandle(parsed.error, reply, 400);
    try {
      const setup = await saveStaffTransitionPlan(
        (request.params as { id: string }).id,
        parsed.data,
        admin.id,
      );
      return successHandle(
        { message: "Staff transition saved.", setup },
        reply,
        200,
      );
    } catch (error) {
      return transitionError(error, reply);
    }
  },
);

export const activateSemesterSetupController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return;
    try {
      const { semester, queuedEmailCount } = await activateSemesterTransition(
        (request.params as { id: string }).id,
        admin.id,
      );
      return successHandle(
        {
          message: "Semester activated.",
          semester,
          queuedEmailCount,
        },
        reply,
        200,
      );
    } catch (error) {
      return transitionError(error, reply);
    }
  },
);

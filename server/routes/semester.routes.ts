import type { FastifyInstance } from "fastify";
import {
  createSemester,
  getSemestersByCenterId,
  getSemesterByIdController,
  updateSemesterController,
  deleteSemesterController,
} from "../controllers/semester.controller.js";
import { authChecker } from "../utils/authChecker.js";

export const semesterRoutes = async (fastify: FastifyInstance) => {
  fastify.post(
    "/semesters/create",
    { preHandler: authChecker },
    createSemester
  );
  fastify.get(
    "/semesters/:id",
    { preHandler: authChecker },
    getSemesterByIdController
  );
  fastify.put(
    "/semesters/:id",
    { preHandler: authChecker },
    updateSemesterController
  );
  fastify.delete(
    "/semesters/:id",
    { preHandler: authChecker },
    deleteSemesterController
  );
  fastify.get(
    "/semesters/center/:centerId",
    { preHandler: authChecker },
    getSemestersByCenterId
  );
};

import type { FastifyInstance } from "fastify";
import {
  createAcademicLevelController,
  listAcademicLevelsController,
  reorderAcademicLevelsController,
  updateAcademicLevelController,
} from "../controllers/academic-level.controller.js";
import { authChecker } from "../utils/authChecker.js";

export const academicLevelRoutes = async (fastify: FastifyInstance) => {
  fastify.get(
    "/academic-levels",
    { preHandler: authChecker },
    listAcademicLevelsController,
  );
  fastify.post(
    "/academic-levels",
    { preHandler: authChecker },
    createAcademicLevelController,
  );
  fastify.patch(
    "/academic-levels/:id",
    { preHandler: authChecker },
    updateAcademicLevelController,
  );
  fastify.put(
    "/academic-levels/order",
    { preHandler: authChecker },
    reorderAcademicLevelsController,
  );
};

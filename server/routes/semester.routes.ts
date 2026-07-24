import type { FastifyInstance } from "fastify";
import {
  createSemester,
  getSemestersByCenterId,
  getSemesterByIdController,
  updateSemesterController,
  deleteSemesterController,
  listSemesters,
} from "../controllers/semester.controller.js";
import { authChecker } from "../utils/authChecker.js";
import {
  listSemesterLevelsController,
  replaceSemesterLevelsController,
} from "../controllers/academic-level.controller.js";
import {
  activateSemesterSetupController,
  getCenterSemesterSetupSummariesController,
  getSemesterSetupController,
  saveSemesterStaffController,
  saveSemesterStudentsController,
} from "../controllers/semester-transition.controller.js";

export const semesterRoutes = async (fastify: FastifyInstance) => {
  fastify.post(
    "/semesters/create",
    { preHandler: authChecker },
    createSemester,
  );
  fastify.get("/semesters", { preHandler: authChecker }, listSemesters);
  fastify.get(
    "/semesters/center/:centerId/setup-summaries",
    { preHandler: authChecker },
    getCenterSemesterSetupSummariesController,
  );
  fastify.get(
    "/semesters/:id/setup",
    { preHandler: authChecker },
    getSemesterSetupController,
  );
  fastify.put(
    "/semesters/:id/setup/students",
    { preHandler: authChecker },
    saveSemesterStudentsController,
  );
  fastify.put(
    "/semesters/:id/setup/staff",
    { preHandler: authChecker },
    saveSemesterStaffController,
  );
  fastify.post(
    "/semesters/:id/setup/activate",
    { preHandler: authChecker },
    activateSemesterSetupController,
  );
  fastify.get(
    "/semesters/:id",
    { preHandler: authChecker },
    getSemesterByIdController,
  );
  fastify.put(
    "/semesters/:id",
    { preHandler: authChecker },
    updateSemesterController,
  );
  fastify.delete(
    "/semesters/:id",
    { preHandler: authChecker },
    deleteSemesterController,
  );
  fastify.get(
    "/semesters/center/:centerId",
    { preHandler: authChecker },
    getSemestersByCenterId,
  );
  fastify.get(
    "/semesters/:id/levels",
    { preHandler: authChecker },
    listSemesterLevelsController,
  );
  fastify.put(
    "/semesters/:id/levels",
    { preHandler: authChecker },
    replaceSemesterLevelsController,
  );
};

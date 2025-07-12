import type { FastifyInstance } from "fastify";
import {
  createProject,
  listProjects,
  getProjectByIdController,
  updateProjectController,
  deleteProjectController,
} from "../controllers/project.controller.js";
import { authChecker } from "../utils/authChecker.js";

export const projectRoutes = async (fastify: FastifyInstance) => {
  fastify.post("/projects/create", { preHandler: authChecker }, createProject);
  fastify.get("/projects", { preHandler: authChecker }, listProjects);
  fastify.get(
    "/projects/:id",
    { preHandler: authChecker },
    getProjectByIdController
  );
  fastify.put(
    "/projects/:id",
    { preHandler: authChecker },
    updateProjectController
  );
  fastify.delete(
    "/projects/:id",
    { preHandler: authChecker },
    deleteProjectController
  );
};

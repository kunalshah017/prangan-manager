import type { FastifyInstance } from "fastify";
import { createProject, listProjects } from "../controllers/project.controller.js";
import { authChecker } from "../utils/authChecker.js";

export const projectRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/projects/create', {preHandler:authChecker} ,createProject);
  fastify.get('/projects', { preHandler: authChecker }, listProjects);
};
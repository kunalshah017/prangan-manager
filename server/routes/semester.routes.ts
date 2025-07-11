import type { FastifyInstance } from "fastify";
import { createSemester } from "../controllers/semester.controller.js";
import { authChecker } from "../utils/authChecker.js";

export const semesterRoutes = async (fastify: FastifyInstance) => {
    fastify.post('/semesters/create', { preHandler: authChecker }, createSemester);
};

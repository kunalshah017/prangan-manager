import type { FastifyInstance } from "fastify";
import { createCenter, listCenters } from "../controllers/center.controller.js";
import { authChecker } from "../utils/authChecker.js";

export const centerRoutes = async (fastify: FastifyInstance) => {
    fastify.post('/centers/create', { preHandler: authChecker }, createCenter);
    fastify.get('/centers', { preHandler: authChecker }, listCenters);
};
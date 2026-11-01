import type { FastifyInstance } from "fastify";
import { authChecker } from "../utils/authChecker.js";
import { createEvent, createPlanning, deleteEvent, deletePlanning, listEvents, listPlanning, operationsReport } from "../controllers/operations.controller.js";
export const operationsRoutes = async (fastify: FastifyInstance) => {
  fastify.get("/planning", { preHandler: authChecker }, listPlanning);
  fastify.post("/planning", { preHandler: authChecker }, createPlanning);
  fastify.delete("/planning/:id", { preHandler: authChecker }, deletePlanning);
  fastify.get("/events", { preHandler: authChecker }, listEvents);
  fastify.post("/events", { preHandler: authChecker }, createEvent);
  fastify.delete("/events/:id", { preHandler: authChecker }, deleteEvent);
  fastify.get("/reports", { preHandler: authChecker }, operationsReport);
};

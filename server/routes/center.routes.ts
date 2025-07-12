import type { FastifyInstance } from "fastify";
import {
  createCenter,
  listCenters,
  getCentersByProjectId,
  getCenterByIdController,
  updateCenterController,
  deleteCenterController,
} from "../controllers/center.controller.js";
import { authChecker } from "../utils/authChecker.js";

export const centerRoutes = async (fastify: FastifyInstance) => {
  fastify.post("/centers/create", { preHandler: authChecker }, createCenter);
  fastify.get("/centers", { preHandler: authChecker }, listCenters);
  fastify.get(
    "/centers/:id",
    { preHandler: authChecker },
    getCenterByIdController
  );
  fastify.put(
    "/centers/:id",
    { preHandler: authChecker },
    updateCenterController
  );
  fastify.delete(
    "/centers/:id",
    { preHandler: authChecker },
    deleteCenterController
  );
  fastify.get(
    "/centers/project/:projectId",
    { preHandler: authChecker },
    getCentersByProjectId
  );
};

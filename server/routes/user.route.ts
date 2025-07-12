import type { FastifyInstance } from "fastify";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  verifyUser,
  GetUnverifiedUsers
} from "../controllers/user.controller.js";
import { authChecker } from "../utils/authChecker.js";

export const userRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // Declare a route for the root path
  fastify.post("/users/register", registerUser);
  fastify.post("/users/login", loginUser);
  fastify.get("/users/me", { preHandler: authChecker }, getCurrentUser);
  fastify.post("/users/verify", { preHandler: authChecker }, verifyUser);
  fastify.get("/users/registration-requests", { preHandler: authChecker }, GetUnverifiedUsers);
};

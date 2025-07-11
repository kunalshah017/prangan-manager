import type{ FastifyInstance } from "fastify";
import { registerUser, loginUser } from "../controllers/user.controller.js";

export const userRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // Declare a route for the root path
  fastify.post('/users/register', registerUser);
  fastify.post('/users/login', loginUser);

};
import type { FastifyInstance } from "fastify";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  verifyUser,
  GetUnverifiedUsers,
  addStudent,
  getStudents,
  getStudent,
  updateStudentController,
  deleteStudentController,
  getStudentsByLevelController,
} from "../controllers/user.controller.js";
import { authChecker } from "../utils/authChecker.js";

export const userRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // User routes
  fastify.post("/users/register", registerUser);
  fastify.post("/users/login", loginUser);
  fastify.get("/users/me", { preHandler: authChecker }, getCurrentUser);
  fastify.post("/users/verify", { preHandler: authChecker }, verifyUser);
  fastify.get(
    "/users/registration-requests",
    { preHandler: authChecker },
    GetUnverifiedUsers
  );

  // Student routes (under users)
  fastify.post("/users/students", { preHandler: authChecker }, addStudent);
  fastify.get("/users/students", { preHandler: authChecker }, getStudents);
  fastify.get("/users/students/:id", { preHandler: authChecker }, getStudent);
  fastify.put(
    "/users/students/:id",
    { preHandler: authChecker },
    updateStudentController
  );
  fastify.delete(
    "/users/students/:id",
    { preHandler: authChecker },
    deleteStudentController
  );
  fastify.get(
    "/users/students/level/:level",
    { preHandler: authChecker },
    getStudentsByLevelController
  );
};

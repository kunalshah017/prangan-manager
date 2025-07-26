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
  getStudentsByProjectController,
  getStudentsByCenterController,
  getStudentsBySemesterController,
  enrollStudentController,
  promoteStudentController,
  getStudentHistoryController,
  getAllUsersController,
  getUserAssignmentsController,
  updateUserManagementController,
  createUserAssignmentController,
  deleteUserAssignmentController,
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

  // Student CRUD routes
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

  // Student filtering routes
  fastify.get(
    "/users/students/level/:level",
    { preHandler: authChecker },
    getStudentsByLevelController
  );
  fastify.get(
    "/users/students/project/:projectId",
    { preHandler: authChecker },
    getStudentsByProjectController
  );
  fastify.get(
    "/users/students/center/:centerId",
    { preHandler: authChecker },
    getStudentsByCenterController
  );
  fastify.get(
    "/users/students/semester/:semesterId",
    { preHandler: authChecker },
    getStudentsBySemesterController
  );

  // Student enrollment and promotion routes
  fastify.post(
    "/users/students/enroll",
    { preHandler: authChecker },
    enrollStudentController
  );
  fastify.post(
    "/users/students/:studentId/promote",
    { preHandler: authChecker },
    promoteStudentController
  );
  fastify.get(
    "/users/students/:studentId/history",
    { preHandler: authChecker },
    getStudentHistoryController
  );

  // User Management routes
  fastify.get(
    "/users/management",
    { preHandler: authChecker },
    getAllUsersController
  );
  fastify.get(
    "/users/:userId/assignments",
    { preHandler: authChecker },
    getUserAssignmentsController
  );
  fastify.put(
    "/users/:userId/management",
    { preHandler: authChecker },
    updateUserManagementController
  );
  fastify.post(
    "/users/assignments",
    { preHandler: authChecker },
    createUserAssignmentController
  );
  fastify.delete(
    "/users/assignments/:assignmentId",
    { preHandler: authChecker },
    deleteUserAssignmentController
  );
};

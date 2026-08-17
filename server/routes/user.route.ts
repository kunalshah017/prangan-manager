import type { FastifyInstance } from "fastify";
import {
  registerUser,
  loginUser,
  logoutUser,
  activateAccount,
  completePasswordReset,
  requestPasswordReset,
  getCurrentUser,
  getUserByIdController,
  updateUserController,
  verifyUser,
  revokeUserAccessController,
  GetUnverifiedUsers,
  addStudent,
  getStudents,
  getStudent,
  updateStudentController,
  deleteStudentController,
  getStudentsBySemesterLevelController,
  getStudentsByProjectController,
  getStudentsByCenterController,
  getStudentsBySemesterController,
  createEnrollmentController,
  getStudentEnrollmentsController,
  updateEnrollmentController,
  deleteEnrollmentController,
  getAllUsersController,
  getUserAssignmentsController,
  updateUserManagementController,
  createUserAssignmentController,
  deleteUserAssignmentController,
  getContextStaffController,
  getRemunerationUsersController,
  getSemesterUsersController,
  updateRemunerationRatesController,
  setRemunerationPeriodController,
  updateSemesterUserAssignmentsController,
  updateMyBankDetails,
} from "../controllers/user.controller.js";
import { authChecker } from "../utils/authChecker.js";

export const userRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // User routes
  fastify.post("/users/register", registerUser);
  fastify.post("/users/login", loginUser);
  fastify.post("/users/logout", { preHandler: authChecker }, logoutUser);
  fastify.post("/users/activate", activateAccount);
  fastify.post("/users/password-reset", requestPasswordReset);
  fastify.post("/users/password-reset/complete", completePasswordReset);
  fastify.get("/users", { preHandler: authChecker }, getAllUsersController);
  fastify.get("/users/me", { preHandler: authChecker }, getCurrentUser);
  fastify.get(
    "/users/remuneration",
    { preHandler: authChecker },
    getRemunerationUsersController,
  );
  fastify.get(
    "/users/semester-users",
    { preHandler: authChecker },
    getSemesterUsersController,
  );
  fastify.put(
    "/users/semester-users/:userId/assignments",
    { preHandler: authChecker },
    updateSemesterUserAssignmentsController,
  );
  fastify.put(
    "/users/remuneration/rates",
    { preHandler: authChecker },
    updateRemunerationRatesController,
  );
  fastify.put(
    "/users/remuneration/periods",
    { preHandler: authChecker },
    setRemunerationPeriodController,
  );
  fastify.get(
    "/users/context-staff",
    { preHandler: authChecker },
    getContextStaffController,
  );
  fastify.get(
    "/users/:userId",
    { preHandler: authChecker },
    getUserByIdController,
  );
  fastify.delete(
    "/users/:userId/access",
    { preHandler: authChecker },
    revokeUserAccessController,
  );
  fastify.put(
    "/users/:userId",
    { preHandler: authChecker },
    updateUserController,
  );
  fastify.patch(
    "/users/me/bank",
    { preHandler: authChecker },
    updateMyBankDetails,
  );
  // PUT alias for clients that cannot use PATCH (CORS/proxies)
  fastify.put(
    "/users/me/bank",
    { preHandler: authChecker },
    updateMyBankDetails,
  );
  fastify.post("/users/verify", { preHandler: authChecker }, verifyUser);
  fastify.get(
    "/users/registration-requests",
    { preHandler: authChecker },
    GetUnverifiedUsers,
  );

  // Student CRUD routes
  fastify.post("/users/students", { preHandler: authChecker }, addStudent);
  fastify.get("/users/students", { preHandler: authChecker }, getStudents);
  fastify.get("/users/students/:id", { preHandler: authChecker }, getStudent);
  fastify.put(
    "/users/students/:id",
    { preHandler: authChecker },
    updateStudentController,
  );
  fastify.delete(
    "/users/students/:id",
    { preHandler: authChecker },
    deleteStudentController,
  );

  // Student filtering routes
  fastify.get(
    "/users/students/semester-level/:semesterLevelId",
    { preHandler: authChecker },
    getStudentsBySemesterLevelController,
  );
  fastify.get(
    "/users/students/project/:projectId",
    { preHandler: authChecker },
    getStudentsByProjectController,
  );
  fastify.get(
    "/users/students/center/:centerId",
    { preHandler: authChecker },
    getStudentsByCenterController,
  );
  fastify.get(
    "/users/students/semester/:semesterId",
    { preHandler: authChecker },
    getStudentsBySemesterController,
  );

  // Student enrollment management routes
  fastify.post(
    "/users/students/:studentId/enrollments",
    { preHandler: authChecker },
    createEnrollmentController,
  );
  fastify.get(
    "/users/students/:studentId/enrollments",
    { preHandler: authChecker },
    getStudentEnrollmentsController,
  );
  fastify.put(
    "/users/students/enrollments/:enrollmentId",
    { preHandler: authChecker },
    updateEnrollmentController,
  );
  fastify.delete(
    "/users/students/enrollments/:enrollmentId",
    { preHandler: authChecker },
    deleteEnrollmentController,
  );

  // User Management routes
  fastify.get(
    "/users/management",
    { preHandler: authChecker },
    getAllUsersController,
  );
  fastify.get(
    "/users/:userId/assignments",
    { preHandler: authChecker },
    getUserAssignmentsController,
  );
  fastify.put(
    "/users/:userId/management",
    { preHandler: authChecker },
    updateUserManagementController,
  );
  fastify.post(
    "/users/assignments",
    { preHandler: authChecker },
    createUserAssignmentController,
  );
  fastify.delete(
    "/users/assignments/:assignmentId",
    { preHandler: authChecker },
    deleteUserAssignmentController,
  );
};

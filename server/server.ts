import Fastify from "fastify";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import dotenv from "dotenv";

import { userRoutes } from "./routes/user.route.js";
import { projectRoutes } from "./routes/project.routes.js";
import { centerRoutes } from "./routes/center.routes.js";
import { semesterRoutes } from "./routes/semester.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import studentAttendanceRoutes from "./routes/student-attendance.routes.js";
import syllabusRoutes from "./routes/syllabus.routes.js";
import examRoutes from "./routes/exam.routes.js";
import { academicLevelRoutes } from "./routes/academic-level.routes.js";
import { expenseRoutes } from "./routes/expense.routes.js";
import cookie from "@fastify/cookie";
import { createCsrfToken, requireCsrfToken } from "./security/csrf.js";
import {
  CSRF_COOKIE_NAME,
  getAllowedClientOrigins,
  getCsrfCookieOptions,
} from "./security/session.js";
import { startEmailWorker } from "./service/email-worker.js";

// Load environment variables from .env file
dotenv.config();

// Create Fastify instance
const fastify: FastifyInstance = Fastify();
let emailWorker: ReturnType<typeof startEmailWorker> | undefined;

const clientOrigins = getAllowedClientOrigins();

fastify.register(cookie);
fastify.register(import("@fastify/cors"), {
  origin: clientOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token"],
});

fastify.addHook("preHandler", requireCsrfToken);

fastify.get("/api/v1/auth/csrf", async (_request, reply) => {
  const csrfToken = createCsrfToken();
  reply.setCookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());
  return { csrfToken };
});

// Health check endpoint
fastify.get("/health", async (request: FastifyRequest, reply: FastifyReply) => {
  return {
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Prangan Manager Backend",
  };
});

// Register routes
fastify.register(userRoutes, { prefix: "/api/v1" });
fastify.register(projectRoutes, { prefix: "/api/v1" });
fastify.register(centerRoutes, { prefix: "/api/v1" });
fastify.register(semesterRoutes, { prefix: "/api/v1" });
fastify.register(attendanceRoutes, { prefix: "/api/v1/attendance" });
fastify.register(studentAttendanceRoutes, {
  prefix: "/api/v1/student-attendance",
});
fastify.register(syllabusRoutes, { prefix: "/api/v1/syllabus" });
fastify.register(examRoutes, { prefix: "/api/v1/exams" });
fastify.register(academicLevelRoutes, { prefix: "/api/v1" });
fastify.register(expenseRoutes, { prefix: "/api/v1" });

const start = async (): Promise<void> => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const host = process.env.HOST || "0.0.0.0";

    await fastify.ready();
    await fastify.listen({ port, host });
    emailWorker = startEmailWorker();
    console.log(`Server is running on http://${host}:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  fastify.log.info("Received SIGINT, shutting down gracefully...");
  await emailWorker?.stop();
  await fastify.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  fastify.log.info("Received SIGTERM, shutting down gracefully...");
  await emailWorker?.stop();
  await fastify.close();
  process.exit(0);
});

start();

// Export the Fastify instance for route integration tests.
export default fastify;

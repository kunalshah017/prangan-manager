import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import dotenv from "dotenv";

import { userRoutes } from "../routes/user.route.js";
import { projectRoutes } from "../routes/project.routes.js";
import { centerRoutes } from "../routes/center.routes.js";
import { semesterRoutes } from "../routes/semester.routes.js";

// Load environment variables
dotenv.config();

let fastifyInstance: FastifyInstance | null = null;

async function createFastifyInstance(): Promise<FastifyInstance> {
  if (fastifyInstance) {
    return fastifyInstance;
  }

  // Create Fastify instance for Vercel
  const fastify: FastifyInstance = Fastify({
    logger: false, // Disable logging in production
  });

  // Register CORS plugin
  await fastify.register(import("@fastify/cors"), {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  // Health check endpoint
  fastify.get("/health", async () => {
    return {
      status: "OK",
      timestamp: new Date().toISOString(),
      service: "Prangan Manager Backend",
    };
  });

  // Register routes
  await fastify.register(userRoutes, { prefix: "/api/v1" });
  await fastify.register(projectRoutes, { prefix: "/api/v1" });
  await fastify.register(centerRoutes, { prefix: "/api/v1" });
  await fastify.register(semesterRoutes, { prefix: "/api/v1" });

  await fastify.ready();
  fastifyInstance = fastify;
  return fastify;
}

// Export handler for Vercel
export default async (req: any, res: any) => {
  const fastify = await createFastifyInstance();
  fastify.server.emit("request", req, res);
};

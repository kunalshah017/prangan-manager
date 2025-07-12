import Fastify from "fastify";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import dotenv from "dotenv";

import { userRoutes } from "./routes/user.route.js";
import { projectRoutes } from "./routes/project.routes.js";
import { centerRoutes } from "./routes/center.routes.js";
import { semesterRoutes } from "./routes/semester.routes.js";

// Load environment variables from .env file
dotenv.config();

// Create Fastify instance
const fastify: FastifyInstance = Fastify();

// Register CORS plugin to allow all origins for development
fastify.register(import("@fastify/cors"), {
  origin: true, // Allow all origins
  credentials: true, // Allow credentials
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

// Start the server for local development only
if (process.env.NODE_ENV !== "production") {
  const start = async (): Promise<void> => {
    try {
      const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
      const host = process.env.HOST || "0.0.0.0";

      await fastify.listen({ port, host });
      console.log(`Server is running on http://${host}:${port}`);
    } catch (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  };

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    fastify.log.info("Received SIGINT, shutting down gracefully...");
    await fastify.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    fastify.log.info("Received SIGTERM, shutting down gracefully...");
    await fastify.close();
    process.exit(0);
  });

  // Start the server
  start();
}

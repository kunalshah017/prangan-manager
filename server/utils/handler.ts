import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { AcademicLevelServiceError } from "../service/academic-level.service.js";

type AsyncHandler = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<any>;

export const asyncHandle = (handler: AsyncHandler) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await handler(request, reply);
    } catch (error: unknown) {
      console.error("Error in async handler:", error);
      if (error instanceof AcademicLevelServiceError) {
        reply.status(error.statusCode).send({ message: error.message });
        return;
      }
      reply.status(500).send({ error: "Internal Server Error" });
    }
  };
};

// Errors a route didn't handle itself. Server errors are logged, never sent:
// a database error's message can name the database host.
export const unhandledErrorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const statusCode = error.statusCode ?? 500;
  if (statusCode < 500) {
    return reply.status(statusCode).send({ message: error.message });
  }
  console.error(`${request.method} ${request.url} failed:`, error);
  return reply
    .status(statusCode)
    .send({ message: "Something went wrong on our side. Please try again." });
};

export const successHandle =(data: any, reply: FastifyReply, code: number) => {
  reply.status(code).send(data);
};

export const errorHandle = (
  errorMessage: string,
  reply: FastifyReply,
  code: number
) => {
  reply.status(code).send({ message: errorMessage || "An error occurred" });
};

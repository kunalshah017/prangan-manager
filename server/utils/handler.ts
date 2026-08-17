import type { FastifyRequest, FastifyReply } from "fastify";
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

export const successHandle = (data: any, reply: FastifyReply, code: number) => {
  reply.status(code).send(data);
};

export const errorHandle = (
  errorMessage: string,
  reply: FastifyReply,
  code: number
) => {
  reply.status(code).send({ message: errorMessage || "An error occurred" });
};

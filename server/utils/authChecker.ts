import jwt from "jsonwebtoken";
import type { FastifyRequest, FastifyReply } from "fastify";
import { errorHandle } from "./handler.js";
import { PrismaClient } from "../generated/prisma/index.js";
import { Role } from "../generated/prisma/index.js";
const prisma = new PrismaClient();

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      name: string;
      email: string;
      role: Role;
    };
  }
}

export const authChecker = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const token = request.headers.authorization?.split(" ")[1];

  if (!token) return errorHandle("Unauthorized: No token provided", reply, 401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    if (typeof decoded === "string" || !decoded?.userId) {
      return errorHandle("Unauthorized: Invalid token", reply, 401);
    } else {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true, role: true }, // Adjust fields as needed
      });

      if (!user) {
        return errorHandle("Unauthorized: User not found", reply, 401);
      }

      request.user = user; // Attach user to request object
      return;
    }
  } catch (error) {
    return errorHandle("Unauthorized: Invalid token", reply, 401);
  }
};

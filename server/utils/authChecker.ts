import type { FastifyRequest, FastifyReply } from "fastify";
import { errorHandle } from "./handler.js";
import { Role } from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import { toAuthenticatedIdentity } from "../security/authentication.js";
import {
  createSessionToken,
  getSessionCookieOptions,
  readSessionToken,
  SESSION_COOKIE_NAME,
  shouldRenewSession,
} from "../security/session.js";

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

export const AUTHENTICATION_FAILURE_MESSAGE = "Unauthorized";

export const authChecker = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const token = request.cookies[SESSION_COOKIE_NAME];

  if (!token) {
    return errorHandle(AUTHENTICATION_FAILURE_MESSAGE, reply, 401);
  }

  try {
    const decoded = readSessionToken(token);
    if (!decoded) {
      return errorHandle(AUTHENTICATION_FAILURE_MESSAGE, reply, 401);
    } else {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          sessionVersion: true,
        },
      });
      const identity =
        user && user.sessionVersion === decoded.sessionVersion
          ? toAuthenticatedIdentity(user)
          : null;

      if (!identity) {
        return errorHandle(AUTHENTICATION_FAILURE_MESSAGE, reply, 401);
      }

      request.user = identity;
      // Keep active people signed in: reissue the session once a day.
      if (user && shouldRenewSession(decoded.issuedAt)) {
        reply.setCookie(
          SESSION_COOKIE_NAME,
          createSessionToken(user.id, user.sessionVersion),
          getSessionCookieOptions(),
        );
      }
      return;
    }
  } catch {
    return errorHandle(AUTHENTICATION_FAILURE_MESSAGE, reply, 401);
  }
};

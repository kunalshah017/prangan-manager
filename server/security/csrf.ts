import { randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { errorHandle } from "../utils/handler.js";
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from "./session.js";

export const hasMatchingCsrfToken = (
  cookieToken: string | undefined,
  headerToken: string | undefined,
): boolean => {
  if (!cookieToken || !headerToken) {
    return false;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  return (
    cookieBuffer.length === headerBuffer.length &&
    timingSafeEqual(cookieBuffer, headerBuffer)
  );
};

export const createCsrfToken = (): string =>
  randomBytes(32).toString("base64url");

export const requireCsrfToken = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  if (
    !["POST", "PUT", "PATCH", "DELETE"].includes(request.method) ||
    !request.cookies[SESSION_COOKIE_NAME]
  ) {
    return;
  }

  const headerToken = request.headers["x-csrf-token"];
  const csrfToken = Array.isArray(headerToken) ? undefined : headerToken;

  if (!hasMatchingCsrfToken(request.cookies[CSRF_COOKIE_NAME], csrfToken)) {
    return errorHandle("Invalid CSRF token", reply, 403);
  }
};

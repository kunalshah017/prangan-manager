import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  dismissNotifications,
  listNotifications,
  markNotificationsRead,
  parsePushSubscription,
  pushPublicKey,
  removeSubscription,
  saveSubscription,
} from "../service/notification.service.js";
import { authChecker } from "../utils/authChecker.js";
import { errorHandle } from "../utils/handler.js";

// authChecker runs first on the signed-in routes, so request.user is set there.
export const notificationRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get("/notifications", { preHandler: authChecker }, async (request: FastifyRequest) =>
    listNotifications(request.user!.id),
  );

  fastify.post("/notifications/read", { preHandler: authChecker }, async (request: FastifyRequest) => {
    await markNotificationsRead(request.user!.id);
    return { ok: true };
  });

  // { id } dismisses one update; { all: true } clears every update.
  fastify.post("/notifications/dismiss", { preHandler: authChecker }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, all } = (request.body ?? {}) as { id?: unknown; all?: unknown };
    const oneId = typeof id === "string" && id.length > 0 && id.length <= 100;
    if (!oneId && all !== true) return errorHandle("Say which notification to dismiss.", reply, 400);
    await dismissNotifications(request.user!.id, oneId ? (id as string) : undefined);
    return { ok: true };
  });

  // The public half of the push key, so no sign-in (and no database lookup).
  // Without keys the app runs without push.
  fastify.get("/notifications/push-key", async (_request, reply: FastifyReply) => {
    const publicKey = pushPublicKey();
    if (!publicKey) return errorHandle("Push notifications are not set up.", reply, 503);
    return { publicKey };
  });

  fastify.put("/notifications/subscription", { preHandler: authChecker }, async (request: FastifyRequest, reply: FastifyReply) => {
    const subscription = parsePushSubscription(request.body);
    if (!subscription) return errorHandle("Invalid push subscription.", reply, 400);
    await saveSubscription(request.user!.id, subscription);
    return { ok: true };
  });

  fastify.post("/notifications/subscription/remove", { preHandler: authChecker }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { endpoint } = (request.body ?? {}) as { endpoint?: unknown };
    if (typeof endpoint !== "string" || endpoint.length > 1000) {
      return errorHandle("Invalid push subscription.", reply, 400);
    }
    await removeSubscription(request.user!.id, endpoint);
    return { ok: true };
  });
};

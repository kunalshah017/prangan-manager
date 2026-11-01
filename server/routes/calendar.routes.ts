import type { FastifyInstance } from "fastify";
import {
  listCalendarEvents,
  addCalendarEvent,
  editCalendarEvent,
  removeCalendarEvent,
} from "../controllers/calendar.controller.js";
import { authChecker } from "../utils/authChecker.js";

export default async function calendarRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authChecker);

  fastify.get("/calendar-events", listCalendarEvents as any);
  fastify.post("/calendar-events", addCalendarEvent as any);
  fastify.put("/calendar-events/:eventId", editCalendarEvent as any);
  fastify.delete("/calendar-events/:eventId", removeCalendarEvent as any);
}

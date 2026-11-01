import type { FastifyReply, FastifyRequest } from "fastify";
import { Role } from "../generated/prisma/index.js";
import { getActiveUserScopeAssignments } from "../service/user.service.js";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventScope,
  getCalendarEvents,
  updateCalendarEvent,
  validateCalendarScope,
} from "../service/calendar.service.js";
import {
  canManageCalendar,
  canReadCalendar,
  hasCompleteCalendarScope,
  type CalendarScope,
} from "../security/calendar-authorization.js";
import {
  parseCalendarEventInput,
  parseCalendarEventUpdate,
} from "../security/calendar-input.js";

type AuthenticatedRequest = FastifyRequest & {
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
};

const getAssignments = async (user: NonNullable<AuthenticatedRequest["user"]>) => {
  if (user.role === Role.ADMIN) return [];
  const assignments = await getActiveUserScopeAssignments(user.id);
  if (typeof assignments === "string") {
    throw new Error("Unable to verify user permissions");
  }
  return assignments;
};

const canRead = async (
  user: NonNullable<AuthenticatedRequest["user"]>,
  scope: CalendarScope,
) => {
  const assignments = await getAssignments(user);
  return canReadCalendar({ identity: user, assignments, scope });
};

const canManage = async (
  user: NonNullable<AuthenticatedRequest["user"]>,
  scope: CalendarScope,
) => {
  const assignments = await getAssignments(user);
  return canManageCalendar({ identity: user, assignments, scope });
};

const getQueryScope = (request: FastifyRequest): {
  projectId: string;
  centerId: string;
  semesterId: string;
} | null => {
  const query = request.query as Record<string, unknown>;

  const projectId = query.projectId;
  const centerId = query.centerId;
  const semesterId = query.semesterId;

  if (
    typeof projectId !== "string" ||
    typeof centerId !== "string" ||
    typeof semesterId !== "string" ||
    !projectId.trim() ||
    !centerId.trim() ||
    !semesterId.trim()
  ) {
    return null;
  }

  return { projectId, centerId, semesterId };
};


export const listCalendarEvents = async (
  request: AuthenticatedRequest,
  reply: FastifyReply,
) => {
  try {
    const user = request.user;
    if (!user) return reply.code(401).send({ message: "Unauthorized" });

    const scope = getQueryScope(request);
    if (!scope) {
      return reply.code(400).send({ message: "Project, centre and semester are required" });
    }

    if (!(await canRead(user, scope))) {
      return reply.code(403).send({ message: "You do not have permission to view calendar events" });
    }

    if (!(await validateCalendarScope(scope))) {
      return reply.code(400).send({ message: "Invalid project, centre or semester selection" });
    }

    const data = await getCalendarEvents(scope);
    return reply.send({ data, count: data.length });

} catch (error) {
  request.log.error({ err: error }, "Failed to load calendar events");
  return reply.code(500).send({ message: "Unable to load calendar events" });
}};

export const addCalendarEvent = async (
  request: AuthenticatedRequest,
  reply: FastifyReply,
) => {
  try {
    const user = request.user;
    if (!user) return reply.code(401).send({ message: "Unauthorized" });

    const parsed = parseCalendarEventInput(request.body);
    if ("error" in parsed) {
      return reply.code(400).send({ message: parsed.error });
    }

    const scope = {
      projectId: parsed.data.projectId,
      centerId: parsed.data.centerId,
      semesterId: parsed.data.semesterId,
    };

    if (!(await canManage(user, scope))) {
      return reply.code(403).send({ message: "You do not have permission to manage calendar events" });
    }

    if (!(await validateCalendarScope(scope))) {
      return reply.code(400).send({ message: "Invalid project, centre or semester selection" });
    }

    const data = await createCalendarEvent(parsed.data, user.id);
    return reply.code(201).send({ message: "Calendar event created successfully", data });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Unable to create calendar event" });
  }
};

export const editCalendarEvent = async (
  request: AuthenticatedRequest,
  reply: FastifyReply,
) => {
  try {
    const user = request.user;
    if (!user) return reply.code(401).send({ message: "Unauthorized" });

    const params = request.params as { eventId?: string };
    if (!params.eventId) {
      return reply.code(400).send({ message: "Event ID is required" });
    }

    const parsed = parseCalendarEventUpdate(request.body);
    if ("error" in parsed) {
      return reply.code(400).send({ message: parsed.error });
    }

    const existing = await getCalendarEventScope(params.eventId);
    if (!existing) {
      return reply.code(404).send({ message: "Calendar event not found" });
    }

    const scope = {
      projectId: existing.projectId,
      centerId: existing.centerId,
      semesterId: existing.semesterId,
    };

    if (!(await canManage(user, scope))) {
      return reply.code(403).send({ message: "You do not have permission to manage calendar events" });
    }

    const data = await updateCalendarEvent(params.eventId, parsed.data);
    return reply.send({ message: "Calendar event updated successfully", data });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Unable to update calendar event" });
  }
};

export const removeCalendarEvent = async (
  request: AuthenticatedRequest,
  reply: FastifyReply,
) => {
  try {
    const user = request.user;
    if (!user) return reply.code(401).send({ message: "Unauthorized" });

    const params = request.params as { eventId?: string };
    if (!params.eventId) {
      return reply.code(400).send({ message: "Event ID is required" });
    }

    const existing = await getCalendarEventScope(params.eventId);
    if (!existing) {
      return reply.code(404).send({ message: "Calendar event not found" });
    }

    const scope = {
      projectId: existing.projectId,
      centerId: existing.centerId,
      semesterId: existing.semesterId,
    };

    if (!(await canManage(user, scope))) {
      return reply.code(403).send({ message: "You do not have permission to manage calendar events" });
    }

    await deleteCalendarEvent(params.eventId);
    return reply.send({ message: "Calendar event deleted successfully" });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Unable to delete calendar event" });
  }
};

import type { FastifyReply, FastifyRequest } from "fastify";
import { Role } from "../generated/prisma/index.js";
import { getActiveUserScopeAssignments } from "../service/user.service.js";
import {
  canManageOperations,
  canReadOperations,
  hasCompleteOperationsScope,
  type OperationsScope,
} from "../security/operations-authorization.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandle, errorHandle, successHandle } from "../utils/handler.js";

type AuthRequest = FastifyRequest & {
  user?: { id: string; role: Role };
};

const getScope = (request: FastifyRequest): OperationsScope =>
  request.query as OperationsScope;

const validScope = async (scope: OperationsScope) => {
  if (!hasCompleteOperationsScope(scope)) return false;
  const semester = await prisma.semesters.findFirst({
    where: {
      id: scope.semesterId,
      centerId: scope.centerId,
      center: { projectId: scope.projectId },
    },
    select: { id: true },
  });
  return Boolean(semester);
};

const getAssignments = async (user: NonNullable<AuthRequest["user"]>) => {
  if (user.role === Role.ADMIN) return [];
  const assignments = await getActiveUserScopeAssignments(user.id);
  if (typeof assignments === "string") {
    throw new Error("Unable to verify user permissions");
  }
  return assignments;
};

const canRead = async (user: NonNullable<AuthRequest["user"]>, scope: OperationsScope) =>
  canReadOperations({ identity: user, assignments: await getAssignments(user), scope });

const canManage = async (user: NonNullable<AuthRequest["user"]>, scope: OperationsScope) =>
  canManageOperations({ identity: user, assignments: await getAssignments(user), scope });

const checkPermission = async (
  request: AuthRequest,
  reply: FastifyReply,
  scope: OperationsScope,
  manage = false,
) => {
  if (!request.user) {
    errorHandle("Authentication required.", reply, 401);
    return false;
  }
  if (!(await validScope(scope))) {
    errorHandle("A valid project, center and semester scope is required.", reply, 400);
    return false;
  }
  const allowed = manage
    ? await canManage(request.user, scope)
    : await canRead(request.user, scope);
  if (!allowed) {
    errorHandle("You do not have permission to access this operation.", reply, 403);
    return false;
  }
  return true;
};

const bad = (reply: FastifyReply, message: string) =>
  errorHandle(message, reply, 400);

export const listPlanning = asyncHandle(async (request, reply) => {
  const scope = getScope(request);
  if (!(await checkPermission(request, reply, scope))) return;
  const items = await prisma.planningItem.findMany({
    where: { projectId: scope.projectId!, centerId: scope.centerId!, semesterId: scope.semesterId! },
    orderBy: { startAt: "asc" },
  });
  return successHandle(items, reply, 200);
});

export const createPlanning = asyncHandle(async (request, reply) => {
  const body = request.body as Record<string, unknown>;
  const scope = body as OperationsScope;
  if (!(await checkPermission(request, reply, scope, true))) return;
  if (typeof body.title !== "string" || !body.title.trim() ||
      typeof body.startAt !== "string" || Number.isNaN(Date.parse(body.startAt))) {
    return bad(reply, "Title and a valid startAt date are required.");
  }
  const item = await prisma.planningItem.create({
    data: {
      projectId: scope.projectId!,
      centerId: scope.centerId!,
      semesterId: scope.semesterId!,
      title: body.title.trim(),
      description: typeof body.description === "string" ? body.description : null,
      activityType: typeof body.activityType === "string" ? body.activityType : "GENERAL",
      startAt: new Date(body.startAt),
      endAt: typeof body.endAt === "string" && !Number.isNaN(Date.parse(body.endAt))
        ? new Date(body.endAt) : null,
      location: typeof body.location === "string" ? body.location : null,
      status: typeof body.status === "string" ? body.status : "PLANNED",
      createdBy: request.user!.id,
    },
  });
  return successHandle(item, reply, 201);
});

export const deletePlanning = asyncHandle(async (request, reply) => {
  const scope = getScope(request);
  if (!(await checkPermission(request, reply, scope, true))) return;
  const { id } = request.params as { id: string };
  const result = await prisma.planningItem.deleteMany({
    where: { id, projectId: scope.projectId!, centerId: scope.centerId!, semesterId: scope.semesterId! },
  });
  if (!result.count) return errorHandle("Planning item not found.", reply, 404);
  return successHandle({ deleted: true }, reply, 200);
});

export const listEvents = asyncHandle(async (request, reply) => {
  const scope = getScope(request);
  if (!(await checkPermission(request, reply, scope))) return;
  const items = await prisma.managedEvent.findMany({
    where: { projectId: scope.projectId!, centerId: scope.centerId!, semesterId: scope.semesterId! },
    orderBy: { eventDate: "desc" },
  });
  return successHandle(items, reply, 200);
});

export const createEvent = asyncHandle(async (request, reply) => {
  const body = request.body as Record<string, unknown>;
  const scope = body as OperationsScope;
  if (!(await checkPermission(request, reply, scope, true))) return;
  if (typeof body.title !== "string" || !body.title.trim() ||
      typeof body.eventDate !== "string" || Number.isNaN(Date.parse(body.eventDate))) {
    return bad(reply, "Title and a valid eventDate are required.");
  }
  const event = await prisma.managedEvent.create({
    data: {
      projectId: scope.projectId!,
      centerId: scope.centerId!,
      semesterId: scope.semesterId!,
      title: body.title.trim(),
      description: typeof body.description === "string" ? body.description : null,
      eventDate: new Date(body.eventDate),
      location: typeof body.location === "string" ? body.location : null,
      status: typeof body.status === "string" ? body.status : "PLANNED",
      archiveNotes: typeof body.archiveNotes === "string" ? body.archiveNotes : null,
      archivedAt: body.status === "ARCHIVED" ? new Date() : null,
      createdBy: request.user!.id,
    },
  });
  return successHandle(event, reply, 201);
});

export const deleteEvent = asyncHandle(async (request, reply) => {
  const scope = getScope(request);
  if (!(await checkPermission(request, reply, scope, true))) return;
  const { id } = request.params as { id: string };
  const result = await prisma.managedEvent.deleteMany({
    where: { id, projectId: scope.projectId!, centerId: scope.centerId!, semesterId: scope.semesterId! },
  });
  if (!result.count) return errorHandle("Event not found.", reply, 404);
  return successHandle({ deleted: true }, reply, 200);
});

export const operationsReport = asyncHandle(async (request, reply) => {
  const scope = getScope(request);
  if (!(await checkPermission(request, reply, scope))) return;
  const where = {
    projectId: scope.projectId!,
    centerId: scope.centerId!,
    semesterId: scope.semesterId!,
  };
  const [planningCount, eventCount, archivedCount, plannedCount, completedCount] =
    await Promise.all([
      prisma.planningItem.count({ where }),
      prisma.managedEvent.count({ where }),
      prisma.managedEvent.count({ where: { ...where, status: "ARCHIVED" } }),
      prisma.managedEvent.count({ where: { ...where, status: "PLANNED" } }),
      prisma.managedEvent.count({ where: { ...where, status: "COMPLETED" } }),
    ]);
  return successHandle(
    { planningCount, eventCount, archivedCount, plannedCount, completedCount },
    reply,
    200,
  );
});

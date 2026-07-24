import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/handler.js";
import type { Project } from "../types/project.types.js";
import {
  CreateProject,
  getProjects,
  updateProject,
  deleteProject,
  getProjectById,
  getProjectScope,
} from "../service/project.service.js";
import {
  getActiveUserScopeAssignments,
  getUserAccessibleProjects,
} from "../service/user.service.js";
import { isAdmin } from "../security/authorization.js";

const canAccessProjectResource = (
  user: NonNullable<FastifyRequest["user"]>,
  assignments: Awaited<ReturnType<typeof getActiveUserScopeAssignments>>,
  projectId: string,
) =>
  isAdmin(user) ||
  (Array.isArray(assignments) &&
    assignments.some(
      (assignment) => assignment.isActive && assignment.projectId === projectId,
    ));

export const createProject = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user; // Assuming user is set in the request by authentication middleware

    if (user?.role !== "ADMIN") {
      return errorHandle("Only admins can create projects.", reply, 403);
    }

    const data = request.body as Partial<Project>;

    if (!data.name) {
      return errorHandle(
        "Project name and description are required.",
        reply,
        400,
      );
    }

    const project = await CreateProject(data);

    if (typeof project === "string") {
      return errorHandle(project, reply, 500);
    }

    return successHandle(
      { message: "Project created successfully", project },
      reply,
      201,
    );
  },
);

export const listProjects = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (!user) {
      return errorHandle("User not found in request.", reply, 401);
    }

    // Use role-based access to get projects
    const projects = await getUserAccessibleProjects(user.id, user.role);

    if (typeof projects === "string") {
      return errorHandle(projects, reply, 500);
    }

    return successHandle({ projects }, reply, 200);
  },
);

export const updateProjectController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (user?.role !== "ADMIN") {
      return errorHandle("Only admins can update projects.", reply, 403);
    }

    const { id } = request.params as { id: string };
    const data = request.body as Partial<Project>;

    if (!id) {
      return errorHandle("Project ID is required.", reply, 400);
    }

    const project = await updateProject(id, data);

    if (typeof project === "string") {
      return errorHandle(project, reply, 500);
    }

    return successHandle(
      { message: "Project updated successfully", project },
      reply,
      200,
    );
  },
);

export const deleteProjectController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (user?.role !== "ADMIN") {
      return errorHandle("Only admins can delete projects.", reply, 403);
    }

    const { id } = request.params as { id: string };

    if (!id) {
      return errorHandle("Project ID is required.", reply, 400);
    }

    const project = await deleteProject(id);

    if (typeof project === "string") {
      if (project === "Cannot delete project while enrollments exist") {
        return errorHandle(project, reply, 409);
      }

      return errorHandle("Internal Server Error", reply, 500);
    }

    return successHandle(
      { message: "Project deleted successfully" },
      reply,
      200,
    );
  },
);

export const getProjectByIdController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("User not found in request.", reply, 401);
    }

    const { id } = request.params as { id: string };

    if (!id) {
      return errorHandle("Project ID is required.", reply, 400);
    }

    const projectScope = await getProjectScope(id);
    if (!projectScope) {
      return errorHandle("Project not found.", reply, 404);
    }

    const assignments = isAdmin(user)
      ? []
      : await getActiveUserScopeAssignments(user.id);
    if (typeof assignments === "string") {
      return errorHandle("Unable to verify project access.", reply, 500);
    }

    if (!canAccessProjectResource(user, assignments, projectScope.projectId)) {
      return errorHandle(
        "You are not authorized to view this project.",
        reply,
        403,
      );
    }

    const project = await getProjectById(id);

    if (typeof project === "string") {
      return errorHandle("Unable to retrieve project.", reply, 500);
    }

    if (!project) {
      return errorHandle("Project not found.", reply, 404);
    }

    return successHandle({ project }, reply, 200);
  },
);

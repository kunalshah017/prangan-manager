import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/handler.js";
import type { Project } from "../types/project.types.js";
import {
  CreateProject,
  getProjects,
  updateProject,
  deleteProject,
  getProjectById,
} from "../service/project.service.js";

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
        400
      );
    }

    const project = await CreateProject(data);

    if (typeof project === "string") {
      return errorHandle(project, reply, 500);
    }

    return successHandle(
      { message: "Project created successfully", project },
      reply,
      201
    );
  }
);

export const listProjects = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const projects = await getProjects();

    if (typeof projects === "string") {
      return errorHandle(projects, reply, 500);
    }

    return successHandle({ projects }, reply, 200);
  }
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
      200
    );
  }
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
      return errorHandle(project, reply, 500);
    }

    return successHandle(
      { message: "Project deleted successfully" },
      reply,
      200
    );
  }
);

export const getProjectByIdController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    if (!id) {
      return errorHandle("Project ID is required.", reply, 400);
    }

    const project = await getProjectById(id);

    if (typeof project === "string") {
      return errorHandle(project, reply, 500);
    }

    if (!project) {
      return errorHandle("Project not found.", reply, 404);
    }

    return successHandle({ project }, reply, 200);
  }
);

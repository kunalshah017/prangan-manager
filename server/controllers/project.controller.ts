import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/handler.js";
import type { Project } from "../types/project.types.js";
import { CreateProject, getProjects } from "../service/project.service.js";

export const createProject = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {

    const user = request.user; // Assuming user is set in the request by authentication middleware

    if (user?.role !== "ADMIN") {
        return errorHandle("Only admins can create projects.", reply, 403);
    }

    const data = request.body as Partial<Project>;

    if (!data.name) {
        return errorHandle("Project name and description are required.", reply, 400);
    }

    const project = await CreateProject(data);

    if (typeof project === "string") {
        return errorHandle(project, reply, 500);
    }
    
    return successHandle({ message: "Project created successfully", project }, reply, 201);
});

export const listProjects = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const projects = await getProjects();

    if (typeof projects === "string") {
        return errorHandle(projects, reply, 500);
    }

    return successHandle({ projects }, reply, 200);
});
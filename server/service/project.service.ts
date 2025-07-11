import { PrismaClient } from "../generated/prisma/index.js";

import type { Project } from "../types/project.types.js";

const prisma = new PrismaClient();


export const CreateProject = async (projectData: Partial<Project>) => {
  try {
    const project = await prisma.projects.create({
      data: projectData as any,
    });
    return project;
  } catch (error: unknown) {
    console.error("Error creating project:", error);
    return "Failed to create project";
  }
};

export const getProjects = async () => {
  try {
    const projects = await prisma.projects.findMany();
    return projects;
  } catch (error: unknown) {
    console.error("Error fetching projects:", error);
    return "Failed to fetch projects";
  }
}
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
};

export const updateProject = async (
  id: string,
  projectData: Partial<Project>
) => {
  try {
    const project = await prisma.projects.update({
      where: { id },
      data: projectData as any,
    });
    return project;
  } catch (error: unknown) {
    console.error("Error updating project:", error);
    return "Failed to update project";
  }
};

export const deleteProject = async (id: string) => {
  try {
    // First, delete all semesters related to centers of this project
    await prisma.semesters.deleteMany({
      where: {
        center: {
          projectId: id,
        },
      },
    });

    // Then, delete all centers related to this project
    await prisma.centers.deleteMany({
      where: { projectId: id },
    });

    // Finally, delete the project
    const project = await prisma.projects.delete({
      where: { id },
    });
    return project;
  } catch (error: unknown) {
    console.error("Error deleting project:", error);
    return "Failed to delete project";
  }
};

export const getProjectById = async (id: string) => {
  try {
    const project = await prisma.projects.findUnique({
      where: { id },
      include: {
        centers: true,
      },
    });
    return project;
  } catch (error: unknown) {
    console.error("Error fetching project by ID:", error);
    return "Failed to fetch project";
  }
};

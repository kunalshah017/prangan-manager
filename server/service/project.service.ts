import { prisma } from "../lib/prisma.js";

import type { Project } from "../types/project.types.js";

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
  projectData: Partial<Project>,
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
    const enrollmentCount = await prisma.studentEnrollments.count({
      where: { projectId: id },
    });

    if (enrollmentCount > 0) {
      return "Cannot delete project while enrollments exist";
    }

    return await prisma.$transaction(async (tx) => {
      await tx.semesters.deleteMany({
        where: {
          center: {
            projectId: id,
          },
        },
      });

      await tx.centers.deleteMany({
        where: { projectId: id },
      });

      return tx.projects.delete({
        where: { id },
      });
    });
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

export const getProjectScope = async (id: string) => {
  const project = await prisma.projects.findUnique({
    where: { id },
    select: { id: true },
  });

  return project ? { projectId: project.id } : null;
};

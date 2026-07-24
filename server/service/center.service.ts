import { prisma } from "../lib/prisma.js";

import type { Center } from "../types/center.types.js";

export const CreateCenter = async (centerData: Partial<Center>) => {
  try {
    const center = await prisma.centers.create({
      data: centerData as any,
    });
    return center;
  } catch (error: unknown) {
    console.error("Error creating center:", error);
    return "Failed to create center";
  }
};

export const GetCenters = async () => {
  try {
    const centers = await prisma.centers.findMany();
    return centers;
  } catch (error: unknown) {
    console.error("Error fetching centers:", error);
    return "Failed to fetch centers";
  }
};

export const GetCentersByProjectId = async (projectId: string) => {
  try {
    const centers = await prisma.centers.findMany({
      where: { projectId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return centers;
  } catch (error: unknown) {
    console.error("Error fetching centers by project ID:", error);
    return "Failed to fetch centers";
  }
};

export const updateCenter = async (id: string, centerData: Partial<Center>) => {
  try {
    const center = await prisma.centers.update({
      where: { id },
      data: centerData as any,
    });
    return center;
  } catch (error: unknown) {
    console.error("Error updating center:", error);
    return "Failed to update center";
  }
};

export const deleteCenter = async (id: string) => {
  try {
    const enrollmentCount = await prisma.studentEnrollments.count({
      where: { centerId: id },
    });

    if (enrollmentCount > 0) {
      return "Cannot delete center while enrollments exist";
    }

    return await prisma.$transaction(async (tx) => {
      await tx.semesters.deleteMany({
        where: { centerId: id },
      });

      return tx.centers.delete({
        where: { id },
      });
    });
  } catch (error: unknown) {
    console.error("Error deleting center:", error);
    return "Failed to delete center";
  }
};

export const getCenterById = async (id: string) => {
  try {
    const center = await prisma.centers.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        semesters: true,
      },
    });
    return center;
  } catch (error: unknown) {
    console.error("Error fetching center by ID:", error);
    return "Failed to fetch center";
  }
};

export const getCenterScope = async (id: string) => {
  const center = await prisma.centers.findUnique({
    where: { id },
    select: { projectId: true },
  });

  return center ? { projectId: center.projectId, centerId: id } : null;
};

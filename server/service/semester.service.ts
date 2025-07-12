import { PrismaClient } from "../generated/prisma/index.js";
import type { semester } from "../types/semester.type.js";

const prisma = new PrismaClient();

export const CreateSemester = async (semesterData: Partial<semester>) => {
  try {
    const semester = await prisma.semesters.create({
      data: semesterData as any,
    });
    return semester;
  } catch (error: unknown) {
    console.error("Error creating semester:", error);
    return "Failed to create semester";
  }
};

export const GetSemestersByCenterId = async (centerId: string) => {
  try {
    const semesters = await prisma.semesters.findMany({
      where: { centerId },
      include: {
        center: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return semesters;
  } catch (error: unknown) {
    console.error("Error fetching semesters by center ID:", error);
    return "Failed to fetch semesters";
  }
};

export const updateSemester = async (
  id: string,
  semesterData: Partial<semester>
) => {
  try {
    const semester = await prisma.semesters.update({
      where: { id },
      data: semesterData as any,
    });
    return semester;
  } catch (error: unknown) {
    console.error("Error updating semester:", error);
    return "Failed to update semester";
  }
};

export const deleteSemester = async (id: string) => {
  try {
    const semester = await prisma.semesters.delete({
      where: { id },
    });
    return semester;
  } catch (error: unknown) {
    console.error("Error deleting semester:", error);
    return "Failed to delete semester";
  }
};

export const getSemesterById = async (id: string) => {
  try {
    const semester = await prisma.semesters.findUnique({
      where: { id },
      include: {
        center: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return semester;
  } catch (error: unknown) {
    console.error("Error fetching semester by ID:", error);
    return "Failed to fetch semester";
  }
};

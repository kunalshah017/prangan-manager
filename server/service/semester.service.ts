import { prisma } from "../lib/prisma.js";
import type {
  CreateSemesterInput,
  UpdateSemesterInput,
} from "../types/semester.type.js";
import { convertToDateTime } from "../utils/dateHelpers.js";
import { AcademicLevelServiceError } from "./academic-level.service.js";
import { SemesterStatus } from "../generated/prisma/index.js";
import { initializeSemesterTransition } from "./semester-transition.service.js";

const levelInclude = {
  where: { isActive: true },
  include: { academicLevel: true },
  orderBy: { academicLevel: { journeyOrder: "asc" as const } },
};

export const CreateSemester = async (
  semesterData: CreateSemesterInput,
  updatedBy?: string,
) =>
  prisma.$transaction(async (transaction) => {
    const academicLevels = await transaction.academicLevel.findMany({
      where: semesterData.academicLevelIds
        ? { id: { in: semesterData.academicLevelIds }, isActive: true }
        : { isActive: true },
      select: { id: true },
      orderBy: { journeyOrder: "asc" },
    });
    if (
      academicLevels.length === 0 ||
      (semesterData.academicLevelIds &&
        academicLevels.length !== semesterData.academicLevelIds.length)
    ) {
      throw new AcademicLevelServiceError(
        "At least one selected academic level must be active",
        422,
      );
    }

    const semester = await transaction.semesters.create({
      data: {
        name: semesterData.name,
        startDate: convertToDateTime(semesterData.startDate, false)!,
        endDate: convertToDateTime(semesterData.endDate, true)!,
        centerId: semesterData.centerId,
        ...(updatedBy && { status: SemesterStatus.DRAFT }),
      },
    });
    await transaction.semesterLevel.createMany({
      data: academicLevels.map((level) => ({
        semesterId: semester.id,
        academicLevelId: level.id,
        isActive: true,
      })),
    });
    if (updatedBy) {
      await initializeSemesterTransition(transaction, {
        semesterId: semester.id,
        sourceSemesterId: semesterData.sourceSemesterId,
        updatedBy,
      });
    }

    return transaction.semesters.findUnique({
      where: { id: semester.id },
      include: { levels: levelInclude, transition: true },
    });
  });

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
        levels: levelInclude,
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
  semesterData: UpdateSemesterInput,
) =>
  prisma.$transaction(async (transaction) => {
    const { academicLevelIds, ...semesterFields } = semesterData;
    const existingSemester = await transaction.semesters.findUnique({
      where: { id },
      select: { startDate: true, endDate: true },
    });
    if (!existingSemester)
      throw new AcademicLevelServiceError("Semester not found", 404);

    if (
      semesterFields.startDate !== undefined ||
      semesterFields.endDate !== undefined
    ) {
      const startDate =
        semesterFields.startDate ??
        existingSemester.startDate.toISOString().slice(0, 10);
      const endDate =
        semesterFields.endDate ??
        existingSemester.endDate.toISOString().slice(0, 10);
      if (startDate > endDate) {
        throw new AcademicLevelServiceError(
          "endDate must not be before startDate",
          400,
        );
      }
    }

    if (academicLevelIds) {
      const activeLevels = await transaction.academicLevel.findMany({
        where: { id: { in: academicLevelIds }, isActive: true },
        select: { id: true },
      });
      if (activeLevels.length !== academicLevelIds.length) {
        throw new AcademicLevelServiceError(
          "Every selected academic level must be active",
          422,
        );
      }
    }

    await transaction.semesters.update({
      where: { id },
      data: {
        ...(semesterFields.name !== undefined && {
          name: semesterFields.name,
        }),
        ...(semesterFields.startDate !== undefined && {
          startDate: convertToDateTime(semesterFields.startDate, false),
        }),
        ...(semesterFields.endDate !== undefined && {
          endDate: convertToDateTime(semesterFields.endDate, true),
        }),
      },
    });

    if (academicLevelIds) {
      for (const academicLevelId of academicLevelIds) {
        await transaction.semesterLevel.upsert({
          where: {
            semesterId_academicLevelId: { semesterId: id, academicLevelId },
          },
          create: { semesterId: id, academicLevelId, isActive: true },
          update: { isActive: true },
        });
      }
      await transaction.semesterLevel.updateMany({
        where: {
          semesterId: id,
          academicLevelId: { notIn: academicLevelIds },
          isActive: true,
        },
        data: { isActive: false },
      });
    }

    return transaction.semesters.findUnique({
      where: { id },
      include: { levels: levelInclude },
    });
  });

export const deleteSemester = async (id: string) => {
  try {
    const enrollmentCount = await prisma.studentEnrollments.count({
      where: { semesterId: id },
    });

    if (enrollmentCount > 0) {
      return "Cannot delete semester while enrollments exist";
    }

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
        levels: levelInclude,
      },
    });
    return semester;
  } catch (error: unknown) {
    console.error("Error fetching semester by ID:", error);
    return "Failed to fetch semester";
  }
};

export const getSemesterScope = async (id: string) => {
  const semester = await prisma.semesters.findUnique({
    where: { id },
    select: {
      centerId: true,
      center: { select: { projectId: true } },
    },
  });

  return semester
    ? {
        projectId: semester.center.projectId,
        centerId: semester.centerId,
        semesterId: id,
      }
    : null;
};

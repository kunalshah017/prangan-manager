import type { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import type {
  CreateAcademicLevelRequest,
  UpdateAcademicLevelRequest,
} from "../types/academic-level.types.js";

export class AcademicLevelServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

export const listAcademicLevels = (includeArchived = false) =>
  prisma.academicLevel.findMany({
    where: includeArchived ? {} : { isActive: true },
    orderBy: { journeyOrder: "asc" },
  });

export const createAcademicLevel = async (input: CreateAcademicLevelRequest) =>
  prisma.$transaction(async (transaction) => {
    const levels = await transaction.academicLevel.findMany({
      orderBy: { journeyOrder: "asc" },
    });
    const insertionIndex = input.afterLevelId
      ? levels.findIndex((level) => level.id === input.afterLevelId) + 1
      : levels.length;

    if (input.afterLevelId && insertionIndex === 0) {
      throw new AcademicLevelServiceError("Academic level not found", 404);
    }

    const temporaryStart =
      levels.length > 0
        ? Math.min(...levels.map((level) => level.journeyOrder)) - 1
        : -1;
    for (const [index, level] of levels.entries()) {
      await transaction.academicLevel.update({
        where: { id: level.id },
        data: { journeyOrder: temporaryStart - index },
      });
    }
    for (const [index, level] of levels.entries()) {
      const finalIndex = index < insertionIndex ? index : index + 1;
      await transaction.academicLevel.update({
        where: { id: level.id },
        data: { journeyOrder: (finalIndex + 1) * 100 },
      });
    }

    return transaction.academicLevel.create({
      data: {
        code: input.code,
        name: input.name,
        journeyOrder: (insertionIndex + 1) * 100,
      },
    });
  });

export const updateAcademicLevel = (
  id: string,
  input: UpdateAcademicLevelRequest,
) =>
  prisma.academicLevel.update({
    where: { id },
    data: input,
  });

export const reorderAcademicLevels = (orderedIds: string[]) =>
  prisma.$transaction(async (transaction) => {
    const levels = await transaction.academicLevel.findMany({
      where: { isActive: true },
      select: { id: true, journeyOrder: true },
    });
    const existingIds = new Set(levels.map((level) => level.id));
    if (
      levels.length !== orderedIds.length ||
      orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new AcademicLevelServiceError(
        "orderedIds must contain every academic level exactly once",
        422,
      );
    }

    const temporaryStart =
      Math.min(...levels.map((level) => level.journeyOrder)) - 1;
    for (const [index, id] of orderedIds.entries()) {
      await transaction.academicLevel.update({
        where: { id },
        data: { journeyOrder: temporaryStart - index },
      });
    }
    for (const [index, id] of orderedIds.entries()) {
      await transaction.academicLevel.update({
        where: { id },
        data: { journeyOrder: (index + 1) * 100 },
      });
    }

    return transaction.academicLevel.findMany({
      where: { isActive: true },
      orderBy: { journeyOrder: "asc" },
    });
  });

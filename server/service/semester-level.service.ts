import type { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import { AcademicLevelServiceError } from "./academic-level.service.js";

export class InvalidSemesterLevelError extends AcademicLevelServiceError {
  constructor() {
    super("Semester level is not active for this semester", 422);
  }
}

const orderedSemesterLevels = (
  client: Prisma.TransactionClient | typeof prisma,
  semesterId: string,
  includeInactive = false,
) =>
  client.semesterLevel.findMany({
    where: {
      semesterId,
      ...(!includeInactive && { isActive: true }),
    },
    include: { academicLevel: true },
    orderBy: { academicLevel: { journeyOrder: "asc" } },
  });

export const listSemesterLevels = (
  semesterId: string,
  includeInactive = false,
) => orderedSemesterLevels(prisma, semesterId, includeInactive);

export const replaceSemesterLevels = async (
  semesterId: string,
  academicLevelIds: string[],
) => {
  if (academicLevelIds.length === 0) {
    throw new AcademicLevelServiceError(
      "At least one academic level is required",
      422,
    );
  }

  return prisma.$transaction(async (transaction) => {
    const semester = await transaction.semesters.findUnique({
      where: { id: semesterId },
      select: { id: true },
    });
    if (!semester)
      throw new AcademicLevelServiceError("Semester not found", 404);

    const selectableLevels = await transaction.academicLevel.findMany({
      where: {
        id: { in: academicLevelIds },
        OR: [
          { isActive: true },
          {
            semesterLevels: {
              some: { semesterId, isActive: true },
            },
          },
        ],
      },
      select: { id: true },
    });
    if (selectableLevels.length !== academicLevelIds.length) {
      throw new AcademicLevelServiceError(
        "Every selected academic level must be active or already enabled for this semester",
        422,
      );
    }

    for (const academicLevelId of academicLevelIds) {
      await transaction.semesterLevel.upsert({
        where: {
          semesterId_academicLevelId: { semesterId, academicLevelId },
        },
        create: { semesterId, academicLevelId, isActive: true },
        update: { isActive: true },
      });
    }
    await transaction.semesterLevel.updateMany({
      where: {
        semesterId,
        academicLevelId: { notIn: academicLevelIds },
        isActive: true,
      },
      data: { isActive: false },
    });

    return orderedSemesterLevels(transaction, semesterId);
  });
};

export const requireActiveSemesterLevel = async (input: {
  semesterId: string;
  semesterLevelId: string;
}) => {
  const row = await prisma.semesterLevel.findFirst({
    where: {
      id: input.semesterLevelId,
      semesterId: input.semesterId,
      isActive: true,
    },
    include: { academicLevel: true },
  });
  if (!row) throw new InvalidSemesterLevelError();
  return row;
};

export const resolveLegacyLevelCode = async (
  semesterId: string,
  code: string,
) => {
  const row = await prisma.semesterLevel.findFirst({
    where: {
      semesterId,
      isActive: true,
      academicLevel: { code },
    },
    include: { academicLevel: true },
  });
  if (!row) throw new InvalidSemesterLevelError();
  return row;
};

export const resolveSemesterLevelInput = async (input: {
  semesterId?: string | null;
  semesterLevelId?: string | null;
  level?: string | null;
}) => {
  if (input.semesterLevelId && !input.semesterId) {
    throw new AcademicLevelServiceError(
      "Semester is required when semester level is provided",
      422,
    );
  }
  if (!input.semesterId || (!input.semesterLevelId && !input.level)) {
    throw new AcademicLevelServiceError(
      "Semester and semester level are required",
      422,
    );
  }

  const semesterLevel = input.semesterLevelId
    ? await requireActiveSemesterLevel({
        semesterId: input.semesterId,
        semesterLevelId: input.semesterLevelId,
      })
    : await resolveLegacyLevelCode(input.semesterId, input.level!);

  if (input.level && semesterLevel.academicLevel.code !== input.level) {
    throw new AcademicLevelServiceError(
      "Semester level does not match legacy level",
      422,
    );
  }

  return semesterLevel;
};

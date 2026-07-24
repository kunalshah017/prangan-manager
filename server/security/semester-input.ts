import type {
  CreateSemesterInput,
  UpdateSemesterInput,
} from "../types/semester.type.js";
import { isValidDateFormat } from "../utils/dateHelpers.js";

type ParseResult<T> = { data: T } | { error: string };

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null && !Array.isArray(input);

const hasOnlyKeys = (input: Record<string, unknown>, allowed: string[]) =>
  Object.keys(input).every((key) => allowed.includes(key));

const isCanonicalId = (input: unknown): input is string =>
  typeof input === "string" && input.length > 0 && input === input.trim();

const parseName = (input: unknown): string | null => {
  if (typeof input !== "string") return null;
  const name = input.trim();
  return name.length >= 1 && name.length <= 100 ? name : null;
};

const parseLevelIds = (input: unknown): string[] | null => {
  if (!Array.isArray(input) || input.length === 0) return null;
  if (!input.every(isCanonicalId)) return null;
  return new Set(input).size === input.length ? input : null;
};

const datesAreOrdered = (startDate: string, endDate: string) =>
  startDate <= endDate;

export const parseCreateSemesterRequest = (
  input: unknown,
): ParseResult<CreateSemesterInput> => {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, [
      "name",
      "startDate",
      "endDate",
      "centerId",
      "academicLevelIds",
      "sourceSemesterId",
    ])
  ) {
    return { error: "Semester data is invalid" };
  }

  const name = parseName(input.name);
  if (!name) return { error: "name must contain 1 to 100 characters" };
  if (!isValidDateFormat(input.startDate as string))
    return { error: "startDate must be a valid YYYY-MM-DD date" };
  if (!isValidDateFormat(input.endDate as string))
    return { error: "endDate must be a valid YYYY-MM-DD date" };
  if (!datesAreOrdered(input.startDate as string, input.endDate as string))
    return { error: "endDate must not be before startDate" };
  if (!isCanonicalId(input.centerId))
    return { error: "centerId must be a canonical ID" };
  if (
    "sourceSemesterId" in input &&
    input.sourceSemesterId !== undefined &&
    input.sourceSemesterId !== null &&
    !isCanonicalId(input.sourceSemesterId)
  ) {
    return { error: "sourceSemesterId must be a canonical ID" };
  }

  const academicLevelIds =
    "academicLevelIds" in input
      ? parseLevelIds(input.academicLevelIds)
      : undefined;
  if (academicLevelIds === null)
    return { error: "academicLevelIds must contain unique non-empty IDs" };

  return {
    data: {
      name,
      startDate: input.startDate as string,
      endDate: input.endDate as string,
      centerId: input.centerId,
      ...(academicLevelIds && { academicLevelIds }),
      ...(typeof input.sourceSemesterId === "string" && {
        sourceSemesterId: input.sourceSemesterId,
      }),
    },
  };
};

export const parseUpdateSemesterRequest = (
  input: unknown,
): ParseResult<UpdateSemesterInput> => {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ["name", "startDate", "endDate", "academicLevelIds"])
  ) {
    return { error: "Semester update data is invalid" };
  }
  if (Object.keys(input).length === 0)
    return { error: "At least one semester field is required" };

  const name = "name" in input ? parseName(input.name) : undefined;
  if (name === null) return { error: "name must contain 1 to 100 characters" };
  if ("startDate" in input && !isValidDateFormat(input.startDate as string)) {
    return { error: "startDate must be a valid YYYY-MM-DD date" };
  }
  if ("endDate" in input && !isValidDateFormat(input.endDate as string))
    return { error: "endDate must be a valid YYYY-MM-DD date" };
  if (
    typeof input.startDate === "string" &&
    typeof input.endDate === "string" &&
    !datesAreOrdered(input.startDate, input.endDate)
  ) {
    return { error: "endDate must not be before startDate" };
  }

  const academicLevelIds =
    "academicLevelIds" in input
      ? parseLevelIds(input.academicLevelIds)
      : undefined;
  if (academicLevelIds === null)
    return { error: "academicLevelIds must contain unique non-empty IDs" };

  return {
    data: {
      ...(typeof name === "string" && { name }),
      ...(typeof input.startDate === "string" && {
        startDate: input.startDate,
      }),
      ...(typeof input.endDate === "string" && { endDate: input.endDate }),
      ...(academicLevelIds && { academicLevelIds }),
    },
  };
};

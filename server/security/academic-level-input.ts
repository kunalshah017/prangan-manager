import type {
  CreateAcademicLevelRequest,
  ReorderAcademicLevelsRequest,
  ReplaceSemesterLevelsRequest,
  UpdateAcademicLevelRequest,
} from "../types/academic-level.types.js";

type ParseResult<T> = { data: T } | { error: string };

const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,49}$/;

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

const parseUniqueIds = (input: unknown): string[] | null => {
  if (!Array.isArray(input) || input.length === 0) return null;
  if (!input.every(isCanonicalId)) return null;
  return new Set(input).size === input.length ? input : null;
};

export const parseCreateAcademicLevelRequest = (
  input: unknown,
): ParseResult<CreateAcademicLevelRequest> => {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ["code", "name", "afterLevelId"])
  ) {
    return { error: "Academic level data is invalid" };
  }

  const name = parseName(input.name);
  if (typeof input.code !== "string" || !CODE_PATTERN.test(input.code))
    return { error: "code must be an immutable uppercase identifier" };
  if (!name) return { error: "name must contain 1 to 100 characters" };
  if ("afterLevelId" in input && !isCanonicalId(input.afterLevelId))
    return { error: "afterLevelId must be a canonical ID" };

  return {
    data: {
      code: input.code,
      name,
      ...(typeof input.afterLevelId === "string" && {
        afterLevelId: input.afterLevelId,
      }),
    },
  };
};

export const parseUpdateAcademicLevelRequest = (
  input: unknown,
): ParseResult<UpdateAcademicLevelRequest> => {
  if (!isRecord(input) || !hasOnlyKeys(input, ["name", "isActive"]))
    return { error: "Academic level update data is invalid" };
  if (Object.keys(input).length === 0)
    return { error: "At least one academic level field is required" };

  const name = "name" in input ? parseName(input.name) : undefined;
  if (name === null) return { error: "name must contain 1 to 100 characters" };
  if ("isActive" in input && typeof input.isActive !== "boolean")
    return { error: "isActive must be a boolean" };

  return {
    data: {
      ...(typeof name === "string" && { name }),
      ...(typeof input.isActive === "boolean" && { isActive: input.isActive }),
    },
  };
};

export const parseReorderAcademicLevelsRequest = (
  input: unknown,
): ParseResult<ReorderAcademicLevelsRequest> => {
  if (!isRecord(input) || !hasOnlyKeys(input, ["orderedIds"]))
    return { error: "Academic level order data is invalid" };
  const orderedIds = parseUniqueIds(input.orderedIds);
  return orderedIds
    ? { data: { orderedIds } }
    : { error: "orderedIds must contain unique non-empty IDs" };
};

export const parseReplaceSemesterLevelsRequest = (
  input: unknown,
): ParseResult<ReplaceSemesterLevelsRequest> => {
  if (!isRecord(input) || !hasOnlyKeys(input, ["academicLevelIds"]))
    return { error: "Semester level data is invalid" };
  const academicLevelIds = parseUniqueIds(input.academicLevelIds);
  return academicLevelIds
    ? { data: { academicLevelIds } }
    : { error: "academicLevelIds must contain unique non-empty IDs" };
};

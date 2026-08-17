import { AssessmentCycle } from "../generated/prisma/index.js";
import type {
  CreateExamRequest,
  UpdateExamRequest,
} from "../types/exam.types.js";

type ParseResult<T> = { data: T } | { error: string };

export const parseAssessmentCycle = (
  input: unknown,
): ParseResult<AssessmentCycle> =>
  typeof input === "string" &&
  Object.values(AssessmentCycle).includes(input as AssessmentCycle)
    ? { data: input as AssessmentCycle }
    : { error: "Invalid assessment cycle" };

export const parseOptionalAssessmentCycle = (
  input: unknown,
): ParseResult<AssessmentCycle | undefined> =>
  input === undefined ? { data: undefined } : parseAssessmentCycle(input);

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null && !Array.isArray(input);

const isCanonicalId = (input: unknown): input is string =>
  typeof input === "string" && input.length > 0 && input === input.trim();

const isNonblankString = (input: unknown): input is string =>
  typeof input === "string" && input.trim().length > 0;

const isPositiveMark = (input: unknown): input is number =>
  typeof input === "number" && Number.isFinite(input) && input > 0;

const isDate = (input: unknown): input is string =>
  typeof input === "string" &&
  input.trim().length > 0 &&
  !Number.isNaN(Date.parse(input));

const isWeekendDate = (input: unknown): input is string => {
  if (!isDate(input)) return false;
  const day = new Date(input).getUTCDay();
  return day === 0 || day === 6;
};

const createFields = new Set([
  "projectId",
  "centerId",
  "semesterId",
  "semesterLevelId",
  "cycle",
  "name",
  "description",
  "examDate",
  "listeningMaxMarks",
  "speakingMaxMarks",
  "readingMaxMarks",
  "writingMaxMarks",
]);

const updateFields = new Set([
  "name",
  "description",
  "semesterLevelId",
  "cycle",
  "examDate",
  "listeningMaxMarks",
  "speakingMaxMarks",
  "readingMaxMarks",
  "writingMaxMarks",
  "isActive",
]);

export const parseCreateExamRequest = (
  input: unknown,
): ParseResult<CreateExamRequest> => {
  if (!isRecord(input)) return { error: "Exam data is invalid" };
  if (Object.keys(input).some((field) => !createFields.has(field))) {
    return { error: "Exam data contains unsupported fields" };
  }
  const cycle = parseAssessmentCycle(input.cycle);
  if ("error" in cycle) return cycle;
  if (
    !isCanonicalId(input.projectId) ||
    !isCanonicalId(input.centerId) ||
    !isCanonicalId(input.semesterId) ||
    !isCanonicalId(input.semesterLevelId) ||
    !isNonblankString(input.name) ||
    !isWeekendDate(input.examDate) ||
    !isPositiveMark(input.listeningMaxMarks) ||
    !isPositiveMark(input.speakingMaxMarks) ||
    !isPositiveMark(input.readingMaxMarks) ||
    !isPositiveMark(input.writingMaxMarks)
  ) {
    return { error: "Exam fields are invalid or incomplete" };
  }
  if (
    input.description !== undefined &&
    typeof input.description !== "string"
  ) {
    return { error: "description must be a string" };
  }

  return {
    data: {
      projectId: input.projectId,
      centerId: input.centerId,
      semesterId: input.semesterId,
      semesterLevelId: input.semesterLevelId,
      cycle: cycle.data,
      name: input.name,
      ...(typeof input.description === "string" && {
        description: input.description,
      }),
      examDate: input.examDate,
      listeningMaxMarks: input.listeningMaxMarks,
      speakingMaxMarks: input.speakingMaxMarks,
      readingMaxMarks: input.readingMaxMarks,
      writingMaxMarks: input.writingMaxMarks,
    },
  };
};

export const parseUpdateExamRequest = (
  input: unknown,
): ParseResult<UpdateExamRequest> => {
  if (!isRecord(input) || Object.keys(input).length === 0) {
    return { error: "Exam update must be a nonempty object" };
  }
  if (Object.keys(input).some((field) => !updateFields.has(field))) {
    return { error: "Exam update contains unsupported fields" };
  }
  const cycle = parseOptionalAssessmentCycle(input.cycle);
  if ("error" in cycle) return cycle;
  if ("name" in input && !isNonblankString(input.name)) {
    return { error: "name must be a nonblank string" };
  }
  if ("description" in input && typeof input.description !== "string") {
    return { error: "description must be a string" };
  }
  if ("semesterLevelId" in input && !isCanonicalId(input.semesterLevelId)) {
    return { error: "semesterLevelId must be a canonical ID" };
  }
  if ("examDate" in input && !isWeekendDate(input.examDate)) {
    return { error: "Exam date must be Saturday or Sunday" };
  }
  for (const field of [
    "listeningMaxMarks",
    "speakingMaxMarks",
    "readingMaxMarks",
    "writingMaxMarks",
  ] as const) {
    if (field in input && !isPositiveMark(input[field])) {
      return { error: `${field} must be a positive finite number` };
    }
  }
  if ("isActive" in input && typeof input.isActive !== "boolean") {
    return { error: "isActive must be a boolean" };
  }

  return {
    data: {
      ...(typeof input.name === "string" && { name: input.name }),
      ...(typeof input.description === "string" && {
        description: input.description,
      }),
      ...(isCanonicalId(input.semesterLevelId) && {
        semesterLevelId: input.semesterLevelId,
      }),
      ...(cycle.data !== undefined && { cycle: cycle.data }),
      ...(typeof input.examDate === "string" && { examDate: input.examDate }),
      ...(isPositiveMark(input.listeningMaxMarks) && {
        listeningMaxMarks: input.listeningMaxMarks,
      }),
      ...(isPositiveMark(input.speakingMaxMarks) && {
        speakingMaxMarks: input.speakingMaxMarks,
      }),
      ...(isPositiveMark(input.readingMaxMarks) && {
        readingMaxMarks: input.readingMaxMarks,
      }),
      ...(isPositiveMark(input.writingMaxMarks) && {
        writingMaxMarks: input.writingMaxMarks,
      }),
      ...(typeof input.isActive === "boolean" && { isActive: input.isActive }),
    },
  };
};

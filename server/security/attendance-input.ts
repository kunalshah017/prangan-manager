import { AttendanceStatus } from "../generated/prisma/index.js";
import type {
  MarkAttendanceRequest,
  MarkBulkAttendanceRequest,
} from "../types/attendance.types.js";

type ParseResult<T> = { data: T } | { error: string };

type AttendanceEntry = MarkBulkAttendanceRequest["attendances"][number];

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null && !Array.isArray(input);

const isCanonicalNonblankString = (input: unknown): input is string =>
  typeof input === "string" && input.length > 0 && input === input.trim();

const isDate = (input: unknown): input is string => {
  if (!isCanonicalNonblankString(input) || !datePattern.test(input)) {
    return false;
  }

  const [year, month, day] = input.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const isAttendanceStatus = (input: unknown): input is AttendanceStatus =>
  typeof input === "string" &&
  Object.values(AttendanceStatus).includes(input as AttendanceStatus);

const parseEntry = (input: unknown): ParseResult<AttendanceEntry> => {
  if (!isRecord(input)) {
    return { error: "Each attendance entry must be an object" };
  }

  if (
    !isCanonicalNonblankString(input.userId) ||
    !isCanonicalNonblankString(input.roleAssignmentId)
  ) {
    return {
      error:
        "Each attendance entry must have canonical userId and roleAssignmentId",
    };
  }

  if (!isAttendanceStatus(input.status)) {
    return { error: "Invalid attendance status" };
  }

  if ("notes" in input && typeof input.notes !== "string") {
    return { error: "Attendance notes must be a string" };
  }

  if (input.status === AttendanceStatus.HOLIDAY) {
    if (
      typeof input.holidayReason !== "string" ||
      input.holidayReason.trim().length === 0
    ) {
      return { error: "Holiday reason is required when marking as holiday" };
    }
  } else if ("holidayReason" in input) {
    return { error: "Holiday reason is only allowed when marking as holiday" };
  }

  return {
    data: {
      userId: input.userId,
      roleAssignmentId: input.roleAssignmentId,
      status: input.status,
      ...(typeof input.notes === "string" && { notes: input.notes }),
      ...(typeof input.holidayReason === "string" && {
        holidayReason: input.holidayReason,
      }),
    },
  };
};

const parseScope = (
  input: Record<string, unknown>,
): ParseResult<{
  date: string;
  projectId: string;
  centerId: string;
  semesterId: string;
}> => {
  if (!isDate(input.date)) {
    return { error: "Date must be in YYYY-MM-DD format" };
  }

  if (
    !isCanonicalNonblankString(input.projectId) ||
    !isCanonicalNonblankString(input.centerId) ||
    !isCanonicalNonblankString(input.semesterId)
  ) {
    return {
      error: "projectId, centerId, and semesterId must be canonical IDs",
    };
  }

  return {
    data: {
      date: input.date,
      projectId: input.projectId,
      centerId: input.centerId,
      semesterId: input.semesterId,
    },
  };
};

export const parseMarkAttendanceRequest = (
  input: unknown,
): ParseResult<MarkAttendanceRequest> => {
  if (!isRecord(input)) {
    return { error: "Attendance data is invalid" };
  }

  const scope = parseScope(input);
  if ("error" in scope) return scope;

  const entry = parseEntry(input);
  if ("error" in entry) return entry;

  return { data: { ...scope.data, ...entry.data } };
};

export const parseMarkBulkAttendanceRequest = (
  input: unknown,
): ParseResult<MarkBulkAttendanceRequest> => {
  if (!isRecord(input)) {
    return { error: "Bulk attendance data is invalid" };
  }

  const scope = parseScope(input);
  if ("error" in scope) return scope;

  if (!Array.isArray(input.attendances) || input.attendances.length === 0) {
    return { error: "attendances must be a non-empty array" };
  }

  const attendances: AttendanceEntry[] = [];
  for (const attendance of input.attendances) {
    const parsed = parseEntry(attendance);
    if ("error" in parsed) return parsed;
    attendances.push(parsed.data);
  }

  return { data: { ...scope.data, attendances } };
};

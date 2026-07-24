import { StudentAttendanceStatus } from "../generated/prisma/index.js";
import type {
  BulkStudentAttendanceInput,
  StudentAttendanceCreateInput,
  StudentAttendanceUpdateInput,
} from "../types/student-attendance.types.js";

const updateFields = new Set(["status", "notes", "holidayReason"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

type StudentAttendanceParseResult<T> = { data: T } | { error: string };

type StudentAttendanceUpdateParseResult =
  StudentAttendanceParseResult<StudentAttendanceUpdateInput>;
type StudentAttendanceCreateParseResult =
  StudentAttendanceParseResult<StudentAttendanceCreateInput>;
type BulkStudentAttendanceParseResult =
  StudentAttendanceParseResult<BulkStudentAttendanceInput>;

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null && !Array.isArray(input);

const isCanonicalString = (input: unknown): input is string =>
  typeof input === "string" && input.length > 0 && input === input.trim();

const isDate = (input: unknown): input is string => {
  if (!isCanonicalString(input) || !datePattern.test(input)) {
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

const isNonblankString = (input: unknown): input is string =>
  typeof input === "string" && input.trim().length > 0;

const isAttendanceStatus = (input: unknown): input is StudentAttendanceStatus =>
  typeof input === "string" &&
  Object.values(StudentAttendanceStatus).includes(
    input as StudentAttendanceStatus,
  );

const holidayReasonFor = (
  status: StudentAttendanceStatus,
  holidayReason: unknown,
): string | null | undefined => {
  if (status !== StudentAttendanceStatus.HOLIDAY) return null;
  return isNonblankString(holidayReason) ? holidayReason : undefined;
};

export const parseStudentAttendanceCreate = (
  input: unknown,
): StudentAttendanceCreateParseResult => {
  if (!isRecord(input)) {
    return { error: "Student attendance data is invalid" };
  }

  const requiredFields = [
    "studentId",
    "enrollmentId",
    "date",
    "projectId",
    "centerId",
    "semesterId",
  ] as const;
  if (requiredFields.some((field) => !isCanonicalString(input[field]))) {
    return {
      error: "Student attendance IDs and date must be canonical strings",
    };
  }
  const studentId = input.studentId as string;
  const enrollmentId = input.enrollmentId as string;
  const date = input.date as string;
  const projectId = input.projectId as string;
  const centerId = input.centerId as string;
  const semesterId = input.semesterId as string;
  if (!isDate(date)) {
    return { error: "Date must be in YYYY-MM-DD format" };
  }
  if (!isAttendanceStatus(input.status)) {
    return { error: "Attendance status is invalid" };
  }
  if ("notes" in input && typeof input.notes !== "string") {
    return { error: "Attendance notes must be a string" };
  }

  const holidayReason = holidayReasonFor(input.status, input.holidayReason);
  if (
    input.status === StudentAttendanceStatus.HOLIDAY &&
    holidayReason === undefined
  ) {
    return {
      error: "A holiday reason is required when marking attendance as HOLIDAY",
    };
  }

  return {
    data: {
      studentId,
      enrollmentId,
      date,
      projectId,
      centerId,
      semesterId,
      status: input.status,
      ...(typeof input.notes === "string" && { notes: input.notes }),
      ...(holidayReason && { holidayReason }),
    },
  };
};

export const parseBulkStudentAttendance = (
  input: unknown,
): BulkStudentAttendanceParseResult => {
  if (!isRecord(input)) {
    return { error: "Bulk student attendance data is invalid" };
  }

  const requiredFields = [
    "date",
    "projectId",
    "centerId",
    "semesterId",
  ] as const;
  if (requiredFields.some((field) => !isCanonicalString(input[field]))) {
    return { error: "Bulk attendance IDs and date must be canonical strings" };
  }
  const date = input.date as string;
  const projectId = input.projectId as string;
  const centerId = input.centerId as string;
  const semesterId = input.semesterId as string;
  if (!isDate(date)) {
    return { error: "Date must be in YYYY-MM-DD format" };
  }
  if (!isAttendanceStatus(input.status)) {
    return { error: "Attendance status is invalid" };
  }
  if (
    !Array.isArray(input.studentAttendances) ||
    input.studentAttendances.length === 0
  ) {
    return { error: "Date and student attendances array are required" };
  }

  const studentAttendances: BulkStudentAttendanceInput["studentAttendances"] =
    [];
  let requiresHolidayReason = input.status === StudentAttendanceStatus.HOLIDAY;
  for (const attendance of input.studentAttendances) {
    if (!isRecord(attendance)) {
      return { error: "Student attendance entry is invalid" };
    }
    if (
      !isCanonicalString(attendance.studentId) ||
      !isCanonicalString(attendance.enrollmentId)
    ) {
      return { error: "Student and enrollment IDs must be canonical strings" };
    }
    if ("status" in attendance && !isAttendanceStatus(attendance.status)) {
      return { error: "Attendance status is invalid" };
    }
    if ("notes" in attendance && typeof attendance.notes !== "string") {
      return { error: "Attendance notes must be a string" };
    }

    const studentId = attendance.studentId as string;
    const enrollmentId = attendance.enrollmentId as string;
    const status = attendance.status ?? input.status;
    requiresHolidayReason ||= status === StudentAttendanceStatus.HOLIDAY;
    studentAttendances.push({
      studentId,
      enrollmentId,
      ...(isAttendanceStatus(attendance.status) && {
        status: attendance.status,
      }),
      ...(typeof attendance.notes === "string" && { notes: attendance.notes }),
    });
  }

  const holidayReason = requiresHolidayReason
    ? holidayReasonFor(StudentAttendanceStatus.HOLIDAY, input.holidayReason)
    : null;
  if (requiresHolidayReason && holidayReason === undefined) {
    return {
      error: "A holiday reason is required when marking attendance as HOLIDAY",
    };
  }

  return {
    data: {
      date,
      projectId,
      centerId,
      semesterId,
      status: input.status,
      studentAttendances,
      ...(holidayReason && { holidayReason }),
    },
  };
};

export const parseStudentAttendanceUpdate = (
  input: unknown,
): StudentAttendanceUpdateParseResult => {
  if (!isRecord(input)) {
    return { error: "Attendance update data is invalid" };
  }

  const record = input;
  if (Object.keys(record).some((field) => !updateFields.has(field))) {
    return { error: "Only status, notes, and holidayReason may be updated" };
  }

  if (Object.keys(record).length === 0) {
    return { error: "At least one attendance field must be updated" };
  }

  if (
    "status" in record &&
    !Object.values(StudentAttendanceStatus).includes(
      record.status as StudentAttendanceStatus,
    )
  ) {
    return { error: "Attendance status is invalid" };
  }

  if ("notes" in record && typeof record.notes !== "string") {
    return { error: "Attendance notes must be a string" };
  }

  if (
    "holidayReason" in record &&
    (typeof record.holidayReason !== "string" ||
      record.holidayReason.trim().length === 0)
  ) {
    return { error: "Holiday reason must be a non-empty string" };
  }

  if (
    record.status === StudentAttendanceStatus.HOLIDAY &&
    !record.holidayReason
  ) {
    return {
      error: "A holiday reason is required when marking attendance as HOLIDAY",
    };
  }

  if (
    "holidayReason" in record &&
    record.status !== StudentAttendanceStatus.HOLIDAY
  ) {
    return { error: "A holiday reason can only be set when status is HOLIDAY" };
  }

  const data: StudentAttendanceUpdateInput = {};
  if ("status" in record)
    data.status = record.status as StudentAttendanceStatus;
  if ("notes" in record) data.notes = record.notes as string;
  if ("holidayReason" in record)
    data.holidayReason = record.holidayReason as string;
  if (
    record.status === StudentAttendanceStatus.PRESENT ||
    record.status === StudentAttendanceStatus.ABSENT
  ) {
    data.holidayReason = null;
  }

  return { data };
};

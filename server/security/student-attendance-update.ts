import { isValidDateFormat } from "../utils/dateHelpers.js";
import { StudentAttendanceStatus } from "../generated/prisma/index.js";
import type { BulkStudentAttendanceInput } from "../types/student-attendance.types.js";

type StudentAttendanceParseResult<T> = { data: T } | { error: string };

type BulkStudentAttendanceParseResult =
  StudentAttendanceParseResult<BulkStudentAttendanceInput>;

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null && !Array.isArray(input);

const isCanonicalString = (input: unknown): input is string =>
  typeof input === "string" && input.length > 0 && input === input.trim();

const isDate = (input: unknown): input is string =>
  typeof input === "string" && isValidDateFormat(input);

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

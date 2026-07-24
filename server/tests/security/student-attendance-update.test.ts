import assert from "node:assert/strict";
import test from "node:test";

import {
  getAttendanceByDate,
  getStudentAttendance,
  getStudentAttendanceById,
  getStudentAttendanceStats,
  getStudentsWithoutAttendance,
} from "../../controllers/student-attendance.controller.js";
import { Role } from "../../generated/prisma/index.js";
import {
  parseBulkStudentAttendance,
  parseStudentAttendanceCreate,
  parseStudentAttendanceUpdate,
} from "../../security/student-attendance-update.js";

const createReply = () => {
  let statusCode: number | undefined;
  let payload: unknown;

  const reply = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    send(value: unknown) {
      payload = value;
      return this;
    },
  };

  return {
    reply,
    get statusCode() {
      return statusCode;
    },
    get payload() {
      return payload;
    },
  };
};

test("student attendance create and bulk parsing reject non-record bodies", () => {
  for (const input of [null, [], "attendance", 42]) {
    assert.deepEqual(parseStudentAttendanceCreate(input), {
      error: "Student attendance data is invalid",
    });
    assert.deepEqual(parseBulkStudentAttendance(input), {
      error: "Bulk student attendance data is invalid",
    });
  }
});

test("student attendance create and bulk parsing reject calendar-invalid dates", () => {
  assert.deepEqual(
    parseStudentAttendanceCreate({
      studentId: "student-1",
      enrollmentId: "enrollment-1",
      date: "2026-02-30",
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      status: "PRESENT",
    }),
    { error: "Date must be in YYYY-MM-DD format" },
  );
  assert.deepEqual(
    parseBulkStudentAttendance({
      date: "2026-02-30",
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      status: "PRESENT",
      studentAttendances: [
        { studentId: "student-1", enrollmentId: "enrollment-1" },
      ],
    }),
    { error: "Date must be in YYYY-MM-DD format" },
  );
});

test("student attendance read controllers reject calendar-invalid dates before services", async () => {
  const admin = {
    id: "admin-1",
    name: "Admin",
    email: "admin@example.com",
    role: Role.ADMIN,
  };
  const scope = {
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
  };

  for (const [controller, request] of [
    [getStudentAttendance, { user: admin, query: { date: "2026-02-30" } }],
    [
      getStudentAttendanceById,
      {
        user: admin,
        params: { studentId: "student-1" },
        query: { dateFrom: "2026-02-30" },
      },
    ],
    [
      getStudentAttendanceStats,
      {
        user: admin,
        params: { studentId: "student-1" },
        query: { ...scope, dateTo: "2026-02-30" },
      },
    ],
    [
      getAttendanceByDate,
      { user: admin, query: { date: "2026-02-30", ...scope } },
    ],
    [
      getStudentsWithoutAttendance,
      {
        user: admin,
        query: { date: "2026-02-30", ...scope },
      },
    ],
  ] as const) {
    const response = createReply();

    await controller(request as never, response.reply as never);

    assert.equal(response.statusCode, 400);
  }
});

test("student attendance update parsing rejects privileged linkage fields", () => {
  const result = parseStudentAttendanceUpdate({
    status: "PRESENT",
    projectId: "project-2",
  });

  assert.deepEqual(result, {
    error: "Only status, notes, and holidayReason may be updated",
  });
});

test("student attendance update parsing clears a holiday reason for non-holiday statuses", () => {
  const result = parseStudentAttendanceUpdate({
    status: "PRESENT",
    notes: "Present for the session",
  });

  assert.deepEqual(result, {
    data: {
      status: "PRESENT",
      notes: "Present for the session",
      holidayReason: null,
    },
  });
});

test("student attendance update parsing validates status and holiday semantics", () => {
  assert.deepEqual(parseStudentAttendanceUpdate({ status: "LATE" }), {
    error: "Attendance status is invalid",
  });
  assert.deepEqual(parseStudentAttendanceUpdate({ status: "HOLIDAY" }), {
    error: "A holiday reason is required when marking attendance as HOLIDAY",
  });
  assert.deepEqual(
    parseStudentAttendanceUpdate({
      status: "PRESENT",
      holidayReason: "Festival",
    }),
    { error: "A holiday reason can only be set when status is HOLIDAY" },
  );
  assert.deepEqual(
    parseStudentAttendanceUpdate({ holidayReason: "Festival" }),
    {
      error: "A holiday reason can only be set when status is HOLIDAY",
    },
  );
});

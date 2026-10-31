import assert from "node:assert/strict";
import test from "node:test";

import { getStudentAttendance } from "../../controllers/student-attendance.controller.js";
import { Role } from "../../generated/prisma/index.js";
import { parseBulkStudentAttendance } from "../../security/student-attendance-update.js";

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

test("bulk student attendance parsing rejects non-record bodies", () => {
  for (const input of [null, [], "attendance", 42]) {
    assert.deepEqual(parseBulkStudentAttendance(input), {
      error: "Bulk student attendance data is invalid",
    });
  }
});

test("bulk student attendance parsing rejects calendar-invalid dates", () => {
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
  for (const [controller, request] of [
    [getStudentAttendance, { user: admin, query: { date: "2026-02-30" } }],
  ] as const) {
    const response = createReply();

    await controller(request as never, response.reply as never);

    assert.equal(response.statusCode, 400);
  }
});

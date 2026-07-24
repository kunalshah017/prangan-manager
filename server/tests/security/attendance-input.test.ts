import assert from "node:assert/strict";
import test from "node:test";

import { Role } from "../../generated/prisma/index.js";
import {
  autoMarkAttendanceController,
  getActiveUsersController,
  getAttendanceController,
  getAttendanceSummaryController,
  markAttendanceController,
  markBulkAttendanceController,
} from "../../controllers/attendance.controller.js";
import {
  parseMarkAttendanceRequest,
  parseMarkBulkAttendanceRequest,
} from "../../security/attendance-input.js";
import { isValidDateFormat } from "../../utils/dateHelpers.js";

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

const singleAttendance = {
  userId: "user-1",
  roleAssignmentId: "assignment-1",
  date: "2026-07-17",
  status: "PRESENT",
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
};

const bulkAttendance = {
  date: "2026-07-17",
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  attendances: [
    { userId: "user-1", roleAssignmentId: "assignment-1", status: "PRESENT" },
  ],
};

test("user attendance parsers reject non-record bodies and invalid status or holiday metadata", () => {
  for (const input of [null, [], "attendance", 42]) {
    assert.ok("error" in parseMarkAttendanceRequest(input));
    assert.ok("error" in parseMarkBulkAttendanceRequest(input));
  }

  assert.ok(
    "error" in
      parseMarkAttendanceRequest({ ...singleAttendance, status: "LATE" }),
  );
  assert.ok(
    "error" in
      parseMarkBulkAttendanceRequest({
        ...bulkAttendance,
        attendances: [{ ...bulkAttendance.attendances[0], status: "LATE" }],
      }),
  );
  assert.ok(
    "error" in
      parseMarkAttendanceRequest({
        ...singleAttendance,
        status: "HOLIDAY",
        holidayReason: " ",
      }),
  );
  assert.ok(
    "error" in
      parseMarkBulkAttendanceRequest({
        ...bulkAttendance,
        attendances: [
          {
            ...bulkAttendance.attendances[0],
            status: "HOLIDAY",
            holidayReason: " ",
          },
        ],
      }),
  );
});

test("user attendance parsers produce typed canonical requests", () => {
  const single = parseMarkAttendanceRequest({
    ...singleAttendance,
    notes: "Present for the session",
  });
  const bulk = parseMarkBulkAttendanceRequest({
    ...bulkAttendance,
    attendances: [
      {
        ...bulkAttendance.attendances[0],
        status: "HOLIDAY",
        holidayReason: "Festival",
      },
    ],
  });

  assert.deepEqual(single, {
    data: { ...singleAttendance, notes: "Present for the session" },
  });
  assert.deepEqual(bulk, {
    data: {
      ...bulkAttendance,
      attendances: [
        {
          ...bulkAttendance.attendances[0],
          status: "HOLIDAY",
          holidayReason: "Festival",
        },
      ],
    },
  });
});

test("calendar-invalid dates are rejected by the shared date helper", () => {
  assert.equal(isValidDateFormat("2026-02-30"), false);
});

test("user attendance date controllers reject calendar-invalid dates before services", async () => {
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
    [
      getActiveUsersController,
      { user: admin, query: { date: "2026-02-30", ...scope } },
    ],
    [
      getAttendanceController,
      { user: admin, query: { startDate: "2026-02-30" } },
    ],
    [
      getAttendanceSummaryController,
      {
        user: admin,
        query: { startDate: "2026-02-30", endDate: "2026-03-01" },
      },
    ],
    [
      autoMarkAttendanceController,
      {
        user: admin,
        body: { date: "2026-02-30", ...scope },
      },
    ],
  ] as const) {
    const response = createReply();

    await controller(request as never, response.reply as never);

    assert.equal(response.statusCode, 400);
  }
});

test("user attendance controllers reject malformed bodies before service work", async () => {
  for (const [controller, body] of [
    [markAttendanceController, null],
    [markBulkAttendanceController, null],
    [markAttendanceController, { ...singleAttendance, status: "LATE" }],
    [
      markBulkAttendanceController,
      {
        ...bulkAttendance,
        attendances: [{ ...bulkAttendance.attendances[0], status: "LATE" }],
      },
    ],
    [
      markAttendanceController,
      {
        ...singleAttendance,
        status: "HOLIDAY",
        holidayReason: " ",
      },
    ],
    [
      markBulkAttendanceController,
      {
        ...bulkAttendance,
        attendances: [
          {
            ...bulkAttendance.attendances[0],
            status: "HOLIDAY",
            holidayReason: " ",
          },
        ],
      },
    ],
  ] as const) {
    const response = createReply();

    await controller(
      {
        user: {
          id: "admin-1",
          name: "Admin",
          email: "admin@example.com",
          role: Role.ADMIN,
        },
        body,
      } as never,
      response.reply as never,
    );

    assert.equal(response.statusCode, 400);
  }
});

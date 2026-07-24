import assert from "node:assert/strict";
import test from "node:test";

import { AttendanceStatus } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import { markBulkAttendance } from "../../service/attendance.service.js";

const request = {
  date: "2026-07-17",
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
};

const validAttendance = (userId: string, roleAssignmentId: string) => ({
  userId,
  roleAssignmentId,
  status: AttendanceStatus.PRESENT,
});

test("bulk attendance hides transaction write failures from public errors", async () => {
  const originalFindMany = prisma.userRoleAssignments.findMany;
  const originalTransaction = prisma.$transaction;
  let transactionCallbackRejected = false;
  let upsertCalls = 0;

  prisma.userRoleAssignments.findMany = (async () => [
    { id: "assignment-1", userId: "user-1" },
    { id: "assignment-2", userId: "user-2" },
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.$transaction = (async (
    callback: (transaction: unknown) => Promise<unknown>,
  ) => {
    await assert.rejects(
      callback({
        userAttendance: {
          upsert: async () => {
            upsertCalls += 1;
            if (upsertCalls === 2)
              throw new Error("sensitive database failure");
          },
        },
      }),
      /sensitive database failure/,
    );
    transactionCallbackRejected = true;
    throw new Error("sensitive database failure");
  }) as typeof prisma.$transaction;

  try {
    const result = await markBulkAttendance(
      {
        ...request,
        attendances: [
          validAttendance("user-1", "assignment-1"),
          validAttendance("user-2", "assignment-2"),
        ],
      },
      "manager-1",
    );

    assert.equal(transactionCallbackRejected, true);
    assert.equal(upsertCalls, 2);
    assert.equal(result.processedCount, 0);
    assert.ok(result.errors.length > 0);
    assert.doesNotMatch(result.errors.join(" "), /sensitive database failure/);
    assert.match(
      result.errors.join(" "),
      /Transaction failed while marking attendance/,
    );
  } finally {
    prisma.userRoleAssignments.findMany = originalFindMany;
    prisma.$transaction = originalTransaction;
  }
});

test("bulk attendance persists valid preflight entries while reporting invalid assignments", async () => {
  const originalFindMany = prisma.userRoleAssignments.findMany;
  const originalTransaction = prisma.$transaction;
  let upsertCalls = 0;

  prisma.userRoleAssignments.findMany = (async () => [
    { id: "assignment-1", userId: "user-1" },
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.$transaction = (async (
    callback: (transaction: unknown) => Promise<unknown>,
  ) =>
    callback({
      userAttendance: {
        upsert: async () => {
          upsertCalls += 1;
        },
      },
    })) as typeof prisma.$transaction;

  try {
    const result = await markBulkAttendance(
      {
        ...request,
        attendances: [
          validAttendance("user-1", "assignment-1"),
          validAttendance("user-2", "invalid-assignment"),
        ],
      },
      "manager-1",
    );

    assert.equal(upsertCalls, 1);
    assert.equal(result.processedCount, 1);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /Invalid attendance role assignment/);
  } finally {
    prisma.userRoleAssignments.findMany = originalFindMany;
    prisma.$transaction = originalTransaction;
  }
});

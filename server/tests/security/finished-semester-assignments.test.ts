import assert from "node:assert/strict";
import test from "node:test";

import { verifyUser } from "../../controllers/user.controller.js";
import { Role, SubRole, UserStatus } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import { isSemesterFinished, openSemesterAssignment } from "../../lib/role-assignments.js";
import { bulkUpdateUserAssignments } from "../../service/user.service.js";

const finished = { name: "Semester Year 2025-26", status: "ACTIVE", endDate: new Date("2026-04-30T23:59:59.999Z") };
const running = { name: "Semester Year 2026-27", status: "ACTIVE", endDate: new Date("2027-04-30T23:59:59.999Z") };

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
  return { reply, get statusCode() { return statusCode; }, get payload() { return payload; } };
};

const withMocks = async (overrides: Record<string, [object, string, unknown]>, run: () => Promise<void>) => {
  const originals: Array<[object, string, unknown]> = [];
  for (const [target, key, value] of Object.values(overrides)) {
    originals.push([target, key, (target as Record<string, unknown>)[key]]);
    (target as Record<string, unknown>)[key] = value;
  }
  try {
    await run();
  } finally {
    for (const [target, key, value] of originals) (target as Record<string, unknown>)[key] = value;
  }
};

test("a semester is finished once archived or past its last day", () => {
  assert.equal(isSemesterFinished(finished, "2026-10-30"), true);
  assert.equal(isSemesterFinished(running, "2026-10-30"), false);
  assert.equal(isSemesterFinished({ ...running, status: "ARCHIVED" }, "2026-10-30"), true);
});

test("approval refuses a role in a finished semester before changing anything", async () => {
  let transactions = 0;
  await withMocks(
    {
      user: [prisma.user, "findUnique", async () => ({ email: "new@example.com", name: "New", status: UserStatus.PENDING })],
      semesterFind: [prisma.semesters, "findFirst", async () => ({ id: "semester-1" })],
      centreFind: [prisma.centers, "findFirst", async () => ({ id: "centre-1" })],
      semesterUnique: [prisma.semesters, "findUnique", async () => finished],
      transaction: [prisma, "$transaction", async () => { transactions += 1; return null; }],
    },
    async () => {
      const response = createReply();
      await verifyUser(
        {
          user: { id: "admin-1", role: Role.ADMIN },
          body: {
            userId: "user-1",
            status: UserStatus.APPROVED,
            role: Role.USER,
            roleAssignments: [{ subRole: SubRole.TECH, projectId: "project-1", centerId: "centre-1", semesterId: "semester-1" }],
          },
        } as never,
        response.reply as never,
      );
      assert.equal(response.statusCode, 422);
      assert.match(JSON.stringify(response.payload), /Semester Year 2025-26 has finished/);
      assert.equal(transactions, 0);
    },
  );
});

test("approval rejects an unknown role", async () => {
  await withMocks(
    { user: [prisma.user, "findUnique", async () => ({ email: "new@example.com", name: "New", status: UserStatus.PENDING })] },
    async () => {
      const response = createReply();
      await verifyUser(
        {
          user: { id: "admin-1", role: Role.ADMIN },
          body: { userId: "user-1", status: UserStatus.APPROVED, role: Role.USER, roleAssignments: [{ subRole: "WIZARD" }] },
        } as never,
        response.reply as never,
      );
      assert.equal(response.statusCode, 400);
    },
  );
});

test("Edit user keeps a role already held but refuses a new one in a finished semester", async () => {
  const held = {
    id: "held-1",
    subRole: SubRole.TECH,
    projectId: "project-1",
    centerId: "centre-1",
    semesterId: "semester-old",
    semesterLevelId: null,
    committedDays: null,
  };
  const fakeTransaction = (creates: unknown[]) => async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      semesters: { findUnique: async () => finished },
      userRoleAssignments: {
        findMany: async () => [held],
        updateMany: async () => ({ count: 0 }),
        create: async (args: unknown) => { creates.push(args); return { id: "new" }; },
      },
    });

  const keptCreates: unknown[] = [];
  await withMocks(
    {
      semesterFind: [prisma.semesters, "findFirst", async () => ({ id: "semester-old" })],
      centreFind: [prisma.centers, "findFirst", async () => ({ id: "centre-1" })],
      transaction: [prisma, "$transaction", fakeTransaction(keptCreates)],
    },
    async () => {
      const result = await bulkUpdateUserAssignments("user-1", [
        { subRole: SubRole.TECH, projectId: "project-1", centerId: "centre-1", semesterId: "semester-old" },
      ]);
      assert.ok(Array.isArray(result));
      assert.equal(keptCreates.length, 0);
    },
  );

  const newCreates: unknown[] = [];
  await withMocks(
    {
      semesterFind: [prisma.semesters, "findFirst", async () => ({ id: "semester-old" })],
      centreFind: [prisma.centers, "findFirst", async () => ({ id: "centre-1" })],
      transaction: [prisma, "$transaction", fakeTransaction(newCreates)],
    },
    async () => {
      const result = await bulkUpdateUserAssignments("user-1", [
        { subRole: SubRole.RECRUITMENT, projectId: "project-1", centerId: "centre-1", semesterId: "semester-old" },
      ]);
      assert.ok(result instanceof Error);
      assert.match((result as Error).message, /has finished/);
      assert.equal(newCreates.length, 0);
    },
  );
});

test("only semesters still running grant non-admin access", () => {
  const filter = openSemesterAssignment("2026-05-01");
  assert.deepEqual(filter.OR[0], { semesterId: null });
  const semester = filter.OR[1].semester!.is;
  assert.deepEqual(semester.status, { not: "ARCHIVED" });
  // A semester ending on 30 April (stored as its last moment) is excluded on 1 May.
  assert.equal(finished.endDate >= semester.endDate.gte, false);
  assert.equal(running.endDate >= semester.endDate.gte, true);
  // ...and still included on its last day.
  assert.equal(finished.endDate >= openSemesterAssignment("2026-04-30").OR[1].semester!.is.endDate.gte, true);
});

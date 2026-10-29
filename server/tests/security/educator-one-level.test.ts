import assert from "node:assert/strict";
import test from "node:test";

import { verifyUser } from "../../controllers/user.controller.js";
import { Role, SubRole, UserStatus } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import { findSecondEducatorLevel } from "../../lib/role-assignments.js";
import { AcademicLevelServiceError } from "../../service/academic-level.service.js";
import { bulkUpdateUserAssignments } from "../../service/user.service.js";

const educator = (semesterLevelId: string, semesterId = "semester-1", centerId = "centre-1") => ({
  subRole: SubRole.EDUCATOR,
  projectId: "project-1",
  centerId,
  semesterId,
  semesterLevelId,
});

test("one educator level per centre and semester; identical rows and other places are fine", () => {
  assert.ok(findSecondEducatorLevel([educator("level-2"), educator("level-3")]));
  assert.equal(findSecondEducatorLevel([educator("level-2"), educator("level-2")]), null);
  assert.equal(findSecondEducatorLevel([educator("level-2"), educator("level-3", "semester-2")]), null);
  assert.equal(findSecondEducatorLevel([educator("level-2"), educator("level-3", "semester-1", "centre-2")]), null);
  assert.equal(
    findSecondEducatorLevel([educator("level-2"), { subRole: SubRole.CENTER_MANAGER, centerId: "centre-1", semesterId: "semester-1" }]),
    null,
  );
});

test("Edit user refuses a second level before touching the database", async () => {
  const originalTransaction = prisma.$transaction;
  let transactions = 0;
  prisma.$transaction = (async () => { transactions += 1; }) as unknown as typeof prisma.$transaction;
  try {
    const result = await bulkUpdateUserAssignments("user-1", [educator("level-2"), educator("level-3")]);
    assert.ok(result instanceof AcademicLevelServiceError);
    assert.equal(result.statusCode, 422);
    assert.match(result.message, /only one level per centre and semester/);
    assert.equal(transactions, 0);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("approval refuses a second level instead of silently keeping the first", async () => {
  const originalFindUnique = prisma.user.findUnique;
  prisma.user.findUnique = (async () => ({ email: "new@example.com", name: "New", status: UserStatus.PENDING })) as unknown as typeof prisma.user.findUnique;
  let statusCode: number | undefined;
  const reply = { status(code: number) { statusCode = code; return this; }, send() { return this; } };
  try {
    await verifyUser(
      {
        user: { id: "admin-1", role: Role.ADMIN },
        body: { userId: "user-1", status: UserStatus.APPROVED, role: Role.USER, roleAssignments: [educator("level-2"), educator("level-3")] },
      } as never,
      reply as never,
    );
    assert.equal(statusCode, 422);
  } finally {
    prisma.user.findUnique = originalFindUnique;
  }
});

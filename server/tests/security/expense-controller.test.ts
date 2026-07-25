import assert from "node:assert/strict";
import test from "node:test";

import {
  createManualExpenseController,
  listExpensesController,
  voidExpenseController,
} from "../../controllers/expense.controller.js";
import { Role } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";

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

const admin = {
  id: "admin-1",
  name: "Administrator",
  email: "admin@example.org",
  role: Role.ADMIN,
};

test("expense controllers reject missing and non-admin identities", async () => {
  for (const user of [
    undefined,
    { ...admin, role: Role.USER },
  ]) {
    const response = createReply();
    await listExpensesController(
      {
        user,
        query: {
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-1",
        },
      } as never,
      response.reply as never,
    );
    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.payload, {
      message: "Only administrators can manage expenses.",
    });
  }
});

test("expense controllers reject malformed input before database work", async () => {
  const originalProjectLookup = prisma.projects.findUnique;
  let projectLookups = 0;
  prisma.projects.findUnique = (async () => {
    projectLookups += 1;
    return null;
  }) as typeof prisma.projects.findUnique;

  try {
    const response = createReply();
    await createManualExpenseController(
      {
        user: admin,
        body: {
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-1",
          title: "Supplies",
          category: "Materials",
          amount: 100,
          incurredOn: "2026-07-25",
          expenseType: "REMUNERATION",
        },
      } as never,
      response.reply as never,
    );
    assert.equal(response.statusCode, 400);
    assert.equal(projectLookups, 0);
  } finally {
    prisma.projects.findUnique = originalProjectLookup;
  }
});

test("expense controllers map hierarchy failures to 404", async () => {
  const originalProjectLookup = prisma.projects.findUnique;
  prisma.projects.findUnique = (async () =>
    null) as typeof prisma.projects.findUnique;

  try {
    const response = createReply();
    await listExpensesController(
      {
        user: admin,
        query: {
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-1",
        },
      } as never,
      response.reply as never,
    );
    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.payload, { message: "Project not found." });
  } finally {
    prisma.projects.findUnique = originalProjectLookup;
  }
});

test("expense controllers map immutable expense state to 409", async () => {
  const originalExpenseLookup = prisma.expense.findUnique;
  const originalProjectLookup = prisma.projects.findUnique;
  const originalCenterLookup = prisma.centers.findFirst;
  const originalSemesterLookup = prisma.semesters.findFirst;
  prisma.expense.findUnique = (async () => ({
    id: "expense-1",
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    expenseType: "REMUNERATION",
    status: "ACTIVE",
    amount: 100,
  })) as typeof prisma.expense.findUnique;
  prisma.projects.findUnique = (async () => ({
    id: "project-1",
  })) as typeof prisma.projects.findUnique;
  prisma.centers.findFirst = (async () => ({
    id: "center-1",
  })) as typeof prisma.centers.findFirst;
  prisma.semesters.findFirst = (async () => ({
    id: "semester-1",
    name: "Semester 1",
    startDate: new Date("2026-07-01T00:00:00.000Z"),
    endDate: new Date("2026-07-31T00:00:00.000Z"),
    center: { name: "Center" },
  })) as typeof prisma.semesters.findFirst;

  try {
    const response = createReply();
    await voidExpenseController(
      {
        user: admin,
        params: { expenseId: "expense-1" },
        body: { voidReason: "Correction" },
      } as never,
      response.reply as never,
    );
    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.payload, {
      message: "Only active manual expenses can be voided.",
    });
  } finally {
    prisma.expense.findUnique = originalExpenseLookup;
    prisma.projects.findUnique = originalProjectLookup;
    prisma.centers.findFirst = originalCenterLookup;
    prisma.semesters.findFirst = originalSemesterLookup;
  }
});

test("expense controllers keep unexpected failures behind a stable 500", async () => {
  const originalProjectLookup = prisma.projects.findUnique;
  const originalConsoleError = console.error;
  prisma.projects.findUnique = (async () => {
    throw new Error("sensitive database detail");
  }) as typeof prisma.projects.findUnique;
  console.error = () => undefined;

  try {
    const response = createReply();
    await listExpensesController(
      {
        user: admin,
        query: {
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-1",
        },
      } as never,
      response.reply as never,
    );
    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.payload, { error: "Internal Server Error" });
  } finally {
    prisma.projects.findUnique = originalProjectLookup;
    console.error = originalConsoleError;
  }
});

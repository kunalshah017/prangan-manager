import assert from "node:assert/strict";
import test from "node:test";

import { createSemester } from "../../controllers/semester.controller.js";
import { Role } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import {
  parseCreateSemesterRequest,
  parseUpdateSemesterRequest,
} from "../../security/semester-input.js";
import {
  CreateSemester,
  getSemesterById,
  updateSemester,
} from "../../service/semester.service.js";
import { getUserAccessibleSemesters } from "../../service/user.service.js";

const createReply = () => {
  let statusCode: number | undefined;
  const reply = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    send() {
      return this;
    },
  };
  return {
    reply,
    get statusCode() {
      return statusCode;
    },
  };
};

test("semester parsers are strict and preserve cached create clients", () => {
  assert.deepEqual(
    parseCreateSemesterRequest({
      name: "  Semester 1  ",
      startDate: "2026-07-01",
      endDate: "2026-12-31",
      centerId: "center-1",
    }),
    {
      data: {
        name: "Semester 1",
        startDate: "2026-07-01",
        endDate: "2026-12-31",
        centerId: "center-1",
      },
    },
  );
  assert.deepEqual(parseUpdateSemesterRequest({ name: "  Renamed  " }), {
    data: { name: "Renamed" },
  });

  assert.ok(
    "error" in
      parseCreateSemesterRequest({
        name: "Semester 1",
        startDate: "2026-07-01",
        endDate: "2026-12-31",
        centerId: "center-1",
        unknown: true,
      }),
  );
  assert.ok(
    "error" in
      parseCreateSemesterRequest({
        name: "Semester 1",
        startDate: "2026-07-01",
        endDate: "2026-12-31",
        centerId: "center-1",
        academicLevelIds: [],
      }),
  );
  assert.ok("error" in parseUpdateSemesterRequest({ centerId: "center-2" }));
  assert.ok("error" in parseUpdateSemesterRequest({}));
});

test("semester create atomically selects requested active catalog levels", async () => {
  const originalTransaction = prisma.$transaction;
  const memberships: string[] = [];
  const createdSemester = { id: "semester-1" };
  const responseSemester = { id: "semester-1", levels: [] };
  const tx = {
    academicLevel: {
      findMany: async ({ where }: any) => {
        assert.deepEqual(where, {
          id: { in: ["level-1", "level-2"] },
          isActive: true,
        });
        return [{ id: "level-1" }, { id: "level-2" }];
      },
    },
    semesters: {
      create: async () => createdSemester,
      findUnique: async (args: any) => {
        assert.deepEqual(args.include.levels.orderBy, {
          academicLevel: { journeyOrder: "asc" },
        });
        return responseSemester;
      },
    },
    semesterLevel: {
      createMany: async ({ data }: any) => {
        memberships.push(...data.map((row: any) => row.academicLevelId));
        return { count: data.length };
      },
    },
  };
  prisma.$transaction = (async (callback: any) => callback(tx)) as any;

  try {
    const result = await CreateSemester({
      name: "Semester 1",
      startDate: "2026-07-01",
      endDate: "2026-12-31",
      centerId: "center-1",
      academicLevelIds: ["level-1", "level-2"],
    });
    assert.deepEqual(memberships, ["level-1", "level-2"]);
    assert.equal(result, responseSemester);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("cached semester create clients receive all active catalog levels", async () => {
  const originalTransaction = prisma.$transaction;
  let catalogWhere: unknown;
  const tx = {
    academicLevel: {
      findMany: async ({ where }: any) => {
        catalogWhere = where;
        return [{ id: "level-1" }, { id: "level-2" }];
      },
    },
    semesters: {
      create: async () => ({ id: "semester-1" }),
      findUnique: async () => ({ id: "semester-1", levels: [] }),
    },
    semesterLevel: { createMany: async () => ({ count: 2 }) },
  };
  prisma.$transaction = (async (callback: any) => callback(tx)) as any;

  try {
    await CreateSemester({
      name: "Semester 1",
      startDate: "2026-07-01",
      endDate: "2026-12-31",
      centerId: "center-1",
    });
    assert.deepEqual(catalogWhere, { isActive: true });
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("semester update preserves membership when academicLevelIds is omitted", async () => {
  const originalTransaction = prisma.$transaction;
  let membershipWrites = 0;
  const tx = {
    semesters: {
      update: async () => ({ id: "semester-1" }),
      findUnique: async () => ({ id: "semester-1", levels: [] }),
    },
    academicLevel: { findMany: async () => [] },
    semesterLevel: {
      upsert: async () => {
        membershipWrites += 1;
      },
      updateMany: async () => {
        membershipWrites += 1;
      },
    },
  };
  prisma.$transaction = (async (callback: any) => callback(tx)) as any;

  try {
    await updateSemester("semester-1", { name: "Renamed" });
    assert.equal(membershipWrites, 0);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("name-only semester update returns a not-found service error before update", async () => {
  const originalTransaction = prisma.$transaction;
  let updates = 0;
  const tx = {
    semesters: {
      findUnique: async () => null,
      update: async () => {
        updates += 1;
      },
    },
  };
  prisma.$transaction = (async (callback: any) => callback(tx)) as any;

  try {
    await assert.rejects(
      () => updateSemester("missing-semester", { name: "Renamed" }),
      (error: any) => error.statusCode === 404,
    );
    assert.equal(updates, 0);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("partial semester date updates cannot invert the persisted date range", async () => {
  const originalTransaction = prisma.$transaction;
  let updates = 0;
  const tx = {
    semesters: {
      findUnique: async () => ({
        id: "semester-1",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T23:59:59.999Z"),
      }),
      update: async () => {
        updates += 1;
        return { id: "semester-1" };
      },
    },
    academicLevel: { findMany: async () => [] },
    semesterLevel: { upsert: async () => {}, updateMany: async () => {} },
  };
  prisma.$transaction = (async (callback: any) => callback(tx)) as any;

  try {
    await assert.rejects(
      () => updateSemester("semester-1", { startDate: "2027-01-01" }),
      /endDate must not be before startDate/,
    );
    assert.equal(updates, 0);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("semester update activates selected memberships and soft-inactivates omissions", async () => {
  const originalTransaction = prisma.$transaction;
  const upserts: string[] = [];
  let updateManyArgs: unknown;
  const tx = {
    semesters: {
      update: async () => ({ id: "semester-1" }),
      findUnique: async () => ({ id: "semester-1", levels: [] }),
    },
    academicLevel: {
      findMany: async () => [{ id: "level-2" }, { id: "level-1" }],
    },
    semesterLevel: {
      upsert: async ({ where }: any) => {
        upserts.push(where.semesterId_academicLevelId.academicLevelId);
      },
      updateMany: async (args: unknown) => {
        updateManyArgs = args;
      },
    },
  };
  prisma.$transaction = (async (callback: any) => callback(tx)) as any;

  try {
    await updateSemester("semester-1", {
      academicLevelIds: ["level-2", "level-1"],
    });
    assert.deepEqual(upserts, ["level-2", "level-1"]);
    assert.deepEqual(updateManyArgs, {
      where: {
        semesterId: "semester-1",
        academicLevelId: { notIn: ["level-2", "level-1"] },
        isActive: true,
      },
      data: { isActive: false },
    });
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("semester controller rejects unknown create fields before opening a transaction", async () => {
  const originalTransaction = prisma.$transaction;
  let transactions = 0;
  prisma.$transaction = (async () => {
    transactions += 1;
    return {};
  }) as typeof prisma.$transaction;

  try {
    const response = createReply();
    await createSemester(
      {
        user: {
          id: "admin-1",
          name: "Admin",
          email: "admin@example.com",
          role: Role.ADMIN,
        },
        body: {
          name: "Semester 1",
          startDate: "2026-07-01",
          endDate: "2026-12-31",
          centerId: "center-1",
          unknown: true,
        },
      } as never,
      response.reply as never,
    );
    assert.equal(response.statusCode, 400);
    assert.equal(transactions, 0);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("admin semester lists include active ordered level metadata", async () => {
  const originalFindMany = prisma.semesters.findMany;
  let received: any;
  prisma.semesters.findMany = (async (args: unknown) => {
    received = args;
    return [];
  }) as typeof prisma.semesters.findMany;

  try {
    await getUserAccessibleSemesters("admin-1", "ADMIN", "center-1");
    assert.deepEqual(received.include.levels, {
      where: { isActive: true },
      include: { academicLevel: true },
      orderBy: { academicLevel: { journeyOrder: "asc" } },
    });
  } finally {
    prisma.semesters.findMany = originalFindMany;
  }
});

test("semester detail includes ordered level metadata", async () => {
  const originalFindUnique = prisma.semesters.findUnique;
  let received: any;
  prisma.semesters.findUnique = (async (args: unknown) => {
    received = args;
    return { id: "semester-1", levels: [] } as never;
  }) as typeof prisma.semesters.findUnique;

  try {
    await getSemesterById("semester-1");
    assert.deepEqual(received.include.levels, {
      where: { isActive: true },
      include: { academicLevel: true },
      orderBy: { academicLevel: { journeyOrder: "asc" } },
    });
  } finally {
    prisma.semesters.findUnique = originalFindUnique;
  }
});

import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../lib/prisma.js";
import {
  listAcademicLevels,
  reorderAcademicLevels,
} from "../../service/academic-level.service.js";
import {
  replaceSemesterLevels,
  requireActiveSemesterLevel,
} from "../../service/semester-level.service.js";

test("catalog listing uses canonical journey order and excludes archived rows by default", async () => {
  const originalFindMany = prisma.academicLevel.findMany;
  let received: unknown;
  prisma.academicLevel.findMany = (async (args: unknown) => {
    received = args;
    return [];
  }) as typeof prisma.academicLevel.findMany;

  try {
    await listAcademicLevels();
    assert.deepEqual(received, {
      where: { isActive: true },
      orderBy: { journeyOrder: "asc" },
    });
  } finally {
    prisma.academicLevel.findMany = originalFindMany;
  }
});

test("catalog reorder uses temporary values before assigning spaced final order", async () => {
  const originalTransaction = prisma.$transaction;
  const updates: Array<{ id: string; journeyOrder: number }> = [];
  const tx = {
    academicLevel: {
      findMany: async () => [
        { id: "level-1", journeyOrder: -20 },
        { id: "level-2", journeyOrder: 100 },
      ],
      update: async ({ where, data }: any) => {
        updates.push({ id: where.id, journeyOrder: data.journeyOrder });
        return { id: where.id, ...data };
      },
    },
  };
  prisma.$transaction = (async (callback: any) => callback(tx)) as any;

  try {
    await reorderAcademicLevels(["level-2", "level-1"]);
    assert.deepEqual(updates, [
      { id: "level-2", journeyOrder: -21 },
      { id: "level-1", journeyOrder: -22 },
      { id: "level-2", journeyOrder: 100 },
      { id: "level-1", journeyOrder: 200 },
    ]);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("catalog reorder operates on active rows without requiring archived IDs", async () => {
  const originalTransaction = prisma.$transaction;
  const findManyArgs: unknown[] = [];
  const tx = {
    academicLevel: {
      findMany: async (args: unknown) => {
        findManyArgs.push(args);
        return [{ id: "active-1", journeyOrder: 100 }];
      },
      update: async () => ({}),
    },
  };
  prisma.$transaction = (async (callback: any) => callback(tx)) as any;

  try {
    await reorderAcademicLevels(["active-1"]);
    assert.deepEqual(findManyArgs[0], {
      where: { isActive: true },
      select: { id: true, journeyOrder: true },
    });
    assert.deepEqual(findManyArgs[1], {
      where: { isActive: true },
      orderBy: { journeyOrder: "asc" },
    });
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("semester membership replacement validates active catalog IDs and soft-inactivates omissions", async () => {
  const originalTransaction = prisma.$transaction;
  const upserts: string[] = [];
  let updateManyArgs: unknown;
  const orderedRows = [{ id: "membership-2" }, { id: "membership-1" }];
  const tx = {
    semesters: { findUnique: async () => ({ id: "semester-1" }) },
    academicLevel: {
      findMany: async ({ where }: any) => {
        assert.deepEqual(where, {
          id: { in: ["level-2", "level-1"] },
          OR: [
            { isActive: true },
            {
              semesterLevels: {
                some: { semesterId: "semester-1", isActive: true },
              },
            },
          ],
        });
        return [{ id: "level-1" }, { id: "level-2" }];
      },
    },
    semesterLevel: {
      upsert: async ({ where }: any) => {
        upserts.push(where.semesterId_academicLevelId.academicLevelId);
        return {};
      },
      updateMany: async (args: unknown) => {
        updateManyArgs = args;
        return { count: 1 };
      },
      findMany: async (args: any) => {
        assert.deepEqual(args.orderBy, {
          academicLevel: { journeyOrder: "asc" },
        });
        return orderedRows;
      },
    },
  };
  prisma.$transaction = (async (callback: any) => callback(tx)) as any;

  try {
    const result = await replaceSemesterLevels("semester-1", [
      "level-2",
      "level-1",
    ]);
    assert.deepEqual(upserts, ["level-2", "level-1"]);
    assert.deepEqual(updateManyArgs, {
      where: {
        semesterId: "semester-1",
        academicLevelId: { notIn: ["level-2", "level-1"] },
        isActive: true,
      },
      data: { isActive: false },
    });
    assert.equal(result, orderedRows);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("semester membership replacement rejects an empty selection before opening a transaction", async () => {
  const originalTransaction = prisma.$transaction;
  let transactions = 0;
  prisma.$transaction = (async () => {
    transactions += 1;
    return [];
  }) as typeof prisma.$transaction;

  try {
    await assert.rejects(
      () => replaceSemesterLevels("semester-1", []),
      /At least one academic level is required/,
    );
    assert.equal(transactions, 0);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("semester replacement preserves a selected archived catalog level already active in that semester", async () => {
  const originalTransaction = prisma.$transaction;
  let selectableWhere: unknown;
  const tx = {
    semesters: { findUnique: async () => ({ id: "semester-1" }) },
    academicLevel: {
      findMany: async ({ where }: any) => {
        selectableWhere = where;
        return [{ id: "archived-level" }];
      },
    },
    semesterLevel: {
      upsert: async () => ({}),
      updateMany: async () => ({ count: 0 }),
      findMany: async () => [],
    },
  };
  prisma.$transaction = (async (callback: any) => callback(tx)) as any;

  try {
    await replaceSemesterLevels("semester-1", ["archived-level"]);
    assert.deepEqual(selectableWhere, {
      id: { in: ["archived-level"] },
      OR: [
        { isActive: true },
        {
          semesterLevels: {
            some: { semesterId: "semester-1", isActive: true },
          },
        },
      ],
    });
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("active semester membership remains valid when its catalog row is archived", async () => {
  const originalFindFirst = prisma.semesterLevel.findFirst;
  const archivedMembership = {
    id: "membership-1",
    academicLevel: { id: "level-1", isActive: false },
  };
  let received: any;
  prisma.semesterLevel.findFirst = (async (args: unknown) => {
    received = args;
    return archivedMembership;
  }) as typeof prisma.semesterLevel.findFirst;

  try {
    const result = await requireActiveSemesterLevel({
      semesterId: "semester-1",
      semesterLevelId: "membership-1",
    });
    assert.equal(result, archivedMembership);
    assert.deepEqual(received.where, {
      id: "membership-1",
      semesterId: "semester-1",
      isActive: true,
    });
    assert.deepEqual(received.include, { academicLevel: true });
  } finally {
    prisma.semesterLevel.findFirst = originalFindFirst;
  }
});

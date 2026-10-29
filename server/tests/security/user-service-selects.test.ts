import assert from "node:assert/strict";
import test from "node:test";

import {
  SubRole,
  UserStatus,
  type Prisma,
} from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import {
  adminUserDetailSelect,
  remunerationUserSelect,
} from "../../security/user-selects.js";
import {
  getAdminUserById,
  getUserById,
  getContextStaff,
  getRemunerationUsers,
} from "../../service/user.service.js";

test("getAdminUserById uses the admin detail selector", async () => {
  const originalFindUnique = prisma.user.findUnique;
  let receivedArgs: Prisma.UserFindUniqueArgs | undefined;

  prisma.user.findUnique = ((args: Prisma.UserFindUniqueArgs) => {
    receivedArgs = args;
    return Promise.resolve(null);
  }) as typeof prisma.user.findUnique;

  try {
    await getAdminUserById("user-1");
  } finally {
    prisma.user.findUnique = originalFindUnique;
  }

  assert.deepEqual(receivedArgs, {
    where: { id: "user-1" },
    select: adminUserDetailSelect,
  });
});

test("getAdminUserById returns only the last four account digits", async () => {
  const originalFindUnique = prisma.user.findUnique;
  const selects: unknown[] = [];

  prisma.user.findUnique = ((args: Prisma.UserFindUniqueArgs) => {
    selects.push(args.select);
    return Promise.resolve(
      selects.length === 1
        ? { id: "user-1", name: "Volunteer", roleAssignments: [] }
        : {
            bankAccountNumber: "123456789012",
            bankName: "State Bank of India",
            bankIfsc: "SBIN0001234",
            upiId: "volunteer@upi",
          },
    );
  }) as typeof prisma.user.findUnique;

  let user: Awaited<ReturnType<typeof getAdminUserById>>;
  try {
    user = await getAdminUserById("user-1");
  } finally {
    prisma.user.findUnique = originalFindUnique;
  }

  assert.deepEqual(selects[0], adminUserDetailSelect);
  assert.ok(user && typeof user !== "string");
  assert.deepEqual((user as { bankSummary: unknown }).bankSummary, {
    accountLast4: "9012",
    bankName: "State Bank of India",
    bankIfsc: "SBIN0001234",
    hasUpi: true,
  });
  const serialized = JSON.stringify(user);
  assert.doesNotMatch(serialized, /123456789012/);
  assert.doesNotMatch(serialized, /volunteer@upi/);
});

test("profile loaders keep current assignments in place and list ended ones as past", async () => {
  const originalFindUnique = prisma.user.findUnique;
  const assignment = (id: string, isActive: boolean, assignedAt: string, endedAt: string | null) => ({
    id,
    isActive,
    assignedAt: new Date(assignedAt),
    endedAt: endedAt ? new Date(endedAt) : null,
  });
  prisma.user.findUnique = (async () => ({
    id: "user-1",
    roleAssignments: [
      assignment("current", true, "2026-07-01", null),
      assignment("older", false, "2024-07-01", "2025-04-30"),
      assignment("recent", false, "2025-07-01", "2026-04-30"),
    ],
  })) as unknown as typeof prisma.user.findUnique;

  let forVolunteer: Awaited<ReturnType<typeof getUserById>>;
  let forAdmin: Awaited<ReturnType<typeof getUserById>>;
  try {
    forVolunteer = await getUserById("user-1");
    forAdmin = await getUserById("user-1", { includePastAssignments: true });
  } finally {
    prisma.user.findUnique = originalFindUnique;
  }

  // Ended roles are admin-only history.
  assert.ok(forVolunteer && typeof forVolunteer !== "string");
  assert.deepEqual(forVolunteer.roleAssignments.map((item) => item.id), ["current"]);
  assert.equal("pastRoleAssignments" in forVolunteer, false);

  assert.ok(forAdmin && typeof forAdmin !== "string" && "pastRoleAssignments" in forAdmin);
  assert.deepEqual(forAdmin.roleAssignments.map((item) => item.id), ["current"]);
  assert.deepEqual(
    (forAdmin.pastRoleAssignments as Array<{ id: string }>).map((item) => item.id),
    ["recent", "older"],
  );
});

test("every way of ending a role assignment records when it ended", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const path of ["../../controllers/user.controller.ts", "../../service/user.service.ts"]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    for (const match of source.matchAll(/userRoleAssignments\.(?:update|updateMany)\(\{[\s\S]*?\}\);/g)) {
      assert.doesNotMatch(match[0], /data: \{ isActive: false \}/, `${path} ends an assignment without endedAt`);
    }
  }
});

test("getRemunerationUsers includes current or historical payees in the exact scope", async () => {
  const originalFindMany = prisma.user.findMany;
  let receivedArgs: Prisma.UserFindManyArgs | undefined;

  prisma.user.findMany = ((args: Prisma.UserFindManyArgs) => {
    receivedArgs = args;
    return Promise.resolve([
      {
        id: "user-1",
        name: "Payee",
        firstName: "Payee",
        middleName: null,
        lastName: null,
        profileImageUrl: "https://cdn.example.test/payee.jpg",
        bankAccountNumber: null,
        bankAccountName: null,
        bankIfsc: null,
        bankName: null,
        bankBranch: null,
        upiId: null,
        remunerationRates: [{ dailyRate: 625 }],
        remunerationPeriods: [
          {
            id: "period-1",
            amountPerDay: 625,
            effectiveFrom: new Date("2026-07-01T00:00:00.000Z"),
            effectiveTo: null,
          },
        ],
      },
    ]);
  }) as typeof prisma.user.findMany;

  let result;
  try {
    result = await getRemunerationUsers({
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
    });
  } finally {
    prisma.user.findMany = originalFindMany;
  }

  assert.deepEqual(receivedArgs, {
    where: {
      OR: [
        {
          status: UserStatus.APPROVED,
          roleAssignments: {
            some: {
              isActive: true,
              subRole: { in: [SubRole.EDUCATOR, SubRole.CENTER_MANAGER] },
              projectId: "project-1",
              centerId: "center-1",
              semesterId: "semester-1",
            },
          },
        },
        {
          attendance: {
            some: {
              projectId: "project-1",
              centerId: "center-1",
              semesterId: "semester-1",
              roleAssignment: {
                subRole: { in: [SubRole.EDUCATOR, SubRole.CENTER_MANAGER] },
              },
            },
          },
        },
      ],
    },
    select: remunerationUserSelect("semester-1"),
    orderBy: { name: "asc" },
  });
  assert.deepEqual(result, [
    {
      id: "user-1",
      name: "Payee",
      firstName: "Payee",
      middleName: null,
      lastName: null,
      profileImageUrl: "https://cdn.example.test/payee.jpg",
      bankAccountNumber: null,
      bankAccountName: null,
      bankIfsc: null,
      bankName: null,
      bankBranch: null,
      upiId: null,
      remunerationPeriods: [
        {
          id: "period-1",
          amountPerDay: 625,
          effectiveFrom: "2026-07-01",
          effectiveTo: null,
        },
      ],
      dailyRate: 625,
    },
  ]);
});

test("getContextStaff limits approved staff to an exact active scope", async () => {
  const originalFindMany = prisma.user.findMany;
  let receivedArgs: Prisma.UserFindManyArgs | undefined;

  prisma.user.findMany = ((args: Prisma.UserFindManyArgs) => {
    receivedArgs = args;
    return Promise.resolve([]);
  }) as typeof prisma.user.findMany;

  try {
    await getContextStaff({
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
    });
  } finally {
    prisma.user.findMany = originalFindMany;
  }

  assert.deepEqual(receivedArgs, {
    where: {
      status: UserStatus.APPROVED,
      roleAssignments: {
        some: {
          isActive: true,
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-1",
        },
      },
    },
    select: {
      id: true,
      name: true,
      firstName: true,
      middleName: true,
      lastName: true,
      profileImageUrl: true,
      status: true,
      dob: true,
      roleAssignments: {
        where: {
          isActive: true,
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-1",
        },
        select: {
          id: true,
          subRole: true,
          projectId: true,
          centerId: true,
          semesterId: true,
          semesterLevelId: true,
          semesterLevel: {
            include: { academicLevel: true },
          },
          committedDays: true,
          isActive: true,
          project: { select: { id: true, name: true } },
          center: { select: { id: true, name: true } },
          semester: { select: { id: true, name: true } },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });
});

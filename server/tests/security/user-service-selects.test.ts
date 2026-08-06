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
          level: true,
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

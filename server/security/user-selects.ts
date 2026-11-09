import type { Prisma } from "../generated/prisma/index.js";

const activeRoleAssignments = {
  where: { isActive: true },
  select: {
    id: true,
    subRole: true,
    projectId: true,
    centerId: true,
    semesterId: true,
    semesterLevelId: true,
    committedDays: true,
    isActive: true,
    project: { select: { id: true, name: true } },
    center: { select: { id: true, name: true } },
    semester: { select: { id: true, name: true } },
    semesterLevel: { include: { academicLevel: true } },
  },
  orderBy: { assignedAt: "desc" },
} as const;

// A person's own profile, and the admin view of it, include past assignments
// too; the loaders split them into current and past.
const allRoleAssignments = {
  select: { ...activeRoleAssignments.select, assignedAt: true, endedAt: true },
  orderBy: { assignedAt: "desc" },
} as const;

// A person's own daily-rate history, across semesters. The semester id keeps
// periods from overlapping semesters (two centres, same dates) apart.
const userRemunerationPeriods = {
  select: {
    id: true,
    semesterId: true,
    amountPerDay: true,
    effectiveFrom: true,
    effectiveTo: true,
  },
  orderBy: { effectiveFrom: "asc" },
} as const;

export const publicUserSelect = {
  id: true,
  name: true,
  firstName: true,
  middleName: true,
  lastName: true,
  email: true,
  profileImageUrl: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  roleAssignments: activeRoleAssignments,
} as const satisfies Prisma.UserSelect;

export const currentUserSelect = {
  id: true,
  email: true,
  name: true,
  firstName: true,
  middleName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
  status: true,
  phone: true,
  qualification: true,
  address: true,
  dob: true,
  reimbursementAmount: true,
  bankAccountNumber: true,
  bankAccountName: true,
  bankIfsc: true,
  bankName: true,
  bankBranch: true,
  upiId: true,
  createdAt: true,
  updatedAt: true,
  roleAssignments: allRoleAssignments,
  remunerationPeriods: userRemunerationPeriods,
} as const satisfies Prisma.UserSelect;

export const adminUserSelect = {
  id: true,
  email: true,
  name: true,
  firstName: true,
  middleName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
  status: true,
  phone: true,
  qualification: true,
  address: true,
  dob: true,
  createdAt: true,
  updatedAt: true,
  roleAssignments: activeRoleAssignments,
  // Devices with notifications on, for the Users page.
  _count: { select: { pushSubscriptions: true } },
} as const satisfies Prisma.UserSelect;

export const adminUserDetailSelect = {
  ...adminUserSelect,
  roleAssignments: allRoleAssignments,
  remunerationRates: {
    select: { semesterId: true, dailyRate: true },
    orderBy: { semesterId: "asc" },
  },
  remunerationPeriods: userRemunerationPeriods,
} as const satisfies Prisma.UserSelect;

// Admins confirm bank details exist without receiving the account number.
export const adminBankSummarySelect = {
  bankAccountNumber: true,
  bankName: true,
  bankIfsc: true,
  upiId: true,
} as const satisfies Prisma.UserSelect;

export const remunerationUserSelect = (semesterId: string) =>
  ({
    id: true,
    name: true,
    firstName: true,
    middleName: true,
    lastName: true,
    profileImageUrl: true,
    bankAccountNumber: true,
    bankAccountName: true,
    bankIfsc: true,
    bankName: true,
    bankBranch: true,
    upiId: true,
    remunerationRates: {
      where: { semesterId },
      select: { dailyRate: true },
      take: 1,
    },
    remunerationPeriods: {
      where: { semesterId },
      select: {
        id: true,
        amountPerDay: true,
        effectiveFrom: true,
        effectiveTo: true,
      },
      orderBy: { effectiveFrom: "asc" },
    },
  }) as const satisfies Prisma.UserSelect;

export const contextStaffSelect = ({
  projectId,
  centerId,
  semesterId,
}: {
  projectId: string;
  centerId: string;
  semesterId: string;
}) =>
  ({
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
        projectId,
        centerId,
        semesterId,
      },
      select: activeRoleAssignments.select,
      orderBy: activeRoleAssignments.orderBy,
    },
  }) as const satisfies Prisma.UserSelect;

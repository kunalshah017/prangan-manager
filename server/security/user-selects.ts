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
  roleAssignments: activeRoleAssignments,
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
} as const satisfies Prisma.UserSelect;

export const adminUserDetailSelect = {
  ...adminUserSelect,
  remunerationRates: {
    select: { semesterId: true, dailyRate: true },
    orderBy: { semesterId: "asc" },
  },
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

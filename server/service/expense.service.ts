import {
  AttendanceStatus,
  ExpenseStatus,
  Prisma,
  SubRole,
  UserStatus,
} from "../generated/prisma/index.js";
import { buildRemunerationPaymentEmailJob } from "../email/remuneration-payment-email.js";
import { prisma } from "../lib/prisma.js";
import type {
  ExpenseListQuery,
  ExpenseScopeInput,
  ManualExpenseInput,
  RemunerationPaymentInput,
} from "../security/expense-input.js";
import { enqueueEmail } from "./email-queue.service.js";

type Database = typeof prisma | Prisma.TransactionClient;

export class ExpenseServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
export const dateOnlyInIndia = (value: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export type ExpensePeriod = {
  periodStart: Date;
  periodEnd: Date;
};

export const clipMonthToSemester = (
  month: string,
  semesterStart: Date,
  semesterEnd: Date,
): ExpensePeriod => {
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0));
  const periodStart =
    monthStart > semesterStart ? monthStart : semesterStart;
  const periodEnd = monthEnd < semesterEnd ? monthEnd : semesterEnd;
  if (periodStart > periodEnd) {
    throw new ExpenseServiceError("Month must fall within the semester.", 400);
  }
  return { periodStart, periodEnd };
};

type AttendanceRecord = { id: string; date: Date };
type RatePeriod = {
  id: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  amountPerDay: unknown;
};

type ReadyCalculation = {
  status: "READY";
  amount: number;
  presentDayCount: number;
  attendanceRecordIds: string[];
  remunerationPeriodIds: string[];
};

export type RemunerationCalculation =
  | ReadyCalculation
  | {
      status: "INCOMPLETE";
      presentDayCount: number;
      missingDates: string[];
    }
  | {
      status: "NO_PAYMENT_DUE";
      presentDayCount: number;
    };

export const calculateRemuneration = (
  attendance: AttendanceRecord[],
  periods: RatePeriod[],
): RemunerationCalculation => {
  if (attendance.length === 0) {
    return { status: "NO_PAYMENT_DUE", presentDayCount: 0 };
  }

  const resolved = attendance.map((record) => ({
    record,
    period: periods.find(
      (period) =>
        period.effectiveFrom <= record.date &&
        (period.effectiveTo === null || period.effectiveTo >= record.date),
    ),
  }));
  const missingDates = resolved
    .filter((entry) => !entry.period)
    .map((entry) => dateOnly(entry.record.date));
  if (missingDates.length > 0) {
    return {
      status: "INCOMPLETE",
      presentDayCount: attendance.length,
      missingDates,
    };
  }

  const amountInPaise = resolved.reduce(
    (total, entry) =>
      total + Math.round(Number(entry.period!.amountPerDay) * 100),
    0,
  );
  if (amountInPaise === 0) {
    return {
      status: "NO_PAYMENT_DUE",
      presentDayCount: attendance.length,
    };
  }
  return {
    status: "READY",
    amount: amountInPaise / 100,
    presentDayCount: attendance.length,
    attendanceRecordIds: attendance.map((record) => record.id),
    remunerationPeriodIds: [
      ...new Set(resolved.map((entry) => entry.period!.id)),
    ],
  };
};

export const buildRemunerationSourceKey = (
  semesterId: string,
  userId: string,
  period: ExpensePeriod,
) =>
  `remuneration:${semesterId}:${userId}:${dateOnly(period.periodStart)}:${dateOnly(period.periodEnd)}`;

export const buildRemunerationMetadata = (
  selectedMonth: string,
  period: ExpensePeriod,
  calculation: ReadyCalculation,
) => ({
  selectedMonth,
  periodStart: dateOnly(period.periodStart),
  periodEnd: dateOnly(period.periodEnd),
  presentDayCount: calculation.presentDayCount,
  attendanceRecordIds: [...calculation.attendanceRecordIds],
  remunerationPeriodIds: [...calculation.remunerationPeriodIds],
  calculatedAmount: calculation.amount,
});

const validateScope = async (
  scope: ExpenseScopeInput,
  database: Database,
) => {
  const project = await database.projects.findUnique({
    where: { id: scope.projectId },
    select: { id: true },
  });
  if (!project) throw new ExpenseServiceError("Project not found.", 404);

  const center = await database.centers.findFirst({
    where: { id: scope.centerId, projectId: scope.projectId },
    select: { id: true },
  });
  if (!center) throw new ExpenseServiceError("Center not found.", 404);

  const semester = await database.semesters.findFirst({
    where: { id: scope.semesterId, centerId: scope.centerId },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      center: { select: { name: true } },
    },
  });
  if (!semester) throw new ExpenseServiceError("Semester not found.", 404);
  return semester;
};

const serializeExpense = <T extends { amount: unknown }>(expense: T) => ({
  ...expense,
  amount: Number(expense.amount),
});

export const listExpenses = async (
  input: ExpenseListQuery,
  database: Database = prisma,
) => {
  const semester = await validateScope(input, database);
  const period = input.month
    ? clipMonthToSemester(input.month, semester.startDate, semester.endDate)
    : null;
  const records = await database.expense.findMany({
    where: {
      projectId: input.projectId,
      centerId: input.centerId,
      semesterId: input.semesterId,
      status: input.status ?? ExpenseStatus.ACTIVE,
      ...(period && {
        incurredOn: {
          gte: period.periodStart,
          lte: period.periodEnd,
        },
      }),
      ...(input.expenseType && { expenseType: input.expenseType }),
      ...(input.category && {
        category: { equals: input.category, mode: "insensitive" },
      }),
      ...(input.search && {
        OR: [
          { title: { contains: input.search, mode: "insensitive" } },
          { category: { contains: input.search, mode: "insensitive" } },
          { notes: { contains: input.search, mode: "insensitive" } },
          {
            payee: {
              is: { name: { contains: input.search, mode: "insensitive" } },
            },
          },
        ],
      }),
    },
    include: {
      payee: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, name: true } },
      voidedByUser: { select: { id: true, name: true } },
    },
    orderBy: [{ incurredOn: "desc" }, { createdAt: "desc" }],
  });
  const serialized = records.map(serializeExpense);
  const totals = serialized.reduce(
    (result, expense) => {
      if (expense.status === ExpenseStatus.VOIDED) {
        result.voided += expense.amount;
      } else {
        result.active += expense.amount;
        if (expense.expenseType === "REMUNERATION") {
          result.remuneration += expense.amount;
        }
        if (expense.expenseType === "MANUAL") {
          result.manual += expense.amount;
        }
      }
      return result;
    },
    { active: 0, remuneration: 0, manual: 0, voided: 0 },
  );
  const categories = [
    ...new Set(serialized.map((expense) => expense.category)),
  ].sort((left, right) => left.localeCompare(right));
  return { expenses: serialized, totals, categories };
};

export const createManualExpense = async (
  input: ManualExpenseInput,
  administratorId: string,
  database: Database = prisma,
) => {
  const semester = await validateScope(input, database);
  const incurredOn = new Date(`${input.incurredOn}T00:00:00.000Z`);
  if (incurredOn < semester.startDate || incurredOn > semester.endDate) {
    throw new ExpenseServiceError(
      "Expense date must fall within the semester.",
      400,
    );
  }
  const expense = await database.expense.create({
    data: {
      projectId: input.projectId,
      centerId: input.centerId,
      semesterId: input.semesterId,
      expenseType: "MANUAL",
      category: input.category,
      title: input.title,
      amount: input.amount,
      incurredOn,
      ...(input.notes && { notes: input.notes }),
      status: ExpenseStatus.ACTIVE,
      createdBy: administratorId,
    },
  });
  return serializeExpense(expense);
};

export const voidExpense = async (
  expenseId: string,
  reason: string,
  administratorId: string,
  database: Database = prisma,
) => {
  const expense = await database.expense.findUnique({
    where: { id: expenseId },
  });
  if (!expense) throw new ExpenseServiceError("Expense not found.", 404);
  await validateScope(expense, database);
  if (
    expense.expenseType !== "MANUAL" ||
    expense.status !== ExpenseStatus.ACTIVE
  ) {
    throw new ExpenseServiceError(
      "Only active manual expenses can be voided.",
      409,
    );
  }
  let updated;
  try {
    updated = await database.expense.update({
      where: { id: expenseId, status: ExpenseStatus.ACTIVE },
      data: {
        status: ExpenseStatus.VOIDED,
        voidedBy: administratorId,
        voidedAt: new Date(),
        voidReason: reason,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new ExpenseServiceError(
        "Only active manual expenses can be voided.",
        409,
      );
    }
    throw error;
  }
  return serializeExpense(updated);
};

type PaymentResult =
  | {
      userId: string;
      status: "PAID";
      amount: number;
      presentDayCount: number;
      paidAt: Date;
    }
  | {
      userId: string;
      status: "ALREADY_PAID" | "NO_PAYMENT_DUE";
    }
  | {
      userId: string;
      status: "INCOMPLETE";
      reason: "NOT_ELIGIBLE" | "MISSING_REMUNERATION" | "PROCESSING_FAILED";
      missingDates?: string[];
    };

const isUniqueConflict = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2002";

const payOneUser = async (
  input: RemunerationPaymentInput,
  userId: string,
  administratorId: string,
  semester: {
    name: string;
    center: { name: string };
  },
  period: ExpensePeriod,
  database: typeof prisma,
  now: Date,
): Promise<PaymentResult> => {
  const sourceKey = buildRemunerationSourceKey(
    input.semesterId,
    userId,
    period,
  );
  try {
    return await database.$transaction(async (transaction) => {
      const existing = await transaction.expense.findUnique({
        where: { sourceKey },
        select: { id: true },
      });
      if (existing) return { userId, status: "ALREADY_PAID" };

      const user = await transaction.user.findFirst({
        where: {
          id: userId,
          status: UserStatus.APPROVED,
          roleAssignments: {
            some: {
              projectId: input.projectId,
              centerId: input.centerId,
              semesterId: input.semesterId,
              subRole: { in: [SubRole.EDUCATOR, SubRole.CENTER_MANAGER] },
            },
          },
        },
        select: { id: true, name: true, email: true },
      });
      if (!user) {
        return { userId, status: "INCOMPLETE", reason: "NOT_ELIGIBLE" };
      }

      const [attendance, periods] = await Promise.all([
        transaction.userAttendance.findMany({
          where: {
            userId,
            projectId: input.projectId,
            centerId: input.centerId,
            semesterId: input.semesterId,
            status: AttendanceStatus.PRESENT,
            date: { gte: period.periodStart, lte: period.periodEnd },
            roleAssignment: {
              is: {
                subRole: {
                  in: [SubRole.EDUCATOR, SubRole.CENTER_MANAGER],
                },
              },
            },
          },
          select: { id: true, date: true },
          orderBy: { date: "asc" },
        }),
        transaction.semesterRemunerationPeriod.findMany({
          where: {
            userId,
            semesterId: input.semesterId,
            effectiveFrom: { lte: period.periodEnd },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: period.periodStart } },
            ],
          },
          select: {
            id: true,
            effectiveFrom: true,
            effectiveTo: true,
            amountPerDay: true,
          },
          orderBy: { effectiveFrom: "asc" },
        }),
      ]);
      const calculation = calculateRemuneration(attendance, periods);
      if (calculation.status === "INCOMPLETE") {
        return {
          userId,
          status: "INCOMPLETE",
          reason: "MISSING_REMUNERATION",
          missingDates: calculation.missingDates,
        };
      }
      if (calculation.status === "NO_PAYMENT_DUE") {
        return { userId, status: "NO_PAYMENT_DUE" };
      }

      await transaction.expense.create({
        data: {
          projectId: input.projectId,
          centerId: input.centerId,
          semesterId: input.semesterId,
          expenseType: "REMUNERATION",
          category: "Remuneration",
          title: `${input.month} remuneration — ${user.name}`,
          amount: calculation.amount,
          incurredOn: period.periodEnd,
          payeeUserId: userId,
          sourceKey,
          metadata: buildRemunerationMetadata(
            input.month,
            period,
            calculation,
          ),
          status: ExpenseStatus.ACTIVE,
          createdBy: administratorId,
        },
      });
      await enqueueEmail(
        buildRemunerationPaymentEmailJob({
          sourceKey,
          email: user.email,
          recipientName: user.name,
          centerName: semester.center.name,
          semesterName: semester.name,
          paymentMonth: input.month,
          presentDayCount: calculation.presentDayCount,
          amount: calculation.amount,
          paymentDate: dateOnlyInIndia(now),
        }),
        transaction,
      );
      return {
        userId,
        status: "PAID",
        amount: calculation.amount,
        presentDayCount: calculation.presentDayCount,
        paidAt: now,
      };
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return { userId, status: "ALREADY_PAID" };
    }
    throw error;
  }
};

export const markRemunerationPaid = async (
  input: RemunerationPaymentInput,
  administratorId: string,
  options: { database?: typeof prisma; now?: Date } = {},
) => {
  const database = options.database ?? prisma;
  const now = options.now ?? new Date();
  const semester = await validateScope(input, database);
  const period = clipMonthToSemester(
    input.month,
    semester.startDate,
    semester.endDate,
  );
  const results: PaymentResult[] = [];
  for (const userId of input.userIds) {
    try {
      results.push(
        await payOneUser(
          input,
          userId,
          administratorId,
          semester,
          period,
          database,
          now,
        ),
      );
    } catch {
      results.push({
        userId,
        status: "INCOMPLETE",
        reason: "PROCESSING_FAILED",
      });
    }
  }
  return { results };
};

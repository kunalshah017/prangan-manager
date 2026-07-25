import assert from "node:assert/strict";
import test from "node:test";

import {
  ExpenseServiceError,
  buildRemunerationMetadata,
  buildRemunerationSourceKey,
  calculateRemuneration,
  clipMonthToSemester,
  createManualExpense,
  dateOnlyInIndia,
  listExpenses,
  markRemunerationPaid,
  voidExpense,
} from "../../service/expense.service.js";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

const scopedDatabase = (overrides: Record<string, unknown> = {}) =>
  ({
    projects: {
      findUnique: async () => ({ id: "project-1" }),
    },
    centers: {
      findFirst: async () => ({ id: "center-1" }),
    },
    semesters: {
      findFirst: async () => ({
        id: "semester-1",
        name: "Semester 1",
        startDate: date("2026-07-10"),
        endDate: date("2026-08-10"),
        center: { name: "Prangan Center" },
      }),
    },
    ...overrides,
  }) as never;

test("expense service clips a payment month to semester boundaries", () => {
  assert.deepEqual(
    clipMonthToSemester(
      "2026-07",
      date("2026-07-10"),
      date("2026-08-10"),
    ),
    {
      periodStart: date("2026-07-10"),
      periodEnd: date("2026-07-31"),
    },
  );
  assert.throws(
    () =>
      clipMonthToSemester(
        "2026-06",
        date("2026-07-10"),
        date("2026-08-10"),
      ),
    (error) =>
      error instanceof ExpenseServiceError && error.statusCode === 400,
  );
});

test("payment dates use the India business date around midnight", () => {
  assert.equal(
    dateOnlyInIndia(new Date("2026-07-24T18:29:59.000Z")),
    "2026-07-24",
  );
  assert.equal(
    dateOnlyInIndia(new Date("2026-07-24T18:30:00.000Z")),
    "2026-07-25",
  );
});

test("expense service resolves effective rates and reports incomplete present dates", () => {
  const attendance = [
    { id: "attendance-1", date: date("2026-07-12") },
    { id: "attendance-2", date: date("2026-07-20") },
  ];
  const complete = calculateRemuneration(attendance, [
    {
      id: "rate-1",
      effectiveFrom: date("2026-07-01"),
      effectiveTo: date("2026-07-15"),
      amountPerDay: 500,
    },
    {
      id: "rate-2",
      effectiveFrom: date("2026-07-16"),
      effectiveTo: null,
      amountPerDay: 750,
    },
  ]);

  assert.deepEqual(complete, {
    status: "READY",
    amount: 1250,
    presentDayCount: 2,
    attendanceRecordIds: ["attendance-1", "attendance-2"],
    remunerationPeriodIds: ["rate-1", "rate-2"],
  });
  assert.deepEqual(
    calculateRemuneration(attendance, [
      {
        id: "rate-1",
        effectiveFrom: date("2026-07-01"),
        effectiveTo: date("2026-07-15"),
        amountPerDay: 500,
      },
    ]),
    {
      status: "INCOMPLETE",
      presentDayCount: 2,
      missingDates: ["2026-07-20"],
    },
  );
});

test("expense service treats no attendance and zero rates as no payment due", () => {
  assert.deepEqual(calculateRemuneration([], []), {
    status: "NO_PAYMENT_DUE",
    presentDayCount: 0,
  });
  assert.deepEqual(
    calculateRemuneration(
      [{ id: "attendance-1", date: date("2026-07-12") }],
      [
        {
          id: "rate-1",
          effectiveFrom: date("2026-07-01"),
          effectiveTo: null,
          amountPerDay: 0,
        },
      ],
    ),
    { status: "NO_PAYMENT_DUE", presentDayCount: 1 },
  );
});

test("expense service builds stable source keys and immutable metadata snapshots", () => {
  const period = {
    periodStart: date("2026-07-10"),
    periodEnd: date("2026-07-31"),
  };
  const calculation = {
    status: "READY" as const,
    amount: 1250,
    presentDayCount: 2,
    attendanceRecordIds: ["attendance-1", "attendance-2"],
    remunerationPeriodIds: ["rate-1", "rate-2"],
  };

  assert.equal(
    buildRemunerationSourceKey("semester-1", "user-1", period),
    "remuneration:semester-1:user-1:2026-07-10:2026-07-31",
  );
  assert.deepEqual(buildRemunerationMetadata("2026-07", period, calculation), {
    selectedMonth: "2026-07",
    periodStart: "2026-07-10",
    periodEnd: "2026-07-31",
    presentDayCount: 2,
    attendanceRecordIds: ["attendance-1", "attendance-2"],
    remunerationPeriodIds: ["rate-1", "rate-2"],
    calculatedAmount: 1250,
  });
});

test("manual expense create, list, and void preserve ledger rules", async () => {
  let createdData: Record<string, unknown> | undefined;
  let updatedData: Record<string, unknown> | undefined;
  const activeManual = {
    id: "expense-1",
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    expenseType: "MANUAL",
    status: "ACTIVE",
    amount: 500,
    category: "Materials",
    incurredOn: date("2026-07-20"),
  };
  const database = scopedDatabase({
    expense: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdData = data;
        return { id: "expense-1", ...data };
      },
      findMany: async () => [
        activeManual,
        {
          ...activeManual,
          id: "expense-2",
          expenseType: "REMUNERATION",
          amount: 750,
          category: "Remuneration",
        },
      ],
      findUnique: async () => activeManual,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updatedData = data;
        return { ...activeManual, ...data };
      },
    },
  });

  await createManualExpense(
    {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      title: "Supplies",
      category: "Materials",
      amount: 500,
      incurredOn: "2026-07-20",
    },
    "admin-1",
    database,
  );
  assert.deepEqual(createdData, {
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    expenseType: "MANUAL",
    category: "Materials",
    title: "Supplies",
    amount: 500,
    incurredOn: date("2026-07-20"),
    status: "ACTIVE",
    createdBy: "admin-1",
  });

  const listed = await listExpenses(
    {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      month: "2026-07",
    },
    database,
  );
  assert.deepEqual(listed.totals, {
    active: 1250,
    remuneration: 750,
    manual: 500,
    voided: 0,
  });
  assert.equal(listed.expenses.length, 2);
  assert.deepEqual(listed.categories, ["Materials", "Remuneration"]);

  await voidExpense("expense-1", "Duplicate", "admin-1", database);
  assert.equal(updatedData?.status, "VOIDED");
  assert.equal(updatedData?.voidedBy, "admin-1");
  assert.ok(updatedData?.voidedAt instanceof Date);
  assert.equal(updatedData?.voidReason, "Duplicate");
});

test("remuneration expenses cannot be voided", async () => {
  const database = scopedDatabase({
    expense: {
      findUnique: async () => ({
        id: "expense-1",
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        expenseType: "REMUNERATION",
        status: "ACTIVE",
      }),
    },
  });

  await assert.rejects(
    voidExpense("expense-1", "Correction", "admin-1", database),
    (error) =>
      error instanceof ExpenseServiceError && error.statusCode === 409,
  );
});

test("a concurrent manual void maps the lost update to a conflict", async () => {
  const database = scopedDatabase({
    expense: {
      findUnique: async () => ({
        id: "expense-1",
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        expenseType: "MANUAL",
        status: "ACTIVE",
      }),
      update: async () => {
        throw { code: "P2025" };
      },
    },
  });

  await assert.rejects(
    voidExpense("expense-1", "Correction", "admin-1", database),
    (error) =>
      error instanceof ExpenseServiceError && error.statusCode === 409,
  );
});

test("duplicate remuneration payment conflicts map to ALREADY_PAID", async () => {
  let attendanceWhere: Record<string, unknown> | undefined;
  const transaction = {
    expense: {
      findUnique: async () => null,
      create: async () => {
        throw { code: "P2002" };
      },
    },
    user: {
      findFirst: async () => ({
        id: "user-1",
        name: "Person",
        email: "person@example.org",
      }),
    },
    userAttendance: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        attendanceWhere = where;
        return [{ id: "attendance-1", date: date("2026-07-12") }];
      },
    },
    semesterRemunerationPeriod: {
      findMany: async () => [
        {
          id: "rate-1",
          effectiveFrom: date("2026-07-01"),
          effectiveTo: null,
          amountPerDay: 500,
        },
      ],
    },
  };
  const database = scopedDatabase({
    $transaction: async (operation: (tx: unknown) => unknown) =>
      operation(transaction),
  });

  assert.deepEqual(
    await markRemunerationPaid(
      {
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        month: "2026-07",
        userIds: ["user-1"],
      },
      "admin-1",
      { database, now: new Date("2026-07-25T10:00:00.000Z") },
    ),
    { results: [{ userId: "user-1", status: "ALREADY_PAID" }] },
  );
  assert.deepEqual(attendanceWhere?.roleAssignment, {
    is: {
      subRole: { in: ["EDUCATOR", "CENTER_MANAGER"] },
    },
  });
});

test("bulk payment creates one expense and email only for the ready user", async () => {
  const createdExpenses: Array<Record<string, unknown>> = [];
  const queuedEmails: Array<Record<string, unknown>> = [];
  const transaction = {
    expense: {
      findUnique: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdExpenses.push(data);
        return { id: "expense-1", ...data };
      },
    },
    emailJob: {
      upsert: async (input: Record<string, unknown>) => {
        queuedEmails.push(input);
        return input;
      },
    },
    user: {
      findFirst: async ({ where }: { where: { id: string } }) =>
        where.id === "missing-user"
          ? null
          : {
              id: where.id,
              name: where.id,
              email: `${where.id}@example.org`,
            },
    },
    userAttendance: {
      findMany: async ({ where }: { where: { userId: string } }) => [
        { id: `attendance-${where.userId}`, date: date("2026-07-12") },
      ],
    },
    semesterRemunerationPeriod: {
      findMany: async ({ where }: { where: { userId: string } }) => [
        {
          id: `rate-${where.userId}`,
          effectiveFrom: date("2026-07-01"),
          effectiveTo: null,
          amountPerDay: where.userId === "zero-user" ? 0 : 500,
        },
      ],
    },
  };
  const database = scopedDatabase({
    $transaction: async (operation: (tx: unknown) => unknown) =>
      operation(transaction),
  });

  const result = await markRemunerationPaid(
    {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      month: "2026-07",
      userIds: ["ready-user", "missing-user", "zero-user"],
    },
    "admin-1",
    { database, now: new Date("2026-07-24T18:30:00.000Z") },
  );

  assert.deepEqual(
    result.results.map(({ userId, status }) => ({ userId, status })),
    [
      { userId: "ready-user", status: "PAID" },
      { userId: "missing-user", status: "INCOMPLETE" },
      { userId: "zero-user", status: "NO_PAYMENT_DUE" },
    ],
  );
  assert.equal(createdExpenses.length, 1);
  assert.equal(createdExpenses[0]?.payeeUserId, "ready-user");
  assert.equal(queuedEmails.length, 1);
  assert.match(
    String(
      (
        queuedEmails[0]?.create as Record<string, unknown> | undefined
      )?.text,
    ),
    /Payment date: 2026-07-25/,
  );
});

test("an existing remuneration expense short-circuits without queueing email", async () => {
  let userReads = 0;
  let queuedEmails = 0;
  const transaction = {
    expense: {
      findUnique: async () => ({ id: "expense-1" }),
    },
    emailJob: {
      upsert: async () => {
        queuedEmails += 1;
      },
    },
    user: {
      findFirst: async () => {
        userReads += 1;
        return null;
      },
    },
  };
  const database = scopedDatabase({
    $transaction: async (operation: (tx: unknown) => unknown) =>
      operation(transaction),
  });

  const result = await markRemunerationPaid(
    {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      month: "2026-07",
      userIds: ["user-1"],
    },
    "admin-1",
    { database },
  );

  assert.deepEqual(result.results, [
    { userId: "user-1", status: "ALREADY_PAID" },
  ]);
  assert.equal(userReads, 0);
  assert.equal(queuedEmails, 0);
});

test("a payment transaction rolls back its expense when email queueing fails", async () => {
  const committedExpenses: Array<Record<string, unknown>> = [];
  const database = scopedDatabase({
    $transaction: async (operation: (tx: unknown) => unknown) => {
      let stagedExpense: Record<string, unknown> | undefined;
      const transaction = {
        expense: {
          findUnique: async () => null,
          create: async ({ data }: { data: Record<string, unknown> }) => {
            stagedExpense = data;
            return { id: "expense-1", ...data };
          },
        },
        emailJob: {
          upsert: async () => {
            throw new Error("queue unavailable");
          },
        },
        user: {
          findFirst: async () => ({
            id: "user-1",
            name: "Person",
            email: "person@example.org",
          }),
        },
        userAttendance: {
          findMany: async () => [
            { id: "attendance-1", date: date("2026-07-12") },
          ],
        },
        semesterRemunerationPeriod: {
          findMany: async () => [
            {
              id: "rate-1",
              effectiveFrom: date("2026-07-01"),
              effectiveTo: null,
              amountPerDay: 500,
            },
          ],
        },
      };
      const result = await operation(transaction);
      if (stagedExpense) committedExpenses.push(stagedExpense);
      return result;
    },
  });

  const result = await markRemunerationPaid(
    {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      month: "2026-07",
      userIds: ["user-1"],
    },
    "admin-1",
    { database },
  );

  assert.deepEqual(result.results, [
    {
      userId: "user-1",
      status: "INCOMPLETE",
      reason: "PROCESSING_FAILED",
    },
  ]);
  assert.equal(committedExpenses.length, 0);
});

test("concurrent payment requests commit exactly one expense and email", async () => {
  const committedExpenses: Array<Record<string, unknown>> = [];
  const committedEmails: Array<Record<string, unknown>> = [];
  let transactionQueue = Promise.resolve();
  const database = scopedDatabase({
    $transaction: (operation: (tx: unknown) => unknown) => {
      const run = transactionQueue.then(async () => {
        let stagedExpense: Record<string, unknown> | undefined;
        let stagedEmail: Record<string, unknown> | undefined;
        const transaction = {
          expense: {
            findUnique: async () =>
              committedExpenses.length ? { id: "expense-1" } : null,
            create: async ({ data }: { data: Record<string, unknown> }) => {
              stagedExpense = data;
              return { id: "expense-1", ...data };
            },
          },
          emailJob: {
            upsert: async (input: Record<string, unknown>) => {
              stagedEmail = input;
              return input;
            },
          },
          user: {
            findFirst: async () => ({
              id: "user-1",
              name: "Person",
              email: "person@example.org",
            }),
          },
          userAttendance: {
            findMany: async () => [
              { id: "attendance-1", date: date("2026-07-12") },
            ],
          },
          semesterRemunerationPeriod: {
            findMany: async () => [
              {
                id: "rate-1",
                effectiveFrom: date("2026-07-01"),
                effectiveTo: null,
                amountPerDay: 500,
              },
            ],
          },
        };
        const result = await operation(transaction);
        if (stagedExpense) committedExpenses.push(stagedExpense);
        if (stagedEmail) committedEmails.push(stagedEmail);
        return result;
      });
      transactionQueue = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  });
  const input = {
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    month: "2026-07",
    userIds: ["user-1"],
  };

  const results = await Promise.all([
    markRemunerationPaid(input, "admin-1", { database }),
    markRemunerationPaid(input, "admin-1", { database }),
  ]);

  assert.deepEqual(
    results.map((result) => result.results[0]?.status).sort(),
    ["ALREADY_PAID", "PAID"],
  );
  assert.equal(committedExpenses.length, 1);
  assert.equal(committedEmails.length, 1);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  parseExpenseListQuery,
  parseManualExpenseInput,
  parseRemunerationPaymentInput,
  parseVoidExpenseInput,
} from "../../security/expense-input.js";

test("expense input rejects unknown fields before accepting scoped filters", () => {
  assert.deepEqual(
    parseExpenseListQuery({
      projectId: " project-1 ",
      centerId: " center-1 ",
      semesterId: " semester-1 ",
      month: "2026-07",
      expenseType: " REMUNERATION ",
      category: " Staff ",
      status: "ACTIVE",
      search: " Kunal ",
    }),
    {
      data: {
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        month: "2026-07",
        expenseType: "REMUNERATION",
        category: "Staff",
        status: "ACTIVE",
        search: "Kunal",
      },
    },
  );
  assert.deepEqual(
    parseExpenseListQuery({
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      extra: true,
    }),
    { error: "Expense filters contain unknown fields." },
  );
  assert.ok(
    "error" in
      parseExpenseListQuery({
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        month: "2026-7",
      }),
  );
});

test("manual expense input validates dates and positive amounts and trims text", () => {
  assert.deepEqual(
    parseManualExpenseInput({
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      title: "  Classroom supplies  ",
      category: "  Materials  ",
      amount: 1250.5,
      incurredOn: "2026-07-25",
      notes: "  Books and markers  ",
    }),
    {
      data: {
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        title: "Classroom supplies",
        category: "Materials",
        amount: 1250.5,
        incurredOn: "2026-07-25",
        notes: "Books and markers",
      },
    },
  );
  assert.equal(
    "data" in
      parseManualExpenseInput({
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        title: "Pens",
        category: "Materials",
        amount: 0.29,
        incurredOn: "2026-07-25",
      }),
    true,
  );

  for (const input of [
    {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      title: "Supplies",
      category: "Materials",
      amount: 0,
      incurredOn: "2026-07-25",
    },
    {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      title: "Supplies",
      category: "Materials",
      amount: 1,
      incurredOn: "2026-02-30",
    },
    {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      title: "Supplies",
      category: "Materials",
      amount: 1.001,
      incurredOn: "2026-07-25",
    },
    {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      title: "Supplies",
      category: "Materials",
      amount: 10_000_000_000,
      incurredOn: "2026-07-25",
    },
  ]) {
    assert.ok("error" in parseManualExpenseInput(input));
  }
});

test("void input requires one trimmed reason and rejects extra fields", () => {
  assert.deepEqual(parseVoidExpenseInput({ voidReason: "  Duplicate entry  " }), {
    data: { voidReason: "Duplicate entry" },
  });
  assert.ok("error" in parseVoidExpenseInput({ voidReason: "   " }));
  assert.ok(
    "error" in
      parseVoidExpenseInput({
        voidReason: "Duplicate",
        status: "VOIDED",
      }),
  );
});

test("remuneration payment input accepts only a canonical month and unique users", () => {
  assert.deepEqual(
    parseRemunerationPaymentInput({
      projectId: " project-1 ",
      centerId: " center-1 ",
      semesterId: " semester-1 ",
      month: "2026-07",
      userIds: ["user-1", "user-2"],
    }),
    {
      data: {
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        month: "2026-07",
        userIds: ["user-1", "user-2"],
      },
    },
  );

  for (const userIds of [[], ["user-1", "user-1"], ["user-1", " "]]) {
    assert.ok(
      "error" in
        parseRemunerationPaymentInput({
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-1",
          month: "2026-07",
          userIds,
        }),
    );
  }
  assert.ok(
    "error" in
      parseRemunerationPaymentInput({
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        month: "2026-13",
        userIds: ["user-1"],
      }),
  );
});

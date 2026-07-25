import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const clientFile = (path: string) =>
  new URL(`../../../client/src/${path}`, import.meta.url);

test("client remuneration data uses a dedicated scoped contract", async () => {
  const [typesSource, userHooksSource, expenseHooksSource, pageSource] =
    await Promise.all([
      readFile(clientFile("types/api.ts"), "utf8"),
      readFile(clientFile("hooks/useUserQueries.ts"), "utf8"),
      readFile(clientFile("hooks/useExpenseQueries.ts"), "utf8"),
      readFile(clientFile("pages/attendance/Remuneration.tsx"), "utf8"),
    ]);

  assert.match(typesSource, /export interface RemunerationUser/);
  for (const field of [
    "dailyRate",
    "remunerationPeriods",
    "bankAccountNumber",
    "bankAccountName",
    "bankIfsc",
    "bankName",
    "bankBranch",
    "upiId",
  ]) {
    assert.match(typesSource, new RegExp(`\\b${field}\\??:`));
  }

  assert.match(userHooksSource, /export const useRemunerationUsers/);
  assert.match(userHooksSource, /\/users\/remuneration\?/);
  assert.match(
    userHooksSource,
    /queryKey:[\s\S]*projectId[\s\S]*centerId[\s\S]*semesterId/,
  );
  assert.match(
    userHooksSource,
    /enabled:[\s\S]*projectId[\s\S]*centerId[\s\S]*semesterId/,
  );

  assert.match(expenseHooksSource, /export const useExpenses/);
  assert.match(expenseHooksSource, /export const useMarkRemunerationPaid/);
  assert.match(expenseHooksSource, /\/expenses\/remuneration-payments/);
  assert.match(pageSource, /useRemunerationUsers/);
  assert.match(pageSource, /useExpenses/);
  assert.match(pageSource, /useMarkRemunerationPaid/);
  assert.doesNotMatch(pageSource, /\buseUsers\b/);
  assert.doesNotMatch(pageSource, /useSetRemunerationPeriod/);
  assert.match(pageSource, /buildRemunerationRows/);
  assert.match(pageSource, /payeesQuery\.isLoading/);
  assert.match(pageSource, /payeesQuery\.error/);
  assert.match(pageSource, /Manage remuneration settings/);
  assert.match(pageSource, /dashboard\/users/);
  for (const state of ["Ready", "Incomplete", "No payment due", "Paid"]) {
    assert.match(pageSource, new RegExp(state));
  }
  assert.match(pageSource, /Select all ready/);
  assert.match(pageSource, /Mark selected as paid/);
  assert.match(pageSource, /Mark as paid/);
  assert.doesNotMatch(pageSource, /Save remuneration/);
  assert.doesNotMatch(pageSource, /type="number"/);
  assert.doesNotMatch(pageSource, /type="date"/);
  assert.doesNotMatch(pageSource, /\|\|\s*500|\?\?\s*500/);
});

test("attendance exports require successful scoped payee data", async () => {
  const pageSource = await readFile(
    clientFile("pages/attendance/ViewAttendance.tsx"),
    "utf8",
  );

  assert.match(
    pageSource,
    /useRemunerationUsers\(\{[\s\S]*projectId[\s\S]*centerId[\s\S]*semesterId/,
  );
  assert.doesNotMatch(pageSource, /\buseUsers\b/);
  assert.match(pageSource, /isLoading: isPayeesLoading/);
  assert.match(pageSource, /isError: isPayeesError/);
  assert.match(pageSource, /error: payeesError/);
  assert.match(pageSource, /isSuccess: isPayeesSuccess/);
  assert.match(pageSource, /isPayeesLoading[\s\S]*reimbursement rates/i);
  assert.match(pageSource, /isPayeesError[\s\S]*payeesError/);
  assert.match(pageSource, /disabled=\{!canExport\}/);

  for (const handler of ["exportToExcel", "exportToPDF"]) {
    const handlerSource = pageSource.match(
      new RegExp(`const ${handler} = async \\(\\) => \\{[\\s\\S]*?\\n    \\};`),
    )?.[0];
    assert.ok(handlerSource, `expected ${handler}`);
    const guardIndex = handlerSource.indexOf("if (!canExport)");
    const exportingIndex = handlerSource.indexOf("setIsExporting(true)");
    assert.ok(guardIndex >= 0, `expected ${handler} payee guard`);
    assert.ok(
      exportingIndex > guardIndex,
      `expected ${handler} guard before export`,
    );
  }

  assert.doesNotMatch(pageSource, /const reimbursementRate = 500/);
  assert.doesNotMatch(pageSource, /userReimbursementRates\[userId\] \|\| 500/);
});

test("remuneration exposes incomplete payee data read-only without inventing an amount", async () => {
  const [pageSource, helperSource] = await Promise.all([
    readFile(clientFile("pages/attendance/Remuneration.tsx"), "utf8"),
    readFile(clientFile("lib/remuneration.ts"), "utf8"),
  ]);

  assert.match(
    helperSource,
    /const normalizeRate =[\s\S]*Number\.isFinite\(rate\)[\s\S]*rate >= 0[\s\S]*: null;/,
  );
  assert.match(
    helperSource,
    /\.filter\(\(row\) => row\.present > 0 && row\.total === null\)/,
  );
  assert.match(
    helperSource,
    /const amountPerDay = amountForDate/,
  );
  assert.match(pageSource, /row\.total === null[\s\S]*"INCOMPLETE"/);
  assert.match(pageSource, /Applicable schedule/);
  assert.match(pageSource, /Add missing remuneration in Semester Users/);
  assert.doesNotMatch(pageSource, /useSetRemunerationPeriod/);
  assert.doesNotMatch(pageSource, /\|\|\s*500|\?\?\s*500/);
});

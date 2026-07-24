import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const clientFile = (path: string) =>
  new URL(`../../../client/src/${path}`, import.meta.url);

test("client remuneration data uses a dedicated scoped contract", async () => {
  const [typesSource, hooksSource, pageSource] = await Promise.all([
    readFile(clientFile("types/api.ts"), "utf8"),
    readFile(clientFile("hooks/useUserQueries.ts"), "utf8"),
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

  assert.match(hooksSource, /export const useRemunerationUsers/);
  assert.match(hooksSource, /\/users\/remuneration\?/);
  assert.match(
    hooksSource,
    /queryKey:[\s\S]*projectId[\s\S]*centerId[\s\S]*semesterId/,
  );
  assert.match(
    hooksSource,
    /enabled:[\s\S]*projectId[\s\S]*centerId[\s\S]*semesterId/,
  );

  assert.match(pageSource, /useRemunerationUsers/);
  assert.match(pageSource, /useSetRemunerationPeriod/);
  assert.doesNotMatch(pageSource, /\buseUsers\b/);
  assert.match(pageSource, /buildRemunerationRows/);
  assert.match(pageSource, /payeesQuery\.isLoading/);
  assert.match(pageSource, /payeesQuery\.error/);
  assert.match(pageSource, /result\.missingRateUserIds/);
  assert.match(pageSource, /Needs remuneration/);
  assert.match(pageSource, /Save remuneration/);
  assert.match(pageSource, /Effective from/);
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

test("remuneration exposes incomplete payee data without inventing an amount", async () => {
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
  assert.match(pageSource, /result\.total === null \? "Pending remuneration"/);
  assert.match(pageSource, /row\.dailyRate === null \? "Needs remuneration"/);
  assert.doesNotMatch(pageSource, /\|\|\s*500|\?\?\s*500/);
});

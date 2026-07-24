import assert from "node:assert/strict";
import test from "node:test";

import { parseRemunerationPeriodInput } from "../../security/remuneration-input.js";

test("accepts a daily remuneration amount with an exact effective date", () => {
  assert.deepEqual(
    parseRemunerationPeriodInput({
      userId: "user-1",
      amountPerDay: 625.5,
      effectiveFrom: "2026-07-15",
    }),
    {
      userId: "user-1",
      amountPerDay: 625.5,
      effectiveFrom: "2026-07-15",
    },
  );
});

test("rejects invalid amounts, dates, and extra fields", () => {
  assert.throws(() =>
    parseRemunerationPeriodInput({
      userId: "user-1",
      amountPerDay: -1,
      effectiveFrom: "2026-02-30",
    }),
  );
  assert.throws(() =>
    parseRemunerationPeriodInput({
      userId: "user-1",
      amountPerDay: 100,
      effectiveFrom: "2026-07-15",
      dailyRate: 100,
    }),
  );
});

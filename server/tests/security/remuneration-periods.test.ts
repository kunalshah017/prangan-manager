import assert from "node:assert/strict";
import test from "node:test";

import {
  validateRemunerationPeriods,
  type RemunerationPeriod,
} from "../../lib/remuneration-periods.js";

const period = (
  effectiveFrom: string,
  effectiveTo: string | null,
  amountPerDay: number,
): RemunerationPeriod => ({ effectiveFrom, effectiveTo, amountPerDay });

test("rejects overlapping periods and accepts gaps", () => {
  assert.deepEqual(
    validateRemunerationPeriods(
      [
        period("2026-07-01", "2026-07-15", 500),
        period("2026-07-15", null, 650),
      ],
      "2026-07-01",
      "2026-09-30",
    ),
    ["Remuneration periods cannot overlap."],
  );

  assert.deepEqual(
    validateRemunerationPeriods(
      [
        period("2026-07-01", "2026-07-10", 500),
        period("2026-07-20", null, 650),
      ],
      "2026-07-01",
      "2026-09-30",
    ),
    [],
  );
});

test("rejects invalid amounts and dates outside the semester", () => {
  assert.deepEqual(
    validateRemunerationPeriods(
      [period("2026-06-30", "2026-10-01", -1)],
      "2026-07-01",
      "2026-09-30",
    ),
    [
      "Daily remuneration must be zero or more with at most two decimal places.",
      "Effective from must fall within the semester.",
      "Effective to must fall within the semester.",
    ],
  );
});

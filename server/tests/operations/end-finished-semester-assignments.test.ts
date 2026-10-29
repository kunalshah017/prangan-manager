import assert from "node:assert/strict";
import test from "node:test";

import {
  endDateFor,
  indiaToday,
  isSemesterFinished,
  parseArgs,
} from "../../scripts/end-finished-semester-assignments.js";

test("ending finished-semester roles is a dry run unless apply is explicit", () => {
  assert.deepEqual(parseArgs([]), { apply: false, backupPath: undefined });
  assert.deepEqual(parseArgs(["--apply", "--backup=out.json"]), { apply: true, backupPath: "out.json" });
  assert.throws(() => parseArgs(["--force"]), /Unknown argument/);
});

test("a semester is finished once archived or past its last day in India", () => {
  const semester = (status: string, endDate: string) => ({ status, endDate: new Date(`${endDate}T00:00:00.000Z`) });
  assert.equal(isSemesterFinished(semester("ACTIVE", "2026-04-30"), "2026-10-30"), true);
  assert.equal(isSemesterFinished(semester("ACTIVE", "2027-04-30"), "2026-10-30"), false);
  assert.equal(isSemesterFinished(semester("ACTIVE", "2026-10-30"), "2026-10-30"), false);
  assert.equal(isSemesterFinished(semester("ARCHIVED", "2027-04-30"), "2026-10-30"), true);
  // 20:00 UTC on 30 Oct is already 31 Oct in India.
  assert.equal(indiaToday(new Date("2026-10-30T20:00:00.000Z")), "2026-10-31");
});

test("a role ends when its semester did, never before it started", () => {
  // Stored as the day's last UTC millisecond; the role ends on that calendar day.
  const semesterEndDate = new Date("2026-04-30T23:59:59.999Z");
  assert.equal(
    endDateFor({ semesterEndDate, assignedAt: new Date("2025-07-01T00:00:00.000Z") }).toISOString(),
    "2026-04-30T00:00:00.000Z",
  );
  const lateStart = new Date("2026-05-10T00:00:00.000Z");
  assert.equal(endDateFor({ semesterEndDate, assignedAt: lateStart }), lateStart);
});

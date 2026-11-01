import { describe, expect, it } from "vitest";

import { initialDraft, rateChanges, rateErrors, rateHolderIndex, type RatePeriod } from "@/lib/semester-rates";
import type { RoleAssignment } from "@/types/api";

const semester = { id: "s1", startDate: "2026-06-01T00:00:00.000Z", endDate: "2027-03-31T00:00:00.000Z" };
const educator: RoleAssignment = { subRole: "EDUCATOR", projectId: "p", centerId: "c", semesterId: "s1", semesterLevelId: "l1" };
const manager: RoleAssignment = { subRole: "CENTER_MANAGER", projectId: "p", centerId: "c", semesterId: "s1" };
const saved: RatePeriod[] = [
  { id: "r1", semesterId: "s1", amountPerDay: "500", effectiveFrom: "2026-06-01T00:00:00.000Z", effectiveTo: null },
];
const today = "2026-11-07";

describe("semester daily rates", () => {
  it("keeps one rate per semester, on the first paid role", () => {
    const mentor: RoleAssignment = { subRole: "CURRICULUM_MENTOR", projectId: "p", centerId: "c", semesterId: "s1" };
    expect(rateHolderIndex([mentor, manager, educator], "s1")).toBe(1);
  });

  it("requires a rate for a new paid role, starting on the semester's first day", () => {
    const check = { assignments: [educator, manager], periods: [], drafts: {}, semesters: [semester], today };
    expect(rateErrors(check)).toEqual(["Assignment 1: enter a daily rate."]);

    const drafts = { s1: { amount: "450", from: "2026-06-01" } };
    expect(rateErrors({ ...check, drafts })).toEqual([]);
    expect(rateChanges({ ...check, drafts })).toEqual([
      { projectId: "p", centerId: "c", semesterId: "s1", amountPerDay: 450, effectiveFrom: "2026-06-01" },
    ]);
  });

  it("changes a saved rate from a date inside the semester, and saves nothing when unchanged", () => {
    const check = { assignments: [educator], periods: saved, drafts: {}, semesters: [semester], today };
    expect(initialDraft(saved, semester, today)).toEqual({ amount: "500", from: today });
    expect(rateErrors(check)).toEqual([]);
    expect(rateChanges({ ...check, drafts: { s1: { amount: "500", from: today } } })).toEqual([]);

    const raise = { s1: { amount: "600", from: "2026-12-01" } };
    expect(rateChanges({ ...check, drafts: raise })).toEqual([
      { projectId: "p", centerId: "c", semesterId: "s1", amountPerDay: 600, effectiveFrom: "2026-12-01" },
    ]);
    expect(rateErrors({ ...check, drafts: { s1: { amount: "600", from: "2027-05-01" } } })).toEqual([
      "Assignment 1: the new rate has to start within the semester.",
    ]);
    expect(rateErrors({ ...check, drafts: { s1: { amount: "abc", from: today } } })).toEqual([
      "Assignment 1: Enter a valid number.",
    ]);
  });
});

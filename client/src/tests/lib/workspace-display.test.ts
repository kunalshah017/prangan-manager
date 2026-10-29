import { describe, expect, it } from "vitest";

import { semesterProgress } from "@/lib/workspace-display";

const semester = {
  startDate: "2026-07-01T00:00:00.000Z",
  // Stored end dates carry the last moment of the day.
  endDate: "2026-07-28T23:59:59.999Z",
};

describe("semesterProgress", () => {
  it("counts the first day as week 1", () => {
    expect(semesterProgress(semester, new Date("2026-07-01T10:00:00Z"))).toEqual({
      week: 1,
      totalWeeks: 4,
      daysLeft: 27,
      percentage: 4,
    });
  });

  it("reaches the end on the last day", () => {
    expect(semesterProgress(semester, new Date("2026-07-28T10:00:00Z"))).toMatchObject({
      week: 4,
      daysLeft: 0,
      percentage: 100,
    });
  });

  it("stays within the semester outside its dates", () => {
    expect(semesterProgress(semester, new Date("2026-06-20T10:00:00Z"))).toMatchObject({ week: 1, percentage: 0 });
    expect(semesterProgress(semester, new Date("2026-09-01T10:00:00Z"))).toMatchObject({ daysLeft: 0, percentage: 100 });
  });
});

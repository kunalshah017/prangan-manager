import { describe, expect, it } from "vitest";

import { semesterProgress, semesterTiming } from "@/lib/workspace-display";

const semester = {
  startDate: "2026-07-01T00:00:00.000Z",
  endDate: "2026-07-28T00:00:00.000Z",
};

describe("semesterProgress", () => {
  it("counts the first day as day 1", () => {
    expect(semesterProgress(semester, new Date("2026-07-01T10:00:00Z"))).toEqual({
      daysLeft: 27,
      percentage: 4,
    });
  });

  it("reaches the end on the last day", () => {
    expect(semesterProgress(semester, new Date("2026-07-28T10:00:00Z"))).toMatchObject({
      daysLeft: 0,
      percentage: 100,
    });
  });

  it("stays within the semester outside its dates", () => {
    expect(semesterProgress(semester, new Date("2026-06-20T10:00:00Z"))).toMatchObject({ percentage: 0 });
    expect(semesterProgress(semester, new Date("2026-09-01T10:00:00Z"))).toMatchObject({ daysLeft: 0, percentage: 100 });
  });
});

describe("semesterTiming", () => {
  it("follows the day in India, not UTC or the viewer's zone", () => {
    const running = { ...semester, status: "ACTIVE" as const };
    // 28 Jul 20:00 UTC is already 29 Jul in India: the semester has ended.
    expect(semesterTiming(running, new Date("2026-07-28T20:00:00Z")).label).toBe("Ended");
    // 30 Jun 19:00 UTC is 1 Jul in India: the first day.
    expect(semesterTiming(running, new Date("2026-06-30T19:00:00Z")).label).toBe("Active");
  });
});

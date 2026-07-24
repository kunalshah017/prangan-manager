import { describe, expect, it } from "vitest";

import {
  mergeDraftSetupSummaries,
  normalizeSetupProgress,
} from "@/lib/semester-setup-summary";
import type { Semester, SemesterSetupSummary } from "@/types/api";

const semester = (
  id: string,
  status: Semester["status"],
  updatedAt = "2026-07-24T00:00:00.000Z",
): Semester => ({
  id,
  name: `Semester ${id}`,
  startDate: "2026-07-01T00:00:00.000Z",
  endDate: "2026-12-31T00:00:00.000Z",
  centerId: "center-1",
  status,
  createdAt: updatedAt,
  updatedAt,
});

const summary = (
  target: Semester,
  resolved: number,
): SemesterSetupSummary => ({
  semester: target,
  sourceSemester: null,
  updatedAt: target.updatedAt,
  progress: {
    students: { resolved, total: 5 },
    staff: { resolved, total: 5 },
    rates: { resolved, total: 5 },
  },
});

describe("semester setup summary helpers", () => {
  it("normalizes invalid counts and keeps ARIA percentage aligned with visuals", () => {
    expect(normalizeSetupProgress(12, 10)).toEqual({
      resolved: 10,
      total: 10,
      percentage: 100,
    });
    expect(normalizeSetupProgress(-2, 10)).toEqual({
      resolved: 0,
      total: 10,
      percentage: 0,
    });
    expect(normalizeSetupProgress(Number.NaN, Number.POSITIVE_INFINITY)).toEqual({
      resolved: 0,
      total: 0,
      percentage: 100,
    });
    expect(normalizeSetupProgress(0, 0, false)).toEqual({
      resolved: 0,
      total: 0,
      percentage: 0,
    });
  });

  it("deduplicates summaries and supplies unavailable fallback progress for drafts", () => {
    const firstDraft = semester("draft-1", "DRAFT");
    const missingDraft = semester("draft-2", "DRAFT");
    const active = semester("active-1", "ACTIVE");
    const firstSummary = summary(firstDraft, 2);
    const duplicateSummary = summary(firstDraft, 4);

    const merged = mergeDraftSetupSummaries(
      [firstDraft, missingDraft, active],
      [firstSummary, duplicateSummary, summary(semester("orphan", "DRAFT"), 1)],
    );

    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({
      semester: { id: "draft-1" },
      progressAvailable: true,
      progress: { students: { resolved: 2, total: 5 } },
    });
    expect(merged[1]).toMatchObject({
      semester: { id: "draft-2" },
      progressAvailable: false,
      progress: {
        students: { resolved: 0, total: 0 },
        staff: { resolved: 0, total: 0 },
        rates: { resolved: 0, total: 0 },
      },
    });
  });
});

// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StudentPromotionEvidence } from "@/components/semesters/StudentPromotionEvidence";
import type { PromotionSuggestion } from "@/types/api";

afterEach(cleanup);

const suggestion = (
  overrides: Partial<PromotionSuggestion> = {},
): PromotionSuggestion => ({
  decision: "PROMOTE",
  targetSemesterLevelId: "semester-level-2",
  evidence: {
    status: "SCORED",
    reason: "ABOVE_THRESHOLD",
    threshold: 70,
    percentage: 82.5,
    examId: "exam-1",
    examName: "Pre-assessment",
    examDate: "2026-07-20T00:00:00.000Z",
  },
  ...overrides,
});

describe("student promotion suggestions", () => {
  it("shows the authoritative score, threshold, and recommendation", () => {
    render(<StudentPromotionEvidence suggestion={suggestion()} />);

    expect(screen.getByText(/82.5%/)).toBeTruthy();
    expect(screen.getByText(/above the 70% promotion threshold/i)).toBeTruthy();
    expect(screen.getByText(/suggested: promote/i)).toBeTruthy();
    expect(screen.getByText(/pre-assessment/i)).toBeTruthy();
  });

  it("explains absent and missing results without relying on color", () => {
    const { rerender } = render(
      <StudentPromotionEvidence
        suggestion={suggestion({
          decision: "REVIEW",
          evidence: {
            status: "ABSENT",
            reason: "ASSESSMENT_ABSENT",
            threshold: 70,
            examId: "exam-1",
            examName: "Pre-assessment",
            examDate: "2026-07-20T00:00:00.000Z",
          },
        })}
      />,
    );
    expect(screen.getByText(/student was absent/i)).toBeTruthy();
    expect(screen.getByText(/manual review required/i)).toBeTruthy();

    rerender(
      <StudentPromotionEvidence
        suggestion={suggestion({
          decision: "REVIEW",
          evidence: {
            status: "MISSING",
            reason: "ASSESSMENT_MISSING",
            threshold: 70,
          },
        })}
      />,
    );
    expect(screen.getByText(/no pre-assessment result/i)).toBeTruthy();
  });

  it("labels final-level completion as passed out", () => {
    render(
      <StudentPromotionEvidence
        suggestion={suggestion({
          decision: "PASSED_OUT",
          targetSemesterLevelId: undefined,
          evidence: {
            ...suggestion().evidence,
            reason: "FINAL_LEVEL_COMPLETED",
          },
        })}
      />,
    );

    expect(screen.getByText(/suggested: passed out/i)).toBeTruthy();
    expect(screen.getByText(/completed the final level/i)).toBeTruthy();
  });
});

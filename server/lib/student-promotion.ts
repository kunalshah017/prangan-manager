export type StudentProgressionDecision =
  | "REVIEW"
  | "PROMOTE"
  | "RETAIN"
  | "PASSED_OUT";

export type PromotionReason =
  | "ABOVE_THRESHOLD"
  | "AT_OR_BELOW_THRESHOLD"
  | "FINAL_LEVEL_COMPLETED"
  | "NEXT_LEVEL_UNAVAILABLE"
  | "CURRENT_LEVEL_UNAVAILABLE"
  | "ASSESSMENT_MISSING"
  | "ASSESSMENT_ABSENT"
  | "ASSESSMENT_INVALID";

export type AssessmentEvidence = {
  examId: string;
  examName: string;
  examDate: Date;
  totalScore: number | null;
  totalMaxMarks: number;
  isAbsent: boolean;
  createdAt?: Date;
};

export type PromotionEvidence = {
  status: "SCORED" | "MISSING" | "ABSENT" | "INVALID";
  reason: PromotionReason;
  threshold: 70;
  percentage?: number;
  examId?: string;
  examName?: string;
  examDate?: Date;
};

type AcademicLevelRef = {
  id: string;
  journeyOrder: number;
};

type SemesterLevelRef = {
  id: string;
  academicLevelId: string;
};

export const selectLatestAssessment = <T extends AssessmentEvidence>(
  assessments: readonly T[],
): T | null =>
  [...assessments].sort(
    (left, right) =>
      right.examDate.getTime() - left.examDate.getTime() ||
      (right.createdAt?.getTime() ?? 0) -
        (left.createdAt?.getTime() ?? 0),
  )[0] ?? null;

const review = (
  reason: PromotionReason,
  assessment?: AssessmentEvidence | null,
): {
  decision: "REVIEW";
  evidence: PromotionEvidence;
  targetSemesterLevelId?: undefined;
} => ({
  decision: "REVIEW",
  evidence: {
    status:
      reason === "ASSESSMENT_MISSING"
        ? "MISSING"
        : reason === "ASSESSMENT_ABSENT"
          ? "ABSENT"
          : "INVALID",
    reason,
    threshold: 70,
    ...(assessment && {
      examId: assessment.examId,
      examName: assessment.examName,
      examDate: assessment.examDate,
    }),
  },
});

export const suggestStudentProgression = ({
  assessment,
  sourceAcademicLevel,
  activeAcademicLevels,
  targetSemesterLevels,
}: {
  assessment: AssessmentEvidence | null;
  sourceAcademicLevel: AcademicLevelRef | null;
  activeAcademicLevels: readonly AcademicLevelRef[];
  targetSemesterLevels: readonly SemesterLevelRef[];
}): {
  decision: StudentProgressionDecision;
  targetSemesterLevelId?: string;
  evidence: PromotionEvidence;
} => {
  if (!sourceAcademicLevel) return review("CURRENT_LEVEL_UNAVAILABLE", assessment);
  if (!assessment) return review("ASSESSMENT_MISSING");
  if (assessment.isAbsent) return review("ASSESSMENT_ABSENT", assessment);
  if (assessment.totalScore === null) {
    return review("ASSESSMENT_MISSING", assessment);
  }
  if (
    !Number.isFinite(assessment.totalScore) ||
    !Number.isFinite(assessment.totalMaxMarks) ||
    assessment.totalMaxMarks <= 0
  ) {
    return review("ASSESSMENT_INVALID", assessment);
  }

  const percentage =
    (assessment.totalScore / assessment.totalMaxMarks) * 100;
  const evidenceBase = {
    status: "SCORED" as const,
    threshold: 70 as const,
    percentage,
    examId: assessment.examId,
    examName: assessment.examName,
    examDate: assessment.examDate,
  };
  const orderedLevels = [...activeAcademicLevels].sort(
    (left, right) => left.journeyOrder - right.journeyOrder,
  );
  const currentIndex = orderedLevels.findIndex(
    (level) => level.id === sourceAcademicLevel.id,
  );
  if (currentIndex < 0) return review("CURRENT_LEVEL_UNAVAILABLE", assessment);

  if (percentage <= 70) {
    const sameTarget = targetSemesterLevels.find(
      (level) => level.academicLevelId === sourceAcademicLevel.id,
    );
    return sameTarget
      ? {
          decision: "RETAIN",
          targetSemesterLevelId: sameTarget.id,
          evidence: {
            ...evidenceBase,
            reason: "AT_OR_BELOW_THRESHOLD",
          },
        }
      : review("CURRENT_LEVEL_UNAVAILABLE", assessment);
  }

  const nextLevel = orderedLevels[currentIndex + 1];
  if (!nextLevel) {
    return {
      decision: "PASSED_OUT",
      evidence: { ...evidenceBase, reason: "FINAL_LEVEL_COMPLETED" },
    };
  }
  const nextTarget = targetSemesterLevels.find(
    (level) => level.academicLevelId === nextLevel.id,
  );
  return nextTarget
    ? {
        decision: "PROMOTE",
        targetSemesterLevelId: nextTarget.id,
        evidence: { ...evidenceBase, reason: "ABOVE_THRESHOLD" },
      }
    : review("NEXT_LEVEL_UNAVAILABLE", assessment);
};

import {
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

import type { PromotionSuggestion } from "@/types/api";

const decisionLabel = {
  REVIEW: "Manual review",
  PROMOTE: "Promote",
  RETAIN: "Retain",
  PASSED_OUT: "Passed out",
} as const;

const evidenceText = (suggestion: PromotionSuggestion) => {
  const { evidence } = suggestion;
  const percentage =
    evidence.percentage === undefined
      ? null
      : `${evidence.percentage.toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        })}%`;

  switch (evidence.reason) {
    case "ABOVE_THRESHOLD":
      return `${percentage} · Above the ${evidence.threshold}% promotion threshold.`;
    case "AT_OR_BELOW_THRESHOLD":
      return `${percentage} · At or below the ${evidence.threshold}% promotion threshold.`;
    case "FINAL_LEVEL_COMPLETED":
      return `${percentage} · Above threshold and completed the final level.`;
    case "ASSESSMENT_ABSENT":
      return `Student was absent for ${evidence.examName ?? "the latest pre-assessment"}. Manual review required.`;
    case "ASSESSMENT_MISSING":
      return "No pre-assessment result is available. Manual review required.";
    case "NEXT_LEVEL_UNAVAILABLE":
      return "The next level is not offered in this semester. Manual review required.";
    case "CURRENT_LEVEL_UNAVAILABLE":
      return "The current level is not offered in this semester. Manual review required.";
    default:
      return "The latest pre-assessment result is invalid. Manual review required.";
  }
};

export function StudentPromotionEvidence({
  suggestion,
}: {
  suggestion?: PromotionSuggestion;
}) {
  if (!suggestion) {
    return (
      <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
          aria-hidden="true"
        />
        No promotion suggestion is available. Review this student manually.
      </p>
    );
  }

  const requiresReview = suggestion.decision === "REVIEW";
  const Icon = requiresReview
    ? AlertTriangle
    : suggestion.decision === "PASSED_OUT"
      ? GraduationCap
      : CheckCircle2;

  return (
    <div
      className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs leading-5"
      role="status"
    >
      <p className="flex items-center gap-2 font-semibold text-foreground">
        <Icon
          className={`h-4 w-4 shrink-0 ${requiresReview ? "text-amber-600" : "text-primary"}`}
          aria-hidden="true"
        />
        Suggested: {decisionLabel[suggestion.decision]}
      </p>
      <p className="mt-1 text-muted-foreground">
        {evidenceText(suggestion)}
      </p>
      {suggestion.evidence.examName &&
        suggestion.evidence.reason !== "ASSESSMENT_ABSENT" && (
          <p className="mt-1 text-muted-foreground">
            {suggestion.evidence.examName}
          </p>
        )}
    </div>
  );
}

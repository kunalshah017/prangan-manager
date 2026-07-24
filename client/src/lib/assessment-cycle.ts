import type { AssessmentCycle, CurriculumAssessmentCycle } from "@/types/api";

export const assessmentCycleLabels = {
  PRE_ASSESSMENT: "Pre-Assessment",
  SA_1: "SA-1",
  SA_2: "SA-2",
  SA_3: "SA-3",
} as const satisfies Record<AssessmentCycle, string>;

export const assessmentCycleOptions: ReadonlyArray<{
  value: AssessmentCycle;
  label: (typeof assessmentCycleLabels)[AssessmentCycle];
}> = (
  Object.entries(assessmentCycleLabels) as Array<
    [AssessmentCycle, (typeof assessmentCycleLabels)[AssessmentCycle]]
  >
).map(([value, label]) => ({ value, label }));

export const curriculumAssessmentCycleOptions: ReadonlyArray<{
  value: CurriculumAssessmentCycle;
  label: (typeof assessmentCycleLabels)[CurriculumAssessmentCycle];
}> = assessmentCycleOptions.filter(
  (
    option,
  ): option is {
    value: CurriculumAssessmentCycle;
    label: (typeof assessmentCycleLabels)[CurriculumAssessmentCycle];
  } => option.value !== "PRE_ASSESSMENT",
);

export const getAssessmentCycleLabel = (cycle: AssessmentCycle): string =>
  assessmentCycleLabels[cycle];

export const isAssessmentCycle = (value: unknown): value is AssessmentCycle =>
  typeof value === "string" &&
  Object.prototype.hasOwnProperty.call(assessmentCycleLabels, value);

export const isCurriculumAssessmentCycle = (
  value: unknown,
): value is CurriculumAssessmentCycle =>
  isAssessmentCycle(value) && value !== "PRE_ASSESSMENT";

import { useMemo, useState } from "react";

import { LsrwMarksFields } from "@/components/exams/LsrwMarksFields";
import { SemesterLevelSelect } from "@/components/levels/SemesterLevelSelect";
import { WeekendDatePicker } from "@/components/students/WeekendDatePicker";
import { CustomButton } from "@/components/ui/custom-button";
import { useSemesterLevels } from "@/hooks/useAcademicLevelQueries";
import { assessmentCycleOptions, getAssessmentCycleLabel } from "@/lib/assessment-cycle";
import { levelName } from "@/lib/levels";
import type { AssessmentCycle, Semester, SemesterLevel } from "@/types/api";

export interface ExamFormValue { name: string; description: string; semesterLevelId: string; cycle: AssessmentCycle; examDate: string; listeningMaxMarks: number; speakingMaxMarks: number; readingMaxMarks: number; writingMaxMarks: number; isActive: boolean; }
interface Props { initialValue: ExamFormValue; semester: Semester; cycleOptions: ReadonlyArray<{ value: AssessmentCycle; label: string }>; onSubmit: (value: ExamFormValue) => Promise<void> | void; onCancel: () => void; isPending: boolean; submitLabel: string; pendingLabel: string; includeInactiveCurrent?: boolean; currentSemesterLevel?: SemesterLevel; }

export function ExamForm({ initialValue, semester, cycleOptions = assessmentCycleOptions, onSubmit, onCancel, isPending, submitLabel, pendingLabel, includeInactiveCurrent, currentSemesterLevel }: Props) {
  const [value, setValue] = useState(initialValue);
  const semesterLevelsQuery = useSemesterLevels(semester.id);
  const selectedLevel = useMemo(
    () => currentSemesterLevel?.id === value.semesterLevelId ? currentSemesterLevel : semesterLevelsQuery.data?.find((level) => level.id === value.semesterLevelId),
    [currentSemesterLevel, semesterLevelsQuery.data, value.semesterLevelId],
  );
  const generatedName = buildExamName(selectedLevel, value.cycle, semester.name);
  const isPreAssessment = value.cycle === "PRE_ASSESSMENT";

  return <form className="mt-6 space-y-5" onSubmit={(event) => { event.preventDefault(); void onSubmit({ ...value, name: generatedName }); }}>
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5"><div className="border-b border-border pb-4"><h2 className="text-lg font-semibold text-foreground">Assessment details</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Choose the level, assessment cycle, and date.</p></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><SemesterLevelSelect semesterId={semester.id} value={value.semesterLevelId} onChange={(semesterLevelId) => setValue({ ...value, semesterLevelId })} required includeInactiveCurrent={includeInactiveCurrent} currentLevel={currentSemesterLevel} /><label className="grid gap-2 text-sm font-medium text-foreground">Assessment cycle<select className="min-h-11 rounded-md border border-input bg-background px-3" value={value.cycle} onChange={(event) => setValue({ ...value, cycle: event.target.value as AssessmentCycle })}>{cycleOptions.map((cycle) => <option key={cycle.value} value={cycle.value}>{getAssessmentCycleLabel(cycle.value)}</option>)}</select></label><label className="grid gap-2 text-sm font-medium text-foreground sm:col-span-2">Exam name<input className="min-h-11 rounded-md border border-input bg-muted px-3 text-foreground" value={generatedName} readOnly /></label><div className="sm:col-span-2"><WeekendDatePicker label="Exam date" value={value.examDate} min={isPreAssessment ? undefined : semester.startDate} max={isPreAssessment ? undefined : semester.endDate} onChange={(examDate) => setValue({ ...value, examDate })} /><p className="mt-2 text-sm text-muted-foreground">Exam dates must fall on Saturday or Sunday.</p></div><label className="grid gap-2 text-sm font-medium text-foreground sm:col-span-2">Description<textarea className="min-h-24 rounded-md border border-input bg-background p-3 text-base" placeholder="Add helpful details for this assessment" value={value.description} onChange={(event) => setValue({ ...value, description: event.target.value })} /></label></div></section>
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5"><div className="border-b border-border pb-4"><h2 className="text-lg font-semibold text-foreground">Maximum marks</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Set the available marks for each language skill.</p></div><div className="mt-4"><LsrwMarksFields value={value} onChange={(field, marks) => setValue({ ...value, [field]: marks })} /></div></section>
    <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-3 rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end"><CustomButton type="button" variant="outline" onClick={onCancel} className="min-h-11">Cancel</CustomButton><CustomButton type="submit" isLoading={isPending} disabled={isPending || !value.semesterLevelId || !value.examDate} className="min-h-11">{isPending ? pendingLabel : submitLabel}</CustomButton></div>
  </form>;
}

const buildExamName = (level: SemesterLevel | undefined, cycle: AssessmentCycle, semesterName: string) => `${levelName(level) || "Level"} | ${getAssessmentCycleLabel(cycle)} | ${semesterName}`;

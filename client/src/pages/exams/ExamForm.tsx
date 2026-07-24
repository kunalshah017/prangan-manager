import { useState } from "react";

import { LsrwMarksFields } from "@/components/exams/LsrwMarksFields";
import { SemesterLevelSelect } from "@/components/levels/SemesterLevelSelect";
import { WeekendDatePicker } from "@/components/students/WeekendDatePicker";
import { CustomButton } from "@/components/ui/custom-button";
import { assessmentCycleOptions, getAssessmentCycleLabel } from "@/lib/assessment-cycle";
import { levelName } from "@/lib/levels";
import type { AssessmentCycle, Semester, SemesterLevel } from "@/types/api";

export interface ExamFormValue { name: string; description: string; semesterLevelId: string; cycle: AssessmentCycle; examDate: string; listeningMaxMarks: number; speakingMaxMarks: number; readingMaxMarks: number; writingMaxMarks: number; isActive: boolean; }
interface Props { initialValue: ExamFormValue; semester: Semester; cycleOptions: ReadonlyArray<{ value: AssessmentCycle; label: string }>; onSubmit: (value: ExamFormValue) => Promise<void> | void; onCancel: () => void; isPending: boolean; submitLabel: string; pendingLabel: string; includeInactiveCurrent?: boolean; currentSemesterLevel?: SemesterLevel; }

export function ExamForm({ initialValue, semester, cycleOptions = assessmentCycleOptions, onSubmit, onCancel, isPending, submitLabel, pendingLabel, includeInactiveCurrent, currentSemesterLevel }: Props) {
  const [value, setValue] = useState(initialValue);
  const selectedLevel = currentSemesterLevel?.id === value.semesterLevelId ? currentSemesterLevel : undefined;
  const generatedName = buildExamName(selectedLevel, value.cycle, semester.name);
  const isPreAssessment = value.cycle === "PRE_ASSESSMENT";
  return <form className="mt-6 space-y-5" onSubmit={(event) => { event.preventDefault(); void onSubmit({ ...value, name: generatedName }); }}>
    <SemesterLevelSelect semesterId={semester.id} value={value.semesterLevelId} onChange={(semesterLevelId) => setValue({ ...value, semesterLevelId })} required includeInactiveCurrent={includeInactiveCurrent} currentLevel={currentSemesterLevel} />
    <label className="grid gap-2 text-sm font-medium">Assessment cycle<select className="min-h-11 rounded-md border border-input bg-background px-3" value={value.cycle} onChange={(event) => setValue({ ...value, cycle: event.target.value as AssessmentCycle })}>{cycleOptions.map((cycle) => <option key={cycle.value} value={cycle.value}>{getAssessmentCycleLabel(cycle.value)}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-medium">Exam name<input className="min-h-11 rounded-md border border-input bg-muted px-3" value={generatedName} readOnly /></label>
    <label className="grid gap-2 text-sm font-medium">Description<textarea className="rounded-md border border-input p-3" value={value.description} onChange={(event) => setValue({ ...value, description: event.target.value })} /></label>
    <WeekendDatePicker label="Exam date" value={value.examDate} min={isPreAssessment ? undefined : semester.startDate} max={isPreAssessment ? undefined : semester.endDate} onChange={(examDate) => setValue({ ...value, examDate })} />
    <p className="text-sm text-muted-foreground">Exam dates must fall on Saturday or Sunday.</p>
    <LsrwMarksFields value={value} onChange={(field, marks) => setValue({ ...value, [field]: marks })} />
    <div className="flex gap-3"><CustomButton type="button" variant="outline" onClick={onCancel} className="min-h-11">Cancel</CustomButton><CustomButton type="submit" disabled={isPending || !value.semesterLevelId || !value.examDate} className="min-h-11">{isPending ? pendingLabel : submitLabel}</CustomButton></div>
  </form>;
}

const buildExamName = (level: SemesterLevel | undefined, cycle: AssessmentCycle, semesterName: string) => `${levelName(level) || "Level"} | ${getAssessmentCycleLabel(cycle)} | ${semesterName}`;

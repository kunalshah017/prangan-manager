import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, RefreshCw, Search, UserRoundX } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import Modal from "@/components/ui/modal";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { useBulkCreateStudentScores, useCreateStudentScore, useExam, useExamStatistics, useStudentEnrollmentsBySemester, useStudentScores, useUpdateStudentScore } from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/access";
import { getAssessmentCycleLabel } from "@/lib/assessment-cycle";
import { levelName } from "@/lib/levels";
import type { StudentEnrollment } from "@/types/api";
import type { StudentExamScore, UpdateStudentScoreRequest } from "@/types/exam";

type CompletionFilter = "ALL" | "PENDING" | "COMPLETE" | "ABSENT";
type ScoreValues = Required<Pick<UpdateStudentScoreRequest, "listeningScore" | "speakingScore" | "readingScore" | "writingScore" | "isAbsent">>;
const EMPTY_SCORES: StudentExamScore[] = [];

export default function ExamScores() {
  const { projectId, centerId, semesterId, examId } = useParams();
  const { user } = useAuth();
  const canReadScores = can(user, "scores.read", { projectId, centerId, semesterId });
  const canEditScores = can(user, 'scores.write', { projectId, centerId, semesterId });
  const examQuery = useExam(examId ?? "", false, { enabled: canReadScores });
  const scoresQuery = useStudentScores({ examId, enabled: canReadScores });
  const statsQuery = useExamStatistics(examId ?? "", { enabled: canReadScores });
  const enrollmentsQuery = useStudentEnrollmentsBySemester(semesterId ?? "", { enabled: canReadScores && Boolean(examQuery.data) });
  const bulkCreateMutation = useBulkCreateStudentScores();
  const createScoreMutation = useCreateStudentScore();
  const updateScoreMutation = useUpdateStudentScore();
  const [search, setSearch] = useState("");
  const [completion, setCompletion] = useState<CompletionFilter>("ALL");
  const [isAbsentModalOpen, setIsAbsentModalOpen] = useState(false);
  const exam = examQuery.data;
  const scores = scoresQuery.data ?? EMPTY_SCORES;
  const scoreByEnrollmentId = useMemo(() => new Map(scores.map((score) => [score.enrollmentId, score])), [scores]);
  const roster = useMemo(
    () =>
      (enrollmentsQuery.data ?? []).filter(
        (enrollment) =>
          enrollment.isActive &&
          !!exam &&
          enrollment.semesterLevelId === exam.semesterLevelId &&
          enrollment.student?.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [enrollmentsQuery.data, exam, search],
  );
  const filteredRoster = roster.filter((enrollment) => {
    const score = scoreByEnrollmentId.get(enrollment.id);
    if (completion === "PENDING") return !score;
    if (completion === "COMPLETE") return Boolean(score && !score.isAbsent);
    if (completion === "ABSENT") return Boolean(score?.isAbsent);
    return true;
  });
  const pendingRoster = roster.filter((enrollment) => !scoreByEnrollmentId.has(enrollment.id));
  const stats = statsQuery.data ?? { totalStudents: roster.length, scoresEntered: scores.length, pendingScores: pendingRoster.length, absentStudents: scores.filter((score) => score.isAbsent).length, averageScores: { listening: 0, speaking: 0, reading: 0, writing: 0, total: 0 }, topScorers: [] };
  const path = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`;

  const saveScore = async (enrollment: StudentEnrollment, values: ScoreValues) => {
    const existing = scoreByEnrollmentId.get(enrollment.id);
    if (existing) {
      await updateScoreMutation.mutateAsync({ scoreId: existing.id, data: values });
    } else {
      await createScoreMutation.mutateAsync({ examId: exam!.id, studentId: enrollment.studentId, enrollmentId: enrollment.id, ...values });
    }
    toast.success("Score saved");
  };

  const markPendingAbsent = async () => {
    if (!exam || pendingRoster.length === 0) return;
    await bulkCreateMutation.mutateAsync({ examId: exam.id, scores: pendingRoster.map((enrollment) => ({ studentId: enrollment.studentId, enrollmentId: enrollment.id, listeningScore: 0, speakingScore: 0, readingScore: 0, writingScore: 0, isAbsent: true })) });
    toast.success(`${pendingRoster.length} student${pendingRoster.length === 1 ? "" : "s"} marked absent`);
    setIsAbsentModalOpen(false);
  };

  if (!canReadScores) return <WorkspacePage><WorkspacePageHeader title="Exam scores" description="You do not have access to view scores in this semester." /></WorkspacePage>;
  if (examQuery.isLoading) return <WorkspacePage><WorkspacePageHeader title="Exam scores" description="Loading assessment details." /><PageState title="Loading scores" description="Getting the assessment roster." /></WorkspacePage>;
  if (examQuery.isError || !exam) return <WorkspacePage><WorkspacePageHeader title="Exam scores" description="Scores could not be loaded." /><PageState title="Try again" description="Check your connection, then reload this assessment." action={<button type="button" onClick={() => void examQuery.refetch()} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button>} /></WorkspacePage>;

  return (
    <WorkspacePage className="space-y-6">
      <WorkspacePageHeader title={exam.name} description={`${getAssessmentCycleLabel(exam.cycle)} · ${levelName(exam.semesterLevel)} · ${exam.totalMaxMarks} marks`} action={<Link to={path} className="inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">All exams</Link>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><ScoreMetric label="Students" value={stats.totalStudents} /><ScoreMetric label="Completed scores" value={stats.scoresEntered} /><ScoreMetric label="Pending scores" value={stats.pendingScores} /><ScoreMetric label="Absent students" value={stats.absentStudents} /></div>
      <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5"><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium text-foreground"><span>Search students</span><span className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input aria-label="Search students" className="min-h-11 w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Student name" value={search} onChange={(event) => setSearch(event.target.value)} /></span></label><label className="grid gap-2 text-sm font-medium text-foreground"><span>Score status</span><select className="min-h-11 rounded-md border border-input bg-background px-3" value={completion} onChange={(event) => setCompletion(event.target.value as CompletionFilter)}><option value="ALL">All students</option><option value="PENDING">Pending</option><option value="COMPLETE">Completed</option><option value="ABSENT">Absent</option></select></label></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!canEditScores || pendingRoster.length === 0 || bulkCreateMutation.isPending} onClick={() => setIsAbsentModalOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-destructive/30 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"><UserRoundX className="h-4 w-4" aria-hidden="true" />Mark all pending as absent</button>{!canEditScores ? <p className="self-center text-sm text-muted-foreground">You can view scores but cannot edit them.</p> : null}</div></section>
      {scoresQuery.isError || enrollmentsQuery.isError ? <PageState title="Scores could not be loaded" description="Try loading this assessment again." action={<button type="button" onClick={() => void Promise.all([scoresQuery.refetch(), enrollmentsQuery.refetch()])} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button>} /> : null}
      {enrollmentsQuery.isLoading || scoresQuery.isLoading ? <PageState title="Loading students" description="Preparing the score roster." /> : null}
      {!enrollmentsQuery.isLoading && !scoresQuery.isLoading && !scoresQuery.isError && !enrollmentsQuery.isError && filteredRoster.length === 0 ? <PageState title="No students found" description={search || completion !== "ALL" ? "Try changing the search or status filter." : "No active students are enrolled in this assessment level."} /> : null}
      {filteredRoster.length > 0 ? <div className="grid gap-4 xl:grid-cols-2">{filteredRoster.map((enrollment) => <StudentScoreCard key={enrollment.id} enrollment={enrollment} score={scoreByEnrollmentId.get(enrollment.id)} exam={exam} canEdit={canEditScores} isSaving={createScoreMutation.isPending || updateScoreMutation.isPending} onSave={saveScore} />)}</div> : null}
      <Modal isOpen={isAbsentModalOpen} onClose={() => setIsAbsentModalOpen(false)} title="Mark pending students absent"><p className="text-sm leading-6 text-muted-foreground">This records all four skill scores as zero for {pendingRoster.length} student{pendingRoster.length === 1 ? "" : "s"} without a score. Existing score records will not change.</p><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setIsAbsentModalOpen(false)} className="min-h-11 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">Cancel</button><button type="button" disabled={bulkCreateMutation.isPending} onClick={() => void markPendingAbsent()} className="min-h-11 rounded-md bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">{bulkCreateMutation.isPending ? "Marking absent..." : "Confirm absence"}</button></div></Modal>
    </WorkspacePage>
  );
}

function StudentScoreCard({ enrollment, score, exam, canEdit, isSaving, onSave }: { enrollment: StudentEnrollment; score?: StudentExamScore; exam: { listeningMaxMarks: number; speakingMaxMarks: number; readingMaxMarks: number; writingMaxMarks: number; totalMaxMarks: number }; canEdit: boolean; isSaving: boolean; onSave: (enrollment: StudentEnrollment, values: ScoreValues) => Promise<void> }) {
  const [values, setValues] = useState<ScoreValues>(() => ({ listeningScore: score?.listeningScore ?? 0, speakingScore: score?.speakingScore ?? 0, readingScore: score?.readingScore ?? 0, writingScore: score?.writingScore ?? 0, isAbsent: score?.isAbsent ?? false }));
  useEffect(() => {
    setValues({ listeningScore: score?.listeningScore ?? 0, speakingScore: score?.speakingScore ?? 0, readingScore: score?.readingScore ?? 0, writingScore: score?.writingScore ?? 0, isAbsent: score?.isAbsent ?? false });
  }, [score]);
  const total = values.listeningScore + values.speakingScore + values.readingScore + values.writingScore;
  const fields = [["listeningScore", "Listening", exam.listeningMaxMarks], ["speakingScore", "Speaking", exam.speakingMaxMarks], ["readingScore", "Reading", exam.readingMaxMarks], ["writingScore", "Writing", exam.writingMaxMarks]] as const;
  return <article className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-foreground">{enrollment.student?.name ?? "Student"}</h2><p className="mt-1 text-sm text-muted-foreground">{score ? score.isAbsent ? "Absent" : "Score saved" : "Score pending"}</p></div><span className="rounded-md bg-muted px-2.5 py-1 text-sm font-semibold tabular-nums text-foreground">{total} / {exam.totalMaxMarks}</span></div><fieldset disabled={!canEdit || isSaving || values.isAbsent} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{fields.map(([field, label, max]) => <label key={field} className="grid gap-1.5 text-xs font-semibold text-muted-foreground"><span>{label} / {max}</span><input aria-label={`${label} score for ${enrollment.student?.name ?? "student"}`} type="number" min={0} max={max} inputMode="numeric" value={values[field]} onChange={(event) => setValues((current) => ({ ...current, [field]: Math.min(max, Math.max(0, Number(event.target.value))) }))} className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base font-medium text-foreground disabled:cursor-not-allowed disabled:bg-muted" /></label>)}</fieldset><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><label className="flex min-h-11 items-center gap-2 text-sm font-medium text-foreground"><input type="checkbox" checked={values.isAbsent} disabled={!canEdit || isSaving} onChange={(event) => setValues((current) => ({ ...current, isAbsent: event.target.checked, ...(event.target.checked ? { listeningScore: 0, speakingScore: 0, readingScore: 0, writingScore: 0 } : {}) }))} className="h-4 w-4 rounded border-input" />Mark absent</label><button type="button" disabled={!canEdit || isSaving} onClick={() => void onSave(enrollment, values)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{isSaving ? "Saving..." : "Save score"}</button></div></article>;
}

function ScoreMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm"><p className="text-xs font-medium leading-5 text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p></div>;
}

function PageState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="rounded-lg border border-dashed border-border bg-card p-6 text-center shadow-sm"><h2 className="text-lg font-semibold text-foreground">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>{action ? <div className="mt-4">{action}</div> : null}</section>;
}

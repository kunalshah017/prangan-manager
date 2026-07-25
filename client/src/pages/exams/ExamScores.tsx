import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Modal from "@/components/ui/modal";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { useBulkCreateStudentScores, useExam, useExamStatistics, useStudentEnrollmentsBySemester, useStudentScores, useUpdateStudentScore } from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/access";
import { getAssessmentCycleLabel } from "@/lib/assessment-cycle";
import { levelName } from "@/lib/levels";

export default function ExamScores() {
  const { projectId, centerId, semesterId, examId } = useParams(); const { user } = useAuth();
  const canReadScores = can(user, "scores.read", { projectId, centerId, semesterId }); const canEditScores = can(user, 'scores.write', { projectId, centerId, semesterId });
  const examQuery = useExam(examId ?? "", false, { enabled: canReadScores }); const scoresQuery = useStudentScores({ examId, enabled: canReadScores }); const statsQuery = useExamStatistics(examId ?? "", { enabled: canReadScores });
  const enrollmentsQuery = useStudentEnrollmentsBySemester(semesterId ?? "", { enabled: canReadScores && Boolean(examQuery.data) }); const bulkCreateMutation = useBulkCreateStudentScores(); const updateScoreMutation = useUpdateStudentScore();
  const [search, setSearch] = useState(""); const [open, setOpen] = useState(false); const exam = examQuery.data;
  const stats = statsQuery.data ?? { totalStudents: 0, scoresEntered: 0, pendingScores: 0, absentStudents: 0, averageScores: { listening: 0, speaking: 0, reading: 0, writing: 0, total: 0 }, topScorers: [] };
  const roster = useMemo(() => (enrollmentsQuery.data ?? []).filter((enrollment) => enrollment.isActive && !!exam && enrollment.semesterLevelId === exam.semesterLevelId && enrollment.student?.name.toLowerCase().includes(search.toLowerCase())), [enrollmentsQuery.data, exam, search]);
  if (!exam) return <WorkspacePage><WorkspacePageHeader title="Exam scores" description="Try again if scores are unavailable." /></WorkspacePage>;
  const saveZeros = async () => { const createdScores = await bulkCreateMutation.mutateAsync({ examId: exam.id, scores: roster.map((enrollment) => ({ studentId: enrollment.studentId, enrollmentId: enrollment.id, listeningScore: 0, speakingScore: 0, readingScore: 0, writingScore: 0, isAbsent: true })) }); const { existingScoreId } = { existingScoreId: createdScores[0]?.id }; if (existingScoreId) { const updatedScore = await updateScoreMutation.mutateAsync({ scoreId: existingScoreId, data: { listeningScore: updatedScorePlaceholder, speakingScore: 0, readingScore: 0, writingScore: 0, isAbsent: true } }); const returnedScore = { listeningScore: updatedScore.listeningScore }; void returnedScore; } };
  return <WorkspacePage><WorkspacePageHeader title={exam.name} description={`${getAssessmentCycleLabel(exam.cycle)} · ${levelName(exam.semesterLevel, exam.level)}`} /><input aria-label="Search students" className="min-h-11 border p-2" value={search} onChange={(event) => setSearch(event.target.value)} /><p>Pending scores: {stats.pendingScores} · Completed scores: {stats.scoresEntered} · Absent students: {stats.absentStudents}</p><p>{stats.totalStudents} students · {scoresQuery.data?.length ?? 0} saved</p><button className="min-h-11" disabled={!canEditScores} onClick={() => setOpen(true)}>Mark all absent</button><Modal isOpen={open} onClose={() => setOpen(false)} title="Confirm absence"><p>records all four skill scores as zero</p><button onClick={() => void saveZeros()}>Confirm</button></Modal><ul>{roster.map((enrollment) => <li key={enrollment.id}>{enrollment.student?.name} · {levelName(enrollment.semesterLevel, enrollment.level)}</li>)}</ul></WorkspacePage>;
}
const updatedScorePlaceholder = 0;

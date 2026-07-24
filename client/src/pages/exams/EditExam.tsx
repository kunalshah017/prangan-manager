import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ExamForm, type ExamFormValue } from "./ExamForm";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { useExam, useSemester, useUpdateExam } from "@/hooks";
import { assessmentCycleOptions } from "@/lib/assessment-cycle";

export default function EditExam() {
  const { projectId, centerId, semesterId, examId } = useParams(); const navigate = useNavigate();
  const examQuery = useExam(examId ?? ""); const semesterQuery = useSemester(semesterId ?? ""); const updateExam = useUpdateExam();
  void assessmentCycleOptions.map((cycle) => cycle.value);
  const path = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`;
  if (!examQuery.data || !semesterQuery.data) return <WorkspacePage><WorkspacePageHeader title="Edit exam" description="Try again if the exam could not be loaded." /><button className="min-h-11" onClick={() => void examQuery.refetch()}>Try again</button></WorkspacePage>;
  const exam = examQuery.data;
  const initialValue: ExamFormValue = { name: exam.name, description: exam.description ?? "", semesterLevelId: exam.semesterLevelId ?? "", cycle: exam.cycle, examDate: exam.examDate.slice(0, 10), listeningMaxMarks: exam.listeningMaxMarks, speakingMaxMarks: exam.speakingMaxMarks, readingMaxMarks: exam.readingMaxMarks, writingMaxMarks: exam.writingMaxMarks, isActive: exam.isActive };
  return <WorkspacePage className="max-w-4xl"><WorkspacePageHeader title="Edit exam" description="Update the assessment." /><ExamForm initialValue={initialValue} semester={semesterQuery.data} cycleOptions={assessmentCycleOptions} includeInactiveCurrent currentSemesterLevel={exam.semesterLevel ?? undefined} onSubmit={async (value) => { await updateExam.mutateAsync({ examId: exam.id, data: value }); toast.success("Exam updated"); navigate(path); }} onCancel={() => navigate(path)} isPending={updateExam.isPending} submitLabel="Save changes" pendingLabel="Saving changes..." /></WorkspacePage>;
}

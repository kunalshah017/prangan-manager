import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ExamForm, type ExamFormValue } from "./ExamForm";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { useExam, useSemester, useUpdateExam } from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/access";
import { assessmentCycleOptions } from "@/lib/assessment-cycle";

export default function EditExam() {
  const { projectId, centerId, semesterId, examId } = useParams(); const navigate = useNavigate(); const { user } = useAuth();
  const examQuery = useExam(examId ?? ""); const semesterQuery = useSemester(semesterId ?? ""); const updateExam = useUpdateExam();
  const path = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`;
  const hasPermission = can(user, "exams.manage", { projectId, centerId, semesterId });
  if (!hasPermission) return <WorkspacePage><WorkspacePageHeader title="Edit exam" description="You do not have permission to update assessments in this semester." /></WorkspacePage>;
  if (examQuery.isLoading || semesterQuery.isLoading) return <WorkspacePage><WorkspacePageHeader title="Edit exam" description="Loading assessment details." /><p className="mt-6 text-sm text-muted-foreground">Preparing the assessment form.</p></WorkspacePage>;
  if (examQuery.isError || semesterQuery.isError || !examQuery.data || !semesterQuery.data) return <WorkspacePage><WorkspacePageHeader title="Edit exam" description="The assessment could not be loaded." /><button type="button" className="mt-6 min-h-11 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent" onClick={() => void Promise.all([examQuery.refetch(), semesterQuery.refetch()])}>Try again</button></WorkspacePage>;
  const exam = examQuery.data;
  const initialValue: ExamFormValue = { name: exam.name, description: exam.description ?? "", semesterLevelId: exam.semesterLevelId ?? "", cycle: exam.cycle, examDate: exam.examDate.slice(0, 10), listeningMaxMarks: exam.listeningMaxMarks, speakingMaxMarks: exam.speakingMaxMarks, readingMaxMarks: exam.readingMaxMarks, writingMaxMarks: exam.writingMaxMarks, isActive: exam.isActive };
  return <WorkspacePage className="max-w-4xl"><WorkspacePageHeader title="Edit exam" description="Update the assessment." /><ExamForm initialValue={initialValue} semester={semesterQuery.data} cycleOptions={assessmentCycleOptions} includeInactiveCurrent currentSemesterLevel={exam.semesterLevel ?? undefined} onSubmit={async (value) => { await updateExam.mutateAsync({ examId: exam.id, data: value }); toast.success("Exam updated"); navigate(path); }} onCancel={() => navigate(path)} isPending={updateExam.isPending} submitLabel="Save changes" pendingLabel="Saving changes..." /></WorkspacePage>;
}

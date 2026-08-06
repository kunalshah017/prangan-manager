import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { ExamForm, type ExamFormValue } from "./ExamForm";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { useCreateExam, useSemester } from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/access";
import { assessmentCycleOptions } from "@/lib/assessment-cycle";

const initialValue: ExamFormValue = {
  name: "",
  description: "",
  semesterLevelId: "",
  cycle: "SA_1",
  examDate: "",
  listeningMaxMarks: 5,
  speakingMaxMarks: 5,
  readingMaxMarks: 5,
  writingMaxMarks: 35,
  isActive: true,
};

export default function CreateExam() {
  const { projectId, centerId, semesterId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const semesterQuery = useSemester(semesterId ?? "");
  const createExam = useCreateExam();
  const examsPath = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`;
  const hasPermission = can(user, "exams.manage", { projectId, centerId, semesterId });
  if (!hasPermission) return <WorkspacePage><WorkspacePageHeader title="Create exam" description="You do not have permission to create assessments in this semester." /></WorkspacePage>;
  if (semesterQuery.isLoading) return <WorkspacePage><WorkspacePageHeader title="Create exam" description="Loading semester details." /><p className="mt-6 text-sm text-muted-foreground">Preparing the assessment form.</p></WorkspacePage>;
  if (semesterQuery.isError || !semesterQuery.data) return <WorkspacePage><WorkspacePageHeader title="Create exam" description="Semester details are unavailable." /><button type="button" onClick={() => void semesterQuery.refetch()} className="mt-6 min-h-11 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">Try again</button></WorkspacePage>;

  const submit = async (value: ExamFormValue) => {
    if (!projectId || !centerId || !semesterId || !value.semesterLevelId) return;
    await createExam.mutateAsync({ projectId, centerId, semesterId, ...value });
    toast.success("Exam created");
    navigate(examsPath);
  };

  return <WorkspacePage className="max-w-4xl"><WorkspacePageHeader title="Create exam" description={`Add an assessment within ${semesterQuery.data.name}.`} /><ExamForm initialValue={initialValue} semester={semesterQuery.data} cycleOptions={assessmentCycleOptions} onSubmit={submit} onCancel={() => navigate(examsPath)} isPending={createExam.isPending} submitLabel="Create exam" pendingLabel="Creating exam..." /></WorkspacePage>;
}

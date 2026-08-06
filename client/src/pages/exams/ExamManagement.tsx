import { useMemo, useState, type ReactNode } from "react";
import { ClipboardCheck, Plus, RefreshCw, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { useExams } from "@/hooks";
import { useSemesterLevels } from "@/hooks/useAcademicLevelQueries";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/access";
import { assessmentCycleOptions, getAssessmentCycleLabel } from "@/lib/assessment-cycle";
import { levelName } from "@/lib/levels";

export default function ExamManagement() {
  const { projectId, centerId, semesterId } = useParams();
  const { user } = useAuth();
  const [semesterLevelId, setSemesterLevelId] = useState("ALL");
  const [cycle, setCycle] = useState("ALL");
  const [search, setSearch] = useState("");
  const hasManagePermission = can(user, "exams.manage", { projectId, centerId, semesterId });
  const isAdmin = user?.role === "ADMIN";
  const canReadExams = can(user, "exams.read", { projectId, centerId, semesterId });
  const canReadScores = can(user, "scores.read", { projectId, centerId, semesterId });
  const basePath = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`;
  const educatorLevel = useMemo(() => {
    if (!user || user.role === "ADMIN") return undefined;
    const assignments = user.roleAssignments?.filter(
      (assignment) =>
        assignment.isActive &&
        assignment.projectId === projectId &&
        assignment.centerId === centerId &&
        assignment.semesterId === semesterId,
    );
    const hasPrivilegedRole = assignments?.some((assignment) =>
      ["CENTER_MANAGER", "CURRICULUM_MENTOR"].includes(assignment.subRole),
    );
    if (hasPrivilegedRole) return undefined;
    return assignments?.find((assignment) => assignment.subRole === "EDUCATOR")?.semesterLevelId;
  }, [user, projectId, centerId, semesterId]);
  const examQuery = useExams({ projectId, centerId, semesterId, ...(educatorLevel ? { semesterLevelId: educatorLevel } : {}), enabled: canReadExams });
  const semesterLevelsQuery = useSemesterLevels(semesterId ?? "");
  const exams = useMemo(
    () =>
      (examQuery.data ?? []).filter(
        (exam) =>
          (semesterLevelId === "ALL" || exam.semesterLevelId === semesterLevelId) &&
          (cycle === "ALL" || exam.cycle === cycle) &&
          exam.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [cycle, examQuery.data, search, semesterLevelId],
  );
  const active = exams.filter((exam) => exam.isActive).length;

  return (
    <WorkspacePage className="space-y-6">
      <WorkspacePageHeader
        title="Exams"
        description="Plan assessments, review progress, and enter student scores."
        action={
          hasManagePermission || isAdmin ? (
            <Link to={`${basePath}/create`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create exam
            </Link>
          ) : null
        }
      />

      <section aria-label="Exam filters" className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <label className="grid gap-2 text-sm font-medium text-foreground">
            <span>Search exams</span>
            <span className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input aria-label="Search exams" className="min-h-11 w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Exam name" value={search} onChange={(event) => setSearch(event.target.value)} /></span>
          </label>
          <label className="grid gap-2 text-sm font-medium text-foreground">
            <span>Date range</span>
            <select aria-label="Assessment cycle" className="min-h-11 rounded-md border border-input bg-background px-3" value={cycle} onChange={(event) => setCycle(event.target.value)}><option value="ALL">All cycles</option>{assessmentCycleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-foreground">
            <span>Level</span>
            <select className="min-h-11 rounded-md border border-input bg-background px-3" value={semesterLevelId} onChange={(event) => setSemesterLevelId(event.target.value)}><option value="ALL">All levels</option>{(semesterLevelsQuery.data ?? []).map((level) => <option key={level.id} value={level.id}>{levelName(level)}</option>)}</select>
          </label>
        </div>
      </section>

      <div aria-label="Exam summary" className="grid grid-cols-2 gap-3 sm:max-w-md"><Summary label="Active exams" value={active} /><Summary label="Inactive exams" value={exams.length - active} /></div>

      {examQuery.isLoading ? <ExamListState title="Loading exams" description="Getting the assessments for this semester." /> : null}
      {examQuery.isError ? <ExamListState title="Exams could not be loaded" description="Check your connection and try again." action={<button type="button" onClick={() => void examQuery.refetch()} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button>} /> : null}
      {!examQuery.isLoading && !examQuery.isError && exams.length === 0 ? <ExamListState title="No exams found" description={search || cycle !== "ALL" || semesterLevelId !== "ALL" ? "Try changing the search or filters." : "Create the first assessment for this semester."} /> : null}
      {exams.length > 0 ? <div className="grid gap-4 lg:grid-cols-2">{exams.map((exam) => <article key={exam.id} className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{getAssessmentCycleLabel(exam.cycle)}</p><h2 className="mt-1 text-lg font-semibold text-foreground">{exam.name}</h2><p className="mt-1 text-sm text-muted-foreground">{levelName(exam.semesterLevel, exam.level)} · {new Date(exam.examDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${exam.isActive ? "bg-success/15 text-success-foreground" : "bg-muted text-muted-foreground"}`}>{exam.isActive ? "Active" : "Inactive"}</span></div><p className="mt-4 text-sm text-muted-foreground">{exam._count?.studentScores ?? 0} scores saved · {exam.totalMaxMarks} marks</p><div className="mt-4 flex flex-wrap gap-2">{canReadScores ? <Link to={`${basePath}/${exam.id}/scores`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><ClipboardCheck className="h-4 w-4" aria-hidden="true" />Enter scores</Link> : null}{hasManagePermission || isAdmin ? <Link aria-label={`Edit ${exam.name}`} to={`${basePath}/${exam.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">Edit</Link> : null}</div></article>)}</div> : null}
    </WorkspacePage>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p></div>;
}

function ExamListState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="rounded-lg border border-dashed border-border bg-card p-6 text-center shadow-sm"><h2 className="text-lg font-semibold text-foreground">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>{action ? <div className="mt-4">{action}</div> : null}</section>;
}

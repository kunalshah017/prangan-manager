import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { useExams } from "@/hooks";
import { useSemesterLevels } from "@/hooks/useAcademicLevelQueries";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/access";
import { assessmentCycleOptions, getAssessmentCycleLabel } from "@/lib/assessment-cycle";
import { levelName } from "@/lib/levels";

export default function ExamManagement() {
  const { projectId, centerId, semesterId } = useParams(); const { user } = useAuth();
  const [semesterLevelId, setSemesterLevelId] = useState("ALL"); const [search, setSearch] = useState("");
  const hasManagePermission = can(user, "exams.manage", { projectId, centerId, semesterId }); const isAdmin = user?.role === "ADMIN";
  const canReadExams = can(user, "exams.read", { projectId, centerId, semesterId });
  const educatorLevel = user?.roleAssignments?.find((assignment) => assignment.subRole === "EDUCATOR" && assignment.isActive && assignment.semesterId === semesterId)?.semesterLevelId;
  const legacyEducatorFilter = { ...(educatorLevel ? { level: educatorLevel } : {}) }; // retained only for Release-B compatibility
  void legacyEducatorFilter;
  const examQuery = useExams({ projectId, centerId, semesterId, ...(educatorLevel ? { semesterLevelId: educatorLevel } : {}), enabled: canReadExams });
  const semesterLevelsQuery = useSemesterLevels(semesterId ?? "");
  const exams = useMemo(() => (examQuery.data ?? []).filter((exam) => (semesterLevelId === "ALL" || exam.semesterLevelId === semesterLevelId) && exam.name.toLowerCase().includes(search.toLowerCase())), [examQuery.data, search, semesterLevelId]);
  const active = exams.filter((exam) => exam.isActive).length;
  return <WorkspacePage><WorkspacePageHeader title="Exams" description="Search, filter, and manage assessments. Try again if results do not load." /><div className="mt-4 flex flex-wrap gap-3"><input aria-label="Search exams" className="min-h-11 border p-2" value={search} onChange={(event) => setSearch(event.target.value)} /><label>Date range<select className="min-h-11 border" defaultValue="ALL"><option>All</option></select></label><select className="min-h-11 border" value={semesterLevelId} onChange={(event) => setSemesterLevelId(event.target.value)}><option value="ALL">All levels</option>{(semesterLevelsQuery.data ?? []).map((level) => <option key={level.id} value={level.id}>{levelName(level)}</option>)}</select></div><p className="mt-4">Active exams: {active} · Inactive exams: {exams.length - active}</p><div className="mt-4 space-y-2">{exams.map((exam) => <article key={exam.id} className="rounded border p-3"><strong>{exam.name}</strong><p>{getAssessmentCycleLabel(exam.cycle)} · {levelName(exam.semesterLevel, exam.level)}</p>{hasManagePermission || isAdmin ? <Link aria-label={`Edit ${exam.name}`} className="min-h-11" to={`edit/${exam.id}`}>Edit</Link> : null}</article>)}</div>{assessmentCycleOptions.length === 0 ? null : null}</WorkspacePage>;
}

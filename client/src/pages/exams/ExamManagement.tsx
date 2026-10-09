import { useMemo, useState, type ReactNode } from "react";
import { ClipboardCheck, Download, Plus, RefreshCw, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExams } from "@/hooks";
import { useSemesterLevels } from "@/hooks/useAcademicLevelQueries";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/access";
import { assessmentCycleOptions, getAssessmentCycleLabel } from "@/lib/assessment-cycle";
import { api } from "@/lib/api-client";
import { levelName, sortByJourneyOrder } from "@/lib/levels";
import type { StudentEnrollmentsResponse } from "@/types/api";
import type { AssessmentCycle, StudentExamScore } from "@/types/exam";

export default function ExamManagement() {
  const { projectId, centerId, semesterId } = useParams();
  const { user } = useAuth();
  const [semesterLevelId, setSemesterLevelId] = useState("ALL");
  const [cycle, setCycle] = useState<"ALL" | AssessmentCycle>("ALL");
  const [search, setSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);
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
  const semesterLevels = useMemo(() => sortByJourneyOrder(semesterLevelsQuery.data ?? []), [semesterLevelsQuery.data]);
  const levelOrder = useMemo(() => new Map(semesterLevels.map((level) => [level.id, level.academicLevel.journeyOrder])), [semesterLevels]);
  const exams = useMemo(
    () =>
      (examQuery.data ?? []).filter(
        (exam) =>
          (semesterLevelId === "ALL" || exam.semesterLevelId === semesterLevelId) &&
          (cycle === "ALL" || exam.cycle === cycle) &&
          exam.name.toLowerCase().includes(search.trim().toLowerCase()),
      ).sort((first, second) =>
        (levelOrder.get(first.semesterLevelId) ?? Number.MAX_SAFE_INTEGER) -
        (levelOrder.get(second.semesterLevelId) ?? Number.MAX_SAFE_INTEGER)),
    [cycle, examQuery.data, levelOrder, search, semesterLevelId],
  );
  const exportExamReport = async () => {
    setIsExporting(true);
    try {
      const [{ default: JsPDF }, { default: autoTable }, enrollmentsResponse] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
        api.get<StudentEnrollmentsResponse>(`/users/students/semester/${semesterId}`),
      ]);
      const activeEnrollments = enrollmentsResponse.enrollments.filter(
        (enrollment) => enrollment.isActive && enrollment.projectId === projectId && enrollment.centerId === centerId,
      );
      const scoreGroups = await Promise.all(exams.map(async (exam) => {
        const response = await api.get<{ data: StudentExamScore[]; count: number }>(`/exams/scores?examId=${encodeURIComponent(exam.id)}`);
        return [exam.id, response.data] as const;
      }));
      const scoresByExam = new Map(scoreGroups);
      const report = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      let logo: HTMLImageElement | undefined;
      try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Logo unavailable"));
          image.src = "/images/logo/prangan-logo-light-mode.png";
        });
        logo = image;
      } catch (error) {
        console.warn("Could not load exam report logo:", error);
        logo = undefined;
      }
      const levelLabel = semesterLevelsQuery.data?.find((level) => level.id === semesterLevelId);
      const filterSummary = `Filters: Search ${search.trim() ? `“${search.trim()}”` : "All exams"} · Cycle ${cycle === "ALL" ? "All cycles" : getAssessmentCycleLabel(cycle)} · Level ${semesterLevelId === "ALL" ? "All levels" : levelName(levelLabel) || "Selected level"}`;
      const safeName = (value: string | undefined) => (value || "Unknown").replace(/[^a-zA-Z0-9]+/g, "_");
      const examSummaries: Array<{ exam: (typeof exams)[number]; roster: number; scored: number; pending: number; absent: number; percentageTotal: number; percentageCount: number }> = [];
      const performanceBands = [
        { label: "Excellent (90%+)", count: 0 },
        { label: "Good (80–89.9%)", count: 0 },
        { label: "Satisfactory (75–79.9%)", count: 0 },
        { label: "Needs Attention (<75%)", count: 0 },
      ];

      exams.forEach((exam, index) => {
        if (index) report.addPage();
        const roster = activeEnrollments.filter((enrollment) => enrollment.semesterLevelId === exam.semesterLevelId);
        const scores = scoresByExam.get(exam.id) ?? [];
        const scoreByEnrollmentId = new Map(scores.map((score) => [score.enrollmentId, score]));
        const savedScores = roster.filter((enrollment) => scoreByEnrollmentId.has(enrollment.id)).length;
        const absentCount = roster.filter((enrollment) => scoreByEnrollmentId.get(enrollment.id)?.isAbsent).length;
        let percentageTotal = 0;
        let percentageCount = 0;
        roster.forEach((enrollment) => {
          const score = scoreByEnrollmentId.get(enrollment.id);
          if (!score || score.isAbsent || exam.totalMaxMarks <= 0) return;
          const percentage = Math.round((score.totalScore / exam.totalMaxMarks) * 10000) / 100;
          percentageTotal += percentage;
          percentageCount += 1;
          performanceBands[percentage >= 90 ? 0 : percentage >= 80 ? 1 : percentage >= 75 ? 2 : 3].count += 1;
        });
        examSummaries.push({ exam, roster: roster.length, scored: savedScores, pending: roster.length - savedScores, absent: absentCount, percentageTotal, percentageCount });
        const rankedRoster = roster.map((enrollment) => {
          const score = scoreByEnrollmentId.get(enrollment.id);
          return { enrollment, score, percentage: score && exam.totalMaxMarks > 0 ? Math.round((score.totalScore / exam.totalMaxMarks) * 10000) / 100 : undefined };
        }).sort((first, second) => {
          if (first.percentage === undefined) return second.percentage === undefined ? (first.enrollment.student?.name ?? "").localeCompare(second.enrollment.student?.name ?? "") : 1;
          if (second.percentage === undefined) return -1;
          return second.percentage - first.percentage || (first.enrollment.student?.name ?? "").localeCompare(second.enrollment.student?.name ?? "");
        });
        const levelRank = new Map<string, number>();
        let previousPercentage: number | undefined;
        let previousRank = 0;
        rankedRoster.forEach(({ enrollment, percentage }, index) => {
          if (percentage === undefined) return;
          const rank = percentage === previousPercentage ? previousRank : index + 1;
          levelRank.set(enrollment.id, rank);
          previousPercentage = percentage;
          previousRank = rank;
        });
        const rows = rankedRoster.map(({ enrollment, score, percentage }) => {
          return [
            enrollment.student?.name ?? "Unknown student",
            levelRank.has(enrollment.id) ? String(levelRank.get(enrollment.id)) : "–",
            score ? score.listeningScore : "–",
            score ? score.speakingScore : "–",
            score ? score.readingScore : "–",
            score ? score.writingScore : "–",
            score ? `${score.totalScore} / ${exam.totalMaxMarks}` : "–",
            percentage === undefined ? "–" : `${percentage.toFixed(1)}%`,
            percentage === undefined ? "Pending" : percentage < 75 ? "Needs Attention" : percentage >= 90 ? "Excellent" : percentage >= 80 ? "Good" : "Satisfactory",
          ];
        });
        if (rows.length === 0) rows.push(["No active students enrolled", "–", "–", "–", "–", "–", "–", "–", "–"]);
        autoTable(report, {
          head: [["Student Name", "Level Rank", "Listening", "Speaking", "Reading", "Writing", "Total", "Percentage", "Remarks"]],
          body: rows,
          startY: 49,
          margin: { top: 49, left: 14, right: 14, bottom: 12 },
          styles: { fontSize: 8, cellPadding: 2, valign: "middle" },
          headStyles: { fillColor: [255, 152, 0], fontStyle: "bold", halign: "center" },
          columnStyles: { 0: { cellWidth: 46 }, 1: { cellWidth: 18, halign: "center" }, 2: { cellWidth: 21, halign: "center" }, 3: { cellWidth: 21, halign: "center" }, 4: { cellWidth: 21, halign: "center" }, 5: { cellWidth: 21, halign: "center" }, 6: { cellWidth: 28, halign: "center" }, 7: { cellWidth: 25, halign: "center" }, 8: { cellWidth: "auto" } },
          didParseCell: ({ section, column, cell }) => {
            if (section === "body" && column.index === 7) {
              const percentage = Number.parseFloat(cell.text[0] ?? "");
              if (!Number.isNaN(percentage) && percentage < 75) {
                cell.styles.fillColor = [255, 243, 224];
                cell.styles.textColor = [173, 82, 0];
                cell.styles.fontStyle = "bold";
              }
            }
            if (section === "body" && column.index === 8 && cell.text[0] === "Needs Attention") {
              cell.styles.fillColor = [255, 243, 224];
              cell.styles.textColor = [173, 82, 0];
              cell.styles.fontStyle = "bold";
            }
          },
          willDrawPage: () => {
            if (logo) report.addImage(logo, "PNG", 240, 5, 40, 20);
            report.setTextColor(0, 0, 0);
            report.setFont("helvetica", "bold");
            report.setFontSize(15);
            report.text("Exam Report", 14, 15);
            report.setFont("helvetica", "normal");
            report.setFontSize(8);
            report.text(`Project: ${exam.project?.name ?? "Unknown Project"} | Center: ${exam.center?.name ?? "Unknown Center"} | Semester: ${exam.semester?.name ?? "Unknown Semester"}`, 14, 22, { maxWidth: 215 });
            report.text(filterSummary, 14, 28, { maxWidth: 215 });
            report.setFont("helvetica", "bold");
            report.setFontSize(10);
            report.text(exam.name, 14, 35, { maxWidth: 170 });
            report.setFont("helvetica", "normal");
            report.setFontSize(8);
            report.text(`${getAssessmentCycleLabel(exam.cycle)} · ${levelName(exam.semesterLevel)} · ${new Date(exam.examDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} · ${savedScores}/${roster.length} scores · ${absentCount} absent · ${exam.totalMaxMarks} max marks`, 14, 40, { maxWidth: 265 });
            report.text(`Section max marks — Listening: ${exam.listeningMaxMarks} · Speaking: ${exam.speakingMaxMarks} · Reading: ${exam.readingMaxMarks} · Writing: ${exam.writingMaxMarks}`, 14, 46, { maxWidth: 265 });
          },
        });
      });

      const addSummaryHeader = (title: string) => {
        if (logo) report.addImage(logo, "PNG", 240, 5, 40, 20);
        report.setTextColor(0, 0, 0);
        report.setFont("helvetica", "bold");
        report.setFontSize(15);
        report.text(title, 14, 15);
        report.setFont("helvetica", "normal");
        report.setFontSize(8);
        const firstExam = exams[0];
        report.text(`Project: ${firstExam?.project?.name ?? "Unknown Project"} | Center: ${firstExam?.center?.name ?? "Unknown Center"} | Semester: ${firstExam?.semester?.name ?? "Unknown Semester"}`, 14, 22, { maxWidth: 215 });
        report.text(filterSummary, 14, 28, { maxWidth: 265 });
      };

      report.addPage();
      autoTable(report, {
        head: [["Level", "Cycle", "Exam", "Date", "Roster", "Score entries", "Pending", "Absent", "Average", "Max marks"]],
        body: examSummaries.map(({ exam, roster, scored, pending, absent, percentageTotal, percentageCount }) => [
          levelName(exam.semesterLevel), getAssessmentCycleLabel(exam.cycle), exam.name,
          new Date(exam.examDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
          String(roster), String(scored), String(pending), String(absent),
          percentageCount ? `${(percentageTotal / percentageCount).toFixed(1)}%` : "–", String(exam.totalMaxMarks),
        ]),
        startY: 35,
        margin: { top: 35, left: 14, right: 14, bottom: 12 },
        styles: { fontSize: 8, cellPadding: 2, valign: "middle" },
        headStyles: { fillColor: [255, 152, 0], fontStyle: "bold", halign: "center" },
        columnStyles: { 0: { cellWidth: 29 }, 1: { cellWidth: 22 }, 2: { cellWidth: 56 }, 3: { cellWidth: 25 }, 4: { cellWidth: 17, halign: "center" }, 5: { cellWidth: 17, halign: "center" }, 6: { cellWidth: 17, halign: "center" }, 7: { cellWidth: 17, halign: "center" }, 8: { cellWidth: 22, halign: "center" }, 9: { cellWidth: 20, halign: "center" } },
        willDrawPage: () => addSummaryHeader("Exam Summary"),
      });

      report.addPage();
      addSummaryHeader("Overall Analytics & Insights");
      const overallPercentageCount = examSummaries.reduce((sum, item) => sum + item.percentageCount, 0);
      const overallPercentageTotal = examSummaries.reduce((sum, item) => sum + item.percentageTotal, 0);
      const totalRoster = examSummaries.reduce((sum, item) => sum + item.roster, 0);
      const totalPending = examSummaries.reduce((sum, item) => sum + item.pending, 0);
      const totalAbsent = examSummaries.reduce((sum, item) => sum + item.absent, 0);
      report.setFont("helvetica", "bold");
      report.setFontSize(10);
      report.text("Overall performance", 14, 38);
      report.setFont("helvetica", "normal");
      report.setFontSize(9);
      report.text(`Exams: ${examSummaries.length}   ·   Roster entries: ${totalRoster}   ·   Scored students: ${overallPercentageCount}   ·   Pending: ${totalPending}   ·   Absent: ${totalAbsent}   ·   Average: ${overallPercentageCount ? `${(overallPercentageTotal / overallPercentageCount).toFixed(1)}%` : "–"}`, 14, 45, { maxWidth: 265 });
      autoTable(report, {
        head: [["Level", "Scored students", "Average percentage"]],
        body: semesterLevels.map((level) => {
          const relevant = examSummaries.filter((item) => item.exam.semesterLevelId === level.id);
          const count = relevant.reduce((sum, item) => sum + item.percentageCount, 0);
          const total = relevant.reduce((sum, item) => sum + item.percentageTotal, 0);
          return [levelName(level), String(count), count ? `${(total / count).toFixed(1)}%` : "–"];
        }).filter((row) => row[1] !== "0"),
        startY: 51,
        margin: { top: 51, left: 14, right: 14, bottom: 12 },
        styles: { fontSize: 8, cellPadding: 2, valign: "middle" },
        headStyles: { fillColor: [255, 152, 0], fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 35, halign: "center" }, 2: { cellWidth: 45, halign: "center" } },
      });
      const bandStartY = (report as typeof report & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 58;
      report.setFont("helvetica", "bold");
      report.setFontSize(10);
      report.text("Performance distribution", 14, bandStartY + 9);
      autoTable(report, {
        head: [["Performance band", "Students", "Share of scored students"]],
        body: performanceBands.map(({ label, count }) => [label, String(count), overallPercentageCount ? `${((count / overallPercentageCount) * 100).toFixed(1)}%` : "0.0%"]),
        startY: bandStartY + 13,
        margin: { top: 35, left: 14, right: 14, bottom: 12 },
        styles: { fontSize: 8, cellPadding: 2, valign: "middle" },
        headStyles: { fillColor: [255, 152, 0], fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 35, halign: "center" }, 2: { cellWidth: 45, halign: "center" } },
        willDrawPage: () => addSummaryHeader("Overall Analytics & Insights"),
      });

      report.save(`Exam_Report_${safeName(exams[0]?.project?.name)}_${safeName(exams[0]?.center?.name)}_${safeName(exams[0]?.semester?.name)}.pdf`);
      toast.success("Exam report downloaded.");
    } catch (error) {
      console.error("Error exporting exam report:", error);
      toast.error("Unable to export exam report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <WorkspacePage className="space-y-6">
      <WorkspacePageHeader
        title="Exams"
        description="Plan assessments, review progress, and enter student scores."
        action={
          hasManagePermission || isAdmin || (canReadScores && exams.length > 0) ? (
            <div className="flex flex-wrap gap-2">
              {canReadScores && exams.length > 0 ? <button type="button" disabled={isExporting} onClick={() => void exportExamReport()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-wait disabled:opacity-60"><Download className="h-4 w-4" aria-hidden="true" />{isExporting ? "Exporting..." : "Export exam report"}</button> : null}
              {hasManagePermission || isAdmin ? <Link to={`${basePath}/create`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><Plus className="h-4 w-4" aria-hidden="true" />Create exam</Link> : null}
            </div>
          ) : null
        }
      />

      <section aria-label="Exam filters" className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <label className="grid gap-2 text-sm font-medium text-foreground">
            <span>Search exams</span>
            <span className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input aria-label="Search exams" className="min-h-11 w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Exam name" value={search} onChange={(event) => setSearch(event.target.value)} /></span>
          </label>
          <div className="grid gap-2 text-sm font-medium text-foreground">
            <span>Assessment cycle</span>
            <Select value={cycle} onValueChange={(value) => setCycle(value as "ALL" | AssessmentCycle)}>
              <SelectTrigger aria-label="Assessment cycle" className="h-11 border-input bg-background text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All cycles</SelectItem>{assessmentCycleOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 text-sm font-medium text-foreground">
            <span>Level</span>
            <Select value={semesterLevelId} onValueChange={setSemesterLevelId}>
              <SelectTrigger aria-label="Level" className="h-11 border-input bg-background text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All levels</SelectItem>{semesterLevels.map((level) => <SelectItem key={level.id} value={level.id}>{levelName(level)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {examQuery.isLoading ? <ExamListState title="Loading exams" description="Getting the assessments for this semester." /> : null}
      {examQuery.isError ? <ExamListState title="Exams could not be loaded" description="Check your connection and try again." action={<button type="button" onClick={() => void examQuery.refetch()} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button>} /> : null}
      {!examQuery.isLoading && !examQuery.isError && exams.length === 0 ? <ExamListState title="No exams found" description={search || cycle !== "ALL" || semesterLevelId !== "ALL" ? "Try changing the search or filters." : "Create the first assessment for this semester."} /> : null}
      {exams.length > 0 ? <div className="grid gap-4 lg:grid-cols-2">{exams.map((exam) => <article key={exam.id} className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{getAssessmentCycleLabel(exam.cycle)}</p><h2 className="mt-1 text-lg font-semibold text-foreground">{exam.name}</h2><p className="mt-1 text-sm text-muted-foreground">{levelName(exam.semesterLevel)} · {new Date(exam.examDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</p></div><p className="mt-4 text-sm text-muted-foreground">{exam._count?.studentScores ?? 0} scores saved · {exam.totalMaxMarks} marks</p><div className="mt-4 flex flex-wrap gap-2">{canReadScores ? <Link to={`${basePath}/${exam.id}/scores`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><ClipboardCheck className="h-4 w-4" aria-hidden="true" />Enter scores</Link> : null}{hasManagePermission || isAdmin ? <Link aria-label={`Edit ${exam.name}`} to={`${basePath}/${exam.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">Edit</Link> : null}</div></article>)}</div> : null}
    </WorkspacePage>
  );
}

function ExamListState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="rounded-lg border border-dashed border-border bg-card p-6 text-center shadow-sm"><h2 className="text-lg font-semibold text-foreground">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>{action ? <div className="mt-4">{action}</div> : null}</section>;
}

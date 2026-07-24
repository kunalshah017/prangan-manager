import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CalendarIcon,
  CheckIcon,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  UserIcon,
  Users,
  XIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import LoadingButterfly from "@/components/LoadingButterfly";
import { WeekendDatePicker } from "@/components/students/WeekendDatePicker";
import { ProfilePicture } from "@/components/ui";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { useSemesterLevels } from "@/hooks/useAcademicLevelQueries";
import { useStudentAttendanceRecords } from "@/hooks/useStudentAttendanceQueries";
import { useSemester } from "@/hooks/useSemesterQueries";
import { createCsvWorkbook } from "@/lib/csv-export";
import { levelName, sortByJourneyOrder } from "@/lib/levels";
import { cn } from "@/lib/utils";
import type { StudentAttendanceRecord } from "@/types/api";
import {
  formatDateToLocal,
  getClosestWeekendWithinRange,
  getNearestWeekend,
  getWeekendOnOrAfter,
  getWeekendOnOrBefore,
  isWeekendDate,
} from "@/utils/helper";

type LevelGroup = {
  key: string;
  label: string;
  students: Array<{
    id: string;
    name: string;
    profileImageUrl?: string;
    records: Map<string, StudentAttendanceRecord>;
  }>;
};

export const ViewStudentAttendance = () => {
  const { projectId, centerId, semesterId } = useParams();
  const [timeframe, setTimeframe] = useState<"single" | "range">("single");
  const [singleDate, setSingleDate] = useState(() => getNearestWeekend());
  const [fromDate, setFromDate] = useState(() => getNearestWeekend());
  const [toDate, setToDate] = useState(() => getNearestWeekend());
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [debouncedSingleDate, setDebouncedSingleDate] = useState(singleDate);
  const [debouncedFromDate, setDebouncedFromDate] = useState(fromDate);
  const [debouncedToDate, setDebouncedToDate] = useState(toDate);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasAppliedSemesterDefault = useRef(false);

  const { data: semester, isLoading: isLoadingSemester, error: semesterError } = useSemester(semesterId!);
  const semesterLevelsQuery = useSemesterLevels(semesterId!);
  const semesterLevels = useMemo(
    () => sortByJourneyOrder(semesterLevelsQuery.data ?? []),
    [semesterLevelsQuery.data],
  );
  const semesterLevelById = useMemo(
    () => new Map(semesterLevels.map((level) => [level.id, level])),
    [semesterLevels],
  );
  const semesterStartDate = semester?.startDate.slice(0, 10) || "";
  const semesterEndDate = semester?.endDate.slice(0, 10) || "";

  const { date, startDate, endDate } = useMemo(() => {
    if (timeframe === "single" && debouncedSingleDate) return { date: debouncedSingleDate };
    if (timeframe === "range" && debouncedFromDate && debouncedToDate) {
      return { startDate: debouncedFromDate, endDate: debouncedToDate };
    }
    return {};
  }, [debouncedFromDate, debouncedSingleDate, debouncedToDate, timeframe]);
  const isAttendanceRangeWithinSemester = Boolean(
    semesterStartDate && semesterEndDate &&
    (date
      ? date >= semesterStartDate && date <= semesterEndDate && isWeekendDate(date)
      : startDate && endDate && startDate >= semesterStartDate && endDate <= semesterEndDate && startDate <= endDate && isWeekendDate(startDate) && isWeekendDate(endDate)),
  );
  const { data: attendanceData, isLoading, isFetching, error, refetch: refetchAttendance } = useStudentAttendanceRecords({
    projectId: projectId!,
    centerId: centerId!,
    semesterId: semesterId!,
    ...(date ? { date } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(selectedStatus ? { status: selectedStatus } : {}),
    enabled: isAttendanceRangeWithinSemester,
  });

  const levelKey = (record: StudentAttendanceRecord) => record.enrollment?.semesterLevelId ?? "UNASSIGNED";
  const levelLabel = (key: string) => key === "UNASSIGNED"
    ? "Level not assigned"
    : levelName(semesterLevelById.get(key)) || "Level not assigned";
  const sortLevelKeys = (first: string, second: string) =>
    (semesterLevelById.get(first)?.academicLevel.journeyOrder ?? Number.MAX_SAFE_INTEGER) -
      (semesterLevelById.get(second)?.academicLevel.journeyOrder ?? Number.MAX_SAFE_INTEGER) ||
    levelLabel(first).localeCompare(levelLabel(second));
  const compareAttendanceRecords = (first: StudentAttendanceRecord, second: StudentAttendanceRecord) =>
    sortLevelKeys(levelKey(first), levelKey(second)) ||
    (first.student?.name || "Unknown student").localeCompare(second.student?.name || "Unknown student");

  useEffect(() => {
    if (!semesterStartDate || !semesterEndDate || hasAppliedSemesterDefault.current) return;
    const today = formatDateToLocal(new Date());
    const referenceDate = today < semesterStartDate ? semesterStartDate : today > semesterEndDate ? semesterEndDate : today;
    const monthStart = formatDateToLocal(new Date(`${referenceDate}T00:00:00`).getFullYear() ? new Date(new Date(`${referenceDate}T00:00:00`).getFullYear(), new Date(`${referenceDate}T00:00:00`).getMonth(), 1) : new Date());
    const start = getWeekendOnOrAfter(monthStart < semesterStartDate ? semesterStartDate : monthStart, referenceDate);
    const end = getWeekendOnOrBefore(referenceDate, start);
    const classDate = getClosestWeekendWithinRange(getNearestWeekend(), semesterStartDate, semesterEndDate);
    hasAppliedSemesterDefault.current = true;
    setSingleDate(classDate);
    setDebouncedSingleDate(classDate);
    setTimeframe("range");
    setFromDate(start);
    setToDate(end);
    setDebouncedFromDate(start);
    setDebouncedToDate(end);
  }, [semesterEndDate, semesterStartDate]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSingleDate(singleDate), 500);
    return () => clearTimeout(timer);
  }, [singleDate]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFromDate(fromDate);
      setDebouncedToDate(toDate);
    }, 500);
    return () => clearTimeout(timer);
  }, [fromDate, toDate]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowExportDropdown(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filteredAttendance = useMemo(() => {
    const records = attendanceData?.attendance ?? [];
    return selectedLevel
      ? records.filter((record) => record.enrollment?.semesterLevelId === selectedLevel)
      : records;
  }, [attendanceData?.attendance, selectedLevel]);
  const monthTables = useMemo(() => {
    const months = new Map<string, StudentAttendanceRecord[]>();
    filteredAttendance.forEach((record) => {
      const key = record.date.slice(0, 7);
      months.set(key, [...(months.get(key) ?? []), record]);
    });
    return Array.from(months.entries()).sort(([first], [second]) => first.localeCompare(second)).map(([key, records]) => {
      const students = new Map<string, { id: string; name: string; profileImageUrl?: string; level: string; records: Map<string, StudentAttendanceRecord> }>();
      records.forEach((record) => {
        const studentId = record.student?.id ?? record.studentId;
        const student = students.get(studentId) ?? {
          id: studentId,
          name: record.student?.name ?? "Unknown student",
          profileImageUrl: record.student?.profileImageUrl,
          level: levelKey(record),
          records: new Map<string, StudentAttendanceRecord>(),
        };
        student.records.set(record.date.slice(0, 10), record);
        students.set(studentId, student);
      });
      const levels = Array.from(new Set(Array.from(students.values(), (student) => student.level)))
        .sort(sortLevelKeys)
        .map<LevelGroup>((key) => ({
          key,
          label: levelLabel(key),
          students: Array.from(students.values())
            .filter((student) => student.level === key)
            .sort((first, second) => first.name.localeCompare(second.name)),
        }));
      const holidays = records.filter((record) => record.status === "HOLIDAY").length;
      const present = records.filter((record) => record.status === "PRESENT").length;
      return {
        key,
        label: new Date(`${key}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        records,
        dates: Array.from(new Set(records.map((record) => record.date.slice(0, 10)))).sort(),
        levels,
        present,
        absent: records.filter((record) => record.status === "ABSENT").length,
        holidays,
        attendanceRate: records.length - holidays ? ((present / (records.length - holidays)) * 100).toFixed(1) : "0.0",
      };
    });
  // The resolver functions are derived from semesterLevelById on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAttendance, semesterLevelById]);
  const stats = useMemo(() => {
    const holidays = filteredAttendance.filter((record) => record.status === "HOLIDAY").length;
    const present = filteredAttendance.filter((record) => record.status === "PRESENT").length;
    const absent = filteredAttendance.filter((record) => record.status === "ABSENT").length;
    const workingDays = filteredAttendance.length - holidays;
    return { total: filteredAttendance.length, present, absent, holidays, attendancePercentage: workingDays ? ((present / workingDays) * 100).toFixed(1) : "0.0" };
  }, [filteredAttendance]);
  const hasActiveFilters = selectedStatus !== "" || selectedLevel !== "";
  const clearFilters = () => {
    setSelectedStatus("");
    setSelectedLevel("");
  };

  const exportRows = () => filteredAttendance.slice().sort(compareAttendanceRecords).map((record, index) => ({
    "S.No": index + 1,
    "Student Name": record.student?.name ?? "Unknown student",
    Level: levelLabel(levelKey(record)),
    Date: new Date(record.date).toLocaleDateString(),
    Status: record.status,
    "Holiday Reason": record.holidayReason ?? "",
    "Marked By": record.markedByUser?.name ?? "System",
  }));
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = createCsvWorkbook();
      const workbook = XLSX.utils.book_new();
      const rows = exportRows();
      if (timeframe === "range") {
        monthTables.forEach((month) => {
          const rowsForMonth = rows.filter((_, index) => filteredAttendance.slice().sort(compareAttendanceRecords)[index]?.date.startsWith(month.key));
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rowsForMonth), month.label.slice(0, 31));
        });
      } else {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Attendance");
      }
      XLSX.writeFile(workbook, `attendance-${semester?.name ?? "records"}.csv`);
      toast.success("Attendance export downloaded.");
    } catch {
      toast.error("Unable to export attendance.");
    } finally {
      setIsExporting(false);
    }
  };
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const doc = new JsPDF({ orientation: "landscape" });
      doc.text(`Attendance — ${semester?.name ?? "Semester"}`, 14, 14);
      autoTable(doc, {
        startY: 20,
        head: [["Student", "Level", "Date", "Status", "Holiday reason", "Marked by"]],
        body: exportRows().map((row) => [row["Student Name"], row.Level, row.Date, row.Status, row["Holiday Reason"], row["Marked By"]]),
      });
      doc.save(`attendance-${semester?.name ?? "records"}.pdf`);
      toast.success("Attendance PDF downloaded.");
    } catch {
      toast.error("Unable to export attendance PDF.");
    } finally {
      setIsExporting(false);
    }
  };
  const setCurrentMonth = () => {
    if (!semesterStartDate || !semesterEndDate) return;
    const today = formatDateToLocal(new Date());
    const reference = today < semesterStartDate ? semesterStartDate : today > semesterEndDate ? semesterEndDate : today;
    const parsed = new Date(`${reference}T00:00:00`);
    const first = formatDateToLocal(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    const last = formatDateToLocal(new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0));
    const start = getWeekendOnOrAfter(first < semesterStartDate ? semesterStartDate : first, last > semesterEndDate ? semesterEndDate : last);
    const end = getWeekendOnOrBefore(last > semesterEndDate ? semesterEndDate : last, start);
    setFromDate(start); setToDate(end); setDebouncedFromDate(start); setDebouncedToDate(end);
  };
  const setFullSemester = () => {
    if (!semesterStartDate || !semesterEndDate) return;
    const start = getWeekendOnOrAfter(semesterStartDate, semesterEndDate);
    const end = getWeekendOnOrBefore(semesterEndDate, semesterStartDate);
    setFromDate(start); setToDate(end); setDebouncedFromDate(start); setDebouncedToDate(end);
  };
  const statusIcon = (status: StudentAttendanceRecord["status"]) => status === "PRESENT"
    ? <CheckIcon className="h-4 w-4 text-success" aria-hidden="true" />
    : status === "ABSENT" ? <XIcon className="h-4 w-4 text-destructive" aria-hidden="true" />
      : <CalendarIcon className="h-4 w-4 text-primary" aria-hidden="true" />;

  if (isLoadingSemester || isLoading || semesterLevelsQuery.isLoading) return <WorkspacePage><div className="flex min-h-[55dvh] items-center justify-center overflow-x-clip"><LoadingButterfly size="md" /></div></WorkspacePage>;
  if (semesterError || error || semesterLevelsQuery.error) return <WorkspacePage><div className="flex min-h-[55dvh] items-center justify-center"><div className="rounded-lg border border-border bg-card p-6 text-center"><RefreshCw className="mx-auto h-8 w-8 text-destructive" /><h1 className="mt-3 text-xl font-semibold">Attendance could not be loaded</h1><button type="button" className="mt-4 min-h-11 rounded-md border border-border px-4" onClick={() => void refetchAttendance()}>Try again</button></div></div></WorkspacePage>;

  return <WorkspacePage className="overflow-x-clip">
    <WorkspacePageHeader title="Student attendance" description="Review attendance by class day, month, and academic level." />
    <section className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm" aria-labelledby="attendance-filters-heading">
      <div className="mb-4 flex items-center justify-between"><div><h2 id="attendance-filters-heading" className="flex items-center gap-2 text-lg font-semibold"><SlidersHorizontal className="h-5 w-5 text-primary" />Filter records</h2><p className="mt-1 text-sm text-muted-foreground">Choose a class day or date range.</p></div>{hasActiveFilters && <button type="button" onClick={clearFilters} className="min-h-11 px-3 text-sm text-primary">Clear filters</button>}</div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div><span className="mb-2 block text-sm font-medium">Timeframe</span><div className="mb-3 grid grid-cols-2 rounded-md border border-border bg-muted p-1"><button type="button" className="min-h-11 rounded" onClick={() => setTimeframe("single")}>Single date</button><button type="button" className="min-h-11 rounded" onClick={() => setTimeframe("range")}>Date range</button></div>{timeframe === "single" ? <WeekendDatePicker label="Single date" value={singleDate} min={semesterStartDate} max={semesterEndDate} onChange={setSingleDate} /> : <div className="space-y-2"><div className="grid gap-3 sm:grid-cols-2"><WeekendDatePicker label="From" value={fromDate} min={semesterStartDate} max={semesterEndDate} onChange={setFromDate} /><WeekendDatePicker label="To" value={toDate} min={semesterStartDate} max={semesterEndDate} onChange={setToDate} /></div><div className="flex gap-2"><button type="button" onClick={setCurrentMonth} className="min-h-11 flex-1 rounded-md border border-border">Current month</button><button type="button" onClick={setFullSemester} className="min-h-11 flex-1 rounded-md border border-border">Full semester</button></div></div>}</div>
        <label className="grid gap-2 text-sm font-medium">Status<select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="min-h-11 rounded-md border border-input bg-background px-3"><option value="">All</option><option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="HOLIDAY">Holiday</option></select></label>
        <label className="grid gap-2 text-sm font-medium">Level<select value={selectedLevel} onChange={(event) => setSelectedLevel(event.target.value)} className="min-h-11 rounded-md border border-input bg-background px-3"><option value="">All</option>{semesterLevels.map((level) => <option key={level.id} value={level.id}>{levelName(level)}</option>)}</select></label>
      </div>
      <p className={cn("mt-4 text-xs", isAttendanceRangeWithinSemester ? "text-muted-foreground" : "text-destructive")} role={isAttendanceRangeWithinSemester ? undefined : "alert"}>Attendance records are available only between {semesterStartDate} and {semesterEndDate}.</p>
    </section>
    <section className="my-6 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Attendance statistics">{[["Records", stats.total], ["Present", stats.present], ["Absent", stats.absent], ["Holidays", stats.holidays], ["Attendance rate", `${stats.attendancePercentage}%`]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-border bg-card p-4"><div className="text-2xl font-semibold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>)}</section>
    {timeframe === "range" && monthTables.length > 1 && <nav className="mb-4 rounded-lg border border-border bg-card p-4" aria-label="Jump to month"><p className="text-sm font-semibold">Jump to month</p><div className="mt-3 flex gap-2 overflow-x-auto">{monthTables.map((month) => <a key={month.key} href={`#attendance-month-${month.key}`} className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-border px-3 text-sm">{month.label}</a>)}</div></nav>}
    {filteredAttendance.length > 0 && <div className="mb-4 flex justify-end"><div className="relative" ref={dropdownRef}><button type="button" onClick={() => setShowExportDropdown((open) => !open)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-4"><Download className="h-4 w-4" />{isExporting ? "Exporting..." : "Export records"}<ChevronDown className="h-4 w-4" /></button>{showExportDropdown && <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border border-border bg-card p-1 shadow-lg"><button type="button" onClick={() => void exportToExcel()} className="flex min-h-11 w-full items-center gap-2 px-3"><FileSpreadsheet className="h-4 w-4" />Export CSV</button><button type="button" onClick={() => void exportToPDF()} className="flex min-h-11 w-full items-center gap-2 px-3"><FileText className="h-4 w-4" />Export PDF</button></div>}</div></div>}
    <section aria-labelledby="attendance-records-heading"><h2 id="attendance-records-heading" className="mb-4 flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5 text-primary" />Attendance records {isFetching && <span className="text-xs text-muted-foreground">Updating...</span>}</h2>{filteredAttendance.length === 0 ? <div className="rounded-lg border border-border bg-card px-6 py-14 text-center"><UserIcon className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">No attendance records</h3><p className="mt-2 text-sm text-muted-foreground">{hasActiveFilters ? "No records match the selected filters." : "No attendance was marked during this period."}</p></div> : <div className="space-y-6">{monthTables.map((month) => <article key={month.key} id={`attendance-month-${month.key}`} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"><header className="border-b border-border p-4"><h3 className="text-xl font-semibold">{month.label}</h3><p className="mt-1 text-sm text-muted-foreground">{month.dates.length} class days · {month.records.length} attendance records · {month.attendanceRate}% rate</p></header><div className="max-w-full overflow-x-auto"><table className="w-full min-w-max border-separate border-spacing-0 text-sm"><thead><tr className="bg-muted"><th scope="col" className="sticky left-0 z-20 min-w-52 border-b border-r border-border bg-muted px-4 py-3 text-left">Student Name</th>{month.dates.map((day) => <th key={day} scope="col" className="min-w-24 border-b border-border px-3 py-3 text-center">{new Date(`${day}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</th>)}</tr></thead><tbody>{month.levels.map((level) => <Fragment key={level.key}><tr className="bg-primary/5"><th scope="rowgroup" className="sticky left-0 z-20 min-w-52 border-y border-r border-border bg-primary/5 px-4 py-2 text-left text-xs font-semibold uppercase text-primary">{level.label}</th><td colSpan={month.dates.length} className="border-y border-border bg-primary/5" /></tr>{level.students.map((student) => <tr key={student.id}><th scope="row" className="sticky left-0 z-10 min-w-52 border-b border-r border-border bg-card px-4 py-3 text-left"><span className="flex items-center gap-3"><ProfilePicture imageUrl={student.profileImageUrl} name={student.name} size="sm" colorScheme="orange" />{student.name}</span></th>{month.dates.map((day) => { const record = student.records.get(day); return <td key={day} className="border-b border-border px-3 py-3 text-center">{record ? statusIcon(record.status) : "–"}</td>; })}</tr>)}</Fragment>)}</tbody></table></div></article>)}</div>}</section>
  </WorkspacePage>;
};

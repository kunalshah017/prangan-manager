import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  CircleOff,
  CircleX,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";

import LoadingButterfly from "@/components/LoadingButterfly";
import ProtectedComponent from "@/components/ProtectedComponent";
import { WeekendDatePicker } from "@/components/students/WeekendDatePicker";
import { ProfilePicture } from "@/components/ui";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/workspace/WorkspacePage";
import { useAttendanceRecords } from "@/hooks/useAttendanceQueries";
import { useCenter } from "@/hooks/useCenterQueries";
import { useProject } from "@/hooks/useProjectQueries";
import { useSemester } from "@/hooks/useSemesterQueries";
import { useRemunerationUsers } from "@/hooks/useUserQueries";
import { downloadCsv, type CsvRow } from "@/lib/csv-export";
import { exportStaffAttendancePdf } from "@/lib/staff-attendance-pdf-export";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/types/api";
import {
  formatDateToLocal,
  getClosestWeekendWithinRange,
  getNearestWeekend,
  getWeekendOnOrAfter,
  getWeekendOnOrBefore,
  isWeekendDate,
} from "@/utils/helper";

type RoleFilter = "ALL" | "CENTER_MANAGER" | "EDUCATOR";
type StatusFilter =
  | "ALL"
  | "PRESENT"
  | "ABSENT"
  | "NOT_AVAILABLE"
  | "HOLIDAY";

type StaffRow = {
  id: string;
  name: string;
  role: "CENTER_MANAGER" | "EDUCATOR";
  profileImageUrl?: string;
  records: Map<string, AttendanceRecord>;
};

const roleLabel = (role: string) =>
  role === "CENTER_MANAGER" ? "Center Manager" : "Educator";

const statusShortLabel: Record<AttendanceRecord["status"], string> = {
  PRESENT: "P",
  ABSENT: "A",
  NOT_AVAILABLE: "NA",
  HOLIDAY: "H",
};

const statusLabel: Record<AttendanceRecord["status"], string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  NOT_AVAILABLE: "Not available",
  HOLIDAY: "Holiday",
};

export const ViewAttendance = () => {
  const { projectId = "", centerId = "", semesterId = "" } = useParams();
  const [timeframe, setTimeframe] = useState<"single" | "range">("single");
  const [singleDate, setSingleDate] = useState(getNearestWeekend());
  const [fromDate, setFromDate] = useState(getNearestWeekend());
  const [toDate, setToDate] = useState(getNearestWeekend());
  const [debouncedSingleDate, setDebouncedSingleDate] = useState(singleDate);
  const [debouncedFromDate, setDebouncedFromDate] = useState(fromDate);
  const [debouncedToDate, setDebouncedToDate] = useState(toDate);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const hasAppliedSemesterDefault = useRef(false);

  const semesterQuery = useSemester(semesterId);
  const centerQuery = useCenter(centerId);
  const projectQuery = useProject(projectId);
  const semesterStartDate = semesterQuery.data?.startDate.slice(0, 10) || "";
  const semesterEndDate = semesterQuery.data?.endDate.slice(0, 10) || "";

  const {
    data: payees = [],
    isLoading: isPayeesLoading,
    isError: isPayeesError,
    error: payeesError,
    isSuccess: isPayeesSuccess,
  } = useRemunerationUsers({ projectId, centerId, semesterId });
  const payeeIds = useMemo(
    () => new Set(payees.map((person) => person.id)),
    [payees],
  );
  const payeesById = useMemo(
    () => new Map(payees.map((person) => [person.id, person])),
    [payees],
  );

  const setCurrentMonth = useCallback(() => {
    if (!semesterStartDate || !semesterEndDate) return;
    const today = formatDateToLocal(new Date());
    const referenceDate =
      today < semesterStartDate
        ? semesterStartDate
        : today > semesterEndDate
          ? semesterEndDate
          : today;
    const reference = new Date(`${referenceDate}T00:00:00`);
    const monthStart = formatDateToLocal(
      new Date(reference.getFullYear(), reference.getMonth(), 1),
    );
    const monthEnd = formatDateToLocal(
      new Date(reference.getFullYear(), reference.getMonth() + 1, 0),
    );
    const boundedStart =
      monthStart < semesterStartDate ? semesterStartDate : monthStart;
    const boundedEnd = monthEnd > semesterEndDate ? semesterEndDate : monthEnd;
    const nextFrom = getWeekendOnOrAfter(boundedStart, boundedEnd);
    const nextTo = getWeekendOnOrBefore(boundedEnd, boundedStart);
    setTimeframe("range");
    setFromDate(nextFrom);
    setToDate(nextTo);
    setDebouncedFromDate(nextFrom);
    setDebouncedToDate(nextTo);
  }, [semesterEndDate, semesterStartDate]);

  const setFullSemester = () => {
    if (!semesterStartDate || !semesterEndDate) return;
    const nextFrom = getWeekendOnOrAfter(
      semesterStartDate,
      semesterEndDate,
    );
    const nextTo = getWeekendOnOrBefore(semesterEndDate, semesterStartDate);
    setTimeframe("range");
    setFromDate(nextFrom);
    setToDate(nextTo);
    setDebouncedFromDate(nextFrom);
    setDebouncedToDate(nextTo);
  };

  useEffect(() => {
    if (
      !semesterStartDate ||
      !semesterEndDate ||
      hasAppliedSemesterDefault.current
    ) {
      return;
    }
    hasAppliedSemesterDefault.current = true;
    const nearest = getClosestWeekendWithinRange(
      getNearestWeekend(),
      semesterStartDate,
      semesterEndDate,
    );
    setSingleDate(nearest);
    setDebouncedSingleDate(nearest);
    setCurrentMonth();
  }, [semesterEndDate, semesterStartDate, setCurrentMonth]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSingleDate(singleDate),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [singleDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedFromDate(fromDate);
      setDebouncedToDate(toDate);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [fromDate, toDate]);

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const dateParams = useMemo(
    () =>
      timeframe === "single"
        ? { startDate: debouncedSingleDate, endDate: debouncedSingleDate }
        : { startDate: debouncedFromDate, endDate: debouncedToDate },
    [debouncedFromDate, debouncedSingleDate, debouncedToDate, timeframe],
  );

  const isAttendanceRangeWithinSemester = Boolean(
    semesterStartDate &&
      semesterEndDate &&
      dateParams.startDate &&
      dateParams.endDate &&
      dateParams.startDate >= semesterStartDate &&
      dateParams.endDate <= semesterEndDate &&
      dateParams.startDate <= dateParams.endDate &&
      isWeekendDate(dateParams.startDate) &&
      isWeekendDate(dateParams.endDate),
  );

  const attendanceQuery = useAttendanceRecords({
    ...dateParams,
    projectId,
    centerId,
    semesterId,
    enabled: isAttendanceRangeWithinSemester,
  });

  const missingPayees = useMemo(() => {
    if (!isPayeesSuccess) return [];
    return Array.from(
      new Set(
        (attendanceQuery.data?.attendances || [])
          .filter(
            (record) =>
              record.userId &&
              !payeeIds.has(record.userId) &&
              ["CENTER_MANAGER", "EDUCATOR"].includes(
                record.roleAssignment?.subRole || "",
              ),
          )
          .map((record) => record.userName || record.userId),
      ),
    );
  }, [attendanceQuery.data?.attendances, isPayeesSuccess, payeeIds]);

  const canExportCsv = isPayeesSuccess && missingPayees.length === 0;
  const exportBlockedMessage = isPayeesError
    ? payeesError instanceof Error
      ? `Reimbursement rates could not be loaded: ${payeesError.message}`
      : "Reimbursement rates could not be loaded."
    : missingPayees.length > 0
      ? `Reimbursement details are unavailable for: ${missingPayees.join(", ")}`
      : "Reimbursement details are still loading.";

  const filteredAttendance = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return (attendanceQuery.data?.attendances || []).filter((record) => {
      const role = record.roleAssignment?.subRole;
      return (
        (roleFilter === "ALL" || role === roleFilter) &&
        (statusFilter === "ALL" || record.status === statusFilter) &&
        (!normalizedSearch ||
          record.userName.toLocaleLowerCase().includes(normalizedSearch))
      );
    });
  }, [attendanceQuery.data?.attendances, roleFilter, search, statusFilter]);
  const canExportPdf = filteredAttendance.length > 0;
  const canExport = canExportCsv || canExportPdf;

  const stats = useMemo(() => {
    const present = filteredAttendance.filter(
      (record) => record.status === "PRESENT",
    ).length;
    const absent = filteredAttendance.filter(
      (record) => record.status === "ABSENT",
    ).length;
    const notAvailable = filteredAttendance.filter(
      (record) => record.status === "NOT_AVAILABLE",
    ).length;
    const holiday = filteredAttendance.filter(
      (record) => record.status === "HOLIDAY",
    ).length;
    const basis = present + absent;
    return {
      present,
      absent,
      notAvailable,
      holiday,
      attendanceRate: basis ? ((present / basis) * 100).toFixed(1) : "0.0",
    };
  }, [filteredAttendance]);

  const monthTables = useMemo(() => {
    const months = new Map<string, AttendanceRecord[]>();
    for (const record of filteredAttendance) {
      const key = record.date.slice(0, 7);
      months.set(key, [...(months.get(key) || []), record]);
    }

    return Array.from(months, ([key, records]) => {
      const dates = Array.from(
        new Set(records.map((record) => record.date.slice(0, 10))),
      ).sort();
      const staff = new Map<string, StaffRow>();
      for (const record of records) {
        const role = record.roleAssignment?.subRole;
        if (role !== "CENTER_MANAGER" && role !== "EDUCATOR") continue;
        if (!staff.has(record.userId)) {
          staff.set(record.userId, {
            id: record.userId,
            name: record.userName,
            role,
            profileImageUrl: record.user?.profileImageUrl,
            records: new Map(),
          });
        }
        staff.get(record.userId)!.records.set(
          record.date.slice(0, 10),
          record,
        );
      }
      const roleGroups = (["CENTER_MANAGER", "EDUCATOR"] as const)
        .map((role) => ({
          key: role,
          label: roleLabel(role),
          staff: Array.from(staff.values())
            .filter((person) => person.role === role)
            .sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .filter((group) => group.staff.length);
      return {
        key,
        label: new Date(`${key}-01T00:00:00`).toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        }),
        records,
        dates,
        roleGroups,
      };
    }).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredAttendance]);

  const clearFilters = () => {
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setSearch("");
  };

  const getStatusCellLabel = (record: AttendanceRecord) =>
    [
      statusLabel[record.status],
      record.holidayReason && `Holiday reason: ${record.holidayReason}`,
      record.notes && `Notes: ${record.notes}`,
      `Marked by: ${record.markedByName || "System"}`,
    ]
      .filter(Boolean)
      .join(". ");

  const exportRows = (): CsvRow[] =>
    filteredAttendance.map((record, index) => {
      const reimbursementRate = payeesById.get(record.userId)?.dailyRate;
      return {
        "S.No": index + 1,
        Name: record.userName,
        Role: roleLabel(record.roleAssignment?.subRole || "EDUCATOR"),
        Date: record.date.slice(0, 10),
        Status: statusLabel[record.status],
        "Holiday reason": record.holidayReason || "",
        Notes: record.notes || "",
        "Marked by": record.markedByName || "System",
        "Marked at": record.markedAt
          ? new Date(record.markedAt).toLocaleString()
          : "",
        "Reimbursement rate": reimbursementRate ?? "Rate not set",
        Remuneration:
          record.status === "PRESENT" && reimbursementRate != null
            ? reimbursementRate
            : "",
      };
    });

    const exportToExcel = async () => {
    if (!canExportCsv) {
      toast.error(exportBlockedMessage);
      return;
    }
    setIsExporting(true);
    try {
      downloadCsv(
        exportRows(),
        `Staff_Attendance_${projectQuery.data?.name || "Project"}_${centerQuery.data?.name || "Center"}`,
      );
      toast.success("CSV downloaded");
    } finally {
      setIsExporting(false);
    }
    };

    const exportToPDF = async () => {
    if (!canExportPdf) {
      toast.error("No attendance records match the selected filters.");
      return;
    }
    setIsExporting(true);
    try {
      await exportStaffAttendancePdf({
        records: filteredAttendance,
        projectName: projectQuery.data?.name,
        centerName: centerQuery.data?.name,
        semesterName: semesterQuery.data?.name,
        periodLabel:
          timeframe === "single"
            ? dateParams.startDate
            : `${dateParams.startDate} to ${dateParams.endDate}`,
      });
      toast.success("PDF downloaded");
    } finally {
      setIsExporting(false);
    }
    };

  const pageDescription =
    [projectQuery.data?.name, centerQuery.data?.name, semesterQuery.data?.name]
      .filter(Boolean)
      .join(" · ") || "Educator and center manager attendance records";

  if (
    semesterQuery.isLoading ||
    (attendanceQuery.isLoading && isAttendanceRangeWithinSemester)
  ) {
    return (
      <WorkspacePage>
        <WorkspacePageHeader title="Staff attendance records" description={pageDescription} />
        <div className="mt-6 flex min-h-72 items-center justify-center overflow-x-clip rounded-lg border border-border bg-card" role="status">
          <LoadingButterfly size="lg" />
          <span className="sr-only">Loading staff attendance records</span>
        </div>
      </WorkspacePage>
    );
  }

  if (semesterQuery.error || attendanceQuery.error) {
    return (
      <WorkspacePage>
        <WorkspacePageHeader title="Staff attendance records" description={pageDescription} />
        <section className="mt-6 rounded-lg border border-destructive/25 bg-card px-6 py-14 text-center shadow-sm" role="alert">
          <h2 className="text-xl font-semibold text-foreground">Attendance records could not be loaded</h2>
          <p className="mt-2 text-sm text-muted-foreground">Check your connection and try again.</p>
          <button type="button" onClick={() => void attendanceQuery.refetch()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </section>
      </WorkspacePage>
    );
  }

  const hasActiveFilters =
    roleFilter !== "ALL" || statusFilter !== "ALL" || Boolean(search.trim());

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        title="Staff attendance records"
        description={pageDescription}
        badge={attendanceQuery.isFetching ? "Updating" : `${filteredAttendance.length} records`}
      />

      <section className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5" aria-labelledby="staff-attendance-filters">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="staff-attendance-filters" className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <SlidersHorizontal className="h-5 w-5 text-primary" aria-hidden="true" />
              Filter records
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Review a weekend or compare attendance across the semester.</p>
          </div>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="min-h-11 rounded-md px-3 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Clear filters
            </button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div>
            <span className="mb-2 block text-sm font-medium text-foreground">Timeframe</span>
            <div className="mb-3 grid grid-cols-2 rounded-md border border-border bg-muted p-1">
              <button type="button" aria-pressed={timeframe === "single"} onClick={() => setTimeframe("single")} className={cn("min-h-11 rounded px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", timeframe === "single" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>Single date</button>
              <button type="button" aria-pressed={timeframe === "range"} onClick={() => setTimeframe("range")} className={cn("min-h-11 rounded px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", timeframe === "range" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>Date range</button>
            </div>
            {timeframe === "single" ? (
              <WeekendDatePicker label="Single date" value={singleDate} min={semesterStartDate} max={semesterEndDate} onChange={setSingleDate} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">From<WeekendDatePicker label="From" value={fromDate} min={semesterStartDate} max={semesterEndDate} onChange={setFromDate} /></label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">To<WeekendDatePicker label="To" value={toDate} min={semesterStartDate} max={semesterEndDate} onChange={setToDate} /></label>
                <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
                  <button type="button" onClick={setCurrentMonth} className="min-h-11 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-accent">Current month</button>
                  <button type="button" onClick={setFullSemester} className="min-h-11 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-accent">Full semester</button>
                </div>
              </div>
            )}
          </div>

          <label className="grid content-start gap-2 text-sm font-medium text-foreground">
            Search staff
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Staff name" className="min-h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </span>
          </label>
          <label className="grid content-start gap-2 text-sm font-medium text-foreground">
            Role
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)} className="min-h-11 rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="ALL">All roles</option>
              <option value="CENTER_MANAGER">Center Manager</option>
              <option value="EDUCATOR">Educator</option>
            </select>
          </label>
          <label className="grid content-start gap-2 text-sm font-medium text-foreground">
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="min-h-11 rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="ALL">All statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="NOT_AVAILABLE">Not available</option>
              <option value="HOLIDAY">Holiday</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Staff attendance summary">
        {[
          ["Present", stats.present],
          ["Absent", stats.absent],
          ["Not available", stats.notAvailable],
          ["Holiday", stats.holiday],
          ["Attendance rate", `${stats.attendanceRate}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          </div>
        ))}
      </section>
      <p className="mt-2 text-xs text-muted-foreground">Attendance rate: Present/(Present + Absent). Not available and Holiday are excluded.</p>

      {isPayeesLoading && (
        <div className="mt-5 rounded-md border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">Loading reimbursement rates. Exports are temporarily unavailable.</div>
      )}
      {(isPayeesError || missingPayees.length > 0) && (
        <div className="mt-5 rounded-md border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">{exportBlockedMessage} Attendance records remain available.</div>
      )}

      {timeframe === "range" && monthTables.length > 1 && (
        <nav className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm" aria-label="Jump to month">
          <p className="text-sm font-semibold text-foreground">Jump to month</p>
          <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
            {monthTables.map((month) => (
              <a key={month.key} href={`#staff-month-${month.key}`} className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-accent">{month.label}</a>
            ))}
          </div>
        </nav>
      )}

      {filteredAttendance.length > 0 && (
        <ProtectedComponent requireAdmin>
          <div className="mt-5 flex justify-end">
            <div ref={exportMenuRef} className="relative">
              <button type="button" disabled={!canExport} aria-disabled={!canExport || isExporting} onClick={() => { if (!isExporting) setShowExportMenu((current) => !current); }} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm hover:bg-accent disabled:opacity-50" aria-expanded={showExportMenu}>
                <Download className="h-4 w-4" aria-hidden="true" />
                {isExporting ? "Exporting..." : "Export records"}
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-md border border-border bg-popover p-1 shadow-lg">
                  <button type="button" disabled={!canExportCsv} onClick={() => { setShowExportMenu(false); void exportToExcel(); }} className="flex min-h-11 w-full items-center gap-2 rounded px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"><FileSpreadsheet className="h-4 w-4 text-success" aria-hidden="true" />Export CSV</button>
                  <button type="button" disabled={!canExportPdf} onClick={() => { setShowExportMenu(false); void exportToPDF(); }} className="flex min-h-11 w-full items-center gap-2 rounded px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"><FileText className="h-4 w-4 text-destructive" aria-hidden="true" />Export PDF</button>
                </div>
              )}
            </div>
          </div>
        </ProtectedComponent>
      )}

      <section className="mt-6" aria-labelledby="staff-records-title">
        <h2 id="staff-records-title" className="flex items-center gap-2 text-lg font-semibold text-foreground"><Users className="h-5 w-5 text-primary" aria-hidden="true" />Attendance records</h2>
        {filteredAttendance.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">No attendance records</h3>
            <p className="mt-2 text-sm text-muted-foreground">No staff records match this date range and filters.</p>
            {hasActiveFilters && <button type="button" onClick={clearFilters} className="mt-5 min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:bg-accent">Clear filters</button>}
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {monthTables.map((month) => (
              <article key={month.key} id={`staff-month-${month.key}`} className="scroll-mt-24 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                <header className="border-b border-border p-4 sm:p-5">
                  <h3 className="text-xl font-semibold text-foreground">{month.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{month.dates.length} weekend days · {month.records.length} records</p>
                </header>
                <div className="max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]" tabIndex={0} aria-label={`${month.label} staff attendance table`}>
                  <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="bg-muted/70">
                        <th scope="col" className="sticky left-0 z-30 min-w-56 border-b border-r border-border bg-muted px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Staff member</th>
                        {month.dates.map((date) => (
                          <th key={date} scope="col" className="min-w-24 border-b border-border px-3 py-3 text-center text-xs font-semibold text-muted-foreground">
                            <span className="block text-foreground">{new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                            <span className="mt-1 block font-normal">{new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short" })}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {month.roleGroups.map((group) => (
                        <Fragment key={group.key}>
                          <tr className="bg-primary/5">
                            <th scope="rowgroup" className="sticky left-0 z-30 min-w-56 border-y border-r border-border bg-primary/5 px-4 py-2 text-left text-xs font-semibold uppercase text-primary">{group.label}</th>
                            <td colSpan={month.dates.length} className="border-y border-border bg-primary/5" aria-hidden="true" />
                          </tr>
                          {group.staff.map((person) => (
                            <tr key={person.id} className="hover:bg-muted/30">
                              <th scope="row" className="sticky left-0 z-20 min-w-56 border-b border-r border-border bg-card px-4 py-3 text-left">
                                <span className="flex items-center gap-3"><ProfilePicture imageUrl={person.profileImageUrl} name={person.name} size="sm" colorScheme="orange" /><span className="max-w-40 truncate font-semibold text-foreground" title={person.name}>{person.name}</span></span>
                              </th>
                              {month.dates.map((date) => {
                                const record = person.records.get(date);
                                return (
                                  <td key={date} className="border-b border-border px-3 py-3 text-center">
                                    {record ? <StatusCell record={record} label={getStatusCellLabel(record)} /> : <span className="text-muted-foreground">–</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </WorkspacePage>
  );
};

function StatusCell({ record, label }: { record: AttendanceRecord; label: string }) {
  const config = {
    PRESENT: { icon: Check, className: "border-success/40 bg-success/15 text-success" },
    ABSENT: { icon: CircleX, className: "border-destructive/40 bg-destructive/15 text-destructive" },
    NOT_AVAILABLE: { icon: CircleOff, className: "border-warning/50 bg-warning/20 text-warning-foreground" },
    HOLIDAY: { icon: CalendarDays, className: "border-primary/25 bg-primary/10 text-primary" },
  }[record.status];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-full border px-2 text-xs font-bold shadow-sm", config.className)} aria-label={label} title={label}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {statusShortLabel[record.status]}
    </span>
  );
}

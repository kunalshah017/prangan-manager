import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CircleOff,
  CircleX,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  Save,
  UserRound,
  Users,
} from "lucide-react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";

import LoadingButterfly from "@/components/LoadingButterfly";
import { WeekendDatePicker } from "@/components/students/WeekendDatePicker";
import { ProfilePicture } from "@/components/ui";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/workspace/WorkspacePage";
import {
  useActiveUsers,
  useAttendanceRecords,
  useBulkMarkAttendance,
} from "@/hooks/useAttendanceQueries";
import { useAuth } from "@/hooks/useAuth";
import { useSemester } from "@/hooks/useSemesterQueries";
import { can } from "@/lib/access";
import { levelName } from "@/lib/levels";
import { cn } from "@/lib/utils";
import type { AttendanceUser } from "@/types/api";
import {
  getClosestWeekendWithinRange,
  getNearestWeekend,
  isWeekendDate,
} from "@/utils/helper";

type AttendanceStatus = "PRESENT" | "ABSENT" | "NOT_AVAILABLE" | "HOLIDAY";

interface AttendanceEntry {
  userId: string;
  roleAssignmentId: string;
  status: AttendanceStatus;
  notes?: string;
}

const roleLabel = (role?: string) =>
  role === "CENTER_MANAGER" ? "Center Manager" : "Educator";

const committedDayLabel = (value?: string) => {
  if (value === "BOTH") return "Saturday and Sunday";
  if (value === "SATURDAY") return "Saturday";
  if (value === "SUNDAY") return "Sunday";
  return "Not specified";
};

const isCommittedOnDate = (
  committedDays: AttendanceUser["roleAssignments"][number]["committedDays"],
  date: string,
) => {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return (
    committedDays === "BOTH" ||
    (committedDays === "SATURDAY" && day === 6) ||
    (committedDays === "SUNDAY" && day === 0)
  );
};

export default function MarkStaffAttendance() {
  const { projectId = "", centerId = "", semesterId = "" } = useParams();
  const { user } = useAuth();
  const canWriteAttendance = can(user, "staffAttendance.write", {
    projectId,
    centerId,
    semesterId,
  });
  const isAdmin = user?.role === "ADMIN";
  const semesterQuery = useSemester(semesterId);
  const semesterStartDate = semesterQuery.data?.startDate.slice(0, 10) || "";
  const semesterEndDate = semesterQuery.data?.endDate.slice(0, 10) || "";
  const [selectedDate, setSelectedDate] = useState(getNearestWeekend());
  const [attendanceEntries, setAttendanceEntries] = useState<
    Record<string, AttendanceEntry>
  >({});
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayReason, setHolidayReason] = useState("");
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!semesterStartDate || !semesterEndDate) return;
    setSelectedDate((current) =>
      getClosestWeekendWithinRange(
        current,
        semesterStartDate,
        semesterEndDate,
      ),
    );
  }, [semesterEndDate, semesterStartDate]);

  const getActiveStaffAssignment = useCallback(
    (staff: AttendanceUser) =>
      staff.roleAssignments.find(
        (assignment) =>
          assignment.isActive &&
          (assignment.subRole === "EDUCATOR" ||
            assignment.subRole === "CENTER_MANAGER") &&
          assignment.projectId === projectId &&
          assignment.centerId === centerId &&
          assignment.semesterId === semesterId,
      ),
    [centerId, projectId, semesterId],
  );

  const getDefaultStatus = useCallback(
    (staff: AttendanceUser): AttendanceStatus => {
      const assignment = getActiveStaffAssignment(staff);
      if (!assignment || !isWeekendDate(selectedDate)) return "NOT_AVAILABLE";
      return isCommittedOnDate(assignment.committedDays, selectedDate)
        ? "ABSENT"
        : "NOT_AVAILABLE";
    },
    [getActiveStaffAssignment, selectedDate],
  );

  const activeUsersQuery = useActiveUsers(
    selectedDate,
    projectId,
    centerId,
    semesterId,
  );
  const attendanceQuery = useAttendanceRecords({
    startDate: selectedDate,
    endDate: selectedDate,
    projectId,
    centerId,
    semesterId,
    enabled: Boolean(
      canWriteAttendance &&
        isWeekendDate(selectedDate) &&
        semesterStartDate &&
        selectedDate >= semesterStartDate &&
        selectedDate <= semesterEndDate,
    ),
  });
  const bulkMarkAttendance = useBulkMarkAttendance();
  const activeUsers = useMemo(
    () => activeUsersQuery.data || [],
    [activeUsersQuery.data],
  );

  useEffect(() => {
    const existingByUser = new Map(
      (attendanceQuery.data?.attendances || []).map((record) => [
        record.userId,
        record,
      ]),
    );
    const nextEntries: Record<string, AttendanceEntry> = {};
    let holiday = false;
    let reason = "";

    for (const staff of activeUsers) {
      const assignment = getActiveStaffAssignment(staff);
      if (!assignment) continue;
      const existing = existingByUser.get(staff.id);
      const status =
        (existing?.status as AttendanceStatus | undefined) ??
        getDefaultStatus(staff);
      nextEntries[staff.id] = {
        userId: staff.id,
        roleAssignmentId: assignment.id,
        status,
        notes: existing?.notes || undefined,
      };
      if (status === "HOLIDAY") {
        holiday = true;
        reason ||= existing?.holidayReason || "";
      }
    }

    setAttendanceEntries(nextEntries);
    setIsHoliday(holiday);
    setHolidayReason(reason);
  }, [
    activeUsers,
    attendanceQuery.data,
    getActiveStaffAssignment,
    getDefaultStatus,
  ]);

  const counts = useMemo(() => {
    const entries = Object.values(attendanceEntries);
    return {
      total: entries.length,
      present: entries.filter((entry) => entry.status === "PRESENT").length,
      absent: entries.filter((entry) => entry.status === "ABSENT").length,
      notAvailable: entries.filter(
        (entry) => entry.status === "NOT_AVAILABLE",
      ).length,
    };
  }, [attendanceEntries]);

  const setPresent = (staff: AttendanceUser, checked: boolean) => {
    setAttendanceEntries((current) => ({
      ...current,
      [staff.id]: {
        ...current[staff.id],
        status: checked ? "PRESENT" : getDefaultStatus(staff),
      },
    }));
  };

  const markExpectedPresent = () => {
    setIsHoliday(false);
    setHolidayReason("");
    setAttendanceEntries((current) =>
      Object.fromEntries(
        activeUsers.map((staff) => [
          staff.id,
          {
            ...current[staff.id],
            status:
              getDefaultStatus(staff) === "ABSENT"
                ? "PRESENT"
                : "NOT_AVAILABLE",
          },
        ]),
      ),
    );
  };

  const resetDefaults = () => {
    setIsHoliday(false);
    setHolidayReason("");
    setAttendanceEntries((current) =>
      Object.fromEntries(
        activeUsers.map((staff) => [
          staff.id,
          { ...current[staff.id], status: getDefaultStatus(staff) },
        ]),
      ),
    );
  };

  const toggleHoliday = (checked: boolean) => {
    setIsHoliday(checked);
    if (!checked) setHolidayReason("");
    setAttendanceEntries((current) =>
      Object.fromEntries(
        activeUsers.map((staff) => [
          staff.id,
          {
            ...current[staff.id],
            status: checked ? "HOLIDAY" : getDefaultStatus(staff),
          },
        ]),
      ),
    );
  };

  const updateNotes = (userId: string, notes: string) => {
    setAttendanceEntries((current) => ({
      ...current,
      [userId]: { ...current[userId], notes: notes || undefined },
    }));
  };

  const saveAttendance = async () => {
    if (isHoliday && !holidayReason.trim()) {
      toast.error("Enter a holiday reason before saving.");
      return;
    }

    const attendances = Object.values(attendanceEntries).map((entry) => ({
      userId: entry.userId,
      status: entry.status,
      roleAssignmentId: entry.roleAssignmentId,
      notes: entry.notes,
      ...(entry.status === "HOLIDAY" && {
        holidayReason: holidayReason.trim(),
      }),
    }));

    try {
      await bulkMarkAttendance.mutateAsync({
        date: selectedDate,
        projectId,
        centerId,
        semesterId,
        attendances,
      });
      toast.success("Staff attendance saved");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save staff attendance.",
      );
    }
  };

  const isLoading =
    semesterQuery.isLoading ||
    activeUsersQuery.isLoading ||
    attendanceQuery.isLoading;
  const loadError =
    semesterQuery.error || activeUsersQuery.error || attendanceQuery.error;

  if (isLoading) {
    return (
      <WorkspacePage>
        <div className="flex min-h-[55dvh] items-center justify-center overflow-x-clip" role="status">
          <LoadingButterfly size="lg" />
          <span className="sr-only">Loading staff attendance</span>
        </div>
      </WorkspacePage>
    );
  }

  if (loadError || !semesterQuery.data) {
    return (
      <WorkspacePage>
        <WorkspacePageHeader
          title="Mark staff attendance"
          description="Record educator and center manager attendance."
        />
        <section className="mt-6 rounded-lg border border-destructive/25 bg-card px-6 py-14 text-center shadow-sm" role="alert">
          <RefreshCw className="mx-auto h-7 w-7 text-destructive" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">Staff roster could not be loaded</h2>
          <p className="mt-2 text-sm text-muted-foreground">Check your connection and try loading the roster again.</p>
          <button
            type="button"
            onClick={() =>
              void Promise.all([
                activeUsersQuery.refetch(),
                attendanceQuery.refetch(),
              ])
            }
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </section>
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        title="Mark staff attendance"
        description="Expected staff default to absent; people not committed on this day default to not available."
        badge={attendanceQuery.data?.attendances.length ? "Saved roster" : "New roster"}
      />

      <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-foreground">Attendance day</h2>
              <p className="text-sm text-muted-foreground">Weekend attendance follows each person&apos;s committed day.</p>
            </div>
          </div>
          <div className="mt-4">
            {isAdmin ? (
              <WeekendDatePicker
                label="Attendance date"
                value={selectedDate}
                min={semesterStartDate}
                max={semesterEndDate}
                onChange={setSelectedDate}
              />
            ) : (
              <div className="flex min-h-11 items-center rounded-md border border-border bg-muted px-3 text-sm font-medium text-foreground">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
          <label htmlFor="staff-holiday" className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-foreground">Holiday</span>
              <span className="block text-sm text-muted-foreground">Apply Holiday to the full roster.</span>
            </span>
            <input
              id="staff-holiday"
              type="checkbox"
              checked={isHoliday}
              onChange={(event) => toggleHoliday(event.target.checked)}
              className="h-5 w-5 accent-primary"
            />
          </label>
          {isHoliday && (
            <label className="mt-4 grid gap-2 text-sm font-medium text-foreground">
              Holiday reason
              <input
                value={holidayReason}
                onChange={(event) => setHolidayReason(event.target.value)}
                className="min-h-11 rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </label>
          )}
        </div>
      </section>

      <section className="mt-6 overflow-x-clip" aria-labelledby="staff-roster-title">
        <div className="mb-4 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="staff-roster-title" className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Users className="h-5 w-5 text-primary" aria-hidden="true" />
              Staff roster
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <strong className="text-success">{counts.present}</strong> present · <strong className="text-destructive">{counts.absent}</strong> absent · <strong className="text-warning-foreground">{counts.notAvailable}</strong> Not available · {counts.total} total
            </p>
          </div>
          {!isHoliday && activeUsers.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:flex">
              <button
                type="button"
                onClick={markExpectedPresent}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
              >
                <Check className="h-4 w-4 text-success" aria-hidden="true" />
                Mark expected present
              </button>
              <button
                type="button"
                onClick={resetDefaults}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset defaults
              </button>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          {activeUsers.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <UserRound className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">No active staff found</h2>
              <p className="mt-2 text-sm text-muted-foreground">No educators or center managers are assigned to this workspace.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {activeUsers.map((staff) => {
                const assignment = getActiveStaffAssignment(staff);
                const entry = attendanceEntries[staff.id];
                return (
                  <li key={staff.id} className="px-4 py-4 sm:px-5">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <ProfilePicture
                          imageUrl={staff.profileImageUrl}
                          name={staff.name}
                          size="md"
                          colorScheme="orange"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{staff.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {roleLabel(assignment?.subRole)}
                            {assignment?.semesterLevel
                              ? ` · ${levelName(assignment.semesterLevel)}`
                              : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Committed day: {committedDayLabel(assignment?.committedDays)}
                          </p>
                        </div>
                      </div>

                      <div id={`staff-status-${staff.id}`} className="justify-self-end text-right">
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">Current status:</span>
                        <StatusBadge status={isHoliday ? "HOLIDAY" : entry?.status || "NOT_AVAILABLE"} />
                      </div>
                    </div>

                    {!isHoliday && (
                      <button
                        type="button"
                        aria-pressed={entry?.status === "PRESENT"}
                        aria-describedby={`staff-status-${staff.id}`}
                        onClick={() => setPresent(staff, entry?.status !== "PRESENT")}
                        className={cn(
                          "mt-3 inline-flex min-h-11 min-w-36 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          entry?.status === "PRESENT"
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-border text-foreground hover:bg-accent",
                        )}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                        {entry?.status === "PRESENT" ? "Unmark present" : "Mark present"}
                      </button>
                    )}

                    <button
                      type="button"
                      aria-expanded={Boolean(expandedNotes[staff.id])}
                      onClick={() =>
                        setExpandedNotes((current) => ({
                          ...current,
                          [staff.id]: !current[staff.id],
                        }))
                      }
                      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                      {expandedNotes[staff.id] ? "Hide notes" : "Add notes"}
                    </button>
                    {expandedNotes[staff.id] && (
                      <textarea
                        value={entry?.notes || ""}
                        onChange={(event) => updateNotes(staff.id, event.target.value)}
                        rows={2}
                        placeholder="Attendance note"
                        className="mt-2 min-h-20 w-full resize-y rounded-md border border-input bg-background p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <div className="sticky bottom-3 z-20 mt-6 flex flex-col gap-3 rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <p className="text-sm text-muted-foreground">
          {isHoliday
            ? "Holiday will be recorded for the full staff roster."
            : `${counts.present} of ${counts.total} staff marked present.`}
        </p>
        <button
          type="button"
          onClick={() => void saveAttendance()}
          disabled={
            bulkMarkAttendance.isPending ||
            activeUsers.length === 0 ||
            (isHoliday && !holidayReason.trim())
          }
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {bulkMarkAttendance.isPending ? "Saving..." : "Save staff attendance"}
        </button>
      </div>
    </WorkspacePage>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const config = {
    PRESENT: {
      label: "Present",
      icon: Check,
      className: "border-success/40 bg-success/15 text-success",
    },
    ABSENT: {
      label: "Absent",
      icon: CircleX,
      className: "border-destructive/40 bg-destructive/15 text-destructive",
    },
    NOT_AVAILABLE: {
      label: "Not available",
      icon: CircleOff,
      className: "border-warning/50 bg-warning/20 text-warning-foreground",
    },
    HOLIDAY: {
      label: "Holiday",
      icon: CalendarDays,
      className: "border-primary/25 bg-primary/10 text-primary",
    },
  }[status];
  const Icon = config.icon;

  return (
    <span
      aria-label={`Current status: ${config.label}`}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold shadow-sm",
        config.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}

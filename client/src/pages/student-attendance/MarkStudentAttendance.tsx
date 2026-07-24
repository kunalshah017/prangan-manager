import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { CalendarDays, Check, CircleX, RefreshCw, Save, UserRound, Users } from "lucide-react";
import toast from "react-hot-toast";
import {
    useStudentsBySemester,
    useBulkMarkStudentAttendance,
    useStudentAttendanceRecords,
} from "@/hooks/useStudentAttendanceQueries";
import { useAuth } from "@/hooks/useAuth";
import { useSemester } from "@/hooks/useSemesterQueries";
import LoadingButterfly from "@/components/LoadingButterfly";
import { WeekendDatePicker } from "@/components/students/WeekendDatePicker";
import type { Student, StudentEnrollment } from "@/types/api";
import {
    getClosestWeekendWithinRange,
    getNearestWeekend,
    isWeekendDate,
} from "@/utils/helper";
import { ProfilePicture } from "@/components/ui/profile-picture";
import { can } from "@/lib/access";
import { levelName } from "@/lib/levels";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { cn } from "@/lib/utils";

type StudentAttendanceStatus = "PRESENT" | "ABSENT" | "HOLIDAY";

interface StudentAttendanceEntry {
    studentId: string;
    enrollmentId: string;
    status: StudentAttendanceStatus;
}

interface StudentWithEnrollment extends Student {
    enrollments: StudentEnrollment[];
}

export const MarkStudentAttendance = () => {
    const { projectId, centerId, semesterId } = useParams();
    const { user } = useAuth();

    const workspace = { projectId, centerId, semesterId };
    const canWriteAttendance = can(user, 'studentAttendance.write', workspace);
    const canMarkHoliday = can(user, 'studentAttendance.holiday', workspace);

    const educatorSemesterLevelIds = useMemo(() => {
        const levels = (user?.roleAssignments || [])
            .filter(
                (ra) =>
                    ra.isActive &&
                    ra.subRole === "EDUCATOR" &&
                    ra.projectId === projectId &&
                    ra.centerId === centerId &&
                    (!!ra.semesterLevelId) &&
                    ra.semesterId === semesterId
            )
            .map((ra) => ra.semesterLevelId!);
        return Array.from(new Set(levels));
    }, [user?.roleAssignments, projectId, centerId, semesterId]);

    const [selectedDate, setSelectedDate] = useState<string>(getNearestWeekend());
    const [isHolidayDay, setIsHolidayDay] = useState(false);
    const [holidayReason, setHolidayReason] = useState("");
    const [entries, setEntries] = useState<Record<string, StudentAttendanceEntry>>({});
    const {
        data: semester,
        isLoading: isLoadingSemester,
        error: semesterError,
    } = useSemester(semesterId!);
    const semesterStartDate = semester?.startDate.slice(0, 10) || "";
    const semesterEndDate = semester?.endDate.slice(0, 10) || "";
    const isSelectedDateWeekend = Boolean(selectedDate && isWeekendDate(selectedDate));
    const isSelectedDateWithinSemester = Boolean(
        semesterStartDate &&
        semesterEndDate &&
        selectedDate >= semesterStartDate &&
        selectedDate <= semesterEndDate &&
        isSelectedDateWeekend,
    );

    useEffect(() => {
        if (!semesterStartDate || !semesterEndDate) return;
        setSelectedDate((currentDate) =>
            getClosestWeekendWithinRange(
                currentDate,
                semesterStartDate,
                semesterEndDate,
            ),
        );
    }, [semesterEndDate, semesterStartDate]);

    // 1) Load students for the semester
    const {
        data: studentsData,
        isLoading: isLoadingStudents,
        error: studentsError,
        refetch: refetchStudents,
    } = useStudentsBySemester(semesterId!, { enabled: canWriteAttendance });

    // 2) Load attendance for the selected date
    const { data: attendanceData, isLoading: isLoadingAttendance } = useStudentAttendanceRecords({
        date: selectedDate,
        projectId: projectId!,
        centerId: centerId!,
        semesterId: semesterId!,
        enabled: canWriteAttendance && isSelectedDateWithinSemester,
    });

    // Visible students list based on role
    const visibleStudents: StudentWithEnrollment[] = useMemo(() => {
        // Prefer transformed students from hook; else map from enrollments shape
        const transformed = (studentsData as unknown as { students?: StudentWithEnrollment[] })?.students;
        const fallbackFromEnrollments: StudentWithEnrollment[] = (() => {
            const enrollments = (studentsData as unknown as { enrollments?: StudentEnrollment[] })?.enrollments;
            if (!enrollments?.length) return [];
            return enrollments
                .filter((en) => en.semesterId === semesterId)
                .map((en) => ({ ...(en.student as Student), enrollments: [en] })) as StudentWithEnrollment[];
        })();

        const allStudents = (transformed?.length ? transformed : fallbackFromEnrollments) || [];

        if (canMarkHoliday) return allStudents;
        if (!educatorSemesterLevelIds.length) return [];
        return allStudents.filter((s) => {
            const active = s.enrollments?.find((en) => en.semesterId === semesterId && en.isActive);
            if (!active) return false;
            return !!active.semesterLevelId && educatorSemesterLevelIds.includes(active.semesterLevelId);
        });
    }, [studentsData, canMarkHoliday, educatorSemesterLevelIds, semesterId]);

    // Build initial entries whenever students or attendance change
    useEffect(() => {
        if (!visibleStudents.length) {
            setEntries({});
            setIsHolidayDay(false);
            setHolidayReason("");
            return;
        }

        const initial: Record<string, StudentAttendanceEntry> = {};
        for (const s of visibleStudents) {
            const active = s.enrollments?.find((en) => en.semesterId === semesterId && en.isActive);
            if (!active) continue;
            initial[s.id] = {
                studentId: s.id,
                enrollmentId: active.id,
                status: "ABSENT",
            };
        }

        const existing = attendanceData?.attendance || [];
        let dayHoliday = false;
        let existingHolidayReason = "";
        for (const rec of existing) {
            if (!initial[rec.studentId]) continue; // skip students not visible to this user
            if (rec.status === "HOLIDAY") {
                dayHoliday = true;
                existingHolidayReason ||= rec.holidayReason || "";
            }
            if (rec.status === "PRESENT" || rec.status === "ABSENT" || rec.status === "HOLIDAY") {
                initial[rec.studentId].status = rec.status as StudentAttendanceStatus;
            }
        }

        setEntries(initial);
        setIsHolidayDay(dayHoliday);
        setHolidayReason(existingHolidayReason);
    }, [visibleStudents, attendanceData, semesterId]);

    const togglePresent = (studentId: string, checked: boolean) => {
        if (isHolidayDay) return;
        setEntries((prev) => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                status: checked ? "PRESENT" : "ABSENT",
            },
        }));
    };

    const onToggleHoliday = (checked: boolean) => {
        setIsHolidayDay(checked);
        setEntries((prev) => {
            const next: typeof prev = { ...prev };
            Object.keys(next).forEach((id) => {
                next[id] = { ...next[id], status: checked ? "HOLIDAY" : "ABSENT" };
            });
            return next;
        });
    };

    const markAll = (status: "PRESENT" | "ABSENT") => {
        if (isHolidayDay) return;
        setEntries((previous) => Object.fromEntries(
            Object.entries(previous).map(([studentId, entry]) => [studentId, { ...entry, status }]),
        ));
    };

    const attendanceCounts = useMemo(() => {
        const values = Object.values(entries);
        return {
            total: values.length,
            present: values.filter((entry) => entry.status === "PRESENT").length,
            absent: values.filter((entry) => entry.status === "ABSENT").length,
        };
    }, [entries]);

    const bulkMutation = useBulkMarkStudentAttendance();

    const handleSave = async () => {
        if (!isSelectedDateWeekend) {
            toast.error("Student attendance can only be marked on Saturday or Sunday.");
            return;
        }

        if (!isSelectedDateWithinSemester) {
            toast.error(
                `Attendance can only be marked between ${semesterStartDate} and ${semesterEndDate}.`,
            );
            return;
        }

        const list = Object.values(entries);
        if (!list.length) {
            toast.error("No students to save.");
            return;
        }

        const overall: "PRESENT" | "ABSENT" | "HOLIDAY" = isHolidayDay ? "HOLIDAY" : "PRESENT";
        if (isHolidayDay && !canMarkHoliday) {
            toast.error("Only Center Managers can mark a holiday.");
            return;
        }
        if (isHolidayDay && !holidayReason.trim()) {
            toast.error("Please provide a holiday reason.");
            return;
        }

        const payload = {
            date: selectedDate,
            status: overall,
            projectId: projectId!,
            centerId: centerId!,
            semesterId: semesterId!,
            studentAttendances: list.map((e) => ({
                studentId: e.studentId,
                enrollmentId: e.enrollmentId,
                status: e.status,
            })),
            ...(isHolidayDay ? { holidayReason } : {}),
        };

        const toastId = toast.loading("Saving attendance...");
        try {
            await bulkMutation.mutateAsync(payload);
            toast.success("Attendance saved.", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to save attendance.", { id: toastId });
        }
    };

    if (isLoadingSemester || isLoadingStudents || isLoadingAttendance) {
        return (
            <WorkspacePage><div className="flex min-h-[55dvh] items-center justify-center overflow-x-clip" aria-live="polite" aria-busy="true"><LoadingButterfly size="md" /><span className="sr-only">Loading student attendance</span></div></WorkspacePage>
        );
    }

    if (semesterError || studentsError) {
        return (
            <WorkspacePage><div className="mx-auto flex min-h-[55dvh] max-w-2xl items-center justify-center"><div className="w-full rounded-lg border border-border bg-card p-6 text-center shadow-sm"><RefreshCw className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" /><h1 className="mt-4 text-2xl font-semibold text-foreground">Students could not be loaded</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Check your connection and reload the attendance roster.</p><button type="button" onClick={() => void refetchStudents()} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button></div></div></WorkspacePage>
        );
    }

    return (
        <WorkspacePage>
            <WorkspacePageHeader
                title="Mark student attendance"
                description="Choose a class date, review each student, then save the roster once."
                badge={attendanceData?.attendance?.length ? "Saved roster" : "New roster"}
            />

            <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]" aria-labelledby="attendance-day-heading">
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
                    <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><CalendarDays className="h-5 w-5" aria-hidden="true" /></span><div><h2 id="attendance-day-heading" className="font-semibold text-foreground">Attendance day</h2><p className="text-sm text-muted-foreground">Educators mark the assigned class day.</p></div></div>
                    <div className="mt-4 grid gap-2 text-sm font-medium text-foreground"><span>Date</span><WeekendDatePicker label="Attendance date" value={selectedDate} min={semesterStartDate} max={semesterEndDate} onChange={setSelectedDate} disabled={!canMarkHoliday} /></div>
                </div>

                {canMarkHoliday && (
                    <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
                        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4" htmlFor="holiday-day"><span><span className="block text-sm font-semibold text-foreground">Holiday</span><span className="block text-sm text-muted-foreground">Apply holiday status to everyone.</span></span><input id="holiday-day" type="checkbox" checked={isHolidayDay} onChange={(event) => onToggleHoliday(event.target.checked)} className="h-5 w-5 accent-primary" /></label>
                        {isHolidayDay && <label className="mt-4 grid gap-2 text-sm font-medium text-foreground" htmlFor="holiday-reason">Holiday reason<input id="holiday-reason" type="text" value={holidayReason} onChange={(event) => setHolidayReason(event.target.value)} required aria-invalid={!holidayReason.trim()} className={cn("min-h-11 w-full rounded-md border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", !holidayReason.trim() ? "border-destructive" : "border-input")} /><span className={cn("text-xs", !holidayReason.trim() ? "text-destructive" : "text-muted-foreground")}>{!holidayReason.trim() ? "Enter a reason before saving." : "This reason appears in attendance records."}</span></label>}
                    </div>
                )}
            </section>

            <section className="mt-6" aria-labelledby="student-roster-heading">
                <div className="mb-4 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div><h2 id="student-roster-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground"><Users className="h-5 w-5 text-primary" aria-hidden="true" />Student roster</h2><p className="mt-1 text-sm text-muted-foreground"><span className="font-semibold text-foreground">{attendanceCounts.present}</span> present · <span className="font-semibold text-foreground">{attendanceCounts.absent}</span> absent · {attendanceCounts.total} total</p></div>
                    {!isHolidayDay && visibleStudents.length > 0 && <div className="grid grid-cols-2 gap-2 sm:flex"><button type="button" onClick={() => markAll("PRESENT")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Check className="h-4 w-4 text-success" aria-hidden="true" />Mark all present</button><button type="button" onClick={() => markAll("ABSENT")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CircleX className="h-4 w-4 text-destructive" aria-hidden="true" />Mark all absent</button></div>}
                </div>

                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                    {!visibleStudents.length ? (
                        <div className="px-6 py-14 text-center">
                            <UserRound className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
                            <h2 className="mt-4 text-lg font-semibold text-foreground">No students available</h2>
                            <p className="mt-2 text-sm text-muted-foreground">No active students are assigned to your attendance view.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {visibleStudents
                                .slice()
                                .sort((a, b) => {
                                    // Get active enrollments for both students
                                    const activeA = a.enrollments?.find((en) => en.semesterId === semesterId && en.isActive);
                                    const activeB = b.enrollments?.find((en) => en.semesterId === semesterId && en.isActive);

                                    const priorityA = activeA?.semesterLevel?.academicLevel.journeyOrder ?? Number.MAX_SAFE_INTEGER;
                                    const priorityB = activeB?.semesterLevel?.academicLevel.journeyOrder ?? Number.MAX_SAFE_INTEGER;

                                    // First sort by level priority
                                    if (priorityA !== priorityB) {
                                        return priorityA - priorityB;
                                    }

                                    // Then sort alphabetically by name within the same level
                                    return a.name.localeCompare(b.name);
                                })
                                .map((s) => {
                                    const active = s.enrollments?.find((en) => en.semesterId === semesterId && en.isActive);
                                    const entry = entries[s.id];
                                    return (
                                        <li key={s.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <ProfilePicture imageUrl={s.profileImageUrl} name={s.name} size="md" colorScheme="orange" className="shrink-0" />
                                                <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{s.name}</p><p className="mt-1 text-xs text-muted-foreground">{levelName(active?.semesterLevel, active?.level) || "Level not assigned"}</p></div>
                                            </div>
                                            {isHolidayDay ? <span className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary/10 px-4 text-sm font-semibold text-primary sm:min-w-40">Holiday</span> : <div className="grid grid-cols-2 rounded-md border border-border bg-muted p-1 sm:min-w-64" aria-label={`Attendance status for ${s.name}`}><button type="button" aria-pressed={entry?.status === "PRESENT"} onClick={() => togglePresent(s.id, true)} className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", entry?.status === "PRESENT" ? "bg-card text-success shadow-sm" : "text-muted-foreground hover:text-foreground")}><Check className="h-4 w-4" aria-hidden="true" />Present</button><button type="button" aria-pressed={entry?.status === "ABSENT"} onClick={() => togglePresent(s.id, false)} className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", entry?.status === "ABSENT" ? "bg-card text-destructive shadow-sm" : "text-muted-foreground hover:text-foreground")}><CircleX className="h-4 w-4" aria-hidden="true" />Absent</button></div>}
                                        </li>
                                    );
                                })}
                        </ul>
                    )}
                </div>
            </section>

            <div className="sticky bottom-3 z-20 mt-6 flex flex-col gap-3 rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4"><p className="text-sm text-muted-foreground">{isHolidayDay ? "Holiday will be recorded for the full roster." : `${attendanceCounts.present} of ${attendanceCounts.total} students marked present.`}</p><button type="button" onClick={() => void handleSave()} disabled={bulkMutation.isPending || !isSelectedDateWithinSemester || !visibleStudents.length || (isHolidayDay && !holidayReason.trim())} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"><Save className="h-4 w-4" aria-hidden="true" />{bulkMutation.isPending ? "Saving..." : "Save attendance"}</button></div>
        </WorkspacePage>
    );
};

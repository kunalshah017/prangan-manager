import { useCallback, useMemo } from "react";
import {
    AlertTriangle,
    BookOpenCheck,
    CheckCircle2,
    GraduationCap,
    Layers3,
    PartyPopper,
    RefreshCw,
    Users,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { DashboardAction } from "@/components/dashboard/DashboardAction";
import { DashboardMetric } from "@/components/dashboard/DashboardMetric";
import FutureProfessionCarousel from "@/components/FutureProfessionCarousel";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { useAttendanceRecords } from "@/hooks/useAttendanceQueries";
import { useAuth } from "@/hooks/useAuth";
import { useCenter } from "@/hooks/useCenterQueries";
import { useExams } from "@/hooks/useExamQueries";
import { useSemester } from "@/hooks/useSemesterQueries";
import { useStudentAttendanceRecords } from "@/hooks/useStudentAttendanceQueries";
import { useStudentsBySemester } from "@/hooks/useStudentQueries";
import { useSyllabi, useSyllabusStatistics, useSyllabusTopics } from "@/hooks/useSyllabusQueries";
import { useContextStaff } from "@/hooks/useUserQueries";
import { buildDashboardModel, hasCompleteBankDetails } from "@/lib/dashboard";
import { levelName, sortByJourneyOrder } from "@/lib/levels";
import { cn } from "@/lib/utils";
import type { ContextStaffUser, Student } from "@/types/api";

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });

const isSameContext = (
    assignment: NonNullable<ContextStaffUser["roleAssignments"]>[number],
    projectId: string,
    centerId: string,
    semesterId: string,
) =>
    assignment.isActive &&
    assignment.projectId === projectId &&
    assignment.centerId === centerId &&
    assignment.semesterId === semesterId;

type AttentionItem = {
    title: string;
    detail: string;
    href: string;
    actionLabel?: string;
};

function AttentionSection({
    items,
    headingId,
    className,
}: {
    items: AttentionItem[];
    headingId: string;
    className?: string;
}) {
    return (
        <section
            aria-labelledby={headingId}
            className={cn("rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6", className)}
        >
            <div className="flex items-center justify-between gap-4">
                <h2 id={headingId} className="text-xl font-semibold text-foreground">Needs attention</h2>
                <span
                    className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                        items.length
                            ? "bg-warning/15 text-warning-foreground"
                            : "bg-success/15 text-success-foreground",
                    )}
                    aria-label={`${items.length} attention item${items.length === 1 ? "" : "s"}`}
                >
                    {items.length}
                </span>
            </div>
            {items.length ? (
                <div className="mt-4 divide-y divide-border">
                    {items.map((item) => (
                        <Link
                            key={item.title}
                            to={item.href}
                            className="group flex min-h-11 items-start gap-3 py-4 first:pt-2 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning-foreground">
                                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-foreground group-hover:text-primary">{item.title}</span>
                                <span className="mt-1 block text-sm leading-6 text-muted-foreground">{item.detail}</span>
                                {item.actionLabel && (
                                    <span className="mt-3 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground group-hover:bg-primary/90">
                                        {item.actionLabel}
                                    </span>
                                )}
                            </span>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="mt-4 flex items-start gap-3 rounded-md bg-muted/45 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                    <div>
                        <p className="text-sm font-semibold text-foreground">No immediate follow-up</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">Your permitted semester checks are clear for now.</p>
                    </div>
                </div>
            )}
        </section>
    );
}

export default function Dashboard() {
    const { projectId = "", centerId = "", semesterId = "" } = useParams();
    const { user } = useAuth();
    const context = { projectId, centerId, semesterId };
    const dashboardModel = buildDashboardModel(user, context);
    const today = useMemo(() => new Date(), []);
    const todayString = today.toISOString().slice(0, 10);
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;

    const semesterQuery = useSemester(semesterId);
    const centerQuery = useCenter(centerId);
    const studentsQuery = useStudentsBySemester(semesterId, {
        enabled: dashboardModel.visibility.students,
    });
    const staffQuery = useContextStaff({
        ...context,
        enabled: dashboardModel.visibility.staff,
    });
    const studentAttendanceQuery = useStudentAttendanceRecords({
        ...context,
        date: todayString,
        enabled: isWeekend && dashboardModel.capabilities.markStudentAttendance,
    });
    const staffAttendanceQuery = useAttendanceRecords({
        ...context,
        startDate: todayString,
        endDate: todayString,
        enabled: dashboardModel.visibility.staffAttendance && isWeekend,
    });
    const syllabiQuery = useSyllabi({
        ...context,
        semesterLevelId: dashboardModel.assignedSemesterLevelId,
        isActive: true,
        enabled: dashboardModel.visibility.curriculum,
    });
    const syllabusStatisticsQuery = useSyllabusStatistics({
        ...context,
        semesterLevelId: dashboardModel.assignedSemesterLevelId,
        enabled: dashboardModel.visibility.curriculum,
    });
    const examsQuery = useExams({
        ...context,
        semesterLevelId: dashboardModel.assignedSemesterLevelId,
        isActive: true,
        enabled: dashboardModel.visibility.exams,
    });
    const semesterLevels = useMemo(
        () => sortByJourneyOrder((semesterQuery.data?.levels ?? []).filter((level) => level.isActive)),
        [semesterQuery.data?.levels],
    );
    const semesterLevelById = useMemo(
        () => new Map(semesterLevels.map((level) => [level.id, level])),
        [semesterLevels],
    );
    const assignedSemesterLevel = semesterLevelById.get(
        dashboardModel.assignedSemesterLevelId ?? "",
    );
    const resolveSemesterLevelId = useCallback(
        (reference?: {
            semesterLevelId?: string | null;
        }) => reference?.semesterLevelId ?? undefined,
        [],
    );

    const visibleSyllabi = syllabiQuery.data || [];
    const activeSyllabus = visibleSyllabi[0];
    const topicsQuery = useSyllabusTopics({
        syllabusId: activeSyllabus?.id,
        includeSubtopics: true,
        status: "ONGOING",
    });

    const students = useMemo(() => {
        const allStudents = studentsQuery.data || [];
        return assignedSemesterLevel
            ? allStudents.filter((student) => resolveSemesterLevelId(student) === assignedSemesterLevel.id)
            : allStudents;
    }, [assignedSemesterLevel, resolveSemesterLevelId, studentsQuery.data]);

    const studentsByLevel = useMemo(
        () =>
            students.reduce<Record<string, number>>((counts, student) => {
                const semesterLevelId = resolveSemesterLevelId(student);
                if (semesterLevelId) counts[semesterLevelId] = (counts[semesterLevelId] || 0) + 1;
                return counts;
            }, {}),
        [resolveSemesterLevelId, students],
    );
    const populatedSemesterLevels = semesterLevels.filter((level) => studentsByLevel[level.id]);

    const staff = useMemo(() => staffQuery.data || [], [staffQuery.data]);
    const staffCounts = useMemo(() => {
        const educators = new Set<string>();
        const managers = new Set<string>();
        for (const person of staff) {
            for (const assignment of person.roleAssignments || []) {
                if (!isSameContext(assignment, projectId, centerId, semesterId)) continue;
                if (assignment.subRole === "EDUCATOR") educators.add(person.id);
                if (assignment.subRole === "CENTER_MANAGER") managers.add(person.id);
            }
        }
        return { educators: educators.size, managers: managers.size };
    }, [staff, projectId, centerId, semesterId]);

    const ongoingItems = useMemo(
        () =>
            (topicsQuery.data || []).flatMap((topic) => {
                const items = topic.subtopics?.length ? topic.subtopics : [topic];
                return items.map((item) => ({
                    id: item.id,
                    title: item.title,
                    updatedAt: item.recentProgress?.[0]?.createdAt || item.updatedAt,
                }));
            }),
        [topicsQuery.data],
    );
    const delayedItems = ongoingItems.filter((item) => {
        const elapsed = today.getTime() - new Date(item.updatedAt).getTime();
        return elapsed / 86_400_000 > 12;
    });
    const syllabusStatistics = syllabusStatisticsQuery.data;
    const exams = examsQuery.data || [];
    const upcomingExams = exams.filter((exam) => new Date(exam.examDate).getTime() >= today.getTime()).length;
    const completedExams = exams.length - upcomingExams;

    const missingStudentLevels = useMemo(() => {
        if (!isWeekend || !dashboardModel.capabilities.markStudentAttendance) return [];
        const marked = new Set(
            (studentAttendanceQuery.data?.attendance || []).flatMap((record) =>
                resolveSemesterLevelId(record.enrollment)
                    ? [resolveSemesterLevelId(record.enrollment)!]
                    : [],
            ),
        );
        return populatedSemesterLevels.filter((level) => !marked.has(level.id));
    }, [dashboardModel.capabilities.markStudentAttendance, isWeekend, populatedSemesterLevels, resolveSemesterLevelId, studentAttendanceQuery.data]);

    const missingStaffCount = useMemo(() => {
        if (!isWeekend || !dashboardModel.capabilities.markStaffAttendance) return 0;
        const marked = new Set((staffAttendanceQuery.data?.attendances || []).map((record) => record.userId));
        return staff.filter((person) => !marked.has(person.id)).length;
    }, [dashboardModel.capabilities.markStaffAttendance, isWeekend, staff, staffAttendanceQuery.data]);

    const birthdays = useMemo(() => {
        const month = today.getMonth();
        const date = today.getDate();
        const hasBirthday = (dob?: string | null) => {
            if (!dob) return false;
            const value = new Date(dob);
            return !Number.isNaN(value.getTime()) && value.getMonth() === month && value.getDate() === date;
        };
        const people: Array<Student | ContextStaffUser> = [];
        if (dashboardModel.visibility.students) people.push(...students.filter((student) => hasBirthday(student.dob)));
        if (dashboardModel.visibility.staff) people.push(...staff.filter((person) => hasBirthday(person.dob)));
        return people;
    }, [dashboardModel.visibility.staff, dashboardModel.visibility.students, staff, students, today]);

    const actionHref = (label: string) =>
        dashboardModel.actionGroups.flatMap((group) => group.actions).find((action) => action.label === label)?.href;
    const attentionItems = [
        !hasCompleteBankDetails(user)
            ? {
                title: "Complete your bank details",
                detail: "Add all payment details so your remuneration can be processed.",
                href: "/profile#payment",
                actionLabel: "Complete bank details",
            }
            : null,
        missingStudentLevels.length > 0
            ? {
                title: "Student attendance is pending",
                detail: missingStudentLevels.map((level) => levelName(level)).join(", "),
                href: actionHref("Mark student attendance"),
            }
            : null,
        missingStaffCount > 0
            ? {
                title: "Staff attendance is pending",
                detail: `${missingStaffCount} team member${missingStaffCount === 1 ? "" : "s"} still need a record.`,
                href: actionHref("Mark staff attendance"),
            }
            : null,
        dashboardModel.visibility.curriculum && delayedItems.length > 0
            ? {
                title: "Curriculum progress needs review",
                detail: `${delayedItems.length} ongoing item${delayedItems.length === 1 ? "" : "s"} have not been updated recently.`,
                href: actionHref("Curriculum"),
            }
            : null,
    ].filter((item): item is AttentionItem => Boolean(item?.href));

    const isLoading =
        semesterQuery.isLoading ||
        centerQuery.isLoading ||
        (dashboardModel.visibility.students && studentsQuery.isLoading) ||
        (dashboardModel.visibility.staff && staffQuery.isLoading) ||
        (dashboardModel.visibility.curriculum && (syllabiQuery.isLoading || syllabusStatisticsQuery.isLoading)) ||
        (dashboardModel.visibility.exams && examsQuery.isLoading);
    const error =
        semesterQuery.error ||
        centerQuery.error ||
        (dashboardModel.visibility.students ? studentsQuery.error : null) ||
        (dashboardModel.visibility.staff ? staffQuery.error : null) ||
        (dashboardModel.visibility.curriculum ? syllabiQuery.error || syllabusStatisticsQuery.error : null) ||
        (dashboardModel.visibility.exams ? examsQuery.error : null);

    const retryDashboard = () =>
        Promise.all([
            semesterQuery.refetch(),
            centerQuery.refetch(),
            ...(dashboardModel.visibility.students ? [studentsQuery.refetch()] : []),
            ...(dashboardModel.visibility.staff ? [staffQuery.refetch()] : []),
            ...(dashboardModel.visibility.curriculum ? [syllabiQuery.refetch(), syllabusStatisticsQuery.refetch()] : []),
            ...(dashboardModel.visibility.exams ? [examsQuery.refetch()] : []),
        ]);

    if (isLoading) return <DashboardSkeleton />;

    if (error || !semesterQuery.data || !centerQuery.data) {
        return (
            <WorkspacePage>
                <div className="flex min-h-[55dvh] items-center justify-center">
                    <div className="w-full max-w-lg rounded-lg border border-border bg-card p-7 text-center shadow-sm">
                        <AlertTriangle className="mx-auto h-6 w-6 text-destructive" aria-hidden="true" />
                        <h1 className="mt-4 text-xl font-semibold text-foreground">Dashboard could not be loaded</h1>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Check your connection and try loading the semester again.
                        </p>
                        <button
                            type="button"
                            onClick={() => void retryDashboard()}
                            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            Try again
                        </button>
                    </div>
                </div>
            </WorkspacePage>
        );
    }

    const semester = semesterQuery.data;
    const center = centerQuery.data;
    const dashboardActions = dashboardModel.actionGroups.flatMap((group) => group.actions);

    return (
        <WorkspacePage className="space-y-6">
            <WorkspacePageHeader
                title={semester.name}
                badge={dashboardModel.roleLabel}
                description={<>{center.name} · {formatDate(semester.startDate)} – {formatDate(semester.endDate)}{assignedSemesterLevel ? ` · ${levelName(assignedSemesterLevel)}` : ""}</>}
            />

            {attentionItems.length === 0 ? (
                <div aria-label="Mobile semester status" className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm sm:hidden">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">All caught up</p>
                        <p className="truncate text-xs text-muted-foreground">No immediate follow-up in your workspace.</p>
                    </div>
                </div>
            ) : (
                <AttentionSection
                    items={attentionItems}
                    headingId="mobile-attention-title"
                    className="sm:hidden"
                />
            )}

            {dashboardActions.length > 0 && (
                <nav aria-label="Mobile semester tools" className="sm:hidden">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-foreground">Quick tools</h2>
                        <span className="text-xs text-muted-foreground">{dashboardActions.length} available</span>
                    </div>
                    <div className="space-y-4">
                        {dashboardModel.actionGroups.map((group) => (
                            <section key={group.label} aria-label={`Mobile tool group: ${group.label}`}>
                                <div className="mb-2 flex items-center gap-2">
                                    <h3 className="shrink-0 text-xs font-semibold text-muted-foreground">{group.label}</h3>
                                    <span className="h-px flex-1 bg-border" aria-hidden="true" />
                                </div>
                                <div className="grid grid-cols-3 gap-2 min-[380px]:grid-cols-4">
                                    {group.actions.map((action) => (
                                        <DashboardAction key={action.href} action={action} variant="tile" />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </nav>
            )}

            <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
                <div className="space-y-6 lg:col-span-8">
                    <AttentionSection
                        items={attentionItems}
                        headingId="attention-title"
                        className="hidden sm:block"
                    />

                    {dashboardModel.actionGroups.length > 0 && (
                        <section aria-labelledby="actions-title" className="hidden rounded-lg border border-border bg-card p-5 shadow-sm sm:block sm:p-6">
                            <h2 id="actions-title" className="text-xl font-semibold text-foreground">Quick actions</h2>
                            <div className="mt-5 space-y-6">
                                {dashboardModel.actionGroups.map((group) => (
                                    <div key={group.label}>
                                        <h3 className="mb-2 text-sm font-semibold text-foreground">{group.label}</h3>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {group.actions.map((action) => <DashboardAction key={action.href} action={action} />)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {dashboardModel.visibility.curriculum && (
                        <section aria-labelledby="learning-title" className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 id="learning-title" className="text-xl font-semibold text-foreground">Ongoing learning</h2>
                                </div>
                                <BookOpenCheck className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                            </div>
                            {ongoingItems.length ? (
                                <div className="mt-4 divide-y divide-border">
                                    {ongoingItems.slice(0, 5).map((item) => (
                                        <div key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-1 last:pb-0">
                                            <p className="min-w-0 truncate text-sm font-medium text-foreground">{item.title}</p>
                                            <span className="shrink-0 text-xs text-muted-foreground">{formatDate(item.updatedAt)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-4 text-sm leading-6 text-muted-foreground">No ongoing curriculum items in your visible scope.</p>
                            )}
                        </section>
                    )}
                </div>

                <aside className="space-y-6 lg:col-span-4">
                    <section aria-labelledby="snapshot-title" className="rounded-lg border border-border bg-card px-5 shadow-sm sm:px-6">
                        <div className="border-b border-border py-5">
                            <h2 id="snapshot-title" className="text-xl font-semibold text-foreground">Semester snapshot</h2>
                        </div>
                        {dashboardModel.visibility.students && <DashboardMetric label="Students" value={students.length} detail={assignedSemesterLevel ? levelName(assignedSemesterLevel) : `${populatedSemesterLevels.length} active levels`} icon={GraduationCap} />}
                        {dashboardModel.visibility.staff && <DashboardMetric label="Educators" value={staffCounts.educators} detail={`${staffCounts.managers} center manager${staffCounts.managers === 1 ? "" : "s"}`} icon={Users} />}
                        {dashboardModel.visibility.curriculum && <DashboardMetric label="Curriculum progress" value={`${Math.round(syllabusStatistics?.completionPercentage || 0)}%`} detail={`${syllabusStatistics?.statusBreakdown.completed || 0} of ${syllabusStatistics?.totalTopics || 0} topics completed`} icon={BookOpenCheck} />}
                        {dashboardModel.visibility.exams && <DashboardMetric label="Active exams" value={exams.length} detail={`${upcomingExams} upcoming · ${completedExams} held`} icon={Layers3} />}
                    </section>

                    {dashboardModel.visibility.students && populatedSemesterLevels.length > 0 && (
                        <section aria-labelledby="levels-title" className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
                            <h2 id="levels-title" className="text-base font-semibold text-foreground">Students by level</h2>
                            <div className="mt-4 space-y-3">
                                {populatedSemesterLevels.map((level) => {
                                    const count = studentsByLevel[level.id];
                                    const percentage = students.length ? Math.round((count / students.length) * 100) : 0;
                                    return (
                                        <div key={level.id}>
                                            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                                                <span className="text-muted-foreground">{levelName(level)}</span>
                                                <span className="font-semibold tabular-nums text-foreground">{count}</span>
                                            </div>
                                            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                                                <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {birthdays.length > 0 && (
                        <section aria-labelledby="birthday-title" className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
                            <PartyPopper className="h-5 w-5 text-primary" aria-hidden="true" />
                            <h2 id="birthday-title" className="mt-3 text-base font-semibold text-foreground">Celebrating today</h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{birthdays.map((person) => person.name).join(", ")}</p>
                        </section>
                    )}
                </aside>
            </div>

            {dashboardModel.visibility.students && students.some((student) => student.profileImageUrl && student.futureProfessionImageUrl) && (
                <section aria-labelledby="future-title" className="border-t border-border pt-7">
                    <div className="mb-4">
                        <h2 id="future-title" className="text-xl font-semibold text-foreground">Future profession showcase</h2>
                    </div>
                    <FutureProfessionCarousel students={students} autoPlayInterval={6000} />
                </section>
            )}
        </WorkspacePage>
    );
}

function DashboardSkeleton() {
    return (
        <div className="mx-auto w-full max-w-6xl animate-pulse space-y-6 py-2 motion-reduce:animate-none" aria-label="Loading dashboard" aria-busy="true">
            <div className="space-y-3 border-b border-border pb-6">
                <div className="h-4 w-36 rounded bg-muted" />
                <div className="h-10 w-72 max-w-full rounded bg-muted" />
                <div className="h-5 w-80 max-w-full rounded bg-muted" />
            </div>
            <div className="grid gap-6 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-8">
                    <div className="h-48 rounded-lg border border-border bg-card" />
                    <div className="h-80 rounded-lg border border-border bg-card" />
                </div>
                <div className="h-96 rounded-lg border border-border bg-card lg:col-span-4" />
            </div>
        </div>
    );
}

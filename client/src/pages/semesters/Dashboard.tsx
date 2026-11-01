import { useCallback, useMemo } from "react";
import { PartyPopper } from "lucide-react";
import { useParams } from "react-router-dom";

import { DashboardAction } from "@/components/dashboard/DashboardAction";
import { PageTitle } from "@/components/navigation/PageTitle";
import { SemesterLevelsPanel } from "@/components/semesters/SemesterLevelsPanel";
import FutureProfessionCarousel from "@/components/FutureProfessionCarousel";
import { ErrorState, ListPageSkeleton } from "@/components/workspace/PageState";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";
import { useAuth } from "@/hooks/useAuth";
import { useSemester } from "@/hooks/useSemesterQueries";
import { useStudentsBySemester } from "@/hooks/useStudentQueries";
import { useSyllabi, useSyllabusTopics } from "@/hooks/useSyllabusQueries";
import { useContextStaff } from "@/hooks/useUserQueries";
import { buildDashboardModel } from "@/lib/dashboard";
import { formatMoment, indiaToday } from "@/lib/dates";
import { sortByJourneyOrder } from "@/lib/levels";
import type { ContextStaffUser, Student } from "@/types/api";

export default function Dashboard() {
    const { projectId = "", centerId = "", semesterId = "" } = useParams();
    const { user } = useAuth();
    const context = { projectId, centerId, semesterId };
    const dashboardModel = buildDashboardModel(user, context);
    // Birthdays follow the day in India, wherever the viewer is.
    const todayString = useMemo(() => indiaToday(), []);

    const semesterQuery = useSemester(semesterId);
    const studentsQuery = useStudentsBySemester(semesterId, {
        enabled: dashboardModel.visibility.students,
    });
    const staffQuery = useContextStaff({
        ...context,
        enabled: dashboardModel.visibility.staff,
    });
    const syllabiQuery = useSyllabi({
        ...context,
        semesterLevelId: dashboardModel.assignedSemesterLevelId,
        isActive: true,
        enabled: dashboardModel.visibility.curriculum,
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
    // Topics are only meaningful for one syllabus; with several levels in view
    // the Levels panel shows each one's progress instead.
    const activeSyllabus = visibleSyllabi.length === 1 ? visibleSyllabi[0] : undefined;
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

    const staff = useMemo(() => staffQuery.data || [], [staffQuery.data]);

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
    const birthdays = useMemo(() => {
        const monthDay = todayString.slice(5, 10);
        const hasBirthday = (dob?: string | null) => Boolean(dob) && dob!.slice(5, 10) === monthDay;
        const people: Array<Student | ContextStaffUser> = [];
        if (dashboardModel.visibility.students) people.push(...students.filter((student) => hasBirthday(student.dob)));
        if (dashboardModel.visibility.staff) people.push(...staff.filter((person) => hasBirthday(person.dob)));
        return people;
    }, [dashboardModel.visibility.staff, dashboardModel.visibility.students, staff, students, todayString]);

    const isLoading =
        semesterQuery.isLoading ||
        (dashboardModel.visibility.students && studentsQuery.isLoading) ||
        (dashboardModel.visibility.staff && staffQuery.isLoading) ||
        (dashboardModel.visibility.curriculum && syllabiQuery.isLoading);
    const error =
        semesterQuery.error ||
        (dashboardModel.visibility.students ? studentsQuery.error : null) ||
        (dashboardModel.visibility.staff ? staffQuery.error : null) ||
        (dashboardModel.visibility.curriculum ? syllabiQuery.error : null);

    const retryDashboard = () =>
        Promise.all([
            semesterQuery.refetch(),
            ...(dashboardModel.visibility.students ? [studentsQuery.refetch()] : []),
            ...(dashboardModel.visibility.staff ? [staffQuery.refetch()] : []),
            ...(dashboardModel.visibility.curriculum ? [syllabiQuery.refetch()] : []),
        ]);

    if (isLoading) {
        return (
            <WorkspacePage>
                <ListPageSkeleton label="Loading semester" rows={4} />
            </WorkspacePage>
        );
    }

    if (error || !semesterQuery.data) {
        return (
            <WorkspacePage>
                <ErrorState
                    title="Semester could not be loaded"
                    description="Check your connection and try loading this semester again."
                    onRetry={() => void retryDashboard()}
                    backHref={`/projects/${projectId}/centers/${centerId}/dashboard`}
                    backLabel="Back to centre"
                />
            </WorkspacePage>
        );
    }

    const semester = semesterQuery.data;
    const showShowcase =
        dashboardModel.visibility.students &&
        students.some((student) => student.profileImageUrl && student.futureProfessionImageUrl);

    // Phones read top to bottom: birthdays, tools, then the semester. On
    // desktop the semester (levels, showcase) moves to the side column.
    return (
        <WorkspacePage className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8">
            <PageTitle title={semester.name} />

            <div className="min-w-0 space-y-6">
                {birthdays.length > 0 && (
                    <section aria-label="Birthdays today" className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
                        <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <p className="text-base leading-6 text-foreground">
                            <span className="font-semibold">Birthday today: </span>
                            {birthdays.map((person) => person.name).join(", ")}
                        </p>
                    </section>
                )}

                {dashboardModel.actionGroups.length > 0 && (
                    <nav aria-label="Semester tools" className="space-y-4">
                        {dashboardModel.actionGroups.map((group) => (
                            <section key={group.label} aria-labelledby={`tools-${group.label.toLowerCase()}`}>
                                <h2 id={`tools-${group.label.toLowerCase()}`} className="mb-2 text-sm font-semibold text-muted-foreground">
                                    {group.label}
                                </h2>
                                <div className="grid grid-cols-3 gap-2 min-[380px]:grid-cols-4 sm:grid-cols-5">
                                    {group.actions.map((action) => (
                                        <DashboardAction key={action.href} action={action} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </nav>
                )}

                {dashboardModel.visibility.curriculum && ongoingItems.length > 0 && (
                    <section aria-labelledby="in-progress-title" className="space-y-3">
                        <h2 id="in-progress-title" className="text-lg font-semibold text-foreground">In progress</h2>
                        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                            {ongoingItems.slice(0, 5).map((item) => (
                                <li key={item.id} className="flex min-h-12 items-center justify-between gap-4 px-4 py-3">
                                    <span className="min-w-0 truncate text-base font-medium text-foreground">{item.title}</span>
                                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                                        {formatMoment(item.updatedAt, { dateStyle: "medium" })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>

            <div className="min-w-0 space-y-6">
                {(dashboardModel.visibility.students || dashboardModel.visibility.curriculum) && (
                    <SemesterLevelsPanel
                        projectId={projectId}
                        centerId={centerId}
                        semesterId={semesterId}
                        levels={assignedSemesterLevel ? [assignedSemesterLevel] : semesterLevels}
                        studentsByLevel={dashboardModel.visibility.students ? studentsByLevel : undefined}
                        syllabi={dashboardModel.visibility.curriculum ? visibleSyllabi : undefined}
                        canManage={dashboardModel.capabilities.manageLevels}
                    />
                )}

                {showShowcase && (
                    <section aria-labelledby="future-title" className="space-y-3">
                        <h2 id="future-title" className="text-lg font-semibold text-foreground">Future professions</h2>
                        <FutureProfessionCarousel students={students} autoPlayInterval={6000} />
                    </section>
                )}
            </div>
        </WorkspacePage>
    );
}

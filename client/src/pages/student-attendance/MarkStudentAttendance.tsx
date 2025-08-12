import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Calendar as CalendarIcon, Save as SaveIcon, User as UserIcon } from "lucide-react";
import toast from "react-hot-toast";
import {
    useStudentsBySemester,
    useBulkMarkStudentAttendance,
    useStudentAttendanceRecords,
} from "@/hooks/useStudentAttendanceQueries";
import { useAuth } from "@/hooks/useAuth";
import LoadingButterfly from "@/components/LoadingButterfly";
import { CustomButton } from "@/components/ui/custom-button";
import type { Student, StudentEnrollment } from "@/types/api";
import { getNearestWeekend } from "@/utils/helper";
import { ProfilePicture } from "@/components/ui/profile-picture";

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

    const isCenterManager =
        user?.roleAssignments?.some((ra) => ra.isActive && ra.subRole === "CENTER_MANAGER") || false;
    const isAdmin = user?.role === "ADMIN";
    const isPrivileged = isCenterManager || isAdmin;

    const educatorLevels = useMemo(() => {
        const levels = (user?.roleAssignments || [])
            .filter(
                (ra) =>
                    ra.isActive &&
                    ra.subRole === "EDUCATOR" &&
                    (!!ra.level) &&
                    (!ra.semesterId || ra.semesterId === semesterId)
            )
            .map((ra) => ra.level!) as string[];
        return Array.from(new Set(levels));
    }, [user?.roleAssignments, semesterId]);

    const [selectedDate, setSelectedDate] = useState<string>(getNearestWeekend());
    const [isHolidayDay, setIsHolidayDay] = useState(false);
    const [holidayReason, setHolidayReason] = useState("");
    const [entries, setEntries] = useState<Record<string, StudentAttendanceEntry>>({});

    // 1) Load students for the semester
    const {
        data: studentsData,
        isLoading: isLoadingStudents,
        error: studentsError,
    } = useStudentsBySemester(semesterId!);

    // 2) Load attendance for the selected date
    const { data: attendanceData, isLoading: isLoadingAttendance } = useStudentAttendanceRecords({
        date: selectedDate,
        projectId: projectId!,
        centerId: centerId!,
        semesterId: semesterId!,
        refetchIntervalMs: 5000,
        enabled: true,
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

        if (isPrivileged) return allStudents;
        if (!educatorLevels.length) return [];
        return allStudents.filter((s) => {
            const active = s.enrollments?.find((en) => en.semesterId === semesterId && en.isActive);
            if (!active) return false;
            return educatorLevels.includes(active.level);
        });
    }, [studentsData, isPrivileged, educatorLevels, semesterId]);

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
        for (const rec of existing) {
            if (!initial[rec.studentId]) continue; // skip students not visible to this user
            if (rec.status === "HOLIDAY") dayHoliday = true;
            if (rec.status === "PRESENT" || rec.status === "ABSENT" || rec.status === "HOLIDAY") {
                initial[rec.studentId].status = rec.status as StudentAttendanceStatus;
            }
        }

        setEntries(initial);
        setIsHolidayDay(dayHoliday);
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

    const bulkMutation = useBulkMarkStudentAttendance();

    const handleSave = async () => {
        const list = Object.values(entries);
        if (!list.length) {
            toast.error("No students to save.");
            return;
        }

        const overall: "PRESENT" | "ABSENT" | "HOLIDAY" = isHolidayDay ? "HOLIDAY" : "PRESENT";
        if (isHolidayDay && !isPrivileged) {
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

    if (isLoadingStudents || isLoadingAttendance) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <LoadingButterfly size="md" />
            </div>
        );
    }

    if (studentsError) {
        return (
            <div className="text-center py-12">
                <div className="text-red-600 text-lg font-medium mb-2">Failed to load students</div>
                <CustomButton onClick={() => window.location.reload()}>Reload</CustomButton>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mark Student Attendance</h1>
                    <p className="text-xs text-gray-600">Check for present students, leave unchecked for absent.</p>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    <div className="bg-white rounded border p-3">
                        <label className="block text-xs text-gray-600 mb-1">
                            <CalendarIcon className="inline w-3 h-3 mr-1" /> Date
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            disabled={!isPrivileged}
                            className={`border rounded px-2 py-1 text-sm ${!isPrivileged ? "bg-gray-100 cursor-not-allowed" : ""}`}
                        />
                    </div>
                    <CustomButton
                        onClick={handleSave}
                        isLoading={bulkMutation.isPending}
                        loadingMessage="Saving..."
                        className="h-9 bg-blue-600 hover:bg-blue-700"
                        disabled={!visibleStudents?.length || (isHolidayDay && !holidayReason.trim())}
                    >
                        <SaveIcon className="w-4 h-4 mr-2" /> Save Attendance
                    </CustomButton>
                </div>
            </div>

            {isPrivileged && (
                <div className="bg-white rounded border p-3 flex-col items-center ">
                    <label className="text-sm text-gray-800 flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={isHolidayDay}
                            onChange={(e) => onToggleHoliday(e.target.checked)}
                        />
                        Mark entire day as holiday
                    </label>
                    {isHolidayDay && (
                        <div className="w-full mt-3">
                            <input
                                type="text"
                                placeholder="Holiday reason"
                                value={holidayReason}
                                onChange={(e) => setHolidayReason(e.target.value)}
                                required
                                className={`w-full border rounded px-2 py-1 text-sm flex-1 ${isHolidayDay && !holidayReason.trim()
                                    ? "border-red-500 focus:ring-red-500"
                                    : ""
                                    }`}
                            />
                            {isHolidayDay && !holidayReason.trim() && (
                                <p className="text-xs text-red-600 mt-1">Reason is required for holiday.</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="bg-white rounded border">
                {!visibleStudents.length ? (
                    <div className="text-center py-12">
                        <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <div className="text-gray-700 font-medium">No students found</div>
                        <div className="text-xs text-gray-500">No students available for your view.</div>
                    </div>
                ) : (
                    <ul className="divide-y">
                        {visibleStudents
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((s) => {
                                const active = s.enrollments?.find((en) => en.semesterId === semesterId && en.isActive);
                                const entry = entries[s.id];
                                const checked = entry?.status === "PRESENT" || entry?.status === "HOLIDAY";
                                const labelText = isHolidayDay ? "Holiday" : checked ? "Present" : "Absent";
                                return (
                                    <li key={s.id} className="px-3 py-2 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <ProfilePicture imageUrl={s.profileImageUrl} name={s.name} size="lg" />
                                            <div>
                                                <div className="text-sm text-gray-900">{s.name}</div>
                                                <div className="text-[11px] text-gray-500">Level: {active?.level?.replace("_", " ") || "N/A"}</div>
                                            </div>
                                        </div>
                                        <label className="flex items-center gap-2 text-sm text-gray-800">
                                            <input
                                                type="checkbox"
                                                checked={!!checked}
                                                disabled={isHolidayDay}
                                                onChange={(e) => togglePresent(s.id, e.target.checked)}
                                            />
                                            {labelText}
                                        </label>
                                    </li>
                                );
                            })}
                    </ul>
                )}
            </div>

            <CustomButton
                onClick={handleSave}
                isLoading={bulkMutation.isPending}
                loadingMessage="Saving..."
                className="w-full h-10 bg-blue-600 hover:bg-blue-700"
                disabled={!visibleStudents?.length || (isHolidayDay && !holidayReason.trim())}
            >
                <SaveIcon className="w-4 h-4 mr-2" /> Save Attendance
            </CustomButton>
        </div>
    );
};

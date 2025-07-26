import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarIcon, UserIcon, CheckIcon, XIcon, SaveIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useStudentsBySemester, useBulkMarkStudentAttendance, useStudentAttendanceRecords } from "@/hooks/useStudentAttendanceQueries";
import LoadingButterfly from "@/components/LoadingButterfly";
import { CustomButton } from "@/components/ui/custom-button";
import type { Student, StudentEnrollment } from "@/types/api";

type StudentAttendanceStatus = "PRESENT" | "ABSENT" | "HOLIDAY";

interface StudentAttendanceEntry {
    studentId: string;
    enrollmentId: string;
    status: StudentAttendanceStatus;
    notes?: string;
}

interface StudentWithEnrollment extends Student {
    enrollments: StudentEnrollment[];
}

export const MarkStudentAttendance = () => {
    const { projectId, centerId, semesterId } = useParams();
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [attendanceEntries, setAttendanceEntries] = useState<Record<string, StudentAttendanceEntry>>({});
    const [isHoliday, setIsHoliday] = useState<boolean>(false);
    const [holidayReason, setHolidayReason] = useState<string>("");

    const { data: studentsResponse, isLoading, error } = useStudentsBySemester(semesterId!);

    // Fetch existing attendance records for the selected date
    const { data: existingAttendance, isLoading: isLoadingAttendance } = useStudentAttendanceRecords({
        date: selectedDate,
        projectId: projectId!,
        centerId: centerId!,
        semesterId: semesterId!,
    });

    const bulkMarkAttendanceMutation = useBulkMarkStudentAttendance();

    // Get students with enrollments from the API response
    const students = useMemo(() => {
        return studentsResponse?.students || [];
    }, [studentsResponse?.students]);

    // Initialize attendance entries when students load
    useEffect(() => {
        if (students.length > 0) {
            const initialEntries: Record<string, StudentAttendanceEntry> = {};

            // Create initial entries for all students
            students.forEach((student: StudentWithEnrollment) => {
                // Find the active enrollment for this semester
                const activeEnrollment = student.enrollments?.find(
                    (enrollment: StudentEnrollment) => enrollment.semesterId === semesterId && enrollment.isActive
                );

                if (activeEnrollment) {
                    initialEntries[student.id] = {
                        studentId: student.id,
                        enrollmentId: activeEnrollment.id,
                        status: "ABSENT", // Default to ABSENT instead of PRESENT
                    };
                }
            });

            // If we have existing attendance data, update the entries and holiday state
            if (existingAttendance?.attendance && existingAttendance.attendance.length > 0) {
                const existingByStudentId = existingAttendance.attendance.reduce((acc, record) => {
                    acc[record.studentId] = record;
                    return acc;
                }, {} as Record<string, typeof existingAttendance.attendance[0]>);

                // Update entries with existing data
                students.forEach((student: StudentWithEnrollment) => {
                    const existingRecord = existingByStudentId[student.id];
                    if (existingRecord && initialEntries[student.id]) {
                        initialEntries[student.id] = {
                            studentId: student.id,
                            enrollmentId: initialEntries[student.id].enrollmentId,
                            status: existingRecord.status as StudentAttendanceStatus,
                            notes: existingRecord.notes || undefined,
                        };
                    }
                });

                // Check for existing holiday records and update holiday state
                const hasHolidayRecord = existingAttendance.attendance.some(record => record.status === "HOLIDAY");
                if (hasHolidayRecord) {
                    setIsHoliday(true);
                    const holidayRecord = existingAttendance.attendance.find(record => record.status === "HOLIDAY");
                    if (holidayRecord?.holidayReason) {
                        setHolidayReason(holidayRecord.holidayReason);
                    }
                }
            } else {
                // No existing data, set default holiday state
                setIsHoliday(false);
                setHolidayReason("");
            }

            setAttendanceEntries(initialEntries);
        }
    }, [students, existingAttendance, semesterId]); // Removed isHoliday from dependencies to prevent loops

    // Update all students when holiday status changes (only for new entries, not existing data)
    useEffect(() => {
        if (students.length > 0 && !existingAttendance?.attendance?.length) {
            // Only update when there's no existing attendance data (i.e., new date)
            setAttendanceEntries(prev => {
                const updated = { ...prev };
                students.forEach((student: StudentWithEnrollment) => {
                    if (updated[student.id]) {
                        updated[student.id] = {
                            ...updated[student.id],
                            status: isHoliday ? "HOLIDAY" : "ABSENT", // Default to ABSENT instead of PRESENT
                        };
                    }
                });
                return updated;
            });
        }
    }, [isHoliday, students, existingAttendance?.attendance?.length]);

    // Reset attendance entries when date changes
    useEffect(() => {
        if (students.length > 0) {
            // Clear current entries when date changes
            setAttendanceEntries({});
            setIsHoliday(false);
            setHolidayReason("");
        }
    }, [selectedDate, students.length]);

    const toggleAttendanceStatus = (studentId: string, isPresent: boolean) => {
        if (isHoliday) return; // Prevent changing from holiday when holiday mode is on

        const status: StudentAttendanceStatus = isPresent ? "PRESENT" : "ABSENT";

        setAttendanceEntries(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                status,
            }
        }));
    };

    const updateAttendanceNotes = (studentId: string, notes: string) => {
        setAttendanceEntries(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                notes: notes || undefined,
            }
        }));
    };

    const handleSubmitAttendance = async () => {
        const studentAttendances = Object.values(attendanceEntries).map(entry => ({
            studentId: entry.studentId,
            enrollmentId: entry.enrollmentId,
            status: entry.status,
            notes: entry.notes,
        }));

        // Determine the overall status for the day
        const hasHolidayStudents = studentAttendances.some(s => s.status === "HOLIDAY");
        const overallStatus = hasHolidayStudents ? "HOLIDAY" : "PRESENT";

        const toastId = toast.loading("Saving student attendance records...");

        try {
            await bulkMarkAttendanceMutation.mutateAsync({
                date: selectedDate,
                status: overallStatus,
                projectId: projectId!,
                centerId: centerId!,
                semesterId: semesterId!,
                studentAttendances,
                ...(isHoliday && { holidayReason }),
            });

            toast.success(
                `Student attendance marked successfully for ${studentAttendances.length} students on ${selectedDate}!`,
                { id: toastId, duration: 4000 }
            );
        } catch (error) {
            console.error('Error marking student attendance:', error);
            toast.error(
                'Failed to mark student attendance. Please try again.',
                { id: toastId, duration: 5000 }
            );
        }
    };

    const getStatusIcon = (status: StudentAttendanceStatus) => {
        switch (status) {
            case 'PRESENT':
                return <CheckIcon className="w-5 h-5 text-green-600" />;
            case 'ABSENT':
                return <XIcon className="w-5 h-5 text-red-600" />;
            case 'HOLIDAY':
                return <CalendarIcon className="w-5 h-5 text-blue-600" />;
            default:
                return <UserIcon className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusBadgeClass = (status: StudentAttendanceStatus) => {
        switch (status) {
            case 'PRESENT':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'ABSENT':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'HOLIDAY':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (isLoading || isLoadingAttendance) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingButterfly size="lg" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-red-600 text-lg font-medium mb-4">
                    Failed to load students
                </div>
                <p className="text-gray-600 mb-6">
                    {error instanceof Error ? error.message : 'An error occurred'}
                </p>
                <CustomButton onClick={() => window.location.reload()}>
                    Try Again
                </CustomButton>
            </div>
        );
    }

    return (
        <div className="p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-6xl mx-auto"
            >
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Mark Student Attendance
                    </h1>
                    <p className="text-gray-600">
                        Mark attendance for students in this semester
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        Check the box for present students. Only Present, Absent, and Holiday statuses are available.
                    </p>
                </div>

                {/* Important Notes */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                        <CalendarIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="ml-3">
                            <h3 className="text-sm font-semibold text-blue-800 mb-2">
                                Student Attendance Instructions
                            </h3>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li className="flex items-start">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 mr-2 flex-shrink-0"></span>
                                    <span><strong>Only mark students who are present today</strong> - Simply check the box for attending students</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 mr-2 flex-shrink-0"></span>
                                    <span><strong>Save your attendance after marking</strong> - Don't forget to click "Save Attendance" when done</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 mr-2 flex-shrink-0"></span>
                                    <span>Use the <strong>holiday option</strong> to mark special non-class days for all students</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 mr-2 flex-shrink-0"></span>
                                    <span>Students can only be marked as <strong>Present, Absent, or Holiday</strong></span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Date Filter and Controls */}
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <CalendarIcon className="w-4 h-4 inline mr-1" />
                                Date
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                title="Select date to mark attendance"
                            />
                        </div>

                        {/* Global Holiday Control */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mark Holiday for All Students
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={isHoliday}
                                        onChange={(e) => setIsHoliday(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Mark as Holiday</span>
                                </label>
                                {isHoliday && (
                                    <input
                                        type="text"
                                        value={holidayReason}
                                        onChange={(e) => setHolidayReason(e.target.value)}
                                        placeholder="Holiday reason..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                )}
                            </div>
                        </div>

                        <div>
                            <CustomButton
                                onClick={handleSubmitAttendance}
                                isLoading={bulkMarkAttendanceMutation.isPending}
                                loadingMessage="Saving attendance..."
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                disabled={!students || students.length === 0}
                            >
                                <SaveIcon className="w-4 h-4 mr-2" />
                                Save Student Attendance
                            </CustomButton>
                        </div>
                    </div>
                </div>

                {/* Attendance Form */}
                <div className="bg-white rounded-lg shadow-sm border">
                    {!students || students.length === 0 ? (
                        <div className="text-center py-12">
                            <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No students found
                            </h3>
                            <p className="text-gray-600 mb-2">
                                No students are enrolled in this semester.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {students.map((student: StudentWithEnrollment) => {
                                const entry = attendanceEntries[student.id];
                                const activeEnrollment = student.enrollments?.find(
                                    (enrollment: StudentEnrollment) => enrollment.semesterId === semesterId && enrollment.isActive
                                );

                                return (
                                    <motion.div
                                        key={student.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="p-4 md:p-6"
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
                                            {/* Student Info */}
                                            <div className="flex items-center space-x-4 flex-1">
                                                <div className="flex-shrink-0 h-10 w-10 md:h-12 md:w-12">
                                                    {student.profileImageUrl ? (
                                                        <img
                                                            src={student.profileImageUrl}
                                                            alt={student.name}
                                                            className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-base md:text-lg font-medium text-gray-900 truncate">
                                                        {student.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500 truncate">
                                                        Student ID: {student.id}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Level: {activeEnrollment?.level?.replace('_', ' ') || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Attendance Controls */}
                                            <div className="flex-shrink-0 w-full lg:w-80 space-y-4">
                                                {/* Present/Absent Checkbox */}
                                                <div>
                                                    <label className="flex items-center space-x-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={entry?.status === "PRESENT" || entry?.status === "HOLIDAY"}
                                                            onChange={(e) => toggleAttendanceStatus(student.id, e.target.checked)}
                                                            disabled={isHoliday}
                                                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                                        />
                                                        <div className="flex-1">
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {isHoliday ? "Holiday" : "Present"}
                                                            </span>
                                                            <div className="text-xs text-gray-500">
                                                                {isHoliday
                                                                    ? "Marked as holiday for all students"
                                                                    : entry?.status === "PRESENT"
                                                                        ? "Student is present"
                                                                        : "Student is absent"
                                                                }
                                                            </div>
                                                        </div>
                                                        {/* Status Badge */}
                                                        <div className="flex items-center">
                                                            {getStatusIcon(entry?.status || "ABSENT")}
                                                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeClass(entry?.status || "ABSENT")}`}>
                                                                {(entry?.status || "ABSENT").toLowerCase()}
                                                            </span>
                                                        </div>
                                                    </label>
                                                </div>

                                                {/* Notes */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Notes (Optional)
                                                    </label>
                                                    <textarea
                                                        value={entry?.notes || ''}
                                                        onChange={(e) => updateAttendanceNotes(student.id, e.target.value)}
                                                        placeholder="Add any notes..."
                                                        rows={2}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

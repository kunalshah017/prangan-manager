import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarIcon, UserIcon, CheckIcon, XIcon, SaveIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useStudentsBySemester, useBulkMarkStudentAttendance, useStudentAttendanceRecords } from "@/hooks/useStudentAttendanceQueries";
import LoadingButterfly from "@/components/LoadingButterfly";
import { CustomButton } from "@/components/ui/custom-button";
import { ProfilePicture } from "@/components/ui";
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
        } else {
            // Clear entries when no students or when date changes
            setAttendanceEntries({});
            setIsHoliday(false);
            setHolidayReason("");
        }
    }, [students, existingAttendance, semesterId, selectedDate]); // Added selectedDate to handle date changes

    // Update all students when holiday status changes
    useEffect(() => {
        if (students.length > 0 && Object.keys(attendanceEntries).length > 0) {
            setAttendanceEntries(prev => {
                const updated = { ...prev };
                students.forEach((student: StudentWithEnrollment) => {
                    if (updated[student.id]) {
                        updated[student.id] = {
                            ...updated[student.id],
                            status: isHoliday ? "HOLIDAY" : "ABSENT", // When holiday is off, reset to ABSENT
                        };
                    }
                });
                return updated;
            });
        }
    }, [isHoliday]); // Removed other dependencies to make it trigger only on holiday change

    // Reset attendance entries when date changes - now handled in the main useEffect above

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

        // Safeguard: Don't submit if no attendance entries
        if (studentAttendances.length === 0) {
            toast.error('No attendance entries to save. Please wait for students to load.');
            return;
        }

        // Check for missing required fields
        const invalidEntries = studentAttendances.filter(entry => !entry.studentId || !entry.enrollmentId);
        if (invalidEntries.length > 0) {
            console.error('Invalid attendance entries:', invalidEntries);
            toast.error('Some attendance entries are missing required data. Please refresh and try again.');
            return;
        }

        // Determine the overall status for the day
        const hasHolidayStudents = studentAttendances.some(s => s.status === "HOLIDAY");
        const overallStatus: "PRESENT" | "ABSENT" | "HOLIDAY" = hasHolidayStudents ? "HOLIDAY" : "PRESENT";

        // Validate holiday reason if students are marked as holiday
        if (hasHolidayStudents && !holidayReason.trim()) {
            toast.error('Please provide a holiday reason when marking students as holiday.');
            return;
        }

        // Prepare the request payload
        const requestPayload = {
            date: selectedDate,
            status: overallStatus,
            projectId: projectId!,
            centerId: centerId!,
            semesterId: semesterId!,
            studentAttendances,
            // Include holiday reason if any student is marked as holiday
            ...(hasHolidayStudents && { holidayReason }),
        };

        console.log('API Request Payload:', requestPayload);

        const toastId = toast.loading("Saving student attendance records...");

        try {
            await bulkMarkAttendanceMutation.mutateAsync(requestPayload);

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
        <div className="p-3 sm:p-4 md:p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-6xl mx-auto"
            >
                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                        Mark Student Attendance
                    </h1>
                    <p className="text-sm text-gray-600">
                        Mark attendance for students in this semester
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Check the box for present students.
                    </p>
                </div>

                {/* Important Notes */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start">
                        <CalendarIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="ml-2">
                            <h3 className="text-xs font-semibold text-blue-800 mb-1">
                                Quick Instructions
                            </h3>
                            <ul className="text-xs text-blue-700 space-y-0.5">
                                <li>• <strong>Check</strong> for present students</li>
                                <li>• <strong>Save</strong> when done</li>
                                <li>• Use <strong>holiday</strong> for special days</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Date Filter and Controls */}
                <div className="bg-white rounded-lg shadow-sm border p-3 mb-4">
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    <CalendarIcon className="w-3 h-3 inline mr-1" />
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Holiday
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={isHoliday}
                                        onChange={(e) => setIsHoliday(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-xs text-gray-700">Mark as Holiday</span>
                                </label>
                                {isHoliday && (
                                    <input
                                        type="text"
                                        value={holidayReason}
                                        onChange={(e) => setHolidayReason(e.target.value)}
                                        placeholder="Holiday reason..."
                                        required
                                        className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                )}
                            </div>
                        </div>

                        <CustomButton
                            onClick={handleSubmitAttendance}
                            isLoading={bulkMarkAttendanceMutation.isPending}
                            loadingMessage="Saving..."
                            className="w-full h-10 bg-blue-600 hover:bg-blue-700"
                            disabled={!students || students.length === 0}
                        >
                            <SaveIcon className="w-4 h-4 mr-2" />
                            Save Attendance
                        </CustomButton>
                    </div>
                </div>

                {/* Holiday Mode Banner */}
                {isHoliday && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center">
                            <CalendarIcon className="w-4 h-4 text-blue-600 mr-2" />
                            <div>
                                <h3 className="text-xs font-semibold text-blue-800">
                                    Holiday Mode Active
                                </h3>
                                <p className="text-xs text-blue-700">
                                    All students marked as holiday{holidayReason ? `: ${holidayReason}` : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

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
                                        className="p-4"
                                    >
                                        <div className="space-y-3">
                                            {/* Student Info - Full Width */}
                                            <div className="flex items-center space-x-3">
                                                <ProfilePicture
                                                    imageUrl={student.profileImageUrl}
                                                    name={student.name}
                                                    size="md"
                                                    colorScheme="blue"
                                                />
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {student.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Level: {activeEnrollment?.level?.replace('_', ' ') || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Attendance Controls */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={entry?.status === "PRESENT" || entry?.status === "HOLIDAY"}
                                                            onChange={(e) => toggleAttendanceStatus(student.id, e.target.checked)}
                                                            disabled={isHoliday}
                                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                                        />
                                                        <span className={`text-xs font-medium ${isHoliday ? 'text-blue-900' : 'text-gray-900'}`}>
                                                            {isHoliday ? "Holiday" : "Present"}
                                                        </span>
                                                    </div>

                                                    {/* Status Badge */}
                                                    <div className="flex items-center space-x-1">
                                                        {getStatusIcon(entry?.status || "ABSENT")}
                                                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadgeClass(entry?.status || "ABSENT")}`}>
                                                            {(entry?.status || "ABSENT").toLowerCase()}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Notes Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const notesSection = document.getElementById(`notes-${student.id}`);
                                                        if (notesSection) {
                                                            notesSection.style.display = notesSection.style.display === 'none' ? 'block' : 'none';
                                                        }
                                                    }}
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    Notes
                                                </button>
                                            </div>

                                            {/* Collapsible Notes Section */}
                                            <div id={`notes-${student.id}`} style={{ display: 'none' }} className="pt-3 border-t border-gray-100">
                                                <textarea
                                                    value={entry?.notes || ''}
                                                    onChange={(e) => updateAttendanceNotes(student.id, e.target.value)}
                                                    placeholder="Add notes..."
                                                    rows={2}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                                />
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

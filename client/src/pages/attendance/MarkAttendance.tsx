import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarIcon, UserIcon, CheckIcon, XIcon, SaveIcon, AlertTriangleIcon, InfoIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useActiveUsers, useBulkMarkAttendance, useAttendanceRecords } from "@/hooks/useAttendanceQueries";
import LoadingButterfly from "@/components/LoadingButterfly";
import { CustomButton } from "@/components/ui/custom-button";

type AttendanceStatus = "PRESENT" | "ABSENT" | "NOT_AVAILABLE" | "HOLIDAY";

interface AttendanceEntry {
    userId: string;
    status: AttendanceStatus;
    notes?: string;
}

export const MarkAttendance = () => {
    const { projectId, centerId, semesterId } = useParams();
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [attendanceEntries, setAttendanceEntries] = useState<Record<string, AttendanceEntry>>({});
    const [isHoliday, setIsHoliday] = useState<boolean>(false);
    const [holidayReason, setHolidayReason] = useState<string>("");

    const { data: activeUsers, isLoading, error } = useActiveUsers(
        selectedDate,
        projectId!,
        centerId!,
        semesterId!
    );

    // Fetch existing attendance records for the selected date
    const { data: existingAttendance, isLoading: isLoadingAttendance } = useAttendanceRecords({
        startDate: selectedDate,
        endDate: selectedDate,
        projectId: projectId!,
        centerId: centerId!,
        semesterId: semesterId!,
    });

    const bulkMarkAttendanceMutation = useBulkMarkAttendance();

    // Check if selected date is a weekend
    const isWeekendDate = (dateString: string) => {
        const date = new Date(dateString);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        return dayOfWeek === 0 || dayOfWeek === 6;
    };

    // Initialize attendance entries when users load
    useEffect(() => {
        if (activeUsers) {
            const initialEntries: Record<string, AttendanceEntry> = {};
            activeUsers.forEach((user) => {
                initialEntries[user.id] = {
                    userId: user.id,
                    status: isHoliday ? "HOLIDAY" : "ABSENT", // Default to ABSENT instead of PRESENT
                };
            });

            // If we have existing attendance data, merge it with initial entries
            if (existingAttendance?.attendances) {
                const existingByUserId = existingAttendance.attendances.reduce((acc, record) => {
                    acc[record.userId] = record;
                    return acc;
                }, {} as Record<string, typeof existingAttendance.attendances[0]>);

                activeUsers.forEach((user) => {
                    const existingRecord = existingByUserId[user.id];
                    if (existingRecord) {
                        initialEntries[user.id] = {
                            userId: user.id,
                            status: existingRecord.status as AttendanceStatus,
                            notes: existingRecord.notes || undefined,
                        };
                    }
                });

                // If there are existing holiday records, set global holiday state
                const hasHolidayRecord = existingAttendance.attendances.some(record => record.status === "HOLIDAY");
                if (hasHolidayRecord) {
                    setIsHoliday(true);
                    const holidayRecord = existingAttendance.attendances.find(record => record.status === "HOLIDAY");
                    if (holidayRecord?.holidayReason) {
                        setHolidayReason(holidayRecord.holidayReason);
                    }
                }
            }

            setAttendanceEntries(initialEntries);
        }
    }, [activeUsers, isHoliday, existingAttendance]);

    // Update all users when holiday status changes (only for new entries, not existing data)
    useEffect(() => {
        if (activeUsers && !existingAttendance?.attendances?.length) {
            setAttendanceEntries(prev => {
                const updated = { ...prev };
                activeUsers.forEach((user) => {
                    if (updated[user.id]) {
                        updated[user.id] = {
                            ...updated[user.id],
                            status: isHoliday ? "HOLIDAY" : "ABSENT", // Default to ABSENT instead of PRESENT
                        };
                    }
                });
                return updated;
            });
        }
    }, [isHoliday, activeUsers, existingAttendance?.attendances?.length]);

    const toggleAttendanceStatus = (userId: string, isPresent: boolean) => {
        if (isHoliday) return; // Prevent changing from holiday when holiday mode is on

        const user = activeUsers?.find(u => u.id === userId);
        const roleAssignment = user?.roleAssignments?.[0];

        if (!roleAssignment) return;

        let status: AttendanceStatus;

        if (isPresent) {
            status = "PRESENT";
        } else {
            // Determine if user should be marked as ABSENT or NOT_AVAILABLE
            const selectedDateObj = new Date(selectedDate);
            const dayOfWeek = selectedDateObj.getDay(); // 0 = Sunday, 6 = Saturday
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isSaturday = dayOfWeek === 6;
            const isSunday = dayOfWeek === 0;

            if (!isWeekend) {
                // Attendance should only be marked on weekends
                status = "NOT_AVAILABLE";
            } else {
                const committedDays = roleAssignment.committedDays;

                if (committedDays === "BOTH") {
                    // User committed to both days, mark as ABSENT if not present
                    status = "ABSENT";
                } else if (committedDays === "SATURDAY" && isSaturday) {
                    // User committed to Saturday and it's Saturday, mark as ABSENT
                    status = "ABSENT";
                } else if (committedDays === "SUNDAY" && isSunday) {
                    // User committed to Sunday and it's Sunday, mark as ABSENT
                    status = "ABSENT";
                } else {
                    // User not committed to this day, mark as NOT_AVAILABLE
                    status = "NOT_AVAILABLE";
                }
            }
        }

        setAttendanceEntries(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                status,
            }
        }));
    };

    const updateAttendanceNotes = (userId: string, notes: string) => {
        setAttendanceEntries(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                notes: notes || undefined,
            }
        }));
    };

    const handleSubmitAttendance = async () => {
        if (!isWeekendDate(selectedDate)) {
            const confirmSubmit = window.confirm(
                "This is not a weekend date. Attendance is typically marked on weekends only. Do you want to continue?"
            );
            if (!confirmSubmit) return;
        }

        const attendances = Object.values(attendanceEntries).map(entry => {
            // Find the user's role assignment
            const user = activeUsers?.find(u => u.id === entry.userId);
            const roleAssignment = user?.roleAssignments?.[0]; // Use the first active role assignment

            if (!roleAssignment) {
                throw new Error(`No role assignment found for user ${entry.userId}`);
            }

            return {
                userId: entry.userId,
                status: entry.status,
                roleAssignmentId: roleAssignment.id,
                notes: entry.notes,
                ...(isHoliday && entry.status === "HOLIDAY" && { holidayReason }),
            };
        });

        const toastId = toast.loading("Saving attendance records...");

        try {
            await bulkMarkAttendanceMutation.mutateAsync({
                date: selectedDate,
                attendances,
                projectId: projectId!,
                centerId: centerId!,
                semesterId: semesterId!,
            });

            toast.success(
                `Attendance marked successfully for ${attendances.length} Educators/Managers on ${selectedDate}!`,
                { id: toastId, duration: 4000 }
            );
        } catch (error) {
            console.error('Error marking attendance:', error);
            toast.error(
                'Failed to mark attendance. Please try again.',
                { id: toastId, duration: 5000 }
            );
        }
    }; const getStatusIcon = (status: AttendanceStatus) => {
        switch (status) {
            case 'PRESENT':
                return <CheckIcon className="w-5 h-5 text-green-600" />;
            case 'ABSENT':
                return <XIcon className="w-5 h-5 text-red-600" />;
            case 'NOT_AVAILABLE':
                return <AlertTriangleIcon className="w-5 h-5 text-yellow-600" />;
            case 'HOLIDAY':
                return <CalendarIcon className="w-5 h-5 text-blue-600" />;
            default:
                return <UserIcon className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusBadgeClass = (status: AttendanceStatus) => {
        switch (status) {
            case 'PRESENT':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'ABSENT':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'NOT_AVAILABLE':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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
                    Failed to load active users
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
                        Mark Attendance
                    </h1>
                    <p className="text-gray-600">
                        Mark attendance for educators and center managers (weekends only)
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        Check the box for present staff. Absent status is automatically determined based on committed days.
                    </p>
                </div>

                {/* Important Notes */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                        <InfoIcon className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="ml-3">
                            <h3 className="text-sm font-semibold text-orange-800 mb-2">
                                Important Instructions
                            </h3>
                            <ul className="text-sm text-orange-700 space-y-1">
                                <li className="flex items-start">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-2 mr-2 flex-shrink-0"></span>
                                    <span><strong>Only mark people who are present today</strong> - Simply check the box for staff who showed up</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-2 mr-2 flex-shrink-0"></span>
                                    <span><strong>Save your attendance after marking</strong> - Don't forget to click "Save Attendance" when done</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-2 mr-2 flex-shrink-0"></span>
                                    <span>Use the <strong>holiday option</strong> to mark special non-working days for everyone</span>
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
                                Date (Weekends Only)
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                title="Select date to mark attendance"
                            />
                            {!isWeekendDate(selectedDate) && (
                                <p className="mt-1 text-xs text-amber-600 flex items-center">
                                    <AlertTriangleIcon className="w-3 h-3 mr-1" />
                                    Attendance is typically marked on weekends (Saturday/Sunday)
                                </p>
                            )}
                        </div>

                        {/* Global Holiday Control */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mark Holiday for All
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={isHoliday}
                                        onChange={(e) => setIsHoliday(e.target.checked)}
                                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Mark as Holiday</span>
                                </label>
                                {isHoliday && (
                                    <input
                                        type="text"
                                        value={holidayReason}
                                        onChange={(e) => setHolidayReason(e.target.value)}
                                        placeholder="Holiday reason..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                                    />
                                )}
                            </div>
                        </div>

                        <div>
                            <CustomButton
                                onClick={handleSubmitAttendance}
                                isLoading={bulkMarkAttendanceMutation.isPending}
                                loadingMessage="Saving attendance..."
                                className="w-full"
                                disabled={!activeUsers || activeUsers.length === 0}
                            >
                                <SaveIcon className="w-4 h-4 mr-2" />
                                Save Attendance
                            </CustomButton>
                        </div>
                    </div>
                </div>

                {/* Attendance Form */}
                <div className="bg-white rounded-lg shadow-sm border">
                    {!activeUsers || activeUsers.length === 0 ? (
                        <div className="text-center py-12">
                            <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No active Educators or Center Managers found
                            </h3>
                            <p className="text-gray-600 mb-2">
                                No educators or center managers are assigned for {selectedDate}
                            </p>
                            {!isWeekendDate(selectedDate) && (
                                <p className="text-sm text-amber-600 flex items-center justify-center">
                                    <AlertTriangleIcon className="w-4 h-4 mr-1" />
                                    Note: Attendance is typically tracked on weekends only
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {activeUsers.map((user) => {
                                const entry = attendanceEntries[user.id];
                                return (
                                    <motion.div
                                        key={user.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="p-4 md:p-6"
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
                                            {/* User Info */}
                                            <div className="flex items-center space-x-4 flex-1">
                                                <div className="flex-shrink-0 h-10 w-10 md:h-12 md:w-12">
                                                    {user.profileImageUrl ? (
                                                        <img
                                                            src={user.profileImageUrl}
                                                            alt={user.name}
                                                            className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-orange-100 flex items-center justify-center">
                                                            <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-base md:text-lg font-medium text-gray-900 truncate">
                                                        {user.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500 truncate">
                                                        {user.email}
                                                    </div>
                                                    <div className="text-sm text-gray-500 capitalize">
                                                        {user.roleAssignments[0]?.subRole?.replace('_', ' ')}
                                                        {user.roleAssignments[0]?.level && ` • Level: ${user.roleAssignments[0].level}`}
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
                                                            onChange={(e) => toggleAttendanceStatus(user.id, e.target.checked)}
                                                            disabled={isHoliday}
                                                            className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 disabled:opacity-50"
                                                        />
                                                        <div className="flex-1">
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {isHoliday ? "Holiday" : "Present"}
                                                            </span>
                                                            <div className="text-xs text-gray-500">
                                                                {isHoliday
                                                                    ? "Marked as holiday for all Educators/Managers"
                                                                    : entry?.status === "PRESENT"
                                                                        ? "Educator/Manager is present"
                                                                        : entry?.status === "ABSENT"
                                                                            ? "Absent from committed day"
                                                                            : "Not available for this day"
                                                                }
                                                            </div>
                                                        </div>
                                                        {/* Status Badge */}
                                                        <div className="flex items-center">
                                                            {getStatusIcon(entry?.status || "ABSENT")}
                                                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeClass(entry?.status || "ABSENT")}`}>
                                                                {entry?.status?.replace('_', ' ').toLowerCase() || 'absent'}
                                                            </span>
                                                        </div>
                                                    </label>
                                                </div>

                                                {/* Committed Days Info */}
                                                <div className="text-xs text-gray-500 bg-gray-50 rounded-md p-2">
                                                    <span className="font-medium">Committed Days:</span>{" "}
                                                    {user.roleAssignments[0]?.committedDays?.replace('_', ' ') || 'Not specified'}
                                                </div>

                                                {/* Notes */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Notes (Optional)
                                                    </label>
                                                    <textarea
                                                        value={entry?.notes || ''}
                                                        onChange={(e) => updateAttendanceNotes(user.id, e.target.value)}
                                                        placeholder="Add any notes..."
                                                        rows={2}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
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

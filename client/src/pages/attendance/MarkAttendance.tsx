import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarIcon, UserIcon, CheckIcon, XIcon, SaveIcon, AlertTriangleIcon, InfoIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useActiveUsers, useBulkMarkAttendance, useAttendanceRecords } from "@/hooks/useAttendanceQueries";
import { useAuth } from "@/hooks/useAuth";
import LoadingButterfly from "@/components/LoadingButterfly";
import { CustomButton } from "@/components/ui/custom-button";
import { ProfilePicture } from "@/components/ui";
import type { AttendanceUser } from "@/types/api";

type AttendanceStatus = "PRESENT" | "ABSENT" | "NOT_AVAILABLE" | "HOLIDAY";

interface AttendanceEntry {
    userId: string;
    status: AttendanceStatus;
    notes?: string;
}

export const MarkAttendance = () => {
    const { projectId, centerId, semesterId } = useParams();
    const { user } = useAuth();

    // Check if the current user is an Educator or Center Manager
    const isEducatorOrCenterManager = user?.roleAssignments?.some(
        assignment =>
            assignment.isActive &&
            (assignment.subRole === "EDUCATOR" || assignment.subRole === "CENTER_MANAGER")
    ) || false;

    // Function to find the nearest weekend date (Saturday or Sunday)
    const getNearestWeekend = () => {
        const today = new Date('2025-08-04');
        const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            // Already a weekend, return today
            return today.toISOString().split('T')[0];
        }

        // Calculate days until Saturday
        const daysUntilSaturday = 6 - dayOfWeek;

        // Choose the next weekend (Saturday or Sunday)
        const nearestWeekendDate = new Date(today);
        nearestWeekendDate.setDate(today.getDate() + daysUntilSaturday);

        return nearestWeekendDate.toISOString().split('T')[0];
    };

    const [selectedDate, setSelectedDate] = useState<string>(getNearestWeekend());
    const [attendanceEntries, setAttendanceEntries] = useState<Record<string, AttendanceEntry>>({});
    const [isHoliday, setIsHoliday] = useState<boolean>(false);
    const [holidayReason, setHolidayReason] = useState<string>("");
    const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

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
            const getInitialStatus = (user: AttendanceUser): AttendanceStatus => {
                const roleAssignment = user.roleAssignments?.[0];
                if (!roleAssignment) return "ABSENT";

                const selectedDateObj = new Date(selectedDate);
                const dayOfWeek = selectedDateObj.getDay(); // 0 = Sunday, 6 = Saturday
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isSaturday = dayOfWeek === 6;
                const isSunday = dayOfWeek === 0;

                if (!isWeekend) {
                    // Attendance should only be marked on weekends
                    return "NOT_AVAILABLE";
                }

                const committedDays = roleAssignment.committedDays;

                if (committedDays === "BOTH") {
                    // User committed to both days, default to ABSENT
                    return "ABSENT";
                } else if (committedDays === "SATURDAY" && isSaturday) {
                    // User committed to Saturday and it's Saturday, default to ABSENT
                    return "ABSENT";
                } else if (committedDays === "SUNDAY" && isSunday) {
                    // User committed to Sunday and it's Sunday, default to ABSENT
                    return "ABSENT";
                } else {
                    // User not committed to this day, mark as NOT_AVAILABLE
                    return "NOT_AVAILABLE";
                }
            };

            const initialEntries: Record<string, AttendanceEntry> = {};
            let hasExistingHoliday = false;
            let existingHolidayReason = "";

            activeUsers.forEach((user) => {
                initialEntries[user.id] = {
                    userId: user.id,
                    status: getInitialStatus(user),
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

                // Check for existing holiday records
                const hasHolidayRecord = existingAttendance.attendances.some(record => record.status === "HOLIDAY");
                if (hasHolidayRecord) {
                    hasExistingHoliday = true;
                    const holidayRecord = existingAttendance.attendances.find(record => record.status === "HOLIDAY");
                    if (holidayRecord?.holidayReason) {
                        existingHolidayReason = holidayRecord.holidayReason;
                    }
                }
            }

            setAttendanceEntries(initialEntries);

            // Set holiday state only if we found existing holiday records
            if (hasExistingHoliday && !isHoliday) {
                setIsHoliday(true);
                setHolidayReason(existingHolidayReason);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeUsers, existingAttendance, selectedDate]);

    // Handle holiday toggle
    const handleHolidayToggle = (checked: boolean) => {
        setIsHoliday(checked);

        if (!checked) {
            setHolidayReason("");
        }

        // Update attendance entries based on holiday state
        if (activeUsers && attendanceEntries) {
            setAttendanceEntries(prev => {
                const updated = { ...prev };

                activeUsers.forEach((user) => {
                    const entry = updated[user.id];
                    if (!entry) return;

                    if (checked) {
                        // Set all to HOLIDAY
                        updated[user.id] = {
                            ...entry,
                            status: "HOLIDAY",
                        };
                    } else if (entry.status === "HOLIDAY") {
                        // Reset HOLIDAY entries to default status
                        const roleAssignment = user.roleAssignments?.[0];
                        if (roleAssignment) {
                            const selectedDateObj = new Date(selectedDate);
                            const dayOfWeek = selectedDateObj.getDay(); // 0 = Sunday, 6 = Saturday
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const isSaturday = dayOfWeek === 6;
                            const isSunday = dayOfWeek === 0;

                            let defaultStatus: AttendanceStatus = "ABSENT";

                            if (!isWeekend) {
                                defaultStatus = "NOT_AVAILABLE";
                            } else {
                                const committedDays = roleAssignment.committedDays;

                                if (committedDays === "BOTH") {
                                    defaultStatus = "ABSENT";
                                } else if (committedDays === "SATURDAY" && isSaturday) {
                                    defaultStatus = "ABSENT";
                                } else if (committedDays === "SUNDAY" && isSunday) {
                                    defaultStatus = "ABSENT";
                                } else {
                                    defaultStatus = "NOT_AVAILABLE";
                                }
                            }

                            updated[user.id] = {
                                ...entry,
                                status: defaultStatus,
                            };
                        }
                    }
                });

                return updated;
            });
        }
    };

    const toggleAttendanceStatus = (userId: string, isPresent: boolean) => {
        const user = activeUsers?.find(u => u.id === userId);
        const roleAssignment = user?.roleAssignments?.[0];

        if (!roleAssignment) return;

        let status: AttendanceStatus;

        // If holiday mode is on and user is trying to check (mark present), 
        // keep it as HOLIDAY. If unchecking, allow it to change status.
        if (isHoliday && isPresent) {
            status = "HOLIDAY";
        } else if (isPresent) {
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
                <div className="mb-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                        Mark Attendance
                    </h1>
                    <p className="text-sm text-gray-600">
                        Mark attendance for educators and center managers
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Check the box for present Educators / Center Managers. Weekends only.
                    </p>
                </div>

                {/* Important Notes */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start">
                        <InfoIcon className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="ml-2">
                            <h3 className="text-xs font-semibold text-orange-800 mb-1">
                                Quick Instructions
                            </h3>
                            <ul className="text-xs text-orange-700 space-y-0.5">
                                <li>• <strong>Check</strong> for present staff</li>
                                <li>• <strong>Save</strong> when done</li>
                                <li>• Use <strong>holiday</strong> for special days</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Date Filter and Controls */}
                <div className="bg-white rounded-lg shadow-sm border p-3 mb-4">
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    <CalendarIcon className="w-3 h-3 inline mr-1" />
                                    Date
                                </label>
                                {isEducatorOrCenterManager ? (
                                    // Display date as read-only for Educators and Center Managers
                                    <div className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                                        {new Date(selectedDate).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                ) : (
                                    // Allow date selection for other roles
                                    <input
                                        aria-label="Select date"
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    />
                                )}
                                {!isWeekendDate(selectedDate) && (
                                    <p className="mt-1 text-xs text-amber-600 flex items-center">
                                        <AlertTriangleIcon className="w-3 h-3 mr-1" />
                                        Weekend only
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Holiday
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={isHoliday}
                                        onChange={(e) => handleHolidayToggle(e.target.checked)}
                                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                    />
                                    <span className="ml-2 text-xs text-gray-700">Mark as Holiday</span>
                                </label>
                                {isHoliday && (
                                    <input
                                        type="text"
                                        value={holidayReason}
                                        onChange={(e) => setHolidayReason(e.target.value)}
                                        placeholder="Holiday reason..."
                                        className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    />
                                )}
                            </div>
                        </div>

                        <CustomButton
                            onClick={handleSubmitAttendance}
                            isLoading={bulkMarkAttendanceMutation.isPending}
                            loadingMessage="Saving..."
                            className="w-full h-10"
                            disabled={!activeUsers || activeUsers.length === 0}
                        >
                            <SaveIcon className="w-4 h-4 mr-2" />
                            Save Attendance
                        </CustomButton>
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
                                        <div className="space-y-3">
                                            {/* User Info - Full Width */}
                                            <div className="flex items-center space-x-3">
                                                <ProfilePicture
                                                    imageUrl={user.profileImageUrl}
                                                    name={user.name}
                                                    size="md"
                                                    colorScheme="orange"
                                                />
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {user.roleAssignments[0]?.subRole?.replace('_', ' ')}
                                                        {user.roleAssignments[0]?.level && ` • ${user.roleAssignments[0].level}`}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        Days: {user.roleAssignments[0]?.committedDays?.replace('_', ' ') || 'Not specified'}
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
                                                            onChange={(e) => toggleAttendanceStatus(user.id, e.target.checked)}
                                                            className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                                        />
                                                        <span className="text-xs font-medium text-gray-900">
                                                            {isHoliday ? "Holiday" : "Present"}
                                                        </span>
                                                    </div>

                                                    {/* Status Badge */}
                                                    <div className="flex items-center space-x-1">
                                                        {getStatusIcon(entry?.status || "ABSENT")}
                                                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadgeClass(entry?.status || "ABSENT")}`}>
                                                            {entry?.status?.replace('_', ' ').toLowerCase() || 'absent'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Notes Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setExpandedNotes(prev => ({
                                                            ...prev,
                                                            [user.id]: !prev[user.id]
                                                        }));
                                                    }}
                                                    className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                                                >
                                                    Notes
                                                </button>
                                            </div>
                                        </div>

                                        {/* Collapsible Notes Section */}
                                        {expandedNotes[user.id] && (
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                <textarea
                                                    value={entry?.notes || ''}
                                                    onChange={(e) => updateAttendanceNotes(user.id, e.target.value)}
                                                    placeholder="Add notes..."
                                                    rows={2}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                                                />
                                            </div>
                                        )}
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

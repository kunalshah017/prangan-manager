import { useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarIcon, UserIcon, ClockIcon, CheckIcon, XIcon } from "lucide-react";
import { useAttendanceRecords } from "@/hooks/useAttendanceQueries";
import LoadingButterfly from "@/components/LoadingButterfly";
import { CustomButton } from "@/components/ui/custom-button";

export const ViewAttendance = () => {
    const { centerId } = useParams();
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );

    const { data: attendanceData, isLoading, error } = useAttendanceRecords({
        startDate: selectedDate,
        endDate: selectedDate,
        centerId: centerId!,
    });

    if (isLoading) {
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
                    Failed to load attendance records
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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PRESENT':
                return <CheckIcon className="w-5 h-5 text-green-600" />;
            case 'ABSENT':
                return <XIcon className="w-5 h-5 text-red-600" />;
            case 'NOT_AVAILABLE':
                return <ClockIcon className="w-5 h-5 text-yellow-600" />;
            case 'HOLIDAY':
                return <CalendarIcon className="w-5 h-5 text-blue-600" />;
            default:
                return <ClockIcon className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
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

    return (
        <div className="p-4 md:p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto"
            >
                {/* Header */}
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        View Attendance
                    </h1>
                    <p className="text-gray-600 text-sm md:text-base">
                        Track educator and center manager attendance records
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6 mb-4 md:mb-6">
                    <div className="grid grid-cols-1 gap-4">
                        {/* Date Filter */}
                        <div className="max-w-xs">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <CalendarIcon className="w-4 h-4 inline mr-1" />
                                Date
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                title="Select date to view attendance"
                            />
                        </div>
                    </div>
                </div>

                {/* Attendance Records */}
                <div className="bg-white rounded-lg shadow-sm border">
                    {!attendanceData || !attendanceData.attendances || attendanceData.attendances.length === 0 ? (
                        <div className="text-center py-12">
                            <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No attendance records found
                            </h3>
                            <p className="text-gray-600">
                                No attendance records found for {selectedDate}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Educator/Manager
                                        </th>
                                        <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                                            Role
                                        </th>
                                        <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                                            Marked Time
                                        </th>
                                        <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                                            Notes
                                        </th>
                                        <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                                            Marked By
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {attendanceData.attendances.map((record) => (
                                        <motion.tr
                                            key={record.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="px-3 md:px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10">
                                                        <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-orange-100 flex items-center justify-center">
                                                            <UserIcon className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                                                        </div>
                                                    </div>
                                                    <div className="ml-3 md:ml-4 min-w-0 flex-1">
                                                        <div className="text-sm font-medium text-gray-900 truncate">
                                                            {record.userName || 'Unknown User'}
                                                        </div>
                                                        <div className="text-xs md:text-sm text-gray-500 truncate">
                                                            {record.userEmail || ''}
                                                        </div>
                                                        <div className="text-xs text-gray-500 capitalize sm:hidden">
                                                            {record.roleAssignment?.subRole?.replace('_', ' ') || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                                <span className="capitalize text-sm text-gray-700">
                                                    {record.roleAssignment?.subRole?.replace('_', ' ') || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {getStatusIcon(record.status)}
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ml-2 capitalize ${getStatusBadge(record.status)}`}>
                                                        {record.status.toLowerCase()}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 md:hidden">
                                                    {record.markedAt ? new Date(record.markedAt).toLocaleTimeString('en-US', {
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                        hour12: true,
                                                    }) : '-'}
                                                </div>
                                            </td>
                                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700 hidden md:table-cell">
                                                {record.markedAt ? new Date(record.markedAt).toLocaleTimeString('en-US', {
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true,
                                                }) : '-'}
                                            </td>
                                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700 hidden lg:table-cell">
                                                <div className="max-w-xs truncate" title={record.notes || ''}>
                                                    {record.notes || '-'}
                                                </div>
                                            </td>
                                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700 hidden lg:table-cell">
                                                {record.markedByName || '-'}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

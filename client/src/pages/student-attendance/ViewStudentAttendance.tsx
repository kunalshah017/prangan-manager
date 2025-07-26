import { useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
    CalendarIcon,
    UserIcon,
    CheckIcon,
    XIcon,
    Eye,
    Users,
    Calendar
} from "lucide-react";
import { useStudentAttendanceRecords } from "@/hooks/useStudentAttendanceQueries";
import LoadingButterfly from "@/components/LoadingButterfly";
import type { StudentAttendanceRecord } from "@/types/api";

export const ViewStudentAttendance = () => {
    const { projectId, centerId, semesterId } = useParams();
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [selectedStudent, setSelectedStudent] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("");

    const { data: attendanceData, isLoading, error } = useStudentAttendanceRecords({
        projectId: projectId!,
        centerId: centerId!,
        semesterId: semesterId!,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(selectedStudent && { studentId: selectedStudent }),
        ...(selectedStatus && { status: selectedStatus }),
    });

    const getStatusIcon = (status: StudentAttendanceRecord['status']) => {
        switch (status) {
            case 'PRESENT':
                return <CheckIcon className="w-4 h-4 text-green-600" />;
            case 'ABSENT':
                return <XIcon className="w-4 h-4 text-red-600" />;
            case 'HOLIDAY':
                return <CalendarIcon className="w-4 h-4 text-blue-600" />;
            default:
                return <UserIcon className="w-4 h-4 text-gray-400" />;
        }
    };

    const getStatusBadgeClass = (status: StudentAttendanceRecord['status']) => {
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

    const getAttendanceStats = () => {
        if (!attendanceData?.attendance) return null;

        const total = attendanceData.attendance.length;
        const present = attendanceData.attendance.filter(record => record.status === 'PRESENT').length;
        const absent = attendanceData.attendance.filter(record => record.status === 'ABSENT').length;
        const holidays = attendanceData.attendance.filter(record => record.status === 'HOLIDAY').length;

        const workingDays = total - holidays;
        const attendancePercentage = workingDays > 0 ? ((present / workingDays) * 100).toFixed(1) : '0.0';

        return { total, present, absent, holidays, attendancePercentage, workingDays };
    };

    const stats = getAttendanceStats();

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
                    Failed to load student attendance records
                </div>
                <p className="text-gray-600 mb-6">
                    {error instanceof Error ? error.message : 'An error occurred'}
                </p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto"
            >
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                        <Eye className="w-8 h-8 mr-3 text-orange-600" />
                        View Student Attendance
                    </h1>
                    <p className="text-gray-600">
                        View and analyze student attendance records with filtering options
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-gray-600" />
                        Filters
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                aria-label="Start date for filtering attendance records"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                aria-label="End date for filtering attendance records"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Student ID
                            </label>
                            <input
                                type="text"
                                value={selectedStudent}
                                onChange={(e) => setSelectedStudent(e.target.value)}
                                placeholder="Filter by student ID..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                aria-label="Filter attendance records by status"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            >
                                <option value="">All Statuses</option>
                                <option value="PRESENT">Present</option>
                                <option value="ABSENT">Absent</option>
                                <option value="HOLIDAY">Holiday</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                            <div className="text-sm text-gray-600">Total Records</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                            <div className="text-sm text-gray-600">Present</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                            <div className="text-sm text-gray-600">Absent</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="text-2xl font-bold text-blue-600">{stats.holidays}</div>
                            <div className="text-sm text-gray-600">Holidays</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="text-2xl font-bold text-orange-600">{stats.attendancePercentage}%</div>
                            <div className="text-sm text-gray-600">Attendance Rate</div>
                        </div>
                    </div>
                )}

                {/* Attendance Records */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Users className="w-5 h-5 mr-2 text-gray-600" />
                            Student Attendance Records
                            {attendanceData?.attendance && (
                                <span className="ml-2 text-sm font-normal text-gray-500">
                                    ({attendanceData.attendance.length} records)
                                </span>
                            )}
                        </h3>
                    </div>

                    {!attendanceData?.attendance || attendanceData.attendance.length === 0 ? (
                        <div className="text-center py-12">
                            <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No attendance records found
                            </h3>
                            <p className="text-gray-600">
                                No student attendance records match your current filters.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Student
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Level
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Notes
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Marked By
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Marked At
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {attendanceData.attendance.map((record) => (
                                        <motion.tr
                                            key={record.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-8 w-8">
                                                        {record.student?.profileImageUrl ? (
                                                            <img
                                                                src={record.student.profileImageUrl}
                                                                alt={record.student.name}
                                                                className="h-8 w-8 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                                                                <UserIcon className="w-4 h-4 text-orange-600" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {record.student?.name || 'Unknown Student'}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            ID: {record.studentId}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(record.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {getStatusIcon(record.status)}
                                                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeClass(record.status)}`}>
                                                        {record.status.toLowerCase()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                                    {record.enrollment?.level?.replace('_', ' ') || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                                                <div className="truncate" title={record.notes || record.holidayReason || '-'}>
                                                    {record.notes || record.holidayReason || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {record.markedByName || 'System'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {record.markedAt
                                                    ? new Date(record.markedAt).toLocaleString()
                                                    : '-'
                                                }
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

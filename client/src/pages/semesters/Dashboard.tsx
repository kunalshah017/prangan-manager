import { Users, UserPlus, ClipboardList, CalendarCheck } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import { useSemester } from '@/hooks/useSemesterQueries';
import { useCenter } from '@/hooks/useCenterQueries';
import { useStudentsBySemester } from '@/hooks/useStudentQueries';
import type { Student } from '@/types/api';
import ProtectedComponent from '@/components/ProtectedComponent';

const Dashboard = () => {
    const { projectId, centerId, semesterId } = useParams<{
        projectId: string;
        centerId: string;
        semesterId: string;
    }>();
    const navigate = useNavigate();

    // Fetch semester, center, and students data
    const { data: semester, isLoading: semesterLoading, error: semesterError } = useSemester(semesterId!);
    const { data: center, isLoading: centerLoading } = useCenter(centerId!);
    const { data: studentsData, isLoading: studentsLoading } = useStudentsBySemester(semesterId!);

    const isLoading = semesterLoading || centerLoading || studentsLoading;

    // Handle both data formats - direct array or wrapped in object
    const students: Student[] = useMemo(() => {
        if (!studentsData) return [];
        if (Array.isArray(studentsData)) return studentsData;
        // Handle wrapped format from student attendance queries
        if (typeof studentsData === 'object' && 'students' in studentsData) {
            return (studentsData as { students: Student[] }).students || [];
        }
        return [];
    }, [studentsData]);

    // Calculate student metrics (before early returns)
    const totalStudents = students?.length || 0;
    const studentsByLevel = useMemo(() => {
        if (!students || !Array.isArray(students)) return {};
        return students.reduce((acc: Record<string, number>, student: Student) => {
            if (student?.level) {
                acc[student.level] = (acc[student.level] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [students]);

    // Function to handle navigation to students with context
    const handleManageStudents = () => {
        // Navigate to the nested students route under dashboard
        navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/students`);
    };

    // Function to handle navigation to registration requests with context
    const handleRegistrationRequests = () => {
        // Save dashboard context to sessionStorage
        const dashboardContext = {
            projectId,
            centerId,
            semesterId,
            projectName: 'Project', // Will be updated by breadcrumb component
            centerName: center?.name || 'Center',
            semesterName: semester?.name || 'Semester'
        };

        sessionStorage.setItem('dashboardContext', JSON.stringify(dashboardContext));
        navigate('/registration-requests');
    };

    // Function to handle navigation to view attendance
    const handleViewAttendance = () => {
        navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/attendance/view`);
    };

    // Function to handle navigation to mark attendance
    const handleMarkAttendance = () => {
        navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/attendance/mark`);
    };

    // Function to handle navigation to view student attendance
    const handleViewStudentAttendance = () => {
        navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/student-attendance/view`);
    };

    // Function to handle navigation to mark student attendance
    const handleMarkStudentAttendance = () => {
        navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/student-attendance/mark`);
    };

    // Function to handle navigation to add student with context
    const handleAddStudent = () => {
        // Navigate to the nested add student route under dashboard
        navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/students/new`);
    };

    // Show loading state
    if (isLoading) {
        return (
            <>
                <DoodleBackground numElements={12} />
                <div className="flex flex-col items-center justify-center min-h-[400px] relative z-1">
                    <LoadingButterfly size="md" />
                </div>
            </>
        );
    }

    // Show error state
    if (semesterError) {
        return (
            <>
                <DoodleBackground numElements={12} />
                <div className="flex flex-col items-center justify-center min-h-[400px] relative z-1">
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <span className="text-red-600 text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load dashboard</h2>
                    <p className="text-gray-600 mb-4">{semesterError.message}</p>
                </div>
            </>
        );
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getLevelDisplay = (level: string) => {
        const levelMap: Record<string, string> = {
            'LEVEL_1': 'Level 1',
            'LEVEL_2': 'Level 2',
            'LEVEL_3': 'Level 3',
            'LEVEL_4': 'Level 4',
            'PRIMARY_A': 'Primary A',
            'PRIMARY_B': 'Primary B'
        };
        return levelMap[level] || level;
    };

    // Function to sort levels in the desired order
    const getSortedLevels = () => {
        const levelOrder = ['PRIMARY_A', 'PRIMARY_B', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'];
        return levelOrder.filter(level => studentsByLevel[level] > 0);
    };

    return (
        <>
            <DoodleBackground numElements={8} />
            <div className="flex flex-col space-y-4 w-full relative z-1 px-4 sm:px-0">
                {/* Header */}
                <div className="text-center sm:text-left">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                        {semester?.name}
                    </h1>
                    <p className="text-gray-600 text-sm mt-1">
                        {center?.name}
                    </p>
                    <p className="text-gray-500 text-xs">
                        {semester && formatDate(semester.startDate)} - {semester && formatDate(semester.endDate)}
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold text-orange-600">{totalStudents}</p>
                        <p className="text-xs text-gray-600">Students</p>
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600">{Object.keys(studentsByLevel).length}</p>
                        <p className="text-xs text-gray-600">Levels</p>
                    </div>
                </div>

                {/* Student Management */}
                <div className="space-y-3">
                    <h2 className="text-sm font-medium text-gray-700 px-1">Student Management</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleManageStudents}
                            className="flex flex-col items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg p-4 h-20 transition-colors"
                        >
                            <Users className="h-5 w-5" />
                            <span className="text-xs font-medium">Manage Students</span>
                        </button>

                        <ProtectedComponent allowedSubRoles={['CENTER_MANAGER']}>
                            <button
                                onClick={handleAddStudent}
                                className="flex flex-col items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg p-4 h-20 transition-colors"
                            >
                                <UserPlus className="h-5 w-5" />
                                <span className="text-xs font-medium">Add Student</span>
                            </button>
                        </ProtectedComponent>
                    </div>
                </div>

                {/* Educator / Center Manager Attendance */}
                <ProtectedComponent allowedSubRoles={['CENTER_MANAGER']}>
                    <div className="space-y-3">
                        <h2 className="text-sm font-medium text-gray-700 px-1">Educators / Center Manager Attendance</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleMarkAttendance}
                                className="flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-4 h-20 transition-colors"
                            >
                                <CalendarCheck className="h-5 w-5" />
                                <span className="text-xs font-medium">Mark Attendance</span>
                            </button>

                            <button
                                onClick={handleViewAttendance}
                                className="flex flex-col items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-4 h-20 transition-colors"
                            >
                                <ClipboardList className="h-5 w-5" />
                                <span className="text-xs font-medium">View Attendance</span>
                            </button>
                        </div>
                    </div>
                </ProtectedComponent>

                {/* Student Attendance */}
                <ProtectedComponent requireAdmin>
                    <div className="space-y-3">
                        <h2 className="text-sm font-medium text-gray-700 px-1">Student Attendance</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleMarkStudentAttendance}
                                className="flex flex-col items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-4 h-20 transition-colors"
                            >
                                <CalendarCheck className="h-5 w-5" />
                                <span className="text-xs font-medium">Mark Student Attendance</span>
                            </button>

                            <button
                                onClick={handleViewStudentAttendance}
                                className="flex flex-col items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg p-4 h-20 transition-colors"
                            >
                                <ClipboardList className="h-5 w-5" />
                                <span className="text-xs font-medium">View Student Attendance</span>
                            </button>
                        </div>
                    </div>
                </ProtectedComponent>                {/* Admin Functions */}
                <ProtectedComponent requireAdmin>
                    <div className="space-y-3">
                        <h2 className="text-sm font-medium text-gray-700 px-1">Admin Functions</h2>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={handleRegistrationRequests}
                                className="flex items-center justify-center gap-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg p-4 h-16 transition-colors"
                            >
                                <UserPlus className="h-5 w-5" />
                                <span className="text-sm font-medium">Registration Requests</span>
                            </button>
                        </div>
                    </div>
                </ProtectedComponent>

                {/* Students by Level */}
                {Object.keys(studentsByLevel).length > 0 && (
                    <div className="mx-4 sm:mx-0">
                        <div className="bg-white/90 backdrop-blur-sm rounded-lg border p-4">
                            <h2 className="text-sm font-medium text-gray-700 mb-3">Students by Level</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {getSortedLevels().map((level) => (
                                    <div key={level} className="bg-orange-50 rounded-lg p-3 text-center">
                                        <p className="text-lg font-bold text-orange-600">
                                            {studentsByLevel[level]}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            {getLevelDisplay(level)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                <ProtectedComponent allowedSubRoles={['EDUCATOR', 'CENTER_MANAGER']} fallback={
                    totalStudents === 0 ? (
                        <div className="mx-4 sm:mx-0">
                            <div className="bg-white/90 backdrop-blur-sm rounded-lg border p-6 text-center">
                                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                <h3 className="text-sm font-medium text-gray-900 mb-2">No Students Yet</h3>
                                <p className="text-xs text-gray-600">
                                    Contact an administrator to add students.
                                </p>
                            </div>
                        </div>
                    ) : null
                }>
                    {totalStudents === 0 && (
                        <div className="mx-4 sm:mx-0">
                            <div className="bg-white/90 backdrop-blur-sm rounded-lg border p-6 text-center">
                                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                <h3 className="text-sm font-medium text-gray-900 mb-2">No Students Yet</h3>
                                <p className="text-xs text-gray-600 mb-4">
                                    Get started by adding your first student.
                                </p>
                                <button
                                    onClick={handleAddStudent}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <UserPlus className="h-4 w-4 inline mr-1" />
                                    Add First Student
                                </button>
                            </div>
                        </div>
                    )}
                </ProtectedComponent>
            </div>
        </>
    );
};

export default Dashboard;

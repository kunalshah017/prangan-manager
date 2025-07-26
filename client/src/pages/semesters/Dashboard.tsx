import { Users, UserPlus, TrendingUp, Calendar, ClipboardList, CalendarCheck } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import { useSemester } from '@/hooks/useSemesterQueries';
import { useCenter } from '@/hooks/useCenterQueries';
import { useStudentsBySemester } from '@/hooks/useStudentQueries';
import type { Student } from '@/types/api';
import { useAuth } from '@/hooks/useAuth';

const Dashboard = () => {
    const { projectId, centerId, semesterId } = useParams<{
        projectId: string;
        centerId: string;
        semesterId: string;
    }>();
    const { isAdmin } = useAuth();
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
            <DoodleBackground numElements={12} />
            <div className="flex flex-col space-y-6 w-full relative z-1">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                            {semester?.name} Dashboard
                        </h1>
                        <p className="text-gray-600 mt-1 text-sm sm:text-base">
                            {center?.name} • {semester && formatDate(semester.startDate)} - {semester && formatDate(semester.endDate)}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleManageStudents}
                            className={cn(
                                buttonVariants({ size: "default" }),
                                "flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white flex-1 sm:flex-none"
                            )}
                        >
                            <Users className="h-4 w-4" />
                            <span>Manage Students</span>
                        </button>

                        <button
                            onClick={handleViewAttendance}
                            className={cn(
                                buttonVariants({ variant: "outline", size: "default" }),
                                "flex items-center justify-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50 flex-1 sm:flex-none"
                            )}
                        >
                            <ClipboardList className="h-4 w-4" />
                            <span>View Attendance</span>
                        </button>

                        <button
                            onClick={handleMarkAttendance}
                            className={cn(
                                buttonVariants({ variant: "outline", size: "default" }),
                                "flex items-center justify-center gap-2 border-green-600 text-green-600 hover:bg-green-50 flex-1 sm:flex-none"
                            )}
                        >
                            <CalendarCheck className="h-4 w-4" />
                            <span>Mark Attendance</span>
                        </button>

                        <button
                            onClick={handleViewStudentAttendance}
                            className={cn(
                                buttonVariants({ variant: "outline", size: "default" }),
                                "flex items-center justify-center gap-2 border-purple-600 text-purple-600 hover:bg-purple-50 flex-1 sm:flex-none"
                            )}
                        >
                            <ClipboardList className="h-4 w-4" />
                            <span>View Student Attendance</span>
                        </button>

                        <button
                            onClick={handleMarkStudentAttendance}
                            className={cn(
                                buttonVariants({ variant: "outline", size: "default" }),
                                "flex items-center justify-center gap-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 flex-1 sm:flex-none"
                            )}
                        >
                            <CalendarCheck className="h-4 w-4" />
                            <span>Mark Student Attendance</span>
                        </button>

                        {isAdmin() && (
                            <button
                                onClick={handleRegistrationRequests}
                                className={cn(
                                    buttonVariants({ variant: "outline", size: "default" }),
                                    "flex items-center justify-center gap-2 border-orange-600 text-orange-600 hover:bg-orange-50 flex-1 sm:flex-none"
                                )}
                            >
                                <UserPlus className="h-4 w-4" />
                                <span>Registration Requests</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Total Students Card */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg border shadow-sm p-4 sm:p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                            </div>
                            <div className="ml-3 sm:ml-4">
                                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Students</p>
                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalStudents}</p>
                            </div>
                        </div>
                    </div>

                    {/* Active Levels Card */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg border shadow-sm p-4 sm:p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                            </div>
                            <div className="ml-3 sm:ml-4">
                                <p className="text-xs sm:text-sm font-medium text-gray-600">Active Levels</p>
                                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                    {Object.keys(studentsByLevel).length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Semester Duration Card */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg border shadow-sm p-4 sm:p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                            </div>
                            <div className="ml-3 sm:ml-4">
                                <p className="text-xs sm:text-sm font-medium text-gray-600">Duration</p>
                                <p className="text-lg sm:text-lg font-bold text-gray-900">
                                    {semester && Math.ceil(
                                        (new Date(semester.endDate).getTime() - new Date(semester.startDate).getTime())
                                        / (1000 * 60 * 60 * 24)
                                    )} days
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Action Card */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg border shadow-sm p-4 sm:p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                            </div>
                            <div className="ml-3 sm:ml-4 flex-1">
                                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Quick Action</p>
                                <button
                                    onClick={handleAddStudent}
                                    className={cn(
                                        buttonVariants({ size: "sm" }),
                                        "text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white w-full"
                                    )}
                                >
                                    Add Student
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Students by Level */}
                {Object.keys(studentsByLevel).length > 0 && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg border shadow-sm p-4 sm:p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Students by Level</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                            {getSortedLevels().map((level) => (
                                <div key={level} className="text-center">
                                    <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
                                        <p className="text-xs sm:text-sm font-medium text-gray-600">
                                            {getLevelDisplay(level)}
                                        </p>
                                        <p className="text-lg sm:text-xl font-bold text-orange-600 mt-1">
                                            {studentsByLevel[level]}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {totalStudents === 0 && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg border shadow-sm p-6 sm:p-8">
                        <div className="text-center">
                            <Users className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Students Yet</h3>
                            <p className="text-sm sm:text-base text-gray-600 mb-4">
                                Get started by adding the first student to this semester.
                            </p>
                            {isAdmin() && (
                                <button
                                    onClick={handleAddStudent}
                                    className={cn(
                                        buttonVariants({ size: "default" }),
                                        "bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
                                    )}
                                >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Add First Student
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Semester Information */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg border shadow-sm p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Semester Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="p-3 sm:p-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600">Center</p>
                            <p className="text-sm sm:text-base text-gray-900 mt-1">{center?.name}</p>
                        </div>
                        <div className="p-3 sm:p-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600">Start Date</p>
                            <p className="text-sm sm:text-base text-gray-900 mt-1">{semester && formatDate(semester.startDate)}</p>
                        </div>
                        <div className="p-3 sm:p-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600">End Date</p>
                            <p className="text-sm sm:text-base text-gray-900 mt-1">{semester && formatDate(semester.endDate)}</p>
                        </div>
                        <div className="p-3 sm:p-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600">Last Updated</p>
                            <p className="text-sm sm:text-base text-gray-900 mt-1">{semester && formatDate(semester.updatedAt)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;

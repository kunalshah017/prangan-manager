import { Users, UserPlus, ClipboardList, CalendarCheck, IndianRupee, UserCog, AlertTriangle, Clock } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import DoodleBackground from '@/components/DoodleBackground';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import LoadingButterfly from '@/components/LoadingButterfly';
import { useSemester } from '@/hooks/useSemesterQueries';
import { useCenter } from '@/hooks/useCenterQueries';
import { useStudentsBySemester } from '@/hooks/useStudentQueries';
import { useStudentAttendanceRecords } from '@/hooks/useStudentAttendanceQueries';
import { useAttendanceRecords } from '@/hooks/useAttendanceQueries';
import type { Student, RoleAssignment, User } from '@/types/api';
import ProtectedComponent from '@/components/ProtectedComponent';
import { useUsers } from '@/hooks/useUserQueries';

const Dashboard = () => {
    const { projectId, centerId, semesterId } = useParams<{
        projectId: string;
        centerId: string;
        semesterId: string;
    }>();
    const navigate = useNavigate();

    // Confetti state for birthday celebration
    const [showConfetti, setShowConfetti] = useState(false);
    const [windowDimensions, setWindowDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });

    // Update window dimensions for confetti
    useEffect(() => {
        const handleResize = () => {
            setWindowDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch semester, center, and students data
    const { data: semester, isLoading: semesterLoading, error: semesterError } = useSemester(semesterId!);
    const { data: center, isLoading: centerLoading } = useCenter(centerId!);
    const { data: studentsData, isLoading: studentsLoading } = useStudentsBySemester(semesterId!);

    const isLoading = semesterLoading || centerLoading || studentsLoading;
    const { data: users = [] } = useUsers();

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

    // Counts for Educators and Center Managers from all users (not filtered by active), scoped to current context
    const { educatorCount, centerManagerCount } = useMemo(() => {
        const educatorIds = new Set<string>();
        const managerIds = new Set<string>();

        const inContext = (ra: RoleAssignment) => {
            if (projectId && ra.projectId && ra.projectId !== projectId) return false;
            if (centerId && ra.centerId && ra.centerId !== centerId) return false;
            if (semesterId && ra.semesterId && ra.semesterId !== semesterId) return false;
            return true;
        };

        for (const user of users) {
            const roles = user.roleAssignments || [];
            if (roles.some((r) => r.subRole === 'EDUCATOR' && inContext(r))) {
                educatorIds.add(user.id);
            }
            if (roles.some((r) => r.subRole === 'CENTER_MANAGER' && inContext(r))) {
                managerIds.add(user.id);
            }
        }
        return { educatorCount: educatorIds.size, centerManagerCount: managerIds.size };
    }, [users, projectId, centerId, semesterId]);

    // Check if today is weekend (Saturday or Sunday)
    const today = useMemo(() => new Date(), []);
    const isWeekend = today.getDay() === 0 || today.getDay() === 6; // 0 = Sunday, 6 = Saturday
    const todayString = today.toISOString().split('T')[0];

    // Fetch attendance records for today (only on weekends)
    const { data: studentAttendanceRecords } = useStudentAttendanceRecords({
        projectId,
        centerId,
        semesterId,
        date: todayString,
        enabled: isWeekend && !!projectId && !!centerId && !!semesterId,
    });

    const { data: staffAttendanceRecords } = useAttendanceRecords({
        startDate: todayString,
        endDate: todayString,
        projectId,
        centerId,
        semesterId,
    });

    // Calculate birthday alerts
    const birthdayAlerts = useMemo(() => {
        const alerts = [];
        const todayMonth = today.getMonth() + 1; // getMonth() returns 0-11
        const todayDate = today.getDate();

        // Check user birthdays (only show active users in current context)
        const usersWithBirthdays = users.filter(user => {
            if (!user.dob || user.status !== 'APPROVED') return false;

            // Check if user has active role assignments in current context
            const hasActiveRole = user.roleAssignments?.some(role =>
                role.isActive &&
                (!role.projectId || role.projectId === projectId) &&
                (!role.centerId || role.centerId === centerId) &&
                (!role.semesterId || role.semesterId === semesterId)
            );

            if (!hasActiveRole) return false;

            const userDob = new Date(user.dob);
            return userDob.getMonth() + 1 === todayMonth && userDob.getDate() === todayDate;
        });

        // Check student birthdays (only students in current semester)
        const studentsWithBirthdays = students.filter(student => {
            if (!student.dob) return false;
            const studentDob = new Date(student.dob);
            return studentDob.getMonth() + 1 === todayMonth && studentDob.getDate() === todayDate;
        });

        if (usersWithBirthdays.length > 0) {
            alerts.push({
                type: 'user-birthday',
                title: '🎉 Educator / Center Manager Birthday Today!',
                people: usersWithBirthdays,
                message: usersWithBirthdays.length === 1
                    ? `It's ${usersWithBirthdays[0].name.split(' ')[0]}'s birthday today!`
                    : `${usersWithBirthdays.length} educators/center managers have birthdays today!`,
            });
            // Trigger confetti for birthday celebration
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000);
        }

        if (studentsWithBirthdays.length > 0) {
            alerts.push({
                type: 'student-birthday',
                title: '� Student Birthday Today!',
                people: studentsWithBirthdays,
                message: studentsWithBirthdays.length === 1
                    ? `It's ${studentsWithBirthdays[0].name.split(' ')[0]}'s birthday today!`
                    : `${studentsWithBirthdays.length} students have birthdays today!`,

            });
            // Trigger confetti for birthday celebration
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000);
        }

        return alerts;
    }, [users, students, today, projectId, centerId, semesterId]);

    // Calculate weekend attendance alerts
    const weekendAlerts = useMemo(() => {
        if (!isWeekend) return [];

        const alerts = [];

        // Check student attendance by level
        if (students.length > 0) {
            const attendanceByLevel: Record<string, boolean> = {};
            const studentsWithAttendance = studentAttendanceRecords?.attendance || [];

            // Mark levels that have attendance records
            studentsWithAttendance.forEach((record) => {
                if (record.enrollment?.level) {
                    attendanceByLevel[record.enrollment.level] = true;
                }
            });

            // Find levels without attendance
            const levelsWithoutAttendance = Object.keys(studentsByLevel).filter(
                level => !attendanceByLevel[level]
            );

            if (levelsWithoutAttendance.length > 0) {
                alerts.push({
                    type: 'student-attendance',
                    title: 'Student Attendance Missing',
                    message: `Weekend attendance not marked for: ${levelsWithoutAttendance.map(level =>
                        level.replace(/_/g, ' ')
                    ).join(', ')}`,
                    levels: levelsWithoutAttendance,
                });
            }
        }

        // Check staff attendance (educators and center managers)
        if (educatorCount > 0 || centerManagerCount > 0) {
            const staffAttendances = staffAttendanceRecords?.attendances || [];
            const staffWithAttendance = new Set(staffAttendances.map((record) => record.userId));

            // Get active staff users for this context
            const activeStaffUsers = users.filter(user => {
                const roles = user.roleAssignments || [];
                return roles.some(role =>
                    (role.subRole === 'EDUCATOR' || role.subRole === 'CENTER_MANAGER') &&
                    role.isActive &&
                    (!role.projectId || role.projectId === projectId) &&
                    (!role.centerId || role.centerId === centerId) &&
                    (!role.semesterId || role.semesterId === semesterId)
                );
            });

            const staffWithoutAttendance = activeStaffUsers.filter(user =>
                !staffWithAttendance.has(user.id)
            );

            if (staffWithoutAttendance.length > 0) {
                alerts.push({
                    type: 'staff-attendance',
                    title: 'Educators / Student Attendance Missing',
                    message: `Weekend attendance not marked for ${staffWithoutAttendance.length} member${staffWithoutAttendance.length > 1 ? 's' : ''}`,
                    count: staffWithoutAttendance.length,
                });
            }
        }

        return alerts;
    }, [isWeekend, students, studentsByLevel, studentAttendanceRecords, staffAttendanceRecords, educatorCount, centerManagerCount, users, projectId, centerId, semesterId]);

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

    // Function to handle navigation to renumeration page
    const handleRenumeration = () => {
        navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/attendance/renumeration`);
    };

    // Function to handle navigation to manage users
    const handleManageUsers = () => {
        navigate('/users');
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

                {/* Weekend Attendance Alerts */}
                {isWeekend && weekendAlerts.length > 0 && (
                    <div className="space-y-2">
                        {weekendAlerts.map((alert, index) => (
                            <div
                                key={`${alert.type}-${index}`}
                                className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start space-x-3"
                            >
                                <div className="flex-shrink-0">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-amber-800">
                                            {alert.title}
                                        </h4>
                                        <div className="flex items-center text-xs text-amber-600">
                                            <Clock className="h-3 w-3 mr-1" />
                                            <span>Weekend</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-amber-700 mt-1">
                                        {alert.message}
                                    </p>
                                    {alert.type === 'student-attendance' && (
                                        <>
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {alert.levels?.map((level) => (
                                                    <span
                                                        key={level}
                                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                                                    >
                                                        {getLevelDisplay(level)}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="mt-2">
                                                <button
                                                    onClick={handleMarkStudentAttendance}
                                                    className="text-xs font-medium text-amber-800 hover:text-amber-900 underline"
                                                >
                                                    Mark Student Attendance →
                                                </button>
                                            </div>
                                        </>
                                    )}
                                    {alert.type === 'staff-attendance' && (
                                        <div className="mt-2">
                                            <button
                                                onClick={handleMarkAttendance}
                                                className="text-xs font-medium text-amber-800 hover:text-amber-900 underline"
                                            >
                                                Mark Educatos / Center Managers Attendance →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Birthday Alerts */}
                {birthdayAlerts.length > 0 && (
                    <>
                        {/* Confetti Animation */}
                        {showConfetti && (
                            <Confetti
                                width={windowDimensions.width}
                                height={windowDimensions.height}
                                recycle={false}
                                numberOfPieces={200}
                                colors={['#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6']}
                            />
                        )}

                        <div className="space-y-2">
                            {birthdayAlerts.map((alert, index) => (
                                <div
                                    key={`${alert.type}-${index}`}
                                    className="relative bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-lg p-4 flex items-start space-x-3 shadow-lg"
                                >
                                    <div className="flex-shrink-0">
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-white text-lg">
                                            {alert.type === 'user-birthday' ? '👥' : '🎓'}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-purple-800">
                                                {alert.title}
                                            </h4>
                                            <div className="flex items-center text-xs text-pink-600 font-medium">
                                                <span className="mr-1">🎂</span>
                                                <span>Today</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-purple-700 mt-1 font-medium">
                                            {alert.message}
                                        </p>
                                        {alert.people && alert.people.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {alert.people.slice(0, 3).map((person: User | Student) => (
                                                    <div
                                                        key={person.id}
                                                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800 border border-pink-200 shadow-sm"
                                                    >
                                                        <span className="mr-1">🎉</span>
                                                        <span className="font-semibold">{person.name.split(' ')[0]}</span>
                                                        {/* Individual WhatsApp button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // Generate individual WhatsApp message with proper emoji encoding
                                                                const isUser = 'roles' in person;
                                                                const birthdayEmoji = String.fromCodePoint(0x1F389); // 🎉
                                                                const cakeEmoji = String.fromCodePoint(0x1F382); // 🎂
                                                                const heartEmoji = String.fromCodePoint(0x1F499); // 💙
                                                                const balloonEmoji = String.fromCodePoint(0x1F388); // 🎈
                                                                const sparklesEmoji = String.fromCodePoint(0x2728); // ✨
                                                                const starEmoji = String.fromCodePoint(0x1F31F); // 🌟

                                                                const firstName = person.name.split(' ')[0];
                                                                const individualMessage = isUser
                                                                    ? `${birthdayEmoji} Happy Birthday, ${firstName}! ${cakeEmoji}\n\nYour dedication and hard work in shaping young minds is truly inspiring. May this new year of your life bring you joy, success, and countless moments of fulfillment in your educational journey.\n\nWishing you a fantastic day filled with love, laughter, and all your favorite things! ${balloonEmoji}${sparklesEmoji}\n\nFrom the Prangan Manager team ${heartEmoji}`
                                                                    : `${birthdayEmoji} Happy Birthday, ${firstName}! ${cakeEmoji}\n\nWishing you a day full of happiness, fun, and all your favorite things! May this new year bring you exciting adventures, great achievements in your studies, and lots of wonderful memories.\n\nKeep shining bright and never stop learning! You're amazing! ${starEmoji}${balloonEmoji}\n\nFrom your friends at Prangan Manager ${heartEmoji}`;

                                                                // Open WhatsApp with message
                                                                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(individualMessage)}`;
                                                                window.open(whatsappUrl, '_blank');
                                                            }}
                                                            className="ml-2 p-1 rounded-full hover:bg-green-100 transition-colors duration-200"
                                                            title={`Send WhatsApp birthday message to ${person.name.split(' ')[0]}`}
                                                        >
                                                            <WhatsAppIcon size={14} className="text-green-600" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {alert.people.length > 3 && (
                                                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-200 shadow-sm">
                                                        <span className="mr-1">🎊</span>
                                                        +{alert.people.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold text-orange-600">{totalStudents}</p>
                        <p className="text-xs text-gray-600">Students</p>
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600">{Object.keys(studentsByLevel).length}</p>
                        <p className="text-xs text-gray-600">Levels</p>
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-600">{educatorCount}</p>
                        <p className="text-xs text-gray-600">Educators</p>
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold text-indigo-600">{centerManagerCount}</p>
                        <p className="text-xs text-gray-600">Center Managers</p>
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

                            <ProtectedComponent requireAdmin>
                                <button
                                    onClick={handleRenumeration}
                                    className="flex flex-col items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg p-4 h-20 transition-colors"
                                >
                                    <IndianRupee className="h-5 w-5" />
                                    <span className="text-xs font-medium">Renumeration</span>
                                </button>
                            </ProtectedComponent>
                        </div>
                    </div>
                </ProtectedComponent >

                {/* Student Attendance */}
                < ProtectedComponent allowedSubRoles={['CENTER_MANAGER', 'EDUCATOR']} >
                    <div className="space-y-3">
                        <h2 className="text-sm font-medium text-gray-700 px-1">Student Attendance</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleMarkStudentAttendance}
                                className="flex flex-col items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-4 h-20 transition-colors"
                            >
                                <CalendarCheck className="h-5 w-5 shrink-0" />
                                <span className="text-xs font-medium">Mark Student Attendance</span>
                            </button>

                            <button
                                onClick={handleViewStudentAttendance}
                                className="flex flex-col items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg p-4 h-20 transition-colors"
                            >
                                <ClipboardList className="h-5 w-5 shrink-0" />
                                <span className="text-xs font-medium">View Student Attendance</span>
                            </button>
                        </div>
                    </div>
                </ProtectedComponent > {/* Admin Functions */}
                < ProtectedComponent requireAdmin >
                    <div className="space-y-3">
                        <h2 className="text-sm font-medium text-gray-700 px-1">Admin Functions</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                            <button
                                onClick={handleRegistrationRequests}
                                className="flex items-center justify-center gap-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg p-4 h-16 transition-colors"
                            >
                                <UserPlus className="h-5 w-5" />
                                <span className="text-sm font-medium">Registration Requests</span>
                            </button>
                            <button
                                onClick={handleManageUsers}
                                className="flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-4 h-16 transition-colors"
                            >
                                <UserCog className="h-5 w-5" />
                                <span className="text-sm font-medium">Manage Users</span>
                            </button>
                        </div>
                    </div>
                </ProtectedComponent >

                {/* Students by Level */}
                {
                    Object.keys(studentsByLevel).length > 0 && (
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
                    )
                }

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
            </div >
        </>
    );
};

export default Dashboard;



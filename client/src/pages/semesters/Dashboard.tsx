import { Users, UserPlus, ClipboardList, CalendarCheck, IndianRupee, UserCog, AlertTriangle, Clock, BookOpen, List, ClipboardCheck } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import DoodleBackground from '@/components/DoodleBackground';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import LoadingButterfly from '@/components/LoadingButterfly';
import FutureProfessionCarousel from '@/components/FutureProfessionCarousel';
import { useSemester } from '@/hooks/useSemesterQueries';
import { useCenter } from '@/hooks/useCenterQueries';
import { useStudentsBySemester } from '@/hooks/useStudentQueries';
import { useStudentAttendanceRecords } from '@/hooks/useStudentAttendanceQueries';
import { useAttendanceRecords } from '@/hooks/useAttendanceQueries';
import type { Student, RoleAssignment, User } from '@/types/api';
import ProtectedComponent from '@/components/ProtectedComponent';
import { useUsers } from '@/hooks/useUserQueries';
import { useAuth } from '@/hooks/useAuth';
import { useSyllabi, useSyllabusTopics } from '@/hooks/useSyllabusQueries';
import BdayCake from '@/assets/bday_cake.svg';

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
    const { user: currentUser } = useAuth();

    // Handle both data formats - direct array or wrapped in object
    const students: Student[] = useMemo(() => {
        try {
            if (!studentsData) return [];
            if (Array.isArray(studentsData)) return studentsData;
            // Handle wrapped format from student attendance queries
            if (typeof studentsData === 'object' && 'students' in studentsData) {
                return (studentsData as { students: Student[] }).students || [];
            }
            return [];
        } catch (error) {
            console.error('Error processing students data:', error);
            return [];
        }
    }, [studentsData]);

    // Calculate student metrics (before early returns)
    const totalStudents = students?.length || 0;
    const studentsByLevel = useMemo(() => {
        try {
            if (!students || !Array.isArray(students)) return {};
            return students.reduce((acc: Record<string, number>, student: Student) => {
                if (student?.level && typeof student.level === 'string') {
                    acc[student.level] = (acc[student.level] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);
        } catch (error) {
            console.error('Error calculating students by level:', error);
            return {};
        }
    }, [students]);

    // Counts for Educators and Center Managers from all users (not filtered by active), scoped to current context
    const { educatorCount, centerManagerCount } = useMemo(() => {
        try {
            const educatorIds = new Set<string>();
            const managerIds = new Set<string>();

            const inContext = (ra: RoleAssignment) => {
                try {
                    if (projectId && ra.projectId && ra.projectId !== projectId) return false;
                    if (centerId && ra.centerId && ra.centerId !== centerId) return false;
                    if (semesterId && ra.semesterId && ra.semesterId !== semesterId) return false;
                    return true;
                } catch (error) {
                    console.warn('Error checking role assignment context:', error);
                    return false;
                }
            };

            for (const user of users || []) {
                if (!user || !user.id) continue;
                const roles = user.roleAssignments || [];
                if (roles.some((r) => r && r.subRole === 'EDUCATOR' && inContext(r))) {
                    educatorIds.add(user.id);
                }
                if (roles.some((r) => r && r.subRole === 'CENTER_MANAGER' && inContext(r))) {
                    managerIds.add(user.id);
                }
            }
            return { educatorCount: educatorIds.size, centerManagerCount: managerIds.size };
        } catch (error) {
            console.error('Error calculating educator/manager counts:', error);
            return { educatorCount: 0, centerManagerCount: 0 };
        }
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

        // Check if it's the current user's birthday and they're an Educator/Center Manager
        const isCurrentUserBirthday = currentUser && currentUser.dob && (() => {
            try {
                const currentUserDob = new Date(currentUser.dob);
                if (isNaN(currentUserDob.getTime())) return false;

                // Check if current user is an Educator or Center Manager in this context
                const isEducatorOrManager = currentUser.roleAssignments?.some(role =>
                    role && role.isActive &&
                    (role.subRole === 'EDUCATOR' || role.subRole === 'CENTER_MANAGER') &&
                    (!role.projectId || role.projectId === projectId) &&
                    (!role.centerId || role.centerId === centerId) &&
                    (!role.semesterId || role.semesterId === semesterId)
                );

                return isEducatorOrManager &&
                    currentUserDob.getMonth() + 1 === todayMonth &&
                    currentUserDob.getDate() === todayDate;
            } catch (error) {
                console.warn('Error checking current user birthday:', error);
                return false;
            }
        })();

        // Add special birthday message for current user
        if (isCurrentUserBirthday) {
            alerts.push({
                type: 'own-birthday',
                title: `Happiest Birthday To You ${currentUser.name.split(' ')[0]}! 🎉`,
                people: [currentUser],
                message: `Today is your special day! Wishing you joy, happiness, and all the wonderful things life has to offer.`,
            });
        }

        // Check user birthdays (only show active users in current context, excluding current user)
        const usersWithBirthdays = users.filter(user => {
            try {
                if (!user || !user.dob || user.status !== 'APPROVED') return false;

                // Exclude current user (they get their own special message)
                if (currentUser && user.id === currentUser.id) return false;

                // Check if user has active role assignments in current context
                const hasActiveRole = user.roleAssignments?.some(role =>
                    role && role.isActive &&
                    (!role.projectId || role.projectId === projectId) &&
                    (!role.centerId || role.centerId === centerId) &&
                    (!role.semesterId || role.semesterId === semesterId)
                );

                if (!hasActiveRole) return false;

                const userDob = new Date(user.dob);
                // Check if date is valid
                if (isNaN(userDob.getTime())) return false;

                return userDob.getMonth() + 1 === todayMonth && userDob.getDate() === todayDate;
            } catch (error) {
                console.warn('Error checking user birthday:', error);
                return false;
            }
        });

        // Check student birthdays (only students in current semester)
        const studentsWithBirthdays = students.filter(student => {
            try {
                if (!student || !student.dob) return false;
                const studentDob = new Date(student.dob);
                // Check if date is valid
                if (isNaN(studentDob.getTime())) return false;

                return studentDob.getMonth() + 1 === todayMonth && studentDob.getDate() === todayDate;
            } catch (error) {
                console.warn('Error checking student birthday:', error);
                return false;
            }
        });

        if (usersWithBirthdays.length > 0) {
            alerts.push({
                type: 'user-birthday',
                title: 'We have Birthday Today!',
                people: usersWithBirthdays,
                message: usersWithBirthdays.length === 1
                    ? `It's our Educator ${usersWithBirthdays[0]?.name?.split(' ')[0] || 'Someone'}'s birthday`
                    : `${usersWithBirthdays.length} educators/center managers have birthdays today!`,
            });
        }

        if (studentsWithBirthdays.length > 0) {
            alerts.push({
                type: 'student-birthday',
                title: 'Student Birthday Today!',
                people: studentsWithBirthdays,
                message: studentsWithBirthdays.length === 1
                    ? `It's our Student ${studentsWithBirthdays[0]?.name?.split(' ')[0] || 'Someone'}'s birthday today!`
                    : `${studentsWithBirthdays.length} students have birthdays today!`,
            });
        }

        return alerts;
    }, [users, students, today, projectId, centerId, semesterId, currentUser]);

    // Handle confetti trigger effect (separate from calculation to prevent infinite re-renders)
    useEffect(() => {
        if (birthdayAlerts.length > 0) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 10000);
            return () => clearTimeout(timer);
        }
    }, [birthdayAlerts.length]);

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

    // Fetch syllabi for the current semester
    const { data: syllabi = [] } = useSyllabi({
        projectId,
        centerId,
        semesterId,
        isActive: true,
    });

    // Get the first active syllabus for this semester (assuming one syllabus per level per semester)
    const activeSyllabus = syllabi[0];

    // Fetch topics with subtopics and progress logs
    const { data: allTopics = [] } = useSyllabusTopics({
        syllabusId: activeSyllabus?.id,
        includeSubtopics: true,
        status: 'ONGOING',
    });

    // Calculate ongoing topics alerts based on user role
    const ongoingTopicsAlerts = useMemo(() => {
        if (!currentUser || !allTopics.length) return null;

        // Helper function to calculate weekend days
        const calculateWeekendDays = (startDate: Date) => {
            const currentDate = new Date();
            let weekendDayCount = 0;
            for (let d = new Date(startDate); d <= currentDate; d.setDate(d.getDate() + 1)) {
                const day = d.getDay();
                if (day === 0 || day === 6) weekendDayCount++;
            }
            return weekendDayCount;
        };

        // Check if user is an educator
        const educatorAssignment = currentUser.roleAssignments?.find(role =>
            role && role.isActive &&
            role.subRole === 'EDUCATOR' &&
            (!role.projectId || role.projectId === projectId) &&
            (!role.centerId || role.centerId === centerId) &&
            (!role.semesterId || role.semesterId === semesterId) &&
            role.level
        );

        // Collect all topics and subtopics with their data
        const allItems: Array<{
            id: string;
            title: string;
            level: string;
            isSubtopic: boolean;
            updatedByName?: string;
            weekendDays: number;
            lastUpdated?: Date;
        }> = [];

        allTopics.forEach(topic => {
            const syllabus = syllabi.find(s => s.id === topic.syllabusId);
            if (!syllabus) return;

            // Filter by level for educators
            if (educatorAssignment && syllabus.level !== educatorAssignment.level) {
                return;
            }

            // Get the most recent progress log for main topic
            const topicProgress = Array.isArray(topic.recentProgress) && topic.recentProgress.length > 0
                ? topic.recentProgress[0]
                : null;

            // Add main topic if it has progress
            if (topicProgress?.createdAt) {
                const weekendDays = calculateWeekendDays(new Date(topicProgress.createdAt));
                allItems.push({
                    id: topic.id,
                    title: topic.title,
                    level: syllabus.level,
                    isSubtopic: false,
                    updatedByName: topicProgress.updatedByUser?.name,
                    weekendDays,
                    lastUpdated: new Date(topicProgress.createdAt),
                });
            }

            // Add subtopics if they have progress
            if (topic.subtopics) {
                topic.subtopics.forEach(subtopic => {
                    const subtopicProgress = Array.isArray(subtopic.recentProgress) && subtopic.recentProgress.length > 0
                        ? subtopic.recentProgress[0]
                        : null;

                    if (subtopicProgress?.createdAt) {
                        const weekendDays = calculateWeekendDays(new Date(subtopicProgress.createdAt));
                        allItems.push({
                            id: subtopic.id,
                            title: subtopic.title,
                            level: syllabus.level,
                            isSubtopic: true,
                            updatedByName: subtopicProgress.updatedByUser?.name,
                            weekendDays,
                            lastUpdated: new Date(subtopicProgress.createdAt),
                        });
                    }
                });
            }
        });

        // For educators: show all ongoing items
        if (educatorAssignment) {
            return {
                userRole: 'EDUCATOR',
                level: educatorAssignment.level,
                allItems,
                showAll: true,
            };
        }

        // For other roles: only show delayed subtopics (>6 days)
        const delayedSubtopics = allItems.filter(item => item.isSubtopic && item.weekendDays > 6);

        if (delayedSubtopics.length > 0) {
            return {
                userRole: 'OTHER',
                delayedSubtopics,
                showAll: false,
            };
        }

        return null;
    }, [currentUser, projectId, centerId, semesterId, allTopics, syllabi]);

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
        const dashboardContext = {
            projectId,
            centerId,
            semesterId,
            projectName: 'Project', // Will be updated by breadcrumb component
            centerName: center?.name || 'Center',
            semesterName: semester?.name || 'Semester'
        };

        sessionStorage.setItem('dashboardContext', JSON.stringify(dashboardContext));
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

                {/* Ongoing Topics Alert */}
                {ongoingTopicsAlerts && (
                    <div className={`border rounded-lg p-3 ${ongoingTopicsAlerts.userRole === 'EDUCATOR' ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-start gap-2">
                            <BookOpen className={`h-4 w-4 mt-0.5 flex-shrink-0 ${ongoingTopicsAlerts.userRole === 'EDUCATOR' ? 'text-blue-600' : 'text-red-600'}`} />
                            <div className="flex-1 min-w-0">
                                {ongoingTopicsAlerts.showAll ? (
                                    // Educator view: show all ongoing items
                                    <>
                                        <h4 className="text-sm font-semibold text-blue-800 mb-2">
                                            Your Ongoing Topics - {ongoingTopicsAlerts.level?.replace('_', ' ')}
                                        </h4>
                                        {(ongoingTopicsAlerts.allItems?.length || 0) > 0 ? (
                                            <div className="space-y-2 mb-3">
                                                {ongoingTopicsAlerts.allItems?.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className={`text-xs p-2 rounded ${item.weekendDays > 6 && item.isSubtopic ? 'bg-red-100 border border-red-300' : 'bg-white border border-blue-200'}`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1">
                                                                <span className={`font-medium ${item.weekendDays > 6 && item.isSubtopic ? 'text-red-800' : 'text-blue-800'}`}>
                                                                    {item.isSubtopic ? '↳ ' : ''}{item.title}
                                                                </span>
                                                                <div className={`mt-1 ${item.weekendDays > 6 && item.isSubtopic ? 'text-red-700' : 'text-blue-600'}`}>
                                                                    {item.updatedByName && (
                                                                        <span>Updated by {item.updatedByName}</span>
                                                                    )}
                                                                    {item.updatedByName && <span> • </span>}
                                                                    <span>Ongoing for {item.weekendDays} day{item.weekendDays !== 1 ? 's' : ''}</span>
                                                                </div>
                                                            </div>
                                                            {item.weekendDays > 6 && item.isSubtopic && (
                                                                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-blue-700 mb-2">No ongoing topics at the moment</p>
                                        )}
                                        <button
                                            onClick={() => navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus`)}
                                            className="text-xs font-medium text-blue-800 hover:text-blue-900 underline"
                                        >
                                            View Syllabus Progress →
                                        </button>
                                    </>
                                ) : (
                                    // Other roles view: only delayed subtopics alert
                                    <>
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-sm font-semibold text-red-800">Delayed Subtopics Alert</h4>
                                            <AlertTriangle className="h-4 w-4 text-red-600" />
                                        </div>
                                        <p className="text-xs text-red-700 mb-2">
                                            {ongoingTopicsAlerts.delayedSubtopics?.length || 0} subtopic{(ongoingTopicsAlerts.delayedSubtopics?.length || 0) !== 1 ? 's' : ''} ongoing for more than 6 days
                                        </p>
                                        <div className="space-y-1.5 mb-3">
                                            {ongoingTopicsAlerts.delayedSubtopics?.slice(0, 3).map((item) => (
                                                <div key={item.id} className="text-xs bg-white p-2 rounded border border-red-200">
                                                    <span className="font-medium text-red-800">↳ {item.title}</span>
                                                    <div className="text-red-700 mt-0.5">
                                                        {item.updatedByName && (
                                                            <span>Updated by {item.updatedByName} • </span>
                                                        )}
                                                        <span className="font-semibold">{item.weekendDays} days</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {(ongoingTopicsAlerts.delayedSubtopics?.length || 0) > 3 && (
                                                <p className="text-xs text-red-600 font-medium pl-2">
                                                    +{(ongoingTopicsAlerts.delayedSubtopics?.length || 0) - 3} more
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus`)}
                                            className="text-xs font-medium text-red-800 hover:text-red-900 underline"
                                        >
                                            View Syllabus Progress →
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {/* Weekend Attendance Alerts */}
                {isWeekend && weekendAlerts.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-semibold text-amber-800">Weekend Attendance Missing</h4>
                                    <Clock className="h-3 w-3 text-amber-600" />
                                </div>

                                {weekendAlerts.map((alert, index) => (
                                    <div key={`${alert.type}-${index}`} className="mt-2">
                                        {alert.type === 'student-attendance' && (
                                            <div>
                                                <p className="text-xs text-amber-700 font-medium mb-1">Students:</p>
                                                <div className="flex flex-wrap gap-1 mb-1.5">
                                                    {alert.levels?.map((level) => (
                                                        <span
                                                            key={level}
                                                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800"
                                                        >
                                                            {getLevelDisplay(level)}
                                                        </span>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={handleMarkStudentAttendance}
                                                    className="text-xs font-medium text-amber-800 hover:text-amber-900 underline"
                                                >
                                                    Mark Now →
                                                </button>
                                            </div>
                                        )}
                                        {alert.type === 'staff-attendance' && (
                                            <div>
                                                <p className="text-xs text-amber-700">
                                                    <span className="font-medium">Educators / CM:</span> {alert.count || 0} member{(alert.count || 0) > 1 ? 's' : ''} pending
                                                    <button
                                                        onClick={handleMarkAttendance}
                                                        className="ml-2 font-medium text-amber-800 hover:text-amber-900 underline"
                                                    >
                                                        Mark Now →
                                                    </button>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
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
                                    className={`relative ${alert.type === 'own-birthday'
                                        ? 'bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 border-4 border-orange-300 shadow-2xl'
                                        : 'bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 shadow-lg'
                                        } rounded-lg p-4 flex items-start space-x-3`}
                                >
                                    <div className="flex-shrink-0">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-lg`}>
                                            <img
                                                src={BdayCake}
                                                alt="Birthday"
                                                className="h-8 w-8"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className={`text-sm font-bold ${alert.type === 'own-birthday'
                                                ? 'text-orange-800 text-lg'
                                                : 'text-purple-800'
                                                }`}>
                                                {alert.title}
                                            </h4>
                                        </div>
                                        <p className={`text-sm mt-1 font-medium ${alert.type === 'own-birthday'
                                            ? 'text-orange-700 text-base'
                                            : 'text-purple-700'
                                            }`}>
                                            {alert.message}
                                        </p>
                                        {alert.people && alert.people.length > 0 && alert.type !== 'own-birthday' && (
                                            <div className="mt-2 flex flex-wrap gap-2 ">
                                                {alert.people.slice(0, 3).map((person: User | Student) => (
                                                    <button
                                                        onClick={(e) => {
                                                            try {
                                                                e.stopPropagation();

                                                                const isUser = 'roles' in person;
                                                                const firstName = person?.name?.split(' ')[0] || 'Friend';

                                                                const lineBreak = '\r\n\r\n';

                                                                const individualMessage = isUser
                                                                    ? `Happy Birthday, ${firstName}!${lineBreak}Your dedication and hard work in shaping young minds is truly inspiring. May this new year of your life bring you joy, success, and countless moments of fulfillment in your educational journey.${lineBreak}Wishing you a fantastic day filled with love, laughter, and all your favorite things.${lineBreak}Warm wishes from the Prangan team.`
                                                                    : `Happy Birthday, ${firstName}!${lineBreak}Wishing you a day full of happiness, fun, and all your favorite things. May this new year bring you exciting adventures, great achievements in your studies, and lots of wonderful memories.${lineBreak}Keep shining bright and never stop learning. You're amazing!${lineBreak}Best wishes from your friends at Prangan.`;

                                                                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(individualMessage)}`;
                                                                window.open(whatsappUrl, '_blank');
                                                            } catch (error) {
                                                                console.error('Error opening WhatsApp:', error);
                                                            }
                                                        }}
                                                        key={person.id}
                                                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800 border border-pink-200"
                                                    >
                                                        <span className="font-semibold">Send Wishes!</span>
                                                        <WhatsAppIcon size={14} className="text-green-600 ml-1" />
                                                    </button>
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

                {/* Students */}
                <div className="space-y-3">
                    <h2 className="text-sm font-medium text-gray-700 px-1">📚 Students</h2>
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

                {/* Student Attendance */}
                <ProtectedComponent allowedSubRoles={['CENTER_MANAGER', 'EDUCATOR']}>
                    <div className="space-y-3">
                        <h2 className="text-sm font-medium text-gray-700 px-1">📅 Student Attendance</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleMarkStudentAttendance}
                                className="flex flex-col items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-4 h-20 transition-colors"
                            >
                                <CalendarCheck className="h-5 w-5 shrink-0" />
                                <span className="text-xs font-medium">Mark Attendance</span>
                            </button>

                            <button
                                onClick={handleViewStudentAttendance}
                                className="flex flex-col items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg p-4 h-20 transition-colors"
                            >
                                <ClipboardList className="h-5 w-5 shrink-0" />
                                <span className="text-xs font-medium">View Attendance</span>
                            </button>
                        </div>
                    </div>
                </ProtectedComponent>

                {/* Curriculum & Assessment */}
                <div className="space-y-3">
                    <h2 className="text-sm font-medium text-gray-700 px-1">📖 Curriculum & Assessment</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Link
                            to="/library"
                            className="flex flex-col items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-4 h-20 transition-colors"
                        >
                            <BookOpen className="h-5 w-5" />
                            <span className="text-xs font-medium">Library</span>
                        </Link>
                        <button
                            onClick={() => navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus`)}
                            className="flex flex-col items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-4 h-20 transition-colors"
                        >
                            <List className="h-5 w-5" />
                            <span className="text-xs font-medium">Syllabus Tracker</span>
                        </button>
                        <button
                            onClick={() => navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`)}
                            className="flex flex-col items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg p-4 h-20 transition-colors"
                        >
                            <ClipboardCheck className="h-5 w-5" />
                            <span className="text-xs font-medium">Exam Tracker</span>
                        </button>
                    </div>
                </div>

                {/* Staff Management */}
                <ProtectedComponent allowedSubRoles={['CENTER_MANAGER']}>
                    <div className="space-y-3">
                        <h2 className="text-sm font-medium text-gray-700 px-1">👥 Educators Management</h2>
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
                </ProtectedComponent>

                {/* Admin */}
                <ProtectedComponent requireAdmin>
                    <div className="space-y-3">
                        <h2 className="text-sm font-medium text-gray-700 px-1">⚙️ Administration</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleRegistrationRequests}
                                className="flex flex-col items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg p-4 h-20 transition-colors"
                            >
                                <UserPlus className="h-5 w-5" />
                                <span className="text-xs font-medium">Registration Requests</span>
                            </button>
                            <button
                                onClick={handleManageUsers}
                                className="flex flex-col items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-4 h-20 transition-colors"
                            >
                                <UserCog className="h-5 w-5" />
                                <span className="text-xs font-medium">Manage Users</span>
                            </button>
                        </div>
                    </div>
                </ProtectedComponent>

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

                {/* Future Profession Showcase - At Bottom */}
                {students.some(s => s.futureProfessionImageUrl) && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-2xl">✨</span>
                            <h2 className="text-sm font-medium text-gray-700">Future Profession Showcase</h2>
                        </div>
                        <FutureProfessionCarousel
                            students={students}
                            autoPlayInterval={6000}
                        />
                    </div>
                )}
            </div >
        </>
    );
};

export default Dashboard;



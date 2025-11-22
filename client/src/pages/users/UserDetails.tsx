import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    GraduationCap,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    DollarSign,
    CheckCircle,
    BarChart3,
    PieChart,
    Activity,
    Target,
    Award,
    Edit
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    Area,
    AreaChart
} from 'recharts';
import { useUser } from '@/hooks/useUserQueries';
import { useAttendanceRecords } from '@/hooks/useAttendanceQueries';
import { useProjects } from '@/hooks/useProjectQueries';
import { useCenters } from '@/hooks/useCenterQueries';
import { useSemesters } from '@/hooks/useSemesterQueries';
import { ProfilePicture } from '@/components/ui';
import LoadingButterfly from '@/components/LoadingButterfly';
import DoodleBackground from '@/components/DoodleBackground';

// Chart colors
const COLORS = {
    present: '#10b981',
    absent: '#ef4444',
    notAvailable: '#f59e0b',
    holiday: '#6b7280',
    primary: '#f97316',
    secondary: '#3b82f6',
    accent: '#8b5cf6'
};

const COMMITTED_DAYS_MAP = {
    'SATURDAY': 'Saturday',
    'SUNDAY': 'Sunday',
    'BOTH': 'Both Days'
};

const SUB_ROLE_MAP = {
    'TRAINING_DEVELOPMENT': 'Training & Development',
    'RECRUITMENT': 'Recruitment',
    'GROWTH_DEVELOPMENT': 'Growth & Development',
    'CURRICULUM_MENTOR': 'Curriculum Mentor',
    'TECH': 'Tech',
    'CENTER_MANAGER': 'Center Manager',
    'EDUCATOR': 'Educator'
};

const UserDetails = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { data: user, isLoading: userLoading, error: userError } = useUser(userId!);

    // Get current date and calculate date ranges
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Calculate start of current semester (assuming academic year starts in July)
    const semesterStart = new Date(currentMonth >= 6 ? currentYear : currentYear - 1, 6, 1);

    // Date range for attendance data (last 6 months or semester range)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const startDate = semesterStart > sixMonthsAgo ? semesterStart.toISOString().split('T')[0] : sixMonthsAgo.toISOString().split('T')[0];
    const endDate = currentDate.toISOString().split('T')[0];

    // Fetch attendance data
    const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceRecords({
        userId,
        startDate,
        endDate,
        limit: 1000
    });

    // Fetch projects, centers, and semesters for displaying in role assignments
    const { data: projects = [] } = useProjects();
    const { data: centers = [] } = useCenters();
    const { data: semesters = [] } = useSemesters();

    // Create lookup maps for efficient O(1) access
    const projectsMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
    const centersMap = useMemo(() => new Map(centers.map(c => [c.id, c])), [centers]);
    const semestersMap = useMemo(() => new Map(semesters.map(s => [s.id, s])), [semesters]);

    // Calculate analytics
    const analytics = useMemo(() => {
        const attendance = attendanceData?.attendances || [];

        if (!attendance.length) {
            return {
                totalDays: 0,
                presentDays: 0,
                absentDays: 0,
                notAvailableDays: 0,
                holidayDays: 0,
                attendancePercentage: 0,
                totalRemuneration: 0,
                monthlyData: [],
                committedDaysAnalysis: [],
                averageMonthlyAttendance: 0,
                bestMonth: null,
                worstMonth: null,
                recentTrend: 'stable'
            };
        }

        const totalDays = attendance.length;
        const presentDays = attendance.filter(record => record.status === 'PRESENT').length;
        const absentDays = attendance.filter(record => record.status === 'ABSENT').length;
        const notAvailableDays = attendance.filter(record => record.status === 'NOT_AVAILABLE').length;
        const holidayDays = attendance.filter(record => record.status === 'HOLIDAY').length;

        const attendancePercentage = totalDays > 0 ? parseFloat(((presentDays / (totalDays - holidayDays)) * 100).toFixed(1)) : 0;

        // Calculate remuneration (using current reimbursement amount per present day for educators/center managers)
        const reimbursementRate = user?.reimbursementAmount || 500;

        // Monthly breakdown - using logic similar to Renumeration.tsx
        const monthlyMap = new Map<string, {
            month: string;
            monthName: string;
            total: number;
            present: number;
            absent: number;
            notAvailable: number;
            holiday: number;
            remuneration: number;
        }>();

        // First pass: collect monthly stats
        attendance.forEach(record => {
            const monthKey = record.date?.substring(0, 7) || '';
            if (!monthlyMap.has(monthKey)) {
                monthlyMap.set(monthKey, {
                    month: monthKey,
                    monthName: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    total: 0,
                    present: 0,
                    absent: 0,
                    notAvailable: 0,
                    holiday: 0,
                    remuneration: 0
                });
            }
            const monthData = monthlyMap.get(monthKey)!;
            monthData.total++;

            switch (record.status) {
                case 'PRESENT':
                    monthData.present++;
                    break;
                case 'ABSENT':
                    monthData.absent++;
                    break;
                case 'NOT_AVAILABLE':
                    monthData.notAvailable++;
                    break;
                case 'HOLIDAY':
                    monthData.holiday++;
                    break;
            }
        });

        // Second pass: calculate remuneration per month (only for EDUCATOR/CENTER_MANAGER roles)
        for (const [monthKey, monthData] of monthlyMap.entries()) {
            const monthAttendance = attendance.filter(record =>
                record.date?.substring(0, 7) === monthKey &&
                record.status === 'PRESENT' &&
                (record.roleAssignment?.subRole === 'EDUCATOR' || record.roleAssignment?.subRole === 'CENTER_MANAGER')
            );
            monthData.remuneration = monthAttendance.length * reimbursementRate;
        }

        const monthlyData = Array.from(monthlyMap.values()).map(month => ({
            ...month,
            attendanceRate: month.total - month.holiday > 0 ? parseFloat(((month.present / (month.total - month.holiday)) * 100).toFixed(1)) : 0
        })).sort((a, b) => a.month.localeCompare(b.month));

        // Use sum of monthly remuneration for consistency
        const calculatedTotalRemuneration = monthlyData.reduce((sum, month) => sum + month.remuneration, 0);

        // Get user's committed days from active role assignments
        const userCommittedDays = user?.roleAssignments
            ?.filter(assignment => assignment.isActive)
            ?.map(assignment => assignment.committedDays)
            ?.filter(Boolean) || [];

        // Committed days analysis (excluding holidays and only for committed days)
        const committedDaysMap = new Map<string, {
            day: string;
            total: number;
            present: number;
            absent: number;
            notAvailable: number;
            holiday: number;
            isCommitted: boolean;
        }>();

        attendance.forEach(record => {
            const dayOfWeek = new Date(record.date + 'T00:00:00Z').getDay(); // 0 = Sunday, 6 = Saturday
            const dayName = dayOfWeek === 0 ? 'SUNDAY' : dayOfWeek === 6 ? 'SATURDAY' : 'WEEKDAY';

            if (dayName !== 'WEEKDAY') {
                if (!committedDaysMap.has(dayName)) {
                    // Check if user is committed to this day
                    const isCommitted = userCommittedDays.some(committedDay =>
                        committedDay === dayName ||
                        (committedDay === 'BOTH' && (dayName === 'SATURDAY' || dayName === 'SUNDAY'))
                    );

                    committedDaysMap.set(dayName, {
                        day: dayName,
                        total: 0,
                        present: 0,
                        absent: 0,
                        notAvailable: 0,
                        holiday: 0,
                        isCommitted
                    });
                }
                const dayData = committedDaysMap.get(dayName)!;

                switch (record.status) {
                    case 'PRESENT':
                        dayData.present++;
                        dayData.total++;
                        break;
                    case 'ABSENT':
                        dayData.absent++;
                        dayData.total++;
                        break;
                    case 'NOT_AVAILABLE':
                        dayData.notAvailable++;
                        dayData.total++;
                        break;
                    case 'HOLIDAY':
                        dayData.holiday++;
                        // Don't count holidays in total
                        break;
                }
            }
        });

        const committedDaysAnalysis = Array.from(committedDaysMap.values())
            .map(day => ({
                ...day,
                attendanceRate: day.total > 0 ? parseFloat(((day.present / day.total) * 100).toFixed(1)) : 0
            }))
            .sort((a, b) => {
                // Sort Saturday first, then Sunday
                const order = { 'SATURDAY': 0, 'SUNDAY': 1 };
                return (order[a.day as keyof typeof order] || 2) - (order[b.day as keyof typeof order] || 2);
            });

        // Calculate averages and trends
        const averageMonthlyAttendance = monthlyData.length > 0
            ? parseFloat((monthlyData.reduce((sum, month) => sum + month.attendanceRate, 0) / monthlyData.length).toFixed(1))
            : 0;

        const bestMonth = monthlyData.length > 0
            ? monthlyData.reduce((best, current) => current.attendanceRate > best.attendanceRate ? current : best)
            : null;

        const worstMonth = monthlyData.length > 0
            ? monthlyData.reduce((worst, current) => current.attendanceRate < worst.attendanceRate ? current : worst)
            : null;

        // Recent trend (last 3 months vs previous 3 months)
        // Need at least 6 months of data to calculate meaningful trend
        let recentTrend = 'stable';
        if (monthlyData.length >= 6) {
            const recentMonths = monthlyData.slice(-3); // Last 3 months
            const previousMonths = monthlyData.slice(-6, -3); // Previous 3 months (months 4-6 from end)

            const recentAvg = recentMonths.length > 0 ? recentMonths.reduce((sum, m) => sum + m.attendanceRate, 0) / recentMonths.length : 0;
            const previousAvg = previousMonths.length > 0 ? previousMonths.reduce((sum, m) => sum + m.attendanceRate, 0) / previousMonths.length : 0;

            // Only calculate trend if we have data for both periods
            if (recentMonths.length === 3 && previousMonths.length === 3) {
                if (recentAvg > previousAvg + 5) recentTrend = 'improving';
                else if (recentAvg < previousAvg - 5) recentTrend = 'declining';
            }
        } else if (monthlyData.length >= 2) {
            // For fewer months, compare last month with first month
            const lastMonth = monthlyData[monthlyData.length - 1];
            const firstMonth = monthlyData[0];

            if (lastMonth.attendanceRate > firstMonth.attendanceRate + 10) recentTrend = 'improving';
            else if (lastMonth.attendanceRate < firstMonth.attendanceRate - 10) recentTrend = 'declining';
        }

        return {
            totalDays,
            presentDays,
            absentDays,
            notAvailableDays,
            holidayDays,
            attendancePercentage,
            totalRemuneration: calculatedTotalRemuneration, // Use sum of monthly remuneration for consistency
            monthlyData,
            committedDaysAnalysis,
            averageMonthlyAttendance,
            bestMonth,
            worstMonth,
            recentTrend
        };
    }, [attendanceData?.attendances, user?.reimbursementAmount, user?.roleAssignments]);

    if (userLoading || attendanceLoading) {
        return (
            <>
                <DoodleBackground numElements={8} />
                <div className="relative z-1 flex justify-center items-center min-h-[400px]">
                    <LoadingButterfly size="md" />
                </div>
            </>
        );
    }

    if (userError || !user) {
        return (
            <>
                <DoodleBackground numElements={8} />
                <div className="relative z-1 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                        <p className="text-red-700">Failed to load user details. Please try again.</p>
                    </div>
                    <button
                        onClick={() => navigate('/users')}
                        className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Users
                    </button>
                </div>
            </>
        );
    }

    const pieData = [
        { name: 'Present', value: analytics.presentDays, color: COLORS.present },
        { name: 'Absent', value: analytics.absentDays, color: COLORS.absent },
        { name: 'Not Available', value: analytics.notAvailableDays, color: COLORS.notAvailable },
        { name: 'Holiday', value: analytics.holidayDays, color: COLORS.holiday }
    ].filter(item => item.value > 0);

    return (
        <>
            <DoodleBackground numElements={12} />
            <div className="relative z-1 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate('/users')}
                        >
                            <ArrowLeft className="w-5 h-5 mr-1" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">User Details</h1>
                            <p className="text-gray-600">Comprehensive attendance and performance analytics</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between space-x-3">
                        <div className="flex items-center space-x-3">
                            <ProfilePicture
                                imageUrl={user.profileImageUrl}
                                name={user.name}
                                size="w-12 h-12"
                                colorScheme="orange"
                                className="border-2 border-orange-100"
                            />
                            <div>
                                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-600">{user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(`/users/${user.id}/edit`)}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors"
                        >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit User
                        </button>
                    </div>
                </div>

                {/* User Information Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm"
                >
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center">
                            <User className="w-5 h-5 text-gray-400 mr-2" />
                            <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="flex items-center">
                                <Mail className="w-4 h-4 text-gray-400 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Email</p>
                                    <p className="text-sm text-gray-900">{user.email}</p>
                                </div>
                            </div>
                            {user.phone && (
                                <div className="flex items-center">
                                    <Phone className="w-4 h-4 text-gray-400 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Phone</p>
                                        <p className="text-sm text-gray-900">{user.phone}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center">
                                <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Role</p>
                                    <p className="text-sm text-gray-900">{user.role}</p>
                                </div>
                            </div>
                            {user.qualification && (
                                <div className="flex items-center">
                                    <GraduationCap className="w-4 h-4 text-gray-400 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Qualification</p>
                                        <p className="text-sm text-gray-900">{user.qualification}</p>
                                    </div>
                                </div>
                            )}
                            {user.address && (
                                <div className="flex items-start md:col-span-2">
                                    <MapPin className="w-4 h-4 text-gray-400 mr-3 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Address</p>
                                        <p className="text-sm text-gray-900">{user.address}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Role Assignments */}
                        {user.roleAssignments && user.roleAssignments.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Role Assignments</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {user.roleAssignments.filter(assignment => assignment.isActive).map((assignment, index) => {
                                        const project = assignment.projectId ? projectsMap.get(assignment.projectId) : null;
                                        const center = assignment.centerId ? centersMap.get(assignment.centerId) : null;
                                        const semester = assignment.semesterId ? semestersMap.get(assignment.semesterId) : null;

                                        return (
                                            <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                                                <p className="text-sm font-medium text-gray-800">
                                                    {SUB_ROLE_MAP[assignment.subRole] || assignment.subRole}
                                                </p>

                                                {/* Project/Center/Semester Info */}
                                                <div className="mt-2 space-y-1">
                                                    {project && (
                                                        <div className="flex items-center text-xs text-gray-600">
                                                            <span className="mr-1">📁</span>
                                                            <span>{project.name}</span>
                                                        </div>
                                                    )}
                                                    {center && (
                                                        <div className="flex items-center text-xs text-gray-600">
                                                            <span className="mr-1">📍</span>
                                                            <span>{center.name}</span>
                                                        </div>
                                                    )}
                                                    {semester && (
                                                        <div className="flex items-center text-xs text-gray-600">
                                                            <span className="mr-1">📅</span>
                                                            <span>{semester.name}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {assignment.level && assignment.subRole === 'EDUCATOR' && (
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        Level: {assignment.level.replace('_', ' ')}
                                                    </p>
                                                )}
                                                {assignment.committedDays && (assignment.subRole === 'CENTER_MANAGER' || assignment.subRole === 'EDUCATOR') && (
                                                    <p className="text-xs text-gray-600">
                                                        Committed: {COMMITTED_DAYS_MAP[assignment.committedDays] || assignment.committedDays}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
                    >
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {analytics.attendancePercentage.toFixed(1)}%
                                </p>
                                <div className="flex items-center mt-1">
                                    {analytics.recentTrend === 'improving' && (
                                        <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                                    )}
                                    {analytics.recentTrend === 'declining' && (
                                        <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                                    )}
                                    <span className={`text-xs ${analytics.recentTrend === 'improving' ? 'text-green-600' :
                                        analytics.recentTrend === 'declining' ? 'text-red-600' :
                                            'text-gray-500'
                                        }`}>
                                        {analytics.recentTrend === 'improving' ? 'Improving' :
                                            analytics.recentTrend === 'declining' ? 'Declining' :
                                                'Stable'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
                    >
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Present Days</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.presentDays}</p>
                                <p className="text-xs text-gray-500">
                                    out of {analytics.totalDays - analytics.holidayDays} working days
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
                    >
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                    <DollarSign className="w-4 h-4 text-orange-600" />
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Remuneration</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    ₹{analytics.totalRemuneration.toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs text-gray-500">
                                    @ ₹{(user.reimbursementAmount || 500).toLocaleString('en-IN')}/day
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
                    >
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                    <Activity className="w-4 h-4 text-purple-600" />
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Avg Monthly</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {analytics.averageMonthlyAttendance.toFixed(1)}%
                                </p>
                                <p className="text-xs text-gray-500">attendance rate</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly Attendance Trend */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white rounded-lg border border-gray-200 shadow-sm"
                    >
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center">
                                <BarChart3 className="w-5 h-5 text-gray-400 mr-2" />
                                <h3 className="text-lg font-medium text-gray-900">Monthly Attendance Trend</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics.monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="monthName"
                                            tick={{ fontSize: 12 }}
                                            angle={-45}
                                            textAnchor="end"
                                            height={70}
                                        />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            formatter={(value, name) => [
                                                name === 'attendanceRate' ? `${parseFloat(String(value)).toFixed(1)}%` : value,
                                                name === 'attendanceRate' ? 'Attendance Rate' : name
                                            ]}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="attendanceRate"
                                            stroke={COLORS.primary}
                                            fill={COLORS.primary}
                                            fillOpacity={0.2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </motion.div>

                    {/* Attendance Distribution */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-white rounded-lg border border-gray-200 shadow-sm"
                    >
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center">
                                <PieChart className="w-5 h-5 text-gray-400 mr-2" />
                                <h3 className="text-lg font-medium text-gray-900">Attendance Distribution</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Tooltip
                                            formatter={(value, name) => [
                                                `${value} days`,
                                                name
                                            ]}
                                        />
                                        <Legend />
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            dataKey="value"
                                            label
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Monthly Remuneration and Committed Days Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly Remuneration */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="bg-white rounded-lg border border-gray-200 shadow-sm"
                    >
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center">
                                <DollarSign className="w-5 h-5 text-gray-400 mr-2" />
                                <h3 className="text-lg font-medium text-gray-900">Monthly Remuneration</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="monthName"
                                            tick={{ fontSize: 12 }}
                                            angle={-45}
                                            textAnchor="end"
                                            height={70}
                                        />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Remuneration']}
                                        />
                                        <Bar
                                            dataKey="remuneration"
                                            fill={COLORS.secondary}
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </motion.div>

                    {/* Weekend Days Analysis */}
                    {analytics.committedDaysAnalysis.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="bg-white rounded-lg border border-gray-200 shadow-sm"
                        >
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center">
                                    <Target className="w-5 h-5 text-gray-400 mr-2" />
                                    <h3 className="text-lg font-medium text-gray-900">Weekend Days Performance</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {analytics.committedDaysAnalysis.length > 0 ? (
                                        analytics.committedDaysAnalysis.map((dayData) => (
                                            <div
                                                key={dayData.day}
                                                className={`flex items-center justify-between p-4 rounded-lg border ${dayData.isCommitted
                                                    ? 'bg-orange-50 border-orange-200'
                                                    : 'bg-gray-50 border-gray-200'
                                                    }`}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className={`font-medium ${dayData.isCommitted ? 'text-orange-900' : 'text-gray-700'
                                                            }`}>
                                                            {COMMITTED_DAYS_MAP[dayData.day as keyof typeof COMMITTED_DAYS_MAP] || dayData.day}
                                                        </p>
                                                        {dayData.isCommitted ? (
                                                            <span className="px-2 py-1 text-xs font-medium bg-orange-200 text-orange-800 rounded-full">
                                                                Committed
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                                                                Not Committed
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={`text-sm mt-1 ${dayData.isCommitted ? 'text-orange-700' : 'text-gray-600'
                                                        }`}>
                                                        {dayData.present} / {dayData.total} working days present
                                                    </p>
                                                    {dayData.holiday > 0 && (
                                                        <p className={`text-xs ${dayData.isCommitted ? 'text-orange-600' : 'text-gray-500'
                                                            }`}>
                                                            ({dayData.holiday} holidays excluded)
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-2xl font-bold ${dayData.isCommitted ? 'text-orange-900' : 'text-gray-700'
                                                        }`}>
                                                        {dayData.attendanceRate.toFixed(1)}%
                                                    </p>
                                                    <div className={`w-20 rounded-full h-2 mt-1 relative overflow-hidden ${dayData.isCommitted ? 'bg-orange-200' : 'bg-gray-200'
                                                        }`}>
                                                        <div
                                                            className={`h-2 rounded-full absolute left-0 top-0 transition-all duration-300 ${dayData.attendanceRate >= 80 ? 'bg-green-500' :
                                                                dayData.attendanceRate >= 60 ? 'bg-yellow-500' :
                                                                    'bg-red-500'
                                                                } ${dayData.attendanceRate >= 90 ? 'w-full' :
                                                                    dayData.attendanceRate >= 80 ? 'w-5/6' :
                                                                        dayData.attendanceRate >= 70 ? 'w-3/4' :
                                                                            dayData.attendanceRate >= 60 ? 'w-2/3' :
                                                                                dayData.attendanceRate >= 50 ? 'w-1/2' :
                                                                                    dayData.attendanceRate >= 25 ? 'w-1/4' : 'w-1/12'
                                                                }`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <p>No weekend attendance data found.</p>
                                            <p className="text-sm mt-1">Weekend attendance data may not be available.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Performance Insights */}
                {(analytics.bestMonth || analytics.worstMonth) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 }}
                        className="bg-white rounded-lg border border-gray-200 shadow-sm"
                    >
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center">
                                <Award className="w-5 h-5 text-gray-400 mr-2" />
                                <h3 className="text-lg font-medium text-gray-900">Performance Insights</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {analytics.bestMonth && (
                                    <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-200">
                                        <div className="flex-shrink-0">
                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                <TrendingUp className="w-4 h-4 text-green-600" />
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-green-800">Best Month</p>
                                            <p className="text-lg font-bold text-green-900">
                                                {analytics.bestMonth.monthName}
                                            </p>
                                            <p className="text-sm text-green-700">
                                                {analytics.bestMonth.attendanceRate.toFixed(1)}% attendance
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {analytics.worstMonth && analytics.worstMonth !== analytics.bestMonth && (
                                    <div className="flex items-center p-4 bg-red-50 rounded-lg border border-red-200">
                                        <div className="flex-shrink-0">
                                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                                <TrendingDown className="w-4 h-4 text-red-600" />
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-red-800">Needs Improvement</p>
                                            <p className="text-lg font-bold text-red-900">
                                                {analytics.worstMonth.monthName}
                                            </p>
                                            <p className="text-sm text-red-700">
                                                {analytics.worstMonth.attendanceRate.toFixed(1)}% attendance
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </>
    );
};

export default UserDetails;

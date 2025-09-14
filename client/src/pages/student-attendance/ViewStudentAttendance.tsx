import { useMemo, useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
    CalendarIcon,
    UserIcon,
    CheckIcon,
    XIcon,
    Eye,
    Users,
    Calendar,
    FileText,
    FileSpreadsheet,
    Download,
    ChevronDown
} from "lucide-react";
import { useStudentAttendanceRecords } from "@/hooks/useStudentAttendanceQueries";
import LoadingButterfly from "@/components/LoadingButterfly";
import { ProfilePicture } from "@/components/ui";
import { CustomButton } from "@/components/ui/custom-button";
import type { StudentAttendanceRecord } from "@/types/api";
import { useSemester } from "@/hooks/useSemesterQueries";
import toast from "react-hot-toast";

export const ViewStudentAttendance = () => {
    const { projectId, centerId, semesterId } = useParams();
    // Timeframe selection: single date | month | full semester
    const [timeframe, setTimeframe] = useState<"single" | "month" | "semester">("single");
    const [singleDate, setSingleDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [month, setMonth] = useState<string>(""); // format YYYY-MM
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [selectedMonth, setSelectedMonth] = useState<string>(""); // 01..12
    const [selectedStatus, setSelectedStatus] = useState<string>("");
    const [selectedLevel, setSelectedLevel] = useState<string>("");

    // Fetch semester to know start/end for full semester option
    const { data: semester } = useSemester(semesterId!);

    // Compute date params based on timeframe selection
    const { date, startDate, endDate } = useMemo(() => {
        if (timeframe === "single" && singleDate) {
            return { date: singleDate } as const;
        }
        if (timeframe === "month" && month) {
            const [y, m] = month.split("-").map(Number);
            if (y && m) {
                const first = new Date(Date.UTC(y, m - 1, 1));
                const last = new Date(Date.UTC(y, m, 0));
                const fmt = (d: Date) => d.toISOString().slice(0, 10);
                return { startDate: fmt(first), endDate: fmt(last) } as const;
            }
        }
        if (timeframe === "semester" && semester?.startDate && semester?.endDate) {
            return {
                startDate: new Date(semester.startDate).toISOString().slice(0, 10),
                endDate: new Date(semester.endDate).toISOString().slice(0, 10),
            } as const;
        }
        return {} as { date?: string; startDate?: string; endDate?: string };
    }, [timeframe, singleDate, month, semester?.startDate, semester?.endDate]);

    const { data: attendanceData, isLoading, error } = useStudentAttendanceRecords({
        projectId: projectId!,
        centerId: centerId!,
        semesterId: semesterId!,
        ...(date ? { date } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(selectedStatus ? { status: selectedStatus } : {}),
    });

    // Build month string when year/month selects change
    const years = useMemo(() => {
        const now = new Date().getUTCFullYear();
        const list: number[] = [];
        for (let y = now - 3; y <= now + 1; y++) list.push(y);
        return list;
    }, []);
    const months = [
        { value: "01", label: "Jan" },
        { value: "02", label: "Feb" },
        { value: "03", label: "Mar" },
        { value: "04", label: "Apr" },
        { value: "05", label: "May" },
        { value: "06", label: "Jun" },
        { value: "07", label: "Jul" },
        { value: "08", label: "Aug" },
        { value: "09", label: "Sep" },
        { value: "10", label: "Oct" },
        { value: "11", label: "Nov" },
        { value: "12", label: "Dec" },
    ];
    const onYearChange = (y: string) => {
        setSelectedYear(y);
        const mm = selectedMonth;
        setMonth(y && mm ? `${y}-${mm}` : "");
    };
    const onMonthChange = (m: string) => {
        setSelectedMonth(m);
        const y = selectedYear;
        setMonth(y && m ? `${y}-${m}` : "");
    };

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

    // Client-side filter by level (API may not support level filtering)
    const filteredAttendance = useMemo(() => {
        const records = attendanceData?.attendance || [];
        if (!selectedLevel) return records;
        return records.filter(rec => rec.enrollment?.level === selectedLevel);
    }, [attendanceData?.attendance, selectedLevel]);

    const getAttendanceStats = () => {
        const list = filteredAttendance;
        if (!list) return null;

        const total = list.length;
        const present = list.filter(record => record.status === 'PRESENT').length;
        const absent = list.filter(record => record.status === 'ABSENT').length;
        const holidays = list.filter(record => record.status === 'HOLIDAY').length;

        const workingDays = total - holidays;
        const attendancePercentage = workingDays > 0 ? ((present / workingDays) * 100).toFixed(1) : '0.0';

        return { total, present, absent, holidays, attendancePercentage, workingDays };
    };

    const stats = getAttendanceStats();
    const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
    const [isExporting, setIsExporting] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const toggleNote = (id: string) =>
        setOpenNotes((prev) => ({ ...prev, [id]: !prev[id] }));

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowExportDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Export functionality
    const getExportData = () => {
        const sortedData = filteredAttendance
            .slice()
            .sort((a, b) => {
                // Get levels for both records
                const levelA = a.enrollment?.level || '';
                const levelB = b.enrollment?.level || '';

                // Define level priority order
                const levelOrder = {
                    'PRIMARY_A': 1,
                    'PRIMARY_B': 2,
                    'LEVEL_1': 3,
                    'LEVEL_2': 4,
                    'LEVEL_3': 5,
                    'LEVEL_4': 6,
                };

                const priorityA = levelOrder[levelA as keyof typeof levelOrder] || 999;
                const priorityB = levelOrder[levelB as keyof typeof levelOrder] || 999;

                // First sort by level priority
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                // Then sort alphabetically by student name within the same level
                const nameA = a.student?.name || 'Unknown Student';
                const nameB = b.student?.name || 'Unknown Student';
                return nameA.localeCompare(nameB);
            });

        return sortedData.map((record, index) => ({
            'S.No': index + 1,
            'Student Name': record.student?.name || 'Unknown Student',
            'Level': record.enrollment?.level?.replace('_', ' ') || 'N/A',
            'Date': new Date(record.date).toLocaleDateString(),
            'Status': record.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
            'Holiday Reason': record.status === 'HOLIDAY' ? record.holidayReason || '-' : '-',
            'Marked By': record.markedByUser?.name || 'System',
            'Marked At': record.markedAt ? new Date(record.markedAt).toLocaleString() : '-',
            'Notes': record.notes || '-'
        }));
    };

    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            // Dynamically import xlsx to reduce bundle size
            const XLSX = await import('xlsx');

            const exportData = getExportData();
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();

            // Set column widths
            const colWidths = [
                { wch: 8 },  // S.No
                { wch: 25 }, // Student Name
                { wch: 12 }, // Level
                { wch: 12 }, // Date
                { wch: 10 }, // Status
                { wch: 20 }, // Holiday Reason
                { wch: 15 }, // Marked By
                { wch: 20 }, // Marked At
                { wch: 30 }  // Notes
            ];
            worksheet['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Records');

            // Generate filename
            const dateRange = timeframe === 'single'
                ? singleDate
                : timeframe === 'month'
                    ? month
                    : 'Full Semester';
            const filename = `Student_Attendance_${dateRange.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;

            XLSX.writeFile(workbook, filename);
            toast.success('Excel file downloaded successfully!');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            toast.error('Failed to export Excel file');
        } finally {
            setIsExporting(false);
        }
    };

    const exportToPDF = async () => {
        setIsExporting(true);
        try {
            // Dynamically import jsPDF and autoTable to reduce bundle size
            const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;

            const doc = new jsPDF();
            const exportData = getExportData();

            // Add logo
            try {
                const img = new Image();
                img.src = '/images/logo/prangan-logo-light-mode.png';
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                // Add logo at top right (scaled down)
                doc.addImage(img, 'PNG', 160, 5, 40, 20);
            } catch (logoError) {
                console.warn('Could not load logo:', logoError);
            }

            // Add title
            doc.setFontSize(16);
            doc.text('Student Attendance Report', 14, 15);

            // Add filters info
            doc.setFontSize(10);
            let yPos = 25;
            doc.text(`Timeframe: ${timeframe === 'single' ? singleDate : timeframe === 'month' ? month : 'Full Semester'}`, 14, yPos);
            yPos += 5;
            if (selectedStatus) {
                doc.text(`Status: ${selectedStatus}`, 14, yPos);
                yPos += 5;
            }
            if (selectedLevel) {
                doc.text(`Level: ${selectedLevel.replace('_', ' ')}`, 14, yPos);
                yPos += 5;
            }
            if (stats) {
                doc.text(`Total Records: ${stats.total}, Present: ${stats.present}, Absent: ${stats.absent}, Holidays: ${stats.holidays}`, 14, yPos);
                yPos += 5;
            }

            // Add table
            const tableColumns = ['S.No', 'Student Name', 'Level', 'Date', 'Status', 'Marked By'];
            const tableRows = exportData.map(row => [
                row['S.No'],
                row['Student Name'],
                row['Level'],
                row['Date'],
                row['Status'],
                row['Marked By']
            ]);

            autoTable(doc, {
                head: [tableColumns],
                body: tableRows,
                startY: yPos + 5,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [255, 152, 0] }, // Orange theme
                columnStyles: {
                    0: { cellWidth: 15 }, // S.No
                    1: { cellWidth: 40 }, // Student Name
                    2: { cellWidth: 25 }, // Level
                    3: { cellWidth: 25 }, // Date
                    4: { cellWidth: 20 }, // Status
                    5: { cellWidth: 30 }  // Marked By
                }
            });

            // Generate filename
            const dateRange = timeframe === 'single'
                ? singleDate
                : timeframe === 'month'
                    ? month
                    : 'Full Semester';
            const filename = `Student_Attendance_${dateRange.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

            doc.save(filename);
            toast.success('PDF file downloaded successfully!');
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            toast.error('Failed to export PDF file');
        } finally {
            setIsExporting(false);
        }
    };

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
        <div className="p-3 sm:p-4 md:p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto"
            >
                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 flex items-center">
                        <Eye className="w-6 h-6 mr-2 text-orange-600" />
                        View Student Attendance
                    </h1>
                    <p className="text-sm text-gray-600">
                        View and analyze student attendance records
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border p-3 mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-gray-600" />
                        Filters
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        {/* Timeframe selector */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Timeframe</label>
                            <div className="flex flex-wrap gap-3 text-xs">
                                <label className="inline-flex items-center gap-1">
                                    <input
                                        type="radio"
                                        name="timeframe"
                                        value="single"
                                        checked={timeframe === 'single'}
                                        onChange={() => setTimeframe('single')}
                                    />
                                    Single Date
                                </label>
                                <label className="inline-flex items-center gap-1">
                                    <input
                                        type="radio"
                                        name="timeframe"
                                        value="month"
                                        checked={timeframe === 'month'}
                                        onChange={() => setTimeframe('month')}
                                    />
                                    Month
                                </label>
                                <label className="inline-flex items-center gap-1">
                                    <input
                                        type="radio"
                                        name="timeframe"
                                        value="semester"
                                        checked={timeframe === 'semester'}
                                        onChange={() => setTimeframe('semester')}
                                    />
                                    Full Semester
                                </label>
                            </div>
                            <div className="mt-2">
                                {timeframe === 'single' && (
                                    <input
                                        type="date"
                                        value={singleDate}
                                        onChange={(e) => setSingleDate(e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    />
                                )}
                                {timeframe === 'month' && (
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => onYearChange(e.target.value)}
                                            className="w-1/2 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        >
                                            <option value="">Year</option>
                                            {years.map((y) => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={selectedMonth}
                                            onChange={(e) => onMonthChange(e.target.value)}
                                            className="w-1/2 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        >
                                            <option value="">Month</option>
                                            {months.map((m) => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {timeframe === 'semester' && (
                                    <div className="text-xs text-gray-600">
                                        {semester ? (
                                            <span>
                                                {new Date(semester.startDate).toLocaleDateString()} - {new Date(semester.endDate).toLocaleDateString()}
                                            </span>
                                        ) : (
                                            <span>Loading semester dates…</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                            >
                                <option value="">All</option>
                                <option value="PRESENT">Present</option>
                                <option value="ABSENT">Absent</option>
                                <option value="HOLIDAY">Holiday</option>
                            </select>
                        </div>

                        {/* Level */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
                            <select
                                value={selectedLevel}
                                onChange={(e) => setSelectedLevel(e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                            >
                                <option value="">All</option>
                                <option value="PRIMARY_A">Primary A</option>
                                <option value="PRIMARY_B">Primary B</option>
                                <option value="LEVEL_1">Level 1</option>
                                <option value="LEVEL_2">Level 2</option>
                                <option value="LEVEL_3">Level 3</option>
                                <option value="LEVEL_4">Level 4</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                {stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                        <div className="bg-white p-3 rounded-lg shadow-sm border">
                            <div className="text-lg font-bold text-gray-900">{stats.total}</div>
                            <div className="text-xs text-gray-600">Total</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border">
                            <div className="text-lg font-bold text-green-600">{stats.present}</div>
                            <div className="text-xs text-gray-600">Present</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border">
                            <div className="text-lg font-bold text-red-600">{stats.absent}</div>
                            <div className="text-xs text-gray-600">Absent</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border">
                            <div className="text-lg font-bold text-blue-600">{stats.holidays}</div>
                            <div className="text-xs text-gray-600">Holidays</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border col-span-2 lg:col-span-1">
                            <div className="text-lg font-bold text-orange-600">{stats.attendancePercentage}%</div>
                            <div className="text-xs text-gray-600">Rate</div>
                        </div>
                    </div>
                )}

                {/* Export Button */}
                {filteredAttendance && filteredAttendance.length > 0 && (
                    <div className="flex justify-end mb-4">
                        <div className="relative" ref={dropdownRef}>
                            <CustomButton
                                onClick={() => setShowExportDropdown(!showExportDropdown)}
                                isLoading={isExporting}
                                loadingMessage="Exporting..."
                                className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2"
                            >
                                <Download className="w-4 h-4" />
                                Export
                                <ChevronDown className="w-4 h-4" />
                            </CustomButton>

                            {/* Dropdown Menu */}
                            {showExportDropdown && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                                    <div className="py-1">
                                        <button
                                            onClick={() => {
                                                setShowExportDropdown(false);
                                                exportToExcel();
                                            }}
                                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                            Export to Excel
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowExportDropdown(false);
                                                exportToPDF();
                                            }}
                                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <FileText className="w-4 h-4 text-red-600" />
                                            Export to PDF
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Attendance Records */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="px-3 py-3 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                            <Users className="w-4 h-4 mr-1 text-gray-600" />
                            Records
                            {filteredAttendance && (
                                <span className="ml-2 text-xs font-normal text-gray-500">
                                    ({filteredAttendance.length})
                                </span>
                            )}
                        </h3>
                    </div>

                    {!filteredAttendance || filteredAttendance.length === 0 ? (
                        <div className="text-center py-8">
                            <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-sm font-medium text-gray-900 mb-2">
                                No attendance records
                            </h3>
                            <p className="text-xs text-gray-600">
                                No records match your filters.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Desktop Table */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Student
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                                                Level
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                                                Details
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredAttendance
                                            .slice()
                                            .sort((a, b) => {
                                                // Get levels for both records
                                                const levelA = a.enrollment?.level || '';
                                                const levelB = b.enrollment?.level || '';

                                                // Define level priority order
                                                const levelOrder = {
                                                    'PRIMARY_A': 1,
                                                    'PRIMARY_B': 2,
                                                    'LEVEL_1': 3,
                                                    'LEVEL_2': 4,
                                                    'LEVEL_3': 5,
                                                    'LEVEL_4': 6,
                                                };

                                                const priorityA = levelOrder[levelA as keyof typeof levelOrder] || 999;
                                                const priorityB = levelOrder[levelB as keyof typeof levelOrder] || 999;

                                                // First sort by level priority
                                                if (priorityA !== priorityB) {
                                                    return priorityA - priorityB;
                                                }

                                                // Then sort alphabetically by student name within the same level
                                                const nameA = a.student?.name || 'Unknown Student';
                                                const nameB = b.student?.name || 'Unknown Student';
                                                return nameA.localeCompare(nameB);
                                            })
                                            .map((record) => (
                                                <motion.tr
                                                    key={record.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="hover:bg-gray-50"
                                                >
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center">
                                                            <ProfilePicture
                                                                imageUrl={record.student?.profileImageUrl}
                                                                name={record.student?.name || 'Unknown Student'}
                                                                size="sm"
                                                                colorScheme="orange"
                                                            />
                                                            <div className="ml-2">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {record.student?.name || 'Unknown Student'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900">
                                                        {new Date(record.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center space-x-1">
                                                                {getStatusIcon(record.status)}
                                                                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadgeClass(record.status)}`}>
                                                                    {record.status.toLowerCase()}
                                                                </span>
                                                            </div>
                                                            {record.status === 'HOLIDAY' && record.holidayReason && (
                                                                <div className="text-xs text-blue-600">
                                                                    {record.holidayReason}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900 hidden md:table-cell">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                                            {record.enrollment?.level?.replace('_', ' ') || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-700 hidden lg:table-cell">
                                                        <div className="space-y-1">
                                                            <div>By: {record.markedByUser?.name || 'System'}</div>
                                                            <div>{record.markedAt ? new Date(record.markedAt).toLocaleString() : '-'}</div>
                                                            {record.notes && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleNote(record.id)}
                                                                    className="text-blue-600 hover:text-blue-800 underline"
                                                                >
                                                                    {openNotes[record.id] ? 'Hide Notes' : 'Show Notes'}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {record.notes && openNotes[record.id] && (
                                                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                                                <strong>Notes:</strong> {record.notes}
                                                            </div>
                                                        )}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card Layout */}
                            <div className="sm:hidden space-y-3">
                                {filteredAttendance
                                    .slice()
                                    .sort((a, b) => {
                                        // Get levels for both records
                                        const levelA = a.enrollment?.level || '';
                                        const levelB = b.enrollment?.level || '';

                                        // Define level priority order
                                        const levelOrder = {
                                            'PRIMARY_A': 1,
                                            'PRIMARY_B': 2,
                                            'LEVEL_1': 3,
                                            'LEVEL_2': 4,
                                            'LEVEL_3': 5,
                                            'LEVEL_4': 6,
                                        };

                                        const priorityA = levelOrder[levelA as keyof typeof levelOrder] || 999;
                                        const priorityB = levelOrder[levelB as keyof typeof levelOrder] || 999;

                                        // First sort by level priority
                                        if (priorityA !== priorityB) {
                                            return priorityA - priorityB;
                                        }

                                        // Then sort alphabetically by student name within the same level
                                        const nameA = a.student?.name || 'Unknown Student';
                                        const nameB = b.student?.name || 'Unknown Student';
                                        return nameA.localeCompare(nameB);
                                    })
                                    .map((record) => (
                                        <motion.div
                                            key={`mobile-${record.id}`}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="bg-white border rounded-lg p-3"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2 flex-1">
                                                    <ProfilePicture
                                                        imageUrl={record.student?.profileImageUrl}
                                                        name={record.student?.name || 'Unknown Student'}
                                                        size="sm"
                                                        colorScheme="orange"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {record.student?.name || 'Unknown Student'}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {record.enrollment?.level?.replace('_', ' ') || 'N/A'} • {new Date(record.date).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    {getStatusIcon(record.status)}
                                                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadgeClass(record.status)}`}>
                                                        {record.status.toLowerCase()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Holiday Reason */}
                                            {record.status === 'HOLIDAY' && record.holidayReason && (
                                                <div className="mb-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                                                    <strong>Holiday:</strong> {record.holidayReason}
                                                </div>
                                            )}

                                            <div className="flex justify-between text-xs text-gray-500 mb-2">
                                                <span>
                                                    {record.markedAt ? new Date(record.markedAt).toLocaleTimeString('en-US', {
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                        hour12: true,
                                                    }) : 'No time'}
                                                </span>
                                                <span>By: {record.markedByUser?.name || 'System'}</span>
                                            </div>

                                            {record.notes && (
                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleNote(record.id)}
                                                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                                                    >
                                                        {openNotes[record.id] ? 'Hide Notes' : 'Show Notes'}
                                                    </button>
                                                    {openNotes[record.id] && (
                                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                                            <div className="text-xs text-gray-600">
                                                                <strong>Notes:</strong> {record.notes}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

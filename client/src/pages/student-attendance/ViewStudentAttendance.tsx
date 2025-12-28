/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { useCenter } from "@/hooks/useCenterQueries";
import { useProject } from "@/hooks/useProjectQueries";
import toast from "react-hot-toast";

export const ViewStudentAttendance = () => {
    const { projectId, centerId, semesterId } = useParams();
    // Timeframe selection: single date | date range
    const [timeframe, setTimeframe] = useState<"single" | "range">("single");
    const [singleDate, setSingleDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [fromDate, setFromDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [selectedStatus, setSelectedStatus] = useState<string>("");
    const [selectedLevel, setSelectedLevel] = useState<string>("");

    // Debounced date values for API calls
    const [debouncedSingleDate, setDebouncedSingleDate] = useState<string>(singleDate);
    const [debouncedFromDate, setDebouncedFromDate] = useState<string>(fromDate);
    const [debouncedToDate, setDebouncedToDate] = useState<string>(toDate);

    // Fetch semester to know start/end for full semester option
    const { data: semester } = useSemester(semesterId!);
    const { data: centerData } = useCenter(centerId!);
    const { data: projectData } = useProject(projectId!);

    // Helper functions for quick date range selection
    const setCurrentMonth = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const startDate = firstDay.toISOString().slice(0, 10);
        const endDate = lastDay.toISOString().slice(0, 10);
        setFromDate(startDate);
        setToDate(endDate);
        setDebouncedFromDate(startDate);
        setDebouncedToDate(endDate);
    };

    const setFullSemester = () => {
        if (semester?.startDate && semester?.endDate) {
            const startDate = new Date(semester.startDate).toISOString().slice(0, 10);
            const endDate = new Date(semester.endDate).toISOString().slice(0, 10);
            setFromDate(startDate);
            setToDate(endDate);
            setDebouncedFromDate(startDate);
            setDebouncedToDate(endDate);
        }
    };

    // Debounce date changes to prevent immediate API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSingleDate(singleDate);
        }, 500);
        return () => clearTimeout(timer);
    }, [singleDate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedFromDate(fromDate);
            setDebouncedToDate(toDate);
        }, 2000);
        return () => clearTimeout(timer);
    }, [fromDate, toDate]);

    // Compute date params based on timeframe selection using debounced values
    const { date, startDate, endDate } = useMemo(() => {
        if (timeframe === "single" && debouncedSingleDate) {
            return { date: debouncedSingleDate } as const;
        }
        if (timeframe === "range" && debouncedFromDate && debouncedToDate) {
            return { startDate: debouncedFromDate, endDate: debouncedToDate } as const;
        }
        return {} as { date?: string; startDate?: string; endDate?: string };
    }, [timeframe, debouncedSingleDate, debouncedFromDate, debouncedToDate]);

    const { data: attendanceData, isLoading, error } = useStudentAttendanceRecords({
        projectId: projectId!,
        centerId: centerId!,
        semesterId: semesterId!,
        ...(date ? { date } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(selectedStatus ? { status: selectedStatus } : {}),
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
            const workbook = XLSX.utils.book_new();

            if (timeframe === 'single') {
                // Single day export - use existing format
                const exportData = getExportData();
                const worksheet = XLSX.utils.json_to_sheet(exportData);

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

                XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
            } else {
                // Date range export - create month-wise sheets with date columns
                const sortedData = filteredAttendance.slice().sort((a, b) => {
                    const levelOrder = { 'PRIMARY_A': 1, 'PRIMARY_B': 2, 'LEVEL_1': 3, 'LEVEL_2': 4, 'LEVEL_3': 5, 'LEVEL_4': 6 };
                    const levelA = a.enrollment?.level || '';
                    const levelB = b.enrollment?.level || '';
                    const priorityA = levelOrder[levelA as keyof typeof levelOrder] || 999;
                    const priorityB = levelOrder[levelB as keyof typeof levelOrder] || 999;
                    if (priorityA !== priorityB) return priorityA - priorityB;
                    const nameA = a.student?.name || 'Unknown Student';
                    const nameB = b.student?.name || 'Unknown Student';
                    return nameA.localeCompare(nameB);
                });

                // Group by month
                const monthGroups = new Map<string, typeof sortedData>();
                sortedData.forEach(record => {
                    const date = new Date(record.date);
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    if (!monthGroups.has(monthKey)) {
                        monthGroups.set(monthKey, []);
                    }
                    monthGroups.get(monthKey)!.push(record);
                });

                // Create a sheet for each month
                monthGroups.forEach((records, monthKey) => {
                    const [year, month] = monthKey.split('-');
                    const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                    // Get unique students and dates
                    const studentMap = new Map<string, { name: string; level: string; records: typeof records }>();
                    const uniqueDates = new Set<string>();

                    records.forEach(record => {
                        const studentId = record.student?.id || 'unknown';
                        if (!studentMap.has(studentId)) {
                            studentMap.set(studentId, {
                                name: record.student?.name || 'Unknown Student',
                                level: record.enrollment?.level || 'N/A',
                                records: []
                            });
                        }
                        studentMap.get(studentId)!.records.push(record);
                        uniqueDates.add(record.date);
                    });

                    // Sort dates
                    const sortedDates = Array.from(uniqueDates).sort();

                    // Build table data grouped by level
                    const tableData: any[] = [];
                    const levelGroups = new Map<string, typeof studentMap>();

                    studentMap.forEach((student, studentId) => {
                        const level = student.level;
                        if (!levelGroups.has(level)) {
                            levelGroups.set(level, new Map());
                        }
                        levelGroups.get(level)!.set(studentId, student);
                    });

                    // Sort levels
                    const levelOrder = ['PRIMARY_A', 'PRIMARY_B', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'];
                    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => {
                        const aIndex = levelOrder.indexOf(a);
                        const bIndex = levelOrder.indexOf(b);
                        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                    });

                    // Add header row with month and year
                    const headerRow: any = { 'Student Name': `${monthName}` };
                    sortedDates.forEach(date => {
                        const dateObj = new Date(date);
                        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        headerRow[`${dateStr} (${dayName})`] = '';
                    });
                    tableData.push(headerRow);
                    tableData.push({}); // Empty row after header

                    sortedLevels.forEach(level => {
                        // Add level header (without emoji)
                        const levelHeader: any = { 'Student Name': level.replace('_', ' ') };
                        sortedDates.forEach(date => {
                            const dateObj = new Date(date);
                            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            levelHeader[`${dateStr} (${dayName})`] = '';
                        });
                        tableData.push(levelHeader);

                        // Add students in this level
                        const students = levelGroups.get(level)!;
                        students.forEach((student) => {
                            const row: any = {
                                'Student Name': student.name
                            };

                            sortedDates.forEach(date => {
                                const dateObj = new Date(date);
                                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                const attendance = student.records.find(r => r.date === date);

                                if (attendance) {
                                    if (attendance.status === 'PRESENT') row[`${dateStr} (${dayName})`] = 'PRESENT';
                                    else if (attendance.status === 'ABSENT') row[`${dateStr} (${dayName})`] = 'ABSENT';
                                    else if (attendance.status === 'HOLIDAY') row[`${dateStr} (${dayName})`] = 'HOLIDAY';
                                    else row[`${dateStr} (${dayName})`] = '-';
                                } else {
                                    row[`${dateStr} (${dayName})`] = '-';
                                }
                            });

                            tableData.push(row);
                        });

                        // Add empty row between levels
                        tableData.push({});
                    });

                    // Create worksheet
                    const worksheet = XLSX.utils.json_to_sheet(tableData);

                    // Set column widths
                    const colWidths = [
                        { wch: 25 }, // Student Name
                        ...sortedDates.map(() => ({ wch: 15 })) // Date columns (wider for full text)
                    ];
                    worksheet['!cols'] = colWidths;

                    XLSX.utils.book_append_sheet(workbook, worksheet, monthName.substring(0, 31));
                });

                // Create Summary Sheet if multiple months or date range spans significant period
                const daysDiff = Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff >= 20) { // Only create summary for 20+ days
                    // Calculate stats per student
                    const studentStats = new Map<string, {
                        name: string;
                        level: string;
                        totalDays: number;
                        present: number;
                        absent: number;
                        holidays: number;
                        monthlyStats: Map<string, { present: number; absent: number; holidays: number; total: number }>;
                    }>();

                    sortedData.forEach(record => {
                        const studentId = record.student?.id || 'unknown';
                        if (!studentStats.has(studentId)) {
                            studentStats.set(studentId, {
                                name: record.student?.name || 'Unknown Student',
                                level: record.enrollment?.level || 'N/A',
                                totalDays: 0,
                                present: 0,
                                absent: 0,
                                holidays: 0,
                                monthlyStats: new Map()
                            });
                        }

                        const stats = studentStats.get(studentId)!;
                        const recordDate = new Date(record.date);
                        const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;

                        if (!stats.monthlyStats.has(monthKey)) {
                            stats.monthlyStats.set(monthKey, { present: 0, absent: 0, holidays: 0, total: 0 });
                        }
                        const monthStats = stats.monthlyStats.get(monthKey)!;

                        stats.totalDays++;
                        monthStats.total++;

                        if (record.status === 'PRESENT') {
                            stats.present++;
                            monthStats.present++;
                        } else if (record.status === 'ABSENT') {
                            stats.absent++;
                            monthStats.absent++;
                        } else if (record.status === 'HOLIDAY') {
                            stats.holidays++;
                            monthStats.holidays++;
                        }
                    });

                    // Get all unique months sorted chronologically
                    const allMonths = new Set<string>();
                    studentStats.forEach(stats => {
                        stats.monthlyStats.forEach((_, monthKey) => allMonths.add(monthKey));
                    });
                    const sortedMonths = Array.from(allMonths).sort();

                    // Group students by level
                    const levelGroups = new Map<string, typeof studentStats>();
                    studentStats.forEach((stats, studentId) => {
                        const level = stats.level;
                        if (!levelGroups.has(level)) {
                            levelGroups.set(level, new Map());
                        }
                        levelGroups.get(level)!.set(studentId, stats);
                    });

                    // Sort levels
                    const levelOrder = ['PRIMARY_A', 'PRIMARY_B', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'];
                    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => {
                        const aIndex = levelOrder.indexOf(a);
                        const bIndex = levelOrder.indexOf(b);
                        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                    });

                    // Build two-row header for better structure
                    const summaryData: any[] = [];

                    // First header row - Month names
                    const headerRow1: any = { 'Student Name': 'Student Name' };
                    sortedMonths.forEach(monthKey => {
                        const [year, month] = monthKey.split('-');
                        const monthName = `${new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'short' })} ${year}`;
                        headerRow1[`${monthName} - Present`] = monthName;
                        headerRow1[`${monthName} - Absent`] = '';
                        headerRow1[`${monthName} - Avg%`] = '';
                    });
                    headerRow1['Overall Avg%'] = 'Overall Avg%';
                    headerRow1['Remarks'] = 'Remarks';

                    // Second header row - Subcolumns
                    const headerRow2: any = { 'Student Name': '' };
                    sortedMonths.forEach(monthKey => {
                        const [year, month] = monthKey.split('-');
                        const monthName = `${new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'short' })} ${year}`;
                        headerRow2[`${monthName} - Present`] = 'Present';
                        headerRow2[`${monthName} - Absent`] = 'Absent';
                        headerRow2[`${monthName} - Avg%`] = 'Avg%';
                    });
                    headerRow2['Overall Avg%'] = '';
                    headerRow2['Remarks'] = '';

                    summaryData.push(headerRow1);
                    summaryData.push(headerRow2);

                    // Add data rows grouped by level
                    sortedLevels.forEach(level => {
                        // Add level header row
                        const levelHeaderRow: any = { 'Student Name': level.replace('_', ' ') };
                        sortedMonths.forEach(monthKey => {
                            const [year, month] = monthKey.split('-');
                            const monthName = `${new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'short' })} ${year}`;
                            levelHeaderRow[`${monthName} - Present`] = '';
                            levelHeaderRow[`${monthName} - Absent`] = '';
                            levelHeaderRow[`${monthName} - Avg%`] = '';
                        });
                        levelHeaderRow['Overall Avg%'] = '';
                        levelHeaderRow['Remarks'] = '';
                        summaryData.push(levelHeaderRow);

                        // Add students in this level
                        const students = Array.from(levelGroups.get(level)!.entries()).sort((a, b) =>
                            a[1].name.localeCompare(b[1].name)
                        );

                        students.forEach(([, stats]) => {
                            const row: any = { 'Student Name': stats.name };

                            // Add monthly data
                            sortedMonths.forEach(monthKey => {
                                const [year, month] = monthKey.split('-');
                                const monthName = `${new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'short' })} ${year}`;
                                const monthStats = stats.monthlyStats.get(monthKey);

                                if (monthStats) {
                                    const monthWorkingDays = monthStats.total - monthStats.holidays;
                                    const monthPercentage = monthWorkingDays > 0 ? ((monthStats.present / monthWorkingDays) * 100).toFixed(1) : '0.0';
                                    row[`${monthName} - Present`] = monthStats.present;
                                    row[`${monthName} - Absent`] = monthStats.absent;
                                    row[`${monthName} - Avg%`] = `${monthPercentage}%`;
                                } else {
                                    row[`${monthName} - Present`] = '-';
                                    row[`${monthName} - Absent`] = '-';
                                    row[`${monthName} - Avg%`] = '-';
                                }
                            });

                            // Add overall data
                            const workingDays = stats.totalDays - stats.holidays;
                            const overallPercentage = workingDays > 0 ? ((stats.present / workingDays) * 100).toFixed(1) : '0.0';
                            row['Overall Avg%'] = `${overallPercentage}%`;

                            // Add remarks
                            const percentage = parseFloat(overallPercentage);
                            let remarks = '';
                            if (percentage >= 90) remarks = 'Excellent';
                            else if (percentage >= 80) remarks = 'Good';
                            else if (percentage >= 70) remarks = 'Satisfactory';
                            else if (percentage >= 60) remarks = 'Needs Improvement';
                            else remarks = 'Poor - Intervention Required';
                            row['Remarks'] = remarks;

                            summaryData.push(row);
                        });

                        // Add empty row between levels
                        summaryData.push({});
                    });

                    // Create summary worksheet
                    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);

                    // Set column widths
                    const colWidths = [
                        { wch: 25 }, // Student Name
                    ];
                    sortedMonths.forEach(() => {
                        colWidths.push({ wch: 10 }); // Present
                        colWidths.push({ wch: 10 }); // Absent
                        colWidths.push({ wch: 12 }); // Avg%
                    });
                    colWidths.push({ wch: 15 }); // Overall Avg%
                    colWidths.push({ wch: 30 }); // Remarks
                    summaryWorksheet['!cols'] = colWidths;

                    // Apply conditional formatting and styling
                    const range = XLSX.utils.decode_range(summaryWorksheet['!ref'] || 'A1');

                    // Create merge array for header rows
                    const merges: any[] = [];

                    // Merge Student Name cell (A1:A2)
                    merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });

                    // Merge month header cells (each month spans 3 columns in row 0)
                    let colIndex = 1;
                    sortedMonths.forEach(() => {
                        merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 2 } });
                        colIndex += 3;
                    });

                    // Merge Overall Avg% (spans 2 rows)
                    merges.push({ s: { r: 0, c: colIndex }, e: { r: 1, c: colIndex } });

                    // Merge Remarks (spans 2 rows)
                    merges.push({ s: { r: 0, c: colIndex + 1 }, e: { r: 1, c: colIndex + 1 } });

                    summaryWorksheet['!merges'] = merges;

                    // Style header rows (both row 0 and row 1) with borders
                    for (let rowNum = 0; rowNum <= 1; rowNum++) {
                        for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
                            const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
                            const cell = summaryWorksheet[cellAddress];
                            if (cell) {
                                cell.s = {
                                    fill: { fgColor: { rgb: 'FF9800' } },
                                    font: { color: { rgb: 'FFFFFF' }, bold: true },
                                    alignment: { horizontal: 'center', vertical: 'center' },
                                    border: {
                                        top: { style: 'thin', color: { rgb: '000000' } },
                                        bottom: { style: 'thin', color: { rgb: '000000' } },
                                        left: { style: 'thin', color: { rgb: '000000' } },
                                        right: { style: 'thin', color: { rgb: '000000' } }
                                    }
                                };
                            }
                        }
                    }

                    // Style level headers and student rows (starting from row 2 now)
                    for (let rowNum = 2; rowNum <= range.e.r; rowNum++) {
                        const firstCellAddress = XLSX.utils.encode_cell({ r: rowNum, c: 0 });
                        const firstCell = summaryWorksheet[firstCellAddress];

                        if (firstCell && firstCell.v) {
                            const cellValue = firstCell.v.toString();

                            // Check if it's a level header
                            if (cellValue.includes('PRIMARY') || cellValue.includes('LEVEL')) {
                                // Style entire row as level header with borders
                                for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
                                    const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
                                    const cell = summaryWorksheet[cellAddress];
                                    if (cell) {
                                        cell.s = {
                                            fill: { fgColor: { rgb: 'FFE0B2' } },
                                            font: { bold: true, size: 12 },
                                            alignment: { horizontal: 'center' },
                                            border: {
                                                top: { style: 'medium', color: { rgb: '000000' } },
                                                bottom: { style: 'thin', color: { rgb: '000000' } },
                                                left: { style: 'thin', color: { rgb: '000000' } },
                                                right: { style: 'thin', color: { rgb: '000000' } }
                                            }
                                        };
                                    }
                                }
                            } else {
                                // Style percentage columns with color coding
                                for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
                                    const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
                                    const cell = summaryWorksheet[cellAddress];

                                    if (cell && typeof cell.v === 'string' && cell.v.includes('%')) {
                                        const percentage = parseFloat(cell.v);
                                        const border = {
                                            top: { style: 'thin', color: { rgb: '000000' } },
                                            bottom: { style: 'thin', color: { rgb: '000000' } },
                                            left: { style: 'thin', color: { rgb: '000000' } },
                                            right: { style: 'thin', color: { rgb: '000000' } }
                                        };

                                        if (percentage >= 90) {
                                            cell.s = { fill: { fgColor: { rgb: 'C6EFCE' } }, font: { color: { rgb: '006100' }, bold: true }, alignment: { horizontal: 'center' }, border };
                                        } else if (percentage >= 80) {
                                            cell.s = { fill: { fgColor: { rgb: 'D4EDDA' } }, font: { color: { rgb: '155724' }, bold: true }, alignment: { horizontal: 'center' }, border };
                                        } else if (percentage >= 70) {
                                            cell.s = { fill: { fgColor: { rgb: 'FFF3CD' } }, font: { color: { rgb: '856404' }, bold: true }, alignment: { horizontal: 'center' }, border };
                                        } else if (percentage >= 60) {
                                            cell.s = { fill: { fgColor: { rgb: 'FFE6CC' } }, font: { color: { rgb: 'CC5500' }, bold: true }, alignment: { horizontal: 'center' }, border };
                                        } else {
                                            cell.s = { fill: { fgColor: { rgb: 'F8D7DA' } }, font: { color: { rgb: '721C24' }, bold: true }, alignment: { horizontal: 'center' }, border };
                                        }
                                    } else if (cell) {
                                        // Add borders to all other data cells (Present/Absent counts)
                                        if (!cell.s) cell.s = {};
                                        cell.s.border = {
                                            top: { style: 'thin', color: { rgb: '000000' } },
                                            bottom: { style: 'thin', color: { rgb: '000000' } },
                                            left: { style: 'thin', color: { rgb: '000000' } },
                                            right: { style: 'thin', color: { rgb: '000000' } }
                                        };
                                        if (!cell.s.alignment) cell.s.alignment = { horizontal: 'center' };
                                    }
                                }

                                // Style remarks column
                                const remarksColIndex = range.e.c; // Last column
                                const remarksAddress = XLSX.utils.encode_cell({ r: rowNum, c: remarksColIndex });
                                const remarksCell = summaryWorksheet[remarksAddress];
                                const border = {
                                    top: { style: 'thin', color: { rgb: '000000' } },
                                    bottom: { style: 'thin', color: { rgb: '000000' } },
                                    left: { style: 'thin', color: { rgb: '000000' } },
                                    right: { style: 'thin', color: { rgb: '000000' } }
                                };
                                if (remarksCell && remarksCell.v) {
                                    const remarks = remarksCell.v.toString();
                                    if (remarks.includes('Excellent')) {
                                        remarksCell.s = { font: { color: { rgb: '006100' }, bold: true }, border };
                                    } else if (remarks.includes('Good')) {
                                        remarksCell.s = { font: { color: { rgb: '155724' }, bold: true }, border };
                                    } else if (remarks.includes('Satisfactory')) {
                                        remarksCell.s = { font: { color: { rgb: '856404' }, bold: true }, border };
                                    } else if (remarks.includes('Needs Improvement')) {
                                        remarksCell.s = { font: { color: { rgb: 'CC5500' }, bold: true }, border };
                                    } else if (remarks.includes('Poor')) {
                                        remarksCell.s = { font: { color: { rgb: '721C24' }, bold: true }, border };
                                    }
                                } else if (remarksCell) {
                                    if (!remarksCell.s) remarksCell.s = {};
                                    remarksCell.s.border = border;
                                }
                            }
                        }
                    }

                    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
                }
            }

            // Generate filename with project, center, and semester details
            const dateRange = timeframe === 'single'
                ? singleDate
                : `${fromDate}_to_${toDate}`;
            const projectName = projectData?.name ? projectData.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unknown_Project';
            const centerName = centerData?.name ? centerData.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unknown_Center';
            const semesterName = semester?.name ? semester.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unknown_Semester';
            const filename = `Student_Attendance_${projectName}_${centerName}_${semesterName}_${dateRange.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;

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

            const doc = new jsPDF('landscape'); // Use landscape for date range reports

            if (timeframe === 'single') {
                // Single day export - use existing format
                const exportData = getExportData();

                // Add logo
                try {
                    const img = new Image();
                    img.src = '/images/logo/prangan-logo-light-mode.png';
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
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
                doc.text(`Project: ${projectData?.name || 'Unknown Project'}`, 14, yPos);
                yPos += 5;
                doc.text(`Center: ${centerData?.name || 'Unknown Center'}`, 14, yPos);
                yPos += 5;
                doc.text(`Semester: ${semester?.name || 'Unknown Semester'}`, 14, yPos);
                yPos += 5;
                doc.text(`Date: ${singleDate}`, 14, yPos);
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
                    headStyles: { fillColor: [255, 152, 0] },
                    columnStyles: {
                        0: { cellWidth: 15 },
                        1: { cellWidth: 40 },
                        2: { cellWidth: 25 },
                        3: { cellWidth: 25 },
                        4: { cellWidth: 20 },
                        5: { cellWidth: 30 }
                    }
                });
            } else {
                // Date range export - create month-wise pages
                const sortedData = filteredAttendance.slice().sort((a, b) => {
                    const levelOrder = { 'PRIMARY_A': 1, 'PRIMARY_B': 2, 'LEVEL_1': 3, 'LEVEL_2': 4, 'LEVEL_3': 5, 'LEVEL_4': 6 };
                    const levelA = a.enrollment?.level || '';
                    const levelB = b.enrollment?.level || '';
                    const priorityA = levelOrder[levelA as keyof typeof levelOrder] || 999;
                    const priorityB = levelOrder[levelB as keyof typeof levelOrder] || 999;
                    if (priorityA !== priorityB) return priorityA - priorityB;
                    const nameA = a.student?.name || 'Unknown Student';
                    const nameB = b.student?.name || 'Unknown Student';
                    return nameA.localeCompare(nameB);
                });

                // Group by month
                const monthGroups = new Map<string, typeof sortedData>();
                sortedData.forEach(record => {
                    const date = new Date(record.date);
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    if (!monthGroups.has(monthKey)) {
                        monthGroups.set(monthKey, []);
                    }
                    monthGroups.get(monthKey)!.push(record);
                });

                // Sort month keys chronologically
                const sortedMonthKeys = Array.from(monthGroups.keys()).sort();

                let isFirstPage = true;

                sortedMonthKeys.forEach((monthKey) => {
                    const records = monthGroups.get(monthKey)!;
                    if (!isFirstPage) {
                        doc.addPage();
                    }
                    isFirstPage = false;

                    const [year, month] = monthKey.split('-');
                    const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                    // Add logo
                    try {
                        const img = new Image();
                        img.src = '/images/logo/prangan-logo-light-mode.png';
                        doc.addImage(img, 'PNG', 240, 5, 40, 20);
                    } catch (logoError) {
                        console.warn('Could not load logo:', logoError);
                    }

                    // Add title and info
                    doc.setFontSize(14);
                    doc.text(`Attendance Report - ${monthName}`, 14, 15);
                    doc.setFontSize(9);
                    doc.text(`Project: ${projectData?.name || 'Unknown Project'} | Center: ${centerData?.name || 'Unknown Center'} | Semester: ${semester?.name || 'Unknown Semester'}`, 14, 22);

                    // Get unique students and dates
                    const studentMap = new Map<string, { name: string; level: string; records: typeof records }>();
                    const uniqueDates = new Set<string>();

                    records.forEach(record => {
                        const studentId = record.student?.id || 'unknown';
                        if (!studentMap.has(studentId)) {
                            studentMap.set(studentId, {
                                name: record.student?.name || 'Unknown Student',
                                level: record.enrollment?.level || 'N/A',
                                records: []
                            });
                        }
                        studentMap.get(studentId)!.records.push(record);
                        uniqueDates.add(record.date);
                    });

                    // Sort dates
                    const sortedDates = Array.from(uniqueDates).sort();

                    // Check which dates are holidays (all students have HOLIDAY status)
                    const holidayDates = new Map<string, string>(); // date -> holiday reason
                    sortedDates.forEach(date => {
                        const dateRecords = records.filter(r => r.date === date);
                        if (dateRecords.length > 0 && dateRecords.every(r => r.status === 'HOLIDAY')) {
                            // All students have holiday on this date
                            const holidayReason = dateRecords[0].holidayReason || 'Holiday';
                            holidayDates.set(date, holidayReason);
                        }
                    });

                    // Build table data grouped by level
                    const tableData: string[][] = [];
                    const levelGroups = new Map<string, typeof studentMap>();

                    studentMap.forEach((student, studentId) => {
                        const level = student.level;
                        if (!levelGroups.has(level)) {
                            levelGroups.set(level, new Map());
                        }
                        levelGroups.get(level)!.set(studentId, student);
                    });

                    // Sort levels
                    const levelOrder = ['PRIMARY_A', 'PRIMARY_B', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'];
                    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => {
                        const aIndex = levelOrder.indexOf(a);
                        const bIndex = levelOrder.indexOf(b);
                        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                    });

                    // Prepare header with dates (including month abbreviation)
                    const dateHeaders = sortedDates.map(date => {
                        const dateObj = new Date(date);
                        const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                        const dateStr = `${dateObj.getDate()}`;

                        // If this date is a holiday, show "HOLIDAY: reason" with date
                        if (holidayDates.has(date)) {
                            const reason = holidayDates.get(date)!;
                            return `${monthName} ${dateStr}\nHOLIDAY:\n${reason}`;
                        }

                        return `${monthName} ${dateStr}\n${dayName}`;
                    });

                    const tableHead = [['Student Name', ...dateHeaders]];

                    sortedLevels.forEach(level => {
                        // Add level header row (without emoji)
                        const levelName = level.replace('_', ' ');
                        tableData.push([levelName, ...sortedDates.map(() => '')]);

                        // Add students in this level
                        const students = levelGroups.get(level)!;
                        students.forEach((student) => {
                            const row: string[] = [student.name];

                            sortedDates.forEach(date => {
                                // Skip showing individual status if it's a holiday date
                                if (holidayDates.has(date)) {
                                    row.push('');
                                } else {
                                    const attendance = student.records.find(r => r.date === date);
                                    if (attendance) {
                                        if (attendance.status === 'PRESENT') row.push('PRESENT');
                                        else if (attendance.status === 'ABSENT') row.push('ABSENT');
                                        else if (attendance.status === 'HOLIDAY') row.push('HOLIDAY');
                                        else row.push('-');
                                    } else {
                                        row.push('-');
                                    }
                                }
                            });

                            tableData.push(row);
                        });
                    });

                    // Create table
                    autoTable(doc, {
                        head: tableHead,
                        body: tableData,
                        startY: 28,
                        styles: { fontSize: 6, cellPadding: 1.5, halign: 'center' },
                        headStyles: { fillColor: [255, 152, 0], fontStyle: 'bold', fontSize: 7 },
                        columnStyles: {
                            0: { cellWidth: 40, halign: 'left' }, // Student Name
                        },
                        didParseCell: function (data) {
                            // Style holiday columns in header
                            if (data.section === 'head' && data.column.index > 0) {
                                const cellText = data.cell.text.join(' ');

                                // Check if this header contains HOLIDAY
                                if (cellText.includes('HOLIDAY:')) {
                                    data.cell.styles.fillColor = [219, 234, 254]; // Light blue background
                                    data.cell.styles.textColor = [37, 99, 235]; // Blue text
                                    data.cell.styles.fontStyle = 'bold';
                                }
                            }

                            // Style level header rows in body
                            if (data.section === 'body' && data.column.index === 0) {
                                const cellText = data.cell.text[0];

                                // Check if it's a level header (contains PRIMARY or LEVEL)
                                if (cellText && (cellText.includes('PRIMARY') || cellText.includes('LEVEL'))) {
                                    // Check if all other columns in this row are empty (level header characteristic)
                                    // Safely check if the row exists in tableData
                                    const rowData = tableData[data.row.index];
                                    if (rowData) {
                                        const isLevelHeader = sortedDates.every((_, idx) => {
                                            const cellInRow = rowData[idx + 1];
                                            return cellInRow === '';
                                        });

                                        if (isLevelHeader) {
                                            data.cell.styles.fontStyle = 'bold';
                                            data.cell.styles.fillColor = [240, 240, 240];
                                            data.cell.styles.fontSize = 7;
                                        }
                                    }
                                }
                            }

                            // Style attendance status cells and holiday columns in body
                            if (data.section === 'body' && data.column.index > 0) {
                                const cellText = data.cell.text[0];

                                // Check if this column is a holiday column (empty cells under HOLIDAY header)
                                const headerCell = tableHead[0][data.column.index];
                                if (headerCell && headerCell.includes('HOLIDAY:')) {
                                    // This entire column is a holiday, style with light blue background
                                    data.cell.styles.fillColor = [219, 234, 254]; // Light blue background
                                }
                                // Color code attendance status
                                else if (cellText === 'PRESENT') {
                                    data.cell.styles.textColor = [0, 128, 0]; // Green
                                    data.cell.styles.fontStyle = 'bold';
                                } else if (cellText === 'ABSENT') {
                                    data.cell.styles.textColor = [220, 38, 38]; // Red
                                    data.cell.styles.fontStyle = 'bold';
                                }
                            }
                        }
                    });
                });

                // Add Summary Page for date ranges spanning 20+ days
                const daysDiff = Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff >= 20) {
                    doc.addPage();

                    // Add logo
                    try {
                        const img = new Image();
                        img.src = '/images/logo/prangan-logo-light-mode.png';
                        doc.addImage(img, 'PNG', 240, 5, 40, 20);
                    } catch (logoError) {
                        console.warn('Could not load logo:', logoError);
                    }

                    // Add title
                    doc.setFontSize(16);
                    doc.text('Attendance Summary', 14, 15);
                    doc.setFontSize(9);
                    doc.text(`Project: ${projectData?.name || 'Unknown Project'} | Center: ${centerData?.name || 'Unknown Center'} | Semester: ${semester?.name || 'Unknown Semester'}`, 14, 22);
                    doc.text(`Period: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`, 14, 27);

                    // Calculate stats per student
                    const studentStats = new Map<string, {
                        name: string;
                        level: string;
                        totalDays: number;
                        present: number;
                        absent: number;
                        holidays: number;
                        monthlyStats: Map<string, { present: number; absent: number; holidays: number; total: number }>;
                    }>();

                    sortedData.forEach(record => {
                        const studentId = record.student?.id || 'unknown';
                        if (!studentStats.has(studentId)) {
                            studentStats.set(studentId, {
                                name: record.student?.name || 'Unknown Student',
                                level: record.enrollment?.level || 'N/A',
                                totalDays: 0,
                                present: 0,
                                absent: 0,
                                holidays: 0,
                                monthlyStats: new Map()
                            });
                        }

                        const stats = studentStats.get(studentId)!;
                        const recordDate = new Date(record.date);
                        const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;

                        if (!stats.monthlyStats.has(monthKey)) {
                            stats.monthlyStats.set(monthKey, { present: 0, absent: 0, holidays: 0, total: 0 });
                        }
                        const monthStats = stats.monthlyStats.get(monthKey)!;

                        stats.totalDays++;
                        monthStats.total++;

                        if (record.status === 'PRESENT') {
                            stats.present++;
                            monthStats.present++;
                        } else if (record.status === 'ABSENT') {
                            stats.absent++;
                            monthStats.absent++;
                        } else if (record.status === 'HOLIDAY') {
                            stats.holidays++;
                            monthStats.holidays++;
                        }
                    });

                    // Get all unique months sorted chronologically
                    const allMonths = new Set<string>();
                    studentStats.forEach(stats => {
                        stats.monthlyStats.forEach((_, monthKey) => allMonths.add(monthKey));
                    });
                    const sortedMonths = Array.from(allMonths).sort();

                    // Group students by level
                    const levelGroups = new Map<string, typeof studentStats>();
                    studentStats.forEach((stats, studentId) => {
                        const level = stats.level;
                        if (!levelGroups.has(level)) {
                            levelGroups.set(level, new Map());
                        }
                        levelGroups.get(level)!.set(studentId, stats);
                    });

                    // Sort levels
                    const levelOrder = ['PRIMARY_A', 'PRIMARY_B', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'];
                    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => {
                        const aIndex = levelOrder.indexOf(a);
                        const bIndex = levelOrder.indexOf(b);
                        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                    });

                    // Build two-row header with merged cells for months
                    // Row 1: Student Name, Month Names (each spanning 3 columns), Overall Avg%, Remarks
                    // Row 2: (blank), Present/Absent/Avg% for each month, (blank), (blank)

                    const headerRow1: any[] = [
                        { content: 'Student Name', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
                    ];

                    sortedMonths.forEach(monthKey => {
                        const [year, month] = monthKey.split('-');
                        const monthName = `${new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'short' })} ${year}`;
                        headerRow1.push({ content: monthName, colSpan: 3, styles: { halign: 'center' } });
                    });

                    headerRow1.push({ content: 'Overall\nAvg%', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } });
                    headerRow1.push({ content: 'Remarks', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } });

                    // Second header row - subcolumns
                    const headerRow2: string[] = [];
                    sortedMonths.forEach(() => {
                        headerRow2.push('Present');
                        headerRow2.push('Absent');
                        headerRow2.push('Avg%');
                    });

                    // Build table data grouped by level
                    const summaryTableData: any[] = [];

                    sortedLevels.forEach(level => {
                        // Add level header row - spans all columns
                        const totalColumns = 1 + (sortedMonths.length * 3) + 2; // Student Name + (months * 3 subcolumns) + Overall + Remarks
                        const levelRow = [level.replace('_', ' ')];
                        for (let i = 1; i < totalColumns; i++) {
                            levelRow.push('');
                        }
                        summaryTableData.push(levelRow);

                        // Add students in this level
                        const students = Array.from(levelGroups.get(level)!.entries()).sort((a, b) =>
                            a[1].name.localeCompare(b[1].name)
                        );

                        students.forEach(([, stats]) => {
                            const row: any[] = [stats.name];

                            // Add monthly data
                            sortedMonths.forEach(monthKey => {
                                const monthStats = stats.monthlyStats.get(monthKey);

                                if (monthStats) {
                                    const monthWorkingDays = monthStats.total - monthStats.holidays;
                                    const monthPercentage = monthWorkingDays > 0 ? ((monthStats.present / monthWorkingDays) * 100).toFixed(1) : '0.0';
                                    row.push(monthStats.present.toString());
                                    row.push(monthStats.absent.toString());
                                    row.push(`${monthPercentage}%`);
                                } else {
                                    row.push('-');
                                    row.push('-');
                                    row.push('-');
                                }
                            });

                            // Add overall data
                            const workingDays = stats.totalDays - stats.holidays;
                            const overallPercentage = workingDays > 0 ? ((stats.present / workingDays) * 100).toFixed(1) : '0.0';
                            row.push(`${overallPercentage}%`);

                            // Add remarks
                            const percentage = parseFloat(overallPercentage);
                            let remarks = '';
                            if (percentage >= 90) remarks = 'Excellent';
                            else if (percentage >= 80) remarks = 'Good';
                            else if (percentage >= 70) remarks = 'Satisfactory';
                            else if (percentage >= 60) remarks = 'Needs Improvement';
                            else remarks = 'Poor - Intervention Required';
                            row.push(remarks);

                            summaryTableData.push(row);
                        });
                    });

                    // Calculate column widths dynamically
                    // Reduce name width and give more space to remarks to prevent text wrapping
                    const baseWidth = 28; // Student Name (reduced from 35)
                    const monthColWidth = sortedMonths.length > 3 ? 10 : 12; // Slightly reduced
                    const columnStyles: any = {
                        0: { cellWidth: baseWidth, halign: 'left' }
                    };

                    let colIndex = 1;
                    sortedMonths.forEach(() => {
                        columnStyles[colIndex] = { cellWidth: monthColWidth, halign: 'center' }; // Present
                        columnStyles[colIndex + 1] = { cellWidth: monthColWidth, halign: 'center' }; // Absent
                        columnStyles[colIndex + 2] = { cellWidth: monthColWidth, halign: 'center' }; // Avg%
                        colIndex += 3;
                    });
                    columnStyles[colIndex] = { cellWidth: 14, halign: 'center' }; // Overall Avg%
                    columnStyles[colIndex + 1] = { cellWidth: 45, halign: 'left', overflow: 'linebreak' }; // Remarks (fixed width to prevent wrapping)

                    // Create summary table with two-row header and borders
                    autoTable(doc, {
                        head: [headerRow1, headerRow2],
                        body: summaryTableData,
                        startY: 32,
                        styles: {
                            fontSize: 6,
                            cellPadding: 1.5,
                            lineColor: [0, 0, 0],
                            lineWidth: 0.1
                        },
                        headStyles: {
                            fillColor: [255, 152, 0],
                            fontStyle: 'bold',
                            fontSize: 7,
                            halign: 'center',
                            valign: 'middle',
                            lineColor: [0, 0, 0],
                            lineWidth: 0.2
                        },
                        columnStyles: columnStyles,
                        didParseCell: function (data) {
                            // Style level header rows
                            if (data.section === 'body' && data.column.index === 0) {
                                const cellText = data.cell.text[0];
                                if (cellText && (cellText.includes('PRIMARY') || cellText.includes('LEVEL'))) {
                                    // Style all cells in this row with thicker borders
                                    const totalColumns = 1 + (sortedMonths.length * 3) + 2;
                                    for (let i = 0; i < totalColumns; i++) {
                                        const cell = data.row.cells[i];
                                        if (cell) {
                                            cell.styles.fillColor = [255, 224, 178];
                                            cell.styles.fontStyle = 'bold';
                                            cell.styles.fontSize = 8;
                                            cell.styles.halign = 'center';
                                            cell.styles.lineColor = [0, 0, 0];
                                            cell.styles.lineWidth = { top: 0.3, bottom: 0.1, left: 0.1, right: 0.1 };
                                        }
                                    }
                                }
                            }

                            // Color code percentage columns
                            if (data.section === 'body' && data.cell.text[0] && data.cell.text[0].includes('%')) {
                                const cellText = data.cell.text[0];
                                if (cellText !== '-') {
                                    const percentage = parseFloat(cellText);

                                    if (!isNaN(percentage)) {
                                        if (percentage >= 90) {
                                            data.cell.styles.fillColor = [198, 239, 206];
                                            data.cell.styles.textColor = [0, 97, 0];
                                            data.cell.styles.fontStyle = 'bold';
                                        } else if (percentage >= 80) {
                                            data.cell.styles.fillColor = [212, 237, 218];
                                            data.cell.styles.textColor = [21, 87, 36];
                                            data.cell.styles.fontStyle = 'bold';
                                        } else if (percentage >= 70) {
                                            data.cell.styles.fillColor = [255, 243, 205];
                                            data.cell.styles.textColor = [133, 100, 4];
                                            data.cell.styles.fontStyle = 'bold';
                                        } else if (percentage >= 60) {
                                            data.cell.styles.fillColor = [255, 230, 204];
                                            data.cell.styles.textColor = [204, 85, 0];
                                            data.cell.styles.fontStyle = 'bold';
                                        } else {
                                            data.cell.styles.fillColor = [248, 215, 218];
                                            data.cell.styles.textColor = [114, 28, 36];
                                            data.cell.styles.fontStyle = 'bold';
                                        }
                                    }
                                }
                            }

                            // Color code remarks column (last column)
                            const totalColumns = 1 + (sortedMonths.length * 3) + 2;
                            if (data.section === 'body' && data.column.index === totalColumns - 1) {
                                const cellText = data.cell.text[0];
                                if (cellText) {
                                    if (cellText.includes('Excellent')) {
                                        data.cell.styles.textColor = [0, 97, 0];
                                        data.cell.styles.fontStyle = 'bold';
                                    } else if (cellText.includes('Good')) {
                                        data.cell.styles.textColor = [21, 87, 36];
                                        data.cell.styles.fontStyle = 'bold';
                                    } else if (cellText.includes('Satisfactory')) {
                                        data.cell.styles.textColor = [133, 100, 4];
                                        data.cell.styles.fontStyle = 'bold';
                                    } else if (cellText.includes('Needs Improvement')) {
                                        data.cell.styles.textColor = [204, 85, 0];
                                        data.cell.styles.fontStyle = 'bold';
                                    } else if (cellText.includes('Poor')) {
                                        data.cell.styles.textColor = [114, 28, 36];
                                        data.cell.styles.fontStyle = 'bold';
                                    }
                                }
                            }
                        }
                    });
                }
            }

            // Generate filename with project, center, and semester details
            const dateRange = timeframe === 'single'
                ? singleDate
                : `${fromDate}_to_${toDate}`;
            const projectName = projectData?.name ? projectData.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unknown_Project';
            const centerName = centerData?.name ? centerData.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unknown_Center';
            const semesterName = semester?.name ? semester.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unknown_Semester';
            const filename = `Student_Attendance_${projectName}_${centerName}_${semesterName}_${dateRange.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

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
                            <div className="flex flex-wrap gap-3 text-xs mb-2">
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
                                        value="range"
                                        checked={timeframe === 'range'}
                                        onChange={() => setTimeframe('range')}
                                    />
                                    Date Range
                                </label>
                            </div>
                            <div className="space-y-2">
                                {timeframe === 'single' && (
                                    <input
                                        type="date"
                                        value={singleDate}
                                        onChange={(e) => setSingleDate(e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    />
                                )}
                                {timeframe === 'range' && (
                                    <div className="space-y-2">
                                        <div className="flex gap-2 items-center">
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-600 mb-1">From</label>
                                                <input
                                                    type="date"
                                                    value={fromDate}
                                                    onChange={(e) => setFromDate(e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-600 mb-1">To</label>
                                                <input
                                                    type="date"
                                                    value={toDate}
                                                    onChange={(e) => setToDate(e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={setCurrentMonth}
                                                className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                                            >
                                                Current Month
                                            </button>
                                            <button
                                                type="button"
                                                onClick={setFullSemester}
                                                disabled={!semester}
                                                className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Full Semester
                                            </button>
                                        </div>
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

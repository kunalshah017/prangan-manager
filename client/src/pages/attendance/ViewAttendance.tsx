/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
    CalendarIcon,
    UserIcon,
    ClockIcon,
    CheckIcon,
    XIcon,
    Download,
    ChevronDown,
    FileText,
    FileSpreadsheet,
    Eye
} from "lucide-react";
import { useAttendanceRecords } from "@/hooks/useAttendanceQueries";
import { useCenter } from "@/hooks/useCenterQueries";
import { useProject } from "@/hooks/useProjectQueries";
import { useSemester } from "@/hooks/useSemesterQueries";
import LoadingButterfly from "@/components/LoadingButterfly";
import { CustomButton } from "@/components/ui/custom-button";
import ProtectedComponent from "@/components/ProtectedComponent";
import toast from "react-hot-toast";

export const ViewAttendance = () => {
    const { projectId, centerId, semesterId } = useParams();

    // Timeframe selection: single date | date range
    const [timeframe, setTimeframe] = useState<"single" | "range">("single");
    const [singleDate, setSingleDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [fromDate, setFromDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

    const [isExporting, setIsExporting] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});

    // Debounced date values for API calls
    const [debouncedSingleDate, setDebouncedSingleDate] = useState<string>(singleDate);
    const [debouncedFromDate, setDebouncedFromDate] = useState<string>(fromDate);
    const [debouncedToDate, setDebouncedToDate] = useState<string>(toDate);

    // Fetch semester to know start/end for full semester option
    const { data: semesterData } = useSemester(semesterId!);
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
        if (semesterData?.startDate && semesterData?.endDate) {
            const startDate = new Date(semesterData.startDate).toISOString().slice(0, 10);
            const endDate = new Date(semesterData.endDate).toISOString().slice(0, 10);
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
    const dateParams = useMemo(() => {
        if (timeframe === "single" && debouncedSingleDate) {
            return { startDate: debouncedSingleDate, endDate: debouncedSingleDate };
        }
        if (timeframe === "range" && debouncedFromDate && debouncedToDate) {
            return { startDate: debouncedFromDate, endDate: debouncedToDate };
        }
        return { startDate: singleDate, endDate: singleDate };
    }, [timeframe, debouncedSingleDate, debouncedFromDate, debouncedToDate, singleDate]);

    const { data: attendanceData, isLoading, error } = useAttendanceRecords({
        ...dateParams,
        projectId: projectId!,
        centerId: centerId!,
        semesterId: semesterId!,
    });

    const toggleNote = (id: string) =>
        setOpenNotes((prev) => ({ ...prev, [id]: !prev[id] }));

    // Calculate attendance stats
    const getAttendanceStats = () => {
        const records = attendanceData?.attendances || [];
        if (!records.length) return null;

        const total = records.length;
        const present = records.filter(record => record.status === 'PRESENT').length;
        const absent = records.filter(record => record.status === 'ABSENT').length;
        const notAvailable = records.filter(record => record.status === 'NOT_AVAILABLE').length;
        const holidays = records.filter(record => record.status === 'HOLIDAY').length;

        const workingDays = total - holidays;
        const attendancePercentage = workingDays > 0 ? ((present / workingDays) * 100).toFixed(1) : '0.0';

        return { total, present, absent, notAvailable, holidays, attendancePercentage, workingDays };
    };

    const stats = getAttendanceStats();

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
        const records = attendanceData?.attendances || [];
        return records.map((record, index) => ({
            'S.No': index + 1,
            'Name': record.userName || 'Unknown User',
            'Role': record.roleAssignment?.subRole?.replace('_', ' ') || 'N/A',
            'Date': new Date(record.date || '').toLocaleDateString(),
            'Status': record.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
            'Holiday Reason': record.status === 'HOLIDAY' ? record.holidayReason || '-' : '-',
            'Marked By': record.markedByName || 'System',
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
                    { wch: 25 }, // Name
                    { wch: 20 }, // Role
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
                const sortedData = (attendanceData?.attendances || []).slice().sort((a, b) => {
                    const roleOrder = { 'CENTER_MANAGER': 1, 'EDUCATOR': 2 };
                    const roleA = a.roleAssignment?.subRole || '';
                    const roleB = b.roleAssignment?.subRole || '';
                    const priorityA = roleOrder[roleA as keyof typeof roleOrder] || 999;
                    const priorityB = roleOrder[roleB as keyof typeof roleOrder] || 999;
                    if (priorityA !== priorityB) return priorityA - priorityB;
                    const nameA = a.userName || 'Unknown';
                    const nameB = b.userName || 'Unknown';
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

                    // Get unique users and dates
                    const userMap = new Map<string, { name: string; role: string; records: typeof records }>();
                    const uniqueDates = new Set<string>();

                    records.forEach(record => {
                        const userId = record.userId || 'unknown';
                        if (!userMap.has(userId)) {
                            userMap.set(userId, {
                                name: record.userName || 'Unknown User',
                                role: record.roleAssignment?.subRole || 'N/A',
                                records: []
                            });
                        }
                        userMap.get(userId)!.records.push(record);
                        uniqueDates.add(record.date);
                    });

                    // Sort dates
                    const sortedDates = Array.from(uniqueDates).sort();

                    // Build table data grouped by role
                    const tableData: any[] = [];
                    const roleGroups = new Map<string, typeof userMap>();

                    userMap.forEach((user, userId) => {
                        const role = user.role;
                        if (!roleGroups.has(role)) {
                            roleGroups.set(role, new Map());
                        }
                        roleGroups.get(role)!.set(userId, user);
                    });

                    // Sort roles
                    const roleOrder = ['CENTER_MANAGER', 'EDUCATOR'];
                    const sortedRoles = Array.from(roleGroups.keys()).sort((a, b) => {
                        const aIndex = roleOrder.indexOf(a);
                        const bIndex = roleOrder.indexOf(b);
                        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                    });

                    // Add header row with month and year
                    const headerRow: any = { 'Name': `${monthName}` };
                    sortedDates.forEach(date => {
                        const dateObj = new Date(date);
                        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        headerRow[`${dateStr} (${dayName})`] = '';
                    });
                    tableData.push(headerRow);
                    tableData.push({}); // Empty row after header

                    sortedRoles.forEach(role => {
                        // Add role header
                        const roleHeader: any = { 'Name': role.replace('_', ' ') };
                        sortedDates.forEach(date => {
                            const dateObj = new Date(date);
                            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            roleHeader[`${dateStr} (${dayName})`] = '';
                        });
                        tableData.push(roleHeader);

                        // Add users in this role
                        const users = roleGroups.get(role)!;
                        users.forEach((user) => {
                            const row: any = {
                                'Name': user.name
                            };

                            sortedDates.forEach(date => {
                                const dateObj = new Date(date);
                                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                const attendance = user.records.find(r => r.date === date);

                                if (attendance) {
                                    let status = '-';
                                    if (attendance.status === 'PRESENT') status = 'P';
                                    else if (attendance.status === 'ABSENT') status = 'A';
                                    else if (attendance.status === 'NOT_AVAILABLE') status = 'NA';
                                    else if (attendance.status === 'HOLIDAY') status = 'H';
                                    row[`${dateStr} (${dayName})`] = status;
                                } else {
                                    row[`${dateStr} (${dayName})`] = '-';
                                }
                            });

                            tableData.push(row);
                        });

                        // Add empty row between roles
                        tableData.push({});
                    });

                    // Create worksheet
                    const worksheet = XLSX.utils.json_to_sheet(tableData);

                    // Set column widths
                    const colWidths = [
                        { wch: 25 }, // Name
                        ...sortedDates.map(() => ({ wch: 12 })) // Date columns
                    ];
                    worksheet['!cols'] = colWidths;

                    XLSX.utils.book_append_sheet(workbook, worksheet, monthName.substring(0, 31));
                });

                // Create Summary Sheet for date range
                const daysDiff = Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff >= 20) {
                    // Calculate stats per user
                    const userStats = new Map<string, {
                        name: string;
                        role: string;
                        totalDays: number;
                        present: number;
                        absent: number;
                        notAvailable: number;
                        holidays: number;
                        monthlyStats: Map<string, { present: number; absent: number; notAvailable: number; holidays: number; total: number }>;
                    }>();

                    sortedData.forEach(record => {
                        const userId = record.userId || 'unknown';
                        if (!userStats.has(userId)) {
                            userStats.set(userId, {
                                name: record.userName || 'Unknown User',
                                role: record.roleAssignment?.subRole || 'N/A',
                                totalDays: 0,
                                present: 0,
                                absent: 0,
                                notAvailable: 0,
                                holidays: 0,
                                monthlyStats: new Map()
                            });
                        }

                        const stats = userStats.get(userId)!;
                        const recordDate = new Date(record.date);
                        const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;

                        if (!stats.monthlyStats.has(monthKey)) {
                            stats.monthlyStats.set(monthKey, { present: 0, absent: 0, notAvailable: 0, holidays: 0, total: 0 });
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
                        } else if (record.status === 'NOT_AVAILABLE') {
                            stats.notAvailable++;
                            monthStats.notAvailable++;
                        } else if (record.status === 'HOLIDAY') {
                            stats.holidays++;
                            monthStats.holidays++;
                        }
                    });

                    // Get all unique months sorted chronologically
                    const allMonths = new Set<string>();
                    userStats.forEach(stats => {
                        stats.monthlyStats.forEach((_, monthKey) => allMonths.add(monthKey));
                    });
                    const sortedMonths = Array.from(allMonths).sort();

                    // Group users by role
                    const roleGroups = new Map<string, typeof userStats>();
                    userStats.forEach((stats, userId) => {
                        const role = stats.role;
                        if (!roleGroups.has(role)) {
                            roleGroups.set(role, new Map());
                        }
                        roleGroups.get(role)!.set(userId, stats);
                    });

                    // Sort roles
                    const roleOrder = ['CENTER_MANAGER', 'EDUCATOR'];
                    const sortedRoles = Array.from(roleGroups.keys()).sort((a, b) => {
                        const aIndex = roleOrder.indexOf(a);
                        const bIndex = roleOrder.indexOf(b);
                        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                    });

                    // Build two-row header for better structure
                    const summaryData: any[] = [];

                    // First header row - Month names
                    const headerRow1: any = { 'Name': 'Name' };
                    sortedMonths.forEach(monthKey => {
                        const [year, month] = monthKey.split('-');
                        const monthName = `${new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'short' })} ${year}`;
                        headerRow1[`${monthName} - Present`] = monthName;
                        headerRow1[`${monthName} - Absent`] = '';
                        headerRow1[`${monthName} - Not Avail`] = '';
                        headerRow1[`${monthName} - Avg%`] = '';
                    });
                    headerRow1['Overall Avg%'] = 'Overall Avg%';
                    headerRow1['Remuneration'] = 'Remuneration';

                    // Second header row - Subcolumns
                    const headerRow2: any = { 'Name': '' };
                    sortedMonths.forEach(monthKey => {
                        const [year, month] = monthKey.split('-');
                        const monthName = `${new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'short' })} ${year}`;
                        headerRow2[`${monthName} - Present`] = 'Present';
                        headerRow2[`${monthName} - Absent`] = 'Absent';
                        headerRow2[`${monthName} - Not Avail`] = 'Not Avail';
                        headerRow2[`${monthName} - Avg%`] = 'Avg%';
                    });
                    headerRow2['Overall Avg%'] = '';
                    headerRow2['Remuneration'] = '';

                    summaryData.push(headerRow1);
                    summaryData.push(headerRow2);

                    // Add data rows grouped by role
                    sortedRoles.forEach(role => {
                        // Add role header
                        const roleHeader: any = { 'Name': role.replace('_', ' ') };
                        sortedMonths.forEach(monthKey => {
                            const [year, month] = monthKey.split('-');
                            const monthName = `${new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'short' })} ${year}`;
                            roleHeader[`${monthName} - Present`] = '';
                            roleHeader[`${monthName} - Absent`] = '';
                            roleHeader[`${monthName} - Not Avail`] = '';
                            roleHeader[`${monthName} - Avg%`] = '';
                        });
                        roleHeader['Overall Avg%'] = '';
                        roleHeader['Remuneration'] = '';
                        summaryData.push(roleHeader);

                        // Add users in this role
                        const users = roleGroups.get(role)!;
                        users.forEach((stats) => {
                            const row: any = {
                                'Name': stats.name
                            };

                            sortedMonths.forEach(monthKey => {
                                const [year, month] = monthKey.split('-');
                                const monthName = `${new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'short' })} ${year}`;
                                const monthStats = stats.monthlyStats.get(monthKey);

                                if (monthStats) {
                                    // Average = present / (present + absent) - NOT_AVAILABLE days don't affect percentage
                                    const attendedDays = monthStats.present + monthStats.absent;
                                    const avgPercentage = attendedDays > 0 ? ((monthStats.present / attendedDays) * 100).toFixed(1) : '0.0';

                                    row[`${monthName} - Present`] = monthStats.present;
                                    row[`${monthName} - Absent`] = monthStats.absent;
                                    row[`${monthName} - Not Avail`] = monthStats.notAvailable;
                                    row[`${monthName} - Avg%`] = `${avgPercentage}%`;
                                } else {
                                    row[`${monthName} - Present`] = 0;
                                    row[`${monthName} - Absent`] = 0;
                                    row[`${monthName} - Not Avail`] = 0;
                                    row[`${monthName} - Avg%`] = '0.0%';
                                }
                            });

                            // Calculate overall average (present / (present + absent)) - NOT_AVAILABLE days don't affect percentage
                            const totalAttendedDays = stats.present + stats.absent;
                            const overallAvg = totalAttendedDays > 0 ? ((stats.present / totalAttendedDays) * 100).toFixed(1) : '0.0';
                            row['Overall Avg%'] = `${overallAvg}%`;

                            // Calculate remuneration (500 per present day for EDUCATOR and CENTER_MANAGER)
                            const reimbursementRate = 500;
                            const remuneration = stats.present * reimbursementRate;
                            row['Remuneration'] = `Rs. ${remuneration}`;

                            summaryData.push(row);
                        });

                        // Add empty row between roles
                        summaryData.push({});
                    });

                    // Create summary worksheet
                    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);

                    // Set column widths
                    const summaryColWidths = [
                        { wch: 25 }, // Name
                        ...sortedMonths.flatMap(() => [
                            { wch: 10 }, // Present
                            { wch: 10 }, // Absent
                            { wch: 10 }, // Not Avail
                            { wch: 10 }  // Avg%
                        ]),
                        { wch: 12 }, // Overall Avg%
                        { wch: 15 }  // Remuneration
                    ];
                    summaryWorksheet['!cols'] = summaryColWidths;

                    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
                }
            }

            // Generate filename with project, center, and semester details
            const dateRange = timeframe === 'single' ? singleDate : `${fromDate}_to_${toDate}`;
            const projectName = projectData?.name ? projectData.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unknown_Project';
            const centerName = centerData?.name ? centerData.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unknown_Center';
            const semesterName = semesterData?.name ? semesterData.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unknown_Semester';
            const filename = `Educator_Attendance_${projectName}_${centerName}_${semesterName}_${dateRange.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;

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

            const doc = new jsPDF(timeframe === 'range' ? 'landscape' : 'portrait');

            if (timeframe === 'single') {
                // Single day export
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
                doc.text('Educator & Center Manager Attendance Report', 14, 15);

                // Add filters info
                doc.setFontSize(10);
                let yPos = 25;
                doc.text(`Project: ${projectData?.name || 'Unknown Project'}`, 14, yPos);
                yPos += 5;
                doc.text(`Center: ${centerData?.name || 'Unknown Center'}`, 14, yPos);
                yPos += 5;
                doc.text(`Semester: ${semesterData?.name || 'Unknown Semester'}`, 14, yPos);
                yPos += 5;
                doc.text(`Date: ${singleDate}`, 14, yPos);
                yPos += 5;
                if (stats) {
                    doc.text(`Total Records: ${stats.total}, Present: ${stats.present}, Absent: ${stats.absent}, Not Available: ${stats.notAvailable}, Holidays: ${stats.holidays}`, 14, yPos);
                    yPos += 5;
                }

                // Add table
                const tableColumns = ['S.No', 'Name', 'Role', 'Status', 'Time', 'Marked By'];
                const tableRows = exportData.map(row => {
                    let timeFormatted = '-';
                    if (row['Marked At'] !== '-') {
                        try {
                            const originalRecord = attendanceData?.attendances?.find((_, index) => index + 1 === row['S.No']);
                            if (originalRecord?.markedAt) {
                                const date = new Date(originalRecord.markedAt);
                                if (!isNaN(date.getTime())) {
                                    timeFormatted = date.toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    });
                                }
                            }
                        } catch (error) {
                            console.warn('Error formatting time for PDF:', error);
                            timeFormatted = '-';
                        }
                    }

                    return [
                        row['S.No'],
                        row['Name'],
                        row['Role'],
                        row['Status'],
                        timeFormatted,
                        row['Marked By']
                    ];
                });

                autoTable(doc, {
                    head: [tableColumns],
                    body: tableRows,
                    startY: yPos + 5,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [255, 152, 0] },
                    columnStyles: {
                        0: { cellWidth: 15 },
                        1: { cellWidth: 40 },
                        2: { cellWidth: 30 },
                        3: { cellWidth: 25 },
                        4: { cellWidth: 25 },
                        5: { cellWidth: 30 }
                    }
                });
            } else {
                // Date range export - create month-wise pages
                const sortedData = (attendanceData?.attendances || []).slice().sort((a, b) => {
                    const roleOrder = { 'CENTER_MANAGER': 1, 'EDUCATOR': 2 };
                    const roleA = a.roleAssignment?.subRole || '';
                    const roleB = b.roleAssignment?.subRole || '';
                    const priorityA = roleOrder[roleA as keyof typeof roleOrder] || 999;
                    const priorityB = roleOrder[roleB as keyof typeof roleOrder] || 999;
                    if (priorityA !== priorityB) return priorityA - priorityB;
                    const nameA = a.userName || 'Unknown';
                    const nameB = b.userName || 'Unknown';
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

                    // Add title
                    doc.setFontSize(14);
                    doc.text(`Attendance Report - ${monthName}`, 14, 15);
                    doc.setFontSize(9);
                    doc.text(`Project: ${projectData?.name || 'Unknown Project'} | Center: ${centerData?.name || 'Unknown Center'} | Semester: ${semesterData?.name || 'Unknown Semester'}`, 14, 22);

                    // Get unique users and dates
                    const userMap = new Map<string, { name: string; role: string; records: typeof records }>();
                    const uniqueDates = new Set<string>();

                    records.forEach(record => {
                        const userId = record.userId || 'unknown';
                        if (!userMap.has(userId)) {
                            userMap.set(userId, {
                                name: record.userName || 'Unknown User',
                                role: record.roleAssignment?.subRole || 'N/A',
                                records: []
                            });
                        }
                        userMap.get(userId)!.records.push(record);
                        uniqueDates.add(record.date);
                    });

                    const sortedDates = Array.from(uniqueDates).sort();

                    // Check for holidays
                    const holidayDates = new Map<string, string>();
                    sortedDates.forEach(date => {
                        const dateRecords = records.filter(r => r.date === date);
                        if (dateRecords.length > 0 && dateRecords.every(r => r.status === 'HOLIDAY')) {
                            const holidayReason = dateRecords[0].holidayReason || 'Holiday';
                            holidayDates.set(date, holidayReason);
                        }
                    });

                    // Build table data grouped by role
                    const tableData: string[][] = [];
                    const roleGroups = new Map<string, typeof userMap>();

                    userMap.forEach((user, userId) => {
                        const role = user.role;
                        if (!roleGroups.has(role)) {
                            roleGroups.set(role, new Map());
                        }
                        roleGroups.get(role)!.set(userId, user);
                    });

                    const roleOrder = ['CENTER_MANAGER', 'EDUCATOR'];
                    const sortedRoles = Array.from(roleGroups.keys()).sort((a, b) => {
                        const aIndex = roleOrder.indexOf(a);
                        const bIndex = roleOrder.indexOf(b);
                        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                    });

                    // Prepare headers
                    const dateHeaders = sortedDates.map(date => {
                        const dateObj = new Date(date);
                        const monthAbbr = dateObj.toLocaleDateString('en-US', { month: 'short' });
                        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                        const dateStr = `${dateObj.getDate()}`;

                        if (holidayDates.has(date)) {
                            const reason = holidayDates.get(date)!;
                            return `${monthAbbr} ${dateStr}\nHOLIDAY:\n${reason}`;
                        }

                        return `${monthAbbr} ${dateStr}\n${dayName}`;
                    });

                    const tableHead = [['Name', ...dateHeaders]];

                    sortedRoles.forEach(role => {
                        const roleName = role.replace('_', ' ');
                        tableData.push([roleName, ...sortedDates.map(() => '')]);

                        const users = roleGroups.get(role)!;
                        users.forEach((user) => {
                            const row: string[] = [user.name];

                            sortedDates.forEach(date => {
                                if (holidayDates.has(date)) {
                                    row.push('');
                                } else {
                                    const attendance = user.records.find(r => r.date === date);
                                    if (attendance) {
                                        if (attendance.status === 'PRESENT') row.push('PRESENT');
                                        else if (attendance.status === 'ABSENT') row.push('ABSENT');
                                        else if (attendance.status === 'NOT_AVAILABLE') row.push('NA');
                                        else if (attendance.status === 'HOLIDAY') row.push('H');
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
                            0: { cellWidth: 40, halign: 'left' }
                        },
                        didParseCell: function (data) {
                            // Style holiday columns
                            if (data.section === 'head' && data.column.index > 0) {
                                const cellText = data.cell.text.join(' ');
                                if (cellText.includes('HOLIDAY:')) {
                                    data.cell.styles.fillColor = [219, 234, 254];
                                    data.cell.styles.textColor = [37, 99, 235];
                                    data.cell.styles.fontStyle = 'bold';
                                }
                            }

                            // Style role headers
                            if (data.section === 'body' && data.column.index === 0) {
                                const cellText = data.cell.text[0];
                                if (cellText && (cellText.includes('CENTER MANAGER') || cellText.includes('EDUCATOR'))) {
                                    const rowData = tableData[data.row.index];
                                    if (rowData) {
                                        const isRoleHeader = sortedDates.every((_, idx) => {
                                            const cellInRow = rowData[idx + 1];
                                            return cellInRow === '';
                                        });

                                        if (isRoleHeader) {
                                            data.cell.styles.fontStyle = 'bold';
                                            data.cell.styles.fillColor = [240, 240, 240];
                                            data.cell.styles.fontSize = 7;
                                        }
                                    }
                                }
                            }

                            // Style attendance status and holiday columns
                            if (data.section === 'body' && data.column.index > 0) {
                                const cellText = data.cell.text[0];
                                const headerCell = tableHead[0][data.column.index];

                                if (headerCell && headerCell.includes('HOLIDAY:')) {
                                    data.cell.styles.fillColor = [219, 234, 254];
                                } else if (cellText === 'PRESENT') {
                                    data.cell.styles.textColor = [0, 128, 0];
                                    data.cell.styles.fontStyle = 'bold';
                                } else if (cellText === 'ABSENT') {
                                    data.cell.styles.textColor = [220, 38, 38];
                                    data.cell.styles.fontStyle = 'bold';
                                } else if (cellText === 'NA') {
                                    data.cell.styles.textColor = [251, 146, 60];
                                    data.cell.styles.fontStyle = 'bold';
                                }
                            }
                        }
                    });
                });

                // Add Summary Page
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

                    doc.setFontSize(16);
                    doc.text('Attendance Summary', 14, 15);
                    doc.setFontSize(9);
                    doc.text(`Project: ${projectData?.name || 'Unknown Project'} | Center: ${centerData?.name || 'Unknown Center'} | Semester: ${semesterData?.name || 'Unknown Semester'}`, 14, 22);
                    doc.text(`Period: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`, 14, 27);

                    // Calculate stats per user
                    const userStats = new Map<string, {
                        name: string;
                        role: string;
                        totalDays: number;
                        present: number;
                        absent: number;
                        notAvailable: number;
                        holidays: number;
                        monthlyStats: Map<string, { present: number; absent: number; notAvailable: number; holidays: number; total: number }>;
                    }>();

                    sortedData.forEach(record => {
                        const userId = record.userId || 'unknown';
                        if (!userStats.has(userId)) {
                            userStats.set(userId, {
                                name: record.userName || 'Unknown User',
                                role: record.roleAssignment?.subRole || 'N/A',
                                totalDays: 0,
                                present: 0,
                                absent: 0,
                                notAvailable: 0,
                                holidays: 0,
                                monthlyStats: new Map()
                            });
                        }

                        const stats = userStats.get(userId)!;
                        const recordDate = new Date(record.date);
                        const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;

                        if (!stats.monthlyStats.has(monthKey)) {
                            stats.monthlyStats.set(monthKey, { present: 0, absent: 0, notAvailable: 0, holidays: 0, total: 0 });
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
                        } else if (record.status === 'NOT_AVAILABLE') {
                            stats.notAvailable++;
                            monthStats.notAvailable++;
                        } else if (record.status === 'HOLIDAY') {
                            stats.holidays++;
                            monthStats.holidays++;
                        }
                    });

                    const allMonths = new Set<string>();
                    userStats.forEach(stats => {
                        stats.monthlyStats.forEach((_, monthKey) => allMonths.add(monthKey));
                    });
                    const sortedMonths = Array.from(allMonths).sort();

                    // Build summary table with two-row header
                    const headerRow1: any[] = ['Name'];
                    const headerRow2: any[] = [''];

                    sortedMonths.forEach(monthKey => {
                        const [year, month] = monthKey.split('-');
                        const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                        headerRow1.push({ content: monthName, colSpan: 5, styles: { halign: 'center', fillColor: [255, 152, 0] } });
                        headerRow2.push('Present', 'Absent', 'Not Avail', 'Avg%', 'Rs. Remuner.');
                    });

                    headerRow1.push('Overall\nAvg%', 'Total\nRs. Remuner.');
                    headerRow2.push('', '');

                    const summaryBody: any[][] = [];

                    // Group by role
                    const roleGroups = new Map<string, typeof userStats>();
                    userStats.forEach((stats, userId) => {
                        const role = stats.role;
                        if (!roleGroups.has(role)) {
                            roleGroups.set(role, new Map());
                        }
                        roleGroups.get(role)!.set(userId, stats);
                    });

                    const roleOrder = ['CENTER_MANAGER', 'EDUCATOR'];
                    const sortedRoles = Array.from(roleGroups.keys()).sort((a, b) => {
                        const aIndex = roleOrder.indexOf(a);
                        const bIndex = roleOrder.indexOf(b);
                        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                    });

                    sortedRoles.forEach(role => {
                        // Role header with orange background
                        const roleHeader = [{ content: role.replace('_', ' '), colSpan: 1 + sortedMonths.length * 5 + 2, styles: { fontStyle: 'bold', fillColor: [255, 152, 0], textColor: [255, 255, 255] } }];
                        summaryBody.push(roleHeader);

                        // Users in role
                        const users = roleGroups.get(role)!;
                        users.forEach((stats) => {
                            const row: any[] = [stats.name];

                            sortedMonths.forEach(monthKey => {
                                const monthStats = stats.monthlyStats.get(monthKey);
                                if (monthStats) {
                                    // Average = present / (present + absent) - NOT_AVAILABLE days don't affect percentage
                                    const attendedDays = monthStats.present + monthStats.absent;
                                    const avgPercentage = attendedDays > 0 ? ((monthStats.present / attendedDays) * 100).toFixed(1) : '0.0';
                                    const monthlyRemuneration = monthStats.present * 500;

                                    row.push(
                                        monthStats.present,
                                        monthStats.absent,
                                        monthStats.notAvailable,
                                        { content: `${avgPercentage}%`, styles: { fontStyle: 'bold', fillColor: getPercentageColor(parseFloat(avgPercentage)) } },
                                        `Rs. ${monthlyRemuneration}`
                                    );
                                } else {
                                    row.push(0, 0, 0, { content: '0.0%', styles: { fontStyle: 'bold' } }, 'Rs. 0');
                                }
                            });

                            // Calculate overall average (present / (present + absent)) - NOT_AVAILABLE days don't affect percentage
                            const totalAttendedDays = stats.present + stats.absent;
                            const overallAvg = totalAttendedDays > 0 ? ((stats.present / totalAttendedDays) * 100).toFixed(1) : '0.0';
                            row.push({ content: `${overallAvg}%`, styles: { fontStyle: 'bold', fillColor: getPercentageColor(parseFloat(overallAvg)) } });

                            const remuneration = stats.present * 500;
                            row.push(`Rs. ${remuneration}`);

                            summaryBody.push(row);
                        });
                    });

                    // Add Total Remuneration Row
                    const totalRow: any[] = [{ content: 'TOTAL REMUNERATION', styles: { fontStyle: 'bold', fillColor: [255, 243, 205] } }];
                    const monthlyTotals = new Map<string, number>();
                    let grandTotal = 0;

                    sortedMonths.forEach(monthKey => {
                        let monthTotal = 0;
                        userStats.forEach(stats => {
                            const monthStats = stats.monthlyStats.get(monthKey);
                            if (monthStats) {
                                monthTotal += monthStats.present * 500;
                            }
                        });
                        monthlyTotals.set(monthKey, monthTotal);
                        grandTotal += monthTotal;
                    });

                    sortedMonths.forEach(monthKey => {
                        const monthTotal = monthlyTotals.get(monthKey) || 0;
                        totalRow.push(
                            { content: '', styles: { fillColor: [255, 243, 205] } },
                            { content: '', styles: { fillColor: [255, 243, 205] } },
                            { content: '', styles: { fillColor: [255, 243, 205] } },
                            { content: '', styles: { fillColor: [255, 243, 205] } },
                            { content: `Rs. ${monthTotal}`, styles: { fontStyle: 'bold', fillColor: [255, 243, 205] } }
                        );
                    });

                    totalRow.push(
                        { content: '', styles: { fillColor: [255, 243, 205] } },
                        { content: `Rs. ${grandTotal}`, styles: { fontStyle: 'bold', fillColor: [255, 243, 205] } }
                    );
                    summaryBody.push(totalRow);

                    // Helper function for color coding
                    function getPercentageColor(percentage: number): number[] {
                        if (percentage >= 90) return [198, 239, 206];
                        if (percentage >= 80) return [212, 237, 218];
                        if (percentage >= 70) return [255, 243, 205];
                        if (percentage >= 60) return [255, 230, 204];
                        return [248, 215, 218];
                    }

                    autoTable(doc, {
                        head: [headerRow1, headerRow2],
                        body: summaryBody,
                        startY: 33,
                        styles: {
                            fontSize: 7,
                            cellPadding: 2,
                            halign: 'center',
                            lineWidth: 0.1,
                            lineColor: [200, 200, 200]
                        },
                        headStyles: {
                            fillColor: [255, 152, 0],
                            fontStyle: 'bold',
                            lineWidth: 0.1,
                            lineColor: [200, 200, 200]
                        },
                        columnStyles: {
                            0: { cellWidth: 35, halign: 'left' }
                        }
                    });
                }
            }

            // Generate filename
            const dateRange = timeframe === 'single' ? singleDate : `${fromDate}_to_${toDate}`;
            const projectName = projectData?.name ? projectData.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unknown_Project';
            const centerName = centerData?.name ? centerData.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unknown_Center';
            const semesterName = semesterData?.name ? semesterData.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unknown_Semester';
            const filename = `Educator_Attendance_${projectName}_${centerName}_${semesterName}_${dateRange.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

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
                        View Attendance
                    </h1>
                    <p className="text-sm text-gray-600">
                        Educator and center manager records
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border p-3 mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-1 text-gray-600" />
                        Filters
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Timeframe</label>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setTimeframe("single")}
                                    className={`flex-1 px-3 py-1.5 text-xs rounded ${timeframe === "single"
                                        ? "bg-orange-600 text-white"
                                        : "bg-gray-100 text-gray-700"
                                        }`}
                                >
                                    Single Date
                                </button>
                                <button
                                    onClick={() => setTimeframe("range")}
                                    className={`flex-1 px-3 py-1.5 text-xs rounded ${timeframe === "range"
                                        ? "bg-orange-600 text-white"
                                        : "bg-gray-100 text-gray-700"
                                        }`}
                                >
                                    Date Range
                                </button>
                            </div>

                            {timeframe === "single" && (
                                <div className="mt-2">
                                    <input
                                        type="date"
                                        value={singleDate}
                                        onChange={(e) => setSingleDate(e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    />
                                </div>
                            )}

                            {timeframe === "range" && (
                                <div className="mt-2 space-y-2">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">From</label>
                                        <input
                                            type="date"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">To</label>
                                        <input
                                            type="date"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {timeframe === "range" && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Quick Select</label>
                                <div className="space-y-2">
                                    <button
                                        onClick={setCurrentMonth}
                                        className="w-full px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                                    >
                                        Current Month
                                    </button>
                                    <button
                                        onClick={setFullSemester}
                                        disabled={!semesterData?.startDate}
                                        className="w-full px-3 py-1.5 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Full Semester
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Statistics */}
                {stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                        <div className="bg-white p-3 rounded-lg shadow-sm border">
                            <div className="text-xs text-gray-600 mb-1">Total Records</div>
                            <div className="text-xl font-bold text-gray-900">{stats.total}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border">
                            <div className="text-xs text-gray-600 mb-1">Present</div>
                            <div className="text-xl font-bold text-green-600">{stats.present}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border">
                            <div className="text-xs text-gray-600 mb-1">Absent/NA</div>
                            <div className="text-xl font-bold text-red-600">{stats.absent + stats.notAvailable}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border">
                            <div className="text-xs text-gray-600 mb-1">Holidays</div>
                            <div className="text-xl font-bold text-blue-600">{stats.holidays}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border col-span-2 lg:col-span-1">
                            <div className="text-xs text-gray-600 mb-1">Attendance %</div>
                            <div className="text-xl font-bold text-orange-600">{stats.attendancePercentage}%</div>
                        </div>
                    </div>
                )}

                {/* Export Button */}
                <ProtectedComponent requireAdmin>
                    {attendanceData?.attendances && attendanceData.attendances.length > 0 && (
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
                </ProtectedComponent>

                {/* Attendance Records */}
                <div className="bg-white rounded-lg shadow-sm border">
                    {!attendanceData || !attendanceData.attendances || attendanceData.attendances.length === 0 ? (
                        <div className="text-center py-8">
                            <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-sm font-medium text-gray-900 mb-2">
                                No attendance records
                            </h3>
                            <p className="text-xs text-gray-600">
                                No records found for selected {timeframe === 'range' ? 'date range' : 'date'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="hidden sm:block">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Educator / Center Manager
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                                                Time
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                                                Details
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
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-8 w-8">
                                                            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                                                                <UserIcon className="w-4 h-4 text-orange-600" />
                                                            </div>
                                                        </div>
                                                        <div className="ml-3 min-w-0 flex-1">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {record.userName || 'Unknown User'}
                                                            </div>
                                                            <div className="text-xs text-gray-500 capitalize">
                                                                {record.roleAssignment?.subRole?.replace('_', ' ') || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center space-x-1">
                                                            {getStatusIcon(record.status)}
                                                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border capitalize ${getStatusBadge(record.status)}`}>
                                                                {record.status.replace('_', ' ').toLowerCase()}
                                                            </span>
                                                        </div>
                                                        {record.status === 'HOLIDAY' && record.holidayReason && (
                                                            <div className="text-xs text-blue-600">
                                                                {record.holidayReason}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-700 hidden md:table-cell">
                                                    {record.markedAt ? new Date(record.markedAt).toLocaleTimeString('en-US', {
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                        hour12: true,
                                                    }) : '-'}
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-700 hidden lg:table-cell">
                                                    <div className="space-y-1">
                                                        <div>By: {record.markedByName || 'System'}</div>
                                                        {record.notes && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleNote(record.id);
                                                                }}
                                                                className="text-blue-600 hover:text-blue-800 underline"
                                                            >
                                                                Show Notes
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
                                {attendanceData.attendances.map((record) => (
                                    <motion.div
                                        key={`mobile-${record.id}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="bg-white border rounded-lg p-3"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-2 flex-1">
                                                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                                                    <UserIcon className="w-4 h-4 text-orange-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {record.userName || 'Unknown User'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 capitalize">
                                                        {record.roleAssignment?.subRole?.replace('_', ' ') || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                {getStatusIcon(record.status)}
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border capitalize ${getStatusBadge(record.status)}`}>
                                                    {record.status.replace('_', ' ').toLowerCase()}
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
                                            <span>By: {record.markedByName || 'System'}</span>
                                        </div>

                                        {record.notes && (
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleNote(record.id);
                                                    }}
                                                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                                                >
                                                    Show Notes
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

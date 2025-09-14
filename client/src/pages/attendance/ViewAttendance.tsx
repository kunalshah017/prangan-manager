import { useState, useEffect, useRef } from "react";
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
import LoadingButterfly from "@/components/LoadingButterfly";
import { CustomButton } from "@/components/ui/custom-button";
import toast from "react-hot-toast";

export const ViewAttendance = () => {
    const { centerId } = useParams();
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [isExporting, setIsExporting] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { data: attendanceData, isLoading, error } = useAttendanceRecords({
        startDate: selectedDate,
        endDate: selectedDate,
        centerId: centerId!,
    });

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
            'Date': selectedDate,
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

            const exportData = getExportData();
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();

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

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Records');

            // Generate filename
            const filename = `Educator_Attendance_${selectedDate.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;

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
            const jsPDFModule = await import('jspdf');
            const jsPDF = jsPDFModule.default;
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
            doc.text('Educator & Center Manager Attendance Report', 14, 15);

            // Add filters info
            doc.setFontSize(10);
            let yPos = 25;
            doc.text(`Date: ${selectedDate}`, 14, yPos);
            yPos += 5;
            doc.text(`Total Records: ${exportData.length}`, 14, yPos);
            yPos += 10;

            // Add table
            const tableColumns = ['S.No', 'Name', 'Role', 'Status', 'Time', 'Marked By'];
            const tableRows = exportData.map(row => {
                let timeFormatted = '-';
                if (row['Marked At'] !== '-') {
                    try {
                        // Find the original record to get the raw markedAt value
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
                startY: yPos,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [255, 152, 0] }, // Orange theme
                columnStyles: {
                    0: { cellWidth: 15 }, // S.No
                    1: { cellWidth: 40 }, // Name
                    2: { cellWidth: 30 }, // Role
                    3: { cellWidth: 25 }, // Status
                    4: { cellWidth: 25 }, // Time
                    5: { cellWidth: 30 }  // Marked By
                }
            });

            // Generate filename
            const filename = `Educator_Attendance_${selectedDate.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

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
                    <div className="max-w-xs">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            <CalendarIcon className="w-3 h-3 inline mr-1" />
                            Date
                        </label>
                        <input
                            aria-label="Select date"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                    </div>
                </div>

                {/* Export Button */}
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

                {/* Attendance Records */}
                <div className="bg-white rounded-lg shadow-sm border">
                    {!attendanceData || !attendanceData.attendances || attendanceData.attendances.length === 0 ? (
                        <div className="text-center py-8">
                            <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-sm font-medium text-gray-900 mb-2">
                                No attendance records
                            </h3>
                            <p className="text-xs text-gray-600">
                                No records found for {selectedDate}
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
                                                                onClick={() => {
                                                                    const detailsSection = document.getElementById(`details-${record.id}`);
                                                                    if (detailsSection) {
                                                                        detailsSection.style.display = detailsSection.style.display === 'none' ? 'block' : 'none';
                                                                    }
                                                                }}
                                                                className="text-blue-600 hover:text-blue-800 underline"
                                                            >
                                                                Show Notes
                                                            </button>
                                                        )}
                                                    </div>
                                                    {record.notes && (
                                                        <div id={`details-${record.id}`} style={{ display: 'none' }} className="mt-2 p-2 bg-gray-50 rounded text-xs">
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
                                                    onClick={() => {
                                                        const mobileNotesSection = document.getElementById(`mobile-notes-${record.id}`);
                                                        if (mobileNotesSection) {
                                                            mobileNotesSection.style.display = mobileNotesSection.style.display === 'none' ? 'block' : 'none';
                                                        }
                                                    }}
                                                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                                                >
                                                    Show Notes
                                                </button>
                                                <div id={`mobile-notes-${record.id}`} style={{ display: 'none' }} className="mt-2 pt-2 border-t border-gray-100">
                                                    <div className="text-xs text-gray-600">
                                                        <strong>Notes:</strong> {record.notes}
                                                    </div>
                                                </div>
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

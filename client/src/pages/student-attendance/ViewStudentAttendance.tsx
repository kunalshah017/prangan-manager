import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CalendarIcon,
  CheckIcon,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  UserIcon,
  Users,
  XIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import LoadingButterfly from "@/components/LoadingButterfly";
import { WeekendDatePicker } from "@/components/students/WeekendDatePicker";
import { ProfilePicture } from "@/components/ui";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { useSemesterLevels } from "@/hooks/useAcademicLevelQueries";
import { useCenter } from "@/hooks/useCenterQueries";
import { useProject } from "@/hooks/useProjectQueries";
import { useStudentAttendanceRecords } from "@/hooks/useStudentAttendanceQueries";
import { useSemester } from "@/hooks/useSemesterQueries";
import { createCsvWorkbook } from "@/lib/csv-export";
import { levelName, sortByJourneyOrder } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StudentAttendanceRecord } from "@/types/api";
import {
  formatDateToLocal,
  getClosestWeekendWithinRange,
  getNearestWeekend,
  getWeekendOnOrAfter,
  getWeekendOnOrBefore,
  isWeekendDate,
} from "@/utils/helper";

type LevelGroup = {
  key: string;
  label: string;
  students: Array<{
    id: string;
    name: string;
    profileImageUrl?: string;
    records: Map<string, StudentAttendanceRecord>;
  }>;
};

export const ViewStudentAttendance = () => {
  const { projectId, centerId, semesterId } = useParams();
  const [timeframe, setTimeframe] = useState<"single" | "range">("single");
  const [singleDate, setSingleDate] = useState(() => getNearestWeekend());
  const [fromDate, setFromDate] = useState(() => getNearestWeekend());
  const [toDate, setToDate] = useState(() => getNearestWeekend());
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [debouncedSingleDate, setDebouncedSingleDate] = useState(singleDate);
  const [debouncedFromDate, setDebouncedFromDate] = useState(fromDate);
  const [debouncedToDate, setDebouncedToDate] = useState(toDate);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasAppliedSemesterDefault = useRef(false);

  const { data: semester, isLoading: isLoadingSemester, error: semesterError } = useSemester(semesterId!);
  const { data: center } = useCenter(centerId ?? "");
  const { data: project } = useProject(projectId ?? "");
  const semesterLevelsQuery = useSemesterLevels(semesterId!);
  const semesterLevels = useMemo(
    () => sortByJourneyOrder(semesterLevelsQuery.data ?? []),
    [semesterLevelsQuery.data],
  );
  const semesterLevelById = useMemo(
    () => new Map(semesterLevels.map((level) => [level.id, level])),
    [semesterLevels],
  );
  const semesterStartDate = semester?.startDate.slice(0, 10) || "";
  const semesterEndDate = semester?.endDate.slice(0, 10) || "";

  const { date, startDate, endDate } = useMemo(() => {
    if (timeframe === "single" && debouncedSingleDate) return { date: debouncedSingleDate };
    if (timeframe === "range" && debouncedFromDate && debouncedToDate) {
      return { startDate: debouncedFromDate, endDate: debouncedToDate };
    }
    return {};
  }, [debouncedFromDate, debouncedSingleDate, debouncedToDate, timeframe]);
  const isAttendanceRangeWithinSemester = Boolean(
    semesterStartDate && semesterEndDate &&
    (date
      ? date >= semesterStartDate && date <= semesterEndDate && isWeekendDate(date)
      : startDate && endDate && startDate >= semesterStartDate && endDate <= semesterEndDate && startDate <= endDate && isWeekendDate(startDate) && isWeekendDate(endDate)),
  );
  const { data: attendanceData, isLoading, isFetching, error, refetch: refetchAttendance } = useStudentAttendanceRecords({
    projectId: projectId!,
    centerId: centerId!,
    semesterId: semesterId!,
    ...(date ? { date } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(selectedStatus ? { status: selectedStatus } : {}),
    enabled: isAttendanceRangeWithinSemester,
  });

  const levelKey = (record: StudentAttendanceRecord) => record.enrollment?.semesterLevelId ?? "UNASSIGNED";
  const levelLabel = (key: string) => key === "UNASSIGNED"
    ? "Level not assigned"
    : levelName(semesterLevelById.get(key)) || "Level not assigned";
  const sortLevelKeys = (first: string, second: string) =>
    (semesterLevelById.get(first)?.academicLevel.journeyOrder ?? Number.MAX_SAFE_INTEGER) -
      (semesterLevelById.get(second)?.academicLevel.journeyOrder ?? Number.MAX_SAFE_INTEGER) ||
    levelLabel(first).localeCompare(levelLabel(second));
  const compareAttendanceRecords = (first: StudentAttendanceRecord, second: StudentAttendanceRecord) =>
    sortLevelKeys(levelKey(first), levelKey(second)) ||
    (first.student?.name || "Unknown student").localeCompare(second.student?.name || "Unknown student");

  useEffect(() => {
    if (!semesterStartDate || !semesterEndDate || hasAppliedSemesterDefault.current) return;
    const today = formatDateToLocal(new Date());
    const referenceDate = today < semesterStartDate ? semesterStartDate : today > semesterEndDate ? semesterEndDate : today;
    const monthStart = formatDateToLocal(new Date(`${referenceDate}T00:00:00`).getFullYear() ? new Date(new Date(`${referenceDate}T00:00:00`).getFullYear(), new Date(`${referenceDate}T00:00:00`).getMonth(), 1) : new Date());
    const start = getWeekendOnOrAfter(monthStart < semesterStartDate ? semesterStartDate : monthStart, referenceDate);
    const end = getWeekendOnOrBefore(referenceDate, start);
    const classDate = getClosestWeekendWithinRange(getNearestWeekend(), semesterStartDate, semesterEndDate);
    hasAppliedSemesterDefault.current = true;
    setSingleDate(classDate);
    setDebouncedSingleDate(classDate);
    setTimeframe("range");
    setFromDate(start);
    setToDate(end);
    setDebouncedFromDate(start);
    setDebouncedToDate(end);
  }, [semesterEndDate, semesterStartDate]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSingleDate(singleDate), 500);
    return () => clearTimeout(timer);
  }, [singleDate]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFromDate(fromDate);
      setDebouncedToDate(toDate);
    }, 500);
    return () => clearTimeout(timer);
  }, [fromDate, toDate]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowExportDropdown(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filteredAttendance = useMemo(() => {
    const records = attendanceData?.attendance ?? [];
    return selectedLevel
      ? records.filter((record) => record.enrollment?.semesterLevelId === selectedLevel)
      : records;
  }, [attendanceData?.attendance, selectedLevel]);
  const monthTables = useMemo(() => {
    const months = new Map<string, StudentAttendanceRecord[]>();
    filteredAttendance.forEach((record) => {
      const key = record.date.slice(0, 7);
      months.set(key, [...(months.get(key) ?? []), record]);
    });
    return Array.from(months.entries()).sort(([first], [second]) => first.localeCompare(second)).map(([key, records]) => {
      const students = new Map<string, { id: string; name: string; profileImageUrl?: string; level: string; records: Map<string, StudentAttendanceRecord> }>();
      records.forEach((record) => {
        const studentId = record.student?.id ?? record.studentId;
        const student = students.get(studentId) ?? {
          id: studentId,
          name: record.student?.name ?? "Unknown student",
          profileImageUrl: record.student?.profileImageUrl,
          level: levelKey(record),
          records: new Map<string, StudentAttendanceRecord>(),
        };
        student.records.set(record.date.slice(0, 10), record);
        students.set(studentId, student);
      });
      const levels = Array.from(new Set(Array.from(students.values(), (student) => student.level)))
        .sort(sortLevelKeys)
        .map<LevelGroup>((key) => ({
          key,
          label: levelLabel(key),
          students: Array.from(students.values())
            .filter((student) => student.level === key)
            .sort((first, second) => first.name.localeCompare(second.name)),
        }));
      const holidays = records.filter((record) => record.status === "HOLIDAY").length;
      const present = records.filter((record) => record.status === "PRESENT").length;
      return {
        key,
        label: new Date(`${key}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        records,
        dates: Array.from(new Set(records.map((record) => record.date.slice(0, 10)))).sort(),
        levels,
        present,
        absent: records.filter((record) => record.status === "ABSENT").length,
        holidays,
        attendanceRate: records.length - holidays ? ((present / (records.length - holidays)) * 100).toFixed(1) : "0.0",
      };
    });
  // The resolver functions are derived from semesterLevelById on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAttendance, semesterLevelById]);
  const stats = useMemo(() => {
    const holidays = filteredAttendance.filter((record) => record.status === "HOLIDAY").length;
    const present = filteredAttendance.filter((record) => record.status === "PRESENT").length;
    const absent = filteredAttendance.filter((record) => record.status === "ABSENT").length;
    const workingDays = filteredAttendance.length - holidays;
    return { total: filteredAttendance.length, present, absent, holidays, attendancePercentage: workingDays ? ((present / workingDays) * 100).toFixed(1) : "0.0" };
  }, [filteredAttendance]);
  const hasActiveFilters = selectedStatus !== "" || selectedLevel !== "";
  const clearFilters = () => {
    setSelectedStatus("");
    setSelectedLevel("");
  };

  const exportRows = () => filteredAttendance.slice().sort(compareAttendanceRecords).map((record, index) => ({
    "S.No": index + 1,
    "Student Name": record.student?.name ?? "Unknown student",
    Level: levelLabel(levelKey(record)),
    Date: new Date(record.date).toLocaleDateString(),
    Status: record.status,
    "Holiday Reason": record.holidayReason ?? "",
    "Marked By": record.markedByUser?.name ?? "System",
  }));
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = createCsvWorkbook();
      const workbook = XLSX.utils.book_new();
      const rows = exportRows();
      if (timeframe === "range") {
        monthTables.forEach((month) => {
          const rowsForMonth = rows.filter((_, index) => filteredAttendance.slice().sort(compareAttendanceRecords)[index]?.date.startsWith(month.key));
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rowsForMonth), month.label.slice(0, 31));
        });
      } else {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Attendance");
      }
      XLSX.writeFile(workbook, `attendance-${semester?.name ?? "records"}.csv`);
      toast.success("Attendance export downloaded.");
    } catch {
      toast.error("Unable to export attendance.");
    } finally {
      setIsExporting(false);
    }
  };
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const addLogo = async (x: number) => {
        try {
          const image = new Image();
          image.src = "/images/logo/prangan-logo-light-mode.png";
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("Logo unavailable"));
          });
          doc.addImage(image, "PNG", x, 5, 40, 20);
        } catch (error) {
          console.warn("Could not load attendance report logo:", error);
        }
      };
      const safeName = (value: string | undefined, fallback: string) => (value || fallback).replace(/[^a-zA-Z0-9]/g, "_");

      if (timeframe === "single") {
        await addLogo(240);
        doc.setFontSize(16);
        doc.text("Student Attendance Report", 14, 15);
        doc.setFontSize(10);
        let y = 25;
        [`Project: ${project?.name ?? "Unknown Project"}`, `Center: ${center?.name ?? "Unknown Center"}`, `Semester: ${semester?.name ?? "Unknown Semester"}`, `Date: ${singleDate}`,
          ...(selectedStatus ? [`Status: ${selectedStatus}`] : []), ...(selectedLevel ? [`Level: ${levelLabel(selectedLevel)}`] : []),
          `Total Records: ${stats.total}, Present: ${stats.present}, Absent: ${stats.absent}, Holidays: ${stats.holidays}`,
        ].forEach((line) => { doc.text(line, 14, y); y += 5; });
        autoTable(doc, {
          head: [["S.No", "Student Name", "Level", "Date", "Status", "Marked By"]],
          body: exportRows().map((row) => [row["S.No"], row["Student Name"], row.Level, row.Date, row.Status, row["Marked By"]]),
          startY: y + 5,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [255, 152, 0] },
          columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 50 }, 2: { cellWidth: 35 }, 3: { cellWidth: 30 }, 4: { cellWidth: 25 }, 5: { cellWidth: 40 } },
        });
      } else {
        for (const [index, month] of monthTables.entries()) {
          if (index) doc.addPage();
          await addLogo(240);
          doc.setFontSize(14);
          doc.text(`Attendance Report - ${month.label}`, 14, 15);
          doc.setFontSize(9);
          doc.text(`Project: ${project?.name ?? "Unknown Project"} | Center: ${center?.name ?? "Unknown Center"} | Semester: ${semester?.name ?? "Unknown Semester"}`, 14, 22);
          const holidayReasons = new Map(month.dates.filter((day) => {
            const records = month.records.filter((record) => record.date.slice(0, 10) === day);
            return records.length > 0 && records.every((record) => record.status === "HOLIDAY");
          }).map((day) => [day, month.records.find((record) => record.date.slice(0, 10) === day)?.holidayReason || "Holiday"]));
          const head = [["Student Name", ...month.dates.map((day) => {
            const date = new Date(`${day}T00:00:00`);
            const label = `${date.toLocaleDateString("en-US", { month: "short" })} ${date.getDate()}`;
            return holidayReasons.has(day) ? `${label}\nHOLIDAY:\n${holidayReasons.get(day)}` : `${label}\n${date.toLocaleDateString("en-US", { weekday: "short" })}`;
          })]];
          const rows = month.levels.flatMap((level) => [
            [level.label, ...month.dates.map(() => "")],
            ...level.students.map((student) => [student.name, ...month.dates.map((day) => {
              if (holidayReasons.has(day)) return "";
              const status = student.records.get(day)?.status;
              return status === "PRESENT" ? "PRESENT" : status === "ABSENT" ? "ABSENT" : status === "HOLIDAY" ? "HOLIDAY" : "-";
            })]),
          ]);
          autoTable(doc, {
            head, body: rows, startY: 28,
            styles: { fontSize: 6, cellPadding: 1.5, halign: "center" },
            headStyles: { fillColor: [255, 152, 0], fontStyle: "bold", fontSize: 7 },
            columnStyles: { 0: { cellWidth: 40, halign: "left" } },
            didParseCell: ({ section, column, row, cell }) => {
              const text = cell.text.join(" ");
              if (section === "head" && column.index > 0 && text.includes("HOLIDAY:")) {
                cell.styles.fillColor = [219, 234, 254]; cell.styles.textColor = [37, 99, 235]; cell.styles.fontStyle = "bold";
              }
              if (section === "body" && column.index === 0 && rows[row.index]?.slice(1).every((value) => value === "")) {
                cell.styles.fontStyle = "bold"; cell.styles.fillColor = [240, 240, 240]; cell.styles.fontSize = 7;
              }
              if (section === "body" && column.index > 0) {
                if (head[0][column.index]?.includes("HOLIDAY:")) cell.styles.fillColor = [219, 234, 254];
                else if (text === "PRESENT") { cell.styles.textColor = [0, 128, 0]; cell.styles.fontStyle = "bold"; }
                else if (text === "ABSENT") { cell.styles.textColor = [220, 38, 38]; cell.styles.fontStyle = "bold"; }
              }
            },
          });
        }

        const daysDiff = Math.ceil((new Date(`${toDate}T00:00:00`).getTime() - new Date(`${fromDate}T00:00:00`).getTime()) / 86_400_000);
        if (daysDiff >= 20) {
          const students = new Map<string, { name: string; level: string; months: Map<string, { present: number; absent: number; holidays: number }> }>();
          filteredAttendance.forEach((record) => {
            const id = record.student?.id ?? record.studentId;
            const month = record.date.slice(0, 7);
            const student = students.get(id) ?? { name: record.student?.name ?? "Unknown student", level: levelKey(record), months: new Map() };
            const counts = student.months.get(month) ?? { present: 0, absent: 0, holidays: 0 };
            if (record.status === "PRESENT") counts.present++;
            else if (record.status === "ABSENT") counts.absent++;
            else if (record.status === "HOLIDAY") counts.holidays++;
            student.months.set(month, counts);
            students.set(id, student);
          });
          const months = monthTables.map(({ key, label }) => ({ key, label }));
          const levels = Array.from(new Set(Array.from(students.values(), (student) => student.level))).sort(sortLevelKeys);
          const columns = 1 + months.length * 3 + 2;
          const summaryRows: (string | number)[][] = [];
          levels.forEach((level) => {
            summaryRows.push([levelLabel(level), ...Array(columns - 1).fill("")]);
            Array.from(students.values()).filter((student) => student.level === level).sort((a, b) => a.name.localeCompare(b.name)).forEach((student) => {
              let present = 0; let absent = 0; let holidays = 0;
              const monthly = months.flatMap(({ key }) => {
                const value = student.months.get(key);
                if (!value) return ["-", "-", "-"];
                present += value.present; absent += value.absent; holidays += value.holidays;
                const total = value.present + value.absent;
                return [value.present, value.absent, `${total ? (value.present / total * 100).toFixed(1) : "0.0"}%`];
              });
              const total = present + absent;
              const rate = total ? present / total * 100 : 0;
              summaryRows.push([student.name, ...monthly, `${rate.toFixed(1)}%`, rate >= 90 ? "Excellent" : rate >= 80 ? "Good" : rate >= 70 ? "Satisfactory" : rate >= 60 ? "Needs Improvement" : "Poor - Intervention Required"]);
            });
          });

          doc.addPage();
          await addLogo(240);
          doc.setFontSize(16);
          doc.text("Attendance Summary", 14, 15);
          doc.setFontSize(9);
          doc.text(`Project: ${project?.name ?? "Unknown Project"} | Center: ${center?.name ?? "Unknown Center"} | Semester: ${semester?.name ?? "Unknown Semester"}`, 14, 22);
          doc.text(`Period: ${fromDate} to ${toDate}`, 14, 27);
          const summaryHead = [["Student Name", ...months.flatMap(({ label }) => [label, "", ""]), "Overall Avg%", "Remarks"], ["", ...months.flatMap(() => ["Present", "Absent", "Avg%"]), "", ""]];
          autoTable(doc, {
            head: summaryHead, body: summaryRows, startY: 32,
            styles: { fontSize: 6, cellPadding: 1.2, halign: "center" },
            headStyles: { fillColor: [255, 152, 0], fontStyle: "bold", fontSize: 6 },
            columnStyles: { 0: { cellWidth: 32, halign: "left" }, [columns - 2]: { cellWidth: 17 }, [columns - 1]: { cellWidth: 39, halign: "left" } },
            didParseCell: ({ section, column, row, cell }) => {
              if (section === "body" && column.index === 0 && levels.includes(String(cell.text[0]))) {
                cell.styles.fillColor = [255, 224, 178]; cell.styles.fontStyle = "bold";
              }
              if (section === "body" && summaryRows[row.index]?.[columns - 1] === "Needs Improvement") {
                cell.styles.fillColor = [255, 243, 224];
                cell.styles.textColor = [173, 82, 0];
                cell.styles.fontStyle = "bold";
              }
              if (section === "body" && cell.text[0]?.includes("%")) {
                const value = Number.parseFloat(cell.text[0]);
                cell.styles.textColor = value >= 90 ? [0, 97, 0] : value >= 70 ? [133, 100, 4] : [180, 35, 24];
                cell.styles.fontStyle = "bold";
              }
            },
          });

          const byLevel = levels.map((level) => {
            const records = filteredAttendance.filter((record) => levelKey(record) === level);
            const present = records.filter((record) => record.status === "PRESENT").length;
            const working = records.filter((record) => record.status !== "HOLIDAY").length;
            return { label: levelLabel(level), rate: working ? present / working * 100 : 0 };
          });
          const byMonth = months.map(({ key, label }) => {
            const records = filteredAttendance.filter((record) => record.date.startsWith(key));
            const present = records.filter((record) => record.status === "PRESENT").length;
            const working = records.filter((record) => record.status !== "HOLIDAY").length;
            return { label: label.replace(/\s+\d{4}$/, ""), rate: working ? present / working * 100 : 0 };
          });
          doc.addPage();
          await addLogo(240);
          doc.setFontSize(16);
          doc.text("Attendance Analytics & Insights", 14, 15);
          doc.setFontSize(9);
          doc.text(`Project: ${project?.name ?? "Unknown Project"} | Center: ${center?.name ?? "Unknown Center"} | Semester: ${semester?.name ?? "Unknown Semester"}`, 14, 22);
          doc.text(`Period: ${fromDate} to ${toDate}`, 14, 27);
          doc.setFontSize(11);
          doc.text("Overall Attendance", 14, 42);
          doc.setFontSize(10);
          doc.text(`Students: ${students.size}     Present: ${stats.present}     Absent: ${stats.absent}     Holidays: ${stats.holidays}     Overall rate: ${stats.attendancePercentage}%`, 14, 50);
          const drawBars = (title: string, data: Array<{ label: string; rate: number }>, x: number, y: number, width: number) => {
            doc.setFontSize(11); doc.text(title, x, y);
            const slot = width / Math.max(data.length, 1);
            data.forEach((item, i) => {
              const barHeight = Math.max(1, Math.min(100, item.rate)) * 0.65;
              const barX = x + i * slot + 3;
              doc.setFillColor(255, 152, 0); doc.rect(barX, y + 77 - barHeight, Math.max(3, slot - 8), barHeight, "F");
              doc.setFontSize(7); doc.text(`${item.rate.toFixed(0)}%`, barX, y + 73 - barHeight);
              doc.text(item.label.slice(0, 16), barX, y + 84, { maxWidth: slot - 2 });
            });
            doc.setDrawColor(180, 180, 180); doc.line(x, y + 78, x + width, y + 78);
          };
          drawBars("Level-wise Attendance Rate", byLevel, 14, 70, 125);
          drawBars("Monthly Attendance Trend", byMonth, 155, 70, 125);
          const best = byLevel.slice().sort((a, b) => b.rate - a.rate)[0];
          doc.setFillColor(255, 248, 225); doc.roundedRect(14, 173, 268, 20, 2, 2, "F");
          doc.setFontSize(9);
          doc.text(`Key insight: ${best ? `${best.label} has the highest attendance rate at ${best.rate.toFixed(1)}%.` : "No level attendance data is available."}`, 20, 185);
        }
      }
      const range = timeframe === "single" ? singleDate : `${fromDate}_to_${toDate}`;
      doc.save(`Student_Attendance_${safeName(project?.name, "Unknown_Project")}_${safeName(center?.name, "Unknown_Center")}_${safeName(semester?.name, "Unknown_Semester")}_${range.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
      toast.success("Attendance PDF downloaded.");
    } catch (error) {
      console.error("Error exporting student attendance PDF:", error);
      toast.error("Unable to export attendance PDF.");
    } finally {
      setIsExporting(false);
    }
  };
  const statusIcon = (status: StudentAttendanceRecord["status"]) => status === "PRESENT"
    ? <CheckIcon className="h-4 w-4 text-success" aria-hidden="true" />
    : status === "ABSENT" ? <XIcon className="h-4 w-4 text-destructive" aria-hidden="true" />
      : <CalendarIcon className="h-4 w-4 text-primary" aria-hidden="true" />;

  if (isLoadingSemester || isLoading || semesterLevelsQuery.isLoading) return <WorkspacePage><div className="flex min-h-[55dvh] items-center justify-center overflow-x-clip"><LoadingButterfly size="md" /></div></WorkspacePage>;
  if (semesterError || error || semesterLevelsQuery.error) return <WorkspacePage><div className="flex min-h-[55dvh] items-center justify-center"><div className="rounded-lg border border-border bg-card p-6 text-center"><RefreshCw className="mx-auto h-8 w-8 text-destructive" /><h1 className="mt-3 text-xl font-semibold">Attendance could not be loaded</h1><button type="button" className="mt-4 min-h-11 rounded-md border border-border px-4" onClick={() => void refetchAttendance()}>Try again</button></div></div></WorkspacePage>;

  return <WorkspacePage className="overflow-x-clip">
    <WorkspacePageHeader title="Student attendance" description="Review attendance by class day, month, and academic level." />
    <section className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm" aria-labelledby="attendance-filters-heading">
      <div className="mb-4 flex items-center justify-between"><div><h2 id="attendance-filters-heading" className="flex items-center gap-2 text-lg font-semibold"><SlidersHorizontal className="h-5 w-5 text-primary" />Filter records</h2><p className="mt-1 text-sm text-muted-foreground">Choose a class day or date range.</p></div>{hasActiveFilters && <button type="button" onClick={clearFilters} className="min-h-11 px-3 text-sm text-primary">Clear filters</button>}</div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        <div className="order-1 md:col-span-2 lg:col-span-4">
          <span className="mb-2 block text-sm font-medium">Timeframe</span>
          <div className="grid grid-cols-2 rounded-md border border-border bg-muted p-1">
            <button type="button" aria-pressed={timeframe === "single"} className={cn("min-h-11 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", timeframe === "single" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} onClick={() => setTimeframe("single")}>Single date</button>
            <button type="button" aria-pressed={timeframe === "range"} className={cn("min-h-11 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", timeframe === "range" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} onClick={() => setTimeframe("range")}>Date range</button>
          </div>
        </div>
        <div className="order-3 grid self-start gap-2 text-sm font-medium lg:order-2 lg:col-span-4">
          <span id="attendance-status-label">Status</span>
          <Select value={selectedStatus || "ALL"} onValueChange={(value) => setSelectedStatus(value === "ALL" ? "" : value)}>
            <SelectTrigger aria-labelledby="attendance-status-label" className="h-11 border-input bg-background text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All</SelectItem><SelectItem value="PRESENT">Present</SelectItem><SelectItem value="ABSENT">Absent</SelectItem><SelectItem value="HOLIDAY">Holiday</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="order-4 grid self-start gap-2 text-sm font-medium lg:order-3 lg:col-span-4">
          <span id="attendance-level-label">Level</span>
          <Select value={selectedLevel || "ALL"} onValueChange={(value) => setSelectedLevel(value === "ALL" ? "" : value)}>
            <SelectTrigger aria-labelledby="attendance-level-label" className="h-11 border-input bg-background text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All</SelectItem>{semesterLevels.map((level) => <SelectItem key={level.id} value={level.id}>{levelName(level)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {timeframe === "single" ? <div className="order-2 grid gap-2 text-sm font-medium md:col-span-2 lg:order-4 lg:col-span-6"><span>Single date</span><WeekendDatePicker label="Single date" value={singleDate} min={semesterStartDate} max={semesterEndDate} onChange={setSingleDate} /></div> : <div className="order-2 grid gap-3 md:col-span-2 md:grid-cols-2 lg:order-4 lg:col-span-12 lg:grid-cols-12">
          <label className="grid content-start gap-2 text-sm font-medium text-foreground lg:col-span-6">From date<WeekendDatePicker label="From date" value={fromDate} min={semesterStartDate} max={semesterEndDate} onChange={setFromDate} /></label>
          <label className="grid content-start gap-2 text-sm font-medium text-foreground lg:col-span-6">To date<WeekendDatePicker label="To date" value={toDate} min={semesterStartDate} max={semesterEndDate} onChange={setToDate} /></label>
        </div>}
      </div>
      <p className={cn("mt-4 text-xs", isAttendanceRangeWithinSemester ? "text-muted-foreground" : "text-destructive")} role={isAttendanceRangeWithinSemester ? undefined : "alert"}>Attendance records are available only between {semesterStartDate} and {semesterEndDate}.</p>
    </section>
    <section className="my-6 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Attendance statistics">{[["Records", stats.total], ["Present", stats.present], ["Absent", stats.absent], ["Holidays", stats.holidays], ["Attendance rate", `${stats.attendancePercentage}%`]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-border bg-card p-4"><div className="text-2xl font-semibold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>)}</section>
    {timeframe === "range" && monthTables.length > 1 && <nav className="mb-4 rounded-lg border border-border bg-card p-4" aria-label="Jump to month"><p className="text-sm font-semibold">Jump to month</p><div className="mt-3 flex gap-2 overflow-x-auto">{monthTables.map((month) => <a key={month.key} href={`#attendance-month-${month.key}`} className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-border px-3 text-sm">{month.label}</a>)}</div></nav>}
    <section aria-labelledby="attendance-records-heading"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="attendance-records-heading" className="flex min-w-0 items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5 shrink-0 text-primary" />Attendance records {isFetching && <span className="text-xs text-muted-foreground">Updating...</span>}</h2>{filteredAttendance.length > 0 && <div className="relative shrink-0" ref={dropdownRef}><button type="button" onClick={() => setShowExportDropdown((open) => !open)} className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md border border-border bg-card px-4"><Download className="h-4 w-4" />{isExporting ? "Exporting..." : "Export records"}<ChevronDown className="h-4 w-4" /></button>{showExportDropdown && <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border border-border bg-card p-1 shadow-lg"><button type="button" onClick={() => void exportToExcel()} className="flex min-h-11 w-full items-center gap-2 px-3"><FileSpreadsheet className="h-4 w-4" />Export CSV</button><button type="button" onClick={() => void exportToPDF()} className="flex min-h-11 w-full items-center gap-2 px-3"><FileText className="h-4 w-4" />Export PDF</button></div>}</div>}</div>{filteredAttendance.length === 0 ? <div className="rounded-lg border border-border bg-card px-6 py-14 text-center"><UserIcon className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">No attendance records</h3><p className="mt-2 text-sm text-muted-foreground">{hasActiveFilters ? "No records match the selected filters." : "No attendance was marked during this period."}</p></div> : <div className="space-y-6">{monthTables.map((month) => <article key={month.key} id={`attendance-month-${month.key}`} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"><header className="border-b border-border p-4"><h3 className="text-xl font-semibold">{month.label}</h3><p className="mt-1 text-sm text-muted-foreground">{month.dates.length} class days · {month.records.length} attendance records · {month.attendanceRate}% rate</p></header><div className="max-w-full overflow-x-auto"><table className="w-full min-w-max border-separate border-spacing-0 text-sm"><thead><tr className="bg-muted"><th scope="col" className="sticky left-0 z-20 min-w-52 border-b border-r border-border bg-muted px-4 py-3 text-left">Student Name</th>{month.dates.map((day) => <th key={day} scope="col" className="min-w-24 border-b border-border px-3 py-3 text-center">{new Date(`${day}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</th>)}</tr></thead><tbody>{month.levels.map((level) => <Fragment key={level.key}><tr className="bg-primary/5"><th scope="rowgroup" className="sticky left-0 z-20 min-w-52 border-y border-r border-border bg-primary/5 px-4 py-2 text-left text-xs font-semibold uppercase text-primary">{level.label}</th><td colSpan={month.dates.length} className="border-y border-border bg-primary/5" /></tr>{level.students.map((student) => <tr key={student.id}><th scope="row" className="sticky left-0 z-10 min-w-52 border-b border-r border-border bg-card px-4 py-3 text-left"><span className="flex items-center gap-3"><ProfilePicture imageUrl={student.profileImageUrl} name={student.name} size="sm" colorScheme="orange" />{student.name}</span></th>{month.dates.map((day) => { const record = student.records.get(day); return <td key={day} className="border-b border-border px-3 py-3 text-center">{record ? statusIcon(record.status) : "–"}</td>; })}</tr>)}</Fragment>)}</tbody></table></div></article>)}</div>}</section>
  </WorkspacePage>;
};

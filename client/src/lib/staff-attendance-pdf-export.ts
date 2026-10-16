import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { buildStaffAttendancePdfModel } from "@/lib/staff-attendance-pdf";
import type { AttendanceRecord } from "@/types/api";

type ExportMetadata = {
  projectName?: string;
  centerName?: string;
  semesterName?: string;
  periodLabel: string;
};

export type StaffAttendancePdfExportInput = ExportMetadata & {
  records: AttendanceRecord[];
  timeframe: "single" | "range";
};

const theme: Record<"primary" | "ink" | "muted" | "surface", [number, number, number]> = {
  primary: [221, 119, 0],
  ink: [56, 38, 12],
  muted: [100, 82, 54],
  surface: [255, 246, 232],
};

const statusShortLabel: Record<AttendanceRecord["status"], string> = {
  PRESENT: "P",
  ABSENT: "A",
  NOT_AVAILABLE: "NA",
  HOLIDAY: "H",
};

const statusLabel: Record<AttendanceRecord["status"], string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  NOT_AVAILABLE: "Not available",
  HOLIDAY: "Holiday",
};

const safeFilenamePart = (value?: string) =>
  (value || "Unknown").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export const groupStaffAttendanceRecordsByMonth = (
  records: AttendanceRecord[],
) => {
  const groups = new Map<string, AttendanceRecord[]>();
  for (const record of records) {
    const key = record.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) || []), record]);
  }
  return Array.from(groups, ([key, monthRecords]) => ({
    key,
    label: new Date(`${key}-01T00:00:00`).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    }),
    records: monthRecords,
  })).sort((left, right) => left.key.localeCompare(right.key));
};

export const getStaffAttendancePdfFilename = ({
  projectName,
  centerName,
  periodLabel,
}: Pick<ExportMetadata, "projectName" | "centerName" | "periodLabel">) =>
  `Staff_Attendance_${safeFilenamePart(projectName)}_${safeFilenamePart(centerName)}_${safeFilenamePart(periodLabel)}.pdf`;

const displayDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });

const roleName = (role: string) =>
  role === "CENTER_MANAGER" ? "Center manager" : "Educator";

const loadReportLogo = () =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = "/images/logo/prangan-logo-light-mode.png";
  });

const drawReportHeader = (
  doc: jsPDF,
  metadata: ExportMetadata,
  title: string,
  logo: HTMLImageElement | null,
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...theme.primary);
  doc.rect(0, 0, pageWidth, 6, "F");
  if (logo) doc.addImage(logo, "PNG", pageWidth - 47, 9, 35, 15);
  doc.setTextColor(...theme.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 12, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...theme.muted);
  doc.text(
    doc.splitTextToSize(
      [metadata.projectName, metadata.centerName, metadata.semesterName]
        .filter(Boolean)
        .join(" | "),
      pageWidth - 62,
    )[0] || "",
    12,
    22,
  );
  doc.text(`Period: ${metadata.periodLabel}`, 12, 28);
};

const drawSingleDatePage = (
  doc: jsPDF,
  metadata: ExportMetadata,
  records: AttendanceRecord[],
  logo: HTMLImageElement | null,
) => {
  drawReportHeader(doc, metadata, "Staff attendance report", logo);
  const counts = buildStaffAttendancePdfModel({ records }).statusTotals;
  doc.setFontSize(9);
  doc.setTextColor(...theme.muted);
  doc.text(
    `${records.length} records    Present ${counts.PRESENT}    Absent ${counts.ABSENT}    Not available ${counts.NOT_AVAILABLE}    Holiday ${counts.HOLIDAY}`,
    12,
    37,
  );
  const rows = records
    .slice()
    .sort((a, b) => (a.roleAssignment?.subRole === b.roleAssignment?.subRole ? a.userName.localeCompare(b.userName) : a.roleAssignment?.subRole === "CENTER_MANAGER" ? -1 : 1))
    .map((record, index) => [
      String(index + 1),
      record.userName,
      roleName(record.roleAssignment?.subRole || "EDUCATOR"),
      statusLabel[record.status],
      record.markedAt && !Number.isNaN(new Date(record.markedAt).getTime())
        ? new Date(record.markedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
        : "-",
      record.markedByName || "System",
    ]);
  autoTable(doc, {
    startY: 43,
    head: [["S.No", "Name", "Role", "Status", "Time", "Marked by"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: theme.primary, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: theme.surface },
    columnStyles: { 0: { cellWidth: 13 }, 1: { cellWidth: 45 }, 2: { cellWidth: 32 }, 3: { cellWidth: 27 }, 4: { cellWidth: 23 } },
    margin: { top: 40, left: 12, right: 12, bottom: 15 },
    didParseCell: ({ section, column, cell }) => {
      if (section !== "body" || column.index !== 3) return;
      if (cell.text[0] === "Present") cell.styles.textColor = [0, 128, 0];
      if (cell.text[0] === "Absent") cell.styles.textColor = [180, 35, 24];
      if (cell.text[0] === "Holiday") cell.styles.textColor = [37, 99, 235];
      cell.styles.fontStyle = "bold";
    },
    willDrawPage: () => drawReportHeader(doc, metadata, "Staff attendance report", logo),
  });
};

const drawMonthDetailPage = (
  doc: jsPDF,
  metadata: ExportMetadata,
  label: string,
  records: AttendanceRecord[],
  logo: HTMLImageElement | null,
) => {
  const model = buildStaffAttendancePdfModel({ records });
  drawReportHeader(doc, metadata, `Staff attendance - ${label}`, logo);
  doc.setFontSize(7);
  doc.setTextColor(...theme.muted);
  doc.text("P = Present   A = Absent   NA = Not available   H = Holiday", 12, 35);

  const holidayDates = new Map(model.dates.flatMap((date) => {
    const dayRecords = records.filter((record) => record.date.slice(0, 10) === date);
    return dayRecords.length && dayRecords.every((record) => record.status === "HOLIDAY")
      ? [[date, dayRecords[0].holidayReason || "Holiday"] as const]
      : [];
  }));
  const head = [["Staff member", ...model.dates.map((date) =>
    holidayDates.has(date)
      ? `${displayDate(date)}\nHOLIDAY${holidayDates.get(date) === "Holiday" ? "" : `: ${holidayDates.get(date)}`}`
      : `${displayDate(date)}\n${new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short" })}`,
  )]];
  const body = model.roleGroups.flatMap((group) => [
    [{ content: roleName(group.role).toUpperCase(), colSpan: model.dates.length + 1, styles: { fillColor: [240, 240, 240] as [number, number, number], fontStyle: "bold" as const, halign: "left" as const } }],
    ...group.staff.map((person) => [
      person.name,
      ...person.statuses.map((status, index) => holidayDates.has(model.dates[index]) ? "" : status ? statusShortLabel[status] : "-"),
    ]),
  ]);

  autoTable(doc, {
    startY: 40,
    head,
    body: body.length ? body : [["No attendance records match the selected filters."]],
    styles: { fontSize: 8, cellPadding: 2, halign: "center", overflow: "linebreak" },
    headStyles: { fillColor: theme.primary, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: theme.surface },
    columnStyles: { 0: { halign: "left", cellWidth: 48 } },
    margin: { top: 40, left: 12, right: 12, bottom: 15 },
    didParseCell: ({ section, column, cell }) => {
      if (column.index === 0) return;
      if (holidayDates.has(model.dates[column.index - 1])) {
        cell.styles.fillColor = [219, 234, 254];
        if (section === "head") cell.styles.textColor = [37, 99, 235];
      } else if (section === "body") {
        if (cell.text[0] === "P") cell.styles.textColor = [0, 128, 0];
        if (cell.text[0] === "A") cell.styles.textColor = [180, 35, 24];
        if (cell.text[0] === "NA") cell.styles.textColor = [173, 82, 0];
        cell.styles.fontStyle = "bold";
      }
    },
    willDrawPage: () => drawReportHeader(doc, metadata, `Staff attendance - ${label}`, logo),
  });
};

const drawSummaryPage = (
  doc: jsPDF,
  metadata: ExportMetadata,
  records: AttendanceRecord[],
  logo: HTMLImageElement | null,
) => {
  const model = buildStaffAttendancePdfModel({ records });
  const months = groupStaffAttendanceRecordsByMonth(records);
  const chunks = Array.from({ length: Math.max(1, Math.ceil(months.length / 2)) }, (_, index) => months.slice(index * 2, index * 2 + 2));
  chunks.forEach((chunk, chunkIndex) => {
    if (chunkIndex > 0) doc.addPage("a4", "landscape");
    const showOverall = chunkIndex === chunks.length - 1;
    const rows = model.roleGroups.flatMap((group) => group.staff.map((person) => {
      const monthCells = chunk.flatMap((month) => {
        const counts = { PRESENT: 0, ABSENT: 0, NOT_AVAILABLE: 0, HOLIDAY: 0 };
        model.dates.forEach((date, index) => {
          if (date.startsWith(month.key) && person.statuses[index]) counts[person.statuses[index] as AttendanceRecord["status"]]++;
        });
        const basis = counts.PRESENT + counts.ABSENT;
        return [String(counts.PRESENT), String(counts.ABSENT), String(counts.NOT_AVAILABLE), String(counts.HOLIDAY), basis ? `${((counts.PRESENT / basis) * 100).toFixed(1)}%` : "-"];
      });
      const present = person.statuses.filter((status) => status === "PRESENT").length;
      const absent = person.statuses.filter((status) => status === "ABSENT").length;
      const percentage = present + absent ? (present / (present + absent)) * 100 : undefined;
      const remark = percentage === undefined ? "No working days" : percentage >= 90 ? "Excellent" : percentage >= 80 ? "Good" : percentage >= 70 ? "Satisfactory" : percentage >= 60 ? "Needs Improvement" : "Poor - Intervention Required";
      return [person.name, roleName(person.role), ...monthCells, ...(showOverall ? [percentage === undefined ? "-" : `${percentage.toFixed(1)}%`, remark] : [])];
    }));
    const monthColumns = Object.fromEntries(chunk.flatMap((_, monthIndex) => [
      ...[0, 1, 2, 3].map((offset) => [2 + monthIndex * 5 + offset, { cellWidth: 12 }] as const),
      [2 + monthIndex * 5 + 4, { cellWidth: 25 }] as const,
    ]));
    const headers = ["Staff member", "Role", ...chunk.flatMap(({ key }) => {
      const month = new Date(`${key}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      return ["P", "A", "NA", "H", `${month} Avg%`];
    }), ...(showOverall ? ["Overall Avg%", "Remarks"] : [])];
    const width = 40 + 25 + chunk.length * 73 + (showOverall ? 61 : 0);
    autoTable(doc, {
      head: [headers],
      body: rows.length ? rows : [["No matching attendance records"]],
      startY: 40,
      margin: { top: 40, left: (297 - width) / 2, right: (297 - width) / 2, bottom: 15 },
      styles: { fontSize: 7, cellPadding: 1.7, valign: "middle", halign: "center" },
      headStyles: { fillColor: theme.primary, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: theme.surface },
      columnStyles: {
        0: { cellWidth: 40, halign: "left" },
        1: { cellWidth: 25, halign: "left" },
        ...monthColumns,
        ...(showOverall ? { [2 + chunk.length * 5]: { cellWidth: 24 }, [3 + chunk.length * 5]: { cellWidth: 37, halign: "left" as const } } : {}),
      },
      didParseCell: ({ section, row, cell }) => {
        if (section !== "body") return;
        const remark = showOverall ? rows[row.index]?.[rows[row.index].length - 1] : undefined;
        if (remark === "Needs Improvement" || remark === "Poor - Intervention Required") {
          cell.styles.fillColor = [255, 235, 213];
          cell.styles.textColor = [173, 82, 0];
          cell.styles.fontStyle = "bold";
        }
        if (cell.text[0]?.includes("%")) {
          const rate = Number.parseFloat(cell.text[0]);
          cell.styles.textColor = rate >= 90 ? [0, 97, 0] : rate >= 70 ? [133, 100, 4] : [180, 35, 24];
          cell.styles.fontStyle = "bold";
        }
      },
      willDrawPage: () => drawReportHeader(doc, metadata, chunkIndex ? `Attendance Summary - Part ${chunkIndex + 1}` : "Attendance Summary", logo),
    });
  });
};

const drawInsightsPage = (
  doc: jsPDF,
  metadata: ExportMetadata,
  records: AttendanceRecord[],
  logo: HTMLImageElement | null,
) => {
  const model = buildStaffAttendancePdfModel({ records });
  drawReportHeader(doc, metadata, "Attendance Analytics & Insights", logo);
  const total = Object.values(model.statusTotals).reduce((sum, count) => sum + count, 0);
  const cards = [
    { key: "PRESENT", color: [22, 163, 74], x: 14 },
    { key: "ABSENT", color: [220, 38, 38], x: 83 },
    { key: "NOT_AVAILABLE", color: [217, 119, 6], x: 152 },
    { key: "HOLIDAY", color: [79, 70, 229], x: 221 },
  ] as const;

  cards.forEach(({ key, color, x }) => {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, 46, 61, 34, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(String(model.statusTotals[key]), x + 8, 61);
    doc.setFontSize(8);
    doc.text(statusLabel[key], x + 8, 72);
  });

  doc.setTextColor(...theme.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Overall attendance rate", 14, 100);
  doc.setFontSize(30);
  doc.setTextColor(...theme.primary);
  doc.text(`${model.attendanceRate}%`, 14, 119);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...theme.muted);
  doc.setFontSize(8);
  doc.text("Present / (Present + Absent)", 14, 128);
  doc.text(`${total} recorded attendance entries`, 14, 136);

  doc.setTextColor(...theme.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Role-wise attendance rate", 128, 100);
  model.roleGroups.forEach((group, index) => {
    const y = 113 + index * 27;
    const rate = Number(group.attendanceRate);
    doc.setFontSize(9);
    doc.setTextColor(...theme.muted);
    doc.text(group.role === "CENTER_MANAGER" ? "Center managers" : "Educators", 128, y);
    doc.setFillColor(242, 229, 207);
    doc.roundedRect(128, y + 4, 130, 8, 2, 2, "F");
    doc.setFillColor(...theme.primary);
    doc.roundedRect(128, y + 4, Math.max(0, Math.min(130, (rate / 100) * 130)), 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.text(`${group.attendanceRate}%`, 263, y + 10, { align: "right" });
    doc.setFont("helvetica", "normal");
  });
};

export const exportStaffAttendancePdf = async (
  input: StaffAttendancePdfExportInput,
) => {
  const doc = new jsPDF({ orientation: input.timeframe === "single" ? "portrait" : "landscape", unit: "mm", format: "a4" });
  const logo = await loadReportLogo();
  const months = groupStaffAttendanceRecordsByMonth(input.records);

  if (input.timeframe === "single") {
    drawSingleDatePage(doc, input, input.records, logo);
  } else if (months.length === 0) {
    drawMonthDetailPage(doc, input, "Selected period", [], logo);
  } else {
    months.forEach((month, index) => {
      if (index > 0) doc.addPage();
      drawMonthDetailPage(doc, input, month.label, month.records, logo);
    });
  }

  doc.addPage("a4", "landscape");
  drawSummaryPage(doc, input, input.records, logo);
  doc.addPage("a4", "landscape");
  drawInsightsPage(doc, input, input.records, logo);
  for (let page = 1; page <= doc.internal.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...theme.muted);
    doc.text(`Page ${page} of ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.getWidth() - 12, doc.internal.pageSize.getHeight() - 7, { align: "right" });
  }
  doc.save(getStaffAttendancePdfFilename(input));
};

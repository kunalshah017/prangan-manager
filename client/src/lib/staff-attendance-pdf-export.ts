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
  doc.setFillColor(...theme.primary);
  doc.rect(0, 0, 297, 6, "F");
  if (logo) doc.addImage(logo, "PNG", 250, 9, 35, 15);
  doc.setTextColor(...theme.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 12, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...theme.muted);
  doc.text(
    [metadata.projectName, metadata.centerName, metadata.semesterName]
      .filter(Boolean)
      .join(" · "),
    12,
    22,
  );
  doc.text(`Period: ${metadata.periodLabel}`, 12, 28);
};

const drawMonthDetailPage = (
  doc: jsPDF,
  metadata: ExportMetadata,
  label: string,
  records: AttendanceRecord[],
  logo: HTMLImageElement | null,
) => {
  const model = buildStaffAttendancePdfModel({ records });
  drawReportHeader(doc, metadata, `Staff attendance — ${label}`, logo);
  doc.setFontSize(7);
  doc.setTextColor(...theme.muted);
  doc.text("P = Present   A = Absent   NA = Not available   H = Holiday", 12, 35);

  const head = [["Staff member", "Role", ...model.dates.map(displayDate)]];
  const body = model.roleGroups.flatMap((group) =>
    group.staff.map((person) => [
      person.name,
      group.role === "CENTER_MANAGER" ? "Center manager" : "Educator",
      ...person.statuses.map((status) => (status ? statusShortLabel[status] : "—")),
    ]),
  );

  autoTable(doc, {
    startY: 40,
    head,
    body: body.length ? body : [["No attendance records match the selected filters."]],
    styles: { fontSize: 7, cellPadding: 1.6, halign: "center" },
    headStyles: { fillColor: theme.primary, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: theme.surface },
    columnStyles: { 0: { halign: "left", cellWidth: 48 }, 1: { halign: "left", cellWidth: 30 } },
    margin: { left: 12, right: 12 },
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
  const rows = model.roleGroups.flatMap((group) => group.staff.map((person) => {
    let present = 0;
    let absent = 0;
    const monthlyRates = months.map((month) => {
      let monthPresent = 0;
      let monthAbsent = 0;
      model.dates.forEach((date, index) => {
        if (!date.startsWith(month.key)) return;
        if (person.statuses[index] === "PRESENT") monthPresent++;
        if (person.statuses[index] === "ABSENT") monthAbsent++;
      });
      present += monthPresent;
      absent += monthAbsent;
      const total = monthPresent + monthAbsent;
      return total ? `${((monthPresent / total) * 100).toFixed(1)}%` : "–";
    });
    const total = present + absent;
    const percentage = total ? (present / total) * 100 : undefined;
    const remark = percentage === undefined ? "No working days" : percentage >= 90 ? "Excellent" : percentage >= 80 ? "Good" : percentage >= 70 ? "Satisfactory" : percentage >= 60 ? "Needs Improvement" : "Poor - Intervention Required";
    return [person.name, person.role === "CENTER_MANAGER" ? "Center manager" : "Educator", ...monthlyRates, percentage === undefined ? "–" : `${percentage.toFixed(1)}%`, remark];
  }));
  const headers = ["Staff member", "Role", ...months.map(({ key }) => new Date(`${key}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })), "Overall Avg%", "Remarks"];
  if (rows.length === 0) rows.push(["No matching attendance records", "–", ...Array(months.length + 2).fill("–")]);
  const monthWidth = Math.min(20, 152 / Math.max(months.length, 1));
  const monthColumns = Object.fromEntries(months.map((_, index) => [index + 2, { cellWidth: monthWidth, halign: "center" as const }]));

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 36,
    margin: { top: 36, left: 12, right: 12, bottom: 12 },
    styles: { fontSize: 7, cellPadding: 1.6, valign: "middle", halign: "center" },
    headStyles: { fillColor: theme.primary, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: theme.surface },
    columnStyles: {
      0: { cellWidth: 40, halign: "left" },
      1: { cellWidth: 25, halign: "left" },
      ...monthColumns,
      [months.length + 2]: { cellWidth: 21 },
      [months.length + 3]: { cellWidth: 35, halign: "left" },
    },
    didParseCell: ({ section, row, cell }) => {
      if (section !== "body") return;
      const remark = rows[row.index]?.[rows[row.index].length - 1];
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
    willDrawPage: () => drawReportHeader(doc, metadata, "Attendance Summary", logo),
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
  doc.text("Present ÷ (Present + Absent)", 14, 128);
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
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logo = await loadReportLogo();
  const months = groupStaffAttendanceRecordsByMonth(input.records);

  if (months.length === 0) {
    drawMonthDetailPage(doc, input, "Selected period", [], logo);
  } else {
    months.forEach((month, index) => {
      if (index > 0) doc.addPage();
      drawMonthDetailPage(doc, input, month.label, month.records, logo);
    });
  }

  doc.addPage();
  drawSummaryPage(doc, input, input.records, logo);
  doc.addPage();
  drawInsightsPage(doc, input, input.records, logo);
  doc.save(getStaffAttendancePdfFilename(input));
};

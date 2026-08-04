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

const drawReportHeader = (doc: jsPDF, metadata: ExportMetadata, title: string) => {
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 297, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 12, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    [metadata.projectName, metadata.centerName, metadata.semesterName]
      .filter(Boolean)
      .join(" · "),
    12,
    20,
  );
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(8);
  doc.text(`Period: ${metadata.periodLabel}`, 12, 31);
};

export const exportStaffAttendancePdf = (input: StaffAttendancePdfExportInput) => {
  const model = buildStaffAttendancePdfModel({ records: input.records });
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  drawReportHeader(doc, input, "Staff attendance detail");
  doc.setFontSize(7);
  doc.setTextColor(75, 85, 99);
  doc.text("P = Present   A = Absent   NA = Not available   H = Holiday", 12, 37);

  const head = [["Staff member", "Role", ...model.dates.map(displayDate)]];
  const body = model.roleGroups.flatMap((group) =>
    group.staff.map((person) => [
      person.name,
      group.role === "CENTER_MANAGER" ? "Center manager" : "Educator",
      ...person.statuses.map((status) => (status ? statusShortLabel[status] : "—")),
    ]),
  );

  autoTable(doc, {
    startY: 42,
    head,
    body: body.length ? body : [["No attendance records match the selected filters."]],
    styles: { fontSize: 7, cellPadding: 1.6, halign: "center" },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { halign: "left", cellWidth: 48 }, 1: { halign: "left", cellWidth: 30 } },
    margin: { left: 12, right: 12 },
  });

  doc.addPage();
  drawReportHeader(doc, input, "Attendance insights");
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

  doc.setTextColor(31, 41, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Overall attendance rate", 14, 100);
  doc.setFontSize(30);
  doc.setTextColor(30, 64, 175);
  doc.text(`${model.attendanceRate}%`, 14, 119);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 85, 99);
  doc.setFontSize(8);
  doc.text("Present ÷ (Present + Absent)", 14, 128);
  doc.text(`${total} recorded attendance entries`, 14, 136);

  doc.setTextColor(31, 41, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Role-wise attendance rate", 128, 100);
  model.roleGroups.forEach((group, index) => {
    const y = 113 + index * 27;
    const rate = Number(group.attendanceRate);
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text(group.role === "CENTER_MANAGER" ? "Center managers" : "Educators", 128, y);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(128, y + 4, 130, 8, 2, 2, "F");
    doc.setFillColor(30, 64, 175);
    doc.roundedRect(128, y + 4, Math.max(0, Math.min(130, (rate / 100) * 130)), 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.text(`${group.attendanceRate}%`, 263, y + 10, { align: "right" });
    doc.setFont("helvetica", "normal");
  });

  doc.save(getStaffAttendancePdfFilename(input));
};

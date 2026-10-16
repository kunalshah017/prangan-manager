import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { buildStaffAttendanceFollowUp, buildStaffAttendancePdfModel } from "@/lib/staff-attendance-pdf";
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

const summaryStatuses = [
  { label: "P", color: [0, 128, 0] },
  { label: "A", color: [180, 35, 24] },
  { label: "NA", color: [173, 82, 0] },
  { label: "H", color: [37, 99, 235] },
] as const;

const drawSummaryStatuses = (doc: jsPDF, values: string[], x: number, y: number, width: number) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  const separator = " / ";
  const separatorWidth = doc.getTextWidth(separator);
  const textWidth = values.reduce((sum, value) => sum + doc.getTextWidth(value), 0) + separatorWidth * (values.length - 1);
  let textX = x + (width - textWidth) / 2;
  values.forEach((value, index) => {
    const [red, green, blue] = summaryStatuses[index].color;
    doc.setTextColor(red, green, blue);
    doc.text(value, textX, y);
    textX += doc.getTextWidth(value);
    if (index < values.length - 1) {
      doc.setTextColor(...theme.muted);
      doc.text(separator, textX, y);
      textX += separatorWidth;
    }
  });
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
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3, lineWidth: 0.2, lineColor: [190, 180, 165] },
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
      ...person.statuses.map((status, index) => holidayDates.has(model.dates[index]) ? "" : status ? statusLabel[status] : "-"),
    ]),
  ]);

  autoTable(doc, {
    startY: 35,
    head,
    body: body.length ? body : [["No attendance records match the selected filters."]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, halign: "center", overflow: "linebreak", lineWidth: 0.2, lineColor: [190, 180, 165] },
    headStyles: { fillColor: theme.primary, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: theme.surface },
    columnStyles: {
      0: { halign: "left", cellWidth: 48 },
      ...Object.fromEntries(model.dates.map((_, index) => [index + 1, { cellWidth: 225 / model.dates.length }])),
    },
    margin: { top: 35, left: 12, right: 12, bottom: 15 },
    didParseCell: ({ section, column, cell }) => {
      if (column.index === 0) return;
      if (holidayDates.has(model.dates[column.index - 1])) {
        cell.styles.fillColor = [219, 234, 254];
        if (section === "head") cell.styles.textColor = [37, 99, 235];
      } else if (section === "body") {
        if (cell.text[0] === "Present") cell.styles.textColor = [0, 128, 0];
        if (cell.text[0] === "Absent") cell.styles.textColor = [180, 35, 24];
        if (cell.text[0] === "Not available") cell.styles.textColor = [173, 82, 0];
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
  const monthsPerPage = 7;
  const chunks = Array.from({ length: Math.max(1, Math.ceil(months.length / monthsPerPage)) }, (_, index) => months.slice(index * monthsPerPage, index * monthsPerPage + monthsPerPage));
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
        return `${counts.PRESENT}/${counts.ABSENT}/${counts.NOT_AVAILABLE}/${counts.HOLIDAY}|${basis ? `${((counts.PRESENT / basis) * 100).toFixed(1)}%` : "-"}`;
      });
      const present = person.statuses.filter((status) => status === "PRESENT").length;
      const absent = person.statuses.filter((status) => status === "ABSENT").length;
      const percentage = present + absent ? (present / (present + absent)) * 100 : undefined;
      const remark = percentage === undefined ? "No working days" : percentage >= 90 ? "Excellent" : percentage >= 80 ? "Good" : percentage >= 70 ? "Satisfactory" : percentage >= 60 ? "Needs Improvement" : "Poor - Intervention Required";
      return [person.name, ...monthCells, ...(showOverall ? [percentage === undefined ? "-" : `${percentage.toFixed(1)}%`, remark] : [])];
    }));
    const monthColumns = Object.fromEntries(chunk.flatMap((_, monthIndex) => [
      [1 + monthIndex, { cellWidth: 27 }] as const,
    ]));
    const headers = ["Staff member", ...chunk.flatMap(({ key }) => {
      const month = new Date(`${key}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      return [month];
    }), ...(showOverall ? ["Overall Avg%", "Remarks"] : [])];
    const width = 35 + chunk.length * 27 + (showOverall ? 52 : 0);
    autoTable(doc, {
      head: [headers],
      body: rows.length ? rows : [["No matching attendance records"]],
      startY: 40,
      margin: { top: 40, left: (297 - width) / 2, right: (297 - width) / 2, bottom: 15 },
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.7, valign: "middle", halign: "center", overflow: "linebreak", lineWidth: 0.2, lineColor: [190, 180, 165] },
      headStyles: { fillColor: theme.primary, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: theme.surface },
      columnStyles: {
        0: { cellWidth: 35, halign: "left" },
        ...monthColumns,
        ...(showOverall ? { [1 + chunk.length]: { cellWidth: 22 }, [2 + chunk.length]: { cellWidth: 30, halign: "left" as const } } : {}),
      },
      didParseCell: ({ section, row, column, cell }) => {
        const isMonthColumn = column.index >= 1 && column.index <= chunk.length;
        if (isMonthColumn && section === "head") {
          cell.styles.fillColor = theme.surface;
          cell.styles.textColor = theme.ink;
          cell.styles.valign = "top";
          cell.styles.minCellHeight = 12;
        }
        if (isMonthColumn && section === "body" && rows[row.index]) {
          cell.text = [];
          cell.styles.minCellHeight = 11;
        }
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
      didDrawCell: ({ section, row, column, cell }) => {
        if (column.index < 1 || column.index > chunk.length) return;
        if (section === "head") {
          drawSummaryStatuses(doc, summaryStatuses.map(({ label }) => label), cell.x, cell.y + cell.height - 2, cell.width);
        } else if (section === "body" && rows[row.index]) {
          const [counts, average] = rows[row.index][column.index].split("|");
          drawSummaryStatuses(doc, counts.split("/"), cell.x, cell.y + 4, cell.width);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(...theme.muted);
          doc.text(`Avg ${average}`, cell.x + cell.width / 2, cell.y + 8, { align: "center" });
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
  const followUp = buildStaffAttendanceFollowUp({ records });
  drawReportHeader(doc, metadata, "Attendance follow-up", logo);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...theme.muted);
  doc.text("Review repeated staff absences and dates with the largest staffing gaps. Holiday records are excluded.", 12, 35);

  if (!followUp.staff.length) {
    doc.setFontSize(10);
    doc.setTextColor(...theme.ink);
    doc.text("No absences or unavailable days were recorded in the selected period.", 12, 52);
    return;
  }

  const topStaff = followUp.staff.slice(0, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...theme.ink);
  doc.text(`Staff needing follow-up (${topStaff.length} of ${followUp.staff.length})`, 12, 46);
  autoTable(doc, {
    startY: 50,
    head: [["Staff member", "Absent days", "Not available days", "Most recent gap"]],
    body: topStaff.map((person) => [person.name, String(person.absent), String(person.unavailable), displayDate(person.lastExceptionDate)]),
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 1.5, lineWidth: 0.2, lineColor: [190, 180, 165] },
    headStyles: { fillColor: theme.primary, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: theme.surface },
    columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 45 }, 2: { cellWidth: 55 }, 3: { cellWidth: 63 } },
    margin: { top: 40, left: 12, right: 12, bottom: 15 },
    willDrawPage: () => drawReportHeader(doc, metadata, "Attendance follow-up", logo),
  });

  const staffTableEnd = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 110;
  const topDates = followUp.dates.slice(0, 8);
  const datesTitleY = staffTableEnd + 11;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...theme.ink);
  doc.text(`Dates with coverage gaps (${topDates.length} of ${followUp.dates.length})`, 12, datesTitleY);
  autoTable(doc, {
    startY: datesTitleY + 4,
    head: [["Date", "Absent", "Not available", "Present", "Affected staff"]],
    body: topDates.map((date) => [
      displayDate(date.date),
      String(date.absent),
      String(date.unavailable),
      String(date.present),
      `${date.affectedStaff.slice(0, 5).join(", ")}${date.affectedStaff.length > 5 ? ` +${date.affectedStaff.length - 5} more` : ""}`,
    ]),
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 1.5, lineWidth: 0.2, lineColor: [190, 180, 165] },
    headStyles: { fillColor: theme.primary, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: theme.surface },
    columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 27 }, 2: { cellWidth: 35 }, 3: { cellWidth: 27 }, 4: { cellWidth: 154 } },
    margin: { top: 40, left: 12, right: 12, bottom: 15 },
    willDrawPage: () => drawReportHeader(doc, metadata, "Attendance follow-up", logo),
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
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...theme.muted);
    doc.text(`Page ${page} of ${doc.getNumberOfPages()}`, doc.internal.pageSize.getWidth() - 12, doc.internal.pageSize.getHeight() - 7, { align: "right" });
  }
  doc.save(getStaffAttendancePdfFilename(input));
};

# Staff Attendance PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore an attendance-only staff PDF export in the redesigned attendance workspace, including the historical report’s attendance detail and infographic pages.

**Architecture:** Extract report-data preparation and PDF rendering from the attendance page into a focused client utility. The redesigned page supplies its already-scoped attendance records, selected date range, staff metadata, and role/status filters; the exporter renders a detail matrix followed by an attendance-only infographic page.

**Tech Stack:** React, TypeScript, jsPDF, jspdf-autotable, Vitest.

## Global Constraints

- Preserve the redesigned workspace and current `/attendance/records` API contract.
- Include only attendance detail and attendance infographics; omit remuneration from every PDF section.
- Use the page’s active date range, role filter, status filter, and search result set.
- Make all status counts and rates derive from the exact records used in the report.

---

### Task 1: Create tested report-data preparation

**Files:**
- Create: `client/src/lib/staff-attendance-pdf.ts`
- Test: `client/src/tests/lib/staff-attendance-pdf.test.ts`

**Interfaces:**
- Consumes: `AttendanceRecord`, visible staff rows, selected dates, and export metadata.
- Produces: `buildStaffAttendancePdfModel(input): StaffAttendancePdfModel` with matrix rows, status totals, and role rates.

- [ ] **Step 1: Write failing tests** for status aggregation, role grouping, filters, and zero-denominator percentage behavior.
- [ ] **Step 2: Run the focused Vitest test** and confirm it fails because the report-data module is absent.
- [ ] **Step 3: Implement the smallest pure model builder** that groups visible staff by role, creates a date/status matrix, and calculates attendance metrics without remuneration fields.
- [ ] **Step 4: Re-run focused tests** and confirm they pass.

### Task 2: Render the historical-style attendance report

**Files:**
- Modify: `client/src/lib/staff-attendance-pdf.ts`
- Test: `client/src/tests/lib/staff-attendance-pdf.test.ts`

**Interfaces:**
- Consumes: `StaffAttendancePdfModel` and report metadata.
- Produces: `exportStaffAttendancePdf(input): Promise<void>`.

- [ ] **Step 1: Write failing tests** for the export input validation and filename builder.
- [ ] **Step 2: Run focused tests** and confirm the new export behavior fails.
- [ ] **Step 3: Implement a landscape detail page** with project, center, semester, period, legend, and role-grouped status matrix.
- [ ] **Step 4: Implement an infographic page** with status distribution, overall attendance rate, and role-wise attendance rates; omit remuneration.
- [ ] **Step 5: Re-run focused tests** and confirm they pass.

### Task 3: Connect the redesigned workspace

**Files:**
- Modify: `client/src/pages/attendance/ViewAttendance.tsx`
- Test: `client/src/tests/pages/staff-attendance-workspace.test.ts`

**Interfaces:**
- Consumes: current attendance query data, applied filters, selected dates, and center/project/semester queries.
- Produces: PDF export from the existing Export to PDF UI action.

- [ ] **Step 1: Write a failing workspace test** that confirms the PDF export action remains available in the redesigned page.
- [ ] **Step 2: Run the focused test** and confirm it fails for the intended missing integration.
- [ ] **Step 3: Replace the removed/inline export implementation** with the shared exporter, preserving loading and toast behavior.
- [ ] **Step 4: Re-run focused page and library tests** and confirm they pass.

### Task 4: Validate the client build

**Files:**
- Modify only files from Tasks 1–3 as required by TypeScript or tests.

- [ ] **Step 1: Run the focused test suite.**
- [ ] **Step 2: Run the client typecheck/build.**
- [ ] **Step 3: Inspect the diff** to ensure no remuneration logic or unrelated redesign code was restored.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SubRole } from "../../generated/prisma/index.js";
import { summarizeSemesterTransition } from "../../service/semester-transition.service.js";

const serverFile = (path: string) =>
  new URL(`../../${path}`, import.meta.url);

test("draft setup summaries expose metadata and resolved counts without plan bodies", () => {
  const summary = summarizeSemesterTransition({
    updatedAt: new Date("2026-07-24T09:00:00.000Z"),
    studentPlan: [
      {
        sourceEnrollmentId: "enrollment-1",
        studentId: "student-1",
        decision: "PROMOTE",
        targetSemesterLevelId: "level-2",
      },
      {
        sourceEnrollmentId: "enrollment-2",
        studentId: "student-2",
        decision: "NOT_CONTINUING",
      },
    ],
    staffPlan: [
      {
        userId: "educator-1",
        decision: "ASSIGN",
        assignments: [
          {
            subRole: SubRole.EDUCATOR,
            projectId: "project-1",
            centerId: "center-1",
            semesterId: "semester-2",
            semesterLevelId: "level-2",
          },
        ],
        dailyRate: 750,
      },
      {
        userId: "manager-1",
        decision: "ASSIGN",
        assignments: [
          {
            subRole: SubRole.CENTER_MANAGER,
            projectId: "project-1",
            centerId: "center-1",
            semesterId: "semester-2",
          },
        ],
        dailyRate: null,
      },
      {
        userId: "volunteer-1",
        decision: "NOT_CONTINUING",
        assignments: [],
      },
    ],
    semester: {
      id: "semester-2",
      name: "Semester 2",
      status: "DRAFT",
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
    },
    sourceSemester: {
      id: "semester-1",
      name: "Semester 1",
    },
  });

  assert.deepEqual(summary, {
    semester: {
      id: "semester-2",
      name: "Semester 2",
      status: "DRAFT",
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
    },
    sourceSemester: {
      id: "semester-1",
      name: "Semester 1",
    },
    updatedAt: new Date("2026-07-24T09:00:00.000Z"),
    progress: {
      students: { resolved: 2, total: 2 },
      staff: { resolved: 3, total: 3 },
      rates: { resolved: 1, total: 2 },
    },
  });
  assert.equal("studentPlan" in summary, false);
  assert.equal("staffPlan" in summary, false);
});

test("draft setup summaries conservatively count malformed persisted plan rows", () => {
  const semester = {
    id: "semester-2",
    name: "Semester 2",
    status: "DRAFT" as const,
    startDate: new Date("2026-08-01T00:00:00.000Z"),
    endDate: new Date("2026-12-31T00:00:00.000Z"),
  };
  const summary = summarizeSemesterTransition({
    updatedAt: new Date("2026-07-24T09:00:00.000Z"),
    semester,
    sourceSemester: null,
    studentPlan: [
      null,
      12,
      { studentId: "student-without-enrollment", decision: "RETAIN" },
      {
        sourceEnrollmentId: "enrollment-1",
        studentId: "student-1",
        decision: "PROMOTE",
      },
      {
        sourceEnrollmentId: "enrollment-2",
        studentId: "student-2",
        decision: "RETAIN",
        targetSemesterLevelId: "level-2",
      },
      {
        sourceEnrollmentId: "enrollment-3",
        studentId: "student-3",
        decision: "UNKNOWN",
      },
    ],
    staffPlan: [
      null,
      "not-a-row",
      { userId: "missing-decision" },
      { userId: "broken-assignments", decision: "ASSIGN", assignments: null },
      {
        userId: "incomplete-assignment",
        decision: "ASSIGN",
        assignments: [{ subRole: SubRole.CENTER_MANAGER }],
        dailyRate: 500,
      },
      {
        userId: "manager-1",
        decision: "ASSIGN",
        assignments: [
          {
            subRole: SubRole.CENTER_MANAGER,
            projectId: "project-1",
            centerId: "center-1",
            semesterId: "semester-2",
          },
        ],
        dailyRate: "750",
      },
      {
        userId: "educator-1",
        decision: "ASSIGN",
        assignments: [
          {
            subRole: SubRole.EDUCATOR,
            projectId: "project-1",
            centerId: "center-1",
            semesterId: "semester-2",
            semesterLevelId: "level-2",
          },
        ],
        dailyRate: -2,
      },
      {
        userId: "departing-1",
        decision: "NOT_CONTINUING",
        assignments: [],
      },
    ],
  });

  assert.deepEqual(summary.progress, {
    students: { resolved: 1, total: 3 },
    staff: { resolved: 3, total: 6 },
    rates: { resolved: 0, total: 2 },
  });
});

test("draft setup summaries treat null and non-array plans as empty", () => {
  const base = {
    updatedAt: new Date("2026-07-24T09:00:00.000Z"),
    semester: {
      id: "semester-2",
      name: "Semester 2",
      status: "DRAFT" as const,
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
    },
    sourceSemester: null,
  };

  assert.deepEqual(
    summarizeSemesterTransition({
      ...base,
      studentPlan: null,
      staffPlan: { userId: "not-an-array" },
    }).progress,
    {
      students: { resolved: 0, total: 0 },
      staff: { resolved: 0, total: 0 },
      rates: { resolved: 0, total: 0 },
    },
  );
});

test("draft setup summaries resolve passed-out students but keep reviews open", () => {
  const summary = summarizeSemesterTransition({
    updatedAt: new Date("2026-07-24T09:00:00.000Z"),
    semester: {
      id: "semester-2",
      name: "Semester 2",
      status: "DRAFT",
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
    },
    sourceSemester: { id: "semester-1", name: "Semester 1" },
    studentPlan: [
      {
        sourceEnrollmentId: "enrollment-1",
        studentId: "student-1",
        decision: "PASSED_OUT",
      },
      {
        sourceEnrollmentId: "enrollment-2",
        studentId: "student-2",
        decision: "REVIEW",
      },
    ],
    staffPlan: [],
  });

  assert.deepEqual(summary.progress.students, { resolved: 1, total: 2 });
});

test("center setup summaries use a narrow, draft-only persisted-scope query", async () => {
  const service = await readFile(
    serverFile("service/semester-transition.service.ts"),
    "utf8",
  );

  assert.match(service, /export const getCenterSemesterTransitionSummaries/);
  assert.match(service, /centers\.findUnique/);
  assert.match(service, /centerId:\s*center\.id/);
  assert.match(service, /SemesterStatus\.DRAFT/);
  assert.match(service, /SemesterTransitionStatus\.DRAFT/);
  assert.match(service, /studentPlan:\s*true/);
  assert.match(service, /staffPlan:\s*true/);
  assert.doesNotMatch(service, /getCenterSemesterTransitionSummaries[\s\S]*studentEnrollments\.findMany/);
  assert.doesNotMatch(service, /getCenterSemesterTransitionSummaries[\s\S]*user\.findMany/);
});

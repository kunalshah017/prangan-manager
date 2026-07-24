import assert from "node:assert/strict";
import test from "node:test";

import {
  parseStaffTransitionPlan,
  parseStudentTransitionPlan,
} from "../../security/semester-transition-input.js";

test("student transition parser accepts explicit progression decisions", () => {
  assert.deepEqual(
    parseStudentTransitionPlan([
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
    ]),
    {
      data: [
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
    },
  );
});

test("student transition parser accepts resumable review and passed-out decisions", () => {
  assert.deepEqual(
    parseStudentTransitionPlan([
      {
        sourceEnrollmentId: "enrollment-1",
        studentId: "student-1",
        decision: "REVIEW",
      },
      {
        sourceEnrollmentId: "enrollment-2",
        studentId: "student-2",
        decision: "PASSED_OUT",
      },
    ]),
    {
      data: [
        {
          sourceEnrollmentId: "enrollment-1",
          studentId: "student-1",
          decision: "REVIEW",
        },
        {
          sourceEnrollmentId: "enrollment-2",
          studentId: "student-2",
          decision: "PASSED_OUT",
        },
      ],
    },
  );
});

test("student transition parser rejects duplicate students and missing target levels", () => {
  const duplicate = parseStudentTransitionPlan([
    {
      sourceEnrollmentId: "enrollment-1",
      studentId: "student-1",
      decision: "RETAIN",
      targetSemesterLevelId: "level-1",
    },
    {
      sourceEnrollmentId: "enrollment-2",
      studentId: "student-1",
      decision: "NOT_CONTINUING",
    },
  ]);
  assert.ok("error" in duplicate);

  const missingLevel = parseStudentTransitionPlan([
    {
      sourceEnrollmentId: "enrollment-1",
      studentId: "student-1",
      decision: "PROMOTE",
    },
  ]);
  assert.ok("error" in missingLevel);
});

test("staff transition parser validates assignments and non-negative daily rates", () => {
  assert.deepEqual(
    parseStaffTransitionPlan([
      {
        userId: "user-1",
        decision: "ASSIGN",
        dailyRate: 625.5,
        assignments: [
          {
            subRole: "EDUCATOR",
            projectId: "project-1",
            centerId: "center-1",
            semesterId: "semester-2",
            semesterLevelId: "level-2",
            committedDays: "BOTH",
          },
        ],
      },
    ]),
    {
      data: [
        {
          userId: "user-1",
          decision: "ASSIGN",
          dailyRate: 625.5,
          assignments: [
            {
              subRole: "EDUCATOR",
              projectId: "project-1",
              centerId: "center-1",
              semesterId: "semester-2",
              semesterLevelId: "level-2",
              committedDays: "BOTH",
            },
          ],
        },
      ],
    },
  );

  for (const dailyRate of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const parsed = parseStaffTransitionPlan([
      {
        userId: "user-1",
        decision: "ASSIGN",
        dailyRate,
        assignments: [
          {
            subRole: "CENTER_MANAGER",
            projectId: "project-1",
            centerId: "center-1",
            semesterId: "semester-2",
          },
        ],
      },
    ]);
    assert.ok("error" in parsed);
  }
});

test("staff transition parser requires rates only for payable roles", () => {
  const missingRate = parseStaffTransitionPlan([
    {
      userId: "user-1",
      decision: "ASSIGN",
      assignments: [
        {
          subRole: "CENTER_MANAGER",
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-2",
        },
      ],
    },
  ]);
  assert.ok("error" in missingRate);

  const nonPayable = parseStaffTransitionPlan([
    {
      userId: "user-2",
      decision: "ASSIGN",
      assignments: [
        {
          subRole: "TECH",
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-2",
        },
      ],
    },
  ]);
  assert.ok("data" in nonPayable);
});

test("staff transition parser requires canonical educator levels and unique roles", () => {
  const base = {
    userId: "user-1",
    decision: "ASSIGN",
    dailyRate: 500,
  };
  const scope = {
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-2",
  };

  const missingEducatorLevel = parseStaffTransitionPlan([
    {
      ...base,
      assignments: [{ ...scope, subRole: "EDUCATOR" }],
    },
  ]);
  assert.ok("error" in missingEducatorLevel);

  const duplicateRole = parseStaffTransitionPlan([
    {
      ...base,
      assignments: [
        { ...scope, subRole: "CENTER_MANAGER" },
        { ...scope, subRole: "CENTER_MANAGER" },
      ],
    },
  ]);
  assert.ok("error" in duplicateRole);

  const invalidCommittedDays = parseStaffTransitionPlan([
    {
      userId: "user-2",
      decision: "ASSIGN",
      assignments: [
        { ...scope, subRole: "TECH", committedDays: "SATURDAY" },
      ],
    },
  ]);
  assert.ok("error" in invalidCommittedDays);
});

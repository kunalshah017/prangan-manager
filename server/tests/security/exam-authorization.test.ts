import assert from "node:assert/strict";
import test from "node:test";

import { Role, SubRole } from "../../generated/prisma/index.js";
import {
  canManageExam,
  canReadExam,
  canWriteScore,
  hasCompleteExamScope,
} from "../../security/exam-authorization.js";
import type { ExamScope } from "../../security/exam-authorization.js";

const userIdentity = {
  role: Role.USER,
} as const;

const scope: ExamScope = {
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: "semester-1-level-1",
};

const assignment = (subRole: SubRole, semesterLevelId: string | null = null) =>
  [
    {
      subRole,
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      semesterLevelId,
      isActive: true,
    },
  ] as const;

test("admin bypasses assignments for exam policies", () => {
  const input = {
    identity: { role: Role.ADMIN },
    assignments: [],
    scope,
  } as const;

  assert.equal(canReadExam(input), true);
  assert.equal(canManageExam(input), true);
  assert.equal(canWriteScore(input), true);
});

test("admin bypasses incomplete exam scope in pure policies", () => {
  const input = {
    identity: { role: Role.ADMIN },
    assignments: [],
    scope: { projectId: "project-1" },
  } as const;

  assert.equal(canReadExam(input), true);
  assert.equal(canManageExam(input), true);
  assert.equal(canWriteScore(input), true);
});

test("an exact active curriculum mentor can manage an exam", () => {
  assert.equal(
    canManageExam({
      identity: userIdentity,
      assignments: assignment(SubRole.CURRICULUM_MENTOR),
      scope,
    }),
    true,
  );
});

test("an educator cannot manage an exam", () => {
  assert.equal(
    canManageExam({
      identity: userIdentity,
      assignments: assignment(SubRole.EDUCATOR, "semester-1-level-1"),
      scope,
    }),
    false,
  );
});

test("a center manager can write scores at any semester level", () => {
  assert.equal(
    canWriteScore({
      identity: userIdentity,
      assignments: assignment(SubRole.CENTER_MANAGER),
      scope: { ...scope, semesterLevelId: "semester-1-primary-a" },
    }),
    true,
  );
});

test("an educator can write scores only at the assigned semester level", () => {
  const input = {
    identity: userIdentity,
    assignments: assignment(SubRole.EDUCATOR, "semester-1-level-1"),
  } as const;

  assert.equal(canWriteScore({ ...input, scope }), true);
  assert.equal(
    canWriteScore({
      ...input,
      scope: { ...scope, semesterLevelId: "semester-1-level-2" },
    }),
    false,
  );
});

test("an educator can read exams only at the assigned semester level", () => {
  const input = {
    identity: userIdentity,
    assignments: assignment(SubRole.EDUCATOR, "semester-1-level-1"),
  } as const;

  assert.equal(canReadExam({ ...input, scope }), true);
  assert.equal(
    canReadExam({
      ...input,
      scope: { ...scope, semesterLevelId: "semester-1-level-2" },
    }),
    false,
  );
});

test("inactive and wrong-center exam assignments are denied", () => {
  assert.equal(
    canReadExam({
      identity: userIdentity,
      assignments: [
        {
          ...assignment(SubRole.CURRICULUM_MENTOR)[0],
          isActive: false,
        },
      ],
      scope,
    }),
    false,
  );
  assert.equal(
    canReadExam({
      identity: userIdentity,
      assignments: assignment(SubRole.CURRICULUM_MENTOR),
      scope: { ...scope, centerId: "center-2" },
    }),
    false,
  );
});

test("an incomplete exam scope is rejected", () => {
  const incompleteScope: ExamScope = {
    projectId: "project-1",
    centerId: "center-1",
  };

  assert.equal(hasCompleteExamScope(incompleteScope), false);
  assert.equal(
    canReadExam({
      identity: userIdentity,
      assignments: assignment(SubRole.CURRICULUM_MENTOR),
      scope: incompleteScope,
    }),
    false,
  );
});

test("an educator cannot write scores without a semester level", () => {
  assert.equal(
    canWriteScore({
      identity: userIdentity,
      assignments: assignment(SubRole.EDUCATOR, "semester-1-level-1"),
      scope: {
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
      },
    }),
    false,
  );
});

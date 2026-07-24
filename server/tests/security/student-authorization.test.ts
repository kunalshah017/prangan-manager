import assert from "node:assert/strict";
import test from "node:test";

import { Role, SubRole } from "../../generated/prisma/index.js";
import {
  canManageStudentProfile,
  canReadContext,
  canReadStudentEnrollment,
  hasCompleteStudentScope,
} from "../../security/student-authorization.js";
import type { StudentScope } from "../../security/student-authorization.js";

const userIdentity = { role: Role.USER } as const;

const scope: StudentScope = {
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

test("admin bypasses incomplete student scope for every policy", () => {
  const input = {
    identity: { role: Role.ADMIN },
    assignments: [],
    scope: { projectId: "project-1" },
  } as const;

  assert.equal(canReadContext(input), true);
  assert.equal(canReadStudentEnrollment(input), true);
  assert.equal(canManageStudentProfile(input), true);
});

test("an exact active center manager can read enrollments and manage profiles", () => {
  const input = {
    identity: userIdentity,
    assignments: assignment(SubRole.CENTER_MANAGER),
    scope,
  } as const;

  assert.equal(canReadStudentEnrollment(input), true);
  assert.equal(canManageStudentProfile(input), true);
});

test("an educator can read only enrollments for the assigned semester level", () => {
  const input = {
    identity: userIdentity,
    assignments: assignment(SubRole.EDUCATOR, "semester-1-level-1"),
  } as const;

  assert.equal(canReadStudentEnrollment({ ...input, scope }), true);
  assert.equal(
    canReadStudentEnrollment({
      ...input,
      scope: { ...scope, semesterLevelId: "semester-1-level-2" },
    }),
    false,
  );
});

test("an educator cannot manage a student profile", () => {
  assert.equal(
    canManageStudentProfile({
      identity: userIdentity,
      assignments: assignment(SubRole.EDUCATOR, "semester-1-level-1"),
      scope,
    }),
    false,
  );
});

test("a tech assignment can read context without matching the semester level", () => {
  assert.equal(
    canReadContext({
      identity: userIdentity,
      assignments: assignment(SubRole.TECH),
      scope: { ...scope, semesterLevelId: "semester-1-level-2" },
    }),
    true,
  );
});

test("wrong-center and inactive student assignments are denied", () => {
  assert.equal(
    canReadContext({
      identity: userIdentity,
      assignments: assignment(SubRole.TECH),
      scope: { ...scope, centerId: "center-2" },
    }),
    false,
  );
  assert.equal(
    canReadStudentEnrollment({
      identity: userIdentity,
      assignments: [
        { ...assignment(SubRole.CENTER_MANAGER)[0], isActive: false },
      ],
      scope,
    }),
    false,
  );
});

test("incomplete student scopes are denied to non-admin identities", () => {
  const incompleteScope: StudentScope = {
    projectId: "project-1",
    centerId: "center-1",
  };

  assert.equal(hasCompleteStudentScope(incompleteScope), false);
  assert.equal(
    canReadContext({
      identity: userIdentity,
      assignments: assignment(SubRole.TECH),
      scope: incompleteScope,
    }),
    false,
  );
});

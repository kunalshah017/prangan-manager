import assert from "node:assert/strict";
import test from "node:test";

import { Role, SubRole } from "../../generated/prisma/index.js";
import {
  canManageSyllabus,
  canReadSyllabus,
  canUpdateTopicStatus,
  hasCompleteSyllabusScope,
} from "../../security/syllabus-authorization.js";
import type { SyllabusScope } from "../../security/syllabus-authorization.js";

const userIdentity = {
  role: Role.USER,
} as const;

const scope: SyllabusScope = {
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

test("admin bypasses assignments for syllabus policies", () => {
  const input = {
    identity: { role: Role.ADMIN },
    assignments: [],
    scope,
  } as const;

  assert.equal(canReadSyllabus(input), true);
  assert.equal(canManageSyllabus(input), true);
  assert.equal(canUpdateTopicStatus(input), true);
});

test("admin bypasses incomplete syllabus scope in pure policies", () => {
  const input = {
    identity: { role: Role.ADMIN },
    assignments: [],
    scope: { projectId: "project-1" },
  } as const;

  assert.equal(canReadSyllabus(input), true);
  assert.equal(canManageSyllabus(input), true);
  assert.equal(canUpdateTopicStatus(input), true);
});

test("exact active managers and curriculum mentors can manage syllabus", () => {
  for (const subRole of [SubRole.CENTER_MANAGER, SubRole.CURRICULUM_MENTOR]) {
    assert.equal(
      canManageSyllabus({
        identity: userIdentity,
        assignments: assignment(subRole),
        scope,
      }),
      true,
    );
  }
});

test("an exact active non-educator sub-role can read syllabus", () => {
  assert.equal(
    canReadSyllabus({
      identity: userIdentity,
      assignments: assignment(SubRole.TECH),
      scope,
    }),
    true,
  );
});

test("an educator cannot manage syllabus", () => {
  assert.equal(
    canManageSyllabus({
      identity: userIdentity,
      assignments: assignment(SubRole.EDUCATOR, "semester-1-level-1"),
      scope,
    }),
    false,
  );
});

test("an educator can read syllabus and update topic status only at the assigned semester level", () => {
  const input = {
    identity: userIdentity,
    assignments: assignment(SubRole.EDUCATOR, "semester-1-level-1"),
  } as const;

  assert.equal(canReadSyllabus({ ...input, scope }), true);
  assert.equal(canUpdateTopicStatus({ ...input, scope }), true);

  for (const policy of [canReadSyllabus, canUpdateTopicStatus]) {
    assert.equal(
      policy({
        ...input,
        scope: { ...scope, semesterLevelId: "semester-1-level-2" },
      }),
      false,
    );
    assert.equal(
      policy({
        ...input,
        scope: {
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-1",
        },
      }),
      false,
    );
  }
});

test("a manager can update topic status at any semester level", () => {
  assert.equal(
    canUpdateTopicStatus({
      identity: userIdentity,
      assignments: assignment(SubRole.CENTER_MANAGER),
      scope: { ...scope, semesterLevelId: "semester-1-primary-a" },
    }),
    true,
  );
});

test("inactive and wrong-center syllabus assignments are denied", () => {
  assert.equal(
    canReadSyllabus({
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
    canReadSyllabus({
      identity: userIdentity,
      assignments: assignment(SubRole.CENTER_MANAGER),
      scope: { ...scope, centerId: "center-2" },
    }),
    false,
  );
});

test("incomplete nonadmin syllabus scope is rejected", () => {
  const incompleteScope: SyllabusScope = {
    projectId: "project-1",
    centerId: "center-1",
  };

  assert.equal(hasCompleteSyllabusScope(incompleteScope), false);
  assert.equal(
    canReadSyllabus({
      identity: userIdentity,
      assignments: assignment(SubRole.CURRICULUM_MENTOR),
      scope: incompleteScope,
    }),
    false,
  );
});

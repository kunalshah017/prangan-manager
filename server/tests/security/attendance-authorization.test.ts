import assert from "node:assert/strict";
import test from "node:test";

import { Role, SubRole } from "../../generated/prisma/index.js";
import {
  canManageStudentAttendance,
  canManageUserAttendance,
  hasCompleteAttendanceScope,
} from "../../security/attendance-authorization.js";
import type { AttendanceScope } from "../../security/attendance-authorization.js";

const managerIdentity = {
  id: "manager-1",
  name: "Center Manager",
  email: "manager@example.com",
  role: Role.USER,
} as const;

const scope: AttendanceScope = {
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
};

const centerManagerAssignments = [
  {
    subRole: SubRole.CENTER_MANAGER,
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    level: null,
    isActive: true,
  },
] as const;

const educatorAssignments = [
  {
    subRole: SubRole.EDUCATOR,
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    level: null,
    isActive: true,
  },
] as const;

test("admin bypasses assignments for user attendance", () => {
  assert.equal(
    canManageUserAttendance({
      identity: { ...managerIdentity, role: Role.ADMIN },
      assignments: [],
      scope,
    }),
    true,
  );
});

test("admin bypasses assignments for student attendance", () => {
  assert.equal(
    canManageStudentAttendance({
      identity: { ...managerIdentity, role: Role.ADMIN },
      assignments: [],
      scope,
    }),
    true,
  );
});

test("admin bypasses incomplete scope for both attendance policies", () => {
  const incompleteScope: AttendanceScope = {
    projectId: "project-1",
    semesterId: "semester-1",
  };

  assert.equal(
    canManageUserAttendance({
      identity: { ...managerIdentity, role: Role.ADMIN },
      assignments: [],
      scope: incompleteScope,
    }),
    true,
  );
  assert.equal(
    canManageStudentAttendance({
      identity: { ...managerIdentity, role: Role.ADMIN },
      assignments: [],
      scope: incompleteScope,
    }),
    true,
  );
});

test("an exact active center manager can manage user attendance", () => {
  assert.equal(
    canManageUserAttendance({
      identity: managerIdentity,
      assignments: centerManagerAssignments,
      scope,
    }),
    true,
  );
});

test("an exact active educator can manage student attendance", () => {
  assert.equal(
    canManageStudentAttendance({
      identity: managerIdentity,
      assignments: educatorAssignments,
      scope,
    }),
    true,
  );
});

test("an educator cannot manage user attendance", () => {
  assert.equal(
    canManageUserAttendance({
      identity: managerIdentity,
      assignments: educatorAssignments,
      scope,
    }),
    false,
  );
});

test("a wrong center is denied", () => {
  assert.equal(
    canManageStudentAttendance({
      identity: managerIdentity,
      assignments: centerManagerAssignments,
      scope: { ...scope, centerId: "center-2" },
    }),
    false,
  );
});

test("an inactive assignment is denied", () => {
  assert.equal(
    canManageStudentAttendance({
      identity: managerIdentity,
      assignments: [
        { ...centerManagerAssignments[0], isActive: false },
      ] as const,
      scope,
    }),
    false,
  );
});

test("a missing attendance scope field is incomplete", () => {
  const incompleteScope: AttendanceScope = {
    projectId: "project-1",
    centerId: undefined,
    semesterId: "semester-1",
  };

  assert.equal(hasCompleteAttendanceScope(incompleteScope), false);
});

test("whitespace-only and padded attendance scope IDs are incomplete", () => {
  assert.equal(
    hasCompleteAttendanceScope({ ...scope, projectId: "   " }),
    false,
  );
  assert.equal(
    hasCompleteAttendanceScope({ ...scope, centerId: " center-1" }),
    false,
  );
  assert.equal(
    hasCompleteAttendanceScope({ ...scope, semesterId: "semester-1 " }),
    false,
  );
});

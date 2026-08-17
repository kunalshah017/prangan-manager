import assert from "node:assert/strict";
import test from "node:test";

import { Role, SubRole } from "../../generated/prisma/index.js";
import { canAccessScope, isAdmin } from "../../security/authorization.js";

const identity = {
  id: "manager-1",
  name: "Center Manager",
  email: "manager@example.com",
  role: Role.USER,
};

const centerManagerAssignment = {
  subRole: SubRole.CENTER_MANAGER,
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: null,
  isActive: true,
};

const scope = {
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
};

test("isAdmin recognizes only admin identities", () => {
  assert.equal(isAdmin({ ...identity, role: Role.ADMIN }), true);
  assert.equal(isAdmin(identity), false);
});

test("admin bypasses assignment and scope checks", () => {
  assert.equal(
    canAccessScope({
      identity: { ...identity, role: Role.ADMIN },
      assignments: [],
      allowedSubRoles: [SubRole.CENTER_MANAGER],
      scope,
    }),
    true,
  );
});

test("center manager with an exact active scope is allowed", () => {
  assert.equal(
    canAccessScope({
      identity,
      assignments: [centerManagerAssignment],
      allowedSubRoles: [SubRole.CENTER_MANAGER],
      scope,
    }),
    true,
  );
});

test("wrong center is denied", () => {
  assert.equal(
    canAccessScope({
      identity,
      assignments: [centerManagerAssignment],
      allowedSubRoles: [SubRole.CENTER_MANAGER],
      scope: { ...scope, centerId: "center-2" },
    }),
    false,
  );
});

test("wrong semester is denied", () => {
  assert.equal(
    canAccessScope({
      identity,
      assignments: [centerManagerAssignment],
      allowedSubRoles: [SubRole.CENTER_MANAGER],
      scope: { ...scope, semesterId: "semester-2" },
    }),
    false,
  );
});

test("inactive assignment is denied", () => {
  assert.equal(
    canAccessScope({
      identity,
      assignments: [{ ...centerManagerAssignment, isActive: false }],
      allowedSubRoles: [SubRole.CENTER_MANAGER],
      scope,
    }),
    false,
  );
});

test("educator access requires an active canonical semester-level relation", () => {
  const educatorAssignment = {
    ...centerManagerAssignment,
    subRole: SubRole.EDUCATOR,
    semesterLevelId: "semester-1-level-1",
    semesterLevel: { isActive: true },
  };
  const educatorScope = {
    ...scope,
    semesterLevelId: "semester-1-level-1",
  };

  assert.equal(
    canAccessScope({
      identity,
      assignments: [educatorAssignment],
      allowedSubRoles: [SubRole.EDUCATOR],
      scope: educatorScope,
    }),
    true,
  );
  for (const semesterLevel of [{ isActive: false }, null, undefined]) {
    assert.equal(
      canAccessScope({
        identity,
        assignments: [{ ...educatorAssignment, semesterLevel }],
        allowedSubRoles: [SubRole.EDUCATOR],
        scope: educatorScope,
      }),
      false,
    );
  }
});

test("wrong subrole is denied", () => {
  assert.equal(
    canAccessScope({
      identity,
      assignments: [{ ...centerManagerAssignment, subRole: SubRole.EDUCATOR }],
      allowedSubRoles: [SubRole.CENTER_MANAGER],
      scope,
    }),
    false,
  );
});

test("semester level mismatch is denied", () => {
  assert.equal(
    canAccessScope({
      identity,
      assignments: [
        {
          ...centerManagerAssignment,
          subRole: SubRole.EDUCATOR,
          semesterLevelId: "semester-level-1",
          semesterLevel: { isActive: true },
        },
      ],
      allowedSubRoles: [SubRole.EDUCATOR],
      scope: { ...scope, semesterLevelId: "semester-level-2" },
    }),
    false,
  );
});

test("same academic level in another semester does not authorize", () => {
  assert.equal(
    canAccessScope({
      identity,
      assignments: [
        {
          ...centerManagerAssignment,
          subRole: SubRole.EDUCATOR,
          semesterLevelId: "semester-1-level-1",
          semesterLevel: { isActive: true },
        },
      ],
      allowedSubRoles: [SubRole.EDUCATOR],
      scope: {
        ...scope,
        semesterId: "semester-2",
        semesterLevelId: "semester-2-level-1",
      },
    }),
    false,
  );
});

test("missing assignment scope values are not wildcards", () => {
  assert.equal(
    canAccessScope({
      identity,
      assignments: [{ ...centerManagerAssignment, centerId: null }],
      allowedSubRoles: [SubRole.CENTER_MANAGER],
      scope,
    }),
    false,
  );
});

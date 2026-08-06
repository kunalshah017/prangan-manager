import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  adminUserDetailSelect,
  adminUserSelect,
  contextStaffSelect,
  currentUserSelect,
  publicUserSelect,
  remunerationUserSelect,
} from "../../security/user-selects.js";

const financialFields = [
  "bankAccountNumber",
  "bankAccountName",
  "bankIfsc",
  "bankName",
  "bankBranch",
  "upiId",
] as const;

const alwaysForbiddenFields = ["password"] as const;

const assertExcludes = (selector: object, fields: readonly string[]): void => {
  for (const field of fields) {
    assert.equal(
      field in selector,
      false,
      `expected selector to exclude ${field}`,
    );
  }
};

test("publicUserSelect exposes only safe summary fields", () => {
  assertExcludes(publicUserSelect, [
    ...alwaysForbiddenFields,
    ...financialFields,
    "reimbursementAmount",
    "address",
    "dob",
    "phone",
    "qualification",
  ]);

  assert.equal(publicUserSelect.id, true);
  assert.equal(publicUserSelect.roleAssignments.where.isActive, true);
});

test("nested role assignments use an explicit client-safe select", () => {
  const roleAssignments = publicUserSelect.roleAssignments;
  assert.equal("include" in roleAssignments, false);
  assert.deepEqual(Object.keys(roleAssignments.select).sort(), [
    "center",
    "centerId",
    "committedDays",
    "id",
    "isActive",
    "level",
    "project",
    "projectId",
    "semester",
    "semesterId",
    "semesterLevel",
    "semesterLevelId",
    "subRole",
  ]);

  for (const relation of ["project", "center", "semester"] as const) {
    assert.deepEqual(roleAssignments.select[relation], {
      select: { id: true, name: true },
    });
  }
  assert.deepEqual(roleAssignments.select.semesterLevel, {
    include: { academicLevel: true },
  });
});

test("currentUserSelect preserves financial fields without selecting password", () => {
  assertExcludes(currentUserSelect, alwaysForbiddenFields);

  for (const field of financialFields) {
    assert.equal(
      currentUserSelect[field],
      true,
      `expected current selector to include ${field}`,
    );
  }
  assert.equal(currentUserSelect.reimbursementAmount, true);
  assert.equal(currentUserSelect.roleAssignments.orderBy.assignedAt, "desc");
});

test("adminUserSelect supports profile management without financial data", () => {
  assertExcludes(adminUserSelect, [
    ...alwaysForbiddenFields,
    ...financialFields,
    "reimbursementAmount",
  ]);

  for (const field of ["phone", "qualification", "address", "dob"] as const) {
    assert.equal(
      adminUserSelect[field],
      true,
      `expected admin selector to include ${field}`,
    );
  }
  assert.equal(adminUserSelect.roleAssignments.where.isActive, true);
});

test("adminUserDetailSelect adds semester rates without owner financial data", () => {
  assertExcludes(adminUserDetailSelect, [
    ...alwaysForbiddenFields,
    ...financialFields,
    "reimbursementAmount",
  ]);
  assert.deepEqual(adminUserDetailSelect.remunerationRates, {
    select: { semesterId: true, dailyRate: true },
    orderBy: { semesterId: "asc" },
  });

  for (const field of ["phone", "qualification", "address", "dob"] as const) {
    assert.equal(adminUserDetailSelect[field], true);
  }
});

test("remunerationUserSelect exposes only payment administration fields", () => {
  const selector = remunerationUserSelect("semester-1");
  assert.deepEqual(Object.keys(selector).sort(), [
    "bankAccountName",
    "bankAccountNumber",
    "bankBranch",
    "bankIfsc",
    "bankName",
    "firstName",
    "id",
    "lastName",
    "middleName",
    "name",
    "profileImageUrl",
    "remunerationPeriods",
    "remunerationRates",
    "upiId",
  ]);
  assert.deepEqual(selector.remunerationRates, {
    where: { semesterId: "semester-1" },
    select: { dailyRate: true },
    take: 1,
  });
  assert.deepEqual(selector.remunerationPeriods, {
    where: { semesterId: "semester-1" },
    select: {
      id: true,
      amountPerDay: true,
      effectiveFrom: true,
      effectiveTo: true,
    },
    orderBy: { effectiveFrom: "asc" },
  });
  assertExcludes(selector, [
    ...alwaysForbiddenFields,
    "address",
    "dob",
    "email",
    "phone",
    "qualification",
    "roleAssignments",
  ]);
});

test("contextStaffSelect exposes only dashboard staff fields", () => {
  const selector = contextStaffSelect({
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
  });

  assert.deepEqual(Object.keys(selector).sort(), [
    "dob",
    "firstName",
    "id",
    "lastName",
    "middleName",
    "name",
    "profileImageUrl",
    "roleAssignments",
    "status",
  ]);
  assertExcludes(selector, [
    ...alwaysForbiddenFields,
    ...financialFields,
    "address",
    "email",
    "phone",
    "qualification",
    "reimbursementAmount",
  ]);
  assert.deepEqual(selector.roleAssignments.where, {
    isActive: true,
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
  });
  assert.equal("include" in selector.roleAssignments, false);
  assert.deepEqual(Object.keys(selector.roleAssignments.select).sort(), [
    "center",
    "centerId",
    "committedDays",
    "id",
    "isActive",
    "level",
    "project",
    "projectId",
    "semester",
    "semesterId",
    "semesterLevel",
    "semesterLevelId",
    "subRole",
  ]);
});

test("user service applies the scoped selectors to detail and list queries", async () => {
  const source = await readFile(
    new URL("../../service/user.service.ts", import.meta.url),
    "utf8",
  );
  const getUserByIdSource = source.match(
    /export const getUserById[\s\S]*?export const updateUser/,
  )?.[0];
  const getAllUsersSource = source.match(
    /export const getAllUsersWithAssignments[\s\S]*?export const bulkUpdateUserAssignments/,
  )?.[0];

  assert.ok(getUserByIdSource, "expected to find getUserById source");
  assert.ok(
    getAllUsersSource,
    "expected to find getAllUsersWithAssignments source",
  );
  assert.match(getUserByIdSource, /select: currentUserSelect/);
  assert.match(getAllUsersSource, /select: adminUserSelect/);
  assert.doesNotMatch(getAllUsersSource, /\binclude:/);
});

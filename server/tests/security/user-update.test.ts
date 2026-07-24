import assert from "node:assert/strict";
import test from "node:test";

import { extractGeneralUserUpdate } from "../../security/user-update.js";

test("extracts only supported general profile fields", () => {
  const input = {
    name: "Asha",
    firstName: "Asha",
    middleName: null,
    lastName: "Shah",
    email: "asha@example.com",
    phone: "+91 90000 00000",
    qualification: "B.Ed",
    address: "Pune",
    dob: "1990-01-02",
  };

  assert.deepEqual(extractGeneralUserUpdate(input), {
    data: input,
    forbiddenFields: [],
    unknownFields: [],
  });
});

test("accepts null as an extracted DOB value for profile clearing", () => {
  assert.deepEqual(extractGeneralUserUpdate({ dob: null }), {
    data: { dob: null },
    forbiddenFields: [],
    unknownFields: [],
  });
});

test("accepts null for optional structured name fields", () => {
  assert.deepEqual(
    extractGeneralUserUpdate({ middleName: null, lastName: null }),
    {
      data: { middleName: null, lastName: null },
      forbiddenFields: [],
      unknownFields: [],
    },
  );
});

test("rejects role assignments from the general update endpoint", () => {
  assert.deepEqual(
    extractGeneralUserUpdate({
      name: "Asha",
      roleAssignments: [{ subRole: "CENTER_MANAGER" }],
    }),
    {
      data: { name: "Asha" },
      forbiddenFields: ["roleAssignments"],
      unknownFields: [],
    },
  );
});

test("rejects role, status, reimbursement, bank, and UPI fields deterministically", () => {
  const result = extractGeneralUserUpdate({
    upiId: "asha@upi",
    status: "APPROVED",
    role: "ADMIN",
    reimbursementAmount: 5000,
    bankName: "Example Bank",
    bankIfsc: "EXAM0000001",
    bankBranch: "Main",
    bankAccountNumber: "1234",
    bankAccountName: "Asha",
  });

  assert.deepEqual(result, {
    data: {},
    forbiddenFields: [
      "bankAccountName",
      "bankAccountNumber",
      "bankBranch",
      "bankIfsc",
      "bankName",
      "reimbursementAmount",
      "role",
      "status",
      "upiId",
    ],
    unknownFields: [],
  });
});

test("rejects unknown extra keys instead of mass assigning them", () => {
  assert.deepEqual(
    extractGeneralUserUpdate({ displayName: "Asha", password: "secret" }),
    {
      data: {},
      forbiddenFields: [],
      unknownFields: ["displayName", "password"],
    },
  );
});

test("rejects non-record input safely", () => {
  assert.deepEqual(extractGeneralUserUpdate(null), {
    data: {},
    forbiddenFields: [],
    unknownFields: ["body"],
  });
  assert.deepEqual(extractGeneralUserUpdate([]), {
    data: {},
    forbiddenFields: [],
    unknownFields: ["body"],
  });
});

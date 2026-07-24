import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (relativePath: string) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

const controllerBlock = (source: string, exportName: string) => {
  const start = source.indexOf(`export const ${exportName}`);
  assert.ok(start >= 0, `expected ${exportName} export`);
  const next = source.indexOf("\nexport const ", start + 1);
  return source.slice(start, next === -1 ? undefined : next);
};

const assertAuthorizationPrecedesService = (
  source: string,
  exportName: string,
  serviceCall: string,
) => {
  const block = controllerBlock(source, exportName);
  const authorizationIndex = block.indexOf("authorizeUserAttendanceScope(");
  const serviceIndex = block.indexOf(serviceCall);

  assert.ok(
    authorizationIndex >= 0,
    `${exportName} authorizes attendance scope`,
  );
  assert.ok(
    serviceIndex > authorizationIndex,
    `${exportName} calls service after authorization`,
  );
};

test("user-attendance controllers enforce the shared scope policy before writes and active-user reads", async () => {
  const source = await readSource("../../controllers/attendance.controller.ts");

  assert.match(source, /security\/attendance-authorization\.js/);
  assert.match(source, /hasCompleteAttendanceScope/);
  assert.match(source, /canManageUserAttendance/);
  assert.match(source, /getActiveUserScopeAssignments/);

  assertAuthorizationPrecedesService(
    source,
    "getActiveUsersController",
    "getActiveUsersForAttendance(requestData)",
  );
  assertAuthorizationPrecedesService(
    source,
    "markAttendanceController",
    "markAttendance(attendanceData, markedBy)",
  );
  assertAuthorizationPrecedesService(
    source,
    "markBulkAttendanceController",
    "markBulkAttendance(bulkData, markedBy)",
  );
});

test("attendance list and summary deny unscoped non-admin requests before service reads", async () => {
  const source = await readSource("../../controllers/attendance.controller.ts");

  for (const [exportName, serviceCall] of [
    ["getAttendanceController", "getAttendanceRecords(requestData)"],
    ["getAttendanceSummaryController", "getAttendanceSummary(requestData)"],
  ] as const) {
    const block = controllerBlock(source, exportName);
    assert.match(block, /request\.user\.role === Role\.ADMIN/);
    assert.match(block, /!hasCompleteAttendanceScope\(scope\)/);
    assert.match(block, /reply\.status\(403\)/);
    assertAuthorizationPrecedesService(source, exportName, serviceCall);
  }
});

test("auto-mark validates a complete canonical scope after its admin guard", async () => {
  const source = await readSource("../../controllers/attendance.controller.ts");
  const block = controllerBlock(source, "autoMarkAttendanceController");
  const adminGuardIndex = block.indexOf("request.user.role !== Role.ADMIN");
  const scopeValidationIndex = block.indexOf(
    "hasCompleteAttendanceScope(scope)",
  );
  const serviceIndex = block.indexOf("autoMarkAttendance(");

  assert.ok(adminGuardIndex >= 0, "expected admin-only guard");
  assert.ok(
    scopeValidationIndex > adminGuardIndex,
    "expected scope validation after admin guard",
  );
  assert.ok(
    serviceIndex > scopeValidationIndex,
    "expected service call after scope validation",
  );
});

test("single attendance marking returns 400 for an invalid role assignment", async () => {
  const source = await readSource("../../controllers/attendance.controller.ts");
  const block = controllerBlock(source, "markAttendanceController");

  assert.match(
    block,
    /Invalid attendance role assignment[\s\S]*reply\.status\(400\)/,
  );
});

test("user attendance writes parse raw bodies and public catches do not expose error details", async () => {
  const source = await readSource("../../controllers/attendance.controller.ts");

  assert.match(source, /security\/attendance-input\.js/);
  for (const [exportName, parser] of [
    ["markAttendanceController", "parseMarkAttendanceRequest(request.body)"],
    [
      "markBulkAttendanceController",
      "parseMarkBulkAttendanceRequest(request.body)",
    ],
  ] as const) {
    const block = controllerBlock(source, exportName);
    const parserIndex = block.indexOf(parser);
    const serviceIndex = block.indexOf(
      exportName === "markAttendanceController"
        ? "markAttendance(attendanceData, markedBy)"
        : "markBulkAttendance(bulkData, markedBy)",
    );

    assert.ok(parserIndex >= 0, `${exportName} parses raw input`);
    assert.ok(
      serviceIndex > parserIndex,
      `${exportName} parses before service work`,
    );
  }

  assert.doesNotMatch(source, /details:\s*error\.message/);
  assert.doesNotMatch(source, /error:\s*error\.message/);
});

test("user attendance writes validate role-assignment linkage with one scoped lookup before writing", async () => {
  const source = await readSource("../../service/attendance.service.ts");

  assert.match(
    source,
    /import \{[^}]*SubRole[^}]*\} from "\.\.\/generated\/prisma\/index\.js"/,
  );

  for (const [functionName, writeCall] of [
    ["markAttendance", "prisma.userAttendance.findFirst("],
    ["markBulkAttendance", "prisma.$transaction("],
  ] as const) {
    const block = controllerBlock(source, functionName);
    const lookupIndex = block.indexOf("prisma.userRoleAssignments.findMany(");
    const writeIndex = block.indexOf(writeCall);

    assert.ok(lookupIndex >= 0, `${functionName} validates role assignments`);
    assert.ok(
      writeIndex > lookupIndex,
      `${functionName} validates before writing`,
    );
    assert.match(block, /isActive:\s*true/);
    assert.match(block, /projectId/);
    assert.match(block, /centerId/);
    assert.match(block, /semesterId/);
    assert.match(block, /SubRole\.EDUCATOR/);
    assert.match(block, /SubRole\.CENTER_MANAGER/);
    assert.match(block, /select:\s*\{\s*id:\s*true,\s*userId:\s*true\s*\}/);
  }
});

test("student-attendance controllers resolve exact scoped student access before student-data service calls", async () => {
  const source = await readSource(
    "../../controllers/student-attendance.controller.ts",
  );

  assert.match(source, /canManageStudentAttendance/);
  assert.match(source, /getActiveUserScopeAssignments/);
  assert.match(
    source,
    /const requireStudentAttendanceAccess[\s\S]*resolveStudentAttendanceAccess\(/,
  );

  for (const [exportName, serviceCall] of [
    ["markStudentAttendance", "markAttendance("],
    ["markBulkStudentAttendance", "markBulkAttendance("],
    ["getStudentAttendance", "StudentAttendanceService.getAttendance("],
    ["getAttendanceByDate", "getAttendanceByDate("],
    ["getStudentsWithoutAttendance", "getStudentsWithoutAttendance("],
    [
      "getStudentAttendanceById",
      "StudentAttendanceService.getStudentAttendance(",
    ],
    ["getStudentAttendanceStats", "getStudentAttendanceStats("],
  ] as const) {
    const block = controllerBlock(source, exportName);
    const authorizationIndex = block.indexOf("requireStudentAttendanceAccess(");
    const serviceIndex = block.indexOf(serviceCall);

    assert.ok(
      authorizationIndex >= 0,
      `${exportName} resolves student attendance access`,
    );
    assert.ok(
      serviceIndex > authorizationIndex,
      `${exportName} calls service after resolving student attendance access`,
    );
  }
});

test("student-attendance mutations read persisted scope before authorization and mutation", async () => {
  const source = await readSource(
    "../../controllers/student-attendance.controller.ts",
  );

  for (const [exportName, serviceCall] of [
    ["updateStudentAttendance", "updateAttendance("],
    ["deleteStudentAttendance", "deleteAttendance("],
  ] as const) {
    const block = controllerBlock(source, exportName);
    const scopeIndex = block.indexOf("getAttendanceScope(attendanceId)");
    const authorizationIndex = block.indexOf("requireStudentAttendanceAccess(");
    const serviceIndex = block.indexOf(serviceCall);

    assert.ok(
      scopeIndex >= 0,
      `${exportName} looks up persisted attendance scope`,
    );
    assert.ok(
      authorizationIndex > scopeIndex,
      `${exportName} authorizes persisted scope after lookup`,
    );
    assert.ok(
      serviceIndex > authorizationIndex,
      `${exportName} mutates after authorization`,
    );
  }
});

test("bulk attendance estimate remains free of student attendance scope resolution", async () => {
  const source = await readSource(
    "../../controllers/student-attendance.controller.ts",
  );
  const block = controllerBlock(source, "getBulkAttendanceEstimate");

  assert.equal(block.includes("resolveStudentAttendanceAccess("), false);
});

test("student-attendance controller public errors do not expose internal error messages", async () => {
  const source = await readSource(
    "../../controllers/student-attendance.controller.ts",
  );

  assert.doesNotMatch(source, /message:\s*error\.message/);
  assert.doesNotMatch(source, /error:\s*error\.message/);
  assert.doesNotMatch(source, /explanation:.*Vercel/);
});

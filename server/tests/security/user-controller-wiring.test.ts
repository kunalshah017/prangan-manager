import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readController = () =>
  readFile(
    new URL("../../controllers/user.controller.ts", import.meta.url),
    "utf8",
  );

test("global user listing rejects non-admins before querying users", async () => {
  const source = await readController();
  const controllerSource = source.match(
    /export const getAllUsersController[\s\S]*?export const getRemunerationUsersController/,
  )?.[0];

  assert.ok(controllerSource, "expected global user listing controller");
  assert.match(controllerSource, /const authUser = request\.user/);
  assert.match(
    controllerSource,
    /if \(!authUser\)[\s\S]*return errorHandle\([\s\S]*401/,
  );
  assert.match(
    controllerSource,
    /if \(!isAdmin\(authUser\)\)[\s\S]*return errorHandle\([\s\S]*403/,
  );

  const guardIndex = controllerSource.indexOf("isAdmin(authUser)");
  const queryIndex = controllerSource.indexOf("getAllUsersWithAssignments()");
  assert.ok(guardIndex >= 0, "expected isAdmin guard");
  assert.ok(queryIndex > guardIndex, "expected query only after admin guard");
});

test("detail and update responses choose owner or admin-safe contracts", async () => {
  const source = await readController();
  const detailSource = source.match(
    /export const getUserByIdController[\s\S]*?export const updateUserController/,
  )?.[0];
  const updateSource = source.match(
    /export const updateUserController[\s\S]*$/,
  )?.[0];
  const verificationSource = source.match(
    /export const verifyUser[\s\S]*?export const GetUnverifiedUsers/,
  )?.[0];

  assert.ok(detailSource);
  assert.ok(updateSource);
  assert.ok(verificationSource);
  assert.match(
    detailSource,
    /authUser\.id === userId[\s\S]*getUserById\(userId\)[\s\S]*getAdminUserById\(userId\)/,
  );
  assert.match(
    updateSource,
    /authUser\.id === userId[\s\S]*getUserById\(userId\)[\s\S]*getAdminUserById\(userId\)/,
  );
  assert.match(
    verificationSource,
    /getAdminUserById\(\s*transactionResult\.userUpdate\.id/,
  );
});

test("general user updates use the strict profile extractor and never replace assignments", async () => {
  const source = await readController();
  const updateSource = source.match(
    /export const updateUserController[\s\S]*$/,
  )?.[0];

  assert.ok(updateSource);
  assert.match(source, /security\/user-update\.js/);
  assert.match(updateSource, /extractGeneralUserUpdate\(request\.body\)/);
  assert.match(updateSource, /forbiddenFields/);
  assert.match(updateSource, /unknownFields/);
  assert.doesNotMatch(updateSource, /bulkUpdateUserAssignments/);
  assert.doesNotMatch(updateSource, /updateData\.role/);
});

test("person name writes use the shared resolver at every user boundary", async () => {
  const source = await readController();
  const registrationSource = source.match(
    /export const registerUser[\s\S]*?export const loginUser/,
  )?.[0];
  const updateSource = source.match(
    /export const updateUserController[\s\S]*$/,
  )?.[0];

  assert.ok(registrationSource);
  assert.ok(updateSource);
  assert.match(source, /lib\/person-name\.js/);
  assert.match(registrationSource, /resolvePersonNameCreate\(data\)/);
  assert.match(registrationSource, /\.\.\.resolvedName/);
  assert.match(updateSource, /resolvePersonNameUpdate\(/);
  assert.match(updateSource, /firstName[\s\S]*middleName[\s\S]*lastName/);
});

test("profile name validation returns 400 before the database update", async () => {
  const source = await readController();
  const updateSource = source.match(
    /export const updateUserController[\s\S]*$/,
  )?.[0];

  assert.ok(updateSource);
  assert.match(
    updateSource,
    /try \{[\s\S]*resolvePersonNameUpdate\([\s\S]*catch \(error\) \{[\s\S]*errorHandle\(\(error as Error\)\.message, reply, 400\)/,
  );
  assert.ok(
    updateSource.indexOf("resolvePersonNameUpdate") <
      updateSource.indexOf("prisma.user.update"),
  );
});

test("verification notifications use persisted user identity", async () => {
  const source = await readController();
  const verificationSource = source.match(
    /export const verifyUser[\s\S]*?export const GetUnverifiedUsers/,
  )?.[0];

  assert.ok(verificationSource);
  assert.match(verificationSource, /prisma\.user\.findUnique/);
  assert.match(
    verificationSource,
    /select:\s*\{\s*email: true,\s*name: true,\s*status: true\s*\}/,
  );
  assert.doesNotMatch(verificationSource, /data\.name/);
  assert.doesNotMatch(verificationSource, /data\.email/);
});

test("bank detail updates preserve canonical user name fields", async () => {
  const source = await readController();
  const bankUpdateSource = source.match(
    /export const updateMyBankDetails[\s\S]*?export const registerUser/,
  )?.[0];

  assert.ok(bankUpdateSource);
  assert.match(bankUpdateSource, /name: result\.name/);
  assert.match(bankUpdateSource, /firstName: result\.firstName/);
  assert.match(bankUpdateSource, /middleName: result\.middleName/);
  assert.match(bankUpdateSource, /lastName: result\.lastName/);
});

test("general user updates allow null only for DOB and optional name parts", async () => {
  const source = await readController();
  const updateSource = source.match(
    /export const updateUserController[\s\S]*$/,
  )?.[0];

  assert.ok(updateSource);
  assert.match(
    updateSource,
    /value !== undefined[\s\S]*\["dob", "middleName", "lastName"\]\.includes\(field\)[\s\S]*value === null[\s\S]*typeof value !== ["']string["']/,
  );
  assert.match(updateSource, /dob\?: string \| null/);
  assert.match(
    updateSource,
    /data\.dob !== undefined[\s\S]*updateData\.dob = dobDate/,
  );
});

test("management updates validate and own role plus assignments after the admin guard", async () => {
  const source = await readController();
  const managementSource = source.match(
    /export const updateUserManagementController[\s\S]*?export const createUserAssignmentController/,
  )?.[0];

  assert.ok(managementSource);
  const guardIndex = managementSource.indexOf("admin.role !== Role.ADMIN");
  const roleUpdateIndex = managementSource.indexOf("prisma.user.update(");
  const assignmentUpdateIndex = managementSource.indexOf(
    "bulkUpdateUserAssignments(",
  );

  assert.match(managementSource, /role\?: Role/);
  assert.match(managementSource, /roleAssignments\?: Array/);
  assert.match(
    managementSource,
    /Object\.values\(Role\)\.includes\(data\.role\)/,
  );
  assert.match(managementSource, /Role or role assignments are required/);
  assert.match(managementSource, /data: \{ role: data\.role \}/);
  assert.ok(guardIndex >= 0);
  assert.ok(roleUpdateIndex > guardIndex);
  assert.ok(assignmentUpdateIndex > guardIndex);
});

test("access revocation is admin-only, deactivates assignments, and invalidates sessions together", async () => {
  const [controller, routes] = await Promise.all([
    readController(),
    readFile(new URL("../../routes/user.route.ts", import.meta.url), "utf8"),
  ]);
  const revokeSource = controller.match(
    /export const revokeUserAccessController[\s\S]*?(?=export const |$)/,
  )?.[0];

  assert.ok(revokeSource, "expected dedicated access revocation controller");
  assert.match(revokeSource, /admin\.role !== Role\.ADMIN/);
  assert.match(revokeSource, /prisma\.\$transaction/);
  assert.match(revokeSource, /status: UserStatus\.REJECTED/);
  assert.match(revokeSource, /sessionVersion: \{ increment: 1 \}/);
  assert.match(revokeSource, /userRoleAssignments\.updateMany/);
  assert.match(revokeSource, /isActive: false/);
  assert.match(routes, /"\/users\/:userId\/access"/);
  assert.match(routes, /revokeUserAccessController/);
});

test("remuneration controller requires an admin before loading financial data", async () => {
  const source = await readController();
  const controllerSource = source.match(
    /export const getRemunerationUsersController[\s\S]*?export const /,
  )?.[0];

  assert.ok(controllerSource, "expected remuneration controller export");
  assert.match(controllerSource, /projectId[\s\S]*centerId[\s\S]*semesterId/);
  assert.match(controllerSource, /authUser\.role !== Role\.ADMIN/);

  const authorizationIndex = controllerSource.indexOf("authUser.role !== Role.ADMIN");
  const payeesIndex = controllerSource.indexOf("getRemunerationUsers({");

  assert.ok(payeesIndex > authorizationIndex);
});

test("static remuneration route is registered before the userId route", async () => {
  const source = await readFile(
    new URL("../../routes/user.route.ts", import.meta.url),
    "utf8",
  );
  const remunerationIndex = source.indexOf('"/users/remuneration"');
  const userIdIndex = source.indexOf('"/users/:userId"');

  assert.ok(remunerationIndex >= 0, "expected remuneration route");
  assert.ok(userIdIndex >= 0, "expected userId route");
  assert.ok(remunerationIndex < userIdIndex);
});

test("context staff controller authorizes exact scope before loading staff", async () => {
  const source = await readController();
  const controllerSource = source.match(
    /export const getContextStaffController[\s\S]*?export const /,
  )?.[0];

  assert.ok(controllerSource, "expected context staff controller export");
  assert.match(controllerSource, /projectId[\s\S]*centerId[\s\S]*semesterId/);
  assert.match(controllerSource, /Object\.values\(SubRole\)/);
  assert.match(controllerSource, /canAccessScope/);

  const assignmentsIndex = controllerSource.indexOf(
    "getActiveUserScopeAssignments",
  );
  const authorizationIndex = controllerSource.indexOf("canAccessScope");
  const staffIndex = controllerSource.indexOf("getContextStaff({");

  assert.ok(assignmentsIndex >= 0);
  assert.ok(authorizationIndex > assignmentsIndex);
  assert.ok(staffIndex > authorizationIndex);
});

test("static context staff route is authenticated before the userId route", async () => {
  const source = await readFile(
    new URL("../../routes/user.route.ts", import.meta.url),
    "utf8",
  );
  const contextStaffIndex = source.indexOf('"/users/context-staff"');
  const userIdIndex = source.indexOf('"/users/:userId"');

  assert.ok(contextStaffIndex >= 0, "expected context staff route");
  assert.ok(userIdIndex >= 0, "expected userId route");
  assert.ok(contextStaffIndex < userIdIndex);

  const routeSource = source.slice(contextStaffIndex, userIdIndex);
  assert.match(routeSource, /preHandler: authChecker/);
  assert.match(routeSource, /getContextStaffController/);
});

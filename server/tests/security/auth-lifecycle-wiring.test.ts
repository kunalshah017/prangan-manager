import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("account approval issues activation links instead of generated passwords", async () => {
  const controllerSource = await readFile(
    new URL("../../controllers/user.controller.ts", import.meta.url),
    "utf8",
  );

  assert.match(controllerSource, /createAccountTokenInTransaction/);
  assert.match(controllerSource, /AccountTokenType\.ACTIVATION/);
  assert.doesNotMatch(controllerSource, /generatedPassword/);
});

test("registration decisions and password resets use the transactional email outbox", async () => {
  const controllerSource = await readFile(
    new URL("../../controllers/user.controller.ts", import.meta.url),
    "utf8",
  );

  assert.match(controllerSource, /buildRegistrationApprovalEmailJob/);
  assert.match(controllerSource, /buildRegistrationRejectionEmailJob/);
  assert.match(controllerSource, /buildPasswordResetEmailJob/);
  assert.match(controllerSource, /createAccountTokenRecordInTransaction/);
  assert.match(controllerSource, /enqueueEmail\([^,]+,\s*tx\)/);
  assert.match(controllerSource, /status:\s*UserStatus\.PENDING/);
  assert.match(controllerSource, /Password reset queue failed/);
  assert.match(
    controllerSource,
    /with specific responsibilities and access levels within the Prangan Foundation system/,
  );
  const assignmentDedupe = controllerSource.match(
    /const uniqueAssignments[\s\S]*?let roleAssignmentDetails/,
  )?.[0];
  assert.ok(assignmentDedupe);
  assert.doesNotMatch(assignmentDedupe, /semesterLevelId/);
  assert.doesNotMatch(controllerSource, /\bsendEmail\s*\(/);
});

test("authentication routes expose activation and generic password reset endpoints", async () => {
  const routeSource = await readFile(
    new URL("../../routes/user.route.ts", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /"\/users\/activate"/);
  assert.match(routeSource, /"\/users\/password-reset"/);
  assert.match(routeSource, /"\/users\/password-reset\/complete"/);
});

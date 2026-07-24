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

test("authentication routes expose activation and generic password reset endpoints", async () => {
  const routeSource = await readFile(
    new URL("../../routes/user.route.ts", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /"\/users\/activate"/);
  assert.match(routeSource, /"\/users\/password-reset"/);
  assert.match(routeSource, /"\/users\/password-reset\/complete"/);
});

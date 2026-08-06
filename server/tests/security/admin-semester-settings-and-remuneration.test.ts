import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const controllerUrl = new URL(
  "../../controllers/user.controller.ts",
  import.meta.url,
);

test("semester settings and remuneration controllers are admin-only", async () => {
  const source = await readFile(controllerUrl, "utf8");

  for (const controller of [
    "getSemesterUsersController",
    "getRemunerationUsersController",
    "updateRemunerationRatesController",
    "setRemunerationPeriodController",
  ]) {
    const start = source.indexOf(`export const ${controller}`);
    const end = source.indexOf("export const ", start + 1);
    const controllerSource = source.slice(start, end === -1 ? undefined : end);
    assert.match(
      controllerSource,
      /authUser\.role !== Role\.ADMIN/,
      `${controller} must reject non-admin users.`,
    );
  }
});

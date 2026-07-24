import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createAcademicLevelController,
  listAcademicLevelsController,
  replaceSemesterLevelsController,
} from "../../controllers/academic-level.controller.js";
import { Role } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";

const createReply = () => {
  let statusCode: number | undefined;
  let payload: unknown;
  const reply = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    send(value: unknown) {
      payload = value;
      return this;
    },
  };
  return {
    reply,
    get statusCode() {
      return statusCode;
    },
    get payload() {
      return payload;
    },
  };
};

const regularUser = {
  id: "user-1",
  name: "User",
  email: "user@example.com",
  role: Role.USER,
};

test("academic level reads require authentication", async () => {
  const response = createReply();
  await listAcademicLevelsController(
    { query: {} } as never,
    response.reply as never,
  );
  assert.equal(response.statusCode, 401);
});

test("academic level creation is enabled but remains admin-only", async () => {
  const originalCreate = prisma.academicLevel.create;
  let creates = 0;
  prisma.academicLevel.create = (async () => {
    creates += 1;
    return {} as never;
  }) as typeof prisma.academicLevel.create;

  try {
    const response = createReply();
    await createAcademicLevelController(
      {
        user: regularUser,
        body: { code: "LEVEL_5", name: "Level 5" },
      } as never,
      response.reply as never,
    );
    assert.equal(response.statusCode, 403);
    assert.equal(creates, 0);
  } finally {
    prisma.academicLevel.create = originalCreate;
  }
});

test("semester level replacement rejects an empty selection with 422 before mutation", async () => {
  const originalTransaction = prisma.$transaction;
  let transactions = 0;
  prisma.$transaction = (async () => {
    transactions += 1;
    return [];
  }) as typeof prisma.$transaction;

  try {
    const response = createReply();
    await replaceSemesterLevelsController(
      {
        user: { ...regularUser, role: Role.ADMIN },
        params: { id: "semester-1" },
        body: { academicLevelIds: [] },
      } as never,
      response.reply as never,
    );
    assert.equal(response.statusCode, 422);
    assert.equal(transactions, 0);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("academic and semester level routes use authentication and server registration", async () => {
  const routeSource = await readFile(
    new URL("../../routes/academic-level.routes.ts", import.meta.url),
    "utf8",
  );
  const semesterRouteSource = await readFile(
    new URL("../../routes/semester.routes.ts", import.meta.url),
    "utf8",
  );
  const serverSource = await readFile(
    new URL("../../server.ts", import.meta.url),
    "utf8",
  );

  for (const path of [
    '"/academic-levels"',
    '"/academic-levels/order"',
    '"/academic-levels/:id"',
  ]) {
    assert.match(routeSource, new RegExp(path.replace(/[/:]/g, "\\$&")));
  }
  assert.equal((routeSource.match(/preHandler: authChecker/g) ?? []).length, 4);
  assert.match(semesterRouteSource, /"\/semesters\/:id\/levels"/);
  assert.equal(
    (semesterRouteSource.match(/"\/semesters\/:id\/levels"/g) ?? []).length,
    2,
  );
  assert.match(serverSource, /academicLevelRoutes/);
  assert.match(serverSource, /fastify\.register\(academicLevelRoutes/);
});

test("semester level reads preserve hierarchy authorization", async () => {
  const controllerSource = await readFile(
    new URL("../../controllers/academic-level.controller.ts", import.meta.url),
    "utf8",
  );
  const handler = controllerSource.slice(
    controllerSource.indexOf("export const listSemesterLevelsController"),
    controllerSource.indexOf("export const replaceSemesterLevelsController"),
  );

  assert.match(handler, /getSemesterScope\(id\)/);
  assert.match(handler, /getActiveUserScopeAssignments\(/);
  assert.match(handler, /canReadContext/);
  assert.match(handler, /403/);
});

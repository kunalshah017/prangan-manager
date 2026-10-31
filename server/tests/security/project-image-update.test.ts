import assert from "node:assert/strict";
import test from "node:test";

import { updateProjectController } from "../../controllers/project.controller.js";
import { Role } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import { updateProject } from "../../service/project.service.js";

test("project image removal passes null to Prisma", async () => {
  const originalUpdate = prisma.projects.update;
  let receivedQuery: unknown;

  prisma.projects.update = (async (query: unknown) => {
    receivedQuery = query;
    return { id: "project-1", imageUrl: null };
  }) as typeof prisma.projects.update;

  try {
    await updateProject("project-1", { imageUrl: null });

    assert.deepEqual(receivedQuery, {
      where: { id: "project-1" },
      data: { imageUrl: null },
    });
  } finally {
    prisma.projects.update = originalUpdate;
  }
});

test("project updates drop fields that would become nested writes", async () => {
  const originalUpdate = prisma.projects.update;
  let receivedQuery: unknown;

  prisma.projects.update = (async (query: unknown) => {
    receivedQuery = query;
    return { id: "project-1" };
  }) as typeof prisma.projects.update;

  try {
    await updateProjectController(
      {
        user: { id: "admin-1", role: Role.ADMIN },
        params: { id: "project-1" },
        body: { name: "Prangan", expenses: { deleteMany: {} } },
      } as never,
      { status: () => ({ send: () => undefined }) } as never,
    );

    assert.deepEqual(receivedQuery, {
      where: { id: "project-1" },
      data: { name: "Prangan" },
    });
  } finally {
    prisma.projects.update = originalUpdate;
  }
});

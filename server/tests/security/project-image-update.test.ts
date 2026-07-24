import assert from "node:assert/strict";
import test from "node:test";

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

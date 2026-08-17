import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serviceFile = (name: string) =>
  new URL(`../../service/${name}.service.ts`, import.meta.url);

test("level-ID updates contain no stale legacy fallback", async () => {
  const [user, exam, syllabus] = await Promise.all([
    readFile(serviceFile("user"), "utf8"),
    readFile(serviceFile("exam"), "utf8"),
    readFile(serviceFile("syllabus"), "utf8"),
  ]);

  for (const source of [user, exam, syllabus]) {
    assert.doesNotMatch(
      source,
      /data\.level\s*\?\?\s*\(data\.semesterLevelId\s*\?\s*undefined\s*:/,
    );
  }
});

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("create syllabus topics", () => {
  it("rejects blank topic and subtopic titles before sending creation requests", async () => {
    const source = await readFile(
      new URL("../../pages/syllabus/CreateSyllabus.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("Some topic or subtopic titles are blank.");
    expect(source).toContain("topic.title.trim()");
    expect(source).toContain("subtopic.title.trim()");
  });
});

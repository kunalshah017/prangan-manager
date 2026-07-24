import { describe, expect, it } from "vitest";

import { buildSyllabusTopicSearchParams } from "@/hooks/useSyllabusQueries";

describe("buildSyllabusTopicSearchParams", () => {
  it("omits parentId when the filter is null", () => {
    expect(buildSyllabusTopicSearchParams({ syllabusId: "syllabus-1", parentId: null }).toString()).toBe("syllabusId=syllabus-1");
  });

  it("encodes a nonempty parentId", () => {
    expect(buildSyllabusTopicSearchParams({ syllabusId: "syllabus-1", parentId: "parent/one" }).toString()).toBe("syllabusId=syllabus-1&parentId=parent%2Fone");
  });

  it("omits parentId when it is undefined", () => {
    expect(buildSyllabusTopicSearchParams({ syllabusId: "syllabus-1" }).toString()).toBe("syllabusId=syllabus-1");
  });
});
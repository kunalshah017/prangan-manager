import assert from "node:assert/strict";
import test from "node:test";

import {
  parseCreateAcademicLevelRequest,
  parseReorderAcademicLevelsRequest,
  parseReplaceSemesterLevelsRequest,
  parseUpdateAcademicLevelRequest,
} from "../../security/academic-level-input.js";

test("academic level create parser trims names and validates immutable codes", () => {
  assert.deepEqual(
    parseCreateAcademicLevelRequest({
      code: "LEVEL_5",
      name: "  Level 5  ",
      afterLevelId: "level-4",
    }),
    {
      data: {
        code: "LEVEL_5",
        name: "Level 5",
        afterLevelId: "level-4",
      },
    },
  );

  for (const code of [
    "A",
    "level_5",
    "5_LEVEL",
    "LEVEL-5",
    `L${"A".repeat(50)}`,
  ]) {
    assert.ok(
      "error" in parseCreateAcademicLevelRequest({ code, name: "Level 5" }),
    );
  }
});

test("academic level parsers reject unknown fields and invalid names", () => {
  assert.ok(
    "error" in
      parseCreateAcademicLevelRequest({
        code: "LEVEL_5",
        name: "Level 5",
        journeyOrder: 700,
      }),
  );
  assert.ok(
    "error" in parseCreateAcademicLevelRequest({ code: "LEVEL_5", name: " " }),
  );
  assert.ok(
    "error" in
      parseCreateAcademicLevelRequest({
        code: "LEVEL_5",
        name: "x".repeat(101),
      }),
  );
  assert.ok(
    "error" in
      parseUpdateAcademicLevelRequest({ name: "Level Five", code: "LEVEL_5" }),
  );
  assert.ok("error" in parseUpdateAcademicLevelRequest({}));
});

test("academic level patch accepts trimmed name and boolean activation only", () => {
  assert.deepEqual(
    parseUpdateAcademicLevelRequest({ name: "  Level Five  " }),
    {
      data: { name: "Level Five" },
    },
  );
  assert.deepEqual(parseUpdateAcademicLevelRequest({ isActive: false }), {
    data: { isActive: false },
  });
  assert.deepEqual(
    parseUpdateAcademicLevelRequest({ name: "Level Five", isActive: true }),
    { data: { name: "Level Five", isActive: true } },
  );
});

test("reorder and replacement parsers require non-empty unique canonical IDs", () => {
  assert.deepEqual(
    parseReorderAcademicLevelsRequest({ orderedIds: ["level-2", "level-1"] }),
    { data: { orderedIds: ["level-2", "level-1"] } },
  );
  assert.deepEqual(
    parseReplaceSemesterLevelsRequest({ academicLevelIds: ["level-1"] }),
    { data: { academicLevelIds: ["level-1"] } },
  );

  for (const orderedIds of [[], ["level-1", "level-1"], [" level-1"], [""]]) {
    assert.ok("error" in parseReorderAcademicLevelsRequest({ orderedIds }));
  }
  for (const academicLevelIds of [
    [],
    ["level-1", "level-1"],
    ["level-1 "],
    [42],
  ]) {
    assert.ok(
      "error" in parseReplaceSemesterLevelsRequest({ academicLevelIds }),
    );
  }
});

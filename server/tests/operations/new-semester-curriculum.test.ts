import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildClonedTopicRows,
  buildPrimaryTopicRows,
  classifyExistingSyllabus,
  parseCurriculumArgs,
  selectSourceSyllabus,
} from "../../scripts/seed-2026-27-curriculum.js";

test("curriculum seeding is a dry run unless apply is explicit", () => {
  assert.deepEqual(parseCurriculumArgs([]), { apply: false });
  assert.deepEqual(parseCurriculumArgs(["--apply"]), { apply: true });
  assert.throws(() => parseCurriculumArgs(["--force"]), /Unknown argument/);
});

test("curriculum seeding never enables a level that the semester disabled", async () => {
  const source = await readFile(
    new URL("../../scripts/seed-2026-27-curriculum.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /semesterLevel\.(create|update)\(/);
  assert.match(source, /action: "disabled"/);
});

test("cloned topics receive fresh IDs, preserve hierarchy, and reset progress", () => {
  const ids = ["new-parent", "new-child"];
  const rows = buildClonedTopicRows(
    "target-syllabus",
    [
      {
        id: "old-parent",
        parentId: null,
        serialNumber: "1",
        title: "Numbers",
        cycle: "SA_1",
        status: "COMPLETED",
        orderIndex: 0,
        metadata: { source: "previous semester" },
      },
      {
        id: "old-child",
        parentId: "old-parent",
        serialNumber: "1.1",
        title: "Counting",
        cycle: "SA_1",
        status: "ONGOING",
        orderIndex: 0,
        metadata: null,
      },
    ],
    () => ids.shift()!,
  );

  assert.deepEqual(
    rows.map(({ id, syllabusId, parentId, status }) => ({
      id,
      syllabusId,
      parentId,
      status,
    })),
    [
      {
        id: "new-parent",
        syllabusId: "target-syllabus",
        parentId: null,
        status: "PENDING",
      },
      {
        id: "new-child",
        syllabusId: "target-syllabus",
        parentId: "new-parent",
        status: "PENDING",
      },
    ],
  );
});

test("level cloning prefers the same center and uses another center only as fallback", () => {
  const lavender = { id: "lavender", centerId: "center-lavender" };
  const tulip = { id: "tulip", centerId: "center-tulip" };

  assert.equal(
    selectSourceSyllabus([tulip, lavender], "center-lavender"),
    lavender,
  );
  assert.equal(
    selectSourceSyllabus([tulip], "center-lavender"),
    tulip,
  );
  assert.equal(selectSourceSyllabus([], "center-lavender"), null);
});

test("curriculum reruns skip complete syllabi and reject partial syllabi", () => {
  assert.equal(classifyExistingSyllabus(null, 100), "create");
  assert.equal(classifyExistingSyllabus(0, 100), "create");
  assert.equal(classifyExistingSyllabus(100, 100), "skip");
  assert.throws(
    () => classifyExistingSyllabus(23, 100),
    /partially populated \(23\/100\)/,
  );
});

test("Cambridge index entries become grouped curriculum topics with source references", () => {
  const ids = ["parent-1", "parent-2", "child-1", "child-2"];
  const rows = buildPrimaryTopicRows(
    "target-syllabus",
    [
      {
        isbn: "9781009832144",
        semester: 1,
        items: [
          {
            sourceNumber: 1,
            title: "Standing Lines",
            page: 3,
            section: "Literacy",
            cycle: "SA_1",
          },
          {
            sourceNumber: 32,
            title: "Circle",
            page: 34,
            section: "Numeracy",
            cycle: "SA_1",
          },
        ],
      },
    ],
    () => ids.shift()!,
  );

  const parents = rows.filter((row) => row.parentId === null);
  const children = rows.filter((row) => row.parentId !== null);
  assert.deepEqual(
    parents.map(({ title, cycle, status }) => ({ title, cycle, status })),
    [
      {
        title: "Literacy — Semester 1 (SA-1)",
        cycle: "SA_1",
        status: "PENDING",
      },
      {
        title: "Numeracy — Semester 1 (SA-1)",
        cycle: "SA_1",
        status: "PENDING",
      },
    ],
  );
  assert.equal(children.length, 2);
  assert.equal(children[0].parentId, "parent-1");
  assert.deepEqual(children[0].metadata, {
    source: "Learn with Cambridge",
    isbn: "9781009832144",
    semester: 1,
    page: 3,
    sourceNumber: 1,
    section: "Literacy",
  });
});

test("the same subject has distinct SA-1 and SA-2 headings", () => {
  const rows = buildPrimaryTopicRows("target-syllabus", [
    {
      isbn: "9781009832144",
      semester: 1,
      items: [
        {
          sourceNumber: 1,
          title: "Standing Lines",
          page: 3,
          section: "Literacy",
          cycle: "SA_1",
        },
        {
          sourceNumber: 20,
          title: "Letter Gg",
          page: 21,
          section: "Literacy",
          cycle: "SA_2",
        },
      ],
    },
  ]);

  assert.deepEqual(
    rows.filter((row) => row.parentId === null).map((row) => row.title),
    [
      "Literacy — Semester 1 (SA-1)",
      "Literacy — Semester 1 (SA-2)",
    ],
  );
});

test("the reviewed Cambridge fixture covers both books for Primary A, B, and C", async () => {
  const fixture = JSON.parse(
    await readFile(
      new URL(
        "../../prisma/fixtures/learn-with-cambridge-2026-27.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as {
    levels: Record<
      string,
      Array<{ semester: number; items: Array<{ cycle: string }> }>
    >;
  };

  const expectedCounts = {
    PRIMARY_A: 154,
    PRIMARY_B: 153,
    PRIMARY_C: 163,
  };
  for (const [level, expectedCount] of Object.entries(expectedCounts)) {
    const volumes = fixture.levels[level];
    assert.deepEqual(
      volumes.map((volume) => volume.semester),
      [1, 2],
    );
    assert.equal(
      volumes.reduce((sum, volume) => sum + volume.items.length, 0),
      expectedCount,
    );
    assert.deepEqual(
      [...new Set(volumes.flatMap((volume) => volume.items.map((item) => item.cycle)))].sort(),
      ["SA_1", "SA_2", "SA_3"],
    );
  }
});
